// 규칙 단위 테스트: node test/unit.js  (v1.0 차량·신뢰 특성·긴장감 재설계 기준 — docs/BALANCE_DESIGN.md)
const assert = require('assert');
const { Game, DATA: D, META: M } = require('../www/js/game.js');
const NG = (seed, extra) => new Game(Object.assign({ seed, scenario: 'kr_spring', months: 24, noHolidays: true, perks: ['skip', 'insure'] }, extra || {}));   // 기본은 한 해 런 (24사이클), 공휴일은 따로 시험한다
let n = 0, fails = []; const pending = [];
const fail = (name, e) => { fails.push(name); console.log('FAIL', name, '—', String(e && e.message || e).split('\n')[0].slice(0, 200)); };
// async 테스트(서버)는 프로미스를 모아 마지막에 기다린다
const t = (name, f) => { try { const r = f(); if (r && typeof r.then === 'function') { pending.push(r.then(() => { n++; console.log('ok', name); }, e => fail(name, e))); return; } n++; console.log('ok', name); } catch (e) { fail(name, e); } };
// 빈 창고·빈 입고로 시작하는 실험용 게임
const EMPTY = (seed, extra) => { const g = NG(seed, extra); g.parcels = []; g.schedule = g.schedule.map(() => []); g.warehouse.cap = 99; g.cash = 2000; return g; };
const P = (id, type, size, extra) => Object.assign({ id, type, size, baseSize: size, reward: D.PARCEL_TYPES[type].reward[size], deadline: D.PARCEL_TYPES[type].deadline, overdue: false, attrs: D.PARCEL_TYPES[type].attrs.slice(), age: 0, warm: 0, customs: 0, customer: 'anon', arrivalTurn: 1, inCold: false, inFrozen: false }, extra);
// 주말은 턴이 아니다 — 한 영업일 진행 = 대기 + (주말이면) 기본 선택(휴식)
const adv = (g, selfIds) => { const r = g.wait(selfIds); if (g.phase === 'weekend') g.weekendChoose('rest'); return r; };
const slot = (g, fam) => g.contracts.findIndex(c => c && D.familyOf(c.carrier) === fam);

// 꺼 둔 시스템(D.DISABLED_FEATURES — 일괄 출고·연속 만차·보름 목표)의 규칙 자체는 살아 있으니 켠 채로 검사한다
const withAll = fn => () => { const keep = D.DISABLED_FEATURES; D.DISABLED_FEATURES = []; try { fn(); } finally { D.DISABLED_FEATURES = keep; } };
t('시작 상태: 자금 450, 계약 3개(대량·냉장·프래자일), 준비 없이 play', () => { const g = NG(1); assert.equal(g.cash, 450); assert.equal(g.contracts.filter(Boolean).length, 3); assert.deepEqual(g.contracts.filter(Boolean).map(c => c.carrier), ['bulk0', 'cold0', 'fragile0']); assert.equal(g.phase, 'play'); assert.equal(g.month, 1); });
t('퍽 규칙 병합', () => { const g = NG(1, { perks: ['longdeal', 'compact'] }); assert.equal(g.rules.contractPriceMult, 0.9); assert.equal(g.rules.storeBigDelta, -1); assert.equal(g.rules.bigSizeDelta, 0); assert.equal(g.rules.sizeDelta, 0); });
t('초기 입고: 첫 보름 28~40개(ARRIVALS_SCALE 2.0), 소형 위주', () => { let small = 0, all = 0; for (let s = 1; s < 20; s++) { const g = NG(s, { legacyCustomers: true }); const sp = g.schedule.flat(); assert.ok(sp.length >= 28 && sp.length <= 40, `initial arrivals ${sp.length}`); for (const x of sp) { all++; if (x.size <= 2) small++; } } assert.ok(small / all > 0.8, `small ${small}/${all}`); });
t('실시간 성장 투자: 홍보는 캠페인 크기, 트럭은 배차, 창고는 공간을 즉시 늘린다', () => {
  const g = NG(71); g.cash = 3000;
  const future0 = g.schedule.slice(g.turn).flat().length;
  const calls0 = g.contracts.filter(Boolean).map(c => c.maxCalls);
  const cap0 = g.warehouse.cap;
  // 홍보를 사도 물량은 그대로다 — 캠페인을 열어야 들어온다 (부록 AQ)
  const ad = g.investGrowth('marketing'); assert.ok(ad.ok); assert.equal(g.schedule.slice(g.turn).flat().length, future0);
  const fl = g.investGrowth('fleet'); assert.ok(fl.ok); g.contracts.filter(Boolean).forEach((c, i) => assert.equal(c.maxCalls, calls0[i] + 1));
  const wh = g.investGrowth('warehouse'); assert.ok(wh.ok); assert.equal(g.warehouse.cap, cap0 + D.GROWTH.warehouse.cap);
  const fresh = g._makeContract('bulk1'); assert.ok(fresh.maxCalls >= D.CARRIERS.bulk1.trucks + 1, '새 계약에도 차량 투자가 적용된다');
  const h = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON()))); assert.deepEqual(h.growth, { marketing: 1, fleet: 1, warehouse: 1, automation: 0, branding: 0, coldchain: 0 });
});
t('광고 집행(스토리 장 방식 — 매체 레벨): 전단지로 시작, 보름에 한 번, 며칠 안에 물량을 끌어온다', () => {
  const g = NG(73); g.cash = 3000; g.adTicketMode = () => false;
  const F = D.AD_MEDIA.flyer;
  assert.deepEqual(g.ownedMedia(), ['flyer'], '처음엔 전단지만 가진다');
  assert.equal(g.rep, Math.round(g.rules.gameoverStress * D.START_REP), '자유 런은 평판 막대 절반에서 시작한다 — 가득 차 있으면 채울 게 없다');
  assert.equal(g.campaignPlan().level, 1, '전단지 Lv1 로 바로 집행할 수 있다');
  assert.equal(g.campaignPlan().parcels, F.per);
  assert.equal(g.campaignPlan('radio').level, 0, '없는 매체는 집행 못 한다'); assert.equal(g.runCampaign('radio').ok, false);
  // 스토리 3장: 창고가 빈 날 이틀을 겪고 박 반장이 소개(l3invest)하기 전엔 닫혀 있다
  const s3 = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 4, prep: false });
  s3.cash = 3000; if (s3.phase === 'market') s3.closeMarket();
  assert.equal(s3.campaignPlan().level, 0); assert.equal(s3.runCampaign().ok, false);
  s3.parcels = []; s3.wait(); s3.takeEvents(); s3.parcels = []; s3.wait(); s3.takeEvents();
  assert.ok((s3.emptyDays || 0) >= 2, '빈 날을 센다 — ' + s3.emptyDays);
  s3.story.seen.push('l3invest'); assert.ok(s3.campaignPlan().ready, '소개 뒤에 열린다');
  g.media.flyer = 2;
  const plan = g.campaignPlan('flyer');
  assert.equal(plan.parcels, F.per, '한 번의 건수는 매체마다 고정');
  assert.equal(plan.cost, F.cost);
  assert.equal(plan.runs, 2, 'Lv2 = 보름에 두 번'); assert.equal(plan.left, 2);
  const before = g.schedule.slice(g.turn).flat().length, cash0 = g.cash, due0 = g.feesDue;
  const pv = g.campaignPreview('flyer'), roll = g._campaignRoll('flyer'), perSlot0 = roll.map(x => g.schedule[x.slot].length);
  assert.equal(pv.reduce((a, x) => a + x.n, 0), plan.parcels, '미리보기 합 = 건수'); assert.equal(pv[0].day, 1, '첫 칸은 내일');
  const rep0 = g.rep;
  const r = g.runCampaign('flyer'); assert.ok(r.ok, '캠페인이 열린다');
  assert.equal(g.rep, Math.min(g.repCap(), rep0 + D.AD_MEDIA.flyer.rep), '광고를 돌리면 평판이 오른다');
  assert.equal(g.schedule.slice(g.turn).flat().length, before + plan.parcels, '그만큼 물량이 붙는다');
  roll.forEach((x, k) => {
    assert.equal(g.schedule[x.slot].length, perSlot0[k] + x.specs.length, '미리보기대로 그 날에 들어온다 — ' + x.day);
    const cells = g.schedule[x.slot].reduce((a, s) => a + g._specCells(s), 0); assert.equal(cells, pv[k].after, '미리 보인 칸 수 그대로 — ' + pv[k].before + '→' + pv[k].after);
  });
  assert.equal(g.cash, cash0, '광고비는 후불 — 잔고는 그대로'); assert.equal(g.feesDue, due0 + plan.cost, '정산 때 빠진다');
  const win = g.schedule.slice(g.turn, g.turn + plan.days).flat().length;
  assert.ok(win >= plan.parcels, '며칠 안에 몰려 들어온다 — ' + win);
  assert.equal(g.campaignPlan('flyer').left, 1, '한 번 쓰면 눈금 하나가 빈다');
  // 같은 매체는 돌고 있는 동안 다시 못 한다
  { const pa = g.campaignPlan('flyer'); assert.ok(pa.active && !pa.ready, '전단지가 돌고 있으면 전단지는 못 한다'); const ra = g.runCampaign('flyer'); assert.equal(ra.ok, false); assert.equal(ra.reason, 'active'); }
  // 겹침 반감: 다른 매체라도 첫 캠페인 물량이 아직 들어오는 동안이면 건수·평판이 반
  g.media.radio = 1; g.cash += 999;
  const p2 = g.campaignPlan('radio'); assert.equal(p2.stack, 1); assert.equal(p2.parcels, Math.round(D.AD_MEDIA.radio.per / 2), '겹치면 건수 반감'); assert.equal(p2.rep, Math.floor(D.AD_MEDIA.radio.rep / 2), '평판도 반감');
  const before2 = g.schedule.slice(g.turn).flat().length;
  assert.ok(g.runCampaign('radio').ok, '다른 매체는 겹쳐 집행할 수 있다');
  assert.equal(g.schedule.slice(g.turn).flat().length, before2 + p2.parcels, '반감된 만큼만 붙는다');
  { const k = g.turn; g.turn += D.AD_MEDIA.radio.days + 1; assert.equal(g.campaignStack(), 0, '끝난 캠페인은 겹침으로 안 센다'); assert.ok(g.campaignPlan('flyer').ready, '끝나면 전단지 다음 눈금'); assert.ok(g.runCampaign('flyer').ok, 'Lv2 는 같은 보름에 한 번 더'); g.turn = k; }
  assert.equal(g.runCampaign('flyer').ok, false, '눈금을 다 쓰면 그 보름엔 끝');
  const h = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON()))); h.adTicketMode = () => false;
  assert.equal(h.campaignPlan().used, true, '세이브를 건너도 이번 보름에 쓴 것이 남는다');
  assert.equal(h.media.flyer, 2, '매체 레벨도 저장된다');
});
t('창고 구역: 랙·복층은 따로 떨어진 칸 — 한 택배는 한 구역에 통째로 들어간다', () => {
  const g = NG(75); g.parcels = []; g.storage = [];
  g.warehouse.cap = 3 + 8; g.warehouse.rackCap = 8; g.warehouse.mezzCap = 0; g.warehouse.cold = 0; g.warehouse.frozen = 0;   // 바닥 3칸 + 랙 8칸
  const mk = (id, size, type) => ({ id, type: type || 'normal', size, baseSize: size, attrs: [], deadline: 3, reward: 30, customer: 'anon' });
  g.parcels = [mk(1, 4, 'large')]; g._assignCold();
  assert.equal(g.parcels[0].outdoor, true, '남은 칸이 11이어도 4칸짜리는 바닥 3칸에 안 들어가니 밖으로 — 바닥 반·랙 반으로 쪼개지 않는다');
  g.parcels = [mk(2, 2), mk(3, 2), mk(4, 2), mk(5, 2), mk(6, 1)]; g._assignCold();
  assert.ok(g.parcels.every(p => !p.outdoor), '작은 짐은 랙에 올라간다');
  assert.equal(g.parcels.filter(p => p.area === 'rack').length, 4, '크기 2 네 개가 랙 8칸을 채운다');
  assert.equal(g.parcels.find(p => p.id === 6).area, 'floor');
  g.warehouse.cap = 2 + 12; g.warehouse.rackCap = 0; g.warehouse.mezzCap = 12;
  g.parcels = [mk(7, 4, 'large'), mk(8, 7, 'large')]; g._assignCold();
  assert.equal(g.parcels.find(p => p.id === 7).area, 'mezz', '크기 4 는 복층에');
  assert.equal(g.parcels.find(p => p.id === 8).outdoor, true, '크기 7 은 복층에 못 올린다');
});
t('마켓(스토리 장 방식): 새 광고 매체·매체 강화·성장 투자를 판다', () => {
  const g = NG(74); g.cash = 5000; g.adTicketMode = () => false;
  g.phase = 'market'; g.market = { items: g._adAndGrowthItems(1), bought: 0, refreshes: 0, month: g.month };
  const kinds = g.market.items.map(it => it.kind);
  assert.ok(kinds.includes('media') && kinds.includes('mediaUp'), '새 매체와 강화가 있다 — ' + kinds);
  const gs = g.market.items.filter(it => it.kind === 'growth');
  assert.ok(gs.length >= 1 && gs.length <= D.GROWTH_OFFERS, '성장 투자 1~' + D.GROWTH_OFFERS + '개 — ' + gs.length);
  assert.ok(gs.every(it => !['warehouse', 'coldchain', 'marketing'].includes(it.growth)), '창고·저온은 시설로 — 성장 투자에 없다');
  const mi = kinds.indexOf('media'), id = g.market.items[mi].media;
  assert.ok(g.buy(mi, null).ok); assert.equal(g.media[id], 1, '산 매체는 Lv1');
  assert.ok(g.buy(kinds.indexOf('mediaUp'), null).ok); assert.equal(g.media.flyer, 2, '강화하면 레벨이 오른다'); assert.equal(g.mediaPlan('flyer').runs, 2, '강화 = 보름 집행 횟수 +1');
  const gi = kinds.indexOf('growth'), gk = g.market.items[gi].growth, lv0 = g.growth[gk], cash0 = g.cash, price = g.market.items[gi].price;
  assert.ok(g.buy(gi, null).ok); assert.equal(g.growth[gk], lv0 + 1); assert.equal(g.cash, cash0 - price, '값은 한 번만 낸다');
});

t('성장 트리: 차량→자동화→브랜드와 창고→저온 물류가 단계적으로 해금된다', () => {
  const g = EMPTY(72); g.cash = 9999;
  assert.ok(g.growthPlan('automation').locked); assert.ok(g.growthPlan('branding').locked); assert.ok(g.growthPlan('coldchain').locked);
  g.investGrowth('fleet'); g.investGrowth('fleet');
  const c = g.contracts.find(Boolean), fee0 = g.callFee(c, 1);
  assert.ok(g.investGrowth('automation').ok); assert.ok(g.callFee(c, 1) < fee0);
  assert.ok(g.growthPlan('branding').locked, '광고가 전단지뿐이면 브랜드는 잠겨 있다'); g.media.flyer = 3; assert.ok(!g.growthPlan('branding').locked, '매체를 키우면 열린다');
  assert.ok(g.investGrowth('branding').ok); const base = g.baseReward('normal', 2); assert.equal(g._spawnParcel({ type: 'normal', size: 2 }).reward, Math.round(base * 1.03));
  g.investGrowth('warehouse'); g.investGrowth('warehouse'); const cold0 = g.warehouse.cold, frozen0 = g.warehouse.frozen;
  assert.ok(g.investGrowth('coldchain').ok); assert.equal(g.warehouse.cold, cold0 + 2); assert.equal(g.warehouse.frozen, frozen0 + 1);
});
t('월간 미션: 수익이 D→C→B→A 등급을 넘을 때 성장 보너스를 지급한다', withAll(() => {
  const g = EMPTY(73); const i = slot(g, 'bulk'); g.monthStats.missionTarget = 200;
  g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2)];
  const cash = g.cash, r = g.callCarrier(i, [1, 2, 3]);
  assert.equal(r.missionUp.grade, 'C'); assert.equal(r.missionUp.bonus, 15); assert.equal(g.missionState().grade, 'C');
  assert.equal(g.cash, cash + r.revenue + r.missionUp.bonus);
}));
t('조커 업체 없음: 용달·긴급 삭제', () => { assert.ok(!D.CARRIERS.target && !D.CARRIERS.urgent); for (const id in M.COMPANIES) for (const c of M.COMPANIES[id].contracts || []) assert.ok(D.FAMILIES[c.carrier] || D.CARRIERS[c.carrier], id + ' ' + c.carrier); });
t('대기는 배차를 차감하지 않음', () => { const g = NG(3); const calls = g.contracts.map(c => c && c.calls); adv(g); assert.deepEqual(g.contracts.map(c => c && c.calls), calls); assert.equal(g.turn, 2); });

