const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const Sentiment = require('sentiment');
const { NlpManager } = require('node-nlp');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// Solo usamos palabras de v4 y negaciones para invertir puntaje; no cargamos diccionarios extra.
const { negationWords } = require('./sentiment-dict');
const COLUMN_CONFIG = require('./column-config');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(cors());
app.use(express.json({ charset: 'utf-8' }));
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
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
  const v4Path = path.join(__dirname, 'dictionaries', 'Diccionario_Sentimientos_v4.json');
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
    name: 'Diccionario Sentimientos v4',
    fileName: 'Diccionario_Sentimientos_v4',
    wordCount: Object.keys(completeSpanishDict).length,
    labels: completeSpanishDict
  };
  sentiment = new Sentiment();
  const dictCopy = JSON.parse(JSON.stringify(completeSpanishDict));
  sentiment.registerLanguage('es', { labels: dictCopy });
  currentLabels = dictCopy;
  console.log(`🚀 Diccionario v4 auto-activado al inicio (${activeDictionary.wordCount} palabras)`);
}

// Permitir configurar la ruta del diccionario vía variable de entorno para soportar Docker/volúmenes
const USER_DICT_FILE = process.env.USER_DICT_FILE || path.join(__dirname, 'user-dictionary.json');

// Cargar diccionario personalizado si existe
// Se eliminan loadUserDictionary y saveUserDictionary (no hay edición permitida)

// ===== FUNCIONES DE CONFIGURACIÓN DE COLUMNAS =====
// Usa el archivo column-config.js para la configuración

// Función para determinar si una columna debe ser analizada para sentimiento
function shouldAnalyzeColumn(columnName, value) {
  // No analizar columnas de identificación
  if (COLUMN_CONFIG.identificacion.includes(columnName)) {
    return false;
  }
  
  // No analizar columnas numéricas
  if (COLUMN_CONFIG.numericas.includes(columnName)) {
    return false;
  }
  
  // Verificar si es una columna de texto libre (coincidencia exacta o parcial)
  const isTextoLibre = COLUMN_CONFIG.textoLibre.some(pattern => 
    columnName.includes(pattern) || pattern.includes(columnName)
  );
  
  if (isTextoLibre) {
    // Solo analizar si es string con contenido significativo
    const minLength = COLUMN_CONFIG.analisis?.longitudMinimaTextoLibre || 10;
    const shouldProcess = typeof value === 'string' && value.trim().length > minLength;
    if (!shouldProcess && typeof value === 'string' && value.trim().length > 0) {
      console.log(`[FILTRO] ❌ Columna texto libre "${columnName}" rechazada: longitud ${value.trim().length} <= ${minLength} | Valor: "${value.substring(0, 50)}"`);
    } else if (!shouldProcess && (!value || (typeof value === 'string' && value.trim().length === 0))) {
      console.log(`[FILTRO] ⚠️ Columna texto libre "${columnName}" vacía: tipo=${typeof value} valor="${value}"`);
    } else if (shouldProcess) {
      console.log(`[FILTRO] ✅ Columna texto libre "${columnName}" ACEPTADA: longitud ${value.trim().length} > ${minLength}`);
    }
    return shouldProcess;
  } 
  
  // Para cualquier otra columna, aplicar reglas generales:
  // - Debe ser string
  // - Más de X caracteres (comentarios significativos)
  // - No debe ser un número convertido a string
  const minLength = COLUMN_CONFIG.analisis?.longitudMinimaOtros || 20;
  if (typeof value === 'string' && value.trim().length > minLength) {
    // Verificar que no sea solo un número
    const trimmed = value.trim();
    if (!isNaN(trimmed) && trimmed !== '') {
      return false;
    }
    return true;
  }
  
  return false;
}

