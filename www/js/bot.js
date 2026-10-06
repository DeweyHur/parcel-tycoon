// 봇 — 브라우저/Node 공용 (test/sim.js 가 여기서 가져다 쓴다)
// 개인 런 시뮬레이터의 전략(greedy·balanced·saver·waiter)과 마켓 봇, 그리고 멀티 「난투」의 상대 봇(장 보기·퍽 3택1).
// DOM·Node API 에 기대지 않는다 — Game 의 공개 API 만 부른다.
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;
  const M = typeof module !== 'undefined' ? require('./meta.js') : root.META;

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
        for (const p of sorted) { if (vol + p.size <= cap && g.packTrucks(c, pick.concat([p])).length <= trucks) { pick.push(p); vol += p.size; } }   // 택배는 통째로 — 차에 걸쳐 실리지 않는다
        if (trucks > 1 && g.maxTrucks && g.maxTrucks(c, pick) < trucks) continue;   // 거인 두 번째 차는 대형을 실을 때만
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
    const needVol = parcels * 1.7 * 1.3;
    const capVol = () => g.contracts.filter(Boolean).reduce((s, c) => s + c.maxCalls * g.vehicleCap(c), 0);
    const can = price => g.cash - price >= reserve && (!g.rules.marketMaxBuy || (g.market.bought || 0) < g.rules.marketMaxBuy);
    const canR = price => g.cash - price >= reserve;
    const bySlotDelivered = () => { let slot = -1, max = -1; g.contracts.forEach((c, s) => { if (c && c.delivered > max) { max = c.delivered; slot = s; } }); return slot; };
    const idx = pred => items.findIndex(it => !it.sold && pred(it));
    // 1) 막힌 속성 힌트 계약은 항상 최우선 (빈 슬롯 → 가장 덜 쓴 슬롯)
    for (let i = 0; i < items.length; i++) { const it = items[i]; if (it.sold || it.kind !== 'contract' || !it.hint) continue; const price = g.contractPrice(it); if (!can(price)) continue; let slot = it.switchFrom ? g.contracts.findIndex(c => c && c.id === it.switchFrom) : g.contracts.findIndex(c => !c); if (slot < 0) { const seen = {}; g.contracts.forEach((c, s) => { if (!c) return; const f = D.familyOf(c.carrier); if (seen[f] != null) slot = s; seen[f] = s; }); } if (slot >= 0) g.buy(i, slot); }
    // 1.5) 배차 충전: 배차가 절반 이하로 남은 계약은 가득 충전 (남은 배차가 많으면 아까우니 미룬다). 0대는 무조건
    for (let k = 0; k < 4; k++) { const rf = items.map((it, i) => ({ it, i })).filter(x => !x.it.sold && x.it.kind === 'refill').map(x => ({ ...x, c: g.contracts.find(c => c && c.id === x.it.contractId) })).filter(x => x.c && (x.c.calls === 0 || x.c.calls <= x.c.maxCalls * 0.75) && canR(x.it.price)); if (!rf.length) break; rf.sort((a, b) => a.c.calls - b.c.calls); if (!g.buy(rf[0].i, null).ok) break; }
    // 2) 용량 부족분 채우기: 한도 강화 → 같은 계열 상위 센터로 갈아타기 → 빈 슬롯에 새 계약 → 적재 보강
    let guard = 0;
    const monthCap = () => g.contracts.filter(Boolean).reduce((s, c) => s + c.calls * g.vehicleCap(c), 0);
    while (monthCap() < needVol && guard++ < 6) {
      let i = -1;
      i = idx(it => it.kind === 'enh' && /^limit/.test(it.enh) && can(it.price));
      if (i >= 0) { const s = bySlotDelivered(); if (s >= 0 && g.buy(i, s).ok) continue; }
      i = idx(it => it.kind === 'contract' && it.switchFrom && can(g.contractPrice(it)));
      if (i >= 0) { const s = g.contracts.findIndex(c => c && c.id === items[i].switchFrom); if (s >= 0 && g.buy(i, s).ok) continue; }
      i = idx(it => it.kind === 'contract' && !it.switchFrom && can(g.contractPrice(it)));
      const empty = g.contracts.findIndex(c => !c);
      if (i >= 0 && empty >= 0) { g.buy(i, empty); continue; }
      i = idx(it => it.kind === 'enh' && it.enh === 'cap1' && can(it.price));
      if (i >= 0) { const s = bySlotDelivered(); if (s >= 0 && g.buy(i, s).ok) continue; }
      break;
    }
    // 3) 창고: 턴당 입고(2턴치)를 못 받으면 확장
    const perTurn = parcels / (g.turns() || D.TURNS_PER_MONTH) * 1.7;
    while (g.warehouse.cap < perTurn * 5) { const i = idx(it => it.kind === 'fac' && it.fac && /^expand/.test(it.fac) && can(it.price)); if (i < 0 || !g.buy(i, null).ok) break; }
    // 4) 새 고객: 자리가 남고 자금이 넉넉하면 데려온다 (평판 등급이 열어 준 고객)
    items.forEach((it, i) => { if (!it.sold && it.kind === 'deal') g.buy(i, null); });   // 기업 계약 제안서: 서명은 공짜 — 받을 수 있으면 받는다
    items.forEach((it, i) => { if (!it.sold && it.kind === 'customer' && g.cash - it.price > reserve + 300 && (!g.rules.marketMaxBuy || (g.market.bought || 0) < g.rules.marketMaxBuy)) g.buy(i, null); });
    // 5) 여유 자금: 시설 → 업그레이드 → 강화
    items.forEach((it, i) => { if (!it.sold && it.kind === 'fac' && it.fac && g.cash - it.price > reserve + 200 && (!g.rules.marketMaxBuy || (g.market.bought || 0) < g.rules.marketMaxBuy)) g.buy(i, null); });
    items.forEach((it, i) => { if (!it.sold && it.kind === 'contract' && it.switchFrom && g.cash - g.contractPrice(it) > reserve + 250 && (!g.rules.marketMaxBuy || (g.market.bought || 0) < g.rules.marketMaxBuy)) { const s = g.contracts.findIndex(c => c && c.id === it.switchFrom); if (s >= 0) g.buy(i, s); } });
    items.forEach((it, i) => { if (!it.sold && it.kind === 'enh' && g.cash - it.price > reserve + 300 && (!g.rules.marketMaxBuy || (g.market.bought || 0) < g.rules.marketMaxBuy)) { const s = bySlotDelivered(); if (s >= 0) g.buy(i, s); } });
    // 돈이 넉넉하면 남은 계약도 충전해 둔다
    items.forEach((it, i) => { if (!it.sold && it.kind === 'refill' && g.cash - it.price > reserve + 400) g.buy(i, null); });
  }
  
  // ----- 멀티 「난투」 상대 봇 -----
  // 장(shop)은 하루를 쓴다 — 창고가 비어 여유가 있는 날, 살 만한 게 있을 때만 간다.
  // 우선순위: 창고가 터지기 직전이면 확장 → 제일 많이 쓰는 계약 업그레이드 → 적재 보강 → 냉장.
  // 예비금: 배차비 서너 대치 — 즉시 결제라 돈이 마르면 차를 못 부르고, 그러면 물량으로 죽는다
  function botReserve(g) { const fees = g.contracts.filter(Boolean).map(c => g.truckFee(c)); return Math.max(150, Math.round((fees.reduce((a, b) => a + b, 0) / (fees.length || 1)) * 3)); }
  function shopWish(g) {
    const R = g.rules, mult = D.PRICE_MULT[Math.min(12, g.tableMonth(g.month))] * R.itemPriceMult * R.priceMult;
    if (g._botShopCycle === g.month) return null;                        // 장은 사이클에 한 번까지 — 하루가 아깝다
    const reserve = botReserve(g), cash = g.cash - reserve;
    const nextExpand = ['expand1', 'expand2', 'expand3'].find(f => !g.warehouse[f]);
    const expandPrice = nextExpand ? D.FACILITIES[nextExpand].price * mult * R.facilityPriceMult : Infinity;
    const perDay = g.parcelsPerDay ? g.parcelsPerDay() : 3;
    if (g.warehouse.cap < perDay * 1.6 * 4 && cash >= expandPrice) return 'expand';
    const main = g.contracts.filter(Boolean).sort((a, b) => (b.delivered || 0) - (a.delivered || 0))[0];
    if (main) { const nx = D.centersOf(D.familyOf(main.carrier)).find(k => D.CARRIERS[k].tier === D.CARRIERS[main.carrier].tier + 1); if (nx && cash >= D.CARRIERS[nx].price * R.priceMult * R.contractPriceMult) return 'upgrade'; }
    if (main && g.enhUsed(main) < g.enhSlots(main) && cash >= D.ENHANCEMENTS.cap1.price * mult + 200) return 'cap';
    return null;
  }
  function shopBot(g) {
    g._botShopCycle = g.month;
    const items = g.market.items, reserve = botReserve(g);
    const can = price => g.cash - price >= reserve;
    const idx = pred => items.findIndex(it => !it.sold && pred(it));
    const bySlotDelivered = () => { let slot = -1, max = -1; g.contracts.forEach((c, s) => { if (c && (c.delivered || 0) > max) { max = c.delivered || 0; slot = s; } }); return slot; };
    const perDay = g.parcelsPerDay ? g.parcelsPerDay() : 3;
    // 0) 배차 충전: 절반 이하로 남은 계약은 가득 (0대는 무조건)
    for (let k = 0; k < 4; k++) { const rf = items.map((it, i) => ({ it, i })).filter(x => !x.it.sold && x.it.kind === 'refill').map(x => ({ ...x, c: g.contracts.find(c => c && c.id === x.it.contractId) })).filter(x => x.c && (x.c.calls === 0 || x.c.calls <= x.c.maxCalls * 0.5) && g.cash - x.it.price >= 60); if (!rf.length) break; rf.sort((a, b) => a.c.calls - b.c.calls); if (!g.buy(rf[0].i, null).ok) break; }
    // 1) 창고
    if (g.warehouse.cap < perDay * 1.6 * 4) { const i = idx(it => it.kind === 'fac' && it.fac && /^expand/.test(it.fac) && can(it.price)); if (i >= 0) g.buy(i, null); }
    // 2) 계약 업그레이드 — 많이 나른 슬롯부터, 살 수 있는 만큼 전부 (같은 슬롯으로 갈아타기). 돈을 쥐고 죽는 봇이 제일 약하다
    const slots = g.contracts.map((c, s) => ({ c, s })).filter(x => x.c).sort((a, b) => (b.c.delivered || 0) - (a.c.delivered || 0));
    for (const { c, s } of slots) { const i = idx(it => it.kind === 'contract' && it.switchFrom === c.id && can(g.contractPrice(it))); if (i >= 0) g.buy(i, s); }
    // 3) 적재 보강 → 첫 배차 무료 — 슬롯마다
    for (const e of ['cap1', 'regular']) for (const { s } of slots) { const i = idx(it => it.kind === 'enh' && it.enh === e && g.cash - it.price >= reserve + 150 && g.enhUsed(g.contracts[s]) < g.enhSlots(g.contracts[s])); if (i >= 0) g.buy(i, s); }
    // 1b) 돈이 남아돌면 창고도 한 단계 더
    { const i = idx(it => it.kind === 'fac' && it.fac && /^expand/.test(it.fac) && g.cash - it.price >= reserve + it.price); if (i >= 0) g.buy(i, null); }
    // 4) 신선이 많이 오면 냉장
    { const cold = g.parcels.filter(p => (p.attrs || []).includes('cold')).length; if (cold >= 4) { const i = idx(it => it.kind === 'fac' && /^cold/.test(it.fac || '') && g.cash - it.price >= reserve + 100); if (i >= 0) g.buy(i, null); } }
  }
  // 퍽 3택1: 경제 우선, 없으면 첫 장
  function pickPerkBot(g) {
    const MP = (M.MULTI && M.MULTI.PERKS) || {};
    const pref = ['m_calls', 'm_space', 'm_shield', 'm_clean', 'm_refill', 'm_dodge', 'm_upgrade', 'm_yard', 'm_sharp', 'm_trait', 'm_heavy', 'm_roof', 'm_grace', 'm_early', 'm_rush'];
    const id = pref.find(k => g.perkOffer.includes(k)) || g.perkOffer[0];
    return g.pickPerk(id);
  }
  // 평판 상점(랜덤 3장): 퍽은 선호순, 매물은 살 수 있는 것부터 — 예비금은 남긴다
  function repShopBot(g) {
    const pref = ['m_calls', 'm_space', 'm_shield', 'm_clean', 'm_refill', 'm_dodge', 'm_upgrade', 'm_yard', 'm_sharp', 'm_trait', 'm_heavy', 'm_roof', 'm_grace', 'm_early', 'm_rush'];
    let guard = 0;
    while (g.repShop && guard++ < 12) {   // 하나 고르면 닫히고, 넘친 평판이면 다음 상점이 이어진다 — 상점 객체가 바뀌면 처음부터
      const sh = g.repShop, reserve = botReserve(g);
      const order = sh.items.map((it, i) => ({ it, i })).sort((a, b) => (a.it.kind === 'perk' ? pref.indexOf(a.it.perk) : 50 + a.i) - (b.it.kind === 'perk' ? pref.indexOf(b.it.perk) : 50 + b.i));
      let bought = false;
      for (const { it, i } of order) {
        if (it.sold) continue;
        const price = it.kind === 'contract' ? g.contractPrice(it) : it.price;
        if (!g.rules.noMoney && g.cash - price < reserve) continue;
        let s = null;
        if (it.kind === 'contract') { s = it.switchFrom != null ? g.contracts.findIndex(c => c && c.id === it.switchFrom) : g.contracts.findIndex(c => !c); if (s < 0) continue; }
        else if (it.kind === 'enh') { s = g.enhTarget(it.enh); if (s < 0) continue; }
        const r = g.buyRepShop(i, s); if (r && r.ok) { bought = true; if (g.repShop !== sh) break; }
      }
      if (g.repShop === sh) g.closeRepShop();   // 같은 상점이 아직 열려 있으면(못 샀거나 여러 장 규칙) 닫는다
    }
  }
  // 멀티 봇 하루: 퍽/평판 상점이 떠 있으면 처리하고, 장을 볼 날이면 장을 보고(하루 소모), 아니면 호출/대기. 반환: 진행했으면 true
  function multiDay(g, strat) {
    if (g.phase === 'market') { shopBot(g); g.closeMarket(); return true; }   // 준비 마켓(시작) · 사이클 끝 장(있는 규칙이면)
    if (g.phase !== 'play') return false;
    if (g.tickets) { if (g.tickets.extend > 0 && g.parcels.filter(p => !p.overdue && p.deadline <= 1).length >= 3) g.useTicket('extend'); if (g.tickets.hold > 0 && g.usage() >= 0.8) g.useTicket('hold'); if (g.tickets.express > 0 && g.usage() >= 0.7) g.useTicket('express'); }   // 봇도 권을 쓴다
    if (g.repShop) repShopBot(g);
    if (g.perkOffer) pickPerkBot(g);
    if (g.offer) g.declineOffer();
    const wish = shopWish(g);
    const urgent = g.parcels.some(p => p.deadline <= 1 || p.overdue || ((p.attrs || []).includes('cold') && !p.inCold));
    if (g.rules.shopDay && wish && !urgent && g.usage() < 0.6 && g.month < g.rules.months) { g.openShop(); shopBot(g); g.closeMarket(); return true; }   // 「장 보러 간 날」 규칙일 때만
    const b = STRATS[strat || 'balanced'](g);
    if (b) { const r = g.callCarrier(b.i, b.ids, b.trucks); if (r.ok) return true; }
    const se = g.selfEligible().sort((a, b) => a.deadline - b.deadline).slice(0, g.selfCount());
    const ids = g.cash > botReserve(g) ? se.map(p => p.id) : [];
    g.wait(ids);
    return true;
  }

  const BOT = {
    repShopBot, urgency, nextVolume, pickBest, STRATS, marketBot, shopWish, shopBot, pickPerkBot, multiDay };
  if (typeof module !== 'undefined') module.exports = BOT; else root.BOT = BOT;
})(typeof window !== 'undefined' ? window : globalThis);
