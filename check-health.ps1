$services = @(
    @{ name = "FE  (Vercel)"; url = "https://clotai.vercel.app" },
    @{ name = "BE  (Render)"; url = "https://clotai-be.onrender.com/health" },
    @{ name = "AI  (Render)"; url = "https://clotai-ai.onrender.com/health" },
    @{ name = "Swagger     "; url = "https://clotai-be.onrender.com/api/docs" }
)

Write-Host "`n=== ClotAI 서비스 상태 확인 ===" -ForegroundColor Cyan
Write-Host "(Render 콜드스타트 최대 50초 소요될 수 있음)`n" -ForegroundColor Yellow

foreach ($svc in $services) {
    try {
        $res = Invoke-WebRequest -Uri $svc.url -TimeoutSec 60 -UseBasicParsing -ErrorAction Stop
        $code = $res.StatusCode
        $color = if ($code -lt 400) { "Green" } else { "Red" }
        Write-Host "$($svc.name)  [$code] $($svc.url)" -ForegroundColor $color
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) {
            Write-Host "$($svc.name)  [$code] $($svc.url)" -ForegroundColor Red
        } else {
            Write-Host "$($svc.name)  [ERR] $($svc.url) — $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
