const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const Sentiment = require('sentiment');
const { NlpManager } = require('node-nlp');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// Solo usamos palabras de v4 y negaciones para invertir puntaje; no cargamos diccionarios extra.
const { negationWords } = require('./sentiment-dict');
const COLUMN_CONFIG = require('./column-config');

const app = express();
// ============= ENDPOINT PARA ÚLTIMO ANÁLISIS =============
let lastSentimentAnalysis = null;
function saveLastAnalysis(result) {
  lastSentimentAnalysis = result;
}
app.get('/api/analisis/ultimo', (req, res) => {
  if (!lastSentimentAnalysis) {
    return res.status(404).json({ error: 'No hay análisis disponible' });
  }
  res.json(lastSentimentAnalysis);
});
const PORT = process.env.PORT || 3000;

// Lista de palabras/frases que deben ser ignoradas en el análisis cualitativo
// (no se les asigna puntaje alguno) - Cargada desde el diccionario activo
let IGNORED_PHRASES = [];

// Función para cargar palabras ignoradas desde el diccionario activo
function loadIgnoredPhrases() {
  try {
    if (!activeDictionary.fileName) {
      // Si no hay diccionario activo, usar valores por defecto
      IGNORED_PHRASES = ['-', '.', '...', '¿', '?', 'sin comentario', 'sin comentarios', 's/c', 'n/a', 'na', 'ninguno', 'ninguna', 'nada'];
      console.log(`🚫 Palabras ignoradas por defecto: ${IGNORED_PHRASES.length} frases`);
      return;
    }
    
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      IGNORED_PHRASES = data.ignored_phrases || ['-', '.', '...', '¿', '?', 'sin comentario', 'sin comentarios', 's/c', 'n/a', 'na', 'ninguno', 'ninguna', 'nada'];
      console.log(`🚫 Palabras ignoradas cargadas del diccionario ${activeDictionary.name}: ${IGNORED_PHRASES.length} frases`);
      
      // Si no existía la propiedad, agregarla y guardar
      if (!data.ignored_phrases) {
        data.ignored_phrases = IGNORED_PHRASES;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`💾 Agregada sección ignored_phrases al diccionario`);
      }
    } else {
      IGNORED_PHRASES = ['-', '.', '...', '¿', '?', 'sin comentario', 'sin comentarios', 's/c', 'n/a', 'na', 'ninguno', 'ninguna', 'nada'];
      console.log(`🚫 Palabras ignoradas por defecto: ${IGNORED_PHRASES.length} frases`);
    }
  } catch (error) {
    console.error('❌ Error cargando palabras ignoradas:', error.message);
    IGNORED_PHRASES = ['-', '.', '...', '¿', '?', 'sin comentario', 'sin comentarios', 's/c', 'n/a', 'na', 'ninguno', 'ninguna', 'nada'];
  }
}

// Función para guardar palabras ignoradas en el diccionario activo
function saveIgnoredPhrases() {
  try {
    if (!activeDictionary.fileName) {
      console.error('❌ No hay diccionario activo para guardar palabras ignoradas');
      return false;
    }
    
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    
    if (!fs.existsSync(filePath)) {
      console.error('❌ Archivo de diccionario no encontrado:', filePath);
      return false;
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.ignored_phrases = IGNORED_PHRASES;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`💾 Palabras ignoradas guardadas en ${activeDictionary.name}: ${IGNORED_PHRASES.length} frases`);
    return true;
  } catch (error) {
    console.error('❌ Error guardando palabras ignoradas:', error.message);
    return false;
  }
}

// Configuración de middleware
// CORS: permitir solicitudes desde el dominio de producción y desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    // Permitir solicitudes sin origin (como curl, Postman, o misma origin)
    // y desde dominios permitidos
    const allowedOrigins = [
      'https://itd.barcelo.edu.ar',
      'https://itd.barcelo.edu.ar:3000',
      'http://itd.barcelo.edu.ar',
      'http://itd.barcelo.edu.ar:3000',
      'http://192.168.30.12',
      'http://192.168.30.12:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',  // Para desarrollo local en puerto 3001
      'http://127.0.0.1:3001'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ charset: 'utf-8' }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv',
      'text/plain' // algunos navegadores envían CSV como text/plain
    ];
    
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV (.csv)'), false);
    }
  }
});

// Inicializar analizador de sentimientos (instancia vacía)
let sentiment = new Sentiment(); // Se recreará al activar un diccionario

// Cargar únicamente diccionario v4; si falta, se inicia vacío (no se mezclan otras fuentes)
let completeSpanishDict = {};
try {
  const v4Path = path.join(__dirname, 'dictionaries', 'Diccionario_de_sentimientos_06_02_2026_v4.json');
  if (fs.existsSync(v4Path)) {
    const v4Data = JSON.parse(fs.readFileSync(v4Path, 'utf8'));
    if (v4Data && v4Data.dictionary) {
      completeSpanishDict = v4Data.dictionary;
      console.log(`🆕 Diccionario v4 cargado (${Object.keys(completeSpanishDict).length} palabras)`);
    } else {
      console.error('❌ Diccionario v4 inválido (sin propiedad dictionary). Iniciando vacío.');
    }
  } else {
    console.error('❌ Diccionario v4 no encontrado. Iniciando sin diccionario activo.');
  }
} catch (e) {
  console.error('❌ Error leyendo diccionario v4:', e.message);
}

// Mantener referencia directa al diccionario activo (labels) para motor propio
let currentLabels = {}; // Se actualizará al activar/importar

console.log(`📚 Diccionario v4 listo (solo este se usará): ${Object.keys(completeSpanishDict).length} palabras`);

// Inicializar NLP.js para análisis de sentimientos en español
const nlpManager = new NlpManager({ 
  languages: ['es'], 
  forceNER: false,
  nlu: { 
    useNoneFeature: false,
    log: false 
  }
});

console.log(`🤖 NLP.js inicializado para análisis en español`);

// Diccionario personalizado del usuario (se carga desde archivo)
// Eliminado soporte de diccionario personalizado: solo se usa v4.
let userCustomDict = {}; // Se mantiene variable para evitar errores residuales pero no se utiliza.
// Variable para trackear el diccionario activo
let activeDictionary = { name: null, fileName: null, wordCount: 0 };
if (Object.keys(completeSpanishDict).length > 0) {
  // Auto-activar v4 si existe (sin concepto de "base")
  activeDictionary = {
    name: 'Diccionario Sentimientos v4 (06/02/2026)',
    fileName: 'Diccionario_de_sentimientos_06_02_2026_v4',
    wordCount: Object.keys(completeSpanishDict).length,
    labels: completeSpanishDict
  };
  sentiment = new Sentiment();
  const dictCopy = JSON.parse(JSON.stringify(completeSpanishDict));
  sentiment.registerLanguage('es', { labels: dictCopy });
  currentLabels = dictCopy;
  console.log(`🚀 Diccionario v4 auto-activado al inicio (${activeDictionary.wordCount} palabras)`);
  
  // Cargar palabras ignoradas del diccionario activo
  loadIgnoredPhrases();
}

// Permitir configurar la ruta del diccionario vía variable de entorno para soportar Docker/volúmenes
const USER_DICT_FILE = process.env.USER_DICT_FILE || path.join(__dirname, 'user-dictionary.json');

// Cargar diccionario personalizado si existe
// Se eliminan loadUserDictionary y saveUserDictionary (no hay edición permitida)

// ===== FUNCIONES DE CONFIGURACIÓN DE COLUMNAS =====
// Usa el archivo column-config.js para la configuración

// Función auxiliar para verificar si un texto contiene palabras del diccionario activo
function hasWordsInDictionary(text) {
  if (!text || typeof text !== 'string' || !currentLabels || Object.keys(currentLabels).length === 0) {
    return false;
  }
  
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  
  // Verificar si alguna palabra/frase del diccionario está presente
  for (const key of Object.keys(currentLabels)) {
    const normKey = key.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    if (normalizedText.includes(normKey)) {
      return true; // Encontró al menos una palabra del diccionario
    }
  }
  return false;
}

// Función para determinar si una columna debe ser analizada para sentimiento
// Acepta configuración personalizada opcional
// PRIORIDAD: Si contiene palabras del diccionario, se analiza SIN IMPORTAR la longitud
function shouldAnalyzeColumn(columnName, value, customConfig = null) {
  const config = customConfig || COLUMN_CONFIG;
  
  // No analizar columnas de identificación
  if (config.identificacion.includes(columnName)) {
    return false;
  }
  
  // No analizar columnas numéricas
  if (config.numericas.includes(columnName)) {
    return false;
  }
  
  // Verificar si es una columna de texto libre (coincidencia exacta o parcial)
  const isTextoLibre = config.textoLibre.some(pattern => 
    columnName.includes(pattern) || pattern.includes(columnName)
  );
  
  // SOLO analizar columnas que estén explícitamente en textoLibre
  // No analizar columnas "sin asignar" para mejorar rendimiento
  if (!isTextoLibre) {
    return false;
  }
  
  // Verificar primero si es string válido
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  
  // PRIORIDAD 1: Si contiene palabras del diccionario, analizar sin importar longitud
  if (hasWordsInDictionary(value)) {
    return true;
  }
  
  // PRIORIDAD 2: Si no tiene palabras del diccionario, verificar longitud mínima (3 caracteres)
  const minLength = COLUMN_CONFIG.analisis?.longitudMinimaTextoLibre || 3;
  return value.trim().length >= minLength;
}

// Función para contar cuántas filas tienen respuestas cualitativas (texto libre)
// Una fila cuenta como 1 aunque tenga múltiples columnas de texto libre respondidas
function countQualitativeResponses(jsonData, customConfig = null) {
  const config = customConfig || COLUMN_CONFIG;
  const minLength = config.analisis?.longitudMinimaTextoLibre || 10;
  
  console.log('📊 countQualitativeResponses - Config:', config.name || 'DEFAULT');
  console.log('📊 Columnas texto libre:', config.textoLibre);
  console.log('📊 Longitud mínima:', minLength);
  console.log('📊 Total filas a revisar:', jsonData.length);
  
  let count = 0;
  const matchedColumns = new Set();
  
  for (const row of jsonData) {
    let hasQualitativeText = false;
    
    // Revisar cada columna definida como texto libre en la configuración
    for (const pattern of config.textoLibre) {
      // Buscar columnas que coincidan con el patrón
      for (const [columnName, value] of Object.entries(row)) {
        if (columnName.includes(pattern) || pattern.includes(columnName)) {
          matchedColumns.add(columnName);
          // Verificar si tiene texto significativo
          if (typeof value === 'string' && value.trim().length > minLength) {
            const trimmed = value.trim();
            // Asegurar que no sea solo un número - si isNaN es true, NO es un número, entonces SÍ es texto
            if (isNaN(trimmed)) {
              hasQualitativeText = true;
              break;
            }
          }
        }
      }
      if (hasQualitativeText) break;
    }
    
    if (hasQualitativeText) {
      count++;
    }
  }
  
  console.log('📊 Columnas encontradas:', Array.from(matchedColumns));
  console.log('📊 Filas con texto cualitativo:', count);
  
  return count;
}

// Helper reutilizable: obtiene columnas de texto que se deben analizar para sentimiento.
// Retorna arreglo de objetos { column, text }
function getSentimentColumns(row, customConfig = null) {
  const selected = [];
  Object.entries(row).forEach(([columnName, value]) => {
    const shouldAnalyze = shouldAnalyzeColumn(columnName, value, customConfig);
    if (shouldAnalyze && typeof value === 'string') {
      selected.push({ column: columnName, text: value });
      console.log(`[SENTIMENT] ✅ Analizando columna: "${columnName}" | Longitud: ${value.length} | Preview: "${value.substring(0, 50)}..."`);
    }
  });
  if (selected.length === 0) {
    // Mostrar detalles de TODAS las columnas para debug
    console.log(`[SENTIMENT] ⚠️ Ninguna columna cumple filtro shouldAnalyzeColumn.`);
    console.log(`[DEBUG] Primera fila completa:`, JSON.stringify(row, null, 2).substring(0, 1000));
  }
  return selected;
}

// Función para obtener valores numéricos de columnas específicas
function extractNumericValues(row) {
  const numericData = {};
  
  COLUMN_CONFIG.numericas.forEach(columnName => {
    if (row.hasOwnProperty(columnName)) {
      const value = row[columnName];
      // Convertir a número si es string numérico
      if (typeof value === 'number') {
        numericData[columnName] = value;
      } else if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
        numericData[columnName] = parseFloat(value);
      }
    }
  });
  
  return numericData;
}

// Se eliminó carga de diccionario personalizado: sólo v4.

console.log('📋 Configuración de columnas cargada:');
console.log(`   - Columnas de identificación: ${COLUMN_CONFIG.identificacion.length}`);
console.log(`   - Columnas numéricas: ${COLUMN_CONFIG.numericas.length}`);
console.log(`   - Patrones de texto libre: ${COLUMN_CONFIG.textoLibre.length}`);

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint para procesar archivo Excel
app.post('/api/analyze', upload.single('excelFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // Parsear configuración personalizada si existe
    let customConfig = null;
    if (req.body.columnConfig) {
      try {
        customConfig = JSON.parse(req.body.columnConfig);
        console.log(`⚙️ Usando configuración personalizada: ${customConfig.name}`);
      } catch (e) {
        console.error('❌ Error parseando columnConfig:', e);
      }
    }

    // Leer archivo Excel/CSV
    const workbook = XLSX.readFile(req.file.path, { 
      raw: false,
      FS: ';' // Soportar CSV con separador punto y coma
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Opciones para sheet_to_json para manejar CSV con ;
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });
    
    console.log(`📊 Archivo procesado: ${jsonData.length} filas`);
    if (jsonData.length > 0) {
      console.log('📋 Columnas detectadas:', Object.keys(jsonData[0]));
    }

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // Limitar a 25000 filas para evitar problemas de memoria
    const MAX_ROWS = 25000;
    if (jsonData.length > MAX_ROWS) {
      console.log(`⚠️ Archivo muy grande (${jsonData.length} filas). Procesando solo las primeras ${MAX_ROWS}.`);
      jsonData.splice(MAX_ROWS);
    }

    // Análisis de sentimientos
    const results = jsonData.map((row, index) => {
      // Extraer solo los campos de texto que deben ser analizados
      const textFields = [];
      const columnNames = [];
      
      Object.entries(row).forEach(([columnName, value]) => {
        if (shouldAnalyzeColumn(columnName, value, customConfig)) {
          textFields.push(value);
          columnNames.push(columnName);
        }
      });
      
      // Extraer valores numéricos para métricas
      const numericValues = extractNumericValues(row);
      
      let sentimentResults = [];
      let overallScore = 0;
      let overallComparative = 0;

      textFields.forEach((text, idx) => {
        // Análisis mejorado con preprocesamiento
        const enhancedAnalysis = analyzeTextEnhanced(text);
        
        // Saltar entradas ignoradas (sin comentario, ".", etc.)
        if (enhancedAnalysis.ignored) {
          return; // No incluir en el análisis
        }
        
        // Limitar el texto para reducir memoria
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        
        sentimentResults.push({
          column: columnNames[idx], // Incluir nombre de columna
          text: limitedText,
          score: enhancedAnalysis.normalizedScore, // USAR SCORE NORMALIZADO
          scoreRaw: enhancedAnalysis.score, // Score RAW para referencia
          comparative: enhancedAnalysis.comparative,
          positive: enhancedAnalysis.positive.slice(0, 5), // Máximo 5 palabras
          negative: enhancedAnalysis.negative.slice(0, 5), // Máximo 5 palabras
          confidence: enhancedAnalysis.confidence
        });
        overallScore += enhancedAnalysis.normalizedScore; // USAR SCORE NORMALIZADO
        overallComparative += enhancedAnalysis.comparative;
      });

      if (sentimentResults.length > 0) {
        overallComparative = overallComparative / sentimentResults.length;
      }

      // Calcular confianza promedio
      const averageConfidence = sentimentResults.length > 0 
        ? sentimentResults.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / sentimentResults.length 
        : 0.5;

      // Calcular promedio de scores normalizados (ya están en escala 0-10)
      let perColumnAvgScore = sentimentResults.length > 0 
        ? overallScore / sentimentResults.length 
        : 5.0; // Neutral por defecto
  
      // Asegurar que esté en rango válido 0-10
      perColumnAvgScore = Math.max(0, Math.min(10, perColumnAvgScore));
      
      console.log(`✅ Score calculado - Avg normalized: ${perColumnAvgScore.toFixed(2)} | Columnas analizadas: ${sentimentResults.length}`);

      return {
        id: index + 1,
        originalData: row,
        numericMetrics: numericValues, // Incluir métricas numéricas
        sentiment: {
          overallScore: overallScore, // suma total (puede exceder rango por múltiples columnas)
          perColumnAvgScore: parseFloat(perColumnAvgScore.toFixed(2)), // score 0..10 (5=neutral)
          overallComparative: overallComparative,
          classification: getClassification(perColumnAvgScore, averageConfidence),
          confidence: Math.round(averageConfidence * 100) / 100,
          details: sentimentResults,
          analyzedColumns: columnNames.length // Cantidad de columnas analizadas
        }
      };
    });

    // Calcular cuántos registros tienen clasificación válida (excluyendo "No clasificado")
    const quantitativeResponses = results.filter(r => r.sentiment.classification !== 'No clasificado').length;
    
    // Estadísticas generales (usar quantitativeResponses como base)
    const stats = calculateStats(results, quantitativeResponses);
    // Agregar el total absoluto al objeto statistics para el Excel
    stats.totalSurveys = results.length;
    
    // Extraer valores únicos para filtros
    const filterOptions = extractFilterOptions(jsonData, customConfig);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

      if (results.length > 0) {
        saveLastAnalysis(results[0]);
      }
      res.json({
        success: true,
        totalResponses: results.length,
        quantitativeResponses: quantitativeResponses,
        statistics: stats,
        filterOptions: filterOptions,
        results: results
      });

  } catch (error) {
    console.error('Error procesando archivo:', error);
    res.status(500).json({ error: 'Error procesando el archivo Excel' });
  }
});

// Endpoint para análisis con motor específico seleccionado
app.post('/api/analyze-with-engine', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    // Obtener el motor del cuerpo de la petición (viene como FormData)
    const engine = req.body.engine || 'natural';
    
    // Obtener configuración de columnas personalizada si existe
    let customConfig = null;
    if (req.body.columnConfig) {
      try {
        customConfig = JSON.parse(req.body.columnConfig);
        console.log(`⚙️ Usando configuración personalizada: ${customConfig.name}`);
      } catch (e) {
        console.warn('⚠️ Error parseando columnConfig, usando default');
      }
    }
    
    console.log(`🔧 Analizando con motor específico: ${engine}`);

    // Leer archivo Excel/CSV
    const workbook = XLSX.readFile(req.file.path, { 
      raw: false,
      FS: ';' // Soportar CSV con separador punto y coma
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });
    
    console.log(`📊 Archivo procesado: ${jsonData.length} filas`);
    if (jsonData.length > 0) {
      console.log('📋 Columnas detectadas:', Object.keys(jsonData[0]));
    }
    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // Aplicar límite de filas
    const MAX_ROWS = 25000;
    if (jsonData.length > MAX_ROWS) {
      console.log(`⚠️ Archivo muy grande (${jsonData.length} filas). Procesando solo las primeras ${MAX_ROWS}.`);
      jsonData.splice(MAX_ROWS);
    }

    // Análisis según el motor seleccionado
    const results = [];
    console.log(`🔄 Procesando ${jsonData.length} registros con ${engine} (filtrado por configuración de columnas)...`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const numericValues = extractNumericValues(row);
      if (i % 500 === 0 && i > 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }
      const sentimentColumns = getSentimentColumns(row, customConfig);
      let sentimentResults = [];
      let overallScore = 0;
      let overallComparative = 0;
      for (const { column, text } of sentimentColumns) {
        let analysis;
        switch (engine) {
          case 'natural':
            analysis = analyzeTextEnhanced(text);
            break;
          case 'nlpjs':
            analysis = await analyzeWithNLPjs(text);
            break;
          default:
            analysis = analyzeTextEnhanced(text);
        }
        
        // Saltar entradas ignoradas (sin comentario, ".", etc.)
        if (analysis.ignored) {
          continue; // No incluir en el análisis
        }
        
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        
        // Para analyzeTextEnhanced, usar el normalizedScore
        // Para otros motores (nlpjs), usar el score que ya viene normalizado
        const safeScore = analysis.normalizedScore !== undefined 
          ? analysis.normalizedScore 
          : (typeof analysis.score === 'number' ? analysis.score : 0);
        const safeComparative = typeof analysis.comparative === 'number' ? analysis.comparative : 0;
        const safeConfidence = typeof analysis.confidence === 'number' ? analysis.confidence : 0.5;
        
        sentimentResults.push({
          column,
            text: limitedText,
            score: safeScore, // Ya normalizado 0-10
            scoreRaw: analysis.score, // Score RAW para referencia
            comparative: safeComparative,
            positive: Array.isArray(analysis.positive) ? analysis.positive.slice(0, 5) : [],
            negative: Array.isArray(analysis.negative) ? analysis.negative.slice(0, 5) : [],
            classification: analysis.classification || getClassification(safeScore, safeConfidence),
            confidence: safeConfidence,
            engine: analysis.engine || engine
        });
        overallScore += safeScore;
        overallComparative += safeComparative;
      }
      if (sentimentResults.length > 0) {
        overallComparative = overallComparative / sentimentResults.length;
      }
      
      // Calcular promedio de scores (ya normalizados 0-10)
      const averageScore = sentimentResults.length > 0 ? overallScore / sentimentResults.length : 5.0;
      const averageConfidence = sentimentResults.length > 0 ? sentimentResults.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / sentimentResults.length : 0.5;
      
      // Asegurar que esté en rango válido 0-10
      const normalizedScore = Math.max(0, Math.min(10, averageScore));
      
      results.push({
        row: i + 1,
        ...row,
        numericMetrics: numericValues,
        sentiment: {
          score: parseFloat(normalizedScore.toFixed(2)), // Score normalizado
          perColumnAvgScore: parseFloat(normalizedScore.toFixed(2)),
          comparative: parseFloat((overallComparative || 0).toFixed(4)),
          overallComparative: parseFloat((overallComparative || 0).toFixed(4)),
          confidence: parseFloat(averageConfidence.toFixed(2)),
          engine,
          analyzedColumns: sentimentColumns.map(c => c.column),
          details: sentimentResults
        }
      });
    }

    console.log(`✅ Análisis completado con ${engine}`);

    // Calcular cuántos registros tienen clasificación válida (excluyendo "No clasificado")
    const quantitativeResponses = results.filter(r => r.sentiment.classification !== 'No clasificado').length;
    
    // Estadísticas generales (usar quantitativeResponses como base)
    const stats = calculateStats(results, quantitativeResponses);
    // Agregar el total absoluto al objeto statistics para el Excel
    stats.totalSurveys = results.length;
    
    // Extraer valores únicos para filtros
    const filterOptions = extractFilterOptions(jsonData, customConfig);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

      if (results.length > 0) {
        saveLastAnalysis(results[0]);
      }
      res.json({
        success: true,
        totalResponses: results.length,
        quantitativeResponses: quantitativeResponses,
        engine: engine,
        statistics: stats,
        filterOptions: filterOptions,
        results: results
      });

  } catch (error) {
    console.error('Error procesando archivo:', error);
    res.status(500).json({ error: 'Error procesando el archivo Excel: ' + error.message });
  }
});

