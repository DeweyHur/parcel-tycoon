# 스토어 문구 (itch.io 데모 기준)

데모 빌드: `python3 tools/build-web.py --demo` → `dist/parcel-tycoon.demo.html`
itch.io 업로드는 **HTML 단일 파일**을 zip으로 올리고 "This file will be played in the browser" 체크,
뷰포트 480×800, 모바일 지원 켜기.

---

## 한 줄 설명 (한국어)

물려받은 창고에서 한 해를 버티는 턴제 물류 경영 게임.

## 한 줄 설명 (English)

A turn-based logistics management game: inherit a warehouse, survive a year.

---

## 긴 설명 (한국어)

**전임 창고장이 떠난다. 다음 달부터는 당신 이름으로 돌아간다.**

매 턴 택배가 들어옵니다. 창고에는 자리가 있고, 기한이 있고, 냉장 구역은 좁습니다.
계약한 운송센터에 배차를 부르면 차 한 대에 몇 칸이 실리는지, 배차비가 얼마인지, 그게 남는 장사인지
매번 계산하게 됩니다. 배차비는 후불이라 월중에는 돈 때문에 막히는 일이 없습니다 — 대신 월말 정산에서
전부 돌아옵니다.

- **차량 단위 배차** — 부피를 채워 보내면 이득, 반 차로 보내면 배차비만 나갑니다
- **27개 운송센터** — 냉장·파손·통관·대형·냉동·항공·철도·해상. 센터마다 담당자와 성격이 다르고,
  같이 일할수록 신뢰가 쌓여 용량과 조건이 달라집니다
- **한국 달력 위에서 흘러가는 한 해** — 추석·설 폭주와 연휴 휴무, 5월 선물 주간, 11월 행사,
  장마와 폭염, 그리고 매달 조금씩 오르는 물가
- **고객** — 새벽 배송, 마트, 유리 공방, 수입상, 농장. 신뢰가 오르면 물량이 배로 늘고
  취급 품목이 열립니다. 늘어난 물량을 감당할 창고가 없으면 그게 곧 위기입니다
- **실력으로 여는 해금** — 회사 9개, 시나리오 12개, 퍽 25개. 전부 도전과제로만 열립니다

한국어·English 지원. 세로 화면, 한 손으로.

**이 데모는 인수인계 3개월까지 플레이할 수 있습니다.** 데모에서 딴 도전과제와 기록은 본편으로 이어집니다.

## 긴 설명 (English)

**The old warehouse manager is leaving. From next month it runs under your name.**

Parcels arrive every turn. The warehouse has shelves, the parcels have deadlines, and the cold zone
is smaller than you'd like. Call a truck from one of your contracted centers and you're doing the same
math every time: how many slots fit on this truck, what the dispatch costs, whether the run pays for
itself. Dispatch fees are billed later, so nothing blocks you mid-month — it all comes back at closing.

- **Dispatch by the truck** — a full truck pays; a half-empty one just burns the fee
- **27 delivery centers** — cold, fragile, customs, oversize, frozen, air, rail, sea. Each has its own
  rep and temperament, and working with them builds trust that changes capacity and terms
- **A year on a real calendar** — holiday rushes and shutdowns, gift weeks, sale events, monsoon and
  heatwaves, and prices creeping up every month
- **Clients** — dawn delivery, a mart, a glass studio, an importer, a farm. Trust doubles their volume
  and unlocks what they ship. No room for the extra volume is exactly how a run ends
- **Unlocks you earn** — 9 companies, 12 scenarios, 25 perks, all behind achievements

Korean and English. Portrait, one-handed.

**This demo covers the first 3 months.** Achievements and records carry into the full game.

---

## 태그 (itch.io)

`management` `turn-based` `strategy` `roguelite` `pixel-art` `logistics` `tycoon` `mobile` `korean` `singleplayer`

- 장르: Simulation / Strategy
- 평균 플레이 시간: 30분 ~ 1시간 (데모 기준)
- 입력: 터치 · 마우스
- 가격: 무료 (데모)

---

## 스크린샷 촬영 목록 (4~6장, 390×800)

1. 창고 3D 화면 — 택배가 여러 종류 쌓여 있고 냉장 구역이 차 있는 상태, 기한 임박 빨간 점이 보이게
2. 호출 모달 — 차량 게이지가 거의 꽉 찬 상태, `+수입 − 배차비 = 순익` 줄이 보이게
3. 월말 정산 — 운영비 내역과 인건비, 후불 배차비가 보이는 화면
4. 마켓 — 현재 계약 위에 상시 카드, 다음 달 예상 물량 줄
5. 스토리 대화 — 창고장 스프라이트와 대사창
6. 달력 — 추석 폭주·휴무가 표시된 달

트레일러를 만든다면 BGM은 게임 음원 대신 별도 확보를 권함 (`docs/LICENSE-MUSIC.md` 참고).

---

## 업로드 전 확인

- [ ] `dist/parcel-tycoon.demo.html` 의 `window.BUILD.demo === true`
- [ ] `window.BUILD.store` 에 본편 링크 채우기 (비어 있으면 "출시 준비 중"으로 표시)
- [ ] 개인정보처리방침 URL (수집 없음이어도 문서는 필요 — Play 제출 시 필수)
- [ ] 아이콘 512×512, 커버 이미지 630×500 (itch.io)
