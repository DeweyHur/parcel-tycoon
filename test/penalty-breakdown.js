const { runOne } = require('./sim.js');
const strat = process.argv[2] || 'balanced';
const counts = {}; let wins=0;
for (let s = 1; s <= 200; s++) {
  const g = runOne(s, strat); if (g.phase==='win') wins++;
  // 로그는 {k, p} 메시지 객체 — 페널티 사유는 키로 집계한다
  for (const l of g.log) if (l && l.k === 'log.penalty') for (const r of l.p.reasons) counts[r.k] = (counts[r.k] || 0) + 1;
}
console.log(strat, 'wins', wins, counts);
