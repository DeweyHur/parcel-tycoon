// 리더보드 API (Vercel Serverless Function) — GET 순위 · POST 기록
//   저장소: Upstash Redis REST (Vercel 마켓플레이스 'Upstash for Redis' 를 붙이면 KV_REST_API_URL/TOKEN 이 생긴다)
//   보드 = 런 하나(kr_summer · kr_autumn · kr_winter). 위클리 런은 weekly-2026W40 같은 id 로 같은 틀에 얹는다.
//   플레이어마다 최고 기록 하나만 남긴다(ZADD GT). 이름은 캠페인에서 지은 상호.
//
// 조작 방지는 지금은 '말이 되는 값인가'까지만 본다(범위·빈도). 게임이 시드 고정이라
// 다음 단계에서 행동 기록을 같이 보내 서버가 다시 돌려 검증할 수 있다 (docs/RELEASE_PLAN.md 리더보드).
const BOARDS = ['kr_summer', 'kr_autumn', 'kr_winter'];
const WEEKLY = /^weekly-\d{4}W\d{2}$/;
const TOP = 50;
const MAX_SCORE = 500000;          // 계절 런(6사이클) 기준으로 넉넉히 — 이보다 크면 받지 않는다
const RATE = { n: 12, sec: 60 };   // IP 당 분당 기록 제출

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const call = async cmds => {
    const r = await fetch(url.replace(/\/$/, '') + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
    if (!r.ok) throw new Error('store ' + r.status);
    const out = await r.json();
    return out.map(x => { if (x.error) throw new Error(x.error); return x.result; });
  };
  return { call };
}

const validBoard = b => BOARDS.includes(b) || WEEKLY.test(b);
const validPid = p => typeof p === 'string' && /^[a-z0-9]{12,40}$/.test(p);
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>&"'`\\]/g, '').trim().slice(0, 12) || '???';
const int = (v, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) { return null; } }
  let raw = ''; for await (const ch of req) raw += ch;
  try { return JSON.parse(raw || '{}'); } catch (e) { return null; }
}
function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');   // itch.io·앱(Capacitor)에서도 부른다
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.end(obj == null ? '' : JSON.stringify(obj));
}

async function board(S, b, pid) {
  const [flat, count, rank, mine] = await S.call([
    ['ZREVRANGE', 'lb:' + b, 0, TOP - 1, 'WITHSCORES'], ['ZCARD', 'lb:' + b],
    ['ZREVRANK', 'lb:' + b, pid || '-'], ['ZSCORE', 'lb:' + b, pid || '-'],
  ]);
  const ids = [], scores = [];
  for (let i = 0; i < (flat || []).length; i += 2) { ids.push(flat[i]); scores.push(+flat[i + 1]); }
  const metas = ids.length ? (await S.call([['HMGET', 'lbm:' + b, ...ids]]))[0] : [];
  const top = ids.map((id, i) => { let m = {}; try { m = JSON.parse(metas[i] || '{}'); } catch (e) { } return { rank: i + 1, name: m.name || '???', score: scores[i], cash: m.cash, rep: m.rep, win: !!m.win, me: id === pid }; });
  return { board: b, total: count || 0, top, me: rank == null ? null : { rank: rank + 1, score: +mine } };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, null);
  const S = store();
  if (!S) return send(res, 503, { error: 'no-store' });
  try {
    if (req.method === 'GET') {
      const q = new URL(req.url, 'http://x').searchParams;
      const b = q.get('board');
      if (!validBoard(b)) return send(res, 400, { error: 'board' });
      return send(res, 200, await board(S, b, validPid(q.get('pid')) ? q.get('pid') : null));
    }
    if (req.method === 'POST') {
      const d = await body(req);
      if (!d || !validBoard(d.board) || !validPid(d.pid)) return send(res, 400, { error: 'shape' });
      const score = int(d.score, 0, MAX_SCORE);
      if (score == null) return send(res, 400, { error: 'score' });
      const ip = String((req.headers && (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])) || 'local').split(',')[0].trim();
      const [hits] = await S.call([['INCR', 'rl:' + ip], ['EXPIRE', 'rl:' + ip, RATE.sec, 'NX']]);
      if (hits > RATE.n) return send(res, 429, { error: 'rate' });
      const key = 'lb:' + d.board, prev = (await S.call([['ZSCORE', key, d.pid]]))[0];
      const best = prev == null || score > +prev;
      if (best) {
        const meta = { name: cleanName(d.name), cash: int(d.cash, -1e6, 1e7), rep: int(d.rep, 0, 1000), win: !!d.win, months: int(d.months, 0, 99), seed: int(d.seed, 0, 2 ** 31), v: String(d.v || '').slice(0, 16), at: Date.now() };
        await S.call([['ZADD', key, score, d.pid], ['HSET', 'lbm:' + d.board, d.pid, JSON.stringify(meta)]]);
      }
      const out = await board(S, d.board, d.pid);
      out.best = best;
      return send(res, 200, out);
    }
    return send(res, 405, { error: 'method' });
  } catch (e) {
    return send(res, 500, { error: 'server' });
  }
};
module.exports.BOARDS = BOARDS;
