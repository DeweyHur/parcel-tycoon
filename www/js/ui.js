// UI / 진행 제어
(function () {
  const D = window.DATA, M = window.META;
  const $ = s => document.querySelector(s);
  const SAVE_KEY = 'save_v2', OPT_KEY = 'opts_v1';
  let game = null, scene = null, busy = false;
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
      toastLater(`🏆 도전과제 달성: ${a.name}`, 2200);
      for (const u of a.unlocks) toastLater(`🔓 해금: ${u.name}`, 2200);
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
  function closeModal() { $('#modal-root').classList.remove('show'); $('#modal').innerHTML = ''; }

  // ---------- title ----------
  function showTitle() {
    const save = loadSave(), P = Profile.get();
    const nUnlocked = P.unlocked.companies.length + P.unlocked.perks.length + P.unlocked.scenarios.length;
    const nTotal = Object.keys(M.COMPANIES).length + Object.keys(M.PERKS).length + Object.keys(M.SCENARIOS).length;
    const body = `<div class="title"><h1>택배 타이쿤</h1><div class="sub">턴제 물류 경영 로그라이크 · 프로토타입</div>
      ${save ? `<button class="btn primary" id="t-continue">이어하기 <small style="color:var(--dim)">(${esc(M.SCENARIOS[save.cfg.scenario].name)} · ${save.month}개월차 ${save.turn}턴)</small></button>` : ''}
      <button class="btn gold" id="t-new">새 런 시작</button>
      <button class="btn" id="t-codex">도감 <small style="color:var(--dim)">${nUnlocked}/${nTotal} 해금 · 도전과제 ${Object.keys(P.achievements).length}/${Object.keys(M.ACHIEVEMENTS).length}</small></button>
      <button class="btn" id="t-rec">기록 <small style="color:var(--dim)">최고 ${P.stats.bestScore}점 · ${P.stats.clears}승 ${P.stats.runs - P.stats.clears}패</small></button>
      <button class="btn" id="t-help">게임 방법</button>
      <div style="display:flex;gap:8px"><button class="btn" id="t-sound" style="flex:1">효과음: ${opts.sound ? '켜짐' : '꺼짐'}</button><button class="btn" id="t-music" style="flex:1">음악: ${opts.music ? '켜짐' : '꺼짐'}</button></div></div>`;
    const m = modal('택배 회사 게임', body, null, 'v0.3 meta');
    if (save) m.querySelector('#t-continue').onclick = () => { SFX.resume(); SFX.select(); game = Game.fromJSON(save); closeModal(); startPlay(); };
    m.querySelector('#t-new').onclick = () => { SFX.resume(); SFX.select(); if (save && !confirm('진행 중인 런이 있습니다. 새로 시작하면 사라집니다. 계속할까요?')) return; showScenarioSelect(); };
    m.querySelector('#t-codex').onclick = () => { SFX.click(); showCodex('companies', showTitle); };
    m.querySelector('#t-help').onclick = () => { SFX.click(); showHelp(showTitle); };
    m.querySelector('#t-rec').onclick = () => { SFX.click(); showRecords(showTitle); };
    m.querySelector('#t-sound').onclick = () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); saveOpts(); SFX.resume(); SFX.click(); showTitle(); };
    m.querySelector('#t-music').onclick = () => { opts.music = !opts.music; BGM.setEnabled(opts.music); saveOpts(); SFX.resume(); BGM.resume(); SFX.click(); showTitle(); };
    BGM.play('title');
  }

  // ---------- 런 준비: 시나리오 → 회사 → 퍽 ----------
  function unlockText(achId) { const a = M.ACHIEVEMENTS[achId]; return a ? `🔒 ${a.name}: ${a.desc}` : '🔒'; }
  const prep = { scenario: 'standard', company: 'local', perks: [] };
  function showScenarioSelect() {
    const P = Profile.get(), dc = Game.dailyConfig ? null : null;
    const daily = window.dailyConfig(today());
    const cards = Object.keys(M.SCENARIOS).map(id => {
      const s = M.SCENARIOS[id], un = P.unlocked.scenarios.includes(id);
      let extra = '';
      if (id === 'daily') extra = `<div class="d">오늘: ${esc(M.COMPANIES[daily.company].name)} · ${daily.variants.map(v => esc(M.DAILY_VARIANTS[v].name)).join(' + ')}${Profile.dailyDoneToday(daily.date) ? ' · <b>오늘 기록 완료</b>' : ''}</div>`;
      const rec = P.records[id]; const best = rec ? Math.max(0, ...Object.values(rec).map(r => r.bestScore)) : 0;
      return `<div class="card ${un ? '' : 'dis'} ${prep.scenario === id ? 'sel' : ''}" data-id="${id}"><div class="t"><span>${s.icon} ${esc(s.name)} <small style="color:var(--dim)">${s.months >= 99 ? '∞' : s.months + '개월'}</small></span><span class="price">${best ? best + '점' : ''}</span></div>
        <div class="d">${esc(s.desc)}<br>승리: ${esc(s.win)} · 추천: ${esc(s.recommend)}</div>${un ? extra : `<div class="d">${esc(unlockText(s.unlock))}</div>`}</div>`;
    }).join('');
    const m = modal('시나리오 선택', `<div class="perk-count">1/3 단계 — 런의 길이와 규칙을 고릅니다</div>${cards}`, [{ label: '타이틀', onClick: showTitle }, { label: '다음: 회사', cls: 'primary', onClick: () => { if (prep.scenario === 'daily') { prep.company = daily.company; showPerkSelect(daily); } else showCompanySelect(); } }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.id; if (!P.unlocked.scenarios.includes(id)) { toast(unlockText(M.SCENARIOS[id].unlock), 2500); return; } SFX.select(); prep.scenario = id; showScenarioSelect(); });
  }
  function companyInfo(co, id) {
    const wh = co.warehouse ? `용량 ${co.warehouse.cap} · 냉장 ${co.warehouse.cold} · 초대형 ${co.warehouse.xl}` : '창고 무작위';
    const ct = co.contracts ? co.contracts.map(c => `${D.CARRIERS[c.carrier].short}${c.grade === 'trusted' ? '★' : ''} ${c.calls}회`).join(', ') : '계약 무작위 4개';
    return `<div class="d">${wh} · 자금 ${co.cash}<br>계약: ${esc(ct)}</div><div class="d" style="color:var(--green)">＋ ${esc(co.passive)}</div><div class="d" style="color:var(--orange)">－ ${esc(co.weakness)}</div>`;
  }
  function showCompanySelect() {
    const P = Profile.get();
    if (!P.unlocked.companies.includes(prep.company)) prep.company = 'local';
    const cards = Object.keys(M.COMPANIES).map(id => {
      const co = M.COMPANIES[id], un = P.unlocked.companies.includes(id);
      const rec = (P.records[prep.scenario] || {})[id];
      return `<div class="card ${un ? '' : 'dis'} ${prep.company === id ? 'sel' : ''}" data-id="${id}"><div class="t"><span>${co.icon} ${esc(co.name)} <small style="color:var(--dim)">${esc(co.tag)}</small></span><span class="price">${rec ? rec.bestScore + '점' : ''}</span></div>
        ${un ? companyInfo(co, id) : `<div class="d">${esc(unlockText(co.unlock))}</div>`}</div>`;
    }).join('');
    const m = modal('회사 선택', `<div class="perk-count">2/3 단계 — ${esc(M.SCENARIOS[prep.scenario].name)}</div>${cards}`, [{ label: '이전', onClick: showScenarioSelect }, { label: '다음: 퍽', cls: 'primary', onClick: () => showPerkSelect(null) }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => { const id = el.dataset.id; if (!P.unlocked.companies.includes(id)) { toast(unlockText(M.COMPANIES[id].unlock), 2500); return; } SFX.select(); prep.company = id; showCompanySelect(); });
  }
  function perkConflict(pid) {
    const perk = M.PERKS[pid], co = M.COMPANIES[prep.company];
    if (perk.needsCold && co.warehouse && co.warehouse.cold === 0) return '냉장 구역이 없는 회사';
    if (prep.perks.some(o => o !== pid && M.PERKS[o].family === perk.family)) return `같은 계열(${M.PERK_FAMILIES[perk.family]}) 퍽 장착 중`;
    return null;
  }
  function showPerkSelect(daily) {
    const P = Profile.get(), slots = Profile.perkSlots();
    prep.perks = prep.perks.filter(p => P.unlocked.perks.includes(p) && !perkConflict(p)).slice(0, slots);
    const co = M.COMPANIES[prep.company];
    const groups = Object.keys(M.PERK_FAMILIES).map(f => `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${M.PERK_FAMILIES[f]} 계열</div>` + Object.keys(M.PERKS).filter(id => M.PERKS[id].family === f).map(id => {
      const pk = M.PERKS[id], un = P.unlocked.perks.includes(id), sel = prep.perks.includes(id), conflict = un && !sel ? perkConflict(id) : null;
      return `<div class="card ${!un || conflict ? 'dis' : ''} ${sel ? 'sel' : ''}" data-id="${id}"><div class="t">${esc(pk.name)}</div><div class="d">${un ? esc(pk.desc) + (conflict ? ` <span style="color:var(--orange)">(${esc(conflict)})</span>` : '') : esc(unlockText(pk.unlock))}</div></div>`;
    }).join('')).join('');
    const head = `<div class="perk-count">3/3 단계 — ${esc(M.SCENARIOS[prep.scenario].name)} · ${co.icon} ${esc(co.name)}${daily ? ` · 변형: ${daily.variants.map(v => esc(M.DAILY_VARIANTS[v].name + '(' + M.DAILY_VARIANTS[v].desc + ')')).join(', ')}` : ''}<br>퍽 ${prep.perks.length}/${slots} (같은 계열은 하나만)</div>`;
    const m = modal('퍽 장착', head + groups, [{ label: '이전', onClick: daily ? showScenarioSelect : showCompanySelect }, { label: '런 시작', cls: 'primary', onClick: () => startRun(daily) }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => {
      const id = el.dataset.id;
      if (!P.unlocked.perks.includes(id)) { toast(unlockText(M.PERKS[id].unlock), 2500); return; }
      if (prep.perks.includes(id)) { prep.perks = prep.perks.filter(p => p !== id); SFX.cancel(); }
      else { const c = perkConflict(id); if (c) { toast(c); return; } if (prep.perks.length >= slots) { toast(`퍽 슬롯은 ${slots}개입니다`); return; } prep.perks.push(id); SFX.select(); }
      showPerkSelect(daily);
    });
  }
  function startRun(daily) {
    const cfg = { scenario: prep.scenario, company: prep.company, perks: prep.perks.slice(), variants: [] };
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
    $('#hud-month').textContent = `${g.month}개월차`;
    $('#hud-turn').textContent = `${g.turn}/${D.TURNS_PER_MONTH}턴`;
    $('#hud-cash').textContent = g.cash;
    $('#stress-num').textContent = `${g.stress}/${D.GAMEOVER_STRESS}`;
    $('#stress-label').textContent = g.stressState();
    const gauge = $('#stress-gauge'); gauge.querySelector('i').style.width = Math.min(100, g.stress / D.GAMEOVER_STRESS * 100) + '%';
    gauge.className = 'gauge ' + (g.stress >= 16 ? 'crisis' : g.stress >= 11 ? 'danger' : g.stress >= 6 ? 'warn' : '');
    $('#hud-perks').textContent = [g.company.icon + ' ' + g.company.name, ...g.perks.map(p => M.PERKS[p].name)].join(' · ') + (g.strikeCarrier ? ` · ✊${D.CARRIERS[g.strikeCarrier].short} 파업` : '');
    const used = g.usedVolume(), cap = g.warehouse.cap, pct = used / cap * 100;
    const bu = $('#bar-usage'); bu.querySelector('i').style.width = Math.min(100, pct) + '%'; $('#usage-txt').textContent = `${used}/${cap} (${Math.round(pct)}%)`;
    bu.className = 'bar usage ' + (pct > 100 ? 'over' : pct > 90 ? 'danger' : pct > 75 ? 'caution' : pct > 60 ? 'eff' : '');
    const cu = g.coldUsed(), cc = g.warehouse.cold; const bc = $('#bar-cold'); bc.querySelector('i').style.width = cc ? Math.min(100, cu / cc * 100) + '%' : '100%'; $('#cold-txt').textContent = cc ? `${cu}/${cc}` : '없음'; bc.className = 'bar cold ' + (cu > cc ? 'over' : '');
    const up = g.upcoming();
    $('#upcoming').innerHTML = '<span>입고 예정</span>' + up.map(u => u.specs ? `<span class="chip ${u.heat ? 'heat' : ''}">${u.turn}턴${u.heat ? '🌡' : ''}${u.burst ? '⚡' : ''}: ${u.specs.map(s => `<i style="background:${D.PARCEL_TYPES[s.type].css}"></i>${D.PARCEL_TYPES[s.type].short}${s.size}`).join(' ')}</span>` : `<span class="chip none">${u.turn > D.TURNS_PER_MONTH ? '월말 정산' : '-'}</span>`).join('');
    if (g.isHeatTurn && g.isHeatTurn()) $('#upcoming').innerHTML += '<span class="chip heat">🌡 이번 턴 폭염: 상온 신선식품 즉시 부패</span>';
    renderParcels($('#parcels'), g.parcels, null);
    for (let i = 0; i < D.CONTRACT_SLOTS; i++) {
      const btn = $('#c' + i), c = g.contracts[i];
      if (!c) { btn.innerHTML = '<div class="nm">빈 슬롯</div><div class="sub">마켓에서 계약을 구매하세요</div>'; btn.disabled = true; btn.className = 'btn contract'; continue; }
      const car = D.CARRIERS[c.carrier], cp = g.callCapacity(c), elig = g.eligibleParcels(c).length, lv = g.trustLevel(c);
      const can = g.canCall(c) && !busy, struck = g.isStruck(c);
      btn.disabled = !can; btn.className = 'btn contract' + (can ? ' ready' : '');
      const spare = c.calls === 0 && R.spareCall && !g.monthStats.spareUsed;
      btn.innerHTML = `<div class="nm"><span>${esc(car.name)}${gradeBadge(c.grade)}</span><span class="calls ${c.calls === 0 ? 'zero' : ''}">${struck ? '파업' : spare ? '예비' : `${c.calls}/${c.maxCalls}회`}</span></div>
        <div class="sub">회당 <b>${cp}</b>개 · 대상 <b>${elig}</b>개${lv ? ` · 신뢰 Lv${lv}` : ''}${c.enh.regular ? ' · 정기' : ''}${c.enh.express ? ' · 고속' : ''}</div>`;
    }
    $('#wait-btn').disabled = busy || g.phase !== 'play';
  }
  function parcelStatus(p) {
    const parts = [];
    if (p.type === 'fresh') {
      if (p.fresh <= 0) parts.push('부패 직전(50%)'); else parts.push(`신선 ${p.fresh}턴`);
      parts.push(p.inCold ? '<span class="tag cold">냉장</span>' : '<span class="tag warm">상온!</span>');
    }
    if (p.overdue) parts.push(`기한 초과(-${Math.round((1 - game.rules.overdueMult) * 100)}%)`); else parts.push(`기한 ${p.deadline}턴`);
    return parts.join(' ');
  }
  function renderParcels(container, parcels, selectable) {
    if (!parcels.length) { container.innerHTML = '<div id="empty">창고가 비어 있습니다</div>'; return; }
    container.innerHTML = parcels.map(p => {
      const t = ptype(p), s = selectable;
      const cls = (p.overdue ? ' overdue' : '') + (p.type === 'fresh' && p.fresh <= 0 ? ' rot' : '') + (s && s.sel.has(p.id) ? ' sel' : '') + (s && !s.elig.has(p.id) ? ' dis' : '');
      return `<div class="parcel${cls}" data-id="${p.id}"><div class="sw" style="background:${t.css}"></div><div><span class="nm">${esc(t.name)}</span> 크기 ${p.size}${p.baseSize !== p.size ? `(${p.baseSize})` : ''} · ${25 + p.baseSize * 15}c</div><div class="st">${parcelStatus(p)}</div></div>`;
    }).join('');
  }

  function onContractTap(i) {
    if (busy || game.phase !== 'play') return;
    const c = game.contracts[i]; if (!game.canCall(c)) return;
    SFX.resume(); SFX.click();
    const car = D.CARRIERS[c.carrier], cap = game.callCapacity(c), notes = game.capacityBonusNote(c);
    const elig = game.eligibleParcels(c);
    const after = c.calls > 0 ? `${c.calls}회 → ${c.calls - 1}회` : '예비 기사 (월 1회)';
    if (car.mode === 'queue') {
      const body = `<p>${esc(car.desc)}</p><div class="pickinfo"><span>처리량 <b>${cap}</b>개${notes.length ? ` (${notes.join(', ')})` : ''}</span><span>잔여 <b>${after}</b></span></div><div id="pick-list" style="display:flex;flex-direction:column;gap:3px"></div>`;
      const m = modal(game.contractName(c), body, [{ label: '취소', onClick: closeModal }, { label: '호출', cls: 'primary', onClick: () => { closeModal(); doCall(i, elig.map(p => p.id)); } }]);
      renderParcels(m.querySelector('#pick-list'), elig, null);
      return;
    }
    const sel = new Set();
    const render = () => {
      const body = `<p>${esc(car.desc)}</p><div class="pickinfo"><span>선택 <b>${sel.size}</b>/${cap}개${notes.length ? ` (${notes.join(', ')})` : ''}</span><span>잔여 <b>${after}</b></span></div><div id="pick-list" style="display:flex;flex-direction:column;gap:3px"></div>
        <div style="margin-top:8px;display:flex;gap:6px"><button class="btn small" id="pick-urgent">급한 순 자동 선택</button><button class="btn small" id="pick-clear">선택 해제</button></div>`;
      const m = modal(game.contractName(c), body, [{ label: '취소', onClick: closeModal }, { label: `호출 (${sel.size}개)`, cls: 'primary', disabled: sel.size === 0, onClick: () => { closeModal(); doCall(i, [...sel]); } }]);
      const list = m.querySelector('#pick-list');
      renderParcels(list, game.parcels, { sel, elig: new Set(elig.map(p => p.id)) });
      list.querySelectorAll('.parcel').forEach(el => el.onclick = () => {
        const id = +el.dataset.id; if (!elig.some(p => p.id === id)) return;
        if (sel.has(id)) { sel.delete(id); SFX.cancel(); } else if (sel.size < cap) { sel.add(id); SFX.select(); } else { toast(`최대 ${cap}개까지 선택할 수 있습니다`); return; }
        render();
      });
      m.querySelector('#pick-urgent').onclick = () => {
        sel.clear();
        const sorted = elig.slice().sort((a, b) => ((a.type === 'fresh' ? a.fresh : 9) - (b.type === 'fresh' ? b.fresh : 9)) || (b.overdue - a.overdue) || (a.deadline - b.deadline));
        sorted.slice(0, cap).forEach(p => sel.add(p.id)); SFX.select(); render();
      };
      m.querySelector('#pick-clear').onclick = () => { sel.clear(); SFX.cancel(); render(); };
    };
    render();
  }

  function doCall(i, ids) {
    const r = game.callCarrier(i, ids);
    if (!r.ok) { toast(r.msg); return; }
    busy = true; renderAll();
    const events = game.takeEvents();
    const delivered = events.filter(e => e.type === 'deliver').map(e => e.parcel.id);
    SFX.truck();
    scene.deliver(delivered, () => {
      SFX.coin(delivered.length); floatText(`+${r.revenue}c`, false, 70);
      afterTurn(events);
    });
    saveGame();
  }
  function doWait() {
    if (busy || game.phase !== 'play') return;
    SFX.resume(); SFX.wait();
    game.wait();
    busy = true; renderAll();
    const events = game.takeEvents();
    saveGame();
    setTimeout(() => afterTurn(events), 250);
  }
  function afterTurn(events) {
    for (const e of events) if (e.type === 'discard') { scene.discard(e.parcel.id); SFX.discard(); floatText('부패 폐기!', true, 30); }
    const pen = events.find(e => e.type === 'penalty');
    if (pen) { scene.shake(); SFX.penalty(); floatText(`스트레스 +${pen.amount}`, true, 50); toast(pen.reasons.join(' · '), 2600); }
    setTimeout(() => {
      scene.sync(game, { animate: true });
      if (events.some(e => e.type === 'arrive')) SFX.thud();
      busy = false; renderAll(); saveGame();
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
    BGM.stinger('fanfare', 0.9);
    const body = `<div class="kv">
      <span>배송 수익</span><span class="v good">+${s.revenue}</span>
      <span>월말 운영비</span><span class="v bad">-${s.opCost}</span>
      ${s.closing ? `<span>월말 결산 보너스</span><span class="v good">+${s.closing}</span>` : ''}
      <span>업체 호출 / 대기</span><span class="v">${s.calls}회 / ${s.waits}회</span>
      <span>처리한 택배</span><span class="v">${s.delivered}개</span>
      <span>이번 달 페널티</span><span class="v ${s.penalty ? 'bad' : ''}">+${s.penalty}</span>
      <span>미처리(기한 초과) 부피 ${s.overdueVol}</span><span class="v ${s.unprocPenalty ? 'bad' : ''}">+${s.unprocPenalty}</span>
      <span>부패 폐기</span><span class="v ${s.discarded ? 'bad' : ''}">${s.discarded}개${R.winMaxDiscard != null ? ` (런 누적 ${game.run.discarded}/${R.winMaxDiscard})` : ''}</span>
      <hr style="grid-column:1/-1">
      <span>현재 자금</span><span class="v">${s.cash}c${R.winCash ? ` (목표 ${R.winCash})` : ''}</span>
      <span>스트레스</span><span class="v ${s.stress >= 11 ? 'bad' : ''}">${s.stress}/${D.GAMEOVER_STRESS} (${game.stressState()})</span>
      <span>창고 사용률</span><span class="v">${s.usage}% (${s.left}개 보관 중)</span>
      ${R.winDelivered ? `<span>처리 목표</span><span class="v">${game.run.delivered}/${R.winDelivered}개</span>` : ''}</div>`;
    const last = !R.endless && game.month >= R.months;
    modal(`${s.month}개월차 정산`, body, [{ label: last ? '최종 결과' : '마켓으로', cls: 'primary', onClick: () => { closeModal(); game.closeSummary(); saveGame(); checkPhase(); } }]);
  }

  // ---------- market ----------
  function showMarket() {
    const mk = game.market, R = game.rules;
    BGM.play('market');
    const render = () => {
      const items = mk.items.map((it, i) => {
        let price = it.kind === 'contract' ? game.contractPrice(it) : it.price, desc = '';
        if (it.kind === 'contract') { const car = D.CARRIERS[it.carrier], g = D.GRADES[it.grade]; desc = `${car.desc}<br>회당 ${car.cap + g.cap + (R.carrierCapDelta[it.carrier] || 0)}개 · 최대 ${Math.max(1, car.calls + g.calls + R.callsDelta)}회 호출`; }
        else if (it.kind === 'enh') desc = D.ENHANCEMENTS[it.enh].desc;
        else if (it.kind === 'fac') desc = it.fac ? D.FACILITIES[it.fac].desc + (R.facilityCapMult !== 1 && D.FACILITIES[it.fac].cap ? ` (이 회사: +${Math.round(D.FACILITIES[it.fac].cap * R.facilityCapMult)})` : '') : '이미 모든 시설을 구매했습니다';
        const kindLbl = { contract: '계약', enh: '강화', fac: '시설' }[it.kind];
        return `<div class="card ${it.sold ? 'sold' : ''}" data-i="${i}"><div class="t"><span>[${kindLbl}] ${esc(it.name)}${gradeBadge(it.grade)}</span><span class="price">${it.sold ? '판매됨' : price + 'c'}</span></div><div class="d">${desc}</div></div>`;
      }).join('');
      const contracts = `<hr><div style="font-size:12px;color:var(--dim);margin-bottom:4px">현재 계약 (교체 시 잔여 호출·신뢰도·강화 소멸${R.keepCalls ? `, 잔여 ${R.keepCalls}회 보존` : ''})</div>` + game.contracts.map(c => c ? `<div style="font-size:12px">· ${esc(game.contractName(c))} — 잔여 ${c.calls}/${c.maxCalls}회, 회당 ${game.baseCapacity(c)}개${game.trustLevel(c) ? `, 신뢰 Lv${game.trustLevel(c)}` : ''}</div>` : '<div style="font-size:12px">· (빈 슬롯)</div>').join('');
      const rc = game.refreshCost();
      const body = `<div class="pickinfo"><span>자금 <b>${game.cash}</b>c</span><span>구매 <b>${mk.bought}</b>/${R.marketMaxBuy}</span></div>${items}
        ${R.noRefresh ? '<div class="d" style="font-size:12px;color:var(--dim)">이 시나리오에서는 새로고침할 수 없습니다</div>' : `<button class="btn small" id="mk-refresh" ${game.cash < rc ? 'disabled' : ''}>마켓 새로고침 (${rc ? rc + 'c' : '무료'})</button>`}${contracts}`;
      const m = modal(`${mk.month}개월차 마켓`, body, [{ label: `${mk.month + 1}개월차 시작`, cls: 'primary', onClick: () => { closeModal(); game.closeMarket(); game.takeEvents(); scene.sync(game, { animate: true }); SFX.thud(); saveGame(); renderAll(); if (game.strikeCarrier) toast(`✊ 이번 달 ${D.CARRIERS[game.strikeCarrier].name} 파업 — 호출 불가`, 3000); checkPhase(); } }], `가격 ×${(D.PRICE_MULT[Math.min(6, mk.month)] * R.itemPriceMult * R.priceMult).toFixed(2)}`);
      const rb = m.querySelector('#mk-refresh'); if (rb) rb.onclick = () => { const r = game.refreshMarket(); if (r.ok) { SFX.buy(); render(); } else toast(r.msg); };
      m.querySelectorAll('.card').forEach(el => el.onclick = () => {
        const it = mk.items[+el.dataset.i]; if (it.sold) return;
        SFX.click();
        if (mk.bought >= R.marketMaxBuy) return toast(`한 달에 ${R.marketMaxBuy}개까지만 구매할 수 있습니다`);
        const price = it.kind === 'contract' ? game.contractPrice(it) : it.price;
        if (game.cash < price) return toast('자금이 부족합니다');
        if (it.kind === 'fac') { const r = game.buy(+el.dataset.i, null); if (r.ok) { SFX.buy(); saveGame(); announce(Profile.evaluate(game, null)); render(); } else toast(r.msg); return; }
        chooseSlot(it, +el.dataset.i, render);
      });
    };
    render();
  }
  function chooseSlot(it, idx, back) {
    const isContract = it.kind === 'contract';
    const body = `<p>${isContract ? '어느 슬롯의 계약을 교체할까요? 기존 계약의 잔여 호출·신뢰도·강화는 사라집니다.' : '어느 계약에 적용할까요?'}</p>` + game.contracts.map((c, s) => {
      if (!c) return isContract ? `<div class="card" data-s="${s}"><div class="t">빈 슬롯</div><div class="d">여기에 새 계약을 넣습니다</div></div>` : '';
      const info = `잔여 ${c.calls}/${c.maxCalls}회 · 회당 ${game.baseCapacity(c)}개 · 신뢰 ${c.trust}xp` + (c.enh.limit ? ` · 한도강화 ${c.enh.limit}/2` : '') + (c.enh.cap ? ` · 용량강화 ${c.enh.cap}/3` : '') + (c.enh.regular ? ' · 정기 배차' : '') + (c.enh.express ? ' · 고속 배차' : '');
      return `<div class="card" data-s="${s}"><div class="t">${esc(game.contractName(c))}</div><div class="d">${info}</div></div>`;
    }).join('');
    const m = modal(it.name, body, [{ label: '취소', onClick: back }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => {
      const r = game.buy(idx, +el.dataset.s);
      if (r.ok) { SFX.buy(); saveGame(); announce(Profile.evaluate(game, null)); back(); } else toast(r.msg);
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
    const got = (r.got || []).map(a => `<div class="card" style="cursor:default"><div class="t">🏆 ${esc(a.name)}</div>${a.unlocks.map(u => `<div class="d" style="color:var(--green)">🔓 ${esc(u.name)} 해금</div>`).join('')}</div>`).join('');
    const body = `<p style="text-align:center">${esc(r.reason)}</p><div class="big-num">${r.score}점${rec && r.score >= rec.bestScore && r.score > 0 ? ' ★ 최고 기록' : ''}</div>${got}
      <div class="kv"><span>시나리오 / 회사</span><span class="v">${esc(M.SCENARIOS[r.scenario].name)} / ${esc(M.COMPANIES[r.company].name)}</span><span>도달</span><span class="v">${r.month}개월차 ${r.turn}턴</span><span>총 배송 수익</span><span class="v">${r.revenue}c</span><span>총 지출</span><span class="v">${r.spent}c</span><span>최종 자금</span><span class="v">${r.cash}c</span><span>스트레스</span><span class="v">${r.stress}</span><span>호출 / 대기</span><span class="v">${r.calls} / ${r.waits}</span><span>처리 택배 / 폐기</span><span class="v">${r.delivered} / ${r.discarded}</span><span>퍽</span><span class="v">${r.perks.map(p => M.PERKS[p].name).join(', ') || '없음'}</span>${r.variants.length ? `<span>변형</span><span class="v">${r.variants.map(v => M.DAILY_VARIANTS[v].name).join(', ')}</span>` : ''}<span>시드</span><span class="v">${r.seed}</span></div>`;
    const again = r.scenario === 'daily' ? { label: '타이틀로', cls: 'primary', onClick: () => { closeModal(); game = null; showTitle(); } } : { label: '같은 조건으로 다시', cls: 'primary', onClick: () => { closeModal(); const cfg = game.cfg; game = new Game({ scenario: cfg.scenario, company: cfg.company, perks: cfg.perks }); startPlay(); } };
    modal(r.win ? '런 성공!' : '게임오버', body, [{ label: '타이틀로', onClick: () => { closeModal(); game = null; showTitle(); } }, again]);
  }
  function showRecords(back) {
    const P = Profile.get();
    const recs = Object.keys(P.records).map(sc => `<div style="margin-top:6px"><b>${esc(M.SCENARIOS[sc].name)}</b>: ${Object.keys(P.records[sc]).map(co => `${esc(M.COMPANIES[co].name)} ${P.records[sc][co].bestScore}점`).join(' · ')}</div>`).join('');
    const body = `<div class="records"><p>최고 기록 <b>${P.stats.bestScore}점</b> · 런 ${P.stats.runs}회 (성공 ${P.stats.clears})${P.stats.dailyStreak ? ` · 데일리 연속 ${P.stats.dailyStreak}일` : ''}</p>${recs}<hr>${P.recentRuns.length ? P.recentRuns.map(r => `<div>${r.date} · <b>${r.score}점</b> · ${r.win ? '성공' : '실패'} · ${esc(M.SCENARIOS[r.scenario] ? M.SCENARIOS[r.scenario].name : r.scenario)} / ${esc(M.COMPANIES[r.company] ? M.COMPANIES[r.company].name : r.company)} (${r.month}개월차 ${r.turn}턴)</div>`).join('') : '<p>아직 기록이 없습니다.</p>'}</div>`;
    modal('런 기록', body, [{ label: '닫기', onClick: back }]);
  }

  // ---------- 도감 ----------
  function showCodex(tab, back) {
    const P = Profile.get();
    const tabs = [['companies', '회사'], ['perks', '퍽'], ['scenarios', '시나리오'], ['achievements', '도전과제'], ['stats', '통계']];
    let body = `<div class="tabs">${tabs.map(([id, nm]) => `<button class="btn small ${tab === id ? 'gold' : ''}" data-tab="${id}">${nm}</button>`).join('')}</div>`;
    if (tab === 'companies') body += Object.keys(M.COMPANIES).map(id => { const co = M.COMPANIES[id], un = P.unlocked.companies.includes(id); const clears = P.stats.clearsByCompany[id] || 0; return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${un ? co.icon : '🔒'} ${esc(co.name)} <small style="color:var(--dim)">${esc(co.tag)}</small></span><span class="price">${clears ? clears + '승' : ''}</span></div>${un ? companyInfo(co, id) : `<div class="d">${esc(unlockText(co.unlock))}</div>`}</div>`; }).join('');
    else if (tab === 'perks') body += `<div class="perk-count">퍽 슬롯 ${Profile.perkSlots()}개 · 같은 계열은 하나만 장착</div>` + Object.keys(M.PERK_FAMILIES).map(f => `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${M.PERK_FAMILIES[f]} 계열</div>` + Object.keys(M.PERKS).filter(id => M.PERKS[id].family === f).map(id => { const pk = M.PERKS[id], un = P.unlocked.perks.includes(id); return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t">${un ? '' : '🔒 '}${esc(pk.name)}</div><div class="d">${esc(pk.desc)}${un ? '' : `<br>${esc(unlockText(pk.unlock))}`}</div></div>`; }).join('')).join('');
    else if (tab === 'scenarios') body += Object.keys(M.SCENARIOS).map(id => { const s = M.SCENARIOS[id], un = P.unlocked.scenarios.includes(id); const clears = P.stats.clearsByScenario[id] || 0; return `<div class="card ${un ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${un ? s.icon : '🔒'} ${esc(s.name)}</span><span class="price">${clears ? clears + '승' : ''}</span></div><div class="d">${esc(s.desc)}<br>승리: ${esc(s.win)}${un ? '' : `<br>${esc(unlockText(s.unlock))}`}</div></div>`; }).join('');
    else if (tab === 'achievements') {
      const groups = [['company', '회사 해금'], ['scenario', '시나리오 해금'], ['slot', '퍽 슬롯'], ['multi', '첫 클리어'], ['perk', '퍽 해금'], ['none', '기록']];
      body += groups.map(([g, nm]) => { const ids = Object.keys(M.ACHIEVEMENTS).filter(id => M.ACHIEVEMENTS[id].rewardType === g); if (!ids.length) return ''; return `<div style="font-size:12px;color:var(--gold);margin:8px 0 4px">${nm}</div>` + ids.map(id => { const a = M.ACHIEVEMENTS[id], done = !!P.achievements[id]; const reward = a.rewardType === 'company' ? M.COMPANIES[a.reward].name : a.rewardType === 'perk' ? M.PERKS[a.reward].name : a.rewardType === 'scenario' ? M.SCENARIOS[a.reward].name : a.rewardType === 'slot' ? `퍽 슬롯 ${a.reward}개` : a.rewardType === 'multi' ? '반기 결산 + 퍽 슬롯 2개' : ''; return `<div class="card ${done ? '' : 'dis'}" style="cursor:default"><div class="t"><span>${done ? '🏆' : '⬜'} ${esc(a.name)}</span>${reward ? `<span class="price">${esc(reward)}</span>` : ''}</div><div class="d">${esc(a.desc)}</div></div>`; }).join(''); }).join('');
    } else {
      const s = P.stats, dt = s.deliveredByType;
      body += `<div class="kv"><span>런 / 클리어</span><span class="v">${s.runs} / ${s.clears}</span><span>최고 점수</span><span class="v">${s.bestScore}</span><span>처리 택배</span><span class="v">일반 ${dt.normal} · 신선 ${dt.fresh} · 파손 ${dt.fragile} · 국제 ${dt.intl} · 대형 ${dt.large}</span><span>호출 / 대기</span><span class="v">${s.calls} / ${s.waits}</span><span>계약 구매</span><span class="v">${s.contractsBought}</span><span>부패 폐기</span><span class="v">${s.discarded}</span><span>깔끔한 월말</span><span class="v">${s.tidyMonths}</span><span>데일리 연속</span><span class="v">${s.dailyStreak}일</span></div>
        <hr><p style="font-size:12px;color:var(--dim)">프로필은 이 기기에 저장됩니다 (구글 플레이 게임즈 연동 예정).</p><button class="btn small warn" id="cx-reset">프로필 초기화</button>`;
    }
    const m = modal('도감', body, [{ label: '닫기', onClick: back }]);
    m.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { SFX.click(); showCodex(b.dataset.tab, back); });
    const rs = m.querySelector('#cx-reset'); if (rs) rs.onclick = () => { if (confirm('해금·도전과제·기록을 모두 지웁니다. 계속할까요?')) { Profile.reset(); SFX.cancel(); showCodex('stats', back); } };
  }

  function showLog(back) {
    modal('진행 기록', `<div class="log-list">${game.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>`, [{ label: '닫기', onClick: back }]);
  }
  function showHelp(back) {
    const body = `<div class="help">
      <p>택배가 매 턴 창고로 들어옵니다. 운송 업체를 호출해 처리하거나 <b>대기</b>해서 택배를 모아 두세요. 호출 비용은 택배 개수가 아니라 <b>호출 횟수</b> 기준이므로, 한 번에 많이 처리할수록 이득입니다.</p>
      <h3>런 준비</h3><p><b>시나리오</b>(길이·규칙) → <b>회사</b>(시작 창고·계약·고유 특성) → <b>퍽</b>(작은 규칙 변경) 순서로 고릅니다. 회사·퍽·시나리오는 <b>도전과제</b>로 해금되며, 도감에서 조건을 볼 수 있습니다.</p>
      <h3>한 턴의 순서</h3><p>입고 → 업체 호출 또는 대기 → 배송 → 신선도·기한 진행 → 창고 초과·지연 페널티</p>
      <h3>택배 종류</h3><table><tr><th>종류</th><th>크기</th><th>기한</th><th>전문 업체</th></tr>
      <tr><td>일반</td><td>1~2</td><td>6턴</td><td>일반 라인 / 대량 분류</td></tr><tr><td>신선식품</td><td>2~4</td><td>3턴(부패)</td><td>냉장 물류</td></tr><tr><td>파손주의</td><td>2~4</td><td>7턴</td><td>프래자일 전문</td></tr><tr><td>국제운송</td><td>4~7</td><td>8턴</td><td>국제 특송</td></tr><tr><td>대형화물</td><td>4~7</td><td>8턴</td><td>대형 화물 (4개월차~)</td></tr></table>
      <p>타겟 멀티모달은 어떤 택배든 1개, 긴급 특송도 어떤 택배든 1개를 처리합니다(특수 보너스 없음). 기한을 넘기면 보상 감소와 스트레스 +1. 신선식품은 3턴이 지나면 보상 50%, 그 다음 턴에 폐기(+3)됩니다. 냉장 구역 밖(상온)의 신선식품은 2배 빨리 상합니다.</p>
      <h3>창고</h3><p>용량 초과 1~2: +1, 3~5: +2, 6 이상: +4 스트레스. 스트레스 ${D.GAMEOVER_STRESS}이면 게임오버. 월말에는 운영비와 기한 초과 택배 부피 3당 +1이 정산됩니다.</p>
      <h3>계약과 마켓</h3><p>계약마다 잔여 호출 횟수가 있고 월중에는 새 계약을 살 수 없습니다. 월말 마켓에서 계약 교체·강화·시설을 구매하세요. 계약을 교체하면 잔여 호출·신뢰도·강화가 사라집니다. 등급: 일반 &lt; 신뢰 &lt; 전문 &lt; 마스터.</p>
      <h3>신뢰도</h3><p>호출마다 경험치가 쌓입니다(정상 처리 +1, 처리량 80% 이상 +1, 특수 택배 기한 내 +1). 5xp: 회당 +1, 12xp: 4번째 호출마다 +1, 20xp: 전용 능력.</p></div>`;
    modal('게임 방법', body, [{ label: '닫기', onClick: back }]);
  }
  function showMenu() {
    const g = game, R = g.rules;
    const info = `<div class="d" style="font-size:12px;margin-bottom:6px">${esc(M.SCENARIOS[g.cfg.scenario].name)} · ${g.company.icon} ${esc(g.company.name)}<br><span style="color:var(--green)">＋ ${esc(g.company.passive)}</span><br><span style="color:var(--orange)">－ ${esc(g.company.weakness)}</span>${g.perks.length ? '<br>퍽: ' + g.perks.map(p => esc(M.PERKS[p].name + ' — ' + M.PERKS[p].desc)).join('<br>퍽: ') : ''}${(g.cfg.variants || []).length ? '<br>변형: ' + g.cfg.variants.map(v => esc(M.DAILY_VARIANTS[v].name + ' — ' + M.DAILY_VARIANTS[v].desc)).join(', ') : ''}</div>`;
    const m = modal('메뉴', `${info}<p style="font-size:12px;color:var(--dim)">진행 상황은 매 턴 자동 저장됩니다.</p><label style="display:flex;align-items:center;gap:8px;font-size:12px">음악 볼륨 <input type="range" id="vol" min="0" max="1" step="0.05" value="${opts.musicVol}" style="flex:1"></label>`, [
      { label: '계속하기', cls: 'primary', onClick: closeModal },
      { label: `효과음 ${opts.sound ? '끄기' : '켜기'}`, onClick: () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); saveOpts(); closeModal(); } },
      { label: `음악 ${opts.music ? '끄기' : '켜기'}`, onClick: () => { opts.music = !opts.music; BGM.setEnabled(opts.music); saveOpts(); closeModal(); } },
      { label: '런 포기', cls: 'warn', onClick: () => { if (confirm('이 런을 포기하고 타이틀로 돌아갈까요? (기록에는 남지 않습니다)')) { Store.remove(SAVE_KEY); closeModal(); game = null; showTitle(); } } },
    ]);
    m.querySelector('#vol').oninput = e => { opts.musicVol = +e.target.value; BGM.setVolume(opts.musicVol); saveOpts(); };
  }

  // ---------- init ----------
  function init() {
    scene = new Scene3D($('#scene'));
    for (let i = 0; i < D.CONTRACT_SLOTS; i++) $('#c' + i).onclick = () => onContractTap(i);
    $('#wait-btn').onclick = doWait;
    $('#log-btn').onclick = () => { if (game) { SFX.click(); showLog(closeModal); } };
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