t('차량: 부피 합으로 대수 결정, 배차비 즉시 차감, 대수만큼 배차 소모', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  assert.equal(g.vehicleCap(c), 6 + 1); // 탑차 6 + 동네 택배 첫 호출 +1
  g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2)];
  const cash = g.cash, trucks = c.calls, fee = g.truckFee(c); assert.equal(fee, D.FAMILIES.bulk.fee);
  const r = g.callCarrier(i, [1, 2, 3]); assert.ok(r.ok, r.msg); assert.equal(r.trucks, 1); assert.equal(r.fee, D.FAMILIES.bulk.fee); assert.equal(c.calls, trucks - 1);
  assert.equal(g.cash, cash + r.revenue + ((r.missionUp && r.missionUp.bonus) || 0)); assert.equal(g.feesDue, D.FAMILIES.bulk.fee); assert.equal(r.revenue, 35 * 3); assert.ok(r.fill >= 0.8);
});
t('차량: 담은 만큼 차가 붙는다 — 한 대 용량을 넘기면 두 대, 두 대가 상한(MAX_TRUCKS), 그 안에선 남은 배차가 모자랄 때만 거부', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2), P(4, 'normal', 2)];
  assert.equal(D.MAX_TRUCKS, 2); assert.equal(g.simulMax(c), 2, '동시 한도 = min(2, 남은 배차)');
  let r = g.callCarrier(i, [1, 2, 3, 4]); assert.ok(r.ok, r.msg); assert.equal(r.trucks, 2); assert.equal(r.fee, D.FAMILIES.bulk.fee * 2);   // 8칸 > 7칸 → 자동 2대
  const g4 = EMPTY(2); const m = slot(g4, 'bulk');
  g4.parcels = [1, 2, 3, 4, 5, 6, 7].map(id => P(id, 'normal', 2));
  r = g4.callCarrier(m, [1, 2, 3, 4, 5, 6, 7]); assert.ok(!r.ok, '14칸 = 석 대 → 두 대 상한에 거부');
  const g2 = EMPTY(2); const j = slot(g2, 'bulk'), c2 = g2.contracts[j]; c2.calls = 1;
  g2.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2), P(4, 'normal', 2)];
  r = g2.callCarrier(j, [1, 2, 3, 4]); assert.ok(!r.ok && /배차/.test(r.msg), r.msg);   // 배차 1대 남음 → 거부
  const g3 = EMPTY(2); const k = slot(g3, 'bulk'); g3._shows = new Set(['market', 'calls']);
  { g3.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2), P(4, 'normal', 2)]; r = g3.callCarrier(k, [1, 2, 3, 4]); assert.ok(!r.ok, '동시 호출이 안 열린 장은 한 대'); }
});
t('도크 러시: 창고를 72% 이상 채우면 임시 트럭 +2, 2대 이상으로 55%를 비우면 보상 35% 폭발', withAll(() => {
  const g = EMPTY(202); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.warehouse.cap = 12;
  g.parcels = [1, 2, 3, 4, 5, 6].map(id => P(id, 'normal', 2));
  assert.ok(g.rushState().ready);
  const base = g.parcels.reduce((sum, p) => sum + p.reward, 0);
  const r = g.callCarrier(i, g.parcels.map(p => p.id), 2);
  assert.ok(r.ok, r.msg); assert.ok(r.rush); assert.equal(r.revenue, Math.round(base * D.RUSH.bonus));
  assert.equal(r.rushBonus, r.revenue - base); assert.equal(g.stats.rushes, 1); assert.equal(g.stats.rushBonus, r.rushBonus);
}));
t('퍼펙트 로드: 80% 적재 출고를 연속하면 2회부터 보상이 커지고 대기하면 연쇄가 끊긴다', withAll(() => {
  const g = EMPTY(203); const i = slot(g, 'bulk'), c = g.contracts[i];
  const load = base => [0, 1, 2].map(n => P(base + n, 'normal', 2));
  g.parcels = load(10); const first = g.callCarrier(i, g.parcels.map(p => p.id));
  assert.ok(first.ok); assert.equal(first.chain, 1); assert.equal(first.chainMult, 1); assert.equal(first.chainBonus, 0);
  g.parcels = load(20); const base = g.parcels.reduce((sum, p) => sum + p.reward, 0); const second = g.callCarrier(i, g.parcels.map(p => p.id));
  assert.ok(second.ok); assert.equal(second.chain, 2); assert.equal(second.chainMult, 1.08); assert.equal(second.revenue, Math.round(base * 1.08)); assert.ok(second.chainBonus > 0);
  assert.equal(g.stats.maxLoadChain, 2); assert.equal(g.stats.chainBonus, second.chainBonus);
  adv(g); assert.equal(g.loadChain, 0);
}));
t('차량: 배차비는 후불이라 자금 0이어도 호출 가능, 남은 배차보다 많이 못 부름', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i]; g.parcels = [P(1, 'normal', 1)];
  g.cash = 0; let r = g.callCarrier(i, [1]); assert.ok(r.ok); assert.equal(g.feesDue, D.FAMILIES.bulk.fee);
  g.parcels = [P(2, 'normal', 1)]; c.calls = 0; r = g.callCarrier(i, [2]); assert.ok(!r.ok);
});
t('단기 금융: 정산 후 음수면 차입해 0, 다음 정산에 원금+이자 15% 상환, 한도 400 넘으면 부도', () => {
  const g = EMPTY(2, { perks: ['skip', 'longdeal'] }); g.turn = D.TURNS_PER_MONTH; g.cash = 50; g.feesDue = 200; g._endMonth();
  assert.equal(g.phase, 'summary'); assert.equal(g.cash, 0); assert.ok(g.debt > 0); assert.equal(g.summary.loan.borrowed, g.debt); const debt = g.debt;
  g.closeSummary(); g.closeMarket(); g.cash = 2000; g.feesDue = 0; g.turn = D.TURNS_PER_MONTH; g._endMonth();
  assert.equal(g.debt, 0); assert.equal(g.summary.loan.repaid, debt); assert.equal(g.summary.loan.interest, Math.ceil(debt * 0.15));
  g.closeSummary(); g.closeMarket(); g.cash = 0; g.feesDue = 900; g.turn = D.TURNS_PER_MONTH; g._endMonth(); assert.equal(g.phase, 'over');
});
t('기업 계약: 단골은 계약으로 시작, 보험 없이 서명 불가, 제휴 보험사면 조건↑, 만기 평가 → 관계·보너스·재계약', () => {
  const g = NG(11); assert.ok(g.bizMode());
  const d0 = g.activeDeals(); assert.ok(d0.length >= 1 && d0.every(d => d.left === 2), '단골 명단이 두 사이클 계약으로 — ' + d0.map(d => d.customer));
  const id0 = d0[0].customer; assert.ok(g.schedule.flat().some(sp => sp.customer === id0), '계약 물량이 입고표에 얹힌다');
  const dc = new Set(d0.map(d => d.customer)); assert.ok(g.schedule.flat().every(sp => sp.customer === 'anon' || dc.has(sp.customer)), '계약 밖 물량은 개인 고객');
  { const n = g.schedule.flat().length; assert.ok(n >= 26 && n <= 48, '첫 보름 총량은 예전과 비슷 — ' + n); }
  // 보험 없이 서명 불가
  g.insurer = 'none'; assert.equal(g.dealBlock('glass'), 'insurance');
  g.insurer = 'sturdy'; const plain = g._dealTerms('glass', 2); g.insurer = 'safebox'; const fan = g._dealTerms('glass', 2);
  assert.ok(fan.fan && fan.cells > plain.cells && fan.rate > plain.rate, '제휴 보험사(세이프박스→유리공방)면 물량·단가↑');
  // 단가는 입고 보상에 붙는다
  g.relations.glass = 3; const t3 = g._dealTerms('glass', 2); assert.ok(t3.rate > fan.rate && t3.bonus > fan.bonus, '관계가 높을수록 조건↑');
  // 만기 평가
  const d = d0[0]; d.left = 1; d.st = { delivered: 10, onTime: 10, rush: 1, claims: 0 };
  const rel0 = g.relation(d.customer), cash0 = g.cash; const out = g._settleDeals();
  assert.equal(out.length, 1); assert.equal(out[0].grade, 'S'); assert.equal(g.relation(d.customer), rel0 + 2); assert.equal(g.cash, cash0 + d.bonus, '무사고 완료 보너스');
  assert.ok(g._dealOfferItems().some(it => it.customer === d.customer && it.renew), 'S 로 끝나면 재계약 제안이 먼저 온다');
  // 사고가 있으면 S·보너스 없음, 정시율 낮으면 C → 관계−, 쿨다운
  const e = g._pushDeal(g._dealTerms('mart', 2), 1); e.left = 1; e.st = { delivered: 10, onTime: 5, rush: 0, claims: 2 };
  const r2 = g._settleDeals().find(x => x.customer === 'mart'); assert.equal(r2.grade, 'C'); assert.equal(r2.bonus, 0);
  assert.ok(!g._dealOfferItems().some(it => it.customer === 'mart'), 'C 면 한동안 제안이 오지 않는다');
});
t('기업 계약: 계약 단가가 보상에 붙고, 처리·사고가 평가에 쌓인다', () => {
  const g = EMPTY(12); g.insurer = 'sturdy'; const i = slot(g, 'bulk');
  const d = g._pushDeal(Object.assign(g._dealTerms('farm', 2), { rate: 1.5 }), 1);
  const p = g._spawnParcel({ type: 'normal', size: 1, customer: 'farm' }); assert.equal(p.reward, Math.round(D.PARCEL_TYPES.normal.reward[1] * 1.5));
  g.parcels = [p]; g.callCarrier(i, [p.id]); assert.equal(d.st.delivered, 1); assert.equal(d.st.onTime, 1);
  const q = g._spawnParcel({ type: 'normal', size: 1, customer: 'farm' }); g._claim(q, 'test', 'stolen'); assert.equal(d.st.claims, 1);
});
t('강화 교체: 칸이 다 차면 하나를 빼고 새 걸 끼운다 — 뺀 효과는 되돌아간다', () => {
  const g = EMPTY(22); g.phase = 'market'; g.market = { items: [], bought: 0, refreshes: 0, freeRefresh: 0 }; const i = slot(g, 'bulk'), c = g.contracts[i];
  const buy = (enh, mode) => { g.market.items.push({ kind: 'enh', enh, price: 10, name: enh, sold: false }); return g.buy(g.market.items.length - 1, i, mode); };
  const n = g.enhSlots(c), max0 = c.maxCalls;
  for (let k = 0; k < n; k++) assert.ok(buy('limit1').ok);
  assert.equal(c.maxCalls, max0 + n);
  assert.ok(!buy('holiday').ok, '칸이 차면 그냥은 못 산다');
  const r = buy('holiday', { replace: 'limit1' }); assert.ok(r.ok, '교체로 산다');
  assert.ok(c.enh.holiday); assert.equal(c.enh.limit, n - 1); assert.equal(c.maxCalls, max0 + n - 1, '뺀 배차 한도는 되돌아간다');
  assert.ok(!buy('cap1', { replace: 'nope' }).ok, '끼운 적 없는 강화는 뺄 수 없다');
});
t('계약 교체 경고: 바꾸면 못 싣게 되는 종류·창고 택배를 미리 알려 준다', () => {
  const g = EMPTY(23); const i = slot(g, 'bulk'); g.contracts = g.contracts.map((c, k) => k === i ? c : null);
  g.parcels = [P(1, 'normal', 2), P(2, 'fresh', 1, { attrs: ['cold'] })];
  const l = g.replaceLoss(i, 'fragile0'); assert.ok(!l.any || !l.types.includes('normal'), '파손 계열도 일반을 싣는다');
  const l2 = g.replaceLoss(i, 'frozen0'); assert.ok(l2.any && l2.types.includes('normal') && l2.parcels.some(p => p.id === 1), '냉동으로 바꾸면 일반을 못 싣는다 — ' + JSON.stringify(l2.types));
  assert.equal(D.familyOf(g.contracts[i].carrier), 'bulk', '미리보기는 계약을 건드리지 않는다');
});
t('사업 규모: 최근 수익이 크면 마켓 등급표가 앞서고, 주력 계약의 다음 등급 센터가 한 장 보장된다', () => {
  const g = NG(31); assert.equal(g.bizLevel(), 0);
  g.revHist = [5000, 5000]; assert.equal(g.bizLevel(), 3); assert.ok(g._gradeProb(1).master > 0, '1사이클이라도 마스터가 나온다');
  const main = g.contracts.find(Boolean); main.delivered = 999;
  const items = g._genMarketItems(); const nx = D.centersOf(D.familyOf(main.carrier)).find(k => D.CARRIERS[k].tier === D.CARRIERS[main.carrier].tier + 1);
  assert.ok(items.some(it => it.kind === 'contract' && it.carrier === nx && it.switchFrom === main.id), '주력 계약 업그레이드 보장 — ' + nx);
});
t('자유 런 캠페인: 마켓의 1회성 권 — 쓰면 없어지고, 캠페인 물량·캠페인 중 반송은 벌점이 더 크다', () => {
  const g = NG(75); assert.ok(g.adTicketMode()); assert.deepEqual(g.ownedMedia(), ['flyer'], '전단지 한 장으로 시작');
  const items = g._adAndGrowthItems(1); assert.ok(items.some(it => it.kind === 'adTicket') && !items.some(it => it.kind === 'media' || it.kind === 'mediaUp'), '매체 계약·강화 대신 권');
  const r = g.runCampaign('flyer'); assert.ok(r.ok); assert.equal(g.adTickets.flyer, 0); assert.deepEqual(g.ownedMedia(), [], '한 번 쓰면 끝');
  assert.ok(g.schedule.flat().some(sp => sp.ad), '캠페인 물량 표시');
  assert.ok(!g.campaignPlan('flyer').ready, '권이 없으면 못 건다');
  g.phase = 'market'; g.market = { items: [{ kind: 'adTicket', media: 'sns', price: 10, name: 'x', sold: false }], bought: 0, refreshes: 0 }; g.cash = 100;
  assert.ok(g.buy(0).ok); assert.equal(g.adTickets.sns, 1);
});
t('휴무 특약: 쉬는 날에도 그 계약만 부를 수 있고, 그날 배차비 ×1.8 · 강화 칸 하나', () => {
  const g = EMPTY(21); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.parcels = [P(1, 'normal', 2)]; const fee0 = g.truckFee(c);
  g.isOffTurn = () => true;
  assert.ok(!g.canCall(c), '특약 없으면 휴무'); assert.ok(!g.callCarrier(i, [1]).ok);
  const used = g.enhUsed(c); c.enh.holiday = true; assert.equal(g.enhUsed(c), used + 1); assert.ok(g.enhList(c).includes('holiday'));
  assert.ok(g.canCall(c), '특약이 있으면 부를 수 있다'); assert.equal(g.truckFee(c), Math.round(fee0 * D.ENHANCEMENTS.holiday.feeMult));
  const r = g.callCarrier(i, [1]); assert.ok(r.ok, '휴무일 호출');
  g.isOffTurn = () => false; assert.equal(g.truckFee(c), fee0, '평일엔 할증 없음');
});
t('⚡ 긴급 화물(새벽배송): 기한은 들어온 날 — 그날 ×2, 놓치면 벌점 없이 ×½, 유예가 끝나면 반송', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  const sp = g._spawnParcel({ type: 'normal', size: 1, rush: true }); assert.ok(sp.rush && !sp.noDeadline && sp.deadline === 1, '기한 하루');
  const base = D.PARCEL_TYPES.normal.reward[1];
  g.parcels = [P(1, 'normal', 1, { rush: true, deadline: 1 })];
  assert.equal(g.previewReward(c, g.parcels[0]), base * 2, '미리보기도 ×2');
  let r = g.callCarrier(i, [1]); assert.equal(r.revenue, Math.round(base * 2 * g.rules.revenueMult), '당일 ×2');
  const rep0 = g.rep;
  g.parcels = [P(2, 'normal', 1, { rush: true, deadline: 0, overdue: true, overdueTurns: 0 })];
  assert.equal(g.repDeltaFor(g.parcels), 0, '놓친 긴급은 평판 벌점 없음');
  r = g.callCarrier(i, [2]); assert.equal(r.revenue, Math.round(Math.round(base * 0.5) * g.rules.revenueMult), '놓치면 ×½ (초과 ×0.75 는 겹치지 않는다)');
  const t0 = g.trust.bulk0; assert.ok(g.trust.bulk0 >= t0);
  const ng = NG(5); let n = 0; for (let k = 0; k < 400; k++) if (ng._genParcelSpec({ normal: 1 }, 1, null).rush) n++;
  assert.ok(n > 20 && n < 90, '자유 런 일반 택배의 약 12% — ' + n);
});
t('신뢰도: 차 한 대에 실은 택배 점수 평균(−2~+2) — 들어오자마자 +2 · 여유 있게 +1 · 기한 맞춰 0 · 늦으면 −2 (꽉 채우기와 무관), 특성은 업체마다 다름', () => {
  const g = EMPTY(2); const i = slot(g, 'bulk'), c = g.contracts[i];
  g.parcels = [P(1, 'normal', 1, { deadline0: 4, deadline: 4 })]; g.callCarrier(i, [1]); assert.equal(g.trust.bulk0, 2, '들어온 날 한 개 → +2 (반 차여도)');
  g.parcels = [P(2, 'normal', 2, { deadline0: 4, deadline: 1 }), P(3, 'normal', 2, { deadline0: 4, deadline: 1 }), P(4, 'normal', 2, { deadline0: 4, deadline: 1 })]; g.callCarrier(i, [2, 3, 4]); assert.equal(g.trust.bulk0, 2, '기한 맞춰 꽉 채워도 0');
  g.parcels = [P(5, 'normal', 2, { deadline0: 4, deadline: 2 }), P(6, 'normal', 2, { deadline0: 4, deadline: 2 })]; g.callCarrier(i, [5, 6]); assert.equal(g.trust.bulk0, 3, '여유 있게 둘 → 평균 +1');
  g.parcels = [P(7, 'normal', 2, { deadline0: 4, deadline: 0, overdue: true }), P(8, 'normal', 2, { deadline0: 4, deadline: 0, overdue: true })]; g.callCarrier(i, [7, 8]); assert.equal(g.trust.bulk0, 1, '늦은 둘 → 평균 −2');
  assert.equal(g.trustGainPreview(c, [P(9, 'normal', 2, { deadline0: 4, deadline: 4 }), P(10, 'normal', 2, { deadline0: 4, deadline: 0, overdue: true })]).xp, 0, '미리보기도 같은 셈');
  const cc = g.contracts[slot(g, 'cold')]; const cap0 = g.vehicleCap(cc); g._addTrust('cold0', 8); assert.equal(g.vehicleCap(cc), cap0 + 2);
  const cold0 = g.warehouse.cold; g._addTrust('cold0', 60); assert.equal(g.trustLevel('cold0'), 3); assert.equal(g.warehouse.cold, cold0 + 2);
  assert.equal(D.trustEffectText('cold', 1), '용량 +2칸'); assert.equal(D.trustEffectText('rail', 2), '배차 +1대');
});
t('센터: 상위 tier 센터 = 다른 센터와 신규 계약 (배차 +2·용량 +1·배차비 +20%, 신뢰도는 센터별 새로 시작), 복합 능력', () => {
  const g = EMPTY(3); const c = g._makeContract('bulk', 'trusted'); g.contracts[3] = c;
  assert.equal(c.carrier, 'bulk1'); assert.equal(c.grade, 'trusted'); assert.equal(g.trustLevel('bulk1'), 0); assert.equal(c.maxCalls, Math.round((7 + 2) * D.CALLS_SCALE)); assert.equal(g.vehicleCap(c), 6 + 1 + 1); assert.equal(g.truckFee(c), Math.round(D.FAMILIES.bulk.fee * 1.2)); assert.ok(g.truckFee(c) > D.FAMILIES.bulk.fee, '상위 센터는 배차비가 오른다');
  assert.equal(D.CARRIERS.bulk1.name, '빠른손 익스프레스'); assert.equal(D.GRADES.trusted.name, '프리미엄');
  const e = g._makeContract('bulk2'); assert.ok(g.contractCaps(e).includes('fragile')); assert.ok(!('express' in D.ENHANCEMENTS), '동시 배차 강화 없음');
  assert.ok(g.contractCaps(g._makeContract('cold2')).includes('frozen')); assert.equal(D.CARRIERS.rail1.delay, 0);
});
t('운영비 내역: 임대 120 + 계약 10/슬롯 + 시설 유지비', () => { const g = EMPTY(2); const n = g.contracts.filter(Boolean).length; let b = g.opCostBreakdown(1); assert.equal(b.rent, 120); assert.equal(b.contracts, n * 10); assert.equal(b.total, 120 + n * 10 + b.facilities); g.contracts[0].grade = 'expert'; assert.equal(g.opCostBreakdown(1).contracts, (n - 1) * 10 + 60); g.contracts[0].grade = 'normal'; g.warehouse.cold1 = true; assert.equal(g.opCostBreakdown(1).facilities, b.facilities + 15); });
t('보상표: 종류·크기별, 특수가 확실히 높다', () => { assert.equal(D.PARCEL_TYPES.normal.reward[2], 35); assert.equal(D.PARCEL_TYPES.fresh.reward[2], 60); assert.equal(D.PARCEL_TYPES.intl.reward[4], 110); const g = NG(2); for (const p of g.parcels) assert.equal(p.reward, g.baseReward(p.type, p.baseSize) * (p.premium ? 1.5 : 1)); });
t('기한: 일반 4·파손 5·통관 5·대형 6·냉동 5, 반송 유예 2', () => { assert.equal(D.PARCEL_TYPES.normal.deadline, 4); assert.equal(D.PARCEL_TYPES.fragile.deadline, 5); assert.equal(D.PARCEL_TYPES.large.deadline, 6); assert.equal(D.RETURN_GRACE, 2);
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.parcels = [P(1, 'normal', 1, { deadline: 1 })]; adv(g); assert.ok(g.parcels[0].overdue); adv(g); assert.equal(g.parcels.length, 1); adv(g); assert.equal(g.parcels.length, 0); assert.equal(g.stats.returned, 1); });
t('고객 품목 해금: 0단계는 일반 85%, 2단계는 고객 정의, 3단계는 프리미엄 품목', () => {
  const g = NG(3, { legacyCustomers: true }); // 동네 택배: 새벽마켓 0단계
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
t('재계약: 몇 대가 남았든 같은 값에 가득 — 본래 대수 × 기본 배차비 절반. 부를 때 배차비는 그대로. 한도 강화·신뢰로 값이 안 바뀐다', () => {
  const g = EMPTY(9); const b = slot(g, 'bulk'), c = g.contracts[b]; c.calls = 2; while (g.phase === 'play') adv(g); g.closeSummary(); g.cash = 9999;
  const it = g.market.items.find(x => x.kind === 'refill' && x.contractId === c.id); assert.ok(it);
  const base = D.CARRIERS[c.carrier].trucks, fee = g.truckFee(c);
  assert.equal(it.price, Math.round(base * g.baseTruckFee(c) * 0.5));
  const c1 = c.calls; c.calls = 0; assert.equal(g.refillPrice(c), it.price, '남은 대수와 상관없다'); c.calls = c1;
  const keepMax = c.maxCalls; c.maxCalls += 2; assert.equal(g.refillPrice(c), it.price, '한도 강화로 값이 안 오른다'); c.maxCalls = keepMax;
  const keep = g.trust[c.carrier]; g.trust[c.carrier] = 999; assert.equal(g.refillPrice(c), it.price, '신뢰로 값이 안 바뀐다'); g.trust[c.carrier] = keep;
  const cash0 = g.cash; const r = g.buy(g.market.items.indexOf(it), null); assert.ok(r.ok); assert.equal(r.wasted, 2);
  assert.equal(c.calls, c.maxCalls); assert.equal(g.cash, cash0 - it.price);
  // 재계약은 따로 드는 비용(만차 수입의 25%) — 부를 때 배차비(50%)는 그대로 낸다: 강화 없으면 비용 75%
  assert.equal(g.callFee(c, 1), fee);
  assert.ok(!g.refill(c.id).ok); g.closeMarket(); assert.equal(c.calls, c.maxCalls);
  const h = EMPTY(9); const hc = h.contracts[slot(h, 'bulk')]; hc.calls = 0; while (h.phase === 'play') adv(h); h.closeSummary(); h.closeMarket(); assert.equal(hc.calls, 0);
});
t('계약 교체(갈아타기): 같은 계열 상위 센터로 바꾸면 강화·신뢰가 따라가고 배차는 가득 · 다른 슬롯 교체는 새로', () => {
  const g = EMPTY(9); g.trust.bulk0 = 5; while (g.phase === 'play') adv(g); g.closeSummary(); g.cash = 9999;
  const b = slot(g, 'bulk'); const old = g.contracts[b]; old.enh.cap = 1; old.enh.capDelta = 1; old.maxCalls += 1;
  g.market.items.push({ kind: 'contract', carrier: 'bulk1', grade: 'trusted', price: 100, name: 'x', sold: false, switchFrom: old.id });
  assert.ok(g.buy(g.market.items.length - 1, b).ok); const nc = g.contracts[b];
  assert.equal(nc.carrier, 'bulk1'); assert.equal(nc.enh.cap, 1); assert.equal(g.trust.bulk1, 5); assert.equal(g.trust.bulk0, 5); assert.equal(nc.calls, nc.maxCalls); assert.equal(nc.maxCalls, g._makeContract('bulk1').maxCalls + 1);
  // switchFrom 없이(다른 업체로 교체) 는 강화가 안 따라간다
  g.market.items.push({ kind: 'contract', carrier: 'bulk2', grade: 'expert', price: 100, name: 'y', sold: false });
  assert.ok(g.buy(g.market.items.length - 1, b).ok); assert.equal(g.contracts[b].enh.cap, 0);
});
t('공간 최적화: 크기 4 이상이 창고에서만 -1칸 (트럭 적재 크기는 그대로)', () => { const g = NG(2, { perks: ['compact', 'insure'] }); const big = { id: 999, type: 'large', size: 4, baseSize: 4, attrs: [] }; assert.equal(g.storeSize(big), 3); assert.equal(big.size, 4); for (const p of g.parcels) { assert.equal(p.size, p.baseSize); assert.equal(g.storeSize(p), p.baseSize >= 4 ? p.baseSize - 1 : p.baseSize); } });
t('창고 초과 페널티', () => { const g = NG(11); g.warehouse.cap = 0; for (let i = 0; i < 4; i++) g.parcels.push(P(700 + i, 'normal', 2)); const s0 = g.rep; adv(g); assert.ok(g.rep < s0); });
t('신선: 냉장 안이면 기한만 진행, 밖이면 1턴 뒤 폐기(+2)', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.warehouse.cold = 2;
  g.parcels = [P(900, 'fresh', 2), P(901, 'fresh', 2)]; g._assignCold(); assert.ok(g.parcels[0].inCold && !g.parcels[1].inCold);
  const s0 = g.rep; adv(g); assert.equal(g.parcels.length, 1); assert.equal(g.parcels[0].deadline, 2); assert.equal(g.rep, s0 - 2); assert.equal(g.stats.discarded, 1);
});
t('통관: 대기 중 기한 정지·일반 업체 불가, 통관 대행은 가능', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] });
  const p = g._spawnParcel({ type: 'intl', size: 4 }); g.parcels.push(p); g._assignCold();
  assert.ok(p.customs >= 2); const bulk = g.contracts[slot(g, 'bulk')];
  assert.ok(!g.canHandle(bulk, p)); g.contracts[3] = g._makeContract('intl', 'normal'); assert.ok(g.canHandle(g.contracts[3], p));
  const d = p.deadline; adv(g); assert.equal(p.deadline, d);
});
t('통관 대행 신뢰 1단계: 통관 대기 -1', () => { const g = EMPTY(4); g.contracts[3] = g._makeContract('intl', 'normal'); g.trust.intl0 = 8; g.rules.customsDelayProb = 0; const p = g._spawnParcel({ type: 'intl', size: 4 }); assert.equal(p.customs, 1); });
t('냉동: 냉동 구역 없으면 즉시 폐기, 냉동 물류만 처리, 구역보다 큰 냉동은 오지 않음', () => {
  const g = EMPTY(4, { perks: ['skip', 'longdeal'] }); g.warehouse.frozen = 2; g.schedule[g.turn] = [{ type: 'frozen', size: 2 }, { type: 'frozen', size: 2 }];
  const s0 = g.rep; adv(g); assert.equal(g.parcels.filter(p => p.type === 'frozen').length, 1); assert.equal(g.rep, s0 - 2);
  const p = g.parcels.find(p => p.type === 'frozen'); assert.ok(!g.canHandle(g.contracts[slot(g, 'cold')], p)); g.contracts[3] = g._makeContract('frozen', 'normal'); assert.ok(g.canHandle(g.contracts[3], p));
  const h = new Game({ seed: 3, company: 'fresh' }); for (const sp of h.schedule.flat()) if (sp.type === 'frozen') assert.ok(sp.size <= h.warehouse.frozen);
});
t('파손: ⚠ 능력 없는 업체(철도 제외)는 25% 파손, 프래자일·특약은 0%', () => {
  const g = EMPTY(4); const bulk = g.contracts[slot(g, 'bulk')], fr = g.contracts[slot(g, 'fragile')];
  const p = { id: 1, type: 'fragile', size: 2, attrs: ['fragile'] };
  assert.equal(g.breakProb(bulk, p), 0.25); assert.equal(g.breakProb(fr, p), 0); bulk.enh.opt = 'optFragile'; assert.equal(g.breakProb(bulk, p), 0);
});
t('지연 입금은 어음: 철도(포워더)는 다음 정산(보름 뒤)에 현금, 신뢰 1단계면 즉시', () => {
  const g = EMPTY(4); g.contracts[3] = g._makeContract('rail', 'normal'); g.parcels = [P(1, 'normal', 2)];
  const cash = g.cash; const r = g.callCarrier(3, [1]); assert.ok(r.ok, r.msg); assert.equal(r.delay, 1); assert.equal(g.cash, cash); assert.equal(g.feesDue, r.fee);
  adv(g); assert.equal(g.cash, cash, '다음 턴에는 아직 안 들어온다 — 어음이다'); assert.equal(g.pendingRevenue[0].due, 2, '만기는 다음 사이클 정산');
  g.cash = 5000; while (g.phase === 'play') adv(g); assert.equal(g.summary.notesPaid, 0, '이번 정산엔 만기가 아니다'); assert.equal(g.summary.notesLeft, r.revenue);
  g.closeSummary(); g.closeMarket(); g.schedule = g.schedule.map(() => []); g.parcels = []; g.rep = g.repCap(); g.cash = 5000; while (g.phase === 'play') adv(g); assert.equal(g.summary.notesPaid, r.revenue, '다음 사이클 정산에 만기'); assert.equal(g.summary.notesCount, 1);
  const h = EMPTY(4); h.contracts[3] = h._makeContract('rail', 'normal'); h.trust.rail0 = 6; h.parcels = [P(2, 'normal', 2)]; const r2 = h.callCarrier(3, [2]); assert.ok(r2.ok, r2.msg); assert.equal(r2.delay, 0, '신뢰 1단계 특성: 즉시 입금');
});
t('월말 정산 → 마켓 → 다음 달, 배차비는 정산에', () => {
  const g = EMPTY(9); g.parcels = [P(1, 'normal', 1)]; g.callCarrier(slot(g, 'bulk'), [1]); while (g.phase === 'play') adv(g);
  assert.equal(g.phase, 'summary'); assert.equal(g.summary.fees, D.FAMILIES.bulk.fee); g.closeSummary(); assert.equal(g.phase, 'market'); g.closeMarket(); assert.equal(g.month, 2);
  for (const c of g.contracts) if (c) assert.ok(c.calls <= c.maxCalls);
});
t('마켓 구매 개수 제한 없음 — 돈이 있으면 다 살 수 있다', () => { const g = EMPTY(9); while (g.phase === 'play') adv(g); g.closeSummary(); g.cash = 99999; let bought = 0, fail = 0;
  for (let i = 0; i < g.market.items.length; i++) { const it = g.market.items[i]; if (it.sold || it.kind === 'refill' || it.kind === 'contract') continue; const r = g.buy(i, it.kind === 'enh' ? g.contracts.findIndex(Boolean) : null); if (r.ok) bought++; else if (/까지만/.test(r.msg)) fail++; }
  assert.equal(fail, 0); });
