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

  function format(str, p) {
    if (!p) return str;
    return str.replace(/\{(\w+)(?::([^{}|]*)\|([^{}]*))?\}/g, (m, key, one, other) => {
      const v = p[key];
      if (one !== undefined) return (v === 1 ? one : other).replace('#', v);
      if (v === undefined || v === null) return m;
      return typeof v === 'object' ? text(v) : String(v);
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
