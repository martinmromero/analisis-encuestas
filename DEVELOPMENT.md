# Guía de Desarrollo - Sistema de Análisis de Sentimientos

## 🏗️ Arquitectura del Sistema

### Estructura General
```
Cliente (Frontend) ↔ API REST ↔ Motores de Análisis ↔ Procesamiento de Datos
                                       ↓
                              Generación de Reportes
```

### Componentes Principales

#### 1. Servidor Express (server.js)
- **Responsabilidad**: Manejo de requests, routing, middleware
- **Puerto**: 3000 (configurable)
- **Middleware**: CORS, Multer, Static files

#### 2. Motores de Análisis
- **Natural.js Enhanced**: Optimizado para español
- **NLP.js (AXA)**: Motor de IA multiidioma
- **Sistema de Consenso**: Combina resultados de múltiples motores

#### 3. Frontend (public/)
- **index.html**: Interfaz principal con tabs
- **app.js**: Lógica del cliente, AJAX, Chart.js
- **styles.css**: Estilos responsive con CSS Grid/Flexbox

#### 4. Procesamiento de Datos
- **XLSX**: Lectura de archivos Excel
- **ExcelJS**: Generación de reportes avanzados
- **Multer**: Manejo de uploads

## 🔧 Setup de Desarrollo

### Prerrequisitos
```bash
node --version  # >= 20.0.0
npm --version   # >= 9.0.0
```

### Instalación
```bash
git clone <repository-url>
cd analisis-encuestas
npm install
```

### Desarrollo Local
```bash
# Desarrollo con hot-reload
npm run dev

# Producción
npm start

# Limpiar uploads
npm run clean
```

### Variables de Entorno
```bash
cp .env.example .env
# Editar .env con configuraciones locales
```

## 📁 Estructura de Archivos

```
analisis-encuestas/
├── 📂 public/                 # Frontend estático
│   ├── index.html            # UI principal
│   ├── app.js                # Lógica cliente
│   └── styles.css            # Estilos CSS
├── 📂 uploads/               # Archivos temporales
├── 📂 python-engines/        # Motores legacy (no usados)
├── server.js                 # Servidor principal
├── sentiment-dict.js         # Diccionario español
├── user-dictionary.json      # Diccionario personalizable
├── package.json              # Configuración npm
├── .gitignore                # Archivos ignorados
├── .env.example              # Variables de entorno
├── LICENSE                   # Licencia MIT
├── README.md                 # Documentación principal
├── API-DOCS.md              # Documentación API
└── DEVELOPMENT.md           # Esta guía
```

## 🧩 Componentes Detallados

### Servidor Express (server.js)

#### Configuración Básica
```javascript
const express = require('express');
const cors = require('cors');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
```

#### Endpoints Principales
```javascript
// Análisis con motor específico
app.post('/api/analyze-with-engine', upload.single('file'), (req, res) => {
  // Lógica de análisis
});

// Comparación de motores
app.post('/api/analyze-compare', (req, res) => {
  // Lógica de comparación
});

// Información de motores
app.get('/api/engines', (req, res) => {
  // Metadata de motores
});
```

### Motores de Análisis

#### Natural.js Enhanced
```javascript
function analyzeTextEnhanced(text) {
  // Normalización de texto
  const normalizedText = normalizeSpanishText(text);
  
  // Análisis con diccionario personalizado
  const analysis = sentimentDictionary.analyze(normalizedText);
  
  // Clasificación en escala 0-10
  const score = convertToScale(analysis.score);
  const classification = getClassification(score);
  
  return {
    score,
    classification,
    palabras_clave: analysis.positive.concat(analysis.negative)
  };
}
```

#### NLP.js (AXA)
```javascript
const { NlpManager } = require('node-nlp');

async function analyzeWithNLPjs(text) {
  const manager = new NlpManager({ languages: ['es'] });
  
  // Análisis de sentimiento
  const result = await manager.process('es', text);
  
  return {
    score: convertNLPjsScore(result.sentiment.score),
    sentiment: result.sentiment.label,
    confidence: result.sentiment.score
  };
}
```