// Endpoint para análisis dual de archivos Excel (Natural.js + NLP.js)
app.post('/api/analyze-dual-file', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    console.log(`⚖️ Analizando con ambos motores (Natural.js + NLP.js)...`);

    // Parsear configuración personalizada si existe
    let customConfig = null;
    if (req.body.columnConfig) {
      try {
        customConfig = JSON.parse(req.body.columnConfig);
        console.log(`⚙️ Usando configuración personalizada: ${customConfig.name}`);
      } catch (e) {
        console.error('❌ Error parseando columnConfig:', e);
      }
    }

    // Leer archivo Excel/CSV
    const workbook = XLSX.readFile(req.file.path, { 
      raw: false,
      FS: ';' // Soportar CSV con separador punto y coma
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });
    
    console.log(`📊 Archivo procesado: ${jsonData.length} filas`);
    if (jsonData.length > 0) {
      console.log('📋 Columnas detectadas:', Object.keys(jsonData[0]));
    }

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // Aplicar límite de filas
    const MAX_ROWS = 25000;
    if (jsonData.length > MAX_ROWS) {
      console.log(`⚠️ Archivo muy grande (${jsonData.length} filas). Procesando solo las primeras ${MAX_ROWS}.`);
      jsonData.splice(MAX_ROWS);
    }

    // Análisis dual
    const results = [];
    console.log(`🔄 Procesando ${jsonData.length} registros con análisis dual...`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (i % 500 === 0 && i > 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }
      const sentimentColumns = getSentimentColumns(row, customConfig);
      let dualAnalysis = { natural: [], nlpjs: [], consensus: [] };
      let overallScore = 0;
      let overallComparative = 0;
      let analysisCount = 0;
      for (const { column, text } of sentimentColumns) {
        const [naturalResult, nlpResult] = await Promise.all([
          Promise.resolve(analyzeTextEnhanced(text)),
          analyzeWithNLPjs(text)
        ]);
        
        // Saltar entradas ignoradas (sin comentario, ".", etc.)
        if (naturalResult.ignored) {
          continue; // No incluir en el análisis
        }
        
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        const consensus = determineConsensus(naturalResult, nlpResult);
        dualAnalysis.natural.push({
          column,
          text: limitedText,
          score: naturalResult.score || 0,
          classification: naturalResult.classification || getClassification(naturalResult.score || 0, naturalResult.confidence || 0.5),
          confidence: naturalResult.confidence || 0.5
        });
        dualAnalysis.nlpjs.push({
          column,
          text: limitedText,
          score: nlpResult.score || 0,
          classification: nlpResult.classification || getClassification(nlpResult.score || 0, nlpResult.confidence || 0.5),
          confidence: nlpResult.confidence || 0.5
        });
        dualAnalysis.consensus.push({
          column,
          text: limitedText,
          classification: consensus,
          naturalScore: naturalResult.score || 0,
          nlpScore: nlpResult.score || 0,
          averageScore: ((naturalResult.score || 0) + (nlpResult.score || 0)) / 2
        });
        overallScore += ((naturalResult.score || 0) + (nlpResult.score || 0)) / 2;
        overallComparative += ((naturalResult.comparative || 0) + (nlpResult.comparative || 0)) / 2;
        analysisCount++;
      }
      const averageScore = analysisCount > 0 ? overallScore / analysisCount : 0;
      const averageComparative = analysisCount > 0 ? overallComparative / analysisCount : 0;
      
      // Normalizar score a escala 0-10
      const clampedScore = Math.max(-10, Math.min(10, averageScore));
      let normalizedScore = ((clampedScore + 10) / 2);
      if (normalizedScore < 0) normalizedScore = 0;
      
      results.push({
        row: i + 1,
        ...row,
        sentiment: {
          score: parseFloat(averageScore.toFixed(2)),
          perColumnAvgScore: parseFloat(normalizedScore.toFixed(2)),
          comparative: parseFloat(averageComparative.toFixed(4)),
          overallComparative: parseFloat(averageComparative.toFixed(4)),
          confidence: parseFloat(averageConfidence.toFixed(2)),
          engine: 'both',
          analyzedColumns: sentimentColumns.map(c => c.column),
          dualAnalysis,
          details: dualAnalysis.consensus || []
        }
      });
    }

    console.log(`✅ Análisis dual completado`);

    // Calcular cuántos registros tienen clasificación válida (excluyendo "No clasificado")
    const quantitativeResponses = results.filter(r => r.sentiment.classification !== 'No clasificado').length;
    
    // Estadísticas generales (usar quantitativeResponses como base)
    const stats = calculateStats(results, quantitativeResponses);
    // Agregar el total absoluto al objeto statistics para el Excel
    stats.totalSurveys = results.length;
    
    // Extraer valores únicos para filtros
    const filterOptions = extractFilterOptions(jsonData, customConfig);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalResponses: results.length,
      quantitativeResponses: quantitativeResponses,
      engine: 'both',
      statistics: stats,
      filterOptions: filterOptions,
      results: results
    });

  } catch (error) {
    console.error('Error procesando archivo con análisis dual:', error);
    res.status(500).json({ error: 'Error procesando el archivo Excel: ' + error.message });
  }
});

// ============= NUEVO: Análisis con columna de validación =============
// Este endpoint NO hace análisis de sentimientos, sólo lee la columna "validación final"
app.post('/api/analyze-with-validation-column', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    console.log('📋 Analizando con columna de validación...');

    // Parsear configuración personalizada si existe
    let customConfig = null;
    if (req.body.columnConfig) {
      try {
        customConfig = JSON.parse(req.body.columnConfig);
        console.log(`⚙️ Usando configuración personalizada: ${customConfig.name}`);
      } catch (e) {
        console.error('❌ Error parseando columnConfig:', e);
      }
    }

    // Leer archivo Excel/CSV
    const workbook = XLSX.readFile(req.file.path, { 
      raw: false,
      FS: ';'
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });
    
    console.log(`📊 Archivo procesado: ${jsonData.length} filas`);
    
    if (jsonData.length > 0) {
      console.log('📋 Columnas detectadas:', Object.keys(jsonData[0]));
    }

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // Buscar la columna de validación (case-insensitive)
    const firstRow = jsonData[0];
    let validationColumnName = null;
    
    for (const columnName of Object.keys(firstRow)) {
      const normalizedName = columnName.toLowerCase().trim();
      if (normalizedName === 'validación final' || normalizedName === 'validacion final') {
        validationColumnName = columnName;
        break;
      }
    }

    if (!validationColumnName) {
      return res.status(400).json({ 
        error: 'No se encontró la columna "validación final" en el archivo. Por favor asegúrese de que existe.' 
      });
    }

    console.log(`✅ Columna de validación encontrada: "${validationColumnName}"`);

    // Aplicar límite de filas
    const MAX_ROWS = 25000;
    if (jsonData.length > MAX_ROWS) {
      console.log(`⚠️ Archivo muy grande (${jsonData.length} filas). Procesando solo las primeras ${MAX_ROWS}.`);
      jsonData.splice(MAX_ROWS);
    }

    const results = [];
    console.log(`🔄 Procesando ${jsonData.length} registros con columna de validación...`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      const numericValues = extractNumericValues(row);
      
      if (i % 500 === 0 && i > 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }

      // Leer el valor de la columna de validación
      const validationValue = (row[validationColumnName] || '').toString().toLowerCase().trim();
      
      // Mapear el valor a una clasificación y score
      let classification = 'No clasificado';
      let score = 5; // Neutral por defecto
      let confidence = 0;

      if (validationValue.includes('muy positiv')) {
        classification = 'Muy Positivo';
        score = 9;
        confidence = 1.0;
      } else if (validationValue.includes('positiv')) {
        classification = 'Positivo';
        score = 7;
        confidence = 1.0;
      } else if (validationValue.includes('neutral')) {
        classification = 'Neutral';
        score = 5;
        confidence = 1.0;
      } else if (validationValue.includes('muy negativ')) {
        classification = 'Muy Negativo';
        score = 1;
        confidence = 1.0;
      } else if (validationValue.includes('negativ')) {
        classification = 'Negativo';
        score = 3;
        confidence = 1.0;
      }

      // Obtener las columnas de texto para incluir en el resultado
      const sentimentColumns = getSentimentColumns(row, customConfig);
      const textDetails = sentimentColumns.map(({ column, text }) => {
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        return {
          column,
          text: limitedText,
          score,
          classification,
          confidence,
          validationSource: validationValue,
          engine: 'Columna de Validación'
        };
      });

      results.push({
        row: i + 1,
        ...row,
        numericMetrics: numericValues,
        sentiment: {
          score: parseFloat(score.toFixed(2)),
          perColumnAvgScore: parseFloat(score.toFixed(2)),
          comparative: 0,
          overallComparative: 0,
          confidence: parseFloat(confidence.toFixed(2)),
          classification,
          engine: 'Columna de Validación',
          validationColumn: validationColumnName,
          validationValue: validationValue,
          analyzedColumns: sentimentColumns.map(c => c.column),
          details: textDetails
        }
      });
    }

    console.log(`✅ Análisis completado con columna de validación`);

    // Calcular estadísticas
    const quantitativeResponses = results.filter(r => r.sentiment.classification !== 'No clasificado').length;
    const stats = calculateStats(results, quantitativeResponses);
    // Agregar el total absoluto al objeto statistics para el Excel
    stats.totalSurveys = results.length;
    
    // Extraer valores únicos para filtros
    const filterOptions = extractFilterOptions(jsonData, customConfig);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    if (results.length > 0) {
      saveLastAnalysis(results[0]);
    }

    res.json({
      success: true,
      totalResponses: results.length,
      quantitativeResponses: quantitativeResponses,
      engine: 'validation-column',
      validationColumn: validationColumnName,
      statistics: stats,
      filterOptions: filterOptions,
      results: results
    });

  } catch (error) {
    console.error('Error procesando archivo con columna de validación:', error);
    res.status(500).json({ error: 'Error procesando el archivo Excel: ' + error.message });
  }
});
// ============= FIN: Análisis con columna de validación =============

// Función de análisis de sentimientos (solo contenido del diccionario v4 activo)
function analyzeTextEnhanced(text) {
  const normalizedText = removeAccents(text.toLowerCase().trim());
  
  // Filtrar palabras/frases que deben ser ignoradas
  const shouldIgnore = IGNORED_PHRASES.some(phrase => {
    const normalizedPhrase = removeAccents(phrase.toLowerCase().trim());
    return normalizedText === normalizedPhrase || 
           (normalizedPhrase.length === 1 && normalizedText === normalizedPhrase) ||
           (normalizedText.length <= 3 && normalizedText === normalizedPhrase);
  });
  
  if (shouldIgnore) {
    // Retornar análisis neutral sin puntaje para textos ignorados
    return {
      score: 0,
      comparative: 0,
      positive: [],
      negative: [],
      neutral: [],
      confidence: 0,
      hasNegation: false,
      intensity: 0,
      matched: 0,
      totalWords: 0,
      recognizedWords: 0,
      phrases: [],
      ignored: true // Marcar como ignorado
    };
  }
  
  const tokens = normalizedText.split(/[^a-zA-Záéíóúüñ0-9]+/).filter(t => t.length > 0);
  const tokenSet = new Set(tokens);
  // FIX: Usar word boundaries para evitar detectar negaciones dentro de otras palabras
  // Ejemplo: "ni" NO debe detectarse en "orga-NI-zacionales"
  const hasNegation = negationWords.some(neg => {
    const regex = new RegExp(`\\b${escapeRegex(neg)}\\b`, 'i');
    return regex.test(normalizedText);
  });

  let rawScore = 0;
  const positives = [];
  const negatives = [];
  const neutrals = [];
  let matchedCount = 0;

  // Rastrear qué partes del texto ya fueron procesadas como frases
  const usedTokenIndices = new Set();

  // PASO 1: Buscar frases completas primero (tienen prioridad)
  for (const [key, value] of Object.entries(currentLabels)) {
    const normKey = removeAccents(key.toLowerCase().trim());
    if (!normKey) continue;
    if (normKey.includes(' ')) {
      // Buscar frases completas sin word boundaries estrictos
      if (normalizedText.includes(normKey)) {
        const count = (normalizedText.match(new RegExp(escapeRegex(normKey), 'g')) || []).length;
        rawScore += value * count;
        matchedCount += count;
        if (value > 0.5) positives.push(key); 
        else if (value < -0.5) negatives.push(key);
        else neutrals.push(key); // Valores entre -0.5 y +0.5 son neutrales
        
        // Marcar tokens de esta frase como usados
        const phraseTokens = normKey.split(/\s+/);
        phraseTokens.forEach(ptoken => {
          const idx = tokens.indexOf(ptoken);
          if (idx !== -1) usedTokenIndices.add(idx);
        });
      }
    }
  }

  // PASO 2: Buscar palabras individuales (solo las NO usadas en frases)
  for (const [key, value] of Object.entries(currentLabels)) {
    const normKey = removeAccents(key.toLowerCase().trim());
    if (!normKey) continue;
    if (!normKey.includes(' ')) {
      if (tokenSet.has(normKey)) {
        const tokenIdx = tokens.indexOf(normKey);
        // Solo contar si no fue parte de una frase
        if (tokenIdx !== -1 && !usedTokenIndices.has(tokenIdx)) {
          rawScore += value;
          matchedCount += 1;
          if (value > 0.5) positives.push(key); 
          else if (value < -0.5) negatives.push(key);
          else neutrals.push(key); // Valores entre -0.5 y +0.5 son neutrales
        }
      }
    }
  }

  if (matchedCount === 0 && normalizedText.length > 0 && normalizedText.split(/\s+/).length <= 30) {
    console.log(`[DEBUG] Sin coincidencias para: "${normalizedText}" | Ejemplos diccionario:`, Object.keys(currentLabels).slice(0,5));
  }

  // FIX: Eliminada inversión global de score por negación
  // Las negaciones ya se manejan a nivel palabra individual
  // "sin embargo" no debe invertir todo el análisis
  // if (hasNegation && rawScore !== 0) rawScore = -rawScore;

  const totalWords = tokens.length;
  const confidence = totalWords > 0 ? Math.min(1, matchedCount / totalWords) : 0;
  const comparative = totalWords > 0 ? rawScore / totalWords : 0;

  // Normalizar score a escala 0-10
  const limitedScore = Math.max(-10, Math.min(10, rawScore));
  const normalizedScore = (limitedScore + 10) / 2;
  
  // Calcular clasificación basada en score normalizado
  const classification = getClassification(normalizedScore, confidence);

  return {
    score: rawScore, // Score RELATIVO (valores +/- del neutral)
    normalizedScore: Math.round(normalizedScore * 100) / 100, // Score en escala 0-10
    comparative: Math.round(comparative * 100) / 100,
    classification: classification, // Clasificación basada en score normalizado
    positive: positives.slice(0,5),
    negative: negatives.slice(0,5),
    neutral: neutrals.slice(0,5), // Palabras neutrales detectadas
    confidence: Math.round(confidence * 100) / 100,
    hasNegation,
    intensity: 1,
    matched: matchedCount,
    totalWords,
    recognizedWords: matchedCount,
    phrases: []
  };
}

function removeAccents(str) { return str.normalize('NFD').replace(/\p{Diacritic}/gu, ''); }
function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// Eliminadas funciones de intensificadores, frases y patrones avanzados para asegurar uso exclusivo del diccionario v4.

/*
  INTENCIONALMENTE SIN funciones:
  - analyzeIntensity
  - countPhraseMatches
  - analyzeAdvancedPatterns
  Si se necesitan en el futuro, deberán basarse únicamente en el mismo diccionario activo.
*/

/*
// Ejemplo anterior (referencia, ahora deshabilitado):
// function analyzeAdvancedPatterns(text) {
//   return 0;
// }
*/
// (Se eliminó bloque de patrones avanzados para garantizar uso exclusivo de v4)

// Función para clasificar sentimiento mejorada
function getClassification(score, confidence = 0.5) {
  // Score esperado: 0 .. 10
  
  // Si no hay confianza (0%), significa que la palabra/frase NO está en el diccionario
  if (confidence === 0) return 'No clasificado';
  
  // Umbrales fijos (independientes de confidence para estabilidad):
  // >= 8 Muy Positivo
  // >= 6 Positivo
  // >= 4 y < 6 Neutral (palabra/frase en diccionario con valor cercano a 0)
  // >= 2 Negativo
  // < 2 Muy Negativo
  if (score >= 8) return 'Muy Positivo';
  if (score >= 6) return 'Positivo';
  if (score >= 4 && score < 6) return 'Neutral';
  if (score >= 2) return 'Negativo';
  return 'Muy Negativo';
}

// ======================== MOTORES DE ANÁLISIS MÚLTIPLES ========================

// 1. Motor Natural.js mejorado (actual)
function analyzeWithNatural(text) {
  const startTime = Date.now();
  const analysis = analyzeTextEnhanced(text);
  const endTime = Date.now();
  
  return {
    engine: 'Natural.js Enhanced',
    version: '1.0.0',
    score: analysis.normalizedScore, // Usar score normalizado para consistencia
    scoreRaw: analysis.score, // Score RAW disponible en detalles
    comparative: analysis.comparative,
    confidence: analysis.confidence,
    classification: analysis.classification, // Ya viene calculada correctamente
    positive: analysis.positive,
    negative: analysis.negative,
    neutral: analysis.neutral || [],
    responseTime: endTime - startTime,
    details: {
      totalWords: analysis.totalWords,
      recognizedWords: analysis.recognizedWords,
      phrases: analysis.phrases || []
    }
  };
}

// Función para análisis con NLP.js (AXA Group)
async function analyzeWithNLPjs(text) {
  const startTime = Date.now();
  
  try {
    // NLP.js incluye análisis de sentimientos automático
    const response = await nlpManager.process('es', text);
    
    // Extraer información de sentimientos de NLP.js
    const sentiment = response.sentiment || {};
    
    // Convertir score de NLP.js (rango -1 a 1) a escala 0-10
    let score = 5; // neutral por defecto
    if (sentiment.score !== undefined) {
      // NLP.js usa rango -1 (muy negativo) a 1 (muy positivo)
      // Convertir a rango 0-10
      score = ((sentiment.score + 1) / 2) * 10;
    }
    
    // Clasificar según el score
    let classification = 'Neutral';
    if (score >= 7) classification = 'Muy Positivo';
    else if (score >= 5.5) classification = 'Positivo';
    else if (score <= 3) classification = 'Muy Negativo';
    else if (score <= 4.5) classification = 'Negativo';
    
    return {
      engine: 'NLP.js (AXA)',
      version: '4.x',
      score: parseFloat(score.toFixed(1)),
      comparative: sentiment.comparative || 0,
      confidence: Math.abs(sentiment.score || 0),
      classification: classification,
      positive: sentiment.type === 'positive' ? [text] : [],
      negative: sentiment.type === 'negative' ? [text] : [],
      responseTime: Date.now() - startTime,
      details: {
        originalScore: sentiment.score || 0,
        vote: sentiment.vote || 'neutral',
        numWords: sentiment.numWords || 0,
        numHits: sentiment.numHits || 0,
        note: 'NLP.js con soporte nativo para español'
      }
    };
  } catch (error) {
    return {
      engine: 'NLP.js (AXA)',
      error: 'Error en análisis: ' + error.message,
      responseTime: Date.now() - startTime
    };
  }
}

// Función principal para análisis multi-motor (solo motores efectivos para español)
async function analyzeWithMultipleEngines(text, engines = ['natural']) {
  const results = {};
  const startTime = Date.now();
  
  for (const engine of engines) {
    switch (engine.toLowerCase()) {
      case 'natural':
        results.natural = analyzeWithNatural(text);
        break;
      case 'nlpjs':
      case 'nlp.js':
        results.nlpjs = await analyzeWithNLPjs(text);
        break;
      default:
        results[engine] = { error: `Motor no reconocido: ${engine}` };
    }
  }
  
  // Agregar estadísticas comparativas
  const totalTime = Date.now() - startTime;
  const validResults = Object.values(results).filter(r => !r.error);
  
  if (validResults.length > 1) {
    const avgScore = validResults.reduce((sum, r) => sum + (r.score || 0), 0) / validResults.length;
    const avgConfidence = validResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / validResults.length;
    const consensus = getClassification(avgScore, avgConfidence);
    
    results._comparison = {
      totalEngines: engines.length,
      successfulEngines: validResults.length,
      averageScore: Math.round(avgScore * 100) / 100,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      consensus: consensus,
      totalResponseTime: totalTime,
      agreement: calculateAgreement(validResults)
    };
  }
  
  return results;
}

// Función para calcular acuerdo entre motores
function calculateAgreement(results) {
  if (results.length < 2) return 'N/A';
  
  const classifications = results.map(r => r.classification);
  const mostCommon = classifications.reduce((a, b, i, arr) =>
    arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b
  );
  
  const agreement = classifications.filter(c => c === mostCommon).length / classifications.length;
  
  if (agreement >= 0.8) return 'Alto consenso';
  if (agreement >= 0.6) return 'Consenso moderado';
  if (agreement >= 0.4) return 'Consenso bajo';
  return 'Sin consenso';
}

// Función para extraer valores únicos de columnas para filtros
function extractFilterOptions(data, customConfig = null) {
  const config = customConfig || COLUMN_CONFIG;
  
  const options = {
    carreras: new Set(),
    materias: new Set(),
    modalidades: new Set(),
    sedes: new Set(),
    docentes: new Set()
  };
  
  // Mostrar las columnas disponibles en el Excel
  if (data.length > 0) {
    const columnNames = Object.keys(data[0]);
    console.log('📋 Columnas encontradas en el Excel:', columnNames);
  }
  
  // Usar la configuración de filtros definida en column-config.js o customConfig
  const carreraCol = config.filtros?.carrera || 'CARRERA';
  const materiaCol = config.filtros?.materia || 'MATERIA';
  const modalidadCol = config.filtros?.modalidad || 'MODALIDAD';
  const sedeCol = config.filtros?.sede || 'SEDE';
  const docenteCol = config.filtros?.docente || 'DOCENTE';
  
  data.forEach(row => {
    // Buscar CARRERA
    if (row[carreraCol] && typeof row[carreraCol] === 'string' && row[carreraCol].trim()) {
      options.carreras.add(row[carreraCol].trim());
    }
    
    // Buscar MATERIA
    if (row[materiaCol] && typeof row[materiaCol] === 'string' && row[materiaCol].trim()) {
      options.materias.add(row[materiaCol].trim());
    }
    
    // Buscar MODALIDAD
    if (row[modalidadCol] && typeof row[modalidadCol] === 'string' && row[modalidadCol].trim()) {
      options.modalidades.add(row[modalidadCol].trim());
    }
    
    // Buscar SEDE
    if (row[sedeCol] && typeof row[sedeCol] === 'string' && row[sedeCol].trim()) {
      options.sedes.add(row[sedeCol].trim());
    }
    
    // Buscar DOCENTE
    if (row[docenteCol] && typeof row[docenteCol] === 'string' && row[docenteCol].trim()) {
      options.docentes.add(row[docenteCol].trim());
    }
  });
  
  // Convertir Sets a arrays ordenados
  const result = {
    carreras: Array.from(options.carreras).sort(),
    materias: Array.from(options.materias).sort(),
    modalidades: Array.from(options.modalidades).sort(),
    sedes: Array.from(options.sedes).sort(),
    docentes: Array.from(options.docentes).sort(),
    numericQuestions: config.numericas || [],
    // Incluir nombres de columnas para que el frontend sepa qué buscar
    columnNames: {
      carrera: carreraCol,
      materia: materiaCol,
      modalidad: modalidadCol,
      sede: sedeCol,
      docente: docenteCol
    }
  };
  
  console.log(`📊 Filtros extraídos: ${result.carreras.length} carreras, ${result.materias.length} materias, ${result.modalidades.length} modalidades, ${result.sedes.length} sedes, ${result.docentes.length} docentes`);
  console.log(`📊 Columnas numéricas: ${result.numericQuestions.length} preguntas`);
  console.log(`📋 Nombres de columnas configurados:`, result.columnNames);
  
  return result;
}

