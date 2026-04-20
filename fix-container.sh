#!/bin/bash
# Script para ejecutar en el servidor

echo "=== Corrigiendo index.html en contenedor Docker ==="

# Copiar index.html actualizado al contenedor
docker cp /opt/analisis-encuestas/public/index.html analisis-encuestas:/app/public/index.html

# Eliminar cascade-filters.js del contenedor
docker exec analisis-encuestas rm -f /app/public/cascade-filters.js

# Verificar contenido del index.html
echo "Verificando index.html..."
docker exec analisis-encuestas grep -c "cascade-filters" /app/public/index.html || echo "✅ cascade-filters NO encontrado"

# Reiniciar contenedor
echo "Reiniciando contenedor..."
docker restart analisis-encuestas

# Esperar
sleep 8

# Verificar estado
echo "Estado del contenedor:"
docker ps --filter name=analisis --format 'table {{.Names}}\t{{.Status}}'

# Verificar HTTP
echo ""
echo "Estado HTTP:"
curl -s -o /dev/null -w 'HTTP %{http_code}\n' http://localhost:3000

echo ""
echo "✅ Script completado"
