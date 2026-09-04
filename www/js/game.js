// 게임 코어 로직 (순수 상태 머신 — 브라우저/Node 공용)
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;

  // ---------- RNG ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  class Rng {
    constructor(seed, calls = 0) { this.seed = seed >>> 0; this.calls = 0; this.f = mulberry32(this.seed); for (let i = 0; i < calls; i++) this.next(); }
    next() { this.calls++; return this.f(); }
    int(n) { return Math.floor(this.next() * n); }
    pick(arr) { return arr[this.int(arr.length)]; }
    weighted(obj) {
      const keys = Object.keys(obj); let total = 0; for (const k of keys) total += obj[k];
      let r = this.next() * total;
      for (const k of keys) { r -= obj[k]; if (r < 0) return k; }
      return keys[keys.length - 1];
    }
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  }

  // ---------- Game ----------
  class Game {
    constructor(seed) {
      this.seed = seed == null ? (Date.now() % 2147483647) : seed;
      this.rng = new Rng(this.seed);
      this.nextId = 1;
      this.phase = 'perk';           // perk | play | summary | market | over | win
      this.perkChoices = Object.keys(D.PERKS);
      this.perks = [];
      this.month = 0; this.turn = 0;
      this.cash = D.START_CASH; this.stress = 0;
      this.warehouse = { ...D.WAREHOUSE };
      this.parcels = [];
      this.contracts = D.START_CONTRACTS.map(s => this._makeContract(s.carrier, 'normal', s.calls));
      this.schedule = [];
      this.log = [];
      this.events = [];              // UI 연출용 이벤트 큐
      this.waitedLastTurn = false;
      this.insuranceUsed = false;
      this.market = null;
      this.monthStats = null;
      this.run = { revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, discarded: 0 };
      this.summary = null;
      this.result = null;
    }

    // ----- helpers -----
    _makeContract(carrier, grade, calls) {
      const c = D.CARRIERS[carrier], g = D.GRADES[grade];
      const maxCalls = c.calls + g.calls;
      return { id: this.nextId++, carrier, grade, maxCalls, calls: calls == null ? maxCalls : calls,
        trust: 0, enh: { limit: 0, cap: 0, regular: false }, successCalls: 0, totalCalls: 0, delivered: 0 };
    }
    hasPerk(p) { return this.perks.includes(p); }
    say(msg) { this.log.unshift(msg); if (this.log.length > 60) this.log.pop(); }
    emit(type, data) { this.events.push({ type, ...data }); }
    takeEvents() { const e = this.events; this.events = []; return e; }

    trustLevel(c) { let lv = 0; for (let i = 1; i < D.TRUST_LEVELS.length; i++) if (c.trust >= D.TRUST_LEVELS[i]) lv = i; return lv; }
    contractName(c) { return D.CARRIERS[c.carrier].name + (c.grade === 'trusted' ? ' (신뢰)' : ''); }

    // 기본 회당 처리량 (호출 보너스 제외)
    baseCapacity(c) {
      let cap = D.CARRIERS[c.carrier].cap + D.GRADES[c.grade].cap + c.enh.cap;
      const lv = this.trustLevel(c);
      if (lv >= 1) cap += 1;
      if (lv >= 3 && (c.carrier === 'line' || c.carrier === 'bulk' || c.carrier === 'intl')) cap += 1;
      return cap;
    }
    // 이번 호출의 실제 처리량 (정기 배차, 신뢰 2단계, 스킵 보너스 포함)
    callCapacity(c) {
      let cap = this.baseCapacity(c);
      const nth = c.successCalls + 1;
      if (c.enh.regular && nth % 4 === 0) cap += 1;
      if (this.trustLevel(c) >= 2 && nth % 4 === 0) cap += 1;
      if (this.hasPerk('skip') && this.waitedLastTurn) cap += 1;
      return cap;
    }
    capacityBonusNote(c) {
      const notes = [];
      const nth = c.successCalls + 1;
      if (c.enh.regular && nth % 4 === 0) notes.push('정기 배차 +1');
      if (this.trustLevel(c) >= 2 && nth % 4 === 0) notes.push('신뢰 2단계 +1');
      if (this.hasPerk('skip') && this.waitedLastTurn) notes.push('스킵 보너스 +1');
      return notes;
    }

    eligibleParcels(c) {
      const car = D.CARRIERS[c.carrier];
      if (car.mode === 'queue') return this.parcels.filter(p => p.type === 'normal').slice(0, this.callCapacity(c));
      return this.parcels.filter(p => car.types.includes(p.type));
    }
    canCall(c) { return c && c.calls > 0 && this.eligibleParcels(c).length > 0; }

    usedVolume() {
      let v = 0, xl = 0;
      for (const p of this.parcels) { v += p.size; if (p.size >= 7) xl++; }
      if (xl > this.warehouse.xl) v += (xl - this.warehouse.xl) * 3; // 초대형 적재장 부족: 개당 +3 임시 공간
      return v;
    }
    coldUsed() { return this.parcels.filter(p => p.type === 'fresh').reduce((s, p) => s + p.size, 0); }
    usage() { return this.usedVolume() / this.warehouse.cap; }
    // 냉장 구역 배정: 입고 순서대로 냉장 용량을 채움
    _assignCold() {
      let left = this.warehouse.cold;
      for (const p of this.parcels) {
        if (p.type !== 'fresh') continue;
        if (p.size <= left) { p.inCold = true; left -= p.size; } else p.inCold = false;
      }
    }
    stressState() { for (const [max, name] of D.STRESS_STATES) if (this.stress <= max) return name; return '게임오버'; }

    // ----- flow -----
    choosePerks(ids) {
      if (this.phase !== 'perk') return false;
      if (ids.length !== 2 || ids[0] === ids[1] || !ids.every(i => D.PERKS[i])) return false;
      this.perks = ids.slice();
      this.say(`Perk 선택: ${ids.map(i => D.PERKS[i].name).join(', ')}`);
      this._startMonth(1);
      return true;
    }

    _startMonth(m) {
      this.month = m; this.turn = 0;
      this.monthStats = { revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, penalty: 0, discarded: 0, overdue: 0, firstContractBought: false };
      for (const c of this.contracts) if (c) c.successCalls = 0;
      this.schedule = this._makeSchedule(m);
      this.phase = 'play';
      this.say(`── ${m}개월차 시작 ──`);
      this._startTurn();
    }

    _makeSchedule(m) {
      const turns = D.TURNS_PER_MONTH;
      const sched = Array.from({ length: turns }, () => []);
      for (let t = 0; t < turns; t++) sched[t].push(this._genParcelSpec(m));
      // 추가 입고: 미리 정해진 턴 (2~10턴 중 무작위, 중복 없음)
      const extraTurns = this.rng.shuffle([...Array(turns - 1).keys()].map(i => i + 1)).slice(0, D.EXTRA_ARRIVALS[m]);
      for (const t of extraTurns) sched[t].push(this._genParcelSpec(m));
      return sched;
    }
    _genParcelSpec(m) {
      const type = this.rng.weighted(D.TYPE_RATIO[m]);
      const allowed = D.PARCEL_TYPES[type].sizes;
      const w = {}; for (const s of allowed) w[s] = D.SIZE_WEIGHT[s];
      const size = +this.rng.weighted(w);
      return { type, size };
    }
    _spawnParcel(spec) {
      const t = D.PARCEL_TYPES[spec.type];
      let size = spec.size;
      if (this.hasPerk('compact')) size = Math.max(1, size - 1);
      const p = { id: this.nextId++, type: spec.type, size, baseSize: spec.size,
        reward: 25 + spec.size * 15, deadline: t.deadline, overdue: false, inCold: false, age: 0 };
      if (spec.type === 'fresh') p.fresh = D.FRESH_TURNS + (this.hasPerk('coldpro') ? 1 : 0);
      return p;
    }

    _startTurn() {
      this.turn++;
      const specs = this.schedule[this.turn - 1] || [];
      const arrived = specs.map(s => this._spawnParcel(s));
      this.parcels.push(...arrived);
      this._assignCold();
      for (const p of arrived) this.emit('arrive', { parcel: p });
      this.say(`${this.month}월 ${this.turn}턴: ${arrived.map(p => D.PARCEL_TYPES[p.type].short + p.size).join(', ')} 입고 (사용률 ${Math.round(this.usage() * 100)}%)`);
    }

    // 다음 2턴의 입고 예정
    upcoming() {
      const out = [];
      for (let i = 0; i < 2; i++) {
        const t = this.turn + i; // 0-index of next turn = this.turn
        if (t < D.TURNS_PER_MONTH) out.push({ turn: t + 1, specs: this.schedule[t] });
        else out.push({ turn: t + 1, specs: null });
      }
      return out;
    }

    wait() {
      if (this.phase !== 'play') return false;
      this.monthStats.waits++; this.run.waits++;
      this.say('대기: 호출 없이 1턴 진행');
      this.emit('wait', {});
      this._endTurn(true);
      return true;
    }

    // slotIdx: 계약 슬롯, pickIds: 선택한 택배 id (queue 모드는 무시)
    callCarrier(slotIdx, pickIds) {
      if (this.phase !== 'play') return { ok: false, msg: '지금은 호출할 수 없습니다' };
      const c = this.contracts[slotIdx];
      if (!c) return { ok: false, msg: '빈 슬롯' };
      if (c.calls <= 0) return { ok: false, msg: '잔여 호출 횟수가 없습니다' };
      const car = D.CARRIERS[c.carrier];
      const cap = this.callCapacity(c);
      let chosen;
      if (car.mode === 'queue') chosen = this.eligibleParcels(c);
      else {
        const elig = this.eligibleParcels(c);
        chosen = (pickIds || []).map(id => elig.find(p => p.id === id)).filter(Boolean);
        if (chosen.length > cap) return { ok: false, msg: `최대 ${cap}개까지 처리할 수 있습니다` };
      }
      if (chosen.length === 0) return { ok: false, msg: '처리할 택배가 없습니다' };

      const lv = this.trustLevel(c);
      const specialist = ['cold', 'fragile', 'intl'].includes(c.carrier) || (c.carrier === 'target' && lv >= 3);
      let revenue = 0, xp = 1, special = false, onTime = 0;
      for (const p of chosen) {
        const t = D.PARCEL_TYPES[p.type];
        let r = p.reward;
        if (specialist && t.bonus) { r += t.bonus; special = true; if (c.carrier === 'fragile' && lv >= 3) r += 15; }
        if (p.overdue) r = Math.round(r * 0.75); else onTime++;
        if (p.type === 'fresh' && p.fresh <= 0) r = Math.round(r * 0.5);
        revenue += r;
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.emit('deliver', { parcel: p, reward: r });
      }
      if (onTime === 0) xp = 0;
      if (chosen.length >= Math.ceil(cap * 0.8)) xp += 1;
      if (special && onTime > 0) xp += 1;
      const beforeLv = lv;
      c.trust += xp;
      if (this.trustLevel(c) > beforeLv) this.say(`${this.contractName(c)} 신뢰도 ${this.trustLevel(c)}단계 달성!`);
      c.calls--; c.successCalls++; c.totalCalls++; c.delivered += chosen.length;
      this.cash += revenue;
      this.monthStats.revenue += revenue; this.monthStats.calls++; this.monthStats.delivered += chosen.length;
      this.run.revenue += revenue; this.run.calls++; this.run.delivered += chosen.length;
      this._assignCold();
      const freezeFresh = c.carrier === 'cold' && lv >= 3;
      this.say(`${this.contractName(c)} 호출: ${chosen.length}개 처리, +${revenue}c (잔여 ${c.calls}회)`);
      this.emit('call', { contract: c, count: chosen.length, revenue });
      this._endTurn(false, freezeFresh);
      return { ok: true, revenue, count: chosen.length };
    }

    _endTurn(waited, freezeFresh) {
      this.waitedLastTurn = waited;
      // 5. 신선도 / 기한 진행
      let pen = 0; const reasons = [];
      const discard = [];
      for (const p of this.parcels) {
        p.age++;
        if (!p.overdue) { p.deadline--; if (p.deadline <= 0) { p.overdue = true; pen += 1; reasons.push(`기한 초과 ${D.PARCEL_TYPES[p.type].short}`); this.monthStats.overdue++; } }
        if (p.type === 'fresh' && !freezeFresh) {
          p.fresh -= p.inCold ? 1 : 2;
          if (p.fresh <= -1) discard.push(p);
        }
      }
      for (const p of discard) {
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.monthStats.discarded++; this.run.discarded++;
        if (this.hasPerk('insure') && !this.insuranceUsed) { this.insuranceUsed = true; reasons.push('부패 폐기 (보험 적용)'); }
        else { pen += 3; reasons.push('신선식품 부패 폐기 +3'); }
        this.emit('discard', { parcel: p });
      }
      this._assignCold();
      // 6. 창고 초과
      const over = this.usedVolume() - this.warehouse.cap;
      if (over >= 6) { pen += 4; reasons.push(`창고 초과 ${over} (+4)`); }
      else if (over >= 3) { pen += 2; reasons.push(`창고 초과 ${over} (+2)`); }
      else if (over >= 1) { pen += 1; reasons.push(`창고 초과 ${over} (+1)`); }
      if (pen > 0) {
        this.stress += pen; this.monthStats.penalty += pen;
        this.say(`페널티 +${pen}: ${reasons.join(', ')} (스트레스 ${this.stress})`);
        this.emit('penalty', { amount: pen, reasons });
      }
      if (this.stress >= D.GAMEOVER_STRESS) return this._gameOver('운영 스트레스가 한계에 도달했습니다');
      if (this.turn >= D.TURNS_PER_MONTH) return this._endMonth();
      this._startTurn();
    }

    _endMonth() {
      const ms = this.monthStats;
      const overdueVol = this.parcels.filter(p => p.overdue).reduce((s, p) => s + p.size, 0);
      const unproc = Math.floor(overdueVol / 3);
      this.stress += unproc; ms.penalty += unproc;
      this.cash -= D.OPERATING_COST; ms.spent += D.OPERATING_COST; this.run.spent += D.OPERATING_COST;
      this.summary = { month: this.month, revenue: ms.revenue, opCost: D.OPERATING_COST, calls: ms.calls, waits: ms.waits,
        delivered: ms.delivered, penalty: ms.penalty, unprocPenalty: unproc, overdueVol, discarded: ms.discarded,
        cash: this.cash, stress: this.stress, usage: Math.round(this.usage() * 100), left: this.parcels.length };
      this.say(`${this.month}월 정산: 수익 ${ms.revenue}, 운영비 ${D.OPERATING_COST}, 미처리 페널티 +${unproc}`);
      if (this.stress >= D.GAMEOVER_STRESS) return this._gameOver('월말 미처리 물량으로 스트레스가 한계에 도달했습니다');
      if (this.cash < 0) return this._gameOver('운영비를 지불하지 못해 파산했습니다');
      this.phase = 'summary';
    }

    closeSummary() {
      if (this.phase !== 'summary') return false;
      if (this.month >= D.MONTHS) return this._win();
      this._openMarket();
      return true;
    }

    _gameOver(reason) {
      this.phase = 'over';
      this.result = this._makeResult(false, reason);
      this.say(`게임오버: ${reason}`);
    }
    _win() {
      this.phase = 'win';
      this.result = this._makeResult(true, `${D.MONTHS}개월 생존 성공!`);
      this.say(this.result.reason);
      return true;
    }
    _makeResult(win, reason) {
      const monthsDone = win ? D.MONTHS : this.month - 1;
      const score = Math.max(0, this.run.revenue + Math.max(0, this.cash) + monthsDone * 200 - this.stress * 10);
      return { win, reason, score, month: this.month, turn: this.turn, cash: this.cash, stress: this.stress, seed: this.seed, perks: this.perks.slice(), ...this.run };
    }

    // ----- market -----
    _openMarket() {
      this.phase = 'market';
      this.market = { items: this._genMarketItems(), bought: 0, refreshes: 0, month: this.month };
      this.say(`${this.month}월 마켓 오픈 (최대 ${D.MARKET_MAX_BUY}개 구매)`);
    }
    _genMarketItems() {
      const m = this.month, mult = D.PRICE_MULT[m];
      const items = [];
      const carriers = Object.keys(D.CARRIERS);
      for (let i = 0; i < 2; i++) {
        let grade = this.rng.weighted(D.GRADE_PROB[m]);
        // 보호 규칙: 계약 슬롯 하나는 반드시 현재 계약 중 최고 등급 이상
        if (i === 1 && items[0].grade === 'normal' && this.contracts.every(c => !c || c.grade === 'normal')) grade = 'trusted';
        const carrier = this.rng.pick(carriers);
        let price = Math.round(D.CARRIERS[carrier].price * D.GRADES[grade].price);
        items.push({ kind: 'contract', carrier, grade, price, name: D.CARRIERS[carrier].name + (grade === 'trusted' ? ' (신뢰)' : ''), sold: false });
      }
      const enh = this.rng.shuffle(Object.keys(D.ENHANCEMENTS)).slice(0, 2);
      for (const e of enh) items.push({ kind: 'enh', enh: e, price: Math.round(D.ENHANCEMENTS[e].price * mult), name: D.ENHANCEMENTS[e].name, sold: false });
      const facs = Object.keys(D.FACILITIES).filter(f => !this.warehouse[f]);
      if (facs.length) { const f = this.rng.pick(facs); items.push({ kind: 'fac', fac: f, price: Math.round(D.FACILITIES[f].price * mult), name: D.FACILITIES[f].name, sold: false }); }
      else items.push({ kind: 'fac', fac: null, price: 0, name: '시설 매진', sold: true });
      return items;
    }
    refreshCost() { const r = this.market.refreshes; return D.REFRESH_COSTS[Math.min(r, D.REFRESH_COSTS.length - 1)]; }
    refreshMarket() {
      if (this.phase !== 'market') return { ok: false };
      const cost = this.refreshCost();
      if (this.cash < cost) return { ok: false, msg: '자금이 부족합니다' };
      this.cash -= cost; this.run.spent += cost; this.market.refreshes++;
      this.market.items = this._genMarketItems();
      this.say(`마켓 새로고침 (-${cost}c)`);
      return { ok: true };
    }
    contractPrice(item) {
      let p = item.price;
      if (this.hasPerk('longdeal')) p = Math.round(p * 0.9);
      return p;
    }
    // target: 계약 구매/강화 적용 시 슬롯 index
    buy(itemIdx, target) {
      if (this.phase !== 'market') return { ok: false, msg: '마켓이 아닙니다' };
      const it = this.market.items[itemIdx];
      if (!it || it.sold) return { ok: false, msg: '이미 판매된 상품' };
      if (this.market.bought >= D.MARKET_MAX_BUY) return { ok: false, msg: `한 달에 ${D.MARKET_MAX_BUY}개까지만 구매할 수 있습니다` };
      let price = it.price;
      if (it.kind === 'contract') {
        price = this.contractPrice(it);
        if (this.cash < price) return { ok: false, msg: '자금이 부족합니다' };
        if (target == null || target < 0 || target >= D.CONTRACT_SLOTS) return { ok: false, msg: '교체할 슬롯을 선택하세요' };
        const old = this.contracts[target];
        this.contracts[target] = this._makeContract(it.carrier, it.grade);
        this.say(`계약 구매: ${it.name} (-${price}c)` + (old ? `, ${this.contractName(old)} 폐기 (잔여 ${old.calls}회 소멸)` : ''));
      } else if (it.kind === 'enh') {
        if (this.cash < price) return { ok: false, msg: '자금이 부족합니다' };
        const c = this.contracts[target];
        if (!c) return { ok: false, msg: '적용할 계약을 선택하세요' };
        const e = D.ENHANCEMENTS[it.enh];
        if (e.kind === 'limit') { if (c.enh.limit >= 2) return { ok: false, msg: '호출 한도 강화는 계약당 2회까지' }; c.enh.limit++; c.maxCalls += e.value; c.calls += e.value; }
        else if (e.kind === 'cap') { if (c.enh.cap >= 3) return { ok: false, msg: '처리 용량 강화는 계약당 3단계까지' }; c.enh.cap++; }
        else if (e.kind === 'regular') { if (c.enh.regular) return { ok: false, msg: '이미 정기 배차가 적용된 계약' }; c.enh.regular = true; }
        else if (e.kind === 'trust') { c.trust += e.value; }
        this.say(`강화 적용: ${e.name} → ${this.contractName(c)} (-${price}c)`);
      } else if (it.kind === 'fac') {
        if (!it.fac) return { ok: false, msg: '매진' };
        if (this.cash < price) return { ok: false, msg: '자금이 부족합니다' };
        const f = D.FACILITIES[it.fac];
        if (f.cap) this.warehouse.cap += f.cap;
        if (f.cold) this.warehouse.cold += f.cold;
        this.warehouse[it.fac] = true;
        this._assignCold();
        this.say(`시설 구매: ${f.name} (-${price}c)`);
      }
      this.cash -= price; this.run.spent += price; this.market.bought++; it.sold = true;
      return { ok: true };
    }
    closeMarket() {
      if (this.phase !== 'market') return false;
      this.market = null;
      this._startMonth(this.month + 1);
      return true;
    }

    // ----- save / load -----
    toJSON() {
      const { rng, ...rest } = this;
      return { ...rest, rngCalls: rng.calls, seed: this.seed };
    }
    static fromJSON(obj) {
      const g = new Game(obj.seed);
      Object.assign(g, obj);
      g.rng = new Rng(obj.seed, obj.rngCalls);
      delete g.rngCalls;
      g.events = [];
      return g;
    }
  }

  const API = { Game, Rng, DATA: D };
  if (typeof module !== 'undefined') module.exports = API; else Object.assign(root, API);
})(typeof window !== 'undefined' ? window : globalThis);
