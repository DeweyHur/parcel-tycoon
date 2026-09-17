// 오프닝 씬 — 서장을 시작할 때마다 (docs/STORY_TUTORIAL_DESIGN.md 부록 X·Z).
// 왜: 첫 화면이 곧장 '창고 + 버튼'이면 플레이어는 자기가 어디에 서 있는지 모른 채 조작부터 배운다.
//     박 반장이 입을 열기 전에, 카메라가 먼저 장소와 사람과 사정을 보여 준다.
// 규칙: 조작은 하나도 없다. 아무 데나 누르면 즉시 끝난다. 끝나면 화면이 제자리로 돌아오며 그대로 게임이 시작된다.
//     마지막 샷은 컷이 아니라 '게임 카메라로 착지'다 — 오프닝과 플레이 화면 사이에 이음매가 없어야 한다.
window.Intro = (function () {
  const T = (k, p) => (window.I18n ? I18n.t(k, p) : k);
  const ease = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
  const WIDE = 62;        // 오프닝 동안의 flex-basis (%). 100 이면 화면이 세로로 길어져 가로 화각이 20도까지 좁아진다 — 벽만 찍힌다
  const FOV = 46;         // 오프닝 화각. 마지막 샷에서 게임 화각(38)으로 건너간다
  const BAR = 9;          // 레터박스 높이 (vh)
  const CUT = 0.22;       // 컷 암전 반폭 (초)
  const TRUCK_X = 7.6;    // 탑차가 들어와 서는 자리 (도크 밖)
  const TRUCK_OFF = 24;   // 화면 밖 — 오프닝은 빈 마당에서 시작한다

  // 거리는 게임 카메라(≈11)와 비슷하게 잡는다 — 세로 화면은 가로 화각이 37도쯤이라 가까이 가면 벽만 찍힌다
  // recall 샷은 '회상'이다. 세피아는 샷이 아니라 자막에 걸린다 (LINES.recall) — 대사 중간에 색이 변하면 안 되니까
  const SHOTS = [
    // S1 오늘 아침 · 길 건너. 마당은 비어 있다
    { dur: 4.6, from: { p: [15.0, 4.9, 15.8], l: [3.4, 1.0, 1.4] }, to: { p: [13.2, 4.6, 14.9], l: [3.1, 1.0, 1.2] } },
    // S2 회상 · 창고 옆구리, 오래 드나든 자리
    { dur: 5.0, cut: true, from: { p: [-8.8, 3.1, 10.2], l: [0.2, 1.2, 0.2] }, to: { p: [-6.6, 2.9, 11.0], l: [0.8, 1.2, 0.3] } },
    // S3 회상 · 셔터 앞. 짐을 같이 내리던 자리
    { dur: 5.0, cut: true, from: { p: [7.6, 2.1, 11.8], l: [2.6, 1.3, 0.6] }, to: { p: [6.2, 2.3, 10.9], l: [2.3, 1.3, 0.5] } },
    // S4 회상 · 더 가까이. 영감님이 말한 그날
    { dur: 5.0, cut: true, from: { p: [5.2, 0.9, 9.6], l: [1.4, 2.5, 0.1] }, to: { p: [4.2, 1.15, 8.7], l: [1.3, 2.3, 0.0] } },
    // S5 오늘 · 색이 돌아오고, 탑차가 들어온다
    { dur: 5.2, cut: true, truck: true, from: { p: [11.4, 3.5, 13.4], l: [2.0, 1.0, 0.8] }, to: { p: [9.0, 3.6, 12.0], l: [1.6, 0.95, 0.4] } },
    // S6 착지 — 앞면이 들리고 화면이 제자리로
    { dur: 4.6, home: true },
  ];
  // 샷 경계(암전)와 줄 사이 공백이 맞물리게 짰다. 한 줄이 컷을 넘어가면 그 줄 도중에 색이 바뀐다
  const LINES = [
    { t: 0.6, d: 2.0, k: 'intro.1' },
    { t: 2.9, d: 1.6, k: 'intro.2' },
    { t: 5.0, d: 2.6, k: 'intro.3', recall: true },
    { t: 7.9, d: 1.6, k: 'intro.4', recall: true },
    { t: 10.1, d: 2.9, k: 'intro.5', recall: true },
    { t: 13.3, d: 1.2, k: 'intro.6', recall: true },
    { t: 15.1, d: 2.5, k: 'intro.7', recall: true },
    { t: 17.9, d: 1.6, k: 'intro.8', recall: true },
    { t: 20.6, d: 2.6, k: 'intro.9' },
    { t: 23.5, d: 1.2, k: 'intro.10' },
    { t: 25.6, d: 3.2, k: 'intro.11' },
  ];
  // 인물 소개 — 대화창이 아니라 영화 자막처럼 옆에서 밀려 들어왔다 빠진다
  const CARDS = [
    { t: 5.6, d: 4.0, who: 'han', expr: 'smile', name: 'card.han.name', desc: 'card.han.desc' },
    { t: 21.2, d: 4.0, who: 'park', expr: 'neutral', name: 'card.park.name', desc: 'card.park.desc' },
  ];
  // 소리: 회상에 들고 나는 숨, 탑차, 셔터
  const CUES = [
    { t: 4.9, f: () => SFX.recallIn() },
    { t: 19.9, f: () => SFX.recallOut() },
    { t: 20.3, f: () => SFX.truck() },
    { t: 23.0, f: () => SFX.horn() },
    { t: 25.0, f: () => SFX.shutter() },
  ];
  const TOTAL = SHOTS.reduce((s, x) => s + x.dur, 0);
  const lerp3 = (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const portrait = (who, expr) => (window.Story ? Story.sprite(who === 'park' ? 'park' : who, expr, false) : '');

  function play(scene, done) {
    const app = document.getElementById('app'), sceneEl = document.getElementById('scene');
    const end = () => { done && done(); };
    // ?nointro — 테스트·반복 확인용 (오프닝을 건너뛰고 바로 1턴)
    if (!scene || !scene.camera || !app || !sceneEl || /(\?|&)nointro\b/.test(location.search)) { end(); return null; }

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
    if (scene.truck) scene.truck.position.x = TRUCK_OFF;   // 마당은 비어 있다 — 탑차는 S5 에 들어온다

    let over = false, look = SHOTS[0].from.l.slice(), homeFrom = null, homeTo = null;
    let shownKey = null, recall = false, shownCard = null, fired = 0, truckIn = false;
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

      let acc = 0, i = 0;
      while (i < SHOTS.length - 1 && t >= acc + SHOTS[i].dur) { acc += SHOTS[i].dur; i++; }
      const s = SHOTS[i], e = ease(clamp01((t - acc) / s.dur));
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
        if (s.truck && !truckIn) { truckIn = true; if (scene.truckTo) scene.truckTo(TRUCK_X, 2.6); }
      }

      // 암전: 시작 페이드인 + 컷
      let dark = clamp01(1 - t / 0.5);
      for (let j = 0, a = 0; j < SHOTS.length; a += SHOTS[j].dur, j++) if (SHOTS[j].cut) dark = Math.max(dark, clamp01(1 - Math.abs(t - a) / CUT));
      fadeEl.style.opacity = dark.toFixed(3);

      // 효과음
      while (fired < CUES.length && t >= CUES[fired].t) { try { CUES[fired].f(); } catch (err) { } fired++; }

      // 자막
      let cur = null, alpha = 0;
      for (const L of LINES) {
        if (t < L.t || t > L.t + L.d) continue;
        cur = L; alpha = Math.min(clamp01((t - L.t) / 0.35), clamp01((L.t + L.d - t) / 0.35));
      }
      if (cur && shownKey !== cur.k) { shownKey = cur.k; lineEl.innerHTML = T(cur.k); }
      if (!cur) shownKey = null;
      lineEl.parentNode.style.opacity = (cur ? alpha : 0).toFixed(3);

      // 세피아는 '자막이 바뀌는 순간'에만 갈아탄다 — 한 줄을 읽는 도중에 색이 변하면 안 된다
      const want = cur ? !!cur.recall : recall;
      if (want !== recall && (!cur || alpha < 0.08)) { recall = want; app.classList.toggle('recall', recall); ov.classList.toggle('recall', recall); }

      // 인물 소개 카드
      let card = null, cAlpha = 0;
      for (const C of CARDS) {
        if (t < C.t || t > C.t + C.d) continue;
        card = C; cAlpha = Math.min(clamp01((t - C.t) / 0.4), clamp01((C.t + C.d - t) / 0.4));
      }
      if (card && shownCard !== card.who) {
        shownCard = card.who;
        cardImg.src = portrait(card.who, card.expr);
        cardName.textContent = T(card.name); cardDesc.textContent = T(card.desc);
        try { SFX.card(); } catch (err) { }
      }
      if (!card) shownCard = null;
      cardEl.style.opacity = (card ? cAlpha : 0).toFixed(3);
      cardEl.style.transform = 'translateX(' + ((card ? (1 - cAlpha) : 1) * -22).toFixed(1) + 'px)';
    };
    scene.cineStep = step;
    return { skip: finish };
  }

  return { play, TOTAL };
})();
