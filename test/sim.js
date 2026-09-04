// 밸런스 시뮬레이션: node test/sim.js
const { Game, DATA: D } = require('../www/js/game.js');

function urgency(g) {
  // 가장 급한 택배 상태
  let minFresh = 99, minDead = 99;
  for (const p of g.parcels) { if (p.type === 'fresh') minFresh = Math.min(minFresh, p.fresh); minDead = Math.min(minDead, p.deadline); }
  return { minFresh, minDead };
}
function nextVolume(g) { const u = g.upcoming()[0]; return u.specs ? u.specs.reduce((s, x) => s + x.size, 0) : 0; }

function pickBest(g, threshold) {
  // 각 계약별 처리 가능 수 계산, 가장 많이 처리하는 계약 선택 (급한 것 우선)
  let best = null;
  g.contracts.forEach((c, i) => {
    if (!g.canCall(c)) return;
    const cap = g.callCapacity(c);
    const elig = g.eligibleParcels(c);
    // 급한 순: 부패 임박, 기한 임박
    const sorted = elig.slice().sort((a, b) => (a.type === 'fresh' ? a.fresh : 9) - (b.type === 'fresh' ? b.fresh : 9) || (c.carrier === 'target' ? (a.type === 'normal') - (b.type === 'normal') : 0) || a.deadline - b.deadline);
    const pick = sorted.slice(0, cap);
    const urgent = pick.some(p => (p.type === 'fresh' && p.fresh <= 1) || p.deadline <= 1 || p.overdue);
    const fill = pick.length / cap;
    const specialPick = pick.filter(p => p.type !== 'normal').length;
    const score = (urgent ? 100 : 0) + pick.length * 10 + fill * 5 + (c.carrier === 'target' ? specialPick * 8 - 6 : 0);
    if (!best || score > best.score) best = { i, ids: pick.map(p => p.id), score, urgent, fill };
  });
  if (!best) return null;
  if (threshold != null && !best.urgent && best.fill < threshold) return null;
  return best;
}

const STRATS = {
  greedy: g => pickBest(g, 0),
  balanced: g => {
    const u = urgency(g);
    const b = pickBest(g, 0.75);
    if (b && b.urgent) return b;
    if (g.usage() + nextVolume(g) / g.warehouse.cap > 0.9) return pickBest(g, 0);
    if (u.minFresh <= 1) return pickBest(g, 0);
    return b;
  },
  saver: g => {
    const u = urgency(g);
    if (g.usage() + nextVolume(g) / g.warehouse.cap > 1.0 || u.minFresh <= 1 || u.minDead <= 1) return pickBest(g, 0);
    return pickBest(g, 1.0);
  },
  waiter: () => null,
};

function marketBot(g) {
  // 1) 잔여 호출이 적은 슬롯부터 계약 교체 (최대 2개) 2) 남는 돈으로 시설 3) 그래도 남으면 강화
  const items = g.market.items;
  const contractItems = items.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'contract')
    .sort((a, b) => (b.it.calls || D.CARRIERS[b.it.carrier].calls) - (a.it.calls || D.CARRIERS[a.it.carrier].calls));
  const used = new Set();
  for (const { it, i } of contractItems) {
    let slot = -1, min = 99;
    g.contracts.forEach((c, s) => { if (!used.has(s) && c.calls < min) { min = c.calls; slot = s; } });
    if (min > 2) break;
    const r = g.buy(i, slot); if (r.ok) used.add(slot);
  }
  items.forEach((it, i) => { if (it.kind === 'fac' && it.fac && g.cash - it.price > 150) g.buy(i, null); });
  items.forEach((it, i) => { if (it.kind === 'enh' && g.cash - it.price > 250) { let slot = 0, max = -1; g.contracts.forEach((c, s) => { if (c.calls > max) { max = c.calls; slot = s; } }); g.buy(i, slot); } });
}

function runOne(seed, strat) {
  const g = new Game(seed);
  g.choosePerks(['skip', 'insure']);
  let guard = 0;
  while (g.phase !== 'over' && g.phase !== 'win' && guard++ < 500) {
    if (g.phase === 'play') {
      const b = STRATS[strat](g);
      if (b) g.callCarrier(b.i, b.ids); else g.wait();
    } else if (g.phase === 'summary') g.closeSummary();
    else if (g.phase === 'market') { marketBot(g); g.closeMarket(); }
  }
  return g;
}

module.exports = { runOne, STRATS };
if (require.main === module) {
const N = +process.argv[2] || 200;
for (const strat of Object.keys(STRATS)) {
  let wins = 0, m2 = 0, m3 = 0, cash = 0, calls = 0, waits = 0, stress = 0, rev = 0;
  for (let s = 1; s <= N; s++) {
    const g = runOne(s, strat);
    if (g.phase === 'win') wins++;
    if (g.month >= 2) m2++; if (g.month >= 3) m3++;
    cash += g.cash; calls += g.run.calls; waits += g.run.waits; stress += g.stress; rev += g.run.revenue;
  }
  const months = (calls + waits) / N / 10;
  console.log(`${strat.padEnd(9)} 생존3개월 ${(wins / N * 100).toFixed(0)}%  2개월도달 ${(m2 / N * 100).toFixed(0)}%  3개월도달 ${(m3 / N * 100).toFixed(0)}%  평균현금 ${(cash / N).toFixed(0)}  월평균호출 ${(calls / N / months).toFixed(1)}  월평균대기 ${(waits / N / months).toFixed(1)}  평균스트레스 ${(stress / N).toFixed(1)}  총수익 ${(rev / N).toFixed(0)}`);
}
}