t('저장/불러오기 후 결정적 진행', () => {
  const a = NG(21); for (let i = 0; i < 3 && a.phase === 'play'; i++) adv(a); const json = JSON.stringify(a.toJSON()); const b = Game.fromJSON(JSON.parse(json));
  for (let i = 0; i < 4; i++) { if (a.phase === 'play') adv(a); if (b.phase === 'play') adv(b); } a.takeEvents(); b.takeEvents(); assert.equal(JSON.stringify(a.toJSON()), JSON.stringify(b.toJSON()));
});
t('평판 0 → 게임오버(아무도 안 맡긴다)', () => { const g = EMPTY(1); g.rep = 1; g.warehouse.cap = 0; g.parcels = [P(1, 'normal', 2), P(2, 'normal', 2), P(3, 'normal', 2)]; g._assignCold(); adv(g); assert.equal(g.phase, 'over'); });
t('회사별 시작 상태', () => { for (const id in M.COMPANIES) { const g = new Game({ seed: 2, company: id }); assert.ok(g.cash > 0, id); assert.ok(g.contracts.filter(Boolean).length >= 2, id); } const q = new Game({ seed: 2, company: 'quick' }); assert.equal(q.selfCount(), 2); const th = new Game({ seed: 2, company: 'thrifty' }); assert.equal(th.rules.feeMult, 0.8); const po = new Game({ seed: 2, company: 'postal' }); assert.equal(po.truckFee(po.contracts[1]), 35); });
t('런 = 나라 달력 × 시작 달 × 길이: 분기 6·반기 12·한 해 24사이클, 점수 배율, 기본은 봄', () => {
  assert.equal(new Game({ seed: 1 }).cfg.scenario, 'kr_spring');
  assert.equal(new Game({ seed: 1, scenario: 'standard' }).cfg.scenario, 'kr_spring', '옛 세이브 id 는 새 런으로'); assert.equal(new Game({ seed: 1, scenario: 'kr_h2' }).cfg.scenario, 'kr_autumn', '없앤 반기 런은 계절 런으로'); assert.ok(!M.SCENARIOS.kr_h1 && !M.SCENARIOS.kr_year, '반기·한 해는 없다'); assert.equal(new Game({ seed: 1, scenario: 'peak' }).cfg.scenario, 'kr_spring');
  for (const [id, months, start, mult] of [['kr_spring', 6, 3, 1], ['kr_winter', 6, 12, 1], ['kr_autumn', 6, 9, 1]]) { const g = new Game({ seed: 1, scenario: id }); assert.equal(g.rules.months, months, id); assert.equal(g.calMonth(1), start, id); assert.equal(g.rules.scoreMult, mult, id); assert.equal(g.rules.calendar, 'kr'); }
    for (const id in M.SCENARIOS) { const u = M.SCENARIOS[id].unlock; assert.ok(!u || M.ACHIEVEMENTS[u], id + ' 해금 도전과제가 있어야 한다'); }
  assert.ok(!M.DIFFICULTIES && !M.DAILY_VARIANTS, '난이도·데일리는 없다');
});
t('공휴일은 실제 날짜: 2026 추석 9/24~26 + 앞 닷새 폭주, 2027 설은 일요일 겹침 → 대체공휴일, 3·1절 단일 휴무', () => {
  const ev = (sc, y) => { const g = new Game({ seed: 1, scenario: sc, year: y }); const out = []; for (let c = 1; c <= g.rules.months; c++) for (const e of g.holidayEvents(c)) out.push([g.calMonth(c), e.id, g.dateOf(e.turns[0], c), g.dateOf(e.turns[1], c), e]); return out; };
  const a = ev('kr_autumn', 2026);
  const off = a.find(x => x[1] === 'chuseok'), rush = a.find(x => x[1] === 'chuseok_rush');
  assert.deepEqual(off.slice(0, 4), [9, 'chuseok', 24, 26]); assert.ok(off[4].noCalls);
  assert.deepEqual(rush.slice(0, 4), [9, 'chuseok_rush', 18, 23]); assert.equal(rush[4].turns[1] - rush[4].turns[0] + 1, 5); assert.equal(rush[4].arrivalsMult, 1.6); assert.equal(rush[4].deadlineDelta, -1);
  assert.ok(a.some(x => x[1] === 'foundation' && x[0] === 10 && x[2] === 3) && a.some(x => x[1] === 'hangul' && x[2] === 9));
  const w = ev('kr_winter', 2026);   // 12월 시작 → 2027년 2월 설(2/6 토): 5~7 연휴, 7일 일요일 → 8일 대체
  const seol = w.find(x => x[1] === 'seol'); assert.deepEqual(seol.slice(0, 4), [2, 'seol', 5, 8]); assert.equal(seol[4].turns[1] - seol[4].turns[0] + 1, 3);
  assert.ok(w.some(x => x[1] === 'christmas' && x[0] === 12 && x[2] === 25) && w.some(x => x[1] === 'newyear' && x[0] === 1));
  const sp = ev('kr_spring', 2027); assert.deepEqual(sp[0].slice(0, 4), [3, 'samil', 1, 1]); assert.ok(sp.some(x => x[1] === 'buddha' && x[0] === 5 && x[2] === 13));
  const g = new Game({ seed: 1, scenario: 'kr_autumn', year: 2026 }); g.month = 2; g._bdCache = null; assert.ok(g.isOffTurn(8) && g.isRushTurn(4) && !g.isOffTurn(2), '이벤트 조회에 잡힌다');
  const camp = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 1, prep: false });
  assert.equal(camp.holidayEvents(1).length, 0, '캠페인은 공휴일 없이 돈다 (대본이 턴 번호로 짜여 있다)');
});
t('직접 배송: 하루를 넘기지 않고 보름에 1회, 보상 그대로 + 배송비 크기×5c, 배송 기사 +1회', () => {
  const g = EMPTY(8); for (let i = 0; i < 4; i++) g.parcels.push(P(900 + i, 'normal', 1));
  assert.equal(g.selfCount(), 1); assert.equal(g.selfTripsLeft(), 1); assert.ok(!g.selfShip([900, 901]).ok);
  const turn = g.turn, cash = g.cash; const r = g.selfShip([900]); assert.ok(r.ok); assert.equal(g.turn, turn); assert.equal(g.cash, cash + 25); assert.equal(g.feesDue, 5); assert.equal(g.parcels.length, 3); assert.equal(g.stats.selfCalls, 1);
  assert.equal(g.selfTripsLeft(), 0); assert.ok(!g.selfShip([901]).ok);
  g.warehouse.driver = true; assert.equal(g.selfTripsLeft(), 1); assert.ok(g.selfShip([901]).ok); assert.equal(g.selfTripsLeft(), 0);
  g.warehouse.bigvan = true; assert.equal(g.selfCount(), 2);
});
t('강화 칸: 등급만큼 아무 강화나, 특약도 여러 개, 칸이 차면 거절', () => {
  const g = EMPTY(4); const c = g._makeContract('bulk', 'normal'); g.contracts = [c, null, null, null];
  assert.equal(g.enhSlots(c), D.ENH_SLOTS.normal); assert.equal(g.enhUsed(c), 0);
  g.phase = 'market'; g.cash = 99999;
  const mk = ids => { g.market = { items: ids.map(e => ({ kind: 'enh', enh: e, price: 1, name: e, sold: false })) }; };
  mk(['limit1', 'limit1', 'optFragile']);
  assert.ok(g.buy(0, 0).ok); assert.ok(g.buy(1, 0).ok); assert.equal(g.enhUsed(c), 2); assert.equal(c.enh.limit, 2);
  const r = g.buy(2, 0); assert.ok(!r.ok);                     // 2칸 다 참
  const t = g._makeContract('cold', 'trusted'); g.contracts[1] = t; assert.equal(g.enhSlots(t), 3);
  mk(['optFragile', 'optCustoms', 'cap1']);
  assert.ok(g.buy(0, 1).ok); assert.ok(g.buy(1, 1).ok); assert.ok(g.buy(2, 1).ok);
  assert.ok(g.contractCaps(t).includes('fragile') && g.contractCaps(t).includes('customs')); assert.equal(g.enhUsed(t), 3);
});
t('마켓 막힌 속성 보장: 처리 못 하는 특수 택배가 있으면 슬롯 A에 처리 가능한 업체', () => {
  let hit = 0; for (let s = 1; s <= 30; s++) { const g = EMPTY(s); g.contracts = [g._makeContract('bulk', 'normal'), null, null, null]; g.parcels = [P(1, 'frozen', 2, { inFrozen: true, deadline: 99 })]; g.warehouse.frozen = 4; g._assignCold();
    while (g.phase === 'play') adv(g); if (g.phase !== 'summary') continue; g.closeSummary(); const it = g.market.items[0]; if (it.kind === 'contract' && it.hint && D.CARRIERS[it.carrier].caps.includes('frozen')) hit++; }
  assert.ok(hit >= 20, 'hit ' + hit);
});
t('고객: 입고 배정·신뢰 xp·손해배상·거래 중단', () => {
  const g = EMPTY(3, { perks: ['skip', 'longdeal'], legacyCustomers: true }); assert.ok(g.customers.mart && g.customerLevel('mart') === 1);
  g.parcels = [P(5, 'normal', 1, { customer: 'glass' })]; g.callCarrier(slot(g, 'bulk'), [5]); assert.equal(g.customers.glass.xp, 1);
  g.parcels = [P(6, 'fragile', 2, { deadline: 1, customer: 'glass' })]; const cash = g.cash; adv(g); adv(g); adv(g);
  assert.equal(g.stats.returned, 1); assert.equal(cash - g.cash, 60 * 2); assert.ok(g.customers.glass.suspended); assert.ok(!('glass' in g._customerWeightsFor(1)));
});
t('고객 규칙: 새벽배송(입고 당 턴 처리 +20)', () => { const g = EMPTY(3, { legacyCustomers: true }); g.parcels = [P(7, 'normal', 1, { customer: 'dawn', arrivalTurn: g.totalTurn })]; const r = g.callCarrier(slot(g, 'bulk'), [7]); assert.equal(r.revenue, 25 + 20); assert.equal(g.customers.dawn.xp, 2); });
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
  const h = EMPTY(3, { insurer: 'premier', perks: ['skip', 'longdeal'] }); h.parcels = [P(6, 'normal', 1, { deadline: 1 })]; const rep0 = h.rep; adv(h); adv(h); adv(h); assert.equal(h.stats.returned, 1); assert.equal(h.rep, rep0); // 기한 초과 자체는 감점 0, 프리미어는 반송 −2 면제
  while (h.phase === 'play') adv(h); h.closeSummary(); assert.ok(h.setInsurer('coldguard').ok); assert.equal(h.insurer, 'coldguard');
});
t('보관 계약: 수락 → 점유 → 회수 xp +2, 조기 반환 위약금', () => {
  const g = new Game({ seed: 7, company: 'thrifty', perks: [], legacyCustomers: true }); g.schedule = g.schedule.map(() => []); g.parcels = [];
  g.offer = { id: 500, kind: 'move', vol: 8, turns: 2, fee: 80, perTurn: 0, customer: 'mover', expires: 99 };
  const cash = g.cash; assert.ok(g.acceptOffer().ok); assert.equal(g.cash, cash + 80); assert.equal(g.usedVolume(), 8);
  const xp = g.customers.mover.xp; adv(g); adv(g); assert.equal(g.storage.length, 0); assert.equal(g.customers.mover.xp, xp + 2);
});
t('적재: 기본은 덜 급한 것부터 야외, 지정 가능', () => { const g = EMPTY(4); g.warehouse.cap = 4; g.parcels = [P(1, 'normal', 2, { deadline: 1 }), P(2, 'normal', 2, { deadline: 5 }), P(3, 'normal', 2, { deadline: 3 })]; g._assignCold(); assert.deepEqual(g.parcels.map(p => !!p.outdoor), [false, true, false]); g.setOutdoor([1]); assert.deepEqual(g.parcels.map(p => !!p.outdoor), [true, false, false]); });
t('난이도 없음: 자유 런은 기본 규칙, 캠페인만 장 공통 보정(예정 3턴·평판 24·배차비 ×0.8)', () => { const f = new Game({ seed: 3 }); assert.equal(f.rules.gameoverStress, D.GAMEOVER_STRESS); assert.equal(f.rules.feeMult, 1); assert.equal(f.rules.upcomingTurns, 2); assert.ok(!f.difficulty); const c = new Game({ seed: 3, scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 2, prep: false }); assert.equal(c.rules.upcomingTurns, 3); assert.equal(c.rules.gameoverStress, 24); assert.equal(c.rules.feeMult, 0.8); assert.ok(c.rules.noHolidays); });
t('준비 마켓', () => { const g = new Game({ seed: 3, prep: true }); assert.equal(g.phase, 'market'); assert.ok(g.market.prep); g.closeMarket(); assert.equal(g.turn, 1); });
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
t('턴 종료 UX: 차를 안 부르고 넘기는 버튼은 「호출 없음」 — 다음 입고를 받는다는 걸 같이 말한다', () => {
  assert.equal(KO.ui['wait.btnPlain'], '📦 호출 없음');
  assert.ok(KO.ui['wait.next'].includes('다음 입고')); assert.ok(KO.ui['wm.justWait'].includes('다음 입고 받기'));
  assert.ok(KO.ui['help.body'].includes('<b>호출 없음</b>')); assert.ok(EN.ui['wait.btnPlain'].includes('No call'));
  assert.ok(!Object.values(KO.ui).some(v => typeof v === 'string' && v.includes('오늘 마감')), '「오늘 마감」이 남아 있다');
});
t('i18n: ko/en data·meta 텍스트 필드 모양이 일치', () => {
  const walk = (a, b, p) => { for (const k in a) { assert.ok(k in b, 'en 누락: ' + p + '.' + k); if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k])) walk(a[k], b[k], p + '.' + k); } for (const k in b) assert.ok(k in a, 'ko 누락: ' + p + '.' + k); };
  walk(KO.data, EN.data, 'data'); walk(KO.meta, EN.meta, 'meta');
});
t('i18n: 자리표시자·복수형·메시지 객체 렌더링', () => {
  assert.equal(I18n.lang, 'ko');
  assert.equal(I18n.t('log.monthStart', { m: 2, y: 2026, cal: 4, half: 1 }), '── 2026년 4월 전반 시작 ──');
  assert.equal(I18n.t('log.monthStart', { m: 2, y: 2026, cal: 4, half: 2 }), '── 2026년 4월 후반 시작 ──');
  assert.equal(I18n.t('ps.deadline', { n: 4 }), '⏳ <b>4</b>일');                       // 1턴 = 하루
  assert.equal(I18n.t('story.intro.3', { name: '한길 물류', fee: 38 }).slice(0, 60).includes('한길 물류는'), true); // 조사 자동 선택
  assert.equal(I18n.text({ k: 'log.penalty', p: { pen: 2, reasons: [{ k: 'r.overdue', p: { short: '일반' } }, { k: 'r.stolenInsured' }], rep: 5 } }), '평판 −2: 기한 초과 일반, 도난 (보험 적용) (평판 5)');
  assert.equal(I18n.text('옛 세이브 문자열'), '옛 세이브 문자열');
  assert.ok(I18n.setLang('en'));
  assert.equal(I18n.t('fmt.calls', { n: 1 }), '1 call'); assert.equal(I18n.t('fmt.calls', { n: 3 }), '3 calls');
  assert.equal(D.PARCEL_TYPES.fresh.name, 'Fresh Food'); assert.equal(M.COMPANIES.local.name, 'Local Parcel'); assert.equal(D.trustEffectText('cold', 2), 'fresh/produce deadlines freeze on call days');
  assert.ok(I18n.setLang('ko')); assert.equal(D.PARCEL_TYPES.fresh.name, '신선식품');
});
// ----- 달력 (docs/STORY_TUTORIAL_DESIGN.md 5장) -----
t('시간: 1턴 = 하루, 일요일 휴무, 진짜 달력(반월 정산)', () => {
  const g = NG(5, { year: 2027 });   // 2027년 3월 1일은 월요일
  assert.equal(D.CYCLES_PER_MONTH, 2); assert.equal(D.HALF_SPLIT, 15);
  assert.equal(g.year, 2027);
  assert.equal(g.dowOfDate(1, 1), 0); assert.equal(g.dowOfDate(1, 7), 6);        // 3월 7일이 일요일
  assert.deepEqual(g.cycleWindow(1), [1, 15]); assert.deepEqual(g.cycleWindow(2), [16, 31]);
  assert.deepEqual(g.businessDays(1), [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15]);
  assert.equal(g.turns(1), 13); assert.equal(g.turns(2), 14);
  assert.equal(g.dateOf(7, 1), 8);
  assert.ok(g.isWeekendAfter(6, 1) && !g.isWeekendAfter(5, 1));
  assert.equal(g.monthIndex(1), 1); assert.equal(g.monthIndex(3), 2); assert.equal(g.half(2), 2);
  assert.equal(g.calMonth(1), 3); assert.equal(g.calMonth(3), 4); assert.equal(g.calMonth(24), 2);
  assert.equal(g.yearOf(1), 2027); assert.equal(g.yearOf(21), 2028);
  assert.equal(g.dateLabel(4, 1), '3월 4일');
  // 로그라이크: 해가 다르면 요일도 영업일 수도 다르다. 윤년의 2월은 29일
  const h = NG(5, { year: 2026 });   // 2026년 3월 1일은 일요일
  assert.equal(h.turns(1), 12); assert.notDeepEqual(h.businessDays(1), g.businessDays(1));
  const leap = NG(5, { year: 2027 }); leap.month = 24;           // 12개월차 = 이듬해 2월(2028, 윤년)
  assert.equal(leap.monthLen(24), 29);
});
t('대본 런은 해가 고정된다 (인수인계는 매번 같은 달력)', () => {
  const a = new Game({ seed: 1, scripted: true, scenario: 'quarter', story: true });
  assert.equal(a.year, require('../www/js/tutorial.js').YEAR); assert.equal(a.turns(1), a.schedule.length);
});('주말: 턴이 아니다 — 기한·입고는 멈추고 야외 도난만 한 번 더', () => {
  const g = EMPTY(6); g.parcels = [P(1, 'normal', 2, { deadline: 12 })];
  for (let i = 0; i < 6; i++) g.wait();
  assert.equal(g.phase, 'weekend'); assert.equal(g.turn, 6);   // 3월 6일(토) 다음은 7일 일요일
  const dl = g.parcels[0].deadline, self = g.selfCount();
  // 야근: 다음 영업일에만 직접 배송 +2
  g.weekendChoose('overtime');
  assert.equal(g.phase, 'play'); assert.equal(g.turn, 7);
  assert.equal(g.parcels[0].deadline, dl);                 // 기한은 영업일 기준 — 일요일엔 안 준다
  assert.equal(g.selfCount(), self + 2);
  g.wait(); assert.equal(g.selfCount(), self);             // 하루만
  // 둘째 일요일(12턴) 다음은 월말 정산
  const h = EMPTY(7); h.rep = 5;
  for (let i = 0; i < 6; i++) h.wait();
  h.weekendChoose('rest'); assert.equal(h.rep, 6);        // 휴식 = 평판 +1
  while (h.phase === 'play') { h.wait(); if (h.phase === 'weekend') h.weekendChoose('rest'); }
  assert.equal(h.phase, 'summary');                        // 그 사이클 마지막 영업일 뒤엔 정산
});
t('달력: 한국 3월 시작. 2026 추석(9/24~26) 앞 닷새 폭주 → 연휴엔 호출 불가, 입고는 계속', () => {
  const g = NG(7, { noHolidays: false, year: 2026 }); assert.equal(g.calMonth(1), 3); assert.equal(g.calMonth(24), 2);
  g.month = 12; g._startMonth(14); assert.equal(g.calMonth(), 9); assert.equal(g.half(), 2);   // 9월 후반 사이클: 16(수)…30(수), 일요일 20·27 제외 → 18~23일이 3~7턴, 24~26일이 8~10턴
  assert.ok(g.isRushTurn(3) && g.isRushTurn(7) && !g.isRushTurn(2) && !g.isRushTurn(8)); assert.ok(g.isOffTurn(8) && g.isOffTurn(10) && !g.isOffTurn(11));
  // 현실: 연휴에 멈추는 건 배송이지 창고가 아니다 — 입고는 그대로 들어오고 차만 못 부른다
  assert.ok(g.schedule[7].length + g.schedule[8].length + g.schedule[9].length > 0, '연휴 사흘에도 입고가 있다');
  for (const sp of g.schedule[4]) assert.equal(sp.deadlineDelta, -1);
  g.turn = 7; g.parcels = [P(1, 'normal', 1)]; const i = slot(g, 'bulk'); assert.ok(g.canCall(g.contracts[i]));
  g.turn = 8; assert.ok(!g.canCall(g.contracts[i])); const r = g.callCarrier(i, [1]); assert.ok(!r.ok);
  assert.ok(g.upcoming()[0].off);
  assert.ok(g.calendarMonths().find(x => x.cal === 9).events.some(e => e.id === 'chuseok' && e.holiday && e.days[0] === 24), '달력 카드에도 실제 날짜로 실린다');
});
t('달력: 런의 startMonth 가 시작 달을 정하고, 해를 넘기면 yearOf 가 따라온다 (겨울 12월 → 이듬해 2월)', () => {
  const w = new Game({ seed: 1, scenario: 'kr_winter', year: 2026 }); assert.equal(w.calMonth(1), 12); assert.equal(w.yearOf(1), 2026); assert.equal(w.calMonth(3), 1); assert.equal(w.yearOf(3), 2027); assert.equal(w.calMonth(6), 2);
  assert.equal(new Game({ seed: 1, scenario: 'kr_autumn' }).calMonth(1), 9);
  const g = NG(3); assert.equal(g.calendarMonths().length, 12); assert.equal(g.calendarMonths()[6].cal, 9);
});
t('달력: 1월은 인플레 한 단계를 건너뛴다, 12월은 반송 유예 -1', () => {
  const g = NG(3); assert.ok(Math.abs(g.inflation(21) - Math.pow(D.OPCOST_INFLATION, 10)) < 1e-9); // 1월(11개월차)까지 10단계
  assert.ok(Math.abs(g.inflation(23) - Math.pow(D.OPCOST_INFLATION, 10)) < 1e-9); // 2월: 1월이 한 단계를 건너뛰어 그대로 10단계
  g.month = 20; assert.equal(g.calMonth(), 12); assert.equal(g.returnGraceFor(P(1, 'normal', 1)), D.RETURN_GRACE - 1);
});
const Story = require('../www/js/story.js'); globalThis.I18n = I18n; globalThis.DATA = D;
// ----- 캠페인 레벨 (docs/STORY_TUTORIAL_DESIGN.md 부록 R) -----
const LV = require('../www/js/levels.js');
const L1 = extra => new Game(Object.assign({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 1 }, extra || {}));
t('레벨: 플래그는 누적이고, 자유 런(레벨 없음)은 전부 켜져 있다', () => {
  assert.deepEqual([...LV.showsAt(1)], []);
  const s2 = LV.showsAt(2); assert.ok(s2.has('market') && s2.has('calls') && !s2.has('weather'));
  const s3 = LV.showsAt(3); assert.ok(s3.has('market') && s3.has('weather'), '누적');
  const free = NG(1); for (const f of LV.FLAGS) assert.equal(free.shows(f), !D.DISABLED_FEATURES.includes(f), f);
});
t('레벨 1: 계약 하나 · 개인 고객만 · 창고 16칸 · 시드 고정 · 한 사이클', () => {
  const g = L1(), g2 = L1({ seed: 999 });
  assert.equal(g.seed, LV.get(1).seed); assert.equal(g.rules.months, 1, '장은 한 사이클이다');
  assert.equal(g.contracts.filter(Boolean).length, 1);
  assert.equal(g.contracts[0].carrier, 'bulk0');
  assert.deepEqual(Object.keys(g.customers), ['anon'], '서장에는 이름 있는 화주가 없다');
  assert.ok(g.schedule.flat().every(sp => sp.customer === 'anon'), '대본 물류도 전부 개인 고객');
  assert.equal(g.warehouse.cap, 16); assert.equal(g.warehouse.cold, 0); assert.equal(g.yearOf(), 2027);
  const flat = x => x.map(tt => tt.map(sp => sp.type + sp.size).join()).join('|');
  assert.equal(flat(g.schedule), flat(g2.schedule), '시드를 줘도 대본 시드가 이긴다 — 물류는 같다');
  assert.ok(g.schedule.flat().every(sp => sp.type === 'normal'), '일반 택배만');
});
t('레벨 1: 숨긴 기능은 규칙에서도 꺼져 있다 (배차 무제한 · 동시 1대 · 맑음 · 평판 고정)', () => {
  const g = L1();
  for (const f of LV.FLAGS) assert.ok(!g.shows(f), f + ' 은 아직 안 열렸다');
  assert.deepEqual([...new Set(g.weather)], ['sunny']);
  const c = g.contracts[0], calls = c.calls;
  const ids = g.parcels.map(p => p.id).slice(0, 1);
  const before = g.rep;
  g.callCarrier(0, ids, 1);
  assert.equal(c.calls, calls, '배차가 줄지 않는다');
  assert.equal(g.simulMax(c), 1, '동시 1대');
  g.addRep(-5, 'test'); assert.equal(g.rep, before, '평판은 움직이지 않는다');
});
t('레벨 1: 정산 뒤에 마켓이 없다 (한 사이클이라 그대로 장이 끝난다)', () => {
  const g = L1();
  let guard = 0;
  while (g.phase !== 'summary' && guard++ < 200) { if (g.phase === 'weekend') g.weekendChoose('rest'); else g.wait(); }
  assert.equal(g.phase, 'summary');
  g.closeSummary();
  assert.equal(g.market, null, '서장에는 마켓이 없다');
  assert.equal(g.phase, 'win', '한 사이클을 넘기면 장이 끝난다');
});
t('레벨 1: 마지막 사이클을 넘기면 결과에 level 이 실린다', () => {
  const g = L1();
  let guard = 0;
  while (g.phase !== 'win' && g.phase !== 'over' && guard++ < 400) {
    if (g.phase === 'weekend') g.weekendChoose('rest');
    else if (g.phase === 'summary') g.closeSummary();
    else if (g.phase === 'play') g.wait();
    else break;
  }
  assert.equal(g.phase, 'win', '기한을 다 놓쳐도 레벨 1은 끝난다(실패 없음)');
  assert.equal(g.result.level, 1);
});
// ----- 튜토리얼 대본 (docs/STORY_TUTORIAL_DESIGN.md 부록 I) -----
const TUT = require('../www/js/tutorial.js');
const TG = extra => new Game(Object.assign({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, scripted: true }, extra || {}));
t('대본: 인수인계 런은 시드가 고정이고 1~3개월차 입고·날씨가 대본 그대로', () => {
  const g = TG(), g2 = TG({ seed: 999 });
  assert.equal(g.seed, TUT.SEED); assert.equal(g2.seed, TUT.SEED);
  const flat = x => x.map(t2 => t2.map(sp => sp.type + sp.size + sp.customer).join()).join('|');
  assert.equal(flat(g.schedule), flat(TUT.months[1].turns));
  assert.deepEqual(g.weather, TUT.months[1].weather);
  assert.equal(flat(g.schedule), flat(g2.schedule), '시드를 줘도 대본 시드가 이긴다 — 물류는 같다');
});
t('대본: 인수인계 6사이클은 전부 대본, 그 뒤부터는 무작위', () => {
  const g = TG();
  for (let c = 1; c <= TUT.CYCLES; c++) assert.ok(g.script(c), c + '사이클 대본');
  assert.equal(g.script(TUT.CYCLES + 1), null);
  // 사이클마다 대본 길이가 그 사이클의 영업일 수와 맞는다 (짧으면 뒤가 빈 날이 된다)
  for (let c = 1; c <= TUT.CYCLES; c++) assert.equal(TUT.months[c].turns.length, g.turns(c), c + '사이클 턴 수');
  const a = g._makeSchedule(TUT.CYCLES + 1);
  assert.ok(a.flat().length > 0);
});
t('대본: 일반 런(인수인계가 아닌 안내 토글)은 대본을 쓰지 않는다', () => {
  const g = new Game({ seed: 7, story: true });
  assert.equal(g.script(1), null);
});
t('대본 마켓: 첫 마켓은 충전·한도 강화만, 3사이클은 갈아타기 카드, 확장은 5사이클', () => {
  const g = TG();
  g.month = 1; g.contracts[0].calls = 2;
  const m1 = g._genMarketItems();
  assert.ok(m1.some(it => it.kind === 'refill') && m1.some(it => it.kind === 'enh' && it.enh === 'limit1'));
  assert.ok(!m1.some(it => it.kind === 'fac'), '창고 확장은 실제로 넘쳐 본 5사이클 마켓에서');
  assert.ok(!m1.some(it => it.kind === 'contract'), '첫 마켓엔 계약 카드 없음');
  g.month = 3;
  const m2 = g._genMarketItems();
  const sw = m2.find(it => it.kind === 'contract');
  assert.ok(sw && sw.carrier === 'fragile1' && sw.switchFrom, '⚠ 상위 센터 갈아타기 카드');
  g.month = 5;
  assert.ok(g._genMarketItems().some(it => it.kind === 'fac' && it.fac === 'expand1'), '넘쳐 본 뒤에 창고 확장');
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
  assert.ok(b && b.id === 'intro' && b.pages.length === 3 && b.pages[2].hl === '#wait-btn' && /오늘.*마감/.test(b.pages[2].text), JSON.stringify(b && b.id));
  assert.equal(Story.check(g, { kind: 'start' }), null); assert.deepEqual(g.story.seen, ['intro']); assert.equal(g.story.notes.length, 1);
  // 2턴: 창고 게이지 비트. 호출 턴(kind call)에도 turn 비트는 나온다
  adv(g); const u = Story.check(g, { kind: 'call', result: { ok: true } }); assert.ok(u && ['usage', 'firstCall', 'rain'].includes(u.id), u && u.id);
});
t('스토리: 달마다 다른 비트, 6월(4개월차) 1턴 작별에 달력 카드, 그 뒤엔 문자만', () => {
  const g = NG(2, { story: true }); g.story.seen = Story.BEATS.filter(b => b.id !== 'farewell' && b.id !== 'win').map(b => b.id);
  g.month = 6; g.turn = 6; const w = Story.check(g, { kind: 'turn' }); assert.equal(w.id, 'win'); assert.ok(/3월/.test(w.pages[0].text) && /2월/.test(w.pages[0].text), w.pages[0].text);
  g.month = 6; g.turn = 12; const f = Story.check(g, { kind: 'summary' }); assert.equal(f.id, 'farewell'); assert.ok(f.calendar); assert.ok(Story.done(g)); assert.ok(!Story.active(g));
  g.month = 9; g.turn = 1; assert.equal(Story.check(g, { kind: 'turn' }), null); assert.ok(/폭염/.test(Story.sms(g))); g.turn = 2; assert.equal(Story.sms(g), null);
  g.month = 10; g.turn = 1; assert.equal(Story.sms(g), null); // 후반 사이클엔 문자 없음
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
  assert.ok(wf && wf.id === 'waitFirst' && wf.pages[0].hl === '#wait-btn' && wf.pages[0].gate);
  assert.equal(Story.check(g, { kind: 'modal', modal: 'wait', picked: 0, elig: 3, outdoor: 0 }), null);
  const a = Story.check(g, { kind: 'modal', modal: 'call', sel: 0, elig: 3, slot: 0 }); assert.ok(a && a.id === 'callModal' && a.pages.length === 3 && a.pages[2].hl === '#parcels' && a.pages[2].gate && /칸/.test(a.pages[0].text));
  assert.equal(Story.check(g, { kind: 'modal', modal: 'call', sel: 0, elig: 3, slot: 0 }), null);
  const b = Story.check(g, { kind: 'modal', modal: 'call', sel: 2, elig: 3 }); assert.ok(b && b.id === 'callGo' && b.pages[1].hl === '#wait-btn' && b.pages[1].gate);
  const drain = () => { let x, ids = []; while ((x = Story.check(g, { kind: 'turn' }))) ids.push(x.id); return ids; };
  g.weatherNow = () => 'rain'; assert.ok(!drain().includes('rain')); // 마당이 비어 있으면 비가 와도 rain 은 안 나온다
  // 대기 팝업: noContract 를 본 뒤에만 waitSelf → waitGo
  g.month = 3; g.story.seen.push('noContract');
  const w = Story.check(g, { kind: 'modal', modal: 'wait', picked: 0, elig: 2, outdoor: 0 }); assert.ok(w && w.id === 'waitSelf' && w.pages[0].hl === '#parcels .ptile:not(.dis)');
  const w2 = Story.check(g, { kind: 'modal', modal: 'wait', picked: 1, elig: 2, outdoor: 0 }); assert.ok(w2 && w2.id === 'waitGo');
  // 비: 마당에 택배 + 비일 때만. 그 뒤 대기 팝업에서 적재 정리 버튼
  g.outdoorVolume = () => 3;
  let r; while ((r = Story.check(g, { kind: 'turn' })) && r.id !== 'rain'); assert.ok(r && /3칸/.test(r.pages[0].text) && r.pages[1].gate, JSON.stringify(g.story.seen));
  // 마감 팝업이 없어졌다 — 적재 정리는 야외 칩(#wm-reorder)이고, 비 다음 턴 비트로 가리킨다
  const rr = Story.check(g, { kind: 'turn' }); assert.ok(rr && rr.id === 'rainReorder' && rr.pages[0].hl === '#wm-reorder');
});
t('자동 선택: 순서대로 담다가 칸이 남지 않게 — 2·2·1·2 는 6칸 차에 2·2·2', () => {
  const g = NG(9, { story: true }); const c = g.contracts.find(Boolean); g.vehicleCap = () => 6;
  const mk = (id, size) => ({ id, size, noDeadline: true });
  const r = g.autoPick(c, [mk(1, 2), mk(2, 2), mk(3, 1), mk(4, 2)], 1);
  assert.equal(r.vol, 6); assert.deepEqual(r.ids, [1, 2, 4]);
  // 급한 것(오늘내일)은 크기와 상관없이 먼저 실린다
  const u = g.autoPick(c, [{ id: 9, size: 1, deadline: 1 }, mk(1, 2), mk(2, 2), mk(4, 2)], 1);
  assert.ok(u.ids.includes(9) && u.vol === 5);
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
  for (const b of Story.BEATS_L1) b.pages.forEach((pg, i) => { const k = `story.${b.id}.${i + 1}`; assert.ok(KO.ui[k] && EN.ui[k], k); });
  for (const k of ['lv.doneTitle', 'lv.doneBody', 'lv.nameAsk', 'lv.nameBody', 'lv.nameSave', 'lv.nameDefault', 'lv.start', 'lv.startSub', 'lv.ch.1', 'lv.ch.2', 'lv.continue', 'lv.next', 'lv.doneGo', 'wait.btnPlain', 'sum.toNext', 'help.l1']) assert.ok(KO.ui[k] && EN.ui[k], k);
  // 레벨 1 도움말에는 아직 안 연 것이 없어야 한다
  for (const w of ['평판', '냉장', '냉동', '마켓', '보험', '고객', '통관']) assert.ok(!KO.ui['help.l1'].includes(w), 'help.l1 에 ' + w);
  for (const b of Story.BEATS) b.pages.forEach((pg, i) => { if (pg.k) return; const k = `story.${b.id}.${i + 1}`; assert.ok(KO.ui[k] && EN.ui[k], k); });
  for (const a of ['cold', 'fragile', 'customs', 'frozen']) assert.ok(KO.ui['story.special.' + a] && EN.ui['story.special.' + a]);
  for (const k of ['good', 'bad']) assert.ok(KO.ui['story.summary3.' + k]);
  for (let c = 1; c <= 12; c++) assert.ok(KO.ui[`cal.kr.${c}.note`] && KO.ui[`cal.kr.${c}.label`] && EN.ui[`cal.kr.${c}.note`], 'cal ' + c);
  for (const id of ['seol', 'chuseok', 'seol_rush', 'chuseok_rush', 'newyear', 'samil', 'buddha', 'children', 'memorial', 'liberation', 'foundation', 'hangul', 'christmas', 'gift', 'sale']) assert.ok(KO.ui['cal.event.' + id] && EN.ui['cal.event.' + id], id);
  for (const id in M.SCENARIOS) assert.ok(KO.meta.SCENARIOS[id] && EN.meta.SCENARIOS[id], id);
  for (const id in M.ACHIEVEMENTS) assert.ok(KO.meta.ACHIEVEMENTS[id] && EN.meta.ACHIEVEMENTS[id], id);
  for (const k of ['prep.runWhenSame', 'prep.runWhenNext', 'prep.span.quarter', 'prep.span.half', 'prep.span.year']) assert.ok(KO.ui[k] && EN.ui[k], k);
});
t('계절 이어하기: 봄=캠페인 · 여름부터 앞 계절의 창고를 물려받는다 · 반기·한 해는 없다', () => {
  assert.deepEqual(M.DEFAULT_UNLOCK.scenarios, ['kr_spring', 'kr_summer']);
  assert.deepEqual(M.FREE_RUNS, ['kr_spring', 'kr_summer']);
  assert.ok(M.SCENARIOS.kr_spring.campaign);
  assert.equal(M.SCENARIOS.kr_summer.chainFrom, 'campaign'); assert.equal(M.SCENARIOS.kr_summer.chainNext, 'kr_autumn');
  assert.equal(M.SCENARIOS.kr_autumn.chainFrom, 'kr_summer'); assert.equal(M.SCENARIOS.kr_winter.chainFrom, 'kr_autumn');
  assert.equal(M.ACHIEVEMENTS.kr_winter_clear.rewardType, 'none');
  // 물려받은 판: 자금·창고·계약·고객이 그대로, 해도 그대로
  const carry = { cash: 1777, year: 2027, warehouse: { cap: 40, cold: 8, frozen: 4, xl: 0 }, contracts: [{ carrier: 'bulk0', grade: 'normal', calls: 3, enh: {} }, { carrier: 'cold0', grade: 'normal', calls: 2, enh: {} }], customers: [['anon', 0], ['mart', 1], ['ice', 0]], trust: {}, growth: {}, media: {} };
  const g = new Game({ seed: 3, scenario: 'kr_summer', carry, year: 2027 });
  assert.equal(g.cash, 1777); assert.equal(g.warehouse.cap, 40); assert.equal(g.warehouse.frozen, 4); assert.equal(g.year, 2027); assert.equal(g.calMonth(1), 6);
  assert.deepEqual(g.contracts.filter(Boolean).map(c => c.carrier), ['bulk0', 'cold0']);
  assert.ok(g.customers.ice && g.customers.mart);
  assert.ok(!g.level, '여름은 캠페인이 아니다 — 보정 없음'); assert.ok(!g.rules.noBankrupt);
  // 여름을 넘기면 결과에 다음 계절로 넘길 판이 실린다. 겨울은 다음이 없다
  g.phase = 'play'; g._win(); assert.ok(g.result.carry && g.result.carry.warehouse && g.result.carry.year === 2027, 'summer carry');
  const w = new Game({ seed: 3, scenario: 'kr_winter' }); w._win(); assert.equal(w.result.carry, null);
});
t('이어하기 첫 사이클: 올 수 있는 화물을 실을 곳이 없으면 셋업이 채운다 (빈 자리엔 센터, 없으면 특약) — 화물은 안 바꾼다', () => {
  const mk = cs => ({ cash: 1800, year: 2026, warehouse: { cap: 32, cold: 8, frozen: 4, xl: 0 }, contracts: cs.map(k => ({ carrier: k, grade: 'normal', calls: 3, enh: {} })), customers: [['anon', 0], ['ice', 0]], trust: {}, growth: {}, media: {} });
  const a = new Game({ seed: 3, scenario: 'kr_autumn', carry: mk(['bulk0', 'cold0']), year: 2026, prep: false });
  assert.ok(a.contracts.some(c => c && c.carrier === 'frozen0'), '빈 자리 → 냉동 기본 센터');
  const b = new Game({ seed: 3, scenario: 'kr_autumn', carry: mk(['bulk0', 'cold0', 'fragile0', 'intl0']), year: 2026, prep: false });
  assert.ok(b.contracts.some(c => c && b.contractOpts(c).includes('optFrozen')), '자리가 다 찼으면 냉동 특약');
  const p = new Game({ seed: 3, scenario: 'kr_autumn', carry: mk(['bulk0', 'cold0']), year: 2026, prep: true });
  assert.ok(!p.contracts.some(c => c && p.contractCaps(c).includes('frozen')), '준비 마켓이 있으면 플레이어 몫');
});
t('데모: 문구 키가 ko/en 에 모두 있다', () => {
  for (const k of ['demo.fullOnly', 'demo.cta', 'demo.gateTitle', 'demo.gateBody', 'demo.resultTitle', 'demo.resultHead', 'demo.soon', 'prep.springTitle', 'prep.springPick', 'prep.springStart',
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
t('배차비 규칙: 차를 반 채우면 똔똔 (fee ≈ 0.5 × 용량 × 칸당 보상, 크기 등장 가중 평균 ±15%)', () => {
  // 계열이 싣는 종류들의 칸당 보상(전문 보너스 포함)을 크기 등장 비율로 가중 평균해 기대 배차비를 다시 구해 본다.
  // 보상표나 용량을 건드리면 여기서 걸린다 — "채워 보내라"가 수지로 성립하는지가 이 한 줄에 걸려 있다.
  // (특수 소형(1)이 열리기 전엔 단순 평균 ±2 였다 — 크기 셋을 단순 평균하면 소형이 과대평가된다)
  const carries = { bulk: ['normal'], cold: ['fresh', 'produce'], frozen: ['frozen'], fragile: ['fragile'],
    intl: ['intl'], large: ['large', 'normal'], air: ['normal', 'fragile', 'intl'],
    rail: ['normal', 'fresh', 'fragile', 'large'], sea: ['normal', 'intl', 'large', 'fragile'] };
  for (const f of Object.keys(D.FAMILIES)) {
    const F = D.FAMILIES[f]; let n2 = 0, sum = 0;
    for (const t2 of carries[f]) { const T2 = D.PARCEL_TYPES[t2];
      for (const sz of T2.sizes) { if (sz < F.sizeMin || sz > F.sizeMax) continue;
        const w = (T2.sizeWeight || {})[sz] || D.SIZE_WEIGHT[sz];
        sum += w * (T2.reward[sz] + ([].concat(F.specialist || []).includes(t2) ? T2.bonus : 0)) / sz; n2 += w; } }
    const want = Math.round(D.FILL_BREAKEVEN * F.cap * (n2 ? sum / n2 : 20));
    assert.ok(Math.abs(F.fee - want) <= Math.max(2, want * 0.15), `${f}: fee ${F.fee} ≠ ${want} (반 적재 똔똔)`);
  }
});
t('세이브 왕복: 서장(레벨 1) 이어하기 — level·_shows 가 살아 있다', () => {
  // _shows 는 Set 이라 JSON 으로 나가면 {} 가 된다. 저장하지 말고 levels.js 에서 다시 만들어야 한다
  const g = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 1, prep: false });
  for (let i = 0; i < 5; i++) { g.wait(); g.takeEvents(); }
  const j = JSON.parse(JSON.stringify(g.toJSON()));
  assert.ok(!('_shows' in j) && !('level' in j), '세이브에 level/_shows 가 들어가면 안 된다');
  const g2 = Game.fromJSON(j);
  assert.strictEqual(g2.level && g2.level.n, 1);
  assert.strictEqual(g2.shows('market'), false, '서장은 마켓이 잠겨 있어야 한다');
  assert.strictEqual(g2.shows('rep'), false, '서장은 평판이 잠겨 있어야 한다');
  assert.ok(g2.script(1), '대본이 다시 붙어야 한다');
  assert.strictEqual(g2.turn, g.turn);
});
t('세이브 왕복: 자유 런은 전부 열려 있다', () => {
  const g2 = Game.fromJSON(JSON.parse(JSON.stringify(new Game({ seed: 7 }).toJSON())));
  assert.strictEqual(g2.level, null);
  assert.strictEqual(g2.shows('market'), true);
});

t('서장은 통째로 무기한이고, 기한은 1장에서 처음 붙는다', () => {
  const g = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 1, prep: false });
  assert.ok(g.parcels.length > 0);
  assert.ok(g.schedule.flat().length > 0);
  const d0 = g.parcels[0].deadline;
  let guard = 0;
  while (g.phase === 'play' && guard++ < 40) { g.wait(); if (g.phase === 'weekend') g.weekendChoose('rest'); g.takeEvents(); }
  assert.ok(g.parcels.every(p => p.noDeadline), '서장 택배는 끝까지 전부 무기한');
  assert.strictEqual(g.stats.returned, 0, '무기한은 반송되지 않는다');
  const old = g.parcels.find(p => p.noDeadline);
  if (old) assert.strictEqual(old.deadline, d0, '기한이 줄지 않는다');

  const g2 = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 2, prep: false });
  assert.ok(g2.parcels.length && g2.parcels.every(p => !p.noDeadline), '1장 택배에는 기한이 붙는다');
});

