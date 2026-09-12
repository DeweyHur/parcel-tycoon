// BGM 시스템 (WebAudio, 끊김 없는 루프 + 크로스페이드)
// 오디오 컨텍스트는 게임 전체에서 하나만 쓴다 (효과음도 BGM.context() 를 받아 쓴다).
// 컨텍스트가 둘이면 창이 가려졌을 때 음악 쪽만 멈추고 효과음만 계속 울린다.
window.BGM = (function () {
  const FILES = {
    title: 'audio/title.mp3', warehouse: 'audio/warehouse.mp3', overflow: 'audio/overflow.mp3', market: 'audio/market.mp3',
    gameover: 'audio/gameover.mp3', fanfare: 'audio/fanfare.mp3',
  };
  let ctx = null, master = null, duck = null, buffers = {}, loading = {};
  let duckTimer = null;
  let cur = null;                     // { name, src, gain }
  let want = null;                    // 마지막으로 "지금 나와야 한다"고 요청된 곡 — 끊겼을 때 이걸로 되살린다
  let gen = 0;                        // 재생 세대. 늦게 도착한 디코드가 끼어들어 두 곡이 겹치는 것을 막는다
  let enabled = true, volume = 0.6;

  function init() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = enabled ? volume : 0; master.connect(ctx.destination);
      duck = ctx.createGain(); duck.gain.value = 1; duck.connect(master); // BGM 전용 (스팅어 재생 시 낮춤)
    } catch (e) { ctx = null; }
    return ctx;
  }
  // 효과음도 같은 컨텍스트를 쓴다 (출력 스트림 하나 · 잠자기/깨우기 한 곳에서)
  function context() { return init(); }
  function _unduck() { if (!ctx || !duck) return; clearTimeout(duckTimer); duck.gain.cancelScheduledValues(ctx.currentTime); duck.gain.setValueAtTime(1, ctx.currentTime); }
  // 컨텍스트를 깨우고, 그 사이 끊긴 곡이 있으면 다시 올린다
  function resume() {
    init(); if (!ctx) return;
    const revive = () => { if (want && (!cur || cur.name !== want)) play(want, { fade: 0.4 }); };
    if (ctx.state !== 'running') { const p = ctx.resume(); if (p && p.then) p.then(revive, () => { }); else revive(); }
    else revive();
  }
  function load(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    init(); if (!ctx) return Promise.reject(new Error('no audio'));
    // 단일 파일 웹 빌드(tools/build-web.py)는 오디오를 base64로 인라인한다
    const inline = window.__AUDIO_B64__ && window.__AUDIO_B64__[name];
    const fetchBuf = inline ? Promise.resolve((() => { const bin = atob(inline); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; })()) : fetch(FILES[name]).then(r => r.arrayBuffer());
    loading[name] = fetchBuf.then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
      .then(buf => { buffers[name] = buf; delete loading[name]; return buf; })
      .catch(e => { delete loading[name]; throw e; });
    return loading[name];
  }
  function preload(names) { for (const n of names) load(n).catch(() => { }); }

  // 루프 BGM 재생 (같은 곡이면 무시). fade: 초
  function play(name, opts = {}) {
    if (!FILES[name]) return;
    init(); if (!ctx) return;
    want = name;
    if (cur && cur.name === name) return;
    if (ctx.state !== 'running') return;   // 자고 있으면 건드리지 않는다 — resume() 이 want 로 되살린다
    const fade = opts.fade == null ? 0.8 : opts.fade;
    const my = ++gen;
    load(name).then(buf => {
      if (my !== gen) return;                        // 그 사이 다른 곡이 요청됨
      if (!ctx || ctx.state !== 'running') return;   // 그 사이 잠듦
      if (cur && cur.name === name) return;
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = opts.loop !== false;
      const gain = ctx.createGain(); gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fade);
      src.connect(gain); gain.connect(duck); src.start();
      _fadeOut(cur, fade);
      cur = { name, src, gain };
      if (!src.loop) src.onended = () => { if (cur && cur.src === src) cur = null; };
    }).catch(() => { });
  }
  function _fadeOut(t, fade) {
    if (!t) return;
    const g = t.gain.gain; g.cancelScheduledValues(ctx.currentTime); g.setValueAtTime(Math.max(g.value, 0.0001), ctx.currentTime);
    g.exponentialRampToValueAtTime(0.0001, ctx.currentTime + fade);
    try { t.src.stop(ctx.currentTime + fade + 0.05); } catch (e) { }
    t.src.onended = () => { try { t.src.disconnect(); t.gain.disconnect(); } catch (e) { } };
  }
  function stop(fade = 0.6) { gen++; want = null; if (cur) { _fadeOut(cur, fade); cur = null; } }
  // 원샷 (팡파레 등): BGM 위에 겹쳐 재생
  function oneShot(name, vol = 1) {
    init(); if (!ctx || !enabled || ctx.state !== 'running') return;
    load(name).then(buf => {
      const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol;
      s.connect(g); g.connect(master); s.start();
      s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { } };
    }).catch(() => { });
  }
  // 스팅어: BGM을 잠깐 껐다가(덕킹) 원샷을 재생하고 끝나면 BGM을 다시 올림
  function stinger(name, vol = 1) {
    init(); if (!ctx || !enabled) return;
    if (ctx.state !== 'running') return;
    load(name).then(buf => {
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime;
      clearTimeout(duckTimer);
      duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(Math.max(duck.gain.value, 0.0001), t);
      duck.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start(t + 0.2);
      s.onended = () => { try { s.disconnect(); g.disconnect(); } catch (e) { } };
      const back = t + 0.2 + buf.duration - 0.6;
      duck.gain.setValueAtTime(0.0001, back); duck.gain.exponentialRampToValueAtTime(1, back + 1.0);
      duckTimer = setTimeout(_unduck, (buf.duration + 1.5) * 1000);
    }).catch(() => { });
  }
  function setEnabled(v) {
    enabled = v; if (!ctx || !master) return;
    master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.05);
    if (enabled) resume();   // 껐다 켜기는 "음악이 안 나올 때" 되살리는 수단이기도 하다
  }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master && enabled) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); }
  function current() { return cur ? cur.name : null; }

  // 앱이 백그라운드로 가면(창이 가려져도 마찬가지) 정지, 돌아오면 재개.
  // 돌아올 때는 raw ctx.resume() 이 아니라 모듈 resume() 을 써야 끊긴 곡이 되살아난다.
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { try { ctx.suspend(); } catch (e) { } }
    else { _unduck(); resume(); }
  });
  return { init, context, resume, preload, play, stop, oneShot, stinger, setEnabled, setVolume, current, isEnabled: () => enabled, getVolume: () => volume };
})();
