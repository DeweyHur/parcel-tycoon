// 저장소 어댑터. 지금은 localStorage, 나중에 Google Play Games Saved Games 등으로 교체 가능.
// 규칙: 모든 저장/불러오기는 이 모듈만 거친다. 값은 JSON 직렬화 가능한 객체.
window.Store = (function () {
  const PREFIX = 'pt_';
  const listeners = [];
  const local = {
    get(key) { try { const v = localStorage.getItem(PREFIX + key); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(key, val) { try { localStorage.setItem(PREFIX + key, JSON.stringify(val)); return true; } catch (e) { return false; } },
    remove(key) { try { localStorage.removeItem(PREFIX + key); } catch (e) { } },
    keys() { try { return Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).map(k => k.slice(PREFIX.length)); } catch (e) { return []; } },
  };
  let backend = local;
  return {
    get: k => backend.get(k),
    set: (k, v) => { const ok = backend.set(k, v); listeners.forEach(f => f(k, v)); return ok; },
    remove: k => backend.remove(k),
    keys: () => backend.keys(),
    onChange: f => listeners.push(f),
    // 클라우드 백엔드 교체용: { get, set, remove, keys } 구현체를 넘기면 이후 호출부터 사용
    setBackend: b => { backend = b; },
    exportAll() { const out = {}; for (const k of backend.keys()) out[k] = backend.get(k); return out; },
    importAll(obj) { for (const k in obj) backend.set(k, obj[k]); },
  };
})();
