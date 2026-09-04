#!/usr/bin/env bash
# 맥에서 APK 빌드: bash build-apk.sh  (결과: dist/parcel-tycoon-debug.apk)
# 필요: Node 18+, Android Studio(또는 Android SDK + JDK 17/21)
set -euo pipefail
cd "$(dirname "$0")"

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
if [ ! -d "$ANDROID_HOME" ]; then echo "Android SDK를 찾을 수 없습니다: $ANDROID_HOME (Android Studio를 설치하거나 ANDROID_HOME을 지정하세요)"; exit 1; fi
if [ -z "${JAVA_HOME:-}" ] || ! "$JAVA_HOME/bin/java" -version >/dev/null 2>&1; then
  JBR="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  [ -d "$JBR" ] && export JAVA_HOME="$JBR"
fi
echo "ANDROID_HOME=$ANDROID_HOME"; echo "JAVA_HOME=${JAVA_HOME:-(system)}"

echo "▶ npm install"; npm install --no-audit --no-fund
if [ ! -d android ]; then
  echo "▶ npx cap add android"; npx cap add android
  # 세로 고정 + 상태바 색
  MANIFEST=android/app/src/main/AndroidManifest.xml
  if ! grep -q screenOrientation "$MANIFEST"; then
    sed -i '' 's/<activity/<activity android:screenOrientation="portrait"/' "$MANIFEST"
  fi
fi
# 앱 아이콘 (resources/icon.png → mipmap)
if command -v sips >/dev/null 2>&1; then
  for pair in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
    dpi="${pair%%:*}"; px="${pair##*:}"; dir="android/app/src/main/res/mipmap-$dpi"
    mkdir -p "$dir"
    sips -z "$px" "$px" resources/icon.png --out "$dir/ic_launcher.png" >/dev/null
    cp "$dir/ic_launcher.png" "$dir/ic_launcher_round.png"
    cp "$dir/ic_launcher.png" "$dir/ic_launcher_foreground.png"
  done
fi
echo "▶ npx cap sync android"; npx cap sync android
echo "▶ gradle assembleDebug"; ( cd android && ./gradlew assembleDebug --no-daemon )
mkdir -p dist
cp android/app/build/outputs/apk/debug/app-debug.apk dist/parcel-tycoon-debug.apk
echo "✔ APK: $(pwd)/dist/parcel-tycoon-debug.apk"
if command -v adb >/dev/null 2>&1 || [ -x "$ANDROID_HOME/platform-tools/adb" ]; then
  ADB="$(command -v adb || echo "$ANDROID_HOME/platform-tools/adb")"
  if "$ADB" devices | grep -qw device; then
    echo "▶ 연결된 기기에 설치"; "$ADB" install -r dist/parcel-tycoon-debug.apk && echo "✔ 설치 완료"
  else
    echo "ℹ USB 디버깅으로 폰을 연결하면 자동 설치됩니다. 또는 dist/parcel-tycoon-debug.apk 파일을 폰으로 옮겨 설치하세요."
  fi
fi
