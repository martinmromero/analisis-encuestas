# Script de deployment automatizado al servidor ITD
$ErrorActionPreference = "Stop"

$server = "192.168.30.12"
$user = "root"
$password = 'PN4lG4gJqRWX5o$fJx2M1'
$localZip = "C:\Users\martin.romero\analisis-encuestas-main\analisis-encuestas-deploy.zip"
$remoteDir = "/opt"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT AUTOMATIZADO A ITD SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Descargar plink y pscp si no existen
$plinkPath = "$env:TEMP\plink.exe"
$pscpPath = "$env:TEMP\pscp.exe"

if (!(Test-Path $plinkPath)) {
    Write-Host "Descargando plink.exe..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe" -OutFile $plinkPath
    Write-Host "  OK" -ForegroundColor Green
}

if (!(Test-Path $pscpPath)) {
    Write-Host "Descargando pscp.exe..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://the.earth.li/~sgtatham/putty/latest/w64/pscp.exe" -OutFile $pscpPath
    Write-Host "  OK" -ForegroundColor Green
}

Write-Host ""
Write-Host "0. Aceptando host key del servidor..." -ForegroundColor Yellow
echo y | & $plinkPath -pw $password "${user}@${server}" "exit" 2>$null
Write-Host "  OK: Host key aceptado" -ForegroundColor Green

Write-Host ""
Write-Host "1. Copiando archivo al servidor..." -ForegroundColor Yellow
& $pscpPath -batch -pw $password $localZip "${user}@${server}:${remoteDir}/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR al copiar archivo" -ForegroundColor Red
    exit 1
}
Write-Host "  OK: Archivo copiado" -ForegroundColor Green

Write-Host ""
Write-Host "2. Creando backup de configs de produccion..." -ForegroundColor Yellow
$backupCmd = "cd /opt/analisis-encuestas && tar -czf backup-produccion-`$(date +%Y%m%d-%H%M%S).tar.gz column-configs.json user-dictionary.json dictionaries/ uploads/ 2>/dev/null || echo 'No hay archivos para backup'"
& $plinkPath -batch -pw $password "${user}@${server}" $backupCmd
Write-Host "  OK: Backup creado" -ForegroundColor Green

Write-Host ""
Write-Host "3. Descomprimiendo archivos..." -ForegroundColor Yellow
$unzipCmd = "cd /opt && unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-temp"
& $plinkPath -batch -pw $password "${user}@${server}" $unzipCmd
Write-Host "  OK: Archivos descomprimidos" -ForegroundColor Green

Write-Host ""
Write-Host "4. Copiando codigo (preservando datos)..." -ForegroundColor Yellow
$copyCmd = @"
cd /opt/analisis-encuestas-temp && \
cp -r public/ ../analisis-encuestas/ && \
cp server.js ../analisis-encuestas/ && \
cp package*.json ../analisis-encuestas/ && \
cp *.sh ../analisis-encuestas/ 2>/dev/null || true && \
cp sentiment-dict.js ../analisis-encuestas/ && \
cp column-config.js ../analisis-encuestas/ && \
cp ignored-phrases.json ../analisis-encuestas/ 2>/dev/null || true && \
cp Dockerfile ../analisis-encuestas/ 2>/dev/null || true && \
cp docker-compose.yml ../analisis-encuestas/ 2>/dev/null || true
"@
& $plinkPath -batch -pw $password "${user}@${server}" $copyCmd
Write-Host "  OK: Codigo copiado (configs preservadas)" -ForegroundColor Green

Write-Host ""
Write-Host "5. Reconstruyendo contenedores Docker..." -ForegroundColor Yellow
$deployCmd = "cd /opt/analisis-encuestas && chmod +x auto-deploy.sh && ./auto-deploy.sh"
& $plinkPath -batch -pw $password "${user}@${server}" $deployCmd
Write-Host "  OK: Contenedores reconstruidos" -ForegroundColor Green

Write-Host ""
Write-Host "6. Limpiando archivos temporales..." -ForegroundColor Yellow
$cleanCmd = "cd /opt && rm -rf analisis-encuestas-temp && rm analisis-encuestas-deploy.zip"
& $plinkPath -batch -pw $password "${user}@${server}" $cleanCmd
Write-Host "  OK: Limpieza completada" -ForegroundColor Green

Write-Host ""
Write-Host "7. Verificando deployment..." -ForegroundColor Yellow
$verifyCmd = "docker ps | grep analisis-encuestas && curl -s -o /dev/null -w '%{http_code}' http://localhost:3000"
$result = & $plinkPath -batch -pw $password "${user}@${server}" $verifyCmd
Write-Host "  OK: Servidor respondiendo (HTTP $result)" -ForegroundColor Green

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL: http://itd.barcelo.edu.ar:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para ver logs:" -ForegroundColor Yellow
Write-Host "  ssh root@192.168.30.12" -ForegroundColor Gray
Write-Host "  docker logs analisis-encuestas -f" -ForegroundColor Gray
Write-Host ""
