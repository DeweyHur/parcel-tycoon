// 로우폴리 창고 장면 (Three.js)
window.Scene3D = (function () {
  const CELL = 0.6;
  // 창고는 착탈식이다 — 아래는 '최대치'이고, 실제 크기는 warehouse 상태에서 매번 계산한다 (_zonesFor)
  const MAIN = { x0: -1.2, cells: 8, maxDepth: 7 };   // 일반 구역 (오른쪽). 깊이가 창고 칸수를 따라 자란다
  const COLD = { x0: -4.6, cells: 4, maxDepth: 7 };   // 냉장/냉동 구역 (왼쪽). 0칸이면 아예 안 붙는다
  const YARD = { cells: 11, depth: 2 };               // 야외 적재 (창고 앞, 지붕 밖)
  const BACK_Z = -1.7, ROW_Z = -1.3, DOCK_X = 4.6;    // 뒷벽 · 첫 줄 시작 · 도크(오른쪽 끝)
  const FULL = { x0: -5.2, front: 3.35, width: 9.8 }; // 만재 기준(옛 고정 모델) — 카메라 보정의 기준점
  const BARE = { cap: 16, cold: 0, frozen: 0 };       // 아무것도 안 붙은 맨 창고 (첫 프레임·타이틀)
  const WX = {
    sunny: { hemi: 0xdfefff, hemiI: 0.9, sunI: 1.1, clear: [0x000000, 0], rain: 0, snow: 0 },
    rain:  { hemi: 0x9fb0c8, hemiI: 0.7, sunI: 0.45, clear: [0x5d6b80, 0.5], rain: 420, snow: 0 },
    heat:  { hemi: 0xffd0a0, hemiI: 1.0, sunI: 1.5, clear: [0xff9a3c, 0.22], rain: 0, snow: 0 },
    snow:  { hemi: 0xe8f0ff, hemiI: 0.95, sunI: 0.7, clear: [0xdfe8f0, 0.45], rain: 0, snow: 320 },
    storm: { hemi: 0x6a7090, hemiI: 0.55, sunI: 0.3, clear: [0x2e3348, 0.7], rain: 700, snow: 0 },
  };
  // 구역 표지용 도트 아이콘 (픽셀 UI와 결 맞추기 — 이모지 대신 직접 찍는다)
  const SIGN_ICONS = {
    cold: ['X..X..X', '.X.X.X.', '..XXX..', 'XXXXXXX', '..XXX..', '.X.X.X.', 'X..X..X'],
    frozen: ['X..X..X', '.XXXXX.', '.XXXXX.', 'XXXXXXX', '.XXXXX.', '.XXXXX.', 'X..X..X'],   // 두툼한 얼음 결정 (냉장의 가는 눈송이와 구분)
    rain: ['...XXX...', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', '.........', '..X..X..X', '.X..X..X.', 'X..X..X..'],
  };
  const SIGN = { bg: '#2a2740', line: '#0f0e1a', hi: '#3d3a5c', alt: '#eef6ff', unit: 0.036, scale: 2 };
  const FOOT = { 1: [1, 1, 0.65], 2: [2, 1, 0.78], 4: [2, 2, 1.18], 7: [3, 2, 1.85] }; // [w, d, h] — 화면에서 상자 크기와 적재량을 즉시 읽을 수 있게 높이를 강조한다.
  const TRUCK_PARK = 12, TRUCK_DOCK = 6.7, TRUCK_GONE = 17;

  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  // 지붕·기둥은 그림자를 던지지 않는다 (실내가 통째로 어두워진다). 받기는 한다
  function noShadow(m) { m.traverse(o => { if (o.isMesh) o.castShadow = false; }); return m; }
  function bounce(t) { if (t < 1 / 2.75) return 7.5625 * t * t; if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75; if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375; return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375; }

  class Scene3D {
    constructor(container) {
      this.container = container;
      this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.BasicShadowMap;
      container.appendChild(this.renderer.domElement);
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      this.camX = 2.6; this.camera.position.set(2.6, 7.8, 9.8);
      this.camera.lookAt(1.3, 0.3, 0.3);
      this.tweens = []; this.boxes = new Map(); this.clock = new THREE.Clock(); this.time = 0;
      this.busy = 0;
      this.parts = {};                     // 착탈식 모듈: shell · cold · yard · van
      this.Z = this._zonesFor(BARE);   // 첫 프레임: 냉장·냉동 없는 맨 창고 (sync 가 곧 진짜 창고로 덮는다)
      this._buildTerrain();
      this._syncBuilding(BARE);
      this._buildWeather();
      this.weather = 'sunny';
      this.resize();
      // 픽셀 폰트가 늦게 로드되면 간판을 다시 굽는다
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.signCache = null; if (this.tileCaps) this._buildTiles(...this.tileCaps); });
      window.addEventListener('resize', () => this.resize());
      this._loop();
    }
    resize() {
      const w = this.container.clientWidth || 360, h = this.container.clientHeight || 220;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      const a = w / h;
      // 세로형/가로형에서 화각이 다르다. 오프닝 중에는 intro.js 가 두 값 사이를 부드럽게 건너간다 (여기서 바꾸면 딱 끊긴다)
      const fov = a < 0.9 ? 42 : 34; this.camFov = fov;
      if (!this.cine) this.camera.fov = fov;
      // 넓은 화면(가로형)이면 카메라를 왼쪽으로 옮겨 냉장 구역이 잘리지 않게
      // 장면 가로 범위는 x -5.2(냉장 벽)~5.7(도크). 세로형(a<0.9)은 창고 중앙(2.6) 기준, 그 외는 가운데(0.3)를 보되 다 들어올 때까지 카메라를 뒤로
      // 건물이 작아지면 카메라도 같이 당겨 온다 (모델이 먼저 바뀌고, 카메라는 그것을 따라갈 뿐)
      const Z = this.Z || this._zonesFor(BARE);
      // 왼쪽(냉장실)이 없으면 그만큼 오른쪽으로, 건물이 작으면 그만큼 가깝게. 보는 높이(z)는 그대로 둔다
      const dx = (Z.x0 - FULL.x0) / 2;
      const spanX = (Z.x1 + 1.2 - Z.x0) / 11, spanZ = (Z.yardZ0 + Z.YARD.depth * CELL + 0.3 - BACK_Z) / 6.35;
      const k = Math.max(0.96, Math.min(1, Math.max(spanX, spanZ)));   // 작아져도 너무 붙지는 않는다 — 건물이 자라는 게 보여야 하니까
      if (a < 0.9) { const fx = 1.3 + dx; this.camX = fx + 1.15 * k; this.camY = 0.45 + 6.45 * k; this.camZ = 0.65 + 8.2 * k; this.camLook = [fx, 0.45, 0.65]; }
      else { const need = 6.4 * k / (Math.tan(fov / 2 * Math.PI / 180) * a); const kk = Math.max(1, need / 12.1); const fx = 0.1 + dx; this.camX = fx + 0.2; this.camY = 0.45 + 6.45 * kk * k; this.camZ = 0.65 + 8.2 * kk * k; this.camLook = [fx, 0.45, 0.65]; }
      // 오프닝 중에는 카메라를 intro.js 가 몬다 — 여기서는 자리만 계산해 두고 건드리지 않는다
      if (!this.cine) { this.camera.position.set(this.camX, this.camY, this.camZ); this.camera.lookAt(this.camLook[0], this.camLook[1], this.camLook[2]); }
      this.camera.updateProjectionMatrix();
    }
    _mat(color, opts = {}) { return new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts }); }
    _box(w, h, d, color, opts) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this._mat(color, opts));
      m.castShadow = true; m.receiveShadow = true;
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x1b1a2e, transparent: true, opacity: 0.55 }));
      m.add(edges);
      return m;
    }
    // 창고 상태 → 실제 구역·발자국. "칸 수가 늘면 건물이 자란다"를 여기 한 곳에서 정한다
    _zonesFor(wh) {
      const cap = Math.max(1, wh.cap || 1), coldCells = (wh.cold || 0) + (wh.frozen || 0);
      const mainDepth = Math.max(2, Math.min(MAIN.maxDepth, Math.ceil(cap / MAIN.cells)));
      const coldDepth = coldCells > 0 ? Math.max(1, Math.min(COLD.maxDepth, Math.ceil(coldCells / COLD.cells))) : 0;
      const frontZ = ROW_Z + mainDepth * CELL + 0.45;     // 앞벽(셔터) 자리 = 실내의 끝
      const yardZ0 = frontZ + 0.35;                        // 야외 적재는 앞벽 '바깥' 이다 — 지붕도 바닥도 건물 것이 아니다
      const x0 = coldDepth ? COLD.x0 - 0.6 : MAIN.x0 - 0.5;
      const yardX0 = Math.max(-2.4, x0 + 0.3);
      return {
        MAIN: { x0: MAIN.x0, cells: MAIN.cells, depth: mainDepth, z0: ROW_Z },
        COLD: { x0: COLD.x0, cells: COLD.cells, depth: coldDepth, z0: ROW_Z },
        YARD: { x0: yardX0, cells: Math.max(4, Math.floor((DOCK_X - 0.2 - yardX0) / CELL)), depth: YARD.depth, z0: yardZ0 },
        x0, x1: DOCK_X, frontZ, yardZ0,
        roadZ: yardZ0 + YARD.depth * CELL + 1.0,          // 도로는 마당 너머 (창고가 깊어지면 같이 밀린다)
      };
    }
    // 착탈: 창고가 바뀌면 바뀐 모듈만 다시 짓는다. 처음 짓는 게 아니면 위에서 내려앉는다
    _syncBuilding(wh, opts) {
      const sig = [wh.cap, wh.cold || 0, wh.frozen || 0, ['coldvan', 'padvan', 'bigvan'].filter(k => wh[k]).length].join('/');
      if (sig === this.buildSig) return false;
      // 런을 처음 그릴 때는 조용히 짓고, 게임 중에 바뀐 것(확장·냉장실·차량)만 내려앉는다
      const first = !this.buildSig || !!(opts && opts.silent);
      this.buildSig = sig;
      const Z = this.Z = this._zonesFor(wh);
      const put = (name, group, drop) => {
        const old = this.parts[name];
        if (old) { this.scene.remove(old); }
        this.parts[name] = group || null;
        if (group) { this.scene.add(group); if (!first) this._dropIn(group, drop); }
      };
      put('shell', this._makeShell(Z), 0.7);
      put('front', this._makeFront(Z), 0.7);
      put('cold', Z.COLD.depth ? this._makeColdRoom(Z) : null, 1.8);
      put('yard', this._makeYardPad(Z), 0.5);
      const vans = ['coldvan', 'padvan', 'bigvan'].filter(k => wh[k]);
      put('van', vans.length ? this._makeVan(Z, vans[0]) : null, 1.4);
      if (this.parts.front) { this.parts.front.visible = !!this.closed; this._setAlpha(this.parts.front, 1); }
      if (this.road) { this.road.position.x = Z.x1 + 0.6 + 20; this.road.position.z = Z.roadZ; }   // 도로는 마당 너머, 건물 오른쪽으로
      if (this.truck) this.truck.position.z = Z.roadZ;
      this.tileCaps = null;   // 구역이 바뀌었으니 바닥 타일도 다시
      this.resize();
      return true;
    }
    _dropIn(group, h) {
      group.position.y += (h || 1.2);
      this.tweens.push({ obj: group.position, from: { y: group.position.y }, to: { y: group.position.y - (h || 1.2) }, dur: 0.55, fn: bounce, t: 0 });
    }
    // 본동(실내): 바닥 · 뒷벽 · 양옆 벽 · 뒤쪽 지붕 · 기둥 · 도크.
    // 앞벽(셔터)과 앞지붕은 _makeFront 가 따로 만든다 — 평소엔 벗겨 놓고(단면), 오프닝에선 씌운다(완성 건물).
    _makeShell(Z) {
      const g = new THREE.Group();
      const w = Z.x1 - Z.x0, cx = (Z.x0 + Z.x1) / 2;
      const depth = Z.frontZ - BACK_Z;
      const floor = this._box(w, 0.12, depth + 0.2, 0x9a9aa8); floor.position.set(cx, 0.0, (BACK_Z + Z.frontZ) / 2); g.add(floor);
      const back = this._box(w, 3.2, 0.25, 0xd9c8a8); back.position.set(cx, 1.6, BACK_Z); g.add(back);
      const left = this._box(0.25, 3.2, depth, 0xcdbd9e); left.position.set(Z.x0 + 0.1, 1.6, (BACK_Z + Z.frontZ) / 2); g.add(left);
      const right = this._box(0.25, 3.2, depth, 0xcdbd9e); right.position.set(Z.x1 - 0.1, 1.6, (BACK_Z + Z.frontZ) / 2); g.add(right);
      // 뒤쪽 지붕: 안이 보여야 하니 깊이의 절반만. 그림자는 안 던진다 — 던지면 실내가 통째로 어두워져 택배가 안 보인다
      const roofD = Math.max(0.9, depth * 0.5);
      const roof = this._box(w + 0.4, 0.22, roofD, 0xb8453b); roof.position.set(cx, 3.2, BACK_Z + roofD / 2 - 0.2); noShadow(roof); g.add(roof);
      for (const x of [Z.x0 + 0.3, cx, Z.x1 - 0.1]) { const p = this._box(0.22, 3.1, 0.22, 0xb59a75); p.position.set(x, 1.55, BACK_Z + 0.25); noShadow(p); g.add(p); }
      const dock = this._box(0.4, 0.05, depth + 0.4, 0xf0d060); dock.position.set(Z.x1 + 0.3, 0.08, (BACK_Z + Z.frontZ) / 2); g.add(dock);
      return g;
    }
    // 앞면(앞지붕 + 앞벽 + 셔터). 이게 붙어 있으면 밖에서 본 '완성된 창고', 벗기면 플레이용 단면이다
    _makeFront(Z) {
      const g = new THREE.Group();
      const w = Z.x1 - Z.x0, cx = (Z.x0 + Z.x1) / 2, fz = Z.frontZ;
      const depth = fz - BACK_Z, roofD = Math.max(0.9, depth * 0.5);
      const front = this._box(w + 0.4, 0.22, depth - roofD + 0.45, 0xb8453b);
      front.position.set(cx, 3.2, BACK_Z + roofD - 0.2 + (depth - roofD + 0.45) / 2); noShadow(front); g.add(front);
      // 셔터는 도크 쪽(오른쪽)에 치우쳐 있다 — 트럭이 대는 자리와 맞물려야 자연스럽다
      const sw = Math.min(2.6, w * 0.42), sx = Z.x1 - 0.5 - sw / 2;
      const lintel = this._box(w, 0.55, 0.28, 0xcdbd9e); lintel.position.set(cx, 2.85, fz); g.add(lintel);
      const lw = sx - sw / 2 - Z.x0;
      if (lw > 0.15) { const L = this._box(lw, 2.55, 0.28, 0xd9c8a8); L.position.set(Z.x0 + lw / 2, 1.3, fz); g.add(L); }
      const rw = Z.x1 - (sx + sw / 2);
      if (rw > 0.15) { const R = this._box(rw, 2.55, 0.28, 0xd9c8a8); R.position.set(Z.x1 - rw / 2, 1.3, fz); g.add(R); }
      const sh = this._box(sw, 2.5, 0.14, 0x8e8e9c); sh.position.set(sx, 1.28, fz + 0.06); g.add(sh);
      for (let i = 0; i < 4; i++) { const b = this._box(sw - 0.1, 0.07, 0.04, 0x6f6f7c); b.position.set(sx, 0.5 + i * 0.6, fz + 0.15); noShadow(b); g.add(b); }
      return g;
    }
    // 냉장실: 냉장 구역이 0칸이면 아예 안 붙는다
    _makeColdRoom(Z) {
      const g = new THREE.Group(), C = Z.COLD;
      const d = C.depth * CELL + 0.2, zc = ROW_Z + C.depth * CELL / 2;
      const cf = this._box(C.cells * CELL + 0.2, 0.06, d, 0x6cabbd); cf.position.set(C.x0 + C.cells * CELL / 2 - 0.1, 0.1, zc); g.add(cf);
      const cw = this._box(0.12, 0.5, d, 0x47869a); cw.position.set(C.x0 + C.cells * CELL + 0.06, 0.3, zc); g.add(cw);
      const cw2 = this._box(C.cells * CELL + 0.2, 0.5, 0.12, 0x47869a); cw2.position.set(cf.position.x, 0.3, ROW_Z + C.depth * CELL + 0.06); g.add(cw2);
      const lamp = this._box(0.3, 0.3, 0.3, 0x5ee0d8, { emissive: 0x2a8f8a }); lamp.position.set(C.x0 + 0.4, 2.9, -1.5); g.add(lamp);
      return g;
    }
    _makeYardPad(Z) {
      const g = new THREE.Group(), Y = Z.YARD;
      const pad = this._box(Y.cells * CELL + 0.3, 0.05, Y.depth * CELL + 0.3, 0x7d6f56);
      pad.position.set(Y.x0 + Y.cells * CELL / 2 - 0.15, 0.09, Y.z0 + Y.depth * CELL / 2 - 0.05); g.add(pad);
      return g;
    }
    // 차량 시설을 사면 마당에 그 차가 선다 (냉장 밴 · 완충 밴 · 대형 밴)
    _makeVan(Z, kind) {
      const color = kind === 'coldvan' ? 0x5ee0d8 : kind === 'padvan' ? 0xf0a04b : 0xb08bd8;
      const g = new THREE.Group();
      const body = this._box(1.1, 0.5, 0.6, color); body.position.set(0, 0.42, 0); g.add(body);
      const cabin = this._box(0.4, 0.4, 0.55, 0xe8e8f0); cabin.position.set(0.72, 0.37, 0); g.add(cabin);
      for (const [x, z] of [[-0.3, 0.32], [-0.3, -0.32], [0.62, 0.32], [0.62, -0.32]]) { const w = this._box(0.18, 0.18, 0.1, 0x2a2740); w.position.set(x, 0.17, z); g.add(w); }
      g.position.set(Math.max(Z.x0 + 0.9, Z.YARD.x0 - 0.6), 0, Z.yardZ0 + Z.YARD.depth * CELL - 0.35);   // 마당 왼쪽 끝에 세워 둔다
      return g;
    }
    _buildTerrain() {
      const s = this.scene;
      this.hemi = new THREE.HemisphereLight(0xdfefff, 0x6b8f4e, 0.9); s.add(this.hemi);
      const sun = new THREE.DirectionalLight(0xfff2d0, 1.1); this.sun = sun; sun.position.set(6, 12, 5); sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
      s.add(sun);
      // 바닥 (콘크리트) + 잔디
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), this._mat(0x6b8f4e)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; s.add(ground);
      // 건물(바닥·벽·지붕·냉장실·마당)은 착탈식이라 _syncBuilding 이 짓는다
      // 트럭
      this.truck = this._makeTruck(); this.truck.position.set(TRUCK_PARK, 0, 3.6); s.add(this.truck);   // z 는 _syncBuilding 이 도로에 맞춘다
      // 도로
      const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 3.4), this._mat(0x4a4a52)); road.rotation.x = -Math.PI / 2; road.position.set(14, -0.02, 3.6); road.receiveShadow = true; s.add(road); this.road = road;
      // 나무 몇 그루 (장식)
      [[-7.5, -3], [8.5, -3.5], [-8, 3.5]].forEach(([x, z]) => { const t = new THREE.Group(); const trunk = this._box(0.3, 0.8, 0.3, 0x8a5a3a); trunk.position.y = 0.4; const leaf = this._box(1.2, 1.2, 1.2, 0x4f9a4a); leaf.position.y = 1.4; t.add(trunk, leaf); t.position.set(x, 0, z); s.add(t); });
    }
    _buildWeather() {
      const mk = (n, size, color) => { const geo = new THREE.BufferGeometry(); const arr = new Float32Array(n * 3); for (let i = 0; i < n; i++) { arr[i * 3] = -9 + Math.random() * 18; arr[i * 3 + 1] = Math.random() * 9; arr[i * 3 + 2] = -5 + Math.random() * 13; } geo.setAttribute('position', new THREE.BufferAttribute(arr, 3)); const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, depthWrite: false })); pts.visible = false; pts.frustumCulled = false; this.scene.add(pts); return pts; };
      this.snowPts = mk(320, 0.14, 0xffffff);
      // 비: 짧은 선분 (물방울 700개 × 2점)
      const n = 700, geo = new THREE.BufferGeometry(), arr = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) { const x = -9 + Math.random() * 18, y = Math.random() * 9, z = -5 + Math.random() * 13; arr.set([x, y, z, x, y - 0.35, z], i * 6); }
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      this.rainPts = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.55 })); this.rainPts.visible = false; this.rainPts.frustumCulled = false; this.scene.add(this.rainPts);
    }
    setWeather(kind) {
      const w = WX[kind] || WX.sunny; this.weather = kind;
      this.hemi.color.setHex(w.hemi); this.hemi.intensity = w.hemiI; this.sun.intensity = w.sunI;
      this.renderer.setClearColor(w.clear[0], w.clear[1]);
      this.rainPts.visible = w.rain > 0; this.rainN = w.rain; this.rainPts.geometry.setDrawRange(0, w.rain * 2);
      this.snowPts.visible = w.snow > 0; this.snowPts.geometry.setDrawRange(0, w.snow);
    }
    _tickWeather(dt) {
      if (this.rainPts.visible) { const a = this.rainPts.geometry.attributes.position, sp = this.weather === 'storm' ? 16 : 11, drift = this.weather === 'storm' ? -5 : -0.5, len = this.weather === 'storm' ? 0.6 : 0.35, dx = this.weather === 'storm' ? 0.2 : 0.02; for (let i = 0; i < this.rainN; i++) { const o = i * 6; let y = a.array[o + 1] - sp * dt, x = a.array[o] + drift * dt; if (y < 0) { y = 9; x = -9 + Math.random() * 18; } a.array[o] = x; a.array[o + 1] = y; a.array[o + 3] = x - dx; a.array[o + 4] = y - len; a.array[o + 5] = a.array[o + 2]; } a.needsUpdate = true; }
      if (this.snowPts.visible) { const a = this.snowPts.geometry.attributes.position; for (let i = 0; i < 320; i++) { a.array[i * 3 + 1] -= 1.4 * dt; a.array[i * 3] += Math.sin(this.time * 1.5 + i) * 0.4 * dt; if (a.array[i * 3 + 1] < 0) { a.array[i * 3 + 1] = 9; a.array[i * 3] = -9 + Math.random() * 18; } } a.needsUpdate = true; }
    }
    // 용량 타일: 창고 안 바닥에 용량만큼 타일을 깔아 남은 자리를 눈으로 보게 한다 (택배 1칸 ≈ 타일 1개)
    _buildTiles(cap, cold, frozen) {
      if (this.tiles) this.scene.remove(this.tiles);
      const Z = this.Z, MAIN = Z.MAIN, COLD = Z.COLD, YARD = Z.YARD;
      const g = new THREE.Group(); this.tiles = g; this.tileCaps = [cap, cold, frozen];
      const tile = (zone, i, color) => { const x = i % zone.cells, z = Math.floor(i / zone.cells); const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.08, CELL - 0.08), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.55 })); m.rotation.x = -Math.PI / 2; m.position.set(zone.x0 + (x + 0.5) * CELL, zone === COLD ? 0.145 : 0.075, zone.z0 + (z + 0.5) * CELL); m.receiveShadow = true; g.add(m); };
      for (let i = 0; i < Math.min(cap, MAIN.cells * MAIN.depth); i++) tile(MAIN, i, 0xb9b9c6);
      for (let i = 0; i < Math.min(cold, COLD.cells * COLD.depth); i++) tile(COLD, i, 0x8fd0dc);
      for (let i = cold; i < Math.min(cold + frozen, COLD.cells * COLD.depth); i++) tile(COLD, i, 0x6c8cff);
      // 냉장/냉동 경계선
      if (frozen > 0 && cold > 0) { const row = Math.floor(cold / COLD.cells), col = cold % COLD.cells; const z = COLD.z0 + row * CELL; const mk = (x0, x1, zz) => { const w = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.12, 0.05), new THREE.MeshLambertMaterial({ color: 0x3a4a8c })); w.position.set((x0 + x1) / 2, 0.2, zz); g.add(w); }; if (col > 0) { mk(COLD.x0 + col * CELL, COLD.x0 + COLD.cells * CELL, z); mk(COLD.x0, COLD.x0 + col * CELL, z + CELL); const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, CELL), new THREE.MeshLambertMaterial({ color: 0x3a4a8c })); v.position.set(COLD.x0 + col * CELL, 0.2, z + CELL / 2); g.add(v); } else mk(COLD.x0, COLD.x0 + COLD.cells * CELL, z); }
      // 구역 표지: 냉장 / 냉동 / 야외 (카메라를 보는 픽셀 간판 스프라이트)
      const sign = (iconKey, label, accent, x, z, y) => {
        const t = this._signTexture(iconKey, label, accent);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthTest: false }));
        sp.scale.set(t.vw * SIGN.unit, t.vh * SIGN.unit, 1); sp.position.set(x, y || 0.9, z); g.add(sp);
      };
      const A = window.DATA.ATTRS, OUT = window.I18n ? window.I18n.t('hud.outdoorLabel') : '';
      if (cold > 0) sign('cold', A.cold.name, '#5ee0d8', COLD.x0 + 0.9, COLD.z0 + 0.1, 1.7);
      if (frozen > 0) { const i = Math.min(cold, COLD.cells * COLD.depth - 1); sign('frozen', A.frozen.name, '#9ad7ff', COLD.x0 + (i % COLD.cells + 0.5) * CELL + 0.4, COLD.z0 + (Math.floor(i / COLD.cells) + 0.5) * CELL); }
      sign('rain', OUT, '#c9a06c', YARD.x0 + 0.9, YARD.z0 + YARD.depth * CELL - 0.15, 0.62);   // 마당 앞자락, 낮게 — 건물 벽에 걸쳐 뜨면 안이 뚫려 보인다
      g.visible = !this.closed;   // 완성 건물(오프닝)일 때는 바닥 표시가 벽을 뚫고 보이면 안 된다
      this.scene.add(g);
    }
    relabel() { if (this.tileCaps) this._buildTiles(...this.tileCaps); }
    // 고객 마크: 이모지를 캔버스에 그려 상자 위에 붙인다
    _iconTexture(icon) {
      this.iconCache = this.iconCache || {};
      if (this.iconCache[icon]) return this.iconCache[icon];
      const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
      ctx.font = '40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(icon, 32, 36);
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; this.iconCache[icon] = tex; return tex;
    }
    // 구역 표지: 픽셀 간판 (UI와 같은 각진 테두리 + 오프셋 그림자 + Galmuri 도트 폰트)
    _signTexture(iconKey, label, accent) {
      this.signCache = this.signCache || {}; const key = iconKey + '|' + label + '|' + accent;
      if (this.signCache[key]) return this.signCache[key];
      const F = "11px 'Galmuri11', monospace";
      const ico = SIGN_ICONS[iconKey] || SIGN_ICONS.cold, iw = ico[0].length, ih = ico.length;
      const probe = document.createElement('canvas').getContext('2d'); probe.font = F;
      const tw = Math.ceil(probe.measureText(label).width);
      const vw = 2 + 3 + iw + 3 + tw + 3 + 2, vh = 20;          // 도트 단위 크기 (테두리 2 + 여백 3)
      // 1배 캔버스에 도트로 그린 뒤 정수배로만 확대 → 안티앨리어싱 없는 픽셀 간판
      const s1 = document.createElement('canvas'); s1.width = vw + 2; s1.height = vh + 2;
      const x1 = s1.getContext('2d');
      const px = (x, y, w, h, col) => { x1.fillStyle = col; x1.fillRect(x, y, w, h); };
      px(2, 2, vw, vh, SIGN.line);                               // 오프셋 그림자
      px(0, 0, vw, vh, SIGN.line);                               // 테두리
      px(2, 2, vw - 4, vh - 4, SIGN.bg);                         // 패널
      px(2, 2, vw - 4, 1, SIGN.hi);                              // 윗면 하이라이트
      const ix = 5, iy = Math.round((vh - ih) / 2);
      for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) { const ch = ico[y][x]; if (ch !== '.') px(ix + x, iy + y, 1, 1, ch === '#' ? SIGN.alt : accent); }
      x1.font = F; x1.textBaseline = 'middle'; x1.textAlign = 'left';
      x1.fillStyle = SIGN.line; x1.fillText(label, ix + iw + 4, vh / 2 + 1);   // 도트 그림자
      x1.fillStyle = accent; x1.fillText(label, ix + iw + 3, vh / 2);
      const S = SIGN.scale;
      const c = document.createElement('canvas'); c.width = s1.width * S; c.height = s1.height * S;
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(s1, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      const out = { tex, vw: s1.width, vh: s1.height };
      this.signCache[key] = out; return out;
    }
    _iconMark(icon, w, h, d) {
      const size = Math.min(0.42, Math.max(0.26, w * CELL * 0.45));
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: this._iconTexture(icon), transparent: true, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(-(w * CELL) / 4, h / 2 + 0.035, d * CELL / 6); return m;
    }
    // 다음 턴 입고 예정: 도로 위 트럭 뒤에 반투명 상자로
    _syncGhosts(specs, D) {
      if (!this.ghosts) { this.ghosts = new THREE.Group(); this.scene.add(this.ghosts); }
      const key = specs.map(s => s.type + s.size).join(',');
      if (key === this.ghostKey) return; this.ghostKey = key;
      while (this.ghosts.children.length) this.ghosts.remove(this.ghosts.children[0]);
      let z = 0.4; // 도크(노란 선) 위에 세로로
      for (const s of specs) {
        const vis = s.size >= 7 ? 7 : s.size >= 4 ? 4 : s.size >= 2 ? 2 : 1; const [w, d, h] = FOOT[vis];
        const m = new THREE.Mesh(new THREE.BoxGeometry(d * CELL - 0.08, h, w * CELL - 0.08), new THREE.MeshLambertMaterial({ color: D.PARCEL_TYPES[s.type].color, transparent: true, opacity: 0.5 }));
        m.position.set(5.05, h / 2 + 0.1, z + w * CELL / 2); this.ghosts.add(m);
        const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); m.add(e);
        z += w * CELL + 0.12;
      }
    }
    _makeTruck() {
      const g = new THREE.Group();
      const cargo = this._box(2.2, 1.3, 1.3, 0xf2ecd8); cargo.position.set(0.4, 0.95, 0); g.add(cargo);
      const cab = this._box(1.0, 1.0, 1.2, 0xe0553d); cab.position.set(-1.25, 0.75, 0); g.add(cab);
      const glass = this._box(0.2, 0.45, 1.0, 0x9ad8ff, { emissive: 0x224466 }); glass.position.set(-1.75, 0.9, 0); g.add(glass);
      const stripe = this._box(2.22, 0.22, 1.32, 0x6c8cff); stripe.position.set(0.4, 0.7, 0); g.add(stripe);
      for (const [x, z] of [[-1.15, 0.7], [-1.15, -0.7], [1.05, 0.7], [1.05, -0.7]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 8), this._mat(0x222230)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.28, z); w.castShadow = true; g.add(w); }
      this.truckCargoY = 0.95;
      return g;
    }

    // ---------- 택배 배치 ----------
    _pack(parcels, zone) {
      // 행 단위 패킹, 넘치면 구역 밖으로 계속 쌓임 (창고 초과 시각화)
      const out = new Map(); let x = 0, z = 0, rowD = 0;
      for (const p of parcels) {
        const [w, d] = FOOT[p.baseSizeVis];
        if (x + w > zone.cells) { x = 0; z += rowD; rowD = 0; }
        out.set(p.id, { cx: zone.x0 + (x + w / 2) * CELL, cz: zone.z0 + (z + d / 2) * CELL, over: z + d > zone.depth });
        x += w; rowD = Math.max(rowD, d);
      }
      return out;
    }
    _visSize(p) { return p.size >= 7 ? 7 : p.size >= 4 ? 4 : p.size >= 2 ? 2 : 1; }
    sync(game, opts = {}) {
      const D = window.DATA;
      if (game.weatherNow) this.setWeather(game.weatherNow());
      // 창고가 바뀌었으면 건물부터 다시 짓는다 (착탈식 모듈) — 그 다음 바닥 타일
      if (game.warehouse) { this._syncBuilding(game.warehouse, { silent: !this._synced }); this._synced = true; }
      { const wh = game.warehouse, caps = [wh.cap, wh.cold, wh.frozen || 0]; if (!this.tiles || !this.tileCaps || caps.some((v, i) => v !== this.tileCaps[i])) this._buildTiles(...caps); }
      if (game.upcoming) { const u = game.upcoming()[0]; this._syncGhosts(u && u.specs ? u.specs : [], D); }
      const cold = [], main = [], yard = [];
      const items = [];
      for (const s of game.storage || []) items.push({ id: 's' + s.id, type: 'storage', size: s.vol, baseSize: s.vol, baseSizeVis: s.vol >= 7 ? 7 : s.vol >= 4 ? 4 : 2, outdoor: s.outdoor, storage: true });
      for (const p of game.parcels) items.push(p);
      for (const p of items) { if (!p.storage) p.baseSizeVis = this._visSize(p); (p.outdoor ? yard : ((p.inCold || p.inFrozen) ? cold : main)).push(p); }
      const pos = new Map([...this._pack(cold, this.Z.COLD), ...this._pack(main, this.Z.MAIN), ...this._pack(yard, this.Z.YARD)]);
      // 지금 비가 오거나 예보에 비·눈이 있으면 마당에 나가 있는 것들은 젖는다
      let wetRisk = false;
      try { const w = game.weatherNow && game.weatherNow(); wetRisk = ['rain', 'snow', 'storm'].includes(w) || (game.upcoming && game.upcoming().some(u => ['rain', 'snow', 'storm'].includes(u.weather))); } catch (e) { }
      const seen = new Set();
      for (const p of items) {
        seen.add(p.id);
        let b = this.boxes.get(p.id);
        const [w, d, h] = FOOT[p.baseSizeVis];
        if (!b) {
          b = this._box(w * CELL - 0.08, h, d * CELL - 0.08, p.storage ? 0xa8845a : D.PARCEL_TYPES[p.type].color);
          // 테이프
          const tape = this._box(w * CELL - 0.06, h * 0.18, 0.12, 0xf7e9c5); tape.position.y = h * 0.42; b.add(tape);
          if (p.type === 'fragile') { const mark = this._box(0.12, h * 0.5, 0.05, 0xb8453b); mark.position.set(0, 0, d * CELL / 2 - 0.02); b.add(mark); }
          if (p.type === 'intl') { const mark = this._box(w * CELL * 0.4, 0.05, 0.16, 0xffffff); mark.position.set(0, h / 2 + 0.03, 0); b.add(mark); }
          if (p.type === 'fresh') { const mark = this._box(w * CELL * 0.5, 0.04, d * CELL * 0.5, 0xffffff); mark.position.set(0, h / 2 + 0.03, 0); b.add(mark); }
          b.userData = { h, id: p.id };
          if (!p.storage) { const cu = (window.META && window.META.CUSTOMERS[p.customer || 'anon']); if (cu) b.add(this._iconMark(cu.icon, w, h, d)); }
          this.scene.add(b); this.boxes.set(p.id, b);
          const t = pos.get(p.id);
          if (opts.animate && t) { b.position.set(t.cx, h / 2 + 4, t.cz); this._tween(b.position, { y: h / 2 }, 0.55, bounce, 0.05 * (this.tweens.length % 6)); }
          else b.position.set(t.cx, h / 2, t.cz);
        } else {
          const t = pos.get(p.id);
          if (t && !b.userData.locked && (Math.abs(b.position.x - t.cx) > 0.01 || Math.abs(b.position.z - t.cz) > 0.01)) this._tween(b.position, { x: t.cx, z: t.cz, y: h / 2 }, 0.35, ease);
        }
        // 상태 색상
        const m = b.material;
        const base = new THREE.Color(p.storage ? 0xa8845a : D.PARCEL_TYPES[p.type].color);
        if (p.wet) base.multiplyScalar(0.7);
        m.color.copy(base);
        b.userData.overdue = p.overdue || (p.type === 'fresh' && p.fresh <= 1) || false;
        // 아직 늦지는 않았지만 이번 턴이 마지막인 것 — 3D에서 이걸 못 보면 창고를 보는 의미가 없다
        b.userData.urgent = !b.userData.overdue && !p.storage && !(p.customs > 0) && p.deadline <= 1;
        b.userData.warm = p.type === 'fresh' && !p.inCold;
        b.userData.exposed = !!p.outdoor && wetRisk;
      }
      for (const [id, b] of this.boxes) if (!seen.has(id) && !b.userData.locked) { this.scene.remove(b); this.boxes.delete(id); }
    }

    // ---------- 연출 ----------
    _tween(obj, to, dur, fn = ease, delay = 0, onDone) {
      const from = {}; for (const k in to) from[k] = obj[k];
      this.tweens.push({ obj, from, to, dur, fn, t: -delay, onDone });
    }
    deliver(parcelIds, onDone) {
      // 트럭 진입 → 박스 적재 → 출발
      this.busy++;
      const boxes = parcelIds.map(id => this.boxes.get(id)).filter(Boolean);
      for (const b of boxes) b.userData.locked = true;
      this.truck.position.x = TRUCK_PARK;
      this._tween(this.truck.position, { x: TRUCK_DOCK }, 0.7, ease, 0, () => {
        boxes.forEach((b, i) => {
          const tx = this.truck.position.x + 0.4 + (i % 3) * 0.3 - 0.3, tz = this.truck.position.z;
          this._tween(b.position, { y: b.position.y + 2.2 }, 0.22, ease, i * 0.12);
          this._tween(b.position, { x: tx, z: tz, y: this.truckCargoY }, 0.3, ease, i * 0.12 + 0.22);
          this._tween(b.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.15, ease, i * 0.12 + 0.5);
        });
        const wait = boxes.length * 0.12 + 0.7;
        this._tween(this.truck.position, { x: TRUCK_GONE }, 0.8, ease, wait, () => {
          for (const b of boxes) { this.scene.remove(b); this.boxes.delete(b.userData.id); }
          this.busy--; onDone && onDone();
        });
      });
    }
    discard(parcelId) {
      const b = this.boxes.get(parcelId); if (!b) return;
      b.userData.locked = true;
      this._tween(b.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.4, ease, 0, () => { this.scene.remove(b); this.boxes.delete(parcelId); });
      this._tween(b.position, { y: b.position.y - 0.4 }, 0.4, ease);
    }
    shake(amount = 0.15) { this.shakeT = 0.35; this.shakeA = amount; }
    // ---------- 오프닝 카메라 (intro.js 가 밖에서 몬다) ----------
    // this.cine = true 인 동안 resize()·_loop() 는 카메라를 건드리지 않는다.
    // ---------- 완성 건물 ↔ 단면 ----------
    // 평소(플레이)엔 앞면이 벗겨져 있어 안이 보인다. 밖에서 보여 줄 때(오프닝)는 씌운다.
    // close(true) 로 씌우고, close(false, true) 로 '뚜껑이 들리듯' 벗긴다.
    close(on, animate) {
      const f = this.parts.front;
      this.closed = !!on;
      if (!f) return;
      this.tweens = this.tweens.filter(t => t.tag !== 'front');
      if (this.tiles) this.tiles.visible = !on;
      if (on) { f.visible = true; f.position.y = 0; this._setAlpha(f, 1); return; }
      if (!animate) { f.visible = false; f.position.y = 0; this._setAlpha(f, 1); return; }
      const box = { y: 0, a: 1 };
      this.tweens.push({ tag: 'front', obj: box, from: { y: 0, a: 1 }, to: { y: 2.6, a: 0 }, dur: 0.9, fn: ease, t: 0,
        onTick: () => { f.position.y = box.y; this._setAlpha(f, box.a); },
        onDone: () => { f.visible = false; f.position.y = 0; this._setAlpha(f, 1); } });
    }
    _setAlpha(group, a) {
      group.traverse(o => {
        if (o.isMesh) { o.material.transparent = a < 1; o.material.opacity = a; }
        else if (o.isLineSegments) { o.material.opacity = 0.55 * a; }
      });
    }
    // 오프닝: 탑차가 도로를 따라 들어온다 (평소엔 화면 밖 대기 자리에 그냥 서 있다)
    truckTo(x, dur) {
      if (!this.truck) return;
      this.dropTween('introtruck');
      this.tweens.push({ tag: 'introtruck', obj: this.truck.position, from: { x: this.truck.position.x }, to: { x }, dur: dur || 2.4, fn: ease, t: 0 });
    }
    dropTween(tag) { this.tweens = this.tweens.filter(t => t.tag !== tag); }
    camSet(p, l) { this.camera.position.set(p[0], p[1], p[2]); this.camera.lookAt(l[0], l[1], l[2]); }
    camHome() { return { p: [this.camX, this.camY, this.camZ], l: (this.camLook || [1.3, 0.3, 0.3]).slice(), fov: this.camFov || this.camera.fov }; }

    _loop() {
      requestAnimationFrame(() => this._loop());
      const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i]; tw.t += dt;
        if (tw.t < 0) continue;
        const k = Math.min(1, tw.t / tw.dur), e = tw.fn(k);
        for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
        if (tw.onTick) tw.onTick();
        if (k >= 1) { this.tweens.splice(i, 1); tw.onDone && tw.onDone(); }
      }
      // 기한 초과 깜빡임 / 냉장 밖 신선식품 흔들림
      const pulse = (Math.sin(this.time * 8) + 1) / 2;
      for (const b of this.boxes.values()) {
        const m = b.material;
        if (b.userData.overdue) m.emissive.setRGB(0.5 * pulse, 0.05, 0.05);
        else if (b.userData.urgent) m.emissive.setRGB(0.42 * pulse, 0.26 * pulse, 0.02);
        else if (b.userData.exposed) m.emissive.setRGB(0.05, 0.18 * pulse, 0.34 * pulse); else m.emissive.setRGB(0, 0, 0);
        if (b.userData.warm && !b.userData.locked) b.rotation.y = Math.sin(this.time * 6 + b.userData.id) * 0.06; else b.rotation.y = 0;
      }
      this._tickWeather(dt);
      // 트럭 바퀴 흔들림
      if (this.truck.position.x < TRUCK_PARK - 0.1 && this.truck.position.x > TRUCK_DOCK + 0.1) this.truck.position.y = Math.abs(Math.sin(this.time * 30)) * 0.03; else this.truck.position.y = 0;
      const cy = this.camY || 7.8;
      // 오프닝: 카메라는 intro.js 가 놓는다. 반드시 render 직전에 불러야 한다 —
      // 따로 rAF 를 돌리면 setSize 로 캔버스를 비운 프레임이 그대로 찍혀 장면이 깜빡인다
      if (this.cine) { if (this.cineStep) { try { this.cineStep(); } catch (e) { this.cine = false; this.cineStep = null; console.error(e); } } }
      else if (this.shakeT > 0) { this.shakeT -= dt; this.camera.position.x = this.camX + (Math.random() - 0.5) * this.shakeA; this.camera.position.y = cy + (Math.random() - 0.5) * this.shakeA; }
      else if (this.weather === 'storm') { this.camera.position.x = this.camX + Math.sin(this.time * 9) * 0.05; this.camera.position.y = cy + Math.sin(this.time * 7) * 0.04; }
      else { this.camera.position.x = this.camX; this.camera.position.y = cy; }
      this.renderer.render(this.scene, this.camera);
    }
  }
  return Scene3D;
})();
