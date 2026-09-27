// 멀티 「난투」 밸런스 시뮬: 봇 4명(사람 자리도 봇)이 한 매치를 끝까지. node test/multi-sim.js [N] [rate] [fin] [fuel] [repStep]
// 보는 것: 생존률(3개월 완주) · 평균 잔액 · 도달 일차 · 장 본 날 · 평판 등급 · 반송. 규칙 값은 META.MULTI.mods 를 덮어 실험한다
const M = require('../www/js/meta.js');
const MULTI = require('../www/js/multi.js');
const BOT = require('../www/js/bot.js');
const [,, N = '20', rate, fin, mult, step] = process.argv;
if (rate) M.MULTI.mods.dayArrivalsRate = +rate; if (fin) M.MULTI.mods.finalRushMult = +fin; if (mult) M.MULTI.mods.arrivalsMult = +mult; if (step) M.MULTI.mods.repStep = +step;
const by = {}; let all = { n: 0, win: 0, cash: 0, day: 0, shop: 0, tier: 0, ret: 0, rep: 0, del: 0, d1: 0 };
for (let s = 1; s <= +N; s++) {
  const m = MULTI.newMatch({ seed: s * 7919, name: 'H', bots: 3 });
  const h = m.players[0]; let guard = 0;
  while (!(h.game.phase === 'over' || h.game.phase === 'win') && guard++ < 400) { BOT.multiDay(h.game, 'balanced'); MULTI.tick(m); }
  MULTI.finishAll(m);
  for (const r of MULTI.standings(m)) { const g = r.p.game, k = r.p.human ? 'human(balanced)' : r.p.strat; const b = by[k] = by[k] || { n: 0, win: 0, rank: 0, cash: 0 };
    b.n++; b.win += r.win ? 1 : 0; b.rank += r.rank; b.cash += g.cash;
    all.n++; all.win += r.win ? 1 : 0; all.cash += g.cash; all.day += MULTI.dayOf(g); all.shop += g.stats.shopDays || 0; all.tier += g.repTier; all.ret += g.stats.returned; all.rep += g.rep; all.del += g.stats.delivered || 0; }
  all.d1 += m.players[0].game._sharedSchedule(1).slice(0, 4).reduce((a, t) => a + t.length, 0) / 4;
}
const R = M.MULTI.mods, pct = (a, b) => Math.round(100 * a / b) + '%', avg = (a, b) => Math.round(a / b);
console.log(`rate ${R.dayArrivalsRate} fin ${R.finalRushMult} mult ${R.arrivalsMult || 1} step ${R.repStep} · ${N}매치 · 첫 나흘 하루 입고 ${(all.d1 / N).toFixed(1)}`);
console.log(`전체: 완주 ${pct(all.win, all.n)}  잔액 ${avg(all.cash, all.n)}  일차 ${avg(all.day, all.n)}  장 ${avg(all.shop, all.n)}  등급 ${avg(all.tier, all.n)}  평판 ${avg(all.rep, all.n)}  처리 ${avg(all.del, all.n)}  반송 ${avg(all.ret, all.n)}`);
for (const k in by) console.log(`  ${k.padEnd(16)} 완주 ${pct(by[k].win, by[k].n)}  평균 순위 ${(by[k].rank / by[k].n).toFixed(2)}  잔액 ${avg(by[k].cash, by[k].n)}`);
