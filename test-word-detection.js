// Test para verificar detección de negaciones dentro de palabras

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const negationWords = ['no', 'nunca', 'jamás', 'nada', 'ningún', 'ninguna', 'sin', 'ni'];

function testNegationDetection(text) {
  const normalizedText = removeAccents(text.toLowerCase());
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEXTO: "${text}"`);
  console.log(`NORMALIZADO: "${normalizedText}"`);
  console.log(`${'='.repeat(60)}`);
  
  console.log('\n🔍 Detección de negaciones con word boundaries (\\b):');
  negationWords.forEach(neg => {
    const regex = new RegExp(`\\b${escapeRegex(neg)}\\b`, 'i');
    const detected = regex.test(normalizedText);
    if (detected) {
      console.log(`   ❌ "${neg}" DETECTADO en "${text}"`);
    } else {
      console.log(`   ✅ "${neg}" NO detectado`);
    }
  });
  
  // Verificar si alguna negación fue detectada
  const hasNegation = negationWords.some(neg => {
    const regex = new RegExp(`\\b${escapeRegex(neg)}\\b`, 'i');
    return regex.test(normalizedText);
  });
  
  console.log(`\n📊 RESULTADO: ${hasNegation ? '❌ TIENE NEGACIÓN (invertirá score)' : '✅ NO TIENE NEGACIÓN'}`);
}

// Tests específicos
console.log('\n🧪 PRUEBAS DE DETECCIÓN DE NEGACIONES EN PALABRAS\n');

testNegationDetection('vanina');
testNegationDetection('Vanina es excelente');
testNegationDetection('clínico');
testNegationDetection('organizacionales');
testNegationDetection('enosenar'); // enseñar sin tilde
testNegationDetection('tiene gusto en enosenar a los alumnos');
testNegationDetection('ni idea');
testNegationDetection('no puedo');
testNegationDetection('sin dudas');
testNegationDetection('nada que decir');

console.log('\n' + '='.repeat(60));
console.log('✅ Tests completados\n');
