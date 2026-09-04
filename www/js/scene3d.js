// 로우폴리 창고 장면 (Three.js)
window.Scene3D = (function () {
  const CELL = 0.6;
  const MAIN = { x0: -1.2, cells: 8, depth: 7 };   // 일반 구역 (오른쪽)
  const COLD = { x0: -4.6, cells: 4, depth: 7 };   // 냉장 구역 (왼쪽)
  const FOOT = { 1: [1, 1, 0.5], 2: [2, 1, 0.6], 4: [2, 2, 0.95], 7: [3, 2, 1.5] }; // [w, d, h]
  const TRUCK_PARK = 12, TRUCK_DOCK = 6.7, TRUCK_GONE = 17;

  function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
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
      this.camera.position.set(2.6, 7.8, 9.8);
      this.camera.lookAt(1.3, 0.3, 0.3);
      this.tweens = []; this.boxes = new Map(); this.clock = new THREE.Clock(); this.time = 0;
      this.busy = 0;
      this._buildWorld();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this._loop();
    }
    resize() {
      const w = this.container.clientWidth || 360, h = this.container.clientHeight || 220;
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.fov = w / h < 0.9 ? 46 : 38;
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
    _buildWorld() {
      const s = this.scene;
      s.add(new THREE.HemisphereLight(0xdfefff, 0x6b8f4e, 0.9));
      const sun = new THREE.DirectionalLight(0xfff2d0, 1.1); sun.position.set(6, 12, 5); sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
      s.add(sun);
      // 바닥 (콘크리트) + 잔디
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), this._mat(0x6b8f4e)); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; s.add(ground);
      const floor = this._box(9.8, 0.12, 6.2, 0x9a9aa8); floor.position.set(-0.3, 0.0, 1.4); s.add(floor);
      // 뒷벽 / 왼쪽벽 / 기둥
      const back = this._box(9.8, 3.2, 0.25, 0xd9c8a8); back.position.set(-0.3, 1.6, -1.7); s.add(back);
      const left = this._box(0.25, 3.2, 6.2, 0xcdbd9e); left.position.set(-5.1, 1.6, 1.4); s.add(left);
      const roof = this._box(10.2, 0.22, 2.4, 0xb8453b); roof.position.set(-0.3, 3.2, -0.7); s.add(roof);
      for (let i = 0; i < 3; i++) { const p = this._box(0.22, 3.1, 0.22, 0xb59a75); p.position.set(-4.9 + i * 4.7, 1.55, -1.45); s.add(p); }
      const right = this._box(0.25, 3.2, 2.0, 0xcdbd9e); right.position.set(4.5, 1.6, -0.7); s.add(right);
      // 냉장 구역 바닥 + 낮은 벽
      const cf = this._box(COLD.cells * CELL + 0.2, 0.06, COLD.depth * CELL + 0.2, 0x8fd8e8); cf.position.set(COLD.x0 + COLD.cells * CELL / 2 - 0.1, 0.1, -1.3 + COLD.depth * CELL / 2); s.add(cf);
      const cw = this._box(0.12, 0.5, COLD.depth * CELL + 0.2, 0x5fb8d0); cw.position.set(COLD.x0 + COLD.cells * CELL + 0.06, 0.3, cf.position.z); s.add(cw);
      const cw2 = this._box(COLD.cells * CELL + 0.2, 0.5, 0.12, 0x5fb8d0); cw2.position.set(cf.position.x, 0.3, -1.3 + COLD.depth * CELL + 0.06); s.add(cw2);
      // 냉장 표시등
      const lamp = this._box(0.3, 0.3, 0.3, 0x5ee0d8, { emissive: 0x2a8f8a }); lamp.position.set(COLD.x0 + 0.4, 2.9, -1.5); s.add(lamp);
      // 도크 라인 (오른쪽)
      const dock = this._box(0.4, 0.05, 3.0, 0xf0d060); dock.position.set(4.9, 0.08, 1.8); s.add(dock);
      // 트럭
      this.truck = this._makeTruck(); this.truck.position.set(TRUCK_PARK, 0, 1.8); s.add(this.truck);
      // 도로
      const road = new THREE.Mesh(new THREE.PlaneGeometry(40, 3.4), this._mat(0x4a4a52)); road.rotation.x = -Math.PI / 2; road.position.set(14, -0.02, 1.8); road.receiveShadow = true; s.add(road);
      // 나무 몇 그루 (장식)
      [[-7.5, -3], [8.5, -3.5], [-8, 3.5]].forEach(([x, z]) => { const t = new THREE.Group(); const trunk = this._box(0.3, 0.8, 0.3, 0x8a5a3a); trunk.position.y = 0.4; const leaf = this._box(1.2, 1.2, 1.2, 0x4f9a4a); leaf.position.y = 1.4; t.add(trunk, leaf); t.position.set(x, 0, z); s.add(t); });
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
        out.set(p.id, { cx: zone.x0 + (x + w / 2) * CELL, cz: -1.3 + (z + d / 2) * CELL, over: z + d > zone.depth });
        x += w; rowD = Math.max(rowD, d);
      }
      return out;
    }
    _visSize(p) { return p.size >= 7 ? 7 : p.size >= 4 ? 4 : p.size >= 2 ? 2 : 1; }
    sync(game, opts = {}) {
      const D = window.DATA;
      const cold = [], main = [];
      for (const p of game.parcels) { p.baseSizeVis = this._visSize(p); (p.type === 'fresh' && p.inCold ? cold : main).push(p); }
      const pos = new Map([...this._pack(cold, COLD), ...this._pack(main, MAIN)]);
      const seen = new Set();
      for (const p of game.parcels) {
        seen.add(p.id);
        let b = this.boxes.get(p.id);
        const [w, d, h] = FOOT[p.baseSizeVis];
        if (!b) {
          b = this._box(w * CELL - 0.08, h, d * CELL - 0.08, D.PARCEL_TYPES[p.type].color);
          // 테이프
          const tape = this._box(w * CELL - 0.06, h * 0.18, 0.12, 0xf7e9c5); tape.position.y = h * 0.42; b.add(tape);
          if (p.type === 'fragile') { const mark = this._box(0.12, h * 0.5, 0.05, 0xb8453b); mark.position.set(0, 0, d * CELL / 2 - 0.02); b.add(mark); }
          if (p.type === 'intl') { const mark = this._box(w * CELL * 0.4, 0.05, 0.16, 0xffffff); mark.position.set(0, h / 2 + 0.03, 0); b.add(mark); }
          if (p.type === 'fresh') { const mark = this._box(w * CELL * 0.5, 0.04, d * CELL * 0.5, 0xffffff); mark.position.set(0, h / 2 + 0.03, 0); b.add(mark); }
          b.userData = { h, id: p.id };
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
        const base = new THREE.Color(D.PARCEL_TYPES[p.type].color);
        if (p.type === 'fresh' && p.fresh <= 0) base.multiplyScalar(0.55);
        m.color.copy(base);
        b.userData.overdue = p.overdue || (p.type === 'fresh' && p.fresh <= 1) || false;
        b.userData.warm = p.type === 'fresh' && !p.inCold;
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

    _loop() {
      requestAnimationFrame(() => this._loop());
      const dt = Math.min(0.05, this.clock.getDelta()); this.time += dt;
      for (let i = this.tweens.length - 1; i >= 0; i--) {
        const tw = this.tweens[i]; tw.t += dt;
        if (tw.t < 0) continue;
        const k = Math.min(1, tw.t / tw.dur), e = tw.fn(k);
        for (const key in tw.to) tw.obj[key] = tw.from[key] + (tw.to[key] - tw.from[key]) * e;
        if (k >= 1) { this.tweens.splice(i, 1); tw.onDone && tw.onDone(); }
      }
      // 기한 초과 깜빡임 / 냉장 밖 신선식품 흔들림
      const pulse = (Math.sin(this.time * 8) + 1) / 2;
      for (const b of this.boxes.values()) {
        const m = b.material;
        if (b.userData.overdue) m.emissive.setRGB(0.5 * pulse, 0.05, 0.05); else m.emissive.setRGB(0, 0, 0);
        if (b.userData.warm && !b.userData.locked) b.rotation.y = Math.sin(this.time * 6 + b.userData.id) * 0.06; else b.rotation.y = 0;
      }
      // 트럭 바퀴 흔들림
      if (this.truck.position.x < TRUCK_PARK - 0.1 && this.truck.position.x > TRUCK_DOCK + 0.1) this.truck.position.y = Math.abs(Math.sin(this.time * 30)) * 0.03; else this.truck.position.y = 0;
      if (this.shakeT > 0) { this.shakeT -= dt; this.camera.position.x = 2.6 + (Math.random() - 0.5) * this.shakeA; this.camera.position.y = 7.8 + (Math.random() - 0.5) * this.shakeA; }
      else { this.camera.position.x = 2.6; this.camera.position.y = 7.8; }
      this.renderer.render(this.scene, this.camera);
    }
  }
  return Scene3D;
})();
