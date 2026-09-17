// 레벨 1 전체를 UI 로만 플레이해 본다 (빨리 감기 없음). 화면·모델·비트를 매 사이클 확인한다.
// node test/play-ui.js   (npm run serve 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const fail = [], log = [];
const check = (ok, msg) => { const line = (ok ? '  ✔ ' : '  ✘ ') + msg; console.log(line); log.push(line); if (!ok) fail.push(msg); };
const say = m => { console.log(m); log.push(m); };

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message); } });
  page.on('console', m => { if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load/i.test(m.text())) errors.push('CONSOLE ' + m.text()); if (/\[i18n\]/.test(m.text())) errors.push(m.text()); });
  page.on('crash', () => errors.push('PAGE CRASH'));
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(700);
  fs.mkdirSync('shots', { recursive: true });
  const shot = n => page.screenshot({ path: `shots/P-${n}.png` });
  const scene = async n => { const b = await (await page.$('#scene')).boundingBox(); await page.screenshot({ path: `shots/P-${n}.png`, clip: b }); };

  say('■ 타이틀 (캠페인 전)');
  await shot('00-title');
  const btns = await page.$$eval('#modal .btn', els => els.map(e => e.id).filter(Boolean));
  check(btns.includes('t-level'), '「시작하기」만 있다 — ' + btns.join(','));
  check(!btns.includes('t-new') && !btns.includes('t-codex'), '자유 런·도감·기록은 없다');
  const sig0 = await page.evaluate(() => PT.scene.buildSig);
  check(sig0 === '16/0/0/0', '첫 화면 모델에 냉장·냉동이 없다 — ' + sig0);
  await scene('00s-title-scene');

  await page.click('#t-level'); await page.waitForTimeout(1500);

  say('\n■ 오프닝 씬');
  const intro0 = await page.evaluate(() => {
    const ov = document.getElementById('intro');
    return ov ? { bar: getComputedStyle(ov).getPropertyValue('--bar').trim(), line: (document.getElementById('intro-line') || {}).textContent, cine: PT.scene.cine,
      panel: getComputedStyle(document.getElementById('panel')).opacity, story: document.getElementById('story').hidden } : null;
  });
  check(!!intro0, '오프닝이 재생된다');
  check(!!intro0 && intro0.cine === true && intro0.story === true, '오프닝 동안 대화창이 안 뜬다 — ' + JSON.stringify(intro0));
  check(!!intro0 && +intro0.panel === 0, '오프닝 동안 게임 패널이 안 보인다');
  check(!!intro0 && /\S/.test(intro0.line || ''), '자막이 나온다 — "' + (intro0 && intro0.line) + '"');
  await shot('00b-intro');
  await page.mouse.click(195, 400);                       // 아무 데나 누르면 건너뛴다
  await page.waitForTimeout(700);
  const intro1 = await page.evaluate(() => ({
    gone: !document.getElementById('intro'), cine: PT.scene.cine, basis: document.getElementById('scene').style.flexBasis,
    cls: document.getElementById('app').className, bodyCls: document.body.className,
    truck: +PT.scene.truck.position.x.toFixed(1), fov: PT.scene.camera.fov,
  }));
  check(intro1.gone && !intro1.cine && !intro1.cls && !intro1.bodyCls && intro1.basis === '', '건너뛰면 화면이 제자리로 돌아온다 — ' + JSON.stringify(intro1));
  check(intro1.truck === 12 && intro1.fov === 38, '탑차·화각이 평소대로 — 탑차 x' + intro1.truck + ' · 화각 ' + intro1.fov);
  await page.waitForTimeout(400);

  const state = () => page.evaluate(() => { const g = PT.game; return g ? { phase: g.phase, m: g.month, t: g.turn, turns: g.turns(), cash: g.cash, used: g.usedVolume(), cap: g.warehouse.cap, ret: g.stats.returned, disc: g.stats.discarded, sig: PT.scene.buildSig, seen: g.story.seen.length } : { phase: 'none' }; });
  const storyOpen = () => page.$eval('#story', el => !el.hidden).catch(() => false);
  const gateOpen = () => page.$eval('#story-gate', el => !el.hidden).catch(() => false);
  const readBeat = async () => { let n = 0; while (await storyOpen() && n++ < 30) { await page.click('#story-body', { force: true }); await page.waitForTimeout(60); } };
  const passGate = async () => {
    for (let k = 0; k < 10; k++) {
      if (!(await gateOpen())) return k > 0;
      const t = await page.$('.story-hl'); if (!t) return false;
      const b = await t.boundingBox(); if (!b) return false;
      await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      await page.waitForTimeout(220); await readBeat();
    }
    return true;
  };

  const safeClick = async (target, tries = 4) => {
    for (let i = 0; i < tries; i++) {
      await readBeat();
      const el = typeof target === 'string' ? await page.$(target) : target;
      if (!el) return false;
      try { await el.click({ timeout: 4000 }); return true; } catch (e) { await page.waitForTimeout(200); }
    }
    return false;
  };
  await readBeat(); await passGate(); await readBeat();
  say('\n■ 1일차 화면');
  await shot('01-day1');
  await scene('01s-day1-scene');
  const vis = sel => page.$eval(sel, el => !el.hidden && el.offsetParent !== null).catch(() => false);
  check(!(await vis('#stress-wrap')), '평판 게이지 없음');
  check(!(await vis('#bar-cold')), '냉장 바 없음');
  check(!(await page.$('#upcoming .chip.wx')), '날씨 칩 없음');
  check(!(await vis('#cust-btn')) && !(await vis('#log-btn')), '고객·기록 버튼 없음');
  check(!(await vis('#c1')), '빈 계약 슬롯 없음');
  check(!(await page.$('#parcels .parcel .cust')), '택배 줄에 고객 아이콘 없음');
  const s0 = await state();
  check(s0.cap === 16, '창고 16칸 — ' + s0.cap);
  check(s0.sig === '16/0/0/0', '3D 건물이 16칸·냉장0 으로 지어졌다 — ' + s0.sig);
  const waitLabel = await page.$eval('#wait-btn', el => el.textContent.trim().split('\n')[0]);
  check(!/직접/.test(waitLabel), '대기 버튼에 직접 배송이 없다 — "' + waitLabel.slice(0, 20) + '"');

  say('\n■ 레벨 1 도움말 · 메뉴');
  await safeClick('#help-btn'); await page.waitForTimeout(350);
  await shot('02-help');
  const helpTxt = await page.$eval('#modal', el => el.textContent);
  const helpBad = ['평판', '냉장', '냉동', '마켓', '보험', '고객', '통관'].filter(w => helpTxt.includes(w));
  check(helpBad.length === 0, '도움말에 아직 안 연 것이 없다' + (helpBad.length ? ' — ' + helpBad.join(',') : ''));
  const helpBtns = await page.$$eval('#modal .foot .btn', els => els.map(e => e.textContent.trim()));
  check(!helpBtns.some(b => /게임 방법/.test(b)), '도움말에 「게임 방법」(런 길이·평판) 버튼이 없다 — ' + helpBtns.join(','));
  await safeClick('#modal .foot .btn:last-child'); await page.waitForTimeout(300);
  await safeClick('#menu-btn'); await page.waitForTimeout(350);
  await shot('03-menu');
  const menuTxt = await page.$eval('#modal', el => el.textContent);
  check(!/계절 문자|분기|평판/.test(menuTxt), '메뉴에 계절 문자·시나리오·평판이 없다 — ' + menuTxt.replace(/\s+/g, ' ').slice(0, 60));
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(300);

  say('\n■ 4사이클 플레이 (UI 로만)');
  let guard = 0, cyc = 0, calls = 0, waits = 0, stuck = 0, last = '';
  const t0 = Date.now();
  while (guard++ < 900) {
    const st = await state();
    if (st.phase === 'none' || st.phase === 'win' || st.phase === 'over') break;
    if (st.m !== cyc) { cyc = st.m; say(`  ${cyc}사이클 · 자금 ${st.cash}c · 창고 ${st.used}/${st.cap}`); if (cyc <= 4) await scene(`10-c${cyc}-scene`); }
    const key = `${st.phase}${st.m}-${st.t}`;
    if (key === last) { if (++stuck > 30) { await shot('99-stuck'); say('  !! 멈춤: ' + key); break; } } else { stuck = 0; last = key; }

    if (await storyOpen()) { await readBeat(); continue; }
    if (await gateOpen()) { await passGate(); continue; }

    if (st.phase === 'weekend') {
      if (!fs.existsSync('shots/P-20-weekend.png')) await shot('20-weekend');
      if (await safeClick('.wkopts .wkc:not([disabled])')) await page.waitForTimeout(400);
      continue;
    }
    if (st.phase === 'summary') {
      if (!fs.existsSync(`shots/P-30-sum${st.m}.png`)) await shot(`30-sum${st.m}`);
      if (await safeClick('#modal .foot .btn.primary')) await page.waitForTimeout(400);
      continue;
    }
    if (st.phase === 'market') { if (await safeClick('#modal .foot .btn.primary')) await page.waitForTimeout(400); continue; }

    // 호출할 만한가? (차가 80% 이상 차면)
    const act = await page.evaluate(() => {
      const g = PT.game; let best = -1, bf = 0;
      g.contracts.forEach((c, i) => {
        if (!c || !g.canCall(c)) return;
        const el = g.eligibleParcels(c);
        const v = Math.min(1, el.reduce((s, p) => s + p.size, 0) / g.vehicleCap(c));
        const urgent = el.some(p => p.deadline <= 1 || p.overdue);
        const f = v + (urgent ? 1 : 0); if (f > bf) { bf = f; best = i; }
      });
      return bf >= 0.8 ? best : -1;
    });
    if (act >= 0) {
      await safeClick('#c' + act); await page.waitForTimeout(200);
      await readBeat(); await passGate();
      if (calls === 0 && !fs.existsSync('shots/P-11-call.png')) await shot('11-call');
      for (const b of await page.$$('#modal .body .btn')) { if (/급한/.test(await b.textContent())) { await safeClick(b); await page.waitForTimeout(100); break; } }
      await readBeat(); await passGate();
      if (await safeClick('#modal .foot .btn.primary:not([disabled])')) { calls++; await page.waitForTimeout(500); await readBeat(); continue; }
      await safeClick('#modal .foot .btn');
      await page.waitForTimeout(100);
    }
    const w = await page.$('#wait-btn:not([disabled])');
    if (w) {
      await safeClick(w); await page.waitForTimeout(180);
      await readBeat(); await passGate();
      if (await safeClick('#modal .foot .btn.primary:not([disabled])')) { waits++; await page.waitForTimeout(420); }
    }
    await readBeat();
  }
  const end = await state();
  say(`  플레이 끝: ${Math.round((Date.now() - t0) / 1000)}초 · 호출 ${calls} · 대기 ${waits} · phase ${end.phase}`);
  check(end.ret === 0 && end.disc === 0, `반송·폐기 0 (반송 ${end.ret} 폐기 ${end.disc})`);

  say('\n■ 장 마무리: 리포트 → 편지 → 상호 → 계약서');
  await page.waitForTimeout(500); await shot('40-report');
  const rptTxt = await page.$eval('#modal', el => el.textContent).catch(() => '');
  check(/서장 리포트/.test(rptTxt) && /박 반장/.test(rptTxt), '박 반장 리포트가 뜬다 — ' + rptTxt.replace(/\s+/g, ' ').slice(0, 44));
  check(/처리/.test(rptTxt) && /정시/.test(rptTxt), '두 달치 숫자가 들어 있다');
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(350);
  await shot('41-letter');
  const letTxt = await page.$eval('#modal', el => el.textContent).catch(() => '');
  check(/한 사장님 편지/.test(letTxt) && /한종수/.test(letTxt), '영감님 편지가 뜬다 — ' + letTxt.replace(/\s+/g, ' ').slice(0, 44));
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(350);
  await shot('42-name');
  const input = await page.$('#lv-name');
  check(!!input, '상호 입력칸');
  if (input) await input.fill('두번째창고');
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(400);
  await shot('43-contract');
  const ctTxt = await page.$eval('#modal', el => el.textContent).catch(() => '');
  check(/매도인/.test(ctTxt) && /두번째창고/.test(ctTxt), '계약서에 매도인·내 상호가 적힌다');
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(600);
  const stamped = await page.$eval('#ct-stamp', el => el.classList.contains('on')).catch(() => false);
  check(stamped, '도장이 찍힌다');
  await shot('44-stamped');
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(500);
  await shot('45-title2');
  const after = await page.$$eval('#modal .btn', els => els.map(e => e.id).filter(Boolean));
  check(after.includes('t-new') && after.includes('t-story') && after.includes('t-codex'), '자유 런·인수인계·도감이 열렸다 — ' + after.join(','));

  say('\n■ 자유 런(인수인계)에서는 냉장실이 다시 붙는가');
  await safeClick('#t-story'); await page.waitForTimeout(400);
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(700);
  for (let k = 0; k < 4; k++) { const how = await page.$('#modal-root.show .how'); if (!how) break; await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(300); }
  await page.waitForTimeout(700); await readBeat(); await passGate(); await readBeat();
  const st2 = await page.evaluate(() => ({ sig: PT.scene.buildSig, cap: PT.game.warehouse.cap, cold: PT.game.warehouse.cold, rep: !document.getElementById('stress-wrap').hidden, wx: !!document.querySelector('#upcoming .chip.wx') }));
  check(st2.sig === '24/6/4/0', '3D 건물이 24칸·냉장6·냉동4 로 다시 지어졌다 — ' + st2.sig);
  check(st2.rep && st2.wx, '자유 런에는 평판·날씨가 다시 보인다');
  await scene('50-freerun-scene');
  await shot('51-freerun');

  say('\n에러: ' + (errors.length ? errors.slice(0, 5).join(' | ') : '없음'));
  await browser.close();
  say(fail.length ? `\n실패 ${fail.length}건: ${fail.join(' / ')}` : '\n전부 통과');
  fs.writeFileSync('shots/play-ui.log', log.join('\n'));
  process.exit(errors.length || fail.length ? 1 : 0);
})();
