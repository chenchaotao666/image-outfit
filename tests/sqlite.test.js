const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { openDatabase } = require('../server/database');
const { createApi } = require('../server/api');
const { sample } = require('../miniprogram/packages/analysis/utils/report-v2');

test('production binds sessions to the OpenID returned by WeChat', async t => {
  const network = global.fetch;
  global.fetch = async url => {
    assert.equal(url.hostname, 'api.weixin.qq.com');
    return { json: async () => ({ openid: url.searchParams.get('js_code') === 'alice' ? 'wx-alice' : 'wx-bob' }) };
  };
  const db = openDatabase(':memory:');
  const server = http.createServer(createApi({ production: true, appId: 'app-test', appSecret: 'secret' }, undefined, db));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { global.fetch = network; await new Promise(resolve => server.close(resolve)); db.close(); });
  async function login(code) {
    const response = await network('http://127.0.0.1:' + server.address().port + '/api/session', {
      method: 'POST', body: JSON.stringify({ code, openid: 'untrusted', devKey: 'ignored' })
    });
    assert.equal(response.status, 200);
    return response.json();
  }
  const alice = await login('alice');
  assert.equal((await login('alice')).userId, alice.userId);
  assert.notEqual((await login('bob')).userId, alice.userId);
  assert.equal(alice.devKey, undefined);
});

test('mini-program accounts, report history and revisions survive a server restart', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'outfit-sqlite-'));
  const file = path.join(dir, 'test.sqlite');
  const config = { apiKey: 'test', faceMock: { enabled: true, dataFile: 'mock/Face检测数据.json' } };
  let db, server, base;
  async function start() {
    db = openDatabase(file);
    server = http.createServer(createApi(config, async () => sample().analysis, db));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = 'http://127.0.0.1:' + server.address().port + '/api';
  }
  async function stop() {
    await new Promise(resolve => server.close(resolve));
    db.close();
  }
  t.after(async () => { await stop(); fs.rmSync(dir, { recursive: true }); });
  await start();
  function call(route, method = 'GET', data, token) {
    return fetch(base + route, { method, headers: token ? { Authorization: 'Bearer ' + token } : {}, body: JSON.stringify(data) });
  }
  const login = async data => (await call('/session', 'POST', data)).json();
  const alice = await login({}), bob = await login({});
  assert.notEqual(alice.userId, bob.userId);
  assert.equal((await call('/reports')).status, 401);
  const snapshot = { revision: 0, mutation: 'device-a-0001', value: { version: 1, items: [{ name: '风衣' }] } };
  for (const kind of ['wardrobe', 'bangda']) {
    const route = '/data/' + kind;
    assert.equal((await call(route, 'PUT', snapshot, alice.token)).status, 200);
    assert.equal((await call(route, 'PUT', snapshot, alice.token)).status, 200);
    assert.equal((await call(route, 'PUT', { ...snapshot, mutation: 'other-device' }, alice.token)).status, 409);
    assert.equal((await (await call(route, 'GET', undefined, bob.token)).json()).value, null);
  }
  const face = 'data:image/jpeg;base64,' + fs.readFileSync('miniprogram/assets/face.jpg').toString('base64');
  const input = { consent: true, requestId: 'report-test-0001', profile: { gender: '男', age: 28, height: 175, weight: 140 }, images: { face } };
  const job = await (await call('/analysis-jobs', 'POST', input, alice.token)).json();
  assert.ok(job.id);
  let result;
  for (let attempt = 0; attempt < 100; attempt++) {
    result = await (await call('/analysis-jobs/' + job.id, 'GET', undefined, alice.token)).json();
    if (result.status !== 'running') break;
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  assert.equal(result.status, 'completed', JSON.stringify(result.error));
  const id = result.report.id, route = '/reports/' + id;
  await stop();
  await start();
  const renewed = await login({ devKey: alice.devKey });
  assert.equal(renewed.userId, alice.userId);
  assert.deepEqual((await (await call('/data/wardrobe', 'GET', undefined, renewed.token)).json()).value, snapshot.value);
  assert.equal((await (await call('/reports', 'GET', undefined, alice.token)).json())[0].id, id);
  assert.equal((await call(route, 'GET', undefined, bob.token)).status, 404);
  assert.equal((await call(route, 'PUT', { field: 'manualMeasurements', value: { waist: 73 } }, bob.token)).status, 404);
  assert.equal((await call(route, 'PUT', { field: 'manualMeasurements', value: { waist: 73 } }, renewed.token)).status, 200);
  await call(route, 'DELETE', undefined, bob.token);
  const report = await (await call(route, 'GET', undefined, alice.token)).json();
  assert.equal(report.manualMeasurements.waist, 73);
  assert.ok(report.accountReport);
  assert.ok(!JSON.stringify(report).includes('data:image/'));
  assert.equal((await call(route, 'DELETE', undefined, alice.token)).status, 200);
  assert.deepEqual(await (await call('/reports', 'GET', undefined, alice.token)).json(), []);
});

