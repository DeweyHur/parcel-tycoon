// 규칙 단위 테스트: node test/unit.js  (v1.0 차량·신뢰 특성·긴장감 재설계 기준 — docs/BALANCE_DESIGN.md)
const assert = require('assert');
const { Game, DATA: D, META: M, dailyConfig } = require('../www/js/game.js');
const NG = (seed, extra) => new Game(Object.assign({ seed, perks: ['skip', 'insure'] }, extra || {}));
let n = 0, fails = []; const t = (name, f) => { try { f(); n++; console.log('ok', name); } catch (e) { fails.push(name); console.log('FAIL', name, '—', String(e.message).split('\n')[0].slice(0, 200)); } };
// 빈 창고·빈 입고로 시작하는 실험용 게임
const EMPTY = (seed, extra) => { const g = NG(seed, extra); g.parcels = []; g.schedule = g.schedule.map(() => []); g.warehouse.cap = 99; g.cash = 2000; return g; };
const P = (id, type, size, extra) => Object.assign({ id, type, size, baseSize: size, reward: D.PARCEL_TYPES[type].reward[size], deadline: D.PARCEL_TYPES[type].deadline, overdue: false, attrs: D.PARCEL_TYPES[type].attrs.slice(), age: 0, warm: 0, customs: 0, customer: 'anon', arrivalTurn: 1, inCold: false, inFrozen: false }, extra);
const slot = (g, carrier) => g.contracts.findIndex(c => c && c.carrier === carrier);

t('시작 상태: 자금 450, 계약 3개(대량·냉장·프래자일), 준비 없이 play', () => { const g = NG(1); assert.equal(g.cash, 450); assert.equal(g.contracts.filter(Boolean).length, 3); assert.deepEqual(g.contracts.filter(Boolean).map(c => c.carrier), ['bulk', 'cold', 'fragile']); assert.equal(g.phase, 'play'); assert.equal(g.month, 1); });
t('퍽 규칙 병합', () => { const g = NG(1, { perks: ['longdeal', 'compact'] }); assert.equal(g.rules.contractPriceMult, 0.9); assert.equal(g.rules.sizeDelta, -1); });
t('월 입고량 = 10 + 12 = 22 (1개월차), 소형 위주', () => { let small = 0, all = 0; for (let s = 1; s < 20; s++) { const g = NG(s); const sp = g.schedule.flat(); assert.equal(sp.length, 22); for (const x of sp) { all++; if (x.size <= 2) small++; } } assert.ok(small / all > 0.8, `small ${small}/${all}`); });
t('조커 업체 없음: 용달·긴급 삭제', () => { assert.ok(!D.CARRIERS.target && !D.CARRIERS.urgent); for (const id in M.COMPANIES) for (const c of M.COMPANIES[id].contracts || []) assert.ok(D.CARRIERS[c.carrier], id + ' ' + c.carrier); });
t('대기는 배차를 차감하지 않음', () => { const g = NG(3); const calls = g.contracts.map(c => c && c.calls); g.wait(); assert.deepEqual(g.contracts.map(c => c && c.calls), calls); assert.equal(g.turn, 2); });

