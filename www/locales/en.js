// English. Same shape as ko.js: name / ui / data / meta. Missing keys fall back to Korean at runtime (see i18n.js).
// Placeholders: {name} is substituted; {n:one|other} picks by n === 1 and # is replaced with the number.
(function (root) {
  const L = {
  name: 'English',
  ui: {
    // ----- game core: logs (log.*) · errors (err.*) · penalty reasons (r.*) · discard reasons (why.*) · game over (over.*) -----
    'err.overTrucks': "Up to {n} vehicles per call ({cap} slots total)",
    'err.noTrucks': "Only {n} dispatches left this month",
    'err.noCashFee': "Not enough cash for the {fee}c dispatch fee",
    'market.upgradeHint': "Upgrade of a contract you own",
    'market.addHint': "Add trucks to owned contract",
    'err.notSameCarrier': "Only applies to a contract with the same carrier",
    'err.notHigherGrade': "Upgrade only to a higher grade than you own",
    'log.upgradeContract': "Contract upgraded: {name} (-{price}c) · upgrades & remaining trucks kept",
    'log.addContract': "Contract added: {name} +{n} trucks/month, refilled now (-{price}c)",
    'slot.upgradeAsk': "Upgrade {name} to <b>{grade}</b>? Enhancements and remaining trucks are kept, monthly trucks increase.",
    "slot.addAsk": "Add trucks to {name}? Monthly limit <b>+{n}</b>, and this month's trucks are refilled <b>+{n}</b> right away.",
    'slot.upgradeBtn': "Upgrade",
    'slot.addBtn': "Add trucks",
    'slot.replaceBtn': "Replace with new",
    'fmt.trucks': "{n} vehicle{n:|s}",
    'fmt.perTruck': "{fee}c per vehicle",
    'fmt.vehicleCap': "{vehicle} {cap} slots",
    'sum.fees': "Dispatch fees",
    'call.trucks': "{n} vehicle{n:|s} · load {vol}/{cap} slots",
    'call.addTruck': "Add a vehicle (+{fee}c)",
    'call.removeTruck': "Remove a vehicle",
    'call.fee': "Dispatch fee -{fee}c",
    'call.net': "Net {net}c",
    'call.fillOk': "Load efficiency ✓ trust +1",
    'call.simulMax': "Max {n} at once",
    'mk.vehicleLine': "{vehicle} <b>{cap}</b> slots · <b>{fee}</b>c per vehicle · <b>{trucks}</b>/month",
    'mk.gradeVs': "vs Standard: capacity {cap0}→{cap1} · {t0}→{t1}/month · fee {f0}→{f1}c · trust lv {lv} immediately",
    'grade.merit': "Premium contracts bring bigger vehicles, more dispatches, cheaper fees and instant trust perks",
    'mk.forecast': "Expected volume, month {m} (approx.)",
    'log.monthStart': '── Month {m} begins ──',
    'log.prepMarket': 'Prep market: buy before month 1 starts (1 free refresh)',
    'log.bigCustomer': 'Big contract: {name} will send 60% of the volume',
    'log.custSuspend': '{name} suspended trade ({why}) — resumes next month',
    'log.custResume': '{name} resumed trade',
    'log.custLevel': '{name} trust level {level}!',
    'log.claim': 'Damages -{amount}c ({name}, {why}{covered})',
    'log.claimCovered': ', insurance covered {covered}c',
    'log.insurerChange': 'Insurer changed: {name}{fee}',
    'log.insurerFee': ' (sign-up fee -{cost}c)',
    'log.storageOffer': 'Storage offer: {name} {kind} {vol} cells · {turns} turns · {pay}',
    'log.storagePrepaid': '{fee}c upfront',
    'log.storagePerTurn': '{perTurn}c/turn, paid at pickup',
    'log.storageAccept': 'Storage accepted: {kind} {vol} cells (+{fee}c)',
    'log.storageDecline': 'Storage offer declined',
    'log.storageEarlyReturn': 'Storage returned early: refund {refund}c + penalty {pen}c',
    'log.storageCollect': 'Storage picked up: {kind}{pay}',
    'log.storagePostpaid': ' (+{pay}c on pickup)',
    'log.offerExpired': 'Storage offer expired',
    'log.strike': '⚠ {name} on strike this month: cannot call',
    'log.paid': '{name} paid +{amount}c ({count} parcels)',
    'log.heatAlert': ' 🌡Heat alert!',
    'log.arrive': 'M{month} T{turn}: {list} arrived (usage {usage}%){note}',
    'log.wait': 'Wait: passed 1 turn without a call',
    'log.waitSelf': 'Wait + self-delivered {count} (+{revenue}c, delivery cost -{cost}c)',
    'log.transitCert': 'Transit certificate used: no breakage on this call',
    'log.callAllBroken': '{name} call: all {broken} parcels broken!',
    'log.trustUp': '{name} reached trust level {level}! ({effect})',
    'log.spareCall': 'Spare driver dispatched (call without remaining calls)',
    'log.call': "{name} call: {count} shipped, +{revenue}c{delay}{broken}{refund} (fee {fee}c · {calls} left)",
    'log.callDelay': ' (paid in {delay} turns)',
    'log.callBroken': ', {broken} broken',
    'log.callRefund': ' (bundle discount: call not consumed)',
    'log.callInstant': ' ⚡instant',
    'log.discard': 'Discarded: {short}{size} — {why}{pen}',
    'log.penalty': 'Penalty +{pen}: {reasons} (stress {stress})',
    'log.erosion': 'Unstable: {name} monthly dispatch -1',
    'log.settle': 'Month {month} settlement: revenue {revenue}, operating cost {opCost}{closing}',
    'log.settleClosing': ', closing bonus +{closing}',
    'log.gameOver': 'Game over: {reason}',
    'log.marketOpen': 'Month {month} market open (buy up to {max})',
    'log.refresh': 'Market refreshed (-{cost}c)',
    'log.refreshFree': 'Market refreshed (free)',
    'log.buyContract': 'Contract bought: {name} (-{price}c){old}',
    'log.buyContractOld': ', {name} dropped ({calls} calls lost)',
    'log.enhance': 'Upgrade applied: {name} → {contract} (-{price}c)',
    'log.buyCustomer': 'New customer signed: {name} (-{price}c)',
    'log.buyItem': 'Bought: {name} (-{price}c)',
    'log.buyFacility': 'Facility bought: {name} (-{price}c)',
    'r.wet': 'wet {short}{size}',
    'r.heatProduce': 'heat spoiled produce {short}{size} deadline -2',
    'r.overdue': 'overdue {short}',
    'r.overdueCont': 'still overdue {short}',
    'r.discard': '{why} discarded {short}',
    'r.returned': 'returned {short}{pen}',
    'r.returnedInsured': 'returned (insured)',
    'r.stolen': 'stolen {short}{size} +2',
    'r.stolenInsured': 'stolen (insured)',
    'r.storageStolen': 'stored goods stolen +2 (damages {amount}c)',
    'r.overflow': 'overflow {over} (+{pen})',
    'r.overflowGrace': 'overflow {over} (temp yard)',
    'why.delivered': 'delivery',
    'why.noClaim': 'no claims',
    'why.fanInsurer': 'preferred insurer',
    'why.earlyReturn': 'early return',
    'why.storageDone': 'storage completed',
    'why.storageStolen': 'storage theft',
    'why.noFrozenZone': 'no freezer zone',
    'why.outsideFrozen': 'outside freezer',
    'why.heatSpoil': 'heat spoilage',
    'why.warmSpoil': 'room-temp spoilage',
    'why.brokenInTransit': 'broken in {name} transit',
    'why.returned': 'return',
    'why.stolen': 'theft',
    'why.insured': '{why} (insured)',
    'over.stress': 'Operating stress hit the limit',
    'over.bankrupt': 'Bankrupt — could not pay operating costs',
    'over.delivered': 'Not enough shipped: {n}/{need}',
    'over.discard': 'Too many spoiled: {n} (max {max})',
    'over.cash': 'Not enough cash: {cash}/{need}c',
    'over.overdue': 'Too many overdue deliveries: {n} (max {max})',
    'over.storage': 'Not enough storage contracts: {n}/{need}',
    'over.bigCustomer': '{name} trust level {level} (needs 3)',
    'over.win': 'Survived {months} months!',
    'err.noCash': 'Not enough cash',
    'err.marketOnly': 'Can only change in the market',
    'err.noInsurer': 'No such insurer',
    'err.alreadyInsured': 'Already insured',
    'err.startupNoInsurance': 'Startup has no insurance in month 1 (available from the month 2 market)',
    'err.noOffer': 'No offer',
    'err.offerTooBig': 'Larger than the warehouse',
    'err.noStorage': 'No such storage contract',
    'err.needRefundPenalty': 'Need {cost}c for refund + penalty',
    'err.cannotCallNow': 'Cannot call right now',
    'err.emptySlot': 'Empty slot',
    'err.struck': 'This carrier is on strike',
    'err.noCalls': 'No dispatches left this month',
    'err.overCap': 'Can ship at most {cap}',
    'err.nothingToShip': 'Nothing to ship',
    'err.cannotShipNow': 'Cannot deliver right now',
    'err.nothingSelf': 'No parcels eligible for self-delivery',
    'err.selfLimit': 'Self-delivery: up to {n} per turn',
    'err.selfCost': 'Not enough cash for {cost}c delivery cost',
    'err.noRefresh': 'No refresh in this scenario',
    'err.notMarket': 'Not in the market',
    'err.sold': 'Already sold',
    'err.marketMax': 'Only {n} purchases per month',
    'err.pickSlot': 'Pick a slot to replace',
    'err.pickContract': 'Pick a contract to apply to',
    'err.limitMax': 'Call limit upgrade: max 2 per contract',
    'err.capMax': 'Capacity upgrade: max 3 per contract',
    'err.hasRegular': 'Regular dispatch already applied',
    'err.hasExpress': 'Express dispatch already applied',
    'err.optOne': 'One rider per contract',
    'err.optHasAttr': 'Carrier already handles that attribute',
    'err.optUrgent': 'Riders cannot be added to this contract',
    'err.optSize': 'Only contracts with max size {max} or less',
    'err.optPlain': 'Cannot add to a plain-parcel-only carrier',
    'err.customerMax': 'Up to {n} customers',
    'err.customerDup': 'Already a customer',
    'err.soldOut': 'Sold out',
    'xp.base': 'delivery +1',
    'xp.cap80': "Load efficiency 80%+ +1",
    'xp.specialist': 'specialist +1',
    'xp.coldChain': 'cold chain +1',
    'note.regular': "First dispatch free this month",
    'note.express': 'express dispatch +1',
    'note.trust2': 'trust lv2 +1',
    'note.skip': 'skip bonus +1',
    'note.waitStack': 'wait stack +{n}',
    'note.firstCall': 'local regular +1',
    'self.needBigVan': 'Needs Big Truck',
    'self.needColdVan': 'Needs Reefer Van',
    'self.needPadVan': 'Needs Padded Van',
    'self.customsWait': 'In customs',
    'market.hint': 'Can ship {count} {short} in the warehouse',
    'market.facSoldOut': 'Facilities sold out',
    'market.newCustomer': 'New customer: {name}',
    'trust.l3prefix': 'Trust lv3: ',
    // ----- UI: title · prep · HUD · popups -----
    'ach.done': '🏆 Achievement: {name}',
    'ach.unlock': '🔓 Unlocked: {name}',
    'btn.ok': 'OK',
    'btn.cancel': 'Cancel',
    'title.name': 'Parcel Tycoon',
    'title.sub': 'Turn-based logistics roguelike · prototype',
    'title.continue': 'Continue',
    'fmt.monthTurn': 'Month {m}, turn {t}',
    'title.new': 'New Run',
    'title.codex': 'Codex',
    'title.codexSub': '{a}/{b} unlocked · achievements {c}/{d}',
    'title.records': 'Records',
    'title.recordsSub': 'Best {best} pts · {w}W {l}L',
    'title.help': 'How to Play',
    'opt.sound': 'Sound: {v}',
    'opt.music': 'Music: {v}',
    'opt.lang': 'Language',
    'title.modal': 'Parcel Company Game',
    'title.confirmNew': 'A run is in progress. Starting a new one will erase it. Continue?',
    'title.newShort': 'Start new',
    'opt.on': 'On',
    'opt.off': 'Off',
    'prep.today': 'Today',
    'prep.dailyDone': 'Recorded today',
    'prep.win': 'Win',
    'prep.recommend': 'Suggested',
    'prep.dailyNormal': 'Daily is fixed to Regular',
    'prep.scenarioTitle': 'Choose Scenario',
    'prep.step1': 'Step 1/3 — pick the run length and rules',
    'btn.title': 'Title',
    'prep.nextCompany': 'Next: Company',
    'prep.warehouse': 'Capacity {cap} · Cold {cold} · XL {xl}',
    'prep.warehouseRandom': 'Random warehouse',
    'prep.contractsRandom': '4 random contracts',
    'hud.cash': 'Cash',
    'prep.contracts': 'Contracts',
    'prep.companyTitle': 'Choose Company',
    'prep.step2': 'Step 2/3',
    'btn.back': 'Back',
    'prep.nextPerk': 'Next: Perks',
    'prep.noColdCompany': 'Company has no cold zone',
    'prep.sameFamily': 'A {family} perk is already equipped',
    'prep.step3': 'Step 3/3',
    'prep.variants': 'Variants',
    'prep.perkCount': 'Perks {n}/{slots} (one per family)',
    'prep.insuranceHead': 'Insurance (monthly premium deducted at settlement; -20% next month with no claims)',
    'prep.startupNoIns': 'Startup begins uninsured. Available from the month 2 market',
    'prep.fans': 'Preferred by: {list} (+1 xp at month start while insured)',
    'prep.perkTitle': 'Equip Perks',
    'prep.start': 'Start Run',
    'tier.0': 'Start',
    'tier.1': 'Tier 1 · Basics',
    'tier.2': 'Tier 2 · Specialization',
    'tier.3': 'Tier 3 · Challenge',
    'fmt.months': '{n:# month|# months}',
    'fmt.pts': '{n} pts',
    'fmt.calls': '{n:# call|# calls}',
    'fmt.perMonth': '{n}c/mo',
    'fmt.count': '{n}',
    'fmt.turns': '{n:# turn|# turns}',
    'fmt.turnN': 'T{n}',
    'fmt.level': 'Lv {n}',
    'fmt.cells': 'size {n}',
    'prep.family': '{family} family',
    'prep.slotFull': 'You have {n} perk slots',
    'fmt.monthN': 'Month {n}',
    'hud.turn': 'T{t}/{max}',
    'hud.strike': 'Strike',
    'hud.familyPerk': '{family} perk',
    'hud.upcoming': 'Incoming',
    'hud.monthEnd': 'Month end',
    'hud.outdoor': '🌧 Outside {vol} cells ({n}{storage}) · theft this turn {pct}%',
    'hud.outdoorStorage': '+storage',
    'hud.outdoorTag': '🌧 Outside',
    'hud.outdoorLabel': 'Yard',
    'storage.left': 'pickup in {n}',
    'hud.buyInMarket': 'Buy a contract in the market',
    'hud.spare': 'Spare',
    'hud.contractSub': "<b>{cap}</b>sl·{fee}c · <b>{vol}</b>sl elig",
    'hud.noTurn': 'no turn',
    'hud.regular': 'regular',
    'hud.express': 'express',
    'wait.overdue': '⏳overdue {n}',
    'wait.spoil': '🥀spoil {n}',
    'wait.frozenOver': '❆no freezer {n}',
    'wait.btn': '⏭ Wait · Self-deliver',
    'wait.next': 'Next turn {used}/{cap}{over}',
    'wait.over': ' over!',
    'cust.trustLv': 'Trust lv {n}',
    'cust.suspended': 'suspended',
    'company.difficulty': 'Difficulty',
    'company.warehouse': 'Warehouse {cap} · Cold {cold} · Frozen {frozen} · XL {xl}',
    'company.facilities': 'Facilities',
    'company.customers': 'Customers',
    'company.perks': 'Perks',
    'company.customerDetail': 'Customers',
    'weather.noEffect': 'no effect',
    'weather.title': 'Weather',
    'weather.head': 'Season: {season} · forecast {n} turns ahead (forecasts are exact)',
    'weather.tent': 'Tent: no wetting',
    'weather.note': 'Parcels stored outside are hit hardest by weather. Heat waves also spoil 🌾 produce inside the warehouse (safe in the cold zone or with ventilation).',
    'up.frozenOk': '❆ freezer OK',
    'up.frozenNo': '❆ no freezer space → discarded on arrival',
    'up.coldOk': '❄ cold zone OK',
    'up.coldNo': '❄ no cold space → room temp',
    'up.customs': '🛃 customs {n:# turn|# turns}',
    'up.burst': '⚡ surge (deadline -2)',
    'up.title': 'Arriving turn {n}',
    'up.volume': 'Volume <b>{vol}</b>',
    'common.warehouse': 'Warehouse',
    'up.heat': '🌡 Heat alert turn: fresh/frozen outside cold zones discarded immediately',
    'up.note': 'Arrival order is fixed; customs and cold-zone assignment are decided on arrival.',
    'btn.close': 'Close',
    'common.none': 'none',
    'season.spring': 'Spring',
    'season.summer': 'Summer',
    'season.autumn': 'Autumn',
    'season.winter': 'Winter',
    'attr.cold': 'Discarded next turn if outside the cold zone',
    'attr.fragile': '⚠ Chance of breakage with a carrier lacking the ability',
    'attr.customs': 'Cannot ship while in customs (except customs brokers)',
    'attr.frozen': 'Discarded immediately if outside the freezer',
    'attr.produce': 'Spoils in a heat wave even inside (safe in cold zone or with ventilation)',
    'pd.specialBonus': 'Special bonus +{n}',
    'pd.breakRisk': '⚠ break {pct}%',
    'pd.cannotCall': 'cannot call',
    'pd.baseReward': 'base {n}c',
    'pd.perPiece': '(+{n} each)',
    'pd.claim': 'Damages if discarded <b style="color:var(--red)">{claim}c</b>',
    'pd.arrivedAgo': 'arrived {n:# turn|# turns} ago',
    'pd.wet': 'wet (reward -20%)',
    'pd.outdoor': '🌧 stored outside',
    'pd.contracts': 'Contracts that can ship this',
    'pd.noContract': 'No contracts',
    'pd.selfRow': 'Self-delivery (wait turn)',
    'pd.selfCost': 'cost {cost}c, full reward',
    'pd.ok': 'OK',
    'offer.title': '{name} storage offer',
    'offer.prepaid': '<b>{fee}c</b> upfront',
    'offer.perTurn': '{perTurn}c/turn at pickup ({total}c)',
    'offer.note': 'Accepting: warehouse {used} → {after}/{cap}{push} · untouchable during the term, trust +2 if it ends safely',
    'offer.push': '(your parcels get pushed outside)',
    'offer.accept': 'Accept',
    'offer.decline': 'Decline',
    'offer.feeFloat': 'Storage fee +{n}c',
    'storage.postpaid': '{n}c at pickup',
    'storage.prepaid': '{n}c received upfront',
    'storage.earlyNote': 'Early return: refund {refund}c for the remaining term + 30c penalty = pay <b>{total}c</b>, customer trust -1. An escape hatch to reclaim space in a pinch.',
    'storage.earlyBtn': 'Return early (-{n}c)',
    're.claim': 'damages {n}c',
    're.outOfZone': 'out of zone!',
    're.wet': 'wet',
    're.storageClaim': 'damages ×2 if stolen',
    're.inside': 'Inside',
    're.outside': 'Outside <b>{vol}</b> · theft {pct}%',
    're.nextTurn': 'Next turn',
    're.presets': 'Presets',
    're.preUrgent': 'Urgent first',
    're.preReward': 'High reward',
    're.preClaim': 'High damages',
    're.preCustomer': '{icon} first',
    're.zoneIn': '🏠 Inside — tap to move outside',
    're.empty': 'Empty',
    're.zoneOut': '🌧 Outside — tap to move inside',
    're.title': 'Arrange Storage',
    'btn.apply': 'Apply',
    're.sub': 'If the inside exceeds capacity, the least urgent parcels are pushed out automatically',
    'trust.next': 'Next {have}/{need}: {effect}',
    'trust.max': 'Max level',
    'trust.remain': '{n}xp to go',
    'ps.warm': '🔥 Room temp · discarded next turn',
    'ps.cold': '❄ Cold',
    'ps.frozenOut': '🔥 Outside freezer',
    'ps.frozen': '❆ Frozen',
    'ps.heat': '🔥 Heat damage',
    'ps.customs': '🛃 Customs {n}{delayed}',
    'ps.delayed': '(delayed)',
    'ps.overdue': '⏳ Late{ret}',
    'ps.returnIn': '↩ {n}',
    'ps.deadline': '⏳ <b>{n}</b>',
    'hud.emptyWarehouse': 'The warehouse is empty',
    'call.riskTag': '⚠ break risk',
    'call.spare': 'Spare driver (1/month)',
    'call.xpGain': 'This call <b>+{xp}xp</b> ({parts})',
    'call.nextLevel': 'Next level',
    'call.trackToggle': 'Level unlocks',
    'call.capacity': 'Capacity <b>{cap}</b> slots',
    'call.remain': 'Left',
    'call.btn': 'Call',
    'call.riskLine': '⚠ Break risk on {n} — {pct}% each (expected loss {loss}c). A broken parcel is discarded, stress +2',
    'call.caps': 'Abilities',
    'call.size': 'Size {min}–{max}',
    'call.payLater': '⏱ paid in {n:# turn|# turns}',
    'call.bonus': 'Bonus',
    'call.selected': "Selected <b>{n}</b>/{cap}",
    'call.pickUrgent': 'Auto-pick urgent',
    'call.pickClear': 'Clear',
    'call.instant': '⚡Ship now',
    'call.noTurn': 'Does not use a turn',
    'call.maxSelect': "Exceeds vehicle capacity {cap} — add a vehicle or remove parcels",
    'float.broken': '⚠ Broken! {short}',
    'float.delayed': '+{n}c (in {delay} turns)',
    'toast.custSuspend': '{name} suspended trade — resumes next month',
    'float.claim': 'Damages -{n}c',
    'toast.trustUp': '⭐ {name} trust lv {level}: {effect}',
    'float.self': 'Self-delivery +{rev}c (cost -{cost}c)',
    'pd.sizeOut': 'size out of range',
    'pd.plainOnly': 'plain parcels only',
    'pd.notSpecial': 'not its specialty',
    'pd.noFrozenCap': '❆ no ability',
    'pd.no': 'unavailable',
    'wm.rewardCost': 'reward <b>{reward}</b>c · cost <b style="color:var(--orange)">{cost}</b>c',
    'wm.overdue': '⏳ overdue {n}',
    'wm.spoil': '🥀 spoil {n}',
    'wm.frozenOver': '❆ no freezer space {n}',
    'wm.nextWarehouse': 'Next turn',
    'wm.ifWait': 'If you wait',
    'wm.outdoor': '🌧 Outside {vol} cells · theft this turn {pct}%',
    'wm.selfHead': '🚚 Self-delivery — up to <b>{n}</b> this turn (size ≤ {size}) · full reward, cost {base}c + size×{per}c',
    'wm.vans': 'Vehicles',
    'wm.noVans': 'No vehicles — plain parcels and produce only',
    'wm.blocked': '{n} not eligible (see parcel details)',
    'wm.title': 'Wait',
    'wm.selfWait': 'Deliver {n} then wait (-{cost}c)',
    'wm.justWait': 'Just wait',
    'wm.sub': 'Pass the turn without a call',
    'wm.limit': 'Up to {n} per turn',
    'float.discard': 'Discarded! {why}',
    'float.paid': '{name} paid +{n}c',
    'float.storageEnd': 'Storage picked up {pay}',
    'float.storageStolen': 'Stored goods stolen! -{n}c',
    'toast.offer': 'A storage offer arrived',
    'float.returned': 'Returned! {short}',
    'float.stolen': 'Stolen! {short}{size}',
    'float.stress': 'Stress +{n}',
    'sum.revenue': 'Delivery revenue',
    'sum.opCost': 'Operating cost',
    'sum.closing': 'Closing bonus',
    'sum.callsWaits': 'Calls / waits',
    'sum.delivered': 'Parcels shipped',
    'sum.penalty': 'Penalty this month',
    'sum.rsb': 'Ret. / stolen / broken',
    'sum.claims': 'Damages',
    'sum.covered': '(insurance covered {n})',
    'sum.premium': 'Premium ({name})',
    'sum.claimsNext': '{n} claims → next premium {next}c',
    'sum.noClaimBonus': '2 months claim-free: all customers trust +1',
    'sum.selfCost': 'Self-delivery cost',
    'sum.storageIncome': 'Storage fees',
    'sum.overdueVol': 'Overdue in storage',
    'sum.discarded': 'Spoiled',
    'sum.runDiscard': '(run total {n}/{max})',
    'sum.cash': 'Cash',
    'sum.goal': '(goal {n})',
    'sum.stress': 'Stress',
    'sum.usage': 'Warehouse usage',
    'sum.usageVal': '{pct}% ({n} stored)',
    'sum.deliverGoal': 'Shipping goal',
    'sum.storageGoal': 'Storage contracts done',
    'fmt.cases': '{n}',
    'sum.bigCustomer': 'Big-contract customer',
    'common.trust': 'trust',
    'sum.custClaim': 'damages -{n}c',
    'sum.title': 'Month {n} Settlement',
    'sum.final': 'Final result',
    'sum.toMarket': 'To market',
    'mk.capCalls': '{cap}/call · max {calls} calls',
    'mk.oneTime': '(one-time)',
    'mk.claimMult': 'damages ×{n}',
    'mk.custStart': 'Starts at trust lv 0 (customers {n}/{max})',
    'common.xl': 'XL',
    'mk.afterBuy': 'After purchase',
    'mk.allFacilities': 'All facilities already bought',
    'mk.sold': 'Sold',
    'mk.currentContracts': 'Current contracts (replacing loses remaining calls and upgrades{keep}; carrier trust is kept)',
    'mk.keepCalls': ', {n} call kept',
    'mk.contractLine': '{calls}/{max} dispatches this month, vehicle {cap} slots',
    'mk.mine': 'My contracts',
    'mk.prepNote': 'Before month 1 starts.',
    'mk.bought': 'Bought',
    'mk.refresh': 'Refresh market ({cost})',
    'mk.free': 'free',
    'mk.prepTitle': 'Prep Market',
    'mk.title': 'Month {n} Market',
    'mk.startMonth': 'Start month {n}',
    'toast.strike': '✊ {name} on strike this month — cannot call',
    'mk.priceMult': 'prices ×{n}',
    'slot.pickReplace': 'Pick a slot. Same carrier: upgrade or add trucks; other carrier: replace (remaining trucks & upgrades lost, trust stays).',
    'slot.pickApply': 'Pick a contract to apply to.',
    'slot.emptyHint': 'Put the new contract here',
    'slot.limitEnh': 'limit upgrade {n}/2',
    'slot.capEnh': 'capacity upgrade {n}/3',
    'kind.contract': 'Contract',
    'kind.enh': 'Upgrade',
    'kind.fac': 'Facility',
    'kind.item': 'Insurance',
    'kind.customer': 'Customer',
    'res.unlocked': '🔓 {name} unlocked',
    'res.best': '★ New best',
    'res.scenarioCompany': 'Scenario / company',
    'res.reached': 'Reached',
    'res.revenue': 'Total revenue',
    'res.spent': 'Total spent',
    'res.cash': 'Final cash',
    'res.callsWaits': 'Calls / waits',
    'res.deliveredDiscarded': 'Shipped / discarded',
    'res.seed': 'Seed',
    'res.toTitle': 'To title',
    'res.again': 'Same setup again',
    'res.win': 'Run complete!',
    'res.over': 'Game Over',
    'rec.head': 'Best <b>{best} pts</b> · {runs} runs ({clears} wins)',
    'rec.dailyStreak': 'daily streak {n}',
    'rec.win': 'win',
    'rec.lose': 'loss',
    'rec.empty': 'No records yet.',
    'rec.title': 'Run Records',
    'cust.next': 'Next {have}/{need}',
    'cust.lv1': 'Volume ×1.0 · +5 each (lv 0 is volume ×0.6)',
    'cust.defaultMix': 'Monthly default mix',
    'cust.thisMonth': 'This month {n} · +{rev}c',
    'cust.suspendedLong': 'Suspended (resumes next month)',
    'ins.current': 'active',
    'ins.nextMonth': 'next month {n}c',
    'ins.joinFee': 'sign-up {n}c · {n}c/mo',
    'ins.fans': 'Preferred by',
    'ins.noFans': '(none at this company)',
    'ins.startup': 'Startup is uninsured in month 1. Available from the month 2 market',
    'ins.rules': 'Premiums are deducted at month end. 0 claims → next month ×0.8 (2 months in a row ×0.7 + all customers trust +1); 3–4 claims ×1.3; 5+ ×1.7 and half coverage. Switching costs the new insurer\'s base premium as a sign-up fee.',
    'ins.coverHalf': 'Half coverage this month (5+ claims last month)',
    'ins.marketOnly': 'Insurance can be switched in the market',
    'ins.confirm': 'Switch to {name}? Sign-up fee {fee}c',
    'ins.join': 'Sign up',
    'cust.rules': 'On-time delivery +1xp · special rule +1xp · discard -3xp (below 0 suspends trade). Higher trust raises volume and per-parcel reward; discards trigger damage claims.',
    'my.slot': 'Slot {n}',
    'my.limit': 'dispatch limit +{n}',
    'my.cap': 'capacity +{n}',
    'my.remain': "{calls}/{max} dispatches this month",
    'my.stats': "{vehicle} <b>{cap}</b> slots · {fee}c/vehicle · up to {simul} at once · {calls} calls this run · {n} shipped",
    'my.others': 'Carriers with leftover trust but no contract',
    'my.note': 'Replacing loses remaining calls and upgrades{keep}; carrier trust is kept',
    'codex.carriersHead': 'Carriers · trust accrues per carrier and survives contract changes',
    'codex.liveRun': '(current run progress)',
    'codex.carrierPrice': "{vehicle} {cap} slots · {fee}c/vehicle · {trucks}/month · {price}c",
    'codex.need': 'only({icons})',
    'codex.perkSlots': '{n} perk slots · one per family',
    'codex.slotReward': '{n} perk slots',
    'codex.multiReward': 'Half-Year Review + 2 perk slots',
    'stat.runsClears': 'Runs / wins',
    'stat.best': 'Best score',
    'stat.delivered': 'Parcels shipped',
    'stat.contracts': 'Contracts bought',
    'stat.tidy': 'Tidy month ends',
    'stat.daily': 'Daily streak',
    'fmt.days': '{n:# day|# days}',
    'stat.profileNote': 'The profile is stored on this device (Google Play Games sync planned).',
    'stat.reset': 'Reset profile',
    'stat.resetConfirm': 'This erases all unlocks, achievements and records. Continue?',
    'stat.resetBtn': 'Reset',
    'log.title': 'Log',
    'menu.title': 'Menu',
    'menu.autosave': 'Progress is saved automatically every turn.',
    'menu.volume': 'Music volume',
    'menu.continue': 'Continue',
    'menu.abandon': 'Abandon run',
    'menu.abandonConfirm': 'Abandon this run and return to the title? (It will not be recorded)',
    'menu.abandonBtn': 'Abandon',
    'opt.turnOn': 'on',
    'opt.turnOff': 'off',
    'btn.help': 'Help',
    'fmt.wins': '{n:# win|# wins}',
    'codex.tab.companies': 'Companies',
    'codex.tab.carriers': 'Carriers',
    'codex.tab.perks': 'Perks',
    'codex.tab.scenarios': 'Scenarios',
    'codex.tab.achievements': 'Achievements',
    'codex.tab.stats': 'Stats',
    'codex.ach.company': 'Company unlocks',
    'codex.ach.scenario': 'Scenario unlocks',
    'codex.ach.slot': 'Perk slots',
    'codex.ach.multi': 'First clear',
    'codex.ach.perk': 'Perk unlocks',
    'codex.ach.none': 'Records',
    'help.body': '<div class="help">\n      <p>Parcels arrive at your warehouse every turn. Calls are per <b>vehicle</b>: each contract has a vehicle (N slots) and you pay a <b>dispatch fee</b> per vehicle every call; fill it 80%+ to earn extra trust. Every call costs money, so pace waits and calls to keep cash from running dry. Call a carrier to ship them, or <b>wait</b> and let them pile up. A call costs the same regardless of how many parcels it ships — you pay per <b>call</b>, so the more you ship at once, the better.</p>\n      <h3>Setting up a run</h3><p>Pick a <b>scenario</b> (length and rules) → a <b>company</b> (starting warehouse, contracts, traits) → <b>perks</b> (small rule tweaks). Companies, perks and scenarios are unlocked by <b>achievements</b>; the Codex shows conditions and progress. Companies open in tiers: <b>tier 1</b> (3 runs · first clear · 2 clears) → <b>tier 2</b> (30 of a parcel type in total) → <b>tier 3</b> (clear with 3 companies).</p>\n      <h3>Turn order</h3><p>Arrivals → call a carrier or wait → delivery → freshness and deadlines tick → overflow and delay penalties</p>\n      <h3>Parcel attributes — what happens in the warehouse</h3><table><tr><th>Attribute</th><th>Rule</th><th>Who can ship it</th></tr>\n      <tr><td>❄ Fresh</td><td>Outside the cold zone: <b>discarded next turn</b>. Deadline 3 turns</td><td>Any carrier (bonus from Cold Logistics only)</td></tr>\n      <tr><td>⚠ Fragile</td><td>A carrier without the ⚠ ability has a <b>25% break chance</b> (discard, +2 stress)</td><td>Any carrier. Safe: Fragile Pro · Heavy Haul · Rail · Air · Urgent · Padded Packing Rider</td></tr>\n      <tr><td>🛃 Customs</td><td><b>2 turns in customs</b> after arrival (20% chance of +1 delay). Takes space while waiting; the deadline starts afterwards</td><td>Any carrier once cleared. While in customs: Customs Broker · Air · Sea · Urgent only</td></tr>\n      <tr><td>❆ Frozen</td><td>Outside the freezer: <b>discarded immediately</b>. Deadline 8 turns. From month 4. Parcels larger than the freezer never arrive</td><td>Frozen Logistics · Reefer Container Rider only</td></tr>\n      <tr><td>🌾 Produce</td><td>Even inside, <b>heat waves cut the deadline by 2</b> (discarded if outside). Safe in spare cold space or with Ventilation. Deadline 5 turns</td><td>Any carrier (bonus from Cold Logistics). Self-delivery OK</td></tr>\n      <tr><td>Large (4–7)</td><td>Only carriers whose size range fits</td><td>Van Hire · Heavy Haul · Rail · Sea · Customs Broker</td></tr></table>\n      <h3>Wait · self-delivery · vehicles</h3><p>Pressing <b>Wait</b> opens the end-turn screen, where you can pick parcels to <b>self-deliver</b> — 1 per turn (Big Truck +1, City Quick and National Post +1), plain parcels and produce only, up to size 2. You keep the full reward but pay a <b>delivery cost</b> (15c + size×5c). Expand it with market <b>vehicles</b>: Reefer Van (❄❆), Padded Van (⚠ safe), Big Truck (size 4, +1). If anything is stored outside, the same screen leads to Arrange Storage. Tap a parcel row to see which contracts or self-delivery can handle it.</p>\n      <h3>Prep market</h3><p>Every run starts with a <b>prep market</b>. Before the first turn of month 1 you can spend your starting cash on contracts, upgrades, facilities and insurance, and you can see the first 1–2 turns of arrivals and weather. One free refresh. One-month scenarios are prepared here too.</p>\n      <h3>Difficulty</h3><p>Choose <b>Rookie · Regular · Veteran</b> at the top of the scenario screen. Rookie lowers arrivals, prices and damages and shows arrivals 3 turns ahead, but unlock achievements don\'t count. Veteran (after your first clear): arrivals +10%, damages ×1.5, theft and breakage ×1.3, stress limit 18, score ×1.4.</p>\n      <h3>Weather · storage · contracts · insurance</h3><p>Each turn has weather, forecast 2 turns ahead. <b>🌧 Rain</b> wets standard and ⚠ parcels outside (reward -20%), <b>🔥 heat waves</b> discard ❄❆ outside cold zones immediately, a <b>❄️ blizzard</b> turns the yard into a fridge (no ❄ spoilage, theft halved, ❄ shipping +10), and a <b>🌀 typhoon</b> doubles theft and pushes that turn\'s arrivals to the next turn.</p><p>When the warehouse overflows, pressing <b>Wait</b> opens <b>Arrange Storage</b>. Choose what goes outside yourself or use presets (urgent · high reward · high damages · by customer). It doesn\'t open on call turns — it\'s the reward for waiting.</p><p>Customers like the Moving Center offer <b>storage contracts</b>. Accepting pays an upfront fee and the volume occupies your warehouse for the term (not callable or arrangeable). Ending safely gives trust +2; returning early refunds the remaining term minus a 30c penalty. If it\'s put outside and stolen, damages ×2.</p><p><b>Insurance</b> is chosen at run start and can be switched in the market. It covers part of each damage claim, and the monthly premium is deducted at settlement. 0 claims → -20% next month (2 months in a row -30% + customer trust +1); many claims raise it. Uninsured, customers with damages ×2 (Glass Studio, Moving Center) send half the volume. The market also sells one-time insurance (Transit Certificate · Yard Insurance · Customs Bond).</p>\n      <h3>Customers</h3><p>Every parcel has a <b>customer</b> (icon on the left of the row). On-time delivery +1xp, meeting the customer\'s special rule +1xp, discard -3xp. Trust levels 1–3 raise volume and per-parcel reward, and levels 2–3 unlock customer perks. A discard (spoilage, return, theft, breakage) triggers a <b>damage claim</b> (base reward × damage multiplier) taken from your cash immediately, and if xp drops below 0 the customer stops trading until next month. Check the <b>Customers</b> button at the bottom.</p>\n      <p>The <b>ability</b> icons on a carrier card are the attributes it handles safely. A <b>rider</b> from the upgrade slot adds one attribute to a contract (1 per contract). ✈🚆🚢 only mark the transport mode and don\'t affect matching; Rail and Sea pay out 1–2 turns later.</p>\n      <h3>Three ways to ship</h3><p><b>Self-delivery</b>: on a wait turn, pick 1 parcel, pay the delivery cost, keep the full reward. <b>Carrier call</b>: spends 1 remaining call and the turn. Specialists get bonuses. <b>⚡Urgent Express</b>: ships 1 parcel instantly without using a turn — the safety net of a waiting strategy.</p>\n      <p>Van Hire takes any 1 parcel (no bonus, ⚠ break risk). Missing a deadline costs reward -25% and stress +1; 3 turns later the parcel is <b>returned</b> (stress +2). Whatever exceeds capacity is <b>stored outside</b>, newest arrivals first, and rolls for theft every turn (overflow 1–2: 15%, 3–5: 30%, 6+: 50%). Fresh food drops to 50% reward after 3 turns and is discarded the turn after (+3). Fresh food at room temperature (not ❄) spoils twice as fast.</p>\n      <h3>Warehouse</h3><p>Overflow of 1–2: +1 stress, 3 or more: +2 — the real danger is theft of what\'s outside. Stress {stress} is game over. Operating costs are settled at month end.</p>\n      <h3>Contracts and the market</h3><p>Each contract has a number of remaining calls, and you can\'t buy new contracts mid-month. Replace contracts and buy upgrades and facilities in the month-end market. Replacing a contract loses its remaining calls and upgrades. Grades: Standard &lt; Trusted &lt; Expert &lt; Master.</p>\n      <h3>Carrier trust</h3><p>Trust accrues per <b>carrier</b> and survives contract changes. Per call: delivery +1, capacity 80%+ +1, special parcels with a specialist +1. The call screen previews the xp for this call.</p>\n      <table><tr><th>Level</th><th>xp</th><th>Effect</th></tr><tr><td>1</td><td>3</td><td>Capacity +1 per call</td></tr><tr><td>2</td><td>8</td><td>+1 parcel every 4th call</td></tr><tr><td>3</td><td>15</td><td>Signature ability (Cold: deadlines freeze / Bulk · Broker · Heavy · Frozen · Urgent: +1 parcel / Van: special bonus / Fragile Pro: +15c / Air: size 4 / Rail · Sea: payment delay -1)</td></tr></table>\n      <p>Fastest route: call the same carrier <b>fully loaded</b> (80%+) for +2–3xp each time — level 3 in 5–6 calls.</p></div>',
  },
  data:   {
    "ATTRS": {
      "cold": {
        "name": "Cold"
      },
      "fragile": {
        "name": "Fragile"
      },
      "customs": {
        "name": "Customs"
      },
      "frozen": {
        "name": "Frozen"
      },
      "produce": {
        "name": "Produce"
      }
    },
    "PARCEL_TYPES": {
      "normal": {
        "name": "Standard",
        "short": "Std"
      },
      "fresh": {
        "name": "Fresh Food",
        "short": "Fresh"
      },
      "produce": {
        "name": "Produce",
        "short": "Prod"
      },
      "fragile": {
        "name": "Fragile",
        "short": "Frag"
      },
      "intl": {
        "name": "Customs Cargo",
        "short": "Cust"
      },
      "large": {
        "name": "Large Cargo",
        "short": "Large"
      },
      "frozen": {
        "name": "Frozen Food",
        "short": "Frz"
      }
    },
    "CARRIERS": {
      "bulk": {
        "name": "Bulk Sorting",
        "short": "Bulk",
        "vehicle": "Box Truck",
        "desc": "Loads plain parcels (size 1–2) on a box truck. The backbone of a standard-parcel build"
      },
      "cold": {
        "name": "Cold Logistics",
        "short": "Cold",
        "vehicle": "Reefer Truck",
        "desc": "Fresh & produce specialist. Fresh/produce bonus"
      },
      "frozen": {
        "name": "Frozen Logistics",
        "short": "Frozen",
        "vehicle": "Freezer Truck",
        "desc": "Frozen only. Frozen bonus"
      },
      "fragile": {
        "name": "Fragile Pro",
        "short": "FragPro",
        "vehicle": "Padded Van",
        "desc": "Fragile specialist. No breakage, fragile bonus"
      },
      "intl": {
        "name": "Customs Broker",
        "short": "Broker",
        "vehicle": "Bonded Truck",
        "desc": "Clears and ships cargo still in customs. Customs bonus"
      },
      "large": {
        "name": "Heavy Haul",
        "short": "Heavy",
        "vehicle": "Heavy Truck",
        "desc": "Ships size 4+ parcels (break-safe). Large bonus"
      },
      "air": {
        "name": "Air Express",
        "short": "Air",
        "vehicle": "Air Container",
        "desc": "Small (1–2) only. Handles customs & fragile safely. Pricey but fast"
      },
      "rail": {
        "name": "Rail Freight",
        "short": "Rail",
        "vehicle": "Freight Train",
        "desc": "Break-safe, big batches. Paid next turn"
      },
      "sea": {
        "name": "Sea Freight",
        "short": "Sea",
        "vehicle": "Container",
        "desc": "Customs container, size 2+, break-safe. Paid 2 turns later"
      }
    },
    "TRUST_PERK_TEXT": {
      "bulk": [
        "Call 2 trucks at once",
        "Dispatch fee -30%",
        "Standard parcel reward +5"
      ],
      "cold": [
        "Capacity +2",
        "Fresh/produce deadlines freeze on call turns",
        "Cold zone +2"
      ],
      "frozen": [
        "Dispatch fee -20%",
        "Capacity +2",
        "Freezer zone +2"
      ],
      "fragile": [
        "Dispatch fee -20%",
        "Call 2 vans at once",
        "Fragile reward +15"
      ],
      "intl": [
        "Customs wait -1 turn",
        "Capacity +4",
        "No customs delay events"
      ],
      "large": [
        "XL parcels take 1 less slot",
        "Call 2 trucks at once",
        "Large reward +10"
      ],
      "air": [
        "Handles up to size 4",
        "Dispatch fee -30%",
        "+20 when shipping cargo still in customs"
      ],
      "rail": [
        "No payment delay",
        "Monthly dispatch +1",
        "Capacity +6"
      ],
      "sea": [
        "Payment delay 1 turn",
        "Capacity +6",
        "No payment delay"
      ]
    },
    "SELF_DELIVERY": {
      "name": "Self-delivery"
    },
    "GRADES": {
      "normal": {
        "name": "Standard"
      },
      "trusted": {
        "name": "Premium"
      },
      "expert": {
        "name": "Elite"
      },
      "master": {
        "name": "Master"
      }
    },
    "TRUST_EFFECTS": [
      "Base"
    ],
    "ENHANCEMENTS": {
      "limit1": {
        "name": "Dispatch Limit +1",
        "desc": "Monthly dispatch limit & remaining trucks +1 (2 per contract)"
      },
      "limit2": {
        "name": "Dispatch Limit +2",
        "desc": "Monthly dispatch limit & remaining trucks +2 (2 per contract)"
      },
      "cap1": {
        "name": "Load Reinforcement",
        "desc": "Vehicle capacity +1 (3 per contract)"
      },
      "regular": {
        "name": "Free First Dispatch",
        "desc": "The first truck of the first call each month is free"
      },
      "express": {
        "name": "Double Dispatch",
        "desc": "+1 vehicle per call"
      },
      "seal": {
        "name": "Trust Seal",
        "desc": "Trust xp +3 on the chosen contract"
      },
      "record": {
        "name": "Long-term Record",
        "desc": "Trust xp +6 on the chosen contract"
      },
      "optFragile": {
        "name": "Padded Packing Rider",
        "desc": "This contract handles ⚠ fragile safely (1 rider per contract)"
      },
      "optCold": {
        "name": "Cooler Rider",
        "desc": "This contract handles ❄ fresh (no bonus), capacity -1"
      },
      "optCustoms": {
        "name": "Customs Rider",
        "desc": "This contract handles 🛃 cargo in customs, monthly dispatch -1"
      },
      "optFrozen": {
        "name": "Reefer Container Rider",
        "desc": "This contract handles ❆ frozen, capacity -1 (contracts with max size ≤ 4 only)"
      }
    },
    "FACILITIES": {
      "expand1": {
        "name": "Warehouse Expansion I",
        "desc": "Total capacity +8"
      },
      "expand2": {
        "name": "Warehouse Expansion II",
        "desc": "Total capacity +10"
      },
      "expand3": {
        "name": "Warehouse Expansion III",
        "desc": "Total capacity +12"
      },
      "cold1": {
        "name": "Cold Room Extension",
        "desc": "Cold capacity +4"
      },
      "cold2": {
        "name": "Cold Room Extension II",
        "desc": "Cold capacity +6"
      },
      "yard": {
        "name": "Heavy Yard",
        "desc": "XL storage +1"
      },
      "freezer1": {
        "name": "Freezer Extension",
        "desc": "Frozen capacity +4"
      },
      "vent": {
        "name": "Ventilation",
        "desc": "🌾 produce inside no longer spoils in heat waves"
      },
      "coldvan": {
        "name": "Reefer Van",
        "desc": "Self-deliver ❄ fresh and ❆ frozen"
      },
      "padvan": {
        "name": "Padded Van",
        "desc": "Self-deliver ⚠ fragile safely"
      },
      "bigvan": {
        "name": "Big Truck",
        "desc": "Self-delivery +1, up to size 4"
      },
      "driver": {
        "name": "Courier",
        "desc": "Direct delivery +1 parcel"
      }
    },
    "STRESS_NAMES": {
      "stable": "Stable",
      "caution": "Caution",
      "danger": "Danger",
      "crisis": "Crisis",
      "gameover": "Game Over"
    }
  },
  meta:   {
    "CUSTOMERS": {
      "anon": {
        "name": "Walk-in Customers",
        "desc": "Local personal parcels. Monthly default mix"
      },
      "dawn": {
        "name": "Dawn Market",
        "rule": {
          "text": "Dawn delivery: +20 if shipped the turn it arrives"
        },
        "perks": {
          "2": {
            "text": "Cold zone +2 (leased)"
          },
          "3": {
            "text": "This customer's fresh deadline +1"
          }
        }
      },
      "mart": {
        "name": "BigMart",
        "rule": {
          "text": "Scheduled delivery: +10% if a call ships 3+ BigMart parcels"
        },
        "perks": {
          "2": {
            "text": "Bulk Sorting capacity +1"
          },
          "3": {
            "text": "This customer's parcel reward +5"
          }
        }
      },
      "glass": {
        "name": "Glass Studio",
        "rule": {
          "text": "Handle with care: +30 for 5 in a row without breakage"
        },
        "perks": {
          "2": {
            "text": "This customer's break chance halved"
          },
          "3": {
            "text": "This customer's fragile bonus +10"
          }
        }
      },
      "import": {
        "name": "Import Mall",
        "rule": {
          "text": "Pre-cleared: this customer's customs wait -1 turn"
        },
        "perks": {
          "2": {
            "text": "Customs Broker appears ×2 in the market"
          },
          "3": {
            "text": "This customer's customs bonus +15"
          }
        }
      },
      "factory": {
        "name": "Furniture Factory",
        "rule": {
          "text": "Batch shipping: +25 if a same-turn batch ships in one call"
        },
        "perks": {
          "2": {
            "text": "XL storage +1"
          },
          "3": {
            "text": "This customer's large parcels take -1 space"
          }
        }
      },
      "ice": {
        "name": "Ice Factory",
        "rule": {
          "text": "Cold chain: +15 per frozen parcel shipped"
        },
        "perks": {
          "2": {
            "text": "Freezer Extension -50%"
          },
          "3": {
            "text": "This customer's frozen deadline +2"
          }
        }
      },
      "luxury": {
        "name": "Luxury House",
        "rule": {
          "text": "Secure transit: +20 if never left outside while in customs"
        },
        "perks": {
          "2": {
            "text": "Air Express appears ×2 in the market"
          },
          "3": {
            "text": "This customer's customs wait -1"
          }
        }
      },
      "farm": {
        "name": "Farm Co-op",
        "rule": {
          "text": "Harvest: +15 if shipped within 2 turns of arrival"
        },
        "perks": {
          "2": {
            "text": "Ventilation -50%"
          },
          "3": {
            "text": "This customer's produce deadline +1"
          }
        }
      },
      "mover": {
        "name": "Moving Center",
        "desc": "Only offers storage contracts",
        "perks": {
          "2": {
            "text": "Storage fees +20%"
          },
          "3": {
            "text": "Household goods take -2 space"
          }
        }
      }
    },
    "STORAGE_KINDS": {
      "move": {
        "name": "Household Goods"
      },
      "season": {
        "name": "Seasonal Stock"
      },
      "event": {
        "name": "Event Supplies"
      }
    },
    "INSURERS": {
      "none": {
        "name": "Uninsured",
        "desc": "No coverage. Customers with damages ×2 send half the volume"
      },
      "sturdy": {
        "name": "Sturdy Fire",
        "desc": "50% of all discard damages"
      },
      "coldguard": {
        "name": "ColdGuard",
        "desc": "❄❆ spoilage damages 80%, others 20%"
      },
      "safebox": {
        "name": "SafeBox",
        "desc": "⚠ breakage & theft damages 80%, others 20%"
      },
      "premier": {
        "name": "Premier",
        "desc": "90% of all damages + no return stress"
      }
    },
    "INS_ITEMS": {
      "transitCert": {
        "name": "Transit Certificate",
        "desc": "0% break chance on the next call"
      },
      "yardIns": {
        "name": "Yard Insurance",
        "desc": "100% theft damages next month"
      },
      "customsBond": {
        "name": "Customs Bond",
        "desc": "No customs delays next month"
      }
    },
    "WEATHER": {
      "sunny": {
        "name": "Sunny",
        "desc": ""
      },
      "rain": {
        "name": "Rain",
        "desc": "Standard & ⚠ parcels outside get wet (reward -20%)"
      },
      "heat": {
        "name": "Heat Wave",
        "desc": "❄❆ outside cold zones discarded immediately"
      },
      "snow": {
        "name": "Blizzard",
        "desc": "No ❄ spoilage outside · ❆ 1-turn grace, theft halved, ❄ deadlines frozen, ❄ shipping +10"
      },
      "storm": {
        "name": "Typhoon",
        "desc": "Theft ×2, wetting, no arrivals this turn (they pile up next turn)"
      }
    },
    "DIFFICULTIES": {
      "rookie": {
        "name": "Rookie",
        "desc": "Arrivals ×0.85, op cost -30, dispatch fees ×0.8, prices ×0.9, theft/break/damages ×0.5, forecast 3 turns, stress limit 24. Score ×0.7. Unlock achievements don't count"
      },
      "normal": {
        "name": "Regular",
        "desc": "Default rules — every call costs money; keep the cash flowing"
      },
      "veteran": {
        "name": "Veteran",
        "desc": "Arrivals ×1.15, op cost +60, dispatch fees ×1.3, theft/break ×1.3, damages ×1.5, dual-attribute parcels +3%p, stress limit 16. Score ×1.4"
      }
    },
    "COMPANIES": {
      "local": {
        "name": "Local Parcel",
        "tag": "Balanced · baseline",
        "passive": "Local regulars: first call each month capacity +1",
        "weakness": "None"
      },
      "fresh": {
        "name": "Fresh Logistics",
        "tag": "Fresh food specialist",
        "passive": "Cold chain: fresh deadline +1 turn. Cold Logistics calls give trust +1 extra",
        "weakness": "Cold-biased: fragile & customs reward -10%. Heavy Haul never appears in the market"
      },
      "steel": {
        "name": "Steel Depot",
        "tag": "Large cargo · space",
        "passive": "Stacking pros: size 4+ parcels take -1 space. Heavy Haul capacity +1",
        "weakness": "No cold zone: fresh food is always at room temp (spoils 2× faster). Cold capacity max 4"
      },
      "quick": {
        "name": "City Quick",
        "tag": "Tiny warehouse · frequent calls",
        "passive": "Fast dispatch: all contracts +1 dispatch per month. Direct delivery +1",
        "weakness": "Cramped: warehouse expansions half as effective. XL always needs +3 temp space"
      },
      "global": {
        "name": "Global Express",
        "tag": "Customs cargo · high reward",
        "passive": "Duty drawback: customs cargo reward +20. Customs Broker starts at trust lv 3",
        "weakness": "Exchange swings: month-end op cost random 100–160. Standard reward -5"
      },
      "glass": {
        "name": "Glasshouse Logistics",
        "tag": "Fragile · precision",
        "passive": "Padded packing: fragile deadline +2 turns, reward +15",
        "weakness": "Careful now: Bulk Sorting capacity -1. Calls of 5+ parcels get reward -10%"
      },
      "thrifty": {
        "name": "Penny Freight",
        "tag": "Extreme saver",
        "passive": "Bargain contracts: all market prices & dispatch fees -20%. Each waited turn adds +1 slot to the next call's vehicle (max +3)",
        "weakness": "Short-staffed: all contracts max calls -1. Month-end op cost +40"
      },
      "startup": {
        "name": "Startup Delivery",
        "tag": "Random · high risk",
        "passive": "Pivot: 1 free market refresh per month. 3 contract slots in the market. Premium+ grade chance +15%p",
        "weakness": "Unstable: each month end one starting contract loses 1 call. Op cost +30 from month 3"
      },
      "postal": {
        "name": "National Post",
        "tag": "Steady · long haul",
        "passive": "Public service: op cost fixed at 230, dispatch fee fixed at 70c. Direct delivery +1. Stress -2 at month start if 10+",
        "weakness": "Slow approvals: 2 market purchases per month. Expert/Master from month 5. Special bonus -5"
      }
    },
    "PERKS": {
      "longdeal": {
        "name": "Long-term Deal",
        "desc": "All contract prices -10%"
      },
      "prepay": {
        "name": "Prepay Discount",
        "desc": "First contract purchase each month -40"
      },
      "protect": {
        "name": "Renewal Protection",
        "desc": "Replacing a contract keeps 1 remaining call"
      },
      "regularco": {
        "name": "Regular Carriers",
        "desc": "All carriers start with 3 trust xp (lv 1)"
      },
      "spare": {
        "name": "Spare Driver",
        "desc": "Once a month, call a contract with 0 calls left"
      },
      "bundle": {
        "name": "Bundle Discount",
        "desc": "A call shipping 4+ parcels doesn't consume a call (once a month)"
      },
      "compact": {
        "name": "Space Optimizer",
        "desc": "All parcel sizes -1 (min 1)"
      },
      "coldpro": {
        "name": "Cold Expert",
        "desc": "Fresh food shelf life +1 turn"
      },
      "tempyard": {
        "name": "Temp Yard",
        "desc": "No penalty for overflow of 1–2"
      },
      "shelves": {
        "name": "Extra Shelves",
        "desc": "Starting capacity +4"
      },
      "freezer": {
        "name": "Freezer",
        "desc": "Fresh food in the cold zone doesn't age for its first 2 turns"
      },
      "yard": {
        "name": "Open Yard",
        "desc": "XL storage +1, XL temp space 3→2"
      },
      "skip": {
        "name": "Skip Bonus",
        "desc": "Capacity +1 on the call after a wait"
      },
      "insure": {
        "name": "Discard Insurance",
        "desc": "No penalty for the first discarded parcel of the run"
      },
      "tent": {
        "name": "Tent",
        "desc": "Parcels outside don't get wet in rain or typhoons"
      },
      "breath": {
        "name": "Deep Breath",
        "desc": "Stress -1 at month start"
      },
      "overtime": {
        "name": "Overtime",
        "desc": "Overdue reward cut 25% → 10%"
      },
      "foresight": {
        "name": "Foresight",
        "desc": "Show arrivals 4 turns ahead"
      },
      "emergency": {
        "name": "Dispatch Deal",
        "desc": "All dispatch fees -15%"
      },
      "regulars": {
        "name": "Regular Customers",
        "desc": "Standard parcel reward +5"
      },
      "premium": {
        "name": "Premium Service",
        "desc": "Special shipping bonus +5"
      },
      "closing": {
        "name": "Closing Bonus",
        "desc": "+60 if month-end warehouse usage ≤ 60%"
      },
      "consult": {
        "name": "Logistics Consulting",
        "desc": "Trust xp gain +1"
      },
      "taxsave": {
        "name": "Tax Savings",
        "desc": "Month-end op cost -20"
      },
      "investor": {
        "name": "Investor",
        "desc": "Starting cash +150, month-end op cost +20"
      }
    },
    "PERK_FAMILIES": {
      "contract": "Contract",
      "warehouse": "Warehouse",
      "ops": "Operations",
      "income": "Income"
    },
    "DAILY_VARIANTS": {
      "fog": {
        "name": "Fog",
        "desc": "Arrivals shown 1 turn ahead"
      },
      "express": {
        "name": "Rush",
        "desc": "All deadlines -1 turn, reward +10"
      },
      "bigweek": {
        "name": "Big Week",
        "desc": "Size 4+ share doubled"
      },
      "inflation": {
        "name": "Inflation",
        "desc": "Market prices ×1.3, reward +10%"
      },
      "trustboom": {
        "name": "Trust Boom",
        "desc": "Trust xp ×2"
      },
      "repair": {
        "name": "Renovation",
        "desc": "Starting capacity -4, expansions -50%"
      },
      "picky": {
        "name": "Picky Customers",
        "desc": "Overdue reward -50%"
      },
      "generous": {
        "name": "Generous Customers",
        "desc": "Reward +15% on calls shipping 3+"
      }
    },
    "SCENARIOS": {
      "standard": {
        "name": "Standard 3 Months",
        "desc": "Default rules. Survive 3 months",
        "win": "Survive 3 months",
        "recommend": "Local Parcel"
      },
      "half": {
        "name": "Half-Year Review",
        "desc": "Full 6-month run. Expert/Master grades and large cargo appear",
        "win": "Survive 6 months (score ×1.5)",
        "recommend": "National Post"
      },
      "peak": {
        "name": "Peak Season",
        "desc": "Arrivals ×1.5, 5 surge turns (surge deadlines -2), return grace 2 turns. Reward +10, prices ×1.3, starting calls +2",
        "win": "Survive 2 months + ship 50",
        "recommend": "City Quick · Steel Depot"
      },
      "heatwave": {
        "name": "Heat Wave",
        "desc": "Fresh share +20%p, room-temp spoilage ×3, heat alert turns (3/month)",
        "win": "Survive 3 months + at most 3 discards",
        "recommend": "Fresh Logistics"
      },
      "strike": {
        "name": "Strike",
        "desc": "One carrier type can't be called each month (announced at month start). Op cost +30",
        "win": "Survive 3 months",
        "recommend": "Startup"
      },
      "port": {
        "name": "Port Contract",
        "desc": "Customs 20% · large 12%, XL 7%, arrivals -10%. Customs/large reward +20, standard -5",
        "win": "Survive 4 months",
        "recommend": "Global · Steel Depot"
      },
      "cashcrunch": {
        "name": "Cash Crunch",
        "desc": "Starting cash -50%, op cost 380, no refresh, market prices +10%. Revenue +10%, trust ×2",
        "win": "Survive 3 months + cash ≥ 600",
        "recommend": "Penny Freight · National Post"
      },
      "blackfriday": {
        "name": "Black Friday",
        "desc": "One hellish month. Arrivals ×2.3, 4 surge turns, prices ×1.4, return grace 4 turns. Reward +15, starting calls +3",
        "win": "Survive 1 month + ship 30",
        "recommend": "City Quick · Penny Freight"
      },
      "audit": {
        "name": "Audit",
        "desc": "All deadlines -1 turn, overdue reward -50%, stress +1 at month start",
        "win": "Survive 3 months + at most 4 overdue deliveries",
        "recommend": "National Post · Glasshouse"
      },
      "moving": {
        "name": "Moving Season",
        "desc": "Moving Center included, a storage offer guaranteed every 5 turns, storage fees ×1.5. Spring weather",
        "win": "Survive 3 months + complete 5 storage contracts",
        "recommend": "Steel Depot"
      },
      "bigdeal": {
        "name": "Big Contract",
        "desc": "One random customer sends 60% of the volume. Damages ×1.2",
        "win": "Survive 3 months + that customer at trust lv 3",
        "recommend": "City Quick"
      },
      "endless": {
        "name": "Endless",
        "desc": "Until game over. Arrivals +1/month from month 7, op cost +10/month from month 12",
        "win": "None — chase the score",
        "recommend": "—"
      },
      "daily": {
        "name": "Daily Delivery",
        "desc": "Date-seeded + 2 variant rules. Company assigned for the day",
        "win": "Survive 3 months (one record per day)",
        "recommend": "Assigned daily"
      }
    },
    "ACHIEVEMENTS": {
      "rookie": {
        "name": "Rookie Driver",
        "desc": "Play 3 runs (win or lose)"
      },
      "two_clears": {
        "name": "Second Success",
        "desc": "Clear any scenario twice"
      },
      "fresh30": {
        "name": "Thirty Fresh",
        "desc": "Ship 30 fresh food in total"
      },
      "fragile30": {
        "name": "Thirty Fragile",
        "desc": "Ship 30 fragile in total"
      },
      "worldwide": {
        "name": "Worldwide",
        "desc": "Ship 30 customs cargo in total"
      },
      "big20": {
        "name": "Heavy Hands",
        "desc": "Ship 20 size-4+ parcels on time in total"
      },
      "three_companies": {
        "name": "Boss of Three",
        "desc": "Clear runs with 3 different companies"
      },
      "fresh_king": {
        "name": "Fresh King",
        "desc": "Ship 15 fresh food in one run with no spoilage"
      },
      "giant": {
        "name": "Shoulders of Giants",
        "desc": "Ship 5 XL (7) parcels on time in one run"
      },
      "nonstop": {
        "name": "Nonstop",
        "desc": "30 consecutive turns shipping without a plain wait (self-delivery wait turns count)"
      },
      "unbreakable": {
        "name": "Unbreakable",
        "desc": "Ship 12 fragile on time in one run"
      },
      "patience": {
        "name": "Art of Waiting",
        "desc": "Clear a run averaging ≤ 4 calls per month"
      },
      "cust_l3": {
        "name": "Regular",
        "desc": "Reach customer trust lv 3 in one run"
      },
      "storage3": {
        "name": "Landlord Business",
        "desc": "Complete 3 storage contracts in total"
      },
      "noclaim2": {
        "name": "Claim-free",
        "desc": "2 consecutive months with 0 insurance claims"
      },
      "snowrun": {
        "name": "Snow Run",
        "desc": "Ship 5 fresh parcels on blizzard turns"
      },
      "landlord": {
        "name": "Landlord",
        "desc": "Clear Moving Season"
      },
      "partner": {
        "name": "Partner",
        "desc": "Clear Big Contract"
      },
      "veteran_clear": {
        "name": "Veteran",
        "desc": "Clear on Veteran difficulty"
      },
      "first_clear": {
        "name": "First Clear",
        "desc": "Clear any scenario"
      },
      "busy_month": {
        "name": "Busy Month",
        "desc": "Ship 15+ in one month"
      },
      "peak_clear": {
        "name": "Peak Conqueror",
        "desc": "Clear Peak Season"
      },
      "fresh20": {
        "name": "Twenty Fresh",
        "desc": "Ship 20 fresh food in total"
      },
      "four_carriers": {
        "name": "Four Carriers",
        "desc": "Clear with 4 slots filled by 4 different carriers"
      },
      "intl15": {
        "name": "Fifteen Customs",
        "desc": "Ship 15 customs cargo in total"
      },
      "rich_clear": {
        "name": "Rich Clear",
        "desc": "Clear Standard 3 Months with cash ≥ 1,000"
      },
      "half_clear": {
        "name": "Half-Year Clear",
        "desc": "Clear Half-Year Review"
      },
      "three_unlocked": {
        "name": "Three Companies",
        "desc": "Unlock 3 companies"
      },
      "veteran": {
        "name": "Veteran",
        "desc": "Unlock 5 companies"
      },
      "buyer": {
        "name": "Loyal Buyer",
        "desc": "Buy 10 contracts in total"
      },
      "fresh_start": {
        "name": "Bold Swap",
        "desc": "Replace a contract with 3+ calls left and clear"
      },
      "trust3": {
        "name": "Peak Trust",
        "desc": "Raise a carrier to trust lv 3"
      },
      "empty_tank": {
        "name": "Empty Tank",
        "desc": "Reach month end with 4 contracts at 0 calls and survive"
      },
      "big_haul": {
        "name": "One Big Haul",
        "desc": "Ship 6+ in one call"
      },
      "no_spoil": {
        "name": "No Spoilage",
        "desc": "Clear with 0 fresh food spoiled"
      },
      "overflow_survivor": {
        "name": "Overflow Survivor",
        "desc": "Clear after 5+ turns in overflow"
      },
      "expander": {
        "name": "Expansionist",
        "desc": "Buy 2 warehouse expansions in one run"
      },
      "cold_buyer": {
        "name": "Cold Investor",
        "desc": "Clear a run after buying 2 cold room extensions"
      },
      "xl_stack": {
        "name": "XL Trio",
        "desc": "Store 3 XL parcels at once"
      },
      "survivor": {
        "name": "On the Edge",
        "desc": "Clear with stress ≥ 15"
      },
      "late_but_done": {
        "name": "Late but Done",
        "desc": "Ship 10 overdue parcels and clear"
      },
      "waiter": {
        "name": "The Waiter",
        "desc": "Wait 40 times in total"
      },
      "clutch": {
        "name": "Full Load",
        "desc": "15 calls at 80%+ load efficiency"
      },
      "normal100": {
        "name": "Hundred Standard",
        "desc": "Ship 100 standard parcels in total"
      },
      "all_special": {
        "name": "All-round Logistics",
        "desc": "Ship all 4 special types with specialist carriers in one run"
      },
      "tidy": {
        "name": "Tidy Finish",
        "desc": "End 3 months at ≤ 40% usage (total)"
      },
      "trusted_three": {
        "name": "Trust Triangle",
        "desc": "3 carriers at trust lv 2"
      },
      "rich": {
        "name": "Comfortable",
        "desc": "Clear with cash ≥ 1,500"
      },
      "broke": {
        "name": "Hanging On",
        "desc": "Pass a month end with cash ≤ 100 and clear"
      },
      "perfect_month": {
        "name": "Perfect Month",
        "desc": "End a month with 0 penalty"
      },
      "full_house": {
        "name": "Full House",
        "desc": "Pass a turn at 100%+ usage with no penalty"
      },
      "big_hand": {
        "name": "Big Hands",
        "desc": "Ship 8 in one call"
      },
      "master_deal": {
        "name": "Master Deal",
        "desc": "Own a Master-grade contract"
      },
      "trust_badge": {
        "name": "Badge of Trust",
        "desc": "2 carriers at trust lv 3"
      },
      "millionaire": {
        "name": "Millionaire",
        "desc": "Cash 2,000"
      },
      "all_companies": {
        "name": "All Companies",
        "desc": "Clear Standard with all 9 companies"
      },
      "all_scenarios": {
        "name": "All Scenarios",
        "desc": "Clear all 10 scenarios except Endless"
      },
      "daily7": {
        "name": "Daily 7",
        "desc": "Clear the daily 7 days in a row"
      }
    }
  },
  };
  if (typeof module !== 'undefined') module.exports = L; else (root.LOCALES = root.LOCALES || {}).en = L;
})(typeof window !== 'undefined' ? window : globalThis);
