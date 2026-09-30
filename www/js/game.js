// 게임 코어 로직 (순수 상태 머신 — 브라우저/Node 공용)
// 런 설정(시나리오·회사·퍽·데일리 변형) → rules 객체 → 규칙 적용
(function (root) {
  const D = typeof module !== 'undefined' ? require('./data.js') : root.DATA;
  const M = typeof module !== 'undefined' ? require('./meta.js') : root.META;
  const I18n = typeof module !== 'undefined' ? require('./i18n.js').init(D, M) : root.I18n;
  const TUT = typeof module !== 'undefined' ? require('./tutorial.js') : root.TUTORIAL;
  const LV = typeof module !== 'undefined' ? require('./levels.js') : root.LEVELS;
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
    months: 3, scoreMult: 1, calendar: 'kr', monthOffset: 0,
    cashDelta: 0, cashMult: 1, opCostFixed: null, opCostDelta: 0, opCostRandom: null, lateOpCost: null,
    firstCallBonus: 0, freshExtra: 0, coldTrustBonus: 0, rewardMult: {}, rewardDelta: {}, rewardAll: 0, revenueMult: 1, bonusDelta: 0,
    banCarriers: [], marketWeight: {}, bigSizeDelta: 0, sizeDelta: 0, storeBigDelta: 0, carrierCapDelta: {}, coldCapMax: null, callsDelta: 0, startCallsDelta: 0, startFacilities: [], callsMult: D.CALLS_SCALE || 1,
    facilityCapMult: 1, carrierStartTrust: {}, gradeShift: 0, deadlineDelta: {}, deadlineAll: 0, bigCallPenalty: null,
    priceMult: 1, contractPriceMult: 1, itemPriceMult: 1, facilityPriceMult: 1, waitStack: 0, skipBonus: 0,
    randomStart: false, freeRefresh: 0, marketContractSlots: 2, erosion: false, stressRelief: null, keepCalls: 0, marketMaxBuy: D.MARKET_MAX_BUY, expertFrom: 1,
    firstContractDiscount: 0, rebuyTrust: 0, spareCall: false, bundleRefund: null, overflowGrace: 0, capDelta: 0, freezer: 0, xlDelta: 0, xlPenalty: 3,
    insurance: false, monthlyStress: 0, overdueMult: 0.75, overdueStress: 0, upcomingTurns: 2, urgentDiscount: 1, guaranteeCarriers: [], guaranteeBlocked: true, returnGrace: D.RETURN_GRACE, theftMult: 1, overdueTurnStress: 0, breakMult: 1, warmLimit: D.WARM_LIMIT, customsWait: D.CUSTOMS_WAIT, customsDelayProb: D.CUSTOMS_DELAY_PROB, returnGraceFresh: 1, frozenCapMax: null, claimMult: 1, customerWeights: {}, forceCustomers: [], noAnon: false, closingBonus: null, trustXpDelta: 0, trustXpMult: 1,
    arrivalsMult: 1, typeShift: null, typeOverride: null, freshSizes: null, warmMult: 2, heatAlerts: 0,
    xlWeight: null, bigWeight: 1, bigCallBonus: null,
    selfCapDelta: 0, allStartTrust: 0,
    // 3.5단계: 보험·날씨·보관·적재
    premiumMult: 1, premiumDelta: {}, noInsurance: false, season: null, startMonth: null, weatherWeights: {}, tent: false, forecastTurns: 2,
    noBankrupt: false, noDeadlineCycles: 0, storageOfferProb: 0.12, storageMax: 2, storageFeeMult: 1, storageAnon: false,
    // 4단계: 난이도·시나리오 고객 규칙
    feeMult: 1, feeFixed: null, feeDelta: 0,
    cycleOffset: 0, noRepEnd: false, noFacilities: false, gameoverStress: D.GAMEOVER_STRESS, year: 0, noDualAttrs: false, dualAttrBonus: 0, customerClaimMult: {}, noHolidays: false,
    // 멀티플레이 「난투」 (docs/MULTIPLAYER_DESIGN.md · META.MULTI.mods). 개인 런은 전부 꺼져 있다
    multi: false, noCalendarEvents: false, noWeekend: false, unlimitedCalls: false, noCallFee: false, payNow: false, noLoan: false, repDecides: false, finishDump: false, pushMult: 1, freshNoSpoil: false,
    shopDay: false, noCycleMarket: false, autoSummary: false,
    repStep: 0, perkPick: false, noRepUnlock: false, repShop: false, cycleRefill: false, noMoney: false, traitSameDay: false, maxParcelSize: 0, typeMaxSize: null, noLateShipPenalty: false, startFamilies: null, contractGated: false, specialTraitMult: 1, normalAnywhere: false, typeTraits: false, noRush: false, typeFamilies: false, repPerParcel: false, traitPerCall: false, traitAll: false, repStepGrow: 0, repStepMax: 0, repFirstGap: 0, famRules: false, strictCarry: false, ownCargo: 0, ownCargoMax: 1, typeSizes: null, maxTrucks: 0, repKeepTier: false, pushFlat: 0, mixCombo: false, truckCap: null, famTrucks: null, theftMaxDay: 0,
    sharedSchedule: false, fixedCustLevel: null, dayArrivalsRate: 0, finalRushMult: 1, fuelRate: 0,
    finalRushReward: 0, freeTrucksPerCycle: 0, earlyRepBonus: 0, rushRepBonus: 0, cleanRepBonus: 0, returnGraceDelta: 0,
    traits: false, traitRate: [0, 0], attackShare: 0.4, repairs: false, chainPush: false, shieldPassive: 0, rainImmune: false, dodgeProb: 0, attackEcho: 0, repairGrow: 0, attackMult: 1,
  };
  const MULT_KEYS = ['attackMult', 'theftMult', 'breakMult', 'claimMult', 'premiumMult', 'storageFeeMult', 'feeMult', 'cashMult', 'revenueMult', 'priceMult', 'contractPriceMult', 'itemPriceMult', 'facilityCapMult', 'facilityPriceMult', 'trustXpMult', 'arrivalsMult', 'urgentDiscount', 'bigWeight', 'scoreMult'];
  const ADD_KEYS = ['cashDelta', 'opCostDelta', 'freshExtra', 'coldTrustBonus', 'rewardAll', 'bonusDelta', 'bigSizeDelta', 'sizeDelta', 'storeBigDelta', 'callsDelta', 'startCallsDelta', 'gradeShift', 'capDelta', 'xlDelta', 'monthlyStress', 'trustXpDelta', 'deadlineAll', 'firstCallBonus', 'skipBonus', 'heatAlerts', 'selfCapDelta', 'allStartTrust', 'finalRushReward', 'freeTrucksPerCycle', 'earlyRepBonus', 'returnGraceDelta', 'shieldPassive', 'dodgeProb', 'attackEcho', 'repairGrow'];
  const MAP_ADD_KEYS = ['rewardDelta', 'carrierCapDelta', 'deadlineDelta', 'carrierStartTrust', 'premiumDelta', 'typeShift'];   // typeShift 도 더한다(난투 기본 + 테마)
  const MAP_MULT_KEYS = ['rewardMult', 'marketWeight', 'customerWeights', 'weatherWeights', 'customerClaimMult'];
  const LIST_KEYS = ['banCarriers', 'guaranteeCarriers'];
  // 뒤에 오는 설정이 앞을 덮는다: 런(시나리오) → 회사 → 캠페인 장 → 퍽 순
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
        else if (MAP_ADD_KEYS.includes(k)) { if (!r[k]) r[k] = {}; for (const t in v) r[k][t] = (r[k][t] || 0) + v[t]; }
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
  // ---------- Game ----------
  class Game {
    constructor(cfg) {
      cfg = Object.assign({ scenario: M.DEFAULT_SCENARIO, company: 'local', perks: [] }, cfg || {});
      // 예전 세이브·기록의 시나리오 id → 새 런 (분기·반기·한 해는 같은 3월 시작이라 그대로 이어진다)
      if (!M.SCENARIOS[cfg.scenario]) cfg.scenario = ({ quarter: 'kr_spring', halfyear: 'kr_spring', standard: 'kr_spring', kr_h1: 'kr_spring', kr_h2: 'kr_autumn', kr_year: 'kr_spring' })[cfg.scenario] || M.DEFAULT_SCENARIO;
      // 인수인계(대본) 런은 시드까지 고정 — 대본 밖 굴림(파손·도난·통관)도 매번 같아야 같은 환경이 재현된다
      // 캠페인 레벨: 대본 · 고정 시드 · 켜져 있는 기능 집합 (levels.js)
      this.level = cfg.level && LV ? LV.get(cfg.level) : null;
      this._shows = this.level ? LV.showsAt(cfg.level) : null;
      if (this.level && this.level.seed) cfg.seed = this.level.seed;
      if (cfg.scripted && TUT) cfg.seed = TUT.SEED;
      if (cfg.seed == null) cfg.seed = Date.now() % 2147483647;
      this.cfg = cfg;
      this.seed = cfg.seed;
      this.rng = new Rng(this.seed);
      this.nextId = 1;
      this._buildRules();
      this.phase = 'play';           // play | summary | market | over | win
      this.perks = cfg.perks.slice();
      this.mperks = (cfg.mperks || []).slice(); this.perkOffer = null; this.repShop = null;   // 난투: 평판 상한에 닿으면 3장 랜덤 상점(repShop) — 퍽·계약·강화를 돈으로   // 멀티: 평판 등급업마다 3택1로 고른 퍽 · 지금 떠 있는 카드 3장
      // 멀티 2단계: 상대에게서 온 공격 큐(다음 날로 넘길 때 적용) · 나가는 것(공격·보수공사 이사, multi.js 가 라우팅) · 방패 · 임시 칸 · 한 방 · 덤 트럭
      this.actLog = [];   // 멀티 3단계: 입력 로그 — 서버가 같은 시드로 다시 돌려 검증한다 (MULTI.replay)
      this.inbox = []; this.outbox = []; this.shields = 0; this.capMods = []; this.focusNext = false; this.freeTruckNext = false; this.freshFreezeUntil = 0; this.roadblockDay = 0; this.roadblockSlot = -1; this.traitUnlocks = [];   // 난투: 산 트레잇 언락(물품 종류별 두 번째 트레잇)
      this.month = 0; this.turn = 0;
      // 런의 해. 시나리오(rules.year)나 cfg 가 지정하면 그 해, 아니면 시작한 해를 찍어 세이브에 고정한다.
      // 로그라이크라 해마다 요일·영업일 수가 달라지는 건 그대로 받는다 — 인수인계(대본)만 해를 고정한다.
      this.year = cfg.year || (cfg.scripted && TUT && TUT.YEAR) || new Date().getFullYear();
      this.weekend = null; this.weekendBonus = null;
      this.rep = 0; this.repTier = 0; this.repDropped = false;   // 평판(키우는 지표) — _buildRules 뒤에 상한만큼 채워 시작한다
      this.parcels = [];
      this.schedule = [];
      this.log = [];
      this.events = [];
      this.waitedLastTurn = false; this.waitStack = 0;
      this.insuranceUsed = false;
      this.market = null;
      this.storage = []; this.offer = null; this.outdoorPref = []; this.weather = []; this.pendingRevenue = []; this.feesDue = 0; this.debt = 0;
      this.insurer = 'none'; this.premMult = 1; this.noClaimMonths = 0; this.coverHalf = false; this.items = { transitCert: 0, yardIns: 0, customsBond: 0 };
      this.campaignCycle = 0;                 // 마지막으로 캠페인을 연 사이클
      this.mediaRuns = { m: 0, used: {} };    // 이번 사이클에 매체별로 집행한 횟수 (사이클이 바뀌면 다시 찬다)
      this.growth = Object.assign({ marketing: 0, fleet: 0, warehouse: 0, automation: 0, branding: 0, coldchain: 0 }, (cfg.carry && cfg.carry.growth) || {});
      this.media = Object.assign({ flyer: 1 }, (cfg.carry && cfg.carry.media) || {});   // 광고 매체 → 레벨. 전단지는 처음부터
      this.adTickets = Object.assign({ flyer: 1 }, (cfg.carry && cfg.carry.adTickets) || {});   // 전단지 한 장으로 시작 — 장·계절을 넘기면 남은 권이 따라온다
      this.monthStats = null;
      this.run = { revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, discarded: 0 };
      this.loadChain = 0;
      this.stats = Game.emptyStats();
      this.summary = null; this.result = null;
      this.heatTurns = [];
      // 창고장 안내(스토리 모드) 진행 상태 — 본 비트 id. 장이 넘어가도 이어진다: 박 반장이 같은 말을 두 번 하지 않는다
      this.story = cfg.story ? { seen: ((cfg.carry && cfg.carry.seen) || []).slice(), notes: ((cfg.carry && cfg.carry.notes) || []).slice() } : null;
      if (this.rules.multi) this.story = { seen: [], notes: [], off: true };   // 난투엔 대사가 없다 — 담당자 인사(greet)·비트 전부 (유저: "말 없애달라 했는데 난투에서는")
      this.trust = {}; // 업체별 신뢰도 경험치 (런 내 유지)
      for (const k of Object.keys(D.CARRIERS)) this.trust[k] = (famVal(this.rules.carrierStartTrust, k) || 0) + this.rules.allStartTrust;
      const cyTrust = cfg.carry && cfg.carry.trust;
      if (cyTrust) for (const k in cyTrust) if (this.trust[k] != null) this.trust[k] = cyTrust[k];
      if (this.rules.year) this.year = this.rules.year;   // 시나리오가 해를 지정하면 그 해의 달력으로
      this.rep = this.rules.gameoverStress;   // 전임 창고장이 물려준 평판에서 시작한다
      // 평판이 처음 열리는 장은 상한보다 낮게 시작한다 — 가득 찬 막대로 시작하면 채울 게 없다
      if (this.level && this.level.startRep != null) this.rep = Math.min(this.rep, this.level.startRep);
      else if (!this.level) this.rep = Math.round(this.rules.gameoverStress * D.START_REP);
      if (this.rules.repFirstGap && this.rules.repStep) this.repCapV = this.rep + this.rules.repFirstGap;   // 첫 상점은 몇 개만 보내면 뜬다
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
        brokeMonthEnd: false, maxMonthDelivered: 0, distinctCarriersAtEnd: 0, monthsDone: 0, selfCalls: 0, urgentCalls: 0, bigDelivered: 0, feesPaid: 0, fullTrucks: 0, trucksCalled: 0, rushes: 0, rushBonus: 0, maxLoadChain: 0, chainBonus: 0, holidayRushDelivered: 0 };
    }
    _buildRules() {
      const c = this.cfg;
      const sc = M.SCENARIOS[c.scenario] || M.SCENARIOS[M.DEFAULT_SCENARIO];
      const co = M.COMPANIES[c.company] || M.COMPANIES.local;
      const mods = [{ months: sc.months }, sc.mods, co.mods];
      if (c.months) mods.push({ months: c.months });   // 시뮬레이터·테스트 전용: 런 길이(사이클)를 직접 준다
      // 캠페인은 난이도 대신 장 공통 보정(levels.js BASE_MODS)을 깐다 — 예전 '수습' 난이도가 하던 일
      if (this.level && LV && LV.BASE_MODS) mods.push(LV.BASE_MODS);
      // 레벨은 시나리오 위에 얹는다 — 길이(사이클)·해·시작 달과 그 레벨만의 보정
      if (this.level) { mods.push({ months: this.level.cycles }); if (this.level.year) mods.push({ year: this.level.year }); if (this.level.startMonth) mods.push({ startMonth: this.level.startMonth }); if (this.level.monthOffset) mods.push({ monthOffset: this.level.monthOffset }); if (this.level.cycleOffset) mods.push({ cycleOffset: this.level.cycleOffset }); if (this.level.mods) mods.push(this.level.mods); }
      if (c.noHolidays) mods.push({ noHolidays: true });   // 테스트·시뮬레이터: 공휴일 없이 돌리기
      for (const p of c.perks) if (M.PERKS[p]) mods.push(M.PERKS[p].mods);
      // 멀티 「난투」: 시나리오·회사 위에 멀티 규칙 셋을 덮고, 런 중에 고른 퍽(3택1)을 그 위에 얹는다
      if (c.multi && M.MULTI) { mods.push(M.MULTI.mods); if (c.mtheme && M.MULTI.THEMES && M.MULTI.THEMES[c.mtheme]) mods.push(M.MULTI.THEMES[c.mtheme].mods || {}); if (c.mchar && M.MULTI.CHARS && M.MULTI.CHARS[c.mchar]) mods.push(M.MULTI.CHARS[c.mchar].mods || {}); for (const p of c.mperks || []) if (M.MULTI.PERKS[p] && M.MULTI.PERKS[p].mods) mods.push(M.MULTI.PERKS[p].mods); }
      this.rules = mergeMods(mods);
      this.scenario = sc; this.company = co;
    }
    _initCompany() {
      const R = this.rules, co = this.company;
      let wh, contracts;
      if (R.randomStart) {
        wh = { cap: 20 + this.rng.int(11), cold: this.rng.int(11), xl: this.rng.int(3) };
        const pool = Object.keys(D.CARRIERS).filter(k => !this.isBanned(k) && D.CARRIERS[k].tier <= 1 && !D.CARRIERS[k].campaign);
        const fams = [...new Set(this.rng.shuffle(pool).map(FAM))].slice(0, 4);
        contracts = fams.map(f => ({ carrier: f, grade: this.rng.next() < 0.3 ? 'trusted' : 'normal' }));
      } else {
        // 장이 넘어가면 지난 장의 판을 그대로 물려받는다 (profile.campaign.carry). 없으면 그 레벨의 시작 판.
        const cy = this.cfg.carry, lc = this.level && this.level.company;
        wh = { ...((cy && cy.warehouse) || (lc && lc.warehouse) || co.warehouse) };
        contracts = (cy && cy.contracts) || (lc && lc.contracts) || co.contracts;
      }
      if (R.startFamilies) contracts = contracts.filter(s => R.startFamilies.includes(FAM(s.carrier)));   // 난투: 한길(대량)만 들고 시작 — 나머지는 평판 상점에서 (유저)
      // 앞 장을 망쳐도(확장을 못 샀어도) 그 장의 대본이 성립하도록 바닥값을 보장한다.
      // 냉장·냉동 칸도 같이 봐야 한다 — 칸만 보장하고 냉장을 안 보장하면 ❄·🧊 가 갈 데가 없다.
      if (this.level && this.level.minCap != null) wh.cap = Math.max(wh.cap, this.level.minCap);
      const mw = this.level && this.level.minWarehouse;
      if (mw) for (const k of ['cap', 'cold', 'frozen', 'xl']) if (mw[k] != null) wh[k] = Math.max(wh[k] || 0, mw[k]);
      wh.cap += R.capDelta; wh.xl += R.xlDelta;
      // 퍽이 주는 시작 시설(선반 증설 → 선반 랙) — 마켓에서 산 것과 똑같이: 칸·구역·시설 표시(3D 랙·유지비)
      for (const fid of R.startFacilities || []) { const f = D.FACILITIES[fid]; if (!f || wh[fid]) continue;
        if (f.cap) { const add = Math.round(f.cap * (R.facilityCapMult || 1)); wh.cap += add; if (f.area) wh[f.area + 'Cap'] = (wh[f.area + 'Cap'] || 0) + add; }
        if (f.cold) wh.cold = (wh.cold || 0) + f.cold; if (f.xl) wh.xl = (wh.xl || 0) + f.xl; wh[fid] = true; }
      if (R.coldCapMax != null) wh.cold = Math.min(wh.cold, R.coldCapMax);
      if (wh.frozen == null) wh.frozen = R.coldCapMax === 0 ? 0 : (wh.cold > 0 ? D.WAREHOUSE.frozen : 0);
      if (R.frozenCapMax != null) wh.frozen = Math.min(wh.frozen, R.frozenCapMax);
      this.warehouse = wh;
      const cyCash = this.cfg.carry && this.cfg.carry.cash, lvCash = this.level && this.level.company && this.level.company.cash;
      const baseCash = cyCash != null ? cyCash : lvCash != null ? lvCash : co.cash;
      this.cash = Math.round((baseCash + R.cashDelta) * R.cashMult);
      // 망한 판으로 다음 장이 막히지 않게, 그 장의 바닥값은 보장한다
      if (this.level && this.level.minCash != null) this.cash = Math.max(this.cash, this.level.minCash);
      const carried = !!this.cfg.carry;
      this.contracts = contracts.map(s => {
        const c = this._makeContract(this.resolveCenter(s.carrier, s.grade || 'normal'), null, null, true);
        if (s.enh) Object.assign(c.enh, s.enh);
        if (s.calls != null) c.calls = Math.min(c.maxCalls, s.calls + R.startCallsDelta);
        // 앞 장을 배차 0으로 끝냈다고 다음 장을 통째로 못 보내면 안 된다 — 한 장이 한 사이클이고
        // 마켓은 그 끝에만 열리니까, 바닥난 채로 시작하면 열흘 동안 손쓸 방법이 아예 없다.
        // 장이 바뀌는 사이에 새로 끊어 둔 것으로 치고 바닥을 보장한다.
        if (carried) c.calls = Math.max(c.calls, Math.ceil(c.maxCalls * D.CARRY_CALLS_FLOOR));
        if (this.level && this.level.minCalls != null) c.calls = Math.max(c.calls, Math.min(c.maxCalls, this.level.minCalls));
        return c;
      });
      // 장이 새로 쥐여 주는 계약 — 물려받은 판(carry)에 없으면 붙인다 (addCustomers 와 같은 규칙)
      for (const s of (this.level && this.level.addContracts) || []) {
        if (this.contracts.length >= D.CONTRACT_SLOTS || this.contracts.some(c => c && c.carrier === this.resolveCenter(s.carrier, s.grade || 'normal'))) continue;
        const c = this._makeContract(this.resolveCenter(s.carrier, s.grade || 'normal'), null, null, true);
        if (this.level.minCalls != null) c.calls = Math.max(c.calls, Math.min(c.maxCalls, this.level.minCalls));
        this.contracts.push(c);
      }
      while (this.contracts.length < D.CONTRACT_SLOTS) this.contracts.push(null);
      this.startContractIds = this.contracts.filter(Boolean).map(c => c.id);
    }

    // 장이 끝날 때 다음 장으로 넘길 판. 한 런이 이어지는 것처럼 보이려면 자금·창고·계약·고객·신뢰가 같이 가야 한다.
    // (택배·기한은 안 넘긴다 — 장이 바뀌면 판을 새로 깔고, 남은 물건은 리포트에서 정리된 것으로 친다)
    // 화면에 보여 줄 계약 슬롯 수. 특수 품목이 오기 전에는 슬롯이 하나면 충분하다 —
    // 빈 슬롯 세 칸은 "여기를 채워야 한다"는 잘못된 숙제처럼 보인다.
    visibleSlots() {
      if (!this._shows) return D.CONTRACT_SLOTS;
      const n = !this.shows('cold') ? 1 : !this.shows('bigsize') ? 3 : D.CONTRACT_SLOTS;
      return Math.max(n, this.contracts.filter(Boolean).length);
    }

    carryState() {
      return {
        cash: this.cash,
        year: this.year,   // 계절을 이어 갈 때(여름 → 가을 → 겨울) 같은 해의 달력으로 이어지게
        warehouse: Object.assign({ cap: this.warehouse.cap, cold: this.warehouse.cold, frozen: this.warehouse.frozen, xl: this.warehouse.xl || 0, rackCap: this.warehouse.rackCap || 0, mezzCap: this.warehouse.mezzCap || 0 },
          Object.fromEntries(Object.keys(D.FACILITIES).filter(f => this.warehouse[f]).map(f => [f, true]))),   // 산 시설도 넘긴다 — 다음 장에서 랙을 또 팔면 안 된다
        contracts: this.contracts.filter(Boolean).map(c => ({ carrier: c.carrier, grade: c.grade, calls: c.calls, enh: { ...c.enh } })),
        customers: Object.keys(this.customers).map(id => [id, this.customerLevel(id)]),
        trust: { ...this.trust },
        growth: { ...this.growth },
        media: { ...this.media },
        adTickets: { ...(this.adTickets || {}) },
        seen: this.story ? this.story.seen.slice() : [],
        notes: this.story ? this.story.notes.slice() : [],
      };
    }

    // ----- 고객(화주) (docs/CUSTOMER_DESIGN.md 2장) -----
    _initCustomers() {
      const R = this.rules, co = this.company;
      let list = (this.cfg.carry && this.cfg.carry.customers) || (this.level && this.level.company && this.level.company.customers) || co.customers;
      // 장이 새 화주를 데려온다 — 물려받은 목록 위에 더한다(덮어쓰지 않는다)
      for (const [k, lv] of (this.level && this.level.addCustomers) || []) if (!list.some(x => x[0] === k)) list = list.concat([[k, lv || 0]]);
      if (!list) { const pool = this.rng.shuffle(Object.keys(M.CUSTOMERS).filter(k => k !== 'anon')).slice(0, 3); list = pool.map(k => [k, this.rng.int(3)]).concat([['anon', 0]]); }
      this.customers = {};
      for (const [id, lv] of list) {
        const c = this.customers[id] || (this.customers[id] = { id, xp: 0, slots: 0, suspended: false, streak: 0, perkApplied: {}, month: this._emptyCustMonth(), total: { delivered: 0, revenue: 0, claims: 0, discarded: 0 } });
        c.slots++; c.xp = Math.max(c.xp, M.CUSTOMER_LEVELS[lv] || 0);
      }
      for (const id in this.customers) this._applyCustomerPerks(id);
      // 자유 런: 회사 명단의 기업 고객은 '이미 맺어 둔 계약'으로 시작한다 — 두 사이클, 명단의 단계가 곧 관계
      this.deals = this.deals || []; this.relations = this.relations || {};
      // 바탕(개인 고객) 물량을 DEAL.anonShare 로 줄인 만큼 기업 계약이 채운다 — 첫 보름의 총량은 예전과 비슷하다
      if (this.bizMode() && !this.deals.length) for (const [id, lv] of list) {
        if (id === 'anon' || !M.CUSTOMERS[id] || M.CUSTOMERS[id].storage || this.dealFor(id)) continue;
        this.relations[id] = Math.max(this.relations[id] || 0, lv || 0);
        this._pushDeal(this._dealTerms(id, 2), 1);
      }
    }
    // 마켓 신규 고객 계약
    addCustomer(id) {
      if (!M.CUSTOMERS[id] || this.customers[id]) return false;
      this.customers[id] = { id, xp: 0, slots: 1, suspended: false, streak: 0, perkApplied: {}, month: this._emptyCustMonth(), total: { delivered: 0, revenue: 0, claims: 0, discarded: 0 } };
      this._applyCustomerPerks(id); this.stats.customersAdded++;
      return true;
    }
    customerCount() { return Object.keys(this.customers).filter(id => id !== 'anon').length; }
    // ----- 기업 계약 (자유 런, docs/CUSTOMER_DESIGN.md 8장) -----
    // 스토리 장은 예전 고객 신뢰(Lv)를 그대로 쓴다 — 장마다 대사가 그 규칙을 가르친다
    bizMode() { return this.shows('bizDeals') && !(this.cfg && this.cfg.legacyCustomers); }
    relation(id) { return (this.relations && this.relations[id]) || 0; }
    activeDeals() { return (this.deals || []).filter(d => d.left > 0); }
    dealFor(id) { return (this.deals || []).find(d => d.customer === id && d.left > 0) || null; }
    isFanInsurer(id, ins) { ins = ins || this.insurer; return ins !== 'none' && ((M.INSURERS[ins] || {}).fans || []).includes(id); }
    _dealTerms(id, cycles, opts) {
      const DL = M.DEAL, cust = M.CUSTOMERS[id] || {}, rel = this.relation(id), fan = this.isFanInsurer(id), renew = !!(opts && opts.renew);
      const base = DL.cells[Math.min(DL.cells.length - 1, cust.repTier || 0)];
      const cells = Math.round(base * (1 + rel * DL.relVolume + (fan ? DL.fanVolume : 0)) * (renew ? 1.1 : 1));
      const rate = Math.round((1 + rel * DL.relRate + (fan ? DL.fanRate : 0)) * 100) / 100;
      const bonus = DL.bonusBase + DL.bonusPerCycle * cycles + DL.bonusPerRel * rel;
      return { customer: id, cycles, cells, rate, bonus, fan, rel, renew };
    }
    _pushDeal(terms, start) {
      if (!this.customers[terms.customer]) this.customers[terms.customer] = { id: terms.customer, xp: 0, slots: 1, suspended: false, streak: 0, perkApplied: {}, month: this._emptyCustMonth(), total: { delivered: 0, revenue: 0, claims: 0, discarded: 0 } };
      const d = { ...terms, left: terms.cycles, start, st: { delivered: 0, onTime: 0, rush: 0, claims: 0 }, cyc: { target: 0, cells: 0 } };
      this.deals.push(d); return d;
    }
    dealBlock(id) {
      if (this.insurer === 'none') return 'insurance';
      if (this.dealFor(id)) return 'dup';
      if (this.activeDeals().length >= M.CUSTOMER_SLOTS) return 'slots';
      return null;
    }
    signDeal(id, cycles, renew) {
      const why = this.dealBlock(id); if (why) return { ok: false, reason: why };
      const t = this._dealTerms(id, cycles, { renew });
      const d = this._pushDeal(t, this.market && this.market.prep ? this.month : this.month + 1);
      this.stats.customersAdded++;
      this.say('log.dealSign', { name: M.CUSTOMERS[id].name, cycles, cells: t.cells });
      return { ok: true, deal: d };
    }
    // 평가 점수: 정시율 + ⚡긴급 당일 처리 가산 − 사고 감산. 사고가 하나라도 있으면 S 는 없다
    dealScore(d) { const DL = M.DEAL, s = d.st; const rate = s.delivered ? s.onTime / s.delivered : 1; return Math.max(0, rate + s.rush * DL.rushWeight - s.claims * DL.claimPenalty); }
    dealGrade(d) { const sc = this.dealScore(d); for (const g of M.DEAL.grades) { if (g[0] === 'S' && d.st.claims) continue; if (sc >= g[1]) return g; } return M.DEAL.grades[M.DEAL.grades.length - 1]; }
    _settleDeals() {
      const DL = M.DEAL, out = [];
      for (const d of this.activeDeals()) {
        if (d.start > this.month) continue;          // 이번 마켓에 맺은 것 — 다음 사이클부터
        d.left--;
        if (d.left > 0) continue;
        const g = this.dealGrade(d), id = d.customer, cust = M.CUSTOMERS[id], rel0 = this.relation(id);
        const rel = Math.max(0, Math.min(M.CUSTOMER_LEVELS.length - 1, rel0 + g[2])); this.relations[id] = rel;
        if (rel >= 3 && rel0 < 3) this.stats.customerL3++;
        let rep = 0; if (g[3]) rep = this.addRep(g[3], MSG('why.repDeal', { name: cust.name, grade: g[0] })) || g[3];
        let bonus = 0; if (!d.st.claims) { bonus = d.bonus; this.cash += bonus; this.monthStats.revenue += bonus; this.run.revenue += bonus; }
        if (g[0] === 'C') (this.dealCooldown || (this.dealCooldown = {}))[id] = this.month + DL.cooldown;
        const r = { customer: id, grade: g[0], rel, relDelta: rel - rel0, rep: g[3], bonus, score: Math.round(this.dealScore(d) * 100), st: { ...d.st }, cycles: d.cycles };
        out.push(r);
        this.say('log.dealDone', { name: cust.name, grade: g[0], bonus: bonus ? MSG('log.dealBonus', { n: bonus }) : '' });
        this.emit('dealDone', r);
      }
      this.dealResults = out;
      return out;
    }
    // 정산 마켓의 제안서: 만기가 좋게 끝난 기업의 재계약이 먼저, 그 다음 평판 등급이 연 새 기업
    _dealOfferItems() {
      const DL = M.DEAL, items = [], active = new Set(this.activeDeals().map(d => d.customer));
      const cyc = () => DL.cycles[0] + this.rng.int(DL.cycles[1] - DL.cycles[0] + 1);
      for (const r of this.dealResults || []) if (r.grade !== 'C' && !active.has(r.customer) && items.length < DL.maxOffers) items.push({ kind: 'deal', customer: r.customer, cycles: cyc(), renew: true, price: 0, name: T('market.dealRenew', { name: M.CUSTOMERS[r.customer].name }), sold: false });
      const taken = new Set([...active, ...items.map(x => x.customer)]);
      const cands = this.rng.shuffle(Object.keys(M.CUSTOMERS).filter(k => k !== 'anon' && !M.CUSTOMERS[k].storage && M.CUSTOMERS[k].items && (M.CUSTOMERS[k].repTier || 0) <= this.repTier && !taken.has(k) && !((this.dealCooldown || {})[k] > this.month)));
      const n = 1 + (this.rng.next() < 0.25 + this.repTier * 0.12 ? 1 : 0);
      for (const k of cands.slice(0, n)) if (items.length < DL.maxOffers) items.push({ kind: 'deal', customer: k, cycles: cyc(), renew: false, price: 0, name: T('market.dealOffer', { name: M.CUSTOMERS[k].name }), sold: false });
      return items;
    }
    _emptyCustMonth() { return { delivered: 0, revenue: 0, claims: 0, discarded: 0, lvStart: 0 }; }
    customerLevel(id) { if (this.bizMode()) return id === 'anon' ? 0 : this.relation(id); const c = this.customers && this.customers[id]; if (!c || c.suspended) return 0; let lv = 0; for (let i = 1; i < M.CUSTOMER_LEVELS.length; i++) if (c.xp >= M.CUSTOMER_LEVELS[i]) lv = i; return lv; }
    customerNext(id) { if (this.bizMode()) return null; const lv = this.customerLevel(id); const c = this.customers[id]; return lv >= M.CUSTOMER_LEVELS.length - 1 ? null : { need: M.CUSTOMER_LEVELS[lv + 1], have: Math.max(0, c.xp) }; }
    customerPerk(id, key) { if (this.bizMode()) return null; const cust = M.CUSTOMERS[id]; if (!cust || !cust.perks) return null; const lv = this.customerLevel(id); let v = null; for (const l of [2, 3]) if (lv >= l && cust.perks[l] && cust.perks[l][key] != null) v = cust.perks[l][key]; return v; }
    // 창고에 직접 적용되는 혜택(냉장·초대형)은 단계 도달 시 더하고, 거래 중단 시 뺀다
    _applyCustomerPerks(id) {
      if (this.bizMode()) return;   // 기업 관계는 보너스·물량만 — 차·창고를 건드리지 않는다
      const cust = M.CUSTOMERS[id], c = this.customers[id]; if (!cust || !cust.perks) return;
      for (const l of [2, 3]) { const pk = cust.perks[l]; if (!pk) continue; const should = this.customerLevel(id) >= l; const has = !!c.perkApplied[l];
        if (should && !has) { if (pk.cold) this.warehouse.cold += pk.cold; if (pk.xl) this.warehouse.xl += pk.xl; c.perkApplied[l] = true; }
        else if (!should && has) { if (pk.cold) this.warehouse.cold = Math.max(0, this.warehouse.cold - pk.cold); if (pk.xl) this.warehouse.xl = Math.max(0, this.warehouse.xl - pk.xl); c.perkApplied[l] = false; } }
    }
    _custXp(id, delta, why) {
      const c = this.customers && this.customers[id]; if (!c || id === 'anon' || this.bizMode()) return;
      const before = this.customerLevel(id);
      c.xp += delta;
      if (c.xp < 0) { c.xp = 0; if (!c.suspended) { c.suspended = true; this.say('log.custSuspend', { name: M.CUSTOMERS[id].name, why }); this.emit('custSuspend', { customer: id }); } }
      const after = this.customerLevel(id);
      if (after !== before) { this._applyCustomerPerks(id); this._assignCold(); if (after > before) { this.addRep(D.REP_GAIN.custLevel, MSG('why.repCust')); this.say('log.custLevel', { name: M.CUSTOMERS[id].name, level: after }); this.emit('custLevel', { customer: id, level: after }); if (after >= 3) this.stats.customerL3++; } }
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
      { const d = this.bizMode() && this.dealFor(id); if (d) d.st.claims++; }
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
      { const d = this.bizMode() && this.dealFor(id); if (d) { d.st.delivered++; if (onTime) d.st.onTime++; if (p.rush && onTime) d.st.rush++; d.cyc.cells += p.size; } }
      if (xp) this._custXp(id, xp, MSG('why.delivered'));
      return bonus;
    }
    _custRevenue(p, amount) { const c = this.customers && this.customers[p.customer || 'anon']; if (c) { c.month.revenue += amount; c.total.revenue += amount; } }
    _customerWeightsFor(m) {
      const R = this.rules, w = {};
      if (this.bizMode()) return { anon: 1 };   // 바탕 물량은 개인 고객 — 기업 물량은 계약으로 따로 얹는다(_makeSchedule)
      for (const id in this.customers) { const c = this.customers[id]; if (c.suspended && R.fixedCustLevel == null) continue; const vol = id === 'anon' ? 1 : M.CUSTOMER_VOLUME[R.fixedCustLevel != null ? R.fixedCustLevel : this.customerLevel(id)]; w[id] = c.slots * vol * (R.customerWeights[id] || 1); if (this.insurer === 'none' && M.CUSTOMERS[id].claimMult >= 2) w[id] *= 0.5; if (M.CUSTOMERS[id].storage) delete w[id]; }
      if (!Object.keys(w).length) w.anon = 1;
      return w;
    }
    // 다음 달 고객별 예상 물량 (대략): 총 입고 × 고객 가중치 비율. 특수 비중은 단계로
    // 대본 런의 정확한 예상: 대본에 적힌 입고를 고객별로 세어 그대로 보여 준다 (min=max)
    _scriptForecast(m) {
      const sc = this.script(m); if (!sc) return null;
      const by = {};
      for (const row of sc.turns) for (const sp of row) {
        const id = sp.customer || 'anon', f = by[id] || (by[id] = { id, level: this.customerLevel(id), n: 0, cnt: {} });
        f.n++; f.cnt[sp.type] = (f.cnt[sp.type] || 0) + 1;
      }
      return Object.values(by).map(f => {
        const types = Object.keys(f.cnt).filter(t => t !== 'normal'), range = {}, pct = {};
        for (const t of Object.keys(f.cnt)) { range[t] = [f.cnt[t], f.cnt[t]]; pct[t] = f.cnt[t] / f.n; }
        if (!range.normal) range.normal = [0, 0];
        return { id: f.id, level: f.level, min: f.n, max: f.n, special: types.length ? 1 : 0, types, pct, range, scripted: true };
      }).sort((a, b) => b.max - a.max);
    }
    customerForecast(m) {
      m = m || this.month + (this.phase === 'market' && !(this.market && this.market.prep) ? 1 : 0);
      const sf = this._scriptForecast(m); if (sf) return sf;
      const R = this.rules;
      const organic = Math.min(this.turns(m), D.GROWTH.organicArrivals);
      const extra = R.sharedSchedule ? this._sharedExtra(m) : Math.round(this._extraArrivals(Math.min(m, 6)) * D.ARRIVALS_SCALE * this.repArrivalMult() * this.repScaleArrivals() * R.arrivalsMult * (this.bizMode() ? M.DEAL.anonShare : 1));
      const total = organic + extra;
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
      }).concat(this.bizMode() ? this._dealForecast(m) : []).sort((a, b) => b.max - a.max);
    }
    // 기업 계약의 다음 사이클 예상: 예상 칸수 ± 변동을 그 기업의 평균 크기로 나눠 개수로
    _dealForecast(m) {
      const SZ = { small: 1.3, mid: 2, big: 4.5 }, sp = M.DEAL.spread;
      return this.activeDeals().filter(d => d.start <= m && d.left - (d.start <= this.month && this.phase === 'market' ? 1 : 0) > 0).map(d => {
        const cust = M.CUSTOMERS[d.customer], avg = SZ[cust.sizeBias] || 1.8, tw = {};
        for (const k of Object.keys(cust.items || {})) { const t = M.CUSTOMER_ITEMS[k] ? M.CUSTOMER_ITEMS[k].type : k; tw[t] = (tw[t] || 0) + cust.items[k]; }
        const tsum = Object.values(tw).reduce((a, b) => a + b, 0) || 1, lo = d.cells * (1 - sp) / avg, hi = d.cells * (1 + sp) / avg, pct = {}, range = {};
        for (const t in tw) { pct[t] = tw[t] / tsum; range[t] = [Math.floor(lo * pct[t]), Math.ceil(hi * pct[t])]; }
        if (!range.normal) range.normal = [0, 0];
        const types = Object.keys(tw).filter(t => t !== 'normal');
        return { id: d.customer, level: this.relation(d.customer), min: Math.floor(lo), max: Math.ceil(hi), special: 1 - (pct.normal || 0), types, pct, range, deal: true };
      });
    }
    customerSummary() { return Object.keys(this.customers || {}).map(id => ({ id, ...M.CUSTOMERS[id], level: this.customerLevel(id), xp: this.customers[id].xp, suspended: this.customers[id].suspended, month: this.customers[id].month, total: this.customers[id].total, next: this.customerNext(id), slots: this.customers[id].slots })); }

    // ----- 상시 성장 투자: 홍보 · 차량 · 창고 -----
    growthPlan(kind) {
      const def = D.GROWTH[kind], level = (this.growth && this.growth[kind]) || 0;
      if (!def) return null;
      // 홍보(marketing) 조건은 광고 매체로 센다 — 매체 레벨 합 - 1 (전단지 Lv1 만이면 0). 홍보 투자는 매체 계약·강화로 바뀌었다
      const have = k => k === 'marketing' ? this.mediaScore() : (this.growth[k] || 0);
      const missing = Object.entries(def.unlock || {}).filter(([k, n]) => have(k) < n);
      return { kind, level, max: def.costs.length, cost: def.costs[level] == null ? null : def.costs[level], def, locked: missing.length > 0, missing };
    }
    missionState() {
      const M2 = D.MISSION, ms = this.monthStats || {};
      const target = Math.max(1, ms.missionTarget || 1), earned = ms.missionEarned || 0;
      let rank = 0; for (let i = 1; i < M2.ratios.length; i++) if (earned >= Math.round(target * M2.ratios[i])) rank = i;
      const next = Math.min(M2.grades.length - 1, rank + 1), nextAt = Math.round(target * M2.ratios[next]);
      const at = Math.round(target * M2.ratios[rank]), maxAt = Math.round(target * M2.ratios[M2.ratios.length - 1]) || 1;
      return {
        grade: M2.grades[rank], rank, earned, target, maxAt,
        nextGrade: rank >= M2.grades.length - 1 ? null : M2.grades[next], nextAt, left: Math.max(0, nextAt - earned),
        progress: Math.min(1, earned / maxAt),                                     // A 문턱(막대 끝) 기준 전체 진행률
        segProgress: nextAt > at ? Math.min(1, (earned - at) / (nextAt - at)) : 1,  // 지금 등급 구간 안에서 다음 등급까지 얼마나 왔는지 (막 올라가기 직전 펄스용)
        ticks: M2.ratios.slice(1).map(r => Math.round(target * r) / maxAt),         // 막대 위 등급 경계 눈금 (0~1)
      };
    }
    _missionTarget(schedule) {
      const total = (schedule || []).flat().reduce((sum, s) => sum + Math.round(this.baseReward(s.type, s.size) * (s.premium ? 1.5 : 1)), 0);
      return Math.max(200, Math.round(total * 0.72 / 10) * 10);
    }
    _missionEarn(amount) {
      const ms = this.monthStats; if (!ms || !amount || !this.shows('mission')) return null;
      const before = ms.missionRank || 0; ms.missionEarned = (ms.missionEarned || 0) + amount;
      const now = this.missionState().rank; if (now <= before) return null;
      let bonus = 0; for (let i = before + 1; i <= now; i++) bonus += D.MISSION.bonuses[i] || 0;
      ms.missionRank = now; ms.missionBonus = (ms.missionBonus || 0) + bonus;
      this.cash += bonus; ms.revenue += bonus; this.run.revenue += bonus;
      const state = this.missionState(); this.emit('missionUp', { grade: state.grade, bonus, earned: state.earned, target: state.target });
      return { grade: state.grade, bonus };
    }
    investGrowth(kind) {
      if (this.phase !== 'play' && this.phase !== 'market') return { ok: false, reason: 'phase' };
      const plan = this.growthPlan(kind);
      if (!plan || plan.cost == null) return { ok: false, reason: 'max' };
      if (plan.locked) return { ok: false, reason: 'locked', missing: plan.missing };
      if (this.cash < plan.cost) return { ok: false, reason: 'cash', cost: plan.cost };
      this.cash -= plan.cost; this.run.spent += plan.cost;
      this.growth[kind]++;
      const added = 0;                                  // 홍보는 여기서 물량을 넣지 않는다 — 캠페인이 넣는다
      if (kind === 'fleet') { for (const c of this.contracts) if (c) { c.maxCalls += plan.def.calls; c.calls += plan.def.calls; } }
      else if (kind === 'warehouse') { this.warehouse.cap += plan.def.cap; this.stats.expansions++; this._assignCold(); }
      else if (kind === 'coldchain') { this.warehouse.cold += plan.def.cold; this.warehouse.frozen = (this.warehouse.frozen || 0) + plan.def.frozen; this._assignCold(); }
      this.emit('growth', { kind, level: this.growth[kind], cost: plan.cost, added });
      return { ok: true, kind, level: this.growth[kind], cost: plan.cost, added };
    }

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
    // 대본 보관 제안: 종류·부피·기간이 고정 (무작위 제안은 대본 개월차에 나오지 않는다)
    _scriptOffer(o) {
      const R = this.rules, K = M.STORAGE_KINDS[o.kind];
      if (this.offer || !K || this.storage.length >= R.storageMax) return;
      const feeMult = R.storageFeeMult * (this.seasonMods().storageFeeMult || 1);
      let fee = 0, perTurn = 0;
      if (K.perVolTurn) fee = Math.round(o.vol * o.turns * K.perVolTurn * feeMult);
      else if (K.perTurn) perTurn = Math.round(K.perTurn * feeMult);
      else fee = Math.round(K.fee * feeMult);
      this.offer = { id: this.nextId++, kind: o.kind, vol: o.vol, turns: o.turns, fee, perTurn, customer: o.customer || 'anon', expires: this.totalTurn + 1 };
      this.say('log.storageOffer', { name: M.CUSTOMERS[this.offer.customer].name, kind: K.name, vol: o.vol, turns: o.turns, pay: fee ? MSG('log.storagePrepaid', { fee }) : MSG('log.storagePerTurn', { perTurn }) });
      this.emit('offer', { offer: this.offer });
    }
    _maybeOffer(force) {
      const R = this.rules;
      if (this.offer || this.storage.length >= R.storageMax) return;
      const custs = Object.keys(this.customers).filter(id => M.CUSTOMERS[id].storage && !this.customers[id].suspended);
      if (!custs.length && !R.storageAnon) return;
      if (!force && this.rng.next() >= R.storageOfferProb * (this.seasonMods().storageMult || 1)) return;
      const customer = custs.length ? this.rng.pick(custs) : 'anon';
      const w = {}; for (const k in M.STORAGE_KINDS) { const K = M.STORAGE_KINDS[k]; const wt = K.weight; if (wt > 0) w[k] = wt; }
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
      if (s.kind === 'repair') return { ok: false, msg: T('err.repairStuck') };   // 강제 수락 — 거절도 출고도 없다
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
        if (s.kind === 'repair') {   // 보관료는 날마다, 0이면 「이사 완료」 — 내 창고에서 사라지고 랜덤 상대에게 (multi.js 가 목적지를 정한다)
          this.cash += s.perTurn; this.monthStats.storageIncome += s.perTurn; this.run.revenue += s.perTurn;
          if (s.left <= 0) { this.storage.splice(this.storage.indexOf(s), 1); const nb = this._repairNext(s); this.outbox.push({ type: 'repairMove', repair: nb }); this.say('log.repairOut', { size: nb.size }); this.emit('repairOut', { repair: nb }); }
          continue;
        }
        if (s.left <= 0) {
          this.storage.splice(this.storage.indexOf(s), 1);
          let pay = 0; if (s.perTurn) { pay = s.perTurn * s.turns; this.cash += pay; this.monthStats.storageIncome += pay; this.run.revenue += pay; }
          this._custXp(s.customer, 2, MSG('why.storageDone')); this.stats.storageDone++;
          this.say('log.storageCollect', { kind: M.STORAGE_KINDS[s.kind].name, pay: pay ? MSG('log.storagePostpaid', { pay }) : '' });
          this.emit('storageEnd', { storage: s, pay });
        }
      }
    }

    // ----- 멀티 2단계: 트레잇 · 공격 인박스 · 보수공사 (docs/MULTIPLAYER_DESIGN.md 3·4장) -----
    _act(t, a) { if (this.rules.multi) this.actLog.push(Object.assign({ t }, a || {})); }
    traitDef(id) { return (M.MULTI && M.MULTI.TRAITS && M.MULTI.TRAITS[id]) || null; }
    // 기한 안에 출고된 택배의 트레잇 발동. 보너스는 나에게 지금, 공격은 outbox 로 — multi.js 가 상대 인박스에 넣는다
    _fireTrait(p) {
      const tr = p.trait && this.traitDef(p.trait); if (!tr || p.overdue) return;
      const R = this.rules;
      if (tr.kind === 'bonus') {
        if (p.trait === 't_buzz') this.addRep((M.MULTI.BUZZ || 1) * this.traitPower(p), MSG('why.trait', { icon: tr.icon }));
        else if (p.trait === 't_reflect') this.reflectNext = Math.min(2, (this.reflectNext || 0) + 1);
        else if (p.trait === 't_shield') this.shields = Math.min(M.MULTI.SHIELD_MAX, this.shields + 1);
        else if (p.trait === 't_ice') this.freshFreezeUntil = this.totalTurn + M.MULTI.TEMP_DAYS;
        else if (p.trait === 't_pack') this._capMod(3, M.MULTI.TEMP_DAYS, 't_pack');
        else if (p.trait === 't_truck') this.freeTruckNext = true;
        else if (p.trait === 't_return') { const b = this.storage.find(x => x.kind === 'repair'); if (b) { this.storage.splice(this.storage.indexOf(b), 1); this.outbox.push({ type: 'repairMove', repair: this._repairNext(b), to: b.from, back: true }); this._assignCold(); } }
        else if (p.trait === 't_focus') this.focusNext = true;
        else if (p.trait === 't_deal') this.openBonusShop();
        this.say('log.traitBonus', { icon: tr.icon, name: tr.name });
        this.emit('traitBonus', { trait: p.trait, parcel: p });
        return;
      }
      // 공격: 나 빼고 전원. 🎯 한 방이 걸려 있으면 1위 한 명에게 ×3
      const echo = this.trackEcho(), n = 1 + (echo && this.rng.next() < echo ? 1 : 0);   // ⚔ 공격 트랙: 메아리
      for (let i = 0; i < n; i++) {
        const clr = this.clearedToday(p) ? (M.MULTI.FAM_RULES.intl.clearMult || 2) : 1;   // 🛃 통관 끝난 날: ×2
        const atk = { type: 'attackOut', trait: p.trait, mult: R.attackMult * (this.focusNext ? 3 : 1) * clr * this.traitPower(p), focus: this.focusNext, size: p.trait === 't_repair' ? Math.min(M.MULTI.REPAIR.maxSize, M.MULTI.REPAIR.size + R.repairGrow + this.repairProgressBonus() + (clr > 1 ? 2 : 0)) : 0, cleared: clr > 1 };
        this.outbox.push(atk); this.emit('attackOut', atk);
      }
      this.focusNext = false;
      this.say('log.traitAttack', { icon: tr.icon, name: tr.name });
    }
    // 난투: 공격으로 줄어드는 칸의 바닥 — 제 칸(임시 증감 뺀 것)의 70% 아래로는 안 내려간다
    capFloor() { const base = this.warehouse.cap - this.capMods.reduce((a, m) => a + m.delta, 0); return Math.ceil(base * (M.MULTI.CAP_FLOOR || 0.7)); }
    _capMod(delta, days, why) { this.capMods.push({ delta, until: this.totalTurn + days, why }); this.warehouse.cap += delta; this._assignCold(); }
    // 상대가 보낸 공격 — 큐에 쌓였다가 내가 다음 날로 넘길 때 적용된다. 마감·폐업한 창고에는 못 넣는다
    receiveAttack(a) { if (this.phase === 'over' || this.phase === 'win') return false; this._act('atk', { a: { trait: a.trait, mult: a.mult, from: a.from, fromName: a.fromName } }); this.inbox.push(a); return true; }
    _multiDay() {
      const R = this.rules;
      for (const m of this.capMods.slice()) if (this.totalTurn >= m.until) { this.warehouse.cap -= m.delta; this.capMods.splice(this.capMods.indexOf(m), 1); }
      if (R.shieldPassive && this.shields < R.shieldPassive) this.shields = R.shieldPassive;
      { const ts = this.trackShields(); if (this.shields < ts) this.shields = ts; }   // 🛡 방어 트랙: 매일 아침 방패
      const q = this.inbox.splice(0); for (const a of q) { if (a.push) this._applyPush(a); else this._applyAttack(a); }
      this._assignCold();
    }
    _applyAttack(a) {
      const R = this.rules, tr = this.traitDef(a.trait); if (!tr) return;
      const k = Math.max(1, Math.round(a.mult || 1));
      let blocked = null;
      if (R.dodgeProb && this.rng.next() < R.dodgeProb) blocked = 'dodge';
      else if (this.reflectNext > 0 && a.from != null && !a.reflected) { this.reflectNext--; blocked = 'reflect'; this.outbox.push({ type: 'attackOut', trait: a.trait, mult: a.mult || 1, to: a.from, reflected: true }); }   // 🪞 반사: 보낸 사람에게 그대로
      else if (this.shields > 0) { this.shields--; blocked = 'shield'; }
      else if (a.trait === 't_rain' && R.rainImmune) blocked = 'roof';
      let detail = '';
      if (!blocked) {
        if (a.trait === 't_rain') { let n = 0; for (const p of this.outdoorParcels()) { if (!p.wet) { p.wet = true; n++; } p.deadline = Math.max(0, p.deadline - k); } detail = MSG('trait.d.rain', { n }); }
        else if (a.trait === 't_claim') { this.addRep(-k, MSG('why.attack', { icon: tr.icon })); detail = MSG('trait.d.claim', { n: k }); }
        else if (a.trait === 't_rat') { let n = 0; for (const p of this.parcels.filter(x => this._attrs(x).includes('cold')).slice(0, k)) { this._discardParcel(p, MSG('why.attack', { icon: tr.icon }), 1, 'discard'); n++; } detail = MSG('trait.d.rat', { n }); }
        else if (a.trait === 't_hurry') {   // ⏱ 독촉: 전부가 아니라 몇 개만 — 오늘 안에 보내야 한다(기한 1) (유저: "기한 줄이는 것도 치명적, 하나당 몇 개만 바로 보내게")
          if (this.hurryDay !== this.totalTurn) { this.hurryDay = this.totalTurn; this.hurryN = 0; } const n = Math.max(0, (M.MULTI.HURRY_N || 3) * Math.min(2, k) - this.hurryN); const cand = this.rng.shuffle(this.parcels.filter(p => !p.overdue && !p.noDeadline && p.deadline > 1)).slice(0, n);
          for (const p of cand) { p.deadline = 1; p.hurried = this.totalTurn; } this.hurryN += cand.length;   // 하루에 독촉 받는 택배는 최대 3개(×2 한 방이면 6) — 여러 명이 쏴도 겹치지 않는다
          detail = MSG('trait.d.hurry', { n: cand.length }); }
        else if (a.trait === 't_road') {   // 🚧 계약 하나만 막힌다(랜덤). 계약이 하나뿐이면 무효 — 전부 막히면 치명적 (유저)
          const slots = this.contracts.map((c, i) => c ? i : -1).filter(i => i >= 0);
          if (slots.length >= 2) { this.roadblockDay = this.totalTurn; this.roadblockSlot = slots[this.rng.int(slots.length)]; detail = MSG('trait.d.road', { name: this.contractName(this.contracts[this.roadblockSlot]) }); }
          else { blocked = 'void'; }
        }
        else if (a.trait === 't_refund') { const ps = this.parcels.slice().sort((x, y) => x.arrivalTurn - y.arrivalTurn).slice(0, k); for (const p of ps) this._discardParcel(p, MSG('why.attack', { icon: tr.icon }), 1, 'returned'); detail = MSG('trait.d.refund', { n: ps.length }); }
        else if (a.trait === 't_seal') { const n = Math.min(M.MULTI.SEAL || 3, Math.max(0, this.warehouse.cap - this.capFloor())), on = this.capMods.find(x => x.why === 't_seal'); if (on) { on.until = this.totalTurn + M.MULTI.TEMP_DAYS; if (-on.delta < n) { this.warehouse.cap -= n + on.delta; on.delta = -n; this._assignCold(); } } else this._capMod(-n, M.MULTI.TEMP_DAYS, 't_seal'); detail = MSG('trait.d.seal', { n, d: M.MULTI.TEMP_DAYS }); }   // 🔒 봉인은 겹치지 않는다 — 걸려 있으면 기간만 새로(창고가 0 아래로 내려가던 것)
      }
      this.say(blocked ? 'log.attackBlocked' : 'log.attackIn', { icon: tr.icon, name: tr.name, from: a.fromName || '', detail, how: blocked ? MSG('trait.blk.' + blocked) : '' });
      this.emit('attackIn', { trait: a.trait, from: a.from, fromName: a.fromName, blocked, detail, mult: a.mult });
    }
    // ----- 보수공사: 강제 수락 · 출고 불가 · 하루 +perDay c · 카운트 0이면 랜덤 상대에게 이사(+1칸 −1일) -----
    // 보수공사는 판이 갈수록 크게 온다 — 석 달의 진행도 × REPAIR.late (3칸 → 마지막엔 5칸). 유저: "이삿짐도 점점 큰 게"
    repairProgressBonus() { const total = this.totalDays ? this.totalDays() : 0; if (!total || !M.MULTI.REPAIR.late) return 0; return Math.floor(Math.min(1, (this.totalTurn || 0) / total) * M.MULTI.REPAIR.late); }
    // 물품 종류마다 트레잇이 정해져 있다(META.MULTI.TYPE_TRAITS: [기본, 언락]) — 언락을 산 종류는 둘 중 하나 (유저: "트레잇이 완전 랜덤이 아니라 해당 특수에 붙은 트레잇이 정해져 있으면")
    // 난투: 이 특수 물품을 여는 계열 계약이 있나 (META.MULTI.TYPE_FAMILIES) — 없으면 그 물품은 일반으로 온다
    // 계열 규칙(난투): 이 계약의 계열이 fam 이면 그 규칙이 켜진다
    famRule(c, fam) { return !!(this.rules.famRules && c && FAM(c.carrier) === fam && M.MULTI.FAM_RULES && M.MULTI.FAM_RULES[fam]); }
    ownsFam(fam) { return this.rules.famRules && this.contracts.some(c => c && FAM(c.carrier) === fam); }
    // 🌅 새벽 출발: 오늘 들어온 신선만 싣는 냉장 호출 — 하루를 안 쓴다(하루 한 번)
    dawnReady(c, ps) { return this.famRule(c, 'cold') && this.dawnDay !== this.totalTurn && ps.length > 0 && ps.every(p => p && p.type === 'fresh' && p.arrivalTurn === this.totalTurn); }
    // 🛃 통관이 오늘 끝난 짐(오늘 보내면 트레잇 ×2)
    clearedToday(p) { return !!(this.rules.famRules && p && p.clearDay === this.totalTurn && !p.customs); }
    typeOpen(type) { const TF = this.rules.typeFamilies && M.MULTI && M.MULTI.TYPE_FAMILIES; const fams = TF && TF[type]; return !fams || this.contracts.some(c => c && fams.includes(FAM(c.carrier))); }
    // 전문화 트랙(🛒 장사 · ⚔ 공격 · 🛡 방어) — 계열마다 하나. 레벨 = 그 트랙 계약마다 (1 + 등급)
    trackOf(carrier) { const T = (M.MULTI && M.MULTI.TRACKS) || {}, f = FAM(carrier); for (const k in T) if (T[k].families.includes(f)) return k; return null; }
    trackLv(k) { if (!this.rules.multi || !M.MULTI || !M.MULTI.TRACKS) return 0; let n = 0; for (const c of this.contracts) if (c && this.trackOf(c.carrier) === k) n += 1 + (D.CARRIERS[c.carrier].tier || 0); return n; }
    trackEcho() { const A = M.MULTI && M.MULTI.TRACKS && M.MULTI.TRACKS.atk; return Math.min(1, (this.rules.attackEcho || 0) + (A ? A.echo * this.trackLv('atk') : 0)); }
    trackShields() { const S = M.MULTI && M.MULTI.TRACKS && M.MULTI.TRACKS.def; const lv = this.trackLv('def'); return S && lv ? Math.min(S.shieldMax, Math.ceil(lv / S.shieldPer)) : 0; }
    // 🛒 장사: 평판 계단이 짧아지고(상점이 자주) 상점 카드가 는다
    repStepNow() { const R = this.rules, S = M.MULTI && M.MULTI.TRACKS && M.MULTI.TRACKS.shop; const base = R.repStepGrow ? Math.min(R.repStepMax || 99, R.repStep + R.repStepGrow * this.repTier) : R.repStep;   // 계단이 점점 길어진다 — 첫 상점은 빨리 (유저: "초반에 빨리 더 전문화 마켓")
      return S && R.multi ? Math.max(Math.min(S.stepMin, base), base - S.step * this.trackLv('shop')) : base; }
    shopCards() { const S = M.MULTI && M.MULTI.TRACKS && M.MULTI.TRACKS.shop; return S && this.rules.multi ? Math.min(S.cardsMax, 3 + Math.floor(this.trackLv('shop') / S.cardsPer)) : 3; }
    traitPool(type) { const TT = M.MULTI.TYPE_TRAITS || {}; const key = type === 'normal' ? null : type; const pair = key && TT[key]; if (!pair) return []; return pair.slice(); }   // 둘 다 처음부터 — 한 가지만 계속 받던 것
    // 트레잇 세기: 🔗 조합 배수 × (강화 카드 +1) × (🧊 숙성 +일수)
    traitPower(p) { let k = 1 + (this.traitUnlocks.includes(p.type) ? 1 : 0) + (p.aged || 0); return k * (this._mixMult || 1) * (this._fullMult || 1); }
    // 트레잇은 호출마다 종류당 한 번(traitPerCall) — 몇 개를 실었든. 한 종류로만 꽉 채운 차(만차)면 강화(FULL_MULT) (유저: "한 특수를 만차로 실어 보내면 그 트레잇이 강화된 상태로")
    _fireTraitsPerCall(chosen, full) {
      const groups = {}; for (const p of chosen) if (p.trait && !p.overdue) (groups[p.trait] = groups[p.trait] || []).push(p);
      const kinds = Object.keys(groups), fired = [];
      for (const t of kinds) { const rep = groups[t].slice().sort((a, b) => (b.aged || 0) - (a.aged || 0))[0]; const solo = full && kinds.length === 1 && rep.type !== 'normal' && chosen.every(p => p.type === rep.type); this._fullMult = solo ? (M.MULTI.FULL_MULT || 2) : 1; this._fireTrait(rep); fired.push({ type: rep.type, trait: rep.trait, full: solo }); if (solo) this.emit('fullTrait', { type: rep.type, trait: rep.trait }); }
      this._fullMult = 0; return fired;
    }
    _resolveTrait(sp) { const pool = this.traitPool(sp.type).filter(t => this.traitDef(t)); if (!pool.length) return null; return pool[this.rng.int(pool.length)]; }
    _repairNext(b) { const B = M.MULTI.REPAIR; return { size: Math.min(B.maxSize, this.storageVol(b) + 1), days: Math.max(1, b.turns - 1), hops: (b.hops || 0) + 1, from: this.cfg.pid != null ? this.cfg.pid : null }; }
    // 상대가 만차로 밀어 넣은 택배 — 다음 날 아침 내 창고에 n 개가 더 들어온다(일반, 1~2칸, 기한 짧게)
    receivePush(x) {
      if (this.phase === 'over' || this.phase === 'win') return false;
      this._act('push', { x: Object.assign({ n: x.n, from: x.from == null ? null : x.from, fromName: x.fromName || '' }, x.dump ? { dump: true } : {}, x.big ? { big: true } : {}) });
      this.inbox.push({ push: true, n: x.n, from: x.from, fromName: x.fromName, dump: !!x.dump, big: !!x.big }); return true;
    }
    _applyPush(x) {
      // 🔥 만석: 이미 80% 넘게 찬 창고에 떨어지면 상자가 두 배 — 같은 공격도 상대 상태에 따라 값이 달라진다 (MULTIPLAYER_PILLARS 기둥 2)
      const H = M.MULTI && M.MULTI.HOT, hot = !!(H && this.rules.multi && !x.dump && this.usage() >= H.at);
      const n = Math.max(1, Math.round(x.n || 1)) * (hot ? H.mult : 1), ids = [];
      for (let i = 0; i < n; i++) { const p = this._spawnParcel({ type: 'normal', size: x.big ? ((M.MULTI.FAM_RULES && M.MULTI.FAM_RULES.large.pushSize) || 4) : 1 + (this.rng.next() < 0.4 ? 1 : 0), customer: 'anon' }); if (!p) continue; p.deadline = Math.min(p.deadline, 3); p.deadline0 = p.deadline0 || p.deadline; p.pushed = true; this.parcels.push(p); ids.push(p.id); }
      this._assignCold();
      this.say(x.dump ? 'log.dumpIn' : 'log.pushIn', { from: x.fromName || '', n: ids.length });
      this.emit('pushIn', { n: ids.length, from: x.from, fromName: x.fromName, ids, dump: !!x.dump, hot });
    }
    receiveRepair(b) {
      if (this.phase === 'over' || this.phase === 'win') return { ok: false };
      this._act('repair', { b: { size: b.size, days: b.days, hops: b.hops || 0, from: b.from == null ? null : b.from, back: !!b.back } });
      const B = M.MULTI.REPAIR;
      if (b.size >= B.maxSize && b.days <= 1 && b.hops > 0) {   // 다 커진 공사판은 도착하는 순간 대공사가 된다 — 초과분 도난 판정 1회, 그 뒤 소멸
        const over = Math.max(0, this.usedVolume() + b.size - this.warehouse.cap); let stolen = 0, vol = 0;
        for (const p of this.parcels.slice().sort((x, y) => (y.outdoor ? 1 : 0) - (x.outdoor ? 1 : 0))) { if (vol >= over || (this.rules.multi && stolen >= (M.MULTI.BLAST_MAX || 2))) break; vol += this.storeSize(p); this.parcels.splice(this.parcels.indexOf(p), 1); this.monthStats.stolen++; this.stats.stolen++; stolen++; this.emit('stolen', { parcel: p }); this._claim(p, MSG('why.repairBlast'), 'stolen'); }
        if (stolen) this.addRep(-Math.min(3, stolen), MSG('why.repairBlast'));
        this.say('log.repairBlast', { n: stolen }); this.emit('repairBlast', { stolen, from: b.from });
        this._assignCold(); return { ok: true, blast: true, stolen };
      }
      const s = { id: 'b' + (this.nextId++), kind: 'repair', vol: b.size, turns: b.days, left: b.days, fee: 0, perTurn: B.perDay, customer: 'anon', outdoor: false, hops: b.hops || 0, from: b.from };
      this.storage.push(s); this._assignCold();
      this.say('log.repairIn', { size: b.size, days: b.days }); this.emit('repairIn', { storage: s, from: b.from, back: !!b.back });
      return { ok: true, storage: s };
    }
    repairCount() { return this.storage.filter(x => x.kind === 'repair').length; }
    // ----- 날씨 (4.4장) -----
    // 물가: 임대·인건비·배차비가 매달 D.OPCOST_INFLATION씩 오른다 (수입이 커지는 만큼 지출 폭도 커진다)
    inflation(c) { const mi = this.monthIndex(c); let k = 0; for (let i = 1; i < mi; i++) if (!this.seasonMods(i * D.CYCLES_PER_MONTH).noInflation) k++; return Math.pow(D.OPCOST_INFLATION, k); }
    // 달력 월(1~12): 런은 D.START_MONTH(3월)에 시작
    // 나라별 달력 (docs/STORY_TUTORIAL_DESIGN.md 5장): 달마다 입고 배수·품목 이동·날씨·이벤트
    calendar() { return M.CALENDARS[this.rules.calendar] || M.CALENDARS.kr; }
    // this.month 는 이제 '사이클'(2주) 번호다. 달력 한 달 = 전반·후반 두 사이클
    monthIndex(c) { return Math.ceil((c || this.month || 1) / D.CYCLES_PER_MONTH); }        // 몇 개월차
    half(c) { return ((c || this.month || 1) - 1) % D.CYCLES_PER_MONTH + 1; }               // 1 전반 · 2 후반
    calMonth(c) { const start = this.rules.startMonth || this.calendar().startMonth || D.START_MONTH; return ((start - 1 + this.monthIndex(c) - 1) % 12) + 1; }
    seasonMods(m) { return this.calendar().months[this.calMonth(m)] || { arrivalsMult: 1, typeShift: {} }; }
    // 이번 달(개월차 m)의 달력 이벤트 목록 [{ id, turns: [a, b], ... }]
    // 이번 사이클의 달력 이벤트: 달력에 박힌 것(선물 주간·쇼핑 행사) + 실제 날짜로 계산한 공휴일·명절
    monthEvents(c) { if (this.rules.noCalendarEvents) return []; const h = this.half(c); return (this.seasonMods(c).events || []).filter(e => !e.half || e.half === h).concat(this.holidayEvents(c)); }
    // ----- 공휴일: 실제 날짜 (META.CALENDARS[id].holidays) -----
    // 그 해의 특별한 날 전부: 'M-D' → { id, off } (업체 휴무) | { id, rush } (명절 앞 폭주).
    // 달력에 holidays 가 없거나 캠페인(rules.noHolidays — 대본은 턴 번호로 짜여 있다)이면 비어 있다.
    _specialDays(y) {
      const H = this.calendar().holidays;
      if (!H || this.rules.noHolidays) return {};
      if (this._sdCache && this._sdCache.y === y) return this._sdCache.map;
      const map = {}, key = (m, d) => m + '-' + d;
      const dow = (m, d) => (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;                       // 0 월 … 6 일
      const shift = (m, d, k) => { const t = new Date(Date.UTC(y, m - 1, d + k)); return [t.getUTCMonth() + 1, t.getUTCDate()]; };
      const nearest = tbl => { const ys = Object.keys(tbl).map(Number); return tbl[ys.reduce((b, k) => Math.abs(k - y) < Math.abs(b - y) ? k : b, ys[0])]; };
      const setOff = (m, d, id) => { map[key(m, d)] = { id, off: true }; };
      // 단일 공휴일. 일요일과 겹치면 다음 날이 대체공휴일(sub). 토요일은 영업일이라 그날 그대로 쉰다.
      const singles = (H.fixed || []).map(([m, d, id, sub]) => ({ m, d, id, sub }));
      if (H.buddha) { const [m, d] = nearest(H.buddha).split('-').map(Number); singles.push({ m, d, id: 'buddha', sub: true }); }
      for (const h of singles) { let m = h.m, d = h.d; if (h.sub && dow(m, d) === 6) [m, d] = shift(m, d, 1); setOff(m, d, h.id); }
      // 명절(설·추석): 당일 앞뒤 사흘 연휴 → 겹친 일요일 수만큼 대체공휴일 → 연휴 앞 영업일 rushDays 는 폭주
      const lun = nearest(H.lunar || {});
      (H.lunarIds || []).forEach((id, i) => {
        if (!lun || !lun[i]) return;
        const [m0, d0] = lun[i].split('-').map(Number);
        const days = [-1, 0, 1].map(k => shift(m0, d0, k));
        let subs = days.filter(([m, d]) => dow(m, d) === 6).length;
        for (const [m, d] of days) setOff(m, d, id);
        let [m, d] = days[2];
        while (subs > 0) { [m, d] = shift(m, d, 1); if (dow(m, d) === 6 || map[key(m, d)]) continue; setOff(m, d, id); subs--; }
        let n = H.rushDays || 0; [m, d] = days[0];
        while (n > 0) { [m, d] = shift(m, d, -1); if (dow(m, d) === 6 || (map[key(m, d)] && map[key(m, d)].off)) continue; map[key(m, d)] = { id: id + '_rush', rush: true }; n--; }
      });
      this._sdCache = { y, map };
      return map;
    }
    // 이번 사이클에 걸리는 공휴일 이벤트 — 같은 명절의 이어지는 턴은 하나로 묶는다. 모양은 달력 이벤트와 같다(turns·noCalls·arrivalsMult·deadlineDelta)
    holidayEvents(c) {
      c = c || this.month || 1;
      const map = this._specialDays(this.yearOf(c));
      const H = this.calendar().holidays, mo = this.calMonth(c), out = [];
      if (!H) return out;
      let cur = null;
      this.businessDays(c).forEach((d, i) => {
        const sp = map[mo + '-' + d], t = i + 1;
        if (sp && cur && cur.id === sp.id && cur.turns[1] === t - 1) { cur.turns[1] = t; return; }
        cur = null;
        if (!sp) return;
        cur = sp.off ? { id: sp.id, turns: [t, t], noCalls: true, holiday: true } : { id: sp.id, turns: [t, t], arrivalsMult: H.rushMult || 1.6, deadlineDelta: H.rushDeadline || 0, holiday: true };
        out.push(cur);
      });
      return out;
    }
    // 특정 턴에 걸린 이벤트들
    eventsAt(turn, m) { turn = turn || this.turn; return this.monthEvents(m).filter(e => turn >= e.turns[0] && turn <= e.turns[1]); }
    isOffTurn(turn, m) { return this.eventsAt(turn, m).some(e => e.noCalls); }
    isRushTurn(turn, m) { return this.eventsAt(turn, m).some(e => e.arrivalsMult && e.arrivalsMult > 1); }
    // 런 전체의 달력: 개월차 순서대로 [{ m, cal, icon, events }]
    // 이 런이 지나가는 달들. 장마다 cycleOffset 이 다르므로 사이클을 실제로 훑어 개월차를 모은다
    // (예전에는 1..12 개월차를 가정해서, 3월 후반만 도는 장이 4월로 찍혔다)
    calendarMonths() {
      const out = [], seen = new Set(), total = this.rules.months;
      for (let c = 1; c <= total; c++) {
        const m = this.monthIndex(c); if (seen.has(m)) continue; seen.add(m);
        const sm = this.seasonMods(c);
        const cycleOf = half => { for (let k = 1; k <= total; k++) if (this.monthIndex(k) === m && this.half(k) === half) return k; return c; };
        out.push({ m, cal: this.calMonth(c), icon: sm.icon || '', arrivalsMult: sm.arrivalsMult || 1,
          events: (sm.events || []).map(e => { const ec = cycleOf(e.half || 1);
            return { id: e.id, turns: e.turns, half: e.half || 0, days: [this.dateOf(e.turns[0], ec), this.dateOf(e.turns[1], ec)] }; })
            .concat(...[1, 2].map(h => { const k = cycleOf(h); return this.monthIndex(k) === m && this.half(k) === h ? this.holidayEvents(k).map(e => ({ id: e.id, turns: e.turns, half: h, holiday: true, days: [this.dateOf(e.turns[0], k), this.dateOf(e.turns[1], k)] })) : []; })) });
        if (out.length >= 12) break;
      }
      return out;
    }
    // ----- 시간 · 달력 -----
    // 1턴 = 하루(영업일). 월~토 엿새 뒤 일요일 휴무. 달력은 진짜 — 달마다 길이가 다르고, 정산은 반월 두 번.
    // 요일은 게임 달력으로 고정: 런 첫날(시작 달 1일)이 언제나 월요일. 연도가 달라도 같은 판이 나온다.
    // 캠페인은 장마다 런이 새로 시작하지만 달력은 이어져야 한다.
    // cycleOffset 이 그 장이 한 해(캠페인)의 몇 번째 사이클에서 시작하는지를 말해 준다 —
    // 이 하나로 개월차·전후반·달·해·물량표가 전부 따라온다.
    cycleAbs(c) { return (c || this.month || 1) + (this.rules.cycleOffset || 0); }
    monthIndex(c) { return Math.ceil(this.cycleAbs(c) / D.CYCLES_PER_MONTH); }          // 몇 개월차
    half(c) { return (this.cycleAbs(c) - 1) % D.CYCLES_PER_MONTH + 1; }                 // 1 전반 · 2 후반
    calMonth(c) { const start = this.rules.startMonth || this.calendar().startMonth || D.START_MONTH; return ((start - 1 + this.monthIndex(c) - 1) % 12) + 1; }
    yearOf(c) { const start = this.rules.startMonth || this.calendar().startMonth || D.START_MONTH; return this.year + Math.floor((start - 1 + this.monthIndex(c) - 1) / 12); }
    // 진짜 달력: 그 해 그 달의 실제 길이(윤년 포함)와 실제 요일을 쓴다
    monthLen(c) { return new Date(Date.UTC(this.yearOf(c), this.calMonth(c), 0)).getUTCDate(); }
    // 요일: 0 월 … 6 일 (Date 는 0 일요일이라 돌려 맞춘다)
    dowOfDate(c, day) { return (new Date(Date.UTC(this.yearOf(c), this.calMonth(c) - 1, day)).getUTCDay() + 6) % 7; }
    dowName(t, c) { return (T('fmt.dows') || '').split(',')[this.dowOfDate(c, this.dateOf(t, c))] || ''; }
    // 이 사이클이 덮는 날짜 창 (전반 1~15, 후반 16~말일)
    cycleWindow(c) { const h = this.half(c), last = this.monthLen(c); return h === 1 ? [1, Math.min(D.HALF_SPLIT, last)] : [D.HALF_SPLIT + 1, last]; }
    // 그 창의 영업일(일요일 제외) 날짜 목록 — 턴 하나가 하루다
    businessDays(c) {
      c = c || this.month || 1;
      if (this._bdCache && this._bdCache.c === c) return this._bdCache.days;
      const [a, b] = this.cycleWindow(c), days = [];
      for (let d = a; d <= b; d++) if (this.dowOfDate(c, d) !== 6) days.push(d);
      this._bdCache = { c, days };
      return days;
    }
    turns(c) { return this.businessDays(c).length; }
    dateOf(t, c) { const days = this.businessDays(c); return days[(t || this.turn || 1) - 1] || days[days.length - 1] || 1; }
    // 이 턴이 끝나면 일요일이 오는가 (사이클 마지막 턴은 정산으로 넘어간다)
    isWeekendAfter(t, c) {
      t = t || this.turn; const days = this.businessDays(c);
      if (t >= days.length) return false;
      return days[t] > days[t - 1] + 1;      // 다음 영업일이 하루 건너뛰었다 = 사이에 일요일
    }
    weekOf(t, c) { return Math.floor((this.dateOf(t, c) - 1) / 7) + 1; }
    cycleLabel(c) { return T('fmt.cycle', { cal: this.calMonth(c), half: T('fmt.half' + this.half(c)) }); }
    dateLabel(t, m) { return T('fmt.date', { cal: this.calMonth(m), d: this.dateOf(t, m) }); }
    dateDowLabel(t, m) { return T('fmt.dateDow', { cal: this.calMonth(m), d: this.dateOf(t, m), dow: this.dowName(t, m) }); }
    returnGraceFor(p) { const R = this.rules; return Math.max(1, (this._attrs(p).includes('cold') ? R.returnGraceFresh : R.returnGrace) + R.returnGraceDelta + (this.seasonMods().returnGraceDelta || 0)); }
    season(m) { const R = this.rules; if (R.season) return R.season; const c = this.calMonth(m); return c >= 3 && c <= 5 ? 'spring' : c >= 6 && c <= 8 ? 'summer' : c >= 9 && c <= 11 ? 'autumn' : 'winter'; }
    _genWeather(m) {
      if (!this.shows('weather')) return Array.from({ length: this.turns(m) }, () => 'sunny');   // 날씨가 열리기 전(레벨 1·2)엔 언제나 맑음
      const sc = this.script(m); if (sc && sc.weather) { const w0 = sc.weather.slice(); while (w0.length < this.turns(m)) w0.push('sunny'); return w0.slice(0, this.turns(m)); }
      const R = this.rules, w = Object.assign({}, M.WEATHER_BY_SEASON[this.season(m)]);
      const cw = this.seasonMods(m).weather || {}; for (const k in cw) w[k] = (w[k] || (cw[k] > 1 ? 10 : 0)) * cw[k];
      for (const k in R.weatherWeights) w[k] = (w[k] || (R.weatherWeights[k] > 1 ? 10 : 0)) * R.weatherWeights[k];
      const out = []; let storm = false;
      for (let t = 0; t < this.turns(m); t++) { let k = this.rng.weighted(w); if (k === 'storm' && (storm || t >= this.turns(m) - 1)) k = 'rain'; if (k === 'storm') storm = true; out.push(k); }
      return out;
    }
    weatherAt(turn) { return (this.weather && this.weather[turn - 1]) || 'sunny'; }
    weatherNow() { return this.weatherAt(this.turn); }
    isHeatTurn() { return this.weatherNow() === 'heat'; }
    isWet(p) { return !!p.wet; }

    // ----- 적재 (4장) -----
    // 창고 안 우선순위: 급한 순. 야외 후보는 덜 급한 것부터
    _urgencyKey(p) { if (this.rushToday(p)) return -20; return (p.overdue ? -10 : 0) + (p.noDeadline ? 90 : 0) + p.deadline + (p.customs || 0) - (this._attrs(p).includes('cold') || this._attrs(p).includes('frozen') ? 3 : 0); }
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
      const maxCalls = Math.max(1, Math.round(c.trucks * (R.callsMult || 1)) + R.callsDelta + (isStart ? R.startCallsDelta : 0) + (this.trustPerk(carrier, 'trucks') || 0) + ((this.growth && this.growth.fleet) || 0) * D.GROWTH.fleet.calls);
      return { id: this.nextId++, carrier, grade, maxCalls, calls: calls == null ? maxCalls : calls,
        enh: { limit: 0, cap: 0, regular: false, express: false, opt: null, capDelta: 0 }, successCalls: 0, totalCalls: 0, delivered: 0 };
    }
    // 신뢰도 특성: 현재 단계까지의 효과를 합친다 (뒤 단계가 같은 키를 덮는다)
    trustPerk(carrier, key) {
      // 신뢰도가 화면에 없는 장(서장·1장)에서는 돈에 닿는 혜택(배차비 할인·보상 가산 등)을 주지 않는다 —
      // 안 보이는 할인 때문에 '절반 못 채우면 손해'라는 규칙이 화면과 어긋났다. 
      if (!this.shows('trust')) return null;
      const lv = this.trustLevel(carrier), perks = D.TRUST_PERKS[FAM(carrier)] || []; let v = null;
      if (this.rules.noMoney) {   // 난투: 돈·배차 특성은 없고 칸이 단계마다 붙는다 — 능력 특성(냉장 구역·통관…)만 원래 표에서
        const keep = D.MULTI_TRUST_KEEP.includes(key);
        for (let i = 0; i < Math.min(lv, perks.length); i++) if (keep && perks[i][key] != null) v = perks[i][key];
        if (key === 'cap') v = (v || 0) + (lv > 0 ? D.MULTI_TRUST_PERKS[Math.min(lv, D.MULTI_TRUST_PERKS.length) - 1].cap : 0);
        return v;
      }
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
    // 업체 신뢰는 **기한보다 얼마나 일찍 보내느냐**로 쌓인다 — 차를 꽉 채우는 것과는 상관없다.
    // 택배마다: 들어오자마자(기한의 3/4 이상 남음) +2 · 여유 있게(2/5 이상) +1 · 기한 맞춰서 0 · 늦으면 −2. (반 점 대신 눈금을 두 배로 — TRUST_LEVELS 6/16/30)
    // 기한이 없는 첫 사이클(캠페인)은 나이로: 그날 0일 +2 · 하루 +1.
    trustScorePer(p) {
      if (p.overdue) return p.rush ? 0 : -2;   // ⚡ 긴급을 놓친 것은 벌점이 아니다 — 덜 받을 뿐
      if (p.noDeadline) return p.age <= 0 ? 2 : p.age === 1 ? 1 : 0;
      const total = Math.max(1, p.deadline0 || (p.deadline + (p.age || 0))), ratio = p.deadline / total;
      return ratio >= 0.75 ? 2 : ratio >= 0.4 ? 1 : 0;
    }
    trustScore(parcels) {
      let early = 0, half = 0, late = 0, sum = 0;
      for (const p of parcels) { const s = this.trustScorePer(p); sum += s; if (s >= 2) early++; else if (s > 0) half++; else if (s < 0) late++; }
      return { xp: sum, early, half, late };
    }
    // 이 호출로 오르내릴 평판 — 같은 점수를 REP_GAIN.earlyDiv 로 나눠 ±earlyMax 안에서 (0 을 향해 반올림)
    // 난투 평판(repPerParcel): 보낸 택배마다 조금씩 · ⚡ 긴급은 그것만 실은 차(또는 직배)로 보내면 크게 — 다른 짐과 섞으면 그 호출은 평판 절반
    // (유저: "평판은 처리하는 물품별로 조금씩 오르다 긴급은 더 강하게. 긴급으로 처리하려면 그 택배만 실어야 하고 혹은 직배, 아니면 절반")
    callRep(ps, self) {
      if (!this.rules.repPerParcel) return this.repDeltaFor(ps);
      const P = M.MULTI.REP, ok = (ps || []).filter(p => p && !p.overdue), rush = ok.filter(p => this.rushToday(p));
      let rep = ok.length * P.perParcel;
      if (rush.length) { if (self || ps.length === 1) rep += P.rush * rush.length; else rep = Math.floor(rep / 2); }
      return rep;
    }
    // 호출 미리보기 태그 — ⚡ 단독/섞임, 한 특수 만차(특약 ×2)
    callTags(ps, cap) {
      const R = this.rules, out = { rushSolo: false, rushMixed: false, full: null };
      if (!R.repPerParcel || !ps || !ps.length) return out;
      const rush = ps.some(p => p && !p.overdue && this.rushToday(p));
      if (rush) { if (ps.length === 1) out.rushSolo = true; else out.rushMixed = true; }
      const t = ps[0].type, vol = ps.reduce((s, p) => s + p.size, 0);
      if (R.traitPerCall && t !== 'normal' && ps.every(p => p.type === t) && ps.some(p => p.trait && !p.overdue) && vol >= cap) out.full = t;
      return out;
    }
    callRepMixed(ps) { return !!(this.rules.repPerParcel && ps.length > 1 && ps.some(p => p && this.rushToday(p))); }
    repDeltaFor(parcels) {
      const G = D.REP_GAIN, s = this.trustScore(parcels || []).xp;
      const d = Math.trunc(s / (G.earlyDiv || 5));
      if (this.rules.noLateShipPenalty) return Math.max(0, Math.min(G.earlyMax || 3, d));   // 난투: 늦게라도 실어 나르면 깎이진 않는다 — 놓치는 것(반송)보다 벌이 크면 안 된다 (유저)
      return Math.max(-(G.earlyMax || 3), Math.min(G.earlyMax || 3, d));
    }
    // 이 호출로 얻을 신뢰도 경험치 예상 (담은 택배 기준)
    trustGainPreview(c, parcels) {
      const R = this.rules, ts = this.trustScore(parcels || []);
      // 차 한 대에 −2 ~ +2 — 실은 택배 점수의 평균을 반올림 (여러 개 실었다고 한 번에 몇 단계씩 오르지 않게)
      const n = (parcels || []).length;
      let xp = n ? Math.max(-2, Math.min(2, Math.round(ts.xp / n))) : 0;
      if (xp > 0 && c.carrier === 'cold' && R.coldTrustBonus) xp += R.coldTrustBonus;
      if (xp > 0) xp = Math.round((xp + R.trustXpDelta) * R.trustXpMult);
      return { xp, early: ts.early, half: ts.half, late: ts.late };
    }
    // 한 번 나갈 때 싣는 개수 (대형 트럭 +1)
    selfCount() { return Math.max(1, D.SELF_DELIVERY.count + this.rules.selfCapDelta + (this.warehouse.bigvan ? 1 : 0)); }
    // 보름에 나갈 수 있는 횟수 — 영업일을 쓰지 않으니 횟수로 묶는다. 배송 기사 +1, 야근 다음 날 보너스는 따로
    selfTrips() { return Math.max(1, (D.SELF_DELIVERY.trips || 1) + (this.warehouse.driver ? 1 : 0)); }
    selfTripsLeft() { return Math.max(0, this.selfTrips() - ((this.monthStats && this.monthStats.selfTrips) || 0)) + ((this.weekendBonus && this.weekendBonus.self) || 0); }
    // 직접 배송: 영업일을 넘기지 않는다 (긴급처럼). 보름 횟수를 하나 쓴다
    selfShip(ids) {
      this._act('self', { ids: (ids || []).slice() });
      if (this.phase !== 'play') return { ok: false, msg: T('err.cannotShipNow') };
      if (this.selfTripsLeft() <= 0) return { ok: false, msg: T('err.selfTrips') };
      const r = this.selfDeliver(ids);
      if (!r.ok) return r;
      if (this.weekendBonus && this.weekendBonus.self > 0) this.weekendBonus.self--;
      else this.monthStats.selfTrips = (this.monthStats.selfTrips || 0) + 1;
      return r;
    }
    selfCost(p) { return D.SELF_DELIVERY.costBase + D.SELF_DELIVERY.costPerSize * p.size; }
    selfCapacity() { return this.selfCount(); }
    selfSizeMax() { return this.warehouse.bigvan ? 4 : D.SELF_DELIVERY.sizeMax; }
    // 자체 배송 가능: 크기 범위 안이고 속성마다 차량이 있어야 (❄🧊 냉동 탑차, ⚠ 완충 포장차, 🛃 통관 끝난 뒤)
    selfCan(p) {
      if (!this.shows('self')) return false;
      if (p.size > this.selfSizeMax()) return false;
      for (const a of this._attrs(p)) { if ((a === 'cold' || a === 'frozen') && !this.warehouse.coldvan) return false; if (a === 'customs' && (p.customs || 0) > 0) return false; }
      return true;
    }
    selfBlockReason(p) { if (p.size > this.selfSizeMax()) return T('self.needBigVan'); for (const a of this._attrs(p)) { if ((a === 'cold' || a === 'frozen') && !this.warehouse.coldvan) return T('self.needColdVan'); if (a === 'customs' && (p.customs || 0) > 0) return T('self.customsWait'); } return null; }
    // 직접 배송 파손 확률 — ⚠ 도 실을 수는 있다. 완충 포장차가 없으면 능력 없는 업체와 같은 확률로 깨진다
    selfBreakProb(p) { if (!this._attrs(p).includes('fragile') || this.warehouse.padvan) return 0; return Math.min(0.95, D.BREAK_PROB * this.rules.breakMult * (this.customerPerk(p.customer, 'breakMult') || 1)); }
    // 자체 배송 대상: 대기열 앞의 일반 택배를 부피 한도(칸)까지
    selfEligible() { return this.parcels.filter(p => this.selfCan(p)); }
    canSelfDeliver() { return this.phase === 'play' && this.selfEligible().length > 0; }
    // 대기했을 때 다음 턴 예상: 창고 사용량, 기한 초과·부패 예정
    forecast() {
      const R = this.rules, nxt = (this.schedule[this.turn] || []).map(sp => this._gateSpec(sp));
      let incoming = 0; for (const s of nxt) { let sz = s.size + R.sizeDelta; if (s.size >= 4) sz += R.bigSizeDelta + R.storeBigDelta; incoming += Math.max(1, sz); }
      let overdue = 0, spoil = 0, frozenOver = 0;
      const heat = this.isHeatTurn();
      { let free = (this.warehouse.frozen || 0) - this.frozenUsed(); for (const s of nxt) if (s.type === 'frozen') { if (s.size > free) frozenOver++; else free -= s.size; } }
      for (const p of this.parcels) {
        if (!p.overdue && !p.noDeadline && p.deadline - 1 <= 0) overdue++;
        if (p.type === 'fresh' && !p.inCold && !R.freshNoSpoil && (heat || (p.warm || 0) + 1 >= R.warmLimit)) spoil++;
        if (this._attrs(p).includes('frozen') && !p.inFrozen) spoil++;
      }
      return { used: this.usedVolume() + incoming, cap: this.warehouse.cap, incoming, count: nxt.length, overdue, spoil, frozenOver, monthEnd: this.turn >= this.turns() };   // 사이클 길이는 12~14 — 고정 13 을 쓰면 14일짜리 사이클에서 '월말 정산'이 하루 일찍 떴다
    }
    contractName(c) { return D.CARRIERS[c.carrier].name; }

    // 차량 한 대의 용량(칸): 업체 + 등급 + 적재 보강 + 특약 + 신뢰 특성 + 회사·고객 보정. 대기 보너스(스킵·짠돌이 대기 누적·첫 호출)는 칸으로 더해진다
    vehicleCap(c) {
      const R = this.rules;
      // 난투(truckCap): 차는 계열 불문 4칸에서 시작 — 한길(일반)만 등급마다 크게 자라고, 특수 계열은 두 등급에 한 칸. 관세 8~12칸이 모든 계열의 상위 호환이던 것 (유저)
      const TC = R.truckCap, tier = D.CARRIERS[c.carrier].tier || 0, baseCap = TC ? TC.base + (FAM(c.carrier) === 'bulk' ? TC.bulkPerTier * tier : Math.floor(tier / 2) * TC.perTwoTiers) : D.CARRIERS[c.carrier].cap;
      let cap = baseCap + c.enh.cap + c.enh.capDelta + (famVal(R.carrierCapDelta, c.carrier) || 0) + (this.trustPerk(c.carrier, 'cap') || 0);
      if (!TC) for (const id in this.customers || {}) { const cc = this.customerPerk(id, 'carrierCap'); const d = famVal(cc, c.carrier); if (d) cap += d; }
      // 칸 보너스는 호출마다 칸 수를 바꾼다 — 캠페인에서는 통째로 꺼 둔다 (levels.js FLAGS: capBonus)
      if (this.shows('capBonus') && !TC) {
        if (R.skipBonus && this.waitedLastTurn) cap += R.skipBonus;
        if (R.waitStack) cap += Math.min(R.waitStack, this.waitStack);
        if (R.firstCallBonus && this.monthStats && this.monthStats.calls === 0) cap += R.firstCallBonus;
      }
      return Math.max(1, cap);
    }
    baseCapacity(c) { return this.vehicleCap(c); }
    // 홍보 캠페인 — 투자로 키운 홍보를 '발동'해서 며칠 안에 물량을 끌어온다.
    // 상시 +N건이던 것을 발동형으로 바꾼 이유: 창고가 남아도는 보름을 플레이어가 직접 메울 수 있어야 하고,
    // 그렇게 채운 창고가 곧 일괄 출고의 밑천이 된다. 보름에 한 번.
    // ----- 광고 매체 -----
    mediaPlan(id) {
      const A = D.AD_MEDIA[id]; if (!A) return null;
      if (this.adTicketMode()) { const n = (this.adTickets || {})[id] || 0; return { id, level: n > 0 ? 1 : 0, owned: n > 0, icon: A.icon, parcels: A.per, days: A.days, cost: 0, max: n, runs: n, left: n, next: null, ticket: true }; }
      const lv = (this.media && this.media[id]) || 0, L = Math.max(1, lv);
      const runs = lv, used = this.mediaRuns && this.mediaRuns.m === this.month ? (this.mediaRuns.used[id] || 0) : 0;
      return { id, level: lv, owned: lv > 0, icon: A.icon, parcels: A.per, days: A.days, cost: A.cost, max: A.max, runs, left: Math.max(0, runs - used),
        next: lv > 0 && lv < A.max ? { runs: L + 1 } : null };
    }
    mediaScore() { return Math.max(0, Object.values(this.media || {}).reduce((a, b) => a + b, 0) - 1); }
    // 캠페인은 1회성 권(adTickets) — 스토리 장(3장 튜토리얼)도 같은 규칙. 옛 매체 레벨 규칙은 테스트가 끄고 볼 때만 남는다
    adTicketMode() { return true; }
    ownedMedia() { if (this.adTicketMode()) return Object.keys(D.AD_MEDIA).filter(id => ((this.adTickets || {})[id] || 0) > 0); return Object.keys(D.AD_MEDIA).filter(id => (this.media || {})[id] > 0); }
    // 캠페인(광고 집행) 계획. id 를 안 주면 가진 매체 중 첫째(전단지) — 스토리·옛 호출과 맞춘다
    // 겹친 캠페인은 효과가 반감된다 — 아직 끝나지 않은(물량이 들어오는 중인) 캠페인 수만큼 ½ 씩. 끝난 뒤에 다시 하면 온전하다.
    // 같은 날들에 광고를 몰아 부어 창고를 억지로 채우는 것을 막는다 (비용은 그대로)
    campaignStack() { return (this.campaignRuns || []).filter(r => r.m === this.month && r.end > this.turn).length; }
    campaignMult() { return Math.pow(0.5, this.campaignStack()); }
    campaignPlan(id) {
      id = id || this.ownedMedia()[0] || 'flyer';
      const mp = this.mediaPlan(id) || this.mediaPlan('flyer');
      const used = mp.left <= 0;
      const open = this.shows('invest') && this.campaignOpen() && mp.owned;
      const mult = this.campaignMult(), A = D.AD_MEDIA[mp.id] || {};
      // 같은 매체는 돌고 있는 동안 또 집행하지 못한다 — 끝나면(남은 날 0) 다음 눈금을 쓸 수 있다
      const cur = (this.campaignRuns || []).find(r => r.m === this.month && r.end > this.turn && r.media === mp.id);
      const activeLeft = cur ? cur.end - this.turn : 0;
      return { id: mp.id, level: open ? mp.level : 0, parcels: Math.max(1, Math.round(mp.parcels * mult)), rep: Math.floor((A.rep || 0) * mult), mult, stack: this.campaignStack(),
        days: mp.days, cost: mp.cost, runs: mp.runs, left: mp.left, used, active: activeLeft > 0, activeLeft, ready: open && !used && !activeLeft };
    }
    // 스토리 캠페인에서는 '창고가 빈 날 이틀'을 겪고 박 반장이 소개한 뒤에 열린다. 자유 런·안내 끔이면 처음부터
    campaignOpen() { return !this.level || !this.story || this.story.off || (this.story.seen || []).includes('l3invest'); }
    runCampaign(id) {
      const p = this.campaignPlan(id);
      if (!p.level || !this.shows('invest')) return { ok: false, reason: 'locked' };
      if (p.used) return { ok: false, reason: 'used' };
      if (p.active) return { ok: false, reason: 'active', left: p.activeLeft };
      // 광고비도 배차비처럼 후불 — 정산에서 빠진다. 월중에 잔고가 바닥이어도 창고가 비면 광고를 걸 수 있어야 한다
      if (this.rules.payNow) this.cash -= p.cost; else this.feesDue += p.cost;
      this.monthStats.spent += p.cost; this.run.spent += p.cost;
      const roll = this._campaignRoll(p.id);   // 눈금을 쓰기 전에 굴린다 — 미리보기와 같은 '몇 번째' 씨앗
      this.campaignCycle = this.month;
      if (!this.mediaRuns || this.mediaRuns.m !== this.month) this.mediaRuns = { m: this.month, used: {} };
      this.mediaRuns.used[p.id] = (this.mediaRuns.used[p.id] || 0) + 1;
      if (this.adTicketMode()) this.adTickets[p.id] = Math.max(0, (this.adTickets[p.id] || 0) - 1);   // 권 한 장을 쓴다
      let n = 0; for (const x of roll) for (const sp of x.specs) { sp.ad = true; this.schedule[x.slot].push(sp); n++; }
      this.campaignRuns = (this.campaignRuns || []).filter(r => r.m === this.month && r.end > this.turn);
      this.campaignRuns.push({ m: this.month, end: this.turn + p.days, media: p.id });
      const rg = p.rep; if (rg) this.addRep(rg, MSG('why.repAd'));
      this.say('log.campaign', { n, days: p.days, cost: p.cost });
      this.emit('campaign', { n, days: p.days, cost: p.cost, media: p.id });
      return { ok: true, n, days: p.days, cost: p.cost, media: p.id };
    }
    rushState() {
      const R = D.RUSH, ratio = this.warehouse.cap ? this.usedVolume() / this.warehouse.cap : 0;
      const unlocked = this.shows('rush');
      return { unlocked, ratio, charge: unlocked ? Math.max(0, Math.min(1, ratio / R.readyAt)) : 0, ready: unlocked && ratio >= R.readyAt, critical: unlocked && ratio >= R.criticalAt, mult: R.bonus, extraTrucks: R.extraTrucks };
    }
    rushPreview(volume, trucks, fill) {
      const s = this.rushState(), used = this.usedVolume();
      return s.ready && trucks >= D.RUSH.minTrucks && fill >= D.RUSH.minFill && used > 0 && volume / used >= D.RUSH.clearShare;
    }
    // 🔗 조합 미리보기(호출 창): 이 짐들을 같이 보내면 몇 종 · 배수 몇
    mixPreview(ps) { if (!this.rules.mixCombo) return null; const kinds = [...new Set(ps.filter(p => p && p.type !== 'normal' && !p.pushed).map(p => p.type))]; if (kinds.length < 2) return { kinds, mult: 0, streak: this.mixStreak || 0 }; const st = Math.min(M.MULTI.MIX.streakMax, (this.mixStreak || 0) + 1 + (kinds.includes('frozen') && this.ownsFam('frozen') ? 1 : 0)); return { kinds, mult: Math.min(M.MULTI.MIX.maxMult, kinds.length + st - 1), streak: st }; }
    chainState() {
      const C = D.LOAD_CHAIN;
      const level = Math.min(this.loadChain || 0, C.max);
      return { count: this.loadChain || 0, level, max: C.max, mult: level >= 2 ? 1 + (level - 1) * C.step : 1, minFill: C.minFill };
    }
    chainPreview(fill) {
      const C = D.LOAD_CHAIN, count = this.shows('chain') && fill >= C.minFill ? (this.loadChain || 0) + 1 : 0;
      const level = Math.min(count, C.max);
      return { count, mult: level >= 2 ? 1 + (level - 1) * C.step : 1, qualifies: count > 0 };
    }
    // 한 호출에 부를 수 있는 최대 대수 — 담은 만큼 차가 저절로 붙되 **두 대까지**(D.MAX_TRUCKS), 그리고 남은 배차만큼.
    // (캠페인 2장 'simul' 이 열리기 전엔 한 대씩 — 서장은 한 대로 배운다)
    simulMax(c, ps) {
      if (!this.shows('simul')) return 1;
      const avail = c.calls + (this.rules.spareCall && !this.monthStats.spareUsed && c.calls <= 0 ? 1 : 0);
      return Math.max(1, Math.min(this.maxTrucks(c, ps), avail));
    }
    // 한 호출 최대 대수 — 자유 런은 한 대(배차를 여러 번), 난투는 두 대 (meta.js RUN · MULTI.mods maxTrucks)
    maxTrucks(c, ps) { const R = this.rules, f = c && R.famTrucks && R.famTrucks[FAM(c.carrier)]; if (f && ps && !ps.some(p => p && p.type === FAM(c.carrier))) return R.maxTrucks || D.MAX_TRUCKS; return f || R.maxTrucks || D.MAX_TRUCKS; }   // 거인의 두 번째 차는 대형을 실을 때만 — 일반만 두 대로 쓸어 담으면 혼자서 창고를 턴다 (유저: "op 야")   // 난투: 한 대 — 거인(대형)만 두 대
    // 대당 배차비
    truckFee(c) {
      const R = this.rules, car = D.CARRIERS[c.carrier];
      let fee = R.feeFixed != null ? R.feeFixed : car.fee;
      let evMult = 1; for (const ev of this.eventsAt()) { const m = famVal(ev.feeMult, c.carrier); if (m) evMult *= m; }
      if (c.enh && c.enh.holiday && this.isOffTurn()) evMult *= D.ENHANCEMENTS.holiday.feeMult;   // 휴무 특약: 쉬는 날 부르면 할증
      fee = fee * (this.trustPerk(c.carrier, 'feeMult') || 1) * R.feeMult * evMult * this.inflation() + R.feeDelta;
      if (R.fuelRate) fee *= 1 + R.fuelRate * (this.totalTurn || 0);   // 멀티: 유가 — 배차비가 일차에 따라 조금씩 오른다
      return Math.max(0, Math.round(fee));
    }
    // 이 호출의 배차비 (월 첫 배차 무료 강화 반영)
    callFee(c, trucks) { if (this.rules.noCallFee) return 0;   /* 난투: 배차는 횟수로만 */ const free = (this.regularFreeLeft(c) > 0 ? 1 : 0) + (this.freeTruckNext ? 1 : 0); const cut = ((this.growth && this.growth.automation) || 0) * D.GROWTH.automation.feeCut;
      return Math.round(Math.max(0, trucks - free) * this.truckFee(c) * Math.max(0.7, 1 - cut)); }
    // 택배는 쪼개지지 않는다 — 2칸짜리 하나가 두 차에 나뉘어 실릴 수는 없다(유저가 잡은 버그: 7칸 차에 2칸짜리 넷을 6+2 가 아니라 7+1 로 그리고 있었다).
    // 큰 것부터 먼저 들어가는 자리에(first-fit decreasing) 담아 차 대수와 차별 적재를 정한다. 부피 합 ÷ 칸수 는 하한일 뿐이다.
    packTrucks(c, parcels) {
      const cap = this.vehicleCap(c), bins = [];
      for (const p of parcels.slice().sort((a, b) => b.size - a.size)) {
        let b = bins.find(x => x.vol + p.size <= cap);
        if (!b) { b = { vol: 0, list: [] }; bins.push(b); }
        b.vol += p.size; b.list.push(p);
      }
      return bins.map(b => b.list);
    }
    trucksNeeded(c, volumeOrParcels) {
      if (Array.isArray(volumeOrParcels)) return Math.max(1, this.packTrucks(c, volumeOrParcels).length);
      return Math.max(1, Math.ceil(volumeOrParcels / this.vehicleCap(c)));
    }
    capacityBonusNote(c) {
      const R = this.rules, notes = [];
      if (this.shows('capBonus')) {
        if (R.skipBonus && this.waitedLastTurn) notes.push(T('note.skip'));
        if (R.waitStack && this.waitStack) notes.push(T('note.waitStack', { n: Math.min(R.waitStack, this.waitStack) }));
        if (R.firstCallBonus && this.monthStats && this.monthStats.calls === 0) notes.push(T('note.firstCall'));
      }
      if (this.regularFreeLeft(c) > 0) notes.push(T('note.regular'));
      return notes;
    }
    // ----- 능력 매칭 (CARRIER_CAPABILITY_DESIGN v0.2) -----
    contractCaps(c) { const car = D.CARRIERS[c.carrier]; const caps = car.caps.slice(); for (const o of this.contractOpts(c)) { const a = D.ENHANCEMENTS[o].attr; if (!caps.includes(a)) caps.push(a); } return caps; }
    // 강화 칸 — 등급만큼. 어떤 강화든 한 칸 (신뢰 강화는 업체에 쌓이므로 칸을 안 먹는다)
    contractOpts(c) { const o = (c.enh.opts || []).slice(); if (c.enh.opt && !o.includes(c.enh.opt)) o.unshift(c.enh.opt); return o; }
    enhSlots(c) { return (D.ENH_SLOTS || {})[c.grade] || 2; }
    enhUsed(c) { return (c.enh.limit || 0) + (c.enh.cap || 0) + (+c.enh.regular || 0) + (c.enh.holiday ? 1 : 0) + this.contractOpts(c).length; }
    // 장착된 강화 id 목록 (칸 표시용) — 한도 강화는 +1/+2 를 구분해 기억한다
    enhList(c) { const out = [], lim = (c.enh.limitIds || []).slice(0, c.enh.limit || 0); while (lim.length < (c.enh.limit || 0)) lim.push('limit1');
      const rep = (id, n) => { for (let k = 0; k < n; k++) out.push(id); };
      out.push(...lim); rep('cap1', c.enh.cap || 0); rep('regular', +c.enh.regular || 0); if (c.enh.holiday) out.push('holiday'); out.push(...this.contractOpts(c)); return out; }
    // 강화 하나 빼기(교체용) — 산 효과를 그대로 되돌린다
    removeEnh(c, id) {
      const e = D.ENHANCEMENTS[id]; if (!e) return false;
      if (e.kind === 'limit') { c.enh.limit = Math.max(0, (c.enh.limit || 0) - 1); const ids = c.enh.limitIds || []; const i = ids.lastIndexOf(id); if (i >= 0) ids.splice(i, 1); c.maxCalls = Math.max(1, c.maxCalls - e.value); c.calls = Math.max(0, Math.min(c.calls, c.maxCalls)); }
      else if (e.kind === 'cap') c.enh.cap = Math.max(0, (c.enh.cap || 0) - 1);
      else if (e.kind === 'regular') c.enh.regular = Math.max(0, (+c.enh.regular || 0) - 1);
      else if (e.kind === 'holiday') c.enh.holiday = false;
      else if (e.kind === 'opt') { const opts = this.contractOpts(c); const i = opts.indexOf(id); if (i < 0) return false; opts.splice(i, 1); c.enh.opts = opts; c.enh.opt = null; if (e.capDelta) c.enh.capDelta -= e.capDelta; if (e.callsDelta) { c.maxCalls = Math.max(1, c.maxCalls - e.callsDelta); c.calls = Math.max(0, Math.min(c.calls, c.maxCalls)); } }
      else return false;
      return true;
    }
    regularFreeLeft(c) { return Math.max(0, (+c.enh.regular || 0) + this.rules.freeTrucksPerCycle - (c.freeUsed || 0)); }
    // 특약을 붙인 계약은 그 속성도 '받는 것'에 들어간다. caps 만 넓히고 need 를 그대로 두면
    // 전문 계열(냉장·파손·냉동·통관)은 특약을 붙여도 그 물건을 거절한다 — 특약이 아무 쓸모가 없어진다.
    // 이 특약을 붙일 수 있는 계약이 하나라도 있는가
    _canFitOpt(key) { return this.contracts.some(c => this.optFits(key, c)); }
    // 이 특약을 이 계약에 붙일 수 있나 (칸이 차 있어도 교체로 끼울 수 있다)
    optFits(key, c) {
      const e = D.ENHANCEMENTS[key]; if (!e || e.kind !== 'opt' || !c) return false;
      const car = D.CARRIERS[c.carrier];
      if (car.onlyPlain || car.caps.includes(e.attr)) return false;
      if (e.maxSizeMax && car.sizeMax > e.maxSizeMax) return false;
      return true;
    }
    contractNeed(c) { const car = D.CARRIERS[c.carrier]; if (!car.need) return null; const need = car.need.slice();
      for (const a of car.caps || []) if (D.GATING_ATTRS.includes(a) && !need.includes(a)) need.push(a);   // 복합 능력(냉동칸 딸린 냉장차 등)은 그 물품도 받는다 — 능력만 있고 받지는 않던 것
      for (const o of this.contractOpts(c)) { const a = D.ENHANCEMENTS[o].attr; if (!need.includes(a)) need.push(a); } return need; }
    contractSizeMax(c) { const car = D.CARRIERS[c.carrier]; const pk = this.trustPerk(c.carrier, 'sizeMax'); const m = pk ? Math.max(car.sizeMax, pk) : car.sizeMax; return Math.min(m, this.vehicleCap(c)); }   // 차보다 큰 택배는 못 싣는다(차가 작아진 난투에서 4칸 신선이 두 대에 걸쳐 실리던 것)
    // car: 업체 데이터, p: 택배(또는 {type,size,attrs,customs} 의사 택배), caps: 계약 단위 능력, sizeMax: 계약 단위 최대 크기
    _carrierAccepts(car, p, caps, sizeMax, need) {
      caps = caps || car.caps; sizeMax = sizeMax == null ? car.sizeMax : sizeMax;
      need = need === undefined ? car.need : need;
      const attrs = (p.attrs || D.PARCEL_TYPES[p.type].attrs).filter(a => D.GATING_ATTRS.includes(a) || (need || []).includes(a));
      if (p.size < (this.rules.truckCap ? 1 : car.sizeMin) || p.size > sizeMax) return false;   // 난투: 거인 차도 작은 짐을 싣는다(조합하려고)
      // 일반 전용(대량) 차도 ⚠ 는 싣는다 — 파손 능력이 없으니 깨질 확률을 안고(breakProb). 규칙 문구 「능력 없는 업체로 보내면 파손 확률」 그대로
      if (car.onlyPlain && attrs.filter(a => D.GATING_ATTRS.includes(a) && a !== 'fragile').length) return false;
      // 난투(strictCarry): 계약은 **일반 + 제 물품**만 — 특약·복합 능력(계열 기본 능력 밖의 것)마다 한 종류씩 더 (유저: "코끼리 보세 등등이 실을 수 있는 게 너무 똑같아")
      if (this.rules.strictCarry && p.type && p.type !== 'normal') { const own = (M.MULTI.CARRY_OWN || {})[car.family] || []; if (!own.includes(p.type)) { const base = (D.FAMILIES[car.family] || {}).caps || [], AT = M.MULTI.CARRY_ATTR || {}; if (!caps.some(a => !base.includes(a) && AT[a] === p.type)) return false; } }
      if (car.allowAttrs && attrs.some(a => D.GATING_ATTRS.includes(a) && !car.allowAttrs.includes(a) && !caps.includes(a))) return false;   // 특약(보냉·완충)으로 붙인 능력은 설비 제한도 푼다 — 통관 차에 보냉 특약을 붙여도 신선을 못 싣던 것
      if (need && !need.some(a => attrs.includes(a))) { if (!(this.rules.normalAnywhere && !attrs.length)) return false; }   // 난투: 전문 차도 일반은 싣는다 — "파손은 싣는데 일반은 못 싣는 건 상식상 애매" (유저)
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
      return Math.round(r * (R.rewardMult[p.type] || 1) * this.rushMult(p));
    }
    // ⚡ 긴급 화물 보상 배수 — 들어온 날(age 0) ×2, 그 뒤 ×½
    rushMult(p) { return p && p.rush ? (p.overdue ? D.RUSH_CARGO.later : D.RUSH_CARGO.sameDay) : 1; }
    rushToday(p) { return !!(p && p.rush && !p.overdue); }
    isSpecialist(car, type) { return Array.isArray(car.specialist) ? car.specialist.includes(type) : car.specialist === type; }
    canHandle(c, p) { return this._carrierAccepts(D.CARRIERS[c.carrier], p, this.contractCaps(c), p && p.pushed && p.size > this.contractSizeMax(c) ? this.vehicleCap(c) : this.contractSizeMax(c), this.contractNeed(c)); }   // 밀려온 큰 상자(🦣 4칸)는 차에 들어가기만 하면 싣는다
    // 이 택배를 (파손 없이) 받아 주는 계열들 — 지금 계약이 없을 때 "뭘 사면 되는지" 말해 주려고
    familiesFor(p) {
      const out = [];
      for (const fam of Object.keys(D.FAMILIES)) {
        const key = D.centerFor(fam, 0); if (!key) continue;
        const car = D.CARRIERS[key];
        const attrs = p.attrs || D.PARCEL_TYPES[p.type].attrs;
        if (!this._carrierAccepts(car, p)) continue;
        if (attrs.includes('fragile') && !car.caps.includes('fragile')) continue;   // 깨질 확률이 있으면 '처리된다'고 하지 않는다
        out.push(fam);
      }
      return out;
    }
    // 지금 어떤 계약으로도(배차 유무와 무관) 안 되고 직접 배송도 막힌 택배
    unhandled() { return this.parcels.filter(p => !this.contracts.some(c => c && this.canHandle(c, p) && this.breakProb(c, p) === 0) && !(this.selfCan(p) && this.selfBreakProb(p) === 0)); }
    // 이 계약이 못 받는 것 — 계약 화면에서 보여 준다
    contractBlocks(c) {
      const car = D.CARRIERS[c.carrier], caps = this.contractCaps(c), max = this.contractSizeMax(c);
      const attrs = [];
      for (const a of D.GATING_ATTRS) {
        const pp = { type: 'normal', size: Math.max(car.sizeMin, Math.min(2, max)), attrs: [a], customs: a === 'customs' ? 1 : 0 };
        if (!this._carrierAccepts(car, pp, caps, max)) attrs.push(a);
        else if (a === 'fragile' && !caps.includes('fragile')) attrs.push(a);
      }
      return { attrs, sizeMin: car.sizeMin, sizeMax: max };
    }
    // ⚠ 파손 확률: 능력에 fragile이 없으면
    breakProb(c, p) { const attrs = p.attrs || D.PARCEL_TYPES[p.type].attrs; if (!attrs.includes('fragile') || this.contractCaps(c).includes('fragile')) return 0; return Math.min(0.95, D.BREAK_PROB * this.rules.breakMult * (this.customerPerk(p.customer, 'breakMult') || 1)); }
    eligibleParcels(c) { return this.parcels.filter(p => this.canHandle(c, p)); }
    // 급한 순 자동 선택. sorted 는 급한 순으로 정렬된 후보, maxTrucks 는 이번에 부를 수 있는 최대 대수.
    // 급한 것부터 담되 "마지막 차가 본전선(적재 80%)도 못 채우면 그 차는 통째로 뺀다".
    // 7칸 차에 10칸을 7+3 으로 나눠 보내면 두 번째 차는 배차비만 더 나간다.
    // 그래도 보내야 하면 플레이어가 직접 고르거나, 대기 턴에 직접 배송하면 된다.
    autoPick(c, sorted, maxTrucks) {
      const vcap = this.vehicleCap(c);
      // 1) 급한 것(기한 초과·오늘내일)은 순서대로 먼저 싣는다.
      // 2) 남은 칸은 '가장 꽉 차게' — 순서대로 담기만 하면 2·2·1 을 담고 남은 2칸짜리를 못 싣는다(5/6).
      //    합이 최대인 조합 중에서, 앞(더 급한) 것을 최대한 포함하는 조합을 고른다.
      const urgent = p => p.overdue || this.rushToday(p) || (!p.noDeadline && p.deadline <= 1);
      if (this.rules.multi) sorted = sorted.slice().sort((a, b) => (urgent(b) ? 1 : 0) - (urgent(a) ? 1 : 0) || (b.trait ? 1 : 0) - (a.trait ? 1 : 0));   // 난투: 급한 것 다음은 트레잇 택배(그날 안 보내면 사라진다) — 유저
      const fill = maxCap => {
        const chosen = new Set(); let v = 0;
        for (const p of sorted) if (urgent(p) && v + p.size <= maxCap) { chosen.add(p.id); v += p.size; }
        const rest = sorted.filter(p => !chosen.has(p.id)), rem = maxCap - v, n = rest.length;
        if (rem > 0 && n) {
          // reach[i][s]: rest[i..] 로 정확히 s 칸을 만들 수 있나
          const reach = Array.from({ length: n + 1 }, () => new Uint8Array(rem + 1)); reach[n][0] = 1;
          for (let i = n - 1; i >= 0; i--) { const sz = rest[i].size; for (let s = 0; s <= rem; s++) reach[i][s] = reach[i + 1][s] || (s >= sz && reach[i + 1][s - sz]) ? 1 : 0; }
          let t = rem; while (t > 0 && !reach[0][t]) t--;
          for (let i = 0; i < n && t > 0; i++) { const sz = rest[i].size; if (t >= sz && reach[i + 1][t - sz]) { chosen.add(rest[i].id); t -= sz; v += sz; } }
        }
        return { take: sorted.filter(p => chosen.has(p.id)), v };
      };
      let trucks = Math.max(1, maxTrucks), r = fill(vcap * trucks), trimmed = false;
      // 거인: 두 번째 차는 대형을 실을 때만 — 대형이 안 담겼으면 한 대로 다시 (유저: "말한 설명 아닌 것 같은데" — 1대인데 8/4 로 담겼다)
      if (this.rules.famTrucks && trucks > 1 && this.maxTrucks(c, r.take) < trucks) { trucks = this.maxTrucks(c, r.take); r = fill(vcap * trucks); }
      // 부피 합이 맞아도 통째로 안 들어갈 수 있다(7칸 차 둘에 2칸짜리 일곱 = 14칸이지만 6+6 이 한계) — 넘치면 급하지 않은 것부터 덜어낸다
      const fits = take => this.packTrucks(c, take).length <= trucks;
      while (r.take.length && !fits(r.take)) { const drop = r.take.slice().reverse().find(p => !urgent(p)) || r.take[r.take.length - 1]; r.take = r.take.filter(p => p !== drop); r.v -= drop.size; }
      // 마지막 차가 본전선(80%)도 못 채우면 그 차는 빼고 한 대 적게 다시 꽉 채운다
      for (;;) {
        const packed = this.packTrucks(c, r.take), tr = Math.max(1, packed.length);
        const lastVol = packed.length ? packed[packed.length - 1].reduce((s, p) => s + p.size, 0) : 0;
        if (tr <= 1 || lastVol >= vcap * 0.8) break;
        trucks = tr - 1; r = fill(vcap * trucks); trimmed = true;
        while (r.take.length && !fits(r.take)) { const drop = r.take.slice().reverse().find(p => !urgent(p)) || r.take[r.take.length - 1]; r.take = r.take.filter(p => p !== drop); r.v -= drop.size; }
      }
      return { ids: r.take.map(p => p.id), vol: r.v, trucks: Math.max(1, this.packTrucks(c, r.take).length), trimmed };
    }
    // 휴무일이라도 휴무 특약이 붙은 계약은 부를 수 있다
    offFor(c) { if (this.roadblockDay && this.roadblockDay === this.totalTurn && c && this.contracts[this.roadblockSlot] === c) return true; return this.isOffTurn() && !(c && c.enh && c.enh.holiday); }
    canCall(c) {
      if (!c || this.offFor(c)) return false;
      if (!this.shows('calls')) return this.eligibleParcels(c).length > 0;   // 배차가 소모품이 되기 전(레벨 1)엔 잔량이 없다
      if (c.calls <= 0 && !(this.rules.spareCall && !this.monthStats.spareUsed)) return false;
      return this.eligibleParcels(c).length > 0;
    }
    // 창고에서 차지하는 칸. 트럭에 실을 때는 p.size 그대로다 — 공간 최적화(storeBigDelta)는 창고 적재만 줄인다
    storeSize(p) { if (this.rules.famRules && p.customs > 0 && this.ownsFam('intl')) return 0;   // 🛃 보세 구역: 통관 대기 짐은 칸을 안 먹는다
      const d = this.rules.storeBigDelta; return d && (p.baseSize || p.size) >= 4 ? Math.max(1, p.size + d) : p.size; }
    usedVolume() {
      let v = 0, xl = 0;
      for (const p of this.parcels) { v += this.storeSize(p); if (p.baseSize >= 7) xl++; }
      if (xl > this.warehouse.xl) v += (xl - this.warehouse.xl) * this.rules.xlPenalty;
      return v + this.storageVolume();
    }
    coldUsed() { return this.parcels.filter(p => this._attrs(p).includes('cold')).reduce((s, p) => s + this.storeSize(p), 0); }
    usage() { return this.usedVolume() / this.warehouse.cap; }
    _assignCold() {
      let left = this.warehouse.cold, fl = this.warehouse.frozen || 0;
      for (const p of this.parcels) {
        const sz = this.storeSize(p);
        if (this._attrs(p).includes('frozen')) { if (sz <= fl) { p.inFrozen = true; fl -= sz; } else p.inFrozen = false; continue; }
        if (!this._attrs(p).includes('cold')) continue;
        if (sz <= left) { p.inCold = true; left -= sz; } else p.inCold = false;
      }
      // 🌾 농산물은 남는 냉장 자리에 들어가면 폭염을 피한다
      for (const p of this.parcels) { if (!this._attrs(p).includes('produce')) continue; const sz = this.storeSize(p); if (sz <= left) { p.inCold = true; left -= sz; } else p.inCold = false; }
      this._assignOutdoor();
    }
    _attrs(p) { return p.attrs || D.PARCEL_TYPES[p.type].attrs; }
    frozenUsed() { return this.parcels.filter(p => this._attrs(p).includes('frozen')).reduce((s, p) => s + this.storeSize(p), 0); }
    // 야외 적재: 플레이어 지정(outdoorPref) 먼저, 그래도 넘치면 덜 급한 것부터 밖으로. 냉장·냉동 구역 택배는 마지막
    // 창고 구역별 남은 칸: 바닥(= 전체 - 랙 - 복층) · 랙 · 복층
    areaCaps() { const W = this.warehouse, rack = W.rackCap || 0, mezz = W.mezzCap || 0; return { floor: W.cap - rack - mezz, rack, mezz }; }
    // 이 묶음이 구역에 다 들어가는가 — 들어가면 { id → 구역 }. 큰 것부터, 받아 주는 구역 중 가장 좁은 곳(랙 → 복층 → 바닥)에 통째로 넣는다
    _packAreas(list, floorUsed) {
      const room = this.areaCaps(); room.floor -= floorUsed;
      const A = D.AREAS, out = new Map();
      const sorted = list.slice().sort((a, b) => this.storeSize(b) - this.storeSize(a));
      for (const p of sorted) {
        const sz = this.storeSize(p), zone = p.inCold || p.inFrozen;   // 냉장·냉동 구역은 바닥에 있다
        const cand = zone ? ['floor'] : ['rack', 'mezz', 'floor'];
        const a = cand.find(k => (k === 'floor' || sz <= A[k].maxSize) && room[k] >= sz);
        if (!a) return null;
        room[a] -= sz; out.set(p.id, a);
      }
      return out;
    }
    // 야외 적재: 플레이어 지정(outdoorPref) 먼저, 나머지는 급한 것부터 창고 구역에 통째로 넣어 보고 안 들어가는 것만 밖으로.
    // 냉장·냉동 구역 택배는 마지막까지 안에 둔다
    _assignOutdoor() {
      const pref = this.outdoorPref || [];
      for (const p of this.parcels) { p.outdoor = false; p.area = null; }
      for (const s of this.storage) s.outdoor = false;
      let floorUsed = 0;
      for (const s of this.storage) { if (pref.includes('s' + s.id)) s.outdoor = true; else floorUsed += this.storageVol(s); }
      const xl = this.parcels.filter(p => p.baseSize >= 7).length;
      if (xl > this.warehouse.xl) floorUsed += (xl - this.warehouse.xl) * this.rules.xlPenalty;
      for (const p of this.parcels) if (pref.includes(p.id)) { p.outdoor = true; p.inCold = false; p.inFrozen = false; }
      const zone = p => p.inCold || p.inFrozen;
      // 안에 둘 순서: 냉장·냉동 구역 먼저, 그다음 급한 것 (예전 '밖으로 뺄 순서'의 거꾸로)
      const order = this.parcels.filter(p => !p.outdoor).sort((a, b) => (zone(b) - zone(a)) || (this._urgencyKey(a) - this._urgencyKey(b)) || (a.id - b.id));
      let kept = [], placed = this._packAreas([], floorUsed) || new Map();
      for (const p of order) {
        const tryPack = this._packAreas(kept.concat(p), floorUsed);
        if (tryPack) { kept.push(p); placed = tryPack; }
        else { p.outdoor = true; p.inCold = false; p.inFrozen = false; }
      }
      for (const p of kept) p.area = placed.get(p.id) || 'floor';
    }
    outdoorParcels() { return this.parcels.filter(p => p.outdoor); }
    outdoorVolume() { return this.outdoorParcels().reduce((s, p) => s + this.storeSize(p), 0) + this.storage.filter(s => s.outdoor).reduce((v, s) => v + this.storageVol(s), 0); }
    theftProb(weather) {
      const ov = this.outdoorVolume(); if (ov <= 0) return 0;
      const over = Math.max(1, Math.min(ov, this.usedVolume() - this.warehouse.cap));
      const wx = weather || this.weatherNow(); const wm = wx === 'snow' ? 0.5 : wx === 'storm' ? 2 : 1;
      for (const [max, pr] of D.THEFT_PROB) if (over <= max) return Math.min(0.95, pr * this.rules.theftMult * wm);
      return 0;
    }
    returnIn(p) { return p.overdue ? Math.max(0, this.returnGraceFor(p) - (p.overdueTurns || 0)) : null; }
    // ----- 평판 -----
    repTierDef() { return D.REP_TIERS[Math.min(this.repTier, D.REP_TIERS.length - 1)]; }
    // 멀티(repStep): 등급표 대신 사다리 — 상한에 닿을 때마다 상한 +step · 등급 +1 · 퍽 3택1. 등급 수 상한 없음
    repCap() { const R = this.rules; if (R.repStep) return this.repCapV != null ? this.repCapV : R.gameoverStress + R.repStep * this.repTier;   // repCapV: 계단 길이가 판 중에 바뀐다(🛒 장사) — 오를 때마다 쌓아 둔다
      return this.repTier === 0 ? R.gameoverStress : this.repTierDef().cap; }
    repMaxTier() { return this.rules.repStep ? Infinity : D.REP_TIERS.length - 1; }
    // 등급은 난이도 스케일러: 소문이 나면 물량이 늘고 규모가 커져 운영비도 는다 (멀티는 일차가 그 일을 한다 — 등급은 퍽만 준다)
    repScaleArrivals() { return this.rules.repStep ? 1 : this.repTierDef().arrivals || 1; }
    repScaleOpCost() { return this.rules.repStep ? 1 : this.repTierDef().opCost || 1; }
    // 이 등급부터 들어오기 시작하는 품목 (그 전에는 일반으로 돌린다). 멀티는 새 계약이 없으니 열리지 않는다
    repUnlocked(type) { if (this.rules.noRepUnlock) return !!this.rules.contractGated; /* 난투: 평판 대신 계약이 연다 — 대본엔 다 있고 받아 주는 계약이 없으면 일반으로 온다 */ return (this.repTierDef().unlock || []).indexOf(type) >= 0; }
    // 지금 평판 등급에서 찾아올 수 있는 고객 (아직 거래 안 하는 고객 중)
    openCustomers() { return Object.keys(M.CUSTOMERS).filter(k => k !== 'anon' && !this.customers[k] && (M.CUSTOMERS[k].repTier || 0) <= this.repTier); }
    // 이 등급에서 새로 열린 고객 (등급이 막 올랐을 때 알려 주려고)
    customersAtTier(tier) { return Object.keys(M.CUSTOMERS).filter(k => k !== 'anon' && (M.CUSTOMERS[k].repTier || 0) === tier); }
    repTierId() { return D.REP_TIERS[Math.min(this.repTier, D.REP_TIERS.length - 1)].id; }
    repTierName() { return this.rules.repStep ? T('multi.tier', { n: this.repTier }) : T('rep.tier.' + this.repTierId()); }
    // 평판 증감. 사고는 깎고(pen 양수 = 깎임), 잘한 일은 올린다. 상한을 넘지 않고, 0 이하면 런이 끝난다
    addRep(n, why) {
      if (!n || !this.shows('rep')) return 0;
      if (n < 0) this.repDropped = true;
      const before = this.rep;
      this.rep = Math.max(this.rules.repKeepTier ? this.repFloor() : 0, Math.min(this.repCap(), this.rep + n));   // 난투: 올라간 계단은 안 내려간다 — 막판 폭주에 넷이 다 0 근처로 떨어져 점수가 무의미해지던 것
      const d = this.rep - before;
      if (d) this.emit('rep', { delta: d, why, rep: this.rep });
      // 멀티: 상한에 닿는 순간 등급이 오른다(정산을 기다리지 않는다) → 상한 +step, 퍽 카드 3장. 팝업은 시간을 안 쓴다
      if (this.rules.perkPick && d > 0 && this.rep >= this.repCap() && !this.perkOffer && !this.repShop) this._repLadderUp();
      return d;
    }
    _repLadderUp() {
      if (this.rules.repStep) { const old = this.repCap(); this.repFloorV = old; this.repCapV = old + this.repStepNow(); }
      this.repTier++;
      this.say('log.repTierUp', { name: this.repTierName(), cap: this.repCap() });
      if (this.rules.repShop) { this.repShop = { items: this._drawRepShop(), bought: 0 }; this.emit('repTier', { tier: this.repTier, cap: this.repCap(), customers: [], shop: this.repShop.items.length }); return; }
      this.perkOffer = this._drawPerks(3);
      this.emit('repTier', { tier: this.repTier, cap: this.repCap(), customers: [], perks: this.perkOffer.slice() });
    }
    // 평판 상점(난투): 장 매물(계약 업그레이드·새 계약·강화·광고권)에서 랜덤 3장. 시간은 안 간다 (유저: "일정 수준 평판 달성 시 상점, 랜덤 픽 3개, 내 돈으로 산다")
    // 이 강화를 붙일 수 있는 슬롯(많이 나른 계약부터) — 없으면 −1. 특약은 받는 계약, 나머지는 빈 강화 칸
    enhTarget(key) { const E = D.ENHANCEMENTS[key]; if (!E) return -1; let s = -1, max = -1; this.contracts.forEach((c, i) => { if (c && (E.kind !== 'opt' || this.optFits(key, c)) && (E.kind === 'trust' || this.enhUsed(c) < this.enhSlots(c)) && (c.delivered || 0) > max) { max = c.delivered || 0; s = i; } }); return s; }
    // 난투: 특약은 그 속성의 물품이 실제로 올 때만 판다 — 신선은 냉장 계열이 있어야 오는데, 냉장 계약이 있으면 보냉 특약이 필요 없다
    _optUseful(key) { const E = D.ENHANCEMENTS[key]; if (!E || E.kind !== 'opt' || !this.rules.typeFamilies) return true; return Object.keys(D.PARCEL_TYPES).some(t => (D.PARCEL_TYPES[t].attrs || []).includes(E.attr) && this.typeOpen(t) && this.contracts.some(c => c && this.optFits(key, c))); }
    _drawRepShop() {
      // 첫 상점은 트랙마다 새 계약 한 장씩 — 계열이 모두 다르다 (유저: "첫 마켓은 모두 계열이 다른 걸로")
      if (this.rules.multi && M.MULTI.TRACKS && !this.firstShopDone) { this.firstShopDone = true; const first = this._trackContractItems(); if (first.length >= 2) { if (this.rules.noMoney) for (const it of first) it.price = 0; return first; } }
      // 퍽 카드는 없다(유저: "그 이상한 퍽들도 없애고 그냥 마켓 아이템들이 평판 올라가면 뜨는 거야") — 장 매물에서 랜덤 3장. 돈이 없는 규칙이면 값 0 · 하나만 고른다
      const goods = this.rng.shuffle(this._shopItems().filter(it => !it.sold && it.kind !== 'refill' && (it.kind !== 'enh' || this.enhTarget(it.enh) >= 0) && (it.kind !== 'enh' || this._optUseful(it.enh))).concat(this._traitUnlockItems())).slice(0, this.shopCards());   // 붙일 계약이 없는 강화는 안 뜬다
      if (this.rules.noMoney) for (const it of goods) it.price = 0;
      return goods;
    }
    buyRepShop(i, target) {
      const sh = this.repShop; if (!sh) return { ok: false, msg: T('err.cannotCallNow') };
      const it = sh.items[i]; if (!it || it.sold) return { ok: false, msg: T('err.sold') };
      if (this.cash < (it.kind === 'perk' ? it.price : this.contractPrice ? (it.kind === 'contract' ? this.contractPrice(it) : it.price) : it.price)) return { ok: false, msg: T('err.noCash') };
      this._act('rbuy', { i, s: target == null ? null : target });
      if (it.kind === 'traitUnlock') { it.sold = true; sh.bought++; if (!this.traitUnlocks.includes(it.ptype)) this.traitUnlocks.push(it.ptype); this.say('log.traitUnlock', { type: D.PARCEL_TYPES[it.ptype].name, icon: (this.traitDef(it.trait) || {}).icon || '' }); if (this.rules.noMoney) this.closeRepShop(true); return { ok: true, unlock: it.ptype }; }
      if (it.kind === 'perk') { this.cash -= it.price; this.run.spent += it.price; it.sold = true; sh.bought++; this._applyPerk(it.perk); if (this.rules.noMoney) this.closeRepShop(true); return { ok: true, perk: it.perk }; }
      // 장 매물은 buy() 로 — 잠깐 상점을 마켓으로 세워 두고 판다(로그는 rbuy 하나)
      const saved = { market: this.market, phase: this.phase };
      this.market = { items: sh.items, bought: 0, refreshes: 0, month: this.month, shop: true, rep: true, freeRefresh: 0 }; this.phase = 'market';
      let r; try { r = this.buy(i, target); } finally { this.market = saved.market; this.phase = saved.phase; }
      if (r && r.ok) { sh.bought++; if (this.rules.noMoney) this.closeRepShop(true); }   // 자동 닫힘은 rbuy 에 딸린 것 — 로그엔 안 적는다(재실행이 두 번 닫지 않게)   // 평판 상점은 하나만 고른다(유저)
      return r;
    }
    closeRepShop(auto) { if (!this.repShop) return false; if (!auto) this._act('rclose'); this.repShop = null; this.emit('repShopClosed', {}); if (this.rep >= this.repCap()) this._repLadderUp(); else if (this.pendingShops > 0) { this.pendingShops--; this.openBonusShop(); } return true; }   // 상점 사이에 넘친 평판은 닫자마자 다음 계단 · 밀린 🛒 단골 상점
    _applyPerk(id) {
      const pk = M.MULTI.PERKS[id];
      this.mperks.push(id); (this.cfg.mperks = this.cfg.mperks || []).push(id);
      this._buildRules();
      if (pk.now) {
        if (pk.now.cap) { this.warehouse.cap += pk.now.cap; this._assignCold(); }
        if (pk.now.cash) { this.cash += pk.now.cash; this.run.revenue += pk.now.cash; }
        if (pk.now.calls) for (const c of this.contracts) if (c) { c.maxCalls += pk.now.calls; c.calls += pk.now.calls; }   // 있는 계약도 바로 +1(새 계약은 callsDelta 로)
        if (pk.now.refill) for (const c of this.contracts) if (c) c.calls = c.maxCalls;                                   // 지금 전부 가득
      }
      this.say('log.perkPicked', { name: pk.name, icon: pk.icon });
      this.emit('perkPicked', { perk: id });
    }
    // 퍽 카드 뽑기: 계열(💰🛡⚔)에서 하나씩. 지금 구현 단계에서 실제로 작동하는 카드만(phase). 계열에 남은 카드가 없으면 다른 계열에서 채운다
    _drawPerks(n) {
      const MP = (M.MULTI && M.MULTI.PERKS) || {}, phase = (M.MULTI && M.MULTI.PHASE) || 1;
      const pool = Object.keys(MP).filter(k => (MP[k].phase || 1) <= phase);
      const byFam = {}; for (const k of pool) (byFam[MP[k].family] = byFam[MP[k].family] || []).push(k);
      const out = [];
      for (const f of this.rng.shuffle(Object.keys(byFam))) { if (out.length >= n) break; out.push(this.rng.pick(byFam[f])); }
      while (out.length < n && pool.length) { const k = this.rng.pick(pool); if (!out.includes(k) || out.length >= pool.length) out.push(k); }
      return out.slice(0, n);
    }
    // 3택1: 고른 퍽을 얹고 규칙을 다시 짠다. 즉시 효과(now: 칸·현금)는 여기서 한 번 적용
    pickPerk(id) {
      if (!this.perkOffer || !this.perkOffer.includes(id)) return { ok: false, msg: T('err.cannotCallNow') };
      this._act('perk', { id });
      this.perkOffer = null;
      this._applyPerk(id);
      return { ok: true, perk: id };
    }
    // 평판이 낮으면 개인 고객이 안 맡긴다 — 상한까지 채우면 1.0배(기준), 바닥이면 0.55배
    repArrivalMult() { const c = this.repCap(); return 0.55 + 0.45 * (c ? Math.min(1, this.rep / c) : 1); }
    monthsTotal() { return this.rules.months; }

    // ----- 월별 테이블 (무한 모드 확장 포함) -----
    // 고객 신뢰 단계에 따른 추가 입고: 단계가 오를수록 물량이 배 이상으로 는다
    _customerExtra() { if (this.bizMode()) return 0; let n = 0; for (const id in this.customers) { const c = this.customers[id]; if (id === 'anon' || c.suspended) continue; n += (M.CUSTOMER_EXTRA[this.customerLevel(id)] || 0) * (c.slots || 1); } return n; }
    // 달력 컷 시나리오(성수기·폭염·데일리)는 monthOffset 만큼 뒤 개월차의 표(입고·품목·등급·가격)를 쓴다 — 11월 컷이 1개월차 물량으로 시작하면 싱겁다
    tableMonth(c) { return this.monthIndex(c) + (this.rules.monthOffset || 0); }
    // 튜토리얼 대본(1~3개월차). 「인수인계」로 시작한 런에서만 (docs/STORY_TUTORIAL_DESIGN.md 부록 I)
    // 이 런에서 그 기능이 켜져 있는가. 캠페인 레벨 밖(자유 런)은 전부 켜져 있다 (levels.js FLAGS)
    shows(k) { if (k === 'chain' && this.rules.multi) return true;   /* 난투는 연속 만차가 본체 연출이다 */ if ((D.DISABLED_FEATURES || []).includes(k)) return false; if (k === 'calls' && this.rules.unlimitedCalls) return false;   /* 멀티: 배차 눈금·충전 자체가 없다 */ return !this._shows || this._shows.has(k); }
    // 상호: 레벨 1을 끝내면 플레이어가 붙인 이름이 회사 이름을 대신한다
    companyName() { return this.cfg.companyName || this.company.name; }
    // 준비 마켓은 아직 사이클 0 이다 — 그 장의 대본(사이클 1)을 보게 한다
    script(m) { if (this.level && this.level.script) return this.level.script[(m || this.month) || 1] || null; if (!this.cfg.scripted || !TUT) return null; return TUT.months[m || this.month] || null; }
    scripted() { return !!this.script(); }
    _extraArrivals(m) { const tm = this.tableMonth(m); return Math.round((tm <= 6 ? D.EXTRA_ARRIVALS[tm] : D.EXTRA_ARRIVALS[6] + (tm - 6) * 2) * this.seasonMods(m).arrivalsMult) + this._customerExtra(); }
    _typeRatio(m) {
      const R = this.rules, sm0 = m; m = this.tableMonth(m);
      let base = { ...(D.TYPE_RATIO[Math.min(6, m)]) };
      if (m > 6) { const k = Math.min(6, m - 6); base.normal = Math.max(20, base.normal - k * 2); base.fresh += k / 2; base.fragile += k / 2; base.intl += k / 2; base.large += k / 2; }
      const sm = this.seasonMods(sm0).typeShift; for (const t in sm) base[t] = Math.max(0, (base[t] || 0) + sm[t]);
      if (R.typeOverride) base = { ...R.typeOverride };
      if (R.typeShift) for (const t in R.typeShift) base[t] = Math.max(0, (base[t] || 0) + R.typeShift[t]);
      // 🛃 통관 · 🧊 냉동은 평판 등급이 열어 준다 — 아직이면 그 몫은 일반으로 (달력이 아니라 내가 키워서 여는 것).
      // 시나리오가 그 품목을 주제로 삼은 경우(typeOverride·보장 업체)는 건드리지 않는다
      if (!R.typeOverride) for (const t of ['intl', 'large', 'frozen']) if (base[t] && !this.repUnlocked(t)) { base.normal = (base.normal || 0) + base[t]; base[t] = 0; }
      // 캠페인: 아직 안 연 품목은 아예 오지 않는다. 화면에서 숨기는 것으로는 부족하다 —
      // ⚠🛃🌾 를 받아 줄 계약도, ❄ 를 둘 냉장 구역도 없는 장에 그게 오면 반송 말고는 길이 없다.
      // (대본이 없는 사이클을 무작위로 풀어 두려면 이 문이 규칙 쪽에도 있어야 한다)
      if (this._shows) {
        const gate = { fragile: 'attrs', produce: 'attrs', fresh: 'cold', large: 'bigsize', intl: 'customs', frozen: 'frozen' };
        for (const t in gate) if (base[t] && !this.shows(gate[t])) { base.normal = (base.normal || 0) + base[t]; base[t] = 0; }
      }
      return base;
    }
    // 사업 규모 0~3: 최근 두 사이클 평균 배송 수익으로 (BIZ_LEVELS)
    bizLevel() { const h = (this.revHist || []).slice(-2); if (!h.length) return 0; const avg = h.reduce((a, b) => a + b, 0) / h.length; let lv = 0; for (const t of D.BIZ_LEVELS) if (avg >= t) lv++; return lv; }
    _gradeProb(m) {
      const R = this.rules; m = Math.max(this.tableMonth(m), [0, 4, 6, 7][this.bizLevel()] || 0);   // 달력과 사업 규모 중 앞선 쪽
      const p = { ...(D.GRADE_PROB[Math.min(6, m)]) };
      if (m > 6) { p.master = 30; p.expert = 30; p.trusted = 30; p.normal = 10; }
      if (m < R.expertFrom) { p.normal += p.expert + p.master; p.expert = 0; p.master = 0; }
      if (R.gradeShift) { const s = Math.round(p.normal * R.gradeShift); p.normal -= s; p.trusted += s; }
      for (const g of ['trusted', 'expert', 'master']) if (R.marketWeight[g]) p[g] = Math.round(p[g] * R.marketWeight[g]);
      return p;
    }
    // 월말 정산 후 예상 자금: 현금 + 지연 입금 − 후불 배차비 − 운영비 − 보험료 − 차입 상환(원금+이자)
    projectedCash() {
      const pending = (this.pendingRevenue || []).filter(x => (x.due != null ? x.due : this.month) <= this.month).reduce((s, x) => s + (x.amount || 0), 0);   // 이번 정산에 만기 오는 어음만
      const op = this.opCostBreakdown(this.month).total;
      const prem = this.insurer === 'none' ? 0 : this.premium();
      const loan = this.debt > 0 ? this.debt + Math.ceil(this.debt * D.LOAN.interest) : 0;
      // 재고는 넣지 않는다 — 아직 못 보낸 택배를 돈으로 세면, 쌓아 두기만 해도 예상 금액이 오르는 것처럼 보인다.
      // 월말 예상 = 지금 현금 + 받기로 된 돈(입금 대기) − 나갈 돈(배차비 청구·운영비·보험·대출)
      return { cash: this.cash, pending, stock: 0, feesDue: this.feesDue, opCost: op, premium: prem, loan, total: this.cash + pending - this.feesDue - op - prem - loan };
    }
    // 운영비 내역: 임대(기본/회사 고정/난이도·시나리오 보정) + 계약 유지비 + 시설 유지비
    opCostBreakdown(m, rentRoll) {
      const R = this.rules;
      let rent = R.opCostFixed != null ? R.opCostFixed : D.OPERATING_COST;
      if (R.opCostRandom) rent = rentRoll != null ? rentRoll : R.opCostRandom[0] + Math.floor((R.opCostRandom[1] - R.opCostRandom[0]) / 2);
      rent += R.opCostDelta;
      if (R.lateOpCost && m >= R.lateOpCost.from) rent += R.lateOpCost.delta;
      rent = Math.max(0, Math.round(rent * this.inflation(m) * this.repScaleOpCost()));
      const contracts = this.contracts.filter(Boolean).reduce((s, c) => s + (D.OPCOST_CONTRACT[c.grade] != null ? D.OPCOST_CONTRACT[c.grade] : D.OPCOST_CONTRACT.normal), 0);
      let facilities = 0; for (const f of Object.keys(D.FACILITIES)) if (this.warehouse[f]) facilities += D.FACILITIES[f].upkeep || 0;
      const arrivals = this.schedule ? this.schedule.reduce((s, t) => s + t.length, 0) : 0;
      const laborCut = ((this.growth && this.growth.automation) || 0) * D.GROWTH.automation.laborCut;
      const labor = Math.round(Math.max(0, arrivals - D.OPCOST_BASE_ARRIVALS) * D.OPCOST_PER_PARCEL * this.inflation(m) * Math.max(0.55, 1 - laborCut));
      return { rent, contracts, facilities, labor, arrivals, total: rent + contracts + facilities + labor };
    }
    _opCost(m) {
      const R = this.rules;
      const roll = R.opCostRandom ? R.opCostRandom[0] + this.rng.int(R.opCostRandom[1] - R.opCostRandom[0] + 1) : null;
      const b = this.opCostBreakdown(m, roll); this._lastOpCost = b; return b.total;
    }

    // ----- flow -----
    // 첫 마켓 없이 바로 시작하는 판(이어하기·스토리)은 셋업이 곧 전부다 — 첫 사이클에 올 수 있는 품목인데
    // 지금 계약·자가 배송으로 실을 곳이 하나도 없으면, 빈 자리에 그 계열 기본 센터를 넣고 자리가 없으면 맞는 특약을 붙여 준다.
    // 화물은 바꾸지 않는다. 마켓을 한 번 지난 뒤부터는 갖추는 건 플레이어 몫
    _ensureStartCaps() {
      const ratio = this._typeRatio(1), types = new Set(Object.keys(ratio).filter(t => ratio[t] > 0));
      for (const id in this.customers) { const cu = this.customers[id], C = M.CUSTOMERS[id]; if (!cu || cu.suspended || !C || !C.items) continue;
        for (const k in C.items) types.add(M.CUSTOMER_ITEMS[k] ? M.CUSTOMER_ITEMS[k].type : k); }
      if (!(this.warehouse.frozen > 0)) types.delete('frozen');   // 냉동 구역이 없으면 냉동은 신선으로 온다(_spec). 평판 잠금은 비율 쪽에서 이미 걸렀고, 고객 품목은 그와 무관하게 온다
      const OPT = { frozen: 'optFrozen', cold: 'optCold', customs: 'optCustoms' }, FAM = { frozen: 'frozen', fresh: 'cold', produce: 'cold', intl: 'intl' };
      for (const t of types) {
        const T0 = D.PARCEL_TYPES[t]; if (!T0) continue;
        const pp = { type: t, size: 1, attrs: T0.attrs, customs: T0.attrs.includes('customs') ? 1 : 0 };
        if (this.contracts.some(c => c && this.canHandle(c, pp))) continue;
        if (this.warehouse.coldvan && !T0.attrs.includes('customs')) continue;   // 냉장 밴이 있으면 직접 배송으로 나른다
        const empty = this.contracts.indexOf(null), fam = FAM[t], key = fam && D.centerFor(fam, 0);
        if (empty >= 0 && key) { const c = this._makeContract(key, null, null, true); c.calls = Math.max(c.calls, Math.ceil(c.maxCalls * D.CARRY_CALLS_FLOOR)); this.contracts[empty] = c; continue; }
        const miss = T0.attrs.find(a => OPT[a]), oid = miss && OPT[miss], e = oid && D.ENHANCEMENTS[oid]; if (!e) continue;
        const ok = c => c && !D.CARRIERS[c.carrier].onlyPlain && !(e.maxSizeMax && D.CARRIERS[c.carrier].sizeMax > e.maxSizeMax) && !this.contractCaps(c).includes(e.attr);
        const c = this.contracts.find(c => ok(c) && this.enhUsed(c) < this.enhSlots(c)) || this.contracts.find(ok); if (!c) continue;
        c.enh.opts = this.contractOpts(c).concat(oid); c.enh.opt = null; if (e.capDelta) c.enh.capDelta += e.capDelta; if (e.callsDelta) { c.maxCalls = Math.max(1, c.maxCalls + e.callsDelta); c.calls = Math.max(0, Math.min(c.calls, c.maxCalls)); }
        this.say('log.startOpt', { name: e.name, contract: this.contractName(c) });
      }
    }
    _startMonth(m) {
      const R = this.rules;
      this.month = m; this.turn = 0; this._bdCache = null; this.loadChain = 0;
      if (this.customers) for (const id in this.customers) { const c = this.customers[id]; if (c.suspended && m > 1) { c.suspended = false; c.xp = 0; this.say('log.custResume', { name: M.CUSTOMERS[id].name }); } c.month = this._emptyCustMonth(); c.month.lvStart = this.customerLevel(id); }
      this.monthStats = { repStart: this.rep, revenue: 0, spent: 0, calls: 0, delivered: 0, waits: 0, penalty: 0, discarded: 0, overdue: 0, returned: 0, stolen: 0, broken: 0, claims: 0, firstContractBought: false, spareUsed: false, bundleUsed: false, cashStart: this.cash, missionEarned: 0, missionRank: 0, missionBonus: 0, missionTarget: 1 };
      // 월 배차 한도 리셋 (계약은 만료되지 않는다 — 마켓은 업그레이드·새 업체용)
      // v1.5: 배차는 소모품 — 월초 리셋 없음. 마켓의 '가득 충전'으로만 채운다
      if (R.cycleRefill && m > 1) for (const c of this.contracts) if (c) c.calls = c.maxCalls;   // 난투: 장이 없으니 보름마다 배차가 다시 찬다
      for (const c of this.contracts) if (c) { c.successCalls = 0; c.freeUsed = 0; }
      this.monthStats.insClaims = 0; this.monthStats.covered = 0; this.monthStats.premium = 0; this.monthStats.storageIncome = 0; this.monthStats.fees = 0;
      const heatN = R.heatAlerts + (this.seasonMods(m).heatAlerts || 0);
      this.heatTurns = heatN ? this.rng.shuffle([...Array(this.turns(m)).keys()].map(i => i + 1)).slice(0, heatN).sort((a, b) => a - b) : [];
      this.weather = this._genWeather(m);
      this.schedule = this._makeSchedule(m);
      this.monthStats.missionTarget = this._missionTarget(this.schedule);
      if (m > 1 && this.insurer !== 'none') for (const id of M.INSURERS[this.insurer].fans) if (this.customers[id]) this._custXp(id, 1, MSG('why.fanInsurer'));
      if (m > 1) {
        if (R.monthlyStress) this.addRep(-R.monthlyStress, MSG('why.repMonthly'));
      }
      // 준비 마켓: 1개월차 첫 턴 전에 시작 자금으로 계약·시설·보험을 갖출 수 있다 (입고 예정이 보인다)
      if (m === 1 && this.cfg.prep && !this.prepDone) {
        this.prepDone = true; this.phase = 'market';
        this.market = { items: this.rules.multi ? this._shopItems() : this._genMarketItems(this.month), bought: 0, refreshes: 0, month: 0, prep: true, shop: !!this.rules.multi, freeRefresh: this.rules.multi ? 0 : this.rules.freeRefresh + 1 };
        this.say('log.prepMarket');
        return;
      }
      if (m === 1 && this.cfg.prep === false && !this.level && !this.rules.startFamilies) this._ensureStartCaps();   // 난투(startFamilies)는 일부러 못 받는 물품이 있다 — 계약을 사서 연다   // 캠페인 장은 대본이 셋업을 정한다
      this.phase = 'play';
      this.say('log.monthStart', { m: this.monthIndex(m), y: this.yearOf(m), cal: this.calMonth(m), half: this.half(m) });
      this._startTurn();
    }
    // 캠페인 물량이 어느 날 몇 건 들어오나 — 며칠에 고르게 나눈다(태풍 날은 건너뛴다). 미리보기와 실제 주입이 같은 표를 쓴다
    // 반환: [{ slot(schedule 칸), day(1=내일), n }]
    _spreadSlots(count, start, end, len) {
      const slots = [];
      const last = Math.min(len, end == null ? len : end);
      for (let i = Math.max(0, start || 0); i < last; i++) if (this.weather[i] !== 'storm') slots.push(i);
      if (!slots.length || !count) return [];
      return slots.map((slot, k) => ({ slot, day: slot - this.turn + 1, n: Math.floor(count / slots.length) + (k < count % slots.length ? 1 : 0) })).filter(x => x.n > 0);
    }
    // 이번 집행으로 들어올 택배를 **미리 정해** 둔다 — 캠페인마다 자기 씨앗(판 씨앗·사이클·매체·몇 번째)을 쓰므로
    // 미리보기와 실제 집행이 같은 짐을 만들고, 본 난수 흐름은 건드리지 않는다. 반환: [{ slot, day(1=내일), specs }]
    _campaignRoll(id) {
      const p = this.campaignPlan(id), run = p.runs - p.left;
      const spread = this._spreadSlots(p.parcels, this.turn, this.turn + p.days, this.schedule.length);
      let h = 0; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
      const seed = (this.seed ^ Math.imul(this.month + 1, 2654435761) ^ Math.imul(run + 1, 40503) ^ h) >>> 0;
      const saved = this.rng; this.rng = new Rng(seed);
      try {
        const ratio = { ...this._typeRatio(this.month) }, cw = this._customerWeightsFor(this.month), mix = D.AD_MEDIA[p.id].mix || {};
        for (const t in mix) if (ratio[t]) ratio[t] *= mix[t];   // 매체 성격 — 닫힌 종류(0)는 곱해도 0
        return spread.map(x => ({ slot: x.slot, day: x.day, specs: Array.from({ length: x.n }, () => this._genParcelSpec(ratio, this.month, cw)) }));
      } finally { this.rng = saved; }
    }
    _specCells(s) { const R = this.rules; let sz = s.size + R.sizeDelta; if (s.size >= 4) sz += R.bigSizeDelta + R.storeBigDelta; return Math.max(1, sz); }
    // 지금 집행하면 그날 입고가 몇 칸에서 몇 칸이 되나 — 예보 줄과 같은 날짜로
    campaignPreview(id) {
      return this._campaignRoll(id).map(x => { const before = (this.schedule[x.slot] || []).reduce((a, s) => a + this._specCells(s), 0); return { day: x.day, n: x.specs.length, before, after: before + x.specs.reduce((a, s) => a + this._specCells(s), 0) }; });
    }
    // 멀티: 입고 대본은 매치 공유 — 넷이 같은 시드·같은 사이클이면 같은 짐을 받는다. 본 난수 흐름(파손·도난 굴림)은 사람마다 갈리므로
    // 대본은 (시드, 사이클)에서 파생한 씨앗으로 따로 굴린다(_campaignRoll 과 같은 수법). 사람에 따라 달라지는 입력(평판·고객 단계)은 쓰지 않는다.
    // 물량은 일차에 비례해 오른다: × (1 + rate × 지난 영업일), 마지막 보름은 × finalRushMult 「마감 폭주」
    // 난투 사이클 m 의 추가 입고 수(공유 대본·마켓 예보가 같은 식을 쓴다): 기본 × 일차 비례 × 마지막 보름 폭주
    _sharedExtra(m) {
      const R = this.rules; let daysDone = 0; for (let c = 1; c < m; c++) daysDone += this.turns(c);
      const scale = (1 + R.dayArrivalsRate * daysDone) * (m >= R.months ? R.finalRushMult : 1);
      return Math.round(D.EXTRA_ARRIVALS[1] * D.ARRIVALS_SCALE * R.arrivalsMult * scale);
    }
    _sharedSchedule(m) {
      const R = this.rules, turns = this.turns(m);
      const seed = (this.seed ^ Math.imul(m, 2654435761) ^ 0x5bd1e995) >>> 0;
      const saved = this.rng; this.rng = new Rng(seed);
      try {
        const sched = Array.from({ length: turns }, () => []);
        const ratio = this._typeRatio(m), cw = this._customerWeightsFor(m);
        let daysDone = 0; for (let c = 1; c < m; c++) daysDone += this.turns(c);
        // 트레잇: 대본에 박는다(매치 공유) — 누가 기한 안에 내보내느냐가 운이지, 무엇이 붙었느냐는 넷이 같다
        const TR = (M.MULTI && M.MULTI.TRAITS) || {}, total = this.totalDays(), prog = total ? daysDone / total : 0;
        const rate = R.traits ? (R.traitRate[0] + (R.traitRate[1] - R.traitRate[0]) * prog) : 0;
        const atkW = {}, bonW = {}; for (const k in TR) (TR[k].kind === 'attack' ? atkW : bonW)[k] = TR[k].weight;
        const gen = () => { const sp = this._genParcelSpec(ratio, m, cw); const r = sp.type !== 'normal' ? rate * (R.specialTraitMult || 1) : 0; if (r && this.rng.next() < r) sp.trait = this.rng.weighted(this.rng.next() < R.attackShare ? atkW : bonW); return sp; };   // 트레잇은 특수 물품에만(×2.2) — 일반엔 안 붙는다. 초반엔 공격이 없어도 된다 (유저)
        const organicTurns = this.rng.shuffle([...Array(turns).keys()]).slice(0, Math.min(turns, D.GROWTH.organicArrivals));
        for (const t of organicTurns) sched[t].push(gen());
        const extra = this._sharedExtra(m);
        // 난투는 첫날부터 찬다 — 사이클 첫 턴도 뺀다(자유 런은 첫 턴을 비워 둔다). 유저: "난투 첫 물량이 너무 적어"
        const extraTurns = this.rng.shuffle([...Array(turns).keys()]);
        for (let i = 0; i < extra; i++) sched[extraTurns[i % extraTurns.length]].push(gen());
        for (let t = 0; t < turns - 1; t++) if (this.weather[t] === 'storm' && sched[t].length) { sched[t + 1].push(...sched[t]); sched[t] = []; }
        return sched;
      } finally { this.rng = saved; }
    }
    _makeSchedule(m) {
      const R = this.rules, turns = this.turns(m);
      const sc = this.script(m);
      if (sc) {
        const rows = sc.turns.map(t => t.map(x => ({ ...x })));
        while (rows.length < turns) rows.push([]);
        const out = rows.slice(0, turns);
        return out;
      }
      if (R.sharedSchedule) return this._sharedSchedule(m);
      const sched = Array.from({ length: turns }, () => []);
      const ratio = this._typeRatio(m), cw = this._customerWeightsFor(m);
      const gen = () => this._genParcelSpec(ratio, m, cw);
      const organicTurns = this.rng.shuffle([...Array(turns).keys()]).slice(0, Math.min(turns, D.GROWTH.organicArrivals));
      for (const t of organicTurns) sched[t].push(gen());
      // 홍보 물량은 여기 없다 — 캠페인(runCampaign)으로 플레이어가 직접 끌어온다
      let extra = Math.round(this._extraArrivals(m) * D.ARRIVALS_SCALE * this.repArrivalMult() * this.repScaleArrivals() * R.arrivalsMult * (this.bizMode() ? M.DEAL.anonShare : 1));
      const extraTurns = this.rng.shuffle([...Array(turns - 1).keys()].map(i => i + 1));
      for (let i = 0; i < extra; i++) sched[extraTurns[i % extraTurns.length]].push(gen());
      // 기업 계약 물량: 예상 칸수 ×(1±변동) 만큼 그 기업 품목으로 채워 영업일에 흩는다
      if (this.bizMode()) for (const d of this.activeDeals()) {
        if (d.start > m) continue;
        const target = Math.max(2, Math.round(d.cells * (1 + (this.rng.next() * 2 - 1) * M.DEAL.spread)));
        const cw1 = { [d.customer]: 1 }; let cells = 0, guard = 0;
        while (cells < target && guard++ < 120) { const sp = this._genParcelSpec(ratio, m, cw1); sched[1 + this.rng.int(Math.max(1, turns - 1))].push(sp); cells += this._specCells(sp); }
        d.cyc = { target: cells, cells: 0, m };
      }
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
      const clv = cust.items ? (R.fixedCustLevel != null ? R.fixedCustLevel : this.bizMode() ? Math.max(2, this.relation(customer)) : this.customerLevel(customer)) : 0;
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
      let allowed = sizes || (R.typeSizes && R.typeSizes[type]) || D.PARCEL_TYPES[type].sizes;   // 난투: 대형은 3~4칸
      if (type === 'fresh' && R.freshSizes && !sizes) allowed = R.freshSizes;
      if (R.maxParcelSize) { const fit = allowed.filter(x => x <= R.maxParcelSize); if (fit.length) allowed = fit; }
      if (R.typeMaxSize && R.typeMaxSize[type]) { const fit = allowed.filter(x => x <= R.typeMaxSize[type]); if (fit.length) allowed = fit; }   // 난투: 신선·냉동은 빨리 보내는 대신 작다 (유저)   // 난투: 차가 작으니(3칸) 그보다 큰 택배는 안 온다 — 유저: "4칸짜리 파손은 처리가 처음부터 안 되네"
      const w = {}; for (const s of allowed) { let wt = (D.PARCEL_TYPES[type].sizeWeight || {})[s] || D.SIZE_WEIGHT[s]; if (s === 7 && R.xlWeight != null) wt = R.xlWeight; if (s >= 4) wt *= R.bigWeight; if (cust.sizeBias === 'small' && s >= 2) wt *= s >= 4 ? 0.2 : 0.6; if (cust.sizeBias === 'big' && s < 4) wt *= 0.3; if (cust.sizeBias === 'mid' && s !== 2) wt *= 0.5; w[s] = wt; }
      // 냉동: 냉동 구역보다 큰 택배는 오지 않는다 (구역이 0이면 신선으로)
      if (type === 'frozen') { const fz = this.warehouse.frozen || 0; const ok = {}; for (const s in w) if (+s <= fz) ok[s] = w[s]; if (!Object.keys(ok).length) { type = 'fresh'; } else { for (const s in w) delete w[s]; Object.assign(w, ok); } }
      // 대형(4칸 이상)이 아직 안 열린 장에는 어떤 품목도 4칸으로 오지 않는다 —
      // 그걸 실을 수 있는 계열(대형·철도·해상)도 마켓에 안 나오기 때문이다
      if (!this.shows('bigsize')) { const sm = {}; for (const k in w) if (+k < 4) sm[k] = w[k]; if (Object.keys(sm).length) { for (const k in w) delete w[k]; Object.assign(w, sm); } }
      if (!premium && ((this.growth && this.growth.branding) || 0) > 0 && this.rng.next() < this.growth.branding * D.GROWTH.branding.premiumChance) premium = true;
      const spec = { type, size: +this.rng.weighted(w), customer };
      if (attrs) spec.attrs = attrs; if (premium) spec.premium = true;
      if (type === 'normal' && !attrs && this.shows('rushCargo') && !R.noRush && this.rng.next() < D.RUSH_CARGO.chance) spec.rush = true;
      return spec;
    }
    _spawnParcel(spec) {
      const tr = spec.trait;
      const R = this.rules, t = D.PARCEL_TYPES[spec.type];
      let size = spec.size + R.sizeDelta;
      if (spec.size >= 4) size += R.bigSizeDelta;
      size = Math.max(1, size);
      const attrs = (spec.attrs || t.attrs).slice(), customer = spec.customer || 'anon';
      const cust = M.CUSTOMERS[customer] || M.CUSTOMERS.anon;
      const bsd = this.customerPerk(customer, 'bigSizeDelta'); if (bsd && spec.size >= 4) size = Math.max(1, size + bsd);
      if (spec.size >= 7 && this.trustPerkAny('xlDelta')) size = Math.max(1, size - 1);
      let reward = this.baseReward(spec.type, spec.size); if (spec.premium) reward = Math.round(reward * 1.5);
      reward = Math.round(reward * (1 + ((this.growth && this.growth.branding) || 0) * D.GROWTH.branding.reward));
      if (spec.rewardDelta && spec.rewardDelta[spec.type]) reward += spec.rewardDelta[spec.type];
      { const dl = this.bizMode() && customer !== 'anon' && this.dealFor(customer); if (dl) reward = Math.round(reward * dl.rate); }   // 계약 단가
      const p = { id: this.nextId++, type: spec.type, size, baseSize: spec.size, reward, premium: !!spec.premium, rush: !!spec.rush, ad: !!spec.ad, attrs, customer, trait: tr || null,
        deadline: Math.max(1, t.deadline + (R.deadlineDelta[spec.type] || 0) + R.deadlineAll + (attrs.includes('cold') ? R.freshExtra : 0) + (this.customerPerk(customer, 'deadlineDelta') || 0) + (spec.deadlineDelta || 0)), overdue: false, inCold: false, inFrozen: false, age: 0, warm: 0, customs: 0, arrivalTurn: (this.totalTurn || 0) + 1,
        // 첫 사이클에는 기한을 붙이지 않는다 — '차를 꽉 채워 보낸다'를 먼저 익히고, 기한은 그 다음에 배운다 (levels.js noDeadlineCycles)
        noDeadline: this.month <= (R.noDeadlineCycles || 0) && !spec.rush };
      // ⚡ 긴급(새벽배송): 기한은 들어온 날 하루뿐 — 그날 내보내면 ×2, 놓치면 벌점 없이 ×½, 반송 유예가 끝나면 여느 택배처럼 반송(벌점·배상)
      if (spec.rush) p.deadline = D.RUSH_CARGO.deadline;
      p.deadline0 = p.deadline;   // 처음 기한 — 얼마나 일찍 보냈는지(신뢰)를 잰다
      if (attrs.includes('customs')) { p.customs = R.customsWait + (this.trustPerkAny('customsDelta') || 0); if (this.rng.next() < R.customsDelayProb && this.items.customsBond !== this.month && !this.trustPerkAny('noCustomsDelay')) { p.customs += 1; p.customsDelayed = true; } if (cust.rule && cust.rule.kind === 'customsFast') p.customs += cust.rule.delta; const cd = this.customerPerk(customer, 'customsDelta'); if (cd) p.customs += cd; p.customs = Math.max(0, p.customs); p.coldDuringCustoms = true; }
      return p;
    }
    _startTurn() {
      this.turn++;
      let specs = this.schedule[this.turn - 1] || [];
      // 난투: 받아 주는 계약이 없는 특수 물품은 일반으로 온다(트레잇도 없이) — 계약을 사야 그 물품과 그 트레잇이 열린다 (유저)
      const R = this.rules;
      if (R.typeTraits) specs = specs.map(sp => sp.trait || (R.traitAll && sp.type !== 'normal') ? Object.assign({}, sp, { trait: this._resolveTrait(sp) }) : sp);   // traitAll: 특수 물품은 전부 제 트레잇을 단다(트레잇은 호출마다 종류당 한 번이라 개수가 아니다)   // 대본의 트레잇은 '붙었다'는 표시 — 무엇이 붙는지는 물품 종류(와 내 언락)가 정한다
      if (R.contractGated) specs = specs.map(sp => this._gateSpec(sp));
      // 난투: 내가 연 특수 물품은 내 몫이 더 온다 — 일반 입고 일부가 그 물품으로 바뀐다(열린 종류마다 ownCargo). 대본은 넷이 같지만 계약을 산 사람에겐 그 짐이 온다
      // (유저: "거인을 가졌는데 거인 화물이 안 옴" — 공유 대본에서 대형은 5% 남짓이라 계약을 사도 며칠씩 빈 차였다)
      if (R.ownCargo && R.typeFamilies) { const open = Object.keys(M.MULTI.TYPE_FAMILIES || {}).filter(t => this.typeOpen(t)); if (open.length) { let frz = 0, cld = 0; specs = specs.map(sp => { if (sp.type !== 'normal' || this.rng.next() >= Math.min(R.ownCargoMax || 1, R.ownCargo * open.length)) return sp; const t = open[this.rng.int(open.length)], T0 = D.PARCEL_TYPES[t], attrs = T0.attrs || []; const fits = ((R.typeSizes && R.typeSizes[t]) || T0.sizes || [1]).filter(z => this.contracts.some(c => c && this._carrierAccepts(D.CARRIERS[c.carrier], { type: t, size: z, attrs, customs: 0 }, this.contractCaps(c), this.contractSizeMax(c), this.contractNeed(c)))); const room = attrs.includes('frozen') ? (this.warehouse.frozen || 0) - this.parcels.filter(q => this._attrs(q).includes('frozen')).reduce((a, q) => a + q.size, 0) - frz : attrs.includes('cold') ? (this.warehouse.cold || 0) - this.coldUsed() - cld : Infinity;   // 냉동·신선은 들어갈 자리가 있을 때만 — 냉동실 4칸에 냉동이 쏟아져 즉시 폐기되던 것
        const fit2 = fits.filter(z => z <= room); if (!fit2.length) return sp; fits.length = 0; fits.push(...fit2); const w = {}; for (const z of fits) w[z] = (T0.sizeWeight && T0.sizeWeight[z]) || D.SIZE_WEIGHT[z] || 1; const z = +this.rng.weighted(w); if (attrs.includes('frozen')) frz += z; else if (attrs.includes('cold')) cld += z; this.cargoDebt = (this.cargoDebt || 0) + z - sp.size; return Object.assign({}, sp, { type: t, attrs: null, size: z, trait: null, own: true }); }); }
        // 부피는 그대로 — 커진 만큼 그날(모자라면 다음 날) 일반 입고를 덜어 낸다. 대형 4칸이 오면 일반 두어 개가 안 온다
        const kept = []; for (const sp of specs) { if (this.cargoDebt > 0 && sp.type === 'normal' && !sp.trait) { this.cargoDebt -= sp.size; continue; } kept.push(sp); } specs = kept; }
      const arrived = specs.map(s => this._spawnParcel(s));
      this.parcels.push(...arrived);
      this._assignCold();
      for (const p of arrived) this.emit('arrive', { parcel: p });
      this.totalTurn = (this.totalTurn || 0) + 1;
      // 냉동: 냉동 구역에 못 들어가면 즉시 폐기
      for (const p of arrived) if (this._attrs(p).includes('frozen') && !p.inFrozen) this._discardParcel(p, MSG('why.noFrozenZone'), 2, 'discard');
      this._assignCold();
      if (this.rules.multi) this._multiDay();   // 2단계: 임시 칸 만료 · 상시 방패 · 큐에 쌓인 공격 적용
      const xl = this.parcels.filter(p => p.baseSize >= 7).length; this.stats.maxXlSimul = Math.max(this.stats.maxXlSimul, xl);
      if (this.offer && this.offer.expires < this.totalTurn) { this.say('log.offerExpired'); this.offer = null; }
      const _sc = this.script();
      if (_sc) { const o = _sc.offer; if (o && this.turn === o.turn) this._scriptOffer(o); }
      else this._maybeOffer();
      let note = '';
      const wx = this.weatherNow(); if (wx !== 'sunny') note = ` ${M.WEATHER[wx].icon}${M.WEATHER[wx].name}`;
      if (this.heatTurns.includes(this.turn)) note = MSG('log.heatAlert');
      for (const ev of this.eventsAt()) if (ev.turns[0] === this.turn) this.say('log.calEvent', { name: MSG('cal.event.' + ev.id), a: this.dateOf(ev.turns[0]), b: this.dateOf(ev.turns[1]) });
      if (this.isOffTurn()) note = MSG('log.holidayOff');
      this.say('log.arrive', { date: this.dateLabel(), list: arrived.map(p => D.PARCEL_TYPES[p.type].short + p.size).join(', '), usage: Math.round(this.usage() * 100), note });
    }
    // 이번 사이클 대본의 하루 평균 입고 칸수 (봇·장 보기 판단용)
    totalDays() { let n = 0; for (let c = 1; c <= this.rules.months; c++) n += this.turns(c); return n; }
    parcelsPerDay() { const n = this.turns() || 1; return this.schedule.reduce((a, t) => a + t.reduce((b, s) => b + this._specCells(s), 0), 0) / n; }
    // 난투: 받아 줄 계약이 없는 특수 물품은 일반(≤2칸)으로 온다 — 도착할 때와 예보가 같은 규칙을 쓴다 (유저: "예측엔 물품이 보이는데 실제 도착 안 함")
    _gateSpec(sp) { if (!this.rules.contractGated || !sp || sp.type === 'normal') return sp; const attrs = D.PARCEL_TYPES[sp.type].attrs || []; const ok = this.typeOpen(sp.type) && this.contracts.some(c => c && this._carrierAccepts(D.CARRIERS[c.carrier], { type: sp.type, size: sp.size, attrs, customs: 0 }, this.contractCaps(c), this.contractSizeMax(c), this.contractNeed(c)) && (!attrs.includes('fragile') || this.contractCaps(c).includes('fragile'))); return ok ? sp : Object.assign({}, sp, { type: 'normal', attrs: null, trait: null, size: Math.min(sp.size, 2) }); }
    upcoming() {
      const out = [];
      for (let i = 0; i < this.rules.upcomingTurns; i++) {
        const t = this.turn + i;
        if (t < this.turns()) out.push({ turn: t + 1, specs: this.rules.contractGated && this.schedule[t] ? this.schedule[t].map(sp => this._gateSpec(sp)) : this.schedule[t], heat: this.weatherAt(t + 1) === 'heat', burst: this.isRushTurn(t + 1), off: this.isOffTurn(t + 1), events: this.eventsAt(t + 1).map(e => e.id), weather: i < this.rules.forecastTurns ? this.weatherAt(t + 1) : null });
        else out.push({ turn: t + 1, specs: null, weather: null });
      }
      return out;
    }

    // 대기: 턴을 넘긴다. selfIds를 주면 그 택배를 직접 배송(배송비 지불, 보상 그대로)하고 넘긴다
    wait(selfIds) {
      if (this.phase === 'play') this._act('wait', { ids: (selfIds || []).slice() });
      if (this.phase !== 'play') return false;
      // 창고가 (거의) 빈 채로 하루를 넘긴 날 — 캠페인을 소개할 때를 잰다. 4분의 1도 안 찬 날은 비어 노는 날이다
      if (this.usedVolume() <= this.warehouse.cap * 0.25) this.emptyDays = (this.emptyDays || 0) + 1;
      let self = null;
      if (selfIds && selfIds.length && this.selfTripsLeft() > 0) { self = this.selfShip(selfIds); if (!self.ok) return self; }
      this.monthStats.waits++; this.run.waits++; this.stats.waits++;
      this.loadChain = 0;
      if (self) { this.stats.callStreak++; this.stats.maxCallStreak = Math.max(this.stats.maxCallStreak, this.stats.callStreak); } else this.stats.callStreak = 0;
      this.waitStack++;
      if (self) this.say('log.waitSelf', { count: self.count, revenue: self.revenue, cost: self.cost }); else this.say('log.wait');
      this.emit('wait', { self });
      this._endTurn(true);
      return self ? Object.assign({ ok: true }, self) : true;
    }

    callCarrier(slotIdx, pickIds, trucksArg) {
      if (this.phase !== 'play') return { ok: false, msg: T('err.cannotCallNow') };
      this._act('call', { i: slotIdx, ids: (pickIds || []).slice(), n: trucksArg || 0 });
      const c = this.contracts[slotIdx], R = this.rules;
      if (!c) return { ok: false, msg: T('err.emptySlot') };
      if (this.offFor(c)) return { ok: false, msg: T('err.holidayOff') };
      const unlimited = R.unlimitedCalls || !this.shows('calls');   // 멀티: 배차 무제한 — 호출은 배차비만 든다
      const useSpare = !unlimited && c.calls <= 0;
      if (useSpare && !(R.spareCall && !this.monthStats.spareUsed)) return { ok: false, msg: T('err.noCalls') };
      const car = D.CARRIERS[c.carrier], usedBefore = this.usedVolume(), rushReady = this.rushState().ready;
      const elig = this.eligibleParcels(c);
      let chosen = (pickIds || []).map(id => elig.find(p => p.id === id)).filter(Boolean);
      if (chosen.length === 0) return { ok: false, msg: T('err.nothingToShip') };
      // 차량: 부피 합에 맞는 대수. 동시 대수·남은 배차·배차비 검사
      const vcap = this.vehicleCap(c), volume = chosen.reduce((s, p) => s + p.size, 0);
      let trucks = Math.max(this.trucksNeeded(c, chosen), trucksArg || 1);
      const maxT = this.shows('simul') ? this.maxTrucks(c, chosen) : 1;
      if (trucks > maxT) return { ok: false, msg: T('err.overTrucks', { n: maxT, cap: vcap * maxT }) };
      const avail = unlimited ? Infinity : c.calls + (useSpare ? 1 : 0);
      if (trucks > avail) return { ok: false, msg: T('err.noTrucks', { n: c.calls }) };
      const fee = this.callFee(c, trucks);
      // 후불: 배차비는 월말 정산에서 빠진다 (자금 부족으로 호출이 막히지 않는다)
      // 멀티(payNow): 즉시 차감 — 잔액이 곧 점수라 보이는 숫자가 실제 숫자여야 한다. 돈이 모자라면 못 부른다
      if (R.payNow && fee > 0 && this.cash < fee) return { ok: false, msg: T('err.noCashFee', { fee, cash: this.cash }) };
      if (R.payNow) this.cash -= fee; else this.feesDue += fee;
      this.monthStats.spent += fee; this.monthStats.fees = (this.monthStats.fees || 0) + fee; this.run.spent += fee; this.stats.feesPaid += fee; this.stats.trucksCalled += trucks;
      if (this.regularFreeLeft(c) > 0) c.freeUsed = (c.freeUsed || 0) + 1;
      if (this.freeTruckNext && !R.noCallFee) { this.freeTruckNext = false; this.say('log.traitTruckUsed'); }
      const fill = volume / (vcap * trucks);
      if (fill >= 0.8) this.stats.fullTrucks++;

      const lv = this.trustLevel(c);
      const specialistAll = false;
      let revenue = 0, xp = 1, special = false, onTime = 0, broken = 0, delivered = [];
      let cert = false, safeFragile = 0;
      const dawn = this.dawnReady(c, chosen);   // 🌅 새벽 출발 — 싣기 전에 본다
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
        r = Math.round(r * (R.rewardMult[p.type] || 1) * this.rushMult(p));
        if (p.trait === 't_gold' && !p.overdue) r *= 2;   // 💰 웃돈 — 기한 안에 냈을 때만
        if (p.wet) { r = Math.round(r * 0.8); this.stats.wetDelivered++; }
        if (snow && this._attrs(p).includes('cold')) { r += 10; this.stats.snowDelivered++; }
        if (p.overdue) { if (!p.rush) r = Math.round(r * R.overdueMult); this.stats.overdueDelivered++; } else { onTime++; this.stats.onTimeByType[p.type]++; if (p.baseSize >= 7) this.stats.xlOnTime++; if (p.baseSize >= 4) this.stats.bigDelivered++; }
        r += this._custDeliver(p, r, !p.overdue, chosen.filter(q => q.customer === p.customer));
        r = Math.max(0, r); this._custRevenue(p, r);
        revenue += r;
        this.stats.deliveredByType[p.type]++;
        delivered.push(p);
        if (!p.overdue && p.type === 'fragile' && this.famRule(c, 'fragile')) safeFragile++;   // ⚠ 무사고
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.emit('deliver', { parcel: p, reward: r });
      }
      if (!delivered.length && broken) {
        // 전부 파손: 호출은 소모, 보상 없음
        if (unlimited) { /* 무제한 */ } else if (useSpare) { this.monthStats.spareUsed = true; c.calls = Math.max(0, c.calls - (trucks - 1)); } else c.calls -= trucks;
        c.totalCalls++;
        this.monthStats.calls++; this.run.calls++; this.stats.calls++;
        this.waitStack = 0; this.loadChain = 0; this._assignCold();
        this.say('log.callAllBroken', { name: this.contractName(c), broken });
        this.emit('call', { contract: c, count: 0, revenue: 0, broken, trucks, fee });
        this._endTurn(false, false); return { ok: true, revenue: 0, count: 0, broken, trucks, fee };
      }
      chosen = delivered;
      if (R.bigCallPenalty && chosen.length >= R.bigCallPenalty) revenue = Math.round(revenue * 0.9);
      if (R.bigCallBonus && chosen.length >= R.bigCallBonus.min) revenue = Math.round(revenue * R.bigCallBonus.mult);
      revenue = Math.round(revenue * R.revenueMult);
      if (R.finalRushReward && this.month >= R.months) revenue = Math.round(revenue * (1 + R.finalRushReward));   // 멀티 퍽: 마감 폭주 보수
      const deliveredVolume = chosen.reduce((sum, p) => sum + p.size, 0);
      // 🦣 덩치: 대형 하나가 실린 트럭은 만차로 친다
      const actualFill = this.famRule(c, 'large') ? Math.min(1, chosen.reduce((s, p) => s + (p.type === 'large' ? vcap : p.size), 0) / (vcap * trucks)) : deliveredVolume / (vcap * trucks);
      const chainQualified = this.shows('chain') && actualFill >= D.LOAD_CHAIN.minFill && broken === 0;
      this.loadChain = chainQualified ? (this.loadChain || 0) + (this.famRule(c, 'frozen') ? 2 : 1) : 0;   // 🧊 냉동 호출 만차는 연쇄 +2
      const chainLevel = Math.min(this.loadChain, D.LOAD_CHAIN.max);
      const chainMult = chainLevel >= 2 ? 1 + (chainLevel - 1) * D.LOAD_CHAIN.step : 1;
      let chainBonus = 0, pushed = 0;
      // 난투: 만차는 돈이 아니라 **밀어내기** — 연속 만차 2회째부터(1·2·3개) 상대 창고에 택배를 밀어 넣는다 (유저: "만차가 돈 올려주지 말고 일부 택배를 상대에게")
      if (R.chainPush && chainQualified && chainLevel >= 2) { pushed = (R.pushFlat ? Math.min(R.pushFlat, chainLevel - 1) : chainLevel - 1) * (R.pushMult || 1); const big = this.famRule(c, 'large'); this.outbox.push(Object.assign({ type: 'push', n: pushed }, big ? { big: true } : {})); this.emit('pushOut', { n: pushed }); this.stats.pushed = (this.stats.pushed || 0) + pushed; if (chainLevel >= D.LOAD_CHAIN.max) this.loadChain = 0; }   // 최대에서 밀고 나면 처음부터
      if (chainMult > 1 && !R.chainPush && !R.mixCombo) {
        const beforeChain = revenue;
        revenue = Math.round(revenue * chainMult);
        chainBonus = revenue - beforeChain;
        this.stats.chainBonus += chainBonus;
        if (this.loadChain === D.LOAD_CHAIN.repAt) this.addRep(D.LOAD_CHAIN.rep, MSG('why.loadChain'));
      }
      this.stats.maxLoadChain = Math.max(this.stats.maxLoadChain, this.loadChain);
      const rush = rushReady && trucks >= D.RUSH.minTrucks && fill >= D.RUSH.minFill && usedBefore > 0 && deliveredVolume / usedBefore >= D.RUSH.clearShare;
      let rushBonus = 0;
      if (rush) {
        const beforeRush = revenue;
        revenue = Math.round(revenue * D.RUSH.bonus);
        rushBonus = revenue - beforeRush;
        this.stats.rushes++; this.stats.rushBonus += rushBonus;
        this.addRep(D.RUSH.rep, MSG('why.rush'));
      }
      // 신뢰와 평판: 얼마나 일찍 보냈나 (기한 맞춰 보내면 0, 늦으면 깎인다)
      xp = this.trustGainPreview(c, chosen).xp;
      this._addTrust(c.carrier, xp);
      let repD = this.callRep(chosen, false);
      if (repD > 0 && R.earlyRepBonus) repD += R.earlyRepBonus;   // 멀티 퍽: 일찍 보낸 호출의 평판 보너스
      if (repD > 0 && R.rushRepBonus && this.month >= R.months) repD += R.rushRepBonus;   // 멀티 퍽: 마지막 보름 호출 평판 보너스
      if (repD) this.addRep(repD, MSG(repD > 0 ? 'why.repEarly' : 'why.repLate'));
      // 배차 대수 소모
      let refunded = false;
      if (useSpare) { this.monthStats.spareUsed = true; this.say('log.spareCall'); c.calls = Math.max(0, c.calls - (trucks - 1)); }
      else if (unlimited) { /* 무제한 */ }
      else if (R.noCallFee && this.freeTruckNext) { this.freeTruckNext = false; this.say('log.traitTruckUsed'); c.calls -= Math.max(0, trucks - 1); }   // 🚚 덤 트럭(난투): 배차비가 없으니 배차 한 대를 안 쓴다
      else if (R.bundleRefund && chosen.length >= R.bundleRefund && !this.monthStats.bundleUsed) { this.monthStats.bundleUsed = true; refunded = true; c.calls -= Math.max(0, trucks - 1); }
      else c.calls -= trucks;
      c.successCalls++; c.totalCalls++; c.delivered += chosen.length;
      const pd = this.trustPerk(c.carrier, 'delay');
      const delay = R.payNow ? 0 : pd != null ? pd : (car.delay || 0);   // 멀티: 어음 없음 — 전부 즉시 입금
      // 지연 입금은 어음이다 — 사이클 단위로, delay 사이클 뒤 정산 때 현금이 된다 (1 = 보름 뒤 정산, 2 = 한 달 뒤)
      if (delay > 0) { (this.pendingRevenue = this.pendingRevenue || []).push({ due: this.month + delay, amount: revenue, count: chosen.length, name: car.name }); }
      else { this.cash += revenue; this.monthStats.revenue += revenue; this.run.revenue += revenue; }
      const missionUp = this._missionEarn(revenue);
      this.monthStats.calls++; this.monthStats.delivered += chosen.length;
      this.run.calls++; this.run.delivered += chosen.length;
      this.stats.calls++; this.stats.callStreak++; this.stats.maxCallStreak = Math.max(this.stats.maxCallStreak, this.stats.callStreak);
      this.stats.maxSingleCall = Math.max(this.stats.maxSingleCall, chosen.length);
      this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      this.waitStack = 0;
      this._assignCold();
      const freezeFresh = !!this.trustPerk(c.carrier, 'freezeOnCall');
      // 🔗 조합(난투): 한 차에 서로 다른 특수 물품을 같이 실으면 트레잇이 합쳐져 세진다 — 종류 수 k, 연달아 조합하면 연쇄 +1 (유저: "한 차가 특약을 얻어서 동시에 다른 종류를 보내면 머징한 기능이 날아가는 거")
      let mix = null;
      if (R.mixCombo) {
        const kinds = [...new Set(chosen.filter(p => p.type !== 'normal' && !p.pushed).map(p => p.type))];
        if (kinds.length >= 2) {
          this.mixStreak = Math.min(M.MULTI.MIX.streakMax, (this.mixStreak || 0) + 1 + (kinds.includes('frozen') && this.ownsFam('frozen') ? 1 : 0));   // 🧊 냉동이 끼면 연쇄 +1 더
          const mult = Math.min(M.MULTI.MIX.maxMult, kinds.length + this.mixStreak - 1);
          const icons = chosen.filter(p => p.trait && !p.overdue).map(p => (this.traitDef(p.trait) || {}).icon).filter(Boolean);
          const boxes = Math.max(1, mult - 1), big = kinds.includes('large') && this.ownsFam('large');
          mix = { kinds, mult, streak: this.mixStreak, icons, boxes, big };
          this._mixMult = mult;
          this.outbox.push(Object.assign({ type: 'push', n: boxes, all: true, mix: true }, big ? { big: true } : {}));   // 합쳐진 한 방은 일반 상자로도 날아간다 — 상대 전원에게 (🦣 대형이 끼면 4칸 상자)
          this.stats.mixes = (this.stats.mixes || 0) + 1; this.stats.maxMix = Math.max(this.stats.maxMix || 0, mult);
          this.say('log.mix', { kinds: kinds.map(t => D.PARCEL_TYPES[t].short || t).join('+'), n: mult });
          this.emit('mix', mix);
        } else this.mixStreak = 0;
      }
      if (R.traitPerCall) this._fireTraitsPerCall(chosen, deliveredVolume >= vcap * trucks); else for (const p of chosen) this._fireTrait(p);
      this._mixMult = 0;
      if (safeFragile) this.addRep(safeFragile * (M.MULTI.FAM_RULES.fragile.rep || 1), MSG('why.famRule', { icon: M.MULTI.FAM_RULES.fragile.icon }));
      this.say('log.call', { name: this.contractName(c), count: chosen.length, revenue, delay: delay ? MSG('log.callDelay', { delay }) : '', broken: broken ? MSG('log.callBroken', { broken }) : '', refund: refunded ? MSG('log.callRefund') : '', calls: c.calls, fee });
      this.emit('call', { contract: c, count: chosen.length, revenue, broken, delay, trucks, fee, fill, rush, rushBonus, chain: this.loadChain, chainMult, chainBonus, pushed });
      this._updateTrustStats();
      if (dawn) { this.dawnDay = this.totalTurn; this.say('log.dawn'); this.emit('dawn', {}); }   // 🌅 하루가 안 간다 — 오늘 한 번 더 부를 수 있다
      else this._endTurn(false, freezeFresh);
      return { ok: true, revenue, count: chosen.length, broken, delay, trucks, fee, fill, rush, rushBonus, chain: this.loadChain, chainMult, chainBonus, pushed, missionUp, dawn, mix };
    }
    // 직접 배송(대기 턴의 부가 행동): 고른 택배를 배송비를 내고 처리. 보상 그대로. wait()에서 호출
    selfDeliver(ids) {
      if (this.phase !== 'play') return { ok: false, msg: T('err.cannotShipNow') };
      const R = this.rules;
      const chosen = (ids || []).map(id => this.parcels.find(p => p.id === id)).filter(p => p && this.selfCan(p));
      if (!chosen.length) return { ok: false, msg: T('err.nothingSelf') };
      if (chosen.length > this.selfCount()) return { ok: false, msg: T('err.selfLimit', { n: this.selfCount() }) };
      const cost = chosen.reduce((s, p) => s + this.selfCost(p), 0);
      if (R.payNow && !R.noMoney && this.cash < cost) return { ok: false, msg: T('err.noCashFee', { fee: cost, cash: this.cash }) };
      if (R.payNow) this.cash -= cost; else this.feesDue += cost;
      this.monthStats.spent += cost; this.run.spent += cost; this.monthStats.selfCost = (this.monthStats.selfCost || 0) + cost;
      let revenue = 0, broken = 0; const done = [];
      for (const p of chosen) {
        const bp = this.selfBreakProb(p);
        if (bp > 0 && this.rng.next() < bp) {
          broken++; this.monthStats.broken++; this.stats.broken++;
          this._discardParcel(p, MSG('why.brokenInTransit', { name: T('self.card') }), 2, 'broken');
          continue;
        }
        let r = p.reward + (R.rewardDelta[p.type] || 0) + R.rewardAll;
        r = Math.round(r * (R.rewardMult[p.type] || 1) * this.rushMult(p));
        if (p.trait === 't_gold' && !p.overdue) r *= 2;   // 💰 웃돈 — 기한 안에 냈을 때만
        if (p.wet) r = Math.round(r * 0.8);
        if (p.overdue) { if (!p.rush) r = Math.round(r * R.overdueMult); this.stats.overdueDelivered++; } else this.stats.onTimeByType[p.type]++;
        r += this._custDeliver(p, r, !p.overdue, chosen.filter(q => q.customer === p.customer));
        r = Math.max(0, r); this._custRevenue(p, r);
        revenue += r;
        this.stats.deliveredByType[p.type]++;
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.emit('deliver', { parcel: p, reward: r });
        if (!R.traitPerCall) this._fireTrait(p);
        done.push(p);
      }
      if (R.traitPerCall) this._fireTraitsPerCall(done, false);
      if (R.repPerParcel) { const d = this.callRep(done, true); if (d) this.addRep(d, MSG('why.repEarly')); }   // 직배: ⚡ 긴급은 여기서도 긴급으로 친다
      revenue = Math.round(revenue * R.revenueMult);
      this.cash += revenue;
      const ok = chosen.length - broken;
      this.monthStats.revenue += revenue; this.monthStats.delivered += ok;
      this.run.revenue += revenue; this.run.delivered += ok;
      if (this.isRushTurn()) this.stats.holidayRushDelivered = (this.stats.holidayRushDelivered || 0) + ok;
      this.stats.selfCalls++;
      this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      this._assignCold();
      this.emit('call', { contract: null, self: true, count: chosen.length, revenue, cost });
      return { ok: true, revenue, cost, count: chosen.length, broken, ids: chosen.map(p => p.id) };
    }
    _updateTrustStats() {
      const seen = new Set(this.contracts.filter(Boolean).map(c => c.carrier));
      const l2 = [...seen].filter(k => this.trustLevel(k) >= 2).length, l3 = [...seen].filter(k => this.trustLevel(k) >= 3).length;
      this.stats.maxTrustL2Simul = Math.max(this.stats.maxTrustL2Simul, l2); this.stats.maxTrustL3Simul = Math.max(this.stats.maxTrustL3Simul, l3);
      if (this.contracts.some(c => c && c.grade === 'master')) this.stats.masterOwned = true;
    }

    _discardParcel(p, why, pen0, evt) {
      const R = this.rules, i = this.parcels.indexOf(p); if (i < 0) return;
      this.parcels.splice(i, 1);
      this.monthStats.discarded++; this.run.discarded++; this.stats.discarded++;
      let pen = pen0, insured = false;
      if (R.insurance && !this.insuranceUsed) { this.insuranceUsed = true; pen = 0; insured = true; why = MSG('why.insured', { why }); }
      if (pen) { this.addRep(-pen, why); this.monthStats.penalty += pen; }
      this.say('log.discard', { short: D.PARCEL_TYPES[p.type].short, size: p.size, why, pen: pen ? ` +${pen}` : '' });
      this.emit(evt || 'discard', { parcel: p, why });
      if (!insured) this._claim(p, why, evt === 'broken' ? 'broken' : 'discard');
      if (evt === 'broken') { const cc = this.customers && this.customers[p.customer]; if (cc) cc.streak = 0; }
    }
    // 야외 적재 도난 판정 — 영업일 끝과 주말에 각각 한 번씩 돈다. 늘어난 스트레스를 돌려준다
    _theftRoll(reasons) {
      const R = this.rules, tp = this.theftProb();
      let pen = 0;
      if (tp <= 0) return 0;
      let took = 0;   // 난투: 하루 도난 상한(theftMaxDay) — 공격으로 칸이 줄어든 날 야외가 통째로 털려 창고가 비던 것 (유저: "창고를 아예 비워버리네, 손맛을 날린다")
      for (const p of this.outdoorParcels()) {
        if (R.theftMaxDay && took >= R.theftMaxDay) break;
        if (this.rng.next() >= tp) continue;
        took++;
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.monthStats.stolen++; this.stats.stolen++;
        if (R.insurance && !this.insuranceUsed) { this.insuranceUsed = true; reasons.push(MSG('r.stolenInsured')); this.emit('stolen', { parcel: p }); }
        else { pen += 2; reasons.push(MSG('r.stolen', { short: D.PARCEL_TYPES[p.type].short, size: p.size })); this.emit('stolen', { parcel: p }); this._claim(p, MSG('why.stolen'), 'stolen'); }
      }
      // 야외 보관 물품 도난: 배상 ×2
      for (const s of this.storage.slice()) {
        if (!s.outdoor || this.rng.next() >= tp) continue;
        this.storage.splice(this.storage.indexOf(s), 1);
        const full = Math.round((s.fee || s.perTurn * s.turns) * 2), covered = Math.round(full * this.coverRate('stolen', { attrs: [] })), amount = full - covered;
        if (covered) this.monthStats.insClaims++;
        this.cash -= amount; this.monthStats.claims += amount; this.stats.claims += amount; pen += 2; reasons.push(MSG('r.storageStolen', { amount }));
        this._custXp(s.customer, -3, MSG('why.storageStolen')); this.emit('storageStolen', { storage: s, amount });
      }
      return pen;
    }

    _endTurn(waited, freezeFresh) {
      if (this.freshFreezeUntil >= this.totalTurn) freezeFresh = true;   // 🧊 얼음: 신선 부패 정지
      const R = this.rules;
      this.weekendBonus = null; // 야근 보너스는 주말 다음 영업일 한 번만
      this.waitedLastTurn = waited;
      const usageBefore = this.usage();
      let pen = 0; const reasons = [];
      const discard = [], returned = [];
      // 난투: 트레잇 택배는 그날 안 보내면 사라진다(벌점 없음) — 유저: "트레잇 붙은 물품은 무조건 그날 배송 안 하면 사라지는 게 낫다"
      if (R.traitSameDay) { const gone = this.parcels.filter(p => p.trait && !p.pushed && !(R.famRules && p.customs > 0)); if (gone.length) { this.parcels = this.parcels.filter(p => !gone.includes(p)); this.say('log.traitGone', { n: gone.length }); this.emit('traitGone', { n: gone.length, ids: gone.map(p => p.id) }); } }
      const heat = this.isHeatTurn(), wx = this.weatherNow(), snow = wx === 'snow', wet = (wx === 'rain' || wx === 'storm') && !R.tent;
      for (const p of this.parcels) {
        p.age++;
        if (p.trait && (p.inCold || p.inFrozen) && this.ownsFam('frozen')) { const F = M.MULTI.FAM_RULES.frozen; p.aged = Math.min(F.ageMax, (p.aged || 0) + F.agePerDay); }   // 🧊 숙성
        const isCold = this._attrs(p).includes('cold'), isFrozen = this._attrs(p).includes('frozen');
        if (p.outdoor && wet && !isCold && !isFrozen && !p.wet) { p.wet = true; reasons.push(MSG('r.wet', { short: D.PARCEL_TYPES[p.type].short, size: p.size })); }
        if (p.customs > 0 && p.outdoor) p.outdoorDuringCustoms = true;
        // 🌾 농산물: 폭염이면 창고 안이라도 상한다 (냉장 구역·환기 시설이면 무사). 야외면 즉시 폐기
        if (this._attrs(p).includes('produce') && heat && !p.inCold) { if (p.outdoor) { discard.push([p, MSG('why.heatSpoil')]); continue; } if (!this.warehouse.vent && !p.overdue && !p.noDeadline) { p.deadline -= 2; reasons.push(MSG('r.heatProduce', { short: D.PARCEL_TYPES[p.type].short, size: p.size })); } }
        if (p.outdoor && snow) { if (isFrozen) continue; if (isCold) { p.warm = 0; if (!p.overdue) continue; } }
        // 통관 대기: 기한은 통관 뒤 시작
        if (p.customs > 0) { if (isCold && !p.inCold) p.coldDuringCustoms = false; p.customs--; if (!p.customs) p.clearDay = this.totalTurn + 1; continue; }
        // 신선: 냉장 구역 밖이면 폭염 즉시 / warmLimit턴 뒤 폐기. 안이면 기한만 진행(냉동고 퍽·냉장 L3는 기한 정지)
        if (isCold && !p.inCold && !R.freshNoSpoil) { p.warm = (p.warm || 0) + 1; if (heat || p.warm >= R.warmLimit) { discard.push([p, MSG(heat ? 'why.heatSpoil' : 'why.warmSpoil')]); continue; } }
        else if (isCold) p.warm = 0;
        if (isFrozen && !p.inFrozen) { discard.push([p, MSG('why.outsideFrozen')]); continue; }
        const freeze = (isCold && (freezeFresh || snow || (p.inCold && R.freezer && p.age <= R.freezer))) || (R.multi && this.freshFreezeUntil >= this.totalTurn)   // 난투 🧊 얼음: 모든 기한 정지(신선만 멈추면 너무 약하다 — 유저)
        const grace = this.returnGraceFor(p);
        // 무기한(첫 사이클)은 기한도 안 줄고 초과도 반송도 없다 — else 로 새면 바로 반송 처리로 빠진다
        if (p.noDeadline) continue;
        if (!p.overdue) { if (!freeze) p.deadline--; if (p.deadline <= 0) { p.overdue = true; p.overdueTurns = 0; if (!p.rush) pen += R.overdueStress; if (R.overdueStress && !p.rush) reasons.push(MSG('r.overdue', { short: D.PARCEL_TYPES[p.type].short })); this.monthStats.overdue++; } }
        else { p.overdueTurns = (p.overdueTurns || 0) + 1; if (p.overdueTurns >= grace) returned.push(p); else if (R.overdueTurnStress && !p.rush) { pen += R.overdueTurnStress; reasons.push(MSG('r.overdueCont', { short: D.PARCEL_TYPES[p.type].short })); } }
      }
      for (const [p, why] of discard) { this._discardParcel(p, why, 2, 'discard'); reasons.push(MSG('r.discard', { why, short: D.PARCEL_TYPES[p.type].short })); }
      for (const p of returned) {
        this.parcels.splice(this.parcels.indexOf(p), 1);
        this.monthStats.returned++; this.stats.returned++;
        if (R.insurance && !this.insuranceUsed) { this.insuranceUsed = true; reasons.push(MSG('r.returnedInsured')); this.emit('returned', { parcel: p }); }
        else { const ns = M.INSURERS[this.insurer].noReturnStress, adPen = this.adTicketMode() && (p.ad || this.campaignStack() > 0) ? D.AD_RETURN_PEN : 0; const rp = (ns ? 0 : 2) + adPen; pen += rp;   // 캠페인 물량·캠페인 중 반송은 벌점이 더 크다
          reasons.push(MSG('r.returned', { short: D.PARCEL_TYPES[p.type].short, pen: rp ? ` +${rp}` : '' })); this.emit('returned', { parcel: p }); this._claim(p, MSG('why.returned'), 'returned'); }
      }
      this._assignCold();
      pen += this._theftRoll(reasons);
      this._tickStorage(reasons);
      this.outdoorPref = this.outdoorPref.filter(id => typeof id === 'string' ? this.storage.some(s => 's' + s.id === id) : this.parcels.some(p => p.id === id));
      this._assignCold();
      const over = this.outdoorVolume();
      if (over > 0) { this.stats.overflowTurns++; this.stats.maxOverflowTurns = Math.max(this.stats.maxOverflowTurns, this.stats.overflowTurns); } else this.stats.overflowTurns = 0;
      const effOver = over > R.overflowGrace ? over : 0;
      if (effOver >= 3) { let p2 = 2; pen += p2; reasons.push(MSG('r.overflow', { over, pen: p2 })); }
      else if (effOver >= 1) { pen += 1; reasons.push(MSG('r.overflow', { over, pen: 1 })); }
      else if (over > 0) reasons.push(MSG('r.overflowGrace', { over }));
      if (usageBefore >= 1 && pen === 0) this.stats.fullNoPenalty = true;
      if (pen > 0) {
        this.addRep(-pen, MSG('why.repPenalty')); this.monthStats.penalty += pen;
        this.say('log.penalty', { pen, reasons, rep: this.rep });
        this.emit('penalty', { amount: pen, reasons });
      } else if (reasons.length) this.say(reasons.join(', '));
      if (this.rep <= 0 && !this.rules.noRepEnd) return this._gameOver(MSG('over.rep'));
      if (!this.rules.noWeekend && this.isWeekendAfter(this.turn)) return this._startWeekend();   // 멀티: 일요일은 카드 없이 그냥 지나간다
      if (this.turn >= this.turns()) return this._endMonth();
      this._startTurn();
    }

    // ----- 주말 -----
    // 턴이 아니다: 입고·호출·기한 진행 없음(기한은 영업일 기준). 마당에 둔 건 이틀 더 밖에 있으니 도난만 한 번 더 돈다
    _startWeekend() {
      this.phase = 'weekend';
      this.weekend = { after: this.turn, week: this.weekOf(this.turn), date: this.dateOf(this.turn) + 1, outdoor: this.outdoorVolume(), last: this.turn >= this.turns() };
      this.emit('weekendStart', { weekend: this.weekend });
      return true;
    }
    weekendChoices() {
      return D.WEEKEND_CHOICES.filter(c => this.shows('weekendChoice') || c.id === 'rest').map(c => {
        const cost = c.cost ? Math.round(c.cost * this.rules.itemPriceMult * this.inflation()) : 0;
        return { id: c.id, cost, stress: c.stress || 0, self: c.self || 0,
          ok: (!cost || this.cash >= cost) && (!c.needOutdoor || this.outdoorVolume() > 0) };
      });
    }
    weekendChoose(id) {
      if (this.phase !== 'weekend') return { ok: false, msg: T('err.cannotCallNow') };
      const def = D.WEEKEND_CHOICES.find(c => c.id === id);
      if (!def) return { ok: false, msg: T('err.cannotCallNow') };
      const opt = this.weekendChoices().find(c => c.id === id);
      if (!opt.ok) return { ok: false, msg: T(opt.cost && this.cash < opt.cost ? 'err.noCash' : 'err.noOutdoor') };
      const week = this.weekend.week, last = this.weekend.last;
      if (opt.cost) { this.cash -= opt.cost; this.monthStats.spent += opt.cost; this.run.spent += opt.cost; }
      if (def.stress) this.addRep(-def.stress, T('wk.' + id));
      if (def.self) this.weekendBonus = { self: def.self };
      const reasons = [];
      const pen = def.noTheft ? 0 : this._theftRoll(reasons);
      if (pen > 0) { this.addRep(-pen, MSG('why.repPenalty')); this.monthStats.penalty += pen; }
      this._assignCold();
      this.say('log.weekend', { w: week, choice: T('wk.' + id + '.done'), extra: reasons.length ? ' — ' + reasons.join(', ') : '' });
      this.emit('weekendEnd', { choice: id, pen });
      this.weekend = null;
      this.phase = 'play';
      if (this.rep <= 0 && !this.rules.noRepEnd) return this._gameOver(MSG('over.rep'));
      if (last) { this._endMonth(); return { ok: true, pen }; }   // 넷째 일요일 다음은 월말 정산
      this._startTurn();
      return { ok: true, pen };
    }

    _endMonth() {
      const R = this.rules, ms = this.monthStats;
      const overdueVol = this.parcels.filter(p => p.overdue).reduce((s, p) => s + p.size, 0);
      const unproc = 0; // v0.3.5: 월말 미처리 페널티는 반송이 대신한다
      const opCost = this._opCost(this.month);
      this.cash -= opCost; ms.spent += opCost; this.run.spent += opCost;
      const feesDue = this.feesDue; this.cash -= feesDue; this.feesDue = 0; // 후불 배차비·배송비 정산
      const premium = this._settlePremium();
      // 어음 만기: 이번 정산까지 만기가 온 어음은 현금으로 (옛 세이브의 turn 어음은 이번 정산에)
      let notesPaid = 0, notesCount = 0;
      if (this.pendingRevenue && this.pendingRevenue.length) {
        const due = this.pendingRevenue.filter(x => (x.due != null ? x.due : this.month) <= this.month); this.pendingRevenue = this.pendingRevenue.filter(x => !due.includes(x));
        for (const x of due) { this.cash += x.amount; ms.revenue += x.amount; this.run.revenue += x.amount; notesPaid += x.amount; notesCount++; this.say('log.paid', { name: x.name, amount: x.amount, count: x.count }); this.emit('paid', x); }
        this.stats.maxCash = Math.max(this.stats.maxCash, this.cash);
      }
      let closing = 0;
      if (R.closingBonus && this.usage() <= R.closingBonus.usage) { closing = R.closingBonus.amount; this.cash += closing; }
            if (R.erosion) { const cands = this.contracts.filter(c => c && this.startContractIds.includes(c.id) && c.maxCalls > 1); if (cands.length) { const c = this.rng.pick(cands); c.maxCalls--; c.calls = Math.min(c.calls, c.maxCalls); this.say('log.erosion', { name: this.contractName(c) }); } }
      (this.revHist || (this.revHist = [])).push(ms.revenue);
      const deals = this.bizMode() ? this._settleDeals() : [];
      // 평판: 사고 없이 넘긴 정산은 소문이 좋아지고, 상한까지 채운 채로 넘기면 등급이 오른다
      let repClean = 0, repTierUp = null, repPerks = null;
      if (ms.penalty === 0) repClean = this.addRep(D.REP_GAIN.cleanMonth + (R.cleanRepBonus || 0), MSG('why.repClean'));   // 멀티 퍽 🧹: 깨끗한 정산 +2
      if (!R.repStep && this.rep >= this.repCap() && this.repTier < D.REP_TIERS.length - 1) {
        this.repTier++; repTierUp = this.repTierId();
        this.say('log.repTierUp', { name: this.repTierName(), cap: this.repCap() });
        const opened = this.customersAtTier(this.repTier).filter(k => !this.customers[k]);
        if (opened.length) this.say('log.repCustomers', { list: opened.map(k => M.CUSTOMERS[k].icon + M.CUSTOMERS[k].name).join(', ') });
        this.emit('repTier', { tier: repTierUp, cap: this.repCap(), customers: opened });
        // 정산표에 '무엇이 열렸는지' 그대로 — 물량·운영비 변화, 새 고객, 새 품목
        const prev = D.REP_TIERS[this.repTier - 1], cur = D.REP_TIERS[this.repTier];
        repPerks = { arr: Math.round((cur.arrivals / prev.arrivals - 1) * 100), op: Math.round((cur.opCost / prev.opCost - 1) * 100), customers: opened, goods: (cur.unlock || []).slice() };
      }
      // 통계
      this.stats.monthsDone = this.month;
      this.stats.maxMonthDelivered = Math.max(this.stats.maxMonthDelivered, ms.delivered);
      if (ms.penalty === 0) this.stats.perfectMonths++;
      if (this.usage() <= 0.4) this.stats.tidyMonths++;
      if (this.contracts.filter(Boolean).length >= 4 && this.contracts.every(c => c && c.calls === 0)) this.stats.zeroCallsMonthEnd = true;
      if (this.cash >= 0 && this.cash <= 100) this.stats.brokeMonthEnd = true;
      this.summary = { month: this.month, revenue: ms.revenue, opCost, opCostDetail: this._lastOpCost, calls: ms.calls, waits: ms.waits,
        delivered: ms.delivered, penalty: ms.penalty, unprocPenalty: unproc, overdueVol, discarded: ms.discarded, returned: ms.returned, stolen: ms.stolen, broken: ms.broken, claims: ms.claims, covered: ms.covered, selfCost: ms.selfCost || 0, fees: ms.fees || 0, premium, insClaims: ms.insClaims, nextPremium: this.premium(), noClaimBonus: !!ms.noClaimBonus, storageIncome: ms.storageIncome, closing, notesPaid, notesCount, notesLeft: (this.pendingRevenue || []).reduce((a, x) => a + x.amount, 0), customers: this.customerSummary(),
        cash: this.cash, cashStart: ms.cashStart != null ? ms.cashStart : this.cash, net: this.cash - (ms.cashStart != null ? ms.cashStart : this.cash),
        rep: this.rep, repCap: this.repCap(), repTier: this.repTierId(), repClean, repTierUp, repPerks, repDelta: this.rep - (ms.repStart != null ? ms.repStart : this.rep), usage: Math.round(this.usage() * 100), left: this.parcels.length, deals };
      // 단기 금융: 지난달 차입 상환(원금+이자) → 그래도 음수면 새로 차입해 0으로 맞춤
      const loan = { interest: 0, repaid: 0, borrowed: 0, debt: 0 };
      if (R.noLoan) { /* 멀티: 차입 없음 — 마이너스는 마이너스대로 (호출을 못 해 물량으로 죽는다) */ }
      else if (this.debt > 0) { loan.interest = Math.ceil(this.debt * D.LOAN.interest); loan.repaid = this.debt; this.cash -= this.debt + loan.interest; this.run.spent += loan.interest; this.stats.interestPaid += loan.interest; this.debt = 0; }
      if (!R.noLoan && this.cash < 0) { loan.borrowed = -this.cash; this.debt = loan.borrowed; this.cash = 0; this.stats.loans++; }
      loan.debt = this.debt; this.summary.loan = loan; this.summary.cash = this.cash;
      this.say('log.settle', { cal: this.calMonth(), half: this.half(), revenue: ms.revenue, opCost, fees: feesDue, closing: closing ? MSG('log.settleClosing', { closing }) : '' });
      if (loan.repaid) this.say('log.loanRepaid', { n: loan.repaid, interest: loan.interest });
      if (loan.borrowed) this.say('log.loan', { n: loan.borrowed, interest: Math.ceil(loan.borrowed * D.LOAN.interest) });
      // 레벨 1은 실패가 없다 — 배우는 자리에서 부도로 끊지 않는다 (levels.js noBankrupt)
      if (!this.rules.noBankrupt && this.debt > D.LOAN.limit) return this._gameOver(MSG('over.bankrupt', { debt: this.debt, limit: D.LOAN.limit }));
      this.phase = 'summary';
      // 멀티: 정산은 자동 — 팝업 없이 로그 한 줄(위 log.settle)과 이벤트 하나. 곧장 다음 사이클로
      if (R.autoSummary) { this.emit('settle', { month: this.month, net: this.summary.net, cash: this.cash, opCost, last: this.month >= R.months }); this.closeSummary(); }
    }
    closeSummary() {
      if (this.phase !== 'summary') return false;
      if (!this.shows('market') || this.rules.noCycleMarket) {                 // 멀티: 사이클 끝 마켓 없음 — 장은 아무 날에나 하루 써서 간다(openShop)                                   // 마켓이 열리기 전(서장)엔 정산 다음이 바로 다음 사이클
        if (this.month >= this.rules.months) return this._finish();
        this._startMonth(this.month + 1); return true;
      }
      // 캠페인은 한 장이 한 사이클이라, 마지막 사이클에도 마켓을 연다 — 여기서 안 열면
      // **배차를 다 쓴 직후에 충전한다**는 연결이 통째로 사라진다 (그게 마켓의 첫 수업이다).
      // 마켓을 닫을 때 장이 끝난다. 자유 런은 그대로 — 마지막 정산이 곧 결과다.
      if (this.month >= this.rules.months && !this.level) return this._finish();
      // 마지막 장의 마지막 정산 뒤엔 살 게 없다 — 곧장 끝낸다 (다음 장이 없으니 마켓은 헛걸음)
      if (this.level && this.month >= this.rules.months && LV && this.level.n >= LV.IMPLEMENTED) return this._finish();
      this._openMarket();
      return true;
    }
    _finish() { return this._win(); }
    // rules.months 는 사이클 수다. 사람에게 보일 '개월'은 여기로 환산한다
    runMonths() { return Math.ceil(this.rules.months / D.CYCLES_PER_MONTH); }
    _gameOver(reason) {
      this.phase = 'over';
      this.result = this._makeResult(false, reason);
      this.say('log.gameOver', { reason });
    }
    _win() {
      this.phase = 'win';
      this.result = this._makeResult(true, MSG(this.cfg.scripted ? 'over.winStory' : 'over.win', { months: this.runMonths(), cycles: this.rules.months }));
      this.say(this.result.reason);
      return true;
    }
    _makeResult(win, reason, monthsDoneArg) {
      const monthsDone = monthsDoneArg != null ? monthsDoneArg : win ? this.rules.months : this.month - 1;
      this.stats.monthsDone = monthsDone;
      this.stats.distinctCarriersAtEnd = new Set(this.contracts.filter(Boolean).map(c => c.carrier)).size;
      const score = Math.round(Math.max(0, this.run.revenue + Math.max(0, this.cash) + monthsDone * 200 + this.rep * 20) * this.rules.scoreMult);
      // 장 리포트(박 반장)가 쓰는 숫자 — 처리·정시·반송·파손
      const sum = o => Object.keys(o).reduce((a, k) => a + o[k], 0);
      const onTimeCount = sum(this.stats.onTimeByType), deliveredCount = sum(this.stats.deliveredByType);
      return { win, demo: false, story: !!this.cfg.scripted, level: this.cfg.level || 0, carry: (this.cfg.level || (this.scenario && this.scenario.chainNext)) ? this.carryState() : null, reason, score, month: this.month, turn: this.turn, monthsDone, cash: this.cash, rep: this.rep, repTier: this.repTierId(), seed: this.seed,
        onTimeCount, deliveredCount, returned: this.stats.returned || 0, broken: this.stats.broken || 0,
        scenario: this.cfg.scenario, company: this.cfg.company, perks: this.perks.slice(), ...this.run };
    }

    // ----- market -----
    _openMarket() {
      this.phase = 'market';
      // 멀티: 사이클 끝 마켓도 「장」이다 — 업그레이드·강화·창고·광고만 (새 계약·배차·매물 새로고침 없음)
      if (this.rules.multi) { this.market = { items: this._shopItems(), bought: 0, refreshes: 0, month: this.month, shop: true, freeRefresh: 0 }; return; }
      this.market = { items: this._genMarketItems(this.month + 1), bought: 0, refreshes: 0, month: this.month, freeRefresh: this.rules.freeRefresh };
      this.say('log.marketOpen', { cal: this.calMonth(), half: this.half(), max: this.rules.marketMaxBuy });
    }
    _carrierWeights() {
      const R = this.rules, w = {};
      for (const k of Object.keys(D.FAMILIES)) { if (this.isBanned(k) || !this._familyOpen(k)) continue; w[k] = R.marketWeight[k] || 1; }
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
    // 예상 물량 중 지금 계약(과 직접 배송)으로 못 받는 종류. 마켓에서 "이건 실을 차가 없다"를 미리 말해 주려고
    // 이 종류를 지금 계약(또는 직접 배송)으로 받을 수 있나 — 크기 후보 중 하나라도 되면 된다
    // 계약을 바꾸면 처리 못 하게 되는 것 — 창고에 있는 택배와 앞으로 오는 종류. 마켓에서 교체 전에 경고한다
    replaceLoss(slot, carrier, grade) {
      const old = this.contracts[slot];
      // 직접 배송은 보름에 한두 번뿐이라 '처리 가능'으로 치지 않는다 — 계약 차로 안전하게 실을 수 있느냐만 본다
      const safe = p => this.contracts.some(c => c && this.canHandle(c, p) && this.breakProb(c, p) === 0);
      const byType = t => (D.PARCEL_TYPES[t].sizes || [1, 2]).some(sz => safe({ type: t, size: sz, customs: 0 }));
      const ratio = this._typeRatio(this.month + 1) || {};
      const types = Object.keys(D.PARCEL_TYPES).filter(t => (ratio[t] || 0) > 0 || this.parcels.some(p => p.type === t) || this.activeDeals().some(d => Object.keys((M.CUSTOMERS[d.customer] || {}).items || {}).some(k => (M.CUSTOMER_ITEMS[k] ? M.CUSTOMER_ITEMS[k].type : k) === t)));
      const before = { parcels: this.parcels.filter(safe).map(p => p.id), types: types.filter(byType) };
      this.contracts[slot] = { id: -1, carrier: this.resolveCenter(carrier, grade), grade: grade || 'normal', maxCalls: 1, calls: 1, enh: { limit: 0, cap: 0, regular: false, express: false, opt: null, capDelta: 0 } };
      let parcels, lostTypes;
      try { parcels = this.parcels.filter(p => before.parcels.includes(p.id) && !safe(p)); lostTypes = before.types.filter(t => !byType(t)); }
      finally { this.contracts[slot] = old; }
      return { parcels, types: lostTypes, any: parcels.length > 0 || lostTypes.length > 0 };
    }
    canTakeType(t) {
      const T = D.PARCEL_TYPES[t]; if (!T) return true;
      const covers = this.contracts.filter(Boolean);
      return (T.sizes || [1, 2]).some(sz => { const p = { type: t, size: sz, customs: 0 }; return covers.some(c => this.canHandle(c, p) && this.breakProb(c, p) === 0) || (this.selfCan(p) && !this.selfBreakProb(p)); });
    }
    // 다음 사이클 예상 중 못 받는 종류. **화면에 뜬 예상 그대로** 판정한다 —
    // 보이는 줄과 붉은 줄이 어긋나면 플레이어는 어느 쪽도 믿지 않는다
    // 다음 사이클 예상 물량(칸) 대 남은 배차로 실을 수 있는 칸. 모자라면 마켓이 재계약(충전)을 짚는다
    callShortfall(m) {
      let vol = this.usedVolume ? this.usedVolume() : 0;
      for (const f of this.customerForecast(m)) for (const t in f.range) {
        const r = f.range[t]; if (!(r[1] > 0) || (t !== 'normal' && !(f.special > 0))) continue;
        const sz = D.PARCEL_TYPES[t].sizes; vol += (r[0] + r[1]) / 2 * sz.reduce((a, b) => a + b, 0) / sz.length;
      }
      vol = Math.round(vol);
      const cap = this.contracts.filter(Boolean).reduce((s, c) => s + Math.max(0, c.calls) * this.vehicleCap(c), 0);
      return { vol, cap, short: Math.max(0, vol - cap) };
    }
    forecastBlocked(m) {
      m = m || this.month + (this.phase === 'market' && !(this.market && this.market.prep) ? 1 : 0);
      const out = [];
      for (const f of this.customerForecast(m)) for (const t of Object.keys(f.range))
        if (!out.includes(t) && f.range[t][1] > 0 && !this.canTakeType(t)) out.push(t);
      return out;
    }
    // 평판: 지금 등급이 시작된 지점(이전 등급의 상한)과 다음 등급까지 남은 양
    repFloor() { if (this.rules.repStep) return this.repTier > 0 ? (this.repFloorV != null ? this.repFloorV : this.repCap() - this.rules.repStep) : 0; return this.repTier > 0 ? D.REP_TIERS[this.repTier - 1].cap : 0; }
    repToNext() { return this.repTier >= this.repMaxTier() ? 0 : Math.max(0, this.repCap() - this.rep); }
    // 계약마다 '가득 충전' 상시 카드 (배차는 소모품 — 정액이라 다 쓰고 충전하는 게 이득)
    _refillItems() {
      const items = [];
      for (const c of this.contracts) if (c && c.calls < c.maxCalls) items.push({ kind: 'refill', contractId: c.id, carrier: c.carrier, standing: true, sold: false, price: this.refillPrice(c), name: T('market.refillName', { name: this.contractName(c) }) });
      return items;
    }
    // 대본 마켓: 무엇이 나올지까지 고정한다 — 배차를 늘리는 세 가지(충전·한도 강화·상위 센터)를 한 화면에서 보여 주기 위해
    _scriptedMarketItems(spec) {
      const R = this.rules, m = this.month, mult = D.PRICE_MULT[Math.min(12, this.tableMonth(m))] * R.itemPriceMult * R.priceMult;
      const items = [];
      // 대본이어도 '처리할 방법이 없는 택배'가 있으면 그 해결책은 반드시 판다 — 반송 말고는 길이 없는 상황을 만들지 않는다
      const extra = (spec.contracts || []).slice();
      for (const bt of this.blockedTypes()) {
        const pp = { type: bt.type, size: bt.maxSize, customs: 0 };
        const fam = this.familiesFor(pp)[0];
        const key = fam && D.centerFor(fam, 0);
        if (key && !extra.includes(key) && !this.contracts.some(c => c && c.carrier === key)) extra.unshift(key);
        break;
      }
      for (const carrier of extra) {
        const car = D.CARRIERS[carrier];
        if (!car || this.contracts.some(c => c && c.carrier === carrier)) continue;
        const own = this.contracts.find(c => c && FAM(c.carrier) === car.family);
        if (own && D.CARRIERS[own.carrier].tier >= car.tier) continue;   // 이미 같거나 더 위면 안 내놓는다
        const need = this.blockedTypes().find(bt => this.familiesFor({ type: bt.type, size: bt.maxSize, customs: 0 }).includes(car.family));
        items.push({ kind: 'contract', carrier, grade: car.grade, price: Math.round(car.price * R.priceMult), name: car.name, sold: false,
          hint: need ? T('market.hint', { short: D.PARCEL_TYPES[need.type].short, count: need.count }) : own ? T('market.switchHint', { name: D.CARRIERS[own.carrier].name }) : null, switchFrom: own ? own.id : null });
      }
      items.push(...this._refillItems());
      items.push(...this._adAndGrowthItems(mult));   // 캠페인 장에서도 투자가 열렸으면 광고·성장은 마켓에서 산다
      for (const e of spec.enh || []) if (D.ENHANCEMENTS[e]) items.push({ kind: 'enh', enh: e, price: Math.round(D.ENHANCEMENTS[e].price * mult), name: D.ENHANCEMENTS[e].name, sold: false });
      for (const f of spec.fac || []) {
        const F = D.FACILITIES[f]; if (!F || this.warehouse[f]) continue;
        if (F.requires && !this.warehouse[F.requires]) continue;
        items.push({ kind: 'fac', fac: f, standing: true, price: Math.round(F.price * mult * R.facilityPriceMult), name: F.name, sold: false });
      }
      for (const k of spec.item || []) if (M.INS_ITEMS[k]) items.push({ kind: 'item', item: k, price: Math.round(M.INS_ITEMS[k].price * mult), name: M.INS_ITEMS[k].name, sold: false });
      for (const k of spec.customer || []) if (M.CUSTOMERS[k] && !this.customers[k]) items.push({ kind: 'customer', customer: k, price: Math.round(150 * mult), name: T('market.newCustomer', { name: M.CUSTOMERS[k].name }), sold: false });
      return items;
    }
    // 아직 안 연 기능을 푸는 물건은 마켓에도 안 나온다.
    // (입고 쪽은 _typeRatio 가 막는다 — 오지도 않는 🧊 냉동을 위해 냉동고를 파는 것은 돈만 태우는 함정이다)
    // 이 계열 계약이 이 장에 나올 수 있는가. **매물을 거르기 전에 가중치에서 빼야 한다** —
    // 거르기만 하면 '막힌 품목 보장'이 철도·항공 같은 닫힌 계열을 골라 놓고, 그게 걸러져 해결책이 사라진다.
    // 무역 고객: 🛃 통관 짐을 맡기는 화주(수입상·명품관)가 하나라도 있는가 — 포워더(항공·철도·해상)는 이들이 있어야 찾아온다
    hasTradeCustomer() {
      return Object.keys(this.customers || {}).some(id => { const cu = M.CUSTOMERS[id]; if (!cu || !cu.items) return false; return Object.keys(cu.items).some(k => (M.CUSTOMER_ITEMS[k] ? M.CUSTOMER_ITEMS[k].type : k) === 'intl'); });
    }
    _familyOpen(fam) {
      if (D.FAMILIES[fam] && D.FAMILIES[fam].needsTrade && !this.hasTradeCustomer()) return false;
      if (!this._shows) return true;
      const g = { cold: 'cold', frozen: 'frozen', fragile: 'attrs', intl: 'customs', large: 'bigsize', air: 'bigsize', rail: 'bigsize', sea: 'bigsize' }[fam];
      return !g || this.shows(g);
    }
    _marketAllowed(it) {
      if (!this._shows) return true;
      const facGate = { cold1: 'cold', cold2: 'cold', coldvan: 'cold', freezer1: 'frozen', vent: 'cold', padvan: 'attrs', bigvan: 'bigsize', yard: 'theft', driver: 'self' };
      const attrGate = { fragile: 'attrs', cold: 'cold', customs: 'customs', frozen: 'frozen' };
      if (it.kind === 'fac') { const g = facGate[it.fac]; return !g || this.shows(g); }
      if (it.kind === 'item') return this.shows('insurance');
      if (it.kind === 'customer') return this.shows('customers');
      if (it.kind === 'contract') return this._familyOpen(FAM(it.carrier));
      if (it.kind === 'enh') { const e = D.ENHANCEMENTS[it.enh]; if (!e) return true;
        if (e.kind === 'opt') { const g = attrGate[e.attr]; return !g || this.shows(g); }
        if (e.kind === 'trust') return this.shows('trust');
        return true; }
      return true;
    }
    // fm: 이 마켓 뒤에 올 사이클 (예보를 읽을 달). 새로고침은 비워 두면 forecastBlocked 가 market 상태로 고른다
    // 광고 매체(새 계약 1 · 강화 1)와 성장 투자(D.GROWTH_OFFERS 개). 투자가 열린 판에서만
    _adAndGrowthItems(mult) {
      const out = []; if (!this.shows('invest') || !this.campaignOpen()) return out;
      if (this.adTicketMode()) {
        // 1회성 캠페인권 두 장(서로 다른 매체). 값에 집행비가 들어 있다
        for (const id of this.rng.shuffle(Object.keys(D.AD_MEDIA)).slice(0, 2)) out.push({ kind: 'adTicket', media: id, price: Math.round(D.AD_MEDIA[id].cost * D.AD_TICKET_MULT * mult), name: T('media.ticket', { name: T('media.' + id) }), sold: false });
        const kinds = ['fleet', 'automation', 'branding'].filter(k => { const pl = this.growthPlan(k); return pl && pl.cost != null && !pl.locked; });
        for (const k of this.rng.shuffle(kinds).slice(0, D.GROWTH_OFFERS)) { const pl = this.growthPlan(k); out.push({ kind: 'growth', growth: k, price: pl.cost, name: T('growth.' + k) + ' Lv.' + (pl.level + 1), sold: false }); }
        return out;
      }
      const fresh = Object.keys(D.AD_MEDIA).filter(id => !((this.media || {})[id] > 0));
      if (fresh.length) { const id = this.rng.pick(fresh); out.push({ kind: 'media', media: id, price: Math.round(D.AD_MEDIA[id].price * mult), name: T('media.' + id), sold: false }); }
      const up = this.ownedMedia().filter(id => this.media[id] < D.AD_MEDIA[id].max).sort((a, b) => this.media[a] - this.media[b]);
      if (up.length) { const id = up[0], lv = this.media[id]; out.push({ kind: 'mediaUp', media: id, price: Math.round(D.AD_MEDIA[id].upPrice * lv * mult), name: T('media.upName', { name: T('media.' + id), lv: lv + 1 }), sold: false }); }
      const kinds = ['fleet', 'automation', 'branding'].filter(k => { const pl = this.growthPlan(k); return pl && pl.cost != null && !pl.locked; });
      for (const k of this.rng.shuffle(kinds).slice(0, D.GROWTH_OFFERS)) { const pl = this.growthPlan(k); out.push({ kind: 'growth', growth: k, price: pl.cost, name: T('growth.' + k) + ' Lv.' + (pl.level + 1), sold: false }); }
      return out;
    }
    _genMarketItems(fm) {
      const R = this.rules, m = this.month, mult = D.PRICE_MULT[Math.min(12, this.tableMonth(m))] * R.itemPriceMult * R.priceMult;
      const sc = this.script(m);
      // 대본이 명시한 매물은 거르지 않는다. 플래그 문은 **무작위 마켓**이 안 열린 기능의 물건을 파는 것을 막는 장치지,
      // 작가가 일부러 놓은 것까지 막으면 안 된다 — '다음 장에 🧊 가 오니 지금 특약을 사 둬라' 같은 자리가 통째로 사라진다.
      if (sc && sc.market) return this._scriptedMarketItems(sc.market);
      const items = [];
      const gp = this._gradeProb(m);
      const weights = this._carrierWeights(); // 계열 가중치
      const tierOf = grade => GRADE_RANK.indexOf(grade);
      const ownedFam = fam => this.contracts.find(c => c && FAM(c.carrier) === fam);
      // 계열 + 등급 → 센터. 이미 그 계열 계약이 있으면 더 높은 tier 센터만 나온다(다른 센터와 신규 계약 = 갈아타기)
      const centerFor = (fam, grade) => { const k = D.centerFor(fam, tierOf(grade)); if (!k) return null; const own = ownedFam(fam); if (own && D.CARRIERS[k].tier <= D.CARRIERS[own.carrier].tier) { const up = D.centersOf(fam).find(x => D.CARRIERS[x].tier === D.CARRIERS[own.carrier].tier + 1 && D.CARRIERS[x].tier <= Math.max(tierOf(grade), 1)); return up || null; } return k; };
      const forced = R.guaranteeCarriers.filter(k => weights[k]).map(k => ({ family: k }));
      // 막힌 속성 보장: 처리할 계약이 없는 특수 택배가 있으면 그것을 처리할 계열을 반드시 배치한다.
      // 창고에 있는 것(blockedTypes)뿐 아니라 **다음 사이클 예보**에서 못 싣는다고 ✗ 로 뜬 종류도 — 준비 마켓은 창고가 비어 있어서
      // 예보만 보고 '대형 0~2 ✗' 를 띄워 놓고 해결책은 안 파는 일이 있었다. 계약 매물 칸 수만큼 서로 다른 종류를 보장한다
      if (R.guaranteeBlocked) {
        const blocked = this.blockedTypes();
        for (const t of this.forecastBlocked(fm)) if (t !== 'normal' && !blocked.some(b => b.type === t)) { const P = D.PARCEL_TYPES[t]; const rng = this.customerForecast(fm || this.month).reduce((a, f) => a + ((f.range[t] || [0, 0])[1]), 0); blocked.push({ type: t, maxSize: Math.max(...P.sizes), count: rng, soon: true }); }
        for (const bt of blocked) {
          if (forced.length >= R.marketContractSlots) break;
          const pp = { type: bt.type, size: bt.maxSize, customs: D.PARCEL_TYPES[bt.type].attrs.includes('customs') ? 1 : 0 };   // 🛃 는 통관 대기로 판정해야 통관 못 하는 계열(대형 등)이 걸러진다
          const safe = fam => { const car = D.CARRIERS[D.centerFor(fam, 0)]; return this._carrierAccepts(car, pp) && (!D.PARCEL_TYPES[bt.type].attrs.includes('fragile') || car.caps.includes('fragile')); };
          if (forced.some(f => safe(f.family))) continue;
          const cand = {}; for (const k of Object.keys(weights)) if (safe(k)) cand[k] = weights[k];
          if (!Object.keys(cand).length) continue;
          forced.push({ family: this.rng.weighted(cand), hint: T(bt.soon ? 'market.hintSoon' : 'market.hint', { short: D.PARCEL_TYPES[bt.type].short, count: bt.count }) });
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
      // 사업이 커졌으면(규모 1+) 제일 많이 쓰는 계약의 **다음 등급 센터**를 한 장 보장한다 — 무작위 두 장에 안 걸려 업그레이드가 안 뜨는 일이 없게
      if (this.bizLevel() >= 1 && !this.level) {
        const main = this.contracts.filter(Boolean).sort((a, b) => (b.delivered || 0) - (a.delivered || 0))
          .find(c => { const nx = D.centersOf(FAM(c.carrier)).find(k => D.CARRIERS[k].tier === D.CARRIERS[c.carrier].tier + 1 && !D.CARRIERS[k].campaign); return nx && !items.some(it => it.carrier === nx); });
        if (main) { const nx = D.centersOf(FAM(main.carrier)).find(k => D.CARRIERS[k].tier === D.CARRIERS[main.carrier].tier + 1 && !D.CARRIERS[k].campaign), car = D.CARRIERS[nx];
          items.push({ kind: 'contract', carrier: nx, grade: car.grade, price: Math.round(car.price * R.priceMult), name: car.name, sold: false, hint: T('market.switchHint', { name: D.CARRIERS[main.carrier].name }), switchFrom: main.id }); }
      }
      // 상시 배차 충전: 배차가 빈 계약마다 '가득 충전' 카드. 정액이라 다 쓰지 않고 충전하면 그만큼 손해
      items.push(...this._refillItems());
      items.push(...this._adAndGrowthItems(mult));
      const enhW = {}; for (const k of Object.keys(D.ENHANCEMENTS)) enhW[k] = R.marketWeight[k] || 1;
      const picked = [];
      // 슬롯이 다 찼는데 못 싣는 품목이 있으면, 계약 말고 **특약**이 답이다 — 그건 반드시 내놓는다.
      // (계약 슬롯은 넷뿐이고 계열은 그보다 많다. 마지막에 가면 늘 이 상황이 온다)
      if (R.guaranteeBlocked && this.contracts.filter(Boolean).length >= D.CONTRACT_SLOTS) {
        const need = new Set(this.blockedTypes().flatMap(bt => D.PARCEL_TYPES[bt.type].attrs));
        for (const k of Object.keys(D.ENHANCEMENTS)) {
          const e = D.ENHANCEMENTS[k];
          if (e.kind !== 'opt' || !need.has(e.attr)) continue;
          if (!this._canFitOpt(k)) continue;              // 붙일 계약이 하나도 없으면 파는 의미가 없다
          picked.push(k); delete enhW[k]; break;
        }
      }
      for (let i = picked.length; i < 2 && Object.keys(enhW).length; i++) { const e = this.rng.weighted(enhW); picked.push(e); delete enhW[e]; }
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
      if (this.bizMode()) items.push(...this._dealOfferItems());
      else if (this.customerCount() < M.CUSTOMER_SLOTS && this.rng.next() < 0.3 + this.repTier * 0.12) { const cands = this.openCustomers(); if (cands.length) { const k = this.rng.pick(cands); items.push({ kind: 'customer', customer: k, price: Math.round(150 * mult), name: T('market.newCustomer', { name: M.CUSTOMERS[k].name }), sold: false }); } }
      if (this.rng.next() < 0.6) { const k = this.rng.pick(Object.keys(M.INS_ITEMS)); items.push({ kind: 'item', item: k, price: Math.round(M.INS_ITEMS[k].price * mult), name: M.INS_ITEMS[k].name, sold: false }); }
      return items.filter(it => this._marketAllowed(it));
    }
    refreshCost() { const mk = this.market; if (mk.refreshes < mk.freeRefresh) return 0; const r = mk.refreshes - mk.freeRefresh; return Math.round(D.REFRESH_COSTS[Math.min(r, D.REFRESH_COSTS.length - 1)] * this.rules.priceMult); }
    refreshMarket() {
      if (this.phase !== 'market') return { ok: false };
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
    // 전에는 30c 정액 '충전'이라 배차비(51c) 한 대 값보다도 쌌다 — 이제 한 대의 총값은 계약 차든 재계약 차든 같다.
    // 값은 '신뢰·강화 없는' 기본 배차비 기준 — 신뢰가 올라 배차비가 싸져도 재계약 값은 그대로다(신뢰·강화를 쌓을 이유를 남긴다)
    baseTruckFee(c) { const R = this.rules, car = D.CARRIERS[c.carrier]; return Math.max(0, (R.feeFixed != null ? R.feeFixed : car.fee) * R.feeMult + R.feeDelta); }
    // 밸런스(부록 AS): 기본 배차비 = 만차 수입의 50%(절반 채우면 본전), 계약 = 대당 만차 수입의 25%.
    // 그래서 강화 없이 만차로 굴려도 비용은 75% — 남는 25%를 신뢰·강화로 키우는 게 성장이다.
    // 재계약은 '가득 충전'이다 — 몇 대가 남았든 값은 같다: 계약 본래 대수 × 기본 배차비 × 절반(= 만차 수입의 25%).
    // 신뢰로 배차비가 싸져도, 한도 강화(+대)를 해도 값은 그대로다.
    refillPrice(c) { return Math.round(Math.max(1, D.CARRIERS[c.carrier].trucks) * (this.rules.callsMult || 1) * this.baseTruckFee(c) * D.PREPAY_RATE); }   // 배차가 늘면(callsMult) 충전값도 — 배차 한 번 값은 그대로
    // 실시간 계약 — 철도·해상처럼 원래 마켓에서만 팔던 계약을, 달이 끝나길 기다리지 않고 지금 웃돈을 얹어 들인다.
    // 아직 안 열린 계열(_familyOpen)은 마켓과 똑같이 안 나온다 — 진도를 건너뛰게 하지 않는다.
    realtimeContracts() {
      const have = this.contracts.filter(Boolean);
      return Object.keys(D.FAMILIES).filter(fam => this._familyOpen(fam)).map(fam => {
        const owned = have.find(c => FAM(c.carrier) === fam);
        const tier = owned ? D.CARRIERS[owned.carrier].tier + 1 : 0;
        const key = D.centerFor(fam, tier);
        if (!key || (owned && D.CARRIERS[key].tier <= D.CARRIERS[owned.carrier].tier)) return null; // 이미 그 계열 최고 등급을 갖고 있다
        return { carrier: key, family: fam, price: this.hireContractPrice(key), upgrade: !!owned, ownedName: owned ? this.contractName(owned) : null };
      }).filter(Boolean).sort((a, b) => a.price - b.price);
    }
    hireContractPrice(carrier) { return Math.round(this.contractPrice({ price: D.CARRIERS[carrier].price }) * 1.5); }
    hireContract(carrier, target) {
      if (this.phase !== 'play') return { ok: false, msg: T('err.notPlay') };
      const car = D.CARRIERS[carrier];
      if (!car || !this._familyOpen(FAM(carrier))) return { ok: false, msg: T('err.sold') };
      if (target == null || target < 0 || target >= D.CONTRACT_SLOTS) return { ok: false, msg: T('err.pickSlot') };
      const price = this.hireContractPrice(carrier);
      if (this.cash < price) return { ok: false, msg: T('err.noCash') };
      const old = this.contracts[target], nc = this._makeContract(carrier);
      this.contracts[target] = nc; this.cash -= price; this.run.spent += price; this.stats.contractsBought = (this.stats.contractsBought || 0) + 1;
      this.say('log.hireContract', { name: this.contractName(nc), price, old: old ? MSG('log.buyContractOld', { name: this.contractName(old), calls: old.calls }) : '' });
      return { ok: true, price };
    }
    refill(contractId) {
      if (this.phase !== 'market') return { ok: false, msg: T('err.notMarket') };
      const c = this.contracts.find(x => x && x.id === contractId); if (!c) return { ok: false, msg: T('err.emptySlot') };
      if (c.calls >= c.maxCalls) return { ok: false, msg: T('err.refillFull') };
      const price = this.refillPrice(c); if (this.cash < price) return { ok: false, msg: T('err.noCash') };
      const wasted = c.calls; c.calls = c.maxCalls; this.cash -= price;   // 남은 배차는 새 계약으로 바뀐다(선금 대수로) this.run.spent += price; this.stats.refills = (this.stats.refills || 0) + 1;
      this.say('log.refill', { name: this.contractName(c), n: c.maxCalls, price, wasted: wasted ? MSG('log.refillWasted', { n: wasted }) : '' });
      return { ok: true, price, wasted };
    }
    buy(itemIdx, target, mode) {
      if (this.phase !== 'market') return { ok: false, msg: T('err.notMarket') };
      if (!(this.market && this.market.rep)) this._act('buy', { i: itemIdx, s: target, m: mode || null });   // 평판 상점은 rbuy 로 이미 적었다
      const R = this.rules, it = this.market.items[itemIdx];
      if (!it || it.sold) return { ok: false, msg: T('err.sold') };
      if (it.kind === 'deal') { const r = this.signDeal(it.customer, it.cycles, it.renew); if (!r.ok) return { ok: false, msg: T('err.deal.' + r.reason, { n: M.CUSTOMER_SLOTS }) }; it.sold = true; return { ok: true, deal: true }; }   // 서명은 공짜, 구매 한도와 무관
      if (R.marketMaxBuy && it.kind !== 'refill' && this.market.bought >= R.marketMaxBuy) return { ok: false, msg: T('err.marketMax', { n: R.marketMaxBuy }) };
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
          // 같은 계열 상위 센터로 갈아타기: 강화와 신뢰는 따라간다 — 유저: "강화 버려지는 게 아깝네, 강화는 유지, 신뢰도 유지"
          if (it.switchFrom === old.id && FAM(old.carrier) === FAM(it.carrier)) {
            const baseOld = this._makeContract(old.carrier, old.grade).maxCalls;
            nc.enh = JSON.parse(JSON.stringify(old.enh)); nc.maxCalls += Math.max(0, old.maxCalls - baseOld); nc.calls = nc.maxCalls;
            this.trust[it.carrier] = Math.max(this.trust[it.carrier] || 0, this.trust[old.carrier] || 0);
            nc.carried = true;
          }
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
        // 칸이 다 찼으면 끼운 것 하나를 빼고 새 걸 끼운다(mode.replace = 뺄 강화 id). 빼는 강화는 환불 없음
        let replaced = null;
        if (e.kind !== 'trust' && this.enhUsed(c) >= this.enhSlots(c)) {
          const rid = mode && mode.replace;
          if (!rid || !this.enhList(c).includes(rid)) return { ok: false, msg: T('err.enhFull', { n: this.enhSlots(c) }) };
          const back = JSON.parse(JSON.stringify({ enh: c.enh, maxCalls: c.maxCalls, calls: c.calls }));
          this.removeEnh(c, rid); replaced = rid;
          // 새 강화가 이 계약에 안 맞으면(아래 검사) 되돌린다
          const undo = () => { c.enh = back.enh; c.maxCalls = back.maxCalls; c.calls = back.calls; };
          if (e.kind === 'opt' && (this.contractCaps(c).includes(e.attr) || (e.maxSizeMax && D.CARRIERS[c.carrier].sizeMax > e.maxSizeMax) || D.CARRIERS[c.carrier].onlyPlain)) { undo(); return { ok: false, msg: T('err.optHasAttr') }; }
          if (e.kind === 'holiday' && c.enh.holiday) { undo(); return { ok: false, msg: T('err.enhHas') }; }
        }
        if (e.kind === 'limit') { c.enh.limit++; (c.enh.limitIds = c.enh.limitIds || []).push(it.enh); c.maxCalls += e.value; c.calls += e.value; }
        else if (e.kind === 'cap') { c.enh.cap++; }
        else if (e.kind === 'regular') { c.enh.regular = (+c.enh.regular || 0) + 1; }
        else if (e.kind === 'holiday') { if (c.enh.holiday) return { ok: false, msg: T('err.enhHas') }; c.enh.holiday = true; }
        else if (e.kind === 'trust') this._addTrust(c.carrier, e.value);
        else if (e.kind === 'opt') {
          const car = D.CARRIERS[c.carrier];
          if (this.contractCaps(c).includes(e.attr)) return { ok: false, msg: T('err.optHasAttr') };
          if (e.maxSizeMax && car.sizeMax > e.maxSizeMax) return { ok: false, msg: T('err.optSize', { max: e.maxSizeMax }) };
          if (car.onlyPlain) return { ok: false, msg: T('err.optPlain') };
          c.enh.opts = this.contractOpts(c).concat(it.enh); c.enh.opt = null; if (e.capDelta) c.enh.capDelta += e.capDelta; if (e.callsDelta) { c.maxCalls = Math.max(1, c.maxCalls + e.callsDelta); c.calls = Math.max(0, Math.min(c.calls, c.maxCalls)); }
        }
        this._updateTrustStats();
        this.say('log.enhance', { name: e.name, contract: this.contractName(c), price });
        if (replaced) this.say('log.enhReplace', { old: D.ENHANCEMENTS[replaced].name, name: e.name, contract: this.contractName(c) });
      } else if (it.kind === 'customer') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        if (this.customerCount() >= M.CUSTOMER_SLOTS) return { ok: false, msg: T('err.customerMax', { n: M.CUSTOMER_SLOTS }) };
        if (!this.addCustomer(it.customer)) return { ok: false, msg: T('err.customerDup') };
        this.say('log.buyCustomer', { name: M.CUSTOMERS[it.customer].name, price });
      } else if (it.kind === 'adTicket') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        this.adTickets = this.adTickets || {}; this.adTickets[it.media] = (this.adTickets[it.media] || 0) + 1;
        this.say('log.buyItem', { name: it.name, price });
      } else if (it.kind === 'media' || it.kind === 'mediaUp') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        const lv = (this.media[it.media] || 0);
        if (it.kind === 'media' && lv > 0) return { ok: false, msg: T('err.sold') };
        if (it.kind === 'mediaUp' && (lv <= 0 || lv >= D.AD_MEDIA[it.media].max)) return { ok: false, msg: T('err.sold') };
        this.media[it.media] = lv + 1;
        this.say('log.buyItem', { name: it.name, price });
      } else if (it.kind === 'growth') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        const r = this.investGrowth(it.growth); if (!r.ok) return { ok: false, msg: r.reason === 'cash' ? T('err.noCash') : T('err.sold') };
        this.cash += price; this.run.spent -= price;   // investGrowth 가 이미 냈다 — 아래 공통 차감과 겹치지 않게
        this.say('log.buyItem', { name: it.name, price });
      } else if (it.kind === 'item') {
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        if (it.item === 'transitCert') this.items.transitCert++; else this.items[it.item] = this.month + 1;
        this.say('log.buyItem', { name: it.name, price });
      } else if (it.kind === 'fac') {
        if (!it.fac) return { ok: false, msg: T('err.soldOut') };
        if (this.cash < price) return { ok: false, msg: T('err.noCash') };
        const f = D.FACILITIES[it.fac];
        if (f.cap) { const add = Math.round(f.cap * R.facilityCapMult); this.warehouse.cap += add; if (f.area) this.warehouse[f.area + 'Cap'] = (this.warehouse[f.area + 'Cap'] || 0) + add; this.stats.expansions++; }
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
    // ----- 멀티 장(shop): 「장 보러 간 날」 -----
    // 아무 영업일에나 들어갈 수 있고, 나오면 하루가 간다(입고는 쌓이고 배송은 없다). 그래서 자주 못 가고, 가면 한 번에 사고 나와야 한다.
    // 매물은 보유 계약의 다음 등급 센터(갈아타기) · 강화 · 창고 확장·냉장·마당만 — 새 계약·배차 항목·매물 새로고침 없음
    openShop() {
      if (this.phase !== 'play') return { ok: false, msg: T('err.notPlay') };
      this._act('shop');
      if (!this.rules.shopDay) return { ok: false, msg: T('err.notMarket') };
      this.phase = 'market';
      this.market = { items: this._shopItems(), bought: 0, refreshes: 0, month: this.month, shop: true, dayCost: true, freeRefresh: 0 };
      return { ok: true };
    }
    // 난투 장의 새 계약: 내가 안 가진 계열에서 표준 센터 n 장(공유 시드 파생 — 넷이 같은 사이클엔 같은 매물)
    _newContractItems(n) {
      const R = this.rules, owned = new Set(this.contracts.filter(Boolean).map(c => FAM(c.carrier)));
      const fams = Object.keys(this._carrierWeights()).filter(f => !owned.has(f) && D.centerFor(f, 0));
      const seed = (this.seed ^ Math.imul(this.month + 7, 2246822519) ^ 0x27d4eb2f) >>> 0, saved = this.rng; this.rng = new Rng(seed);
      try {
        const pick = this.rng.shuffle(fams).slice(0, n);
        return pick.map(f => { const k = D.centerFor(f, 0), car = D.CARRIERS[k]; return { kind: 'contract', carrier: k, grade: car.grade, price: Math.round(car.price * R.priceMult), name: car.name, sold: false, hint: null, switchFrom: null }; });
      } finally { this.rng = saved; }
    }
    // 트랙마다 안 가진 계열의 표준 센터 한 장 (공유 시드 — 넷의 첫 상점이 같다)
    _trackContractItems() {
      const R = this.rules, TK = M.MULTI.TRACKS, owned = new Set(this.contracts.filter(Boolean).map(c => FAM(c.carrier))), w = this._carrierWeights();
      const saved = this.rng; this.rng = new Rng((this.seed ^ 0x9e3779b9) >>> 0);
      try {
        const out = [];
        for (const k of Object.keys(TK)) {
          const fams = TK[k].families.filter(f => !owned.has(f) && w[f] && D.centerFor(f, 0)); if (!fams.length) continue;
          const id = D.centerFor(fams[this.rng.int(fams.length)], 0), car = D.CARRIERS[id];
          out.push({ kind: 'contract', carrier: id, grade: car.grade, price: Math.round(car.price * R.priceMult), name: car.name, sold: false, hint: null, switchFrom: null });
        }
        return this.rng.shuffle(out);   // 순서도 섞는다 — 늘 첫 칸이 🛒 이면 그게 정답처럼 읽힌다
      } finally { this.rng = saved; }
    }
    // 🛒 단골: 평판 상점이 한 번 더 — 이미 떠 있으면 닫힌 뒤에
    openBonusShop() {
      if (!this.rules.repShop) return;
      if (this.repShop) { this.pendingShops = (this.pendingShops || 0) + 1; return; }
      this.repShop = { items: this._drawRepShop(), bought: 0, bonus: true };
      this.emit('repTier', { tier: this.repTier, cap: this.repCap(), customers: [], shop: this.repShop.items.length, bonus: true });
    }
    // 트레잇 언락 카드: 내가 받는 물품 종류 중 아직 안 연 것 (유저: "마켓에 해당 특수 물품에 붙는 트레잇을 언락하는 것도")
    _traitUnlockItems() {
      const TT = M.MULTI.TYPE_TRAITS || {}; if (!this.rules.typeTraits) return [];
      const keys = Object.keys(TT).filter(k => !this.traitUnlocks.includes(k) && this.typeOpen(k) && (this.contracts.some(c => c && this._carrierAccepts(D.CARRIERS[c.carrier], { type: k, size: 1, attrs: D.PARCEL_TYPES[k].attrs || [], customs: 0 }, this.contractCaps(c), this.contractSizeMax(c), this.contractNeed(c)) && (!(D.PARCEL_TYPES[k].attrs || []).includes('fragile') || this.contractCaps(c).includes('fragile')))));
      return keys.map(k => ({ kind: 'traitUnlock', ptype: k, trait: TT[k][1], price: 0, name: k, sold: false }));
    }
    _shopItems() {
      const R = this.rules, items = [], mult = D.PRICE_MULT[Math.min(12, this.tableMonth(this.month))] * R.itemPriceMult * R.priceMult;
      for (const c of this.contracts) {
        if (!c) continue;
        const nx = D.centersOf(FAM(c.carrier)).find(k => D.CARRIERS[k].tier === D.CARRIERS[c.carrier].tier + 1);
        if (nx) { const car = D.CARRIERS[nx]; items.push({ kind: 'contract', carrier: nx, grade: car.grade, price: Math.round(car.price * R.priceMult), name: car.name, sold: false, hint: T('market.switchHint', { name: D.CARRIERS[c.carrier].name }), switchFrom: c.id, standing: true }); }
      }
      // 강화: 배차 한도·휴무 특약·첫 배차 무료는 뜻이 없다(횟수제·배차비 없음·명절 없음). 적재 보강 · 신뢰 · 속성 특약
      for (const e of ['cap1', 'seal', 'optFragile', 'optCold']) { const E = D.ENHANCEMENTS[e]; if (e.startsWith('opt') && !this._canFitOpt(e)) continue; items.push({ kind: 'enh', enh: e, price: Math.round(E.price * mult), name: E.name, sold: false, standing: true }); }
      const facPrice = f => Math.round(D.FACILITIES[f].price * mult * R.facilityPriceMult * ((R.facilityPriceMap && R.facilityPriceMap[f]) || 1));
      const fac = f => { const F = D.FACILITIES[f]; if (this.warehouse[f] || (F.requires && !this.warehouse[F.requires])) return; items.push({ kind: 'fac', fac: f, standing: true, price: facPrice(f), name: F.name, sold: false }); };
      // 시설(창고 확장·냉장·야적)은 난투에서 팔지 않는다 — 유저: "난투에서 시설 업그레이드는 없애줘". 칸은 퍽(📦·🏕)으로만 는다
      if (!R.noFacilities) { fac(['expand1', 'expand2', 'expand3'].find(f => !this.warehouse[f]) || 'expand3'); fac(['cold1', 'cold2'].find(f => !this.warehouse[f]) || 'cold2'); fac('yard'); }
      items.push(...this._newContractItems(2));   // 새 계약 두 장 — 빈 슬롯이 있으면 새 계열, 없어도 갈아탈 수 있게 (유저: "왜 새 계약이 안 떠")
      items.push(...this._refillItems());   // 배차 충전(가득) — 난투의 배차는 횟수다
      // 광고: 캠페인(📣)으로 물량을 끌어오는 게 난투의 조절 손잡이다 — 매체·매체 강화·광고권은 판다 (성장 투자는 없다)
      for (const it of this._adAndGrowthItems(mult)) if (['adTicket', 'media', 'mediaUp'].includes(it.kind)) items.push(it);
      return items;
    }
    closeMarket() {
      if (this.phase !== 'market') return false;
      this._act('close');
      const prep = this.market.prep, shop = this.market.shop && this.market.dayCost;
      this.market = null;
      if (shop) {   // 장 보러 간 날: 하루가 간다 — 대기와 같은 마감(입고·기한·정산 그대로), 배송만 없다
        this.phase = 'play'; this.stats.shopDays = (this.stats.shopDays || 0) + 1; this.monthStats.waits++; this.run.waits++; this.stats.waits++;
        this.waitStack = 0; this.loadChain = 0;
        this.say('log.shopDay'); this.emit('shopDay', {});
        this._endTurn(true); return true;
      }
      if (prep) { this.phase = 'play'; this.say('log.monthStart', { m: 1, y: this.yearOf(1), cal: this.calMonth(1), half: 1 }); this._startTurn(); return true; }
      // 캠페인: 마지막 사이클의 마켓을 닫으면 그때 장이 끝난다 (충전을 배우고 나서 결과가 나온다)
      if (this.month >= this.rules.months) return this._finish(), true;
      this._startMonth(this.month + 1);
      return true;
    }

    // ----- save / load -----
    toJSON() {
      // level·_shows 는 levels.js 의 표에서 매번 다시 만든다. 특히 _shows 는 Set 이라 JSON 으로 나가면 {} 가 되고,
      // 그대로 불러오면 shows() 가 터진다 (= 서장 이어하기가 깨진다). 저장하지 않고 fromJSON 에서 복원한다.
      const { rng, rules, scenario, company, level, _shows, ...rest } = this;
      return { ...rest, rngCalls: rng.calls, seed: this.seed };
    }
    static fromJSON(obj) {
      const g = Object.create(Game.prototype);
      Object.assign(g, obj);
      g.cfg = obj.cfg; g.seed = obj.seed;
      // 캠페인 레벨 복원 (표에서 다시 — 세이브에는 없다)
      const lvn = g.cfg && g.cfg.level;
      g.level = lvn && LV ? LV.get(lvn) : null;
      g._shows = g.level ? LV.showsAt(lvn) : null;
      g._buildRules();
      g.rng = new Rng(obj.seed, obj.rngCalls);
      delete g.rngCalls;
      g.events = [];
      if (!g.stats) g.stats = Game.emptyStats();
      if (g.loadChain == null) g.loadChain = 0;
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
      if (g.monthStats) { if (g.monthStats.missionEarned == null) g.monthStats.missionEarned = g.monthStats.revenue || 0; if (g.monthStats.missionRank == null) g.monthStats.missionRank = 0; if (g.monthStats.missionBonus == null) g.monthStats.missionBonus = 0; if (!g.monthStats.missionTarget) g.monthStats.missionTarget = g._missionTarget(g.schedule); }
      if (!g.pendingRevenue) g.pendingRevenue = []; if (g.feesDue == null) g.feesDue = 0; if (g.debt == null) g.debt = 0; if (g.totalTurn == null) g.totalTurn = (g.month - 1) * D.TURNS_PER_MONTH + g.turn;
      if (!g.deals) g.deals = []; if (!g.relations) g.relations = {}; if (!g.adTickets) g.adTickets = { flyer: 1 };
      if (!g.customers) { g._initCustomers(); for (const p of g.parcels) if (!p.customer) p.customer = 'anon'; }
      for (const id in g.customers) { const c = g.customers[id]; if (!c.total) c.total = { delivered: 0, revenue: 0, claims: 0, discarded: 0 }; if (!c.month) c.month = g._emptyCustMonth(); }
      if (g.monthStats && g.monthStats.claims == null) g.monthStats.claims = 0;
      if (!g.storage) { g.storage = []; g.offer = null; g.outdoorPref = []; g.insurer = 'none'; g.premMult = 1; g.noClaimMonths = 0; g.coverHalf = false; g.items = { transitCert: 0, yardIns: 0, customsBond: 0 }; }
      if (!g.weather || !g.weather.length) g.weather = Array(g.turns()).fill('sunny').map((w, i) => g.heatTurns && g.heatTurns.includes(i + 1) ? 'heat' : w);
      if (g.monthStats) for (const k of ['insClaims', 'covered', 'premium', 'storageIncome']) if (g.monthStats[k] == null) g.monthStats[k] = 0;
      g.growth = Object.assign({ marketing: 0, fleet: 0, warehouse: 0, automation: 0, branding: 0, coldchain: 0 }, g.growth || {});
      if (!g.media) g.media = { flyer: Math.max(1, g.growth.marketing || 0) };
      if (!g.mediaRuns) g.mediaRuns = { m: g.campaignCycle || 0, used: g.campaignCycle ? { flyer: 1 } : {} };   // 옛 저장: 이번 보름에 열었으면 전단지 1회로   // 옛 저장: 홍보 레벨을 전단지 레벨로
      g._assignCold();
      return g;
    }
  }

  const API = { Game, Rng, mergeMods, DATA: D, META: M };
  if (typeof module !== 'undefined') module.exports = API; else Object.assign(root, API);
})(typeof window !== 'undefined' ? window : globalThis);
