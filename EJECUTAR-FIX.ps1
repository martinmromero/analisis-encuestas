#!/usr/bin/env pwsh
# EJECUTA ESTE SCRIPT EN UN POWERSHELL NUEVO (FUERA DE VSCODE)
# Haz click derecho en el archivo > Ejecutar con PowerShell

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   FIX FINAL - Corregir index.html en Docker" -ForegroundColor Cyan  
Write-Host "==================================================" -ForegroundColor Cyan

# Configuración
$server = "192.168.30.12"
$user = "root"
$password = 'PN4lG4gJqRWX5o$fJx2M1'
$plink = "$env:TEMP\plink-final-fix.exe"
$pscp = "$env:TEMP\pscp-final-fix.exe"

# Descargar plink y pscp
if (!(Test-Path $plink)) {
    Write-Host "`nDescargando plink..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe" -OutFile $plink -UseBasicParsing
        Write-Host "OK" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: No se pudo descargar plink" -ForegroundColor Red
        Write-Host "Descarga manualmente de: https://www.putty.org/" -ForegroundColor Yellow
        pause
        exit 1
    }
}

if (!(Test-Path $pscp)) {
    Write-Host "Descargando pscp..." -ForegroundColor Yellow
    try {
        Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" -OutFile $pscp -UseBasicParsing
        Write-Host "OK" -ForegroundColor Green
    } catch {
        Write-Host "ERROR: No se pudo descargar pscp" -ForegroundColor Red
        pause
        exit 1
    }
}

# Aceptar clave SSH
Write-Host "`nAceptando clave SSH..." -ForegroundColor Yellow
$null = echo y | & $plink -pw $password "${user}@${server}" "exit" 2>&1
$null = echo y | & $pscp -pw $password "${user}@${server}:/tmp/test" "." 2>&1

# Copiar archivos al servidor
Write-Host "`nCOPIANDO ARCHIVOS AL SERVIDOR..." -ForegroundColor Cyan
$localIndexPath = "C:\Users\martin.romero\analisis-encuestas-main\public\index.html"
$localAppPath = "C:\Users\martin.romero\analisis-encuestas-main\public\app.js"

try {
    Write-Host "- index.html"
    & $pscp -batch -pw $password $localIndexPath "${user}@${server}:/opt/analisis-encuestas/public/index.html"
    Write-Host "- app.js"
    & $pscp -batch -pw $password $localAppPath "${user}@${server}:/opt/analisis-encuestas/public/app.js"
    Write-Host "✅ Archivos copiados al servidor" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR al copiar: $_" -ForegroundColor Red
    pause
    exit 1
}

# Ejecutar fix
Write-Host "`nRECONSTRUYENDO CONTENEDOR..." -ForegroundColor Cyan

# Ejecutar comandos uno por uno
Write-Host "Deteniendo contenedor..." -ForegroundColor Yellow
& $plink -batch -pw $password "${user}@${server}" "docker stop analisis-encuestas; docker rm analisis-encuestas"

Write-Host "Reconstruyendo imagen (SIN CACHE)..." -ForegroundColor Yellow  
& $plink -batch -pw $password "${user}@${server}" "cd /opt/analisis-encuestas && docker build --no-cache -t analisis-encuestas:latest ."

Write-Host "Iniciando contenedor..." -ForegroundColor Yellow
& $plink -batch -pw $password "${user}@${server}" "docker run -d --name analisis-encuestas -p 3000:3000 -v /opt/analisis-encuestas/uploads:/app/uploads -v /opt/analisis-encuestas/column-configs.json:/app/column-configs.json -v /opt/analisis-encuestas/user-dictionary.json:/app/user-dictionary.json -v /opt/analisis-encuestas/dictionaries:/app/dictionaries --restart unless-stopped analisis-encuestas:latest"

Write-Host "Esperando 15 segundos..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "`nVERIFICANDO..." -ForegroundColor Cyan
$result = & $plink -batch -pw $password "${user}@${server}" "docker exec analisis-encuestas grep 'cascade-filters.js' /app/public/index.html 2>&1"
$http = & $plink -batch -pw $password "${user}@${server}" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"

if ($result -match "cascade-filters") {
    Write-Host "`n❌ ERROR: cascade-filters.js todavia existe" -ForegroundColor Red
    Write-Host "OUTPUT: $result"
} else {
    Write-Host "`n✅ OK: cascade-filters.js REMOVIDO" -ForegroundColor Green
}

Write-Host "Estado HTTP: $http" -ForegroundColor $(if ($http -eq "200") { "Green" } else { "Red" })

try {

if ($http -eq "200") {
    Write-Host "`n==================================================" -ForegroundColor Green
    Write-Host "   ✅ FIX COMPLETADO EXITOSAMENTE" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "`nAhora:"
    Write-Host "1. Ve a tu navegador" -ForegroundColor White
    Write-Host "2. Presiona Ctrl + Shift + R (recargar sin cache)" -ForegroundColor White
    Write-Host "3. Abre consola (F12)" -ForegroundColor White
    Write-Host "4. NO deberia aparecer error de cascade-filters.js" -ForegroundColor White
} else {
    Write-Host "`n⚠️ Posible problema - verifica manualmente" -ForegroundColor Yellow
}
    
} catch {
    Write-Host "`nERROR: $_" -ForegroundColor Red
}

Write-Host "`n"
pause
