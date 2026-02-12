const http = require('http');

const phrases = [
  "excelente profesora . nada que decir",
  "Mi experiencia fue excepcional, la docente es muy paciente y tiene gusto en ensenar a los alumnos, es didactica, respetuosa y sin dudas una de las mejores docentes que ya tuve.",
  "Professora mucho humana e professional, mucho dispuesta e aberta para ayudar los alumnos en sus dudas. Nota 10.",
  "#Vani y yani son de las mejores docentes que tiene la facultad, cursar con ellas una materia, que en lo personal, se me dificulta y no esta dentro de mis posibilidades hacerla, fue una experiencia hermosa. La cursada fue espléndida en todos los aspectos"
];

async function testPhrase(phrase, index) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FRASE ${index + 1}:`);
  console.log(`"${phrase}"`);
  console.log(`${'='.repeat(80)}`);
  
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
          
          if (result.success) {
            console.log(`\n📊 RESULTADOS:`);
            console.log(`   Score RAW: ${result.analysis.score}`);
            console.log(`   Score Normalizado: ${result.analysis.normalizedScore}`);
            console.log(`   Clasificación: ${result.classification}`);
            console.log(`   Confianza: ${(result.analysis.confidence * 100).toFixed(1)}%`);
            
            if (result.analysis.positive && result.analysis.positive.length > 0) {
              console.log(`\n✅ Palabras/Frases POSITIVAS encontradas:`);
              result.analysis.positive.forEach(word => console.log(`   + ${word}`));
            }
            
            if (result.analysis.negative && result.analysis.negative.length > 0) {
              console.log(`\n❌ Palabras/Frases NEGATIVAS encontradas:`);
              result.analysis.negative.forEach(word => console.log(`   - ${word}`));
            }
            
            if (result.analysis.neutral && result.analysis.neutral.length > 0) {
              console.log(`\n⚪ Palabras NEUTRALES:`);
              result.analysis.neutral.forEach(word => console.log(`   • ${word}`));
            }
            
            // Análisis del problema
            console.log(`\n🔍 DIAGNÓSTICO:`);
            const scoreRaw = result.analysis.score;
            const normalized = result.analysis.normalizedScore;
            const classification = result.classification;
            
            const expectedPositive = phrase.includes('excelente') || phrase.includes('excepcional') || 
                                     phrase.includes('mejores') || phrase.includes('espléndida') ||
                                     phrase.includes('hermosa');
            
            if (expectedPositive && normalized < 6) {
              console.log(`   ⚠️ PROBLEMA: Frase claramente positiva clasificada como ${classification}`);
              console.log(`   ⚠️ Score muy bajo (${normalized}) para contenido positivo`);
              
              // Buscar negaciones
              const negationWords = ['nada', 'no', 'nunca', 'jamás', 'ningún', 'ninguna', 'sin', 'ni'];
              const foundNegations = negationWords.filter(neg => phrase.toLowerCase().includes(neg));
              
              if (foundNegations.length > 0) {
                console.log(`   ⚠️ Posible falsa NEGACIÓN detectada: ${foundNegations.join(', ')}`);
              }
              
              // Buscar palabras problemáticas
              if (phrase.toLowerCase().includes('dificulta')) {
                console.log(`   ⚠️ Palabra negativa "dificulta" detectada (puede invertir score)`);
              }
              
              if (phrase.toLowerCase().includes('nada')) {
                console.log(`   ⚠️ "nada" puede estar invirtiendo palabras positivas`);
              }
            } else {
              console.log(`   ✅ Clasificación correcta`);
            }
            
          } else {
            console.error(`Error: ${result.error}`);
          }
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

async function main() {
  console.log('\n🧪 ANÁLISIS DE FRASES PROBLEMÁTICAS\n');
  
  for (let i = 0; i < phrases.length; i++) {
    await testPhrase(phrases[i], i);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Análisis completado\n');
}

main();
