# Script para preparar archivos para deployment
Write-Host "Preparando archivos para deployment..." -ForegroundColor Cyan
Write-Host ""

$projectPath = $PSScriptRoot
$zipName = "analisis-encuestas-deploy.zip"
$zipPath = Join-Path $projectPath $zipName

$itemsToInclude = @(
    "server.js",
    "package.json",
    "package-lock.json",
    "Dockerfile",
    "docker-compose.yml",
    ".dockerignore",
    "sentiment-dict.js",
    "column-config.js",
    # ❌ NO INCLUIR: "user-dictionary.json" - Se mantiene en producción
    # ❌ NO INCLUIR: "column-configs.json" - Se mantiene en producción
    "ignored-phrases.json",
    # ❌ NO INCLUIR: "dictionaries" - Se mantienen en producción
    "public",
    "auto-deploy.sh",
    "verify-server.sh"
)

$tempDir = Join-Path $env:TEMP "analisis-encuestas-deploy"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copiando archivos..." -ForegroundColor Yellow
foreach ($item in $itemsToInclude) {
    $sourcePath = Join-Path $projectPath $item
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $tempDir $item
        if (Test-Path $sourcePath -PathType Container) {
            Copy-Item $sourcePath -Destination $destPath -Recurse -Force
            Write-Host "  OK: $item/" -ForegroundColor Green
        } else {
            Copy-Item $sourcePath -Destination $destPath -Force
            Write-Host "  OK: $item" -ForegroundColor Green
        }
    }
}

$uploadsDir = Join-Path $tempDir "uploads"
New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
New-Item -ItemType File -Path (Join-Path $uploadsDir ".gitkeep") -Force | Out-Null
Write-Host "  OK: uploads/ (vacio)" -ForegroundColor Green

Write-Host ""
Write-Host "Creando archivo ZIP..." -ForegroundColor Yellow
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

Remove-Item $tempDir -Recurse -Force

if (Test-Path $zipPath) {
    $zipSize = (Get-Item $zipPath).Length / 1MB
    Write-Host ""
    Write-Host "EXITO: Archivo creado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Archivo: $zipName" -ForegroundColor Cyan
    Write-Host "Ruta: $zipPath" -ForegroundColor Cyan
    Write-Host "Tamano: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "PROXIMOS PASOS:" -ForegroundColor Yellow
    Write-Host "===============" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Copiar al servidor:" -ForegroundColor White
    Write-Host "   scp '$zipPath' root@192.168.30.12:/opt/" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. En el servidor ejecutar:" -ForegroundColor White
    Write-Host "   cd /opt" -ForegroundColor Gray
    Write-Host "   unzip $zipName -d analisis-encuestas" -ForegroundColor Gray
    Write-Host "   cd analisis-encuestas" -ForegroundColor Gray
    Write-Host "   chmod +x auto-deploy.sh" -ForegroundColor Gray
    Write-Host "   ./auto-deploy.sh" -ForegroundColor Gray
    Write-Host ""
    
    $openFolder = Read-Host "Abrir carpeta del archivo? (S/N)"
    if ($openFolder -eq "S" -or $openFolder -eq "s") {
        explorer.exe "/select,$zipPath"
    }
} else {
    Write-Host "ERROR: No se pudo crear el archivo ZIP" -ForegroundColor Red
}

Write-Host ""
Write-Host "Presiona Enter para continuar..."
Read-Host
