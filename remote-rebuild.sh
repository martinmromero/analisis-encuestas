#!/bin/bash
# Script de reconstrucción completa
set -e

echo "========================================="
echo "  RECONSTRUCCION DE CONTENEDOR"
echo "========================================="
echo ""

cd /opt/analisis-encuestas

echo "1. Deteniendo contenedores..."
docker-compose down 2>&1

echo ""
echo "2. Limpiando contenedor anterior..."
docker rm -f analisis-encuestas 2>/dev/null || true

echo ""
echo "3. Reconstruyendo imagen (sin cache)..."
docker-compose build --no-cache 2>&1 | tail -20

echo ""
echo "4. Levantando contenedor..."
docker-compose up -d 2>&1

echo ""
echo "5. Esperando 15 segundos..."
sleep 15

echo ""
echo "6. Estado del contenedor:"
docker ps | grep analisis || echo "ERROR: Contenedor no encontrado"

echo ""
echo "7. Logs (ultimas 25 lineas):"
docker logs analisis-encuestas --tail 25 2>&1

echo ""
echo "8. Test HTTP:"
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000)
echo "HTTP $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "========================================="
    echo "  ✅ SERVIDOR FUNCIONANDO CORRECTAMENTE"
    echo "========================================="
    exit 0
else
    echo ""
    echo "========================================="
    echo "  ❌ ERROR: Servidor no responde"
    echo "========================================="
    exit 1
fi
