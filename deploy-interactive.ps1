# Script de deployment interactivo
# Ejecutar desde PowerShell: .\deploy-interactive.ps1

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   DEPLOYMENT AL SERVIDOR ITD BARCELO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$server = "192.168.30.12"
$user = "root"
$password = "PN4lG4gJqRWX5o`$fJx2M1"
Write-Host "Servidor: $server" -ForegroundColor Yellow
Write-Host "Usuario: $user" -ForegroundColor Yellow
Write-Host ""

# Verificar que los archivos existan
if (-not (Test-Path "deployment-package.zip")) {
    Write-Host "ERROR: No se encuentra deployment-package.zip" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "deploy-to-server.sh")) {
    Write-Host "ERROR: No se encuentra deploy-to-server.sh" -ForegroundColor Red
    exit 1
}

Write-Host "Archivos de deployment encontrados:" -ForegroundColor Green
Write-Host "  deployment-package.zip" -ForegroundColor Gray
Write-Host "  deploy-to-server.sh" -ForegroundColor Gray
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Iniciando transferencia de archivos..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "NOTA: Cuando pida password, ingresa: $password" -ForegroundColor Yellow
Write-Host ""
Write-Host "Presiona ENTER para continuar..." -ForegroundColor Yellow
Read-Host

# Transferir archivos
Write-Host "Transferiendo deployment-package.zip..." -ForegroundColor Cyan
& scp "deployment-package.zip" "${user}@${server}:/tmp/"

Write-Host ""
Write-Host "Transferiendo deploy-to-server.sh..." -ForegroundColor Cyan
& scp "deploy-to-server.sh" "${user}@${server}:/tmp/"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "Archivos transferidos exitosamente!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Ahora debes ejecutar estos comandos en el servidor:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Conectarte al servidor:" -ForegroundColor Cyan
Write-Host "   ssh $user@$server" -ForegroundColor White
Write-Host "   Password: $password" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ejecutar el deployment:" -ForegroundColor Cyan
Write-Host "   chmod +x /tmp/deploy-to-server.sh" -ForegroundColor White
Write-Host "   /tmp/deploy-to-server.sh" -ForegroundColor White
Write-Host ""
Write-Host "Presiona ENTER para abrir conexión SSH..." -ForegroundColor Yellow
Read-Host

# Abrir SSH
Write-Host "Abriendo conexión SSH..." -ForegroundColor Cyan
& ssh "${user}@${server}"
