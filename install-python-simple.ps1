# Script simplificado para instalar Python y dependencias

Write-Host "🐍 Configurando Python para análisis de sentimientos..." -ForegroundColor Cyan
Write-Host ""

# Función para verificar si Python está disponible
function Test-PythonInstalled {
    try {
        $result = python --version 2>&1
        if ($result -match "Python") {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Verificar Python
if (Test-PythonInstalled) {
    $version = python --version 2>&1
    Write-Host "✅ Python encontrado: $version" -ForegroundColor Green
} else {
    Write-Host "❌ Python no encontrado" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Opciones de instalación:" -ForegroundColor Yellow
    Write-Host "1. Microsoft Store: winget install Python.Python.3.11"
    Write-Host "2. Web oficial: https://python.org"
    Write-Host "3. Chocolatey: choco install python"
    Write-Host ""
    
    $install = Read-Host "¿Quieres intentar instalar Python automáticamente? (y/n)"
    
    if ($install -eq "y" -or $install -eq "Y") {
        Write-Host "Intentando instalar Python..." -ForegroundColor Cyan
        try {
            winget install Python.Python.3.11
            Write-Host "✅ Python instalado. Reinicia PowerShell y ejecuta este script nuevamente." -ForegroundColor Green
        } catch {
            Write-Host "❌ Error instalando Python automáticamente" -ForegroundColor Red
            Write-Host "Por favor instala Python manualmente desde https://python.org" -ForegroundColor Yellow
        }
    }
    exit 1
}

# Actualizar pip
Write-Host ""
Write-Host "📦 Actualizando pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Lista de paquetes necesarios
$packages = @(
    "textblob",
    "vaderSentiment", 
    "spacy",
    "spacytextblob"
)

# Instalar paquetes
Write-Host ""
Write-Host "📦 Instalando paquetes de Python..." -ForegroundColor Cyan
foreach ($package in $packages) {
    Write-Host "  → Instalando $package..." -ForegroundColor Yellow
    try {
        python -m pip install $package
        Write-Host "    ✅ $package instalado" -ForegroundColor Green
    } catch {
        Write-Host "    ❌ Error instalando $package" -ForegroundColor Red
    }
}

# Descargar modelo de spaCy
Write-Host ""
Write-Host "📦 Descargando modelo de spaCy en español..." -ForegroundColor Cyan
try {
    python -m spacy download es_core_news_sm
    Write-Host "✅ Modelo de spaCy descargado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error descargando modelo de spaCy" -ForegroundColor Red
    Write-Host "Puedes intentar manualmente: python -m spacy download es_core_news_sm" -ForegroundColor Yellow
}

# Descargar corpus de TextBlob
Write-Host ""
Write-Host "📦 Descargando corpus de TextBlob..." -ForegroundColor Cyan
try {
    python -c "import textblob; textblob.download_corpora()"
    Write-Host "✅ Corpus de TextBlob descargado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error descargando corpus de TextBlob" -ForegroundColor Red
    Write-Host "El TextBlob funcionará sin el corpus, pero con menor precisión" -ForegroundColor Yellow
}

# Verificar instalación
Write-Host ""
Write-Host "🔍 Verificando instalación..." -ForegroundColor Cyan

$testPackages = @("textblob", "vaderSentiment", "spacy")
$allInstalled = $true

foreach ($package in $testPackages) {
    try {
        python -c "import $package; print('✅ $package OK')"
    } catch {
        Write-Host "❌ $package no disponible" -ForegroundColor Red
        $allInstalled = $false
    }
}

Write-Host ""
if ($allInstalled) {
    Write-Host "🎉 ¡Instalación completada exitosamente!" -ForegroundColor Green
    Write-Host "🚀 Ahora puedes usar todos los motores de análisis" -ForegroundColor Cyan
    Write-Host "📊 Ejecuta: npm start" -ForegroundColor White
} else {
    Write-Host "⚠️  Instalación parcial completada" -ForegroundColor Yellow
    Write-Host "Algunos motores de Python podrían no funcionar correctamente" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press Enter to continue..."
Read-Host