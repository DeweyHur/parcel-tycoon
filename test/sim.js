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
  // 용량 기준 구매: 다음 달 예상 물량(칸) vs 월 배차 용량(대수×칸). 모자라면 배차 추가·한도 강화·업그레이드·새 계약 순으로 채우고,
  // 창고가 턴당 입고를 못 받으면 확장. 남는 돈은 시설·강화. 예비금 100c.
  const items = g.market.items, reserve = 100;
  const fc = g.customerForecast(); const parcels = fc.reduce((s, f) => s + (f.min + f.max) / 2, 0);
  const needVol = parcels * 1.7 * 1.15;
  const capVol = () => g.contracts.filter(Boolean).reduce((s, c) => s + c.maxCalls * g.vehicleCap(c), 0);
  const can = price => g.cash - price >= reserve && g.market.bought < g.rules.marketMaxBuy;
  const bySlotDelivered = () => { let slot = -1, max = -1; g.contracts.forEach((c, s) => { if (c && c.delivered > max) { max = c.delivered; slot = s; } }); return slot; };
  const idx = pred => items.findIndex(it => !it.sold && pred(it));
  // 1) 막힌 속성 힌트 계약은 항상 최우선 (빈 슬롯 → 가장 덜 쓴 슬롯)
  for (let i = 0; i < items.length; i++) { const it = items[i]; if (it.sold || it.kind !== 'contract' || !it.hint) continue; const price = g.contractPrice(it); if (!can(price)) continue; let slot = g.contracts.findIndex(c => !c); if (slot < 0) { const seen = {}; g.contracts.forEach((c, s) => { if (!c) return; if (seen[c.carrier] != null) slot = s; seen[c.carrier] = s; }); } if (slot >= 0) g.buy(i, slot); }
  // 2) 용량 부족분 채우기
  let guard = 0;
  while (capVol() < needVol && guard++ < 6) {
    // 배차 추가: 살 수 있는 것 중 월 배차가 가장 적은 계약부터 (고르게 키운다)
    const adds = items.map((it, i) => ({ it, i })).filter(x => !x.it.sold && x.it.kind === 'contract' && x.it.add && can(g.contractPrice(x.it)));
    if (adds.length) { adds.sort((a, b) => { const ca = g.contracts.find(c => c && c.carrier === a.it.carrier), cb = g.contracts.find(c => c && c.carrier === b.it.carrier); return (ca ? ca.maxCalls * g.vehicleCap(ca) : 99) - (cb ? cb.maxCalls * g.vehicleCap(cb) : 99); }); const { it, i } = adds[0]; g.buy(i, g.contracts.findIndex(c => c && c.carrier === it.carrier), 'add'); continue; }
    let i = -1;
    i = idx(it => it.kind === 'enh' && /^limit/.test(it.enh) && can(it.price));
    if (i >= 0) { const s = bySlotDelivered(); if (s >= 0 && g.buy(i, s).ok) continue; }
    i = idx(it => it.kind === 'contract' && it.upgrade && can(g.contractPrice(it)));
    if (i >= 0) { g.buy(i, g.contracts.findIndex(c => c && c.carrier === items[i].carrier), 'upgrade'); continue; }
    i = idx(it => it.kind === 'contract' && !it.upgrade && !it.add && can(g.contractPrice(it)));
    const empty = g.contracts.findIndex(c => !c);
    if (i >= 0 && empty >= 0) { g.buy(i, empty); continue; }
    i = idx(it => it.kind === 'enh' && it.enh === 'cap1' && can(it.price));
    if (i >= 0) { const s = bySlotDelivered(); if (s >= 0 && g.buy(i, s).ok) continue; }
    break;
  }
  // 3) 창고: 턴당 입고(2턴치)를 못 받으면 확장
  const perTurn = parcels / D.TURNS_PER_MONTH * 1.7;
  while (g.warehouse.cap < perTurn * 3) { const i = idx(it => it.kind === 'fac' && it.fac && /^expand/.test(it.fac) && can(it.price)); if (i < 0 || !g.buy(i, null).ok) break; }
  // 4) 여유 자금: 시설 → 업그레이드 → 강화
  items.forEach((it, i) => { if (!it.sold && it.kind === 'fac' && it.fac && g.cash - it.price > reserve + 200 && g.market.bought < g.rules.marketMaxBuy) g.buy(i, null); });
  items.forEach((it, i) => { if (!it.sold && it.kind === 'contract' && it.upgrade && g.cash - g.contractPrice(it) > reserve + 250 && g.market.bought < g.rules.marketMaxBuy) g.buy(i, g.contracts.findIndex(c => c && c.carrier === it.carrier), 'upgrade'); });
  items.forEach((it, i) => { if (!it.sold && it.kind === 'enh' && g.cash - it.price > reserve + 300 && g.market.bought < g.rules.marketMaxBuy) { const s = bySlotDelivered(); if (s >= 0) g.buy(i, s); } });
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

module.exports = { runOne, STRATS, marketBot };
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
