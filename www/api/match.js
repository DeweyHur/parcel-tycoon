// 멀티 「난투」 서버 (Vercel Serverless Function, docs/MULTIPLAYER_DESIGN.md 9·10장 · 부록 C)
//   저장소: scores.js 와 같은 Upstash Redis REST. 서버리스라 WebSocket 은 없다 — 클라이언트가 **폴링**한다
//   (눌러야 진행·타이머 없음이라 실시간이 필요 없다). 서버가 하는 일은 넷뿐:
//   ① 매칭 큐(같은 등급 ±1 → 30초 ±2 → 60초 봇 채움)  ② 이벤트 중계(공격은 나 빼고 전원, 🎯 는 1위)  ③ 폭탄 목적지 랜덤(클라 조작 방지)
//   ④ 종료 시 입력 로그 재실행 검증(같은 시드 = 결정적) → 안 맞으면 그 판은 무효·ELO 미반영. ELO 는 모든 쌍을 1:1 로 (K 32, 30판 뒤 16)
//   봇은 **호스트(첫 사람)** 클라이언트가 돌린다 — 봇 스냅샷·이벤트도 호스트가 올린다. 봇과의 쌍은 ELO 에 안 들어간다.
//   POST { op, ... } 하나로: queue · leave · status · push · poll · finish · elo
const path = require('path');
const M = require(path.join(__dirname, '..', 'js', 'meta.js'));
const MULTI = require(path.join(__dirname, '..', 'js', 'multi.js'));

const PLAYERS = M.MULTI.PLAYERS, ELO_START = M.MULTI.ELO_START, BAND = M.MULTI.ELO_STEP;
const WAIT_WIDEN = 30, WAIT_BOTS = 60;      // 초
const GONE_SEC = 180;                        // 3분 무응답 = 폐업 판정
const TTL = 6 * 3600;
const RATE = { n: 240, sec: 60 };            // IP 당 분당 호출 (폴링 3초 = 20/분)
const BOT_NAMES = ['한길', '번개', '새벽', '큰손', '느긋', '만차', '도크', '상하차'];
const STRATS = ['balanced', 'greedy', 'saver'];

// ----- 저장소: Upstash REST 파이프라인, 없으면 인메모리(테스트·로컬) -----
function memStore() {
  const H = new Map(), K = new Map(), L = new Map(), X = new Map();
  const live = k => { const e = X.get(k); if (e && e < Date.now()) { K.delete(k); H.delete(k); L.delete(k); X.delete(k); } };
  const one = c => {
    const [cmd, k, ...a] = c; live(k);
    switch (cmd) {
      case 'HSET': { const h = H.get(k) || new Map(); for (let i = 0; i < a.length; i += 2) h.set(a[i], String(a[i + 1])); H.set(k, h); return 1; }
      case 'HGET': { const h = H.get(k); return h && h.has(a[0]) ? h.get(a[0]) : null; }
      case 'HDEL': { const h = H.get(k); if (!h) return 0; let n = 0; for (const f of a) n += h.delete(f) ? 1 : 0; return n; }
      case 'HGETALL': { const h = H.get(k); const out = []; if (h) for (const [f, v] of h) out.push(f, v); return out; }
      case 'HLEN': { const h = H.get(k); return h ? h.size : 0; }
      case 'GET': return K.has(k) ? K.get(k) : null;
      case 'SET': { K.set(k, String(a[0])); const i = a.indexOf('EX'); if (i >= 0) X.set(k, Date.now() + a[i + 1] * 1000); return 'OK'; }
      case 'DEL': { let n = 0; for (const key of [k, ...a]) { n += (K.delete(key) ? 1 : 0) + (H.delete(key) ? 1 : 0) + (L.delete(key) ? 1 : 0); } return n; }
      case 'RPUSH': { const l = L.get(k) || []; l.push(...a.map(String)); L.set(k, l); return l.length; }
      case 'LRANGE': { const l = L.get(k) || []; const s = +a[0], e = +a[1]; return l.slice(s, e < 0 ? l.length + e + 1 : e + 1); }
      case 'LLEN': return (L.get(k) || []).length;
      case 'INCR': { const v = (+(K.get(k) || 0)) + 1; K.set(k, String(v)); return v; }
      case 'EXPIRE': { if (a[1] === 'NX' && X.has(k)) return 0; X.set(k, Date.now() + a[0] * 1000); return 1; }
      default: throw new Error('mem: ' + cmd);
    }
  };
  return { call: async cmds => cmds.map(one), mem: true };
}
function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return process.env.MATCH_MEM ? (store._mem || (store._mem = memStore())) : null;
  const call = async cmds => {
    const r = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
    if (!r.ok) throw new Error('store ' + r.status);
    const out = await r.json();
    return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
  };
  return { call };
}

