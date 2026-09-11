// 밸런스 시뮬레이션: node test/sim.js
const { Game, DATA: D } = require('../www/js/game.js');

function urgency(g) {
  // 가장 급한 택배 상태
  let minFresh = 99, minDead = 99;
  for (const p of g.parcels) { if (p.type === 'fresh' && !p.inCold) minFresh = 0; minDead = Math.min(minDead, p.deadline); }
  return { minFresh, minDead };
}
function nextVolume(g) { const u = g.upcoming()[0]; return u.specs ? u.specs.reduce((s, x) => s + x.size, 0) : 0; }

function pickBest(g, threshold) {
  // 계약별로 급한 순으로 차량에 담고(부피 기준), 배차비 대비 수입이 나오는 호출을 고른다
  let best = null;
  g.contracts.forEach((c, i) => {
    if (!g.canCall(c)) return;
    const vcap = g.vehicleCap(c), simul = Math.min(g.simulMax(c), c.calls), fee = g.truckFee(c);
    const elig = g.eligibleParcels(c);
    const sorted = elig.slice().sort((a, b) => (a.overdue ? -1 : 0) - (b.overdue ? -1 : 0) || a.deadline - b.deadline || b.size - a.size);
    // 대수별로 담아보고 가장 좋은 대수 선택
    for (let trucks = 1; trucks <= simul; trucks++) {
      const cap = vcap * trucks; const pick = []; let vol = 0;
      for (const p of sorted) { if (vol + p.size <= cap) { pick.push(p); vol += p.size; } }
      if (!pick.length) break;
      const urgent = pick.some(p => (p.type === 'fresh' && !p.inCold) || p.deadline <= 1 || p.overdue);
      const fill = vol / cap, income = pick.reduce((s, p) => s + p.reward, 0), cost = g.callFee(c, trucks);
      if (g.cash < cost) break;
      const net = income - cost;
      if (net <= 0 && !urgent) continue;
      const score = (urgent ? 100 : 0) + net * 0.5 + fill * 20;
      if (!best || score > best.score) best = { i, ids: pick.map(p => p.id), trucks, score, urgent, fill };
    }
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
  // 1) 빈 슬롯 채우기(막힌 속성 힌트 우선) 2) 보유 업체 업그레이드는 여유 있을 때 3) 시설 4) 강화
  const items = g.market.items;
  const contractItems = items.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'contract').sort((a, b) => (b.it.hint ? 1 : 0) - (a.it.hint ? 1 : 0));
  for (const { it, i } of contractItems) {
    const price = g.contractPrice(it);
    const empty = g.contracts.findIndex(c => !c);
    if (it.upgrade) { if (g.cash - price > 250) g.buy(i, g.contracts.findIndex(c => c && c.carrier === it.carrier), 'upgrade'); continue; }
    if (it.add) { const s = g.contracts.findIndex(c => c && c.carrier === it.carrier); if (s >= 0 && g.cash - price > 300 && g.contracts[s].delivered >= 6) g.buy(i, s, 'add'); continue; }
    if (empty >= 0 && g.cash - price > 120) { g.buy(i, empty); continue; }
    if (it.hint && g.cash - price > 120) { let slot = -1, min = 99; g.contracts.forEach((c, s) => { if (c && c.delivered < min) { min = c.delivered; slot = s; } }); if (slot >= 0) g.buy(i, slot); }
  }
  items.forEach((it, i) => { if (it.kind === 'fac' && it.fac && g.cash - it.price > 200) g.buy(i, null); });
  items.forEach((it, i) => { if (it.kind === 'enh' && g.cash - it.price > 300) { let slot = 0, max = -1; g.contracts.forEach((c, s) => { if (c && c.delivered > max) { max = c.delivered; slot = s; } }); g.buy(i, slot); } });
}

function runOne(seed, strat, cfg) {
  const g = new Game(Object.assign({ seed, perks: ['skip', 'insure'], insurer: 'sturdy', prep: true }, cfg || {}));
  let guard = 0;
  while (g.phase !== 'over' && g.phase !== 'win' && guard++ < 500) {
    if (g.phase === 'play') {
      // 보관 제안: 다음 턴 입고까지 넣어도 창고가 남으면 수락
      if (g.offer) { if (g.usedVolume() + g.offer.vol + nextVolume(g) <= g.warehouse.cap) g.acceptOffer(); else g.declineOffer(); }
      // 긴급 특송: 부패 직전·기한 임박 택배가 있으면 즉시 사용
      const b = STRATS[strat](g);
      if (!b) { const se = g.selfEligible().sort((a, b) => a.deadline - b.deadline).slice(0, g.selfCount()); g.wait(g.cash > 150 ? se.map(p => p.id) : []); } else g.callCarrier(b.i, b.ids, b.trucks);
    } else if (g.phase === 'summary') g.closeSummary();
    else if (g.phase === 'market') { marketBot(g); g.closeMarket(); }
  }
  return g;
}

module.exports = { runOne, STRATS };
function report(label, N, strat, cfg) {
  let wins = 0, cash = 0, calls = 0, waits = 0, stress = 0, rev = 0, months = 0;
  for (let s = 1; s <= N; s++) {
    const g = runOne(s, strat, cfg);
    if (g.phase === 'win') wins++;
    cash += g.cash; calls += g.run.calls; waits += g.run.waits; stress += g.stress; rev += g.run.revenue; months += (g.stats.monthsDone || 0) + (g.phase === 'win' ? 0 : g.turn / 10);
  }
  const mo = months / N;
  console.log(`${label.padEnd(14)} 생존 ${String(Math.round(wins / N * 100)).padStart(3)}%  평균개월 ${mo.toFixed(1)}  현금 ${(cash / N).toFixed(0).padStart(5)}  월호출 ${(calls / N / mo).toFixed(1)}  월대기 ${(waits / N / mo).toFixed(1)}  스트레스 ${(stress / N).toFixed(1)}  수익 ${(rev / N).toFixed(0)}`);
}
if (require.main === module) {
const N = +process.argv[2] || 200;
const mode = process.argv[3] || 'strats';
if (mode === 'companies') { for (const id of Object.keys(require('../www/js/meta.js').COMPANIES)) report(id, N, 'balanced', { company: id }); }
else if (mode === 'scenarios') { const M = require('../www/js/meta.js'); for (const id of Object.keys(M.SCENARIOS)) { if (id === 'endless') continue; report(id, N, 'balanced', { scenario: id, company: id === 'daily' ? 'local' : 'local', variants: id === 'daily' ? ['fog', 'trustboom'] : [] }); } }
else if (mode === 'difficulty') { for (const d of ['rookie', 'normal', 'veteran']) for (const sc of ['standard', 'peak', 'port']) report(`${d}/${sc}`, N, 'balanced', { scenario: sc, difficulty: d }); }
else for (const strat of Object.keys(STRATS)) {
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
