/**
 * CONFIGURACIÓN DE COLUMNAS PARA ANÁLISIS DE ENCUESTAS
 * 
 * Este archivo define cómo se procesará cada tipo de columna del archivo Excel/CSV.
 * Puedes editar esta configuración sin tocar el código principal del servidor.
 */

module.exports = {
  /**
   * COLUMNAS DE IDENTIFICACIÓN / FILTROS
   * Estas columnas no se analizan para sentimiento.
   * Se usan para filtrar, agrupar y generar reportes.
   */
  identificacion: [
    'ID',
    'CARRERA',
    'MODALIDAD', 
    'SEDE',
    'MATERIA',
    'DOCENTE',
    'COMISION'
  ],
  
  /**
   * COLUMNAS NUMÉRICAS DE EVALUACIÓN
   * Estas columnas contienen valores numéricos (escalas 1-10).
   * Se calculan promedios y estadísticas, pero NO se analizan para sentimiento.
   * 
   * IMPORTANTE: Los nombres deben coincidir EXACTAMENTE con el Excel (espacios incluidos)
   */
  numericas: [
    'La asignatura cumple con lo expresado en el programa analítico ', // Nota: espacio al final
    'La bibliografía propuesta en el programa fue trabajada y utilizada a lo largo de la cursada',
    'El docente demostró dominio de los contenidos de la materia',
    'Las explicaciones brindadas por el docente fueron claras y se presentaron de manera ordenada.',
    'Los contenidos trabajados en la materia se vinculan con situaciones reales o futuras de la práctica profesional.',
    'Los recursos utilizados en clase -presentaciones, materiales, plataformas- facilitaron la comprensión de los contenidos.',
    ' Durante la clase, el docente propuso actividades que facilitan la comprensión y promovió la participación activa de los estudiantes', // Nota: espacio al inicio
    'El docente se mostró respetuoso y disponible para responder consultas y brindar orientación durante la cursada.',
    'Las evaluaciones -parciales, recuperatorios, final- se ajustaron a los contenidos abordados durante la materia.',
    'El uso del aula virtual fue útil para mi experiencia en la cursada.',
    '¿Cuánto considera que aprendió en esta materia?',
    '¿Cómo evalúa a la materia en términos generales?',
    '¿Cómo evalúa el desempeño general del/la docente durante la cursada?'
  ],
  
  /**
   * COLUMNAS DE TEXTO LIBRE
   * Patrones de texto que identifican columnas con comentarios abiertos.
   * Estas columnas SÍ se analizan para detectar sentimientos.
   * 
   * Si el nombre de una columna CONTIENE cualquiera de estos textos,
   * será analizada para sentimiento.
   */
  textoLibre: [
    'indique los motivos', // Patrón más flexible que acepta variaciones de espacios
    'comentarios',
    'observaciones',
    'sugerencias'
  ],
  
  /**
   * CONFIGURACIÓN DE ANÁLISIS
   * Parámetros para determinar qué texto analizar
   * 
   * IMPORTANTE: PRIORIDAD DEL DICCIONARIO
   * Si el texto contiene palabras/frases del diccionario activo, se analiza 
   * SIN IMPORTAR la longitud (incluso "excelente", "malo", etc.)
   * 
   * Los umbrales de longitud solo aplican si NO hay palabras del diccionario.
   */
  analisis: {
    // Longitud mínima de texto para análisis (en caracteres)
    // Solo aplica si NO hay palabras del diccionario en el texto
    longitudMinimaTextoLibre: 3,  // Para columnas de texto libre
    longitudMinimaOtros: 3,        // Para otras columnas (reducido de 20 a 3)
    
    // Longitud máxima de texto a almacenar en resultados
    longitudMaximaAlmacenada: 200
  },
  
  /**
   * MAPEO DE COLUMNAS PARA FILTROS
   * Define exactamente qué columnas usar para cada filtro
   */
  filtros: {
    carrera: 'CARRERA',
    materia: 'MATERIA',
    sede: 'SEDE',
    docente: 'DOCENTE'
  }
};