### Frontend (app.js)

#### Manejo de Archivos
```javascript
async function analyzeFile() {
  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('engine', selectedEngine);
  
  try {
    const response = await fetch('/api/analyze-with-engine', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    displayResults(data);
  } catch (error) {
    showError(error.message);
  }
}
```

#### Visualización con Chart.js
```javascript
function createSentimentChart(data) {
  const ctx = document.getElementById('sentimentChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Muy Positivo', 'Positivo', 'Neutral', 'Negativo', 'Muy Negativo'],
      datasets: [{
        data: [
          data.distribucion.muy_positivo,
          data.distribucion.positivo,
          data.distribucion.neutral,
          data.distribucion.negativo,
          data.distribucion.muy_negativo
        ],
        backgroundColor: ['#28a745', '#6f42c1', '#ffc107', '#fd7e14', '#dc3545']
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}
```

### Procesamiento de Excel

#### Lectura con XLSX
```javascript
const XLSX = require('xlsx');

function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convertir a JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  // Validar estructura
  if (data.length > 5000) {
    throw new Error('Demasiados registros');
  }
  
  return data;
}
```

#### Generación con ExcelJS
```javascript
const ExcelJS = require('exceljs');

async function generateAdvancedReport(results) {
  const workbook = new ExcelJS.Workbook();
  
  // Hoja de resumen
  const summarySheet = workbook.addWorksheet('Resumen');
  summarySheet.addRow(['Métrica', 'Valor']);
  summarySheet.addRow(['Total Respuestas', results.length]);
  summarySheet.addRow(['Promedio', calculateAverage(results)]);
  
  // Hoja de datos
  const dataSheet = workbook.addWorksheet('Datos Detallados');
  dataSheet.addRow(['ID', 'Texto', 'Score', 'Clasificación']);
  
  results.forEach(result => {
    dataSheet.addRow([
      result.id,
      result.texto,
      result.score,
      result.classification
    ]);
  });
  
  // Formateo condicional
  dataSheet.addConditionalFormatting({
    ref: 'C:C',
    rules: [{
      type: 'colorScale',
      cfvo: [
        { type: 'num', value: 0 },
        { type: 'num', value: 10 }
      ],
      color: [
        { argb: 'FFDC3545' }, // Rojo
        { argb: 'FF28A745' }  // Verde
      ]
    }]
  });
  
  return workbook;
}
```

## 🔍 Testing y Debugging

### Testing Manual
```javascript
// Test de motores
const testText = "Esta aplicación es fantástica y muy útil";

// Natural.js Enhanced
console.log(analyzeTextEnhanced(testText));
// Output: { score: 8.5, classification: "Muy Positivo" }

// NLP.js
console.log(await analyzeWithNLPjs(testText));
// Output: { score: 9.2, sentiment: "positive", confidence: 0.92 }
```

### Debugging
```javascript
// Habilitar logging detallado
const DEBUG = process.env.NODE_ENV === 'development';

function debugLog(message, data) {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}:`, data);
  }
}

// Uso
debugLog('Analyzing text', { text, engine });
```

### Manejo de Errores
```javascript
// Middleware de error global
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Error interno del servidor',
    code: error.code || 'INTERNAL_ERROR'
  });
});

