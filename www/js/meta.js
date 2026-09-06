// 메타 진행 데이터: 회사 · 퍽 · 시나리오 · 도전과제 (docs/META_DESIGN.md v0.1)
(function (root) {
  const COMPANIES = {
    local: {
      name: '동네 택배', tag: '균형형 · 기준선', icon: '🏠',
      warehouse: { cap: 24, cold: 6, xl: 1 }, cash: 600,
      contracts: [{ carrier: 'target', calls: 3 }, { carrier: 'cold', calls: 2 }, { carrier: 'bulk', calls: 1 }],
      passive: '동네 단골: 매월 첫 호출의 처리량 +1', weakness: '없음',
      mods: { firstCallBonus: 1 }, unlock: null, tier: 0,
    },
    fresh: {
      name: '프레시 로지스틱스', tag: '신선식품 특화', icon: '🧊',
      warehouse: { cap: 22, cold: 10, xl: 1 }, cash: 450,
      contracts: [{ carrier: 'cold', grade: 'trusted', calls: 3 }, { carrier: 'target', calls: 2 }, { carrier: 'bulk', calls: 2 }],
      passive: '콜드체인: 신선식품 기한 +1턴. 냉장 물류 호출 시 신뢰도 +1 추가', weakness: '냉장 편중: 파손·통관 보상 -10%. 대형 화물 업체 마켓 미등장',
      mods: { freshExtra: 1, coldTrustBonus: 1, rewardMult: { fragile: 0.9, intl: 0.9 }, banCarriers: ['large'], marketWeight: { cold: 2, cold1: 2, cold2: 2 } },
      unlock: 'fresh30', tier: 2,
    },
    steel: {
      name: '강철 창고', tag: '대형화물 · 공간', icon: '🏗️',
      warehouse: { cap: 34, cold: 0, xl: 3 }, cash: 400,
      contracts: [{ carrier: 'large', calls: 2 }, { carrier: 'bulk', calls: 2 }, { carrier: 'target', calls: 4 }],
      passive: '적재 전문: 크기 4 이상 택배의 점유량 -1. 대형 화물 회당 처리량 +1', weakness: '냉장 없음: 신선식품은 항상 상온(부패 2배). 냉장 용량 최대 4',
      mods: { bigSizeDelta: -1, carrierCapDelta: { large: 1 }, coldCapMax: 4, marketWeight: { large: 2, expand1: 1.5, expand2: 1.5, expand3: 1.5, cold: 0.5 } },
      unlock: 'big20', tier: 2,
    },
    quick: {
      name: '도심 퀵', tag: '좁은 창고 · 잦은 호출', icon: '🛵',
      warehouse: { cap: 16, cold: 4, xl: 0 }, cash: 500,
      contracts: [{ carrier: 'target', calls: 5 }, { carrier: 'cold', calls: 2 }, { carrier: 'bulk', calls: 2 }],
      passive: '빠른 배차: 모든 계약의 최대·잔여 호출 +2. 자체 배송 +1칸', weakness: '협소: 창고 확장 효과 절반. 초대형은 항상 임시 공간 +3',
      mods: { callsDelta: 2, selfCapDelta: 1, facilityCapMult: 0.5, marketWeight: { limit1: 2, limit2: 2, expand1: 0.5, expand2: 0.5, expand3: 0.5 } },
      unlock: 'rookie', tier: 1,
    },
    global: {
      name: '글로벌 익스프레스', tag: '통관 화물 · 고보상', icon: '✈️',
      warehouse: { cap: 26, cold: 4, xl: 2 }, cash: 450,
      contracts: [{ carrier: 'intl', calls: 3 }, { carrier: 'target', calls: 3 }, { carrier: 'bulk', calls: 2 }],
      passive: '관세 환급: 통관 화물 보상 +20. 통관 대행은 신뢰 3단계로 시작', weakness: '환율 변동: 월말 운영비 100~160 무작위. 일반 보상 -5',
      mods: { rewardDelta: { intl: 20, normal: -5 }, carrierStartTrust: { intl: 20 }, opCostRandom: [100, 150], marketWeight: { intl: 2 }, gradeShift: 0.3 },
      unlock: 'worldwide', tier: 2,
    },
    glass: {
      name: '유리방 물류', tag: '파손주의 · 정밀', icon: '🫙',
      warehouse: { cap: 24, cold: 4, xl: 1 }, cash: 500,
      contracts: [{ carrier: 'fragile', calls: 3 }, { carrier: 'target', calls: 3 }, { carrier: 'cold', calls: 1 }, { carrier: 'bulk', calls: 1 }],
      passive: '완충 포장: 파손주의 처리 기한 +2턴, 보상 +15', weakness: '조심조심: 대량 분류 처리량 -1. 한 호출 5개 이상이면 그 호출 보상 -10%',
      mods: { deadlineDelta: { fragile: 2 }, rewardDelta: { fragile: 15 }, carrierCapDelta: { bulk: -1 }, bigCallPenalty: 5, marketWeight: { fragile: 2, cap1: 0.7 } },
      unlock: 'fragile30', tier: 2,
    },
    thrifty: {
      name: '짠돌이 운송', tag: '절약형의 극단', icon: '🪙',
      warehouse: { cap: 30, cold: 6, xl: 1 }, cash: 700,
      contracts: [{ carrier: 'bulk', calls: 2 }, { carrier: 'cold', calls: 2 }, { carrier: 'target', calls: 2 }],
      passive: '알뜰 계약: 모든 마켓 가격 -20%. 대기한 턴마다 다음 호출 처리량 +1 (최대 +3)', weakness: '인력 부족: 모든 계약 최대 호출 -1. 월말 운영비 +40',
      mods: { priceMult: 0.8, waitStack: 3, callsDelta: -1, opCostDelta: 40, marketWeight: { cap1: 1.5, limit1: 0.7, limit2: 0.7 } },
      unlock: 'two_clears', tier: 1,
    },
    startup: {
      name: '스타트업 딜리버리', tag: '무작위 · 고위험', icon: '🚀',
      warehouse: null, cash: 300, contracts: null,
      passive: '피벗: 매월 마켓 새로고침 1회 무료. 마켓 계약 슬롯 3개. 신뢰 이상 등급 확률 +15%p', weakness: '불안정: 월말마다 시작 계약 하나의 잔여 호출 -1. 3개월차부터 운영비 +30',
      mods: { randomStart: true, freeRefresh: 1, marketContractSlots: 3, gradeShift: 0.15, erosion: true, lateOpCost: { from: 3, delta: 30 } },
      unlock: 'three_companies', tier: 3,
    },
    postal: {
      name: '국영 우편', tag: '안정형 · 장기전', icon: '📮',
      warehouse: { cap: 28, cold: 6, xl: 1 }, cash: 550,
      contracts: [{ carrier: 'bulk', grade: 'trusted', calls: 3 }, { carrier: 'cold', calls: 2 }, { carrier: 'target', calls: 2 }],
      passive: '공공 서비스: 운영비 80 고정. 자체 배송 +1칸. 스트레스 10 이상이면 월초 -2. 계약 교체 시 잔여 호출 1회 보존', weakness: '느린 결재: 마켓 매월 2개까지. 전문·마스터는 5개월차부터. 특수 보너스 -5',
      mods: { opCostFixed: 80, selfCapDelta: 1, stressRelief: { min: 10, amount: 2 }, keepCalls: 1, marketMaxBuy: 2, expertFrom: 5, bonusDelta: -5, marketWeight: { trusted: 1.3, expert: 0.5, master: 0.5 } },
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
    peak:     { name: '성수기', icon: '🎄', months: 2, desc: '입고 ×1.8, 폭주 턴 4회. 보상 +10, 가격 ×1.3, 시작 호출 +2', win: '2개월 생존 + 38개 처리', mods: { arrivalsMult: 1.8, burstTurns: 4, rewardAll: 10, itemPriceMult: 1.3, startCallsDelta: 2, winDelivered: 38 }, unlock: 'busy_month', recommend: '도심 퀵 · 강철 창고' },
    heatwave: { name: '폭염', icon: '🌡️', months: 3, desc: '신선 비율 +20%p, 상온 부패 3배, 폭염 경보 턴(월 3회), 입고 +10%', win: '3개월 생존 + 폐기 3개 이하', mods: { typeShift: { fresh: 20, normal: -20 }, freshSizes: [2, 4, 7], warmMult: 3, heatAlerts: 3, arrivalsMult: 1.1, facilityPriceMult: { cold1: 0.7, cold2: 0.7 }, marketWeight: { cold: 1.5 }, winMaxDiscard: 3 }, unlock: 'fresh20', recommend: '프레시 로지스틱스' },
    strike:   { name: '파업', icon: '✊', months: 3, desc: '매월 운송 업체 1종 호출 불가 (월초 공지). 입고 +20%, 운영비 +30. 긴급 특송 상시 등장', win: '3개월 생존', mods: { strike: true, guaranteeCarrier: 'urgent', arrivalsMult: 1.2, opCostDelta: 30 }, unlock: 'four_carriers', recommend: '스타트업' },
    port:     { name: '항만 계약', icon: '🚢', months: 4, desc: '통관 20%·대형 12%, 초대형 7%, 입고 +10%. 통관·대형 보상 +20, 일반 -5', win: '4개월 생존', mods: { typeOverride: { normal: 40, fresh: 15, fragile: 13, intl: 20, large: 12 }, xlWeight: 7, arrivalsMult: 1.1, rewardDelta: { intl: 20, large: 20, normal: -5 }, xlDelta: 1, guaranteeCarriers: ['intl', 'large'] }, unlock: 'intl15', recommend: '글로벌 · 강철 창고' },
    cashcrunch:{ name: '자금난', icon: '💸', months: 3, desc: '시작 자금 -50%, 운영비 240, 새로고침 불가, 마켓 가격 +10%. 수익 +10%, 신뢰도 ×2', win: '3개월 생존 + 자금 600 이상', mods: { cashMult: 0.5, opCostFixed: 240, noRefresh: true, itemPriceMult: 1.1, revenueMult: 1.1, trustXpMult: 2, winCash: 600 }, unlock: 'rich_clear', recommend: '짠돌이 · 국영 우편' },
    blackfriday:{ name: '블랙 프라이데이', icon: '🛒', months: 1, desc: '한 달 지옥. 입고 ×2.3, 폭주 턴 4회, 가격 ×1.4. 보상 +15, 시작 호출 +3', win: '1개월 생존 + 24개 처리', mods: { arrivalsMult: 2.3, burstTurns: 4, itemPriceMult: 1.4, rewardAll: 15, startCallsDelta: 3, winDelivered: 24 }, unlock: 'peak_clear', recommend: '도심 퀵 · 짠돌이' },
    audit:    { name: '감사', icon: '📋', months: 3, desc: '모든 기한 -1턴, 기한 초과 보상 -50%, 월초 스트레스 +1, 운영비 +30', win: '3개월 생존 + 기한 초과 처리 4개 이하', mods: { deadlineAll: -1, overdueMult: 0.5, monthlyStress: 1, opCostDelta: 30, winMaxOverdue: 4 }, unlock: 'perfect_month', recommend: '국영 우편 · 유리방' },
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

  const META = { COMPANIES, PERKS, PERK_FAMILIES, SCENARIOS, DAILY_VARIANTS, DAILY_CONFLICTS, ACHIEVEMENTS, DEFAULT_UNLOCK: { companies: ['local'], perks: ['longdeal', 'compact', 'skip', 'insure'], scenarios: ['standard'], perkSlots: 1 } };
  if (typeof module !== 'undefined') module.exports = META; else root.META = META;
})(typeof window !== 'undefined' ? window : globalThis);
