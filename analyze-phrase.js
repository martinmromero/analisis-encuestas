const fs = require('fs');
const path = require('path');

// Cargar diccionario v4
const dictionaryPath = path.join(__dirname, 'dictionaries', 'Diccionario_Sentimientos_v4.json');
const dictionaryData = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
const currentLabels = dictionaryData.dictionary;

// Palabras de negación
const negationWords = ['no', 'nunca', 'jamás', 'nada', 'ningún', 'ninguna', 'sin', 'ni'];

// Función para remover acentos
function removeAccents(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

// Función para escapar regex
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Función de análisis (basada en analyzeTextEnhanced del servidor)
function analyzeTextEnhanced(text) {
  const normalizedText = removeAccents(text.toLowerCase().trim());
  
  console.log(`[DEBUG] Texto normalizado: "${normalizedText}"`);
  
  const tokens = normalizedText.split(/[^a-zA-Záéíóúüñ0-9]+/).filter(t => t.length > 0);
  console.log(`[DEBUG] Tokens:`, tokens);
  const tokenSet = new Set(tokens);
  const hasNegation = negationWords.some(neg => normalizedText.includes(neg));
  console.log(`[DEBUG] Tiene negación: ${hasNegation}\n`);

  let rawScore = 0;
  const positives = [];
  const negatives = [];
  const neutrals = [];
  const matchedWords = [];
  let matchedCount = 0;

  // Buscar coincidencias en el diccionario
  for (const [key, value] of Object.entries(currentLabels)) {
    const normKey = removeAccents(key.toLowerCase().trim());
    if (!normKey) continue;
    
    // DEBUG: Mostrar palabras clave
    if (key.includes('increíble') || key.includes('increÃ­ble') || normKey.includes('increible')) {
      console.log(`[DEBUG] Diccionario tiene: "${key}" -> normalizado: "${normKey}"`);
    }
    
    if (normKey.includes(' ')) {
      // Buscar frases completas
      if (normalizedText.includes(normKey)) {
        const count = (normalizedText.match(new RegExp(escapeRegex(normKey), 'g')) || []).length;
        rawScore += value * count;
        matchedCount += count;
        matchedWords.push({ word: key, value: value, count: count });
        
        if (value > 0.5) positives.push(key);
        else if (value < -0.5) negatives.push(key);
        else neutrals.push(key);
      }
    } else {
      // Buscar palabras individuales
      if (tokenSet.has(normKey)) {
        rawScore += value;
        matchedCount += 1;
        matchedWords.push({ word: key, value: value, count: 1 });
        
        if (value > 0.5) positives.push(key);
        else if (value < -0.5) negatives.push(key);
        else neutrals.push(key);
      }
    }
  }

  // Aplicar negación si existe
  let finalScore = rawScore;
  if (hasNegation && rawScore !== 0) {
    finalScore = -rawScore;
  }

  const totalWords = tokens.length;
  const confidence = totalWords > 0 ? Math.min(1, matchedCount / totalWords) : 0;
  const comparative = totalWords > 0 ? finalScore / totalWords : 0;

  // Normalizar a escala 0-10
  // Fórmula: (Score limitado a [-10, +10] + 10) ÷ 2
  const limitedScore = Math.max(-10, Math.min(10, finalScore));
  const normalizedScore = (limitedScore + 10) / 2;

  // Clasificación
  let classification = 'Neutral';
  if (normalizedScore >= 8) classification = 'Muy Positivo';
  else if (normalizedScore >= 6) classification = 'Positivo';
  else if (normalizedScore >= 4) classification = 'Neutral';
  else if (normalizedScore >= 2) classification = 'Negativo';
  else classification = 'Muy Negativo';

  return {
    rawScore: finalScore,
    normalizedScore: parseFloat(normalizedScore.toFixed(2)),
    comparative: parseFloat(comparative.toFixed(4)),
    classification: classification,
    confidence: parseFloat(confidence.toFixed(2)),
    matchedWords: matchedWords,
    positiveWords: positives,
    negativeWords: negatives,
    neutralWords: neutrals,
    totalWords: totalWords,
    matchedCount: matchedCount,
    hasNegation: hasNegation
  };
}

// Frase a analizar
const phrase = "Dra. Betina es una profesional increible, siento que hay temas organizacionales que dejan a desear pero son cosas que pueden pasar";

console.log('═══════════════════════════════════════════════════════════════');
console.log('📊 ANÁLISIS DE SENTIMIENTO');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📝 Frase a analizar:');
console.log(`   "${phrase}"\n`);

const result = analyzeTextEnhanced(phrase);

console.log('═══════════════════════════════════════════════════════════════');
console.log('📈 RESULTADOS:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`✨ Valor ABSOLUTO (Score RAW):     ${result.rawScore > 0 ? '+' : ''}${result.rawScore}`);
console.log(`🎯 Valor NORMALIZADO (0-10):       ${result.normalizedScore}`);
console.log(`📊 Clasificación:                  ${result.classification}`);
console.log(`💯 Confianza:                      ${(result.confidence * 100).toFixed(0)}%`);
console.log(`📉 Score Comparativo:              ${result.comparative}\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 DETALLE DEL ANÁLISIS:');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(`📚 Total de palabras:              ${result.totalWords}`);
console.log(`✅ Palabras reconocidas:           ${result.matchedCount}\n`);

if (result.matchedWords.length > 0) {
  console.log('🎯 Palabras encontradas en el diccionario:\n');
  result.matchedWords.forEach(({ word, value, count }) => {
    const sign = value > 0 ? '+' : '';
    const total = value * count;
    const totalSign = total > 0 ? '+' : '';
    console.log(`   • "${word}": ${sign}${value} ${count > 1 ? `× ${count} = ${totalSign}${total}` : ''}`);
  });
  console.log('');
}

if (result.positiveWords.length > 0) {
  console.log(`✅ Palabras positivas: ${result.positiveWords.join(', ')}`);
}
if (result.negativeWords.length > 0) {
  console.log(`❌ Palabras negativas: ${result.negativeWords.join(', ')}`);
}
if (result.neutralWords.length > 0) {
  console.log(`⚪ Palabras neutrales: ${result.neutralWords.join(', ')}`);
}

if (result.hasNegation) {
  console.log(`\n⚠️  NEGACIÓN DETECTADA: El score fue invertido`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📐 FÓRMULA DE NORMALIZACIÓN:');
console.log('═══════════════════════════════════════════════════════════════\n');

const limitedScore = Math.max(-10, Math.min(10, result.rawScore));
console.log(`Score RAW limitado: ${limitedScore > 0 ? '+' : ''}${limitedScore}`);
console.log(`Fórmula: (${limitedScore} + 10) ÷ 2 = ${result.normalizedScore}\n`);

console.log('Escala de clasificación:');
console.log('  • 8.0 - 10.0 → Muy Positivo');
console.log('  • 6.0 - 7.9  → Positivo');
console.log('  • 4.0 - 5.9  → Neutral');
console.log('  • 2.0 - 3.9  → Negativo');
console.log('  • 0.0 - 1.9  → Muy Negativo\n');

console.log('═══════════════════════════════════════════════════════════════\n');