// Validación de archivos
function validateFile(file) {
  if (!file) {
    throw new ValidationError('No se proporcionó archivo', 'NO_FILE');
  }
  
  if (file.size > 50 * 1024 * 1024) {
    throw new ValidationError('Archivo demasiado grande', 'FILE_TOO_LARGE');
  }
  
  if (!file.originalname.match(/\.(xlsx|xls)$/)) {
    throw new ValidationError('Formato de archivo no válido', 'INVALID_FORMAT');
  }
}
```

## 🚀 Deployment

### Desarrollo
```bash
npm run dev
# Servidor en http://localhost:3000 con hot-reload
```

### Producción Local
```bash
npm start
# Servidor en http://localhost:3000
```

### Docker (Opcional)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Render/Heroku
```json
{
  "scripts": {
    "start": "node server.js",
    "build": "echo 'No build step required'"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

## 🔧 Configuración Avanzada

### Variables de Entorno
```env
# Servidor
PORT=3000
NODE_ENV=production

# Uploads
MAX_FILE_SIZE=50MB
UPLOAD_LIMIT=5000

# Análisis
DEFAULT_ENGINE=natural-enhanced
ENABLE_DETAILED_LOGGING=false
```

### Personalización de Diccionario
```json
// user-dictionary.json
{
  "palabras_positivas": {
    "excelente": 5,
    "fantastico": 4,
    "increible": 4,
    "maravilloso": 4,
    "genial": 3
  },
  "palabras_negativas": {
    "terrible": -5,
    "pesimo": -4,
    "horrible": -4,
    "malísimo": -4,
    "espantoso": -3
  },
  "modificadores": {
    "muy": 1.5,
    "bastante": 1.2,
    "poco": 0.8,
    "nada": 0.5
  }
}
```

### Configuración de Motores
```javascript
const engineConfig = {
  "natural-enhanced": {
    threshold: 0.1,
    useCustomDictionary: true,
    language: 'es',
    features: ['keywords', 'intensity']
  },
  "nlpjs": {
    confidence: 0.7,
    languages: ['es', 'en'],
    useNER: false,
    features: ['sentiment', 'entities']
  }
};
```

## 🐛 Troubleshooting

### Errores Comunes

#### "Cannot read properties of null"
```javascript
// Solución: Validación defensiva
function safeAnalysis(text) {
  if (!text || typeof text !== 'string' || text.trim() === '') {
    return {
      score: 5,
      classification: 'Neutral',
      error: 'Texto vacío o inválido'
    };
  }
  
  return analyzeText(text);
}
```

#### "File too large"
```javascript
// Configurar límites en Multer
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/)) {
      cb(null, true);
    } else {
      cb(new Error('Formato no válido'));
    }
  }
});
```

#### "Memory issues with large files"
```javascript
// Procesamiento en chunks
function processInBatches(data, batchSize = 1000) {
  const results = [];
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const batchResults = batch.map(analyzeText);
    results.push(...batchResults);
    
    // Liberar memoria
    if (global.gc) {
      global.gc();
    }
  }
  
  return results;
}
```

## 📈 Optimizaciones

### Performance
- **Lazy Loading**: Cargar motores solo cuando se necesiten
- **Caching**: Cache de resultados para archivos repetidos
- **Streaming**: Procesar archivos grandes en streams
- **Workers**: Usar worker threads para análisis intensivos

### Memoria
- **Garbage Collection**: Forzar GC después de procesar archivos grandes
- **Object Pooling**: Reutilizar objetos para análisis
- **Streaming Excel**: Leer Excel en modo streaming para archivos grandes

### UX
- **Progress Bars**: Mostrar progreso de análisis
- **Chunked Processing**: Procesar y mostrar resultados por lotes
- **Responsive UI**: Mantener UI responsiva durante procesamiento

## 🤝 Contribución

### Estándares de Código
- **ES6+**: Usar características modernas de JavaScript
- **Async/Await**: Preferir sobre Promises/Callbacks
- **Error Handling**: Manejo consistente de errores
- **Comments**: Documentar funciones complejas

### Git Workflow
```bash
# Crear rama feature
git checkout -b feature/nueva-funcionalidad

# Commits descriptivos
git commit -m "feat: agregar motor de análisis personalizado"

# Push y PR
git push origin feature/nueva-funcionalidad
```

### Testing
```javascript
// Ejemplo de test básico
function testSentimentAnalysis() {
  const testCases = [
    { text: "Excelente", expected: "Muy Positivo" },
    { text: "Terrible", expected: "Muy Negativo" },
    { text: "Regular", expected: "Neutral" }
  ];
  
  testCases.forEach(test => {
    const result = analyzeTextEnhanced(test.text);
    console.assert(
      result.classification === test.expected,
      `Failed for "${test.text}": expected ${test.expected}, got ${result.classification}`
    );
  });
}
```