# Fix Docker container files
$ErrorActionPreference = "Continue"
$plink = "$env:TEMP\plink.exe"
$pass = 'PN4lG4gJqRWX5o$fJx2M1'
$server = "192.168.30.12"

Write-Host "`nCopiando archivos actualizados al contenedor..." -ForegroundColor Cyan

$commands = @"
docker cp /opt/analisis-encuestas/public/index.html analisis-encuestas:/app/public/index.html
docker cp /opt/analisis-encuestas/public/app.js analisis-encuestas:/app/public/app.js
docker cp /opt/analisis-encuestas/public/dual-filters.js analisis-encuestas:/app/public/dual-filters.js
docker exec analisis-encuestas rm -f /app/public/cascade-filters.js
docker restart analisis-encuestas
sleep 5
curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000
"@

& $plink -batch -pw $pass "root@$server" $commands

Write-Host "`n✅ Deployment completado" -ForegroundColor Green
