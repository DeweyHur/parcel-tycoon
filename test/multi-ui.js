// 멀티 「난투」 1단계 화면 점검: 타이틀 → 난투 시작 → 상대 줄 → 며칠 플레이 → 장 보기(하루 소모) → 퍽 3택1 → 저장·이어하기 → 결과(순위표)
// node test/multi-ui.js   (npm run serve 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.OUT || 'shots';
const BASE = process.env.BASE || 'http://localhost:8765';
const pass = [], fail = [];
const ok = (name, cond, extra) => { (cond ? pass : fail).push(name + (extra ? ` — ${extra}` : '')); console.log((cond ? '  ok  ' : ' FAIL ') + name + (extra ? ` — ${extra}` : '')); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) errors.push('PAGEERROR ' + e.message); });
  page.on('console', m => { const t = m.text(); if (/\[i18n\]/.test(t)) errors.push('I18N ' + t); else if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load resource/i.test(t)) errors.push('CONSOLE ' + t); });
  await page.goto(BASE + '/index.html'); await page.waitForTimeout(500);
  await page.evaluate(() => { const P = Profile.get(); P.campaign.cleared = 6; P.campaign.level = 7; P.campaign.name = '새봄택배'; P.splashSeen = 5; Profile.save(); });
  await page.reload(); await page.waitForTimeout(800);
  for (let i = 0; i < 10; i++) { if (await page.$('#t-new')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
  const idle = () => page.waitForFunction(() => !PT.busy, null, { timeout: 8000 });
  const modalText = () => page.evaluate(() => (document.querySelector('#modal') || {}).textContent || '');
  ok('타이틀에 난투 버튼', !!(await page.$('#t-multi')));
  await page.screenshot({ path: `${OUT}/M-00-title.png` });
  await page.click('#t-multi'); await page.waitForTimeout(800); await idle();
  const st = await page.evaluate(() => { const g = PT.game, m = PT.match; return { multi: g.rules.multi, players: m.players.length, strip: !document.querySelector('#multi-strip').hidden, cols: document.querySelectorAll('#multi-strip .mp').length, shop: document.querySelector('#shop-btn').hidden, turn: document.querySelector('#hud-turn').textContent, c3: document.querySelector('#c3').hidden, cap: g.warehouse.cap, cash: g.cash, months: g.rules.months }; });
  ok('난투 시작: 멀티 규칙 · 4인 · 상대 줄 4칸 · 장 보기 버튼 없음 · D+1 · 빈 슬롯 숨김', st.multi && st.players === 4 && st.strip && st.cols === 4 && st.shop && /D\+1/.test(st.turn) && st.c3, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/M-01-day1.png` });
  // 며칠 플레이: 차가 차면 부르고, 아니면 호출 없음 (봇이 따라오는지)
  const oneDay = async () => { const did = await page.evaluate(() => { const g = PT.game; if (g.phase !== 'play' || g.perkOffer) return 'skip'; const B = window.BOT; const b = B.STRATS.balanced(g); if (b) { document.querySelector('#c' + b.i).click(); return 'card'; } document.querySelector('#wait-btn').click(); return 'wait'; }); await page.waitForTimeout(150); if (did === 'card') { await page.evaluate(() => { const w = document.querySelector('#wait-btn'); if (!w.disabled) w.click(); }); } await page.waitForTimeout(400); await idle(); return did; };
  for (let i = 0; i < 8; i++) await oneDay();
  const d8 = await page.evaluate(() => { const g = PT.game, m = PT.match; return { day: g.totalTurn, bots: m.players.slice(1).map(p => p.game.totalTurn), strip: document.querySelector('#multi-strip').textContent, fees: g.feesDue, save: !!localStorage.getItem('pt_multi_v1'), single: !!localStorage.getItem('pt_save_v2') }; });
  ok('8일 뒤: 봇들도 각자 시계로 따라옴 · 배차비 즉시 결제(후불 0) · 저장 없음', d8.day >= 8 && d8.bots.every(b => b >= 5) && d8.fees === 0 && !d8.save && !d8.single, JSON.stringify(d8));
  await page.screenshot({ path: `${OUT}/M-02-day8.png` });
  // 장은 보름에 한 번: 사이클 마지막 날을 넘기면 정산 팝업 없이 곧장 장(마켓)이 뜬다 — 업그레이드·강화·창고·광고만
  await page.evaluate(() => { const g = PT.game; g.cash = 900; g.turn = g.turns(); g.parcels = []; g.schedule = g.schedule.map(() => []); PT.renderAll(); document.querySelector('#wait-btn').click(); });
  await page.waitForTimeout(900); await idle();
  let t = await modalText();
  const cyc = await page.evaluate(() => ({ phase: PT.game.phase, shop: !!(PT.game.market && PT.game.market.shop), kinds: [...new Set((PT.game.market || { items: [] }).items.map(i => i.kind))], invest: !document.querySelector('#invest-btn').hidden || true, shopBtn: document.querySelector('#shop-btn').hidden }));
  ok('사이클 끝 → 장: 업그레이드·강화·창고·광고·배차 충전, 새 계약·새로고침 없음, 장 보기 버튼 없음', cyc.phase === 'market' && cyc.shop && /↑/.test(t) && cyc.kinds.includes('refill') && !/새 계열|새 계약/.test(t) && !(await page.$('#mk-refresh')) && cyc.shopBtn && cyc.kinds.every(k => ['contract', 'enh', 'fac', 'refill', 'adTicket', 'media', 'mediaUp'].includes(k)), JSON.stringify(cyc) + ' ' + t.slice(0, 120).replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/M-03-shop.png` });
  const bought = await page.evaluate(() => { const g = PT.game; const i = g.market.items.findIndex(it => it.kind === 'fac' && it.fac === 'expand1'); const cap = g.warehouse.cap; const el = document.querySelector(`#modal .card[data-i="${i}"]`); el.click(); return { cap, after: PT.game.warehouse.cap, cash: PT.game.cash }; });
  await page.waitForTimeout(300);
  ok('장에서 창고 확장 즉시 결제 · 칸 증가', bought.after > bought.cap && bought.cash < 900, JSON.stringify(bought));
  await page.evaluate(() => [...document.querySelectorAll('#modal .foot .btn')].pop().click()); await page.waitForTimeout(600); await idle();
  const after = await page.evaluate(() => ({ month: PT.game.month, phase: PT.game.phase }));
  ok('장을 닫으면 다음 사이클', after.month === 2 && after.phase === 'play', JSON.stringify(after));
  // 퍽 3택1: 평판을 상한까지 올려 등급업
  await page.evaluate(() => { const g = PT.game; g.addRep(99, null); PT.renderAll(); });
  const offer = await page.evaluate(() => ({ offer: PT.game.perkOffer, tier: PT.game.repTier, cap: PT.game.repCap() }));
  ok('상한 도달 → 등급 +1 · 상한 +8 · 카드 3장', offer.offer && offer.offer.length === 3 && offer.tier === 1 && offer.cap === 28, JSON.stringify(offer));
  await page.evaluate(() => document.querySelector('#wait-btn').click()); await page.waitForTimeout(500); await idle();   // 다음 마감에서 checkPhase 가 퍽 팝업을 띄운다
  t = await modalText();
  ok('퍽 팝업', /퍽 하나/.test(t) && (await page.$$('.pkcard')).length === 3, t.slice(0, 80).replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/M-04-perk.png` });
  const picked = await page.evaluate(() => { const b = document.querySelector('.pkcard'); const id = b.dataset.id; b.click(); return id; }); await page.waitForTimeout(400);
  const pk = await page.evaluate(() => ({ mperks: PT.game.mperks, offer: PT.game.perkOffer, hud: document.querySelector('#hud-perks').textContent }));
  ok('퍽 선택 → 장착 · 카드 닫힘 · HUD 아이콘', pk.mperks[0] === picked && !pk.offer && pk.hud.length > 0, JSON.stringify(pk));
  // ===== 2단계: 트레잇 · 공격 · 폭탄 =====
  // 내 창고에 🌧 소나기 트레잇 택배를 심고 대량으로 내보낸다 → 상대 전원에게 날아간다(outbox → 인박스)
  const fired = await page.evaluate(() => { const g = PT.game, m = PT.match; const c = g.contracts.find(x => x && /bulk/.test(x.carrier)); const si = g.contracts.indexOf(c);
    g.focusNext = false; g.parcels = g.parcels.filter(p => p.type !== 'normal'); const P = g._spawnParcel({ type: 'normal', size: 2, customer: 'anon', trait: 't_rain' }); g.parcels.push(P); g._assignCold(); PT.renderAll();
    const badge = !!document.querySelector(`.ptile[data-id="${P.id}"] .tb.attack`);
    document.querySelector('#c' + si).click(); return { badge, id: P.id, si }; });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const w = document.querySelector('#wait-btn'); if (!w.disabled) w.click(); }); await page.waitForTimeout(900); await idle();
  const inb = await page.evaluate(() => ({ inboxes: PT.match.players.slice(1).map(p => p.game.inbox.length + p.game.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').length), log: PT.game.log.find(l => l.k === 'log.traitAttack') }));
  ok('공격 트레잇: 칩에 붉은 뱃지 · 출고하면 봇 3명 인박스로', fired.badge && inb.inboxes.every(n => n >= 1) && !!inb.log, JSON.stringify(inb));
  // 상대의 공격이 내 인박스에 → 다음 날 적용(평판 −1) + 피격 로그, 방패가 있으면 막힌다
  const hit = await page.evaluate(() => { const g = PT.game; g.inbox = []; const rep = g.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').length; g.receiveAttack({ trait: 't_claim', mult: 1, from: 1, fromName: '봇' }); g.shields = 1; g.receiveAttack({ trait: 't_hurry', mult: 1, from: 2, fromName: '봇2' }); document.querySelector('#wait-btn').click(); return rep; });
  await page.waitForTimeout(900); await idle();
  const hitR = await page.evaluate(n => ({ shields: PT.game.shields, logs: PT.game.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').slice(0, PT.game.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').length - n).map(l => l.k + ':' + l.p.icon) }), hit);
  ok('피격: 방패 한 겹이 먼저 온 📞를 막고, ⏱는 맞았다', hitR.logs.includes('log.attackBlocked:📞') && hitR.logs.includes('log.attackIn:⏱') && hitR.shields === 0, JSON.stringify(hitR));
  await page.screenshot({ path: `${OUT}/M-06-hit.png` });
  // 이삿짐 폭탄: 강제 수락 — 창고를 먹고, 목록에 줄이 생기고, 돌려보낼 수 없다
  const bomb = await page.evaluate(() => { const g = PT.game; const used = g.usedVolume(); const r = g.receiveBomb({ size: 3, days: 6, hops: 0, from: 1 }); PT.renderAll(); const s = g.storage.find(x => x.kind === 'bomb'); return { ok: r.ok, used, after: g.usedVolume(), rowText: document.querySelector('#multi-strip .mp.me').textContent, ret: g.returnStorage(s.id).ok }; });
  ok('폭탄: 창고 +3칸 점유 · 상대 줄에 🧨 · 출고 불가', bomb.ok && bomb.after === bomb.used + 3 && /🧨/.test(bomb.rowText) && bomb.ret === false, JSON.stringify(bomb));
  await page.screenshot({ path: `${OUT}/M-07-bomb.png` });
  // 6일 지나면 이사 간다 → 상대에게 +1칸
  const moved = await page.evaluate(() => { const g = PT.game; const b = g.storage.find(x => x.kind === 'bomb'); b.left = 1; document.querySelector('#wait-btn').click(); return b.id; });
  await page.waitForTimeout(900); await idle();
  const mv = await page.evaluate(id => ({ mine: PT.game.storage.filter(s => s.id === id).length, others: PT.match.players.slice(1).map(p => p.game.storage.filter(s => s.kind === 'bomb').map(s => s.vol)).flat(), news: PT.game.log.some(l => l.k === 'log.bombOut') }), moved);
  ok('이사 완료: 내 창고에서 사라지고 상대 창고에 4칸으로', mv.mine === 0 && mv.others.includes(4) && mv.news, JSON.stringify(mv));
  // 포트레잇 4개
  const faces = await page.evaluate(() => [...document.querySelectorAll('#multi-strip .mp .face')].map(i => i.getAttribute('src').startsWith('data:image')));
  ok('포트레잇 4개(스프라이트)', faces.length === 4 && faces.every(Boolean));
  // 난투는 저장하지 않는다 — saveGame 을 불러도 멀티 저장 키가 안 생기고, 자금 칸은 접혀 있고 잔액만 작게, 상대 카드엔 평판만
  await page.evaluate(() => PT.saveGame());
  const nosave = await page.evaluate(() => ({ save: !!localStorage.getItem('pt_multi_v1'), cashBox: document.querySelector('#hud-cash-box').hidden, due: document.querySelector('#hud-due').textContent, stripCash: /\dc\b/.test(document.querySelector('#multi-strip').textContent), repnum: document.querySelectorAll('#multi-strip .repnum').length }));
  ok('저장 없음 · HUD 자금 칸 접힘(잔액만 작게) · 상대 카드는 평판만', !nosave.save && nosave.cashBox && /c$/.test(nosave.due) && !nosave.stripCash && nosave.repnum === 4, JSON.stringify(nosave));
  // 평판이 오르면 숫자가 굴러가며 카드·HUD 가 반짝인다
  const anim = await page.evaluate(async () => { const g = PT.game; const before = document.querySelector('#stress-num').textContent; g.addRep(3, 'test'); PT.renderAll(); await new Promise(r => setTimeout(r, 120));
    const mid = document.querySelector('#stress-num').textContent, pulsing = document.querySelector('#stress-wrap').classList.contains('rep-up') || document.querySelector('#multi-strip .mp.me').classList.contains('rep-up');
    await new Promise(r => setTimeout(r, 1000)); return { before, mid, after: document.querySelector('#stress-num').textContent, pulsing, card: document.querySelector('#multi-strip .mp.me .repnum').textContent, rep: g.rep }; });
  ok('평판 +3: 숫자가 굴러감(중간값) · 반짝 · 끝값 일치', anim.pulsing && anim.mid !== anim.after && anim.after.startsWith(anim.rep + '/') && +anim.card === anim.rep, JSON.stringify(anim));
  // 끝까지: 사람은 빨리 감기(호출·대기 봇으로), 결과 = 순위표
  await page.evaluate(() => { const g = PT.game; let guard = 0; while ((g.phase === 'play' || g.phase === 'market') && !(g.month === g.rules.months && g.turn === g.turns()) && guard++ < 300) { if (g.perkOffer) window.BOT.pickPerkBot(g); window.BOT.multiDay(g, 'balanced'); } if (g.perkOffer) window.BOT.pickPerkBot(g); });
  await page.evaluate(() => { PT.renderAll(); }); await page.evaluate(() => document.querySelector('#wait-btn').click()); await page.waitForTimeout(1500); await idle();
  t = await modalText();
  const res = await page.evaluate(() => ({ phase: PT.game.phase, reason: PT.game.result && PT.game.result.reason, rep: PT.game.rep, day: PT.game.totalTurn, rows: document.querySelectorAll('.mrow').length, allDone: PT.match.players.every(p => p.game.phase === 'win' || p.game.phase === 'over'), save: !!localStorage.getItem('pt_multi_v1'), multi: (Profile.get().multi || {}).played, best: (Profile.get().multi || {}).best }));
  ok('결과: 순위표 4줄 · 봇 전부 완주 · 저장 삭제 · 프로필 기록', /난투/.test(t) && res.rows === 4 && res.allDone && !res.save && res.multi === 1, JSON.stringify(res) + ' ' + t.slice(0, 60).replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/M-05-result.png` });
  ok('콘솔 에러 0', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log(`\n${pass.length} ok, ${fail.length} fail`);
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
