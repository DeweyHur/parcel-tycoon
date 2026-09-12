// 스토리 모드 스모크 테스트 + 스크린샷: node test/story-shot.js (http://localhost:8765 필요)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message, (e.stack || '').split('\n')[1]); });
  page.on('console', m => { if (m.type() === 'error' && !/audio|font|mp3|woff|404/i.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(600);
  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: 'shots/s01-title.png' });
  await page.click('#t-story'); await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/s02-story-start.png' });
  await page.click('.foot .btn.primary'); await page.waitForTimeout(900);
  await page.screenshot({ path: 'shots/s03-intro.png' });
  const storyVisible = async () => await page.$eval('#story', el => !el.hidden);
  const seen = [];
  const settle = async () => { await page.waitForFunction(() => !PT.busy, null, { timeout: 15000 }); await page.waitForTimeout(250); };
  const readBeat = async () => { await settle(); while (await storyVisible()) { seen.push(await page.$eval('#story-body', el => el.textContent.slice(0, 40))); await page.click('#story-next'); await page.waitForTimeout(150); } };
  await page.click('#story-next'); await page.waitForTimeout(150); await page.screenshot({ path: 'shots/s04-intro-2.png' });
  await page.click('#story-next'); await page.waitForTimeout(150); await page.screenshot({ path: 'shots/s05-intro-3-hl-wait.png' });
  await readBeat();
  // 첫 달 진행: 대기 2턴 → 호출 가능하면 호출, 아니면 대기. 스토리는 나오는 대로 읽는다
  for (let t = 0; t < 40; t++) {
    const phase = await page.evaluate(() => PT.game.phase);
    if (phase !== 'play') break;
    await readBeat();
    if (t === 2) await page.screenshot({ path: 'shots/s06-turn3.png' });
    const ready = await page.$('.btn.contract.ready');
    if (ready && t >= 2) {
      await ready.click(); await page.waitForTimeout(300);
      for (const b of await page.$$('.modal .body .btn')) { if (/급한|Auto/.test(await b.textContent())) { await b.click(); await page.waitForTimeout(100); break; } }
      await page.screenshot({ path: 'shots/s07-call-modal.png' });
      const go = await page.$('.foot .btn.primary:not([disabled])'); if (go) { await go.click(); await page.waitForTimeout(1300); } else { await page.click('.foot .btn'); await page.waitForTimeout(200); await page.click('#wait-btn'); await page.waitForTimeout(300); const w = await page.$('.foot .btn.primary'); if (w) { await w.click(); await page.waitForTimeout(700); } }
    } else {
      await page.click('#wait-btn', { timeout: 5000 }); await page.waitForTimeout(300);
      const go = await page.$('.foot .btn.primary'); if (go) { await go.click(); await page.waitForTimeout(700); }
    }
    await readBeat();
  }
  await page.screenshot({ path: 'shots/s08-summary.png' });
  await readBeat();
  const btn = await page.$('.foot .btn.primary'); if (btn) { await btn.click(); await page.waitForTimeout(500); }
  await page.screenshot({ path: 'shots/s09-market.png' });
  await readBeat();
  // 달력
  await page.evaluate(() => { document.querySelector('#modal-root').classList.remove('show'); });
  await page.click('#hud-month'); await page.waitForTimeout(200);
  await page.screenshot({ path: 'shots/s10-calendar.png' });
  console.log('beats seen:', seen.length, seen);
  console.log('errors:', errors);
  await browser.close();
  if (errors.length) process.exit(1);
})();
