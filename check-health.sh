#!/bin/bash

echo ""
echo "=== ClotAI 서비스 상태 확인 ==="
echo "(Render 콜드스타트 최대 50초 소요될 수 있음)"
echo ""

check() {
  local name="$1"
  local url="$2"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 60 "$url")
  if [ -n "$code" ] && [ "$code" -ge 100 ] && [ "$code" -lt 400 ] 2>/dev/null; then
    echo "  ✓ $name  [$code]  $url"
  else
    echo "  ✗ $name  [$code]  $url"
  fi
}

check "FE  (Vercel) " "https://clotai.vercel.app"
check "BE  (Render) " "https://clotai-be.onrender.com/health"
check "AI  (Render) " "https://clotai-ai.onrender.com/health"
check "Swagger      " "https://clotai-be.onrender.com/api/docs"

echo ""
