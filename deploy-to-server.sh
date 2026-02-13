#!/bin/bash
# Script de Deployment para itd.barcelo.edu.ar
# NO instala herramientas nuevas, solo actualiza código y reinicia Docker

set -e

echo "🚀 Iniciando deployment..."

# Variables
APP_DIR="/var/www/analisis-encuestas"
BACKUP_DIR="/tmp/backup-analisis-$(date +%Y%m%d-%H%M%S)"

# 1. Crear backup de archivos críticos de producción
echo "📦 Creando backup de archivos críticos..."
mkdir -p "$BACKUP_DIR"
cd "$APP_DIR"

# Backup de archivos que NO deben ser sobrescritos
if [ -f "column-configs.json" ]; then
    cp column-configs.json "$BACKUP_DIR/"
    echo "  ✓ Backup: column-configs.json"
fi

if [ -f "user-dictionary.json" ]; then
    cp user-dictionary.json "$BACKUP_DIR/"
    echo "  ✓ Backup: user-dictionary.json"
fi

if [ -d "dictionaries" ]; then
    cp -r dictionaries "$BACKUP_DIR/"
    echo "  ✓ Backup: dictionaries/"
fi

if [ -d "uploads" ]; then
    cp -r uploads "$BACKUP_DIR/"
    echo "  ✓ Backup: uploads/"
fi

echo "✅ Backup creado en: $BACKUP_DIR"

# 2. Descomprimir nuevos archivos (sobrescribe solo código fuente)
echo "📂 Descomprimiendo archivos nuevos..."
unzip -o /tmp/deployment-package.zip -d "$APP_DIR"
echo "✅ Archivos actualizados"

# 3. Restaurar archivos críticos de producción
echo "🔄 Restaurando configuraciones de producción..."
if [ -f "$BACKUP_DIR/column-configs.json" ]; then
    cp "$BACKUP_DIR/column-configs.json" "$APP_DIR/"
    echo "  ✓ Restaurado: column-configs.json"
fi

if [ -f "$BACKUP_DIR/user-dictionary.json" ]; then
    cp "$BACKUP_DIR/user-dictionary.json" "$APP_DIR/"
    echo "  ✓ Restaurado: user-dictionary.json"
fi

if [ -d "$BACKUP_DIR/dictionaries" ]; then
    cp -r "$BACKUP_DIR/dictionaries" "$APP_DIR/"
    echo "  ✓ Restaurado: dictionaries/"
fi

if [ -d "$BACKUP_DIR/uploads" ]; then
    cp -r "$BACKUP_DIR/uploads" "$APP_DIR/"
    echo "  ✓ Restaurado: uploads/"
fi

# 4. Reiniciar contenedor Docker
echo "🐳 Reiniciando contenedor Docker..."
cd "$APP_DIR"
docker-compose down
docker-compose up -d --build

echo "✅ Deployment completado exitosamente!"
echo "📊 El servidor está corriendo en: http://itd.barcelo.edu.ar"
echo ""
echo "📌 Backup guardado en: $BACKUP_DIR"
