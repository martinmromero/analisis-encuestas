# Script de deployment para Windows
# v1.5 - FIX CRÍTICO de inversión de score

Write-Host "`n🚀 DEPLOYMENT v1.5 - Fix inversión de score" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Instrucciones para el usuario
Write-Host "📋 INSTRUCCIONES:" -ForegroundColor Yellow  
Write-Host ""
Write-Host "1. Conectate al servidor:" -ForegroundColor White
Write-Host "   ssh root@192.168.30.12" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Ejecutá estos comandos:" -ForegroundColor White  
Write-Host ""
Write-Host "   cd /root/analisis-encuestas" -ForegroundColor Gray
Write-Host "   git pull origin main" -ForegroundColor Gray
Write-Host "   docker restart analisis-encuestas" -ForegroundColor Gray
Write-Host "   docker logs analisis-encuestas --tail 20" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Probá el fix:" -ForegroundColor White
Write-Host ""
$testCommand = @'
curl -s -X POST http://localhost:3000/api/dictionary/test \
  -H "Content-Type: application/json" \
  -d '{"text":"sin embargo, poco productiva, limitada y deficiente"}' \
  | jq '.analysis | {score, normalizedScore, classification}'
'@
Write-Host "   $testCommand" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ RESULTADO ESPERADO:" -ForegroundColor Green
Write-Host "   score: -11" -ForegroundColor White
Write-Host "   normalizedScore: 0" -ForegroundColor White  
Write-Host "   classification: Muy Negativo" -ForegroundColor White
Write-Host ""
Write-Host "❌ Si ves normalizedScore: 10 y Muy Positivo, el fix NO se aplicó" -ForegroundColor Red
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
