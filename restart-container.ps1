# Reinicio rápido de contenedor
$plink = "$env:TEMP\plink.exe"
$pw = 'PN4lG4gJqRWX5o$fJx2M1'

Write-Host "REINICIANDO CONTENEDOR..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Deteniendo..." -ForegroundColor Yellow
& $plink -batch -pw $pw root@192.168.30.12 "cd /opt/analisis-encuestas && docker-compose stop"

Write-Host "2. Iniciando..." -ForegroundColor Yellow
& $plink -batch -pw $pw root@192.168.30.12 "cd /opt/analisis-encuestas && docker-compose up -d"

Write-Host "3. Esperando..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "4. Verificando logs..." -ForegroundColor Yellow
& $plink -batch -pw $pw root@192.168.30.12 "docker logs analisis-encuestas --tail 20"

Write-Host ""
Write-Host "5. Test HTTP..." -ForegroundColor Yellow
& $plink -batch -pw $pw root@192.168.30.12 "curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3000"

Write-Host ""
Write-Host "LISTO" -ForegroundColor Green
