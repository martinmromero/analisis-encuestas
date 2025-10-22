Write-Host "Configurando Python para Analisis de Sentimientos" -ForegroundColor Cyan
Write-Host ""

# Verificar Python
try {
    $output = python --version 2>&1
    if ($output -match "Python") {
        Write-Host "Python encontrado: $output" -ForegroundColor Green
        
        # Instalar paquetes
        Write-Host "Instalando dependencias..." -ForegroundColor Yellow
        python -m pip install textblob vaderSentiment spacy spacytextblob
        
        # Descargar modelo spaCy
        Write-Host "Descargando modelo de spaCy..." -ForegroundColor Yellow
        python -m spacy download es_core_news_sm
        
        Write-Host "Instalacion completada!" -ForegroundColor Green
        
    } else {
        Write-Host "Python no encontrado - solo alias de Windows Store" -ForegroundColor Red
        Write-Host "Instala Python real con: winget install Python.Python.3.12" -ForegroundColor Yellow
        Write-Host "Luego reinicia PowerShell y ejecuta este script nuevamente" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error verificando Python" -ForegroundColor Red
    Write-Host "Instala Python desde: https://python.org" -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Presiona Enter para continuar"