// 캠페인 전체 점검: node test/campaign-run.js [rookie|normal]
// 구현된 장을 처음부터 끝까지 이어서 굴린다 — 장이 끝나면 carryState() 를 다음 장에 그대로 넘긴다.
// 화면(ui.js) 없이 규칙만 확인한다: 판이 넘어가는가, 장마다 열리는 것이 맞는가, 반송·폐기가 안 나는가.
const { Game, DATA: D } = require('../www/js/game.js');
const I18n = require('../www/js/i18n.js'); globalThis.I18n = I18n; globalThis.DATA = D;
const Story = require('../www/js/story.js');
const LV = require('../www/js/levels.js');

const diff = process.argv[2] || 'rookie';
const fail = [], check = (ok, msg) => { console.log((ok ? '  ok ' : '  FAIL ') + msg); if (!ok) fail.push(msg); };

// 장마다 그 시점에 켜져 있어야 하는 것 = levels.js 의 grants 누적 (표를 두 벌 두지 않는다)
const expectAt = n => LV.FLAGS.filter(f => LV.showsAt(n).has(f));

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
    // 꽉 채워 보내는 게 원칙이지만, 연휴 직전이거나 창고가 넘쳤으면 덜 차도 보낸다 (사람이 그렇게 한다)
    const soon = [1, 2].some(d => g.isOffTurn && g.isOffTurn(g.turn + d));
    const over = g.usedVolume() > g.warehouse.cap;
    if (!urgent && !soon && !over && fill < 0.8) return;
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
      // 사람처럼: 못 싣는 품목을 푸는 계약을 먼저, 그다음 시설·강화
      const blocked = new Set(g.blockedTypes().map(b => b.type));
      const blockedAttrs = new Set(g.blockedTypes().flatMap(b => D.PARCEL_TYPES[b.type].attrs));
      if (process.env.TRACE) console.log(`  [마켓 ${g.month}] 막힘 ${[...blocked].join(',') || '-'} · 매물 ${g.market.items.map(it => (it.name || it.kind)).join(' | ')}`);
      // 계약은 **빈 슬롯에만** 넣는다 — 꽉 찬 슬롯에 밀어 넣으면 쓰던 계약이 날아간다(봇이 그러다 주력을 잃었다)
      const emptySlot = () => g.contracts.slice(0, g.visibleSlots()).findIndex(c => !c);
      const slotFor = it => {
        if (it.kind === 'contract') return emptySlot();
        if (it.kind === 'enh') return g.contracts.findIndex(Boolean);
        return undefined;
      };
      const want = it => {
        if (it.sold || it.kind === 'refill' || it.switchFrom) return -1;
        if (it.price > g.cash - 700) return -1;
        if (it.kind === 'contract') {
          if (emptySlot() < 0) return -1;                             // 넣을 자리가 없으면 안 산다
          return blocked.size ? 0 : 2;                                // 막힌 게 있으면 최우선, 아니면 한 대 더
        }
        // 슬롯이 꽉 찼을 때 막힌 속성을 푸는 길 — 특약은 기존 계약에 붙으니 자리를 안 먹는다
        if (it.kind === 'enh') {
          const e = D.ENHANCEMENTS[it.enh];
          if (e && e.kind === 'opt') return blockedAttrs.has(e.attr) ? 0 : -1;
        }
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
        // 강화·특약은 붙일 수 있는 계약을 찾아 가며 시도한다 (용달 계열은 특약이 안 붙는다)
        const targets = it.kind === 'enh' ? g.contracts.map((c, i) => c ? i : -1).filter(i => i >= 0) : [slotFor(it)];
        let r = null;
        for (const t of targets) { r = g.buy(bi, t); if (r && r.ok) break; }
        if (!r || !r.ok) { it.sold = true; continue; }               // 아무 데도 못 붙이면 건너뛴다
        if (process.env.TRACE) console.log(`  [마켓] ${it.name || it.kind} -${it.price}c`);
      }
      g.closeMarket(); continue;
    }
    if (g.phase !== 'play') break;
    if (process.env.TRACE && g.unhandled().length) console.log(`  !! ${g.month}-${g.turn} 실을 차 없음 ${g.unhandled().map(p => p.type + p.size).join(',')}`);
    if (process.env.TRACE) console.log(`  ${g.month}-${g.turn} 창고 ${g.usedVolume()}/${g.warehouse.cap}${g.outdoorVolume() ? ' 야외 ' + g.outdoorVolume() : ''} · 배차 ${g.contracts.filter(Boolean).map(c => c.calls + '/' + c.maxCalls).join(' ')} · 반송 ${g.stats.returned}`);
    // 한 턴에 계약 하나만 부르는 게 아니다 — 부를 만한 계약은 다 부른다 (사람이 그렇게 한다)
    let called = 0, best;
    while ((best = bestCall(g)) && called++ < 4) { const r = g.callCarrier(best.i, best.r.ids, best.r.trucks); beats({ kind: 'call', result: r }); }
    if (!called) {
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

let carry = null, deal = null;
for (let n = 1; n <= LV.IMPLEMENTED; n++) {
  const lv = LV.get(n), name = I18n.t('lv.ch.' + n), sub = I18n.t('lv.sub.' + n);
  console.log(`\n■ ${name} · ${sub} (레벨 ${n})`);
  const { g, seen } = playLevel(n, carry);
  const on = LV.FLAGS.filter(f => g.shows(f));
  console.log(`  ${g.calMonth(1)}월–${g.calMonth(lv.cycles)}월 · 시작 자금 ${carry ? carry.cash : lv.company.cash}c · 창고 ${g.warehouse.cap}칸`);
  console.log(`  끝: ${g.phase} · 자금 ${g.cash}c · 처리 ${g.run.delivered}개 · 반송 ${g.stats.returned} 폐기 ${g.stats.discarded} 도난 ${g.stats.stolen}`);
  console.log(`  비트: ${seen.join(' ') || '(없음)'}`);
  check(g.phase === 'win', `${name} 완주`);
  // 앞 장은 배우는 자리라 사고가 0이어야 한다. 뒤 두 장은 한 해의 성수기라 봇 기준 상한만 본다
  // (사람은 비트가 알려 주는 대로 연휴 전에 비우면 훨씬 낫다)
  const cap = n === LV.LAST ? 35 : n === LV.LAST - 1 ? 5 : 0;
  const lost = g.stats.returned + g.stats.discarded;
  check(lost <= cap, `${name} 사고 ${cap === 0 ? '0' : cap + ' 이하'} (반송 ${g.stats.returned} 폐기 ${g.stats.discarded})`);
  check(g.cash > 0, `${name} 흑자로 끝난다 — ${g.cash}c`);
  check(on.join() === expectAt(n).join(), `${name} 에 열린 기능이 맞다 — ${on.join(',') || '(없음)'}`);
  // 안 연 품목은 아예 오지 않는다
  const types = [...new Set(g.schedule.flat().map(s => s.type))];
  const bad = types.filter(t => (t === 'fresh' && !g.shows('cold')) || (t === 'frozen' && !g.shows('frozen'))
    || (['fragile', 'produce', 'intl', 'large'].includes(t) && !g.shows('attrs')));
  check(bad.length === 0, `${name} 입고에 안 연 품목이 없다 — ${types.join(',')}`);

  // 장이 끝나면 잔금을 한 회차 낸다 (ui.js 의 showInstalment 와 같은 계산)
  const next = g.carryState();
  if (n === 1) { const down = Math.max(0, Math.min(LV.DEAL.price, Math.floor(next.cash * LV.DEAL.downRate)));
    deal = { price: LV.DEAL.price, paid: down, rest: LV.DEAL.price - down }; next.cash -= down;
    console.log(`  가계약: 값 ${deal.price}c · 계약금 ${down}c · 잔금 ${deal.rest}c → 다음 장 시작 ${next.cash}c`);
  } else if (deal && deal.rest > 0) {
    const due = LV.dueAt(n, deal.rest), pay = Math.min(due, next.cash), short = due - pay;
    deal = { price: deal.price, paid: deal.paid + pay, rest: deal.rest - pay }; next.cash -= pay;
    console.log(`  잔금 ${n === LV.LAST ? '완납' : '회차'}: ${due}c 중 ${pay}c${short ? ` (모자람 ${short}c)` : ''} · 남은 잔금 ${deal.rest}c → ${next.cash}c`);
    if (n === LV.LAST) check(deal.rest === 0, `마지막 장에서 잔금을 다 치른다 — 남은 ${deal.rest}c`);
  }
  if (carry) {
    check(next.contracts.length >= carry.contracts.length, `${name} 계약이 그대로 이어졌다`);
    check(next.seen.length >= carry.seen.length, `${name} 본 대사가 이어졌다 — ${next.seen.length}개`);
  }
  carry = next;
}
console.log(fail.length ? `\n실패 ${fail.length}건` : '\n전부 통과');
process.exit(fail.length ? 1 : 0);
