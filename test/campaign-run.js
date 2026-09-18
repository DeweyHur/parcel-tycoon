// 캠페인 전체 점검: node test/campaign-run.js [rookie|normal]
// 구현된 장을 처음부터 끝까지 이어서 굴린다 — 장이 끝나면 carryState() 를 다음 장에 그대로 넘긴다.
// 화면(ui.js) 없이 규칙만 확인한다: 판이 넘어가는가, 장마다 열리는 것이 맞는가, 반송·폐기가 안 나는가.
const { Game, DATA: D } = require('../www/js/game.js');
const I18n = require('../www/js/i18n.js'); globalThis.I18n = I18n; globalThis.DATA = D;
const Story = require('../www/js/story.js');
const LV = require('../www/js/levels.js');

const diff = process.argv[2] || 'rookie';
const fail = [], check = (ok, msg) => { console.log((ok ? '  ok ' : '  FAIL ') + msg); if (!ok) fail.push(msg); };

// 장마다 그 시점에 켜져 있어야 하는 것 (levels.js 의 grants 누적)
const EXPECT = {
  1: [],
  2: ['market', 'calls', 'simul'],
  3: ['market', 'calls', 'simul', 'trust', 'weather', 'theft', 'self'],
};

function bestCall(g) {
  let best = null;
  g.contracts.forEach((c, i) => {
    if (!g.canCall(c)) return;
    const elig = g.eligibleParcels(c);
    const sorted = elig.slice().sort((a, b) => (b.overdue - a.overdue) || a.deadline - b.deadline || b.size - a.size);
    const simul = Math.max(1, Math.min(g.simulMax(c), g.shows('calls') ? c.calls : 9));
    const r = g.autoPick(c, sorted, simul);
    if (!r.ids.length) return;
    const fill = r.vol / (g.vehicleCap(c) * r.trucks);
    const urgent = r.ids.map(id => g.parcels.find(p => p.id === id)).some(p => p.deadline <= 1 || p.overdue);
    if (!urgent && fill < 0.8) return;
    const score = (urgent ? 100 : 0) + fill * 10;
    if (!best || score > best.score) best = { i, r, fill, score };
  });
  return best;
}

function playLevel(n, carry) {
  const g = new Game({ scenario: 'quarter', company: 'local', perks: [], insurer: 'none', difficulty: diff,
    story: true, level: n, prep: false, carry: carry || null });
  const seen = new Set();
  const beats = ctx => { let b, k = 0; while ((b = Story.check(g, ctx)) && k++ < 10) seen.add(b.id); };
  beats({ kind: 'start' });
  let guard = 0;
  while (g.phase !== 'over' && g.phase !== 'win' && guard++ < 500) {
    if (g.phase === 'weekend') { beats({ kind: 'weekend' }); g.weekendChoose('rest'); g.takeEvents(); continue; }
    if (g.phase === 'summary') { beats({ kind: 'summary' }); g.closeSummary(); continue; }
    if (g.phase === 'market') {
      beats({ kind: 'market' });
      for (const c of g.contracts) if (c && g.shows('calls') && c.calls <= Math.max(1, Math.floor(c.maxCalls * 0.4))) {
        const price = g.refillPrice(c); if (g.cash >= price) g.refill(c.id);
      }
      let k = 0;
      while (k++ < 3) {
        const i = g.market.items.findIndex(it => !it.sold && it.kind !== 'refill' && !it.switchFrom && it.price <= g.cash - 500);
        if (i < 0) break;
        const it = g.market.items[i];
        const r = g.buy(i, it.kind === 'enh' ? g.contracts.findIndex(Boolean) : undefined);
        if (!r || !r.ok) break;
      }
      g.closeMarket(); continue;
    }
    if (g.phase !== 'play') break;
    if (process.env.TRACE) console.log(`  ${g.month}-${g.turn} 창고 ${g.usedVolume()}/${g.warehouse.cap}${g.outdoorVolume() ? ' 야외 ' + g.outdoorVolume() : ''} · 배차 ${g.contracts.filter(Boolean).map(c => c.calls + '/' + c.maxCalls).join(' ')} · 반송 ${g.stats.returned}`);
    const best = bestCall(g);
    if (best) { const r = g.callCarrier(best.i, best.r.ids, best.r.trucks); beats({ kind: 'call', result: r }); }
    else {
      // 차가 없으면 직접 나른다 (3장부터 열린다)
      let self = [];
      if (g.shows('self')) {
        const cand = g.parcels.filter(p => g.selfCan(p)).sort((a, b) => a.deadline - b.deadline);
        self = cand.slice(0, g.selfCount()).map(p => p.id);
      }
      g.wait(self); beats({ kind: 'turn' });
    }
    g.takeEvents();
  }
  return { g, seen: [...seen] };
}

let carry = null;
for (let n = 1; n <= LV.IMPLEMENTED; n++) {
  const lv = LV.get(n), name = I18n.t('lv.ch.' + n), sub = I18n.t('lv.sub.' + n);
  console.log(`\n■ ${name} · ${sub} (레벨 ${n})`);
  const { g, seen } = playLevel(n, carry);
  const on = LV.FLAGS.filter(f => g.shows(f));
  console.log(`  ${g.calMonth(1)}월–${g.calMonth(lv.cycles)}월 · 시작 자금 ${carry ? carry.cash : lv.company.cash}c · 창고 ${g.warehouse.cap}칸`);
  console.log(`  끝: ${g.phase} · 자금 ${g.cash}c · 처리 ${g.run.delivered}개 · 반송 ${g.stats.returned} 폐기 ${g.stats.discarded} 도난 ${g.stats.stolen}`);
  console.log(`  비트: ${seen.join(' ') || '(없음)'}`);
  check(g.phase === 'win', `${name} 완주`);
  check(g.stats.returned === 0 && g.stats.discarded === 0, `${name} 반송·폐기 0 (반송 ${g.stats.returned} 폐기 ${g.stats.discarded})`);
  check(g.cash > 0, `${name} 흑자로 끝난다 — ${g.cash}c`);
  check(on.join() === EXPECT[n].join(), `${name} 에 열린 기능이 맞다 — ${on.join(',') || '(없음)'}`);
  // 안 연 품목은 아예 오지 않는다
  const types = [...new Set(g.schedule.flat().map(s => s.type))];
  const bad = types.filter(t => (t === 'fresh' && !g.shows('cold')) || (t === 'frozen' && !g.shows('frozen'))
    || (['fragile', 'produce', 'intl', 'large'].includes(t) && !g.shows('attrs')));
  check(bad.length === 0, `${name} 입고에 안 연 품목이 없다 — ${types.join(',')}`);

  const next = g.carryState();
  if (carry) {
    check(next.contracts.length >= carry.contracts.length, `${name} 계약이 그대로 이어졌다`);
    check(next.seen.length >= carry.seen.length, `${name} 본 대사가 이어졌다 — ${next.seen.length}개`);
  }
  carry = next;
}
console.log(fail.length ? `\n실패 ${fail.length}건` : '\n전부 통과');
process.exit(fail.length ? 1 : 0);
