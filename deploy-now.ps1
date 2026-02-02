# Script simplificado de deployment
$serverIP = "192.168.30.12"
$serverUser = "root"
$password = "PN4lG4gJqRWX5o`$fJx2M1"

Write-Host "🚀 Iniciando deployment..." -ForegroundColor Cyan
Write-Host ""

# Verificar que el archivo ZIP existe
$zipFile = "C:\Users\Public\analisis-encuestas\analisis-encuestas-deploy.zip"
if (-not (Test-Path $zipFile)) {
    Write-Host "❌ No se encontró el archivo ZIP. Ejecutando prepare-deployment.ps1..." -ForegroundColor Yellow
    & .\prepare-deployment.ps1
}

Write-Host "📤 Copiando archivo al servidor $serverIP..." -ForegroundColor Yellow

# Intentar con plink/pscp (PuTTY)
if (Get-Command pscp -ErrorAction SilentlyContinue) {
    Write-Host "Usando PuTTY (pscp)..." -ForegroundColor Gray
    & echo y | pscp -pw "$password" "$zipFile" "${serverUser}@${serverIP}:/root/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Archivo copiado exitosamente" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🔧 Ejecutando deployment en el servidor..." -ForegroundColor Yellow
        
        $commands = "cd /root; unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas; cd analisis-encuestas; chmod +x auto-deploy.sh; ./auto-deploy.sh"
        
        & echo y | plink -pw "$password" "${serverUser}@${serverIP}" "$commands"
        
        Write-Host ""
        Write-Host "✅ Deployment completado!" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 La aplicación está disponible en:" -ForegroundColor Cyan
        Write-Host "   http://${serverIP}:3000" -ForegroundColor White
        Write-Host "   https://itd.barcelo.edu.ar (si Nginx está configurado)" -ForegroundColor White
    } else {
        Write-Host "❌ Error al copiar archivo" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "⚠️  PuTTY no está instalado" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "INSTRUCCIONES MANUALES:" -ForegroundColor Cyan
    Write-Host "========================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Copiar archivo al servidor:" -ForegroundColor Yellow
    Write-Host "   scp `"$zipFile`" ${serverUser}@${serverIP}:/root/" -ForegroundColor White
    Write-Host "   Contraseña: $password" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Conectarse al servidor:" -ForegroundColor Yellow
    Write-Host "   ssh ${serverUser}@${serverIP}" -ForegroundColor White
    Write-Host "   Contraseña: $password" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. En el servidor ejecutar:" -ForegroundColor Yellow
    Write-Host "   cd /root" -ForegroundColor White
    Write-Host "   unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas" -ForegroundColor White
    Write-Host "   cd analisis-encuestas" -ForegroundColor White
    Write-Host "   chmod +x auto-deploy.sh" -ForegroundColor White
    Write-Host "   ./auto-deploy.sh" -ForegroundColor White
    Write-Host ""
}