t('특약은 caps 만이 아니라 need 도 넓힌다 (자리가 찼을 때의 유일한 길)', () => {
  const g = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 6, prep: false });
  assert.strictEqual(g.contracts.length, D.CONTRACT_SLOTS, '계약 슬롯은 넷');
  assert.strictEqual(g.contracts.filter(Boolean).length, D.CONTRACT_SLOTS, '5장은 자리가 다 차 있다');
  g.warehouse.frozen = 4;
  const fr = P(9001, 'frozen', 2, { customer: 'anon', inFrozen: true });
  assert.ok(!g.contracts.some(c => c && g.canHandle(c, fr)), '특약 전에는 ❆ 를 받을 계약이 없다');
  const ci = g.contracts.findIndex(c => c && D.familyOf(c.carrier) === 'cold');
  assert.ok(ci >= 0 && g._canFitOpt('optFrozen'), '냉동 특약을 붙일 계약이 있다');
  g.contracts[ci].enh.opt = 'optFrozen';
  assert.ok(g.canHandle(g.contracts[ci], fr), '특약을 붙이면 그 계약이 ❆ 를 받는다 (need 가 넓어진다)');
});

t('자리가 다 찼으면 마켓이 계약 대신 특약을 반드시 내놓는다', () => {
  const g = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: 6, prep: false });
  g.warehouse.frozen = 4;
  g.parcels = [P(9002, 'frozen', 2, { customer: 'anon', inFrozen: true })];
  g.month = 3;                                    // 대본이 없는 사이클 = 무작위 마켓
  const items = g._genMarketItems();
  const opt = items.find(it => it.kind === 'enh' && (D.ENHANCEMENTS[it.enh] || {}).kind === 'opt' && D.ENHANCEMENTS[it.enh].attr === 'frozen');
  assert.ok(opt, '냉동 특약이 매물에 있다 — ' + items.map(i => i.kind + ':' + (i.carrier || i.enh || i.fac || '')).join(' '));
});

