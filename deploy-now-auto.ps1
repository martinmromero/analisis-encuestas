# Deployment automático URGENTE
$ErrorActionPreference = "Continue"

$server = "192.168.30.12"
$user = "root"
$pass = "PN4lG4gJqRWX5o`$fJx2M1"
$zipFile = "C:\Users\martin.romero\analisis-encuestas-main\analisis-encuestas-deploy.zip"

Write-Host "🚀 DEPLOYMENT AUTOMÁTICO" -ForegroundColor Cyan
Write-Host ""

# Crear script temporal con comandos SSH
$sshScript = @"
cd /opt/analisis-encuestas
echo '📦 Haciendo backup...'
cp -r public public.backup.`$(date +%s) 2>/dev/null || true
cp server.js server.js.backup.`$(date +%s) 2>/dev/null || true
echo '✅ Backup completado'
exit
"@

$deployScript = @"
cd /root
rm -rf analisis-encuestas-deploy 2>/dev/null || true
unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-deploy
echo '📂 Copiando archivos...'
cp -r analisis-encuestas-deploy/public/* /opt/analisis-encuestas/public/
cp analisis-encuestas-deploy/server.js /opt/analisis-encuestas/
cp analisis-encuestas-deploy/*.js /opt/analisis-encuestas/ 2>/dev/null || true
echo '✅ Archivos actualizados'
echo '🔄 Reiniciando Docker...'
cd /opt/analisis-encuestas
docker-compose restart app-prod
echo '✅ Servidor reiniciado'
docker-compose ps
exit
"@

$tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
$deployScriptFile = [System.IO.Path]::GetTempFileName() + ".sh"
Set-Content -Path $tempScript -Value $sshScript -Encoding ASCII
Set-Content -Path $deployScriptFile -Value $deployScript -Encoding ASCII

Write-Host "📤 Subiendo archivos..." -ForegroundColor Yellow

# Intentar con scp usando expect-like behavior con plink si existe
$puttyPath = "C:\Users\martin.romero\Downloads"
if (Test-Path "$puttyPath\pscp.exe") {
    Write-Host "Usando PuTTY PSCP..." -ForegroundColor Green
    $pscpExe = "$puttyPath\pscp.exe"
    $plinkExe = "$puttyPath\plink.exe"
    
    # Subir ZIP
    & cmd /c "echo y | `"$pscpExe`" -pw `"$pass`" `"$zipFile`" ${user}@${server}:/root/" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Archivo subido" -ForegroundColor Green
        Write-Host "🚀 Ejecutando deployment..." -ForegroundColor Yellow
        
        # Ejecutar deployment
        $remoteCmd = 'cd /root; unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-deploy; cp -r analisis-encuestas-deploy/public/* /opt/analisis-encuestas/public/; cp analisis-encuestas-deploy/server.js /opt/analisis-encuestas/; cd /opt/analisis-encuestas; docker-compose restart app-prod; docker-compose ps'
        & cmd /c "echo y | `"$plinkExe`" -pw `"$pass`" ${user}@${server} `"$remoteCmd`"" 2>&1
        
        Write-Host ""
        Write-Host "✅ DEPLOYMENT COMPLETADO" -ForegroundColor Green
        Write-Host "🌐 URL: https://itd.barcelo.edu.ar" -ForegroundColor Cyan
        Write-Host "⚠️  Presiona Ctrl+Shift+R en el navegador para limpiar caché" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  PuTTY no encontrado. Intenta instalar WinSCP o PuTTY" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "COMANDO MANUAL:" -ForegroundColor Cyan
    Write-Host "1. Descarga WinSCP: https://winscp.net/" -ForegroundColor White
    Write-Host "2. O ejecuta manualmente:" -ForegroundColor White
    Write-Host "   scp `"$zipFile`" ${user}@${server}:/root/" -ForegroundColor Gray
    Write-Host "   ssh ${user}@${server}" -ForegroundColor Gray
    Write-Host "   Luego ejecuta estos comandos en el servidor:" -ForegroundColor White
    Write-Host "   cd /root" -ForegroundColor Gray
    Write-Host "   unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-deploy" -ForegroundColor Gray
    Write-Host "   cp -r analisis-encuestas-deploy/public/* /opt/analisis-encuestas/public/" -ForegroundColor Gray
    Write-Host "   cp analisis-encuestas-deploy/server.js /opt/analisis-encuestas/" -ForegroundColor Gray
    Write-Host "   cd /opt/analisis-encuestas" -ForegroundColor Gray
    Write-Host "   docker-compose restart app-prod" -ForegroundColor Gray
    Write-Host ""
    Write-Host 'Password: PN4lG4gJqRWX5o$fJx2M1' -ForegroundColor Gray
}

Remove-Item $tempScript -ErrorAction SilentlyContinue
Remove-Item $deployScriptFile -ErrorAction SilentlyContinue
