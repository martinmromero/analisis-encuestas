# 📐 Guía Técnica: Cálculo de Métricas

**Sistema de Análisis de Encuestas - Documentación de Cálculos Matemáticos**

---

## 📊 Índice

1. [Métricas Cuantitativas](#métricas-cuantitativas)
2. [Métricas Cualitativas (Sentimientos)](#métricas-cualitativas-sentimientos)
3. [Estadísticas Agregadas](#estadísticas-agregadas)
4. [Filtros y Recálculos](#filtros-y-recálculos)

---

## 📊 Métricas Cuantitativas

Las métricas cuantitativas se calculan a partir de columnas numéricas (preguntas con escala, típicamente 1-10).

### 1. Identificación de Columnas Numéricas

**Proceso:**
```javascript
// Definido en column-config.js
const COLUMN_CONFIG = {
  numericas: [
    'La asignatura cumple con lo expresado en el programa analítico',
    'El docente demostró dominio de los contenidos de la materia',
    '¿Cuánto considera que aprendió en esta materia?',
    // ... 13 columnas en total
  ]
}
```

**Criterios:**
- Columnas definidas en `COLUMN_CONFIG.numericas`
- Valores esperados: números del 1 al 10
- Se ignoran celdas vacías o con texto

### 2. Cálculo de Promedio por Pregunta

**Fórmula matemática:**
```
Promedio = Σ(valores válidos) / cantidad de valores válidos

donde:
- Σ = suma de todos los valores
- valores válidos = celdas con números entre 1 y 10
- cantidad = total de filas con respuesta (excluye vacíos)
```

**Implementación:**
```javascript
function calculateNumericMetrics(results, questions) {
  const metrics = {};
  
  questions.forEach(question => {
    const values = results
      .map(r => parseFloat(r[question]))
      .filter(v => !isNaN(v) && v >= 1 && v <= 10);
    
    if (values.length > 0) {
      const sum = values.reduce((acc, val) => acc + val, 0);
      const average = sum / values.length;
      
      metrics[question] = {
        promedio: parseFloat(average.toFixed(2)),
        respuestas: values.length
      };
    }
  });
  
  return metrics;
}
```

**Ejemplo real:**
```
Pregunta: "El docente demostró dominio de los contenidos"
Respuestas: [10, 9, 10, 8, null, 10, 9, "", 10]

Paso 1 - Filtrar valores válidos:
  [10, 9, 10, 8, 10, 9, 10] ← 7 valores válidos

Paso 2 - Sumar:
  10 + 9 + 10 + 8 + 10 + 9 + 10 = 66

Paso 3 - Dividir:
  66 / 7 = 9.43

Resultado: Promedio = 9.43 (sobre 10)
```

### 3. Presentación en la UI

**HTML generado:**
```html
<div class="metric-card">
  <div class="metric-value">9.43</div>
  <div class="metric-label">El docente demostró dominio...</div>
  <div class="metric-count">7 respuestas</div>
</div>
```

**Escala de colores:**
```javascript
function getMetricColor(value) {
  if (value >= 8) return '#28a745';  // Verde (Excelente)
  if (value >= 6) return '#ffc107';  // Amarillo (Bueno)
  if (value >= 4) return '#fd7e14';  // Naranja (Regular)
  return '#dc3545';                  // Rojo (Malo)
}
```

---

## 🎭 Métricas Cualitativas (Sentimientos)

El análisis de sentimientos procesa comentarios de texto libre para detectar tono emocional.

### 1. Identificación de Columnas de Texto Libre

**Proceso:**
```javascript
// Definido en column-config.js
const COLUMN_CONFIG = {
  textoLibre: [
    'indique los motivos',  // Patrón flexible
    'comentarios',
    'observaciones',
    'sugerencias'
  ]
}
```

**Criterios de filtrado:**
```javascript
function shouldAnalyzeColumn(columnName, value, customConfig) {
  // 1. Verificar que NO sea columna de identificación
  if (config.identificacion.includes(columnName)) return false;
  
  // 2. Verificar que NO sea columna numérica
  if (config.numericas.includes(columnName)) return false;
  
  // 3. Verificar que sea texto libre
  const isTextoLibre = config.textoLibre.some(pattern => 
    columnName.includes(pattern) || pattern.includes(columnName)
  );
  
  if (isTextoLibre) {
    // 4. Verificar longitud mínima (3 caracteres)
    const minLength = 3;
    return typeof value === 'string' && value.trim().length > minLength;
  }
  
  return false;
}
```

### 2. Análisis de Sentimientos - Diccionario v4

**Sistema de puntuación:**
```
Escala: -5 (muy negativo) a +5 (muy positivo)

Ejemplos del diccionario:
  "excelente"   → +5
  "bueno"       → +3
  "regular"     →  0
  "malo"        → -3
  "pésimo"      → -5
  "dudoso"      → -3
  "confuso"     → -2
```

**Proceso de análisis paso a paso:**

#### Paso 1: Normalización del texto
```javascript
function normalizeText(text) {
  // 1. Minúsculas
  text = text.toLowerCase();
  
  // 2. Eliminar acentos
  text = text.normalize('NFD').replace(/\p{Diacritic}/gu, '');
  
  // 3. Tokenización
  const tokens = text.split(/[^a-zA-Záéíóúüñ0-9]+/).filter(t => t.length > 0);
  
  return { normalizedText: text, tokens };
}

// Ejemplo:
"La profesora es EXCELENTE, muy didáctica!"
↓
"la profesora es excelente muy didactica"
↓
["la", "profesora", "es", "excelente", "muy", "didactica"]
```

#### Paso 2: Búsqueda en diccionario
```javascript
function analyzeTextEnhanced(text) {
  const { normalizedText, tokens } = normalizeText(text);
  
  let rawScore = 0;
  const positives = [];
  const negatives = [];
  let matchedCount = 0;
  
  // Buscar frases completas primero (ej: "muy bueno")
  diccionario.forEach(({ phrase, score }) => {
    if (normalizedText.includes(phrase)) {
      rawScore += score;
      matchedCount++;
      if (score > 0) positives.push(phrase);
      if (score < 0) negatives.push(phrase);
    }
  });
  
  // Buscar palabras individuales
  tokens.forEach(word => {
    const entry = diccionario.find(e => e.phrase === word);
    if (entry && !positives.includes(word) && !negatives.includes(word)) {
      rawScore += entry.score;
      matchedCount++;
      if (entry.score > 0) positives.push(word);
      if (entry.score < 0) negatives.push(word);
    }
  });
  
  return { rawScore, positives, negatives, matchedCount, totalWords: tokens.length };
}
```

**Ejemplo de análisis:**
```
Texto: "La forma de enseñar de ambas profesoras no es dinámica y no hay 
        buena comunicación con los alumnos"

Paso 1 - Normalización:
  Tokens: ["la", "forma", "de", "ensenar", "de", "ambas", "profesoras", 
           "no", "es", "dinamica", "y", "no", "hay", "buena", "comunicacion", 
           "con", "los", "alumnos"]
  Total palabras: 18

Paso 2 - Búsqueda en diccionario v4 (569 palabras):
  ✅ "buena" → encontrada (score: +3)
  ❌ "forma" → no encontrada
  ❌ "ensenar" → no encontrada
  ❌ "dinamica" → no encontrada
  ❌ "comunicacion" → no encontrada
  ... etc

Paso 3 - Detección de negación:
  "no es dinámica" → contexto negativo detectado
  "no hay buena" → invalida "buena"

Resultado parcial:
  Palabras positivas: ["buena"]
  Palabras negativas: []
  Score bruto: +3
  Ajuste por negación: -3 (anula lo positivo)
  Score final: 0
```

#### Paso 3: Cálculo de confianza
```javascript
// Fórmula:
confianza = (palabras_reconocidas / total_palabras) * base_confidence

// Implementación:
const matchRatio = matchedCount / totalWords;
const baseConfidence = 0.8;  // 80% base si encuentra palabras
const confidence = matchedCount > 0 
  ? Math.min(matchRatio * baseConfidence, 0.95)  // Máximo 95%
  : 0.3;  // 30% si no encuentra nada

// Ejemplo:
matchedCount = 1  (solo "buena")
totalWords = 18
matchRatio = 1/18 = 0.0556
confidence = 0.0556 * 0.8 = 0.0444 = 4.44%
```

#### Paso 4: Clasificación final
```javascript
function getClassification(score, confidence) {
  // Umbrales fijos en escala -5 a +5
  if (score >= 3)  return 'Muy Positivo';
  if (score >= 1)  return 'Positivo';
  if (score > -1 && score < 1) return 'Neutral';
  if (score >= -3) return 'Negativo';
  return 'Muy Negativo';
}

// Ejemplo:
score = 0
classification = 'Neutral'
```

### 3. Cálculo de Intensidad

**Fórmula:**
```javascript
// Intensidad como porcentaje de la escala máxima
const maxScore = 5;  // Escala -5 a +5
const intensity = Math.abs(score / maxScore) * 100;

// Ejemplo:
score = +4  →  intensity = (4/5) * 100 = 80%
score = -3  →  intensity = (3/5) * 100 = 60%
score = 0   →  intensity = 0%
```

### 4. Ejemplo Completo Real

**Comentario analizado:**
```
"La forma de enseñar de ambas profesoras no es dinámica y no hay 
 buena comunicación con los alumnos, es una materia hermosa pero 
 lamentablemente no saben desarrollarla bien las profesoras"
```

**Resultado del análisis:**

```javascript
{
  // Datos del comentario
  column: "Si su respuesta se ubica entre 1 y 6...",
  text: "La forma de enseñar de ambas profesoras no es dinámica...",
  
  // Análisis de sentimientos
  score: -1.5,                    // Puntuación calculada
  comparative: -0.0347,           // Score / total palabras
  classification: "Negativo",     // Clasificación según umbrales
  confidence: 0.09,               // 9% de confianza
  
  // Palabras detectadas
  positive: ["buena", "bien", "hermosa"],      // +3, +3, +4 = +10
  negative: ["no es", "no hay", "no saben",    // -2, -2, -2,
             "lamentablemente", "mal"],        // -3, -3 = -12
  
  // Cálculo final
  rawScore: +10 - 12 = -2,
  intensity: Math.abs(-2/5) * 100 = 40%,
  
  // Metadata
  engine: "Natural.js Enhanced",
  totalWords: 43,
  recognizedWords: 8,
  matchRatio: 8/43 = 18.6%
}
```

**Presentación en UI:**
```html
<div class="sentiment-detail">
  <div class="sentiment-badge negative">Negativo</div>
  <div class="sentiment-score">-1.50</div>
  <div class="sentiment-intensity">40%</div>
  <div class="sentiment-words">
    <span class="positive">buena, bien, hermosa</span>
    <span class="negative">no es dinámica, no saben desarrollarla, mal</span>
  </div>
</div>
```

---

## 📈 Estadísticas Agregadas

### 1. Análisis Cualitativo - Totales

**Cálculo de porcentajes por categoría:**

```javascript
function calculateStats(results) {
  const classifications = {
    'Muy Positivo': 0,
    'Positivo': 0,
    'Neutral': 0,
    'Negativo': 0,
    'Muy Negativo': 0
  };
  
  let totalScore = 0;
  let totalComparative = 0;
  let validResults = 0;
  
  // Solo contar filas con comentarios analizados
  results.forEach(result => {
    if (result.sentiment && 
        result.sentiment.details && 
        result.sentiment.details.length > 0) {
      
      const avgScore = result.sentiment.perColumnAvgScore;
      
      // Clasificar según umbrales
      let classification = 'Neutral';
      if (avgScore >= 3)  classification = 'Muy Positivo';
      else if (avgScore >= 1)  classification = 'Positivo';
      else if (avgScore <= -3) classification = 'Muy Negativo';
      else if (avgScore <= -1) classification = 'Negativo';
      
      classifications[classification]++;
      totalScore += avgScore;
      totalComparative += result.sentiment.overallComparative;
      validResults++;
    }
  });
  
  // Calcular promedios
  const averageScore = validResults > 0 ? totalScore / validResults : 0;
  const averageComparative = validResults > 0 ? totalComparative / validResults : 0;
  
  // Calcular porcentajes
  const totalResults = validResults > 0 ? validResults : 1;
  const percentages = {
    'Muy Positivo': (classifications['Muy Positivo'] / totalResults * 100).toFixed(1),
    'Positivo': (classifications['Positivo'] / totalResults * 100).toFixed(1),
    'Neutral': (classifications['Neutral'] / totalResults * 100).toFixed(1),
    'Negativo': (classifications['Negativo'] / totalResults * 100).toFixed(1),
    'Muy Negativo': (classifications['Muy Negativo'] / totalResults * 100).toFixed(1)
  };
  
  return {
    classifications,     // Conteos absolutos
    percentages,         // Porcentajes
    averageScore,        // Promedio -5 a +5
    averageComparative,  // Promedio normalizado
    totalResults: validResults
  };
}
```

**Ejemplo con datos reales:**
```
Total de filas en Excel: 1000
Filas con comentarios: 150
Filas sin comentarios (vacías): 850

Clasificaciones de las 150 con comentarios:
  Muy Positivo: 30 filas
  Positivo: 45 filas
  Neutral: 40 filas
  Negativo: 25 filas
  Muy Negativo: 10 filas

Cálculo de porcentajes (sobre 150, NO sobre 1000):
  Muy Positivo: 30/150 * 100 = 20.0%
  Positivo: 45/150 * 100 = 30.0%
  Neutral: 40/150 * 100 = 26.7%
  Negativo: 25/150 * 100 = 16.7%
  Muy Negativo: 10/150 * 100 = 6.7%

Promedio de scores:
  Suma de scores: (+3*30) + (+1.5*45) + (0*40) + (-1.5*25) + (-4*10)
                = 90 + 67.5 + 0 - 37.5 - 40
                = 80
  Promedio: 80 / 150 = 0.53 (ligeramente positivo)

Total respuestas procesadas: 150
```

### 2. Gráficos de Visualización

**Gráfico de barras (Chart.js):**
```javascript
const chartData = {
  labels: ['Muy Positivo', 'Positivo', 'Neutral', 'Negativo', 'Muy Negativo'],
  datasets: [{
    label: 'Distribución de Sentimientos (%)',
    data: [20.0, 30.0, 26.7, 16.7, 6.7],
    backgroundColor: [
      '#28a745',  // Verde oscuro
      '#90ee90',  // Verde claro
      '#ffc107',  // Amarillo
      '#fd7e14',  // Naranja
      '#dc3545'   // Rojo
    ]
  }]
};
```

---

## 🔍 Filtros y Recálculos

### 1. Aplicación de Filtros

Cuando el usuario aplica filtros (carrera, materia, docente, etc.), el sistema **recalcula todas las métricas** solo con las filas filtradas.

**Proceso:**
```javascript
function applyFilters(allResults, filters) {
  let filteredResults = allResults;
  
  // Filtro por carrera
  if (filters.carrera && filters.carrera !== 'todas') {
    filteredResults = filteredResults.filter(r => 
      r.CARRERA === filters.carrera
    );
  }
  
  // Filtro por materia
  if (filters.materia && filters.materia !== 'todas') {
    filteredResults = filteredResults.filter(r => 
      r.MATERIA === filters.materia
    );
  }
  
  // Filtro por clasificación de sentimiento
  if (filters.sentiment && filters.sentiment !== 'todos') {
    filteredResults = filteredResults.filter(r => 
      r.sentiment && 
      r.sentiment.details &&
      r.sentiment.details.some(d => d.classification === filters.sentiment)
    );
  }
  
  return filteredResults;
}
```

### 2. Recálculo de Métricas

**Después de filtrar:**
```javascript
// 1. Recalcular métricas cuantitativas
const numericMetrics = calculateNumericMetrics(
  filteredResults, 
  COLUMN_CONFIG.numericas
);

// 2. Recalcular estadísticas cualitativas
const qualitativeStats = calculateStats(filteredResults);

// 3. Actualizar visualizaciones
updateCharts(qualitativeStats);
updateNumericCards(numericMetrics);
updateResultsTable(filteredResults);
```

**Ejemplo:**
```
Dataset original: 1000 filas
Filtro aplicado: CARRERA = "Medicina"
Resultado: 250 filas

Métricas recalculadas solo para esas 250 filas:
  - Promedio pregunta 1: 8.5 (antes era 7.8)
  - Sentimientos positivos: 35% (antes era 28%)
  - Total respuestas cualitativas: 40 (antes era 150)
```

---

## 📋 Resumen de Fórmulas

### Cuantitativas
```
Promedio = Σ(valores_válidos) / cantidad_valores_válidos
```

### Cualitativas
```
Score = Σ(puntajes_palabras_positivas) - Σ(puntajes_palabras_negativas)

Confianza = (palabras_reconocidas / total_palabras) * 0.8

Intensidad = |Score / 5| * 100

Clasificación:
  score >= 3   → Muy Positivo
  score >= 1   → Positivo
  -1 < score < 1 → Neutral
  score >= -3  → Negativo
  score < -3   → Muy Negativo
```

### Estadísticas Agregadas
```
Porcentaje_categoría = (cantidad_en_categoría / total_comentarios) * 100

Promedio_global = Σ(scores) / cantidad_comentarios_analizados

Comparative = Score / total_palabras_del_comentario
```

---

## 🎯 Notas Importantes

1. **Solo se cuentan filas con datos válidos** (no vacías)
2. **Los porcentajes cualitativos** se calculan sobre comentarios analizados, no sobre total de filas
3. **La confianza baja** indica que el diccionario no reconoce muchas palabras del texto
4. **Los filtros recalculan TODO** - no son acumulativos, se aplican sobre el dataset original
5. **Escala de sentimientos**: -5 (muy negativo) a +5 (muy positivo)
6. **Escala cuantitativa**: 1 (muy malo) a 10 (excelente)

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2025  
**Autor**: Sistema de Análisis de Encuestas
