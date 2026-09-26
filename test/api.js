// 리더보드 API 단위 테스트 — Upstash REST 를 메모리 흉내로 바꿔 끼운다
// node test/api.js
const assert = require('assert');
process.env.KV_REST_API_URL = 'https://fake.upstash';
process.env.KV_REST_API_TOKEN = 't';
const z = {}, h = {}, kv = {};
const R = {
  ZREVRANGE: (k, a, b) => Object.entries(z[k] || {}).sort((x, y) => y[1] - x[1]).slice(+a, +b + 1).flatMap(([m, s]) => [m, String(s)]),
  ZCARD: k => Object.keys(z[k] || {}).length,
  ZREVRANK: (k, m) => { const l = Object.entries(z[k] || {}).sort((x, y) => y[1] - x[1]).map(x => x[0]); const i = l.indexOf(m); return i < 0 ? null : i; },
  ZSCORE: (k, m) => (z[k] && m in z[k]) ? String(z[k][m]) : null,
  ZADD: (k, s, m) => { (z[k] = z[k] || {})[m] = +s; return 1; },
  HSET: (k, f, v) => { (h[k] = h[k] || {})[f] = v; return 1; },
  HMGET: (k, ...fs) => fs.map(f => (h[k] || {})[f] || null),
  INCR: k => (kv[k] = (kv[k] || 0) + 1),
  EXPIRE: () => 1,
};
global.fetch = async (url, o) => { assert.ok(/\/pipeline$/.test(url)); const cmds = JSON.parse(o.body); return { ok: true, json: async () => cmds.map(([c, ...a]) => ({ result: R[c](...a) })) }; };
const handler = require('../api/scores.js');
const call = (method, url, body, ip) => new Promise(done => {
  const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(b) { done({ code: this.statusCode, body: b ? JSON.parse(b) : null, headers: this.headers }); } };
  handler({ method, url, body, headers: { 'x-forwarded-for': ip || '1.1.1.1' } }, res);
});
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('ok ' + name); };
(async () => {
  await t('빈 보드', async () => { const r = await call('GET', '/api/scores?board=kr_summer&pid=aaaaaaaaaaaaaaaa'); assert.equal(r.code, 200); assert.equal(r.body.total, 0); assert.equal(r.body.me, null); assert.equal(r.headers['Access-Control-Allow-Origin'], '*'); });
  await t('기록 → 순위', async () => {
    const r = await call('POST', '/api/scores', { board: 'kr_summer', pid: 'aaaaaaaaaaaaaaaa', name: '새봄택배', score: 9000, cash: 1200, rep: 40, win: true });
    assert.equal(r.code, 200); assert.equal(r.body.me.rank, 1); assert.equal(r.body.top[0].name, '새봄택배'); assert.ok(r.body.top[0].me); assert.ok(r.body.best);
    await call('POST', '/api/scores', { board: 'kr_summer', pid: 'bbbbbbbbbbbbbbbb', name: '<b>한길</b>', score: 12000 }, '2.2.2.2');
    const g = await call('GET', '/api/scores?board=kr_summer&pid=aaaaaaaaaaaaaaaa');
    assert.deepEqual(g.body.top.map(x => x.score), [12000, 9000]); assert.equal(g.body.me.rank, 2); assert.equal(g.body.top[0].name, 'b한길/b', '태그 문자는 걷어낸다');
  });
  await t('최고 기록만 남는다', async () => {
    const r = await call('POST', '/api/scores', { board: 'kr_summer', pid: 'aaaaaaaaaaaaaaaa', name: '새봄택배', score: 5000 });
    assert.equal(r.body.best, false); assert.equal(r.body.me.score, 9000);
  });
  await t('보드는 계절 셋 + 위클리 형식만', async () => {
    assert.equal((await call('GET', '/api/scores?board=kr_spring')).code, 400);
    assert.equal((await call('GET', '/api/scores?board=weekly-2026W40')).code, 200);
  });
  await t('말이 안 되는 값은 받지 않는다', async () => {
    assert.equal((await call('POST', '/api/scores', { board: 'kr_summer', pid: 'x', score: 1 })).code, 400);
    assert.equal((await call('POST', '/api/scores', { board: 'kr_summer', pid: 'cccccccccccccccc', score: 9e9 })).code, 400);
    assert.equal((await call('POST', '/api/scores', { board: 'kr_summer', pid: 'cccccccccccccccc', score: -5 })).code, 400);
  });
  await t('IP 당 분당 제출 제한', async () => {
    let last; for (let i = 0; i < 14; i++) last = await call('POST', '/api/scores', { board: 'kr_autumn', pid: 'dddddddddddddddd', score: 100 + i }, '9.9.9.9');
    assert.equal(last.code, 429);
  });
  await t('저장소가 없으면 503', async () => { delete process.env.KV_REST_API_URL; const r = await call('GET', '/api/scores?board=kr_summer'); assert.equal(r.code, 503); process.env.KV_REST_API_URL = 'https://fake.upstash'; });
  console.log(`\n${n} tests passed`);
})().catch(e => { console.error(e); process.exit(1); });
