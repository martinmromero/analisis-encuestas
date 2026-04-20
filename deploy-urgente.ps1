$ErrorActionPreference = "Stop"

$server = "192.168.30.12"
$user = "root"
$password = 'PN4lG4gJqRWX5o$fJx2M1'
$zipFile = "C:\Users\martin.romero\analisis-encuestas-main\analisis-encuestas-deploy.zip"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT URGENTE A PRODUCCION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe PuTTY
$puttyPath = "C:\Users\martin.romero\Downloads"
$pscp = Join-Path $puttyPath "pscp.exe"
$plink = Join-Path $puttyPath "plink.exe"

if ((Test-Path $pscp) -and (Test-Path $plink)) {
    Write-Host "[1/3] Subiendo archivo..." -ForegroundColor Yellow
    
    # Subir archivo
    $uploadCmd = "echo y | `"$pscp`" -batch -pw $password `"$zipFile`" ${user}@${server}:/root/"
    $output = cmd /c $uploadCmd 2>&1
    Write-Host $output
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[2/3] Descomprimiendo y copiando..." -ForegroundColor Yellow
        
        # Comandos remotos
        $commands = @(
            "cd /root",
            "rm -rf analisis-encuestas-deploy 2>/dev/null || true",
            "unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-deploy",
            "cp -r analisis-encuestas-deploy/public/* /opt/analisis-encuestas/public/",
            "cp analisis-encuestas-deploy/server.js /opt/analisis-encuestas/",
            "cd /opt/analisis-encuestas",
            "docker-compose restart app-prod",
            "docker-compose ps"
        )
        
        $remoteScript = $commands -join "; "
        $deployCmd = "echo y | `"$plink`" -batch -pw $password ${user}@${server} `"$remoteScript`""
        $output = cmd /c $deployCmd 2>&1
        Write-Host $output
        
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  ✅ DEPLOYMENT COMPLETADO" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "URL: https://itd.barcelo.edu.ar" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "IMPORTANTE: Presiona Ctrl+Shift+R en el navegador" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host "ERROR al subir archivo" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "PuTTY no esta instalado en: $puttyPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "DEPLOYMENT MANUAL:" -ForegroundColor Yellow
    Write-Host "==================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Usa WinSCP o scp para copiar:" -ForegroundColor White
    Write-Host "   $zipFile" -ForegroundColor Gray
    Write-Host "   a ${user}@${server}:/root/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Conecta por SSH:" -ForegroundColor White
    Write-Host "   ssh ${user}@${server}" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Ejecuta:" -ForegroundColor White
    Write-Host "   cd /root" -ForegroundColor Gray
    Write-Host "   unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-deploy" -ForegroundColor Gray
    Write-Host "   cp -r analisis-encuestas-deploy/public/* /opt/analisis-encuestas/public/" -ForegroundColor Gray
    Write-Host "   cp analisis-encuestas-deploy/server.js /opt/analisis-encuestas/" -ForegroundColor Gray
    Write-Host "   cd /opt/analisis-encuestas" -ForegroundColor Gray
    Write-Host "   docker-compose restart app-prod" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Password: $password" -ForegroundColor DarkGray
}
