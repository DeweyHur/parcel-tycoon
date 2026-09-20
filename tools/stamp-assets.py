#!/usr/bin/env python3
"""www/index.html 의 ?v= 를 파일 내용 해시로 갱신한다.

왜: 에셋에 손으로 버전을 박아 두면 파일을 고치고 버전 올리는 걸 잊는 순간
    돌아온 플레이어에게 '새 HTML + 옛 CSS/JS' 가 섞여 나간다(화면이 깨져 보인다).
    내용이 바뀌면 해시가 바뀌므로 잊을 일이 없다.

쓰는 법: python3 tools/stamp-assets.py   (커밋 전에 한 번)
"""
import hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / 'www' / 'index.html'
PAT = re.compile(r'(?P<attr>href|src)="(?P<path>(?:css|js|locales)/[^"?]+)(?:\?v=[^"]*)?"')

def digest(p: pathlib.Path) -> str:
    return hashlib.md5(p.read_bytes()).hexdigest()[:8]

def main() -> int:
    html = INDEX.read_text(encoding='utf-8')
    changed = []

    def sub(m):
        rel = m.group('path')
        f = ROOT / 'www' / rel
        if not f.exists():
            return m.group(0)
        v = digest(f)
        new = f'{m.group("attr")}="{rel}?v={v}"'
        if new != m.group(0):
            changed.append(rel)
        return new

    out = PAT.sub(sub, html)
    if out != html:
        INDEX.write_text(out, encoding='utf-8')
    print(f'{len(changed)}개 갱신' + (': ' + ', '.join(changed) if changed else ' (그대로)'))
    return 0

if __name__ == '__main__':
    sys.exit(main())
