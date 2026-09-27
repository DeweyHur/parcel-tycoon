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
  // ----- 온라인 매치 (3단계, www/api/match.js) -----
  // 서버가 준 매치(시드·자리)에서 내 판을 만든다. 봇은 호스트(첫 사람)만 돌린다 — 나머지는 서버 스냅샷으로 본다
  function newOnline(sm, mypid, o) {
    const players = sm.players.map(p => {
      const me = p.pid === mypid, host = sm.players[0].pid === mypid;
      const bn = o && o.botNames; const name = p.bot && bn && bn.length ? bn[(p.nid || 0) % bn.length] : p.name;   // 봇 이름은 내 언어로
      const base = { id: p.pid, name, face: p.face || 'park', human: !p.bot, remote: !me && !p.bot, bot: !!p.bot, strat: p.strat, speed: p.bot ? SPEEDS[(+p.pid.replace(/\D/g, '') || 1) % SPEEDS.length] : 1, snap: null };
      if (me) base.game = mkGame(sm.seed, o && o.name || p.name, p.pid);
      else if (p.bot && host) base.game = mkGame(sm.seed, null, p.pid);
      return base;
    });
    // 내 자리를 맨 앞으로 (화면은 맨 왼쪽이 나)
    players.sort((a, b) => (a.id === mypid ? -1 : 0) - (b.id === mypid ? -1 : 0));
    return { v: 2, seed: sm.seed, players, started: Date.now(), rng: hash('route' + sm.seed), news: [], cycleDrops: 0,
      online: { mid: sm.id, pid: mypid, host: sm.players[0].pid === mypid, since: 0, pending: [], results: {}, settled: sm.settled || null } };
  }
  function owned(match) { return match.players.filter(p => p.game).map(p => p.id); }
  // 서버에서 온 이벤트를 내 판(과 호스트면 봇 판)에 적용하고 화면용 소식으로 바꾼다
  function applyServer(match, res) {
    const on = match.online; if (!on) return;
    on.since = res.cursor != null ? res.cursor : on.since;
    for (const p of match.players) if (!p.game && res.snaps && res.snaps[p.id]) p.snap = res.snaps[p.id];
    if (res.results) on.results = res.results;
    if (res.match && res.match.settled) on.settled = res.match.settled;
    const mine = new Set(owned(match));
    for (const e of res.events || []) {
      if (e.type === 'attack') { const t = match.players.find(p => p.id === e.to[0]); if (t && t.game && mine.has(t.id)) t.game.receiveAttack({ trait: e.trait, mult: e.mult, from: e.from, fromName: e.fromName });
        match.news.push({ type: 'attack', from: e.from, to: e.to, trait: e.trait, focus: !!e.focus, remote: true }); }
      else if (e.type === 'bomb') { const t = match.players.find(p => p.id === e.to[0]); let blast = false; if (t && t.game && mine.has(t.id)) { const r = t.game.receiveBomb(Object.assign({}, e.bomb, { back: !!e.back })); blast = !!(r && r.blast); }
        match.news.push({ type: 'bomb', from: e.from, to: e.to, blast, back: !!e.back, drop: !!e.drop, remote: true }); }
      else if (e.type === 'bombFizzle') match.news.push({ type: 'bombFizzle', from: e.from });
      else if (e.type === 'note') match.news.push({ type: 'note', from: e.from, text: e.text });
    }
    // 내가 쏜 것도 서버가 목적지를 붙여 돌려주면 그때 날린다 — 온라인에선 발사 연출이 한 폴링(≤3초) 늦다
  }
  // 서버로 보낼 묶음: 밀린 이벤트 + 내가 돌리는 판들의 스냅샷
  function outgoing(match) {
    const on = match.online; if (!on) return null;
    const events = on.pending.splice(0), snaps = {};
    for (const p of match.players) if (p.game) snaps[p.id] = snapOf(p.game);
    return { events, snaps };
  }
  // 봇 하루 진행. 끝난 봇은 건드리지 않는다
  function botDay(p) { const g = p.game; if (finished(g)) return false; const r = BOT.multiDay(g, p.strat); g.takeEvents(); return r; }
  // 매치 난수 (폭탄 목적지 — 서버가 정할 자리. 지금은 매치 시드에서)
  function mrand(match) { match.rng = (Math.imul(match.rng ^ (match.rng >>> 15), 0x2c1b3c6d) + 0x9e3779b9) >>> 0; return (match.rng >>> 8) / 16777216; }
  function targetsOf(match, from) { return match.players.filter(p => p.id !== from && !stateOf(p).done); }
  function bombsInPlay(match) { return match.players.reduce((n, p) => n + stateOf(p).bombs, 0); }
  // 각 판의 outbox(공격·폭탄 이사)를 상대 인박스로. 공격은 나 빼고 전원(마감·폐업 제외), 🎯 한 방은 1위 한 명에게만.
  // 폭탄은 랜덤 상대 한 명(되돌리기는 보낸 사람) — 갈 곳이 없으면(전원 마감) 소멸. 매치당 동시 최대 BOMB.max
  function route(match) {
    for (const p of match.players) {
      const g = p.game; if (!g || !g.outbox.length) continue;
      const out = g.outbox.splice(0);
      if (match.online) { for (const o of out) match.online.pending.push(Object.assign({ from: p.id }, o)); continue; }   // 온라인: 서버가 목적지를 정한다 (net.js 가 보낸다)
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
    if (match.online) { if ((match.cycleDrops || 0) < cycle) { match.cycleDrops = cycle; match.online.pending.push({ from: match.players[0].id, type: 'cycle', n: cycle }); } return; }
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
    noteFinish(match);
    const h = dayOf(match.players[0].game);
    for (const p of match.players) {
      if (p.human || !p.game) continue;
      const target = Math.floor(h * p.speed);
      let guard = 0;
      while (dayOf(p.game) < target && !finished(p.game) && guard++ < 40) { botDay(p); route(match); noteFinish(match); }
    }
    route(match); noteFinish(match);
  }
  // 사람이 끝났다(마감·폐업) → 남은 봇을 끝까지 돌린다 (관전은 4단계)
  function finishAll(match) {
    noteFinish(match);
    for (const p of match.players) { if (p.human || !p.game) continue; let guard = 0; while (!finished(p.game) && guard++ < 400) { botDay(p); route(match); noteFinish(match); } }
  }
  function allDone(match) { return match.players.every(p => stateOf(p).done); }
  // 순위: ① 생존자 > 폐업자 ② 생존자끼리 최종 잔액 ③ 동률이면 평판 ④ 폐업자끼리는 늦게 죽은 순
  // 한 사람의 상태 — 내 판(game)이 있으면 거기서, 원격(온라인 상대)이면 서버 스냅샷(snap)에서
  function stateOf(p) {
    const g = p.game;
    if (g) return { alive: alive(g), done: finished(g), win: g.phase === 'win', cash: g.cash, rep: g.rep, repCap: g.repCap(), day: dayOf(g), days: totalDays(g), tier: g.repTier, perks: g.mperks.slice(), cap: g.warehouse.cap, used: g.usedVolume(), shields: g.shields, bombs: g.bombCount(), phase: g.phase };
    const s = p.snap || {}; const ph = s.phase || 'play', dead = ph === 'over' || ph === 'gone';
    return { alive: !dead, done: ph !== 'play', win: ph === 'win', cash: s.cash || 0, rep: s.rep || 0, repCap: s.repCap || 20, day: s.day || 1, days: s.days || 78, tier: s.tier || 0, perks: s.perks || [], cap: s.cap || 28, used: s.used || 0, shields: s.shields || 0, bombs: s.bombs || 0, phase: ph, gone: ph === 'gone' };
  }
  // 서버에 올릴 스냅샷 (stateOf 와 같은 모양)
  function snapOf(g) { const st = stateOf({ game: g }); return { cash: st.cash, rep: st.rep, repCap: st.repCap, day: st.day, days: st.days, used: st.used, cap: st.cap, shields: st.shields, bombs: st.bombs, phase: st.phase, tier: st.tier, perks: st.perks }; }
  // 먼저 마감한 사람이 나오면 그 순간 남들의 일차를 적어 둔다 — 남은 날 ÷ latePenaltyDiv 만큼 평판 페널티(1등 제외). 승부는 평판
  function noteFinish(match) {
    if (match.firstFinish) return;
    const w = match.players.find(p => stateOf(p).win); if (!w) return;
    const days = {}; for (const p of match.players) if (p.id !== w.id) days[p.id] = stateOf(p).day;
    match.firstFinish = { id: w.id, days, at: Date.now() };
  }
  function penaltyOf(match, p, st) {
    const ff = match.firstFinish; if (!ff || ff.id === p.id || ff.days[p.id] == null) return 0;
    const div = (p.game && p.game.rules.latePenaltyDiv) || M.MULTI.mods.latePenaltyDiv || 3;
    return Math.max(0, Math.ceil((st.days - ff.days[p.id]) / div));
  }
  function standings(match) {
    const rows = match.players.map(p => { const st = stateOf(p); const pen = penaltyOf(match, p, st); return Object.assign({ p, name: p.name, human: p.human, usage: 0, penalty: pen, repFinal: Math.max(0, st.rep - pen) }, st); });
    // 순위: 생존 > 최종 평판(페널티 뒤) > 잔액 · 폐업자끼리는 늦게 죽은 순
    rows.sort((a, b) => (b.alive - a.alive) || (a.alive ? (b.repFinal - a.repFinal) || (b.cash - a.cash) : (b.day - a.day) || (b.cash - a.cash)));
    rows.forEach((r, i) => r.rank = i + 1);
    return rows;
  }
  function toJSON(match) { return { v: match.v, seed: match.seed, started: match.started, rng: match.rng, cycleDrops: match.cycleDrops || 0, firstFinish: match.firstFinish || null, online: match.online || null, players: match.players.map(p => ({ id: p.id, name: p.name, human: p.human, remote: !!p.remote, bot: !!p.bot, face: p.face, strat: p.strat, speed: p.speed, snap: p.snap || null, game: p.game ? p.game.toJSON() : null })) }; }
  function fromJSON(o) { return { v: o.v, seed: o.seed, started: o.started, rng: o.rng || hash('route' + o.seed), cycleDrops: o.cycleDrops || 0, firstFinish: o.firstFinish || null, news: [], online: o.online ? Object.assign({ pending: [], results: {}, settled: null }, o.online) : null, players: o.players.map((p, i) => ({ face: FACES[i % FACES.length], ...p, game: p.game ? Game.fromJSON(p.game) : null })) }; }

  const MULTI = { SCENARIO, FACES, replay, fingerprint, verify, noteFinish, penaltyOf, stateOf, snapOf, newOnline, owned, applyServer, outgoing, newMatch, tick, route, cycleDrop, takeNews, finishAll, allDone, standings, botDay, dayOf, totalDays, toJSON, fromJSON };
  if (typeof module !== 'undefined') module.exports = MULTI; else root.MULTI = MULTI;
})(typeof window !== 'undefined' ? window : globalThis);
