const path = __dirname + '/../';
const SCEN = process.argv[3] || 'standard';
const { Game } = require(path + 'www/js/game.js');
const sim = require(path + 'test/sim.js');
// 전략: none(마켓 무구매) / moderate(봇 기본: 빈 슬롯·힌트·업그레이드·추가·시설·강화) / aggressive(현금 여유 기준 절반)
function marketAggressive(g) { const c = g.cash; g.cash = c * 2; sim.marketBot(g); const spent = c * 2 - g.cash; g.cash = c - spent; }
function run(strat, N) {
  const M = SCEN === 'standard' ? 12 : 6, sum = { cash: Array(M + 1).fill(0), rev: Array(M + 1).fill(0), fees: Array(M + 1).fill(0), op: Array(M + 1).fill(0), spent: Array(M + 1).fill(0), ret: Array(M + 1).fill(0), stress: Array(M + 1).fill(0), alive: Array(M + 1).fill(0) };
  let wins = 0, deaths = {};
  for (let s = 1; s <= N; s++) {
    const g = new Game({ seed: s, perks: ['skip', 'insure'], insurer: 'sturdy', prep: true, scenario: SCEN });
    let guard = 0, mspent = 0, lastCash = g.cash;
    while (g.phase !== 'over' && g.phase !== 'win' && guard++ < 800) {
      if (g.phase === 'play') { const b = sim.STRATS.balanced(g); if (!b) g.wait([]); else g.callCarrier(b.i, b.ids, b.trucks); }
      else if (g.phase === 'summary') { const S = g.summary, m = S.month; sum.cash[m] += S.cash - (S.loan ? S.loan.debt : 0); sum.rev[m] += S.revenue; sum.fees[m] += S.fees; sum.op[m] += S.opCost + (S.premium || 0); sum.ret[m] += S.returned + S.discarded; sum.stress[m] += S.stress; sum.alive[m]++; g.closeSummary(); }
      else if (g.phase === 'market') { const c0 = g.cash; if (strat === 'moderate') sim.marketBot(g); else if (strat === 'aggressive') marketAggressive(g); if (g.cash < 0) g.cash = 0; sum.spent[Math.min(M, g.month)] += c0 - g.cash; g.closeMarket(); }
    }
    if (g.phase === 'win') wins++; else { const k = g.stats.monthsDone + 1; deaths[k] = (deaths[k] || 0) + 1; }
  }
  const out = { strat, win: wins / N, deaths, months: [] };
  for (let m = 1; m <= M; m++) { const a = sum.alive[m] || 1; out.months.push({ m, alive: sum.alive[m] / N, cash: Math.round(sum.cash[m] / a), rev: Math.round(sum.rev[m] / a), fees: Math.round(sum.fees[m] / a), op: Math.round(sum.op[m] / a), spent: Math.round(sum.spent[m] / N), ret: +(sum.ret[m] / a).toFixed(1), stress: +(sum.stress[m] / a).toFixed(1) }); }
  return out;
}
const N = +process.argv[2] || 50; const res = ['none', 'moderate', 'aggressive'].map(s => run(s, N));
console.log(JSON.stringify(res));
