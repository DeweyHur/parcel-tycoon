// UI / 진행 제어
(function () {
  const D = window.DATA, M = window.META, I18n = window.I18n, T = I18n.t;
  const $ = s => document.querySelector(s);
  const SAVE_KEY = 'save_v2', OPT_KEY = 'opts_v1';
  let game = null, scene = null, busy = false;
  if (typeof window !== 'undefined') Object.defineProperty(window, '__game', { get: () => game });
  const opts = Object.assign({ sound: true, music: true, musicVol: 0.6 }, Store.get(OPT_KEY) || {});
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
    m.innerHTML = `<h2>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</h2><div class="body">${bodyHtml}</div>` +
      (buttons && buttons.length ? `<div class="foot">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${esc(b.label)}</button>`).join('')}</div>` : '');
    m.querySelectorAll('.foot .btn').forEach(btn => btn.onclick = () => { SFX.resume(); SFX.click(); const b = buttons[+btn.dataset.i]; if (b.onClick) b.onClick(); });
    $('#modal-root').classList.add('show');
    m.querySelector('.body').scrollTop = 0;
    return m;
  }
  // window.confirm은 웹뷰·아티팩트 샌드박스에서 막히므로 자체 확인 모달
  function askConfirm(msg, onYes, yesLabel = T('btn.ok')) { modal(T('btn.ok'), `<p>${esc(msg)}</p>`, [{ label: T('btn.cancel'), onClick: closeModal }, { label: yesLabel, cls: 'warn', onClick: () => { closeModal(); onYes(); } }]); }
  function closeModal() { $('#modal-root').classList.remove('show'); $('#modal').innerHTML = ''; }

  // ---------- title ----------
  function showTitle() {
    const save = loadSave(), P = Profile.get();
    const nUnlocked = P.unlocked.companies.length + P.unlocked.perks.length + P.unlocked.scenarios.length;
    const nTotal = Object.keys(M.COMPANIES).length + Object.keys(M.PERKS).length + Object.keys(M.SCENARIOS).length;
    const body = `<div class="title"><h1>${T('title.name')}</h1><div class="sub">${T('title.sub')}</div>
      ${save ? `<button class="btn primary" id="t-continue">${T('title.continue')} <small style="color:var(--dim)">(${esc(M.SCENARIOS[save.cfg.scenario].name)} · ${T('fmt.monthTurn', { m: save.month, t: save.turn })})</small></button>` : ''}
      <button class="btn gold" id="t-new">${T('title.new')}</button>
      <button class="btn" id="t-codex">${T('title.codex')} <small style="color:var(--dim)">${T('title.codexSub', { a: nUnlocked, b: nTotal, c: Object.keys(P.achievements).length, d: Object.keys(M.ACHIEVEMENTS).length })}</small></button>
      <button class="btn" id="t-rec">${T('title.records')} <small style="color:var(--dim)">${T('title.recordsSub', { best: P.stats.bestScore, w: P.stats.clears, l: P.stats.runs - P.stats.clears })}</small></button>
      <button class="btn" id="t-help">${T('title.help')}</button>
      <div style="display:flex;gap:8px"><button class="btn" id="t-sound" style="flex:1">${T('opt.sound', { v: T(opts.sound ? 'opt.on' : 'opt.off') })}</button><button class="btn" id="t-music" style="flex:1">${T('opt.music', { v: T(opts.music ? 'opt.on' : 'opt.off') })}</button></div>
      <button class="btn" id="t-lang">${T('opt.lang')}: ${I18n.languages().map(l => l.id === I18n.lang ? `<b>${esc(l.name)}</b>` : esc(l.name)).join(' / ')}</button></div>`;
    const m = modal(T('title.modal'), body, null, 'v0.3 meta');
    if (save) m.querySelector('#t-continue').onclick = () => { SFX.resume(); SFX.select(); game = Game.fromJSON(save); closeModal(); startPlay(); };
    m.querySelector('#t-new').onclick = () => { SFX.resume(); SFX.select(); if (save) { askConfirm(T('title.confirmNew'), () => { Store.remove(SAVE_KEY); showTitle(); $('#t-new').click(); }, T('title.newShort')); return; } showScenarioSelect(); };
    m.querySelector('#t-codex').onclick = () => { SFX.click(); showCodex('companies', showTitle); };
    m.querySelector('#t-help').onclick = () => { SFX.click(); showHelp(showTitle); };
    m.querySelector('#t-rec').onclick = () => { SFX.click(); showRecords(showTitle); };
    m.querySelector('#t-sound').onclick = () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); saveOpts(); SFX.resume(); SFX.click(); showTitle(); };
    m.querySelector('#t-music').onclick = () => { opts.music = !opts.music; BGM.setEnabled(opts.music); saveOpts(); SFX.resume(); BGM.resume(); SFX.click(); showTitle(); };
    m.querySelector('#t-lang').onclick = () => { const ids = I18n.languages().map(l => l.id); I18n.setLang(ids[(ids.indexOf(I18n.lang) + 1) % ids.length]); SFX.click(); applyStaticText(); showTitle(); };
    BGM.play('title');
  }

  // ---------- 런 준비: 시나리오 → 회사 → 퍽 ----------
  function unlockText(achId) { const a = M.ACHIEVEMENTS[achId]; if (!a) return '🔒'; let pr = ''; try { if (a.prog) { const P = Profile.get(); const [h, n] = a.prog(P.stats, P); pr = ` (${Math.min(h, n)}/${n})`; } } catch (e) { } return `🔒 ${a.name}: ${a.desc}${pr}`; }
  const TIER_NAMES = () => [T('tier.0'), T('tier.1'), T('tier.2'), T('tier.3')];
  const prep = { scenario: 'standard', company: 'local', perks: [], insurer: 'sturdy', difficulty: 'normal' };
  function showScenarioSelect() {
    const P = Profile.get(), dc = Game.dailyConfig ? null : null;
    const daily = window.dailyConfig(today());
    const cards = Object.keys(M.SCENARIOS).map(id => {
      const s = M.SCENARIOS[id], un = P.unlocked.scenarios.includes(id);
      let extra = '';
      if (id === 'daily') extra = `<div class="d">${T('prep.today')}: ${esc(M.COMPANIES[daily.company].name)} · ${daily.variants.map(v => esc(M.DAILY_VARIANTS[v].name)).join(' + ')}${Profile.dailyDoneToday(daily.date) ? ` · <b>${T('prep.dailyDone')}</b>` : ''}</div>`;
      const rec = P.records[id]; const best = rec ? Math.max(0, ...Object.values(rec).map(r => r.bestScore)) : 0;
      return `<div class="card ${un ? '' : 'dis'} ${prep.scenario === id ? 'sel' : ''}" data-id="${id}"><div class="t"><span>${s.icon} ${esc(s.name)} <small style="color:var(--dim)">${s.months >= 99 ? '∞' : T('fmt.months', { n: s.months })}</small></span><span class="price">${best ? T('fmt.pts', { n: best }) : ''}</span></div>
        <div class="d">${esc(s.desc)}<br>${T('prep.win')}: ${esc(s.win)} · ${T('prep.recommend')}: ${esc(s.recommend)}</div>${un ? extra : `<div class="d">${esc(unlockText(s.unlock))}</div>`}</div>`;
    }).join('');
    const diffUn = id => !M.DIFFICULTIES[id].unlock || P.achievements[M.DIFFICULTIES[id].unlock];
    if (!diffUn(prep.difficulty)) prep.difficulty = 'normal';
    const diffRow = `<div class="diffrow">${Object.keys(M.DIFFICULTIES).map(id => { const d = M.DIFFICULTIES[id], un = diffUn(id); return `<button class="btn small ${prep.difficulty === id ? 'on' : ''} ${un ? '' : 'dis'}" data-diff="${id}" title="${esc(d.desc)}">${d.icon} ${d.name}</button>`; }).join('')}</div><div class="d" style="font-size:11px;color:var(--dim);margin-bottom:6px">${esc(M.DIFFICULTIES[prep.difficulty].desc)}${prep.scenario === 'daily' ? ` · ${T('prep.dailyNormal')}` : ''}</div>`;
    const m = modal(T('prep.scenarioTitle'), `<div class="perk-count">${T('prep.step1')}</div>${diffRow}${cards}`, [{ label: T('btn.title'), onClick: showTitle }, { label: T('prep.nextCompany'), cls: 'primary', onClick: () => { if (prep.scenario === 'daily') { prep.company = daily.company; showPerkSelect(daily); } else showCompanySelect(); } }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.id; if (!P.unlocked.scenarios.includes(id)) { toast(unlockText(M.SCENARIOS[id].unlock), 2500); return; } SFX.select(); prep.scenario = id; showScenarioSelect(); });
    m.querySelectorAll('[data-diff]').forEach(el => el.onclick = () => { const id = el.dataset.diff; if (!diffUn(id)) { toast(unlockText(M.DIFFICULTIES[id].unlock), 2500); return; } SFX.select(); prep.difficulty = id; showScenarioSelect(); });
  }
  function companyInfo(co, id) {
    const wh = co.warehouse ? T('prep.warehouse', { cap: co.warehouse.cap, cold: co.warehouse.cold, xl: co.warehouse.xl }) : T('prep.warehouseRandom');
    const ct = co.contracts ? co.contracts.map(c => `${D.CARRIERS[c.carrier].short}${c.grade === 'trusted' ? '★' : ''} ${T('fmt.trucks', { n: c.calls != null ? c.calls : D.CARRIERS[c.carrier].trucks + (D.GRADES[c.grade || 'normal'].calls || 0) })}`).join(', ') : T('prep.contractsRandom');
    return `<div class="d">${wh} · ${T('hud.cash')} ${co.cash}<br>${T('prep.contracts')}: ${esc(ct)}</div><div class="d" style="color:var(--green)">＋ ${esc(co.passive)}</div><div class="d" style="color:var(--orange)">－ ${esc(co.weakness)}</div>`;
  }
  function showCompanySelect() {
    const P = Profile.get();
    if (!P.unlocked.companies.includes(prep.company)) prep.company = 'local';
    const cards = Object.keys(M.COMPANIES).sort((x, y) => (M.COMPANIES[x].tier || 0) - (M.COMPANIES[y].tier || 0)).map(id => {
      const co = M.COMPANIES[id], un = P.unlocked.companies.includes(id);
      const rec = (P.records[prep.scenario] || {})[id];
      return `<div class="card ${un ? '' : 'dis'} ${prep.company === id ? 'sel' : ''}" data-id="${id}"><div class="t"><span>${co.icon} ${esc(co.name)} <small style="color:var(--dim)">${esc(co.tag)}</small></span><span class="price">${rec ? T('fmt.pts', { n: rec.bestScore }) : ''}</span></div>
        ${un ? companyInfo(co, id) : `<div class="d">${esc(unlockText(co.unlock))}</div>`}</div>`;
    }).join('');
    const m = modal(T('prep.companyTitle'), `<div class="perk-count">${T('prep.step2')} — ${esc(M.SCENARIOS[prep.scenario].name)}</div>${cards}`, [{ label: T('btn.back'), onClick: showScenarioSelect }, { label: T('prep.nextPerk'), cls: 'primary', onClick: () => showPerkSelect(null) }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.id; if (!P.unlocked.companies.includes(id)) { toast(unlockText(M.COMPANIES[id].unlock), 2500); return; } SFX.select(); prep.company = id; showCompanySelect(); });
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
    const noIns = !!(co.mods && co.mods.noInsurance);
    const insCards = `<div style="font-size:12px;color:var(--gold);margin:10px 0 4px">${T('prep.insuranceHead')}</div>` + (noIns ? `<div class="d" style="font-size:12px;color:var(--dim)">${T('prep.startupNoIns')}</div>` : Object.keys(M.INSURERS).map(id => { const I = M.INSURERS[id]; const fee = Math.max(0, Math.round((I.fee + ((co.mods && co.mods.premiumDelta || {})[id] || 0)) * ((co.mods && co.mods.premiumMult) || 1) * ((M.SCENARIOS[prep.scenario].mods || {}).premiumMult || 1))); return `<div class="card ins ${prep.insurer === id ? 'sel' : ''}" data-ins="${id}"><div class="t"><span>${I.icon} ${esc(I.name)}</span><span class="price">${fee ? T('fmt.perMonth', { n: fee }) : '0c'}</span></div><div class="d">${esc(I.desc)}${I.fans.length ? `<br><span style="color:var(--green)">${T('prep.fans', { list: I.fans.map(f => M.CUSTOMERS[f].icon + M.CUSTOMERS[f].name).join(' ') })}</span>` : ''}</div></div>`; }).join(''));
    const m = modal(T('prep.perkTitle'), head + groups + insCards, [{ label: T('btn.back'), onClick: daily ? showScenarioSelect : showCompanySelect }, { label: T('prep.start'), cls: 'primary', onClick: () => startRun(daily) }]);
    m.querySelectorAll('.card.ins').forEach(el => el.onclick = () => { SFX.select(); prep.insurer = el.dataset.ins; showPerkSelect(daily); });
    m.querySelectorAll('.card:not(.ins)').forEach(el => el.onclick = () => {
      const id = el.dataset.id;
      if (!P.unlocked.perks.includes(id)) { toast(unlockText(M.PERKS[id].unlock), 2500); return; }
      if (prep.perks.includes(id)) { prep.perks = prep.perks.filter(p => p !== id); SFX.cancel(); }
      else { const c = perkConflict(id); if (c) { toast(c); return; } if (prep.perks.length >= slots) { toast(T('prep.slotFull', { n: slots })); return; } prep.perks.push(id); SFX.select(); }
      showPerkSelect(daily);
    });
  }
  function startRun(daily) {
    const cfg = { scenario: prep.scenario, company: prep.company, perks: prep.perks.slice(), variants: [], insurer: prep.insurer, difficulty: prep.difficulty, prep: true };
    if (daily) { cfg.seed = daily.seed; cfg.variants = daily.variants; cfg.date = daily.date; cfg.company = daily.company; }
    game = new Game(cfg);
    closeModal(); startPlay();
  }

  // ---------- play ----------
  function startPlay() {
    game.takeEvents();
    scene.sync(game, { animate: true });
    saveGame();
    renderAll();
    checkPhase();
  }
  function updateMusic() {
    if (!game) { BGM.play('title'); return; }
    const g = game;
    if (g.phase === 'play') BGM.play(g.usage() > 0.9 || g.stress >= 16 ? 'overflow' : 'warehouse', { fade: 1.2 });
    else if (g.phase === 'market') BGM.play('market');
  }
  function renderAll() {
    if (!game) return;
    const g = game, R = g.rules;
    updateMusic();
    $('#hud-month').textContent = T('fmt.monthN', { n: g.month });
    $('#hud-turn').textContent = T('hud.turn', { t: g.turn, max: D.TURNS_PER_MONTH });
    $('#hud-cash').textContent = g.cash;
    $('#stress-num').textContent = `${g.stress}/${R.gameoverStress}`;
    $('#stress-label').textContent = g.stressState();
    const gauge = $('#stress-gauge'); gauge.querySelector('i').style.width = Math.min(100, g.stress / R.gameoverStress * 100) + '%';
    gauge.className = 'gauge ' + (g.stress >= 16 ? 'crisis' : g.stress >= 11 ? 'danger' : g.stress >= 6 ? 'warn' : '');
    $('#hud-perks').innerHTML = [`<a class="hl" data-pop="company">${g.difficulty && (g.cfg.difficulty || 'normal') !== 'normal' ? g.difficulty.icon + esc(g.difficulty.name) + ' · ' : ''}${g.company.icon} ${esc(g.company.name)}</a>`, ...g.perks.map(p => `<a class="hl" data-pop="perk" data-id="${p}">${esc(M.PERKS[p].name)}</a>`), `<a class="hl" data-pop="insurer">${g.insurer !== 'none' ? M.INSURERS[g.insurer].icon + esc(M.INSURERS[g.insurer].name) : esc(M.INSURERS.none.name)}</a>`].join(' · ') + (g.strikeCarrier ? ` · ✊${D.CARRIERS[g.strikeCarrier].short} ${T('hud.strike')}` : '');
    $('#hud-perks').querySelectorAll('[data-pop]').forEach(el => el.onclick = () => { SFX.click(); if (el.dataset.pop === 'company') showCompanyInfo(); else if (el.dataset.pop === 'insurer') showInsurance(closeModal); else { const pk = M.PERKS[el.dataset.id]; modal(pk.name, `<p>${esc(pk.desc)}</p><p style="color:var(--dim);font-size:12px">${esc(T('hud.familyPerk', { family: M.PERK_FAMILIES[pk.family] }))}</p>`, [{ label: T('btn.close'), onClick: closeModal }]); } });
    const used = g.usedVolume(), cap = g.warehouse.cap, pct = used / cap * 100;
    const bu = $('#bar-usage'); bu.querySelector('i').style.width = Math.min(100, pct) + '%'; $('#usage-txt').textContent = `${used}/${cap} (${Math.round(pct)}%)`;
    bu.className = 'bar usage ' + (pct > 100 ? 'over' : pct > 90 ? 'danger' : pct > 75 ? 'caution' : pct > 60 ? 'eff' : '');
    const cu = g.coldUsed(), cc = g.warehouse.cold; const bc = $('#bar-cold'); bc.querySelector('i').style.width = cc ? Math.min(100, cu / cc * 100) + '%' : '100%'; const fz = g.warehouse.frozen || 0, fu = g.frozenUsed(); $('#cold-txt').textContent = (cc ? `${cu}/${cc}` : T('common.none')) + (fz || fu ? ` · ❆ ${fu}/${fz}` : ''); bc.className = 'bar cold ' + (cu > cc || fu > fz ? 'over' : '');
    const up = g.upcoming();
    $('#upcoming').innerHTML = `<span>${T('hud.upcoming')}</span>` + up.map(u => u.specs ? `<span class="chip up ${u.heat ? 'heat' : ''}" data-turn="${u.turn}">${T('fmt.turnN', { n: u.turn })}${u.heat ? '🌡' : ''}${u.burst ? '⚡' : ''}: ${u.specs.map(s => `<i style="background:${D.PARCEL_TYPES[s.type].css}"></i>${D.PARCEL_TYPES[s.type].short}${s.size}`).join(' ')}</span>` : `<span class="chip none">${u.turn > D.TURNS_PER_MONTH ? T('hud.monthEnd') : '-'}</span>`).join('');
    const wxNow = g.weatherNow(), W = M.WEATHER[wxNow];
    const fc = up.filter(u => u.weather && u.turn > g.turn).map(u => `${T('fmt.turnN', { n: u.turn })} ${M.WEATHER[u.weather].icon}`).join(' · ');
    $('#upcoming').innerHTML = `<span class="chip wx ${wxNow}" title="${esc(W.desc)}">${W.icon} ${W.name}${fc ? ` <small style="color:var(--dim)">→ ${fc}</small>` : ''}</span>` + $('#upcoming').innerHTML;
    $('#upcoming').querySelectorAll('.chip.wx').forEach(el => el.onclick = () => { SFX.click(); showWeatherInfo(); });
    $('#upcoming').querySelectorAll('.chip.up').forEach(el => el.onclick = () => { SFX.click(); showUpcomingInfo(+el.dataset.turn); });
    $('#wxline').onclick = () => { SFX.click(); showWeatherInfo(); };
    $('#wxline').className = 'wxline ' + wxNow; $('#wxline').innerHTML = wxNow !== 'sunny' ? `${W.icon} ${esc(W.desc)}` : ''; $('#wxline').hidden = wxNow === 'sunny';
    if (g.items.transitCert || g.items.yardIns === g.month || g.items.customsBond === g.month) $('#upcoming').innerHTML += `<span class="chip">${[g.items.transitCert ? `${M.INS_ITEMS.transitCert.icon} ${esc(M.INS_ITEMS.transitCert.name)} ${g.items.transitCert}` : '', g.items.yardIns === g.month ? `${M.INS_ITEMS.yardIns.icon} ${esc(M.INS_ITEMS.yardIns.name)}` : '', g.items.customsBond === g.month ? `${M.INS_ITEMS.customsBond.icon} ${esc(M.INS_ITEMS.customsBond.name)}` : ''].filter(Boolean).join(' · ')}</span>`;
    if (g.outdoorVolume() > 0) $('#upcoming').innerHTML += `<span class="chip heat">${T('hud.outdoor', { vol: g.outdoorVolume(), n: g.outdoorParcels().length, storage: g.storage.some(s => s.outdoor) ? T('hud.outdoorStorage') : '', pct: Math.round(g.theftProb() * 100) })}</span>`;
    renderOffer();
    renderParcels($('#parcels'), g.parcels, null);
    $('#parcels').querySelectorAll('.parcel[data-id]').forEach(el => el.onclick = () => { if (busy) return; SFX.click(); showParcelDetail(+el.dataset.id); });
    if (g.storage.length) $('#parcels').insertAdjacentHTML('afterbegin', g.storage.map(s => { const K = M.STORAGE_KINDS[s.kind], cu = M.CUSTOMERS[s.customer]; return `<div class="parcel storage ${s.outdoor ? 'overdue' : ''}" data-sid="${s.id}"><div class="sw" style="background:#a8845a"></div><div>${K.icon} <span class="nm">${esc(K.name)}</span> ${T('fmt.cells', { n: g.storageVol(s) })} · ${cu.icon}${esc(cu.name)}${s.perTurn ? ` · ${T('log.storagePerTurn', { perTurn: s.perTurn })}` : ''}</div><div class="st">${s.outdoor ? `${T('hud.outdoorTag')} · ` : ''}${T('storage.left', { n: s.left })}</div></div>`; }).join(''));
    $('#parcels').querySelectorAll('.parcel.storage').forEach(el => el.onclick = () => showStorage(+el.dataset.sid));
    for (let i = 0; i < D.CONTRACT_SLOTS; i++) {
      const btn = $('#c' + i), c = g.contracts[i];
      if (!c) { btn.innerHTML = `<div class="nm">${T('err.emptySlot')}</div><div class="sub">${T('hud.buyInMarket')}</div>`; btn.disabled = true; btn.className = 'btn contract'; continue; }
      const car = D.CARRIERS[c.carrier], vcap = g.vehicleCap(c), elig = g.eligibleParcels(c), lv = g.trustLevel(c);
      const can = g.canCall(c) && !busy, struck = g.isStruck(c);
      btn.disabled = !can; btn.className = 'btn contract' + (can ? ' ready' : '');
      const spare = c.calls === 0 && R.spareCall && !g.monthStats.spareUsed;
      const caps = g.contractCaps(c), fee = g.truckFee(c), simul = g.simulMax(c), eligVol = elig.reduce((s, p) => s + p.size, 0);
      const pd = g.trustPerk(c.carrier, 'delay'), delay = pd != null ? pd : (car.delay || 0);
      btn.innerHTML = `<div class="nm"><span>${car.badge && car.badge !== '🚚' ? car.badge : ''}${esc(car.short)}${gradeBadge(c.grade)}${caps.length ? ` <small>${attrIcons(caps)}</small>` : ''}</span><span class="calls ${c.calls === 0 ? 'zero' : ''}">${struck ? T('hud.strike') : spare ? T('hud.spare') : T('fmt.trucks', { n: c.calls })}</span></div>
        <div class="sub">${T('hud.contractSub', { cap: vcap, fee, elig: elig.length, vol: eligVol })}${simul > 1 ? ` · ×${simul}` : ''}${delay ? ` · ⏱${delay}` : ''}${c.enh.regular && !c.freeUsedMonth ? ` · ${T('hud.regular')}` : ''} ${trustBar(g, c.carrier)}</div>`;
    }
    const wb = $('#wait-btn'); wb.disabled = busy || g.phase !== 'play';
    const f = g.forecast();
    const warn = [];
    if (f.overdue) warn.push(T('wait.overdue', { n: f.overdue })); if (f.spoil) warn.push(T('wait.spoil', { n: f.spoil })); if (f.frozenOver) warn.push(T('wait.frozenOver', { n: f.frozenOver }));
    wb.className = 'btn primary' + (f.used > f.cap || f.spoil || f.frozenOver ? ' danger' : '');
    wb.innerHTML = `${T('wait.btn')}<small>${f.monthEnd ? T('hud.monthEnd') : T('wait.next', { used: f.used, cap: f.cap, over: f.used > f.cap ? T('wait.over') : '' })}${warn.length ? ' · ' + warn.join(' ') : ''}</small>`;
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
    const known = []; for (let t = 1; t <= D.TURNS_PER_MONTH; t++) { const k = t <= g.turn ? 'past' : t <= g.turn + g.rules.forecastTurns ? 'known' : 'unknown'; known.push(`<span class="chip wx ${k === 'unknown' ? '' : g.weatherAt(t)} ${t === g.turn ? 'now' : ''}" style="${k === 'past' ? 'opacity:.5' : ''}">${T('fmt.turnN', { n: t })} ${k === 'unknown' ? '?' : M.WEATHER[g.weatherAt(t)].icon}</span>`); }
    const rows = Object.keys(M.WEATHER).map(k => { const W = M.WEATHER[k]; return `<div class="ttrow ${k === now ? 'on' : ''}"><span class="lv">${W.icon}</span><span class="ef"><b>${esc(W.name)}</b>${W.desc ? ' — ' + esc(W.desc) : ' — ' + T('weather.noEffect')}</span></div>`; }).join('');
    const season = T('season.' + g.season());
    modal(T('weather.title'), `<div class="d">${T('weather.head', { season: `<b>${season}</b>`, n: g.rules.forecastTurns })}${g.rules.tent ? ` · ${T('weather.tent')}` : ''}</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin:6px 0">${known.join('')}</div><div class="ttrack">${rows}</div><div class="d" style="margin-top:6px;color:var(--dim)">${T('weather.note')}</div>`, [{ label: T('btn.close'), onClick: closeModal }]);
  }
  function showUpcomingInfo(turn) {
    const g = game, u = g.upcoming().find(x => x.turn === turn); if (!u || !u.specs) return;
    const wx = u.weather ? M.WEATHER[u.weather] : null;
    let coldFree = g.warehouse.cold - g.coldUsed(), fzFree = (g.warehouse.frozen || 0) - g.frozenUsed();
    const rows = u.specs.map(s => { const t = D.PARCEL_TYPES[s.type], a = s.attrs || t.attrs, cu = M.CUSTOMERS[s.customer || 'anon']; let note = '';
      if (a.includes('frozen')) { if (s.size <= fzFree) { fzFree -= s.size; note = T('up.frozenOk'); } else note = `<b style="color:var(--red)">${T('up.frozenNo')}</b>`; }
      else if (a.includes('cold')) { if (s.size <= coldFree) { coldFree -= s.size; note = T('up.coldOk'); } else note = `<b style="color:var(--orange)">${T('up.coldNo')}</b>`; }
      if (a.includes('customs')) note += (note ? ' · ' : '') + T('up.customs', { n: g.rules.customsWait });
      if (s.burst) note += (note ? ' · ' : '') + `<b style="color:var(--orange)">${T('up.burst')}</b>`;
      return `<div class="parcel"><div class="sw" style="background:${t.css}"></div><div><span class="cust">${cu.icon}</span><span class="nm">${esc(t.short)}</span>${attrIcons(a)} ${T('fmt.cells', { n: s.size })} · ${game.baseReward(s.type, s.size)}c · ${esc(cu.name)}</div><div class="st">${note}</div></div>`; }).join('');
    const vol = u.specs.reduce((v, s) => v + s.size, 0), used = g.usedVolume();
    modal(T('up.title', { n: turn }), `<div class="pickinfo"><span>${T('up.volume', { vol })}</span><span>${T('common.warehouse')} ${used} → <b class="${used + vol > g.warehouse.cap ? 'bad' : ''}">${used + vol}</b>/${g.warehouse.cap}</span>${wx ? `<span>${wx.icon} ${wx.name}</span>` : ''}</div>${u.heat ? `<div class="d" style="color:var(--orange)">${T('up.heat')}</div>` : ''}<div style="display:flex;flex-direction:column;gap:3px;margin-top:4px">${rows}</div><div class="d" style="margin-top:6px;color:var(--dim)">${T('up.note')}</div>`, [{ label: T('btn.close'), onClick: closeModal }]);
  }
  // ---------- 택배 상세 ----------
  function showParcelDetail(id) {
    const g = game, p = g.parcels.find(x => x.id === id); if (!p) return;
    const t = ptype(p), a = attrsOf(p), cu = M.CUSTOMERS[p.customer || 'anon'], lv = g.customerLevel(p.customer || 'anon');
    const claim = Math.round(((p.reward != null ? p.reward : game.baseReward(p.type, p.baseSize))) * cu.claimMult * g.rules.claimMult * (g.rules.customerClaimMult[p.customer] || 1));
    const attrRows = a.map(k => `<div class="d">${D.ATTRS[k].icon} <b>${D.ATTRS[k].name}</b> — ${T('attr.' + k)}</div>`).join('');
    const rows = g.contracts.map(c => { if (!c) return ''; const car = D.CARRIERS[c.carrier]; const ok = g.canHandle(c, p), bp = ok ? g.breakProb(c, p) : 0, can = g.canCall(c); const why = !ok ? T(p.size > g.contractSizeMax(c) || p.size < car.sizeMin ? 'pd.sizeOut' : car.onlyPlain ? 'pd.plainOnly' : car.need ? 'pd.notSpecial' : a.includes('frozen') ? 'pd.noFrozenCap' : p.customs > 0 ? 'self.customsWait' : 'pd.no') : ''; const spec = ok && g.isSpecialist(car, p.type) && t.bonus; return `<div class="ttrow ${ok ? 'on' : ''}"><span class="lv">${car.badge || '🚚'}</span><span class="ef">${esc(car.short)}${gradeBadge(c.grade)} ${ok ? `${spec ? `<span style="color:var(--gold)">${T('pd.specialBonus', { n: t.bonus })}</span> ` : ''}${bp ? `<span style="color:var(--orange)">${T('pd.breakRisk', { pct: Math.round(bp * 100) })}</span>` : ''}${!can ? `<span style="color:var(--dim)">(${T('pd.cannotCall')})</span>` : ''}` : `<span style="color:var(--dim)">${why}</span>`}</span><span class="st">${ok ? T('fmt.calls', { n: c.calls }) : '—'}</span></div>`; }).join('');
    const selfOk = g.selfCan(p), selfWhy = g.selfBlockReason(p);
    const body = `<div class="parcel" style="margin-bottom:6px"><div class="sw" style="background:${t.css}"></div><div>${urgDot(p)}<span class="cust">${cu.icon}</span><span class="nm">${esc(t.name)}</span>${attrIcons(a)} ${T('fmt.cells', { n: p.size })} · ${T('pd.baseReward', { n: p.reward })}</div><div class="st">${parcelStatus(p)}</div></div>
      <div class="d">${T('company.customers')} <b>${cu.icon} ${esc(cu.name)}</b>${p.customer !== 'anon' ? ` · ${T('cust.trustLv', { n: lv })} ${T('pd.perPiece', { n: M.CUSTOMER_BONUS[lv] })}` : ''}${cu.rule ? `<br><span style="color:var(--gold)">${esc(cu.rule.text)}</span>` : ''}</div>
      <div class="d">${T('pd.claim', { claim })}${p.arrivalTurn ? ` · ${T('pd.arrivedAgo', { n: p.age })}` : ''}${p.wet ? ` · ${T('pd.wet')}` : ''}${p.outdoor ? ` · ${T('pd.outdoor')}` : ''}</div>
      ${attrRows}
      <div style="font-size:12px;color:var(--gold);margin:8px 0 3px">${T('pd.contracts')}</div><div class="ttrack">${rows || `<div class="d">${T('pd.noContract')}</div>`}<div class="ttrow ${selfOk ? 'on' : ''}"><span class="lv">🚚</span><span class="ef">${T('pd.selfRow')} ${selfOk ? T('pd.selfCost', { cost: g.selfCost(p) }) : `<span style="color:var(--dim)">${esc(selfWhy || T('pd.no'))}</span>`}</span><span class="st">${selfOk ? T('pd.ok') : '—'}</span></div></div>`;
    modal(`${t.name} ${T('fmt.cells', { n: p.size })}`, body, [{ label: T('btn.close'), onClick: closeModal }]);
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
  function trustBar(g, carrier) {
    const lv = g.trustLevel(carrier), nx = g.trustNext(carrier);
    const bars = [1, 2, 3].map(i => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('');
    return `<span class="trust" title="${nx ? T('trust.next', { have: nx.have, need: nx.need, effect: nx.effect }) : T('trust.max')}">${bars}${nx ? ` ${nx.have}/${nx.need}` : ' MAX'}</span>`;
  }
  // 신뢰도 트랙: 단계별 효과·필요 xp·달성 여부. xp가 null이면 진행도 없이 정적 표시(도감)
  function trustTrack(carrier, xp) {
    const rows = [1, 2, 3].map(lv => {
      const need = D.TRUST_LEVELS[lv], on = xp != null && xp >= need;
      const state = xp == null ? `${need}xp` : on ? '✓' : T('trust.remain', { n: Math.max(0, need - xp) });
      return `<div class="ttrow ${on ? 'on' : ''}"><span class="lv">${lv}</span><span class="ef">${esc(D.trustEffectText(carrier, lv))}</span><span class="st">${state}</span></div>`;
    }).join('');
    return `<div class="ttrack">${rows}</div>`;
  }
  function attrsOf(p) { return p.attrs || D.PARCEL_TYPES[p.type].attrs; }
  function attrIcons(attrs) { return attrs.map(a => `<span class="attr ${a}" title="${D.ATTRS[a].name}">${D.ATTRS[a].icon}</span>`).join(''); }
  function urgencyOf(p) {
    const a = attrsOf(p);
    if (p.overdue || (a.includes('cold') && !p.inCold) || (a.includes('frozen') && !p.inFrozen)) return 0;
    if (p.customs > 0) return p.customs + p.deadline;
    return p.deadline;
  }
  function sortByUrgency(list) { return list.slice().sort((a, b) => urgencyOf(a) - urgencyOf(b) || b.size - a.size); }
  function parcelStatus(p) {
    const parts = [], a = attrsOf(p);
    if (a.includes('cold')) { if (!p.inCold) parts.push(`<b style="color:var(--red)">${T('ps.warm')}</b>`); else parts.push(T('ps.cold')); }
    if (a.includes('frozen')) { if (!p.inFrozen) parts.push(`<b style="color:var(--red)">${T('ps.frozenOut')}</b>`); else parts.push(T('ps.frozen')); }
    if (a.includes('produce')) { if (p.inCold) parts.push(T('ps.cold')); else if (game && game.isHeatTurn() && !game.warehouse.vent) parts.push(`<b style="color:var(--orange)">${T('ps.heat')}</b>`); }
    if (p.customs > 0) { parts.push(`<b style="color:var(--blue)">${T('ps.customs', { n: p.customs, delayed: p.customsDelayed ? ` ${T('ps.delayed')}` : '' })}</b>`); parts.push(`⏳ ${T('fmt.turns', { n: p.deadline })}`); if (p.outdoor) parts.unshift(`<b style="color:var(--orange)">${T('hud.outdoorTag')}</b>`); return parts.join(' · '); }
    if (p.overdue) { const ri = game ? game.returnIn(p) : null; parts.push(`<b style="color:var(--red)">${T('ps.overdue', { ret: ri != null ? ` · ${T('ps.returnIn', { n: ri })}` : '' })}</b>`); } else parts.push(T('ps.deadline', { n: p.deadline }));
    if (p.outdoor) parts.unshift(`<b style="color:var(--orange)">${T('hud.outdoorTag')}</b>`);
    return parts.join(' · ');
  }
  function urgDot(p) { const u = urgencyOf(p); return `<span class="urg ${u <= 0 ? 'r' : u <= 1 ? 'r' : u <= 2 ? 'o' : u <= 3 ? 'y' : 'g'}"></span>`; }
  function renderParcels(container, parcels, selectable) {
    if (!parcels.length) { container.innerHTML = `<div id="empty">${T('hud.emptyWarehouse')}</div>`; return; }
    container.innerHTML = sortByUrgency(parcels).map(p => {
      const t = ptype(p), s = selectable;
      const a = attrsOf(p);
      const cls = (p.overdue ? ' overdue' : '') + ((a.includes('cold') && !p.inCold) || (a.includes('frozen') && !p.inFrozen) ? ' rot' : '') + (s && s.sel.has(p.id) ? ' sel' : '') + (s && !s.elig.has(p.id) ? ' dis' : '') + (s && s.risk && s.risk.has(p.id) ? ' risk' : '');
      const cu = M.CUSTOMERS[p.customer || 'anon'];
      return `<div class="parcel${cls}" data-id="${p.id}"><div class="sw" style="background:${t.css}"></div><div>${urgDot(p)}<span class="cust" title="${esc(cu.name)}">${cu.icon}</span><span class="nm">${esc(t.short)}</span>${attrIcons(a)} ${T('fmt.cells', { n: p.size })} · ${(p.reward != null ? p.reward : game.baseReward(p.type, p.baseSize))}c${s && s.risk && s.risk.has(p.id) ? ` <b style="color:var(--orange)">${T('call.riskTag')}</b>` : ''}</div><div class="st">${parcelStatus(p)}</div></div>`;
    }).join('');
  }

  function onContractTap(i) {
    if (busy || game.phase !== 'play') return;
    const c = game.contracts[i]; if (!game.canCall(c)) return;
    SFX.resume(); SFX.click();
    const car = D.CARRIERS[c.carrier], vcap = game.vehicleCap(c), notes = game.capacityBonusNote(c), simul = game.simulMax(c), fee = game.truckFee(c);
    const elig = game.eligibleParcels(c);
    const trustInfo = (vol, trucks) => { const g = game.trustGainPreview(c, vol, trucks), nx = game.trustNext(c.carrier); return `<div class="d" style="font-size:11px;margin-bottom:6px">${trustBar(game, c.carrier)} ${T('call.xpGain', { xp: g.xp, parts: g.parts.join(', ') })}${nx ? ` · ${T('call.nextLevel')}: ${esc(nx.effect)}` : ''}${game.trustLevel(c.carrier) >= 1 ? ` · ${esc(D.trustEffectText(c.carrier, game.trustLevel(c.carrier)))}` : ''}<details><summary style="cursor:pointer;color:var(--dim)">${T('call.trackToggle')}</summary>${trustTrack(c.carrier, game.trustXp(c.carrier))}</details></div>`; };
    const sel = new Set();
    let extraTrucks = 0; // 사용자가 '한 대 더'로 늘린 대수
    const render = () => {
      const selP = [...sel].map(id => game.parcels.find(p => p.id === id)).filter(Boolean);
      const vol = selP.reduce((s, p) => s + p.size, 0);
      const need = vol ? game.trucksNeeded(c, vol) : 1;
      const trucks = Math.min(Math.max(need, 1 + extraTrucks), Math.min(simul, Math.max(1, c.calls + (c.calls === 0 ? 1 : 0))));
      const cap = vcap * trucks, callFee = game.callFee(c, trucks), income = selP.reduce((s, p) => s + p.reward, 0);
      const fill = vol / cap;
      const gauge = `<div class="truckgauge"><div class="tg"><i style="width:${Math.min(100, fill * 100)}%" class="${fill >= 0.8 ? 'good' : ''}"></i><span>${T('call.trucks', { n: trucks, vol, cap })}</span></div><div class="tbtn">${trucks < Math.min(simul, c.calls) ? `<button class="btn small" id="truck-add">${T('call.addTruck', { fee })}</button>` : `<span class="d" style="color:var(--dim)">${T('call.simulMax', { n: Math.min(simul, Math.max(1, c.calls)) })}</span>`}${trucks > need && trucks > 1 ? `<button class="btn small" id="truck-del">${T('call.removeTruck')}</button>` : ''}</div></div>`;
      const money = `<div class="pickinfo"><span>+${income}c − ${callFee}c = <b class="${income - callFee >= 0 ? '' : 'bad'}">${T('call.net', { net: income - callFee })}</b></span>${fill >= 0.8 && vol ? `<span style="color:var(--green)">${T('call.fillOk')}</span>` : ''}</div>`;
      const riskSel = selP.filter(p => game.breakProb(c, p) > 0);
      const riskLine = riskSel.length ? `<div class="d" style="font-size:12px;color:var(--orange);margin-bottom:6px">${T('call.riskLine', { n: riskSel.length, pct: Math.round(game.breakProb(c, riskSel[0]) * 100), loss: Math.round(riskSel.reduce((s, p) => s + game.breakProb(c, p) * game.baseReward(p.type, p.baseSize), 0)) })}</div>` : '';
      const capsLine = `<div class="d" style="font-size:11px;color:var(--dim);margin-bottom:4px">${car.badge || ''} ${T('call.caps')} ${game.contractCaps(c).length ? attrIcons(game.contractCaps(c)) : T('common.none')} · ${T('call.size', { min: car.sizeMin, max: game.contractSizeMax(c) })}${car.delay ? ` · ${T('call.payLater', { n: Math.max(0, car.delay - (game.trustLevel(c) >= 3 ? 1 : 0)) })}` : ''}</div>`;
      const after = `${T('fmt.trucks', { n: c.calls })} → ${T('fmt.trucks', { n: Math.max(0, c.calls - trucks) })}`;
      const body = `<p style="font-size:12px;color:var(--dim)">${esc(car.desc)} · ${T('fmt.vehicleCap', { vehicle: esc(car.vehicle || ''), cap: vcap })} · ${T('fmt.perTruck', { fee })}${notes.length ? `<br>${T('call.bonus')}: ${notes.join(', ')}` : ''}</p>${capsLine}${gauge}${money}<div class="pickinfo"><span>${T('call.selected', { n: sel.size, cap: elig.length })}</span><span>${T('call.remain')} <b>${after}</b></span></div>${riskLine}${trustInfo(vol, trucks)}<div id="pick-list" style="display:flex;flex-direction:column;gap:3px"></div>
        <div style="margin-top:8px;display:flex;gap:6px"><button class="btn small" id="pick-urgent">${T('call.pickUrgent')}</button><button class="btn small" id="pick-clear">${T('call.pickClear')}</button></div>`;
      const m = modal(game.contractName(c), body, [{ label: T('btn.cancel'), onClick: closeModal }, { label: `${T('call.btn')} (${T('fmt.count', { n: sel.size })} · ${T('fmt.trucks', { n: trucks })} · -${callFee}c)`, cls: 'primary', disabled: sel.size === 0 || game.cash < callFee, onClick: () => { closeModal(); doCall(i, [...sel], trucks); } }]);
      const ta = m.querySelector('#truck-add'); if (ta) ta.onclick = () => { extraTrucks = trucks; SFX.select(); render(); };
      const td = m.querySelector('#truck-del'); if (td) td.onclick = () => { extraTrucks = Math.max(0, trucks - 2); SFX.cancel(); render(); };
      const list = m.querySelector('#pick-list');
      renderParcels(list, game.parcels, { sel, elig: new Set(elig.map(p => p.id)), risk: new Set(elig.filter(p => game.breakProb(c, p) > 0).map(p => p.id)) });
      list.querySelectorAll('.parcel').forEach(el => el.onclick = () => {
        const id = +el.dataset.id; if (!elig.some(p => p.id === id)) return;
        if (sel.has(id)) { sel.delete(id); SFX.cancel(); }
        else { const p = elig.find(x => x.id === id); const v = [...sel].reduce((s, q) => s + (game.parcels.find(x => x.id === q) || { size: 0 }).size, 0) + p.size; const maxCap = vcap * Math.min(simul, Math.max(1, c.calls)); if (v > maxCap) { toast(T('call.maxSelect', { cap: maxCap })); return; } sel.add(id); SFX.select(); }
        render();
      });
      m.querySelector('#pick-urgent').onclick = () => {
        sel.clear();
        const sorted = elig.slice().sort((a, b) => urgencyOf(a) - urgencyOf(b) || (b.overdue - a.overdue));
        let v = 0; const maxCap = vcap * Math.min(simul, Math.max(1, c.calls)); for (const p of sorted) { if (v + p.size <= maxCap) { sel.add(p.id); v += p.size; } } SFX.select(); render();
      };
      m.querySelector('#pick-clear').onclick = () => { sel.clear(); SFX.cancel(); render(); };
    };
    render();
  }

  function doCall(i, ids, trucks) {
    const r = game.callCarrier(i, ids, trucks);
    if (!r.ok) { toast(r.msg); return; }
    busy = true; renderAll();
    const events = game.takeEvents();
    const delivered = events.filter(e => e.type === 'deliver').map(e => e.parcel.id);
    SFX.truck();
    for (const e of events) if (e.type === 'broken') { scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.broken', { short: D.PARCEL_TYPES[e.parcel.type].short }), true, 30); }
    scene.deliver(delivered, () => {
      if (delivered.length) { SFX.coin(delivered.length); floatText(r.delay ? T('float.delayed', { n: r.revenue, delay: r.delay }) : `+${r.revenue}c`, false, 70); }
      if (r.fee) setTimeout(() => floatText(T('call.fee', { fee: r.fee }), true, 30), 250);
      announceCustomers(events);
      afterTurn(events);
    });
    saveGame();
  }
  function announceCustomers(events) { let claim = 0; for (const e of events) { if (e.type === 'claim') claim += e.amount; if (e.type === 'custLevel') toastLater(`${M.CUSTOMERS[e.customer].icon} ${T('log.custLevel', { name: M.CUSTOMERS[e.customer].name, level: e.level })}`, 2200); if (e.type === 'custSuspend') toastLater(`${M.CUSTOMERS[e.customer].icon} ${T('toast.custSuspend', { name: M.CUSTOMERS[e.customer].name })}`, 2600); } if (claim) setTimeout(() => floatText(T('float.claim', { n: claim }), true, 50), 350); }
  function announceTrust(events) { for (const e of events) if (e.type === 'trustup') toastLater(T('toast.trustUp', { name: D.CARRIERS[e.carrier].name, level: e.level, effect: D.trustEffectText(e.carrier, e.level) }), 2400); }
  function doWait(selfIds) {
    if (busy || game.phase !== 'play') return;
    SFX.resume();
    if (!selfIds) { SFX.click(); showWaitModal(); return; }
    const r = game.wait(selfIds);
    if (r && r.ok === false) { toast(r.msg); return; }
    busy = true; renderAll();
    const events = game.takeEvents();
    saveGame();
    if (selfIds.length && r && r.ids) { SFX.truck(); const rev = r.revenue, cost = r.cost; scene.deliver(r.ids, () => { SFX.coin(r.ids.length); floatText(T('float.self', { rev, cost }), false, 70); afterTurn(events); }); }
    else { SFX.wait(); setTimeout(() => afterTurn(events), 250); }
  }
  // ---------- 대기 화면: 직접 배송 선택 + 적재 정리 + 다음 턴 예보 ----------
  function showWaitModal() {
    const g = game, f = g.forecast(), n = g.selfCount(), nextWx = f.monthEnd ? null : g.weatherAt(g.turn + 1);
    let picked = [];
    const render = () => {
      const elig = sortByUrgency(g.selfEligible());
      const cost = picked.reduce((s, id) => { const p = g.parcels.find(x => x.id === id); return s + (p ? g.selfCost(p) : 0); }, 0);
      const vans = ['coldvan', 'padvan', 'bigvan'].filter(v => g.warehouse[v]).map(v => D.FACILITIES[v].name).join(', ');
      const rows = elig.map(p => { const t = ptype(p), a = attrsOf(p), cu = M.CUSTOMERS[p.customer || 'anon'], on = picked.includes(p.id); return `<div class="parcel ${on ? 'sel' : ''} ${p.overdue ? 'overdue' : ''}" data-id="${p.id}"><div class="sw" style="background:${t.css}"></div><div>${urgDot(p)}<span class="cust">${cu.icon}</span><span class="nm">${esc(t.short)}</span>${attrIcons(a)} ${T('fmt.cells', { n: p.size })} · ${T('wm.rewardCost', { reward: p.reward, cost: g.selfCost(p) })}</div><div class="st">${parcelStatus(p)}</div></div>`; }).join('');
      const blocked = g.parcels.filter(p => !g.selfCan(p)).length;
      const warn = []; if (f.overdue) warn.push(T('wm.overdue', { n: f.overdue })); if (f.spoil) warn.push(T('wm.spoil', { n: f.spoil })); if (f.frozenOver) warn.push(T('wm.frozenOver', { n: f.frozenOver }));
      const body = `<div class="pickinfo"><span>${T('hud.cash')} <b>${g.cash}</b>c</span><span>${T('wm.nextWarehouse')} <b class="${f.used > f.cap ? 'bad' : ''}">${f.used}/${f.cap}</b></span>${nextWx ? `<span>${M.WEATHER[nextWx].icon} ${M.WEATHER[nextWx].name}</span>` : `<span>${T('hud.monthEnd')}</span>`}</div>
        ${warn.length ? `<div class="d" style="color:var(--red);margin-bottom:4px">${T('wm.ifWait')}: ${warn.join(' · ')}</div>` : ''}
        ${g.outdoorVolume() > 0 ? `<div class="d" style="margin-bottom:4px">${T('wm.outdoor', { vol: g.outdoorVolume(), pct: Math.round(g.theftProb() * 100) })} <button class="btn small" id="wm-reorder">${T('re.title')}</button></div>` : ''}
        <div style="font-size:12px;color:var(--gold);margin:6px 0 3px">${T('wm.selfHead', { n, size: g.selfSizeMax(), base: D.SELF_DELIVERY.costBase, per: D.SELF_DELIVERY.costPerSize })}</div>
        <div class="d" style="color:var(--dim);margin-bottom:4px">${vans ? `${T('wm.vans')}: ${esc(vans)}` : T('wm.noVans')}${blocked ? ` · ${T('wm.blocked', { n: blocked })}` : ''}</div>
        <div class="zone">${rows || `<div id="empty">${T('err.nothingSelf')}</div>`}</div>`;
      const m = modal(T('wm.title'), body, [{ label: T('btn.cancel'), onClick: closeModal }, { label: picked.length ? T('wm.selfWait', { n: picked.length, cost }) : T('wm.justWait'), cls: 'primary', onClick: () => { if (picked.length && g.cash < cost) return toast(T('err.selfCost', { cost })); closeModal(); doWait(picked.slice()); } }], T('wm.sub'));
      m.querySelectorAll('.parcel[data-id]').forEach(el => el.onclick = () => { const id = +el.dataset.id; SFX.click(); if (picked.includes(id)) picked = picked.filter(x => x !== id); else { if (picked.length >= n) { toast(T('wm.limit', { n })); return; } picked.push(id); } render(); });
      const rb = m.querySelector('#wm-reorder'); if (rb) rb.onclick = () => { SFX.click(); showReorder(() => { render(); }); };
    };
    render();
  }
  function afterTurn(events) {
    for (const e of events) if (e.type === 'discard') { scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.discard', { why: I18n.text(e.why) }), true, 30); }
    for (const e of events) if (e.type === 'paid') { SFX.coin(e.count); floatText(T('float.paid', { name: e.name, n: e.amount }), false, 70); }
    announceCustomers(events);
    for (const e of events) { if (e.type === 'storageEnd') { SFX.coin(1); floatText(T('float.storageEnd', { pay: e.pay ? `+${e.pay}c` : '' }), false, 70); } if (e.type === 'storageStolen') { SFX.discard(); floatText(T('float.storageStolen', { n: e.amount }), true, 30); } if (e.type === 'offer') toastLater(`${M.CUSTOMERS[e.offer.customer].icon} ${T('toast.offer')}`, 2000); }
    for (const e of events) if (e.type === 'returned') { scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.returned', { short: D.PARCEL_TYPES[e.parcel.type].short }), true, 30); }
    for (const e of events) if (e.type === 'stolen') { scene.discard(e.parcel.id); SFX.discard(); floatText(T('float.stolen', { short: D.PARCEL_TYPES[e.parcel.type].short, size: e.parcel.size }), true, 30); }
    const pen = events.find(e => e.type === 'penalty');
    if (pen) { scene.shake(); SFX.penalty(); floatText(T('float.stress', { n: pen.amount }), true, 50); toast(pen.reasons.map(I18n.text).join(' · '), 2600); }
    setTimeout(() => {
      scene.sync(game, { animate: true });
      if (events.some(e => e.type === 'arrive')) SFX.thud();
      busy = false; renderAll(); saveGame();
      announceTrust(events);
      if (game.phase === 'play' || game.phase === 'summary') announce(Profile.evaluate(game, null));
      checkPhase();
    }, pen ? 500 : 150);
  }
  function checkPhase() {
    if (game.phase === 'summary') showSummary();
    else if (game.phase === 'market') showMarket();
    else if (game.phase === 'over' || game.phase === 'win') showResult();
  }

  // ---------- summary ----------
  function showSummary() {
    const s = game.summary, R = game.rules;
    if (R.endless || game.month < R.months) BGM.stinger('fanfare', 0.9); // 마지막 달은 결과 화면의 팡파레 하나만
    const body = `<div class="kv">
      <span>${T('sum.revenue')}</span><span class="v good">+${s.revenue}</span>
      <span>${T('sum.opCost')}</span><span class="v bad">-${s.opCost}</span>
      ${s.opCostDetail ? `<span class="sub" style="grid-column:1/-1;font-size:11px;color:var(--dim);margin-top:-4px">${T('sum.opCostDetail', s.opCostDetail)}</span>` : ''}
      <span>${T('sum.fees')}</span><span class="v ${s.fees ? 'bad' : ''}">-${s.fees || 0}</span>
      ${s.closing ? `<span>${T('sum.closing')}</span><span class="v good">+${s.closing}</span>` : ''}
      <span>${T('sum.callsWaits')}</span><span class="v">${T('fmt.calls', { n: s.calls })} / ${T('fmt.calls', { n: s.waits })}</span>
      <span>${T('sum.delivered')}</span><span class="v">${T('fmt.count', { n: s.delivered })}</span>
      <span>${T('sum.penalty')}</span><span class="v ${s.penalty ? 'bad' : ''}">+${s.penalty}</span>
      <span>${T('sum.rsb')}</span><span class="v ${s.returned || s.stolen || s.broken ? 'bad' : ''}">${s.returned || 0} / ${s.stolen || 0} / ${s.broken || 0}</span>
      <span>${T('sum.claims')}</span><span class="v ${s.claims ? 'bad' : ''}">-${s.claims || 0}${s.covered ? ` <small style="color:var(--green)">${T('sum.covered', { n: s.covered })}</small>` : ''}</span>
      ${game.insurer !== 'none' ? `<span>${T('sum.premium', { name: esc(M.INSURERS[game.insurer].name) })}</span><span class="v ${s.premium ? 'bad' : ''}">-${s.premium || 0}</span><span class="sub" style="grid-column:1/-1;white-space:normal">${T('sum.claimsNext', { n: s.insClaims || 0, next: s.nextPremium })}${s.noClaimBonus ? ` · ${T('sum.noClaimBonus')}` : ''}</span>` : ''}
      ${s.selfCost ? `<span>${T('sum.selfCost')}</span><span class="v bad">-${s.selfCost}</span>` : ''}
      ${s.storageIncome ? `<span>${T('sum.storageIncome')}</span><span class="v">+${s.storageIncome}</span>` : ''}
      <span>${T('sum.overdueVol')}</span><span class="v ${s.overdueVol ? 'bad' : ''}">${T('fmt.cells', { n: s.overdueVol })}</span>
      <span>${T('sum.discarded')}</span><span class="v ${s.discarded ? 'bad' : ''}">${T('fmt.count', { n: s.discarded })}${R.winMaxDiscard != null ? ` ${T('sum.runDiscard', { n: game.run.discarded, max: R.winMaxDiscard })}` : ''}</span>
      <hr style="grid-column:1/-1">
      <span>${T('sum.cash')}</span><span class="v">${s.cash}c${R.winCash ? ` ${T('sum.goal', { n: R.winCash })}` : ''}</span>
      <span>${T('sum.stress')}</span><span class="v ${s.stress >= 11 ? 'bad' : ''}">${s.stress}/${game.rules.gameoverStress} (${game.stressState()})</span>
      <span>${T('sum.usage')}</span><span class="v">${T('sum.usageVal', { pct: s.usage, n: s.left })}</span>
      ${R.winDelivered ? `<span>${T('sum.deliverGoal')}</span><span class="v">${game.run.delivered}/${T('fmt.count', { n: R.winDelivered })}</span>` : ''}
      ${R.winStorage ? `<span>${T('sum.storageGoal')}</span><span class="v">${game.stats.storageDone}/${T('fmt.cases', { n: R.winStorage })}</span>` : ''}
      ${R.winBigCustomer && game.bigCustomer ? `<span>${T('sum.bigCustomer')}</span><span class="v">${M.CUSTOMERS[game.bigCustomer].icon} ${esc(M.CUSTOMERS[game.bigCustomer].name)} ${T('common.trust')} ${game.customerLevel(game.bigCustomer)}/3</span>` : ''}</div>
      ${s.customers ? `<hr><div style="font-size:12px;color:var(--dim);margin-bottom:4px">${T('company.customers')}</div>` + s.customers.map(c => `<div style="font-size:12px">${M.CUSTOMERS[c.id].icon} ${esc(M.CUSTOMERS[c.id].name)} — ${T('fmt.count', { n: c.month.delivered })} · +${c.month.revenue}c${c.month.claims ? ` · <span style="color:var(--red)">${T('sum.custClaim', { n: c.month.claims })}</span>` : ''}${c.id !== 'anon' ? ` · ${T('common.trust')} ${c.month.lvStart}→${c.level}${c.suspended ? ` (${T('cust.suspended')})` : ''}` : ''}</div>`).join('') : ''}`;
    const last = !R.endless && game.month >= R.months;
    modal(T('sum.title', { n: s.month }), body, [{ label: last ? T('sum.final') : T('sum.toMarket'), cls: 'primary', onClick: () => { closeModal(); game.closeSummary(); saveGame(); checkPhase(); } }]);
  }

  // ---------- market ----------
  function showMarket() {
    const mk = game.market, R = game.rules;
    BGM.play('market');
    const render = () => {
      const items = mk.items.map((it, i) => {
        let price = it.kind === 'contract' ? game.contractPrice(it) : it.price, desc = '';
        if (it.kind === 'contract') { const car = D.CARRIERS[it.carrier], g = D.GRADES[it.grade]; desc = `${it.hint ? `<span style="color:var(--green)">✔ ${esc(it.hint)}</span><br>` : ''}${car.desc}<br>${car.badge || ''} ${T('call.caps')} ${car.caps.length ? attrIcons(car.caps) : T('common.none')} · ${T('call.size', { min: car.sizeMin, max: car.sizeMax })}${car.delay ? ` · ${T('call.payLater', { n: car.delay })}` : ''}<br>${T('mk.vehicleLine', { vehicle: esc(car.vehicle || ''), cap: car.cap + g.cap + (R.carrierCapDelta[it.carrier] || 0), fee: Math.max(0, Math.round((R.feeFixed != null ? R.feeFixed : car.fee) * g.fee * R.feeMult + R.feeDelta)), trucks: Math.max(1, car.trucks + g.calls + R.callsDelta) })}${it.grade !== 'normal' ? `<br><span style="color:var(--gold)">${T('mk.gradeVs', { cap0: car.cap, cap1: car.cap + g.cap, t0: car.trucks, t1: car.trucks + g.calls, f0: Math.round((R.feeFixed != null ? R.feeFixed : car.fee) * R.feeMult), f1: Math.max(0, Math.round((R.feeFixed != null ? R.feeFixed : car.fee) * g.fee * R.feeMult + R.feeDelta)), lv: [0, 1, 2, 3][['normal', 'trusted', 'expert', 'master'].indexOf(it.grade)] })}</span>` : ''} · ${trustBar(game, it.carrier)}${trustTrack(it.carrier, game.trustXp(it.carrier))}`; }
        else if (it.kind === 'enh') desc = D.ENHANCEMENTS[it.enh].desc;
        else if (it.kind === 'item') desc = M.INS_ITEMS[it.item].icon + ' ' + M.INS_ITEMS[it.item].desc + ' ' + T('mk.oneTime');
        else if (it.kind === 'customer') { const cu = M.CUSTOMERS[it.customer]; desc = `${cu.icon} ${cu.items ? Object.keys(cu.items).map(k => { const ci = M.CUSTOMER_ITEMS[k]; return D.PARCEL_TYPES[ci ? ci.type : k].short + ' ' + cu.items[k] + '%'; }).join(' · ') : esc(cu.desc || '')} · ${T('mk.claimMult', { n: cu.claimMult })}${cu.rule ? `<br><span style="color:var(--gold)">${esc(cu.rule.text)}</span>` : ''}<br>${T('mk.custStart', { n: game.customerCount(), max: M.CUSTOMER_SLOTS })}`; }
        else if (it.kind === 'fac') { const F = it.fac && D.FACILITIES[it.fac]; let prev = ''; if (F) { if (F.cap) prev = `${T('common.warehouse')} ${game.warehouse.cap} → ${game.warehouse.cap + Math.round(F.cap * R.facilityCapMult)}`; else if (F.cold) prev = `${D.ATTRS.cold.name} ${game.warehouse.cold} → ${Math.min(R.coldCapMax == null ? 99 : R.coldCapMax, game.warehouse.cold + F.cold)}`; else if (F.xl) prev = `${T('common.xl')} ${game.warehouse.xl} → ${game.warehouse.xl + F.xl}`; else if (F.frozen) prev = `${D.ATTRS.frozen.name} ${game.warehouse.frozen || 0} → ${(game.warehouse.frozen || 0) + F.frozen}`; } desc = F ? F.desc + (prev ? `<br><span style="color:var(--green)">${T('mk.afterBuy')} ${prev}</span>` : '') : T('mk.allFacilities'); }
        const kindLbl = T('kind.' + it.kind);
        return `<div class="card ${it.sold ? 'sold' : ''}" data-i="${i}"><div class="t"><span>[${kindLbl}] ${esc(it.name)}${gradeBadge(it.grade)}</span><span class="price">${it.sold ? T('mk.sold') : price + 'c'}</span></div><div class="d">${desc}</div></div>`;
      }).join('');
      const contracts = `<hr><div style="font-size:12px;color:var(--dim);margin-bottom:4px">${T('mk.currentContracts', { keep: R.keepCalls ? T('mk.keepCalls', { n: R.keepCalls }) : '' })}</div>` + game.contracts.map(c => c ? `<div style="font-size:12px">· ${esc(game.contractName(c))} — ${T('mk.contractLine', { calls: c.calls, max: c.maxCalls, cap: game.baseCapacity(c) })} ${trustBar(game, c.carrier)}</div>` : `<div style="font-size:12px">· (${T('err.emptySlot')})</div>`).join('');
      const rc = game.refreshCost();
      const wh = game.warehouse, used = game.usedVolume(), outd = game.outdoorVolume();
      const whLine = `<div class="pickinfo whinfo"><span>${T('common.warehouse')} <b class="${used > wh.cap ? 'bad' : ''}">${used}/${wh.cap}</b></span><span>${D.ATTRS.cold.name} <b>${game.coldUsed()}/${wh.cold}</b></span>${wh.frozen || game.frozenUsed() ? `<span>${D.ATTRS.frozen.name} <b>${game.frozenUsed()}/${wh.frozen || 0}</b></span>` : ''}<span>${T('common.xl')} <b>${game.parcels.filter(p => p.baseSize >= 7).length}/${wh.xl}</b></span>${outd ? `<span class="bad">${T('hud.outdoorTag')} ${T('fmt.cells', { n: outd })}</span>` : ''}<button class="btn small" id="mk-ins">${T('kind.item')}</button><button class="btn small" id="mk-cust">${T('kind.customer')}</button><button class="btn small" id="mk-mine">${T('mk.mine')}</button></div>`;
      const up = mk.prep ? game.upcoming() : [];
      const prepLine = mk.prep ? `<div class="d" style="font-size:12px;color:var(--gold);margin-bottom:4px">${T('mk.prepNote')} ${T('hud.upcoming')}: ${up.filter(u => u.specs).map(u => `${T('fmt.turnN', { n: u.turn })} ${u.specs.map(s => `<i class="sw" style="display:inline-block;width:8px;height:8px;background:${D.PARCEL_TYPES[s.type].css}"></i>${D.PARCEL_TYPES[s.type].short}${s.size}`).join(' ')}`).join(' · ')} · ${T('weather.title')} ${up.filter(u => u.weather).map(u => M.WEATHER[u.weather].icon).join('')}</div>` : '';
      const fcRows = game.customerForecast().map(f => { const cu = M.CUSTOMERS[f.id]; return `<span class="fc">${cu.icon} ${esc(cu.name)} <b>${f.min}~${f.max}</b>${f.special > 0 && f.types.length ? ` <small>${f.types.map(t => `<i style="display:inline-block;width:7px;height:7px;background:${D.PARCEL_TYPES[t].css}"></i>${D.PARCEL_TYPES[t].short} ${Math.round(f.pct[t] * 100)}%`).join(' · ')}</small>` : ''}</span>`; }).join('');
      const fcLine = `<div class="d fcline"><span style="color:var(--gold)">${T('mk.forecast', { m: mk.prep ? game.month : game.month + 1 })}</span> ${fcRows}</div>`;
      const body = `<div class="pickinfo"><span>${T('hud.cash')} <b>${game.cash}</b>c</span><span>${T('mk.bought')} <b>${mk.bought}</b>/${R.marketMaxBuy}</span></div>${whLine}${fcLine}${prepLine}${items}
        ${R.noRefresh ? `<div class="d" style="font-size:12px;color:var(--dim)">${T('err.noRefresh')}</div>` : `<button class="btn small" id="mk-refresh" ${game.cash < rc ? 'disabled' : ''}>${T('mk.refresh', { cost: rc ? rc + 'c' : T('mk.free') })}</button>`}${contracts}`;
      const m = modal(mk.prep ? T('mk.prepTitle') : T('mk.title', { n: mk.month }), body, [{ label: T('mk.startMonth', { n: mk.month + 1 }), cls: 'primary', onClick: () => { closeModal(); game.closeMarket(); game.takeEvents(); scene.sync(game, { animate: true }); SFX.thud(); saveGame(); renderAll(); if (game.strikeCarrier) toast(T('toast.strike', { name: D.CARRIERS[game.strikeCarrier].name }), 3000); checkPhase(); } }], T('mk.priceMult', { n: (D.PRICE_MULT[Math.min(6, Math.max(1, mk.month))] * R.itemPriceMult * R.priceMult).toFixed(2) }));
      const rb = m.querySelector('#mk-refresh'); if (rb) rb.onclick = () => { const r = game.refreshMarket(); if (r.ok) { SFX.buy(); render(); } else toast(r.msg); };
      m.querySelector('#mk-mine').onclick = () => { SFX.click(); showMyContracts(render); };
      m.querySelector('#mk-cust').onclick = () => { SFX.click(); showCustomers(render); };
      m.querySelector('#mk-ins').onclick = () => { SFX.click(); showInsurance(render); };
      m.querySelectorAll('.card').forEach(el => el.onclick = () => {
        const it = mk.items[+el.dataset.i]; if (it.sold) return;
        SFX.click();
        if (mk.bought >= R.marketMaxBuy) return toast(T('err.marketMax', { n: R.marketMaxBuy }));
        const price = it.kind === 'contract' ? game.contractPrice(it) : it.price;
        if (game.cash < price) return toast(T('err.noCash'));
        if (it.kind === 'fac' || it.kind === 'item' || it.kind === 'customer') { const r = game.buy(+el.dataset.i, null); if (r.ok) { SFX.buy(); saveGame(); announce(Profile.evaluate(game, null)); render(); } else toast(r.msg); return; }
        chooseSlot(it, +el.dataset.i, render);
      });
    };
    render();
  }
  function chooseSlot(it, idx, back) {
    const isContract = it.kind === 'contract';
    const body = `<p style="font-size:12px;color:var(--dim)">${isContract ? T('slot.pickReplace') : T('slot.pickApply')}</p>` + game.contracts.map((c, s) => {
      if (!c) return isContract ? `<div class="card" data-s="${s}"><div class="t">${T('err.emptySlot')}</div><div class="d">${T('slot.emptyHint')}</div></div>` : '';
      const info = `${T('mk.contractLine', { calls: c.calls, max: c.maxCalls, cap: game.baseCapacity(c) })} · ${trustBar(game, c.carrier)}` + (c.enh.limit ? ` · ${T('slot.limitEnh', { n: c.enh.limit })}` : '') + (c.enh.cap ? ` · ${T('slot.capEnh', { n: c.enh.cap })}` : '') + (c.enh.regular ? ` · ${D.ENHANCEMENTS.regular.name}` : '') + (c.enh.express ? ` · ${D.ENHANCEMENTS.express.name}` : '');
      return `<div class="card" data-s="${s}"><div class="t">${esc(game.contractName(c))}</div><div class="d">${info}</div></div>`;
    }).join('');
    const m = modal(it.name, body, [{ label: T('btn.cancel'), onClick: back }]);
    const doBuy = (s, mode) => { const r = game.buy(idx, s, mode); if (r.ok) { SFX.buy(); saveGame(); announce(Profile.evaluate(game, null)); back(); } else toast(r.msg); };
    m.querySelectorAll('.card').forEach(el => el.onclick = () => {
      const s = +el.dataset.s, c = game.contracts[s];
      if (!isContract || !c || c.carrier !== it.carrier) return doBuy(s);
      // 같은 업체: 등급이 높으면 업그레이드, 아니면 배차 추가(리필) — 교체 대신 확인 후 진행
      const gr = Object.keys(D.GRADES), up = gr.indexOf(it.grade) > gr.indexOf(c.grade);
      const n = game.itemTrucks(it);
      const msg = up ? T('slot.upgradeAsk', { name: game.contractName(c), grade: D.GRADES[it.grade].name, n }) : T('slot.addAsk', { name: game.contractName(c), n });
      modal(it.name, `<p>${msg}</p>`, [
        { label: T('btn.cancel'), onClick: () => chooseSlot(it, idx, back) },
        { label: T('slot.replaceBtn'), onClick: () => doBuy(s, 'replace') },
        { label: up ? T('slot.upgradeBtn') : T('slot.addBtn'), cls: 'primary', onClick: () => doBuy(s, up ? 'upgrade' : 'add') },
      ]);
    });
  }

  // ---------- result ----------
  function showResult() {
    const r = game.result;
    if (!r.recorded) {
      r.recorded = true;
      r.got = Profile.recordRun(game, r);
      Store.remove(SAVE_KEY);
      BGM.stop(0.5);
      if (r.win) { SFX.win(); BGM.oneShot('fanfare'); } else { SFX.over(); setTimeout(() => BGM.oneShot('gameover'), 300); }
    }
    const P = Profile.get();
    const rec = (P.records[r.scenario] || {})[r.company];
    const got = (r.got || []).map(a => `<div class="card" style="cursor:default"><div class="t">🏆 ${esc(a.name)}</div>${a.unlocks.map(u => `<div class="d" style="color:var(--green)">${T('res.unlocked', { name: esc(u.name) })}</div>`).join('')}</div>`).join('');
    const body = `<p style="text-align:center">${esc(I18n.text(r.reason))}</p><div class="big-num">${T('fmt.pts', { n: r.score })}${rec && r.score >= rec.bestScore && r.score > 0 ? ` ${T('res.best')}` : ''}</div>${got}
      <div class="kv"><span>${T('res.scenarioCompany')}</span><span class="v">${esc(M.SCENARIOS[r.scenario].name)}${r.difficulty && r.difficulty !== 'normal' ? ` (${esc(M.DIFFICULTIES[r.difficulty].name)})` : ''} / ${esc(M.COMPANIES[r.company].name)}</span><span>${T('res.reached')}</span><span class="v">${T('fmt.monthTurn', { m: r.month, t: r.turn })}</span><span>${T('res.revenue')}</span><span class="v">${r.revenue}c</span><span>${T('res.spent')}</span><span class="v">${r.spent}c</span><span>${T('res.cash')}</span><span class="v">${r.cash}c</span><span>${T('sum.stress')}</span><span class="v">${r.stress}</span><span>${T('res.callsWaits')}</span><span class="v">${r.calls} / ${r.waits}</span><span>${T('res.deliveredDiscarded')}</span><span class="v">${r.delivered} / ${r.discarded}</span><span>${T('company.perks')}</span><span class="v">${r.perks.map(p => M.PERKS[p].name).join(', ') || T('common.none')}</span>${r.variants.length ? `<span>${T('prep.variants')}</span><span class="v">${r.variants.map(v => M.DAILY_VARIANTS[v].name).join(', ')}</span>` : ''}<span>${T('res.seed')}</span><span class="v">${r.seed}</span></div>`;
    const again = r.scenario === 'daily' ? { label: T('res.toTitle'), cls: 'primary', onClick: () => { closeModal(); game = null; showTitle(); } } : { label: T('res.again'), cls: 'primary', onClick: () => { closeModal(); const cfg = game.cfg; game = new Game({ scenario: cfg.scenario, company: cfg.company, perks: cfg.perks, insurer: cfg.insurer, difficulty: cfg.difficulty, prep: true }); startPlay(); } };
    modal(r.win ? T('res.win') : T('res.over'), body, [{ label: T('res.toTitle'), onClick: () => { closeModal(); game = null; showTitle(); } }, again]);
  }
  function showRecords(back) {
    const P = Profile.get();
    const recs = Object.keys(P.records).map(sc => `<div style="margin-top:6px"><b>${esc(M.SCENARIOS[sc].name)}</b>: ${Object.keys(P.records[sc]).map(co => `${esc(M.COMPANIES[co].name)} ${T('fmt.pts', { n: P.records[sc][co].bestScore })}`).join(' · ')}</div>`).join('');
    const body = `<div class="records"><p>${T('rec.head', { best: P.stats.bestScore, runs: P.stats.runs, clears: P.stats.clears })}${P.stats.dailyStreak ? ` · ${T('rec.dailyStreak', { n: P.stats.dailyStreak })}` : ''}</p>${recs}<hr>${P.recentRuns.length ? P.recentRuns.map(r => `<div>${r.date} · <b>${T('fmt.pts', { n: r.score })}</b> · ${r.win ? T('rec.win') : T('rec.lose')} · ${esc(M.SCENARIOS[r.scenario] ? M.SCENARIOS[r.scenario].name : r.scenario)} / ${esc(M.COMPANIES[r.company] ? M.COMPANIES[r.company].name : r.company)} (${T('fmt.monthTurn', { m: r.month, t: r.turn })})</div>`).join('') : `<p>${T('rec.empty')}</p>`}</div>`;
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
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.ins; if (id === g.insurer) return; if (g.phase !== 'market') { toast(T('ins.marketOnly')); return; } if (g.rules.noInsurance && g.month < 2) { toast(T('err.startupNoInsurance'), 2500); return; } askConfirm(T('ins.confirm', { name: M.INSURERS[id].name, fee: g.premiumBase(id) }), () => { const r = g.setInsurer(id); if (!r.ok) toast(r.msg); else { SFX.buy(); saveGame(); } showInsurance(back); }, T('ins.join')); });
  }
  function showCustomers(back) {
    const list = game.customerSummary();
    const body = `<div class="perk-count">${T('cust.rules')}</div>` + list.map(customerCard).join('');
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
        <div class="d">${esc(car.desc)}<br>${T('my.stats', { vehicle: esc(car.vehicle || ''), cap: g.vehicleCap(c), fee: g.truckFee(c), simul: g.simulMax(c), calls: c.totalCalls, n: c.delivered })}${enh.length ? `<br>${T('kind.enh')}: ${enh.join(', ')}` : ''}<br>${trustBar(g, c.carrier)}${trustTrack(c.carrier, g.trustXp(c.carrier))}</div></div>`;
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
    else if (tab === 'carriers') { const live = game && game.phase !== 'over' && game.phase !== 'win'; body += `<div class="perk-count">${T('codex.carriersHead')}${live ? ` ${T('codex.liveRun')}` : ''}</div>` + Object.keys(D.CARRIERS).map(k => { const car = D.CARRIERS[k]; return `<div class="card" style="cursor:default"><div class="t"><span>${car.badge || ''} ${esc(car.name)}</span><span class="price">${T('codex.carrierPrice', { vehicle: esc(car.vehicle || ''), cap: car.cap, fee: car.fee, trucks: car.trucks, price: car.price })}</span></div><div class="d">${esc(car.desc)}<br>${T('call.caps')} ${car.caps.length ? attrIcons(car.caps) : T('common.none')} · ${T('call.size', { min: car.sizeMin, max: car.sizeMax })}${car.need ? ` · ${T('codex.need', { icons: car.need.map(a => D.ATTRS[a].icon).join('') })}` : ''}${car.onlyPlain ? ` · ${T('pd.plainOnly')}` : ''}${car.delay ? ` · ${T('call.payLater', { n: car.delay })}` : ''}${trustTrack(k, live ? game.trustXp(k) : null)}</div></div>`; }).join(''); }
    else if (tab === 'perks') body += `<div class="perk-count">${T('codex.perkSlots', { n: Profile.perkSlots() })}</div>` + Object.keys(M.PERK_FAMILIES).map(f => `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${T('prep.family', { family: M.PERK_FAMILIES[f] })}</div>` + Object.keys(M.PERKS).filter(id => M.PERKS[id].family === f).map(id => { const pk = M.PERKS[id], un = P.unlocked.perks.includes(id); return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t">${un ? '' : '🔒 '}${esc(pk.name)}</div><div class="d">${esc(pk.desc)}${un ? '' : `<br>${esc(unlockText(pk.unlock))}`}</div></div>`; }).join('')).join('');
    else if (tab === 'scenarios') body += Object.keys(M.SCENARIOS).map(id => { const s = M.SCENARIOS[id], un = P.unlocked.scenarios.includes(id); const clears = P.stats.clearsByScenario[id] || 0; return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${un ? s.icon : '🔒'} ${esc(s.name)}</span><span class="price">${clears ? T('fmt.wins', { n: clears }) : ''}</span></div><div class="d">${esc(s.desc)}<br>${T('prep.win')}: ${esc(s.win)}${un ? '' : `<br>${esc(unlockText(s.unlock))}`}</div></div>`; }).join('');
    else if (tab === 'achievements') {
      const groups = ['company', 'scenario', 'slot', 'multi', 'perk', 'none'].map(g => [g, T('codex.ach.' + g)]);
      body += groups.map(([g, nm]) => { const ids = Object.keys(M.ACHIEVEMENTS).filter(id => M.ACHIEVEMENTS[id].rewardType === g); if (!ids.length) return ''; return `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${nm}</div>` + ids.map(id => { const a = M.ACHIEVEMENTS[id], done = !!P.achievements[id]; const reward = a.rewardType === 'company' ? M.COMPANIES[a.reward].name : a.rewardType === 'perk' ? M.PERKS[a.reward].name : a.rewardType === 'scenario' ? M.SCENARIOS[a.reward].name : a.rewardType === 'slot' ? T('codex.slotReward', { n: a.reward }) : a.rewardType === 'multi' ? T('codex.multiReward') : ''; return `<div class="card ${done ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${done ? '🏆' : '⬜'} ${esc(a.name)}</span>${reward ? `<span class="price">${esc(reward)}</span>` : ''}</div><div class="d">${esc(a.desc)}</div></div>`; }).join(''); }).join('');
    } else {
      const s = P.stats, dt = s.deliveredByType;
      body += `<div class="kv stats"><span>${T('stat.runsClears')}</span><span class="v">${s.runs} / ${s.clears}</span><span>${T('stat.best')}</span><span class="v">${s.bestScore}</span><span>${T('stat.delivered')}</span><span class="v">${T('fmt.count', { n: dt.normal + dt.fresh + dt.fragile + dt.intl + dt.large })}</span><span class="sub">　${D.PARCEL_TYPES.normal.short} / ${D.PARCEL_TYPES.fresh.short}</span><span class="v sub">${dt.normal} / ${dt.fresh}</span><span class="sub">　${D.PARCEL_TYPES.fragile.short} / ${D.PARCEL_TYPES.intl.short} / ${D.PARCEL_TYPES.large.short}</span><span class="v sub">${dt.fragile} / ${dt.intl} / ${dt.large}</span><span>${T('res.callsWaits')}</span><span class="v">${s.calls} / ${s.waits}</span><span>${T('stat.contracts')}</span><span class="v">${s.contractsBought}</span><span>${T('sum.discarded')}</span><span class="v">${s.discarded}</span><span>${T('stat.tidy')}</span><span class="v">${s.tidyMonths}</span><span>${T('stat.daily')}</span><span class="v">${T('fmt.days', { n: s.dailyStreak })}</span></div>
        <hr><p style="font-size:12px;color:var(--dim)">${T('stat.profileNote')}</p><button class="btn small warn" id="cx-reset">${T('stat.reset')}</button>`;
    }
    const m = modal(T('title.codex'), body, [{ label: T('btn.close'), onClick: back }]);
    m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { SFX.click(); showCodex(b.dataset.tab, back); });
    const rs = m.querySelector('#cx-reset'); if (rs) rs.onclick = () => askConfirm(T('stat.resetConfirm'), () => { Profile.reset(); SFX.cancel(); showCodex('stats', back); }, T('stat.resetBtn'));
  }

  function showLog(back) {
    modal(T('log.title'), `<div class="log-list">${game.log.map(l => `<div>${esc(I18n.text(l))}</div>`).join('')}</div>`, [{ label: T('btn.close'), onClick: back }]);
  }
  function showHelp(back) {
    const body = T('help.body', { stress: D.GAMEOVER_STRESS });
    modal(T('title.help'), body, [{ label: T('btn.close'), onClick: back }]);
  }
  function showMenu() {
    const g = game, R = g.rules;
    const info = `<div class="d" style="font-size:12px;margin-bottom:6px">${esc(M.SCENARIOS[g.cfg.scenario].name)} · ${g.company.icon} ${esc(g.company.name)}<br><span style="color:var(--green)">＋ ${esc(g.company.passive)}</span><br><span style="color:var(--orange)">－ ${esc(g.company.weakness)}</span>${g.perks.length ? `<br>${T('company.perks')}: ` + g.perks.map(p => esc(M.PERKS[p].name + ' — ' + M.PERKS[p].desc)).join(`<br>${T('company.perks')}: `) : ''}${(g.cfg.variants || []).length ? `<br>${T('prep.variants')}: ` + g.cfg.variants.map(v => esc(M.DAILY_VARIANTS[v].name + ' — ' + M.DAILY_VARIANTS[v].desc)).join(', ') : ''}</div>`;
    const m = modal(T('menu.title'), `${info}<p style="font-size:12px;color:var(--dim)">${T('menu.autosave')}</p><label style="display:flex;align-items:center;gap:8px;font-size:12px">${T('menu.volume')} <input type="range" id="vol" min="0" max="1" step="0.05" value="${opts.musicVol}" style="flex:1"></label>`, [
      { label: T('menu.continue'), cls: 'primary', onClick: closeModal },
      { label: T('opt.sound', { v: T(opts.sound ? 'opt.turnOff' : 'opt.turnOn') }), onClick: () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); saveOpts(); closeModal(); } },
      { label: T('opt.music', { v: T(opts.music ? 'opt.turnOff' : 'opt.turnOn') }), onClick: () => { opts.music = !opts.music; BGM.setEnabled(opts.music); saveOpts(); closeModal(); } },
      { label: T('menu.abandon'), cls: 'warn', onClick: () => askConfirm(T('menu.abandonConfirm'), () => { Store.remove(SAVE_KEY); game = null; showTitle(); }, T('menu.abandonBtn')) },
    ]);
    m.querySelector('#vol').oninput = e => { opts.musicVol = +e.target.value; BGM.setVolume(opts.musicVol); saveOpts(); };
  }

  // ---------- init ----------
  // index.html 의 고정 라벨 (언어 변경 시 다시 호출)
  function applyStaticText() {
    document.title = T('title.name');
    document.documentElement.lang = I18n.lang;
    $('#hud-cash-lbl').textContent = T('hud.cash'); $('#usage-lbl').textContent = T('common.warehouse'); $('#cold-lbl').textContent = D.ATTRS.cold.name;
    $('#cust-btn').textContent = T('company.customers'); $('#log-btn').textContent = T('title.records'); $('#help-btn').textContent = T('btn.help'); $('#menu-btn').textContent = T('menu.title');
    if (scene && scene.relabel) scene.relabel();
  }
  function init() {
    scene = new Scene3D($('#scene'));
    applyStaticText();
    for (let i = 0; i < D.CONTRACT_SLOTS; i++) $('#c' + i).onclick = () => onContractTap(i);
    $('#wait-btn').onclick = () => doWait(null);
    $('#log-btn').onclick = () => { if (game) { SFX.click(); showLog(closeModal); } };
    $('#cust-btn').onclick = () => { if (game) { SFX.click(); showCustomers(closeModal); } };
    $('#help-btn').onclick = () => { SFX.click(); showHelp(closeModal); };
    $('#menu-btn').onclick = () => { if (game) { SFX.click(); showMenu(); } };
    document.addEventListener('touchstart', () => { SFX.resume(); BGM.resume(); }, { once: true });
    document.addEventListener('click', () => { SFX.resume(); BGM.resume(); }, { once: true });
    BGM.preload(['title', 'warehouse']);
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
      window.Capacitor.Plugins.App.addListener('backButton', () => { if ($('#modal-root').classList.contains('show') && game && game.phase === 'play') closeModal(); });
    }
    showTitle();
  }
  window.PT = { get game() { return game; }, renderAll, saveGame, prep, startRun, showTitle };
  init();
})();
