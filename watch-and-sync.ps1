# Script de sincronización automática
$localPath = "C:\Users\Public\analisis-encuestas"
$serverIP = "192.168.30.12"
$serverUser = "root"
$serverPath = "/root/analisis-encuestas"

Write-Host "🔄 Sincronización automática activada" -ForegroundColor Cyan
Write-Host "Local:  $localPath" -ForegroundColor Gray
Write-Host "Remoto: ${serverUser}@${serverIP}:${serverPath}" -ForegroundColor Gray
Write-Host ""
Write-Host "Observando cambios... (Ctrl+C para detener)" -ForegroundColor Yellow
Write-Host ""

# Archivos a sincronizar
$filesToWatch = @(
    "server.js",
    "public\app.js",
    "public\styles.css",
    "public\index.html",
    "column-config.js",
    "sentiment-dict.js"
)

# Crear FileSystemWatcher para cada archivo importante
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $localPath
$watcher.IncludeSubdirectories = $true
$watcher.EnableRaisingEvents = $true

# Filtros para archivos relevantes
$watcher.Filter = "*.js"

# Función para sincronizar archivo
function Sync-File {
    param($file)
    
    $relativePath = $file.Replace($localPath + "\", "").Replace("\", "/")
    Write-Host "📤 Sincronizando: $relativePath" -ForegroundColor Yellow
    
    # Copiar archivo al servidor
    scp "$file" "${serverUser}@${serverIP}:${serverPath}/$relativePath"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✓ Sincronizado exitosamente" -ForegroundColor Green
        
        # Reiniciar servidor si es necesario (solo si cambió server.js)
        if ($file -like "*server.js") {
            Write-Host "   🔄 Reiniciando servidor..." -ForegroundColor Cyan
            ssh "${serverUser}@${serverIP}" "cd $serverPath && docker compose --profile prod restart"
        }
    } else {
        Write-Host "   ❌ Error al sincronizar" -ForegroundColor Red
    }
}

# Evento cuando se modifica un archivo
$onChange = Register-ObjectEvent $watcher Changed -Action {
    $file = $Event.SourceEventArgs.FullPath
    
    # Filtrar solo archivos relevantes
    if ($file -match "\.(js|css|html)$" -and $file -notmatch "node_modules") {
        Start-Sleep -Milliseconds 500  # Esperar a que termine de escribir
        & "$PSScriptRoot\watch-and-sync.ps1" -SyncFile $file
    }
}

Write-Host "Presiona Ctrl+C para detener..." -ForegroundColor Gray

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Unregister-Event -SourceIdentifier $onChange.Name
    $watcher.Dispose()
}
