// Test directo contra servidor
const testText = "Confusa, desorganizada, lo que fue ensinado en clases estuvo alejado de lo cobrado en exámenes. La docente es simpática y educada, sin embargo, su forma de transmitir conocimento es poco productiva, limitada y deficiente... Tuve que buscar conocimento por otros medios afuera de la facultad.";

console.log('🧪 TEST: Análisis contra servidor\n');
console.log('📝 Texto:');
console.log(testText);
console.log('\n' + '='.repeat(80) + '\n');

fetch('https://itd.barcelo.edu.ar/api/test-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: testText })
})
.then(res => res.json())
.then(data => {
    console.log('📈 RESULTADO DEL SERVIDOR:\n');
    console.log('Score RAW:', data.score);
    console.log('Score Normalizado:', data.normalizedScore);
    console.log('Clasificación:', data.classification);
    console.log('Confianza:', (data.confidence * 100).toFixed(1) + '%');
    console.log('Tiene negación:', data.hasNegation);
    console.log('Palabras reconocidas:', data.matched, 'de', data.totalWords);
    
    console.log('\nPalabras encontradas:');
    console.log('  ✅ Positivas:', data.positive);
    console.log('  ❌ Negativas:', data.negative);
    console.log('  ⚪ Neutrales:', data.neutral);
})
.catch(err => {
    console.error('❌ Error:', err.message);
});
