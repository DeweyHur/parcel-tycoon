#!/bin/bash
cd "$(dirname "$0")"
git push -u origin main 2>&1 | tee push.log
echo
echo "=== 끝. 이 창은 닫아도 됩니다 ==="