// Función para calcular estadísticas
function calculateStats(results, qualitativeCount = null) {
  const classifications = {
    'Muy Positivo': 0,
    'Positivo': 0,
    'Neutral': 0,
    'Negativo': 0,
    'Muy Negativo': 0
  };

  let totalScore = 0;
  let totalComparative = 0;
  let validResults = 0;

  results.forEach(result => {
    if (result.sentiment && result.sentiment.details && result.sentiment.details.length > 0) {
      const avgScore = typeof result.sentiment.perColumnAvgScore === 'number'
        ? result.sentiment.perColumnAvgScore
        : 5; // Neutral en escala 0..10 = 5

      // Usar la función getClassification con umbrales correctos 0..10
      const classification = result.sentiment.classification || getClassification(avgScore);

      classifications[classification]++;
      totalScore += avgScore;
      totalComparative += (typeof result.sentiment.overallComparative === 'number' ? result.sentiment.overallComparative : 0);
      validResults++;
    }
  });

  // Calcular promedio sobre validResults (filas que tienen análisis)
  const averageScore = validResults > 0 ? totalScore / validResults : 5; // 5 = neutral
  const averageComparative = validResults > 0 ? totalComparative / validResults : 0;
  
  // Calcular suma total de clasificaciones
  const totalClassified = classifications['Muy Positivo'] + classifications['Positivo'] + 
                          classifications['Neutral'] + classifications['Negativo'] + 
                          classifications['Muy Negativo'];
  
  // CORRECCIÓN: Usar qualitativeCount (respuestas cualitativas) como base para porcentajes
  // Si no se proporciona qualitativeCount, usar totalClassified como fallback
  const baseForPercentages = qualitativeCount !== null && qualitativeCount > 0 ? qualitativeCount : (totalClassified > 0 ? totalClassified : 1);
  
  // DEBUG: Mostrar qué se está usando
  console.log('📊 calculateStats DEBUG:');
  console.log(`  - validResults (filas con sentiment): ${validResults}`);
  console.log(`  - qualitativeCount (filas con texto): ${qualitativeCount}`);
  console.log(`  - totalClassified (suma de clasificaciones): ${totalClassified}`);
  console.log(`  - baseForPercentages: ${baseForPercentages}`);
  console.log(`  - totalScore acumulado: ${totalScore.toFixed(2)}`);
  console.log(`  - averageScore (totalScore/${validResults}): ${averageScore.toFixed(2)}`);
  console.log(`  - Clasificaciones: MuyPos=${classifications['Muy Positivo']}, Pos=${classifications['Positivo']}, Neutro=${classifications['Neutral']}, Neg=${classifications['Negativo']}, MuyNeg=${classifications['Muy Negativo']}`);
  
  // Calcular porcentajes sobre respuestas cualitativas (los que respondieron)
  const percentages = {
    'Muy Positivo': (classifications['Muy Positivo'] / baseForPercentages * 100),
    'Positivo': (classifications['Positivo'] / baseForPercentages * 100),
    'Neutral': (classifications['Neutral'] / baseForPercentages * 100),
    'Negativo': (classifications['Negativo'] / baseForPercentages * 100),
    'Muy Negativo': (classifications['Muy Negativo'] / baseForPercentages * 100)
  };
  
  console.log(`  - Porcentajes brutos: MuyPos=${percentages['Muy Positivo']}, Pos=${percentages['Positivo']}, Neutro=${percentages['Neutral']}, Neg=${percentages['Negativo']}, MuyNeg=${percentages['Muy Negativo']}`);
  console.log(`  - Suma de porcentajes: ${(percentages['Muy Positivo'] + percentages['Positivo'] + percentages['Neutral'] + percentages['Negativo'] + percentages['Muy Negativo']).toFixed(1)}%`);
  
  // Score ya está en escala 0..10, no requiere normalización

  return {
    classifications: classifications,
    averageScore: parseFloat(averageScore.toFixed(2)), // Promedio 0..10
    rawScore: parseFloat(averageScore.toFixed(2)), // Score 0..10
    averageComparative: parseFloat(averageComparative.toFixed(4)),
    totalResults: totalClassified, // Total de respuestas clasificadas
    quantitativeResponses: qualitativeCount, // Total que contestó cualitativo
    percentages: {
      'Muy Positivo': parseFloat(percentages['Muy Positivo'].toFixed(1)),
      'Positivo': parseFloat(percentages['Positivo'].toFixed(1)),
      'Neutral': parseFloat(percentages['Neutral'].toFixed(1)),
      'Negativo': parseFloat(percentages['Negativo'].toFixed(1)),
      'Muy Negativo': parseFloat(percentages['Muy Negativo'].toFixed(1))
    }
  };
}

// Endpoint para exportar resultados
app.post('/api/export', (req, res) => {
  try {
    const { data, format } = req.body;
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=analisis-resultados.json');
      res.send(JSON.stringify(data, null, 2));
    } else if (format === 'csv') {
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=analisis-resultados.csv');
      res.send(csv);
    } else {
      res.status(400).json({ error: 'Formato no soportado' });
    }
  } catch (error) {
    console.error('Error exportando resultados:', error);
    res.status(500).json({ error: 'Error exportando resultados' });
  }
});

// Función para convertir a CSV
function convertToCSV(data) {
  const headers = ['ID', 'Clasificación', 'Puntuación', 'Puntuación Comparativa'];
  const rows = data.results.map(result => [
    result.id,
    result.sentiment.classification,
    result.sentiment.overallScore,
    result.sentiment.overallComparative.toFixed(3)
  ]);
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// ============= FUNCIÓN DE EXPORTACIÓN AVANZADA XLSX =============

async function generateAdvancedExcelReport(analysisResults, customConfig = null, originalFilename = 'archivo.xlsx', statistics = null) {
  const workbook = new ExcelJS.Workbook();
  
  console.log(`📊 Generando Excel con ${analysisResults.length} registros`);
  
  if (analysisResults.length === 0) {
    console.warn('⚠️ No hay resultados para generar Excel');
    return workbook;
  }

  // ========== HOJA 0: PORTADA ==========
  await createCoverSheet(workbook, analysisResults, customConfig, originalFilename, statistics);
  
  // ========== HOJA 1: CÓMO SE CALCULAN LOS RESULTADOS ==========
  await createMethodologySheet(workbook);
  
  // ========== HOJA 2: DATOS DETALLADOS ==========
  const detailSheet = workbook.addWorksheet('Datos Detallados');
  
  // Obtener todas las columnas originales del primer registro
  const firstRow = analysisResults[0];
  const originalColumns = Object.keys(firstRow).filter(key => 
    key !== 'sentimentAnalysis' && 
    key !== 'sentiment' && 
    key !== 'comentario_materia' && 
    key !== 'comentario_docente'
  );
  
  console.log(`📋 Columnas originales detectadas: ${originalColumns.length}`);
  
  // DEBUG: Ver qué columnas tienen análisis en el primer registro
  if (firstRow.sentimentAnalysis) {
    console.log(`🔍 Columnas con análisis en primer registro:`, Object.keys(firstRow.sentimentAnalysis));
  }
  
  // Identificar columnas de texto libre - usar las que realmente tienen análisis
  let textColumns = [];
  
  // PRIORIDAD 1: Usar las columnas que realmente tienen análisis
  // Recorrer todos los registros para encontrar todas las columnas analizadas
  // IMPORTANTE: Solo incluir columnas que existen en originalColumns (después del filtrado)
  const analyzedColumns = new Set();
  analysisResults.forEach(result => {
    if (result.sentimentAnalysis) {
      Object.keys(result.sentimentAnalysis).forEach(col => {
        // Solo agregar si la columna existe en los datos filtrados
        if (originalColumns.includes(col)) {
          analyzedColumns.add(col);
        }
      });
    }
  });
  
  if (analyzedColumns.size > 0) {
    textColumns = Array.from(analyzedColumns);
    console.log(`📝 Columnas de texto detectadas desde sentimentAnalysis (${analyzedColumns.size}):`, textColumns);
  } else if (customConfig && customConfig.columnas) {
    // PRIORIDAD 2: Config personalizada
    const textoLibreConfig = customConfig.columnas.find(c => c.tipo === 'textoLibre');
    if (textoLibreConfig && textoLibreConfig.valores) {
      textColumns = textoLibreConfig.valores;
      console.log(`📝 Columnas de texto libre desde config: ${textColumns.join(', ')}`);
    }
  } else {
    // PRIORIDAD 3: Auto-detectar (fallback)
    textColumns = originalColumns.filter(col => {
      const sampleValue = firstRow[col];
      return sampleValue && typeof sampleValue === 'string' && sampleValue.length > 20;
    });
    console.log(`📝 Columnas de texto auto-detectadas: ${textColumns.join(', ')}`);
  }

  // Configurar columnas: originales + análisis de sentimientos
  const excelColumns = [];
  
  // Agregar columnas originales
  originalColumns.forEach(col => {
    excelColumns.push({
      header: col,
      key: col,
      width: col.length > 30 ? 50 : Math.max(col.length + 5, 15)
    });
  });
  
  // Agregar columnas de análisis para cada columna de texto
  textColumns.forEach(col => {
    excelColumns.push({
      header: `${col} - Sentiment`,
      key: `${col}_sentiment`,
      width: 20
    });
    excelColumns.push({
      header: `${col} - Score`,
      key: `${col}_score`,
      width: 12
    });
    excelColumns.push({
      header: `${col} - Score Normalizado (0-10)`,
      key: `${col}_normalized_score`,
      width: 18
    });
  });
  
  detailSheet.columns = excelColumns;
  
  // Estilo del encabezado
  const headerRow = detailSheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Agregar datos
  analysisResults.forEach((result, index) => {
    const row = detailSheet.getRow(index + 2);
    
    // Escribir columnas originales
    originalColumns.forEach(col => {
      row.getCell(col).value = result[col] || '';
    });
    
    // Escribir análisis de sentimientos
    if (result.sentimentAnalysis) {
      textColumns.forEach(col => {
        const colAnalysis = result.sentimentAnalysis[col];
        if (colAnalysis) {
          const sentiment = colAnalysis.consensus || colAnalysis.classification || 'N/A';
          const score = colAnalysis.score || (colAnalysis.natural && colAnalysis.natural.score) || 0;
          
          const sentimentCell = row.getCell(`${col}_sentiment`);
          const scoreCell = row.getCell(`${col}_score`);
          const normalizedScoreCell = row.getCell(`${col}_normalized_score`);
          
          sentimentCell.value = sentiment;
          scoreCell.value = typeof score === 'number' ? score : 0;
          
          // Score normalizado (0-10) desde el análisis general del registro
          const normalizedScore = result.sentiment && typeof result.sentiment.perColumnAvgScore === 'number' 
            ? result.sentiment.perColumnAvgScore 
            : null;
          if (normalizedScore !== null) {
            normalizedScoreCell.value = normalizedScore;
            normalizedScoreCell.numFmt = '0.00';
          }
          
          // Aplicar color según sentiment
          if (typeof sentiment === 'string') {
            if (sentiment.toLowerCase().includes('positiv')) {
              sentimentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
              sentimentCell.font = { color: { argb: 'FF2E7D2E' }, bold: true };
            } else if (sentiment.toLowerCase().includes('negativ')) {
              sentimentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };
              sentimentCell.font = { color: { argb: 'FFC53030' }, bold: true };
            } else if (sentiment.toLowerCase().includes('neutral')) {
              sentimentCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3E2' } };
              sentimentCell.font = { color: { argb: 'FF8B5A00' }, bold: true };
            }
          }
        }
      });
    }
  });
  
  // Aplicar filtros automáticos
  detailSheet.autoFilter = {
    from: 'A1',
    to: detailSheet.lastColumn.letter + '1'
  };
  
  console.log('✅ Hoja "Datos Detallados" creada');

  // ========== HOJAS DE RESUMEN ==========
  const groupFields = ['carrera', 'docente', 'materia', 'sede', 'modalidad'];
  
  for (const field of groupFields) {
    // Verificar si existe este campo en los datos
    const hasField = originalColumns.some(col => 
      col.toLowerCase() === field || 
      col.toLowerCase().includes(field)
    );
    
    if (hasField || field === 'carrera') { // Siempre crear carrera aunque no exista
      const sheetName = `Resumen por ${field.charAt(0).toUpperCase() + field.slice(1)}`;
      const summarySheet = workbook.addWorksheet(sheetName);
      await createDynamicSummarySheet(summarySheet, analysisResults, field, textColumns, customConfig);
      console.log(`✅ Hoja "${sheetName}" creada`);
    }
  }

  return workbook;
}

