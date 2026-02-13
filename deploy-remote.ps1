# Script de deployment remoto al servidor Docker
# Ejecuta el deployment desde GitHub en el servidor itd.barcelo.edu.ar

$server = "192.168.30.12"
$user = "root"
$password = "PN4lG4gJqRWX5o`$fJx2M1"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  DEPLOYMENT AL SERVIDOR ITD BARCELO" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Servidor: $server" -ForegroundColor Yellow
Write-Host "Usuario: $user" -ForegroundColor Yellow
Write-Host ""

# 1. Crear el script de deployment en el servidor
Write-Host "📝 Creando script de deployment en servidor..." -ForegroundColor Cyan

$deployScript = @'
#!/bin/bash
set -e
APP_DIR="/var/www/analisis-encuestas"
cd "$APP_DIR" || { echo "Error: Directorio no encontrado"; exit 1; }
echo "Creando backup..."
BACKUP_DIR="/tmp/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -f column-configs.json "$BACKUP_DIR/" 2>/dev/null || true
cp -f user-dictionary.json "$BACKUP_DIR/" 2>/dev/null || true
cp -r dictionaries "$BACKUP_DIR/" 2>/dev/null || true
cp -r uploads "$BACKUP_DIR/" 2>/dev/null || true
echo "Actualizando desde GitHub..."
git fetch origin
git reset --hard origin/main
echo "Restaurando archivos de producción..."
cp -f "$BACKUP_DIR/column-configs.json" ./ 2>/dev/null || true
cp -f "$BACKUP_DIR/user-dictionary.json" ./ 2>/dev/null || true
cp -r "$BACKUP_DIR/dictionaries" ./ 2>/dev/null || true
cp -r "$BACKUP_DIR/uploads" ./ 2>/dev/null || true
echo "Reconstruyendo Docker..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d
echo "DEPLOYMENT COMPLETADO"
echo "Backup en: $BACKUP_DIR"
'@

# Guardar script temporal
$tempScript = "deploy-temp.sh"
$deployScript | Out-File -FilePath $tempScript -Encoding ASCII

Write-Host "✅ Script creado" -ForegroundColor Green
Write-Host ""

# 2. Subir script al servidor
Write-Host "📤 Subiendo script al servidor..." -ForegroundColor Cyan
Write-Host "Password: $password" -ForegroundColor Gray
Write-Host ""

& scp $tempScript "${user}@${server}:/tmp/deploy-docker.sh"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Script transferido" -ForegroundColor Green
    Write-Host ""
    
    # 3. Ejecutar deployment en el servidor
    Write-Host "🚀 Ejecutando deployment en servidor..." -ForegroundColor Cyan
    Write-Host "Password: $password" -ForegroundColor Gray
    Write-Host ""
    
    & ssh "${user}@${server}" "chmod +x /tmp/deploy-docker.sh && /tmp/deploy-docker.sh"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "  ✅ DEPLOYMENT EXITOSO" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Sitio: http://itd.barcelo.edu.ar" -ForegroundColor Yellow
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Error ejecutando deployment" -ForegroundColor Red
        Write-Host ""
    }
} else {
    Write-Host ""
    Write-Host "❌ Error transfiriendo script" -ForegroundColor Red
    Write-Host ""
}

# Limpiar archivo temporal
Remove-Item $tempScript -ErrorAction SilentlyContinue

Write-Host "Presiona ENTER para cerrar..." -ForegroundColor Gray
Read-Host
