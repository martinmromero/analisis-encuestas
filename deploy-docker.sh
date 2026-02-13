#!/bin/bash
# Deployment automático desde GitHub al Docker existente
# Servidor: itd.barcelo.edu.ar (192.168.30.12)

set -e

echo "🚀 Deployment - Análisis de Encuestas"
echo "========================================"
echo ""

# Directorio de la aplicación
APP_DIR="/var/www/analisis-encuestas"
cd "$APP_DIR" || { echo "❌ Error: Directorio $APP_DIR no encontrado"; exit 1; }

echo "📂 Directorio: $APP_DIR"
echo ""

# 1. Hacer backup de archivos críticos
echo "💾 Creando backup de archivos de producción..."
BACKUP_DIR="/tmp/backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cp -f column-configs.json "$BACKUP_DIR/" 2>/dev/null && echo "  ✓ column-configs.json" || echo "  - column-configs.json (no existe)"
cp -f user-dictionary.json "$BACKUP_DIR/" 2>/dev/null && echo "  ✓ user-dictionary.json" || echo "  - user-dictionary.json (no existe)"
cp -r dictionaries "$BACKUP_DIR/" 2>/dev/null && echo "  ✓ dictionaries/" || echo "  - dictionaries/ (no existe)"
cp -r uploads "$BACKUP_DIR/" 2>/dev/null && echo "  ✓ uploads/" || echo "  - uploads/ (no existe)"

echo "✅ Backup en: $BACKUP_DIR"
echo ""

# 2. Actualizar código desde GitHub
echo "📥 Descargando última versión desde GitHub..."
git fetch origin
git reset --hard origin/main
echo "✅ Código actualizado"
echo ""

# 3. Restaurar archivos de producción
echo "🔄 Restaurando archivos de producción..."
cp -f "$BACKUP_DIR/column-configs.json" ./ 2>/dev/null && echo "  ✓ column-configs.json" || echo "  - column-configs.json (no había backup)"
cp -f "$BACKUP_DIR/user-dictionary.json" ./ 2>/dev/null && echo "  ✓ user-dictionary.json" || echo "  - user-dictionary.json (no había backup)"
cp -r "$BACKUP_DIR/dictionaries" ./ 2>/dev/null && echo "  ✓ dictionaries/" || echo "  - dictionaries/ (no había backup)"
cp -r "$BACKUP_DIR/uploads" ./ 2>/dev/null && echo "  ✓ uploads/" || echo "  - uploads/ (no había backup)"
echo "✅ Archivos restaurados"
echo ""

# 4. Reconstruir y reiniciar Docker
echo "🐳 Reconstruyendo contenedor Docker..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "✅ DEPLOYMENT COMPLETADO"
echo "========================================"
echo "🌐 Servidor: http://itd.barcelo.edu.ar"
echo "📊 Backup: $BACKUP_DIR"
echo ""
echo "Verificar logs:"
echo "  docker-compose logs -f"
