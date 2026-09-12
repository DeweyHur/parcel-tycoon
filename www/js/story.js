// 스토리 모드(창고장 안내): 전임 창고장 박 반장이 첫 3개월 동안 옆에서 규칙을 한 번에 하나씩 말해 주고 6월에 떠난다.
// 규칙은 바꾸지 않는다 — 게임 상태를 읽어 "지금 말할 비트"를 고르는 층일 뿐이다 (docs/STORY_TUTORIAL_DESIGN.md 3·4장).
// 비트: { id, months: [개월차...], kind: 'start'|'turn'|'call'|'summary'|'market', when(g, ctx), pages: [{ expr, hl, k?, gate? }], calendar?: true }
//   - gate: 마지막 페이지가 닫힌 뒤 hl 대상만 누를 수 있게 막는다("여기를 눌러"). 그 대상을 누르면 풀린다.
//   - 한 번의 check(g, ctx)에서 비트는 최대 하나만 나온다. 같은 턴에 여럿이 걸리면 앞의 것이 먼저, 나머지는 다음 기회에.
//   - 문구는 locales ui 'story.<id>.<n>' (페이지 n = 1..). 자리표시자는 params(g)로 채운다.
//   - 본 비트는 game.story.seen 에 남는다 (세이브에 포함). 프로필 story.seen 은 "첫 런에 안내를 봤다"는 표시.
(function (root) {
  // 표정 6종 × 말할 때(_talk, 입 벌림) 프레임. 32px PNG base64 (tools: sprites.py)
  const SPRITES = {
    neutral: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uEoKDKWRkbIyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZLtifAAAAIHRSTlMA//////////////////////8AAAAAAAAAAAAAAAAAAFCw8GQAAADQSURBVHjavZLZFoMgDERhrOzW9v9/tglLxcApb50HE5hLTBSl/ijcNPEfN2HhDwT7WuvilQQCiJH2Y1ZOBkALSYCO7ZdLaRQAtAY/WCirm8/7htRHCMAYe5gsjhNAm+MwfYTsIZd+t1fIr41+CB5Dfus6wJNUR5kDl8a/tfCpzb3T7EKo3/el2O34BMFGakDOlTqFn1IqACW07Gx4H5zDxttZaYNz4fQQQCMoMOAHwL6srTXg+k4ZCIEAewFUgoQ70Alg2tYa3x5GQGEBrCuoDyfDCVK8VTIjAAAAAElFTkSuQmCC',
    neutral_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAAAeGBzwy6hkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uGWRkYoKDJaHh7IyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD3WkcxAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAADWSURBVHjavZLbEoMgDERZrNzES/v/H9sEsEJg6vSl+2ACe4gJg1J/FBoN/Ecj3Pgdwb7WOns5gQCWhfaXpJR0gBaSAB2bL5fSRQDQGvxhIa8an/cNqY4QgDF2M0kcB4A222bqCNlDKv06fyFvG3kIlE5nLe+6DLDu+1pG+RUoxEoa+9TmXGn0INT395Lt8/gAwUQ6gZQrdQg/xpgBSmhZ2fA+OIeJt5PiBOfC4SGAk6DAgO8A+7S21ICrO2UgBALsBVAJElqgEsC0LTU+PfSAwg1wX0G9AV5hCcWz5dDlAAAAAElFTkSuQmCC',
    smile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uGWRkbIyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAo6KCrAAAAIHRSTlMA/////////////////////wAAAAAAAAAAAAAAAAAAAEzjGe4AAADPSURBVHjavZLbEoMgDETDWuVq2///2oYgCoHRt+44Q2RPQsJA9Eeh08R/dcKDPxDZN8YUrwRQQIy8H0USDIBR0gCnrZfLYVQAdIV+UrE3VrtCAdsG8diFEBgqyHet0D1I8rceoW8bufO99LfnMfRdlyl2kRkOOIF2TLonMHkOa6PZg6D791Lsmj5BsLAqIDHRW/kppQJwwL+NDe+Dc1jytigtcC68PRRQCV4y4AfAfqw9asC1nWYgBAbsBXAJFnqgEZBpe9Q4exgBwgPwXIF+pAcJIQLJSBgAAAAASUVORK5CYII=',
    smile_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uGWRkZaHh7IyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACndzRFAAAAIHRSTlMA//////////////////////8AAAAAAAAAAAAAAAAAAFCw8GQAAADQSURBVHjavZLbEoMgDERhrXJV2///2YYAFQJTpy/dcYbInsQEUeqPQqeJ/+iEG38gkq+1zl4OIIAQaD+wOBgALSQBSlsvl8IgAMgK/aRsb6R2hQC2DeyRCyYwVODnWiF74ORX/YQ8beQh0m/IY8izLlPsx7GXKX4FCrGT5j61uTaaXQj1/b5ku6ZPECykCnCs1Cn8GGMGKKDXxoZz3losaZsVF1jrTwcBVIKWBLgBME9jSg3YttMEeE+AuQAqQUIPNAISbUqNTw8joHAD3FdQbwS5CV50xE9bAAAAAElFTkSuQmCC',
    worry: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uEoKDKWRkbIyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABZLtifAAAAIHRSTlMA//////////////////////8AAAAAAAAAAAAAAAAAAFCw8GQAAADUSURBVHjavZLZFoMgDETJWFld2v//2YZNIXDqW+fBBOYSAqLUH4VOE//VCQ/+QESfiLKXEwggBJ4PSSkZABKSAC9bCdkDpxQEwB5QV+dR58dpzWojBKC12XVSjBOA9L7rNkL2kEp/6hbytlPnt1aSd11OcLDKSabAcX1o/Fv9RWLyHNZGswehfr+XbNflEwQLqwIpV+oU/rZtGeCEh40N57y1WOJ00rbAWn86CKASHCLgBsC8jSk1YNtOI+A9A+YGuAQLPdAIiLQpNa4eRkDhAXiuoL5Ynglsqcqd+AAAAABJRU5ErkJggg==',
    worry_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAAAeGBzwy6hkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uGWRkYoKDJaHh7IyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD3WkcxAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAADWSURBVHjavZLbEsIgDETZ1HJvq/7/xxpuSgNjxxf3JSF7CIFBqT8KJ03820m48Aci+URUvJJAACFwPWTlZABISAK8bSUUD5xSEAB7QNtdVic/lTWrjxCA1mbXWSlOANL7rvsIOUNu/WxHyNfOk6dyGXUl+db1BttxbPUmvwKV2Fhzn8dcO80+hPr+X4rdtk8QLKwG5Fypu/BjjAXghJedDee8tVhSOSsusNbfHQTQCA4JcANgHsbUHrD9pAnwngHzAbgFC2egE5BoU3u8ZxgBhQvguoN6AV4fCcUrOvOBAAAAAElFTkSuQmCC',
    shock: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrSWRkbm5uEoKDLIyNJaHh7IPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAROR4RAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAADSSURBVHjavZLZFoMgDERhLKtFbf//Yxs2CwHrW+clkbmMgYMQfxQ6TfxHJ9z4AxF9KWX2cgMGrCutr0mpGQDJxAHapmj4aFFRlMEA8IT+pMnWpLaCAVpvm06KdQLIaLQVfIYU/a6/4LcNqdoRleR3XU7xJJVTXADHcQEU4kzA5DmoRrMHIX6/l2zX7RMEC6kCqRdiZ34IIQPU0GdjwzlvLZa4nBQWWOt3BwZUgkoE3ACYlzElA7adNALeE2C+AEWQ0AONgEibknHOMAICN8B9gvgABVIJysoaOxAAAAAASUVORK5CYII=',
    shock_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAAAeGBzwy6hkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uEoKDKWRkZaHh7IyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAb/RuoAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAADTSURBVHjavZLbEsIgDERZKtdiW/3/jzXhojQwdnxxX0LZwzZhUOqPwkkT/3YSLvyBYF9rXbyygADWlfbXrLwYAC0kATpmqHm2qBjKEABkwnnSbFtSXyEAa+93m8V1Amg2+grZQ45+tl/I24Y2dYKcZrS86zrFtu9bneJXoBIbae5Tm6bT7EGo7++l2O34BMFCakBeK3UIP6VUAFrQZ2cjhOg9Ft7OSgu8j0eAABpBhYEwAO7hXM2A7ztlIEYC3AegCBLOQCeAaVcz3j2MgMIFcJ2gXnvtCdMevTKwAAAAAElFTkSuQmCC',
    think: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uGWRkbIyNIoKDLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABH+IFKAAAAIHRSTlMA//////////////////////8AAAAAAAAAAAAAAAAAAFCw8GQAAADSSURBVHjavZLrDsMgCIXxdK3X7vL+LzvUOima9t9OmkDhA8FI9EfhpEn+cRJu8gOR88aYmqsOFBAjx2NRcQbAdPGM3EMBXLZ2hN2oAByFos0pn0MbS1oogKOvrSjbCWC28nULPUMp/rQj9G1DLLHnNfRdtwV2lhkOEEBfk64JTJ7DKjR7EHT9Xmq6lU8QLKwGFJ/oqfIppQqww78iDe+Dc1hyuCgtcC48PRTQCDYZ8ANg39YePeDkpBkIgQHbAW7BwhkQAjJtjx6/GUaAcAPcd6Avr+IJH4mGDdIAAAAASUVORK5CYII=',
    think_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwy6geGBxkgqDX19zIoH08Rlr39/FwUzxGX3hQPCiqqrTm5uGWRkZaHh7IyNIoKDLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABGrFLzAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAADWSURBVHjavZJZDoMwDESToZANStv7H7aTrQQnKupPR0g2nmfjRCj1R+GkgX87CRd+R0Rfa529nEAAIbAeklLSAfoQd+QMAbBtPhCmQQAojc2Ykx9LC9VGCIDVx5IU4wDQS3qOCLlDan7VT8jbRj4EyqazlnddDrDd71s5xa9AITZq7HPNudHoh1Df/5ds1/YBgomqQMqV2oW/rmsGmPC1seGctxZTLCetE6z1u4MAKsEQAdcB5mlMmQHbbhoB7wmYA+AICmegERBpU2Z8dugBhQvgeoJ6A19uCYK2oL+CAAAAAElFTkSuQmCC',
    laugh: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADwzKkeGBxkgqDX19zIoH339/A8RlpwUzxGX3iWRkZQPCiqqrTm5uHIyNLIPDLNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2wxz0AAAAIHRSTlMA/////////////////////wAAAAAAAAAAAAAAAAAAAEzjGe4AAADQSURBVHjavZLbEoMgDETDWpGr7f9/bUOQioGpfeqOM4nsIQQmRH8ULpr4j4tw4w9E8Y0x1asJFJASryeRJANglDTA29bT5TQpALrC9aZib6w+QgHbBvHYhRAYKsh3RugeZPOrHaFfG6XzECwrhHIN/db1FkFkhgN+AUg9BCbjsHaaDQR9n5dqt+0TBAurAZIT7crPOVeAE/7tbHgfncNSlkV5gXNx91BAIzgUwA+AfVp71IDrOy1AjAzYE+ASLFyBTkCh7VHj08MIEG6A+wr0BqIGCYwngxlPAAAAAElFTkSuQmCC',
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
    { id: 'intro', months: [1], kind: 'start', when: () => true, pages: [{ expr: 'smile' }, { expr: 'neutral', hl: '#parcels' }, { expr: 'neutral', hl: '#wait-btn', gate: true }] },
    { id: 'usage', months: [1], kind: 'turn', when: g => g.turn >= 2, pages: [{ expr: 'neutral', hl: '#bar-usage' }] },
    { id: 'callReady', months: [1], kind: 'turn', when: g => g.turn >= 3 || bestReadySlot(g).fill >= 0.8, pages: [{ expr: 'neutral' }, { expr: 'neutral', hl: g => { const b = bestReadySlot(g); return b.slot >= 0 ? '#c' + b.slot : '#actions'; }, gate: g => bestReadySlot(g).slot >= 0 }] },
    { id: 'firstCall', months: [1, 2], kind: 'call', when: (g, ctx) => ctx.result && ctx.result.ok, pages: [{ expr: 'laugh' }, { expr: 'neutral' }] },
    { id: 'deadline1', months: [1, 2, 3], kind: 'turn', when: g => g.parcels.some(p => !p.overdue && p.deadline <= 1 && !(p.customs > 0)), pages: [{ expr: 'worry', hl: '#parcels' }] },
    { id: 'usage76', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.76, pages: [{ expr: 'worry', hl: '#bar-usage' }, { expr: 'neutral', hl: '#upcoming' }] },
    { id: 'usage91', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.91, pages: [{ expr: 'shock', hl: '#bar-usage' }] },
    { id: 'summary1', months: [1], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'smile' }] },
    { id: 'market1', months: [1], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'think' }, { expr: 'neutral' }] },
    // ----- 4월 (2개월차): 고객과 돈 -----
    { id: 'm2', months: [2], kind: 'turn', when: g => g.turn === 1, pages: [{ expr: 'smile' }, { expr: 'neutral', hl: '#parcels' }] },
    { id: 'special', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => attrsOf(g, p).some(a => gating.includes(a))), pages: [{ expr: 'neutral', hl: '#parcels', k: g => { const p = g.parcels.find(x => attrsOf(g, x).some(a => gating.includes(a))); const a = attrsOf(g, p).find(x => gating.includes(x)); return 'story.special.' + a; } }] },
    { id: 'noContract', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => !(p.customs > 0) && attrsOf(g, p).some(a => gating.includes(a)) && !handleable(g, p)), pages: [{ expr: 'worry' }, { expr: 'neutral', hl: '#wait-btn', gate: true }] },
    { id: 'offer', months: [2, 3], kind: 'turn', when: g => !!g.offer, pages: [{ expr: 'neutral', hl: '#offer' }, { expr: 'think' }] },
    { id: 'cash', months: [2, 3], kind: 'turn', when: g => g.projectedCash().total < 0 || g.debt > 0, pages: [{ expr: 'think', hl: '#hud-left' }, { expr: 'worry' }] },
    { id: 'summary2', months: [2], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }] },
    { id: 'market2', months: [2], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }] },
    // ----- 5월 (3개월차): 손실, 승리, 작별 -----
    { id: 'm3', months: [3], kind: 'turn', when: g => g.turn === 1, pages: [{ expr: 'smile' }, { expr: 'neutral' }] },
    { id: 'fragileRisk', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => attrsOf(g, p).includes('fragile')) && !g.contracts.some(c => c && g.contractCaps(c).includes('fragile')), pages: [{ expr: 'neutral', hl: '#parcels' }] },
    { id: 'loss', months: [1, 2, 3], kind: 'any', when: (g, ctx) => hasEvent(ctx, ['discard', 'returned', 'stolen', 'broken', 'claim']), pages: [{ expr: 'shock' }, { expr: 'neutral' }] },
    { id: 'rain', months: [1, 2, 3], kind: 'turn', when: g => g.weatherNow() === 'rain' || g.upcoming().some(u => u.weather === 'rain'), pages: [{ expr: 'neutral', hl: '#upcoming' }, { expr: 'neutral', hl: '#wait-btn' }] },
    { id: 'win', months: [3], kind: 'turn', when: g => g.turn >= 5, pages: [{ expr: 'neutral' }, { expr: 'smile' }, { expr: 'think' }] },
    { id: 'summary3', months: [3], kind: 'summary', when: () => true, pages: [{ expr: g => (g.summary && g.summary.cash > 0 ? 'laugh' : 'worry'), k: g => 'story.summary3.' + (g.summary && g.summary.cash > 0 ? 'good' : 'bad') }] },
    { id: 'farewell', months: [4], kind: 'turn', when: g => g.turn === 1, calendar: true, pages: [{ expr: 'smile' }, { expr: 'neutral' }, { expr: 'laugh' }] },
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
      return { expr: typeof pg.expr === 'function' ? pg.expr(g) : pg.expr, hl: typeof pg.hl === 'function' ? pg.hl(g) : pg.hl || null, gate: typeof pg.gate === 'function' ? !!pg.gate(g) : !!pg.gate, text: root.I18n.t(key, p) };
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
