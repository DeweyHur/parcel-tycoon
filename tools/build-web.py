#!/usr/bin/env python3
"""단일 파일 웹 빌드: www/ 전체(three.js·폰트·오디오 포함)를 한 HTML로 인라인한다.
  python3 tools/build-web.py            → dist/parcel-tycoon.html (브라우저에서 바로 열기)
  python3 tools/build-web.py --artifact → dist/parcel-tycoon.artifact.html (claude.ai 아티팩트용: doctype/html/head/body 없음)
  python3 tools/build-web.py --demo     → dist/parcel-tycoon.demo.html (인수인계 3개월까지 · itch.io·웹 배포용)
  --demo 는 js/build.js 의 demo 값을 true 로 바꿔 인라인한다(원본 파일은 건드리지 않는다).
"""
import base64, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
WWW = ROOT / 'www'
artifact = '--artifact' in sys.argv
demo = '--demo' in sys.argv

def b64(p): return base64.b64encode(p.read_bytes()).decode()

html = (WWW / 'index.html').read_text(encoding='utf-8')
css = (WWW / 'css' / 'style.css').read_text(encoding='utf-8')
css = css.replace("url('../fonts/Galmuri11.woff2')", f"url(data:font/woff2;base64,{b64(WWW/'fonts'/'Galmuri11.woff2')})")
css = css.replace("url('../fonts/Galmuri11-Bold.woff2')", f"url(data:font/woff2;base64,{b64(WWW/'fonts'/'Galmuri11-Bold.woff2')})")

audio = {n: b64(WWW / 'audio' / f'{n}.mp3') for n in ['title', 'warehouse', 'overflow', 'market', 'gameover', 'fanfare']}
audio_js = 'window.__AUDIO_B64__ = ' + '{' + ','.join(f'{k}:"{v}"' for k, v in audio.items()) + '};'

# ?v=<해시> 가 붙어 있다(tools/stamp-assets.py). 파일을 읽을 때는 떼고 쓴다
scripts = [s.split('?')[0] for s in re.findall(r'<script src="([^"]+)"></script>', html)]  # js/*.js + locales/*.js (index.html 순서대로)
def script_src(rel):
    src = (WWW / rel).read_text(encoding='utf-8')
    if demo and rel.endswith('build.js'):
        # 주석이 아니라 대입문만 바꾼다(들여쓰기 + 쉼표까지 일치)
        assert src.count('\n  demo: false,') == 1, 'build.js 의 demo 플래그를 찾지 못했습니다'
        src = src.replace('\n  demo: false,', '\n  demo: true,')
    return src.replace('</script>', '<\\/script>')

js_inline = '<script>' + audio_js + '</script>\n' + '\n'.join(
    '<script>\n' + script_src(s) + '\n</script>' for s in scripts)

body = html.split('<body>')[1].split('</body>')[0]
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
wide_css = '\n/* 웹(넓은 화면): 폰 비율 컬럼으로 가운데 정렬 */\n@media (min-width: 640px) { #app { left: 50%; right: auto; width: 480px; transform: translateX(-50%); box-shadow: 0 0 0 4px var(--line), 0 0 60px #000; } #modal-root { left: 50%; right: auto; width: 480px; transform: translateX(-50%); } }\n'
icon = f'<link rel="icon" href="data:image/png;base64,{b64(WWW/"img"/"mark-icon.png")}">'
head_extra = f'<title>상하차의 신: 택배 창고 타이쿤</title>\n{icon}\n<style>\n{css}{wide_css}\n</style>'

if artifact:
    out = f'{head_extra}\n{body}\n{js_inline}\n'
    dest = ROOT / 'dist' / ('parcel-tycoon.demo.artifact.html' if demo else 'parcel-tycoon.artifact.html')
else:
    out = ('<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
           f'<meta name="theme-color" content="#1b1a2e">\n{head_extra}\n</head>\n<body>{body}\n{js_inline}\n</body>\n</html>\n')
    dest = ROOT / 'dist' / ('parcel-tycoon.demo.html' if demo else 'parcel-tycoon.html')
dest.parent.mkdir(exist_ok=True)
dest.write_text(out, encoding='utf-8')
print(f'{dest} ({dest.stat().st_size/1e6:.1f} MB){" · DEMO" if demo else ""}')
