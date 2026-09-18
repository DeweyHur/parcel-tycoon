// 캠페인 레벨 점검: node test/level-run.js [레벨] [rookie|normal]
// 레벨 런을 사람처럼(차가 차면 호출, 급하면 덜 차도 호출) 굴려 보고 턴마다 창고·자금을 찍는다.
// 레벨 1은 실패가 없어야 한다 — 반송·폐기 0, 자금 흑자, 4사이클 완주.
const { Game, DATA: D } = require('../www/js/game.js');
const I18n = require('../www/js/i18n.js'); globalThis.I18n = I18n; globalThis.DATA = D;
const Story = require('../www/js/story.js');
const LV = require('../www/js/levels.js');

const level = +process.argv[2] || 1, diff = process.argv[3] || 'rookie';
const g = new Game({ scenario: 'quarter', company: 'local', perks: [], insurer: 'none', difficulty: diff, story: true, level, prep: false });
const hit = {}; const note = k => { hit[k] = (hit[k] || 0) + 1; };
function beats(ctx) { let b, n = 0; while ((b = Story.check(g, ctx)) && n++ < 10) note('beat:' + b.id); }

function bestCall() {
  let best = null;
  g.contracts.forEach((c, i) => {
    if (!g.canCall(c)) return;
    const elig = g.eligibleParcels(c);
    const sorted = elig.slice().sort((a, b) => (b.overdue - a.overdue) || a.deadline - b.deadline || b.size - a.size);
    const simul = Math.max(1, Math.min(g.simulMax(c), g.shows('calls') ? c.calls : 9));
    const r = g.autoPick(c, sorted, simul);
    if (!r.ids.length) return;
    const vcap = g.vehicleCap(c), fill = r.vol / (vcap * r.trucks);
    const picked = r.ids.map(id => g.parcels.find(p => p.id === id));
    const urgent = picked.some(p => p.deadline <= 1 || p.overdue);
    if (!urgent && fill < 0.8) return;
    if (!best || (urgent ? 100 : 0) + fill * 10 > best.score) best = { i, c, r, fill, trucks: r.trucks, score: (urgent ? 100 : 0) + fill * 10 };
  });
  return best;
}

console.log(`레벨 ${level} · 난이도 ${diff} · 시드 ${g.seed} · ${g.rules.months}사이클 · 시작 자금 ${g.cash}c · 창고 ${g.warehouse.cap}칸`);
console.log(`켜진 기능: ${LV.FLAGS.filter(f => g.shows(f)).join(', ') || '(없음)'}`);
beats({ kind: 'start' });
let guard = 0;
while (g.phase !== 'over' && g.phase !== 'win' && guard++ < 400) {
  if (g.phase === 'weekend') { beats({ kind: 'weekend' }); g.weekendChoose('rest'); g.takeEvents(); continue; }
  if (g.phase === 'summary') {
    const s = g.summary;
    console.log(`— ${g.cycleLabel ? g.cycleLabel() : g.month} 정산: 순익 ${s.net >= 0 ? '+' : ''}${s.net}c · 자금 ${g.cash}c · 반송 ${g.stats.returned} 폐기 ${g.stats.discarded} 기한초과 ${g.monthStats.overdue}`);
    beats({ kind: 'summary' }); g.closeSummary(); continue;
  }
  if (g.phase === 'market') {
    beats({ kind: 'market' });
    // 사람처럼: 배차가 바닥난 계약을 먼저 채우고, 돈이 남으면 한도 강화 → 창고 확장 순으로 산다
    // 사람은 0이 될 때까지 기다리지 않는다 — 한 사이클을 못 돌 것 같으면 채운다
    for (const c of g.contracts) if (c && g.shows('calls') && c.calls <= Math.max(1, Math.floor(c.maxCalls * 0.4))) {
      const price = g.refillPrice(c);
      if (g.cash >= price) { g.refill(c.id); console.log(`  [마켓] 배차 충전 ${D.CARRIERS[c.carrier].name} -${price}c → ${c.calls}대`); }
    }
    let n = 0;
    while (n++ < 3) {
      const i = g.market.items.findIndex(it => !it.sold && it.kind !== 'refill' && it.price <= g.cash - 400);
      if (i < 0) break;
      const it = g.market.items[i], r = g.buy(i, it.kind === 'enh' ? g.contracts.findIndex(Boolean) : undefined);
      if (!r || !r.ok) break;
      console.log(`  [마켓] ${it.name || it.kind} 구매 -${it.price}c`);
    }
    g.closeMarket(); continue;
  }
  if (g.phase !== 'play') break;
  const m = g.month, t = g.turn;
  const arrived = (g.schedule[t - 1] || []).map(s => s.type + s.size).join(',');
  const line = `${m}-${t} 입고[${arrived}] 창고 ${g.usedVolume()}/${g.warehouse.cap}${g.outdoorVolume() ? ` 야외 ${g.outdoorVolume()}` : ''}`;
  const best = bestCall();
  if (best) {
    const r = g.callCarrier(best.i, best.r.ids, best.trucks);
    console.log(`${line} → 호출 ${best.trucks}대 ${Math.round(best.fill * 100)}% (+${r.revenue}c -${r.fee}c)`);
    beats({ kind: 'call', result: r });
  } else { g.wait(); console.log(`${line} → 대기`); beats({ kind: 'turn' }); }
  g.takeEvents();
}
console.log(`\n끝: phase ${g.phase} · ${g.month}사이클 ${g.turn}일차 · 자금 ${g.cash}c · 반송 ${g.stats.returned} 폐기 ${g.stats.discarded} 도난 ${g.stats.stolen} · 처리 ${g.run.delivered}개`);
console.log('나온 비트:', Object.keys(hit).filter(k => k.startsWith('beat:')).map(k => k.slice(5)).join(' ') || '(없음)');
