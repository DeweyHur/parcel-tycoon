// 스토리 모드(창고장 안내): 전임 창고장 박 반장이 첫 3개월 동안 옆에서 규칙을 한 번에 하나씩 말해 주고 6월에 떠난다.
// 규칙은 바꾸지 않는다 — 게임 상태를 읽어 "지금 말할 비트"를 고르는 층일 뿐이다 (docs/STORY_TUTORIAL_DESIGN.md 3·4장).
// 비트: { id, months: [개월차...], kind: 'start'|'turn'|'call'|'summary'|'market'|'modal'(+modal: 'call'|'wait'), when(g, ctx), pages: [{ expr, hl, k?, gate? }], calendar?: true }
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

  // 조연: 여 실장(대량) · 노 기사(대형·철도) · 강 소장(냉장·냉동) · 이름 없는 담당자(그 외) — neutral / neutral_talk / smile
  // 한 사장님(han): 이 창고의 전 주인. 운송센터 담당자가 아니라 이야기 인물이라 표정이 더 많다 (neutral/smile/worry/laugh)
  const REPS = {
    yeo_neutral: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAAAeGBz10rR4Sy1abpYyMjz6vihatNLNpYcoKDJVMh48UHPc3Obw+fx4eIKWRkbceHhaWmTNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAkjsMJAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAAC5SURBVHjarZKLDoMgDEW5ojLwscf/f+xKK5FCtyyZJzGS3kMBxbmLmAxUTg8UR/EE8ApW6tx34HIhHfXkE9M48EOZOQikJlSfgep0OMl44KepFTStkGtblEzehhAPIVoCrfrI5RcrNIQS3I52D1CnIEPKd8IWsO9P3QHN/yJD5d2VAW4VgHGrmvtixmW6oWAkisBjI68EvRaWZWZEGzEjFvBJCMIXYcucwsoUYe079AI3CH/uIfzU4Q1IdQwPur1n/QAAAABJRU5ErkJggg==',
    yeo_neutral_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAAAeGBz10rR4Sy1abpYyMjz6vihatNLNpYcoKDJVMh48UHPwyKXc3Obw+fyWRkZ4eIJaHh7ceHhaWmTNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB1aq1pAAAAIHRSTlMA//////////////////////////8AAAAAAAAAAAAAAGTP5fYAAADDSURBVHjarZKLDoMgDEW94mMgvrb9/7euFIkU6rJknoRI2gMUadPcRK8g8jQgOIIngBGwkudNBW4X3BF3xjGFA9OmlW2EVIfsN1CcLhdzPDF9XwqSUgixxcZc/CqCPQSrCXTqM4TfrNAUQmg2rs/78Azec6XiFmREYd33VRewbS8poHgvMoJAsICqZYBHBqB0VdEvajotVxR0RBJ4ruQzQZ6FaRqYqHUYYBO4EsbIF2EJnMLMJGGud6gF3mD8s4bxpx0+evMNS5y9SrQAAAAASUVORK5CYII=',
    yeo_smile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAAAeGBz10rR4Sy1abpYyMjz6vihatNLNpYcoKDJVMh48UHPc3Obw+v+WRkZ4eILceHhaWmTNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD68qTRAAAAIHRSTlMA////////////////////////AAAAAAAAAAAAAAAAAG84GDUAAAC1SURBVHjarZIBDoMgDEX5ILKhG9vuf9hhC5NCXZbMlxhJ/2tFxZiT8AoizxcEpbgDOAEpbe4GcLoQSz26SHQOnK2dlslqRPMZav2D834UwBk0gQM0N0WQdEJuemzlF4V5CSGYRFPv3Es3iLfIBkeE1QSk9BRbKL9UGCIfjgxwaQCUU9WdFzWu7YqCKVMFWit5I8hnYVlmgrUJM64VHAmB+SLcNnZhJaqwjhNGgQaEP/cQfprwBhL9DAFtCpvzAAAAAElFTkSuQmCC',
    noh_neutral: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAACWlpseGBzhtIzIPDI4KCVubna5h2TIyM3h4eaWKCPz8/CWRkbceHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABTZUWtAAAAIHRSTlMA/////////////////wAAAAAAAAAAAAAAAAAAAAAAAMhUwNYAAACkSURBVHja3ZJBEsMgCEUjFMXY3v+6RWlGAknddNW3Cc5/GVTctp8BjpA/HLDIvXEIbW/tu9AWwn2LPXASgJip1kqDXsiayAqCHF6FWdzeUrgtwE4jtF+7CRXoI1AUpAfiC7EORumnAViOvBsF/bS0CT4FjA2mMInzXuSyzWKID8Zf1lUuk9bfpbh4cgmYWQUpZOlzL1gDck4qpIEKKWc4CYF/Et6GTQk81d/NtAAAAABJRU5ErkJggg==',
    noh_neutral_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAACWlpseGBzIPDLhtIw4KCVubna5h2TIyM3h4eaWKCPz8/CWRkZaHh7ceHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABHcUxBAAAAIHRSTlMA//////////////////8AAAAAAAAAAAAAAAAAAAAAAFkoFncAAACoSURBVHja3ZJLFoMwCAANhXxM7f2PKwnaIiR101VnI3mMQYFl+RlgcPmHAW7y1jiFutb6Xag3wrzE6rgIQDlTKYU6LeAzkRYY/nkRPsG0S65bgI1KqJ/6I0SgQyAvcA3EF2Lp9NBOAzCd+WYktNOSIvhk0BdQwrZNhMN43wCDhUkKvzC2WaM8T1pe52CwcgFyziJwwEebt4I2IMYgQuiIEGKEi+D4J2EHrDMJiB7Sdx0AAAAASUVORK5CYII=',
    noh_smile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAACWlpseGBzhtIzIPDI8KCNubna5h2TIyM3h4eaWKCPy8vCWRkbceHgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC63fErAAAAIHRSTlMA/////////////////wAAAAAAAAAAAAAAAAAAAAAAAMhUwNYAAACeSURBVHja3ZLLEsMgCEXjJb5i+/+/W4TJjIKpm656NsFwHBjwOH4GDC5/GrDJW+MW2tXad6FthOcSl2MSEEuJtdYo9IDPMY7CEjxOyU0L1AFh+NDYhP4xzF2y8iaqgoR2G6B857uRyW5Li7wEX2DVhd/3Js9t5gH/YOywVnnetF7nYPHkAkopKnDAR5u3wmggpaBCEFQIKWESHP8kfACMuQlAIxUpZwAAAABJRU5ErkJggg==',
    kang_neutral: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADrw6A8WlAeGBw6LCj09OrDlnaWbkYoQTooHhyWlqDS3Nd4eIK+ub6WRkbIPDIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADmpgQOAAAAIHRSTlMA////////////////////AAAAAAAAAAAAAAAAAAAAAEGSIDkAAADCSURBVHjanZLrEoQgCEZFUMu27f3fdvFWJDQ70/mjo8cPzJyTYMU9glTBl0IJp5UhswyW0/u+U2dWWvi1rwohKd4I64ktRDiJhgDAl2vbdXIXEAxQCYFAjlqgLpAW3CgPZ6fqU0KU9SPMr9ETvoxu0byHek/8s89tRoH536Hgvv5h2vo4LhVMqQgpofdD8AwKoYHbtjWBJ8LAFCqcUJYrbbIsOAnD6MMlHDnnKnTCEYKdMIQwCXlK8P6phyehBLxP+AGUDQm+5VlQngAAAABJRU5ErkJggg==',
    kang_neutral_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADrw6A8WlAeGBw6LCj09OrDlnaWbkYoQTooHhyWlqDS3Nd4eIKWRka+ub5aHh7IPDIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADVCgWWAAAAIHRSTlMA/////////////////////wAAAAAAAAAAAAAAAAAAAEzjGe4AAADESURBVHjanZJZEoQgDAWBF0BxXO5/2gmbIsQqy/6BIs1LXJRqQUI9AkrgoxDDaWZIbIN4e9s2KvRKDr/qQyPQwBdhPpEFp0+cIGjND5fLaXMXoAUwCJZ0u44CFYFGQdX2+px0eJW5hDKp0/3XKAnrvq/jiK+EYqyMXOcxXYP436Hhfv5j8nm93irwPgrew5gqGAaNkMGyLFngTWPA2wQnxONE3kwTOqEaZbmEI4SQhII9rJUTqmA7IXQJxjzN8CTEgO8Jf2zSCjF62jnRAAAAAElFTkSuQmCC',
    kang_smile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADrw6A8WlAeGBw8LSj09OrDlnaWbkYoQTooHhyWlqDS3Nd4eIKWRka+ub7IPDIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABBqP39AAAAIHRSTlMA////////////////////AAAAAAAAAAAAAAAAAAAAAEGSIDkAAAC8SURBVHjanZJRDoQgDAWVB6K46v1vu5QCYqkxYX4g7fBKxGlqQWJ6BTaBQYHC7Rax6hjQ6fM8bUYqHH73u0GwHSPCVtGFZa4sijALngK4KJZOALfyogiC54yi1Jt2n5JaB/cO8uRrcMKR6Adot+jeEx/9eM2lQf3v0PCs/yJcL8dbBd6T4D2MKYKJoBEY7PvOQtw0BrxLxAQqJ3izrhBCMfJyC1cIIQkZdzmnJxTBCSGIBGPe7vAmUMB4wh++MAnVhG6ufAAAAABJRU5ErkJggg==',
    rep_neutral: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAABGRlp4eIxaWm4eGBwzM0coKDJatNIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGiUehAAAAIHRSTlMA/////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO2GcZQAAABqSURBVHja5ZJLCsAgDESjnaT3v3HFIuRHVSjd9K2EeYZBQ/QhMMT8cMzyYLwgVMeuAHhBRHReA3LOBWxMyDpYgVYFbmQdFiZ4A/Ydek39EdlC0PO+3PG4nigojSH0c5IbQRtgLgnM+I9wATVGBeDixWZkAAAAAElFTkSuQmCC',
    rep_neutral_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAABGRlp4eIxaWm4eGBw0NEgoKDJatNIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSjDNvAAAAIHRSTlMA/////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO2GcZQAAABqSURBVHja5ZJLCsAgDETVTuL9b1yxBPKjVijd9K2EeQ5BU8qHwBDzw7HKg/GC0By7AuAFZtZ5C3BfC9hoyGawgnTQ4LmArQY/J+w7zDH1R2QLUe735YrleqKgDkSY5yQ3gjZAVBOI8B/hBGU6BfhXzkJMAAAAAElFTkSuQmCC',
    rep_smile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAABGRlp4eIxaWm4eGBwzM0coKDJatNIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADGiUehAAAAIHRSTlMA/////////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAO2GcZQAAABqSURBVHja5ZJLCsAgDESjnaT3v3HFIuRHVSjd9K2EeYZBQ/QhMMT8cMzyYLwgVMeuAHhBRHReA3LOBWxMyDpYgVYFbmQdFiZ4A/Ydek39EdlC0PO+3PG4nigojSH0c5IbQRtgLgnM+I9wATVGBeDixWZkAAAAAElFTkSuQmCC',
    han_neutral: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADiwqYeGBzp6eaYelxzWkK4lHhAKhZgQCLAwMgoKDKWRkb19fDNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADZNXIXAAAAIHRSTlMA/////////////////wAAAAAAAAAAAAAAAAAAAAAAAMhUwNYAAACjSURBVHjazZHLFsMgCEQFqom2/f/fLQ9NVEy76jmZBTHMBRIJ4VZCFWlc2gBAABYXCBKZLQQR+vYwaBrTly+bKHBA9cUBxxg5rICvI3Jm4FXMlCfl7IFSgXIFiN5txAQEhNR/QgJOjTdlxpNVf2W+SpjkloE/fN5G6nSx8FPesNjKR2QX4YPVAD2fwCbiJHXqCdw3jDFqlbnagVMR/wLEO474AHucB42N2AMJAAAAAElFTkSuQmCC',
    han_neutral_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADjwqUeGBzp6eaYelxzWkK4lHhAKhZgQCLAwMiWRkYoKDJaHh719fDNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAvIY+hAAAAIHRSTlMA//////////////////8AAAAAAAAAAAAAAAAAAAAAAFkoFncAAACnSURBVHjazZFbEoMgDEVJUlTAdv/LbR6gvKxfnfF+RMg9SRCce5RQRRqnNgAQgMUJgkRmC0GEY3to1I2py6dNFDigvBmAY4wsZsDPESEw8E5mypdCGIGUgXQFiD5lRAc4hCWfT0+6AKfam7LCuO8x/0p/lXdAJiJr7vNrLJUuHvzUaFgs5S2yifDFKoCuT2AVcZIq1QRuK3rvtcpc7cApj38B/BNHfAEjcQfmbA86OQAAAABJRU5ErkJggg==',
    han_smile: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADiwqYeGBzp6eaYelxzWkK4lHhAKhZgQCLAwMiWRkbNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC/kZKoAAAAIHRSTlMA//////////////8AAAAAAAAAAAAAAAAAAAAAAAAAALG4REsAAACeSURBVHjazZHbEoMwCESzSxNN+///WwJac51OHzrjPhBlD6AhhFuJJrE4tQEI4HGCUMTtQohwbI9G3Zi6fNrEgA90vPDnDjr4mD8Bci7/5oQdkvMINCNWwGsBBCIBTzf1SNBUe1NumfxL+6tEp2EZ/OLrNlKlxcIvjYbHs7xF9iI+VCdgzxewFWlSKtUE940xRqty1zpoKvIvQLzjiDf9mQdf/LYsKwAAAABJRU5ErkJggg==',
    han_smile_talk: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADjwqUeGBzp6eaYelxzWkK4lHhAKhZgQCLAwMiWRkZaHh7Nm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABRYrYEAAAAIHRSTlMA////////////////AAAAAAAAAAAAAAAAAAAAAAAAAGkUL34AAAChSURBVHjazZHdEoQgCIUF0tJ6/+ddBCpNnJ292JnOBRZ8cPwJ4VVCEUl0ywBAABodBIm0XAkiHMdDp4dN2+4OEeCC7Ad/nsDG5u8AOdezKSEL5TwCncUMOCZAQEh2fLFJwKn+prSx7HuxnT6v8htgRGH5dX6N1Gjy4LfGgsazvUe2KlxYJyDfN7BWcZIatQRuK8YYpUurMoFTEf8CxDdafABH2AeMmPZe2AAAAABJRU5ErkJggg==',
    han_worry: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADiwqYeGBzp6eaYelxzWkK4lHhAKhZgQCLAwMgoKDKWRkb19fDNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADZNXIXAAAAIHRSTlMA/////////////////wAAAAAAAAAAAAAAAAAAAAAAAMhUwNYAAACiSURBVHjazZHbFoQgCEUF0tKa///d4aJ5bd5mrc4DGWcDhc69SqgijUsbAAjA4gJBIrOFIMK5PXQaxrTlyyYK3FB+mYA6hU8r4OeIGBm4kpnypBhnIGUgPQGiTxkxAA4htJ8QgFP9psw4WflPxlWaf4cJcOOqF7cZGj1ceNVsWCzlPXKIcGMVQM8V2EWcpEYtgceO3nutMlc7cMrjXwD/xhFfm3MHn8VtTNEAAAAASUVORK5CYII=',
    han_laugh: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAYFBMVEUAAADiwqYeGBzp6eaYelxzWkK4lHiWRkZAKhZgQCLAwMj19fDNm3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACc+f2+AAAAIHRSTlMA////////////////AAAAAAAAAAAAAAAAAAAAAAAAAGkUL34AAACgSURBVHjazZHLEoMwCEUDFNHo/39vCWjNg0yni854F2jgwFWS0qOEJrIYlgGAADwGCBJ5uRBEOI6HRp1N3R4OMeADnQf8eYIan/4BkHP5NyfsQTmPQGMxA44JkBAWAJFdJQJ60FS7KesTk39pv8pvQOpXHdzmUmly4bfGgservUW2InypLsDeb2At0iRVqgncVmRm6/KqTdAU418AfqLFG7LPB8ZK9dIOAAAAAElFTkSuQmCC',
  };
  const CHARACTER = { id: 'park', nameKey: 'story.name' };
  const REP_NAMES = { yeo: 'story.name.yeo', noh: 'story.name.noh', kang: 'story.name.kang', han: 'story.name.han', rep: 'story.name.rep' };
  // 화자별 스프라이트: 박 반장은 SPRITES, 조연은 REPS[id_expr]
  function sprite(speaker, expr, talk) {
    if (!speaker || speaker === 'park') return SPRITES[expr + (talk ? '_talk' : '')] || SPRITES[expr] || SPRITES.neutral;
    const base = REPS[`${speaker}_${expr}`] || REPS[`${speaker}_neutral`];
    return (talk && (REPS[`${speaker}_${expr}_talk`] || REPS[`${speaker}_neutral_talk`])) || base;
  }
  // 센터의 담당자 id (계열 rep, 없으면 generic 'rep')
  function repOf(carrier) { const car = root.DATA.CARRIERS[carrier]; return (car && car.rep) || 'rep'; }
  function repName(id, carrier) { const k = REP_NAMES[id] || REP_NAMES.rep; return root.I18n.t(k, { center: carrier ? root.DATA.CARRIERS[carrier].name : '' }); }
  // 새 계약을 맺을 때 담당자 인사 (마켓에서 계약 구매 직후). 문구 rep.greet.<family> 없으면 generic
  function greet(g, c, switchedFrom) {
    const car = root.DATA.CARRIERS[c.carrier], fam = root.DATA.familyOf(c.carrier), id = repOf(c.carrier);
    const p = { center: car.name, cap: g.vehicleCap(c), fee: g.truckFee(c), trucks: c.maxCalls, vehicle: car.vehicle || '', from: switchedFrom ? root.DATA.CARRIERS[switchedFrom].name : '', tier: car.tier };
    const kf = `rep.greet.${fam}.${car.tier}`, kg = `rep.greet.${fam}`, T = root.I18n.t;
    const text = T(kf, p) !== kf ? T(kf, p) : T(kg, p) !== kg ? T(kg, p) : T('rep.greet.generic', p);
    const pages = [{ speaker: id, expr: 'smile', text }];
    if (switchedFrom) pages.unshift({ speaker: id, expr: 'neutral', text: T('rep.switch', p) });
    return { id: 'greet:' + c.id, pages, name: repName(id, c.carrier), calendar: false };
  }


  const attrsOf = (g, p) => p.attrs || root.DATA.PARCEL_TYPES[p.type].attrs;
  const usage = g => g.usedVolume() / g.warehouse.cap;
  const gating = ['cold', 'fragile', 'customs', 'frozen', 'produce'];
  const handleable = (g, p) => g.contracts.some(c => c && g.eligibleParcels(c).some(x => x.id === p.id));
  const bestReadySlot = g => { let best = -1, bestFill = 0; g.contracts.forEach((c, i) => { if (!c || !g.canCall(c)) return; const vol = g.eligibleParcels(c).reduce((s, p) => s + p.size, 0), fill = vol / g.vehicleCap(c); if (fill > bestFill) { bestFill = fill; best = i; } }); return { slot: best, fill: bestFill }; };
  // 고객이 붙은 택배 하나 (없으면 아무거나) — 상세 팝업으로 안내할 대상
  const namedParcel = g => g.parcels.find(p => p.customer && p.customer !== 'anon') || g.parcels[0] || null;
  const hasEvent = (ctx, types) => (ctx.events || []).some(e => types.includes(e.type));
  // 마켓 카드 id (ui.js 가 같은 키로 카드에 id 를 붙인다) — 대본 마켓이라 무엇이 나올지 알고 짚어 줄 수 있다
  const mkKey = it => it.kind + '-' + (it.carrier || it.enh || it.fac || it.item || it.customer || '');
  const mkItem = (g, f) => ((g.market && g.market.items) || []).find(it => !it.sold && f(it));
  const cardSel = (g, f) => { const it = mkItem(g, f); return it ? '#mk-card-' + mkKey(it) : null; };
  // 충전 카드가 나와 있는 계약 중 배차가 가장 적게 남은 것
  const refillSlot = g => { let best = null; (g.contracts || []).forEach((c, slot) => { if (!c || !mkItem(g, x => x.kind === 'refill' && x.contractId === c.id)) return; if (!best || c.calls < best.c.calls) best = { c, slot }; }); return best; };
  const limitItem = g => mkItem(g, it => it.kind === 'enh' && /^limit/.test(it.enh));
  const switchItem = g => mkItem(g, it => it.kind === 'contract' && it.switchFrom);
  // 프리미엄(상위 등급) 매물 — 말만 하지 말고 실제 카드를 짚는다
  const premiumItem = g => mkItem(g, it => it.kind === 'contract' && root.DATA.CARRIERS[it.carrier] && root.DATA.CARRIERS[it.carrier].tier > 0);
  // 배차가 바닥난 계약(보낼 택배는 있는데 차를 못 부르는 상태)
  const outOfCalls = g => (g.contracts || []).find(c => c && c.calls === 0 && g.eligibleParcels(c).length > 0);

  // ----- 레벨 1 전용 비트 (docs/STORY_TUTORIAL_DESIGN.md 부록 R) -----
  // 레벨 1 화면에는 계약 하나 · 고객 하나 · 맑음뿐이다. 설명할 것이 적으니 비트도 짧다 — 열두 개, 대부분 한 장.
  const BEATS_L1 = [
    // 서장 오프닝 — 세 쪽이다. 박 반장 인사 · 여 실장이 숫자를 놓고 감 · 그래서 오늘은 기다린다.
    // 설정을 늘리지 않는다. 첫날이 가르치는 건 하나뿐이다 — 배차비는 정액이라 덜 실으면 손해다.
    { id: 'l1intro', kind: 'start', when: () => true, pages: [
      { expr: 'smile' },
      { expr: 'neutral', hl: '#wait-btn', gate: true },
    ] },
    // 차는 늘 패널 위에 서 있다. 부를 만해지면 박 반장이 그 차를 가리키고,
    // 여 실장이 그 자리에서 처음 인사한다 — 그가 가리키는 차 그림이 바로 눈앞에 있다.
    // 상자는 이미 자동으로 담겨 있으니, 담긴 것을 보고 바로 호출로 간다.
    { id: 'l1call', kind: 'turn', when: g => bestReadySlot(g).fill >= 0.8 || g.turn >= 3, pages: [
      { expr: 'neutral', hl: '#call-head .load-visual' },
      { speaker: 'yeo', expr: 'smile', hl: '#call-head .load-visual' },
      { expr: 'neutral', hl: '#call-foot .btn.primary', gate: g => bestReadySlot(g).slot >= 0 },
    ] },
    { id: 'l1first', kind: 'call', when: (g, ctx) => ctx.result && ctx.result.ok, pages: [{ expr: 'laugh' }, { speaker: 'yeo', expr: 'smile' }, { expr: 'neutral' }] },
    { id: 'l1free', kind: 'turn', when: g => g.story.seen.includes('l1first'), pages: [{ expr: 'smile' }] },
    { id: 'l1summary', kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'smile' }] },
    { id: 'l1usage', kind: 'turn', when: g => usage(g) >= 0.75, pages: [{ expr: 'worry', hl: '#bar-usage' }] },
    { id: 'l1last', kind: 'turn', when: g => g.turn >= Math.max(2, g.turns() - 2), pages: [{ expr: 'smile' }, { expr: 'think' }] },
  ];

  // ----- 레벨 2 전용 비트 (1장 · 3월 후반) -----
  // 새로 여는 것은 셋뿐이다: 배차가 소모품이라는 것, 그래서 마켓이 있다는 것, 그리고 두 대.
  // 서장에서 가르친 것(쌓기·적재율·기한)은 다시 말하지 않는다.
  const capItem = g => mkItem(g, it => it.kind === 'fac' && /^expand/.test(it.fac || ''));
  const BEATS_L2 = [
    // 서장은 통째로 무기한이었다. 기한은 여기 첫날에 처음 붙는다 (문구는 서장 때 쓰던 것 그대로)
    { id: 'l1due', kind: 'turn', when: g => g.parcels.some(p => !p.noDeadline), pages: [
      { expr: 'neutral', hl: '#parcels' },
      { expr: 'neutral', hl: '#parcels' },
    ] },
    { id: 'l1deadline', kind: 'turn', when: g => g.story.seen.includes('l1due') && g.parcels.some(p => !p.overdue && !p.noDeadline && p.deadline <= 1), pages: [{ expr: 'worry', hl: '#parcels' }] },
    { id: 'l2intro', kind: 'start', when: () => true, pages: [
      { expr: 'smile' },
      { expr: 'neutral', hl: '#c0 .calls' },      // 숫자가 아니라 파란 눈금을 가리킨다
      { expr: 'think', hl: '#c0 .calls' },
    ] },
    // 배차가 줄어드는 것을 실제로 본 다음에 말한다
    { id: 'l2mission', kind: 'turn', when: g => g.story.seen.includes('l2calls'), pages: [{ expr: 'smile', hl: '#mission-meter' }, { expr: 'neutral', hl: '#chain-meter' }] },
    { id: 'l2chain', kind: 'call', when: (g, ctx) => ctx.result && ctx.result.chain >= 2, pages: [{ expr: 'shock', hl: '#chain-meter' }, { expr: 'laugh', hl: '#mission-meter' }] },
    { id: 'l2calls', kind: 'call', when: (g, ctx) => ctx.result && ctx.result.ok, pages: [{ expr: 'neutral', hl: '#c0' }] },
    // 바닥났다. 여기서 처음으로 "월초에 안 채워진다"가 나온다
    // 바닥났다 — 이번 한 번만 박 반장이 채워 준다. 원래는 마켓에서 사는 것이라는 걸 여기서 처음 말한다
    { id: 'l2callsOut', kind: 'turn', when: g => !!outOfCalls(g), act: g => { const c = outOfCalls(g); if (c) c.calls = c.maxCalls; },
      pages: [{ expr: 'worry', hl: '#c0' }, { expr: 'smile', hl: '#c0 .calls' }] },
    { id: 'l2market', kind: 'market', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'think' }] },
    // 새 계약 — 이번엔 강제로 들인다. 다음 보름 물량은 한길 혼자서는 못 나른다
    { id: 'l2pack', kind: 'market', when: g => !!mkItem(g, it => it.kind === 'contract' && it.carrier === 'pack0'), pages: [
      { expr: 'smile', hl: g => cardSel(g, it => it.kind === 'contract' && it.carrier === 'pack0') },
      { expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'contract' && it.carrier === 'pack0'), gate: true },
    ] },
    { id: 'l2refill', kind: 'market', when: g => !!refillSlot(g), pages: [
      { expr: 'neutral', hl: g => { const r = refillSlot(g); return r ? '#mk-refill-' + r.slot : null; } },
      { expr: 'neutral', hl: g => { const r = refillSlot(g); return r ? '#mk-refill-' + r.slot : null; }, gate: g => { const r = refillSlot(g); return !!r && r.c.calls === 0; } },
    ] },
    { id: 'l2limit', kind: 'market', when: g => !!limitItem(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'enh' && /^limit/.test(it.enh)) }] },
    // 두 대가 붙는 순간 — 배차도 배차비도 두 배로 나간다
    { id: 'l2two', kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel > 0 && ctx.trucks > 1, pages: [{ expr: 'smile', hl: '#call-head .load-visual' }, { expr: 'neutral', hl: '#call-head .load-visual' }] },
    // 넘쳐 본 다음에 확장을 판다
    { id: 'l2cap', kind: 'market', when: g => !!capItem(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'fac' && /^expand/.test(it.fac || '')) }] },
    { id: 'l2usage', kind: 'turn', when: g => usage(g) >= 0.9, pages: [{ expr: 'worry', hl: '#bar-usage' }] },
    { id: 'l2last', kind: 'turn', when: g => g.turn >= Math.max(2, g.turns() - 2), pages: [{ expr: 'smile' }] },
  ];

  // ----- 레벨 3 전용 비트 (2장 · 4월 전반 · 봄비) -----
  // 새로 여는 것: 날씨·예보 · 야외 적재와 젖음·도난 · 직접 배송 · 신뢰도의 정체.
  // 신뢰도는 새 규칙이 아니라 '줄곧 돌고 있던 것'의 공개다 — 두 대가 붙은 것도, 배차비가 싼 것도 그거였다.
  const wetSoon = g => g.outdoorVolume() > 0 && (g.weatherNow() === 'rain' || g.upcoming().some(u => u.weather === 'rain'));
  const BEATS_L3 = [
    // 일괄 출고는 창고가 차야 의미가 있다 — 마당이 처음 열리는 이 장에서 가르친다
    // 투자 버튼이 여기서 처음 열린다 — 캠페인은 '창고가 비면 내가 물량을 끌어온다'는 얘기다
    { id: 'l3invest', kind: 'turn', when: g => g.story.seen.includes('l3intro'), pages: [{ expr: 'smile', hl: '#invest-btn' }, { expr: 'neutral', hl: '#invest-btn' }] },
    { id: 'l3rushReady', kind: 'turn', when: g => g.rushState && g.rushState().ready, pages: [{ expr: 'shock', hl: '#rush-meter' }, { expr: 'think', hl: '#contract-strip' }] },
    { id: 'l3rushHit', kind: 'call', when: (g, ctx) => ctx.result && ctx.result.rush, pages: [{ expr: 'shock', hl: '#rush-meter' }, { expr: 'laugh', hl: '#contract-strip' }] },
    { id: 'l3intro', kind: 'start', when: () => true, pages: [
      { expr: 'neutral' },
      { expr: 'think', hl: '#upcoming' },
      { expr: 'smile', hl: '#c1' },
    ] },
    // ⚠ 가 처음 온 날 — 한길 차엔 못 싣는다. 밴으로
    { id: 'l3fragile', kind: 'turn', when: g => g.parcels.some(p => p.type === 'fragile'), pages: [
      { expr: 'neutral', hl: '#parcels' },
      { expr: 'think', hl: '#c1' },
    ] },
    // 예보 줄 — 며칠 뒤 비가 온다는 걸 미리 읽는 법
    { id: 'l3forecast', kind: 'turn', when: g => g.upcoming().some(u => u.weather === 'rain'), pages: [{ expr: 'neutral', hl: '#upcoming' }] },
    // 창고가 넘쳐 마당으로 나갔다
    { id: 'l3yard', kind: 'turn', when: g => g.outdoorVolume() > 0, pages: [
      { expr: 'worry', hl: '#bar-usage' },
      { expr: 'neutral', hl: '#parcels' },
    ] },
    // 마당에 나가 있는데 비가 온다
    { id: 'l3rain', kind: 'turn', when: wetSoon, pages: [
      { speaker: 'noh', expr: 'neutral', hl: '#upcoming .chip.wx' },
      { expr: 'neutral', hl: '#wm-reorder', gate: true },
    ] },
    // 대기 팝업에서 안팎을 바꾼다
    { id: 'l3reorder', kind: 'turn', when: g => g.outdoorVolume() > 0, pages: [{ expr: 'neutral', hl: '#wm-reorder' }] },
    // 도난 — 마당은 문이 없다
    { id: 'l3theft', kind: 'any', when: (g, ctx) => hasEvent(ctx, ['stolen']), pages: [{ expr: 'shock' }, { expr: 'neutral' }] },
    // 신뢰도 — 새로 생긴 게 아니라 줄곧 쌓이고 있던 것
    { id: 'l3trust', kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel >= 0, pages: [
      { expr: 'smile', hl: '#call-head .trustline' },
      { expr: 'neutral', hl: '#call-head .trustline' },
      { expr: 'think', hl: '#call-head .trustline' },
    ] },
    { id: 'l3switch', kind: 'market', when: g => !!switchItem(g), pages: [
      { expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'contract' && it.switchFrom) },
      { expr: 'worry' },
    ] },
    { id: 'l3yardBuy', kind: 'market', when: g => !!mkItem(g, it => it.kind === 'fac' && it.fac === 'yard'), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'fac' && it.fac === 'yard') }] },
    { id: 'l3last', kind: 'turn', when: g => g.turn >= Math.max(2, g.turns() - 2), pages: [{ expr: 'smile' }] },
  ];

  // ----- 레벨 4 전용 비트 (3장 · 4월 후반 · 이사철) -----
  // 다섯 달 내내 일반 택배만 왔다. 여기서 품목 문이 처음 열린다 — ❄ 찬 것, ⚠ 깨지는 것, 🌾 상하는 것.
  // ❄ 는 둘 곳과 보낼 곳이 둘 다 있어야 한다. 그래서 오기 전에 마켓이 먼저 온다.
  const coldItem = g => mkItem(g, it => it.kind === 'fac' && /^cold/.test(it.fac || ''));
  const coldContract = g => mkItem(g, it => it.kind === 'contract' && root.DATA.familyOf(it.carrier) === 'cold');
  const firstOf = (g, t) => g.parcels.find(p => p.type === t);
  const BEATS_L4 = [
    { id: 'l4intro', kind: 'start', when: () => true, pages: [
      { expr: 'neutral' },
      { expr: 'smile', hl: '#parcels' },
    ] },
    // 이름 있는 화주 — 지금까지는 전부 개인 고객이었다
    { id: 'l4cust', kind: 'turn', when: g => g.parcels.some(p => p.customer && p.customer !== 'anon'), pages: [
      { expr: 'neutral', hl: '#parcels' },
      { expr: 'think', hl: '#cust-btn' },
    ] },
    // 마켓이 먼저 온다: 다음 사이클에 ❄ 가 오는데 받을 데가 없다
    { id: 'l4warn', kind: 'market', when: g => g.forecastBlocked().length > 0 || !!coldContract(g), pages: [{ expr: 'worry', hl: '#mk-fcwarn' }, { expr: 'neutral' }] },
    { id: 'l4coldCar', kind: 'market', when: g => !!coldContract(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'contract' && root.DATA.familyOf(it.carrier) === 'cold') }] },
    { id: 'l4coldFac', kind: 'market', when: g => !!coldItem(g), pages: [
      { expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'fac' && /^cold/.test(it.fac || '')) },
      { expr: 'worry' },
    ] },
    // ❄ 가 실제로 들어온 날
    { id: 'l4cold', kind: 'turn', when: g => !!firstOf(g, 'fresh'), pages: [
      { expr: 'neutral', hl: '#parcels' },
      { expr: 'worry', hl: '#bar-cold' },
    ] },
    { id: 'l4coldFull', kind: 'turn', when: g => g.warehouse.cold > 0 && g.coldUsed && g.coldUsed() >= g.warehouse.cold, pages: [{ expr: 'worry', hl: '#bar-cold' }] },
    // 직접 배송 — '우리 차' 카드. 계약 차가 모자랄 때 내가 하나씩 나른다 (2장에서는 계약 하나 더가 답이었다)
    { id: 'l3self', kind: 'turn', when: g => g.selfEligible().length > 0 && (!!outOfCalls(g) || g.turn >= 3), pages: [
      { expr: 'think', hl: '#cself' },
      { expr: 'neutral', hl: '#cself', gate: true },
    ] },
    { id: 'l3selfPick', kind: 'modal', modal: 'wait', when: (g, ctx) => !!ctx.self, pages: [{ expr: 'neutral', hl: '#wait-btn', gate: true }] },
    { id: 'l4risk', kind: 'modal', modal: 'call', when: (g, ctx) => (ctx.risk || 0) > 0, pages: [{ expr: 'worry', hl: '#call-head .riskline' }] },
    // 🌾 상하는 것
    { id: 'l4produce', kind: 'turn', when: g => !!firstOf(g, 'produce'), pages: [{ expr: 'neutral', hl: '#parcels' }] },
    { id: 'l4break', kind: 'any', when: (g, ctx) => hasEvent(ctx, ['broken']), pages: [{ expr: 'shock' }, { expr: 'neutral' }] },
    { id: 'l4custUp', kind: 'any', when: (g, ctx) => hasEvent(ctx, ['custLevel']), pages: [{ expr: 'laugh' }, { expr: 'smile' }] },
    { id: 'l4last', kind: 'turn', when: g => g.turn >= Math.max(2, g.turns() - 2), pages: [{ expr: 'smile' }] },
  ];

  // ----- 레벨 5 전용 비트 (4장 · 5월 전반 · 가정의 달) -----
  // 여기서 처음으로 **끝날 수 있는 판**이 된다. 평판은 지금까지 쌓기만 하던 것들의 총합이고,
  // 0이 되면 아무도 안 맡긴다. 같이 열리는 것: 사고와 보험 · 보관 계약 · 4칸 대형.
  const bigItem = g => mkItem(g, it => it.kind === 'contract' && ['large', 'rail', 'sea'].includes(root.DATA.familyOf(it.carrier)));
  const insItem = g => mkItem(g, it => it.kind === 'item');
  const BEATS_L5 = [
    { id: 'l5intro', kind: 'start', when: () => true, pages: [
      { expr: 'neutral' },
      { expr: 'think', hl: '#hud-right' },
    ] },
    // 평판 — 지금까지 보이지 않게 움직이던 것
    { id: 'l5rep', kind: 'turn', when: () => true, pages: [
      { expr: 'neutral', hl: '#hud-right' },
      { expr: 'worry', hl: '#hud-right' },
      { expr: 'neutral', hl: '#hud-right' },
    ] },
    { id: 'l5repDrop', kind: 'any', when: g => g.repDropped, pages: [{ expr: 'worry', hl: '#hud-right' }] },
    { id: 'l5repUp', kind: 'summary', when: g => !!(g.summary && g.summary.repTierUp), pages: [{ expr: 'laugh' }, { expr: 'smile' }] },
    // 4칸 대형 — 오기 전에 마켓이 먼저
    { id: 'l5bigWarn', kind: 'market', when: g => g.forecastBlocked().length > 0 || !!bigItem(g), pages: [{ expr: 'worry', hl: '#mk-fcwarn' }] },
    { id: 'l5bigCar', kind: 'market', when: g => !!bigItem(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'contract' && ['large', 'rail', 'sea'].includes(root.DATA.familyOf(it.carrier))) }] },
    { id: 'l5big', kind: 'turn', when: g => g.parcels.some(p => p.size >= 4), pages: [{ expr: 'neutral', hl: '#parcels' }] },
    // 보험
    { id: 'l5ins', kind: 'market', when: g => !!insItem(g), pages: [
      { expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'item') },
      { expr: 'think' },
    ] },
    { id: 'l5claim', kind: 'any', when: (g, ctx) => hasEvent(ctx, ['broken', 'stolen']), pages: [{ expr: 'shock' }, { expr: 'neutral' }] },
    // 보관 계약 — 자리를 파는 것
    { id: 'l5offer', kind: 'turn', when: g => !!g.offer, pages: [
      { expr: 'neutral', hl: '#offer' },
      { expr: 'think', hl: '#offer' },
    ] },
    // 쇼핑 행사 폭주
    { id: 'l5rush', kind: 'turn', when: g => g.isRushTurn && g.isRushTurn(), pages: [{ expr: 'worry', hl: '#upcoming' }] },
    // 이 장의 진짜 교훈 — 자리가 다 찼을 때는 계약이 아니라 특약이다
    { id: 'l5full', kind: 'market', when: g => g.contracts.filter(Boolean).length >= root.DATA.CONTRACT_SLOTS && !!optItem(g), pages: [
      { expr: 'think', hl: '#mk-mine' },
      { expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'enh' && (root.DATA.ENHANCEMENTS[it.enh] || {}).kind === 'opt') },
      { expr: 'smile', hl: g => cardSel(g, it => it.kind === 'enh' && (root.DATA.ENHANCEMENTS[it.enh] || {}).kind === 'opt') },
    ] },
    { id: 'l5last', kind: 'turn', when: g => g.turn >= Math.max(2, g.turns() - 2), pages: [{ expr: 'smile' }, { expr: 'think' }] },
  ];

  // ----- 레벨 6 전용 비트 (5장 · 5월 후반 · 마지막 봄) -----
  // 마지막 장. 새로 여는 것은 ❆ 냉동과 일요일 선택뿐이고, 나머지는 한 해를 마무리하는 이야기다.
  const frozenCar = g => mkItem(g, it => it.kind === 'contract' && root.DATA.familyOf(it.carrier) === 'frozen');
  const optItem = g => mkItem(g, it => it.kind === 'enh' && (root.DATA.ENHANCEMENTS[it.enh] || {}).kind === 'opt');
  const freezerFac = g => mkItem(g, it => it.kind === 'fac' && /^freezer/.test(it.fac || ''));
  const offSoon = g => [1, 2, 3].some(d => g.isOffTurn(g.turn + d));
  const BEATS_L6 = [
    { id: 'l6intro', kind: 'start', when: () => true, pages: [
      { expr: 'neutral' },
      { expr: 'smile' },
    ] },
    // 일요일 선택 — 여태 그냥 쉬던 날에 고를 것이 생긴다
    { id: 'l6weekend', kind: 'weekend', when: () => true, pages: [
      { expr: 'neutral' },
      { expr: 'neutral', hl: '.wkopts .wkc', gate: true },
    ] },
    // ❆ 냉동 — 오기 전에 마켓이 먼저. 그런데 이번엔 계약 자리가 없다
    { id: 'l6frozenWarn', kind: 'market', when: g => g.forecastBlocked().length > 0 || !!optItem(g), pages: [{ expr: 'worry', hl: '#mk-fcwarn' }] },
    { id: 'l6frozenCar', kind: 'market', when: g => !!frozenCar(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'contract' && root.DATA.familyOf(it.carrier) === 'frozen') }] },
    { id: 'l6freezer', kind: 'market', when: g => !!freezerFac(g), pages: [
      { expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'fac' && /^freezer/.test(it.fac || '')) },
      { expr: 'worry' },
    ] },
    { id: 'l6frozen', kind: 'turn', when: g => g.parcels.some(p => p.type === 'frozen'), pages: [
      { expr: 'neutral', hl: '#parcels' },
      { expr: 'worry', hl: '#bar-cold' },
    ] },
    // 설 — 폭주가 먼저 오고 연휴에 차가 안 온다
    { id: 'l6holiday', kind: 'turn', when: offSoon, pages: [
      { expr: 'worry', hl: '#upcoming' },
      { expr: 'neutral', hl: '#upcoming' },
    ] },
    { id: 'l6off', kind: 'turn', when: g => g.isOffTurn(), pages: [{ expr: 'neutral', hl: '#actions' }] },
    { id: 'l6stuck', kind: 'turn', when: g => g.unhandled().length > 0, pages: [
      { expr: 'worry', hl: '#parcels' },
      { expr: 'neutral', hl: '#parcels' },
    ] },
    { id: 'l6last', kind: 'turn', when: g => g.turn >= Math.max(2, g.turns() - 2), pages: [
      { expr: 'smile' },
      { expr: 'think' },
      { expr: 'smile' },
    ] },
  ];

  const LEVEL_BEATS = { 1: BEATS_L1, 2: BEATS_L2, 3: BEATS_L3, 4: BEATS_L4, 5: BEATS_L5, 6: BEATS_L6 };

  const BEATS = [
    // ----- 3월 (1개월차): 창고 -----
    { id: 'intro', months: [1], kind: 'start', when: () => true, pages: [{ expr: 'smile' }, { expr: 'neutral', hl: '#parcels' }, { expr: 'neutral', hl: '#wait-btn', gate: true }] },
    // 첫 대기 팝업(1개월차): intro 가 '대기'를 누르랬으니, 낯선 팝업에서 어디를 눌러야 하는지까지 짚어 준다. 이 한 번만.
    { id: 'waitFirst', months: [1], kind: 'modal', modal: 'wait', when: g => g.story.seen.includes('intro'), pages: [{ expr: 'neutral', hl: '#wait-btn', gate: true }] },
    { id: 'usage', months: [1], kind: 'turn', when: g => g.turn >= 2, pages: [{ expr: 'neutral', hl: '#bar-usage' }] },
    { id: 'callReady', months: [1], kind: 'turn', when: g => g.turn >= 3 || bestReadySlot(g).fill >= 0.8, pages: [{ expr: 'neutral', hl: g => { const b = bestReadySlot(g); return b.slot >= 0 ? '#c' + b.slot : '#actions'; } }, { expr: 'neutral', hl: g => { const b = bestReadySlot(g); return b.slot >= 0 ? '#c' + b.slot : '#actions'; }, gate: g => bestReadySlot(g).slot >= 0 }] },
    // 호출 팝업 안: 자동 선택 버튼 → 호출 버튼. 팝업이 다시 그려질 때마다 ctx.sel(선택 수)로 확인한다
    { id: 'callModal', months: [1, 2], kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel === 0 && ctx.elig > 0, pages: [{ expr: 'neutral', hl: '#call-head .load-visual' }, { expr: 'neutral', hl: '#call-head .load-visual' }, { expr: 'neutral', hl: '#pick-urgent', gate: true }] },
    // 차가 두 대 붙는 첫 순간. 자동으로 붙는 거라 설명이 없으면 배차가 왜 2대 줄었는지 모른다 (대본 1개월차 8턴에 정확히 12칸이 온다)
    { id: 'trucks2', needs: 'simul', months: [1, 2, 3], kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel > 0 && ctx.trucks > 1, pages: [{ expr: 'neutral', hl: '#call-head .load-visual' }, { expr: 'smile', hl: '#call-head .load-visual' }] },
    { id: 'callGo', months: [1, 2], kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel > 0, pages: [{ expr: 'smile', hl: '#parcels' }, { expr: 'neutral', hl: '#call-foot .btn.primary', gate: true }] },
    { id: 'rushHit', kind: 'call', when: (g, ctx) => ctx.result && ctx.result.rush, pages: [{ expr: 'shock', hl: '#rush-meter' }, { expr: 'laugh', hl: '#contract-strip' }] },
    { id: 'firstCall', months: [1, 2], kind: 'call', when: (g, ctx) => ctx.result && ctx.result.ok, pages: [{ expr: 'laugh' }, { speaker: g => repOf(g.contracts.find(c => c && c.totalCalls > 0) ? g.contracts.find(c => c && c.totalCalls > 0).carrier : 'bulk0'), expr: 'smile', k: () => 'story.firstCall.rep' }, { expr: 'neutral', k: () => 'story.firstCall.2' }] },
    { id: 'chainHit', kind: 'call', when: (g, ctx) => ctx.result && ctx.result.chain >= 2, pages: [{ expr: 'shock', hl: '#chain-meter' }, { expr: 'laugh', hl: '#mission-meter' }] },
    { id: 'progressHud', kind: 'turn', when: g => g.story.seen.includes('firstCall'), pages: [{ expr: 'smile', hl: '#mission-meter' }, { expr: 'neutral', hl: '#chain-meter' }] },
    // 안내가 끝났다는 걸 말로 못 박아 준다. 이게 없으면 언제까지 시키는 대로 해야 하는지 알 수 없다.
    { id: 'handOff', months: [1], kind: 'turn', when: g => g.story.seen.includes('firstCall'), pages: [{ expr: 'smile' }] },
    // 배차 소진: 이 게임에서 제일 많이 막히는 지점 — 배차는 월초에 안 채워진다
    { id: 'callsOut', needs: 'calls', months: [1, 2, 3], kind: 'turn', when: g => !!outOfCalls(g), pages: [{ expr: 'worry', hl: '#actions' }, { expr: 'neutral' }] },
    { id: 'deadline1', months: [1, 2, 3], kind: 'turn', when: g => g.parcels.some(p => !p.overdue && p.deadline <= 1 && !(p.customs > 0)), pages: [{ expr: 'worry', hl: '#parcels' }] },
    { id: 'rushReady', kind: 'turn', when: g => g.rushState && g.rushState().ready, pages: [{ expr: 'shock', hl: '#rush-meter' }, { expr: 'think', hl: '#contract-strip' }] },
    { id: 'usage76', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.76, pages: [{ expr: 'worry', hl: '#bar-usage' }, { expr: 'neutral', hl: '#upcoming' }] },
    { id: 'usage91', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.91, pages: [{ expr: 'shock', hl: '#bar-usage' }] },
    // 첫 일요일: 왜 차를 못 부르는지, 마당을 왜 비워야 하는지. 마지막 페이지에서 직접 고르게 한다
    { id: 'weekend', months: [1, 2], kind: 'weekend', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'neutral', hl: '.wkopts .wkc', gate: true }] },
    // 마당에 물건이 나가 있는 채로 맞는 일요일 — 알바를 쓸지 결정하는 자리
    { id: 'weekendYard', months: [1, 2, 3], kind: 'weekend', when: g => g.outdoorVolume() > 0, pages: [{ expr: 'worry', hl: '.wkopts .wkc:nth-child(3)' }] },
    // 평판: 처음 깎였을 때 한 번. 이 게임이 왜 끝나는지를 말해 주는 자리다
    // '방금 깎였지'는 진짜 깎였을 때만. 등급이 올라 상한이 늘어난 것뿐인데 깎였다고 하면 안 된다
    { id: 'rep', needs: 'rep', months: [1, 2, 3], kind: 'turn', when: g => g.repDropped || g.rep < g.repCap(), pages: [{ expr: g => g.repDropped ? 'worry' : 'neutral', hl: '#hud-right', k: g => g.repDropped ? 'story.rep.1drop' : 'story.rep.1' }, { expr: 'neutral', hl: '#hud-right' }] },
    // 등급이 처음 오른 정산 — 평판을 키우면 뭐가 열리는지 여기서 말한다
    { id: 'repUp', needs: 'rep', months: [1, 2, 3], kind: 'summary', when: g => !!(g.summary && g.summary.repTierUp), pages: [{ expr: 'laugh' }, { expr: 'smile' }] },
    { id: 'summary1', months: [1], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'smile' }] },
    { id: 'market1', needs: 'market', months: [1], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'think' }] },
    // 예상 물량: 접혀 있는 줄을 '눌러서 펼치게' 한 다음, 펼쳐진 내용을 보면서 설명한다
    { id: 'marketFc', needs: 'market', months: [1], kind: 'market', when: (g, ctx) => !ctx.fcOpen, pages: [{ expr: 'neutral', hl: '#mk-fctoggle', gate: true }] },
    { id: 'marketFcOpen', needs: 'market', months: [1], kind: 'market', when: (g, ctx) => !!ctx.fcOpen, pages: [{ expr: 'neutral', hl: '#mk-fc' }] },
    // 다음 사이클에 못 싣는 게 온다 — 마켓이 마지막 기회다. 어느 달이든
    { id: 'marketBlocked', needs: 'market', kind: 'market', when: g => g.forecastBlocked().length > 0, pages: [{ expr: 'worry', hl: '#mk-fcwarn' }] },
    { id: 'market1b', needs: 'market', months: [1], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }] },
    // ----- 4월 (2개월차): 고객과 돈 -----
    // 고객 설명은 말로 하면 안 들어온다. 택배를 직접 누르게 하고 상세 팝업에서 짚는다.
    { id: 'm2', months: [2], kind: 'turn', when: g => g.turn === 1, pages: [{ expr: 'smile' }, { expr: 'neutral', hl: g => { const p = namedParcel(g); return p ? `#parcels .parcel[data-id="${p.id}"]` : '#parcels'; }, gate: g => !!namedParcel(g) }] },
    { id: 'm2Detail', months: [2, 3], kind: 'modal', modal: 'parcel', when: g => g.story.seen.includes('m2'), pages: [{ expr: 'neutral' }, { expr: 'neutral' }] },
    { id: 'special', kind: 'turn', when: g => g.parcels.some(p => attrsOf(g, p).some(a => gating.includes(a))), pages: [{ expr: 'neutral', hl: '#parcels', k: g => { const p = g.parcels.find(x => attrsOf(g, x).some(a => gating.includes(a))); const a = attrsOf(g, p).find(x => gating.includes(x)); return 'story.special.' + a; } }] },
    // 어떤 계약으로도 못 싣고 직접 배송도 안 되는 택배 — 반송 말고는 길이 없다. 마켓이 답이라는 걸 말해 준다
    { id: 'cantHandle', kind: 'turn', when: g => g.unhandled().some(p => !(p.customs > 0)), pages: [{ expr: 'shock', hl: '#parcels' }, { expr: 'neutral' }] },
    // 크기가 커서 못 싣는 경우 — 대형은 직접 배송도 안 된다
    { id: 'bigParcel', kind: 'turn', when: g => g.parcels.some(p => p.size >= 4) && !g.contracts.some(c => c && g.contractSizeMax(c) >= 4), pages: [{ expr: 'worry', hl: '#parcels' }] },
    { id: 'noContract', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => !(p.customs > 0) && attrsOf(g, p).some(a => gating.includes(a)) && !handleable(g, p)), pages: [{ expr: 'worry' }, { expr: 'neutral', hl: '#wait-btn', gate: true }] },
    // 대기 팝업 안 (noContract 다음): 직접 배송할 택배 하나 → 대기 버튼
    { id: 'waitSelf', months: [2, 3], kind: 'modal', modal: 'wait', when: (g, ctx) => g.story.seen.includes('noContract') && ctx.picked === 0 && ctx.elig > 0, pages: [{ expr: 'neutral', hl: '#parcels .ptile:not(.dis)', gate: true }] },
    { id: 'waitGo', months: [2, 3], kind: 'modal', modal: 'wait', when: (g, ctx) => g.story.seen.includes('waitSelf') && ctx.picked > 0, pages: [{ expr: 'neutral', hl: '#wait-btn', gate: true }] },
    { id: 'offer', needs: 'storage', months: [2, 3], kind: 'turn', when: g => !!g.offer, pages: [{ expr: 'neutral', hl: '#offer' }, { expr: 'think' }] },
    { id: 'cash', months: [2, 3], kind: 'turn', when: g => g.projectedCash().total < 0 || g.debt > 0, pages: [{ expr: 'think', hl: '#hud-left' }, { expr: 'worry' }] },
    { id: 'summary2', months: [2], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }] },
    { id: 'market2', needs: 'market', months: [2], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }] },
    // ----- 마켓: 배차를 늘리는 세 가지 (충전 · 한도 강화 · 상위 센터) -----
    { id: 'marketRefill', needs: 'market', months: [1, 2, 3], kind: 'market', when: g => !!refillSlot(g), pages: [{ expr: 'neutral', hl: g => { const r = refillSlot(g); return r ? '#mk-refill-' + r.slot : null; } }, { expr: 'neutral', hl: g => { const r = refillSlot(g); return r ? '#mk-refill-' + r.slot : null; }, gate: g => { const r = refillSlot(g); return !!r && r.c.calls === 0; } }] },
    // 프리미엄: 실제 매물 카드를 짚고, 계열 표준 대비 무엇이 달라지는지 읽힌다
    { id: 'marketPremium', needs: 'market', kind: 'market', when: g => !!premiumItem(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'contract' && root.DATA.CARRIERS[it.carrier] && root.DATA.CARRIERS[it.carrier].tier > 0) }] },
    { id: 'marketLimit', needs: 'market', months: [1, 2, 3], kind: 'market', when: g => !!limitItem(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'enh' && /^limit/.test(it.enh)) }] },
    { id: 'marketSwitch', needs: 'market', months: [2, 3], kind: 'market', when: g => !!switchItem(g), pages: [{ expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'contract' && it.switchFrom) }, { expr: 'think' }] },
    // ----- 5월 (3개월차): 손실, 승리, 작별 -----
    { id: 'm3', months: [3], kind: 'turn', when: g => g.turn === 1, pages: [{ expr: 'smile' }, { expr: 'neutral' }] },
    { id: 'fragileRisk', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => attrsOf(g, p).includes('fragile')) && !g.contracts.some(c => c && g.contractCaps(c).includes('fragile')), pages: [{ expr: 'neutral', hl: '#parcels' }] },
    { id: 'loss', months: [1, 2, 3], kind: 'any', when: (g, ctx) => hasEvent(ctx, ['discard', 'returned', 'stolen', 'broken', 'claim']), pages: [{ expr: 'shock' }, { speaker: 'kang', expr: 'neutral', k: () => 'story.loss.rep' }, { expr: 'neutral', k: () => 'story.loss.2' }] },
    // 비 + 마당에 나가 있는 택배가 있을 때만 (창고가 안 찼으면 나오지 않는다). 대기 팝업의 적재 정리까지 안내
    { id: 'rain', needs: 'weather', months: [1, 2, 3], kind: 'turn', when: g => g.outdoorVolume() > 0 && (g.weatherNow() === 'rain' || g.upcoming().some(u => u.weather === 'rain')), pages: [{ speaker: 'noh', expr: 'neutral', hl: '#upcoming .chip.wx' }, { expr: 'neutral', hl: '#upcoming .chip.wx', gate: g => !g.story.seen.includes('weatherDetail') }] },
    // 날씨도 지나가는 대사 대신 직접 눌러 확인하게 한다 (호기심에 먼저 눌러도 나온다)
    { id: 'weatherDetail', needs: 'weather', months: [1, 2, 3], kind: 'modal', modal: 'weather', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'neutral' }] },
    { id: 'rainReorder', months: [1, 2, 3], kind: 'turn', when: g => g.story.seen.includes('rain') && g.outdoorVolume() > 0, pages: [{ expr: 'neutral', hl: '#wm-reorder', gate: true }] },
    { id: 'win', months: [3], kind: 'turn', when: g => g.turn >= 5, pages: [{ expr: 'neutral' }, { expr: 'smile' }, { expr: 'think' }] },
    { id: 'summary3', months: [3], kind: 'summary', when: () => true, pages: [{ expr: g => (g.summary && g.summary.cash > 0 ? 'laugh' : 'worry'), k: g => 'story.summary3.' + (g.summary && g.summary.cash > 0 ? 'good' : 'bad') }] },
    { id: 'farewell', months: [3, 4], kind: 'summary', when: g => g.monthIndex() >= 3 && g.half() === 2, calendar: true, pages: [{ expr: 'smile' }, { expr: 'neutral' }, { expr: 'laugh' }] },
  ];

  // 마켓 비트 자리표시자 — 대본 마켓이라 가격까지 말해 줄 수 있다
  function refillParams(g) { const r = refillSlot(g); if (!r) return { refillName: '', refillPrice: 0, refillMax: 0, refillLeft: 0 }; const it = mkItem(g, x => x.kind === 'refill' && x.contractId === r.c.id); return { refillName: g.contractName(r.c), refillPrice: it ? it.price : 0, refillMax: r.c.maxCalls, refillLeft: r.c.calls }; }
  function limitParams(g) { const it = limitItem(g); if (!it) return { limitName: '', limitPrice: 0, limitN: 0 }; return { limitName: it.name, limitPrice: it.price, limitN: root.DATA.ENHANCEMENTS[it.enh].value }; }
  // 프리미엄 매물: 계열 표준 대비 무엇이 달라지는가 (카드의 '계열 표준 대비' 줄과 같은 값)
  function premiumParams(g) {
    const it = premiumItem(g); if (!it) return { premName: '', premPrice: 0, premCap0: 0, premCap1: 0, premTrucks0: 0, premTrucks1: 0 };
    const car = root.DATA.CARRIERS[it.carrier], base = root.DATA.FAMILIES[car.family];
    return { premName: it.name, premPrice: g.contractPrice(it), premCap0: base.cap, premCap1: car.cap, premTrucks0: base.trucks, premTrucks1: car.trucks };
  }
  function switchParams(g) {
    const it = switchItem(g); if (!it) return { switchName: '', switchPrice: 0, switchFrom: '', switchTrucks: 0, switchCap: 0 };
    const from = g.contracts.find(c => c && c.id === it.switchFrom), car = root.DATA.CARRIERS[it.carrier];
    return { switchName: it.name, switchPrice: g.contractPrice(it), switchFrom: from ? g.contractName(from) : '', switchTrucks: car.trucks, switchCap: car.cap, switchLeft: from ? from.calls : 0 };
  }
  // 문구 자리표시자
  function params(g, ctx) {
    const bulk = g.contracts.find(c => c && (root.DATA.CARRIERS[c.carrier].onlyPlain)) || g.contracts.find(Boolean);
    const cap = bulk ? g.vehicleCap(bulk) : 6, fee = bulk ? g.truckFee(bulk) : 35;
    const b = bestReadySlot(g); const c = b.slot >= 0 ? g.contracts[b.slot] : bulk;
    const oc = ctx && ctx.slot != null ? g.contracts[ctx.slot] : null;   // 지금 열려 있는 호출 팝업의 계약
    // 지금 이 순간 차를 부르면 실제로 얼마인가 — 말 대신 숫자로 보여 주기 위한 값들
    const nowC = c || bulk;
    const nowCap = nowC ? g.vehicleCap(nowC) : cap, nowFee = nowC ? g.truckFee(nowC) : fee;
    let nowVol = 0, nowRev = 0, nowCount = 0;
    if (nowC) for (const p of g.eligibleParcels(nowC).slice().sort((x, y) => x.deadline - y.deadline)) { if (nowVol + p.size > nowCap) continue; nowVol += p.size; nowRev += p.reward; nowCount++; }
    return { nowCap, nowFee, nowVol, nowRev, nowCount, nowNet: nowRev - nowFee, nowLoss: Math.max(0, nowFee - nowRev),
      name: bulk ? g.contractName(bulk) : '', cap, fee, per: Math.round(fee / Math.max(1, cap)), ready: c ? g.contractName(c) : '', readyCap: c ? g.vehicleCap(c) : cap,
      readyVol: c ? g.eligibleParcels(c).reduce((s2, p) => s2 + p.size, 0) : 0, readyFee: c ? g.truckFee(c) : fee,
      openName: oc ? g.contractName(oc) : '', openCap: oc ? g.vehicleCap(oc) : cap, openFee: oc ? g.truckFee(oc) : fee,
      openVol: oc ? g.eligibleParcels(oc).reduce((s2, p) => s2 + p.size, 0) : 0, openSimul: oc ? g.simulMax(oc) : 1, openCalls: oc ? oc.calls : 0,
      cash: g.cash, repTier: g.repTierName(), rep: g.rep, repCap: g.repCap(), projected: g.projectedCash().total, outdoor: g.outdoorVolume(), rent: g.opCostBreakdown(g.month).rent, months: g.rules.months, cal: g.calMonth(), startCal: g.calMonth(1), lastCal: g.calMonth(g.rules.months),
      runCycles: g.rules.months, runMonths: g.runMonths(),
      lastLabel: root.I18n.t(g.yearOf(g.rules.months) === g.yearOf(1) ? 'fmt.lastSameYear' : 'fmt.lastNextYear', { n: g.calMonth(g.rules.months) }),
      delivered: g.run.delivered, returned: g.stats.returned + g.stats.stolen + g.stats.broken, full: g.stats.fullTrucks, fee2: fee, interest: Math.round(root.DATA.LOAN.interest * 100),
      trucks: (ctx && ctx.trucks) || 1, vol: (ctx && ctx.vol) || 0, callFee: oc ? g.callFee(oc, (ctx && ctx.trucks) || 1) : fee,
      ...refillParams(g), ...limitParams(g), ...switchParams(g), ...premiumParams(g),
      fcBlocked: g.forecastBlocked().map(t => root.DATA.PARCEL_TYPES[t].short).join(' · '), outName: (outOfCalls(g) && g.contractName(outOfCalls(g))) || '' };
  }

  // 지금 보여줄 비트. ctx = { kind, events?, result? }. 되돌리지 않는다: 반환한 비트는 seen 에 기록된다
  function check(g, ctx) {
    if (!g || !g.story || g.story.off) return null;
    const kind = ctx.kind || 'turn';
    const list = (g.level && LEVEL_BEATS[g.level.n]) || BEATS;
    for (const b of list) {
      if (b.needs && !g.shows(b.needs)) continue;   // 아직 안 열린 기능을 말하지 않는다 (levels.js)
      if (g.story.seen.includes(b.id)) continue;
      if (b.months && !b.months.includes(g.monthIndex())) continue;   // 비트의 months 는 개월차(사이클 2개)
      if (b.kind === 'turn' ? !['turn', 'call'].includes(kind) : b.kind !== 'any' && b.kind !== kind) continue;
      if (b.kind === 'any' && !['turn', 'call'].includes(kind)) continue;
      if (b.kind === 'modal' && b.modal !== ctx.modal) continue;
      if ((b.kind === 'turn' || b.kind === 'any') && g.phase !== 'play') continue;
      let ok = false; try { ok = !!b.when(g, ctx); } catch (e) { ok = false; }
      if (!ok) continue;
      g.story.seen.push(b.id);
      return build(b, g, ctx);
    }
    return null;
  }
  function build(b, g, ctx) {
    const p = params(g, ctx);
    const pages = b.pages.map((pg, i) => {
      const key = pg.k ? pg.k(g) : `story.${b.id}.${i + 1}`;
      const speaker = typeof pg.speaker === 'function' ? pg.speaker(g) : pg.speaker || 'park';
      return { speaker, name: pg.nameKey ? root.I18n.t(pg.nameKey) : speaker === 'park' ? root.I18n.t(CHARACTER.nameKey) : repName(speaker), expr: typeof pg.expr === 'function' ? pg.expr(g) : pg.expr, hl: typeof pg.hl === 'function' ? pg.hl(g) : pg.hl || null, gate: typeof pg.gate === 'function' ? !!pg.gate(g) : !!pg.gate, text: root.I18n.t(key, p) };
    });
    if (!g.story.notes) g.story.notes = [];
    g.story.notes.push({ id: b.id, month: g.month, turn: g.turn, text: pages.map(x => x.text) });
    // act: 비트가 판을 직접 바꾸는 자리(튜토리얼 한 번짜리 배차 충전 같은 것) — 화면은 ui 가 다시 그린다
    let acted = false; if (b.act) { try { b.act(g); acted = true; } catch (e) { /* 판을 못 바꿔도 대사는 나간다 */ } }
    return { id: b.id, pages, calendar: !!b.calendar, acted, name: root.I18n.t(CHARACTER.nameKey) };
  }
  // 6월 이후 월초 문자: 그 달력 달의 한 줄 예고. 스토리 모드가 아니어도 옵션이 켜져 있으면 나온다
  function sms(g) {
    if (!g || g.turn !== 1 || g.half() !== 1) return null;   // 달에 한 번, 전반 사이클 첫날
    const key = `cal.${g.rules.calendar || 'kr'}.${g.calMonth()}.sms`;
    const s = root.I18n.t(key); if (!s || s === key) return null;
    return s;
  }
  function done(g) { return !!(g && g.story && g.story.seen.includes('farewell')); }
  function active(g) { return !!(g && g.story && !g.story.off && !done(g)); }

  const Story = { BEATS, BEATS_L1, SPRITES, REPS, CHARACTER, check, sms, done, active, sprite, repOf, repName, greet, bestSlot: bestReadySlot, mkKey, params };
  if (typeof module !== 'undefined') module.exports = Story; else root.Story = Story;
})(typeof window !== 'undefined' ? window : globalThis);
