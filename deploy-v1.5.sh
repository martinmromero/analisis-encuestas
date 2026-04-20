#!/bin/bash
# Script de deployment para v1.5 - FIX CRÍTICO

echo "🚀 DEPLOYMENT v1.5 - Fix inversión de score"
echo "==========================================="
echo ""

cd /root/analisis-encuestas || exit 1

echo "📥 1. Actualizando código desde GitHub..."
git pull origin main

echo ""
echo "🔄 2. Reiniciando container Docker..."
docker restart analisis-encuestas

echo ""
echo "⏳ Esperando que el servidor inicie..."
sleep 5

echo ""
echo "✅ 3. Verificando que el servidor está corriendo..."
docker ps | grep analisis-encuestas

echo ""
echo "📊 4. Verificando logs..."
docker logs analisis-encuestas --tail 20

echo ""
echo "🧪 5. Probando el FIX..."
echo "   Texto: 'sin embargo, poco productiva, limitada y deficiente'"

curl -s -X POST http://localhost:3000/api/dictionary/test \
  -H "Content-Type: application/json" \
  -d '{"text":"sin embargo, poco productiva, limitada y deficiente"}' \
  | jq '.analysis | {score, normalizedScore, classification, hasNegation}'

echo ""
echo "==========================================="
echo "✅ DEPLOYMENT COMPLETADO"
echo ""
echo "Esperado: score -11, normalizedScore 0, Muy Negativo"
echo "Si ves Muy Positivo (10), el fix NO se aplicó"
