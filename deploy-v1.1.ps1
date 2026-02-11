# Script de deployment para v1.1
# Ejecutar en el servidor de producción

$serverIP = "192.168.30.12"
$serverUser = "root"

Write-Host "🚀 Deployment de Versión 1.1" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servidor: $serverIP" -ForegroundColor Yellow
Write-Host "Usuario: $serverUser" -ForegroundColor Yellow
Write-Host ""
Write-Host "COMANDOS A EJECUTAR EN EL SERVIDOR:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Ir al directorio del proyecto:" -ForegroundColor Yellow
Write-Host "   cd /root/analisis-encuestas" -ForegroundColor White
Write-Host ""
Write-Host "2. Descargar cambios desde GitHub:" -ForegroundColor Yellow
Write-Host "   git pull origin main" -ForegroundColor White
Write-Host ""
Write-Host "3. Reconstruir Docker con la nueva versión:" -ForegroundColor Yellow
Write-Host "   APP_VERSION=1.1 docker compose build app --no-cache" -ForegroundColor White
Write-Host ""
Write-Host "4. Reiniciar contenedor:" -ForegroundColor Yellow
Write-Host "   APP_VERSION=1.1 docker compose up -d app" -ForegroundColor White
Write-Host ""
Write-Host "5. Verificar logs:" -ForegroundColor Yellow
Write-Host "   docker compose logs -f app" -ForegroundColor White
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Conectándose al servidor..." -ForegroundColor Yellow
Write-Host ""

# Conectar al servidor
ssh ${serverUser}@${serverIP}
