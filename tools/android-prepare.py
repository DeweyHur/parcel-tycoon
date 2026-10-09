#!/usr/bin/env python3
"""CI용 안드로이드 프로젝트 손질 (build-apk.sh 의 맥 전용 단계를 리눅스에서도 돌게 옮긴 것).
  npx cap add android 직후, cap sync 전에 한 번 실행한다.
    python3 tools/android-prepare.py --version-code 42 --version-name 0.2.0
  하는 일: 세로 고정 · 앱 아이콘(resources/icon.png → mipmap) · versionCode/versionName
  필요: Pillow (pip install pillow)
"""
import argparse, pathlib, re, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
ANDROID = ROOT / 'android'
MANIFEST = ANDROID / 'app/src/main/AndroidManifest.xml'
GRADLE = ANDROID / 'app/build.gradle'
RES = ANDROID / 'app/src/main/res'
ICON_SIZES = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}


def patch(path, pattern, repl, what):
    src = path.read_text(encoding='utf-8')
    out, n = re.subn(pattern, repl, src, count=1)
    if n != 1:
        sys.exit(f'✗ {what}: {path.relative_to(ROOT)} 에서 패턴을 찾지 못했습니다 ({pattern})')
    path.write_text(out, encoding='utf-8')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--version-code', type=int, required=True)
    ap.add_argument('--version-name', required=True)
    a = ap.parse_args()
    if not ANDROID.is_dir():
        sys.exit('✗ android/ 가 없습니다. 먼저 npx cap add android 를 실행하세요.')

    # 세로 고정 (이미 있으면 건드리지 않는다)
    if 'screenOrientation' not in MANIFEST.read_text(encoding='utf-8'):
        patch(MANIFEST, r'<activity', '<activity android:screenOrientation="portrait"', '세로 고정')
    print('✔ 세로 고정')

    # 앱 아이콘
    icon = Image.open(ROOT / 'resources/icon.png').convert('RGBA')
    for dpi, px in ICON_SIZES.items():
        d = RES / f'mipmap-{dpi}'
        d.mkdir(parents=True, exist_ok=True)
        resized = icon.resize((px, px), Image.LANCZOS)
        for name in ('ic_launcher', 'ic_launcher_round', 'ic_launcher_foreground'):
            resized.save(d / f'{name}.png')
    print('✔ 아이콘', ', '.join(f'{k}:{v}' for k, v in ICON_SIZES.items()))

    # 버전 (Play 는 versionCode 가 매번 커져야 한다 — CI 에서는 run number)
    patch(GRADLE, r'versionCode \d+', f'versionCode {a.version_code}', 'versionCode')
    patch(GRADLE, r'versionName "[^"]*"', f'versionName "{a.version_name}"', 'versionName')
    print(f'✔ versionCode {a.version_code} · versionName {a.version_name}')


if __name__ == '__main__':
    main()