const now = () => Math.floor(Date.now() / 1000);
const validPid = p => typeof p === 'string' && /^[a-z0-9]{12,40}$/.test(p);
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').trim().slice(0, 12) || '???';
const J = s => { try { return JSON.parse(s); } catch (e) { return null; } };
const hashAll = flat => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = flat[i + 1]; return o; };
function rankOf(elo) { const R = M.MULTI.RANKS; return R[Math.max(0, Math.min(R.length - 1, Math.floor((elo - ELO_START) / BAND)))]; }   // 1200~1399 견습 · 200 마다 한 칸 · 2400+ 신
function rndInt(n) { return Math.floor(Math.random() * n); }
function mkId() { return Math.random().toString(36).slice(2, 10) + now().toString(36); }

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return J(req.body);
  let raw = ''; for await (const ch of req) raw += ch;
  return J(raw || '{}');
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.end(obj == null ? '' : JSON.stringify(obj));
}

// ----- 등급 -----
async function getElo(S, pid) { const r = J((await S.call([['GET', 'elo:' + pid]]))[0]); return r || { elo: ELO_START, games: 0, wins: 0 }; }
async function loadMatch(S, mid) { return J((await S.call([['GET', 'm:' + mid]]))[0]); }
async function saveMatch(S, m) { await S.call([['SET', 'm:' + m.id, JSON.stringify(m), 'EX', TTL]]); }

// ----- 매칭 큐 -----
// 큐는 해시 mq: pid → { pid, name, face, elo, at }. 폴링(queue op)마다 짝을 맞춰 본다 — 서버리스엔 타이머가 없다
async function matchmake(S) {
  const q = Object.values(hashAll((await S.call([['HGETALL', 'mq']]))[0])).map(J).filter(Boolean).sort((a, b) => a.at - b.at);
  if (!q.length) return null;
  const t = now(), head = q[0], waited = t - head.at;
  const band = BAND * (waited >= WAIT_WIDEN ? 2 : 1);
  const group = q.filter(x => Math.abs(x.elo - head.elo) <= band).slice(0, PLAYERS);
  if (group.length < PLAYERS && waited < WAIT_BOTS) return null;
  // 상위 등급(팀장 이상)에서는 봇 없이 사람만 — 넷이 안 모이면 계속 기다린다
  if (group.length < PLAYERS && head.elo >= ELO_START + BAND * 3) return null;
  const players = group.map((x, i) => ({ pid: x.pid, name: x.name, face: x.face, elo: x.elo, bot: false, host: i === 0 }));
  const names = BOT_NAMES.slice().sort(() => Math.random() - 0.5), faces = MULTI.FACES.filter(f => !players.some(p => p.face === f));
  for (let i = players.length; i < PLAYERS; i++) players.push({ pid: 'bot' + i, name: names[i], face: faces[i % faces.length] || 'rep', elo: ELO_START, bot: true, strat: STRATS[i % STRATS.length] });
  const m = { id: mkId(), seed: rndInt(2147483647), players, created: t, rated: players.filter(p => !p.bot).length >= 2, cycle: 0 };
  await saveMatch(S, m);
  await S.call(group.map(x => ['HDEL', 'mq', x.pid]).concat(group.map(x => ['SET', 'mp:' + x.pid, m.id, 'EX', TTL])));
  return m;
}

