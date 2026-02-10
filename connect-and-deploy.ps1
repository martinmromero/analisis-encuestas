# Script para conectar al servidor y hacer deployment
# Ejecutar desde Windows

$serverIP = "192.168.30.12"
$serverUser = "root"
$serverPassword = "PN4lG4gJqRWX5o`$fJx2M1"  # Escapar el $ con `

Write-Host "🚀 Deployment Automático a Servidor Remoto" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si plink está disponible (PuTTY)
$plinkAvailable = Get-Command plink -ErrorAction SilentlyContinue
$pscpAvailable = Get-Command pscp -ErrorAction SilentlyContinue

if (-not $plinkAvailable -or -not $pscpAvailable) {
    Write-Host "⚠️  PuTTY no está instalado o no está en PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones alternativas:" -ForegroundColor Cyan
    Write-Host "1. Instalar PuTTY: https://www.putty.org/" -ForegroundColor White
    Write-Host "2. Usar SSH nativo de Windows (requiere configuración manual)" -ForegroundColor White
    Write-Host "3. Usar WinSCP para copiar archivos" -ForegroundColor White
    Write-Host ""
    Write-Host "Presiona cualquier tecla para ver instrucciones manuales..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    Write-Host ""
    Write-Host "=== INSTRUCCIONES MANUALES ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. PREPARAR ARCHIVOS (ya hecho):" -ForegroundColor Yellow
    Write-Host "   ✓ Ejecuta: .\prepare-deployment.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "2. COPIAR AL SERVIDOR:" -ForegroundColor Yellow
    Write-Host "   Opción A - Usar WinSCP:" -ForegroundColor Cyan
    Write-Host "     - Descarga: https://winscp.net/" -ForegroundColor White
    Write-Host "     - Host: $serverIP" -ForegroundColor White
    Write-Host "     - Usuario: $serverUser" -ForegroundColor White
    Write-Host "     - Contraseña: $serverPassword" -ForegroundColor White
    Write-Host "     - Copia el archivo ZIP a /root/" -ForegroundColor White
    Write-Host ""
    Write-Host "   Opción B - Usar comando SSH de Windows:" -ForegroundColor Cyan
    Write-Host "     scp archivo.zip ${serverUser}@${serverIP}:/root/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. CONECTAR AL SERVIDOR:" -ForegroundColor Yellow
    Write-Host "   ssh ${serverUser}@${serverIP}" -ForegroundColor Gray
    Write-Host "   (Contraseña: $serverPassword)" -ForegroundColor White
    Write-Host ""
    Write-Host "4. EN EL SERVIDOR:" -ForegroundColor Yellow
    Write-Host "   # Descomprimir" -ForegroundColor Cyan
    Write-Host "   unzip analisis-encuestas-deploy-*.zip -d analisis-encuestas" -ForegroundColor Gray
    Write-Host "   cd analisis-encuestas" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   # Verificar servidor (opcional)" -ForegroundColor Cyan
    Write-Host "   chmod +x verify-server.sh" -ForegroundColor Gray
    Write-Host "   ./verify-server.sh" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   # Hacer deployment" -ForegroundColor Cyan
    Write-Host "   chmod +x auto-deploy.sh" -ForegroundColor Gray
    Write-Host "   ./auto-deploy.sh" -ForegroundColor Gray
    Write-Host ""
    exit
}

# Si PuTTY está disponible, continuar con deployment automático
Write-Host "✓ PuTTY detectado, continuando con deployment automático..." -ForegroundColor Green
Write-Host ""

# Paso 1: Preparar archivos
Write-Host "📦 Paso 1: Preparando archivos de deployment..." -ForegroundColor Yellow
if (Test-Path ".\prepare-deployment.ps1") {
    & .\prepare-deployment.ps1
    
    # Buscar el archivo ZIP más reciente
    $zipFile = Get-ChildItem -Path $PSScriptRoot -Filter "analisis-encuestas-deploy-*.zip" | 
               Sort-Object LastWriteTime -Descending | 
               Select-Object -First 1
    
    if (-not $zipFile) {
        Write-Host "❌ No se encontró archivo ZIP de deployment" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Archivo preparado: $($zipFile.Name)" -ForegroundColor Green
} else {
    Write-Host "❌ No se encontró prepare-deployment.ps1" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Paso 2: Copiar archivos al servidor
Write-Host "📤 Paso 2: Copiando archivos al servidor..." -ForegroundColor Yellow
Write-Host "Servidor: ${serverUser}@${serverIP}" -ForegroundColor Cyan

# Usar pscp de PuTTY (acepta contraseña en línea de comandos)
$pscpCommand = "echo y | pscp -pw `"$serverPassword`" `"$($zipFile.FullName)`" ${serverUser}@${serverIP}:/root/"
Invoke-Expression $pscpCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Archivos copiados exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error al copiar archivos" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Paso 3: Ejecutar comandos en el servidor
Write-Host "🔧 Paso 3: Ejecutando deployment en el servidor..." -ForegroundColor Yellow

$commands = @"
cd /root && \
unzip -o $($zipFile.Name) -d analisis-encuestas && \
cd analisis-encuestas && \
chmod +x verify-server.sh auto-deploy.sh && \
./auto-deploy.sh
"@

# Ejecutar comandos remotos
$plinkCommand = "echo y | plink -pw `"$serverPassword`" ${serverUser}@${serverIP} `"$commands`""
Invoke-Expression $plinkCommand

Write-Host ""
Write-Host "✅ Deployment completado!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Acceso a la aplicación:" -ForegroundColor Cyan
Write-Host "   http://${serverIP}:3000" -ForegroundColor White
Write-Host "   (o el puerto que hayas configurado)" -ForegroundColor Gray
Write-Host ""
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
