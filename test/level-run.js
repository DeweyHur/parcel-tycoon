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
      for (const c of g.contracts) if (c && g.shows('calls') && c.calls <= Math.max(1, Math.floor(c.maxCalls * 0.4))) {
        const price = g.refillPrice(c); if (g.cash >= price) g.refill(c.id);
      }
      // 사람처럼: 못 싣는 품목을 푸는 계약을 먼저, 그다음 시설·강화
      const blocked = new Set(g.blockedTypes().map(b => b.type));
      if (process.env.TRACE) console.log(`  [마켓 ${g.month}] 막힘 ${[...blocked].join(',') || '-'} · 매물 ${g.market.items.map(it => (it.name || it.kind)).join(' | ')}`);
      const slotFor = it => {
        if (it.kind === 'contract') { const e = g.contracts.findIndex(c => !c); return e >= 0 ? e : g.contracts.findIndex(Boolean); }
        if (it.kind === 'enh') return g.contracts.findIndex(Boolean);
        return undefined;
      };
      const want = it => {
        if (it.sold || it.kind === 'refill' || it.switchFrom) return -1;
        if (it.price > g.cash - 700) return -1;
        if (it.kind === 'contract') return blocked.size ? 0 : 3;     // 막힌 게 있으면 계약이 최우선
        if (it.kind === 'fac' && /^cold|^freezer/.test(it.fac || '')) return g.warehouse.cold < 8 ? 1 : 4;
        if (it.kind === 'fac') return 2;
        return 3;
      };
      let k = 0;
      while (k++ < 4) {
        let bi = -1, bw = 9;
        g.market.items.forEach((it, i) => { const w = want(it); if (w >= 0 && w < bw) { bw = w; bi = i; } });
        if (bi < 0) break;
        const it = g.market.items[bi];
        const r = g.buy(bi, slotFor(it));
        if (!r || !r.ok) { it.sold = true; continue; }               // 못 사면 건너뛴다
        if (process.env.TRACE) console.log(`  [마켓] ${it.name || it.kind} -${it.price}c`);
      }
    g.closeMarket(); continue;
  }
  if (g.phase !== 'play') break;
  const m = g.month, t = g.turn;
  const arrived = (g.schedule[t - 1] || []).map(s => s.type + s.size).join(',');
  const line = `${m}-${t} 입고[${arrived}] 창고 ${g.usedVolume()}/${g.warehouse.cap}${g.outdoorVolume() ? ` 야외 ${g.outdoorVolume()}` : ''}`;
  // 한 턴에 계약 하나만 부르는 게 아니다 — 부를 만한 계약은 다 부른다 (사람이 그렇게 한다)
  let called = 0, best, log = [];
  while ((best = bestCall()) && called++ < 4) {
    const r = g.callCarrier(best.i, best.r.ids, best.trucks);
    log.push(`${best.trucks}대 ${Math.round(best.fill * 100)}%`);
    beats({ kind: 'call', result: r });
  }
  if (called) { console.log(`${line} → 호출 ${log.join(' + ')}`); } else {
    let self = [];
    if (g.shows('self')) self = g.parcels.filter(p => g.selfCan(p)).sort((a, b) => a.deadline - b.deadline).slice(0, g.selfCount()).map(p => p.id);
    g.wait(self); console.log(`${line} → 대기${self.length ? ' (직접 ' + self.length + ')' : ''}`); beats({ kind: 'turn' });
  }
  g.takeEvents();
}
console.log(`\n끝: phase ${g.phase} · ${g.month}사이클 ${g.turn}일차 · 자금 ${g.cash}c · 반송 ${g.stats.returned} 폐기 ${g.stats.discarded} 도난 ${g.stats.stolen} · 처리 ${g.run.delivered}개`);
console.log('나온 비트:', Object.keys(hit).filter(k => k.startsWith('beat:')).map(k => k.slice(5)).join(' ') || '(없음)');
