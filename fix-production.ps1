# Script para diagnosticar y corregir errores en producción
$ErrorActionPreference = "Continue"

$plink = "$env:TEMP\plink.exe"
$password = 'PN4lG4gJqRWX5o$fJx2M1'
$server = "192.168.30.12"
$user = "root"

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  DIAGNOSTICO Y CORRECCION DE ERRORES" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# 1. Ver estado del contenedor
Write-Host "1. Estado del contenedor:" -ForegroundColor Yellow
$dockerStatus = & $plink -batch -pw $password "${user}@${server}" "docker ps -a | grep analisis"
Write-Host $dockerStatus
Write-Host ""

# 2. Ver logs del contenedor (últimas 30 líneas)
Write-Host "2. Logs del contenedor (ultimas 30 lineas):" -ForegroundColor Yellow
& $plink -batch -pw $password "${user}@${server}" "docker logs analisis-encuestas --tail 30 2>&1"
Write-Host ""

# 3. Verificar archivos de configuración
Write-Host "3. Archivos de configuracion:" -ForegroundColor Yellow
& $plink -batch -pw $password "${user}@${server}" "cd /opt/analisis-encuestas && ls -lh column-configs.json user-dictionary.json 2>/dev/null || echo 'No existen archivos de config'"
Write-Host ""

# 4. Verificar puerto 3000
Write-Host "4. Puerto 3000:" -ForegroundColor Yellow
& $plink -batch -pw $password "${user}@${server}" "netstat -tlnp | grep 3000"
Write-Host ""

# 5. Probar endpoint
Write-Host "5. Prueba de endpoint:" -ForegroundColor Yellow
& $plink -batch -pw $password "${user}@${server}" "curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3000"
Write-Host ""

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "¿Reiniciar contenedor? (S/N)" -ForegroundColor Yellow
$respuesta = Read-Host

if ($respuesta -eq "S" -or $respuesta -eq "s") {
    Write-Host ""
    Write-Host "Reiniciando contenedor..." -ForegroundColor Cyan
    
    # Detener contenedor actual
    Write-Host "  Deteniendo contenedor..." -ForegroundColor Yellow
    & $plink -batch -pw $password "${user}@${server}" "docker stop analisis-encuestas 2>/dev/null || true"
    
    # Eliminar contenedor
    Write-Host "  Eliminando contenedor..." -ForegroundColor Yellow
    & $plink -batch -pw $password "${user}@${server}" "docker rm analisis-encuestas 2>/dev/null || true"
    
    # Reconstruir y levantar
    Write-Host "  Reconstruyendo imagen..." -ForegroundColor Yellow
    & $plink -batch -pw $password "${user}@${server}" "cd /opt/analisis-encuestas && docker-compose build --no-cache"
    
    Write-Host "  Levantando contenedor..." -ForegroundColor Yellow
    & $plink -batch -pw $password "${user}@${server}" "cd /opt/analisis-encuestas && docker-compose up -d"
    
    Start-Sleep -Seconds 5
    
    Write-Host ""
    Write-Host "Verificando..." -ForegroundColor Cyan
    & $plink -batch -pw $password "${user}@${server}" "docker ps | grep analisis && curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3000"
    
    Write-Host ""
    Write-Host "✅ Contenedor reiniciado" -ForegroundColor Green
} else {
    Write-Host "Operacion cancelada" -ForegroundColor Gray
}

Write-Host ""