// ----- 중계 -----
// 스냅샷 ms:mid (해시 pid → json). 살아 있고 마감 안 한 사람 = 공격 대상. 3분 무응답이면 폐업으로 친다
async function snapshots(S, m) {
  const h = hashAll((await S.call([['HGETALL', 'ms:' + m.id]]))[0]), t = now(), out = {};
  for (const p of m.players) { const s = J(h[p.pid]) || { cash: 0, rep: 0, day: 1, phase: 'play', bombs: 0, at: m.created }; if (!p.bot && s.phase === 'play' && t - (s.at || m.created) > GONE_SEC) s.phase = 'gone'; out[p.pid] = s; }
  return out;
}
const active = s => s.phase === 'play';
async function appendEvents(S, m, list) {
  if (!list.length) return;
  const base = (await S.call([['LLEN', 'me:' + m.id]]))[0];
  await S.call(list.map((e, i) => ['RPUSH', 'me:' + m.id, JSON.stringify(Object.assign({ i: base + i + 1, at: now() }, e))]).concat([['EXPIRE', 'me:' + m.id, TTL]]));
}
// 클라이언트가 올린 것(공격 발사·폭탄 이사·사이클)을 목적지가 붙은 이벤트로 바꾼다
async function route(S, m, from, ev, snaps) {
  const others = m.players.filter(p => p.pid !== from && active(snaps[p.pid]));
  const bombs = m.players.reduce((n, p) => n + ((snaps[p.pid] || {}).bombs || 0), 0);
  const out = [];
  if (ev.type === 'attackOut') {
    let tg = others;
    if (ev.focus) { const top = others.slice().sort((a, b) => (snaps[b.pid].cash || 0) - (snaps[a.pid].cash || 0))[0]; tg = top ? [top] : []; }
    if (ev.trait === 't_bomb') {
      if (bombs >= M.MULTI.BOMB.max || !tg.length) return [{ type: 'bombFizzle', from, to: null }];
      const t = tg[rndInt(tg.length)];
      return [{ type: 'bomb', from, to: [t.pid], bomb: { size: ev.size || M.MULTI.BOMB.size, days: M.MULTI.BOMB.days, hops: 0, from } }];
    }
    for (const t of tg) out.push({ type: 'attack', from, to: [t.pid], trait: ev.trait, mult: ev.mult || 1, focus: !!ev.focus, fromName: (m.players.find(p => p.pid === from) || {}).name });
    return out;
  }
  if (ev.type === 'bombMove') {
    let t = ev.to != null ? m.players.find(p => p.pid === ev.to && active(snaps[p.pid])) : null;
    if (!t) t = others.length ? others[rndInt(others.length)] : null;
    if (!t) return [{ type: 'bombFizzle', from, to: null }];
    return [{ type: 'bomb', from, to: [t.pid], back: !!ev.back, bomb: Object.assign({}, ev.bomb, { from }) }];
  }
  if (ev.type === 'cycle') {   // 사이클 정산마다 폭탄 하나 자동 투하 (호스트가 보낸다, 한 사이클에 한 번)
    if ((m.cycle || 0) >= ev.n || bombs >= M.MULTI.BOMB.max) return [];
    m.cycle = ev.n; await saveMatch(S, m);
    const all = m.players.filter(p => active(snaps[p.pid])); if (!all.length) return [];
    const t = all[rndInt(all.length)];
    return [{ type: 'bomb', from: null, to: [t.pid], drop: true, bomb: { size: M.MULTI.BOMB.size, days: M.MULTI.BOMB.days, hops: 0, from: null } }];
  }
  if (ev.type === 'note') return [{ type: 'note', from, to: null, text: String(ev.text || '').slice(0, 40) }];   // 관전 응원 이모지 (4단계 자리)
  return [];
}