t('보름 목표·연속 만차·일괄 출고는 지금 어디에도 없다(꺼 둠)', () => {
  const lv = n => new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: n, prep: false });
  assert.ok(!lv(1).shows('mission') && !lv(2).shows('mission') && !NG(1).shows('mission'));
  for (const n of [1, 2, 3, 4, 5, 6]) { const g = lv(n); assert.ok(!g.shows('chain') && !g.shows('rush'), '레벨 ' + n);
    g.warehouse.cap = 10; g.parcels = [P(9100 + n, 'normal', 9, { customer: 'anon' })]; assert.equal(g.rushState().ready, false); }
  const free = NG(1); assert.ok(!free.shows('chain') && !free.shows('rush'), '자유 런에서도 꺼져 있다');
  const g = EMPTY(203); const i = slot(g, 'bulk'); g.parcels = [0, 1, 2].map(n => P(50 + n, 'normal', 2));
  const r = g.callCarrier(i, g.parcels.map(p => p.id)); assert.ok(r.ok); assert.equal(r.chain, 0); assert.equal(r.chainMult, 1);
});

t('4장에서 처음으로 평판이 움직이고, 0이면 판이 끝난다', () => {
  const LV = (n) => new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: n, prep: false });
  const g3 = LV(3);
  assert.ok(!g3.shows('rep'), '2장에는 평판이 없다');
  const before = g3.rep; g3.addRep(-5, 'test');
  assert.strictEqual(g3.rep, before, '평판이 안 열린 장에서는 깎이지도 않는다');

  const g = LV(5);
  assert.ok(g.shows('rep'), '4장에는 평판이 있다');
  assert.ok(g.rep > 0 && g.rep < g.repCap() && g.rep === 16, '상한보다 낮게 시작해 채울 게 있다 — ' + g.rep + '/' + g.repCap());
  g.addRep(-g.rep, 'test');
  assert.ok(g.rep <= 0, '0까지 내려간다');
  g.wait(); g.takeEvents();
  assert.strictEqual(g.phase, 'over', '평판이 바닥나면 런이 끝난다 — ' + g.phase);
});

