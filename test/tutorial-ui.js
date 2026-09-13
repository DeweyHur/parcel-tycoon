// 인수인계(대본) UI 스모크: 타이틀 → 새 런 권유 → 인수인계 → 3개월차까지 진행.
// 게이트·마켓 안내(충전/한도/갈아타기)·2대 동시 호출 비트가 실제 화면에서 나오는지 확인한다.
// node test/tutorial-ui.js  (http://localhost:8765 필요)
// 6사이클(72턴)을 UI로 끝까지 돌면 10분쯤 걸린다. 빠르게 볼 때는 CYCLES=2 node test/tutorial-ui.js
const CYCLES = +process.env.CYCLES || 6;
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message, (e.stack || '').split('\n')[1]); } });
  page.on('console', m => { if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load/i.test(m.text())) errors.push('CONSOLE ' + m.text()); if (/\[i18n\]/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(600);
  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: 'shots/t00-title.png' });

  // 1) 인수인계를 한 번도 안 한 프로필에서 '새 런' → 권유 모달
  await page.click('#t-new'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/t01-suggest.png' });
  const suggest = await page.$eval('.modal .head, .modal h2, .modal .title', el => el.textContent).catch(() => '');
  const body = await page.$eval('#modal-root', el => el.textContent);
  console.log('권유 모달:', /인수인계/.test(body) ? 'OK' : 'MISSING', '|', body.slice(0, 60).replace(/\s+/g, ' '));
  // 권유 모달의 primary = 인수인계 시작
  await page.click('.foot .btn.primary'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/t02-storystart.png' });
  await page.click('.foot .btn.primary'); await page.waitForTimeout(700);  // 난이도 선택 화면 → 시작
  // 게임 방법 3장 카드가 뜨면 넘긴다
  for (let k = 0; k < 5; k++) {
    const how = await page.$('#modal-root.show .how');
    if (!how) break;
    await page.click('.foot .btn.primary'); await page.waitForTimeout(300);
  }
  await page.waitForTimeout(400);

  const settle = async () => { await page.waitForFunction(() => !window.PT || !PT.busy, null, { timeout: 15000 }); await page.waitForTimeout(120); };
  const seen = [];
  const readBeat = async () => {
    await settle();
    while (!(await page.$eval('#story', el => el.hidden))) {
      const t = await page.$eval('#story-body', el => el.textContent.slice(0, 40));
      seen.push(t);
      await page.click('#story-body', { force: true }); await page.waitForTimeout(90);
    }
  };
  const passGate = async () => {
    let did = false;
    for (let k = 0; k < 12; k++) {
      if (await page.$eval('#story-gate', el => el.hidden)) break;
      did = true;
      const t = await page.$('.story-hl'); if (!t) break;
      const box = await t.boundingBox(); if (!box) break;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300); await readBeat();
    }
    return did;
  };

  const shots = {};
  let guard = 0;
  while (guard++ < 500) {
    const st = await page.evaluate(() => ({ phase: PT.game.phase, m: PT.game.month, t: PT.game.turn, seen: PT.game.story.seen.slice() }));
    if (st.phase === 'over' || st.phase === 'win') { console.log('run ended', st.phase, st.m); break; }
    if (st.m > CYCLES || st.phase === 'win') { console.log(`인수인계 ${CYCLES}사이클 완료`); break; }
    await readBeat();
    if (await passGate()) continue;
    if (st.phase === 'weekend') { await page.click('.wkopts .wkc:not([disabled])', { force: true }); await page.waitForTimeout(600); await readBeat(); continue; }
    if (st.phase === 'summary') { await page.click('.foot .btn.primary'); await page.waitForTimeout(400); continue; }
    if (st.phase === 'market') {
      if (!shots['mk' + st.m]) { shots['mk' + st.m] = 1; await page.screenshot({ path: `shots/t-market-m${st.m}.png` }); }
      // 안내가 끝나면 배차 0인 계약을 충전하고 다음 달로
      await readBeat();
      const refilled = await page.evaluate(() => {
        const g = PT.game; let done = 0;
        g.contracts.forEach((c, si) => {
          if (!c || c.calls > 0) return;
          const b = document.querySelector('#mk-refill-' + si); if (b && !b.disabled) { b.click(); done++; }
        });
        return done;
      });
      if (refilled) { await page.waitForTimeout(300); await readBeat(); continue; }
      await page.click('.modal .foot .btn.primary'); await page.waitForTimeout(500); continue;
    }
    // 호출: 80% 이상 차거나 급한 게 있으면
    const act = await page.evaluate(() => {
      const g = PT.game; let best = -1, bf = 0;
      g.contracts.forEach((c, i) => {
        if (!c || !g.canCall(c)) return;
        const el = g.eligibleParcels(c); const v = el.reduce((s, p) => s + p.size, 0) / (g.vehicleCap(c) * Math.min(g.simulMax(c), c.calls));
        const urgent = el.some(p => p.deadline <= 1 || p.overdue || (p.attrs.includes('cold') && !p.inCold));
        const f = Math.min(1, v) + (urgent ? 1 : 0); if (f > bf) { bf = f; best = i; }
      });
      return bf >= 0.8 ? best : -1;
    });
    if (act >= 0) {
      await page.click('#c' + act, { force: true }); await page.waitForTimeout(250);
      await readBeat(); await passGate();
      for (const b of await page.$$('.modal .body .btn')) { if (/급한/.test(await b.textContent())) { await b.click(); await page.waitForTimeout(150); break; } }
      await readBeat();
      const trucks = await page.$eval('#modal .truckgauge .tg span', el => el.textContent).catch(() => '');
      if (/2대|2 trucks/.test(trucks) && !shots.two) { shots.two = 1; await page.screenshot({ path: 'shots/t-two-trucks.png' }); console.log('2대 동시 호출 화면:', trucks.trim()); }
      await passGate();
      const go = await page.$('.foot .btn.primary:not([disabled])');
      if (go) { await go.click(); await page.waitForTimeout(800); await readBeat(); continue; }
      const cancel = await page.$('.foot .btn'); if (cancel) await cancel.click();
      await page.waitForTimeout(150);
    }
    const w = await page.$('#wait-btn');
    if (w) { await w.click({ force: true }); await page.waitForTimeout(250); await readBeat(); await passGate();
      const go = await page.$('.foot .btn.primary:not([disabled])'); if (go) { await go.click(); await page.waitForTimeout(700); } }
    await readBeat();
  }
  const st = await page.evaluate(() => ({ m: PT.game.month, t: PT.game.turn, cash: PT.game.cash, rep: PT.game.rep, seen: PT.game.story.seen, ret: PT.game.stats.returned }));
  await page.screenshot({ path: 'shots/t-end.png' });
  console.log('\n끝:', st.m + '개월차 ' + st.t + '턴 · 자금 ' + st.cash + 'c · 평판 ' + st.rep + ' · 반송 ' + st.ret);
  console.log('본 비트:', st.seen.join(' '));
  for (const need of ['intro', 'callReady', 'trucks2', 'marketRefill', 'marketLimit']) console.log((st.seen.includes(need) ? '  ✔ ' : '  ✘ ') + need);
  console.log('에러:', errors.length ? errors.slice(0, 5) : '없음');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
