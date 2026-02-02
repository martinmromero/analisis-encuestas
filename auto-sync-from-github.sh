#!/bin/bash
# Script de auto-actualización desde GitHub
# Ejecutar cada 2 minutos con cron

cd /root/analisis-encuestas

# Verificar si hay cambios en GitHub
git fetch origin main

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "📥 Nuevos cambios detectados en GitHub"
    
    # Descargar cambios
    git pull origin main
    
    # Reconstruir y reiniciar contenedor
    echo "🔧 Reconstruyendo aplicación..."
    docker compose --profile prod down
    docker compose --profile prod build --no-cache
    docker compose --profile prod up -d
    
    echo "✅ Deployment completado - $(date)"
else
    echo "✓ Sin cambios - $(date)"
fi
