// 튜토리얼(인수인계) 대본 — 1~3개월차의 입고·날씨·마켓 매물을 고정한다 (docs/STORY_TUTORIAL_DESIGN.md 부록 I).
// 왜: 무작위 물류 위에서는 "지금 차를 두 대 불러 봐", "배차가 떨어졌으니 마켓에서 충전해"를 말할 수 없다.
//     같은 자리에서 같은 일이 일어나야 창고장이 정확히 짚어 줄 수 있고, 플레이어도 배운 걸 바로 확인할 수 있다.
// 적용 범위: 타이틀 「인수인계」로 시작한 런(cfg.scripted)의 1~3개월차만. 4개월차부터는 평소대로 무작위다.
// 난이도(수습/정규)는 그대로 얹힌다 — 물류는 같고 배차비·운영비만 달라진다.
(function (root) {
  // 'type size customer' → { type, size, customer }
  const P = s => { const [type, size, customer] = s.split(' '); return { type, size: +size, customer: customer || 'anon' }; };
  const turns = rows => rows.map(r => r.map(P));

  const TUTORIAL = {
    SEED: 20260313,   // 대본 밖(파손·도난·통관 지연 굴림)도 매번 같게
    MONTHS: 3,        // 이 개월차까지만 대본

    months: {
      // ----- 1개월차 (3월): 쌓았다가 꽉 채워 보낸다. 3턴에 딱 한 대(6칸), 8턴에 딱 두 대(12칸) -----
      1: {
        weather: ['sunny', 'sunny', 'sunny', 'sunny', 'sunny', 'rain', 'sunny', 'sunny', 'sunny', 'sunny'],
        turns: turns([
          ['normal 2 mart'],
          ['normal 2 anon'],
          ['normal 2 mart', 'normal 1 anon'],                   // 누적 7칸 = 첫 호출 한 대(동네 택배는 그 달 첫 차가 +1칸) 정확히
          ['normal 2 mart', 'normal 1 anon'],
          ['normal 1 mart'],
          ['normal 2 mart'],                                    // 누적 6칸 = 두 번째 차 정확히
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'normal 2 anon', 'normal 2 glass', 'normal 2 mart'], // 누적 12칸 = 두 대 동시 호출 정확히
          ['normal 1 anon', 'normal 2 mart'],
          ['normal 2 mart'],
        ]),
        // 마켓(1개월차 정산 후): 배차를 늘리는 세 가지가 한 화면에 다 있어야 한다 — 충전(상시) · 한도 강화 · 상위 센터
        // 1개월차 마켓: 배차를 늘리는 두 가지(충전 · 한도 강화)와 창고 확장만. 갈아타기는 신뢰가 쌓인 2·3개월차에 꺼낸다
        market: { contracts: [], enh: ['limit1'], fac: ['expand1'] },
      },

      // ----- 2개월차 (4월): 고객과 특수 품목. ⚠ 3개 vs 시작 배차 2대 → 배차가 떨어진다 -----
      2: {
        weather: ['sunny', 'sunny', 'sunny', 'rain', 'sunny', 'sunny', 'rain', 'sunny', 'sunny', 'sunny'],
        turns: turns([
          ['normal 2 mart', 'fresh 2 dawn'],
          ['normal 2 anon', 'fragile 2 glass'],                 // ⚠ 첫 등장
          ['normal 2 mart', 'normal 2 anon'],
          ['normal 2 mart', 'fragile 2 glass', 'fresh 2 dawn'],
          ['normal 2 mart', 'normal 1 anon'],
          ['normal 2 mart', 'normal 2 anon', 'normal 2 mart'],
          ['fresh 2 dawn', 'fragile 2 glass'],
          ['normal 2 mart', 'normal 2 anon', 'normal 2 mart'],
          ['normal 2 mart', 'fragile 2 glass'],                 // ⚠ 넷째 — 시작 배차 2대를 다 쓰게 된다
          ['normal 2 anon', 'fresh 2 dawn'],
        ]),
        offer: { turn: 5, kind: 'move', vol: 6, turns: 4, customer: 'anon' }, // 이사철 보관 제안
        // 2개월차 마켓: 배차가 바닥난 ⚠ 계약을 어떻게 할지 — 충전(싸다) vs 상위 센터 갈아타기(배차·용량이 늘지만 신뢰는 0부터)
        market: { contracts: ['fragile1'], enh: ['limit2'], fac: ['cold1'] },
      },

      // ----- 3개월차 (5월): 가정의 달 ⚠. 창고가 차고, 비가 오고, 배차를 관리해야 한다 -----
      3: {
        weather: ['sunny', 'sunny', 'rain', 'rain', 'sunny', 'sunny', 'sunny', 'rain', 'sunny', 'sunny'],
        turns: turns([
          ['normal 2 mart', 'fragile 2 glass'],
          ['normal 2 mart', 'fragile 2 glass', 'normal 1 anon'],
          ['normal 2 mart', 'normal 2 anon', 'fresh 2 dawn', 'fragile 4 glass', 'normal 2 anon'],
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass', 'normal 2 mart', 'normal 2 anon', 'normal 1 mart'], // 창고가 넘쳐 마당에 나간다 (같은 턴 비 예보)
          ['normal 2 mart', 'fresh 2 dawn'],
          ['normal 2 mart', 'normal 2 anon', 'fragile 2 glass'],
          ['normal 2 mart', 'normal 1 anon'],
          ['normal 2 mart', 'fresh 2 dawn'],
          ['normal 2 mart', 'fragile 2 glass'],
          ['normal 2 mart'],
        ]),
        market: { contracts: ['bulk1'], enh: ['cap1'], fac: ['expand1'] },
      },
    },
  };

  if (typeof module !== 'undefined') module.exports = TUTORIAL; else root.TUTORIAL = TUTORIAL;
})(typeof window !== 'undefined' ? window : globalThis);
