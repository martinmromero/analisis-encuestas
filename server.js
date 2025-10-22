const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const Sentiment = require('sentiment');
const { NlpManager } = require('node-nlp');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { spanishSentimentDict, spanishPhrases, intensityModifiers, negationWords } = require('./sentiment-dict');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
    }
  }
});

// Inicializar analizador de sentimientos con diccionario completo
const sentiment = new Sentiment();

// Combinar diccionario de palabras y frases
const completeSpanishDict = { ...spanishSentimentDict, ...spanishPhrases };

// Configurar idioma español con el formato correcto
const spanishLanguage = {
  labels: completeSpanishDict
};

// Registrar diccionario español completo
sentiment.registerLanguage('es', spanishLanguage);

console.log(`📚 Diccionario cargado: ${Object.keys(completeSpanishDict).length} palabras/frases en español`);

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
let userCustomDict = {};
const USER_DICT_FILE = path.join(__dirname, 'user-dictionary.json');

// Cargar diccionario personalizado si existe
function loadUserDictionary() {
  try {
    if (fs.existsSync(USER_DICT_FILE)) {
      const data = fs.readFileSync(USER_DICT_FILE, 'utf8');
      userCustomDict = JSON.parse(data);
      console.log(`📝 Diccionario personalizado cargado: ${Object.keys(userCustomDict).length} palabras`);
      
      // Registrar diccionario combinado
      const combinedDict = { ...completeSpanishDict, ...userCustomDict };
      sentiment.registerLanguage('es', { labels: combinedDict });
    }
  } catch (error) {
    console.error('Error cargando diccionario personalizado:', error);
    userCustomDict = {};
  }
}

// Guardar diccionario personalizado
function saveUserDictionary() {
  try {
    fs.writeFileSync(USER_DICT_FILE, JSON.stringify(userCustomDict, null, 2));
    console.log('💾 Diccionario personalizado guardado');
  } catch (error) {
    console.error('Error guardando diccionario personalizado:', error);
  }
}

