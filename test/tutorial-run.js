// 튜토리얼 대본 점검: node test/tutorial-run.js [rookie|normal]
// 「인수인계」 런(분기 6사이클 = 3개월)을 사람처럼(꽉 차면 호출, 급하면 그냥 호출) 굴려 보고
// 턴마다 창고·배차·자금과, 창고장이 짚어 줘야 하는 상황(2대 동시·배차 0·야외 적재)이 실제로 오는지 찍는다.
const { Game, DATA: D } = require('../www/js/game.js');
const I18n = require('../www/js/i18n.js'); globalThis.I18n = I18n; globalThis.DATA = D;
const Story = require('../www/js/story.js');
const TUT = require('../www/js/tutorial.js');

const diff = process.argv[2] || 'rookie';
const g = new Game({ scenario: 'quarter', company: 'local', perks: [], insurer: 'none', difficulty: diff, story: true, scripted: true, prep: false });
const hit = {};   // 창고장이 말해야 하는 상황이 실제로 왔는지
const note = k => { hit[k] = (hit[k] || 0) + 1; };

function beats(ctx) { let b, n = 0; while ((b = Story.check(g, ctx)) && n++ < 4) note('beat:' + b.id); }

function bestCall() {
  let best = null;
  g.contracts.forEach((c, i) => {
    if (!g.canCall(c)) return;
    const elig = g.eligibleParcels(c);
    const sorted = elig.slice().sort((a, b) => (b.overdue - a.overdue) || a.deadline - b.deadline || b.size - a.size);
    const simul = Math.min(g.simulMax(c), c.calls);
    const r = g.autoPick(c, sorted, simul);
    if (!r.ids.length) return;
    const vcap = g.vehicleCap(c), fill = r.vol / (vcap * r.trucks);
    const picked = r.ids.map(id => g.parcels.find(p => p.id === id));
    const urgent = picked.some(p => p.deadline <= 1 || p.overdue || (p.attrs.includes('cold') && !p.inCold));
    if (!urgent && fill < 0.8) return;
    const score = (urgent ? 100 : 0) + fill * 10;
    if (!best || score > best.score) best = { i, c, r, fill, trucks: r.trucks, score };
  });
  return best;
}

function market() {
  const mk = g.market, items = mk.items;
  const line = items.map(it => `${it.kind}:${it.carrier || it.enh || it.fac || it.item || it.customer || ''}${it.kind === 'refill' ? '' : '(' + (it.kind === 'contract' ? g.contractPrice(it) : it.price) + 'c)'}`).join(' ');
  console.log(`  [마켓 ${mk.month}] 자금 ${g.cash}c · 매물: ${line}`);
  // 배차가 바닥난 계약은 충전, 남으면 한도 강화 → 상위 센터 순
  for (let k = 0; k < 4; k++) {
    const i = items.findIndex(it => !it.sold && it.kind === 'refill' && (c => c && c.calls <= Math.max(1, c.maxCalls * 0.4))(g.contracts.find(c => c && c.id === it.contractId)));
    if (i < 0) break; const r = g.buy(i, null); if (!r.ok) break; console.log(`    ↳ 충전 ${items[i].name} ${items[i].price}c`);
  }
  const ci = items.findIndex(it => !it.sold && it.kind === 'contract' && it.switchFrom && g.cash - g.contractPrice(it) > 250);
  if (ci >= 0) { const s = g.contracts.findIndex(c => c && c.id === items[ci].switchFrom); const r = g.buy(ci, s); if (r.ok) console.log(`    ↳ 갈아타기 ${items[ci].name}`); }
  console.log(`    → 남은 자금 ${g.cash}c · 계약 ${g.contracts.filter(Boolean).map(c => `${c.carrier} ${c.calls}/${c.maxCalls}`).join(', ')}`);
  g.closeMarket();
}

console.log(`난이도 ${diff} · 시드 ${g.seed} · 시작 자금 ${g.cash}c`);
beats({ kind: 'start' });
let guard = 0;
while (g.month <= (TUT.CYCLES || 6) && guard++ < 300) {
  if (g.phase === 'summary') {
    const s = g.summary;
    console.log(`— ${g.month}개월차 정산: 순익 ${s.net >= 0 ? '+' : ''}${s.net}c · 자금 ${g.cash}c · 평판 ${g.rep}/${g.repCap()} · 반송 ${g.stats.returned} 도난 ${g.stats.stolen} 파손 ${g.stats.broken} 폐기 ${g.stats.discarded}`);
    beats({ kind: 'summary' }); g.closeSummary(); continue;
  }
  if (g.phase === 'market') { beats({ kind: 'market' }); market(); beats({ kind: 'turn' }); continue; }
  // 주말은 턴이 아니다 — 마당에 물건이 있고 자금이 넉넉하면 알바, 아니면 휴식
  if (g.phase === 'weekend') {
    const w = g.weekend; beats({ kind: 'weekend' });
    const o = g.weekendChoices().find(x => x.id === 'parttime');
    const pick = o && o.ok && g.cash > o.cost + 300 ? 'parttime' : 'rest';
    g.weekendChoose(pick);
    console.log(`${g.month}-${w.after} 일요일(${w.week}주차) → ${pick}${w.outdoor ? ` · 야외 ${w.outdoor}칸` : ''}`);
    g.takeEvents(); continue;
  }
  if (g.phase !== 'play') break;
  const m = g.month, t = g.turn;
  const arrived = (g.schedule[t - 1] || []).map(s => s.type + s.size).join(',');
  const before = `${m}-${t} 입고[${arrived}] 창고 ${g.usedVolume()}/${g.warehouse.cap}${g.outdoorVolume() ? ` 야외 ${g.outdoorVolume()}` : ''}`;
  if (g.outdoorVolume() > 0) note('야외 적재');
  if (g.contracts.some(c => c && c.calls === 0)) note('배차 0');
  const best = bestCall();
  if (best) {
    const simul = Math.min(g.simulMax(best.c), best.c.calls);
    if (simul > 1 && best.r.vol > g.vehicleCap(best.c)) note('2대 동시 호출');
    const r = g.callCarrier(best.i, best.r.ids, best.trucks);
    console.log(`${before} → 호출 ${best.c.carrier} ${best.trucks}대 ${Math.round(best.fill * 100)}% (+${r.revenue}c -${r.fee}c) 남은배차 ${best.c.calls}`);
    beats({ kind: 'call', result: r });
  } else {
    g.wait();
    console.log(`${before} → 대기`);
    beats({ kind: 'turn' });
  }
  g.takeEvents();
}
console.log('\n상황 발생:', Object.keys(hit).filter(k => !k.startsWith('beat:')).join(', ') || '없음');
console.log('나온 비트:', Object.keys(hit).filter(k => k.startsWith('beat:')).map(k => k.slice(5)).join(' '));
console.log(`끝: ${g.month}개월차 ${g.turn}턴 · phase ${g.phase} · 자금 ${g.cash}c · 평판 ${g.rep}/${g.repCap()} · 반송 ${g.stats.returned} 폐기 ${g.stats.discarded}`);
