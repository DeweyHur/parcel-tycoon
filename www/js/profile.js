// 프로필: 해금 상태 · 도전과제 · 누적 통계 · 기록. Store 어댑터 위에서 동작.
window.Profile = (function () {
  const M = window.META;
  const KEY = 'profile_v1';
  let P = null;

  function emptyStats() {
    return { runs: 0, clears: 0, deliveredByType: { normal: 0, fresh: 0, fragile: 0, intl: 0, large: 0 }, waits: 0, calls: 0, contractsBought: 0, discarded: 0, tidyMonths: 0,
      bigDelivered: 0, bestScore: 0, clearsByCompany: {}, clearsByScenario: {} };
  }
  function fresh() {
    return { version: 1, license: { full: false, source: 'demo' }, splashSeen: 0, campaign: { level: 1, cleared: 0, name: '' }, chain: {}, unlocked: JSON.parse(JSON.stringify(M.DEFAULT_UNLOCK)), achievements: {}, stats: emptyStats(), records: {}, recentRuns: [], createdAt: Date.now() };
  }
  function load() {
    P = Store.get(KEY);
    if (!P) {
      P = fresh();
      // 이전 프로토타입 기록(pt_records_v1) 마이그레이션: 표준 3개월 · 동네 택배로 분류
      let old = null; try { old = JSON.parse(localStorage.getItem('pt_records_v1') || 'null'); } catch (e) { }
      if (old && old.runs) {
        for (const r of old.runs) {
          P.recentRuns.push({ date: r.date, score: r.score, win: r.win, month: r.month, turn: r.turn, cash: r.cash, scenario: M.DEFAULT_SCENARIO, company: 'local', perks: r.perks || [] });
          P.stats.runs++; if (r.win) { P.stats.clears++; P.stats.clearsByCompany.local = (P.stats.clearsByCompany.local || 0) + 1; P.stats.clearsByScenario[M.DEFAULT_SCENARIO] = (P.stats.clearsByScenario[M.DEFAULT_SCENARIO] || 0) + 1; }
        }
        P.stats.bestScore = old.best || 0;
        if (P.stats.clears > 0) { setRecord(M.DEFAULT_SCENARIO, 'local', Math.max(...old.runs.filter(r => r.win).map(r => r.score), 0), 3); }
        P.migratedFrom = 'records_v1';
      }
      save();
      evaluate(null, null); // 마이그레이션된 기록으로 열리는 것이 있으면 반영
    }
    // 새 필드 보정
    P.stats = Object.assign(emptyStats(), P.stats);
    P.license = Object.assign({ full: false, source: 'demo' }, P.license);
    if (typeof P.splashSeen !== 'number') P.splashSeen = 0;   // 스플래시 본 횟수 (2회차부터 짧게)
    P.campaign = Object.assign({ level: 1, cleared: 0, name: '' }, P.campaign);   // 캠페인 레벨 진행 (levels.js)
    if (!P.chain || typeof P.chain !== 'object') P.chain = {};   // 계절 이어하기: 런 id → 그 런의 시작 판 (meta.js chainFrom)
    P.unlocked = Object.assign(JSON.parse(JSON.stringify(M.DEFAULT_UNLOCK)), P.unlocked);
    for (const k of ['companies', 'perks', 'scenarios']) for (const d of M.DEFAULT_UNLOCK[k]) if (!P.unlocked[k].includes(d)) P.unlocked[k].push(d);
    evaluate(null, null); // 해금 조건이 바뀐 경우(누적·메타) 기존 기록으로 즉시 반영
    return P;
  }
  function save() { Store.set(KEY, P); }
  function get() { return P || load(); }
  function setRecord(scenario, company, score, months) {
    const r = ((P.records[scenario] = P.records[scenario] || {})[company] = P.records[scenario][company] || { bestScore: 0, bestMonth: 0 });
    r.bestScore = Math.max(r.bestScore, score); r.bestMonth = Math.max(r.bestMonth, months);
  }
  function isUnlocked(kind, id) { return P.unlocked[kind].includes(id); }
  // 본편 접근권. 데모 빌드에서만 의미가 있다(BUILD.demo). 도전과제 해금과는 별개의 한 겹.
  function hasFull() { return !!(P && P.license && P.license.full); }
  function setFull(source) { P.license = { full: true, source: source || 'unknown', at: Date.now() }; save(); return P.license; }
  // 프로필 이동(데모 → 본편, 모바일 → Steam): 코드 문자열로 내보내고 합친다
  function exportCode() {
    const payload = { v: 1, license: P.license, campaign: P.campaign, chain: P.chain, unlocked: P.unlocked, achievements: P.achievements, stats: P.stats, records: P.records, recentRuns: P.recentRuns.slice(0, 20) };
    const json = JSON.stringify(payload);
    const b64 = typeof btoa !== 'undefined' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, 'utf8').toString('base64');
    return b64.replace(/=+$/, '');
  }
  function importCode(code) {
    let o; try {
      const b64 = String(code).replace(/\s+/g, '');
      const json = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString('utf8');
      o = JSON.parse(json);
    } catch (e) { return { ok: false, reason: 'parse' }; }
    if (!o || o.v !== 1 || !o.unlocked) return { ok: false, reason: 'shape' };
    let added = 0;
    for (const k of ['companies', 'perks', 'scenarios']) for (const id of o.unlocked[k] || []) if (!P.unlocked[k].includes(id)) { P.unlocked[k].push(id); added++; }
    P.unlocked.perkSlots = Math.max(P.unlocked.perkSlots || 1, o.unlocked.perkSlots || 1);
    for (const id in o.achievements || {}) if (!P.achievements[id]) { P.achievements[id] = o.achievements[id]; added++; }
    for (const k in o.stats || {}) {
      const a = P.stats[k], b = o.stats[k];
      if (typeof a === 'number' && typeof b === 'number') P.stats[k] = Math.max(a, b);
      else if (a && b && typeof a === 'object' && typeof b === 'object') for (const kk in b) if (typeof b[kk] === 'number') a[kk] = Math.max(a[kk] || 0, b[kk]);
    }
    for (const sc in o.records || {}) for (const co in o.records[sc]) setRecord(sc, co, o.records[sc][co].bestScore || 0, o.records[sc][co].bestMonth || 0);
    // 캠페인·계절 진행: 이쪽이 더 앞서 있으면 그대로 둔다 (데모에서 여름까지 한 판이 본편에서 가을로 이어지게)
    if (o.campaign && (o.campaign.cleared || 0) > (P.campaign.cleared || 0)) { P.campaign = Object.assign({}, P.campaign, o.campaign); added++; }
    for (const id in o.chain || {}) if (!P.chain[id]) { P.chain[id] = o.chain[id]; added++; }
    // 접근권은 내려가지 않는다(본편 빌드에서 데모 코드를 넣어도 유지)
    if (o.license && o.license.full && !hasFull()) P.license = Object.assign({}, o.license, { imported: true });
    save(); evaluate(null, null); save();
    return { ok: true, added };
  }
  // 계절 런의 시작 판. 봄(캠페인)을 끝낸 창고가 여름으로, 여름을 넘긴 창고가 가을로 — 없으면 null(기본 창고로 시작).
  // 몇 번을 다시 해도 같은 시작 판에서 출발한다. 앞 계절을 다시 넘기면 그 판으로 바뀐다.
  function chainStart(id) {
    const sc = M.SCENARIOS[id]; if (!sc || !sc.chainFrom) return null;
    let c = null;
    if (sc.chainFrom === 'campaign') {
      const LV = typeof window !== 'undefined' && window.LEVELS, cp = P.campaign || {};
      if (LV && (cp.cleared || 0) >= LV.LAST) c = (cp.carryAt && cp.carryAt[LV.LAST + 1]) || null;   // 5장을 끝낸 판만 — 중간 장의 판(carry)은 여름이 아니다
    } else c = P.chain[id] || null;
    return c ? JSON.parse(JSON.stringify(c)) : null;
  }
  function perkSlots() { return P.unlocked.perkSlots || 1; }

  function grant(ach) {
    const rewards = ach.rewardType === 'multi' ? ach.reward : ach.rewardType === 'none' ? [] : [`${ach.rewardType}:${ach.reward}`];
    const out = [];
    for (const r of rewards) {
      const [type, id] = String(r).split(':');
      if (type === 'company' && !P.unlocked.companies.includes(id)) { P.unlocked.companies.push(id); out.push({ type, id, name: M.COMPANIES[id].name }); }
      if (type === 'perk' && !P.unlocked.perks.includes(id)) { P.unlocked.perks.push(id); out.push({ type, id, name: M.PERKS[id].name }); }
      if (type === 'scenario' && !P.unlocked.scenarios.includes(id)) { P.unlocked.scenarios.push(id); out.push({ type, id, name: M.SCENARIOS[id].name }); }
      if (type === 'slot' && (P.unlocked.perkSlots || 1) < +id) { P.unlocked.perkSlots = +id; out.push({ type, id, name: window.I18n.t('codex.slotReward', { n: id }) }); }
    }
    return out;
  }
  // 도전과제 판정. game: 진행 중 런(런 내 판정), result: 런 종료 결과(종료·누적·메타 판정)
  // 반환: [{ id, name, unlocks: [{type,id,name}] }]
  function evaluate(game, result) {
    const got = [];
    const s = game ? game.stats : null, p = P.stats;
    const campaign = !!(game && game.cfg && game.cfg.level);   // 캠페인(장) 런은 해금 도전과제를 내지 않는다 — 판이 대본이라 누구나 같은 조건이다
    for (const id in M.ACHIEVEMENTS) {
      const a = M.ACHIEVEMENTS[id];
      if (P.achievements[id]) continue;
      if (campaign && a.rewardType !== 'none') continue;
      let ok = false;
      try {
        if (a.kind === 'run' && s) ok = !!a.check(s, p, result, P);
        else if (a.kind === 'end' && s && result) ok = (!a.needWin || result.win) && !!a.check(s, p, result, P);
        else if (a.kind === 'cum' && (result || !game)) ok = !!a.check(s || {}, p, result, P);
        else if (a.kind === 'meta' && (result || !game)) ok = !!a.check(s || {}, p, result, P);
      } catch (e) { ok = false; }
      if (ok) { P.achievements[id] = { done: true, at: Date.now() }; got.push({ id, name: a.name, unlocks: grant(a) }); }
    }
    // 메타 도전과제는 해금이 연쇄될 수 있으므로 한 번 더
    if (got.length) {
      for (const id in M.ACHIEVEMENTS) { const a = M.ACHIEVEMENTS[id]; if (a.kind === 'meta' && !P.achievements[id]) { let ok = false; try { ok = !!a.check(s || {}, p, result, P); } catch (e) { } if (ok) { P.achievements[id] = { done: true, at: Date.now() }; got.push({ id, name: a.name, unlocks: grant(a) }); } } }
      save();
    }
    return got;
  }
  // 런 종료: 누적 통계 반영 → 도전과제 판정 → 기록
  function recordRun(game, result) {
    const s = game.stats, p = P.stats;
    const campaign = !!result.level;
    p.runs++;
    p.storageDone = (p.storageDone || 0) + (s.storageDone || 0);
    for (const t in s.deliveredByType) p.deliveredByType[t] = (p.deliveredByType[t] || 0) + s.deliveredByType[t];
    p.waits += s.waits; p.calls += s.calls; p.contractsBought += s.contractsBought; p.discarded += s.discarded; p.tidyMonths += s.tidyMonths; p.bigDelivered = (p.bigDelivered || 0) + (s.bigDelivered || 0);
    p.bestScore = Math.max(p.bestScore, result.score);
    if (result.win && !campaign) {
      p.clears++;
      p.clearsByCompany[result.company] = (p.clearsByCompany[result.company] || 0) + 1;
      p.clearsByScenario[result.scenario] = (p.clearsByScenario[result.scenario] || 0) + 1;
      // 계절을 넘겼으면 이 창고가 다음 계절의 시작 판이 된다
      const sc = M.SCENARIOS[result.scenario];
      if (sc && sc.chainNext && result.carry) P.chain[sc.chainNext] = result.carry;
    }
    setRecord(result.scenario, result.company, result.score, result.monthsDone);
    P.recentRuns.unshift({ date: new Date().toISOString().slice(0, 10), score: result.score, win: result.win, demo: !!result.demo, month: result.month, turn: result.turn, cash: result.cash, scenario: result.scenario, company: result.company, level: result.level || 0, perks: result.perks, reason: result.reason });
    P.recentRuns = P.recentRuns.slice(0, 20);
    const got = evaluate(game, result);
    save();
    return got;
  }
  function reset() { P = fresh(); save(); }
  return { load, get, save, chainStart, isUnlocked, perkSlots, evaluate, recordRun, reset, hasFull, setFull, exportCode, importCode, KEY };
})();
