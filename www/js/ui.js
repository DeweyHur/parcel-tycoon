// UI / 진행 제어
(function () {
  const D = window.DATA;
  const $ = s => document.querySelector(s);
  const SAVE_KEY = 'pt_save_v1', REC_KEY = 'pt_records_v1', OPT_KEY = 'pt_opts_v1';
  let game = null, scene = null, busy = false;
  const opts = Object.assign({ sound: true, music: true, musicVol: 0.6 }, load(OPT_KEY) || {});
  SFX.setEnabled(opts.sound); BGM.setEnabled(opts.music); BGM.setVolume(opts.musicVol);

  function load(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function saveGame() { if (game && game.phase !== 'over' && game.phase !== 'win') store(SAVE_KEY, game.toJSON()); else try { localStorage.removeItem(SAVE_KEY); } catch (e) { } }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function ptype(p) { return D.PARCEL_TYPES[p.type]; }

  // ---------- toast / float ----------
  let toastTimer;
  function toast(msg, ms = 1800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), ms); }
  function floatText(txt, bad, xPct = 50) {
    const el = document.createElement('div'); el.className = 'float' + (bad ? ' bad' : ''); el.textContent = txt;
    el.style.left = xPct + '%'; el.style.top = '45%'; el.style.transform = 'translateX(-50%)';
    $('#float-layer').appendChild(el); setTimeout(() => el.remove(), 1300);
  }

  // ---------- modal ----------
  function modal(title, bodyHtml, buttons, sub) {
    const m = $('#modal');
    m.innerHTML = `<h2>${esc(title)}${sub ? `<small>${esc(sub)}</small>` : ''}</h2><div class="body">${bodyHtml}</div>` +
      (buttons && buttons.length ? `<div class="foot">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}" ${b.disabled ? 'disabled' : ''}>${esc(b.label)}</button>`).join('')}</div>` : '');
    m.querySelectorAll('.foot .btn').forEach(btn => btn.onclick = () => { SFX.resume(); SFX.click(); const b = buttons[+btn.dataset.i]; if (b.onClick) b.onClick(); });
    $('#modal-root').classList.add('show');
    return m;
  }
  function closeModal() { $('#modal-root').classList.remove('show'); $('#modal').innerHTML = ''; }

  // ---------- title ----------
  function showTitle() {
    const save = load(SAVE_KEY), rec = load(REC_KEY) || { best: 0, runs: [] };
    const body = `<div class="title"><h1>택배 타이쿤</h1><div class="sub">턴제 물류 경영 로그라이크 · 프로토타입</div>
      ${save ? `<button class="btn primary" id="t-continue">이어하기 <small style="color:var(--dim)">(${save.month}개월차 ${save.turn}턴)</small></button>` : ''}
      <button class="btn gold" id="t-new">새 런 시작</button>
      <button class="btn" id="t-help">게임 방법</button>
      <button class="btn" id="t-rec">기록 보기 <small style="color:var(--dim)">최고 ${rec.best}점</small></button>
      <div style="display:flex;gap:8px"><button class="btn" id="t-sound" style="flex:1">효과음: ${opts.sound ? '켜짐' : '꺼짐'}</button><button class="btn" id="t-music" style="flex:1">음악: ${opts.music ? '켜짐' : '꺼짐'}</button></div></div>`;
    const m = modal('택배 회사 게임', body, null, 'v0.2 prototype');
    if (save) m.querySelector('#t-continue').onclick = () => { SFX.resume(); SFX.select(); game = Game.fromJSON(save); closeModal(); startPlay(); };
    m.querySelector('#t-new').onclick = () => { SFX.resume(); SFX.select(); if (save && !confirm('진행 중인 런이 있습니다. 새로 시작하면 사라집니다. 계속할까요?')) return; newRun(); };
    m.querySelector('#t-help').onclick = () => { SFX.click(); showHelp(showTitle); };
    m.querySelector('#t-rec').onclick = () => { SFX.click(); showRecords(showTitle); };
    m.querySelector('#t-sound').onclick = () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); store(OPT_KEY, opts); SFX.resume(); SFX.click(); showTitle(); };
    m.querySelector('#t-music').onclick = () => { opts.music = !opts.music; BGM.setEnabled(opts.music); store(OPT_KEY, opts); SFX.resume(); BGM.resume(); SFX.click(); showTitle(); };
    BGM.play('title');
  }
  function newRun() {
    game = new Game();
    showPerkSelect();
  }
  function showPerkSelect() {
    const sel = new Set();
    const render = () => {
      const body = `<div class="perk-count">런 시작 Perk 2개를 선택하세요 (${sel.size}/2)</div>` + game.perkChoices.map(id => `<div class="card ${sel.has(id) ? 'sel' : ''}" data-id="${id}"><div class="t">${esc(D.PERKS[id].name)}</div><div class="d">${esc(D.PERKS[id].desc)}</div></div>`).join('');
      const m = modal('런 시작', body, [{ label: '시작', cls: 'primary', disabled: sel.size !== 2, onClick: () => { game.choosePerks([...sel]); closeModal(); startPlay(); } }], `시드 ${game.seed}`);
      m.querySelectorAll('.card').forEach(c => c.onclick = () => { SFX.resume(); const id = c.dataset.id; if (sel.has(id)) { sel.delete(id); SFX.cancel(); } else if (sel.size < 2) { sel.add(id); SFX.select(); } render(); });
    };
    render();
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
    const g = game;
    updateMusic();
    $('#hud-month').textContent = `${g.month}개월차`;
    $('#hud-turn').textContent = `${g.turn}/${D.TURNS_PER_MONTH}턴`;
    $('#hud-cash').textContent = g.cash;
    $('#stress-num').textContent = `${g.stress}/${D.GAMEOVER_STRESS}`;
    $('#stress-label').textContent = g.stressState();
    const gauge = $('#stress-gauge'); gauge.querySelector('i').style.width = Math.min(100, g.stress / D.GAMEOVER_STRESS * 100) + '%';
    gauge.className = 'gauge ' + (g.stress >= 16 ? 'crisis' : g.stress >= 11 ? 'danger' : g.stress >= 6 ? 'warn' : '');
    $('#hud-perks').textContent = g.perks.map(p => D.PERKS[p].name).join(' · ');
    // bars
    const used = g.usedVolume(), cap = g.warehouse.cap, pct = used / cap * 100;
    const bu = $('#bar-usage'); bu.querySelector('i').style.width = Math.min(100, pct) + '%'; $('#usage-txt').textContent = `${used}/${cap} (${Math.round(pct)}%)`;
    bu.className = 'bar usage ' + (pct > 100 ? 'over' : pct > 90 ? 'danger' : pct > 75 ? 'caution' : pct > 60 ? 'eff' : '');
    const cu = g.coldUsed(), cc = g.warehouse.cold; const bc = $('#bar-cold'); bc.querySelector('i').style.width = Math.min(100, cu / cc * 100) + '%'; $('#cold-txt').textContent = `${cu}/${cc}`; bc.className = 'bar cold ' + (cu > cc ? 'over' : '');
    // upcoming
    const up = g.upcoming();
    $('#upcoming').innerHTML = '<span>입고 예정</span>' + up.map(u => u.specs ? `<span class="chip">${u.turn}턴: ${u.specs.map(s => `<i style="background:${D.PARCEL_TYPES[s.type].css}"></i>${D.PARCEL_TYPES[s.type].short}${s.size}`).join(' ')}</span>` : `<span class="chip none">${u.turn > D.TURNS_PER_MONTH ? '월말 정산' : '-'}</span>`).join('');
    // parcels
    renderParcels($('#parcels'), g.parcels, null);
    // contracts
    for (let i = 0; i < D.CONTRACT_SLOTS; i++) {
      const btn = $('#c' + i), c = g.contracts[i];
      if (!c) { btn.innerHTML = '<div class="nm">빈 슬롯</div>'; btn.disabled = true; continue; }
      const car = D.CARRIERS[c.carrier], cap = g.callCapacity(c), elig = g.eligibleParcels(c).length, lv = g.trustLevel(c);
      const can = g.canCall(c) && !busy;
      btn.disabled = !can; btn.className = 'btn contract' + (can ? ' ready' : '');
      btn.innerHTML = `<div class="nm"><span>${esc(car.name)}${c.grade === 'trusted' ? '<span class="badge trusted">신뢰</span>' : ''}</span><span class="calls ${c.calls === 0 ? 'zero' : ''}">${c.calls}/${c.maxCalls}회</span></div>
        <div class="sub">회당 <b>${cap}</b>개 · 대상 <b>${elig}</b>개${lv ? ` · 신뢰 Lv${lv}` : ''}${c.enh.regular ? ' · 정기' : ''}</div>`;
    }
    $('#wait-btn').disabled = busy || g.phase !== 'play';
  }
  function parcelStatus(p) {
    const parts = [];
    if (p.type === 'fresh') {
      if (p.fresh <= 0) parts.push('부패 직전(50%)'); else parts.push(`신선 ${p.fresh}턴`);
      parts.push(p.inCold ? '<span class="tag cold">냉장</span>' : '<span class="tag warm">상온!</span>');
    }
    if (p.overdue) parts.push('기한 초과(-25%)'); else parts.push(`기한 ${p.deadline}턴`);
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
    if (car.mode === 'queue') {
      const body = `<p>${esc(car.desc)}</p><div class="pickinfo"><span>처리량 <b>${cap}</b>개${notes.length ? ` (${notes.join(', ')})` : ''}</span><span>잔여 <b>${c.calls}</b>회 → ${c.calls - 1}회</span></div><div id="pick-list" style="display:flex;flex-direction:column;gap:3px"></div>`;
      const m = modal(game.contractName(c), body, [{ label: '취소', onClick: closeModal }, { label: '호출', cls: 'primary', onClick: () => { closeModal(); doCall(i, elig.map(p => p.id)); } }]);
      renderParcels(m.querySelector('#pick-list'), elig, null);
      return;
    }
    const sel = new Set();
    const render = () => {
      const body = `<p>${esc(car.desc)}</p><div class="pickinfo"><span>선택 <b>${sel.size}</b>/${cap}개${notes.length ? ` (${notes.join(', ')})` : ''}</span><span>잔여 <b>${c.calls}</b>회 → ${c.calls - 1}회</span></div><div id="pick-list" style="display:flex;flex-direction:column;gap:3px"></div>
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
    const before = game.parcels.map(p => p.id);
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
    // 폐기 → 페널티 → 입고 순으로 연출
    for (const e of events) if (e.type === 'discard') { scene.discard(e.parcel.id); SFX.discard(); floatText('부패 폐기!', true, 30); }
    const pen = events.find(e => e.type === 'penalty');
    if (pen) { scene.shake(); SFX.penalty(); floatText(`스트레스 +${pen.amount}`, true, 50); toast(pen.reasons.join(' · '), 2600); }
    setTimeout(() => {
      scene.sync(game, { animate: true });
      if (events.some(e => e.type === 'arrive')) SFX.thud();
      busy = false; renderAll(); saveGame(); checkPhase();
    }, pen ? 500 : 150);
  }
  function checkPhase() {
    if (game.phase === 'summary') showSummary();
    else if (game.phase === 'market') showMarket();
    else if (game.phase === 'over' || game.phase === 'win') showResult();
  }

  // ---------- summary ----------
  function showSummary() {
    const s = game.summary;
    BGM.stinger('fanfare', 0.9);
    const body = `<div class="kv">
      <span>배송 수익</span><span class="v good">+${s.revenue}</span>
      <span>월말 운영비</span><span class="v bad">-${s.opCost}</span>
      <span>업체 호출 / 대기</span><span class="v">${s.calls}회 / ${s.waits}회</span>
      <span>처리한 택배</span><span class="v">${s.delivered}개</span>
      <span>이번 달 페널티</span><span class="v ${s.penalty ? 'bad' : ''}">+${s.penalty}</span>
      <span>미처리(기한 초과) 부피 ${s.overdueVol}</span><span class="v ${s.unprocPenalty ? 'bad' : ''}">+${s.unprocPenalty}</span>
      <span>부패 폐기</span><span class="v ${s.discarded ? 'bad' : ''}">${s.discarded}개</span>
      <hr style="grid-column:1/-1">
      <span>현재 자금</span><span class="v">${s.cash}c</span>
      <span>스트레스</span><span class="v ${s.stress >= 11 ? 'bad' : ''}">${s.stress}/${D.GAMEOVER_STRESS} (${game.stressState()})</span>
      <span>창고 사용률</span><span class="v">${s.usage}% (${s.left}개 보관 중)</span></div>`;
    const last = game.month >= D.MONTHS;
    modal(`${s.month}개월차 정산`, body, [{ label: last ? '최종 결과' : '마켓으로', cls: 'primary', onClick: () => { closeModal(); game.closeSummary(); saveGame(); checkPhase(); } }]);
  }

  // ---------- market ----------
  function showMarket() {
    const mk = game.market;
    BGM.play('market');
    const render = () => {
      const items = mk.items.map((it, i) => {
        let price = it.kind === 'contract' ? game.contractPrice(it) : it.price, desc = '';
        if (it.kind === 'contract') { const car = D.CARRIERS[it.carrier], g = D.GRADES[it.grade]; desc = `${car.desc}<br>회당 ${car.cap + g.cap}개 · 최대 ${car.calls + g.calls}회 호출`; }
        else if (it.kind === 'enh') desc = D.ENHANCEMENTS[it.enh].desc;
        else if (it.kind === 'fac') desc = it.fac ? D.FACILITIES[it.fac].desc : '이미 모든 시설을 구매했습니다';
        const kindLbl = { contract: '계약', enh: '강화', fac: '시설' }[it.kind];
        return `<div class="card ${it.sold ? 'sold' : ''}" data-i="${i}"><div class="t"><span>[${kindLbl}] ${esc(it.name)}${it.grade === 'trusted' ? '<span class="badge trusted">신뢰</span>' : ''}</span><span class="price">${it.sold ? '판매됨' : price + 'c'}</span></div><div class="d">${desc}</div></div>`;
      }).join('');
      const contracts = `<hr><div style="font-size:12px;color:var(--dim);margin-bottom:4px">현재 계약 (교체 시 잔여 호출·신뢰도·강화 소멸)</div>` + game.contracts.map(c => `<div style="font-size:12px">· ${esc(game.contractName(c))} — 잔여 ${c.calls}/${c.maxCalls}회, 회당 ${game.baseCapacity(c)}개${game.trustLevel(c) ? `, 신뢰 Lv${game.trustLevel(c)}` : ''}</div>`).join('');
      const body = `<div class="pickinfo"><span>자금 <b>${game.cash}</b>c</span><span>구매 <b>${mk.bought}</b>/${D.MARKET_MAX_BUY}</span></div>${items}
        <button class="btn small" id="mk-refresh" ${game.cash < game.refreshCost() ? 'disabled' : ''}>마켓 새로고침 (${game.refreshCost()}c)</button>${contracts}`;
      const m = modal(`${mk.month}개월차 마켓`, body, [{ label: `${mk.month + 1}개월차 시작`, cls: 'primary', onClick: () => { closeModal(); game.closeMarket(); game.takeEvents(); scene.sync(game, { animate: true }); SFX.thud(); saveGame(); renderAll(); checkPhase(); } }], `가격 ×${D.PRICE_MULT[mk.month]}`);
      m.querySelector('#mk-refresh').onclick = () => { const r = game.refreshMarket(); if (r.ok) { SFX.buy(); render(); } else toast(r.msg); };
      m.querySelectorAll('.card').forEach(el => el.onclick = () => {
        const it = mk.items[+el.dataset.i]; if (it.sold) return;
        SFX.click();
        if (mk.bought >= D.MARKET_MAX_BUY) return toast(`한 달에 ${D.MARKET_MAX_BUY}개까지만 구매할 수 있습니다`);
        const price = it.kind === 'contract' ? game.contractPrice(it) : it.price;
        if (game.cash < price) return toast('자금이 부족합니다');
        if (it.kind === 'fac') { const r = game.buy(+el.dataset.i, null); if (r.ok) { SFX.buy(); saveGame(); render(); } else toast(r.msg); return; }
        chooseSlot(it, +el.dataset.i, render);
      });
    };
    render();
  }
  function chooseSlot(it, idx, back) {
    const isContract = it.kind === 'contract';
    const body = `<p>${isContract ? '어느 슬롯의 계약을 교체할까요? 기존 계약의 잔여 호출·신뢰도·강화는 사라집니다.' : '어느 계약에 적용할까요?'}</p>` + game.contracts.map((c, s) => {
      const info = `잔여 ${c.calls}/${c.maxCalls}회 · 회당 ${game.baseCapacity(c)}개 · 신뢰 ${c.trust}xp` + (c.enh.limit ? ` · 한도강화 ${c.enh.limit}/2` : '') + (c.enh.cap ? ` · 용량강화 ${c.enh.cap}/3` : '') + (c.enh.regular ? ' · 정기 배차' : '');
      return `<div class="card" data-s="${s}"><div class="t">${esc(game.contractName(c))}</div><div class="d">${info}</div></div>`;
    }).join('');
    const m = modal(it.name, body, [{ label: '취소', onClick: back }]);
    m.querySelectorAll('.card').forEach(el => el.onclick = () => {
      const r = game.buy(idx, +el.dataset.s);
      if (r.ok) { SFX.buy(); saveGame(); back(); } else toast(r.msg);
    });
  }

  // ---------- result ----------
  function showResult() {
    const r = game.result;
    const rec = load(REC_KEY) || { best: 0, runs: [] };
    if (!r.recorded) {
      r.recorded = true;
      rec.best = Math.max(rec.best, r.score);
      rec.runs.unshift({ date: new Date().toISOString().slice(0, 10), score: r.score, win: r.win, month: r.month, turn: r.turn, cash: r.cash, stress: r.stress, perks: r.perks });
      rec.runs = rec.runs.slice(0, 10);
      store(REC_KEY, rec);
      try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
      BGM.stop(0.5);
      if (r.win) { SFX.win(); BGM.oneShot('fanfare'); } else { SFX.over(); setTimeout(() => BGM.oneShot('gameover'), 300); }
    }
    const body = `<p style="text-align:center">${esc(r.reason)}</p><div class="big-num">${r.score}점${r.score >= rec.best && r.score > 0 ? ' ★ 최고 기록' : ''}</div>
      <div class="kv"><span>도달</span><span class="v">${r.month}개월차 ${r.turn}턴</span><span>총 배송 수익</span><span class="v">${r.revenue}c</span><span>총 지출</span><span class="v">${r.spent}c</span><span>최종 자금</span><span class="v">${r.cash}c</span><span>스트레스</span><span class="v">${r.stress}</span><span>호출 / 대기</span><span class="v">${r.calls} / ${r.waits}</span><span>처리 택배 / 폐기</span><span class="v">${r.delivered} / ${r.discarded}</span><span>Perk</span><span class="v">${r.perks.map(p => D.PERKS[p].name).join(', ')}</span><span>시드</span><span class="v">${r.seed}</span></div>`;
    modal(r.win ? '런 성공!' : '게임오버', body, [{ label: '타이틀로', onClick: () => { closeModal(); game = null; showTitle(); } }, { label: '다시 도전', cls: 'primary', onClick: () => { closeModal(); newRun(); } }]);
  }
  function showRecords(back) {
    const rec = load(REC_KEY) || { best: 0, runs: [] };
    const body = `<div class="records"><p>최고 기록: <b>${rec.best}점</b></p>${rec.runs.length ? rec.runs.map(r => `<div>${r.date} · <b>${r.score}점</b> · ${r.win ? '성공' : '실패'} (${r.month}개월차 ${r.turn}턴) · 자금 ${r.cash}c</div>`).join('') : '<p>아직 기록이 없습니다.</p>'}</div>`;
    modal('런 기록', body, [{ label: '닫기', onClick: back }]);
  }
  function showLog(back) {
    modal('진행 기록', `<div class="log-list">${game.log.map(l => `<div>${esc(l)}</div>`).join('')}</div>`, [{ label: '닫기', onClick: back }]);
  }
  function showHelp(back) {
    const body = `<div class="help">
      <p>택배가 매 턴 창고로 들어옵니다. 운송 업체를 호출해 처리하거나 <b>대기</b>해서 택배를 모아 두세요. 호출 비용은 택배 개수가 아니라 <b>호출 횟수</b> 기준이므로, 한 번에 많이 처리할수록 이득입니다.</p>
      <h3>한 턴의 순서</h3><p>입고 → 업체 호출 또는 대기 → 배송 → 신선도·기한 진행 → 창고 초과·지연 페널티</p>
      <h3>택배 종류</h3><table><tr><th>종류</th><th>크기</th><th>기한</th><th>전문 업체</th></tr>
      <tr><td>일반</td><td>1~2</td><td>6턴</td><td>일반 라인 / 대량 분류</td></tr><tr><td>신선식품</td><td>2~4</td><td>3턴(부패)</td><td>냉장 물류</td></tr><tr><td>파손주의</td><td>2~4</td><td>7턴</td><td>프래자일 전문(마켓)</td></tr><tr><td>국제운송</td><td>4~7</td><td>8턴</td><td>국제 특송(마켓)</td></tr></table>
      <p>타겟 멀티모달은 어떤 택배든 1개를 골라 처리하지만 특수 보너스는 없습니다. 기한을 넘기면 보상 -25%와 스트레스 +1. 신선식품은 3턴이 지나면 보상 50%, 그 다음 턴에 폐기(+3)됩니다. 냉장 구역 밖(상온)의 신선식품은 2배 빨리 상합니다.</p>
      <h3>창고</h3><p>용량 초과 1~2: +1, 3~5: +2, 6 이상: +4 스트레스. 스트레스 ${D.GAMEOVER_STRESS}이면 게임오버. 월말에는 운영비 ${D.OPERATING_COST}c와 기한 초과 택배 부피 3당 +1이 정산됩니다.</p>
      <h3>계약과 마켓</h3><p>계약마다 잔여 호출 횟수가 있고 월중에는 새 계약을 살 수 없습니다. 월말 마켓에서 최대 ${D.MARKET_MAX_BUY}개를 구매해 계약을 교체하거나 강화하세요. 계약을 교체하면 잔여 호출·신뢰도·강화가 사라집니다.</p>
      <h3>신뢰도</h3><p>호출마다 경험치가 쌓입니다(정상 처리 +1, 처리량 80% 이상 +1, 특수 택배 기한 내 +1). 5xp: 회당 +1, 12xp: 4번째 호출마다 +1, 20xp: 전용 능력.</p>
      <p>${D.MONTHS}개월(${D.MONTHS * D.TURNS_PER_MONTH}턴)을 버티면 런 성공입니다.</p></div>`;
    modal('게임 방법', body, [{ label: '닫기', onClick: back }]);
  }
  function showMenu() {
    const m = modal('메뉴', `<p>진행 상황은 매 턴 자동 저장됩니다.</p><label style="display:flex;align-items:center;gap:8px;font-size:12px">음악 볼륨 <input type="range" id="vol" min="0" max="1" step="0.05" value="${opts.musicVol}" style="flex:1"></label>`, [
      { label: '계속하기', cls: 'primary', onClick: closeModal },
      { label: `효과음 ${opts.sound ? '끄기' : '켜기'}`, onClick: () => { opts.sound = !opts.sound; SFX.setEnabled(opts.sound); store(OPT_KEY, opts); closeModal(); } },
      { label: `음악 ${opts.music ? '끄기' : '켜기'}`, onClick: () => { opts.music = !opts.music; BGM.setEnabled(opts.music); store(OPT_KEY, opts); closeModal(); } },
      { label: '런 포기', cls: 'warn', onClick: () => { if (confirm('이 런을 포기하고 타이틀로 돌아갈까요? (기록에는 남지 않습니다)')) { try { localStorage.removeItem(SAVE_KEY); } catch (e) { } closeModal(); game = null; showTitle(); } } },
    ]);
    m.querySelector('#vol').oninput = e => { opts.musicVol = +e.target.value; BGM.setVolume(opts.musicVol); store(OPT_KEY, opts); };
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
  window.PT = { get game() { return game; }, renderAll, saveGame };
  init();
})();
