# BGM 라이선스 근거

이 파일은 심사 제출용이 아니다. **클레임이 들어온 날 24시간 안에 내밀 것**을 한곳에 모아 둔 것이다.
실제로 필요해지는 지점은 세 곳: 트레일러의 YouTube Content ID 클레임, Steam DMCA 신고, 퍼블리셔·투자 실사.

## 요약

- 곡: 칩튠 BGM 6곡 (`title` / `warehouse` / `overflow` / `market` / `fanfare` / `gameover`)
- 생성 도구: Suno (`chirp-fenix-t4`), 2026-09-04 생성
- 원본 재다운로드: 2026-09-13, **Pro 구독 기간(2026-08-19~09-19) 중**, 무손실 WAV (`audio-src/*.wav`)
- 권리 근거: Suno 약관(2026-09-03 발효)은 상업권을 생성 시점이 아니라 *허용된 다운로드*에 붙인다 —
  "You may commercially exploit Output ... provided you have obtained a permitted download of that Output."
  무료 티어 다운로드는 개인·비상업용.
- 해지 후에도 유지: "perpetual and are not affected by ... the expiry, cancellation, downgrade or
  suspension of your subscription."
- 코드와 음원의 라이선스는 다르다. 음원은 All rights reserved이며 레포 라이선스에 포함되지 않는다.

## 1. 가장 단단한 증빙 — 파일에 박힌 C2PA 콘텐츠 자격증명

재다운로드한 WAV 6개에는 **Suno가 서명한 C2PA 매니페스트**가 `C2PA` RIFF 청크로 들어 있다.
스크린샷과 달리 이건 위조할 수 없고, 제3자가 파일만 받아도 검증할 수 있다.

- 서명: `Suno Content Credentials` ← `Suno C2PA Root CA` (O=Suno Inc, ECDSA P-256)
- **타임스탬프: DigiCert 트러스티드 G4 RFC 3161 타임스탬프** — 서명 시각을 제3자가 보증한다
- 매니페스트 내용: 곡 id(`contentId`), **생성 시각**, 생성 시스템(`Suno chirp-fenix-t4`),
  선언(`c2pa.created` / `trainedAlgorithmicMedia`), 그리고 오디오 데이터에 묶인 해시
- 해시가 데이터에 묶여 있으므로 파일을 한 바이트라도 고치면 검증이 깨진다

읽는 법: `python3 tools/c2pa-dump.py` (외부 패키지 불필요) · 표로 뽑기: `--md`

| 파일 | 곡 id (contentId) | 생성(UTC) | 다운로드(UTC) | 서명 | sha256 |
|---|---|---|---|---|---|
| `fanfare.wav` | `64d4d1c5-94c2-4645-a9eb-58b4844355e0` | 2026-09-04T08:10:57Z | 2026-09-13T01:04:17Z | Suno Inc ← Suno C2PA Root CA ← Suno Content Credentials | `ae1d6c68b1b59903…` |
| `gameover.wav` | `c398e4c3-a81f-460a-a3a0-b8c384060ba7` | 2026-09-04T08:17:35Z | 2026-09-13T01:03:42Z | Suno Inc ← Suno C2PA Root CA ← Suno Content Credentials | `095059aa6e8eedae…` |
| `market.wav` | `2bec53bd-ee1f-43cb-a05e-fa7904610b45` | 2026-09-04T08:19:23Z | 2026-09-13T01:03:28Z | Suno Inc ← Suno C2PA Root CA ← Suno Content Credentials | `9d8694702e950179…` |
| `overflow.wav` | `7754f68f-f2bd-4612-947c-d6c651c0692d` | 2026-09-04T08:04:14Z | 2026-09-13T01:04:33Z | Suno Inc ← Suno C2PA Root CA ← Suno Content Credentials | `98a20ba0512dc50f…` |
| `title.wav` | `68a7d82e-2525-40d0-bba4-8fd648aa5794` | 2026-09-04T07:59:48Z | 2026-09-13T01:05:01Z | Suno Inc ← Suno C2PA Root CA ← Suno Content Credentials | `0ef0baf74a744fb2…` |
| `warehouse.wav` | `30adc9f6-e1e2-4108-9dd8-18498b90802d` | 2026-09-04T08:02:38Z | 2026-09-13T01:04:47Z | Suno Inc ← Suno C2PA Root CA ← Suno Content Credentials | `489d3fda9ecc3b91…` |

`created` 는 Suno에서 곡이 만들어진 시각, `downloaded` 는 이 WAV가 렌더돼 내려온 시각이다.
후자가 **Pro 구독 기간 안에 있다는 것**이 상업권의 근거다.

주의: 매니페스트는 곡이 Suno에서 언제 만들어졌는지는 증명하지만 **어느 계정인지는 담지 않는다.**
계정·플랜은 아래 2번(결제 기록)이 채운다. 둘을 같이 보관해야 사슬이 닫힌다.

