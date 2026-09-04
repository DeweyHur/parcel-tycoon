// 밸런스 데이터 (기획서 v0.2, 프로토타입 범위)
(function (root) {
  const DATA = {
    MONTHS: 3,
    TURNS_PER_MONTH: 10,
    START_CASH: 600,
    GAMEOVER_STRESS: 20,
    OPERATING_COST: 120,
    CONTRACT_SLOTS: 4,
    MARKET_MAX_BUY: 3,
    REFRESH_COSTS: [40, 80, 140, 220],

    WAREHOUSE: { cap: 24, cold: 6, xl: 1 },

    // 월별 추가 입고 수 (기본 10 + 추가)
    EXTRA_ARRIVALS: { 1: 2, 2: 3, 3: 4 },

    // 월별 택배 종류 비율
    TYPE_RATIO: {
      1: { normal: 60, fresh: 20, fragile: 15, intl: 5 },
      2: { normal: 50, fresh: 20, fragile: 20, intl: 10 },
      3: { normal: 45, fresh: 20, fragile: 20, intl: 15 },
    },

    // 크기 등장 비율 (1 소형, 2 중형, 4 대형, 7 초대형)
    SIZE_WEIGHT: { 1: 50, 2: 35, 4: 12, 7: 3 },

    PARCEL_TYPES: {
      normal:  { name: '일반',     short: '일반', sizes: [1, 2],  deadline: 6, bonus: 0,  specialist: null,   color: 0xc9a06c, css: '#c9a06c' },
      fresh:   { name: '신선식품', short: '신선', sizes: [2, 4],  deadline: 3, bonus: 10, specialist: 'cold', color: 0x5ee0d8, css: '#5ee0d8' },
      fragile: { name: '파손주의', short: '파손', sizes: [2, 4],  deadline: 7, bonus: 15, specialist: 'fragile', color: 0xf0a04b, css: '#f0a04b' },
      intl:    { name: '국제운송', short: '국제', sizes: [4, 7],  deadline: 8, bonus: 20, specialist: 'intl', color: 0x6c8cff, css: '#6c8cff' },
    },
    FRESH_TURNS: 3,

    CARRIERS: {
      line:   { name: '일반 라인',     short: '라인', desc: '대기열 맨 앞의 일반 택배를 처리', cap: 1, calls: 6, price: 180, mode: 'queue',  types: ['normal'] },
      target: { name: '타겟 멀티모달', short: '타겟', desc: '원하는 택배 1개를 골라 처리 (특수 보너스 없음)', cap: 1, calls: 4, price: 200, mode: 'pick', types: ['normal', 'fresh', 'fragile', 'intl'] },
      cold:   { name: '냉장 물류',     short: '냉장', desc: '신선식품을 골라 처리, 신선 보너스', cap: 3, calls: 3, price: 210, mode: 'pick', types: ['fresh'] },
      bulk:   { name: '대량 분류',     short: '대량', desc: '일반 택배를 골라 한 번에 처리', cap: 4, calls: 2, price: 160, mode: 'pick', types: ['normal'] },
      // 마켓에서만 등장하는 전문 업체
      fragile: { name: '프래자일 전문', short: '프래', desc: '파손주의 택배를 골라 처리, 파손 보너스', cap: 3, calls: 3, price: 210, mode: 'pick', types: ['fragile'], marketOnly: true },
      intl:    { name: '국제 특송',     short: '국제', desc: '국제운송 택배를 골라 처리, 국제 보너스', cap: 2, calls: 3, price: 240, mode: 'pick', types: ['intl'], marketOnly: true },
    },
    CARRIER_L3: {
      line: '신뢰 3단계: 대기열 앞 일반 택배 2개 처리',
      target: '신뢰 3단계: 특수 택배 처리 시 특수 운송 보너스 적용',
      cold: '신뢰 3단계: 호출 턴에 신선식품 부패 카운트 정지',
      bulk: '신뢰 3단계: 일반 택배 1개 추가 처리',
      fragile: '신뢰 3단계: 파손주의 처리 시 보상 +15',
      intl: '신뢰 3단계: 국제 택배 1개 추가 처리',
    },

    START_CONTRACTS: [
      { carrier: 'line', calls: 4 },
      { carrier: 'target', calls: 3 },
      { carrier: 'cold', calls: 2 },
      { carrier: 'bulk', calls: 1 },
    ],

    GRADES: {
      normal:  { name: '일반', cap: 0, calls: 0, price: 1.0 },
      trusted: { name: '신뢰', cap: 1, calls: 1, price: 1.35 },
    },
    GRADE_PROB: { 1: { normal: 70, trusted: 30 }, 2: { normal: 55, trusted: 45 }, 3: { normal: 40, trusted: 60 } },

    TRUST_LEVELS: [0, 5, 12, 20],

    ENHANCEMENTS: {
      limit2:  { name: '호출 한도 +2', desc: '계약 최대/잔여 호출 횟수 +2 (계약당 2회)', price: 160, kind: 'limit', value: 2 },
      cap1:    { name: '처리 용량 강화 I', desc: '회당 처리량 +1 (계약당 3회)', price: 160, kind: 'cap', value: 1 },
      regular: { name: '정기 배차', desc: '해당 계약의 4번째 성공 호출마다 추가 1개 처리', price: 180, kind: 'regular' },
      seal:    { name: '신뢰도 인장', desc: '선택한 계약의 신뢰도 경험치 +3', price: 90, kind: 'trust', value: 3 },
    },
    FACILITIES: {
      expand1: { name: '창고 확장 1단계', desc: '전체 용량 +8', price: 160, cap: 8 },
      cold1:   { name: '냉장고 증설', desc: '냉장 용량 +4', price: 140, cold: 4 },
    },
    PRICE_MULT: { 1: 1.0, 2: 1.1, 3: 1.2 },

    PERKS: {
      longdeal: { name: '장기 거래', desc: '모든 계약 비용 -10%' },
      coldpro:  { name: '냉장 전문가', desc: '신선식품 유통기한 +1턴' },
      compact:  { name: '공간 최적화', desc: '모든 택배 크기 -1 (최소 1)' },
      skip:     { name: '스킵 보너스', desc: '대기 후 다음 호출의 처리량 +1' },
      insure:   { name: '폐기 보험', desc: '첫 번째 폐기 택배의 페널티 무효화' },
    },

    STRESS_STATES: [[5, '안정'], [10, '주의'], [15, '위험'], [19, '위기'], [20, '게임오버']],
  };
  if (typeof module !== 'undefined') module.exports = DATA; else root.DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
