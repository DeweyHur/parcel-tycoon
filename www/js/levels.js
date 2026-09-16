// 캠페인 — 첫 해(24사이클)를 여섯 장(서장 · 1~5장)으로 쪼개고, 장이 넘어갈 때마다 기능을 하나씩 연다.
// (코드 안에서는 level 1~6, 화면에는 lv.ch.<n> = 서장 · 1장 · …)
// (docs/STORY_TUTORIAL_DESIGN.md 부록 R)
//
// 왜: 지금까지 튜토리얼은 "완성된 화면을 말로 덮는" 방식이었다. 1일차에 계약 3개·냉장/냉동 바·날씨 칩·
//     평판 게이지·고객·배차 잔량이 한꺼번에 있으니 박 반장이 설명할 것이 많아지고, 글이 많아진다.
//     화면에서 빼면 설명할 것이 없어진다 — 텍스트를 줄이는 가장 확실한 방법은 기능을 늦게 여는 것이다.
//
// 규칙: 레벨은 **누적**이다. 레벨 N 에서는 1..N 의 grants 가 전부 켜져 있다. 자유 런(캠페인 밖)은 전부 켜짐.
//       판은 이어진다 — 자금·계약·창고·고객·상호 이름이 다음 레벨로 넘어간다(profile.campaign.carry).
(function (root) {
  const P = s => { const [type, size, customer] = s.split(' '); return { type, size: +size, customer: customer || 'anon' }; };
  const turns = rows => rows.map(r => r.map(P));

  // 기능 플래그. 여기 없는 것은 언제나 켜져 있다(창고·호출·기한·야외 적재처럼 1레벨부터 쓰는 것).
  const FLAGS = [
    'market',       // 마켓 — 정산 뒤 매물 화면
    'calls',        // 배차 = 소모품(잔량·충전). 꺼져 있으면 무제한이고 잔량도 안 보인다
    'simul',        // 한 번에 두 대 이상
    'weather',      // 날씨·예보 (꺼져 있으면 언제나 맑음)
    'theft',        // 마당 도난·젖음
    'self',         // 직접 배송
    'cold',         // 냉장 구역과 ❄ 신선
    'frozen',       // 냉동 구역과 ❆
    'attrs',        // ⚠🛃🌾 등 특수 속성 전반
    'customers',    // 고객 이름·신뢰
    'rep',          // 평판 게이지(= 런 종료 조건)
    'storage',      // 보관 계약
    'insurance',    // 보험
    'weekendChoice',// 일요일 선택지
    'perks',        // 퍽·회사·시나리오 선택
    'codex',        // 도감·기록
  ];

  const LEVELS = [
    // ----- 레벨 1 (3~4월): 쌓았다가 꽉 채워 보낸다. 그리고 기한. 그게 전부다 -----
    {
      n: 1, cycles: 4, year: 2027, grants: [],
      // 시작 판: 계약 하나, 고객 하나, 창고는 실내 16칸뿐(냉장·초대형 없음)
      company: { cash: 300, warehouse: { cap: 16, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['mart', 0]] },
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 200, monthlyStress: 0, theftMult: 0, noBankrupt: true },
      seed: 20270301,
      script: {
        // 1사이클 = 3월 전반 13영업일. 하루 한두 개씩 — 3일차에 딱 한 대(첫 차는 +1칸이라 7칸)
        1: { turns: turns([
          ['normal 2 mart'],
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],   // 7칸 = 첫 차 정확히
          ['normal 2 mart'],
          ['normal 2 mart'],
          ['normal 2 mart'],                    // 6칸 = 한 대 정확히
          ['normal 1 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 1 mart'],                    // 6칸
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 1 mart'],                    // 6칸
          ['normal 2 mart'],
        ]) },
        // 2사이클 = 3월 후반 14영업일. 조금 늘어난다 — 매일 "부를까 기다릴까"를 판단하게
        2: { turns: turns([
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
          ['normal 1 mart', 'normal 2 mart'],
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
          ['normal 2 mart'],
          ['normal 1 mart', 'normal 2 mart'],
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
        ]) },
        // 3사이클 = 4월 전반 13영업일. 하루 4칸이 기본 — 이틀이면 차가 찬다
        3: { turns: turns([
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
        ]) },
        // 4사이클 = 4월 후반 13영업일. 창고(16칸)가 처음으로 빡빡해진다 — 하루 쉬면 밀린다
        4: { turns: turns([
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 mart'],
          ['normal 2 mart'],
        ]) },
      },
    },
    // ----- 아래는 아직 선언만 (부록 R 의 커리큘럼). 레벨 1 이 끝나면 여기를 채운다 -----
    { n: 2, cycles: 4, grants: ['market', 'calls', 'simul'] },                 // 5~6월: 마켓·배차 소모품·창고 확장·2대 동시
    { n: 3, cycles: 4, grants: ['weather', 'theft', 'self'] },                 // 7~8월: 장마·폭염·야외 적재·직접 배송
    { n: 4, cycles: 4, grants: ['attrs', 'cold', 'customers'] },               // 9~10월: ❄ 특수 품목·냉장 구역·고객과 신뢰
    { n: 5, cycles: 4, grants: ['rep', 'insurance', 'storage'] },              // 11~12월: 평판과 등급·사고와 보험·보관
    { n: 6, cycles: 4, grants: ['frozen', 'weekendChoice', 'perks', 'codex'] },// 1~2월: ❆ 냉동·🛃 통관·주말 선택·퍽
  ];

  const get = n => LEVELS.find(l => l.n === n) || null;
  // 레벨 N 시점에 켜져 있는 기능 (1..N 누적)
  const showsAt = n => { const s = new Set(); for (const l of LEVELS) { if (l.n > n) break; for (const f of l.grants || []) s.add(f); } return s; };
  const LAST = LEVELS[LEVELS.length - 1].n;
  // 레벨 N 이 시작하는 사이클 번호 (캠페인은 한 런이 이어지는 것처럼 달력이 계속 흐른다)
  const startCycle = n => { let c = 1; for (const l of LEVELS) { if (l.n >= n) break; c += l.cycles; } return c; };

  const API = { LEVELS, FLAGS, get, showsAt, startCycle, LAST, IMPLEMENTED: 1 };
  if (typeof module !== 'undefined') module.exports = API; else root.LEVELS = API;
})(typeof window !== 'undefined' ? window : globalThis);
