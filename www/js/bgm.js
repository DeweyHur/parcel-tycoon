// BGM 시스템 (WebAudio, 끊김 없는 루프 + 크로스페이드)
window.BGM = (function () {
  const FILES = {
    title: 'audio/title.mp3', warehouse: 'audio/warehouse.mp3', overflow: 'audio/overflow.mp3', market: 'audio/market.mp3',
    gameover: 'audio/gameover.mp3', fanfare: 'audio/fanfare.mp3',
  };
  let ctx = null, master = null, duck = null, buffers = {}, loading = {};
  let duckTimer = null;
  let cur = null;                     // { name, src, gain }
  let pending = null;                 // 컨텍스트가 잠겨 있을 때 예약된 재생
  let enabled = true, volume = 0.6;

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = enabled ? volume : 0; master.connect(ctx.destination);
      duck = ctx.createGain(); duck.gain.value = 1; duck.connect(master); // BGM 전용 (스팅어 재생 시 낮춤)
    } catch (e) { ctx = null; }
  }
  function resume() {
    init(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().then(() => { if (pending) { const p = pending; pending = null; play(p.name, p.opts); } });
    else if (pending) { const p = pending; pending = null; play(p.name, p.opts); }
  }
  function load(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    init(); if (!ctx) return Promise.reject(new Error('no audio'));
    loading[name] = fetch(FILES[name]).then(r => r.arrayBuffer()).then(b => new Promise((res, rej) => ctx.decodeAudioData(b, res, rej)))
      .then(buf => { buffers[name] = buf; delete loading[name]; return buf; })
      .catch(e => { delete loading[name]; throw e; });
    return loading[name];
  }
  function preload(names) { for (const n of names) load(n).catch(() => { }); }

  // 루프 BGM 재생 (같은 곡이면 무시). fade: 초
  function play(name, opts = {}) {
    if (!FILES[name]) return;
    init(); if (!ctx) return;
    if (cur && cur.name === name) return;
    if (ctx.state !== 'running') { pending = { name, opts }; return; }
    const fade = opts.fade == null ? 0.8 : opts.fade;
    load(name).then(buf => {
      if (cur && cur.name === name) return;
      if (pending && pending.name !== name) return; // 그 사이 다른 곡이 예약됨
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
  }
  function stop(fade = 0.6) { pending = null; if (cur) { _fadeOut(cur, fade); cur = null; } }
  // 원샷 (팡파레 등): BGM 위에 겹쳐 재생
  function oneShot(name, vol = 1) {
    init(); if (!ctx || !enabled || ctx.state !== 'running') return;
    load(name).then(buf => { const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start(); }).catch(() => { });
  }
  // 스팅어: BGM을 잠깐 껐다가(덕킹) 원샷을 재생하고 끝나면 BGM을 다시 올림
  function stinger(name, vol = 1) {
    init(); if (!ctx || !enabled) return;
    if (ctx.state !== 'running') return;
    load(name).then(buf => {
      const t = ctx.currentTime;
      clearTimeout(duckTimer);
      duck.gain.cancelScheduledValues(t); duck.gain.setValueAtTime(Math.max(duck.gain.value, 0.0001), t);
      duck.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      const s = ctx.createBufferSource(); s.buffer = buf; const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start(t + 0.2);
      const back = t + 0.2 + buf.duration - 0.6;
      duck.gain.setValueAtTime(0.0001, back); duck.gain.exponentialRampToValueAtTime(1, back + 1.0);
      duckTimer = setTimeout(() => { if (ctx) { duck.gain.cancelScheduledValues(ctx.currentTime); duck.gain.setValueAtTime(1, ctx.currentTime); } }, (buf.duration + 1.5) * 1000);
    }).catch(() => { });
  }
  function setEnabled(v) { enabled = v; if (master) master.gain.setTargetAtTime(enabled ? volume : 0, ctx.currentTime, 0.05); }
  function setVolume(v) { volume = Math.max(0, Math.min(1, v)); if (master && enabled) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05); }
  function current() { return cur ? cur.name : null; }

  // 앱이 백그라운드로 가면 정지, 돌아오면 재개
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });
  return { init, resume, preload, play, stop, oneShot, stinger, setEnabled, setVolume, current, isEnabled: () => enabled, getVolume: () => volume };
})();