// Helper reutilizable: obtiene columnas de texto que se deben analizar para sentimiento.
// Retorna arreglo de objetos { column, text }
function getSentimentColumns(row) {
  const selected = [];
  Object.entries(row).forEach(([columnName, value]) => {
    const shouldAnalyze = shouldAnalyzeColumn(columnName, value);
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

    // Limitar a 5000 filas para evitar problemas de memoria
    const MAX_ROWS = 5000;
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
        if (shouldAnalyzeColumn(columnName, value)) {
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
        
        // Limitar el texto para reducir memoria
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        
        sentimentResults.push({
          column: columnNames[idx], // Incluir nombre de columna
          text: limitedText,
          score: enhancedAnalysis.score,
          comparative: enhancedAnalysis.comparative,
          positive: enhancedAnalysis.positive.slice(0, 5), // Máximo 5 palabras
          negative: enhancedAnalysis.negative.slice(0, 5), // Máximo 5 palabras
          confidence: enhancedAnalysis.confidence
        });
        overallScore += enhancedAnalysis.score;
        overallComparative += enhancedAnalysis.comparative;
      });

      if (sentimentResults.length > 0) {
        overallComparative = overallComparative / sentimentResults.length;
      }

      // Calcular confianza promedio
      const averageConfidence = sentimentResults.length > 0 
        ? sentimentResults.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / sentimentResults.length 
        : 0.5;

  // Promedio por columna (score ahora raw -5..+5, neutral = 0)
  const perColumnAvgScore = sentimentResults.length > 0 ? overallScore / sentimentResults.length : 0; // 0 = neutral

      return {
        id: index + 1,
        originalData: row,
        numericMetrics: numericValues, // Incluir métricas numéricas
        sentiment: {
          overallScore: overallScore, // suma total (puede exceder rango por múltiples columnas)
          perColumnAvgScore: parseFloat(perColumnAvgScore.toFixed(2)), // score promedio -5..+5
          overallComparative: overallComparative,
          classification: getClassification(perColumnAvgScore, averageConfidence),
          confidence: Math.round(averageConfidence * 100) / 100,
          details: sentimentResults,
          analyzedColumns: columnNames.length // Cantidad de columnas analizadas
        }
      };
    });

    // Estadísticas generales
    const stats = calculateStats(results);
    
    // Extraer valores únicos para filtros
    const filterOptions = extractFilterOptions(jsonData);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalResponses: results.length,
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
    const MAX_ROWS = 5000;
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
      const sentimentColumns = getSentimentColumns(row);
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
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        const safeScore = typeof analysis.score === 'number' ? analysis.score : 0;
        const safeComparative = typeof analysis.comparative === 'number' ? analysis.comparative : 0;
        const safeConfidence = typeof analysis.confidence === 'number' ? analysis.confidence : 0.5;
        sentimentResults.push({
          column,
            text: limitedText,
            score: safeScore,
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
      const averageScore = sentimentResults.length > 0 ? overallScore / sentimentResults.length : 0;
      const averageConfidence = sentimentResults.length > 0 ? sentimentResults.reduce((sum, r) => sum + (r.confidence || 0.5), 0) / sentimentResults.length : 0.5;
      results.push({
        row: i + 1,
        ...row,
        numericMetrics: numericValues,
        sentiment: {
          score: parseFloat(averageScore.toFixed(2)),
          comparative: parseFloat((overallComparative || 0).toFixed(4)),
          confidence: parseFloat(averageConfidence.toFixed(2)),
          engine,
          analyzedColumns: sentimentColumns.map(c => c.column),
          details: sentimentResults
        }
      });
    }

    console.log(`✅ Análisis completado con ${engine}`);

    const stats = calculateStats(results);
    
    // Extraer valores únicos para filtros
    const filterOptions = extractFilterOptions(jsonData);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalResponses: results.length,
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
    const MAX_ROWS = 5000;
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
      const sentimentColumns = getSentimentColumns(row);
      let dualAnalysis = { natural: [], nlpjs: [], consensus: [] };
      let overallScore = 0;
      let overallComparative = 0;
      let analysisCount = 0;
      for (const { column, text } of sentimentColumns) {
        const [naturalResult, nlpResult] = await Promise.all([
          Promise.resolve(analyzeTextEnhanced(text)),
          analyzeWithNLPjs(text)
        ]);
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
      results.push({
        row: i + 1,
        ...row,
        sentiment: {
          score: parseFloat(averageScore.toFixed(2)),
          comparative: parseFloat(averageComparative.toFixed(4)),
          confidence: sentimentColumns.length > 0 ? 0.8 : 0.0,
          engine: 'both',
          analyzedColumns: sentimentColumns.map(c => c.column),
          dualAnalysis
        }
      });
    }

    console.log(`✅ Análisis dual completado`);

    const stats = calculateStats(results);
    
    // Extraer valores únicos para filtros
    const filterOptions = extractFilterOptions(jsonData);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalResponses: results.length,
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

// Función de análisis de sentimientos (solo contenido del diccionario v4 activo)
function analyzeTextEnhanced(text) {
  const normalizedText = removeAccents(text.toLowerCase().trim());
  const tokens = normalizedText.split(/[^a-zA-Záéíóúüñ0-9]+/).filter(t => t.length > 0);
  const tokenSet = new Set(tokens);
  const hasNegation = negationWords.some(neg => normalizedText.includes(neg));

  let rawScore = 0;
  const positives = [];
  const negatives = [];
  let matchedCount = 0;

  for (const [key, value] of Object.entries(currentLabels)) {
    const normKey = removeAccents(key.toLowerCase().trim());
    if (!normKey) continue;
    if (normKey.includes(' ')) {
      // Buscar frases completas sin word boundaries estrictos
      if (normalizedText.includes(normKey)) {
        const count = (normalizedText.match(new RegExp(escapeRegex(normKey), 'g')) || []).length;
        rawScore += value * count;
        matchedCount += count;
        if (value > 0) positives.push(key); else if (value < 0) negatives.push(key);
      }
    } else {
      if (tokenSet.has(normKey)) {
        rawScore += value;
        matchedCount += 1;
        if (value > 0) positives.push(key); else if (value < 0) negatives.push(key);
      }
    }
  }

  if (matchedCount === 0 && normalizedText.length > 0 && normalizedText.split(/\s+/).length <= 30) {
    console.log(`[DEBUG] Sin coincidencias para: "${normalizedText}" | Ejemplos diccionario:`, Object.keys(currentLabels).slice(0,5));
  }

  if (hasNegation && rawScore !== 0) rawScore = -rawScore;

  const totalWords = tokens.length;
  const confidence = totalWords > 0 ? Math.min(1, matchedCount / totalWords) : 0;
  const classification = getClassification(rawScore, confidence);
  const comparative = totalWords > 0 ? rawScore / totalWords : 0;

  return {
    score: rawScore,
    comparative: Math.round(comparative * 100) / 100,
    positive: positives.slice(0,5),
    negative: negatives.slice(0,5),
    confidence: Math.round(confidence * 100) / 100,
    classification,
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
  // Score esperado: -5 .. +5
  // Umbrales fijos (independientes de confidence para estabilidad):
  // >= +3 Muy Positivo
  // >= +1 Positivo
  // > -1 y < +1 Neutral
  // >= -3 Negativo
  // < -3 Muy Negativo
  if (score >= 3) return 'Muy Positivo';
  if (score >= 1) return 'Positivo';
  if (score > -1 && score < 1) return 'Neutral';
  if (score >= -3) return 'Negativo';
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
    score: analysis.score,
    comparative: analysis.comparative,
    confidence: analysis.confidence,
    classification: analysis.classification,
    positive: analysis.positive,
    negative: analysis.negative,
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
function extractFilterOptions(data) {
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
  
  // Usar la configuración de filtros definida en column-config.js
  const carreraCol = COLUMN_CONFIG.filtros?.carrera || 'CARRERA';
  const materiaCol = COLUMN_CONFIG.filtros?.materia || 'MATERIA';
  const modalidadCol = COLUMN_CONFIG.filtros?.modalidad || 'MODALIDAD';
  const sedeCol = COLUMN_CONFIG.filtros?.sede || 'SEDE';
  const docenteCol = COLUMN_CONFIG.filtros?.docente || 'DOCENTE';
  
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
    numericQuestions: COLUMN_CONFIG.numericas || []
  };
  
  console.log(`📊 Filtros extraídos: ${result.carreras.length} carreras, ${result.materias.length} materias, ${result.modalidades.length} modalidades, ${result.sedes.length} sedes, ${result.docentes.length} docentes`);
  console.log(`📊 Columnas numéricas: ${result.numericQuestions.length} preguntas`);
  
  return result;
}

// Función para calcular estadísticas
function calculateStats(results) {
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
    if (result.sentiment) {
      const avgScore = typeof result.sentiment.perColumnAvgScore === 'number'
        ? result.sentiment.perColumnAvgScore
        : 0; // Neutral en nueva escala raw -5..+5

      // Clasificación usando mismos umbrales raw
      let classification = 'Neutral';
      if (avgScore >= 3) classification = 'Muy Positivo';
      else if (avgScore >= 1) classification = 'Positivo';
      else if (avgScore <= -3) classification = 'Muy Negativo';
      else if (avgScore <= -1) classification = 'Negativo';

      classifications[classification]++;
      totalScore += avgScore;
      totalComparative += (typeof result.sentiment.overallComparative === 'number' ? result.sentiment.overallComparative : 0);
      validResults++;
    }
  });

  const averageScore = validResults > 0 ? totalScore / validResults : 0;
  const averageComparative = validResults > 0 ? totalComparative / validResults : 0;
  const totalResults = validResults > 0 ? validResults : 1; // Evitar división por cero

  return {
    classifications: classifications,
    averageScore: parseFloat(averageScore.toFixed(2)), // Promedio -5..+5
    averageComparative: parseFloat(averageComparative.toFixed(4)),
    totalResults: validResults, // Total de respuestas procesadas
    percentages: {
      'Muy Positivo': parseFloat((classifications['Muy Positivo'] / totalResults * 100).toFixed(1)),
      'Positivo': parseFloat((classifications['Positivo'] / totalResults * 100).toFixed(1)),
      'Neutral': parseFloat((classifications['Neutral'] / totalResults * 100).toFixed(1)),
      'Negativo': parseFloat((classifications['Negativo'] / totalResults * 100).toFixed(1)),
      'Muy Negativo': parseFloat((classifications['Muy Negativo'] / totalResults * 100).toFixed(1))
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

async function generateAdvancedExcelReport(analysisResults, filename = 'reporte-sentiment-analysis.xlsx') {
  const workbook = new ExcelJS.Workbook();
  
  // Hoja principal con datos detallados
  const detailSheet = workbook.addWorksheet('Análisis Detallado');
  
  // Configurar columnas con anchos adecuados
  detailSheet.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Carrera', key: 'carrera', width: 25 },
    { header: 'Materia', key: 'materia', width: 30 },
    { header: 'Sede', key: 'sede', width: 20 },
    { header: 'Docente', key: 'docente', width: 25 },
    { header: 'Comentario Materia', key: 'comentario_materia', width: 50 },
    { header: 'Comentario Docente', key: 'comentario_docente', width: 50 },
    { header: 'Sentiment Materia (Natural.js)', key: 'sentiment_materia_natural', width: 18 },
    { header: 'Score Materia (Natural.js)', key: 'score_materia_natural', width: 16 },
    { header: 'Sentiment Materia (NLP.js)', key: 'sentiment_materia_nlp', width: 18 },
    { header: 'Score Materia (NLP.js)', key: 'score_materia_nlp', width: 16 },
    { header: 'Sentiment Docente (Natural.js)', key: 'sentiment_docente_natural', width: 18 },
    { header: 'Score Docente (Natural.js)', key: 'score_docente_natural', width: 16 },
    { header: 'Sentiment Docente (NLP.js)', key: 'sentiment_docente_nlp', width: 18 },
    { header: 'Score Docente (NLP.js)', key: 'score_docente_nlp', width: 16 },
    { header: 'Consenso Materia', key: 'consenso_materia', width: 15 },
    { header: 'Consenso Docente', key: 'consenso_docente', width: 15 }
  ];

  // Estilo del encabezado
  const headerRow = detailSheet.getRow(1);
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF366092' }
    };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Agregar datos
  let rowIndex = 2;
  analysisResults.forEach((result, index) => {
    const row = detailSheet.getRow(rowIndex);
    
    // Extraer campos del resultado
    const carrera = result.carrera || extractField(result, ['carrera', 'programa', 'career']) || 'N/A';
    const materia = result.materia || extractField(result, ['materia', 'asignatura', 'curso', 'subject']) || 'N/A';
    const sede = result.sede || extractField(result, ['sede', 'campus', 'sucursal']) || 'N/A';
    const docente = result.docente || extractField(result, ['docente', 'profesor', 'teacher', 'instructor']) || 'N/A';
    const comentarioMateria = result.comentario_materia || extractField(result, ['comentario_materia', 'feedback_materia', 'opinion_materia']) || '';
    const comentarioDocente = result.comentario_docente || extractField(result, ['comentario_docente', 'feedback_docente', 'opinion_docente']) || '';

    // Datos básicos
    row.getCell('id').value = index + 1;
    row.getCell('carrera').value = carrera;
    row.getCell('materia').value = materia;
    row.getCell('sede').value = sede;
    row.getCell('docente').value = docente;
    row.getCell('comentario_materia').value = comentarioMateria;
    row.getCell('comentario_docente').value = comentarioDocente;

    // Análisis de sentimientos (si existe)
    if (result.sentimentAnalysis) {
      const analysis = result.sentimentAnalysis;
      
      // Análisis de materia
      if (analysis.materia) {
        row.getCell('sentiment_materia_natural').value = analysis.materia.natural?.classification || 'N/A';
        row.getCell('score_materia_natural').value = analysis.materia.natural?.score || 0;
        row.getCell('sentiment_materia_nlp').value = analysis.materia.nlpjs?.classification || 'N/A';
        row.getCell('score_materia_nlp').value = analysis.materia.nlpjs?.score || 0;
        row.getCell('consenso_materia').value = analysis.materia.consensus || 'N/A';
      }
      
      // Análisis de docente
      if (analysis.docente) {
        row.getCell('sentiment_docente_natural').value = analysis.docente.natural?.classification || 'N/A';
        row.getCell('score_docente_natural').value = analysis.docente.natural?.score || 0;
        row.getCell('sentiment_docente_nlp').value = analysis.docente.nlpjs?.classification || 'N/A';
        row.getCell('score_docente_nlp').value = analysis.docente.nlpjs?.score || 0;
        row.getCell('consenso_docente').value = analysis.docente.consensus || 'N/A';
      }
    }

    // Aplicar colores según sentiment
    applySentimentColors(row, 'consenso_materia');
    applySentimentColors(row, 'consenso_docente');
    
    rowIndex++;
  });

  // Aplicar filtros automáticos
  detailSheet.autoFilter = {
    from: 'A1',
    to: detailSheet.lastColumn.letter + detailSheet.lastRow.number
  };

  // Hoja de resumen por carrera
  const summarySheet = workbook.addWorksheet('Resumen por Carrera');
  await createSummarySheet(summarySheet, analysisResults);
  
  // Hoja de resumen por docente
  const docenteSheet = workbook.addWorksheet('Resumen por Docente');
  await createDocenteSummarySheet(docenteSheet, analysisResults);
  
  // Hoja de gráficos
  const chartsSheet = workbook.addWorksheet('Gráficos');
  await createChartsSheet(chartsSheet, analysisResults);

  return workbook;
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
    const key = `${docente}|${carrera}`;
    
    if (!docenteStats[key]) {
      docenteStats[key] = {
        docente,
        carrera,
        total: 0,
        positivas: 0,
        negativas: 0
      };
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

    // Procesar el archivo como lo hacemos normalmente
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
    const MAX_ROWS = 5000;
    if (jsonData.length > MAX_ROWS) {
      console.log(`⚠️ Archivo muy grande (${jsonData.length} filas). Procesando solo las primeras ${MAX_ROWS}.`);
      jsonData.splice(MAX_ROWS);
    }

    // Procesar cada fila con análisis de sentimientos
    const processedResults = [];
    console.log(`🔄 Procesando ${jsonData.length} registros...`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Progreso cada 500 registros
      if (i % 500 === 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }

      const result = { ...row };
      
      // Identificar comentarios de materia y docente
      const sentimentColumns = getSentimentColumns(row); // Filtrar columnas de texto libre válidas

      if (sentimentColumns.length > 0) {
        result.sentimentAnalysis = {};
        
        // Intentar identificar comentarios específicos
        const materiaField = sentimentColumns.find(c => 
          c.column.toLowerCase().includes('materia') || 
          c.column.toLowerCase().includes('asignatura') || 
          c.column.toLowerCase().includes('curso')
        );
        
        const docenteField = sentimentColumns.find(c => 
          c.column.toLowerCase().includes('docente') || 
          c.column.toLowerCase().includes('profesor') || 
          c.column.toLowerCase().includes('teacher')
        );

        // Analizar comentario de materia
        if (materiaField && materiaField.text) {
          const materiaText = materiaField.text;
          result.comentario_materia = materiaText;
          
          const [naturalResult, nlpResult] = await Promise.all([
            Promise.resolve(analyzeTextEnhanced(materiaText)),
            analyzeWithNLPjs(materiaText)
          ]);

          result.sentimentAnalysis.materia = {
            natural: naturalResult,
            nlpjs: nlpResult,
            consensus: determineConsensus(naturalResult, nlpResult)
          };
        }

        // Analizar comentario de docente
        if (docenteField && docenteField.text) {
          const docenteText = docenteField.text;
          result.comentario_docente = docenteText;
          
          const [naturalResult, nlpResult] = await Promise.all([
            Promise.resolve(analyzeTextEnhanced(docenteText)),
            analyzeWithNLPjs(docenteText)
          ]);

          result.sentimentAnalysis.docente = {
            natural: naturalResult,
            nlpjs: nlpResult,
            consensus: determineConsensus(naturalResult, nlpResult)
          };
        }

        // Si no se identificaron campos específicos, analizar el primer campo de texto
        if (!materiaField && !docenteField && sentimentColumns.length > 0) {
          const mainText = sentimentColumns[0].text;
          const [naturalResult, nlpResult] = await Promise.all([
            Promise.resolve(analyzeTextEnhanced(mainText)),
            analyzeWithNLPjs(mainText)
          ]);

          result.sentimentAnalysis.general = {
            natural: naturalResult,
            nlpjs: nlpResult,
            consensus: determineConsensus(naturalResult, nlpResult)
          };
        }
      }

      processedResults.push(result);
    }

    console.log('📝 Generando archivo Excel avanzado...');
    
    // Generar el reporte en Excel
    const excelWorkbook = await generateAdvancedExcelReport(processedResults);
    
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
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
      type: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral'
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
  return res.status(403).json({ error: 'Diccionario inmutable: sólo se usa contenido original de v4' });
});

// Eliminar palabra del diccionario personalizado
app.delete('/api/dictionary/remove/:word', (req, res) => {
  return res.status(403).json({ error: 'Diccionario inmutable: no se pueden eliminar palabras' });
});

// Actualizar/renombrar palabra del diccionario
app.put('/api/dictionary/update', (req, res) => {
  return res.status(403).json({ error: 'Diccionario inmutable: no se pueden actualizar palabras' });
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
      classification: getClassification(analysis.score, analysis.confidence)
    });
    
  } catch (error) {
    console.error('Error probando análisis:', error);
    res.status(500).json({ error: 'Error probando análisis' });
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
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      dictToExport = data.dictionary || dictToExport;
    }
    const exportData = {
      timestamp: new Date().toISOString(),
      version: '2.0',
      dictionaryName: activeDictionary.name,
      customDictionary: dictToExport,
      stats: {
        totalWords: Object.keys(dictToExport).length,
        positiveWords: Object.values(dictToExport).filter(score => score > 0).length,
        negativeWords: Object.values(dictToExport).filter(score => score < 0).length,
        neutralWords: Object.values(dictToExport).filter(score => score === 0).length
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
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Diccionario de Sentimientos');
    const dict = activeDictionary.labels || {};
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
  return res.status(403).json({ error: 'Importación deshabilitada: sólo se permite el diccionario v4' });
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
            dictionaries.push({
              name: data.name || file.replace('.json', ''),
              fileName: file.replace('.json', ''),
              wordCount: data.wordCount || Object.keys(data.dictionary || {}).length,
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

module.exports = app;
