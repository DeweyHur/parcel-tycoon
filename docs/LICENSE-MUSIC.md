# BGM 라이선스 근거

이 파일은 심사 제출용이 아니다. **클레임이 들어온 날 24시간 안에 내밀 것**을 한곳에 모아 둔 것이다.
실제로 필요해지는 지점은 세 곳: 트레일러의 YouTube Content ID 클레임, Steam DMCA 신고, 퍼블리셔·투자 실사.

## 요약

- 곡: 칩튠 BGM 6곡 (`title` / `warehouse` / `overflow` / `market` / `fanfare` / `gameover`)
- 생성 도구: Suno
- 권리 근거: **유료 구독(Pro 또는 Premier) 상태에서 받은 다운로드**. Suno 약관(2026-09-03 발효)은
  상업권을 생성 시점이 아니라 *허용된 다운로드*에 붙인다 — "You may commercially exploit Output ...
  provided you have obtained a permitted download of that Output." 무료 티어 다운로드는 개인·비상업용.
- 해지 후에도 유지: "perpetual and are not affected by ... the expiry, cancellation, downgrade or
  suspension of your subscription."
- 파일 지문: `docs/MUSIC_MANIFEST.md` (`python3 tools/music-manifest.py` 로 갱신)
- 코드와 음원의 라이선스는 다르다. 음원은 All rights reserved이며 레포 라이선스에 포함되지 않는다.

## 곡별 기록 — **채울 것**

| 파일 | 곡 제목 | Suno 곡 URL | 생성일 | **다운로드일** | 당시 플랜 | 인보이스 |
|---|---|---|---|---|---|---|
| `title.mp3` | Parcel Tycoon - Main Theme | | | | | |
| `warehouse.mp3` | Parcel Tycoon - Warehouse | | | | | |
| `overflow.mp3` | Parcel Tycoon - Overflow | | | | | |
| `market.mp3` | Parcel Tycoon - Market | | | | | |
| `fanfare.mp3` | Parcel Tycoon - Fanfare | | | | | |
| `gameover.mp3` | Parcel Tycoon - Game Over | | | | | |

다운로드일이 가장 중요한 칸이다. 생성일이 아니라 **다운로드일에 유료 구독 중이었는지**가 권리를 가른다.

## 보관할 증빙 (`docs/licenses/` 아래, git에는 올리지 않는다)

- [ ] `suno-invoice-*.pdf` — 결제 내역. 플랜명(Pro/Premier)과 결제 기간이 보이는 것
- [ ] `suno-terms-<다운로드 시점>.pdf` — **그 시점의 약관 스냅샷**. 약관은 2026-09-03에 개정됐으므로
      지금 페이지를 저장해도 그때 조건은 증명되지 않는다. `web.archive.org` 스냅샷을 PDF로 받을 것
- [ ] `suno-library-*.png` — 곡 목록에서 제목·생성일이 보이는 화면
- [ ] 위 표를 채운 이 파일

## 가장 확실한 처리 — 재다운로드

과거 다운로드 기록을 복원하는 것보다, **Pro 한 달을 다시 결제해 6곡을 새로 받고 파일을 교체**하는 쪽이
빠르고 깨끗하다. 오늘 날짜 인보이스 한 장이 "다운로드 시점에 유료"를 그대로 증명한다.
Pro 다운로드 한도는 월 20회(2026-09-03부터)라 6곡은 여유가 있다.

교체하면:

1. 새 파일을 `audio-src/`에 덮어쓴다
2. `python3 tools/make_loops.py` 로 `www/audio/` 재생성
3. `python3 tools/music-manifest.py` 로 지문 갱신
4. 위 표의 다운로드일·인보이스 칸을 채운다

## 남은 리스크

Warner는 2025년 10월 Suno와 합의했지만 UMG·Sony는 소송을 계속하고 있다(디스커버리 단계).
쟁점은 Suno의 학습 데이터이고 이용자 산출물의 책임을 직접 다루지는 않지만, 최종 틀은 확정되지 않았다.
칩튠 6곡 규모에서 실무 리스크는 낮다. 다만 **BGM 에셋 경로를 고정해 두어 파일 교체만으로 갈아탈 수 있게** 한다
(`www/audio/<key>.mp3` · `bgm.js` 의 키 목록만 보면 된다).
