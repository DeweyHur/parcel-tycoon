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
  // 건너뛰면 장 시작 카드가 뜬다 — 그것도 지나야 플레이 화면이다
  const skip = async () => { await page.mouse.click(195, 400); await page.waitForTimeout(700); };
  const clean = () => page.evaluate(() => ({
    gone: !document.getElementById('intro'), cine: PT.scene.cine, basis: document.getElementById('scene').style.flexBasis,
    cls: document.getElementById('app').className, bodyCls: document.body.className,
    truck: +PT.scene.truck.position.x.toFixed(1), fov: PT.scene.camera.fov,
    story: document.getElementById('story').hidden,
    closed: !!PT.scene.closed, front: !!(PT.scene.parts.front && PT.scene.parts.front.visible),
  }));

  await page.goto('http://localhost:8765/index.html?nosplash=1');
  await page.waitForTimeout(700);
  // 컷신이 스스로 치웠는지 보려면 '컷신 전'을 알아야 한다 — 탑차 위치·화각·패널 접힘은 튜닝으로 바뀐다
  const base = await page.evaluate(() => ({ cls: document.getElementById('app').className,
    truck: +PT.scene.truck.position.x.toFixed(1), fov: PT.scene.camera.fov }));

  console.log('첫 시작');
  await page.click('#t-level'); await page.waitForTimeout(1400);
  const a = await playing();
  check(!!a, '오프닝이 나온다');
  check(!!a && a.cine === true && a.panel === 0, '창고 뷰만 보이고 패널은 감춰진다 — ' + JSON.stringify(a));
  check(!!a && a.closed && a.front, '오프닝 동안은 벽이 다 있는 완성 건물이다');
  await page.mouse.click(195, 400); await page.waitForTimeout(700);
  check(!(await page.$('#modal .chcard')), '컷씬 뒤에 장 카드 없이 곧바로 첫날이다');
  const c1 = await clean();
  check(c1.gone && !c1.cine && c1.cls === base.cls && !c1.bodyCls && c1.basis === '' && c1.truck === base.truck && c1.fov === base.fov, '건너뛰면 원상복구 — ' + JSON.stringify(c1));
  check(!c1.closed && !c1.front, '플레이 화면은 앞면이 벗겨진 단면이다');
  check(c1.story === false, '건너뛴 직후 박 반장이 말을 건다');

  // 몇 턴 굴려서 세이브를 만든다
  await page.evaluate(() => { const g = PT.game; g.story.off = true; for (let i = 0; i < 4; i++) { g.wait(); g.takeEvents(); } PT.saveGame(); PT.renderAll(); });
  await page.waitForTimeout(300);

  console.log('\n세피아 · 인물 카드 · 탑차 입장 (한 번 더 틀어서 추적)');
  await page.reload(); await page.waitForTimeout(700);
  // 세이브가 있으면 타이틀은 「이어하기」다 — 장을 골라 「새로 하기」로 바꾼 뒤 눌러야 컷씬이 다시 돈다
  const chip0 = await page.$('#modal .chpick .chip[data-ch="1"]'); if (chip0) { await chip0.click(); await page.waitForTimeout(350); }
  await page.click('#t-level'); await page.waitForTimeout(500);
  const t0 = Date.now(); const rows = [];
  while (Date.now() - t0 < 45000) {
    const st = await page.evaluate(() => {
      const ov = document.getElementById('intro'); if (!ov) return null;
      const l = document.getElementById('intro-line'), cd = document.getElementById('intro-card');
      return { line: l.textContent.slice(0, 16), html: l.innerHTML, a: +getComputedStyle(l.parentNode).opacity,
        recall: document.getElementById('app').classList.contains('recall'),
        card: +getComputedStyle(cd).opacity > 0.15 ? cd.querySelector('b').textContent : '',
        truck: +PT.scene.truck.position.x.toFixed(1) };
    });
    if (!st) break;
    rows.push(st);
    await page.waitForTimeout(200);
  }
  let mid = 0, prev = null;
  for (const r of rows) { if (prev && prev.line === r.line && r.a > 0.5 && prev.a > 0.5 && prev.recall !== r.recall) mid++; prev = r; }
  const secs = rows.length * 0.2;
  check(secs > 20 && secs < 34, '오프닝이 25초쯤 간다 (4컷 · 일곱 줄) — ' + secs.toFixed(0) + '초');
  // 타자: 같은 줄 안에서 글자가 늘어나는 '중간 상태' 프레임이 있어야 한다
  let partial = 0, caret = 0, pv = '';
  for (const r of rows) {
    const txt = (r.html || '').replace(/<i class="caret"><\/i>/, '');
    if (txt && pv && txt.startsWith(pv) && txt.length > pv.length) partial++;
    if (/caret/.test(r.html || '')) caret++;
    pv = txt;
  }
  check(partial > 20, '자막이 한 글자씩 쳐진다 (중간 상태 ' + partial + '프레임)');
  check(caret > 10, '치는 동안 커서가 붙는다 (' + caret + '프레임)');
  check(mid === 0, '대사 도중에 세피아가 바뀌지 않는다 (위반 ' + mid + '건)');
  check(rows.some(r => r.recall) && rows.some(r => !r.recall), '회상 구간과 오늘 구간이 둘 다 있다');
  const cards = [...new Set(rows.map(r => r.card).filter(Boolean))];
  check(cards.length === 1 && /한 사장/.test(cards[0]), '인물 카드는 한 사장 하나다 — ' + cards.join(' / '));
  const tr = rows.map(r => r.truck), tmin = Math.min(...tr);   // 마지막 한 프레임은 끝난 뒤 복귀값(12)이 잡힌다
  check(tr[0] > 20 && tmin < 9, '탑차가 화면 밖에서 들어와 도크 앞에 선다 — x' + tr[0] + ' → x' + tmin);
  await skip();

  console.log('\n이어하기');
  await page.reload(); await page.waitForTimeout(800);
  const btns = await page.$$eval('#modal .btn', els => els.map(e => e.id).filter(Boolean));
  check(btns.includes('t-continue'), '타이틀에 「이어하기」가 있다 — ' + btns.join(','));
  await page.click('#t-continue'); await page.waitForTimeout(1400);
  check(!(await playing()), '이어하기에는 오프닝이 안 나온다');

  console.log('\n다시 시작 (두 번째 서장)');
  await page.reload(); await page.waitForTimeout(800);
  // 세이브가 있으면 「이어하기」다. 장을 고르면 버튼이 「새로 하기」로 바뀌고, 확인 팝업 없이 그대로 시작한다
  const chip = await page.$('#modal .chpick .chip[data-ch="1"]');
  check(!!chip, '진행 중인 런이 있어도 장 고르기가 있다');
  if (chip) { await chip.click(); await page.waitForTimeout(350); }
  const cta = await page.$eval('#t-level', el => el.textContent).catch(() => '');
  check(/새로/.test(cta), '장을 고르면 버튼이 「새로 하기」가 된다 — ' + cta);
  await page.click('#t-level'); await page.waitForTimeout(1500);
  check(!(await page.$('#modal .foot .btn.warn')), '확인 팝업은 없다');
  const b = await playing();
  check(!!b, '두 번째 서장에도 오프닝이 다시 나온다');
  check(!!b && /\S/.test(b.line), '자막이 나온다 — "' + (b && b.line) + '"');
  await skip();
  const c2 = await clean();
  check(c2.gone && !c2.cine && c2.basis === '' && c2.truck === base.truck, '두 번째도 깨끗이 끝난다 — ' + JSON.stringify(c2));

  console.log('\n?nointro');
  await page.goto('http://localhost:8765/index.html?nointro=1&nosplash=1'); await page.waitForTimeout(700);
  const chip2 = await page.$('#modal .chpick .chip[data-ch="1"]'); if (chip2) { await chip2.click(); await page.waitForTimeout(350); }
  await page.click('#t-level'); await page.waitForTimeout(900);
  check(!(await playing()), '?nointro 면 바로 1턴');
  check(!(await page.$('#modal .chcard')), '컷씬을 꺼도 장 카드는 없다');

  console.log('\n에러:', errors.length ? errors.slice(0, 5) : '없음');
  await browser.close();
  console.log(fail.length ? `\n실패 ${fail.length}건: ${fail.join(' / ')}` : '\n전부 통과');
  process.exit(errors.length || fail.length ? 1 : 0);
})();
