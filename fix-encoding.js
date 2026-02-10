const fs = require('fs');
const path = require('path');

// Archivo a corregir
const filePath = path.join(__dirname, 'public', 'app.js');

console.log('🔧 Corrigiendo encoding de app.js...');

// Leer el archivo como buffer
const buffer = fs.readFileSync(filePath);

// Convertir de Latin-1 (ISO-8859-1) a string, luego a UTF-8
// Esto corrige el double-encoding: UTF-8 → Latin-1 → UTF-8
const incorrectString = buffer.toString('latin1');
const correctBuffer = Buffer.from(incorrectString, 'utf8');

// Escribir el archivo corregido con UTF-8
fs.writeFileSync(filePath, correctBuffer);

console.log('✅ Archivo corregido exitosamente');
console.log('📋 Verificando correcciones...');

// Verificar algunos casos
const content = fs.readFileSync(filePath, 'utf8');
const tests = [
    { wrong: 'DescripciÃ³n', correct: 'Descripción' },
    { wrong: 'espaÃ±olas', correct: 'españolas' },
    { wrong: 'pÃ¡gina', correct: 'página' },
    { wrong: 'gestiÃ³n', correct: 'gestión' },
    { wrong: 'AnÃ¡lisis', correct: 'Análisis' }
];

let allFixed = true;
for (const test of tests) {
    if (content.includes(test.wrong)) {
        console.log(`❌ Todavía contiene: ${test.wrong}`);
        allFixed = false;
    } else if (content.includes(test.correct)) {
        console.log(`✅ Corregido: ${test.correct}`);
    }
}

if (allFixed) {
    console.log('\n🎉 Todos los caracteres están corregidos!');
} else {
    console.log('\n⚠️  Algunos caracteres aún tienen problemas');
}
