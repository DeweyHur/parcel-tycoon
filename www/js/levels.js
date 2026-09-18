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
    'trust',        // 운송사 신뢰도 (막대·단계 트랙·등급 상승 알림). 꺼져 있으면 쌓이기는 해도 화면에 안 나온다
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
      // 시작 판: 계약 하나, 창고는 실내 16칸뿐(냉장·초대형 없음).
      // 고객은 '개인 고객'(anon)만이다 — 서장에서는 고객 체계를 설명하지 않으므로, 이름 있는 화주가 오면
      // 보이지 않는 곳에서 고객 신뢰도만 쌓인다. 큰마트 같은 단골은 고객이 열리는 4장부터.
      company: { cash: 300, warehouse: { cap: 16, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['anon', 0]] },
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 200, monthlyStress: 0, theftMult: 0, noBankrupt: true, noDeadlineCycles: 1 },
      seed: 20270301,
      script: {
        // 1사이클 = 3월 전반 13영업일. 하루 한두 개씩 — 3일차에 딱 한 대(첫 차는 +1칸이라 7칸)
        1: { turns: turns([
          ['normal 2 anon'],
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],   // 7칸 = 첫 차 정확히
          ['normal 2 anon'],
          ['normal 2 anon'],
          ['normal 2 anon'],                    // 6칸 = 한 대 정확히
          ['normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 1 anon'],                    // 6칸
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 1 anon'],                    // 6칸
          ['normal 2 anon'],
        ]) },
        // 2사이클 = 3월 후반 14영업일. 조금 늘어난다 — 매일 "부를까 기다릴까"를 판단하게
        2: { turns: turns([
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
          ['normal 1 anon', 'normal 2 anon'],
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
          ['normal 2 anon'],
          ['normal 1 anon', 'normal 2 anon'],
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
        ]) },
        // 3사이클 = 4월 전반 13영업일. 하루 4칸이 기본 — 이틀이면 차가 찬다
        3: { turns: turns([
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
        ]) },
        // 4사이클 = 4월 후반 13영업일. 창고(16칸)가 처음으로 빡빡해진다 — 하루 쉬면 밀린다
        4: { turns: turns([
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
        ]) },
      },
    },
    // ----- 레벨 2 (5~6월): 배차가 소모품이라는 것. 그래서 마켓이 필요하다는 것. 그리고 두 대 -----
    // 시작 판은 지난 장에서 그대로 넘어온다(campaign.carry) — 자금·창고·계약·고객·신뢰.
    // 앞 두 사이클만 대본이다: 배차를 다 쓰게 만들고(1), 두 대가 붙는 날을 만든다(2). 3~4는 무작위로 풀어 혼자 해 본다.
    {
      n: 2, cycles: 4, year: 2027, startMonth: 5, monthOffset: 2, grants: ['market', 'calls', 'simul'],
      minCash: 400,                     // 서장을 망쳐도 1장이 막히지 않게
      company: { cash: 600, warehouse: { cap: 16, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['anon', 0]] },
      // callsDelta +3: 계약이 하나뿐인 장이라 배차가 사이클 중간에 마르면 남은 열흘을 통째로 못 보낸다.
      // 마켓은 사이클 끝에만 열리니까, 한 번 충전하면 한 사이클이 도는 그릇이어야 한다.
      // (배차가 바닥나는 경험은 1사이클 대본이 마지막 날에 한 번만 만들어 준다)
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 260, monthlyStress: 0, theftMult: 0, noBankrupt: true, callsDelta: 3 },
      seed: 20270501,
      script: {
        // 1사이클 = 5월 전반 13영업일. 배차 7대 × 7칸 = 49칸인데 입고는 그보다 많다 —
        // 배차가 줄어드는 것을 열세 번 보고, 다 쓰고, 정산 뒤 마켓에서 처음 충전한다.
        1: { turns: turns([
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],           // 누적 11칸 — 한 대(7칸) 보내고도 남는다
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
          ['normal 2 anon'],                            // 5월 15일 — 배차는 여기쯤 바닥난다
        ]),
          // 첫 마켓: 배차를 늘리는 두 가지만(충전은 상시 · 한도 강화). 확장은 실제로 넘쳐 본 뒤에 판다
          market: { contracts: [], enh: ['limit1'], fac: [] } },
        // 2사이클 = 5월 후반. 한 턴에 몰아 줘서 '두 대가 자동으로 붙는' 날을 만든다
        2: { turns: turns([
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon'],  // 누적 14칸 = 두 대(7+7) 정확히
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],                                    // 창고(16칸)가 처음 빡빡해진다
        ]),
          // 넘쳐 본 다음에 판다 — 창고 확장이 여기서 처음 나온다
          market: { contracts: [], enh: ['limit1'], fac: ['expand1'] } },
        // 3~4사이클(6월)은 대본이 없다 — 무작위로 풀어 혼자 굴려 본다
      },
    },
    // ----- 레벨 3 (7~8월): 장마. 창고가 넘치면 마당이고, 마당에는 지붕이 없다 -----
    // 새로 여는 것: 날씨·예보 · 야외 적재와 젖음·도난 · 직접 배송 · 그리고 신뢰도(줄곧 쌓이고 있던 것의 정체)
    {
      n: 3, cycles: 4, year: 2027, startMonth: 7, monthOffset: 4, grants: ['weather', 'theft', 'self', 'trust'],
      minCash: 700, minCap: 16,
      company: { cash: 1200, warehouse: { cap: 24, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['anon', 0]] },
      // 폭염은 화면에 뜨지만 아직 할 일이 없다 — ❄ 신선이 오는 3장에서 다시 꺼낸다
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 330, monthlyStress: 0, noBankrupt: true, callsDelta: 3 },
      seed: 20270701,
      script: {
        // 1사이클 = 7월 전반 13영업일. 장마가 시작된다.
        // 11일차에 34칸이 한꺼번에 들어온다 — "비 오기 전에 다들 밀어 넣는다".
        // 차가 하루에 옮길 수 있는 건 많아야 두 대 14칸이라, 이날은 어떻게 해도 창고가 넘쳐 마당으로 나간다.
        // 그리고 그날부터 비다.
        1: { weather: ['sunny', 'sunny', 'rain', 'sunny', 'sunny', 'sunny', 'rain', 'sunny', 'sunny', 'sunny', 'rain', 'rain', 'rain'],
          turns: turns([
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ]),
          market: { contracts: [], enh: ['limit1'], fac: ['expand1', 'yard'] } },
        // 2사이클 = 7월 후반 14영업일. 하루 6칸이 꾸준히 — 배차 10대(70칸)로는 모자라서
        // 마지막 며칠은 차가 없다. 직접 배송을 한 번 써 보는 자리다.
        2: { weather: ['rain', 'sunny', 'rain', 'sunny', 'sunny', 'rain', 'sunny', 'heat', 'heat', 'sunny', 'rain', 'sunny', 'sunny', 'rain'],
          turns: turns([
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ]),
          market: { contracts: ['bulk1'], enh: ['limit1'], fac: ['expand2'] } },
        // 3~4사이클(8월)은 대본이 없다
      },
    },
    // ----- 레벨 4 (9~10월): 찬 것과 깨지는 것, 그리고 이름이 있는 화주 -----
    // 지금까지 다섯 달 내내 일반 택배만 왔다. 여기서 품목 문이 처음 열린다 — ❄ 신선 · ⚠ 파손 · 🌾 농산.
    // ❄ 는 둘 곳(냉장 구역)과 보낼 곳(냉장 계열 계약)이 둘 다 있어야 한다. 그래서 오기 전에 마켓이 먼저 온다.
    {
      n: 4, cycles: 4, year: 2027, startMonth: 9, monthOffset: 6, grants: ['attrs', 'cold', 'customers'],
      minCash: 1400, minCap: 24, minCalls: 6,
      company: { cash: 2500, warehouse: { cap: 24, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['anon', 0]] },
      // 이름 있는 화주가 여기서 처음 붙는다 (서장~2장은 전부 개인 고객이었다)
      addCustomers: [['mart', 0], ['glass', 0], ['farm', 0]],
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 420, monthlyStress: 0, noBankrupt: true, callsDelta: 3 },
      seed: 20270901,
      script: {
        // 1사이클 = 9월 전반. 아직 일반뿐이지만 고객 이름이 붙기 시작한다.
        // 마켓에서 ❄ 를 받을 준비(냉장 계열 계약 + 냉장고)를 먼저 갖춘다 — 예보 줄이 "다음 사이클에 ❄ 가 온다"고 알려 준다.
        1: { turns: turns([
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'normal 2 glass'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 anon'],
          ['normal 2 glass', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 glass'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 glass', 'normal 2 mart'],
          ['normal 2 mart', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 mart'],
        ]),
          market: { contracts: ['cold0'], enh: [], fac: ['cold1'] } },
        // 2사이클 = 9월 후반. ❄ 신선이 처음 온다. 냉장 구역은 4칸뿐이라 금방 찬다.
        2: { turns: turns([
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 anon', 'fresh 2 farm'],
          ['normal 2 mart', 'normal 2 glass'],
          ['fresh 2 farm', 'normal 2 mart'],
          ['normal 2 anon', 'fresh 2 farm'],
          ['normal 2 mart', 'normal 2 anon'],
          ['fresh 2 farm', 'fresh 2 farm'],
          ['normal 2 mart', 'normal 1 glass'],
          ['normal 2 anon', 'fresh 2 farm'],
          ['normal 2 mart', 'normal 2 anon'],
          ['fresh 2 farm', 'normal 2 mart'],
          ['normal 2 glass', 'normal 1 anon'],
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 mart'],
        ]),
          market: { contracts: [], enh: ['limit1'], fac: ['cold2', 'expand2'] } },
        // 3~4사이클(10월)은 대본이 없다 — ⚠ 파손·🌾 농산이 무작위로 섞여 온다
      },
    },
    // ----- 레벨 5 (11~12월): 이름이 난다는 것 -----
    // 한 해에서 제일 바쁜 두 달(김장·쇼핑 행사·연말)에 평판이 열린다. 여기서 처음으로 **끝날 수 있는 판**이 된다.
    // 같이 열리는 것: 사고와 보험 · 보관 계약 · 4칸 이상 대형.
    {
      n: 5, cycles: 4, year: 2027, startMonth: 11, monthOffset: 8, grants: ['rep', 'insurance', 'storage', 'bigsize'],
      minCash: 1800, minCap: 32, minCalls: 7,
      // 이어받기가 없을 때(장을 건너뛰어 고른 경우)의 시작 판 — 3장을 무난히 끝낸 사람의 판에 맞춘다
      company: { cash: 3200, warehouse: { cap: 48, cold: 8, frozen: 0, xl: 0 },
        contracts: [{ carrier: 'bulk1' }, { carrier: 'cold0' }, { carrier: 'fragile0' }, { carrier: 'large0' }],
        customers: [['anon', 0], ['mart', 1], ['glass', 0], ['farm', 0]] },
      addCustomers: [['mover', 0]],                    // 🚚 이사센터 — 보관 계약을 들고 오는 화주
      // 자금 부도는 여전히 막는다. 이 장의 종료 조건은 평판이다 — 배우는 자리에서 둘을 같이 걸지 않는다.
      mods: { opCostFixed: 520, noBankrupt: true, callsDelta: 5, heatAlerts: 0 },
      seed: 20271101,
      script: {
        // 1사이클 = 11월 전반. 4칸 대형이 처음 온다 — 실을 차가 없다. 그리고 첫 사고.
        1: { turns: turns([
          ['normal 2 mart', 'normal 2 anon', 'fresh 2 farm'],
          ['normal 2 mart', 'fragile 2 glass'],
          ['normal 2 anon', 'normal 2 mart', 'produce 2 farm'],
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'normal 2 glass'],
          ['produce 2 farm', 'normal 2 mart'],
          ['normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 anon'],
        ]),
          market: { contracts: ['large0'], enh: ['limit1'], item: ['transitCert'], fac: [] } },
        // 2사이클 = 11월 후반. 8~12일차가 쇼핑 행사 폭주(달력 이벤트)다. 보관 제안도 여기서.
        2: { turns: turns([
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'fragile 2 glass'],
          ['normal 2 anon', 'fresh 2 farm'],
          ['normal 2 mart', 'normal 2 anon'],
          ['large 4 mover', 'normal 2 mart'],                     // 첫 대형 — 예보가 미리 경고하고, 1사이클 마켓이 답을 판다
          ['normal 2 anon', 'produce 2 farm'],
          ['large 4 mover', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 glass'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'fragile 2 glass'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 anon', 'normal 2 mart'],
        ]),
          market: { contracts: [], enh: ['limit1', 'optFragile'], item: ['transitCert'], fac: ['expand3'] } },
        // 3~4사이클(12월)은 대본이 없다 — 한 해에서 제일 바쁜 달을 혼자 넘긴다
      },
    },
    // ----- 레벨 6 (1~2월): 마지막 겨울 -----
    // 한 해의 끝. 1월은 비수기라 숨을 돌리고, 2월 설에 마지막 폭주가 온다.
    // 새로 여는 것: ❆ 냉동 · 일요일 선택 · 퍽과 도감(캠페인을 끝낸 뒤 자유 런에서 쓰는 것들).
    // 🛃 통관은 캠페인에서 열지 않는다 — 계열이 여섯인데 슬롯이 다섯이라, 마지막 장에서
    // 새 품목을 둘이나 열면 어느 하나는 받을 길이 아예 없어진다. 통관은 자유 런의 평판 등급이 연다.
    // 이 장 끝에서 잔금을 턴다 — 본계약서에 도장을 찍는 자리다.
    {
      n: 6, cycles: 4, year: 2028, startMonth: 1, monthOffset: 10, grants: ['frozen', 'weekendChoice', 'perks', 'codex'],
      minCash: 2500, minCap: 56, minCalls: 8,
      company: { cash: 6000, warehouse: { cap: 64, cold: 12, frozen: 0, xl: 0 },
        contracts: [{ carrier: 'bulk1' }, { carrier: 'cold0' }, { carrier: 'fragile0' }, { carrier: 'large0' }],
        customers: [['anon', 0], ['mart', 2], ['glass', 1], ['farm', 1], ['mover', 1]] },
      addCustomers: [['ice', 0]],                      // ❆ 냉동창고
      // 설 연휴는 이틀을 통째로 못 부르는데, 그 앞에 폭주가 붙는다. 첫 해에는 그 벽을 조금 낮춰 둔다 —
      // 물량을 20% 덜고(1월은 원래 비수기다) 배차 그릇을 키운다. 진짜 설은 자유 런의 몫이다.
      // noRepEnd: 마지막 장은 한 해를 끝내고 잔금을 치르는 자리다. 열 달을 굴려 온 판이 설 연휴 사흘에
      // 평판으로 끊기면 플레이어는 캠페인의 결말을 못 본다. 평판은 4장에서 가르쳤고, 여기서는
      // 그 결과가 성적(정시율·반송)과 '잔금을 다 낼 수 있는가'로 남는다.
      mods: { noBankrupt: true, noRepEnd: true, opCostFixed: 700, callsDelta: 6, heatAlerts: 0, arrivalsMult: 0.8 },
      seed: 20280101,
      script: {
        // 1사이클 = 1월 전반. 비수기다 — 숨을 돌리면서 ❆ 를 받을 준비를 한다.
        // 예보가 다음 보름의 ❆ 를 경고하고, 마켓이 냉동 계약과 냉동고를 판다.
        1: { turns: turns([
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 anon', 'produce 2 farm'],
          ['normal 2 mart', 'normal 2 glass'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'fragile 2 glass'],
          ['normal 2 anon', 'normal 2 mart'],
        ]),
          market: { contracts: ['frozen0'], enh: [], item: [], fac: ['freezer1'] } },
        // 2사이클 = 1월 후반. ❆ 냉동이 온다. 냉동 구역이 없으면 갈 데가 없다
        2: { turns: turns([
          ['normal 2 mart', 'frozen 2 ice'],
          ['normal 2 anon', 'normal 2 mart'],
          ['frozen 2 ice', 'normal 2 mart'],
          ['normal 2 mart', 'fresh 2 farm'],
          ['normal 2 anon', 'normal 2 mart'],
          ['frozen 2 ice', 'normal 2 glass'],
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'normal 2 anon'],
          ['frozen 2 ice', 'fragile 2 glass'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'produce 2 farm'],
          ['normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 anon'],
        ]),
          market: { contracts: [], enh: ['limit1'], item: ['transitCert'], fac: ['freezer1', 'expand3'] } },
        // 3~4사이클(2월)은 대본이 없다 — 설 폭주와 연휴 휴무를 혼자 넘긴다
      },
    },
  ];

  const get = n => LEVELS.find(l => l.n === n) || null;
  // 레벨 N 시점에 켜져 있는 기능 (1..N 누적)
  const showsAt = n => { const s = new Set(); for (const l of LEVELS) { if (l.n > n) break; for (const f of l.grants || []) s.add(f); } return s; };
  const LAST = LEVELS[LEVELS.length - 1].n;
  // 레벨 N 이 시작하는 사이클 번호 (캠페인은 한 런이 이어지는 것처럼 달력이 계속 흐른다)
  const startCycle = n => { let c = 1; for (const l of LEVELS) { if (l.n >= n) break; c += l.cycles; } return c; };

  // 창고 매매 — 무상 양도가 아니다. 한 사장님이 값을 부르고, 서장 끝에 계약금을 걸고,
  // 그다음 장마다 회차로 나눠 갚고, 마지막 장에서 잔금을 턴다.
  // 한 번에 다 갚는 구조였을 때는 중간 장에서 돈을 쌓기만 하면 돼서 계산할 것이 없었다 —
  // 회차가 있어야 "이번 두 달에 얼마를 남겨야 하나"가 매 장의 질문이 된다.
  const DEAL = {
    price: 11000,
    downRate: 0.6,                                  // 서장 끝 계약금 = 그 시점 자금의 60%
    // 그 레벨을 끝냈을 때 내는 회차 납입금 (1장 = level 2). 마지막 장은 남은 잔금 전액.
    install: { 2: 500, 3: 700, 4: 1300, 5: 2600 },
  };
  // 그 장을 끝냈을 때 내야 할 돈. 마지막 장이면 남은 잔금 전부.
  const dueAt = (level, rest) => (level >= LAST ? rest : Math.min(rest, DEAL.install[level] || 0));

  const API = { LEVELS, FLAGS, DEAL, dueAt, get, showsAt, startCycle, LAST, IMPLEMENTED: 6 };
  if (typeof module !== 'undefined') module.exports = API; else root.LEVELS = API;
})(typeof window !== 'undefined' ? window : globalThis);
