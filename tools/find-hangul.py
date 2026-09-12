#!/usr/bin/env python3
"""주석을 제외한 코드에 남은 한글을 찾는다: python3 tools/find-hangul.py [파일...]"""
import re, sys, pathlib
files = sys.argv[1:] or ['www/js/ui.js', 'www/js/game.js', 'www/js/story.js', 'www/js/data.js', 'www/js/meta.js', 'www/js/scene3d.js', 'www/js/profile.js', 'www/index.html']
H = re.compile(r'[가-힣]')
n = 0
for f in files:
    for i, line in enumerate(pathlib.Path(f).read_text(encoding='utf-8').split('\n'), 1):
        code = re.sub(r'^\s*//.*$', '', line)            # 줄 주석
        code = re.sub(r'(?<=[;{}\s])//(?! *@).*$', '', code)  # 뒤쪽 주석 (URL 제외 근사)
        if H.search(code): n += 1; print(f'{f}:{i}: ' + code.strip()[:160])
print('total', n)
