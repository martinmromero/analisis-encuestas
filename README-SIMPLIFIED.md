# 📊 Análisis de Encuestas - Sistema Simplificado

Sistema web optimizado para análisis de sentimientos en español con motores efectivos.

## 🚀 Inicio Rápido

### Método Recomendado
```powershell
# Desde cualquier ubicación, ejecutar:
C:\Users\Public\analisis-encuestas\start-server.ps1
```

### Método Manual
```powershell
cd "C:\Users\Public\analisis-encuestas"
node server.js
```

**URL de acceso**: http://localhost:3000

## 🎯 Sistema Optimizado con 2 Motores Efectivos

### Motores Activos (Solo los que REALMENTE funcionan para español)

#### 1. Natural.js Enhanced ⭐ (Recomendado)
- ✅ **Efectividad**: Excelente para español (Score: 8.5/10)
- 📚 **Diccionario**: 894+ palabras/frases en español
- ⚡ **Velocidad**: Muy rápido (~5ms)
- 🔧 **Características**: Frases contextuales, intensificadores, negaciones

#### 2. NLP.js (AXA) ⭐ (Muy Recomendado)
- ✅ **Efectividad**: Muy bueno para español (Score: 10/10)
- 🌐 **Tipo**: Motor avanzado multi-idioma de AXA Group
- ⚡ **Velocidad**: Rápido (~15ms)
- 🔧 **Características**: Soporte nativo español, NLU avanzado, Entity recognition

### Motores Removidos ❌
- **ML-Sentiment**: Inefectivo para español (clasifica texto positivo como "Muy Negativo")
- **VADER**: Inefectivo para español (Score: 0/10)
- **TextBlob**: Inefectivo para español (Score: 0/10)  
- **spaCy**: Inefectivo para español (Score: 0/10)

## 🧪 Prueba de Efectividad

```
Texto de prueba: "El servicio fue excelente, superó mis expectativas"

✅ Natural.js Enhanced:  8.5/10 (Excelente para español)
✅ NLP.js (AXA):        10.3/10 (Muy bueno para español)
❌ ML-Sentiment:        "Muy Negativo" (¡ERROR! - No detecta español correctamente)
❌ VADER (removido):    0/10 (Neutral - No detecta español)
❌ TextBlob (removido): 0/10 (Neutral - No detecta español)
```

## 📱 Funcionalidades

### 📤 Subida de Archivos
- Formatos: .xlsx, .xls
- Límite: 1000 filas por archivo
- Procesamiento automático

### 📊 Análisis
- **Sentimientos**: Muy Positivo, Positivo, Neutral, Negativo, Muy Negativo
- **Comparación**: Entre motores disponibles
- **Estadísticas**: Promedios, distribuciones, palabras clave

### 📈 Visualizaciones
- Gráficos de barras
- Gráficos de pastel
- Análisis comparativo entre motores
- Responsive y optimizado

### 🎛️ Gestión de Diccionario
- Agregar nuevas palabras
- Modificar puntuaciones
- Entrenamiento personalizado
- Persistencia en JSON

## 🔧 Configuración VS Code

Para evitar problemas de directorio, usar el workspace:
```
analisis-encuestas.code-workspace
```

O configurar terminal:
```json
{
    "terminal.integrated.cwd": "C:\\Users\\Public\\analisis-encuestas"
}
```

## 📂 Estructura del Proyecto

```
analisis-encuestas/
├── server.js                 # Servidor principal
├── package.json              # Dependencias
├── sentiment-dict.js         # Diccionario español
├── start-server.ps1          # Script de inicio
├── analisis-encuestas.code-workspace  # Workspace VS Code
├── public/                   # Frontend
│   ├── index.html
│   ├── js/app.js
│   └── css/styles.css
├── uploads/                  # Archivos subidos
└── python-engines/          # Motores Python (desactivados)
```

## 🔄 Changelog

### v2.0 - Sistema Simplificado
- ✅ Removidos motores inefectivos para español
- ✅ Optimizado para solo 2 motores efectivos
- ✅ Mejorada velocidad y precisión
- ✅ Scripts de inicio automático
- ✅ Configuración VS Code
- ✅ Documentación actualizada

### APIs Disponibles

- `GET /api/engines` - Lista motores disponibles (2)
- `POST /api/analyze-compare` - Análisis comparativo con múltiples motores
- `POST /api/analyze` - Análisis simple
- `POST /api/dictionary/add` - Agregar palabras
- `GET /api/dictionary` - Ver diccionario

### Ejemplo de uso comparativo:
```javascript
{
  "text": "El servicio fue excelente",
  "engines": ["natural", "nlpjs"]
}
```

## 🛠️ Tecnologías

- **Node.js + Express**: Backend
- **Natural.js Enhanced**: Motor principal de sentiment
- **NLP.js (AXA)**: Motor avanzado multi-idioma
- **ML-Sentiment**: Motor secundario
- **Chart.js**: Visualizaciones
- **XLSX**: Procesamiento Excel
- **JavaScript ES6+**: Frontend moderno