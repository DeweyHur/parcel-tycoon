// 빌드 설정: 데모 여부 · 스토어 링크. 배포마다 이 파일만 바꾼다.
//   demo: false → 본편(전체 콘텐츠)         — Steam·STOVE 빌드, 개발 서버
//   demo: true  → 데모(인수인계 demoMonths개월까지) — itch.io·웹, 모바일(구매 전)
// tools/build-web.py --demo 는 인라인할 때 이 파일의 demo 값을 true 로 바꿔 넣는다.
window.BUILD = {
  demo: false,
  demoMonths: 3,          // 데모에서 플레이 가능한 개월 수(인수인계 기준)
  iap: null,              // null | 'play' | 'ios' — 앱 내 언락 결제 경로
  store: { itch: '', play: '', steam: '' },  // 비어 있으면 "출시 예정"으로 표시
};
if (typeof module !== 'undefined') module.exports = window.BUILD;
