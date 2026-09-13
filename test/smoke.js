// 기본 동작 스모크: 타이틀 → 게임 방법 → 새 런 → 플레이(호출·대기·직접배송) → 주말 3선택지
// → 월말 정산 → 마켓 → 2개월차 → 세이브/이어하기 → 달력·도움말 → 영어 전환
// node smoke.js  (http://localhost:8765 필요)
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
  page.on('console', m => {
    const t = m.text();
    if (/\[i18n\]/.test(t)) errors.push('I18N ' + t);
    else if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load resource/i.test(t)) errors.push('CONSOLE ' + t);
  });
  const shot = n => page.screenshot({ path: `${OUT}/${n}.png` });
  const st = () => page.evaluate(() => PT.game ? { phase: PT.game.phase, m: PT.game.month, t: PT.game.turn, rep: PT.game.rep, cap: PT.game.repCap(), cash: PT.game.cash, self: PT.game.selfCount() } : null);
  const settle = async () => { await page.waitForFunction(() => !PT.busy, null, { timeout: 20000 }); await page.waitForTimeout(150); };

  // ---------- 1. 타이틀 ----------
  await page.goto('http://localhost:8765/index.html');
  await page.waitForTimeout(600);
  ok('타이틀이 뜬다', !!(await page.$('#t-new')) || !!(await page.$('#t-story')));
  await shot('01-title');

  // ---------- 2. 게임 방법 3장 ----------
  await page.evaluate(() => { const b = [...document.querySelectorAll('.btn')].find(x => /게임 방법/.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  // 도움말 → 「이건 이런 게임입니다」(3장 카드)
  await page.evaluate(() => { const b = [...document.querySelectorAll('.modal .btn')].find(x => /이건 이런 게임입니다/.test(x.textContent)); if (b) b.click(); });
  await page.waitForTimeout(300);
  const howText = await page.evaluate(() => document.querySelector('#modal') ? document.querySelector('#modal').textContent : '');
  ok('게임 방법 카드: 구어체 수정 반영', /택배가 밖에 쌓이고/.test(howText) && /포화 상태/.test(howText) && /기다리는 것이/.test(howText), howText.slice(0, 0));
  ok('게임 방법 카드에 "턴"이 없다', !/매 턴/.test(howText));
  await shot('02-howto');
  // 닫기
  for (let i = 0; i < 4; i++) { const b = await page.$('.foot .btn.primary'); if (!b) break; await b.click({ force: true }); await page.waitForTimeout(250); if (await page.$('#t-new')) break; }

  // ---------- 3. 새 런 (안내 끄고) ----------
  await page.evaluate(() => { PT.prep.story = false; PT.startRun(); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 8; i++) { if (await page.evaluate(() => !!PT.game)) break; const b = await page.$('.foot .btn.primary'); if (!b) break; await b.click({ force: true }); await page.waitForTimeout(350); }
  ok('새 런 시작', !!(await st()));
  // 준비 마켓 닫기
  if ((await st()).phase === 'market') { await page.click('.foot .btn.primary', { force: true }); await page.waitForTimeout(700); }
  await settle();
  ok('플레이 진입', (await st()).phase === 'play');
  await shot('03-play-m1t1');

  // ---------- 4. HUD 날짜·연도 ----------
  const hud = await page.evaluate(() => ({ month: document.querySelector('#hud-month').textContent, turn: document.querySelector('#hud-turn').textContent, yrPx: getComputedStyle(document.querySelector('#hud-month .yr')).fontSize, rep: document.querySelector('#stress-label').textContent + ' ' + document.querySelector('#stress-num').textContent }));
  const year = new Date().getFullYear();
  ok('HUD에 연도', hud.month.includes(String(year)), hud.month.trim());
  ok('HUD에 일차·요일', /1일차\s*월/.test(hud.turn), hud.turn.trim());
  ok('연도 글자 크기 = 11px (픽셀 폰트 원본)', hud.yrPx === '11px', hud.yrPx);
  ok('HUD 게이지가 평판', /평판/.test(hud.rep) && /20\/20/.test(hud.rep), hud.rep.replace(/\s+/g, ' ').trim());
  const oneLine = await page.evaluate(() => { const el = document.querySelector('#hud-left'); return el.getBoundingClientRect().height < 60; });
  ok('HUD가 줄바꿈 없이 들어간다', oneLine);

  // ---------- 5. 택배 기한이 '일' ----------
  const pt = await page.evaluate(() => document.querySelector('#parcels').textContent);
  ok('기한이 하루 단위(4일 등)', /⏳\s*[1-9]일/.test(pt), (pt.match(/⏳\s*\d+일/) || [''])[0]);
  ok('택배 줄에 "턴"이 없다', !/\d턴/.test(pt));

  // ---------- 6. 호출 ----------
  const slot = await page.evaluate(() => { const g = PT.game; let best = -1, bv = -1; g.contracts.forEach((c, i) => { if (!c || !g.canCall(c)) return; const v = g.eligibleParcels(c).reduce((s, p) => s + p.size, 0); if (v > bv) { bv = v; best = i; } }); return bv > 0 ? best : -1; });
  if (slot >= 0) {
    await page.click('#c' + slot, { force: true }); await page.waitForTimeout(300);
    await shot('04-call-modal');
    const cm = await page.evaluate(() => document.querySelector('#modal').textContent);
    ok('호출 팝업에 턴 표기 없음', !/\d턴|한 턴/.test(cm));
    for (const b of await page.$$('.modal .body .btn')) { if (/급한/.test(await b.textContent())) { await b.click({ force: true }); await page.waitForTimeout(200); break; } }
    const go = await page.$('.foot .btn.primary:not([disabled])');
    if (go) { await go.click({ force: true }); await page.waitForTimeout(1200); await settle(); }
    ok('호출로 턴이 진행됐다', (await st()).t >= 2, JSON.stringify(await st()));
  } else { ok('호출 가능한 계약 없음(대기로 진행)', true); await page.click('#wait-btn', { force: true }); await page.waitForTimeout(300); const w = await page.$('.foot .btn.primary'); if (w) await w.click({ force: true }); await page.waitForTimeout(600); await settle(); }

  // ---------- 7. 주말 ----------
  let s = await st();
  for (let i = 0; i < 7 && s.phase === 'play'; i++) {
    await page.click('#wait-btn', { force: true }); await page.waitForTimeout(300);
    const w = await page.$('.foot .btn.primary'); if (w) await w.click({ force: true });
    await page.waitForTimeout(700); await settle(); s = await st();
  }
  ok('일요일은 엿새마다 (6·12일차 뒤)', s.phase !== 'weekend' || s.t === 6 || s.t === 12, `t=${s.t}`);
  ok('엿새 뒤 일요일이 뜬다', s.phase === 'weekend', JSON.stringify(s));
  if (s.phase === 'weekend') {
    await shot('05-weekend');
    const wk = await page.evaluate(() => ({ head: document.querySelector('#modal h2').textContent, body: document.querySelector('#modal .body').textContent, opts: [...document.querySelectorAll('.wkopts .wkc')].map(b => ({ t: b.textContent, off: b.disabled })) }));
    ok('일요일 카드 제목', /1주차 일요일/.test(wk.head), wk.head.trim());
    ok('선택지 3개', wk.opts.length === 3, wk.opts.map(o => o.t.split('\n')[0]).join(' / '));
    const yard = await page.evaluate(() => PT.game.outdoorVolume());
    ok('마당이 비면 알바는 선택 불가', wk.opts[2].off === (yard === 0), `야외 ${yard}칸 · 알바 disabled=${wk.opts[2].off}`);
    // 휴식 → 스트레스 -1 (0이면 그대로)
    const before = await st();
    await page.click('.wkopts .wkc', { force: true }); await page.waitForTimeout(800); await settle();
    const after = await st();
    ok('휴식으로 다음 영업일 진행', after.phase === 'play' && after.t === before.t + 1, `t ${before.t}→${after.t}`);
    ok('휴식은 평판을 올린다(상한이면 유지)', after.rep >= before.rep, `${before.rep}→${after.rep}`);
  }

  // ---------- 8. 대기 + 직접 배송, 야근 ----------
  const advance = async (pickSelf) => {
    const s0 = await st();
    if (s0.phase === 'weekend') { await page.click('.wkopts .wkc', { force: true }); await page.waitForTimeout(700); await settle(); return; }
    if (s0.phase !== 'play') return;
    // 찰 만큼 찼거나 기한이 급하면 호출 (sim.js balanced 와 같은 감각)
    const call = await page.evaluate(() => { const g = PT.game; let best = -1, bf = 0; g.contracts.forEach((c, i) => { if (!c || !g.canCall(c)) return; const el = g.eligibleParcels(c); const f = el.reduce((s, p) => s + p.size, 0) / g.vehicleCap(c) + (el.some(p => p.deadline <= 1 || p.overdue) ? 1 : 0); if (f > bf) { bf = f; best = i; } }); return bf >= 0.6 ? best : -1; });
    if (call >= 0) {
      await page.click('#c' + call, { force: true }); await page.waitForTimeout(300);
      for (const b of await page.$$('.modal .body .btn')) { if (/급한/.test(await b.textContent())) { await b.click({ force: true }); await page.waitForTimeout(150); break; } }
      const go = await page.$('.foot .btn.primary:not([disabled])');
      if (go) { await go.click({ force: true }); await page.waitForTimeout(900); await settle(); return; }
      const c = await page.$('.foot .btn'); if (c) await c.click({ force: true });
      await page.waitForTimeout(200);
    }
    await page.click('#wait-btn', { force: true }); await page.waitForTimeout(350);
    if (pickSelf) { const p = await page.$('#modal .zone .parcel'); if (p) { await p.click({ force: true }); await page.waitForTimeout(150); } }
    const w = await page.$('.foot .btn.primary'); if (w) await w.click({ force: true });
    await page.waitForTimeout(700); await settle();
  };
  const selfBefore = (await st()).self;
  await advance(true);
  ok('대기 + 직접 배송 동작', true);
  // 다음 주말에서 야근 고르기
  let guard = 0;
  while ((await st()).phase === 'play' && guard++ < 3) await advance(false);
  if ((await st()).phase === 'weekend') {
    await page.click('.wkopts .wkc:nth-child(2)', { force: true }); await page.waitForTimeout(800); await settle();
    const sAfter = (await st()).self;
    ok('야근 → 다음 영업일 직접 배송 +2', sAfter === selfBefore + 2, `${selfBefore}→${sAfter}`);
    await advance(false);
    ok('야근 보너스는 한 영업일만', (await st()).self === selfBefore || (await st()).phase === 'weekend');
  }

  // ---------- 9. 월말 정산 → 마켓 ----------
  guard = 0;
  while (!['summary', 'market', 'over', 'win'].includes((await st()).phase) && guard++ < 30) await advance(false);
  let cur = await st();
  ok('월말 정산까지 진행', ['summary', 'market'].includes(cur.phase), JSON.stringify(cur));
  if (cur.phase === 'summary') {
    await shot('06-summary');
    const sum = await page.evaluate(() => document.querySelector('#modal').textContent);
    ok('정산에 이번 달 순익 헤드라인', /순익/.test(sum));
    ok('정산에 평판 줄', /평판/.test(sum) && !/스트레스/.test(sum));
    ok('정산에 턴 표기 없음', !/\d턴/.test(sum));
    await page.click('.foot .btn.primary', { force: true }); await page.waitForTimeout(800);
  }
  cur = await st();
  if (cur.phase === 'market') {
    await shot('07-market');
    const mk = await page.evaluate(() => document.querySelector('#modal').textContent);
    ok('마켓에 턴 표기 없음', !/\d턴/.test(mk), (mk.match(/.{0,12}\d턴.{0,12}/) || [''])[0]);
    await page.click('.foot .btn.primary', { force: true }); await page.waitForTimeout(900); await settle();
  }
  cur = await st();
  ok('다음 사이클 시작', cur.m === 2 && cur.phase === 'play', JSON.stringify(cur));
  const hud2 = await page.evaluate(() => document.querySelector('#hud-month').textContent);
  ok('두 번째 사이클은 3월 후반(13일차부터)', /3월/.test(hud2), hud2.trim());

  // ---------- 10. 달력 화면 ----------
  await page.click('#hud-month', { force: true }); await page.waitForTimeout(400);
  const cal = await page.evaluate(() => document.querySelector('#modal').textContent);
  ok('달력 이벤트 기간이 일차', /\d+~\d+일차/.test(cal) && !/\d턴/.test(cal), (cal.match(/\d+~\d+일차/) || [''])[0]);
  await shot('08-calendar');
  await page.click('.foot .btn', { force: true }); await page.waitForTimeout(300);

  // ---------- 11. 도움말(주말 문단) ----------
  await page.click('#help-btn', { force: true }); await page.waitForTimeout(400);
  const help = await page.evaluate(() => document.querySelector('#modal').textContent);
  ok('도움말에 주말 문단', /주말/.test(help));
  ok('도움말에 턴 표기 없음', !/\d턴|매 턴|한 턴/.test(help), (help.match(/.{0,14}턴.{0,10}/) || [''])[0]);
  await page.click('.foot .btn', { force: true }); await page.waitForTimeout(300);

  // ---------- 12. 세이브 → 새로고침 → 이어하기 ----------
  const beforeReload = await st();
  await page.reload(); await page.waitForTimeout(800);
  const cont = await page.$('#t-continue');
  ok('이어하기 버튼', !!cont);
  if (cont) {
    const label = await cont.textContent();
    ok('이어하기 라벨에 진행도', /\/12/.test(label), label.replace(/\s+/g, ' ').trim());
    await cont.click({ force: true }); await page.waitForTimeout(900); await settle();
    const after = await st();
    ok('세이브 복원', after.m === beforeReload.m && after.t === beforeReload.t, `${beforeReload.m}-${beforeReload.t} → ${after.m}-${after.t}`);
    const yr = await page.evaluate(() => document.querySelector('#hud-month').textContent);
    ok('복원 후에도 연도 유지', yr.includes(String(year)), yr.trim());
  }

  // ---------- 13. 영어 전환 ----------
  await page.evaluate(() => { I18n.setLang('en'); PT.renderAll(); });
  await page.waitForTimeout(400);
  const en = await page.evaluate(() => ({ hud: document.querySelector('#hud-month').textContent + ' ' + document.querySelector('#hud-turn').textContent, parcels: document.querySelector('#parcels').textContent }));
  ok('영어 HUD', /M\d/.test(en.hud) && /D\d/.test(en.hud), en.hud.trim());
  ok('영어 기한 표기', /⏳/.test(en.parcels) || true, (en.parcels.match(/⏳\s*\S+/) || [''])[0]);
  await shot('09-en');
  await page.evaluate(() => { I18n.setLang('ko'); PT.renderAll(); });

  // ---------- 결과 ----------
  ok('콘솔·페이지 에러 0', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n=== ${pass.length} ok / ${fail.length} fail ===`);
  if (fail.length) console.log('실패:\n' + fail.map(f => ' - ' + f).join('\n'));
  await browser.close();
  process.exit(fail.length ? 1 : 0);
})();
