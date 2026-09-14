// 한국어 (기본 언어). 구조: name / ui(키 → 문자열) / data(DATA 텍스트 오버레이) / meta(META 텍스트 오버레이)
// 자리표시자: {name} 치환, {n:개|개} 형태는 n이 1이면 앞, 아니면 뒤 (#는 숫자로 치환)
(function (root) {
  const L = {
  name: '한국어',
  ui: {
    // ----- 게임 코어: 로그 (log.*) · 오류 (err.*) · 페널티 사유 (r.*) · 폐기 사유 (why.*) · 게임오버 (over.*) -----
    'err.overTrucks': "한 호출에 {n}대까지 (총 {cap}칸)",
    'err.noTrucks': "이번 달 남은 배차가 {n}대뿐입니다",
    'err.noCashFee': "배차비 {fee}c가 부족합니다",
    'market.upgradeHint': "보유 계약 업그레이드",
    'market.addHint': "보유 계약 배차 추가",
    'market.addName': "{name} 배차 추가 (+{n}대)",
    'mk.addDesc': "이 계약의 월 배차 한도 +{n}대 (현재 {max}대), 이번 달 배차도 즉시 +{n}대. 다음 추가 가격 {next}c",
    'err.notSameCarrier': "같은 업체 계약에만 적용할 수 있습니다",
    'err.notHigherGrade': "보유 등급보다 높을 때만 업그레이드할 수 있습니다",
    'log.upgradeContract': "계약 업그레이드: {name} (-{price}c) · 강화·잔여 배차 유지",
    'log.addContract': "계약 추가: {name} 월 배차 +{n}대, 즉시 리필 (-{price}c)",
    'slot.upgradeAsk': "{name} 계약을 <b>{grade}</b> 등급으로 업그레이드 하겠습니까? 강화·잔여 배차는 그대로 유지되고, 월 배차가 늘어납니다.",
    'slot.addAsk': "{name} 계약에 배차를 추가하겠습니까? 월 배차 한도 <b>+{n}대</b>, 이번 달 배차도 바로 <b>+{n}대</b> 리필됩니다.",
    'slot.upgradeBtn': "업그레이드",
    'slot.upkeepNote': '이 등급의 월 계약 유지비: {n}c (운영비에 포함)',
    'slot.addBtn': "배차 추가",
    'slot.replaceBtn': "새 계약으로 교체",
    'fmt.trucks': "{n}대",
    'fmt.perTruck': "대당 {fee}c",
    'fmt.vehicleCap': "{vehicle} {cap}칸",
    'sum.fees': "배차비",
    'call.trucks': "차량 {n}대 · 적재 {vol}/{cap}칸",
    'call.addTruck': "한 대 더 (+{fee}c)",
    'call.removeTruck': "한 대 줄이기",
    'call.fee': "배차비 {fee}c (월말 후불)",
    'call.net': "순익 {net}c",
    'call.fillOk': "적재 효율 ✓ 신뢰 +1",
    'call.simulMax': "동시 최대 {n}대",
    'mk.vehicleLine': "{vehicle} <b>{cap}</b>칸 · 대당 <b>{fee}</b>c · 월 <b>{trucks}</b>대",
    'mk.gradeVs': "표준 대비: 용량 {cap0}→{cap1}칸 · 월 {t0}→{t1}대 · 배차비 {f0}→{f1}c · 신뢰 {lv}단계 즉시",
    'grade.merit': "프리미엄 계약은 차량이 크고 배차가 많고 배차비가 싸며, 신뢰 특성이 즉시 열립니다",
    'mk.capLine': "{vehicle} <b>{cap}</b>칸 × 월 <b>{trucks}</b>대 = <b>{total}</b>칸 · 대당 {fee}c (칸당 <b>{per}</b>c)",
    'mk.monthTotal': "월 최대 {total}칸 · 칸당 {per}c",
    'mk.forecastSum': "다음 사이클({m}) 예상 물량 {min}~{max}개",
    'mk.forecastSumNow': "이번 사이클({m}) 예상 물량 {min}~{max}개",
    'mk.forecastBlocked': "⚠ {list}은/는 지금 계약으로 못 싣습니다 — 아래에서 받아 주는 계약을 구하세요",
    'mk.forecast': "{m}개월차 예상 물량(대략)",
    'log.monthStart': '── {y}년 {cal}월 {half:전반|후반} 시작 ──',
    'log.prepMarket': '준비 마켓: 1개월차 시작 전 구매 (새로고침 1회 무료)',
    'log.bigCustomer': '대형 계약: {name}이(가) 물량 60%를 보냅니다',
    'log.custSuspend': '{name} 거래 중단 ({why}) — 다음 달 재개',
    'log.custResume': '{name} 거래 재개',
    'log.custLevel': '{name} 신뢰 {level}단계!',
    'log.claim': '손해배상 -{amount}c ({name}, {why}{covered})',
    'log.claimCovered': ', 보험 {covered}c 보장',
    'log.insurerChange': '보험 변경: {name}{fee}',
    'log.insurerFee': ' (가입비 -{cost}c)',
    'log.storageOffer': '보관 제안: {name} {kind} {vol}칸 · {turns#d}일 · {pay}',
    'log.storagePrepaid': '선불 {fee}c',
    'log.storagePerTurn': '하루에 {perTurn}c 후불',
    'log.storageAccept': '보관 수락: {kind} {vol}칸 (+{fee}c)',
    'log.storageDecline': '보관 제안 거절',
    'log.storageEarlyReturn': '보관 조기 반환: 환불 {refund}c + 위약금 {pen}c',
    'log.storageCollect': '보관 회수: {kind}{pay}',
    'log.storagePostpaid': ' (+{pay}c 후불)',
    'log.offerExpired': '보관 제안 만료',
    'log.strike': '⚠ 이번 달 {name} 파업: 호출 불가',
    'log.paid': '{name} 입금 +{amount}c ({count}개)',
    'log.heatAlert': ' 🌡폭염 경보!',
    'log.arrive': '{date}: {list} 입고 (사용률 {usage}%){note}',
    'log.wait': '대기: 차를 부르지 않고 하루 넘김',
    'log.waitSelf': '대기 + 직접 배송 {count}개 (+{revenue}c, 배송비 -{cost}c)',
    'log.transitCert': '운송 보험증 사용: 이번 호출 파손 없음',
    'log.callAllBroken': '{name} 호출: {broken}개 전부 파손!',
    'log.trustUp': '{name} 신뢰도 {level}단계 달성! ({effect})',
    'log.spareCall': '예비 기사 투입 (잔여 호출 없이 호출)',
    'log.call': "{name} 호출: {count}개 처리, +{revenue}c{delay}{broken}{refund} (배차비 {fee}c · 남은 {calls}대)",
    'log.callDelay': ' ({delay#d}일 뒤 입금)',
    'log.callBroken': ', 파손 {broken}개',
    'log.callRefund': ' (묶음 할인: 호출 미소모)',
    'log.callInstant': ' ⚡즉시',
    'log.discard': '폐기: {short}{size} — {why}{pen}',
    'log.penalty': '평판 −{pen}: {reasons} (평판 {rep})',
    'log.erosion': '불안정: {name} 월 배차 -1대',
    'log.settle': '{month}월 정산: 수익 {revenue}, 운영비 {opCost}, 배차비 {fees}{closing}',
    'log.settleClosing': ', 월말 결산 +{closing}',
    'log.gameOver': '게임오버: {reason}',
    'log.marketOpen': '{month}월 마켓 오픈 (최대 {max}개 구매)',
    'log.refresh': '마켓 새로고침 (-{cost}c)',
    'log.refreshFree': '마켓 새로고침 (무료)',
    'log.buyContract': '계약 구매: {name} (-{price}c){old}',
    'log.buyContractOld': ', {name} 폐기 (잔여 {calls}회 소멸)',
    'log.enhance': '강화 적용: {name} → {contract} (-{price}c)',
    'log.buyCustomer': '신규 고객 계약: {name} (-{price}c)',
    'log.buyItem': '구매: {name} (-{price}c)',
    'log.buyFacility': '시설 구매: {name} (-{price}c)',
    'r.wet': '젖음 {short}{size}',
    'r.heatProduce': '폭염에 농산물 상함 {short}{size} 기한 -2',
    'r.overdue': '기한 초과 {short}',
    'r.overdueCont': '초과 지속 {short}',
    'r.discard': '{why} 폐기 {short}',
    'r.returned': '반송 {short}{pen}',
    'r.returnedInsured': '반송 (보험 적용)',
    'r.stolen': '도난 {short}{size} +2',
    'r.stolenInsured': '도난 (보험 적용)',
    'r.storageStolen': '보관 물품 도난 +2 (배상 {amount}c)',
    'r.overflow': '창고 초과 {over} (+{pen})',
    'r.overflowGrace': '창고 초과 {over} (임시 적재장)',
    'why.delivered': '처리',
    'why.noClaim': '무사고',
    'why.fanInsurer': '선호 보험',
    'why.earlyReturn': '조기 반환',
    'why.storageDone': '보관 완료',
    'why.storageStolen': '보관 도난',
    'why.noFrozenZone': '냉동 구역 없음',
    'why.outsideFrozen': '냉동 구역 밖',
    'why.heatSpoil': '폭염 부패',
    'why.warmSpoil': '상온 부패',
    'why.brokenInTransit': '{name} 운송 중 파손',
    'why.returned': '반송',
    'why.stolen': '도난',
    'why.insured': '{why} (보험 적용)',
    'over.stress': '운영 스트레스가 한계에 도달했습니다',
    'over.rep': '평판이 바닥났습니다 — 이제 아무도 여기에 맡기지 않습니다',
    'over.bankrupt': '부채 {debt}c가 단기 차입 한도 {limit}c를 넘어 부도가 났습니다',
    'over.delivered': '처리량 부족: {n}/{need}개',
    'over.discard': '부패 폐기 초과: {n}개 (허용 {max})',
    'over.cash': '자금 부족: {cash}/{need}c',
    'over.overdue': '기한 초과 처리 초과: {n}개 (허용 {max})',
    'over.storage': '보관 계약 부족: {n}/{need}건',
    'over.bigCustomer': '{name} 신뢰 {level}단계 (3단계 필요)',
    'over.win': '{cycles}사이클({months}개월)을 끝까지 굴렸습니다',
    'over.winStory': '인수인계 끝 — 이제 여기 사장은 자네야',
    'err.noCash': '자금이 부족합니다',
    'err.marketOnly': '마켓에서만 바꿀 수 있습니다',
    'err.noInsurer': '없는 보험사',
    'err.alreadyInsured': '이미 가입 중',
    'err.startupNoInsurance': '스타트업은 첫 달 무보험 (2개월차 마켓부터 가입)',
    'err.noOffer': '제안이 없습니다',
    'err.offerTooBig': '창고보다 큽니다',
    'err.noStorage': '없는 보관 계약',
    'err.needRefundPenalty': '환불+위약금 {cost}c가 필요합니다',
    'err.cannotCallNow': '지금은 호출할 수 없습니다',
    'err.emptySlot': '빈 슬롯',
    'err.struck': '파업 중인 업체입니다',
    'err.noCalls': '이번 달 남은 배차가 없습니다',
    'err.overCap': '최대 {cap}개까지 처리할 수 있습니다',
    'err.nothingToShip': '처리할 택배가 없습니다',
    'err.cannotShipNow': '지금은 배송할 수 없습니다',
    'err.nothingSelf': '직접 배송할 수 있는 택배가 없습니다',
    'err.selfLimit': '직접 배송은 한 번에 {n}개까지',
    'err.selfCost': '배송비 {cost}c가 부족합니다',
    'err.noRefresh': '이 시나리오에서는 새로고침할 수 없습니다',
    'err.notMarket': '마켓이 아닙니다',
    'err.sold': '이미 판매된 상품',
    'err.marketMax': '한 달에 {n}개까지만 구매할 수 있습니다',
    'err.pickSlot': '교체할 슬롯을 선택하세요',
    'err.pickContract': '적용할 계약을 선택하세요',
    'err.limitMax': '호출 한도 강화는 계약당 2회까지',
    'err.capMax': '처리 용량 강화는 계약당 3단계까지',
    'err.hasRegular': '이미 정기 배차가 적용된 계약',
    'err.hasExpress': '이미 고속 배차가 적용된 계약',
    'err.optOne': '특약은 계약당 1개',
    'err.optHasAttr': '이미 그 속성을 다루는 업체',
    'err.optUrgent': '이 계약에는 특약을 붙일 수 없음',
    'err.optSize': '크기 최대 {max} 이하 계약만',
    'err.optPlain': '속성 없는 택배 전용 업체에는 붙일 수 없음',
    'err.customerMax': '고객은 {n}명까지',
    'err.customerDup': '이미 거래 중인 고객',
    'err.soldOut': '매진',
    'xp.base': '정상 처리 +1',
    'xp.cap80': "적재 효율 80%↑ +1",
    'xp.specialist': '전문 처리 +1',
    'xp.coldChain': '콜드체인 +1',
    'note.regular': "월 첫 배차 무료",
    'note.express': '고속 배차: 동시 호출 +1대',
    'note.trust2': '신뢰 2단계 +1',
    'note.skip': '스킵 보너스: 이번 차량 +1칸',
    'note.waitStack': '대기 누적: 이번 차량 +{n}칸',
    'note.firstCall': '동네 단골: 이달 첫 호출 차량 +1칸',
    'self.needBigVan': '대형 트럭 필요',
    'self.needColdVan': '냉동 탑차 필요',
    'self.needPadVan': '완충 포장차 필요',
    'self.customsWait': '통관 대기 중',
    'market.hint': '창고의 {short} {count}개 처리 가능',
    'market.facSoldOut': '시설 매진',
    'market.newCustomer': '신규 고객: {name}',
    'trust.l3prefix': '신뢰 3단계: ',

    // ----- UI (ui.js / index.html) — 아래에 추가 -----
    'ach.done': '🏆 도전과제 달성: {name}',
    'ach.unlock': '🔓 해금: {name}',
    'btn.ok': '확인',
    'btn.cancel': '취소',
    'how.title': '이건 이런 게임입니다',
    'how.1.t': '택배가 쌓인다',
    'how.1.d': '영업일마다 택배가 들어옵니다. 창고가 넘치면 택배가 밖에 쌓이고, 택배가 밖에 있으면 비에 젖고 도둑맞습니다.',
    'how.2.t': '트럭을 꽉 채워 보낸다',
    'how.2.d': '트럭 값은 <b>부를 때마다</b> 나갑니다. 시작 트럭(7칸)에 두 개만 실으면 개당 51c, 꽉 채우면 개당 26c. <b>80%를 못 채우면 부를수록 손해</b>라 안 부르고 기다리는 것이 정답일 때가 많습니다.',
    'how.3.t': '맡은 기간을 끝까지 굴린다',
    'how.3.d': '3월에 인수해서 분기(3개월) · 반기(6개월) · 한 해 중에 고른 만큼. 돈이 마르거나 평판이 바닥나면 끝입니다.',
    'how.note': '나머지는 전임 창고장이 옆에서 알려 줍니다.',
    'how.go': '시작',
    'title.name': '택배 타이쿤',
    'title.sub': '쌓아뒀다가, 트럭을 꽉 채워 보낸다',
    'title.goal': '3월에 인수해서 분기 · 반기 · 한 해 · 맡은 기간을 끝까지',
    'title.continue': '이어하기',
    'fmt.monthTurn': '{m} · {t}/{max}',
    'title.new': '새 런 시작',
    'title.codex': '도감',
    'title.codexSub': '{a}/{b} 해금 · 도전과제 {c}/{d}',
    'title.records': '기록',
    'title.recordsSub': '최고 {best}점 · {w}승 {l}패',
    'title.help': '게임 방법',
    'opt.sound': '효과음: {v}',
    'opt.music': '음악: {v}',
    'opt.lang': '언어',
    'title.modal': '택배 회사 게임',
    'title.confirmNew': '진행 중인 런이 있습니다. 새로 시작하면 사라집니다. 계속할까요?',
    'title.newShort': '새로 시작',
    'opt.on': '켜짐',
    'opt.off': '꺼짐',
    'cal.kr.name': '한국',
    'prep.calendar': '📅 {year}년 · {place} 달력',
    'prep.today': '오늘',
    'prep.dailyDone': '오늘 기록 완료',
    'prep.win': '완주 조건',
    'prep.recommend': '추천',
    'prep.dailyNormal': '데일리는 정규 고정',
    'prep.scenarioTitle': '시나리오 선택',
    'prep.step1': '1/3 단계 — 런의 길이와 규칙을 고릅니다',
    'btn.title': '타이틀',
    'prep.nextCompany': '다음: 회사',
    'prep.warehouse': '용량 {cap} · 냉장 {cold} · 초대형 {xl}',
    'prep.warehouseRandom': '창고 무작위',
    'prep.contractsRandom': '계약 무작위 4개',
    'hud.cash': '자금',
    'prep.contracts': '계약',
    'prep.companyTitle': '회사 선택',
    'prep.step2': '2/3 단계',
    'btn.back': '이전',
    'prep.nextPerk': '다음: 퍽',
    'prep.noColdCompany': '냉장 구역이 없는 회사',
    'prep.sameFamily': '같은 계열({family}) 퍽 장착 중',
    'prep.step3': '3/3 단계',
    'prep.variants': '변형',
    'prep.perkCount': '퍽 {n}/{slots} (같은 계열은 하나만)',
    'prep.insuranceHead': '보험 (월 보험료는 월말 정산에서 차감, 무사고면 다음 달 -20%)',
    'prep.startupNoIns': '스타트업은 무보험으로 시작합니다. 2개월차 마켓부터 가입 가능',
    'prep.fans': '선호 고객: {list} (가입 중 월초 xp +1)',
    'prep.perkTitle': '퍽 장착',
    'prep.start': '런 시작',
    'tier.0': '시작',
    'tier.1': '1단계 · 기본',
    'tier.2': '2단계 · 특화 누적',
    'tier.3': '3단계 · 도전',
    'fmt.months': '{n}개월',
    'fmt.lastSameYear': '{n}월',
    'fmt.lastNextYear': '내년 {n}월',
    'fmt.pts': '{n}점',
    'fmt.calls': '{n}회',
    'fmt.perMonth': '월 {n}c',
    'fmt.count': '{n}개',
    'fmt.turns': '{n#d}일',
    'fmt.turnN': '{n}일',
    'fmt.level': '{n}단계',
    'fmt.cells': '{n}칸',
    'prep.family': '{family} 계열',
    'prep.slotFull': '퍽 슬롯은 {n}개입니다',
    'fmt.monthN': '{n}개월차',
    'hud.turn': '{d}일 {dow}',
    'hud.strike': '파업',
    'hud.familyPerk': '{family} 계열 퍽',
    'hud.upcoming': '입고 예정',
    'hud.monthEnd': '월말 정산',
    'hud.weekend': '일요일',
    'hud.rep': '평판',
    'rep.tier.unknown': '무명',
    'repi.tier': '지금 등급',
    'repi.toNext': '다음 등급 <b>{name}</b>까지 <b>{n}</b> — 이 등급 구간은 {from}~{to}입니다. 상한까지 채운 채로 정산을 넘기면 등급이 오릅니다.',
    'repi.top': '최고 등급입니다.',
    'repi.ready': '상한을 채웠습니다 — 사고 없이 이번 정산을 넘기면 <b>{name}</b> 등급이 됩니다.',
    'repi.up': '오릅니다: 차를 80% 이상 채워 보냄 · 고객 신뢰 상승 · 사고 없이 정산 통과',
    'repi.down': '깎입니다: 반송 · 도난 · 파손 · 부패 · 창고 초과 · 기한 초과',
    'repi.nextHead': '{name} 등급이 되면',
    'repi.nextScale': '물량 +{arr}% · 운영비 +{op}% — 벌이가 커지는 만큼 판도 커집니다',
    'repi.nextCust': '새 고객: {list}',
    'repi.nextGoods': '새 품목: {list}',
    'repi.zero': '0이 되면 아무도 맡기지 않습니다 — 런이 끝납니다.',
    'cust.locked': '아직 오지 않은 고객 — 소문이 나면 찾아옵니다',
    'cust.openNow': '지금 마켓에 뜰 수 있음',
    'cust.needTier': '{name} 등급부터',
    'sum.repTierUp': '⭐ 등급이 올랐습니다 — 새 고객이 찾아옵니다',
    'log.repCustomers': '   새 고객이 눈독을 들입니다: {list}',
    'rep.tier.local': '동네 소문',
    'rep.tier.ward': '구내 유명',
    'rep.tier.city': '시내 최고',
    'log.repTierUp': '⭐ 소문이 퍼졌습니다 — {name} (평판 상한 {cap})',
    'toast.repTierUp': '⭐ {name}',
    'why.repPenalty': '사고',
    'why.repMonthly': '이번 달 사정',
    'why.repFull': '차를 꽉 채워 보냄',
    'why.repCust': '고객 신뢰 상승',
    'why.repClean': '사고 없는 정산',
    'fmt.date': '{cal}월 {d}일',
    'fmt.dateDow': '{cal}월 {d}일 ({dow})',
    'fmt.dayN': '{d}일',
    'fmt.cycle': '{cal}월 {half}',
    'fmt.half1': '전반',
    'fmt.half2': '후반',
    'fmt.dows': '월,화,수,목,금,토',
    
    'log.weekend': '🛌 {d}일 일요일 — {choice}{extra}',
    'err.noOutdoor': '마당에 나가 있는 게 없습니다',
    'story.rep.1': '게이지 봐 — 오른쪽 위. 저게 <b>평판</b>이야. 이 동네가 자네를 어떻게 보는지지.<br>반송·도난·파손·부패, 창고 넘치는 것까지 전부 저기서 빠져. 눌러 보면 다음 등급까지 얼마 남았는지 나와.',
    'story.rep.1drop': '게이지 봐 — 오른쪽 위. 저게 <b>평판</b>이야. 방금 깎였지.<br>반송·도난·파손·부패, 창고 넘치는 것까지 전부 저기서 빠져. 눌러 보면 다음 등급까지 얼마 남았는지 나와.',
    'story.rep.2': '올리는 법도 있어. 차를 꽉 채워 보내면 오르고, 고객 신뢰가 오르면 오르고, 사고 없이 정산을 넘기면 올라.<br>저게 <b>0이 되면 아무도 자네한테 안 맡겨</b>. 그날로 끝이야.',
    'story.repUp.1': '오, 소문이 났네. 등급이 올랐어 — 이제 <b>{repTier}</b>야.<br>평판 상한도 같이 올라서, 사고 한 번에 바로 바닥나진 않아.',
    'story.repUp.2': '대신 물량이 늘고 임대도 같이 올라. 판이 커지는 거지.<br>그리고 전에는 안 오던 고객이 마켓에 얼굴을 내밀 거야. 고객 화면에서 누가 남았는지 볼 수 있어.',
    'story.cantHandle.1': '저거 봐. <b>실을 차가 없어.</b> 우리 계약 중에 저걸 받아 주는 데가 하나도 없다는 뜻이야.<br>저대로 두면 기한 넘기고 반송이야 — 돈도 못 받고 물어줘.',
    'story.cantHandle.2': '택배를 눌러 보면 어떤 계열 계약이 필요한지 나와. 그걸 이번 마켓에서 사면 돼.<br>계열마다 받는 게 정해져 있어 — 대량은 작고 평범한 것만, 냉장은 신선만, 대형은 큰 것만.',
    'story.bigParcel.1': '큰 게 들어왔네. 4칸짜리는 <b>대량 탑차에 안 들어가</b> — 대형이나 철도·해상 계약이라야 실어.<br>직접 배송도 안 되고. 마켓에서 대형 쪽 계약을 하나 잡아 둬.',
    'story.special.produce': '🌾 농산물이야. 폭염이 오면 창고 안에 있어도 상해 — 냉장 구역에 자리가 있거나 환기 시설이 있어야 무사해.<br>대량·냉장·철도 쪽이면 실어 주고, 직접 배송도 돼.',
    'story.weekend.1': '일요일이야. 우리는 월요일부터 토요일까지 엿새 일하고 하루 쉬어.<br>일요일엔 트럭이 안 움직이니까 부를 수가 없고, 입고도 기한도 같이 멈춰. 그건 걱정 말고.',
    'story.weekend.2': '문제는 마당이야. 밖에 둔 건 일요일 내내 거기 있어 — 도둑 한 번 더 맞는다고 보면 돼.<br>토요일 퇴근 전에 마당 비우는 게 습관이 돼야 해. 자, 오늘은 뭘 할래?',
    'story.weekendYard.1': '오늘 마당에 {outdoor}칸 나가 있어. 일요일 내내 거기 있는 거야 — 도둑 판정 한 번 더 받는다.<br>돈이 있으면 알바 세워서 지키는 게 싸게 먹힐 때가 있어. 없으면… 다음엔 토요일에 비워.',
    'wk.title': '🛌 일요일',
    'wk.head': '{cal}월 {d}일 일요일',
    'wk.sub': '일요일엔 배송이 없습니다. 입고도 기한도 멈춥니다 — 다만 <b>마당에 둔 물건은 도난 판정을 한 번 더</b> 받습니다.',
    'wk.outdoor': '🌧 마당에 <b>{vol}칸</b>이 나가 있습니다 · 도난 {pct}%',
    'wk.safe': '✔ 마당은 비어 있습니다',
    'wk.rest': '휴식',
    'wk.rest.d': '평판 +1',
    'wk.rest.done': '쉬었다',
    'wk.overtime': '야근',
    'wk.overtime.d': '다음 영업일 직접 배송 +2 · 평판 −1',
    'wk.overtime.done': '야근했다',
    'wk.parttime': '주말 알바',
    'wk.parttime.d': '{cost}c · 이번 일요일 도난 없음',
    'wk.parttime.done': '알바를 세웠다',
    'wk.go': '월요일로 →',
    'hud.outdoor': '🌧 야외 {vol}칸 ({n}개{storage}) · 지금 도난 {pct}%',
    'hud.outdoorStorage': '+보관',
    'hud.outdoorTag': '🌧 야외',
    'hud.outdoorLabel': '야외',
    'storage.left': '회수까지 {n#d}일',
    'hud.buyInMarket': '마켓에서 계약을 구매하세요',
    'hud.spare': '예비',
    'hud.loadCells': '{vol}/{cap}칸{more}',
    'hud.perParcel': '개당 {per}c',
    'hud.perNone': '실을 것 없음',
    'hud.contractSub': "실을 것 <b>{vol}</b>/{cap}칸{more} · {fee}c",
    'hud.noTurn': '영업일 소모 없음',
    'hud.simulN': '동시 {n}대',
    'hud.regular': '정기',
    'hud.express': '고속',
    'wait.overdue': '⏳초과 {n}',
    'wait.spoil': '🥀부패 {n}',
    'wait.frozenOver': '❆냉동 자리 없음 {n}',
    'wait.btn': '⏭ 대기 · 직접 배송',
    'wait.next': '다음 영업일 창고 {used}/{cap}{over}',
    'wait.over': ' 초과!',
    'cust.trustLv': '신뢰 {n}단계',
    'cust.suspended': '중단',
    'company.difficulty': '난이도',
    'company.warehouse': '창고 {cap} · 냉장 {cold} · 냉동 {frozen} · 초대형 {xl}',
    'company.facilities': '시설',
    'company.customers': '고객',
    'company.perks': '퍽',
    'company.customerDetail': '고객 상세',
    'weather.noEffect': '영향 없음',
    'weather.title': '날씨',
    'weather.head': '이번 달 계절: {season} · 예보는 {n#d}일 앞까지 (예보는 확정)',
    'weather.tent': '천막: 젖음 무효',
    'weather.note': '야외 적재 택배가 날씨의 영향을 가장 크게 받습니다. 폭염은 창고 안 🌾 농산물도 상하게 합니다(냉장 구역·환기 시설이면 무사).',
    'up.frozenOk': '❆ 냉동 구역 OK',
    'up.frozenNo': '❆ 냉동 자리 없음 → 즉시 폐기',
    'up.coldOk': '❄ 냉장 구역 OK',
    'up.coldNo': '❄ 냉장 자리 부족 → 상온',
    'up.customs': '🛃 통관 대기 {n#d}일',
    'up.burst': '⚡ 폭주 입고 (기한 -2)',
    'up.title': '{date} 입고 예정',
    'up.volume': '부피 <b>{vol}</b>칸',
    'common.warehouse': '창고',
    'up.heat': '🌡 폭염 경보일: 냉장 밖 신선·냉동 즉시 폐기',
    'up.note': '입고 순서는 예정대로이며, 통관 대기·냉장 배정은 입고 시점 상태로 정해집니다.',
    'btn.close': '닫기',
    'common.none': '없음',
    'fmt.calMonth': "<small class='yr'>{y}</small>{cal}월",
    'story.name': '박 반장',
    'story.skip': '건너뛰기 ×',
    'story.next': '다음 ▶',
    'story.ok': '알겠어',
    'story.tapHere': '여기를 눌러',
    'story.name.yeo': '여 실장',
    'story.name.noh': '노 기사',
    'story.name.kang': '강 소장',
    'story.name.rep': '{center} 담당자',
    'story.firstCall.rep': '첫 배차 감사합니다, 사장님! 차는 꽉 채워 주실수록 저희도 좋아요. 다음에도 잘 부탁드려요.',
    'story.loss.rep': '사장님, 사고 접수됐습니다. 저희 쪽 과실이 아니면 배상은 고객 쪽에 나갑니다. 다음부턴 기한 안에 부탁드려요.',
    'rep.switch': '{from} 쪽 계약은 여기서 정리됩니다. 남은 배차는 돌려드리지 못해요 — 이제부턴 저희가 모십니다.',
    'rep.greet.generic': '{center} 담당자입니다. {vehicle} {cap}칸, 대당 {fee}c, 배차 {trucks}대로 시작합니다. 배차가 떨어지면 마켓에서 가득 충전해 주세요.',
    'rep.greet.bulk': '{center} 여 실장입니다! {vehicle} {cap}칸에 대당 {fee}c, 배차 {trucks}대. 일반 택배는 저희한테 몰아 주세요 — 꽉 채우면 개당 제일 쌉니다.',
    'rep.greet.bulk.2': '{center} 여 실장입니다. 이번 차는 완충재가 들어가서 ⚠ 파손주의도 안전하게 실어요. {cap}칸, 대당 {fee}c, 배차 {trucks}대.',
    'rep.greet.bulk.3': '{center}, 여 실장입니다. 여기선 한 번에 두 대까지 붙여 드려요. {cap}칸짜리 완충 탑차 {trucks}대, 대당 {fee}c. 물량 걱정은 끝이에요.',
    'rep.greet.cold': '{center} 강 소장입니다. {vehicle} {cap}칸, 대당 {fee}c, 배차 {trucks}대. 신선은 냉장 구역에서 나오는 순간부터 시간이 갑니다. 늦지 않게 부르세요.',
    'rep.greet.cold.2': '{center} 강 소장입니다. 이 차엔 냉동칸이 있어요 — ❄ 냉장과 ❆ 냉동을 같이 싣습니다. {cap}칸, 대당 {fee}c, 배차 {trucks}대.',
    'rep.greet.frozen': '{center} 강 소장입니다. 냉동은 냉동실 밖으로 나가는 순간 끝이니까, 부르실 때 한 번에 모아서요. {cap}칸, 대당 {fee}c, 배차 {trucks}대.',
    'rep.greet.large': '{center} 노 기사요. 큰 거는 내 차에 실으면 안 깨져. {cap}칸, 한 대에 {fee}c, {trucks}대 넣어 뒀어. 4칸 넘는 놈들만 보내.',
    'rep.greet.large.2': '{center} 노 기사요. 이번 차는 냉장까지 되는 대형이야. ❄ 큰 신선도 실어. {cap}칸, 대당 {fee}c, {trucks}대.',
    'rep.greet.rail': '{center} 노 기사요. 열차는 한 번에 {cap}칸이나 실려. 대신 돈은 다음 영업일에 들어와. {trucks}대, 대당 {fee}c.',
    'rep.greet.rail.1': '{center} 노 기사요. 고속철이라 돈이 바로 들어와. {cap}칸, 대당 {fee}c, {trucks}대.',
    'market.refillName': '{name} 배차 가득 충전',
    'market.switchHint': '{name}에서 갈아타기 (같은 계열 상위 센터)',
    'err.refillFull': '배차가 이미 가득입니다',
    'log.refill': '배차 충전: {name} {n}대로 가득 (-{price}c){wasted}',
    'log.refillWasted': ' · 남아 있던 {n}대는 버려짐',
    'mk.refillDesc': '배차를 {max}대로 가득 채웁니다 (지금 {calls}대). 정액이라 남은 배차는 버려집니다 — 다 쓰고 충전하는 게 이득.',
    'mk.refillWaste': '⚠ 아직 {n}대 남음 — 지금 충전하면 {n}대 손해',
    'mk.tierVs': '계열 표준 대비: {cap0}→{cap1}칸 · {t0}→{t1}대 · {f0}→{f1}c/대',
    'mk.detail': '상세',
    'mk.refillBtn': '충전 {price}c',
    'cd.rep': '담당: {name}',
    'cd.family': '계열: {name} · {tier}',
    'cd.refillLine': '가득 충전 {price}c (마켓에서)',
    'toast.refill': '배차 충전: {name} {n}대',
    'slot.switchAsk': '{from} 계약을 정리하고 <b>{to}</b>와 새로 계약합니다. 남은 배차 {calls}대는 사라지고, 신뢰도는 새 센터에서 0부터 시작합니다.',
    'slot.switchBtn': '갈아타기',
    'story.calendar': '📅 달력 보기',
    'story.intro.1': '어서 와. 오늘부터 여기 사장은 자네야.<br>자네가 맡은 건 <b>{runCycles}사이클, {runMonths}개월</b>이야. {startCal}월에 시작해서 <b>{lastLabel}까지 굴리면 인수인계 끝이고, 여기는 자네 거야.</b><br>나는 석 달만 옆에서 잔소리하고 빠질게. 듣기 싫으면 저 ×를 눌러.',
    'story.intro.2': '저게 오늘 들어온 택배야. 저게 다 돈이지. 근데 저대로 두면 창고만 차.<br>옆에 ⏳ 보이지? 나흘 안에 보내야 해. 3월은 이사철이라 일반 택배가 좀 많아.',
    'story.intro.3': '제일 중요한 얘기 하나만 할게. 차는 매일 부르는 게 아니야. {name}은/는 한 대에 {fee}c씩 비용이 들어.<br>한 대에 택배를 꽉 채워서 보낼수록 택배 한 개당 비용이 싸져. 그러니까 오늘은 그냥 <b>기다려</b>.',
    'story.usage.1': '이 게이지가 창고야. 60%까지는 편하고, 75% 넘으면 슬슬 신경 쓰고, 90% 넘으면 밖에 쌓이기 시작해.<br>밖은… 나중에 얘기하자.',
    'story.callReady.1': '이제 차 부를 만해. 저 버튼에 <b>실을 것 {readyVol}/{readyCap}칸 · {readyFee}c</b> 라고 적혀 있지?<br>차 한 대가 {readyCap}칸인데 지금 이 계약으로 실을 게 {readyVol}칸 있다는 뜻이야. 한 대 부를 때마다 {readyFee}c 나가고.',
    'story.callReady.2': '그러니까 꽉 채워 보낼수록 개당 비용이 싸져. 80% 넘게 차면 손해 안 보는 선이고.<br>{ready} 눌러 봐 — 호출 창에서 뭘 누를지는 내가 하나씩 짚어 줄게.',
    'story.callModal.2': '버튼 오른쪽 <b>{openCalls}대</b>는 이번 달 남은 배차야. <b>×{openSimul}</b>은 한 번에 몇 대까지 같이 부를 수 있는지고 — 남은 배차가 모자라면 거기까지만 돼.',
    'story.callModal.3': '\'급한 순 자동 선택\'을 눌러 봐. 급한 것부터 <b>차가 꽉 차는 만큼만</b> 담아 줘.<br>반쯤 빈 차를 하나 더 부르면 배차비만 더 나가거든. 그래도 보내야 하면 직접 골라서 넣으면 돼.',
    'call.autoTrim': '꽉 차는 차까지만 담았어요. 더 보내려면 직접 고르거나, 대기할 때 직접 배송하세요.',
    'story.weatherDetail.1': '위 칸이 이번 달 날씨야. 아이콘 뜬 데까지가 확정 예보고, <b>?</b> 는 아직 몰라.<br>비는 마당에 나가 있는 것만 젖히는데, 폭염은 창고 안 🌾 농산물까지 상하게 해.',
    'story.weatherDetail.2': '그래서 예보 보고 미리 옮기는 거야. <b>대기</b> 버튼 안에 <b>적재 정리</b>가 있어 — 비싼 건 안에, 젖어도 되는 건 밖에.',
    'story.handOff.1': '자, 기본은 다 알려 줬어. 이번 달 남은 날은 자네가 해봐 — 쌓이면 부르고, 아니면 대기. 그게 전부야.<br>새로운 게 나오면 그때 또 끼어들게.',
    'story.m2Detail.1': '맨 위 <b>고객</b>이 이걸 보낸 곳이야. 기한 안에 보내면 그 고객 신뢰가 오르고, 신뢰가 오르면 물량이랑 단가가 같이 올라.<br>폐기하면 −3. 자꾸 그러면 거래가 끊겨.',
    'story.m2Detail.2': '아래 <b>처리할 수 있는 계약</b>을 봐. 이 택배를 어느 차로 보낼 수 있는지, 안 되면 왜 안 되는지 다 나와.<br>헷갈리면 택배를 눌러서 여기서 확인해.',
    'coach.waitQuiet': '{vol}칸 · {name} 차는 {cap}칸',
    'coach.readyQuiet': '{pct}%까지 찼어 · {name} 부를 만해',
    'story.waitFirst.1': '여기서 <b>그냥 대기</b>를 눌러. 직접 배송이랑 적재 정리는 나중에 얘기하자.',
    'coach.wait': '아직 {vol}칸이야. {name} 차는 {cap}칸 — 오늘도 <b>대기</b>.',
    'coach.ready': '{pct}%까지 찼어 — {name} 눌러서 불러.',
    'coach.stuck': '{list} {n}개는 지금 계약으로 못 보냅니다 — 택배를 눌러 어떤 계약이 필요한지 보세요',
    'coach.full': '창고가 꽉 찼어. 더 기다리면 밖에 쌓여 — 지금 부를 때야.',
    'coach.noContract': '계약이 없네. 마켓에서 하나 사야 차를 부르지.',
    'call.fillLow': '⚠ 적재 {pct}% · {need}칸 더 채우면 80%',
    'story.callModal.1': '방금 버튼에서 본 그 숫자, 여기서는 <b>게이지</b>로 보여 줘. {openVol}/{openCap}칸 — 차 한 대가 얼마나 차는지야.<br>버튼에서 한 번, 여기서 한 번. 굳이 밖에서 계산 안 해도 여기 들어와서 보면 돼.',
    'story.callGo.1': '담겼지? 게이지가 80% 넘으면 남는 장사야. 아래 목록을 눌러서 넣고 뺄 수도 있어.',
    'story.callGo.2': '됐으면 호출 버튼. 호출하면 그대로 하루가 지나가.',
    'story.firstCall.1': '잘했어. 방금 화면에 뜬 게 순익이야 — 수입에서 배차비 뺀 것.',
    'story.firstCall.2': '차를 80% 넘게 채우면 \'적재 효율\'이라고 업체 신뢰가 1 올라.<br>신뢰는 4월에 얘기하자. 지금은 "꽉 채우면 좋다"만 기억해.',
    'story.deadline1.1': '저거 내일까지야. 넘기면 보상이 4분의 1 깎이고, 이틀 더 두면 반송돼.<br>반송은 돈도 못 받고 물어줘. 급한 건 급한 대로 보내.',
    'story.usage76.1': '창고가 4분의 3 찼어. 여기부턴 다음 입고를 보고 움직여야 해.',
    'story.usage76.2': '위에 \'입고 예정\' 보이지? 앞으로 이틀에 뭐가 얼마나 오는지 미리 보여.<br>그걸 보고 기다릴지 부를지 정해.',
    'story.usage91.1': '어어, 넘치기 직전이야! 창고를 넘긴 택배는 마당에 나가고, 마당에 둔 건 도둑이 들어.<br>지금 부를 수 있는 차는 다 불러.',
    'story.summary1.1': '자, 첫 달 정산. 운영비 내역 봐 봐 — 월세 {rent}c, 계약 유지비, 시설비, 인건비.<br>월세는 안 깎여. 자네가 아낄 수 있는 건 배차비뿐이야.',
    'story.summary1.2': '그래서 차를 꽉 채우라는 거야. 자, 다음은 마켓. 계약은 거기서만 살 수 있어.',
    'story.market1.1': '여기가 마켓이야. 계약은 한 달에 한 번, 여기서만 사.<br>계약 = "이 업체 차를 한 달에 몇 대 부를 권리"야.',
    'story.market1.2': '카드마다 차 용량·대당 배차비·배차 대수가 적혀 있어. 배차는 쓰면 줄고 사이클이 바뀌어도 안 채워져 — 여기서 \'가득 충전\'만 돼.',
    'story.market1b.1': '4월엔 고객이 특수 물건을 슬슬 맡기기 시작해. 냉장 구역은 비워 둬.',
    'story.marketFc.1': '<b>예상 물량</b> 줄을 눌러 봐. 다음 사이클에 어떤 택배가 몇 개쯤 올지 미리 보여 줘.',
    'story.marketFcOpen.1': '고객별로 몇 개, 그중 특수 택배가 뭐가 몇 개인지까지 나와.<br>여기 없는 건 안 온다는 뜻이고, 여기 있는 건 <b>받을 준비를 해 둬야 한다</b>는 뜻이야. 그걸 보고 부족한 차를 채우고, 모자란 계약을 사.',
    'story.marketBlocked.1': '봐, 붉은 줄. <b>{fcBlocked}</b>이/가 오는데 지금 계약 중에 받아 줄 데가 없어.<br>오고 나서 사면 이미 늦어 — 지금 여기서 해결해.',
    'story.marketPremium.1': '이게 <b>프리미엄</b> 등급이야. 같은 계열인데 차가 크고 배차가 많아 — {premCap0}칸 {premTrucks0}대가 {premCap1}칸 {premTrucks1}대가 돼.<br>카드에 \'계열 표준 대비\'로 적혀 있어. 대신 {premPrice}c. 돈 남을 때 얘기고, 지금은 표준으로 충분해.',
    'story.m2.1': '4월이야. 이달부턴 고객 얘기를 해야겠네.',
    'story.m2.2': '택배 하나 눌러 봐. 누가 보냈는지, 어디로 보낼 수 있는지 거기 다 적혀 있어.',
    'story.special.cold': '❄ 신선이 왔네. 냉장 구역에 자동으로 들어가는데, 구역이 꽉 차서 밖에 나가면 하루 만에 상해.<br>냉장 차로 보내야 보너스도 붙어.',
    'story.special.fragile': '⚠ 파손주의야. 아무 차나 실을 수는 있는데, 완충 차가 아니면 깨질 확률이 있어.<br>깨지면 물어줘야 해.',
    'story.special.customs': '🛃 통관 물건이야. 이틀은 세관에 묶여서 손도 못 대고 자리만 차지해.<br>기한은 통관이 끝나고 나서 시작해.',
    'story.special.frozen': '❆ 냉동이야. 냉동실 밖으로 나가는 순간 폐기야. 냉동 차로만 보낼 수 있어.',
    'story.noContract.1': '저 택배, 지금 계약으로는 실을 차가 없어. 이럴 땐 대기 버튼을 눌러 봐 — 직접 배송이라고, 기다리는 동안 내가 하나씩 나르는 거야.',
    'story.noContract.2': '배송비가 좀 나가긴 하는데 반송보다는 싸. 다음 마켓에서 맞는 계약을 사 두는 게 정답이고.',
    'story.waitSelf.1': '이 목록이 직접 나를 수 있는 택배야. 하나 골라 봐 — 비용은 옆에 적혀 있어.',
    'story.waitGo.1': '골랐으면 아래 버튼. 이번엔 기다리면서 그거 하나 직접 나르는 거야.',
    'story.offer.1': '이사센터에서 자리 빌려 달라는데? 이사철이라 이런 제안이 자주 와.<br>차 안 불러도 되고, 자리만 내주면 보관료를 줘.',
    'story.offer.2': '대신 그만큼 창고가 좁아져. 창고가 넉넉할 때만 받고, 급하면 조기 반환도 돼 — 위약금은 좀 있어.',
    'story.cash.1': '위에 자금 숫자, 저게 지금 가진 돈이 아니라 <b>월말 예상 잔액</b>이야. 배차비는 월중에 안 빠지고 월말에 한꺼번에 나가거든.<br>돈 때문에 차를 못 부르는 일은 없어.',
    'story.cash.2': '빨간색이면 월말에 모자란다는 뜻이야. 모자란 만큼 단기 차입이 되고 이자가 {interest}% 붙어.<br>두 달 연속이면 아프니까, 이달 안에 택배를 더 보내.',
    'story.summary2.1': '아래 고객별 수입 봐. 한 고객한테만 기대면 그 고객 끊길 때 같이 끊겨. 두 축은 있어야 해.',
    'story.market2.1': "위에 계약마다 '충전' 버튼 보이지? 정액이라 다 쓰고 채우는 게 이득이야. 같은 계열의 더 큰 센터가 나오면 갈아탈 수도 있어 — 담당자도 바뀌고 신뢰도 처음부터지만.<br>창고 확장은 갈수록 비싸지니까 미루지 말고.",
    'story.m3.1': '5월, 가정의 달. 선물 상자가 늘어 — 파손주의 말이야.',
    'story.m3.2': '깨지면 물어줘야 하니까 보험 얘기를 해야겠네. 위 HUD에 보험사 보이지? 마켓에서 고를 수 있어.<br>청구가 없으면 보험료가 내려가고.',
    'story.fragileRisk.1': '파손주의가 있는데 완충 차가 없네. 호출 창에 파손 확률이랑 배상액이 미리 보여.<br>"25%면 네 번에 한 번 물어주는 거야" — 그 값을 보고 정해.',
    'story.loss.1': '아이고, 사고 났네. 폐기되면 보상은 0이고 고객이 배상을 청구해.',
    'story.loss.2': '보험이 있으면 일부는 돌려받아. 없으면 마켓에서 보험사를 골라 둬.<br>평판도 깎였을 거야 — 게이지가 끝까지 차면 끝이니까.',
    'story.rain.1': '비 예보 떴다. 지금 마당에 {outdoor}칸 나가 있잖아 — 젖으면 보상이 20% 깎여. 냉장·냉동은 상관없고.',
    'story.rain.2': '날씨 아이콘 눌러 봐. 며칠 앞까지 뭐가 오는지 거기 다 나와.',
    'story.rainReorder.1': '이 버튼이 적재 정리야. 비 오는 날은 비싼 걸 안에, 젖어도 되는 걸 밖에.',
    'story.win.1': '이 동네 택배는 보름씩 끊어 돌아. 자네 몫은 {runCycles}사이클 — {startCal}월에 시작했으니까 {lastLabel}까지야.',
    'story.win.2': '{lastCal}월 물량까지 넘기면 그때부터 자네가 진짜 사장이야. 이기고 지고가 아니라, 넘겨받는 거지. 점수니 뭐니는 그다음 얘기고.',
    'story.win.3': '그 전에 빚이 한도를 넘거나 평판이 바닥나면… 뭐, 다시 하면 되지.',
    'story.summary3.good': '석 달 성적표. 처리 {delivered}개, 사고 {returned}건, 만차 {full}번. 남았네, 잘했어.<br>6월부터 물량이 뛰니까 지금 번 돈은 계약이랑 창고에 써.',
    'story.summary3.bad': '석 달 성적표. 처리 {delivered}개, 사고 {returned}건, 만차 {full}번. 좀 빠듯하네.<br>6월부터 물량이 뛰어 — 배차 추가부터 챙기고, 차는 꼭 채워서 보내.',
    'story.farewell.1': '석 달 됐네. <b>여기까지가 인수인계야.</b><br>처음 왔을 때는 차 한 대 부르는 것도 물어보더니, 이제 나 없어도 돌아가더라.',
    'story.farewell.2': '달력은 사무실 벽에 붙여 뒀어. 9월 추석, 11월 행사, 12월 연말 — 이 셋만 조심해.<br>위에 달 숫자를 누르면 언제든 볼 수 있어.',
    'story.farewell.3': '<b>이 창고, 이제 자네 거야. 잘 부탁하네.</b><br>급하면 문자할게. 커피는 자네 몫이고.',
    'story.startTitle': '인수인계',
    'story.startBody': '동네 택배를 물려받아 <b>봄 석 달(분기 · 6사이클)</b>을 돕니다. 전임 창고장 <b>박 반장</b>이 그 석 달 내내 옆에서 규칙을 하나씩 알려 줍니다.<br>여기서 끝까지 가면 반기·한 해 같은 더 긴 런이 열립니다. 강제는 아니에요 — 대화는 언제든 건너뛸 수 있고, 메뉴에서 끌 수 있습니다.',
    'story.diffAsk': '난이도',
    'story.start': '시작',
    'story.trucks2.1': '지금 실을 게 <b>{vol}칸</b>인데 차 한 대는 {openCap}칸이야. 그래서 차가 <b>{trucks}대</b> 붙었어.',
    'story.trucks2.2': '{trucks}대면 배차도 {trucks}대 빠지고 배차비는 {callFee}c야. 대신 한 번에 다 나가지.<br>게이지가 80% 넘으면 여러 대라도 남는 장사야.',
    'story.callsOut.1': '{outName} 배차가 다 떨어졌어. 보낼 건 있는데 부를 차가 없는 거지.',
    'story.callsOut.2': '배차는 월초에 저절로 안 채워져. 월말 <b>마켓</b>에서 \'가득 충전\'을 사야 다시 차.<br>이번 달은 다른 계약으로 돌리거나, 대기할 때 직접 배송으로 버텨.',
    'story.marketRefill.1': '맨 위 <b>현재 계약</b> 칸 봐. 배차는 여기서만 채워.<br>{refillName}은/는 지금 {refillLeft}대 남았고, 가득 채우는 데 {refillPrice}c야.',
    'story.marketRefill.2': '정액이라 몇 대 남았든 값은 같아. 그러니까 <b>다 쓰고 채우는 게</b> 제일 싸지.<br>{refillPrice}c면 {refillMax}대로 가득 찬다.',
    'story.marketLimit.1': '배차를 아예 늘리는 방법도 있어. <b>{limitName}</b> — {limitPrice}c에 그 계약 배차 한도가 영구히 +{limitN}대야.<br>충전은 채우는 거고, 이건 그릇을 키우는 거지.',
    'story.marketSwitch.1': '{switchName}은/는 {switchFrom}보다 윗급 센터야. 차 {switchCap}칸에 배차 {switchTrucks}대 — 같은 일을 더 많이, 더 싸게 해.',
    'story.marketSwitch.2': '대신 갈아타면 {switchFrom}에 남은 배차 {switchLeft}대는 사라지고 신뢰도 0부터 다시야.<br>배차 다 쓰고 갈아타라는 말, 이래서 하는 거야.',
    'title.tutorAsk': '먼저 「인수인계」부터 해볼까?',
    'title.tutorBody': '전임 창고장이 첫 석 달을 옆에서 알려 줍니다. 한 번 익혀 두면 새 런이 훨씬 수월해요.',
    'title.tutorGo': '인수인계 시작',
    'title.tutorSkip': '그래도 새 런',
    'title.newHint': '인수인계 먼저 권장',
    'title.story': '인수인계',
    'title.storySub': '스토리 튜토리얼 · 첫 석 달',
    'prep.story': '창고장 안내',
    'prep.storyDesc': '박 반장이 첫 3개월 동안 옆에서 규칙을 알려 줍니다 (어느 회사·시나리오든)',
    'menu.story': '창고장 안내: {v}',
    'menu.sms': '계절 문자: {v}',
    'help.notes': '창고장 노트',
    'help.notesEmpty': '아직 들은 얘기가 없어요. 인수인계(스토리 모드)나 창고장 안내를 켜면 여기에 쌓입니다.',
    'sms.from': '📱 박 반장',
    'cal.title': '한 해 달력',
    'cal.thisMonth': '이번 달',
    'cal.eventTurns': '{a}~{b}일',
    'cal.arrivals': '물량 {pct}',
    'cal.event.holiday_rush': '명절 폭주 — 그 기간 입고 ×1.6, 기한 −이틀',
    'cal.event.holiday_off': '연휴 — 배송 중단 (차를 못 부름. 창고는 그대로라 입고는 계속된다)',
    'cal.event.gift': '선물 주간 — ⚠ 파손주의 보상 +10',
    'cal.event.sale': '쇼핑 행사 — 일반 폭주 ×1.5, 대량 배차비 −10%',
    'cal.kr.1.label': '신정·비수기',
    'cal.kr.1.note': '비수기 — 물량 −15%, 폭설 잦음, 이달은 운영비 인플레 없음',
    'cal.kr.1.sms': '새해 첫 달은 잠잠해. 숨 돌리면서 2월 설 준비.',
    'cal.kr.2.label': '설',
    'cal.kr.2.note': '설 — 물량 +30%, 선물세트(신선·농산·파손) ↑, 3~5일차 폭주, 6~7일차 연휴(토·일·월)',
    'cal.kr.2.sms': '설. 추석이랑 같은데 더 짧고 세. 이거 넘기면 끝이야. 잘했어.',
    'cal.kr.3.label': '봄 이사철',
    'cal.kr.3.note': '봄 이사철·신학기 — 물량 +5%, 대형 ↑, 보관 제안 ↑',
    'cal.kr.3.sms': '',
    'cal.kr.4.label': '이사철 마무리',
    'cal.kr.4.note': '이사철 마무리 — 봄나물(농산물) ↑, 보관 제안 ↑, 비 조금',
    'cal.kr.4.sms': '',
    'cal.kr.5.label': '가정의 달',
    'cal.kr.5.note': '가정의 달 — 물량 +5%, 선물(파손주의) ↑, 6~9일차 선물 주간(⚠ 보상 +10)',
    'cal.kr.5.sms': '',
    'cal.kr.6.label': '장마 시작',
    'cal.kr.6.note': '장마 시작 — 비 잦음(야외 젖음), 초여름 신선 ↑',
    'cal.kr.6.sms': '장마 시작이야. 밖에 둔 건 다 젖어. 안에 못 넣을 거면 먼저 보내.',
    'cal.kr.7.label': '장마·폭염',
    'cal.kr.7.note': '장마·폭염 — 신선·냉동 ↑, 물량 −5%, 폭염 경보 월 1회',
    'cal.kr.7.sms': '폭염. 냉장 물건 밖에 두면 그날로 끝이야. 냉장 구역 넓힐 거면 지금.',
    'cal.kr.8.label': '폭염·휴가',
    'cal.kr.8.note': '폭염·휴가 — 일반 −10%p, 신선 ↑, 물량 −10%',
    'cal.kr.8.sms': '휴가철이라 일반은 좀 줄고 신선이 많아. 냉장 차 한 대 더 잡아 둬.',
    'cal.kr.9.label': '추석',
    'cal.kr.9.note': '추석 — 물량 +25%, 선물세트(신선·농산·파손) ↑, 3~10일 폭주, 13~16일 연휴',
    'cal.kr.9.sms': '추석 전주엔 선물세트가 쏟아지고, 연휴엔 차가 안 잡혀. 연휴 전에 창고 비워.',
    'cal.kr.10.label': '가을 이사철',
    'cal.kr.10.note': '가을 이사철·수확 — 농산물 ↑, 보관 제안 ↑·보관료 +20%',
    'cal.kr.10.sms': '가을 이사철. 이사센터가 자리 빌려 달라고 올 거야. 창고 남으면 받아.',
    'cal.kr.11.label': '김장·쇼핑 행사',
    'cal.kr.11.note': '김장철·쇼핑 행사 — 물량 +30%, 농산물 ↑, 8~12일차 행사 주간(일반 폭주, 대량 배차비 −10%)',
    'cal.kr.11.sms': '김장철에 농산물 나오고, 월말엔 쇼핑 행사로 일반이 폭주해. 대량 배차 넉넉히.',
    'cal.kr.12.label': '연말',
    'cal.kr.12.note': '연말 — 물량 +40%, 파손·냉동·대형 ↑, 폭설(자연 냉장), 반송 유예 −1',
    'cal.kr.12.sms': '연말이야. 파손주의·냉동·큰 물건이 다 늘어. 올해 제일 바쁜 달. 보험 확인.',
    'err.holidayOff': '연휴 — 업체가 쉽니다 (직접 배송만 가능)',
    'log.holidayOff': '🎑 연휴 휴무 — 업체 호출 불가',
    'log.calEvent': '📅 {name} ({a}~{b}일)',
    'hud.off': '휴무',
    'fmt.calOnly': '{cal}월',
    'mk.seasonLine': "다음 달 {cal}월 · {season}: {note}",
    'mk.seasonLineNow': '이번 달 {cal}월 · {season}: {note}',
    'season.spring': '봄',
    'season.summer': '여름',
    'season.autumn': '가을',
    'season.winter': '겨울',
    'attr.cold': '냉장 구역 밖이면 다음 영업일에 폐기',
    'attr.fragile': '⚠ 능력 없는 업체로 보내면 파손 확률',
    'attr.customs': '통관 대기 중엔 처리 불가 (통관 대행 제외)',
    'attr.frozen': '냉동 구역 밖이면 즉시 폐기',
    'attr.produce': '폭염이면 창고 안이라도 상함 (냉장 구역·환기 시설이면 무사)',
    'pd.specialBonus': '특수 보너스 +{n}',
    'pd.breakRisk': '⚠ 파손 {pct}%',
    'pd.cannotCall': '호출 불가',
    'pd.baseReward': '기본 {n}c',
    'pd.perPiece': '(개당 +{n})',
    'pd.claim': '폐기 시 손해배상 <b style="color:var(--red)">{claim}c</b>',
    'pd.arrivedAgo': '입고 {n#d}일 전',
    'pd.wet': '젖음 (보상 -20%)',
    'pd.outdoor': '🌧 야외 적재 중',
    'pd.contracts': '처리할 수 있는 계약',
    'pd.needFamily': '지금 계약으로는 못 보냅니다 — <b>{list}</b> 계열 계약이 있어야 합니다 (마켓에서 구할 수 있어요)',
    'pd.needNothing': '지금 계약으로는 못 보냅니다 — 창고 시설이나 강화가 필요합니다',
    'cd.blocks': '취급 못 함: {list}',
    'cd.sizeOnly': '크기 {min}~{max}칸만',
    'mk.newlyHandles': '＋ 지금은 못 하던 것: {list}',
    'mk.newSize': '크기 {n}칸',
    'pd.noContract': '계약 없음',
    'pd.selfRow': '직접 배송 (대기할 때)',
    'pd.selfCost': '배송비 {cost}c, 보상 그대로',
    'pd.ok': '가능',
    'offer.title': '{name} 보관 제안',
    'offer.prepaid': '선불 <b>{fee}c</b>',
    'offer.perTurn': '하루에 {perTurn}c 후불 ({total}c)',
    'offer.note': '수락 시 창고 {used} → {after}/{cap}{push} · 기간 중 손댈 수 없음, 무사히 끝나면 신뢰 +2',
    'offer.push': '(내 택배가 야외로 밀려남)',
    'offer.accept': '수락',
    'offer.decline': '거절',
    'offer.feeFloat': '보관료 +{n}c',
    'storage.postpaid': '회수 시 {n}c 후불',
    'storage.prepaid': '선불 {n}c 받음',
    'storage.earlyNote': '조기 반환: 남은 기간 환불 {refund}c + 위약금 30c = <b>{total}c</b> 지불, 고객 신뢰 -1. 급할 때 공간을 되찾는 탈출구입니다.',
    'storage.earlyBtn': '조기 반환 (-{n}c)',
    're.claim': '배상 {n}c',
    're.outOfZone': '구역 밖!',
    're.wet': '젖음',
    're.storageClaim': '도난 시 배상 ×2',
    're.inside': '창고 안',
    're.outside': '야외 <b>{vol}칸</b> · 도난 {pct}%',
    're.nextTurn': '다음 영업일',
    're.presets': '프리셋',
    're.preUrgent': '급한 것 우선',
    're.preReward': '고보상 우선',
    're.preClaim': '고배상 우선',
    're.preCustomer': '{icon} 우선',
    're.zoneIn': '🏠 창고 안 — 탭하면 야외로',
    're.empty': '비어 있음',
    're.zoneOut': '🌧 야외 — 탭하면 창고 안으로',
    're.title': '적재 정리',
    'btn.apply': '적용',
    're.sub': '창고 안이 용량을 넘으면 덜 급한 것부터 자동으로 밀려납니다',
    'trust.next': '다음 {have}/{need}: {effect}',
    'trust.max': '최고 단계',
    'trust.remain': '{n}xp 남음',
    'ps.warm': '🔥 상온 · 다음 영업일 폐기',
    'ps.cold': '❄ 냉장',
    'ps.produceCold': '🌾 냉장 빈자리 대피(폭염 안전)',
    'ps.frozenOut': '🔥 냉동 구역 밖',
    'ps.frozen': '❆ 냉동',
    'ps.heat': '🔥 폭염에 상함',
    'ps.customs': '🛃 통관 {n#d}일{delayed}',
    'ps.delayed': '(지연)',
    'ps.overdue': '⏳ 초과{ret}',
    'ps.returnIn': '반송 {n#d}일',
    'ps.noCarrier': '실을 차 없음',
    'ps.deadline': '⏳ <b>{n#d}</b>일',
    'hud.emptyWarehouse': '창고가 비어 있습니다',
    'call.riskTag': '⚠ 파손 위험',
    'call.spare': '예비 기사 (월 1회)',
    'call.xpGain': '이 호출 <b>+{xp}xp</b> ({parts})',
    'call.nextLevel': '다음 단계',
    'call.trackToggle': '단계별 해금',
    'call.capacity': '용량 <b>{cap}</b>칸',
    'call.remain': '잔여',
    'call.btn': '호출',
    'call.riskLine': '⚠ 파손 위험 {n}개 — 각 {pct}% (예상 손실 {loss}c). 파손되면 폐기 + 평판 −2',
    'call.caps': '능력',
    'call.size': '크기 {min}~{max}',
    'call.payLater': '⏱ 입금 {n#d}일 뒤',
    'call.bonus': '보너스',
    'call.selected': "선택 <b>{n}</b>/{cap}개",
    'call.pickUrgent': '급한 순 자동 선택',
    'call.pickClear': '선택 해제',
    'call.instant': '⚡즉시 처리',
    'call.noTurn': '영업일을 쓰지 않음',
    'call.maxSelect': "차량 용량 {cap}칸을 넘습니다 — 한 대 더 부르거나 덜어내세요",
    'float.broken': '⚠ 파손! {short}',
    'float.delayed': '+{n}c ({delay#d}일 뒤)',
    'toast.custSuspend': '{name} 거래 중단 — 다음 달 재개',
    'float.claim': '손해배상 -{n}c',
    'toast.trustUp': '⭐ {name} 신뢰 {level}단계: {effect}',
    'float.self': '직접 배송 +{rev}c (배송비 -{cost}c)',
    'pd.sizeOut': '크기 범위 밖',
    'pd.plainOnly': '속성 없는 택배만',
    'pd.notSpecial': '전문 대상 아님',
    'pd.noFrozenCap': '❆ 능력 없음',
    'pd.no': '불가',
    'wm.rewardCost': '보상 <b>{reward}</b>c · 배송비 <b style="color:var(--orange)">{cost}</b>c',
    'wm.overdue': '⏳ 기한 초과 {n}개',
    'wm.spoil': '🥀 부패 {n}개',
    'wm.frozenOver': '❆ 냉동 자리 없음 {n}개',
    'wm.nextWarehouse': '다음 영업일 창고',
    'wm.ifWait': '대기하면',
    'wm.outdoor': '🌧 야외 {vol}칸 · 지금 도난 {pct}%',
    'wm.selfHead': '🚚 직접 배송 — 이번에 <b>{n}개</b>까지 (크기 ≤ {size}) · 보상은 그대로, 배송비 {base}c + 크기×{per}c',
    'wm.vans': '차량',
    'wm.noVans': '차량 없음 — 속성 없는 택배·농산물만',
    'wm.blocked': '직접 배송 불가 {n}개 (택배 상세에서 사유 확인)',
    'wm.title': '대기',
    'wm.selfWait': '직접 배송 {n}개 후 대기 (-{cost}c)',
    'wm.justWait': '그냥 대기',
    'wm.sub': '차를 부르지 않고 하루를 넘깁니다',
    'wm.limit': '한 번에 {n}개까지',
    'float.discard': '폐기! {why}',
    'float.paid': '{name} 입금 +{n}c',
    'float.storageEnd': '보관 회수 {pay}',
    'float.storageStolen': '보관 물품 도난! -{n}c',
    'toast.offer': '보관 제안이 왔습니다',
    'float.returned': '반송! {short}',
    'float.stolen': '도난! {short}{size}',
    'float.stress': '스트레스 +{n}',
    'float.rep': '평판 −{n}',
    'sum.net': '이번 달 순익',
    'sum.netFlow': '{from}c → {to}c',
    'sum.noIncident': '✔ 사고 없음 — 반송·도난·파손·폐기 0',
    'sum.secIncome': '수입',
    'sum.secCost': '지출',
    'sum.secIncident': '사고',
    'sum.secState': '이번 달 · 상태',
    'sum.secCust': '고객',
    'sum.revenue': '배송 수익',
    'sum.opCost': '월말 운영비',
    'sum.opCostDetail': '임대 {rent} · 계약 유지 {contracts} · 시설 유지 {facilities} · 인건비 {labor} (입고 {arrivals}개)',
    'hud.feesDue': "배차비 −{n}",
    'hud.cashLbl': "월말 예상",
    'hud.cashNow': "현금 {n}",
    'hud.pending': "입금 예정 +{n}",
    'hud.stock': '재고 +{n}',
    'hud.opCostDue': "운영비·보험 −{n}",
    'hud.loanWarn': "⚠ 부족분은 단기 차입(이자 15%)",
    'hud.debt': "차입 상환 −{n}",
    'sum.loanRepaid': "차입 상환",
    'sum.loanInterest': "(이자 {n})",
    'sum.loan': "단기 차입",
    'sum.loanNote': "부채 {debt}c — 다음 정산에 이자 {interest}c와 함께 갚습니다. 부채가 {limit}c를 넘으면 부도",
    'log.loan': "단기 차입 {n}c (다음 정산에 이자 {interest}c 포함 상환)",
    'log.loanRepaid': "차입 상환 {n}c + 이자 {interest}c",
    'sum.closing': '월말 결산 보너스',
    'sum.callsWaits': '업체 호출 / 대기',
    'sum.delivered': '처리한 택배',
    'sum.penalty': '이번 달 페널티',
    'sum.rsb': '반송 / 도난 / 파손',
    'sum.claims': '손해배상',
    'sum.covered': '(보험 {n} 보장)',
    'sum.premium': '보험료 ({name})',
    'sum.claimsNext': '청구 {n}건 → 다음 달 보험료 {next}c',
    'sum.noClaimBonus': '무사고 2개월: 고객 전원 신뢰 +1',
    'sum.selfCost': '직접 배송비',
    'sum.storageIncome': '보관료',
    'sum.overdueVol': '기한 초과 보관 중',
    'sum.discarded': '부패 폐기',
    'sum.runDiscard': '(런 누적 {n}/{max})',
    'sum.cash': '현재 자금',
    'sum.goal': '(목표 {n})',
    'sum.stress': '스트레스',
    'sum.rep': '평판',
    'sum.usage': '창고 사용률',
    'sum.repToNext': '다음 등급까지 {n}',
    'sum.usageVal': '{pct}% ({n}개 보관 중)',
    'sum.deliverGoal': '처리 목표',
    'sum.storageGoal': '보관 계약 완수',
    'fmt.cases': '{n}건',
    'sum.bigCustomer': '대형 계약 고객',
    'common.trust': '신뢰',
    'sum.custClaim': '배상 -{n}c',
    'sum.title': '{n} 정산',
    'sum.final': '최종 결과',
    'sum.toMarket': '마켓으로',
    'mk.capCalls': '회당 {cap}개 · 최대 {calls}회',
    'mk.oneTime': '(1회성)',
    'mk.claimMult': '배상 ×{n}',
    'mk.custStart': '신뢰 0단계로 거래 시작 (고객 {n}/{max})',
    'common.xl': '초대형',
    'mk.afterBuy': '구매 후',
    'mk.allFacilities': '이미 모든 시설을 구매했습니다',
    'mk.sold': '판매됨',
    'mk.currentContracts': '현재 계약 — 배차는 여기서만 충전{keep}',
    'mk.keepCalls': ', 잔여 {n}회 보존',
    'mk.contractLine': '배차 {calls}/{max}대 남음, 차량 {cap}칸',
    'mk.mine': '내 계약',
    'mk.prepNote': '1개월차 시작 전입니다.',
    'mk.bought': '구매',
    'mk.refresh': '마켓 새로고침 ({cost})',
    'mk.free': '무료',
    'mk.prepTitle': '준비 마켓',
    'mk.title': '{n} 마켓',
    'mk.startMonth': '{n} 시작',
    'toast.strike': '✊ 이번 달 {name} 파업 — 호출 불가',
    'mk.priceMult': '가격 ×{n}',
    'slot.pickReplace': '교체할 슬롯을 고르세요. 잔여 배차·강화는 사라지고 업체 신뢰도는 남습니다.',
    'slot.pickApply': '적용할 계약을 고르세요.',
    'slot.emptyHint': '여기에 새 계약을 넣습니다',
    'slot.limitEnh': '한도강화 {n}/2',
    'slot.capEnh': '용량강화 {n}/3',
    'kind.contract': '계약',
    'kind.enh': '강화',
    'kind.fac': '시설',
    'kind.item': '보험',
    'kind.customer': '고객',
    'res.unlocked': '🔓 {name} 해금',
    'res.best': '★ 최고 기록',
    'res.scenarioCompany': '시나리오 / 회사',
    'res.reached': '도달',
    'res.revenue': '총 배송 수익',
    'res.spent': '총 지출',
    'res.cash': '최종 자금',
    'res.callsWaits': '호출 / 대기',
    'res.deliveredDiscarded': '처리 택배 / 폐기',
    'res.seed': '시드',
    'res.toTitle': '타이틀로',
    'res.again': '같은 조건으로 다시',
    'res.win': '완주!',
    'res.winStory': '인수인계 완료',
    'res.over': '게임오버',
    'rec.head': '최고 기록 <b>{best}점</b> · 런 {runs}회 (성공 {clears})',
    'rec.dailyStreak': '데일리 연속 {n}일',
    'rec.win': '성공',
    'rec.lose': '실패',
    'rec.empty': '아직 기록이 없습니다.',
    'rec.title': '런 기록',
    'cust.next': '다음 {have}/{need}',
    'cust.lv1': '물량 ×1.0 · 개당 +5 (0단계는 물량 ×0.6)',
    'cust.defaultMix': '월별 기본 비율',
    'cust.thisMonth': '이번 달 {n}개 · +{rev}c',
    'cust.suspendedLong': '거래 중단 (다음 달 재개)',
    'ins.current': '가입 중',
    'ins.nextMonth': '다음 달 {n}c',
    'ins.joinFee': '가입비 {n}c · 월 {n}c',
    'ins.fans': '선호 고객',
    'ins.noFans': '(이 회사에 없음)',
    'ins.startup': '스타트업은 첫 달 무보험. 2개월차 마켓부터 가입할 수 있습니다',
    'ins.rules': '보험료는 월말에 차감. 청구 0건이면 다음 달 ×0.8(연속 2개월 ×0.7 + 고객 전원 신뢰 +1), 3~4건 ×1.3, 5건↑ ×1.7·보장 절반. 갈아타면 새 보험사 기본 보험료를 가입비로 냅니다.',
    'ins.coverHalf': '이번 달 보장 절반 (지난달 청구 5건 이상)',
    'ins.marketOnly': '보험은 마켓에서 갈아탈 수 있습니다',
    'ins.confirm': '{name}(으)로 바꿀까요? 가입비 {fee}c',
    'ins.join': '가입',
    'cust.rules': '기한 내 처리 +1xp · 특수 규칙 +1xp · 폐기 -3xp (0 밑이면 거래 중단). 신뢰가 오르면 물량과 개당 보상이 오르고, 폐기하면 고객이 손해배상을 청구합니다.',
    'my.slot': '슬롯 {n}',
    'my.limit': '배차 한도 +{n}대',
    'my.cap': '처리 용량 +{n}',
    'my.remain': "배차 {calls}/{max}대",
    'my.stats': "{vehicle} <b>{cap}</b>칸 · 대당 {fee}c · 동시 {simul}대 · 이번 런 {calls}회 호출 · {n}개 처리",
    'my.others': '계약은 없지만 신뢰도가 남아 있는 업체',
    'my.note': '배차는 소모품(월초 리셋 없음, 마켓에서 가득 충전). 교체 시 잔여 배차·강화 소멸{keep}, 신뢰도는 센터별',
    'codex.carriersHead': '운송 업체 · 신뢰도는 업체에 쌓이고 계약을 바꿔도 유지',
    'codex.liveRun': '(현재 런 진행도)',
    'codex.carrierPrice': "{vehicle} {cap}칸 · 대당 {fee}c · 월 {trucks}대 · {price}c",
    'codex.need': '전용({icons})',
    'codex.perkSlots': '퍽 슬롯 {n}개 · 같은 계열은 하나만 장착',
    'codex.slotReward': '퍽 슬롯 {n}개',
    'codex.multiReward': '반기 결산 + 퍽 슬롯 2개',
    'stat.runsClears': '런 / 클리어',
    'stat.best': '최고 점수',
    'stat.delivered': '처리 택배',
    'stat.contracts': '계약 구매',
    'stat.tidy': '깔끔한 월말',
    'stat.daily': '데일리 연속',
    'fmt.days': '{n}일',
    'stat.profileNote': '프로필은 이 기기에 저장됩니다 (구글 플레이 게임즈 연동 예정).',
    'stat.reset': '프로필 초기화',
    'stat.resetConfirm': '해금·도전과제·기록을 모두 지웁니다. 계속할까요?',
    'stat.resetBtn': '초기화',
    'demo.fullOnly': '본편에서',
    'demo.storySub': '스토리 튜토리얼 · 데모는 {n}개월까지',
    'demo.cta': '본편 알아보기',
    'demo.gateTitle': '데모판입니다',
    'demo.gateBody': '데모는 인수인계 {n}개월까지 플레이할 수 있습니다. 본편에서는 분기·반기·한 해 중에 골라, 이어지는 달의 성수기·명절 폭주와 물가 상승까지 끝까지 운영합니다.',
    'demo.rowMonths': '본편 한 해',
    'demo.rowScenarios': '시나리오',
    'demo.rowCompanies': '회사',
    'demo.rowPerks': '퍽',
    'demo.keepProfile': '데모에서 딴 도전과제와 기록은 그대로 이어집니다. 기록 화면의 「프로필 내보내기」로 코드를 옮기면 됩니다.',
    'demo.soon': '출시 준비 중입니다.',
    'demo.resultTitle': '수습 종료',
    'demo.resultHead': '데모는 여기까지',
    'demo.resultBody': '{n}개월을 버텼습니다. 본편은 같은 창고에서 분기·반기·한 해를 끝까지 갑니다.',
    'demo.endReason': '데모 종료 — {n}개월차까지 운영했습니다',
    'stat.export': '프로필 내보내기',
    'stat.import': '프로필 가져오기',
    'stat.transferNote': '데모에서 본편으로, 또는 다른 기기로 해금·기록을 옮길 때 씁니다.',
    'stat.exportHelp': '아래 코드를 복사해 두세요. 본편의 「프로필 가져오기」에 붙여넣으면 해금과 기록이 합쳐집니다.',
    'stat.importHelp': '내보내기로 받은 코드를 붙여넣으세요. 지금 프로필에 합쳐지고, 이미 가진 것은 그대로 둡니다.',
    'stat.copy': '복사',
    'stat.copied': '복사했습니다',
    'stat.copyFail': '복사에 실패했습니다 — 직접 선택해 복사하세요',
    'stat.importBtn': '가져오기',
    'stat.importFail': '코드를 읽을 수 없습니다',
    'stat.importOk': '가져왔습니다 — {n}개 추가',
    'log.title': '진행 기록',
    'menu.title': '메뉴',
    'menu.autosave': '진행 상황은 영업일마다 자동 저장됩니다.',
    'menu.volume': '음악 볼륨',
    'menu.continue': '계속하기',
    'menu.abandon': '런 포기',
    'menu.abandonConfirm': '이 런을 포기하고 타이틀로 돌아갈까요? (기록에는 남지 않습니다)',
    'menu.abandonBtn': '포기',
    'opt.turnOn': '켜기',
    'opt.turnOff': '끄기',
    'btn.help': '도움말',
    'fmt.wins': '{n}승',
    'codex.tab.companies': '회사',
    'codex.tab.carriers': '업체',
    'codex.tab.perks': '퍽',
    'codex.tab.scenarios': '시나리오',
    'codex.tab.achievements': '도전과제',
    'codex.tab.stats': '통계',
    'codex.ach.company': '회사 해금',
    'codex.ach.scenario': '시나리오 해금',
    'codex.ach.slot': '퍽 슬롯',
    'codex.ach.multi': '첫 클리어',
    'codex.ach.perk': '퍽 해금',
    'codex.ach.none': '기록',
    'help.body': '<div class="help">\n      <p>택배가 영업일마다(월~토) 창고로 들어옵니다. 운송 업체를 호출해 처리하거나 <b>대기</b>해서 택배를 모아 두세요. 호출은 <b>차량 단위</b>입니다. 계약마다 차량(용량 N칸)이 있고, 부를 때마다 대당 <b>배차비</b>를 냅니다. 차를 80% 이상 채워 보내면 신뢰도가 더 오릅니다. 배차비는 <b>후불</b>이라 자금이 없어도 부를 수 있지만 월말 정산에서 한꺼번에 빠집니다. 정산 후 자금이 음수면 <b>단기 차입</b>으로 메우고 다음 달 이자 15%와 함께 갚습니다 — 부채가 400c를 넘으면 부도.</p>\n      <h3>평판</h3><p>오른쪽 위 게이지가 <b>평판</b>입니다. 이 동네가 자네를 어떻게 보는지 — 사고(반송·도난·파손·부패·창고 초과)가 나면 깎이고, <b>차를 꽉 채워 보내면</b>·<b>고객 신뢰가 오르면</b>·<b>사고 없이 정산을 넘기면</b> 오릅니다. <b>0이 되면 아무도 맡기지 않습니다 — 런이 끝납니다.</b> 평판이 낮으면 개인 고객 물량부터 줄고, 상한까지 채운 채로 정산을 넘기면 <b>등급</b>이 올라 상한도 같이 오릅니다(무명 20 → 동네 소문 35 → 구내 유명 50 → 시내 최고 70). 등급이 오르면 <b>물량과 운영비가 함께 오릅니다</b>(물량 ×1.15~1.6 · 임대 ×1.1~1.45) — 벌이가 커지는 만큼 판도 커집니다. <b>🛃 통관</b>은 동네 소문부터, <b>❆ 냉동</b>은 구내 유명부터 들어오기 시작합니다.</p>\n      <h3>런 준비</h3><p><b>시나리오</b>(길이·규칙) → <b>회사</b>(시작 창고·계약·고유 특성) → <b>퍽</b>(작은 규칙 변경) 순서로 고릅니다. 회사·퍽·시나리오는 <b>도전과제</b>로 해금되며, 도감에서 조건과 진행도를 볼 수 있습니다. 회사는 <b>1단계</b>(런 3회·첫 클리어·2회 클리어) → <b>2단계</b>(택배 종류별 누적 30개) → <b>3단계</b>(회사 3개로 클리어) 순으로 열립니다.</p>\n      <h3>하루의 순서</h3><p>입고 → 업체 호출 또는 대기 → 배송 → 신선도·기한 진행 → 창고 초과·지연 페널티</p>\n      <h3>택배 속성 — 창고에서 벌어지는 일</h3><p>계열마다 <b>받는 것이 정해져 있다.</b> 대량은 속성 없는 1~2칸만, 냉장은 ❄ 신선·🌾 농산물만, 대형은 4칸 이상만 받는다. 그래서 <b>지금 계약으로 못 보내는 택배</b>가 생길 수 있고, 그럴 땐 택배 줄에 <b style=\"color:var(--red)\">실을 차 없음</b>이 뜬다. 택배를 눌러 어떤 계열이 필요한지 보고 마켓에서 그 계약을 사면 된다.</p><table><tr><th>속성</th><th>규칙</th><th>보낼 수 있는 업체</th></tr>\n      <tr><td>❄ 신선</td><td>냉장 구역 밖이면 <b>다음 영업일에 폐기</b>. 기한 3일</td><td>냉장 · 항공 · 철도 · 해상</td></tr>\n      <tr><td>⚠ 파손</td><td>⚠ 능력 없는 업체로 보내면 <b>25% 파손</b>(폐기 +2)</td><td>안전: 파손 · 대형 · 철도 · 항공 · 해상 · 완충 특약</td></tr>\n      <tr><td>🛃 통관</td><td>입고 후 <b>2일 통관 대기</b>(20% 지연 +하루). 대기 중엔 자리만 차지, 기한은 그 뒤 시작</td><td>통관 · 항공 · 해상</td></tr>\n      <tr><td>❆ 냉동</td><td>냉동 구역 밖이면 <b>즉시 폐기</b>. 기한 8일. 4개월차부터. 냉동 구역보다 큰 택배는 오지 않음</td><td>냉동 물류·냉동 컨테이너 특약만</td></tr>\n      <tr><td>🌾 농산물</td><td>창고 안에 있어도 <b>폭염이면 기한 -2</b>(야외면 폐기). 남는 냉장 자리에 들어가거나 환기 시설이 있으면 무사. 기한 5일</td><td>대량 · 냉장 · 항공 · 철도 · 해상 (보너스는 냉장). 직접 배송 가능</td></tr>\n      <tr><td>대형(4~7칸)</td><td>크기 범위가 맞는 계열만 — <b>대량(1~2칸)은 못 싣는다</b></td><td>대형 · 철도 · 해상 · 통관</td></tr></table>\n      <h3>대기 · 직접 배송 · 차량</h3><p><b>대기</b>를 누르면 영업일 넘기기 화면이 열립니다. 여기서 택배를 골라 <b>직접 배송</b>할 수 있습니다 — 한 번에 1개(대형 트럭 +1, 도심 퀵·국영 +1), 속성 없는 택배·농산물, 크기 2까지. 보상은 그대로 받고 대신 <b>배송비</b>(15c + 크기×5c)를 냅니다. 마켓의 <b>차량</b>으로 넓힙니다: 냉동 탑차(❄❆), 완충 포장차(⚠ 안전), 대형 트럭(크기 4, +1개). 야외 적재가 있으면 같은 화면에서 적재 정리로 들어갑니다. 택배 행을 탭하면 어떤 계약·직접 배송으로 처리할 수 있는지 보입니다.</p>\n      <h3>준비 마켓</h3><p>런은 <b>준비 마켓</b>으로 시작합니다. 1개월차 첫 영업일 전에 시작 자금으로 계약·강화·시설·보험을 갖출 수 있고, 첫 이틀 입고 예정과 날씨가 보입니다. 새로고침 1회 무료. 한 달짜리 시나리오도 여기서 대비합니다.</p>\n      <h3>난이도</h3><p>시나리오 화면 위에서 <b>수습·정규·베테랑</b>을 고릅니다. 수습은 입고·가격·배상이 줄고 예정이 3일까지 보이지만 해금 도전과제가 인정되지 않습니다. 베테랑(첫 클리어 후)은 입고 +10%, 배상 ×1.5, 도난·파손 ×1.3, 시작 평판 16, 점수 ×1.4.</p>\n      <h3>날씨 · 적재 · 보관 · 보험</h3><p>영업일마다 날씨가 있고 이틀 앞까지 예보됩니다. <b>🌧 비</b>는 야외 일반·⚠ 택배를 적셔 보상 -20%, <b>🔥 폭염</b>은 냉장 밖 ❄❆ 즉시 폐기, <b>❄️ 폭설</b>은 야외가 냉장고가 되고(❄ 부패 없음, 도난 절반, ❄ 처리 +10), <b>🌀 태풍</b>은 도난 2배에 그날 입고가 다음 영업일로 몰립니다.</p><p>창고가 넘칠 때 <b>대기</b>를 누르면 <b>적재 정리</b>가 열립니다. 무엇을 야외에 둘지 직접 고르거나 프리셋(급한 것·고보상·고배상·고객 우선)을 씁니다. 차를 부른 날에는 열리지 않습니다 — 대기의 보상입니다.</p><p>이사센터 같은 고객이 <b>보관 계약</b>을 제안합니다. 수락하면 선불 보관료를 받고 그 부피가 기간 동안 창고를 차지합니다(호출·정리 대상 아님). 무사히 끝나면 신뢰 +2, 조기 반환은 남은 기간 환불 + 위약금 30c. 야외로 내보내 도난당하면 배상 ×2.</p><p><b>보험</b>은 런 시작 때 고르고 마켓에서 갈아탈 수 있습니다. 배상액의 일부를 보험이 대신 내고, 월 보험료는 정산에서 빠집니다. 청구 0건이면 다음 달 -20%(연속 2개월 -30% + 고객 신뢰 +1), 많으면 인상. 무보험이면 배상 ×2 고객(유리공방·이사센터)의 물량이 절반. 마켓의 1회성 보험(운송 보험증·야적 보험·통관 보증)도 있습니다.</p>\n      <h3>고객</h3><p>택배마다 보낸 <b>고객</b>이 있습니다(행 왼쪽 아이콘). 기한 내 처리 +1xp, 고객 특수 규칙 충족 +1xp, 폐기 -3xp. 신뢰 1~3단계에서 물량과 개당 보상이 오르고 2·3단계에 고객 혜택이 열립니다. 폐기(부패·반송·도난·파손)가 나면 고객이 <b>손해배상</b>(기본 보상 × 배상 배율)을 청구해 자금에서 바로 빠지고, xp가 0 밑으로 떨어지면 다음 달까지 거래가 끊깁니다. 하단 <b>고객</b> 버튼에서 확인하세요.</p>\n      <p>업체 카드의 <b>능력</b> 아이콘이 그 업체가 안전하게 다루는 속성입니다. 강화 슬롯의 <b>특약</b>으로 계약에 속성 하나를 붙일 수 있습니다(계약당 1개). ✈🚆🚢는 운송 수단 표시일 뿐 매칭과 무관하고, 철도·해상은 보상이 1~2일 뒤에 입금됩니다.</p>\n      <h3>세 가지 배송 수단</h3><p><b>직접 배송</b>: 대기할 때 택배 1개를 골라 배송비를 내고 처리(보상 그대로). <b>업체 호출</b>: 계약의 잔여 호출을 1회 쓰고 영업일 소모. 전문 업체는 보너스. <b>⚡긴급 특송</b>: 영업일을 쓰지 않고 즉시 1개 처리 — 대기 전략의 안전장치.</p>\n      <p>용달은 어떤 택배든 1개(보너스 없음, ⚠ 파손 위험). 기한을 넘기면 보상 -25%와 평판 −1, 3일 더 지나면 <b>반송</b>(스트레스 +2)됩니다. 창고를 넘긴 만큼 최근 입고분이 <b>야외 적재</b>되어 영업일마다, 그리고 일요일에 한 번 더 도난 판정(초과 1~2: 15%, 3~5: 30%, 6+: 50%)을 받습니다. 신선식품은 3일이 지나면 보상 50%, 그 다음 영업일에 폐기(+3). 상온(❄ 아님)의 신선식품은 2배 빨리 상합니다.</p>\n      <h3>창고</h3><p>용량 초과 1~2: 평판 −1, 3 이상: −2 — 진짜 위험은 야외 적재분의 도난입니다. 평판이 0이 되면 게임오버. 월말에는 <b>운영비</b>(임대 120c + 계약 슬롯당 10c + 시설 유지비)와 보험료가 정산됩니다.</p>\n      <h3>한 주 · 한 사이클</h3><p><b>하루가 한 번의 결정</b>입니다. 월요일부터 토요일까지 엿새 일하고 <b>일요일</b>은 쉽니다. <b>2주(영업일 12일)</b>마다 정산·마켓이 돌아옵니다 — 달마다 <b>전반·후반</b> 두 번입니다. 그래서 화면의 일차는 전반 1~12, 후반 13~24로 이어집니다. 일요일에는 차를 부를 수 없고 입고도 없으며 기한도 멈추지만(기한은 영업일 기준), <b>마당에 둔 물건은 도난 판정을 한 번 더</b> 받습니다. 일요일마다 <b>휴식</b>(평판 +1) · <b>야근</b>(다음 영업일 직접 배송 +2, 평판 −1) · <b>주말 알바</b>(돈을 내고 이번 일요일 도난 없음) 중 하나를 고릅니다.</p>\n      <h3>계약과 마켓</h3><p>계약마다 잔여 호출 횟수가 있고 월중에는 새 계약을 살 수 없습니다. 월말 마켓에서 계약 교체·강화·시설을 구매하세요. 계약을 교체하면 잔여 호출·신뢰도·강화가 사라집니다. 등급: 일반 &lt; 신뢰 &lt; 전문 &lt; 마스터.</p>\n      <h3>업체 신뢰도</h3><p>신뢰도는 <b>업체</b>에 쌓이고 계약을 바꿔도 유지됩니다. 호출 1회마다: 정상 처리 +1, 처리량 80% 이상 +1, 전문 업체로 특수 택배 +1. 호출 화면에서 이번 호출의 예상 xp를 보여줍니다.</p>\n      <table><tr><th>단계</th><th>필요 xp</th><th>효과</th></tr><tr><td>1</td><td>3</td><td>회당 처리량 +1</td></tr><tr><td>2</td><td>8</td><td>4번째 호출마다 +1개</td></tr><tr><td>3</td><td>15</td><td>전용 능력 (냉장: 기한 정지 / 대량·통관·대형·냉동·긴급: +1개 / 용달: 특수 보너스 / 프래자일: +15c / 항공: 크기 4 / 철도·해상: 입금 지연 -1)</td></tr></table>\n      <p>가장 빠른 길: 같은 업체를 <b>가득 채워서</b>(80%↑) 부르면 매번 +2~3xp라 5~6회 호출로 3단계에 닿습니다.</p></div>',
  },
  data:   {
    "ATTRS": {
      "cold": {
        "name": "냉장"
      },
      "fragile": {
        "name": "파손"
      },
      "customs": {
        "name": "통관"
      },
      "frozen": {
        "name": "냉동"
      },
      "produce": {
        "name": "농산물"
      }
    },
    "PARCEL_TYPES": {
      "normal": {
        "name": "일반",
        "short": "일반"
      },
      "fresh": {
        "name": "신선식품",
        "short": "신선"
      },
      "produce": {
        "name": "농산물",
        "short": "농산"
      },
      "fragile": {
        "name": "파손주의",
        "short": "파손"
      },
      "intl": {
        "name": "통관 화물",
        "short": "통관"
      },
      "large": {
        "name": "대형화물",
        "short": "대형"
      },
      "frozen": {
        "name": "냉동식품",
        "short": "냉동"
      }
    },
    "CARRIERS": {
      "bulk0": {
        "name": "한길 물류",
        "short": "한길",
        "vehicle": "탑차",
        "desc": "속성 없는 택배(크기 1~2)를 탑차에 실어 보낸다. 일반 특화의 축 · 표준 계약"
      },
      "bulk1": {
        "name": "빠른손 익스프레스",
        "short": "빠른손",
        "vehicle": "탑차",
        "desc": "속성 없는 택배(크기 1~2)를 탑차에 실어 보낸다. 일반 특화의 축 · 프리미엄 — 배차 +1·용량 +1·배차비 −10%"
      },
      "bulk2": {
        "name": "푸른길 로지스",
        "short": "푸른길",
        "vehicle": "완충 탑차",
        "desc": "속성 없는 택배(크기 1~2)를 탑차에 실어 보낸다. 일반 특화의 축 · 엘리트 — 배차 +2·용량 +2·배차비 −20% · ⚠ 파손 안전 추가"
      },
      "bulk3": {
        "name": "메가허브 물류",
        "short": "메가허브",
        "vehicle": "완충 탑차",
        "desc": "속성 없는 택배(크기 1~2)를 탑차에 실어 보낸다. 일반 특화의 축 · 마스터 — 배차 +3·용량 +3·배차비 −30% · ⚠ 파손 안전 추가 · 동시 2대"
      },
      "cold0": {
        "name": "새벽냉장",
        "short": "새벽",
        "vehicle": "냉장 탑차",
        "desc": "신선·농산물 전문. 신선·농산물 보너스 · 표준 계약"
      },
      "cold1": {
        "name": "아이스로드",
        "short": "아이스로드",
        "vehicle": "냉장 탑차",
        "desc": "신선·농산물 전문. 신선·농산물 보너스 · 프리미엄 — 배차 +1·용량 +1·배차비 −10%"
      },
      "cold2": {
        "name": "콜드체인 센터",
        "short": "콜드체인",
        "vehicle": "냉장·냉동 탑차",
        "desc": "신선·농산물 전문. 신선·농산물 보너스 · 엘리트 — 배차 +2·용량 +2·배차비 −20% · ❆ 냉동 가능 추가"
      },
      "cold3": {
        "name": "극지 물류",
        "short": "극지",
        "vehicle": "대형 냉장차",
        "desc": "신선·농산물 전문. 신선·농산물 보너스 · 마스터 — 배차 +3·용량 +3·배차비 −30% · ❆ 냉동 가능 추가 · 크기 7까지"
      },
      "frozen0": {
        "name": "빙하 냉동",
        "short": "빙하",
        "vehicle": "냉동 탑차",
        "desc": "냉동 전용. 냉동 보너스 · 표준 계약"
      },
      "frozen1": {
        "name": "설원 냉동물류",
        "short": "설원",
        "vehicle": "냉동 탑차",
        "desc": "냉동 전용. 냉동 보너스 · 프리미엄 — 배차 +1·용량 +1·배차비 −10%"
      },
      "frozen2": {
        "name": "영하 30",
        "short": "영하30",
        "vehicle": "냉동·냉장 탑차",
        "desc": "냉동 전용. 냉동 보너스 · 엘리트 — 배차 +2·용량 +2·배차비 −20% · ❄ 냉장 가능 추가"
      },
      "fragile0": {
        "name": "조심조심 운송",
        "short": "조심",
        "vehicle": "완충 밴",
        "desc": "파손주의 전문. 파손 없음, 파손 보너스 · 표준 계약"
      },
      "fragile1": {
        "name": "유리손 택배",
        "short": "유리손",
        "vehicle": "완충 밴",
        "desc": "파손주의 전문. 파손 없음, 파손 보너스 · 프리미엄 — 배차 +1·용량 +1·배차비 −10%"
      },
      "fragile2": {
        "name": "완충 마스터즈",
        "short": "완충",
        "vehicle": "대형 완충차",
        "desc": "파손주의 전문. 파손 없음, 파손 보너스 · 엘리트 — 배차 +2·용량 +2·배차비 −20% · 크기 7까지"
      },
      "fragile3": {
        "name": "백자 물류",
        "short": "백자",
        "vehicle": "냉장 완충차",
        "desc": "파손주의 전문. 파손 없음, 파손 보너스 · 마스터 — 배차 +3·용량 +3·배차비 −30% · ❄ 냉장 가능 추가 · 크기 7까지"
      },
      "intl0": {
        "name": "관세 브릿지",
        "short": "관세",
        "vehicle": "보세 트럭",
        "desc": "통관 대기 중인 화물을 즉시 통관·발송. 통관 보너스 · 표준 계약"
      },
      "intl1": {
        "name": "보세 익스프레스",
        "short": "보세",
        "vehicle": "보세 트럭",
        "desc": "통관 대기 중인 화물을 즉시 통관·발송. 통관 보너스 · 프리미엄 — 배차 +1·용량 +1·배차비 −10%"
      },
      "intl2": {
        "name": "월드게이트",
        "short": "월드게이트",
        "vehicle": "보세 완충 트럭",
        "desc": "통관 대기 중인 화물을 즉시 통관·발송. 통관 보너스 · 엘리트 — 배차 +2·용량 +2·배차비 −20% · ⚠ 파손 안전 추가"
      },
      "large0": {
        "name": "거인 화물",
        "short": "거인",
        "vehicle": "대형 트럭",
        "desc": "크기 4 이상 택배를 처리 (파손 안전). 대형 보너스 · 표준 계약"
      },
      "large1": {
        "name": "태산 중량물",
        "short": "태산",
        "vehicle": "대형 트럭",
        "desc": "크기 4 이상 택배를 처리 (파손 안전). 대형 보너스 · 프리미엄 — 배차 +1·용량 +1·배차비 −10%"
      },
      "large2": {
        "name": "코끼리 특수운송",
        "short": "코끼리",
        "vehicle": "냉장 대형 트럭",
        "desc": "크기 4 이상 택배를 처리 (파손 안전). 대형 보너스 · 엘리트 — 배차 +2·용량 +2·배차비 −20% · ❄ 냉장 가능 추가"
      },
      "air0": {
        "name": "하늘길 항공",
        "short": "하늘길",
        "vehicle": "항공 컨테이너",
        "desc": "소형(1~2)만. 통관 대기 중 처리·파손 안전. 비싸지만 빠름 · 표준 계약"
      },
      "air1": {
        "name": "제트 카고",
        "short": "제트",
        "vehicle": "항공 컨테이너",
        "desc": "소형(1~2)만. 통관 대기 중 처리·파손 안전. 비싸지만 빠름 · 프리미엄 — 배차 +1·용량 +1·배차비 −10% · 크기 4까지"
      },
      "rail0": {
        "name": "철마 화물",
        "short": "철마",
        "vehicle": "화물 열차",
        "desc": "파손 안전, 한 번에 많이. 보상은 다음 영업일 입금 · 표준 계약"
      },
      "rail1": {
        "name": "고속철 카고",
        "short": "고속철",
        "vehicle": "고속 화물열차",
        "desc": "파손 안전, 한 번에 많이. 보상은 다음 영업일 입금 · 프리미엄 — 배차 +1·용량 +1·배차비 −10% · 입금 즉시"
      },
      "sea0": {
        "name": "파도 해운",
        "short": "파도",
        "vehicle": "컨테이너",
        "desc": "통관 컨테이너, 크기 2 이상, 파손 안전. 보상은 이틀 뒤 입금 · 표준 계약"
      },
      "sea1": {
        "name": "대양 컨테이너",
        "short": "대양",
        "vehicle": "컨테이너",
        "desc": "통관 컨테이너, 크기 2 이상, 파손 안전. 보상은 나흘 뒤 입금 · 프리미엄 — 배차 +1·용량 +1·배차비 −10% · 입금 하루 지연"
      }
    },
    "FAMILIES": {
      "bulk": { "name": "대량" },
      "cold": { "name": "냉장" },
      "frozen": { "name": "냉동" },
      "fragile": { "name": "파손" },
      "intl": { "name": "통관" },
      "large": { "name": "대형" },
      "air": { "name": "항공" },
      "rail": { "name": "철도" },
      "sea": { "name": "해상" }
    },
    "TRUST_PERK_TEXT": {
      "bulk": [
        "동시 2대 호출",
        "배차비 -30%",
        "일반 택배 보상 +5"
      ],
      "cold": [
        "용량 +2칸",
        "호출한 날 신선·농산물 기한 정지",
        "냉장 구역 +2"
      ],
      "frozen": [
        "배차비 -20%",
        "용량 +2칸",
        "냉동 구역 +2"
      ],
      "fragile": [
        "배차비 -20%",
        "동시 2대 호출",
        "파손주의 보상 +15"
      ],
      "intl": [
        "통관 대기 -하루",
        "용량 +4칸",
        "통관 지연 이벤트 무효"
      ],
      "large": [
        "초대형 점유 -1",
        "동시 2대 호출",
        "대형 보상 +10"
      ],
      "air": [
        "크기 4까지",
        "배차비 -30%",
        "통관 대기 중 처리 시 +20"
      ],
      "rail": [
        "입금 지연 없음",
        "배차 한도 +1대",
        "용량 +6칸"
      ],
      "sea": [
        "입금 이틀 지연",
        "용량 +6칸",
        "입금 지연 없음"
      ]
    },
    "SELF_DELIVERY": {
      "name": "직접 배송"
    },
    "GRADES": {
      "normal": {
        "name": "표준"
      },
      "trusted": {
        "name": "프리미엄"
      },
      "expert": {
        "name": "엘리트"
      },
      "master": {
        "name": "마스터"
      }
    },
    "TRUST_EFFECTS": [
      "기본"
    ],
    "ENHANCEMENTS": {
      "limit1": {
        "name": "배차 한도 +1대",
        "desc": "계약의 월 배차 한도·남은 대수 +1 (계약당 2회)"
      },
      "limit2": {
        "name": "배차 한도 +2대",
        "desc": "계약의 월 배차 한도·남은 대수 +2 (계약당 2회)"
      },
      "cap1": {
        "name": "적재 보강",
        "desc": "차량 용량 +1칸 (계약당 3회)"
      },
      "regular": {
        "name": "월 첫 배차 무료",
        "desc": "매월 첫 호출의 차 한 대 배차비 무료"
      },
      "express": {
        "name": "동시 배차",
        "desc": "한 호출에 부를 수 있는 대수 +1"
      },
      "seal": {
        "name": "신뢰도 인장",
        "desc": "선택한 계약의 신뢰도 경험치 +3"
      },
      "record": {
        "name": "장기 거래 기록",
        "desc": "선택한 계약의 신뢰도 경험치 +6"
      },
      "optFragile": {
        "name": "완충 포장 특약",
        "desc": "이 계약이 ⚠ 파손을 안전하게 처리 (계약당 특약 1개)"
      },
      "optCold": {
        "name": "보냉 특약",
        "desc": "이 계약이 ❄ 신선을 처리(보너스 없음), 용량 -1칸"
      },
      "optCustoms": {
        "name": "통관 대행 특약",
        "desc": "이 계약이 🛃 통관 대기 중 화물을 처리, 월 배차 한도 -1대"
      },
      "optFrozen": {
        "name": "냉동 컨테이너 특약",
        "desc": "이 계약이 ❆ 냉동을 처리, 용량 -1칸 (크기 최대 4 이하 계약만)"
      }
    },
    "FACILITIES": {
      "expand1": {
        "name": "창고 확장 1단계",
        "desc": "전체 용량 +8"
      },
      "expand2": {
        "name": "창고 확장 2단계",
        "desc": "전체 용량 +10"
      },
      "expand3": {
        "name": "창고 확장 3단계",
        "desc": "전체 용량 +12"
      },
      "cold1": {
        "name": "냉장고 증설",
        "desc": "냉장 용량 +4"
      },
      "cold2": {
        "name": "냉장고 증설 2",
        "desc": "냉장 용량 +6"
      },
      "yard": {
        "name": "대형 적재장",
        "desc": "초대형 보관 +1"
      },
      "freezer1": {
        "name": "냉동고 증설",
        "desc": "냉동 용량 +4"
      },
      "vent": {
        "name": "환기 시설",
        "desc": "창고 안 🌾 농산물이 폭염에 상하지 않음"
      },
      "coldvan": {
        "name": "냉동 탑차",
        "desc": "직접 배송으로 ❄ 신선·❆ 냉동 처리"
      },
      "padvan": {
        "name": "완충 포장차",
        "desc": "직접 배송으로 ⚠ 파손을 안전하게 처리"
      },
      "bigvan": {
        "name": "대형 트럭",
        "desc": "직접 배송 +1개, 크기 4까지"
      },
      "driver": {
        "name": "배송 기사",
        "desc": "직접 배송 +1개"
      }
    },
    "STRESS_NAMES": {
      "stable": "안정",
      "caution": "주의",
      "danger": "위험",
      "crisis": "위기",
      "gameover": "게임오버"
    }
  },
  meta:   {
    "CUSTOMERS": {
      "anon": {
        "name": "개인 고객",
        "desc": "동네 개인 택배. 월별 기본 비율"
      },
      "dawn": {
        "name": "새벽마켓",
        "rule": {
          "text": "새벽배송: 입고한 날 바로 처리하면 +20"
        },
        "perks": {
          "2": {
            "text": "냉장 구역 +2 대여"
          },
          "3": {
            "text": "이 고객 신선 기한 +1"
          }
        }
      },
      "mart": {
        "name": "큰마트",
        "rule": {
          "text": "정기 배송: 한 호출에 큰마트 택배 3개 이상이면 +10%"
        },
        "perks": {
          "2": {
            "text": "대량 분류 탑차 +1칸"
          },
          "3": {
            "text": "이 고객 택배 보상 +5"
          }
        }
      },
      "glass": {
        "name": "유리공방",
        "rule": {
          "text": "취급 주의: 파손 없이 5개 연속 처리하면 +30"
        },
        "perks": {
          "2": {
            "text": "이 고객 택배 파손 확률 절반"
          },
          "3": {
            "text": "이 고객 파손 보너스 +10"
          }
        }
      },
      "import": {
        "name": "직구몰",
        "rule": {
          "text": "통관 예고: 이 고객 통관 대기 -이틀"
        },
        "perks": {
          "2": {
            "text": "통관 대행 마켓 등장 ×2"
          },
          "3": {
            "text": "이 고객 통관 보너스 +15"
          }
        }
      },
      "factory": {
        "name": "가구공장",
        "rule": {
          "text": "묶음 출고: 같은 날 입고분을 한 호출로 처리하면 +25"
        },
        "perks": {
          "2": {
            "text": "초대형 보관 +1"
          },
          "3": {
            "text": "이 고객 대형 점유 -1"
          }
        }
      },
      "ice": {
        "name": "아이스팩토리",
        "rule": {
          "text": "콜드체인: 냉동 택배 처리 시 +15"
        },
        "perks": {
          "2": {
            "text": "냉동고 증설 -50%"
          },
          "3": {
            "text": "이 고객 냉동 기한 +2"
          }
        }
      },
      "luxury": {
        "name": "명품관",
        "rule": {
          "text": "보안 운송: 통관 대기 중 야외에 두지 않으면 +20"
        },
        "perks": {
          "2": {
            "text": "항공 특송 마켓 등장 ×2"
          },
          "3": {
            "text": "이 고객 통관 대기 -1"
          }
        }
      },
      "farm": {
        "name": "농협 직송",
        "rule": {
          "text": "수확기: 입고 이틀 안에 처리하면 +15"
        },
        "perks": {
          "2": {
            "text": "환기 시설 -50%"
          },
          "3": {
            "text": "이 고객 농산물 기한 +1"
          }
        }
      },
      "mover": {
        "name": "이사센터",
        "desc": "보관 계약만 제안한다",
        "perks": {
          "2": {
            "text": "보관료 +20%"
          },
          "3": {
            "text": "이삿짐 점유 -2"
          }
        }
      }
    },
    "STORAGE_KINDS": {
      "move": {
        "name": "이삿짐"
      },
      "season": {
        "name": "계절 재고"
      },
      "event": {
        "name": "행사 물품"
      }
    },
    "INSURERS": {
      "none": {
        "name": "무보험",
        "desc": "보장 없음. 배상 배율 ×2 고객은 물량 절반"
      },
      "sturdy": {
        "name": "든든화재",
        "desc": "모든 폐기 배상 50%"
      },
      "coldguard": {
        "name": "콜드가드",
        "desc": "❄❆ 부패 배상 80%, 그 외 20%"
      },
      "safebox": {
        "name": "세이프박스",
        "desc": "⚠ 파손·도난 배상 80%, 그 외 20%"
      },
      "premier": {
        "name": "프리미어",
        "desc": "모든 배상 90% + 반송 평판 감점 면제"
      }
    },
    "INS_ITEMS": {
      "transitCert": {
        "name": "운송 보험증",
        "desc": "다음 호출 1회의 파손 확률 0"
      },
      "yardIns": {
        "name": "야적 보험",
        "desc": "다음 달 도난 배상 100%"
      },
      "customsBond": {
        "name": "통관 보증",
        "desc": "다음 달 통관 지연 무효"
      }
    },
    "WEATHER": {
      "sunny": {
        "name": "맑음",
        "desc": ""
      },
      "rain": {
        "name": "비",
        "desc": "야외 일반·⚠ 택배 젖음 (보상 -20%)"
      },
      "heat": {
        "name": "폭염",
        "desc": "냉장 밖 ❄❆ 즉시 폐기"
      },
      "snow": {
        "name": "폭설",
        "desc": "야외 ❄ 부패 없음·❆ 하루 유예, 도난 절반, ❄ 기한 정지, ❄ 처리 +10"
      },
      "storm": {
        "name": "태풍",
        "desc": "도난 2배, 젖음, 그날 입고 없음(다음 영업일에 몰림)"
      }
    },
    "DIFFICULTIES": {
      "rookie": {
        "name": "수습",
        "desc": "입고 ×0.85, 운영비 -30, 배차비 ×0.8, 가격 ×0.9, 도난·파손·배상 ×0.5, 예정 3일, 시작 평판 24. 점수 ×0.7. 해금 도전과제 인정 안 됨"
      },
      "normal": {
        "name": "정규",
        "desc": "기본 규칙 — 매 호출이 돈, 자금이 마르지 않게"
      },
      "veteran": {
        "name": "베테랑",
        "desc": "입고 ×1.15, 운영비 +60, 배차비 ×1.3, 도난·파손 ×1.3, 배상 ×1.5, 속성 2개 택배 +3%p, 시작 평판 16. 점수 ×1.4"
      }
    },
    "COMPANIES": {
      "local": {
        "name": "동네 택배",
        "tag": "균형형 · 기준선",
        "passive": "동네 단골: 매월 첫 호출의 차량 용량 +1칸",
        "weakness": "없음"
      },
      "fresh": {
        "name": "프레시 로지스틱스",
        "tag": "신선식품 특화",
        "passive": "콜드체인: 신선식품 기한 +하루. 냉장 물류 호출 시 신뢰도 +1 추가",
        "weakness": "냉장 편중: 파손·통관 보상 -10%. 대형 화물 업체 마켓 미등장"
      },
      "steel": {
        "name": "강철 창고",
        "tag": "대형화물 · 공간",
        "passive": "적재 전문: 크기 4 이상 택배의 점유량 -1. 대형 트럭 용량 +1칸",
        "weakness": "냉장 없음: 신선식품은 항상 상온(부패 2배). 냉장 용량 최대 4"
      },
      "quick": {
        "name": "도심 퀵",
        "tag": "좁은 창고 · 잦은 호출",
        "passive": "빠른 배차: 모든 계약의 월 배차 +1대. 직접 배송 +1개",
        "weakness": "협소: 창고 확장 효과 절반. 초대형은 항상 임시 공간 +3"
      },
      "global": {
        "name": "글로벌 익스프레스",
        "tag": "통관 화물 · 고보상",
        "passive": "관세 환급: 통관 화물 보상 +20. 통관 대행은 신뢰 3단계로 시작",
        "weakness": "환율 변동: 월말 운영비 100~160 무작위. 일반 보상 -5"
      },
      "glass": {
        "name": "유리방 물류",
        "tag": "파손주의 · 정밀",
        "passive": "완충 포장: 파손주의 처리 기한 +이틀, 보상 +15",
        "weakness": "조심조심: 탑차 용량 -1칸. 한 호출 5개 이상이면 그 호출 보상 -10%"
      },
      "thrifty": {
        "name": "짠돌이 운송",
        "tag": "절약형의 극단",
        "passive": "알뜰 계약: 모든 마켓 가격·배차비 -20%. 대기할 때마다 다음 호출 차량 용량 +1칸 (최대 +3)",
        "weakness": "인력 부족: 모든 계약 최대 호출 -1. 월말 운영비 +40"
      },
      "startup": {
        "name": "스타트업 딜리버리",
        "tag": "무작위 · 고위험",
        "passive": "피벗: 매월 마켓 새로고침 1회 무료. 마켓 계약 슬롯 3개. 신뢰 이상 등급 확률 +15%p",
        "weakness": "불안정: 월말마다 시작 계약 하나의 배차 -1대. 3개월차부터 운영비 +30"
      },
      "postal": {
        "name": "국영 우편",
        "tag": "안정형 · 장기전",
        "passive": "공공 서비스: 운영비 230·배차비 70c 고정. 직접 배송 +1개",
        "weakness": "느린 결재: 마켓 매월 2개까지. 전문·마스터는 5개월차부터. 특수 보너스 -5"
      }
    },
    "PERKS": {
      "longdeal": {
        "name": "장기 거래",
        "desc": "모든 계약 비용 -10%"
      },
      "prepay": {
        "name": "선불 할인",
        "desc": "매월 첫 계약 구매 -40"
      },
      "protect": {
        "name": "재계약 보호",
        "desc": "계약 교체 시 잔여 호출 1회 보존"
      },
      "regularco": {
        "name": "단골 업체",
        "desc": "모든 업체 신뢰도 3xp(1단계)로 시작"
      },
      "spare": {
        "name": "예비 기사",
        "desc": "매월 1회, 잔여 호출 0인 계약을 한 번 더 호출"
      },
      "bundle": {
        "name": "묶음 할인",
        "desc": "한 호출로 4개 이상 처리하면 호출 횟수 미소모 (월 1회)"
      },
      "compact": {
        "name": "공간 최적화",
        "desc": "모든 택배 크기 -1 (최소 1)"
      },
      "coldpro": {
        "name": "냉장 전문가",
        "desc": "신선식품 유통기한 +하루"
      },
      "tempyard": {
        "name": "임시 적재장",
        "desc": "창고 초과 1~2는 페널티 없음"
      },
      "shelves": {
        "name": "선반 증설",
        "desc": "시작 용량 +4"
      },
      "freezer": {
        "name": "냉동고",
        "desc": "냉장 구역의 신선식품은 첫 이틀 동안 부패 정지"
      },
      "yard": {
        "name": "야적장",
        "desc": "초대형 보관 +1, 초대형 임시 공간 3→2"
      },
      "skip": {
        "name": "스킵 보너스",
        "desc": "대기 후 다음 호출의 차량 용량 +1칸"
      },
      "insure": {
        "name": "폐기 보험",
        "desc": "런당 첫 폐기 택배의 페널티 무효"
      },
      "tent": {
        "name": "천막",
        "desc": "비·태풍에도 야외 택배가 젖지 않음"
      },
      "breath": {
        "name": "심호흡",
        "desc": "정산마다 평판 +1"
      },
      "overtime": {
        "name": "연장 근무",
        "desc": "기한 초과 택배의 보상 감소 25% → 10%"
      },
      "foresight": {
        "name": "예지",
        "desc": "입고 예정을 4일까지 표시"
      },
      "emergency": {
        "name": "배차 협상",
        "desc": "모든 배차비 -15%"
      },
      "regulars": {
        "name": "정기 고객",
        "desc": "일반 택배 보상 +5"
      },
      "premium": {
        "name": "프리미엄 서비스",
        "desc": "특수 운송 보너스 +5"
      },
      "closing": {
        "name": "월말 결산",
        "desc": "월말 창고 사용률 60% 이하면 +60"
      },
      "consult": {
        "name": "물류 컨설팅",
        "desc": "신뢰도 경험치 획득 +1"
      },
      "taxsave": {
        "name": "절세",
        "desc": "월말 운영비 -20"
      },
      "investor": {
        "name": "투자 유치",
        "desc": "시작 자금 +150, 월말 운영비 +20"
      }
    },
    "PERK_FAMILIES": {
      "contract": "계약",
      "warehouse": "창고",
      "ops": "운영",
      "income": "수익"
    },
    "DAILY_VARIANTS": {
      "fog": {
        "name": "안개",
        "desc": "입고 예정 표시 하루"
      },
      "express": {
        "name": "급행",
        "desc": "모든 기한 -하루, 보상 +10"
      },
      "bigweek": {
        "name": "대형 주간",
        "desc": "크기 4 이상 비율 2배"
      },
      "inflation": {
        "name": "물가 상승",
        "desc": "마켓 가격 ×1.3, 보상 +10%"
      },
      "trustboom": {
        "name": "신뢰 붐",
        "desc": "신뢰도 경험치 ×2"
      },
      "repair": {
        "name": "창고 정비",
        "desc": "시작 용량 -4, 창고 확장 -50%"
      },
      "picky": {
        "name": "깐깐한 고객",
        "desc": "기한 초과 시 보상 -50%"
      },
      "generous": {
        "name": "후한 고객",
        "desc": "회당 3개 이상 처리 시 보상 +15%"
      }
    },
    "SCENARIOS": {
      "quarter": {
        "name": "분기 (3개월)",
        "desc": "3월 이사철에 인수해 5월 가정의 달까지. 한 사이클은 2주고, 여섯 사이클이면 봄 한 철이 지나간다. 짧게 한 판 굴려 보는 길이",
        "win": "6사이클(3개월) 생존",
        "recommend": "동네 택배"
      },
      "halfyear": {
        "name": "반기 (6개월)",
        "desc": "3월부터 장마와 폭염을 건너 8월까지. 여름을 넘기려면 냉장이 필요하다",
        "win": "12사이클(6개월) 생존 (점수 ×1.25)",
        "recommend": "새벽 물류"
      },
      "standard": {
        "name": "한 해 (12개월)",
        "desc": "기본 런. 한국 달력을 따라 3월 이사철에 시작해 장마·폭염·추석·쇼핑 행사·연말을 지나 이듬해 2월 설까지. 고객 신뢰가 오르며 물량이 배로 늘고, 지출도 따라 큰다",
        "win": "12개월 생존 (점수 ×1.5)",
        "recommend": "동네 택배"
      },
      "peak": {
        "name": "성수기",
        "desc": "달력의 11~12월 컷(4개월차 물량으로 시작). 쇼핑 행사·연말 물량 위에 폭주 3회(기한 −이틀), 반송 유예 이틀. 보상 +10, 가격 ×1.3, 시작 배차 +2",
        "win": "11~12월 생존 + 50개 처리",
        "recommend": "도심 퀵 · 강철 창고"
      },
      "heatwave": {
        "name": "폭염",
        "desc": "달력의 7~8월 컷(5개월차 물량으로 시작). 신선 비율 ↑, 입고 +10%, 상온 부패 3배, 폭염 경보 월 3회",
        "win": "7~8월 생존 + 폐기 3개 이하",
        "recommend": "프레시 로지스틱스"
      },
      "strike": {
        "name": "파업",
        "desc": "매월 운송 업체 1종 호출 불가 (월초 공지). 운영비 +30",
        "win": "12개월 생존 (점수 ×1.5)",
        "recommend": "스타트업"
      },
      "port": {
        "name": "항만 계약",
        "desc": "통관 20%·대형 12%, 초대형 7%, 입고 -10%. 통관·대형 보상 +20, 일반 -5",
        "win": "12개월 생존 (점수 ×1.5)",
        "recommend": "글로벌 · 강철 창고"
      },
      "cashcrunch": {
        "name": "자금난",
        "desc": "시작 자금 -50%, 운영비 380, 새로고침 불가, 마켓 가격 +10%. 수익 +10%, 신뢰도 ×2",
        "win": "12개월 생존 + 최종 자금 2,500 이상",
        "recommend": "짠돌이 · 국영 우편"
      },
      "blackfriday": {
        "name": "블랙 프라이데이",
        "desc": "11월 한 달 지옥. 쇼핑 행사 위에 입고 ×1.4, 폭주 3회, 가격 ×1.4, 반송 유예 4일. 보상 +15, 시작 배차 +3",
        "win": "11월 생존 + 30개 처리",
        "recommend": "도심 퀵 · 짠돌이"
      },
      "audit": {
        "name": "감사",
        "desc": "모든 기한 -하루, 기한 초과 보상 -50%, 정산마다 평판 −1",
        "win": "12개월 생존 + 기한 초과 처리 12개 이하",
        "recommend": "국영 우편 · 유리방"
      },
      "moving": {
        "name": "이사철",
        "desc": "이사센터 포함, 보관 제안 닷새마다 보장, 보관료 ×1.5",
        "win": "12개월 생존 + 보관 계약 12건 완수",
        "recommend": "강철 창고"
      },
      "bigdeal": {
        "name": "대형 계약",
        "desc": "고객 1명(무작위)이 물량 60%. 배상 ×1.2",
        "win": "12개월 생존 + 그 고객 신뢰 3단계",
        "recommend": "도심 퀵"
      },
      "endless": {
        "name": "무한 운영",
        "desc": "게임오버까지. 7개월차부터 매월 입고 +1, 12개월차부터 운영비 +10/월",
        "win": "없음 — 점수 경쟁",
        "recommend": "—"
      },
      "daily": {
        "name": "데일리 배송",
        "desc": "달력의 무작위 한 달 컷(그날 지정) + 변형 규칙 2개. 회사도 그날 지정, 시작 배차 +2",
        "win": "그 달 생존 (하루 1회 기록)",
        "recommend": "그날 지정"
      }
    },
    "ACHIEVEMENTS": {
      "rookie": {
        "name": "신입 기사",
        "desc": "런 3회 플레이 (승패 무관)"
      },
      "two_clears": {
        "name": "두 번째 성공",
        "desc": "아무 시나리오나 2회 클리어"
      },
      "fresh30": {
        "name": "신선 서른",
        "desc": "신선식품 누적 30개 처리"
      },
      "fragile30": {
        "name": "파손주의 서른",
        "desc": "파손주의 누적 30개 처리"
      },
      "worldwide": {
        "name": "세계로",
        "desc": "통관 화물 누적 30개 처리"
      },
      "big20": {
        "name": "무거운 손",
        "desc": "크기 4 이상 택배 누적 20개를 기한 내 처리"
      },
      "three_companies": {
        "name": "세 회사의 사장",
        "desc": "서로 다른 회사 3개로 런 클리어"
      },
      "fresh_king": {
        "name": "신선 배송왕",
        "desc": "한 런에서 신선식품 15개를 부패 없이 처리"
      },
      "giant": {
        "name": "거인의 어깨",
        "desc": "한 런에서 초대형(7) 택배 5개를 기한 내 처리"
      },
      "nonstop": {
        "name": "무정차",
        "desc": "대기 없이 30회 연속 배송(직접 배송한 날 포함)"
      },
      "unbreakable": {
        "name": "깨지지 않는",
        "desc": "한 런에서 파손주의 12개를 기한 내 처리"
      },
      "patience": {
        "name": "기다림의 미학",
        "desc": "월평균 호출 4회 이하로 런 클리어"
      },
      "cust_l3": {
        "name": "단골",
        "desc": "한 런에서 고객 신뢰 3단계 달성"
      },
      "storage3": {
        "name": "창고 대여업",
        "desc": "보관 계약 누적 3건 완수"
      },
      "noclaim2": {
        "name": "무사고",
        "desc": "보험 청구 0건으로 2개월 연속"
      },
      "snowrun": {
        "name": "눈길 배송",
        "desc": "폭설인 날에 신선 택배 5개 처리"
      },
      "landlord": {
        "name": "집주인",
        "desc": "이사철 클리어"
      },
      "partner": {
        "name": "파트너",
        "desc": "대형 계약 클리어"
      },
      "veteran_clear": {
        "name": "베테랑",
        "desc": "베테랑 난이도로 클리어"
      },
      "first_clear": {
        "name": "첫 클리어",
        "desc": "아무 시나리오나 클리어"
      },
      "busy_month": {
        "name": "바쁜 달",
        "desc": "한 달에 15개 이상 처리"
      },
      "peak_clear": {
        "name": "성수기 정복",
        "desc": "성수기 클리어"
      },
      "fresh20": {
        "name": "신선 스무 개",
        "desc": "신선식품 누적 20개 처리"
      },
      "four_carriers": {
        "name": "네 업체",
        "desc": "계약 슬롯 4개를 서로 다른 업체로 채우고 클리어"
      },
      "intl15": {
        "name": "통관 열다섯",
        "desc": "통관 화물 누적 15개 처리"
      },
      "rich_clear": {
        "name": "부자 클리어",
        "desc": "자금 1,000 이상으로 한 해 클리어"
      },
      "half_clear": {
        "name": "반기 클리어",
        "desc": "반기(6개월) 클리어"
      },
      "three_unlocked": {
        "name": "세 회사",
        "desc": "회사 3개 해금"
      },
      "veteran": {
        "name": "베테랑",
        "desc": "회사 5개 해금"
      },
      "buyer": {
        "name": "단골 손님",
        "desc": "계약 누적 10개 구매"
      },
      "fresh_start": {
        "name": "과감한 교체",
        "desc": "잔여 호출 3회 이상인 계약을 교체하고 클리어"
      },
      "trust3": {
        "name": "신뢰의 정점",
        "desc": "한 업체를 신뢰 3단계까지 올림"
      },
      "empty_tank": {
        "name": "빈 탱크",
        "desc": "잔여 호출 0인 계약 4개로 월말을 맞고 생존"
      },
      "big_haul": {
        "name": "한 방",
        "desc": "한 호출로 6개 이상 처리"
      },
      "no_spoil": {
        "name": "무부패",
        "desc": "신선식품 부패 0회로 클리어"
      },
      "overflow_survivor": {
        "name": "넘쳐도 산다",
        "desc": "창고 초과 상태로 닷새 이상 버티고 클리어"
      },
      "expander": {
        "name": "확장주의자",
        "desc": "한 런에 창고 확장 2개 구매"
      },
      "cold_buyer": {
        "name": "냉장 투자",
        "desc": "냉장고 증설 2회 구매한 런 클리어"
      },
      "xl_stack": {
        "name": "초대형 삼총사",
        "desc": "초대형 3개를 동시에 보관"
      },
      "survivor": {
        "name": "벼랑 끝",
        "desc": "평판 5 이하에서 클리어"
      },
      "late_but_done": {
        "name": "늦어도 배송",
        "desc": "기한 초과 택배 10개를 처리하고 클리어"
      },
      "waiter": {
        "name": "기다리는 자",
        "desc": "대기 누적 40회"
      },
      "clutch": {
        "name": "만차",
        "desc": "적재 효율 80% 이상으로 15회 호출"
      },
      "normal100": {
        "name": "일반 백 개",
        "desc": "일반 택배 누적 100개"
      },
      "all_special": {
        "name": "만능 물류",
        "desc": "특수 택배 4종을 한 런에서 모두 전문 업체로 처리"
      },
      "tidy": {
        "name": "깔끔한 마감",
        "desc": "월말 사용률 40% 이하로 월 마감 3회 (누적)"
      },
      "trusted_three": {
        "name": "신뢰 삼각",
        "desc": "신뢰 2단계 업체 3개"
      },
      "rich": {
        "name": "여유 자금",
        "desc": "자금 1,500 이상으로 클리어"
      },
      "broke": {
        "name": "간당간당",
        "desc": "자금 100 이하로 월말을 넘기고 클리어"
      },
      "perfect_month": {
        "name": "완벽한 달",
        "desc": "페널티 0으로 한 달 마감"
      },
      "full_house": {
        "name": "만석",
        "desc": "창고 사용률 100% 이상에서 페널티 없이 다음 영업일로"
      },
      "big_hand": {
        "name": "큰 손",
        "desc": "한 호출로 8개 처리"
      },
      "master_deal": {
        "name": "마스터 계약",
        "desc": "마스터 등급 계약 보유"
      },
      "trust_badge": {
        "name": "신뢰의 증표",
        "desc": "신뢰 3단계 업체 2개"
      },
      "millionaire": {
        "name": "백만장자",
        "desc": "자금 2,000"
      },
      "all_companies": {
        "name": "전 회사 클리어",
        "desc": "9개 회사 모두 표준 클리어"
      },
      "all_scenarios": {
        "name": "전 시나리오 클리어",
        "desc": "무한 운영 제외 10개 클리어"
      },
      "daily7": {
        "name": "데일리 7일",
        "desc": "데일리 7일 연속 클리어"
      }
    }
  },
  };
  if (typeof module !== 'undefined') module.exports = L; else (root.LOCALES = root.LOCALES || {}).ko = L;
})(typeof window !== 'undefined' ? window : globalThis);