t('캠페인은 자금으로는 끝나지 않는다 (종료 조건은 평판 하나)', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    const g = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: n, prep: false });
    assert.ok(g.rules.noBankrupt, n + '장은 부도가 없다');
  }
});

t('장이 달라도 달력은 이어진다 (cycleOffset)', () => {
  const want = [[3, 1], [3, 2], [4, 1], [4, 2], [5, 1], [5, 2]];   // 3월 전반 → 5월 후반
  LV.LEVELS.forEach((lv, i) => {
    const g = new Game({ scenario: 'kr_spring', company: 'local', perks: [], insurer: 'none', story: true, level: lv.n, prep: false });
    assert.strictEqual(g.calMonth(1), want[i][0], lv.n + '장의 달');
    assert.strictEqual(g.half(1), want[i][1], lv.n + '장의 전후반');
    assert.strictEqual(g.yearOf(1), 2027, lv.n + '장의 해');
    // 달력 화면의 '이번 달'은 개월차로 켜진다
    const cells = g.calendarMonths(), now = cells.filter(x => x.m === g.monthIndex());
    assert.strictEqual(now.length, 1, lv.n + '장: 이번 달 칸이 하나');
    assert.strictEqual(now[0].cal, g.calMonth(), lv.n + '장: 켜진 칸이 실제 달과 같다');
  });
});

t('택배는 쪼개지지 않는다: 7칸 차에 2칸짜리는 석 대(6칸)까지, 넷이면 두 차 — 부피 합이 아니라 통째로 들어가는가로 대수를 센다', () => {
  const g = EMPTY(21); const c = g.contracts[slot(g, 'bulk')]; g.trust[c.carrier] = 0; c.enh.cap = 0; c.enh.capDelta = 0;
  const cap = g.vehicleCap(c); assert.equal(cap, 7, '기본 대량 차는 7칸');
  for (let i = 0; i < 7; i++) g.parcels.push(P(100 + i, 'normal', 2));
  assert.equal(g.packTrucks(c, g.parcels.slice(0, 4)).length, 2, '2칸 넷 = 8칸이지만 한 차(7칸)엔 셋(6칸)만 통째로 들어간다');
  assert.equal(g.trucksNeeded(c, g.parcels.slice(0, 3)), 1);
  assert.equal(g.trucksNeeded(c, 8), 2, '부피로 물으면 예전처럼 올림');
  const r = g.autoPick(c, g.parcels.slice(), 2);
  assert.equal(r.trucks, 2); assert.equal(r.vol, 12, '두 차에 6+6 — 7+5(=12) 도 아니고 7+7(=14) 도 아니다');
  assert.ok(r.ids.length === 6);
  const ok2 = g.callCarrier(g.contracts.indexOf(c), g.parcels.slice(0, 4).map(p => p.id));
  assert.ok(ok2.ok && ok2.trucks === 2, '2칸 넷은 저절로 두 대 — 쪼개지 않고 3+1 로 실린다');
});

t('포워더(항공·철도·해상)는 무역 고객(🛃 짐을 맡기는 화주)이 있어야 마켓에 온다', () => {
  const g = NG(31); assert.ok(!g.hasTradeCustomer(), '동네 택배 시작 고객(큰마트·새벽·유리)엔 무역 고객이 없다');
  const w = g._carrierWeights(); assert.ok(!w.air && !w.rail && !w.sea && w.bulk && w.intl, JSON.stringify(Object.keys(w)));
  g.addCustomer('import'); assert.ok(g.hasTradeCustomer()); const w2 = g._carrierWeights(); assert.ok(w2.air && w2.rail && w2.sea);
  const gl = new Game({ seed: 2, scenario: 'kr_spring', months: 24, company: 'global', noHolidays: true }); assert.ok(gl.hasTradeCustomer(), '글로벌 익스프레스는 수입상·명품관이 있어 처음부터 포워더가 열린다');
});

// ----- 멀티 「난투」 (docs/MULTIPLAYER_DESIGN.md · 1단계) -----
const MULTI = require('../www/js/multi.js'), BOT = require('../www/js/bot.js');
const MG = (seed, extra) => new Game(Object.assign({ multi: true, seed, scenario: 'kr_summer', company: 'local', perks: [], prep: false }, extra || {}));
t('멀티: 규칙 셋 — 석 달·명절 없음·배차 무제한·즉시 결제·보험 없음·시작 창고 +4 · 시작 차는 작다', () => {
  const g = MG(1), R = g.rules;
  assert.ok(g.contracts.filter(Boolean).every(c => g.vehicleCap(c) < D.CARRIERS[c.carrier].cap + 1) && R.carrierCapDelta.bulk === -2, '차는 작다(배차 무제한 대신)');
  { const big = []; for (let m = 1; m <= 6; m++) for (const t of g._sharedSchedule(m)) for (const sp of t) if (sp.size > 3 || ((sp.type === 'fresh' || sp.type === 'frozen') && sp.size > 2)) big.push(sp); assert.equal(big.length, 0, '3칸 넘는 택배는 안 온다 · 신선·냉동은 2칸까지'); }
  assert.ok(R.multi && R.months === 6 && R.noHolidays && R.noCalendarEvents && R.noWeekend && R.unlimitedCalls && R.noCallFee && R.payNow && R.noLoan && R.noInsurance && !R.shopDay && R.autoSummary && R.repDecides);
  assert.equal(g.warehouse.cap, M.COMPANIES.local.warehouse.cap + 4);
  assert.deepEqual(g.contracts.filter(Boolean).map(c => D.familyOf(c.carrier)), ['bulk'], '한길만 들고 시작');
  { const specs = g.schedule.flat().filter(sp => sp.type !== 'normal'); assert.ok(specs.length > 0, '대본엔 특수 물품이 있고'); assert.ok(g.parcels.every(p => p.type === 'normal'), '받아 줄 계약이 없으면 일반으로 온다'); }
  { let plain = 0; for (let c = 1; c <= 6; c++) for (const d of g._sharedSchedule(c)) for (const sp of d) if (sp.type === 'normal' && !sp.rush && sp.trait) plain++; assert.equal(plain, 0, '보통 일반엔 트레잇이 안 붙는다(특수·⚡ 긴급만)'); }
  { const c = g.contracts[0], cap0 = g.vehicleCap(c); g.trust[c.carrier] = 60; assert.equal(g.vehicleCap(c), cap0 + 3, '난투 신뢰 Lv3 = 용량 +3'); assert.equal(g.trustPerk(c.carrier, 'feeMult'), null, '배차비 특성은 없다'); g.trust[c.carrier] = 0; }
  assert.equal(g.monthEvents(1).length, 0); assert.equal(g.insurer, 'none');
});
t('멀티: 입고 대본은 매치 공유 — 같은 시드면 같은 짐, 평판이 달라도 같다', () => {
  const a = MG(5), b = MG(5); assert.deepEqual(a.schedule, b.schedule);
  b.rep = 3; b.repTier = 4; assert.deepEqual(a._makeSchedule(3), b._makeSchedule(3));
  assert.notDeepEqual(MG(6).schedule, a.schedule);
  const types = new Set(a.schedule.flat().map(x => x.type)); for (const t of ['intl', 'large', 'frozen']) assert.ok(!types.has(t), t + ' 은 오지 않는다 (새 계약이 없으니 실을 곳도 없다)');
});
t('멀티: 물량은 일차에 비례해 오르고 마지막 보름은 마감 폭주', () => {
  const g = MG(2); const n = m => g._makeSchedule(m).flat().length;
  assert.ok(n(3) > n(1) && n(6) > n(5) * 1.4, `${n(1)} ${n(3)} ${n(5)} ${n(6)}`);
});
t('멀티: 배차 무제한 — 배차비 0, 배차 눈금은 안 줄고, 두 대까지 한 번에', () => {
  const g = MG(3); g.parcels = []; g.schedule = g.schedule.map(() => []);
  const si = slot(g, 'bulk'), c = g.contracts[si]; const calls = c.calls;
  g.parcels.push(P(1, 'normal', 2), P(2, 'normal', 2));
  const cash = g.cash, r = g.callCarrier(si, [1, 2]);
  assert.ok(r.ok, r.msg); assert.equal(r.fee, 0); assert.equal(g.feesDue, 0); assert.equal(g.cash, cash + r.revenue); assert.equal(c.calls, calls, '배차는 안 줄어든다');
  for (let i = 0; i < 20; i++) { g.parcels.push(P(10 + i, 'normal', 2)); assert.ok(g.callCarrier(si, [10 + i]).ok, '몇 번이고 부른다 ' + i); }
  const late = P(90, 'normal', 2, { deadline0: 4, deadline: 0, overdue: true }); g.parcels.push(late); const rep0 = g.rep; assert.equal(g.repDeltaFor([late]), 0); g.callCarrier(si, [90]); assert.ok(g.rep >= rep0, '늦게라도 실어 나르면 평판은 안 깎인다');
  assert.equal(g.simulMax(c), D.MAX_TRUCKS);
});
t('멀티: 사이클 끝 장 없음 · 배차 리필 · 「장 보러 간 날」(shopDay) 규칙이면 매물은 업그레이드·강화·충전·광고·새 계약 2(시설 없음), 나오는 데 하루', () => {
  // 사이클 끝엔 장이 없다(유저: "상점을 없애면") — 곧장 다음 보름, 배차는 다시 찬다
  const c = MG(7); c.parcels = []; c.schedule = c.schedule.map(() => []); c.contracts[0].calls = 0; let n = 0; while (c.month === 1 && c.phase === 'play' && n++ < 30) { c.schedule = c.schedule.map(() => []); c.wait([]); }
  assert.equal(c.phase, 'play'); assert.equal(c.month, 2); assert.equal(c.contracts[0].calls, c.contracts[0].maxCalls, '보름마다 배차 리필');
  const g = MG(7, { }); g.rules.shopDay = true; g.cash = 2000; const day = g.totalTurn, turn = g.turn;
  assert.ok(g.openShop().ok && g.phase === 'market' && g.market.shop && g.market.dayCost);
  const kinds = new Set(g.market.items.filter(it => !['adTicket', 'media', 'mediaUp', 'refill'].includes(it.kind)).map(it => it.kind)); assert.deepEqual([...kinds].sort(), ['contract', 'enh'], '시설은 안 판다(유저)');
  assert.ok(g.market.items.some(it => it.kind === 'contract' && it.switchFrom), '갈아타기(업그레이드) 카드'); assert.equal(g.market.items.filter(it => it.kind === 'contract' && !it.switchFrom).length, 2, '새 계약 두 장');
  assert.ok(!g.market.items.some(it => it.kind === 'enh' && /^limit|holiday/.test(it.enh)), '한도·휴무 특약 없음');
  assert.ok(!g.market.items.some(it => it.kind === 'fac'), '시설(확장·냉장·야적)은 난투에 없다');
  assert.ok(g.closeMarket()); assert.equal(g.phase, 'play'); assert.equal(g.totalTurn, day + 1); assert.equal(g.turn, turn + 1); assert.equal(g.stats.shopDays, 1);
  assert.ok(!g.openShop.call(Object.assign(Object.create(Game.prototype), g, { phase: 'market' })).ok);
});
t('멀티: 정산은 자동 — 사이클이 끝나면 팝업(summary)도 장도 없이 곧장 다음 보름, 어음·차입 없음', () => {
  const g = MG(8); g.parcels = []; g.schedule = g.schedule.map(() => []); g.cash = -50;
  let n = 0; while (g.month === 1 && g.phase === 'play' && n++ < 30) { g.schedule = g.schedule.map(() => []); g.wait([]); }
  assert.equal(g.phase, 'play'); assert.equal(g.month, 2); assert.equal(g.debt, 0); assert.ok(g.cash < 0, '마이너스는 마이너스대로'); assert.ok(g.events.some(e => e.type === 'settle'));
});
t('멀티: 평판 사다리 — 상한에 닿으면 상한 +6 · 등급 +1 · 평판 상점 3장(장 매물만, 값 없음) · 하나 고르면 닫힌다', () => {
  const g = MG(9); const cap0 = g.repCap(); g.cash = 0; g.addRep(99);
  assert.equal(g.repTier, 1); assert.equal(g.repCap(), cap0 + 6); assert.equal(g.rep, cap0); assert.ok(g.repShop && g.repShop.items.length === 3 && !g.perkOffer);
  assert.ok(g.repShop.items.every(it => ['contract', 'enh', 'adTicket', 'media', 'mediaUp', 'traitUnlock'].includes(it.kind) && it.price === 0), '퍽·시설·충전은 없고 값도 없다(돈 없는 규칙)');
  g.addRep(99); assert.equal(g.repTier, 1, '상점이 떠 있는 동안은 또 오르지 않는다');
  const sh = g.repShop; const it0 = sh.items.find(it => it.kind === 'enh' && D.ENHANCEMENTS[it.enh].kind !== 'opt') || sh.items.find(it => it.kind === 'contract' && it.switchFrom != null) || sh.items.find(it => it.kind === 'adTicket');
  assert.ok(it0, '고를 수 있는 카드'); const i = sh.items.indexOf(it0);
  const slot = it0.kind === 'contract' ? g.contracts.findIndex(c => c && c.id === it0.switchFrom) : it0.kind === 'enh' ? g.contracts.findIndex(c => c && g.enhUsed(c) < g.enhSlots(c)) : null;
  assert.ok(g.buyRepShop(i, slot).ok); assert.ok(it0.sold); assert.equal(g.cash, 0, '돈은 안 든다');
  assert.ok(g.repShop !== sh, '하나 고르면 그 상점은 닫힌다'); assert.equal(g.actLog.filter(e => e.t === 'buy').length, 0, '상점 구매는 rbuy 로만 적힌다'); assert.equal(g.actLog.filter(e => e.t === 'rclose').length, 0, '자동 닫힘은 로그에 없다');
  assert.equal(g.repTier, 2, '상점 동안 넘친 평판은 닫자마자 다음 계단'); assert.ok(g.repShop, '다음 상점'); assert.ok(g.closeRepShop()); assert.equal(g.repShop, null); assert.ok(g.actLog.some(e => e.t === 'rclose'), '손으로 닫으면 적힌다');
  const s2 = Game.fromJSON(JSON.parse(JSON.stringify(g.toJSON()))); assert.ok(s2.rules.multi && s2.repCap() === g.repCap(), '세이브를 열어도 멀티 규칙이 돌아온다');
});
t('멀티: 매치 — 봇 3명이 각자 시계로 따라오고, 순위는 생존 → 평판 → 잔액, 저장·복원', () => {
  const m = MULTI.newMatch({ seed: 21, name: '나', botNames: ['가', '나', '다'] });
  assert.equal(m.players.length, 4); assert.ok(m.players[0].human && m.players[0].game.rules.multi);
  assert.equal(m.players[0].game.phase, 'play'); assert.ok(m.players[0].game.cfg.mtheme, '준비 마켓 없이 곧장 · 테마는 시드가 정한다');
  assert.ok(m.players.every(p => p.game.cfg.mtheme === m.players[0].game.cfg.mtheme), '넷이 같은 테마');
  for (let i = 0; i < 10; i++) { BOT.multiDay(m.players[0].game, 'balanced'); MULTI.tick(m); }
  const days = m.players.map(p => MULTI.dayOf(p.game)); assert.equal(days[0], 11, '첫날이 D+1'); assert.ok(days[1] >= 12 && days[2] === 11 && days[3] === 9, days.join(','));
  const j = JSON.parse(JSON.stringify(MULTI.toJSON(m))), m2 = MULTI.fromJSON(j);
  assert.deepEqual(m2.players.map(p => MULTI.dayOf(p.game)), days); assert.equal(m2.players[1].strat, m.players[1].strat);
  m.players[2].game.phase = 'over'; m.players[3].game.rep = 60; m.players[0].game.rep = 30; m.players[1].game.rep = 30; m.players[1].game.cash = m.players[0].game.cash + 500;
  const st = MULTI.standings(m); assert.deepEqual(st.map(r => r.p.id), [3, 1, 0, 2], '평판 60 > 30(잔액 많은 쪽) > 30 > 폐업');
  assert.ok(st[3].rank === 4 && !st[3].alive);
});
t('멀티: 사람이 먼저 끝나면 봇은 끝까지 돌아 전원 완주·폐업으로 끝난다', () => {
  const m = MULTI.newMatch({ seed: 22, name: 'H' }); MULTI.finishAll(m);
  assert.ok(m.players.slice(1).every(p => p.game.phase === 'win' || p.game.phase === 'over')); assert.ok(!MULTI.allDone(m), '사람 판은 그대로');
});

