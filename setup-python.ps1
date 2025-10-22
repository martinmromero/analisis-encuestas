# Script para instalar Python real (no alias de Windows Store)

Write-Host "🐍 Configuración de Python para Análisis de Sentimientos" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host ""

# Verificar si tenemos Python real
function Test-RealPython {
    try {
        $output = python --version 2>&1
        if ($output -notmatch "was not found" -and $output -match "Python \d+\.\d+") {
            return $true
        }
    } catch {
        return $false
    }
    return $false
}

# Detectar situación actual
if (Test-RealPython) {
    $version = python --version
    Write-Host "✅ Python real encontrado: $version" -ForegroundColor Green
    $pythonReady = $true
} else {
    Write-Host "❌ Solo se detectó el alias de Windows Store (no Python real)" -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 Diagnóstico:" -ForegroundColor Yellow
    Write-Host "  - VS Code puede mostrar Python por su extensión integrada"
    Write-Host "  - Windows tiene alias que redirigen a Microsoft Store"
    Write-Host "  - Necesitas instalar Python real para usar los motores avanzados"
    Write-Host ""
    $pythonReady = $false
}

if (-not $pythonReady) {
    Write-Host "📥 Opciones de instalación de Python:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Opción 1 - Winget (Recomendado):"
    Write-Host "winget install Python.Python.3.12" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opción 2 - Chocolatey:"
    Write-Host "choco install python" -ForegroundColor Green
    Write-Host ""
    Write-Host "Opción 3 - Manual:"
    Write-Host "Descargar desde https://python.org" -ForegroundColor Green
    Write-Host ""
    
    $choice = Read-Host "¿Quieres que instale Python automáticamente con winget? (y/n)"
    
    if ($choice -eq "y" -or $choice -eq "Y") {
        Write-Host ""
        Write-Host "🚀 Instalando Python 3.12..." -ForegroundColor Cyan
        
        try {
            winget install Python.Python.3.12
            Write-Host ""
            Write-Host "✅ Python instalado exitosamente!" -ForegroundColor Green
            Write-Host ""
            Write-Host "🔄 IMPORTANTE: Debes reiniciar PowerShell para que Python esté disponible" -ForegroundColor Yellow
            Write-Host "   1. Cierra esta ventana de PowerShell"
            Write-Host "   2. Abre una nueva ventana de PowerShell"
            Write-Host "   3. Navega a: cd C:\Users\Public\analisis-encuestas"
            Write-Host "   4. Ejecuta nuevamente este script"
            Write-Host ""
            Read-Host "Presiona Enter para continuar"
            exit 0
        } catch {
            Write-Host "❌ Error instalando con winget" -ForegroundColor Red
            Write-Host "Intenta instalar manualmente desde https://python.org" -ForegroundColor Yellow
            exit 1
        }
    } else {
        Write-Host ""
        Write-Host "ℹ️  Sin Python, solo estarán disponibles los motores de JavaScript:" -ForegroundColor Blue
        Write-Host "   - Natural.js Enhanced (recomendado para español)"
        Write-Host "   - ML-Sentiment"
        Write-Host "   - VADER JavaScript"
        Write-Host ""
        Write-Host "📱 Puedes usar la aplicación normalmente con estos 3 motores"
        Write-Host "🐍 Para los motores de Python, instala Python cuando quieras"
        Write-Host ""
        Read-Host "Presiona Enter para continuar"
        exit 0
    }
}

# Si llegamos aquí, Python está disponible
Write-Host "🎯 Python detectado, instalando dependencias..." -ForegroundColor Cyan
Write-Host ""

# Actualizar pip
Write-Host "📦 Actualizando pip..."
try {
    python -m pip install --upgrade pip | Out-Null
    Write-Host "✅ pip actualizado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error actualizando pip (continuando...)" -ForegroundColor Yellow
}

# Paquetes necesarios
$packages = @(
    @{name="textblob"; desc="TextBlob - Análisis con traducción automática"},
    @{name="vaderSentiment"; desc="VADER - Especializado en redes sociales"},
    @{name="spacy"; desc="spaCy - Análisis morfológico avanzado"},
    @{name="spacytextblob"; desc="spaCy-TextBlob - Integración de ambos"}
)

Write-Host "📦 Instalando paquetes de Python..."
Write-Host ""

foreach ($pkg in $packages) {
    Write-Host "  → $($pkg.desc)..." -ForegroundColor Yellow
    try {
        python -m pip install $pkg.name | Out-Null
        Write-Host "    ✅ $($pkg.name) instalado" -ForegroundColor Green
    } catch {
        Write-Host "    ❌ Error instalando $($pkg.name)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "📊 Descargando modelo de spaCy en español..."
try {
    python -m spacy download es_core_news_sm | Out-Null
    Write-Host "✅ Modelo es_core_news_sm descargado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error descargando modelo de spaCy" -ForegroundColor Red
    Write-Host "   Puedes intentar manualmente: python -m spacy download es_core_news_sm" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📚 Configurando corpus de TextBlob..."
try {
    python -c "import nltk; nltk.download('punkt')" | Out-Null
    python -c "import nltk; nltk.download('brown')" | Out-Null
    Write-Host "✅ Corpus de TextBlob configurado" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Error configurando corpus (TextBlob funcionará con precisión reducida)" -ForegroundColor Yellow
}

# Verificación final
Write-Host ""
Write-Host "🔍 Verificando instalación..."
Write-Host ""

$engines = @(
    @{name="textblob"; desc="TextBlob"},
    @{name="vaderSentiment"; desc="VADER"},
    @{name="spacy"; desc="spaCy"}
)

$successCount = 0
foreach ($engine in $engines) {
    try {
        python -c "import $($engine.name)" 2>$null
        Write-Host "✅ $($engine.desc) - OK" -ForegroundColor Green
        $successCount++
    } catch {
        Write-Host "❌ $($engine.desc) - ERROR" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=" * 60
if ($successCount -eq $engines.Count) {
    Write-Host "🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 Motores disponibles:" -ForegroundColor Cyan
    Write-Host "   JavaScript: Natural.js Enhanced, ML-Sentiment, VADER"
    Write-Host "   Python: TextBlob, VADER, spaCy"
    Write-Host ""
    Write-Host "🌐 Ejecuta: npm start" -ForegroundColor White
    Write-Host "🔗 Abre: http://localhost:3000" -ForegroundColor White
    Write-Host "📊 Ve a la pestaña 'Comparar Motores' para probar todos" -ForegroundColor White
} else {
    Write-Host "⚠️  INSTALACIÓN PARCIAL ($successCount/$($engines.Count) motores)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "✅ Los motores de JavaScript funcionarán correctamente"
    Write-Host "❌ Algunos motores de Python podrían fallar"
    Write-Host ""
    Write-Host "🌐 Puedes usar la aplicación normalmente" -ForegroundColor Cyan
}

Write-Host ""
Read-Host "Presiona Enter para finalizar"