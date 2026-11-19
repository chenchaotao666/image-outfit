// Set this to the registered HTTPS request domain for device builds.
const BASE = 'http://127.0.0.1:4173/api';
const local = /^http:\/\/(127\.0\.0\.1|localhost):/.test(BASE);
const sessionKey = 'account.session.' + BASE;
let loggingIn;

function request(path, method, data, token) {
  const platform = local && wx.getDeviceInfo?.().platform;
  if (platform && platform !== 'devtools') {
    return Promise.reject(Object.assign(Error('真机连接服务需要配置 HTTPS 接口地址'), { offline: true }));
  }
  return new Promise((resolve, reject) => wx.request({
    url: BASE + path, method, data, timeout: path === '/session' || method === 'GET' ? 8000 : 120000,
    header: { 'content-type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    success(response) {
      if (response.statusCode >= 200 && response.statusCode < 300) return resolve(response.data);
      const error = Error(response.data?.error?.message || '服务请求失败');
      error.status = response.statusCode;
      reject(error);
    },
    fail: () => reject(Object.assign(Error('无法连接小程序服务，请检查网络后重试'), { offline: true }))
  }));
}

function session(expiredToken) {
  const saved = wx.getStorageSync(sessionKey) || {};
  if (saved.token && saved.token !== expiredToken && saved.expires > Date.now() + 30000) return Promise.resolve(saved);
  if (!loggingIn) loggingIn = (async () => {
    const credentials = local ? (saved.devKey ? { devKey: saved.devKey } : {}) : {
      code: await new Promise((resolve, reject) => wx.login({ success: result => resolve(result.code), fail: reject }))
    };
    const account = await request('/session', 'POST', credentials);
    wx.setStorageSync(sessionKey, account);
    return account;
  })().finally(() => { loggingIn = null; });
  return loggingIn;
}

async function call(path, method = 'GET', data, expectedUser) {
  let account = await session();
  const send = () => {
    if (expectedUser && account.userId !== expectedUser) throw Error('登录账号已更改，请重新打开页面');
    return request(path, method, data, account.token);
  };
  try { return await send(); } catch (error) {
    if (error.status !== 401) throw error;
    const user = account.userId;
    account = await session(account.token);
    if (account.userId !== user) throw Error('登录账号已更改，请重新打开页面');
    return send();
  }
}
function cachedUser() { return wx.getStorageSync(sessionKey)?.userId; }
module.exports = { BASE, session, call, cachedUser };