**그리고 `www/audio/*.mp3` 에는 이 자격증명이 남지 않는다.** 루프 가공·재인코딩에서 청크가 떨어진다.
증빙으로 보관할 것은 `audio-src/*.wav` 원본이다(용량 때문에 git 에는 넣지 않는다 — `.gitignore` 참고).
**레포 밖에도 백업본을 하나 두자.** 지문은 `docs/MUSIC_MANIFEST.md` 에 커밋돼 있어 나중에 대조할 수 있다.

## 2. 결제 기록 — 구독도 인보이스가 발행된다

"구독이라 인보이스가 없다"는 건 메일을 못 받았다는 뜻일 뿐이다. Suno는 Stripe로 청구하므로
**구독 결제마다 Stripe 인보이스가 발행되고, 고객 포털에서 PDF로 받을 수 있다.**

1. suno.com/account → **Update Payment** (Stripe 청구 포털로 이동)
2. 포털의 **Invoice history** 에서 각 결제의 인보이스/영수증 PDF 다운로드
3. 구독을 해지한 뒤에도 접근 가능 — Suno 고객센터의 청구 정보 링크에 계정 이메일을 넣으면
   로그인 링크가 메일로 온다 (30분 유효)

그 밖에 제3자가 발행한 기록:

- **카드사·은행 명세서** — 가맹점명·금액·날짜. 제3자 기록이라 증거력이 있다
- **Stripe 영수증 메일** — 받은편지함에서 `Suno` 또는 `receipt` 검색

## 3. 확인된 사슬

세 조각이 맞물려 닫힌다.

| 무엇 | 언제 | 근거 |
|---|---|---|
| Suno Pro 구독 기간 | **2026-08-19 ~ 09-19** | Stripe 인보이스 `H3MR40FW-0002` · 영수증 `2016-0713-4661` ($10.00, Visa -1256, 계정 `digitzetre@gmail.com`) |
| 곡 생성 | 2026-09-04 | 각 WAV의 C2PA 매니페스트 `createdAt` |
| WAV 다운로드 | 2026-09-13 | 각 WAV의 `created=` 주석 + C2PA 서명의 DigiCert 타임스탬프 |

생성일과 다운로드일이 **모두 구독 기간 안**이다. 약관을 "생성 시점" 기준으로 읽든 "다운로드 시점"
기준으로 읽든 결과가 같다 — 해석 다툼의 여지가 없다.

### 보관 목록 (`docs/licenses/`, git 제외)

- [x] `suno-receipt-2026-08-20.pdf` — 지불 완료 영수증. **분쟁 시 먼저 내미는 건 이쪽**(인보이스는 청구서)
- [x] `suno-invoice-2026-08-20.pdf` — 인보이스. 구독 기간(Aug 19–Sep 19)이 찍혀 있다
- [ ] `suno-terms-2026-09-13.pdf` — 약관. 현행 약관의 발효일(2026-09-03)이 다운로드일(09-13)보다
      앞서므로 **지금 suno.com/terms-of-service 를 브라우저에서 PDF로 인쇄하면 그게 적용 버전**이다.
      과거 스냅샷을 찾을 필요가 없다
- [ ] `audio-src/*.wav` 백업 — 자격증명이 살아 있는 원본 (레포 밖에도 한 벌)
- [x] 이 파일과 `docs/MUSIC_MANIFEST.md` (git 에 커밋돼 있음)

두 PDF에는 집 주소와 카드 끝 4자리가 들어 있어 git 에 올리지 않는다(`docs/licenses/.gitignore`).
곡 페이지 URL이 필요하면 위 표의 `contentId` 로 라이브러리에서 찾을 수 있다.

## 4. 남은 리스크

Warner는 2025년 10월 Suno와 합의했지만 UMG·Sony는 소송을 계속하고 있다(디스커버리 단계).
쟁점은 Suno의 학습 데이터이고 이용자 산출물의 책임을 직접 다루지는 않지만, 최종 틀은 확정되지 않았다.
칩튠 6곡 규모에서 실무 리스크는 낮다. 다만 BGM 에셋 경로를 고정해 두어 파일 교체만으로 갈아탈 수 있게 한다
(`www/audio/<key>.mp3` · `bgm.js` 의 키 목록).

## 부록. 원본을 다시 받아 교체하는 절차

1. 데스크톱 브라우저에서 suno.com 라이브러리 → 곡 ⋯ → Download → **WAV**
   (모바일 앱은 WAV를 골라도 경고 없이 MP3가 내려온다)
2. `audio-src/<key>.wav` 로 저장 (`title` / `warehouse` / `overflow` / `market` / `gameover` / `fanfare`)
3. `python3 tools/make_loops.py` — `www/audio/*.mp3` 재생성 (wav 가 있으면 우선 사용)
4. `python3 tools/music-manifest.py` — 지문 갱신
5. `python3 tools/c2pa-dump.py --md` — 위 표 갱신

같은 곡의 MP3·WAV는 합쳐서 1회로 차감되고 스템 12트랙도 1회지만, 남은 다운로드는 이월되지 않는다
(Pro 20회/월, 2026-09-03부터).
