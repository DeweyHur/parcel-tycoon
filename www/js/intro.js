// 오프닝 씬 — 서장을 시작할 때마다 (docs/STORY_TUTORIAL_DESIGN.md 부록 X·Z·AA).
// 왜: 첫 화면이 곧장 '창고 + 버튼'이면 플레이어는 자기가 어디에 서 있는지 모른 채 조작부터 배운다.
//     박 반장이 입을 열기 전에, 카메라가 먼저 장소와 사람과 사정을 보여 준다.
// 규칙: 조작은 하나도 없다. 아무 데나 누르면 즉시 끝난다. 끝나면 화면이 제자리로 돌아오며 그대로 게임이 시작된다.
//     마지막 샷은 컷이 아니라 '게임 카메라로 착지'다 — 오프닝과 플레이 화면 사이에 이음매가 없어야 한다.
// 자막은 한 번에 뜨지 않고 한 글자씩 쳐진다. 길이는 글자 수에서 계산하므로(build) 문구를 고치면 타임라인이 따라온다.
window.Intro = (function () {
  const T = (k, p) => (window.I18n ? I18n.t(k, p) : k);
  const ease = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
  const WIDE = 62;        // 오프닝 동안의 flex-basis (%). 100 이면 화면이 세로로 길어져 가로 화각이 20도까지 좁아진다 — 벽만 찍힌다
  const FOV = 46;         // 오프닝 화각. 마지막 샷에서 게임 화각(38)으로 건너간다
  const BAR = 9;          // 레터박스 높이 (vh)
  const CUT = 0.22;       // 컷 암전 반폭 (초)
  const TRUCK_X = 7.6;    // 탑차가 들어와 서는 자리 (도크 밖)
  const TRUCK_OFF = 24;   // 화면 밖 — 오프닝은 빈 마당에서 시작한다
  // 자막 호흡. 한글은 한 글자에 담긴 정보가 많아 라틴보다 천천히 친다
  const LEAD = 0.32;      // 줄이 떠오르고 타자가 시작되기까지
  const HOLD = 1.35;      // 다 친 뒤 머무는 시간
  const GAP = 0.38;       // 줄과 줄 사이 (자막이 비는 시간)
  const cps = () => (window.I18n && I18n.lang !== 'ko' ? 0.034 : 0.052);

  // 샷 = 카메라 + 그 샷에서 칠 자막들. 샷 길이는 자막 길이에서 나온다 (아래 build)
  // recall = 회상. 세피아는 샷이 아니라 자막에 걸린다 — 대사 중간에 색이 변하면 안 되니까
  const SEQ = [
    // S1 오늘 아침 · 길 건너. 마당은 비어 있다
    { from: { p: [15.0, 4.9, 15.8], l: [3.4, 1.0, 1.4] }, to: { p: [12.9, 4.5, 14.7], l: [3.0, 1.0, 1.2] }, keys: ['intro.1'] },
    // S2 회상 · 창고 옆구리, 오래 드나든 자리
    { cut: true, recall: true, from: { p: [-8.8, 3.1, 10.2], l: [0.2, 1.2, 0.2] }, to: { p: [-6.2, 2.9, 11.2], l: [0.9, 1.2, 0.3] }, keys: ['intro.2', 'intro.3'] },
    // S3 회상 · 로우앵글로 지붕선을 올려다본다. 한 사장이 넘기겠다고 한 그날
    { cut: true, recall: true, from: { p: [5.2, 0.9, 9.6], l: [1.4, 2.5, 0.1] }, to: { p: [4.0, 1.2, 8.5], l: [1.3, 2.3, 0.0] }, keys: ['intro.4', 'intro.5', 'intro.6'] },
    // S4 오늘 · 색이 돌아오고 탑차가 들어온다. 자막 없이 소리만 — 말할 것이 남지 않았다
    { cut: true, truck: true, min: 3.6, from: { p: [11.4, 3.5, 13.4], l: [2.0, 1.0, 0.8] }, to: { p: [8.8, 3.6, 11.9], l: [1.6, 0.95, 0.4] }, keys: [] },
    // 착지 — 컷이 아니라 S4 가 그대로 제자리로 내려온다. 앞면이 들리고 화면이 게임으로
    { home: true, min: 4.6, keys: ['intro.7'] },
  ];
  // 인물 소개 — 대화창이 아니라 영화 자막처럼 옆에서 밀려 들어왔다 빠진다. 샷 시작 기준 초
  // 이름만, 한 사장 하나뿐이다. 박 반장은 컷신에 나오지 않는다 — 첫날 창고에서 직접 만난다
  const CARDS = [
    { shot: 1, at: 0.7, d: 4.4, who: 'han', expr: 'smile', name: 'card.han.name' },
  ];
  // 소리: 회상에 들고 나는 숨, 탑차, 셔터. 샷 시작 기준 초
  const CUES = [
    { shot: 1, at: 0.02, f: () => SFX.recallIn() },
    { shot: 3, at: 0.02, f: () => SFX.recallOut() },
    { shot: 3, at: 0.45, f: () => SFX.truck() },
    { shot: 3, at: 2.4, f: () => SFX.horn() },
    { shot: 4, at: 0.25, f: () => SFX.shutter() },
  ];

  // 엔딩 씬 — 마지막 장(잔금 완납·본계약) 뒤. 조작 없음, 누르면 끝. 착지하지 않고 암전으로 닫는다
  const OUTRO = {
    seq: [
      // E1 저녁 · 길 건너에서 창고를 본다. 오프닝 첫 샷과 같은 자리 — 석 달 전과 같은 풍경, 다른 주인
      { from: { p: [12.9, 4.5, 14.7], l: [3.0, 1.0, 1.2] }, to: { p: [14.6, 4.8, 15.6], l: [3.2, 1.0, 1.3] }, keys: ['outro.1'] },
      // E2 회상 · 한 사장이 열쇠를 건네던 날 (오프닝의 로우앵글)
      { cut: true, recall: true, from: { p: [4.0, 1.2, 8.5], l: [1.3, 2.3, 0.0] }, to: { p: [4.8, 1.0, 9.2], l: [1.4, 2.5, 0.1] }, keys: ['outro.2'] },
      // E3 오늘 · 간판을 올려다본다
      { cut: true, from: { p: [9.6, 2.2, 10.8], l: [1.6, 2.0, 0.2] }, to: { p: [8.4, 2.6, 10.0], l: [1.4, 2.1, 0.1] }, keys: ['outro.3', 'outro.4'] },
      // E4 크레인처럼 멀어진다 — 동네 속 창고 하나
      { cut: true, min: 5.2, from: { p: [13.4, 5.6, 16.0], l: [2.0, 1.0, 0.6] }, to: { p: [22.0, 13.0, 26.0], l: [2.0, 0.6, 0.4] }, keys: ['outro.5'] },
      // 암전 위 마지막 한 줄
      { dark: true, min: 3.4, from: { p: [22.0, 13.0, 26.0], l: [2.0, 0.6, 0.4] }, to: { p: [22.4, 13.2, 26.4], l: [2.0, 0.6, 0.4] }, keys: ['outro.end'] },
    ],
    cards: [],
    cues: [
      { shot: 1, at: 0.02, f: () => SFX.recallIn() },
      { shot: 2, at: 0.02, f: () => SFX.recallOut() },
      { shot: 4, at: 0.1, f: () => { try { BGM.oneShot('fanfare'); } catch (e) { } } },
    ],
  };

  const lerp3 = (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const portrait = (who, expr) => (window.Story ? Story.sprite(who, expr, false) : '');
  // '<br>' 은 한 글자로 친다 — 타자 중에 태그가 반쯤 잘려 나오면 안 된다
  const tokens = html => html.split(/(<br\s*\/?>)/i).reduce((a, part) => (/^<br/i.test(part) ? (a.push('<br>'), a) : a.concat(part.split(''))), []);

  // 문구 길이에서 타임라인을 만든다. 문구를 고치면 샷 길이가 따라 늘어난다
  function build(seq, cardsIn, cuesIn, params) {
    seq = seq || SEQ; cardsIn = cardsIn || CARDS; cuesIn = cuesIn || CUES;
    const C = cps();
    const shots = [], lines = [], cards = [], cues = [];
    let t = 0;
    seq.forEach((s, si) => {
      const start = t;
      let dur = 0;
      for (const k of s.keys) {
        const tk = tokens(T(k, params || {}));
        const typ = tk.length * C;
        lines.push({ t: start + dur, lead: LEAD, type: typ, d: LEAD + typ + HOLD, k, tk, recall: !!s.recall });
        dur += LEAD + typ + HOLD + GAP;
      }
      dur = Math.max(dur, s.min || 0);
      shots.push({ start, dur, cut: !!s.cut, home: !!s.home, truck: !!s.truck, dark: !!s.dark, from: s.from, to: s.to });
      t += dur;
    });
    for (const c of cardsIn) cards.push(Object.assign({}, c, { t: shots[c.shot].start + c.at }));
    for (const c of cuesIn) cues.push({ t: shots[c.shot].start + c.at, f: c.f });
    cues.sort((a, b) => a.t - b.t);
    return { shots, lines, cards, cues, total: t };
  }

  function play(scene, done, opts) {
    opts = opts || {};
    const outro = !!opts.outro;
    const app = document.getElementById('app'), sceneEl = document.getElementById('scene');
    const end = () => { done && done(); };
    // ?nointro — 테스트·반복 확인용 (오프닝을 건너뛰고 바로 1턴)
    if (!scene || !scene.camera || !app || !sceneEl || /(\?|&)nointro\b/.test(location.search)) { end(); return null; }

    const { shots: SHOTS, lines: LINES, cards: CARDS2, cues: CUES2, total: TOTAL } = outro ? build(OUTRO.seq, OUTRO.cards, OUTRO.cues, opts.params) : build();

    const ov = document.createElement('div');
    ov.id = 'intro';
    ov.innerHTML = '<div class="ibar top"></div><div class="ibar bot"></div>'
      + '<div class="icard" id="intro-card"><img alt=""><div><b></b><span></span></div></div>'
      + '<div class="iline"><span id="intro-line"></span></div>'
      + '<button class="btn small" id="intro-skip"></button>'
      + '<div class="ifade" id="intro-fade"></div>';
    document.body.appendChild(ov);
    const lineEl = ov.querySelector('#intro-line'), fadeEl = ov.querySelector('#intro-fade');
    const cardEl = ov.querySelector('#intro-card'), cardImg = cardEl.querySelector('img');
    const cardName = cardEl.querySelector('b'), cardDesc = cardEl.querySelector('span');
    ov.querySelector('#intro-skip').textContent = T('intro.skip');
    ov.style.setProperty('--bar', '0vh');
    // 창고 뷰 높이와 '그 아래를 덮는 검은 띠'는 한 값에서 나온다
    const setBasis = pct => { sceneEl.style.flexBasis = pct + '%'; ov.style.setProperty('--bot', (101 - pct) + '%'); };

    // 평소 창고 뷰 높이는 화면에 따라 다르다 (짧은 화면은 25%) — 상수로 박지 않고 지금 값을 읽는다
    const BASE = parseFloat(getComputedStyle(sceneEl).flexBasis) || 29;
    app.classList.add('cine');
    document.body.classList.add('cine');   // 데스크톱에서 앱 양옆 여백까지 검게
    setBasis(WIDE);
    scene.cine = true;
    scene.resize();
    scene.camera.fov = FOV; scene.camera.updateProjectionMatrix();
    scene.camSet(SHOTS[0].from.p, SHOTS[0].from.l);
    scene.close(true);   // 밖에서 보는 동안은 벽이 다 있는 '완성된 창고' 다
    const truckX = scene.truck ? scene.truck.position.x : null;
    if (scene.truck && !outro) scene.truck.position.x = TRUCK_OFF;   // 마당은 비어 있다 — 탑차는 S5 에 들어온다

    let over = false, look = SHOTS[0].from.l.slice(), homeFrom = null, homeTo = null;
    let shownKey = null, shownN = -1, recall = false, shownCard = null, fired = 0, truckIn = false, narrN = 0;
    const finish = () => {
      if (over) return; over = true;
      scene.cineStep = null;
      scene.cine = false;
      scene.close(false);   // 건너뛰어도 앞면은 벗겨진 채로 (플레이 화면은 단면이다)
      if (scene.truck && truckX !== null) { scene.dropTween('introtruck'); scene.truck.position.x = truckX; }
      sceneEl.style.flexBasis = '';
      app.classList.remove('cine', 'recall');
      document.body.classList.remove('cine');
      app.style.removeProperty('--hud-a');
      scene.resize();
      ov.classList.add('out');
      setTimeout(() => { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 280);
      end();
    };
    ov.addEventListener('click', finish);
    ov.addEventListener('touchstart', finish, { passive: true });

    const t0 = performance.now();
    // scene3d 의 렌더 루프가 render() 직전에 매 프레임 불러 준다
    const step = () => {
      if (over) return;
      const t = (performance.now() - t0) / 1000;
      if (t >= TOTAL) { finish(); return; }

      let i = 0;
      while (i < SHOTS.length - 1 && t >= SHOTS[i].start + SHOTS[i].dur) i++;
      const s = SHOTS[i], e = ease(clamp01((t - s.start) / s.dur));
      if (s.home) {
        if (!homeFrom) {
          homeFrom = { p: scene.camera.position.toArray(), l: look.slice(), fov: scene.camera.fov };
          // 착지점은 '줄어든 뒤의 화면'에서 잰다 — 줄어드는 동안 실시간으로 따라가면 화면비가 바뀌는 순간 카메라가 튄다
          sceneEl.style.flexBasis = BASE + '%'; scene.resize();
          homeTo = scene.camHome();
          sceneEl.style.flexBasis = WIDE + '%'; scene.resize();
          scene.close(false, true);   // 카메라가 안으로 들어오는 순간 앞면이 들려 올라간다
        }
        setBasis(WIDE + (BASE - WIDE) * e);
        scene.resize();
        scene.camera.fov = homeFrom.fov + (homeTo.fov - homeFrom.fov) * e;
        scene.camera.updateProjectionMatrix();
        scene.camSet(lerp3(homeFrom.p, homeTo.p, e), lerp3(homeFrom.l, homeTo.l, e));
        ov.style.setProperty('--bar', (1 - e) * BAR + 'vh');
        app.style.setProperty('--hud-a', e.toFixed(3));
      } else {
        look = lerp3(s.from.l, s.to.l, e);
        scene.camSet(lerp3(s.from.p, s.to.p, e), look);
        ov.style.setProperty('--bar', Math.min(1, t / 0.45) * BAR + 'vh');
        if (s.truck && !truckIn) { truckIn = true; if (scene.truckTo) scene.truckTo(TRUCK_X, 2.8); }
      }

      // 암전: 시작 페이드인 + 컷
      let dark = clamp01(1 - t / 0.5);
      if (outro) for (const sh of SHOTS) if (sh.dark) dark = Math.max(dark, clamp01((t - sh.start + 0.9) / 0.9));
      for (const sh of SHOTS) if (sh.cut) dark = Math.max(dark, clamp01(1 - Math.abs(t - sh.start) / CUT));
      fadeEl.style.opacity = dark.toFixed(3);

      // 효과음
      while (fired < CUES2.length && t >= CUES2[fired].t) { try { CUES2[fired].f(); } catch (err) { } fired++; }

      // 자막 — 한 글자씩 친다
      let cur = null, alpha = 0;
      for (const L of LINES) {
        if (t < L.t || t > L.t + L.d) continue;
        cur = L; alpha = Math.min(clamp01((t - L.t) / 0.3), clamp01((L.t + L.d - t) / 0.35));
      }
      if (cur) {
        if (shownKey !== cur.k) { shownKey = cur.k; shownN = -1; }
        const n = Math.max(0, Math.min(cur.tk.length, Math.floor((t - cur.t - cur.lead) / cps()) + 1));
        if (n !== shownN) {
          if (n > shownN && shownN >= 0 && cur.tk[n - 1] !== '<br>' && cur.tk[n - 1] !== ' ') { try { SFX.narrate(narrN++); } catch (err) { } }
          shownN = n;
          lineEl.innerHTML = cur.tk.slice(0, n).join('') + (n < cur.tk.length ? '<i class="caret"></i>' : '');
        }
      } else { shownKey = null; shownN = -1; }
      lineEl.parentNode.style.opacity = (cur ? alpha : 0).toFixed(3);

      // 세피아는 '자막이 바뀌는 순간'에만 갈아탄다 — 한 줄을 읽는 도중에 색이 변하면 안 된다
      const want = cur ? !!cur.recall : recall;
      if (want !== recall && (!cur || alpha < 0.08)) { recall = want; app.classList.toggle('recall', recall); ov.classList.toggle('recall', recall); }

      // 인물 소개 카드
      let card = null, cAlpha = 0;
      for (const C of CARDS2) {
        if (t < C.t || t > C.t + C.d) continue;
        card = C; cAlpha = Math.min(clamp01((t - C.t) / 0.4), clamp01((C.t + C.d - t) / 0.4));
      }
      if (card && shownCard !== card.who) {
        shownCard = card.who;
        cardImg.src = portrait(card.who, card.expr);
        cardName.textContent = T(card.name); cardDesc.textContent = card.desc ? T(card.desc) : '';
        try { SFX.card(); } catch (err) { }
      }
      if (!card) shownCard = null;
      cardEl.style.opacity = (card ? cAlpha : 0).toFixed(3);
      cardEl.style.transform = 'translateX(' + ((card ? (1 - cAlpha) : 1) * -22).toFixed(1) + 'px)';
    };
    scene.cineStep = step;
    return { skip: finish };
  }

  return { play, build };
})();
