// UI 스모크 테스트 + 스크린샷: node test/shot.js (http://localhost:8765 필요)
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(800);
  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: 'shots/01-title.png' });
  await page.click('#t-codex'); await page.waitForTimeout(300); await page.screenshot({ path: 'shots/01b-codex.png' }); await page.click('[data-tab=achievements]'); await page.waitForTimeout(200); await page.screenshot({ path: 'shots/01c-codex-ach.png' }); await page.click('.foot .btn');
  await page.click('#t-new');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/02-scenario.png' });
  await page.click('.foot .btn.primary'); await page.waitForTimeout(200); await page.screenshot({ path: 'shots/02b-company.png' });
  await page.click('.foot .btn.primary'); await page.waitForTimeout(200); await page.click('.card[data-id=skip]'); await page.waitForTimeout(150); await page.screenshot({ path: 'shots/02c-perks.png' });
  await page.click('.foot .btn.primary');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'shots/03-play.png' });
  // 대기 3턴
  for (let i = 0; i < 3; i++) { await page.click('#wait-btn'); await page.waitForTimeout(900); }
  await page.screenshot({ path: 'shots/04-after-wait.png' });
  // 호출 가능한 계약 탭
  const ready = await page.$('.btn.contract.ready');
  if (ready) {
    await ready.click(); await page.waitForTimeout(300);
    await page.screenshot({ path: 'shots/05-pick.png' });
    const urgent = await page.$('#pick-urgent'); if (urgent) await urgent.click();
    await page.waitForTimeout(200);
    await page.click('.foot .btn.primary');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shots/06-truck.png' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'shots/07-after-call.png' });
  }
  // 자동 플레이로 월말까지: 가능한 계약 중 첫 번째 호출, 없으면 대기
  for (let t = 0; t < 40; t++) {
    const phase = await page.evaluate(() => window.PT.game && window.PT.game.phase);
    if (phase !== 'play') break;
    const busy = await page.evaluate(() => document.querySelector('#wait-btn').disabled);
    if (busy) { await page.waitForTimeout(300); continue; }
    const r = await page.$('.btn.contract.ready');
    const usage = await page.evaluate(() => window.PT.game.usage());
    if (r && usage > 0.6) { await r.click(); await page.waitForTimeout(250); const u = await page.$('#pick-urgent'); if (u) await u.click(); await page.waitForTimeout(150); await page.click('.foot .btn.primary'); await page.waitForTimeout(2800); }
    else { await page.click('#wait-btn'); await page.waitForTimeout(700); }
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/08-summary.png' });
  const phase = await page.evaluate(() => window.PT.game && window.PT.game.phase);
  if (phase === 'summary') {
    await page.click('.foot .btn.primary'); await page.waitForTimeout(400);
    await page.screenshot({ path: 'shots/09-market.png' });
    const card = await page.$('.card'); if (card) { await card.click(); await page.waitForTimeout(300); await page.screenshot({ path: 'shots/10-slot.png' }); const s = await page.$('.card'); if (s) await s.click(); await page.waitForTimeout(300); }
    await page.screenshot({ path: 'shots/11-market2.png' });
    // 저장/이어하기 확인
    await page.reload(); await page.waitForTimeout(800);
    await page.screenshot({ path: 'shots/12-title-continue.png' });
    const cont = await page.$('#t-continue'); if (cont) { await cont.click(); await page.waitForTimeout(800); await page.screenshot({ path: 'shots/13-continued.png' }); }
  }
  console.log('bgm:', await page.evaluate(() => window.BGM.current()));
  console.log('phase:', phase, 'state:', await page.evaluate(() => { const g = window.PT.game; return g && { month: g.month, turn: g.turn, cash: g.cash, stress: g.stress, phase: g.phase, parcels: g.parcels.length }; }));
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
})();
