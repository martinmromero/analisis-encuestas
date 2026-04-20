const fs = require('fs');
const path = require('path');

// Test local para verificar el fix
const testCases = [
    {
        texto: "poco productiva, limitada y deficiente",
        esperado: "Muy Negativo (solo negativas)"
    },
    {
        texto: "sin embargo, su forma es poco productiva, limitada y deficiente",
        esperado: "Muy Negativo (negativas + 'sin embargo')"
    },
    {
        texto: "Confusa, desorganizada, lo que fue ensinado en clases estuvo alejado de lo cobrado en exámenes. La docente es simpática y educada, sin embargo, su forma de transmitir conocimento es poco productiva, limitada y deficiente",
        esperado: "Negativo (mezcla con mayoría negativa)"
    },
    {
        texto: "excelente profesora sin dudas",
        esperado: "Muy Positivo (positivas + 'sin')"
    },
    {
        texto: "no es mala",
        esperado: "Positivo (negación de negativo)"
    }
];

// Cargar diccionario
const dictPath = path.join(__dirname, 'dictionaries', 'Diccionario_de_sentimientos_06_02_2026_v4.json');
let sentimentDict = {};

try {
    const dictData = fs.readFileSync(dictPath, 'utf8');
    const parsed = JSON.parse(dictData);
    sentimentDict = parsed.dictionary || parsed.palabras || parsed;
    console.log(`✅ Diccionario cargado: ${Object.keys(sentimentDict).length} palabras/frases\n`);
} catch (error) {
    console.error('❌ Error cargando diccionario:', error.message);
    process.exit(1);
}

// Función auxiliar para escapar regex
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Función de análisis (versión FIXED - SIN inversión global)
function analyzeTextFixed(text) {
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

    for (const phrase of phrases) {
        const phraseRegex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, 'gi');
        const matches = [...text.toLowerCase().matchAll(phraseRegex)];
        
        if (matches.length > 0) {
            const phraseTokens = phrase.split(/\s+/);
            matches.forEach(() => {
                const value = sentimentDict[phrase];
                rawScore += value;
                matchedWords.push({ word: phrase, value, type: 'phrase' });
                
                // Marcar tokens como usados
                phraseTokens.forEach(ptoken => {
                    const idx = tokens.indexOf(ptoken.toLowerCase());
                    if (idx !== -1) usedTokenIndices.add(idx);
                });
            });
        }
    }

    // Buscar palabras individuales
    const singleWords = dictKeys.filter(key => !key.includes(' '));

    tokens.forEach((token, index) => {
        if (usedTokenIndices.has(index)) return;
        
        if (sentimentDict[token] !== undefined) {
            const value = sentimentDict[token];
            
            // Detectar negación SOLO para la palabra siguiente
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
        }
    });

    // Calcular score normalizado
    const limitedScore = Math.max(-10, Math.min(10, rawScore));
    const normalizedScore = (limitedScore + 10) / 2;
    
    const confidence = totalWords > 0 ? matchedWords.length / totalWords : 0;

    // Clasificación
    let classification;
    if (confidence === 0) {
        classification = 'No clasificado';
    } else if (normalizedScore >= 8) {
        classification = 'Muy Positivo';
    } else if (normalizedScore >= 6) {
        classification = 'Positivo';
    } else if (normalizedScore >= 4) {
        classification = 'Neutral';
    } else if (normalizedScore >= 2) {
        classification = 'Negativo';
    } else {
        classification = 'Muy Negativo';
    }

    return {
        rawScore,
        limitedScore,
        normalizedScore,
        classification,
        matchedWords,
        totalWords,
        confidence
    };
}

console.log('🧪 TEST DEL FIX - Sin inversión global de score\n');
console.log('='.repeat(80) + '\n');

testCases.forEach((test, idx) => {
    console.log(`${idx + 1}. "${test.texto}"`);
    console.log(`   Esperado: ${test.esperado}`);
    
    const result = analyzeTextFixed(test.texto);
    
    console.log(`   ✅ Score: ${result.rawScore > 0 ? '+' : ''}${result.rawScore} → Normalizado: ${result.normalizedScore.toFixed(1)} → ${result.classification}`);
    console.log(`   📊 Palabras: ${result.matchedWords.filter(m => m.value > 0).length} positivas, ${result.matchedWords.filter(m => m.value < 0).length} negativas`);
    console.log('');
});

console.log('='.repeat(80));
