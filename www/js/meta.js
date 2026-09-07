// 메타 진행 데이터: 회사 · 퍽 · 시나리오 · 도전과제 (docs/META_DESIGN.md v0.1)
(function (root) {

  // ----- 고객(화주) (docs/CUSTOMER_DESIGN.md 2장) -----
  // items: 품목 가중치(택배 종류). rule: 특수 규칙. claimMult: 폐기 시 손해배상 배율. perks[lv]: 신뢰 단계 혜택(2·3단계)
  const CUSTOMER_LEVELS = [0, 4, 10, 18];
  const CUSTOMER_VOLUME = [0.6, 1.0, 1.3, 1.6];
  const CUSTOMER_BONUS = [0, 5, 10, 15];
  const CUSTOMERS = {
    anon:    { name: '개인 고객', icon: '📦', items: null, sizeBias: null, rule: null, claimMult: 1.0, perks: {}, desc: '동네 개인 택배. 월별 기본 비율' },
    dawn:    { name: '새벽마켓', icon: '🌙', items: { fresh: 70, normal: 30 }, sizeBias: 'small', claimMult: 1.5,
      rule: { kind: 'sameTurn', bonus: 20, text: '새벽배송: 입고 당 턴에 처리하면 +20' },
      perks: { 2: { cold: 2, text: '냉장 구역 +2 대여' }, 3: { deadlineDelta: 1, text: '이 고객 신선 기한 +1' } } },
    mart:    { name: '큰마트', icon: '🛒', items: { normal: 60, fresh: 20, fragile: 20 }, sizeBias: null, claimMult: 1.0,
      rule: { kind: 'bundle', min: 3, mult: 1.1, text: '정기 배송: 한 호출에 큰마트 택배 3개 이상이면 +10%' },
      perks: { 2: { carrierCap: { bulk: 1 }, text: '대량 분류 회당 +1' }, 3: { rewardDelta: 5, text: '이 고객 택배 보상 +5' } } },
    glass:   { name: '유리공방', icon: '🏺', items: { fragile: 80, normal: 20 }, sizeBias: 'mid', claimMult: 2.0,
      rule: { kind: 'streak', n: 5, bonus: 30, text: '취급 주의: 파손 없이 5개 연속 처리하면 +30' },
      perks: { 2: { breakMult: 0.5, text: '이 고객 택배 파손 확률 절반' }, 3: { bonusDelta: 10, text: '이 고객 파손 보너스 +10' } } },
    import:  { name: '직구몰', icon: '🛃', items: { intl: 70, fragile: 15, large: 15 }, sizeBias: null, claimMult: 1.2,
      rule: { kind: 'customsFast', delta: -1, text: '통관 예고: 이 고객 통관 대기 -1턴' },
      perks: { 2: { marketWeight: { intl: 2 }, text: '통관 대행 마켓 등장 ×2' }, 3: { bonusDelta: 15, text: '이 고객 통관 보너스 +15' } } },
    factory: { name: '가구공장', icon: '🪑', items: { large: 80, normal: 20 }, sizeBias: 'big', claimMult: 1.3,
      rule: { kind: 'sameArrival', bonus: 25, text: '묶음 출고: 같은 턴 입고분을 한 호출로 처리하면 +25' },
      perks: { 2: { xl: 1, text: '초대형 보관 +1' }, 3: { bigSizeDelta: -1, text: '이 고객 대형 점유 -1' } } },
    ice:     { name: '아이스팩토리', icon: '❆', items: { frozen: 90, fresh: 10 }, sizeBias: null, claimMult: 1.8,
      rule: { kind: 'frozenSafe', bonus: 15, text: '콜드체인: 냉동 택배 처리 시 +15' },
      perks: { 2: { facilityPrice: { freezer1: 0.5 }, text: '냉동고 증설 -50%' }, 3: { deadlineDelta: 2, text: '이 고객 냉동 기한 +2' } } },
    seafood: { name: '해외수산', icon: '🐟', items: { intlfresh: 60, fresh: 40 }, sizeBias: null, claimMult: 1.6,
      rule: { kind: 'coldCustoms', bonus: 20, text: '선도 유지: 통관 대기 중 냉장 구역에 있었으면 +20' },
      perks: { 2: { marketWeight: { sea: 2 }, text: '해상 운송 마켓 등장 ×2' }, 3: { customsDelta: -1, text: '이 고객 통관 대기 -1' } } },
    mover:   { name: '이사센터', icon: '🚚', items: null, storage: true, sizeBias: null, claimMult: 2.0, rule: null, desc: '보관 계약만 제안한다',
      perks: { 2: { storageFee: 0.2, text: '보관료 +20%' }, 3: { storageVolDelta: -2, text: '이삿짐 점유 -2' } } },
  };
  // 보관 계약 종류 (docs/CUSTOMER_DESIGN.md 3장)
  const STORAGE_KINDS = {
    move:   { name: '이삿짐', icon: '🏠', vol: [6, 10], turns: [3, 6], perVolTurn: 5, weight: 70 },
    season: { name: '계절 재고', icon: '📦', vol: [4, 4], turns: [12, 15], perTurn: 10, weight: 20 },
    event:  { name: '행사 물품', icon: '🎪', vol: [2, 2], turns: [2, 2], fee: 60, weight: 0, peakWeight: 40 },
  };
  // 보험사 (5장). cover: all | attrs+other | kinds+other. fans: 선호 고객(가입 중 월초 xp +1)
  const INSURERS = {
    none:      { name: '무보험', icon: '—', fee: 0, cover: null, fans: [], desc: '보장 없음. 배상 배율 ×2 고객은 물량 절반' },
    sturdy:    { name: '든든화재', icon: '🛡', fee: 60, cover: { all: 0.5 }, fans: ['mart'], desc: '모든 폐기 배상 50%' },
    coldguard: { name: '콜드가드', icon: '❄', fee: 50, cover: { attrs: { cold: 0.8, frozen: 0.8 }, other: 0.2 }, fans: ['dawn', 'ice', 'seafood'], desc: '❄❆ 부패 배상 80%, 그 외 20%' },
    safebox:   { name: '세이프박스', icon: '📦', fee: 50, cover: { kinds: { broken: 0.8, stolen: 0.8 }, other: 0.2 }, fans: ['glass', 'import'], desc: '⚠ 파손·도난 배상 80%, 그 외 20%' },
    premier:   { name: '프리미어', icon: '👑', fee: 110, cover: { all: 0.9 }, noReturnStress: true, fans: ['factory', 'mover'], desc: '모든 배상 90% + 반송 스트레스 면제' },
  };
  // 이번 달 청구 건수 → 다음 달 보험료 배율
  const PREMIUM_STEPS = [[0, 0.8], [2, 1.0], [4, 1.3], [Infinity, 1.7]];
  // 특수 보험 (마켓 1회성)
  const INS_ITEMS = {
    transitCert: { name: '운송 보험증', icon: '📜', price: 40, desc: '다음 호출 1회의 파손 확률 0' },
    yardIns:     { name: '야적 보험', icon: '⛺', price: 70, desc: '다음 달 도난 배상 100%' },
    customsBond: { name: '통관 보증', icon: '🛃', price: 50, desc: '다음 달 통관 지연 무효' },
  };
  // 날씨 (4.4장). 계절별 기본 가중치
  const WEATHER = {
    sunny: { name: '맑음', icon: '☀', desc: '' },
    rain:  { name: '비', icon: '🌧', desc: '야외 일반·⚠ 택배 젖음 (보상 -20%)' },
    heat:  { name: '폭염', icon: '🔥', desc: '냉장 밖 ❄❆ 즉시 폐기' },
    snow:  { name: '폭설', icon: '❄️', desc: '야외 ❄ 부패 없음·❆ 1턴 유예, 도난 절반, ❄ 기한 정지, ❄ 처리 +10' },
    storm: { name: '태풍', icon: '🌀', desc: '도난 2배, 젖음, 이 턴 입고 없음(다음 턴에 몰림)' },
  };
  const WEATHER_BY_SEASON = {
    spring: { sunny: 60, rain: 25, storm: 5 },
    summer: { sunny: 50, rain: 20, heat: 15, storm: 5 },
    autumn: { sunny: 60, rain: 25, storm: 5 },
    winter: { sunny: 55, rain: 15, snow: 20, storm: 3 },
  };
  // 복합 품목: 종류 + 추가 속성
  const CUSTOMER_ITEMS = { intlfresh: { type: 'intl', attrs: ['customs', 'cold'], sizes: [2, 4] }, intlfragile: { type: 'intl', attrs: ['customs', 'fragile'], sizes: [1, 2] } };
  const CUSTOMER_SLOTS = 4; // 익명 제외 고객 최대 수
  // 난이도 (docs/CARRIER_CAPABILITY_DESIGN.md 4장): 시나리오 규칙 위에 곱해지는 얇은 층
  const DIFFICULTIES = {
    rookie:  { name: '수습', icon: '🌱', desc: '입고 ×0.85, 운영비 -20, 가격 ×0.9, 도난·파손·배상 ×0.5, 예정 3턴, 스트레스 한계 24. 점수 ×0.7. 해금 도전과제 인정 안 됨', mods: { arrivalsMult: 0.85, opCostDelta: -20, itemPriceMult: 0.9, contractPriceMult: 0.9, facilityPriceMult: 0.9, theftMult: 0.5, breakMult: 0.5, claimMult: 0.5, upcomingTurns: 3, gameoverStress: 24, scoreMult: 0.7, noDualAttrs: true }, unlock: null },
    normal:  { name: '정규', icon: '📦', desc: '기본 규칙', mods: {}, unlock: null },
    veteran: { name: '베테랑', icon: '🔥', desc: '입고 ×1.1, 운영비 +30, 가격 ×1.1, 도난·파손 ×1.3, 배상 ×1.5, 속성 2개 택배 +3%p, 스트레스 한계 18. 점수 ×1.4', mods: { arrivalsMult: 1.1, opCostDelta: 30, itemPriceMult: 1.1, contractPriceMult: 1.1, facilityPriceMult: 1.1, theftMult: 1.3, breakMult: 1.3, claimMult: 1.5, gameoverStress: 18, scoreMult: 1.4, dualAttrBonus: 3 }, unlock: 'first_clear' },
  };

  const COMPANIES = {
    local: {
      customers: [['mart', 1], ['dawn', 0], ['glass', 0], ['anon', 0]],
      name: '동네 택배', tag: '균형형 · 기준선', icon: '🏠',
      warehouse: { cap: 24, cold: 6, xl: 1 }, cash: 600,
      contracts: [{ carrier: 'target', calls: 3 }, { carrier: 'cold', calls: 2 }, { carrier: 'bulk', calls: 1 }],
      passive: '동네 단골: 매월 첫 호출의 처리량 +1', weakness: '없음',
      mods: { firstCallBonus: 1 }, unlock: null, tier: 0,
    },
    fresh: {
      customers: [['dawn', 2], ['ice', 1], ['seafood', 0], ['anon', 0]],
      name: '프레시 로지스틱스', tag: '신선식품 특화', icon: '🧊',
      warehouse: { cap: 22, cold: 10, xl: 1 }, cash: 450,
      contracts: [{ carrier: 'cold', grade: 'trusted', calls: 3 }, { carrier: 'target', calls: 2 }, { carrier: 'bulk', calls: 2 }],
      passive: '콜드체인: 신선식품 기한 +1턴. 냉장 물류 호출 시 신뢰도 +1 추가', weakness: '냉장 편중: 파손·통관 보상 -10%. 대형 화물 업체 마켓 미등장',
      mods: { freshExtra: 1, coldTrustBonus: 1, rewardMult: { fragile: 0.9, intl: 0.9 }, banCarriers: ['large'], marketWeight: { cold: 2, cold1: 2, cold2: 2 } },
      unlock: 'fresh30', tier: 2,
    },
    steel: {
      customers: [['factory', 2], ['mover', 1], ['import', 0], ['anon', 0]],
      name: '강철 창고', tag: '대형화물 · 공간', icon: '🏗️',
      warehouse: { cap: 34, cold: 0, xl: 3 }, cash: 400,
      contracts: [{ carrier: 'large', calls: 2 }, { carrier: 'bulk', calls: 2 }, { carrier: 'target', calls: 4 }],
      passive: '적재 전문: 크기 4 이상 택배의 점유량 -1. 대형 화물 회당 처리량 +1', weakness: '냉장 없음: 신선식품은 항상 상온(부패 2배). 냉장 용량 최대 4',
      mods: { bigSizeDelta: -1, carrierCapDelta: { large: 1 }, coldCapMax: 4, marketWeight: { large: 2, expand1: 1.5, expand2: 1.5, expand3: 1.5, cold: 0.5 } },
      unlock: 'big20', tier: 2,
    },
    quick: {
      customers: [['dawn', 1], ['mart', 1], ['glass', 1]],
      name: '도심 퀵', tag: '좁은 창고 · 잦은 호출', icon: '🛵',
      warehouse: { cap: 16, cold: 4, xl: 0 }, cash: 500,
      contracts: [{ carrier: 'target', calls: 5 }, { carrier: 'cold', calls: 2 }, { carrier: 'bulk', calls: 2 }],
      passive: '빠른 배차: 모든 계약의 최대·잔여 호출 +2. 자체 배송 +1칸', weakness: '협소: 창고 확장 효과 절반. 초대형은 항상 임시 공간 +3',
      mods: { callsDelta: 2, selfCapDelta: 1, facilityCapMult: 0.5, marketWeight: { limit1: 2, limit2: 2, expand1: 0.5, expand2: 0.5, expand3: 0.5 } },
      unlock: 'rookie', tier: 1,
    },
    global: {
      customers: [['import', 2], ['seafood', 1], ['glass', 0], ['anon', 0]],
      name: '글로벌 익스프레스', tag: '통관 화물 · 고보상', icon: '✈️',
      warehouse: { cap: 26, cold: 4, xl: 2 }, cash: 450,
      contracts: [{ carrier: 'intl', calls: 3 }, { carrier: 'target', calls: 3 }, { carrier: 'bulk', calls: 2 }],
      passive: '관세 환급: 통관 화물 보상 +20. 통관 대행은 신뢰 3단계로 시작', weakness: '환율 변동: 월말 운영비 100~160 무작위. 일반 보상 -5',
      mods: { rewardDelta: { intl: 20, normal: -5 }, carrierStartTrust: { intl: 20 }, opCostRandom: [100, 150], marketWeight: { intl: 2 }, gradeShift: 0.3 },
      unlock: 'worldwide', tier: 2,
    },
    glass: {
      customers: [['glass', 2], ['mart', 1], ['anon', 0]],
      name: '유리방 물류', tag: '파손주의 · 정밀', icon: '🫙',
      warehouse: { cap: 24, cold: 4, xl: 1 }, cash: 500,
      contracts: [{ carrier: 'fragile', calls: 3 }, { carrier: 'target', calls: 3 }, { carrier: 'cold', calls: 1 }, { carrier: 'bulk', calls: 1 }],
      passive: '완충 포장: 파손주의 처리 기한 +2턴, 보상 +15', weakness: '조심조심: 대량 분류 처리량 -1. 한 호출 5개 이상이면 그 호출 보상 -10%',
      mods: { deadlineDelta: { fragile: 2 }, rewardDelta: { fragile: 15 }, carrierCapDelta: { bulk: -1 }, bigCallPenalty: 5, marketWeight: { fragile: 2, cap1: 0.7 } },
      unlock: 'fragile30', tier: 2,
    },
    thrifty: {
      customers: [['mart', 2], ['mover', 1], ['anon', 0], ['anon', 0]],
      name: '짠돌이 운송', tag: '절약형의 극단', icon: '🪙',
      warehouse: { cap: 30, cold: 6, xl: 1 }, cash: 700,
      contracts: [{ carrier: 'bulk', calls: 2 }, { carrier: 'cold', calls: 2 }, { carrier: 'target', calls: 2 }],
      passive: '알뜰 계약: 모든 마켓 가격 -20%. 대기한 턴마다 다음 호출 처리량 +1 (최대 +3)', weakness: '인력 부족: 모든 계약 최대 호출 -1. 월말 운영비 +40',
      mods: { premiumMult: 0.8, priceMult: 0.8, waitStack: 3, callsDelta: -1, opCostDelta: 40, marketWeight: { cap1: 1.5, limit1: 0.7, limit2: 0.7 } },
      unlock: 'two_clears', tier: 1,
    },
    startup: {
      customers: null,
      name: '스타트업 딜리버리', tag: '무작위 · 고위험', icon: '🚀',
      warehouse: null, cash: 300, contracts: null,
      passive: '피벗: 매월 마켓 새로고침 1회 무료. 마켓 계약 슬롯 3개. 신뢰 이상 등급 확률 +15%p', weakness: '불안정: 월말마다 시작 계약 하나의 잔여 호출 -1. 3개월차부터 운영비 +30',
      mods: { noInsurance: true, randomStart: true, freeRefresh: 1, marketContractSlots: 3, gradeShift: 0.15, erosion: true, lateOpCost: { from: 3, delta: 30 } },
      unlock: 'three_companies', tier: 3,
    },
    postal: {
      customers: [['anon', 0], ['anon', 0], ['anon', 0], ['mart', 1]],
      name: '국영 우편', tag: '안정형 · 장기전', icon: '📮',
      warehouse: { cap: 28, cold: 6, xl: 1 }, cash: 550,
      contracts: [{ carrier: 'bulk', grade: 'trusted', calls: 3 }, { carrier: 'cold', calls: 2 }, { carrier: 'target', calls: 2 }],
      passive: '공공 서비스: 운영비 80 고정. 자체 배송 +1칸. 스트레스 10 이상이면 월초 -2. 계약 교체 시 잔여 호출 1회 보존', weakness: '느린 결재: 마켓 매월 2개까지. 전문·마스터는 5개월차부터. 특수 보너스 -5',
      mods: { premiumDelta: { premier: -30 }, opCostFixed: 80, selfCapDelta: 1, stressRelief: { min: 10, amount: 2 }, keepCalls: 1, marketMaxBuy: 2, expertFrom: 5, bonusDelta: -5, marketWeight: { trusted: 1.3, expert: 0.5, master: 0.5 } },
      unlock: 'first_clear', tier: 1,
    },
  };

  const PERKS = {
    // 계약 계열
    longdeal:  { name: '장기 거래', family: 'contract', desc: '모든 계약 비용 -10%', mods: { contractPriceMult: 0.9 }, unlock: null },
    prepay:    { name: '선불 할인', family: 'contract', desc: '매월 첫 계약 구매 -40', mods: { firstContractDiscount: 40 }, unlock: 'buyer' },
    protect:   { name: '재계약 보호', family: 'contract', desc: '계약 교체 시 잔여 호출 1회 보존', mods: { keepCalls: 1 }, unlock: 'fresh_start' },
    regularco: { name: '단골 업체', family: 'contract', desc: '모든 업체 신뢰도 3xp(1단계)로 시작', mods: { allStartTrust: 3 }, unlock: 'trust3' },
    spare:     { name: '예비 기사', family: 'contract', desc: '매월 1회, 잔여 호출 0인 계약을 한 번 더 호출', mods: { spareCall: true }, unlock: 'empty_tank' },
    bundle:    { name: '묶음 할인', family: 'contract', desc: '한 호출로 4개 이상 처리하면 호출 횟수 미소모 (월 1회)', mods: { bundleRefund: 4 }, unlock: 'big_haul' },
    // 창고 계열
    compact:   { name: '공간 최적화', family: 'warehouse', desc: '모든 택배 크기 -1 (최소 1)', mods: { sizeDelta: -1 }, unlock: null },
    coldpro:   { name: '냉장 전문가', family: 'warehouse', desc: '신선식품 유통기한 +1턴', mods: { freshExtra: 1 }, unlock: 'no_spoil' },
    tempyard:  { name: '임시 적재장', family: 'warehouse', desc: '창고 초과 1~2는 페널티 없음', mods: { overflowGrace: 2 }, unlock: 'overflow_survivor' },
    shelves:   { name: '선반 증설', family: 'warehouse', desc: '시작 용량 +4', mods: { capDelta: 4 }, unlock: 'expander' },
    freezer:   { name: '냉동고', family: 'warehouse', desc: '냉장 구역의 신선식품은 첫 2턴 동안 부패 정지', mods: { freezer: 2 }, unlock: 'cold_buyer', needsCold: true },
    yard:      { name: '야적장', family: 'warehouse', desc: '초대형 보관 +1, 초대형 임시 공간 3→2', mods: { xlDelta: 1, xlPenalty: 2 }, unlock: 'xl_stack' },
    // 운영 계열
    skip:      { name: '스킵 보너스', family: 'ops', desc: '대기 후 다음 호출의 처리량 +1', mods: { skipBonus: 1 }, unlock: null },
    insure:    { name: '폐기 보험', family: 'ops', desc: '런당 첫 폐기 택배의 페널티 무효', mods: { insurance: true }, unlock: null },
    tent:      { name: '천막', family: 'warehouse', desc: '비·태풍에도 야외 택배가 젖지 않음', mods: { tent: true }, unlock: null },
    breath:    { name: '심호흡', family: 'ops', desc: '월초에 스트레스 -1', mods: { monthlyStress: -1 }, unlock: 'survivor' },
    overtime:  { name: '연장 근무', family: 'ops', desc: '기한 초과 택배의 보상 감소 25% → 10%', mods: { overdueMult: 0.9 }, unlock: 'late_but_done' },
    foresight: { name: '예지', family: 'ops', desc: '입고 예정을 4턴까지 표시', mods: { upcomingTurns: 4 }, unlock: 'waiter' },
    emergency: { name: '비상 대응', family: 'ops', desc: '긴급 특송 계약 -30%, 매월 마켓에 긴급 특송 등장', mods: { urgentDiscount: 0.7, guaranteeCarrier: 'urgent' }, unlock: 'clutch' },
    // 수익 계열
    regulars:  { name: '정기 고객', family: 'income', desc: '일반 택배 보상 +5', mods: { rewardDelta: { normal: 5 } }, unlock: 'normal100' },
    premium:   { name: '프리미엄 서비스', family: 'income', desc: '특수 운송 보너스 +5', mods: { bonusDelta: 5 }, unlock: 'all_special' },
    closing:   { name: '월말 결산', family: 'income', desc: '월말 창고 사용률 60% 이하면 +60', mods: { closingBonus: { usage: 0.6, amount: 60 } }, unlock: 'tidy' },
    consult:   { name: '물류 컨설팅', family: 'income', desc: '신뢰도 경험치 획득 +1', mods: { trustXpDelta: 1 }, unlock: 'trusted_three' },
    taxsave:   { name: '절세', family: 'income', desc: '월말 운영비 -20', mods: { opCostDelta: -20 }, unlock: 'rich' },
    investor:  { name: '투자 유치', family: 'income', desc: '시작 자금 +150, 월말 운영비 +20', mods: { cashDelta: 150, opCostDelta: 20 }, unlock: 'broke' },
  };
  const PERK_FAMILIES = { contract: '계약', warehouse: '창고', ops: '운영', income: '수익' };

  const DAILY_VARIANTS = {
    fog:      { name: '안개', desc: '입고 예정 표시 1턴', mods: { upcomingTurns: 1 } },
    express:  { name: '급행', desc: '모든 기한 -1턴, 보상 +10', mods: { deadlineAll: -1, rewardAll: 10 } },
    bigweek:  { name: '대형 주간', desc: '크기 4 이상 비율 2배', mods: { bigWeight: 2 } },
    inflation:{ name: '물가 상승', desc: '마켓 가격 ×1.3, 보상 +10%', mods: { itemPriceMult: 1.3, revenueMult: 1.1 } },
    trustboom:{ name: '신뢰 붐', desc: '신뢰도 경험치 ×2', mods: { trustXpMult: 2 } },
    repair:   { name: '창고 정비', desc: '시작 용량 -4, 창고 확장 -50%', mods: { capDelta: -4, facilityPriceMult: 0.5 } },
    picky:    { name: '깐깐한 고객', desc: '기한 초과 시 보상 -50%', mods: { overdueMult: 0.5 } },
    generous: { name: '후한 고객', desc: '회당 3개 이상 처리 시 보상 +15%', mods: { bigCallBonus: { min: 3, mult: 1.15 } } },
  };
  const DAILY_CONFLICTS = [['picky', 'generous'], ['express', 'picky']];

  const SCENARIOS = {
    standard: { name: '표준 3개월', icon: '📦', months: 3, desc: '기본 규칙. 3개월 생존', win: '3개월 생존', mods: {}, unlock: null, recommend: '동네 택배' },
    half:     { name: '반기 결산', icon: '📅', months: 6, desc: '6개월 풀런. 전문·마스터 등급, 대형화물 등장', win: '6개월 생존 (점수 ×1.5)', mods: { scoreMult: 1.5 }, unlock: 'first_clear', recommend: '국영 우편' },
    peak:     { name: '성수기', icon: '🎄', months: 2, desc: '입고 ×2.0, 폭주 턴 5회(폭주 입고분 기한 -2), 반송 유예 2턴. 보상 +10, 가격 ×1.3, 시작 호출 +2', win: '2개월 생존 + 42개 처리', mods: { eventGoods: true, returnGrace: 2, burstDeadlineDelta: -2, arrivalsMult: 2.0, burstTurns: 5, rewardAll: 10, itemPriceMult: 1.3, startCallsDelta: 2, winDelivered: 42 }, unlock: 'busy_month', recommend: '도심 퀵 · 강철 창고' },
    heatwave: { name: '폭염', icon: '🌡️', months: 3, desc: '신선 비율 +20%p, 상온 부패 3배, 폭염 경보 턴(월 3회), 입고 +10%', win: '3개월 생존 + 폐기 3개 이하', mods: { season: 'summer', customerWeights: { dawn: 2, ice: 2 }, customerClaimMult: { dawn: 2 }, typeShift: { fresh: 20, normal: -20 }, freshSizes: [2, 4, 7], warmMult: 3, heatAlerts: 3, arrivalsMult: 1.1, facilityPriceMult: { cold1: 0.7, cold2: 0.7 }, marketWeight: { cold: 1.5 }, winMaxDiscard: 3 }, unlock: 'fresh20', recommend: '프레시 로지스틱스' },
    strike:   { name: '파업', icon: '✊', months: 3, desc: '매월 운송 업체 1종 호출 불가 (월초 공지). 입고 +20%, 운영비 +30. 긴급 특송 상시 등장', win: '3개월 생존', mods: { strike: true, guaranteeCarrier: 'urgent', arrivalsMult: 1.2, opCostDelta: 30 }, unlock: 'four_carriers', recommend: '스타트업' },
    port:     { name: '항만 계약', icon: '🚢', months: 4, desc: '통관 20%·대형 12%, 초대형 7%, 입고 +10%. 통관·대형 보상 +20, 일반 -5', win: '4개월 생존', mods: { forceCustomers: ['import', 'seafood', 'factory'], noAnon: true, typeOverride: { normal: 40, fresh: 15, fragile: 13, intl: 20, large: 12 }, xlWeight: 7, arrivalsMult: 1.1, rewardDelta: { intl: 20, large: 20, normal: -5 }, xlDelta: 1, guaranteeCarriers: ['intl', 'large'] }, unlock: 'intl15', recommend: '글로벌 · 강철 창고' },
    cashcrunch:{ name: '자금난', icon: '💸', months: 3, desc: '시작 자금 -50%, 운영비 240, 새로고침 불가, 마켓 가격 +10%. 수익 +10%, 신뢰도 ×2', win: '3개월 생존 + 자금 600 이상', mods: { cashMult: 0.5, opCostFixed: 240, noRefresh: true, itemPriceMult: 1.1, revenueMult: 1.1, trustXpMult: 2, winCash: 600 }, unlock: 'rich_clear', recommend: '짠돌이 · 국영 우편' },
    blackfriday:{ name: '블랙 프라이데이', icon: '🛒', months: 1, desc: '한 달 지옥. 입고 ×2.3, 폭주 턴 4회, 가격 ×1.4, 반송 유예 4턴. 보상 +15, 시작 호출 +3', win: '1개월 생존 + 22개 처리', mods: { returnGrace: 4, arrivalsMult: 2.3, burstTurns: 4, itemPriceMult: 1.4, rewardAll: 15, startCallsDelta: 3, winDelivered: 22 }, unlock: 'peak_clear', recommend: '도심 퀵 · 짠돌이' },
    audit:    { name: '감사', icon: '📋', months: 3, desc: '모든 기한 -1턴, 기한 초과 보상 -50%, 월초 스트레스 +1, 운영비 +30', win: '3개월 생존 + 기한 초과 처리 4개 이하', mods: { premiumMult: 1.5, claimMult: 1.5, deadlineAll: -1, overdueMult: 0.5, monthlyStress: 1, opCostDelta: 30, winMaxOverdue: 4 }, unlock: 'perfect_month', recommend: '국영 우편 · 유리방' },
    moving:   { name: '이사철', icon: '🚚', months: 3, desc: '이사센터 포함, 보관 제안 5턴마다 보장, 보관료 ×1.5. 봄 날씨', win: '3개월 생존 + 보관 계약 6건 완수', mods: { forceCustomers: ['mover'], storageOfferEvery: 5, storageOfferProb: 0.2, storageMax: 3, storageFeeMult: 1.5, season: 'spring', winStorage: 6 }, unlock: 'storage3', recommend: '강철 창고' },
    bigdeal:  { name: '대형 계약', icon: '🤝', months: 3, desc: '고객 1명(무작위)이 물량 60%. 배상 ×1.2', win: '3개월 생존 + 그 고객 신뢰 3단계', mods: { bigCustomer: true, claimMult: 1.2, winBigCustomer: true }, unlock: 'cust_l3', recommend: '도심 퀵' },
    endless:  { name: '무한 운영', icon: '♾️', months: 99, desc: '게임오버까지. 7개월차부터 매월 입고 +1, 12개월차부터 운영비 +10/월', win: '없음 — 점수 경쟁', mods: { endless: true }, unlock: 'half_clear', recommend: '—' },
    daily:    { name: '데일리 배송', icon: '📆', months: 3, desc: '날짜 시드 고정 + 변형 규칙 2개. 회사는 그날 지정', win: '3개월 생존 (하루 1회 기록)', mods: { daily: true }, unlock: 'three_unlocked', recommend: '그날 지정' },
  };

  // 도전과제: kind = run(런 중 즉시) | end(런 종료 시, 승리 필요 여부 needWin) | cum(누적) | meta(해금 상태)
  // check(s, p, r): s=game.stats, p=profile.stats, r=result(런 종료 시)
  const ACHIEVEMENTS = {
    // 회사 해금 — 1단계(하다 보면) → 2단계(누적 특화) → 3단계(도전)
    rookie:       { name: '신입 기사', desc: '런 3회 플레이 (승패 무관)', kind: 'cum', rewardType: 'company', reward: 'quick', check: (s, p) => p.runs >= 3, prog: p => [p.runs, 3] },
    two_clears:   { name: '두 번째 성공', desc: '아무 시나리오나 2회 클리어', kind: 'cum', rewardType: 'company', reward: 'thrifty', check: (s, p) => p.clears >= 2, prog: p => [p.clears, 2] },
    fresh30:      { name: '신선 서른', desc: '신선식품 누적 30개 처리', kind: 'cum', rewardType: 'company', reward: 'fresh', check: (s, p) => p.deliveredByType.fresh >= 30, prog: p => [p.deliveredByType.fresh, 30] },
    fragile30:    { name: '파손주의 서른', desc: '파손주의 누적 30개 처리', kind: 'cum', rewardType: 'company', reward: 'glass', check: (s, p) => p.deliveredByType.fragile >= 30, prog: p => [p.deliveredByType.fragile, 30] },
    worldwide:    { name: '세계로', desc: '통관 화물 누적 30개 처리', kind: 'cum', rewardType: 'company', reward: 'global', check: (s, p) => p.deliveredByType.intl >= 30, prog: p => [p.deliveredByType.intl, 30] },
    big20:        { name: '무거운 손', desc: '크기 4 이상 택배 누적 20개를 기한 내 처리', kind: 'cum', rewardType: 'company', reward: 'steel', check: (s, p) => (p.bigDelivered || 0) >= 20, prog: p => [p.bigDelivered || 0, 20] },
    three_companies:{ name: '세 회사의 사장', desc: '서로 다른 회사 3개로 런 클리어', kind: 'meta', rewardType: 'company', reward: 'startup', check: (s, p) => Object.keys(p.clearsByCompany).length >= 3, prog: p => [Object.keys(p.clearsByCompany).length, 3] },
    // 기록용 (예전 회사 해금 조건)
    fresh_king:   { name: '신선 배송왕', desc: '한 런에서 신선식품 15개를 부패 없이 처리', kind: 'run', rewardType: 'none', check: s => s.deliveredByType.fresh >= 15 && s.discarded === 0 },
    giant:        { name: '거인의 어깨', desc: '한 런에서 초대형(7) 택배 5개를 기한 내 처리', kind: 'run', rewardType: 'none', check: s => s.xlOnTime >= 5 },
    nonstop:      { name: '무정차', desc: '대기 없이 30턴 연속 배송(자체 배송 포함)', kind: 'run', rewardType: 'none', check: s => s.maxCallStreak >= 30 },
    unbreakable:  { name: '깨지지 않는', desc: '한 런에서 파손주의 12개를 기한 내 처리', kind: 'run', rewardType: 'none', check: s => s.onTimeByType.fragile >= 12 },
    patience:     { name: '기다림의 미학', desc: '월평균 호출 4회 이하로 런 클리어', kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => s.calls / Math.max(1, r.monthsDone) <= 4 },
    // 시나리오·슬롯 해금
    cust_l3:      { name: '단골', desc: '한 런에서 고객 신뢰 3단계 달성', kind: 'run', rewardType: 'scenario', reward: 'bigdeal', check: s => (s.customerL3 || 0) >= 1 },
    storage3:     { name: '창고 대여업', desc: '보관 계약 누적 3건 완수', kind: 'cum', rewardType: 'scenario', reward: 'moving', check: (s, p) => (p.storageDone || 0) >= 3, prog: p => [p.storageDone || 0, 3] },
    noclaim2:     { name: '무사고', desc: '보험 청구 0건으로 2개월 연속', kind: 'run', rewardType: 'none', check: s => !!s.noClaim2 },
    snowrun:      { name: '눈길 배송', desc: '폭설 턴에 신선 택배 5개 처리', kind: 'run', rewardType: 'none', check: s => (s.snowDelivered || 0) >= 5 },
    landlord:     { name: '집주인', desc: '이사철 클리어', kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.scenario === 'moving' },
    partner:      { name: '파트너', desc: '대형 계약 클리어', kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.scenario === 'bigdeal' },
    veteran_clear:{ name: '베테랑', desc: '베테랑 난이도로 클리어', kind: 'end', needWin: true, rewardType: 'none', check: (s, p, r) => r.difficulty === 'veteran' },
    first_clear:  { name: '첫 클리어', desc: '아무 시나리오나 클리어', kind: 'end', needWin: true, rewardType: 'multi', reward: ['company:postal', 'scenario:half', 'slot:2'], check: () => true },
    busy_month:   { name: '바쁜 달', desc: '한 달에 15개 이상 처리', kind: 'run', rewardType: 'scenario', reward: 'peak', check: s => s.maxMonthDelivered >= 15 },
    peak_clear:   { name: '성수기 정복', desc: '성수기 클리어', kind: 'end', needWin: true, rewardType: 'scenario', reward: 'blackfriday', check: (s, p, r) => r.scenario === 'peak' },
    fresh20:      { name: '신선 스무 개', desc: '신선식품 누적 20개 처리', kind: 'cum', rewardType: 'scenario', reward: 'heatwave', check: (s, p) => p.deliveredByType.fresh >= 20, prog: p => [p.deliveredByType.fresh, 20] },
    four_carriers:{ name: '네 업체', desc: '계약 슬롯 4개를 서로 다른 업체로 채우고 클리어', kind: 'end', needWin: true, rewardType: 'scenario', reward: 'strike', check: s => s.distinctCarriersAtEnd >= 4 },
    intl15:       { name: '통관 열다섯', desc: '통관 화물 누적 15개 처리', kind: 'cum', rewardType: 'scenario', reward: 'port', check: (s, p) => p.deliveredByType.intl >= 15, prog: p => [p.deliveredByType.intl, 15] },
    rich_clear:   { name: '부자 클리어', desc: '자금 1,000 이상으로 표준 3개월 클리어', kind: 'end', needWin: true, rewardType: 'scenario', reward: 'cashcrunch', check: (s, p, r) => r.scenario === 'standard' && r.cash >= 1000 },
    half_clear:   { name: '반기 클리어', desc: '반기 결산 클리어', kind: 'end', needWin: true, rewardType: 'scenario', reward: 'endless', check: (s, p, r) => r.scenario === 'half' },
    three_unlocked:{ name: '세 회사', desc: '회사 3개 해금', kind: 'meta', rewardType: 'scenario', reward: 'daily', check: (s, p, r, prof) => prof.unlocked.companies.length >= 3, prog: (p, prof) => [prof.unlocked.companies.length, 3] },
    veteran:      { name: '베테랑', desc: '회사 5개 해금', kind: 'meta', rewardType: 'slot', reward: 3, check: (s, p, r, prof) => prof.unlocked.companies.length >= 5, prog: (p, prof) => [prof.unlocked.companies.length, 5] },
    // 퍽 해금
    buyer:        { name: '단골 손님', desc: '계약 누적 10개 구매', kind: 'cum', rewardType: 'perk', reward: 'prepay', check: (s, p) => p.contractsBought >= 10, prog: p => [p.contractsBought, 10] },
    fresh_start:  { name: '과감한 교체', desc: '잔여 호출 3회 이상인 계약을 교체하고 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'protect', check: s => s.replacedWithCalls >= 3 },
    trust3:       { name: '신뢰의 정점', desc: '한 업체를 신뢰 3단계까지 올림', kind: 'run', rewardType: 'perk', reward: 'regularco', check: s => s.trustL3 >= 1 },
    empty_tank:   { name: '빈 탱크', desc: '잔여 호출 0인 계약 4개로 월말을 맞고 생존', kind: 'run', rewardType: 'perk', reward: 'spare', check: s => s.zeroCallsMonthEnd },
    big_haul:     { name: '한 방', desc: '한 호출로 6개 이상 처리', kind: 'run', rewardType: 'perk', reward: 'bundle', check: s => s.maxSingleCall >= 6 },
    no_spoil:     { name: '무부패', desc: '신선식품 부패 0회로 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'coldpro', check: s => s.discarded === 0 && s.deliveredByType.fresh >= 5 },
    overflow_survivor:{ name: '넘쳐도 산다', desc: '창고 초과 상태로 5턴 이상 버티고 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'tempyard', check: s => s.overflowTurns >= 5 },
    expander:     { name: '확장주의자', desc: '한 런에 창고 확장 2개 구매', kind: 'run', rewardType: 'perk', reward: 'shelves', check: s => s.expansions >= 2 },
    cold_buyer:   { name: '냉장 투자', desc: '냉장고 증설 2회 구매한 런 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'freezer', check: s => s.coldUpgrades >= 2 },
    xl_stack:     { name: '초대형 삼총사', desc: '초대형 3개를 동시에 보관', kind: 'run', rewardType: 'perk', reward: 'yard', check: s => s.maxXlSimul >= 3 },
    survivor:     { name: '벼랑 끝', desc: '스트레스 15 이상에서 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'breath', check: (s, p, r) => r.stress >= 15 },
    late_but_done:{ name: '늦어도 배송', desc: '기한 초과 택배 10개를 처리하고 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'overtime', check: s => s.overdueDelivered >= 10 },
    waiter:       { name: '기다리는 자', desc: '대기 누적 40회', kind: 'cum', rewardType: 'perk', reward: 'foresight', check: (s, p) => p.waits >= 40, prog: p => [p.waits, 40] },
    clutch:       { name: '클러치', desc: '긴급 특송으로 부패 직전 신선식품 처리', kind: 'run', rewardType: 'perk', reward: 'emergency', check: s => s.urgentClutch },
    normal100:    { name: '일반 백 개', desc: '일반 택배 누적 100개', kind: 'cum', rewardType: 'perk', reward: 'regulars', check: (s, p) => p.deliveredByType.normal >= 100, prog: p => [p.deliveredByType.normal, 100] },
    all_special:  { name: '만능 물류', desc: '특수 택배 4종을 한 런에서 모두 전문 업체로 처리', kind: 'run', rewardType: 'perk', reward: 'premium', check: s => s.specialistTypes.length >= 4 },
    tidy:         { name: '깔끔한 마감', desc: '월말 사용률 40% 이하로 월 마감 3회 (누적)', kind: 'cum', rewardType: 'perk', reward: 'closing', check: (s, p) => p.tidyMonths >= 3, prog: p => [p.tidyMonths, 3] },
    trusted_three:{ name: '신뢰 삼각', desc: '신뢰 2단계 업체 3개', kind: 'run', rewardType: 'perk', reward: 'consult', check: s => s.maxTrustL2Simul >= 3 },
    rich:         { name: '여유 자금', desc: '자금 1,500 이상으로 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'taxsave', check: (s, p, r) => r.cash >= 1500 },
    broke:        { name: '간당간당', desc: '자금 100 이하로 월말을 넘기고 클리어', kind: 'end', needWin: true, rewardType: 'perk', reward: 'investor', check: s => s.brokeMonthEnd },
    // 기록용
    perfect_month:{ name: '완벽한 달', desc: '페널티 0으로 한 달 마감', kind: 'run', rewardType: 'scenario', reward: 'audit', check: s => s.perfectMonths >= 1 },
    full_house:   { name: '만석', desc: '창고 사용률 100% 이상에서 페널티 없이 다음 턴', kind: 'run', rewardType: 'none', check: s => s.fullNoPenalty },
    big_hand:     { name: '큰 손', desc: '한 호출로 8개 처리', kind: 'run', rewardType: 'none', check: s => s.maxSingleCall >= 8 },
    master_deal:  { name: '마스터 계약', desc: '마스터 등급 계약 보유', kind: 'run', rewardType: 'none', check: s => s.masterOwned },
    trust_badge:  { name: '신뢰의 증표', desc: '신뢰 3단계 업체 2개', kind: 'run', rewardType: 'none', check: s => s.maxTrustL3Simul >= 2 },
    millionaire:  { name: '백만장자', desc: '자금 2,000', kind: 'run', rewardType: 'none', check: s => s.maxCash >= 2000 },
    all_companies:{ name: '전 회사 클리어', desc: '9개 회사 모두 표준 클리어', kind: 'meta', rewardType: 'none', check: (s, p) => Object.keys(p.clearsByCompanyStandard || {}).length >= 9 },
    all_scenarios:{ name: '전 시나리오 클리어', desc: '무한 운영 제외 10개 클리어', kind: 'meta', rewardType: 'none', check: (s, p) => Object.keys(p.clearsByScenario).filter(k => k !== 'endless').length >= 10 },
    daily7:       { name: '데일리 7일', desc: '데일리 7일 연속 클리어', kind: 'meta', rewardType: 'none', check: (s, p) => p.dailyStreak >= 7 },
  };

  const META = { CUSTOMERS, CUSTOMER_ITEMS, CUSTOMER_SLOTS, DIFFICULTIES, STORAGE_KINDS, INSURERS, PREMIUM_STEPS, INS_ITEMS, WEATHER, WEATHER_BY_SEASON, CUSTOMER_LEVELS, CUSTOMER_VOLUME, CUSTOMER_BONUS, COMPANIES, PERKS, PERK_FAMILIES, SCENARIOS, DAILY_VARIANTS, DAILY_CONFLICTS, ACHIEVEMENTS, DEFAULT_UNLOCK: { companies: ['local'], perks: ['longdeal', 'compact', 'skip', 'insure'], scenarios: ['standard'], perkSlots: 1 } };
  if (typeof module !== 'undefined') module.exports = META; else root.META = META;
})(typeof window !== 'undefined' ? window : globalThis);
