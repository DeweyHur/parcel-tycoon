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
    'mission',      // 이번 보름 목표(등급 D~A). 서장에는 없다 — 첫 장이 가르칠 것은 '꽉 채워 보낸다' 하나뿐
    'chain',        // 연속 만차(고적재 연쇄 배율)
    'rush',         // 일괄 출고(창고가 차면 트럭 +2, 한꺼번에 비우면 보상 ×1.35)
    'capBonus',     // 칸 보너스(스킵·대기 누적·이달 첫 호출). 캠페인은 안 연다 — 칸 수가 호출마다 바뀌면
                    // "왜 지금은 6칸이지"를 먼저 설명해야 하고, 서장이 가르칠 것은 그게 아니다
  ];

  const LEVELS = [
    // ===== 캠페인은 여섯 장 · 장마다 한 사이클(반달) · 전부 합쳐 봄 석 달 =====
    // 왜 한 사이클인가: 서장이 네 사이클(53영업일)이던 때, 가르치는 대사는 27일까지였고
    // 나머지 26일은 같은 판단의 반복이었다. 업계 기준으로도 튜토리얼은 스텝이 늘수록 이탈이 는다.
    // 한 장 = 한 사이클이면 한 장이 13~14영업일, 사람 기준 3~4분이고 매 장이 새로 가르칠 것을 갖는다.
    // 달력은 cycleOffset 하나로 이어진다 — 장은 새 런이지만 3월 전반 → 5월 후반으로 흐른다.

    // ----- 서장 (3월 전반): 쌓았다가 꽉 채워 보낸다. 그게 전부다 -----
    {
      n: 1, cycles: 1, year: 2027, startMonth: 3, cycleOffset: 0, grants: [],
      company: { cash: 300, warehouse: { cap: 16, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['anon', 0]] },
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 110, monthlyStress: 0, theftMult: 0, noBankrupt: true, noDeadlineCycles: 1 },
      seed: 20270301,
      script: {
        1: { turns: turns([
          ['normal 2 anon'],
          [],
          ['normal 1 anon'],
          [],
          ['normal 2 anon'],
          [],
          ['normal 2 anon'],
          [],
          ['normal 1 anon'],
          [],
          ['normal 2 anon'],
          [],
          ['normal 1 anon'],
        ]) },
      },
    },
    // ----- 1장 (3월 후반): 배차는 소모품이다. 그래서 마켓이 있다 -----
    {
      n: 2, cycles: 1, year: 2027, startMonth: 3, cycleOffset: 1, grants: ['market', 'calls', 'simul', 'mission', 'chain'],
      minCash: 200,
      company: { cash: 600, warehouse: { cap: 16, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['anon', 0]] },
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 120, monthlyStress: 0, theftMult: 0, noBankrupt: true },
      seed: 20270316,
      script: {
        // 8일차에 한꺼번에 — 두 대가 자동으로 붙는 자리. 배차는 사이클 끝에 바닥난다.
        // 칸은 6으로 고정이라(보너스 없음) 배차 일곱 대 × 6칸 = 42칸이 이 장의 천장이다.
        // 총량은 그 아래로 둔다 — 배차가 모자란 느낌은 주되, 성실히 굴리면 반송은 안 나오게
        1: { turns: turns([
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon'],
          ['normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon'],
          ['normal 1 anon'],
        ]),
          market: { contracts: [], enh: ['limit1'], fac: ['expand1'] } },
      },
    },
    // ----- 2장 (4월 전반): 봄비. 창고가 넘치면 마당이고, 마당에는 지붕이 없다 -----
    {
      n: 3, cycles: 1, year: 2027, startMonth: 3, cycleOffset: 2, grants: ['weather', 'theft', 'self', 'trust', 'rush'],
      minCash: 300, minCap: 16, minCalls: 5,
      company: { cash: 900, warehouse: { cap: 24, cold: 0, frozen: 0, xl: 0 }, contracts: [{ carrier: 'bulk0' }], customers: [['anon', 0]] },
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 140, monthlyStress: 0, noBankrupt: true, callsDelta: 4 },
      seed: 20270401,
      script: {
        // 9일차에 26칸 — 차가 하루에 옮길 수 있는 것보다 크다. 어떻게 굴려도 마당으로 나가고, 그날부터 비다
        1: { weather: ['sunny', 'sunny', 'rain', 'sunny', 'sunny', 'sunny', 'rain', 'sunny', 'rain', 'rain', 'sunny', 'rain', 'sunny'],
          turns: turns([
          ['normal 2 anon', 'normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 1 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 anon', 'normal 1 anon'],
        ]),
          market: { contracts: ['bulk1'], enh: ['limit1'], fac: ['yard'] } },
      },
    },
    // ----- 3장 (4월 후반): 이사철. 이름 있는 화주 · ⚠ 깨지는 것 · ❄ 찬 것 -----
    {
      n: 4, cycles: 1, year: 2027, startMonth: 3, cycleOffset: 3, grants: ['attrs', 'cold', 'customers'],
      minCash: 500, minCap: 24, minCalls: 5, minWarehouse: { cold: 8 },
      // 한 사이클 안에 마켓이 한 번뿐이라 '사고 나서 배운다'가 안 된다 — 냉장은 시작 판에 쥐여 주고,
      // 왜 그게 필요한지를 박 반장이 말로 짚는다.
      company: { cash: 1200, warehouse: { cap: 24, cold: 8, frozen: 0, xl: 0 },
        contracts: [{ carrier: 'bulk0' }, { carrier: 'cold0' }], customers: [['anon', 0]] },
      addCustomers: [['mart', 0], ['glass', 0], ['farm', 0]],
      mods: { noInsurance: true, storageOfferProb: 0, heatAlerts: 0, opCostFixed: 160, monthlyStress: 0, noBankrupt: true, callsDelta: 7 },
      seed: 20270416,
      script: {
        1: { turns: turns([
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'fresh 2 farm', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 mart', 'produce 2 farm'],
          ['normal 2 mart', 'fragile 2 glass', 'normal 2 anon'],
          ['fresh 2 farm', 'normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['normal 2 anon', 'normal 2 mart', 'fresh 2 farm'],
          ['normal 2 mart', 'produce 2 farm', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 mart', 'fragile 2 glass'],
          ['normal 2 mart', 'fresh 2 farm', 'normal 2 anon'],
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['normal 2 anon', 'normal 2 mart', 'fresh 2 farm'],
          ['normal 2 mart', 'normal 2 anon', 'normal 2 anon'],
        ]),
          market: { contracts: ['fragile0'], enh: ['optFragile'], fac: ['cold1'] } },
      },
    },
    // ----- 4장 (5월 전반): 소문. 평판이 열리고, 여기서 처음으로 끝날 수 있는 판이 된다 -----
    // 5월은 가정의 달이라 ⚠ 선물이 늘고, 6~9일차가 선물 주간(달력 이벤트)이다.
    {
      n: 5, cycles: 1, year: 2027, startMonth: 3, cycleOffset: 4, grants: ['rep', 'insurance', 'storage', 'bigsize'],
      minCash: 700, minCap: 24, minCalls: 6, minWarehouse: { cold: 8 },
      company: { cash: 1800, warehouse: { cap: 32, cold: 6, frozen: 0, xl: 0 },
        contracts: [{ carrier: 'bulk0' }, { carrier: 'cold0' }, { carrier: 'fragile0' }, { carrier: 'large0' }], customers: [['anon', 0], ['mart', 1], ['glass', 0]] },
      addCustomers: [['mover', 0]],
      mods: { noBankrupt: true, opCostFixed: 185, callsDelta: 7, heatAlerts: 0 },
      seed: 20270501,
      script: {
        1: { turns: turns([
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'fragile 2 glass', 'normal 2 anon'],
          ['large 4 mover', 'normal 2 mart', 'normal 2 anon'],
          ['normal 2 anon', 'fresh 2 farm', 'normal 2 mart'],
          ['normal 2 mart', 'fragile 2 glass', 'normal 2 anon'],
          ['fragile 2 glass', 'normal 2 mart', 'normal 2 anon'],
          ['large 4 mover', 'fragile 2 glass', 'normal 2 mart'],
          ['normal 2 mart', 'fragile 2 glass', 'normal 2 anon'],
          ['normal 2 anon', 'normal 2 mart', 'fresh 2 farm'],
          ['fragile 2 glass', 'fresh 2 farm', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'normal 2 anon', 'normal 2 mart'],
          ['normal 2 anon', 'normal 2 mart', 'fragile 2 glass'],
        ]),
          // 다음 보름에 ❆ 가 온다. 계약 자리는 이미 넷이 다 찼으니 답은 계약이 아니라 **특약**이다
          market: { contracts: [], enh: ['optFrozen', 'limit1'], item: ['transitCert'], fac: ['expand2', 'freezer1'] } },
      },
    },
    // ----- 5장 (5월 후반): 마지막 봄. ❆ 냉동 · 일요일 선택 · 그리고 자리가 없을 때 '붙이는' 법 -----
    // 이 장 끝에서 잔금을 턴다 — 본계약서에 도장을 찍는 자리다.
    {
      n: 6, cycles: 1, year: 2027, startMonth: 3, cycleOffset: 5, grants: ['frozen', 'weekendChoice', 'perks', 'codex'],
      minCash: 900, minCap: 32, minCalls: 6, minWarehouse: { cold: 8, frozen: 4 },
      company: { cash: 2600, warehouse: { cap: 40, cold: 8, frozen: 4, xl: 0 },
        contracts: [{ carrier: 'bulk0' }, { carrier: 'cold0' }, { carrier: 'fragile0' }, { carrier: 'large0' }],
        customers: [['anon', 0], ['mart', 1], ['glass', 1], ['farm', 0], ['mover', 0]] },
      addCustomers: [['ice', 0]],
      // noRepEnd: 마지막 장은 한 해를 끝내고 잔금을 치르는 자리다. 여기서 평판으로 끊기면 결말을 못 본다
      mods: { noBankrupt: true, noRepEnd: true, opCostFixed: 210, callsDelta: 7, heatAlerts: 0 },
      seed: 20270516,
      script: {
        // 계약 자리가 넷인데 이미 넷을 쓰고 있다 — 여기서는 계약이 아니라 **특약**이 답이다
        1: { turns: turns([
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['frozen 2 ice', 'normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'fragile 2 glass', 'fresh 2 farm'],
          ['normal 2 anon', 'fresh 2 farm', 'normal 2 mart'],
          ['frozen 2 ice', 'normal 2 mart', 'fragile 2 glass'],
          ['normal 2 mart', 'produce 2 farm', 'normal 2 anon'],
          ['normal 2 anon', 'fragile 2 glass', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 anon', 'fresh 2 farm'],
          ['normal 2 anon', 'normal 2 mart', 'fragile 2 glass'],
          ['fragile 2 glass', 'fresh 2 farm', 'normal 2 mart'],
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'normal 2 anon', 'fresh 2 farm'],
          ['normal 2 anon', 'normal 2 mart', 'fragile 2 glass'],
        ]),
          market: { contracts: [], enh: ['optFrozen', 'limit1'], item: ['transitCert'], fac: ['freezer1'] } },
      },
    },
  ];

  const get = n => LEVELS.find(l => l.n === n) || null;
  // 레벨 N 시점에 켜져 있는 기능 (1..N 누적)
  const showsAt = n => { const s = new Set(); for (const l of LEVELS) { if (l.n > n) break; for (const f of l.grants || []) s.add(f); } return s; };
  const LAST = LEVELS[LEVELS.length - 1].n;
  // 레벨 N 이 시작하는 사이클 번호 (캠페인은 한 런이 이어지는 것처럼 달력이 계속 흐른다)
  const startCycle = n => { let c = 1; for (const l of LEVELS) { if (l.n >= n) break; c += l.cycles; } return c; };

  // 창고 매매 — 무상 양도가 아니다. 한 사장님이 값을 부르고, 계약금을 걸고,
  // 그다음 장마다 회차로 나눠 갚고, 마지막 장에서 잔금을 턴다.
  // 한 번에 다 갚는 구조였을 때는 중간 장에서 돈을 쌓기만 하면 돼서 계산할 것이 없었다 —
  // 회차가 있어야 "이번 장에 얼마를 남겨야 하나"가 매 장의 질문이 된다.
  //
  // 값을 부르는 자리는 **1장 끝(level 2)** 이다. 서장은 한 사장이 자리를 비운 보름 대타라
  // 그 끝에 매매 서류를 쓰면 뜬금없다 — 보름 굴려 보고 "한철 더" 를 부탁받고, 한 달을 채운 뒤에
  // 값 얘기가 나온다. 그래서 계약금은 1장 끝 자금에서 걸고, 회차는 2장(level 3)부터 시작한다.
  const DEAL = {
    price: 1200,
    downRate: 0.5,                                  // 1장 끝 계약금 = 그 시점 자금의 절반
    // 그 레벨을 끝냈을 때 내는 회차 납입금 (2장 = level 3). 마지막 장은 남은 잔금 전액.
    // 앞 회차는 가볍게 — 마지막 장에 가장 큰 덩어리가 남아야 '잔금을 턴다'가 된다
    install: { 3: 120, 4: 150, 5: 180 },
  };
  // 그 장을 끝냈을 때 내야 할 돈. 마지막 장이면 남은 잔금 전부.
  const dueAt = (level, rest) => (level >= LAST ? rest : Math.min(rest, DEAL.install[level] || 0));

  const API = { LEVELS, FLAGS, DEAL, dueAt, get, showsAt, startCycle, LAST, IMPLEMENTED: 6 };
  if (typeof module !== 'undefined') module.exports = API; else root.LEVELS = API;
})(typeof window !== 'undefined' ? window : globalThis);
