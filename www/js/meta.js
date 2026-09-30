// 메타 진행 데이터: 회사 · 퍽 · 런(나라 달력 × 시작 달 × 길이) · 도전과제 (docs/META_DESIGN.md v0.1, 런 재편은 STORY_TUTORIAL_DESIGN.md 부록 T)
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
    dawn:    { repTier: 1, icon: '🌙', items: { fresh: 70, normal: 30 }, sizeBias: 'small', claimMult: 1.5,
      rule: { kind: 'sameTurn', bonus: 20 },
      perks: { 2: { cold: 2 }, 3: { deadlineDelta: 1 } } },
    mart:    { repTier: 0, icon: '🛒', items: { normal: 60, fresh: 20, fragile: 20 }, sizeBias: null, claimMult: 1.0,
      rule: { kind: 'bundle', min: 3, mult: 1.1 },
      perks: { 2: { carrierCap: { bulk: 1 } }, 3: { rewardDelta: 5 } } },
    glass:   { repTier: 0, icon: '🏺', items: { fragile: 80, normal: 20 }, sizeBias: 'mid', claimMult: 2.0,
      rule: { kind: 'streak', n: 5, bonus: 30 },
      perks: { 2: { breakMult: 0.5 }, 3: { bonusDelta: 10 } } },
    import:  { repTier: 2, icon: '🛃', items: { intl: 70, fragile: 15, large: 15 }, sizeBias: null, claimMult: 1.2,
      rule: { kind: 'customsFast', delta: -1 },
      perks: { 2: { marketWeight: { intl: 2 } }, 3: { bonusDelta: 15 } } },
    factory: { repTier: 2, icon: '🪑', items: { large: 80, normal: 20 }, sizeBias: 'big', claimMult: 1.3,
      rule: { kind: 'sameArrival', bonus: 25 },
      perks: { 2: { xl: 1 }, 3: { bigSizeDelta: -1 } } },
    ice:     { repTier: 2, icon: '🧊', items: { frozen: 90, fresh: 10 }, sizeBias: null, claimMult: 1.8,
      rule: { kind: 'frozenSafe', bonus: 15 },
      perks: { 2: { facilityPrice: { freezer1: 0.5 } }, 3: { deadlineDelta: 2 } } },
    luxury:  { repTier: 3, icon: '💎', items: { intl: 50, intlfragile: 50 }, sizeBias: 'small', claimMult: 2.0,
      rule: { kind: 'secure', bonus: 20 },
      perks: { 2: { marketWeight: { air: 2 } }, 3: { customsDelta: -1 } } },
    farm:    { repTier: 1, icon: '🌾', items: { produce: 80, normal: 20 }, sizeBias: null, claimMult: 1.2,
      rule: { kind: 'harvest', bonus: 15 },
      perks: { 2: { facilityPrice: { vent: 0.5 } }, 3: { deadlineDelta: 1 } } },
    mover:   { repTier: 1, icon: '🚚', items: null, storage: true, sizeBias: null, claimMult: 2.0, rule: null, perks: { 2: { storageFee: 0.2 }, 3: { storageVolDelta: -2 } } },
  };
  // 보관 계약 종류 (docs/CUSTOMER_DESIGN.md 3장)
  const STORAGE_KINDS = {
    move:   { icon: '🏠', vol: [6, 10], turns: [3, 6], perVolTurn: 5, weight: 70 },
    season: { icon: '📦', vol: [4, 4], turns: [12, 15], perTurn: 10, weight: 20 },
    event:  { icon: '🎪', vol: [2, 2], turns: [2, 2], fee: 60, weight: 0, peakWeight: 40 },
    repair:   { icon: '🏗', vol: [3, 3], turns: [6, 6], perTurn: 2, weight: 0 },   // 멀티 「난투」 보수공사 — 제안이 아니라 입고로 들어온다 (game.js receiveRepair)
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
  // ----- 기업 계약 (자유 런) — docs/CUSTOMER_DESIGN.md 8장 -----
  // 개인 고객(익명)은 평판을 따라 늘어나는 바탕 물량. 기업 고객은 정산 마켓의 **제안서**로 온다:
  // 기간(사이클) 동안 예상 물량(칸, ±변동)을 보내고, 만기에 성적(정시·⚡긴급·사고)으로 평가받는다.
  // 관계(0~5)는 평가가 쌓인 것 — 개당 보너스(CUSTOMER_BONUS)와 다음 제안서의 물량·단가만 바꾼다(차·창고 혜택 없음).
  // 보험이 없으면 서명할 수 없고, 그 기업의 제휴 보험사(INSURERS.fans)에 들어 있으면 조건이 좋아진다.
  const DEAL = {
    cells: [10, 14, 18, 24],        // 사이클당 예상 물량(칸) — 고객 평판 등급(repTier) 0~3
    anonShare: 0.6,                 // 개인 고객 바탕 물량 배율 — 나머지는 기업 계약이 채운다(총량이 예전과 비슷하게)
    spread: 0.25,                   // 실제 물량 = 예상 × (1 ± spread)
    cycles: [2, 4],                 // 계약 기간(사이클)
    relVolume: 0.12, relRate: 0.04, // 관계 1당 물량 +12% · 단가 +4%
    fanVolume: 0.15, fanRate: 0.08, // 제휴 보험사 가입 중: 물량 +15% · 단가 +8%
    bonusBase: 30, bonusPerCycle: 20, bonusPerRel: 15,   // 무사고 완료 보너스(c)
    grades: [['S', 0.95, 2, 2], ['A', 0.85, 1, 1], ['B', 0.65, 0, 0], ['C', 0, -1, -2]],   // [등급, 정시율 하한, 관계, 평판]
    rushWeight: 0.02,               // ⚡ 긴급 당일 처리 1건당 정시율 +2%p (평가용)
    claimPenalty: 0.08,             // 사고(폐기) 1건당 −8%p, 사고가 있으면 S 불가
    cooldown: 2,                    // C 등급이면 이 사이클 동안 제안이 오지 않는다
    maxOffers: 3,
  };
  // repTier: 이 평판 등급부터 마켓에 찾아온다 (0 무명 · 1 동네 소문 · 2 구내 유명 · 3 시내 최고)
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
      mods: { rewardDelta: { intl: 20, normal: -5 }, carrierStartTrust: { intl: 8 }, opCostRandom: [110, 190], marketWeight: { intl: 2 }, gradeShift: 0.3 },
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
    compact:   { family: 'warehouse', mods: { storeBigDelta: -1 }, unlock: null },   // 크기 4 이상이 창고에서 한 칸 덜 차지한다(트럭 적재는 그대로). 전부 -1 이면 크기 2 가 1 이 되어 창고·트럭이 사실상 두 배 — 시뮬 생존 80%→100%, 현금 2.3배
    coldpro:   { family: 'warehouse', mods: { freshExtra: 1 }, unlock: 'no_spoil' },
    tempyard:  { family: 'warehouse', mods: { overflowGrace: 2 }, unlock: 'overflow_survivor' },
    shelves:   { family: 'warehouse', mods: { startFacilities: ['expand1'] }, unlock: 'expander' },   // 숫자만 +4 가 아니라 진짜 선반 랙(시설 expand1)을 깔고 시작
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

  // ----- 나라별 달력 (docs/STORY_TUTORIAL_DESIGN.md 5장) -----
  // 한 해 런은 달력을 따라 흐른다. 달마다 입고 배수·품목 이동·날씨 가중·이벤트가 있어 플레이어가 "다음 달"을 예측할 수 있다.
  // months[cal] = { arrivalsMult, typeShift, weather(계절 기본 가중치에 곱), storageMult(보관 제안 확률 배율), storageFeeMult,
  //   events: [{ id, turns: [from, to], arrivalsMult(그 턴 입고 배수), deadlineDelta(그 턴 입고분 기한), noCalls(업체 휴무: 호출 불가), noArrivals(입고 없음 → 휴무 뒤 첫 턴에 몰림), feeMult(배차비), rewardDelta{type} }] }
  // 문구(label·note·sms)는 locales meta.CALENDARS[id].months[cal]
  const CALENDARS = {
    kr: {
      startMonth: 3, icon: '🇰🇷',
      months: {
        3:  { arrivalsMult: 1.05, typeShift: { large: 3 }, storageMult: 1.5, icon: '🏠' },
        4:  { arrivalsMult: 1.0,  typeShift: { produce: 3 }, weather: { rain: 1.3 }, storageMult: 1.5, icon: '🌸' },
        5:  { arrivalsMult: 1.05, typeShift: { fragile: 8 }, icon: '🎁', events: [{ id: 'gift', half: 1, turns: [6, 9], rewardDelta: { fragile: 10 } }] },
        6:  { arrivalsMult: 1.0,  typeShift: { fresh: 4 }, weather: { rain: 2.2 }, icon: '☔' },
        7:  { arrivalsMult: 0.95, typeShift: { fresh: 8, frozen: 4, normal: -6 }, weather: { rain: 1.6, heat: 1.4 }, heatAlerts: 1, icon: '🔥' },
        8:  { arrivalsMult: 0.9,  typeShift: { fresh: 10, frozen: 4, normal: -10 }, weather: { heat: 2.0 }, icon: '🏖' },
        9:  { arrivalsMult: 1.25, typeShift: { fresh: 5, produce: 5, fragile: 5, large: 3, normal: -6 }, icon: '🎑' },
        10: { arrivalsMult: 1.05, typeShift: { produce: 8, intl: 2 }, storageMult: 1.5, storageFeeMult: 1.2, icon: '🍂' },
        11: { arrivalsMult: 1.3,  typeShift: { produce: 6, intl: 3, fragile: 3 }, weather: { rain: 0.8 }, icon: '🛒',
              events: [{ id: 'sale', half: 2, turns: [8, 12], arrivalsMult: 1.5, typeShift: { normal: 10 }, feeMult: { bulk: 0.9 } }] },
        12: { arrivalsMult: 1.4,  typeShift: { fragile: 8, frozen: 6, large: 5 }, weather: { snow: 1.0 }, returnGraceDelta: -1, icon: '🎄' },
        1:  { arrivalsMult: 0.85, typeShift: { frozen: 3 }, weather: { snow: 1.4 }, noInflation: true, icon: '❄' },
        2:  { arrivalsMult: 1.3,  typeShift: { fresh: 5, produce: 5, fragile: 5, frozen: 3, normal: -6 }, weather: { snow: 0.7 }, icon: '🧧' },
      },
      // ----- 공휴일: 실제 날짜 -----
      // 명절(설·추석)은 음력이라 해마다 양력 날짜가 다르다. 표로 박는다(2025~2035, 그 밖의 해는 가장 가까운 해의 표를 쓴다).
      // 연휴는 당일 앞뒤 하루씩 사흘. 일요일과 겹치면 연휴 다음 영업일이 대체공휴일 (게임은 토요일이 영업일이라 토요일 겹침은 그냥 그날이 쉰다).
      // 연휴 앞 rushDays 영업일은 명절 폭주(입고 ×rushMult, 그 입고분 기한 rushDeadline). 연휴 당일은 업체 휴무(호출 불가, 입고는 계속).
      // 한 해 런이 아니어도 그 기간을 지나면 자동으로 걸린다 — 시작 달이 다르면 겪는 명절이 다르다.
      holidays: {
        lunar: {   // 연도: [설날, 추석] (MM-DD). 부처님오신날은 단일 공휴일로 fixedByYear
          2025: ['01-29', '10-06'], 2026: ['02-17', '09-25'], 2027: ['02-06', '09-15'], 2028: ['01-26', '10-03'], 2029: ['02-13', '09-22'], 2030: ['02-03', '09-12'],
          2031: ['01-23', '10-01'], 2032: ['02-11', '09-19'], 2033: ['01-31', '09-08'], 2034: ['02-19', '09-27'], 2035: ['02-08', '09-16'],
        },
        buddha: { 2025: '05-05', 2026: '05-24', 2027: '05-13', 2028: '05-02', 2029: '05-20', 2030: '05-09', 2031: '05-28', 2032: '05-16', 2033: '05-06', 2034: '05-25', 2035: '05-15' },
        lunarIds: ['seol', 'chuseok'],
        // 양력 공휴일 [월, 일, id, 대체공휴일 여부]. 신정·현충일은 대체 없음
        fixed: [[1, 1, 'newyear', false], [3, 1, 'samil', true], [5, 5, 'children', true], [6, 6, 'memorial', false], [8, 15, 'liberation', true], [10, 3, 'foundation', true], [10, 9, 'hangul', true], [12, 25, 'christmas', true]],
        rushDays: 5, rushMult: 1.6, rushDeadline: -1,
      },
    },
  };

  // ----- 런 = 나라 달력 × 시작 달 × 길이 -----
  // 테마 시나리오(성수기·폭염·파업…)는 걷어냈다. 이제 런은 "어느 나라의 달력에서, 언제 시작해, 얼마나 굴리는가"로만 정해진다.
  // 명절·공휴일·계절은 달력(CALENDARS)이 실제 날짜로 넣어 주므로, 같은 석 달이라도 시작 달이 다르면 다른 판이 된다.
  // months 는 사이클(반월) 수. 나라가 늘면 같은 틀로 kr_ 대신 us_/jp_ 를 붙인다 (달력만 끼우면 된다).
  //
  // 첫 해는 한 창고의 이야기로 이어진다 (STORY_TUTORIAL_DESIGN 부록 BB):
  //   봄   = 캠페인(인수인계) 그 자체. 고르면 박 반장과 서장부터 다시 한다(campaign: true).
  //   여름 = 캠페인을 끝낸 창고를 그대로 물려받아 혼자 굴린다(chainFrom: 'campaign').
  //   가을 = 여름을 완주한 창고, 겨울 = 가을을 완주한 창고 — 몇 번이든 다시 할 수 있고, 매번 그 시작 판에서 출발한다.
  //   겨울 다음은 나라별·다른 시나리오, 위클리 런이 이어 붙는다 (반기·한 해는 없앴다).
  // 무료판(BUILD.demo)은 FREE_RUNS(봄·여름)까지. 여름을 넘기면 본편 안내로 간다.
  const SPANS = { quarter: { months: 6, scoreMult: 1 }, half: { months: 12, scoreMult: 1.25 }, year: { months: 24, scoreMult: 1.5 } };
  // 자유 런: 배차 1.5배 — 특수 계약의 배차가 물량에 비해 적었다 (유저: "배차 횟수 자체가 적어"). 트럭 한 대 고정(maxTrucks 1)도 돌려 봤지만 하루 한 번 호출이라 처리량이 반이 되어 봇 생존 가을 30%→3%. 캠페인(봄)은 대본이 두 대를 가르치니 그대로
  const FREE_RUN_MODS = { callsMult: 1.5 };
  const RUN = (country, span, startMonth, icon, unlock, extra) => Object.assign({ country, span, icon, months: SPANS[span].months, mods: Object.assign({ calendar: country, startMonth, scoreMult: SPANS[span].scoreMult }, extra && extra.campaign ? {} : FREE_RUN_MODS), unlock }, extra || {});
  const SCENARIOS = {
    kr_spring: RUN('kr', 'quarter', 3,  '🌸', null, { campaign: true }),
    kr_summer: RUN('kr', 'quarter', 6,  '☔', null, { chainFrom: 'campaign', chainNext: 'kr_autumn' }),
    kr_autumn: RUN('kr', 'quarter', 9,  '🎑', 'kr_summer_clear', { chainFrom: 'kr_summer', chainNext: 'kr_winter' }),
    kr_winter: RUN('kr', 'quarter', 12, '❄', 'kr_autumn_clear', { chainFrom: 'kr_autumn' }),
  };
  const FREE_RUNS = ['kr_spring', 'kr_summer'];
  const DEFAULT_SCENARIO = 'kr_spring';

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
    // 런(시나리오) 해금 — 한국 달력을 차례로 연다
    kr_summer_clear:{ kind: 'end', needWin: true, rewardType: 'scenario', reward: 'kr_autumn', check: (s, p, r) => r.scenario === 'kr_summer' },
    kr_autumn_clear:{ kind: 'end', needWin: true, rewardType: 'scenario', reward: 'kr_winter', check: (s, p, r) => r.scenario === 'kr_autumn' },
    kr_winter_clear:{ kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.scenario === 'kr_winter' },   // 나라별·다른 시나리오가 생기면 여기서 연다
    // 기록용
    cust_l3:      { kind: 'run', rewardType: 'none', check: s => (s.customerL3 || 0) >= 1 },
    storage3:     { kind: 'cum', rewardType: 'none', check: (s, p) => (p.storageDone || 0) >= 3, prog: p => [p.storageDone || 0, 3] },
    noclaim2:     { kind: 'run', rewardType: 'none', check: s => !!s.noClaim2 },
    snowrun:      { kind: 'run', rewardType: 'none', check: s => (s.snowDelivered || 0) >= 5 },
    holiday_clear:{ kind: 'run', rewardType: 'none', check: s => (s.holidayRushDelivered || 0) >= 15 },
    first_clear:  { kind: 'end', needWin: true, rewardType: 'multi', reward: ['company:postal', 'slot:2'], check: () => true },
    busy_month:   { kind: 'run', rewardType: 'none', check: s => s.maxMonthDelivered >= 15 },
    four_carriers:{ kind: 'end', needWin: true, rewardType: 'none', check: s => s.distinctCarriersAtEnd >= 4 },
    rich_clear:   { kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.cash >= 1000 },
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
    perfect_month:{ kind: 'run', rewardType: 'none', check: s => s.perfectMonths >= 1 },
    full_house:   { kind: 'run', rewardType: 'none', check: s => s.fullNoPenalty },
    big_hand:     { kind: 'run', rewardType: 'none', check: s => s.maxSingleCall >= 8 },
    master_deal:  { kind: 'run', rewardType: 'none', check: s => s.masterOwned },
    trust_badge:  { kind: 'run', rewardType: 'none', check: s => s.maxTrustL3Simul >= 2 },
    millionaire:  { kind: 'run', rewardType: 'none', check: s => s.maxCash >= 2000 },
    all_companies:{ kind: 'meta', rewardType: 'none', check: (s, p) => Object.keys(p.clearsByCompany || {}).length >= 9, prog: p => [Object.keys(p.clearsByCompany || {}).length, 9] },
    all_scenarios:{ kind: 'meta', rewardType: 'none', check: (s, p) => soloRuns().every(k => p.clearsByScenario[k]), prog: p => [soloRuns().filter(k => p.clearsByScenario[k]).length, soloRuns().length] },
  };

  // 캠페인 런(봄)은 완주 기록이 clearsByScenario 에 남지 않는다 — '전 런 완주'는 자유 런만 센다
  function soloRuns() { return Object.keys(SCENARIOS).filter(k => !SCENARIOS[k].campaign); }

  // ----- 멀티플레이 「난투」 (docs/MULTIPLAYER_DESIGN.md) -----
  // 규칙은 개인 런에서 **빼고**(새 계약·배차 제한·어음·명절·주말·보험·보관), 상호작용을 **더한다**(트레잇·보수공사·퍽 3택1).
  // 여기 있는 것은 데이터만 — 매치 진행(봇·순위·저장)은 js/multi.js, 규칙 훅은 game.js 의 rules.* 문.
  const MULTI = {
    PLAYERS: 2, CYCLES: 6, PHASE: 2,   // 1:1 (2026-09-29, MULTIPLAYER_PILLARS: 넷을 읽는 건 모바일에서 어렵다 — 상대 창고 하나를 크게, 그 창고의 하루가 보이게)
      // PHASE: 지금 구현된 단계(docs/MULTIPLAYER_DESIGN.md 13장). 퍽 카드 풀이 이 값을 본다
    // 개인 런 시나리오 위에 얹는 멀티 규칙 셋 (mergeMods 로 병합 — 뒤가 앞을 덮는다)
    mods: {
      multi: true,
      months: 6, calendar: 'kr', startMonth: 4,        // 석 달 = 6사이클. 달력은 시각만(명절·달력 이벤트 없음)
      noHolidays: true, noCalendarEvents: true, noWeekend: true,
      unlimitedCalls: true, noCallFee: true, payNow: true, noLoan: true, noBankrupt: true, noRepEnd: true, noFacilities: true, priceMult: 1.8, noMoney: true, traitSameDay: false,
      truckCap: { base: 4, bulkPerTier: 2, perTwoTiers: 1 }, maxTrucks: 1, famTrucks: { large: 2 },   // 차는 4칸 한 대 — 한길만 등급마다 +2칸(일반을 치우는 전문화), 특수는 두 등급에 +1, 거인(대형)만 두 대 (유저: "최대 처리 4칸으로 보고")
      typeMaxSize: { fresh: 2, frozen: 2, intl: 4, large: 4 }, typeOverride: { normal: 80, fresh: 5, produce: 3, fragile: 4, intl: 3, large: 3, frozen: 3 },   // 여섯 종류가 처음부터 대본에 있다(계약을 사면 열리게) — 기본 표엔 통관·대형·냉동이 0 이라 사도 안 왔다   // 큰 택배는 받아 주는 계약(차 크기)이 있을 때만 온다 — contractGated 가 크기까지 본다. 코끼리(대형)를 사면 4칸이 온다 noLateShipPenalty: true,
      startFamilies: ['bulk'], contractGated: true, specialTraitMult: 2.2, normalAnywhere: true, typeTraits: true, noRush: true,   // 한길만 들고 시작 · 계약을 사야 그 특수 물품(과 트레잇)이 온다 · 특수 물품엔 트레잇 ×2.2   // 배차 한도 없음(유저: "평판으로 바뀌니 배차 한도는 없애는 게 맞다") 대신 차가 작다 — 시작 한길 4칸 · 신선 2칸 · 파손 2칸   // 장 값은 비싸게 — 살 게 시설뿐이던 때 돈이 남아돌았다(유저). 계약·강화·충전 전부 ×1.8   // 평판 0 도 폐업이 아니다 — 평판이 곧 점수라 바닥은 그냥 꼴찌(중도 탈락은 판을 깬다)   // 배차는 **횟수**(눈금·장에서 충전), 배차비는 없다 — 유저: "배차비 못 내는 게 너무 깬다, 그냥 횟수로". 결제는 즉시(어음 없음)
      shopDay: false, noCycleMarket: true, autoSummary: true, repShop: true, cycleRefill: true,   // 사이클 끝 장은 없다(유저: "상점을 없애면"). 대신 평판 상한에 닿을 때 랜덤 3장 상점(repShop), 배차는 보름마다 다시 찬다(cycleRefill). 정산은 자동, 팝업 없이 로그 한 줄. shopDay 는 「장 보러 간 날」 실험 규칙(꺼짐)
      noInsurance: true, storageOfferProb: 0, storageMax: 0,             // 보험·보관 계약 없음 (이삿짐은 2단계에서 보수공사으로 돌아온다)
      repStep: 4, perkPick: true, noRepUnlock: true,                     // 평판 상한 도달 → 상한 +6 · 평판 상점(장 매물 랜덤 3장, 퍽 없음). 봇 판에서 석 달에 5~6번. 🛃·대형·🧊 는 안 온다(새 계약이 없으니 실을 곳도 없다)
      sharedSchedule: true, fixedCustLevel: 2, arrivalsMult: 1.15, dayArrivalsRate: 0.02, typeFamilies: true, famRules: true, strictCarry: true, ownCargo: 0.08, ownCargoMax: 0.2, typeSizes: { large: [3, 4], intl: [2, 3, 4] },   // 내 몫은 종류마다 8%, 다 합쳐 20% 까지 — 일반이 대다수 (유저: "왜 네 칸짜리만 와") · 대형은 3~4칸 ("4칸은 애매, 3~4칸이 와야 쌓는 맛")
      callsMult: 1, repKeepTier: true, pushFlat: 1, theftMaxDay: 2,   // 연 특수 물품마다 일반 입고의 12% 가 그 물품으로
        // 1.8·+2%/일: 첫 사이클 창고 30%대 → 끝에 넘친다 (유저: "아무리 비워도 창고가 비지를 않아" — 2.6·+1% 는 첫날부터 한 번 호출 용량과 입고가 같았다)
      finalRushMult: 1.6,   // 입고 대본은 매치 공유. 첫날 하루 5개쯤(+만차 밀어내기). 전문 차도 일반을 실어 여유가 커서 2.6(유저: "첫 물량이 너무 적어") — 기본 ×2.1, 일차 비례는 완만하게(+1%/일), 마지막 보름 「마감 폭주」 ×1.6. 봇 판(test/multi-sim.js) 평판 89·반송 7
      fuelRate: 0,                                                       // (배차비가 없으니 유가도 없다 — 값은 남겨 둔다)
      repDecides: true, finishDump: true,                                // 승부는 잔액이 아니라 **평판**. 누가 먼저 마감하면 아직 달리는 사람에겐 남은 날마다 상자가 하나씩 밀려온다 — 평판 페널티(남은 날 ÷3) 대신 물건으로 (유저: "시간 자체가 무기")
      capDelta: 4,                                                       // 시작 창고 +4칸 (열린 질문 4 — 후보값)
      marketMaxBuy: 0, upcomingTurns: 2,
      // 2단계: 트레잇·보수공사 (3장·4장). 입고의 15%→35%(일차 비례)에 트레잇, 공격 40 : 보너스 60
      chainPush: false, mixCombo: true, traits: true, traitRate: [0.15, 0.35], attackShare: 0.4, repairs: true,
    },
    // 택배 트레잇 — 기한 안에 출고하면 발동, 반송·폐기면 불발. 공격은 나 빼고 전원(살아 있고 마감 안 한 상대)에게, 보너스는 나에게.
    // 원칙: 한 방은 반나절 손해를 넘지 않는다 — 죽이는 건 공격이 아니라 물량. 이름·설명은 locales meta.MULTI.TRAITS[id]
    TRAITS: {
      // 공격 — 넷뿐, 하나하나 세게 (유저: "신선 −1 같은 소소한 어택보다 강렬한 어택 · 정보가 너무 많은 게 안 좋다")
      t_repair:   { kind: 'attack', icon: '🏗', weight: 30 },   // 보수공사(3칸, 못 치움, 옆 창고로) → REPAIR
      t_hurry:  { kind: 'attack', icon: '⏱', weight: 25 },   // 창고 안 모든 택배 기한 −HURRY
      t_road:   { kind: 'attack', icon: '🚧', weight: 20 },   // 다음 날 호출 불가
      t_seal:   { kind: 'attack', icon: '🔒', weight: 25 },   // 창고 상한 −SEAL 칸, 3일
      // 보너스
      t_buzz:   { kind: 'bonus', icon: '⭐', weight: 18 },    // 평판 +BUZZ
      t_shield: { kind: 'bonus', icon: '🛡', weight: 16 },    // 다음 공격 1회 무효(최대 2겹)
      t_ice:    { kind: 'bonus', icon: '🧊', weight: 12 },    // 신선 부패 정지 3일
      t_pack:   { kind: 'bonus', icon: '📦', weight: 14 },    // 창고 +3칸, 3일
      t_truck:  { kind: 'bonus', icon: '🚚', weight: 14 },    // 다음 호출 트럭 +1
      t_return: { kind: 'bonus', icon: '🔄', weight: 12 },    // 들고 있는 보수공사 1개를 보낸 사람에게 반송
      t_focus:  { kind: 'bonus', icon: '🎯', weight: 12 },    // 다음 공격 트레잇을 1위 한 명에게만 ×3
      t_deal:   { kind: 'bonus', icon: '🛒', weight: 12 },
      t_reflect:{ kind: 'bonus', icon: '🪞', weight: 12 },    // 🪞 반사: 다음에 받는 공격을 보낸 사람에게 되돌린다(최대 2)    // 🛒 단골: 평판 상점이 한 번 더 열린다(계단과 무관)
    },
    MIX: { streakMax: 3, maxMult: 4 },
    HOT: { at: 0.8, mult: 2 },   // 🔥 만석: 80% 넘게 찬 창고에 떨어진 상자 ×2 — 찰 때까지 기다렸다 쏘는 게 이득   // 🔗 조합: 배수 = 종류 수 + 연쇄 − 1 (최대 ×4), 연쇄는 3까지. 조합 아닌 호출이면 연쇄는 끊긴다
    HURRY_N: 3, SEAL: 6, BUZZ: 2, CAP_FLOOR: 0.7, BLAST_MAX: 2,   // 창고는 공격으로 70% 아래로 안 줄고, 대공사는 두 개까지만 턴다 — 한 방이 창고를 비우면 손맛이 없다   // 공격 세기: 독촉은 3개를 오늘 안에 · 봉인 −6칸 · 입소문 평판 +2
    // 물품 종류마다 트레잇 두 개 — 처음부터 둘 중 하나가 붙는다. 평판 상점의 「{종류} 트레잇 강화」 카드는 그 종류 트레잇 세기 +1
    // 전문화 트랙(TRACKS)을 따라 묶었다 — 한 계열의 두 트레잇은 같은 성격이다 (유저: "어떤 트레잇이 주로 나오는지 보여서 어떤 전문화를 택할지")
    TYPE_TRAITS: {
      fresh:   ['t_hurry', 't_road'],     // ⚔ 신선(냉장 계열): ⏱ 독촉 → 🚧 통제
      intl:    ['t_repair', 't_seal'],    // ⚔ 통관: 🏗 보수공사 → 🔒 봉인
      frozen:  ['t_reflect', 't_ice'],    // 🛡 냉동: 🪞 반사 · 🧊 얼음 — 방패는 🛡 방어 트랙이 매일 주니 겹쳤다 (유저: "똑같은 트레잇만 받으니 도움도 안 돼")
      large:   ['t_pack', 't_focus'],     // 🛡 대형: 📦 압축 → 🎯 한 방 (덩치로 누르는 계열이라 마지막은 압박)
      produce: ['t_buzz', 't_deal'],      // 🛒 농산물(파손 계열): ⭐ 입소문 → 🛒 단골
      // 파손(fragile)엔 트레잇이 없다 — 깨질 위험 자체가 그 물품의 성격 (유저). 일반도 없음(난투엔 긴급 자체가 없다)
    },
    // 난투에서 특수 물품을 '여는' 계열 — 능력으로 실을 수 있어도 이 계열 계약이 있어야 그 물품이 온다(없으면 일반으로).
    // 계열 = 트랙이 되려면 한 물품이 두 계열에 걸치면 안 된다: 농산물은 냉장도 싣지만 파손 계열이 연다
    TYPE_FAMILIES: { fresh: ['cold'], produce: ['fragile'], fragile: ['fragile'], frozen: ['frozen'], intl: ['intl'], large: ['large'] },
    // 전문화 트랙 셋 — 계열마다 하나. 트랙 레벨 = 그 트랙 계약마다 (1 + 등급) 의 합. 패시브는 레벨을 따라 는다 (game.js trackLv)
    // 🛒 장사: 평판 상점이 더 자주·더 넓게 · ⚔ 공격: 공격이 한 번 더(메아리) · 🛡 방어: 매일 아침 방패
    // 계열 규칙 — 계열마다 그 계열만의 규칙 하나 (유저: "냉장/통관/냉동/대형 모두 더 전문화, 개성 있게"). 이름·설명은 locales meta.MULTI.FAM_RULES[fam]
    // 냉장 = 템포 · 냉동 = 비축 · 대형 = 덩치 · 통관 = 지연 폭탄 · 파손 = 무사고
    FAM_RULES: {
      cold:    { icon: '🌅' },   // 새벽 출발: 오늘 들어온 신선만 실은 냉장 호출은 하루를 쓰지 않는다(하루 한 번)
      frozen:  { icon: '🧊', agePerDay: 1, ageMax: 2 },   // 숙성: 냉장·냉동실 안의 트레잇 택배는 하루마다 세기 +1(최대 +2) — 기한은 그대로 간다 (유저: "기한이 없는 건 별 도움이 안 돼") · 조합에 끼면 연쇄 +1
      large:   { icon: '🦣', pushSize: 4 },   // 덩치: 대형 호출의 밀어내기는 4칸 상자 · 대형 하나가 실린 트럭은 만차로 친다
      intl:    { icon: '🛃', clearMult: 2 },   // 보세 구역: 통관 대기 짐은 0칸 · 통관 끝난 날 보내면 트레잇 ×2 (대기 중엔 트레잇이 안 사라진다)
      fragile: { icon: '⚠', rep: 1 },       // 무사고: 파손 계열로 파손품을 기한 안에 보내면 개당 평판 +1
    },
    // 난투 적재(strictCarry): 계열마다 제 물품 — 나머지는 특약·복합 능력(계열 기본 밖의 능력)으로 하나씩
    CARRY_OWN: { cold: ['fresh'], frozen: ['frozen'], fragile: ['fragile', 'produce'], intl: ['intl'], large: ['large'] },
    CARRY_ATTR: { cold: 'fresh', frozen: 'frozen', fragile: 'fragile', customs: 'intl' },
    TRACKS: {
      shop: { icon: '🛒', families: ['fragile'], cardsPer: 2, cardsMax: 5, step: 1, stepMin: 3 },   // 상점 카드 +1/2레벨(최대 5장) · 평판 계단 −1/레벨(최소 4)
      atk:  { icon: '⚔', families: ['cold', 'intl'], echo: 0.25 },                                 // 공격 메아리 +25%/레벨(최대 100%)
      def:  { icon: '🛡', families: ['frozen', 'large'], shieldPer: 2, shieldMax: 2 },              // 방패 상시 ⌈레벨/2⌉겹(최대 2) — 매일 아침 채운다
    },

    REPAIR: { size: 3, days: 6, perDay: 2, maxSize: 6, max: 4, late: 2 },   // late: 판이 끝나갈수록 처음 크기 +0~2   // 3칸/6일로 시작, 이사마다 +1칸 −1일, 6칸/1일이면 다음 이사 때 대공사(밀려난 짐 도난). 매치당 동시 4개
    SHIELD_MAX: 2, TEMP_DAYS: 3,
    // 퍽 3택1 — 평판 등급이 오를 때마다 세 계열에서 한 장씩. 장착 상한 없음, 중복 가능(중첩 수치 표기).
    // 값은 개인 런 퍽 상한(월 40~80c)을 의도적으로 넘긴다 — 석 달짜리 난투에서 퍽은 양념이 아니라 빌드다.
    // phase: 그 퍽이 실제로 작동하는 구현 단계. 지금 단계보다 뒤인 카드는 뽑기 풀에 안 들어간다(효과 없는 카드를 고르게 하지 않는다).
    // 이름·설명은 locales meta.MULTI_PERKS[id]
    // 판의 테마 — 시드가 하나를 고른다(넷이 같다). 시작 화면에서 알려 주고 규칙에 얹는다 (유저: "난투 시작 전에 이 난투의 특징 폭염? 블프? 알려주고")
    PERK_PRICE: 200,   // 평판 상점의 퍽 카드 값(× 사이클 물가 × priceMult)
    THEMES: {
      spring:  { icon: '🌸', mods: {} },
      heat:    { icon: '🔥', mods: { season: 'summer', heatAlerts: 2, weatherWeights: { heat: 3 } } },
      monsoon: { icon: '🌧', mods: { season: 'summer', weatherWeights: { rain: 3 } } },
      peak:    { icon: '📦', mods: { arrivalsMult: 1.25 } },
      fresh:   { icon: '🧊', mods: { typeShift: { fresh: 12, produce: 8 } } },
      fragile: { icon: '⚠', mods: { typeShift: { fragile: 14 }, breakMult: 1.5 } },
      thief:   { icon: '🕵', mods: { theftMult: 2 } },
    },
    // 캐릭터 = 창고 성격. 넷이 같은 창고를 돌리면 "나"가 없다 — 사람은 고르고, 봇은 남은 것을 하나씩 받는다 (봇 이름 = 캐릭터 이름).
    // 패시브 하나씩, 규칙에 얹는다 (game.js cfg.mchar). 이름·설명은 locales meta.MULTI.CHARS[id]
    // 유저: "큰손은 밀어내기 ×2, 새벽은 신선이 안 상함, 도크는 트럭 한 대 더, 느긋은 기한 +1"
    CHARS: {
      hangil:  { icon: '🚚', mods: { carrierCapDelta: { bulk: 1, cold: 1, fragile: 1, frozen: 1, intl: 1, large: 1 } } },   // 한길: 트럭 한 칸 더
      bigshot: { icon: '💰', mods: { pushMult: 2 } },                                            // 큰손: 만차 밀어내기 ×2
      dawn:    { icon: '🌙', mods: { freshNoSpoil: true } },                                     // 새벽: 신선이 안 상함
      dock:    { icon: '🏗', mods: { capDelta: 4 } },                                            // 도크: 창고 +4칸 (배차 무제한이라 '트럭 한 대 더'는 창고로)
      easy:    { icon: '🐢', mods: { deadlineAll: 1 } },                                         // 느긋: 모든 기한 +1
      bolt:    { icon: '⚡', mods: { attackMult: 2 } },                                          // 번개: 내 공격 트레잇 효과 ×2 (대본은 넷이 같으니 확률이 아니라 위력으로)
    },
    PERKS: {
      // 🚚 운영 — 돈이 점수가 아니니(배차비 없음·평판 승부) 배차 횟수와 평판으로 (옛 경제 퍽: 배차비·보수·현금은 뺐다)
      m_calls:    { family: 'eco', icon: '🚚', phase: 1, mods: { callsDelta: 1 }, now: { calls: 1 } },
      m_clean:    { family: 'eco', icon: '🧹', phase: 1, mods: { cleanRepBonus: 2 } },
      m_upgrade:  { family: 'eco', icon: '🏷', phase: 1, mods: { contractPriceMult: 0.8, itemPriceMult: 0.8, facilityPriceMult: 0.8 } },
      m_rush:     { family: 'eco', icon: '🏁', phase: 1, mods: { rushRepBonus: 1 } },
      m_refill:   { family: 'eco', icon: '🔋', phase: 1, now: { refill: true } },
      // 🛡 방어
      m_space:    { family: 'def', icon: '📦', phase: 1, now: { cap: 4 } },
      m_yard:     { family: 'def', icon: '⛺', phase: 1, mods: { overflowGrace: 2 } },
      m_grace:    { family: 'def', icon: '⏳', phase: 1, mods: { returnGrace: 1 } },
      m_shield:   { family: 'def', icon: '🛡', phase: 2, mods: { shieldPassive: 1 } },
      m_roof:     { family: 'def', icon: '🏠', phase: 2, mods: { rainImmune: true } },
      m_dodge:    { family: 'def', icon: '💨', phase: 2, mods: { dodgeProb: 0.5 } },
      // ⚔ 공격
      m_early:    { family: 'atk', icon: '🚀', phase: 1, mods: { earlyRepBonus: 1 } },
      m_trait:    { family: 'atk', icon: '🎲', phase: 2, mods: { attackEcho: 0.25 } },
      m_heavy:    { family: 'atk', icon: '🏗', phase: 2, mods: { repairGrow: 2 } },
      m_sharp:    { family: 'atk', icon: '⚔', phase: 2, mods: { attackMult: 1.5 } },
    },
    PERK_FAMILIES: { eco: '💰', def: '🛡', atk: '⚔' },
    // 등급(택배 테마) — ELO 200 구간, 시작 1200. 3단계(서버)에서 쓴다. 이름은 locales meta.MULTI_RANKS
    RANKS: ['trainee', 'driver', 'lead', 'chief', 'branch', 'hq', 'god'], ELO_START: 1200, ELO_STEP: 200,
  };

  const META = { CALENDARS, CUSTOMERS, CUSTOMER_ITEMS, CUSTOMER_SLOTS, STORAGE_KINDS, INSURERS, PREMIUM_STEPS, INS_ITEMS, WEATHER, WEATHER_BY_SEASON, CUSTOMER_LEVELS, CUSTOMER_VOLUME, CUSTOMER_EXTRA, CUSTOMER_BONUS, DEAL, COMPANIES, PERKS, PERK_FAMILIES, SCENARIOS, SPANS, FREE_RUNS, DEFAULT_SCENARIO, ACHIEVEMENTS, MULTI, DEFAULT_UNLOCK: { companies: ['local'], perks: ['longdeal', 'compact', 'skip', 'insure'], scenarios: ['kr_spring', 'kr_summer'], perkSlots: 1 } };
  if (typeof module !== 'undefined') module.exports = META; else root.META = META;
})(typeof window !== 'undefined' ? window : globalThis);
