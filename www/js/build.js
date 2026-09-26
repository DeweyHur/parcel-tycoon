// 빌드 설정: 데모 여부 · 스토어 링크. 배포마다 이 파일만 바꾼다.
//   demo: false → 본편(전체 콘텐츠)   — Steam·STOVE 빌드, 개발 서버
//   demo: true  → 무료판: 봄(인수인계)·여름까지 (META.FREE_RUNS). 가을부터는 본편 — itch.io·웹, 모바일(구매 전)
//                 여름을 넘기면 결과 화면이 본편 안내(store 링크)로 보낸다
// tools/build-web.py --demo 는 인라인할 때 이 파일의 demo 값을 true 로 바꿔 넣는다.
window.BUILD = {
  demo: false,
  iap: null,              // null | 'play' | 'ios' — 앱 내 언락 결제 경로
  store: { itch: '', play: '', steam: '' },  // 비어 있으면 "출시 예정"으로 표시
  api: 'https://parcel-tycoon.vercel.app/api',   // 순위 서버 (api/scores.js). 비우면 순위 기능을 숨긴다
};
if (typeof module !== 'undefined') module.exports = window.BUILD;
