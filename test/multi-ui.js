// 멀티 「난투」 1단계 화면 점검: 타이틀 → 난투 시작 → 상대 줄 → 며칠 플레이 → 장 보기(하루 소모) → 퍽 3택1 → 저장·이어하기 → 결과(순위표)
// node test/multi-ui.js   (npm run serve 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.OUT || 'shots';
const BASE = process.env.BASE || 'http://localhost:8765';
const pass = [], fail = [];
const M_N = +(process.env.PLAYERS || 2);   // 1:1 (META.MULTI.PLAYERS)
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
  await page.click('#t-multi'); await page.waitForTimeout(300);
  const chrPick = await page.evaluate(() => { const cs = [...document.querySelectorAll('#modal .pkcard.chr')]; const c = cs.find(x => x.dataset.id === 'dock') || cs[0]; if (c) c.click(); return cs.length; });
  await page.waitForTimeout(300); const loadPick = await page.evaluate(() => { const fams = document.querySelectorAll('#modal .mfam').length, sel = document.querySelectorAll('#modal .mfam.sel').length, rars = document.querySelectorAll('#modal .mtr .rar').length; const b = [...document.querySelectorAll('#modal .foot .btn')].pop(); if (b) b.click(); return { fams, sel, rars }; });   // 셋업: 계열 둘 + 트레잇 — 그대로 출발
  ok('캐릭터 고르기 화면은 없다 — 곧장 셋업', chrPick === 0, String(chrPick));
  ok('셋업: 계열 다섯 중 둘 고름 · 트레잇엔 레어도', loadPick.fams === 5 && loadPick.sel === 2 && loadPick.rars >= 15, JSON.stringify(loadPick));
  const introT0 = Date.now(); let introSeen = false; for (let k = 0; k < 40 && !introSeen; k++) { introSeen = await page.evaluate(() => !!document.querySelector('#mintro')); if (!introSeen) await page.waitForTimeout(100); } console.log('intro after', Date.now() - introT0, 'ms', introSeen); await page.waitForTimeout(300);
  const intro = await page.evaluate(() => ({ on: !!document.querySelector('#mintro'), cards: document.querySelectorAll('#mintro .ic').length, vs: !!document.querySelector('#mintro .vs'), theme: !!document.querySelector('#mintro .theme'), me: document.querySelector('#mintro .ic.me b') && document.querySelector('#mintro .ic.me b').textContent }));
  await page.screenshot({ path: `${OUT}/M-00b-intro.png` });
  ok('시작 화면: 넷 소개 카드 · VS · 나', intro.on && intro.cards === M_N && intro.vs && /나$/.test(intro.me) && intro.theme, JSON.stringify(intro));
  await page.evaluate(() => { const i = document.querySelector('#mintro'); if (i) i.click(); }); await page.waitForTimeout(400);
  const slam = await page.evaluate(() => ({ intro: !!document.querySelector('#mintro'), slam: document.querySelectorAll('#multi-strip .mp.slam').length }));
  ok('게임 화면으로: 시작 화면 사라지고 상대 카드가 쾅 박힌다', !slam.intro && slam.slam === M_N, JSON.stringify(slam));
  await page.waitForTimeout(1200); await idle();
  const prep = await page.evaluate(() => ({ phase: PT.game.phase, theme: PT.game.cfg.mtheme, modal: !!document.querySelector('#modal .foot, #modal .card, #modal .pkcard') }));
  ok('준비 마켓 없이 곧장 플레이 · 테마 있음', prep.phase === 'play' && !!prep.theme && !prep.modal, JSON.stringify(prep));
  const st = await page.evaluate(() => { const g = PT.game, m = PT.match; return { multi: g.rules.multi, storyOff: !!(g.story && g.story.off), players: m.players.length, strip: !document.querySelector('#multi-strip').hidden, cols: document.querySelectorAll('#multi-strip .mp').length, shop: document.querySelector('#shop-btn').hidden, turn: document.querySelector('#hud-turn').textContent, c3: document.querySelector('#c3').hidden, cap: g.warehouse.cap, cash: g.cash, months: g.rules.months }; });
  ok('난투 시작: 멀티 규칙 · 4인 · 상대 줄 4칸 · 장 보기 버튼 없음 · D+1 · 빈 슬롯 숨김 · 대사 꺼짐', st.multi && st.storyOff && st.players === M_N && st.strip && st.cols === M_N && st.shop && /D\+1/.test(st.turn) && st.c3, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/M-01-day1.png` });
  // 며칠 플레이: 차가 차면 부르고, 아니면 호출 없음 (봇이 따라오는지)
  const oneDay = async () => { const did = await page.evaluate(() => { const g = PT.game; if (g.perkOffer) { const c = document.querySelector('.pkcard'); if (c) c.click(); return 'perk'; } if (g.phase !== 'play') return 'skip'; const B = window.BOT; const b = B.STRATS.balanced(g); if (b) { document.querySelector('#c' + b.i).click(); return 'card'; } document.querySelector('#wait-btn').click(); return 'wait'; }); await page.waitForTimeout(150); if (did === 'card') { await page.evaluate(() => { const w = document.querySelector('#wait-btn'); if (!w.disabled) w.click(); }); } await page.waitForTimeout(400); await idle(); return did; };
  for (let i = 0; i < 14; i++) { if (await page.evaluate(() => PT.game.totalTurn) >= 9) break; await oneDay(); }
  const d8 = await page.evaluate(() => { const g = PT.game, m = PT.match; return { day: g.totalTurn, bots: m.players.slice(1).map(p => p.game.totalTurn), strip: document.querySelector('#multi-strip').textContent, fees: g.feesDue, save: !!localStorage.getItem('pt_multi_v1'), single: !!localStorage.getItem('pt_save_v2') }; });
  ok('8일 뒤: 봇들도 각자 시계로 따라옴 · 배차비 즉시 결제(후불 0) · 저장 없음', d8.day >= 8 && d8.bots.every(b => b >= 5) && d8.fees === 0 && !d8.save && !d8.single, JSON.stringify(d8));
  await page.screenshot({ path: `${OUT}/M-02-day8.png` });
  // 사이클 끝: 장 없이 곧장 다음 보름, 배차는 다시 찬다 (유저: "상점을 없애면")
  await page.evaluate(() => { const g = PT.game; g.cash = 900; g.turn = g.turns(); g.parcels = []; g.schedule = g.schedule.map(() => []); g.contracts[0].calls = 0; PT.renderAll(); document.querySelector('#wait-btn').click(); });
  await page.waitForTimeout(900); await idle();
  const cyc = await page.evaluate(() => ({ phase: PT.game.phase, month: PT.game.month, calls: PT.game.contracts[0].calls, max: PT.game.contracts[0].maxCalls, market: !!(PT.game.market && document.querySelector('#modal')), modal: (document.querySelector('#modal') || {}).textContent }));
  ok('사이클 끝 → 장 없이 다음 보름 · 배차 리필', cyc.phase === 'play' && cyc.month === 2 && cyc.calls === cyc.max && !cyc.market, JSON.stringify(cyc).slice(0, 200));
  // 평판 상점: 평판을 상한까지 올리면 랜덤 3장(퍽 + 매물) — 내 돈으로 산다
  await page.evaluate(() => { const g = PT.game; g.cash = 3000; g.addRep(99, null); PT.renderAll(); });
  const PT_STEP = await page.evaluate(() => PT.game.rules.repStep); const offer = await page.evaluate(() => ({ items: PT.game.repShop && PT.game.repShop.items.map(it => it.kind), tier: PT.game.repTier, cap: PT.game.repCap() }));
  ok('상한 도달 → 등급 +1 · 상한은 점점 넓게 · 상점 3장', offer.items && offer.items.length >= 1 && offer.tier >= 1 && offer.cap > 0, JSON.stringify(offer));
  await page.evaluate(() => document.querySelector('#wait-btn').click()); await page.waitForTimeout(500); await idle();   // 다음 마감에서 checkPhase 가 상점을 띄운다
  let t = await modalText();
  ok('평판 상점엔 닫기 버튼이 없다(하나는 꼭 고른다)', !(await page.$('#modal .foot .btn')));
  ok('평판 상점 팝업 — 값 없는 카드(한 종류)', /상점|전문화|정비소|협상|조합|경매장/.test(t) && (await page.$$('.pkcard')).length >= 1 && !/\d+c\b/.test(t), t.slice(0, 80).replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/M-04-perk.png` });
  const picked = await page.evaluate(() => { const g = PT.game; const sh = g.repShop; const i = sh.items.findIndex(it => it.kind === 'contract' && it.switchFrom != null || it.kind === 'adTicket'); const cash = g.cash; const b = document.querySelector(`.pkcard[data-i="${i}"]`); if (b) b.click(); return { i, kind: i >= 0 && sh.items[i].kind, cash, after: g.cash, sold: i >= 0 && sh.items[i].sold, closed: g.repShop !== sh, price: /\d+c/.test(document.body.textContent.slice(0, 0)) }; }); await page.waitForTimeout(400);
  ok('카드 하나 고르면 → 돈 안 들고 · 그 상점은 닫힌다', picked.i < 0 || (picked.after === picked.cash && picked.sold && picked.closed), JSON.stringify(picked));
  // 닫기 — 평판이 넘쳐 있으면(테스트는 +99) 닫자마자 다음 계단 상점이 이어진다. 다 닫으면 플레이
  let tiers = 0; for (let k = 0; k < 20 && await page.evaluate(() => !!PT.game.repShop); k++) { tiers++; await page.evaluate(() => { const rp = document.querySelector('#modal .card[data-s]'); if (rp) return rp.click(); const c = document.querySelector('#modal .pkcard:not([disabled])'); if (c) return c.click(); const b = [...document.querySelectorAll('#modal .foot .btn')].pop(); if (b) b.click(); }); await page.waitForTimeout(250); }   // 난투 상점엔 닫기가 없다 — 하나씩 고르며 넘긴다
  await idle();
  const closed = await page.evaluate(() => ({ shop: !!PT.game.repShop, phase: PT.game.phase, modal: !!document.querySelector('#modal .pkcard'), tier: PT.game.repTier, rep: PT.game.rep, cap: PT.game.repCap() }));
  ok('닫기 → 넘친 평판만큼 계단이 이어지고, 다 닫으면 플레이 계속', !closed.shop && closed.phase === 'play' && !closed.modal && closed.rep < closed.cap + 1, JSON.stringify(Object.assign({ tiers }, closed)));
  // ===== 2단계: 트레잇 · 공격 · 보수공사 =====
  // 내 창고에 🌧 소나기 트레잇 택배를 심고 대량으로 내보낸다 → 상대 전원에게 날아간다(outbox → 인박스)
  const fired = await page.evaluate(() => { const g = PT.game, m = PT.match; const c = g.contracts.find(x => x && /bulk/.test(x.carrier)); const si = g.contracts.indexOf(c);
    g.focusNext = false; g.parcels = g.parcels.filter(p => p.type !== 'normal'); const P = g._spawnParcel({ type: 'normal', size: 2, customer: 'anon', trait: 't_hurry' }); g.parcels.push(P); g._assignCold(); PT.renderAll();
    const badge = !!document.querySelector(`.ptile[data-id="${P.id}"] .tb.attack`);
    document.querySelector('#c' + si).click(); return { badge, id: P.id, si }; });
  await page.waitForTimeout(200);
  await page.evaluate(() => { const w = document.querySelector('#wait-btn'); if (!w.disabled) w.click(); }); await page.waitForTimeout(900); await idle();
  const inb = await page.evaluate(() => ({ inboxes: PT.match.players.slice(1).map(p => p.game.inbox.length + p.game.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').length), log: PT.game.log.find(l => l.k === 'log.traitAttack') }));
  ok('공격 트레잇: 칩에 붉은 뱃지 · 출고하면 한 명(조준 없으면 가장 꽉 찬 창고) 인박스로', fired.badge && inb.inboxes.filter(n => n >= 1).length === 1 && !!inb.log, JSON.stringify(inb));
  // 상대의 공격이 내 인박스에 → 다음 날 적용(평판 −1) + 피격 로그, 방패가 있으면 막힌다
  const hit = await page.evaluate(() => { const g = PT.game; g.inbox = []; const rep = g.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').length; g.receiveAttack({ trait: 't_seal', mult: 1, from: 1, fromName: '봇' }); g.shields = 1; g.receiveAttack({ trait: 't_hurry', mult: 1, from: 2, fromName: '봇2' }); document.querySelector('#wait-btn').click(); return rep; });
  await page.waitForTimeout(900); await idle();
  const hitR = await page.evaluate(n => ({ shields: PT.game.shields, logs: PT.game.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').slice(0, PT.game.log.filter(l => l.k === 'log.attackIn' || l.k === 'log.attackBlocked').length - n).map(l => l.k + ':' + l.p.icon) }), hit);
  ok('피격: 방패 한 겹이 먼저 온 🔒를 막고, ⏱는 맞았다', hitR.logs.includes('log.attackBlocked:🔒') && hitR.logs.includes('log.attackIn:⏱') && hitR.shields === 0, JSON.stringify(hitR));
  await page.screenshot({ path: `${OUT}/M-06-hit.png` });
  // 보수공사: 강제 수락 — 창고를 먹고, 목록에 줄이 생기고, 돌려보낼 수 없다
  const repair = await page.evaluate(() => { const g = PT.game; const used = g.usedVolume(); const r = g.receiveRepair({ size: 3, days: 6, hops: 0, from: 1 }); PT.renderAll(); const s = g.storage.find(x => x.kind === 'repair'); return { ok: r.ok, used, after: g.usedVolume(), rowText: document.querySelector('#multi-strip .mp.me').textContent, ret: g.returnStorage(s.id).ok }; });
  ok('보수공사: 창고 +3칸 점유 · 상대 줄에 🏗 · 출고 불가', repair.ok && repair.after === repair.used + 3 && /🏗/.test(repair.rowText) && repair.ret === false, JSON.stringify(repair));
  await page.screenshot({ path: `${OUT}/M-07-repair.png` });
  // 6일 지나면 이사 간다 → 상대에게 +1칸
  const moved = await page.evaluate(() => { const g = PT.game; const b = g.storage.find(x => x.kind === 'repair'); b.left = 1; document.querySelector('#wait-btn').click(); return b.id; });
  await page.waitForTimeout(900); await idle();
  const mv = await page.evaluate(id => ({ mine: PT.game.storage.filter(s => s.id === id).length, others: PT.match.players.slice(1).map(p => p.game.storage.filter(s => s.kind === 'repair').map(s => s.vol)).flat(), news: PT.game.log.some(l => l.k === 'log.repairOut') }), moved);
  ok('이사 완료: 내 창고에서 사라지고 상대 창고에 4칸으로', mv.mine === 0 && mv.others.some(v => v >= 4) && mv.news, JSON.stringify(mv));
  // 포트레잇 4개
  const faces = await page.evaluate(() => [...document.querySelectorAll('#multi-strip .mp .face')].map(i => i.getAttribute('src').startsWith('data:image')));
  ok('포트레잇 4개(스프라이트)', faces.length === M_N && faces.every(Boolean));
  // 난투는 저장하지 않는다 — saveGame 을 불러도 멀티 저장 키가 안 생기고, 자금 칸은 접혀 있고 잔액만 작게, 상대 카드엔 평판만
  await page.evaluate(() => PT.saveGame());
  const nosave = await page.evaluate(() => ({ save: !!localStorage.getItem('pt_multi_v1'), cashBox: document.querySelector('#hud-cash-box').hidden, due: document.querySelector('#hud-due').textContent, stripCash: /\dc\b/.test(document.querySelector('#multi-strip').textContent), repnum: document.querySelectorAll('#multi-strip .repnum').length }));
  ok('저장 없음 · HUD 에 돈 없음 · 상대 카드는 평판만', !nosave.save && nosave.cashBox && nosave.due === '' && !nosave.stripCash && nosave.repnum === M_N, JSON.stringify(nosave));
  // 평판이 오르면 숫자가 굴러가며 카드·HUD 가 반짝인다
  const anim = await page.evaluate(async () => { const g = PT.game; g.rep = Math.max(0, g.rep - 6); PT.renderAll(); await new Promise(r => setTimeout(r, 1100)); const before = document.querySelector('#stress-num').textContent; g.addRep(3, 'test'); PT.renderAll(); await new Promise(r => setTimeout(r, 120));
    const mid = document.querySelector('#stress-num').textContent, pulsing = document.querySelector('#stress-wrap').classList.contains('rep-up') || document.querySelector('#multi-strip .mp.me').classList.contains('rep-up');
    await new Promise(r => setTimeout(r, 1000)); return { before, mid, after: document.querySelector('#stress-num').textContent, pulsing, card: document.querySelector('#multi-strip .mp.me .repnum').textContent, rep: g.rep }; });
  ok('평판 +3: 숫자가 굴러감(중간값) · 반짝 · 끝값 일치', anim.pulsing && anim.mid !== anim.after && anim.after.startsWith(anim.rep + '/') && +anim.card === anim.rep, JSON.stringify(anim));
  // 끝까지: 사람은 빨리 감기(호출·대기 봇으로), 결과 = 순위표
  await page.evaluate(() => { const g = PT.game; let guard = 0; while ((g.phase === 'play' || g.phase === 'market') && !(g.month === g.rules.months && g.turn === g.turns()) && guard++ < 300) { if (g.perkOffer) window.BOT.pickPerkBot(g); window.BOT.multiDay(g, 'balanced'); } if (g.perkOffer) window.BOT.pickPerkBot(g); });
  await page.evaluate(() => { PT.renderAll(); }); await page.evaluate(() => document.querySelector('#wait-btn').click()); await page.waitForTimeout(1500); await idle();
  t = await modalText();
  const res = await page.evaluate(() => ({ phase: PT.game.phase, reason: PT.game.result && PT.game.result.reason, rep: PT.game.rep, day: PT.game.totalTurn, rows: document.querySelectorAll('.mrow').length, allDone: PT.match.players.every(p => p.game.phase === 'win' || p.game.phase === 'over'), save: !!localStorage.getItem('pt_multi_v1'), multi: (Profile.get().multi || {}).played, best: (Profile.get().multi || {}).best }));
  ok('결과: 순위표 4줄 · 봇 전부 완주 · 저장 삭제 · 프로필 기록', /난투/.test(t) && res.rows === M_N && res.allDone && !res.save && res.multi === 1, JSON.stringify(res) + ' ' + t.slice(0, 60).replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/M-05-result.png` });
  ok('콘솔 에러 0', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log(`\n${pass.length} ok, ${fail.length} fail`);
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