// ----- ELO -----
// 순위: 생존 > 잔액 > 평판 > 늦게 죽은 순. 사람끼리 모든 쌍을 1:1 로. 봇 쌍·미검증 판은 안 센다
function rankRows(m, results) {
  const rows = m.players.map(p => Object.assign({ pid: p.pid, bot: p.bot }, results[p.pid] || { cash: -1e9, rep: 0, day: 0, win: false, alive: false }));
  rows.sort((a, b) => ((b.alive ? 1 : 0) - (a.alive ? 1 : 0)) || (a.alive ? (b.cash - a.cash) || (b.rep - a.rep) : (b.day - a.day) || (b.cash - a.cash)));
  rows.forEach((r, i) => r.rank = i + 1);
  return rows;
}
async function settleElo(S, m, results) {
  const rows = rankRows(m, results), humans = rows.filter(r => !r.bot);
  const ratings = {}; for (const h of humans) ratings[h.pid] = await getElo(S, h.pid);
  const delta = {}; for (const h of humans) delta[h.pid] = 0;
  const unverified = humans.some(h => !(results[h.pid] && results[h.pid].verified));
  const rated = m.rated && !unverified;
  if (rated) for (let i = 0; i < humans.length; i++) for (let j = i + 1; j < humans.length; j++) {
    const a = humans[i], b = humans[j], ra = ratings[a.pid].elo, rb = ratings[b.pid].elo;
    const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400)), sa = a.rank < b.rank ? 1 : a.rank > b.rank ? 0 : 0.5;
    const ka = ratings[a.pid].games >= 30 ? 16 : 32, kb = ratings[b.pid].games >= 30 ? 16 : 32;
    delta[a.pid] += ka * (sa - ea); delta[b.pid] += kb * ((1 - sa) - (1 - ea));
  }
  const cmds = [];
  for (const h of humans) { const r = ratings[h.pid]; const nx = { elo: Math.max(100, Math.round(r.elo + (rated ? delta[h.pid] : 0))), games: r.games + (rated ? 1 : 0), wins: r.wins + (rated && h.rank === 1 ? 1 : 0), name: (m.players.find(p => p.pid === h.pid) || {}).name }; ratings[h.pid] = Object.assign(nx, { before: r.elo, delta: rated ? Math.round(delta[h.pid]) : 0, rank: rankOf(nx.elo) }); cmds.push(['SET', 'elo:' + h.pid, JSON.stringify({ elo: nx.elo, games: nx.games, wins: nx.wins, name: nx.name })]); }
  if (cmds.length) await S.call(cmds);
  m.settled = { rated, void: !!unverified, rows: rows.map(r => ({ pid: r.pid, rank: r.rank, cash: r.cash, rep: r.rep, day: r.day, alive: r.alive, verified: !!(results[r.pid] || {}).verified })), elo: ratings }; await saveMatch(S, m);
  return m.settled;
}

