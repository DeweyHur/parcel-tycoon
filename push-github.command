#!/bin/bash
cd "$(dirname "$0")"
git remote get-url origin >/dev/null 2>&1 || git remote add origin https://github.com/DeweyHur/parcel-tycoon.git
git branch -M main
git push -u origin main 2>&1 | tee push.log
echo
echo "=== 끝. 이 창은 닫아도 됩니다 ==="
