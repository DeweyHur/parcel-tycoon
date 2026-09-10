#!/usr/bin/env python3
"""단일 파일 웹 빌드: www/ 전체(three.js·폰트·오디오 포함)를 한 HTML로 인라인한다.
  python3 tools/build-web.py            → dist/parcel-tycoon.html (브라우저에서 바로 열기)
  python3 tools/build-web.py --artifact → dist/parcel-tycoon.artifact.html (claude.ai 아티팩트용: doctype/html/head/body 없음)
"""
import base64, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
WWW = ROOT / 'www'
artifact = '--artifact' in sys.argv

def b64(p): return base64.b64encode(p.read_bytes()).decode()

html = (WWW / 'index.html').read_text(encoding='utf-8')
css = (WWW / 'css' / 'style.css').read_text(encoding='utf-8')
css = css.replace("url('../fonts/Galmuri11.woff2')", f"url(data:font/woff2;base64,{b64(WWW/'fonts'/'Galmuri11.woff2')})")
css = css.replace("url('../fonts/Galmuri11-Bold.woff2')", f"url(data:font/woff2;base64,{b64(WWW/'fonts'/'Galmuri11-Bold.woff2')})")

audio = {n: b64(WWW / 'audio' / f'{n}.mp3') for n in ['title', 'warehouse', 'overflow', 'market', 'gameover', 'fanfare']}
audio_js = 'window.__AUDIO_B64__ = ' + '{' + ','.join(f'{k}:"{v}"' for k, v in audio.items()) + '};'

scripts = re.findall(r'<script src="([^"]+)"></script>', html)  # js/*.js + locales/*.js (index.html 순서대로)
js_inline = '<script>' + audio_js + '</script>\n' + '\n'.join(
    '<script>\n' + (WWW / s).read_text(encoding='utf-8').replace('</script>', '<\\/script>') + '\n</script>' for s in scripts)

body = html.split('<body>')[1].split('</body>')[0]
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
wide_css = '\n/* 웹(넓은 화면): 폰 비율 컬럼으로 가운데 정렬 */\n@media (min-width: 640px) { #app { left: 50%; right: auto; width: 480px; transform: translateX(-50%); box-shadow: 0 0 0 4px var(--line), 0 0 60px #000; } #modal-root { left: 50%; right: auto; width: 480px; transform: translateX(-50%); } }\n'
head_extra = f'<title>택배 타이쿤</title>\n<style>\n{css}{wide_css}\n</style>'

if artifact:
    out = f'{head_extra}\n{body}\n{js_inline}\n'
    dest = ROOT / 'dist' / 'parcel-tycoon.artifact.html'
else:
    out = ('<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
           '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">\n'
           f'<meta name="theme-color" content="#1b1a2e">\n{head_extra}\n</head>\n<body>{body}\n{js_inline}\n</body>\n</html>\n')
    dest = ROOT / 'dist' / 'parcel-tycoon.html'
dest.parent.mkdir(exist_ok=True)
dest.write_text(out, encoding='utf-8')
print(f'{dest} ({dest.stat().st_size/1e6:.1f} MB)')
