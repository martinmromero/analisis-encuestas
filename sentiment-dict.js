// Diccionarios expandidos para análisis de sentimientos

// Diccionario completo en español
const spanishSentimentDict = {
  // === PALABRAS MUY POSITIVAS (4-5 puntos) ===
  'excelente': 5,
  'fantástico': 5,
  'increíble': 5,
  'maravilloso': 5,
  'perfecto': 5,
  'espectacular': 5,
  'extraordinario': 5,
  'fenomenal': 5,
  'sobresaliente': 5,
  'impecable': 5,
  'genial': 4,
  'estupendo': 4,
  'magnífico': 4,
  'brillante': 4,
  'excepcional': 4,
  'admirable': 4,
  'superior': 4,
  'óptimo': 4,
  
  // === PALABRAS POSITIVAS (2-3 puntos) ===
  'bueno': 3,
  'bien': 3,
  'agradable': 3,
  'satisfecho': 3,
  'contento': 3,
  'feliz': 3,
  'alegre': 3,
  'cómodo': 2,
  'útil': 2,
  'fácil': 2,
  'rápido': 2,
  'eficiente': 3,
  'efectivo': 3,
  'funcional': 2,
  'práctico': 2,
  'conveniente': 2,
  'accesible': 2,
  'amigable': 2,
  'claro': 2,
  'limpio': 2,
  'organizado': 2,
  'profesional': 2,
  'confiable': 3,
  'seguro': 2,
  'estable': 2,
  'sólido': 2,
  'recomendable': 3,
  'valioso': 2,
  'económico': 2,
  'barato': 2,
  
  // === PALABRAS LIGERAMENTE POSITIVAS (1 punto) ===
  'aceptable': 1,
  'decente': 1,
  'normal': 1,
  'regular': 1,
  'suficiente': 1,
  'adecuado': 1,
  
  // === PALABRAS LIGERAMENTE NEGATIVAS (-1 punto) ===
  'difícil': -1,
  'lento': -1,
  'caro': -1,
  'costoso': -1,
  'complicado': -1,
  'confuso': -1,
  'aburrido': -1,
  'tedioso': -1,
  'largo': -1,
  'pesado': -1,
  
  // === PALABRAS NEGATIVAS (-2 a -3 puntos) ===
  'malo': -3,
  'mal': -3,
  'incómodo': -2,
  'molesto': -2,
  'problemático': -2,
  'deficiente': -2,
  'inadecuado': -2,
  'insuficiente': -2,
  'defectuoso': -3,
  'ineficiente': -2,
  'inútil': -3,
  'innecesario': -2,
  'desorganizado': -2,
  'sucio': -2,
  'poco profesional': -2,
  'inseguro': -3,
  'inestable': -3,
  'poco confiable': -3,
  
  // === PALABRAS MUY NEGATIVAS (-4 a -5 puntos) ===
  'terrible': -5,
  'horrible': -5,
  'pésimo': -5,
  'desastroso': -5,
  'catástrofe': -5,
  'inaceptable': -4,
  'intolerable': -4,
  'insoportable': -4,
  'frustante': -4,
  'decepcionante': -4,
  'lamentable': -4,
  'vergonzoso': -4,
  'ridículo': -4,
  'absurdo': -4,
  'patético': -5,
  'deplorable': -5,
  'nefasto': -5
};

// Frases y expresiones comunes
const spanishPhrases = {
  // Positivas
  'me encanta': 4,
  'me gusta mucho': 3,
  'me gusta': 2,
  'está bien': 2,
  'funciona bien': 3,
  'muy bueno': 4,
  'súper bueno': 4,
  'lo recomiendo': 3,
  'vale la pena': 3,
  'sin problemas': 2,
  'todo perfecto': 4,
  'quedé satisfecho': 3,
  'superó mis expectativas': 4,
  'mejor de lo esperado': 3,
  
  // Negativas
  'no me gusta': -2,
  'no funciona': -3,
  'no sirve': -3,
  'pérdida de tiempo': -3,
  'no vale la pena': -3,
  'no lo recomiendo': -3,
  'muy malo': -4,
  'súper malo': -4,
  'no funciona bien': -3,
  'lleno de problemas': -3,
  'quedé decepcionado': -3,
  'peor de lo esperado': -3,
  'una porquería': -4,
  'un desastre': -4
};

// Modificadores de intensidad
const intensityModifiers = {
  'muy': 1.5,
  'super': 1.7,
  'súper': 1.7,
  'extremadamente': 1.8,
  'sumamente': 1.6,
  'bastante': 1.3,
  'algo': 0.8,
  'poco': 0.7,
  'un poco': 0.7,
  'ligeramente': 0.6
};

// Palabras de negación
const negationWords = [
  'no', 'nunca', 'jamás', 'nada', 'ningún', 'ninguna', 'sin', 'ni'
];

module.exports = {
  spanishSentimentDict,
  spanishPhrases,
  intensityModifiers,
  negationWords
};