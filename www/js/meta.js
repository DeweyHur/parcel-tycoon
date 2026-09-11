// 메타 진행 데이터: 회사 · 퍽 · 시나리오 · 도전과제 (docs/META_DESIGN.md v0.1)
// 이름·설명 등 텍스트 필드는 locales/<lang>.js 의 meta 섹션에 있고, i18n.js 가 같은 모양으로 덮어쓴다
(function (root) {

  // ----- 고객(화주) (docs/CUSTOMER_DESIGN.md 2장) -----
  // items: 품목 가중치(택배 종류). rule: 특수 규칙. claimMult: 폐기 시 손해배상 배율. perks[lv]: 신뢰 단계 혜택(2·3단계)
  const CUSTOMER_LEVELS = [0, 8, 24, 60, 120, 220]; // 4·5단계: 한 해 후반의 성장 축(혜택은 3단계까지, 물량·보너스는 계속)
  const CUSTOMER_VOLUME = [0.6, 1.0, 1.3, 1.6, 2.0, 2.4];
  // 고객 신뢰 단계별 월 추가 입고(개) — 신뢰가 오르면 물량이 배 이상으로 는다(총 입고에 더해짐)
  const CUSTOMER_EXTRA = [0, 3, 6, 12, 20, 32];
  const CUSTOMER_BONUS = [0, 5, 10, 15, 20, 25];
  const CUSTOMERS = {
    anon:    { icon: '📦', items: null, sizeBias: null, rule: null, claimMult: 1.0, perks: {} },
    dawn:    { icon: '🌙', items: { fresh: 70, normal: 30 }, sizeBias: 'small', claimMult: 1.5,
      rule: { kind: 'sameTurn', bonus: 20 },
      perks: { 2: { cold: 2 }, 3: { deadlineDelta: 1 } } },
    mart:    { icon: '🛒', items: { normal: 60, fresh: 20, fragile: 20 }, sizeBias: null, claimMult: 1.0,
      rule: { kind: 'bundle', min: 3, mult: 1.1 },
      perks: { 2: { carrierCap: { bulk: 1 } }, 3: { rewardDelta: 5 } } },
    glass:   { icon: '🏺', items: { fragile: 80, normal: 20 }, sizeBias: 'mid', claimMult: 2.0,
      rule: { kind: 'streak', n: 5, bonus: 30 },
      perks: { 2: { breakMult: 0.5 }, 3: { bonusDelta: 10 } } },
    import:  { icon: '🛃', items: { intl: 70, fragile: 15, large: 15 }, sizeBias: null, claimMult: 1.2,
      rule: { kind: 'customsFast', delta: -1 },
      perks: { 2: { marketWeight: { intl: 2 } }, 3: { bonusDelta: 15 } } },
    factory: { icon: '🪑', items: { large: 80, normal: 20 }, sizeBias: 'big', claimMult: 1.3,
      rule: { kind: 'sameArrival', bonus: 25 },
      perks: { 2: { xl: 1 }, 3: { bigSizeDelta: -1 } } },
    ice:     { icon: '❆', items: { frozen: 90, fresh: 10 }, sizeBias: null, claimMult: 1.8,
      rule: { kind: 'frozenSafe', bonus: 15 },
      perks: { 2: { facilityPrice: { freezer1: 0.5 } }, 3: { deadlineDelta: 2 } } },
    luxury:  { icon: '💎', items: { intl: 50, intlfragile: 50 }, sizeBias: 'small', claimMult: 2.0,
      rule: { kind: 'secure', bonus: 20 },
      perks: { 2: { marketWeight: { air: 2 } }, 3: { customsDelta: -1 } } },
    farm:    { icon: '🌾', items: { produce: 80, normal: 20 }, sizeBias: null, claimMult: 1.2,
      rule: { kind: 'harvest', bonus: 15 },
      perks: { 2: { facilityPrice: { vent: 0.5 } }, 3: { deadlineDelta: 1 } } },
    mover:   { icon: '🚚', items: null, storage: true, sizeBias: null, claimMult: 2.0, rule: null, perks: { 2: { storageFee: 0.2 }, 3: { storageVolDelta: -2 } } },
  };
  // 보관 계약 종류 (docs/CUSTOMER_DESIGN.md 3장)
  const STORAGE_KINDS = {
    move:   { icon: '🏠', vol: [6, 10], turns: [3, 6], perVolTurn: 5, weight: 70 },
    season: { icon: '📦', vol: [4, 4], turns: [12, 15], perTurn: 10, weight: 20 },
    event:  { icon: '🎪', vol: [2, 2], turns: [2, 2], fee: 60, weight: 0, peakWeight: 40 },
  };
  // 보험사 (5장). cover: all | attrs+other | kinds+other. fans: 선호 고객(가입 중 월초 xp +1)
  const INSURERS = {
    none:      { icon: '—', fee: 0, cover: null, fans: [] },
    sturdy:    { icon: '🛡', fee: 60, cover: { all: 0.5 }, fans: ['mart'] },
    coldguard: { icon: '❄', fee: 50, cover: { attrs: { cold: 0.8, frozen: 0.8 }, other: 0.2 }, fans: ['dawn', 'ice', 'farm'] },
    safebox:   { icon: '📦', fee: 50, cover: { kinds: { broken: 0.8, stolen: 0.8 }, other: 0.2 }, fans: ['glass', 'import', 'luxury'] },
    premier:   { icon: '👑', fee: 110, cover: { all: 0.9 }, noReturnStress: true, fans: ['factory', 'mover'] },
  };
  // 이번 달 청구 건수 → 다음 달 보험료 배율
  const PREMIUM_STEPS = [[0, 0.8], [2, 1.0], [4, 1.3], [Infinity, 1.7]];
  // 특수 보험 (마켓 1회성)
  const INS_ITEMS = {
    transitCert: { icon: '📜', price: 40 },
    yardIns:     { icon: '⛺', price: 70 },
    customsBond: { icon: '🛃', price: 50 },
  };
  // 날씨 (4.4장). 계절별 기본 가중치
  const WEATHER = {
    sunny: { icon: '☀' },
    rain:  { icon: '🌧' },
    heat:  { icon: '🔥' },
    snow:  { icon: '❄️' },
    storm: { icon: '🌀' },
  };
  const WEATHER_BY_SEASON = {
    spring: { sunny: 60, rain: 25, storm: 5 },
    summer: { sunny: 50, rain: 20, heat: 15, storm: 5 },
    autumn: { sunny: 60, rain: 25, storm: 5 },
    winter: { sunny: 55, rain: 15, snow: 20, storm: 3 },
  };
  // 복합 품목: 종류 + 추가 속성
  const CUSTOMER_ITEMS = { intlfragile: { type: 'intl', attrs: ['customs', 'fragile'], sizes: [1, 2] } };
  const CUSTOMER_SLOTS = 4; // 익명 제외 고객 최대 수
  // 난이도 (docs/CARRIER_CAPABILITY_DESIGN.md 4장): 시나리오 규칙 위에 곱해지는 얇은 층
  const DIFFICULTIES = {
    rookie:  { icon: '🌱', mods: { arrivalsMult: 0.85, opCostDelta: -20, feeMult: 0.8, itemPriceMult: 0.9, contractPriceMult: 0.9, facilityPriceMult: 0.9, theftMult: 0.5, breakMult: 0.5, claimMult: 0.5, upcomingTurns: 3, gameoverStress: 24, scoreMult: 0.7, noDualAttrs: true }, unlock: null },
    normal:  { icon: '📦', mods: {}, unlock: null },
    veteran: { icon: '🔥', mods: { arrivalsMult: 1.15, opCostDelta: 40, feeMult: 1.3, theftMult: 1.3, breakMult: 1.3, claimMult: 1.5, gameoverStress: 16, scoreMult: 1.4, dualAttrBonus: 3 }, unlock: 'first_clear' },
  };

  const COMPANIES = {
    local: {
      customers: [['mart', 1], ['dawn', 0], ['glass', 0], ['anon', 0]],
      icon: '🏠',
      warehouse: { cap: 24, cold: 6, xl: 1 }, cash: 450,
      contracts: [{ carrier: 'bulk' }, { carrier: 'cold' }, { carrier: 'fragile', calls: 2 }],
      mods: { firstCallBonus: 1 }, unlock: null, tier: 0 },
    fresh: {
      customers: [['dawn', 2], ['ice', 1], ['farm', 0], ['anon', 0]],
      icon: '🧊',
      warehouse: { cap: 22, cold: 10, xl: 1 }, cash: 380,
      contracts: [{ carrier: 'cold', grade: 'trusted' }, { carrier: 'frozen' }, { carrier: 'bulk', calls: 3 }],
      mods: { freshExtra: 1, coldTrustBonus: 1, rewardMult: { fragile: 0.9, intl: 0.9 }, banCarriers: ['large'], marketWeight: { cold: 2, cold1: 2, cold2: 2 } },
      unlock: 'fresh30', tier: 2 },
    steel: {
      customers: [['factory', 2], ['mover', 1], ['import', 0], ['anon', 0]],
      icon: '🏗️',
      warehouse: { cap: 34, cold: 0, xl: 3 }, cash: 350,
      contracts: [{ carrier: 'large' }, { carrier: 'rail' }, { carrier: 'bulk', calls: 3 }],
      mods: { bigSizeDelta: -1, carrierCapDelta: { large: 1 }, coldCapMax: 4, marketWeight: { large: 2, expand1: 1.5, expand2: 1.5, expand3: 1.5, cold: 0.5 } },
      unlock: 'big20', tier: 2 },
    quick: {
      customers: [['dawn', 1], ['mart', 1], ['glass', 1]],
      icon: '🛵',
      warehouse: { cap: 16, cold: 4, xl: 0 }, cash: 420,
      contracts: [{ carrier: 'bulk' }, { carrier: 'fragile' }, { carrier: 'cold', calls: 2 }],
      mods: { callsDelta: 1, selfCapDelta: 1, facilityCapMult: 0.5, marketWeight: { limit1: 2, limit2: 2, expand1: 0.5, expand2: 0.5, expand3: 0.5 } },
      unlock: 'rookie', tier: 1 },
    global: {
      customers: [['import', 2], ['luxury', 1], ['glass', 0], ['anon', 0]],
      icon: '✈️',
      warehouse: { cap: 26, cold: 4, xl: 2 }, cash: 380,
      contracts: [{ carrier: 'intl' }, { carrier: 'air' }, { carrier: 'bulk', calls: 3 }],
      mods: { rewardDelta: { intl: 20, normal: -5 }, carrierStartTrust: { intl: 20 }, opCostRandom: [110, 190], marketWeight: { intl: 2 }, gradeShift: 0.3 },
      unlock: 'worldwide', tier: 2 },
    glass: {
      customers: [['glass', 2], ['mart', 1], ['anon', 0]],
      icon: '🫙',
      warehouse: { cap: 24, cold: 4, xl: 1 }, cash: 420,
      contracts: [{ carrier: 'fragile', grade: 'trusted' }, { carrier: 'bulk', calls: 3 }],
      mods: { deadlineDelta: { fragile: 2 }, rewardDelta: { fragile: 15 }, carrierCapDelta: { bulk: -1 }, bigCallPenalty: 5, marketWeight: { fragile: 2, cap1: 0.7 } },
      unlock: 'fragile30', tier: 2 },
    thrifty: {
      customers: [['mart', 2], ['mover', 1], ['anon', 0], ['anon', 0]],
      icon: '🪙',
      warehouse: { cap: 30, cold: 6, xl: 1 }, cash: 560,
      contracts: [{ carrier: 'bulk' }, { carrier: 'cold' }, { carrier: 'fragile', calls: 1 }],
      mods: { premiumMult: 0.8, priceMult: 0.8, feeMult: 0.8, waitStack: 3, callsDelta: -1, opCostDelta: 40, marketWeight: { cap1: 1.5, limit1: 0.7, limit2: 0.7 } },
      unlock: 'two_clears', tier: 1 },
    startup: {
      customers: null,
      icon: '🚀',
      warehouse: null, cash: 260, contracts: null,
      mods: { noInsurance: true, randomStart: true, freeRefresh: 1, marketContractSlots: 3, gradeShift: 0.15, erosion: true, lateOpCost: { from: 3, delta: 30 } },
      unlock: 'three_companies', tier: 3 },
    postal: {
      customers: [['anon', 0], ['anon', 0], ['anon', 0], ['mart', 1]],
      icon: '📮',
      warehouse: { cap: 28, cold: 6, xl: 1 }, cash: 450,
      contracts: [{ carrier: 'bulk', grade: 'trusted' }, { carrier: 'cold' }, { carrier: 'fragile', calls: 2 }],
      mods: { premiumDelta: { premier: -30 }, opCostFixed: 120, feeFixed: 35, selfCapDelta: 1, stressRelief: { min: 10, amount: 2 }, marketMaxBuy: 2, expertFrom: 5, bonusDelta: -5, marketWeight: { trusted: 1.3, expert: 0.5, master: 0.5 } },
      unlock: 'first_clear', tier: 1 },
  };

  const PERKS = {
    // 계약 계열
    longdeal:  { family: 'contract', mods: { contractPriceMult: 0.9 }, unlock: null },
    prepay:    { family: 'contract', mods: { firstContractDiscount: 40 }, unlock: 'buyer' },
    protect:   { family: 'contract', mods: { keepCalls: 1 }, unlock: 'fresh_start' },
    regularco: { family: 'contract', mods: { allStartTrust: 3 }, unlock: 'trust3' },
    spare:     { family: 'contract', mods: { spareCall: true }, unlock: 'empty_tank' },
    bundle:    { family: 'contract', mods: { bundleRefund: 4 }, unlock: 'big_haul' },
    // 창고 계열
    compact:   { family: 'warehouse', mods: { sizeDelta: -1 }, unlock: null },
    coldpro:   { family: 'warehouse', mods: { freshExtra: 1 }, unlock: 'no_spoil' },
    tempyard:  { family: 'warehouse', mods: { overflowGrace: 2 }, unlock: 'overflow_survivor' },
    shelves:   { family: 'warehouse', mods: { capDelta: 4 }, unlock: 'expander' },
    freezer:   { family: 'warehouse', mods: { freezer: 2 }, unlock: 'cold_buyer', needsCold: true },
    yard:      { family: 'warehouse', mods: { xlDelta: 1, xlPenalty: 2 }, unlock: 'xl_stack' },
    // 운영 계열
    skip:      { family: 'ops', mods: { skipBonus: 1 }, unlock: null },
    insure:    { family: 'ops', mods: { insurance: true }, unlock: null },
    tent:      { family: 'warehouse', mods: { tent: true }, unlock: null },
    breath:    { family: 'ops', mods: { monthlyStress: -1 }, unlock: 'survivor' },
    overtime:  { family: 'ops', mods: { overdueMult: 0.9 }, unlock: 'late_but_done' },
    foresight: { family: 'ops', mods: { upcomingTurns: 4 }, unlock: 'waiter' },
    emergency: { family: 'ops', mods: { feeMult: 0.85 }, unlock: 'clutch' },
    // 수익 계열
    regulars:  { family: 'income', mods: { rewardDelta: { normal: 5 } }, unlock: 'normal100' },
    premium:   { family: 'income', mods: { bonusDelta: 5 }, unlock: 'all_special' },
    closing:   { family: 'income', mods: { closingBonus: { usage: 0.6, amount: 60 } }, unlock: 'tidy' },
    consult:   { family: 'income', mods: { trustXpDelta: 1 }, unlock: 'trusted_three' },
    taxsave:   { family: 'income', mods: { opCostDelta: -20 }, unlock: 'rich' },
    investor:  { family: 'income', mods: { cashDelta: 150, opCostDelta: 20 }, unlock: 'broke' },
  };
  const PERK_FAMILIES = {}; // 계열 id → 이름, locales/<lang>.js meta.PERK_FAMILIES

  const DAILY_VARIANTS = {
    fog:      { mods: { upcomingTurns: 1 } },
    express:  { mods: { deadlineAll: -1, rewardAll: 10 } },
    bigweek:  { mods: { bigWeight: 2 } },
    inflation:{ mods: { itemPriceMult: 1.3, revenueMult: 1.1 } },
    trustboom:{ mods: { trustXpMult: 2 } },
    repair:   { mods: { capDelta: -4, facilityPriceMult: 0.5 } },
    picky:    { mods: { overdueMult: 0.5 } },
    generous: { mods: { bigCallBonus: { min: 3, mult: 1.15 } } },
  };
  const DAILY_CONFLICTS = [['picky', 'generous'], ['express', 'picky']];

  const SCENARIOS = {
    half:     { icon: '🎓', months: 6, mods: { scoreMult: 0.8 }, unlock: null },
    standard: { icon: '📅', months: 12, mods: { scoreMult: 1.5 }, unlock: null },
    peak:     { icon: '🎄', months: 2, mods: { eventGoods: true, returnGrace: 2, burstDeadlineDelta: -2, arrivalsMult: 1.5, burstTurns: 5, rewardAll: 10, itemPriceMult: 1.3, startCallsDelta: 2, winDelivered: 50 }, unlock: 'busy_month' },
    heatwave: { icon: '🌡️', months: 3, mods: { season: 'summer', customerWeights: { dawn: 2, ice: 2 }, customerClaimMult: { dawn: 2 }, typeShift: { fresh: 12, produce: 8, normal: -20 }, freshSizes: [2, 4, 7], warmMult: 3, heatAlerts: 3, arrivalsMult: 1.0, facilityPriceMult: { cold1: 0.7, cold2: 0.7 }, marketWeight: { cold: 1.5 }, winMaxDiscard: 3 }, unlock: 'fresh20' },
    strike:   { icon: '✊', months: 3, mods: { strike: true, opCostDelta: 30 }, unlock: 'four_carriers' },
    port:     { icon: '🚢', months: 4, mods: { forceCustomers: ['import', 'luxury', 'factory'], noAnon: true, typeOverride: { normal: 40, fresh: 10, produce: 5, fragile: 13, intl: 20, large: 12 }, xlWeight: 7, arrivalsMult: 0.9, rewardDelta: { intl: 20, large: 20, normal: -5 }, xlDelta: 1, guaranteeCarriers: ['intl', 'large'] }, unlock: 'intl15' },
    cashcrunch:{ icon: '💸', months: 3, mods: { cashMult: 0.5, opCostFixed: 260, noRefresh: true, itemPriceMult: 1.1, revenueMult: 1.1, trustXpMult: 2, winCash: 600 }, unlock: 'rich_clear' },
    blackfriday:{ icon: '🛒', months: 1, mods: { returnGrace: 4, arrivalsMult: 2.3, burstTurns: 4, itemPriceMult: 1.4, rewardAll: 15, startCallsDelta: 3, winDelivered: 30 }, unlock: 'peak_clear' },
    audit:    { icon: '📋', months: 3, mods: { premiumMult: 1.5, claimMult: 1.5, deadlineAll: -1, overdueMult: 0.5, monthlyStress: 1, opCostDelta: 0, winMaxOverdue: 4 }, unlock: 'perfect_month' },
    moving:   { icon: '🚚', months: 3, mods: { forceCustomers: ['mover'], storageOfferEvery: 5, storageOfferProb: 0.2, storageMax: 3, storageFeeMult: 1.5, season: 'spring', winStorage: 5 }, unlock: 'storage3' },
    bigdeal:  { icon: '🤝', months: 3, mods: { bigCustomer: true, claimMult: 1.2, winBigCustomer: true }, unlock: 'cust_l3' },
    endless:  { icon: '♾️', months: 99, mods: { endless: true }, unlock: 'half_clear' },
    daily:    { icon: '📆', months: 3, mods: { daily: true }, unlock: 'three_unlocked' },
  };

  // 도전과제: kind = run(런 중 즉시) | end(런 종료 시, 승리 필요 여부 needWin) | cum(누적) | meta(해금 상태)
  // check(s, p, r): s=game.stats, p=profile.stats, r=result(런 종료 시)
  const ACHIEVEMENTS = {
    // 회사 해금 — 1단계(하다 보면) → 2단계(누적 특화) → 3단계(도전)
    rookie:       { kind: 'cum', rewardType: 'company', reward: 'quick', check: (s, p) => p.runs >= 3, prog: p => [p.runs, 3] },
    two_clears:   { kind: 'cum', rewardType: 'company', reward: 'thrifty', check: (s, p) => p.clears >= 2, prog: p => [p.clears, 2] },
    fresh30:      { kind: 'cum', rewardType: 'company', reward: 'fresh', check: (s, p) => p.deliveredByType.fresh >= 30, prog: p => [p.deliveredByType.fresh, 30] },
    fragile30:    { kind: 'cum', rewardType: 'company', reward: 'glass', check: (s, p) => p.deliveredByType.fragile >= 30, prog: p => [p.deliveredByType.fragile, 30] },
    worldwide:    { kind: 'cum', rewardType: 'company', reward: 'global', check: (s, p) => p.deliveredByType.intl >= 30, prog: p => [p.deliveredByType.intl, 30] },
    big20:        { kind: 'cum', rewardType: 'company', reward: 'steel', check: (s, p) => (p.bigDelivered || 0) >= 20, prog: p => [p.bigDelivered || 0, 20] },
    three_companies:{ kind: 'meta', rewardType: 'company', reward: 'startup', check: (s, p) => Object.keys(p.clearsByCompany).length >= 3, prog: p => [Object.keys(p.clearsByCompany).length, 3] },
    // 기록용 (예전 회사 해금 조건)
    fresh_king:   { kind: 'run', rewardType: 'none', check: s => s.deliveredByType.fresh >= 15 && s.discarded === 0 },
    giant:        { kind: 'run', rewardType: 'none', check: s => s.xlOnTime >= 5 },
    nonstop:      { kind: 'run', rewardType: 'none', check: s => s.maxCallStreak >= 30 },
    unbreakable:  { kind: 'run', rewardType: 'none', check: s => s.onTimeByType.fragile >= 12 },
    patience:     { kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => s.calls / Math.max(1, r.monthsDone) <= 4 },
    // 시나리오·슬롯 해금
    cust_l3:      { kind: 'run', rewardType: 'scenario', reward: 'bigdeal', check: s => (s.customerL3 || 0) >= 1 },
    storage3:     { kind: 'cum', rewardType: 'scenario', reward: 'moving', check: (s, p) => (p.storageDone || 0) >= 3, prog: p => [p.storageDone || 0, 3] },
    noclaim2:     { kind: 'run', rewardType: 'none', check: s => !!s.noClaim2 },
    snowrun:      { kind: 'run', rewardType: 'none', check: s => (s.snowDelivered || 0) >= 5 },
    landlord:     { kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.scenario === 'moving' },
    partner:      { kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.scenario === 'bigdeal' },
    veteran_clear:{ kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.difficulty === 'veteran' },
    first_clear:  { kind: 'end', needWin: true, rewardType: 'multi', reward: ['company:postal', 'scenario:half', 'slot:2'], check: () => true },
    busy_month:   { kind: 'run', rewardType: 'scenario', reward: 'peak', check: s => s.maxMonthDelivered >= 15 },
    peak_clear:   { kind: 'end', needWin: true, rewardType: 'scenario', reward: 'blackfriday', check: (s, p, r) => r.scenario === 'peak' },
    fresh20:      { kind: 'cum', rewardType: 'scenario', reward: 'heatwave', check: (s, p) => p.deliveredByType.fresh >= 20, prog: p => [p.deliveredByType.fresh, 20] },
    four_carriers:{ kind: 'end', needWin: true, rewardType: 'scenario', reward: 'strike', check: s => s.distinctCarriersAtEnd >= 4 },
    intl15:       { kind: 'cum', rewardType: 'scenario', reward: 'port', check: (s, p) => p.deliveredByType.intl >= 15, prog: p => [p.deliveredByType.intl, 15] },
    rich_clear:   { kind: 'end', needWin: true, rewardType: 'scenario', reward: 'cashcrunch', check: (s, p, r) => r.scenario === 'standard' && r.cash >= 1000 },
    half_clear:   { kind: 'end', needWin: true, rewardType: 'scenario', reward: 'endless', check: (s, p, r) => r.scenario === 'standard' },
    three_unlocked:{ kind: 'meta', rewardType: 'scenario', reward: 'daily', check: (s, p, r, prof) => prof.unlocked.companies.length >= 3, prog: (p, prof) => [prof.unlocked.companies.length, 3] },
    veteran:      { kind: 'meta', rewardType: 'slot', reward: 3, check: (s, p, r, prof) => prof.unlocked.companies.length >= 5, prog: (p, prof) => [prof.unlocked.companies.length, 5] },
    // 퍽 해금
    buyer:        { kind: 'cum', rewardType: 'perk', reward: 'prepay', check: (s, p) => p.contractsBought >= 10, prog: p => [p.contractsBought, 10] },
    fresh_start:  { kind: 'end', needWin: true, rewardType: 'perk', reward: 'protect', check: s => s.replacedWithCalls >= 3 },
    trust3:       { kind: 'run', rewardType: 'perk', reward: 'regularco', check: s => s.trustL3 >= 1 },
    empty_tank:   { kind: 'run', rewardType: 'perk', reward: 'spare', check: s => s.zeroCallsMonthEnd },
    big_haul:     { kind: 'run', rewardType: 'perk', reward: 'bundle', check: s => s.maxSingleCall >= 6 },
    no_spoil:     { kind: 'end', needWin: true, rewardType: 'perk', reward: 'coldpro', check: s => s.discarded === 0 && s.deliveredByType.fresh >= 5 },
    overflow_survivor:{ kind: 'end', needWin: true, rewardType: 'perk', reward: 'tempyard', check: s => s.overflowTurns >= 5 },
    expander:     { kind: 'run', rewardType: 'perk', reward: 'shelves', check: s => s.expansions >= 2 },
    cold_buyer:   { kind: 'end', needWin: true, rewardType: 'perk', reward: 'freezer', check: s => s.coldUpgrades >= 2 },
    xl_stack:     { kind: 'run', rewardType: 'perk', reward: 'yard', check: s => s.maxXlSimul >= 3 },
    survivor:     { kind: 'end', needWin: true, rewardType: 'perk', reward: 'breath', check: (s, p, r) => r.stress >= 15 },
    late_but_done:{ kind: 'end', needWin: true, rewardType: 'perk', reward: 'overtime', check: s => s.overdueDelivered >= 10 },
    waiter:       { kind: 'cum', rewardType: 'perk', reward: 'foresight', check: (s, p) => p.waits >= 40, prog: p => [p.waits, 40] },
    clutch:       { kind: 'run', rewardType: 'perk', reward: 'emergency', check: s => (s.fullTrucks || 0) >= 15 },
    normal100:    { kind: 'cum', rewardType: 'perk', reward: 'regulars', check: (s, p) => p.deliveredByType.normal >= 100, prog: p => [p.deliveredByType.normal, 100] },
    all_special:  { kind: 'run', rewardType: 'perk', reward: 'premium', check: s => s.specialistTypes.length >= 4 },
    tidy:         { kind: 'cum', rewardType: 'perk', reward: 'closing', check: (s, p) => p.tidyMonths >= 3, prog: p => [p.tidyMonths, 3] },
    trusted_three:{ kind: 'run', rewardType: 'perk', reward: 'consult', check: s => s.maxTrustL2Simul >= 3 },
    rich:         { kind: 'end', needWin: true, rewardType: 'perk', reward: 'taxsave', check: (s, p, r) => r.cash >= 1500 },
    broke:        { kind: 'end', needWin: true, rewardType: 'perk', reward: 'investor', check: s => s.brokeMonthEnd },
    // 기록용
    perfect_month:{ kind: 'run', rewardType: 'scenario', reward: 'audit', check: s => s.perfectMonths >= 1 },
    full_house:   { kind: 'run', rewardType: 'none', check: s => s.fullNoPenalty },
    big_hand:     { kind: 'run', rewardType: 'none', check: s => s.maxSingleCall >= 8 },
    master_deal:  { kind: 'run', rewardType: 'none', check: s => s.masterOwned },
    trust_badge:  { kind: 'run', rewardType: 'none', check: s => s.maxTrustL3Simul >= 2 },
    millionaire:  { kind: 'run', rewardType: 'none', check: s => s.maxCash >= 2000 },
    all_companies:{ kind: 'meta', rewardType: 'none', check: (s, p) => Object.keys(p.clearsByCompanyStandard || {}).length >= 9 },
    all_scenarios:{ kind: 'meta', rewardType: 'none', check: (s, p) => Object.keys(p.clearsByScenario).filter(k => k !== 'endless').length >= 10 },
    daily7:       { kind: 'meta', rewardType: 'none', check: (s, p) => p.dailyStreak >= 7 },
  };

  const META = { CUSTOMERS, CUSTOMER_ITEMS, CUSTOMER_SLOTS, DIFFICULTIES, STORAGE_KINDS, INSURERS, PREMIUM_STEPS, INS_ITEMS, WEATHER, WEATHER_BY_SEASON, CUSTOMER_LEVELS, CUSTOMER_VOLUME, CUSTOMER_EXTRA, CUSTOMER_BONUS, COMPANIES, PERKS, PERK_FAMILIES, SCENARIOS, DAILY_VARIANTS, DAILY_CONFLICTS, ACHIEVEMENTS, DEFAULT_UNLOCK: { companies: ['local'], perks: ['longdeal', 'compact', 'skip', 'insure'], scenarios: ['half', 'standard'], perkSlots: 1 } };
  if (typeof module !== 'undefined') module.exports = META; else root.META = META;
})(typeof window !== 'undefined' ? window : globalThis);
