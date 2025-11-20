const fs = require('fs');
const path = require('path');

// Archivo a corregir
const filePath = path.join(__dirname, 'public', 'app.js');

console.log('🔧 Corrigiendo double-encoding UTF-8...');

// Leer el archivo como string UTF-8 (lo que tiene ahora)
let content = fs.readFileSync(filePath, 'utf8');

// Mapeo de secuencias corruptas a correctas
const fixes = {
    '\u00C3\u00A1': 'á',
    '\u00C3\u00A9': 'é',
    '\u00C3\u00AD': 'í',
    '\u00C3\u00B3': 'ó',
    '\u00C3\u00BA': 'ú',
    '\u00C3\u00B1': 'ñ',
    '\u00C3\u0081': 'Á',
    '\u00C3\u0089': 'É',
    '\u00C3\u008D': 'Í',
    '\u00C3\u0093': 'Ó',
    '\u00C3\u009A': 'Ú',
    '\u00C3\u0091': 'Ñ',
    '\u00C2\u00BF': '¿',
    '\u00C2\u00A1': '¡'
};

// Aplicar correcciones
let fixed = 0;
for (const [wrong, correct] of Object.entries(fixes)) {
    const regex = new RegExp(wrong.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const matches = (content.match(regex) || []).length;
    if (matches > 0) {
        content = content.replace(regex, correct);
        fixed += matches;
        console.log(`✅ Corregido ${matches}x: ${wrong} → ${correct}`);
    }
}

// Escribir el archivo corregido
fs.writeFileSync(filePath, content, 'utf8');

console.log(`\n🎉 Total de correcciones: ${fixed}`);
console.log('✅ Archivo guardado con encoding UTF-8');