async function handle(S, d, ip) {
  const op = d.op;
  if (op === 'elo') { if (!validPid(d.pid)) return [400, { error: 'pid' }]; const r = await getElo(S, d.pid); return [200, Object.assign(r, { rank: rankOf(r.elo) })]; }
  if (op === 'queue') {
    if (!validPid(d.pid)) return [400, { error: 'pid' }];
    const cur = (await S.call([['GET', 'mp:' + d.pid]]))[0];
    if (cur) { const m = await loadMatch(S, cur); if (m && !m.settled) return [200, { status: 'ready', match: m }]; await S.call([['DEL', 'mp:' + d.pid]]); }
    const inQ = J((await S.call([['HGET', 'mq', d.pid]]))[0]);
    const elo = (await getElo(S, d.pid)).elo;
    const entry = { pid: d.pid, name: cleanName(d.name), face: MULTI.FACES.includes(d.face) ? d.face : 'park', elo, at: inQ ? inQ.at : now() };
    await S.call([['HSET', 'mq', d.pid, JSON.stringify(entry)], ['EXPIRE', 'mq', TTL]]);
    const m = await matchmake(S);
    if (m && m.players.some(p => p.pid === d.pid)) return [200, { status: 'ready', match: m }];
    const qn = (await S.call([['HLEN', 'mq']]))[0];
    return [200, { status: 'waiting', waited: now() - entry.at, inQueue: qn, widenAt: WAIT_WIDEN, botsAt: WAIT_BOTS, elo, rank: rankOf(elo) }];
  }
  if (op === 'leave') { if (!validPid(d.pid)) return [400, { error: 'pid' }]; await S.call([['HDEL', 'mq', d.pid]]); return [200, { ok: true }]; }
  if (!d.mid || typeof d.mid !== 'string' || !validPid(d.pid)) return [400, { error: 'shape' }];
  const m = await loadMatch(S, d.mid); if (!m) return [404, { error: 'match' }];
  const me = m.players.find(p => p.pid === d.pid); if (!me) return [403, { error: 'notin' }];
  const own = new Set([d.pid].concat(me.host ? m.players.filter(p => p.bot).map(p => p.pid) : []));   // 호스트는 봇 몫도 올리고 받는다
  if (op === 'status') return [200, { match: m }];
  if (op === 'push') {
    const cmds = [], t = now();
    for (const pid in (d.snaps || {})) { if (!own.has(pid)) continue; const s = d.snaps[pid]; cmds.push(['HSET', 'ms:' + m.id, pid, JSON.stringify({ cash: +s.cash || 0, rep: +s.rep || 0, repCap: +s.repCap || 0, day: +s.day || 1, days: +s.days || 0, used: +s.used || 0, cap: +s.cap || 0, shields: +s.shields || 0, bombs: +s.bombs || 0, phase: ['play', 'over', 'win', 'market'].includes(s.phase) ? (s.phase === 'market' ? 'play' : s.phase) : 'play', tier: +s.tier || 0, perks: Array.isArray(s.perks) ? s.perks.slice(0, 20) : [], at: t })]); }
    if (cmds.length) await S.call(cmds.concat([['EXPIRE', 'ms:' + m.id, TTL]]));
    const snaps = await snapshots(S, m), out = [];
    for (const ev of (d.events || []).slice(0, 50)) { if (!ev || !own.has(ev.from)) continue; out.push(...await route(S, m, ev.from, ev, snaps)); }
    await appendEvents(S, m, out);
    return [200, { ok: true, routed: out.length }];
  }
  if (op === 'poll') {
    const since = Math.max(0, +d.since || 0);
    const raw = (await S.call([['LRANGE', 'me:' + m.id, since, -1]]))[0] || [];
    const events = raw.map(J).filter(e => e && (e.to == null || e.to.some(x => own.has(x)) || e.from === d.pid));
    const snaps = await snapshots(S, m);
    const results = hashAll((await S.call([['HGETALL', 'mf:' + m.id]]))[0]); for (const k in results) results[k] = J(results[k]);
    return [200, { events, cursor: since + raw.length, snaps, results, match: m }];
  }
  if (op === 'finish') {
    if (!own.has(d.for || d.pid)) return [403, { error: 'notown' }];
    const pid = d.for || d.pid, r = d.result || {}, bot = pid !== d.pid;
    let verified = bot;   // 봇 결과는 호스트를 믿는다(봇 쌍은 ELO 에 안 든다). 사람은 재실행으로
    if (!bot && d.cfg && Array.isArray(d.log)) { try { verified = MULTI.verify(Object.assign({}, d.cfg, { seed: m.seed }), d.log, { cash: r.cash, rep: r.rep, day: r.day, phase: r.win ? 'win' : 'over' }).ok; } catch (e) { verified = false; } }
    const rec = { cash: Math.round(+r.cash || 0), rep: Math.round(+r.rep || 0), day: Math.round(+r.day || 0), win: !!r.win, alive: !!r.win, verified, at: now() };
    await S.call([['HSET', 'mf:' + m.id, pid, JSON.stringify(rec)], ['EXPIRE', 'mf:' + m.id, TTL], ['HSET', 'ms:' + m.id, pid, JSON.stringify(Object.assign({ cash: rec.cash, rep: rec.rep, day: rec.day, phase: rec.win ? 'win' : 'over', bombs: 0, at: now() }))]]);
    const results = hashAll((await S.call([['HGETALL', 'mf:' + m.id]]))[0]); for (const k in results) results[k] = J(results[k]);
    const humans = m.players.filter(p => !p.bot);
    let settled = m.settled || null;
    if (!settled && humans.every(h => results[h.pid])) { if (m.players.every(p => results[p.pid])) settled = await settleElo(S, m, results); }
    if (!bot) await S.call([['DEL', 'mp:' + pid]]);
    return [200, { ok: true, verified, settled }];
  }
  return [400, { error: 'op' }];
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, null);
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  const S = store();
  if (!S) return send(res, 503, { error: 'no-store' });
  try {
    const d = await body(req); if (!d) return send(res, 400, { error: 'json' });
    const ip = String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || 'local').split(',')[0].trim();
    const [hits] = await S.call([['INCR', 'rlm:' + ip], ['EXPIRE', 'rlm:' + ip, RATE.sec, 'NX']]);
    if (hits > RATE.n) return send(res, 429, { error: 'rate' });
    const [code, obj] = await handle(S, d, ip);
    return send(res, code, obj);
  } catch (e) { return send(res, 500, { error: 'server', detail: String(e && e.message || e).slice(0, 120) }); }
};
module.exports.handle = handle; module.exports.memStore = memStore; module.exports.rankOf = rankOf; module.exports.rankRows = rankRows;
