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

  say('■ 스튜디오 스플래시 (1장)');
  const sp = await page.evaluate(() => {
    const el = document.getElementById('splash');
    return el ? { quick: el.classList.contains('quick'), marks: el.querySelectorAll('svg').length, rects: el.querySelectorAll('rect').length,
      title: !!document.querySelector('.title h1') } : null;
  });
  check(!!sp, '스플래시가 뜬다');
  check(!!sp && sp.marks === 3 && sp.rects > 300, '아치·워드마크가 도트로 그려진다 — svg ' + (sp && sp.marks) + ' · rect ' + (sp && sp.rects));
  check(!!sp && !sp.quick, '첫 실행은 긴 버전이다');
  await shot('00a-splash');
  await page.mouse.click(195, 400);                       // 아무 데나 누르면 2장으로
  await page.waitForTimeout(600);
  check(!(await page.$('#splash')), '누르면 바로 타이틀로 넘어간다');

  say('\n■ 타이틀 (캠페인 전)');
  const brand = await page.evaluate(() => ({
    h1: (document.querySelector('.title h1') || {}).textContent || '',
    sub: (document.querySelector('.title .sub') || {}).textContent || '',
    studio: (document.querySelector('.title .studio') || {}).textContent || '',
    goal: !!document.querySelector('.title .goal'),
    head: !!document.querySelector('#modal h2'),
    doc: document.title,
    px: getComputedStyle(document.querySelector('.title h1')).fontSize,
  }));
  check(brand.h1 === '상하차의 신' && brand.sub === '택배 창고 타이쿤', '제목 · 부제 — ' + brand.h1 + ' / ' + brand.sub);
  check(/DOO'IN STUDIO/.test(brand.studio), '하단에 스튜디오 — ' + brand.studio);
  check(!brand.goal && !brand.head, '목표 문장과 모달 머리띠가 없다');
  check(brand.doc === '상하차의 신: 택배 창고 타이쿤', '탭 제목 — ' + brand.doc);
  check(brand.px === '44px' || brand.px === '55px', '제목이 Galmuri 정수배 — ' + brand.px);
  await shot('00-title');
  const btns = await page.$$eval('#modal .btn', els => els.map(e => e.id).filter(Boolean));
  check(btns.includes('t-level'), '「시작하기」만 있다 — ' + btns.join(','));
  check(!btns.includes('t-new') && !btns.includes('t-codex'), '자유 런·도감·기록은 없다');
  const sig0 = await page.evaluate(() => PT.scene.buildSig);
  check(sig0 === '16/0/0/0', '첫 화면 모델에 냉장·냉동이 없다 — ' + sig0);
  await scene('00s-title-scene');

  // 컷신이 스스로 치운 자리인지 보려면 '컷신 전'을 알아야 한다 — 탑차 위치·화각·패널 접힘은 튜닝으로 바뀐다
  const scene0 = await page.evaluate(() => ({ cls: document.getElementById('app').className,
    truck: +PT.scene.truck.position.x.toFixed(1), fov: PT.scene.camera.fov }));
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
  check(intro1.gone && !intro1.cine && !/cine|recall/.test(intro1.cls) && intro1.cls === scene0.cls && !intro1.bodyCls && intro1.basis === '',
    '건너뛰면 화면이 제자리로 돌아온다 — ' + JSON.stringify(intro1));
  check(intro1.truck === scene0.truck && intro1.fov === scene0.fov,
    '탑차·화각이 컷신 전으로 돌아온다 — 탑차 x' + intro1.truck + ' · 화각 ' + intro1.fov);
  await page.waitForTimeout(400);

  say('\n■ 프롤로그 뒤에 장 카드가 없다');
  check(!(await page.$('#modal .chcard')), '장 카드(블랙스크린)가 없다 — 컷씬이 끝나면 곧바로 첫날이다');
  await shot('00c-day1');

  const state = () => page.evaluate(() => { const g = PT.game; return g ? { phase: g.phase, m: g.month, t: g.turn, turns: g.turns(), cash: g.cash, used: g.usedVolume(), cap: g.warehouse.cap, ret: g.stats.returned, disc: g.stats.discarded, sig: PT.scene.buildSig, seen: g.story.seen.length } : { phase: 'none' }; });
  const storyOpen = () => page.$eval('#story', el => !el.hidden).catch(() => false);
  const gateOpen = () => page.$eval('#story-gate', el => !el.hidden).catch(() => false);
  const readBeat = async () => { let n = 0; while (await storyOpen() && n++ < 30) { await page.click('#story-body', { force: true }); await page.waitForTimeout(60); } };
  const passGate = async () => {
    for (let k = 0; k < 10; k++) {
      if (!(await gateOpen())) return k > 0;
      const t = await page.$('.story-hl'); if (!t) return false;
      const b = await t.boundingBox(); if (!b) return false;
      // 대상이 화면 밖으로 잘려 있으면 중심이 뷰포트 밖이라 클릭이 안 먹는다 — 보이는 자리로 당겨서 누른다
      const vp = page.viewportSize();
      await page.mouse.click(Math.min(b.x + b.width / 2, vp.width - 4), Math.min(b.y + b.height / 2, vp.height - 6));
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
  check(!(await vis('#mission-meter')), '보름 목표 미터 없음');
  check(!(await vis('#chain-meter')), '연속 만차 미터 없음');
  check(!(await vis('#rush-meter')), '일괄 출고 미터 없음');
  check(!(await vis('#invest-btn')), '투자 버튼 없음 (2장에서 열린다)');
  check(!(await vis('#ops-status')), '운영 상태 패널 없음 (보름 목표와 같이 열린다)');
  check(!(await vis('#bar-cold')), '냉장 바 없음');
  check(!(await page.$('#upcoming .chip.wx')), '날씨 칩 없음');
  check(!(await vis('#cust-btn')) && !(await vis('#log-btn')), '고객·기록 버튼 없음');
  // 첫 사이클은 무기한 — ⏳ 가 아예 안 붙는다
  const dl = await page.evaluate(() => ({ nodl: PT.game.parcels.every(p => p.noDeadline),
    hourglass: /⏳/.test(document.getElementById('parcels').textContent),
    txt: ((document.querySelector('#parcels .st') || {}).textContent || '').replace(/[▾▴]/g, '') }));
  check(dl.nodl && !dl.hourglass && !dl.txt.trim(), '첫 사이클 택배는 기한 칸이 아예 비어 있다 — "' + dl.txt.trim() + '"');
  check(!(await page.evaluate(() => PT.game.shows('trust'))) && (await page.$$('.trust')).length === 0, '신뢰도가 화면에 없다');
  // 택배 상세도 같은 기준으로 비어 있어야 한다
  // 창고 상세(재고)는 기본으로 접혀 있다 — 먼저 펼친다. 같은 택배는 묶음 줄이라 그것도 펼친다
  check(!(await page.$('#warehouse-toggle')) && await vis('#parcels'), '재고 접기가 없다 — 상자 격자는 늘 보인다');
  await page.waitForTimeout(300);
  await safeClick('#parcels .ptile[data-id]'); await page.waitForTimeout(400);
  const pd = await page.evaluate(() => ({ txt: (document.getElementById('modal') || {}).textContent || '',
    trust: document.querySelectorAll('#modal .trust').length, cust: document.querySelectorAll('#modal .cust').length }));
  check(/보낼 수 있는 곳/.test(pd.txt), '택배 상세가 열렸다');
  check(pd.trust === 0 && pd.cust === 0 && !/신뢰|고객|직접 배송/.test(pd.txt), '택배 상세에 신뢰·고객·직접 배송이 없다 — ' + pd.txt.replace(/\s+/g, ' ').slice(0, 60));
  await safeClick('#modal .foot .btn'); await page.waitForTimeout(250);
  // 첫날 대사: 여 실장이 실제 숫자로 계산해 준다 (시키는 대로 누르라는 말 대신)
  const firstSeen = await page.evaluate(() => PT.game.story.seen.slice());
  check(firstSeen.includes('l1intro'), '첫날 대사가 끝났다 — ' + firstSeen.join(','));
  check(!firstSeen.includes('l1waitGo'), '대기 팝업 안내 비트가 없다 (팝업 자체가 없다)');
  check(!(await vis('#c1')), '빈 계약 슬롯 없음');
  check(!(await page.$('#parcels .ptile i span')), '서장 상자에는 아이콘이 없다 (속성·고객이 아직 없다)');
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
    await readBeat(); await passGate();   // 게이트('여기를 눌러')가 떠 있으면 다른 버튼은 안 눌린다
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
      // 호출은 팝업이 아니다 — 패널이 고르는 판이 되고, 창고 상자가 이미 골라져 있다
      if (calls === 0) {
        const cm = await page.evaluate(() => ({ calling: document.getElementById('app').classList.contains('calling'), modal: !!document.querySelector('#modal-root.show'),
          tiles: document.querySelectorAll('#parcels .ptile').length, sel: document.querySelectorAll('#parcels .ptile.sel').length, head: !!document.querySelector('#call-head .load-visual') }));
        check(cm.calling && !cm.modal && cm.head, '차를 부르면 팝업 없이 패널이 호출 판이 된다');
        check(cm.tiles > 0 && cm.sel > 0, `창고 상자가 이미 골라져 있다 — ${cm.sel}/${cm.tiles}`);
        const t = await page.$('#parcels .ptile.sel');
        if (t) { await safeClick(t); await page.waitForTimeout(120); const after = await page.$$eval('#parcels .ptile.sel', els => els.length); check(after === cm.sel - 1, `상자를 누르면 빠진다 — ${cm.sel} → ${after}`); await safeClick('#pick-urgent'); await page.waitForTimeout(120); }
      }
      await readBeat(); await passGate();
      if (await safeClick('#call-foot .btn.primary:not([disabled])')) { calls++; await page.waitForTimeout(500); await readBeat(); continue; }
      await safeClick('#call-cancel');
      await page.waitForTimeout(100);
    }
    const w = await page.$('#wait-btn:not([disabled])');
    if (w) {
      const before = (await state()).t;
      await safeClick(w); await page.waitForTimeout(400);
      await readBeat(); await passGate();
      // 서장에는 대기 팝업이 없다 — 눌렀으면 그대로 하루가 넘어간다. (자체 배송이 열리면 팝업이 다시 생긴다)
      if (await safeClick('#modal .foot .btn.primary:not([disabled])')) await page.waitForTimeout(420);
      if ((await state()).t !== before) waits++;
    }
    await readBeat();
  }
  const end = await state();
  say(`  플레이 끝: ${Math.round((Date.now() - t0) / 1000)}초 · 호출 ${calls} · 대기 ${waits} · phase ${end.phase}`);
  check(end.ret === 0 && end.disc === 0, `반송·폐기 0 (반송 ${end.ret} 폐기 ${end.disc})`);
  check(waits >= 3, `대기가 팝업 없이 바로 넘어간다 (${waits}일)`);
  const seenAll = await page.evaluate(() => (PT.game && PT.game.story ? PT.game.story.seen.slice() : []));
  check(!firstSeen.includes('l1due'), '서장은 통째로 무기한이라 기한 안내가 없다 — ' + firstSeen.join(',') );

  say('\n■ 장 마무리: 편지 한 장뿐 (서류는 1장 끝에)');
  await page.waitForTimeout(500);
  const rptTxt = await page.$eval('#modal', el => el.textContent).catch(() => '');
  check(!/리포트/.test(rptTxt) && !/정시/.test(rptTxt), '숫자 리포트는 없다 — ' + rptTxt.replace(/\s+/g, ' ').slice(0, 44));
  await shot('41-letter');
  const letTxt = await page.$eval('#modal', el => el.textContent).catch(() => '');
  check(/한 사장 편지/.test(letTxt) && /이번 달만 더/.test(letTxt),
    '한 사장이 "이번 달만 더 맡아 주게" 라고 한다 — ' + letTxt.replace(/\s+/g, ' ').slice(0, 60));
  await safeClick('#modal .foot .btn.primary'); await page.waitForTimeout(1400);   // 편지를 접으면 바로 1장
  check(!(await page.$('#modal .chcard')), '장 끝 카드가 없다');
  check(!(await page.$('#lv-name')), '보름 대타 뒤에는 상호를 묻지 않는다');
  const noDeal = await page.evaluate(() => (PT.Profile.get().campaign || {}).deal || null);
  check(!noDeal, '서장 끝에는 가계약이 없다 — ' + JSON.stringify(noDeal));
  await shot('42-ch2');

  say('\n■ 서장 다음은 타이틀이 아니라 1장');
  await page.waitForTimeout(700); await readBeat();
  const l2 = await page.evaluate(() => { const g = PT.game, P = PT.Profile.get().campaign;
    return { level: g.cfg.level, cash: g.cash, carryCash: P.carry && P.carry.cash, cap: g.warehouse.cap,
      contracts: g.contracts.filter(Boolean).map(c => c.carrier), calls: !!document.querySelector('.contract .calls, #c0 .calls'),
      shows: ['market', 'calls', 'simul', 'attrs', 'cold', 'weather'].filter(k => g.shows(k)),
      types: [...new Set(g.schedule.flat().map(x => x.type))] }; });
  check(l2.level === 2 && l2.cash > 0 && l2.contracts.join() === 'bulk0' && l2.cap === 16,
    '서장 판이 그대로 넘어왔다 — ' + JSON.stringify(l2).slice(0, 120));
  check(l2.shows.join() === 'market,calls,simul', '1장에 열린 것은 마켓·배차·동시뿐 — ' + l2.shows.join(','));
  check(l2.types.join() === 'normal', '1장 입고는 아직 일반뿐 — ' + l2.types.join(','));
  await shot('46-ch2-play');

  say('\n■ 자유 런(인수인계)에서는 냉장실이 다시 붙는가');
  // 1장까지 끝낸 프로필을 만들어 타이틀을 연다 (해금 이후 회귀 확인)
  await page.evaluate(() => { const P = PT.Profile.get(); P.campaign.cleared = 99; PT.Profile.save(); });
  await page.reload(); await page.waitForTimeout(900);
  const after = await page.$$eval('#modal .btn', els => els.map(e => e.id).filter(Boolean));
  check(after.includes('t-new') && after.includes('t-story') && after.includes('t-codex'), '자유 런·인수인계·도감이 열렸다 — ' + after.join(','));
  // 1장 세이브가 남아 있으니 「새로 시작」 확인이 먼저 뜬다 — 넘기고 인수인계로 들어간다
  await safeClick('#t-story'); await page.waitForTimeout(500);
  for (let k = 0; k < 8; k++) {
    if (await page.evaluate(() => !!(window.PT && PT.game && PT.game.phase === 'play' && !document.getElementById('modal-root').classList.contains('show')))) break;
    const warn = await page.$('#modal .foot .btn.warn');
    if (warn) { await warn.click(); await page.waitForTimeout(600); continue; }
    const pri = await page.$('#modal .foot .btn.primary');
    if (pri) { await pri.click(); await page.waitForTimeout(500); continue; }
    break;
  }
  await page.waitForTimeout(800); await readBeat(); await passGate(); await readBeat();
  const ok2 = await page.evaluate(() => !!(window.PT && PT.game));
  check(ok2, '인수인계(자유 런)가 시작됐다');
  if (!ok2) { console.log('\n에러:', errors.length ? errors.slice(0, 5) : '없음'); await browser.close(); process.exit(1); }
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