// Función para crear la hoja de portada
async function createCoverSheet(workbook, data, customConfig, originalFilename, statistics = null) {
  const sheet = workbook.addWorksheet('Portada', { views: [{ showGridLines: false }] });
  
  // Ajustar anchos de columnas
  sheet.columns = [
    { width: 3 },
    { width: 45 },  // Aumentado para boxes de preguntas
    { width: 45 },  // Aumentado para boxes de preguntas
    { width: 45 },  // Aumentado para boxes de preguntas
    { width: 20 },
    { width: 3 }
  ];
  
  let currentRow = 2;
  
  // ===== TÍTULO PRINCIPAL =====
  sheet.mergeCells(`B${currentRow}:E${currentRow}`);
  const titleCell = sheet.getCell(`B${currentRow}`);
  titleCell.value = 'REPORTE DE ANÁLISIS DE ENCUESTAS';
  titleCell.font = { size: 18, bold: true, color: { argb: 'FF2C5282' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  currentRow += 2;
  
  // ===== INFORMACIÓN DEL ARCHIVO =====
  sheet.mergeCells(`B${currentRow}:D${currentRow}`);
  const infoHeaderCell = sheet.getCell(`B${currentRow}`);
  infoHeaderCell.value = 'INFORMACIÓN DEL ANÁLISIS';
  infoHeaderCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  infoHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
  infoHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(currentRow).height = 25;
  currentRow++;
  
  // Archivo de origen
  const fileRow = currentRow;
  sheet.getCell(`B${fileRow}`).value = 'Archivo de Origen:';
  sheet.getCell(`B${fileRow}`).font = { bold: true };
  sheet.mergeCells(`C${fileRow}:D${fileRow}`);
  sheet.getCell(`C${fileRow}`).value = originalFilename;
  currentRow++;
  
  // Extraer información única del dataset
  const carreras = [...new Set(data.map(d => d.CARRERA || d.carrera || 'N/A').filter(c => c && c !== ''))];
  const materias = [...new Set(data.map(d => d.MATERIA || d.materia || 'N/A').filter(m => m && m !== ''))];
  const sedes = [...new Set(data.map(d => d.SEDE || d.sede || 'N/A').filter(s => s && s !== ''))];
  const modalidades = [...new Set(data.map(d => d.MODALIDAD || d.modalidad || 'N/A').filter(m => m && m !== ''))];
  const docentes = [...new Set(data.map(d => d.DOCENTE || d.docente || 'N/A').filter(d => d && d !== ''))];
  
  // Carreras
  sheet.getCell(`B${currentRow}`).value = 'Carreras:';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.mergeCells(`C${currentRow}:D${currentRow}`);
  sheet.getCell(`C${currentRow}`).value = carreras.length > 3 ? `${carreras.length} carreras diferentes` : carreras.join(', ');
  sheet.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow++;
  
  // Materias
  sheet.getCell(`B${currentRow}`).value = 'Materias:';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.mergeCells(`C${currentRow}:D${currentRow}`);
  sheet.getCell(`C${currentRow}`).value = materias.length > 3 ? `${materias.length} materias diferentes` : materias.join(', ');
  sheet.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow++;
  
  // Sedes
  sheet.getCell(`B${currentRow}`).value = 'Sedes:';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.mergeCells(`C${currentRow}:D${currentRow}`);
  sheet.getCell(`C${currentRow}`).value = sedes.join(', ');
  currentRow++;
  
  // Modalidades
  sheet.getCell(`B${currentRow}`).value = 'Modalidades:';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.mergeCells(`C${currentRow}:D${currentRow}`);
  sheet.getCell(`C${currentRow}`).value = modalidades.join(', ');
  currentRow++;
  
  // Docentes
  sheet.getCell(`B${currentRow}`).value = 'Docentes:';
  sheet.getCell(`B${currentRow}`).font = { bold: true };
  sheet.mergeCells(`C${currentRow}:D${currentRow}`);
  sheet.getCell(`C${currentRow}`).value = docentes.length > 3 ? `${docentes.length} docentes diferentes` : docentes.join(', ');
  sheet.getCell(`C${currentRow}`).alignment = { wrapText: true };
  currentRow += 2;
  
  // ===== ANÁLISIS CUALITATIVO =====
  sheet.mergeCells(`B${currentRow}:D${currentRow}`);
  const qualHeaderCell = sheet.getCell(`B${currentRow}`);
  qualHeaderCell.value = 'ANÁLISIS CUALITATIVO (SENTIMIENTOS)';
  qualHeaderCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  qualHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
  qualHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(currentRow).height = 25;
  currentRow++;
  
  currentRow++; // Fila en blanco después del header
  
  // USAR ESTADÍSTICAS PRECALCULADAS (ya vienen de calculateStats)
  let totalSurveys, totalQualitativeRows, avgScore, pctPositivos, pctNegativos, pctNeutrales, positivos, negativos, neutrales;
  
  if (statistics) {
    // Usar las estadísticas que ya calculó la app
    totalSurveys = statistics.totalSurveys || data.length; // Total absoluto de encuestas
    totalQualitativeRows = statistics.quantitativeResponses || statistics.totalResults; // Los que contestaron cualitativo
    avgScore = typeof statistics.averageScore === 'number' ? statistics.averageScore.toFixed(2) : statistics.averageScore;
    
    // Parsear porcentajes y sumar correctamente
    const pctMuyPositivo = parseFloat(statistics.percentages['Muy Positivo'] || 0);
    const pctPositivo = parseFloat(statistics.percentages['Positivo'] || 0);
    const pctNeutral = parseFloat(statistics.percentages['Neutral'] || 0);
    const pctNegativo = parseFloat(statistics.percentages['Negativo'] || 0);
    const pctMuyNegativo = parseFloat(statistics.percentages['Muy Negativo'] || 0);
    
    pctPositivos = (pctMuyPositivo + pctPositivo).toFixed(1);
    pctNegativos = (pctNegativo + pctMuyNegativo).toFixed(1);
    pctNeutrales = pctNeutral.toFixed(1);
    
    // Calcular conteos absolutos desde los porcentajes sobre respuestas cualitativas
    positivos = Math.round(totalQualitativeRows * parseFloat(pctPositivos) / 100);
    negativos = Math.round(totalQualitativeRows * parseFloat(pctNegativos) / 100);
    neutrales = Math.round(totalQualitativeRows * parseFloat(pctNeutrales) / 100);
    
    console.log('📊 Portada Excel - Usando estadísticas precalculadas:', {
      totalSurveys: totalSurveys,
      qualitative: totalQualitativeRows,
      score: avgScore,
      positivos: `${positivos} (${pctPositivos}%)`,
      neutrales: `${neutrales} (${pctNeutrales}%)`,
      negativos: `${negativos} (${pctNegativos}%)`
    });
  } else {
    // Fallback si no se pasaron estadísticas
    console.warn('⚠️ No se recibieron estadísticas precalculadas');
    totalSurveys = data.length;
    totalQualitativeRows = 0;
    avgScore = '0.00';
    pctPositivos = '0.0';
    pctNegativos = '0.0';
    pctNeutrales = '0.0';
    positivos = 0;
    negativos = 0;
    neutrales = 0;
  }
  
  // Boxes estilo web - fila 1
  const boxRow1 = currentRow;
  currentRow++;
  
  // Box 1: Total Respuestas (absoluto)
  sheet.getCell(`B${boxRow1}`).value = 'Total Respuestas';
  sheet.getCell(`B${boxRow1}`).font = { bold: true, size: 11 };
  sheet.getCell(`B${boxRow1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.getCell(`B${boxRow1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${boxRow1 + 1}`).value = totalSurveys;
  sheet.getCell(`B${boxRow1 + 1}`).font = { bold: true, size: 20, color: { argb: 'FF2D3748' } };
  sheet.getCell(`B${boxRow1 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${boxRow1}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`B${boxRow1 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getRow(boxRow1).height = 20;
  sheet.getRow(boxRow1 + 1).height = 35;
  
  // Box 2: Respuestas Cualitativas  
  sheet.getCell(`C${boxRow1}`).value = 'Respuestas Cualitativas';
  sheet.getCell(`C${boxRow1}`).font = { bold: true, size: 11 };
  sheet.getCell(`C${boxRow1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.getCell(`C${boxRow1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${boxRow1 + 1}`).value = totalQualitativeRows;
  sheet.getCell(`C${boxRow1 + 1}`).font = { bold: true, size: 20, color: { argb: 'FF2D3748' } };
  sheet.getCell(`C${boxRow1 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${boxRow1}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`C${boxRow1 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  // Box 3: Promedio General
  sheet.getCell(`D${boxRow1}`).value = 'Promedio General';
  sheet.getCell(`D${boxRow1}`).font = { bold: true, size: 11 };
  sheet.getCell(`D${boxRow1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.getCell(`D${boxRow1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${boxRow1 + 1}`).value = parseFloat(avgScore);
  sheet.getCell(`D${boxRow1 + 1}`).font = { bold: true, size: 20, color: { argb: 'FF2D3748' } };
  sheet.getCell(`D${boxRow1 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${boxRow1 + 1}`).numFmt = '0.00';
  sheet.getCell(`D${boxRow1}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`D${boxRow1 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  currentRow += 2;
  
  // Boxes estilo web - fila 2
  const boxRow2 = currentRow;
  currentRow++;
  
  // Box 3: Positivos (Verde)
  sheet.getCell(`B${boxRow2}`).value = 'Positivos';
  sheet.getCell(`B${boxRow2}`).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(`B${boxRow2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF48BB78' } };
  sheet.getCell(`B${boxRow2}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${boxRow2 + 1}`).value = `${positivos} (${pctPositivos}%)`;
  sheet.getCell(`B${boxRow2 + 1}`).font = { bold: true, size: 16, color: { argb: 'FF22543D' } };
  sheet.getCell(`B${boxRow2 + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6F6D5' } };
  sheet.getCell(`B${boxRow2 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${boxRow2}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`B${boxRow2 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getRow(boxRow2).height = 20;
  sheet.getRow(boxRow2 + 1).height = 35;
  
  // Box 4: Neutrales (Amarillo)
  sheet.getCell(`C${boxRow2}`).value = 'Neutrales';
  sheet.getCell(`C${boxRow2}`).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(`C${boxRow2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED8936' } };
  sheet.getCell(`C${boxRow2}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${boxRow2 + 1}`).value = `${neutrales} (${pctNeutrales}%)`;
  sheet.getCell(`C${boxRow2 + 1}`).font = { bold: true, size: 16, color: { argb: 'FF7C2D12' } };
  sheet.getCell(`C${boxRow2 + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEEBC8' } };
  sheet.getCell(`C${boxRow2 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${boxRow2}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`C${boxRow2 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  // Box 5: Negativos (Rojo)
  sheet.getCell(`D${boxRow2}`).value = 'Negativos';
  sheet.getCell(`D${boxRow2}`).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(`D${boxRow2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF56565' } };
  sheet.getCell(`D${boxRow2}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${boxRow2 + 1}`).value = `${negativos} (${pctNegativos}%)`;
  sheet.getCell(`D${boxRow2 + 1}`).font = { bold: true, size: 16, color: { argb: 'FF742A2A' } };
  sheet.getCell(`D${boxRow2 + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7D7' } };
  sheet.getCell(`D${boxRow2 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${boxRow2}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`D${boxRow2 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  currentRow += 3;
  
  // ===== ANÁLISIS CUANTITATIVO =====
  sheet.mergeCells(`B${currentRow}:D${currentRow}`);
  const quantHeaderCell = sheet.getCell(`B${currentRow}`);
  quantHeaderCell.value = 'ANÁLISIS CUANTITATIVO (PROMEDIOS)';
  quantHeaderCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  quantHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5282' } };
  quantHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(currentRow).height = 25;
  currentRow++;
  
  currentRow++; // Fila en blanco después del header
  
  // Obtener columnas numéricas desde la configuración (igual que frontend)
  let numericFields = [];
  const config = customConfig || COLUMN_CONFIG;
  if (config && config.numericas && config.numericas.length > 0) {
    numericFields = config.numericas;
    console.log(`📊 Usando ${numericFields.length} columnas numéricas desde configuración`);
  } else {
    // Fallback: autodetectar solo si no hay configuración
    const firstItem = data[0];
    numericFields = Object.keys(firstItem).filter(key => {
      const value = firstItem[key];
      return !isNaN(value) && value !== '' && value !== null && 
             key !== 'ID' && !key.toLowerCase().includes('comision') &&
             key !== 'sentimentAnalysis';
    });
    console.log(`📊 Auto-detectadas ${numericFields.length} columnas numéricas para Excel (sin configuración)`);
  }
  
// Función compartida para determinar color de score (DEBE coincidir con frontend)
function getScoreColorClass(score, escalaConfig = null) {
  // Si no hay configuración de escala o es estándar 1-10, usar score directo
  if (!escalaConfig || (escalaConfig.min === 1 && escalaConfig.max === 10 && escalaConfig.direction !== 'descending')) {
    // Escala fija: 1-3 rojo, 4-6 naranja, 7-10 verde
    if (score >= 7) return 'green';   // Verde: 7-10
    if (score >= 4) return 'yellow';  // Naranja: 4-6
    return 'red';                      // Rojo: 1-3
  }
  
  // Si hay escala personalizada, normalizar a 1-10
  const range = escalaConfig.max - escalaConfig.min;
  let normalizedScore = score;
  
  if (range > 0) {
    normalizedScore = ((score - escalaConfig.min) / range) * 10;
    
    // Si es descendente, invertir
    if (escalaConfig.direction === 'descending') {
      normalizedScore = 10 - normalizedScore;
    }
  }
  
  // Escala fija: 1-3 rojo, 4-6 naranja, 7-10 verde
  if (normalizedScore >= 7) return 'green';   // Verde: 7-10
  if (normalizedScore >= 4) return 'yellow';  // Naranja: 4-6
  return 'red';                                // Rojo: 1-3
}

// Calcular estadísticas numéricas (con normalización para colores)
  const numericStats = {};
  numericFields.forEach(field => {
    const values = data.map(d => parseFloat(d[field])).filter(v => !isNaN(v) && v > 0);
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      
      // Obtener configuración de escala si existe
      const escalaConfig = (customConfig && customConfig.escalas && customConfig.escalas[field]) || null;
      
      numericStats[field] = {
        avg: avg.toFixed(2),           // Valor original para mostrar
        escalaConfig: escalaConfig,    // Configuración de escala para colores
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    } else {
      console.log(`⚠️ Campo "${field}" no tiene valores válidos (>0), se omitirá en el reporte`);
    }
  });
  
  // Calcular promedio general
  const allNumericValues = Object.values(numericStats).map(s => parseFloat(s.avg));
  const generalAvg = allNumericValues.length > 0 
    ? (allNumericValues.reduce((a, b) => a + b, 0) / allNumericValues.length).toFixed(2)
    : 0;
  
  // Boxes cuantitativos - fila 1
  const quantBoxRow1 = currentRow;
  currentRow++;
  
  // Box 1: Total Respuestas
  sheet.getCell(`B${quantBoxRow1}`).value = 'Total Respuestas';
  sheet.getCell(`B${quantBoxRow1}`).font = { bold: true, size: 11 };
  sheet.getCell(`B${quantBoxRow1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.getCell(`B${quantBoxRow1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${quantBoxRow1 + 1}`).value = data.length;
  sheet.getCell(`B${quantBoxRow1 + 1}`).font = { bold: true, size: 20, color: { argb: 'FF2C5282' } };
  sheet.getCell(`B${quantBoxRow1 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${quantBoxRow1}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`B${quantBoxRow1 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getRow(quantBoxRow1).height = 20;
  sheet.getRow(quantBoxRow1 + 1).height = 35;
  
  // Box 2: Promedio General
  sheet.getCell(`C${quantBoxRow1}`).value = 'Promedio General';
  sheet.getCell(`C${quantBoxRow1}`).font = { bold: true, size: 11 };
  sheet.getCell(`C${quantBoxRow1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.getCell(`C${quantBoxRow1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${quantBoxRow1 + 1}`).value = parseFloat(generalAvg);
  sheet.getCell(`C${quantBoxRow1 + 1}`).font = { bold: true, size: 20, color: { argb: 'FF2C5282' } };
  sheet.getCell(`C${quantBoxRow1 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${quantBoxRow1 + 1}`).numFmt = '0.00';
  sheet.getCell(`C${quantBoxRow1}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`C${quantBoxRow1 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  // Box 3: Total Preguntas
  sheet.getCell(`D${quantBoxRow1}`).value = 'Total Preguntas';
  sheet.getCell(`D${quantBoxRow1}`).font = { bold: true, size: 11 };
  sheet.getCell(`D${quantBoxRow1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.getCell(`D${quantBoxRow1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${quantBoxRow1 + 1}`).value = numericFields.length;
  sheet.getCell(`D${quantBoxRow1 + 1}`).font = { bold: true, size: 20, color: { argb: 'FF2C5282' } };
  sheet.getCell(`D${quantBoxRow1 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${quantBoxRow1}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`D${quantBoxRow1 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  currentRow += 2;
  
  // Boxes con rangos de satisfacción
  const quantBoxRow2 = currentRow;
  currentRow++;
  
  // Contar respuestas por rango (asumiendo escala 1-10)
  let rango8_10 = 0;
  let rango6_7 = 0;
  let rango1_5 = 0;
  
  Object.values(numericStats).forEach(stat => {
    const avg = parseFloat(stat.avg);
    if (avg >= 8) rango8_10++;
    else if (avg >= 6) rango6_7++;
    else rango1_5++;
  });
  
  // Box Alta Satisfacción (8-10) - Verde
  sheet.getCell(`B${quantBoxRow2}`).value = 'Alta (8-10)';
  sheet.getCell(`B${quantBoxRow2}`).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(`B${quantBoxRow2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF38A169' } };
  sheet.getCell(`B${quantBoxRow2}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${quantBoxRow2 + 1}`).value = rango8_10;
  sheet.getCell(`B${quantBoxRow2 + 1}`).font = { bold: true, size: 16, color: { argb: 'FF22543D' } };
  sheet.getCell(`B${quantBoxRow2 + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6F6D5' } };
  sheet.getCell(`B${quantBoxRow2 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`B${quantBoxRow2}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`B${quantBoxRow2 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getRow(quantBoxRow2).height = 20;
  sheet.getRow(quantBoxRow2 + 1).height = 35;
  
  // Box Media Satisfacción (6-7) - Amarillo
  sheet.getCell(`C${quantBoxRow2}`).value = 'Media (6-7)';
  sheet.getCell(`C${quantBoxRow2}`).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(`C${quantBoxRow2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDD6B20' } };
  sheet.getCell(`C${quantBoxRow2}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${quantBoxRow2 + 1}`).value = rango6_7;
  sheet.getCell(`C${quantBoxRow2 + 1}`).font = { bold: true, size: 16, color: { argb: 'FF7C2D12' } };
  sheet.getCell(`C${quantBoxRow2 + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEEBC8' } };
  sheet.getCell(`C${quantBoxRow2 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`C${quantBoxRow2}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`C${quantBoxRow2 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  // Box Baja Satisfacción (1-5) - Rojo
  sheet.getCell(`D${quantBoxRow2}`).value = 'Baja (1-5)';
  sheet.getCell(`D${quantBoxRow2}`).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
  sheet.getCell(`D${quantBoxRow2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE53E3E' } };
  sheet.getCell(`D${quantBoxRow2}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${quantBoxRow2 + 1}`).value = rango1_5;
  sheet.getCell(`D${quantBoxRow2 + 1}`).font = { bold: true, size: 16, color: { argb: 'FF742A2A' } };
  sheet.getCell(`D${quantBoxRow2 + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7D7' } };
  sheet.getCell(`D${quantBoxRow2 + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell(`D${quantBoxRow2}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  sheet.getCell(`D${quantBoxRow2 + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  
  currentRow += 3;
  
  // ===== GENERAR GRÁFICOS COMO IMÁGENES =====
  const chartStartRow = currentRow;
  try {
    // Datos para los gráficos (colores iguales al sitio web, valores directos de classifications)
    const sentimentData = [
      { label: 'Muy Positivo', value: statistics?.classifications['Muy Positivo'] || 0, color: '#28a745' },
      { label: 'Positivo', value: statistics?.classifications['Positivo'] || 0, color: '#17a2b8' },
      { label: 'Neutral', value: statistics?.classifications['Neutral'] || 0, color: '#6c757d' },
      { label: 'Negativo', value: statistics?.classifications['Negativo'] || 0, color: '#fd7e14' },
      { label: 'Muy Negativo', value: statistics?.classifications['Muy Negativo'] || 0, color: '#dc3545' }
    ];
    
    const chartJSNodeCanvas = new ChartJSNodeCanvas({ 
      width: 1200, 
      height: 900,
      chartCallback: (ChartJS) => {
        ChartJS.defaults.font.family = 'Arial';
      }
    });
    
    // 1. GRÁFICO DE DONA - Distribución de Sentimientos
    const totalSentiment = sentimentData.reduce((sum, d) => sum + d.value, 0);
    const pieChartConfig = {
      type: 'doughnut',
      data: {
        labels: sentimentData.map(d => d.label),
        datasets: [{
          data: sentimentData.map(d => d.value),
          backgroundColor: sentimentData.map(d => d.color),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribucion de Sentimientos',
            font: { size: 40, weight: 'bold', family: 'Arial' }
          },
          legend: {
            position: 'bottom',
            labels: { 
              font: { size: 26, family: 'Arial' },
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  return data.labels.map((label, i) => {
                    const value = data.datasets[0].data[i];
                    const percentage = totalSentiment > 0 ? ((value / totalSentiment) * 100).toFixed(1) : 0;
                    return {
                      text: label + ': ' + percentage + '%',
                      fillStyle: data.datasets[0].backgroundColor[i],
                      hidden: false,
                      index: i
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const percentage = totalSentiment > 0 ? ((value / totalSentiment) * 100).toFixed(1) : 0;
                return context.label + ': ' + value + ' (' + percentage + '%)';
              }
            }
          }
        }
      },
      plugins: [{
        id: 'percentageLabels',
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          const dataset = chart.data.datasets[0];
          const meta = chart.getDatasetMeta(0);
          
          meta.data.forEach((element, index) => {
            const value = dataset.data[index];
            const percentage = totalSentiment > 0 ? ((value / totalSentiment) * 100).toFixed(1) : 0;
            
            // Solo mostrar si el porcentaje es significativo (mayor a 3%)
            if (parseFloat(percentage) > 3) {
              ctx.fillStyle = '#fff';
              ctx.font = 'bold 32px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              const position = element.tooltipPosition();
              ctx.fillText(percentage + '%', position.x, position.y);
            }
          });
        }
      }]
    };
    
    const pieChartBuffer = await chartJSNodeCanvas.renderToBuffer(pieChartConfig);
    const pieImageId = workbook.addImage({
      buffer: pieChartBuffer,
      extension: 'png'
    });
    
    // 2. GRÁFICO DE BARRAS VERTICALES - Análisis por Categorías
    const barChartConfig = {
      type: 'bar',
      data: {
        labels: sentimentData.map(d => d.label),
        datasets: [{
          label: 'Respuestas',
          data: sentimentData.map(d => d.value),
          backgroundColor: sentimentData.map(d => d.color),
          borderWidth: 1,
          borderColor: sentimentData.map(d => d.color)
        }]
      },
      options: {
        indexAxis: 'x', // Barras verticales
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Analisis por Categorias',
            font: { size: 40, weight: 'bold', family: 'Arial' }
          },
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { font: { size: 24, family: 'Arial' } }
          },
          y: {
            beginAtZero: true,
            grace: '10%',
            ticks: { font: { size: 24, family: 'Arial' } }
          }
        }
      },
      plugins: [{
        id: 'valueLabels',
        afterDatasetsDraw(chart) {
          const ctx = chart.ctx;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
              const value = dataset.data[index];
              
              ctx.fillStyle = '#000';
              ctx.font = 'bold 32px Arial';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'bottom';
              
              // Mostrar valor encima de la barra
              ctx.fillText(value, bar.x, bar.y - 10);
            });
          });
        }
      }]
    };
    
    const barChartBuffer = await chartJSNodeCanvas.renderToBuffer(barChartConfig);
    
    // Combinar ambos charts en una sola imagen
    const { createCanvas, loadImage } = require('canvas');
    
    const donutWidth = 450;
    const barWidth = 450;
    const chartHeight = 346; // Reducido 9% (de 380 a 346)
    const gap = 30; // Espacio entre charts
    const totalWidth = donutWidth + gap + barWidth;
    
    // Crear canvas para la imagen combinada
    const combinedCanvas = createCanvas(totalWidth, chartHeight);
    const ctx = combinedCanvas.getContext('2d');
    
    // Cargar y pegar donut chart
    const donutImage = await loadImage(pieChartBuffer);
    ctx.drawImage(donutImage, 0, 0, donutWidth, chartHeight);
    
    // Cargar y pegar bar chart
    const barImage = await loadImage(barChartBuffer);
    ctx.drawImage(barImage, donutWidth + gap, 0, barWidth, chartHeight);
    
    // Convertir a buffer
    const combinedBuffer = combinedCanvas.toBuffer('image/png');
    
    // Agregar imagen combinada al workbook
    const combinedImageId = workbook.addImage({
      buffer: combinedBuffer,
      extension: 'png'
    });
    
    // Insertar imagen combinada en columna B
    sheet.addImage(combinedImageId, {
      tl: { col: 1, row: chartStartRow },
      ext: { width: totalWidth, height: chartHeight }
    });
    
    currentRow += 21; // Espacio para los gráficos (aumentado para evitar solapamiento)
    
  } catch (error) {
    console.error('⚠️ Error generando gráficos:', error.message);
    console.error(error.stack);
  }
  
  currentRow += 3; // Espacio adicional antes del detalle (1 renglón más)
  
  // ===== DETALLE DE PREGUNTAS NUMÉRICAS =====
  sheet.mergeCells(`B${currentRow}:D${currentRow}`);
  const numericDetailHeaderCell = sheet.getCell(`B${currentRow}`);
  numericDetailHeaderCell.value = 'DETALLE POR PREGUNTA';
  numericDetailHeaderCell.font = { size: 12, bold: true, color: { argb: 'FF2C5282' } };
  numericDetailHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  numericDetailHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(currentRow).height = 20;
  currentRow++;
  
  currentRow++; // Fila en blanco después del header
  
  // Crear boxes para cada pregunta numérica (3 por fila)
  const questionsPerRow = 3;
  let questionIndex = 0;
  const numericFieldsArray = Object.keys(numericStats);
  
  while (questionIndex < numericFieldsArray.length) {
    const questionRow = currentRow;
    currentRow++;
    
    // Procesar hasta 3 preguntas por fila
    for (let col = 0; col < questionsPerRow && questionIndex < numericFieldsArray.length; col++) {
      const field = numericFieldsArray[questionIndex];
      const stat = numericStats[field];
      const avg = parseFloat(stat.avg);
      
      // Usar función compartida para determinar color
      const colorClass = getScoreColorClass(avg, stat.escalaConfig);
      
      // Determinar columna (B, C, D)
      const colLetter = String.fromCharCode(66 + col); // B=66, C=67, D=68
      
      // Mapear clase de color a colores Excel
      let headerColor, headerTextColor, valueColor, valueTextColor;
      if (colorClass === 'green') {
        headerColor = 'FF38A169';
        headerTextColor = 'FFFFFFFF';
        valueColor = 'FFC6F6D5';
        valueTextColor = 'FF22543D';
      } else if (colorClass === 'yellow') {
        headerColor = 'FFDD6B20';
        headerTextColor = 'FFFFFFFF';
        valueColor = 'FFFEEBC8';
        valueTextColor = 'FF7C2D12';
      } else {
        headerColor = 'FFE53E3E';
        headerTextColor = 'FFFFFFFF';
        valueColor = 'FFFED7D7';
        valueTextColor = 'FF742A2A';
      }
      
      // Header (nombre de la pregunta)
      sheet.getCell(`${colLetter}${questionRow}`).value = field;
      sheet.getCell(`${colLetter}${questionRow}`).font = { bold: true, size: 11, color: { argb: headerTextColor } };
      sheet.getCell(`${colLetter}${questionRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } };
      sheet.getCell(`${colLetter}${questionRow}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      sheet.getCell(`${colLetter}${questionRow}`).border = { top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      
      // Valor (promedio)
      sheet.getCell(`${colLetter}${questionRow + 1}`).value = avg;
      sheet.getCell(`${colLetter}${questionRow + 1}`).font = { bold: true, size: 18, color: { argb: valueTextColor } };
      sheet.getCell(`${colLetter}${questionRow + 1}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: valueColor } };
      sheet.getCell(`${colLetter}${questionRow + 1}`).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getCell(`${colLetter}${questionRow + 1}`).numFmt = '0.00';
      sheet.getCell(`${colLetter}${questionRow + 1}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      
      // Label (info sobre respuestas)
      sheet.getCell(`${colLetter}${questionRow + 2}`).value = `Promedio sobre ${stat.count} respuestas`;
      sheet.getCell(`${colLetter}${questionRow + 2}`).font = { size: 9, color: { argb: valueTextColor } };
      sheet.getCell(`${colLetter}${questionRow + 2}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: valueColor } };
      sheet.getCell(`${colLetter}${questionRow + 2}`).alignment = { vertical: 'middle', horizontal: 'center' };
      sheet.getCell(`${colLetter}${questionRow + 2}`).border = { bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      
      questionIndex++;
    }
    
    // Altura de las filas (aumentada para que se vea todo el texto con wrapText)
    sheet.getRow(questionRow).height = 70;  // Aumentado de 50 a 70 para textos largos
    sheet.getRow(questionRow + 1).height = 35;
    sheet.getRow(questionRow + 2).height = 20;  // Nueva fila para label
    
    currentRow += 3; // Saltar a la siguiente fila de boxes (ahora son 3 filas por box)
  }
  
  console.log('✅ Hoja "Portada" creada con gráficos');
}

// Función para crear la hoja de explicación de cálculos (para usuarios no técnicos)
async function createMethodologySheet(workbook) {
  const sheet = workbook.addWorksheet('Cómo se Calculan los Resultados', { views: [{ showGridLines: false }] });
  
  // Configurar anchos de columnas
  sheet.columns = [
    { width: 3 },
    { width: 80 },
    { width: 3 }
  ];
  
  let currentRow = 2;
  
  // ===== TÍTULO PRINCIPAL =====
  sheet.mergeCells(`B${currentRow}:B${currentRow}`);
  const titleCell = sheet.getCell(`B${currentRow}`);
  titleCell.value = '📊 EXPLICACIÓN DE CÁLCULOS - Guía para Interpretar los Resultados';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF2C5282' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  currentRow += 2;
  
  // ===== INTRODUCCIÓN =====
  const introCell = sheet.getCell(`B${currentRow}`);
  introCell.value = 'Este reporte analiza dos tipos de datos de la encuesta: respuestas cuantitativas (numéricas) y respuestas cualitativas (texto libre con análisis de sentimientos).';
  introCell.font = { size: 11 };
  introCell.alignment = { wrapText: true };
  sheet.getRow(currentRow).height = 30;
  currentRow += 2;
  
  // ===== SECCIÓN 1: CAMPOS CUANTITATIVOS =====
  sheet.mergeCells(`B${currentRow}:B${currentRow}`);
  const quantHeaderCell = sheet.getCell(`B${currentRow}`);
  quantHeaderCell.value = '1️⃣ CAMPOS CUANTITATIVOS (Preguntas con Escala Numérica)';
  quantHeaderCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  quantHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
  quantHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 25;
  currentRow++;
  
  // Explicación escala
  const scaleCell = sheet.getCell(`B${currentRow}`);
  scaleCell.value = '📏 Escala utilizada: 1 a 10, siendo 10 el mejor valor posible';
  scaleCell.font = { size: 11, bold: true };
  scaleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  scaleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // Cálculo promedio cuantitativo
  const quantCalcCell = sheet.getCell(`B${currentRow}`);
  quantCalcCell.value = 'Cálculo del Promedio:\n' +
    '• Se suman todos los valores numéricos de cada pregunta\n' +
    '• Se divide por la cantidad total de respuestas\n' +
    '• Resultado: promedio en escala de 1 a 10';
  quantCalcCell.font = { size: 11 };
  quantCalcCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 50;
  currentRow++;
  
  // Ejemplo cuantitativo
  const quantExampleCell = sheet.getCell(`B${currentRow}`);
  quantExampleCell.value = '💡 Ejemplo:\n' +
    'Pregunta: "¿Cómo evalúa el desempeño general del/la docente durante la cursada?"\n' +
    'Respuestas: 10, 9, 8, 10, 7\n' +
    'Cálculo: (10 + 9 + 8 + 10 + 7) ÷ 5 = 44 ÷ 5 = 8.8\n' +
    'Resultado: El promedio es 8.8 sobre 10';
  quantExampleCell.font = { size: 10, italic: true };
  quantExampleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFCDD' } };
  quantExampleCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 70;
  currentRow += 2;
  
  // ===== SECCIÓN 2: CAMPOS CUALITATIVOS =====
  sheet.mergeCells(`B${currentRow}:B${currentRow}`);
  const qualHeaderCell = sheet.getCell(`B${currentRow}`);
  qualHeaderCell.value = '2️⃣ CAMPOS CUALITATIVOS (Análisis de Comentarios de Texto Libre)';
  qualHeaderCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  qualHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
  qualHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 25;
  currentRow++;
  
  // Explicación del sistema
  const qualSystemCell = sheet.getCell(`B${currentRow}`);
  qualSystemCell.value = '🔍 Sistema de Análisis de Sentimientos:\n' +
    'El sistema analiza comentarios de texto libre (como "¿Qué te gustó de la materia?") usando un diccionario ' +
    'de palabras y frases con valores asignados que representan sentimientos positivos o negativos.';
  qualSystemCell.font = { size: 11 };
  qualSystemCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  qualSystemCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  sheet.getRow(currentRow).height = 48;
  currentRow++;
  
  // Cómo funciona el diccionario
  const dictCell = sheet.getCell(`B${currentRow}`);
  dictCell.value = '📖 Diccionario de Sentimientos:\n' +
    'El diccionario contiene palabras y frases con valores asignados:\n' +
    '• Palabras positivas: "excelente" (+5), "bueno" (+3), "genial" (+4)\n' +
    '• Frases positivas: "muy bueno" (+4), "muy bien explicado" (+5)\n' +
    '• Palabras negativas: "malo" (-3), "terrible" (-5), "confuso" (-2)\n' +
    '• Valores pueden ser cualquier número positivo o negativo';
  dictCell.font = { size: 11 };
  dictCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 90;
  currentRow++;
  
  // Importante: Sin Suma Doble
  const noDuplicateCell = sheet.getCell(`B${currentRow}`);
  noDuplicateCell.value = '⚠️ IMPORTANTE: SIN SUMA DOBLE\n\n' +
    'El sistema evita contar la misma palabra dos veces:\n\n' +
    '1. PRIORIDAD A FRASES COMPLETAS:\n' +
    '   Se buscan primero las frases del diccionario (ej: "muy bueno")\n\n' +
    '2. PALABRAS YA USADAS NO SE CUENTAN:\n' +
    '   Si "muy bueno" (+4) está como frase → cuenta +4\n' +
    '   Si "muy" (+1) y "bueno" (+3) están como palabras individuales → NO se cuentan\n' +
    '   (porque ya fueron contadas en la frase "muy bueno")\n\n' +
    '3. SIN DUPLICACIÓN:\n' +
    '   Cada palabra/frase se cuenta UNA SOLA VEZ\n\n' +
    'EJEMPLO:\n' +
    'Diccionario: "muy bueno" (+4), "bueno" (+3), "muy" (+1)\n' +
    'Texto: "El curso es muy bueno"\n\n' +
    '❌ NO suma: "muy" (+1) + "bueno" (+3) + "muy bueno" (+4) = +8\n' +
    '✅ SÍ suma: "muy bueno" (+4) solamente = +4\n\n' +
    'Las palabras que forman parte de una frase encontrada quedan "marcadas"\n' +
    'y no se analizan individualmente.';
  noDuplicateCell.font = { size: 10, bold: true };
  noDuplicateCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
  noDuplicateCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 240;
  currentRow++;
  
  // Paso a paso del cálculo
  const stepByStepCell = sheet.getCell(`B${currentRow}`);
  stepByStepCell.value = '🔢 CÁLCULO POR CADA REGISTRO (Paso a Paso):';
  stepByStepCell.font = { size: 12, bold: true, color: { argb: 'FF2C5282' } };
  stepByStepCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 22;
  currentRow++;
  
  // Paso 1
  const step1Cell = sheet.getCell(`B${currentRow}`);
  step1Cell.value = 'Paso 1 - Buscar palabras y frases del diccionario:\n' +
    'El sistema busca PRIMERO frases completas, luego palabras individuales.\n' +
    'IMPORTANTE: Si una palabra está en el diccionario, se analiza sin importar cuán corta sea.\n' +
    'Las palabras que forman parte de frases encontradas NO se cuentan individualmente.';
  step1Cell.font = { size: 10 };
  step1Cell.alignment = { wrapText: true, vertical: 'top', indent: 2 };
  sheet.getRow(currentRow).height = 65;
  currentRow++;
  
  // Paso 2
  const step2Cell = sheet.getCell(`B${currentRow}`);
  step2Cell.value = 'Paso 2 - Calcular Score RAW (sin duplicar palabras):\n' +
    'Se suman TODOS los valores encontrados (sin límites), pero cada palabra/frase se cuenta UNA SOLA VEZ.\n' +
    'Por ejemplo: "El curso es muy bueno y genial"\n' +
    '  Si "muy bueno" (+4) está como frase → cuenta +4\n' +
    '  Si "genial" (+4) está como palabra → cuenta +4\n' +
    '  Total: +8 (NO se cuentan "muy" ni "bueno" por separado)';
  step2Cell.font = { size: 10 };
  step2Cell.alignment = { wrapText: true, vertical: 'top', indent: 2 };
  sheet.getRow(currentRow).height = 90;
  currentRow++;
  
  // Paso 3
  const step3Cell = sheet.getCell(`B${currentRow}`);
  step3Cell.value = 'Paso 3 - Promediar por columnas analizadas:\n' +
    'Si una persona respondió MÚLTIPLES preguntas cualitativas, se promedian sus scores.\n' +
    'Promedio = Score Total ÷ Cantidad de columnas respondidas';
  step3Cell.font = { size: 10 };
  step3Cell.alignment = { wrapText: true, vertical: 'top', indent: 2 };
  sheet.getRow(currentRow).height = 48;
  currentRow++;
  
  // Paso 4
  const step4Cell = sheet.getCell(`B${currentRow}`);
  step4Cell.value = 'Paso 4 - Normalizar a escala 0-10:\n' +
    'El score promedio se limita a un rango de -10 a +10, y luego se convierte a escala 0-10.\n' +
    'Fórmula: Puntuación = (Score limitado a [-10,+10] + 10) ÷ 2\n' +
    '• Score RAW -10 o menor → 0.0 (mínimo)\n' +
    '• Score RAW 0 → 5.0 (neutral)\n' +
    '• Score RAW +10 o mayor → 10.0 (máximo)';
  step4Cell.font = { size: 10 };
  step4Cell.alignment = { wrapText: true, vertical: 'top', indent: 2 };
  sheet.getRow(currentRow).height = 90;
  currentRow++;
  
  // Clasificación
  const classCell = sheet.getCell(`B${currentRow}`);
  classCell.value = 'Paso 5 - Clasificar el sentimiento:\n' +
    'Según la puntuación normalizada (0-10) y la confianza:\n' +
    '• No clasificado → Confianza = 0% (ninguna palabra del texto está en el diccionario)\n' +
    '• 8.0 - 10.0 → Muy Positivo\n' +
    '• 6.0 - 7.9 → Positivo\n' +
    '• 4.0 - 5.9 → Neutral (palabra/frase en diccionario con valor cercano a 0)\n' +
    '• 2.0 - 3.9 → Negativo\n' +
    '• 0.0 - 1.9 → Muy Negativo\n\n' +
    '⚠️ Si el texto contiene palabras pero ninguna está en el diccionario, se clasifica como "No clasificado"';
  classCell.font = { size: 10 };
  classCell.alignment = { wrapText: true, vertical: 'top', indent: 2 };
  sheet.getRow(currentRow).height = 130;
  currentRow += 2;
  
  // Nueva sección: Score Normalizado en Datos Detallados
  sheet.mergeCells(`B${currentRow}:B${currentRow}`);
  const detailScoreHeaderCell = sheet.getCell(`B${currentRow}`);
  detailScoreHeaderCell.value = '📋 LA COLUMNA "SCORE NORMALIZADO (0-10)" EN LA HOJA "DATOS DETALLADOS"';
  detailScoreHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  detailScoreHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4C51BF' } };
  detailScoreHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 25;
  currentRow++;
  
  const detailScoreCell = sheet.getCell(`B${currentRow}`);
  detailScoreCell.value = '🎯 ¿Qué es?\n' +
    'La columna "Score Normalizado (0-10)" que aparece en la hoja "Datos Detallados" muestra el sentimiento analizado en escala 0-10 para CADA REGISTRO que respondió preguntas de texto libre.\n\n' +
    '⚙️ Cómo se obtiene:\n' +
    '1. Se analizan todos los comentarios del registro usando el diccionario de sentimientos\n' +
    '2. Se calcula el score RAW (suma de valores positivos y negativos encontrados)\n' +
    '3. Se promedian los scores si hay múltiples columnas de texto libre respondidas\n' +
    '4. Se normaliza el resultado a escala 0-10 usando la fórmula: (Score limitado a [-10,+10] + 10) ÷ 2\n' +
    '5. El valor final se redondea a 2 decimales\n\n' +
    '📊 Por ejemplo:\n' +
    '• Un registro con comentario muy positivo → Score Normalizado: 8.75\n' +
    '• Un registro con comentario neutral → Score Normalizado: 5.00\n' +
    '• Un registro con comentario muy negativo → Score Normalizado: 1.50\n\n' +
    '✅ Utilidad:\n' +
    'Esta columna permite filtrar, ordenar y analizar cada registro individualmente por su puntuación normalizada, ' +
    'facilitando la identificación de respuestas más positivas o negativas en detalle.';
  detailScoreCell.font = { size: 10 };
  detailScoreCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 200;
  currentRow += 2;
  
  // Ejemplo completo cualitativo
  const qualExampleHeaderCell = sheet.getCell(`B${currentRow}`);
  qualExampleHeaderCell.value = '💡 EJEMPLO COMPLETO:';
  qualExampleHeaderCell.font = { size: 12, bold: true, color: { argb: 'FF2C5282' } };
  qualExampleHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 22;
  currentRow++;
  
  const exampleDetailCell = sheet.getCell(`B${currentRow}`);
  exampleDetailCell.value = 'Comentario del estudiante: "El profesor fue excelente, muy bueno explicando"\n\n' +
    'Análisis:\n' +
    '1. Palabras encontradas en diccionario:\n' +
    '   • "excelente" = +5\n' +
    '   • "bueno" = +3\n' +
    '2. Score RAW = +5 + 3 = +8\n' +
    '3. Solo respondió 1 columna cualitativa → Promedio = 8 ÷ 1 = +8\n' +
    '4. Normalizar: (8 + 10) ÷ 2 = 18 ÷ 2 = 9.0\n' +
    '5. Puntuación final: 9.0 sobre 10\n' +
    '6. Clasificación: "Muy Positivo" (porque 9.0 ≥ 8.0)';
  exampleDetailCell.font = { size: 10, italic: true };
  exampleDetailCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFCDD' } };
  exampleDetailCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 180;
  currentRow += 2;
  
  // CÁLCULO DEL PROMEDIO GENERAL
  sheet.mergeCells(`B${currentRow}:B${currentRow}`);
  const avgHeaderCell = sheet.getCell(`B${currentRow}`);
  avgHeaderCell.value = '📊 CÁLCULO DEL PROMEDIO GENERAL DEL REPORTE';
  avgHeaderCell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  avgHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF366092' } };
  avgHeaderCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(currentRow).height = 25;
  currentRow++;
  
  const avgCalcCell = sheet.getCell(`B${currentRow}`);
  avgCalcCell.value = 'Para calcular el promedio que aparece en la portada:\n\n' +
    '1. Se toma la puntuación normalizada (0-10) de CADA registro\n' +
    '2. Se suman todas las puntuaciones\n' +
    '3. Se divide por la cantidad total de registros que respondieron preguntas cualitativas\n\n' +
    'Fórmula: Promedio General = (Suma de todas las puntuaciones) ÷ (Total de registros con respuestas cualitativas)\n\n' +
    'Ejemplo:\n' +
    'Registro 1: 9.0, Registro 2: 7.5, Registro 3: 5.0\n' +
    'Promedio = (9.0 + 7.5 + 5.0) ÷ 3 = 21.5 ÷ 3 = 7.17';
  avgCalcCell.font = { size: 10 };
  avgCalcCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 180;
  currentRow += 2;
  
  // Nota final
  const noteCell = sheet.getCell(`B${currentRow}`);
  noteCell.value = '⚠️ NOTA IMPORTANTE:\n' +
    '• Solo se analizan comentarios con al menos 3 caracteres, a menos que contengan palabras del diccionario\n' +
    '• Si un comentario tiene palabras del diccionario (ej: "excelente", "malo"), se analiza sin importar su longitud\n' +
    '• Comentarios vacíos, puntos solos (.) o frases ignoradas (como "sin comentarios") no se incluyen en el análisis\n' +
    '• Los valores RAW pueden ser mayores a 10 o menores a -10 cuando hay múltiples palabras, pero se normalizan a escala 0-10 para el resultado final\n\n' +
    '📊 CONFIANZA DEL ANÁLISIS:\n' +
    'Confianza = (palabras reconocidas en el diccionario) ÷ (total palabras del texto)\n' +
    '• 100% = Todas las palabras están en el diccionario → clasificación muy confiable\n' +
    '• 50-99% = Texto parcialmente reconocido → clasificación moderadamente confiable\n' +
    '• 1-49% = Pocas palabras reconocidas → clasificación poco confiable\n' +
    '• 0% = Ninguna palabra reconocida → "No clasificado"';
  noteCell.font = { size: 10, italic: true };
  noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } };
  noteCell.alignment = { wrapText: true, vertical: 'top', indent: 1 };
  sheet.getRow(currentRow).height = 180;
  
  console.log('✅ Hoja "Cómo se Calculan los Resultados" creada');
}

// Función dinámica para crear hojas de resumen
async function createDynamicSummarySheet(sheet, data, groupField, textColumns, customConfig = null) {
  console.log(`📊 Creando resumen por ${groupField}, textColumns:`, textColumns);
  
  // Encontrar la columna real que coincide con el campo de agrupación
  const firstRow = data[0] || {};
  const allColumns = Object.keys(firstRow).filter(key => 
    key !== 'sentimentAnalysis' && 
    key !== 'sentiment'
  );
  const actualField = allColumns.find(col => 
    col.toLowerCase() === groupField.toLowerCase() || 
    col.toLowerCase().includes(groupField.toLowerCase())
  );
  
  console.log(`🔍 Campo de agrupación "${groupField}" mapeado a columna: "${actualField}"`);
  
  if (!actualField && groupField !== 'carrera') {
    console.warn(`⚠️ Campo "${groupField}" no encontrado en los datos`);
    return;
  }
  
  // Identificar columnas numéricas desde configuración (igual que frontend)
  let numericColumns = [];
  const config = customConfig || COLUMN_CONFIG;
  
  if (config && config.numericas && config.numericas.length > 0) {
    numericColumns = config.numericas;
    console.log(`📊 Usando ${numericColumns.length} columnas numéricas desde configuración`);
  } else if (customConfig && customConfig.columnas) {
    // Fallback: buscar en formato antiguo
    const numericConfig = customConfig.columnas.find(c => c.tipo === 'numerica');
    if (numericConfig && numericConfig.valores) {
      numericColumns = numericConfig.valores;
    }
  }
  
  // Auto-detectar columnas numéricas solo si no hay configuración
  if (numericColumns.length === 0) {
    numericColumns = allColumns.filter(col => {
      const value = firstRow[col];
      return !isNaN(value) && value !== '' && value !== null && 
             col !== 'ID' && 
             !col.toLowerCase().includes('comision') &&
             col !== actualField; // Excluir el campo de agrupación
    });
    console.log(`📊 Auto-detectadas ${numericColumns.length} columnas numéricas (sin configuración)`);
  }
  
  console.log(`📊 Columnas numéricas detectadas (${numericColumns.length}):`, numericColumns.slice(0, 3));
  
  // Configurar columnas del resumen
  let summaryColumns = [
    { header: groupField.charAt(0).toUpperCase() + groupField.slice(1), key: 'group', width: 35 }
  ];
  // Si es resumen por docente, agregar columna de materias
  if (groupField.toLowerCase() === 'docente') {
    summaryColumns.push({ header: 'Materia(s)', key: 'materias', width: 40 });
  }
  summaryColumns = summaryColumns.concat([
    { header: 'Total Registros', key: 'total', width: 16 },
    { header: 'Total con Análisis', key: 'totalAnalysis', width: 18 }
  ]);
  
  // Agregar columnas para promedios de campos numéricos
  numericColumns.forEach(col => {
    summaryColumns.push({
      header: `${col} - Promedio`,
      key: `${col}_avg`,
      width: Math.min(col.length + 15, 50)
    });
  });
  
  // Agregar columnas para cada campo de texto analizado
  textColumns.forEach(col => {
    summaryColumns.push(
      { header: `${col} - Positivos`, key: `${col}_pos`, width: 14 },
      { header: `${col} - Negativos`, key: `${col}_neg`, width: 14 },
      { header: `${col} - Neutrales`, key: `${col}_neu`, width: 14 },
      { header: `${col} - Score Prom`, key: `${col}_avg`, width: 16 },
      { header: `${col} - % Positivo`, key: `${col}_pct_pos`, width: 14 }
    );
  });
  
  sheet.columns = summaryColumns;
  
  // Estilo del encabezado
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });
  
  // Agrupar datos
  const groups = {};
  
  data.forEach((item, index) => {
    const groupValue = actualField ? (item[actualField] || 'Sin Clasificar') : 'Sin Clasificar';
    
    if (!groups[groupValue]) {
      groups[groupValue] = {
        total: 0,
        totalAnalysis: 0,
        numericStats: {},
        textStats: {}
      };
      
      // Inicializar stats por cada columna numérica
      numericColumns.forEach(col => {
        groups[groupValue].numericStats[col] = {
          values: [],
          sum: 0,
          count: 0
        };
      });
      
      // Inicializar stats por cada columna de texto
      textColumns.forEach(col => {
        groups[groupValue].textStats[col] = {
          positivos: 0,
          negativos: 0,
          neutrales: 0,
          scores: []
        };
      });
    }
    
    groups[groupValue].total++;
    
    // Procesar valores numéricos
    numericColumns.forEach(col => {
      const value = parseFloat(item[col]);
      if (!isNaN(value)) {
        groups[groupValue].numericStats[col].values.push(value);
        groups[groupValue].numericStats[col].sum += value;
        groups[groupValue].numericStats[col].count++;
      }
    });
    
    // Procesar análisis de sentimientos
    if (item.sentimentAnalysis) {
      groups[groupValue].totalAnalysis++;
      
      textColumns.forEach(col => {
        const analysis = item.sentimentAnalysis[col];
        if (analysis) {
          const sentiment = analysis.consensus || analysis.classification || '';
          const score = analysis.score || (analysis.natural && analysis.natural.score) || 0;
          
          const stats = groups[groupValue].textStats[col];
          
          if (typeof sentiment === 'string') {
            if (sentiment.toLowerCase().includes('positiv')) {
              stats.positivos++;
            } else if (sentiment.toLowerCase().includes('negativ')) {
              stats.negativos++;
            } else if (sentiment.toLowerCase().includes('neutral')) {
              stats.neutrales++;
            }
          }
          
          if (typeof score === 'number' && score > 0) {
            stats.scores.push(score);
          }
        } else {
          // DEBUG: Si no encuentra análisis para esta columna
          if (index < 3) { // Solo primeras 3 filas para no saturar
            console.log(`⚠️ No se encontró análisis para columna "${col}" en registro ${index}. Claves disponibles:`, Object.keys(item.sentimentAnalysis));
          }
        }
      });
    }
  });
  
  console.log(`📊 Grupos procesados para ${groupField}:`, Object.keys(groups).length);
  
  // Escribir datos
  let rowIndex = 2;
  Object.keys(groups).sort().forEach(groupValue => {
    const stats = groups[groupValue];
    const row = sheet.getRow(rowIndex);
    row.getCell('group').value = groupValue;
    // Si es resumen por docente, enumerar materias
    if (groupField.toLowerCase() === 'docente') {
      // Buscar todas las materias asociadas a ese docente
      const materiasSet = new Set();
      data.forEach(item => {
        const docente = extractField(item, ['docente', 'profesor']) || 'Sin Docente';
        if (docente === groupValue) {
          const materia = extractField(item, ['materia', 'materias', 'asignatura']);
          if (materia) materiasSet.add(materia);
        }
      });
      row.getCell('materias').value = Array.from(materiasSet).join(', ');
    }
    row.getCell('total').value = stats.total;
    row.getCell('totalAnalysis').value = stats.totalAnalysis;
    numericColumns.forEach(col => {
      const numStat = stats.numericStats[col];
      const avg = numStat.count > 0 ? (numStat.sum / numStat.count).toFixed(2) : 0;
      row.getCell(`${col}_avg`).value = parseFloat(avg);
    });
    textColumns.forEach(col => {
      const textStat = stats.textStats[col];
      const totalAnalyzed = textStat.positivos + textStat.negativos + textStat.neutrales;
      const avgScore = textStat.scores.length > 0 
        ? (textStat.scores.reduce((a, b) => a + b, 0) / textStat.scores.length).toFixed(2)
        : 0;
      const pctPositive = totalAnalyzed > 0 
        ? ((textStat.positivos / totalAnalyzed) * 100).toFixed(1) + '%'
        : '0%';
      row.getCell(`${col}_pos`).value = textStat.positivos;
      row.getCell(`${col}_neg`).value = textStat.negativos;
      row.getCell(`${col}_neu`).value = textStat.neutrales;
      row.getCell(`${col}_avg`).value = parseFloat(avgScore);
      row.getCell(`${col}_pct_pos`).value = pctPositive;
      const scoreCell = row.getCell(`${col}_avg`);
      const scoreValue = parseFloat(avgScore);
      if (scoreValue >= 6) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
        scoreCell.font = { color: { argb: 'FF2E7D2E' }, bold: true };
      } else if (scoreValue < 4) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };
        scoreCell.font = { color: { argb: 'FFC53030' }, bold: true };
      } else {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3E2' } };
        scoreCell.font = { color: { argb: 'FF8B5A00' }, bold: true };
      }
    });
    rowIndex++;
  });
  
  // Agregar fila de totales
  const totalRow = sheet.getRow(rowIndex + 1);
  totalRow.getCell('group').value = 'TOTAL GENERAL';
  totalRow.getCell('group').font = { bold: true };
  
  const grandTotal = Object.values(groups).reduce((sum, g) => sum + g.total, 0);
  const grandTotalAnalysis = Object.values(groups).reduce((sum, g) => sum + g.totalAnalysis, 0);
  
  totalRow.getCell('total').value = grandTotal;
  totalRow.getCell('totalAnalysis').value = grandTotalAnalysis;
  
  // Totales de columnas numéricas
  numericColumns.forEach(col => {
    const allValues = Object.values(groups).flatMap(g => g.numericStats[col].values);
    const globalAvg = allValues.length > 0 
      ? (allValues.reduce((a, b) => a + b, 0) / allValues.length).toFixed(2)
      : 0;
    totalRow.getCell(`${col}_avg`).value = parseFloat(globalAvg);
  });
  
  // Totales de columnas de texto
  textColumns.forEach(col => {
    const totalPos = Object.values(groups).reduce((sum, g) => sum + g.textStats[col].positivos, 0);
    const totalNeg = Object.values(groups).reduce((sum, g) => sum + g.textStats[col].negativos, 0);
    const totalNeu = Object.values(groups).reduce((sum, g) => sum + g.textStats[col].neutrales, 0);
    const allScores = Object.values(groups).flatMap(g => g.textStats[col].scores);
    const globalAvg = allScores.length > 0 
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
      : 0;
    const totalAnalyzed = totalPos + totalNeg + totalNeu;
    const globalPctPos = totalAnalyzed > 0 
      ? ((totalPos / totalAnalyzed) * 100).toFixed(1) + '%'
      : '0%';
    
    totalRow.getCell(`${col}_pos`).value = totalPos;
    totalRow.getCell(`${col}_neg`).value = totalNeg;
    totalRow.getCell(`${col}_neu`).value = totalNeu;
    totalRow.getCell(`${col}_avg`).value = parseFloat(globalAvg);
    totalRow.getCell(`${col}_pct_pos`).value = globalPctPos;
  });
  
  totalRow.eachCell(cell => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };
  });
  
  // Aplicar filtros automáticos
  sheet.autoFilter = {
    from: 'A1',
    to: sheet.lastColumn.letter + '1'
  };
}

// Función auxiliar para extraer campos dinámicamente
function extractField(obj, fieldNames) {
  for (const fieldName of fieldNames) {
    if (obj[fieldName]) return obj[fieldName];
    
    // Buscar en todas las propiedades del objeto (case insensitive)
    for (const key in obj) {
      if (key.toLowerCase().includes(fieldName.toLowerCase())) {
        return obj[key];
      }
    }
  }
  return null;
}

// Función para aplicar colores según sentiment
function applySentimentColors(row, columnKey) {
  const cell = row.getCell(columnKey);
  const value = cell.value;
  
  if (typeof value === 'string') {
    if (value.toLowerCase().includes('positiv')) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
      cell.font = { color: { argb: 'FF2E7D2E' } };
    } else if (value.toLowerCase().includes('negativ')) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };
      cell.font = { color: { argb: 'FFC53030' } };
    } else if (value.toLowerCase().includes('neutral')) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3E2' } };
      cell.font = { color: { argb: 'FF8B5A00' } };
    }
  }
}

// Crear hoja de resumen por carrera
async function createSummarySheet(sheet, data) {
  sheet.columns = [
    { header: 'Carrera', key: 'carrera', width: 30 },
    { header: 'Total Evaluaciones', key: 'total', width: 18 },
    { header: 'Sentiment Promedio Materia', key: 'avg_materia', width: 22 },
    { header: 'Sentiment Promedio Docente', key: 'avg_docente', width: 22 },
    { header: 'Positivos Materia', key: 'pos_materia', width: 16 },
    { header: 'Negativos Materia', key: 'neg_materia', width: 16 },
    { header: 'Positivos Docente', key: 'pos_docente', width: 16 },
    { header: 'Negativos Docente', key: 'neg_docente', width: 16 }
  ];

  // Procesar datos por carrera
  const carreraStats = {};
  data.forEach(item => {
    const carrera = extractField(item, ['carrera', 'programa']) || 'Sin Carrera';
    if (!carreraStats[carrera]) {
      carreraStats[carrera] = {
        total: 0,
        materiaScores: [],
        docenteScores: [],
        posMateria: 0,
        negMateria: 0,
        posDocente: 0,
        negDocente: 0
      };
    }
    
    carreraStats[carrera].total++;
    
    if (item.sentimentAnalysis) {
      if (item.sentimentAnalysis.materia?.consensus) {
        const consensus = item.sentimentAnalysis.materia.consensus.toLowerCase();
        if (consensus.includes('positiv')) carreraStats[carrera].posMateria++;
        if (consensus.includes('negativ')) carreraStats[carrera].negMateria++;
      }
      
      if (item.sentimentAnalysis.docente?.consensus) {
        const consensus = item.sentimentAnalysis.docente.consensus.toLowerCase();
        if (consensus.includes('positiv')) carreraStats[carrera].posDocente++;
        if (consensus.includes('negativ')) carreraStats[carrera].negDocente++;
      }
    }
  });

  // Agregar datos a la hoja
  let rowIndex = 2;
  Object.entries(carreraStats).forEach(([carrera, stats]) => {
    const row = sheet.getRow(rowIndex++);
    row.getCell('carrera').value = carrera;
    row.getCell('total').value = stats.total;
    row.getCell('pos_materia').value = stats.posMateria;
    row.getCell('neg_materia').value = stats.negMateria;
    row.getCell('pos_docente').value = stats.posDocente;
    row.getCell('neg_docente').value = stats.negDocente;
  });

  // Estilo del encabezado
  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D2E' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });
}

// Crear hoja de resumen por docente
async function createDocenteSummarySheet(sheet, data) {
  sheet.columns = [
    { header: 'Docente', key: 'docente', width: 30 },
    { header: 'Materias', key: 'materias', width: 40 },
    { header: 'Carrera', key: 'carrera', width: 25 },
    { header: 'Total Evaluaciones', key: 'total', width: 18 },
    { header: 'Sentiment Promedio', key: 'avg_sentiment', width: 18 },
    { header: 'Evaluaciones Positivas', key: 'positivas', width: 20 },
    { header: 'Evaluaciones Negativas', key: 'negativas', width: 20 }
  ];

  const docenteStats = {};
  data.forEach(item => {
    const docente = extractField(item, ['docente', 'profesor']) || 'Sin Docente';
    const carrera = extractField(item, ['carrera', 'programa']) || 'Sin Carrera';
    const materia = extractField(item, ['materia', 'materias', 'asignatura']) || '';
    const key = `${docente}|${carrera}`;
    
    if (!docenteStats[key]) {
      docenteStats[key] = {
        docente,
        carrera,
        materias: new Set(),
        total: 0,
        positivas: 0,
        negativas: 0
      };
    }
    if (materia) {
      docenteStats[key].materias.add(materia);
    }
    docenteStats[key].total++;
    
    if (item.sentimentAnalysis?.docente?.consensus) {
      const consensus = item.sentimentAnalysis.docente.consensus.toLowerCase();
      if (consensus.includes('positiv')) docenteStats[key].positivas++;
      if (consensus.includes('negativ')) docenteStats[key].negativas++;
    }
  });

  let rowIndex = 2;
  Object.values(docenteStats).forEach(stats => {
    const row = sheet.getRow(rowIndex++);
    row.getCell('docente').value = stats.docente;
    row.getCell('materias').value = Array.from(stats.materias).join(', ');
    row.getCell('carrera').value = stats.carrera;
    row.getCell('total').value = stats.total;
    row.getCell('positivas').value = stats.positivas;
    row.getCell('negativas').value = stats.negativas;
  });

  const headerRow = sheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5A00' } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  });
}

// Crear hoja de gráficos (placeholders para datos que pueden ser usados en Excel)
async function createChartsSheet(sheet, data) {
  sheet.getCell('A1').value = 'Datos para Gráficos';
  sheet.getCell('A1').font = { bold: true, size: 16 };
  
  sheet.getCell('A3').value = 'Nota: Utilice los datos de las otras hojas para crear gráficos dinámicos en Excel';
  sheet.getCell('A4').value = '1. Seleccione los datos de "Resumen por Carrera" o "Resumen por Docente"';
  sheet.getCell('A5').value = '2. Vaya a Insertar > Gráficos';
  sheet.getCell('A6').value = '3. Seleccione el tipo de gráfico deseado (barras, circular, etc.)';
  
  // Ejemplo de tabla resumida para gráficos
  sheet.getCell('A8').value = 'Distribución General de Sentimientos';
  sheet.getCell('A9').value = 'Tipo';
  sheet.getCell('B9').value = 'Cantidad';
  
  let positivos = 0, negativos = 0, neutrales = 0;
  data.forEach(item => {
    if (item.sentimentAnalysis) {
      ['materia', 'docente'].forEach(tipo => {
        const consensus = item.sentimentAnalysis[tipo]?.consensus?.toLowerCase() || '';
        if (consensus.includes('positiv')) positivos++;
        else if (consensus.includes('negativ')) negativos++;
        else neutrales++;
      });
    }
  });
  
  sheet.getCell('A10').value = 'Positivos';
  sheet.getCell('B10').value = positivos;
  sheet.getCell('A11').value = 'Negativos';
  sheet.getCell('B11').value = negativos;
  sheet.getCell('A12').value = 'Neutrales';
  sheet.getCell('B12').value = neutrales;
}

// Endpoint para generar reporte avanzado
app.post('/api/generate-advanced-report', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    console.log('📊 Generando reporte avanzado...');

    // Parsear configuración personalizada si existe
    let customConfig = null;
    if (req.body.columnConfig) {
      try {
        customConfig = JSON.parse(req.body.columnConfig);
        console.log(`⚙️ Usando configuración personalizada: ${customConfig.name}`);
      } catch (e) {
        console.error('❌ Error parseando columnConfig:', e);
      }
    }
    
    // RECIBIR ESTADÍSTICAS PRECALCULADAS DEL FRONTEND
    let statisticsFromApp = null;
    if (req.body.statistics) {
      try {
        statisticsFromApp = JSON.parse(req.body.statistics);
        console.log('📊 ✅ Estadísticas recibidas del frontend (valores de la app):', {
          total: statisticsFromApp.totalResults,
          avgScore: statisticsFromApp.averageScore,
          percentages: statisticsFromApp.percentages
        });
      } catch (e) {
        console.error('❌ Error parseando statistics:', e);
      }
    }
    
    // RECIBIR ÍNDICES FILTRADOS SI EXISTEN
    let filteredIndices = null;
    if (req.body.filteredIndices) {
      try {
        filteredIndices = JSON.parse(req.body.filteredIndices);
        console.log(`🔍 Filtros aplicados: exportando ${filteredIndices.length} filas específicas`);
      } catch (e) {
        console.error('❌ Error parseando filteredIndices:', e);
      }
    }

    let processedResults = [];
    let originalFilename = req.file.originalname || 'reporte.xlsx';
    
    // Procesar archivo Excel
    const workbook = XLSX.readFile(req.file.path, { 
      raw: false,
      FS: ';'
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });
    
    console.log(`📊 Archivo procesado: ${jsonData.length} filas`);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // APLICAR FILTRO SI EXISTE
    if (filteredIndices && filteredIndices.length > 0) {
      const originalLength = jsonData.length;
      jsonData = jsonData.filter((row, index) => filteredIndices.includes(index));
      console.log(`✂️ Filtrado aplicado: ${jsonData.length} de ${originalLength} filas`);
    }

    const MAX_ROWS = 25000;
    if (jsonData.length > MAX_ROWS) {
      console.log(`⚠️ Archivo muy grande (${jsonData.length} filas). Procesando solo las primeras ${MAX_ROWS}.`);
      jsonData.splice(MAX_ROWS);
    }

    console.log(`🔄 Procesando ${jsonData.length} registros...`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (i % 500 === 0 && i > 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }

      const result = { ...row };
      const sentimentColumns = getSentimentColumns(row, customConfig);

      if (sentimentColumns.length > 0) {
        result.sentimentAnalysis = {};
        
        let overallScore = 0;
        let sentimentResults = [];
        
        for (const colInfo of sentimentColumns) {
          const columnName = colInfo.column;
          const text = colInfo.text;
          
          if (text && text.trim().length > 0) {
            const analysis = analyzeTextEnhanced(text);
            
            // Saltar entradas ignoradas (sin comentario, ".", etc.)
            if (analysis.ignored) {
              continue; // No incluir en el análisis
            }
            
            result.sentimentAnalysis[columnName] = {
              classification: analysis.classification,
              score: analysis.normalizedScore,
              scoreRaw: analysis.score,
              consensus: analysis.classification
            };
            
            // Acumular para cálculo de score normalizado
            overallScore += analysis.score;
            sentimentResults.push(analysis);
          }
        }
        
        // Calcular score normalizado (0-10) para este registro
        const avgRelativeScore = sentimentResults.length > 0 ? overallScore / sentimentResults.length : 0;
        const clampedScore = Math.max(-10, Math.min(10, avgRelativeScore));
        let perColumnAvgScore = ((clampedScore + 10) / 2);
        
        if (perColumnAvgScore < 0) {
          perColumnAvgScore = 0;
        }
        
        // Calcular confianza promedio
        const averageConfidence = sentimentResults.length > 0 
          ? sentimentResults.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / sentimentResults.length 
          : 0.5;
        
        // Agregar la propiedad sentiment con el score normalizado
        result.sentiment = {
          overallScore: overallScore,
          perColumnAvgScore: parseFloat(perColumnAvgScore.toFixed(2)),
          classification: getClassification(perColumnAvgScore, averageConfidence),
          confidence: Math.round(averageConfidence * 100) / 100,
          details: sentimentResults,
          analyzedColumns: sentimentResults.length
        };
      }

      processedResults.push(result);
    }
    
    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    
    console.log('📝 Generando archivo Excel avanzado...');
    
    // USAR ESTADÍSTICAS QUE VIENEN DEL FRONTEND (ya calculadas correctamente)
    let statistics;
    
    if (statisticsFromApp) {
      // Usar las estadísticas que envió el frontend (filtradas o completas)
      console.log('✅ Usando estadísticas del frontend');
      statistics = statisticsFromApp;
      
      console.log('📊 Estadísticas para portada:', {
        total: statistics.totalResults,
        avgScore: statistics.averageScore,
        positivos: (parseFloat(statistics.percentages['Muy Positivo'] || 0) + parseFloat(statistics.percentages['Positivo'] || 0)).toFixed(1) + '%',
        neutrales: statistics.percentages['Neutral'] + '%',
        negativos: (parseFloat(statistics.percentages['Negativo'] || 0) + parseFloat(statistics.percentages['Muy Negativo'] || 0)).toFixed(1) + '%'
      });
    } else {
      // Fallback: calcular estadísticas en el backend
      console.log('⚠️ Calculando estadísticas en el backend (fallback)');
      
      const resultsForStats = processedResults.map((item, index) => {
        if (item.sentiment && item.sentiment.perColumnAvgScore !== undefined) {
          // Usar perColumnAvgScore que ya está normalizado 0-10
          const avgScore = item.sentiment.perColumnAvgScore;
          const classification = item.sentiment.classification || getClassification(avgScore);
          
          return {
            row: index + 1,
            sentiment: {
              perColumnAvgScore: avgScore,
              classification: classification,
              details: [{ score: avgScore }]
            }
          };
        }
        return null;
      }).filter(r => r !== null);
      
      const qualitativeCount = countQualitativeResponses(jsonData, customConfig);
      statistics = calculateStats(resultsForStats, qualitativeCount);
      // Agregar el total absoluto de encuestas procesadas
      statistics.totalSurveys = processedResults.length;
    }
    
    console.log('📊 Estadísticas finales para portada:', {
      totalSurveys: statistics.totalSurveys || processedResults.length,
      totalClassified: statistics.totalResults,
      avgScore: statistics.averageScore,
      positivos: statistics.percentages['Muy Positivo'] + statistics.percentages['Positivo'],
      neutrales: statistics.percentages['Neutral'],
      negativos: statistics.percentages['Negativo'] + statistics.percentages['Muy Negativo']
    });
    
    // FILTRAR COLUMNAS según configuración antes de generar Excel
    // Solo incluir: identificación + numéricas + texto libre
    let filteredResults = processedResults;
    
    console.log('\n🔍 DEBUG FILTRADO DE COLUMNAS:');
    console.log('  customConfig:', customConfig ? 'SÍ existe' : 'NO existe');
    if (customConfig) {
      console.log('  - name:', customConfig.name);
      console.log('  - identificacion:', customConfig.identificacion?.length || 0, 'columnas');
      console.log('  - numericas:', customConfig.numericas?.length || 0, 'columnas');
      console.log('  - textoLibre:', customConfig.textoLibre?.length || 0, 'columnas');
    }
    console.log('  Total columnas en processedResults[0]:', Object.keys(processedResults[0]).length);
    console.log('  Columnas:', Object.keys(processedResults[0]).filter(k => k !== 'sentiment' && k !== 'sentimentAnalysis'));
    
    if (customConfig && (customConfig.identificacion || customConfig.numericas || customConfig.textoLibre)) {
      console.log('📋 Filtrando columnas según configuración para reporte Excel...');
      
      // Obtener columnas permitidas de la configuración
      const allowedColumns = new Set([
        ...(customConfig.identificacion || []),
        ...(customConfig.numericas || []),
        ...(customConfig.textoLibre || [])
      ]);
      
      console.log(`✅ Columnas permitidas (${allowedColumns.size}):`, Array.from(allowedColumns));
      
      if (allowedColumns.size === 0) {
        console.log('⚠️ ADVERTENCIA: allowedColumns está vacío, no se filtrará nada');
      }
      
      // Filtrar cada resultado para incluir solo las columnas permitidas
      filteredResults = processedResults.map(result => {
        const filtered = {};
        let addedCount = 0;
        
        // Agregar solo las columnas permitidas
        for (const [key, value] of Object.entries(result)) {
          if (allowedColumns.has(key)) {
            filtered[key] = value;
            addedCount++;
          } else if (key === 'sentiment' || key === 'sentimentAnalysis') {
            // Mantener análisis de sentimiento
            filtered[key] = value;
          }
        }
        
        return filtered;
      });
      
      const columnsAfterFilter = Object.keys(filteredResults[0]).filter(k => k !== 'sentiment' && k !== 'sentimentAnalysis');
      console.log(`📊 Resultados filtrados: ${columnsAfterFilter.length} columnas por registro`);
      console.log('   Columnas resultantes:', columnsAfterFilter);
    } else {
      console.log('⚠️ No hay configuración personalizada O las listas están vacías, exportando todas las columnas');
    }
    
    // Generar el reporte en Excel con las estadísticas
    const excelWorkbook = await generateAdvancedExcelReport(filteredResults, customConfig, originalFilename, statistics);
    
    // Guardar archivo temporal
    const outputPath = path.join(__dirname, 'uploads', `reporte-avanzado-${Date.now()}.xlsx`);
    await excelWorkbook.xlsx.writeFile(outputPath);
    
    console.log('✅ Reporte generado exitosamente');

    // Enviar archivo
    res.download(outputPath, 'reporte-sentiment-analysis.xlsx', (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
      } else {
        // Limpiar archivo temporal después de enviarlo
        setTimeout(() => {
          fs.unlink(outputPath, () => {});
        }, 5000);
      }
    });

  } catch (error) {
    console.error('Error generando reporte avanzado:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Función auxiliar para determinar consenso
function determineConsensus(naturalResult, nlpResult) {
  const naturalClass = naturalResult.classification || '';
  const nlpClass = nlpResult.classification || '';
  
  // Si ambos coinciden
  if (naturalClass === nlpClass) {
    return naturalClass;
  }
  
  // Si uno es neutral, usar el otro
  if (naturalClass.toLowerCase().includes('neutral')) {
    return nlpClass;
  }
  if (nlpClass.toLowerCase().includes('neutral')) {
    return naturalClass;
  }
  
  // Si difieren, usar el que tenga mayor confianza
  const naturalScore = Math.abs(naturalResult.score - 5);
  const nlpScore = Math.abs(nlpResult.score - 5);
  
  return naturalScore >= nlpScore ? naturalClass : nlpClass;
}

// ============= NUEVO: Generar Reporte con Columna de Validación =============
app.post('/api/generate-validation-report', upload.single('excelFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    console.log('📊 Generando reporte con columna de validación...');

    // Parsear configuración personalizada si existe
    let customConfig = null;
    if (req.body.columnConfig) {
      try {
        customConfig = JSON.parse(req.body.columnConfig);
        console.log(`⚙️ Usando configuración personalizada: ${customConfig.name}`);
      } catch (e) {
        console.error('❌ Error parseando columnConfig:', e);
      }
    }
    
    // RECIBIR ESTADÍSTICAS PRECALCULADAS DEL FRONTEND
    let statisticsFromApp = null;
    if (req.body.statistics) {
      try {
        statisticsFromApp = JSON.parse(req.body.statistics);
        console.log('📊 ✅ Estadísticas recibidas del frontend (valores de la app):', {
          total: statisticsFromApp.totalResults,
          avgScore: statisticsFromApp.averageScore,
          percentages: statisticsFromApp.percentages
        });
      } catch (e) {
        console.error('❌ Error parseando statistics:', e);
      }
    }
    
    // RECIBIR ÍNDICES FILTRADOS SI EXISTEN
    let filteredIndices = null;
    if (req.body.filteredIndices) {
      try {
        filteredIndices = JSON.parse(req.body.filteredIndices);
        console.log(`🔍 Filtros aplicados: exportando ${filteredIndices.length} filas específicas`);
      } catch (e) {
        console.error('❌ Error parseando filteredIndices:', e);
      }
    }

    let processedResults = [];
    let originalFilename = req.file.originalname || 'reporte.xlsx';
    
    // Procesar archivo Excel
    const workbook = XLSX.readFile(req.file.path, { 
      raw: false,
      FS: ';'
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });
    
    console.log(`📊 Archivo procesado: ${jsonData.length} filas`);

    if (jsonData.length === 0) {
      return res.status(400).json({ error: 'El archivo Excel está vacío' });
    }

    // Buscar la columna de validación (case-insensitive)
    const firstRow = jsonData[0];
    let validationColumnName = null;
    
    for (const columnName of Object.keys(firstRow)) {
      const normalizedName = columnName.toLowerCase().trim();
      if (normalizedName === 'validación final' || normalizedName === 'validacion final') {
        validationColumnName = columnName;
        break;
      }
    }

    if (!validationColumnName) {
      return res.status(400).json({ 
        error: 'No se encontró la columna "validación final" en el archivo. Por favor asegúrese de que existe.' 
      });
    }

    console.log(`✅ Columna de validación encontrada: "${validationColumnName}"`);

    // APLICAR FILTRO SI EXISTE
    if (filteredIndices && filteredIndices.length > 0) {
      const originalLength = jsonData.length;
      jsonData = jsonData.filter((row, index) => filteredIndices.includes(index));
      console.log(`✂️ Filtrado aplicado: ${jsonData.length} de ${originalLength} filas`);
    }

    const MAX_ROWS = 25000;
    if (jsonData.length > MAX_ROWS) {
      console.log(`⚠️ Archivo muy grande (${jsonData.length} filas). Procesando solo las primeras ${MAX_ROWS}.`);
      jsonData.splice(MAX_ROWS);
    }

    console.log(`🔄 Procesando ${jsonData.length} registros...`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      if (i % 500 === 0 && i > 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }

      const result = { ...row };
      const sentimentColumns = getSentimentColumns(row, customConfig);

      // Leer el valor de la columna de validación
      const validationValue = (row[validationColumnName] || '').toString().toLowerCase().trim();
      
      // Mapear el valor a una clasificación y score
      let classification = 'No clasificado';
      let score = 5;
      let confidence = 0;

      if (validationValue.includes('muy positiv')) {
        classification = 'Muy Positivo';
        score = 9;
        confidence = 1.0;
      } else if (validationValue.includes('positiv')) {
        classification = 'Positivo';
        score = 7;
        confidence = 1.0;
      } else if (validationValue.includes('neutral')) {
        classification = 'Neutral';
        score = 5;
        confidence = 1.0;
      } else if (validationValue.includes('muy negativ')) {
        classification = 'Muy Negativo';
        score = 1;
        confidence = 1.0;
      } else if (validationValue.includes('negativ')) {
        classification = 'Negativo';
        score = 3;
        confidence = 1.0;
      }

      if (sentimentColumns.length > 0) {
        result.sentimentAnalysis = {};
        
        let overallScore = 0;
        let sentimentResults = [];
        
        for (const colInfo of sentimentColumns) {
          const columnName = colInfo.column;
          const text = colInfo.text;
          
          if (text && text.trim().length > 0) {
            // En lugar de analyzeTextEnhanced, usar la validación
            result.sentimentAnalysis[columnName] = {
              classification: classification,
              score: score,
              scoreRaw: score,
              consensus: classification
            };
            
            // Acumular para cálculo de score normalizado
            overallScore += score;
            sentimentResults.push({
              classification: classification,
              score: score,
              normalizedScore: score,
              confidence: confidence,
              validationSource: validationValue
            });
          }
        }
        
        // Calcular score normalizado para este registro
        const perColumnAvgScore = sentimentResults.length > 0 ? overallScore / sentimentResults.length : 0;
        
        // Calcular confianza promedio
        const averageConfidence = sentimentResults.length > 0 
          ? sentimentResults.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / sentimentResults.length 
          : 0.5;
        
        // Agregar la propiedad sentiment con el score normalizado
        result.sentiment = {
          overallScore: overallScore,
          perColumnAvgScore: parseFloat(perColumnAvgScore.toFixed(2)),
          classification: classification,
          confidence: Math.round(averageConfidence * 100) / 100,
          details: sentimentResults,
          analyzedColumns: sentimentResults.length
        };
      }

      processedResults.push(result);
    }
    
    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    
    console.log('📝 Generando archivo Excel avanzado con columna de validación...');
    
    // USAR ESTADÍSTICAS QUE VIENEN DEL FRONTEND (ya calculadas correctamente)
    let statistics;
    
    if (statisticsFromApp) {
      // Usar las estadísticas que envió el frontend (filtradas o completas)
      console.log('✅ Usando estadísticas del frontend');
      statistics = statisticsFromApp;
      
      console.log('📊 Estadísticas para portada:', {
        total: statistics.totalResults,
        avgScore: statistics.averageScore,
        positivos: (parseFloat(statistics.percentages['Muy Positivo'] || 0) + parseFloat(statistics.percentages['Positivo'] || 0)).toFixed(1) + '%',
        neutrales: statistics.percentages['Neutral'] + '%',
        negativos: (parseFloat(statistics.percentages['Negativo'] || 0) + parseFloat(statistics.percentages['Muy Negativo'] || 0)).toFixed(1) + '%'
      });
    } else {
      // Fallback: calcular estadísticas en el backend
      console.log('⚠️ Calculando estadísticas en el backend (fallback)');
      
      const resultsForStats = processedResults.map((item, index) => {
        if (item.sentiment && item.sentiment.perColumnAvgScore !== undefined) {
          // Usar perColumnAvgScore que ya está normalizado 0-10
          const avgScore = item.sentiment.perColumnAvgScore;
          const classification = item.sentiment.classification || getClassification(avgScore);
          
          return {
            row: index + 1,
            sentiment: {
              perColumnAvgScore: avgScore,
              classification: classification,
              details: [{ score: avgScore }]
            }
          };
        }
        return null;
      }).filter(r => r !== null);
      
      const qualitativeCount = processedResults.filter(r => r.sentiment && r.sentiment.classification !== 'No clasificado').length;
      statistics = calculateStats(resultsForStats, qualitativeCount);
      // Agregar el total absoluto de encuestas procesadas
      statistics.totalSurveys = processedResults.length;
    }
    
    console.log('📊 Estadísticas finales para portada:', {
      totalSurveys: statistics.totalSurveys || processedResults.length,
      totalClassified: statistics.totalResults,
      avgScore: statistics.averageScore,
      positivos: statistics.percentages['Muy Positivo'] + statistics.percentages['Positivo'],
      neutrales: statistics.percentages['Neutral'],
      negativos: statistics.percentages['Negativo'] + statistics.percentages['Muy Negativo']
    });
    
    // FILTRAR COLUMNAS según configuración antes de generar Excel
    // Solo incluir: identificación + numéricas + texto libre
    let filteredResults = processedResults;
    
    console.log('\n🔍 DEBUG FILTRADO DE COLUMNAS (VALIDACIÓN):');
    console.log('  customConfig:', customConfig ? 'SÍ existe' : 'NO existe');
    if (customConfig) {
      console.log('  - name:', customConfig.name);
      console.log('  - identificacion:', customConfig.identificacion?.length || 0, 'columnas');
      console.log('  - numericas:', customConfig.numericas?.length || 0, 'columnas');
      console.log('  - textoLibre:', customConfig.textoLibre?.length || 0, 'columnas');
    }
    console.log('  Total columnas en processedResults[0]:', Object.keys(processedResults[0]).length);
    console.log('  Columnas:', Object.keys(processedResults[0]).filter(k => k !== 'sentiment' && k !== 'sentimentAnalysis'));
    
    if (customConfig && (customConfig.identificacion || customConfig.numericas || customConfig.textoLibre)) {
      console.log('📋 Filtrando columnas según configuración para reporte de validación...');
      
      // Obtener columnas permitidas de la configuración
      const allowedColumns = new Set([
        ...(customConfig.identificacion || []),
        ...(customConfig.numericas || []),
        ...(customConfig.textoLibre || [])
      ]);
      
      console.log(`✅ Columnas permitidas (${allowedColumns.size}):`, Array.from(allowedColumns));
      
      if (allowedColumns.size === 0) {
        console.log('⚠️ ADVERTENCIA: allowedColumns está vacío, no se filtrará nada');
      }
      
      // Filtrar cada resultado para incluir solo las columnas permitidas
      filteredResults = processedResults.map(result => {
        const filtered = {};
        let addedCount = 0;
        
        // Agregar solo las columnas permitidas
        for (const [key, value] of Object.entries(result)) {
          if (allowedColumns.has(key)) {
            filtered[key] = value;
            addedCount++;
          } else if (key === 'sentiment' || key === 'sentimentAnalysis') {
            // Mantener análisis de sentimiento
            filtered[key] = value;
          }
        }
        
        return filtered;
      });
      
      const columnsAfterFilter = Object.keys(filteredResults[0]).filter(k => k !== 'sentiment' && k !== 'sentimentAnalysis');
      console.log(`📊 Resultados filtrados: ${columnsAfterFilter.length} columnas por registro`);
      console.log('   Columnas resultantes:', columnsAfterFilter);
    } else {
      console.log('⚠️ No hay configuración personalizada O las listas están vacías, exportando todas las columnas');
    }
    
    // Generar el reporte en Excel con las estadísticas (MISMO QUE REPORTE COMPLETO)
    const excelWorkbook = await generateAdvancedExcelReport(filteredResults, customConfig, originalFilename, statistics);
    
    // Guardar archivo temporal
    const outputPath = path.join(__dirname, 'uploads', `reporte-validacion-${Date.now()}.xlsx`);
    await excelWorkbook.xlsx.writeFile(outputPath);
    
    console.log('✅ Reporte de validación generado exitosamente');

    // Enviar archivo
    res.download(outputPath, 'reporte-validacion-sentiment-analysis.xlsx', (err) => {
      if (err) {
        console.error('Error enviando archivo:', err);
      } else {
        // Limpiar archivo temporal después de enviarlo
        setTimeout(() => {
          fs.unlink(outputPath, () => {});
        }, 5000);
      }
    });

  } catch (error) {
    console.error('Error generando reporte con columna de validación:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});
// ============= FIN: Generar Reporte con Columna de Validación =============

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// ============= ENDPOINT PARA VERSIÓN =============

// Obtener versión de la aplicación (automática desde commits de Git)
app.get('/api/version', (req, res) => {
  try {
    // En producción, usar variable de entorno inyectada durante build
    if (process.env.APP_VERSION) {
      return res.json({ 
        version: process.env.APP_VERSION,
        name: 'Análisis de Encuestas'
      });
    }
    
    // En desarrollo, calcular desde git
    const { execSync } = require('child_process');
    const commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim();
    const version = `1.${commitCount.padStart(3, '0')}`;
    
    res.json({ 
      version: version,
      name: 'Análisis de Encuestas'
    });
  } catch (error) {
    // Si falla git, usar package.json como fallback
    const packageJson = require('./package.json');
    res.json({ 
      version: packageJson.version,
      name: packageJson.name 
    });
  }
});

// ============= ENDPOINTS PARA GESTIÓN DEL DICCIONARIO =============

// Obtener diccionario completo
app.get('/api/dictionary', (req, res) => {
  try {
    if (!activeDictionary.fileName) {
      return res.status(400).json({ error: 'No hay diccionario activo' });
    }
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    let activeDict = {};
    let dictName = activeDictionary.name;
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      activeDict = data.dictionary || {};
      dictName = data.name || dictName;
    } else {
      activeDict = activeDictionary.labels || {};
    }
    const dictionaryData = Object.entries(activeDict).map(([word, score]) => ({
      word,
      score,
      type: score > 0.5 ? 'positive' : score < -0.5 ? 'negative' : 'neutral'
    }));
    res.json({
      success: true,
      name: dictName,
      dictionary: dictionaryData,
      stats: {
        total: dictionaryData.length,
        positive: dictionaryData.filter(item => item.type === 'positive').length,
        negative: dictionaryData.filter(item => item.type === 'negative').length,
        neutral: dictionaryData.filter(item => item.type === 'neutral').length
      }
    });
  } catch (error) {
    console.error('Error obteniendo diccionario:', error);
    res.status(500).json({ error: 'Error obteniendo diccionario' });
  }
});

// Agregar nueva palabra al diccionario
app.post('/api/dictionary/add', (req, res) => {
  try {
    const { word, score } = req.body;

    if (!word || score === undefined) {
      return res.status(400).json({ error: 'Palabra y puntuación son requeridos' });
    }

    if (!activeDictionary.fileName) {
      return res.status(400).json({ error: 'No hay diccionario activo seleccionado' });
    }

    const normalizedWord = word.toLowerCase().trim();
    const numericScore = parseFloat(score);

    if (isNaN(numericScore) || numericScore < -5 || numericScore > 5) {
      return res.status(400).json({ error: 'La puntuación debe ser un número entre -5 y 5' });
    }

    // Cargar diccionario activo
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo del diccionario no encontrado' });
    }

    const dictData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Agregar palabra al diccionario
    if (!dictData.dictionary) {
      dictData.dictionary = {};
    }
    
    dictData.dictionary[normalizedWord] = numericScore;
    dictData.wordCount = Object.keys(dictData.dictionary).length;

    // Guardar archivo
    fs.writeFileSync(filePath, JSON.stringify(dictData, null, 2), 'utf8');

    // Actualizar diccionario en memoria
    completeSpanishDict[normalizedWord] = numericScore;
    currentLabels[normalizedWord] = numericScore;
    activeDictionary.wordCount = dictData.wordCount;

    // Re-registrar en sentiment
    sentiment = new Sentiment();
    const dictCopy = JSON.parse(JSON.stringify(currentLabels));
    sentiment.registerLanguage('es', { labels: dictCopy });

    console.log(`✅ Palabra "${normalizedWord}" agregada al diccionario ${activeDictionary.name} con puntuación ${numericScore}`);

    res.json({
      success: true,
      message: `Palabra "${normalizedWord}" agregada con puntuación ${numericScore}`,
      word: normalizedWord,
      score: numericScore,
      wordCount: dictData.wordCount
    });

  } catch (error) {
    console.error('Error agregando palabra:', error);
    res.status(500).json({ error: 'Error agregando palabra al diccionario' });
  }
});

// Eliminar palabra del diccionario personalizado
app.delete('/api/dictionary/remove/:word', (req, res) => {
  try {
    const word = req.params.word.toLowerCase().trim();

    if (!activeDictionary.fileName) {
      return res.status(400).json({ error: 'No hay diccionario activo seleccionado' });
    }

    // Cargar diccionario activo
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo del diccionario no encontrado' });
    }

    const dictData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!dictData.dictionary || !dictData.dictionary.hasOwnProperty(word)) {
      return res.status(404).json({ error: 'Palabra no encontrada en el diccionario' });
    }

    // Eliminar palabra
    delete dictData.dictionary[word];
    dictData.wordCount = Object.keys(dictData.dictionary).length;

    // Guardar archivo
    fs.writeFileSync(filePath, JSON.stringify(dictData, null, 2), 'utf8');

    // Actualizar diccionario en memoria
    delete completeSpanishDict[word];
    delete currentLabels[word];
    activeDictionary.wordCount = dictData.wordCount;

    // Re-registrar en sentiment
    sentiment = new Sentiment();
    const dictCopy = JSON.parse(JSON.stringify(currentLabels));
    sentiment.registerLanguage('es', { labels: dictCopy });

    console.log(`🗑️ Palabra "${word}" eliminada del diccionario ${activeDictionary.name}`);

    res.json({
      success: true,
      message: `Palabra "${word}" eliminada del diccionario`,
      wordCount: dictData.wordCount
    });

  } catch (error) {
    console.error('Error eliminando palabra:', error);
    res.status(500).json({ error: 'Error eliminando palabra del diccionario' });
  }
});

// Actualizar/renombrar palabra del diccionario
app.put('/api/dictionary/update', (req, res) => {
  try {
    const { oldWord, newWord, score } = req.body;

    if (!oldWord || !newWord || score === undefined) {
      return res.status(400).json({ error: 'Palabra antigua, palabra nueva y puntuación son requeridos' });
    }

    if (!activeDictionary.fileName) {
      return res.status(400).json({ error: 'No hay diccionario activo seleccionado' });
    }

    const normalizedOldWord = oldWord.toLowerCase().trim();
    const normalizedNewWord = newWord.toLowerCase().trim();
    const numericScore = parseFloat(score);

    if (isNaN(numericScore) || numericScore < -5 || numericScore > 5) {
      return res.status(400).json({ error: 'La puntuación debe ser un número entre -5 y 5' });
    }

    // Cargar diccionario activo
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo del diccionario no encontrado' });
    }

    const dictData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!dictData.dictionary || !dictData.dictionary.hasOwnProperty(normalizedOldWord)) {
      return res.status(404).json({ error: 'Palabra antigua no encontrada en el diccionario' });
    }

    // Si la palabra cambió, eliminar la antigua
    if (normalizedOldWord !== normalizedNewWord) {
      delete dictData.dictionary[normalizedOldWord];
    }
    
    // Agregar/actualizar palabra nueva
    dictData.dictionary[normalizedNewWord] = numericScore;
    dictData.wordCount = Object.keys(dictData.dictionary).length;

    // Guardar archivo
    fs.writeFileSync(filePath, JSON.stringify(dictData, null, 2), 'utf8');

    // Actualizar diccionario en memoria
    if (normalizedOldWord !== normalizedNewWord) {
      delete completeSpanishDict[normalizedOldWord];
      delete currentLabels[normalizedOldWord];
    }
    completeSpanishDict[normalizedNewWord] = numericScore;
    currentLabels[normalizedNewWord] = numericScore;
    activeDictionary.wordCount = dictData.wordCount;

    // Re-registrar en sentiment
    sentiment = new Sentiment();
    const dictCopy = JSON.parse(JSON.stringify(currentLabels));
    sentiment.registerLanguage('es', { labels: dictCopy });

    console.log(`✏️ Palabra "${normalizedOldWord}" actualizada a "${normalizedNewWord}" con puntuación ${numericScore} en ${activeDictionary.name}`);

    res.json({
      success: true,
      message: `Palabra actualizada correctamente`,
      oldWord: normalizedOldWord,
      newWord: normalizedNewWord,
      score: numericScore,
      wordCount: dictData.wordCount
    });

  } catch (error) {
    console.error('Error actualizando palabra:', error);
    res.status(500).json({ error: 'Error actualizando palabra del diccionario' });
  }
});

// Probar análisis de una palabra o frase
app.post('/api/dictionary/test', (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Texto es requerido' });
    }
    
    const analysis = analyzeTextEnhanced(text);
    
    res.json({
      success: true,
      text: text,
      analysis: analysis,
      ignored: analysis.ignored || false, // Indicar si fue ignorado
      message: analysis.ignored ? 'Texto ignorado (sin comentario, puntuación vacía, etc.)' : null,
      classification: getClassification(analysis.normalizedScore, analysis.confidence)
    });
    
  } catch (error) {
    console.error('Error probando análisis:', error);
    res.status(500).json({ error: 'Error probando análisis' });
  }
});

// ===== GESTIÓN DE PALABRAS IGNORADAS =====

// Obtener lista de palabras ignoradas
app.get('/api/ignored-phrases', (req, res) => {
  try {
    res.json({
      success: true,
      phrases: IGNORED_PHRASES,
      count: IGNORED_PHRASES.length
    });
  } catch (error) {
    console.error('Error obteniendo palabras ignoradas:', error);
    res.status(500).json({ error: 'Error obteniendo palabras ignoradas' });
  }
});

// Agregar palabra/frase ignorada
app.post('/api/ignored-phrases/add', (req, res) => {
  try {
    const { phrase } = req.body;
    
    if (!phrase || phrase.trim().length === 0) {
      return res.status(400).json({ error: 'Frase es requerida' });
    }
    
    const normalizedPhrase = phrase.trim().toLowerCase();
    
    // Verificar si ya existe
    if (IGNORED_PHRASES.some(p => p.toLowerCase() === normalizedPhrase)) {
      return res.status(400).json({ error: 'Esta frase ya está en la lista de ignoradas' });
    }
    
    // Agregar a la lista
    IGNORED_PHRASES.push(phrase.trim());
    
    // Guardar en archivo
    if (saveIgnoredPhrases()) {
      res.json({
        success: true,
        message: 'Frase agregada a la lista de ignoradas',
        phrase: phrase.trim(),
        totalPhrases: IGNORED_PHRASES.length
      });
    } else {
      res.status(500).json({ error: 'Error guardando la frase' });
    }
  } catch (error) {
    console.error('Error agregando frase ignorada:', error);
    res.status(500).json({ error: 'Error agregando frase ignorada' });
  }
});

// Eliminar palabra/frase ignorada
app.delete('/api/ignored-phrases/remove/:phrase', (req, res) => {
  try {
    const phraseToRemove = decodeURIComponent(req.params.phrase);
    
    const initialLength = IGNORED_PHRASES.length;
    IGNORED_PHRASES = IGNORED_PHRASES.filter(p => p !== phraseToRemove);
    
    if (IGNORED_PHRASES.length === initialLength) {
      return res.status(404).json({ error: 'Frase no encontrada en la lista' });
    }
    
    // Guardar en archivo
    if (saveIgnoredPhrases()) {
      res.json({
        success: true,
        message: 'Frase eliminada de la lista de ignoradas',
        phrase: phraseToRemove,
        totalPhrases: IGNORED_PHRASES.length
      });
    } else {
      res.status(500).json({ error: 'Error guardando los cambios' });
    }
  } catch (error) {
    console.error('Error eliminando frase ignorada:', error);
    res.status(500).json({ error: 'Error eliminando frase ignorada' });
  }
});

// Actualizar toda la lista de palabras ignoradas
app.put('/api/ignored-phrases/update', (req, res) => {
  try {
    const { phrases } = req.body;
    
    if (!Array.isArray(phrases)) {
      return res.status(400).json({ error: 'Se requiere un array de frases' });
    }
    
    // Validar y limpiar frases
    const cleanedPhrases = phrases
      .map(p => String(p).trim())
      .filter(p => p.length > 0);
    
    IGNORED_PHRASES = cleanedPhrases;
    
    // Guardar en archivo
    if (saveIgnoredPhrases()) {
      res.json({
        success: true,
        message: 'Lista de frases ignoradas actualizada',
        totalPhrases: IGNORED_PHRASES.length
      });
    } else {
      res.status(500).json({ error: 'Error guardando los cambios' });
    }
  } catch (error) {
    console.error('Error actualizando palabras ignoradas:', error);
    res.status(500).json({ error: 'Error actualizando palabras ignoradas' });
  }
});

// Exportar diccionario personalizado
app.get('/api/dictionary/export', (req, res) => {
  try {
    if (!activeDictionary.fileName) {
      return res.status(400).json({ error: 'No hay diccionario activo para exportar' });
    }
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    let dictToExport = activeDictionary.labels || {};
    let dictName = activeDictionary.fileName || 'diccionario';
    let ignoredPhrases = IGNORED_PHRASES;
    
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      dictToExport = data.dictionary || dictToExport;
      ignoredPhrases = data.ignored_phrases || ignoredPhrases;
    }
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '2.0',
      dictionaryName: activeDictionary.name,
      customDictionary: dictToExport,
      ignoredPhrases: ignoredPhrases,
      stats: {
        totalWords: Object.keys(dictToExport).length,
        positiveWords: Object.values(dictToExport).filter(score => score > 0).length,
        negativeWords: Object.values(dictToExport).filter(score => score < 0).length,
        neutralWords: Object.values(dictToExport).filter(score => score === 0).length,
        ignoredPhrasesCount: ignoredPhrases.length
      }
    };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${dictName}.json`);
    res.json(exportData);
  } catch (error) {
    console.error('Error exportando diccionario:', error);
    res.status(500).json({ error: 'Error exportando diccionario' });
  }
});

// Exportar diccionario a Excel
app.get('/api/dictionary/export-excel', async (req, res) => {
  try {
    if (!activeDictionary.fileName) {
      return res.status(400).json({ error: 'No hay diccionario activo para exportar' });
    }
    
    // Cargar el diccionario DIRECTAMENTE del archivo JSON para evitar inconsistencias
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo de diccionario no encontrado' });
    }
    
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const dict = fileData.dictionary || {};
    
    console.log(`📤 Exportando diccionario "${activeDictionary.name}": ${Object.keys(dict).length} palabras (desde archivo JSON)`);
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Diccionario de Sentimientos');
    
    const dictionaryData = Object.entries(dict).map(([word, score]) => ({
      word,
      score,
      type: score > 0 ? 'Positivo' : score < 0 ? 'Negativo' : 'Neutral'
    }));
    
    // Configurar columnas
    sheet.columns = [
      { header: 'Palabra/Frase', key: 'word', width: 40 },
      { header: 'Puntuación', key: 'score', width: 15 },
      { header: 'Tipo', key: 'type', width: 15 },
      { header: 'Origen', key: 'origin', width: 15 }
    ];
    
    // Estilo del encabezado
    const headerRow = sheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Agregar datos ordenados por puntuación (de más positivo a más negativo)
    dictionaryData.sort((a, b) => b.score - a.score);
    
    dictionaryData.forEach((item, index) => {
      const row = sheet.addRow(item);
      
      // Colorear según tipo
      const scoreCell = row.getCell('score');
      const typeCell = row.getCell('type');
      
      if (item.score > 0) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
        scoreCell.font = { color: { argb: 'FF2E7D2E' }, bold: true };
        typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E8' } };
        typeCell.font = { color: { argb: 'FF2E7D2E' } };
      } else if (item.score < 0) {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };
        scoreCell.font = { color: { argb: 'FFC53030' }, bold: true };
        typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE8E8' } };
        typeCell.font = { color: { argb: 'FFC53030' } };
      } else {
        scoreCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3E2' } };
        scoreCell.font = { color: { argb: 'FF8B5A00' }, bold: true };
        typeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3E2' } };
        typeCell.font = { color: { argb: 'FF8B5A00' } };
      }
      
      // Resaltar palabras de usuario
      if (item.origin === 'Usuario') {
        row.getCell('origin').font = { bold: true, color: { argb: 'FF0066CC' } };
      }
    });
    
    // Aplicar filtros automáticos
    sheet.autoFilter = {
      from: 'A1',
      to: 'D' + (dictionaryData.length + 1)
    };
    
    // Agregar hoja de estadísticas
    const statsSheet = workbook.addWorksheet('Estadísticas');
    statsSheet.columns = [
      { header: 'Métrica', key: 'metric', width: 30 },
      { header: 'Valor', key: 'value', width: 20 }
    ];
    
    const stats = [
      { metric: 'Total de Palabras', value: dictionaryData.length },
      { metric: 'Palabras Positivas', value: dictionaryData.filter(d => d.score > 0).length },
      { metric: 'Palabras Negativas', value: dictionaryData.filter(d => d.score < 0).length },
      { metric: 'Palabras Neutrales', value: dictionaryData.filter(d => d.score === 0).length },
      { metric: 'Palabras del Sistema', value: dictionaryData.filter(d => d.origin === 'Sistema').length },
      { metric: 'Palabras Personalizadas', value: dictionaryData.filter(d => d.origin === 'Usuario').length },
      { metric: 'Total Palabras Ignoradas', value: IGNORED_PHRASES.length },
      { metric: 'Fecha de Exportación', value: new Date().toLocaleString('es-AR') }
    ];
    
    stats.forEach(stat => {
      statsSheet.addRow(stat);
    });
    
    // Estilo de estadísticas
    statsSheet.getRow(1).eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D2E' } };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    });
    
    // Agregar hoja de Palabras Ignoradas
    const ignoredSheet = workbook.addWorksheet('Palabras Ignoradas');
    ignoredSheet.columns = [
      { header: 'Palabra/Frase Ignorada', key: 'phrase', width: 40 }
    ];
    
    // Estilo del encabezado
    const ignoredHeaderRow = ignoredSheet.getRow(1);
    ignoredHeaderRow.eachCell(cell => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDC3545' }
      };
      cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });
    
    // Agregar frases ignoradas
    IGNORED_PHRASES.forEach((phrase, index) => {
      const row = ignoredSheet.addRow({ phrase });
      // Alternar colores de fila
      if (index % 2 === 0) {
        row.getCell('phrase').fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFEF5F5' }
        };
      }
    });
    
    // Aplicar filtros automáticos
    ignoredSheet.autoFilter = {
      from: 'A1',
      to: 'A' + (IGNORED_PHRASES.length + 1)
    };
    
    // Generar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=diccionario-sentimientos.xlsx');
    res.send(buffer);
    
    console.log('✅ Diccionario exportado a Excel exitosamente');
    
  } catch (error) {
    console.error('Error exportando diccionario a Excel:', error);
    res.status(500).json({ error: 'Error exportando diccionario a Excel: ' + error.message });
  }
});

// Importar diccionario personalizado
// Importar diccionario (JSON o Excel)
app.post('/api/dictionary/import', upload.single('dictionaryFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const dictionaryName = req.body.dictionaryName || 'Diccionario Importado';
    const file = req.file;
    const ext = path.extname(file.originalname).toLowerCase();
    
    let importedDict = {};
    let importedIgnoredPhrases = ['-', '.', '...', '¿', '?', 'sin comentario', 'sin comentarios', 's/c', 'n/a', 'na', 'ninguno', 'ninguna', 'nada'];
    
    // Procesar según el tipo de archivo
    if (ext === '.json') {
      // Importar desde JSON (solo para casos especiales, NO desde UI)
      const fileContent = fs.readFileSync(file.path, 'utf8');
      const jsonData = JSON.parse(fileContent);
      
      // Detectar el formato del JSON
      if (jsonData.dictionary) {
        // Formato completo con metadata
        importedDict = jsonData.dictionary;
        importedIgnoredPhrases = jsonData.ignored_phrases || importedIgnoredPhrases;
      } else if (jsonData.labels) {
        // Formato de sentiment
        importedDict = jsonData.labels;
      } else {
        // Formato simple: objeto de palabra -> puntuación
        importedDict = jsonData;
      }
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Importar desde Excel
      const workbook = XLSX.readFile(file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      console.log(`📥 Procesando ${data.length} filas desde Excel...`);
      
      // DEBUG: Ver nombres de columnas reales CON caracteres exactos
      if (data.length > 0) {
        console.log(`📋 Columnas detectadas en Excel:`, Object.keys(data[0]));
        // Mostrar cada columna con su longitud y códigos de caracteres
        Object.keys(data[0]).forEach(key => {
          console.log(`   "${key}" (${key.length} chars) - Códigos: [${Array.from(key).map(c => c.charCodeAt(0)).join(', ')}]`);
        });
      }
      
      // Convertir a diccionario (solo palabras únicas)
      let duplicates = 0;
      let skippedRows = 0;
      let neutralWords = [];
      data.forEach((row, index) => {
        const word = row['Palabra/Frase'] || row['palabra'] || row['Palabra'] || row['word'];
        
        // BUSCAR la columna de puntuación por coincidencia flexible
        let scoreRaw;
        for (const key of Object.keys(row)) {
          const normalizedKey = key.toLowerCase().trim();
          if (normalizedKey.includes('puntuaci') || normalizedKey === 'score') {
            scoreRaw = row[key];
            break;
          }
        }
        
        const score = parseFloat(scoreRaw);
        
        // DEBUG: Loggear primeras 5 filas para ver estructura
        if (index < 5) {
          console.log(`   Fila ${index + 1}: Palabra="${word}" | ScoreRaw="${scoreRaw}" | ScoreParsed="${score}" | Tipo="${row['Tipo'] || row['tipo']}"`);
        }
        
        // DEBUG: Loggear filas específicas problemáticas
        const problematicRows = [519, 520, 694, 788, 792, 919]; // indices 0-based
        if (problematicRows.includes(index)) {
          console.log(`   🔍 DEBUG Fila ${index + 2}: Palabra="${word}" | ScoreRaw="${scoreRaw}" | Score parsed="${score}" | Tipo raw="${row['Tipo']}" | Todas las columnas:`, row);
        }
        
        if (word && !isNaN(score)) {
          const normalizedWord = word.toLowerCase().trim();
          
          // Detectar neutrales (score entre -0.5 y 0.5)
          if (score >= -0.5 && score <= 0.5) {
            neutralWords.push({ word: normalizedWord, score: score });
          }
          
          // Solo agregar si no existe (evitar duplicados)
          if (!importedDict[normalizedWord]) {
            importedDict[normalizedWord] = score;
          } else {
            duplicates++;
            console.log(`⚠️ Duplicado ignorado: "${word}" (ya existe como "${normalizedWord}")`);
          }
        } else {
          skippedRows++;
          if (!word) {
            console.log(`⚠️ Fila ${index + 2} (Excel): Sin palabra válida`);
          } else if (isNaN(score)) {
            console.log(`⚠️ Fila ${index + 2} (Excel): Palabra "${word}" tiene puntuación inválida: "${scoreRaw}" (columna Puntuación vacía o no numérica)`);
          }
        }
      });
      
      console.log(`📊 Palabras neutrales detectadas en Excel: ${neutralWords.length}`);
      if (neutralWords.length > 0) {
        console.log(`   Ejemplos:`, neutralWords.slice(0, 5));
      }
      
      if (duplicates > 0) {
        console.log(`⚠️ Total duplicados ignorados: ${duplicates} palabras`);
      }
      
      // Detectar rango de valores y convertir si está en escala 0-10
      const scores = Object.values(importedDict);
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      
      // Si el rango está entre 0-10 (escala absoluta), convertir a escala relativa (-5 a +5)
      if (minScore >= 0 && maxScore <= 10 && maxScore > 5) {
        console.log(`📊 Detectada escala 0-10. Convirtiendo a escala relativa (-5 a +5)...`);
        for (const [word, score] of Object.entries(importedDict)) {
          importedDict[word] = score - 5; // 0→-5, 5→0, 10→+5
        }
        console.log(`✅ Conversión completada: ${Object.keys(importedDict).length} palabras convertidas`);
      } else {
        console.log(`✅ Detectada escala relativa. Se mantienen los valores originales.`);
      }
      
      console.log(`✅ Importadas ${Object.keys(importedDict).length} palabras únicas desde ${data.length} filas`);
      
      // Importar palabras ignoradas si existe la hoja
      if (workbook.SheetNames.includes('Palabras Ignoradas')) {
        const ignoredSheet = workbook.Sheets['Palabras Ignoradas'];
        const ignoredData = XLSX.utils.sheet_to_json(ignoredSheet);
        
        const phrases = ignoredData
          .map(row => row['Palabra/Frase Ignorada'] || row['frase'] || row['Frase'] || row['phrase'])
          .filter(phrase => phrase && phrase.trim().length > 0)
          .map(phrase => phrase.trim());
        
        if (phrases.length > 0) {
          importedIgnoredPhrases = phrases;
          console.log(`📥 Importadas ${phrases.length} palabras ignoradas desde Excel`);
        }
      }
    } else {
      // Limpiar archivo temporal
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'Formato de archivo no soportado. Use Excel (.xlsx, .xls)' });
    }
    
    // Validar que se importaron palabras
    if (Object.keys(importedDict).length === 0) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ error: 'El archivo no contiene palabras válidas' });
    }
    
    // Crear el archivo del diccionario
    const fileName = dictionaryName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    
    // Crear directorio si no existe
    if (!fs.existsSync(dictionariesDir)) {
      fs.mkdirSync(dictionariesDir, { recursive: true });
    }
    
    // Guardar el diccionario con las palabras ignoradas importadas
    const dictionaryData = {
      name: dictionaryName,
      dictionary: importedDict,
      ignored_phrases: importedIgnoredPhrases,
      wordCount: Object.keys(importedDict).length,
      created: new Date().toISOString(),
      imported: true
    };
    
    const savePath = path.join(dictionariesDir, `${fileName}.json`);
    fs.writeFileSync(savePath, JSON.stringify(dictionaryData, null, 2));
    
    // Limpiar archivo temporal
    fs.unlinkSync(file.path);
    
    // Activar el diccionario automáticamente
    sentiment = new Sentiment();
    const dictCopy = JSON.parse(JSON.stringify(importedDict));
    sentiment.registerLanguage('es', { labels: dictCopy });
    currentLabels = dictCopy;
    
    activeDictionary = {
      name: dictionaryName,
      fileName: fileName,
      wordCount: Object.keys(importedDict).length,
      customWords: 0,
      labels: currentLabels
    };
    
    // Cargar palabras ignoradas del nuevo diccionario
    loadIgnoredPhrases();
    
    console.log(`✅ Diccionario "${dictionaryName}" importado y activado (${activeDictionary.wordCount} palabras)`);
    
    res.json({ 
      success: true, 
      message: `Diccionario "${dictionaryName}" importado exitosamente con ${activeDictionary.wordCount} palabras`,
      dictionaryName: dictionaryName,
      fileName: fileName,
      wordCount: activeDictionary.wordCount
    });
    
  } catch (error) {
    console.error('Error importando diccionario:', error);
    
    // Limpiar archivo temporal en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ error: 'Error importando diccionario: ' + error.message });
  }
});

// Obtener diccionario activo
app.get('/api/dictionaries/active', (req, res) => {
  res.json({ 
    success: true,
    activeDictionary: activeDictionary
  });
});

// Listar diccionarios disponibles
app.get('/api/dictionaries', (req, res) => {
  try {
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const dictionaries = [];
    if (fs.existsSync(dictionariesDir)) {
      const files = fs.readdirSync(dictionariesDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const filePath = path.join(dictionariesDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            // SIEMPRE contar palabras reales, no confiar en metadata
            const realWordCount = Object.keys(data.dictionary || {}).length;
            dictionaries.push({
              name: data.name || file.replace('.json', ''),
              fileName: file.replace('.json', ''),
              wordCount: realWordCount, // Usar conteo real, no data.wordCount
              created: data.created
            });
          } catch (e) {
            console.error(`Error leyendo diccionario ${file}:`, e);
          }
        }
      });
    }
    res.json({ dictionaries });
  } catch (error) {
    console.error('Error listando diccionarios:', error);
    res.status(500).json({ error: 'Error listando diccionarios' });
  }
});

// Activar diccionario
app.post('/api/dictionaries/activate', (req, res) => {
  try {
    const { fileName } = req.body;
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${fileName}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Diccionario no encontrado' });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const customDict = data.dictionary || {};
    console.log(`📖 Activando diccionario "${data.name || fileName}" (${Object.keys(customDict).length} palabras)`);
    sentiment = new Sentiment();
    const dictCopy = JSON.parse(JSON.stringify(customDict));
    sentiment.registerLanguage('es', { labels: dictCopy });
    currentLabels = dictCopy;
    activeDictionary = {
      name: data.name || fileName,
      fileName: fileName,
      wordCount: Object.keys(customDict).length,
      customWords: 0,
      labels: currentLabels
    };
    console.log(`✅ Diccionario "${activeDictionary.name}" activado`);
    res.json({ success: true, message: `Diccionario "${activeDictionary.name}" activado`, activeDictionary });
    
    // Cargar palabras ignoradas del diccionario recién activado
    loadIgnoredPhrases();
  } catch (error) {
    console.error('Error activando diccionario:', error);
    res.status(500).json({ error: 'Error activando diccionario' });
  }
});

// Eliminar diccionario
app.delete('/api/dictionaries/:fileName', (req, res) => {
  try {
    const { fileName } = req.params;
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${fileName}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Diccionario no encontrado' });
    }
    fs.unlinkSync(filePath);
    if (activeDictionary.fileName === fileName) {
      activeDictionary = { name: null, fileName: null, wordCount: 0 };
      currentLabels = {};
    }
    res.json({ success: true, message: 'Diccionario eliminado exitosamente' });
  } catch (error) {
    console.error('Error eliminando diccionario:', error);
    res.status(500).json({ error: 'Error eliminando diccionario' });
  }
});


// Restaurar diccionario original
app.post('/api/dictionary/reset', (req, res) => {
  try {
    if (!activeDictionary.fileName) {
      return res.status(400).json({ error: 'No hay diccionario activo para restaurar' });
    }
    const dictionariesDir = path.join(__dirname, 'dictionaries');
    const filePath = path.join(dictionariesDir, `${activeDictionary.fileName}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Archivo de diccionario no encontrado' });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const dictCopy = JSON.parse(JSON.stringify(data.dictionary || {}));
    sentiment = new Sentiment();
    sentiment.registerLanguage('es', { labels: dictCopy });
    currentLabels = dictCopy;
    activeDictionary.wordCount = Object.keys(dictCopy).length;
    
    // Recargar también las palabras ignoradas del diccionario
    loadIgnoredPhrases();
    
    res.json({ success: true, message: 'Diccionario recargado desde archivo original' });
  } catch (error) {
    console.error('Error restaurando diccionario:', error);
    res.status(500).json({ error: 'Error restaurando diccionario' });
  }
});

// ======================== ENDPOINTS ANÁLISIS MULTI-MOTOR ========================

// Endpoint para análisis con motor específico
app.post('/api/analyze-engine', (req, res) => {
  try {
    const { text, engine = 'natural' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Texto requerido' });
    }
    
    analyzeWithMultipleEngines(text, [engine])
      .then(results => {
        const result = results[Object.keys(results)[0]];
        res.json({
          success: true,
          engine: engine,
          result: result,
          timestamp: new Date().toISOString()
        });
      })
      .catch(error => {
        console.error('Error en análisis:', error);
        res.status(500).json({ error: 'Error en análisis: ' + error.message });
      });
      
  } catch (error) {
    console.error('Error en analyze-engine:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint para análisis comparativo con múltiples motores (solo efectivos para español)
app.post('/api/analyze-compare', async (req, res) => {
  try {
    const { text, engines = ['natural', 'nlpjs'] } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Texto requerido' });
    }
    
    if (!Array.isArray(engines) || engines.length === 0) {
      return res.status(400).json({ error: 'Lista de motores requerida' });
    }
    
    const results = await analyzeWithMultipleEngines(text, engines);
    
    res.json({
      success: true,
      text: text,
      engines: engines,
      results: results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error en analyze-compare:', error);
    res.status(500).json({ error: 'Error en análisis comparativo: ' + error.message });
  }
});

// Endpoint para obtener lista de motores disponibles (solo JavaScript, sin Python)
app.get('/api/engines', (req, res) => {
  try {
    const engines = [
      {
        id: 'natural',
        name: 'Natural.js v4 Only',
        description: 'Motor de análisis usando exclusivamente el diccionario v4 (sin mezclas ni extensiones)',
        language: 'Español',
        type: 'JavaScript',
        features: ['Diccionario v4 fijo', 'Negaciones básicas', 'Escala -5..+5'],
        status: 'available',
        responseTime: 'Muy rápido (~5ms)',
        recommended: true
      }
    ];
    
    res.json({
      success: true,
      engines: engines,
      total: engines.length,
      available: engines.length
    });
    
  } catch (error) {
    console.error('Error obteniendo motores:', error);
    res.status(500).json({ error: 'Error obteniendo lista de motores' });
  }
});

// ========================================
// ENDPOINTS PARA GESTIÓN DE CONFIGURACIÓN DE COLUMNAS
// ========================================

// Archivo para guardar configuraciones - Persistente en volumen Docker
const CONFIGS_FILE = process.env.COLUMN_CONFIGS_FILE || path.join(__dirname, 'column-configs.json');

// Cargar configuraciones guardadas
function loadColumnConfigs() {
  try {
    if (fs.existsSync(CONFIGS_FILE)) {
      const data = fs.readFileSync(CONFIGS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error cargando configuraciones:', error);
  }
  return [];
}

// Guardar configuraciones
function saveColumnConfigs(configs) {
  try {
    fs.writeFileSync(CONFIGS_FILE, JSON.stringify(configs, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error guardando configuraciones:', error);
    return false;
  }
}

// Obtener configuración actual de column-config.js
app.get('/api/column-config', (req, res) => {
  res.json({
    identificacion: COLUMN_CONFIG.identificacion,
    numericas: COLUMN_CONFIG.numericas,
    textoLibre: COLUMN_CONFIG.textoLibre
  });
});

// Detectar columnas de un archivo Excel
app.post('/api/detect-columns', upload.single('excelFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const workbook = XLSX.readFile(req.file.path, { raw: false, FS: ';' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

    if (jsonData.length > 0) {
      const columns = Object.keys(jsonData[0]);
      console.log('📋 Columnas detectadas:', columns.length);
      
      // Analizar contenido de cada columna para clasificación inteligente
      const columnAnalysis = analyzeColumnsContent(jsonData, columns);
      
      // Limpiar archivo temporal
      fs.unlinkSync(req.file.path);
      
      res.json({
        success: true,
        columns: columns,
        totalRows: jsonData.length,
        analysis: columnAnalysis  // Incluir análisis para clasificación automática
      });
    } else {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: 'El archivo está vacío' });
    }
  } catch (error) {
    console.error('❌ Error detectando columnas:', error);
    console.error('❌ Stack:', error.stack);
    
    // Intentar limpiar archivo de forma segura
    try {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (cleanupError) {
      console.error('⚠️ Error limpiando archivo temporal:', cleanupError.message);
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Error procesando archivo: ' + error.message 
    });
  }
});

// Función para analizar el contenido de las columnas y sugerir tipo
function analyzeColumnsContent(data, columns) {
  const sampleSize = Math.min(100, data.length); // Analizar hasta 100 registros
  const analysis = {};
  
  columns.forEach(columnName => {
    const samples = data.slice(0, sampleSize).map(row => row[columnName]).filter(v => v !== null && v !== undefined && v !== '');
    
    if (samples.length === 0) {
      analysis[columnName] = { type: 'identificacion', confidence: 'low', reason: 'Sin datos' };
      return;
    }
    
    // Calcular estadísticas básicas
    const uniqueValues = new Set(samples.map(v => String(v).trim()));
    const uniqueCount = uniqueValues.size;
    const uniqueRatio = uniqueCount / samples.length;
    const avgLength = samples.reduce((sum, v) => sum + String(v).length, 0) / samples.length;
    
    // Detectar si son valores numéricos
    const numericSamples = samples.filter(v => {
      const str = String(v).trim();
      // Permitir números puros o formato "1. Texto"
      return !isNaN(parseFloat(str)) || /^(\d+)\s*[.\-:)]\s*/.test(str);
    });
    const numericRatio = numericSamples.length / samples.length;
    
    // Detectar si son valores numéricos puros (sin texto adicional)
    const pureNumericSamples = samples.filter(v => {
      const str = String(v).trim();
      return !isNaN(parseFloat(str)) && String(parseFloat(str)) === str;
    });
    const pureNumericRatio = pureNumericSamples.length / samples.length;
    
    // Detectar escalas numéricas
    let scaleInfo = null;
    
    // Detectar formato "1. Opción", "5. Excelente"
    const scalePattern = /^(\d+)\s*[.\-:)]\s*(.+)$/;
    const scaleValues = [];
    const scaleLabels = {};
    
    samples.forEach(sample => {
      const match = String(sample).match(scalePattern);
      if (match) {
        const value = parseInt(match[1]);
        const label = match[2].trim();
        scaleValues.push(value);
        scaleLabels[value] = label;
      }
    });
    
    if (scaleValues.length >= 2) {
      const min = Math.min(...scaleValues);
      const max = Math.max(...scaleValues);
      
      scaleInfo = {
        min: min,
        max: max,
        direction: 'ascending',
        labels: scaleLabels,
        pattern: 'labeled'
      };
    } else if (pureNumericRatio >= 0.7) {
      // Escala numérica pura
      const numValues = pureNumericSamples.map(v => parseFloat(String(v).trim()));
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      
      if (max <= 10 && min >= 0) {
        scaleInfo = {
          min: Math.floor(min),
          max: Math.ceil(max),
          direction: 'ascending',
          pattern: 'pure'
        };
      }
    }
    
    // Patrones en el nombre de la columna
    const colLower = columnName.toLowerCase();
    const isIdPattern = /^(id|codigo|cod|numero|nro|num)$/i.test(colLower);
    const isIdentityPattern = /carrera|materia|docente|profesor|sede|modalidad|comision|turno|año|periodo|fecha|campus|facultad|departamento/i.test(colLower);
    const isNumericPattern = /evalua|califica|puntua|escala|cumple|demost|considera|aprend|desempeño|desempen|satisfaccion|calidad|nota|promedio|puntaje|score|rate|rating|puntos/i.test(colLower);
    const isTextPattern = /comentario|observacion|sugerencia|motivo|porque|por que|descripcion|detalle|opinion|feedback|respuesta|indique|explique|mencione|describa/i.test(colLower);
    
    // Lógica de clasificación
    let type = 'identificacion';
    let confidence = 'medium';
    let reason = '';
    
    // 1. Campos ID específicos
    if (isIdPattern) {
      type = 'identificacion';
      confidence = 'high';
      reason = 'Campo identificador';
    }
    // 2. Campos numéricos puros con escala limitada (1-10, 1-5, etc.)
    else if (pureNumericRatio >= 0.9) {
      const numValues = pureNumericSamples.map(v => parseFloat(String(v).trim()));
      const min = Math.min(...numValues);
      const max = Math.max(...numValues);
      
      // Si es escala 1-10, 1-5, 0-10, etc. → campo numérico de evaluación
      if ((max <= 10 && min >= 0) || (max <= 5 && min >= 1) || isNumericPattern) {
        type = 'numerica';
        confidence = 'high';
        reason = `Valores numéricos (${min}-${max}), escala de evaluación`;
      } 
      // Si tiene muchos valores únicos y no es patrón de evaluación → probablemente ID
      else if (uniqueRatio > 0.8) {
        type = 'identificacion';
        confidence = 'high';
        reason = 'Números únicos (probablemente IDs)';
      }
      // Valores numéricos con baja variabilidad → numérica
      else {
        type = 'numerica';
        confidence = 'medium';
        reason = 'Valores numéricos';
      }
    }
    // 3. Formato "1. Opción", "5. Excelente" → numérica
    else if (numericRatio >= 0.8 && !pureNumericRatio) {
      const scalePattern = /^(\d+)\s*[.\-:)]\s*(.+)$/;
      const hasScale = samples.some(v => scalePattern.test(String(v).trim()));
      if (hasScale) {
        type = 'numerica';
        confidence = 'high';
        reason = 'Escala con etiquetas (ej: "1. Opción")';
      }
    }
    // 4. Texto largo → cualitativa
    else if (avgLength > 50 || isTextPattern) {
      type = 'textoLibre';
      confidence = avgLength > 100 ? 'high' : 'medium';
      reason = `Texto promedio ${Math.round(avgLength)} caracteres`;
    }
    // 5. Pocos valores únicos + patrón de identidad → identificación
    else if (uniqueRatio < 0.3 || isIdentityPattern) {
      type = 'identificacion';
      confidence = 'high';
      reason = `${uniqueCount} valores únicos de ${samples.length} (${Math.round(uniqueRatio * 100)}%)`;
    }
    // 6. Muchos valores únicos pero textos cortos → texto libre
    else if (uniqueRatio > 0.7 && avgLength > 20) {
      type = 'textoLibre';
      confidence = 'medium';
      reason = 'Alta variabilidad en respuestas';
    }
    // 7. Por defecto, identificación
    else {
      type = 'identificacion';
      confidence = 'low';
      reason = 'Clasificación por defecto';
    }
    
    analysis[columnName] = {
      type,
      confidence,
      reason,
      stats: {
        samples: samples.length,
        unique: uniqueCount,
        uniqueRatio: Math.round(uniqueRatio * 100),
        avgLength: Math.round(avgLength),
        numericRatio: Math.round(numericRatio * 100)
      },
      // Incluir información de escala si fue detectada
      ...(scaleInfo && { scale: scaleInfo })
    };
  });
  
  console.log('🔍 Análisis de columnas completado:');
  Object.entries(analysis).forEach(([col, info]) => {
    const scaleStr = info.scale ? ` [${info.scale.min}-${info.scale.max}]` : '';
    console.log(`  ${col}: ${info.type} (${info.confidence}) - ${info.reason}${scaleStr}`);
  });
  
  return analysis;
}

// Analizar metadata de columnas (detectar escalas automáticamente)
app.post('/api/analyze-column-metadata', upload.single('excelFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const workbook = XLSX.readFile(req.file.path, { raw: false, FS: ';' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });

    if (jsonData.length === 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const columns = Object.keys(jsonData[0]);
    const escalas = {};
    
    // Analizar cada columna
    columns.forEach(columnName => {
      const samples = jsonData.slice(0, 100).map(row => row[columnName]).filter(v => v && v.trim());
      
      if (samples.length === 0) return;
      
      // Detectar si es numérica con escala (ej: "1. Muy útil", "5. Excelente")
      const scalePattern = /^(\d+)\s*[.\-:)]\s*(.+)$/;
      const scaleValues = [];
      const labels = {};
      
      samples.forEach(sample => {
        const match = String(sample).match(scalePattern);
        if (match) {
          const value = parseInt(match[1]);
          const label = match[2].trim();
          scaleValues.push(value);
          labels[value] = label;
        }
      });
      
      // Si encontró al menos 2 valores con patrón de escala
      if (scaleValues.length >= 2) {
        const min = Math.min(...scaleValues);
        const max = Math.max(...scaleValues);
        
        escalas[columnName] = {
          type: 'scale',
          min: min,
          max: max,
          labels: labels,
          pattern: 'numeric-labeled', // "1. Opción" - "5. Opción"
          detected: true
        };
        
        console.log(`📊 Escala detectada en "${columnName}": ${min}-${max}`);
      } else {
        // Detectar si es numérica simple (solo números)
        const numericValues = samples
          .map(v => parseFloat(v))
          .filter(v => !isNaN(v));
        
        if (numericValues.length >= samples.length * 0.7) { // 70% numéricos
          const min = Math.min(...numericValues);
          const max = Math.max(...numericValues);
          
          escalas[columnName] = {
            type: 'numeric',
            min: min,
            max: max,
            pattern: 'pure-numeric', // Números puros
            detected: true
          };
          
          console.log(`🔢 Columna numérica "${columnName}": ${min}-${max}`);
        }
      }
    });

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      metadata: {
        escalas: escalas,
        totalColumns: columns.length,
        analyzedRows: Math.min(jsonData.length, 100)
      }
    });

  } catch (error) {
    console.error('Error analizando metadata:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: 'Error procesando archivo' });
  }
});

// Guardar una configuración de columnas
app.post('/api/save-column-config', (req, res) => {
  try {
    const { name, identificacion, numericas, textoLibre, escalas } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const configs = loadColumnConfigs();
    
    // Buscar si ya existe una configuración con este nombre
    const existingIndex = configs.findIndex(c => c.name === name);
    
    const newConfig = {
      name,
      identificacion: identificacion || [],
      numericas: numericas || [],
      textoLibre: textoLibre || [],
      escalas: escalas || {}, // Guardar metadata de escalas
      created: existingIndex >= 0 ? configs[existingIndex].created : new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      configs[existingIndex] = newConfig;
    } else {
      configs.push(newConfig);
    }
    
    if (saveColumnConfigs(configs)) {
      console.log(`💾 Configuración "${name}" guardada`);
      res.json({ success: true, config: newConfig });
    } else {
      res.status(500).json({ error: 'Error guardando configuración' });
    }
  } catch (error) {
    console.error('Error en save-column-config:', error);
    res.status(500).json({ error: 'Error guardando configuración' });
  }
});

// Obtener todas las configuraciones guardadas
app.get('/api/saved-column-configs', (req, res) => {
  try {
    const configs = loadColumnConfigs();
    res.json({ success: true, configs });
  } catch (error) {
    console.error('Error obteniendo configuraciones:', error);
    res.status(500).json({ error: 'Error obteniendo configuraciones' });
  }
});

// Eliminar una configuración
app.post('/api/delete-column-config', (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    
    const configs = loadColumnConfigs();
    const filteredConfigs = configs.filter(c => c.name !== name);
    
    if (saveColumnConfigs(filteredConfigs)) {
      console.log(`🗑️ Configuración "${name}" eliminada`);
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Error eliminando configuración' });
    }
  } catch (error) {
    console.error('Error eliminando configuración:', error);
    res.status(500).json({ error: 'Error eliminando configuración' });
  }
});

// Error handler global - captura errores no manejados
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err);
  console.error('❌ Stack:', err.stack);
  
  // Asegurar que siempre devolvemos JSON, no HTML
  res.status(err.status || 500).json({ 
    success: false,
    error: err.message || 'Error interno del servidor' 
  });
});

module.exports = app;
