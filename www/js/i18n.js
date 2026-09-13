// i18n: 문자열 테이블 + 데이터 텍스트 오버레이 (브라우저/Node 공용)
// - locales/<lang>.js 가 { ui: {key: '...'}, data: {...}, meta: {...} } 를 등록한다.
// - ui: t(key, params) 로 읽는 UI·로그 문자열. 자리표시자 {name}, 복수형 {n:one|other}
// - data/meta: DATA·META 객체의 텍스트 필드(name/desc/...)를 같은 모양으로 덮어쓴다 → 기존 D.CARRIERS[x].name 접근이 그대로 동작
// - 로그 메시지 객체 {k, p} 는 text() 로 표시 시점에 렌더링한다 (언어를 바꿔도 과거 로그가 따라온다)
(function (root) {
  const isNode = typeof module !== 'undefined';
  const LOCALES = isNode ? { ko: require('../locales/ko.js'), en: require('../locales/en.js') } : (root.LOCALES || {});
  const FALLBACK = 'ko';
  const KEY = 'pt_lang';
  let lang = FALLBACK, D = null, M = null;
  const listeners = [];
  const warned = new Set();

  function detect() {
    try { const v = localStorage.getItem(KEY); if (v && LOCALES[JSON.parse(v)]) return JSON.parse(v); } catch (e) { }
    if (!isNode) try { const nav = ((typeof navigator !== 'undefined' && navigator.language) || '').toLowerCase(); if (nav && !nav.startsWith('ko') && LOCALES.en) return 'en'; } catch (e) { }
    return FALLBACK;
  }

  // 텍스트 필드만 덮어쓰기: 문자열·문자열 배열은 대입, 객체는 재귀 (대상에 없는 키는 새로 만든다)
  function overlay(target, src) {
    if (!target || !src) return;
    for (const k in src) {
      const v = src[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) { if (!target[k] || typeof target[k] !== 'object') target[k] = {}; overlay(target[k], v); }
      else target[k] = v;
    }
  }

  // 기본 언어를 먼저 깔고 현재 언어를 덮어써서, 번역이 빠진 필드는 기본 언어로 남게 한다
  function apply() {
    for (const L of lang === FALLBACK ? [LOCALES[FALLBACK]] : [LOCALES[FALLBACK], LOCALES[lang]]) {
      if (!L) continue;
      if (D && L.data) overlay(D, L.data);
      if (M && L.meta) overlay(M, L.meta);
    }
  }

  // 조사 자동 선택: 문자열 안에 '{name}은/는' 처럼 써 두면 값의 받침에 맞춰 고른다.
  // 계약·업체 이름이 데이터/번역에 따라 바뀌므로 '{name}은' 처럼 박아 두면 틀린다(한길 물류'은').
  const JOSA = { '은/는': ['은', '는'], '이/가': ['이', '가'], '을/를': ['을', '를'], '과/와': ['과', '와'], '으로/로': ['으로', '로'] };
  function hasBatchim(str) {
    const s = String(str).replace(/<\/?[^<>]*>/g, '').replace(/[)\]}'"\s]+$/, '');
    const c = s.charCodeAt(s.length - 1);
    if (c >= 0xac00 && c <= 0xd7a3) return (c - 0xac00) % 28 !== 0;     // 한글: 종성 유무
    if (c >= 48 && c <= 57) return '2459'.indexOf(s[s.length - 1]) < 0; // 숫자: 이·사·오·구만 받침 없음
    return true;                                                        // 그 밖(영문·기호)은 받침 있는 쪽으로
  }
  function pickJosa(pair, v) {
    const f = JOSA[pair];
    if (!f) return pair;
    if (pair === '으로/로') {              // ㄹ 받침은 '로' (철도로, 서울로)
      const s = String(v);
      const c = s.charCodeAt(s.length - 1);
      const jong = (c >= 0xac00 && c <= 0xd7a3) ? (c - 0xac00) % 28 : -1;
      return (jong === 0 || jong === 8) ? '로' : '으로';
    }
    return hasBatchim(v) ? f[0] : f[1];
  }

  function format(str, p) {
    if (!p) return str;
    return str.replace(/\{(\w+)(?::([^{}|]*)\|([^{}]*))?\}(은\/는|이\/가|을\/를|과\/와|으로\/로)?/g, (m, key, one, other, josa) => {
      const v = p[key];
      let out;
      if (one !== undefined) out = (v === 1 ? one : other).replace('#', v);
      else if (v === undefined || v === null) return m;
      else out = typeof v === 'object' ? text(v) : String(v);
      return josa ? out + pickJosa(josa, out) : out;
    });
  }

  function t(key, p) {
    const L = LOCALES[lang] || LOCALES[FALLBACK];
    let s = L.ui[key];
    if (s === undefined && LOCALES[FALLBACK]) s = LOCALES[FALLBACK].ui[key];
    if (s === undefined) { if (!warned.has(key)) { warned.add(key); if (typeof console !== 'undefined') console.warn('[i18n] missing key', key); } return key; }
    return format(s, p);
  }

  // 메시지 객체 렌더링: 문자열 그대로 / {k, p} → t / 배열 → ', ' 로 결합
  function text(x) {
    if (x == null) return '';
    if (typeof x === 'string' || typeof x === 'number') return String(x);
    if (Array.isArray(x)) return x.map(text).filter(Boolean).join(', ');
    if (x.k) { const p = {}; for (const key in x.p || {}) { const v = x.p[key]; p[key] = v && typeof v === 'object' ? text(v) : v; } return t(x.k, p); }
    return String(x);
  }
  const msg = (k, p) => ({ k, p });

  const I18n = {
    get lang() { return lang; },
    languages: () => Object.keys(LOCALES).map(id => ({ id, name: LOCALES[id].name || id })),
    init(data, meta) { D = data; M = meta; lang = detect(); apply(); return I18n; },
    setLang(id) { if (!LOCALES[id] || id === lang) return false; lang = id; try { localStorage.setItem(KEY, JSON.stringify(id)); } catch (e) { } apply(); listeners.forEach(f => f(id)); return true; },
    onChange: f => listeners.push(f),
    t, text, msg, has: key => !!((LOCALES[lang] || {}).ui || {})[key],
    _locales: LOCALES,
  };
  if (isNode) module.exports = I18n; else { root.I18n = I18n; if (root.DATA && root.META) I18n.init(root.DATA, root.META); }
})(typeof window !== 'undefined' ? window : globalThis);
