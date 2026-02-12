#!/bin/bash
# Script de deployment v1.4 en servidor remoto

echo "🚀 Iniciando deployment v1.4..."
cd /root/analisis-encuestas

echo "📦 Construyendo imagen Docker..."
docker build -t analisis-encuestas:latest .

if [ $? -ne 0 ]; then
    echo "❌ Error en build"
    exit 1
fi

echo "🛑 Deteniendo contenedor anterior..."
docker stop analisis-encuestas 2>/dev/null || true
docker rm analisis-encuestas 2>/dev/null || true

echo "🚀 Iniciando nuevo contenedor..."
docker run -d \
    --name analisis-encuestas \
    -p 3000:3000 \
    --restart unless-stopped \
    analisis-encuestas:latest

if [ $? -ne 0 ]; then
    echo "❌ Error al iniciar contenedor"
    exit 1
fi

echo ""
echo "✅ Deployment completado!"
echo ""
echo "📊 Estado del contenedor:"
docker ps | grep analisis-encuestas

echo ""
echo "📝 Últimos logs:"
docker logs analisis-encuestas --tail 10

echo ""
echo "🌐 Aplicación disponible en:"
echo "   http://192.168.30.12:3000"
echo "   https://itd.barcelo.edu.ar"
