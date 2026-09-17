// 8비트 효과음 (WebAudio 합성, 외부 에셋 없음)
// 컨텍스트는 BGM 과 공유한다 — 따로 만들면 창이 가려졌을 때 음악만 멈추고 효과음만 계속 울린다.
window.SFX = (function () {
  let ctx = null, master = null, enabled = true;
  let voices = 0, lastBlip = -1, lastNarr = -1;
  const MAX_VOICES = 16;   // 동시에 울리는 목소리 상한 — 겹쳐 쌓여 "삐-" 한 음으로 뭉치지 않게
  function init() {
    if (ctx) return;
    try {
      ctx = (window.BGM && window.BGM.context && window.BGM.context()) || new (window.AudioContext || window.webkitAudioContext)();
      if (!ctx) return;
      master = ctx.createGain(); master.gain.value = 0.25; master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }
  function resume() {
    init(); if (!ctx) return;
    if (window.BGM && window.BGM.resume) window.BGM.resume();   // 같은 컨텍스트 — 음악 복구까지 함께
    else if (ctx.state !== 'running') ctx.resume();
  }
  function tone(freq, dur, type = 'square', vol = 1, when = 0, slide = 0) {
    if (!ctx || !enabled || ctx.state !== 'running') return;
    if (voices >= MAX_VOICES) return;
    const t0 = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
    voices++;
    o.onended = () => { voices--; try { o.disconnect(); g.disconnect(); } catch (e) { } };
  }
  function noise(dur, vol = 0.5, when = 0) {
    if (!ctx || !enabled || ctx.state !== 'running') return;
    if (voices >= MAX_VOICES) return;
    const t0 = ctx.currentTime + when;
    const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    s.connect(f); f.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + 0.02);
    voices++;
    s.onended = () => { voices--; try { s.disconnect(); f.disconnect(); g.disconnect(); } catch (e) { } };
  }
  const S = {
    resume, init,
    setEnabled(v) { enabled = v; },
    isEnabled() { return enabled; },
    click() { tone(880, 0.05, 'square', 0.4); },
    // 대화 타자 소리: 글자마다 짧은 삑. n으로 음높이를 조금씩 흔들어 "말하는" 느낌.
    // 최소 간격을 둬서 타자 루프가 겹쳐 돌더라도 이어진 한 음(삐-)으로 들리지 않게 한다.
    blip(n = 0) {
      if (!ctx || !enabled) return;
      const now = ctx.currentTime;
      if (lastBlip >= 0 && now - lastBlip < 0.05) return;
      lastBlip = now;
      const f = 300 + [0, 35, 70, 20, 55][n % 5]; tone(f, 0.035, 'square', 0.16, 0, 60);
    },
    nudge() { tone(330, 0.05, 'square', 0.3, 0, -120); },
    select() { tone(660, 0.06, 'square', 0.4); tone(990, 0.06, 'square', 0.3, 0.05); },
    cancel() { tone(440, 0.08, 'square', 0.4, 0, -200); },
    arrive() { tone(220, 0.08, 'triangle', 0.7, 0, -100); noise(0.08, 0.3, 0.02); },
    thud() { tone(120, 0.12, 'triangle', 0.9, 0, -80); noise(0.1, 0.35); },
    coin(n = 1) { for (let i = 0; i < Math.min(n, 5); i++) { tone(1046, 0.07, 'square', 0.35, i * 0.08); tone(1318, 0.12, 'square', 0.3, i * 0.08 + 0.06); } },
    truck() { tone(70, 0.6, 'sawtooth', 0.5, 0, 30); noise(0.5, 0.25); tone(90, 0.5, 'sawtooth', 0.4, 0.5, -30); },
    horn() { tone(392, 0.18, 'square', 0.5); tone(523, 0.25, 'square', 0.5, 0.18); },
    wait() { tone(330, 0.1, 'triangle', 0.5); tone(262, 0.15, 'triangle', 0.4, 0.1); },
    penalty() { tone(160, 0.2, 'sawtooth', 0.6, 0, -60); tone(120, 0.3, 'sawtooth', 0.6, 0.15, -40); },
    discard() { noise(0.3, 0.5); tone(200, 0.3, 'sawtooth', 0.5, 0, -150); },
    buy() { tone(523, 0.07, 'square', 0.4); tone(659, 0.07, 'square', 0.4, 0.07); tone(784, 0.12, 'square', 0.4, 0.14); },
    levelup() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.12, 'square', 0.4, i * 0.09)); },
    win() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, 'square', 0.45, i * 0.14)); },
    over() { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.5, i * 0.28, -20)); },
    // ---------- 오프닝 전용 ----------
    // 나레이션 타자 소리: 박 반장의 blip(300Hz 사각파)과 확실히 다른 음색이어야 한다.
    // 말하는 사람이 아니라 '속으로 읽는 글'이라 더 낮고 둥글게 — 삼각파 176Hz + 아주 옅은 배음.
    narrate(n = 0) {
      if (!ctx || !enabled || ctx.state !== 'running') return;
      const now = ctx.currentTime;
      if (lastNarr >= 0 && now - lastNarr < 0.05) return;
      lastNarr = now;
      const f = 176 + [0, 14, 26, 8, 20][n % 5];
      tone(f, 0.06, 'triangle', 0.14, 0, 26);
      tone(f * 2, 0.03, 'sine', 0.045);
    },
    recallIn() { tone(523, 1.0, 'sine', 0.30, 0, -300); tone(262, 1.2, 'sine', 0.22, 0.06, -120); noise(0.8, 0.10, 0.02); },
    recallOut() { tone(196, 0.9, 'sine', 0.28, 0, 340); tone(392, 0.7, 'sine', 0.20, 0.12, 180); noise(0.5, 0.08); },
    card() { tone(784, 0.05, 'triangle', 0.26); tone(1046, 0.09, 'triangle', 0.20, 0.05); },
    shutter() { noise(0.6, 0.26); tone(88, 0.55, 'sawtooth', 0.30, 0, 40); tone(150, 0.18, 'square', 0.16, 0.55, -70); },
  };
  return S;
})();
