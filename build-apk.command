#!/bin/bash
cd "$(dirname "$0")"
bash build-apk.sh 2>&1 | tee build.log
echo
echo "=== 끝. 이 창은 닫아도 됩니다 ==="
