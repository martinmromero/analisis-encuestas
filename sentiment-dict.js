// Diccionarios expandidos para análisis de sentimientos
// ESCALA: 0-10 (0=muy negativo, 5=neutral, 10=muy positivo)

// Diccionario completo en español
const spanishSentimentDict = {
  // === PALABRAS MUY POSITIVAS (+3 a +5 puntos del neutral) ===
  'excelente': 3,
  'fantástico': 3,
  'increíble': 3,
  'maravilloso': 3,
  'perfecto': 3,
  'espectacular': 3,
  'extraordinario': 3,
  'fenomenal': 3,
  'sobresaliente': 3,
  'impecable': 3,
  'genial': 2.5,
  'estupendo': 2.5,
  'magnífico': 2.5,
  'brillante': 2.5,
  'excepcional': 2.5,
  'admirable': 2.5,
  'superior': 2.5,
  'óptimo': 2.5,
  
  // === PALABRAS POSITIVAS (+1.5 a +2 puntos del neutral) ===
  'bueno': 2,
  'bien': 2,
  'agradable': 2,
  'satisfecho': 2,
  'contento': 2,
  'feliz': 2,
  'alegre': 2,
  'cómodo': 1.5,
  'útil': 1.5,
  'fácil': 1.5,
  'rápido': 1.5,
  'eficiente': 2,
  'efectivo': 2,
  'funcional': 1.5,
  'práctico': 1.5,
  'conveniente': 1.5,
  'accesible': 1.5,
  'amigable': 1.5,
  'claro': 1.5,
  'limpio': 1.5,
  'organizado': 1.5,
  'profesional': 1.5,
  'confiable': 2,
  'seguro': 1.5,
  'estable': 1.5,
  'sólido': 1.5,
  'recomendable': 2,
  'valioso': 1.5,
  'económico': 1.5,
  'barato': 1.5,
  
  // === PALABRAS LIGERAMENTE POSITIVAS (+0.5 a +1 punto del neutral) ===
  'aceptable': 0.5,
  'decente': 0.5,
  'normal': 0,
  'regular': 0,
  'suficiente': 0.5,
  'adecuado': 0.5,
  
  // === PALABRAS LIGERAMENTE NEGATIVAS (-0.5 a -1 punto del neutral) ===
  'difícil': -0.5,
  'lento': -0.5,
  'caro': -0.5,
  'costoso': -0.5,
  'complicado': -0.5,
  'confuso': -0.5,
  'aburrido': -0.5,
  'tedioso': -0.5,
  'largo': -0.5,
  'pesado': -0.5,
  
  // === PALABRAS NEGATIVAS (-1.5 a -2 puntos del neutral) ===
  'malo': -2,
  'mal': -2,
  'incómodo': -1.5,
  'molesto': -1.5,
  'problemático': -1.5,
  'deficiente': -1.5,
  'inadecuado': -1.5,
  'insuficiente': -1.5,
  'defectuoso': -2,
  'ineficiente': -1.5,
  'inútil': -2,
  'innecesario': -1.5,
  'desorganizado': -1.5,
  'sucio': -1.5,
  'poco profesional': -1.5,
  'inseguro': -2,
  'inestable': -2,
  'poco confiable': -2,
  
  // === PALABRAS MUY NEGATIVAS (-3 a -5 puntos del neutral) ===
  'terrible': -3,
  'horrible': -3,
  'pésimo': -3,
  'desastroso': -3,
  'catástrofe': -3,
  'inaceptable': -2.5,
  'intolerable': -2.5,
  'insoportable': -2.5,
  'frustante': -2.5,
  'decepcionante': -2.5,
  'lamentable': -2.5,
  'vergonzoso': -2.5,
  'ridículo': -2.5,
  'absurdo': -2.5,
  'patético': -3,
  'deplorable': -3,
  'nefasto': -3
};

// Frases y expresiones comunes
const spanishPhrases = {
  // Positivas
  'me encanta': 2.5,
  'me gusta mucho': 2,
  'me gusta': 1.5,
  'está bien': 1.5,
  'funciona bien': 2,
  'muy bueno': 2.5,
  'súper bueno': 2.5,
  'lo recomiendo': 2,
  'vale la pena': 2,
  'sin problemas': 1.5,
  'todo perfecto': 2.5,
  'quedé satisfecho': 2,
  'superó mis expectativas': 2.5,
  'mejor de lo esperado': 2,
  
  // Negativas
  'no me gusta': -1.5,
  'no funciona': -2,
  'no sirve': -2,
  'pérdida de tiempo': -2,
  'no vale la pena': -2,
  'no lo recomiendo': -2,
  'muy malo': -2.5,
  'súper malo': -2.5,
  'no funciona bien': -2,
  'lleno de problemas': -2,
  'quedé decepcionado': -2,
  'peor de lo esperado': -2,
  'una porquería': -2.5,
  'un desastre': -2.5
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