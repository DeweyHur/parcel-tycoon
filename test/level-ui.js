// 레벨 1 UI 스모크: 타이틀(최소 메뉴) → 레벨 1 → 4사이클 완주 → 상호 이름 → 타이틀(전체 메뉴)
// 화면에 "아직 안 연 것"이 실제로 없는지도 같이 검사한다.
// node test/level-ui.js   (http://localhost:8765 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const fail = [];
const check = (ok, msg) => { console.log((ok ? '  ✔ ' : '  ✘ ') + msg); if (!ok) fail.push(msg); };

(async () => {
  const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) { errors.push('PAGEERROR ' + e.message); console.log('PAGEERROR', e.message, (e.stack || '').split('\n')[1]); } });
  page.on('console', m => { if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load/i.test(m.text())) errors.push('CONSOLE ' + m.text()); if (/\[i18n\]/.test(m.text())) errors.push(m.text()); });
  await page.goto('http://localhost:8765/index.html?nointro=1&nosplash=1');
  await page.waitForTimeout(700);
  fs.mkdirSync('shots', { recursive: true });
  await page.screenshot({ path: 'shots/L00-title.png' });

  console.log('타이틀(캠페인)');
  const titleBtns = await page.$$eval('#modal .btn', els => els.map(e => e.id || e.textContent.trim().slice(0, 12)));
  check(titleBtns.includes('t-level'), '「시작하기」 버튼이 있다');
  const br = await page.evaluate(() => ({ h1: (document.querySelector('.title h1') || {}).textContent, studio: !!document.querySelector('.title .studio'), goal: !!document.querySelector('.title .goal') }));
  check(br.h1 === '상하차의 신' && br.studio && !br.goal, '제목·스튜디오가 붙고 목표 문장은 없다 — ' + br.h1);
  check(!titleBtns.includes('t-new') && !titleBtns.includes('t-story'), '자유 런·인수인계는 아직 없다');
  check(!titleBtns.includes('t-codex') && !titleBtns.includes('t-rec'), '도감·기록은 아직 없다');

  await page.click('#t-level'); await page.waitForTimeout(800);
  // 컷씬 뒤(여기선 ?nointro) 장 시작 카드가 한 번 뜬다
  const startCard = await page.$eval('#modal .chcard.start', el => el.textContent).catch(() => '');
  check(/서장/.test(startCard) && /빈 창고/.test(startCard), '장 시작 카드가 뜬다 — ' + startCard.replace(/\s+/g, ' ').trim());
  await page.click('#modal .chcard'); await page.waitForTimeout(500);
  const settle = async () => { await page.waitForFunction(() => !window.PT || !PT.busy, null, { timeout: 15000 }); await page.waitForTimeout(100); };
  const readBeat = async () => {
    await settle();
    let n = 0;
    while (!(await page.$eval('#story', el => el.hidden)) && n++ < 40) { await page.click('#story-body', { force: true }); await page.waitForTimeout(80); }
  };
  const passGate = async () => {
    let did = false;
    for (let k = 0; k < 12; k++) {
      if (await page.$eval('#story-gate', el => el.hidden)) break;
      did = true;
      const t = await page.$('.story-hl'); if (!t) break;
      const box = await t.boundingBox(); if (!box) break;
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(280); await readBeat();
    }
    return did;
  };
  await readBeat(); await passGate();
  await page.screenshot({ path: 'shots/L01-day1.png' });

  console.log('\n첫 화면에 없는 것들');
  const vis = sel => page.$eval(sel, el => !el.hidden && el.offsetParent !== null).catch(() => false);
  check(!(await vis('#stress-wrap')), '평판 게이지가 없다');
  check(!(await vis('#bar-cold')), '냉장 바가 없다');
  check(!(await page.$('#upcoming .chip.wx')), '날씨 칩이 없다');
  check(!(await vis('#cust-btn')), '고객 버튼이 없다');
  check(!(await vis('#c1')) && !(await vis('#c2')), '빈 계약 슬롯이 없다');
  const calls = await page.$eval('#c0 .calls', el => el.textContent.trim()).catch(() => '');
  check(calls === '', '계약 카드에 배차 잔량이 없다 (지금: "' + calls + '")');
  const custIcon = await page.$('#parcels .parcel .cust');
  check(!custIcon, '택배 줄에 고객 아이콘이 없다');

  console.log('\n4사이클 진행 (마지막 날 직전까지는 게임 API로 빨리 감기)');
  const ff = await page.evaluate(() => {
    const g = PT.game; let guard = 0;
    const pick = () => { let best = null; g.contracts.forEach((c, i) => { if (!c || !g.canCall(c)) return; const el = g.eligibleParcels(c).slice().sort((a, b) => a.deadline - b.deadline || b.size - a.size); const r = g.autoPick(c, el, 1); if (!r.ids.length) return; const fill = r.vol / g.vehicleCap(c); const urgent = r.ids.some(id => { const p = g.parcels.find(x => x.id === id); return p.deadline <= 1 || p.overdue; }); if (!urgent && fill < 0.8) return; if (!best || fill > best.fill) best = { i, ids: r.ids, fill, trucks: r.trucks }; }); return best; };
    while (guard++ < 500) {
      if (g.phase === 'weekend') { g.weekendChoose('rest'); g.takeEvents(); continue; }
      if (g.phase === 'summary') { g.closeSummary(); g.takeEvents(); continue; }
      if (g.phase === 'market') { g.closeMarket(); g.takeEvents(); continue; }
      if (g.phase !== 'play') break;
      if (g.month >= g.rules.months && g.turn >= g.turns()) break;   // 마지막 날은 UI 로 마무리
      const b = pick();
      if (b) g.callCarrier(b.i, b.ids, b.trucks); else g.wait();
      g.takeEvents();
    }
    PT.renderAll();
    return { phase: g.phase, m: g.month, t: g.turn, cash: g.cash, ret: g.stats.returned, disc: g.stats.discarded, delivered: g.run.delivered };
  });
  console.log('  빨리 감기 결과:', JSON.stringify(ff));
  check(ff.ret === 0 && ff.disc === 0, '레벨 1 동안 반송·폐기가 없다');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shots/L02a-lastday.png' });
  // 마지막 날을 UI 로 마무리 → 정산 → 레벨 완료
  for (let k = 0; k < 8; k++) {
    const st = await page.evaluate(() => ({ phase: PT.game ? PT.game.phase : 'none' }));
    if (st.phase === 'win' || st.phase === 'over' || st.phase === 'none') break;
    await readBeat(); await passGate();
    const w = await page.$('#wait-btn:not([disabled])');
    if (w) { await w.click({ force: true }); await page.waitForTimeout(250); await readBeat(); await passGate(); }
    const go = await page.$('#modal .foot .btn.primary:not([disabled])');
    if (go) { await go.click(); await page.waitForTimeout(500); }
    await readBeat();
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/L02-done.png' });
  const doneTxt = await page.$eval('#modal', el => el.textContent).catch(() => '');
  check(/서장 리포트/.test(doneTxt), '박 반장 리포트가 떴다');

  await page.click('#modal .foot .btn.primary'); await page.waitForTimeout(400);   // 편지
  await page.click('#modal .foot .btn.primary'); await page.waitForTimeout(400);   // 장 끝 카드
  const endCard = await page.$eval('#modal .chcard.end', el => el.textContent).catch(() => '');
  check(/서장/.test(endCard) && /1장/.test(endCard), '장 끝 카드에 다음 장 예고가 있다 — ' + endCard.replace(/\s+/g, ' ').trim());
  await page.click('#modal .chcard'); await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/L03-name.png' });
  const hasInput = await page.$('#lv-name');
  check(!!hasInput, '상호 이름을 묻는다');
  if (hasInput) { await hasInput.fill('한길택배'); await page.waitForTimeout(100); }
  await page.click('#modal .foot .btn.primary'); await page.waitForTimeout(400);   // 계약서
  await page.screenshot({ path: 'shots/L04-contract.png' });
  await page.click('#modal .foot .btn.primary'); await page.waitForTimeout(500);   // 도장
  const deal = await page.evaluate(() => Profile.get().campaign.deal);
  await page.click('#modal .foot .btn.primary'); await page.waitForTimeout(1200);  // 창고를 넘겨받는다 → 바로 1장
  await page.screenshot({ path: 'shots/L05-ch2.png' });

  console.log('\n서장 다음은 타이틀이 아니라 1장');
  const ch2 = await page.$eval('#modal .chcard.start', el => el.textContent).catch(() => '');
  check(/1장/.test(ch2) && /두 번째 트럭/.test(ch2), '타이틀을 거치지 않고 1장 카드가 뜬다 — ' + ch2.replace(/\s+/g, ' ').trim());
  await page.click('#modal .chcard'); await page.waitForTimeout(900);
  const carried = await page.evaluate(() => { const g = PT.game, P = Profile.get().campaign;
    return { level: g.cfg.level, cash: g.cash, cap: g.warehouse.cap, carryCash: P.carry && P.carry.cash,
      contracts: g.contracts.filter(Boolean).map(c => c.carrier), name: g.companyName ? g.companyName() : '',
      seen: g.story.seen.length, market: g.shows('market'), calls: g.shows('calls'), attrs: g.shows('attrs') }; });
  check(carried.level === 2 && carried.market && carried.calls && !carried.attrs, '1장에서 마켓·배차가 열리고 특수 품목은 아직 — ' + JSON.stringify(carried));
  check(!!deal && deal.paid > 0 && carried.cash === carried.carryCash, '계약금이 빠진 돈으로 1장을 시작한다 — 계약금 ' + (deal && deal.paid) + 'c · 시작 자금 ' + carried.cash + 'c');
  check(carried.contracts.join() === 'bulk0' && carried.cap === 16, '계약·창고가 그대로 넘어왔다 — ' + carried.contracts.join() + ' · ' + carried.cap + '칸');
  check(carried.seen > 0, '서장에서 들은 대사는 다시 안 한다 (본 비트 ' + carried.seen + '개)');
  await page.screenshot({ path: 'shots/L06-ch2-play.png' });
  const camp = await page.evaluate(() => Profile.get().campaign);
  check(camp && camp.name === '한길택배' && camp.cleared >= 1, '프로필에 상호·클리어가 남았다 — ' + JSON.stringify(camp));

  console.log('\n에러:', errors.length ? errors.slice(0, 5) : '없음');
  await browser.close();
  console.log(fail.length ? `\n실패 ${fail.length}건: ${fail.join(' / ')}` : '\n전부 통과');
  process.exit(errors.length || fail.length ? 1 : 0);
})();