// ----- 멀티 2단계: 트레잇 · 공격 인박스 · 이삿짐 폭탄 -----
t('멀티: 트레잇은 대본에 박혀 매치 공유 · 공격 40 : 보너스 60 근처 · 후반으로 갈수록 많이', () => {
  const g = MG(41); let early = 0, late = 0, atk = 0, bon = 0, tot = 0;
  for (let m = 1; m <= 6; m++) for (const sp of g._makeSchedule(m).flat()) { tot++; if (!sp.trait) continue; if (m <= 2) early++; else if (m >= 5) late++; if (M.MULTI.TRAITS[sp.trait].kind === 'attack') atk++; else bon++; }
  assert.ok(late > early && atk > 0 && bon > atk, `${early} ${late} ${atk} ${bon} / ${tot}`);
  assert.deepEqual(MG(41)._makeSchedule(4).map(t => t.map(x => x.trait)), g._makeSchedule(4).map(t => t.map(x => x.trait)));
});
t('멀티: 보너스 트레잇은 그날 출고할 때 나에게 — ⭐ 평판 +2 · 🛡 방패(최대 2) · 📦 임시 칸 · 🚚 덤 트럭 · 안 보내면 그날 밤 사라진다', () => {
  const g = MG(42); g.parcels = []; g.schedule = g.schedule.map(() => []); const si = slot(g, 'bulk'); g.cash = 1000;
  const mk = (id, tr) => { const p = g._spawnParcel({ type: 'normal', size: 2, customer: 'anon', trait: tr }); g.parcels.push(p); return p; };
  const b = mk(2, 't_buzz'); const rep = g.rep; let r = g.callCarrier(si, [b.id]);
  assert.ok(r.ok); assert.ok(g.rep >= rep + M.MULTI.BUZZ, '⭐ 입소문 +2');
  const c = mk(3, 't_shield'), d = mk(4, 't_shield'), e = mk(5, 't_shield'); g.callCarrier(si, [c.id, d.id, e.id]); assert.equal(g.shields, 2);
  const cap = g.warehouse.cap; const f = mk(6, 't_pack'), h = mk(7, 't_truck'); g.callCarrier(si, [f.id, h.id]); assert.equal(g.warehouse.cap, cap + 3); assert.ok(g.freeTruckNext);
  const fee = g.callFee(g.contracts[si], 1); assert.equal(fee, 0, '덤 트럭이면 한 대는 공짜');
  for (let i = 0; i < 4; i++) g.wait([]); assert.equal(g.warehouse.cap, cap, '3일 뒤 임시 칸은 사라진다');
  const od = mk(8, 't_buzz'); od.overdue = true; const rep2 = g.rep; g.callCarrier(si, [od.id]); assert.ok(g.rep <= rep2, '기한을 넘긴 택배의 트레잇은 불발');
  const left = mk(9, 't_shield'); const plain = P(99, 'normal', 1); g.parcels.push(plain); g.wait([]); assert.ok(!g.parcels.includes(left) && g.parcels.includes(plain), '안 보낸 트레잇 택배는 그날 밤 사라진다(보통 택배는 남는다)'); assert.ok(g.log.some(l => l.k === 'log.traitGone'));
});
t('멀티: 공격 트레잇은 outbox 로 나가고(🎯 한 방이면 ×3), 받는 쪽은 다음 날 적용 — 방패·잽·지붕이 막는다', () => {
  const g = MG(43); g.parcels = []; g.schedule = g.schedule.map(() => []); const si = slot(g, 'bulk'); g.cash = 1000;
  const p = g._spawnParcel({ type: 'normal', size: 2, customer: 'anon', trait: 't_hurry' }); g.parcels.push(p); g.focusNext = true;
  g.callCarrier(si, [p.id]); assert.equal(g.outbox.length, 1); assert.equal(g.outbox[0].trait, 't_hurry'); assert.equal(g.outbox[0].mult, 3); assert.ok(g.outbox[0].focus); assert.ok(!g.focusNext);
  const v = MG(44); v.schedule = v.schedule.map(() => []); const rep = v.rep;
  const cap0 = v.warehouse.cap; v.receiveAttack({ trait: 't_seal', mult: 1, from: 9, fromName: 'X' }); assert.equal(v.warehouse.cap, cap0, '큐에만 쌓인다'); v.wait([]); assert.equal(v.warehouse.cap, cap0 - M.MULTI.SEAL); assert.ok(v.log.some(l => l.k === 'log.attackIn')); for (let i = 0; i < 3; i++) v.wait([]);
  v.shields = 1; v.receiveAttack({ trait: 't_hurry', mult: 1, from: 9 }); v.wait([]); assert.equal(v.shields, 0); assert.ok(v.log[0].k === 'log.attackBlocked' || v.log.some(l => l.k === 'log.attackBlocked'));
  for (let i = 1; i <= 5; i++) v.parcels.push(P(i, 'normal', 1, { deadline: 4, deadline0: 4, outdoor: false, arrivalTurn: 1 })); v.receiveAttack({ trait: 't_hurry', mult: 1, from: 9 }); v.wait([]); { const hurried = v.parcels.filter(p => p.hurried); assert.equal(hurried.length, M.MULTI.HURRY_N, '⏱ 독촉은 3개만'); assert.ok(hurried.every(p => p.deadline === 1), '그 3개는 오늘까지'); assert.ok(v.parcels.some(p => !p.hurried && p.deadline >= 2), '나머지는 그대로'); }
  v.contracts[1] = v._makeContract('cold0'); v.receiveAttack({ trait: 't_road', mult: 1, from: 9 }); v.wait([]); { const off = v.contracts.filter(c => c && v.offFor(c)); assert.equal(off.length, 1, '🚧 계약 하나만 막힌다'); assert.ok(!v.canCall(off[0])); } v.wait([]); assert.ok(v.contracts.every(c => !c || !v.offFor(c)));
  { const one = MG(47); one.schedule = one.schedule.map(() => []); one.contracts = [one.contracts.find(Boolean)]; one.receiveAttack({ trait: 't_road', mult: 1, from: 9 }); one.wait([]); assert.ok(!one.offFor(one.contracts[0]) && one.log.some(l => l.k === 'log.attackBlocked' && l.p.how.k === 'trait.blk.void'), '계약이 하나뿐이면 🚧 는 무효'); }
  const cap = v.warehouse.cap; v.receiveAttack({ trait: 't_seal', mult: 1, from: 9 }); v.wait([]); assert.equal(v.warehouse.cap, cap - M.MULTI.SEAL); for (let i = 0; i < 3; i++) v.wait([]); assert.equal(v.warehouse.cap, cap);
  const w = MG(45, { mperks: ['m_dodge'] }); w.rules.dodgeProb = 1; w.schedule = w.schedule.map(() => []); w.receiveAttack({ trait: 't_hurry', mult: 1, from: 9 }); w.wait([]); assert.ok(w.log.some(l => l.k === 'log.attackBlocked' && l.p.how.k === 'trait.blk.dodge'));
  assert.ok(!MG(46).receiveAttack.call(Object.assign(Object.create(Game.prototype), MG(46), { phase: 'win' }), { trait: 't_hurry' }), '마감한 창고엔 못 넣는다');
});
t('멀티: 이삿짐 폭탄 — 강제 수락(자리를 먹고 하루 +2c) · 출고 불가 · 0일이면 +1칸 −1일로 이사 · 6칸/1일은 도착하는 순간 터진다', () => {
  const g = MG(47); g.parcels = []; g.schedule = g.schedule.map(() => []);
  const used = g.usedVolume(), cash = g.cash; const r = g.receiveBomb({ size: 3, days: 6, hops: 0, from: 2 });
  assert.ok(r.ok && !r.blast); assert.equal(g.usedVolume(), used + 3); assert.equal(g.bombCount(), 1); assert.ok(!g.returnStorage(r.storage.id).ok);
  g.wait([]); assert.equal(g.cash, cash + 2); assert.equal(r.storage.left, 5);
  for (let i = 0; i < 5; i++) g.wait([]);
  assert.equal(g.bombCount(), 0); const mv = g.outbox.find(o => o.type === 'bombMove'); assert.ok(mv); assert.deepEqual([mv.bomb.size, mv.bomb.days, mv.bomb.hops], [4, 5, 1]);
  const v = MG(48); v.schedule = v.schedule.map(() => []); v.warehouse.cap = 10; v.parcels = [P(1, 'normal', 4, { outdoor: true }), P(2, 'normal', 4), P(3, 'normal', 1)];
  const rb = v.receiveBomb({ size: 6, days: 1, hops: 5, from: 2 }); assert.ok(rb.blast); assert.ok(rb.stolen >= 1, '초과분만큼 도난'); assert.equal(v.bombCount(), 0);
  const u = MG(49); u.schedule = u.schedule.map(() => []); u.receiveBomb({ size: 3, days: 6, hops: 0, from: 2 }); u.parcels = []; const p = u._spawnParcel({ type: 'normal', size: 1, customer: 'anon', trait: 't_return' }); u.parcels.push(p); u.cash = 1000;
  u.callCarrier(slot(u, 'bulk'), [p.id]); assert.equal(u.bombCount(), 0); const back = u.outbox.find(o => o.type === 'bombMove'); assert.ok(back && back.to === 2 && back.back, '🔄 되돌리기는 보낸 사람에게');
});
t('멀티: 매치 라우팅 — 공격은 나 빼고 전원, 폭탄은 랜덤 한 명, 마감·폐업한 사람에겐 안 간다, 동시 폭탄 상한', () => {
  const m = MULTI.newMatch({ seed: 51, name: 'H' }); const [h, a, b, c] = m.players.map(p => p.game);
  h.outbox.push({ type: 'attackOut', trait: 't_hurry', mult: 1 }); MULTI.route(m);
  assert.deepEqual([a, b, c].map(g => g.inbox.length), [1, 1, 1]); assert.equal(h.inbox.length, 0);
  c.phase = 'win'; h.outbox.push({ type: 'attackOut', trait: 't_road', mult: 1 }); MULTI.route(m); assert.deepEqual([a, b, c].map(g => g.inbox.length), [2, 2, 1]);
  h.outbox.push({ type: 'attackOut', trait: 't_bomb', mult: 1, size: 3 }); MULTI.route(m); assert.equal(a.bombCount() + b.bombCount(), 1); assert.equal(c.bombCount(), 0);
  for (let i = 0; i < 6; i++) { h.outbox.push({ type: 'attackOut', trait: 't_bomb', mult: 1, size: 3 }); MULTI.route(m); }
  assert.ok(a.bombCount() + b.bombCount() + h.bombCount() <= M.MULTI.BOMB.max, '동시 폭탄은 4개까지');
  const news = MULTI.takeNews(m); assert.ok(news.some(n => n.type === 'attack' && n.to.length === 3) && news.some(n => n.type === 'bomb') && news.some(n => n.type === 'bombFizzle'));
  const j = MULTI.fromJSON(JSON.parse(JSON.stringify(MULTI.toJSON(m)))); assert.equal(j.players[1].game.inbox.length, 2); assert.ok(j.players[0].face);
});

