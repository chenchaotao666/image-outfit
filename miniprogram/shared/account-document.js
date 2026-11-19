const api = require('./account-api');
const legacyKeys = { wardrobe: 'yanchuang.wardrobe.v1', bangda: 'bangda.local.v1' };
const active = new Map();
const pendingWrites = new Map();
const mutationId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
// Older storage adapters could embed a photo as a data URL. Keep those files on the device.
function keepPhotosLocal(value) {
  const text = JSON.stringify(value);
  if (!text.includes('data:image/')) return value;
  const files = new Map();
  return JSON.parse(text, (_, item) => {
    if (typeof item !== 'string' || !item.startsWith('data:image/')) return item;
    if (!files.has(item)) {
      const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(item);
      if (!match) throw Error('照片格式无法保存，请重新选择照片');
      const path = wx.env.USER_DATA_PATH + '/photo-' + mutationId() + '.' + match[1];
      wx.getFileSystemManager().writeFileSync(path, match[2], 'base64');
      files.set(item, path);
    }
    return files.get(item);
  });
}
const confirm = options => new Promise((resolve, reject) => wx.showModal({
  ...options, success: result => resolve(result.confirm), fail: reject
}));

function read(kind) {
  const doc = active.get(kind);
  if (doc?.localKey) return wx.getStorageSync(doc.localKey) || (doc.legacyKey && wx.getStorageSync(doc.legacyKey));
  return doc ? wx.getStorageSync(doc.key).value : wx.getStorageSync(legacyKeys[kind]);
}

async function flush(doc) {
  let entry = wx.getStorageSync(doc.key);
  while (entry.pending) {
    const mutation = entry.pending;
    entry.sent = mutation;
    wx.setStorageSync(doc.key, entry);
    const result = await api.call('/data/' + doc.kind, 'PUT', {
      revision: entry.revision, mutation, value: entry.value
    }, doc.userId);
    // New edits can arrive while the last snapshot is in transit.
    entry = wx.getStorageSync(doc.key);
    entry.revision = result.revision;
    delete entry.sent;
    if (entry.pending === mutation) delete entry.pending;
    wx.setStorageSync(doc.key, entry);
  }
}

function schedule(doc) {
  if (!pendingWrites.has(doc.key)) {
    const work = flush(doc).finally(() => pendingWrites.delete(doc.key));
    pendingWrites.set(doc.key, work);
  }
  return pendingWrites.get(doc.key);
}

function write(kind, value) {
  const doc = active.get(kind);
  if (!doc || doc.localKey) { wx.setStorageSync(doc?.localKey || legacyKeys[kind], value); return; }
  const entry = wx.getStorageSync(doc.key);
  wx.setStorageSync(doc.key, { ...entry, value: keepPhotosLocal(value), pending: mutationId() });
  schedule(doc).catch(() => wx.showToast({ title: '已暂存，重新进入页面可同步', icon: 'none' }));
}

async function open(kind) {
  let userId = api.cachedUser();
  let remote;
  try {
    userId = (await api.session()).userId;
    const work = pendingWrites.get('account.data.' + userId + '.' + kind);
    if (work) await work.catch(() => {});
    remote = await api.call('/data/' + kind, 'GET', undefined, userId);
  } catch (error) {
    if (!error.offline) throw error;
    const key = 'account.data.' + userId + '.' + kind;
    const legacyKey = legacyKeys[kind];
    const unclaimed = !wx.getStorageSync(legacyKey + '.claimed');
    if (userId && (wx.getStorageSync(key) || !unclaimed || !wx.getStorageSync(legacyKey))) {
      if (!wx.getStorageSync(key)) wx.setStorageSync(key, { revision: 0, value: null });
      active.set(kind, { kind, userId, key });
    } else {
      active.set(kind, { localKey: 'account.draft.' + kind, legacyKey: unclaimed ? legacyKey : null });
    }
    wx.showToast({ title: '离线使用，修改将暂存本机', icon: 'none' });
    return;
  }
  const key = 'account.data.' + userId + '.' + kind;
  const doc = { kind, userId, key };
  const draftKey = 'account.draft.' + kind;
  const draft = wx.getStorageSync(draftKey);
  let entry = wx.getStorageSync(key);
  if (!entry) {
    entry = { revision: remote.revision, value: remote.value };
    const legacyKey = legacyKeys[kind];
    const legacy = wx.getStorageSync(legacyKey);
    if (!draft && legacy && !wx.getStorageSync(legacyKey + '.claimed')) {
      const importOld = await confirm({ title: '发现旧版本的本机记录', content: '将本机记录作为当前账号的版本保存？若账号已有记录，将被本机版本覆盖。照片文件仍保存在本机。', confirmText: '导入本机', cancelText: '使用账号' });
      if (importOld) entry = { revision: remote.revision, value: keepPhotosLocal(legacy), pending: mutationId() };
      wx.setStorageSync(key, entry);
      wx.setStorageSync(legacyKey + '.claimed', userId);
    }
  } else if (!entry.pending) {
    entry = { revision: remote.revision, value: remote.value };
  } else if (remote.mutation && remote.mutation === entry.sent) {
    entry.revision = remote.revision;
    if (entry.pending === entry.sent) delete entry.pending;
    delete entry.sent;
  } else if (entry.revision !== remote.revision) {
    const keepLocal = await confirm({ title: '两台设备都修改了记录', content: '请选择要保留的整份记录。同步后，所选版本会成为当前账号的版本。', confirmText: '保留本机', cancelText: '保留账号' });
    entry = keepLocal ? { ...entry, revision: remote.revision } : { revision: remote.revision, value: remote.value };
  }
  if (draft) {
    const importDraft = await confirm({ title: '发现离线记录', content: '选择本机版本将用离线记录替换当前账号的这份数据。', confirmText: '使用本机', cancelText: '使用账号' });
    if (importDraft) entry = { revision: remote.revision, value: keepPhotosLocal(draft), pending: mutationId() };
  }
  wx.setStorageSync(key, entry);
  if (draft) {
    if (wx.getStorageSync(legacyKeys[kind]) && !wx.getStorageSync(legacyKeys[kind] + '.claimed')) {
      wx.setStorageSync(legacyKeys[kind] + '.claimed', userId);
    }
    wx.removeStorageSync(draftKey);
  }
  if (entry.pending) await schedule(doc);
  active.set(kind, doc);
}
module.exports = { open, read, write };
