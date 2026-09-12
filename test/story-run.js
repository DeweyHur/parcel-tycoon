// 스토리 모드 장기 스모크: 한국어로 인수인계를 시작해 5개월차까지 UI로만 진행하며 비트·달력·문자를 확인한다
// node test/story-run.js (http://localhost:8765 필요)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message, (e.stack || '').split('\n')[1]); } });
  page.on('console', m => { if (m.type() === 'error' && !/audio|font|mp3|woff|404/i.test(m.text())) errors.push('CONSOLE ' + m.text()); if (/\[i18n\]/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(500);
  fs.mkdirSync('shots', { recursive: true });
  await page.click('#t-story'); await page.waitForTimeout(150);
  await page.screenshot({ path: 'shots/r00-start-ko.png' });
  await page.click('.foot .btn.primary'); await page.waitForTimeout(600);
  const seen = []; let shotN = 0;
  const settle = async () => { await page.waitForFunction(() => !PT.busy, null, { timeout: 15000 }); await page.waitForTimeout(120); };
  const readBeat = async () => { await settle(); while (!(await page.$eval('#story', el => el.hidden))) { const t = await page.$eval('#story-body', el => el.textContent.slice(0, 30)); seen.push(t); if (seen.length <= 40 && shotN < 40) { shotN++; await page.screenshot({ path: `shots/r-beat-${String(shotN).padStart(2, '0')}.png` }); } await page.click('#story-body', { force: true }); await page.waitForTimeout(100); } };
  // 강제 클릭 게이트가 열려 있으면 그 대상을 눌러 준다 (열린 모달은 자동 선택 → 확인)
  const passGate = async () => { let did = false; for (let k = 0; k < 10; k++) { if (await page.$eval('#story-gate', el => el.hidden)) break; did = true; const t = await page.$('.story-hl'); const box = await t.boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(300); await readBeat(); } if (!did) return false; if (await page.$('#modal-root.show')) { for (const b of await page.$$('.modal .body .btn')) { if (/급한|Auto/.test(await b.textContent())) { await b.click(); await page.waitForTimeout(100); break; } } const go = await page.$('.foot .btn.primary:not([disabled])'); if (go) { await go.click(); await page.waitForTimeout(1200); } else { const c = await page.$('.foot .btn'); if (c) await c.click(); } } await readBeat(); return true; };
  let guard = 0;
  while (guard++ < 400) {
    const st = await page.evaluate(() => ({ phase: PT.game.phase, m: PT.game.month, t: PT.game.turn, off: PT.game.isOffTurn(), sms: !document.querySelector('#sms').hidden }));
    if (st.phase === 'over' || st.phase === 'win') { console.log('run ended', st); break; }
    if (st.m >= 5 && st.t >= 2) break;
    await readBeat();
    if (st.sms) { await page.screenshot({ path: `shots/r-sms-m${st.m}.png` }); console.log('sms at', st.m, st.t); }
    if (st.phase === 'summary' || st.phase === 'market') {
      if (st.phase === 'market') await page.screenshot({ path: `shots/r-market-m${st.m}.png` });
      await page.click('.foot .btn.primary'); await page.waitForTimeout(500); continue;
    }
    if (await passGate()) continue;
    if (st.t === 1) await page.screenshot({ path: `shots/r-m${st.m}-t1.png` });
    if (st.off) await page.screenshot({ path: `shots/r-off-m${st.m}-t${st.t}.png` });
    // 호출: 가장 찬 계약 (부피 80% 이상) 또는 기한 임박 있으면, 아니면 대기
    const act = await page.evaluate(() => { const g = PT.game; let best = -1, bf = 0; g.contracts.forEach((c, i) => { if (!c || !g.canCall(c)) return; const v = g.eligibleParcels(c).reduce((s, p) => s + p.size, 0) / g.vehicleCap(c); const urgent = g.eligibleParcels(c).some(p => p.deadline <= 1 || p.overdue); const f = v + (urgent ? 1 : 0); if (f > bf) { bf = f; best = i; } }); return bf >= 0.8 ? best : -1; });
    if (act >= 0) {
      await page.click('#c' + act, { force: true }); await page.waitForTimeout(200);
      for (const b of await page.$$('.modal .body .btn')) { if (/급한|Auto/.test(await b.textContent())) { await b.click(); await page.waitForTimeout(100); break; } }
      const go = await page.$('.foot .btn.primary:not([disabled])');
      if (go) { await go.click(); await page.waitForTimeout(900); await readBeat(); continue; }
      await page.click('.foot .btn'); await page.waitForTimeout(100);
    }
    await page.click('#wait-btn', { force: true }); await page.waitForTimeout(200);
    const w = await page.$('.foot .btn.primary'); if (w) { await w.click(); await page.waitForTimeout(450); }
    await readBeat();
  }
  const fin = await page.evaluate(() => ({ m: PT.game.month, t: PT.game.turn, cash: PT.game.cash, seen: PT.game.story.seen, notes: PT.game.story.notes.length }));
  console.log('final', JSON.stringify(fin));
  console.log('beats:', seen.length, seen);
  // 창고장 노트
  await page.evaluate(() => document.querySelector('#modal-root').classList.remove('show'));
  await page.click('#help-btn'); await page.waitForTimeout(150); await page.click('.foot .btn'); await page.waitForTimeout(150); await page.screenshot({ path: 'shots/r-notes.png' });
  console.log('errors:', errors);
  await browser.close();
  if (errors.length) process.exit(1);
})();