// Cargar al iniciar
loadUserDictionary();

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

    // Leer archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

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
      const textFields = Object.values(row).filter(value => 
        typeof value === 'string' && value.trim().length > 5
      );
      
      let sentimentResults = [];
      let overallScore = 0;
      let overallComparative = 0;

      textFields.forEach(text => {
        // Análisis mejorado con preprocesamiento
        const enhancedAnalysis = analyzeTextEnhanced(text);
        
        // Limitar el texto para reducir memoria
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        
        sentimentResults.push({
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

      return {
        id: index + 1,
        originalData: row,
        sentiment: {
          overallScore: overallScore,
          overallComparative: overallComparative,
          classification: getClassification(overallScore, averageConfidence),
          confidence: Math.round(averageConfidence * 100) / 100,
          details: sentimentResults
        }
      };
    });

    // Estadísticas generales
    const stats = calculateStats(results);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalResponses: results.length,
      statistics: stats,
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

    // Leer archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

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
    console.log(`🔄 Procesando ${jsonData.length} registros con ${engine}...`);

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Progreso cada 500 registros
      if (i % 500 === 0 && i > 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }

      const textFields = Object.values(row).filter(value => 
        typeof value === 'string' && value.trim().length > 5
      );
      
      let sentimentResults = [];
      let overallScore = 0;
      let overallComparative = 0;

      for (const text of textFields) {
        let analysis;
        
        // Análisis según motor seleccionado
        switch (engine) {
          case 'natural':
            analysis = analyzeTextEnhanced(text);
            break;
          case 'nlpjs':
            analysis = await analyzeWithNLPjs(text);
            break;
          default:
            analysis = analyzeTextEnhanced(text); // Fallback a Natural.js
        }
        
        // Limitar el texto para reducir memoria
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        
        // Manejar valores de análisis de forma segura
        const safeScore = typeof analysis.score === 'number' ? analysis.score : 5;
        const safeComparative = typeof analysis.comparative === 'number' ? analysis.comparative : 0;
        const safeConfidence = typeof analysis.confidence === 'number' ? analysis.confidence : 0.5;
        
        sentimentResults.push({
          text: limitedText,
          score: safeScore,
          comparative: safeComparative,
          positive: Array.isArray(analysis.positive) ? analysis.positive.slice(0, 5) : [],
          negative: Array.isArray(analysis.negative) ? analysis.negative.slice(0, 5) : [],
          classification: analysis.classification || 'Neutral',
          confidence: safeConfidence,
          engine: analysis.engine || engine
        });

        overallScore += safeScore;
        overallComparative += safeComparative;
      }

      if (sentimentResults.length > 0) {
        overallComparative = overallComparative / sentimentResults.length;
      }

      const averageScore = sentimentResults.length > 0 
        ? overallScore / sentimentResults.length 
        : 5;
      
      const averageConfidence = sentimentResults.length > 0 
        ? sentimentResults.reduce((sum, r) => sum + (typeof r.confidence === 'number' ? r.confidence : 0.5), 0) / sentimentResults.length 
        : 0.5;

      // Asegurar que los valores sean números válidos antes de usar toFixed
      const safeAverageScore = typeof averageScore === 'number' && !isNaN(averageScore) ? averageScore : 5;
      const safeOverallComparative = typeof overallComparative === 'number' && !isNaN(overallComparative) ? overallComparative : 0;
      const safeAverageConfidence = typeof averageConfidence === 'number' && !isNaN(averageConfidence) ? averageConfidence : 0.5;

      results.push({
        row: i + 1,
        ...row,
        sentiment: {
          score: parseFloat(safeAverageScore.toFixed(2)),
          comparative: parseFloat(safeOverallComparative.toFixed(4)),
          confidence: parseFloat(safeAverageConfidence.toFixed(2)),
          engine: engine,
          details: sentimentResults
        }
      });
    }

    console.log(`✅ Análisis completado con ${engine}`);

    const stats = calculateStats(results);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalResponses: results.length,
      engine: engine,
      statistics: stats,
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

    // Leer archivo Excel
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

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
      
      // Progreso cada 500 registros
      if (i % 500 === 0 && i > 0) {
        console.log(`📈 Progreso: ${i}/${jsonData.length} (${Math.round(i/jsonData.length*100)}%)`);
      }

      const textFields = Object.values(row).filter(value => 
        typeof value === 'string' && value.trim().length > 5
      );
      
      let dualAnalysis = {
        natural: [],
        nlpjs: [],
        consensus: []
      };
      let overallScore = 0;
      let overallComparative = 0;
      let analysisCount = 0;

      for (const text of textFields) {
        // Análisis con ambos motores
        const [naturalResult, nlpResult] = await Promise.all([
          Promise.resolve(analyzeTextEnhanced(text)),
          analyzeWithNLPjs(text)
        ]);
        
        // Limitar el texto para reducir memoria
        const limitedText = text.length > 200 ? text.substring(0, 200) + '...' : text;
        
        // Determinar consenso
        const consensus = determineConsensus(naturalResult, nlpResult);
        
        dualAnalysis.natural.push({
          text: limitedText,
          score: naturalResult.score || 5,
          classification: naturalResult.classification || 'Neutral',
          confidence: naturalResult.confidence || 0.5
        });
        
        dualAnalysis.nlpjs.push({
          text: limitedText,
          score: nlpResult.score || 5,
          classification: nlpResult.classification || 'Neutral',
          confidence: nlpResult.confidence || 0.5
        });
        
        dualAnalysis.consensus.push({
          text: limitedText,
          classification: consensus,
          naturalScore: naturalResult.score || 5,
          nlpScore: nlpResult.score || 5,
          averageScore: ((naturalResult.score || 5) + (nlpResult.score || 5)) / 2
        });

        overallScore += ((naturalResult.score || 5) + (nlpResult.score || 5)) / 2;
        overallComparative += ((naturalResult.comparative || 0) + (nlpResult.comparative || 0)) / 2;
        analysisCount++;
      }

      const averageScore = analysisCount > 0 ? overallScore / analysisCount : 5;
      const averageComparative = analysisCount > 0 ? overallComparative / analysisCount : 0;

      results.push({
        row: i + 1,
        ...row,
        sentiment: {
          score: parseFloat(averageScore.toFixed(2)),
          comparative: parseFloat(averageComparative.toFixed(4)),
          confidence: 0.8, // Mayor confianza por usar ambos motores
          engine: 'both',
          dualAnalysis: dualAnalysis
        }
      });
    }

    console.log(`✅ Análisis dual completado`);

    const stats = calculateStats(results);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      totalResponses: results.length,
      engine: 'both',
      statistics: stats,
      results: results
    });

  } catch (error) {
    console.error('Error procesando archivo con análisis dual:', error);
    res.status(500).json({ error: 'Error procesando el archivo Excel: ' + error.message });
  }
});

