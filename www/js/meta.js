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
    ice:     { repTier: 2, icon: '❆', items: { frozen: 90, fresh: 10 }, sizeBias: null, claimMult: 1.8,
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
  // months 는 사이클(반월) 수. 해금은 차례로: 봄 → 여름 → 가을 → 겨울 → (사계절 다 돌면) 상·하반기 → (반기 하나 돌면) 한 해.
  // 나라가 늘면 같은 틀로 kr_ 대신 us_/jp_ 를 붙인다 (달력만 끼우면 된다).
  const SPANS = { quarter: { months: 6, scoreMult: 1 }, half: { months: 12, scoreMult: 1.25 }, year: { months: 24, scoreMult: 1.5 } };
  const RUN = (country, span, startMonth, icon, unlock) => ({ country, span, icon, months: SPANS[span].months, mods: { calendar: country, startMonth, scoreMult: SPANS[span].scoreMult }, unlock });
  const SCENARIOS = {
    kr_spring: RUN('kr', 'quarter', 3,  '🌸', null),
    kr_summer: RUN('kr', 'quarter', 6,  '☔', 'kr_spring_clear'),
    kr_autumn: RUN('kr', 'quarter', 9,  '🎑', 'kr_summer_clear'),
    kr_winter: RUN('kr', 'quarter', 12, '❄', 'kr_autumn_clear'),
    kr_h1:     RUN('kr', 'half',    3,  '🌱', 'kr_seasons'),
    kr_h2:     RUN('kr', 'half',    9,  '🍂', 'kr_seasons'),
    kr_year:   RUN('kr', 'year',    3,  '📅', 'kr_half'),
  };
  const DEFAULT_SCENARIO = 'kr_spring';

  // 도전과제: kind = run(런 중 즉시) | end(런 종료 시, 승리 필요 여부 needWin) | cum(누적) | meta(해금 상태)
  // check(s, p, r): s=game.stats, p=profile.stats, r=result(런 종료 시)
  const KR_Q = ['kr_spring', 'kr_summer', 'kr_autumn', 'kr_winter'];
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
    kr_spring_clear:{ kind: 'end', needWin: true, rewardType: 'scenario', reward: 'kr_summer', check: (s, p, r) => r.scenario === 'kr_spring' },
    kr_summer_clear:{ kind: 'end', needWin: true, rewardType: 'scenario', reward: 'kr_autumn', check: (s, p, r) => r.scenario === 'kr_summer' },
    kr_autumn_clear:{ kind: 'end', needWin: true, rewardType: 'scenario', reward: 'kr_winter', check: (s, p, r) => r.scenario === 'kr_autumn' },
    kr_seasons:   { kind: 'meta', rewardType: 'multi', reward: ['scenario:kr_h1', 'scenario:kr_h2'], check: (s, p) => KR_Q.every(k => p.clearsByScenario[k]), prog: p => [KR_Q.filter(k => p.clearsByScenario[k]).length, 4] },
    kr_half:      { kind: 'meta', rewardType: 'scenario', reward: 'kr_year', check: (s, p) => !!(p.clearsByScenario.kr_h1 || p.clearsByScenario.kr_h2) },
    kr_year_clear:{ kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.scenario === 'kr_year' },
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
    all_scenarios:{ kind: 'meta', rewardType: 'none', check: (s, p) => Object.keys(SCENARIOS).every(k => p.clearsByScenario[k]), prog: p => [Object.keys(SCENARIOS).filter(k => p.clearsByScenario[k]).length, Object.keys(SCENARIOS).length] },
  };

  const META = { CALENDARS, CUSTOMERS, CUSTOMER_ITEMS, CUSTOMER_SLOTS, STORAGE_KINDS, INSURERS, PREMIUM_STEPS, INS_ITEMS, WEATHER, WEATHER_BY_SEASON, CUSTOMER_LEVELS, CUSTOMER_VOLUME, CUSTOMER_EXTRA, CUSTOMER_BONUS, COMPANIES, PERKS, PERK_FAMILIES, SCENARIOS, SPANS, DEFAULT_SCENARIO, ACHIEVEMENTS, DEFAULT_UNLOCK: { companies: ['local'], perks: ['longdeal', 'compact', 'skip', 'insure'], scenarios: [DEFAULT_SCENARIO], perkSlots: 1 } };
  if (typeof module !== 'undefined') module.exports = META; else root.META = META;
})(typeof window !== 'undefined' ? window : globalThis);
