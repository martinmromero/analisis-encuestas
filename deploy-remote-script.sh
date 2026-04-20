#!/bin/bash
set -e
echo "=== PASO 1: Backup ==="
BACKUP_DIR=/root/analisis-encuestas-backup-$(date +%Y%m%d-%H%M%S)
cp -r /root/analisis-encuestas $BACKUP_DIR
echo "Backup creado: $BACKUP_DIR"

echo "=== PASO 2: Descomprimir nuevo ZIP ==="
cd /root
rm -rf /root/analisis-encuestas-NEW
mkdir /root/analisis-encuestas-NEW
unzip -q analisis-encuestas-deploy.zip -d /root/analisis-encuestas-NEW
echo "ZIP descomprimido"

echo "=== PASO 3: Copiar nuevos archivos ==="
cp /root/analisis-encuestas-NEW/server.js /root/analisis-encuestas/server.js
cp /root/analisis-encuestas-NEW/package.json /root/analisis-encuestas/package.json
cp /root/analisis-encuestas-NEW/package-lock.json /root/analisis-encuestas/package-lock.json
cp /root/analisis-encuestas-NEW/Dockerfile /root/analisis-encuestas/Dockerfile
cp /root/analisis-encuestas-NEW/docker-compose.yml /root/analisis-encuestas/docker-compose.yml
cp /root/analisis-encuestas-NEW/sentiment-dict.js /root/analisis-encuestas/sentiment-dict.js
cp /root/analisis-encuestas-NEW/column-config.js /root/analisis-encuestas/column-config.js
cp /root/analisis-encuestas-NEW/ignored-phrases.json /root/analisis-encuestas/ignored-phrases.json
cp -r /root/analisis-encuestas-NEW/public/. /root/analisis-encuestas/public/
echo "Archivos copiados"

echo "=== PASO 4: Reconstruir imagen Docker ==="
cd /root/analisis-encuestas
docker-compose build app

echo "=== PASO 5: Reiniciar contenedor ==="
docker-compose --profile prod up -d --force-recreate

echo "=== LISTO ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