// Función de análisis de sentimientos mejorada
function analyzeTextEnhanced(text) {
  // Normalizar texto
  const normalizedText = text.toLowerCase().trim();
  
  // Detectar negaciones
  const hasNegation = negationWords.some(neg => normalizedText.includes(neg));
  
  // Análisis base con sentiment usando diccionario español
  let analysis = sentiment.analyze(normalizedText, { language: 'es' });
  
  // Si no se encontraron palabras con el diccionario español, usar análisis estándar
  if (analysis.score === 0 && analysis.positive.length === 0 && analysis.negative.length === 0) {
    analysis = sentiment.analyze(normalizedText);
  }
  
  // Análisis de intensificadores
  const intensityScore = analyzeIntensity(normalizedText);
  
  // Análisis adicional con patrones complejos
  const patternScore = analyzeAdvancedPatterns(normalizedText);
  
  // Combinar scores
  let finalScore = analysis.score + patternScore;
  let finalComparative = analysis.comparative;
  
  // Aplicar modificadores de intensidad
  if (intensityScore !== 1) {
    finalScore = finalScore * intensityScore;
    finalComparative = finalComparative * intensityScore;
  }
  
  // Ajustar por negación
  if (hasNegation && Math.abs(finalScore) > 0) {
    finalScore = finalScore * -0.8; // Invertir por negación
  }
  
  // Calcular confianza mejorada
  const totalWords = normalizedText.split(/\s+/).length;
  const recognizedWords = analysis.positive.length + analysis.negative.length;
  const phraseMatches = countPhraseMatches(normalizedText);
  const confidence = Math.min(1, ((recognizedWords + phraseMatches) / totalWords) + 0.2);
  
  // Convertir score a escala 0-10 para clasificación
  const normalizedScore = (finalScore + 5) * 1; // Ajustar rango
  const classification = getClassification(normalizedScore, confidence);
  
  return {
    score: normalizedScore,
    comparative: Math.round(finalComparative * 100) / 100,
    positive: analysis.positive,
    negative: analysis.negative,
    confidence: Math.round(confidence * 100) / 100,
    classification: classification,
    hasNegation,
    intensity: intensityScore
  };
}

// Función para analizar intensificadores
function analyzeIntensity(text) {
  let maxIntensity = 1;
  
  for (const [modifier, multiplier] of Object.entries(intensityModifiers)) {
    if (text.includes(modifier)) {
      maxIntensity = Math.max(maxIntensity, multiplier);
    }
  }
  
  return maxIntensity;
}

// Función para contar frases reconocidas
function countPhraseMatches(text) {
  let count = 0;
  
  for (const phrase of Object.keys(spanishPhrases)) {
    if (text.includes(phrase)) {
      count++;
    }
  }
  
  return count;
}

// Función para patrones avanzados
function analyzeAdvancedPatterns(text) {
  let score = 0;
  
  // Patrones de contexto específicos
  const contextPatterns = [
    // Patrones muy positivos
    { pattern: /mejor\s+de\s+lo\s+esperado/g, score: 3 },
    { pattern: /superó\s+mis\s+expectativas/g, score: 4 },
    { pattern: /sin\s+ningún\s+problema/g, score: 2 },
    { pattern: /funcionó\s+perfecto/g, score: 3 },
    { pattern: /calidad\s+precio/g, score: 2 },
    { pattern: /muy\s+satisfecho/g, score: 3 },
    
    // Patrones negativos
    { pattern: /peor\s+de\s+lo\s+esperado/g, score: -3 },
    { pattern: /no\s+cumplió\s+expectativas/g, score: -3 },
    { pattern: /lleno\s+de\s+bugs/g, score: -4 },
    { pattern: /completamente\s+inútil/g, score: -4 },
    { pattern: /perdí\s+mi\s+tiempo/g, score: -3 },
    { pattern: /no\s+volvería\s+a\s+usar/g, score: -3 }
  ];
  
  contextPatterns.forEach(({ pattern, score: patternScore }) => {
    const matches = text.match(pattern);
    if (matches) {
      score += matches.length * patternScore;
    }
  });
  
  return score;
}

