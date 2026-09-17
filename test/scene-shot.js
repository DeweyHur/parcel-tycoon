// 착탈식 창고 모델 확인: 창고 상태별로 3D 뷰만 찍는다.
// node test/scene-shot.js   (npm run serve 필요)
const { chromium } = require('playwright');
const fs = require('fs');

const CASES = [
  ['lv1', { cap: 16, cold: 0, frozen: 0, xl: 0 }],                       // 레벨 1: 실내 + 야외뿐
  ['lv1-expand', { cap: 24, cold: 0, frozen: 0, xl: 0 }],                // 확장 한 번 (냉장은 아직)
  ['cold', { cap: 24, cold: 6, frozen: 0, xl: 1 }],                      // 냉장실이 붙었다
  ['full', { cap: 24, cold: 6, frozen: 4, xl: 1 }],                      // 기존 동네 택배(만재 기준)
  ['big', { cap: 42, cold: 10, frozen: 4, xl: 2, coldvan: true } ],      // 후반: 깊어진 본동 + 밴
];

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message); } });
  await page.goto('http://localhost:8765/index.html?nointro=1');
  await page.waitForTimeout(700);
  fs.mkdirSync('shots', { recursive: true });

  // 레벨 1을 켜서 게임 상태를 하나 만든다
  await page.click('#t-level'); await page.waitForTimeout(1200);
  for (let k = 0; k < 6; k++) { if (await page.$eval('#story', el => el.hidden)) break; await page.click('#story-body', { force: true }); await page.waitForTimeout(120); }
  const gate = await page.$eval('#story-gate', el => el.hidden).catch(() => true);
  if (!gate) { const t = await page.$('.story-hl'); if (t) { const b = await t.boundingBox(); if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); } }
  await page.waitForTimeout(400);
  // 대화창·게이트가 3D 뷰를 덮으므로 끄고 찍는다
  await page.evaluate(() => { PT.game.story.off = true; document.getElementById('story').hidden = true; document.getElementById('story-gate').hidden = true; PT.renderAll(); });
  await page.waitForTimeout(300);

  for (const [name, wh] of CASES) {
    const info = await page.evaluate(w => {
      const g = PT.game;
      Object.assign(g.warehouse, { cap: w.cap, cold: w.cold, frozen: w.frozen, xl: w.xl });
      for (const k of ['coldvan', 'padvan', 'bigvan']) g.warehouse[k] = !!w[k];
      PT.renderAll();
      const s = window.__scene || null;
      return { cap: g.warehouse.cap, cold: g.warehouse.cold };
    }, wh);
    await page.evaluate(() => { PT.scene.sync(PT.game, { animate: false }); });
    await page.waitForTimeout(1600);
    const box = await (await page.$('#scene')).boundingBox();
    await page.screenshot({ path: `shots/S-${name}.png`, clip: box });
    console.log('  찍음', name, JSON.stringify(info));
  }
  console.log('에러:', errors.length ? errors : '없음');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
