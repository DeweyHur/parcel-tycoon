// 온라인 난투(3단계) 화면 점검 — 서버는 www/api/match.js 를 테스트 프로세스 안에서 인메모리로 돌리고 Playwright 라우트로 흉내 낸다.
// 두 브라우저(A 호스트 · B) → 큐 → 매치(봇 2) → 며칠 → 스냅샷·공격 중계 → 끝 → 검증·정산·ELO
// node test/online-ui.js   (npm run serve 필요)
const { chromium } = require('playwright');
const fs = require('fs');
const API = require('../www/api/match.js');
const OUT = process.env.OUT || 'shots';
const BASE = process.env.BASE || 'http://localhost:8765';
const pass = [], fail = [];
const ok = (name, cond, extra) => { (cond ? pass : fail).push(name); console.log((cond ? '  ok  ' : ' FAIL ') + name + (extra ? ` — ${extra}` : '')); };
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const S = API.memStore();
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const errors = [];
  async function open(tag) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ko-KR' });
    await ctx.route(/\/api\/match/, async route => { const d = JSON.parse(route.request().postData() || '{}'); const [code, obj] = await API.handle(S, d, tag); route.fulfill({ status: code, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(obj) }); });
    await ctx.route(/\/api\/scores/, route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    const page = await ctx.newPage();
    page.on('pageerror', e => { if (!/audio/i.test(e.message)) errors.push(tag + ' PAGEERROR ' + e.message); });
    page.on('console', m => { const t = m.text(); if (/\[i18n\]/.test(t)) errors.push(tag + ' I18N ' + t); else if (m.type() === 'error' && !/audio|font|mp3|woff|404|Failed to load resource/i.test(t)) errors.push(tag + ' CONSOLE ' + t); });
    await page.goto(BASE + '/index.html'); await page.waitForTimeout(500);
    await page.evaluate(nm => { const P = Profile.get(); P.campaign.cleared = 6; P.campaign.level = 7; P.campaign.name = nm; P.splashSeen = 5; Profile.save(); }, tag === 'A' ? '에이창고' : '비창고');
    await page.reload(); await page.waitForTimeout(800);
    for (let i = 0; i < 10; i++) { if (await page.$('#t-online')) break; await page.mouse.click(200, 400); await page.waitForTimeout(300); }
    return page;
  }
  const idle = page => page.waitForFunction(() => !PT.busy, null, { timeout: 8000 });
  const modalText = page => page.evaluate(() => (document.querySelector('#modal') || {}).textContent || '');
  const A = await open('A'), B = await open('B');
  ok('타이틀에 온라인 난투 버튼', !!(await A.$('#t-online')));
  await A.click('#t-online'); await A.waitForTimeout(2500);
  let t = await modalText(A);
  ok('A 큐: 대기 화면(대기 1명 · 등급)', /상대를 찾는 중/.test(t) && /대기 1명/.test(t) && /견습 기사/.test(t), t.slice(0, 80));
  await A.screenshot({ path: `${OUT}/O-01-queue.png` });
  // A 를 61초 기다린 것으로 — 다음 사람이 오면 봇으로 채워 시작한다
  const pidA = await A.evaluate(() => Profile.get().pid), pidB = await B.evaluate(() => Profile.get().pid);
  await B.click('#t-online'); await B.waitForTimeout(700);
  { const e = JSON.parse((await S.call([['HGET', 'mq', pidA]]))[0]); e.at -= 61; await S.call([['HSET', 'mq', pidA, JSON.stringify(e)]]); }
  await B.waitForTimeout(3000); await A.waitForTimeout(2500);
  for (const pg of [A, B]) await pg.evaluate(() => { const i = document.querySelector('#mintro'); if (i) i.click(); }); await A.waitForTimeout(600);
  const stA = await A.evaluate(() => ({ online: !!(PT.match && PT.match.online), host: PT.match && PT.match.online && PT.match.online.host, n: PT.match && PT.match.players.length, games: PT.match && PT.match.players.filter(p => p.game).length, me: PT.match && PT.match.players[0].id === Profile.get().pid, seed: PT.game && PT.game.seed }));
  const stB = await B.evaluate(() => ({ online: !!(PT.match && PT.match.online), host: PT.match && PT.match.online && PT.match.online.host, n: PT.match && PT.match.players.length, games: PT.match && PT.match.players.filter(p => p.game).length, me: PT.match && PT.match.players[0].id === Profile.get().pid, seed: PT.game && PT.game.seed }));
  ok('매치 성립: A 호스트(봇 2 판 보유) · B 손님(내 판만) · 같은 서버 시드', stA.online && stA.host && stA.n === 4 && stA.games === 3 && stA.me && stB.online && !stB.host && stB.n === 4 && stB.games === 1 && stB.me && stA.seed === stB.seed, JSON.stringify({ stA, stB }));
  const oneDay = async page => { await page.evaluate(() => { const g = PT.game; if (g.phase !== 'play' || g.perkOffer) return; const b = window.BOT.STRATS.balanced(g); if (b) { document.querySelector('#c' + b.i).click(); } else document.querySelector('#wait-btn').click(); }); await page.waitForTimeout(150); await page.evaluate(() => { const w = document.querySelector('#wait-btn'); if (w && !w.disabled && PT.game.phase === 'play') w.click(); }); await page.waitForTimeout(400); await idle(page); };
  for (let i = 0; i < 5; i++) { await oneDay(A); await oneDay(B); }
  await A.waitForTimeout(3500); await B.waitForTimeout(500);
  const snapB = await B.evaluate(pid => { const a = PT.match.players.find(p => p.id === pid); const bots = PT.match.players.filter(p => p.bot); return { aSnap: a && a.snap && a.snap.day, botSnap: bots.map(p => p.snap && p.snap.day), strip: document.querySelector('#multi-strip').textContent.replace(/\s+/g, ' ') }; }, pidA);
  ok('B 화면: A 와 봇들이 스냅샷으로 보인다(일차)', snapB.aSnap >= 5 && snapB.botSnap.every(d => d >= 4), JSON.stringify(snapB));
  await B.screenshot({ path: `${OUT}/O-02-guest.png` });
  // A 가 📞 클레임 트레잇 택배를 내보낸다 → 서버가 B·봇들에게 → B 는 다음 날 맞는다
  await A.evaluate(() => { const g = PT.game; g.focusNext = false; const c = g.contracts.find(x => x && /bulk/.test(x.carrier)); const si = g.contracts.indexOf(c); g.parcels = g.parcels.filter(p => p.type !== 'normal'); const P = g._spawnParcel({ type: 'normal', size: 2, customer: 'anon', trait: 't_claim' }); g.parcels.push(P); g._assignCold(); PT.renderAll(); document.querySelector('#c' + si).click(); });
  await A.waitForTimeout(200); await A.evaluate(() => { const w = document.querySelector('#wait-btn'); if (!w.disabled) w.click(); }); await A.waitForTimeout(800); await idle(A);
  await B.waitForTimeout(4000);
  const inB = await B.evaluate(() => ({ inbox: PT.game.inbox.map(a => a.trait + '<' + a.fromName), news: PT.game.log.filter(l => l.k === 'log.attackIn').length }));
  const repB = await B.evaluate(() => PT.game.rep);
  await oneDay(B);
  const hitB = await B.evaluate(rep0 => ({ rep: PT.game.rep, rep0, hit: PT.game.log.some(l => l.k === 'log.attackIn' && l.p.icon === '📞' && l.p.from === '에이창고') }), repB);
  ok('공격 중계: A 의 📞 가 B 인박스로 → B 다음 날 평판 −1', inB.inbox.some(x => x.startsWith('t_claim<')) && hitB.hit, JSON.stringify({ inB, hitB }));
  await B.screenshot({ path: `${OUT}/O-03-hit.png` });
  // 끝까지: B 먼저(기다리는 중), A 나중(호스트가 봇 결과도) → 정산 · ELO
  const finishVia = async page => { await page.evaluate(() => { const g = PT.game; let guard = 0; while ((g.phase === 'play' || g.phase === 'market') && !(g.month === g.rules.months && g.turn === g.turns()) && guard++ < 400) { if (g.perkOffer) window.BOT.pickPerkBot(g); window.BOT.multiDay(g, 'balanced'); } if (g.perkOffer) window.BOT.pickPerkBot(g); PT.renderAll(); }); await page.evaluate(() => document.querySelector('#wait-btn').click()); await page.waitForTimeout(1500); await idle(page); };
  await finishVia(B); await B.waitForTimeout(1500);
  t = await modalText(B);
  ok('B 결과: 기다리는 중 (A 가 아직)', /난투/.test(t) && /기다리는 중/.test(t), t.slice(0, 80).replace(/\s+/g, ' '));
  await finishVia(A); await A.waitForTimeout(2500); await B.waitForTimeout(4000);
  const tA = await modalText(A), tB = await modalText(B);
  if (process.env.DBG) console.log('DBG A', JSON.stringify(await A.evaluate(() => ({ phase: PT.game.phase, rep: PT.game.rep, day: PT.game.totalTurn, reason: PT.game.result && PT.game.result.reason, perk: !!PT.game.perkOffer, modal: document.querySelector('#modal') && document.querySelector('#modal').textContent.slice(0, 80), }))), 'ERRS', JSON.stringify(errors));
  const fin = await S.call([['HGETALL', 'mf:' + (await S.call([['GET', 'mp:' + pidA]]))[0]]]);
  const mid = await A.evaluate(() => PT.match.online.mid); const results = Object.fromEntries((await S.call([['HGETALL', 'mf:' + mid]]))[0].reduce((a, v, i, arr) => (i % 2 === 0 ? a.concat([[v, JSON.parse(arr[i + 1])]]) : a), []));
  // A 는 테스트가 택배를 몰래 심었으니(로그에 없는 행동) 재실행이 안 맞아야 한다 — 그게 검증이다. B 는 통과
  ok('종료: 넷 다 결과 · B 는 재실행 검증 통과 · 로그 밖 행동을 한 A 는 불합격', Object.keys(results).length === 4 && !results[pidA].verified && results[pidB].verified, JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k.slice(0, 4), [v.cash, v.verified]]))));
  ok('결과 화면: 검증 실패 → 이 판 무효 · 등급 변동 없음 (둘 다)', /무효/.test(tA) && /무효/.test(tB) && !/기다리는 중/.test(tB), tA.slice(0, 60).replace(/\s+/g, ' '));
  await A.screenshot({ path: `${OUT}/O-04-result.png` });
  const eloA = await A.evaluate(() => (Profile.get().multi || {}).elo), eloB = await B.evaluate(() => (Profile.get().multi || {}).elo);
  ok('프로필 ELO 그대로 1200', eloA === 1200 && eloB === 1200, `${eloA} ${eloB}`);
  // ===== 4단계: 친구 초대 방 · 응원 이모지 · 등급 순위 =====
  for (const pg of [A, B]) { await pg.evaluate(() => [...document.querySelectorAll('#modal .btn')].find(b => /타이틀로/.test(b.textContent)).click()); await pg.waitForTimeout(600); }
  ok('타이틀에 친구와 버튼', !!(await A.$('#t-invite')));
  await A.click('#t-invite'); await A.waitForTimeout(400); await A.click('#inv-make'); await A.waitForTimeout(1200);
  const code = await A.evaluate(() => (document.querySelector('#inv-code-big') || {}).textContent);
  ok('A 방 생성: 코드 6자 · 시작 버튼 비활성(혼자)', /^[A-Z2-9]{6}$/.test(code || '') && await A.evaluate(() => !![...document.querySelectorAll('#modal .foot .btn')].find(b => /시작/.test(b.textContent) && b.disabled)), code);
  await A.screenshot({ path: `${OUT}/O-05-room.png` });
  await B.click('#t-invite'); await B.waitForTimeout(400); await B.click('#inv-join'); await B.fill('#inv-code', code.toLowerCase()); await B.click('#inv-go'); await B.waitForTimeout(2600);
  const roomB = await modalText(B), roomA = await modalText(A);
  ok('B 코드로 입장(소문자도) · 둘 다 명단에 둘 · B 는 방장 대기', /에이창고/.test(roomB) && /방장이 시작/.test(roomB) && /비창고/.test(roomA), roomA.replace(/\s+/g, ' ').slice(0, 100));
  await A.evaluate(() => [...document.querySelectorAll('#modal .foot .btn')].find(b => /시작/.test(b.textContent)).click()); await A.waitForTimeout(2000); await B.waitForTimeout(2500);
  for (const pg of [A, B]) await pg.evaluate(() => { const i = document.querySelector('#mintro'); if (i) i.click(); }); await A.waitForTimeout(600);
  const inv = await A.evaluate(() => ({ online: !!(PT.match && PT.match.online), bots: PT.match && PT.match.players.filter(p => p.bot).map(p => p.name), n: PT.match && PT.match.players.length }));
  const invB = await B.evaluate(() => ({ online: !!(PT.match && PT.match.online), host: PT.match && PT.match.online.host, mid: PT.match && PT.match.online.mid }));
  const midA = await A.evaluate(() => PT.match.online.mid);
  ok('초대 매치 시작: 둘 다 같은 매치 · 봇 2(이름은 한국어 이름표)', inv.online && invB.online && inv.n === 4 && invB.mid === midA && inv.bots.length === 2 && inv.bots.every(n => /^[가-힣]+$/.test(n)), JSON.stringify({ inv, invB }));
  // B 끝내고 응원 → A 포트레잇에 말풍선 + 토스트
  await finishVia(B); await B.waitForTimeout(1200);
  await B.evaluate(() => document.querySelector('[data-cheer="🔥"]').click()); await B.waitForTimeout(1200);
  await A.evaluate(() => PT.netSync(false)); await A.waitForTimeout(700);
  const cheered = await A.evaluate(() => ({ bubble: !!document.querySelector('#multi-strip .bubble'), toast: document.querySelector('#toast').textContent }));
  ok('응원: B 의 🔥 가 A 화면 포트레잇 말풍선·토스트로', cheered.bubble || /🔥/.test(cheered.toast), JSON.stringify(cheered));
  await A.screenshot({ path: `${OUT}/O-06-cheer.png` });
  await finishVia(A); await A.waitForTimeout(7000);
  const tInv = await modalText(A);
  ok('초대 판 결과: 등급 변동 없음(봇/초대 판)', /등급 변동 없음/.test(tInv), tInv.slice(0, 120).replace(/\s+/g, ' '));
  // 등급 순위 보드 (앞 판은 무효라 비어 있을 수 있다 → 빈 안내 또는 표)
  await A.evaluate(() => [...document.querySelectorAll('#modal .btn')].find(b => /타이틀로/.test(b.textContent)).click()); await A.waitForTimeout(500);
  await A.click('#t-online'); await A.waitForTimeout(600); await A.evaluate(() => [...document.querySelectorAll('#modal .foot .btn')].find(b => /등급 순위/.test(b.textContent)).click()); await A.waitForTimeout(1200);
  const tb = await modalText(A);
  ok('등급 순위 화면', /등급 순위/.test(tb) && (/아직 등급 판/.test(tb) || /견습|정규/.test(tb)), tb.slice(0, 60).replace(/\s+/g, ' '));
  await A.screenshot({ path: `${OUT}/O-07-board.png` });
  ok('콘솔 에러 0', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log(`\n${pass.length} ok, ${fail.length} fail`);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
