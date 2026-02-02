# Deployment simplificado
$serverIP = "192.168.30.12"
$serverUser = "root"
$password = "PN4lG4gJqRWX5o`$fJx2M1"

# Rutas de PuTTY
$puttyPath = "C:\Users\martin.romero\Downloads"
$pscp = "$puttyPath\pscp.exe"
$plink = "$puttyPath\plink.exe"

Write-Host "Deployment a $serverIP" -ForegroundColor Cyan

$zipFile = "C:\Users\Public\analisis-encuestas\analisis-encuestas-deploy.zip"

if (-not (Test-Path $zipFile)) {
    Write-Host "Preparando archivos..." -ForegroundColor Yellow
    & .\prepare-deployment.ps1
}

if (Test-Path $pscp) {
    Write-Host "Copiando archivos..." -ForegroundColor Yellow
    $pscpCmd = "echo y | `"$pscp`" -pw `"$password`" `"$zipFile`" ${serverUser}@${serverIP}:/root/"
    Invoke-Expression $pscpCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Ejecutando deployment..." -ForegroundColor Yellow
        $cmd = "cd /root; unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas; cd analisis-encuestas; chmod +x auto-deploy.sh; ./auto-deploy.sh"
        $plinkCmd = "echo y | `"$plink`" -pw `"$password`" ${serverUser}@${serverIP} `"$cmd`""
        Invoke-Expression $plinkCmd
        
        Write-Host ""
        Write-Host "Deployment completado!" -ForegroundColor Green
        Write-Host "URL: http://${serverIP}:3000" -ForegroundColor Cyan
    }
} else {
    Write-Host ""
    Write-Host "PuTTY no instalado. Instrucciones manuales:" -ForegroundColor Yellow
    Write-Host "1. scp $zipFile ${serverUser}@${serverIP}:/root/" -ForegroundColor White
    Write-Host "2. ssh ${serverUser}@${serverIP}" -ForegroundColor White  
    Write-Host "3. cd /root && unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas && cd analisis-encuestas && chmod +x auto-deploy.sh && ./auto-deploy.sh" -ForegroundColor White
    Write-Host ""
    Write-Host "Password: $password" -ForegroundColor Gray
}
