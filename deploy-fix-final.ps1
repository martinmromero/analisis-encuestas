#!/usr/bin/env pwsh
# Deployment final para corregir cascade-filters.js

$ErrorActionPreference = "Stop"
$server = "192.168.30.12"
$user = "root"
$password = 'PN4lG4gJqRWX5o$fJx2M1'

Write-Host "`n=== DEPLOYMENT FINAL ===" -ForegroundColor Cyan

# Descargar herramientas
$plink = "$env:TEMP\plink-fix.exe"
$pscp = "$env:TEMP\pscp-fix.exe"

if (!(Test-Path $plink)) {
    Write-Host "Descargando plink..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe" -OutFile $plink
}

if (!(Test-Path $pscp)) {
    Write-Host "Descargando pscp..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" -OutFile $pscp
}

Write-Host "Aceptando SSH key..." -ForegroundColor Yellow
echo y | & $plink -pw $password "${user}@${server}" "exit" 2>$null

Write-Host "Copiando index.html al servidor..." -ForegroundColor Yellow
& $pscp -batch -pw $password "public\index.html" "${user}@${server}:/opt/analisis-encuestas/public/index.html"

Write-Host "Actualizando index.html en contenedor..." -ForegroundColor Yellow
$fixCmd = @"
docker cp /opt/analisis-encuestas/public/index.html analisis-encuestas:/app/public/index.html
docker exec analisis-encuestas rm -f /app/public/cascade-filters.js
docker restart analisis-encuestas
sleep 5
docker exec analisis-encuestas ls -lh /app/public/*.html
curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000
"@

& $plink -batch -pw $password "${user}@${server}" $fixCmd

Write-Host "`n✅ DEPLOYMENT COMPLETADO" -ForegroundColor Green
Write-Host "Verifica en: http://itd.barcelo.edu.ar:3000" -ForegroundColor Cyan
