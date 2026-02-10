# Script de configuración de Docker para analisis-encuestas
# Este script ayuda a iniciar la aplicación en Docker Desktop

Write-Host "🐳 Configuración de Docker para Análisis de Encuestas" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Docker esté corriendo
Write-Host "1. Verificando Docker..." -ForegroundColor Yellow
try {
    docker info > $null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
        Write-Host "   Abre Docker Desktop y espera a que se inicie completamente." -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ Docker está corriendo" -ForegroundColor Green
} catch {
    Write-Host "❌ Error al verificar Docker: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "2. ¿Qué modo deseas usar?" -ForegroundColor Yellow
Write-Host "   [D] Desarrollo (con hot-reload para editar código)" -ForegroundColor Cyan
Write-Host "   [P] Producción (optimizado, sin hot-reload)" -ForegroundColor Cyan
Write-Host ""
$mode = Read-Host "Selecciona modo (D/P)"

if ($mode -eq "D" -or $mode -eq "d") {
    Write-Host ""
    Write-Host "🔧 Iniciando en modo DESARROLLO..." -ForegroundColor Cyan
    Write-Host ""
    
    # Detener contenedores existentes
    Write-Host "Deteniendo contenedores previos..." -ForegroundColor Yellow
    docker compose --profile dev down 2>$null
    
    # Construir y ejecutar
    Write-Host "Construyendo imagen de desarrollo..." -ForegroundColor Yellow
    docker compose --profile dev build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Iniciando contenedor de desarrollo..." -ForegroundColor Yellow
        docker compose --profile dev up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ ¡Aplicación iniciada exitosamente!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Información:" -ForegroundColor Cyan
            Write-Host "   - URL: http://localhost:3000" -ForegroundColor White
            Write-Host "   - Contenedor: analisis-encuestas-dev" -ForegroundColor White
            Write-Host "   - Hot-reload: Activado (los cambios se reflejan automáticamente)" -ForegroundColor White
            Write-Host ""
            Write-Host "📝 Comandos útiles:" -ForegroundColor Cyan
            Write-Host "   Ver logs:    docker compose --profile dev logs -f" -ForegroundColor White
            Write-Host "   Detener:     docker compose --profile dev down" -ForegroundColor White
            Write-Host "   Reiniciar:   docker compose --profile dev restart" -ForegroundColor White
            Write-Host ""
            
            # Preguntar si abrir el navegador
            $open = Read-Host "¿Abrir en el navegador? (S/N)"
            if ($open -eq "S" -or $open -eq "s") {
                Start-Process "http://localhost:3000"
            }
        }
    }
    
} elseif ($mode -eq "P" -or $mode -eq "p") {
    Write-Host ""
    Write-Host "🚀 Iniciando en modo PRODUCCIÓN..." -ForegroundColor Cyan
    Write-Host ""
    
    # Detener contenedores existentes
    Write-Host "Deteniendo contenedores previos..." -ForegroundColor Yellow
    docker compose --profile prod down 2>$null
    
    # Construir y ejecutar
    Write-Host "Construyendo imagen de producción..." -ForegroundColor Yellow
    docker compose --profile prod build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Iniciando contenedor de producción..." -ForegroundColor Yellow
        docker compose --profile prod up -d
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "✅ ¡Aplicación iniciada exitosamente!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📋 Información:" -ForegroundColor Cyan
            Write-Host "   - URL: http://localhost:3000" -ForegroundColor White
            Write-Host "   - Contenedor: analisis-encuestas" -ForegroundColor White
            Write-Host "   - Modo: Producción (optimizado)" -ForegroundColor White
            Write-Host "   - Reinicio automático: Activado" -ForegroundColor White
            Write-Host ""
            Write-Host "📝 Comandos útiles:" -ForegroundColor Cyan
            Write-Host "   Ver logs:    docker compose --profile prod logs -f" -ForegroundColor White
            Write-Host "   Detener:     docker compose --profile prod down" -ForegroundColor White
            Write-Host "   Reiniciar:   docker compose --profile prod restart" -ForegroundColor White
            Write-Host ""
            
            # Preguntar si abrir el navegador
            $open = Read-Host "¿Abrir en el navegador? (S/N)"
            if ($open -eq "S" -or $open -eq "s") {
                Start-Process "http://localhost:3000"
            }
        }
    }
} else {
    Write-Host "❌ Opción no válida" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Presiona cualquier tecla para salir..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
