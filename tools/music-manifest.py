#!/usr/bin/env python3
"""BGM 파일 지문(sha256) 매니페스트를 만든다 — 출시본과 원본을 나중에 연결해 증명하기 위한 것.

  python3 tools/music-manifest.py            → docs/MUSIC_MANIFEST.md 갱신
  python3 tools/music-manifest.py --check    → 기록된 해시와 현재 파일을 비교(변경 감지)

audio-src/ = Suno 다운로드본(마스터), www/audio/ = 게임 내장본(tools/make_loops.py 로 재인코딩).
라이선스 근거(플랜·다운로드일·곡 URL)는 docs/LICENSE-MUSIC.md 에 적는다.
"""
import hashlib, pathlib, sys, datetime, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIRS = [('audio-src', '마스터(Suno 다운로드본)'), ('www/audio', '게임 내장본(재인코딩)')]
OUT = ROOT / 'docs' / 'MUSIC_MANIFEST.md'

def sha(p):
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()

def title_of(p):
    head = p.read_bytes()[:2048]
    m = re.search(rb'TIT2[\x00-\xff]{7}([\x20-\x7e]{2,60})', head)
    return m.group(1).decode('ascii', 'replace').split('TPE1')[0].strip() if m else ''

def rows():
    for d, label in DIRS:
        files = sorted((ROOT / d).glob('*.mp3'))
        if not files:
            continue
        yield None, label, d
        for p in files:
            yield p, label, d

def build():
    lines = [f'# BGM 지문 매니페스트\n',
             f'생성: {datetime.date.today().isoformat()} · `python3 tools/music-manifest.py` 로 갱신\n',
             '출시 파일이 어느 원본에서 왔는지 나중에 증명하기 위한 표다. 라이선스 근거는 `docs/LICENSE-MUSIC.md`.\n']
    for d, label in DIRS:
        files = sorted((ROOT / d).glob('*.mp3'))
        if not files:
            continue
        lines.append(f'\n## `{d}/` — {label}\n')
        lines.append('| 파일 | 곡 제목(ID3) | 크기 | sha256 |')
        lines.append('|---|---|---:|---|')
        for p in files:
            lines.append(f'| `{p.name}` | {title_of(p) or "—"} | {p.stat().st_size:,} B | `{sha(p)}` |')
    return '\n'.join(lines) + '\n'

def check():
    if not OUT.exists():
        print('매니페스트가 없습니다 — 먼저 인자 없이 실행하세요'); return 1
    old = OUT.read_text(encoding='utf-8')
    bad = 0
    for d, _ in DIRS:
        for p in sorted((ROOT / d).glob('*.mp3')):
            h = sha(p)
            if h not in old:
                print(f'CHANGED  {d}/{p.name}  {h}'); bad += 1
    print('모든 파일이 매니페스트와 일치합니다' if not bad else f'{bad}개 파일이 기록과 다릅니다')
    return 1 if bad else 0

if __name__ == '__main__':
    if '--check' in sys.argv:
        sys.exit(check())
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(build(), encoding='utf-8')
    print(OUT)
