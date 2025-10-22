# Script para instalar Python y dependencias necesarias para análisis de sentimiento

Write-Host "🐍 Instalando Python y dependencias para análisis de sentimiento..." -ForegroundColor Cyan

# Verificar si Python ya está instalado
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -match "Python") {
        Write-Host "✅ Python ya está instalado: $pythonVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Python no encontrado. Instalando desde Microsoft Store..." -ForegroundColor Yellow
    
    # Instalar Python desde Microsoft Store
    try {
        Start-Process "ms-windows-store://pdp/?ProductId=9NRWMJP3717K" -Wait
        Write-Host "📦 Se abrió Microsoft Store. Por favor instala Python 3.11 manualmente y luego ejecuta este script nuevamente." -ForegroundColor Yellow
        Read-Host "Presiona Enter cuando hayas instalado Python"
    } catch {
        Write-Host "❌ Error abriendo Microsoft Store. Por favor instala Python manualmente desde https://python.org" -ForegroundColor Red
        Read-Host "Presiona Enter cuando hayas instalado Python"
    }
}

# Verificar Python nuevamente
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python disponible: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python aún no está disponible. Saliendo..." -ForegroundColor Red
    exit 1
}

# Actualizar pip
Write-Host "📦 Actualizando pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Instalar dependencias
$packages = @(
    "textblob",
    "vaderSentiment", 
    "spacy",
    "spacytextblob",
    "numpy",
    "pandas"
)

Write-Host "📦 Instalando paquetes de Python..." -ForegroundColor Cyan
foreach ($package in $packages) {
    Write-Host "  Instalando $package..." -ForegroundColor Yellow
    python -m pip install $package
}

# Descargar modelo de spaCy en español
Write-Host "📦 Descargando modelo de spaCy en español..." -ForegroundColor Cyan
python -m spacy download es_core_news_sm

# Descargar corpus de TextBlob
Write-Host "📦 Descargando corpus de TextBlob..." -ForegroundColor Cyan
python -c 'import textblob; textblob.download_corpora()'

Write-Host "✅ ¡Instalación completada! Python está listo para análisis de sentimiento." -ForegroundColor Green
Write-Host "🚀 Puedes ejecutar el servidor con: npm start" -ForegroundColor Cyan