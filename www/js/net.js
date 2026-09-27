// 멀티 「난투」 온라인 — 서버(www/api/match.js)와의 통신. 폴링 기반(서버리스라 WebSocket 없음):
//   큐: 2초마다 queue · 판: 하루를 넘길 때 push(이벤트+스냅샷), 3초마다 poll(이벤트·스냅샷·결과)
//   서버가 없거나(BUILD.api 비움) 응답이 없으면 조용히 실패한다 — 온라인 버튼이 숨거나, 판은 로컬 봇으로 계속 간다
(function (root) {
  const BUILD = Object.assign({ api: '' }, root.BUILD || {});
  const base = () => (BUILD.api || '').replace(/\/$/, '');
  function call(op, data, ms) {
    if (!base() || typeof fetch === 'undefined') return Promise.resolve(null);
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms || 8000) : null;
    return fetch(base() + '/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ op }, data || {})), signal: ctrl ? ctrl.signal : undefined })
      .then(r => r.ok ? r.json() : r.json().then(e => ({ error: (e && e.error) || r.status })).catch(() => ({ error: r.status })))
      .catch(() => null)
      .finally(() => { if (timer) clearTimeout(timer); });
  }
  const NET = {
    enabled: () => !!base(),
    elo: pid => call('elo', { pid }),
    queue: (pid, name, face) => call('queue', { pid, name, face }),
    leave: pid => call('leave', { pid }),
    status: (mid, pid) => call('status', { mid, pid }),
    push: (mid, pid, events, snaps) => call('push', { mid, pid, events, snaps }),
    poll: (mid, pid, since) => call('poll', { mid, pid, since }),
    finish: (mid, pid, forPid, result, cfg, log) => call('finish', { mid, pid, for: forPid, result, cfg, log }, 20000),
    call,
  };
  if (typeof module !== 'undefined') module.exports = NET; else root.NET = NET;
})(typeof window !== 'undefined' ? window : globalThis);
