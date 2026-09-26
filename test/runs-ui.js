// 자유 런(캠페인 뒤) 화면 점검: 런 선택(나라 × 기간) → 퍽 → 시작 → 공휴일 턴 → 정산 → 결과, 계절 이어하기, 해금 사슬, 무료판 경계.
// node test/runs-ui.js   (npm run serve 필요)
//
// 계절 이어하기 (STORY_TUTORIAL_DESIGN 부록 BB):
//   봄 = 인수인계(캠페인) 다시 · 여름 = 인수인계를 끝낸 창고 · 가을 = 여름을 넘긴 창고 · 겨울 = 가을을 넘긴 창고
//   겨울 완주 → 상·하반기·한 해. 무료판(BUILD.demo)은 봄·여름까지, 여름을 넘기면 본편 안내.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.OUT || 'shots';
const BASE = process.env.BASE || 'http://localhost:8765';
const pass = [], fail = [];
const ok = (name, cond, extra) => { (cond ? pass : fail).push(name + (extra ? ` — ${extra}` : '')); console.log((cond ? '  ok  ' : ' FAIL ') + name + (extra ? ` — ${extra}` : '')); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const errors = [];
  async function open(demo) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
    // 무료판: build.js 의 demo 플래그만 바꿔 서빙한다 (tools/build-web.py --demo 와 같은 한 줄)
    if (demo) await ctx.route(/\/js\/build\.js/, async route => { const r = await route.fetch(); const body = (await r.text()).replace('\n  demo: false,', '\n  demo: true,'); route.fulfill({ response: r, body }); });
    const page = await ctx.newPage();
    page.on('pageerror', e => { if (!/audio/i.test(e.message)) errors.push('PAGEERROR ' + e.message); });
    page.on('console', m => { const t = m.text(); if (/\[i18n\]/.test(t)) errors.push('I18N ' + t); else if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load resource/i.test(t)) errors.push('CONSOLE ' + t); });
    await page.goto(BASE + '/index.html');
    await page.waitForTimeout(500);
    // 캠페인을 마친 프로필 — 5장 끝 판(carryAt[7])이 여름의 시작 판이 된다
    await page.evaluate(() => { const P = Profile.get(); P.campaign.cleared = 6; P.campaign.level = 7; P.campaign.name = '새봄택배';
      P.campaign.carryAt = { 7: { cash: 1777, year: 2027, warehouse: { cap: 40, cold: 8, frozen: 4, xl: 0 }, contracts: [{ carrier: 'bulk0', grade: 'normal', calls: 3, enh: {} }, { carrier: 'cold0', grade: 'normal', calls: 2, enh: {} }], customers: [['anon', 0], ['mart', 1], ['ice', 0]], trust: {}, growth: {}, media: {} } };
      P.splashSeen = 5; Profile.save(); });
    await page.reload(); await page.waitForTimeout(800);
    for (let i = 0; i < 10; i++) { if (await page.$('#t-new')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
    return page;
  }
  const modalText = page => page.evaluate(() => (document.querySelector('#modal') || {}).textContent || '');
  const clickBtn = (page, re) => page.evaluate(src => { const b = [...document.querySelectorAll('.modal .btn')].find(x => new RegExp(src).test(x.textContent)); if (!b) return false; b.click(); return true; }, re.source);
  const clickCard = (page, id) => page.evaluate(id => { const c = document.querySelector(`#modal .card[data-id="${id}"]`); if (!c) return false; c.click(); return true; }, id);
  // 빨리 감기: 끝까지 정산 → 결과
  const fastFinish = page => page.evaluate(() => { const g = PT.game; if (g.phase === 'market') g.closeMarket(); for (let c = 1; c <= g.rules.months + 1; c++) { g.turn = g.turns(); g.cash = 9000; g.feesDue = 0; g.debt = 0; g.rep = g.repCap(); g._endMonth(); if (g.phase === 'summary') { g.closeSummary(); if (g.phase === 'market') g.closeMarket(); } if (g.phase === 'win' || g.phase === 'over') break; } PT.renderAll(); return { phase: g.phase, win: g.result && g.result.win, sc: g.result && g.result.scenario }; });

  // ===== 본편 =====
  let page = await open(false);
  ok('타이틀에 새 런', !!(await page.$('#t-new')));
  await page.click('#t-new'); await page.waitForTimeout(400);
  let t = await modalText(page);
  ok('런 선택: 한국 · 분기 · 봄 · 여름', /한국/.test(t) && /분기/.test(t) && /봄 \(3~5월\)/.test(t) && /여름 \(6~8월\)/.test(t));
  ok('봄·여름 카드는 캠페인의 해(2027)', (t.match(/📅2027/g) || []).length >= 2, (t.match(/📅[^📅]{0,12}/g) || []).join(' '));
  ok('카드에 이어하기 설명 줄이 없다', !/창고 그대로|기본 창고로|박 반장과 인수인계/.test(t));
  ok('카드에 런 특징 (이름 + 수치)', /장마 비 ×2\.2/.test(t) && /폭염 경보 폭염 ×2/.test(t) && !/📦/.test(t) && !/이사철 마무리|가정의 달/.test(t), (t.match(/여름[^]{0,80}/) || [''])[0]);
  ok('난이도 줄이 없다', !/수습|베테랑|정규/.test(t));
  const locked = await page.evaluate(() => [...document.querySelectorAll('#modal .card.dis')].length);
  ok('잠긴 런 카드가 없다 (가을·반기·한 해는 아직 안 보임)', locked === 0 && !/가을 \(9~11월\)/.test(t) && !/반기/.test(t) && !/한 해/.test(t), String(locked));
  await page.screenshot({ path: `${OUT}/runs-01-select.png` });
  // 봄 → 장 고르기
  ok('기본 선택은 봄 · 버튼은 「시작」', (await page.evaluate(() => PT.prep.scenario)) === 'kr_spring' && await page.evaluate(() => [...document.querySelectorAll('.modal .foot .btn')].some(b => b.textContent.trim() === '시작')));
  await clickBtn(page, /^시작$/); await page.waitForTimeout(300);
  t = await modalText(page);
  const chips = await page.evaluate(() => document.querySelectorAll('#modal .chpick .chip').length);
  ok('봄 → 인수인계 장 고르기 (여섯 장)', /어느 장부터/.test(t) && chips === 6, `${chips}`);
  await page.screenshot({ path: `${OUT}/runs-02-spring.png` });
  await clickBtn(page, /이전/); await page.waitForTimeout(300);
  // 여름 고르고 퍽 → 시작
  await clickCard(page, 'kr_summer'); await page.waitForTimeout(300);
  ok('여름 선택', (await page.evaluate(() => PT.prep.scenario)) === 'kr_summer');
  await clickBtn(page, /다음: 퍽/); await page.waitForTimeout(300);
  t = await modalText(page); ok('퍽 화면 (회사 단계 없이 2/2, 머리에 런 이름)', /퍽/.test(t) && /2\/2 단계/.test(t) && /여름 \(6~8월\)/.test(t) && !/동네 택배/.test(t));
  await page.evaluate(() => { PT.prep.story = true; PT.startRun(); }); await page.waitForTimeout(500);
  for (let i = 0; i < 8; i++) { if (await page.evaluate(() => !!PT.game)) break; const b = await page.$('.foot .btn.primary'); if (!b) break; await b.click({ force: true }); await page.waitForTimeout(300); }
  ok('런 시작', !!(await page.evaluate(() => !!PT.game)));
  let info = await page.evaluate(() => { const g = PT.game; return { sc: g.cfg.scenario, months: g.rules.months, year: g.year, cal: g.calMonth(1), cash: g.cash, cap: g.warehouse.cap, frozen: g.warehouse.frozen, cts: g.contracts.filter(Boolean).map(c => c.carrier), ice: !!g.customers.ice, story: !!g.story, level: !!g.level, evs: Array.from({ length: g.rules.months }, (_, i) => g.holidayEvents(i + 1).map(e => e.id)).flat() }; });
  ok('여름 런: 6사이클 · 6월 · 2027년', info.sc === 'kr_summer' && info.months === 6 && info.cal === 6 && info.year === 2027, JSON.stringify(info));
  ok('인수인계를 끝낸 창고를 그대로 물려받는다 (자금·창고·계약·고객)', info.cash === 1777 && info.cap === 40 && info.frozen === 4 && info.cts.join() === 'bulk0,cold0' && info.ice, JSON.stringify(info));
  ok('박 반장 없음 · 캠페인 보정 없음', !info.story && !info.level);
  ok('여름 공휴일이 실제 날짜로 걸린다 (2027 현충일은 일요일 — 광복절 8/15 도 일요일이라 대체공휴일)', info.evs.includes('liberation'), info.evs.join(','));
  await page.evaluate(() => { if (PT.game.phase === 'market') { PT.game.closeMarket(); PT.renderAll(); } }); await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/runs-03-summer.png` });
  let end = await fastFinish(page);
  ok('여름 끝까지 돌면 완주', end.phase === 'win' && end.win, JSON.stringify(end));
  let got = await page.evaluate(() => { const r = PT.game.result; const got = Profile.recordRun(PT.game, r); r.recorded = true; r.got = got; const P = Profile.get(); return { got: got.map(g => g.id), un: P.unlocked.scenarios.slice(), chain: P.chain.kr_autumn && P.chain.kr_autumn.warehouse && P.chain.kr_autumn.year }; });
  ok('여름 완주 → 가을 해금, 그 창고가 가을의 시작 판', got.got.includes('kr_summer_clear') && got.un.includes('kr_autumn') && got.chain === 2027, JSON.stringify(got));
  // 가을: 여름을 넘긴 창고로
  await page.evaluate(() => { Store.remove('save_v2'); PT.game = null; PT.showTitle(); }); await page.waitForTimeout(300);
  for (let i = 0; i < 10; i++) { if (await page.$('#t-new')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
  await page.click('#t-new'); await page.waitForTimeout(400);
  t = await modalText(page);
  if (!/가을 \(9~11월\)/.test(t)) console.log('    [debug] ' + t.slice(0, 200));
  ok('가을 카드가 열렸다', /가을 \(9~11월\)/.test(t));
  const aut = await page.evaluate(() => { PT.prep.scenario = 'kr_autumn'; PT.prep.story = true; PT.startRun(); const g = PT.game; const c = Profile.get().chain.kr_autumn; return { cap: g.warehouse.cap, want: c.warehouse.cap, year: g.year, cal: g.calMonth(1), story: !!g.story }; });
  await page.waitForTimeout(300);
  ok('가을 런: 여름 끝 판에서 · 9월 · 같은 해', aut.cap === aut.want && aut.year === 2027 && aut.cal === 9 && !aut.story, JSON.stringify(aut));
  const again = await page.evaluate(() => { const a = Profile.chainStart('kr_autumn'), b = JSON.stringify(Profile.chainStart('kr_autumn')); a.cash = -1; return Profile.chainStart('kr_autumn').cash !== -1 && b === JSON.stringify(Profile.chainStart('kr_autumn')); });
  ok('가을은 몇 번이든 같은 시작 판에서 (복사본을 준다)', again);
  end = await fastFinish(page);
  got = await page.evaluate(() => { const got = Profile.recordRun(PT.game, PT.game.result); PT.game.result.recorded = true; return { got: got.map(g => g.id), un: Profile.get().unlocked.scenarios.slice(), chain: !!Profile.get().chain.kr_winter }; });
  ok('가을 완주 → 겨울 해금 + 시작 판', end.win && got.un.includes('kr_winter') && got.chain, JSON.stringify(got));
  got = await page.evaluate(() => { PT.prep.scenario = 'kr_winter'; PT.startRun(); const g = PT.game; const w = { cal: g.calMonth(1), year: g.year }; if (g.phase === 'market') g.closeMarket(); for (let c = 1; c <= g.rules.months + 1; c++) { g.turn = g.turns(); g.cash = 9000; g.feesDue = 0; g.debt = 0; g.rep = g.repCap(); g._endMonth(); if (g.phase === 'summary') { g.closeSummary(); if (g.phase === 'market') g.closeMarket(); } if (g.phase === 'win' || g.phase === 'over') break; } const got = Profile.recordRun(g, g.result); g.result.recorded = true; return { w, win: g.result.win, carry: g.result.carry, got: got.map(x => x.id), un: Profile.get().unlocked.scenarios.slice() }; });
  ok('겨울: 12월 · 같은 해에서 시작', got.w.cal === 12 && got.w.year === 2027, JSON.stringify(got.w));
  ok('겨울 완주 → 상·하반기·한 해 해금 (겨울은 넘길 판이 없다)', got.win && got.got.includes('kr_winter_clear') && ['kr_h1', 'kr_h2', 'kr_year'].every(k => got.un.includes(k)) && got.carry === null, JSON.stringify({ got: got.got, un: got.un }));
  // 도감
  await page.evaluate(() => { PT.game = null; PT.showTitle(); }); await page.waitForTimeout(300);
  for (let i = 0; i < 10; i++) { if (await page.$('#t-codex')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
  await page.click('#t-codex'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.modal [data-tab="scenarios"]').click()); await page.waitForTimeout(300);
  t = await modalText(page);
  ok('도감 런 탭에 7종', (t.match(/\(3~5월\)|\(6~8월\)|\(9~11월\)|\(12~2월\)|\(3~8월\)|\(9~2월\)|이듬해/g) || []).length >= 7, t.slice(0, 80));
  await page.evaluate(() => document.querySelector('.modal [data-tab="achievements"]') && document.querySelector('.modal [data-tab="achievements"]').click()); await page.waitForTimeout(300);
  t = await modalText(page);
  ok('도감 도전과제 탭: 겨울을 넘기다 · 옛 사계절/봄을 넘기다 없음', /겨울을 넘기다/.test(t) && !/사계절/.test(t) && !/봄을 넘기다/.test(t));
  await page.context().close();

  // ===== 무료판 =====
  page = await open(true);
  ok('무료판: 새 런은 잠겨 있지 않다', !/정식판/.test(await page.evaluate(() => document.querySelector('#t-new').textContent)));
  await page.click('#t-new'); await page.waitForTimeout(400);
  t = await modalText(page);
  const dis = await page.evaluate(() => [...document.querySelectorAll('#modal .card.dis')].map(c => c.dataset.id));
  ok('무료판: 봄·여름은 열려 있고 가을·겨울은 🔒 본편에서', /여름 \(6~8월\)/.test(t) && dis.join() === 'kr_autumn,kr_winter' && /정식판/.test(t) && !/반기/.test(t), dis.join());
  await page.screenshot({ path: `${OUT}/runs-04-demo-select.png` });
  await clickCard(page, 'kr_autumn'); await page.waitForTimeout(300);
  t = await modalText(page);
  ok('무료판: 가을을 누르면 본편 안내', /가을·겨울, 그리고 반기/.test(t) && /출시 준비 중/.test(t));
  await page.screenshot({ path: `${OUT}/runs-05-demo-gate.png` });
  await clickBtn(page, /닫기/); await page.waitForTimeout(300);
  await clickCard(page, 'kr_summer'); await page.waitForTimeout(200);
  await page.evaluate(() => { PT.startRun(); }); await page.waitForTimeout(400);
  end = await fastFinish(page);
  await page.evaluate(() => PT.showResult()); await page.waitForTimeout(600);
  t = await modalText(page);
  ok('무료판: 여름을 넘기면 결과에 본편 안내', end.win && /플레이해 주셔서 감사합니다/.test(t) && /체험판은 여기까지입니다/.test(t) && /정식판 보기/.test(t), t.slice(0, 120));
  await page.screenshot({ path: `${OUT}/runs-06-demo-end.png` });
  ok('무료판: 그래도 가을 시작 판은 저장돼 있다 (본편에서 이어짐)', await page.evaluate(() => !!Profile.get().chain.kr_autumn));
  await clickBtn(page, /정식판 보기/); await page.waitForTimeout(300);
  ok('본편 알아보기 → 안내 화면', /가을·겨울, 그리고 반기/.test(await modalText(page)));

  console.log(`\n에러: ${errors.length ? errors.join('\n') : '없음'}`);
  console.log(fail.length ? `\n실패 ${fail.length}건:\n${fail.join('\n')}` : `\n전부 통과 (${pass.length})`);
  await browser.close();
  process.exit(fail.length || errors.length ? 1 : 0);
})();
