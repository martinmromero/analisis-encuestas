#!/usr/bin/env pwsh
Write-Host "`n==================================================" -ForegroundColor Red
Write-Host "   VERIFICANDO DATOS DE PRODUCCION" -ForegroundColor Red
Write-Host "==================================================" -ForegroundColor Red

$server = "192.168.30.12"
$user = "root"
$password = 'PN4lG4gJqRWX5o$fJx2M1'
$plink = "$env:TEMP\plink-final-fix.exe"

Write-Host "`nVERIFICANDO ARCHIVOS EN SERVIDOR..." -ForegroundColor Cyan

$check = @"
echo '=== ARCHIVOS DE CONFIGURACION ==='
ls -lh /opt/analisis-encuestas/column-configs.json 2>&1
echo ''
ls -lh /opt/analisis-encuestas/user-dictionary.json 2>&1
echo ''
echo '=== DICCIONARIOS ==='
ls -lh /opt/analisis-encuestas/dictionaries/ 2>&1
echo ''
echo '=== CONTENIDO DE COLUMN-CONFIGS ==='
head -50 /opt/analisis-encuestas/column-configs.json 2>&1
echo ''
echo '=== CONTENIDO DE USER-DICTIONARY (primeras lineas) ==='
head -20 /opt/analisis-encuestas/user-dictionary.json 2>&1
"@

& $plink -batch -pw $password "${user}@${server}" $check

Write-Host "`n==================================================" -ForegroundColor Yellow
Write-Host "Si NO ves archivos arriba, SE PERDIERON LOS DATOS" -ForegroundColor Red
Write-Host "Si VES los archivos, estan INTACTOS en el servidor" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Yellow

pause
