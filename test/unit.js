// 규칙 단위 테스트: node test/unit.js  (v1.0 차량·신뢰 특성·긴장감 재설계 기준 — docs/BALANCE_DESIGN.md)
const assert = require('assert');
const { Game, DATA: D, META: M, dailyConfig } = require('../www/js/game.js');
const NG = (seed, extra) => new Game(Object.assign({ seed, perks: ['skip', 'insure'] }, extra || {}));
let n = 0, fails = []; const t = (name, f) => { try { f(); n++; console.log('ok', name); } catch (e) { fails.push(name); console.log('FAIL', name, '—', String(e.message).split('\n')[0].slice(0, 200)); } };
// 빈 창고·빈 입고로 시작하는 실험용 게임
const EMPTY = (seed, extra) => { const g = NG(seed, extra); g.parcels = []; g.schedule = g.schedule.map(() => []); g.warehouse.cap = 99; g.cash = 2000; return g; };
const P = (id, type, size, extra) => Object.assign({ id, type, size, baseSize: size, reward: D.PARCEL_TYPES[type].reward[size], deadline: D.PARCEL_TYPES[type].deadline, overdue: false, attrs: D.PARCEL_TYPES[type].attrs.slice(), age: 0, warm: 0, customs: 0, customer: 'anon', arrivalTurn: 1, inCold: false, inFrozen: false }, extra);
// 주말은 턴이 아니다 — 한 영업일 진행 = 대기 + (주말이면) 기본 선택(휴식)
const adv = (g, selfIds) => { const r = g.wait(selfIds); if (g.phase === 'weekend') g.weekendChoose('rest'); return r; };
const slot = (g, fam) => g.contracts.findIndex(c => c && D.familyOf(c.carrier) === fam);

t('시작 상태: 자금 450, 계약 3개(대량·냉장·프래자일), 준비 없이 play', () => { const g = NG(1); assert.equal(g.cash, 450); assert.equal(g.contracts.filter(Boolean).length, 3); assert.deepEqual(g.contracts.filter(Boolean).map(c => c.carrier), ['bulk0', 'cold0', 'fragile0']); assert.equal(g.phase, 'play'); assert.equal(g.month, 1); });
t('퍽 규칙 병합', () => { const g = NG(1, { perks: ['longdeal', 'compact'] }); assert.equal(g.rules.contractPriceMult, 0.9); assert.equal(g.rules.sizeDelta, -1); });
t('월 입고량 = 10 + 12×달력 배수 + 고객 단계 추가 (1개월차 3월), 소형 위주', () => { let small = 0, all = 0; for (let s = 1; s < 20; s++) { const g = NG(s); const sp = g.schedule.flat(); assert.equal(sp.length, 10 + Math.round(12 * g.seasonMods(1).arrivalsMult) + g._customerExtra()); for (const x of sp) { all++; if (x.size <= 2) small++; } } assert.ok(small / all > 0.8, `small ${small}/${all}`); });
t('조커 업체 없음: 용달·긴급 삭제', () => { assert.ok(!D.CARRIERS.target && !D.CARRIERS.urgent); for (const id in M.COMPANIES) for (const c of M.COMPANIES[id].contracts || []) assert.ok(D.FAMILIES[c.carrier] || D.CARRIERS[c.carrier], id + ' ' + c.carrier); });
t('대기는 배차를 차감하지 않음', () => { const g = NG(3); const calls = g.contracts.map(c => c && c.calls); adv(g); assert.deepEqual(g.contracts.map(c => c && c.calls), calls); assert.equal(g.turn, 2); });

