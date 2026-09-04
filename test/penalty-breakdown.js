const { runOne } = require('./sim.js');
const strat = process.argv[2] || 'balanced';
const counts = {}; let wins=0;
for (let s = 1; s <= 200; s++) {
  const g = runOne(s, strat); if (g.phase==='win') wins++;
  for (const l of g.log) { const mm = l.match(/페널티 \+\d+: (.*) \(스트레스/); if (mm) for (const r of mm[1].split(', ')) { const k = r.replace(/\d+/g, '#'); counts[k] = (counts[k] || 0) + 1; } }
  const s2 = g.log.find(l=>/정산/.test(l));
}
console.log(strat, 'wins', wins, counts);
