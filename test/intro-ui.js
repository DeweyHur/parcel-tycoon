// 오프닝 씬: 서장을 시작할 때마다 나오는가 / 이어하기엔 안 나오는가 / 건너뛰면 깨끗이 원상복구되는가
// node test/intro-ui.js   (npm run serve 필요)
const { chromium } = require('playwright');
const fail = [];
const check = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) fail.push(msg); };

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message); } });
  page.on('console', m => { if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load/i.test(m.text())) errors.push('CONSOLE ' + m.text()); if (/\[i18n\]/.test(m.text())) errors.push(m.text()); });

  const playing = () => page.evaluate(() => {
    const ov = document.getElementById('intro');
    return ov ? { line: (document.getElementById('intro-line') || {}).textContent || '', cine: PT.scene.cine, panel: +getComputedStyle(document.getElementById('panel')).opacity,
      closed: !!PT.scene.closed, front: !!(PT.scene.parts.front && PT.scene.parts.front.visible) } : null;
  });
  const skip = async () => { await page.mouse.click(195, 400); await page.waitForTimeout(700); };
  const clean = () => page.evaluate(() => ({
    gone: !document.getElementById('intro'), cine: PT.scene.cine, basis: document.getElementById('scene').style.flexBasis,
    cls: document.getElementById('app').className, bodyCls: document.body.className,
    truck: +PT.scene.truck.position.x.toFixed(1), fov: PT.scene.camera.fov,
    story: document.getElementById('story').hidden,
    closed: !!PT.scene.closed, front: !!(PT.scene.parts.front && PT.scene.parts.front.visible),
  }));

  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(700);

  console.log('첫 시작');
  await page.click('#t-level'); await page.waitForTimeout(1400);
  const a = await playing();
  check(!!a, '오프닝이 나온다');
  check(!!a && a.cine === true && a.panel === 0, '창고 뷰만 보이고 패널은 감춰진다 — ' + JSON.stringify(a));
  check(!!a && a.closed && a.front, '오프닝 동안은 벽이 다 있는 완성 건물이다');
  await skip();
  const c1 = await clean();
  check(c1.gone && !c1.cine && !c1.cls && !c1.bodyCls && c1.basis === '' && c1.truck === 12 && c1.fov === 38, '건너뛰면 원상복구 — ' + JSON.stringify(c1));
  check(!c1.closed && !c1.front, '플레이 화면은 앞면이 벗겨진 단면이다');
  check(c1.story === false, '건너뛴 직후 박 반장이 말을 건다');

  // 몇 턴 굴려서 세이브를 만든다
  await page.evaluate(() => { const g = PT.game; g.story.off = true; for (let i = 0; i < 4; i++) { g.wait(); g.takeEvents(); } PT.saveGame(); PT.renderAll(); });
  await page.waitForTimeout(300);

  console.log('\n이어하기');
  await page.reload(); await page.waitForTimeout(800);
  const btns = await page.$$eval('#modal .btn', els => els.map(e => e.id).filter(Boolean));
  check(btns.includes('t-continue'), '타이틀에 「이어하기」가 있다 — ' + btns.join(','));
  await page.click('#t-continue'); await page.waitForTimeout(1400);
  check(!(await playing()), '이어하기에는 오프닝이 안 나온다');

  console.log('\n다시 시작 (두 번째 서장)');
  await page.reload(); await page.waitForTimeout(800);
  await page.click('#t-level'); await page.waitForTimeout(400);     // 세이브가 있으니 확인 팝업 (예 = .btn.warn)
  const yes = await page.$('#modal .foot .btn.warn');
  check(!!yes, '「새로 시작」 확인 팝업이 뜬다');
  if (yes) { await yes.click(); await page.waitForTimeout(1500); }
  const b = await playing();
  check(!!b, '두 번째 서장에도 오프닝이 다시 나온다');
  check(!!b && /\S/.test(b.line), '자막이 나온다 — "' + (b && b.line) + '"');
  await skip();
  const c2 = await clean();
  check(c2.gone && !c2.cine && c2.basis === '' && c2.truck === 12, '두 번째도 깨끗이 끝난다 — ' + JSON.stringify(c2));

  console.log('\n?nointro');
  await page.goto('http://localhost:8765/index.html?nointro=1'); await page.waitForTimeout(700);
  const go = await page.$('#t-level'); await go.click(); await page.waitForTimeout(400);
  const cf = await page.$('#modal .foot .btn.warn'); if (cf) { await cf.click(); await page.waitForTimeout(900); }
  check(!(await playing()), '?nointro 면 바로 1턴');

  console.log('\n에러:', errors.length ? errors.slice(0, 5) : '없음');
  await browser.close();
  console.log(fail.length ? `\n실패 ${fail.length}건: ${fail.join(' / ')}` : '\n전부 통과');
  process.exit(errors.length || fail.length ? 1 : 0);
})();