t('차량: 부피 합으로 대수 결정, 배차비 즉시 차감, 대수만큼 배차 소모', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  assert.equal(g.vehicleCap(c), 6 + 1); // 탑차 6 + 동네 택배 첫 호출 +1
  g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2)];
  const cash = g.cash, trucks = c.calls, fee = g.truckFee(c); assert.equal(fee, 35);
  const r = g.callCarrier(i, [1, 2, 3]); assert.ok(r.ok, r.msg); assert.equal(r.trucks, 1); assert.equal(r.fee, 35); assert.equal(c.calls, trucks - 1);
  assert.equal(g.cash, cash + r.revenue); assert.equal(g.feesDue, 35); assert.equal(r.revenue, 35 * 3); assert.ok(r.fill >= 0.8);
});
t('차량: 용량을 넘기면 동시 대수 한도(기본 1)에서 거부, 신뢰 1단계 대량은 2대', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2), P(4, 'normal', 2)];
  let r = g.callCarrier(i, [1, 2, 3, 4]); assert.ok(!r.ok); // 8칸 > 7칸, 동시 1대
  g.trust.bulk0 = 3; assert.equal(g.simulMax(c), 2);
  r = g.callCarrier(i, [1, 2, 3, 4]); assert.ok(r.ok, r.msg); assert.equal(r.trucks, 2); assert.equal(r.fee, 70);
});
t('차량: 배차비는 후불이라 자금 0이어도 호출 가능, 남은 배차보다 많이 못 부름', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i]; g.parcels = [P(1, 'normal', 1)];
  g.cash = 0; let r = g.callCarrier(i, [1]); assert.ok(r.ok); assert.equal(g.feesDue, 35);
  g.parcels = [P(2, 'normal', 1)]; c.calls = 0; r = g.callCarrier(i, [2]); assert.ok(!r.ok);
});
t('단기 금융: 정산 후 음수면 차입해 0, 다음 정산에 원금+이자 15% 상환, 한도 400 넘으면 부도', () => {
  const g = EMPTY(2, { perks: ['skip', 'longdeal'] }); g.turn = D.TURNS_PER_MONTH; g.cash = 50; g.feesDue = 200; g._endMonth();
  assert.equal(g.phase, 'summary'); assert.equal(g.cash, 0); assert.ok(g.debt > 0); assert.equal(g.summary.loan.borrowed, g.debt); const debt = g.debt;
  g.closeSummary(); g.closeMarket(); g.cash = 2000; g.feesDue = 0; g.turn = D.TURNS_PER_MONTH; g._endMonth();
  assert.equal(g.debt, 0); assert.equal(g.summary.loan.repaid, debt); assert.equal(g.summary.loan.interest, Math.ceil(debt * 0.15));
  g.closeSummary(); g.closeMarket(); g.cash = 0; g.feesDue = 900; g.turn = D.TURNS_PER_MONTH; g._endMonth(); assert.equal(g.phase, 'over');
});
t('신뢰도: 적재 80% 이상이면 +1, 특성은 업체마다 다름(냉장 1단계 용량 +2, 3단계 냉장 구역 +2)', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.parcels = [P(1, 'normal', 1)]; g.callCarrier(i, [1]); assert.equal(g.trust.bulk0, 1); // 1/7 → 기본 +1만
  g.parcels = [P(2, 'normal', 2), P(3, 'normal', 2), P(4, 'normal', 2)]; g.callCarrier(i, [2, 3, 4]); assert.equal(g.trust.bulk0, 3); // 6/7 ≥ 0.8 → +2
  const cc = g.contracts[slot(g, 'cold')]; const cap0 = g.vehicleCap(cc); g._addTrust('cold0', 3); assert.equal(g.vehicleCap(cc), cap0 + 2);
  const cold0 = g.warehouse.cold; g._addTrust('cold0', 12); assert.equal(g.trustLevel('cold0'), 3); assert.equal(g.warehouse.cold, cold0 + 2);
  assert.equal(D.trustEffectText('cold', 1), '용량 +2칸'); assert.equal(D.trustEffectText('rail', 2), '배차 한도 +1대');
});
t('센터: 상위 tier 센터 = 다른 센터와 신규 계약 (배차 +2·용량 +1·배차비 -10%, 신뢰도는 센터별 새로 시작), 복합 능력', () => {
  const g = EMPTY(3); const c = g._makeContract('bulk', 'trusted'); g.contracts[3] = c;
  assert.equal(c.carrier, 'bulk1'); assert.equal(c.grade, 'trusted'); assert.equal(g.trustLevel('bulk1'), 0); assert.equal(c.maxCalls, 7 + 2); assert.equal(g.vehicleCap(c), 6 + 1 + 1); assert.equal(g.truckFee(c), Math.round(35 * 0.9));
  assert.equal(D.CARRIERS.bulk1.name, '빠른손 익스프레스'); assert.equal(D.GRADES.trusted.name, '프리미엄');
  const e = g._makeContract('bulk2'); assert.ok(g.contractCaps(e).includes('fragile')); assert.equal(D.CARRIERS.bulk3.simul, 2); assert.equal(g.simulMax(g._makeContract('bulk3')), 2);
  assert.ok(g.contractCaps(g._makeContract('cold2')).includes('frozen')); assert.equal(D.CARRIERS.rail1.delay, 0);
});
t('운영비 내역: 임대 120 + 계약 10/슬롯 + 시설 유지비', () => { const g = EMPTY(2); const n = g.contracts.filter(Boolean).length; let b = g.opCostBreakdown(1); assert.equal(b.rent, 120); assert.equal(b.contracts, n * 10); assert.equal(b.total, 120 + n * 10 + b.facilities); g.contracts[0].grade = 'expert'; assert.equal(g.opCostBreakdown(1).contracts, (n - 1) * 10 + 60); g.contracts[0].grade = 'normal'; g.warehouse.cold1 = true; assert.equal(g.opCostBreakdown(1).facilities, b.facilities + 15); });
t('보상표: 종류·크기별, 특수가 확실히 높다', () => { assert.equal(D.PARCEL_TYPES.normal.reward[2], 35); assert.equal(D.PARCEL_TYPES.fresh.reward[2], 60); assert.equal(D.PARCEL_TYPES.intl.reward[4], 110); const g = NG(2); for (const p of g.parcels) assert.equal(p.reward, g.baseReward(p.type, p.baseSize) * (p.premium ? 1.5 : 1)); });
t('기한: 일반 4·파손 5·통관 5·대형 6·냉동 5, 반송 유예 2', () => { assert.equal(D.PARCEL_TYPES.normal.deadline, 4); assert.equal(D.PARCEL_TYPES.fragile.deadline, 5); assert.equal(D.PARCEL_TYPES.large.deadline, 6); assert.equal(D.RETURN_GRACE, 2);
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.parcels = [P(1, 'normal', 1, { deadline: 1 })]; adv(g); assert.ok(g.parcels[0].overdue); adv(g); assert.equal(g.parcels.length, 1); adv(g); assert.equal(g.parcels.length, 0); assert.equal(g.stats.returned, 1); });
t('고객 품목 해금: 0단계는 일반 85%, 2단계는 고객 정의, 3단계는 프리미엄 품목', () => {
  const g = NG(3); // 동네 택배: 새벽마켓 0단계
  const cnt = (lv) => { g.customers.dawn.xp = M.CUSTOMER_LEVELS[lv]; let n = 0, s = 0, prem = 0; for (let i = 0; i < 400; i++) { const sp = g._genParcelSpec(g._typeRatio(1), 1, { dawn: 1 }); n++; if (sp.type !== 'normal') s++; if (sp.premium) prem++; } return [s / n, prem / n]; };
  const [s0] = cnt(0), [s2] = cnt(2), [s3, p3] = cnt(3);
  assert.equal(s0, 0, 's0 ' + s0); assert.ok(s2 > 0.55, 's2 ' + s2); assert.ok(p3 > 0.1, 'prem ' + p3);
});
t('마켓: 보유 계열은 더 높은 tier 센터만 등장(갈아타기), 같은 슬롯 중복 없음, 배차 빈 계약마다 충전 카드', () => {
  for (let s = 1; s <= 40; s++) { const g = EMPTY(s); g.contracts[0].calls = 1; while (g.phase === 'play') adv(g); if (g.phase !== 'summary') continue; g.closeSummary();
    const cs = g.market.items.filter(it => it.kind === 'contract'); assert.equal(new Set(cs.map(it => it.carrier)).size, cs.length);
    for (const it of cs) { assert.ok(!it.standing); const own = g.contracts.find(c => c && D.familyOf(c.carrier) === D.familyOf(it.carrier)); if (own) { assert.ok(D.CARRIERS[it.carrier].tier > D.CARRIERS[own.carrier].tier, `seed ${s} ${it.carrier}`); assert.equal(it.switchFrom, own.id); } }
    for (const c of g.contracts) if (c) assert.equal(g.market.items.some(it => it.kind === 'refill' && it.contractId === c.id), c.calls < c.maxCalls, `seed ${s} refill ${c.carrier}`);
  }
});
t('배차 충전: 가득 채우기 정액, 남은 배차는 버려짐, 가득 차 있으면 불가. 월초 리셋 없음', () => {
  const g = EMPTY(9); const b = slot(g, 'bulk'), c = g.contracts[b]; c.calls = 2; while (g.phase === 'play') adv(g); g.closeSummary(); g.cash = 9999;
  const it = g.market.items.find(x => x.kind === 'refill' && x.contractId === c.id); assert.ok(it); assert.equal(it.price, g.refillPrice(c));
  const cash0 = g.cash; const r = g.buy(g.market.items.indexOf(it), null); assert.ok(r.ok); assert.equal(r.wasted, 2); assert.equal(c.calls, c.maxCalls); assert.equal(g.cash, cash0 - it.price);
  assert.ok(!g.refill(c.id).ok); g.closeMarket(); assert.equal(g.month, 2); assert.equal(c.calls, c.maxCalls);
  const h = EMPTY(9); const hc = h.contracts[slot(h, 'bulk')]; hc.calls = 0; while (h.phase === 'play') adv(h); h.closeSummary(); h.closeMarket(); assert.equal(hc.calls, 0);
});
t('계약 교체(갈아타기): 같은 계열 상위 센터로 바꾸면 잔여 배차 소멸, 신뢰도는 센터별', () => {
  const g = EMPTY(9); g.trust.bulk0 = 5; while (g.phase === 'play') adv(g); g.closeSummary(); g.cash = 9999;
  g.market.items.push({ kind: 'contract', carrier: 'bulk1', grade: 'trusted', price: 100, name: 'x', sold: false });
  const b = slot(g, 'bulk'); assert.ok(g.buy(g.market.items.length - 1, b).ok); assert.equal(g.contracts[b].carrier, 'bulk1'); assert.equal(g.trust.bulk0, 5); assert.equal(g.trustLevel('bulk1'), 0);
});
t('공간 최적화: 크기 -1 (최소 1)', () => { const g = NG(2, { perks: ['compact', 'insure'] }); for (const p of g.parcels) assert.equal(p.size, Math.max(1, p.baseSize - 1)); });
t('창고 초과 페널티', () => { const g = NG(11); g.warehouse.cap = 0; for (let i = 0; i < 4; i++) g.parcels.push(P(700 + i, 'normal', 2)); const s0 = g.stress; adv(g); assert.ok(g.stress > s0); });
t('신선: 냉장 안이면 기한만 진행, 밖이면 1턴 뒤 폐기(+2)', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.warehouse.cold = 2;
  g.parcels = [P(900, 'fresh', 2), P(901, 'fresh', 2)]; g._assignCold(); assert.ok(g.parcels[0].inCold && !g.parcels[1].inCold);
  const s0 = g.stress; adv(g); assert.equal(g.parcels.length, 1); assert.equal(g.parcels[0].deadline, 2); assert.equal(g.stress, s0 + 2); assert.equal(g.stats.discarded, 1);
});
t('통관: 대기 중 기한 정지·일반 업체 불가, 통관 대행은 가능', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] });
  const p = g._spawnParcel({ type: 'intl', size: 4 }); g.parcels.push(p); g._assignCold();
  assert.ok(p.customs >= 2); const bulk = g.contracts[slot(g, 'bulk')];
  assert.ok(!g.canHandle(bulk, p)); g.contracts[3] = g._makeContract('intl', 'normal'); assert.ok(g.canHandle(g.contracts[3], p));
  const d = p.deadline; adv(g); assert.equal(p.deadline, d);
});
t('통관 대행 신뢰 1단계: 통관 대기 -1', () => { const g = EMPTY(4); g.contracts[3] = g._makeContract('intl', 'normal'); g.trust.intl0 = 3; g.rules.customsDelayProb = 0; const p = g._spawnParcel({ type: 'intl', size: 4 }); assert.equal(p.customs, 1); });
t('냉동: 냉동 구역 없으면 즉시 폐기, 냉동 물류만 처리, 구역보다 큰 냉동은 오지 않음', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.warehouse.frozen = 2; g.schedule[g.turn] = [{ type: 'frozen', size: 2 }, { type: 'frozen', size: 2 }];
  const s0 = g.stress; adv(g); assert.equal(g.parcels.filter(p => p.type === 'frozen').length, 1); assert.equal(g.stress, s0 + 2);
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
  const cash = g.cash; const r = g.callCarrier(3, [1]); assert.ok(r.ok, r.msg); assert.equal(r.delay, 1); assert.equal(g.cash, cash); assert.equal(g.feesDue, r.fee); adv(g); assert.equal(g.cash, cash + r.revenue);
  g.trust.rail0 = 3; g.contracts[3].calls = 1; g.parcels = [P(2, 'normal', 2)]; const r2 = g.callCarrier(3, [2]); assert.ok(r2.ok, r2.msg); assert.equal(r2.delay, 0);
});
t('월말 정산 → 마켓 → 다음 달, 배차비는 정산에', () => {
  const g = EMPTY(9); g.parcels = [P(1, 'normal', 1)]; g.callCarrier(slot(g, 'bulk'), [1]); while (g.phase === 'play') adv(g);
  assert.equal(g.phase, 'summary'); assert.equal(g.summary.fees, 35); g.closeSummary(); assert.equal(g.phase, 'market'); g.closeMarket(); assert.equal(g.month, 2);
  for (const c of g.contracts) if (c) assert.ok(c.calls <= c.maxCalls);
});
t('마켓 구매 5개 제한', () => { const g = EMPTY(9); while (g.phase === 'play') adv(g); g.closeSummary(); g.cash = 9999; let bought = 0; for (let i = 0; i < g.market.items.length && bought < 6; i++) { const it = g.market.items[i]; if (it.sold || it.kind === 'refill') continue; const r = g.buy(i, it.kind === 'contract' ? (it.switchFrom ? g.contracts.findIndex(c => c && c.id === it.switchFrom) : 0) : it.kind === 'enh' ? 0 : null); if (r.ok) bought++; else if (bought >= 5) { assert.ok(/5/.test(r.msg)); break; } } assert.ok(bought <= 5); });
t('저장/불러오기 후 결정적 진행', () => {
  const a = NG(21); for (let i = 0; i < 3 && a.phase === 'play'; i++) adv(a); const json = JSON.stringify(a.toJSON()); const b = Game.fromJSON(JSON.parse(json));
  for (let i = 0; i < 4; i++) { if (a.phase === 'play') adv(a); if (b.phase === 'play') adv(b); } a.takeEvents(); b.takeEvents(); assert.equal(JSON.stringify(a.toJSON()), JSON.stringify(b.toJSON()));
});
t('스트레스 한계 → 게임오버', () => { const g = EMPTY(1); g.stress = g.rules.gameoverStress - 1; g.warehouse.cap = 0; g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2)]; g._assignCold(); adv(g); assert.equal(g.phase, 'over'); });
t('회사별 시작 상태', () => { for (const id in M.COMPANIES) { const g = new Game({ seed: 2, company: id }); assert.ok(g.cash > 0, id); assert.ok(g.contracts.filter(Boolean).length >= 2, id); } const q = new Game({ seed: 2, company: 'quick' }); assert.equal(q.selfCount(), 2); const th = new Game({ seed: 2, company: 'thrifty' }); assert.equal(th.rules.feeMult, 0.8); const po = new Game({ seed: 2, company: 'postal' }); assert.equal(po.truckFee(po.contracts[1]), 35); });
t('시나리오 규칙', () => { const g = new Game({ seed: 1, scenario: 'cashcrunch' }); assert.equal(g.cash, 225); assert.ok(g.rules.noRefresh); const p = new Game({ seed: 1, scenario: 'peak' }); assert.equal(p.rules.months, 2); });
t('데일리 설정은 날짜에 결정적', () => { const a = dailyConfig('2026-09-05'), b = dailyConfig('2026-09-05'); assert.deepEqual(a, b); assert.equal(a.variants.length, 2); });
t('직접 배송: 대기 턴에 1개, 보상 그대로 + 배송비 20c', () => {
  const g = EMPTY(8); for (let i = 0; i < 3; i++) g.parcels.push(P(900 + i, 'normal', 1));
  assert.equal(g.selfCount(), 1); assert.ok(!adv(g, [900, 901]).ok);
  const turn = g.turn, cash = g.cash; const r = adv(g, [900]); assert.ok(r.ok); assert.equal(g.turn, turn + 1); assert.equal(g.cash, cash + 25); assert.equal(g.feesDue, 20); assert.equal(g.parcels.length, 2); assert.equal(g.stats.selfCalls, 1);
  g.warehouse.driver = true; assert.equal(g.selfCount(), 2);
});
t('마켓 막힌 속성 보장: 처리 못 하는 특수 택배가 있으면 슬롯 A에 처리 가능한 업체', () => {
  let hit = 0; for (let s = 1; s <= 30; s++) { const g = EMPTY(s); g.contracts = [g._makeContract('bulk', 'normal'), null, null, null]; g.parcels = [P(1, 'frozen', 2, { inFrozen: true, deadline: 99 })]; g.warehouse.frozen = 4; g._assignCold();
    while (g.phase === 'play') adv(g); if (g.phase !== 'summary') continue; g.closeSummary(); const it = g.market.items[0]; if (it.kind === 'contract' && it.hint && D.CARRIERS[it.carrier].caps.includes('frozen')) hit++; }
  assert.ok(hit >= 20, 'hit ' + hit);
});
t('고객: 입고 배정·신뢰 xp·손해배상·거래 중단', () => {
  const g = EMPTY(3, { perks: ['skip', 'longdeal'] }); assert.ok(g.customers.mart && g.customerLevel('mart') === 1);
  g.parcels = [P(5, 'normal', 1, { customer: 'glass' })]; g.callCarrier(slot(g, 'bulk'), [5]); assert.equal(g.customers.glass.xp, 1);
  g.parcels = [P(6, 'fragile', 2, { deadline: 1, customer: 'glass' })]; const cash = g.cash; adv(g); adv(g); adv(g);
  assert.equal(g.stats.returned, 1); assert.equal(cash - g.cash, 60 * 2); assert.ok(g.customers.glass.suspended); assert.ok(!('glass' in g._customerWeightsFor(1)));
});
t('고객 규칙: 새벽배송(입고 당 턴 처리 +20)', () => { const g = EMPTY(3); g.parcels = [P(7, 'normal', 1, { customer: 'dawn', arrivalTurn: g.totalTurn })]; const r = g.callCarrier(slot(g, 'bulk'), [7]); assert.equal(r.revenue, 25 + 20); assert.equal(g.customers.dawn.xp, 2); });
t('날씨: 비에 야외 일반 택배 젖음(보상 -20%), 천막 퍽이면 무효', () => {
  for (const tent of [false, true]) { const g = EMPTY(5, { perks: tent ? ['tent'] : ['skip'] }); g.rules.theftMult = 0; g.weather = Array(10).fill('rain'); g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2)]; g.warehouse.cap = 2; g._assignCold();
    assert.equal(g.outdoorParcels().length, 1); adv(g); assert.equal(g.parcels.filter(p => p.wet).length, tent ? 0 : 1);
    if (!tent) { g.warehouse.cap = 99; const wet = g.parcels.find(p => p.wet); const r = g.callCarrier(slot(g, 'bulk'), [wet.id]); assert.equal(r.revenue, Math.round(35 * 0.8)); } }
});
t('날씨: 폭설이면 야외 신선 안 썩고 도난 절반, 태풍 턴 입고는 다음 턴으로', () => {
  const g = EMPTY(5); g.weather = Array(10).fill('snow'); g.parcels = [P(1, 'fresh', 2, { deadline: 3 }), P(2, 'fresh', 2, { deadline: 3 })]; g.warehouse.cap = 2; g.warehouse.cold = 2; g._assignCold();
  assert.equal(g.theftProb(), 0.15 * 0.5); adv(g); for (const p of g.parcels) assert.equal(p.deadline, 3);
  let found = false; for (let seed = 1; seed < 60 && !found; seed++) { const h = new Game({ seed, scenario: 'half' }); const tt = h.weather.indexOf('storm'); if (tt > 0) { found = true; assert.equal(h.schedule[tt].length, 0); } } assert.ok(found);
});
t('보험: 든든화재 50% 보장, 프리미어 반송 스트레스 면제, 마켓에서 갈아타기', () => {
  const g = EMPTY(3, { insurer: 'sturdy', perks: ['skip', 'longdeal'] }); assert.equal(g.premium(), 60); g.parcels = [P(6, 'fragile', 2, { deadline: 1, customer: 'glass' })]; const cash = g.cash; adv(g); adv(g); adv(g);
  assert.equal(cash - g.cash, 60); assert.equal(g.monthStats.insClaims, 1);
  const h = EMPTY(3, { insurer: 'premier', perks: ['skip', 'longdeal'] }); h.parcels = [P(6, 'normal', 1, { deadline: 1 })]; adv(h); adv(h); adv(h); assert.equal(h.stats.returned, 1); assert.equal(h.stress, 0); // 기한 초과 자체는 스트레스 0, 프리미어는 반송 +2 면제
  while (h.phase === 'play') adv(h); h.closeSummary(); assert.ok(h.setInsurer('coldguard').ok); assert.equal(h.insurer, 'coldguard');
});
t('보관 계약: 수락 → 점유 → 회수 xp +2, 조기 반환 위약금', () => {
  const g = new Game({ seed: 7, company: 'thrifty', perks: [] }); g.schedule = g.schedule.map(() => []); g.parcels = [];
  g.offer = { id: 500, kind: 'move', vol: 8, turns: 2, fee: 80, perTurn: 0, customer: 'mover', expires: 99 };
  const cash = g.cash; assert.ok(g.acceptOffer().ok); assert.equal(g.cash, cash + 80); assert.equal(g.usedVolume(), 8);
  const xp = g.customers.mover.xp; adv(g); adv(g); assert.equal(g.storage.length, 0); assert.equal(g.customers.mover.xp, xp + 2);
});
t('적재: 기본은 덜 급한 것부터 야외, 지정 가능', () => { const g = EMPTY(4); g.warehouse.cap = 4; g.parcels = [P(1, 'normal', 2, { deadline: 1 }), P(2, 'normal', 2, { deadline: 5 }), P(3, 'normal', 2, { deadline: 3 })]; g._assignCold(); assert.deepEqual(g.parcels.map(p => !!p.outdoor), [false, true, false]); g.setOutdoor([1]); assert.deepEqual(g.parcels.map(p => !!p.outdoor), [true, false, false]); });
t('난이도: 정규가 기본, 베테랑 운영비 +60·한계 16, 수습 예정 3턴·한계 24', () => { const v = new Game({ seed: 3, difficulty: 'veteran' }); assert.equal(v.rules.gameoverStress, 16); assert.equal(v.rules.feeMult, 1.3); const r = new Game({ seed: 3, difficulty: 'rookie' }); assert.equal(r.rules.upcomingTurns, 3); assert.equal(r.rules.gameoverStress, 24); const d = new Game({ seed: 3, scenario: 'daily', difficulty: 'veteran' }); assert.equal(d.cfg.difficulty, 'normal'); });
t('대형 계약·이사철·준비 마켓', () => { const b = new Game({ seed: 4, scenario: 'bigdeal' }); assert.ok(b.bigCustomer); const m = new Game({ seed: 4, scenario: 'moving' }); assert.ok(m.customers.mover); assert.ok(m.offer); const g = new Game({ seed: 3, prep: true }); assert.equal(g.phase, 'market'); assert.ok(g.market.prep); g.closeMarket(); assert.equal(g.turn, 1); });
t('농산물: 폭염이면 창고 안이라도 기한 -2, 환기 시설·냉장 구역이면 무사', () => {
  const g = EMPTY(4); g.weather = Array(10).fill('heat'); g.warehouse.cold = 0; g.parcels = [P(1, 'produce', 2, { deadline: 4 })]; g._assignCold(); adv(g); assert.equal(g.parcels[0].deadline, 1);
  const h = EMPTY(4); h.weather = Array(10).fill('heat'); h.parcels = [P(1, 'produce', 2, { deadline: 4 })]; h._assignCold(); assert.ok(h.parcels[0].inCold); adv(h); assert.equal(h.parcels[0].deadline, 3);
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
  assert.equal(I18n.t('log.monthStart', { m: 2, y: 2026, cal: 4 }), '── 2026년 4월 · 2개월차 시작 ──');
  assert.equal(I18n.t('ps.deadline', { n: 4 }), '⏳ <b>8</b>일');                       // {n#d}: 턴 → 영업일
  assert.equal(I18n.t('story.intro.3', { name: '한길 물류', fee: 38 }).slice(0, 60).includes('한길 물류는'), true); // 조사 자동 선택
  assert.equal(I18n.text({ k: 'log.penalty', p: { pen: 2, reasons: [{ k: 'r.overdue', p: { short: '일반' } }, { k: 'r.stolenInsured' }], stress: 5 } }), '페널티 +2: 기한 초과 일반, 도난 (보험 적용) (스트레스 5)');
  assert.equal(I18n.text('옛 세이브 문자열'), '옛 세이브 문자열');
  assert.ok(I18n.setLang('en'));
  assert.equal(I18n.t('fmt.calls', { n: 1 }), '1 call'); assert.equal(I18n.t('fmt.calls', { n: 3 }), '3 calls');
  assert.equal(D.PARCEL_TYPES.fresh.name, 'Fresh Food'); assert.equal(M.COMPANIES.local.name, 'Local Parcel'); assert.equal(D.trustEffectText('cold', 2), 'Fresh/produce deadlines freeze on call turns');
  assert.ok(I18n.setLang('ko')); assert.equal(D.PARCEL_TYPES.fresh.name, '신선식품');
});
// ----- 달력 (docs/STORY_TUTORIAL_DESIGN.md 5장) -----
t('달력 날짜: 1턴 = 평일 2일, 주말 4회, 월말 정산은 남은 날', () => {
  const g = NG(5);
  assert.deepEqual(g.turnDays(1), [1, 2]); assert.deepEqual(g.turnDays(2), [3, 4]);
  assert.deepEqual(g.turnDays(3), [7, 8]); assert.deepEqual(g.turnDays(10), [27, 28]);
  assert.deepEqual(g.weekendDays(2), [5, 6]); assert.deepEqual(g.weekendDays(8), [23, 24]);
  assert.ok(g.isWeekendAfter(4) && !g.isWeekendAfter(3) && !g.isWeekendAfter(10));
  assert.deepEqual(g.monthEndDays(1), [29, 31]);            // 3월 31일
  g.month = 12; assert.equal(g.monthEndDays(12), null);     // 2월은 28일에 딱 끝난다
  assert.equal(g.yearOf(1), g.year); assert.equal(g.yearOf(11), g.year + 1); // 1월이면 해가 바뀐다
});
t('주말: 턴이 아니다 — 기한·입고는 멈추고 야외 도난만 한 번 더', () => {
  const g = EMPTY(6); g.parcels = [P(1, 'normal', 2, { deadline: 3 })];
  g.wait(); g.wait();
  assert.equal(g.phase, 'weekend'); assert.equal(g.turn, 2);
  const dl = g.parcels[0].deadline, st = g.stress;
  g.weekendChoose('rest');
  assert.equal(g.phase, 'play'); assert.equal(g.turn, 3);
  assert.equal(g.parcels[0].deadline, dl);                 // 기한은 영업일 기준
  assert.equal(g.stress, Math.max(0, st - 1));             // 휴식 -1
  // 야근: 다음 영업일에만 직접 배송 +2
  g.wait(); g.wait(); assert.equal(g.phase, 'weekend');
  const self = g.selfCount(); g.weekendChoose('overtime');
  assert.equal(g.selfCount(), self + 2); g.wait(); assert.equal(g.selfCount(), self);
});
t('달력: 한국 3월 시작, 9월·2월 명절 = 폭주 2~4턴 + 연휴 5~6턴(호출 불가, 입고는 계속)', () => {
  const g = NG(7); assert.equal(g.calMonth(1), 3); assert.equal(g.calMonth(12), 2);
  g.month = 6; g._startMonth(7); assert.equal(g.calMonth(), 9);
  assert.ok(g.isRushTurn(3) && !g.isRushTurn(1)); assert.ok(g.isOffTurn(5) && g.isOffTurn(6) && !g.isOffTurn(7));
  // 현실: 연휴에 멈추는 건 배송이지 창고가 아니다 — 입고는 그대로 들어오고 차만 못 부른다
  assert.ok(g.schedule[4].length > 0 && g.schedule[5].length > 0);
  for (const sp of g.schedule[2]) assert.equal(sp.deadlineDelta, -1);
  g.turn = 4; g.parcels = [P(1, 'normal', 1)]; const i = slot(g, 'bulk'); assert.ok(g.canCall(g.contracts[i]));
  g.turn = 5; assert.ok(!g.canCall(g.contracts[i])); const r = g.callCarrier(i, [1]); assert.ok(!r.ok);
  assert.ok(g.upcoming()[0].off);
});
t('달력: 시나리오 컷은 startMonth로 시작 달을 정한다 (성수기 11월, 폭염 7월), 데일리는 cfg.startMonth', () => {
  assert.equal(new Game({ seed: 1, scenario: 'peak' }).calMonth(1), 11); assert.equal(new Game({ seed: 1, scenario: 'heatwave' }).calMonth(1), 7);
  assert.equal(new Game({ seed: 1, scenario: 'daily', startMonth: 12 }).calMonth(1), 12);
  const g = NG(3); assert.equal(g.calendarMonths().length, 12); assert.equal(g.calendarMonths()[6].cal, 9);
});
t('달력: 1월은 인플레 한 단계를 건너뛴다, 12월은 반송 유예 -1', () => {
  const g = NG(3); assert.ok(Math.abs(g.inflation(11) - Math.pow(D.OPCOST_INFLATION, 10)) < 1e-9); // 1월(11개월차)까지 10단계
  assert.ok(Math.abs(g.inflation(12) - Math.pow(D.OPCOST_INFLATION, 10)) < 1e-9); // 2월: 1월이 한 단계를 건너뛰어 그대로 10단계
  g.month = 10; assert.equal(g.calMonth(), 12); assert.equal(g.returnGraceFor(P(1, 'normal', 1)), D.RETURN_GRACE - 1);
});
const Story = require('../www/js/story.js'); globalThis.I18n = I18n; globalThis.DATA = D;
// ----- 튜토리얼 대본 (docs/STORY_TUTORIAL_DESIGN.md 부록 I) -----
const TUT = require('../www/js/tutorial.js');
const TG = extra => new Game(Object.assign({ scenario: 'standard', company: 'local', perks: [], insurer: 'none', story: true, scripted: true }, extra || {}));
t('대본: 인수인계 런은 시드가 고정이고 1~3개월차 입고·날씨가 대본 그대로', () => {
  const g = TG(), g2 = TG({ difficulty: 'normal' });
  assert.equal(g.seed, TUT.SEED); assert.equal(g2.seed, TUT.SEED);
  const flat = x => x.map(t2 => t2.map(sp => sp.type + sp.size + sp.customer).join()).join('|');
  assert.equal(flat(g.schedule), flat(TUT.months[1].turns));
  assert.deepEqual(g.weather, TUT.months[1].weather);
  assert.equal(flat(g.schedule), flat(g2.schedule), '난이도가 달라도 물류는 같다');
});
t('대본: 4개월차부터는 대본이 없다(무작위로 돌아간다)', () => {
  const g = TG();
  assert.ok(g.script(1) && g.script(3)); assert.equal(g.script(4), null);
  const a = g._makeSchedule(4), b = g._makeSchedule(4);
  assert.notDeepEqual(a.map(t2 => t2.length), TUT.months[1].turns.map(t2 => t2.length));
  assert.ok(a.flat().length > 0 && b.flat().length > 0);
});
t('대본: 일반 런(인수인계가 아닌 안내 토글)은 대본을 쓰지 않는다', () => {
  const g = new Game({ seed: 7, story: true });
  assert.equal(g.script(1), null);
});
t('대본 마켓: 1개월차는 충전·한도 강화·창고 확장만(계약 카드 없음), 2개월차는 갈아타기 카드', () => {
  const g = TG();
  g.month = 1; g.contracts[0].calls = 2;
  const m1 = g._genMarketItems();
  assert.ok(m1.some(it => it.kind === 'refill') && m1.some(it => it.kind === 'enh' && it.enh === 'limit1') && m1.some(it => it.kind === 'fac' && it.fac === 'expand1'));
  assert.ok(!m1.some(it => it.kind === 'contract'), '1개월차엔 계약 카드 없음');
  g.month = 2;
  const m2 = g._genMarketItems();
  const sw = m2.find(it => it.kind === 'contract');
  assert.ok(sw && sw.carrier === 'fragile1' && sw.switchFrom, '⚠ 상위 센터 갈아타기 카드');
});
t('대본: 배차 0 + 보낼 택배가 있으면 callsOut 비트', () => {
  const g = TG();
  const i = slot(g, 'fragile'), c = g.contracts[i];
  g.story.seen = Story.BEATS.filter(b => !['callsOut'].includes(b.id)).map(b => b.id);
  g.parcels = [P(90, 'fragile', 2)]; c.calls = 0;
  const b = Story.check(g, { kind: 'turn' });
  assert.ok(b && b.id === 'callsOut', b && b.id);
  assert.ok(/조심조심|배차/.test(b.pages[0].text));
});
// ----- 스토리 모드 (docs/STORY_TUTORIAL_DESIGN.md 3·4장) -----
t('스토리: cfg.story 가 있어야 비트가 나오고, 1개월차 1턴 시작에 intro, 같은 상황을 다시 물어도 한 번만', () => {
  assert.equal(Story.check(NG(1), { kind: 'start' }), null);
  const g = NG(1, { story: true }); const b = Story.check(g, { kind: 'start' });
  assert.ok(b && b.id === 'intro' && b.pages.length === 3 && b.pages[2].hl === '#wait-btn' && /기다려/.test(b.pages[2].text), JSON.stringify(b && b.id));
  assert.equal(Story.check(g, { kind: 'start' }), null); assert.deepEqual(g.story.seen, ['intro']); assert.equal(g.story.notes.length, 1);
  // 2턴: 창고 게이지 비트. 호출 턴(kind call)에도 turn 비트는 나온다
  adv(g); const u = Story.check(g, { kind: 'call', result: { ok: true } }); assert.ok(u && ['usage', 'firstCall', 'rain'].includes(u.id), u && u.id);
});
t('스토리: 달마다 다른 비트, 6월(4개월차) 1턴 작별에 달력 카드, 그 뒤엔 문자만', () => {
  const g = NG(2, { story: true }); g.story.seen = Story.BEATS.filter(b => b.id !== 'farewell' && b.id !== 'win').map(b => b.id);
  g.month = 3; g.turn = 6; const w = Story.check(g, { kind: 'turn' }); assert.equal(w.id, 'win'); assert.ok(/3월/.test(w.pages[0].text) && /2월/.test(w.pages[0].text), w.pages[0].text);
  g.month = 4; g.turn = 1; const f = Story.check(g, { kind: 'turn' }); assert.equal(f.id, 'farewell'); assert.ok(f.calendar); assert.ok(Story.done(g)); assert.ok(!Story.active(g));
  g.month = 5; g.turn = 1; assert.equal(Story.check(g, { kind: 'turn' }), null); assert.ok(/폭염/.test(Story.sms(g))); g.turn = 2; assert.equal(Story.sms(g), null);
  g.month = 1; assert.equal(Story.sms(g), null); // 3월은 문자 없음
});
t('스토리: 끄면 안 나오고, 세이브에 진행 상태가 남는다', () => {
  const g = NG(3, { story: true }); g.story.off = true; assert.equal(Story.check(g, { kind: 'start' }), null); g.story.off = false;
  Story.check(g, { kind: 'start' }); const g2 = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON()))); assert.deepEqual(g2.story.seen, ['intro']); assert.equal(Story.check(g2, { kind: 'start' }), null);
});
t('스토리: 팝업 비트는 kind modal + modal 이름이 맞을 때만, 선택 수에 따라 자동선택 → 호출 순서. 비 비트는 마당에 택배가 있을 때만', () => {
  const g = NG(4, { story: true }); g.story.seen = ['intro', 'usage', 'callReady'];
  // 1개월차 첫 대기 팝업: '그냥 대기' 에 게이트. 딱 한 번만.
  const wf = Story.check(g, { kind: 'modal', modal: 'wait', picked: 0, elig: 3, outdoor: 0 });
  assert.ok(wf && wf.id === 'waitFirst' && wf.pages[0].hl === '#modal .foot .btn.primary' && wf.pages[0].gate);
  assert.equal(Story.check(g, { kind: 'modal', modal: 'wait', picked: 0, elig: 3, outdoor: 0 }), null);
  const a = Story.check(g, { kind: 'modal', modal: 'call', sel: 0, elig: 3, slot: 0 }); assert.ok(a && a.id === 'callModal' && a.pages.length === 3 && a.pages[2].hl === '#pick-urgent' && a.pages[2].gate && /칸/.test(a.pages[0].text));
  assert.equal(Story.check(g, { kind: 'modal', modal: 'call', sel: 0, elig: 3, slot: 0 }), null);
  const b = Story.check(g, { kind: 'modal', modal: 'call', sel: 2, elig: 3 }); assert.ok(b && b.id === 'callGo' && b.pages[1].hl === '#modal .foot .btn.primary' && b.pages[1].gate);
  const drain = () => { let x, ids = []; while ((x = Story.check(g, { kind: 'turn' }))) ids.push(x.id); return ids; };
  g.weatherNow = () => 'rain'; assert.ok(!drain().includes('rain')); // 마당이 비어 있으면 비가 와도 rain 은 안 나온다
  // 대기 팝업: noContract 를 본 뒤에만 waitSelf → waitGo
  g.month = 2; g.story.seen.push('noContract');
  const w = Story.check(g, { kind: 'modal', modal: 'wait', picked: 0, elig: 2, outdoor: 0 }); assert.ok(w && w.id === 'waitSelf' && w.pages[0].hl === '#modal .zone .parcel');
  const w2 = Story.check(g, { kind: 'modal', modal: 'wait', picked: 1, elig: 2, outdoor: 0 }); assert.ok(w2 && w2.id === 'waitGo');
  // 비: 마당에 택배 + 비일 때만. 그 뒤 대기 팝업에서 적재 정리 버튼
  g.outdoorVolume = () => 3;
  let r; while ((r = Story.check(g, { kind: 'turn' })) && r.id !== 'rain'); assert.ok(r && /3칸/.test(r.pages[0].text) && r.pages[1].gate, JSON.stringify(g.story.seen));
  const rr = Story.check(g, { kind: 'modal', modal: 'wait', picked: 0, elig: 2, outdoor: 3 }); assert.ok(rr && rr.id === 'rainReorder' && rr.pages[0].hl === '#wm-reorder');
});
t('자동 선택: 마지막 차가 본전선(80%)도 못 채우면 그 차는 통째로 뺀다', () => {
  const g = NG(9, { story: true });
  const c = g.contracts.find(Boolean);
  const vcap = g.vehicleCap(c);
  const mk = (sizes) => sizes.map((size, i) => ({ id: 100 + i, size }));
  // 7칸 차에 10칸 → 7+3 이 아니라 꽉 차는 한 대까지만
  const ten = mk(Array(10).fill(1));
  const r = g.autoPick(c, ten, 3);
  assert.equal(r.vol, vcap, `한 대 분량만: ${r.vol} vs ${vcap}`);
  assert.equal(r.trucks, 1);
  assert.ok(r.trimmed);
  // 두 대를 꽉 채울 만큼 있으면 두 대까지 담는다
  const many = mk(Array(vcap * 2 + 1).fill(1));
  const r2 = g.autoPick(c, many, 3);
  assert.equal(r2.trucks, 2); assert.equal(r2.vol, vcap * 2); assert.ok(r2.trimmed);
  // 한 대도 못 채우면 있는 만큼 담는다 (한 대 밑으로는 자르지 않는다)
  const few = mk([1, 1]);
  const r3 = g.autoPick(c, few, 3);
  assert.equal(r3.vol, 2); assert.equal(r3.trucks, 1); assert.ok(!r3.trimmed);
  // 마지막 차가 80% 이상이면 그대로 둔다
  const edge = mk(Array(vcap + Math.ceil(vcap * 0.8)).fill(1));
  const r4 = g.autoPick(c, edge, 3);
  assert.equal(r4.trucks, 2); assert.ok(!r4.trimmed);
});
t('스토리: 비트 문구 키가 ko/en 에 모두 있다', () => {
  for (const b of Story.BEATS) b.pages.forEach((pg, i) => { if (pg.k) return; const k = `story.${b.id}.${i + 1}`; assert.ok(KO.ui[k] && EN.ui[k], k); });
  for (const a of ['cold', 'fragile', 'customs', 'frozen']) assert.ok(KO.ui['story.special.' + a] && EN.ui['story.special.' + a]);
  for (const k of ['good', 'bad']) assert.ok(KO.ui['story.summary3.' + k]);
  for (let c = 1; c <= 12; c++) assert.ok(KO.ui[`cal.kr.${c}.note`] && KO.ui[`cal.kr.${c}.label`] && EN.ui[`cal.kr.${c}.note`], 'cal ' + c);
  for (const id of ['holiday_rush', 'holiday_off', 'gift', 'sale']) assert.ok(KO.ui['cal.event.' + id] && EN.ui['cal.event.' + id]);
});
t('데모: demoMonths 개월 정산이 끝나면 데모 종료(승리도 패배도 아님), 본편은 그대로 이어진다', () => {
  const run3 = (extra) => { const g = EMPTY(7, extra); for (let m = 1; m <= 3; m++) { g.turn = D.TURNS_PER_MONTH; g.cash = 5000; g.feesDue = 0; g._endMonth(); assert.equal(g.phase, 'summary', 'month ' + m); if (m < 3) { g.closeSummary(); assert.equal(g.phase, 'market', 'market ' + m); g.closeMarket(); } } return g; };
  const demo = run3({ demoMonths: 3 });
  demo.closeSummary();
  assert.equal(demo.phase, 'over');
  assert.ok(demo.result.demo, 'result.demo');
  assert.equal(demo.result.win, false);
  assert.equal(demo.result.monthsDone, 3);          // 3개월을 채운 것으로 기록
  assert.ok(demo.result.score > 0, 'score ' + demo.result.score);
  const full = run3({});
  full.closeSummary();
  assert.equal(full.phase, 'market');               // 본편은 4개월차로 이어진다
  full.closeMarket(); assert.equal(full.month, 4);
});
t('데모: 컷이 시나리오 길이보다 길거나 같으면 데모 컷은 동작하지 않는다(1개월 시나리오 등)', () => {
  const g = EMPTY(8, { scenario: 'blackfriday', demoMonths: 3 });
  assert.equal(g.rules.months, 1);
  g.turn = D.TURNS_PER_MONTH; g.cash = 5000; g.run.delivered = 99; g._endMonth();
  g.closeSummary();
  assert.ok(g.phase === 'win' || g.phase === 'over', g.phase);
  assert.ok(!g.result.demo, '데모 컷이 아니라 시나리오 승패로 끝난다');
});
t('데모: 문구 키가 ko/en 에 모두 있다', () => {
  for (const k of ['demo.fullOnly', 'demo.cta', 'demo.gateTitle', 'demo.gateBody', 'demo.resultTitle', 'demo.resultHead', 'demo.resultBody', 'demo.endReason', 'demo.soon', 'demo.storySub',
    'stat.export', 'stat.import', 'stat.exportHelp', 'stat.importHelp', 'stat.importOk', 'stat.importFail', 'stat.copy', 'stat.copied', 'stat.copyFail', 'stat.importBtn', 'stat.transferNote'])
    assert.ok(KO.ui[k] && EN.ui[k], k);
});
t('회사 선택 화면: 시작 계약(계열 이름)이 모두 실제 센터로 풀린다 — ui.companyInfo 회귀', () => {
  const tier = g => Math.max(0, ['normal', 'trusted', 'expert', 'master'].indexOf(g || 'normal'));
  for (const id in M.COMPANIES) for (const c of M.COMPANIES[id].contracts || []) {
    const k = D.CARRIERS[c.carrier] ? c.carrier : D.centerFor(c.carrier, tier(c.grade));
    assert.ok(k && D.CARRIERS[k], id + ' ' + c.carrier + ' → 센터 없음');
    assert.ok(D.CARRIERS[k].short, id + ' ' + c.carrier + ' → short 없음');
    assert.ok(D.CARRIERS[k].trucks > 0, id + ' ' + c.carrier + ' → trucks 없음');
  }
});
console.log(`\n${n} tests passed${fails.length ? `, ${fails.length} FAILED` : ''}`); if (fails.length) process.exit(1);
