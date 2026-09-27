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
  const FACES = ['park', 'yeo', 'noh', 'kang', 'han', 'ahn'];   // 포트레잇: 스토리 스프라이트를 빌린다 (Story.sprite)

  function hash(s) { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }
  function mkGame(seed, name, pid) { return new Game({ multi: true, seed, scenario: SCENARIO, company: 'local', perks: [], prep: false, companyName: name, pid }); }
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
    const faces = rng.shuffle(FACES);
    const players = [{ id: 0, name: o.name || 'You', human: true, face: faces[0], game: mkGame(seed, o.name, 0) }];
    for (let i = 0; i < bots; i++) players.push({ id: i + 1, name: pick(), human: false, face: faces[(i + 1) % faces.length], strat: STRATS[i % STRATS.length], speed: SPEEDS[i % SPEEDS.length], acc: 0, game: mkGame(seed, null, i + 1) });
    return { v: 2, seed, players, started: Date.now(), rng: hash('route' + seed), news: [], cycleDrops: 0 };
  }
  // 봇 하루 진행. 끝난 봇은 건드리지 않는다
  function botDay(p) { const g = p.game; if (finished(g)) return false; const r = BOT.multiDay(g, p.strat); g.takeEvents(); return r; }
  // 매치 난수 (폭탄 목적지 — 서버가 정할 자리. 지금은 매치 시드에서)
  function mrand(match) { match.rng = (Math.imul(match.rng ^ (match.rng >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return (match.rng >>> 8) / 16777216; }
  function targetsOf(match, from) { return match.players.filter(p => p.id !== from && !finished(p.game)); }
  function bombsInPlay(match) { return match.players.reduce((n, p) => n + p.game.bombCount(), 0); }
  // 각 판의 outbox(공격·폭탄 이사)를 상대 인박스로. 공격은 나 빼고 전원(마감·폐업 제외), 🎯 한 방은 1위 한 명에게만.
  // 폭탄은 랜덤 상대 한 명(되돌리기는 보낸 사람) — 갈 곳이 없으면(전원 마감) 소멸. 매치당 동시 최대 BOMB.max
  function route(match) {
    for (const p of match.players) {
      const g = p.game; if (!g.outbox.length) continue;
      const out = g.outbox.splice(0);
      for (const o of out) {
        if (o.type === 'attackOut') {
          let tg = targetsOf(match, p.id);
          if (o.focus) { const top = standings(match).find(r => r.alive && !r.done && r.p.id !== p.id); tg = top ? [top.p] : []; }
          if (o.trait === 't_bomb') {
            if (bombsInPlay(match) >= M.MULTI.BOMB.max || !tg.length) { match.news.push({ type: 'bombFizzle', from: p.id }); continue; }
            const t = tg[Math.floor(mrand(match) * tg.length)];
            const r = t.game.receiveBomb({ size: o.size || M.MULTI.BOMB.size, days: M.MULTI.BOMB.days, hops: 0, from: p.id });
            match.news.push({ type: 'bomb', from: p.id, to: [t.id], blast: !!r.blast }); continue;
          }
          for (const t of tg) t.game.receiveAttack({ trait: o.trait, mult: o.mult, from: p.id, fromName: p.name });
          match.news.push({ type: 'attack', from: p.id, to: tg.map(t => t.id), trait: o.trait, focus: !!o.focus });
        } else if (o.type === 'bombMove') {
          let t = o.to != null ? match.players.find(x => x.id === o.to && !finished(x.game)) : null;
          const tg = targetsOf(match, p.id);
          if (!t) t = tg.length ? tg[Math.floor(mrand(match) * tg.length)] : null;
          if (!t) { match.news.push({ type: 'bombFizzle', from: p.id }); continue; }
          const b = Object.assign({}, o.bomb, { from: p.id, back: !!o.back });
          const r = t.game.receiveBomb(b);
          match.news.push({ type: 'bomb', from: p.id, to: [t.id], blast: !!r.blast, back: !!o.back, size: b.size });
        }
      }
    }
  }
  // 매 사이클 정산마다 폭탄 하나 자동 투하 — 사람의 시계 기준 (사람이 사이클을 넘길 때)
  function cycleDrop(match, cycle) {
    if ((match.cycleDrops || 0) >= cycle || bombsInPlay(match) >= M.MULTI.BOMB.max) return;
    match.cycleDrops = cycle;
    const tg = match.players.filter(p => !finished(p.game)); if (!tg.length) return;
    const t = tg[Math.floor(mrand(match) * tg.length)];
    t.game.receiveBomb({ size: M.MULTI.BOMB.size, days: M.MULTI.BOMB.days, hops: 0, from: null });
    match.news.push({ type: 'bomb', from: null, to: [t.id], drop: true });
  }
  // ----- 재실행 검증 (3단계) — 같은 cfg·같은 입력 로그면 같은 판이 나와야 한다. 서버가 종료 시 돌려 본다 -----
  // 로그 항목: wait{ids} · call{i,ids,n} · self{ids} · shop · buy{i,s,m} · close · perk{id} · atk{a} · bomb{b}
  function replay(cfg, log) {
    const g = new Game(Object.assign({}, cfg, { multi: true, prep: false, mperks: [] }));   // 퍽은 로그(perk)로 다시 고른다 — cfg 에 남은 mperks 는 비운다
    for (const e of log || []) {
      if (g.phase === 'over' || g.phase === 'win') break;
      if (e.t === 'wait') g.wait(e.ids); else if (e.t === 'call') g.callCarrier(e.i, e.ids, e.n || undefined); else if (e.t === 'self') g.selfShip(e.ids);
      else if (e.t === 'shop') g.openShop(); else if (e.t === 'buy') g.buy(e.i, e.s, e.m || undefined); else if (e.t === 'close') g.closeMarket();
      else if (e.t === 'perk') g.pickPerk(e.id); else if (e.t === 'atk') g.receiveAttack(e.a); else if (e.t === 'bomb') g.receiveBomb(e.b);
      g.takeEvents();
    }
    return g;
  }
  function fingerprint(g) { return { cash: g.cash, rep: g.rep, day: dayOf(g), phase: g.phase, tier: g.repTier, delivered: g.run.delivered }; }
  function verify(cfg, log, claimed) { const g = replay(cfg, log), f = fingerprint(g); return { ok: f.cash === claimed.cash && f.rep === claimed.rep && f.day === claimed.day && (claimed.phase == null || f.phase === claimed.phase), got: f }; }
  function takeNews(match) { return (match.news || (match.news = [])).splice(0); }
  // 사람이 하루를 넘겼다 → 봇들도 제 속도로 따라온다 (누적 소수점: 1.15 면 스무 날에 세 번 이틀)
  function tick(match) {
    const h = dayOf(match.players[0].game);
    for (const p of match.players) {
      if (p.human) continue;
      const target = Math.floor(h * p.speed);
      let guard = 0;
      while (dayOf(p.game) < target && !finished(p.game) && guard++ < 40) { botDay(p); route(match); }
    }
    route(match);
  }
  // 사람이 끝났다(마감·폐업) → 남은 봇을 끝까지 돌린다 (관전은 4단계)
  function finishAll(match) {
    for (const p of match.players) { if (p.human) continue; let guard = 0; while (!finished(p.game) && guard++ < 400) { botDay(p); route(match); } }
  }
  function allDone(match) { return match.players.every(p => finished(p.game)); }
  // 순위: ① 생존자 > 폐업자 ② 생존자끼리 최종 잔액 ③ 동률이면 평판 ④ 폐업자끼리는 늦게 죽은 순
  function standings(match) {
    const rows = match.players.map(p => { const g = p.game; return { p, name: p.name, human: p.human, alive: alive(g), done: finished(g), win: g.phase === 'win', cash: g.cash, rep: g.rep, day: dayOf(g), days: totalDays(g), tier: g.repTier, perks: g.mperks.slice(), usage: g.usage(), cap: g.warehouse.cap, used: g.usedVolume() }; });
    rows.sort((a, b) => (b.alive - a.alive) || (a.alive ? (b.cash - a.cash) || (b.rep - a.rep) : (b.day - a.day) || (b.cash - a.cash)));
    rows.forEach((r, i) => r.rank = i + 1);
    return rows;
  }
  function toJSON(match) { return { v: match.v, seed: match.seed, started: match.started, rng: match.rng, cycleDrops: match.cycleDrops || 0, players: match.players.map(p => ({ id: p.id, name: p.name, human: p.human, face: p.face, strat: p.strat, speed: p.speed, game: p.game.toJSON() })) }; }
  function fromJSON(o) { return { v: o.v, seed: o.seed, started: o.started, rng: o.rng || hash('route' + o.seed), cycleDrops: o.cycleDrops || 0, news: [], players: o.players.map((p, i) => ({ face: FACES[i % FACES.length], ...p, game: Game.fromJSON(p.game) })) }; }

  const MULTI = { SCENARIO, FACES, replay, fingerprint, verify, newMatch, tick, route, cycleDrop, takeNews, finishAll, allDone, standings, botDay, dayOf, totalDays, toJSON, fromJSON };
  if (typeof module !== 'undefined') module.exports = MULTI; else root.MULTI = MULTI;
})(typeof window !== 'undefined' ? window : globalThis);
