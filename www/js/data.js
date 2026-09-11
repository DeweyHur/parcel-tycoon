// 밸런스 데이터 (기획서 v0.2 전체 범위 + 메타 기획서 v0.1)
// 이름·설명 등 텍스트 필드는 locales/<lang>.js 의 data 섹션에 있고, i18n.js 가 같은 모양으로 덮어쓴다
(function (root) {
  const DATA = {
    TURNS_PER_MONTH: 10,
    START_CASH: 450,
    GAMEOVER_STRESS: 20,
    OPERATING_COST: 120,   // 월 기본 임대(창고·인건비). 여기에 계약 유지비 + 시설 유지비가 더해진다
    OPCOST_CONTRACT: { normal: 10, trusted: 30, expert: 60, master: 100 },   // 계약 등급별 월 유지비 — 프리미엄은 수입도 지출도 크다
    // 배차비·배송비는 후불: 월중에 쌓였다가 월말 정산에서 빠진다. 정산 후 자금이 음수면 단기 차입으로 메우고
    // 다음 정산에 원금+이자를 갚는다. 부채가 한도를 넘으면 부도.
    LOAN: { limit: 400, interest: 0.15 },
    ADD_PRICE_STEP: 1.6,   // 배차 추가를 살 때마다 그 계약의 다음 추가 가격 배율
    OPCOST_INFLATION: 1.08, // 임대는 매달 5%씩 오른다 (12개월차 ×1.7)
    MONTH_RELIEF: { min: 1, amount: 2 }, // 월말 휴식: 스트레스 -2
    OPCOST_PER_PARCEL: 4,  // 인건비: 기준(22개)을 넘는 월 입고 1개당 운영비 — 물량이 늘면 지출도 는다
    OPCOST_BASE_ARRIVALS: 22,
    CONTRACT_SLOTS: 4,
    MARKET_MAX_BUY: 5,
    REFRESH_COSTS: [40, 80, 140, 220],

    WAREHOUSE: { cap: 24, cold: 6, frozen: 4, xl: 1 },

    // 월별 추가 입고 수 (기본 10 + 추가). 7개월차 이후는 무한 모드에서 확장
    EXTRA_ARRIVALS: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 22 }, // 7개월차부터 22 + (m-6)×2
    // 달력: 런은 START_MONTH(3월, 봄)에 시작해 계절대로 흐른다. 달마다 예측 가능한 물량·품목 편차
    START_MONTH: 3,
    SEASON_MODS: {
      1:  { arrivalsMult: 0.85, typeShift: { frozen: 3 } },                      // 1월 비수기
      2:  { arrivalsMult: 0.9,  typeShift: { fragile: 3 } },                     // 2월 선물(파손)
      3:  { arrivalsMult: 1.0,  typeShift: {} },                                 // 3월 새 학기·이사
      4:  { arrivalsMult: 1.0,  typeShift: { produce: 3 } },                     // 4월 봄나물
      5:  { arrivalsMult: 1.05, typeShift: { fragile: 3 } },                     // 5월 가정의 달(선물)
      6:  { arrivalsMult: 1.0,  typeShift: { fresh: 4 } },                       // 6월 초여름 신선
      7:  { arrivalsMult: 0.95, typeShift: { fresh: 6, frozen: 4, normal: -6 } },// 7월 폭염·냉동
      8:  { arrivalsMult: 0.95, typeShift: { fresh: 6, frozen: 4, normal: -6 } },// 8월 폭염·휴가
      9:  { arrivalsMult: 1.05, typeShift: { produce: 6, normal: -3 } },         // 9월 추수·명절
      10: { arrivalsMult: 1.1,  typeShift: { produce: 5, intl: 3 } },            // 10월 수확·직구
      11: { arrivalsMult: 1.3,  typeShift: { intl: 5, fragile: 3 } },            // 11월 블랙프라이데이
      12: { arrivalsMult: 1.4,  typeShift: { fragile: 6, frozen: 3, large: 2 } },// 12월 연말 성수기
    },

    // 월별 택배 종류 비율 (large = 대형화물, 4개월차부터)
    // intl = 🛃 통관 (구 국제운송), frozen = ❆ 냉동 (4개월차부터)
    TYPE_RATIO: {
      // 1~2개월차는 일반 위주 — 특수는 고객 신뢰가 쌓이며 열린다 (docs/BALANCE_DESIGN.md 3장)
      1: { normal: 85, fresh: 0, produce: 5, fragile: 6, intl: 4, large: 0, frozen: 0 },
      2: { normal: 70, fresh: 8, produce: 7, fragile: 9, intl: 6, large: 0, frozen: 0 },
      3: { normal: 50, fresh: 13, produce: 9, fragile: 15, intl: 13, large: 0, frozen: 0 },
      4: { normal: 42, fresh: 13, produce: 9, fragile: 16, intl: 12, large: 5, frozen: 3 },
      5: { normal: 38, fresh: 13, produce: 10, fragile: 17, intl: 13, large: 5, frozen: 4 },
      6: { normal: 33, fresh: 13, produce: 10, fragile: 18, intl: 16, large: 5, frozen: 5 },
    },

    // 크기 등장 비율 (1 소형, 2 중형, 4 대형, 7 초대형)
    SIZE_WEIGHT: { 1: 55, 2: 33, 4: 10, 7: 2 },

    // 속성(attrs): 창고에서 벌어지는 일. cold=❄ 냉장 구역 밖이면 다음 턴 폐기 / fragile=⚠ 능력 없는 업체면 파손 확률 / customs=🛃 통관 대기 중 처리 불가 / frozen=❆ 냉동 구역 밖이면 즉시 폐기
    ATTRS: { cold: { icon: '❄' }, fragile: { icon: '⚠' }, customs: { icon: '🛃' }, frozen: { icon: '❆' }, produce: { icon: '🌾' } },
    // 업체 매칭에 관여하는 속성 (🌾 농산물은 날씨 속성이라 아무 업체나 처리)
    GATING_ATTRS: ['cold', 'fragile', 'customs', 'frozen'],
    PARCEL_TYPES: {
      normal:  { attrs: [],          sizes: [1, 2],  deadline: 4, bonus: 0,  reward: { 1: 25, 2: 35, 4: 50, 7: 80 },  color: 0xc9a06c, css: '#c9a06c' },
      fresh:   { attrs: ['cold'],    sizes: [2, 4],  deadline: 3, bonus: 15, reward: { 1: 40, 2: 60, 4: 90, 7: 130 }, color: 0x5ee0d8, css: '#5ee0d8' },
      produce: { attrs: ['produce'], sizes: [2, 4],  deadline: 4, bonus: 10, reward: { 1: 35, 2: 50, 4: 75, 7: 110 }, color: 0x9acd5a, css: '#9acd5a' },
      fragile: { attrs: ['fragile'], sizes: [2, 4],  deadline: 5, bonus: 20, reward: { 1: 40, 2: 60, 4: 95, 7: 135 }, color: 0xf0a04b, css: '#f0a04b' },
      intl:    { attrs: ['customs'], sizes: [4, 7],  deadline: 5, bonus: 25, reward: { 1: 50, 2: 75, 4: 110, 7: 150 }, color: 0x6c8cff, css: '#6c8cff' },
      large:   { attrs: [],          sizes: [4, 7],  deadline: 6, bonus: 30, reward: { 1: 45, 2: 65, 4: 100, 7: 140 }, color: 0xb08bd8, css: '#b08bd8' },
      frozen:  { attrs: ['frozen'],  sizes: [2, 4],  deadline: 5, bonus: 25, reward: { 1: 45, 2: 70, 4: 105, 7: 145 }, color: 0x9ad7ff, css: '#9ad7ff' },
    },
    FRESH_TURNS: 3,
    // 신선: 냉장 구역 밖에서 WARM_LIMIT턴 지나면 폐기 (폭염 경보 턴은 즉시). 냉동: 냉동 구역 밖이면 즉시
    WARM_LIMIT: 1,
    // 통관: 입고 후 대기 턴, 지연 이벤트 확률(+1턴). 통관 대행(caps에 customs) 업체만 대기 중 처리 가능
    CUSTOMS_WAIT: 2, CUSTOMS_DELAY_PROB: 0.2,
    // 파손: ⚠ 능력 없는 업체로 보낼 때 파손 확률
    BREAK_PROB: 0.25,
    // 반송: 기한 초과 후 유예 턴. 유예가 끝나면 반송(폐기)
    RETURN_GRACE: 2,
    // 도난: 야외 적재(창고 초과분) 택배당 확률, 초과 부피 구간별
    THEFT_PROB: [[2, 0.15], [5, 0.30], [Infinity, 0.50]],

    // 업체 능력: caps = 안전하게 다루는 속성. need = 이 속성 중 하나가 있는 택배만 받음(전문). onlyPlain = 속성 없는 택배만.
    // 매칭: 크기 범위 && need && (❆는 caps 필수) && (🛃 대기 중이면 caps 필수). ❄·⚠는 caps 없어도 받되 ⚠는 파손 확률.
    // specialist = 이 종류를 처리하면 특수 운송 보너스. delay = 보상이 N턴 뒤 입금. badge = 운송 수단(매칭 무관)
    // 업체 = 배차 계약 (docs/BALANCE_DESIGN.md 1장): cap = 차량 한 대의 부피(칸), fee = 대당 배차비(호출 즉시 차감), trucks = 월 배차 한도(대), price = 계약가
    // caps = 안전하게 다루는 속성. need = 이 속성 중 하나가 있는 택배만. onlyPlain = 속성 없는 택배만. specialist = 특수 운송 보너스 종류. delay = 입금 지연 턴. badge = 운송 수단
    CARRIERS: {
      bulk:    { badge: '🚚', cap: 6,  fee: 35, trucks: 5, price: 60,  caps: [], onlyPlain: true, sizeMin: 1, sizeMax: 2 },
      cold:    { badge: '🚚', cap: 5,  fee: 48, trucks: 3, price: 90, caps: ['cold'], need: ['cold', 'produce'], sizeMin: 1, sizeMax: 4, specialist: ['fresh', 'produce'] },
      frozen:  { badge: '🚚', cap: 4,  fee: 55, trucks: 3, price: 100, caps: ['frozen'], need: ['frozen'], sizeMin: 1, sizeMax: 4, specialist: 'frozen', marketOnly: true },
      fragile: { badge: '🚚', cap: 4,  fee: 48, trucks: 3, price: 90, caps: ['fragile'], need: ['fragile'], sizeMin: 1, sizeMax: 4, specialist: 'fragile' },
      intl:    { badge: '🚚', cap: 8,  fee: 70, trucks: 3, price: 110, caps: ['customs'], need: ['customs'], sizeMin: 1, sizeMax: 7, specialist: 'intl', marketOnly: true },
      large:   { badge: '🚚', cap: 10, fee: 68, trucks: 3, price: 100, caps: ['fragile'], sizeMin: 4, sizeMax: 7, specialist: 'large', marketOnly: true },
      // 원형(운송 수단) 업체: 속성이 겹치고 트레이드오프가 다르다
      air:     { badge: '✈', cap: 4,  fee: 83, trucks: 3, price: 120, caps: ['customs', 'fragile'], sizeMin: 1, sizeMax: 2, marketOnly: true },
      rail:    { badge: '🚆', cap: 16, fee: 95, trucks: 2, price: 80, caps: ['fragile'], sizeMin: 1, sizeMax: 7, delay: 1, marketOnly: true },
      sea:     { badge: '🚢', cap: 14, fee: 83, trucks: 2, price: 90, caps: ['customs', 'fragile'], sizeMin: 2, sizeMax: 7, delay: 2, marketOnly: true },
    },
    // 신뢰도 특성 (2장): 업체마다 1~3단계 효과. 문구는 locales data.TRUST_PERKS[carrier] = [t1, t2, t3]
    // 키: simul 동시 대수 / feeMult 배차비 배율 / cap 용량 +칸 / rewardDelta{type} / bonusDelta{type} / freezeOnCall / coldZone·frozenZone 구역 +칸 / customsDelta 통관 대기 / noCustomsDelay / xlDelta 초대형 점유 -1 / sizeMax / customsBonus / delay / trucks
    TRUST_PERKS: {
      bulk:    [{ simul: 2 }, { feeMult: 0.7 }, { rewardDelta: { normal: 5 } }],
      cold:    [{ cap: 2 }, { freezeOnCall: true }, { coldZone: 2 }],
      frozen:  [{ feeMult: 0.8 }, { cap: 2 }, { frozenZone: 2 }],
      fragile: [{ feeMult: 0.8 }, { simul: 2 }, { bonusDelta: { fragile: 15 } }],
      intl:    [{ customsDelta: -1 }, { cap: 4 }, { noCustomsDelay: true }],
      large:   [{ xlDelta: 1 }, { simul: 2 }, { bonusDelta: { large: 10 } }],
      air:     [{ sizeMax: 4 }, { feeMult: 0.7 }, { customsBonus: 20 }],
      rail:    [{ delay: 0 }, { trucks: 1 }, { cap: 6 }],
      sea:     [{ delay: 1 }, { cap: 6 }, { delay: 0 }],
    },
    TRUST_PERK_TEXT: {}, // locales data.TRUST_PERK_TEXT[carrier] = [t1, t2, t3]

    CARRIER_L3: {},

    // 직접 배송: 대기 턴의 부가 행동. 택배 count개까지 골라 직접 배송 — 보상은 그대로, 대신 배송비(costBase + costPerSize×크기)를 낸다. 차량 시설로 확장
    SELF_DELIVERY: { count: 1, sizeMax: 2, costBase: 15, costPerSize: 5 },

    GRADES: {
      // 등급 = 프리미엄 계약 (신뢰도와 무관). cap +칸, calls +대, fee 배율, trust 시작 xp, price 배율
      normal:  { cap: 0, calls: 0, fee: 1.0,  trust: 0,  price: 1.0 },
      trusted: { cap: 2, calls: 1, fee: 0.85, trust: 3,  price: 2.5 },
      expert:  { cap: 4, calls: 2, fee: 0.7,  trust: 8,  price: 4.5 },
      master:  { cap: 6, calls: 3, fee: 0.6,  trust: 15, price: 8.0, special: true },
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
    TRUST_EFFECTS: [], // 단계 0 문구 — locales data.TRUST_EFFECTS[0]
    // 단계별 효과 문구 (마켓 카드·호출 모달·도감이 같은 문자열을 읽는다)
    trustEffectText(carrier, lv) { if (lv >= 1 && DATA.TRUST_PERK_TEXT[carrier]) return DATA.TRUST_PERK_TEXT[carrier][lv - 1]; return DATA.TRUST_EFFECTS[0]; },

    ENHANCEMENTS: {
      // 차량 언어: limit = 배차 한도 +대, cap = 적재 보강 +칸(계약당 3회), regular = 월 첫 배차 무료, express = 동시 대수 +1
      limit1:  { price: 90, kind: 'limit', value: 1 },
      limit2:  { price: 160, kind: 'limit', value: 2 },
      cap1:    { price: 140, kind: 'cap', value: 1 },
      regular: { price: 180, kind: 'regular' },
      express: { price: 260, kind: 'express' },
      seal:    { price: 90, kind: 'trust', value: 3 },
      record:  { price: 170, kind: 'trust', value: 6 },
      // 속성 특약: 계약 하나에 속성 하나 추가 (계약당 1개, 교체 시 소멸, 특약 처리는 보너스 없음)
      optFragile: { price: 150, kind: 'opt', attr: 'fragile' },
      optCold:    { price: 170, kind: 'opt', attr: 'cold', capDelta: -1 },
      optCustoms: { price: 190, kind: 'opt', attr: 'customs', callsDelta: -1 },
      optFrozen:  { price: 220, kind: 'opt', attr: 'frozen', capDelta: -1, maxSizeMax: 4 },
    },
    FACILITIES: {
      expand1: { price: 160, upkeep: 15, cap: 8 },
      expand2: { price: 320, upkeep: 35, cap: 10, requires: 'expand1' },
      expand3: { price: 640, upkeep: 70, cap: 12, requires: 'expand2' },
      cold1:   { price: 140, upkeep: 15, cold: 4 },
      cold2:   { price: 300, upkeep: 35, cold: 6, requires: 'cold1' },
      yard:    { price: 180, upkeep: 10, xl: 1 },
      freezer1: { price: 220, upkeep: 25, frozen: 4 },
      vent:    { price: 150, upkeep: 10, vent: true },
      // 차량: 자체 배송 확장 (마켓 차량 슬롯)
      coldvan: { price: 240, upkeep: 10, vehicle: true },
      padvan:  { price: 170, upkeep: 10, vehicle: true },
      bigvan:  { price: 220, upkeep: 10, vehicle: true },
      driver:  { price: 200, upkeep: 25, vehicle: true, driver: true },
    },
    PRICE_MULT: { 1: 1.0, 2: 1.1, 3: 1.2, 4: 1.35, 5: 1.5, 6: 1.7, 7: 2.0, 8: 2.4, 9: 2.8, 10: 3.3, 11: 3.8, 12: 4.4 },

    // 스트레스 구간 → 상태 id. 표시 문구는 locales/<lang>.js data.STRESS_NAMES[id]
    STRESS_STATES: [[5, 'stable'], [10, 'caution'], [15, 'danger'], [19, 'crisis'], [20, 'gameover']],
    STRESS_NAMES: {},
  };
  if (typeof module !== 'undefined') module.exports = DATA; else root.DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
