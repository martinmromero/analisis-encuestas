# Script de inicio rapido para el proyecto de Analisis de Encuestas
# Resuelve problemas de directorio y ejecuta el servidor

Write-Host "Iniciando Analisis de Encuestas..." -ForegroundColor Green

# Cambiar al directorio correcto
$projectPath = "C:\Users\Public\analisis-encuestas"
Set-Location $projectPath

Write-Host "Directorio actual: $(Get-Location)" -ForegroundColor Yellow

# Verificar que el servidor existe
if (Test-Path "server.js") {
    Write-Host "Archivo server.js encontrado" -ForegroundColor Green
    
    # Matar procesos previos en puerto 3000
    try {
        $processes = netstat -ano | findstr :3000
        if ($processes) {
            Write-Host "Terminando procesos previos en puerto 3000..." -ForegroundColor Yellow
            $processes | ForEach-Object {
                $processId = ($_ -split '\s+')[-1]
                if ($processId -match '^\d+$') {
                    taskkill /PID $processId /F 2>$null
                }
            }
        }
    } catch {
        Write-Host "No hay procesos previos en puerto 3000" -ForegroundColor Cyan
    }
    
    # Ejecutar servidor
    Write-Host "Iniciando servidor en http://localhost:3000..." -ForegroundColor Green
    node server.js
} else {
    Write-Host "Error: No se encontro server.js en $projectPath" -ForegroundColor Red
    Write-Host "Contenido del directorio:" -ForegroundColor Yellow
    Get-ChildItem
}