// ----- 멀티 3단계: 서버(www/api/match.js, 인메모리 스토어) · 재실행 검증 · ELO -----
const API = require('../www/api/match.js');
const PIDS = ['aaaaaaaaaaaa', 'bbbbbbbbbbbb', 'cccccccccccc', 'dddddddddddd'];
const call = (S, d) => API.handle(S, d, 'test').then(r => r[1]);
t('멀티: 재실행 검증 — 같은 시드·같은 입력 로그면 같은 판, 한 줄만 빠져도 다르다', () => {
  const m = MULTI.newMatch({ seed: 77, name: 'H' }); const h = m.players[0].game; let g = 0;
  while (!(h.phase === 'over' || h.phase === 'win') && g++ < 500) { BOT.multiDay(h, 'greedy'); h.takeEvents(); MULTI.tick(m); if (h.month > (m._c || 0)) { m._c = h.month; MULTI.cycleDrop(m, h.month); } }
  const f = MULTI.fingerprint(h); assert.ok(h.actLog.length > 50 && h.actLog.some(e => e.t === 'atk') && h.actLog.some(e => e.t === 'rbuy'));
  assert.ok(MULTI.verify(h.cfg, h.actLog, f).ok); const bad = h.actLog.slice(); bad.splice(bad.findIndex(e => e.t === 'wait'), 1); assert.ok(!MULTI.verify(h.cfg, bad, f).ok);
  assert.ok(!MULTI.verify(h.cfg, h.actLog, Object.assign({}, f, { cash: f.cash + 1 })).ok, '잔액을 부풀리면 안 맞는다');
});
t('서버: 큐 — 넷이 모이면 매치(서버 시드·첫 사람이 호스트), 큐에서 빠지고 mp 에 매치가 걸린다', async () => {
  const S = API.memStore();
  for (const p of PIDS.slice(0, 3)) { const r = await call(S, { op: 'queue', pid: p, name: 'P', face: 'park' }); assert.equal(r.status, 'waiting'); }
  const r = await call(S, { op: 'queue', pid: PIDS[3], name: 'Q', face: 'yeo' });
  assert.equal(r.status, 'ready'); assert.equal(r.match.players.length, 4); assert.ok(r.match.players[0].host && r.match.players[0].pid === PIDS[0]); assert.ok(r.match.rated);
  assert.equal((await call(S, { op: 'queue', pid: PIDS[1], name: 'P' })).status, 'ready', '이미 매치가 걸린 사람은 다시 그 매치');
  assert.equal((await call(S, { op: 'status', mid: r.match.id, pid: PIDS[2] })).match.id, r.match.id);
  assert.equal((await call(S, { op: 'status', mid: r.match.id, pid: 'zzzzzzzzzzzz' })).error, 'notin');
});
t('서버: 큐 — 60초 넘게 기다리면 봇으로 채운다(봇 판은 무등급), 이름은 정리한다', async () => {
  const S = API.memStore();
  await S.call([['HSET', 'mq', PIDS[0], JSON.stringify({ pid: PIDS[0], name: 'X<b>', face: 'park', elo: 1200, at: Math.floor(Date.now() / 1000) - 61 })]]);
  const r = await call(S, { op: 'queue', pid: PIDS[1], name: 'Y', face: 'noh' });
  assert.equal(r.status, 'ready'); assert.equal(r.match.players.filter(p => p.bot).length, 2); assert.ok(r.match.rated, '사람 둘이면 등급 판(봇과의 쌍만 안 센다)'); 
  assert.ok(r.match.players.every(p => p.face));
});
t('서버: 중계 — 공격은 나 빼고 전원, 🎯 는 평판 1위 한 명, 폭탄은 랜덤 한 명(상한 4), 사이클 투하는 한 번, 마감한 사람은 제외', async () => {
  const S = API.memStore(); for (const p of PIDS) await call(S, { op: 'queue', pid: p, name: 'P', face: 'park' });
  const mid = (await call(S, { op: 'status', mid: (await S.call([['GET', 'mp:' + PIDS[0]]]))[0], pid: PIDS[0] })).match.id;
  const snaps = {}; PIDS.forEach((p, i) => snaps[p] = { cash: 100 * (i + 1), rep: 10 + i, phase: 'play', bombs: 0 });
  for (const p of PIDS) await call(S, { op: 'push', mid, pid: p, snaps: { [p]: snaps[p] } });
  await call(S, { op: 'push', mid, pid: PIDS[0], events: [{ from: PIDS[0], type: 'attackOut', trait: 't_hurry', mult: 1 }] });
  for (const p of PIDS.slice(1)) { const r = await call(S, { op: 'poll', mid, pid: p, since: 0 }); assert.equal(r.events.filter(e => e.type === 'attack').length, 1, p); }
  await call(S, { op: 'push', mid, pid: PIDS[0], events: [{ from: PIDS[0], type: 'attackOut', trait: 't_seal', mult: 3, focus: true }] });
  const d = await call(S, { op: 'poll', mid, pid: PIDS[3], since: 0 }), b = await call(S, { op: 'poll', mid, pid: PIDS[1], since: 0 });
  assert.equal(d.events.filter(e => e.trait === 't_seal').length, 1, '평판 1위(d)에게'); assert.equal(b.events.filter(e => e.trait === 't_seal').length, 0);
  assert.ok(!(await call(S, { op: 'push', mid, pid: PIDS[1], events: [{ from: PIDS[0], type: 'attackOut', trait: 't_hurry' }] })).routed, '남의 이름으로는 못 쏜다');
  await call(S, { op: 'push', mid, pid: PIDS[0], events: [{ from: PIDS[0], type: 'attackOut', trait: 't_bomb', size: 3 }] });
  let bombs = 0; for (const p of PIDS) { const r = await call(S, { op: 'poll', mid, pid: p, since: 0 }); bombs += r.events.filter(e => e.type === 'bomb' && e.to && e.to[0] === p).length; }
  assert.equal(bombs, 1, '폭탄은 한 명에게');
  for (const p of PIDS.slice(1)) await call(S, { op: 'push', mid, pid: p, snaps: { [p]: Object.assign({}, snaps[p], { bombs: 2 }) } });   // 스냅샷상 폭탄 6개 = 상한 초과
  await call(S, { op: 'push', mid, pid: PIDS[0], events: [{ from: PIDS[0], type: 'attackOut', trait: 't_bomb', size: 3 }] });
  const all = await call(S, { op: 'poll', mid, pid: PIDS[0], since: 0 }); assert.equal(all.events.filter(e => e.type === 'bombFizzle').length, 1, '상한이면 불발');
  for (const p of PIDS.slice(1)) await call(S, { op: 'push', mid, pid: p, snaps: { [p]: snaps[p] } });
  await call(S, { op: 'push', mid, pid: PIDS[0], events: [{ from: PIDS[0], type: 'cycle', n: 1 }, { from: PIDS[0], type: 'cycle', n: 1 }] });
  assert.equal((await call(S, { op: 'poll', mid, pid: PIDS[0], since: 0 })).events.filter(e => e.drop).length + (await call(S, { op: 'poll', mid, pid: PIDS[1], since: 0 })).events.filter(e => e.drop).length + (await call(S, { op: 'poll', mid, pid: PIDS[2], since: 0 })).events.filter(e => e.drop).length + (await call(S, { op: 'poll', mid, pid: PIDS[3], since: 0 })).events.filter(e => e.drop).length, 1, '사이클 투하는 한 번');
  await call(S, { op: 'push', mid, pid: PIDS[3], snaps: { [PIDS[3]]: { cash: 400, phase: 'win', bombs: 0 } } });
  const c0 = (await call(S, { op: 'poll', mid, pid: PIDS[3], since: 0 })).events.length;
  await call(S, { op: 'push', mid, pid: PIDS[0], events: [{ from: PIDS[0], type: 'attackOut', trait: 't_rain' }] });
  assert.equal((await call(S, { op: 'poll', mid, pid: PIDS[3], since: 0 })).events.length, c0, '마감한 창고엔 안 간다');
  const pc = await call(S, { op: 'poll', mid, pid: PIDS[2], since: 3 }); assert.ok(pc.cursor > 3 && pc.events.every(e => e.i > 3), '커서 뒤 것만');
});
t('서버: 종료 — 입력 로그를 다시 돌려 검증하고, 넷이 다 끝나면 순위·ELO(모든 쌍 1:1, K32) · 조작 기록은 무효', async () => {
  const S = API.memStore(); for (const p of PIDS) await call(S, { op: 'queue', pid: p, name: 'P', face: 'park' });
  const mid = (await S.call([['GET', 'mp:' + PIDS[0]]]))[0], m = (await call(S, { op: 'status', mid, pid: PIDS[0] })).match;
  const games = {}; const cfgOf = pid => ({ multi: true, seed: m.seed, scenario: 'kr_summer', company: 'local', perks: [], prep: false, mtheme: MULTI.themeOf(m.seed), pid });
  for (const p of PIDS) { const g = new Game(cfgOf(p)); let k = 0; while (g.phase === 'play' || g.phase === 'market') { BOT.multiDay(g, ['greedy', 'balanced', 'saver', 'greedy'][PIDS.indexOf(p)]); g.takeEvents(); if (++k > 600) break; } games[p] = g; }
  for (const p of PIDS.slice(0, 3)) { const g = games[p], f = MULTI.fingerprint(g); const r = await call(S, { op: 'finish', mid, pid: p, result: { cash: f.cash, rep: f.rep, day: f.day, win: g.phase === 'win' }, cfg: cfgOf(p), log: g.actLog }); assert.ok(r.verified, p); assert.equal(r.settled, null); }
  const g4 = games[PIDS[3]], f4 = MULTI.fingerprint(g4);
  const r4 = await call(S, { op: 'finish', mid, pid: PIDS[3], result: { cash: f4.cash, rep: f4.rep, day: f4.day, win: g4.phase === 'win' }, cfg: cfgOf(PIDS[3]), log: g4.actLog });
  assert.ok(r4.verified && r4.settled && r4.settled.rated); const rows = r4.settled.rows; assert.deepEqual(rows.map(r => r.rank), [1, 2, 3, 4]);
  const elo = r4.settled.elo; const sum = PIDS.reduce((a, p) => a + elo[p].delta, 0); assert.ok(Math.abs(sum) <= 2, '제로섬 근처 ' + sum);
  assert.ok(elo[rows[0].pid].delta > 0 && elo[rows[3].pid].delta < 0); assert.equal((await call(S, { op: 'elo', pid: rows[0].pid })).games, 1);
  assert.ok(!(await S.call([['GET', 'mp:' + PIDS[0]]]))[0], '끝나면 매치 배정이 풀린다');
  // 조작: 잔액을 부풀린 기록 → 미검증 → 그 판은 무효
  const S2 = API.memStore(); for (const p of PIDS) await call(S2, { op: 'queue', pid: p, name: 'P', face: 'park' });
  const mid2 = (await S2.call([['GET', 'mp:' + PIDS[0]]]))[0], m2 = (await call(S2, { op: 'status', mid: mid2, pid: PIDS[0] })).match;
  const cfg2 = pid => ({ multi: true, seed: m2.seed, scenario: 'kr_summer', company: 'local', perks: [], prep: false, pid });
  let last = null;
  for (const p of PIDS) { const g = new Game(cfg2(p)); let k = 0; while ((g.phase === 'play' || g.phase === 'market') && ++k < 600) { BOT.multiDay(g, 'balanced'); g.takeEvents(); } const f = MULTI.fingerprint(g); last = await call(S2, { op: 'finish', mid: mid2, pid: p, result: { cash: f.cash + (p === PIDS[0] ? 9999 : 0), rep: f.rep, day: f.day, win: g.phase === 'win' }, cfg: cfg2(p), log: g.actLog }); }
  assert.ok(last.settled && !last.settled.rated && last.settled.rows.some(r => !r.verified)); assert.equal((await call(S2, { op: 'elo', pid: PIDS[1] })).games, 0);
});
t('서버: 등급 이름 — 1200 견습 · 200 마다 한 칸 · 2400+ 상하차의 신', () => {
  assert.equal(API.rankOf(1200), 'trainee'); assert.equal(API.rankOf(1399), 'trainee'); assert.equal(API.rankOf(1400), 'driver'); assert.equal(API.rankOf(2000), 'branch'); assert.equal(API.rankOf(2400), 'god'); assert.equal(API.rankOf(3000), 'god');
});
t('멀티: 온라인 매치 — 서버 자리로 내 판(+호스트면 봇 판), 원격은 스냅샷으로 순위, 서버 이벤트 적용·저장·복원', () => {
  const sm = { id: 'm1', seed: 91, players: [{ pid: PIDS[0], name: 'A', face: 'park', host: true }, { pid: PIDS[1], name: 'B', face: 'yeo' }, { pid: 'bot2', name: '봇', face: 'noh', bot: true, strat: 'greedy' }, { pid: 'bot3', name: '봇2', face: 'kang', bot: true, strat: 'saver' }] };
  const host = MULTI.newOnline(sm, PIDS[0], { name: 'A' }); assert.equal(host.players[0].id, PIDS[0]); assert.ok(host.online.host && host.players.filter(p => p.game).length === 3 && !host.players.find(p => p.id === PIDS[1]).game);
  const guest = MULTI.newOnline(sm, PIDS[1], { name: 'B' }); assert.equal(guest.players[0].id, PIDS[1]); assert.ok(!guest.online.host && guest.players.filter(p => p.game).length === 1);
  assert.deepEqual(MULTI.owned(host).sort(), [PIDS[0], 'bot2', 'bot3'].sort());
  MULTI.applyServer(guest, { cursor: 2, snaps: { [PIDS[0]]: { cash: 900, rep: 30, repCap: 36, day: 20, phase: 'play', bombs: 1 }, bot2: { cash: 50, phase: 'over', day: 9 } }, events: [{ i: 1, type: 'attack', from: PIDS[0], to: [PIDS[1]], trait: 't_hurry', mult: 1, fromName: 'A' }, { i: 2, type: 'bomb', from: 'bot3', to: [PIDS[1]], bomb: { size: 3, days: 6, hops: 0, from: 'bot3' } }] });
  const g = guest.players[0].game; assert.equal(g.inbox.length, 1); assert.equal(g.bombCount(), 1); assert.equal(guest.online.since, 2);
  const st = MULTI.standings(guest); assert.equal(st[0].p.id, PIDS[0], '스냅샷 잔액 900 이 1위'); assert.ok(!st.find(r => r.p.id === 'bot2').alive);
  assert.equal(guest.news.length, 2);
  g.outbox.push({ type: 'attackOut', trait: 't_rain', mult: 1 }); MULTI.route(guest); assert.equal(guest.online.pending.length, 1); assert.equal(guest.online.pending[0].from, PIDS[1]);
  const out = MULTI.outgoing(guest); assert.equal(out.events.length, 1); assert.ok(out.snaps[PIDS[1]] && out.snaps[PIDS[1]].bombs === 1); assert.equal(guest.online.pending.length, 0);
  const back = MULTI.fromJSON(JSON.parse(JSON.stringify(MULTI.toJSON(guest)))); assert.ok(back.online && back.online.mid === 'm1' && back.players[0].game && !back.players[1].game && back.players[1].snap.cash === 900);
});

// ----- 멀티 4단계: 친구 초대 방 · ELO 보드 · 봇 이름 -----
t('서버: 친구 초대 — 코드 6자 방, 혼자면 시작 불가, 친구가 들어오면 시작(남은 자리 봇), 초대 판은 ELO 미반영, 잘못된 코드·꽉 찬 방·시작한 방 거부', async () => {
  const S = API.memStore();
  let r = await call(S, { op: 'invite', pid: PIDS[0], name: 'A', face: 'park' }); assert.equal(r.status, 'room'); assert.ok(/^[A-Z2-9]{6}$/.test(r.code)); const code = r.code;
  assert.equal((await API.handle(S, { op: 'roomStart', pid: PIDS[0], code }, 't'))[1].error, 'alone');
  assert.equal((await API.handle(S, { op: 'join', pid: PIDS[1], name: 'B', code: 'ZZZZZZ' }, 't'))[0], 404);
  r = await call(S, { op: 'join', pid: PIDS[1], name: 'B', face: 'yeo', code }); assert.equal(r.players.length, 2); assert.equal(r.host, PIDS[0]);
  assert.equal((await API.handle(S, { op: 'roomStart', pid: PIDS[1], code }, 't'))[1].error, 'nothost', '방장만 시작');
  r = await call(S, { op: 'roomStart', pid: PIDS[0], code }); assert.equal(r.status, 'ready'); assert.ok(!r.match.rated && r.match.invite === code); assert.equal(r.match.players.filter(p => p.bot).length, 2); assert.ok(r.match.players.filter(p => p.bot).every(p => typeof p.nid === 'number'));
  assert.equal((await call(S, { op: 'room', pid: PIDS[1], code })).status, 'ready', '손님도 폴링으로 매치를 받는다');
  assert.equal((await API.handle(S, { op: 'join', pid: PIDS[2], name: 'C', code }, 't'))[1].error, 'started');
  const r2 = await call(S, { op: 'invite', pid: PIDS[2], name: 'C', face: 'noh' }); for (const p of ['eeeeeeeeeeee', 'ffffffffffff', 'gggggggggggg']) await call(S, { op: 'join', pid: p, name: 'X', code: r2.code });
  assert.equal((await API.handle(S, { op: 'join', pid: 'hhhhhhhhhhhh', name: 'Y', code: r2.code }, 't'))[1].error, 'full');
  await call(S, { op: 'roomLeave', pid: PIDS[2], code: r2.code }); assert.equal((await call(S, { op: 'room', pid: 'eeeeeeeeeeee', code: r2.code })).status, 'gone', '방장이 나가면 방이 닫힌다');
});
t('서버: ELO 보드 — 등급 판이 정산되면 올라가고, 내 자리도 준다', async () => {
  const S = API.memStore(); for (const p of PIDS) await call(S, { op: 'queue', pid: p, name: 'P' + p[0], face: 'park' });
  const mid = (await S.call([['GET', 'mp:' + PIDS[0]]]))[0], m = (await call(S, { op: 'status', mid, pid: PIDS[0] })).match;
  const cfgOf = pid => ({ multi: true, seed: m.seed, scenario: 'kr_summer', company: 'local', perks: [], prep: false, mtheme: MULTI.themeOf(m.seed), pid });
  for (const p of PIDS) { const g = new Game(cfgOf(p)); let k = 0; while ((g.phase === 'play' || g.phase === 'market') && ++k < 600) { BOT.multiDay(g, 'balanced'); g.takeEvents(); } const f = MULTI.fingerprint(g); await call(S, { op: 'finish', mid, pid: p, result: { cash: f.cash, rep: f.rep, day: f.day, win: g.phase === 'win' }, cfg: cfgOf(p), log: g.actLog }); }
  const b = await call(S, { op: 'board', pid: PIDS[1] }); assert.equal(b.total, 4); assert.equal(b.top[0].rank, 1); assert.ok(b.top[0].elo >= b.top[3].elo); assert.ok(b.me && b.me.rank >= 1 && b.top.some(r => r.me));
  assert.equal((await call(S, { op: 'board', pid: 'zzzzzzzzzzzz' })).me, null);
});
t('멀티: 온라인 봇 이름은 내 언어의 이름표(nid)로, 방 생성 매치도 newOnline 이 그대로 받는다', () => {
  const sm = { id: 'm2', seed: 5, rated: false, invite: 'ABCDEF', players: [{ pid: PIDS[0], name: 'A', face: 'park', host: true }, { pid: PIDS[1], name: 'B', face: 'yeo' }, { pid: 'bot2', name: '한길', nid: 0, face: 'noh', bot: true, strat: 'greedy' }, { pid: 'bot3', name: '번개', nid: 1, face: 'kang', bot: true, strat: 'saver' }] };
  const g = MULTI.newOnline(sm, PIDS[1], { name: 'B', botNames: ['Hangil', 'Bolt'] });
  assert.deepEqual(g.players.filter(p => p.bot).map(p => p.name), ['Hangil', 'Bolt']); assert.equal(g.players[0].id, PIDS[1]); assert.ok(!g.online.host);
});

t('멀티: 먼저 마감한 사람 빼고는 그때 남은 날 ÷3 만큼 평판 페널티 · 승부는 최종 평판', () => {
  const m = MULTI.newMatch({ seed: 61, name: 'H' }); const [h, a, b, c] = m.players.map(p => p.game);
  a.phase = 'win'; a.totalTurn = 78; h.totalTurn = 60; b.totalTurn = 72; c.totalTurn = 78;
  MULTI.noteFinish(m); assert.equal(m.firstFinish.id, 1); assert.deepEqual(m.firstFinish.days, { 0: 60, 2: 72, 3: 78 });
  const rows = MULTI.standings(m); const by = {}; for (const r of rows) by[r.p.id] = r;
  assert.equal(by[1].penalty, 0); assert.equal(by[0].penalty, 6); assert.equal(by[2].penalty, 2); assert.equal(by[3].penalty, 0);
  assert.equal(by[0].repFinal, Math.max(0, h.rep - 6));
  MULTI.noteFinish(m); assert.equal(m.firstFinish.id, 1, '한 번 정해지면 안 바뀐다');
  const j = MULTI.fromJSON(JSON.parse(JSON.stringify(MULTI.toJSON(m)))); assert.deepEqual(j.firstFinish.days, m.firstFinish.days);
});

Promise.all(pending).then(() => { console.log(`\n${n} tests passed${fails.length ? `, ${fails.length} FAILED` : ''}`); if (fails.length) process.exit(1); });
