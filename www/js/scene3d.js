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
    frozen: ['.XXXXXX', 'X....XX', 'XXXXX.X', 'X.X.X.X', 'X...X.X', 'X...XX.', 'XXXXX..'],   // 얼음 큐브 🧊 (냉장은 눈송이 ❄ — 둘이 헷갈리지 않게)
    rain: ['...XXX...', '.XXXXXXX.', 'XXXXXXXXX', 'XXXXXXXXX', '.........', '..X..X..X', '.X..X..X.', 'X..X..X..'],
    box: ['XXXXXXX', 'X..X..X', 'XXXXXXX', 'X.....X', 'X.....X', 'X.....X', 'XXXXXXX'],   // 상자 — 창고 칸 수 간판
  };
  const SIGN = { bg: '#2a2740', line: '#0f0e1a', hi: '#3d3a5c', alt: '#eef6ff', unit: 0.036, scale: 2 };
  const STORAGE_COLOR = 0x8c7bc0;   // 맡아 둔 짐(보관 계약) — 내 택배와 헷갈리지 않게 보라빛
  const FOOT = { 1: [1, 1, 0.65], 2: [2, 1, 0.78], 4: [2, 2, 1.18], 7: [3, 2, 1.85] }; // [w, d, h] — 화면에서 상자 크기와 적재량을 즉시 읽을 수 있게 높이를 강조한다.
  const TRUCK_PARK = 6.6, TRUCK_DOCK = 4.9, TRUCK_GONE = 12;
  // 계열별 차 도색 (캡 · 띠 · 짐칸)
  const TRUCK_PAINT = {
    bulk:    { cab: 0xe0553d, stripe: 0x6c8cff },
    cold:    { cab: 0x2fb5ad, stripe: 0xffffff, cargo: 0xe6fbf9 },
    frozen:  { cab: 0x4a8fd6, stripe: 0xdff3ff, cargo: 0xdff3ff },
    fragile: { cab: 0xf0a04b, stripe: 0x5a3a12, cargo: 0xf7e7cf },
    intl:    { cab: 0x3f5fd8, stripe: 0xffd166 },
    large:   { cab: 0x8a63c9, stripe: 0xf2ecd8, cargo: 0xd9cfe8 },
    air:     { cab: 0xf2f2f2, stripe: 0x3f5fd8, cargo: 0xffffff },
    rail:    { cab: 0x5b6270, stripe: 0xffd166, cargo: 0xb8bcc6 },
    sea:     { cab: 0x2a5f8f, stripe: 0xf2ecd8, cargo: 0x9fb7c9 },
  };

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
      this.raycaster = new THREE.Raycaster(); this.pointer = new THREE.Vector2(); this.onInspect = null;
      this.renderer.domElement.style.cursor = 'pointer';
      this.renderer.domElement.addEventListener('pointerup', e => this._inspectAt(e));
      this.parts = {};                     // 착탈식 모듈: shell · cold · yard · van
      this.shopName = window.I18n ? window.I18n.t('lv.ownerShop') : '';   // 상호 간판 — 게임이 붙으면 sync 가 그 런의 상호로 바꾼다
      this.Z = this._zonesFor(BARE);   // 첫 프레임: 냉장·냉동 없는 맨 창고 (sync 가 곧 진짜 창고로 덮는다)
      this._buildTerrain();
      this._syncBuilding(BARE);
      this._buildWeather();
      this.weather = 'sunny';
      this.resize();
      // 픽셀 폰트가 늦게 로드되면 간판을 다시 굽는다
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { this.signCache = null; this.shopCache = null; this._syncShopSigns(false); if (this.tileCaps) this._buildTiles(...this.tileCaps); });
      window.addEventListener('resize', () => this.resize());
      // 패널이 늘고 줄면(호출 모드·재고 줄 수·모달) 창고 화면 높이가 창 크기 없이도 바뀐다 — 그때마다 캔버스와 카메라를 다시 맞춘다. 안 하면 캔버스가 세로로 늘어나 모델이 찌그러진다
      if (typeof ResizeObserver !== 'undefined') { let last = ''; new ResizeObserver(() => { if (this.cine) return; const k = this.container.clientWidth + 'x' + this.container.clientHeight; if (k !== last) { last = k; this.resize(); } }).observe(this.container); }
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
      // 세로로 긴 화면도 **가로에 맞춘다** — 창고 폭이 화면 폭에 들어올 때까지 물러난다(예전엔 세로형이면 고정 거리라 폭이 잘리고 모델이 확대돼 보였다)
      { const need = 6.4 * k / (Math.tan(fov / 2 * Math.PI / 180) * a);
        // 폰에서 3D 가 200px 안팎으로 납작해지면(a≈1.6~2.2) 가로는 다 들어와도 세로가 잘린다 — 앞뒤(마당~뒷벽)가 들어올 때까지 물러난다
        const tall = Math.max(1, 1 + (a - 1.15) * 0.62);
        const kk = Math.max(1, need / 12.1, tall); const fx = 0.1 + dx; this.camX = fx + 0.2; this.camY = 0.45 + 6.45 * kk * k; this.camZ = 0.65 + 8.2 * kk * k; this.camLook = [fx, 0.45, 0.65]; }
      // 재고 서랍을 접으면 화면은 커지지만 카메라가 모델에 붙어 버리지 않게 한 걸음 물러나 전체 창고·마당·차량을 담는다.
      const collapsed = !!(this.container.closest('#app') && this.container.closest('#app').classList.contains('warehouse-collapsed'));
      if (collapsed) {
        const pad = 2.05;
        this.camX = this.camLook[0] + (this.camX - this.camLook[0]) * pad;
        this.camY = this.camLook[1] + (this.camY - this.camLook[1]) * pad;
        this.camZ = this.camLook[2] + (this.camZ - this.camLook[2]) * pad;
      }
      // 오프닝 중에는 카메라를 intro.js 가 몬다 — 여기서는 자리만 계산해 두고 건드리지 않는다
      if (!this.cine) { this.camera.position.set(this.camX, this.camY, this.camZ); this.camera.lookAt(this.camLook[0], this.camLook[1], this.camLook[2]); }
      this.camera.updateProjectionMatrix();
    }
    setOnInspect(fn) { this.onInspect = typeof fn === 'function' ? fn : null; }
    _inspectAt(e) {
      if (!this.onInspect || this.busy) return;
      const r = this.renderer.domElement.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.scene.children, true);
      for (const hit of hits) { let o = hit.object; while (o && !o.userData.inspect) o = o.parent; if (o && o.userData.inspect) { this.onInspect({ ...o.userData.inspect }); return; } }
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
    // 랙은 바닥 뒤 오른쪽 2×2 칸 위에 선 2단 선반(8칸), 복층은 뒤 왼쪽 6×2 칸 위 데크(12칸). 바닥은 '전체 - 랙 - 복층' 이고 랙이 선 자리는 못 쓴다
    _zonesFor(wh) {
      const rackCap = wh.rackCap || 0, mezzCap = wh.mezzCap || 0;
      const cap = Math.max(1, (wh.cap || 1) - rackCap - mezzCap), coldCells = (wh.cold || 0) + (wh.frozen || 0);
      const reserve = rackCap ? { col: MAIN.cells - 2, rows: 2 } : null;   // 랙 발밑
      const mainDepth = Math.max(2, Math.min(MAIN.maxDepth, Math.ceil((cap + (reserve ? 4 : 0)) / MAIN.cells)));
      const coldDepth = coldCells > 0 ? Math.max(1, Math.min(COLD.maxDepth, Math.ceil(coldCells / COLD.cells))) : 0;
      const frontZ = ROW_Z + mainDepth * CELL + 0.45;     // 앞벽(셔터) 자리 = 실내의 끝
      const yardZ0 = frontZ + 0.35;                        // 야외 적재는 앞벽 '바깥' 이다 — 지붕도 바닥도 건물 것이 아니다
      const x0 = coldDepth ? COLD.x0 - 0.6 : MAIN.x0 - 0.5;
      const yardX0 = Math.max(-2.4, x0 + 0.3);
      return {
        MAIN: { x0: MAIN.x0, cells: MAIN.cells, depth: mainDepth, z0: ROW_Z, reserve, floorCap: cap },
        RACK: rackCap ? { x0: MAIN.x0 + (MAIN.cells - 2) * CELL, cells: 2, depth: 2, z0: ROW_Z, tiers: [0.95, 1.85], cap: rackCap } : null,
        MEZZ: mezzCap ? { x0: MAIN.x0, cells: 6, depth: 2, z0: ROW_Z, y: 1.95, cap: mezzCap } : null,
        COLD: { x0: COLD.x0, cells: COLD.cells, depth: coldDepth, z0: ROW_Z },
        YARD: { x0: yardX0, cells: Math.max(4, Math.floor((DOCK_X - 0.2 - yardX0) / CELL)), depth: YARD.depth, z0: yardZ0 },
        x0, x1: DOCK_X, frontZ, yardZ0,
        roadZ: yardZ0 + YARD.depth * CELL + 1.0,          // 도로는 마당 너머 (창고가 깊어지면 같이 밀린다)
      };
    }
    // 착탈: 창고가 바뀌면 바뀐 모듈만 다시 짓는다. 처음 짓는 게 아니면 위에서 내려앉는다
    _syncBuilding(wh, opts) {
      const sig = [wh.cap, wh.cold || 0, wh.frozen || 0, wh.rackCap || 0, wh.mezzCap || 0, ['coldvan', 'padvan', 'bigvan'].filter(k => wh[k]).length].join('/');
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
      put('rack', Z.RACK ? this._makeRack(Z) : null, 1.2);
      put('mezz', Z.MEZZ ? this._makeMezz(Z) : null, 1.6);
      const vans = ['coldvan', 'padvan', 'bigvan'].filter(k => wh[k]);
      put('van', vans.length ? this._makeVan(Z, vans[0]) : null, 1.4);
      this._syncShopSigns(!first);
      if (this.parts.front) { this.parts.front.visible = !!this.closed; this._setAlpha(this.parts.front, 1); }
      if (this.road) { this.road.position.x = Z.x1 + 0.6 + 20; this.road.position.z = Z.roadZ; }   // 도로는 마당 너머, 건물 오른쪽으로
      if (this.truck) this.truck.position.z = Z.roadZ;
      if (this.workers) {
        // 한 명은 건물 안(진열대 사이)에서 정리하고, 한 명은 밖(도크)에서 트럭·직접 배송을 맡는다 —
        // 같은 자리를 왕복하는 둘을 붙여 두면 판박이처럼 보인다.
        const indoor = this.workers[0], outdoor = this.workers[1];
        const indoorZ = (BACK_Z + Z.frontZ) / 2;
        indoor.userData.idleA = { x: 0.3, z: indoorZ - 0.4 }; indoor.userData.idleB = { x: 1.1, z: indoorZ + 0.35 };
        // 트럭은 roadZ 근처 차선만 달린다 — 도크 인부는 마당 안쪽(yardZ0~+depth)에서만 움직여 차선과 절대 안 겹치게 한다
        const pickX = Z.x1 - 1.05, truckX = TRUCK_DOCK - 0.75, yardMidZ = Z.yardZ0 + Z.YARD.depth * CELL * 0.5;
        outdoor.userData.dockA = { x: pickX, z: yardMidZ }; outdoor.userData.dockB = { x: truckX, z: yardMidZ };
        outdoor.userData.idleA = { x: pickX, z: yardMidZ - 0.35 }; outdoor.userData.idleB = { x: pickX, z: yardMidZ + 0.35 };
        outdoor.userData.exitB = { x: pickX, z: yardMidZ + 2.4 };
        // 배차 중이 아닐 때만 새 좌표로 다시 세운다 — 창고 크기가 바뀔 때마다(냉장고 추가 등) 그대로 반영되고,
        // 트럭 왕복·직접 배송처럼 한창 움직이는 중이면 건드리지 않는다.
        if (!this.busy) { this._setWorkerIdle(indoor, Math.random() * 0.3); this._setWorkerIdle(outdoor, 0.3 + Math.random() * 0.3); }
      }
      this.tileCaps = null; this.tileSig = null;   // 구역이 바뀌었으니 바닥 타일도 다시
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
      g.userData.inspect = { kind: 'warehouse' };
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
      g.userData.inspect = { kind: 'cold' };
      const d = C.depth * CELL + 0.2, zc = ROW_Z + C.depth * CELL / 2;
      const cf = this._box(C.cells * CELL + 0.2, 0.06, d, 0x6cabbd); cf.position.set(C.x0 + C.cells * CELL / 2 - 0.1, 0.1, zc); g.add(cf);
      const cw = this._box(0.12, 0.5, d, 0x47869a); cw.position.set(C.x0 + C.cells * CELL + 0.06, 0.3, zc); g.add(cw);
      const cw2 = this._box(C.cells * CELL + 0.2, 0.5, 0.12, 0x47869a); cw2.position.set(cf.position.x, 0.3, ROW_Z + C.depth * CELL + 0.06); g.add(cw2);
      const lamp = this._box(0.3, 0.3, 0.3, 0x5ee0d8, { emissive: 0x2a8f8a }); lamp.position.set(C.x0 + 0.4, 2.9, -1.5); g.add(lamp);
      return g;
    }
    _makeYardPad(Z) {
      const g = new THREE.Group(), Y = Z.YARD;
      g.userData.inspect = { kind: 'yard' };
      const pad = this._box(Y.cells * CELL + 0.3, 0.05, Y.depth * CELL + 0.3, 0x7d6f56);
      pad.position.set(Y.x0 + Y.cells * CELL / 2 - 0.15, 0.09, Y.z0 + Y.depth * CELL / 2 - 0.05); g.add(pad);
      return g;
    }
    // 차량 시설을 사면 마당에 그 차가 선다 (냉장 밴 · 완충 밴 · 대형 밴)
    // 선반 랙: 기둥 넷 + 선반 두 장 (앞이 트여 있어 짐이 보인다)
    _makeRack(Z) {
      const g = new THREE.Group(), R = Z.RACK;
      g.userData.inspect = { kind: 'warehouse' };
      const w = R.cells * CELL, d = R.depth * CELL, x0 = R.x0, z0 = R.z0;
      for (const [x, z] of [[x0 + 0.03, z0 + 0.03], [x0 + w - 0.03, z0 + 0.03], [x0 + 0.03, z0 + d - 0.03], [x0 + w - 0.03, z0 + d - 0.03]]) { const p = noShadow(this._box(0.06, 2.75, 0.06, 0x3f6fb0)); p.position.set(x, 1.375, z); g.add(p); }
      for (const y of R.tiers) { const sh = noShadow(this._box(w, 0.05, d, 0xd0843a)); sh.position.set(x0 + w / 2, y - 0.025, z0 + d / 2); g.add(sh); }
      return g;
    }
    // 복층: 기둥 위 데크 + 앞 난간 + 오른쪽 계단
    _makeMezz(Z) {
      const g = new THREE.Group(), M2 = Z.MEZZ;
      g.userData.inspect = { kind: 'warehouse' };
      const w = M2.cells * CELL, d = M2.depth * CELL, x0 = M2.x0, z0 = M2.z0, y = M2.y;
      const deck = noShadow(this._box(w, 0.08, d, 0x8a7a66)); deck.position.set(x0 + w / 2, y - 0.04, z0 + d / 2); g.add(deck);
      for (const x of [x0 + 0.05, x0 + w / 2, x0 + w - 0.05]) { const p = noShadow(this._box(0.08, y, 0.08, 0x5b5f6b)); p.position.set(x, y / 2, z0 + d - 0.05); g.add(p); }
      const rail = noShadow(this._box(w, 0.05, 0.04, 0xffd166)); rail.position.set(x0 + w / 2, y + 0.45, z0 + d); g.add(rail);
      for (let i = 0; i < 5; i++) { const st = noShadow(this._box(0.34, 0.05, 0.16, 0x9a9aa8)); st.position.set(x0 + w + 0.2, (i + 1) * y / 6, z0 + d + 0.35 - i * 0.16); g.add(st); }
      return g;
    }
    // ---------- 상호 간판 ----------
    // 서장·1장(인수인계)에는 한 사장의 「한성창고」가 걸려 있고, 가계약서에 도장을 찍으면 내가 지은 이름으로 갈아 단다.
    // 두 군데에 건다: 뒤쪽 지붕 위 입간판(플레이 화면 — 앞면이 벗겨져 있어도 보인다)과
    // 셔터 위 인방(오프닝·엔딩의 완성 건물 — 앞면과 함께 들렸다 사라진다). 앞면이 씌워져 있을 때 지붕 간판은 숨긴다(같은 이름이 두 번 보인다).
    setShopName(name, opts) {
      name = String(name || '').trim();
      if (!name || name === this.shopName) return false;
      this.shopName = name;
      this._syncShopSigns(!(opts && opts.silent));   // 간판을 갈아 달 때는 위에서 내려앉는다
      return true;
    }
    _syncShopSigns(drop) {
      const Z = this.Z, name = this.shopName;
      if (this.parts.shopRoof) this.scene.remove(this.parts.shopRoof);
      this.parts.shopRoof = null;
      const f = this.parts.front;
      if (f) [...f.children].filter(o => o.userData.shopSign).forEach(o => f.remove(o));
      if (!name || !Z) return;
      const w = Z.x1 - Z.x0, cx = (Z.x0 + Z.x1) / 2;
      // 지붕 입간판: 뒤쪽 지붕 끝에 다리 둘로 세운다
      const roof = this._shopBoard(name, 0.52, w - 1.4, true);
      roof.userData.inspect = { kind: 'warehouse' };
      roof.position.set(cx, 3.31, BACK_Z - 0.02);
      roof.visible = !this.closed;
      this.parts.shopRoof = roof; this.scene.add(roof);
      if (drop) this._dropIn(roof, 1.1);
      // 셔터 위 인방 간판 (앞면 그룹의 자식)
      if (f) {
        const front = this._shopBoard(name, 0.5, w - 1.0, false);
        front.userData.shopSign = true;
        front.position.set(cx, 2.57, Z.frontZ + 0.16);
        f.add(front);
        if (f.visible && drop) this._dropIn(front, 0.8);
      }
    }
    // 간판 한 장: 테두리 상자 + 이름 판. h 는 판 높이, maxW 를 넘으면 비율대로 줄인다. legs 면 다리를 달아 바닥(y=0)에 세운다
    _shopBoard(name, h, maxW, legs) {
      const t = this._shopTexture(name), aspect = t.w / t.h;
      let bw = h * aspect, bh = h;
      if (bw > maxW) { bw = Math.max(0.6, maxW); bh = bw / aspect; }
      const g = new THREE.Group(), lift = legs ? 0.16 : 0;
      const frame = noShadow(this._box(bw + 0.08, bh + 0.08, 0.08, 0x0f0e1a)); frame.position.y = lift + bh / 2; g.add(frame);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), new THREE.MeshBasicMaterial({ map: t.tex }));
      face.position.set(0, lift + bh / 2, 0.045); g.add(face);
      if (legs) for (const x of [-bw * 0.32, bw * 0.32]) { const l = noShadow(this._box(0.07, lift + 0.04, 0.07, 0x35314f)); l.position.set(x, (lift + 0.04) / 2, 0); g.add(l); }
      return g;
    }
    // 이름 판 텍스처: 구역 표지와 같은 도트 결 (1배로 찍고 정수배 확대). 남색 판에 노란 굵은 글씨
    _shopTexture(name) {
      this.shopCache = this.shopCache || {};
      if (this.shopCache[name]) return this.shopCache[name];
      const F = "bold 11px 'Galmuri11', monospace";
      const probe = document.createElement('canvas').getContext('2d'); probe.font = F;
      const tw = Math.ceil(probe.measureText(name).width);
      const vw = tw + 2 * 2 + 2 * 6, vh = 19;                    // 테두리 2 + 여백 6
      const s1 = document.createElement('canvas'); s1.width = vw; s1.height = vh;
      const x1 = s1.getContext('2d');
      const px = (x, y, w, h, col) => { x1.fillStyle = col; x1.fillRect(x, y, w, h); };
      px(0, 0, vw, vh, SIGN.line); px(2, 2, vw - 4, vh - 4, SIGN.bg); px(2, 2, vw - 4, 1, SIGN.hi);
      px(4, 4, 1, 1, '#ffd166'); px(vw - 5, 4, 1, 1, '#ffd166'); px(4, vh - 5, 1, 1, '#ffd166'); px(vw - 5, vh - 5, 1, 1, '#ffd166');   // 네 귀 리벳
      x1.font = F; x1.textBaseline = 'middle'; x1.textAlign = 'center';
      x1.fillStyle = SIGN.line; x1.fillText(name, vw / 2 + 1, vh / 2 + 1);
      x1.fillStyle = '#ffd166'; x1.fillText(name, vw / 2, vh / 2);
      const S = 4, c = document.createElement('canvas'); c.width = vw * S; c.height = vh * S;
      const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false; ctx.drawImage(s1, 0, 0, c.width, c.height);
      const tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
      const out = { tex, w: vw, h: vh };
      this.shopCache[name] = out; return out;
    }
    _makeVan(Z, kind) {
      const color = kind === 'coldvan' ? 0x5ee0d8 : kind === 'padvan' ? 0xf0a04b : 0xb08bd8;
      const g = new THREE.Group();
      g.userData.inspect = { kind: 'vehicle', vehicle: kind };
      const body = this._box(1.1, 0.5, 0.6, color); body.position.set(0, 0.42, 0); g.add(body);
      const cabin = this._box(0.4, 0.4, 0.55, 0xe8e8f0); cabin.position.set(0.72, 0.37, 0); g.add(cabin);
      for (const [x, z] of [[-0.3, 0.32], [-0.3, -0.32], [0.62, 0.32], [0.62, -0.32]]) { const w = this._box(0.18, 0.18, 0.1, 0x2a2740); w.position.set(x, 0.17, z); g.add(w); }
      g.position.set(Math.max(Z.x0 + 0.9, Z.YARD.x0 - 0.6), 0, Z.yardZ0 + Z.YARD.depth * CELL - 0.35);   // 마당 왼쪽 끝에 세워 둔다
      return g;
    }
    _syncGrowthVisuals(growth) {
      growth = growth || {};
      const keys = ['marketing', 'fleet', 'warehouse', 'automation', 'branding', 'coldchain'];
      const sig = keys.map(k => growth[k] || 0).join('/');
      if (sig === this.growthSig) return;
      const first = this.growthSig == null; this.growthSig = sig;
      if (this.parts.growth) this.scene.remove(this.parts.growth);
      const Z = this.Z, g = new THREE.Group();
      g.userData.inspect = { kind: 'growth' };
      const marketing = growth.marketing || 0, fleet = growth.fleet || 0, warehouse = growth.warehouse || 0;
      const automation = growth.automation || 0, branding = growth.branding || 0, coldchain = growth.coldchain || 0;

      if (marketing > 0) {
        const x = Z.x0 + 0.75, z = Z.frontZ + 0.42, h = 1.25 + marketing * 0.16;
        const post = this._box(0.12, h, 0.12, 0x35314f); post.position.set(x, h / 2, z); g.add(post);
        const board = this._box(1.35 + marketing * 0.08, 0.55, 0.12, marketing >= 4 ? 0xffd166 : 0x6c8cff, marketing >= 4 ? { emissive: 0x5a3b00 } : undefined); board.position.set(x, h, z); g.add(board);
        for (let i = 0; i < Math.min(6, marketing); i++) { const lamp = this._box(0.09, 0.09, 0.08, 0xfff2a8, { emissive: 0x8a6510 }); lamp.position.set(x - 0.52 + i * 0.21, h, z + 0.09); g.add(lamp); }
      }
      for (let i = 0; i < Math.min(6, warehouse); i++) {
        const unit = this._box(0.5, 0.2, 0.42, i >= 3 ? 0x6fdcff : 0xb9b9c6, i >= 3 ? { emissive: 0x173d44 } : undefined);
        unit.position.set(Z.x0 + 1 + (i % 3) * 1.15, 3.42, BACK_Z + 0.45 + Math.floor(i / 3) * 0.55); g.add(unit);
      }
      if (automation > 0) {
        const len = 1.5 + automation * 0.55, x = Z.MAIN.x0 + Z.MAIN.cells * CELL - 0.45, z = ROW_Z + 0.35 + len / 2;
        const belt = this._box(0.55, 0.14, len, 0x31485d, { emissive: automation >= 3 ? 0x102c40 : 0x000000 }); belt.position.set(x, 0.32, z); g.add(belt);
        for (let i = 0; i < 2 + automation * 2; i++) { const roller = this._box(0.62, 0.08, 0.08, i % 2 ? 0x6fdcff : 0xdfefff); roller.position.set(x, 0.42, z - len / 2 + 0.18 + i * (len - 0.36) / (1 + automation * 2)); g.add(roller); }
      }
      if (branding > 0) {
        const x = Z.x1 - 0.65, z = Z.frontZ + 0.36, h = 1.05 + branding * 0.18;
        const tower = this._box(0.18, h, 0.18, 0x51304e); tower.position.set(x, h / 2, z); g.add(tower);
        const gem = this._box(0.48 + branding * 0.08, 0.48 + branding * 0.08, 0.16, branding >= 3 ? 0xff70d2 : 0xffd166, { emissive: branding >= 3 ? 0x74175c : 0x6b4700 }); gem.position.set(x, h, z); gem.rotation.z = Math.PI / 4; g.add(gem);
      }
      if (coldchain > 0 && Z.COLD.depth) {
        for (let i = 0; i < Math.min(4, coldchain); i++) { const tank = this._box(0.3, 0.65 + i * 0.05, 0.3, i >= 2 ? 0x9ad7ff : 0x5ee0d8, { emissive: 0x123d4b }); tank.position.set(Z.COLD.x0 + 0.35 + i * 0.42, 0.4, Z.COLD.z0 + Z.COLD.depth * CELL - 0.25); g.add(tank); }
      }
      if (fleet >= 3) {
        for (let i = 0; i < Math.min(3, Math.floor(fleet / 2)); i++) { const crate = this._box(0.62, 0.34, 0.42, i === 2 ? 0xffd166 : 0xe0553d); crate.position.set(Z.YARD.x0 + 0.55 + i * 0.75, 0.22, Z.yardZ0 + Z.YARD.depth * CELL - 0.45); g.add(crate); }
      }
      this.parts.growth = g; this.scene.add(g); if (!first) this._dropIn(g, 1.2);
      this._styleTruck(growth);
    }
    _styleTruck(growth) {
      if (!this.truck) return;
      this.growthState = growth || {};
      for (const t of this.trucks) this._decorateTruck(t, this.growthState);
    }
    _ensureTruckFleet(n) {
      while (this.trucks.length < n) {
        const t = this._makeTruck(); t.visible = false;
        this._decorateTruck(t, this.growthState || {});
        this.scene.add(t); this.trucks.push(t);
      }
    }
    _decorateTruck(truck, growth) {
      [...truck.children].filter(x => x.userData && x.userData.growthPart).forEach(x => truck.remove(x));
      const fleet = (growth && growth.fleet) || 0, automation = (growth && growth.automation) || 0, branding = (growth && growth.branding) || 0;
      const add = m => { m.userData.growthPart = true; truck.add(m); };
      for (let i = 0; i < Math.min(3, fleet); i++) { const lamp = this._box(0.16, 0.12, 0.16, 0xffd166, { emissive: 0x704500 }); lamp.position.set(-1.45 + i * 0.22, 1.34, 0); add(lamp); }
      if (fleet >= 2) { const rail = this._box(2.25, 0.1, 0.1, fleet >= 5 ? 0xffd166 : 0x6fdcff, fleet >= 5 ? { emissive: 0x664100 } : undefined); rail.position.set(0.4, 1.62, 0); add(rail); }
      if (automation > 0) { const scanner = this._box(0.18, 0.18, 1.36, 0x6fdcff, { emissive: 0x184e5b }); scanner.position.set(0.95, 1.35, 0); add(scanner); }
      if (branding > 0) { const crown = this._box(0.42, 0.26, 0.08, branding >= 3 ? 0xff70d2 : 0xffd166, { emissive: branding >= 3 ? 0x6b174e : 0x6b4700 }); crown.position.set(0.4, 1.63, -0.68); crown.rotation.z = Math.PI / 4; add(crown); }
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
      // 트럭 — this.truck 은 평소 마당에 서 있는 대표 차량, this.trucks 는 동시 배차용 풀 (필요할 때 늘어난다)
      // 평소엔 차가 서 있지 않다 — 업체를 부르면 그 업체 색의 차가 와서 싣고 간다. 오프닝(truckTo)만 대표 차량을 쓴다
      this.truck = this._makeTruck(); this.truck.position.set(TRUCK_PARK, 0, 3.6); this.truck.visible = false; s.add(this.truck);   // z 는 _syncBuilding 이 도로에 맞춘다
      this.trucks = [this.truck];
      // 도로
      const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 3.4), this._mat(0x4a4a52)); road.rotation.x = -Math.PI / 2; road.position.set(14, -0.02, 3.6); road.receiveShadow = true; s.add(road); this.road = road;
      // 도크 인부 — 상하차 연출에 생기를 준다. 트럭이 있으면 도크↔트럭을 오가며 상자를 나르고,
      // 직접 배송은 트럭 없이 사람이 상자를 들고 뛰어나갔다 온다. 기분(mood)에 따라 팔·자세가 바뀐다.
      this.workers = [this._makeWorker(0x3d6fbf), this._makeWorker(0x5c9a5c)];
      for (const w of this.workers) s.add(w);
      this.workerMood = 0; this.workerMoodT = 0;   // -1 풀죽음 · 0 평소 · 1 신남
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
    // use = { main, cold, frozen, yard }: 지금 찬 칸 — 간판이 '냉장 2/6'처럼 읽는다 (패널의 창고·냉장 막대를 모델로 옮겼다)
    _buildTiles(cap, cold, frozen, use) {
      if (this.tiles) this.scene.remove(this.tiles);
      use = use || (this.tileCaps && this.tileCaps[3]) || null;
      const Z = this.Z, MAIN = Z.MAIN, COLD = Z.COLD, YARD = Z.YARD;
      const g = new THREE.Group(); this.tiles = g; this.tileCaps = [cap, cold, frozen, use];
      const n = (k, tot) => use ? `${use[k]}/${tot}` : String(tot);
      const tile = (zone, i, color) => { const x = i % zone.cells, z = Math.floor(i / zone.cells); const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.08, CELL - 0.08), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.55 })); m.rotation.x = -Math.PI / 2; m.position.set(zone.x0 + (x + 0.5) * CELL, zone === COLD ? 0.145 : 0.075, zone.z0 + (z + 0.5) * CELL); m.receiveShadow = true; g.add(m); };
      // 바닥 타일은 '전체 - 랙 - 복층' 만큼, 랙 발밑은 건너뛴다. 랙 선반·복층 데크 위에는 그 구역 칸만큼
      { let k = 0; for (let i = 0; i < MAIN.cells * MAIN.depth && k < MAIN.floorCap; i++) { const x = i % MAIN.cells, z = Math.floor(i / MAIN.cells); if (MAIN.reserve && z < MAIN.reserve.rows && x >= MAIN.reserve.col) continue; tile(MAIN, i, 0xb9b9c6); k++; } }
      const upTile = (zone, i, y, color) => { const x = i % zone.cells, z = Math.floor(i / zone.cells) % zone.depth; const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL - 0.1, CELL - 0.1), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.6 })); m.rotation.x = -Math.PI / 2; m.position.set(zone.x0 + (x + 0.5) * CELL, y + 0.01, zone.z0 + (z + 0.5) * CELL); g.add(m); };
      if (Z.RACK) for (let i = 0; i < Z.RACK.cap; i++) upTile(Z.RACK, i, Z.RACK.tiers[Math.min(Z.RACK.tiers.length - 1, Math.floor(i / (Z.RACK.cells * Z.RACK.depth)))], 0xf0c890);
      if (Z.MEZZ) for (let i = 0; i < Math.min(Z.MEZZ.cap, Z.MEZZ.cells * Z.MEZZ.depth); i++) upTile(Z.MEZZ, i, Z.MEZZ.y, 0xc9c0b0);
      for (let i = 0; i < Math.min(cold, COLD.cells * COLD.depth); i++) tile(COLD, i, 0x8fd0dc);
      for (let i = cold; i < Math.min(cold + frozen, COLD.cells * COLD.depth); i++) tile(COLD, i, 0x6c8cff);
      // 냉장/냉동 경계선
      if (frozen > 0 && cold > 0) { const row = Math.floor(cold / COLD.cells), col = cold % COLD.cells; const z = COLD.z0 + row * CELL; const mk = (x0, x1, zz) => { const w = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.12, 0.05), new THREE.MeshLambertMaterial({ color: 0x3a4a8c })); w.position.set((x0 + x1) / 2, 0.2, zz); g.add(w); }; if (col > 0) { mk(COLD.x0 + col * CELL, COLD.x0 + COLD.cells * CELL, z); mk(COLD.x0, COLD.x0 + col * CELL, z + CELL); const v = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, CELL), new THREE.MeshLambertMaterial({ color: 0x3a4a8c })); v.position.set(COLD.x0 + col * CELL, 0.2, z + CELL / 2); g.add(v); } else mk(COLD.x0, COLD.x0 + COLD.cells * CELL, z); }
      // 구역 표지: 냉장 / 냉동 / 야외 (카메라를 보는 픽셀 간판 스프라이트)
      const sign = (iconKey, label, accent, x, z, y) => {
        const t = this._signTexture(iconKey, label, accent);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t.tex, transparent: true, depthTest: false }));
        sp.scale.set(t.vw * SIGN.unit, t.vh * SIGN.unit, 1); sp.position.set(x, y || 0.9, z); g.add(sp); return sp;
      };
      const A = window.DATA.ATTRS, OUT = window.I18n ? window.I18n.t('hud.outdoorLabel') : '';
      // 창고·냉장 간판은 앞자락에 낮게 — 뒤쪽 높은 자리는 HUD 상자가 덮는다(폰에서 3D 가 200px 안팎일 때)
      sign('box', `${window.I18n ? window.I18n.t('common.warehouse') : ''} ${n('main', cap)}`.trim(), '#e8c46a', MAIN.x0 + MAIN.cells * CELL * 0.5, MAIN.z0 + MAIN.depth * CELL - 0.2, 0.62);
      // 냉동 간판은 냉장 간판 바로 위에 한 칸 띄워 쌓는다 — 냉동 칸 자리에 따로 세우면 화면 비율에 따라 둘이 겹쳤다
      const coldSp = cold > 0 ? sign('cold', `${A.cold.name} ${n('cold', cold)}`, '#5ee0d8', COLD.x0 + 0.9, COLD.z0 + COLD.depth * CELL - 0.2, 0.62) : null;
      if (frozen > 0) {
        const fx = COLD.x0 + 0.9, fz = COLD.z0 + COLD.depth * CELL - 0.2;
        const fs = sign('frozen', `${A.frozen.name} ${n('frozen', frozen)}`, '#9ad7ff', fx, fz, 0.62);
        if (coldSp) { fs.position.y = 0.62 + (coldSp.scale.y + fs.scale.y) / 2 + 0.08; fs.position.x = fx + 0.35; }
      }
      sign('rain', use && use.yard ? `${OUT} ${use.yard}` : OUT, '#c9a06c', YARD.x0 + 0.9, YARD.z0 + YARD.depth * CELL - 0.15, 0.62);   // 마당 앞자락, 낮게 — 건물 벽에 걸쳐 뜨면 안이 뚫려 보인다
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
    // 속성 딱지: 대사·목록의 ⚠(픽셀 폰트에선 '!' 상자)와 같은 그림 — 주황 네모에 굵은 '!'
    _tagTexture(text, bg, fg) {
      this.tagCache = this.tagCache || {}; const key = text + bg + fg;
      if (this.tagCache[key]) return this.tagCache[key];
      const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d');
      ctx.fillStyle = '#1b1a2e'; ctx.fillRect(0, 0, 64, 64); ctx.fillStyle = bg; ctx.fillRect(6, 6, 52, 52);
      ctx.fillStyle = fg; ctx.font = "bold 44px 'Galmuri11', monospace"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 32, 36);
      const tex = new THREE.CanvasTexture(c); tex.magFilter = THREE.NearestFilter; this.tagCache[key] = tex; return tex;
    }
    _tagMark(text, bg, fg, w, h, d) {
      const size = Math.min(0.42, Math.max(0.3, w * CELL * 0.45));
      const mat = new THREE.MeshBasicMaterial({ map: this._tagTexture(text, bg, fg), transparent: true, depthWrite: false });
      const g = new THREE.Group();
      const top = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); top.rotation.x = -Math.PI / 2; top.position.set((w * CELL) / 4, h / 2 + 0.035, d * CELL / 6); g.add(top);   // 윗면 오른쪽 (고객 딱지는 왼쪽)
      const front = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat); front.position.set(0, h * 0.1, d * CELL / 2 + 0.01); g.add(front);   // 앞면
      return g;
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
    // 업체 계열마다 차 색이 다르다 — 캡과 띠. 어느 업체가 왔는지 한눈에
    _paintTruck(truck, carrier) {
      const DA = window.DATA || {}; const fam = (DA.familyOf ? DA.familyOf(carrier) : carrier) || 'bulk';
      const P = TRUCK_PAINT[fam] || TRUCK_PAINT.bulk;
      const u = truck.userData; if (!u.cab) return;
      u.cab.material.color.setHex(P.cab); u.stripe.material.color.setHex(P.stripe); u.cargo.material.color.setHex(P.cargo || 0xf2ecd8);
    }
    _makeTruck() {
      const g = new THREE.Group();
      g.userData.inspect = { kind: 'truck' };
      const cargo = this._box(2.2, 1.3, 1.3, 0xf2ecd8); cargo.position.set(0.4, 0.95, 0); g.add(cargo);
      const cab = this._box(1.0, 1.0, 1.2, 0xe0553d); cab.position.set(-1.25, 0.75, 0); g.add(cab);
      const glass = this._box(0.2, 0.45, 1.0, 0x9ad8ff, { emissive: 0x224466 }); glass.position.set(-1.75, 0.9, 0); g.add(glass);
      const stripe = this._box(2.22, 0.22, 1.32, 0x6c8cff); stripe.position.set(0.4, 0.7, 0); g.add(stripe);
      g.userData.cab = cab; g.userData.stripe = stripe; g.userData.cargo = cargo;
      for (const [x, z] of [[-1.15, 0.7], [-1.15, -0.7], [1.05, 0.7], [1.05, -0.7]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.22, 8), this._mat(0x222230)); w.rotation.x = Math.PI / 2; w.position.set(x, 0.28, z); w.castShadow = true; g.add(w); }
      this.truckCargoY = 0.95;
      return g;
    }
    _makeWorker(shirt) {
      const g = new THREE.Group(), skin = 0xe0a877, pants = 0x2c2b38, vest = 0xffb238;
      const legPivotL = new THREE.Group(); legPivotL.position.set(-0.09, 0.46, 0); g.add(legPivotL);
      const legL = this._box(0.15, 0.46, 0.16, pants); legL.position.set(0, -0.23, 0); legPivotL.add(legL);
      const legPivotR = new THREE.Group(); legPivotR.position.set(0.09, 0.46, 0); g.add(legPivotR);
      const legR = this._box(0.15, 0.46, 0.16, pants); legR.position.set(0, -0.23, 0); legPivotR.add(legR);
      const torso = this._box(0.34, 0.4, 0.22, shirt || 0x3d6fbf); torso.position.set(0, 0.66, 0); g.add(torso);
      const vestStripe = this._box(0.36, 0.13, 0.24, vest, { emissive: 0x553600 }); vestStripe.position.set(0, 0.66, 0); g.add(vestStripe);
      const head = this._box(0.2, 0.2, 0.2, skin); head.position.set(0, 0.96, 0); g.add(head);
      const cap = this._box(0.22, 0.08, 0.22, 0x2b2a38); cap.position.set(0, 1.07, 0); noShadow(cap); g.add(cap);
      const armPivotL = new THREE.Group(); armPivotL.position.set(-0.23, 0.82, 0); g.add(armPivotL);
      const armL = this._box(0.11, 0.34, 0.11, shirt || 0x3d6fbf); armL.position.set(0, -0.17, 0); armPivotL.add(armL);
      const armPivotR = new THREE.Group(); armPivotR.position.set(0.23, 0.82, 0); g.add(armPivotR);
      const armR = this._box(0.11, 0.34, 0.11, shirt || 0x3d6fbf); armR.position.set(0, -0.17, 0); armPivotR.add(armR);
      const box = this._box(0.22, 0.2, 0.22, 0xd8b47a); box.position.set(0, 0.64, 0.22); box.visible = false; noShadow(box); g.add(box);
      const moodSprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false, opacity: 0 }));
      moodSprite.scale.set(0.32, 0.32, 1); moodSprite.position.set(0, 1.3, 0); moodSprite.visible = false; moodSprite.renderOrder = 10; g.add(moodSprite);
      g.userData.armPivotL = armPivotL; g.userData.armPivotR = armPivotR; g.userData.legPivotL = legPivotL; g.userData.legPivotR = legPivotR;
      g.userData.box = box; g.userData.moodSprite = moodSprite; g.userData.phase = Math.random() * 10;
      return g;
    }

    // ---------- 택배 배치 ----------
    _pack(parcels, zone, y) {
      // 행 단위 패킹, 넘치면 구역 밖으로 계속 쌓임 (창고 초과 시각화). zone.reserve: 그 줄들의 오른쪽 칸은 랙 발밑이라 건너뛴다
      const out = new Map(); let x = 0, z = 0, rowD = 0;
      const width = zz => zone.reserve && zz < zone.reserve.rows ? zone.reserve.col : zone.cells;
      for (const p of parcels) {
        const [w, d] = FOOT[p.baseSizeVis];
        if (x + w > width(z)) { x = 0; z += rowD || 1; rowD = 0; }
        out.set(p.id, { cx: zone.x0 + (x + w / 2) * CELL, cz: zone.z0 + (z + d / 2) * CELL, y: y || 0, over: z + d > zone.depth });
        x += w; rowD = Math.max(rowD, d);
      }
      return out;
    }
    // 랙: 아래 선반부터 채우고 넘치면 위 선반
    _packRack(parcels, R) {
      const out = new Map(); let tier = 0, rest = parcels.slice();
      while (rest.length && tier < R.tiers.length) {
        const m = this._pack(rest, R, R.tiers[tier]);
        const fit = rest.filter(p => !m.get(p.id).over);
        for (const p of fit) out.set(p.id, m.get(p.id));
        rest = rest.filter(p => m.get(p.id).over); tier++;
        if (!fit.length) break;
      }
      if (rest.length) { const m = this._pack(rest, R, R.tiers[R.tiers.length - 1]); for (const p of rest) out.set(p.id, m.get(p.id)); }
      return out;
    }
    _visSize(p) { return p.size >= 7 ? 7 : p.size >= 4 ? 4 : p.size >= 2 ? 2 : 1; }
    _valueTier(p) {
      if (p.storage) return 0;
      const reward = p.reward || 0;
      if (p.premium || reward >= 130) return 3;
      if (reward >= 90) return 2;
      if (reward >= 60) return 1;
      return 0;
    }
    sync(game, opts = {}) {
      const D = window.DATA;
      if (game.weatherNow) this.setWeather(game.weatherNow());
      // 창고가 바뀌었으면 건물부터 다시 짓는다 (착탈식 모듈) — 그 다음 바닥 타일
      if (game.companyName) this.setShopName(game.companyName(), { silent: !this._synced });   // 저장한 판을 처음 열 때는 조용히, 장이 넘어가며 이름이 바뀌면 내려앉는다
      if (game.warehouse) { this._syncBuilding(game.warehouse, { silent: !this._synced }); this._synced = true; }
      // 광고판은 가진 매체 레벨 합으로 자란다 (전단지 Lv1 만이면 아직 없음)
      this._syncGrowthVisuals(Object.assign({}, game.growth, game.mediaScore ? { marketing: game.mediaScore() } : {}));
      { const wh = game.warehouse, use = { main: game.usedVolume ? game.usedVolume() : 0, cold: game.coldUsed ? game.coldUsed() : 0, frozen: game.frozenUsed ? game.frozenUsed() : 0, yard: game.outdoorVolume ? game.outdoorVolume() : 0 };
        const sig = [wh.cap, wh.cold, wh.frozen || 0, use.main, use.cold, use.frozen, use.yard].join('/');
        if (!this.tiles || this.tileSig !== sig) { this.tileSig = sig; this._buildTiles(wh.cap, wh.cold, wh.frozen || 0, use); } }
      if (game.upcoming) { const u = game.upcoming()[0]; this._syncGhosts(u && u.specs ? u.specs : [], D); }
      const cold = [], main = [], yard = [];
      const items = [];
      // 보관 짐(이삿짐·계절 재고)은 칸 수만큼 바닥을 차지하게 4·2·1칸 상자로 나눠 쌓는다 — 큰 상자 하나로는 10칸이 3칸처럼 보였다.
      // 누르면 어느 조각이든 그 보관 계약 상세(sid)
      for (const s of game.storage || []) { let left = game.storageVol ? game.storageVol(s) : s.vol, k = 0; while (left > 0) { const sz = left >= 4 ? 4 : left >= 2 ? 2 : 1; items.push({ id: 's' + s.id + '#' + (k++), sid: 's' + s.id, type: 'storage', size: sz, baseSize: sz, baseSizeVis: sz, outdoor: s.outdoor, storage: true }); left -= sz; } }
      for (const p of game.parcels) items.push(p);
      const rack = [], mezz = [];
      for (const p of items) { if (!p.storage) p.baseSizeVis = this._visSize(p); (p.outdoor ? yard : ((p.inCold || p.inFrozen) ? cold : p.area === 'rack' && this.Z.RACK ? rack : p.area === 'mezz' && this.Z.MEZZ ? mezz : main)).push(p); }
      const pos = new Map([...this._pack(cold, this.Z.COLD), ...this._pack(main, this.Z.MAIN), ...this._pack(yard, this.Z.YARD),
        ...(this.Z.RACK ? this._packRack(rack, this.Z.RACK) : []), ...(this.Z.MEZZ ? this._pack(mezz, this.Z.MEZZ, this.Z.MEZZ.y) : [])]);
      // 지금 비가 오거나 예보에 비·눈이 있으면 마당에 나가 있는 것들은 젖는다
      let wetRisk = false;
      try { const w = game.weatherNow && game.weatherNow(); wetRisk = ['rain', 'snow', 'storm'].includes(w) || (game.upcoming && game.upcoming().some(u => ['rain', 'snow', 'storm'].includes(u.weather))); } catch (e) { }
      const seen = new Set();
      for (const p of items) {
        seen.add(p.id);
        let b = this.boxes.get(p.id);
        const [w, d, h] = FOOT[p.baseSizeVis];
        if (!b) {
          const valueTier = this._valueTier(p);
          const accents = [0xf7e9c5, 0x6fdcff, 0xffd166, 0xff70d2];
          const bodyColor = new THREE.Color(p.storage ? STORAGE_COLOR : D.PARCEL_TYPES[p.type].color);
          if (valueTier) bodyColor.lerp(new THREE.Color(accents[valueTier]), valueTier === 3 ? 0.32 : 0.16);
          b = this._box(w * CELL - 0.08, h, d * CELL - 0.08, bodyColor.getHex());
          // 테이프
          const tape = this._box(w * CELL - 0.06, h * (valueTier >= 2 ? 0.25 : 0.18), 0.12, accents[valueTier], valueTier === 3 ? { emissive: 0x6b174e } : undefined); tape.position.y = h * 0.42; b.add(tape);
          if (valueTier >= 1) { const top = this._box(w * CELL * 0.62, 0.045, d * CELL * 0.62, accents[valueTier], valueTier === 3 ? { emissive: 0x5b1548 } : undefined); top.position.set(0, h / 2 + 0.025, 0); b.add(top); }
          if (valueTier >= 2) {
            const strap = this._box(0.1, h + 0.025, d * CELL - 0.035, accents[valueTier]); b.add(strap);
            const seal = this._box(0.24, 0.055, 0.24, valueTier === 3 ? 0xffffff : 0xfff1a8, valueTier === 3 ? { emissive: 0x7a4d00 } : undefined); seal.position.set(0, h / 2 + 0.055, 0); seal.rotation.y = Math.PI / 4; b.add(seal);
          }
          if (p.type === 'fragile') b.add(this._tagMark('!', '#f0a04b', '#1b1a2e', w, h, d));   // 깨지는 것 — 대사 속 ⚠ 상자와 같은 '!' 딱지
          if (p.type === 'intl') { const mark = this._box(w * CELL * 0.4, 0.05, 0.16, 0xffffff); mark.position.set(0, h / 2 + 0.03, 0); b.add(mark); }
          if (p.type === 'fresh') { const mark = this._box(w * CELL * 0.5, 0.04, d * CELL * 0.5, 0xffffff); mark.position.set(0, h / 2 + 0.03, 0); b.add(mark); }
          if (p.storage) { const band = this._box(w * CELL - 0.04, h * 0.14, d * CELL - 0.04, 0xe8e0ff); band.position.y = -h * 0.18; b.add(band); }   // 맡은 짐 표시 — 흰 띠
          b.userData = { h, id: p.id, valueTier, inspect: { kind: 'parcel', id: p.sid || p.id } };
          if (!p.storage) { const cu = (window.META && window.META.CUSTOMERS[p.customer || 'anon']); if (cu) b.add(this._iconMark(cu.icon, w, h, d)); }
          this.scene.add(b); this.boxes.set(p.id, b);
          const t = pos.get(p.id);
          if (opts.animate && t) { b.position.set(t.cx, t.y + h / 2 + 4, t.cz); this._tween(b.position, { y: t.y + h / 2 }, 0.55, bounce, 0.05 * (this.tweens.length % 6)); }
          else b.position.set(t.cx, t.y + h / 2, t.cz);
        } else {
          const t = pos.get(p.id);
          if (t && !b.userData.locked && (Math.abs(b.position.x - t.cx) > 0.01 || Math.abs(b.position.z - t.cz) > 0.01 || Math.abs(b.position.y - (t.y + h / 2)) > 0.01)) this._tween(b.position, { x: t.cx, z: t.cz, y: t.y + h / 2 }, 0.35, ease);
        }
        // 상태 색상
        const m = b.material;
        const base = new THREE.Color(p.storage ? STORAGE_COLOR : D.PARCEL_TYPES[p.type].color);
        const vt = this._valueTier(p); if (vt) base.lerp(new THREE.Color([0, 0x6fdcff, 0xffd166, 0xff70d2][vt]), vt === 3 ? 0.32 : 0.16);
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
    deliver(parcelIds, onDone, options = {}) {
      // 호출 대수만큼 트럭을 동시에 풀어 나란히 진입 → 각자 맡은 박스 적재 → 출발시킨다.
      this.busy++;
      const total = Math.max(1, options.trucks || 1), delivered = new Set(parcelIds);
      const loads = options.loads && options.loads.length ? options.loads.map(ids => ids.filter(id => delivered.has(id))) : [parcelIds.slice()];
      while (loads.length < total) loads.push([]);
      for (const id of parcelIds) { const b = this.boxes.get(id); if (b) b.userData.locked = true; }
      this._ensureTruckFleet(total);
      if (this.workers) this._setWorkerTruckPatrol(this.workers[1]);
      const roadZ = this.Z ? this.Z.roadZ : this.truck.position.z;
      const gap = total <= 1 ? 0 : total <= 3 ? 0.95 : Math.max(0.55, 2.8 / (total - 1));
      let remaining = total;
      for (let trip = 0; trip < total; trip++) {
        const truck = this.trucks[trip];
        if (options.carrier) this._paintTruck(truck, options.carrier);
        const boxes = (loads[trip] || []).map(id => this.boxes.get(id)).filter(Boolean);
        const z = roadZ + (trip - (total - 1) / 2) * gap, startDelay = trip * 0.12;
        truck.position.set(TRUCK_PARK + 1.5, 0, z); truck.visible = true;
        if (options.onTruck) this._tween({}, {}, 0.001, ease, startDelay, () => options.onTruck(trip + 1, total));
        this._tween(truck.position, { x: TRUCK_DOCK }, 0.58, ease, startDelay, () => {
          boxes.forEach((b, i) => {
            const tx = truck.position.x + 0.4 + (i % 3) * 0.3 - 0.3, tz = truck.position.z;
            this._tween(b.position, { y: b.position.y + 2.2 }, 0.2, ease, i * 0.1);
            this._tween(b.position, { x: tx, z: tz, y: this.truckCargoY }, 0.28, ease, i * 0.1 + 0.2, () => {
              // 적재가 끝나면 트럭의 자식으로 옮겨 붙인다 — 실은 채 같이 움직이며, 꽉 찬 트럭과 빈 트럭이 눈에 다르게 보인다
              const localX = 0.4 + (i % 3) * 0.3 - 0.3, localZ = ((i / 3 | 0) - 0.5) * 0.34, localY = this.truckCargoY - truck.position.y;
              this.scene.remove(b); b.position.set(localX, localY, localZ); b.scale.set(0.6, 0.6, 0.6); truck.add(b);
            });
          });
          const wait = Math.max(0.38, boxes.length * 0.1 + 0.58);
          this._tween(truck.position, { x: TRUCK_GONE }, 0.68, ease, wait, () => {
            for (const b of boxes) { truck.remove(b); this.boxes.delete(b.userData.id); }
            truck.visible = false; truck.position.set(TRUCK_PARK, 0, roadZ);   // 싣고 간 차는 돌아오지 않는다 — 다음 호출 때 새로 온다
            remaining--;
            if (remaining === 0) { if (this.workers) this._setWorkerIdle(this.workers[1]); this.busy--; onDone && onDone(); }
          });
        });
      }
    }
    selfDeliver(parcelIds, onDone) {
      // 직접 배송: 트럭이 아니라 도크 인부가 상자를 들고 뛰어나갔다 온다 (건물 안 인부는 그대로 정리를 계속한다)
      this.busy++;
      for (const id of parcelIds) { const b = this.boxes.get(id); if (b) { this.scene.remove(b); this.boxes.delete(id); } }
      const w = this.workers && this.workers[1], n = parcelIds.length;
      if (!w || !n) { this.busy--; onDone && onDone(); return; }
      this._setWorkerErrand(w, n, () => { this._setWorkerIdle(w); this.busy--; onDone && onDone(); });
    }
    discard(parcelId) {
      const b = this.boxes.get(parcelId); if (!b) return;
      b.userData.locked = true;
      this._tween(b.scale, { x: 0.01, y: 0.01, z: 0.01 }, 0.4, ease, 0, () => { this.scene.remove(b); this.boxes.delete(parcelId); });
      this._tween(b.position, { y: b.position.y - 0.4 }, 0.4, ease);
    }
    shake(amount = 0.15) { this.shakeT = 0.35; this.shakeA = amount; }
    cheer(power = 1) { const d = 1.4 + power * 0.5; this.workerMood = 1; this.workerMoodT = d; this.workerMoodDur = d; }
    mope(power = 1) { const d = 1.4 + power * 0.5; this.workerMood = -1; this.workerMoodT = d; this.workerMoodDur = d; }
    // 이모지는 한 번 그린 캔버스 텍스처를 재사용한다 (기분이 바뀔 때마다 다시 그리지 않는다)
    _emojiTexture(char) {
      this._emojiCache = this._emojiCache || {};
      if (this._emojiCache[char]) return this._emojiCache[char];
      const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d');
      ctx.font = '46px "Noto Color Emoji", "Segoe UI Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(char, 32, 34);
      const tex = new THREE.CanvasTexture(c); this._emojiCache[char] = tex; return tex;
    }
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
      if (this.parts.shopRoof) this.parts.shopRoof.visible = !on;
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
      this.truck.visible = true;
      this.dropTween('introtruck');
      this.tweens.push({ tag: 'introtruck', obj: this.truck.position, from: { x: this.truck.position.x }, to: { x }, dur: dur || 2.4, fn: ease, t: 0 });
    }
    dropTween(tag) { this.tweens = this.tweens.filter(t => t.tag !== tag); }
    camSet(p, l) { this.camera.position.set(p[0], p[1], p[2]); this.camera.lookAt(l[0], l[1], l[2]); }
    camHome() { return { p: [this.camX, this.camY, this.camZ], l: (this.camLook || [1.3, 0.3, 0.3]).slice(), fov: this.camFov || this.camera.fov }; }
    // ---------- 도크 인부: 걷기(구간 왕복) + 기분(mood) ----------
    // homeA↔homeB 를 왕복한다. legsLeft: -1 무한 순찰, N 이면 N번 왕복(2N 구간) 뒤 onDone 을 부르고 멈춘다.
    // speed 에 ±15% 무작위 편차를 주고 시작을 delay 만큼 늦춰서, 같은 경로를 걷는 두 인부가 거울처럼 딱 맞춰
    // 움직이지 않게 한다 (그대로 두면 로봇처럼 보인다).
    _setWorkerRoute(w, homeA, homeB, speed, legsLeft, onDone, delay = 0) {
      const u = w.userData;
      u.homeA = homeA; u.homeB = homeB; u.speed = speed * (0.85 + Math.random() * 0.3); u.legsLeft = legsLeft; u.onDone = onDone || null;
      u.t = 0; u.dir = 1; u.carrying = legsLeft !== 0; u.wait = delay;
      w.position.set(homeA.x, 0, homeA.z); w.rotation.y = Math.atan2(homeB.x - homeA.x, homeB.z - homeA.z);
      u.box.visible = u.carrying;
    }
    _setWorkerIdle(w, delay = 0) { this._setWorkerRoute(w, w.userData.idleA, w.userData.idleB, 0.55, -1, null, delay); w.userData.carrying = false; w.userData.box.visible = false; }
    _setWorkerTruckPatrol(w, delay = 0) { this._setWorkerRoute(w, w.userData.dockA, w.userData.dockB, 1.7, -1, null, delay); }
    _setWorkerErrand(w, count, onDone, delay = 0) { this._setWorkerRoute(w, w.userData.dockA, w.userData.exitB, 2.8, Math.max(1, count) * 2, onDone, delay); }
    _poseWorkerMood(w, mood) {
      const u = w.userData, ph = this.time * (mood === 1 ? 11 : 2.2) + u.phase;
      w.position.y = Math.max(0, Math.sin(ph)) * (mood === 1 ? 0.11 : 0);
      w.rotation.x = (mood === -1 ? 0.32 : 0) + Math.sin(this.time * (mood === -1 ? 1.6 : 2.2) + u.phase) * (mood === -1 ? 0.03 : 0.015);
      w.rotation.y = 0; u.legPivotL.rotation.x = u.legPivotR.rotation.x = 0; u.box.visible = false;
      if (mood === 1) { u.armPivotL.rotation.z = -2.5 + Math.sin(ph) * 0.35; u.armPivotR.rotation.z = 2.5 - Math.sin(ph) * 0.35; u.armPivotL.rotation.x = u.armPivotR.rotation.x = 0; }
      else { u.armPivotL.rotation.z = 0.35; u.armPivotR.rotation.z = -0.35; u.armPivotL.rotation.x = u.armPivotR.rotation.x = 0.45; }
      // 머리 위 이모지 — 튀어 오르듯 나타났다 둥실거리고, 기분이 가실 때 즈음 사라진다 (만화적 연출)
      const sp = u.moodSprite, dur = this.workerMoodDur || 1.4, elapsed = dur - this.workerMoodT;
      const popIn = Math.min(1, elapsed / 0.2), fadeOut = Math.min(1, this.workerMoodT / 0.35);
      const overshoot = elapsed < 0.28 ? 1 + Math.sin(Math.min(1, elapsed / 0.28) * Math.PI) * 0.35 : 1;
      const tex = this._emojiTexture(mood === 1 ? '❤️' : '😓'); if (sp.material.map !== tex) { sp.material.map = tex; sp.material.needsUpdate = true; }
      sp.material.opacity = Math.min(popIn, fadeOut);
      sp.visible = sp.material.opacity > 0.01;
      const scale = 0.3 * overshoot; sp.scale.set(scale, scale, 1);
      sp.position.set(0, 1.28 + (1 - popIn) * 0.18 + Math.sin(this.time * 4.5 + u.phase) * 0.035, 0);
    }
    _tickWorkers(dt) {
      if (!this.workers) return;
      if (this.workerMoodT > 0) { this.workerMoodT -= dt; if (this.workerMoodT <= 0) { this.workerMoodT = 0; this.workerMood = 0; } }
      const mood = this.workerMood;
      for (const w of this.workers) {
        if (mood !== 0) { this._poseWorkerMood(w, mood); continue; }
        const u = w.userData; if (!u.homeA) continue;
        if (u.moodSprite.visible) u.moodSprite.visible = false;
        if (u.wait > 0) {
          u.wait -= dt; u.legPivotL.rotation.x = u.legPivotR.rotation.x = 0; w.position.y = 0;
          const idleSwing = Math.sin(this.time * 1.1 + u.phase) * 0.08;
          u.armPivotL.rotation.x = -idleSwing; u.armPivotR.rotation.x = idleSwing; u.armPivotL.rotation.z = u.armPivotR.rotation.z = 0;
          continue;
        }
        const from = u.dir > 0 ? u.homeA : u.homeB, to = u.dir > 0 ? u.homeB : u.homeA;
        const len = Math.hypot(to.x - from.x, to.z - from.z) || 1;
        let moving = false;
        if (u.legsLeft !== 0 && u.t < 1) {
          u.t = Math.min(1, u.t + (u.speed / len) * dt); moving = true;
          w.position.x = from.x + (to.x - from.x) * u.t; w.position.z = from.z + (to.z - from.z) * u.t;
          w.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        } else if (u.legsLeft !== 0) {
          u.dir *= -1; u.t = 0;
          if (u.legsLeft > 0) { u.legsLeft--; u.carrying = u.legsLeft !== 0 ? u.dir > 0 : false; if (u.legsLeft === 0) { const cb = u.onDone; u.onDone = null; cb && cb(); } }
          else u.carrying = u.dir > 0;
        }
        u.box.visible = u.carrying;
        const ph = this.time * (3 + u.speed * 6) + u.phase;
        w.position.y = moving ? Math.abs(Math.sin(ph)) * (u.speed > 0.7 ? 0.05 : 0.025) : 0;
        const swing = moving ? Math.sin(ph) * (u.speed > 0.7 ? 0.8 : 0.5) : Math.sin(this.time * 1.1 + u.phase) * 0.08;
        u.legPivotL.rotation.x = swing; u.legPivotR.rotation.x = -swing;
        u.armPivotL.rotation.x = u.carrying ? 0.95 : -swing; u.armPivotR.rotation.x = u.carrying ? 0.95 : swing;
        u.armPivotL.rotation.z = u.armPivotR.rotation.z = 0;
      }
    }

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
        else if (b.userData.exposed) m.emissive.setRGB(0.05, 0.18 * pulse, 0.34 * pulse);
        else if (b.userData.valueTier === 3) m.emissive.setRGB(0.26 * pulse, 0.04, 0.2 * pulse);
        else if (b.userData.valueTier === 2) m.emissive.setRGB(0.13 * pulse, 0.09 * pulse, 0.01); else m.emissive.setRGB(0, 0, 0);
        if (b.userData.warm && !b.userData.locked) b.rotation.y = Math.sin(this.time * 6 + b.userData.id) * 0.06; else b.rotation.y = 0;
      }
      this._tickWeather(dt);
      // 트럭 바퀴 흔들림 — 동시에 달리는 트럭 전부
      for (const t of this.trucks) t.position.y = (t.position.x < TRUCK_PARK - 0.1 && t.position.x > TRUCK_DOCK + 0.1) ? Math.abs(Math.sin(this.time * 30)) * 0.03 : 0;
      this._tickWorkers(dt);
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
