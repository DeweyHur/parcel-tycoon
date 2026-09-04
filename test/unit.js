// 규칙 단위 테스트: node test/unit.js
const assert = require('assert');
const { Game, DATA: D } = require('../www/js/game.js');
let n = 0; const t = (name, f) => { f(); n++; console.log('ok', name); };

t('시작 상태', () => { const g = new Game(1); assert.equal(g.cash, 600); assert.equal(g.contracts.length, 4); assert.equal(g.phase, 'perk'); });
t('Perk 2개 선택 후 1월 1턴 시작', () => { const g = new Game(1); assert.ok(g.choosePerks(['skip', 'insure'])); assert.equal(g.month, 1); assert.equal(g.turn, 1); assert.ok(g.parcels.length >= 1); });
t('Perk 검증', () => { const g = new Game(1); assert.ok(!g.choosePerks(['skip'])); assert.ok(!g.choosePerks(['skip', 'skip'])); });
t('월 입고량 = 10 + 추가', () => { for (let s = 1; s < 20; s++) { const g = new Game(s); g.choosePerks(['skip', 'insure']); const total = g.schedule.reduce((a, b) => a + b.length, 0); assert.equal(total, 12); } });
t('대기는 호출 횟수를 차감하지 않음', () => { const g = new Game(3); g.choosePerks(['skip', 'insure']); const calls = g.contracts.map(c => c.calls); g.wait(); assert.deepEqual(g.contracts.map(c => c.calls), calls); assert.equal(g.turn, 2); });
t('호출은 택배 수와 무관하게 1회 차감 + 수익', () => {
  for (let s = 1; s < 50; s++) { const g = new Game(s); g.choosePerks(['skip', 'insure']);
    for (let i = 0; i < 6 && g.phase === 'play'; i++) g.wait();
    const idx = g.contracts.findIndex(c => c.carrier === 'bulk'); const c = g.contracts[idx];
    if (!g.canCall(c)) continue;
    const elig = g.eligibleParcels(c), cap = g.callCapacity(c), before = g.cash, calls = c.calls;
    const r = g.callCarrier(idx, elig.slice(0, cap).map(p => p.id));
    assert.ok(r.ok); assert.equal(c.calls, calls - 1); assert.equal(g.cash, before + r.revenue); assert.ok(r.revenue >= 40 * r.count); return; }
});
t('처리량 초과 선택 거부', () => { const g = new Game(5); g.choosePerks(['skip', 'insure']); for (let i = 0; i < 8 && g.phase === 'play'; i++) g.wait(); const idx = g.contracts.findIndex(c => c.carrier === 'target'); const elig = g.eligibleParcels(g.contracts[idx]); if (elig.length >= 3) { const r = g.callCarrier(idx, elig.slice(0, 3).map(p => p.id)); assert.ok(!r.ok); } });
t('스킵 보너스: 대기 후 처리량 +1', () => { const g = new Game(7); g.choosePerks(['skip', 'insure']); const c = g.contracts[3]; assert.equal(g.callCapacity(c), 4); g.wait(); assert.equal(g.callCapacity(c), 5); });
t('보상 공식 25 + 크기×15', () => { const g = new Game(2); g.choosePerks(['skip', 'insure']); for (const p of g.parcels) assert.equal(p.reward, 25 + p.baseSize * 15); });
t('공간 최적화: 크기 -1 (최소 1)', () => { const g = new Game(2); g.choosePerks(['compact', 'insure']); for (const p of g.parcels) assert.equal(p.size, Math.max(1, p.baseSize - 1)); });
t('창고 초과 페널티 단계', () => { const g = new Game(11); g.choosePerks(['skip', 'insure']); g.warehouse.cap = 0; const s0 = g.stress; g.wait(); assert.ok(g.stress > s0); });
t('신선식품 부패 → 폐기 + 페널티', () => {
  const g = new Game(4); g.choosePerks(['skip', 'longdeal']);
  g.parcels = []; g.schedule = g.schedule.map(() => []);
  g.parcels.push({ id: 900, type: 'fresh', size: 2, baseSize: 2, reward: 55, deadline: 3, overdue: false, inCold: true, age: 0, fresh: 3 });
  g._assignCold();
  g.wait(); g.wait(); g.wait(); // fresh 0 → 50% 상태
  assert.equal(g.parcels[0].fresh, 0);
  g.wait(); // 폐기
  assert.equal(g.parcels.length, 0); assert.ok(g.stress >= 3 + 1);
});
t('월말 정산 → 마켓 → 다음 달', () => {
  const g = new Game(9); g.choosePerks(['skip', 'insure']);
  while (g.phase === 'play') g.wait();
  assert.equal(g.phase, 'summary'); g.closeSummary(); assert.equal(g.phase, 'market'); assert.equal(g.market.items.length, 5);
  const before = g.cash; const fac = g.market.items.findIndex(i => i.kind === 'fac' && i.fac); if (fac >= 0) { const r = g.buy(fac, null); assert.ok(r.ok); assert.ok(g.cash < before); }
  g.closeMarket(); assert.equal(g.month, 2); assert.equal(g.turn, 1);
});
t('마켓 구매 3개 제한', () => {
  const g = new Game(9); g.choosePerks(['skip', 'insure']); g.cash = 99999;
  while (g.phase === 'play') g.wait(); g.closeSummary();
  let ok = 0; g.market.items.forEach((it, i) => { const r = g.buy(i, 0); if (r.ok) ok++; });
  assert.equal(ok, 3);
});
t('계약 교체 시 잔여 호출 소멸', () => {
  const g = new Game(9); g.choosePerks(['skip', 'insure']); g.cash = 9999;
  while (g.phase === 'play') g.wait(); g.closeSummary();
  const i = g.market.items.findIndex(it => it.kind === 'contract'); const it = g.market.items[i];
  g.buy(i, 0); assert.equal(g.contracts[0].carrier, it.carrier); assert.equal(g.contracts[0].calls, g.contracts[0].maxCalls); assert.equal(g.contracts[0].trust, 0);
});
t('저장/불러오기 후 결정적 진행', () => {
  const g = new Game(21); g.choosePerks(['skip', 'insure']); g.wait(); g.wait();
  const json = JSON.parse(JSON.stringify(g.toJSON()));
  const h = Game.fromJSON(json);
  while (g.phase === 'play') g.wait(); while (h.phase === 'play') h.wait();
  assert.equal(g.cash, h.cash); assert.equal(g.stress, h.stress); assert.equal(g.parcels.length, h.parcels.length);
  g.closeSummary(); h.closeSummary(); assert.deepEqual(g.market.items.map(i => i.name), h.market.items.map(i => i.name));
});
t('스트레스 20 → 게임오버', () => { const g = new Game(1); g.choosePerks(['skip', 'insure']); g.stress = 19; g.warehouse.cap = 1; g.wait(); assert.equal(g.phase, 'over'); assert.ok(g.result && !g.result.win); });
console.log(`\n${n} tests passed`);
