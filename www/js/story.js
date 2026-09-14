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

  // 조연(운송센터 담당자): 여 실장(대량) · 노 기사(대형·철도) · 강 소장(냉장·냉동) · 이름 없는 담당자(그 외). neutral / neutral_talk / smile
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
  };
  const CHARACTER = { id: 'park', nameKey: 'story.name' };
  const REP_NAMES = { yeo: 'story.name.yeo', noh: 'story.name.noh', kang: 'story.name.kang', rep: 'story.name.rep' };
  // 화자별 스프라이트: 박 반장은 SPRITES, 조연은 REPS[id_expr]
  function sprite(speaker, expr, talk) {
    if (!speaker || speaker === 'park') return SPRITES[expr + (talk ? '_talk' : '')] || SPRITES[expr] || SPRITES.neutral;
    const base = REPS[`${speaker}_${expr}`] || REPS[`${speaker}_neutral`];
    return (talk && REPS[`${speaker}_neutral_talk`]) || base;
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

  const BEATS = [
    // ----- 3월 (1개월차): 창고 -----
    { id: 'intro', months: [1], kind: 'start', when: () => true, pages: [{ expr: 'smile' }, { expr: 'neutral', hl: '#parcels' }, { expr: 'neutral', hl: '#wait-btn', gate: true }] },
    // 첫 대기 팝업(1개월차): intro 가 '대기'를 누르랬으니, 낯선 팝업에서 어디를 눌러야 하는지까지 짚어 준다. 이 한 번만.
    { id: 'waitFirst', months: [1], kind: 'modal', modal: 'wait', when: g => g.story.seen.includes('intro'), pages: [{ expr: 'neutral', hl: '#modal .foot .btn.primary', gate: true }] },
    { id: 'usage', months: [1], kind: 'turn', when: g => g.turn >= 2, pages: [{ expr: 'neutral', hl: '#bar-usage' }] },
    { id: 'callReady', months: [1], kind: 'turn', when: g => g.turn >= 3 || bestReadySlot(g).fill >= 0.8, pages: [{ expr: 'neutral', hl: g => { const b = bestReadySlot(g); return b.slot >= 0 ? '#c' + b.slot : '#actions'; } }, { expr: 'neutral', hl: g => { const b = bestReadySlot(g); return b.slot >= 0 ? '#c' + b.slot : '#actions'; }, gate: g => bestReadySlot(g).slot >= 0 }] },
    // 호출 팝업 안: 자동 선택 버튼 → 호출 버튼. 팝업이 다시 그려질 때마다 ctx.sel(선택 수)로 확인한다
    { id: 'callModal', months: [1, 2], kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel === 0 && ctx.elig > 0, pages: [{ expr: 'neutral', hl: '#modal .truckgauge' }, { expr: 'neutral', hl: '#modal .truckgauge' }, { expr: 'neutral', hl: '#pick-urgent', gate: true }] },
    // 차가 두 대 붙는 첫 순간. 자동으로 붙는 거라 설명이 없으면 배차가 왜 2대 줄었는지 모른다 (대본 1개월차 8턴에 정확히 12칸이 온다)
    { id: 'trucks2', months: [1, 2, 3], kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel > 0 && ctx.trucks > 1, pages: [{ expr: 'neutral', hl: '#modal .truckgauge' }, { expr: 'smile', hl: '#modal .truckgauge' }] },
    { id: 'callGo', months: [1, 2], kind: 'modal', modal: 'call', when: (g, ctx) => ctx.sel > 0, pages: [{ expr: 'smile', hl: '#pick-list' }, { expr: 'neutral', hl: '#modal .foot .btn.primary', gate: true }] },
    { id: 'firstCall', months: [1, 2], kind: 'call', when: (g, ctx) => ctx.result && ctx.result.ok, pages: [{ expr: 'laugh' }, { speaker: g => repOf(g.contracts.find(c => c && c.totalCalls > 0) ? g.contracts.find(c => c && c.totalCalls > 0).carrier : 'bulk0'), expr: 'smile', k: () => 'story.firstCall.rep' }, { expr: 'neutral', k: () => 'story.firstCall.2' }] },
    // 안내가 끝났다는 걸 말로 못 박아 준다. 이게 없으면 언제까지 시키는 대로 해야 하는지 알 수 없다.
    { id: 'handOff', months: [1], kind: 'turn', when: g => g.story.seen.includes('firstCall'), pages: [{ expr: 'smile' }] },
    // 배차 소진: 이 게임에서 제일 많이 막히는 지점 — 배차는 월초에 안 채워진다
    { id: 'callsOut', months: [1, 2, 3], kind: 'turn', when: g => !!outOfCalls(g), pages: [{ expr: 'worry', hl: '#actions' }, { expr: 'neutral' }] },
    { id: 'deadline1', months: [1, 2, 3], kind: 'turn', when: g => g.parcels.some(p => !p.overdue && p.deadline <= 1 && !(p.customs > 0)), pages: [{ expr: 'worry', hl: '#parcels' }] },
    { id: 'usage76', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.76, pages: [{ expr: 'worry', hl: '#bar-usage' }, { expr: 'neutral', hl: '#upcoming' }] },
    { id: 'usage91', months: [1, 2, 3], kind: 'turn', when: g => usage(g) >= 0.91, pages: [{ expr: 'shock', hl: '#bar-usage' }] },
    // 첫 일요일: 왜 차를 못 부르는지, 마당을 왜 비워야 하는지. 마지막 페이지에서 직접 고르게 한다
    { id: 'weekend', months: [1, 2], kind: 'weekend', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'neutral', hl: '.wkopts .wkc', gate: true }] },
    // 마당에 물건이 나가 있는 채로 맞는 일요일 — 알바를 쓸지 결정하는 자리
    { id: 'weekendYard', months: [1, 2, 3], kind: 'weekend', when: g => g.outdoorVolume() > 0, pages: [{ expr: 'worry', hl: '.wkopts .wkc:nth-child(3)' }] },
    // 평판: 처음 깎였을 때 한 번. 이 게임이 왜 끝나는지를 말해 주는 자리다
    // '방금 깎였지'는 진짜 깎였을 때만. 등급이 올라 상한이 늘어난 것뿐인데 깎였다고 하면 안 된다
    { id: 'rep', months: [1, 2, 3], kind: 'turn', when: g => g.repDropped || g.rep < g.repCap(), pages: [{ expr: g => g.repDropped ? 'worry' : 'neutral', hl: '#hud-right', k: g => g.repDropped ? 'story.rep.1drop' : 'story.rep.1' }, { expr: 'neutral', hl: '#hud-right' }] },
    // 등급이 처음 오른 정산 — 평판을 키우면 뭐가 열리는지 여기서 말한다
    { id: 'repUp', months: [1, 2, 3], kind: 'summary', when: g => !!(g.summary && g.summary.repTierUp), pages: [{ expr: 'laugh' }, { expr: 'smile' }] },
    { id: 'summary1', months: [1], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'smile' }] },
    { id: 'market1', months: [1], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'think' }] },
    // 예상 물량: 접혀 있는 줄을 '눌러서 펼치게' 한 다음, 펼쳐진 내용을 보면서 설명한다
    { id: 'marketFc', months: [1], kind: 'market', when: (g, ctx) => !ctx.fcOpen, pages: [{ expr: 'neutral', hl: '#mk-fctoggle', gate: true }] },
    { id: 'marketFcOpen', months: [1], kind: 'market', when: (g, ctx) => !!ctx.fcOpen, pages: [{ expr: 'neutral', hl: '#mk-fc' }] },
    { id: 'market1b', months: [1], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }] },
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
    { id: 'waitSelf', months: [2, 3], kind: 'modal', modal: 'wait', when: (g, ctx) => g.story.seen.includes('noContract') && ctx.picked === 0 && ctx.elig > 0, pages: [{ expr: 'neutral', hl: '#modal .zone .parcel', gate: true }] },
    { id: 'waitGo', months: [2, 3], kind: 'modal', modal: 'wait', when: (g, ctx) => g.story.seen.includes('waitSelf') && ctx.picked > 0, pages: [{ expr: 'neutral', hl: '#modal .foot .btn.primary', gate: true }] },
    { id: 'offer', months: [2, 3], kind: 'turn', when: g => !!g.offer, pages: [{ expr: 'neutral', hl: '#offer' }, { expr: 'think' }] },
    { id: 'cash', months: [2, 3], kind: 'turn', when: g => g.projectedCash().total < 0 || g.debt > 0, pages: [{ expr: 'think', hl: '#hud-left' }, { expr: 'worry' }] },
    { id: 'summary2', months: [2], kind: 'summary', when: () => true, pages: [{ expr: 'neutral' }] },
    { id: 'market2', months: [2], kind: 'market', when: () => true, pages: [{ expr: 'neutral' }] },
    // ----- 마켓: 배차를 늘리는 세 가지 (충전 · 한도 강화 · 상위 센터) -----
    { id: 'marketRefill', months: [1, 2, 3], kind: 'market', when: g => !!refillSlot(g), pages: [{ expr: 'neutral', hl: g => { const r = refillSlot(g); return r ? '#mk-refill-' + r.slot : null; } }, { expr: 'neutral', hl: g => { const r = refillSlot(g); return r ? '#mk-refill-' + r.slot : null; }, gate: g => { const r = refillSlot(g); return !!r && r.c.calls === 0; } }] },
    // 다음 사이클에 못 싣는 게 온다 — 마켓이 마지막 기회다. 어느 달이든
    { id: 'marketBlocked', kind: 'market', when: g => g.forecastBlocked().length > 0, pages: [{ expr: 'worry', hl: '#mk-fcwarn' }] },
    // 프리미엄: 실제 매물 카드를 짚고, 계열 표준 대비 무엇이 달라지는지 읽힌다
    { id: 'marketPremium', kind: 'market', when: g => !!premiumItem(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'contract' && root.DATA.CARRIERS[it.carrier] && root.DATA.CARRIERS[it.carrier].tier > 0) }] },
    { id: 'marketLimit', months: [1, 2, 3], kind: 'market', when: g => !!limitItem(g), pages: [{ expr: 'think', hl: g => cardSel(g, it => it.kind === 'enh' && /^limit/.test(it.enh)) }] },
    { id: 'marketSwitch', months: [2, 3], kind: 'market', when: g => !!switchItem(g), pages: [{ expr: 'neutral', hl: g => cardSel(g, it => it.kind === 'contract' && it.switchFrom) }, { expr: 'think' }] },
    // ----- 5월 (3개월차): 손실, 승리, 작별 -----
    { id: 'm3', months: [3], kind: 'turn', when: g => g.turn === 1, pages: [{ expr: 'smile' }, { expr: 'neutral' }] },
    { id: 'fragileRisk', months: [2, 3], kind: 'turn', when: g => g.parcels.some(p => attrsOf(g, p).includes('fragile')) && !g.contracts.some(c => c && g.contractCaps(c).includes('fragile')), pages: [{ expr: 'neutral', hl: '#parcels' }] },
    { id: 'loss', months: [1, 2, 3], kind: 'any', when: (g, ctx) => hasEvent(ctx, ['discard', 'returned', 'stolen', 'broken', 'claim']), pages: [{ expr: 'shock' }, { speaker: 'kang', expr: 'neutral', k: () => 'story.loss.rep' }, { expr: 'neutral', k: () => 'story.loss.2' }] },
    // 비 + 마당에 나가 있는 택배가 있을 때만 (창고가 안 찼으면 나오지 않는다). 대기 팝업의 적재 정리까지 안내
    { id: 'rain', months: [1, 2, 3], kind: 'turn', when: g => g.outdoorVolume() > 0 && (g.weatherNow() === 'rain' || g.upcoming().some(u => u.weather === 'rain')), pages: [{ speaker: 'noh', expr: 'neutral', hl: '#upcoming .chip.wx' }, { expr: 'neutral', hl: '#upcoming .chip.wx', gate: g => !g.story.seen.includes('weatherDetail') }] },
    // 날씨도 지나가는 대사 대신 직접 눌러 확인하게 한다 (호기심에 먼저 눌러도 나온다)
    { id: 'weatherDetail', months: [1, 2, 3], kind: 'modal', modal: 'weather', when: () => true, pages: [{ expr: 'neutral' }, { expr: 'neutral' }] },
    { id: 'rainReorder', months: [1, 2, 3], kind: 'modal', modal: 'wait', when: (g, ctx) => g.story.seen.includes('rain') && ctx.outdoor > 0, pages: [{ expr: 'neutral', hl: '#wm-reorder', gate: true }] },
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
    return { name: bulk ? g.contractName(bulk) : '', cap, fee, per: Math.round(fee / Math.max(1, cap)), ready: c ? g.contractName(c) : '', readyCap: c ? g.vehicleCap(c) : cap,
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
    for (const b of BEATS) {
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
      return { speaker, name: speaker === 'park' ? root.I18n.t(CHARACTER.nameKey) : repName(speaker), expr: typeof pg.expr === 'function' ? pg.expr(g) : pg.expr, hl: typeof pg.hl === 'function' ? pg.hl(g) : pg.hl || null, gate: typeof pg.gate === 'function' ? !!pg.gate(g) : !!pg.gate, text: root.I18n.t(key, p) };
    });
    if (!g.story.notes) g.story.notes = [];
    g.story.notes.push({ id: b.id, month: g.month, turn: g.turn, text: pages.map(x => x.text) });
    return { id: b.id, pages, calendar: !!b.calendar, name: root.I18n.t(CHARACTER.nameKey) };
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

  const Story = { BEATS, SPRITES, REPS, CHARACTER, check, sms, done, active, sprite, repOf, repName, greet, bestSlot: bestReadySlot, mkKey, params };
  if (typeof module !== 'undefined') module.exports = Story; else root.Story = Story;
})(typeof window !== 'undefined' ? window : globalThis);
