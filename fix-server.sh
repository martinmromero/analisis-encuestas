#!/bin/bash
# Script de deployment ultra-rapido
# Ejecuta este script EN EL SERVIDOR

echo "==================================="
echo " FIX URGENTE - FILTROS"
echo "==================================="
echo ""

echo "[1/3] Eliminando archivo problematico..."
cd /opt/analisis-encuestas/public
rm -f cascade-filters.js
echo "✓ cascade-filters.js eliminado"

echo ""
echo "[2/3] Verificando archivos..."
ls -la dual-filters.js index.html app.js | head -5

echo ""
echo "[3/3] Reiniciando servidor..."
cd /opt/analisis-encuestas
docker-compose restart app-prod

echo ""
echo "==================================="
echo " ✅ FIX COMPLETADO"
echo "==================================="
echo ""
echo "Verifica en: https://itd.barcelo.edu.ar"
echo "Presiona Ctrl+Shift+R en el navegador"
echo ""
