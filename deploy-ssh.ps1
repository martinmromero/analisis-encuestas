$server = "root@192.168.30.12"
$zipLocal = "C:\Users\martin.romero\analisis-encuestas-main\analisis-encuestas-deploy.zip"
$password = "PN4lG4gJqRWX5o`$fJx2M1"

Write-Host "================================" -ForegroundColor Cyan
Write-Host " DEPLOYMENT A PRODUCCION" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Subir archivo
Write-Host "[1/3] Subiendo archivo (se te pedira password)..." -ForegroundColor Yellow
Write-Host "Password: $password" -ForegroundColor DarkGray
Write-Host ""

scp $zipLocal "${server}:/root/"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "[2/3] Ejecutando deployment remoto (se te pedira password de nuevo)..." -ForegroundColor Yellow
    Write-Host "Password: $password" -ForegroundColor DarkGray
    Write-Host ""
    
    $remoteCommands = "cd /root && rm -rf analisis-encuestas-deploy 2>/dev/null; unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-deploy && cp -r analisis-encuestas-deploy/public/* /opt/analisis-encuestas/public/ && cp analisis-encuestas-deploy/server.js /opt/analisis-encuestas/ && cd /opt/analisis-encuestas && docker-compose restart app-prod && docker-compose ps"
    
    ssh $server $remoteCommands
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================" -ForegroundColor Green
        Write-Host " ✅ DEPLOYMENT COMPLETADO" -ForegroundColor Green
        Write-Host "================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "URL: https://itd.barcelo.edu.ar" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "IMPORTANTE:" -ForegroundColor Yellow
        Write-Host "- Presiona Ctrl+Shift+R en el navegador" -ForegroundColor White
        Write-Host "- Ya NO debe aparecer error de cascade-filters.js" -ForegroundColor White
        Write-Host "- Debe aparecer logs de DEBUG CARRERA" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "ERROR en deployment remoto" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR al subir archivo" -ForegroundColor Red
}