// Función para clasificar sentimiento mejorada
function getClassification(score, confidence = 0.5) {
  // Ajustar umbrales basados en la confianza
  const multiplier = confidence > 0.7 ? 1 : 1.2; // Ser más conservador con baja confianza
  
  if (score > (3 * multiplier)) return 'Muy Positivo';
  if (score > (1 * multiplier)) return 'Positivo';
  if (score >= (-1 * multiplier) && score <= (1 * multiplier)) return 'Neutral';
  if (score > (-3 * multiplier)) return 'Negativo';
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
      // Determinar clasificación basada en el score
      const score = typeof result.sentiment.score === 'number' ? result.sentiment.score : 5;
      let classification = 'Neutral';
      
      if (score >= 7) classification = 'Muy Positivo';
      else if (score >= 5.5) classification = 'Positivo';
      else if (score <= 3) classification = 'Muy Negativo';
      else if (score <= 4.5) classification = 'Negativo';
      
      classifications[classification]++;
      totalScore += score;
      totalComparative += (typeof result.sentiment.comparative === 'number' ? result.sentiment.comparative : 0);
      validResults++;
    }
  });

  const averageScore = validResults > 0 ? totalScore / validResults : 5;
  const averageComparative = validResults > 0 ? totalComparative / validResults : 0;
  const totalResults = validResults > 0 ? validResults : 1; // Evitar división por cero

  return {
    classifications: classifications,
    averageScore: parseFloat(averageScore.toFixed(2)),
    averageComparative: parseFloat(averageComparative.toFixed(4)),
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
      res.setHeader('Content-Type', 'application/json');
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
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

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
      const textFields = Object.keys(row).filter(key => 
        typeof row[key] === 'string' && row[key].trim().length > 5
      );

      if (textFields.length > 0) {
        result.sentimentAnalysis = {};
        
        // Intentar identificar comentarios específicos
        const materiaField = textFields.find(field => 
          field.toLowerCase().includes('materia') || 
          field.toLowerCase().includes('asignatura') || 
          field.toLowerCase().includes('curso')
        );
        
        const docenteField = textFields.find(field => 
          field.toLowerCase().includes('docente') || 
          field.toLowerCase().includes('profesor') || 
          field.toLowerCase().includes('teacher')
        );

        // Analizar comentario de materia
        if (materiaField && row[materiaField]) {
          const materiaText = row[materiaField];
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
        if (docenteField && row[docenteField]) {
          const docenteText = row[docenteField];
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
        if (!materiaField && !docenteField && textFields.length > 0) {
          const mainText = row[textFields[0]];
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
    const combinedDict = { ...completeSpanishDict, ...userCustomDict };
    const dictionaryData = Object.entries(combinedDict).map(([word, score]) => ({
      word: word,
      score: score,
      type: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
      origin: userCustomDict.hasOwnProperty(word) ? 'user' : 'default'
    }));
    
    res.json({
      success: true,
      dictionary: dictionaryData,
      stats: {
        total: dictionaryData.length,
        positive: dictionaryData.filter(item => item.type === 'positive').length,
        negative: dictionaryData.filter(item => item.type === 'negative').length,
        neutral: dictionaryData.filter(item => item.type === 'neutral').length,
        user: dictionaryData.filter(item => item.origin === 'user').length
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
    
    const normalizedWord = word.toLowerCase().trim();
    const numericScore = parseFloat(score);
    
    if (isNaN(numericScore) || numericScore < -5 || numericScore > 5) {
      return res.status(400).json({ error: 'La puntuación debe ser un número entre -5 y 5' });
    }
    
    // Agregar al diccionario personalizado
    userCustomDict[normalizedWord] = numericScore;
    
    // Actualizar diccionario en sentiment
    const combinedDict = { ...completeSpanishDict, ...userCustomDict };
    sentiment.registerLanguage('es', { labels: combinedDict });
    
    // Guardar en archivo
    saveUserDictionary();
    
    res.json({
      success: true,
      message: `Palabra "${normalizedWord}" agregada con puntuación ${numericScore}`,
      word: normalizedWord,
      score: numericScore
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
    
    if (userCustomDict.hasOwnProperty(word)) {
      delete userCustomDict[word];
      
      // Actualizar diccionario en sentiment
      const combinedDict = { ...completeSpanishDict, ...userCustomDict };
      sentiment.registerLanguage('es', { labels: combinedDict });
      
      // Guardar en archivo
      saveUserDictionary();
      
      res.json({
        success: true,
        message: `Palabra "${word}" eliminada del diccionario personalizado`
      });
    } else {
      res.status(404).json({ error: 'Palabra no encontrada en diccionario personalizado' });
    }
    
  } catch (error) {
    console.error('Error eliminando palabra:', error);
    res.status(500).json({ error: 'Error eliminando palabra del diccionario' });
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
    const exportData = {
      timestamp: new Date().toISOString(),
      version: "1.0",
      customDictionary: userCustomDict,
      stats: {
        totalWords: Object.keys(userCustomDict).length,
        positiveWords: Object.values(userCustomDict).filter(score => score > 0).length,
        negativeWords: Object.values(userCustomDict).filter(score => score < 0).length,
        neutralWords: Object.values(userCustomDict).filter(score => score === 0).length
      }
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=diccionario-personalizado.json');
    res.json(exportData);
    
  } catch (error) {
    console.error('Error exportando diccionario:', error);
    res.status(500).json({ error: 'Error exportando diccionario' });
  }
});

// Importar diccionario personalizado
app.post('/api/dictionary/import', upload.single('dictionaryFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }
    
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const importedData = JSON.parse(fileContent);
    
    if (importedData.customDictionary && typeof importedData.customDictionary === 'object') {
      // Validar datos importados
      const validEntries = {};
      for (const [word, score] of Object.entries(importedData.customDictionary)) {
        const numScore = parseFloat(score);
        if (!isNaN(numScore) && numScore >= -5 && numScore <= 5) {
          validEntries[word.toLowerCase().trim()] = numScore;
        }
      }
      
      // Combinar con diccionario existente
      userCustomDict = { ...userCustomDict, ...validEntries };
      
      // Actualizar diccionario en sentiment
      const combinedDict = { ...completeSpanishDict, ...userCustomDict };
      sentiment.registerLanguage('es', { labels: combinedDict });
      
      // Guardar en archivo
      saveUserDictionary();
      
      // Limpiar archivo temporal
      fs.unlinkSync(req.file.path);
      
      res.json({
        success: true,
        message: `${Object.keys(validEntries).length} palabras importadas exitosamente`,
        importedCount: Object.keys(validEntries).length
      });
    } else {
      res.status(400).json({ error: 'Formato de archivo inválido' });
    }
    
  } catch (error) {
    console.error('Error importando diccionario:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Error importando diccionario' });
  }
});

// Restaurar diccionario original
app.post('/api/dictionary/reset', (req, res) => {
  try {
    userCustomDict = {};
    
    // Restaurar diccionario original en sentiment
    sentiment.registerLanguage('es', { labels: completeSpanishDict });
    
    // Eliminar archivo de diccionario personalizado
    if (fs.existsSync(USER_DICT_FILE)) {
      fs.unlinkSync(USER_DICT_FILE);
    }
    
    res.json({
      success: true,
      message: 'Diccionario restaurado a configuración original'
    });
    
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

// Endpoint para obtener lista de motores disponibles (solo efectivos para español)
app.get('/api/engines', (req, res) => {
  try {
    const engines = [
      {
        id: 'natural',
        name: 'Natural.js Enhanced',
        description: 'Motor especializado en español con diccionario extendido de 894+ palabras/frases',
        language: 'Español nativo',
        type: 'JavaScript',
        features: ['Diccionario 894+ palabras', 'Frases contextuales', 'Intensificadores', 'Negaciones', 'Personalizable'],
        status: 'available',
        responseTime: 'Muy rápido (~5ms)',
        effectiveness: 'Excelente para español',
        recommended: true
      },
      {
        id: 'nlpjs',
        name: 'NLP.js (AXA)',
        description: 'Motor avanzado de AXA Group con soporte nativo para español y múltiples características NLP',
        language: 'Español nativo + multi-idioma',
        type: 'JavaScript',
        features: ['Soporte nativo español', 'Multi-idioma', 'NLU avanzado', 'Sentiment analysis', 'Entity recognition'],
        status: 'available',
        responseTime: 'Rápido (~15ms)',
        effectiveness: 'Muy bueno para español',
        recommended: true
      }
    ];
    
    res.json({
      success: true,
      engines: engines,
      total: engines.length,
      available: engines.filter(e => e.status === 'available').length,
      pythonRequired: engines.filter(e => e.status === 'requires_python').length
    });
    
  } catch (error) {
    console.error('Error obteniendo motores:', error);
    res.status(500).json({ error: 'Error obteniendo lista de motores' });
  }
});

// Endpoint para verificar estado de Python
app.get('/api/python-status', (req, res) => {
  const { exec } = require('child_process');
  
  exec('python --version', (error, stdout, stderr) => {
    if (error) {
      res.json({
        available: false,
        error: 'Python no encontrado',
        message: 'Ejecuta install-python.ps1 para instalar Python y dependencias'
      });
    } else {
      // Verificar dependencias
      const packages = ['textblob', 'vaderSentiment', 'spacy'];
      let packagesChecked = 0;
      const packageStatus = {};
      
      packages.forEach(pkg => {
        exec(`python -c "import ${pkg}; print('${pkg}:OK')"`, (err, out) => {
          packageStatus[pkg] = !err;
          packagesChecked++;
          
          if (packagesChecked === packages.length) {
            res.json({
              available: true,
              version: stdout.trim(),
              packages: packageStatus,
              allPackagesAvailable: Object.values(packageStatus).every(status => status)
            });
          }
        });
      });
    }
  });
});

module.exports = app;