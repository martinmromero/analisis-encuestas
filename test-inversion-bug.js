// Test simple para demostrar el bug de inversión de score

const testCases = [
    {
        texto: "Confusa, desorganizada, lo que fue ensinado en clases estuvo alejado de lo cobrado en exámenes. La docente es simpática y educada, sin embargo, su forma de transmitir conocimento es poco productiva, limitada y deficiente... Tuve que buscar conocimento por otros medios afuera de la facultad.",
        esperado: "Negativo (tiene más palabras negativas que positivas)",
        problema: "Contiene 'sin' (en 'sin embargo') que invierte TODO el score"
    },
    {
        texto: "Excelente profesora, muy clara",
        esperado: "Muy Positivo",
        problema: "Sin negaciones - debería funcionar bien"
    },
    {
        texto: "Excelente profesora sin dudas",
        esperado: "Muy Positivo", 
        problema: "Contiene 'sin' que invierte el score de positivo a negativo"
    },
    {
        texto: "Mala profesora",
        esperado: "Negativo",
        problema: "Sin negaciones - debería funcionar bien"
    },
    {
        texto: "No es mala profesora",
        esperado: "Positivo (doble negación = positivo)",
        problema: "Con 'no' invierte correctamente"
    }
];

console.log('🐛 DEMOSTRACIÓN DEL BUG DE INVERSIÓN GLOBAL\n');
console.log('='.repeat(80));

testCases.forEach((test, idx) => {
    console.log(`\n${idx + 1}. "${test.texto}"`);
    console.log(`   Esperado: ${test.esperado}`);
    console.log(`   ⚠️  ${test.problema}`);
    
    fetch('https://itd.barcelo.edu.ar/api/test-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: test.texto })
    })
    .then(res => res.json())
    .then(data => {
        console.log(`   ✅ RESULTADO: ${data.classification} (score: ${data.normalizedScore})`);
        console.log(`   📊 Palabras: +${data.positive.length} positivas, -${data.negative.length} negativas`);
        console.log(`   🔄 Negación detectada: ${data.hasNegation ? 'SÍ' : 'NO'}`);
        if (idx === testCases.length - 1) {
            console.log('\n' + '='.repeat(80));
        }
    })
    .catch(err => console.error(`   ❌ Error:`, err.message));
});
