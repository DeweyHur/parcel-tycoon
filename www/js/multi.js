// 멀티플레이 「난투」 — 매치 진행 (docs/MULTIPLAYER_DESIGN.md)
// 1단계: 서버 없이 **혼자서 봇 3명과**. 넷의 시계는 각자 돈다 — 사람이 하루를 넘길 때마다 봇도 저마다의 속도로 하루쯤 간다.
// 규칙은 game.js(rules.multi …)와 META.MULTI 에 있고, 여기는 판 넷을 묶는 것만: 만들기 · 봇 진행 · 순위 · 저장.
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;
  const M = typeof module !== 'undefined' ? require('./meta.js') : root.META;
  const { Game } = typeof module !== 'undefined' ? require('./game.js') : root;
  const BOT = typeof module !== 'undefined' ? require('./bot.js') : root.BOT;

  const SCENARIO = 'kr_summer';            // 달력은 시각만(META.MULTI.mods 가 4월 시작·명절 없음으로 덮는다)
  const STRATS = ['balanced', 'greedy', 'saver'];
  const SPEEDS = [1.15, 1.0, 0.85];        // 봇마다 시계 속도 — 빠른 사람은 일찍 끝내고, 느린 사람은 뒤에서 따라온다

  function hash(s) { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
  function mkGame(seed, name) { return new Game({ multi: true, seed, scenario: SCENARIO, company: 'local', perks: [], prep: false, companyName: name }); }
  function alive(g) { return g.phase !== 'over'; }
  function finished(g) { return g.phase === 'over' || g.phase === 'win'; }
  // 지난 영업일 수(장 본 날 포함) — 시계가 다르니 이게 있어야 "저 사람은 벌써 끝나간다"가 읽힌다
  function dayOf(g) { return g.totalTurn || 0; }
  function totalDays(g) { let n = 0; for (let c = 1; c <= g.rules.months; c++) n += g.turns(c); return n; }

  // 새 매치. names: 봇 이름 후보(locale). 사람은 players[0]
  function newMatch(o) {
    const seed = o.seed != null ? o.seed : (Date.now() % 2147483647);
    const rng = new (root.Rng || require('./game.js').Rng)(hash('bots' + seed));
    const pool = (o.botNames || ['A', 'B', 'C']).slice(); const pick = () => pool.length ? pool.splice(rng.int(pool.length), 1)[0] : 'Bot';
    const bots = o.bots != null ? o.bots : (M.MULTI.PLAYERS - 1);
    const players = [{ id: 0, name: o.name || 'You', human: true, game: mkGame(seed, o.name) }];
    for (let i = 0; i < bots; i++) players.push({ id: i + 1, name: pick(), human: false, strat: STRATS[i % STRATS.length], speed: SPEEDS[i % SPEEDS.length], acc: 0, game: mkGame(seed, null) });
    return { v: 1, seed, players, started: Date.now() };
  }
  // 봇 하루 진행. 끝난 봇은 건드리지 않는다
  function botDay(p) { const g = p.game; if (finished(g)) return false; return BOT.multiDay(g, p.strat); }
  // 사람이 하루를 넘겼다 → 봇들도 제 속도로 따라온다 (누적 소수점: 1.15 면 스무 날에 세 번 이틀)
  function tick(match) {
    const h = dayOf(match.players[0].game);
    for (const p of match.players) {
      if (p.human) continue;
      const target = Math.floor(h * p.speed);
      let guard = 0;
      while (dayOf(p.game) < target && !finished(p.game) && guard++ < 40) botDay(p);
    }
  }
  // 사람이 끝났다(마감·폐업) → 남은 봇을 끝까지 돌린다 (관전은 4단계)
  function finishAll(match) {
    for (const p of match.players) { if (p.human) continue; let guard = 0; while (!finished(p.game) && guard++ < 400) botDay(p); }
  }
  function allDone(match) { return match.players.every(p => finished(p.game)); }
  // 순위: ① 생존자 > 폐업자 ② 생존자끼리 최종 잔액 ③ 동률이면 평판 ④ 폐업자끼리는 늦게 죽은 순
  function standings(match) {
    const rows = match.players.map(p => { const g = p.game; return { p, name: p.name, human: p.human, alive: alive(g), done: finished(g), win: g.phase === 'win', cash: g.cash, rep: g.rep, day: dayOf(g), days: totalDays(g), tier: g.repTier, perks: g.mperks.slice(), usage: g.usage(), cap: g.warehouse.cap, used: g.usedVolume() }; });
    rows.sort((a, b) => (b.alive - a.alive) || (a.alive ? (b.cash - a.cash) || (b.rep - a.rep) : (b.day - a.day) || (b.cash - a.cash)));
    rows.forEach((r, i) => r.rank = i + 1);
    return rows;
  }
  function toJSON(match) { return { v: match.v, seed: match.seed, started: match.started, players: match.players.map(p => ({ id: p.id, name: p.name, human: p.human, strat: p.strat, speed: p.speed, game: p.game.toJSON() })) }; }
  function fromJSON(o) { return { v: o.v, seed: o.seed, started: o.started, players: o.players.map(p => ({ ...p, game: Game.fromJSON(p.game) })) }; }

  const MULTI = { SCENARIO, newMatch, tick, finishAll, allDone, standings, botDay, dayOf, totalDays, toJSON, fromJSON };
  if (typeof module !== 'undefined') module.exports = MULTI; else root.MULTI = MULTI;
})(typeof window !== 'undefined' ? window : globalThis);
