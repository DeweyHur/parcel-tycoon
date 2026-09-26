// 밸런스 데이터 (기획서 v0.2 전체 범위 + 메타 기획서 v0.1)
// 이름·설명 등 텍스트 필드는 locales/<lang>.js 의 data 섹션에 있고, i18n.js 가 같은 모양으로 덮어쓴다
(function (root) {
  const DATA = {
    // 시간 단위: 1턴 = 하루(영업일). 월~토 엿새 일하고 일요일은 휴무 — 택배는 토요일엔 돌고 일요일엔 안 돈다.
    // 달력은 진짜다: 3월 1일부터 그 달의 말일까지, 달마다 길이가 다르다. 정산은 반월(1~15일 / 16~말일) 두 번.
    // 요일은 게임 달력으로 고정한다 — 런 첫날(시작 달 1일)이 언제나 월요일. 그래야 연도에 따라 밸런스가 흔들리지 않는다.
    TURNS_PER_MONTH: 13,   // 한 사이클의 '대략' 영업일 수 (실제는 Game.turns() 로 12~14). UI 기본값·폴백용
    DAYS_PER_TURN: 1,
    MONTH_DAYS: { 1: 31, 2: 28, 3: 31, 4: 30, 5: 31, 6: 30, 7: 31, 8: 31, 9: 30, 10: 31, 11: 30, 12: 31 },
    HALF_SPLIT: 15,        // 전반 = 1~15일, 후반 = 16~말일
    // 주말 선택지: 하나만 고른다
    WEEKEND_CHOICES: [
      { id: 'rest' },                                    // 휴식: 아무 일 없음 (평판도 안 오른다 — 쉬었다고 소문이 나진 않는다)
      { id: 'overtime', stress: 1, self: 2 },             // 야근: 다음 영업일 직접 배송 +2
      { id: 'parttime', cost: 50, noTheft: true, needOutdoor: true }, // 알바: 야적 지킴 — 이번 주말 도난 없음
    ],
    START_CASH: 450,
    START_REP: 0.5,        // 자유 런은 1단계 상한의 이만큼에서 시작한다 — 가득 찬 막대로 시작하면 채울 게 없고, 첫 정산에 저절로 등급이 오른다
    GAMEOVER_STRESS: 20,   // (구) 스트레스 한계 → 지금은 1단계 평판 상한. rules.gameoverStress 로 난이도가 얹힌다
    // 평판: 키우는 지표. 0 이 되면 아무도 맡기지 않는다 = 런 종료.
    // 사고(반송·도난·파손·폐기·창고 초과)는 깎고, 꽉 채운 호출·무사고 정산·고객 신뢰 상승은 올린다.
    // 상한까지 채운 채로 정산을 넘기면 등급이 오르고 상한도 오른다 — 그게 '키우는 맛'이다.
    // 등급은 난이도 스케일러이기도 하다: 소문이 나면 물량이 늘고(arrivals), 규모가 커져 운영비도 는다(opCost).
    // 돈이 느는 만큼 압박도 같이 늘어야 후반이 헐거워지지 않는다. unlock = 이 등급부터 들어오기 시작하는 품목.
    REP_TIERS: [
      { id: 'unknown', cap: 20, arrivals: 1.0,  opCost: 1.0,  unlock: [] },               // 무명 — 동네 사람들만 안다 (대형·통관·냉동 없음: 시작 계약으로 다 실을 수 있어야 한다)
      { id: 'local',   cap: 35, arrivals: 1.15, opCost: 1.10, unlock: ['intl', 'large'] }, // 동네 소문 — 🛃 통관·대형이 들어오기 시작
      { id: 'ward',    cap: 50, arrivals: 1.35, opCost: 1.25, unlock: ['intl', 'large', 'frozen'] },// 구내 유명 — 🧊 냉동까지
      { id: 'city',    cap: 70, arrivals: 1.60, opCost: 1.45, unlock: ['intl', 'large', 'frozen'] },// 시내 최고
    ],
    CYCLES_PER_MONTH: 2,   // 한 사이클 = 2주. 달력 한 달 = 전반·후반 두 사이클
    // 평판도 신뢰와 같은 축 — 기한보다 얼마나 일찍 보냈나. 호출마다 택배 점수 합(+2/+1/0/−2)을 earlyDiv 로 나눠 ±earlyMax 안에서 (차 꽉 채우기 +1 은 뺐다)
    REP_GAIN: { cleanMonth: 2, custLevel: 2, earlyDiv: 5, earlyMax: 3 },
    OPERATING_COST: 120,   // 월 기본 임대(창고·인건비). 여기에 계약 유지비 + 시설 유지비가 더해진다
    OPCOST_CONTRACT: { normal: 10, trusted: 30, expert: 60, master: 100 },   // 계약 등급별 월 유지비 — 프리미엄은 수입도 지출도 크다
    // 배차비·배송비는 후불: 월중에 쌓였다가 월말 정산에서 빠진다. 정산 후 자금이 음수면 단기 차입으로 메우고
    // 다음 정산에 원금+이자를 갚는다. 부채가 한도를 넘으면 부도.
    LOAN: { limit: 400, interest: 0.15 },
    OPCOST_INFLATION: 1.08, // 임대는 매달 5%씩 오른다 (12개월차 ×1.7)
    MONTH_RELIEF: { min: 1, amount: 2 }, // 월말 휴식: 스트레스 -2
    OPCOST_PER_PARCEL: 4,  // 인건비: 기준(22개)을 넘는 월 입고 1개당 운영비 — 물량이 늘면 지출도 는다
    OPCOST_BASE_ARRIVALS: 22,
    CONTRACT_SLOTS: 4,
    MARKET_MAX_BUY: 0,     // 0 = 제한 없음 (한 번에 살 수 있는 개수를 세지 않는다)
    PREPAY_RATE: 0.5,      // 재계약 = 대당 기본 배차비의 절반 (= 만차 수입의 25%)
    // 잠시 꺼 둔 시스템 — 화면이 이미 복잡하다. 캠페인·자유 런 모두에서 없는 것으로 친다(되살리려면 여기서 빼면 된다)
    DISABLED_FEATURES: ['chain', 'rush', 'mission', 'weekendChoice'],   // 일요일 선택지(야근·알바)는 클릭만 늘려서 꺼 둔다 — 일요일은 그냥 쉰다      // 재계약 선금: 배차비의 절반
    REFRESH_COSTS: [40, 80, 140, 220],

    WAREHOUSE: { cap: 24, cold: 6, frozen: 4, xl: 1 },

    // 상시 성장 투자. 초반에는 유기적으로 들어오는 물량만 받고, 홍보에 투자한 만큼 다음 영업일부터 입고가 늘어난다.
    GROWTH: {
      organicArrivals: 6,
      // 홍보는 상시 물량이 아니라 '캠페인'으로 나간다 — 레벨은 한 번 열 때의 크기다
      marketing: { costs: [60, 110, 180, 280, 420, 620], parcels: 3, campaign: { days: 3, per: 6, cost: 50 } },
      fleet: { costs: [90, 150, 240, 360, 520, 720], calls: 1 },
      warehouse: { costs: [80, 140, 220, 340, 500, 700], cap: 6 },
      automation: { costs: [140, 240, 380, 560], feeCut: 0.04, laborCut: 0.08, unlock: { fleet: 2 } },
      branding: { costs: [170, 290, 460, 680], premiumChance: 0.04, reward: 0.03, unlock: { marketing: 2, automation: 1 } },
      coldchain: { costs: [180, 320, 520, 760], cold: 2, frozen: 1, unlock: { warehouse: 2 } },
    },

    // 광고 매체 — 마켓에서 계약·강화하고, 플레이 중 📣 로 가진 매체 하나를 골라 집행한다(보름에 한 번).
    // 집행하면 동네에 이름이 알려져 평판이 오른다(rep). 레벨 = 보름에 집행할 수 있는 횟수(배차처럼 파란 눈금). 한 번의 건수·집행비는 매체마다 고정. mix: 그 매체가 끌어오는 종류 가중(월별 비율에 곱한다 — 평판 문은 그대로)
    // 전단지는 처음부터 가진다. 버스·옥외는 대형을 더 부르지만 대형은 평판(동네 소문)이 열어야 온다
    AD_MEDIA: {
      flyer: { icon: '📰', rep: 1, price: 0,   per: 4,  cost: 40,  days: 2, max: 4, upPrice: 70,  mix: { normal: 2 } },
      sns:   { icon: '📱', rep: 1, price: 120, per: 6,  cost: 70,  days: 2, max: 4, upPrice: 100, mix: { fresh: 2.5, produce: 2 } },
      radio: { icon: '📻', rep: 2, price: 160, per: 8,  cost: 90,  days: 3, max: 4, upPrice: 130, mix: {} },
      bus:   { icon: '🚌', rep: 2, price: 240, per: 12, cost: 140, days: 4, max: 4, upPrice: 180, mix: { large: 3, fragile: 1.5 } },
    },
    // 창고 구역: 바닥은 아무 크기나, 랙·복층은 올릴 수 있는 크기에 한도가 있다
    AREAS: { rack: { maxSize: 2 }, mezz: { maxSize: 4 } },
    // 성장 투자(차량·자동화·브랜드)는 마켓에서만 판다 — 한 마켓에 이만큼. 창고·저온은 시설(확장·냉장 증설)로 일원화
    GROWTH_OFFERS: 2,

    // 창고를 채운 뒤 여러 대를 한 번에 빼는 폭발형 출고 보너스.
    RUSH: { chargeAt: 0.45, readyAt: 0.72, criticalAt: 0.95, bonus: 1.35, extraTrucks: 2, clearShare: 0.55, minFill: 0.72, minTrucks: 2, rep: 2 },
    LOAD_CHAIN: { minFill: 0.8, step: 0.08, max: 4, repAt: 3, rep: 1 },
    // A는 진짜 도전 목표다 — 시뮬 봇(greedy) 기준으로도 달에 8% 정도만 A를 딴다. B가 "잘했다"의 기본선.
    MISSION: { ratios: [0, 0.45, 0.95, 2.3], grades: ['D', 'C', 'B', 'A'], bonuses: [0, 15, 35, 90] },

    // 월별 추가 입고 수 (기본 10 + 추가). 7개월차 이후는 무한 모드에서 확장
    EXTRA_ARRIVALS: { 1: 12, 2: 14, 3: 16, 4: 18, 5: 20, 6: 22 }, // 7개월차부터 22 + (m-6)×2
    // 위 표에 곱하는 사이클당 배수. 투자 개편 때 0.25 로 눌러 놓았더니 자유 런 첫 보름이 10개(15칸)뿐이었다 — 캠페인 1장(51칸)보다도 적다.
    // 1.0 이면 첫 보름 22개(36칸), 한 해 끝 무렵 90칸+평판 배수. 홍보 캠페인은 여기에 얹는 한 방이다 (부록 AU)
    ARRIVALS_SCALE: 2.0,
    // 자유 런의 계약 배차 한도 배수. 물량 ×2 때 1.5 로 올렸다가 되돌렸다 — 시작 계약이 셋(일반을 받는 차도 여럿)이라 첫 달엔 필요 없다 (유저)
    CALLS_SCALE: 1,
    // 달력: 런은 START_MONTH(3월, 봄)에 시작해 계절대로 흐른다. 달별 편차·이벤트는 META.CALENDARS[나라] (docs/STORY_TUTORIAL_DESIGN.md 5장)
    START_MONTH: 3,

    // 월별 택배 종류 비율 (large = 대형화물, 4개월차부터)
    // intl = 🛃 통관 (구 국제운송), frozen = 🧊 냉동 (4개월차부터)
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

    // 속성(attrs): 창고에서 벌어지는 일. cold=❄ 냉장 구역 밖이면 다음 턴 폐기 / fragile=⚠ 능력 없는 업체면 파손 확률 / customs=🛃 통관 대기 중 처리 불가 / frozen=🧊 냉동 구역 밖이면 즉시 폐기
    ATTRS: { cold: { icon: '❄' }, fragile: { icon: '⚠' }, customs: { icon: '🛃' }, frozen: { icon: '🧊' }, produce: { icon: '🌾' } },
    // 업체 매칭에 관여하는 속성 (🌾 농산물은 날씨 속성이라 아무 업체나 처리)
    GATING_ATTRS: ['cold', 'fragile', 'customs', 'frozen'],
    // 크기: 일반·파손·신선·냉동은 소형(1)부터 — 깨지는 것·신선·냉동은 보통 작다. 농산물은 2부터, 통관·대형은 4부터.
    // 특수 소형의 보상은 낮다(전문 보너스가 개당 붙어 칸당 수지가 크기 2와 같아지도록 22/20/22). sizeWeight 는 그 종류만의 크기 가중치(없으면 SIZE_WEIGHT)
    PARCEL_TYPES: {
      normal:  { attrs: [],          sizes: [1, 2],  deadline: 4, bonus: 0,  reward: { 1: 25, 2: 35, 4: 50, 7: 80 },  color: 0xc9a06c, css: '#c9a06c' },
      fresh:   { attrs: ['cold'],    sizes: [1, 2, 4],  deadline: 3, bonus: 15, reward: { 1: 22, 2: 60, 4: 90, 7: 130 }, sizeWeight: { 1: 30 }, color: 0x5ee0d8, css: '#5ee0d8' },
      produce: { attrs: ['produce'], sizes: [2, 4],  deadline: 4, bonus: 10, reward: { 1: 35, 2: 50, 4: 75, 7: 110 }, color: 0x9acd5a, css: '#9acd5a' },
      fragile: { attrs: ['fragile'], sizes: [1, 2, 4],  deadline: 5, bonus: 20, reward: { 1: 20, 2: 60, 4: 95, 7: 135 }, sizeWeight: { 1: 30 }, color: 0xf0a04b, css: '#f0a04b' },
      intl:    { attrs: ['customs'], sizes: [4, 7],  deadline: 5, bonus: 25, reward: { 1: 50, 2: 75, 4: 110, 7: 150 }, color: 0x6c8cff, css: '#6c8cff' },
      large:   { attrs: [],          sizes: [4, 7],  deadline: 6, bonus: 30, reward: { 1: 45, 2: 65, 4: 100, 7: 140 }, color: 0xb08bd8, css: '#b08bd8' },
      frozen:  { attrs: ['frozen'],  sizes: [1, 2, 4],  deadline: 5, bonus: 25, reward: { 1: 22, 2: 70, 4: 105, 7: 145 }, sizeWeight: { 1: 30 }, color: 0x9ad7ff, css: '#9ad7ff' },
    },
    // ⚡ 긴급 화물(새벽배송): 일반 택배에 붙는 표시. 기한은 들어온 날 하루(deadline 1) — 그날 내보내면 보상 ×2,
    // 놓치면 벌점 없이 ×½, 반송 유예가 끝나면 여느 택배처럼 반송(벌점·배상). 자유 런에서만. chance 는 일반 택배 중 비율
    RUSH_CARGO: { chance: 0.12, deadline: 1, sameDay: 2, later: 0.5 },
    FRESH_TURNS: 3,
    // 신선: 냉장 구역 밖에서 WARM_LIMIT턴 지나면 폐기 (폭염 경보 턴은 즉시). 냉동: 냉동 구역 밖이면 즉시
    WARM_LIMIT: 1,
    // 통관: 입고 후 대기 턴, 지연 이벤트 확률(+1턴). 통관 대행(caps에 customs) 업체만 대기 중 처리 가능
    CUSTOMS_WAIT: 2, CUSTOMS_DELAY_PROB: 0.2,
    // 파손: ⚠ 능력 없는 업체로 보낼 때 파손 확률
    BREAK_PROB: 0.25,
    // 반송: 기한 초과 후 유예 턴. 유예가 끝나면 반송(폐기)
    RETURN_GRACE: 2,
    // 장이 넘어갈 때 물려받은 계약의 배차 바닥값 (maxCalls 대비). 장이 바뀌는 사이에 새로 끊어 둔 것으로 친다
    CARRY_CALLS_FLOOR: 0.6,
    // 도난: 야외 적재(창고 초과분) 택배당 확률, 초과 부피 구간별
    THEFT_PROB: [[2, 0.15], [5, 0.30], [Infinity, 0.50]],

    // 업체 능력: caps = 안전하게 다루는 속성. need = 이 속성 중 하나가 있는 택배만 받음(전문). onlyPlain = 속성 없는 택배만.
    // 매칭: 크기 범위 && need && (🧊는 caps 필수) && (🛃 대기 중이면 caps 필수). ❄·⚠는 caps 없어도 받되 ⚠는 파손 확률.
    // specialist = 이 종류를 처리하면 특수 운송 보너스. delay = 보상이 N턴 뒤 입금. badge = 운송 수단(매칭 무관)
    // 업체 = 배차 계약 (docs/BALANCE_DESIGN.md 1장): cap = 차량 한 대의 부피(칸), fee = 대당 배차비(호출 즉시 차감), trucks = 월 배차 한도(대), price = 계약가
    // caps = 안전하게 다루는 속성. need = 이 속성 중 하나가 있는 택배만. onlyPlain = 속성 없는 택배만. specialist = 특수 운송 보너스 종류. delay = 입금 지연 턴. badge = 운송 수단
    // ----- 운송센터 (docs/STORY_TUTORIAL_DESIGN.md 부록 D) -----
    // 계열(family) = 하는 일(대량·냉장·냉동·파손·통관·대형·항공·철도·해상). 계열 기본값은 FAMILIES, 센터는 그 위에 tier별 보정.
    // 상위 tier는 "같은 센터 업그레이드"가 아니라 **다른 센터와 신규 계약**이다 — 배차가 많고, 차가 크고, 배차비가 싸고, 복합 능력(extraCaps)이 붙는다. 신뢰도는 센터별.
    // trucks = 배차 풀(소모품: 월초 리셋 없음, 마켓에서 '가득 충전'만). refill = 가득 충전 가격. rep = 담당자(스토리 캐릭터) id
    // 배차비는 손으로 정한 값이 아니라 규칙이다: **차를 절반 채우면 똔똔**.
    // fee ≈ FILL_BREAKEVEN × cap × (그 계열이 싣는 종류들의 칸당 보상 평균, 전문 보너스 포함).
    // 그래서 절반도 못 채우고 부르면 손해고, 이익은 그 위에서만 난다 — "꽉 채워 보내라"가 문구가 아니라 수지가 된다.
    // 80%는 그보다 위, '적재 효율' 보너스(업체 신뢰 +1 · 평판 +1)가 붙는 선이다 — 본전 선과 보너스 선을 갈라 놓았다.
    // 보상표(PARCEL_TYPES.reward)나 용량(cap)을 바꾸면 fee 도 같이 바꿔야 한다. test/unit.js 가 검사한다.
    FILL_BREAKEVEN: 0.5,
    FAMILIES: {
      bulk:    { badge: '🚚', cap: 6,  fee: 64, trucks: 7, price: 60,  caps: [], onlyPlain: true, sizeMin: 1, sizeMax: 2, rep: 'yeo' },
      cold:    { badge: '🚚', cap: 4,  fee: 58, trucks: 4, price: 90, caps: ['cold'], need: ['cold', 'produce'], sizeMin: 1, sizeMax: 4, specialist: ['fresh', 'produce'], rep: 'kang' },
      frozen:  { badge: '🚚', cap: 4,  fee: 80, trucks: 4, price: 100, caps: ['frozen'], need: ['frozen'], sizeMin: 1, sizeMax: 4, specialist: 'frozen', marketOnly: true, rep: 'kang' },
      fragile: { badge: '🚚', cap: 4,  fee: 69, trucks: 4, price: 90, caps: ['fragile'], need: ['fragile'], sizeMin: 1, sizeMax: 4, specialist: 'fragile', rep: 'ahn' },   // 담당: 안 대리(뽁뽁이 롤) — 살살 택배에서 옮겨 다닌다
      intl:    { badge: '🚚', cap: 8,  fee: 118, trucks: 3, price: 110, caps: ['customs'], need: null, sizeMin: 1, sizeMax: 7, specialist: 'intl', marketOnly: true },
      large:   { badge: '🚚', cap: 8,  fee: 124, trucks: 3, price: 100, caps: ['fragile'], sizeMin: 4, sizeMax: 7, specialist: 'large', marketOnly: true, rep: 'noh' },
      // 항공·철도·해상은 우리가 비행기·배를 부르는 게 아니다 — 창고에서 공항·화물역·항만까지 실어다 주는 **포워더**다.
      // 그래서 무역 고객(수입상·명품관처럼 🛃 통관 짐을 맡기는 화주)이 있을 때만 마켓에 온다 (needsTrade)
      air:     { badge: '✈', cap: 4,  fee: 48, trucks: 3, price: 120, caps: ['customs', 'fragile'], sizeMin: 1, sizeMax: 2, marketOnly: true, needsTrade: true },
      rail:    { badge: '🚆', cap: 16, fee: 194, trucks: 2, price: 80, caps: ['fragile'], sizeMin: 1, sizeMax: 7, delay: 1, marketOnly: true, rep: 'noh', needsTrade: true },
      sea:     { badge: '🚢', cap: 14, fee: 165, trucks: 2, price: 90, caps: ['customs', 'fragile'], sizeMin: 2, sizeMax: 7, delay: 2, marketOnly: true, needsTrade: true },
    },
    // tier 공통 보정: 배차 +, 용량 +, 배차비 배율, 계약가 배율. 상위 센터는 차가 크고 많은 대신 배차비가 확실히 비싸다(유저: "업그레이드에서 배차비는 항상 올라야 해, 유의미하게"). 센터가 개별 값을 주면 그것이 우선
    TIERS: [
      { grade: 'normal',  trucks: 0, cap: 0, fee: 1.0,  price: 1.0 },
      { grade: 'trusted', trucks: 2, cap: 1, fee: 1.2,  price: 2.2 },
      { grade: 'expert',  trucks: 4, cap: 2, fee: 1.4,  price: 4.0 },
      { grade: 'master',  trucks: 6, cap: 3, fee: 1.6,  price: 7.0 },
    ],
    // 센터 목록. 이름·설명은 locales data.CARRIERS[id]. extraCaps = 복합 능력(그 센터 차는 이 속성도 안전하게), sizeMax/delay 개별 보정
    CENTERS: {
      // 대량 (일반 특화의 축)
      bulk0:   { family: 'bulk', tier: 0 },
      bulk1:   { family: 'bulk', tier: 1 },
      bulk2:   { family: 'bulk', tier: 2, extraCaps: ['fragile'] },            // 완충 탑차: 파손도 안전
      bulk3:   { family: 'bulk', tier: 3, extraCaps: ['fragile'] },
      // 냉장
      cold0:   { family: 'cold', tier: 0 },
      cold1:   { family: 'cold', tier: 1 },
      cold2:   { family: 'cold', tier: 2, extraCaps: ['frozen'] },             // 냉동칸 딸린 냉장차
      cold3:   { family: 'cold', tier: 3, extraCaps: ['frozen'], sizeMax: 7 },
      // 냉동
      frozen0: { family: 'frozen', tier: 0 },
      frozen1: { family: 'frozen', tier: 1 },
      frozen2: { family: 'frozen', tier: 2, extraCaps: ['cold'] },
      // 파손
      // 파손 계열은 ⚠ 전문이지만 일반·🌾 농산물도 싣는다(need 없음) — 냉장·통관 설비가 없어 ❄·🧊·🛃 은 못 싣는다(allowAttrs)
      fragile0: { family: 'fragile', tier: 0, need: null, allowAttrs: ['fragile'] },
      // 캠페인 2장에서 붙는 작은 완충 밴 — ⚠ 도 안전하게, 일반도 받는다(need 없음). 차가 4칸이라
      // 일반만 실으면 배차비와 똔똔이고, ⚠ 를 실어야 남는다. 마켓·랜덤 시작에는 안 나온다(campaign).
      pack0: { family: 'fragile', tier: 0, need: null, campaign: true, rep: 'ahn', allowAttrs: ['fragile'] },   // 냉장 설비가 없다 — ❄·🧊·🛃 는 못 싣는다
      fragile1: { family: 'fragile', tier: 1, need: null, allowAttrs: ['fragile'] },
      fragile2: { family: 'fragile', tier: 2, sizeMax: 7, need: null, allowAttrs: ['fragile'] },                    // 대형 파손까지
      fragile3: { family: 'fragile', tier: 3, sizeMax: 7, extraCaps: ['cold'], need: null, allowAttrs: ['fragile', 'cold'] },
      // 통관
      // 통관 대행도 통관 짐만 싣는 게 아니다 — 통관 끝난 짐이든 일반이든 싣고, 대기 중인 🛃 를 바로 통관·발송하는 게 능력. 냉장 설비는 없다.
      // 용량은 4칸 단위(8 → 8 → 12): 🛃 는 4칸으로 오니 11칸이면 늘 3칸이 논다. 등급은 배차·배차비로 오르고 마지막에 한 칸 더(4칸 하나)
      intl0:   { family: 'intl', tier: 0, allowAttrs: ['customs', 'fragile'] },
      intl1:   { family: 'intl', tier: 1, cap: 8, allowAttrs: ['customs', 'fragile'] },
      intl2:   { family: 'intl', tier: 2, cap: 12, extraCaps: ['fragile'], allowAttrs: ['customs', 'fragile'] },
      // 대형
      // 대형도 4칸 단위(8 → 8 → 12) — 대형 택배는 4칸(가끔 7칸)이라 10·11칸 차는 늘 2~3칸이 비었다 (유저: "8칸을 기본으로")
      large0:  { family: 'large', tier: 0 },
      large1:  { family: 'large', tier: 1, cap: 8 },
      large2:  { family: 'large', tier: 2, cap: 12, extraCaps: ['cold'] },              // 냉장 대형차
      // 원형(운송 수단)
      air0:    { family: 'air', tier: 0 },
      air1:    { family: 'air', tier: 1, sizeMax: 4 },
      rail0:   { family: 'rail', tier: 0 },
      rail1:   { family: 'rail', tier: 1, delay: 0 },
      sea0:    { family: 'sea', tier: 0 },
      sea1:    { family: 'sea', tier: 1, delay: 1 },
    },
    // CARRIERS = 센터별 완성 스탯 (계열 + tier + 개별). 게임 코드는 이 표만 본다. 키 = 센터 id, family/tier/grade 필드로 계열·등급을 안다
    CARRIERS: {},
    // 신뢰도 특성 (2장): 업체마다 1~3단계 효과. 문구는 locales data.TRUST_PERKS[carrier] = [t1, t2, t3]
    // 키: feeMult 배차비 배율 / cap 용량 +칸 / rewardDelta{type} / bonusDelta{type} / freezeOnCall / coldZone·frozenZone 구역 +칸 / customsDelta 통관 대기 / noCustomsDelay / xlDelta 초대형 점유 -1 / sizeMax / customsBonus / delay / trucks
    TRUST_PERKS: {
      bulk:    [{ trucks: 1 }, { feeMult: 0.7 }, { rewardDelta: { normal: 5 } }],
      cold:    [{ cap: 2 }, { freezeOnCall: true }, { coldZone: 2 }],
      frozen:  [{ feeMult: 0.8 }, { cap: 2 }, { frozenZone: 2 }],
      fragile: [{ feeMult: 0.8 }, { cap: 1 }, { bonusDelta: { fragile: 15 } }],
      intl:    [{ customsDelta: -1 }, { cap: 4 }, { noCustomsDelay: true }],
      large:   [{ xlDelta: 1 }, { trucks: 1 }, { bonusDelta: { large: 10 } }],
      air:     [{ sizeMax: 4 }, { feeMult: 0.7 }, { customsBonus: 20 }],
      rail:    [{ delay: 0 }, { trucks: 1 }, { cap: 6 }],
      sea:     [{ delay: 1 }, { cap: 6 }, { delay: 0 }],
    },
    TRUST_PERK_TEXT: {}, // locales data.TRUST_PERK_TEXT[carrier] = [t1, t2, t3]

    CARRIER_L3: {},

    // 한 호출에 붙는 차는 최대 두 대 — 차가 줄줄이 오는 것보다 용량을 늘리는 게 의미 있어야 한다
    MAX_TRUCKS: 2,
    // 직접 배송: 대기 턴의 부가 행동. 택배 count개까지 골라 직접 배송 — 보상은 그대로, 대신 배송비(costBase + costPerSize×크기)를 낸다. 차량 시설로 확장
    SELF_DELIVERY: { count: 1, trips: 1, sizeMax: 2, costBase: 0, costPerSize: 5 },   // 직접 배송: 하루를 쓰지 않는 대신 보름에 trips 번 — 싸지만 드물다

    GRADES: {
      // 등급 = 프리미엄 계약 (신뢰도와 무관). cap +칸, calls +대, fee 배율, trust 시작 xp, price 배율
      // v1.5: 스탯은 센터(CENTERS/TIERS)에 있다. 여기는 등급 이름·유지비(OPCOST_CONTRACT) 키만 남는다
      normal:  { cap: 0, calls: 0, fee: 1.0, trust: 0, price: 1.0 },
      trusted: { cap: 0, calls: 0, fee: 1.0, trust: 0, price: 2.2 },
      expert:  { cap: 0, calls: 0, fee: 1.0, trust: 0, price: 4.0 },
      master:  { cap: 0, calls: 0, fee: 1.0, trust: 0, price: 7.0, special: true },
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
    TRUST_LEVELS: [0, 3, 8, 15],    // 차 한 대 = −2~+2xp (실은 택배 점수 평균)
    TRUST_EFFECTS: [], // 단계 0 문구 — locales data.TRUST_EFFECTS[0]
    // 단계별 효과 문구 (마켓 카드·호출 모달·도감이 같은 문자열을 읽는다)
    trustEffectText(carrier, lv) { const f = DATA.familyOf ? DATA.familyOf(carrier) : carrier; if (lv >= 1 && DATA.TRUST_PERK_TEXT[f]) return DATA.TRUST_PERK_TEXT[f][lv - 1]; return DATA.TRUST_EFFECTS[0]; },

    // 강화 칸: 계약마다 등급만큼 칸이 있고, 어떤 강화든 한 칸씩 차지한다 (종류별 한도 없음). 다른 계약으로 못 옮긴다
    ENH_SLOTS: { normal: 2, trusted: 3, expert: 4, master: 5 },
    ENHANCEMENTS: {
      // 차량 언어: limit = 배차 한도 +대, cap = 적재 보강 +칸(계약당 3회), regular = 월 첫 배차 무료 (동시 대수 강화는 없다 — 차는 담은 만큼 붙는다)
      // icon: 마켓 카드·계약의 강화 칸에 그려지는 아이콘 (속성 특약은 그 속성 아이콘, 색은 택배 색)
      limit1:  { price: 90, kind: 'limit', value: 1, icon: '🚚' },
      limit2:  { price: 160, kind: 'limit', value: 2, icon: '🚛' },
      cap1:    { price: 140, kind: 'cap', value: 1, icon: '📦' },
      regular: { price: 180, kind: 'regular', icon: '🎫' },
      // 휴무 특약: 공휴일·명절 연휴(업체 휴무)에도 이 계약은 부를 수 있다 — 대신 그날 배차비 ×feeMult (계약당 1개)
      holiday: { price: 150, kind: 'holiday', feeMult: 1.8, icon: '🎌' },
      seal:    { price: 90, kind: 'trust', value: 2, icon: '🔖' },
      record:  { price: 170, kind: 'trust', value: 4, icon: '📜' },
      // 속성 특약: 계약 하나에 속성 하나 추가 (계약당 1개, 교체 시 소멸, 특약 처리는 보너스 없음)
      // 속성 특약은 언제나 대가가 있다 — 공짜 속성이면 사지 않을 이유가 없어진다 (완충재는 자리를 먹고, 보냉도 자리, 통관은 시간, 냉동은 자리+크기)
      optFragile: { price: 150, kind: 'opt', attr: 'fragile', capDelta: -1, icon: '⚠', tint: 'fragile' },
      optCold:    { price: 170, kind: 'opt', attr: 'cold', capDelta: -1, icon: '❄', tint: 'fresh' },
      optCustoms: { price: 190, kind: 'opt', attr: 'customs', callsDelta: -1, icon: '🛃', tint: 'intl' },
      optFrozen:  { price: 220, kind: 'opt', attr: 'frozen', capDelta: -1, maxSizeMax: 4, icon: '🧊', tint: 'frozen' },
    },
    FACILITIES: {
      // 창고 확장 — 땅은 그대로다. 같은 건물 안에 선반 랙을 세우고, 복층을 올리고, 마지막에 옆 칸을 빌려 벽을 튼다.
      // 랙·복층은 **따로 떨어진 칸**이다: 한 택배는 한 칸에 통째로 들어간다(4칸짜리를 바닥 반·랙 반으로 나눠 두지 않는다). area → D.AREAS
      expand1: { price: 160, upkeep: 15, cap: 8,  area: 'rack' },                          // 선반 랙 — 작은 짐(크기 2 이하)만
      expand2: { price: 320, upkeep: 35, cap: 12, area: 'mezz', requires: 'expand1' },     // 복층 — 크기 4 이하
      expand3: { price: 640, upkeep: 70, cap: 16, requires: 'expand2' },                    // 옆 칸 임대 — 바닥이 넓어진다
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
  for (const id in DATA.CENTERS) {
    const c = DATA.CENTERS[id], f = DATA.FAMILIES[c.family], t = DATA.TIERS[c.tier];
    const caps = f.caps.slice(); for (const x of c.extraCaps || []) if (!caps.includes(x)) caps.push(x);
    DATA.CARRIERS[id] = Object.assign({}, f, { id, family: c.family, tier: c.tier, grade: t.grade, caps,
      trucks: c.trucks != null ? c.trucks : f.trucks + t.trucks, cap: c.cap != null ? c.cap : f.cap + t.cap,
      fee: c.fee != null ? c.fee : Math.round(f.fee * t.fee), price: 0,
      refill: c.refill != null ? c.refill : Math.round(f.price * 0.5 * (1 + c.tier * 0.5)),
      sizeMax: c.sizeMax != null ? c.sizeMax : f.sizeMax, delay: c.delay != null ? c.delay : (f.delay || 0),
      need: 'need' in c ? c.need : f.need, campaign: !!c.campaign, rep: c.rep || f.rep, allowAttrs: c.allowAttrs || null });
  }
  // 계약값 = 대당 만차 수입의 25% × 배차 대수 = 배차 대수 × 배차비 × 0.5 — 재계약과 같은 규칙(부록 AS)
  for (const id in DATA.CARRIERS) { const car = DATA.CARRIERS[id]; car.price = Math.round(car.trucks * car.fee * DATA.PREPAY_RATE); }
  // 계열 → 센터 id (tier 순). 회사 시작 계약·보장·가중치는 계열 이름으로 쓴다
  DATA.centersOf = fam => Object.keys(DATA.CARRIERS).filter(k => DATA.CARRIERS[k].family === fam && !DATA.CARRIERS[k].campaign).sort((a, b) => DATA.CARRIERS[a].tier - DATA.CARRIERS[b].tier);
  DATA.centerFor = (fam, tier) => { const list = DATA.centersOf(fam); if (!list.length) return null; let best = list[0]; for (const k of list) if (DATA.CARRIERS[k].tier <= tier) best = k; return best; };
  DATA.familyOf = k => (DATA.CARRIERS[k] || {}).family || k;
  if (typeof module !== 'undefined') module.exports = DATA; else root.DATA = DATA;
})(typeof window !== 'undefined' ? window : globalThis);
