// UI / 진행 제어
(function () {
  const D = window.DATA, M = window.META, I18n = window.I18n, T = I18n.t;
  const $ = s => document.querySelector(s);
  const SAVE_KEY = 'save_v2', OPT_KEY = 'opts_v1';
  let game = null, scene = null, busy = false;
  if (typeof window !== 'undefined') Object.defineProperty(window, '__game', { get: () => game });
  const BUILD = Object.assign({ demo: false, demoMonths: 6, iap: null, store: {} }, window.BUILD || {});   // 사이클 수 (6 = 3개월)
  const demoMonths = () => BUILD.demoMonths || 6;
  const demoMonthsLabel = () => Math.round(demoMonths() / D.CYCLES_PER_MONTH);   // 화면엔 개월로
  // 사이클 번호 → '3월 후반' (세이브 라벨·결과·기록처럼 game 이 없을 수도 있는 곳에서 쓴다)
  const cycleName = c => { const cy = D.CYCLES_PER_MONTH, mi = Math.ceil(c / cy), half = (c - 1) % cy + 1;
    const cal = ((D.START_MONTH - 1 + mi - 1) % 12) + 1; return T('fmt.cycle', { cal, half: T('fmt.half' + half) }); };
  const demoLocked = () => !!BUILD.demo && !Profile.hasFull();   // 데모 빌드 + 본편 미구매
  const opts = Object.assign({ sound: true, music: true, musicVol: 0.6, sms: true }, Store.get(OPT_KEY) || {});
  SFX.setEnabled(opts.sound); BGM.setEnabled(opts.music); BGM.setVolume(opts.musicVol);
  Profile.load();

  function saveOpts() { Store.set(OPT_KEY, opts); }
  function saveGame() { if (game && game.phase !== 'over' && game.phase !== 'win') Store.set(SAVE_KEY, game.toJSON()); else Store.remove(SAVE_KEY); }
  function loadSave() { const s = Store.get(SAVE_KEY); return s && s.cfg ? s : null; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ptype(p) { return D.PARCEL_TYPES[p.type]; }
  function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function gradeBadge(g) { return g && g !== 'normal' ? `<span class="badge ${g}">${D.GRADES[g].name}</span>` : ''; }

  // ---------- toast / float ----------
  let toastTimer; const toastQueue = [];
  function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.classList.remove('show'); if (toastQueue.length) { const n = toastQueue.shift(); setTimeout(() => toast(n[0], n[1]), 250); } }, ms); }
  function toastLater(msg, ms) { if ($('#toast').classList.contains('show')) toastQueue.push([msg, ms]); else toast(msg, ms); }
  function floatText(txt, bad, xPct = 50) {
    const el = document.createElement('div'); el.className = 'float' + (bad ? ' bad' : ''); el.textContent = txt;
    el.style.left = xPct + '%'; el.style.top = '45%'; el.style.transform = 'translateX(-50%)';
    $('#float-layer').appendChild(el); setTimeout(() => el.remove(), 1300);
  }
  function rewardBurst(label, tier = 1) {
    const layer = $('#float-layer'); if (!layer) return;
    const n = 10 + tier * 3, burst = document.createElement('div'); burst.className = `reward-burst tier-${tier}`;
    burst.innerHTML = `<b>${esc(label)}</b>` + Array.from({ length: n }, (_, i) => `<i style="--i:${i};--a:${Math.round(i * 360 / n)}deg"></i>`).join('');
    layer.appendChild(burst); setTimeout(() => burst.remove(), 1150);
  }
  function announce(got) {
    for (const a of got) {
      toastLater(T('ach.done', { name: a.name }), 2200);
      for (const u of a.unlocks) toastLater(T('ach.unlock', { name: u.name }), 2200);
      SFX.levelup();
    }
  }

  // ---------- modal ----------
  function modal(title, bodyHtml, buttons, sub) {
    const m = $('#modal');
    m.classList.remove('titlecard'); $('#modal-root').classList.remove('title-mode');   // 타이틀 화면만 모달 틀을 벗는다 — 다음 모달로 딸려가면 안 된다
    m.innerHTML = (title ? `<h2>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</h2>` : '') + `<div class="body">${bodyHtml}</div>` +
      (buttons && buttons.length ? `<div class="foot">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${esc(b.label)}</button>`).join('')}</div>` : '');
    m.querySelectorAll('.foot .btn').forEach(btn => btn.onclick = () => { SFX.resume(); SFX.click(); const b = buttons[+btn.dataset.i]; if (b.onClick) b.onClick(); });
    $('#modal-root').classList.add('show');
    m.querySelector('.body').scrollTop = 0;
    return m;
  }
  // window.confirm은 웹뷰·아티팩트 샌드박스에서 막히므로 자체 확인 모달
  function askConfirm(msg, onYes, yesLabel = T('btn.ok'), onNo) { modal(T('btn.ok'), `<p>${esc(msg)}</p>`, [{ label: T('btn.cancel'), onClick: onNo || closeModal }, { label: yesLabel, cls: 'warn', onClick: () => { closeModal(); onYes(); } }]); }
  function closeModal() { $('#modal-root').classList.remove('show'); $('#modal').innerHTML = ''; if (gateTarget && !document.body.contains(gateTarget)) clearGate(); }

  // ---------- title ----------
  // 소리 · 음악 · 언어 — 버튼 세 개가 아니라 아래쪽 텍스트 한 줄. 아이콘으로 바꾸지 않는다(도트 화면에선 세 글자가 더 짧다)
  function optRow() {
    const lang = (I18n.languages().find(l => l.id === I18n.lang) || {}).name || '';
    return `<div class="opts"><span id="t-sound">${T('opt.sound', { v: T(opts.sound ? 'opt.on' : 'opt.off') })}</span>`
      + `<span id="t-music">${T('opt.music', { v: T(opts.music ? 'opt.on' : 'opt.off') })}</span>`
      + `<span id="t-lang">${T('opt.lang')}: ${esc(lang)}</span></div>`;
  }
  function showTitle() {
    $('#story').hidden = true; $('#sms').hidden = true; clearStoryHl(); clearGate(); storyBusy = false;
    const save = loadSave(), P = Profile.get();
    // 캠페인을 아직 다 못 했으면 타이틀도 최소한만 보여 준다 — 시작 · 소리 · 언어 (levels.js)
    if ((P.campaign.cleared || 0) < LEVELS.IMPLEMENTED) return showTitleCampaign(save, P.campaign);
    const nUnlocked = P.unlocked.companies.length + P.unlocked.perks.length + P.unlocked.scenarios.length;
    const nTotal = Object.keys(M.COMPANIES).length + Object.keys(M.PERKS).length + Object.keys(M.SCENARIOS).length;
    const body = `<div class="title"><h1>${T('title.name')}</h1><div class="sub">${T('title.sub')}</div>
      ${save ? `<button class="btn cta" id="t-continue">${T('title.continue')} <small style="color:var(--dim)">(${esc(save.story ? T('title.story') : M.SCENARIOS[save.cfg.scenario] ? M.SCENARIOS[save.cfg.scenario].name : save.cfg.scenario)} · ${T('fmt.monthTurn', { m: cycleName(save.month), t: save.turn , max: (game && game.turns ? game.turns() : D.TURNS_PER_MONTH) })})</small></button>` : ''}
      <button class="btn ${P.story && P.story.seen ? '' : 'gold'}" id="t-story">${T('title.story')} <small style="color:var(--dim)">${demoLocked() ? T('demo.storySub', { n: demoMonthsLabel() }) : T('title.storySub')}</small></button>
      ${demoLocked() ? `<button class="btn gold" id="t-demo">${T('demo.cta')}</button>` : ''}
      <button class="btn ${P.story && P.story.seen && !demoLocked() ? 'gold' : ''}" id="t-new">${demoLocked() ? '🔒 ' : ''}${T('title.new')}${demoLocked() ? ` <small style="color:var(--dim)">${T('demo.fullOnly')}</small>` : P.story && P.story.seen ? '' : ` <small style="color:var(--dim)">${T('title.newHint')}</small>`}</button>
      <button class="btn" id="t-codex">${T('title.codex')} <small style="color:var(--dim)">${T('title.codexSub', { a: nUnlocked, b: nTotal, c: Object.keys(P.achievements).length, d: Object.keys(M.ACHIEVEMENTS).length })}</small></button>
      <button class="btn" id="t-rec">${T('title.records')} <small style="color:var(--dim)">${T('title.recordsSub', { best: P.stats.bestScore, w: P.stats.clears, l: P.stats.runs - P.stats.clears })}</small></button>
      <button class="btn" id="t-help">${T('title.help')}</button>
      ${optRow()}
      <div class="studio">${T('title.studio')} · v0.3</div></div>`;
    const m = modal('', body, null);
    m.classList.add('titlecard'); $('#modal-root').classList.add('title-mode');
    if (save) m.querySelector('#t-continue').onclick = () => { SFX.resume(); SFX.select(); game = Game.fromJSON(save); closeModal(); startPlay(); };
    m.querySelector('#t-new').onclick = () => { SFX.resume(); SFX.select(); if (save) { askConfirm(T('title.confirmNew'), () => { Store.remove(SAVE_KEY); showTitle(); $('#t-new').click(); }, T('title.newShort')); return; } if (!(P.story && P.story.seen)) { suggestStory(); return; } showScenarioSelect(); };
    m.querySelector('#t-story').onclick = () => { SFX.resume(); SFX.select(); if (save) { askConfirm(T('title.confirmNew'), () => { Store.remove(SAVE_KEY); showTitle(); $('#t-story').click(); }, T('title.newShort')); return; } showStoryStart(); };
    const dm = m.querySelector('#t-demo'); if (dm) dm.onclick = () => { SFX.click(); showDemoGate(showTitle); };
    m.querySelector('#t-codex').onclick = () => { SFX.click(); showCodex('companies', showTitle); };
    m.querySelector('#t-help').onclick = () => { SFX.click(); showHelp(showTitle); };
    m.querySelector('#t-rec').onclick = () => { SFX.click(); showRecords(showTitle); };
    m.querySelector('#t-sound').onclick = () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); saveOpts(); SFX.resume(); SFX.click(); showTitle(); };
    m.querySelector('#t-music').onclick = () => { opts.music = !opts.music; BGM.setEnabled(opts.music); saveOpts(); SFX.resume(); BGM.resume(); SFX.click(); showTitle(); };
    m.querySelector('#t-lang').onclick = () => { const ids = I18n.languages().map(l => l.id); I18n.setLang(ids[(ids.indexOf(I18n.lang) + 1) % ids.length]); SFX.click(); applyStaticText(); showTitle(); };
    BGM.play('title');
  }

  // ---------- 캠페인 (레벨) ----------
  // 첫 화면에 있는 것이 적을수록 좋다. 캠페인 중에는 시작 · 소리 · 언어뿐 — 자유 런·도감·기록은 캠페인을 끝내면 열린다.
  // sel: 장 고르기에서 **고른** 장. 아무것도 안 고르면 이어하기, 장을 고르면 그 장을 새로 시작한다.
  // 확인창은 띄우지 않는다 — 타이틀이 사라지고 게임 판 위에 작은 창이 뜨는 꼴이 되어 여기가 어디인지 흐려진다.
  // 대신 버튼 글씨가 「이어하기」에서 「새로 하기」로 바뀐다. 무엇을 누르는지는 버튼이 말한다.
  function showTitleCampaign(save, camp, sel) {
    const cur = Math.min(camp.level || 1, LEVELS.IMPLEMENTED);
    // 지나온 장은 언제든 다시 할 수 있다 — 한 장을 넘기고 나면 앞 장으로 돌아갈 길이 없으면 안 된다.
    // 고를 수 있는 것은 깬 장 + 지금 장까지. 한 장뿐이면 아예 안 그린다.
    const open = Math.min(Math.max(camp.cleared || 0, 0) + 1, LEVELS.IMPLEMENTED);
    const pick = sel ? Math.min(Math.max(sel, 1), open) : 0;   // 0 = 고른 것 없음
    const n = pick || cur;
    const cont = !!save && !pick;                              // 이어하기는 아무것도 안 골랐을 때
    const again = k => showTitleCampaign(loadSave(), Profile.get().campaign, k);
    // 칩만 놓으면 '지금 몇 장인지' 알려 주는 표시로 읽힌다 — 누를 수 있는 것임을 한 줄로 말해 준다
    // 장이 하나뿐이어도 진행 중인 런이 있으면 칩을 보여 준다 — 그래야 「다시 하기」 길이 생긴다
    const picker = (open <= 1 && !save) ? '' : `<div class="chlbl">${T('lv.pick')}</div><div class="chpick">${Array.from({ length: open }, (_, i) => i + 1)
      .map(k => `<span class="chip${k === pick ? ' on' : ''}" data-ch="${k}">${T('lv.ch.' + k)}</span>`).join('')}</div>`;
    // 메인 메뉴는 버튼 하나다. 소리·음악·언어는 아래 텍스트 한 줄 (아이콘으로 바꾸지 않는다)
    const body = `<div class="title"><h1>${T('title.name')}</h1><div class="sub">${T('title.sub')}</div>
      ${cont ? `<button class="btn cta" id="t-continue">${T('lv.continue')}</button>`
             : `<button class="btn cta" id="t-level">${T(save ? 'lv.new' : 'lv.start')}</button>`}
      <div class="ch">${T('lv.ch.' + n)}</div>
      ${picker}
      ${optRow()}
      <div class="studio">${T('title.studio')} · v0.3</div></div>`;
    const m = modal('', body, null);
    m.classList.add('titlecard'); $('#modal-root').classList.add('title-mode');
    if (cont) m.querySelector('#t-continue').onclick = () => { SFX.resume(); SFX.select(); game = Game.fromJSON(save); closeModal(); startPlay(); };
    // 고른 장을 그 장의 시작 판(carryAt)으로 처음부터 한다. 진행 중인 런은 여기서 사라진다
    else m.querySelector('#t-level').onclick = () => { SFX.resume(); SFX.select();
      const P = Profile.get(); P.campaign = Object.assign({}, P.campaign, { level: n }); Profile.save(); Store.remove(SAVE_KEY); startLevel(n); };
    // 칩은 고르기만 한다. 고른 칩을 다시 누르면 고르기를 푼다 (= 이어하기로 돌아온다)
    m.querySelectorAll('.chpick .chip').forEach(el => el.onclick = () => { const k = +el.dataset.ch; SFX.resume(); SFX.click(); again(k === pick ? 0 : k); });
    m.querySelector('#t-sound').onclick = () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); saveOpts(); SFX.resume(); SFX.click(); again(pick); };
    m.querySelector('#t-music').onclick = () => { opts.music = !opts.music; BGM.setEnabled(opts.music); saveOpts(); SFX.resume(); BGM.resume(); SFX.click(); again(pick); };
    m.querySelector('#t-lang').onclick = () => { const ids = I18n.languages().map(l => l.id); I18n.setLang(ids[(ids.indexOf(I18n.lang) + 1) % ids.length]); SFX.click(); applyStaticText(); again(pick); };
    BGM.play('title');
  }
  // 레벨 런: 난이도·회사·퍽을 묻지 않는다. 소개는 박 반장이 게임 안에서 한다
  function startLevel(n) {
    const P = Profile.get();
    // 마켓은 장 **끝**에 온다 (정산 직후). 배차를 다 쓴 그 자리에서 충전을 배우고, 예보로 다음 장을 준비한다.
    game = new Game({ scenario: 'quarter', company: 'local', perks: [], insurer: 'none', difficulty: 'rookie', story: true, level: n, prep: false,
      companyName: P.campaign.name || T('lv.ownerShop'), carry: n > 1 ? ((P.campaign.carryAt && P.campaign.carryAt[n]) || P.campaign.carry || null) : null });
    // 서장을 시작할 때마다 오프닝 씬을 튼다 (이어하기는 아니다 — 그건 startPlay 를 바로 부른다)
    closeModal(); startPlay({ intro: n === 1 });
  }
  // 장이 끝나면 한 사장님 편지 한 장이다 (→ 1장 끝이면 상호 · 가계약서, 그 뒤로는 잔금 회차).
  // 숫자 리포트도, 장 카드도 두지 않는다 — 한 장이 보름이라 격식을 붙일 자리가 아니다.
  function showLevelDone(r) {
    if (!r.recorded) { r.recorded = true; Store.remove(SAVE_KEY); BGM.stop(0.5); SFX.win(); BGM.oneShot('fanfare'); }
    // 값을 부르는 장(1장)에서는 편지가 아니라 한 사장이 직접 온다 — 종이보다 사람이 먼저다
    if (r.level === 2) return showHanVisit(r, verdictOf(r));
    showLetter(r, verdictOf(r));
  }

  // 한 사장의 방문 — 창고를 넘기겠다는 말을 그가 직접 한다.
  // 편지 한 장 뒤에 곧바로 계약서를 내밀면 "설명 없이 종이만 내민" 꼴이 된다.
  // 여기서 값과 조건(보름마다 분납)을 말로 먼저 듣고, 그다음에 간판을 정하고, 계약서는 그 확인이 된다.
  function showHanVisit(r, verdict) {
    const price = LEVELS.DEAL.price;
    const pages = [
      { k: verdict === 'bad' ? 'visit.1bad' : 'visit.1good', expr: verdict === 'bad' ? 'neutral' : 'smile' },
      { k: 'visit.2', expr: 'neutral' },
      { k: 'visit.3', expr: 'neutral', p: { price } },
      { k: 'visit.4', expr: 'smile' },
    ];
    let i = 0;
    const draw = () => {
      const pg = pages[i], last = i === pages.length - 1;
      const body = `<div class="visit">${faceImg('han', pg.expr, 64)}<p>${T(pg.k, pg.p || {})}</p></div>`;
      const m = modal(T('visit.title'), body, [{ label: T(last ? 'visit.go' : 'visit.next'), cls: 'primary', onClick: () => {
        SFX.click();
        if (last) return afterChapter(r);
        i++; draw();
      } }]);
      return m;
    };
    draw();
  }
  const faceImg = (who, expr, size) => `<img src="${who === 'park' ? Story.sprite('park', expr) : Story.sprite(who, expr)}" width="${size || 56}" height="${size || 56}" alt="" style="image-rendering:pixelated;flex:0 0 auto">`;
  // 한 장을 어떻게 끝냈는가 — 편지 문장을 고르는 데만 쓴다
  function verdictOf(r) {
    const done = r.deliveredCount || r.delivered || 0;
    const rate = done ? Math.round((r.onTimeCount || 0) / done * 100) : 100;
    const bad = (r.returned || 0) + (r.discarded || 0);
    if (!done) return 'bad';                         // 한 대도 안 불렀으면 칭찬할 것이 없다
    return bad === 0 && rate >= 95 ? 'good' : rate >= 80 ? 'ok' : 'bad';
  }

  // 한 사장님(영감님)의 손편지. 장이 올라갈수록 문장이 달라진다
  function showLetter(r, verdict) {
    const P = Profile.get();
    const who = P.campaign.name ? T('letter.toName', { name: P.campaign.name }) : T('letter.toYou');
    const k = 'letter.' + Math.min(r.level, LEVELS.LAST) + '.' + (verdict === 'bad' ? 'bad' : 'good');
    const text = T(k) === k ? T('letter.generic.' + (verdict === 'bad' ? 'bad' : 'good')) : T(k);
    const body = `<div class="letter"><p class="to">${esc(who)}</p><p>${text}</p>
      <p class="sign">${faceImg('han', verdict === 'bad' ? 'neutral' : 'smile', 40)}<span>${esc(T('letter.sign'))}</span></p></div>`;
    modal(T('letter.title'), body, [{ label: T('letter.close'), cls: 'primary', onClick: () => afterChapter(r) }]);
  }

  function afterChapter(r) {
    const next = r.level + 1, hasNext = next <= LEVELS.IMPLEMENTED;
    // 다음 장으로 넘긴다. adjust 가 있으면 넘길 판을 한 번 손본다 (가계약금이 빠지는 자리)
    const advance = adjust => {
      const P = Profile.get();
      const carry = r.carry ? { ...r.carry } : { cash: r.cash };
      if (adjust) adjust(carry);
      // carryAt[N] = N장을 시작할 때의 판. 장을 되돌아가 다시 하려면 그 장의 시작 판이 남아 있어야 한다
      const carryAt = Object.assign({}, P.campaign.carryAt, { [next]: carry });
      P.campaign = Object.assign({}, P.campaign, { cleared: Math.max(P.campaign.cleared || 0, r.level), level: next, carry, carryAt });
      Profile.save(); game = null;
      if (hasNext) return startLevel(next);            // 타이틀로 돌아가지 않는다 — 장은 이어진다
      closeModal(); showTitle();                       // 아직 다음 장이 없다 (임시 다리)
    };
    // 서장 끝은 편지 한 장으로 끝난다 — 보름 대타에 서류를 쓸 자리가 없다.
    // 1장 끝(한 달)에서 한 사장이 값을 부르고, 그 자리에서 간판을 갈아 달고 가계약서에 도장을 찍는다.
    if (r.level === 1) return advance();
    if (r.level === 2) return askCompanyName(r, advance);
    showInstalment(r, advance);                        // 2장부터는 장마다 잔금을 한 회차씩 갚는다
  }

  // ---------- 잔금 회차 ----------
  // 장이 끝날 때마다 한 회차를 낸다. 한 번에 다 갚는 구조면 중간 장에서는 돈을 쌓기만 하면 돼서
  // 계산할 것이 없다 — 회차가 있어야 "이번 장에 얼마를 남겨야 하나"가 매 장의 질문이 된다.
  // 이번 장이 끝날 때 낼 잔금 회차 (가계약 전·자유 런이면 0)
  function instalmentDue(g) {
    if (!g || !g.level || !window.LEVELS) return 0;
    const deal = (Profile.get().campaign || {}).deal; if (!deal || !(deal.rest > 0)) return 0;
    return LEVELS.dueAt(g.cfg.level, deal.rest) || 0;
  }
  function showInstalment(r, done) {
    const P = Profile.get(), deal = P.campaign.deal;
    if (!deal) return done();                          // 가계약을 안 거친 판(장 건너뛰기 등)은 그냥 넘어간다
    const rest = Math.max(0, deal.rest);
    if (rest <= 0) return done();
    const due = LEVELS.dueAt(r.level, rest);
    const cash = r.cash || 0;
    const pay = Math.min(due, cash);                   // 모자라면 낼 수 있는 만큼만 — 나머지는 다음 회차로 밀린다
    const short = due - pay, after = rest - pay;
    const final = r.level >= LEVELS.LAST;
    const row = (k, v, cls) => `<div class="ct-row"><span>${esc(k)}</span><b${cls ? ` class="${cls}"` : ''}>${v}</b></div>`;
    const pct = Math.round(((deal.price - after) / deal.price) * 100);
    const body = `<div class="paper"><h3>${esc(T(final ? 'inst.titleFinal' : 'inst.title'))}</h3>
      ${row(T('ct.price'), deal.price + 'c')}
      ${row(T('inst.paidSoFar'), (deal.paid || 0) + 'c')}
      ${row(T(final ? 'inst.dueFinal' : 'inst.due'), due + 'c')}
      ${row(T('inst.pay'), pay + 'c', short ? 'bad' : '')}
      ${row(T('inst.rest'), after + 'c')}
      <div class="instbar"><i style="width:${pct}%"></i><span>${pct}%</span></div>
      <p class="ct-body">${short ? T('inst.short', { n: short }) : final && after <= 0 ? T('inst.cleared') : T('inst.ok', { left: cash - pay })}</p></div>`;
    const m = modal(T('inst.modal'), body, [{ label: T(final && after <= 0 ? 'inst.btnFinal' : 'inst.btn'), cls: 'primary', onClick: () => {
      const P2 = Profile.get();
      P2.campaign = Object.assign({}, P2.campaign, { deal: { price: deal.price, paid: (deal.paid || 0) + pay, rest: after, late: short } });
      Profile.save(); SFX.thud();
      closeModal();
      if (final && after <= 0) return showFinalContract(r, done);
      done(cy => { cy.cash = Math.max(0, cash - pay); });
    } }]);
    return m;
  }

  // 잔금을 다 치른 날 — 가계약서가 본계약서가 된다
  function showFinalContract(r, done) {
    const P = Profile.get(), name = P.campaign.name || T('lv.nameDefault');
    const body = `<div class="paper"><h3>${esc(T('ct.titleFinal'))}</h3>
      <div class="ct-row"><span>${esc(T('ct.seller'))}</span><b>${esc(T('ct.sellerName'))}</b></div>
      <div class="ct-row"><span>${esc(T('ct.buyer'))}</span><b>${esc(name)}</b></div>
      <div class="ct-row"><span>${esc(T('ct.item'))}</span><b>${esc(T('ct.itemName'))}</b></div>
      <p class="ct-body">${T('ct.bodyFinal')}</p>
      <div class="stamp" id="ct-stamp">${esc(T('ct.stampMark'))}</div></div>`;
    const m = modal(T('ct.modal'), body, [{ label: T('ct.stamp'), cls: 'primary', onClick: () => {
      const st = m.querySelector('#ct-stamp');
      if (st && !st.classList.contains('on')) {
        st.classList.add('on'); SFX.thud(); BGM.oneShot('fanfare');
        const foot = m.querySelector('.foot .btn'); if (foot) foot.textContent = T('ct.doneFinal');
        m.querySelector('.foot .btn').onclick = () => { SFX.click(); done(cy => { cy.cash = Math.max(0, (r.cash || 0)); }); };
      }
    } }]);
  }

  // 상호를 짓는다 — 여기서 처음으로 '내 가게'가 된다
  function askCompanyName(r, done) {
    const P = Profile.get();
    const body = `<p>${faceImg('han', 'smile', 64)}</p><p>${T('lv.nameBody')}</p>
      <input id="lv-name" maxlength="14" placeholder="${esc(T('lv.namePlaceholder'))}" value="${esc(P.campaign.name || '')}"
        style="width:100%;box-sizing:border-box;padding:10px;font:inherit;font-size:16px;background:#1b1a2e;color:var(--ink);border:3px solid var(--line);outline:none">`;
    const m = modal(T('lv.nameAsk'), body, [{ label: T('lv.nameSave'), cls: 'primary', onClick: () => {
      const v = ((m.querySelector('#lv-name') || {}).value || '').trim().slice(0, 14) || T('lv.nameDefault');
      const P2 = Profile.get();
      P2.campaign = Object.assign({}, P2.campaign, { name: v });
      Profile.save();
      showContract(r, v, done);
    } }]);
    setTimeout(() => { const el = m.querySelector('#lv-name'); if (el) el.focus(); }, 60);
  }

  // 가계약서에 도장 — 값을 부르고, 번 돈에서 계약금을 걸고, 잔금은 남은 열 달 동안 채운다.
  // 무상 양도가 아니다: 여기서 목표 금액이 생겨야 다음 장부터 '이번 달 얼마 남겨야 하나'가 계산이 된다.
  function showContract(r, name, done) {
    const D2 = LEVELS.DEAL, price = D2.price;
    const down = Math.max(0, Math.min(price, Math.floor((r.cash || 0) * D2.downRate)));
    const rest = price - down, left = Math.max(0, (r.cash || 0) - down);
    const body = `<div class="paper"><h3>${esc(T('ct.title'))}</h3>
      <div class="ct-row"><span>${esc(T('ct.seller'))}</span><b>${esc(T('ct.sellerName'))}</b></div>
      <div class="ct-row"><span>${esc(T('ct.buyer'))}</span><b>${esc(name)}</b></div>
      <div class="ct-row"><span>${esc(T('ct.item'))}</span><b>${esc(T('ct.itemName'))}</b></div>
      <div class="ct-row"><span>${esc(T('ct.price'))}</span><b>${price}c</b></div>
      <div class="ct-row"><span>${esc(T('ct.down'))}</span><b>${down}c</b></div>
      <div class="ct-row"><span>${esc(T('ct.rest'))}</span><b>${rest}c</b></div>
      <p class="ct-body">${T('ct.body', { price, down, rest })}</p>
      <div class="stamp" id="ct-stamp">${esc(T('ct.stampMark'))}</div></div>`;
    const m = modal(T('ct.modal'), body, [{ label: T('ct.stamp'), cls: 'primary', onClick: () => {
      const st = m.querySelector('#ct-stamp');
      if (st && !st.classList.contains('on')) {
        st.classList.add('on'); SFX.thud(); BGM.oneShot('fanfare');
        const P = Profile.get();
        P.campaign = Object.assign({}, P.campaign, { deal: { price, paid: down, rest } });
        Profile.save();
        const foot = m.querySelector('.foot .btn'); if (foot) foot.textContent = T('ct.done');
        const note = document.createElement('p');
        note.className = 'd'; note.style.cssText = 'margin-top:10px;font-size:13px;color:var(--gold);text-align:center';
        note.innerHTML = T('ct.after', { rest, left });
        const pap = m.querySelector('.paper'); if (pap && pap.parentNode) pap.parentNode.appendChild(note);
        // 계약금은 실제로 나간다 — 다음 장은 남은 돈으로 시작한다
        m.querySelector('.foot .btn').onclick = () => { SFX.click(); if (done) return done(cy => { cy.cash = left; }); closeModal(); showTitle(); };
      }
    } }]);
  }

  // ---------- "이건 이런 게임이다" 3장 카드 (첫 실행 · 게임 방법에서 다시 보기) ----------
  // 규칙을 가르치는 화면이 아니다. 20초 안에 목표 하나·핵심 긴장 하나·한 판의 길이만 남긴다.
  function howArt(n) {
    if (n === 1) return `<div class="bx" style="left:5px;bottom:3px;width:18px;height:13px"></div>
      <div class="bx f" style="left:25px;bottom:3px;width:18px;height:13px"></div>
      <div class="bx o" style="left:45px;bottom:3px;width:18px;height:13px"></div>
      <div class="bx f" style="left:5px;bottom:16px;width:18px;height:13px"></div>
      <div class="bx" style="left:25px;bottom:16px;width:18px;height:13px"></div>
      <div class="bx" style="left:15px;bottom:29px;width:18px;height:13px"></div>
      <div class="bx o" style="left:35px;bottom:29px;width:18px;height:13px"></div>
      <div class="line" style="bottom:44px"><b>MAX</b></div>`;
    if (n === 2) return `<div class="tg2" style="top:6px"><i style="width:28%;background:var(--red)"></i><u style="color:var(--red)">16c</u></div>
      <div class="tg2" style="top:34px"><i style="width:100%;background:var(--green)"></i><u style="color:var(--line)">4c</u></div>`;
    if (n === 3) return `<div class="cal">${Array.from({ length: 12 }, (_, i) => `<s class="${i === 11 ? 'last' : i < 3 ? 'on' : ''}"></s>`).join('')}</div>`;
    return `<div class="grade-art"><b>D</b><b>C</b><b>B</b><b>A</b><i></i></div>`;
  }
  function showHowTo(next, back) {
    const cards = [1, 2, 3, 4].map(n => `<div class="hc"><div class="art">${howArt(n)}</div><div class="tx"><h3>${T('how.' + n + '.t')}</h3><p>${T('how.' + n + '.d')}</p></div></div>`).join('');
    const body = `<div class="how">${cards}<div class="foot-note">${T('how.note')}</div></div>`;
    const btns = back ? [{ label: T('btn.close'), onClick: back }] : [{ label: T('how.go'), cls: 'primary', onClick: next }];
    modal(T('how.title'), body, btns);
  }
  // 첫 실행에만 자동으로 끼어든다 (프로필 기준). 이후로는 게임 방법에서.
  function withHowTo(start) {
    const P = Profile.get();
    if (P.howSeen) { start(); return; }
    showHowTo(() => { const P2 = Profile.get(); P2.howSeen = true; Profile.save(); start(); });
  }

  // ---------- 인수인계 (스토리 모드): 표준 한 해 · 동네 택배 · 퍽 없음 · 난이도만 고른다 ----------
  // 인수인계를 한 번도 안 해 본 프로필이 '새 런'을 누르면: 막지는 않되 인수인계를 먼저 권한다
  function suggestStory() {
    const face = `<img src="${Story.SPRITES.smile}" width="64" height="64" style="image-rendering:pixelated;float:left;margin:0 10px 6px 0">`;
    modal(T('title.tutorAsk'), `<p>${face}${T('title.tutorBody')}</p><div style="clear:both"></div>`,
      [{ label: T('title.tutorSkip'), onClick: () => showScenarioSelect() }, { label: T('title.tutorGo'), cls: 'primary', onClick: () => showStoryStart() }]);
  }
  let storyDiff = 'rookie';
  function showStoryStart() {
    const diffRow = `<div class="diffrow">${['rookie', 'normal'].map(id => { const d = M.DIFFICULTIES[id]; return `<button class="btn small ${storyDiff === id ? 'on' : ''}" data-diff="${id}" title="${esc(d.desc)}">${d.icon} ${d.name}</button>`; }).join('')}</div><div class="d" style="font-size:11px;color:var(--dim);margin-bottom:6px">${esc(M.DIFFICULTIES[storyDiff].desc)}</div>`;
    const face = `<img src="${Story.SPRITES.smile}" style="width:64px;height:64px;image-rendering:pixelated;float:left;margin:0 10px 6px 0;border:3px solid var(--line);background:#3a3555">`;
    const m = modal(T('story.startTitle'), `<p>${face}${T('story.startBody')}</p><div style="clear:both"></div><div class="perk-count">${T('story.diffAsk')}</div>${diffRow}`, [{ label: T('btn.back'), onClick: showTitle }, { label: T('story.start'), cls: 'primary', onClick: () => withHowTo(() => { game = new Game({ scenario: 'quarter', company: 'local', perks: [], insurer: 'none', difficulty: storyDiff, story: true, scripted: true, prep: false, demoMonths: demoLocked() ? demoMonths() : 0 }); closeModal(); startPlay(); }) }]);
    m.querySelectorAll('[data-diff]').forEach(el => el.onclick = () => { SFX.select(); storyDiff = el.dataset.diff; showStoryStart(); });
  }

  // ---------- 런 준비: 시나리오 → 회사 → 퍽 ----------
  function unlockText(achId) { const a = M.ACHIEVEMENTS[achId]; if (!a) return '🔒'; let pr = ''; try { if (a.prog) { const P = Profile.get(); const [h, n] = a.prog(P.stats, P); pr = ` (${Math.min(h, n)}/${n})`; } } catch (e) { } return `🔒 ${a.name}: ${a.desc}${pr}`; }
  const TIER_NAMES = () => [T('tier.0'), T('tier.1'), T('tier.2'), T('tier.3')];
  const prep = { scenario: 'standard', company: 'local', perks: [], insurer: 'sturdy', difficulty: 'normal' };
  function showScenarioSelect() {
    const P = Profile.get(), lock = demoLocked();
    const daily = window.dailyConfig(today());
    const cards = Object.keys(M.SCENARIOS).map(id => {
      const s = M.SCENARIOS[id], un = !lock && P.unlocked.scenarios.includes(id);
      let extra = '';
      if (id === 'daily') extra = `<div class="d">${T('prep.today')}: ${T('fmt.calOnly', { cal: daily.startMonth })} · ${esc(M.COMPANIES[daily.company].name)} · ${daily.variants.map(v => esc(M.DAILY_VARIANTS[v].name)).join(' + ')}${Profile.dailyDoneToday(daily.date) ? ` · <b>${T('prep.dailyDone')}</b>` : ''}</div>`;
      const rec = P.records[id]; const best = rec ? Math.max(0, ...Object.values(rec).map(r => r.bestScore)) : 0;
      // 어느 해, 어느 나라 달력으로 도는지 — 해마다 요일과 영업일 수가 달라진다
      const calId = (s.mods && s.mods.calendar) || 'kr', yr = (s.mods && s.mods.year) || new Date().getFullYear();
      const when = `<div class="d" style="color:var(--dim);font-size:11px">${T('prep.calendar', { year: yr, place: esc((M.CALENDARS[calId] && M.CALENDARS[calId].name) || T('cal.' + calId + '.name')) })}</div>`;
      return `<div class="card ${un ? '' : 'dis'} ${prep.scenario === id ? 'sel' : ''}" data-id="${id}"><div class="t"><span>${s.icon} ${esc(s.name)} <small style="color:var(--dim)">${s.months >= 99 ? '∞' : T('fmt.months', { n: s.months })}</small></span><span class="price">${best ? T('fmt.pts', { n: best }) : ''}</span></div>
        ${when}<div class="d">${esc(s.desc)}<br>${T('prep.win')}: ${esc(s.win)} · ${T('prep.recommend')}: ${esc(s.recommend)}</div>${un ? extra : `<div class="d">${lock ? `🔒 ${T('demo.fullOnly')}` : esc(unlockText(s.unlock))}</div>`}</div>`;
    }).join('');
    const diffUn = id => !M.DIFFICULTIES[id].unlock || P.achievements[M.DIFFICULTIES[id].unlock];
    if (!diffUn(prep.difficulty)) prep.difficulty = 'normal';
    const diffRow = `<div class="diffrow">${Object.keys(M.DIFFICULTIES).map(id => { const d = M.DIFFICULTIES[id], un = diffUn(id); return `<button class="btn small ${prep.difficulty === id ? 'on' : ''} ${un ? '' : 'dis'}" data-diff="${id}" title="${esc(d.desc)}">${d.icon} ${d.name}</button>`; }).join('')}</div><div class="d" style="font-size:11px;color:var(--dim);margin-bottom:6px">${esc(M.DIFFICULTIES[prep.difficulty].desc)}${prep.scenario === 'daily' ? ` · ${T('prep.dailyNormal')}` : ''}</div>`;
    const m = modal(T('prep.scenarioTitle'), `<div class="perk-count">${T('prep.step1')}</div>${diffRow}${cards}`, [{ label: T('btn.title'), onClick: showTitle }, { label: lock ? T('demo.cta') : T('prep.nextCompany'), cls: lock ? 'gold' : 'primary', onClick: () => { if (lock) return showDemoGate(showScenarioSelect); if (prep.scenario === 'daily') { prep.company = daily.company; showPerkSelect(daily); } else showCompanySelect(); } }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.id; if (lock) { SFX.click(); showDemoGate(showScenarioSelect); return; } if (!P.unlocked.scenarios.includes(id)) { toast(unlockText(M.SCENARIOS[id].unlock), 2500); return; } SFX.select(); prep.scenario = id; showScenarioSelect(); });
    m.querySelectorAll('[data-diff]').forEach(el => el.onclick = () => { const id = el.dataset.diff; if (!diffUn(id)) { toast(unlockText(M.DIFFICULTIES[id].unlock), 2500); return; } SFX.select(); prep.difficulty = id; showScenarioSelect(); });
  }
  // 회사 시작 계약은 계열 이름(bulk…)으로 적혀 있다 → Game.resolveCenter 와 같은 규칙으로 센터 id 를 찾는다
  const GRADE_TIER = g => Math.max(0, ['normal', 'trusted', 'expert', 'master'].indexOf(g || 'normal'));
  function startCenter(c) { return D.CARRIERS[c.carrier] ? c.carrier : (D.centerFor(c.carrier, GRADE_TIER(c.grade)) || null); }
  function companyInfo(co, id) {
    const wh = co.warehouse ? T('prep.warehouse', { cap: co.warehouse.cap, cold: co.warehouse.cold, xl: co.warehouse.xl }) : T('prep.warehouseRandom');
    const ct = co.contracts ? co.contracts.map(c => { const k = startCenter(c); const car = k && D.CARRIERS[k]; if (!car) return String(c.carrier); return `${car.short || car.name || k}${c.grade === 'trusted' ? '★' : ''} ${T('fmt.trucks', { n: c.calls != null ? c.calls : car.trucks + ((D.GRADES[c.grade || 'normal'] || {}).calls || 0) })}`; }).join(', ') : T('prep.contractsRandom');
    return `<div class="d">${wh} · ${T('hud.cash')} ${co.cash}<br>${T('prep.contracts')}: ${esc(ct)}</div><div class="d" style="color:var(--green)">＋ ${esc(co.passive)}</div><div class="d" style="color:var(--orange)">－ ${esc(co.weakness)}</div>`;
  }
  function showCompanySelect() {
    const P = Profile.get(), lock = demoLocked();
    if (!P.unlocked.companies.includes(prep.company)) prep.company = 'local';
    const cards = Object.keys(M.COMPANIES).sort((x, y) => (M.COMPANIES[x].tier || 0) - (M.COMPANIES[y].tier || 0)).map(id => {
      const co = M.COMPANIES[id], un = !lock && P.unlocked.companies.includes(id);
      const rec = (P.records[prep.scenario] || {})[id];
      return `<div class="card ${un ? '' : 'dis'} ${prep.company === id ? 'sel' : ''}" data-id="${id}"><div class="t"><span>${co.icon} ${esc(co.name)} <small style="color:var(--dim)">${esc(co.tag)}</small></span><span class="price">${rec ? T('fmt.pts', { n: rec.bestScore }) : ''}</span></div>
        ${un ? companyInfo(co, id) : `<div class="d">${lock ? `🔒 ${T('demo.fullOnly')}` : esc(unlockText(co.unlock))}</div>`}</div>`;
    }).join('');
    const m = modal(T('prep.companyTitle'), `<div class="perk-count">${T('prep.step2')} — ${esc(M.SCENARIOS[prep.scenario].name)}</div>${cards}`, [{ label: T('btn.back'), onClick: showScenarioSelect }, { label: lock ? T('demo.cta') : T('prep.nextPerk'), cls: lock ? 'gold' : 'primary', onClick: () => lock ? showDemoGate(showCompanySelect) : showPerkSelect(null) }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.id; if (lock) { SFX.click(); showDemoGate(showCompanySelect); return; } if (!P.unlocked.companies.includes(id)) { toast(unlockText(M.COMPANIES[id].unlock), 2500); return; } SFX.select(); prep.company = id; showCompanySelect(); });
  }
  function perkConflict(pid) {
    const perk = M.PERKS[pid], co = M.COMPANIES[prep.company];
    if (perk.needsCold && co.warehouse && co.warehouse.cold === 0) return T('prep.noColdCompany');
    if (prep.perks.some(o => o !== pid && M.PERKS[o].family === perk.family)) return T('prep.sameFamily', { family: M.PERK_FAMILIES[perk.family] });
    return null;
  }
  function showPerkSelect(daily) {
    const P = Profile.get(), slots = Profile.perkSlots();
    prep.perks = prep.perks.filter(p => P.unlocked.perks.includes(p) && !perkConflict(p)).slice(0, slots);
    const co = M.COMPANIES[prep.company];
    const groups = Object.keys(M.PERK_FAMILIES).map(f => `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${T('prep.family', { family: M.PERK_FAMILIES[f] })}</div>` + Object.keys(M.PERKS).filter(id => M.PERKS[id].family === f).map(id => {
      const pk = M.PERKS[id], un = P.unlocked.perks.includes(id), sel = prep.perks.includes(id), conflict = un && !sel ? perkConflict(id) : null;
      return `<div class="card ${!un || conflict ? 'dis' : ''} ${sel ? 'sel' : ''}" data-id="${id}"><div class="t">${esc(pk.name)}</div><div class="d">${un ? esc(pk.desc) + (conflict ? ` <span style="color:var(--orange)">(${esc(conflict)})</span>` : '') : esc(unlockText(pk.unlock))}</div></div>`;
    }).join('')).join('');
    const head = `<div class="perk-count">${T('prep.step3')} — ${esc(M.SCENARIOS[prep.scenario].name)} · ${co.icon} ${esc(co.name)}${daily ? ` · ${T('prep.variants')}: ${daily.variants.map(v => esc(M.DAILY_VARIANTS[v].name + '(' + M.DAILY_VARIANTS[v].desc + ')')).join(', ')}` : ''}<br>${T('prep.perkCount', { n: prep.perks.length, slots })}</div>`;
    if (prep.story == null) prep.story = !(P.story && P.story.seen); // 첫 런은 안내가 기본으로 켜진다
    const storyCard = `<div style="font-size:12px;color:var(--gold);margin:10px 0 4px">${T('prep.story')}</div><div class="card toggle ${prep.story ? 'sel' : ''}" id="prep-story"><div class="t"><span>${prep.story ? '☑' : '☐'} ${T('prep.story')}</span></div><div class="d">${T('prep.storyDesc')}</div></div>`;
    const noIns = !!(co.mods && co.mods.noInsurance);
    const insCards = storyCard + `<div style="font-size:12px;color:var(--gold);margin:10px 0 4px">${T('prep.insuranceHead')}</div>` + (noIns ? `<div class="d" style="font-size:12px;color:var(--dim)">${T('prep.startupNoIns')}</div>` : Object.keys(M.INSURERS).map(id => { const I = M.INSURERS[id]; const fee = Math.max(0, Math.round((I.fee + ((co.mods && co.mods.premiumDelta || {})[id] || 0)) * ((co.mods && co.mods.premiumMult) || 1) * ((M.SCENARIOS[prep.scenario].mods || {}).premiumMult || 1))); return `<div class="card ins ${prep.insurer === id ? 'sel' : ''}" data-ins="${id}"><div class="t"><span>${I.icon} ${esc(I.name)}</span><span class="price">${fee ? T('fmt.perMonth', { n: fee }) : '0c'}</span></div><div class="d">${esc(I.desc)}${I.fans.length ? `<br><span style="color:var(--green)">${T('prep.fans', { list: I.fans.map(f => M.CUSTOMERS[f].icon + M.CUSTOMERS[f].name).join(' ') })}</span>` : ''}</div></div>`; }).join(''));
    const m = modal(T('prep.perkTitle'), head + groups + insCards, [{ label: T('btn.back'), onClick: daily ? showScenarioSelect : showCompanySelect }, { label: T('prep.start'), cls: 'primary', onClick: () => startRun(daily) }]);
    m.querySelectorAll('.card.ins').forEach(el => el.onclick = () => { SFX.select(); prep.insurer = el.dataset.ins; showPerkSelect(daily); });
    m.querySelector('#prep-story').onclick = () => { SFX.select(); prep.story = !prep.story; showPerkSelect(daily); };
    m.querySelectorAll('.card:not(.ins):not(.toggle)').forEach(el => el.onclick = () => {
      const id = el.dataset.id;
      if (!P.unlocked.perks.includes(id)) { toast(unlockText(M.PERKS[id].unlock), 2500); return; }
      if (prep.perks.includes(id)) { prep.perks = prep.perks.filter(p => p !== id); SFX.cancel(); }
      else { const c = perkConflict(id); if (c) { toast(c); return; } if (prep.perks.length >= slots) { toast(T('prep.slotFull', { n: slots })); return; } prep.perks.push(id); SFX.select(); }
      showPerkSelect(daily);
    });
  }
  function startRun(daily) {
    const cfg = { scenario: prep.scenario, company: prep.company, perks: prep.perks.slice(), variants: [], insurer: prep.insurer, difficulty: prep.difficulty, prep: true, story: !!prep.story, demoMonths: demoLocked() ? demoMonths() : 0 };
    if (daily) { cfg.seed = daily.seed; cfg.variants = daily.variants; cfg.date = daily.date; cfg.company = daily.company; cfg.startMonth = daily.startMonth; }
    withHowTo(() => { game = new Game(cfg); closeModal(); startPlay(); });
  }

  // ---------- play ----------
  function startPlay(o) {
    game.takeEvents();
    scene.sync(game, { animate: true });
    saveGame();
    renderAll();
    // 오프닝이 끝나기 전에는 대화창도 모달도 뜨지 않는다 — 카메라만 돈다
    const go = () => {
      checkPhase();
      if (game && game.phase === 'play') { storyCheck({ kind: game.month === 1 && game.turn === 1 ? 'start' : 'turn' }); showSms(); }
    };
    if (o && o.intro && window.Intro) Intro.play(scene, go); else go();
  }

  function updateMusic() {
    if (!game) { BGM.play('title'); return; }
    const g = game;
    if (g.phase === 'play') BGM.play(g.usage() > 0.9 || g.rep <= g.repCap() * 0.25 ? 'overflow' : 'warehouse', { fade: 1.2 });
    else if (g.phase === 'market') BGM.play('market');
  }
  let hudDueOpen = false;   // HUD 자금 분해 펼침 여부 (기본 접힘)
  function renderOps(g, forecast) {
    const ko = I18n.lang === 'ko';
    const risky = new Set(g.parcels.filter(p => p.overdue).map(p => p.id));
    g.parcels.filter(p => {
      const a = attrsOf(p);
      return (a.includes('cold') && !p.inCold) || (a.includes('frozen') && !p.inFrozen);
    }).forEach(p => risky.add(p.id));
    try { g.unhandled().filter(p => !(p.customs > 0)).forEach(p => risky.add(p.id)); } catch (e) { /* early tutorial */ }
    const overflow = forecast && forecast.used > forecast.cap ? forecast.used - forecast.cap : 0;
    const risk = risky.size + overflow;
    const usage = g.usage();
    const state = risk > 0 ? 'danger' : usage >= 0.75 ? 'watch' : 'good';
    const title = state === 'danger'
      ? (ko ? '즉시 배송 필요' : 'Dispatch now')
      : state === 'watch'
        ? (ko ? '곧 정리할 타이밍' : 'Plan the next call')
        : (ko ? '안정적으로 성장 중' : 'Growing steadily');
    const root = $('#ops-status');
    const rush = g.rushState();
    // '안정적으로 성장 중' 같은 판정은 보름 목표·연속 만차가 열린 뒤에야 뜻이 있다.
    // 서장에는 판정도 지표도 없다 — 패널째 안 나온다(그 안의 미터도 아직 닫혀 있다).
    const opsOn = g.shows('mission');
    root.hidden = !opsOn && !g.shows('chain') && !g.shows('rush');
    for (const sel of ['.ops-verdict', '.ops-metrics', '.ops-progress']) { const el = root.querySelector(sel); if (el) el.hidden = !opsOn; }
    root.className = state + (rush.ready ? ' rush-ready' : '') + (rush.critical ? ' rush-critical' : '');
    $('#ops-kicker').textContent = ko ? '현재 운영 판단' : 'OPERATION STATUS';
    $('#ops-title').textContent = title;
    $('#ops-delivered').textContent = g.monthStats ? g.monthStats.delivered : 0;
    $('#ops-delivered-label').textContent = ko ? '이번 달 배송' : 'delivered';
    $('#ops-risk').textContent = risk;
    $('#ops-risk-label').textContent = ko ? (risk ? '지금 위험' : '위험 없음') : (risk ? 'at risk' : 'no risk');
    const repVisible = g.shows('rep');
    $('#ops-next').textContent = repVisible ? (g.repToNext() || (ko ? '최고' : 'MAX')) : Math.max(0, g.turns() - g.turn);
    $('#ops-next-label').textContent = repVisible ? (ko ? '다음 등급까지' : 'to next tier') : (ko ? '남은 영업일' : 'days left');
    const turns = Math.max(1, g.turns());
    const total = Math.max(1, (g.rules.months || 1) * turns);
    const done = Math.min(total, Math.max(0, (g.month - 1) * turns + g.turn));
    const pct = Math.round(done / total * 100);
    $('#ops-progress-fill').style.width = pct + '%';
    $('#ops-progress-label').textContent = `${ko ? (g.level ? '챕터' : '운영') : (g.level ? 'Chapter' : 'Run')} ${pct}%`;
    const rm = $('#rush-meter');
    rm.hidden = !rush.unlocked;
    if (rush.unlocked) {
      $('#rush-fill').style.width = Math.round(rush.charge * 100) + '%';
      $('#rush-title').textContent = T('rush.title');
      $('#rush-label').textContent = rush.ready
        ? (ko ? `준비 완료 · 보상 ×${rush.mult}` : `READY · REWARD ×${rush.mult}`)
        : (ko ? `${Math.round(rush.ratio * 100)}% · 더 쌓아라` : `${Math.round(rush.ratio * 100)}% · STOCKPILE`);
    }
    const chain = g.chainState();
    const cm = $('#chain-meter');
    cm.hidden = !g.shows('chain') || chain.count < 1;
    if (chain.count > 0) {
      $('#chain-title').textContent = T('chain.title');
      $('#chain-fill').style.width = Math.min(100, chain.level / chain.max * 100) + '%';
      $('#chain-label').textContent = chain.count >= 2 ? T('chain.mult', { n: chain.count, mult: chain.mult.toFixed(2) }) : T('chain.armed');
      cm.className = 'chain-meter' + (chain.level >= chain.max ? ' max' : '');
    }
    const mm = $('#mission-meter');
    mm.hidden = !g.shows('mission');            // 서장에는 목표가 없다 — 미터도 없다
    if (mm.hidden) return;
    const mission = g.missionState();
    $('#mission-grade').textContent = mission.grade;
    $('#mission-copy').textContent = T('mission.amount', { now: mission.earned, target: mission.maxAt });
    $('#mission-fill').style.width = Math.round(mission.progress * 100) + '%';
    $('#mission-tick-c').style.left = Math.round(mission.ticks[0] * 100) + '%';
    $('#mission-tick-b').style.left = Math.round(mission.ticks[1] * 100) + '%';
    $('#mission-next').textContent = mission.nextGrade ? T('mission.next', { grade: mission.nextGrade, left: mission.left }) : T('mission.max');
    const hot = mission.nextGrade && mission.segProgress >= 0.8;
    $('#mission-meter').className = 'mission-meter grade-' + mission.grade.toLowerCase() + (hot ? ' hot' : '');
  }
  function renderAll() {
    if (!game) return;
    const g = game, R = g.rules;
    // 재고는 늘 펼쳐져 있다 — 상자 격자가 곧 창고이고, 차를 부르면 그대로 고르는 판이 된다
    const pk = ensurePick();
    $('#invest-btn').hidden = !(g.shows('invest') && g.campaignOpen());   // 2장 · 창고가 빈 날 이틀 뒤 박 반장이 연다
    $('#app').classList.toggle('calling', !!pk);
    updateMusic();
    $('#hud-month').innerHTML = `${g.seasonMods().icon || ''}${T('fmt.calMonth', { y: g.yearOf(), cal: g.calMonth(), n: g.month })}`;
    $('#hud-turn').textContent = T('hud.turn', { d: g.dateOf(g.turn), dow: g.dowName(g.turn) });
    // 자금은 월말 정산 후 예상 잔액으로 보여준다 (사이클 중엔 모든 지출이 어음 — 자금 때문에 막히는 일이 없다)
    const pj = g.projectedCash(); const hc = $('#hud-cash'); const inPlay = g.phase === 'play';
    // 가계약 뒤로는 장(보름)이 끝날 때마다 잔금 회차가 나간다 — 월말 예상에도 미리 뺀다
    const inst = instalmentDue(g); if (inst) pj.total -= inst;
    hc.textContent = inPlay ? pj.total : g.cash; hc.style.color = inPlay && pj.total < 0 ? 'var(--red)' : '';
    $('#hud-cash-lbl').textContent = inPlay ? T('hud.cashLbl') : T('hud.cash');
    const due = $('#hud-due'); if (due && !inPlay) { due.textContent = g.debt ? T('hud.debt', { n: pj.loan }) : ''; due.hidden = false; }
    else if (due) { const parts = [T('hud.cashNow', { n: g.cash })]; if (pj.pending) parts.push(T('hud.pending', { n: pj.pending })); if (pj.stock) parts.push(T('hud.stock', { n: pj.stock })); if (g.feesDue) parts.push(T('hud.feesDue', { n: g.feesDue })); parts.push(T('hud.opCostDue', { n: pj.opCost + pj.premium })); if (inst) parts.push(T('hud.instalment', { n: inst })); if (g.debt) parts.push(T('hud.debt', { n: pj.loan })); due.innerHTML = parts.join(' · ') + (pj.total < 0 && g.turn >= 5 ? ` · <span style="color:var(--orange)">${T('hud.loanWarn')}</span>` : ''); due.hidden = !hudDueOpen; }
    // 자금 분해(현금·재고·운영비·보험)는 매 턴 볼 필요가 없다 — 기본은 접고, 자금 칸을 누르면 펼친다.
    $('#hud-more').textContent = hudDueOpen ? '▴' : '▾';
    // 평판: 높을수록 좋다. 게이지가 비면 아무도 안 맡긴다 = 런 종료
    const rcap = g.repCap(), ratio = rcap ? g.rep / rcap : 1;
    $('#stress-num').textContent = `${g.rep}/${rcap}`;
    // 등급 이름은 1단계를 넘겼을 때만 (그 전엔 지표 이름만 보여 HUD 한 줄을 지킨다)
    $('#stress-label').textContent = g.repTier > 0 ? g.repTierName() : T('hud.rep');
    const gauge = $('#stress-gauge'); gauge.querySelector('i').style.width = Math.max(0, Math.min(100, ratio * 100)) + '%';
    gauge.className = 'gauge rep ' + (ratio <= 0.2 ? 'crisis' : ratio <= 0.45 ? 'danger' : ratio <= 0.7 ? 'warn' : '');
    // 이 등급이 시작된 지점에 눈금 — 20/35 의 20 이 '이미 반쯤 찬 것'이 아니라 '이 등급의 바닥'이라는 걸 보여 준다
    let notch = gauge.querySelector('u'); const fl = g.repFloor();
    if (fl > 0 && rcap > fl) { if (!notch) { notch = document.createElement('u'); gauge.appendChild(notch); } notch.style.left = (fl / rcap * 100) + '%'; notch.hidden = false; }
    else if (notch) notch.hidden = true;
    $('#hud-right').onclick = () => { SFX.click(); if (g.shows('rep')) showRepInfo(); };
    // 아직 안 연 것은 화면에도 없다 (levels.js) — 평판 게이지·회사 줄은 레벨이 열어 준다
    $('#hud-right').hidden = !g.shows('rep') && !g.shows('perks');
    $('#stress-wrap').hidden = !g.shows('rep');
    $('#hud-perks').innerHTML = !g.shows('perks') ? `<a class="hl" data-pop="company">${g.company.icon} ${esc(g.companyName ? g.companyName() : g.company.name)}</a>` : [`<a class="hl" data-pop="company">${g.difficulty && (g.cfg.difficulty || 'normal') !== 'normal' ? g.difficulty.icon + esc(g.difficulty.name) + ' · ' : ''}${g.company.icon} ${esc(g.company.name)}</a>`, ...g.perks.map(p => `<a class="hl" data-pop="perk" data-id="${p}">${esc(M.PERKS[p].name)}</a>`), `<a class="hl" data-pop="insurer">${g.insurer !== 'none' ? M.INSURERS[g.insurer].icon + esc(M.INSURERS[g.insurer].name) : esc(M.INSURERS.none.name)}</a>`].join(' · ') + (g.strikeCarrier ? ` · ✊${D.CARRIERS[g.strikeCarrier].short} ${T('hud.strike')}` : '');
    $('#hud-perks').querySelectorAll('[data-pop]').forEach(el => el.onclick = () => { SFX.click(); if (el.dataset.pop === 'company') showCompanyInfo(); else if (el.dataset.pop === 'insurer') showInsurance(closeModal); else { const pk = M.PERKS[el.dataset.id]; modal(pk.name, `<p>${esc(pk.desc)}</p><p style="color:var(--dim);font-size:12px">${esc(T('hud.familyPerk', { family: M.PERK_FAMILIES[pk.family] }))}</p>`, [{ label: T('btn.close'), onClick: closeModal }]); } });
    const used = g.usedVolume(), cap = g.warehouse.cap, pct = used / cap * 100;
    const bu = $('#bar-usage'); bu.querySelector('i').style.width = Math.min(100, pct) + '%'; $('#usage-txt').textContent = `${used}/${cap} (${Math.round(pct)}%)`;
    bu.className = 'bar usage ' + (pct > 100 ? 'over' : pct > 90 ? 'danger' : pct > 75 ? 'caution' : pct > 60 ? 'eff' : '');
    $('#bar-cold').hidden = !g.shows('cold');
    const cu = g.coldUsed(), cc = g.warehouse.cold; const bc = $('#bar-cold'); bc.querySelector('i').style.width = cc ? Math.min(100, cu / cc * 100) + '%' : '100%'; const fz = g.warehouse.frozen || 0, fu = g.frozenUsed(); $('#cold-txt').textContent = (cc ? `${cu}/${cc}` : T('common.none')) + (fz || fu ? ` · ❆ ${fu}/${fz}` : ''); bc.className = 'bar cold ' + (cu > cc || fu > fz ? 'over' : '');
    const up = g.upcoming();
    // 기획서대로 앞 2턴만 — 3턴 뒤 입고는 지금 결정에 쓰이지 않는데 줄만 세 줄로 늘어난다
    // 한 줄에 칩 둘 — 내일(▸)·모레(▸▸). 각 칩이 그날의 날씨와 입고를 같이 들고 있다.
    // 날짜도, '입고 예정'이라는 말도, 따로 서 있던 예보 줄도 뺐다 — 전부 중복이었다.
    $('#upcoming').innerHTML = up.slice(0, 2).map((u, i) => {
      const mark = `<b class="ahead">${T(i ? 'hud.dayAfter' : 'hud.tomorrow')}</b>`;
      const wx = u.weather && g.shows('weather') ? `${M.WEATHER[u.weather].icon} ` : '';
      if (u.specs) return `<span class="chip up ${u.heat ? 'heat' : u.off ? 'off' : ''}" data-turn="${u.turn}">${mark} ${wx}${u.heat ? '🌡' : ''}${u.burst ? '⚡' : ''}${u.off ? `🎑${T('hud.off')}` : ''}${(() => {
        let drawn = 0; const out = [];
        for (const sp of u.specs) {
          if (drawn >= 12) { out.push('<b class="more">⋯</b>'); break; }
          const t = D.PARCEL_TYPES[sp.type], n = Math.min(sp.size, 12 - drawn); drawn += n;
          out.push(`<span class="box" title="${esc(t.name)}" aria-label="${esc(t.name)} ${sp.size}">${`<i style="background:${t.css}"></i>`.repeat(n)}</span>`);
        }
        return out.join('');
      })()}</span>`;
      // 월말 정산은 '호출 없음' 버튼 아래에 이미 적혀 있다 — 칩으로 또 띄우면 같은 말이 두 번
      if (u.turn > g.turns()) return '';
      return `<span class="chip none">-</span>`;
    }).join('');
    if (g.isWeekendAfter(g.turn)) $('#upcoming').innerHTML += `<span class="chip none">🛌 ${T('hud.weekend')}</span>`;
    const wxNow = g.weatherNow(), W = M.WEATHER[wxNow], showWx = g.shows('weather');
    if (showWx) $('#upcoming').innerHTML = `<span class="chip wx ${wxNow}" title="${esc(W.name + (W.desc ? ' — ' + W.desc : ''))}">${W.icon}</span>` + $('#upcoming').innerHTML;
    $('#wxline').onclick = () => { SFX.click(); showWeatherInfo(); };
    $('#wxline').className = 'wxline ' + wxNow; $('#wxline').innerHTML = wxNow !== 'sunny' ? `${W.icon} ${esc(W.desc)}` : ''; $('#wxline').hidden = wxNow === 'sunny' || !showWx;
    if (g.items.transitCert || g.items.yardIns === g.month || g.items.customsBond === g.month) $('#upcoming').innerHTML += `<span class="chip">${[g.items.transitCert ? `${M.INS_ITEMS.transitCert.icon} ${esc(M.INS_ITEMS.transitCert.name)} ${g.items.transitCert}` : '', g.items.yardIns === g.month ? `${M.INS_ITEMS.yardIns.icon} ${esc(M.INS_ITEMS.yardIns.name)}` : '', g.items.customsBond === g.month ? `${M.INS_ITEMS.customsBond.icon} ${esc(M.INS_ITEMS.customsBond.name)}` : ''].filter(Boolean).join(' · ')}</span>`;
    if (g.outdoorVolume() > 0) $('#upcoming').innerHTML += `<span class="chip heat" id="wm-reorder" role="button">${T('hud.outdoor', { vol: g.outdoorVolume(), n: g.outdoorParcels().length, storage: g.storage.some(s => s.outdoor) ? T('hud.outdoorStorage') : '', pct: Math.round(g.theftProb() * 100) })} · <b>${T('re.title')} ▸</b></span>`;
    // 칩을 다 그린 뒤에 단다 — innerHTML += 가 앞서 단 핸들러를 지워 버린다
    $('#upcoming').querySelectorAll('.chip.wx').forEach(el => el.onclick = () => { SFX.click(); showWeatherInfo(); });
    $('#upcoming').querySelectorAll('.chip.up').forEach(el => el.onclick = () => { SFX.click(); showUpcomingInfo(+el.dataset.turn); });
    { const rb = $('#wm-reorder'); if (rb) rb.onclick = () => { if (busy) return; SFX.click(); showReorder(() => renderAll()); }; }
    renderOffer();
    renderStock($('#parcels'), g.parcels, pk ? callState() : null);
    $('#parcels').querySelectorAll('.ptile[data-id]').forEach(bindTile);
    renderCallBar();
    if (g.storage.length) $('#parcels').insertAdjacentHTML('afterbegin', g.storage.map(s => { const K = M.STORAGE_KINDS[s.kind], cu = M.CUSTOMERS[s.customer]; return `<div class="parcel storage ${s.outdoor ? 'overdue' : ''}" data-sid="${s.id}"><div class="sw" style="background:#a8845a"></div><div>${K.icon} <span class="nm">${esc(K.name)}</span> ${T('fmt.cells', { n: g.storageVol(s) })} · ${cu.icon}${esc(cu.name)}${s.perTurn ? ` · ${T('log.storagePerTurn', { perTurn: s.perTurn })}` : ''}</div><div class="st">${s.outdoor ? `${T('hud.outdoorTag')} · ` : ''}${T('storage.left', { n: s.left })}</div></div>`; }).join(''));
    $('#parcels').querySelectorAll('.parcel.storage').forEach(el => el.onclick = () => showStorage(+el.dataset.sid));
    const slotsOn = g.visibleSlots();
    for (let i = 0; i < D.CONTRACT_SLOTS; i++) {
      const btn = $('#c' + i), c = g.contracts[i];
      if (!c) { btn.hidden = !g.shows('market') || i >= slotsOn; btn.innerHTML = `<div class="nm">${T('err.emptySlot')}</div><div class="sub">${T('hud.buyInMarket')}</div>`; btn.disabled = true; btn.className = 'btn contract'; continue; }
      btn.hidden = false;
      const car = D.CARRIERS[c.carrier], vcap = g.vehicleCap(c), elig = g.eligibleParcels(c), lv = g.trustLevel(c);
      const can = g.canCall(c) && !busy, struck = g.isStruck(c);
      btn.disabled = !can;
      const spare = c.calls === 0 && R.spareCall && !g.monthStats.spareUsed;
      const caps = g.contractCaps(c), fee = g.truckFee(c), simul = g.simulMax(c), eligVol = elig.reduce((s, p) => s + p.size, 0);
      const pd = g.trustPerk(c.carrier, 'delay'), delay = pd != null ? pd : (car.delay || 0);
      // 지금 한 대 부르면 얼마를 받고 얼마를 내는가 — 이 게임의 핵심 숫자를 카드에 직접 띄운다.
      const pv = loadPreview(g, c, elig);
      // 지금 부르면 차가 꽉 찬다 — 눌러 보라고 반짝인다(강제는 아니다). 이미 서 있는 차면 호출 버튼이 대신 반짝인다
      const fullNow = can && pv.n > 0 && pv.fill >= 1;
      btn.className = 'btn contract' + (can ? ' ready' : '') + (pk && pk.i === i ? ' picked' : '') + (fullNow && !(pk && pk.i === i) ? ' full' : '');
      btn.dataset.full = T('hud.fullTag');
      const extras = [delay ? T('call.payLater', { n: delay }) : '', c.enh.regular && !c.freeUsedMonth ? T('hud.regular') : ''].filter(Boolean);
      // 파란 눈금은 계약된 배차 횟수 — 쓴 만큼 비어 간다. 다 쓰면 전부 빈 칸(0대라는 글자 대신)
      const callMax = Math.max(c.calls, c.maxCalls || c.calls);
      const callPips = callMax <= 15
        ? `<span class="pips calls">${Array.from({ length: callMax }, (_, k) => `${k && k % 5 === 0 ? '<i class="gap"></i>' : ''}<i class="${k < c.calls ? 'on' : ''}"></i>`).join('')}</span>`
        : `${c.calls}/${callMax}`;
      const spent = c.calls === 0 && g.shows('calls') && !spare && !struck;
      const cells = pips(pv.cells, vcap, pv.over, pv.trucks) || `<b>${T('hud.loadCells', { vol: pv.vol, cap: vcap, more: eligVol > vcap ? '+' : '' })}</b>`;
      const bar = cells.startsWith('<span class="pips"') ? '' : `<div class="lg"><i class="${pv.fill >= 0.8 ? 'good' : ''}" style="width:${Math.min(100, pv.fill * 100)}%"></i></div>`;
      btn.innerHTML = `<div class="nm"><span>${car.badge && car.badge !== '🚚' ? car.badge : ''}${esc(car.short)}${gradeBadge(c.grade)}</span><span class="calls ${spent ? 'zero' : ''}">${struck ? T('hud.strike') : g.isOffTurn() ? `<span class="off">${T('hud.off')}</span>` : !g.shows('calls') ? '' : spare ? T('hud.spare') : callPips}</span></div>
        ${(td => td ? `<div class="takesrow">${td}</div>` : '')(takesDots(g, c))}
        ${bar}
        <div class="sub">${spent ? `<span class="spent">${T('hud.callsSpent')}</span>` : `${cells}${pv.n ? ` · <span class="per ${pv.net >= 0 ? 'good' : 'bad'}">${(pv.net >= 0 ? '+' : '−') + Math.abs(pv.net)}c</span>` : ` · <span class="per">${T('hud.perNone')}</span>`}${extras.length ? ' · ' + extras.join(' · ') : ''}`}</div>`;
    }
    const sc = $('#cself');
    if (sc) {
      sc.hidden = !g.shows('self');
      if (!sc.hidden) {
        const on = selfOk() && !busy && g.phase === 'play', n = g.selfCount(), el = g.selfEligible();
        sc.disabled = !on; sc.className = 'btn contract self' + (on ? ' ready' : '') + (pk && pk.i === SELF ? ' picked' : '');
        const pv = sortByUrgency(el).slice(0, n);
        sc.innerHTML = `<div class="nm"><span>🚐 ${T('self.card')}</span><span class="calls">×${n}</span></div><div class="sub">${el.length ? `${pips(pv.flatMap(p => Array(p.size).fill(ptype(p).css)), Math.min(10, pv.reduce((s, p) => s + p.size, 0)), [])} · ${T('self.cardSub', { n: el.length })}` : T('err.nothingSelf')}</div>`;
      }
    }
    const wb = $('#wait-btn'); wb.disabled = busy || g.phase !== 'play';
    const f = g.forecast();
    renderOps(g, f);
    const warn = [];
    if (f.overdue) warn.push(T('wait.overdue', { n: f.overdue })); if (f.spoil) warn.push(T('wait.spoil', { n: f.spoil })); if (f.frozenOver) warn.push(T('wait.frozenOver', { n: f.frozenOver }));
    wb.className = 'btn primary' + (f.used > f.cap || f.spoil || f.frozenOver ? ' danger' : '');
    // 오늘 영업을 마치면 받게 될 다음 입고 — 매 턴 가장 중요한 결정을 흐리거나 자르지 않는다.
    const restsNext = g.isWeekendAfter(g.turn) && !g.shows('weekendChoice');   // 마감하면 그대로 쉬는 날로 넘어간다
    const selfN = pk && pk.i === SELF ? pk.sel.size : 0;
    wb.innerHTML = `${selfN ? T('wm.selfWait', { n: selfN, cost: selfPlan().cost }) : restsNext ? T('wait.btnRest') : T('wait.btnPlain')}<small>${f.monthEnd ? T('hud.monthEnd') : T('wait.next', { used: f.used, cap: f.cap, over: f.used > f.cap ? T('wait.over') : '' })}${warn.length ? ` <b class="wrisk">${warn.join(' · ')}</b>` : ''}</small>`;
    renderCoach();
  }
  // ---------- 스토리 모드 코치 한 줄 ----------
  // 안내가 대사로만 나가면 "오늘은 기다려"가 그날 하루 얘기로 읽힌다.
  // 차가 찰 때까지 매 턴 지금 뭘 해야 하는지 액션 버튼 위에 한 줄로 붙여 둔다 (스토리 모드에서만).
  function coachHint(g) {
    const b = Story.bestSlot(g);
    const c = b.slot >= 0 ? g.contracts[b.slot] : g.contracts.find(Boolean);
    if (!c) return T('coach.noContract');
    const name = g.contractName(c), cap = g.vehicleCap(c);
    const vol = g.eligibleParcels(c).reduce((s2, p) => s2 + p.size, 0);
    // handOff("나머지는 자네가 해봐") 전에는 시키는 말투, 그 뒤로는 상태만 알려준다
    const q = g.story.seen.includes('handOff') ? 'Quiet' : '';
    const stuck = g.unhandled().filter(p => !(p.customs > 0));
    if (stuck.length) return T('coach.stuck', { n: stuck.length, list: [...new Set(stuck.map(p => D.PARCEL_TYPES[p.type].short))].join('') });
    if (g.usage() >= 0.9) return T('coach.full');
    if (b.slot >= 0 && b.fill >= 0.8) return T('coach.ready' + q, { name, pct: Math.min(100, Math.round(b.fill * 100)) });
    return T('coach.wait' + q, { vol, cap, name });
  }
  function renderCoach() {
    const el = $('#coach'), g = game;
    if (!g || !window.Story || !Story.active(g) || g.phase !== 'play') { el.hidden = true; return; }
    // 인수인계 뒤의 평시 조언은 숨긴다. 꽉 찼거나, 막혔거나, 트럭이 찼을 때만 다시 등장한다.
    if (g.story.seen.includes('handOff')) {
      const b = Story.bestSlot(g);
      const urgent = g.unhandled().some(p => !(p.customs > 0)) || g.usage() >= 0.9 || (b.slot >= 0 && b.fill >= 0.8);
      if (!urgent) { el.hidden = true; return; }
    }
    let hint = null; try { hint = coachHint(g); } catch (e) { hint = null; }
    if (!hint) { el.hidden = true; return; }
    el.innerHTML = `<img src="${Story.sprite('park', 'neutral', false)}" alt=""><span>${hint}</span>`;
    el.hidden = false;
  }

  // ---------- 평판 상세: 지금 등급의 바닥~상한 사이 어디인지, 다음 등급까지 얼마인지 ----------
  // HUD 게이지만으로는 "20/35" 의 20 이 시작값이라 뭘 채우는 중인지 보이지 않는다.
  function showRepInfo() {
    const g = game, floor = g.repFloor(), cap = g.repCap(), top = g.repTier >= D.REP_TIERS.length - 1;
    const band = Math.max(1, cap - floor), inBand = Math.max(0, Math.min(band, g.rep - floor));
    const next = top ? null : D.REP_TIERS[g.repTier + 1];
    const newCust = top ? [] : g.customersAtTier(g.repTier + 1).filter(k => !g.customers[k]);
    const bar = `<div class="gauge rep" style="width:100%;height:14px"><i style="width:${Math.round(inBand / band * 100)}%"></i></div>`;
    const body = `<div class="kv"><span>${T('repi.tier')}</span><span class="v">${esc(g.repTierName())} ${g.rep}/${cap}</span></div>
      ${bar}<div class="d">${top ? T('repi.top') : g.repToNext() === 0 ? T('repi.ready', { name: esc(T('rep.tier.' + next.id)) }) : T('repi.toNext', { n: g.repToNext(), name: esc(T('rep.tier.' + next.id)), from: floor, to: cap })}</div>
      <div class="d" style="color:var(--green);margin-top:8px">${T('repi.up')}</div>
      <div class="d" style="color:var(--red)">${T('repi.down')}</div>
      ${top ? '' : `<div style="font-size:12px;color:var(--gold);margin:10px 0 3px">${T('repi.nextHead', { name: esc(T('rep.tier.' + next.id)) })}</div>
        <div class="d">${T('repi.nextScale', { arr: Math.round((next.arrivals / g.repTierDef().arrivals - 1) * 100), op: Math.round((next.opCost / g.repTierDef().opCost - 1) * 100) })}</div>
        ${newCust.length ? `<div class="d">${T('repi.nextCust', { list: newCust.map(k => M.CUSTOMERS[k].icon + esc(M.CUSTOMERS[k].name)).join(' · ') })}</div>` : ''}
        ${(next.unlock || []).filter(t => !g.repUnlocked(t)).length ? `<div class="d">${T('repi.nextGoods', { list: (next.unlock || []).filter(t => !g.repUnlocked(t)).map(t => D.PARCEL_TYPES[t].short).join(' · ') })}</div>` : ''}`}
      <div class="d" style="color:var(--dim);margin-top:8px">${T('repi.zero')}</div>`;
    modal(T('hud.rep'), body, [{ label: T('btn.close'), onClick: closeModal }]);
  }
  // ---------- HUD 팝업: 회사 · 날씨 · 입고 예정 ----------
  function showCompanyInfo() {
    const g = game, co = g.company;
    const custs = g.customerSummary().map(c => `<div class="d">${M.CUSTOMERS[c.id].icon} ${esc(M.CUSTOMERS[c.id].name)}${c.id !== 'anon' ? ` — ${T('cust.trustLv', { n: c.level })}${c.suspended ? ` (${T('cust.suspended')})` : ''}` : ''}</div>`).join('');
    const body = `<div class="d">${esc(co.tag)}</div>${companyInfo(co, g.cfg.company)}
      <div class="d" style="margin-top:6px">${T('company.difficulty')}: ${g.difficulty.icon} ${esc(g.difficulty.name)} — ${esc(g.difficulty.desc)}</div>
      <div class="d" style="margin-top:6px">${T('company.warehouse', { cap: g.warehouse.cap, cold: g.warehouse.cold, frozen: g.warehouse.frozen || 0, xl: g.warehouse.xl })}${['coldvan', 'padvan', 'bigvan', 'vent'].filter(k => g.warehouse[k]).length ? ` · ${T('company.facilities')}: ` + ['coldvan', 'padvan', 'bigvan', 'vent'].filter(k => g.warehouse[k]).map(k => D.FACILITIES[k].name).join(', ') : ''}</div>
      <div style="font-size:12px;color:var(--gold);margin:8px 0 3px">${T('company.customers')}</div>${custs}
      ${g.perks.length ? `<div style="font-size:12px;color:var(--gold);margin:8px 0 3px">${T('company.perks')}</div>${g.perks.map(p => `<div class="d">${esc(M.PERKS[p].name)} — ${esc(M.PERKS[p].desc)}</div>`).join('')}` : ''}`;
    modal(`${co.icon} ${co.name}`, body, [{ label: T('company.customerDetail'), onClick: () => showCustomers(closeModal) }, { label: T('btn.close'), cls: 'primary', onClick: closeModal }]);
  }
  function showWeatherInfo() {
    const g = game, now = g.weatherNow();
    // 예보는 이틀 앞까지다. 나머지 날을 '?' 로 늘어놓는 것은 정보가 아니라 줄이다.
    const known = [];
    for (let t = g.turn; t <= Math.min(g.turns(), g.turn + g.rules.forecastTurns); t++)
      known.push(`<span class="chip wx ${g.weatherAt(t)} ${t === g.turn ? 'now' : ''}">${t === g.turn ? T('hud.today') : `<b class="ahead">${T(t === g.turn + 1 ? 'hud.tomorrow' : 'hud.dayAfter')}</b>`} ${M.WEATHER[g.weatherAt(t)].icon}</span>`);
    const rows = Object.keys(M.WEATHER).map(k => { const W = M.WEATHER[k]; return `<div class="ttrow ${k === now ? 'on' : ''}"><span class="lv">${W.icon}</span><span class="ef"><b>${esc(W.name)}</b>${W.desc ? ' — ' + esc(W.desc) : ' — ' + T('weather.noEffect')}</span></div>`; }).join('');
    const season = T('season.' + g.season());
    modal(T('weather.title'), `<div class="d">${T('weather.season', { season: `<b>${season}</b>` })}${g.rules.tent ? ` · ${T('weather.tent')}` : ''}</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">${known.join('')}</div><div class="ttrack">${rows}</div><div class="d" style="margin-top:6px;color:var(--dim)">${T('weather.note')}</div>`, [{ label: T('btn.close'), onClick: closeModal }]);
    storyCheck({ kind: 'modal', modal: 'weather' });
  }
  function showUpcomingInfo(turn) {
    const g = game, u = g.upcoming().find(x => x.turn === turn); if (!u || !u.specs) return;
    const wx = u.weather ? M.WEATHER[u.weather] : null;
    let coldFree = g.warehouse.cold - g.coldUsed(), fzFree = (g.warehouse.frozen || 0) - g.frozenUsed();
    // 똑같은 택배가 줄마다 따로 서면 읽을 것만 늘어난다 — 종류·크기·고객·상태가 같으면 묶어서 ×N.
    // 냉장·냉동 자리 판정은 앞에서부터 차례로 하므로(같은 택배라도 하나는 들어가고 하나는 못 들어간다)
    // 상태 문구까지 계산한 뒤에 묶는다 — 묶여도 잃는 정보가 없다 (부록 F 의 재고 묶기와 같은 규칙).
    const lines = u.specs.map(s => { const t = D.PARCEL_TYPES[s.type], a = s.attrs || t.attrs, cu = M.CUSTOMERS[s.customer || 'anon']; let note = '';
      if (a.includes('frozen')) { if (s.size <= fzFree) { fzFree -= s.size; note = T('up.frozenOk'); } else note = `<b style="color:var(--red)">${T('up.frozenNo')}</b>`; }
      else if (a.includes('cold')) { if (s.size <= coldFree) { coldFree -= s.size; note = T('up.coldOk'); } else note = `<b style="color:var(--orange)">${T('up.coldNo')}</b>`; }
      if (a.includes('customs')) note += (note ? ' · ' : '') + T('up.customs', { n: g.rules.customsWait });
      if (s.burst) note += (note ? ' · ' : '') + `<b style="color:var(--orange)">${T('up.burst')}</b>`;
      return { s, t, a, cu, note, key: [s.type, (a || []).join(''), s.size, s.customer || 'anon', note].join('|') };
    });
    const groups = [];
    for (const ln of lines) { const g0 = groups.find(x => x.key === ln.key); if (g0) g0.n++; else groups.push({ ...ln, n: 1 }); }
    const rows = groups.map(({ s, t, a, cu, note, n }) => {
      const cells = T('fmt.cells', { n: s.size }) + (n > 1 ? ` <b>×${n}</b>` : '');
      return `<div class="parcel"><div class="sw" style="background:${t.css}"></div><div><span class="cust">${cu.icon}</span><span class="nm">${esc(t.short)}</span>${attrIcons(a)} ${cells} · ${game.baseReward(s.type, s.size) * n}c · ${esc(cu.name)}</div><div class="st">${note}</div></div>`;
    }).join('');
    const vol = u.specs.reduce((v, s) => v + s.size, 0), used = g.usedVolume();
    modal(T('up.title', { date: g.dateDowLabel(turn) }), `<div class="pickinfo"><span>${T('up.volume', { vol })}</span><span>${T('common.warehouse')} ${used} → <b class="${used + vol > g.warehouse.cap ? 'bad' : ''}">${used + vol}</b>/${g.warehouse.cap}</span>${wx ? `<span>${wx.icon} ${wx.name}</span>` : ''}</div>${u.heat ? `<div class="d" style="color:var(--orange)">${T('up.heat')}</div>` : ''}<div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">${rows}</div><div class="d" style="margin-top:6px;color:var(--dim)">${T('up.note')}</div>`, [{ label: T('btn.close'), onClick: closeModal }]);
  }
  // ---------- 택배 상세 ----------
  // 슬롯이 꽉 찼을 때, 이 택배를 풀어 줄 특약이 있는가 (있으면 이름을 돌려준다)
  function optFor(g, p) {
    const attrs = p.attrs || D.PARCEL_TYPES[p.type].attrs;
    for (const k of Object.keys(D.ENHANCEMENTS)) {
      const e = D.ENHANCEMENTS[k];
      if (e.kind === 'opt' && attrs.includes(e.attr) && g._canFitOpt(k)) return e.name;
    }
    return null;
  }
  function showParcelDetail(id) {
    const g = game, p = g.parcels.find(x => x.id === id); if (!p) return;
    const t = ptype(p), a = attrsOf(p), cu = M.CUSTOMERS[p.customer || 'anon'], lv = g.customerLevel(p.customer || 'anon');
    const claim = Math.round(((p.reward != null ? p.reward : game.baseReward(p.type, p.baseSize))) * cu.claimMult * g.rules.claimMult * (g.rules.customerClaimMult[p.customer] || 1));
    const attrRows = a.map(k => `<div class="d">${D.ATTRS[k].icon} <b>${D.ATTRS[k].name}</b> — ${T('attr.' + k)}</div>`).join('');
    // 못 싣는 계약 줄은 읽을 이유가 없다 — 실을 수 있는 것만 보여 주고,
    // 하나도 없을 때만 전부 펼쳐 "왜 안 실리는지"를 답한다
    const anyOk = g.contracts.some(c => c && g.canHandle(c, p));
    const rows = g.contracts.map(c => { if (!c || (anyOk && !g.canHandle(c, p))) return ''; const car = D.CARRIERS[c.carrier]; const ok = g.canHandle(c, p), bp = ok ? g.breakProb(c, p) : 0, can = g.canCall(c); const why = !ok ? T(p.size > g.contractSizeMax(c) || p.size < car.sizeMin ? 'pd.sizeOut' : car.onlyPlain ? 'pd.plainOnly' : car.need ? 'pd.notSpecial' : a.includes('frozen') ? 'pd.noFrozenCap' : p.customs > 0 ? 'self.customsWait' : 'pd.no') : ''; const spec = ok && g.isSpecialist(car, p.type) && t.bonus; return `<div class="ttrow ${ok ? 'on' : ''}"><span class="lv">${car.badge || '🚚'}</span><span class="ef">${esc(car.short)}${gradeBadge(c.grade)} ${ok ? `${spec ? `<span style="color:var(--gold)">${T('pd.specialBonus', { n: t.bonus })}</span> ` : ''}${bp ? `<span style="color:var(--orange)">${T('pd.breakRisk', { pct: Math.round(bp * 100) })}</span>` : ''}${!can ? `<span style="color:var(--dim)">(${T('pd.cannotCall')})</span>` : ''}` : `<span style="color:var(--dim)">${why}</span>`}</span><span class="st">${ok ? T('fmt.calls', { n: c.calls }) : '—'}</span></div>`; }).join('');
    const selfOk = g.selfCan(p), selfWhy = g.selfBlockReason(p);
    const body = `<div class="parcel" style="margin-bottom:6px"><div class="sw" style="background:${t.css}"></div><div>${urgDot(p)}${g.shows('customers') ? `<span class="cust">${cu.icon}</span>` : ''}<span class="nm">${esc(t.name)}</span>${attrIcons(a)} ${T('fmt.cells', { n: p.size })} · ${T('pd.baseReward', { n: p.reward })}</div><div class="st">${parcelStatus(p)}</div></div>
      ${g.shows('customers') ? `<div class="d">${T('company.customers')} <b>${cu.icon} ${esc(cu.name)}</b>${p.customer !== 'anon' ? ` · ${T('cust.trustLv', { n: lv })} ${T('pd.perPiece', { n: M.CUSTOMER_BONUS[lv] })}` : ''}${cu.rule ? `<br><span style="color:var(--gold)">${esc(cu.rule.text)}</span>` : ''}</div>` : ''}
      ${p.wet || p.outdoor ? `<div class="d">${[p.wet ? T('pd.wet') : '', p.outdoor ? T('pd.outdoor') : ''].filter(Boolean).join(' · ')}</div>` : ''}
      ${attrRows}
      ${g.contracts.some(c => c && g.canHandle(c, p) && g.breakProb(c, p) === 0) || selfOk ? '' : `<div class="d" style="color:var(--orange);margin-top:6px">${g.contracts.filter(Boolean).length >= D.CONTRACT_SLOTS && optFor(g, p) ? T('pd.needOpt', { name: optFor(g, p) }) : famNames(p) ? T('pd.needFamily', { list: famNames(p) }) : T('pd.needNothing')}</div>`}
      <div style="font-size:12px;color:var(--gold);margin:8px 0 3px">${T('pd.contracts')}</div><div class="ttrack">${rows || `<div class="d">${T('pd.noContract')}</div>`}${g.shows('self') ? `<div class="ttrow ${selfOk ? 'on' : ''}"><span class="lv">🚚</span><span class="ef">${T('pd.selfRow')} ${selfOk ? T('pd.selfCost', { cost: g.selfCost(p) }) : `<span style="color:var(--dim)">${esc(selfWhy || T('pd.no'))}</span>`}</span><span class="st">${selfOk ? T('pd.ok') : '—'}</span></div>` : ''}</div>`;
    modal(`${t.name} ${T('fmt.cells', { n: p.size })}`, body, [{ label: T('btn.close'), onClick: closeModal }]);
    storyCheck({ kind: 'modal', modal: 'parcel', parcel: p });
  }
  function showSceneInspect(hit) {
    if (!game || busy || !hit) return;
    SFX.click();
    if (hit.kind === 'parcel') {
      const id = hit.id;
      if (typeof id === 'string' && id[0] === 's') return showStorage(+id.slice(1));
      return showParcelDetail(+id);
    }
    const g = game, ko = I18n.lang === 'ko';
    if (hit.kind === 'truck' || hit.kind === 'vehicle') {
      const rows = g.contracts.filter(Boolean).map(c => { const car = D.CARRIERS[c.carrier]; return `<div class="ttrow on"><span class="lv">${car.badge || '🚚'}</span><span class="ef"><b>${esc(g.contractName(c))}</b><br>${esc(car.vehicle || '')} · ${ko ? '적재' : 'load'} ${g.vehicleCap(c)} · ${ko ? '대당' : 'fee'} ${g.truckFee(c)}c</span><span class="st">${ko ? '배차' : 'calls'} ${c.calls}</span></div>`; }).join('');
      return modal(ko ? '🚚 차량·배차 현황' : '🚚 Fleet status', `<div class="d">${ko ? '현재 계약 차량의 적재량과 남은 배차입니다.' : 'Capacity and remaining calls for your contracted vehicles.'}</div><div class="ttrack">${rows || `<div class="d">${T('common.none')}</div>`}</div>`, [{ label: T('btn.close'), onClick: closeModal }]);
    }
    if (hit.kind === 'growth') return showGrowth();
    const used = g.usedVolume(), cap = g.warehouse.cap, outside = g.outdoorVolume();
    const growthNames = { marketing: ko ? '홍보' : 'Marketing', fleet: ko ? '차량' : 'Fleet', warehouse: ko ? '창고' : 'Warehouse', automation: ko ? '자동화' : 'Automation', branding: ko ? '브랜드' : 'Brand', coldchain: ko ? '저온' : 'Cold chain' };
    const growth = Object.keys(growthNames).filter(k => g.growth[k]).map(k => `${growthNames[k]} Lv.${g.growth[k]}`).join(' · ');
    const title = hit.kind === 'yard' ? (ko ? '🌧 야외 적재장' : '🌧 Outdoor yard') : hit.kind === 'cold' ? (ko ? '❄ 저온 구역' : '❄ Cold zone') : (ko ? '🏭 창고 현황' : '🏭 Warehouse status');
    const body = `<div class="big-num">${used}/${cap}</div><div class="kv"><span>${ko ? '빈 공간' : 'Free space'}</span><span class="v">${Math.max(0, cap - used)}</span><span>${ko ? '냉장' : 'Cold'}</span><span class="v">${g.coldUsed()}/${g.warehouse.cold}</span><span>${ko ? '냉동' : 'Frozen'}</span><span class="v">${g.frozenUsed()}/${g.warehouse.frozen || 0}</span><span>${ko ? '야외 적재' : 'Outside'}</span><span class="v">${outside}</span></div>${growth ? `<div class="d" style="margin-top:8px;color:var(--gold)">${growth}</div>` : ''}<div class="d" style="margin-top:8px">${ko ? '바닥 타일 하나가 보관 1칸입니다. 상자를 누르면 개별 배송 정보가 열립니다.' : 'Each floor tile is one storage cell. Tap a box for delivery details.'}</div>`;
    const acts = g.shows('invest') ? [{ label: ko ? '사업 확장' : 'Invest', onClick: showGrowth }] : [];
    modal(title, body, acts.concat([{ label: T('btn.close'), cls: 'primary', onClick: closeModal }]));
  }
  function renderOffer() {
    const g = game, o = g.offer, el = $('#offer');
    if (!o || g.phase !== 'play') { el.innerHTML = ''; return; }
    const K = M.STORAGE_KINDS[o.kind], cu = M.CUSTOMERS[o.customer], after = g.usedVolume() + o.vol;
    el.innerHTML = `<div class="offer"><div><b>${K.icon} ${T('offer.title', { name: esc(cu.name) })}</b> — ${esc(K.name)} <b>${T('fmt.cells', { n: o.vol })}</b> · <b>${T('fmt.turns', { n: o.turns })}</b> · ${o.fee ? T('offer.prepaid', { fee: o.fee }) : T('offer.perTurn', { perTurn: o.perTurn, total: o.perTurn * o.turns })}<br><small style="color:${after > g.warehouse.cap ? 'var(--red)' : 'var(--dim)'}">${T('offer.note', { used: g.usedVolume(), after, cap: g.warehouse.cap, push: after > g.warehouse.cap ? ` ${T('offer.push')}` : '' })}</small></div><div class="ob"><button class="btn small primary" id="offer-yes">${T('offer.accept')}</button><button class="btn small" id="offer-no">${T('offer.decline')}</button></div></div>`;
    el.querySelector('#offer-yes').onclick = () => { if (busy) return; const r = g.acceptOffer(); if (!r.ok) return toast(r.msg); SFX.buy(); floatText(T('offer.feeFloat', { n: r.fee }), false, 70); g.takeEvents(); scene.sync(g, { animate: true }); saveGame(); renderAll(); };
    el.querySelector('#offer-no').onclick = () => { if (busy) return; SFX.cancel(); g.declineOffer(); saveGame(); renderAll(); };
  }
  function showStorage(id) {
    const s = game.storage.find(x => x.id === id); if (!s) return;
    const K = M.STORAGE_KINDS[s.kind], refund = Math.round(s.fee * s.left / s.turns);
    modal(`${K.icon} ${K.name}`, `<p>${esc(M.CUSTOMERS[s.customer].name)} · ${T('fmt.cells', { n: game.storageVol(s) })} · ${T('storage.left', { n: s.left })}${s.perTurn ? ` · ${T('storage.postpaid', { n: s.perTurn * s.turns })}` : ` · ${T('storage.prepaid', { n: s.fee })}`}</p><p style="color:var(--dim);font-size:12px">${T('storage.earlyNote', { refund, total: refund + 30 })}</p>`,
      [{ label: T('btn.close'), onClick: closeModal }, { label: T('storage.earlyBtn', { n: refund + 30 }), cls: 'danger', onClick: () => { const r = game.returnStorage(id); if (!r.ok) return toast(r.msg); SFX.cancel(); closeModal(); game.takeEvents(); scene.sync(game, { animate: true }); saveGame(); renderAll(); } }]);
  }
  // ---------- 적재 화면 (대기 전) ----------
  function showReorder(onDone) {
    const g = game, cap = g.warehouse.cap;
    let pref = g.outdoorPref.slice();
    const saved = g.outdoorPref.slice();
    const nextWx = g.weatherAt(g.turn + 1), NW = M.WEATHER[nextWx];
    const render = () => {
      g.setOutdoor(pref); pref = [...g.outdoorParcels().map(p => p.id), ...g.storage.filter(s => s.outdoor).map(s => 's' + s.id)];
      const row = (p, out) => { const t = ptype(p), a = attrsOf(p), cu = M.CUSTOMERS[p.customer || 'anon'], claim = Math.round(((p.reward != null ? p.reward : game.baseReward(p.type, p.baseSize))) * cu.claimMult); return `<div class="parcel ${p.overdue ? 'overdue' : ''}" data-id="${p.id}"><div class="sw" style="background:${t.css}"></div><div>${urgDot(p)}<span class="cust">${cu.icon}</span><span class="nm">${esc(t.short)}</span>${attrIcons(a)} ${T('fmt.cells', { n: p.size })} · ${p.reward}c · ${T('re.claim', { n: claim })}${out && (a.includes('cold') || a.includes('frozen')) ? ` <b style="color:var(--red)">${T('re.outOfZone')}</b>` : ''}${out && nextWx !== 'sunny' && nextWx !== 'snow' && !a.includes('cold') && !a.includes('frozen') && !g.rules.tent ? ` <b style="color:var(--orange)">${T('re.wet')}</b>` : ''}</div><div class="st">${parcelStatus(p)}</div></div>`; };
      const srow = s => { const K = M.STORAGE_KINDS[s.kind]; return `<div class="parcel storage ${s.outdoor ? 'overdue' : ''}" data-sid="${s.id}"><div class="sw" style="background:#a8845a"></div><div>${K.icon} <span class="nm">${esc(K.name)}</span> ${T('fmt.cells', { n: g.storageVol(s) })} · ${T('re.storageClaim')}</div><div class="st">${T('storage.left', { n: s.left })}</div></div>`; };
      const inside = sortByUrgency(g.parcels.filter(p => !p.outdoor)), outside = sortByUrgency(g.parcels.filter(p => p.outdoor));
      const inVol = g.usedVolume() - g.outdoorVolume(), outVol = g.outdoorVolume();
      const body = `<div class="pickinfo"><span>${T('re.inside')} <b class="${inVol > cap ? 'bad' : ''}">${inVol}/${cap}</b></span><span>${T('re.outside', { vol: outVol, pct: Math.round(g.theftProb(nextWx) * 100) })}</span><span>${T('re.nextTurn')} ${NW.icon} ${NW.name}</span></div>
        ${NW.desc ? `<div class="d" style="font-size:12px;color:var(--orange);margin-bottom:4px">${NW.icon} ${esc(NW.desc)}</div>` : ''}
        <div class="presets"><span>${T('re.presets')}</span><button class="btn small" data-pre="urgent">${T('re.preUrgent')}</button><button class="btn small" data-pre="reward">${T('re.preReward')}</button><button class="btn small" data-pre="claim">${T('re.preClaim')}</button>${Object.keys(g.customers).filter(id => id !== 'anon' && !M.CUSTOMERS[id].storage && g.parcels.some(p => p.customer === id)).map(id => `<button class="btn small" data-pre="customer" data-cust="${id}">${T('re.preCustomer', { icon: M.CUSTOMERS[id].icon })}</button>`).join('')}</div>
        <div class="zone-h">${T('re.zoneIn')}</div><div class="zone">${g.storage.filter(s => !s.outdoor).map(srow).join('')}${inside.map(p => row(p, false)).join('') || `<div id="empty">${T('re.empty')}</div>`}</div>
        <div class="zone-h">${T('re.zoneOut')}</div><div class="zone out">${g.storage.filter(s => s.outdoor).map(srow).join('')}${outside.map(p => row(p, true)).join('') || `<div id="empty">${T('common.none')}</div>`}</div>`;
      const m = modal(T('re.title'), body, [{ label: T('btn.cancel'), onClick: () => { g.setOutdoor(saved); closeModal(); renderAll(); } }, { label: T('btn.apply'), cls: 'primary', onClick: () => { closeModal(); saveGame(); onDone(); } }], T('re.sub'));
      m.querySelectorAll('.parcel[data-id]').forEach(el => el.onclick = () => { const id = +el.dataset.id; SFX.click(); if (pref.includes(id)) pref = pref.filter(x => x !== id); else pref.push(id); render(); });
      m.querySelectorAll('.parcel[data-sid]').forEach(el => el.onclick = () => { const id = 's' + el.dataset.sid; SFX.click(); if (pref.includes(id)) pref = pref.filter(x => x !== id); else pref.push(id); render(); });
      m.querySelectorAll('[data-pre]').forEach(el => el.onclick = () => { SFX.select(); pref = g.presetOutdoor(el.dataset.pre, el.dataset.cust); render(); });
    };
    render();
  }
  // 이 계약이 받아 주는 품목 — 색 점 하나가 한 종류다. 속성이 안 열린 장에서는 전부 일반이라 안 그린다.
  // 칸 수를 숫자 대신 작은 트럭으로 — 빈 칸이 곧 용량이다
  function miniTruck(g, c) {
    const n = g.baseCapacity(c);
    return `<span class="mktruck" title="${esc(T('fmt.cells', { n }))}" aria-label="${esc(T('fmt.cells', { n }))}">${'<i></i>'.repeat(Math.min(n, 16))}<b></b></span>`;
  }
  // always: 속성이 안 열린 장에서도 그린다(그땐 일반만 있으니 갈색 한 점)
  function takesDots(g, c, always) {
    if (!g.shows('attrs') && !always) return '';
    // 지금 열린 종류 + 다음 사이클 예상에 있는 종류 — 마켓에서는 '곧 올 것'을 실을 수 있는지가 궁금하다
    const soon = new Set(); if (always) { try { for (const f of g.customerForecast(g.phase === 'market' ? g.month + 1 : g.month)) for (const t in f.range) if (f.range[t][1] > 0) soon.add(t); 
      // 장의 마지막 마켓이면 다음 장 대본에 오는 종류도 (1장 마켓에서 살살 택배가 ⚠ 를 싣는다는 걸 보여 준다)
      const nx = g.level && window.LEVELS && g.phase === 'market' && g.month >= g.rules.months ? LEVELS.get(g.level.n + 1) : null;
      if (nx && nx.script) for (const k in nx.script) for (const day of (nx.script[k].turns || [])) for (const sp of day) soon.add(sp.type); } catch (e) { /* 예상이 없으면 지금 것만 */ } }
    const open = t => t === 'normal' || soon.has(t) || (g.shows('attrs') && (t !== 'fresh' || g.shows('cold')) && (t !== 'frozen' || g.shows('frozen')) && (t !== 'large' || g.shows('bigsize')) && (t !== 'intl' || g.shows('bigsize')));
    const dots = Object.keys(D.PARCEL_TYPES).filter(open).filter(t => {
      const T2 = D.PARCEL_TYPES[t], size = T2.sizes.find(sz => sz >= D.CARRIERS[c.carrier].sizeMin && sz <= g.contractSizeMax(c));
      if (size == null) return false;
      const pp = { type: t, size, attrs: T2.attrs, customs: T2.attrs.includes('customs') ? 1 : 0 };
      return g.canHandle(c, pp) && !g.breakProb(c, pp);      // 깨질 위험이 있으면 '받는다'고 할 수 없다
    }).map(t => `<i style="background:${D.PARCEL_TYPES[t].css}" title="${esc(D.PARCEL_TYPES[t].name)}"></i>`).join('');
    return dots ? `<span class="takes">${dots}</span>` : '';
  }
  // 칸과 배차는 숫자보다 눈금이 빠르다. 차 한 대가 칸 여섯이면 네모 여섯,
  // 실을 게 넘치면 한 칸 띄우고 남는 만큼 더 — '6+4' 가 그대로 보인다.
  const PIP_MAX = 10;
  // trucks > 1 이면 차마다 한 칸 띄워 그린다 — 두 대가 '6+6' 으로 보인다
  function pips(cells, cap, over, trucks) {
    if (cap > PIP_MAX) return '';
    let h = '';
    for (let i = 0; i < cap * (trucks || 1); i++) { if (i && i % cap === 0) h += '<i class="gap"></i>'; h += cells[i] ? `<i class="on" style="background:${cells[i]}"></i>` : '<i></i>'; }
    // 넘치는 칸은 많아야 여섯까지만 그린다 — 그 이상은 눈금이 아니라 벽이 된다
    if (over.length) { h += '<i class="gap"></i>'; over.slice(0, 6).forEach((css, i) => { h += `<i class="over${over.length > 6 && i === 5 ? ' more' : ''}" style="background:${css}"></i>`; }); }
    return `<span class="pips">${h}</span>`;
  }
  // 계약 카드용 한 대 적재 미리보기 (호출 팝업의 '급한 순 자동 선택'과 같은 규칙)
  // 지금 한 대 부르면 얼마를 받고 얼마를 내는가. '개당 Nc' 는 버는 돈으로 읽혀서(유저 지적)
  // 받는 값·배차비·남는 값 셋을 그대로 보여 준다 — 호출 팝업의 +수입/−비용/순익과 같은 언어다.
  const pickTrucks = (g, c) => Math.max(1, Math.min(g.simulMax(c), c.calls || 1));
  function loadPreview(g, c, elig) {
    const vcap = g.vehicleCap(c);
    const rewardOf = p => (p.reward != null ? p.reward : g.baseReward(p.type, p.baseSize));
    const cellsOf = ps => { const out = []; for (const p of ps) for (let k = 0; k < p.size; k++) out.push(D.PARCEL_TYPES[p.type].css); return out; };
    const pack = (take, fee) => {
      const rest = elig.filter(p => !take.includes(p));
      const vol = take.reduce((s2, p) => s2 + p.size, 0), rev = take.reduce((s2, p) => s2 + rewardOf(p), 0);
      return { n: take.length, vol, fill: vol / vcap, fee, rev, net: rev - fee, cells: cellsOf(take), over: cellsOf(rest) };
    };
    try {
      const sorted = elig.slice().sort((a, b) => urgencyOf(a) - urgencyOf(b) || (b.overdue - a.overdue));
      const r = g.autoPick(c, sorted, pickTrucks(g, c));
      const pv = pack(elig.filter(p => r.ids.includes(p.id)), g.callFee(c, r.trucks || 1));
      return Object.assign(pv, { trucks: r.trucks || 1, fill: pv.vol / (vcap * (r.trucks || 1)) });
    } catch (e) {
      const take = []; let vol = 0;
      for (const p of elig) { if (vol + p.size > vcap) continue; vol += p.size; take.push(p); }
      return pack(take, g.truckFee(c));
    }
  }
  function trustBar(g, carrier) {
    if (g && !g.shows('trust')) return '';
    const lv = g.trustLevel(carrier), nx = g.trustNext(carrier);
    const bars = [1, 2, 3].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('');
    return `<span class="trust" title="${nx ? T('trust.next', { have: nx.have, need: nx.need, effect: nx.effect }) : T('trust.max')}">${bars}${nx ? ` ${nx.have}/${nx.need}` : ' MAX'}</span>`;
  }
  // 신뢰도 트랙: 단계별 효과·필요 xp·달성 여부. xp가 null이면 진행도 없이 정적 표시(도감)
  function trustTrack(carrier, xp) {
    if (game && !game.shows('trust')) return '';
    const rows = [1, 2, 3].map(lv => {
      const need = D.TRUST_LEVELS[lv], on = xp != null && xp >= need;
      const state = xp == null ? `${need}xp` : on ? '✓' : T('trust.remain', { n: Math.max(0, need - xp) });
      return `<div class="ttrow ${on ? 'on' : ''}"><span class="lv">${lv}</span><span class="ef">${esc(D.trustEffectText(carrier, lv))}</span><span class="st">${state}</span></div>`;
    }).join('');
    return `<div class="ttrack">${rows}</div>`;
  }
  function attrsOf(p) { return p.attrs || D.PARCEL_TYPES[p.type].attrs; }
  function valueTier(p) { const r = p.reward || 0; return p.premium || r >= 130 ? 3 : r >= 90 ? 2 : r >= 60 ? 1 : 0; }
  function valueBadge(p) { const v = valueTier(p); return v ? `<span class="vbadge v${v}" title="${esc(T('value.tier.' + v))}">${v === 3 ? '✦' : v === 2 ? '◆' : '▲'}</span>` : ''; }
  function attrIcons(attrs) { return attrs.map(a => `<span class="attr ${a}" title="${D.ATTRS[a].name}">${D.ATTRS[a].icon}</span>`).join(''); }
  function urgencyOf(p) {
    const a = attrsOf(p);
    if (p.overdue || (a.includes('cold') && !p.inCold) || (a.includes('frozen') && !p.inFrozen)) return 0;
    if (p.noDeadline) return 90;                 // 무기한 — 급할 일이 없다 (점은 초록, 정렬은 맨 뒤)
    if (p.customs > 0) return p.customs + p.deadline;
    return p.deadline;
  }
  function sortByUrgency(list) { return list.slice().sort((a, b) => urgencyOf(a) - urgencyOf(b) || b.size - a.size); }
  // noDue: 기한·초과·통관은 위의 기한 머리줄이 들고 있다. 줄에는 '위험'만 남긴다.
  function parcelStatus(p, noDue) {
    const parts = [], a = attrsOf(p);
    if (a.includes('cold')) { if (!p.inCold) parts.push(`<b style="color:var(--red)">${T('ps.warm')}</b>`); else parts.push(T('ps.cold')); }
    if (a.includes('frozen')) { if (!p.inFrozen) parts.push(`<b style="color:var(--red)">${T('ps.frozenOut')}</b>`); else parts.push(T('ps.frozen')); }
    if (a.includes('produce')) { if (p.inCold) parts.push(T('ps.produceCold')); else if (game && game.isHeatTurn() && !game.warehouse.vent) parts.push(`<b style="color:var(--orange)">${T('ps.heat')}</b>`); }
    if (p.customs > 0) { if (!noDue) { parts.push(`<b style="color:var(--blue)">${T('ps.customs', { n: p.customs, delayed: p.customsDelayed ? ` ${T('ps.delayed')}` : '' })}</b>`); parts.push(`⏳ ${T('fmt.turns', { n: p.deadline })}`); } if (p.outdoor) parts.unshift(`<b style="color:var(--orange)">${T('hud.outdoorTag')}</b>`); return parts.join(' · '); }
    if (noDue || p.noDeadline) { /* 무기한이거나, 기한은 머리줄이 들고 있다 */ }
    else if (p.overdue) { const ri = game ? game.returnIn(p) : null; parts.push(`<b style="color:var(--red)">${T('ps.overdue', { ret: ri != null ? ` · ${T('ps.returnIn', { n: ri })}` : '' })}</b>`); } else parts.push(T('ps.deadline', { n: p.deadline }));
    if (p.outdoor) parts.unshift(`<b style="color:var(--orange)">${T('hud.outdoorTag')}</b>`);
    // 어떤 계약으로도 못 싣고 직접 배송도 안 되는 택배 — 반송 말고는 길이 없으니 눈에 띄어야 한다
    if (game && game.phase === 'play' && !(p.customs > 0) && !game.contracts.some(c => c && game.canHandle(c, p) && game.breakProb(c, p) === 0) && !game.selfCan(p)) parts.unshift(`<b style="color:var(--red)">${T('ps.noCarrier')}</b>`);
    return parts.join(' · ');
  }
  function urgDot(p) { const u = urgencyOf(p); return `<span class="urg ${u <= 0 ? 'r' : u <= 1 ? 'r' : u <= 2 ? 'o' : u <= 3 ? 'y' : 'g'}"></span>`; }
  // 칸 수는 숫자보다 상자 모양이 빠르다 — 2칸이면 붙은 상자 둘, 1칸이면 하나. 색은 택배 종류.
  const CBOX_MAX = 12;
  function cellBoxes(ps) {
    let drawn = 0; const out = [];
    for (const p of ps) {
      if (drawn >= CBOX_MAX) { out.push('<b class="more">⋯</b>'); break; }
      const t = ptype(p), n = Math.min(p.size, CBOX_MAX - drawn); drawn += n;
      out.push(`<span class="cbox" title="${esc(t.name)}" aria-label="${esc(T('fmt.cells', { n: p.size }))}">${`<i style="background:${t.css}"></i>`.repeat(n)}</span>`);
    }
    return `<span class="cboxes">${out.join('')}</span>`;
  }
  // 앞머리 칸은 고객 자리다. 고객이 열리기 전에는 아예 비운다 —
  // 종류 색은 이미 상자가 들고 있어서 색 견본을 또 놓으면 갈색 옆에 갈색이다.
  const leadOn = () => !!(game && game.shows('customers'));
  function parcelRow(p, s, noDue) {
    const a = attrsOf(p);
    const cls = (p.overdue ? ' overdue' : '') + ((a.includes('cold') && !p.inCold) || (a.includes('frozen') && !p.inFrozen) ? ' rot' : '') + (s && s.sel.has(p.id) ? ' sel' : '') + (s && !s.elig.has(p.id) ? ' dis' : '') + (s && s.risk && s.risk.has(p.id) ? ' risk' : '') + (leadOn() ? '' : ' nolead') + ` value-${valueTier(p)}`;
    const cu = M.CUSTOMERS[p.customer || 'anon'];
    const lead = leadOn() ? `<div class="lead" title="${esc(cu.name)}">${cu.icon}</div>` : '';
    return `<div class="parcel${cls}" data-id="${p.id}">${lead}<div>${noDue || p.noDeadline ? '' : urgDot(p)}${valueBadge(p)}${attrIcons(a)} ${cellBoxes([p])} · ${(p.reward != null ? p.reward : game.baseReward(p.type, p.baseSize))}c${s && s.risk && s.risk.has(p.id) ? ` <b style="color:var(--orange)">${T('call.riskTag')}</b>` : ''}</div><div class="st">${parcelStatus(p, noDue)}</div></div>`;
  }
  // 재고는 "뭘 먼저 보내야 하나"로 읽힌다 — 기한이 줄 머리, 그 줄에 상자가 늘어선다.
  // 상자 테두리로 보여 줄 '위험' — 기한·초과·통관은 줄 머리가 들고 간다.
  function hazardKey(p) {
    const a = attrsOf(p), h = [];
    if (a.includes('cold') && !p.inCold) h.push('warm');
    if (a.includes('frozen') && !p.inFrozen) h.push('fout');
    if (a.includes('produce') && game && game.isHeatTurn() && !game.warehouse.vent && !p.inCold) h.push('heat');
    try { if (game && game.phase === 'play' && !(p.customs > 0) && !game.contracts.some(c => c && game.canHandle(c, p) && game.breakProb(c, p) === 0) && !game.selfCan(p)) h.push('nc'); } catch (e) { /* 계산 못 하면 위험 없음으로 둔다 */ }
    return h.join('+');
  }
  // 기한 머리줄 — 초과 · 통관 N일 · 기한 N일 · 무기한
  function bucketOf(p) {
    const dotOf = n => n <= 1 ? 'r' : n <= 2 ? 'o' : n <= 3 ? 'y' : 'g';
    if (p.customs > 0) return { key: `cu${p.customs}|${p.deadline}`, urg: p.customs + p.deadline, cls: 'cu', dot: dotOf(p.customs + p.deadline), label: `${T('ps.customs', { n: p.customs, delayed: p.customsDelayed ? ` ${T('ps.delayed')}` : '' })} · ⏳ ${T('fmt.turns', { n: p.deadline })}` };
    if (p.overdue) { const ri = game ? game.returnIn(p) : null; return { key: 'od', urg: -1, cls: 'od', dot: 'r', label: T('ps.overdue', { ret: ri != null ? ` · ${T('ps.returnIn', { n: ri })}` : '' }) }; }
    if (p.noDeadline) return { key: 'nd', urg: 90, cls: 'nd', dot: 'g', label: T('ps.noDue') };
    return { key: `d${p.deadline}`, urg: p.deadline, cls: dotOf(p.deadline), dot: dotOf(p.deadline), label: T('ps.deadline', { n: p.deadline }) };
  }

  // ── 재고 격자: 택배 하나 = 상자 하나 ──
  // 2칸이면 두 칸이 붙은 상자, 색은 종류, 테두리는 상태. 기한 줄마다 늘어선다.
  // 평소엔 누르면 상세, 차를 부른 동안엔 누르면 싣고/빼기.
  function tileIcons(p) {
    const a = attrsOf(p), cu = M.CUSTOMERS[p.customer || 'anon'];
    const list = a.map(k => D.ATTRS[k].icon);
    if (leadOn() && p.customer && p.customer !== 'anon') list.push(cu.icon);
    return list.slice(0, p.size);   // 칸마다 하나 — 넘치는 것은 상세에서
  }
  function parcelTile(p, s) {
    const t = ptype(p), a = attrsOf(p), hz = hazardKey(p);
    const rot = (a.includes('cold') && !p.inCold) || (a.includes('frozen') && !p.inFrozen);
    const cls = ['ptile', `v${valueTier(p)}`, p.overdue ? 'od' : '', rot ? 'rot' : '', hz.includes('heat') ? 'heat' : '', hz.includes('nc') ? 'nc' : '', p.outdoor ? 'out' : '',
      s && s.sel.has(p.id) ? 'sel' : '', s && !s.elig.has(p.id) ? 'dis' : '', s && s.risk && s.risk.has(p.id) ? 'risk' : ''].filter(Boolean).join(' ');
    const reward = p.reward != null ? p.reward : game.baseReward(p.type, p.baseSize);
    const tip = [t.name, T('fmt.cells', { n: p.size }), `${reward}c`].concat(a.map(k => D.ATTRS[k].name)).join(' · ');
    const ic = tileIcons(p);
    const cells = Array.from({ length: p.size }, (_, k) => `<i>${ic[k] ? `<span>${ic[k]}</span>` : ''}</i>`).join('');
    const vb = valueTier(p) ? `<b class="vb">${valueTier(p) === 3 ? '✦' : valueTier(p) === 2 ? '◆' : '▲'}</b>` : '';
    return `<button type="button" class="${cls}" data-id="${p.id}" style="--c:${t.css}" title="${esc(tip)}" aria-label="${esc(tip)}">${cells}${vb}</button>`;
  }
  function renderStock(container, parcels, s) {
    if (!parcels.length) { container.innerHTML = `<div id="empty">${T('hud.emptyWarehouse')}</div>`; return; }
    const buckets = [], byKey = new Map();
    for (const p of sortByUrgency(parcels)) {
      const b = bucketOf(p);
      let e = byKey.get(b.key);
      if (!e) { e = { b, ps: [] }; byKey.set(b.key, e); buckets.push(e); }
      e.ps.push(p);
    }
    buckets.sort((x, y) => x.b.urg - y.b.urg);
    // 전부 기한 없음(서장)이면 머리말은 아무 말도 하지 않는다
    const head = !(buckets.length === 1 && buckets[0].b.key === 'nd');
    container.innerHTML = buckets.map(({ b, ps }) => {
      // 같은 종류끼리 붙여 놓아야 색 덩어리로 읽힌다
      const tiles = ps.slice().sort((x, y) => (x.type < y.type ? -1 : x.type > y.type ? 1 : 0) || y.size - x.size).map(p => parcelTile(p, s)).join('');
      const money = ps.reduce((n, x) => n + (x.reward != null ? x.reward : game.baseReward(x.type, x.baseSize)), 0);
      return `<div class="prow ${b.cls}${head ? '' : ' nohead'}">${head ? `<div class="pl"><i class="urg ${b.dot}"></i><span>${b.label}</span></div>` : ''}<div class="pt">${tiles}</div><div class="pm">${money}c</div></div>`;
    }).join('');
  }

  // ── 차는 늘 서 있다 ──
  // 마지막으로 고른 계약의 차가 패널 위에 늘 서 있고, 창고 상자는 그 차에 실을 것을 고르는 판이다.
  // 계약 카드를 누르면 그 차로 바뀌고, 호출을 누르면 바로 실어 간다.
  // 선택은 그날·그 차 동안 유지되고, 날이 바뀌거나 차를 바꾸거나 한 번 보내면 다시 자동으로 담는다.
  let pick = null;       // { i, sel: Set<id>, extra, turn, auto }
  let lastSlot = 0;
  let lastCallCtx = null, lastCallSig = '';
  // 차는 늘 서 있어서 '팝업을 연 순간'이 없다. 대신 서 있는 차의 상태(몇 대·몇 칸·위험)가 바뀌면
  // 그때 비트를 확인한다 — 처음 두 대가 붙는 순간(l2two) 같은 대사가 탭 없이도 나온다.
  function callCtxChanged() {
    const sig = lastCallCtx ? JSON.stringify(lastCallCtx) : '';
    if (sig === lastCallSig) return; lastCallSig = sig;
    if (!lastCallCtx) return;
    // 다른 대사·배차 연출이 진행 중이면 끝날 때까지 기다렸다가 본다
    let tries = 0;
    const go = () => { if (sig !== lastCallSig || !game || game.phase !== 'play') return; if (busy || storyBusy) { if (++tries < 40) setTimeout(go, 400); return; } storyCheck(lastCallCtx); };
    setTimeout(go, 0);
  }
  // 직접 배송은 '우리 차' 한 대다 — 계약 차와 같은 자리에 서고, 같은 상자 격자에서 고른다.
  // 다만 돈이 나가는 일이라, 카드를 눌러 부른 게 아니면(배차가 떨어져 저절로 선 경우) 빈 채로 선다.
  const SELF = 'self';
  const selfOk = () => !!(game && game.shows('self') && game.selfEligible().length);
  function autoSel(i, tapped) {
    if (i === SELF) { const sel = new Set(); if (tapped) sortByUrgency(game.selfEligible()).slice(0, game.selfCount()).forEach(p => sel.add(p.id)); return sel; }
    const c = game.contracts[i], sel = new Set();
    try {
      const sorted0 = game.eligibleParcels(c).slice().sort((a, b) => urgencyOf(a) - urgencyOf(b) || (b.overdue - a.overdue));
      game.autoPick(c, sorted0, pickTrucks(game, c)).ids.forEach(id => sel.add(id));
    } catch (e) { /* 자동 선택이 안 되면 빈 채로 */ }
    return sel;
  }
  function ensurePick() {
    const g = game;
    if (!g || g.phase !== 'play') { pick = null; return null; }
    const ok = k => k === SELF ? selfOk() : !!(g.contracts[k] && g.canCall(g.contracts[k]));
    let i = pick ? pick.i : lastSlot;
    if (!ok(i)) { i = g.contracts.findIndex((c, k) => ok(k)); if (i < 0 && selfOk()) i = SELF; }
    if (i < 0) { pick = null; return null; }
    if (!pick || pick.i !== i || pick.turn !== g.turn || pick.auto) pick = { i, sel: autoSel(i, pick && pick.tapped), extra: 0, turn: g.turn, auto: false };
    const elig = new Set((i === SELF ? g.selfEligible() : g.eligibleParcels(g.contracts[i])).map(p => p.id));
    for (const id of [...pick.sel]) if (!elig.has(id)) pick.sel.delete(id);   // 그새 나간 것은 뺀다
    return pick;
  }
  function onContractTap(i) {
    if (busy || game.phase !== 'play') return;
    if (i === SELF ? !selfOk() : !game.canCall(game.contracts[i])) return;
    SFX.resume(); SFX.click();
    lastSlot = i;
    // 다른 차를 고르면 그 차에 맞게 새로 담는다. 같은 차를 다시 누르면 자동 선택으로 되돌린다.
    pick = { i, auto: true, tapped: true };
    renderAll();
    const pc = $('#parcels'); if (pc) pc.scrollTop = 0;
    if (lastCallCtx) storyCheck(lastCallCtx);
  }
  function callState() {
    if (pick.i === SELF) return { sel: pick.sel, elig: new Set(game.selfEligible().map(p => p.id)), risk: new Set() };
    const c = game.contracts[pick.i], elig = game.eligibleParcels(c);
    return { sel: pick.sel, elig: new Set(elig.map(p => p.id)), risk: new Set(elig.filter(p => game.breakProb(c, p) > 0).map(p => p.id)) };
  }
  function toggleCallPick(id) {
    if (pick.i === SELF) {
      if (!game.selfEligible().some(x => x.id === id)) { SFX.click(); showParcelDetail(id); return; }
      if (pick.sel.has(id)) { pick.sel.delete(id); SFX.cancel(); }
      else { const n = game.selfCount(); if (pick.sel.size >= n) { toast(T('wm.limit', { n })); return; } pick.sel.add(id); SFX.select(); }
      renderAll(); if (lastCallCtx) storyCheck(lastCallCtx); return;
    }
    const c = game.contracts[pick.i];
    const p = game.eligibleParcels(c).find(x => x.id === id);
    if (!p) { SFX.click(); showParcelDetail(id); return; }   // 이 차엔 못 싣는 것 — 왜 안 되는지 보여 준다
    if (pick.sel.has(id)) { pick.sel.delete(id); SFX.cancel(); }
    else {
      const vcap = game.vehicleCap(c), simul = game.simulMax(c);
      const v = [...pick.sel].reduce((s, q) => s + (game.parcels.find(x => x.id === q) || { size: 0 }).size, 0) + p.size;
      const maxCap = vcap * Math.min(simul, Math.max(1, c.calls));
      if (v > maxCap) { toast(T('call.maxSelect', { cap: maxCap })); return; }
      pick.sel.add(id); SFX.select();
    }
    renderAll();
    if (lastCallCtx) storyCheck(lastCallCtx);
  }
  // 상자: 누르면 싣기/빼기, 꾹 누르면 상세. 차가 없으면(배차가 다 떨어지면) 누르면 상세.
  function bindTile(el) {
    const id = +el.dataset.id; let timer = null, long = false;
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    el.onpointerdown = () => { long = false; clear(); timer = setTimeout(() => { long = true; timer = null; if (!busy) { SFX.click(); showParcelDetail(id); } }, 450); };
    el.onpointerup = el.onpointerleave = el.onpointercancel = clear;
    el.oncontextmenu = e => e.preventDefault();
    el.onclick = () => { clear(); if (long) { long = false; return; } if (busy) return; if (pick) return toggleCallPick(id); SFX.click(); showParcelDetail(id); };
  }
  // 우리 차(직접 배송) — 칸이 아니라 개수로 싣는다. 싣고 나면 오늘 영업은 끝이라, 보내기는 아래 버튼(직접 배송 N개)이 맡는다.
  function selfPlan() {
    const g = game, picked = [...pick.sel].map(id => g.parcels.find(x => x.id === id)).filter(Boolean);
    const cost = picked.reduce((s, p) => s + g.selfCost(p), 0), income = picked.reduce((s, p) => s + p.reward, 0);
    return { picked, cost, income, net: income - cost };
  }
  function renderSelfBar(head, foot) {
    const g = game, n = g.selfCount(), elig = g.selfEligible(), pl = selfPlan();
    const cells = Array.from({ length: n }, (_, k) => { const p = pl.picked[k]; return `<i class="truck-cell ${p ? 'filled' : ''}"${p ? ` style="background:${ptype(p).css}" title="${esc(ptype(p).name)}"` : ''}></i>`; }).join('');
    const vans = ['coldvan', 'padvan', 'bigvan'].filter(v => g.warehouse[v]).map(v => D.FACILITIES[v].name).join(', ');
    const blocked = g.parcels.filter(p => !g.selfCan(p)).length;
    head.innerHTML = `<div class="ch-top"><b>🚐 ${T('self.card')}</b><span class="caps">${vans ? `${T('wm.vans')}: ${esc(vans)}` : T('wm.noVans')}${blocked ? ` · ${T('wm.blocked', { n: blocked })}` : ''}</span></div>
      <div class="load-visual mini"><div class="truck-stack"><div class="truck-shell van"><div class="truck-cells" style="--cols:${Math.min(6, n)}">${cells}</div></div></div><div class="load-money"><span class="money-chip">${T('call.earn')}<b>+${pl.income}c</b></span><span class="money-chip cost">${T('call.cost')}<b>−${pl.cost}c</b></span><span class="money-chip net">${T('call.net')}<b>${pl.net >= 0 ? '+' : ''}${pl.net}c</b></span></div></div>
      <div class="load-hint">${pl.picked.length}/${n} · ${T('wm.selfHead2', { size: g.selfSizeMax(), base: D.SELF_DELIVERY.costBase, per: D.SELF_DELIVERY.costPerSize })} · ${T('self.hintWait')}</div>`;
    foot.innerHTML = `<button class="btn small" id="pick-urgent">${T('call.pickUrgent')}</button><button class="btn small" id="pick-clear">${T('call.pickClear')}</button><span class="sp"></span>`;
    head.hidden = foot.hidden = false;
    foot.querySelector('#pick-urgent').onclick = () => { pick.sel.clear(); sortByUrgency(elig).slice(0, n).forEach(p => pick.sel.add(p.id)); SFX.select(); renderAll(); };
    foot.querySelector('#pick-clear').onclick = () => { pick.sel.clear(); SFX.cancel(); renderAll(); };
    lastCallCtx = { kind: 'modal', modal: 'wait', self: true, picked: pl.picked.length, elig: elig.length, outdoor: g.outdoorVolume() };
    callCtxChanged();
  }
  function renderCallBar() {
    const head = $('#call-head'), foot = $('#call-foot');
    if (!pick) { head.hidden = foot.hidden = true; head.innerHTML = foot.innerHTML = ''; lastCallCtx = null; return; }
    if (pick.i === SELF) return renderSelfBar(head, foot);
    const cm = pick, i = cm.i, c = game.contracts[i];
    const car = D.CARRIERS[c.carrier], vcap = game.vehicleCap(c), simul = game.simulMax(c), fee = game.truckFee(c);
    const elig = game.eligibleParcels(c);
    const selP = [...cm.sel].map(id => game.parcels.find(p => p.id === id)).filter(Boolean);
    const vol = selP.reduce((s, p) => s + p.size, 0);
    const need = vol ? game.trucksNeeded(c, vol) : 1;
    const trucks = Math.min(Math.max(need, 1 + cm.extra), Math.min(simul, Math.max(1, c.calls + (c.calls === 0 ? 1 : 0))));
    const cap = vcap * trucks, callFee = game.callFee(c, trucks), baseIncome = selP.reduce((s, p) => s + game.previewReward(c, p), 0);
    const fill = vol / cap;
    const chain = game.chainPreview(fill), chainIncome = Math.round(baseIncome * chain.mult);
    const rush = game.rushPreview(vol, trucks, fill), income = rush ? Math.round(chainIncome * D.RUSH.bonus) : chainIncome;
    const cargoCells = []; for (const p of selP) for (let n = 0; n < p.size; n++) cargoCells.push({ color: ptype(p).css, name: ptype(p).name });
    const shells = Array.from({ length: trucks }, (_, ti) => { const cells = Array.from({ length: vcap }, (_, ci) => { const cargo = cargoCells[ti * vcap + ci]; return `<i class="truck-cell ${cargo ? 'filled' : ''}"${cargo ? ` style="background:${cargo.color}" title="${esc(cargo.name)}"` : ''}></i>`; }).join(''); return `<div class="truck-shell"><div class="truck-cells" style="--cols:${Math.min(6, vcap)}">${cells}</div></div>`; }).join('');
    const ko = I18n.lang === 'ko', net = income - callFee;
    const tbtn = `${trucks < Math.min(simul, c.calls) ? `<button class="btn small" id="truck-add">${T('call.addTruck', { fee })}</button>` : ''}${trucks > need && trucks > 1 ? `<button class="btn small" id="truck-del">${T('call.removeTruck')}</button>` : ''}`;
    const gauge = `<div class="load-visual mini"><div class="truck-stack">${shells}</div><div class="load-money"><span class="money-chip">${ko ? '수익' : 'EARN'}<b>+${income}c</b></span><span class="money-chip cost">${ko ? '비용' : 'COST'}<b>−${callFee}c</b></span><span class="money-chip net">${ko ? '순수익' : 'NET'}<b>${net >= 0 ? '+' : ''}${net}c</b></span></div></div>`;
    const hint = `<div class="load-hint">${vol}/${cap} · ${Math.round(fill * 100)}%${fill >= 0.8 && game.shows('chain') ? ' ⚡' : ''} · ${T('call.tapBoxes')}${tbtn ? ` <span class="tbtn">${tbtn}</span>` : ''}</div>`;
    const money = `${chain.count >= 2 && game.shows('chain') ? `<div class="chain-preview">⚡ ${T('chain.preview', { n: chain.count, mult: chain.mult.toFixed(2), bonus: chainIncome - baseIncome })}</div>` : ''}${rush && game.shows('rush') ? `<div class="rush-preview">🔥 ${T('rush.preview', { mult: D.RUSH.bonus, bonus: income - chainIncome })}</div>` : ''}`;
    const riskSel = selP.filter(p => game.breakProb(c, p) > 0);
    const riskLine = riskSel.length ? `<div class="riskline">${T('call.riskLine', { n: riskSel.length, pct: Math.round(game.breakProb(c, riskSel[0]) * 100), loss: Math.round(riskSel.reduce((s, p) => s + game.breakProb(c, p) * game.baseReward(p.type, p.baseSize), 0)) })}</div>` : '';
    const caps = !game.shows('attrs') ? '' : `<span class="caps">${T('call.caps')} ${game.contractCaps(c).length ? attrIcons(game.contractCaps(c)) : T('common.none')} · ${T('call.size', { min: car.sizeMin, max: game.contractSizeMax(c) })}${car.delay ? ` · ${T('call.payLater', { n: Math.max(0, car.delay - (game.trustLevel(c) >= 3 ? 1 : 0)) })}` : ''}</span>`;
    let trust = '';
    if (game.shows('trust')) { const tg = game.trustGainPreview(c, vol, trucks), nx = game.trustNext(c.carrier); trust = `<div class="trustline">${trustBar(game, c.carrier)} ${T('call.xpGain', { xp: tg.xp, parts: tg.parts.join(', ') })}${nx ? ` · ${T('call.nextLevel')}: ${esc(nx.effect)}` : ''}${game.trustLevel(c.carrier) >= 1 ? ` · ${esc(D.trustEffectText(c.carrier, game.trustLevel(c.carrier)))}` : ''}</div>`; }
    head.innerHTML = `<div class="ch-top"><b>${car.badge || '🚚'} ${esc(game.contractName(c))}</b>${caps}</div>${gauge}${hint}${money}${riskLine}${trust}`;
    foot.innerHTML = `<button class="btn small" id="pick-urgent">${T('call.pickUrgent')}</button><button class="btn small" id="pick-clear">${T('call.pickClear')}</button><span class="sp"></span><button class="btn primary${vol && vol >= cap ? ' full' : ''}" id="call-go"${cm.sel.size ? '' : ' disabled'}>${T('call.btn')}</button>`;
    head.hidden = foot.hidden = false;
    const ta = head.querySelector('#truck-add'); if (ta) ta.onclick = () => { cm.extra = trucks; SFX.select(); renderAll(); };
    const td = head.querySelector('#truck-del'); if (td) td.onclick = () => { cm.extra = Math.max(0, trucks - 2); SFX.cancel(); renderAll(); };
    foot.querySelector('#pick-urgent').onclick = () => {
      cm.sel.clear();
      const sorted = elig.slice().sort((a, b) => urgencyOf(a) - urgencyOf(b) || (b.overdue - a.overdue));
      game.autoPick(c, sorted, pickTrucks(game, c)).ids.forEach(id => cm.sel.add(id));
      SFX.select(); renderAll();
    };
    foot.querySelector('#pick-clear').onclick = () => { cm.sel.clear(); SFX.cancel(); renderAll(); };
    foot.querySelector('#call-go').onclick = () => { if (!cm.sel.size || busy) return; SFX.click(); const ids = [...cm.sel]; cm.auto = true; doCall(i, ids, trucks); };
    lastCallCtx = { kind: 'modal', modal: 'call', sel: cm.sel.size, elig: elig.length, slot: i, trucks, vol, risk: riskSel.length };
    callCtxChanged();
  }

  let pendingCall = null; // 방금 호출 결과 — afterTurn 에서 스토리 비트(첫 호출 등)에 넘긴다
  function doCall(i, ids, trucks) {
    const contract = game.contracts[i], vehicleCap = game.vehicleCap(contract), sizes = new Map(game.parcels.map(p => [p.id, p.size]));
    const loads = Array.from({ length: trucks }, () => []); let loadIndex = 0, loadVolume = 0;
    for (const id of ids) {
      const size = sizes.get(id) || 1;
      if (loadVolume + size > vehicleCap && loadIndex < trucks - 1) { loadIndex++; loadVolume = 0; }
      loads[loadIndex].push(id); loadVolume += size;
    }
    const r = game.callCarrier(i, ids, trucks);
    if (!r.ok) { toast(r.msg); return; }
    pendingCall = r;
    const showChain = game.shows('chain');       // 서장에는 연속 만차가 없다 — 축하도 하지 않는다
    if (r.chain === 1 && showChain) {
      SFX.select(); toastLater(T('chain.start'), 1800); rewardBurst(T('chain.perfect'), 1);
    }
    if (r.chain >= 2 && showChain) {
      document.body.classList.remove('chain-hit'); void document.body.offsetWidth; document.body.classList.add('chain-hit');
      SFX.combo(r.chain);
      toastLater(T(r.chain >= D.LOAD_CHAIN.max ? 'chain.toastMax' : 'chain.toast', { n: r.chain, bonus: r.chainBonus }), 2200);
      rewardBurst(T(r.chain >= D.LOAD_CHAIN.max ? 'chain.max' : 'chain.count', { n: r.chain }), Math.min(3, r.chain));
      setTimeout(() => document.body.classList.remove('chain-hit'), 700);
    }
    if (r.rush && game.shows('rush')) {
      document.body.classList.add('rush-hit');
      scene.shake(.38); SFX.levelup();
      toast(T('rush.toast', { n: r.count, bonus: r.rushBonus }), 2800);
      setTimeout(() => document.body.classList.remove('rush-hit'), 900);
    }
    busy = true; renderAll();
    const events = game.takeEvents();
    const delivered = events.filter(e => e.type === 'deliver').map(e => e.parcel.id);
    const topValue = events.filter(e => e.type === 'deliver').reduce((m, e) => Math.max(m, valueTier(e.parcel)), 0);
    let broke = false;
    for (const e of events) if (e.type === 'broken') { broke = true; scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.broken', { short: D.PARCEL_TYPES[e.parcel.type].short }), true, 30); }
    if (broke) scene.mope(); else if (r.chain >= 2 || r.rush || topValue >= 2) scene.cheer(Math.max(r.chain || 0, r.rush ? 3 : 0, topValue));
    scene.deliver(delivered, () => {
      if (delivered.length) { SFX.coin(delivered.length); floatText(r.rush ? T('rush.float', { n: r.revenue }) : r.delay ? T('float.delayed', { n: r.revenue, delay: r.delay }) : `+${r.revenue}c`, false, 70); }
      if (topValue >= 2) setTimeout(() => { rewardBurst(T('value.delivered.' + topValue), topValue); SFX.combo(topValue + 1); }, 180);
      if (r.fee) setTimeout(() => floatText(T('call.fee', { fee: r.fee }), true, 30), 250);
      announceCustomers(events);
      afterTurn(events);
    }, { trucks, loads, onTruck: () => SFX.truck() });
    saveGame();
  }
  function announceCustomers(events) { let claim = 0; for (const e of events) { if (e.type === 'claim') claim += e.amount; if (e.type === 'custLevel') toastLater(`${M.CUSTOMERS[e.customer].icon} ${T('log.custLevel', { name: M.CUSTOMERS[e.customer].name, level: e.level })}`, 2200); if (e.type === 'custSuspend') toastLater(`${M.CUSTOMERS[e.customer].icon} ${T('toast.custSuspend', { name: M.CUSTOMERS[e.customer].name })}`, 2600); } if (claim) setTimeout(() => floatText(T('float.claim', { n: claim }), true, 50), 350); }
  function announceTrust(events) { if (game && !game.shows('trust')) return; for (const e of events) if (e.type === 'trustup') toastLater(T('toast.trustUp', { name: D.CARRIERS[e.carrier].name, level: e.level, effect: D.trustEffectText(e.carrier, e.level) }), 2400); }
  function doWait(selfIds) {
    if (busy || game.phase !== 'play') return;
    SFX.resume();
    // 마감 팝업은 없다. 우리 차(직접 배송)에 실어 둔 게 있으면 그걸 나르고 마감한다.
    // 팝업이 알려 주던 경고(반송·부패 임박)는 토스트로 남긴다.
    if (!selfIds) {
      const ids = pick && pick.i === SELF ? [...pick.sel] : [];
      const f = game.forecast(), w = [];
      if (f.overdue) w.push(T('wm.overdue', { n: f.overdue }));
      if (f.spoil) w.push(T('wm.spoil', { n: f.spoil }));
      if (w.length && !ids.length) toast(T('wm.ifWait') + ': ' + w.join(' · '), 2600);
      if (pick) pick.auto = true;
      doWait(ids); return;
    }
    const r = game.wait(selfIds);
    if (r && r.ok === false) { toast(r.msg); return; }
    busy = true; renderAll();
    const events = game.takeEvents();
    saveGame();
    if (selfIds.length && r && r.ids) { SFX.select(); const rev = r.revenue, cost = r.cost; scene.selfDeliver(r.ids, () => { SFX.coin(r.ids.length); floatText(T('float.self', { rev, cost }), false, 70); afterTurn(events); }); }
    else { SFX.wait(); setTimeout(() => afterTurn(events), 250); }
  }
  function afterTurn(events) {
    for (const e of events) if (e.type === 'discard') { scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.discard', { why: I18n.text(e.why) }), true, 30); }
    for (const e of events) if (e.type === 'paid') { SFX.coin(e.count); floatText(T('float.paid', { name: e.name, n: e.amount }), false, 70); }
    for (const e of events) if (e.type === 'missionUp') { SFX.levelup(); scene.cheer(e.grade === 'A' ? 3 : e.grade === 'B' ? 2 : 1); rewardBurst(T('mission.up', { grade: e.grade, bonus: e.bonus }), e.grade === 'A' ? 3 : e.grade === 'B' ? 2 : 1); toastLater(T('mission.toast', { grade: e.grade, bonus: e.bonus }), 2300); }
    announceCustomers(events);
    for (const e of events) { if (e.type === 'storageEnd') { SFX.coin(1); floatText(T('float.storageEnd', { pay: e.pay ? `+${e.pay}c` : '' }), false, 70); } if (e.type === 'storageStolen') { SFX.discard(); floatText(T('float.storageStolen', { n: e.amount }), true, 30); } if (e.type === 'offer') toastLater(`${M.CUSTOMERS[e.offer.customer].icon} ${T('toast.offer')}`, 2000); }
    for (const e of events) if (e.type === 'returned') { scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.returned', { short: D.PARCEL_TYPES[e.parcel.type].short }), true, 30); }
    for (const e of events) if (e.type === 'stolen') { scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.stolen', { short: D.PARCEL_TYPES[e.parcel.type].short, size: e.parcel.size }), true, 30); }
    const pen = events.find(e => e.type === 'penalty');
    if (pen) { scene.shake(); scene.mope(); SFX.penalty(); floatText(T('float.rep', { n: pen.amount }), true, 50); toast(pen.reasons.map(I18n.text).join(' · '), 2600); }
    setTimeout(() => {
      scene.sync(game, { animate: true });
      if (events.some(e => e.type === 'arrive')) SFX.thud();
      busy = false; renderAll(); saveGame();
      announceTrust(events);
      if (game.phase === 'play' || game.phase === 'summary') announce(Profile.evaluate(game, null));
      checkPhase();
      const call = pendingCall; pendingCall = null;
      if (game.phase === 'play') storyCheck(call ? { kind: 'call', result: call, events } : { kind: 'turn', events });
    }, pen ? 500 : 150);
  }
  function checkPhase() {
    if (game.phase !== 'play') clearGate();
    if (game.phase === 'weekend') {
      // 고를 것이 '휴식' 하나뿐이면 카드를 띄울 이유가 없다 — 읽을 것만 늘고 누를 것은 하나다.
      // 선택지가 열리는 장(5장)부터 카드가 돌아온다.
      const only = game.weekendChoices().filter(o => o.ok);
      if (only.length <= 1 && (!only[0] || only[0].id === 'rest')) {
        game.weekendChoose('rest');
        busy = true; renderAll();
        const evs = game.takeEvents(); saveGame();
        setTimeout(() => afterTurn(evs), 200);
      } else showWeekend();
    }
    else if (game.phase === 'summary') showSummary();
    else if (game.phase === 'market') showMarket();
    else if (game.phase === 'over' || game.phase === 'win') showResult();
  }

  // ---------- 주말 ----------
  // 턴이 아니다: 차를 부를 수 없고 기한도 멈춘다. 마당에 둔 것만 이틀 더 위험하다
  function showWeekend() {
    const g = game, w = g.weekend;
    if (!w) return;
    const out = g.outdoorVolume(), pct = Math.round(g.theftProb() * 100);
    const opts = g.weekendChoices();
    const rows = opts.map(o => `<button class="btn wkc" data-id="${o.id}" ${o.ok ? '' : 'disabled'}><b>${esc(T('wk.' + o.id))}</b><small>${esc(T('wk.' + o.id + '.d', { cost: o.cost }))}</small></button>`).join('');
    const body = `<div class="d">${T('wk.sub')}</div>
      <div class="pickinfo"><span>${out > 0 ? T('wk.outdoor', { vol: out, pct }) : T('wk.safe')}</span></div>
      <div class="wkopts">${rows}</div>`;
    const m = modal(T('wk.title'), body, null, T('wk.head', { cal: g.calMonth(), d: w.date }));
    storyCheck({ kind: 'weekend' });
    m.querySelectorAll('.wkc').forEach(btn => btn.onclick = () => {
      if (busy) return;
      SFX.resume(); SFX.click();
      const r = g.weekendChoose(btn.dataset.id);
      if (r && r.ok === false) return toast(r.msg);
      closeModal();
      busy = true; renderAll();
      const events = g.takeEvents();
      saveGame();
      setTimeout(() => afterTurn(events), 250);
    });
  }

  // ---------- summary ----------
  function showSummary() {
    const s = game.summary, R = game.rules;
    if (R.endless || game.month < R.months) BGM.stinger('fanfare', 0.9); // 마지막 달은 결과 화면의 팡파레 하나만
    // 정산 화면이 답해야 하는 질문은 하나다: 이번 달 흑자야 적자야, 얼마야.
    // 그동안은 +2395 / -477 / -522 / -42 를 늘어놓고 덧셈은 플레이어에게 맡겼다.
    const net = s.net != null ? s.net : 0;
    const inst = game.month >= R.months ? instalmentDue(game) : 0;   // 장이 끝나는 정산이면 한 사장에게 낼 잔금 회차도 같이
    const head = `<div class="sumnet ${net >= 0 ? 'good' : 'bad'}"><span class="lbl">${T('sum.net')}</span><span class="amt">${net >= 0 ? '+' : ''}${net}c</span>
      <span class="flow">${T('sum.netFlow', { from: s.cashStart != null ? s.cashStart : s.cash, to: s.cash })}${R.winCash ? ` · ${T('sum.goal', { n: R.winCash })}` : ''}</span></div>`;
    const sec = k => `<div class="sumsec">${T('sum.sec' + k)}</div>`;
    const income = `${sec('Income')}<div class="kv">
      <span>${T('sum.revenue')}</span><span class="v good">+${s.revenue}</span>
      ${s.storageIncome ? `<span>${T('sum.storageIncome')}</span><span class="v good">+${s.storageIncome}</span>` : ''}
      ${s.closing ? `<span>${T('sum.closing')}</span><span class="v good">+${s.closing}</span>` : ''}
      ${s.loan && s.loan.borrowed ? `<span>${T('sum.loan')}</span><span class="v" style="color:var(--orange)">+${s.loan.borrowed}</span><span class="sub" style="grid-column:1/-1;white-space:normal;color:var(--orange)">${T('sum.loanNote', { debt: s.loan.debt, interest: Math.ceil(s.loan.debt * D.LOAN.interest), limit: D.LOAN.limit })}</span>` : ''}</div>`;
    const cost = `${sec('Cost')}<div class="kv">
      <span>${T('sum.opCost')}</span><span class="v bad">-${s.opCost}</span>
      ${s.opCostDetail ? `<span class="sub" style="grid-column:1/-1;font-size:11px;color:var(--dim);margin-top:-4px">${T('sum.opCostDetail', s.opCostDetail)}</span>` : ''}
      <span>${T('sum.fees')}</span><span class="v ${s.fees ? 'bad' : ''}">-${s.fees || 0}</span>
      ${s.selfCost ? `<span>${T('sum.selfCost')}</span><span class="v bad">-${s.selfCost}</span>` : ''}
      ${game.insurer !== 'none' ? `<span>${T('sum.premium', { name: esc(M.INSURERS[game.insurer].name) })}</span><span class="v ${s.premium ? 'bad' : ''}">-${s.premium || 0}</span><span class="sub" style="grid-column:1/-1;white-space:normal">${T('sum.claimsNext', { n: s.insClaims || 0, next: s.nextPremium })}${s.noClaimBonus ? ` · ${T('sum.noClaimBonus')}` : ''}</span>` : ''}
      ${s.loan && s.loan.repaid ? `<span>${T('sum.loanRepaid')}</span><span class="v bad">-${s.loan.repaid + s.loan.interest} <small>${T('sum.loanInterest', { n: s.loan.interest })}</small></span>` : ''}${inst ? `<span>${T('sum.instalment')}</span><span class="v bad">-${inst} <small>${T('sum.instalmentNote', { left: s.cash - inst })}</small></span>` : ''}</div>`;
    // 사고가 하나도 없으면 0 네 줄을 늘어놓지 않는다 — 좋은 소식은 한 줄이면 된다
    const bad = (s.penalty || 0) + (s.returned || 0) + (s.stolen || 0) + (s.broken || 0) + (s.claims || 0) + (s.discarded || 0);
    const incident = bad === 0 ? `${sec('Incident')}<div class="d" style="color:var(--green)">${T('sum.noIncident')}</div>` : `${sec('Incident')}<div class="kv">
      ${s.penalty ? `<span>${T('sum.penalty')}</span><span class="v bad">+${s.penalty}</span>` : ''}
      ${s.returned || s.stolen || s.broken ? `<span>${T('sum.rsb')}</span><span class="v bad">${s.returned || 0} / ${s.stolen || 0} / ${s.broken || 0}</span>` : ''}
      ${s.claims ? `<span>${T('sum.claims')}</span><span class="v bad">-${s.claims}${s.covered ? ` <small style="color:var(--green)">${T('sum.covered', { n: s.covered })}</small>` : ''}</span>` : ''}
      ${s.discarded ? `<span>${T('sum.discarded')}</span><span class="v bad">${T('fmt.count', { n: s.discarded })}${R.winMaxDiscard != null ? ` ${T('sum.runDiscard', { n: game.run.discarded, max: R.winMaxDiscard })}` : ''}</span>` : ''}</div>`;
    const state = `${sec('State')}<div class="kv">
      <span>${T('sum.callsWaits')}</span><span class="v">${T('fmt.calls', { n: s.calls })} / ${T('fmt.calls', { n: s.waits })}</span>
      <span>${T('sum.delivered')}</span><span class="v">${T('fmt.count', { n: s.delivered })}</span>
      ${!game.shows('rep') ? '' : `<span>${T('sum.rep')}</span><span class="v ${s.rep <= s.repCap * 0.45 ? 'bad' : ''}">${s.rep}/${s.repCap} <small>${esc(T('rep.tier.' + s.repTier))}${s.repDelta ? ` · ${s.repDelta > 0 ? '+' : ''}${s.repDelta}` : ''}${!s.repTierUp && game.repToNext() ? `<br>${T('sum.repToNext', { n: game.repToNext() })}` : ''}</small>${s.repTierUp ? `<br><small style="color:var(--gold)">${T('sum.repTierUp')}</small>` : ''}</span>`}
      <span>${T('sum.usage')}</span><span class="v">${T('sum.usageVal', { pct: s.usage, n: s.left })}</span>
      ${s.overdueVol ? `<span>${T('sum.overdueVol')}</span><span class="v bad">${T('fmt.cells', { n: s.overdueVol })}</span>` : ''}
      ${bad === 0 && R.winMaxDiscard != null ? `<span>${T('sum.discarded')}</span><span class="v">${T('sum.runDiscard', { n: game.run.discarded, max: R.winMaxDiscard })}</span>` : ''}
      ${R.winDelivered ? `<span>${T('sum.deliverGoal')}</span><span class="v">${game.run.delivered}/${T('fmt.count', { n: R.winDelivered })}</span>` : ''}
      ${R.winStorage ? `<span>${T('sum.storageGoal')}</span><span class="v">${game.stats.storageDone}/${T('fmt.cases', { n: R.winStorage })}</span>` : ''}
      ${R.winBigCustomer && game.bigCustomer ? `<span>${T('sum.bigCustomer')}</span><span class="v">${M.CUSTOMERS[game.bigCustomer].icon} ${esc(M.CUSTOMERS[game.bigCustomer].name)} ${T('common.trust')} ${game.customerLevel(game.bigCustomer)}/3</span>` : ''}</div>`;
    const custs = s.customers && game.shows('customers') ? `${sec('Cust')}` + s.customers.map(c => `<div style="font-size:12px">${M.CUSTOMERS[c.id].icon} ${esc(M.CUSTOMERS[c.id].name)} — ${T('fmt.count', { n: c.month.delivered })} · +${c.month.revenue}c${c.month.claims ? ` · <span style="color:var(--red)">${T('sum.custClaim', { n: c.month.claims })}</span>` : ''}${c.id !== 'anon' ? ` · ${T('common.trust')} ${c.month.lvStart}→${c.level}${c.suspended ? ` (${T('cust.suspended')})` : ''}` : ''}</div>`).join('') : '';
    const body = head + income + cost + incident + state + custs;
    const last = !R.endless && game.month >= R.months;
    modal(T('sum.title', { n: game.cycleLabel(s.month) }), body, [{ label: last ? T('sum.final') : game.shows('market') ? T('sum.toMarket') : T('sum.toNext', { n: game.cycleLabel(s.month + 1) }), cls: 'primary', onClick: () => {
      closeModal(); game.closeSummary(); game.takeEvents(); saveGame();
      // 마켓이 없는 런(레벨 1)은 정산 다음이 바로 다음 사이클 — 마켓 화면이 대신 해 주던 갱신을 여기서 한다
      if (game.phase === 'play') { scene.sync(game, { animate: true }); renderAll(); }
      checkPhase();
      if (game.phase === 'play') { storyCheck({ kind: 'turn' }); showSms(); }
    } }]);
    storyCheck({ kind: 'summary' });
  }

  // ---------- market ----------
  let fcOpen = false;   // 마켓의 다음 달 예상 물량 내역 펼침 여부
  function showMarket() {
    const mk = game.market, R = game.rules;
    BGM.play('market');
    const render = () => {
      const cards = mk.items.map((it, i) => {
        if (it.kind === 'refill') return ''; // 충전은 위 '현재 계약' 칸에서
        let price = it.kind === 'contract' ? game.contractPrice(it) : it.price, desc = '';
        if (it.kind === 'contract') { const o = offerSpec(it); const nw = newlyHandles(it); desc = `${it.hint ? `<span style="color:var(--green)">✔ ${esc(it.hint)}</span><br>` : ''}${nw ? `<span style="color:var(--gold)">${T('mk.newlyHandles', { list: nw })}</span><br>` : ''}${T('mk.capLine', { vehicle: esc(o.vehicle), cap: o.cap, trucks: o.trucks, total: o.total, fee: o.fee, per: o.per })}<br>${game.shows('attrs') ? `${o.badge}${o.caps} · ${T('call.size', { min: o.sizeMin, max: o.sizeMax })}` : ''}${o.delay ? ` · ${T('call.payLater', { n: o.delay })}` : ''}`; }
        else if (it.kind === 'enh') desc = D.ENHANCEMENTS[it.enh].desc;
        else if (it.kind === 'item') desc = M.INS_ITEMS[it.item].icon + ' ' + M.INS_ITEMS[it.item].desc + ' ' + T('mk.oneTime');
        else if (it.kind === 'customer') { const cu = M.CUSTOMERS[it.customer]; desc = `${cu.icon} ${cu.items ? Object.keys(cu.items).map(k => { const ci = M.CUSTOMER_ITEMS[k]; return D.PARCEL_TYPES[ci ? ci.type : k].short + ' ' + cu.items[k] + '%'; }).join(' · ') : esc(cu.desc || '')} · ${T('mk.claimMult', { n: cu.claimMult })}${cu.rule ? `<br><span style="color:var(--gold)">${esc(cu.rule.text)}</span>` : ''}<br>${T('mk.custStart', { n: game.customerCount(), max: M.CUSTOMER_SLOTS })}`; }
        else if (it.kind === 'fac') { const F = it.fac && D.FACILITIES[it.fac]; let prev = ''; if (F) { if (F.cap) prev = `${T('common.warehouse')} ${game.warehouse.cap} → ${game.warehouse.cap + Math.round(F.cap * R.facilityCapMult)}`; else if (F.cold) prev = `${D.ATTRS.cold.name} ${game.warehouse.cold} → ${Math.min(R.coldCapMax == null ? 99 : R.coldCapMax, game.warehouse.cold + F.cold)}`; else if (F.xl) prev = `${T('common.xl')} ${game.warehouse.xl} → ${game.warehouse.xl + F.xl}`; else if (F.frozen) prev = `${D.ATTRS.frozen.name} ${game.warehouse.frozen || 0} → ${(game.warehouse.frozen || 0) + F.frozen}`; } desc = F ? F.desc + (prev ? `<br><span style="color:var(--green)">${T('mk.afterBuy')} ${prev}</span>` : '') : T('mk.allFacilities'); }
        return `<div class="card ${it.sold ? 'sold' : ''}" id="mk-card-${Story.mkKey(it)}" data-i="${i}"><div class="t"><span>${esc(it.name)}${gradeBadge(it.grade)}</span><span class="price">${it.sold ? T('mk.sold') : price + 'c'}</span></div><div class="d">${desc}</div>${it.kind === 'contract' && !it.sold ? `<div class="ob"><button class="btn small" data-offer="${i}">${T('mk.detail')}</button></div>` : ''}</div>`;
      });
      // 종류별로 묶어 준다 — 12장이 한 줄로 늘어서면 뭘 비교하는지 알 수 없다
      const ORDER = ['contract', 'enh', 'fac', 'customer', 'item'];
      const items = ORDER.map(k => { const rows = mk.items.map((it, i) => it.kind === k ? cards[i] : '').filter(Boolean); return rows.length ? `<div class="mkhead">${T('kind.' + k)}</div>` + rows.join('') : ''; }).join('');
      // 현재 계약: 맨 위. 카드마다 상세 버튼 + 배차 충전 버튼(정액·남은 배차는 버려짐)
      const contracts = `<div id="mk-contracts"><div style="font-size:12px;color:var(--gold);margin:4px 0">${T('mk.currentContracts', { keep: R.keepCalls ? T('mk.keepCalls', { n: R.keepCalls }) : '' })}</div>` + game.contracts.slice(0, game.visibleSlots()).map((c, si) => {
        if (!c) return `<div class="card dis" style="cursor:default"><div class="t">${T('my.slot', { n: si + 1 })} · ${T('err.emptySlot')}</div><div class="d">${T('slot.emptyHint')}</div></div>`;
        const ri = mk.items.findIndex(it => it.kind === 'refill' && it.contractId === c.id && !it.sold), rit = ri >= 0 ? mk.items[ri] : null;
        return `<div class="card" style="cursor:default"><div class="t"><span>${esc(game.contractName(c))}${gradeBadge(c.grade)}</span><span class="price ${c.calls === 0 ? 'bad' : ''}">${T('my.remain', { calls: c.calls, max: c.maxCalls })}</span></div>
          <div class="crow"><span class="d">${miniTruck(game, c)}${takesDots(game, c, true)}${trustBar(game, c.carrier) ? ` ${trustBar(game, c.carrier)}` : ''}</span><span class="ob"><button class="btn small" data-detail="${si}">${T('mk.detail')}</button>${rit ? `<button class="btn small ${c.calls === 0 ? 'gold' : ''}" id="mk-refill-${si}" data-refill="${ri}" ${game.cash < rit.price ? 'disabled' : ''}>${T('mk.refillBtn', { price: rit.price })}</button>` : ''}</span></div></div>`;
      }).join('') + '</div><hr>';
      const rc = game.refreshCost();
      const wh = game.warehouse, used = game.usedVolume(), outd = game.outdoorVolume();
      // 안 열린 것은 줄에서 뺀다 — 냉장 0/0 · 초대형 0/0 · 보험 · 고객은 그 장에 존재하지 않는 것들이다
      const whLine = `<div class="pickinfo whinfo"><span>${T('common.warehouse')} <b class="${used > wh.cap ? 'bad' : ''}">${used}/${wh.cap}</b></span>${game.shows('cold') ? `<span>${D.ATTRS.cold.name} <b>${game.coldUsed()}/${wh.cold}</b></span>` : ''}${game.shows('frozen') && (wh.frozen || game.frozenUsed()) ? `<span>${D.ATTRS.frozen.name} <b>${game.frozenUsed()}/${wh.frozen || 0}</b></span>` : ''}${game.shows('bigsize') ? `<span>${T('common.xl')} <b>${game.parcels.filter(p => p.baseSize >= 7).length}/${wh.xl}</b></span>` : ''}${outd ? `<span class="bad">${T('hud.outdoorTag')} ${T('fmt.cells', { n: outd })}</span>` : ''}${game.shows('insurance') ? `<button class="btn small" id="mk-ins">${T('kind.item')}</button>` : ''}${game.shows('customers') ? `<button class="btn small" id="mk-cust">${T('kind.customer')}</button>` : ''}</div>`;
      const up = mk.prep ? game.upcoming() : [];
      const prepLine = mk.prep ? `<div class="d" style="font-size:12px;color:var(--gold);margin-bottom:4px">${T('mk.prepNote')} ${T('hud.upcoming')}: ${up.filter(u => u.specs).map(u => `${T('fmt.turnN', { n: u.turn })} ${u.specs.map(s => `<i class="sw" style="display:inline-block;width:8px;height:8px;background:${D.PARCEL_TYPES[s.type].css}"></i>${D.PARCEL_TYPES[s.type].short}${s.size}`).join(' ')}`).join(' · ')} · ${T('weather.title')} ${up.filter(u => u.weather).map(u => M.WEATHER[u.weather].icon).join('')}</div>` : '';
      // 못 받는 종류는 그 줄에서 바로 붉게 — 요약 경고만 있으면 '무엇이' 문제인지 눈으로 못 찾는다.
      // 대본 런은 예상이 정확해서 min===max 라 범위 표기가 어색하다 → 한 숫자로, 0개인 종류는 아예 빼고
      const rng = r => r[0] === r[1] ? `${r[0]}` : `${r[0]}~${r[1]}`;
      const fcRows = game.customerForecast().map(f => { const cu = M.CUSTOMERS[f.id];
        const parts = ['normal', ...(f.special > 0 ? f.types : [])].filter(t => f.range[t] && f.range[t][1] > 0).map(t => {
          const bad = !game.canTakeType(t);
          return `<span class="${bad ? 'fcwarn' : ''}"${bad ? ` title="${esc(T('mk.cantTake'))}"` : ''}><i style="display:inline-block;width:7px;height:7px;background:${D.PARCEL_TYPES[t].css}"></i>${D.PARCEL_TYPES[t].short} ${rng(f.range[t])}${bad ? ' ✖' : ''}</span>`;
        });
        return `<span class="fc">${cu.icon} ${esc(cu.name)} <b>${rng([f.min, f.max])}</b> <small>${parts.join(' · ')}</small></span>`; }).join('');
      const nm = mk.prep ? game.month : game.month + 1, cal = game.calMonth(nm);
      const seasonLine = nm <= game.monthsTotal() && game.shows('attrs') ? `<div class="d" style="color:var(--dim)">${T(mk.prep ? 'mk.seasonLineNow' : 'mk.seasonLine', { cal, season: T('season.' + game.season(nm)), note: T(`cal.${game.rules.calendar}.${cal}.note`) })}</div>` : '';
      const fcAll = game.customerForecast();
      const fcTot = fcAll.reduce((a, f) => ({ min: a.min + f.min, max: a.max + f.max }), { min: 0, max: 0 });
      // 예상 물량 중 지금 계약으로 못 받는 종류 — 마켓이 그걸 사라고 말해 주는 자리다
      const fcBlk = game.forecastBlocked(nm);
      const fcWarn = fcBlk.length ? `<div class="d fcwarn" id="mk-fcwarn">${T('mk.forecastBlocked', { list: fcBlk.map(t => D.PARCEL_TYPES[t].short).join(' · ') })}</div>` : '';
      const fcLine = `<div class="d"><a class="hl" id="mk-fctoggle">${T(mk.prep ? 'mk.forecastSumNow' : 'mk.forecastSum', { m: game.cycleLabel(nm), min: fcTot.min, max: fcTot.max })} ${fcOpen ? '▴' : '▾'}</a></div>${fcOpen ? `<div class="d fcline" id="mk-fc">${fcRows}</div>` : ''}${fcWarn}${seasonLine}`;
      const body = `<div class="pickinfo"><span>${T('hud.cash')} <b>${game.cash}</b>c</span>${R.marketMaxBuy ? `<span>${T('mk.bought')} <b>${mk.bought}</b>/${R.marketMaxBuy}</span>` : ''}</div>${whLine}${contracts}${fcLine}${prepLine}${items}
        ${R.noRefresh || !game.shows('attrs') ? '' : `<button class="btn small" id="mk-refresh" ${game.cash < rc ? 'disabled' : ''}>${T('mk.refresh', { cost: rc ? rc + 'c' : T('mk.free') })}</button>`}`;
      // 마지막 사이클의 마켓을 닫으면 다음 사이클이 아니라 **장**이 끝난다
      const lastCycle = !game.rules.endless && mk.month >= game.rules.months;
      const m = modal(mk.prep ? T('mk.prepTitle') : T('mk.title', { n: game.cycleLabel(mk.month) }), body, [{ label: lastCycle ? T('mk.endChapter') : T('mk.startMonth', { n: game.cycleLabel(mk.month + 1) }), cls: 'primary', onClick: () => { closeModal(); game.closeMarket(); game.takeEvents(); scene.sync(game, { animate: true }); SFX.thud(); saveGame(); renderAll(); if (game.strikeCarrier) toast(T('toast.strike', { name: D.CARRIERS[game.strikeCarrier].name }), 3000); checkPhase(); if (game.phase === 'play') { storyCheck({ kind: game.month === 1 && game.turn === 1 ? 'start' : 'turn' }); showSms(); } } }], game.shows('attrs') ? T('mk.priceMult', { n: (D.PRICE_MULT[Math.min(12, Math.max(1, game.tableMonth(mk.month)))] * R.itemPriceMult * R.priceMult).toFixed(2) }) : '');
      const ft = m.querySelector('#mk-fctoggle'); if (ft) ft.onclick = () => { SFX.click(); fcOpen = !fcOpen; render(); };
      const rb = m.querySelector('#mk-refresh'); if (rb) rb.onclick = () => { const r = game.refreshMarket(); if (r.ok) { SFX.buy(); render(); } else toast(r.msg); };
      storyCheck({ kind: 'market', bought: mk.bought, fcOpen });   // 렌더마다 — 충전을 누르면 다음 안내로 이어진다
      const bind = (sel, fn) => { const el = m.querySelector(sel); if (el) el.onclick = fn; };
      bind('#mk-cust', () => { SFX.click(); showCustomers(render); });
      bind('#mk-ins', () => { SFX.click(); showInsurance(render); });
      m.querySelectorAll('[data-detail]').forEach(b => b.onclick = e => { e.stopPropagation(); SFX.click(); showContractDetail(game.contracts[+b.dataset.detail], render); });
      m.querySelectorAll('[data-refill]').forEach(b => b.onclick = e => { e.stopPropagation(); const it = mk.items[+b.dataset.refill]; const c = game.contracts.find(x => x && x.id === it.contractId);
        const go = () => { const r = game.buy(+b.dataset.refill, null); if (r.ok) { SFX.buy(); saveGame(); toast(T('toast.refill', { name: game.contractName(c), n: c.maxCalls })); render(); } else toast(r.msg); };
        go(); });
      m.querySelectorAll('[data-offer]').forEach(b => b.onclick = e => { e.stopPropagation(); SFX.click(); showOfferDetail(mk.items[+b.dataset.offer], render); });
      m.querySelectorAll('.card[data-i]').forEach(el => el.onclick = () => {
        const it = mk.items[+el.dataset.i]; if (it.sold) return;
        SFX.click();
        if (R.marketMaxBuy && mk.bought >= R.marketMaxBuy) return toast(T('err.marketMax', { n: R.marketMaxBuy }));
        const price = it.kind === 'contract' ? game.contractPrice(it) : it.price;
        if (game.cash < price) return toast(T('err.noCash'));
        if (it.kind === 'fac' || it.kind === 'item' || it.kind === 'customer') { const r = game.buy(+el.dataset.i, null); if (r.ok) { SFX.buy(); saveGame(); announce(Profile.evaluate(game, null)); render(); } else toast(r.msg); return; }
        // 같은 계열 상위 센터로 갈아타기: 그 슬롯을 바로 대상으로, 확인만
        if (it.kind === 'contract' && it.switchFrom) {
          const si = game.contracts.findIndex(c => c && c.id === it.switchFrom), c = game.contracts[si];
          if (si >= 0) { modal(it.name, `<p>${T('slot.switchAsk', { from: esc(game.contractName(c)), to: esc(it.name), calls: c.calls })}</p>`, [{ label: T('btn.cancel'), onClick: render }, { label: T('slot.switchBtn'), cls: 'primary', onClick: () => buyContractInto(it, +el.dataset.i, si, render) }]); return; }
        }
        const free = game.contracts.findIndex(c => !c);
        if (it.kind === 'contract' && free >= 0) return buyContractInto(it, +el.dataset.i, free, render);
        chooseSlot(it, +el.dataset.i, render);
      });
    };
    render();
  }
  // 계약 구매 → 그 센터 담당자가 인사한다 (스토리 안내가 꺼져 있으면 생략)
  function buyContractInto(it, idx, slot, back) {
    const old = game.contracts[slot]; const from = old ? old.carrier : null;
    const r = game.buy(idx, slot); if (!r.ok) { toast(r.msg); return; }
    SFX.buy(); saveGame(); announce(Profile.evaluate(game, null)); back();
    const nc = game.contracts[slot];
    if (nc && !(game.story && game.story.off)) showStoryBeat(Story.greet(game, nc, from && D.familyOf(from) === D.familyOf(nc.carrier) ? from : null), null);
  }
  // 계약 상세: 차량·능력·배차비·배차·신뢰 특성·강화·담당자
  // 마켓에 나온 계약(아직 안 산 것)의 실효 수치. 사기 전에 필요한 건 "월에 몇 칸을, 칸당 얼마에" 다.
  // 이 계약을 사면 '지금은 못 하던' 무엇이 되는가 — 마켓 카드에서 기존 계약과의 차이를 한 줄로
  function newlyHandles(it) {
    const g = game, car = D.CARRIERS[it.carrier], have = g.contracts.filter(Boolean);
    const gains = [];
    // 아직 안 연 속성·크기는 말하지 않는다 — 1장 마켓에 '❄냉장·⚠파손'이 뜨면 그게 뭔지부터 설명해야 한다
    const attrOn = a => g.shows('attrs') && (a !== 'cold' || g.shows('cold')) && (a !== 'frozen' || g.shows('frozen'));
    for (const a of D.GATING_ATTRS) {
      if (!attrOn(a)) continue;
      const pp = { type: 'normal', size: Math.max(car.sizeMin, 1), attrs: [a], customs: a === 'customs' ? 1 : 0 };
      const mineOk = have.some(c => g.canHandle(c, pp) && g.breakProb(c, pp) === 0);
      const itsOk = g._carrierAccepts(car, pp) && (a !== 'fragile' || car.caps.includes('fragile'));
      if (!mineOk && itsOk) gains.push(`${D.ATTRS[a].icon}${D.ATTRS[a].name}`);
    }
    for (let sz = 1; sz <= 7 && g.shows('bigsize'); sz++) {
      const pp = { type: 'normal', size: sz, attrs: [], customs: 0 };
      if (!have.some(c => g.canHandle(c, pp)) && g._carrierAccepts(car, pp)) { gains.push(T('mk.newSize', { n: sz })); break; }
    }
    return gains.length ? gains.join(' · ') : '';
  }
  function offerSpec(it) {
    const R = game.rules, car = D.CARRIERS[it.carrier];
    const cap = car.cap + (R.carrierCapDelta[car.family] || 0);
    const fee = Math.max(0, Math.round((R.feeFixed != null ? R.feeFixed : car.fee) * R.feeMult + R.feeDelta));
    const trucks = Math.max(1, car.trucks + R.callsDelta);
    return { car, cap, fee, trucks, total: cap * trucks, per: Math.round(fee / Math.max(1, cap)),
      vehicle: car.vehicle || '', badge: car.badge || '', sizeMin: car.sizeMin, sizeMax: car.sizeMax, delay: car.delay || 0,
      caps: car.caps.length ? attrIcons(car.caps) : T('common.none') };
  }
  function showOfferDetail(it, back) {
    const o = offerSpec(it), car = o.car, base = D.FAMILIES[car.family], rep = Story.repOf(it.carrier);
    const body = `<div style="display:flex;gap:10px;align-items:flex-start"><img src="${Story.sprite(rep, 'smile')}" style="width:64px;height:64px;image-rendering:pixelated;border:3px solid var(--line);background:#3a3555;flex:0 0 64px"><div class="d"><b>${esc(car.name)}</b>${gradeBadge(it.grade)}<br>${rep === 'rep' ? '' : `${esc(Story.repName(rep, it.carrier))}<br>`}${T('cd.family', { name: esc(base.name), tier: esc(D.GRADES[it.grade].name) })}</div></div>
      ${blockLine({ carrier: it.carrier, enh: {} }) ? `<div class="d" style="color:var(--dim);margin-top:8px">${blockLine({ carrier: it.carrier, enh: {} })}</div>` : ''}
      <div class="kv" style="margin-top:6px"><span>${T('call.caps')}</span><span class="v">${o.caps} · ${T('call.size', { min: o.sizeMin, max: o.sizeMax })}</span>
      <span>${esc(o.vehicle)}</span><span class="v">${T('fmt.cells', { n: o.cap })}</span>
      <span>${T('sum.fees')}</span><span class="v">${o.fee}c${o.delay ? ` · ${T('call.payLater', { n: o.delay })}` : ''}</span>
      <span>${T('fmt.trucks', { n: o.trucks })}</span><span class="v">${T('mk.monthTotal', { total: o.total, per: o.per })}</span></div>
      ${car.tier > 0 ? `<div class="d" style="color:var(--gold)">${T('mk.tierVs', { cap0: base.cap, cap1: car.cap, t0: base.trucks, t1: car.trucks, f0: Math.round(base.fee * game.rules.feeMult), f1: Math.round(car.fee * game.rules.feeMult) })}</div>` : ''}
      ${trustTrack(it.carrier, 0)}`;
    modal(esc(it.name), body, [{ label: T('btn.close'), onClick: back }]);
  }
  // 이 계약이 못 받는 것 — 계약 카드·상세에 한 줄로. "왜 이 택배가 여기 안 실리지?"에 대한 답
  // 이 계약이 못 받는 것 — 크기는 아래 표에 이미 있으니 여기선 속성만. 없으면 줄 자체를 안 쓴다
  function blockLine(c) {
    const b = game.contractBlocks(c);
    if (!b.attrs.length) return '';
    return T('cd.blocks', { list: b.attrs.map(a => `${D.ATTRS[a].icon}${D.ATTRS[a].name}`).join(' ') });
  }
  // 이 택배를 받아 주는 계열 이름들 (지금 계약이 없을 때 뭘 사야 하는지)
  function famNames(p) {
    return game.familiesFor(p).map(f => esc(D.FAMILIES[f].name || f)).join(' · ');
  }
  function showContractDetail(c, back) {
    const g = game, car = D.CARRIERS[c.carrier], fam = D.FAMILIES[car.family];
    const enh = [c.enh.limit ? T('my.limit', { n: c.enh.limit }) : '', c.enh.cap ? T('my.cap', { n: c.enh.cap }) : '', c.enh.regular ? D.ENHANCEMENTS.regular.name : '', c.enh.express ? D.ENHANCEMENTS.express.name : '', c.enh.opt ? D.ENHANCEMENTS[c.enh.opt].name : ''].filter(Boolean);
    const rep = Story.repOf(c.carrier);
    const body = `<div style="display:flex;gap:10px;align-items:flex-start"><img src="${Story.sprite(rep, 'smile')}" style="width:64px;height:64px;image-rendering:pixelated;border:3px solid var(--line);background:#3a3555;flex:0 0 64px"><div class="d"><b>${esc(car.name)}</b>${gradeBadge(c.grade)}<br>${rep === 'rep' ? '' : `${esc(Story.repName(rep, c.carrier))}<br>`}${T('cd.family', { name: esc(fam.name), tier: esc(D.GRADES[c.grade].name) })}</div></div>
      <div class="kv" style="margin-top:8px"><span>${T('call.caps')}</span><span class="v">${g.contractCaps(c).length ? attrIcons(g.contractCaps(c)) : T('common.none')} · ${T('call.size', { min: car.sizeMin, max: g.contractSizeMax(c) })}</span>
      <span>${esc(car.vehicle || '')}</span><span class="v">${T('fmt.cells', { n: g.vehicleCap(c) })} · ×${g.simulMax(c)}</span>
      <span>${T('sum.fees')}</span><span class="v">${g.truckFee(c)}c${car.delay ? ` · ${T('call.payLater', { n: car.delay })}` : ''}</span>
      <span>${T('fmt.trucks', { n: c.maxCalls })}</span><span class="v ${c.calls === 0 ? 'bad' : ''}">${T('my.remain', { calls: c.calls, max: c.maxCalls })} · ${T('cd.refillLine', { price: g.refillPrice(c) })}</span>
      ${g.shows('trust') ? `<span>${T('common.trust')}</span><span class="v">${trustBar(g, c.carrier)}</span>` : ''}</div>
      ${trustTrack(c.carrier, g.trustXp(c.carrier))}${enh.length ? `<div class="d">${T('kind.enh')}: ${enh.join(', ')}</div>` : ''}
      <div class="d" style="color:var(--dim)">${T('my.record', { calls: c.totalCalls, n: c.delivered })}</div>`;
    modal(g.contractName(c), body, [{ label: T('btn.close'), onClick: back || closeModal }]);
  }
  function chooseSlot(it, idx, back) {
    const isContract = it.kind === 'contract';
    const body = `<p style="font-size:12px;color:var(--dim)">${isContract ? T('slot.pickReplace') : T('slot.pickApply')}</p>` + game.contracts.slice(0, game.visibleSlots()).map((c, s) => {
      if (!c) return isContract ? `<div class="card" data-s="${s}"><div class="t">${T('err.emptySlot')}</div><div class="d">${T('slot.emptyHint')}</div></div>` : '';
      const tb = trustBar(game, c.carrier);
      const info = `${T('mk.contractLine', { calls: c.calls, max: c.maxCalls, cap: game.baseCapacity(c) })}${tb ? ` · ${tb}` : ''}` + (c.enh.limit ? ` · ${T('slot.limitEnh', { n: c.enh.limit })}` : '') + (c.enh.cap ? ` · ${T('slot.capEnh', { n: c.enh.cap })}` : '') + (c.enh.regular ? ` · ${D.ENHANCEMENTS.regular.name}` : '') + (c.enh.express ? ` · ${D.ENHANCEMENTS.express.name}` : '');
      return `<div class="card" data-s="${s}"><div class="t">${esc(game.contractName(c))}</div><div class="d">${info}</div></div>`;
    }).join('');
    const m = modal(it.name, body, [{ label: T('btn.cancel'), onClick: back }]);
    const doBuy = (s) => { if (isContract) return buyContractInto(it, idx, s, back); const r = game.buy(idx, s); if (r.ok) { SFX.buy(); saveGame(); announce(Profile.evaluate(game, null)); back(); } else toast(r.msg); };
    m.querySelectorAll('.card').forEach(el => el.onclick = () => doBuy(+el.dataset.s));
  }

  // ---------- result ----------
  function showResult() {
    const r = game.result;
    if (r.level) return showLevelDone(r);   // 레벨 런은 점수·기록이 아니라 '완료'로 끝난다
    if (!r.recorded) {
      r.recorded = true;
      r.got = Profile.recordRun(game, r);
      Store.remove(SAVE_KEY);
      BGM.stop(0.5);
      if (r.win || r.demo) { SFX.win(); BGM.oneShot('fanfare'); } else { SFX.over(); setTimeout(() => BGM.oneShot('gameover'), 300); }
    }
    const P = Profile.get();
    const rec = (P.records[r.scenario] || {})[r.company];
    const got = (r.got || []).map(a => `<div class="card" style="cursor:default"><div class="t">🏆 ${esc(a.name)}</div>${a.unlocks.map(u => `<div class="d" style="color:var(--green)">${T('res.unlocked', { name: esc(u.name) })}</div>`).join('')}</div>`).join('');
    const demoNote = r.demo ? `<div class="card gold" style="cursor:default"><div class="t">🔒 ${T('demo.resultHead')}</div><div class="d">${T('demo.resultBody', { n: Math.ceil(r.monthsDone / D.CYCLES_PER_MONTH) })}</div></div>` : '';
    const body = `<p style="text-align:center">${esc(I18n.text(r.reason))}</p>${demoNote}<div class="big-num">${T('fmt.pts', { n: r.score })}${rec && r.score >= rec.bestScore && r.score > 0 ? ` ${T('res.best')}` : ''}</div>${got}
      <div class="kv"><span>${T('res.scenarioCompany')}</span><span class="v">${esc(M.SCENARIOS[r.scenario].name)}${r.difficulty && r.difficulty !== 'normal' ? ` (${esc(M.DIFFICULTIES[r.difficulty].name)})` : ''} / ${esc(M.COMPANIES[r.company].name)}</span><span>${T('res.reached')}</span><span class="v">${T('fmt.monthTurn', { m: cycleName(r.month), t: r.turn , max: (game && game.turns ? game.turns() : D.TURNS_PER_MONTH) })}</span><span>${T('res.revenue')}</span><span class="v">${r.revenue}c</span><span>${T('res.spent')}</span><span class="v">${r.spent}c</span><span>${T('res.cash')}</span><span class="v">${r.cash}c</span><span>${T('sum.rep')}</span><span class="v">${r.rep} <small>${esc(T('rep.tier.' + (r.repTier || 'unknown')))}</small></span><span>${T('res.callsWaits')}</span><span class="v">${r.calls} / ${r.waits}</span><span>${T('res.deliveredDiscarded')}</span><span class="v">${r.delivered} / ${r.discarded}</span><span>${T('company.perks')}</span><span class="v">${r.perks.map(p => M.PERKS[p].name).join(', ') || T('common.none')}</span>${r.variants.length ? `<span>${T('prep.variants')}</span><span class="v">${r.variants.map(v => M.DAILY_VARIANTS[v].name).join(', ')}</span>` : ''}<span>${T('res.seed')}</span><span class="v">${r.seed}</span></div>`;
    const again = r.scenario === 'daily' ? { label: T('res.toTitle'), cls: 'primary', onClick: () => { closeModal(); game = null; showTitle(); } } : { label: T('res.again'), cls: 'primary', onClick: () => { closeModal(); const cfg = game.cfg; game = new Game({ scenario: cfg.scenario, company: cfg.company, perks: cfg.perks, insurer: cfg.insurer, difficulty: cfg.difficulty, prep: true }); startPlay(); } };
    modal(r.demo ? T('demo.resultTitle') : r.win ? T(r.story ? 'res.winStory' : 'res.win') : T('res.over'), body, [{ label: T('res.toTitle'), onClick: () => { closeModal(); game = null; showTitle(); } }, r.demo ? { label: T('demo.cta'), cls: 'gold', onClick: () => showDemoGate(showResult) } : again]);
  }
  // ---------- 데모 안내: 본편에 무엇이 더 있는지 + 어디서 사는지 ----------
  function showDemoGate(back) {
    const nSc = Object.keys(M.SCENARIOS).length, nCo = Object.keys(M.COMPANIES).length, nPk = Object.keys(M.PERKS).length;
    const names = [['itch', 'itch.io'], ['steam', 'Steam'], ['play', 'Google Play']].filter(([k]) => BUILD.store && BUILD.store[k]);
    const links = names.length
      ? `<div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">${names.map(([k, nm]) => `<a class="btn gold" href="${esc(BUILD.store[k])}" target="_blank" rel="noopener">${nm}</a>`).join('')}</div>`
      : `<div class="d" style="margin-top:8px">${T('demo.soon')}</div>`;
    const body = `<p>${T('demo.gateBody', { n: demoMonthsLabel() })}</p>
      <div class="kv"><span>${T('demo.rowMonths')}</span><span class="v">${T('fmt.months', { n: M.SCENARIOS.standard.months })}</span>
      <span>${T('demo.rowScenarios')}</span><span class="v">${T('fmt.count', { n: nSc })}</span>
      <span>${T('demo.rowCompanies')}</span><span class="v">${T('fmt.count', { n: nCo })}</span>
      <span>${T('demo.rowPerks')}</span><span class="v">${T('fmt.count', { n: nPk })}</span></div>
      <div class="d" style="margin-top:6px">${T('demo.keepProfile')}</div>${links}`;
    modal(T('demo.gateTitle'), body, [{ label: T('btn.close'), onClick: back || closeModal }]);
  }

  function showRecords(back) {
    const P = Profile.get();
    const recs = Object.keys(P.records).map(sc => `<div style="margin-top:6px"><b>${esc(M.SCENARIOS[sc] ? M.SCENARIOS[sc].name : sc)}</b>: ${Object.keys(P.records[sc]).map(co => `${esc(M.COMPANIES[co].name)} ${T('fmt.pts', { n: P.records[sc][co].bestScore })}`).join(' · ')}</div>`).join('');
    const body = `<div class="records"><p>${T('rec.head', { best: P.stats.bestScore, runs: P.stats.runs, clears: P.stats.clears })}${P.stats.dailyStreak ? ` · ${T('rec.dailyStreak', { n: P.stats.dailyStreak })}` : ''}</p>${recs}<hr>${P.recentRuns.length ? P.recentRuns.map(r => `<div>${r.date} · <b>${T('fmt.pts', { n: r.score })}</b> · ${r.win ? T('rec.win') : T('rec.lose')} · ${esc(M.SCENARIOS[r.scenario] ? M.SCENARIOS[r.scenario].name : r.scenario)} / ${esc(M.COMPANIES[r.company] ? M.COMPANIES[r.company].name : r.company)} (${T('fmt.monthTurn', { m: cycleName(r.month), t: r.turn , max: (game && game.turns ? game.turns() : D.TURNS_PER_MONTH) })})</div>`).join('') : `<p>${T('rec.empty')}</p>`}</div>`;
    modal(T('rec.title'), body, [{ label: T('btn.close'), onClick: back }]);
  }

  // ---------- 고객 ----------
  function custBar(c) { const lv = c.level; const bars = [1, 2, 3].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join(''); return `<span class="trust" title="${c.next ? T('cust.next', { have: c.next.have, need: c.next.need }) : T('trust.max')}">${bars}${c.suspended ? ` ${T('cust.suspended')}` : c.next ? ` ${c.next.have}/${c.next.need}` : ' MAX'}</span>`; }
  function customerCard(c) {
    const cu = M.CUSTOMERS[c.id];
    const perks = [2, 3].filter(l => cu.perks && cu.perks[l]).map(l => `<div class="ttrow ${c.level >= l ? 'on' : ''}"><span class="lv">${l}</span><span class="ef">${esc(cu.perks[l].text)}</span><span class="st">${c.level >= l ? '✓' : `${M.CUSTOMER_LEVELS[l]}xp`}</span></div>`).join('');
    const lvRow = `<div class="ttrow ${c.level >= 1 ? 'on' : ''}"><span class="lv">1</span><span class="ef">${T('cust.lv1')}</span><span class="st">${c.level >= 1 ? '✓' : `${M.CUSTOMER_LEVELS[1]}xp`}</span></div>`;
    const items = cu.items ? Object.keys(cu.items).map(k => { const it = M.CUSTOMER_ITEMS[k]; const t = it ? it.type : k; return `${D.PARCEL_TYPES[t].short}${it ? attrIcons(it.attrs) : ''} ${cu.items[k]}%`; }).join(' · ') : T('cust.defaultMix');
    return `<div class="card ${c.suspended ? 'dis' : ''}" style="cursor:default"><div class="t"><span>${cu.icon} ${esc(cu.name)}${c.slots > 1 ? ` ×${c.slots}` : ''}</span><span class="price">${c.id === 'anon' ? '' : custBar(c)}</span></div>
      <div class="d">${items} · ${T('mk.claimMult', { n: cu.claimMult })}${cu.rule ? `<br><span style="color:var(--gold)">${esc(cu.rule.text)}</span>` : ''}<br>${T('cust.thisMonth', { n: c.month.delivered, rev: c.month.revenue })}${c.month.claims ? ` · <span style="color:var(--red)">${T('sum.custClaim', { n: c.month.claims })}</span>` : ''}${c.suspended ? ` · <span style="color:var(--red)">${T('cust.suspendedLong')}</span>` : ''}${c.id === 'anon' ? '' : `<div class="ttrack">${lvRow}${perks}</div>`}</div></div>`;
  }
  function showInsurance(back) {
    const g = game;
    const cards = Object.keys(M.INSURERS).map(id => { const I = M.INSURERS[id], cur = id === g.insurer; const fee = cur ? g.premium() : g.premiumBase(id); return `<div class="card ${cur ? 'sel' : ''}" data-ins="${id}"><div class="t"><span>${I.icon} ${esc(I.name)}${cur ? ` <small style="color:var(--green)">${T('ins.current')}</small>` : ''}</span><span class="price">${cur ? T('ins.nextMonth', { n: fee }) : fee ? T('ins.joinFee', { n: fee }) : '0c'}</span></div><div class="d">${esc(I.desc)}${I.fans.length ? `<br><span style="color:var(--green)">${T('ins.fans')}: ${I.fans.filter(f => g.customers[f]).map(f => M.CUSTOMERS[f].icon + M.CUSTOMERS[f].name).join(' ') || T('ins.noFans')}</span>` : ''}</div></div>`; }).join('');
    const info = `${g.rules.noInsurance && g.month < 2 ? `<div class="perk-count" style="color:var(--orange)">${T('ins.startup')}</div>` : ''}<div class="perk-count">${T('ins.rules')}${g.coverHalf ? `<br><span style="color:var(--red)">${T('ins.coverHalf')}</span>` : ''}</div>`;
    const m = modal(T('kind.item'), info + cards, [{ label: T('btn.close'), onClick: back }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.ins; if (id === g.insurer) return; if (g.phase !== 'market') { toast(T('ins.marketOnly')); return; } if (g.rules.noInsurance && g.month < 2) { toast(T('err.startupNoInsurance'), 2500); return; } askConfirm(T('ins.confirm', { name: M.INSURERS[id].name, fee: g.premiumBase(id) }), () => { const r = g.setInsurer(id); if (!r.ok) toast(r.msg); else { SFX.buy(); saveGame(); } showInsurance(back); }, T('ins.join'), () => showInsurance(back)); });
  }
  function showCustomers(back) {
    const g = game, list = g.customerSummary();
    // 아직 안 온 고객은 '어느 등급부터 찾아오는지'를 보여 준다 — 평판을 키울 이유가 눈에 보여야 한다
    const have = list.map(c => c.id);
    const soon = Object.keys(M.CUSTOMERS).filter(k => k !== 'anon' && !have.includes(k))
      .map(k => ({ k, tier: M.CUSTOMERS[k].repTier || 0 }))
      .sort((a, b) => a.tier - b.tier || a.k.localeCompare(b.k));
    const soonRows = soon.length ? `<div class="perk-count" style="margin-top:10px">${T('cust.locked')}</div>` + soon.map(({ k, tier }) => {
      const cu = M.CUSTOMERS[k], open = tier <= g.repTier;
      return `<div class="d" style="opacity:${open ? 1 : 0.55}">${cu.icon} ${esc(cu.name)} — ${open ? T('cust.openNow') : T('cust.needTier', { name: T('rep.tier.' + D.REP_TIERS[tier].id) })}</div>`;
    }).join('') : '';
    const body = `<div class="perk-count">${T('cust.rules')}</div>` + list.map(customerCard).join('') + soonRows;
    modal(T('company.customers'), body, [{ label: T('btn.close'), onClick: back }]);
  }

  // ---------- 내 계약 (마켓에서) ----------
  function showMyContracts(back) {
    const g = game, R = g.rules;
    const cards = g.contracts.map((c, i) => {
      if (!c) return `<div class="card dis" style="cursor:default"><div class="t">${T('my.slot', { n: i + 1 })} · ${T('err.emptySlot')}</div></div>`;
      const car = D.CARRIERS[c.carrier];
      const enh = [c.enh.limit ? T('my.limit', { n: c.enh.limit }) : '', c.enh.cap ? T('my.cap', { n: c.enh.cap }) : '', c.enh.regular ? D.ENHANCEMENTS.regular.name : '', c.enh.express ? D.ENHANCEMENTS.express.name : '', c.enh.opt ? D.ENHANCEMENTS[c.enh.opt].name : ''].filter(Boolean);
      return `<div class="card" style="cursor:default"><div class="t"><span>${esc(g.contractName(c))}</span><span class="price">${T('my.remain', { calls: c.calls, max: c.maxCalls })}</span></div>
        <div class="d">${T('my.line', { vehicle: esc(car.vehicle || ''), cap: g.vehicleCap(c), fee: g.truckFee(c), simul: g.simulMax(c) })}${enh.length ? ` · ${enh.join(', ')}` : ''}<br>${T('my.record', { calls: c.totalCalls, n: c.delivered })}${g.shows('trust') ? `<br>${trustBar(g, c.carrier)}${trustTrack(c.carrier, g.trustXp(c.carrier))}` : ''}</div></div>`;
    }).join('');
    const others = Object.keys(D.CARRIERS).filter(k => g.trustXp(k) > 0 && !g.contracts.some(c => c && c.carrier === k));
    const otherHtml = others.length ? `<div class="perk-count">${T('my.others')}</div>` + others.map(k => `<div class="card" style="cursor:default"><div class="t"><span>${esc(D.CARRIERS[k].name)}</span></div><div class="d">${trustBar(g, k)}${trustTrack(k, g.trustXp(k))}</div></div>`).join('') : '';
    modal(T('mk.mine'), `<div class="perk-count">${T('my.note', { keep: R.keepCalls ? T('mk.keepCalls', { n: R.keepCalls }) : '' })}</div>${cards}${otherHtml}`, [{ label: T('sum.toMarket'), onClick: back }]);
  }

  // ---------- 도감 ----------
  function showCodex(tab, back) {
    const P = Profile.get();
    const tabs = ['companies', 'carriers', 'perks', 'scenarios', 'achievements', 'stats'].map(id => [id, T('codex.tab.' + id)]);
    let body = `<div class="tabs">${tabs.map(([id, nm]) => `<button class="btn small ${tab === id ? 'gold' : ''}" data-tab="${id}">${nm}</button>`).join('')}</div>`;
    if (tab === 'companies') body += [0, 1, 2, 3].map(t => `<div class="perk-count">${TIER_NAMES()[t]}</div>` + Object.keys(M.COMPANIES).filter(id => (M.COMPANIES[id].tier || 0) === t).map(id => { const co = M.COMPANIES[id], un = P.unlocked.companies.includes(id); const clears = P.stats.clearsByCompany[id] || 0; return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${un ? co.icon : '🔒'} ${esc(co.name)} <small style="color:var(--dim)">${esc(co.tag)}</small></span><span class="price">${clears ? T('fmt.wins', { n: clears }) : ''}</span></div>${un ? companyInfo(co, id) : `<div class="d">${esc(unlockText(co.unlock))}</div>`}</div>`; }).join('')).join('');
    else if (tab === 'carriers') { const live = game && game.phase !== 'over' && game.phase !== 'win'; body += `<div class="perk-count">${T('codex.carriersHead')}${live ? ` ${T('codex.liveRun')}` : ''}</div>` + Object.keys(D.FAMILIES).map(f => `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${esc(D.FAMILIES[f].name)}</div>` + D.centersOf(f).map(k => { const car = D.CARRIERS[k]; return `<div class="card" style="cursor:default"><div class="t"><span>${car.badge || ''} ${esc(car.name)}${gradeBadge(car.grade)}</span><span class="price">${T('codex.carrierPrice', { vehicle: esc(car.vehicle || ''), cap: car.cap, fee: car.fee, trucks: car.trucks, price: car.price })}</span></div><div class="d">${esc(car.desc)}<br>${T('call.caps')} ${car.caps.length ? attrIcons(car.caps) : T('common.none')} · ${T('call.size', { min: car.sizeMin, max: car.sizeMax })}${car.need ? ` · ${T('codex.need', { icons: car.need.map(a => D.ATTRS[a].icon).join('') })}` : ''}${car.onlyPlain ? ` · ${T('pd.plainOnly')}` : ''}${car.delay ? ` · ${T('call.payLater', { n: car.delay })}` : ''}${trustTrack(k, live ? game.trustXp(k) : null)}</div></div>`; }).join('')).join(''); }
    else if (tab === 'perks') body += `<div class="perk-count">${T('codex.perkSlots', { n: Profile.perkSlots() })}</div>` + Object.keys(M.PERK_FAMILIES).map(f => `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${T('prep.family', { family: M.PERK_FAMILIES[f] })}</div>` + Object.keys(M.PERKS).filter(id => M.PERKS[id].family === f).map(id => { const pk = M.PERKS[id], un = P.unlocked.perks.includes(id); return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t">${un ? '' : '🔒 '}${esc(pk.name)}</div><div class="d">${esc(pk.desc)}${un ? '' : `<br>${esc(unlockText(pk.unlock))}`}</div></div>`; }).join('')).join('');
    else if (tab === 'scenarios') body += Object.keys(M.SCENARIOS).map(id => { const s = M.SCENARIOS[id], un = P.unlocked.scenarios.includes(id); const clears = P.stats.clearsByScenario[id] || 0; return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${un ? s.icon : '🔒'} ${esc(s.name)}</span><span class="price">${clears ? T('fmt.wins', { n: clears }) : ''}</span></div><div class="d">${esc(s.desc)}<br>${T('prep.win')}: ${esc(s.win)}${un ? '' : `<br>${esc(unlockText(s.unlock))}`}</div></div>`; }).join('');
    else if (tab === 'achievements') {
      const groups = ['company', 'scenario', 'slot', 'multi', 'perk', 'none'].map(g => [g, T('codex.ach.' + g)]);
      body += groups.map(([g, nm]) => { const ids = Object.keys(M.ACHIEVEMENTS).filter(id => M.ACHIEVEMENTS[id].rewardType === g); if (!ids.length) return ''; return `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${nm}</div>` + ids.map(id => { const a = M.ACHIEVEMENTS[id], done = !!P.achievements[id]; const reward = a.rewardType === 'company' ? M.COMPANIES[a.reward].name : a.rewardType === 'perk' ? M.PERKS[a.reward].name : a.rewardType === 'scenario' ? M.SCENARIOS[a.reward].name : a.rewardType === 'slot' ? T('codex.slotReward', { n: a.reward }) : a.rewardType === 'multi' ? T('codex.multiReward') : ''; return `<div class="card ${done ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${done ? '🏆' : '⬜'} ${esc(a.name)}</span>${reward ? `<span class="price">${esc(reward)}</span>` : ''}</div><div class="d">${esc(a.desc)}</div></div>`; }).join(''); }).join('');
    } else {
      const s = P.stats, dt = s.deliveredByType;
      body += `<div class="kv stats"><span>${T('stat.runsClears')}</span><span class="v">${s.runs} / ${s.clears}</span><span>${T('stat.best')}</span><span class="v">${s.bestScore}</span><span>${T('stat.delivered')}</span><span class="v">${T('fmt.count', { n: dt.normal + dt.fresh + dt.fragile + dt.intl + dt.large })}</span><span class="sub">　${D.PARCEL_TYPES.normal.short} / ${D.PARCEL_TYPES.fresh.short}</span><span class="v sub">${dt.normal} / ${dt.fresh}</span><span class="sub">　${D.PARCEL_TYPES.fragile.short} / ${D.PARCEL_TYPES.intl.short} / ${D.PARCEL_TYPES.large.short}</span><span class="v sub">${dt.fragile} / ${dt.intl} / ${dt.large}</span><span>${T('res.callsWaits')}</span><span class="v">${s.calls} / ${s.waits}</span><span>${T('stat.contracts')}</span><span class="v">${s.contractsBought}</span><span>${T('sum.discarded')}</span><span class="v">${s.discarded}</span><span>${T('stat.tidy')}</span><span class="v">${s.tidyMonths}</span><span>${T('stat.daily')}</span><span class="v">${T('fmt.days', { n: s.dailyStreak })}</span></div>
        <hr><p style="font-size:12px;color:var(--dim)">${T('stat.profileNote')}</p>
        <div style="display:flex;gap:6px;margin-bottom:6px"><button class="btn small" id="cx-export" style="flex:1">${T('stat.export')}</button><button class="btn small" id="cx-import" style="flex:1">${T('stat.import')}</button></div>
        <p style="font-size:11px;color:var(--dim)">${T('stat.transferNote')}</p><button class="btn small warn" id="cx-reset">${T('stat.reset')}</button>`;
    }
    const m = modal(T('title.codex'), body, [{ label: T('btn.close'), onClick: back }]);
    m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { SFX.click(); showCodex(b.dataset.tab, back); });
    const rs = m.querySelector('#cx-reset'); if (rs) rs.onclick = () => askConfirm(T('stat.resetConfirm'), () => { Profile.reset(); SFX.cancel(); showCodex('stats', back); }, T('stat.resetBtn'), () => showCodex('stats', back));
    const ex = m.querySelector('#cx-export'); if (ex) ex.onclick = () => { SFX.click(); showTransfer('export', () => showCodex('stats', back)); };
    const im = m.querySelector('#cx-import'); if (im) im.onclick = () => { SFX.click(); showTransfer('import', () => showCodex('stats', back)); };
  }

  // 프로필 이동 코드: 내보내기(복사) · 가져오기(붙여넣기)
  function showTransfer(mode, back) {
    if (mode === 'export') {
      const code = Profile.exportCode();
      const body = `<p style="font-size:12px">${T('stat.exportHelp')}</p><textarea id="tr-code" readonly style="width:100%;height:120px;font-family:inherit;font-size:10px;background:#241f3a;color:var(--fg);border:3px solid var(--line);padding:6px;word-break:break-all">${esc(code)}</textarea>`;
      const m = modal(T('stat.export'), body, [{ label: T('btn.close'), onClick: back }, { label: T('stat.copy'), cls: 'primary', onClick: () => { const ta = m.querySelector('#tr-code'); ta.select(); let ok = false; try { ok = document.execCommand('copy'); } catch (e) { } if (!ok && navigator.clipboard) { navigator.clipboard.writeText(code).then(() => toast(T('stat.copied'))); return; } toast(T(ok ? 'stat.copied' : 'stat.copyFail'), 2200); } }]);
      setTimeout(() => { const ta = m.querySelector('#tr-code'); if (ta) ta.focus(); }, 50);
      return;
    }
    const body = `<p style="font-size:12px">${T('stat.importHelp')}</p><textarea id="tr-code" placeholder="..." style="width:100%;height:120px;font-family:inherit;font-size:10px;background:#241f3a;color:var(--fg);border:3px solid var(--line);padding:6px;word-break:break-all"></textarea>`;
    const m = modal(T('stat.import'), body, [{ label: T('btn.cancel'), onClick: back }, { label: T('stat.importBtn'), cls: 'primary', onClick: () => {
      const r = Profile.importCode(m.querySelector('#tr-code').value.trim());
      if (!r.ok) { SFX.cancel(); toast(T('stat.importFail'), 2400); return; }
      SFX.select(); toast(T('stat.importOk', { n: r.added }), 2600); back();
    } }]);
  }

  function showLog(back) {
    modal(T('log.title'), `<div class="log-list">${game.log.map(l => `<div>${esc(I18n.text(l))}</div>`).join('')}</div>`, [{ label: T('btn.close'), onClick: back }]);
  }
  function showHelp(back) {
    // 아직 마켓도 안 열린 런(레벨 1)에 전체 설명서를 보여 주면 숨긴 보람이 없다 — 그 레벨에 있는 것만
    const short = !!(game && !game.shows('market'));
    const body = short ? T('help.l1') : T('help.body', { stress: D.GAMEOVER_STRESS });
    const btns = short ? [] : [{ label: T('how.title'), onClick: () => showHowTo(null, () => showHelp(back)) }];
    modal(T('title.help'), body, [...btns, { label: T('help.notes'), onClick: () => showNotes(() => showHelp(back)) }, { label: T('btn.close'), onClick: back }]);
  }
  // 창고장 노트: 이 런에서 들은 비트 전문
  function showNotes(back) {
    const notes = game && game.story && game.story.notes ? game.story.notes : [];
    const body = notes.length ? notes.map(n => `<div class="card" style="cursor:default"><div class="t"><span>${T('story.name')}</span><span class="price">${T('fmt.monthTurn', { m: cycleName(n.month), t: n.turn , max: (game && game.turns ? game.turns() : D.TURNS_PER_MONTH) })}</span></div><div class="d">${n.text.join('<br><br>')}</div></div>`).join('') : `<p style="color:var(--dim)">${T('help.notesEmpty')}</p>`;
    modal(T('help.notes'), body, [{ label: T('btn.close'), onClick: back }]);
  }
  // ---------- 달력 (한 해 · 이벤트) ----------
  function showCalendar(back) {
    const g = game; if (!g) return;
    const mi = g.monthIndex();                   // 달력 칸은 개월차 — g.month(사이클)와 직접 비교하면 후반월에 다음 달이 켜진다
    const cells = g.calendarMonths().map(x => {
      const evs = x.events.map(e => `<div class="ev">${esc(T('cal.event.' + e.id).split(' — ')[0])} <small>${T('cal.eventTurns', { a: e.days ? e.days[0] : e.turns[0], b: e.days ? e.days[1] : e.turns[1] })}</small></div>`).join('');
      const pct = Math.round((x.arrivalsMult - 1) * 100); const vol = pct ? (pct > 0 ? '+' : '') + pct + '%' : '±0';
      return `<div class="cm ${x.m === mi ? 'now' : x.m < mi ? 'past' : ''}"><div class="t">${x.icon} <b>${T('fmt.calOnly', { cal: x.cal })}</b> ${esc(T(`cal.${g.rules.calendar}.${x.cal}.label`))}${x.m === mi ? ` <small style="color:var(--gold)">${T('cal.thisMonth')}</small>` : ''}</div><div style="color:var(--dim)">${T('cal.arrivals', { pct: vol })}</div>${evs}</div>`;
    }).join('');
    const now = g.calMonth();
    modal(T('cal.title'), `<div class="calgrid">${cells}</div><hr><div class="d" style="font-size:12px">${g.seasonMods().icon || ''} ${esc(T(`cal.${g.rules.calendar}.${now}.note`))}</div>`, [{ label: T('btn.close'), onClick: back || closeModal }]);
  }

  // ---------- 스토리 모드: 창고장 대화창 · 계절 문자 ----------
  let storyHl = null, storyBusy = false, storyStopTyping = null;
  function clearStoryHl() { if (storyHl) { if (storyHl !== gateTarget) storyHl.classList.remove('story-hl'); storyHl = null; } }
  // 지금 상황에 맞는 비트가 있으면 보여준다. 비트가 닫히면 같은 상황으로 한 번 더 본다 (사고 + 첫 호출처럼 둘이 겹칠 때)
  function storyCheck(ctx, depth) {
    if (!game || !window.Story || storyBusy) return;
    const beat = Story.check(game, ctx || { kind: 'turn' });
    if (!beat) return;
    if (beat.acted) renderAll();
    if (beat.id === 'intro' || beat.id === 'farewell') { const P = Profile.get(); P.story = Object.assign({}, P.story, beat.id === 'farewell' ? { seen: true, done: true } : { seen: true }); Profile.save(); }
    saveGame();
    showStoryBeat(beat, () => { if ((depth || 0) < 1) storyCheck(ctx, (depth || 0) + 1); });
  }
  // 텍스트를 글자 단위 span으로 감싼다 (<b>·<br> 유지) — 타자 효과용
  function wrapChars(node) {
    const out = [];
    for (const n of Array.from(node.childNodes)) {
      if (n.nodeType === 3) { const frag = document.createDocumentFragment(); for (const ch of n.textContent) { const sp = document.createElement('span'); sp.className = 'ch'; sp.textContent = ch; frag.appendChild(sp); out.push(sp); } n.replaceWith(frag); }
      else if (n.nodeType === 1 && n.tagName !== 'BR') out.push(...wrapChars(n));
    }
    return out;
  }
  // 강제 클릭 게이트: 대화가 끝난 뒤 hl 대상만 누를 수 있다. 다른 곳을 누르면 손가락이 흔들린다
  let gateTarget = null;
  function clearGate() { const g = $('#story-gate'); if (g) { g.hidden = true; g.onclick = null; } if (gateTarget) { gateTarget.classList.remove('story-hl'); gateTarget = null; } }
  function openGate(target) {
    clearGate(); if (!target) return;
    gateTarget = target; target.classList.add('story-hl');
    const g = $('#story-gate'), pt = $('#story-point'); pt.textContent = T('story.tapHere');
    const place = () => { const r = target.getBoundingClientRect(); const below = r.top < 60; pt.className = 'spoint' + (below ? ' below' : ''); pt.style.left = (r.left + r.width / 2) + 'px'; pt.style.top = (below ? r.bottom + 10 : r.top - 8) + 'px'; };
    place(); g.hidden = false;
    g.onclick = e => {
      const r = target.getBoundingClientRect();
      if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom && !target.disabled) { clearGate(); target.click(); return; }
      SFX.nudge(); pt.classList.remove('shake'); void pt.offsetWidth; pt.classList.add('shake'); place();
    };
  }
  // 대사 속 속성 아이콘(⚠❄❆🌾🛃)은 픽셀 글꼴이 흑백으로 그린다 — 그 종류 색 상자에 얹어 창고 상자와 같은 색으로 보이게
  const ICON_TYPE = { '⚠': 'fragile', '❄': 'fresh', '❆': 'frozen', '🌾': 'produce', '🛃': 'intl' };
  function tintIcons(html) {
    return html.replace(/(<[^>]*>)|([⚠❄❆🌾🛃])\uFE0F?/gu, (m, tag, ic) => tag ? tag : `<span class="sicon" style="background:${D.PARCEL_TYPES[ICON_TYPE[ic]].css}">${ic}</span>`);
  }
  function showStoryBeat(beat, after) {
    const el = $('#story'); let i = 0; storyBusy = true; clearGate();
    let typing = null; // { timer, done, chars, base, talk }
    $('#story-name').textContent = beat.name;
    $('#story-skip').textContent = T('story.skip');
    const calBtn = $('#story-cal'); calBtn.hidden = !beat.calendar; calBtn.textContent = T('story.calendar');
    const face = $('#story-face'), next = $('#story-next'), cursor = $('#story-cursor');
    const stopTyping = () => { if (typing && typing.timer) clearTimeout(typing.timer); };
    if (storyStopTyping) storyStopTyping();  // 앞 대화의 타자 루프가 남아 있으면 끊는다 (말소리가 겹쳐 이어지지 않게)
    storyStopTyping = stopTyping;
    const finishTyping = () => { if (!typing) return; stopTyping(); typing.chars.forEach(c => c.classList.add('on')); face.src = typing.base; typing.done = true; next.hidden = false; cursor.hidden = false; };
    const render = () => {
      const pg = beat.pages[i];
      const base = Story.sprite(pg.speaker, pg.expr, false), talk = Story.sprite(pg.speaker, pg.expr, true);
      $('#story-name').textContent = pg.name || beat.name;
      face.src = base;
      const body = $('#story-body'); body.innerHTML = tintIcons(pg.text);
      const chars = wrapChars(body);
      $('#story-pages').textContent = beat.pages.length > 1 ? `${i + 1}/${beat.pages.length}` : '';
      next.textContent = i < beat.pages.length - 1 ? T('story.next') : T('story.ok');
      next.hidden = true; cursor.hidden = true;
      clearStoryHl();
      let top = false;
      if (pg.hl) { const t = document.querySelector(pg.hl); if (t && !t.hidden && t.offsetParent !== null) { t.classList.add('story-hl'); storyHl = t; const r = t.getBoundingClientRect(); top = r.top + r.height / 2 > window.innerHeight * 0.55; } }
      el.classList.toggle('top', top);
      el.hidden = false;
      // 타자: 글자마다 삑 소리 + 입 벌림 프레임 교대. 문장 부호에서 잠깐 쉼
      stopTyping(); typing = { timer: null, done: false, chars, base, talk };
      let k = 0;
      const tick = () => {
        if (k >= chars.length) return finishTyping();
        const c = chars[k]; c.classList.add('on'); const ch = c.textContent; k++;
        let d = 34;
        if (ch.trim()) { if (k % 2 === 1) SFX.blip(k); face.src = Math.floor(k / 3) % 2 === 0 ? talk : base; }
        if (/[.!?…。]/.test(ch)) d = 260; else if (/[,·、—]/.test(ch)) d = 120; else if (ch === ' ') d = 20;
        typing.timer = setTimeout(tick, d);
      };
      typing.timer = setTimeout(tick, 80);
    };
    const close = () => { stopTyping(); if (storyStopTyping === stopTyping) storyStopTyping = null; const pg = beat.pages[i]; const target = pg.gate && pg.hl ? document.querySelector(pg.hl) : null; el.hidden = true; clearStoryHl(); storyBusy = false; if (target && !target.disabled) openGate(target); else if (after) after(); };
    // 탭: 타자 중이면 전부 보여주고, 다 보였으면 다음 페이지 / 닫기
    const advance = () => { SFX.resume(); if (typing && !typing.done) { finishTyping(); return; } SFX.click(); if (i < beat.pages.length - 1) { i++; render(); } else close(); };
    next.onclick = e => { e.stopPropagation(); advance(); };
    $('#story-skip').onclick = e => { e.stopPropagation(); SFX.cancel(); close(); };
    calBtn.onclick = e => { e.stopPropagation(); SFX.click(); showCalendar(closeModal); };
    el.onclick = () => advance();
    render();
  }
  // 6월 이후 월초 문자 한 줄 (스토리 모드가 아니어도 옵션이 켜져 있으면)
  let smsTimer = null;
  function showSms() {
    const el = $('#sms'); if (!game || !opts.sms || game.month < 5 || game.turn !== 1 || (game.story && Story.active(game))) { el.hidden = true; return; }
    const s = Story.sms(game); if (!s) { el.hidden = true; return; }
    $('#sms-from').textContent = T('sms.from'); $('#sms-text').textContent = s; el.hidden = false;
    // 액션 영역(계약 카드·대기 버튼·하단 바) 위로 띄운다 — 결정에 쓰는 버튼을 가리면 안 된다
    const act = $('#actions'); el.style.bottom = ((act ? act.offsetHeight : 0) + 8) + 'px';
    clearTimeout(smsTimer); smsTimer = setTimeout(() => { el.hidden = true; }, 9000);
    el.onclick = () => { el.hidden = true; };
  }
  function showGrowthLegacy() {
    if (!game || game.phase !== 'play') return;
    const g = game, ko = I18n.lang === 'ko';
    const names = ko
      ? { marketing: ['📣', '홍보', '더 많은 택배를 유치'], fleet: ['🚚', '트럭', '모든 계약의 배차 추가'], warehouse: ['🏭', '창고', '보관 공간 확장'] }
      : { marketing: ['📣', 'Marketing', 'Attract more parcels'], fleet: ['🚚', 'Fleet', 'Add dispatches to every contract'], warehouse: ['🏭', 'Warehouse', 'Expand storage capacity'] };
    const effect = (kind, p) => {
      if (kind === 'marketing') return ko ? `다음 영업일부터 +${p.def.parcels}건` : `+${p.def.parcels} from next workday`;
      if (kind === 'fleet') return ko ? `계약마다 배차 +${p.def.calls}회` : `+${p.def.calls} call per contract`;
      return ko ? `창고 +${p.def.cap}칸` : `+${p.def.cap} warehouse cells`;
    };
    const current = kind => kind === 'marketing'
      ? (ko ? `기본 ${D.GROWTH.organicArrivals}건 + 홍보 ${g.growth.marketing * D.GROWTH.marketing.parcels}건` : `${D.GROWTH.organicArrivals} organic + ${g.growth.marketing * D.GROWTH.marketing.parcels} promoted`)
      : kind === 'fleet'
        ? (ko ? `계약당 추가 배차 +${g.growth.fleet}` : `+${g.growth.fleet} calls per contract`)
        : (ko ? `현재 ${g.usedVolume()}/${g.warehouse.cap}칸` : `${g.usedVolume()}/${g.warehouse.cap} cells used`);
    const cards = ['marketing', 'fleet', 'warehouse'].map(kind => {
      const p = g.growthPlan(kind), n = names[kind], max = p.cost == null;
      const dots = Array.from({ length: p.max }, (_, i) => `<i class="${i < p.level ? 'on' : ''}"></i>`).join('');
      return `<button class="growth-card ${max ? 'max' : ''}" data-growth="${kind}" ${max ? 'disabled' : ''}>
        <span class="growth-icon">${n[0]}</span><span class="growth-copy"><b>${n[1]} <em>Lv.${p.level}</em></b><small>${n[2]}</small><span>${current(kind)}</span></span>
        <span class="growth-buy"><span class="growth-dots">${dots}</span><b>${max ? (ko ? '최고 레벨' : 'MAX') : p.cost + 'c'}</b><small>${max ? '' : effect(kind, p)}</small></span>
      </button>`;
    }).join('');
    const body = `<div class="growth-head"><span>${ko ? '현재 자금' : 'Cash'} <b>${g.cash}c</b></span><small>${ko ? '수익을 세 축에 재투자하세요. 구매 효과는 즉시 적용됩니다.' : 'Reinvest earnings. Every upgrade applies immediately.'}</small></div><div class="growth-grid">${cards}</div>`;
    const m = modal(ko ? '실시간 성장 투자' : 'Live investment', body, [{ label: T('btn.close'), onClick: closeModal }]);
    m.querySelectorAll('[data-growth]').forEach(el => el.onclick = () => {
      const kind = el.dataset.growth, r = g.investGrowth(kind);
      if (!r.ok) { toast(r.reason === 'cash' ? (ko ? `자금이 ${r.cost}c 필요합니다` : `Need ${r.cost}c`) : (ko ? '지금은 투자할 수 없습니다' : 'Cannot invest now')); return; }
      SFX.buy(); g.takeEvents(); scene.sync(g, { animate: true }); saveGame(); renderAll(); showGrowth();
    });
  }
  function showGrowth() {
    if (!game || game.phase !== 'play') return;
    const g = game, ko = I18n.lang === 'ko';
    const info = {
      marketing: ['📣', ko ? '홍보' : 'Marketing', ko ? `캠페인 +${D.GROWTH.marketing.campaign.per}건` : `Campaign +${D.GROWTH.marketing.campaign.per}`],
      fleet: ['🚚', ko ? '차량' : 'Fleet', ko ? '계약마다 배차 +1' : '+1 call / contract'],
      warehouse: ['🏭', ko ? '창고' : 'Warehouse', ko ? '보관 공간 +6' : '+6 storage'],
      automation: ['⚙', ko ? '자동화' : 'Automation', ko ? '배차비 -4% · 인건비 -8%' : 'Fees -4% · labor -8%'],
      branding: ['✦', ko ? '브랜드' : 'Brand', ko ? '화물값 +3% · 특급 확률 +4%' : 'Value +3% · premium +4%'],
      coldchain: ['❄', ko ? '저온 물류' : 'Cold chain', ko ? '냉장 +2 · 냉동 +1' : 'Cold +2 · frozen +1'],
    };
    const kinds = ['marketing', 'fleet', 'warehouse', 'automation', 'branding'].concat(g.shows('cold') ? ['coldchain'] : []);
    const nameOf = k => info[k][1];
    const current = k => {
      const lv = g.growth[k] || 0, d = D.GROWTH[k];
      if (k === 'marketing') return lv ? (ko ? `캠페인 한 번에 ${lv * d.campaign.per}건` : `${lv * d.campaign.per} parcels per campaign`) : (ko ? '아직 캠페인을 못 연다' : 'No campaign yet');
      if (k === 'fleet') return ko ? `추가 배차 ${lv}대` : `${lv} extra calls`;
      if (k === 'warehouse') return ko ? `현재 ${g.warehouse.cap}칸` : `${g.warehouse.cap} cells now`;
      if (k === 'automation') return ko ? `비용 절감 ${lv * d.feeCut * 100}%` : `${lv * d.feeCut * 100}% fee cut`;
      if (k === 'branding') return ko ? `화물값 +${lv * d.reward * 100}%` : `Cargo value +${lv * d.reward * 100}%`;
      return ko ? `냉장 ${g.warehouse.cold} · 냉동 ${g.warehouse.frozen || 0}` : `Cold ${g.warehouse.cold} · frozen ${g.warehouse.frozen || 0}`;
    };
    const cards = kinds.map(kind => {
      const p = g.growthPlan(kind), n = info[kind], max = p.cost == null;
      const lock = p.locked ? p.missing.map(([k, lv]) => `${nameOf(k)} Lv.${lv}`).join(' + ') : '';
      const dots = Array.from({ length: p.max }, (_, i) => `<i class="${i < p.level ? 'on' : ''}"></i>`).join('');
      return `<button class="growth-card ${max ? 'max' : ''} ${p.locked ? 'locked' : ''}" data-growth="${kind}" ${max || p.locked ? 'disabled' : ''}>
        <span class="growth-icon">${n[0]}</span><span class="growth-copy"><b>${n[1]} <em>Lv.${p.level}</em></b><span>${current(kind)}</span></span>
        <span class="growth-buy"><span class="growth-dots">${dots}</span><b>${p.locked ? '🔒' : max ? 'MAX' : p.cost + 'c'}</b><small>${p.locked ? lock : max ? (ko ? '완성' : 'Complete') : n[2]}</small></span>
      </button>`;
    }).join('');
    const total = kinds.reduce((s, k) => s + (g.growth[k] || 0), 0);
    const rc = g.realtimeContracts();
    const hireCards = rc.map(it => { const car = D.CARRIERS[it.carrier]; return `<button class="growth-card" data-hire="${it.carrier}">
        <span class="growth-icon">${car.badge || '🚚'}</span><span class="growth-copy"><b>${esc(car.name)}</b><span>${T('call.size', { min: car.sizeMin, max: car.sizeMax })} · ${T('fmt.cells', { n: car.cap })}</span></span>
        <span class="growth-buy"><b>${it.price}c</b><small>${it.upgrade ? T('hire.upgrade', { name: it.ownedName }) : T('hire.btn')}</small></span>
      </button>`; }).join('');
    const hireSection = rc.length ? `<div class="growth-head" style="margin-top:14px"><span>${T('hire.title')}</span></div><div class="growth-tip">${T('hire.desc')}</div><div class="growth-grid">${hireCards}</div>` : '';
    // 홍보 캠페인 — 창고가 비었을 때 직접 물량을 끌어오는 자리. 투자 화면 맨 위에 둔다
    const cp = g.campaignPlan();
    const campSection = cp.level ? `${g.level ? '' : `<div class="growth-head" style="margin-top:4px"><span>${T('camp.title')}</span></div>`}
      <div class="growth-tip">${T('camp.desc')}</div>
      <div class="growth-grid"><button class="growth-card" id="camp-go" ${cp.ready && g.cash >= cp.cost ? '' : 'disabled'}>
        <span class="growth-icon">📣</span><span class="growth-copy"><b>${T('camp.btn')}</b><span>${cp.used ? T('camp.used') : T('camp.effect', { n: cp.parcels, days: cp.days })}</span></span>
        <span class="growth-buy"><b>${cp.cost}c</b></span></button></div>` : '';
    const body = `<div class="growth-head"><span>${ko ? '성장 단계' : 'Growth'} <b>Lv.${total}</b></span><span class="growth-cash">${g.cash}c</span></div><div class="growth-tip">${ko ? '투자할수록 창고와 트럭이 실제로 바뀝니다.' : 'Every upgrade visibly changes your depot and trucks.'}</div>${campSection}<div class="growth-grid">${cards}</div>${hireSection}`;
    const m = modal(g.level ? T('camp.button') : (ko ? '캠페인 · 사업 확장' : 'Campaign · Growth'), g.level ? campSection : body, [{ label: T('btn.close'), onClick: closeModal }]);
    storyCheck({ kind: 'modal', modal: 'growth', ready: cp.ready && g.cash >= cp.cost });
    m.querySelectorAll('[data-growth]').forEach(el => el.onclick = () => {
      const kind = el.dataset.growth, r = g.investGrowth(kind);
      if (!r.ok) { toast(r.reason === 'cash' ? (ko ? `${r.cost}c가 필요합니다` : `Need ${r.cost}c`) : (ko ? '아직 잠겨 있습니다' : 'Still locked')); return; }
      SFX.buy(); rewardBurst(ko ? `${info[kind][1]} Lv.${r.level}` : `${info[kind][1]} Lv.${r.level}`, Math.min(3, Math.ceil(r.level / 2)));
      g.takeEvents(); scene.sync(g, { animate: true }); saveGame(); renderAll(); showGrowth();
    });
    m.querySelectorAll('[data-hire]').forEach(el => el.onclick = () => { SFX.click(); hireContractFlow(el.dataset.hire, showGrowth); });
    const cg = m.querySelector('#camp-go');
    if (cg) cg.onclick = () => {
      const r = g.runCampaign();
      if (!r.ok) { toast(r.reason === 'cash' ? T('camp.needCash', { n: r.cost }) : T('camp.used')); return; }
      SFX.buy(); toast(T('camp.toast', { n: r.n, days: r.days }), 2600);
      g.takeEvents(); saveGame(); closeModal(); renderAll();
      storyCheck({ kind: 'turn' });
    };
  }
  // 실시간 계약: 슬롯을 골라 즉시 고용한다 (마켓의 chooseSlot과 같은 카드 목록, 단 game.hireContract 로 처리)
  function hireContractFlow(carrier, back) {
    const car = D.CARRIERS[carrier], price = game.hireContractPrice(carrier);
    const body = `<p style="font-size:12px;color:var(--dim)">${T('slot.pickReplace')}</p>` + game.contracts.slice(0, game.visibleSlots()).map((c, s) => {
      if (!c) return `<div class="card" data-s="${s}"><div class="t">${T('err.emptySlot')}</div><div class="d">${T('slot.emptyHint')}</div></div>`;
      const tb = trustBar(game, c.carrier);
      return `<div class="card" data-s="${s}"><div class="t">${esc(game.contractName(c))}</div><div class="d">${T('mk.contractLine', { calls: c.calls, max: c.maxCalls, cap: game.baseCapacity(c) })}${tb ? ` · ${tb}` : ''}</div></div>`;
    }).join('');
    const m = modal(`${car.badge || ''} ${esc(car.name)}`, body, [{ label: T('btn.cancel'), onClick: back }], T('hire.confirmSub', { price }));
    m.querySelectorAll('.card').forEach(el => el.onclick = () => {
      const s = +el.dataset.s, r = game.hireContract(carrier, s);
      if (!r.ok) { toast(r.msg); return; }
      SFX.buy(); saveGame(); scene.sync(game, { animate: true }); renderAll(); back();
    });
  }
  function showMenu() {
    const g = game, R = g.rules;
    const info = !g.shows('perks') ? `<div class="d" style="font-size:12px;margin-bottom:6px">${g.company.icon} ${esc(g.companyName())}</div>`
      : `<div class="d" style="font-size:12px;margin-bottom:6px">${esc(M.SCENARIOS[g.cfg.scenario].name)} · ${g.company.icon} ${esc(g.company.name)}<br><span style="color:var(--green)">＋ ${esc(g.company.passive)}</span><br><span style="color:var(--orange)">－ ${esc(g.company.weakness)}</span>${g.perks.length ? `<br>${T('company.perks')}: ` + g.perks.map(p => esc(M.PERKS[p].name + ' — ' + M.PERKS[p].desc)).join(`<br>${T('company.perks')}: `) : ''}${(g.cfg.variants || []).length ? `<br>${T('prep.variants')}: ` + g.cfg.variants.map(v => esc(M.DAILY_VARIANTS[v].name + ' — ' + M.DAILY_VARIANTS[v].desc)).join(', ') : ''}</div>`;
    const m = modal(T('menu.title'), `${info}<p style="font-size:12px;color:var(--dim)">${T('menu.autosave')}</p><label style="display:flex;align-items:center;gap:8px;font-size:12px">${T('menu.volume')} <input type="range" id="vol" min="0" max="1" step="0.05" value="${opts.musicVol}" style="flex:1"></label>`, [
      { label: T('menu.continue'), cls: 'primary', onClick: closeModal },
      ...(g.shows('customers') ? [{ label: T('company.customers'), onClick: () => showCustomers(showMenu) }] : []),
      ...(g.shows('market') ? [{ label: T('title.records'), onClick: () => showLog(showMenu) }] : []),
      { label: T('btn.help'), onClick: () => showHelp(showMenu) },
      { label: T('opt.sound', { v: T(opts.sound ? 'opt.turnOff' : 'opt.turnOn') }), onClick: () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); saveOpts(); closeModal(); } },
      { label: T('opt.music', { v: T(opts.music ? 'opt.turnOff' : 'opt.turnOn') }), onClick: () => { opts.music = !opts.music; BGM.setEnabled(opts.music); saveOpts(); closeModal(); } },
      { label: T('menu.story', { v: T(g.story && !g.story.off ? 'opt.turnOff' : 'opt.turnOn') }), onClick: () => { if (!g.story) g.story = { seen: [], notes: [] }; g.story.off = !g.story.off; saveGame(); closeModal(); if (!g.story.off && g.phase === 'play') storyCheck({ kind: 'turn' }); } },
      ...(g.shows('weather') ? [{ label: T('menu.sms', { v: T(opts.sms ? 'opt.turnOff' : 'opt.turnOn') }), onClick: () => { opts.sms = !opts.sms; saveOpts(); closeModal(); } }] : []),
      { label: T('menu.abandon'), cls: 'warn', onClick: () => askConfirm(T('menu.abandonConfirm'), () => { Store.remove(SAVE_KEY); game = null; showTitle(); }, T('menu.abandonBtn'), showMenu) },
    ]);
    m.querySelector('#vol').oninput = e => { opts.musicVol = +e.target.value; BGM.setVolume(opts.musicVol); saveOpts(); };
  }

  // ---------- init ----------
  // index.html 의 고정 라벨 (언어 변경 시 다시 호출)
  function applyStaticText() {
    document.title = T('title.name') + ': ' + T('title.sub');
    document.documentElement.lang = I18n.lang;
    $('#hud-cash-lbl').textContent = T('hud.cashLbl'); $('#usage-lbl').textContent = T('common.warehouse'); $('#cold-lbl').textContent = D.ATTRS.cold.name;
    $('#invest-btn').textContent = T('camp.button'); $('#menu-btn').textContent = T('menu.title');
    if (scene && scene.relabel) scene.relabel();
  }
  function init() {
    scene = new Scene3D($('#scene'));
    scene.setOnInspect(showSceneInspect);
    applyStaticText();
    for (let i = 0; i < D.CONTRACT_SLOTS; i++) $('#c' + i).onclick = () => onContractTap(i);
    $('#cself').onclick = () => onContractTap(SELF);
    $('#hud-cash-box').onclick = () => { SFX.click(); hudDueOpen = !hudDueOpen; renderAll(); };
    $('#wait-btn').onclick = () => doWait(null);
    $('#invest-btn').onclick = () => { if (game) { SFX.click(); showGrowth(); } };
    $('#menu-btn').onclick = () => { if (game) { SFX.click(); showMenu(); } };
    $('#hud-month').onclick = () => { if (game) { SFX.click(); showCalendar(closeModal); } };
    document.addEventListener('touchstart', () => { SFX.resume(); BGM.resume(); }, { once: true });
    document.addEventListener('click', () => { SFX.resume(); BGM.resume(); }, { once: true });
    BGM.preload(['title', 'warehouse']);
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', () => { if ($('#modal-root').classList.contains('show') && game && game.phase === 'play') closeModal(); });
    }
    // 1장 스튜디오 → 2장 타이틀. 2장은 별도 화면이 아니라 showTitle() 그 자체다
    if (window.Splash) Splash.play(showTitle); else showTitle();
  }
  window.PT = { get game() { return game; }, get busy() { return busy; }, get scene() { return scene; }, Profile, renderAll, saveGame, prep, startRun, showTitle };
  init();
})();
