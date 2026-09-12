// 스토리 모드(창고장 안내): 전임 창고장 박 반장이 첫 3개월 동안 옆에서 규칙을 한 번에 하나씩 말해 주고 6월에 떠난다.
// 규칙은 바꾸지 않는다 — 게임 상태를 읽어 "지금 말할 비트"를 고르는 층일 뿐이다 (docs/STORY_TUTORIAL_DESIGN.md 3·4장).
// 비트: { id, months: [개월차...], kind: 'start'|'turn'|'call'|'summary'|'market', when(g, ctx), pages: [{ expr, hl, k? }], calendar?: true }
//   - 한 번의 check(g, ctx)에서 비트는 최대 하나만 나온다. 같은 턴에 여럿이 걸리면 앞의 것이 먼저, 나머지는 다음 기회에.
//   - 문구는 locales ui 'story.<id>.<n>' (페이지 n = 1..). 자리표시자는 params(g)로 채운다.
//   - 본 비트는 game.story.seen 에 남는다 (세이브에 포함). 프로필 story.seen 은 "첫 런에 안내를 봤다"는 표시.
(function (root) {
  const SPRITES = {
neutral: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uEoKDKWRkbIyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZLtifAAAAIHRSTlMA//////////////////////8AAAAAAAAAAAAAAAAAAFCw8GQAAADQSURBVHjavZLZFoMgDERhrOzW9v9/tglLxcApb50HE5hLTBSl/ijcNPEfN2HhDwT7WuvilQQCiJH2Y1ZOBkALSYCO7ZdLaRQAtAY/WCirm8/7htRHCMAYe5gsjhNAm+MwfYTsIZd+t1fIr41+CB5Dfus6wJNUR5kDl8a/tfCpzb3T7EKo3/el2O34BMFGakDOlTqFn1IqACW07Gx4H5zDxttZaYNz4fQQQCMoMOAHwL6srTXg+k4ZCIEAewFUgoQ70Alg2tYa3x5GQGEBrCuoDyfDCVK8VTIjAAAAAElFTkSuQmCC',
    smile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uGWRkbIyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAo6KCrAAAAIHRSTlMA/////////////////////wAAAAAAAAAAAAAAAAAAAEzjGe4AAADPSURBVHjavZLbEoMgDETDWuVq2///2oYgCoHRt+44Q2RPQsJA9Eeh08R/dcKDPxDZN8YUrwRQQIy8H0USDIBR0gCnrZfLYVQAdIV+UrE3VrtCAdsG8diFEBgqyHet0D1I8rceoW8bufO99LfnMfRdlyl2kRkOOIF2TLonMHkOa6PZg6D791Lsmj5BsLAqIDHRW/kppQJwwL+NDe+Dc1jytigtcC68PRRQCV4y4AfAfqw9asC1nWYgBAbsBXAJFnqgEZBpe9Q4exgBwgPwXIF+pAcJIQLJSBgAAAAASUVORK5CYII=',
    worry: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uEoKDKWRkbIyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZLtifAAAAIHRSTlMA//////////////////////8AAAAAAAAAAAAAAAAAAFCw8GQAAADUSURBVHjavZLZFoMgDETJWFld2v//2YZNIXDqW+fBBOYSAqLUH4VOE//VCQ/+QESfiLKXEwggBJ4PSSkZABKSAC9bCdkDpxQEwB5QV+dR58dpzWojBKC12XVSjBOA9L7rNkL2kEp/6hbytlPnt1aSd11OcLDKSabAcX1o/Fv9RWLyHNZGswehfr+XbNflEwQLqwIpV+oU/rZtGeCEh40N57y1WOJ00rbAWn86CKASHCLgBsC8jSk1YNtOI+A9A+YGuAQLPdAIiLQpNa4eRkDhAXiuoL5Ynglsqcqd+AAAAABJRU5ErkJggg==',
    shock: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrSWRkbm5uEoKDLIyNJaHh7IPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAROR4RAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAADSSURBVHjavZLZFoMgDERhLKtFbf//Yxs2CwHrW+clkbmMgYMQfxQ6TfxHJ9z4AxF9KWX2cgMGrCutr0mpGQDJxAHapmj4aFFRlMEA8IT+pMnWpLaCAVpvm06KdQLIaLQVfIYU/a6/4LcNqdoRleR3XU7xJJVTXADHcQEU4kzA5DmoRrMHIX6/l2zX7RMEC6kCqRdiZ34IIQPU0GdjwzlvLZa4nBQWWOt3BwZUgkoE3ACYlzElA7adNALeE2C+AEWQ0AONgEibknHOMAICN8B9gvgABVIJysoaOxAAAAAASUVORK5CYII=',
  };
  const CHARACTER = { id: 'park', nameKey: 'story.name' };

  const attrsOf = (g, p) => p.attrs || root.DATA.PARCEL_TYPES[p.type].attrs;
  const usage = g => g.usedVolume() / g.warehouse.cap;
  const gating = ['cold', 'fragile', 'customs', 'frozen'];
  const handleable = (g, p) => g.contracts.some(c => c && g.eligibleParcels(c).some(x => x.id === p.id));
  const bestReadySlot = g => { let best = -1, bestFill = 0; g.contracts.forEach((c, i) => { if (!c || !g.canCall(c)) return; const vol = g.eligibleParcels(c).reduce((s, p) => s + p.size, 0), fill = vol / g.vehicleCap(c); if (fill > bestFill) { bestFill = fill; best = i; } }); return { slot: best, fill: bestFill }; };
  const hasEvent = (ctx, types) => (ctx.events || []).some(e => types.includes(e.type));

  const BEATS = [
    // ----- 3월 (1개월차): 창고 -----
    { id: 'intro', months: [1], kind: 'start', when: () => true, pages: [{ expr: 'smile' }, { expr: 'neutral', hl: '#parcels' }, { expr: 'neutral', hl: '#wait-btn' }] },
    { id: 'usage', months: [1], kind: 'turn', when: g => g.turn >= 2, pages: [{ expr: 'neutral', hl: '#bar-usage' }] },
    { id: 'callReady', months: [1], kind: 'turn', when: g => g.turn >= 3 || bestReadySlot(g).fill >= 0.8, pages: [{ expr: 'neutral', hl: g => { const b = bestReadySlot(g); return b.slot >= 0 ? '#c' + b.slot : '#actions'; } }, { expr: 'neutral' }] },
    { id: 'firstCall', months: [1, 2], kind: 'call', when: (g, ctx) => ctx.result && ctx.result.ok, pages: [{ expr: 'smile' }, { expr: 'neutral' }] },
    { id: 'deadline1', months: [1, 2, 3], kind: 'turn', when: g => g.parcels.some(p => !p.overdue && p.deadline <= 1 && !(p.customs > 0)), pages: [{ expr: 'worry', hl: '#parcels' }] },
    { id: 'usage76', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.76, pages: [{ expr: 'worry', hl: '#bar-usage' }, { expr: 'neutral', hl: '#upcoming' }] },
    { id: 'usage91', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.91, pages: [{ expr: 'shock', hl: '#bar-usage' }] },
    { id: 'summary1', months: [1], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'smile' }] },
    { id: 'market1', months: [1], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'neutral' }, { expr: 'neutral' }] },
    // ----- 4월 (2개월차): 고객과 돈 -----
    { id: 'm2', months: [2], kind: 'turn', when: g => g.turn === 1, pages: [{ expr: 'smile' }, { expr: 'neutral', hl: '#parcels' }] },
    { id: 'special', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => attrsOf(g, p).some(a => gating.includes(a))), pages: [{ expr: 'neutral', hl: '#parcels', k: g => { const p = g.parcels.find(x => attrsOf(g, x).some(a => gating.includes(a))); const a = attrsOf(g, p).find(x => gating.includes(x)); return 'story.special.' + a; } }] },
    { id: 'noContract', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => !(p.customs > 0) && attrsOf(g, p).some(a => gating.includes(a)) && !handleable(g, p)), pages: [{ expr: 'worry', hl: '#wait-btn' }, { expr: 'neutral' }] },
    { id: 'offer', months: [2, 3], kind: 'turn', when: g => !!g.offer, pages: [{ expr: 'neutral', hl: '#offer' }, { expr: 'neutral' }] },
    { id: 'cash', months: [2, 3], kind: 'turn', when: g => g.projectedCash().total < 0 || g.debt > 0, pages: [{ expr: 'neutral', hl: '#hud-left' }, { expr: 'worry' }] },
    { id: 'summary2', months: [2], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }] },
    { id: 'market2', months: [2], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }] },
    // ----- 5월 (3개월차): 손실, 승리, 작별 -----
    { id: 'm3', months: [3], kind: 'turn', when: g => g.turn === 1, pages: [{ expr: 'smile' }, { expr: 'neutral' }] },
    { id: 'fragileRisk', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => attrsOf(g, p).includes('fragile')) && !g.contracts.some(c => c && g.contractCaps(c).includes('fragile')), pages: [{ expr: 'neutral', hl: '#parcels' }] },
    { id: 'loss', months: [1, 2, 3], kind: 'any', when: (g, ctx) => hasEvent(ctx, ['discard', 'returned', 'stolen', 'broken', 'claim']), pages: [{ expr: 'shock' }, { expr: 'neutral' }] },
    { id: 'rain', months: [1, 2, 3], kind: 'turn', when: g => g.weatherNow() === 'rain' || g.upcoming().some(u => u.weather === 'rain'), pages: [{ expr: 'neutral', hl: '#upcoming' }, { expr: 'neutral', hl: '#wait-btn' }] },
    { id: 'win', months: [3], kind: 'turn', when: g => g.turn >= 5, pages: [{ expr: 'neutral' }, { expr: 'smile' }, { expr: 'neutral' }] },
    { id: 'summary3', months: [3], kind: 'summary', when: () => true, pages: [{ expr: g => (g.summary && g.summary.cash > 0 ? 'smile' : 'worry'), k: g => 'story.summary3.' + (g.summary && g.summary.cash > 0 ? 'good' : 'bad') }] },
    { id: 'farewell', months: [4], kind: 'turn', when: g => g.turn === 1, calendar: true, pages: [{ expr: 'smile' }, { expr: 'neutral' }, { expr: 'smile' }] },
  ];

  // 문구 자리표시자
  function params(g) {
    const bulk = g.contracts.find(c => c && (root.DATA.CARRIERS[c.carrier].onlyPlain)) || g.contracts.find(Boolean);
    const cap = bulk ? g.vehicleCap(bulk) : 6, fee = bulk ? g.truckFee(bulk) : 35;
    const b = bestReadySlot(g); const c = b.slot >= 0 ? g.contracts[b.slot] : bulk;
    return { name: bulk ? g.contractName(bulk) : '', cap, fee, per: Math.round(fee / Math.max(1, cap)), ready: c ? g.contractName(c) : '', readyCap: c ? g.vehicleCap(c) : cap,
      cash: g.cash, projected: g.projectedCash().total, rent: g.opCostBreakdown(g.month).rent, months: g.rules.months, cal: g.calMonth(), startCal: g.calMonth(1), lastCal: g.calMonth(g.rules.months),
      delivered: g.run.delivered, returned: g.stats.returned + g.stats.stolen + g.stats.broken, full: g.stats.fullTrucks, fee2: fee, interest: Math.round(root.DATA.LOAN.interest * 100) };
  }

  // 지금 보여줄 비트. ctx = { kind, events?, result? }. 되돌리지 않는다: 반환한 비트는 seen 에 기록된다
  function check(g, ctx) {
    if (!g || !g.story || g.story.off) return null;
    const kind = ctx.kind || 'turn';
    for (const b of BEATS) {
      if (g.story.seen.includes(b.id)) continue;
      if (b.months && !b.months.includes(g.month)) continue;
      if (b.kind === 'turn' ? !['turn', 'call'].includes(kind) : b.kind !== 'any' && b.kind !== kind) continue;
      if (b.kind === 'any' && !['turn', 'call'].includes(kind)) continue;
      if ((b.kind === 'turn' || b.kind === 'any') && g.phase !== 'play') continue;
      let ok = false; try { ok = !!b.when(g, ctx); } catch (e) { ok = false; }
      if (!ok) continue;
      g.story.seen.push(b.id);
      return build(b, g);
    }
    return null;
  }
  function build(b, g) {
    const p = params(g);
    const pages = b.pages.map((pg, i) => {
      const key = pg.k ? pg.k(g) : `story.${b.id}.${i + 1}`;
      return { expr: typeof pg.expr === 'function' ? pg.expr(g) : pg.expr, hl: typeof pg.hl === 'function' ? pg.hl(g) : pg.hl || null, text: root.I18n.t(key, p) };
    });
    if (!g.story.notes) g.story.notes = [];
    g.story.notes.push({ id: b.id, month: g.month, turn: g.turn, text: pages.map(x => x.text) });
    return { id: b.id, pages, calendar: !!b.calendar, name: root.I18n.t(CHARACTER.nameKey) };
  }
  // 6월 이후 월초 문자: 그 달력 달의 한 줄 예고. 스토리 모드가 아니어도 옵션이 켜져 있으면 나온다
  function sms(g) {
    if (!g || g.turn !== 1) return null;
    const key = `cal.${g.rules.calendar || 'kr'}.${g.calMonth()}.sms`;
    const s = root.I18n.t(key); if (s === key) return null;
    return s;
  }
  function done(g) { return !!(g && g.story && g.story.seen.includes('farewell')); }
  function active(g) { return !!(g && g.story && !g.story.off && !done(g)); }

  const Story = { BEATS, SPRITES, CHARACTER, check, sms, done, active };
  if (typeof module !== 'undefined') module.exports = Story; else root.Story = Story;
})(typeof window !== 'undefined' ? window : globalThis);
