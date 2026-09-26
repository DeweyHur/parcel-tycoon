// 밸런스 시뮬레이션: node test/sim.js
const { Game, DATA: D } = require('../www/js/game.js');

const { STRATS, marketBot, nextVolume } = require('../www/js/bot.js');

function runOne(seed, strat, cfg) {
  const g = new Game(Object.assign({ seed, perks: ['skip', 'insure'], insurer: 'sturdy', prep: true }, cfg || {}));
  let guard = 0;
  while (g.phase !== 'over' && g.phase !== 'win' && guard++ < 900) {
    if (g.phase === 'play') {
      // 보관 제안: 다음 턴 입고까지 넣어도 창고가 남으면 수락
      if (g.offer) { if (g.usedVolume() + g.offer.vol + nextVolume(g) <= g.warehouse.cap) g.acceptOffer(); else g.declineOffer(); }
      // 긴급 특송: 부패 직전·기한 임박 택배가 있으면 즉시 사용
      const b = STRATS[strat](g);
      if (!b) { const se = g.selfEligible().sort((a, b) => a.deadline - b.deadline).slice(0, g.selfCount()); g.wait(g.cash > 150 ? se.map(p => p.id) : []); } else g.callCarrier(b.i, b.ids, b.trucks);
    } else if (g.phase === 'weekend') {
      // 주말: 마당에 물건이 있고 자금이 넉넉하면 알바를 세우고, 아니면 쉰다
      const opt = g.weekendChoices();
      const part = opt.find(o => o.id === 'parttime');
      g.weekendChoose(part && part.ok && g.cash > part.cost + 400 ? 'parttime' : 'rest');
    } else if (g.phase === 'summary') g.closeSummary();
    else if (g.phase === 'market') { marketBot(g); g.closeMarket(); }
  }
  return g;
}

module.exports = { runOne, STRATS, marketBot };
function report(label, N, strat, cfg) {
  let wins = 0, cash = 0, calls = 0, waits = 0, stress = 0, rev = 0, months = 0;
  for (let s = 1; s <= N; s++) {
    const g = runOne(s, strat, cfg);
    if (g.phase === 'win') wins++;
    cash += g.cash; calls += g.run.calls; waits += g.run.waits; stress += g.rep; rev += g.run.revenue; months += (g.stats.monthsDone || 0) + (g.phase === 'win' ? 0 : g.turn / D.TURNS_PER_MONTH);
  }
  const mo = months / N;
  console.log(`${label.padEnd(14)} 생존 ${String(Math.round(wins / N * 100)).padStart(3)}%  평균개월 ${mo.toFixed(1)}  현금 ${(cash / N).toFixed(0).padStart(5)}  월호출 ${(calls / N / mo).toFixed(1)}  월대기 ${(waits / N / mo).toFixed(1)}  평판 ${(stress / N).toFixed(1)}  수익 ${(rev / N).toFixed(0)}`);
}
if (require.main === module) {
const N = +process.argv[2] || 200;
const mode = process.argv[3] || 'strats';
if (mode === 'companies') { for (const id of Object.keys(require('../www/js/meta.js').COMPANIES)) report(id, N, 'balanced', { company: id }); }
else if (mode === 'scenarios') { const M = require('../www/js/meta.js'); for (const id of Object.keys(M.SCENARIOS)) report(id, N, 'balanced', { scenario: id, company: 'local' }); }
else for (const strat of Object.keys(STRATS)) {
  let wins = 0, m2 = 0, m3 = 0, cash = 0, calls = 0, waits = 0, stress = 0, rev = 0;
  for (let s = 1; s <= N; s++) {
    const g = runOne(s, strat);
    if (g.phase === 'win') wins++;
    if (g.month >= 2) m2++; if (g.month >= 3) m3++;
    cash += g.cash; calls += g.run.calls; waits += g.run.waits; stress += g.rep; rev += g.run.revenue;
  }
  const months = (calls + waits) / N / D.TURNS_PER_MONTH;  // 사이클 길이는 12~14, 근사치
  console.log(`${strat.padEnd(9)} 생존3개월 ${(wins / N * 100).toFixed(0)}%  2개월도달 ${(m2 / N * 100).toFixed(0)}%  3개월도달 ${(m3 / N * 100).toFixed(0)}%  평균현금 ${(cash / N).toFixed(0)}  월평균호출 ${(calls / N / months).toFixed(1)}  월평균대기 ${(waits / N / months).toFixed(1)}  평균평판 ${(stress / N).toFixed(1)}  총수익 ${(rev / N).toFixed(0)}`);
}
}
