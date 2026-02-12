const fs = require('fs');
const path = require('path');

// Cargar diccionario actualizado (11_02_2026 con 1823 palabras)
const dictionaryPath = path.join(__dirname, 'dictionaries', 'Diccionario_de_sentimientos_11_02_2026.json');
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

// Función de análisis mejorada
function analyzeTextEnhanced(text) {
  const normalizedText = removeAccents(text.toLowerCase().trim());
  
  console.log(`[DEBUG] Texto original: "${text}"`);
  console.log(`[DEBUG] Texto normalizado: "${normalizedText}"`);
  
  const tokens = normalizedText.split(/[^a-zA-Záéíóúüñ0-9]+/).filter(t => t.length > 0);
  const tokenSet = new Set(tokens);
  
  console.log(`[DEBUG] Tokens:`, tokens);
  
  // FIX: Usar word boundaries para evitar detectar negaciones dentro de otras palabras
  // Ejemplo: "ni" NO debe detectarse en "orga-NI-zacionales"
  let detectedNegations = [];
  for (const neg of negationWords) {
    const regex = new RegExp(`\\b${escapeRegex(neg)}\\b`, 'i');
    if (regex.test(normalizedText)) {
      detectedNegations.push(neg);
      console.log(`[DEBUG] ⚠️ NEGACIÓN DETECTADA: "${neg}"`);
    }
  }
  const hasNegation = detectedNegations.length > 0;
  
  console.log(`[DEBUG] ¿Tiene negación?: ${hasNegation}\n`);

  let rawScore = 0;
  const positives = [];
  const negatives = [];
  const neutrals = [];
  const matchedWords = [];
  let matchedCount = 0;

  // Rastrear qué partes del texto ya fueron procesadas como frases
  const usedTokenIndices = new Set();

  // PASO 1: Buscar frases completas primero (tienen prioridad)
  for (const [key, value] of Object.entries(currentLabels)) {
    const normKey = removeAccents(key.toLowerCase().trim());
    if (!normKey) continue;
    
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
        
        console.log(`[DEBUG] ✅ Frase encontrada: "${key}" = ${value > 0 ? '+' : ''}${value} (${count} veces)`);
        
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
      // Buscar palabras individuales solo si no fueron parte de una frase
      if (tokenSet.has(normKey)) {
        const tokenIdx = tokens.indexOf(normKey);
        if (tokenIdx !== -1 && !usedTokenIndices.has(tokenIdx)) {
          rawScore += value;
          matchedCount += 1;
          matchedWords.push({ word: key, value: value, count: 1 });
          
          if (value > 0.5) positives.push(key);
          else if (value < -0.5) negatives.push(key);
          else neutrals.push(key);
          
          console.log(`[DEBUG] ✅ Palabra encontrada: "${key}" = ${value > 0 ? '+' : ''}${value}`);
        } else if (usedTokenIndices.has(tokenIdx)) {
          console.log(`[DEBUG] ⏭️  Palabra "${key}" omitida (ya contada en frase)`);
        }
      }
    }
  }

  // Aplicar inversión de negación (IGUAL QUE EL SERVIDOR)
  console.log(`\n[DEBUG] Score ANTES de negación: ${rawScore > 0 ? '+' : ''}${rawScore}`);
  let finalScore = rawScore;
  if (hasNegation && rawScore !== 0) {
    finalScore = -rawScore;
    console.log(`[DEBUG] ⚠️ Score INVERTIDO por negación: ${finalScore > 0 ? '+' : ''}${finalScore}`);
  } else {
    console.log(`[DEBUG] Score mantenido (sin negación): ${finalScore > 0 ? '+' : ''}${finalScore}`);
  }
  console.log('');

  const totalWords = tokens.length;
  const confidence = totalWords > 0 ? Math.min(1, matchedCount / totalWords) : 0;
  const comparative = totalWords > 0 ? finalScore / totalWords : 0;

  // Normalizar a escala 0-10
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
    hasNegation: hasNegation,
    detectedNegations: detectedNegations
  };
}

// Frase a analizar
const phrase = "De una es una de las mejores cursadas que ay en la facultad, el practico es el mejor que ay. buenos doctores";

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

if (result.detectedNegations.length > 0) {
  console.log(`\n⚠️  Palabras de negación detectadas: ${result.detectedNegations.join(', ')}`);
  console.log(`   ⚡ El score fue INVERTIDO de acuerdo al algoritmo del servidor`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('📐 FÓRMULA DE NORMALIZACIÓN:');
console.log('═══════════════════════════════════════════════════════════════\n');

const limitedScore = Math.max(-10, Math.min(10, result.rawScore));
console.log(`Score RAW: ${result.rawScore > 0 ? '+' : ''}${result.rawScore}`);
console.log(`Score RAW limitado a [-10, +10]: ${limitedScore > 0 ? '+' : ''}${limitedScore}`);
console.log(`Fórmula: (${limitedScore} + 10) ÷ 2 = ${result.normalizedScore}\n`);

console.log('Escala de clasificación:');
console.log('  • 8.0 - 10.0 → Muy Positivo');
console.log('  • 6.0 - 7.9  → Positivo');
console.log('  • 4.0 - 5.9  → Neutral');
console.log('  • 2.0 - 3.9  → Negativo');
console.log('  • 0.0 - 1.9  → Muy Negativo\n');

console.log('═══════════════════════════════════════════════════════════════\n');

// Mostrar interpretación
console.log('📝 INTERPRETACIÓN:\n');
console.log('La frase expresa un sentimiento MIXTO:');
console.log('  ✓ Parte positiva: "profesional increíble" (elogio)');
console.log('  ✗ Parte negativa: "temas organizacionales que dejan a desear"');
console.log('  ⚖️  Matiz: "pero son cosas que pueden pasar" (atenuante)\n');
console.log('El análisis detectó las palabras positivas del diccionario,');
console.log('resultando en un sentimiento general ' + result.classification.toUpperCase() + '.\n');
console.log('═══════════════════════════════════════════════════════════════\n');
