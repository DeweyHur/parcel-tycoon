// 규칙 단위 테스트: node test/unit.js
const assert = require('assert');
const { Game, DATA: D, META: M, dailyConfig } = require('../www/js/game.js');
const NG = (seed, extra) => new Game(Object.assign({ seed, perks: ['skip', 'insure'] }, extra || {}));
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };

t('시작 상태', () => { const g = NG(1); assert.equal(g.cash, 600); assert.equal(g.contracts.length, 4); assert.equal(g.contracts.filter(Boolean).length, 3); assert.equal(g.phase, 'play'); assert.equal(g.month, 1); });
t('퍽 규칙 병합', () => { const g = NG(1, { perks: ['longdeal', 'compact'] }); assert.equal(g.rules.contractPriceMult, 0.9); assert.equal(g.rules.sizeDelta, -1); });
t('월 입고량 = 10 + 추가', () => { for (let s = 1; s < 20; s++) { const g = NG(s); const total = g.schedule.reduce((a, b) => a + b.length, 0); assert.equal(total, 12); } });
t('대기는 호출 횟수를 차감하지 않음', () => { const g = NG(3); const calls = g.contracts.map(c => c && c.calls); g.wait(); assert.deepEqual(g.contracts.map(c => c && c.calls), calls); assert.equal(g.turn, 2); });
t('호출은 택배 수와 무관하게 1회 차감 + 수익', () => {
  for (let s = 1; s < 50; s++) { const g = NG(s);
    for (let i = 0; i < 6 && g.phase === 'play'; i++) g.wait();
    const idx = g.contracts.findIndex(c => c && c.carrier === 'bulk'); const c = g.contracts[idx];
    if (!g.canCall(c)) continue;
    const elig = g.eligibleParcels(c), cap = g.callCapacity(c), before = g.cash, calls = c.calls;
    const r = g.callCarrier(idx, elig.slice(0, cap).map(p => p.id));
    assert.ok(r.ok); assert.equal(c.calls, calls - 1); assert.equal(g.cash, before + r.revenue); assert.ok(r.revenue >= 40 * r.count); return; }
});
t('처리량 초과 선택 거부', () => { const g = NG(5); for (let i = 0; i < 8 && g.phase === 'play'; i++) g.wait(); const idx = g.contracts.findIndex(c => c && c.carrier === 'target'); const c = g.contracts[idx]; if (!c) return; const cap = g.callCapacity(c), elig = g.eligibleParcels(c); if (elig.length > cap) { const r = g.callCarrier(idx, elig.slice(0, cap + 1).map(p => p.id)); assert.ok(!r.ok); } });
t('스킵 보너스: 대기 후 처리량 +1 (동네 단골 +1 포함)', () => { const g = NG(7); const c = g.contracts[2]; assert.equal(g.callCapacity(c), 5); g.wait(); assert.equal(g.callCapacity(c), 6); const h = new Game({ seed: 7, company: 'postal', perks: ['skip'] }); const b = h.contracts[0]; assert.equal(h.callCapacity(b), 5); h.wait(); assert.equal(h.callCapacity(b), 6); });
t('보상 공식 25 + 크기×15', () => { const g = NG(2); for (const p of g.parcels) assert.equal(p.reward, 25 + p.baseSize * 15); });
t('공간 최적화: 크기 -1 (최소 1)', () => { const g = NG(2, { perks: ['compact', 'insure'] }); for (const p of g.parcels) assert.equal(p.size, Math.max(1, p.baseSize - 1)); });
t('창고 초과 페널티 단계', () => { const g = NG(11); g.warehouse.cap = 0; const s0 = g.stress; g.wait(); assert.ok(g.stress > s0); });
t('신선: 냉장 안이면 기한만 진행, 밖이면 1턴 뒤 폐기(+2)', () => {
  const g = NG(4, { perks: ['skip', 'longdeal'] });
  g.parcels = []; g.schedule = g.schedule.map(() => []); g.warehouse.cold = 2;
  g.parcels.push({ id: 900, type: 'fresh', size: 2, baseSize: 2, reward: 55, deadline: 3, overdue: false, age: 0, warm: 0, customs: 0 });
  g.parcels.push({ id: 901, type: 'fresh', size: 2, baseSize: 2, reward: 55, deadline: 3, overdue: false, age: 0, warm: 0, customs: 0 });
  g._assignCold(); assert.ok(g.parcels[0].inCold && !g.parcels[1].inCold);
  const s0 = g.stress; g.wait();
  assert.equal(g.parcels.length, 1); assert.equal(g.parcels[0].id, 900); assert.equal(g.parcels[0].deadline, 2); assert.equal(g.stress, s0 + 2); assert.equal(g.stats.discarded, 1);
  g.wait(); g.wait(); assert.ok(g.parcels[0].overdue); g.wait(); assert.equal(g.parcels.length, 0); assert.equal(g.stats.returned, 1); // 신선 반송 유예 1턴
});
t('통관: 대기 중 기한 정지·일반 업체 불가, 통관 대행은 가능', () => {
  const g = NG(4, { perks: ['skip', 'longdeal'] }); g.warehouse.cap = 99;
  g.parcels = []; g.schedule = g.schedule.map(() => []);
  const p = g._spawnParcel({ type: 'intl', size: 4 }); g.parcels.push(p); g._assignCold();
  assert.ok(p.customs >= 2); const target = g.contracts.find(c => c && c.carrier === 'target');
  assert.ok(!g.canHandle(target, p)); g.contracts[3] = g._makeContract('intl', 'normal'); assert.ok(g.canHandle(g.contracts[3], p));
  const d = p.deadline; g.wait(); assert.equal(p.deadline, d); assert.equal(p.customs, p.customsDelayed ? 2 : 1);
  g.wait(); if (p.customsDelayed) g.wait(); assert.equal(p.customs, 0); assert.ok(g.canHandle(target, p)); g.wait(); assert.equal(p.deadline, d - 1);
});
t('냉동: 냉동 구역 없으면 즉시 폐기, 냉동 물류만 처리', () => {
  const g = NG(4, { perks: ['skip', 'longdeal'] }); g.warehouse.frozen = 2; g.parcels = [];
  g.schedule = g.schedule.map(() => []); g.schedule[g.turn] = [{ type: 'frozen', size: 2 }, { type: 'frozen', size: 2 }];
  const s0 = g.stress; g.wait();
  assert.equal(g.parcels.filter(p => p.type === 'frozen').length, 1); assert.equal(g.stress, s0 + 2);
  const p = g.parcels.find(p => p.type === 'frozen'); assert.ok(!g.canHandle(g.contracts.find(c => c && c.carrier === 'target'), p));
  g.contracts[3] = g._makeContract('frozen', 'normal'); assert.ok(g.canHandle(g.contracts[3], p));
});
t('파손: ⚠ 능력 없는 업체는 25% 파손, 프래자일·특약은 0%', () => {
  const g = NG(4); const target = g.contracts.find(c => c && c.carrier === 'target');
  const p = { id: 1, type: 'fragile', size: 2, attrs: ['fragile'] };
  assert.equal(g.breakProb(target, p), 0.25); g.contracts[3] = g._makeContract('fragile', 'normal'); assert.equal(g.breakProb(g.contracts[3], p), 0);
  target.enh.opt = 'optFragile'; assert.equal(g.breakProb(target, p), 0);
  let broken = 0, n = 0; for (let s = 1; s <= 60; s++) { const h = NG(s); h.warehouse.cap = 99; h.parcels = [{ id: 5, type: 'fragile', size: 2, baseSize: 2, reward: 55, deadline: 7, overdue: false, attrs: ['fragile'], age: 0, warm: 0, customs: 0 }]; h.schedule = h.schedule.map(() => []); const t = h.contracts.findIndex(c => c && c.carrier === 'target'); const r = h.callCarrier(t, [5]); assert.ok(r.ok); broken += r.broken; n++; }
  assert.ok(broken > 3 && broken < 35, `broken ${broken}/${n}`);
});
t('지연 입금: 철도는 다음 턴에 입금', () => {
  const g = NG(4); g.warehouse.cap = 99; g.parcels = [{ id: 5, type: 'normal', size: 1, baseSize: 1, reward: 40, deadline: 6, overdue: false, attrs: [], age: 0, warm: 0, customs: 0 }]; g.schedule = g.schedule.map(() => []);
  g.contracts[3] = g._makeContract('rail', 'normal'); const cash = g.cash; const r = g.callCarrier(3, [5]);
  assert.ok(r.ok && r.delay === 1); assert.equal(g.cash, cash); g.wait(); assert.equal(g.cash, cash + r.revenue);
});
t('월말 정산 → 마켓 → 다음 달', () => {
  const g = NG(9);
  while (g.phase === 'play') g.wait();
  assert.equal(g.phase, 'summary'); g.closeSummary(); assert.equal(g.phase, 'market'); assert.equal(g.market.items.length, 5);
  const before = g.cash; const fac = g.market.items.findIndex(i => i.kind === 'fac' && i.fac); if (fac >= 0) { const r = g.buy(fac, null); assert.ok(r.ok); assert.ok(g.cash < before); }
  g.closeMarket(); assert.equal(g.month, 2); assert.equal(g.turn, 1);
});
t('마켓 구매 3개 제한', () => {
  const g = NG(9); g.cash = 99999;
  while (g.phase === 'play') g.wait(); g.closeSummary();
  let ok = 0; g.market.items.forEach((it, i) => { const r = g.buy(i, 0); if (r.ok) ok++; });
  assert.equal(ok, 3);
});
t('계약 교체 시 잔여 호출 소멸', () => {
  const g = NG(9); g.cash = 9999;
  while (g.phase === 'play') g.wait(); g.closeSummary();
  const i = g.market.items.findIndex(it => it.kind === 'contract'); const it = g.market.items[i];
  g.buy(i, 0); assert.equal(g.contracts[0].carrier, it.carrier); assert.equal(g.contracts[0].calls, g.contracts[0].maxCalls); assert.equal(g.contracts[0].enh.cap, 0);
});
t('저장/불러오기 후 결정적 진행', () => {
  const g = NG(21); g.wait(); g.wait();
  const json = JSON.parse(JSON.stringify(g.toJSON()));
  const h = Game.fromJSON(json);
  while (g.phase === 'play') g.wait(); while (h.phase === 'play') h.wait();
  assert.equal(g.cash, h.cash); assert.equal(g.stress, h.stress); assert.equal(g.parcels.length, h.parcels.length);
  g.closeSummary(); h.closeSummary(); assert.deepEqual(g.market.items.map(i => i.name), h.market.items.map(i => i.name));
});
t('스트레스 20 → 게임오버', () => { const g = NG(1); g.stress = 19; g.warehouse.cap = 1; g.wait(); assert.equal(g.phase, 'over'); assert.ok(g.result && !g.result.win); });
t('회사별 시작 상태', () => {
  for (const id of Object.keys(M.COMPANIES)) { const g = new Game({ seed: 2, company: id }); assert.ok(g.cash > 0, id); assert.ok(g.warehouse.cap >= 16, id); assert.ok(g.contracts.filter(Boolean).length >= 3, id); }
  const q = new Game({ seed: 2, company: 'quick' }); assert.equal(q.contracts[0].maxCalls, 6); assert.equal(q.selfCapacity(), 3);
  const st = new Game({ seed: 2, company: 'steel' }); assert.equal(st.warehouse.cold, 0);
  const th = new Game({ seed: 2, company: 'thrifty' }); th.wait(); th.wait(); assert.equal(th.callCapacity(th.contracts[0]), 4 + 2);
});
t('시나리오 규칙', () => {
  const p = new Game({ seed: 3, scenario: 'peak' }); assert.equal(p.rules.months, 2); assert.ok(p.schedule.reduce((a, b) => a + b.length, 0) >= 18);
  const c = new Game({ seed: 3, scenario: 'cashcrunch' }); assert.equal(c.cash, 300);
  const h = new Game({ seed: 3, scenario: 'heatwave' }); assert.equal(h.heatTurns.length, 3);
  const a = new Game({ seed: 3, scenario: 'audit' }); assert.equal(a.rules.winMaxOverdue, 4); assert.equal(a.rules.deadlineAll, -1);
  const b = new Game({ seed: 3, scenario: 'blackfriday' }); assert.equal(b.rules.months, 1); assert.ok(b.schedule.reduce((x, y) => x + y.length, 0) >= 24);
  const s = new Game({ seed: 3, scenario: 'strike' }); assert.ok(s.strikeCarrier);
  const e = new Game({ seed: 3, scenario: 'endless' }); assert.ok(e.rules.endless);
});
t('데일리 설정은 날짜에 결정적', () => { const a = dailyConfig('2026-09-05'), b = dailyConfig('2026-09-05'); assert.deepEqual(a, b); assert.equal(a.variants.length, 2); assert.notEqual(a.variants[0], a.variants[1]); });
t('통계 추적', () => { const g = NG(4); let n = 0; while (g.phase === 'play' && n < 8) { g.wait(); n++; } assert.equal(g.stats.waits, n); assert.equal(g.stats.maxCallStreak, 0); });
t('자체 배송: 일반 2개 무료 처리, 턴 소모', () => {
  const g = NG(8); g.parcels = []; g.schedule = g.schedule.map(() => []);
  for (let i = 0; i < 3; i++) g.parcels.push({ id: 900 + i, type: 'normal', size: 1, baseSize: 1, reward: 40, deadline: 6, overdue: false, inCold: false, age: 0 });
  const turn = g.turn, cash = g.cash; const r = g.selfDeliver();
  assert.ok(r.ok); assert.equal(r.count, 2); assert.equal(g.turn, turn + 1); assert.equal(g.cash, cash + 56); assert.equal(g.parcels.length, 1); assert.equal(g.stats.selfCalls, 1);
});
t('긴급 특송: 턴 미소모', () => {
  const g = NG(8); g.contracts[3] = g._makeContract('urgent', 'normal');
  g.parcels = []; g.parcels.push({ id: 950, type: 'fresh', size: 2, baseSize: 2, reward: 55, deadline: 3, overdue: false, inCold: true, age: 0, warm: 0, customs: 0 });
  const turn = g.turn; const r = g.callCarrier(3, [950]);
  assert.ok(r.ok && r.instant); assert.equal(g.turn, turn); assert.equal(g.contracts[3].calls, 1); assert.equal(g.parcels.length, 0);
});
t('신뢰도는 업체에 귀속 (계약 교체해도 유지)', () => {
  const g = NG(9); g.trust.cold = 9; assert.equal(g.trustLevel('cold'), 2);
  g.cash = 9999; while (g.phase === 'play') g.wait(); g.closeSummary();
  const i = g.market.items.findIndex(it => it.kind === 'contract'); const it = g.market.items[i];
  g.buy(i, 1); assert.equal(g.trust.cold, 9); if (it.carrier === 'cold') assert.equal(g.trustLevel(g.contracts[1]), 2);
  assert.deepEqual(g.trustNext('cold'), { need: 15, have: 9, effect: '전용 능력' });
});
t('대기 예상치', () => { const g = NG(10); const f = g.forecast(); assert.ok(f.cap === 24 && f.used >= g.usedVolume()); });
t('회사 해금 체인: 1단계는 누적으로 열림', () => {
  const A = M.ACHIEVEMENTS; const prof = { unlocked: { companies: ['local'] } };
  assert.ok(A.rookie.check({}, { runs: 3 }, null, prof)); assert.ok(!A.rookie.check({}, { runs: 2 }, null, prof));
  assert.ok(A.two_clears.check({}, { clears: 2 }, null, prof));
  assert.ok(A.first_clear.reward.includes('company:postal'));
  for (const id in M.COMPANIES) { const c = M.COMPANIES[id]; if (c.unlock) assert.ok(A[c.unlock] && (A[c.unlock].rewardType === 'company' || A[c.unlock].reward.includes('company:' + id)), id); }
  assert.deepEqual(A.big20.prog({ bigDelivered: 7 }), [7, 20]);
});
t('마켓 막힌 속성 보장: 처리 못 하는 특수 택배가 있으면 슬롯 A에 처리 가능한 업체', () => {
  let checked = 0;
  for (let s = 1; s < 40; s++) { const g = NG(s); for (let i = 0; i < 10 && g.phase === 'play'; i++) g.wait(); if (g.phase !== 'summary') continue;
    const blocked = g.blockedTypes(); g.closeSummary(); const it = g.market.items[0];
    if (!blocked.length) { assert.ok(!it.hint); continue; }
    const b = blocked[0]; assert.ok(g._carrierAccepts(D.CARRIERS[it.carrier], { type: b.type, size: b.maxSize }), `seed ${s}: ${it.carrier} vs ${b.type}`); assert.ok(it.hint && !['target', 'urgent'].includes(it.carrier)); checked++; }
  assert.ok(checked > 5);
});
t('신뢰도 단계 문구는 한 곳에서 나온다', () => { assert.equal(D.trustEffectText('cold', 1), '회당 처리량 +1'); assert.equal(D.trustEffectText('cold', 3), '호출 턴에 신선식품 기한 정지'); });
t('반송: 기한 초과 후 유예 3턴 지나면 폐기 + 스트레스 +2', () => {
  const g = NG(4, { perks: ['skip', 'longdeal'] });
  g.parcels = []; g.schedule = g.schedule.map(() => []); g.warehouse.cap = 99;
  g.parcels.push({ id: 900, type: 'normal', size: 1, baseSize: 1, reward: 40, deadline: 1, overdue: false, inCold: false, age: 0 });
  g.wait(); assert.ok(g.parcels[0].overdue); assert.equal(g.returnIn(g.parcels[0]), 3); const s1 = g.stress;
  g.wait(); assert.equal(g.returnIn(g.parcels[0]), 2); g.wait(); assert.equal(g.returnIn(g.parcels[0]), 1);
  g.wait(); assert.equal(g.parcels.length, 0); assert.equal(g.stats.returned, 1); assert.equal(g.stress, s1 + 2);
});
t('도난: 창고 초과분은 최근 입고부터 야외 적재, 확률 판정', () => {
  const g = NG(4, { perks: ['skip', 'longdeal'] });
  g.parcels = []; g.schedule = g.schedule.map(() => []); g.warehouse.cap = 3;
  for (let i = 0; i < 4; i++) g.parcels.push({ id: 900 + i, type: 'normal', size: 2, baseSize: 2, reward: 55, deadline: 6, overdue: false, inCold: false, age: 0 });
  g._assignCold();
  assert.deepEqual(g.parcels.map(p => !!p.outdoor), [false, true, true, true]); // 초과 5 → 최근 3개(6칸)
  assert.equal(g.theftProb(), 0.30); assert.equal(g.outdoorVolume(), 6);
  let stolen = 0; for (let s = 1; s <= 30; s++) { const h = NG(s, { perks: ['skip', 'longdeal'] }); h.parcels = []; h.schedule = h.schedule.map(() => []); h.warehouse.cap = 1; for (let i = 0; i < 4; i++) h.parcels.push({ id: 900 + i, type: 'normal', size: 2, baseSize: 2, reward: 55, deadline: 6, overdue: false, inCold: false, age: 0 }); h._assignCold(); h.wait(); stolen += h.stats.stolen; }
  assert.ok(stolen > 10 && stolen < 110, `stolen ${stolen}`);
  const q = NG(2, { rulesOverride: {} }); assert.equal(q.theftProb(), 0);
});
t('세이브 마이그레이션: v0.3 형식(enh.capDelta·attrs 없음)에서 NaN 없이 복원', () => {
  const g = NG(6); for (let i = 0; i < 3; i++) g.wait();
  const j = JSON.parse(JSON.stringify(g.toJSON()));
  for (const c of j.contracts) if (c) { delete c.enh.capDelta; delete c.enh.opt; }
  for (const p of j.parcels) { delete p.attrs; delete p.warm; delete p.customs; p.fresh = 3; }
  delete j.warehouse.frozen; delete j.totalTurn; delete j.pendingRevenue; delete j.stats.broken;
  const h = Game.fromJSON(j);
  for (const c of h.contracts) if (c) { assert.ok(Number.isFinite(h.callCapacity(c)), 'cap'); assert.ok(Number.isFinite(c.calls) && Number.isFinite(c.maxCalls)); }
  for (const p of h.parcels) assert.ok(Array.isArray(p.attrs));
  assert.equal(h.warehouse.frozen, 2); h.wait(); assert.ok(Number.isFinite(h.stress));
});
console.log(`\n${n} tests passed`);
