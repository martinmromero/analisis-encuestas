#!/bin/bash
# Script de diagnóstico para el servidor

echo "========================================="
echo "  DIAGNÓSTICO DEL SERVIDOR"
echo "========================================="
echo ""

echo "1. Estado del contenedor Docker:"
echo "---------------------------------"
docker ps -a | grep analisis
echo ""

echo "2. Logs recientes:"
echo "---------------------------------"
docker compose --profile prod logs --tail=20
echo ""

echo "3. Archivos de diccionario en el contenedor:"
echo "---------------------------------"
docker exec analisis-encuestas ls -la /app/*dict* 2>/dev/null || echo "No encontrados"
docker exec analisis-encuestas ls -la /app/dictionaries/ 2>/dev/null || echo "Directorio dictionaries no encontrado"
echo ""

echo "4. Archivos JSON en /data (volumen persistente):"
echo "---------------------------------"
docker exec analisis-encuestas ls -la /data/ 2>/dev/null || echo "Directorio /data no encontrado"
echo ""

echo "5. Prueba de conectividad:"
echo "---------------------------------"
curl -s http://localhost:3000 | head -5
echo ""

echo "6. Volúmenes Docker:"
echo "---------------------------------"
docker volume ls | grep analisis
echo ""

echo "7. Inspección de volúmenes montados:"
echo "---------------------------------"
docker inspect analisis-encuestas | grep -A 20 Mounts
echo ""
