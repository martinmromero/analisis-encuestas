const fs = require('fs');
const path = require('path');

// Script para probar análisis de sentimientos mezclados
const testText = "Confusa, desorganizada, lo que fue ensinado en clases estuvo alejado de lo cobrado en exámenes. La docente es simpática y educada, sin embargo, su forma de transmitir conocimento es poco productiva, limitada y deficiente... Tuve que buscar conocimento por otros medios afuera de la facultad.";

console.log('🧪 TEST: Sentimientos mezclados\n');
console.log('📝 Texto a analizar:');
console.log(testText);
console.log('\n' + '='.repeat(80) + '\n');

// Cargar diccionario
const dictPath = path.join(__dirname, 'dictionaries', 'Diccionario_de_sentimientos_06_02_2026_v4.json');
let sentimentDict = {};

try {
    const dictData = fs.readFileSync(dictPath, 'utf8');
    const parsed = JSON.parse(dictData);
    sentimentDict = parsed.dictionary || parsed.palabras || parsed;
    console.log(`✅ Diccionario cargado: ${Object.keys(sentimentDict).length} palabras/frases`);
} catch (error) {
    console.error('❌ Error cargando diccionario:', error.message);
    process.exit(1);
}

// Función auxiliar para escapar regex
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Función de análisis (copiada del servidor)
function analyzeTextEnhanced(text) {
    if (!text || typeof text !== 'string') {
        return { score: 0, classification: 'Neutral', matchedWords: [], totalWords: 0, confidence: 0 };
    }

    const negationWords = ['no', 'nunca', 'jamás', 'nada', 'ningún', 'ninguna', 'sin', 'ni'];
    
    // Tokenizar
    const tokens = text.toLowerCase()
        .replace(/[^\wáéíóúüñ\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0);

    const totalWords = tokens.length;
    let matchedWords = [];
    let rawScore = 0;

    // Buscar frases primero
    const dictKeys = Object.keys(sentimentDict);
    const phrases = dictKeys.filter(key => key.includes(' ')).sort((a, b) => b.length - a.length);
    const usedTokenIndices = new Set();

    console.log(`\n📊 Total palabras en texto: ${totalWords}`);
    console.log(`🔍 Buscando frases (${phrases.length} en diccionario)...\n`);

    for (const phrase of phrases) {
        const phraseRegex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
        const matches = [...text.toLowerCase().matchAll(phraseRegex)];
        
        if (matches.length > 0) {
            const phraseTokens = phrase.split(/\s+/);
            matches.forEach(() => {
                const value = sentimentDict[phrase];
                rawScore += value;
                matchedWords.push({ word: phrase, value, type: 'phrase' });
                console.log(`  ✓ Frase encontrada: "${phrase}" = ${value > 0 ? '+' : ''}${value}`);
                
                // MARCAR TODOS LOS TOKENS DE LA FRASE COMO USADOS
                phraseTokens.forEach(ptoken => {
                    const idx = tokens.indexOf(ptoken.toLowerCase());
                    if (idx !== -1) {
                        usedTokenIndices.add(idx);
                        console.log(`    → Marcado como usado: "${ptoken}" (índice ${idx})`);
                    }
                });
            });
        }
    }

    // Buscar palabras individuales
    const singleWords = dictKeys.filter(key => !key.includes(' '));
    console.log(`\n🔍 Buscando palabras individuales (${singleWords.length} en diccionario)...\n`);

    tokens.forEach((token, index) => {
        if (usedTokenIndices.has(index)) {
            console.log(`  ⏭️  SALTADO: "${token}" (ya usado en frase, índice ${index})`);
            return;
        }
        
        if (sentimentDict[token] !== undefined) {
            const value = sentimentDict[token];
            
            // Detectar negación
            let isNegated = false;
            if (index > 0) {
                const prevToken = tokens[index - 1];
                for (const neg of negationWords) {
                    const negRegex = new RegExp(`\\b${escapeRegex(neg)}\\b`, 'i');
                    if (negRegex.test(prevToken)) {
                        isNegated = true;
                        break;
                    }
                }
            }
            
            const finalValue = isNegated ? -value : value;
            rawScore += finalValue;
            matchedWords.push({ 
                word: token, 
                value: finalValue, 
                originalValue: value,
                negated: isNegated,
                type: 'word' 
            });
            
            console.log(`  ${isNegated ? '⚠️ ' : '✓'} Palabra: "${token}" = ${finalValue > 0 ? '+' : ''}${finalValue}${isNegated ? ' (NEGADA)' : ''}`);
        }
    });

    // Calcular score limitado y normalizado
    // Calcular score limitado y normalizado
    const limitedScore = Math.max(-10, Math.min(10, rawScore));
    const normalizedScore = (limitedScore + 10) / 2;
    
    // DETECTAR NEGACIÓN (como lo hace el servidor)
    const hasNegation = negationWords.some(neg => {
        const regex = new RegExp(`\\b${escapeRegex(neg)}\\b`, 'i');
        return regex.test(text.toLowerCase());
    });
    
    console.log(`\n⚠️  DETECCIÓN DE NEGACIÓN: ${hasNegation ? 'SÍ' : 'NO'}`);
    if (hasNegation) {
        console.log('   Palabras de negación: ' + negationWords.filter(neg => {
            const regex = new RegExp(`\\b${escapeRegex(neg)}\\b`, 'i');
            return regex.test(text.toLowerCase());
        }).join(', '));
    }
    
    // INVERSIÓN DE SCORE (BUG DEL SERVIDOR)
    let finalRawScore = rawScore;
    if (hasNegation && rawScore !== 0) {
        finalRawScore = -rawScore;
        console.log(`   🔄 INVERSIÓN: ${rawScore} → ${finalRawScore}`);
    }
    
    const finalLimitedScore = Math.max(-10, Math.min(10, finalRawScore));
    const finalNormalizedScore = (finalLimitedScore + 10) / 2;
    
    const confidence = totalWords > 0 ? matchedWords.length / totalWords : 0;

    // Clasificación
    let classification;
    if (confidence === 0) {
        classification = 'No clasificado';
    } else if (finalNormalizedScore >= 8) {
        classification = 'Muy Positivo';
    } else if (finalNormalizedScore >= 6) {
        classification = 'Positivo';
    } else if (finalNormalizedScore >= 4) {
        classification = 'Neutral';
    } else if (finalNormalizedScore >= 2) {
        classification = 'Negativo';
    } else {
        classification = 'Muy Negativo';
    }

    return {
        rawScore,
        limitedScore,
        normalizedScore,
        finalRawScore,
        finalLimitedScore,
        finalNormalizedScore,
        hasNegation,
        classification,
        matchedWords,
        totalWords,
        confidence
    };
}

// Ejecutar análisis
const result = analyze (calculado): ${result.rawScore > 0 ? '+' : ''}${result.rawScore}`);
console.log(`Score Limitado: ${result.limitedScore > 0 ? '+' : ''}${result.limitedScore} (rango -10 a +10)`);
console.log(`Score Normalizado: ${result.normalizedScore.toFixed(1)} (rango 0 a 10)`);
console.log('\n⚠️  CON INVERSIÓN POR NEGACIÓN (COMO EL SERVIDOR):');
console.log(`Score RAW (FINAL): ${result.finalRawScore > 0 ? '+' : ''}${result.finalRawScore}`);
console.log(`Score Limitado: ${result.finalLimitedScore > 0 ? '+' : ''}${result.finalLimitedScore} (rango -10 a +10)`);
console.log(`Score Normalizado: ${result.finalNormalizedScore.toFixed(1)} (rango 0 a 10) ← ESTE ES EL QUE VE EL USUARIO`);
console.log(`\n📈 RESULTADOS:\n');
console.log(`Score RAW: ${result.rawScore > 0 ? '+' : ''}${result.rawScore}`);
console.log(`Score Limitado: ${result.limitedScore > 0 ? '+' : ''}${result.limitedScore} (rango -10 a +10)`);
console.log(`Score Normalizado: ${result.normalizedScore.toFixed(1)} (rango 0 a 10)`);
console.log(`Clasificación: ${result.classification}`);
console.log(`Confianza: ${(result.confidence * 100).toFixed(1)}%`);
console.log(`\nPalabras reconocidas: ${result.matchedWords.length} de ${result.totalWords}`);

console.log('\n📋 Detalle de palabras encontradas:');
const positiveMatches = result.matchedWords.filter(m => m.value > 0);
const negativeMatches = result.matchedWords.filter(m => m.value < 0);

console.log(`\n  ✅ Positivas (${positiveMatches.length}):`);
positiveMatches.forEach(m => {
    console.log(`     "${m.word}" = +${m.value}`);
});

console.log(`\n  ❌ Negativas (${negativeMatches.length}):`);
negativeMatches.forEach(m => {
    console.log(`     "${m.word}" = ${m.value}`);
});

console.log('\n' + '='.repeat(80));
