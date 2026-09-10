// 밸런스 데이터 (기획서 v0.2 전체 범위 + 메타 기획서 v0.1)
// 이름·설명 등 텍스트 필드는 locales/<lang>.js 의 data 섹션에 있고, i18n.js 가 같은 모양으로 덮어쓴다
(function (root) {
  const DATA = {
    TURNS_PER_MONTH: 10,
    START_CASH: 600,
    GAMEOVER_STRESS: 20,
    OPERATING_COST: 120,
    CONTRACT_SLOTS: 4,
    MARKET_MAX_BUY: 3,
    REFRESH_COSTS: [40, 80, 140, 220],

    WAREHOUSE: { cap: 24, cold: 6, frozen: 4, xl: 1 },

    // 월별 추가 입고 수 (기본 10 + 추가). 7개월차 이후는 무한 모드에서 확장
    EXTRA_ARRIVALS: { 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7 },

    // 월별 택배 종류 비율 (large = 대형화물, 4개월차부터)
    // intl = 🛃 통관 (구 국제운송), frozen = ❆ 냉동 (4개월차부터)
    TYPE_RATIO: {
      1: { normal: 62, fresh: 12, produce: 8, fragile: 12, intl: 6, large: 0, frozen: 0 },
      2: { normal: 55, fresh: 13, produce: 9, fragile: 13, intl: 10, large: 0, frozen: 0 },
      3: { normal: 50, fresh: 13, produce: 9, fragile: 15, intl: 13, large: 0, frozen: 0 },
      4: { normal: 42, fresh: 13, produce: 9, fragile: 16, intl: 12, large: 5, frozen: 3 },
      5: { normal: 38, fresh: 13, produce: 10, fragile: 17, intl: 13, large: 5, frozen: 4 },
      6: { normal: 33, fresh: 13, produce: 10, fragile: 18, intl: 16, large: 5, frozen: 5 },
    },

    // 크기 등장 비율 (1 소형, 2 중형, 4 대형, 7 초대형)
    SIZE_WEIGHT: { 1: 50, 2: 35, 4: 12, 7: 3 },

    // 속성(attrs): 창고에서 벌어지는 일. cold=❄ 냉장 구역 밖이면 다음 턴 폐기 / fragile=⚠ 능력 없는 업체면 파손 확률 / customs=🛃 통관 대기 중 처리 불가 / frozen=❆ 냉동 구역 밖이면 즉시 폐기
    ATTRS: { cold: { icon: '❄' }, fragile: { icon: '⚠' }, customs: { icon: '🛃' }, frozen: { icon: '❆' }, produce: { icon: '🌾' } },
    // 업체 매칭에 관여하는 속성 (🌾 농산물은 날씨 속성이라 아무 업체나 처리)
    GATING_ATTRS: ['cold', 'fragile', 'customs', 'frozen'],
    PARCEL_TYPES: {
      normal:  { attrs: [],          sizes: [1, 2],  deadline: 6, bonus: 0,  color: 0xc9a06c, css: '#c9a06c' },
      fresh:   { attrs: ['cold'],    sizes: [2, 4],  deadline: 3, bonus: 10, color: 0x5ee0d8, css: '#5ee0d8' },
      produce: { attrs: ['produce'], sizes: [2, 4],  deadline: 5, bonus: 10, color: 0x9acd5a, css: '#9acd5a' },
      fragile: { attrs: ['fragile'], sizes: [2, 4],  deadline: 7, bonus: 15, color: 0xf0a04b, css: '#f0a04b' },
      intl:    { attrs: ['customs'], sizes: [4, 7],  deadline: 8, bonus: 20, color: 0x6c8cff, css: '#6c8cff' },
      large:   { attrs: [],          sizes: [4, 7],  deadline: 8, bonus: 25, color: 0xb08bd8, css: '#b08bd8' },
      frozen:  { attrs: ['frozen'],  sizes: [2, 4],  deadline: 8, bonus: 20, color: 0x9ad7ff, css: '#9ad7ff' },
    },
    FRESH_TURNS: 3,
    // 신선: 냉장 구역 밖에서 WARM_LIMIT턴 지나면 폐기 (폭염 경보 턴은 즉시). 냉동: 냉동 구역 밖이면 즉시
    WARM_LIMIT: 1,
    // 통관: 입고 후 대기 턴, 지연 이벤트 확률(+1턴). 통관 대행(caps에 customs) 업체만 대기 중 처리 가능
    CUSTOMS_WAIT: 2, CUSTOMS_DELAY_PROB: 0.2,
    // 파손: ⚠ 능력 없는 업체로 보낼 때 파손 확률
    BREAK_PROB: 0.25,
    // 반송: 기한 초과 후 유예 턴. 유예가 끝나면 반송(폐기)
    RETURN_GRACE: 3,
    // 도난: 야외 적재(창고 초과분) 택배당 확률, 초과 부피 구간별
    THEFT_PROB: [[2, 0.15], [5, 0.30], [Infinity, 0.50]],

    // 업체 능력: caps = 안전하게 다루는 속성. need = 이 속성 중 하나가 있는 택배만 받음(전문). onlyPlain = 속성 없는 택배만.
    // 매칭: 크기 범위 && need && (❆는 caps 필수) && (🛃 대기 중이면 caps 필수). ❄·⚠는 caps 없어도 받되 ⚠는 파손 확률.
    // specialist = 이 종류를 처리하면 특수 운송 보너스. delay = 보상이 N턴 뒤 입금. badge = 운송 수단(매칭 무관)
    CARRIERS: {
      target:  { badge: '🚚', cap: 1, calls: 4, price: 200, caps: [], sizeMin: 1, sizeMax: 7 },
      cold:    { badge: '🚚', cap: 4, calls: 3, price: 210, caps: ['cold'], need: ['cold', 'produce'], sizeMin: 1, sizeMax: 4, specialist: ['fresh', 'produce'] },
      bulk:    { badge: '🚚', cap: 4, calls: 2, price: 160, caps: [], onlyPlain: true, sizeMin: 1, sizeMax: 2 },
      fragile: { badge: '🚚', cap: 3, calls: 3, price: 210, caps: ['fragile'], need: ['fragile'], sizeMin: 1, sizeMax: 4, specialist: 'fragile', marketOnly: true },
      intl:    { badge: '🚚', cap: 2, calls: 3, price: 240, caps: ['customs'], need: ['customs'], sizeMin: 1, sizeMax: 7, specialist: 'intl', marketOnly: true },
      large:   { badge: '🚚', cap: 2, calls: 2, price: 220, caps: ['fragile'], sizeMin: 4, sizeMax: 7, specialist: 'large', marketOnly: true },
      frozen:  { badge: '🚚', cap: 3, calls: 3, price: 230, caps: ['frozen'], need: ['frozen'], sizeMin: 1, sizeMax: 4, specialist: 'frozen', marketOnly: true },
      urgent:  { badge: '⚡', cap: 1, calls: 2, price: 300, caps: ['fragile', 'customs'], sizeMin: 1, sizeMax: 7, marketOnly: true, instant: true },
      // 원형(운송 수단) 업체: 속성이 겹치고 트레이드오프가 다르다
      air:     { badge: '✈', cap: 2, calls: 3, price: 260, caps: ['customs', 'fragile'], sizeMin: 1, sizeMax: 2, marketOnly: true },
      rail:    { badge: '🚆', cap: 5, calls: 2, price: 190, caps: ['fragile'], sizeMin: 1, sizeMax: 7, delay: 1, marketOnly: true },
      sea:     { badge: '🚢', cap: 4, calls: 2, price: 230, caps: ['customs', 'fragile'], sizeMin: 2, sizeMax: 7, delay: 2, marketOnly: true },
    },
    // 신뢰 3단계 전용 능력 문구 — 텍스트는 locales/<lang>.js data.CARRIER_L3 (업체 id → 문구)
    CARRIER_L3: {},

    // 직접 배송: 대기 턴의 부가 행동. 택배 count개까지 골라 직접 배송 — 보상은 그대로, 대신 배송비(costBase + costPerSize×크기)를 낸다. 차량 시설로 확장
    SELF_DELIVERY: { count: 1, sizeMax: 2, costBase: 15, costPerSize: 5 },

    GRADES: {
      normal:  { cap: 0, calls: 0, price: 1.0 },
      trusted: { cap: 1, calls: 1, price: 1.35 },
      expert:  { cap: 2, calls: 1, price: 1.7 },
      master:  { cap: 2, calls: 2, price: 2.1, special: true },
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
    TRUST_EFFECTS: [], // 단계 0~3 문구 — locales/<lang>.js data.TRUST_EFFECTS
    // 단계별 효과 문구 (마켓 카드·호출 모달·도감이 같은 문자열을 읽는다)
    trustEffectText(carrier, lv) { if (lv >= 3 && DATA.CARRIER_L3[carrier]) return DATA.CARRIER_L3[carrier]; return DATA.TRUST_EFFECTS[lv]; },

    ENHANCEMENTS: {
      limit1:  { price: 90, kind: 'limit', value: 1 },
      limit2:  { price: 160, kind: 'limit', value: 2 },
      cap1:    { price: 160, kind: 'cap', value: 1 },
      regular: { price: 180, kind: 'regular' },
      express: { price: 300, kind: 'express' },
      seal:    { price: 90, kind: 'trust', value: 3 },
      record:  { price: 170, kind: 'trust', value: 6 },
      // 속성 특약: 계약 하나에 속성 하나 추가 (계약당 1개, 교체 시 소멸, 특약 처리는 보너스 없음)
      optFragile: { price: 150, kind: 'opt', attr: 'fragile' },
      optCold:    { price: 170, kind: 'opt', attr: 'cold', capDelta: -1 },
      optCustoms: { price: 190, kind: 'opt', attr: 'customs', callsDelta: -1 },
      optFrozen:  { price: 220, kind: 'opt', attr: 'frozen', capDelta: -1, maxSizeMax: 4 },
    },
    FACILITIES: {
      expand1: { price: 160, cap: 8 },
      expand2: { price: 260, cap: 10, requires: 'expand1' },
      expand3: { price: 400, cap: 12, requires: 'expand2' },
      cold1:   { price: 140, cold: 4 },
      cold2:   { price: 240, cold: 6, requires: 'cold1' },
      yard:    { price: 180, xl: 1 },
      freezer1: { price: 200, frozen: 4 },
      vent:    { price: 150, vent: true },
      // 차량: 자체 배송 확장 (마켓 차량 슬롯)
      coldvan: { price: 240, vehicle: true },
      padvan:  { price: 170, vehicle: true },
      bigvan:  { price: 220, vehicle: true },
    },
    PRICE_MULT: { 1: 1.0, 2: 1.1, 3: 1.2, 4: 1.35, 5: 1.5, 6: 1.7 },

    // 스트레스 구간 → 상태 id. 표시 문구는 locales/<lang>.js data.STRESS_NAMES[id]
    STRESS_STATES: [[5, 'stable'], [10, 'caution'], [15, 'danger'], [19, 'crisis'], [20, 'gameover']],
    STRESS_NAMES: {},
  };
  if (typeof module !== 'undefined') module.exports = DATA; else root.DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
