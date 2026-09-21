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
    'market.addName': "{name} +{n} trucks",
    'mk.addDesc': "Monthly truck limit +{n} for this contract (now {max}), refilled now too. Next add costs {next}c",
    'err.notSameCarrier': "Only applies to a contract with the same carrier",
    'err.notHigherGrade': "Upgrade only to a higher grade than you own",
    'log.upgradeContract': "Contract upgraded: {name} (-{price}c) · upgrades & remaining trucks kept",
    'log.addContract': "Contract added: {name} +{n} trucks/month, refilled now (-{price}c)",
    'slot.upgradeAsk': "Upgrade {name} to <b>{grade}</b>? Enhancements and remaining trucks are kept, monthly trucks increase.",
    "slot.addAsk": "Add trucks to {name}? Monthly limit <b>+{n}</b>, and this month's trucks are refilled <b>+{n}</b> right away.",
    'slot.upgradeBtn': "Upgrade",
    'slot.upkeepNote': 'Monthly upkeep for this grade: {n}c (part of operating cost)',
    'slot.addBtn': "Add trucks",
    'slot.replaceBtn': "Replace with new",
    'fmt.trucks': "{n} vehicle{n:|s}",
    'fmt.perTruck': "{fee}c per vehicle",
    'fmt.vehicleCap': "{vehicle} {cap} slots",
    'sum.fees': "Dispatch fees",
    'call.trucks': "{n} vehicle{n:|s} · load {vol}/{cap} slots",
    'call.addTruck': "Add a vehicle (+{fee}c)",
    'call.removeTruck': "Remove a vehicle",
    'call.fee': "Dispatch fee {fee}c (due at month end)",
    'call.net': "Net {net}c",
    'call.fillOk': "Load efficiency ✓ trust +1",
    'rush.preview': "BATCH OUT! Reward ×{mult} · bonus +{bonus}c",
    'rush.title': "BATCH OUT",
    'camp.title': "Marketing campaign",
    'camp.desc': "Pull in work yourself when the depot runs empty. Once per fortnight.",
    'camp.btn': "Run a campaign",
    'camp.effect': "{n} more parcels within {days} working days",
    'camp.used': "Already ran one this fortnight",
    'camp.needCash': "Need {n}c",
    'camp.toast': "📣 Campaign! {n} parcels inbound over {days} days",
    'log.campaign': "📣 Marketing campaign — {n} extra parcels over {days} working days (−{cost}c)",
    'rush.toast': "🔥 BATCH OUT! {n} parcels cleared at once · bonus +{bonus}c",
    'rush.float': "🔥 BATCH OUT +{n}c",
    'chain.title': 'PERFECT LOAD',
    'chain.armed': 'CHAIN ARMED',
    'chain.mult': '{n} CHAIN · REWARD ×{mult}',
    'chain.preview': '{n} CHAIN! Reward ×{mult} · bonus +{bonus}c',
    'chain.toast': '⚡ PERFECT LOAD ×{n} · bonus +{bonus}c',
    'chain.toastMax': '⚡ MAX CHAIN! bonus +{bonus}c',
    'why.loadChain': '3 perfect loads in a row',
    'chain.start': '⚡ PERFECT LOAD! The next full dispatch starts paying a chain bonus',
    'chain.perfect': 'PERFECT!',
    'chain.count': '{n} CHAIN!',
    'chain.max': 'MAX CHAIN!',
    'value.tier.1': 'High-value cargo',
    'value.tier.2': 'Express cargo',
    'value.tier.3': 'Premium cargo',
    'value.delivered.2': 'EXPRESS CARGO!',
    'value.delivered.3': 'PREMIUM JACKPOT!',
    'mission.amount': "This fortnight {now}/{target}c",
    'mission.next': '{left}c to {grade}',
    'mission.max': 'A GRADE',
    'mission.up': '{grade} GRADE! +{bonus}c',
    'mission.toast': "Fortnight target hit {grade} · growth bonus +{bonus}c",
    'call.simulMax': "Max {n} at once",
    'mk.vehicleLine': "{vehicle} <b>{cap}</b> slots · <b>{fee}</b>c per vehicle · <b>{trucks}</b>/month",
    'mk.gradeVs': "vs Standard: capacity {cap0}→{cap1} · {t0}→{t1}/month · fee {f0}→{f1}c · trust lv {lv} immediately",
    'grade.merit': "Premium contracts bring bigger vehicles, more dispatches, cheaper fees and instant trust perks",
    'mk.capLine': "{vehicle} <b>{cap}</b> cells × <b>{trucks}</b>/mo = <b>{total}</b> cells · {fee}c per truck (<b>{per}</b>c per cell)",
    'mk.monthTotal': "up to {total} cells/mo · {per}c per cell",
    'mk.forecastSum': "Next cycle ({m}) forecast: {min}-{max} parcels",
    'mk.forecastSumNow': "This cycle ({m}) forecast: {min}-{max} parcels",
    'mk.forecastBlocked': "⚠ Nothing you have can carry {list} — pick up a contract below that takes it",
    'mk.cantTake': 'Nothing you have can carry this',
    'mk.forecast': "Expected volume, month {m} (approx.)",
    'log.monthStart': '── {cal}/{y} {half:1st half|2nd half} begins ──',
    'log.prepMarket': 'Prep market: buy before month 1 starts (1 free refresh)',
    'log.bigCustomer': 'Big contract: {name} will send 60% of the volume',
    'log.custSuspend': '{name} suspended trade ({why}) — resumes next month',
    'log.custResume': '{name} resumed trade',
    'log.custLevel': '{name} trust level {level}!',
    'log.claim': 'Damages -{amount}c ({name}, {why}{covered})',
    'log.claimCovered': ', insurance covered {covered}c',
    'log.insurerChange': 'Insurer changed: {name}{fee}',
    'log.insurerFee': ' (sign-up fee -{cost}c)',
    'log.storageOffer': 'Storage offer: {name} {kind} {vol} cells · {turns#d} days · {pay}',
    'log.storagePrepaid': '{fee}c upfront',
    'log.storagePerTurn': '{perTurn}c/day, paid at pickup',
    'log.storageAccept': 'Storage accepted: {kind} {vol} cells (+{fee}c)',
    'log.storageDecline': 'Storage offer declined',
    'log.storageEarlyReturn': 'Storage returned early: refund {refund}c + penalty {pen}c',
    'log.storageCollect': 'Storage picked up: {kind}{pay}',
    'log.storagePostpaid': ' (+{pay}c on pickup)',
    'log.offerExpired': 'Storage offer expired',
    'log.strike': '⚠ {name} on strike this month: cannot call',
    'log.paid': '{name} paid +{amount}c ({count} parcels)',
    'log.heatAlert': ' 🌡Heat alert!',
    'log.arrive': '{date}: {list} arrived (usage {usage}%){note}',
    'log.wait': 'Day closed: today\'s dispatches are done and the next arrivals are received',
    'log.waitSelf': 'Self-delivered {count}, then closed the day (+{revenue}c, delivery cost -{cost}c)',
    'log.transitCert': 'Transit certificate used: no breakage on this call',
    'log.callAllBroken': '{name} call: all {broken} parcels broken!',
    'log.trustUp': '{name} reached trust level {level}! ({effect})',
    'log.spareCall': 'Spare driver dispatched (call without remaining calls)',
    'log.call': "{name} call: {count} shipped, +{revenue}c{delay}{broken}{refund} (fee {fee}c · {calls} left)",
    'log.callDelay': ' (paid in {delay#d} days)',
    'log.callBroken': ', {broken} broken',
    'log.callRefund': ' (bundle discount: call not consumed)',
    'log.callInstant': ' ⚡instant',
    'log.discard': 'Discarded: {short}{size} — {why}{pen}',
    'log.penalty': 'Reputation −{pen}: {reasons} (rep {rep})',
    'log.erosion': 'Unstable: {name} monthly dispatch -1',
    'log.settle': '{cal}/{half:1st half|2nd half} settlement: revenue {revenue}, operating cost {opCost}, fees {fees}{closing}',
    'log.settleClosing': ', closing bonus +{closing}',
    'log.gameOver': 'Game over: {reason}',
    'log.marketOpen': '{cal}/{half:1st half|2nd half} market open (buy up to {max})',
    'log.refresh': 'Market refreshed (-{cost}c)',
    'log.refreshFree': 'Market refreshed (free)',
    'log.buyContract': 'Contract bought: {name} (-{price}c){old}',
    'log.buyContractOld': ', {name} dropped ({calls} calls lost)',
    'log.hireContract': 'Rush-hired: {name} (-{price}c){old}',
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
    'over.rep': 'Your reputation ran out — nobody ships with you anymore',
    'over.bankrupt': 'Bankrupt — debt {debt}c exceeded the {limit}c short-term credit limit',
    'over.delivered': 'Not enough shipped: {n}/{need}',
    'over.discard': 'Too many spoiled: {n} (max {max})',
    'over.cash': 'Not enough cash: {cash}/{need}c',
    'over.overdue': 'Too many overdue deliveries: {n} (max {max})',
    'over.storage': 'Not enough storage contracts: {n}/{need}',
    'over.bigCustomer': '{name} trust level {level} (needs 3)',
    'over.win': 'You ran it all the way through — {cycles} cycles ({months} months)',
    'over.winStory': 'Handover done — the place is yours now',
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
    'err.notPlay': 'Can\'t hire right now',
    'err.sold': 'Already sold',
    'err.marketMax': 'Only {n} purchases per market',
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
    'note.express': 'express: +1 truck at once',
    'note.trust2': 'trust lv2 +1',
    'note.skip': 'skip bonus: +1 slot this truck',
    'note.waitStack': 'close-day bonus: +{n} slots this truck',
    'note.firstCall': 'local regular: +1 slot on first call this month',
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
    'how.title': 'What this game is',
    'how.1.t': 'Parcels pile up',
    'how.1.d': 'Parcels arrive every turn. Overflow goes out in the yard, and the yard gets rained on and robbed.',
    'how.2.t': 'Send one full truck',
    'how.2.d': 'Fill trucks past 80%. Keep doing it and PERFECT LOAD rewards climb to ×1.08, ×1.16 and ×1.24.',
    'how.3.t': 'Run out the term you took on',
    'how.3.d': 'Take over in March and run a quarter (3 months), a half-year (6) or a full year — your pick. Run out of cash or bottom out your reputation and it is over.',
    'how.4.t': 'Grow from D to A grade',
    'how.4.d': 'Every month has a revenue mission. Reaching C, B and A pays instant bonuses, while investments visibly upgrade your depot and trucks.',
    'how.note': 'The retiring manager will explain the rest as you go.',
    'how.go': 'Start',
    'title.name': 'God of the Dock',
    'title.sub': 'Parcel Warehouse Tycoon',
    'title.studio': 'DOO\'IN STUDIO',
    'title.continue': 'Continue',
    'fmt.monthTurn': '{m} · day {t}/{max}',
    'title.new': 'New Run',
    'title.codex': 'Codex',
    'title.codexSub': '{a}/{b} unlocked · achievements {c}/{d}',
    'title.records': 'Records',
    'title.recordsSub': 'Best {best} pts · {w}W {l}L',
    'title.help': 'How to Play',
    'opt.sound': 'Sound: {v}',
    'opt.music': 'Music: {v}',
    'opt.lang': 'Language',
    'title.confirmNew': 'A run is in progress. Starting a new one will erase it. Continue?',
    'title.newShort': 'Start new',
    'opt.on': 'On',
    'opt.off': 'Off',
    'cal.kr.name': 'Korea',
    'prep.calendar': '📅 {year} · {place} calendar',
    'prep.today': 'Today',
    'prep.dailyDone': 'Recorded today',
    'prep.win': 'Finish line',
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
    'fmt.lastSameYear': 'month {n}',
    'fmt.lastNextYear': 'month {n} next year',
    'fmt.pts': '{n} pts',
    'fmt.calls': '{n:# call|# calls}',
    'fmt.perMonth': '{n}c/mo',
    'fmt.count': '{n}',
    'fmt.turns': '{n#d:# day|# days}',
    'fmt.turnN': 'D{n}',
    'fmt.level': 'Lv {n}',
    'fmt.cells': 'size {n}',
    'prep.family': '{family} family',
    'prep.slotFull': 'You have {n} perk slots',
    'fmt.monthN': 'Month {n}',
    'hud.turn': '{d} {dow}',
    'hud.strike': 'Strike',
    'hud.familyPerk': '{family} perk',
    'hud.upcoming': 'Incoming',
    'hud.tomorrow': "Tomorrow",
    'hud.dayAfter': "The day after",
    'hud.today': "Today",
    'weather.season': "Season: {season}",
    'hud.monthEnd': 'Month end',
    'hud.weekend': 'Sunday',
    'hud.rep': 'Rep',
    'rep.tier.unknown': 'Unknown',
    'repi.tier': 'Current grade',
    'repi.toNext': '<b>{n}</b> to <b>{name}</b> — this grade spans {from}-{to}. Cross a settlement sitting at the cap and you move up.',
    'repi.top': 'Top grade.',
    'repi.ready': 'You are at the cap — clear this settlement without incident and you move up to <b>{name}</b>.',
    'repi.up': 'Goes up: sending trucks 80%+ full · customer trust rising · clearing a settlement with no incidents',
    'repi.down': 'Goes down: returns · theft · damage · spoilage · warehouse overflow · missed deadlines',
    'repi.nextHead': 'At {name}',
    'repi.nextScale': 'Arrivals +{arr}% · running costs +{op}% — bigger earnings, bigger board',
    'repi.nextCust': 'New customers: {list}',
    'repi.nextGoods': 'New goods: {list}',
    'repi.zero': 'At zero nobody sends you anything — the run ends.',
    'cust.locked': "Customers you haven't met — word of mouth brings them",
    'cust.openNow': 'can show up in the market now',
    'cust.needTier': 'from {name}',
    'sum.repTierUp': '⭐ Rank up — new customers will come looking',
    'log.repCustomers': '   New customers are taking notice: {list}',
    'rep.tier.local': 'Known locally',
    'rep.tier.ward': 'District name',
    'rep.tier.city': 'City-wide',
    'log.repTierUp': '⭐ Word got around — {name} (rep cap {cap})',
    'toast.repTierUp': '⭐ {name}',
    'why.repPenalty': 'an incident',
    'why.repMonthly': 'this month',
    'why.repFull': 'a full truck',
    'why.rush': "a successful batch shipout",
    'why.repCust': 'customer trust up',
    'why.repClean': 'a clean month',
    'fmt.date': '{cal}/{d}',
    'fmt.dateDow': '{cal}/{d} ({dow})',
    'fmt.dayN': '{d}',
    'fmt.cycle': 'M{cal} {half}',
    'fmt.half1': '1st half',
    'fmt.half2': '2nd half',
    'fmt.dows': 'Mon,Tue,Wed,Thu,Fri,Sat',
    
    'log.weekend': '🛌 Sunday the {d} — {choice}{extra}',
    'err.noOutdoor': 'Nothing is out in the yard',
    'story.rep.1': "See the gauge, top right? That's your <b>reputation</b> — how this neighborhood sees you.<br>Returns, theft, damage, spoilage, an overflowing yard all come out of there. Tap it and you'll see how far the next grade is.",
    'story.rep.1drop': "See the gauge, top right? That's your <b>reputation</b>. It just took a hit.<br>Returns, theft, damage, spoilage, an overflowing yard all come out of there. Tap it and you'll see how far the next grade is.",
    'story.rep.2': "There's a way up too. Send a full truck, raise a customer's trust, close a settlement with no incidents.<br>If it hits <b>zero, nobody ships with you</b>. That's the end of it.",
    'story.repUp.1': "Word got around — you moved up a rank. You're <b>{repTier}</b> now.<br>The cap went up with it, so one bad day won't empty the gauge.",
    'story.repUp.2': "More volume comes with it, and the rent goes up too. The whole thing gets bigger.<br>And customers who never called before will show up in the market. Check the customers screen to see who's left.",
    'story.cantHandle.1': "Look at that — <b>nothing can carry it.</b> Not one of our contracts will take it.<br>Leave it and it goes past its deadline and gets returned — no pay, and we owe damages.",
    'story.cantHandle.2': "Tap the parcel and it tells you which family of contract it needs. Buy that one at the next market.<br>Every family takes its own things — bulk only takes small plain ones, cold only fresh, large only the big stuff.",
    'story.bigParcel.1': "A big one came in. Four cells <b>won't fit a bulk van</b> — you need a large, rail or sea contract.<br>Self-delivery won't take it either. Pick up a large contract at the market.",
    'story.special.produce': "🌾 Produce. In a heatwave it spoils even indoors — it needs a free cold slot or a vent.<br>Bulk, cold and rail will carry it, and you can self-deliver it too.",
    'story.weekend.1': "Weekend. Stuff still arrives at the warehouse, but the trucks don't run.<br>So no calls until Monday. Deadlines pause too — they count business days.",
    'story.weekend.2': "The yard is the problem. Anything out there sits through both days — count on one extra theft roll.<br>Clear the yard before the weekend. So, what'll it be?",
    'story.weekendYard.1': "You've got {outdoor} cells out in the yard today. They sit there all Sunday — one extra theft roll.<br>If you've got the cash, a guard is often cheaper than what you'd lose. If not — clear it on Saturday next time.",
    'wk.title': '🛌 Sunday',
    'wk.head': '{cal}/{d} · Sunday',
    'wk.sub': 'Nothing ships on Sunday — no arrivals, no deadlines (they count business days) — but <b>anything left in the yard takes one more theft roll</b>.',
    'wk.outdoor': '🌧 <b>{vol}</b> cells out in the yard · theft {pct}%',
    'wk.safe': '✔ The yard is empty',
    'wk.rest': 'Rest',
    'wk.rest.d': 'Rep +1',
    'wk.rest.done': 'rested',
    'wk.overtime': 'Overtime',
    'wk.overtime.d': '+2 self-deliveries next business day · rep −1',
    'wk.overtime.done': 'worked the weekend',
    'wk.parttime': 'Weekend guard',
    'wk.parttime.d': '{cost}c · no theft this Sunday',
    'wk.parttime.done': 'hired a guard',
    'wk.go': 'To Monday →',
    'hud.outdoor': '🌧 Outside {vol} cells ({n}{storage}) · theft this turn {pct}%',
    'hud.outdoorStorage': '+storage',
    'hud.outdoorTag': '🌧 Outside',
    'hud.outdoorLabel': 'Yard',
    'storage.left': 'pickup in {n#d}d',
    'hud.buyInMarket': 'Buy a contract in the market',
    'hud.spare': 'Spare',
    'hud.loadCells': '{vol}/{cap}{more}',
    'hud.netLine': "+{rev}c −{fee}c = <b>{net}c</b>",
    'hud.perNone': 'nothing to load',
    'hud.contractSub': "<b>{vol}</b>/{cap}{more} to load · {fee}c",
    'hud.noTurn': 'no turn',
    'hud.simulN': '{n} at once',
    'hud.regular': 'regular',
    'hud.express': 'express',
    'wait.overdue': '⏳overdue {n}',
    'wait.spoil': '🥀spoil {n}',
    'wait.frozenOver': '❆no freezer {n}',
    'wait.btn': '📦 End Day · Self-deliver',
    'wait.btnRest': "🛌 Rest",
    'wait.btnPlain': '📦 End Day',
    'wait.next': 'After next arrivals {used}/{cap}{over}',
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
    'weather.head': 'Season: {season} · forecast {n#d} days ahead (forecasts are exact)',
    'weather.tent': 'Tent: no wetting',
    'weather.note': 'Parcels stored outside are hit hardest by weather. Heat waves also spoil 🌾 produce inside the warehouse (safe in the cold zone or with ventilation).',
    'up.frozenOk': '❆ freezer OK',
    'up.frozenNo': '❆ no freezer space → discarded on arrival',
    'up.coldOk': '❄ cold zone OK',
    'up.coldNo': '❄ no cold space → room temp',
    'up.customs': '🛃 customs {n#d:# day|# days}',
    'up.burst': '⚡ surge (deadline -2)',
    'up.title': 'Arriving {date}',
    'up.volume': 'Volume <b>{vol}</b>',
    'common.warehouse': 'Warehouse',
    'up.heat': '🌡 Heat alert turn: fresh/frozen outside cold zones discarded immediately',
    'up.note': 'Arrival order is fixed; customs and cold-zone assignment are decided on arrival.',
    'btn.close': 'Close',
    'common.none': 'none',
    'fmt.calMonth': "<small class='yr'>{y}</small>M{cal}",
    'story.name': 'Park',
    'story.skip': 'Skip ×',
    'story.next': 'Next ▶',
    'story.ok': 'Got it',
    'story.tapHere': 'Tap here',
    'story.name.yeo': 'Yeo',
    'story.name.noh': 'Noh',
    'story.name.kang': 'Kang',
    'story.name.rep': '{center} rep',
    'story.firstCall.rep': 'Thanks for the first dispatch, boss! The fuller you load us, the better for both of us. Call again anytime.',
    'story.loss.rep': 'Boss, the incident\'s logged. Unless it\'s on us, the claim goes to the customer. Please keep to the deadlines next time.',
    'rep.switch': 'Your contract with {from} ends here. Their leftover trucks can\'t be returned — from now on, you\'re with us.',
    'rep.greet.generic': 'This is {center}. {vehicle}, {cap} cells, {fee}c per truck, {trucks} trucks to start. When you run out, refill at the market.',
    'rep.greet.bulk': 'Yeo from {center}! {vehicle}, {cap} cells at {fee}c per truck, {trucks} trucks. Send us all your plain parcels — full trucks are the cheapest per parcel.',
    'rep.greet.bulk.2': 'Yeo from {center}. These trucks are padded, so ⚠ fragile rides safe too. {cap} cells, {fee}c per truck, {trucks} trucks.',
    'rep.greet.bulk.3': '{center}, Yeo here. We can send two trucks at once. {trucks} padded trucks of {cap} cells, {fee}c each. Volume won\'t be your problem anymore.',
    'rep.greet.cold': 'Kang from {center}. {vehicle}, {cap} cells, {fee}c per truck, {trucks} trucks. Fresh goods start dying the moment they leave the cold zone. Don\'t call late.',
    'rep.greet.cold.2': 'Kang from {center}. This truck has a freezer compartment — ❄ cold and ❆ frozen ride together. {cap} cells, {fee}c per truck, {trucks} trucks.',
    'rep.greet.frozen': 'Kang from {center}. Frozen is gone the moment it leaves the freezer, so batch them up when you call. {cap} cells, {fee}c per truck, {trucks} trucks.',
    'rep.greet.large': 'Noh, {center}. Big stuff doesn\'t break on my truck. {cap} cells, {fee}c a truck, {trucks} trucks lined up. Only send me the size-4-plus ones.',
    'rep.greet.large.2': 'Noh, {center}. This one\'s a reefer heavy truck — ❄ big fresh goods ride too. {cap} cells, {fee}c a truck, {trucks} trucks.',
    'rep.greet.rail': 'Noh, {center}. A train takes {cap} cells in one go. The money comes next turn, though. {trucks} runs, {fee}c each.',
    'rep.greet.rail.1': 'Noh, {center}. Express freight — you get paid right away. {cap} cells, {fee}c a run, {trucks} runs.',
    'market.refillName': 'Refill {name} trucks',
    'market.switchHint': 'Switch from {name} (higher-tier center, same line)',
    'err.refillFull': 'Trucks are already full',
    'log.refill': 'Refill: {name} to {n} trucks (-{price}c){wasted}',
    'log.refillWasted': ' · {n} leftover trucks wasted',
    'mk.refillDesc': 'Refills this contract to {max} trucks (now {calls}). Flat price, so leftover trucks are wasted — use them up before refilling.',
    'mk.refillWaste': '⚠ {n} trucks still left — refilling now wastes {n}',
    'mk.tierVs': 'vs. line standard: {cap0}→{cap1} cells · {t0}→{t1} trucks · {f0}→{f1}c/truck',
    'mk.detail': 'Details',
    'mk.refillBtn': 'Refill {price}c',
    'cd.family': 'Line: {name} · {tier}',
    'cd.refillLine': 'Full refill {price}c (at the market)',
    'toast.refill': 'Refilled: {name} {n} trucks',
    'slot.switchAsk': 'Ends the {from} contract and signs with <b>{to}</b>. The {calls} leftover trucks are lost, and trust starts from 0 with the new center.',
    'slot.switchBtn': 'Switch',
    'story.calendar': '📅 Calendar',
    'story.intro.1': 'Welcome. As of today, you\'re the boss here.<br>What you\'ve taken on is <b>{runCycles} cycles, {runMonths} months</b> — we start in month {startCal}, and <b>run it to {lastLabel} and the handover is done. The place is yours.</b><br>I\'ll stick around to nag until then. Hit that × if you\'d rather not hear it.',
    'story.intro.2': 'Those boxes are not inventory. They are <b>money that has not become cash yet</b>.<br>Miss the ⏳ and the rate gets cut; wait longer and returns and claims detonate together. The warehouse floor is your timer.',
    'story.intro.3': 'A {name} truck costs {fee}c whether it carries one box or groans at the axle.<br>Ship timidly and fees bleed you dry. Hold too long and the depot bursts. <b>Stockpile, calculate, detonate.</b> Close up for today.',
    'story.usage.1': 'That gauge is the warehouse. Up to 60% is comfortable, past 75% you start paying attention, past 90% boxes pile up outside.<br>Outside is… a story for later.',
    'story.callReady.1': 'Worth calling now. See what the button says — <b>{readyVol}/{readyCap} to load · {readyFee}c</b>?<br>One truck holds {readyCap} cells, and right now {readyVol} cells of parcels can ride this contract. Every truck you call costs {readyFee}c.',
    'story.callReady.2': 'So the fuller you send it, the cheaper each parcel gets. <b>Half full is break-even</b>; past 80% the carrier\'s trust goes up too.<br>Tap {ready}. I\'ll point at what to press in there.',
    'story.callModal.2': '<b>{openCalls}</b> on the right is how many dispatches you have left this month. <b>×{openSimul}</b> is how many trucks you can send at once — if you are short on dispatches, that is your ceiling.',
    'story.callModal.3': 'Hit \'Auto-pick urgent\'. It loads the most urgent first, but <b>only as far as a full truck</b>.<br>Calling a half-empty second truck just burns another dispatch fee. If you still have to send it, pick it by hand.',
    'story.weatherDetail.1': 'That row is this month\'s weather. Turns with an icon are confirmed; <b>?</b> means nobody knows yet.<br>Rain only soaks what sits in the yard, but a heatwave spoils the 🌾 produce inside the warehouse too.',
    'story.weatherDetail.2': 'So you read the forecast and move things early. <b>Restack</b> lives inside <b>End Day</b> — pricey goods inside, rain-proof ones out.',
    'story.handOff.1': 'That is the basics covered. Take the rest of the month yourself — call when it piles up; when today\'s work is done, end the day. That is the whole job.<br>I will chime in when something new shows up.',
    'story.m2Detail.1': 'The <b>customer</b> at the top is who sent it. Ship it on time and their trust goes up; higher trust means more volume and a better rate.<br>Scrap it and you lose 3. Do that often and they stop calling.',
    'story.m2Detail.2': 'Look at <b>contracts that can handle this</b> below. It shows which trucks can take the parcel — and why the others cannot.<br>When in doubt, tap a parcel and check here.',
    'coach.waitQuiet': '{vol} cells · a {name} truck holds {cap}',
    'coach.readyQuiet': '{pct}% full · {name} is worth calling',
    'story.waitFirst.1': 'Today\'s work is done. Hit <b>End Day</b> to move to the next business day and receive new parcels.',
    'coach.wait': 'Dispatching is done today. {vol} cells now, a {name} truck holds {cap} — <b>end the day and receive the next arrivals</b>.',
    'coach.ready': '{pct}% full now — tap {name} and call the truck.',
    'coach.stuck': "{n} {list} can't ship with what you have — tap one to see which contract it needs",
    'coach.full': 'Warehouse is full. Wait any longer and it piles up outside — call now.',
    'coach.noContract': 'No contract yet. Buy one at the market before you can call a truck.',
    'call.fillLow': '⚠ {pct}% loaded · {need} more cells to hit 80%',
    'story.callModal.1': 'That number from the button is drawn out here as the <b>gauge</b>: {openVol}/{openCap} cells — how full one truck gets.<br>Once on the button, once in here. No need to work it out outside; just open this and look.',
    'story.callGo.1': 'Loaded? Past 80% on the gauge you\'re making money. Tap the list below to add or remove.',
    'story.callGo.2': 'Good — now the Call button. Calling moves the day along.',
    'story.firstCall.1': 'Nice. What just popped up is your net — income minus the dispatch fee.',
    'story.firstCall.2': 'Fill a truck past 80% and that\'s \'load efficiency\': carrier trust +1.<br>Trust is an April topic. For now, just remember: full trucks are good.',
    'story.rushReady.1': 'Stop. The gauge is on fire. The depot hit critical mass — this is no longer a one-truck job. <b>Clear the whole board.</b>',
    'story.rushReady.2': "A batch shipout adds two temporary truck slots. Fill several and clear it in one hit for 35% more. Miss, and all you keep is the overflow.",
    'story.rushHit.1': "Hear that? Shutters, engines, and payment alerts all at once. <b>That is a batch shipout.</b>",
    'story.rushHit.2': 'The safe little shipments are over. Pull demand with marketing, hold it with storage, then blow it all out with trucks. Bigger next time.',
    'story.deadline1.1': 'That one\'s due tomorrow. Miss it and the pay drops by a quarter; two more turns and it\'s returned.<br>Returned means no pay and a claim. Ship the urgent ones, urgently.',
    'story.usage76.1': 'Warehouse is three-quarters full. From here on, move based on what\'s coming in.',
    'story.usage76.2': "See that row up top? That's <b>tomorrow and the day after</b> — what comes in and how much.<br>Read it, then decide: end the day or call a truck.",
    'story.usage91.1': 'Whoa, you\'re about to overflow! Anything past capacity goes to the yard, and the yard gets robbed.<br>Call every truck you can right now.',
    'story.summary1.1': 'First month\'s settlement. Look at the cost breakdown — rent {rent}c, contract upkeep, facilities, labor.<br>Rent doesn\'t budge. The only thing you can save is dispatch fees.',
    'story.summary1.2': 'That\'s why I keep saying: fill the truck. Next up, the market. Contracts are only sold there.',
    'story.market1.1': 'This is the market. Contracts are bought here, once a month.<br>A contract = "the right to call this carrier\'s trucks N times a month".',
    'story.market1.2': 'Each card lists truck capacity, fee per truck, and truck count. Dispatches get used up and don\'t come back with a new cycle — only a full refill here.',
    'story.market1b.1': 'In April customers start sending special goods, so keep the cold zone empty.',
    'story.marketFc.1': 'Tap the <b>forecast</b> line. It shows roughly what\'s coming next cycle and how much.',
    'story.marketFcOpen.1': 'Per customer, how many — and which special parcels, how many of each.<br>What isn\'t listed isn\'t coming. What is listed, you\'d better <b>be ready to receive</b>. Use it to top up dispatches and buy the contract you\'re missing.',
    'story.marketBlocked.1': 'Look — the red line. <b>{fcBlocked}</b> is coming and none of your contracts will take it.<br>Buying after it arrives is too late. Fix it here, now.',
    'story.marketPremium.1': 'This one\'s a <b>premium</b> grade. Same family, bigger truck, more dispatches — {premCap0} cells x{premTrucks0} becomes {premCap1} cells x{premTrucks1}.<br>The card spells it out under \'vs. family standard\'. Costs {premPrice}c though. Talk to me when you have money to spare; standard is plenty for now.',
    'story.m2.1': 'April. Time we talked about customers.',
    'story.m2.2': 'Tap one of the parcels. Who sent it and where it can go — it is all written in there.',
    'story.special.cold': '❄ Fresh goods. They go into the cold zone automatically — but if the zone\'s full and they end up outside, they spoil in a day.<br>Send them by reefer truck and you get the bonus too.',
    'story.special.fragile': '⚠ Fragile. Any truck can carry it, but without a padded van there\'s a chance it breaks.<br>Broken means you pay.',
    'story.special.customs': '🛃 Customs goods. Two turns stuck at the border — can\'t touch it, it just takes up space.<br>The deadline starts after clearance.',
    'story.special.frozen': '❆ Frozen. The moment it leaves the freezer, it\'s gone. Freezer trucks only.',
    'story.noContract.1': 'That parcel — none of your contracts can carry it. Tap End Day: before closing, I can haul one myself with self-delivery.',
    'story.noContract.2': 'It costs a bit, but less than a return. The real fix is buying the right contract at the next market.',
    'story.waitSelf.1': 'This list is what you can haul yourself. Pick one — the cost is right there.',
    'story.waitGo.1': 'Picked? The button below. You carry that one yourself, then close for the day.',
    'story.offer.1': 'The moving company wants to rent space. Moving season — these offers come often.<br>No truck needed; you just hand over cells and collect a storage fee.',
    'story.offer.2': 'The catch: your warehouse shrinks by that much. Take it only when there\'s room. In a pinch you can end it early — with a penalty.',
    'story.cash.1': 'The cash number up top isn\'t what you hold — it\'s the <b>projected month-end balance</b>. Dispatch fees don\'t leave mid-month; they all go out at settlement.<br>You\'ll never be blocked from calling a truck for lack of cash.',
    'story.cash.2': 'Red means you\'ll be short at month end. The gap becomes a short-term loan at {interest}% interest.<br>Two months in a row hurts, so ship more this month.',
    'story.summary2.1': 'Look at income per customer below. Lean on one customer and you fall when they do. Keep two legs.',
    'story.market2.1': "See the 'Refill' button on each contract up top? Flat price, so use them up before refilling. When a bigger center in the same line shows up you can switch — new rep, trust from zero.<br>Expansions get pricier every step — don't put them off.",
    'story.m3.1': 'May, Family Month. More gift boxes — fragile ones.',
    'story.m3.2': 'Breakage means claims, so let\'s talk insurance. See the insurer in the HUD? You pick one at the market.<br>No claims and the premium drops.',
    'story.fragileRisk.1': 'Fragile goods but no padded van. The call screen shows the break chance and the claim amount up front.<br>"25% means one in four you pay for" — decide on that number.',
    'story.loss.1': 'Ouch, an accident. A discarded parcel pays nothing and the customer files a claim.',
    'story.loss.2': 'With insurance you get part of it back. Without, pick an insurer at the market.<br>Stress went up too — when that gauge fills, it\'s over.',
    'story.rain.1': 'Rain in the forecast. You\'ve got {outdoor} cells out in the yard — wet parcels pay 20% less. Cold and frozen don\'t care.',
    'story.rain.2': 'Tap the weather icon. It shows what is coming for the next few turns.',
    'story.rainReorder.1': 'That\'s Reorder. On rainy days: pricey stuff inside, whatever can get wet outside.',
    'story.win.1': 'Parcels here move in half-month cycles. Your share is {runCycles} of them — we started in month {startCal}, so it runs to {lastLabel}.',
    'story.win.2': 'Get through month {lastCal}\'s rush and you\'re the real boss. It isn\'t winning or losing — it\'s being handed the keys. Scores and all that come after.',
    'story.win.3': 'If debt passes the limit or stress maxes out before then… well, you start over.',
    'story.summary3.good': 'Three-month report card. Delivered {delivered}, accidents {returned}, full trucks {full}. In the black — well done.<br>Volume jumps from June, so put what you earned into contracts and the warehouse.',
    'story.summary3.bad': 'Three-month report card. Delivered {delivered}, accidents {returned}, full trucks {full}. A bit tight.<br>Volume jumps from June — add trucks first, and always send them full.',
    'story.farewell.1': 'Three months. <b>That\'s the handover done.</b><br>When you got here you asked me before calling a single truck. It runs without you asking now.',
    'story.farewell.2': 'I pinned the calendar on the office wall. September holiday, November sale, December year-end — watch those three.<br>Tap the month number up top to see it any time.',
    'story.farewell.3': '<b>This warehouse is yours now. Look after it.</b><br>I\'ll text if it\'s urgent. Coffee\'s on you.',
    'story.startTitle': 'Handover',
    'story.startBody': 'Take over Local Parcel for <b>three spring months (a quarter — 6 cycles)</b>. The retiring manager <b>Park</b> stays the whole way and explains the rules one at a time.<br>Finish it and the longer runs — half-year, full year — open up. Nothing is forced: skip any line, or turn him off in the menu.',
    'story.diffAsk': 'Difficulty',
    'story.start': 'Start',
    'story.trucks2.1': 'You\'ve got <b>{vol} cells</b> to load and one truck holds {openCap}. So it booked <b>{trucks} trucks</b>.',
    'story.trucks2.2': '{trucks} trucks means {trucks} dispatches gone and a {callFee}c fee. But it all ships at once.<br>Over 80% on that gauge and even a few trucks pay off.',
    'story.callsOut.1': '{outName} is out of dispatches. Parcels to ship, no truck to call.',
    'story.callsOut.2': 'Dispatches don\'t refill at month start. You buy a full refill at the <b>market</b> after settlement.<br>Until then, use another contract or self-deliver before ending the day.',
    'story.marketRefill.1': 'Look at <b>Current contracts</b> up top. That\'s the only place dispatches get refilled.<br>{refillName} has {refillLeft} left, and a full refill runs {refillPrice}c.',
    'story.marketRefill.2': 'Flat price, however many are left. So <b>use them up, then refill</b> — that\'s the cheap way.<br>{refillPrice}c fills it back to {refillMax}.',
    'story.marketLimit.1': 'There\'s also a way to raise the ceiling. <b>{limitName}</b> — {limitPrice}c for a permanent +{limitN} dispatch limit on that contract.<br>A refill tops up the cup; this one buys a bigger cup.',
    'story.marketSwitch.1': '{switchName} is a step up from {switchFrom}. {switchCap}-cell trucks, {switchTrucks} dispatches — same job, more of it, cheaper.',
    'story.marketSwitch.2': 'Switch, though, and the {switchLeft} dispatches left at {switchFrom} vanish, and trust starts from zero.<br>That\'s why I said: burn them first, then switch.',
    'title.tutorAsk': 'Start with the Handover?',
    'title.tutorBody': 'The retiring manager walks you through the first three months. A new run is much easier once you know the rules.',
    'title.tutorGo': 'Start Handover',
    'title.tutorSkip': 'New run anyway',
    'title.newHint': 'handover first',
    'intro.1': "For twenty years one man raised the shutter of Hanseong Depot.",
    'intro.2': 'Mr. Han. Started with a single handcart.',
    'intro.3': 'I unloaded under him.',
    'intro.4': "Last week, for the first time, he could not raise it.",
    'card.han.name': 'Mr. Han',
    'intro.skip': 'Skip ▸',
    'intro.5': "— “Take it for a fortnight. Just run it the way it runs.”",
    'intro.6': "If it went well, he said, we would talk after that.",
    'intro.7': 'Today is day one.',
    'story.name.han': 'Mr. Han',
    'story.name.mart': 'Kim, Big Mart',
    'story.l1first.3': 'Fuller truck, bigger share. For now that\'s the whole job.',
    'story.progressHud.1': "The <b>fortnight target</b> is your scorecard for these two weeks. Hit C, B or A and the growth money lands straight away.",
    'story.progressHud.2': "Keep loading over 80% and the <b>Perfect Load</b> chain builds. Wait a day, or send one light, and it breaks.",
    'story.chainHit.1': "Perfect Load! Keep making the same call and the reward keeps climbing.",
    'story.chainHit.2': "Chain income feeds the fortnight target too. Push it to A.",
    'story.l1last.2': "Good work these two weeks. Not bad at all for a first go.<br>Finish it like this and Mr. Han will be pleased.",
    'story.l1intro.1': "There you are. Mr. Han told me — this fortnight is yours.<br>You used to unload; now you raise the shutter. Stay close and watch.",
    'story.l1intro.2': "One call to Hangil is <b>{nowFee}c</b> — the same {nowFee}c whether you load one crate or fill the deck.<br>Right now the depot holds {nowCount}, and sending all of them pays <b>{nowRev}c</b>.<br>Paying {nowFee}c to collect {nowRev}c leaves you <b>{nowLoss}c down</b>. Let's just <b>close the day</b>.",
    'story.l1call.1': 'Now it is worth calling. That button says <b>{readyVol}/{readyCap}</b>.',
    'story.l1call.2': "Call now and you collect <b>{nowRev}c</b> against a {nowFee}c fee — <b>{nowNet}c left over.</b><br>Same {nowFee}c as day one. It pays because you stacked it first. Go on, tap it.",
    'story.l1callPick.1': "Yeo, from Hangil Logistics. One call runs <b>{nowFee}c</b>.<br>See the gauge up top — the back is what one truck holds, the front is what would go on it now.",
    'story.l1callPick.2': "The urgent ones are <b>already loaded</b>, as many as the truck takes. Send it as it is.<br>Calling takes the day.",
    'story.l1first.1': 'Good. What\'s left after the dispatch fee is yours.',
    'story.l1first.2': 'Got it, thanks! Fill it up like that and we do well too.',
    'story.l1free.1': "That's the basics. Pile up, then call. When today's work is done, end the day and receive the next arrivals.<br>Nothing new to start — just run it the way Mr. Han ran it. The rest is yours.",
    'story.l1due.1': 'Look at what came in today. See the date on it?',
    'story.l1due.2': 'The ⏳ is on now — that number is days left.<br>Nothing was urgent until now, so nothing had one.',
    'story.l1deadline.1': 'That one is due tomorrow. Miss it and the pay drops; two more days and it goes back.',
    'story.l1summary.1': 'Two weeks\' settlement. Income minus dispatch fees minus rent.',
    'story.l1summary.2': 'Rent doesn\'t budge. Dispatch fees are the only thing you control.',
    'story.l1usage.1': 'Warehouse is filling up. Overflow goes out to the yard — we\'ll talk about that later.',
    // ----- Chapter 1 (May-June): dispatches are consumable, the market, two trucks -----
    'story.l2intro.1': "You saw the fortnight through. Mr. Han wrote, didn't he — keep it through the spring.<br>So let's talk about running the place properly.",
    'story.l2intro.2': "See the <b>blue ticks</b> that appeared on the right of the contract card?<br>Mr. Han used to handle that, so you never had to look at it.",
    'story.l2intro.3': "That is <b>how many calls you have left</b>. One goes every time you call a truck.<br>What Mr. Han bought ahead is exactly that much.",
    'story.l2calls.1': 'There \u2014 one less. Run that to zero and the freight just sits there.',
    'story.l2callsOut.1': 'Dispatches are at zero. Plenty to send, no truck to send it on.',
    'story.l2callsOut.2': 'It does not refill at the start of the month. <b>You buy it.</b><br>After this month\u2019s settlement I\u2019ll show you where.',
    'story.l2market.1': 'This is the market. Everything that makes the depot bigger is bought here.',
    'story.l2mission.1': "And this one — <b>the fortnight target</b>. How much you earn in these two weeks.<br>Pass a mark and you move D to C to B to A, with a bonus each step.",
    'story.l2mission.2': "Next to it is <b>Perfect Load</b>. Send them over 80% full, back to back, and a multiplier stacks up.<br>One light load and it breaks.",
    'story.l2chain.1': "See that? <b>Perfect Load</b>. Full dispatches back to back, so the multiplier kicked in.",
    'story.l2chain.2': "That extra goes straight into the fortnight target too. One good call pulls the next reward closer.",
    'story.l3rushReady.1': "The depot is full. A <b>batch shipout</b> is ready — two extra trucks can join right now.",
    'story.l3rushReady.2': "Fill several and clear the floor in one hit for 35% more.<br>Fail to clear it and the next arrivals bury the yard. Your call.",
    'story.l3rushHit.1': "Yes — that! You just turned a whole warehouse into cash.",
    'story.l3rushHit.2': "That is a <b>batch shipout</b>. A full depot isn't only a threat — stack it, then clear it in one go, and it pays the most.",
    'story.l3invest.1': "That <b>Invest</b> panel down there — time you started using it.<br>It puts what you earn back into the depot, the trucks, the marketing.",
    'story.l3invest.2': "Marketing runs as a <b>campaign</b> — open one and the work piles in within days.<br>An idle depot is the worst waste there is. When it empties, go pull the work in yourself.",
    'story.l2market.2': 'Refills, contract limits, warehouse space — what\'s on offer shifts fortnight to fortnight,<br>and there\'s a cap on how much you can buy in one visit.',
    'story.l2refill.1': 'This is a refill. Flat price \u2014 so topping up while you still have dispatches left <b>throws the rest away</b>.',
    'story.l2refill.2': 'You\u2019re at zero, so nothing is wasted. Go on, press it.',
    'story.l2limit.1': 'This raises the limit. A refill fills the bowl; this one <b>makes the bowl bigger</b>.<br>Buy it once and it stays.',
    'story.l2two.1': 'Two trucks. One wouldn\u2019t hold it, so a second came along.',
    'story.l2two.2': 'Two dispatches and two fees, mind. Unless it\u2019s urgent, one full truck is cheaper.',
    'story.l2cap.1': 'Warehouse expansion. You saw what overflow looks like \u2014 the yard has no roof.<br>It only gets pricier, so buy early if you\u2019re buying.',
    'story.l2usage.1': 'Warehouse is nearly full. Anything over goes out to the yard.',
    'story.l2last.1': 'Last half-month. Summer brings its own trouble \u2014 but that keeps.',
    // ----- Chapter 2 (July-August): the rains, the yard, self-delivery, trust -----
    'story.l3intro.1': 'Rainy season\u2019s in. Summer is our busiest and our worst.',
    'story.l3intro.2': 'See that row up top? The <b>next few days\u2019 weather</b> shows ahead of time.<br>From here on you move by that.',
    'story.l3forecast.1': 'There \u2014 rain marked. Best to have the warehouse clear by then.',
    'story.l3yard.1': 'Warehouse overflowed. What doesn\u2019t fit goes out to the <b>yard</b>.',
    'story.l3yard.2': 'The yard is ours too, but it has no roof.<br>Anything tagged <b>outdoor</b> in the list is sitting out there.',
    'story.l3rain.1': 'Listen \u2014 {outdoor} cells out in the yard and rain coming.<br>Wet freight pays <b>20% less</b>. No claim, but it stings.',
    'story.l3rain.2': 'Press End Day. Before closing, you can move things in and out.',
    'story.l3reorder.1': 'This is <b>restacking</b>. You choose what goes inside and what stays out.<br>Cheap and not urgent \u2014 that\u2019s what stays out.',
    'story.l3theft.1': 'Gone. The yard has no door.',
    'story.l3theft.2': 'Leave things out long enough and this happens. A yard fence helps.',
    'story.l3self.1': 'No truck. That\u2019s what <b>self-delivery</b> is for \u2014 I carry one before we close for the day.',
    'story.l3self.2': 'Costs a bit, but it beats a return. Press End Day.',
    'story.l3selfPick.1': 'Pick what you\u2019ll carry today. Small only \u2014 two cells at most.',
    'story.l3trust.1': 'About time I showed you this. <b>Trust</b>.',
    'story.l3trust.2': 'You\u2019ve run with Hangil near half a year. That\u2019s what built up.<br>The second truck, the cheaper dispatch \u2014 that was all this.',
    'story.l3trust.3': 'It climbs every time you send a full truck, and each tier hands you something.',
    'story.l3switch.1': 'There\u2019s an offer to switch contracts up there. Bigger truck, more dispatches.',
    'story.l3switch.2': 'But <b>trust starts at zero</b>, and the dispatches you have left go with it.<br>You\u2019d be throwing away half a year. Weigh it.',
    'story.l3yardBuy.1': 'Yard fence. Cuts down on what walks off.<br>If you\u2019re going to overflow all summer, buy it.',
    'story.l3last.1': 'Rains are easing. Autumn brings different freight \u2014 we\u2019ll get to that.',
    // ----- Chapter 3 (Sept-Oct): cold freight, fragile freight, named shippers -----
    'story.l4intro.1': 'Autumn. What comes in changes from here.<br>Until now it was all just boxes. Now some of it <b>spoils</b> and some of it <b>breaks</b>.',
    'story.l4intro.2': 'And one more thing \u2014 you can see who sent it now.',
    'story.l4cust.1': 'See that mark beside the parcel? That\u2019s the <b>shipper</b>.<br>It was all walk-ins before; now named firms use us too.',
    'story.l4cust.2': 'Keep sending one firm\u2019s freight on time and their trust builds.<br>More volume, better rates. It\u2019s under the <b>shippers</b> button.',
    'story.l4warn.1': 'Look at this. <b>\u2744 chilled</b> is coming next half and we\u2019ve nowhere to put it.',
    'story.l4warn.2': 'Cold needs somewhere to sit and something to carry it. Buying after it lands is too late.',
    'story.l4coldCar.1': 'A cold-chain contract. That solves the <b>carrying</b> half.<br>Hangil won\u2019t take chilled \u2014 each family takes what it takes.',
    'story.l4coldFac.1': 'And this is the <b>sitting</b> half \u2014 a chilled section inside the warehouse.',
    'story.l4coldFac.2': '\u2744 left outside spoils in a day. When the chilled section fills, the rest spills into the warehouse, and it doesn\u2019t last long there either.',
    'story.l4cold.1': 'There it is, \u2744 chilled. With a chilled section it goes straight in.',
    'story.l4cold.2': 'See the <b>chilled</b> bar up top? You don\u2019t want that full.',
    'story.l4coldFull.1': 'Chilled is full. Anything more spills out, and what spills spoils.<br>Send the cold ones first.',
    'story.l4fragile.1': 'The ones marked \u26a0 \u2014 those break.',
    'story.l4fragile.2': 'Any truck will take them, but there\u2019s a <b>breakage chance</b>, and you pay for breakage.<br>A fragile-family contract or a padding clause removes it.',
    'story.l4risk.1': 'There\u2019s a \u26a0 in what you picked. See the odds and the payout there?<br>Take the risk if it\u2019s urgent; otherwise wait for the right truck.',
    'story.l4produce.1': '\ud83c\udf3e is produce. Leave it outside on a hot day and it turns.<br>It\u2019s cool now, but remember it come summer.',
    'story.l4break.1': 'Broken. That\u2019s what odds are.',
    'story.l4break.2': 'If it keeps happening, the right contract is the cheaper way. Do the sums.',
    'story.l4custUp.1': 'Their trust went up a tier! More volume, better rates.',
    'story.l4custUp.2': 'Lean on one firm and you fall with them. Spread it.',
    'story.l4last.1': 'Autumn\u2019s nearly done. Winter is\u2026 different. Another time.',
    // ----- Chapter 4 (Nov-Dec): reputation, insurance, storage, oversize -----
    'story.l5intro.1': 'November. Kimjang, the sales, then the year-end \u2014 the two busiest months we have.',
    'story.l5intro.2': 'You\u2019ve come far enough for this talk. That bar, top right \u2014 it shows from today.',
    'story.l5rep.1': 'That\u2019s your <b>reputation</b>. What this neighbourhood thinks of the depot.',
    'story.l5rep.2': 'Returns take from it. So does losing or breaking things.<br><b>At zero it\u2019s over.</b> Nobody leaves anything with you, and the run ends.',
    'story.l5rep.3': 'Send full trucks and clear a settlement without incident and it climbs.<br>Fill the bar and your tier rises \u2014 bigger firms come. So do bigger volumes and bigger rent.',
    'story.l5repDrop.1': 'That took some reputation. Once is nothing; let it stack and it really does end.',
    'story.l5repUp.1': 'Tier\u2019s up! They know our name past this neighbourhood now.',
    'story.l5repUp.2': 'More volume, higher rent. A name isn\u2019t free.',
    'story.l5bigWarn.1': 'Next half brings <b>oversize</b> \u2014 four cells, moving-house stuff.<br>It does not fit our truck.',
    'story.l5bigCar.1': 'An oversize contract. Big truck, dear dispatch, but there\u2019s no other way \u2014<br>self-delivery only goes to two cells.',
    'story.l5big.1': 'There it is, four cells. Takes four cells of warehouse too.',
    'story.l5ins.1': 'Insurance. How much comes back when something breaks or walks off.',
    'story.l5ins.2': 'It costs every month, so weigh it against how often you actually have incidents.<br>No incidents and it\u2019s money leaking; one bad one and it pays for itself.',
    'story.l5claim.1': 'Incident. With insurance some of it comes back.',
    'story.l5claim.2': 'It took reputation too. Sometimes that hurts more than the money.',
    'story.l5offer.1': 'A <b>storage contract</b>. You\u2019re not moving anything \u2014 you\u2019re <b>renting out space</b>.',
    'story.l5offer.2': 'Only take it when you have room. Space tied up when volume spikes pushes freight into the yard.',
    'story.l5rush.1': 'Sale week. Half again the usual for a few days.<br>Should have cleared out first \u2014 well, that\u2019s how you learn it.',
    'story.l5last.1': 'Year-end\u2019s gone. The year\u2019s nearly all the way round.',
    'story.l5last.2': 'One thing left \u2014 the New Year rush. Clear that and the depot is yours, balance settled.',
    // ----- Chapter 5 (Jan-Feb): the last winter -----
    'story.l6intro.1': 'New year. January is quiet \u2014 the slowest month we get.',
    'story.l6intro.2': 'Use the breath to get ready. February brings the New Year rush, and that\u2019s the last wall.<br>Clear it and you\u2019re done \u2014 balance settled and all.',
    'story.l6weekend.1': 'No trucks on Sunday. But now you get to choose what to do with the day.',
    'story.l6weekend.2': 'Rest and next week is easier; work late and you carry more yourself the next day;<br>take casual work and you earn a little and the yard gets watched. Your call.',
    'story.l6frozenWarn.1': 'Next half brings <b>\u2746 frozen</b>. Not the same as chilled \u2014 it has to stay frozen.',
    'story.l6frozenCar.1': 'A frozen-chain contract. A chilled truck won\u2019t do it; different temperature.',
    'story.l6freezer.1': 'This is the freezer \u2014 a colder section inside the chilled one.',
    'story.l6freezer.2': '\u2746 spoils the moment it\u2019s pushed out of the freezer. Far less patient than chilled.',
    'story.l6frozen.1': 'There it is, \u2746. Should have gone straight into the freezer.',
    'story.l6frozen.2': 'See the bar? Frozen has fewer cells than chilled. Send those first.',
    'story.l6holiday.1': 'New Year holiday coming. <b>Two days with no trucks at all.</b> The firms rest too.',
    'story.l6holiday.2': '<b>Empty the warehouse first.</b> Freight piles up just before it, and holding that for two days<br>runs every due date out at once. It caught me every single year.',
    'story.l6off.1': 'No trucks today. Self-delivery still works \u2014 carry the urgent ones by hand.',
    'story.l5full.1': 'Hold on. <b>All four contract slots are taken.</b> Nowhere to put another.',
    'story.l5full.2': 'Then it isn\u2019t a contract you want, it\u2019s a <b>clause</b> \u2014 an extra term fitted to a contract you already have.<br>Takes no slot. One clause per contract, mind.',
    'story.l5full.3': 'Buy that and fit it to the right contract; that truck will take \u2746 as well.<br>Last thing I\u2019ll teach you: when you\u2019re out of room, you don\u2019t add \u2014 you <b>fit</b>.',
    'story.l6stuck.1': 'Still nowhere to load that. Tap the parcel and it tells you what it needs.',
    'story.l6stuck.2': 'Slots full means find the clause; no clause and you\u2019re switching a contract out.',
    'story.l6last.1': 'Last half-month. This time last year you first walked in here.',
    'story.l6last.2': 'I\u2019ll be honest, I thought you\u2019d quit after two months. Didn\u2019t say so to Mr. Han.',
    'story.l6last.3': 'Clear this and it\u2019s done. Balance paid, proper sign over the door.<br>After that I\u2019ll just drop in for coffee now and then.',
    'story.l1last.1': "The fortnight is nearly gone. You're quicker than me now.",
    'letter.title': 'A letter from Mr. Han',
    'letter.toName': 'To {name}',
    'letter.toYou': 'To you',
    'letter.sign': 'Mr. Han',
    'letter.close': 'Fold it away',
    'visit.title': "Mr. Han has come by",
    'visit.1good': "Park tells me you ran it a whole month, not a fortnight, with your own hands.<br>Better than I did.",
    'visit.1bad': "Park tells me a few slipped through.<br>My first year I let a whole household of furniture sit out in the rain. Never mind that.",
    'visit.2': "At my age I will not be raising that shutter again.<br>So here I am. <b>I mean to let this place go to you.</b>",
    'visit.3': "The price is <b>{price}c</b>. Not all at once, mind.<br>Put down what you can today, and the rest in instalments, one every half-month. Clear it before spring ends and it is yours that day.",
    'visit.4': "Name your sign first.<br>Hanseong is my name — put yours up now.",
    'visit.next': "Next",
    'visit.go': "Name the sign",
    'letter.generic.good': 'Park tells me you sent them full.<br><br>That is the whole of it. Keep at it.',
    'letter.generic.bad': 'Park tells me a few got dropped.<br><br>I dropped more my first year. Keep at it.',
    'letter.3.good': 'Nothing left out and soaked, he writes.<br><br>The yard is only ever temporary. Read the forecast and send those first.',
    'letter.3.bad': 'What sat in the yard got wet.<br><br>That is what happens under no roof. Watch the forecast, or widen the warehouse.',
    'letter.4.good': 'Not a single cold item spoiled.<br><br>Chilling costs, but one spoiled load costs more. You have done that sum.',
    'letter.4.bad': 'A few cold items spoiled.<br><br>Cold freight will not wait. Put it in the chiller the moment it lands.',
    'letter.5.good': 'They say the name has travelled past the neighbourhood.<br><br>More people means bigger freight. If something will not fit, see to it early.',
    'letter.5.bad': 'A few were missed, he writes.<br><br>As the freight grows the trucks must follow. See to it before it piles up.',
    'letter.6.good': 'You saw it through.<br><br>It isn\'t my depot any more. Congratulations.',
    'letter.6.bad': 'A few were dropped, but you saw it through.<br><br>It isn\'t my depot any more. Congratulations.',
    'letter.1.good': "Park tells me you sent them full.<br><br>That is the whole of it — one crate or a full deck, the fee is the same.<br><br>I still cannot raise that shutter. Keep it <b>to the end of the month</b> — when the month turns I have something to say to you.",
    'letter.1.bad': "Park tells me some went out half empty.<br><br>It happens when you are pressed. But the fee is the same, so full always pays better.<br><br>I still cannot raise that shutter. Keep it <b>to the end of the month</b>. When the month turns I have something to say.",
    'ct.modal': 'Contract',
    'ct.title': 'C O N D I T I O N A L   S A L E',
    'ct.seller': 'Seller',
    'ct.sellerName': 'Mr. Han',
    'ct.buyer': 'Buyer',
    'ct.item': 'Property',
    'ct.itemName': "Depot No.1, Sinheung-dong 17-3, with yard",
    'ct.body': "The price of the property is set at {price}c. A deposit of {down}c was received today.<br>The balance of {rest}c is paid in instalments, one every half-month, within the remaining two months. No interest.<br>The buyer shall send out what comes in, on the day it is due. There are no other terms.",
    'inst.modal': 'Instalment',
    'inst.title': 'R E C E I P T',
    'inst.titleFinal': 'P A I D   I N   F U L L',
    'inst.paidSoFar': 'Paid so far',
    'inst.due': 'This instalment',
    'inst.dueFinal': 'Balance in full',
    'inst.pay': 'Paid today',
    'inst.rest': 'Balance remaining',
    'inst.ok': 'Sent on to Mr. Han. {left}c left in hand.',
    'inst.short': '{n}c short. Mr. Han only wrote back: \u201cNever mind, send it with the next.\u201d',
    'inst.cleared': 'Paid in full. The depot is yours.',
    'inst.btn': 'Send it',
    'inst.btnFinal': 'Take the deed',
    'ct.titleFinal': 'B I L L   O F   S A L E',
    'ct.bodyFinal': 'The price has been received in full. The seller hands the property over completely.<br>A whole spring and nothing spilled. That will do.',
    'ct.doneFinal': 'Take the depot',
    'ct.stamp': 'Press the seal',
    'ct.price': 'Price',
    'ct.down': 'Deposit (today)',
    'ct.rest': 'Balance (paid every half-month)',
    'ct.after': 'Balance <b>{rest}c</b> in instalments — you start with {left}c.',
    'ct.stampMark': '韓',
    'ct.done': 'Take the depot',
    'lv.ch.1': 'Prologue',
    'lv.ch.2': 'Chapter 1',
    'lv.ch.3': 'Chapter 2',
    'lv.ch.4': 'Chapter 3',
    'lv.ch.5': 'Chapter 4',
    'lv.ch.6': 'Chapter 5',
    'lv.title': '{ch}',
    'lv.doneTitle': '{ch} complete',
    'lv.doneBody': 'You ran {months} months to the end. {delivered} parcels delivered · {cash}c left.',
    'lv.nameAsk': 'Name the sign',
    'lv.nameBody': "A month in — time you changed the sign. Hanseong is my name; put yours up now.<br>What shall we write on the contract?",
    'lv.namePlaceholder': 'Company name',
    'lv.nameSave': 'That\'s the one',
    'lv.nameDefault': "Spring Freight",
    'lv.ownerShop': "Hanseong Depot",
    'lv.next': 'The next level is in the works — the Handover and free runs are unlocked for now.',
    'lv.start': 'Start',
    'lv.startSub': '{ch}',
    'lv.continue': 'Continue',
    'lv.new': 'New game',
    'lv.pick': 'CHAPTERS',
    'lv.doneGo': 'Next',
    'sum.toNext': 'Start {n}',
    'help.l1': '<b>The whole job</b><br>Parcels arrive every business day. Pile them up and send <b>a full truck</b> — the fuller it goes, the cheaper each parcel gets.<br><br><b>Deadline</b> Every parcel has a ⏳. Miss it and the pay drops; two days more and it goes back.<br><b>End Day</b> Finish today\'s work and receive the next business day\'s parcels.<br><b>Warehouse</b> When it fills up, the rest piles in the yard.<br><b>Sunday</b> A day off. No arrivals, no deadlines moving.<br><b>Settlement</b> Every two weeks, income minus dispatch fees and rent.<br><br><span style=\'color:var(--dim)\'>The manager will tell you the rest as it comes up.</span>',
    'title.story': 'Handover',
    'title.storySub': 'story tutorial · first three months',
    'prep.story': 'Manager guide',
    'prep.storyDesc': 'Park explains the rules during the first 3 months (any company or scenario)',
    'menu.story': 'Manager guide: {v}',
    'menu.sms': 'Season texts: {v}',
    'help.notes': 'Manager\'s notes',
    'help.notesEmpty': 'Nothing yet. Play the Handover (story mode) or turn on the manager guide and his lines collect here.',
    'sms.from': '📱 Park',
    'cal.title': 'Calendar',
    'cal.thisMonth': 'now',
    'cal.eventTurns': 'days {a}–{b}',
    'cal.arrivals': 'volume {pct}',
    'cal.event.holiday_rush': 'Holiday rush — arrivals ×1.6 those turns, deadline −1',
    'cal.event.holiday_off': 'Holiday — no deliveries (carriers closed). The warehouse keeps receiving.',
    'cal.event.gift': 'Gift week — ⚠ fragile pay +10',
    'cal.event.sale': 'Shopping festival — plain parcels ×1.5, bulk fee −10%',
    'cal.kr.1.label': 'New Year lull',
    'cal.kr.1.note': 'Off-season — volume −15%, frequent snow, no cost inflation this month',
    'cal.kr.1.sms': 'First month of the year is quiet. Catch your breath and get ready for the February holiday.',
    'cal.kr.2.label': 'Lunar New Year',
    'cal.kr.2.note': 'Seollal — volume +30%, gift sets (fresh·produce·fragile) ↑, rush turns 2–4, holiday closure turns 5–6',
    'cal.kr.2.sms': 'Seollal. Same as Chuseok but shorter and harder. Get through this and you\'re done. Well played.',
    'cal.kr.3.label': 'Spring moving',
    'cal.kr.3.note': 'Spring moving season · new term — volume +5%, large ↑, more storage offers',
    'cal.kr.3.sms': '',
    'cal.kr.4.label': 'Moving winds down',
    'cal.kr.4.note': 'End of moving season — spring produce ↑, more storage offers, some rain',
    'cal.kr.4.sms': '',
    'cal.kr.5.label': 'Family Month',
    'cal.kr.5.note': 'Family Month — volume +5%, gifts (fragile) ↑, gift week turns 5–7 (⚠ pay +10)',
    'cal.kr.5.sms': '',
    'cal.kr.6.label': 'Monsoon begins',
    'cal.kr.6.note': 'Monsoon begins — frequent rain (yard gets wet), early-summer fresh ↑',
    'cal.kr.6.sms': 'Monsoon\'s here. Anything in the yard gets soaked. If it won\'t fit inside, ship it first.',
    'cal.kr.7.label': 'Monsoon · heat',
    'cal.kr.7.note': 'Monsoon · heatwave — fresh·frozen ↑, volume −5%, one heat-alert turn a month',
    'cal.kr.7.sms': 'Heatwave. Cold goods left outside are gone that same turn. If you\'re expanding the cold zone, now.',
    'cal.kr.8.label': 'Heat · holidays',
    'cal.kr.8.note': 'Heat · vacation — plain −10%p, fresh ↑, volume −10%',
    'cal.kr.8.sms': 'Vacation season: fewer plain boxes, more fresh. Line up one more reefer truck.',
    'cal.kr.9.label': 'Chuseok',
    'cal.kr.9.note': 'Chuseok — volume +25%, gift sets (fresh·produce·fragile) ↑, rush turns 2–4, holiday closure turns 5–6',
    'cal.kr.9.sms': 'Week before Chuseok the gift sets pour in, and during the holiday no truck answers. Empty the warehouse before it.',
    'cal.kr.10.label': 'Autumn moving',
    'cal.kr.10.note': 'Autumn moving · harvest — produce ↑, more storage offers, storage fee +20%',
    'cal.kr.10.sms': 'Autumn moving season. The movers will come asking for space. Take it if you have room.',
    'cal.kr.11.label': 'Kimjang · sale',
    'cal.kr.11.note': 'Kimjang season · shopping festival — volume +30%, produce ↑, festival turns 7–10 (plain rush, bulk fee −10%)',
    'cal.kr.11.sms': 'Kimjang brings produce, and the month-end sale floods plain boxes. Stock up on bulk trucks.',
    'cal.kr.12.label': 'Year-end',
    'cal.kr.12.note': 'Year-end — volume +40%, fragile·frozen·large ↑, snow (free cold), return grace −1',
    'cal.kr.12.sms': 'Year-end. Fragile, frozen, big — all of it goes up. Busiest month of the year. Check your insurance.',
    'err.holidayOff': 'Holiday — carriers are closed (self-delivery only)',
    'log.holidayOff': '🎑 Holiday closure — no carrier calls',
    'log.calEvent': '📅 {name} (days {a}–{b})',
    'hud.off': 'closed',
    'fmt.calOnly': 'M{cal}',
    'mk.seasonLine': "Next: month {cal} · {season}: {note}",
    'mk.seasonLineNow': 'This month {cal} · {season}: {note}',
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
    'pd.wet': 'wet (reward -20%)',
    'pd.outdoor': '🌧 stored outside',
    'pd.contracts': 'Who can take it',
    'pd.needFamily': "Nothing you have can ship this — you need a <b>{list}</b> contract (the market sells them)",
    'pd.needOpt': 'All contract slots are taken \u2014 buy the <b>{name}</b> in the market and fit it to a contract you already have.',
    'pd.needNothing': 'Nothing you have can ship this — it needs a warehouse facility or an upgrade',
    'cd.blocks': "Won't take: {list}",
    'mk.newlyHandles': '+ New for you: {list}',
    'mk.newSize': 'size {n}',
    'pd.noContract': 'No contracts',
    'pd.selfRow': 'Deliver yourself',
    'pd.selfCost': '{cost}c',
    'pd.ok': 'OK',
    'offer.title': '{name} storage offer',
    'offer.prepaid': '<b>{fee}c</b> upfront',
    'offer.perTurn': '{perTurn}c/day at pickup ({total}c)',
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
    'ps.produceCold': '🌾 in spare cold space (heat-safe)',
    'ps.frozenOut': '🔥 Outside freezer',
    'ps.frozen': '❆ Frozen',
    'ps.heat': '🔥 Heat damage',
    'ps.customs': '🛃 Customs {n#d}d{delayed}',
    'ps.delayed': '(delayed)',
    'ps.overdue': '⏳ Late{ret}',
    'ps.returnIn': '↩ {n#d}d',
    'ps.noCarrier': 'no carrier',
    'ps.deadline': '⏳ <b>{n#d}</b>d',
    'ps.noDue': 'no deadline',
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
    'call.payLater': '⏱ paid in {n#d:# day|# days}',
    'call.bonus': 'Bonus',
    'call.selected': "Selected <b>{n}</b>/{cap}",
    'call.pickUrgent': "Auto-select",
    'call.pickClear': 'Clear',
    'call.tapBoxes': 'tap boxes below to load/unload',
    'call.earn': 'EARN',
    'call.cost': 'COST',
    'call.net': 'NET',
    'call.instant': '⚡Ship now',
    'call.noTurn': 'Does not use a turn',
    'call.maxSelect': "Exceeds vehicle capacity {cap} — add a vehicle or remove parcels",
    'float.broken': '⚠ Broken! {short}',
    'float.delayed': '+{n}c (in {delay#d} days)',
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
    'wm.nextWarehouse': 'After next arrivals',
    'wm.ifWait': 'If you end the day',
    'wm.outdoor': '🌧 Outside {vol} cells · theft this turn {pct}%',
    'wm.selfHead2': 'Size ≤ {size} · full reward, cost {base}c + size×{per}c',
    'wm.vans': 'Vehicles',
    'wm.noVans': 'No vehicles — plain parcels and produce only',
    'wm.blocked': '{n} not eligible (see parcel details)',
    'wm.title': 'End Day',
    'wm.selfWait': 'Deliver {n}, then end day (-{cost}c)',
    'wm.justWait': 'End Day · Receive arrivals',
    'wm.sub': 'Finish today\'s work and receive the next business day\'s parcels',
    'wm.limit': 'Up to {n} per turn',
    'float.discard': 'Discarded! {why}',
    'float.paid': '{name} paid +{n}c',
    'float.storageEnd': 'Storage picked up {pay}',
    'float.storageStolen': 'Stored goods stolen! -{n}c',
    'toast.offer': 'A storage offer arrived',
    'float.returned': 'Returned! {short}',
    'float.stolen': 'Stolen! {short}{size}',
    'float.stress': 'Stress +{n}',
    'float.rep': 'Rep −{n}',
    'sum.net': 'Net this month',
    'sum.netFlow': '{from}c → {to}c',
    'sum.noIncident': '✔ No incidents — 0 returned, stolen, broken or discarded',
    'sum.secIncome': 'Income',
    'sum.secCost': 'Costs',
    'sum.secIncident': 'Incidents',
    'sum.secState': 'This month · status',
    'sum.secCust': 'Customers',
    'sum.revenue': 'Delivery revenue',
    'sum.opCost': 'Operating cost',
    'sum.opCostDetail': 'rent {rent} · contracts {contracts} · facilities {facilities} · labor {labor} ({arrivals} arrivals)',
    'hud.feesDue': "fees −{n}",
    'hud.cashLbl': "Month-end est.",
    'hud.cashNow': "cash {n}",
    'hud.pending': "incoming +{n}",
    'hud.stock': 'stock +{n}',
    'hud.opCostDue': "op cost & premium −{n}",
    'hud.loanWarn': "⚠ shortfall becomes a loan (15% interest)",
    'hud.debt': "loan repay −{n}",
    'sum.loanRepaid': "Loan repaid",
    'sum.loanInterest': "(interest {n})",
    'sum.loan': "Short-term loan",
    'sum.loanNote': "Debt {debt}c — repaid at next settlement with {interest}c interest. Debt over {limit}c means bankruptcy",
    'log.loan': "Short-term loan {n}c (repaid next settlement with {interest}c interest)",
    'log.loanRepaid': "Loan repaid {n}c + interest {interest}c",
    'sum.closing': 'Closing bonus',
    'sum.callsWaits': 'Calls / days closed',
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
    'sum.rep': 'Reputation',
    'sum.usage': 'Warehouse usage',
    'sum.repToNext': '{n} to next grade',
    'sum.usageVal': '{pct}% ({n} stored)',
    'sum.deliverGoal': 'Shipping goal',
    'sum.storageGoal': 'Storage contracts done',
    'fmt.cases': '{n}',
    'sum.bigCustomer': 'Big-contract customer',
    'common.trust': 'trust',
    'sum.custClaim': 'damages -{n}c',
    'sum.title': '{n} Settlement',
    'sum.final': 'Got it',
    'sum.toMarket': 'To market',
    'mk.capCalls': '{cap}/call · max {calls} calls',
    'mk.oneTime': '(one-time)',
    'mk.claimMult': 'damages ×{n}',
    'mk.custStart': 'Starts at trust lv 0 (customers {n}/{max})',
    'common.xl': 'XL',
    'mk.afterBuy': 'After purchase',
    'mk.allFacilities': 'All facilities already bought',
    'mk.sold': 'Sold',
    'mk.currentContracts': 'Current contracts — refill trucks here{keep}',
    'mk.keepCalls': ', {n} call kept',
    'mk.contractLine': '{calls}/{max} trucks left, vehicle {cap} slots',
    'mk.mine': 'My contracts',
    'mk.prepNote': 'Before month 1 starts.',
    'mk.bought': 'Bought',
    'mk.refresh': 'Refresh market ({cost})',
    'mk.free': 'free',
    'mk.prepTitle': 'Prep Market',
    'mk.title': '{n} Market',
    'mk.startMonth': 'Start {n}',
    'mk.endChapter': 'Finish chapter',
    'toast.strike': '✊ {name} on strike this month — cannot call',
    'mk.priceMult': 'prices ×{n}',
    'slot.pickReplace': 'Pick a slot to replace. Remaining trucks and upgrades are lost; carrier trust stays.',
    'slot.pickApply': 'Pick a contract to apply to.',
    'hire.title': '🚨 Rush contracts',
    'hire.desc': "Hire now instead of waiting for the monthly market — costs 50% more.",
    'hire.btn': 'Hire now',
    'hire.upgrade': '{name} → upgrade',
    'hire.confirmSub': 'Hiring now costs -{price}c (more than the market)',
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
    'res.callsWaits': 'Calls / days closed',
    'res.deliveredDiscarded': 'Shipped / discarded',
    'res.seed': 'Seed',
    'res.toTitle': 'To title',
    'res.again': 'Same setup again',
    'res.win': 'Run complete!',
    'res.winStory': 'Handover complete',
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
    'my.remain': "{calls}/{max} trucks",
    'my.line': '{vehicle} <b>{cap}</b> cells · {fee}c each · {simul} at once',
    'my.record': '{calls} calls · {n} delivered this run',
    'my.others': 'Carriers with leftover trust but no contract',
    'my.note': 'Trucks are consumable (no monthly reset; full refills at the market). Replacing loses leftover trucks and upgrades{keep}; trust is per center',
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
    'demo.fullOnly': 'in the full game',
    'demo.storySub': 'story tutorial · demo covers {n} months',
    'demo.cta': 'About the full game',
    'demo.gateTitle': 'This is the demo',
    'demo.gateBody': 'The demo covers the first {n} months of the handover. The full game lets you pick a quarter, a half-year or a full year — peak season, holiday rushes and rising costs included.',
    'demo.rowMonths': 'Full game year',
    'demo.rowScenarios': 'Scenarios',
    'demo.rowCompanies': 'Companies',
    'demo.rowPerks': 'Perks',
    'demo.keepProfile': 'Achievements and records from the demo carry over — copy them with "Export profile" on the records screen.',
    'demo.soon': 'Coming soon.',
    'demo.resultTitle': 'Probation over',
    'demo.resultHead': 'End of the demo',
    'demo.resultBody': 'You lasted {n} months. The full game takes the same warehouse through a quarter, a half-year or a full year.',
    'demo.endReason': 'Demo ends here — you ran the warehouse for {n} months',
    'stat.export': 'Export profile',
    'stat.import': 'Import profile',
    'stat.transferNote': 'Use this to carry unlocks and records from the demo to the full game, or to another device.',
    'stat.exportHelp': 'Copy the code below. Paste it into "Import profile" in the full game to merge your unlocks and records.',
    'stat.importHelp': 'Paste a code from Export. It merges into this profile and leaves what you already have alone.',
    'stat.copy': 'Copy',
    'stat.copied': 'Copied',
    'stat.copyFail': "Couldn't copy — select the text and copy it manually",
    'stat.importBtn': 'Import',
    'stat.importFail': "Couldn't read that code",
    'stat.importOk': 'Imported — {n} added',
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
    'help.body': '<div class="help">\n      <p>Parcels arrive at your warehouse every turn. Calls are per <b>vehicle</b>: each contract has a vehicle (N slots) and you pay a <b>dispatch fee</b> per vehicle every call. The fee is the same however much is on board, so <b>half full is break-even</b> — call below that and every call loses money; at 80%+ the carrier\'s trust and your reputation rise too. Dispatch fees are <b>paid at month end</b>, so you can always call, but they all come out at settlement. If cash goes negative after settlement, a <b>short-term loan</b> covers it and is repaid next month with 15% interest — debt over 400c means bankruptcy. Call a carrier to ship them, or <b>wait</b> and let them pile up. A call costs the same regardless of how many parcels it ships — you pay per <b>call</b>, so the more you ship at once, the better.</p>\n      <h3>Setting up a run</h3><p>Pick a <b>scenario</b> (length and rules) → a <b>company</b> (starting warehouse, contracts, traits) → <b>perks</b> (small rule tweaks). Companies, perks and scenarios are unlocked by <b>achievements</b>; the Codex shows conditions and progress. Companies open in tiers: <b>tier 1</b> (3 runs · first clear · 2 clears) → <b>tier 2</b> (30 of a parcel type in total) → <b>tier 3</b> (clear with 3 companies).</p>\n      <h3>Turn order</h3><p>Arrivals → call a carrier or wait → delivery → freshness and deadlines tick → overflow and delay penalties</p>\n      <h3>Parcel attributes — what happens in the warehouse</h3><table><tr><th>Attribute</th><th>Rule</th><th>Who can ship it</th></tr>\n      <tr><td>❄ Fresh</td><td>Outside the cold zone: <b>discarded next turn</b>. Deadline 3 turns</td><td>Any carrier (bonus from Cold Logistics only)</td></tr>\n      <tr><td>⚠ Fragile</td><td>A carrier without the ⚠ ability has a <b>25% break chance</b> (discard, +2 stress)</td><td>Any carrier. Safe: Fragile Pro · Heavy Haul · Rail · Air · Urgent · Padded Packing Rider</td></tr>\n      <tr><td>🛃 Customs</td><td><b>2 turns in customs</b> after arrival (20% chance of +1 delay). Takes space while waiting; the deadline starts afterwards</td><td>Any carrier once cleared. While in customs: Customs Broker · Air · Sea · Urgent only</td></tr>\n      <tr><td>❆ Frozen</td><td>Outside the freezer: <b>discarded immediately</b>. Deadline 8 turns. From month 4. Parcels larger than the freezer never arrive</td><td>Frozen Logistics · Reefer Container Rider only</td></tr>\n      <tr><td>🌾 Produce</td><td>Even inside, <b>heat waves cut the deadline by 2</b> (discarded if outside). Safe in spare cold space or with Ventilation. Deadline 5 turns</td><td>Any carrier (bonus from Cold Logistics). Self-delivery OK</td></tr>\n      <tr><td>Large (4–7)</td><td>Only carriers whose size range fits</td><td>Van Hire · Heavy Haul · Rail · Sea · Customs Broker</td></tr></table>\n      <h3>Wait · self-delivery · vehicles</h3><p>Pressing <b>Wait</b> opens the end-turn screen, where you can pick parcels to <b>self-deliver</b> — 1 per turn (Big Truck +1, City Quick and National Post +1), plain parcels and produce only, up to size 2. You keep the full reward but pay a <b>delivery cost</b> (15c + size×5c). Expand it with market <b>vehicles</b>: Reefer Van (❄❆), Padded Van (⚠ safe), Big Truck (size 4, +1). If anything is stored outside, the same screen leads to Arrange Storage. Tap a parcel row to see which contracts or self-delivery can handle it.</p>\n      <h3>Prep market</h3><p>Every run starts with a <b>prep market</b>. Before the first turn of month 1 you can spend your starting cash on contracts, upgrades, facilities and insurance, and you can see the first 1–2 turns of arrivals and weather. One free refresh. One-month scenarios are prepared here too.</p>\n      <h3>Difficulty</h3><p>Choose <b>Rookie · Regular · Veteran</b> at the top of the scenario screen. Rookie lowers arrivals, prices and damages and shows arrivals 3 turns ahead, but unlock achievements don\'t count. Veteran (after your first clear): arrivals +10%, damages ×1.5, theft and breakage ×1.3, stress limit 18, score ×1.4.</p>\n      <h3>Weather · storage · contracts · insurance</h3><p>Each turn has weather, forecast 2 turns ahead. <b>🌧 Rain</b> wets standard and ⚠ parcels outside (reward -20%), <b>🔥 heat waves</b> discard ❄❆ outside cold zones immediately, a <b>❄️ blizzard</b> turns the yard into a fridge (no ❄ spoilage, theft halved, ❄ shipping +10), and a <b>🌀 typhoon</b> doubles theft and pushes that turn\'s arrivals to the next turn.</p><p>When the warehouse overflows, pressing <b>Wait</b> opens <b>Arrange Storage</b>. Choose what goes outside yourself or use presets (urgent · high reward · high damages · by customer). It doesn\'t open on call turns — it\'s the reward for waiting.</p><p>Customers like the Moving Center offer <b>storage contracts</b>. Accepting pays an upfront fee and the volume occupies your warehouse for the term (not callable or arrangeable). Ending safely gives trust +2; returning early refunds the remaining term minus a 30c penalty. If it\'s put outside and stolen, damages ×2.</p><p><b>Insurance</b> is chosen at run start and can be switched in the market. It covers part of each damage claim, and the monthly premium is deducted at settlement. 0 claims → -20% next month (2 months in a row -30% + customer trust +1); many claims raise it. Uninsured, customers with damages ×2 (Glass Studio, Moving Center) send half the volume. The market also sells one-time insurance (Transit Certificate · Yard Insurance · Customs Bond).</p>\n      <h3>Customers</h3><p>Every parcel has a <b>customer</b> (icon on the left of the row). On-time delivery +1xp, meeting the customer\'s special rule +1xp, discard -3xp. Trust levels 1–3 raise volume and per-parcel reward, and levels 2–3 unlock customer perks. A discard (spoilage, return, theft, breakage) triggers a <b>damage claim</b> (base reward × damage multiplier) taken from your cash immediately, and if xp drops below 0 the customer stops trading until next month. Check the <b>Customers</b> button at the bottom.</p>\n      <p>The <b>ability</b> icons on a carrier card are the attributes it handles safely. A <b>rider</b> from the upgrade slot adds one attribute to a contract (1 per contract). ✈🚆🚢 only mark the transport mode and don\'t affect matching; Rail and Sea pay out 1–2 turns later.</p>\n      <h3>Three ways to ship</h3><p><b>Self-delivery</b>: on a wait turn, pick 1 parcel, pay the delivery cost, keep the full reward. <b>Carrier call</b>: spends 1 remaining call and the turn. Specialists get bonuses. <b>⚡Urgent Express</b>: ships 1 parcel instantly without using a turn — the safety net of a waiting strategy.</p>\n      <p>Van Hire takes any 1 parcel (no bonus, ⚠ break risk). Missing a deadline costs reward -25% and stress +1; 3 turns later the parcel is <b>returned</b> (stress +2). Whatever exceeds capacity is <b>stored outside</b>, newest arrivals first, and rolls for theft every turn (overflow 1–2: 15%, 3–5: 30%, 6+: 50%). Fresh food drops to 50% reward after 3 turns and is discarded the turn after (+3). Fresh food at room temperature (not ❄) spoils twice as fast.</p>\n      <h3>Warehouse</h3><p>Overflow of 1–2: +1 stress, 3 or more: +2 — the real danger is theft of what\'s outside. Stress {stress} is game over. <b>Operating cost</b> (rent 120c + 10c per contract slot + facility upkeep) and the insurance premium are settled at month end.</p>\n      <h3>Contracts and the market</h3><p>Each contract has a number of remaining calls, and you can\'t buy new contracts mid-month. Replace contracts and buy upgrades and facilities in the month-end market. Replacing a contract loses its remaining calls and upgrades. Grades: Standard &lt; Trusted &lt; Expert &lt; Master.</p>\n      <h3>Carrier trust</h3><p>Trust accrues per <b>carrier</b> and survives contract changes. Per call: delivery +1, capacity 80%+ +1, special parcels with a specialist +1. The call screen previews the xp for this call.</p>\n      <table><tr><th>Level</th><th>xp</th><th>Effect</th></tr><tr><td>1</td><td>3</td><td>Capacity +1 per call</td></tr><tr><td>2</td><td>8</td><td>+1 parcel every 4th call</td></tr><tr><td>3</td><td>15</td><td>Signature ability (Cold: deadlines freeze / Bulk · Broker · Heavy · Frozen · Urgent: +1 parcel / Van: special bonus / Fragile Pro: +15c / Air: size 4 / Rail · Sea: payment delay -1)</td></tr></table>\n      <p>Fastest route: call the same carrier <b>fully loaded</b> (80%+) for +2–3xp each time — level 3 in 5–6 calls.</p></div>',
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
      "bulk0": {
        "name": "Hangil Logistics",
        "short": "Hangil",
        "vehicle": "box truck",
        "desc": "Loads plain parcels (size 1-2) on a box truck. The backbone of a standard-parcel build · standard contract"
      },
      "bulk1": {
        "name": "QuickHands Express",
        "short": "QuickHands",
        "vehicle": "box truck",
        "desc": "Loads plain parcels (size 1-2) on a box truck. The backbone of a standard-parcel build · Premium — trucks +1 · cap +1 · fee −10%"
      },
      "bulk2": {
        "name": "Blueway Logis",
        "short": "Blueway",
        "vehicle": "padded box truck",
        "desc": "Loads plain parcels (size 1-2) on a box truck. The backbone of a standard-parcel build · Elite — trucks +2 · cap +2 · fee −20% · ⚠ break-safe added"
      },
      "bulk3": {
        "name": "MegaHub Logistics",
        "short": "MegaHub",
        "vehicle": "padded box truck",
        "desc": "Loads plain parcels (size 1-2) on a box truck. The backbone of a standard-parcel build · Master — trucks +3 · cap +3 · fee −30% · ⚠ break-safe added · 2 trucks at once"
      },
      "cold0": {
        "name": "Dawn Chill",
        "short": "Dawn Chill",
        "vehicle": "reefer truck",
        "desc": "Fresh & produce specialist. Fresh/produce bonus · standard contract"
      },
      "cold1": {
        "name": "Ice Road",
        "short": "Ice Road",
        "vehicle": "reefer truck",
        "desc": "Fresh & produce specialist. Fresh/produce bonus · Premium — trucks +1 · cap +1 · fee −10%"
      },
      "cold2": {
        "name": "ColdChain Center",
        "short": "ColdChain",
        "vehicle": "reefer/freezer truck",
        "desc": "Fresh & produce specialist. Fresh/produce bonus · Elite — trucks +2 · cap +2 · fee −20% · ❆ frozen-capable added"
      },
      "cold3": {
        "name": "Polar Logis",
        "short": "Polar",
        "vehicle": "large reefer",
        "desc": "Fresh & produce specialist. Fresh/produce bonus · Master — trucks +3 · cap +3 · fee −30% · ❆ frozen-capable added · up to size 7"
      },
      "frozen0": {
        "name": "Glacier Frozen",
        "short": "Glacier",
        "vehicle": "freezer truck",
        "desc": "Frozen only. Frozen bonus · standard contract"
      },
      "frozen1": {
        "name": "Snowfield Frozen",
        "short": "Snowfield",
        "vehicle": "freezer truck",
        "desc": "Frozen only. Frozen bonus · Premium — trucks +1 · cap +1 · fee −10%"
      },
      "frozen2": {
        "name": "Minus 30",
        "short": "Minus30",
        "vehicle": "freezer/reefer truck",
        "desc": "Frozen only. Frozen bonus · Elite — trucks +2 · cap +2 · fee −20% · ❄ cold-capable added"
      },
      "fragile0": {
        "name": "Easy Does It",
        "short": "EasyDoes",
        "vehicle": "padded van",
        "desc": "Fragile specialist. No breakage, fragile bonus · standard contract"
      },
      "fragile1": {
        "name": "Glass Hands",
        "short": "GlassHands",
        "vehicle": "padded van",
        "desc": "Fragile specialist. No breakage, fragile bonus · Premium — trucks +1 · cap +1 · fee −10%"
      },
      "fragile2": {
        "name": "Padding Masters",
        "short": "Padding",
        "vehicle": "large padded truck",
        "desc": "Fragile specialist. No breakage, fragile bonus · Elite — trucks +2 · cap +2 · fee −20% · up to size 7"
      },
      "fragile3": {
        "name": "Porcelain Logis",
        "short": "Porcelain",
        "vehicle": "chilled padded truck",
        "desc": "Fragile specialist. No breakage, fragile bonus · Master — trucks +3 · cap +3 · fee −30% · ❄ cold-capable added · up to size 7"
      },
      "intl0": {
        "name": "Customs Bridge",
        "short": "Customs",
        "vehicle": "bonded truck",
        "desc": "Clears and ships cargo still waiting at customs. Customs bonus · standard contract"
      },
      "intl1": {
        "name": "Bonded Express",
        "short": "Bonded",
        "vehicle": "bonded truck",
        "desc": "Clears and ships cargo still waiting at customs. Customs bonus · Premium — trucks +1 · cap +1 · fee −10%"
      },
      "intl2": {
        "name": "WorldGate",
        "short": "WorldGate",
        "vehicle": "bonded padded truck",
        "desc": "Clears and ships cargo still waiting at customs. Customs bonus · Elite — trucks +2 · cap +2 · fee −20% · ⚠ break-safe added"
      },
      "large0": {
        "name": "Giant Freight",
        "short": "Giant",
        "vehicle": "heavy truck",
        "desc": "Handles size 4+ parcels (break-safe). Large bonus · standard contract"
      },
      "large1": {
        "name": "Taesan Heavy",
        "short": "Taesan",
        "vehicle": "heavy truck",
        "desc": "Handles size 4+ parcels (break-safe). Large bonus · Premium — trucks +1 · cap +1 · fee −10%"
      },
      "large2": {
        "name": "Elephant Special",
        "short": "Elephant",
        "vehicle": "reefer heavy truck",
        "desc": "Handles size 4+ parcels (break-safe). Large bonus · Elite — trucks +2 · cap +2 · fee −20% · ❄ cold-capable added"
      },
      "air0": {
        "name": "Skyway Air",
        "short": "Skyway",
        "vehicle": "air container",
        "desc": "Small (1-2) only. Handles customs & fragile safely. Pricey but fast · standard contract"
      },
      "air1": {
        "name": "Jet Cargo",
        "short": "Jet",
        "vehicle": "air container",
        "desc": "Small (1-2) only. Handles customs & fragile safely. Pricey but fast · Premium — trucks +1 · cap +1 · fee −10% · up to size 4"
      },
      "rail0": {
        "name": "Ironhorse Freight",
        "short": "Ironhorse",
        "vehicle": "freight train",
        "desc": "Break-safe, big batches. Paid next turn · standard contract"
      },
      "rail1": {
        "name": "Bullet Cargo",
        "short": "Bullet",
        "vehicle": "express freight train",
        "desc": "Break-safe, big batches. Paid next turn · Premium — trucks +1 · cap +1 · fee −10% · paid immediately"
      },
      "sea0": {
        "name": "Wave Shipping",
        "short": "Wave",
        "vehicle": "container",
        "desc": "Customs container, size 2+, break-safe. Paid in 2 turns · standard contract"
      },
      "sea1": {
        "name": "Ocean Container",
        "short": "Ocean",
        "vehicle": "container",
        "desc": "Customs container, size 2+, break-safe. Paid in 2 turns · Premium — trucks +1 · cap +1 · fee −10% · payment delay 1 turn"
      }
    },
    "FAMILIES": {
      "bulk": { "name": "Bulk" },
      "cold": { "name": "Cold" },
      "frozen": { "name": "Frozen" },
      "fragile": { "name": "Fragile" },
      "intl": { "name": "Customs" },
      "large": { "name": "Large" },
      "air": { "name": "Air" },
      "rail": { "name": "Rail" },
      "sea": { "name": "Sea" }
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
        "passive": "Bargain contracts: all market prices & dispatch fees -20%. Each closed day adds +1 slot to the next call's vehicle (max +3)",
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
        "name": "Close-Day Bonus",
        "desc": "Capacity +1 on the next call after ending a day"
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
      "quarter": {
        "name": "Quarter (3 months)",
        "desc": "Take over in the March moving season and run to May. A cycle is two weeks; six of them is one spring. The short run.",
        "win": "Survive 6 cycles (3 months)",
        "recommend": "Corner Courier"
      },
      "halfyear": {
        "name": "Half year (6 months)",
        "desc": "March through the monsoon and the heat to August. You will need cold storage to clear summer.",
        "win": "Survive 12 cycles (6 months) (score x1.25)",
        "recommend": "Dawn Logistics"
      },
      "standard": {
        "name": "One Year (12 months)",
        "desc": "The main run on the Korean calendar: starts in the March moving season and runs through monsoon, heat, Chuseok, the shopping festival and year-end to next February's Seollal. Customer trust doubles volume, and costs grow with it",
        "win": "Survive 12 months (score ×1.5)",
        "recommend": "Local Parcel"
      },
      "peak": {
        "name": "Peak Season",
        "desc": "Calendar cut: Nov–Dec (starts at month-4 volume). On top of the sale and year-end volume: 3 surge turns (deadline -2), return grace 2. Reward +10, prices ×1.3, starting trucks +2",
        "win": "Survive Nov–Dec + ship 50",
        "recommend": "City Quick · Steel Depot"
      },
      "heatwave": {
        "name": "Heat Wave",
        "desc": "Calendar cut: Jul–Aug (starts at month-5 volume). Fresh share ↑, arrivals +10%, room-temp spoilage ×3, 3 heat-alert turns a month",
        "win": "Survive Jul–Aug + at most 3 discards",
        "recommend": "Fresh Logistics"
      },
      "strike": {
        "name": "Strike",
        "desc": "One carrier type can't be called each month (announced at month start). Op cost +30",
        "win": "Survive 12 months (score ×1.5)",
        "recommend": "Startup"
      },
      "port": {
        "name": "Port Contract",
        "desc": "Customs 20% · large 12%, XL 7%, arrivals -10%. Customs/large reward +20, standard -5",
        "win": "Survive 12 months (score ×1.5)",
        "recommend": "Global · Steel Depot"
      },
      "cashcrunch": {
        "name": "Cash Crunch",
        "desc": "Starting cash -50%, op cost 380, no refresh, market prices +10%. Revenue +10%, trust ×2",
        "win": "Survive 12 months + final cash ≥ 2,500",
        "recommend": "Penny Freight · National Post"
      },
      "blackfriday": {
        "name": "Black Friday",
        "desc": "One hellish November. On top of the sale: arrivals ×1.4, 3 surge turns, prices ×1.4, return grace 4. Reward +15, starting trucks +3",
        "win": "Survive November + ship 30",
        "recommend": "City Quick · Penny Freight"
      },
      "audit": {
        "name": "Audit",
        "desc": "All deadlines -1 turn, overdue reward -50%, stress +1 at month start",
        "win": "Survive 12 months + at most 12 overdue deliveries",
        "recommend": "National Post · Glasshouse"
      },
      "moving": {
        "name": "Moving Season",
        "desc": "Moving Center included, a storage offer guaranteed every 5 turns, storage fees ×1.5",
        "win": "Survive 12 months + complete 12 storage contracts",
        "recommend": "Steel Depot"
      },
      "bigdeal": {
        "name": "Big Contract",
        "desc": "One random customer sends 60% of the volume. Damages ×1.2",
        "win": "Survive 12 months + that customer at trust lv 3",
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
        "desc": "A random calendar month (set for the day) + 2 variant rules. Company assigned for the day, starting trucks +2",
        "win": "Survive that month (one record per day)",
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
        "desc": "Ship for 30 consecutive turns without closing empty-handed (self-delivery counts)"
      },
      "unbreakable": {
        "name": "Unbreakable",
        "desc": "Ship 12 fragile on time in one run"
      },
      "patience": {
        "name": "Ship Big",
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
        "desc": "Clear One Year with 1,000+ cash"
      },
      "half_clear": {
        "name": "Full Year",
        "desc": "Clear One Year (12 months)"
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
        "name": "Closing Time",
        "desc": "End 40 business days in total"
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
  // Keep wait as an internal rule name, but present it as the positive End Day action.
  for (const [from, to] of [
    ['Call a carrier to ship them, or <b>wait</b> and let them pile up.', 'Call a carrier to ship them, or <b>end the day</b> to receive the next arrivals and build up a full load.'],
    ['Arrivals → call a carrier or wait → delivery', 'Arrivals → call a carrier or End Day → delivery'],
    ['<h3>Wait · self-delivery · vehicles</h3><p>Pressing <b>Wait</b> opens the end-turn screen', '<h3>End Day · self-delivery · vehicles</h3><p>Pressing <b>End Day</b> opens the next-arrivals screen'],
    ['pressing <b>Wait</b> opens <b>Arrange Storage</b>', 'pressing <b>End Day</b> opens <b>Arrange Storage</b>'],
    ["it\'s the reward for waiting", "it\'s the reward for closing without a carrier call"],
    ['<b>Self-delivery</b>: on a wait turn', '<b>Self-delivery</b>: when ending the day'],
    ['safety net of a waiting strategy', 'safety net of a stockpiling strategy'],
  ]) L.ui['help.body'] = L.ui['help.body'].replaceAll(from, to);
  if (typeof module !== 'undefined') module.exports = L; else (root.LOCALES = root.LOCALES || {}).en = L;
})(typeof window !== 'undefined' ? window : globalThis);
