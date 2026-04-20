# Test del FIX v1.5 en localhost

Write-Host "`n🧪 PROBANDO FIX v1.5 EN LOCALHOST" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$tests = @(
    @{
        name = "1. Solo negativas SIN 'sin embargo'"
        text = "poco productiva, limitada y deficiente"
        esperado = "Score: -11, Normalizado: 0.0, Muy Negativo"
    },
    @{
        name = "2. MISMO TEXTO CON 'sin embargo' (EL BUG)"
        text = "sin embargo, su forma es poco productiva, limitada y deficiente" 
        esperado = "Score: -11, Normalizado: 0.0, Muy Negativo (NO 10.0)"
    },
    @{
        name = "3. Tu texto completo con mezcla"
        text = "Confusa, desorganizada, lo que fue ensinado en clases estuvo alejado de lo cobrado en exámenes. La docente es simpática y educada, sin embargo, su forma de transmitir conocimento es poco productiva, limitada y deficiente"
        esperado = "Negativo o Muy Negativo (mayoría negativas)"
    },
    @{
        name = "4. Positivo con 'sin dudas'"
        text = "excelente profesora sin dudas"
        esperado = "Positivo o Muy Positivo (NO debe invertir por 'sin')"
    }
)

foreach ($test in $tests) {
    Write-Host $test.name -ForegroundColor Yellow
    Write-Host "  Texto: '$($test.text.Substring(0, [Math]::Min(60, $test.text.Length)))...'" -ForegroundColor Gray
    Write-Host "  Esperado: $($test.esperado)" -ForegroundColor Gray
    
    try {
        $body = @{text=$test.text} | ConvertTo-Json
        $response = Invoke-RestMethod -Uri 'http://localhost:3001/api/dictionary/test' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10
        
        $score = $response.analysis.score
        $normalized = $response.analysis.normalizedScore
        $classification = $response.analysis.classification
        $hasNegation = $response.analysis.hasNegation
        
        $color = 'Green'
        $icon = '✅'
        
        # Detectar si el bug está presente
        if ($test.name -match "MISMO TEXTO" -and $normalized -eq 10) {
            $color = 'Red'
            $icon = '❌ BUG PRESENTE'
        }
        
        Write-Host "  $icon Resultado: Score $score → Normalizado $normalized → $classification" -ForegroundColor $color
        Write-Host "     Negación detectada: $hasNegation" -ForegroundColor Gray
        Write-Host ""
        
    } catch {
        Write-Host "  ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
    }
}

Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Para detener el servidor:" -ForegroundColor Yellow
Write-Host "   Presiona Ctrl+C en la terminal donde corre 'node server.js'" -ForegroundColor Gray
Write-Host ""
