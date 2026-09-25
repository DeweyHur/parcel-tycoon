// 자유 런(캠페인 뒤) 화면 점검: 런 선택(나라 × 기간) → 회사 → 퍽 → 시작 → 공휴일 턴 → 정산 → 결과, 해금 사슬.
// node test/runs-ui.js   (npm run serve 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.env.OUT || 'shots';
const pass = [], fail = [];
const ok = (name, cond, extra) => { (cond ? pass : fail).push(name + (extra ? ` — ${extra}` : '')); console.log((cond ? '  ok  ' : ' FAIL ') + name + (extra ? ` — ${extra}` : '')); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => { if (!/audio/i.test(e.message)) errors.push('PAGEERROR ' + e.message); });
  page.on('console', m => { const t = m.text(); if (/\[i18n\]/.test(t)) errors.push('I18N ' + t); else if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load resource/i.test(t)) errors.push('CONSOLE ' + t); });
  const shot = n => page.screenshot({ path: `${OUT}/${n}.png` });
  const modalText = () => page.evaluate(() => (document.querySelector('#modal') || {}).textContent || '');
  // 캠페인을 마친 프로필로 시작한다
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(500);
  await page.evaluate(() => { const P = Profile.get(); P.campaign.cleared = 6; P.campaign.level = 7; P.splashSeen = 5; Profile.save(); });
  await page.reload(); await page.waitForTimeout(800);
  for (let i = 0; i < 10; i++) { if (await page.$('#t-new')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
  ok('타이틀에 새 런', !!(await page.$('#t-new')));
  await page.click('#t-new'); await page.waitForTimeout(400);
  let t = await modalText();
  ok('런 선택: 한국 · 분기 · 봄', /한국/.test(t) && /분기/.test(t) && /봄 \(3~5월\)/.test(t));
  ok('런 카드에 시작 해', new RegExp(`📅${new Date().getFullYear()}`).test(t), (t.match(/📅[^📅]{0,24}/) || [''])[0].trim());
  ok('난이도 줄이 없다', !/수습|베테랑|정규/.test(t));
  // 못 고르는 런은 아예 안 보인다 (해금 조건은 도감에)
  const locked = await page.evaluate(() => [...document.querySelectorAll('#modal .card.dis')].length);
  ok('잠긴 런 카드가 없다', locked === 0 && !/여름 \(6~8월\)/.test(t) && !/반기/.test(t) && !/한 해/.test(t), String(locked));
  await shot('runs-01-select');
  // 겨울을 풀면 나타나고, 해를 넘겨 표시된다
  await page.evaluate(() => { const P = Profile.get(); P.unlocked.scenarios.push('kr_winter'); Profile.save(); });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal .btn')].find(x => /타이틀/.test(x.textContent)); b.click(); }); await page.waitForTimeout(300);
  await page.click('#t-new'); await page.waitForTimeout(400);
  t = await modalText();
  ok('겨울은 해를 넘겨 표시', /겨울 \(12~2월\)/.test(t) && new RegExp(`${new Date().getFullYear()}→${new Date().getFullYear() + 1}`).test(t));
  ok('선택은 봄 그대로', (await page.evaluate(() => PT.prep.scenario)) === 'kr_spring');
  // 한국 런은 회사를 고르지 않는다: 런 → 퍽 → 시작
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal .btn')].find(x => /다음: 퍽/.test(x.textContent)); b.click(); }); await page.waitForTimeout(300);
  t = await modalText(); ok('퍽 화면 (회사 단계 없이 2/2, 머리에 런 이름)', /퍽/.test(t) && !/변형/.test(t) && /2\/2 단계/.test(t) && /봄 \(3~5월\)/.test(t) && !/동네 택배/.test(t));
  await page.evaluate(() => { PT.prep.story = false; PT.startRun(); }); await page.waitForTimeout(500);
  for (let i = 0; i < 8; i++) { if (await page.evaluate(() => !!PT.game)) break; const b = await page.$('.foot .btn.primary'); if (!b) break; await b.click({ force: true }); await page.waitForTimeout(300); }
  ok('런 시작', !!(await page.evaluate(() => !!PT.game)));
  const info = await page.evaluate(() => { const g = PT.game; return { sc: g.cfg.scenario, months: g.rules.months, year: g.year, cal: g.calMonth(1), diff: g.difficulty, evs: g.holidayEvents(1).map(e => e.id + ':' + e.turns.join('-')), off1: g.isOffTurn(1), hud: document.querySelector('#hud-perks').textContent }; });
  ok('봄 런: 6사이클 · 3월 · 난이도 없음', info.sc === 'kr_spring' && info.months === 6 && info.cal === 3 && !info.diff, JSON.stringify(info));
  ok('3·1절이 첫 사이클에 실제 날짜로 걸린다', info.evs.some(e => /^samil/.test(e)), info.evs.join(','));
  ok('HUD에 난이도 없음', !/수습|정규|베테랑/.test(info.hud));
  // 준비 마켓 닫고 첫 턴
  await page.evaluate(() => { if (PT.game.phase === 'market') { PT.game.closeMarket(); PT.renderAll(); } }); await page.waitForTimeout(300);
  const hudText = await page.evaluate(() => document.querySelector('#hud').textContent);
  await shot('runs-02-play');
  // 달력 카드에 공휴일이 실제 날짜로
  const cal = await page.evaluate(() => PT.game.calendarMonths().map(m => m.cal + ':' + m.events.map(e => e.id + '@' + e.days.join('~')).join('|')).join(' / '));
  ok('달력 카드: 3월 3·1절, 5월 어린이날·부처님오신날·선물 주간', /3:samil/.test(cal) && /children/.test(cal) && /buddha/.test(cal) && /gift/.test(cal), cal);
  // 빨리 감기: 정산 → 마켓 → 마지막까지 → 결과 화면
  await page.evaluate(() => { const g = PT.game; for (let c = 1; c <= g.rules.months; c++) { g.turn = g.turns(); g.cash = 9000; g.feesDue = 0; g.rep = g.repCap(); g._endMonth(); if (g.phase === 'summary') { g.closeSummary(); if (g.phase === 'market') g.closeMarket(); } if (g.phase === 'win' || g.phase === 'over') break; } PT.renderAll(); });
  await page.waitForTimeout(300);
  const end = await page.evaluate(() => ({ phase: PT.game.phase, win: PT.game.result && PT.game.result.win, sc: PT.game.result && PT.game.result.scenario }));
  ok('분기 끝까지 돌면 완주', end.phase === 'win' && end.win, JSON.stringify(end));
  // 결과 기록 → 여름 해금
  const got = await page.evaluate(() => { const r = PT.game.result; const got = Profile.recordRun(PT.game, r); return { got: got.map(g => g.id), un: Profile.get().unlocked.scenarios.slice() }; });
  ok('봄 완주 → 여름 해금 (+첫 완주)', got.got.includes('kr_spring_clear') && got.un.includes('kr_summer'), JSON.stringify(got));
  await page.evaluate(() => PT.showResult ? PT.showResult() : null).catch(() => { });
  // 사계절 → 반기, 반기 → 한 해
  const chain = await page.evaluate(() => { const P = Profile.get(); for (const k of ['kr_spring', 'kr_summer', 'kr_autumn', 'kr_winter']) P.stats.clearsByScenario[k] = 1; Profile.evaluate(null, null); const a = P.unlocked.scenarios.slice(); P.stats.clearsByScenario.kr_h2 = 1; Profile.evaluate(null, null); return { a, b: P.unlocked.scenarios.slice() }; });
  ok('사계절 → 상·하반기', chain.a.includes('kr_h1') && chain.a.includes('kr_h2') && !chain.a.includes('kr_year'), chain.a.join(','));
  ok('반기 하나 → 한 해', chain.b.includes('kr_year'), chain.b.join(','));
  // 도감 런 탭
  await page.evaluate(() => { PT.game = null; PT.showTitle(); }); await page.waitForTimeout(200);
  for (let i = 0; i < 10; i++) { if (await page.$('#t-codex')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
  await page.click('#t-codex'); await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.modal [data-tab="scenarios"]').click()); await page.waitForTimeout(300);
  t = await modalText();
  ok('도감 런 탭에 7종, 잠긴 것은 해금 조건', (t.match(/\(3~5월\)|\(6~8월\)|\(9~11월\)|\(12~2월\)|\(3~8월\)|\(9~2월\)|이듬해/g) || []).length >= 7 && /여름을 넘기다/.test(t), t.slice(0, 80));
  await shot('runs-03-codex');
  await page.evaluate(() => document.querySelector('.modal [data-tab="achievements"]') && document.querySelector('.modal [data-tab="achievements"]').click()); await page.waitForTimeout(300);
  t = await modalText();
  ok('도감 도전과제 탭 렌더 (사계절·명절 특수)', /사계절/.test(t) && /명절 특수/.test(t));
  console.log(`\n에러: ${errors.length ? errors.join('\n') : '없음'}`);
  console.log(fail.length ? `\n실패 ${fail.length}건:\n${fail.join('\n')}` : `\n전부 통과 (${pass.length})`);
  await browser.close();
  process.exit(fail.length || errors.length ? 1 : 0);
})();
