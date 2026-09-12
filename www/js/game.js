// 게임 코어 로직 (순수 상태 머신 — 브라우저/Node 공용)
// 런 설정(시나리오·회사·퍽·데일리 변형) → rules 객체 → 규칙 적용
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;
  const M = typeof module !== 'undefined' ? require('./meta.js') : root.META;
  const I18n = typeof module !== 'undefined' ? require('./i18n.js').init(D, M) : root.I18n;
  const T = I18n.t, MSG = I18n.msg; // T: 즉시 문자열, MSG: 로그용 메시지 객체 {k, p} (표시 시점에 번역)

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
    months: 3, scoreMult: 1, endless: false, daily: false, calendar: 'kr', monthOffset: 0,
    cashDelta: 0, cashMult: 1, opCostFixed: null, opCostDelta: 0, opCostRandom: null, lateOpCost: null,
    firstCallBonus: 0, freshExtra: 0, coldTrustBonus: 0, rewardMult: {}, rewardDelta: {}, rewardAll: 0, revenueMult: 1, bonusDelta: 0,
    banCarriers: [], marketWeight: {}, bigSizeDelta: 0, sizeDelta: 0, carrierCapDelta: {}, coldCapMax: null, callsDelta: 0, startCallsDelta: 0,
    facilityCapMult: 1, carrierStartTrust: {}, gradeShift: 0, deadlineDelta: {}, deadlineAll: 0, bigCallPenalty: null,
    priceMult: 1, contractPriceMult: 1, itemPriceMult: 1, facilityPriceMult: 1, waitStack: 0, skipBonus: 0,
    randomStart: false, freeRefresh: 0, marketContractSlots: 2, erosion: false, stressRelief: null, keepCalls: 0, marketMaxBuy: D.MARKET_MAX_BUY, expertFrom: 1,
    firstContractDiscount: 0, rebuyTrust: 0, spareCall: false, bundleRefund: null, overflowGrace: 0, capDelta: 0, freezer: 0, xlDelta: 0, xlPenalty: 3,
    insurance: false, monthlyStress: 0, overdueMult: 0.75, overdueStress: 0, upcomingTurns: 2, urgentDiscount: 1, guaranteeCarriers: [], guaranteeBlocked: true, returnGrace: D.RETURN_GRACE, theftMult: 1, overdueTurnStress: 0, breakMult: 1, warmLimit: D.WARM_LIMIT, customsWait: D.CUSTOMS_WAIT, customsDelayProb: D.CUSTOMS_DELAY_PROB, returnGraceFresh: 1, frozenCapMax: null, claimMult: 1, customerWeights: {}, forceCustomers: [], noAnon: false, closingBonus: null, trustXpDelta: 0, trustXpMult: 1,
    arrivalsMult: 1, burstTurns: 0, winDelivered: 0, typeShift: null, typeOverride: null, freshSizes: null, warmMult: 2, heatAlerts: 0, winMaxDiscard: null,
    strike: false, xlWeight: null, winCash: 0, noRefresh: false, bigWeight: 1, bigCallBonus: null, winMaxOverdue: null,
    selfCapDelta: 0, allStartTrust: 0,
    // 3.5단계: 보험·날씨·보관·적재
    premiumMult: 1, premiumDelta: {}, noInsurance: false, season: null, startMonth: null, weatherWeights: {}, tent: false, forecastTurns: 2,
    storageOfferProb: 0.12, storageMax: 2, storageFeeMult: 1, eventGoods: false, storageAnon: false,
    // 4단계: 난이도·시나리오 고객 규칙
    feeMult: 1, feeFixed: null, feeDelta: 0,
    gameoverStress: D.GAMEOVER_STRESS, noDualAttrs: false, dualAttrBonus: 0, burstDeadlineDelta: 0, customerClaimMult: {}, storageOfferEvery: 0, winStorage: 0, bigCustomer: false, winBigCustomer: false,
  };
  const MULT_KEYS = ['theftMult', 'breakMult', 'claimMult', 'premiumMult', 'storageFeeMult', 'feeMult', 'cashMult', 'revenueMult', 'priceMult', 'contractPriceMult', 'itemPriceMult', 'facilityCapMult', 'facilityPriceMult', 'trustXpMult', 'arrivalsMult', 'urgentDiscount', 'bigWeight', 'scoreMult'];
  const ADD_KEYS = ['cashDelta', 'opCostDelta', 'freshExtra', 'coldTrustBonus', 'rewardAll', 'bonusDelta', 'bigSizeDelta', 'sizeDelta', 'callsDelta', 'startCallsDelta', 'gradeShift', 'capDelta', 'xlDelta', 'monthlyStress', 'trustXpDelta', 'deadlineAll', 'firstCallBonus', 'skipBonus', 'heatAlerts', 'burstTurns', 'selfCapDelta', 'allStartTrust'];
  const MAP_ADD_KEYS = ['rewardDelta', 'carrierCapDelta', 'deadlineDelta', 'carrierStartTrust', 'premiumDelta'];
  const MAP_MULT_KEYS = ['rewardMult', 'marketWeight', 'customerWeights', 'weatherWeights', 'customerClaimMult'];
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

  const GRADE_RANK = ['normal', 'trusted', 'expert', 'master'];
  // 센터 id → 계열, 계열 키로 적힌 규칙 표(marketWeight·carrierCapDelta·feeMult…)를 센터에도 적용
  const FAM = k => D.familyOf(k); const famVal = (map, k) => (map && map[k] != null) ? map[k] : (map ? map[FAM(k)] : undefined);
  function dailySeed(dateStr) { let h = 2166136261; for (const c of dateStr) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dailyConfig(dateStr) {
    const rng = new Rng(dailySeed(dateStr));
    const comps = Object.keys(M.COMPANIES); const company = comps[rng.int(comps.length)];
    const pool = Object.keys(M.DAILY_VARIANTS); const a = pool[rng.int(pool.length)];
    let b; do { b = pool[rng.int(pool.length)]; } while (b === a || M.DAILY_CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
    const startMonth = 1 + rng.int(12); // 달력의 무작위 한 달 컷
    return { seed: dailySeed(dateStr + '/run'), company, variants: [a, b], date: dateStr, startMonth };
  }

  // ---------- Game ----------
  class Game {
    constructor(cfg) {
      cfg = Object.assign({ scenario: 'standard', company: 'local', perks: [], variants: [], difficulty: 'normal' }, cfg || {});
      if (cfg.scenario === 'daily') cfg.difficulty = 'normal';
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
      this.storage = []; this.offer = null; this.outdoorPref = []; this.weather = []; this.pendingRevenue = []; this.bigCustomer = null; this.feesDue = 0; this.debt = 0;
      this.insurer = 'none'; this.premMult = 1; this.noClaimMonths = 0; this.coverHalf = false; this.items = { transitCert: 0, yardIns: 0, customsBond: 0 };
      this.monthStats = null;
      this.run = { revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, discarded: 0 };
      this.stats = Game.emptyStats();
      this.summary = null; this.result = null;
      this.strikeCarrier = null; this.heatTurns = []; this.burstTurns = [];
      this.story = cfg.story ? { seen: [], notes: [] } : null; // 창고장 안내(스토리 모드) 진행 상태 — 본 비트 id
      this.trust = {}; // 업체별 신뢰도 경험치 (런 내 유지)
      for (const k of Object.keys(D.CARRIERS)) this.trust[k] = (famVal(this.rules.carrierStartTrust, k) || 0) + this.rules.allStartTrust;
      this._initCompany();
      this._initCustomers();
      this.insurer = this.rules.noInsurance ? 'none' : (cfg.insurer && M.INSURERS[cfg.insurer] ? cfg.insurer : 'none');
      this._startMonth(1);
    }
    static emptyStats() {
      return { deliveredByType: { normal: 0, fresh: 0, produce: 0, fragile: 0, intl: 0, large: 0, frozen: 0 }, onTimeByType: { normal: 0, fresh: 0, produce: 0, fragile: 0, intl: 0, large: 0, frozen: 0 }, broken: 0, claims: 0, customerL3: 0, storageDone: 0, premiumPaid: 0, loans: 0, interestPaid: 0, wetDelivered: 0, snowDelivered: 0, noClaim2: false, customersAdded: 0,
        xlOnTime: 0, callStreak: 0, maxCallStreak: 0, calls: 0, waits: 0, discarded: 0, maxSingleCall: 0, contractsBought: 0, replacedWithCalls: 0,
        trustL3: 0, maxTrustL2Simul: 0, maxTrustL3Simul: 0, zeroCallsMonthEnd: false, overflowTurns: 0, maxOverflowTurns: 0, expansions: 0, coldUpgrades: 0, maxXlSimul: 0,
        overdueDelivered: 0, returned: 0, stolen: 0, urgentClutch: false, specialistTypes: [], tidyMonths: 0, perfectMonths: 0, fullNoPenalty: false, masterOwned: false, maxCash: 0,
        brokeMonthEnd: false, maxMonthDelivered: 0, distinctCarriersAtEnd: 0, monthsDone: 0, selfCalls: 0, urgentCalls: 0, bigDelivered: 0, feesPaid: 0, fullTrucks: 0, trucksCalled: 0 };
    }
    _buildRules() {
      const c = this.cfg;
      const sc = M.SCENARIOS[c.scenario] || M.SCENARIOS.standard;
      const co = M.COMPANIES[c.company] || M.COMPANIES.local;
      const df = M.DIFFICULTIES[c.difficulty] || M.DIFFICULTIES.normal;
      const mods = [{ months: sc.months }, sc.mods, df.mods, co.mods];
      if (c.startMonth) mods.push({ startMonth: c.startMonth }); // 데일리: 그날 지정된 달력 달
      for (const p of c.perks) if (M.PERKS[p]) mods.push(M.PERKS[p].mods);
      for (const v of c.variants || []) if (M.DAILY_VARIANTS[v]) mods.push(M.DAILY_VARIANTS[v].mods);
      this.rules = mergeMods(mods);
      this.scenario = sc; this.company = co; this.difficulty = df;
    }
    _initCompany() {
      const R = this.rules, co = this.company;
      let wh, contracts;
      if (R.randomStart) {
        wh = { cap: 20 + this.rng.int(11), cold: this.rng.int(11), xl: this.rng.int(3) };
        const pool = Object.keys(D.CARRIERS).filter(k => !this.isBanned(k) && D.CARRIERS[k].tier <= 1);
        const fams = [...new Set(this.rng.shuffle(pool).map(FAM))].slice(0, 4);
        contracts = fams.map(f => ({ carrier: f, grade: this.rng.next() < 0.3 ? 'trusted' : 'normal' }));
      } else { wh = { ...co.warehouse }; contracts = co.contracts; }
      wh.cap += R.capDelta; wh.xl += R.xlDelta;
      if (R.coldCapMax != null) wh.cold = Math.min(wh.cold, R.coldCapMax);
      if (wh.frozen == null) wh.frozen = R.coldCapMax === 0 ? 0 : (wh.cold > 0 ? D.WAREHOUSE.frozen : 0);
      if (R.frozenCapMax != null) wh.frozen = Math.min(wh.frozen, R.frozenCapMax);
      this.warehouse = wh;
      this.cash = Math.round((co.cash + R.cashDelta) * R.cashMult);
      this.contracts = contracts.map(s => {
        const c = this._makeContract(this.resolveCenter(s.carrier, s.grade || 'normal'), null, null, true);
        if (s.calls != null) c.calls = Math.min(c.maxCalls, s.calls + R.startCallsDelta);
        return c;
      });
      while (this.contracts.length < D.CONTRACT_SLOTS) this.contracts.push(null);
      this.startContractIds = this.contracts.filter(Boolean).map(c => c.id);
    }

    // ----- 고객(화주) (docs/CUSTOMER_DESIGN.md 2장) -----
    _initCustomers() {
      const R = this.rules, co = this.company;
      let list = co.customers;
      if (!list) { const pool = this.rng.shuffle(Object.keys(M.CUSTOMERS).filter(k => k !== 'anon')).slice(0, 3); list = pool.map(k => [k, this.rng.int(3)]).concat([['anon', 0]]); }
      for (const k of R.forceCustomers) if (!list.some(x => x[0] === k)) list = list.concat([[k, 0]]);
      if (R.noAnon) list = list.filter(x => x[0] !== 'anon');
      this.customers = {};
      for (const [id, lv] of list) {
        const c = this.customers[id] || (this.customers[id] = { id, xp: 0, slots: 0, suspended: false, streak: 0, perkApplied: {}, month: this._emptyCustMonth(), total: { delivered: 0, revenue: 0, claims: 0, discarded: 0 } });
        c.slots++; c.xp = Math.max(c.xp, M.CUSTOMER_LEVELS[lv] || 0);
      }
      for (const id in this.customers) this._applyCustomerPerks(id);
      // 대형 계약: 고객 1명이 물량 60%
      if (R.bigCustomer) { const cands = Object.keys(this.customers).filter(id => id !== 'anon' && !M.CUSTOMERS[id].storage); this.bigCustomer = cands.length ? this.rng.pick(cands) : null; if (this.bigCustomer) this.say('log.bigCustomer', { name: M.CUSTOMERS[this.bigCustomer].name }); }
    }
    // 마켓 신규 고객 계약
    addCustomer(id) {
      if (!M.CUSTOMERS[id] || this.customers[id]) return false;
      this.customers[id] = { id, xp: 0, slots: 1, suspended: false, streak: 0, perkApplied: {}, month: this._emptyCustMonth(), total: { delivered: 0, revenue: 0, claims: 0, discarded: 0 } };
      this._applyCustomerPerks(id); this.stats.customersAdded++;
      return true;
    }
    customerCount() { return Object.keys(this.customers).filter(id => id !== 'anon').length; }
    _emptyCustMonth() { return { delivered: 0, revenue: 0, claims: 0, discarded: 0, lvStart: 0 }; }
    customerLevel(id) { const c = this.customers && this.customers[id]; if (!c || c.suspended) return 0; let lv = 0; for (let i = 1; i < M.CUSTOMER_LEVELS.length; i++) if (c.xp >= M.CUSTOMER_LEVELS[i]) lv = i; return lv; }
    customerNext(id) { const lv = this.customerLevel(id); const c = this.customers[id]; return lv >= M.CUSTOMER_LEVELS.length - 1 ? null : { need: M.CUSTOMER_LEVELS[lv + 1], have: Math.max(0, c.xp) }; }
    customerPerk(id, key) { const cust = M.CUSTOMERS[id]; if (!cust || !cust.perks) return null; const lv = this.customerLevel(id); let v = null; for (const l of [2, 3]) if (lv >= l && cust.perks[l] && cust.perks[l][key] != null) v = cust.perks[l][key]; return v; }
    // 창고에 직접 적용되는 혜택(냉장·초대형)은 단계 도달 시 더하고, 거래 중단 시 뺀다
    _applyCustomerPerks(id) {
      const cust = M.CUSTOMERS[id], c = this.customers[id]; if (!cust || !cust.perks) return;
      for (const l of [2, 3]) { const pk = cust.perks[l]; if (!pk) continue; const should = this.customerLevel(id) >= l; const has = !!c.perkApplied[l];
        if (should && !has) { if (pk.cold) this.warehouse.cold += pk.cold; if (pk.xl) this.warehouse.xl += pk.xl; c.perkApplied[l] = true; }
        else if (!should && has) { if (pk.cold) this.warehouse.cold = Math.max(0, this.warehouse.cold - pk.cold); if (pk.xl) this.warehouse.xl = Math.max(0, this.warehouse.xl - pk.xl); c.perkApplied[l] = false; } }
    }
    _custXp(id, delta, why) {
      const c = this.customers && this.customers[id]; if (!c || id === 'anon') return;
      const before = this.customerLevel(id);
      c.xp += delta;
      if (c.xp < 0) { c.xp = 0; if (!c.suspended) { c.suspended = true; this.say('log.custSuspend', { name: M.CUSTOMERS[id].name, why }); this.emit('custSuspend', { customer: id }); } }
      const after = this.customerLevel(id);
      if (after !== before) { this._applyCustomerPerks(id); this._assignCold(); if (after > before) { this.say('log.custLevel', { name: M.CUSTOMERS[id].name, level: after }); this.emit('custLevel', { customer: id, level: after }); if (after >= 3) this.stats.customerL3++; } }
    }
    // 폐기 시 손해배상 (부패·반송·도난·파손 공통)
    _claim(p, why, kind) {
      const R = this.rules, id = p.customer || 'anon', cust = M.CUSTOMERS[id] || M.CUSTOMERS.anon, c = this.customers && this.customers[id];
      const full = Math.round(this.baseReward(p.type, p.baseSize) * cust.claimMult * R.claimMult * (R.customerClaimMult[id] || 1));
      const covered = Math.round(full * this.coverRate(kind || 'discard', p));
      const amount = full - covered;
      if (covered > 0) { this.monthStats.insClaims++; this.monthStats.covered += covered; }
      this.cash -= amount; this.monthStats.claims += amount; this.run.spent += amount; this.stats.claims += amount;
      if (c) { c.month.claims += amount; c.month.discarded++; c.total.claims += amount; c.total.discarded++; }
      this.say('log.claim', { amount, name: cust.name, why, covered: covered ? MSG('log.claimCovered', { covered }) : '' });
      this.emit('claim', { parcel: p, amount, covered, customer: id, why });
      this._custXp(id, -3, why);
    }
    // 처리 시 고객 보너스·xp. delivered: 이 호출로 처리한 같은 고객 택배들
    _custDeliver(p, r, onTime, group) {
      const id = p.customer || 'anon', cust = M.CUSTOMERS[id] || M.CUSTOMERS.anon, c = this.customers && this.customers[id];
      const lv = this.customerLevel(id); let bonus = M.CUSTOMER_BONUS[lv] || 0, xp = onTime ? 1 : 0, ruleHit = false;
      const rd = this.customerPerk(id, 'rewardDelta'); if (rd) bonus += rd;
      const rule = cust.rule;
      if (rule && onTime) {
        if (rule.kind === 'sameTurn' && p.age === 0) { bonus += rule.bonus; ruleHit = true; }
        else if (rule.kind === 'bundle' && group.length >= rule.min) { bonus += Math.round(r * (rule.mult - 1)); ruleHit = true; }
        else if (rule.kind === 'streak' && c) { c.streak++; if (c.streak % rule.n === 0) { bonus += rule.bonus; ruleHit = true; } }
        else if (rule.kind === 'sameArrival' && group.length >= 2 && group.filter(q => q.arrivalTurn === p.arrivalTurn).length >= 2 && group.find(q => q.arrivalTurn === p.arrivalTurn) === p) { bonus += rule.bonus; ruleHit = true; }
        else if (rule.kind === 'frozenSafe' && p.type === 'frozen') { bonus += rule.bonus; ruleHit = true; }
        else if (rule.kind === 'coldCustoms' && this._attrs(p).includes('customs') && p.coldDuringCustoms) { bonus += rule.bonus; ruleHit = true; }
        else if (rule.kind === 'customsFast') { ruleHit = true; }
        else if (rule.kind === 'secure' && this._attrs(p).includes('customs') && !p.outdoorDuringCustoms) { bonus += rule.bonus; ruleHit = true; }
        else if (rule.kind === 'harvest' && p.age <= 1) { bonus += rule.bonus; ruleHit = true; }
      }
      if (ruleHit) xp += 1;
      if (c) { c.month.delivered++; c.total.delivered++; }
      if (xp) this._custXp(id, xp, MSG('why.delivered'));
      return bonus;
    }
    _custRevenue(p, amount) { const c = this.customers && this.customers[p.customer || 'anon']; if (c) { c.month.revenue += amount; c.total.revenue += amount; } }
    _customerWeightsFor(m) {
      const R = this.rules, w = {};
      for (const id in this.customers) { const c = this.customers[id]; if (c.suspended) continue; const vol = id === 'anon' ? 1 : M.CUSTOMER_VOLUME[this.customerLevel(id)]; w[id] = c.slots * vol * (R.customerWeights[id] || 1); if (this.insurer === 'none' && M.CUSTOMERS[id].claimMult >= 2) w[id] *= 0.5; if (M.CUSTOMERS[id].storage) delete w[id]; }
      if (this.bigCustomer && w[this.bigCustomer] != null) { const rest = Object.keys(w).filter(k => k !== this.bigCustomer).reduce((s, k) => s + w[k], 0); w[this.bigCustomer] = rest > 0 ? rest * 1.5 : 1; }
      if (!Object.keys(w).length) w.anon = 1;
      return w;
    }
    // 다음 달 고객별 예상 물량 (대략): 총 입고 × 고객 가중치 비율. 특수 비중은 단계로
    customerForecast(m) {
      m = m || this.month + (this.phase === 'market' && !(this.market && this.market.prep) ? 1 : 0);
      const R = this.rules;
      const total = Math.round((D.TURNS_PER_MONTH + this._extraArrivals(Math.min(m, 6)) * R.arrivalsMult + (R.arrivalsMult > 1 ? 10 * (R.arrivalsMult - 1) : 0)) * (R.burstTurns ? 1 : 1)) + (R.burstTurns || 0);
      const w = this._customerWeightsFor(m); const sum = Object.values(w).reduce((a, b) => a + b, 0) || 1;
      const ratio = this._typeRatio(m);
      return Object.keys(w).map(id => {
        const share = w[id] / sum, n = total * share, lv = this.customerLevel(id), cust = M.CUSTOMERS[id];
        const special = id === 'anon' || !cust.items ? Math.max(0, 1 - (ratio.normal || 0) / Object.values(ratio).reduce((a, b) => a + b, 0)) : (lv === 0 ? 0 : lv === 1 ? 0.3 : 1);
        // 종류별 비중: 특수 전체 비중(special)을 고객 품목 가중치(또는 익명은 월별 비율)로 나눔
        const tw = {};
        if (cust.items) { for (const k of Object.keys(cust.items)) { const t = M.CUSTOMER_ITEMS[k] ? M.CUSTOMER_ITEMS[k].type : k; if (t !== 'normal') tw[t] = (tw[t] || 0) + cust.items[k]; } }
        else for (const t of Object.keys(ratio)) if (t !== 'normal' && ratio[t] > 0) tw[t] = ratio[t];
        const tsum = Object.values(tw).reduce((a, b) => a + b, 0) || 1;
        // 종류별 예상 개수 범위(대략): 기대값 ±1, 특수 전체가 0이면 표시 안 함
        const types = Object.keys(tw), pct = {}, range = {};
        for (const t of types) { pct[t] = special * tw[t] / tsum; const e = n * pct[t]; range[t] = [Math.max(0, Math.floor(e - 1)), Math.ceil(e + 1)]; }
        const normalE = n * (1 - special); range.normal = [Math.max(0, Math.floor(normalE - 1)), Math.ceil(normalE + 1)];
        return { id, level: lv, min: Math.max(0, Math.floor(n - 1)), max: Math.ceil(n + 1), special, types, pct, range };
      }).sort((a, b) => b.max - a.max);
    }
    customerSummary() { return Object.keys(this.customers || {}).map(id => ({ id, ...M.CUSTOMERS[id], level: this.customerLevel(id), xp: this.customers[id].xp, suspended: this.customers[id].suspended, month: this.customers[id].month, total: this.customers[id].total, next: this.customerNext(id), slots: this.customers[id].slots })); }

    // ----- 보험 (docs/CUSTOMER_DESIGN.md 5장) -----
    coverRate(kind, p) {
      const ins = M.INSURERS[this.insurer]; if (!ins || !ins.cover) return kind === 'stolen' && this.items.yardIns === this.month ? 1 : 0;
      const c = ins.cover; let r = 0;
      if (c.all != null) r = c.all;
      else if (c.attrs) { r = c.other || 0; for (const a of this._attrs(p)) if (c.attrs[a] != null) r = Math.max(r, c.attrs[a]); }
      else if (c.kinds) r = c.kinds[kind] != null ? c.kinds[kind] : (c.other || 0);
      if (this.coverHalf) r /= 2;
      if (kind === 'stolen' && this.items.yardIns === this.month) r = 1;
      return r;
    }
    premiumBase(id) { id = id || this.insurer; const ins = M.INSURERS[id]; if (!ins || !ins.fee) return 0; return Math.max(0, Math.round((ins.fee + (this.rules.premiumDelta[id] || 0)) * this.rules.premiumMult)); }
    premium(id) { return id && id !== this.insurer ? this.premiumBase(id) : Math.round(this.premiumBase() * this.premMult); }
    // 마켓에서 갈아타기: 새 보험사의 기본 보험료를 가입비로 낸다
    setInsurer(id) {
      if (this.phase !== 'market') return { ok: false, msg: T('err.marketOnly') };
      if (!M.INSURERS[id]) return { ok: false, msg: T('err.noInsurer') };
      if (id === this.insurer) return { ok: false, msg: T('err.alreadyInsured') };
      if (this.rules.noInsurance && this.month < 2) return { ok: false, msg: T('err.startupNoInsurance') };
      const cost = this.premiumBase(id);
      if (this.cash < cost) return { ok: false, msg: T('err.noCash') };
      this.cash -= cost; this.run.spent += cost;
      this.insurer = id; this.premMult = 1; this.noClaimMonths = 0; this.coverHalf = false;
      this.say('log.insurerChange', { name: M.INSURERS[id].name, fee: cost ? MSG('log.insurerFee', { cost }) : '' });
      return { ok: true };
    }
    _settlePremium() {
      const ms = this.monthStats; if (this.insurer === 'none') return 0;
      const prem = this.premium();
      this.cash -= prem; ms.premium = prem; this.run.spent += prem; this.stats.premiumPaid += prem;
      const n = ms.insClaims;
      if (n === 0) { this.noClaimMonths++; this.premMult = this.noClaimMonths >= 2 ? 0.7 : 0.8; this.coverHalf = false; if (this.noClaimMonths >= 2) { for (const id in this.customers) this._custXp(id, 1, MSG('why.noClaim')); ms.noClaimBonus = true; this.stats.noClaim2 = true; } }
      else { this.noClaimMonths = 0; for (const [max, mult] of M.PREMIUM_STEPS) if (n <= max) { this.premMult = mult; break; } this.coverHalf = n >= 5; }
      return prem;
    }

    // ----- 보관 계약 (3장) -----
    storageVol(s) { const d = M.CUSTOMERS[s.customer] && this.customerPerk(s.customer, 'storageVolDelta') || 0; return Math.max(1, s.vol + d); }
    storageVolume() { return this.storage.reduce((v, s) => v + this.storageVol(s), 0); }
    _maybeOffer(force) {
      const R = this.rules;
      if (this.offer || this.storage.length >= R.storageMax) return;
      const custs = Object.keys(this.customers).filter(id => M.CUSTOMERS[id].storage && !this.customers[id].suspended);
      if (!custs.length && !R.storageAnon) return;
      if (!force && this.rng.next() >= R.storageOfferProb * (this.seasonMods().storageMult || 1)) return;
      const customer = custs.length ? this.rng.pick(custs) : 'anon';
      const w = {}; for (const k in M.STORAGE_KINDS) { const K = M.STORAGE_KINDS[k]; const wt = R.eventGoods && K.peakWeight ? K.peakWeight : K.weight; if (wt > 0) w[k] = wt; }
      const kind = this.rng.weighted(w), K = M.STORAGE_KINDS[kind];
      const vol = K.vol[0] + this.rng.int(K.vol[1] - K.vol[0] + 1), turns = K.turns[0] + this.rng.int(K.turns[1] - K.turns[0] + 1);
      const feeMult = R.storageFeeMult * (this.seasonMods().storageFeeMult || 1) * (1 + (this.customerPerk(customer, 'storageFee') || 0));
      let fee = 0, perTurn = 0;
      if (K.perVolTurn) fee = Math.round(vol * turns * K.perVolTurn * feeMult);
      else if (K.perTurn) perTurn = Math.round(K.perTurn * feeMult);
      else fee = Math.round(K.fee * feeMult);
      this.offer = { id: this.nextId++, kind, vol, turns, fee, perTurn, customer, expires: this.totalTurn + 1 };
      this.say('log.storageOffer', { name: M.CUSTOMERS[customer].name, kind: K.name, vol, turns, pay: fee ? MSG('log.storagePrepaid', { fee }) : MSG('log.storagePerTurn', { perTurn }) });
      this.emit('offer', { offer: this.offer });
    }
    acceptOffer() {
      if (this.phase !== 'play' || !this.offer) return { ok: false, msg: T('err.noOffer') };
      const o = this.offer;
      if (o.vol > this.warehouse.cap) return { ok: false, msg: T('err.offerTooBig') };
      this.storage.push({ id: o.id, kind: o.kind, vol: o.vol, turns: o.turns, left: o.turns, fee: o.fee, perTurn: o.perTurn, customer: o.customer, outdoor: false });
      this.cash += o.fee; this.monthStats.storageIncome += o.fee; this.run.revenue += o.fee;
      this.offer = null; this._assignCold();
      this.say('log.storageAccept', { kind: M.STORAGE_KINDS[o.kind].name, vol: o.vol, fee: o.fee });
      this.emit('storageStart', { storage: this.storage[this.storage.length - 1] });
      return { ok: true, fee: o.fee };
    }
    declineOffer() { if (!this.offer) return false; this.say('log.storageDecline'); this.offer = null; return true; }
    returnStorage(id) {
      const s = this.storage.find(x => x.id === id); if (!s) return { ok: false, msg: T('err.noStorage') };
      const refund = Math.round(s.fee * s.left / s.turns), pen = 30, cost = refund + pen;
      this.feesDue += cost; this.run.spent += cost; this.monthStats.storageIncome -= refund;
      this.storage.splice(this.storage.indexOf(s), 1);
      this.outdoorPref = this.outdoorPref.filter(x => x !== 's' + s.id);
      this._custXp(s.customer, -1, MSG('why.earlyReturn')); this._assignCold();
      this.say('log.storageEarlyReturn', { refund, pen });
      return { ok: true, cost };
    }
    _tickStorage(reasons) {
      for (const s of this.storage.slice()) {
        s.left--;
        if (s.left <= 0) {
          this.storage.splice(this.storage.indexOf(s), 1);
          let pay = 0; if (s.perTurn) { pay = s.perTurn * s.turns; this.cash += pay; this.monthStats.storageIncome += pay; this.run.revenue += pay; }
          this._custXp(s.customer, 2, MSG('why.storageDone')); this.stats.storageDone++;
          this.say('log.storageCollect', { kind: M.STORAGE_KINDS[s.kind].name, pay: pay ? MSG('log.storagePostpaid', { pay }) : '' });
          this.emit('storageEnd', { storage: s, pay });
        }
      }
    }

    // ----- 날씨 (4.4장) -----
    // 물가: 임대·인건비·배차비가 매달 D.OPCOST_INFLATION씩 오른다 (수입이 커지는 만큼 지출 폭도 커진다)
    inflation(m) { m = m || this.month; let k = 0; for (let i = 1; i < m; i++) if (!this.seasonMods(i).noInflation) k++; return Math.pow(D.OPCOST_INFLATION, k); }
    // 달력 월(1~12): 런은 D.START_MONTH(3월)에 시작
    // 나라별 달력 (docs/STORY_TUTORIAL_DESIGN.md 5장): 달마다 입고 배수·품목 이동·날씨·이벤트
    calendar() { return M.CALENDARS[this.rules.calendar] || M.CALENDARS.kr; }
    calMonth(m) { m = m || this.month; const start = this.rules.startMonth || this.calendar().startMonth || D.START_MONTH; return ((start - 1 + m - 1) % 12) + 1; }
    seasonMods(m) { return this.calendar().months[this.calMonth(m)] || { arrivalsMult: 1, typeShift: {} }; }
    // 이번 달(개월차 m)의 달력 이벤트 목록 [{ id, turns: [a, b], ... }]
    monthEvents(m) { return (this.seasonMods(m).events || []).slice(); }
    // 특정 턴에 걸린 이벤트들
    eventsAt(turn, m) { turn = turn || this.turn; return this.monthEvents(m).filter(e => turn >= e.turns[0] && turn <= e.turns[1]); }
    isOffTurn(turn, m) { return this.eventsAt(turn, m).some(e => e.noCalls); }
    isRushTurn(turn, m) { return this.eventsAt(turn, m).some(e => e.arrivalsMult && e.arrivalsMult > 1); }
    // 런 전체의 달력: 개월차 순서대로 [{ m, cal, icon, events }]
    calendarMonths() { const out = []; const n = this.rules.endless ? 12 : Math.min(12, this.rules.months); for (let m = 1; m <= n; m++) { const cal = this.calMonth(m), sm = this.seasonMods(m); out.push({ m, cal, icon: sm.icon || '', arrivalsMult: sm.arrivalsMult || 1, events: (sm.events || []).map(e => ({ id: e.id, turns: e.turns })) }); } return out; }
    returnGraceFor(p) { const R = this.rules; return Math.max(1, (this._attrs(p).includes('cold') ? R.returnGraceFresh : R.returnGrace) + (this.seasonMods().returnGraceDelta || 0)); }
    season(m) { const R = this.rules; if (R.season) return R.season; const c = this.calMonth(m); return c >= 3 && c <= 5 ? 'spring' : c >= 6 && c <= 8 ? 'summer' : c >= 9 && c <= 11 ? 'autumn' : 'winter'; }
    _genWeather(m) {
      const R = this.rules, w = Object.assign({}, M.WEATHER_BY_SEASON[this.season(m)]);
      const cw = this.seasonMods(m).weather || {}; for (const k in cw) w[k] = (w[k] || (cw[k] > 1 ? 10 : 0)) * cw[k];
      for (const k in R.weatherWeights) w[k] = (w[k] || (R.weatherWeights[k] > 1 ? 10 : 0)) * R.weatherWeights[k];
      const out = []; let storm = false;
      for (let t = 0; t < D.TURNS_PER_MONTH; t++) { let k = this.rng.weighted(w); if (k === 'storm' && (storm || t >= D.TURNS_PER_MONTH - 1 || t === 0)) k = 'sunny'; if (k === 'storm') storm = true; out.push(k); }
      for (const t of this.heatTurns) out[t - 1] = 'heat';
      return out;
    }
    weatherAt(turn) { return (this.weather && this.weather[turn - 1]) || 'sunny'; }
    weatherNow() { return this.weatherAt(this.turn); }
    isHeatTurn() { return this.weatherNow() === 'heat'; }
    isWet(p) { return !!p.wet; }

    // ----- 적재 (4장) -----
    // 창고 안 우선순위: 급한 순. 야외 후보는 덜 급한 것부터
    _urgencyKey(p) { return (p.overdue ? -10 : 0) + p.deadline + (p.customs || 0) - (this._attrs(p).includes('cold') || this._attrs(p).includes('frozen') ? 3 : 0); }
    setOutdoor(ids) {
      if (this.phase !== 'play') return { ok: false };
      this.outdoorPref = (ids || []).slice();
      this._assignCold();
      return { ok: true };
    }
    // 프리셋: 창고 안 우선순위 정렬 키. 야외로 나갈 것(뒤쪽부터)을 돌려준다
    presetOutdoor(kind, customer) {
      const cap = this.warehouse.cap;
      const list = this.parcels.slice();
      const key = kind === 'reward' ? p => -(p.reward) : kind === 'claim' ? p => -(25 + p.baseSize * 15) * (M.CUSTOMERS[p.customer || 'anon'] || M.CUSTOMERS.anon).claimMult
        : kind === 'customer' ? p => ((p.customer === customer) ? 0 : 1) * 100 + this._urgencyKey(p) : p => this._urgencyKey(p);
      list.sort((a, b) => key(a) - key(b) || b.size - a.size);
      let vol = this.storageVolume(), xl = 0; const out = [];
      for (const p of list) { const add = p.size + (p.baseSize >= 7 && ++xl > this.warehouse.xl ? this.rules.xlPenalty : 0); if (vol + add <= cap) vol += add; else out.push(p.id); }
      return out;
    }

    // ----- helpers -----
    // 계약 = 배차 계약: calls/maxCalls = 이번 달 남은 배차 대수 / 월 배차 한도 (docs/BALANCE_DESIGN.md 1장)
    // 계열 이름(bulk…) + 등급 → 센터 id. 이미 센터 id면 그대로
    resolveCenter(k, grade) { if (D.CARRIERS[k]) return k; return D.centerFor(k, Math.max(0, GRADE_RANK.indexOf(grade || 'normal'))) || k; }
    isBanned(k) { return this.rules.banCarriers.includes(k) || this.rules.banCarriers.includes(FAM(k)); }
    _makeContract(carrier, grade, calls, isStart) {
      carrier = this.resolveCenter(carrier, grade);
      const c = D.CARRIERS[carrier], R = this.rules; grade = c.grade;
      const maxCalls = Math.max(1, c.trucks + R.callsDelta + (isStart ? R.startCallsDelta : 0) + (this.trustPerk(carrier, 'trucks') || 0));
      return { id: this.nextId++, carrier, grade, maxCalls, calls: calls == null ? maxCalls : calls,
        enh: { limit: 0, cap: 0, regular: false, express: false, opt: null, capDelta: 0 }, successCalls: 0, totalCalls: 0, delivered: 0 };
    }
    // 신뢰도 특성: 현재 단계까지의 효과를 합친다 (뒤 단계가 같은 키를 덮는다)
    trustPerk(carrier, key) {
      const lv = this.trustLevel(carrier), perks = D.TRUST_PERKS[FAM(carrier)] || []; let v = null;
      for (let i = 0; i < Math.min(lv, perks.length); i++) if (perks[i][key] != null) v = perks[i][key];
      return v;
    }
    trustPerkAny(key) { let v = 0; for (const k of Object.keys(D.CARRIERS)) { const x = this.trustPerk(k, key); if (x) v += x; } return v; }
    trustPerkMap(key, sub) { let v = 0; for (const k of Object.keys(D.CARRIERS)) { const m = this.trustPerk(k, key); if (m && m[sub]) v += m[sub]; } return v; }
    // 신뢰도 xp 추가 + 단계 상승 처리 (창고 구역 혜택 적용, 이벤트)
    _addTrust(carrier, xp, silent) {
      if (!xp) return;
      const before = this.trustLevel(carrier);
      this.trust[carrier] = (this.trust[carrier] || 0) + xp;
      const after = this.trustLevel(carrier);
      if (after > before) {
        this.trustPerkApplied = this.trustPerkApplied || {};
        for (let lv = before + 1; lv <= after; lv++) {
          const pk = (D.TRUST_PERKS[FAM(carrier)] || [])[lv - 1] || {}; const key = carrier + ':' + lv;
          if (!this.trustPerkApplied[key]) { this.trustPerkApplied[key] = true; if (pk.coldZone && this.warehouse) this.warehouse.cold += pk.coldZone; if (pk.frozenZone && this.warehouse) this.warehouse.frozen = (this.warehouse.frozen || 0) + pk.frozenZone; }
          if (!silent) { this.say('log.trustUp', { name: D.CARRIERS[carrier].name, level: lv, effect: D.trustEffectText(carrier, lv) }); this.emit('trustup', { carrier, level: lv }); }
        }
        if (after >= 3) this.stats.trustL3++;
        if (this.parcels) this._assignCold();
      }
    }
    hasPerk(p) { return this.perks.includes(p); }
    // 로그는 {k, p} 메시지 객체로 저장하고 표시할 때 I18n.text() 로 렌더링한다 (옛 세이브의 문자열 항목도 그대로 표시됨)
    say(k, p) { this.log.unshift(p === undefined ? { k } : { k, p }); if (this.log.length > 60) this.log.pop(); }
    static logText(entry) { return I18n.text(entry); }
    emit(type, data) { this.events.push({ type, ...data }); }
    takeEvents() { const e = this.events; this.events = []; return e; }

    trustXp(c) { return this.trust[typeof c === 'string' ? c : c.carrier] || 0; }
    trustLevel(c) { const xp = this.trustXp(c); let lv = 0; for (let i = 1; i < D.TRUST_LEVELS.length; i++) if (xp >= D.TRUST_LEVELS[i]) lv = i; return lv; }
    trustNext(c) { const lv = this.trustLevel(c), k = typeof c === 'string' ? c : c.carrier; return lv >= 3 ? null : { need: D.TRUST_LEVELS[lv + 1], have: this.trustXp(c), effect: D.trustEffectText(k, lv + 1) }; }
    // 이 호출로 얻을 신뢰도 경험치 예상 (정상 처리 +1, 적재 효율 80% 이상 +1)
    trustGainPreview(c, volume, trucks) {
      const R = this.rules, cap = this.vehicleCap(c) * Math.max(1, trucks || 1);
      let xp = 1; const parts = [T('xp.base')];
      if (volume >= cap * 0.8) { xp++; parts.push(T('xp.cap80')); }
      if (c.carrier === 'cold' && R.coldTrustBonus) { xp += R.coldTrustBonus; parts.push(T('xp.coldChain')); }
      xp = Math.round((xp + R.trustXpDelta) * R.trustXpMult);
      return { xp, parts };
    }
    selfCount() { return Math.max(1, D.SELF_DELIVERY.count + this.rules.selfCapDelta + (this.warehouse.bigvan ? 1 : 0) + (this.warehouse.driver ? 1 : 0)); }
    selfCost(p) { return D.SELF_DELIVERY.costBase + D.SELF_DELIVERY.costPerSize * p.size; }
    selfCapacity() { return this.selfCount(); }
    selfSizeMax() { return this.warehouse.bigvan ? 4 : D.SELF_DELIVERY.sizeMax; }
    // 자체 배송 가능: 크기 범위 안이고 속성마다 차량이 있어야 (❄❆ 냉동 탑차, ⚠ 완충 포장차, 🛃 통관 끝난 뒤)
    selfCan(p) {
      if (p.size > this.selfSizeMax()) return false;
      for (const a of this._attrs(p)) { if ((a === 'cold' || a === 'frozen') && !this.warehouse.coldvan) return false; if (a === 'fragile' && !this.warehouse.padvan) return false; if (a === 'customs' && (p.customs || 0) > 0) return false; }
      return true;
    }
    selfBlockReason(p) { if (p.size > this.selfSizeMax()) return T('self.needBigVan'); for (const a of this._attrs(p)) { if ((a === 'cold' || a === 'frozen') && !this.warehouse.coldvan) return T('self.needColdVan'); if (a === 'fragile' && !this.warehouse.padvan) return T('self.needPadVan'); if (a === 'customs' && (p.customs || 0) > 0) return T('self.customsWait'); } return null; }
    // 자체 배송 대상: 대기열 앞의 일반 택배를 부피 한도(칸)까지
    selfEligible() { return this.parcels.filter(p => this.selfCan(p)); }
    canSelfDeliver() { return this.phase === 'play' && this.selfEligible().length > 0; }
    // 대기했을 때 다음 턴 예상: 창고 사용량, 기한 초과·부패 예정
    forecast() {
      const R = this.rules, nxt = this.schedule[this.turn] || [];
      let incoming = 0; for (const s of nxt) { let sz = s.size + R.sizeDelta; if (s.size >= 4) sz += R.bigSizeDelta; incoming += Math.max(1, sz); }
      let overdue = 0, spoil = 0, frozenOver = 0;
      const heat = this.isHeatTurn();
      { let free = (this.warehouse.frozen || 0) - this.frozenUsed(); for (const s of nxt) if (s.type === 'frozen') { if (s.size > free) frozenOver++; else free -= s.size; } }
      for (const p of this.parcels) {
        if (!p.overdue && p.deadline - 1 <= 0) overdue++;
        if (p.type === 'fresh' && !p.inCold && (heat || (p.warm || 0) + 1 >= R.warmLimit)) spoil++;
        if (this._attrs(p).includes('frozen') && !p.inFrozen) spoil++;
      }
      return { used: this.usedVolume() + incoming, cap: this.warehouse.cap, incoming, count: nxt.length, overdue, spoil, frozenOver, monthEnd: this.turn >= D.TURNS_PER_MONTH };
    }
    contractName(c) { return D.CARRIERS[c.carrier].name; }
    isStruck(c) { return this.rules.strike && this.strikeCarrier === c.carrier; }

    // 차량 한 대의 용량(칸): 업체 + 등급 + 적재 보강 + 특약 + 신뢰 특성 + 회사·고객 보정. 대기 보너스(스킵·짠돌이 대기 누적·첫 호출)는 칸으로 더해진다
    vehicleCap(c) {
      const R = this.rules;
      let cap = D.CARRIERS[c.carrier].cap + c.enh.cap + c.enh.capDelta + (famVal(R.carrierCapDelta, c.carrier) || 0) + (this.trustPerk(c.carrier, 'cap') || 0);
      for (const id in this.customers || {}) { const cc = this.customerPerk(id, 'carrierCap'); const d = famVal(cc, c.carrier); if (d) cap += d; }
      if (R.skipBonus && this.waitedLastTurn) cap += R.skipBonus;
      if (R.waitStack) cap += Math.min(R.waitStack, this.waitStack);
      if (R.firstCallBonus && this.monthStats && this.monthStats.calls === 0) cap += R.firstCallBonus;
      return Math.max(1, cap);
    }
    baseCapacity(c) { return this.vehicleCap(c); }
    callCapacity(c) { return this.vehicleCap(c) * this.simulMax(c); }
    // 한 호출에 부를 수 있는 최대 대수
    simulMax(c) { return Math.max(1, Math.max(D.CARRIERS[c.carrier].simul || 1, this.trustPerk(c.carrier, 'simul') || 1) + (c.enh.express ? 1 : 0)); }
    // 대당 배차비
    truckFee(c) {
      const R = this.rules, car = D.CARRIERS[c.carrier];
      let fee = R.feeFixed != null ? R.feeFixed : car.fee;
      let evMult = 1; for (const ev of this.eventsAt()) { const m = famVal(ev.feeMult, c.carrier); if (m) evMult *= m; }
      fee = fee * (this.trustPerk(c.carrier, 'feeMult') || 1) * R.feeMult * evMult * this.inflation() + R.feeDelta;
      return Math.max(0, Math.round(fee));
    }
    // 이 호출의 배차비 (월 첫 배차 무료 강화 반영)
    callFee(c, trucks) { const free = c.enh.regular && !c.freeUsedMonth ? 1 : 0; return Math.max(0, trucks - free) * this.truckFee(c); }
    trucksNeeded(c, volume) { return Math.max(1, Math.ceil(volume / this.vehicleCap(c))); }
    capacityBonusNote(c) {
      const R = this.rules, notes = [];
      if (R.skipBonus && this.waitedLastTurn) notes.push(T('note.skip'));
      if (R.waitStack && this.waitStack) notes.push(T('note.waitStack', { n: Math.min(R.waitStack, this.waitStack) }));
      if (R.firstCallBonus && this.monthStats && this.monthStats.calls === 0) notes.push(T('note.firstCall'));
      if (c.enh.regular && !c.freeUsedMonth) notes.push(T('note.regular'));
      return notes;
    }
    // ----- 능력 매칭 (CARRIER_CAPABILITY_DESIGN v0.2) -----
    contractCaps(c) { const car = D.CARRIERS[c.carrier]; const caps = car.caps.slice(); if (c.enh.opt) { const a = D.ENHANCEMENTS[c.enh.opt].attr; if (!caps.includes(a)) caps.push(a); } return caps; }
    contractSizeMax(c) { const car = D.CARRIERS[c.carrier]; const pk = this.trustPerk(c.carrier, 'sizeMax'); return pk ? Math.max(car.sizeMax, pk) : car.sizeMax; }
    // car: 업체 데이터, p: 택배(또는 {type,size,attrs,customs} 의사 택배), caps: 계약 단위 능력, sizeMax: 계약 단위 최대 크기
    _carrierAccepts(car, p, caps, sizeMax) {
      caps = caps || car.caps; sizeMax = sizeMax == null ? car.sizeMax : sizeMax;
      const attrs = (p.attrs || D.PARCEL_TYPES[p.type].attrs).filter(a => D.GATING_ATTRS.includes(a) || (car.need || []).includes(a));
      if (p.size < car.sizeMin || p.size > sizeMax) return false;
      if (car.onlyPlain && attrs.filter(a => D.GATING_ATTRS.includes(a)).length) return false;
      if (car.need && !car.need.some(a => attrs.includes(a))) return false;
      if (attrs.includes('frozen') && !caps.includes('frozen')) return false;
      if (attrs.includes('customs') && (p.customs || 0) > 0 && !caps.includes('customs')) return false;
      return true;
    }
    baseReward(type, size) { const t = D.PARCEL_TYPES[type] || D.PARCEL_TYPES.normal; const tb = t.reward || {}; return tb[size] != null ? tb[size] : 25 + size * 15; }
    // 호출 화면 미리보기용 예상 보상(전문 보너스·신뢰 보상 포함, 파손·날씨 변수 제외)
    previewReward(c, p) {
      const R = this.rules, car = D.CARRIERS[c.carrier], t = D.PARCEL_TYPES[p.type];
      let r = p.reward + (R.rewardDelta[p.type] || 0) + R.rewardAll + this.trustPerkMap('rewardDelta', p.type);
      if (this.isSpecialist(car, p.type) && t.bonus) r += t.bonus + R.bonusDelta + (this.customerPerk(p.customer, 'bonusDelta') || 0) + this.trustPerkMap('bonusDelta', p.type);
      return Math.round(r * (R.rewardMult[p.type] || 1));
    }
    isSpecialist(car, type) { return Array.isArray(car.specialist) ? car.specialist.includes(type) : car.specialist === type; }
    canHandle(c, p) { return this._carrierAccepts(D.CARRIERS[c.carrier], p, this.contractCaps(c), this.contractSizeMax(c)); }
    // ⚠ 파손 확률: 능력에 fragile이 없으면
    breakProb(c, p) { const attrs = p.attrs || D.PARCEL_TYPES[p.type].attrs; if (!attrs.includes('fragile') || this.contractCaps(c).includes('fragile')) return 0; return Math.min(0.95, D.BREAK_PROB * this.rules.breakMult * (this.customerPerk(p.customer, 'breakMult') || 1)); }
    eligibleParcels(c) { return this.parcels.filter(p => this.canHandle(c, p)); }
    canCall(c) {
      if (!c || this.isStruck(c) || this.isOffTurn()) return false;
      if (c.calls <= 0 && !(this.rules.spareCall && !this.monthStats.spareUsed)) return false;
      return this.eligibleParcels(c).length > 0;
    }
    usedVolume() {
      let v = 0, xl = 0;
      for (const p of this.parcels) { v += p.size; if (p.baseSize >= 7) xl++; }
      if (xl > this.warehouse.xl) v += (xl - this.warehouse.xl) * this.rules.xlPenalty;
      return v + this.storageVolume();
    }
    coldUsed() { return this.parcels.filter(p => this._attrs(p).includes('cold')).reduce((s, p) => s + p.size, 0); }
    usage() { return this.usedVolume() / this.warehouse.cap; }
    _assignCold() {
      let left = this.warehouse.cold, fl = this.warehouse.frozen || 0;
      for (const p of this.parcels) {
        if (this._attrs(p).includes('frozen')) { if (p.size <= fl) { p.inFrozen = true; fl -= p.size; } else p.inFrozen = false; continue; }
        if (!this._attrs(p).includes('cold')) continue;
        if (p.size <= left) { p.inCold = true; left -= p.size; } else p.inCold = false;
      }
      // 🌾 농산물은 남는 냉장 자리에 들어가면 폭염을 피한다
      for (const p of this.parcels) { if (!this._attrs(p).includes('produce')) continue; if (p.size <= left) { p.inCold = true; left -= p.size; } else p.inCold = false; }
      this._assignOutdoor();
    }
    _attrs(p) { return p.attrs || D.PARCEL_TYPES[p.type].attrs; }
    frozenUsed() { return this.parcels.filter(p => this._attrs(p).includes('frozen')).reduce((s, p) => s + p.size, 0); }
    // 야외 적재: 플레이어 지정(outdoorPref) 먼저, 그래도 넘치면 덜 급한 것부터 밖으로. 냉장·냉동 구역 택배는 마지막
    _assignOutdoor() {
      const cap = this.warehouse.cap, pref = this.outdoorPref || [];
      for (const p of this.parcels) p.outdoor = false;
      for (const s of this.storage) s.outdoor = false;
      let inside = this.usedVolume();
      for (const s of this.storage) if (pref.includes('s' + s.id)) { s.outdoor = true; inside -= this.storageVol(s); }
      for (const p of this.parcels) if (pref.includes(p.id)) { p.outdoor = true; p.inCold = false; p.inFrozen = false; inside -= p.size; }
      if (inside <= cap) return;
      const zone = p => p.inCold || p.inFrozen;
      const cands = this.parcels.filter(p => !p.outdoor).sort((a, b) => (zone(a) - zone(b)) || (this._urgencyKey(b) - this._urgencyKey(a)) || (b.id - a.id));
      for (const p of cands) { if (inside <= cap) break; p.outdoor = true; p.inCold = false; p.inFrozen = false; inside -= p.size; }
    }
    outdoorParcels() { return this.parcels.filter(p => p.outdoor); }
    outdoorVolume() { return this.outdoorParcels().reduce((s, p) => s + p.size, 0) + this.storage.filter(s => s.outdoor).reduce((v, s) => v + this.storageVol(s), 0); }
    theftProb(weather) {
      const ov = this.outdoorVolume(); if (ov <= 0) return 0;
      const over = Math.max(1, Math.min(ov, this.usedVolume() - this.warehouse.cap));
      const wx = weather || this.weatherNow(); const wm = wx === 'snow' ? 0.5 : wx === 'storm' ? 2 : 1;
      for (const [max, pr] of D.THEFT_PROB) if (over <= max) return Math.min(0.95, pr * this.rules.theftMult * wm);
      return 0;
    }
    returnIn(p) { return p.overdue ? Math.max(0, this.returnGraceFor(p) - (p.overdueTurns || 0)) : null; }
    stressState() { for (const [max, id] of D.STRESS_STATES) if (this.stress <= max) return D.STRESS_NAMES[id]; return D.STRESS_NAMES.gameover; }
    monthsTotal() { return this.rules.endless ? Infinity : this.rules.months; }

    // ----- 월별 테이블 (무한 모드 확장 포함) -----
    // 고객 신뢰 단계에 따른 추가 입고: 단계가 오를수록 물량이 배 이상으로 는다
    _customerExtra() { let n = 0; for (const id in this.customers) { const c = this.customers[id]; if (id === 'anon' || c.suspended) continue; n += (M.CUSTOMER_EXTRA[this.customerLevel(id)] || 0) * (c.slots || 1); } return n; }
    // 달력 컷 시나리오(성수기·폭염·데일리)는 monthOffset 만큼 뒤 개월차의 표(입고·품목·등급·가격)를 쓴다 — 11월 컷이 1개월차 물량으로 시작하면 싱겁다
    tableMonth(m) { return (m || this.month) + (this.rules.monthOffset || 0); }
    _extraArrivals(m) { const tm = this.tableMonth(m); return Math.round((tm <= 6 ? D.EXTRA_ARRIVALS[tm] : D.EXTRA_ARRIVALS[6] + (tm - 6) * 2) * this.seasonMods(m).arrivalsMult) + this._customerExtra(); }
    _typeRatio(m) {
      const R = this.rules, sm0 = m; m = this.tableMonth(m);
      let base = { ...(D.TYPE_RATIO[Math.min(6, m)]) };
      if (m > 6) { const k = Math.min(6, m - 6); base.normal = Math.max(20, base.normal - k * 2); base.fresh += k / 2; base.fragile += k / 2; base.intl += k / 2; base.large += k / 2; }
      const sm = this.seasonMods(sm0).typeShift; for (const t in sm) base[t] = Math.max(0, (base[t] || 0) + sm[t]);
      if (R.typeOverride) base = { ...R.typeOverride };
      if (R.typeShift) for (const t in R.typeShift) base[t] = Math.max(0, (base[t] || 0) + R.typeShift[t]);
      return base;
    }
    _gradeProb(m) {
      const R = this.rules; m = this.tableMonth(m);
      const p = { ...(D.GRADE_PROB[Math.min(6, m)]) };
      if (m > 6) { p.master = 30; p.expert = 30; p.trusted = 30; p.normal = 10; }
      if (m < R.expertFrom) { p.normal += p.expert + p.master; p.expert = 0; p.master = 0; }
      if (R.gradeShift) { const s = Math.round(p.normal * R.gradeShift); p.normal -= s; p.trusted += s; }
      for (const g of ['trusted', 'expert', 'master']) if (R.marketWeight[g]) p[g] = Math.round(p[g] * R.marketWeight[g]);
      return p;
    }
    // 월말 정산 후 예상 자금: 현금 + 지연 입금 − 후불 배차비 − 운영비 − 보험료 − 차입 상환(원금+이자)
    projectedCash() {
      const pending = (this.pendingRevenue || []).reduce((s, x) => s + (x.amount || 0), 0);
      const op = this.opCostBreakdown(this.month).total;
      const prem = this.insurer === 'none' ? 0 : this.premium();
      const loan = this.debt > 0 ? this.debt + Math.ceil(this.debt * D.LOAN.interest) : 0;
      // 재고 수입 예상: 창고 택배 보상 합(기한 초과분은 -25%) — 이번 달 안에 보낼 것으로 본다
      const stock = this.parcels.reduce((s, p) => s + Math.round(p.reward * (p.overdue ? this.rules.overdueMult : 1)), 0);
      return { cash: this.cash, pending, stock, feesDue: this.feesDue, opCost: op, premium: prem, loan, total: this.cash + pending + stock - this.feesDue - op - prem - loan };
    }
    // 운영비 내역: 임대(기본/회사 고정/난이도·시나리오 보정) + 계약 유지비 + 시설 유지비
    opCostBreakdown(m, rentRoll) {
      const R = this.rules;
      let rent = R.opCostFixed != null ? R.opCostFixed : D.OPERATING_COST;
      if (R.opCostRandom) rent = rentRoll != null ? rentRoll : R.opCostRandom[0] + Math.floor((R.opCostRandom[1] - R.opCostRandom[0]) / 2);
      rent += R.opCostDelta;
      if (R.lateOpCost && m >= R.lateOpCost.from) rent += R.lateOpCost.delta;
      if (R.endless && m >= 12) rent += (m - 11) * 10;
      rent = Math.max(0, Math.round(rent * this.inflation(m)));
      const contracts = this.contracts.filter(Boolean).reduce((s, c) => s + (D.OPCOST_CONTRACT[c.grade] != null ? D.OPCOST_CONTRACT[c.grade] : D.OPCOST_CONTRACT.normal), 0);
      let facilities = 0; for (const f of Object.keys(D.FACILITIES)) if (this.warehouse[f]) facilities += D.FACILITIES[f].upkeep || 0;
      const arrivals = this.schedule ? this.schedule.reduce((s, t) => s + t.length, 0) : 0;
      const labor = Math.round(Math.max(0, arrivals - D.OPCOST_BASE_ARRIVALS) * D.OPCOST_PER_PARCEL * this.inflation(m));
      return { rent, contracts, facilities, labor, arrivals, total: rent + contracts + facilities + labor };
    }
    _opCost(m) {
      const R = this.rules;
      const roll = R.opCostRandom ? R.opCostRandom[0] + this.rng.int(R.opCostRandom[1] - R.opCostRandom[0] + 1) : null;
      const b = this.opCostBreakdown(m, roll); this._lastOpCost = b; return b.total;
    }

    // ----- flow -----
    _startMonth(m) {
      const R = this.rules;
      this.month = m; this.turn = 0;
      if (this.customers) for (const id in this.customers) { const c = this.customers[id]; if (c.suspended && m > 1) { c.suspended = false; c.xp = 0; this.say('log.custResume', { name: M.CUSTOMERS[id].name }); } c.month = this._emptyCustMonth(); c.month.lvStart = this.customerLevel(id); }
      this.monthStats = { revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, penalty: 0, discarded: 0, overdue: 0, returned: 0, stolen: 0, broken: 0, claims: 0, firstContractBought: false, spareUsed: false, bundleUsed: false };
      // 월 배차 한도 리셋 (계약은 만료되지 않는다 — 마켓은 업그레이드·새 업체용)
      // v1.5: 배차는 소모품 — 월초 리셋 없음. 마켓의 '가득 충전'으로만 채운다
      for (const c of this.contracts) if (c) { c.successCalls = 0; c.freeUsedMonth = false; }
      this.monthStats.insClaims = 0; this.monthStats.covered = 0; this.monthStats.premium = 0; this.monthStats.storageIncome = 0; this.monthStats.fees = 0;
      const heatN = R.heatAlerts + (this.seasonMods(m).heatAlerts || 0);
      this.heatTurns = heatN ? this.rng.shuffle([...Array(D.TURNS_PER_MONTH).keys()].map(i => i + 1)).slice(0, heatN).sort((a, b) => a - b) : [];
      this.weather = this._genWeather(m);
      this.schedule = this._makeSchedule(m);
      if (m > 1 && this.insurer !== 'none') for (const id of M.INSURERS[this.insurer].fans) if (this.customers[id]) this._custXp(id, 1, MSG('why.fanInsurer'));
      if (R.strike) {
        const owned = [...new Set(this.contracts.filter(Boolean).map(c => c.carrier))];
        const pool = (owned.length ? owned : Object.keys(D.CARRIERS)).filter(k => k !== this.strikeCarrier);
        this.strikeCarrier = pool.length ? this.rng.pick(pool) : null;
        if (this.strikeCarrier) this.say('log.strike', { name: D.CARRIERS[this.strikeCarrier].name });
      }
      if (m > 1) {
        if (R.monthlyStress) this.stress = Math.max(0, this.stress + R.monthlyStress);
        const relief = R.stressRelief || D.MONTH_RELIEF; if (relief && this.stress >= relief.min) this.stress = Math.max(0, this.stress - relief.amount);
      }
      // 준비 마켓: 1개월차 첫 턴 전에 시작 자금으로 계약·시설·보험을 갖출 수 있다 (입고 예정이 보인다)
      if (m === 1 && this.cfg.prep && !this.prepDone) {
        this.prepDone = true; this.phase = 'market';
        this.market = { items: this._genMarketItems(), bought: 0, refreshes: 0, month: 0, prep: true, freeRefresh: this.rules.freeRefresh + 1 };
        this.say('log.prepMarket');
        return;
      }
      this.phase = 'play';
      this.say('log.monthStart', { m });
      this._startTurn();
    }
    _makeSchedule(m) {
      const R = this.rules, turns = D.TURNS_PER_MONTH;
      const sched = Array.from({ length: turns }, () => []);
      const ratio = this._typeRatio(m), cw = this._customerWeightsFor(m);
      const gen = () => this._genParcelSpec(ratio, m, cw);
      for (let t = 0; t < turns; t++) sched[t].push(gen());
      let extra = Math.round(this._extraArrivals(m) * R.arrivalsMult + (R.arrivalsMult > 1 ? 10 * (R.arrivalsMult - 1) : 0));
      const extraTurns = this.rng.shuffle([...Array(turns - 1).keys()].map(i => i + 1));
      for (let i = 0; i < extra; i++) sched[extraTurns[i % extraTurns.length]].push(gen());
      this.burstTurns = [];
      if (R.burstTurns) { const bt = this.rng.shuffle([...Array(turns - 2).keys()].map(i => i + 2)).slice(0, R.burstTurns); for (const t of bt) { sched[t].push(gen()); this.burstTurns.push(t + 1); if (R.burstDeadlineDelta) for (const sp of sched[t]) sp.burst = true; } }
      // 태풍 턴: 입고 없음, 다음 턴에 몰림
      for (let t = 0; t < turns - 1; t++) if (this.weather[t] === 'storm' && sched[t].length) { sched[t + 1].push(...sched[t]); sched[t] = []; }
      // 달력 이벤트: 폭주(그 턴 입고 배수·기한 단축·품목 이동), 휴무(입고 없음 → 휴무 뒤 첫 턴에 몰림), 보상 보정
      for (const ev of this.monthEvents(m)) {
        const [a, b] = ev.turns;
        for (let t = a - 1; t <= b - 1 && t < turns; t++) {
          if (ev.arrivalsMult && ev.arrivalsMult > 1) {
            const shifted = { ...ratio }; if (ev.typeShift) for (const k in ev.typeShift) shifted[k] = Math.max(0, (shifted[k] || 0) + ev.typeShift[k]);
            const add = Math.max(1, Math.round(sched[t].length * (ev.arrivalsMult - 1)));
            for (let i = 0; i < add; i++) sched[t].push(this._genParcelSpec(shifted, m, cw));
          }
          for (const sp of sched[t]) { if (ev.deadlineDelta) sp.deadlineDelta = (sp.deadlineDelta || 0) + ev.deadlineDelta; if (ev.rewardDelta) sp.rewardDelta = ev.rewardDelta; }
        }
        if (ev.noArrivals) { const to = Math.min(turns - 1, b); const moved = []; for (let t = a - 1; t <= b - 1 && t < turns; t++) { moved.push(...sched[t]); sched[t] = []; } if (to > b - 1) sched[to].unshift(...moved); else sched[Math.max(0, a - 2)].push(...moved); }
      }
      return sched;
    }
    // 고객 품목 분포에 시나리오·월별 비율의 편차를 곱한다 (항만이면 모든 고객의 통관 비중이 오르는 식)
    _genParcelSpec(ratio, m, cw) {
      const R = this.rules;
      const customer = cw ? this.rng.weighted(cw) : 'anon';
      const cust = M.CUSTOMERS[customer] || M.CUSTOMERS.anon;
      let type, attrs, sizes, premium = false;
      // 고객 특수 품목은 신뢰 단계로 열린다 (3장): 0단계 일반 85%, 1단계 55%, 2단계 고객 정의, 3단계 + 프리미엄 품목
      const clv = cust.items ? this.customerLevel(customer) : 0;
      // 0단계 고객은 일반만, 1단계 30%, 2단계부터 고객 품목 그대로
      const normalShare = clv === 0 ? 1 : clv === 1 ? 0.7 : 0;
      if (!cust.items || this.rng.next() < normalShare) type = this.rng.weighted(cust.items ? { normal: 1 } : ratio);
      else {
        const base = D.TYPE_RATIO[Math.min(6, this.tableMonth(m))], w = {};
        for (const k in cust.items) { const t = M.CUSTOMER_ITEMS[k] ? M.CUSTOMER_ITEMS[k].type : k; const f = base[t] > 0 ? (ratio[t] || 0) / base[t] : 1; w[k] = Math.max(0.05, cust.items[k] * Math.max(0.25, Math.min(3, f))); }
        if (R.dualAttrBonus && (m || this.month) >= 2 && (cust.items.intl || cust.items.fragile)) w.intlfragile = (w.intlfragile || 0) + R.dualAttrBonus;
        const k = this.rng.weighted(w);
        if (M.CUSTOMER_ITEMS[k]) { type = M.CUSTOMER_ITEMS[k].type; attrs = R.noDualAttrs ? null : M.CUSTOMER_ITEMS[k].attrs; sizes = M.CUSTOMER_ITEMS[k].sizes; } else type = k;
        if (clv >= 3 && this.rng.next() < 0.25) premium = true;
      }
      let allowed = sizes || D.PARCEL_TYPES[type].sizes;
      if (type === 'fresh' && R.freshSizes && !sizes) allowed = R.freshSizes;
      const w = {}; for (const s of allowed) { let wt = D.SIZE_WEIGHT[s]; if (s === 7 && R.xlWeight != null) wt = R.xlWeight; if (s >= 4) wt *= R.bigWeight; if (cust.sizeBias === 'small' && s >= 2) wt *= s >= 4 ? 0.2 : 0.6; if (cust.sizeBias === 'big' && s < 4) wt *= 0.3; if (cust.sizeBias === 'mid' && s !== 2) wt *= 0.5; w[s] = wt; }
      // 냉동: 냉동 구역보다 큰 택배는 오지 않는다 (구역이 0이면 신선으로)
      if (type === 'frozen') { const fz = this.warehouse.frozen || 0; const ok = {}; for (const s in w) if (+s <= fz) ok[s] = w[s]; if (!Object.keys(ok).length) { type = 'fresh'; } else { for (const s in w) delete w[s]; Object.assign(w, ok); } }
      const spec = { type, size: +this.rng.weighted(w), customer };
      if (attrs) spec.attrs = attrs; if (premium) spec.premium = true;
      return spec;
    }
    _spawnParcel(spec) {
      const R = this.rules, t = D.PARCEL_TYPES[spec.type];
      let size = spec.size + R.sizeDelta;
      if (spec.size >= 4) size += R.bigSizeDelta;
      size = Math.max(1, size);
      const attrs = (spec.attrs || t.attrs).slice(), customer = spec.customer || 'anon';
      const cust = M.CUSTOMERS[customer] || M.CUSTOMERS.anon;
      const bsd = this.customerPerk(customer, 'bigSizeDelta'); if (bsd && spec.size >= 4) size = Math.max(1, size + bsd);
      const burstD = spec.burst ? R.burstDeadlineDelta : 0;
      if (spec.size >= 7 && this.trustPerkAny('xlDelta')) size = Math.max(1, size - 1);
      let reward = this.baseReward(spec.type, spec.size); if (spec.premium) reward = Math.round(reward * 1.5);
      if (spec.rewardDelta && spec.rewardDelta[spec.type]) reward += spec.rewardDelta[spec.type];
      const p = { id: this.nextId++, type: spec.type, size, baseSize: spec.size, reward, premium: !!spec.premium, attrs, customer,
        deadline: Math.max(1, t.deadline + (R.deadlineDelta[spec.type] || 0) + R.deadlineAll + (attrs.includes('cold') ? R.freshExtra : 0) + (this.customerPerk(customer, 'deadlineDelta') || 0) + burstD + (spec.deadlineDelta || 0)), overdue: false, inCold: false, inFrozen: false, age: 0, warm: 0, customs: 0, arrivalTurn: (this.totalTurn || 0) + 1 };
      if (attrs.includes('customs')) { p.customs = R.customsWait + (this.trustPerkAny('customsDelta') || 0); if (this.rng.next() < R.customsDelayProb && this.items.customsBond !== this.month && !this.trustPerkAny('noCustomsDelay')) { p.customs += 1; p.customsDelayed = true; } if (cust.rule && cust.rule.kind === 'customsFast') p.customs += cust.rule.delta; const cd = this.customerPerk(customer, 'customsDelta'); if (cd) p.customs += cd; p.customs = Math.max(0, p.customs); p.coldDuringCustoms = true; }
      return p;
    }
    _startTurn() {
      this.turn++;
      const specs = this.schedule[this.turn - 1] || [];
      const arrived = specs.map(s => this._spawnParcel(s));
      this.parcels.push(...arrived);
      this._assignCold();
      for (const p of arrived) this.emit('arrive', { parcel: p });
      this.totalTurn = (this.totalTurn || 0) + 1;
      // 지연 입금 (철도·해상)
      if (this.pendingRevenue && this.pendingRevenue.length) {
        const due = this.pendingRevenue.filter(x => x.turn <= this.totalTurn); this.pendingRevenue = this.pendingRevenue.filter(x => x.turn > this.totalTurn);
        for (const x of due) { this.cash += x.amount; this.monthStats.revenue += x.amount; this.run.revenue += x.amount; this.say('log.paid', { name: x.name, amount: x.amount, count: x.count }); this.emit('paid', x); }
        this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      }
      // 냉동: 냉동 구역에 못 들어가면 즉시 폐기
      for (const p of arrived) if (this._attrs(p).includes('frozen') && !p.inFrozen) this._discardParcel(p, MSG('why.noFrozenZone'), 2, 'discard');
      this._assignCold();
      const xl = this.parcels.filter(p => p.baseSize >= 7).length; this.stats.maxXlSimul = Math.max(this.stats.maxXlSimul, xl);
      if (this.offer && this.offer.expires < this.totalTurn) { this.say('log.offerExpired'); this.offer = null; }
      if (this.rules.storageOfferEvery && !this.offer && this.storage.length < this.rules.storageMax && (this.turn - 1) % this.rules.storageOfferEvery === 0) this._maybeOffer(true); else this._maybeOffer();
      let note = '';
      const wx = this.weatherNow(); if (wx !== 'sunny') note = ` ${M.WEATHER[wx].icon}${M.WEATHER[wx].name}`;
      if (this.heatTurns.includes(this.turn)) note = MSG('log.heatAlert');
      for (const ev of this.eventsAt()) if (ev.turns[0] === this.turn) this.say('log.calEvent', { name: MSG('cal.event.' + ev.id), a: ev.turns[0], b: ev.turns[1] });
      if (this.isOffTurn()) note = MSG('log.holidayOff');
      this.say('log.arrive', { month: this.month, turn: this.turn, list: arrived.map(p => D.PARCEL_TYPES[p.type].short + p.size).join(', '), usage: Math.round(this.usage() * 100), note });
    }
    upcoming() {
      const out = [];
      for (let i = 0; i < this.rules.upcomingTurns; i++) {
        const t = this.turn + i;
        if (t < D.TURNS_PER_MONTH) out.push({ turn: t + 1, specs: this.schedule[t], heat: this.weatherAt(t + 1) === 'heat', burst: this.burstTurns.includes(t + 1) || this.isRushTurn(t + 1), off: this.isOffTurn(t + 1), events: this.eventsAt(t + 1).map(e => e.id), weather: i < this.rules.forecastTurns ? this.weatherAt(t + 1) : null });
        else out.push({ turn: t + 1, specs: null, weather: null });
      }
      return out;
    }

    // 대기: 턴을 넘긴다. selfIds를 주면 그 택배를 직접 배송(배송비 지불, 보상 그대로)하고 넘긴다
    wait(selfIds) {
      if (this.phase !== 'play') return false;
      let self = null;
      if (selfIds && selfIds.length) { self = this.selfDeliver(selfIds); if (!self.ok) return self; }
      this.monthStats.waits++; this.run.waits++; this.stats.waits++;
      if (self) { this.stats.callStreak++; this.stats.maxCallStreak = Math.max(this.stats.maxCallStreak, this.stats.callStreak); } else this.stats.callStreak = 0;
      this.waitStack++;
      if (self) this.say('log.waitSelf', { count: self.count, revenue: self.revenue, cost: self.cost }); else this.say('log.wait');
      this.emit('wait', { self });
      this._endTurn(true);
      return self ? Object.assign({ ok: true }, self) : true;
    }

    callCarrier(slotIdx, pickIds, trucksArg) {
      if (this.phase !== 'play') return { ok: false, msg: T('err.cannotCallNow') };
      const c = this.contracts[slotIdx], R = this.rules;
      if (!c) return { ok: false, msg: T('err.emptySlot') };
      if (this.isStruck(c)) return { ok: false, msg: T('err.struck') };
      if (this.isOffTurn()) return { ok: false, msg: T('err.holidayOff') };
      const useSpare = c.calls <= 0;
      if (useSpare && !(R.spareCall && !this.monthStats.spareUsed)) return { ok: false, msg: T('err.noCalls') };
      const car = D.CARRIERS[c.carrier];
      const elig = this.eligibleParcels(c);
      let chosen = (pickIds || []).map(id => elig.find(p => p.id === id)).filter(Boolean);
      if (chosen.length === 0) return { ok: false, msg: T('err.nothingToShip') };
      // 차량: 부피 합에 맞는 대수. 동시 대수·남은 배차·배차비 검사
      const vcap = this.vehicleCap(c), volume = chosen.reduce((s, p) => s + p.size, 0);
      let trucks = Math.max(this.trucksNeeded(c, volume), trucksArg || 1);
      if (trucks > this.simulMax(c)) return { ok: false, msg: T('err.overTrucks', { n: this.simulMax(c), cap: vcap * this.simulMax(c) }) };
      const avail = c.calls + (useSpare ? 1 : 0);
      if (trucks > avail) return { ok: false, msg: T('err.noTrucks', { n: c.calls }) };
      const fee = this.callFee(c, trucks);
      // 후불: 배차비는 월말 정산에서 빠진다 (자금 부족으로 호출이 막히지 않는다)
      this.feesDue += fee; this.monthStats.spent += fee; this.monthStats.fees = (this.monthStats.fees || 0) + fee; this.run.spent += fee; this.stats.feesPaid += fee; this.stats.trucksCalled += trucks;
      if (c.enh.regular && !c.freeUsedMonth) c.freeUsedMonth = true;
      const fill = volume / (vcap * trucks);
      if (fill >= 0.8) this.stats.fullTrucks++;

      const lv = this.trustLevel(c);
      const specialistAll = false;
      let revenue = 0, xp = 1, special = false, onTime = 0, broken = 0, delivered = [];
      let cert = false;
      if (this.items.transitCert > 0 && chosen.some(p => this.breakProb(c, p) > 0)) { this.items.transitCert--; cert = true; this.say('log.transitCert'); }
      const snow = this.weatherNow() === 'snow';
      for (const p of chosen) {
        const t = D.PARCEL_TYPES[p.type];
        // ⚠ 파손 판정 (능력 없는 업체)
        if (!cert && this.breakProb(c, p) > 0 && this.rng.next() < this.breakProb(c, p)) {
          broken++; this.monthStats.broken++; this.stats.broken++;
          this._discardParcel(p, MSG('why.brokenInTransit', { name: this.contractName(c) }), 2, 'broken');
          continue;
        }
        let r = p.reward + (R.rewardDelta[p.type] || 0) + R.rewardAll + this.trustPerkMap('rewardDelta', p.type);
        if (p.customs > 0 && this.trustPerk(c.carrier, 'customsBonus')) r += this.trustPerk(c.carrier, 'customsBonus');
        const isSpec = specialistAll || this.isSpecialist(car, p.type);
        if (isSpec && t.bonus) { r += t.bonus + R.bonusDelta + (this.customerPerk(p.customer, 'bonusDelta') || 0) + this.trustPerkMap('bonusDelta', p.type); special = true; if (!this.stats.specialistTypes.includes(p.type)) this.stats.specialistTypes.push(p.type); }
        r = Math.round(r * (R.rewardMult[p.type] || 1));
        if (p.wet) { r = Math.round(r * 0.8); this.stats.wetDelivered++; }
        if (snow && this._attrs(p).includes('cold')) { r += 10; this.stats.snowDelivered++; }
        if (p.overdue) { r = Math.round(r * R.overdueMult); this.stats.overdueDelivered++; } else { onTime++; this.stats.onTimeByType[p.type]++; if (p.baseSize >= 7) this.stats.xlOnTime++; if (p.baseSize >= 4) this.stats.bigDelivered++; }
        r += this._custDeliver(p, r, !p.overdue, chosen.filter(q => q.customer === p.customer));
        r = Math.max(0, r); this._custRevenue(p, r);
        revenue += r;
        this.stats.deliveredByType[p.type]++;
        delivered.push(p);
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.emit('deliver', { parcel: p, reward: r });
      }
      if (!delivered.length && broken) {
        // 전부 파손: 호출은 소모, 보상 없음
        if (useSpare) { this.monthStats.spareUsed = true; c.calls = Math.max(0, c.calls - (trucks - 1)); } else c.calls -= trucks; c.totalCalls++;
        this.monthStats.calls++; this.run.calls++; this.stats.calls++;
        this.waitStack = 0; this._assignCold();
        this.say('log.callAllBroken', { name: this.contractName(c), broken });
        this.emit('call', { contract: c, count: 0, revenue: 0, broken, trucks, fee });
        this._endTurn(false, false); return { ok: true, revenue: 0, count: 0, broken, trucks, fee };
      }
      chosen = delivered;
      if (R.bigCallPenalty && chosen.length >= R.bigCallPenalty) revenue = Math.round(revenue * 0.9);
      if (R.bigCallBonus && chosen.length >= R.bigCallBonus.min) revenue = Math.round(revenue * R.bigCallBonus.mult);
      revenue = Math.round(revenue * R.revenueMult);
      if (onTime === 0) xp = 0;
      if (xp > 0 && fill >= 0.8) xp += 1;
      if (xp > 0 && c.carrier === 'cold' && R.coldTrustBonus) xp += R.coldTrustBonus;
      if (xp > 0) xp = Math.round((xp + R.trustXpDelta) * R.trustXpMult);
      this._addTrust(c.carrier, xp);
      // 배차 대수 소모
      let refunded = false;
      if (useSpare) { this.monthStats.spareUsed = true; this.say('log.spareCall'); c.calls = Math.max(0, c.calls - (trucks - 1)); }
      else if (R.bundleRefund && chosen.length >= R.bundleRefund && !this.monthStats.bundleUsed) { this.monthStats.bundleUsed = true; refunded = true; c.calls -= Math.max(0, trucks - 1); }
      else c.calls -= trucks;
      c.successCalls++; c.totalCalls++; c.delivered += chosen.length;
      const pd = this.trustPerk(c.carrier, 'delay');
      const delay = pd != null ? pd : (car.delay || 0);
      if (delay > 0) { (this.pendingRevenue = this.pendingRevenue || []).push({ turn: (this.totalTurn || 0) + delay + 1, amount: revenue, count: chosen.length, name: car.name }); }
      else { this.cash += revenue; this.monthStats.revenue += revenue; this.run.revenue += revenue; }
      this.monthStats.calls++; this.monthStats.delivered += chosen.length;
      this.run.calls++; this.run.delivered += chosen.length;
      this.stats.calls++; this.stats.callStreak++; this.stats.maxCallStreak = Math.max(this.stats.maxCallStreak, this.stats.callStreak);
      this.stats.maxSingleCall = Math.max(this.stats.maxSingleCall, chosen.length);
      this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      this.waitStack = 0;
      this._assignCold();
      const freezeFresh = !!this.trustPerk(c.carrier, 'freezeOnCall');
      this.say('log.call', { name: this.contractName(c), count: chosen.length, revenue, delay: delay ? MSG('log.callDelay', { delay }) : '', broken: broken ? MSG('log.callBroken', { broken }) : '', refund: refunded ? MSG('log.callRefund') : '', calls: c.calls, fee });
      this.emit('call', { contract: c, count: chosen.length, revenue, broken, delay, trucks, fee, fill });
      this._updateTrustStats();
      this._endTurn(false, freezeFresh);
      return { ok: true, revenue, count: chosen.length, broken, delay, trucks, fee, fill };
    }
    // 직접 배송(대기 턴의 부가 행동): 고른 택배를 배송비를 내고 처리. 보상 그대로. wait()에서 호출
    selfDeliver(ids) {
      if (this.phase !== 'play') return { ok: false, msg: T('err.cannotShipNow') };
      const R = this.rules;
      const chosen = (ids || []).map(id => this.parcels.find(p => p.id === id)).filter(p => p && this.selfCan(p));
      if (!chosen.length) return { ok: false, msg: T('err.nothingSelf') };
      if (chosen.length > this.selfCount()) return { ok: false, msg: T('err.selfLimit', { n: this.selfCount() }) };
      const cost = chosen.reduce((s, p) => s + this.selfCost(p), 0);
      this.feesDue += cost; this.monthStats.spent += cost; this.run.spent += cost; this.monthStats.selfCost = (this.monthStats.selfCost || 0) + cost;
      let revenue = 0;
      for (const p of chosen) {
        let r = p.reward + (R.rewardDelta[p.type] || 0) + R.rewardAll;
        r = Math.round(r * (R.rewardMult[p.type] || 1));
        if (p.wet) r = Math.round(r * 0.8);
        if (p.overdue) { r = Math.round(r * R.overdueMult); this.stats.overdueDelivered++; } else this.stats.onTimeByType[p.type]++;
        r += this._custDeliver(p, r, !p.overdue, chosen.filter(q => q.customer === p.customer));
        r = Math.max(0, r); this._custRevenue(p, r);
        revenue += r;
        this.stats.deliveredByType[p.type]++;
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.emit('deliver', { parcel: p, reward: r });
      }
      revenue = Math.round(revenue * R.revenueMult);
      this.cash += revenue;
      this.monthStats.revenue += revenue; this.monthStats.delivered += chosen.length;
      this.run.revenue += revenue; this.run.delivered += chosen.length;
      this.stats.selfCalls++;
      this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      this._assignCold();
      this.emit('call', { contract: null, self: true, count: chosen.length, revenue, cost });
      return { ok: true, revenue, cost, count: chosen.length, ids: chosen.map(p => p.id) };
    }
    _updateTrustStats() {
      const seen = new Set(this.contracts.filter(Boolean).map(c => c.carrier));
      const l2 = [...seen].filter(k => this.trustLevel(k) >= 2).length, l3 = [...seen].filter(k => this.trustLevel(k) >= 3).length;
      this.stats.maxTrustL2Simul = Math.max(this.stats.maxTrustL2Simul, l2); this.stats.maxTrustL3Simul = Math.max(this.stats.maxTrustL3Simul, l3);
      if (this.contracts.some(c => c && c.grade === 'master')) this.stats.masterOwned = true;
    }

    _discardParcel(p, why, stress, evt) {
      const R = this.rules, i = this.parcels.indexOf(p); if (i < 0) return;
      this.parcels.splice(i, 1);
      this.monthStats.discarded++; this.run.discarded++; this.stats.discarded++;
      let pen = stress, insured = false;
      if (R.insurance && !this.insuranceUsed) { this.insuranceUsed = true; pen = 0; insured = true; why = MSG('why.insured', { why }); }
      if (pen) { this.stress += pen; this.monthStats.penalty += pen; }
      this.say('log.discard', { short: D.PARCEL_TYPES[p.type].short, size: p.size, why, pen: pen ? ` +${pen}` : '' });
      this.emit(evt || 'discard', { parcel: p, why });
      if (!insured) this._claim(p, why, evt === 'broken' ? 'broken' : 'discard');
      if (evt === 'broken') { const cc = this.customers && this.customers[p.customer]; if (cc) cc.streak = 0; }
    }
    _endTurn(waited, freezeFresh) {
      const R = this.rules;
      this.waitedLastTurn = waited;
      const usageBefore = this.usage();
      let pen = 0; const reasons = [];
      const discard = [], returned = [];
      const heat = this.isHeatTurn(), wx = this.weatherNow(), snow = wx === 'snow', wet = (wx === 'rain' || wx === 'storm') && !R.tent;
      for (const p of this.parcels) {
        p.age++;
        const isCold = this._attrs(p).includes('cold'), isFrozen = this._attrs(p).includes('frozen');
        if (p.outdoor && wet && !isCold && !isFrozen && !p.wet) { p.wet = true; reasons.push(MSG('r.wet', { short: D.PARCEL_TYPES[p.type].short, size: p.size })); }
        if (p.customs > 0 && p.outdoor) p.outdoorDuringCustoms = true;
        // 🌾 농산물: 폭염이면 창고 안이라도 상한다 (냉장 구역·환기 시설이면 무사). 야외면 즉시 폐기
        if (this._attrs(p).includes('produce') && heat && !p.inCold) { if (p.outdoor) { discard.push([p, MSG('why.heatSpoil')]); continue; } if (!this.warehouse.vent && !p.overdue) { p.deadline -= 2; reasons.push(MSG('r.heatProduce', { short: D.PARCEL_TYPES[p.type].short, size: p.size })); } }
        if (p.outdoor && snow) { if (isFrozen) continue; if (isCold) { p.warm = 0; if (!p.overdue) continue; } }
        // 통관 대기: 기한은 통관 뒤 시작
        if (p.customs > 0) { if (isCold && !p.inCold) p.coldDuringCustoms = false; p.customs--; continue; }
        // 신선: 냉장 구역 밖이면 폭염 즉시 / warmLimit턴 뒤 폐기. 안이면 기한만 진행(냉동고 퍽·냉장 L3는 기한 정지)
        if (isCold && !p.inCold) { p.warm = (p.warm || 0) + 1; if (heat || p.warm >= R.warmLimit) { discard.push([p, MSG(heat ? 'why.heatSpoil' : 'why.warmSpoil')]); continue; } }
        else if (isCold) p.warm = 0;
        if (isFrozen && !p.inFrozen) { discard.push([p, MSG('why.outsideFrozen')]); continue; }
        const freeze = isCold && (freezeFresh || snow || (p.inCold && R.freezer && p.age <= R.freezer));
        const grace = this.returnGraceFor(p);
        if (!p.overdue) { if (!freeze) p.deadline--; if (p.deadline <= 0) { p.overdue = true; p.overdueTurns = 0; pen += R.overdueStress; if (R.overdueStress) reasons.push(MSG('r.overdue', { short: D.PARCEL_TYPES[p.type].short })); this.monthStats.overdue++; } }
        else { p.overdueTurns = (p.overdueTurns || 0) + 1; if (p.overdueTurns >= grace) returned.push(p); else if (R.overdueTurnStress) { pen += R.overdueTurnStress; reasons.push(MSG('r.overdueCont', { short: D.PARCEL_TYPES[p.type].short })); } }
      }
      for (const [p, why] of discard) { this._discardParcel(p, why, 2, 'discard'); reasons.push(MSG('r.discard', { why, short: D.PARCEL_TYPES[p.type].short })); }
      for (const p of returned) {
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.monthStats.returned++; this.stats.returned++;
        if (R.insurance && !this.insuranceUsed) { this.insuranceUsed = true; reasons.push(MSG('r.returnedInsured')); this.emit('returned', { parcel: p }); }
        else { const ns = M.INSURERS[this.insurer].noReturnStress; if (!ns) pen += 2; reasons.push(MSG('r.returned', { short: D.PARCEL_TYPES[p.type].short, pen: ns ? '' : ' +2' })); this.emit('returned', { parcel: p }); this._claim(p, MSG('why.returned'), 'returned'); }
      }
      this._assignCold();
      // 도난: 야외 적재 택배는 각각 판정
      const tp = this.theftProb();
      if (tp > 0) for (const p of this.outdoorParcels()) {
        if (this.rng.next() >= tp) continue;
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.monthStats.stolen++; this.stats.stolen++;
        if (R.insurance && !this.insuranceUsed) { this.insuranceUsed = true; reasons.push(MSG('r.stolenInsured')); this.emit('stolen', { parcel: p }); }
        else { pen += 2; reasons.push(MSG('r.stolen', { short: D.PARCEL_TYPES[p.type].short, size: p.size })); this.emit('stolen', { parcel: p }); this._claim(p, MSG('why.stolen'), 'stolen'); }
      }
      // 야외 보관 물품 도난: 배상 ×2
      if (tp > 0) for (const s of this.storage.slice()) {
        if (!s.outdoor || this.rng.next() >= tp) continue;
        this.storage.splice(this.storage.indexOf(s), 1);
        const full = Math.round((s.fee || s.perTurn * s.turns) * 2), covered = Math.round(full * this.coverRate('stolen', { attrs: [] })), amount = full - covered;
        if (covered) this.monthStats.insClaims++;
        this.cash -= amount; this.monthStats.claims += amount; this.stats.claims += amount; pen += 2; reasons.push(MSG('r.storageStolen', { amount }));
        this._custXp(s.customer, -3, MSG('why.storageStolen')); this.emit('storageStolen', { storage: s, amount });
      }
      this._tickStorage(reasons);
      this.outdoorPref = this.outdoorPref.filter(id => typeof id === 'string' ? this.storage.some(s => 's' + s.id === id) : this.parcels.some(p => p.id === id));
      this._assignCold();
      const over = this.outdoorVolume();
      if (over > 0) { this.stats.overflowTurns++; this.stats.maxOverflowTurns = Math.max(this.stats.maxOverflowTurns, this.stats.overflowTurns); } else this.stats.overflowTurns = 0;
      const effOver = over > R.overflowGrace ? over : 0;
      if (effOver >= 3) { let p2 = 2; if (R.endless && this.month >= 10 && effOver >= 6) p2 += Math.floor((effOver - 6) / 3); pen += p2; reasons.push(MSG('r.overflow', { over, pen: p2 })); }
      else if (effOver >= 1) { pen += 1; reasons.push(MSG('r.overflow', { over, pen: 1 })); }
      else if (over > 0) reasons.push(MSG('r.overflowGrace', { over }));
      if (usageBefore >= 1 && pen === 0) this.stats.fullNoPenalty = true;
      if (pen > 0) {
        this.stress += pen; this.monthStats.penalty += pen;
        this.say('log.penalty', { pen, reasons, stress: this.stress });
        this.emit('penalty', { amount: pen, reasons });
      } else if (reasons.length) this.say(reasons.join(', '));
      if (this.stress >= this.rules.gameoverStress) return this._gameOver(MSG('over.stress'));
      if (this.turn >= D.TURNS_PER_MONTH) return this._endMonth();
      this._startTurn();
    }

    _endMonth() {
      const R = this.rules, ms = this.monthStats;
      const overdueVol = this.parcels.filter(p => p.overdue).reduce((s, p) => s + p.size, 0);
      const unproc = 0; // v0.3.5: 월말 미처리 페널티는 반송이 대신한다
      const opCost = this._opCost(this.month);
      this.cash -= opCost; ms.spent += opCost; this.run.spent += opCost;
      const feesDue = this.feesDue; this.cash -= feesDue; this.feesDue = 0; // 후불 배차비·배송비 정산
      const premium = this._settlePremium();
      let closing = 0;
      if (R.closingBonus && this.usage() <= R.closingBonus.usage) { closing = R.closingBonus.amount; this.cash += closing; }
            if (R.erosion) { const cands = this.contracts.filter(c => c && this.startContractIds.includes(c.id) && c.maxCalls > 1); if (cands.length) { const c = this.rng.pick(cands); c.maxCalls--; c.calls = Math.min(c.calls, c.maxCalls); this.say('log.erosion', { name: this.contractName(c) }); } }
      // 통계
      this.stats.monthsDone = this.month;
      this.stats.maxMonthDelivered = Math.max(this.stats.maxMonthDelivered, ms.delivered);
      if (ms.penalty === 0) this.stats.perfectMonths++;
      if (this.usage() <= 0.4) this.stats.tidyMonths++;
      if (this.contracts.filter(Boolean).length >= 4 && this.contracts.every(c => c && c.calls === 0)) this.stats.zeroCallsMonthEnd = true;
      if (this.cash >= 0 && this.cash <= 100) this.stats.brokeMonthEnd = true;
      this.summary = { month: this.month, revenue: ms.revenue, opCost, opCostDetail: this._lastOpCost, calls: ms.calls, waits: ms.waits,
        delivered: ms.delivered, penalty: ms.penalty, unprocPenalty: unproc, overdueVol, discarded: ms.discarded, returned: ms.returned, stolen: ms.stolen, broken: ms.broken, claims: ms.claims, covered: ms.covered, selfCost: ms.selfCost || 0, fees: ms.fees || 0, premium, insClaims: ms.insClaims, nextPremium: this.premium(), noClaimBonus: !!ms.noClaimBonus, storageIncome: ms.storageIncome, closing, customers: this.customerSummary(),
        cash: this.cash, stress: this.stress, usage: Math.round(this.usage() * 100), left: this.parcels.length };
      // 단기 금융: 지난달 차입 상환(원금+이자) → 그래도 음수면 새로 차입해 0으로 맞춤
      const loan = { interest: 0, repaid: 0, borrowed: 0, debt: 0 };
      if (this.debt > 0) { loan.interest = Math.ceil(this.debt * D.LOAN.interest); loan.repaid = this.debt; this.cash -= this.debt + loan.interest; this.run.spent += loan.interest; this.stats.interestPaid += loan.interest; this.debt = 0; }
      if (this.cash < 0) { loan.borrowed = -this.cash; this.debt = loan.borrowed; this.cash = 0; this.stats.loans++; }
      loan.debt = this.debt; this.summary.loan = loan; this.summary.cash = this.cash;
      this.say('log.settle', { month: this.month, revenue: ms.revenue, opCost, fees: feesDue, closing: closing ? MSG('log.settleClosing', { closing }) : '' });
      if (loan.repaid) this.say('log.loanRepaid', { n: loan.repaid, interest: loan.interest });
      if (loan.borrowed) this.say('log.loan', { n: loan.borrowed, interest: Math.ceil(loan.borrowed * D.LOAN.interest) });
      if (this.debt > D.LOAN.limit) return this._gameOver(MSG('over.bankrupt', { debt: this.debt, limit: D.LOAN.limit }));
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
      if (R.winDelivered && this.run.delivered < R.winDelivered) return this._gameOver(MSG('over.delivered', { n: this.run.delivered, need: R.winDelivered })), true;
      if (R.winMaxDiscard != null && this.run.discarded > R.winMaxDiscard) return this._gameOver(MSG('over.discard', { n: this.run.discarded, max: R.winMaxDiscard })), true;
      if (R.winCash && this.cash < R.winCash) return this._gameOver(MSG('over.cash', { cash: this.cash, need: R.winCash })), true;
      if (R.winMaxOverdue != null && this.stats.overdueDelivered > R.winMaxOverdue) return this._gameOver(MSG('over.overdue', { n: this.stats.overdueDelivered, max: R.winMaxOverdue })), true;
      if (R.winStorage && this.stats.storageDone < R.winStorage) return this._gameOver(MSG('over.storage', { n: this.stats.storageDone, need: R.winStorage })), true;
      if (R.winBigCustomer && this.bigCustomer && this.customerLevel(this.bigCustomer) < 3) return this._gameOver(MSG('over.bigCustomer', { name: M.CUSTOMERS[this.bigCustomer].name, level: this.customerLevel(this.bigCustomer) })), true;
      return this._win();
    }
    _gameOver(reason) {
      this.phase = 'over';
      this.result = this._makeResult(false, reason);
      this.say('log.gameOver', { reason });
    }
    _win() {
      this.phase = 'win';
      this.result = this._makeResult(true, MSG('over.win', { months: this.rules.months }));
      this.say(this.result.reason);
      return true;
    }
    _makeResult(win, reason) {
      const monthsDone = win ? this.rules.months : this.month - 1;
      this.stats.monthsDone = monthsDone;
      this.stats.distinctCarriersAtEnd = new Set(this.contracts.filter(Boolean).map(c => c.carrier)).size;
      const score = Math.round(Math.max(0, this.run.revenue + Math.max(0, this.cash) + monthsDone * (this.rules.endless ? 300 : 200) - this.stress * 10) * this.rules.scoreMult);
      return { win, reason, score, month: this.month, turn: this.turn, monthsDone, cash: this.cash, stress: this.stress, seed: this.seed,
        scenario: this.cfg.scenario, company: this.cfg.company, difficulty: this.cfg.difficulty || 'normal', perks: this.perks.slice(), variants: (this.cfg.variants || []).slice(), date: this.cfg.date || null, ...this.run };
    }

    // ----- market -----
    _openMarket() {
      this.phase = 'market';
      this.market = { items: this._genMarketItems(), bought: 0, refreshes: 0, month: this.month, freeRefresh: this.rules.freeRefresh };
      this.say('log.marketOpen', { month: this.month, max: this.rules.marketMaxBuy });
    }
    _carrierWeights() {
      const R = this.rules, w = {};
      for (const k of Object.keys(D.FAMILIES)) { if (this.isBanned(k)) continue; w[k] = R.marketWeight[k] || 1; }
      for (const id in this.customers || {}) { const mw = this.customerPerk(id, 'marketWeight'); if (mw) for (const k in mw) if (w[k]) w[k] *= mw[k]; }
      return w;
    }
    // 막힌 속성: 창고에 있거나 다음 2턴 입고 예정인 특수 택배 중, 현재 계약(용달·긴급 제외, 잔여 호출 있는 것)으로 처리할 수 없는 종류. 부피 큰 순
    blockedTypes() {
      const pseudo = [];
      for (const p of this.parcels) if (p.type !== 'normal') pseudo.push({ type: p.type, size: p.size, attrs: p.attrs, customs: 0 });
      for (let t = this.turn - 1; t < this.turn + 1; t++) for (const s of (this.schedule[t] || [])) if (s.type !== 'normal') pseudo.push({ type: s.type, size: Math.max(1, s.size + this.rules.sizeDelta + (s.size >= 4 ? this.rules.bigSizeDelta : 0)), customs: 0 });
      const covers = this.contracts.filter(c => c && c.calls > 0);
      const acc = {};
      for (const p of pseudo) { if (covers.some(c => this.canHandle(c, p) && this.breakProb(c, p) === 0)) continue; const a = acc[p.type] || (acc[p.type] = { type: p.type, volume: 0, count: 0, maxSize: 0 }); a.volume += p.size; a.count++; a.maxSize = Math.max(a.maxSize, p.size); }
      return Object.values(acc).sort((a, b) => b.volume - a.volume);
    }
    _genMarketItems() {
      const R = this.rules, m = this.month, mult = D.PRICE_MULT[Math.min(12, this.tableMonth(m))] * R.itemPriceMult * R.priceMult;
      const items = [];
      const gp = this._gradeProb(m);
      const weights = this._carrierWeights(); // 계열 가중치
      const tierOf = grade => GRADE_RANK.indexOf(grade);
      const ownedFam = fam => this.contracts.find(c => c && FAM(c.carrier) === fam);
      // 계열 + 등급 → 센터. 이미 그 계열 계약이 있으면 더 높은 tier 센터만 나온다(다른 센터와 신규 계약 = 갈아타기)
      const centerFor = (fam, grade) => { const k = D.centerFor(fam, tierOf(grade)); if (!k) return null; const own = ownedFam(fam); if (own && D.CARRIERS[k].tier <= D.CARRIERS[own.carrier].tier) { const up = D.centersOf(fam).find(x => D.CARRIERS[x].tier === D.CARRIERS[own.carrier].tier + 1 && D.CARRIERS[x].tier <= Math.max(tierOf(grade), 1)); return up || null; } return k; };
      const forced = R.guaranteeCarriers.filter(k => weights[k]).map(k => ({ family: k }));
      // 막힌 속성 보장: 처리할 계약이 없는 특수 택배가 있으면 그것을 처리할 계열을 반드시 하나 배치
      if (R.guaranteeBlocked) {
        for (const bt of this.blockedTypes()) {
          const pp = { type: bt.type, size: bt.maxSize, customs: 0 };
          const safe = fam => { const car = D.CARRIERS[D.centerFor(fam, 0)]; return this._carrierAccepts(car, pp) && (!D.PARCEL_TYPES[bt.type].attrs.includes('fragile') || car.caps.includes('fragile')); };
          if (forced.some(f => safe(f.family))) break;
          const cand = {}; for (const k of Object.keys(weights)) if (safe(k)) cand[k] = weights[k];
          if (!Object.keys(cand).length) continue;
          forced.unshift({ family: this.rng.weighted(cand), hint: T('market.hint', { short: D.PARCEL_TYPES[bt.type].short, count: bt.count }) });
          break;
        }
      }
      for (let i = 0; i < R.marketContractSlots; i++) {
        let grade = this.rng.weighted(gp);
        // 보호 규칙: 계약 슬롯 중 하나는 표준보다 높게
        if (i === 1 && items[0] && items[0].grade === 'normal' && grade === 'normal' && this.contracts.every(c => !c || c.grade === 'normal')) grade = 'trusted';
        const f = forced[i];
        const taken = fam => items.some(it => it.kind === 'contract' && FAM(it.carrier) === fam);
        let fam = f ? f.family : this.rng.weighted(weights), carrier = centerFor(fam, grade);
        if (!f && (!carrier || taken(fam))) { const alt = {}; for (const k in weights) if (!taken(k) && centerFor(k, grade)) alt[k] = weights[k]; if (Object.keys(alt).length) { fam = this.rng.weighted(alt); carrier = centerFor(fam, grade); } }
        if (!carrier && f) carrier = D.centerFor(fam, tierOf(grade));
        if (!carrier || items.some(it => it.carrier === carrier) || this.contracts.some(c => c && c.carrier === carrier)) continue;
        const car = D.CARRIERS[carrier]; grade = car.grade;
        const own = ownedFam(fam);
        items.push({ kind: 'contract', carrier, grade, price: Math.round(car.price * R.priceMult), name: car.name, sold: false, hint: f && f.hint || (own ? T('market.switchHint', { name: D.CARRIERS[own.carrier].name }) : null), switchFrom: own ? own.id : null });
      }
      // 상시 배차 충전: 배차가 빈 계약마다 '가득 충전' 카드. 정액이라 다 쓰지 않고 충전하면 그만큼 손해
      for (const c of this.contracts) if (c && c.calls < c.maxCalls) items.push({ kind: 'refill', contractId: c.id, carrier: c.carrier, standing: true, sold: false, price: this.refillPrice(c), name: T('market.refillName', { name: this.contractName(c) }) });
      const enhW = {}; for (const k of Object.keys(D.ENHANCEMENTS)) enhW[k] = R.marketWeight[k] || 1;
      const picked = []; for (let i = 0; i < 2 && Object.keys(enhW).length; i++) { const e = this.rng.weighted(enhW); picked.push(e); delete enhW[e]; }
      for (const e of picked) items.push({ kind: 'enh', enh: e, price: Math.round(D.ENHANCEMENTS[e].price * mult), name: D.ENHANCEMENTS[e].name, sold: false });
      const facW = {}, vehW = {};
      for (const f of Object.keys(D.FACILITIES)) { const F = D.FACILITIES[f]; if (this.warehouse[f]) continue; if (F.vehicle) { vehW[f] = R.marketWeight[f] || 1; continue; } if (F.requires && !this.warehouse[F.requires]) continue; if (F.cold && R.coldCapMax != null && this.warehouse.cold >= R.coldCapMax) continue; if (F.frozen && R.frozenCapMax != null && (this.warehouse.frozen || 0) >= R.frozenCapMax) continue; facW[f] = R.marketWeight[f] || 1; }
      const facPrice = f => { let price = D.FACILITIES[f].price * mult * R.facilityPriceMult; if (R.facilityPriceMap && R.facilityPriceMap[f]) price *= R.facilityPriceMap[f]; for (const id in this.customers || {}) { const fp = this.customerPerk(id, 'facilityPrice'); if (fp && fp[f]) price *= fp[f]; } return Math.round(price); };
      // 상시 창고 확장: 다음 단계 확장은 항상 살 수 있다(단계가 오를수록 비싸다). 나머지 시설은 무작위 1개
      const nextExpand = ['expand1', 'expand2', 'expand3'].find(f => facW[f]);
      if (nextExpand) { items.push({ kind: 'fac', fac: nextExpand, standing: true, price: facPrice(nextExpand), name: D.FACILITIES[nextExpand].name, sold: false }); delete facW[nextExpand]; }
      if (Object.keys(facW).length) {
        const f = this.rng.weighted(facW);
        items.push({ kind: 'fac', fac: f, price: facPrice(f), name: D.FACILITIES[f].name, sold: false });
      } else if (!nextExpand) items.push({ kind: 'fac', fac: null, price: 0, name: T('market.facSoldOut'), sold: true });
      if (Object.keys(vehW).length && this.rng.next() < 0.5) { const f = this.rng.weighted(vehW); items.push({ kind: 'fac', fac: f, price: Math.round(D.FACILITIES[f].price * mult * R.facilityPriceMult), name: D.FACILITIES[f].name, sold: false }); }
      if (this.customerCount() < M.CUSTOMER_SLOTS && this.rng.next() < 0.3) { const cands = Object.keys(M.CUSTOMERS).filter(k => k !== 'anon' && !this.customers[k]); if (cands.length) { const k = this.rng.pick(cands); items.push({ kind: 'customer', customer: k, price: Math.round(150 * mult), name: T('market.newCustomer', { name: M.CUSTOMERS[k].name }), sold: false }); } }
      if (this.rng.next() < 0.6) { const k = this.rng.pick(Object.keys(M.INS_ITEMS)); items.push({ kind: 'item', item: k, price: Math.round(M.INS_ITEMS[k].price * mult), name: M.INS_ITEMS[k].name, sold: false }); }
      return items;
    }
    refreshCost() { const mk = this.market; if (mk.refreshes < mk.freeRefresh) return 0; const r = mk.refreshes - mk.freeRefresh; return Math.round(D.REFRESH_COSTS[Math.min(r, D.REFRESH_COSTS.length - 1)] * this.rules.priceMult); }
    refreshMarket() {
      if (this.phase !== 'market') return { ok: false };
      if (this.rules.noRefresh) return { ok: false, msg: T('err.noRefresh') };
      const cost = this.refreshCost();
      if (this.cash < cost) return { ok: false, msg: T('err.noCash') };
      this.cash -= cost; this.run.spent += cost; this.market.refreshes++;
      this.market.items = this._genMarketItems();
      if (cost) this.say('log.refresh', { cost }); else this.say('log.refreshFree');
      return { ok: true };
    }
    contractPrice(item) {
      const R = this.rules;
      let p = Math.round(item.price * R.contractPriceMult);
      if (R.firstContractDiscount && !this.monthStats.firstContractBought) p = Math.max(0, p - R.firstContractDiscount);
      return p;
    }
    // 계약 아이템의 배차 대수(센터 기본 + 회사 보정)
    itemTrucks(it) { return Math.max(1, D.CARRIERS[it.carrier].trucks + this.rules.callsDelta); }
    // 가득 충전 가격: 센터 정액 × 물가. 남은 배차와 무관(그래서 다 쓰고 충전하는 게 이득)
    refillPrice(c) { return Math.round(D.CARRIERS[c.carrier].refill * this.rules.priceMult * this.inflation()); }
    refill(contractId) {
      if (this.phase !== 'market') return { ok: false, msg: T('err.notMarket') };
      const c = this.contracts.find(x => x && x.id === contractId); if (!c) return { ok: false, msg: T('err.emptySlot') };
      if (c.calls >= c.maxCalls) return { ok: false, msg: T('err.refillFull') };
      const price = this.refillPrice(c); if (this.cash < price) return { ok: false, msg: T('err.noCash') };
      const wasted = c.calls; c.calls = c.maxCalls; this.cash -= price; this.run.spent += price; this.stats.refills = (this.stats.refills || 0) + 1;
      this.say('log.refill', { name: this.contractName(c), n: c.maxCalls, price, wasted: wasted ? MSG('log.refillWasted', { n: wasted }) : '' });
      return { ok: true, price, wasted };
    }
    buy(itemIdx, target, mode) {
      if (this.phase !== 'market') return { ok: false, msg: T('err.notMarket') };
      const R = this.rules, it = this.market.items[itemIdx];
      if (!it || it.sold) return { ok: false, msg: T('err.sold') };
      if (it.kind !== 'refill' && this.market.bought >= R.marketMaxBuy) return { ok: false, msg: T('err.marketMax', { n: R.marketMaxBuy }) };
      let price = it.price;
      if (it.kind === 'contract') {
        price = this.contractPrice(it);
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        if (target == null || target < 0 || target >= D.CONTRACT_SLOTS) return { ok: false, msg: T('err.pickSlot') };
        const old = this.contracts[target];
        const nc = this._makeContract(it.carrier, it.grade);
        if (old) {
          if (old.calls >= 3) this.stats.replacedWithCalls = Math.max(this.stats.replacedWithCalls, old.calls);
          if (R.keepCalls && old.calls > 0) nc.calls = Math.min(nc.maxCalls + R.keepCalls, nc.calls + Math.min(R.keepCalls, old.calls));
        }
        this.contracts[target] = nc;
        this.monthStats.firstContractBought = true; this.stats.contractsBought++;
        this.say('log.buyContract', { name: it.name, price, old: old ? MSG('log.buyContractOld', { name: this.contractName(old), calls: old.calls }) : '' });
      } else if (it.kind === 'refill') {
        const r = this.refill(it.contractId); if (!r.ok) return r;
        it.sold = true; return { ok: true, refill: true, wasted: r.wasted }; // 충전은 월 구매 한도에 안 들어간다
      } else if (it.kind === 'enh') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        const c = this.contracts[target];
        if (!c) return { ok: false, msg: T('err.pickContract') };
        const e = D.ENHANCEMENTS[it.enh];
        if (e.kind === 'limit') { if (c.enh.limit >= 2) return { ok: false, msg: T('err.limitMax') }; c.enh.limit++; c.maxCalls += e.value; c.calls += e.value; }
        else if (e.kind === 'cap') { if (c.enh.cap >= 3) return { ok: false, msg: T('err.capMax') }; c.enh.cap++; }
        else if (e.kind === 'regular') { if (c.enh.regular) return { ok: false, msg: T('err.hasRegular') }; c.enh.regular = true; }
        else if (e.kind === 'express') { if (c.enh.express) return { ok: false, msg: T('err.hasExpress') }; c.enh.express = true; }
        else if (e.kind === 'trust') this._addTrust(c.carrier, e.value);
        else if (e.kind === 'opt') {
          const car = D.CARRIERS[c.carrier];
          if (c.enh.opt) return { ok: false, msg: T('err.optOne') };
          if (car.caps.includes(e.attr)) return { ok: false, msg: T('err.optHasAttr') };
          if (e.maxSizeMax && car.sizeMax > e.maxSizeMax) return { ok: false, msg: T('err.optSize', { max: e.maxSizeMax }) };
          if (car.onlyPlain) return { ok: false, msg: T('err.optPlain') };
          c.enh.opt = it.enh; if (e.capDelta) c.enh.capDelta += e.capDelta; if (e.callsDelta) { c.maxCalls = Math.max(1, c.maxCalls + e.callsDelta); c.calls = Math.max(0, Math.min(c.calls, c.maxCalls)); }
        }
        this._updateTrustStats();
        this.say('log.enhance', { name: e.name, contract: this.contractName(c), price });
      } else if (it.kind === 'customer') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        if (this.customerCount() >= M.CUSTOMER_SLOTS) return { ok: false, msg: T('err.customerMax', { n: M.CUSTOMER_SLOTS }) };
        if (!this.addCustomer(it.customer)) return { ok: false, msg: T('err.customerDup') };
        this.say('log.buyCustomer', { name: M.CUSTOMERS[it.customer].name, price });
      } else if (it.kind === 'item') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        if (it.item === 'transitCert') this.items.transitCert++; else this.items[it.item] = this.month + 1;
        this.say('log.buyItem', { name: it.name, price });
      } else if (it.kind === 'fac') {
        if (!it.fac) return { ok: false, msg: T('err.soldOut') };
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        const f = D.FACILITIES[it.fac];
        if (f.cap) { this.warehouse.cap += Math.round(f.cap * R.facilityCapMult); this.stats.expansions++; }
        if (f.cold) { this.warehouse.cold += f.cold; if (R.coldCapMax != null) this.warehouse.cold = Math.min(this.warehouse.cold, R.coldCapMax); this.stats.coldUpgrades++; }
        if (f.xl) this.warehouse.xl += f.xl;
        if (f.frozen) { this.warehouse.frozen = (this.warehouse.frozen || 0) + f.frozen; if (R.frozenCapMax != null) this.warehouse.frozen = Math.min(this.warehouse.frozen, R.frozenCapMax); }
        this.warehouse[it.fac] = true;
        this._assignCold();
        this.say('log.buyFacility', { name: f.name, price });
      }
      this.cash -= price; this.run.spent += price; this.market.bought++; it.sold = true;
      return { ok: true };
    }
    closeMarket() {
      if (this.phase !== 'market') return false;
      const prep = this.market.prep;
      this.market = null;
      if (prep) { this.phase = 'play'; this.say('log.monthStart', { m: 1 }); this._startTurn(); return true; }
      this._startMonth(this.month + 1);
      return true;
    }

    // ----- save / load -----
    toJSON() {
      const { rng, rules, scenario, company, difficulty, ...rest } = this;
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
      // 세이브 마이그레이션 (v0.4: 속성·특약·냉동·통관)
      const es = Game.emptyStats(); for (const k in es) if (g.stats[k] == null) g.stats[k] = es[k];
      for (const k of ['deliveredByType', 'onTimeByType']) for (const t in D.PARCEL_TYPES) if (g.stats[k][t] == null) g.stats[k][t] = 0;
      for (const c of g.contracts) if (c && !D.CARRIERS[c.carrier]) { const nk = D.centerFor(c.carrier, GRADE_RANK.indexOf(c.grade || 'normal')) || 'bulk0'; if (g.trust && g.trust[c.carrier] != null) { g.trust[nk] = g.trust[c.carrier]; } c.carrier = nk; c.grade = D.CARRIERS[nk].grade; }
      for (const k of Object.keys(D.CARRIERS)) if (g.trust && g.trust[k] == null) g.trust[k] = 0;
      for (const c of g.contracts) if (c) { c.enh = Object.assign({ limit: 0, cap: 0, regular: false, express: false, opt: null, capDelta: 0 }, c.enh || {}); if (c.enh.capDelta == null) c.enh.capDelta = 0; }
      for (const p of g.parcels) { if (!p.attrs) p.attrs = D.PARCEL_TYPES[p.type].attrs.slice(); if (p.warm == null) p.warm = 0; if (p.customs == null) p.customs = 0; if (p.inFrozen == null) p.inFrozen = false; delete p.fresh; }
      if (g.warehouse && g.warehouse.frozen == null) g.warehouse.frozen = g.warehouse.cold > 0 ? D.WAREHOUSE.frozen : 0;
      if (g.monthStats) for (const k of ['returned', 'stolen', 'broken']) if (g.monthStats[k] == null) g.monthStats[k] = 0;
      if (!g.pendingRevenue) g.pendingRevenue = []; if (g.feesDue == null) g.feesDue = 0; if (g.debt == null) g.debt = 0; if (g.totalTurn == null) g.totalTurn = (g.month - 1) * D.TURNS_PER_MONTH + g.turn;
      if (!g.customers) { g._initCustomers(); for (const p of g.parcels) if (!p.customer) p.customer = 'anon'; }
      for (const id in g.customers) { const c = g.customers[id]; if (!c.total) c.total = { delivered: 0, revenue: 0, claims: 0, discarded: 0 }; if (!c.month) c.month = g._emptyCustMonth(); }
      if (g.monthStats && g.monthStats.claims == null) g.monthStats.claims = 0;
      if (g.bigCustomer === undefined) g.bigCustomer = null;
      if (!g.storage) { g.storage = []; g.offer = null; g.outdoorPref = []; g.insurer = 'none'; g.premMult = 1; g.noClaimMonths = 0; g.coverHalf = false; g.items = { transitCert: 0, yardIns: 0, customsBond: 0 }; }
      if (!g.weather || !g.weather.length) g.weather = Array(D.TURNS_PER_MONTH).fill('sunny').map((w, i) => g.heatTurns && g.heatTurns.includes(i + 1) ? 'heat' : w);
      if (g.monthStats) for (const k of ['insClaims', 'covered', 'premium', 'storageIncome']) if (g.monthStats[k] == null) g.monthStats[k] = 0;
      g._assignCold();
      return g;
    }
  }

  const API = { Game, Rng, dailyConfig, dailySeed, mergeMods, DATA: D, META: M };
  if (typeof module !== 'undefined') module.exports = API; else Object.assign(root, API);
})(typeof window !== 'undefined' ? window : globalThis);
