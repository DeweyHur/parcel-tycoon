// 게임 코어 로직 (순수 상태 머신 — 브라우저/Node 공용)
// 런 설정(시나리오·회사·퍽·데일리 변형) → rules 객체 → 규칙 적용
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;
  const M = typeof module !== 'undefined' ? require('./meta.js') : root.META;

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
      const keys = Object.keys(obj).filter(k => obj[k] > 0); let total = 0; for (const k of keys) total += obj[k];
      let r = this.next() * total;
      for (const k of keys) { r -= obj[k]; if (r < 0) return k; }
      return keys[keys.length - 1];
    }
    shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = this.int(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  }

  // ---------- 규칙 병합 ----------
  const DEFAULT_RULES = {
    months: 3, scoreMult: 1, endless: false, daily: false,
    cashDelta: 0, cashMult: 1, opCostFixed: null, opCostDelta: 0, opCostRandom: null, lateOpCost: null,
    firstCallBonus: 0, freshExtra: 0, coldTrustBonus: 0, rewardMult: {}, rewardDelta: {}, rewardAll: 0, revenueMult: 1, bonusDelta: 0,
    banCarriers: [], marketWeight: {}, bigSizeDelta: 0, sizeDelta: 0, carrierCapDelta: {}, coldCapMax: null, callsDelta: 0, startCallsDelta: 0,
    facilityCapMult: 1, carrierStartTrust: {}, gradeShift: 0, deadlineDelta: {}, deadlineAll: 0, bigCallPenalty: null,
    priceMult: 1, contractPriceMult: 1, itemPriceMult: 1, facilityPriceMult: 1, waitStack: 0, skipBonus: 0,
    randomStart: false, freeRefresh: 0, marketContractSlots: 2, erosion: false, stressRelief: null, keepCalls: 0, marketMaxBuy: D.MARKET_MAX_BUY, expertFrom: 1,
    firstContractDiscount: 0, rebuyTrust: 0, spareCall: false, bundleRefund: null, overflowGrace: 0, capDelta: 0, freezer: 0, xlDelta: 0, xlPenalty: 3,
    insurance: false, monthlyStress: 0, overdueMult: 0.75, upcomingTurns: 2, urgentDiscount: 1, guaranteeCarriers: [], closingBonus: null, trustXpDelta: 0, trustXpMult: 1,
    arrivalsMult: 1, burstTurns: 0, winDelivered: 0, typeShift: null, typeOverride: null, freshSizes: null, warmMult: 2, heatAlerts: 0, winMaxDiscard: null,
    strike: false, xlWeight: null, winCash: 0, noRefresh: false, bigWeight: 1, bigCallBonus: null,
    selfCapDelta: 0, allStartTrust: 0,
  };
  const MULT_KEYS = ['cashMult', 'revenueMult', 'priceMult', 'contractPriceMult', 'itemPriceMult', 'facilityCapMult', 'facilityPriceMult', 'trustXpMult', 'arrivalsMult', 'urgentDiscount', 'bigWeight', 'scoreMult'];
  const ADD_KEYS = ['cashDelta', 'opCostDelta', 'freshExtra', 'coldTrustBonus', 'rewardAll', 'bonusDelta', 'bigSizeDelta', 'sizeDelta', 'callsDelta', 'startCallsDelta', 'gradeShift', 'capDelta', 'xlDelta', 'monthlyStress', 'trustXpDelta', 'deadlineAll', 'firstCallBonus', 'skipBonus', 'heatAlerts', 'burstTurns', 'selfCapDelta', 'allStartTrust'];
  const MAP_ADD_KEYS = ['rewardDelta', 'carrierCapDelta', 'deadlineDelta', 'carrierStartTrust'];
  const MAP_MULT_KEYS = ['rewardMult', 'marketWeight'];
  const LIST_KEYS = ['banCarriers', 'guaranteeCarriers'];
  // 뒤에 오는 설정이 앞을 덮는다: 시나리오 → 회사 → 퍽 → 데일리 변형 순
  function mergeMods(list) {
    const r = JSON.parse(JSON.stringify(DEFAULT_RULES));
    for (const mods of list) {
      if (!mods) continue;
      for (const k in mods) {
        const v = mods[k];
        if (k === 'guaranteeCarrier') { r.guaranteeCarriers.push(v); continue; }
        if (k === 'facilityPriceMult' && typeof v === 'object') { r.facilityPriceMap = Object.assign(r.facilityPriceMap || {}, v); continue; }
        if (MULT_KEYS.includes(k)) r[k] *= v;
        else if (ADD_KEYS.includes(k)) r[k] += v;
        else if (MAP_ADD_KEYS.includes(k)) for (const t in v) r[k][t] = (r[k][t] || 0) + v[t];
        else if (MAP_MULT_KEYS.includes(k)) for (const t in v) r[k][t] = (r[k][t] || 1) * v[t];
        else if (LIST_KEYS.includes(k)) r[k] = r[k].concat(v);
        else r[k] = v;
      }
    }
    return r;
  }

  function dailySeed(dateStr) { let h = 2166136261; for (const c of dateStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dailyConfig(dateStr) {
    const rng = new Rng(dailySeed(dateStr));
    const comps = Object.keys(M.COMPANIES); const company = comps[rng.int(comps.length)];
    const pool = Object.keys(M.DAILY_VARIANTS); const a = pool[rng.int(pool.length)];
    let b; do { b = pool[rng.int(pool.length)]; } while (b === a || M.DAILY_CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
    return { seed: dailySeed(dateStr + '/run'), company, variants: [a, b], date: dateStr };
  }

  // ---------- Game ----------
  class Game {
    constructor(cfg) {
      cfg = Object.assign({ scenario: 'standard', company: 'local', perks: [], variants: [] }, cfg || {});
      if (cfg.seed == null) cfg.seed = Date.now() % 2147483647;
      this.cfg = cfg;
      this.seed = cfg.seed;
      this.rng = new Rng(this.seed);
      this.nextId = 1;
      this._buildRules();
      this.phase = 'play';           // play | summary | market | over | win
      this.perks = cfg.perks.slice();
      this.month = 0; this.turn = 0;
      this.stress = 0;
      this.parcels = [];
      this.schedule = [];
      this.log = [];
      this.events = [];
      this.waitedLastTurn = false; this.waitStack = 0;
      this.insuranceUsed = false;
      this.market = null;
      this.monthStats = null;
      this.run = { revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, discarded: 0 };
      this.stats = Game.emptyStats();
      this.summary = null; this.result = null;
      this.strikeCarrier = null; this.heatTurns = []; this.burstTurns = [];
      this.trust = {}; // 업체별 신뢰도 경험치 (런 내 유지)
      for (const k of Object.keys(D.CARRIERS)) this.trust[k] = (this.rules.carrierStartTrust[k] || 0) + this.rules.allStartTrust;
      this._initCompany();
      this._startMonth(1);
    }
    static emptyStats() {
      return { deliveredByType: { normal: 0, fresh: 0, fragile: 0, intl: 0, large: 0 }, onTimeByType: { normal: 0, fresh: 0, fragile: 0, intl: 0, large: 0 },
        xlOnTime: 0, callStreak: 0, maxCallStreak: 0, calls: 0, waits: 0, discarded: 0, maxSingleCall: 0, contractsBought: 0, replacedWithCalls: 0,
        trustL3: 0, maxTrustL2Simul: 0, maxTrustL3Simul: 0, zeroCallsMonthEnd: false, overflowTurns: 0, maxOverflowTurns: 0, expansions: 0, coldUpgrades: 0, maxXlSimul: 0,
        overdueDelivered: 0, urgentClutch: false, specialistTypes: [], tidyMonths: 0, perfectMonths: 0, fullNoPenalty: false, masterOwned: false, maxCash: 0,
        brokeMonthEnd: false, maxMonthDelivered: 0, distinctCarriersAtEnd: 0, monthsDone: 0, selfCalls: 0, urgentCalls: 0 };
    }
    _buildRules() {
      const c = this.cfg;
      const sc = M.SCENARIOS[c.scenario] || M.SCENARIOS.standard;
      const co = M.COMPANIES[c.company] || M.COMPANIES.local;
      const mods = [{ months: sc.months }, sc.mods, co.mods];
      for (const p of c.perks) if (M.PERKS[p]) mods.push(M.PERKS[p].mods);
      for (const v of c.variants || []) if (M.DAILY_VARIANTS[v]) mods.push(M.DAILY_VARIANTS[v].mods);
      this.rules = mergeMods(mods);
      this.scenario = sc; this.company = co;
    }
    _initCompany() {
      const R = this.rules, co = this.company;
      let wh, contracts;
      if (R.randomStart) {
        wh = { cap: 20 + this.rng.int(11), cold: this.rng.int(11), xl: this.rng.int(3) };
        const pool = Object.keys(D.CARRIERS).filter(k => !R.banCarriers.includes(k));
        contracts = this.rng.shuffle(pool).slice(0, 4).map(k => ({ carrier: k, grade: this.rng.next() < 0.3 ? 'trusted' : 'normal' }));
      } else { wh = { ...co.warehouse }; contracts = co.contracts; }
      wh.cap += R.capDelta; wh.xl += R.xlDelta;
      if (R.coldCapMax != null) wh.cold = Math.min(wh.cold, R.coldCapMax);
      this.warehouse = wh;
      this.cash = Math.round((co.cash + R.cashDelta) * R.cashMult);
      this.contracts = contracts.map(s => {
        const c = this._makeContract(s.carrier, s.grade || 'normal', null, true);
        if (s.calls != null) c.calls = Math.min(c.maxCalls, s.calls + R.startCallsDelta);
        return c;
      });
      while (this.contracts.length < D.CONTRACT_SLOTS) this.contracts.push(null);
      this.startContractIds = this.contracts.filter(Boolean).map(c => c.id);
    }

    // ----- helpers -----
    _makeContract(carrier, grade, calls, isStart) {
      const c = D.CARRIERS[carrier], g = D.GRADES[grade], R = this.rules;
      const maxCalls = Math.max(1, c.calls + g.calls + R.callsDelta + (isStart ? R.startCallsDelta : 0));
      return { id: this.nextId++, carrier, grade, maxCalls, calls: calls == null ? maxCalls : calls,
        enh: { limit: 0, cap: 0, regular: false, express: false }, successCalls: 0, totalCalls: 0, delivered: 0 };
    }
    hasPerk(p) { return this.perks.includes(p); }
    say(msg) { this.log.unshift(msg); if (this.log.length > 60) this.log.pop(); }
    emit(type, data) { this.events.push({ type, ...data }); }
    takeEvents() { const e = this.events; this.events = []; return e; }

    trustXp(c) { return this.trust[typeof c === 'string' ? c : c.carrier] || 0; }
    trustLevel(c) { const xp = this.trustXp(c); let lv = 0; for (let i = 1; i < D.TRUST_LEVELS.length; i++) if (xp >= D.TRUST_LEVELS[i]) lv = i; return lv; }
    trustNext(c) { const lv = this.trustLevel(c); return lv >= 3 ? null : { need: D.TRUST_LEVELS[lv + 1], have: this.trustXp(c), effect: D.TRUST_EFFECTS[lv + 1] }; }
    // 이 호출로 얻을 신뢰도 경험치 예상 (정상 처리 +1, 처리량 80% 이상 +1, 특수 택배 전문 처리 +1)
    trustGainPreview(c, count) {
      const R = this.rules, cap = this.callCapacity(c);
      let xp = 1; const parts = ['정상 처리 +1'];
      if (count >= Math.ceil(cap * 0.8)) { xp++; parts.push('처리량 80%↑ +1'); }
      if (['cold', 'fragile', 'intl', 'large'].includes(c.carrier) || (c.carrier === 'target' && this.trustLevel(c) >= 3)) { xp++; parts.push('전문 처리 +1'); }
      if (c.carrier === 'cold' && R.coldTrustBonus) { xp += R.coldTrustBonus; parts.push('콜드체인 +1'); }
      xp = Math.round((xp + R.trustXpDelta) * R.trustXpMult);
      return { xp, parts };
    }
    selfCapacity() { return Math.max(1, D.SELF_DELIVERY.cap + this.rules.selfCapDelta); }
    // 자체 배송 대상: 대기열 앞의 일반 택배를 부피 한도(칸)까지
    selfEligible() { const cap = this.selfCapacity(); const out = []; let v = 0; for (const p of this.parcels) { if (p.type !== 'normal') continue; if (v + p.size > cap) { if (out.length) break; else continue; } out.push(p); v += p.size; } return out; }
    canSelfDeliver() { return this.phase === 'play' && this.selfEligible().length > 0; }
    // 대기했을 때 다음 턴 예상: 창고 사용량, 기한 초과·부패 예정
    forecast() {
      const R = this.rules, nxt = this.schedule[this.turn] || [];
      let incoming = 0; for (const s of nxt) { let sz = s.size + R.sizeDelta; if (s.size >= 4) sz += R.bigSizeDelta; incoming += Math.max(1, sz); }
      let overdue = 0, spoil = 0;
      const heat = this.isHeatTurn();
      for (const p of this.parcels) {
        if (!p.overdue && p.deadline - 1 <= 0) overdue++;
        if (p.type === 'fresh') { const drop = heat && !p.inCold ? 99 : (p.inCold && R.freezer && p.age + 1 <= R.freezer) ? 0 : (p.inCold ? 1 : R.warmMult); if (p.fresh - drop <= -1) spoil++; }
      }
      return { used: this.usedVolume() + incoming, cap: this.warehouse.cap, incoming, count: nxt.length, overdue, spoil, monthEnd: this.turn >= D.TURNS_PER_MONTH };
    }
    contractName(c) { return D.CARRIERS[c.carrier].name + (c.grade !== 'normal' ? ` (${D.GRADES[c.grade].name})` : ''); }
    isStruck(c) { return this.rules.strike && this.strikeCarrier === c.carrier; }

    baseCapacity(c) {
      const R = this.rules;
      let cap = D.CARRIERS[c.carrier].cap + D.GRADES[c.grade].cap + c.enh.cap + (R.carrierCapDelta[c.carrier] || 0);
      const lv = this.trustLevel(c);
      if (lv >= 1) cap += 1;
      if (lv >= 3 && ['bulk', 'intl', 'large', 'urgent'].includes(c.carrier)) cap += 1;
      return Math.max(1, cap);
    }
    callCapacity(c) {
      const R = this.rules;
      let cap = this.baseCapacity(c);
      const nth = c.successCalls + 1;
      if (c.enh.regular && nth % 4 === 0) cap += 1;
      if (c.enh.express && nth % 3 === 0) cap += 1;
      if (this.trustLevel(c) >= 2 && nth % 4 === 0) cap += 1;
      if (R.skipBonus && this.waitedLastTurn) cap += R.skipBonus;
      if (R.waitStack) cap += Math.min(R.waitStack, this.waitStack);
      if (R.firstCallBonus && this.monthStats && this.monthStats.calls === 0) cap += R.firstCallBonus;
      return cap;
    }
    capacityBonusNote(c) {
      const R = this.rules, notes = [];
      const nth = c.successCalls + 1;
      if (c.enh.regular && nth % 4 === 0) notes.push('정기 배차 +1');
      if (c.enh.express && nth % 3 === 0) notes.push('고속 배차 +1');
      if (this.trustLevel(c) >= 2 && nth % 4 === 0) notes.push('신뢰 2단계 +1');
      if (R.skipBonus && this.waitedLastTurn) notes.push('스킵 보너스 +1');
      if (R.waitStack && this.waitStack) notes.push(`대기 누적 +${Math.min(R.waitStack, this.waitStack)}`);
      if (R.firstCallBonus && this.monthStats && this.monthStats.calls === 0) notes.push('동네 단골 +1');
      return notes;
    }
    _carrierAccepts(car, p) { return car.types.includes(p.type) || (car.minSizeAny && p.size >= car.minSizeAny); }
    eligibleParcels(c) {
      const car = D.CARRIERS[c.carrier];
      if (car.mode === 'queue') return this.parcels.filter(p => p.type === 'normal').slice(0, this.callCapacity(c));
      return this.parcels.filter(p => this._carrierAccepts(car, p));
    }
    canCall(c) {
      if (!c || this.isStruck(c)) return false;
      if (c.calls <= 0 && !(this.rules.spareCall && !this.monthStats.spareUsed)) return false;
      return this.eligibleParcels(c).length > 0;
    }
    usedVolume() {
      let v = 0, xl = 0;
      for (const p of this.parcels) { v += p.size; if (p.baseSize >= 7) xl++; }
      if (xl > this.warehouse.xl) v += (xl - this.warehouse.xl) * this.rules.xlPenalty;
      return v;
    }
    coldUsed() { return this.parcels.filter(p => p.type === 'fresh').reduce((s, p) => s + p.size, 0); }
    usage() { return this.usedVolume() / this.warehouse.cap; }
    _assignCold() {
      let left = this.warehouse.cold;
      for (const p of this.parcels) {
        if (p.type !== 'fresh') continue;
        if (p.size <= left) { p.inCold = true; left -= p.size; } else p.inCold = false;
      }
    }
    stressState() { for (const [max, name] of D.STRESS_STATES) if (this.stress <= max) return name; return '게임오버'; }
    monthsTotal() { return this.rules.endless ? Infinity : this.rules.months; }

    // ----- 월별 테이블 (무한 모드 확장 포함) -----
    _extraArrivals(m) { return m <= 6 ? D.EXTRA_ARRIVALS[m] : 7 + (m - 6); }
    _typeRatio(m) {
      const R = this.rules;
      let base = { ...(D.TYPE_RATIO[Math.min(6, m)]) };
      if (m > 6) { const k = (m - 6) * 2; base.normal = Math.max(5, base.normal - k * 2); base.fresh += k / 2; base.fragile += k / 2; base.intl += k / 2; base.large += k / 2; }
      if (R.typeOverride) base = { ...R.typeOverride };
      if (R.typeShift) for (const t in R.typeShift) base[t] = Math.max(0, (base[t] || 0) + R.typeShift[t]);
      return base;
    }
    _gradeProb(m) {
      const R = this.rules;
      const p = { ...(D.GRADE_PROB[Math.min(6, m)]) };
      if (m > 6) { p.master = 30; p.expert = 30; p.trusted = 30; p.normal = 10; }
      if (m < R.expertFrom) { p.normal += p.expert + p.master; p.expert = 0; p.master = 0; }
      if (R.gradeShift) { const s = Math.round(p.normal * R.gradeShift); p.normal -= s; p.trusted += s; }
      for (const g of ['trusted', 'expert', 'master']) if (R.marketWeight[g]) p[g] = Math.round(p[g] * R.marketWeight[g]);
      return p;
    }
    _opCost(m) {
      const R = this.rules;
      let cost = R.opCostFixed != null ? R.opCostFixed : D.OPERATING_COST;
      if (R.opCostRandom) cost = R.opCostRandom[0] + this.rng.int(R.opCostRandom[1] - R.opCostRandom[0] + 1);
      cost += R.opCostDelta;
      if (R.lateOpCost && m >= R.lateOpCost.from) cost += R.lateOpCost.delta;
      if (R.endless && m >= 12) cost += (m - 11) * 10;
      return Math.max(0, cost);
    }

    // ----- flow -----
    _startMonth(m) {
      const R = this.rules;
      this.month = m; this.turn = 0;
      this.monthStats = { revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, penalty: 0, discarded: 0, overdue: 0, firstContractBought: false, spareUsed: false, bundleUsed: false };
      for (const c of this.contracts) if (c) c.successCalls = 0;
      this.schedule = this._makeSchedule(m);
      this.heatTurns = R.heatAlerts ? this.rng.shuffle([...Array(D.TURNS_PER_MONTH).keys()].map(i => i + 1)).slice(0, R.heatAlerts).sort((a, b) => a - b) : [];
      if (R.strike) {
        const owned = [...new Set(this.contracts.filter(Boolean).map(c => c.carrier))];
        const pool = (owned.length ? owned : Object.keys(D.CARRIERS)).filter(k => k !== 'urgent' && k !== this.strikeCarrier);
        this.strikeCarrier = pool.length ? this.rng.pick(pool) : null;
        if (this.strikeCarrier) this.say(`⚠ 이번 달 ${D.CARRIERS[this.strikeCarrier].name} 파업: 호출 불가`);
      }
      if (m > 1) {
        if (R.monthlyStress) this.stress = Math.max(0, this.stress + R.monthlyStress);
        if (R.stressRelief && this.stress >= R.stressRelief.min) this.stress = Math.max(0, this.stress - R.stressRelief.amount);
      }
      this.phase = 'play';
      this.say(`── ${m}개월차 시작 ──`);
      this._startTurn();
    }
    _makeSchedule(m) {
      const R = this.rules, turns = D.TURNS_PER_MONTH;
      const sched = Array.from({ length: turns }, () => []);
      const ratio = this._typeRatio(m);
      for (let t = 0; t < turns; t++) sched[t].push(this._genParcelSpec(ratio));
      let extra = Math.round(this._extraArrivals(m) * R.arrivalsMult + (R.arrivalsMult > 1 ? 10 * (R.arrivalsMult - 1) : 0));
      const extraTurns = this.rng.shuffle([...Array(turns - 1).keys()].map(i => i + 1));
      for (let i = 0; i < extra; i++) sched[extraTurns[i % extraTurns.length]].push(this._genParcelSpec(ratio));
      this.burstTurns = [];
      if (R.burstTurns) { const bt = this.rng.shuffle([...Array(turns - 2).keys()].map(i => i + 2)).slice(0, R.burstTurns); for (const t of bt) { sched[t].push(this._genParcelSpec(ratio)); this.burstTurns.push(t + 1); } }
      return sched;
    }
    _genParcelSpec(ratio) {
      const R = this.rules;
      const type = this.rng.weighted(ratio);
      let allowed = D.PARCEL_TYPES[type].sizes;
      if (type === 'fresh' && R.freshSizes) allowed = R.freshSizes;
      const w = {}; for (const s of allowed) { let wt = D.SIZE_WEIGHT[s]; if (s === 7 && R.xlWeight != null) wt = R.xlWeight; if (s >= 4) wt *= R.bigWeight; w[s] = wt; }
      return { type, size: +this.rng.weighted(w) };
    }
    _spawnParcel(spec) {
      const R = this.rules, t = D.PARCEL_TYPES[spec.type];
      let size = spec.size + R.sizeDelta;
      if (spec.size >= 4) size += R.bigSizeDelta;
      size = Math.max(1, size);
      const p = { id: this.nextId++, type: spec.type, size, baseSize: spec.size, reward: 25 + spec.size * 15,
        deadline: Math.max(1, t.deadline + (R.deadlineDelta[spec.type] || 0) + R.deadlineAll), overdue: false, inCold: false, age: 0 };
      if (spec.type === 'fresh') p.fresh = D.FRESH_TURNS + R.freshExtra;
      return p;
    }
    _startTurn() {
      this.turn++;
      const specs = this.schedule[this.turn - 1] || [];
      const arrived = specs.map(s => this._spawnParcel(s));
      this.parcels.push(...arrived);
      this._assignCold();
      for (const p of arrived) this.emit('arrive', { parcel: p });
      const xl = this.parcels.filter(p => p.baseSize >= 7).length; this.stats.maxXlSimul = Math.max(this.stats.maxXlSimul, xl);
      let note = '';
      if (this.heatTurns.includes(this.turn)) note = ' 🌡폭염 경보!';
      this.say(`${this.month}월 ${this.turn}턴: ${arrived.map(p => D.PARCEL_TYPES[p.type].short + p.size).join(', ')} 입고 (사용률 ${Math.round(this.usage() * 100)}%)${note}`);
    }
    isHeatTurn() { return this.heatTurns.includes(this.turn); }
    upcoming() {
      const out = [];
      for (let i = 0; i < this.rules.upcomingTurns; i++) {
        const t = this.turn + i;
        if (t < D.TURNS_PER_MONTH) out.push({ turn: t + 1, specs: this.schedule[t], heat: this.heatTurns.includes(t + 1), burst: this.burstTurns.includes(t + 1) });
        else out.push({ turn: t + 1, specs: null });
      }
      return out;
    }

    wait() {
      if (this.phase !== 'play') return false;
      this.monthStats.waits++; this.run.waits++; this.stats.waits++;
      this.stats.callStreak = 0;
      this.waitStack++;
      this.say('대기: 호출 없이 1턴 진행');
      this.emit('wait', {});
      this._endTurn(true);
      return true;
    }

    callCarrier(slotIdx, pickIds) {
      if (this.phase !== 'play') return { ok: false, msg: '지금은 호출할 수 없습니다' };
      const c = this.contracts[slotIdx], R = this.rules;
      if (!c) return { ok: false, msg: '빈 슬롯' };
      if (this.isStruck(c)) return { ok: false, msg: '파업 중인 업체입니다' };
      const useSpare = c.calls <= 0;
      if (useSpare && !(R.spareCall && !this.monthStats.spareUsed)) return { ok: false, msg: '잔여 호출 횟수가 없습니다' };
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
      const specialist = ['cold', 'fragile', 'intl', 'large'].includes(c.carrier) || (c.carrier === 'target' && lv >= 3);
      let revenue = 0, xp = 1, special = false, onTime = 0;
      for (const p of chosen) {
        const t = D.PARCEL_TYPES[p.type];
        let r = p.reward + (R.rewardDelta[p.type] || 0) + R.rewardAll;
        if (specialist && t.bonus) { r += t.bonus + R.bonusDelta; special = true; if (c.carrier === 'fragile' && lv >= 3) r += 15; if (!this.stats.specialistTypes.includes(p.type)) this.stats.specialistTypes.push(p.type); }
        r = Math.round(r * (R.rewardMult[p.type] || 1));
        if (p.overdue) { r = Math.round(r * R.overdueMult); this.stats.overdueDelivered++; } else { onTime++; this.stats.onTimeByType[p.type]++; if (p.baseSize >= 7) this.stats.xlOnTime++; }
        if (p.type === 'fresh' && p.fresh <= 0) { r = Math.round(r * 0.5); if (c.carrier === 'urgent') this.stats.urgentClutch = true; }
        if (p.type === 'fresh' && p.fresh === 1 && c.carrier === 'urgent') this.stats.urgentClutch = true;
        revenue += Math.max(0, r);
        this.stats.deliveredByType[p.type]++;
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.emit('deliver', { parcel: p, reward: r });
      }
      if (R.bigCallPenalty && chosen.length >= R.bigCallPenalty) revenue = Math.round(revenue * 0.9);
      if (R.bigCallBonus && chosen.length >= R.bigCallBonus.min) revenue = Math.round(revenue * R.bigCallBonus.mult);
      revenue = Math.round(revenue * R.revenueMult);
      if (onTime === 0) xp = 0;
      if (chosen.length >= Math.ceil(cap * 0.8)) xp += 1;
      if (special && onTime > 0) xp += 1;
      if (c.carrier === 'cold' && R.coldTrustBonus) xp += R.coldTrustBonus;
      if (xp > 0) xp = Math.round((xp + R.trustXpDelta) * R.trustXpMult);
      const beforeLv = lv;
      this.trust[c.carrier] = (this.trust[c.carrier] || 0) + xp;
      if (this.trustLevel(c) > beforeLv) { this.say(`${car.name} 신뢰도 ${this.trustLevel(c)}단계 달성! (${D.TRUST_EFFECTS[this.trustLevel(c)]})`); this.emit('trustup', { carrier: c.carrier, level: this.trustLevel(c) }); if (this.trustLevel(c) >= 3) this.stats.trustL3++; }
      // 호출 횟수 소모
      let refunded = false;
      if (useSpare) { this.monthStats.spareUsed = true; this.say('예비 기사 투입 (잔여 호출 없이 호출)'); }
      else if (R.bundleRefund && chosen.length >= R.bundleRefund && !this.monthStats.bundleUsed) { this.monthStats.bundleUsed = true; refunded = true; }
      else c.calls--;
      c.successCalls++; c.totalCalls++; c.delivered += chosen.length;
      this.cash += revenue;
      this.monthStats.revenue += revenue; this.monthStats.calls++; this.monthStats.delivered += chosen.length;
      this.run.revenue += revenue; this.run.calls++; this.run.delivered += chosen.length;
      this.stats.calls++; this.stats.callStreak++; this.stats.maxCallStreak = Math.max(this.stats.maxCallStreak, this.stats.callStreak);
      this.stats.maxSingleCall = Math.max(this.stats.maxSingleCall, chosen.length);
      this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      this.waitStack = 0;
      this._assignCold();
      const freezeFresh = c.carrier === 'cold' && lv >= 3;
      this.say(`${this.contractName(c)} 호출: ${chosen.length}개 처리, +${revenue}c${refunded ? ' (묶음 할인: 호출 미소모)' : ''} (잔여 ${c.calls}회)${car.instant ? ' ⚡즉시' : ''}`);
      this.emit('call', { contract: c, count: chosen.length, revenue, instant: !!car.instant });
      this._updateTrustStats();
      if (car.instant) { this.stats.urgentCalls++; this.stats.maxCash = Math.max(this.stats.maxCash, this.cash); return { ok: true, revenue, count: chosen.length, instant: true }; }
      this._endTurn(false, freezeFresh);
      return { ok: true, revenue, count: chosen.length };
    }
    // 자체 배송: 대기열 앞 일반 택배를 무료로 처리. 턴 소모, 계약·신뢰도 무관
    selfDeliver() {
      if (this.phase !== 'play') return { ok: false, msg: '지금은 배송할 수 없습니다' };
      const R = this.rules, chosen = this.selfEligible();
      if (!chosen.length) return { ok: false, msg: '처리할 일반 택배가 없습니다' };
      let revenue = 0;
      for (const p of chosen) {
        let r = p.reward + (R.rewardDelta.normal || 0) + R.rewardAll;
        r = Math.round(r * (R.rewardMult.normal || 1) * D.SELF_DELIVERY.rewardMult);
        if (p.overdue) { r = Math.round(r * R.overdueMult); this.stats.overdueDelivered++; } else this.stats.onTimeByType.normal++;
        revenue += Math.max(0, r);
        this.stats.deliveredByType.normal++;
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.emit('deliver', { parcel: p, reward: r });
      }
      revenue = Math.round(revenue * R.revenueMult);
      this.cash += revenue;
      this.monthStats.revenue += revenue; this.monthStats.delivered += chosen.length;
      this.run.revenue += revenue; this.run.delivered += chosen.length;
      this.stats.selfCalls++; this.stats.callStreak++; this.stats.maxCallStreak = Math.max(this.stats.maxCallStreak, this.stats.callStreak);
      this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      this.waitStack = 0;
      this._assignCold();
      this.say(`자체 배송: 일반 ${chosen.length}개 처리, +${revenue}c`);
      this.emit('call', { contract: null, self: true, count: chosen.length, revenue });
      this._endTurn(false, false);
      return { ok: true, revenue, count: chosen.length };
    }
    _updateTrustStats() {
      const seen = new Set(this.contracts.filter(Boolean).map(c => c.carrier));
      const l2 = [...seen].filter(k => this.trustLevel(k) >= 2).length, l3 = [...seen].filter(k => this.trustLevel(k) >= 3).length;
      this.stats.maxTrustL2Simul = Math.max(this.stats.maxTrustL2Simul, l2); this.stats.maxTrustL3Simul = Math.max(this.stats.maxTrustL3Simul, l3);
      if (this.contracts.some(c => c && c.grade === 'master')) this.stats.masterOwned = true;
    }

    _endTurn(waited, freezeFresh) {
      const R = this.rules;
      this.waitedLastTurn = waited;
      const usageBefore = this.usage();
      let pen = 0; const reasons = [];
      const discard = [];
      const heat = this.isHeatTurn();
      for (const p of this.parcels) {
        p.age++;
        if (!p.overdue) { p.deadline--; if (p.deadline <= 0) { p.overdue = true; pen += 1; reasons.push(`기한 초과 ${D.PARCEL_TYPES[p.type].short}`); this.monthStats.overdue++; } }
        if (p.type === 'fresh' && !freezeFresh) {
          if (heat && !p.inCold) { p.fresh = -1; }
          else if (p.inCold && R.freezer && p.age <= R.freezer) { /* 냉동고: 첫 N턴 부패 정지 */ }
          else p.fresh -= p.inCold ? 1 : R.warmMult;
          if (p.fresh <= -1) discard.push(p);
        }
      }
      for (const p of discard) {
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.monthStats.discarded++; this.run.discarded++; this.stats.discarded++;
        if (R.insurance && !this.insuranceUsed) { this.insuranceUsed = true; reasons.push('부패 폐기 (보험 적용)'); }
        else { pen += 3; reasons.push(heat && !p.inCold ? '폭염 부패 폐기 +3' : '신선식품 부패 폐기 +3'); }
        this.emit('discard', { parcel: p });
      }
      this._assignCold();
      const over = this.usedVolume() - this.warehouse.cap;
      if (over > 0) { this.stats.overflowTurns++; this.stats.maxOverflowTurns = Math.max(this.stats.maxOverflowTurns, this.stats.overflowTurns); } else this.stats.overflowTurns = 0;
      const effOver = over > R.overflowGrace ? over : 0;
      if (effOver >= 6) { let p4 = 4; if (R.endless && this.month >= 10) p4 += Math.floor((effOver - 6) / 3); pen += p4; reasons.push(`창고 초과 ${over} (+${p4})`); }
      else if (effOver >= 3) { pen += 2; reasons.push(`창고 초과 ${over} (+2)`); }
      else if (effOver >= 1) { pen += 1; reasons.push(`창고 초과 ${over} (+1)`); }
      else if (over > 0) reasons.push(`창고 초과 ${over} (임시 적재장)`);
      if (usageBefore >= 1 && pen === 0) this.stats.fullNoPenalty = true;
      if (pen > 0) {
        this.stress += pen; this.monthStats.penalty += pen;
        this.say(`페널티 +${pen}: ${reasons.join(', ')} (스트레스 ${this.stress})`);
        this.emit('penalty', { amount: pen, reasons });
      } else if (reasons.length) this.say(reasons.join(', '));
      if (this.stress >= D.GAMEOVER_STRESS) return this._gameOver('운영 스트레스가 한계에 도달했습니다');
      if (this.turn >= D.TURNS_PER_MONTH) return this._endMonth();
      this._startTurn();
    }

    _endMonth() {
      const R = this.rules, ms = this.monthStats;
      const overdueVol = this.parcels.filter(p => p.overdue).reduce((s, p) => s + p.size, 0);
      const unproc = Math.floor(overdueVol / 3);
      this.stress += unproc; ms.penalty += unproc;
      const opCost = this._opCost(this.month);
      this.cash -= opCost; ms.spent += opCost; this.run.spent += opCost;
      let closing = 0;
      if (R.closingBonus && this.usage() <= R.closingBonus.usage) { closing = R.closingBonus.amount; this.cash += closing; }
      if (R.erosion) { const cands = this.contracts.filter(c => c && this.startContractIds.includes(c.id) && c.calls > 0); if (cands.length) { const c = this.rng.pick(cands); c.calls--; this.say(`불안정: ${this.contractName(c)} 잔여 호출 -1`); } }
      // 통계
      this.stats.monthsDone = this.month;
      this.stats.maxMonthDelivered = Math.max(this.stats.maxMonthDelivered, ms.delivered);
      if (ms.penalty === 0) this.stats.perfectMonths++;
      if (this.usage() <= 0.4) this.stats.tidyMonths++;
      if (this.contracts.filter(Boolean).length >= 4 && this.contracts.every(c => c && c.calls === 0)) this.stats.zeroCallsMonthEnd = true;
      if (this.cash >= 0 && this.cash <= 100) this.stats.brokeMonthEnd = true;
      this.summary = { month: this.month, revenue: ms.revenue, opCost, calls: ms.calls, waits: ms.waits,
        delivered: ms.delivered, penalty: ms.penalty, unprocPenalty: unproc, overdueVol, discarded: ms.discarded, closing,
        cash: this.cash, stress: this.stress, usage: Math.round(this.usage() * 100), left: this.parcels.length };
      this.say(`${this.month}월 정산: 수익 ${ms.revenue}, 운영비 ${opCost}${closing ? `, 월말 결산 +${closing}` : ''}, 미처리 페널티 +${unproc}`);
      if (this.stress >= D.GAMEOVER_STRESS) return this._gameOver('월말 미처리 물량으로 스트레스가 한계에 도달했습니다');
      if (this.cash < 0) return this._gameOver('운영비를 지불하지 못해 파산했습니다');
      this.phase = 'summary';
    }
    closeSummary() {
      if (this.phase !== 'summary') return false;
      if (!this.rules.endless && this.month >= this.rules.months) return this._finish();
      this._openMarket();
      return true;
    }
    _finish() {
      const R = this.rules;
      if (R.winDelivered && this.run.delivered < R.winDelivered) return this._gameOver(`처리량 부족: ${this.run.delivered}/${R.winDelivered}개`), true;
      if (R.winMaxDiscard != null && this.run.discarded > R.winMaxDiscard) return this._gameOver(`부패 폐기 초과: ${this.run.discarded}개 (허용 ${R.winMaxDiscard})`), true;
      if (R.winCash && this.cash < R.winCash) return this._gameOver(`자금 부족: ${this.cash}/${R.winCash}c`), true;
      return this._win();
    }
    _gameOver(reason) {
      this.phase = 'over';
      this.result = this._makeResult(false, reason);
      this.say(`게임오버: ${reason}`);
    }
    _win() {
      this.phase = 'win';
      this.result = this._makeResult(true, `${this.rules.months}개월 생존 성공!`);
      this.say(this.result.reason);
      return true;
    }
    _makeResult(win, reason) {
      const monthsDone = win ? this.rules.months : this.month - 1;
      this.stats.monthsDone = monthsDone;
      this.stats.distinctCarriersAtEnd = new Set(this.contracts.filter(Boolean).map(c => c.carrier)).size;
      const score = Math.round(Math.max(0, this.run.revenue + Math.max(0, this.cash) + monthsDone * (this.rules.endless ? 300 : 200) - this.stress * 10) * this.rules.scoreMult);
      return { win, reason, score, month: this.month, turn: this.turn, monthsDone, cash: this.cash, stress: this.stress, seed: this.seed,
        scenario: this.cfg.scenario, company: this.cfg.company, perks: this.perks.slice(), variants: (this.cfg.variants || []).slice(), date: this.cfg.date || null, ...this.run };
    }

    // ----- market -----
    _openMarket() {
      this.phase = 'market';
      this.market = { items: this._genMarketItems(), bought: 0, refreshes: 0, month: this.month, freeRefresh: this.rules.freeRefresh };
      this.say(`${this.month}월 마켓 오픈 (최대 ${this.rules.marketMaxBuy}개 구매)`);
    }
    _carrierWeights() {
      const R = this.rules, w = {};
      for (const k of Object.keys(D.CARRIERS)) { if (R.banCarriers.includes(k)) continue; w[k] = R.marketWeight[k] || 1; }
      return w;
    }
    _genMarketItems() {
      const R = this.rules, m = this.month, mult = D.PRICE_MULT[Math.min(6, m)] * R.itemPriceMult * R.priceMult;
      const items = [];
      const gp = this._gradeProb(m);
      const weights = this._carrierWeights();
      const guarantee = R.guaranteeCarriers.filter(k => weights[k]);
      for (let i = 0; i < R.marketContractSlots; i++) {
        let grade = this.rng.weighted(gp);
        // 보호 규칙: 계약 슬롯 중 하나는 현재 보유 등급보다 높게
        if (i === 1 && items[0].grade === 'normal' && grade === 'normal' && this.contracts.every(c => !c || c.grade === 'normal')) grade = 'trusted';
        const carrier = i < guarantee.length ? guarantee[i] : this.rng.weighted(weights);
        let price = Math.round(D.CARRIERS[carrier].price * D.GRADES[grade].price * R.priceMult);
        if (carrier === 'urgent') price = Math.round(price * R.urgentDiscount);
        items.push({ kind: 'contract', carrier, grade, price, name: D.CARRIERS[carrier].name + (grade !== 'normal' ? ` (${D.GRADES[grade].name})` : ''), sold: false });
      }
      const enhW = {}; for (const k of Object.keys(D.ENHANCEMENTS)) enhW[k] = R.marketWeight[k] || 1;
      const picked = []; for (let i = 0; i < 2 && Object.keys(enhW).length; i++) { const e = this.rng.weighted(enhW); picked.push(e); delete enhW[e]; }
      for (const e of picked) items.push({ kind: 'enh', enh: e, price: Math.round(D.ENHANCEMENTS[e].price * mult), name: D.ENHANCEMENTS[e].name, sold: false });
      const facW = {};
      for (const f of Object.keys(D.FACILITIES)) { const F = D.FACILITIES[f]; if (this.warehouse[f]) continue; if (F.requires && !this.warehouse[F.requires]) continue; if (F.cold && R.coldCapMax != null && this.warehouse.cold >= R.coldCapMax) continue; facW[f] = R.marketWeight[f] || 1; }
      if (Object.keys(facW).length) {
        const f = this.rng.weighted(facW);
        let price = D.FACILITIES[f].price * mult * R.facilityPriceMult; if (R.facilityPriceMap && R.facilityPriceMap[f]) price *= R.facilityPriceMap[f];
        items.push({ kind: 'fac', fac: f, price: Math.round(price), name: D.FACILITIES[f].name, sold: false });
      } else items.push({ kind: 'fac', fac: null, price: 0, name: '시설 매진', sold: true });
      return items;
    }
    refreshCost() { const mk = this.market; if (mk.refreshes < mk.freeRefresh) return 0; const r = mk.refreshes - mk.freeRefresh; return Math.round(D.REFRESH_COSTS[Math.min(r, D.REFRESH_COSTS.length - 1)] * this.rules.priceMult); }
    refreshMarket() {
      if (this.phase !== 'market') return { ok: false };
      if (this.rules.noRefresh) return { ok: false, msg: '이 시나리오에서는 새로고침할 수 없습니다' };
      const cost = this.refreshCost();
      if (this.cash < cost) return { ok: false, msg: '자금이 부족합니다' };
      this.cash -= cost; this.run.spent += cost; this.market.refreshes++;
      this.market.items = this._genMarketItems();
      this.say(cost ? `마켓 새로고침 (-${cost}c)` : '마켓 새로고침 (무료)');
      return { ok: true };
    }
    contractPrice(item) {
      const R = this.rules;
      let p = Math.round(item.price * R.contractPriceMult);
      if (R.firstContractDiscount && !this.monthStats.firstContractBought) p = Math.max(0, p - R.firstContractDiscount);
      return p;
    }
    buy(itemIdx, target) {
      if (this.phase !== 'market') return { ok: false, msg: '마켓이 아닙니다' };
      const R = this.rules, it = this.market.items[itemIdx];
      if (!it || it.sold) return { ok: false, msg: '이미 판매된 상품' };
      if (this.market.bought >= R.marketMaxBuy) return { ok: false, msg: `한 달에 ${R.marketMaxBuy}개까지만 구매할 수 있습니다` };
      let price = it.price;
      if (it.kind === 'contract') {
        price = this.contractPrice(it);
        if (this.cash < price) return { ok: false, msg: '자금이 부족합니다' };
        if (target == null || target < 0 || target >= D.CONTRACT_SLOTS) return { ok: false, msg: '교체할 슬롯을 선택하세요' };
        const old = this.contracts[target];
        const nc = this._makeContract(it.carrier, it.grade);
        if (old) {
          if (old.calls >= 3) this.stats.replacedWithCalls = Math.max(this.stats.replacedWithCalls, old.calls);
          if (R.keepCalls && old.calls > 0) nc.calls = Math.min(nc.maxCalls + R.keepCalls, nc.calls + Math.min(R.keepCalls, old.calls));
        }
        this.contracts[target] = nc;
        this.monthStats.firstContractBought = true; this.stats.contractsBought++;
        this.say(`계약 구매: ${it.name} (-${price}c)` + (old ? `, ${this.contractName(old)} 폐기 (잔여 ${old.calls}회 소멸)` : ''));
      } else if (it.kind === 'enh') {
        if (this.cash < price) return { ok: false, msg: '자금이 부족합니다' };
        const c = this.contracts[target];
        if (!c) return { ok: false, msg: '적용할 계약을 선택하세요' };
        const e = D.ENHANCEMENTS[it.enh];
        if (e.kind === 'limit') { if (c.enh.limit >= 2) return { ok: false, msg: '호출 한도 강화는 계약당 2회까지' }; c.enh.limit++; c.maxCalls += e.value; c.calls += e.value; }
        else if (e.kind === 'cap') { if (c.enh.cap >= 3) return { ok: false, msg: '처리 용량 강화는 계약당 3단계까지' }; c.enh.cap++; }
        else if (e.kind === 'regular') { if (c.enh.regular) return { ok: false, msg: '이미 정기 배차가 적용된 계약' }; c.enh.regular = true; }
        else if (e.kind === 'express') { if (c.enh.express) return { ok: false, msg: '이미 고속 배차가 적용된 계약' }; c.enh.express = true; }
        else if (e.kind === 'trust') { const b = this.trustLevel(c); this.trust[c.carrier] = (this.trust[c.carrier] || 0) + e.value; if (this.trustLevel(c) > b && this.trustLevel(c) >= 3) this.stats.trustL3++; }
        this._updateTrustStats();
        this.say(`강화 적용: ${e.name} → ${this.contractName(c)} (-${price}c)`);
      } else if (it.kind === 'fac') {
        if (!it.fac) return { ok: false, msg: '매진' };
        if (this.cash < price) return { ok: false, msg: '자금이 부족합니다' };
        const f = D.FACILITIES[it.fac];
        if (f.cap) { this.warehouse.cap += Math.round(f.cap * R.facilityCapMult); this.stats.expansions++; }
        if (f.cold) { this.warehouse.cold += f.cold; if (R.coldCapMax != null) this.warehouse.cold = Math.min(this.warehouse.cold, R.coldCapMax); this.stats.coldUpgrades++; }
        if (f.xl) this.warehouse.xl += f.xl;
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
      const { rng, rules, scenario, company, ...rest } = this;
      return { ...rest, rngCalls: rng.calls, seed: this.seed };
    }
    static fromJSON(obj) {
      const g = Object.create(Game.prototype);
      Object.assign(g, obj);
      g.cfg = obj.cfg; g.seed = obj.seed;
      g._buildRules();
      g.rng = new Rng(obj.seed, obj.rngCalls);
      delete g.rngCalls;
      g.events = [];
      if (!g.stats) g.stats = Game.emptyStats();
      if (!g.trust) g.trust = {};
      return g;
    }
  }

  const API = { Game, Rng, dailyConfig, dailySeed, mergeMods, DATA: D, META: M };
  if (typeof module !== 'undefined') module.exports = API; else Object.assign(root, API);
})(typeof window !== 'undefined' ? window : globalThis);