test('mini-program saves old local records, queues successive edits and recovers an unacknowledged write', async t => {
  const db = openDatabase(':memory:');
  const server = http.createServer(createApi({}, undefined, db));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => { delete global.wx; await new Promise(resolve => server.close(resolve)); db.close(); });
  const storage = new Map([['yanchuang.wardrobe.v1', { version: 1, items: [{ name: '旧外套' }] }]]);
  let loseNextAck = false, notifyLoss;
  global.wx = {
    getStorageSync: key => structuredClone(storage.get(key)),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    showModal: options => options.success({ confirm: true }),
    showToast: () => notifyLoss?.(),
    async request(options) {
      try {
        const url = base + new URL(options.url).pathname;
        const response = await fetch(url, { method: options.method, headers: options.header, body: JSON.stringify(options.data) });
        const data = await response.json();
        if (loseNextAck && options.method === 'PUT') {
          loseNextAck = false;
          options.fail();
        } else options.success({ statusCode: response.status, data });
      } catch (error) { options.fail(error); }
    }
  };
  const docs = require('../miniprogram/shared/account-document');
  const api = require('../miniprogram/shared/account-api');
  await docs.open('wardrobe');
  assert.equal((await api.call('/data/wardrobe')).value.items[0].name, '旧外套');
  docs.write('wardrobe', { version: 1, items: [{ name: '衬衫' }] });
  docs.write('wardrobe', { version: 1, items: [{ name: '开衫' }] });
  await docs.open('wardrobe');
  assert.equal((await api.call('/data/wardrobe')).value.items[0].name, '开衫');
  const lost = new Promise(resolve => { notifyLoss = resolve; });
  loseNextAck = true;
  docs.write('wardrobe', { version: 1, items: [] });
  await lost;
  await docs.open('wardrobe');
  assert.deepEqual(docs.read('wardrobe').items, []);
  const { revision } = await api.call('/data/wardrobe');
  await api.call('/data/wardrobe', 'PUT', { revision, mutation: 'mobile-device-02', value: { version: 1, items: [{ name: '风衣' }] } });
  await docs.open('wardrobe');
  assert.equal(docs.read('wardrobe').items[0].name, '风衣');
  const reporters = require('../miniprogram/shared/account-reports');
  const account = await api.session();
  db.saveReport(account.userId, { id: 'ai-deadbeef', createdAt: '2026-01-01', profile: {}, accountReport: true, photoEvidence: { photo: 'private' } });
  const [row] = await reporters.list();
  const report = await reporters.load(row.id);
  assert.equal(report.photoEvidence, undefined);
  await reporters.update({ ...report, manualMeasurements: { hip: 84 } }, 'manualMeasurements');
  assert.deepEqual((await reporters.load(row.id)).manualMeasurements, { hip: 84 });
  await reporters.remove(row);
  assert.deepEqual(await reporters.list(), []);
});