t('차량: 부피 합으로 대수 결정, 배차비 즉시 차감, 대수만큼 배차 소모', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  assert.equal(g.vehicleCap(c), 6 + 1); // 탑차 6 + 동네 택배 첫 호출 +1
  g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2)];
  const cash = g.cash, trucks = c.calls, fee = g.truckFee(c); assert.equal(fee, 70);
  const r = g.callCarrier(i, [1, 2, 3]); assert.ok(r.ok, r.msg); assert.equal(r.trucks, 1); assert.equal(r.fee, 70); assert.equal(c.calls, trucks - 1);
  assert.equal(g.cash, cash - 70 + r.revenue); assert.equal(r.revenue, 30 * 3); assert.ok(r.fill >= 0.8);
});
t('차량: 용량을 넘기면 동시 대수 한도(기본 1)에서 거부, 신뢰 1단계 대량은 2대', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2), P(4, 'normal', 2)];
  let r = g.callCarrier(i, [1, 2, 3, 4]); assert.ok(!r.ok); // 8칸 > 7칸, 동시 1대
  g.trust.bulk = 3; assert.equal(g.simulMax(c), 2);
  r = g.callCarrier(i, [1, 2, 3, 4]); assert.ok(r.ok, r.msg); assert.equal(r.trucks, 2); assert.equal(r.fee, 140);
});
t('차량: 배차비가 없으면 호출 불가, 남은 배차보다 많이 못 부름', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i]; g.parcels = [P(1, 'normal', 1)];
  g.cash = 10; let r = g.callCarrier(i, [1]); assert.ok(!r.ok && /배차비/.test(r.msg));
  g.cash = 500; c.calls = 0; r = g.callCarrier(i, [1]); assert.ok(!r.ok);
});
t('신뢰도: 적재 80% 이상이면 +1, 특성은 업체마다 다름(냉장 1단계 용량 +2, 3단계 냉장 구역 +2)', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.parcels = [P(1, 'normal', 1)]; g.callCarrier(i, [1]); assert.equal(g.trust.bulk, 1); // 1/7 → 기본 +1만
  g.parcels = [P(2, 'normal', 2), P(3, 'normal', 2), P(4, 'normal', 2)]; g.callCarrier(i, [2, 3, 4]); assert.equal(g.trust.bulk, 3); // 6/7 ≥ 0.8 → +2
  const cc = g.contracts[slot(g, 'cold')]; const cap0 = g.vehicleCap(cc); g._addTrust('cold', 3); assert.equal(g.vehicleCap(cc), cap0 + 2);
  const cold0 = g.warehouse.cold; g._addTrust('cold', 12); assert.equal(g.trustLevel('cold'), 3); assert.equal(g.warehouse.cold, cold0 + 2);
  assert.equal(D.trustEffectText('cold', 1), '용량 +2칸'); assert.equal(D.trustEffectText('rail', 2), '배차 한도 +1대');
});
t('등급: 프리미엄은 용량 +2·한도 +1·배차비 -15%·신뢰 1단계 즉시, 가격 ×2.2', () => {
  const g = EMPTY(3); const c = g._makeContract('bulk', 'trusted'); g.contracts[3] = c;
  assert.equal(g.trustLevel('bulk'), 1); assert.equal(c.maxCalls, 3 + 1); assert.equal(g.truckFee(c), Math.round(70 * 0.85)); // 프리미엄 -15% (대량 1단계 특성은 동시 2대라 배차비 무관)
  assert.equal(D.GRADES.trusted.price, 2.2); assert.equal(D.GRADES.trusted.name, '프리미엄');
});
t('보상표: 종류·크기별, 특수가 확실히 높다', () => { assert.equal(D.PARCEL_TYPES.normal.reward[2], 30); assert.equal(D.PARCEL_TYPES.fresh.reward[2], 60); assert.equal(D.PARCEL_TYPES.intl.reward[4], 110); const g = NG(2); for (const p of g.parcels) assert.equal(p.reward, g.baseReward(p.type, p.baseSize) * (p.premium ? 1.5 : 1)); });
t('기한: 일반 4·파손 5·통관 5·대형 6·냉동 5, 반송 유예 2', () => { assert.equal(D.PARCEL_TYPES.normal.deadline, 4); assert.equal(D.PARCEL_TYPES.fragile.deadline, 5); assert.equal(D.PARCEL_TYPES.large.deadline, 6); assert.equal(D.RETURN_GRACE, 2);
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.parcels = [P(1, 'normal', 1, { deadline: 1 })]; g.wait(); assert.ok(g.parcels[0].overdue); g.wait(); assert.equal(g.parcels.length, 1); g.wait(); assert.equal(g.parcels.length, 0); assert.equal(g.stats.returned, 1); });
t('고객 품목 해금: 0단계는 일반 85%, 2단계는 고객 정의, 3단계는 프리미엄 품목', () => {
  const g = NG(3); // 동네 택배: 새벽마켓 0단계
  const cnt = (lv) => { g.customers.dawn.xp = M.CUSTOMER_LEVELS[lv]; let n = 0, s = 0, prem = 0; for (let i = 0; i < 400; i++) { const sp = g._genParcelSpec(g._typeRatio(1), 1, { dawn: 1 }); n++; if (sp.type !== 'normal') s++; if (sp.premium) prem++; } return [s / n, prem / n]; };
  const [s0] = cnt(0), [s2] = cnt(2), [s3, p3] = cnt(3);
  assert.equal(s0, 0, 's0 ' + s0); assert.ok(s2 > 0.55, 's2 ' + s2); assert.ok(p3 > 0.1, 'prem ' + p3);
});
t('마켓: 보유 업체는 같은 등급(추가) 또는 높은 등급(업그레이드)만 등장, 같은 슬롯 중복 없음', () => {
  const GR = ['normal', 'trusted', 'expert', 'master'];
  for (let s = 1; s <= 40; s++) { const g = EMPTY(s); while (g.phase === 'play') g.wait(); if (g.phase !== 'summary') continue; g.closeSummary();
    const cs = g.market.items.filter(it => it.kind === 'contract'); assert.equal(new Set(cs.map(it => it.carrier)).size, cs.length);
    for (const it of cs) { const own = g.contracts.find(c => c && c.carrier === it.carrier); if (own) { const d = GR.indexOf(it.grade) - GR.indexOf(own.grade); assert.ok(d >= 0, `seed ${s} ${it.carrier}`); assert.equal(!!it.upgrade, d > 0); assert.equal(!!it.add, d === 0); } } }
});
t('계약 업그레이드: 등급만 오르고 강화·잔여 배차 유지, 배차 추가: 한도·잔여 +n', () => {
  const g = EMPTY(9); while (g.phase === 'play') g.wait(); g.closeSummary(); g.cash = 9999;
  const b = slot(g, 'bulk'), c = g.contracts[b]; c.enh.limit = 1; c.calls = 1; const max0 = c.maxCalls, cash0 = g.cash;
  g.market.items.push({ kind: 'contract', carrier: 'bulk', grade: 'expert', price: 100, name: 'x', sold: false, upgrade: true });
  const i = g.market.items.length - 1;
  assert.equal(g.buy(i, b, 'upgrade').ok, true);
  assert.equal(c.grade, 'expert'); assert.equal(c.enh.limit, 1); assert.equal(c.maxCalls, max0 + 2); assert.equal(c.calls, 3); assert.ok(g.trustXp('bulk') >= 8); assert.ok(g.cash < cash0);
  g.market.items.push({ kind: 'contract', carrier: 'bulk', grade: 'expert', price: 100, name: 'y', sold: false, add: true });
  const j = g.market.items.length - 1, n = g.itemTrucks(g.market.items[j]);
  assert.equal(g.buy(j, b).mode, 'add'); assert.equal(c.maxCalls, max0 + 2 + n); assert.equal(c.calls, 3 + n);
  g.market.items.push({ kind: 'contract', carrier: 'bulk', grade: 'normal', price: 100, name: 'z', sold: false });
  assert.equal(g.buy(g.market.items.length - 1, b, 'upgrade').ok, false);
  const other = g.contracts.findIndex((x, k) => x && k !== b); if (other >= 0) assert.equal(g.buy(g.market.items.length - 1, other, 'add').ok, false);
});
t('공간 최적화: 크기 -1 (최소 1)', () => { const g = NG(2, { perks: ['compact', 'insure'] }); for (const p of g.parcels) assert.equal(p.size, Math.max(1, p.baseSize - 1)); });
t('창고 초과 페널티', () => { const g = NG(11); g.warehouse.cap = 0; const s0 = g.stress; g.wait(); assert.ok(g.stress > s0); });
t('신선: 냉장 안이면 기한만 진행, 밖이면 1턴 뒤 폐기(+2)', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.warehouse.cold = 2;
  g.parcels = [P(900, 'fresh', 2), P(901, 'fresh', 2)]; g._assignCold(); assert.ok(g.parcels[0].inCold && !g.parcels[1].inCold);
  const s0 = g.stress; g.wait(); assert.equal(g.parcels.length, 1); assert.equal(g.parcels[0].deadline, 2); assert.equal(g.stress, s0 + 2); assert.equal(g.stats.discarded, 1);
});
t('통관: 대기 중 기한 정지·일반 업체 불가, 통관 대행은 가능', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] });
  const p = g._spawnParcel({ type: 'intl', size: 4 }); g.parcels.push(p); g._assignCold();
  assert.ok(p.customs >= 2); const bulk = g.contracts[slot(g, 'bulk')];
  assert.ok(!g.canHandle(bulk, p)); g.contracts[3] = g._makeContract('intl', 'normal'); assert.ok(g.canHandle(g.contracts[3], p));
  const d = p.deadline; g.wait(); assert.equal(p.deadline, d);
});
t('통관 대행 신뢰 1단계: 통관 대기 -1', () => { const g = EMPTY(4); g.contracts[3] = g._makeContract('intl', 'normal'); g.trust.intl = 3; g.rules.customsDelayProb = 0; const p = g._spawnParcel({ type: 'intl', size: 4 }); assert.equal(p.customs, 1); });
t('냉동: 냉동 구역 없으면 즉시 폐기, 냉동 물류만 처리, 구역보다 큰 냉동은 오지 않음', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.warehouse.frozen = 2; g.schedule[g.turn] = [{ type: 'frozen', size: 2 }, { type: 'frozen', size: 2 }];
  const s0 = g.stress; g.wait(); assert.equal(g.parcels.filter(p => p.type === 'frozen').length, 1); assert.equal(g.stress, s0 + 2);
  const p = g.parcels.find(p => p.type === 'frozen'); assert.ok(!g.canHandle(g.contracts[slot(g, 'cold')], p)); g.contracts[3] = g._makeContract('frozen', 'normal'); assert.ok(g.canHandle(g.contracts[3], p));
  const h = new Game({ seed: 3, company: 'fresh' }); for (const sp of h.schedule.flat()) if (sp.type === 'frozen') assert.ok(sp.size <= h.warehouse.frozen);
});
t('파손: ⚠ 능력 없는 업체(철도 제외)는 25% 파손, 프래자일·특약은 0%', () => {
  const g = EMPTY(4); const bulk = g.contracts[slot(g, 'bulk')], fr = g.contracts[slot(g, 'fragile')];
  const p = { id: 1, type: 'fragile', size: 2, attrs: ['fragile'] };
  assert.equal(g.breakProb(bulk, p), 0.25); assert.equal(g.breakProb(fr, p), 0); bulk.enh.opt = 'optFragile'; assert.equal(g.breakProb(bulk, p), 0);
});
t('지연 입금: 철도는 다음 턴, 신뢰 1단계면 즉시', () => {
  const g = EMPTY(4); g.contracts[3] = g._makeContract('rail', 'normal'); g.parcels = [P(1, 'normal', 2)];
  const cash = g.cash; const r = g.callCarrier(3, [1]); assert.ok(r.ok, r.msg); assert.equal(r.delay, 1); assert.equal(g.cash, cash - r.fee); g.wait(); assert.equal(g.cash, cash - r.fee + r.revenue);
  g.trust.rail = 3; g.contracts[3].calls = 1; g.parcels = [P(2, 'normal', 2)]; const r2 = g.callCarrier(3, [2]); assert.ok(r2.ok, r2.msg); assert.equal(r2.delay, 0);
});
t('월말 정산 → 마켓 → 다음 달, 배차비는 정산에', () => {
  const g = EMPTY(9); g.parcels = [P(1, 'normal', 1)]; g.callCarrier(slot(g, 'bulk'), [1]); while (g.phase === 'play') g.wait();
  assert.equal(g.phase, 'summary'); assert.equal(g.summary.fees, 70); g.closeSummary(); assert.equal(g.phase, 'market'); g.closeMarket(); assert.equal(g.month, 2);
  for (const c of g.contracts) if (c) assert.equal(c.calls, c.maxCalls);
});
t('마켓 구매 3개 제한', () => { const g = EMPTY(9); while (g.phase === 'play') g.wait(); g.closeSummary(); g.cash = 9999; let bought = 0; for (let i = 0; i < g.market.items.length && bought < 4; i++) { const it = g.market.items[i]; if (it.sold) continue; const r = g.buy(i, it.kind === 'contract' || it.kind === 'enh' ? 0 : null); if (r.ok) bought++; else if (bought >= 3) { assert.ok(/3개|3/.test(r.msg)); break; } } assert.ok(bought <= 3); });
t('계약 교체 시 잔여 배차 소멸, 신뢰도는 업체에 귀속', () => {
  const g = EMPTY(9); g.trust.bulk = 5; while (g.phase === 'play') g.wait(); g.closeSummary(); g.cash = 9999;
  const idx = g.market.items.findIndex(it => it.kind === 'contract' && it.carrier !== 'bulk'); if (idx < 0) return;
  const b = slot(g, 'bulk'); g.buy(idx, b); assert.notEqual(g.contracts[b].carrier, 'bulk'); assert.equal(g.trust.bulk, 5);
});
t('저장/불러오기 후 결정적 진행', () => {
  const a = NG(21); for (let i = 0; i < 3 && a.phase === 'play'; i++) a.wait(); const json = JSON.stringify(a.toJSON()); const b = Game.fromJSON(JSON.parse(json));
  for (let i = 0; i < 4; i++) { if (a.phase === 'play') a.wait(); if (b.phase === 'play') b.wait(); } a.takeEvents(); b.takeEvents(); assert.equal(JSON.stringify(a.toJSON()), JSON.stringify(b.toJSON()));
});
t('스트레스 한계 → 게임오버', () => { const g = EMPTY(1); g.stress = g.rules.gameoverStress - 1; g.warehouse.cap = 0; g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2)]; g._assignCold(); g.wait(); assert.equal(g.phase, 'over'); });
t('회사별 시작 상태', () => { for (const id in M.COMPANIES) { const g = new Game({ seed: 2, company: id }); assert.ok(g.cash > 0, id); assert.ok(g.contracts.filter(Boolean).length >= 2, id); } const q = new Game({ seed: 2, company: 'quick' }); assert.equal(q.selfCount(), 2); const th = new Game({ seed: 2, company: 'thrifty' }); assert.equal(th.rules.feeMult, 0.8); const po = new Game({ seed: 2, company: 'postal' }); assert.equal(po.truckFee(po.contracts[1]), 70); });
t('시나리오 규칙', () => { const g = new Game({ seed: 1, scenario: 'cashcrunch' }); assert.equal(g.cash, 225); assert.ok(g.rules.noRefresh); const p = new Game({ seed: 1, scenario: 'peak' }); assert.equal(p.rules.months, 2); });
t('데일리 설정은 날짜에 결정적', () => { const a = dailyConfig('2026-09-05'), b = dailyConfig('2026-09-05'); assert.deepEqual(a, b); assert.equal(a.variants.length, 2); });
t('직접 배송: 대기 턴에 1개, 보상 그대로 + 배송비 20c', () => {
  const g = EMPTY(8); for (let i = 0; i < 3; i++) g.parcels.push(P(900 + i, 'normal', 1));
  assert.equal(g.selfCount(), 1); assert.ok(!g.wait([900, 901]).ok);
  const turn = g.turn, cash = g.cash; const r = g.wait([900]); assert.ok(r.ok); assert.equal(g.turn, turn + 1); assert.equal(g.cash, cash + 20 - 20); assert.equal(g.parcels.length, 2); assert.equal(g.stats.selfCalls, 1);
  g.warehouse.driver = true; assert.equal(g.selfCount(), 2);
});
t('마켓 막힌 속성 보장: 처리 못 하는 특수 택배가 있으면 슬롯 A에 처리 가능한 업체', () => {
  let hit = 0; for (let s = 1; s <= 30; s++) { const g = EMPTY(s); g.contracts = [g._makeContract('bulk', 'normal'), null, null, null]; g.parcels = [P(1, 'frozen', 2, { inFrozen: true, deadline: 99 })]; g.warehouse.frozen = 4; g._assignCold();
    while (g.phase === 'play') g.wait(); if (g.phase !== 'summary') continue; g.closeSummary(); const it = g.market.items[0]; if (it.kind === 'contract' && it.hint && D.CARRIERS[it.carrier].caps.includes('frozen')) hit++; }
  assert.ok(hit >= 20, 'hit ' + hit);
});
t('고객: 입고 배정·신뢰 xp·손해배상·거래 중단', () => {
  const g = EMPTY(3, { perks: ['skip', 'longdeal'] }); assert.ok(g.customers.mart && g.customerLevel('mart') === 1);
  g.parcels = [P(5, 'normal', 1, { customer: 'glass' })]; g.callCarrier(slot(g, 'bulk'), [5]); assert.equal(g.customers.glass.xp, 1);
  g.parcels = [P(6, 'fragile', 2, { deadline: 1, customer: 'glass' })]; const cash = g.cash; g.wait(); g.wait(); g.wait();
  assert.equal(g.stats.returned, 1); assert.equal(cash - g.cash, 60 * 2); assert.ok(g.customers.glass.suspended); assert.ok(!('glass' in g._customerWeightsFor(1)));
});
t('고객 규칙: 새벽배송(입고 당 턴 처리 +20)', () => { const g = EMPTY(3); g.parcels = [P(7, 'normal', 1, { customer: 'dawn', arrivalTurn: g.totalTurn })]; const r = g.callCarrier(slot(g, 'bulk'), [7]); assert.equal(r.revenue, 20 + 20); assert.equal(g.customers.dawn.xp, 2); });
t('날씨: 비에 야외 일반 택배 젖음(보상 -20%), 천막 퍽이면 무효', () => {
  for (const tent of [false, true]) { const g = EMPTY(5, { perks: tent ? ['tent'] : ['skip'] }); g.weather = Array(10).fill('rain'); g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2)]; g.warehouse.cap = 2; g._assignCold();
    assert.equal(g.outdoorParcels().length, 1); g.wait(); assert.equal(g.parcels.filter(p => p.wet).length, tent ? 0 : 1);
    if (!tent) { g.warehouse.cap = 99; const wet = g.parcels.find(p => p.wet); const r = g.callCarrier(slot(g, 'bulk'), [wet.id]); assert.equal(r.revenue, Math.round(30 * 0.8)); } }
});
t('날씨: 폭설이면 야외 신선 안 썩고 도난 절반, 태풍 턴 입고는 다음 턴으로', () => {
  const g = EMPTY(5); g.weather = Array(10).fill('snow'); g.parcels = [P(1, 'fresh', 2, { deadline: 3 }), P(2, 'fresh', 2, { deadline: 3 })]; g.warehouse.cap = 2; g.warehouse.cold = 2; g._assignCold();
  assert.equal(g.theftProb(), 0.15 * 0.5); g.wait(); for (const p of g.parcels) assert.equal(p.deadline, 3);
  let found = false; for (let seed = 1; seed < 60 && !found; seed++) { const h = new Game({ seed, scenario: 'half' }); const tt = h.weather.indexOf('storm'); if (tt > 0) { found = true; assert.equal(h.schedule[tt].length, 0); } } assert.ok(found);
});
t('보험: 든든화재 50% 보장, 프리미어 반송 스트레스 면제, 마켓에서 갈아타기', () => {
  const g = EMPTY(3, { insurer: 'sturdy', perks: ['skip', 'longdeal'] }); assert.equal(g.premium(), 60); g.parcels = [P(6, 'fragile', 2, { deadline: 1, customer: 'glass' })]; const cash = g.cash; g.wait(); g.wait(); g.wait();
  assert.equal(cash - g.cash, 60); assert.equal(g.monthStats.insClaims, 1);
  const h = EMPTY(3, { insurer: 'premier', perks: ['skip', 'longdeal'] }); h.parcels = [P(6, 'normal', 1, { deadline: 1 })]; h.wait(); h.wait(); h.wait(); assert.equal(h.stats.returned, 1); assert.equal(h.stress, 1);
  while (h.phase === 'play') h.wait(); h.closeSummary(); assert.ok(h.setInsurer('coldguard').ok); assert.equal(h.insurer, 'coldguard');
});
t('보관 계약: 수락 → 점유 → 회수 xp +2, 조기 반환 위약금', () => {
  const g = new Game({ seed: 7, company: 'thrifty', perks: [] }); g.schedule = g.schedule.map(() => []); g.parcels = [];
  g.offer = { id: 500, kind: 'move', vol: 8, turns: 2, fee: 80, perTurn: 0, customer: 'mover', expires: 99 };
  const cash = g.cash; assert.ok(g.acceptOffer().ok); assert.equal(g.cash, cash + 80); assert.equal(g.usedVolume(), 8);
  const xp = g.customers.mover.xp; g.wait(); g.wait(); assert.equal(g.storage.length, 0); assert.equal(g.customers.mover.xp, xp + 2);
});
t('적재: 기본은 덜 급한 것부터 야외, 지정 가능', () => { const g = EMPTY(4); g.warehouse.cap = 4; g.parcels = [P(1, 'normal', 2, { deadline: 1 }), P(2, 'normal', 2, { deadline: 5 }), P(3, 'normal', 2, { deadline: 3 })]; g._assignCold(); assert.deepEqual(g.parcels.map(p => !!p.outdoor), [false, true, false]); g.setOutdoor([1]); assert.deepEqual(g.parcels.map(p => !!p.outdoor), [true, false, false]); });
t('난이도: 정규가 기본, 베테랑 운영비 +60·한계 16, 수습 예정 3턴·한계 24', () => { const v = new Game({ seed: 3, difficulty: 'veteran' }); assert.equal(v.rules.gameoverStress, 16); assert.equal(v.rules.feeMult, 1.3); const r = new Game({ seed: 3, difficulty: 'rookie' }); assert.equal(r.rules.upcomingTurns, 3); assert.equal(r.rules.gameoverStress, 24); const d = new Game({ seed: 3, scenario: 'daily', difficulty: 'veteran' }); assert.equal(d.cfg.difficulty, 'normal'); });
t('대형 계약·이사철·준비 마켓', () => { const b = new Game({ seed: 4, scenario: 'bigdeal' }); assert.ok(b.bigCustomer); const m = new Game({ seed: 4, scenario: 'moving' }); assert.ok(m.customers.mover); assert.ok(m.offer); const g = new Game({ seed: 3, prep: true }); assert.equal(g.phase, 'market'); assert.ok(g.market.prep); g.closeMarket(); assert.equal(g.turn, 1); });
t('농산물: 폭염이면 창고 안이라도 기한 -2, 환기 시설·냉장 구역이면 무사', () => {
  const g = EMPTY(4); g.weather = Array(10).fill('heat'); g.warehouse.cold = 0; g.parcels = [P(1, 'produce', 2, { deadline: 4 })]; g._assignCold(); g.wait(); assert.equal(g.parcels[0].deadline, 1);
  const h = EMPTY(4); h.weather = Array(10).fill('heat'); h.parcels = [P(1, 'produce', 2, { deadline: 4 })]; h._assignCold(); assert.ok(h.parcels[0].inCold); h.wait(); assert.equal(h.parcels[0].deadline, 3);
});
// ----- i18n -----
const I18n = require('../www/js/i18n.js');
const KO = require('../www/locales/ko.js'), EN = require('../www/locales/en.js');
t('i18n: ko/en UI 키와 자리표시자가 일치', () => {
  const ph = s => new Set((s.match(/\{(\w+)/g) || []).map(x => x.slice(1)));
  for (const k in KO.ui) { assert.ok(k in EN.ui, 'en 누락: ' + k); for (const x of ph(KO.ui[k])) assert.ok(ph(EN.ui[k]).has(x), `en ${k} 자리표시자 {${x}} 누락`); }
  for (const k in EN.ui) assert.ok(k in KO.ui, 'ko 누락: ' + k);
});
t('i18n: ko/en data·meta 텍스트 필드 모양이 일치', () => {
  const walk = (a, b, p) => { for (const k in a) { assert.ok(k in b, 'en 누락: ' + p + '.' + k); if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) walk(a[k], b[k], p + '.' + k); } for (const k in b) assert.ok(k in a, 'ko 누락: ' + p + '.' + k); };
  walk(KO.data, EN.data, 'data'); walk(KO.meta, EN.meta, 'meta');
});
t('i18n: 자리표시자·복수형·메시지 객체 렌더링', () => {
  assert.equal(I18n.lang, 'ko');
  assert.equal(I18n.t('log.monthStart', { m: 2 }), '── 2개월차 시작 ──');
  assert.equal(I18n.text({ k: 'log.penalty', p: { pen: 2, reasons: [{ k: 'r.overdue', p: { short: '일반' } }, { k: 'r.stolenInsured' }], stress: 5 } }), '페널티 +2: 기한 초과 일반, 도난 (보험 적용) (스트레스 5)');
  assert.equal(I18n.text('옛 세이브 문자열'), '옛 세이브 문자열');
  assert.ok(I18n.setLang('en'));
  assert.equal(I18n.t('fmt.calls', { n: 1 }), '1 call'); assert.equal(I18n.t('fmt.calls', { n: 3 }), '3 calls');
  assert.equal(D.PARCEL_TYPES.fresh.name, 'Fresh Food'); assert.equal(M.COMPANIES.local.name, 'Local Parcel'); assert.equal(D.trustEffectText('cold', 2), 'Fresh/produce deadlines freeze on call turns');
  assert.ok(I18n.setLang('ko')); assert.equal(D.PARCEL_TYPES.fresh.name, '신선식품');
});
console.log(`\n${n} tests passed${fails.length ? `, ${fails.length} FAILED` : ''}`); if (fails.length) process.exit(1);
