// 프로필: 해금 상태 · 도전과제 · 누적 통계 · 기록. Store 어댑터 위에서 동작.
window.Profile = (function () {
  const M = window.META;
  const KEY = 'profile_v1';
  let P = null;

  function emptyStats() {
    return { runs: 0, clears: 0, deliveredByType: { normal: 0, fresh: 0, fragile: 0, intl: 0, large: 0 }, waits: 0, calls: 0, contractsBought: 0, discarded: 0, tidyMonths: 0,
      bigDelivered: 0, bestScore: 0, clearsByCompany: {}, clearsByCompanyStandard: {}, clearsByScenario: {}, dailyStreak: 0, lastDaily: null, dailyDone: {} };
  }
  function fresh() {
    return { version: 1, unlocked: JSON.parse(JSON.stringify(M.DEFAULT_UNLOCK)), achievements: {}, stats: emptyStats(), records: {}, recentRuns: [], createdAt: Date.now() };
  }
  function load() {
    P = Store.get(KEY);
    if (!P) {
      P = fresh();
      // 이전 프로토타입 기록(pt_records_v1) 마이그레이션: 표준 3개월 · 동네 택배로 분류
      let old = null; try { old = JSON.parse(localStorage.getItem('pt_records_v1') || 'null'); } catch (e) { }
      if (old && old.runs) {
        for (const r of old.runs) {
          P.recentRuns.push({ date: r.date, score: r.score, win: r.win, month: r.month, turn: r.turn, cash: r.cash, scenario: 'standard', company: 'local', perks: r.perks || [] });
          P.stats.runs++; if (r.win) { P.stats.clears++; P.stats.clearsByCompany.local = (P.stats.clearsByCompany.local || 0) + 1; P.stats.clearsByScenario.standard = (P.stats.clearsByScenario.standard || 0) + 1; P.stats.clearsByCompanyStandard.local = 1; }
        }
        P.stats.bestScore = old.best || 0;
        if (P.stats.clears > 0) { setRecord('standard', 'local', Math.max(...old.runs.filter(r => r.win).map(r => r.score), 0), 3); }
        P.migratedFrom = 'records_v1';
      }
      save();
      evaluate(null, null); // 마이그레이션된 기록으로 열리는 것이 있으면 반영
    }
    // 새 필드 보정
    P.stats = Object.assign(emptyStats(), P.stats);
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
  function perkSlots() { return P.unlocked.perkSlots || 1; }

  function grant(ach) {
    const rewards = ach.rewardType === 'multi' ? ach.reward : ach.rewardType === 'none' ? [] : [`${ach.rewardType}:${ach.reward}`];
    const out = [];
    for (const r of rewards) {
      const [type, id] = String(r).split(':');
      if (type === 'company' && !P.unlocked.companies.includes(id)) { P.unlocked.companies.push(id); out.push({ type, id, name: M.COMPANIES[id].name }); }
      if (type === 'perk' && !P.unlocked.perks.includes(id)) { P.unlocked.perks.push(id); out.push({ type, id, name: M.PERKS[id].name }); }
      if (type === 'scenario' && !P.unlocked.scenarios.includes(id)) { P.unlocked.scenarios.push(id); out.push({ type, id, name: M.SCENARIOS[id].name }); }
      if (type === 'slot' && (P.unlocked.perkSlots || 1) < +id) { P.unlocked.perkSlots = +id; out.push({ type, id, name: `퍽 슬롯 ${id}개` }); }
    }
    return out;
  }
  // 도전과제 판정. game: 진행 중 런(런 내 판정), result: 런 종료 결과(종료·누적·메타 판정)
  // 반환: [{ id, name, unlocks: [{type,id,name}] }]
  function evaluate(game, result) {
    const got = [];
    const s = game ? game.stats : null, p = P.stats;
    for (const id in M.ACHIEVEMENTS) {
      const a = M.ACHIEVEMENTS[id];
      if (P.achievements[id]) continue;
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
    p.runs++;
    for (const t in s.deliveredByType) p.deliveredByType[t] = (p.deliveredByType[t] || 0) + s.deliveredByType[t];
    p.waits += s.waits; p.calls += s.calls; p.contractsBought += s.contractsBought; p.discarded += s.discarded; p.tidyMonths += s.tidyMonths; p.bigDelivered = (p.bigDelivered || 0) + (s.bigDelivered || 0);
    p.bestScore = Math.max(p.bestScore, result.score);
    if (result.win) {
      p.clears++;
      p.clearsByCompany[result.company] = (p.clearsByCompany[result.company] || 0) + 1;
      p.clearsByScenario[result.scenario] = (p.clearsByScenario[result.scenario] || 0) + 1;
      if (result.scenario === 'standard') p.clearsByCompanyStandard[result.company] = 1;
    }
    setRecord(result.scenario, result.company, result.score, result.monthsDone);
    if (result.scenario === 'daily' && result.date) {
      if (!p.dailyDone[result.date]) {
        p.dailyDone[result.date] = result.win ? result.score : -1;
        if (result.win) {
          const prev = p.lastDaily ? new Date(p.lastDaily) : null, cur = new Date(result.date);
          p.dailyStreak = prev && (cur - prev) / 86400000 <= 1.5 ? p.dailyStreak + 1 : 1;
          p.lastDaily = result.date;
        }
      }
      // 오래된 데일리 기록 정리
      const keys = Object.keys(p.dailyDone).sort(); while (keys.length > 60) delete p.dailyDone[keys.shift()];
    }
    P.recentRuns.unshift({ date: new Date().toISOString().slice(0, 10), score: result.score, win: result.win, month: result.month, turn: result.turn, cash: result.cash, scenario: result.scenario, company: result.company, perks: result.perks, reason: result.reason });
    P.recentRuns = P.recentRuns.slice(0, 20);
    const got = evaluate(game, result);
    save();
    return got;
  }
  function dailyDoneToday(date) { return P.stats.dailyDone[date] != null; }
  function reset() { P = fresh(); save(); }
  return { load, get, save, isUnlocked, perkSlots, evaluate, recordRun, dailyDoneToday, reset, KEY };
})();
