// 밸런스 데이터 (기획서 v0.2 전체 범위 + 메타 기획서 v0.1)
(function (root) {
  const DATA = {
    TURNS_PER_MONTH: 10,
    START_CASH: 600,
    GAMEOVER_STRESS: 20,
    OPERATING_COST: 120,
    CONTRACT_SLOTS: 4,
    MARKET_MAX_BUY: 3,
    REFRESH_COSTS: [40, 80, 140, 220],

    WAREHOUSE: { cap: 24, cold: 6, xl: 1 },

    // 월별 추가 입고 수 (기본 10 + 추가). 7개월차 이후는 무한 모드에서 확장
    EXTRA_ARRIVALS: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 },

    // 월별 택배 종류 비율 (large = 대형화물, 4개월차부터)
    TYPE_RATIO: {
      1: { normal: 60, fresh: 20, fragile: 15, intl: 5, large: 0 },
      2: { normal: 50, fresh: 20, fragile: 20, intl: 10, large: 0 },
      3: { normal: 45, fresh: 20, fragile: 20, intl: 15, large: 0 },
      4: { normal: 35, fresh: 22, fragile: 23, intl: 15, large: 5 },
      5: { normal: 30, fresh: 25, fragile: 25, intl: 15, large: 5 },
      6: { normal: 25, fresh: 25, fragile: 25, intl: 20, large: 5 },
    },

    // 크기 등장 비율 (1 소형, 2 중형, 4 대형, 7 초대형)
    SIZE_WEIGHT: { 1: 50, 2: 35, 4: 12, 7: 3 },

    PARCEL_TYPES: {
      normal:  { name: '일반',     short: '일반', sizes: [1, 2],  deadline: 6, bonus: 0,  specialist: null,      color: 0xc9a06c, css: '#c9a06c' },
      fresh:   { name: '신선식품', short: '신선', sizes: [2, 4],  deadline: 3, bonus: 10, specialist: 'cold',    color: 0x5ee0d8, css: '#5ee0d8' },
      fragile: { name: '파손주의', short: '파손', sizes: [2, 4],  deadline: 7, bonus: 15, specialist: 'fragile', color: 0xf0a04b, css: '#f0a04b' },
      intl:    { name: '국제운송', short: '국제', sizes: [4, 7],  deadline: 8, bonus: 20, specialist: 'intl',    color: 0x6c8cff, css: '#6c8cff' },
      large:   { name: '대형화물', short: '대형', sizes: [4, 7],  deadline: 8, bonus: 25, specialist: 'large',   color: 0xb08bd8, css: '#b08bd8' },
    },
    FRESH_TURNS: 3,
    // 반송: 기한 초과 후 유예 턴. 유예가 끝나면 반송(폐기)
    RETURN_GRACE: 3,
    // 도난: 야외 적재(창고 초과분) 택배당 확률, 초과 부피 구간별
    THEFT_PROB: [[2, 0.15], [5, 0.30], [Infinity, 0.50]],

    CARRIERS: {
      target:  { name: '용달', short: '용달', desc: '원하는 택배 1개를 골라 차를 불러 보냄 (특수 보너스 없음)', cap: 1, calls: 4, price: 200, mode: 'pick', types: ['normal', 'fresh', 'fragile', 'intl', 'large'] },
      cold:    { name: '냉장 물류',     short: '냉장', desc: '신선식품을 골라 처리, 신선 보너스', cap: 3, calls: 3, price: 210, mode: 'pick', types: ['fresh'] },
      bulk:    { name: '대량 분류',     short: '대량', desc: '일반 택배를 골라 한 번에 처리', cap: 4, calls: 2, price: 160, mode: 'pick', types: ['normal'] },
      fragile: { name: '프래자일 전문', short: '프래', desc: '파손주의 택배를 골라 처리, 파손 보너스', cap: 3, calls: 3, price: 210, mode: 'pick', types: ['fragile'], marketOnly: true },
      intl:    { name: '국제 특송',     short: '국제', desc: '국제운송 택배를 골라 처리, 국제 보너스', cap: 2, calls: 3, price: 240, mode: 'pick', types: ['intl'], marketOnly: true },
      large:   { name: '대형 화물',     short: '대형', desc: '대형화물과 크기 4 이상 택배를 처리, 대형 보너스', cap: 2, calls: 2, price: 220, mode: 'pick', types: ['large'], minSizeAny: 4, marketOnly: true },
      urgent:  { name: '긴급 특송',     short: '긴급', desc: '⚡턴을 쓰지 않고 즉시 1개 처리. 어떤 택배든 가능, 보너스 없음', cap: 1, calls: 2, price: 300, mode: 'pick', types: ['normal', 'fresh', 'fragile', 'intl', 'large'], marketOnly: true, instant: true },
    },
    CARRIER_L3: {
      target: '신뢰 3단계: 특수 택배 처리 시 특수 운송 보너스 적용',
      cold: '신뢰 3단계: 호출 턴에 신선식품 부패 카운트 정지',
      bulk: '신뢰 3단계: 일반 택배 1개 추가 처리',
      fragile: '신뢰 3단계: 파손주의 처리 시 보상 +15',
      intl: '신뢰 3단계: 국제 택배 1개 추가 처리',
      large: '신뢰 3단계: 초대형 화물 2개를 한 번에 처리 (처리량 +1)',
      urgent: '신뢰 3단계: 한 번에 2개 처리',
    },

    // 자체 배송: 계약과 무관한 상설 행동. 대기열 앞의 일반 택배를 처리, 무제한·무료, 턴 소모
    SELF_DELIVERY: { name: '자체 배송', cap: 2, rewardMult: 0.7 }, // cap은 부피(칸). 직접 배송은 마진이 낮다

    GRADES: {
      normal:  { name: '일반', cap: 0, calls: 0, price: 1.0 },
      trusted: { name: '신뢰', cap: 1, calls: 1, price: 1.35 },
      expert:  { name: '전문', cap: 2, calls: 1, price: 1.7 },
      master:  { name: '마스터', cap: 2, calls: 2, price: 2.1, special: true },
    },
    GRADE_PROB: {
      1: { normal: 70, trusted: 30, expert: 0, master: 0 },
      2: { normal: 55, trusted: 40, expert: 5, master: 0 },
      3: { normal: 40, trusted: 45, expert: 15, master: 0 },
      4: { normal: 30, trusted: 45, expert: 20, master: 5 },
      5: { normal: 20, trusted: 40, expert: 25, master: 15 },
      6: { normal: 15, trusted: 35, expert: 30, master: 20 },
    },

    // 업체 신뢰도 (런 내, 업체별 누적 — 계약을 바꿔도 유지)
    TRUST_LEVELS: [0, 3, 8, 15],
    TRUST_EFFECTS: ['기본', '회당 처리량 +1', '4번째 호출마다 +1개', '전용 능력'],
    // 단계별 효과 문구 (마켓 카드·호출 모달·도감이 같은 문자열을 읽는다)
    trustEffectText(carrier, lv) { if (lv >= 3 && DATA.CARRIER_L3[carrier]) return DATA.CARRIER_L3[carrier].replace('신뢰 3단계: ', ''); return DATA.TRUST_EFFECTS[lv]; },

    ENHANCEMENTS: {
      limit1:  { name: '호출 한도 +1', desc: '계약 최대/잔여 호출 횟수 +1 (계약당 2회)', price: 90, kind: 'limit', value: 1 },
      limit2:  { name: '호출 한도 +2', desc: '계약 최대/잔여 호출 횟수 +2 (계약당 2회)', price: 160, kind: 'limit', value: 2 },
      cap1:    { name: '처리 용량 강화 I', desc: '회당 처리량 +1 (계약당 3회)', price: 160, kind: 'cap', value: 1 },
      regular: { name: '정기 배차', desc: '해당 계약의 4번째 성공 호출마다 추가 1개 처리', price: 180, kind: 'regular' },
      express: { name: '고속 배차', desc: '해당 계약의 3번째 성공 호출마다 추가 1개 처리', price: 300, kind: 'express' },
      seal:    { name: '신뢰도 인장', desc: '선택한 계약의 신뢰도 경험치 +3', price: 90, kind: 'trust', value: 3 },
      record:  { name: '장기 거래 기록', desc: '선택한 계약의 신뢰도 경험치 +6', price: 170, kind: 'trust', value: 6 },
    },
    FACILITIES: {
      expand1: { name: '창고 확장 1단계', desc: '전체 용량 +8', price: 160, cap: 8 },
      expand2: { name: '창고 확장 2단계', desc: '전체 용량 +10', price: 260, cap: 10, requires: 'expand1' },
      expand3: { name: '창고 확장 3단계', desc: '전체 용량 +12', price: 400, cap: 12, requires: 'expand2' },
      cold1:   { name: '냉장고 증설', desc: '냉장 용량 +4', price: 140, cold: 4 },
      cold2:   { name: '냉장고 증설 2', desc: '냉장 용량 +6', price: 240, cold: 6, requires: 'cold1' },
      yard:    { name: '대형 적재장', desc: '초대형 보관 +1', price: 180, xl: 1 },
    },
    PRICE_MULT: { 1: 1.0, 2: 1.1, 3: 1.2, 4: 1.35, 5: 1.5, 6: 1.7 },

    STRESS_STATES: [[5, '안정'], [10, '주의'], [15, '위험'], [19, '위기'], [20, '게임오버']],
  };
  if (typeof module !== 'undefined') module.exports = DATA; else root.DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
