const test = require('node:test');
const assert = require('node:assert/strict');
const documents = require('../miniprogram/shared/account-document');

test('first launch offline opens both pages and imports edits after reconnecting', async t => {
  const storage = new Map(), remote = new Map();
  let offline = true, definition;
  global.Page = page => { definition = page; };
  global.wx = {
    getDeviceInfo: () => ({ platform: offline ? 'ios' : 'devtools' }),
    getWindowInfo: () => ({ statusBarHeight: 44, windowWidth: 375 }),
    getStorageSync: key => structuredClone(storage.get(key)),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: key => storage.delete(key),
    showToast() {},
    showModal: options => options.success({ confirm: true }),
    request(options) {
      assert.equal(offline, false);
      const path = new URL(options.url).pathname;
      let data;
      if (path === '/api/session') data = { userId: 'alice', token: 'test', expires: Date.now() + 3600000 };
      else if (options.method === 'GET') data = { revision: 0, value: null };
      else { remote.set(path, options.data.value); data = { revision: 1 }; }
      options.success({ statusCode: 200, data });
    }
  };
  t.after(() => { delete global.Page; delete global.wx; });
  for (const [kind, page] of [['wardrobe', 'wardrobe/pages/manager'], ['bangda', 'bangda/pages/bangda']]) {
    require('../miniprogram/packages/' + page + '/index');
    const instance = { ...definition, options: {}, data: structuredClone(definition.data),
      setData(update) { Object.assign(this.data, update); }
    };
    await instance.loadAccount();
    assert.equal(instance.data.accountReady, true, instance.data.accountError);
    const draft = { favorites: ['本机收藏'] };
    documents.write(kind, draft);
    assert.deepEqual(documents.read(kind), draft);
  }
  offline = false;
  for (const kind of ['wardrobe', 'bangda']) {
    await documents.open(kind);
    assert.deepEqual(remote.get('/api/data/' + kind), { favorites: ['本机收藏'] });
    assert.equal(storage.has('account.draft.' + kind), false);
  }
});
