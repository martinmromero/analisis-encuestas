const http = require('http');

const frase = "Mi experiencia fue excepcional, la docente es muy paciente y tiene gusto en ensenar a los alumnos, es didactica, respetuosa y sin dudas una de las mejores docentes que ya tuve.";

function testPhrase(phrase) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ text: phrase });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/dictionary/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          
          console.log('═'.repeat(80));
          console.log('ANÁLISIS DE FRASE');
          console.log('═'.repeat(80));
          console.log(`\nTexto: "${phrase}"`);
          console.log('\n📊 RESULTADOS:');
          console.log(`   Score RAW: ${result.analysis.score}`);
          console.log(`   Score Normalizado: ${result.analysis.normalizedScore}`);
          console.log(`   Clasificación: ${result.classification}`);
          console.log(`   Confianza: ${(result.analysis.confidence * 100).toFixed(1)}%`);
          console.log(`   Comparative: ${result.analysis.comparative}`);
          
          if (result.analysis.positive && result.analysis.positive.length > 0) {
            console.log(`\n✅ Palabras POSITIVAS encontradas (${result.analysis.positive.length}):`);
            result.analysis.positive.forEach(word => console.log(`   + ${word}`));
          }
          
          if (result.analysis.negative && result.analysis.negative.length > 0) {
            console.log(`\n❌ Palabras NEGATIVAS encontradas (${result.analysis.negative.length}):`);
            result.analysis.negative.forEach(word => console.log(`   - ${word}`));
          }
          
          console.log('\n🔍 DIAGNÓSTICO:');
          
          // Buscar negaciones
          const negationWords = ['nada', 'no', 'nunca', 'jamás', 'ningún', 'ninguna', 'sin', 'ni'];
          const textLower = phrase.toLowerCase();
          const foundNegations = negationWords.filter(neg => {
            const regex = new RegExp(`\\b${neg}\\b`, 'i');
            return regex.test(textLower);
          });
          
          if (foundNegations.length > 0) {
            console.log(`   ⚠️ NEGACIONES detectadas: ${foundNegations.join(', ')}`);
            console.log(`   ⚠️ Esto INVIERTE el score de las palabras positivas`);
          }
          
          // Buscar "sin dudas" específicamente
          if (textLower.includes('sin dudas') || textLower.includes('sin duda')) {
            console.log(`   🚨 PROBLEMA: "sin dudas/duda" es una expresión POSITIVA`);
            console.log(`      Pero "sin" se detecta como negación y invierte todo`);
            console.log(`      SOLUCIÓN: Agregar "sin dudas" (+3) como frase al diccionario`);
          }
          
          // Simular cálculo
          const wordsFound = (result.analysis.positive || []).length + (result.analysis.negative || []).length;
          const hasNegation = foundNegations.length > 0;
          
          console.log(`\n📐 CÁLCULO ESTIMADO:`);
          console.log(`   Palabras encontradas: ${wordsFound}`);
          console.log(`   Negación presente: ${hasNegation ? 'SÍ (invierte scores)' : 'NO'}`);
          
          if (hasNegation) {
            console.log(`   \n   Ejemplo: Si encontró "excepcional" (+5):`);
            console.log(`   → Con negación "sin": +5 se convierte en -5`);
            console.log(`   → Todas las palabras positivas se vuelven negativas`);
          }
          
          console.log('\n' + '═'.repeat(80));
          
          resolve();
        } catch (error) {
          console.error(`Error parsing JSON: ${error.message}`);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error en request: ${error.message}`);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

testPhrase(frase).catch(console.error);
