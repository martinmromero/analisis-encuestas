# Script de verificación de deployment
$ErrorActionPreference = "Continue"

$plinkPath = "$env:TEMP\plink.exe"
$password = 'PN4lG4gJqRWX5o$fJx2M1'
$server = "192.168.30.12"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  VERIFICACION DE DEPLOYMENT" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Servidor: $server" -ForegroundColor White
Write-Host ""

# 1. Verificar contenedores Docker
Write-Host "1. Contenedores Docker:" -ForegroundColor Yellow
$dockerCmd = "docker ps --format 'Nombre: {{.Names}} | Estado: {{.Status}} | Puertos: {{.Ports}}' 2>&1"
$dockerResult = & $plinkPath -batch -pw $password "root@$server" $dockerCmd 2>&1
if ($dockerResult -match "analisis") {
    Write-Host "   ✅ Contenedor encontrado" -ForegroundColor Green
    $dockerResult | Where-Object { $_ -match "analisis" } | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "   ❌ No se encontró contenedor" -ForegroundColor Red
   Write-Host "   $dockerResult" -ForegroundColor Gray
}

Write-Host ""

# 2. Verificar respuesta HTTP
Write-Host "2. Respuesta HTTP (desde servidor):" -ForegroundColor Yellow
$httpCmd = "curl -s -o /dev/null -w 'HTTP %{http_code}' http://localhost:3000 2>&1"
$httpResult = & $plinkPath -batch -pw $password "root@$server" $httpCmd 2>&1
if ($httpResult -match "200") {
    Write-Host "   ✅ Servidor respondiendo: $httpResult" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Respuesta: $httpResult" -ForegroundColor Yellow
}

Write-Host ""

# 3. Verificar archivos preservados
Write-Host "3. Archivos de producción preservados:" -ForegroundColor Yellow
$filesCmd = "cd /opt/analisis-encuestas && ls -lh column-configs.json user-dictionary.json 2>/dev/null | tail -2"
$filesResult = & $plinkPath -batch -pw $password "root@$server" $filesCmd 2>&1
if ($filesResult) {
    Write-Host "   ✅ Archivos presentes" -ForegroundColor Green
    $filesResult | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
} else {
    Write-Host "  ⚠️  No se encontraron archivos (pueden no existir aún)" -ForegroundColor Yellow
}

Write-Host ""

# 4. Prueba de conexión externa
Write-Host "4. Prueba de conexión externa:" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://$server:3000" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Accesible desde esta PC: HTTP $($response.StatusCode)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ No accesible: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "URL: http://itd.barcelo.edu.ar:3000" -ForegroundColor White
Write-Host "     http://192.168.30.12:3000" -ForegroundColor Gray
Write-Host ""
