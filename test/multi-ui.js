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
  const st = await page.evaluate(() => { const g = PT.game, m = PT.match; return { multi: g.rules.multi, players: m.players.length, strip: !document.querySelector('#multi-strip').hidden, cols: document.querySelectorAll('#multi-strip .mp').length, shop: !document.querySelector('#shop-btn').hidden, turn: document.querySelector('#hud-turn').textContent, c3: document.querySelector('#c3').hidden, cap: g.warehouse.cap, cash: g.cash, months: g.rules.months }; });
  ok('난투 시작: 멀티 규칙 · 4인 · 상대 줄 4칸 · 장 보기 버튼 · D+1 · 빈 슬롯 숨김', st.multi && st.players === 4 && st.strip && st.cols === 4 && st.shop && /D\+1/.test(st.turn) && st.c3, JSON.stringify(st));
  await page.screenshot({ path: `${OUT}/M-01-day1.png` });
  // 며칠 플레이: 차가 차면 부르고, 아니면 호출 없음 (봇이 따라오는지)
  const oneDay = async () => { const did = await page.evaluate(() => { const g = PT.game; if (g.phase !== 'play' || g.perkOffer) return 'skip'; const B = window.BOT; const b = B.STRATS.balanced(g); if (b) { document.querySelector('#c' + b.i).click(); return 'card'; } document.querySelector('#wait-btn').click(); return 'wait'; }); await page.waitForTimeout(150); if (did === 'card') { await page.evaluate(() => { const w = document.querySelector('#wait-btn'); if (!w.disabled) w.click(); }); } await page.waitForTimeout(400); await idle(); return did; };
  for (let i = 0; i < 8; i++) await oneDay();
  const d8 = await page.evaluate(() => { const g = PT.game, m = PT.match; return { day: g.totalTurn, bots: m.players.slice(1).map(p => p.game.totalTurn), strip: document.querySelector('#multi-strip').textContent, fees: g.feesDue, save: !!localStorage.getItem('pt_multi_v1'), single: !!localStorage.getItem('pt_save_v2') }; });
  ok('8일 뒤: 봇들도 각자 시계로 따라옴 · 배차비 즉시 결제(후불 0) · 멀티 저장 키만', d8.day >= 8 && d8.bots.every(b => b >= 5) && d8.fees === 0 && d8.save && !d8.single, JSON.stringify(d8));
  await page.screenshot({ path: `${OUT}/M-02-day8.png` });
  // 장 보기: 하루가 간다
  await page.evaluate(() => { PT.game.cash = 900; PT.renderAll(); });
  const before = await page.evaluate(() => PT.game.totalTurn);
  await page.click('#shop-btn'); await page.waitForTimeout(500);
  let t = await modalText();
  ok('장 화면: 제목·업그레이드·강화·창고, 충전·새 계약·새로고침 없음', /장 보러 간 날/.test(t) && /↑/.test(t) && !/충전/.test(t) && !/새 계열|새 계약/.test(t) && !(await page.$('#mk-refresh')), t.slice(0, 160).replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/M-03-shop.png` });
  const bought = await page.evaluate(() => { const g = PT.game; const i = g.market.items.findIndex(it => it.kind === 'fac' && it.fac === 'expand1'); const cap = g.warehouse.cap; const el = document.querySelector(`#modal .card[data-i="${i}"]`); el.click(); return { cap, after: PT.game.warehouse.cap, cash: PT.game.cash }; });
  await page.waitForTimeout(300);
  ok('장에서 창고 확장 즉시 결제 · 칸 증가', bought.after > bought.cap && bought.cash < 900, JSON.stringify(bought));
  await page.evaluate(() => [...document.querySelectorAll('#modal .foot .btn')].find(b => /장 보고 나오기/.test(b.textContent)).click()); await page.waitForTimeout(600); await idle();
  const after = await page.evaluate(() => ({ day: PT.game.totalTurn, phase: PT.game.phase, shopDays: PT.game.stats.shopDays }));
  ok('장에서 나오면 하루가 간다', after.day === before + 1 && after.phase === 'play' && after.shopDays === 1, JSON.stringify(after));
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
  // 저장 → 새로고침 → 이어하기
  await page.evaluate(() => PT.saveGame());
  const saved = await page.evaluate(() => ({ day: PT.game.totalTurn, cash: PT.game.cash, bots: PT.match.players.slice(1).map(p => p.game.totalTurn) }));
  await page.reload(); await page.waitForTimeout(800);
  for (let i = 0; i < 10; i++) { if (await page.$('#t-multi-cont')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
  ok('타이틀에 난투 이어하기', !!(await page.$('#t-multi-cont')));
  await page.click('#t-multi-cont'); await page.waitForTimeout(800); await idle();
  const cont = await page.evaluate(() => ({ day: PT.game.totalTurn, cash: PT.game.cash, bots: PT.match.players.slice(1).map(p => p.game.totalTurn), multi: PT.game.rules.multi, mperks: PT.game.mperks }));
  ok('이어하기: 사람·봇 판 그대로', cont.day === saved.day && cont.cash === saved.cash && JSON.stringify(cont.bots) === JSON.stringify(saved.bots) && cont.multi && cont.mperks.length === 1, JSON.stringify({ saved, cont }));
  // 끝까지: 사람은 빨리 감기(호출·대기 봇으로), 결과 = 순위표
  await page.evaluate(() => { const g = PT.game; let guard = 0; while (g.phase === 'play' && !(g.month === g.rules.months && g.turn === g.turns()) && guard++ < 200) { if (g.perkOffer) window.BOT.pickPerkBot(g); window.BOT.multiDay(g, 'balanced'); } if (g.perkOffer) window.BOT.pickPerkBot(g); });
  await page.evaluate(() => { PT.renderAll(); }); await page.evaluate(() => document.querySelector('#wait-btn').click()); await page.waitForTimeout(1500); await idle();
  t = await modalText();
  const res = await page.evaluate(() => ({ phase: PT.game.phase, rows: document.querySelectorAll('.mrow').length, allDone: PT.match.players.every(p => p.game.phase === 'win' || p.game.phase === 'over'), save: !!localStorage.getItem('pt_multi_v1'), multi: (Profile.get().multi || {}).played }));
  ok('결과: 순위표 4줄 · 봇 전부 완주 · 저장 삭제 · 프로필 기록', /난투/.test(t) && res.rows === 4 && res.allDone && !res.save && res.multi === 1, JSON.stringify(res) + ' ' + t.slice(0, 60).replace(/\s+/g, ' '));
  await page.screenshot({ path: `${OUT}/M-05-result.png` });
  ok('콘솔 에러 0', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log(`\n${pass.length} ok, ${fail.length} fail`);
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
