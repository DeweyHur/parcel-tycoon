// 오프닝 씬 — 서장을 처음 시작할 때 한 번 (docs/STORY_TUTORIAL_DESIGN.md 부록 X).
// 왜: 첫 화면이 곧장 '창고 + 버튼'이면 플레이어는 자기가 어디에 서 있는지 모른 채 조작부터 배운다.
//     박 반장이 입을 열기 전에, 카메라가 먼저 장소와 날짜를 보여 준다.
// 규칙: 조작은 하나도 없다. 아무 데나 누르면 즉시 끝난다. 끝나면 화면이 제자리로 돌아오며 그대로 게임이 시작된다.
//     마지막 샷은 컷이 아니라 '게임 카메라로 착지'다 — 오프닝과 플레이 화면 사이에 이음매가 없어야 한다.
window.Intro = (function () {
  const T = (k, p) => (window.I18n ? I18n.t(k, p) : k);
  const ease = t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
  const WIDE = 62;        // 오프닝 동안의 flex-basis (%). 100 이면 화면이 세로로 길어져 가로 화각이 20도까지 좁아진다 — 벽만 찍힌다
  const FOV = 46;         // 오프닝 화각. 마지막 샷에서 게임 화각(38)으로 건너간다
  const BAR = 9;          // 레터박스 높이 (vh)
  const CUT = 0.22;       // 컷 암전 반폭 (초)
  const TRUCK_X = 7.6;    // 오프닝 동안 탑차를 도크 밖에 세워 둔다 (평소 대기 자리 12 는 화면 밖이다)

  // 샷: p = 카메라 자리, l = 바라보는 곳. 좌표는 scene3d.js 의 창고 좌표계다
  //   거리는 게임 카메라(≈11)와 비슷하게 잡는다 — 세로 화면은 가로 화각이 24도쯤이라 가까이 가면 벽만 찍힌다
  //   A 도로 — 길가에 선 트럭(x 12, z 1.8)을 앞에 두고 창고 쪽으로 미끄러진다
  //   B 창고 앞 — 도크와 셔터를 낮게 훑으며 다가간다
  //   C 착지 — 게임 카메라로 떠오르면서 화면이 제자리로 줄어든다
  const SHOTS = [
    { dur: 3.6, from: { p: [14.8, 4.7, 14.2], l: [3.4, 0.9, 0.9] }, to: { p: [12.6, 4.3, 13.0], l: [3.0, 0.9, 0.7] } },
    { dur: 3.6, cut: true, from: { p: [10.2, 3.1, 11.0], l: [1.7, 0.9, 0.0] }, to: { p: [8.4, 3.4, 10.0], l: [1.4, 0.85, -0.2] } },
    { dur: 3.8, home: true },
  ];
  // 자막은 샷 경계에 딱 맞추지 않는다 — 한 줄이 컷을 넘어가야 두 샷이 한 장면으로 읽힌다
  const LINES = [
    { t: 0.5, d: 2.1, k: 'intro.1' },
    { t: 2.9, d: 3.0, k: 'intro.2' },
    { t: 6.2, d: 2.8, k: 'intro.3' },
    { t: 9.3, d: 1.7, k: 'intro.4' },
  ];
  const TOTAL = SHOTS.reduce((s, x) => s + x.dur, 0);
  const lerp3 = (a, b, e) => [a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e];
  const clamp01 = v => Math.max(0, Math.min(1, v));

  function play(scene, done) {
    const app = document.getElementById('app'), sceneEl = document.getElementById('scene');
    const end = () => { done && done(); };
    // ?nointro — 테스트·반복 확인용 (오프닝을 건너뛰고 바로 1턴)
    if (!scene || !scene.camera || !app || !sceneEl || /(\?|&)nointro\b/.test(location.search)) { end(); return null; }

    const ov = document.createElement('div');
    ov.id = 'intro';
    ov.innerHTML = '<div class="ibar top"></div><div class="ibar bot"></div>'
      + '<div class="iline"><span id="intro-line"></span></div>'
      + '<button class="btn small" id="intro-skip"></button>'
      + '<div class="ifade" id="intro-fade"></div>';
    document.body.appendChild(ov);
    const lineEl = ov.querySelector('#intro-line'), fadeEl = ov.querySelector('#intro-fade');
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
    const truckX = scene.truck ? scene.truck.position.x : null;
    if (scene.truck) scene.truck.position.x = TRUCK_X;

    let over = false, look = SHOTS[0].from.l.slice(), homeFrom = null, homeTo = null, shownKey = null;
    const finish = () => {
      if (over) return; over = true;
      scene.cineStep = null;
      scene.cine = false;
      if (scene.truck && truckX !== null) scene.truck.position.x = truckX;
      sceneEl.style.flexBasis = '';
      app.classList.remove('cine');
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
          sceneEl.style.flexBasis = WIDE + '%'; scene.resize();   // 잰 뒤 되돌린다 (--bot 은 아래에서 다시 맞춘다)
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
      }

      // 암전: 시작 페이드인 + 컷
      let dark = clamp01(1 - t / 0.5);
      for (let j = 0, a = 0; j < SHOTS.length; a += SHOTS[j].dur, j++) if (SHOTS[j].cut) dark = Math.max(dark, clamp01(1 - Math.abs(t - a) / CUT));
      fadeEl.style.opacity = dark.toFixed(3);

      // 자막
      let cur = null, alpha = 0;
      for (const L of LINES) {
        if (t < L.t || t > L.t + L.d) continue;
        cur = L; alpha = Math.min(clamp01((t - L.t) / 0.35), clamp01((L.t + L.d - t) / 0.35));
      }
      if (cur && shownKey !== cur.k) { shownKey = cur.k; lineEl.textContent = T(cur.k); }
      if (!cur) shownKey = null;
      lineEl.parentNode.style.opacity = (cur ? alpha : 0).toFixed(3);
    };
    scene.cineStep = step;
    return { skip: finish };
  }

  return { play, TOTAL };
})();
