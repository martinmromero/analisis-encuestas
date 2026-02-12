# 🔍 Cómo Funciona el Análisis de Sentimientos

## Sistema de Análisis Actualizado (v2.1)

### 📋 Modo: SOLO DICCIONARIO ACTIVO

El sistema ahora usa **exclusivamente** las palabras/frases del diccionario que tengas activo.

**🔑 Característica Principal**: 
- El sistema busca **FRASES COMPLETAS** y **PALABRAS INDIVIDUALES** según cómo las definas en tu diccionario
- Si defines "muy bueno" (con espacio) → busca la frase completa
- Si defines "bueno" (sin espacio) → busca solo esa palabra
- **PUEDES COMBINAR AMBAS** en el mismo diccionario (ver sección de ejemplos)

## ⚙️ Proceso de Análisis

**🎯 FLUJO GENERAL:**
```
Texto → Normalización → Búsqueda FRASES → Búsqueda PALABRAS → Suma Scores → 
→ Promedio por Columnas → Normalizar 0-10 → Clasificar
```

### 1. Normalización del Texto
```javascript
texto = texto.toLowerCase().trim()
// "Excelente profesor" → "excelente profesor"
```

### 2. Búsqueda en Diccionario Activo
El sistema busca **FRASES COMPLETAS** y **PALABRAS INDIVIDUALES** según lo que esté en tu diccionario:

**🔍 Cómo funciona la búsqueda:**
- Si el diccionario tiene **"muy malo"** (frase) → busca la frase completa
- Si el diccionario tiene **"malo"** (palabra) → busca solo esa palabra
- **PRIORIDAD**: Las frases se buscan ANTES que las palabras individuales

**Ejemplo 1: Diccionario con PALABRAS individuales**
```
Diccionario: { "malo": -3, "terrible": -5, "pésimo": -4 }

Texto: "El curso fue terrible y muy malo"
Busca FRASES: (ninguna en el diccionario)
Busca PALABRAS:
  - "terrible" → ENCONTRADO (score: -5)
  - "malo" → ENCONTRADO (score: -3)
  - "muy" → NO ENCONTRADO (score: 0)

SCORE TOTAL: -8 (suma -5 + -3)
```

**Ejemplo 2: Diccionario con FRASES completas**
```
Diccionario: { "muy malo": -4, "terrible": -5 }

Texto: "El curso fue terrible y muy malo"
Busca FRASES:
  - "muy malo" → ENCONTRADO (score: -4)
Busca PALABRAS:
  - "terrible" → ENCONTRADO (score: -5)

SCORE TOTAL: -9 (suma -4 + -5)
```

**Ejemplo 3: Texto sin coincidencias**
```
Diccionario: { "malo": -3, "terrible": -5 }

Texto: "Excelente profesor, muy didáctico"
Busca FRASES: (ninguna coincide)
Busca PALABRAS: (ninguna coincide)

SCORE TOTAL: 0 (Neutral - nada encontrado)
```

### 3. Cálculo de Confianza
```javascript
palabrasReconocidas = cantidad de palabras encontradas en diccionario
totalPalabras = cantidad total de palabras en el texto
confianza = palabrasReconocidas / totalPalabras
```

**Interpretación de Confianza:**
- **100%**: Todas las palabras están en el diccionario → clasificación muy confiable
- **50-99%**: Texto parcialmente reconocido → clasificación moderadamente confiable
- **1-49%**: Pocas palabras reconocidas → clasificación poco confiable
- **0%**: Ninguna palabra reconocida → "No clasificado"

### 4. Promedio por Columnas Analizadas
```javascript
// Si una persona respondió MÚLTIPLES columnas cualitativas,
// se promedian los scores de todas ellas
avgRelativeScore = overallScore / cantidadColumnasRespondidas

// Ejemplo:
// Columna 1: "Excelente" (score: +5)
// Columna 2: "Malo" (score: -3)
// Columna 3: (vacía, no se cuenta)
// avgRelativeScore = (5 + -3) / 2 = +1
```

### 5. Normalización a Escala 0-10
```javascript
// El score RAW promediado se normaliza a escala 0-10
clampedScore = Math.max(-10, Math.min(10, avgRelativeScore))
perColumnAvgScore = (clampedScore + 10) / 2

// Ejemplos de conversión:
// RAW -21 → Limitado a -10 → Normalizado 0.0
// RAW -10 → Normalizado 0.0
// RAW  -5 → Normalizado 2.5
// RAW   0 → Normalizado 5.0 (Neutral)
// RAW  +5 → Normalizado 7.5
// RAW +10 → Normalizado 10.0
// RAW +12 → Limitado a +10 → Normalizado 10.0
```

### 6. Clasificación Final
Basada en el score normalizado (escala 0-10) **y la confianza**:
- **Confianza = 0%**: No clasificado (ninguna palabra del texto está en el diccionario)
- **≥ 8**: Muy Positivo
- **≥ 6**: Positivo  
- **≥ 4 y < 6**: Neutral (palabra/frase en diccionario con valor cercano a 0)
- **≥ 2**: Negativo
- **< 2**: Muy Negativo

⚠️ **Nota**: "Neutral" significa que la palabra/frase **ESTÁ** en el diccionario pero con valor cercano a 0 (ni positiva ni negativa). "No clasificado" significa que ninguna palabra del texto fue reconocida en el diccionario.

## 🎯 Qué Hace el Sistema

### ✅ SÍ Hace:
1. Busca **FRASES COMPLETAS** (si están en el diccionario con espacios)
2. Busca **PALABRAS INDIVIDUALES** (si están en el diccionario sin espacios)
3. Suma los puntajes de TODAS las coincidencias encontradas
4. Promedia si hay múltiples columnas cualitativas respondidas
5. Calcula confianza basada en cuántas palabras/frases reconoció
6. Normaliza a escala 0-10
7. Clasifica el resultado

### ❌ NO Hace (desactivado):
1. ~~Usar diccionario en inglés de respaldo~~
2. ~~Detectar patrones hardcodeados ("muy bueno", "excelente")~~
3. ~~Aplicar intensificadores automáticos~~
4. ~~Inferir sentimientos de palabras no en el diccionario~~

## 📊 Ejemplo Completo

### Diccionario: Solo Negativos
```csv
Comentario / Frase Original,Clasificación,Puntaje
malo,-3
terrible,-5
pésimo,-4
confuso,-3
aburrido,-2
```

### Pruebas:

#### Caso 1: Texto Positivo (sin palabras del diccionario)
```
Texto: "Excelente profesor, muy didáctico y claro"
Diccionario usado: { "malo": -3, "terrible": -5, "confuso": -3 }

Resultado: 
  - Busca FRASES: (ninguna coincide)
  - Busca PALABRAS: (ninguna coincide - el diccionario solo tiene negativas)
  - Score RAW: 0
  - Promedio: 0 / 1 columna = 0
  - Score Normalizado: (0 + 10) / 2 = 5.0 (escala 0-10)
  - Clasificación: Neutral
  - Confianza: 0%
  - Razón: Ninguna palabra/frase del texto está en el diccionario
```

#### Caso 2: Texto Negativo (con palabras del diccionario)
```
Texto: "Fue terrible, muy confuso y aburrido"
Diccionario usado: { "terrible": -5, "confuso": -3, "aburrido": -2 }

Resultado:
  - Busca FRASES: (ninguna)
  - Busca PALABRAS: "terrible" → -5, "confuso" → -3, "aburrido" → -2
  - Score RAW: -10 (suma de -5 -3 -2)
  - Promedio: -10 / 1 columna = -10
  - Score Normalizado: (-10 + 10) / 2 = 0.0 (escala 0-10)
  - Clasificación: Muy Negativo
  - Confianza: 50% (3 de 6 palabras reconocidas)
```

#### Caso 3: Texto Mixto
```
Texto: "El profesor fue bueno pero la clase muy confusa"
Diccionario usado: { "confusa": -3, "confuso": -3 }

Resultado:
  - Busca FRASES: (ninguna)
  - Busca PALABRAS: "confusa" → -3, "bueno" → NO encontrado
  - Score RAW: -3
  - Promedio: -3 / 1 columna = -3
  - Score Normalizado: (-3 + 10) / 2 = 3.5 (escala 0-10)
  - Clasificación: Neutral
  - Confianza: 12% (1 de 8 palabras reconocidas)
```

#### Caso 4: Usando FRASES en el diccionario
```
Texto: "La clase fue muy buena pero muy confusa"
Diccionario usado: { "muy buena": +4, "muy confusa": -4 }

Resultado:
  - Busca FRASES: "muy buena" → +4, "muy confusa" → -4
  - Busca PALABRAS: (ninguna adicional)
  - Score RAW: 0 (suma +4 + -4)
  - Promedio: 0 / 1 columna = 0
  - Score Normalizado: (0 + 10) / 2 = 5.0 (escala 0-10)
  - Clasificación: Neutral
  - Confianza: 50% (2 frases de 4 palabras clave)

Nota: Si el diccionario tuviera "buena" y "confusa" por separado en lugar de
las frases completas, el resultado sería diferente.
```

## 🔧 Configuración Actual

### Componentes ACTIVOS:
- ✅ Búsqueda de **FRASES COMPLETAS** en diccionario (si tienen espacios)
- ✅ Búsqueda de **PALABRAS INDIVIDUALES** en diccionario (sin espacios)
- ✅ Suma de puntajes de todas las coincidencias
- ✅ Promedio por columnas cualitativas respondidas
- ✅ Cálculo de confianza
- ✅ Normalización a escala 0-10
- ✅ Detección de negaciones básicas
- ✅ Prioridad del diccionario (analiza incluso textos cortos si tienen palabras del diccionario)

### Componentes DESACTIVADOS:
- ❌ Fallback a diccionario inglés
- ❌ Patrones contextuales hardcodeados
- ❌ Intensificadores ("muy", "super")
- ❌ Análisis heurístico

## 💡 Recomendaciones

### Para Diccionarios Solo Negativos:
Si tu diccionario solo tiene palabras negativas:
- ✅ Detectará correctamente textos negativos
- ⚠️ Marcará textos positivos como "Neutral" (confianza baja)
- 💡 **Solución**: Agregar palabras positivas también para mejor precisión

### Para Diccionarios Balanceados:
Lo ideal es tener:
- ~40% palabras positivas (1 a 5)
- ~20% palabras neutrales (0)
- ~40% palabras negativas (-1 a -5)

### Frases vs Palabras:
**IMPORTANTE**: El sistema busca FRASES COMPLETAS si las defines en el diccionario.

**Opción A - Usar FRASES (Recomendado para contexto):**
```csv
Comentario / Frase Original,Clasificación,Puntaje
muy bueno,Positivo,4
muy malo,Negativo,-4
nada bueno,Negativo,-3
nada malo,Positivo,2
```
✅ Ventaja: Captura el contexto ("muy malo" es más negativo que solo "malo")
✅ Evita ambigüedad de palabras sueltas

**Opción B - Usar PALABRAS (Más flexible):**
```csv
Comentario / Frase Original,Clasificación,Puntaje
bueno,Positivo,3
malo,Negativo,-3
excelente,Positivo,5
terrible,Negativo,-5
```
✅ Ventaja: Más flexible, detecta la palabra en cualquier contexto
❌ Desventaja: Pierde matices ("muy bueno" = solo detecta "bueno")

**Opción C - COMBINAR ambas (Mejor precisión):**
```csv
Comentario / Frase Original,Clasificación,Puntaje
muy bueno,Positivo,4
bueno,Positivo,3
muy malo,Negativo,-4
malo,Negativo,-3
```
⚠️ CUIDADO: Si el texto dice "muy bueno", detectará AMBAS:
- Frase "muy bueno" → +4
- Palabra "bueno" → +3
- Score total: +7 (puede no ser lo deseado)

**Recomendación**: Usa FRASES para expresiones comunes y específicas del contexto,
y PALABRAS para términos generales.

## 🐛 Troubleshooting

### "Tengo solo palabras negativas pero detecta positivos"
**Causa**: Puede haber quedado caché del diccionario anterior
**Solución**: 
1. Reinicia el servidor
2. Verifica en la interfaz: "📚 Diccionario Activo: [nombre]"
3. Revisa la consola del servidor para confirmar cuántas palabras tiene

### "No detecta nada, todo sale Neutral"
**Causa**: Las palabras/frases del texto no coinciden con las del diccionario
**Solución**:
1. Verifica que las palabras/frases estén escritas EXACTAMENTE igual (sin tildes, minúsculas)
2. Si usas PALABRAS: busca variaciones (ej: "excelente" vs "excelentes", "confuso" vs "confusa")
3. Si usas FRASES: verifica que la frase completa aparezca en el texto
   - Diccionario: "muy bueno" → Texto debe tener "muy bueno" exacto
   - Si el texto dice "bastante bueno", NO coincidirá con "muy bueno"
4. Considera combinar palabras Y frases para mayor cobertura

### "Confianza muy baja"
**Causa**: Pocas palabras del texto están en el diccionario
**Solución**:
1. Amplía tu diccionario con más palabras/frases
2. Incluye sinónimos y variaciones
3. Agrega palabras de relleno con puntaje 0 si es necesario

## 📈 Mejores Prácticas

1. **Diccionario Específico del Dominio**
   - Educación: "didáctico", "pedagógico", "claro"
   - Servicio: "atención", "rapidez", "calidad"

2. **Incluir Variaciones**
   ```csv
   excelente,Positivo,5
   excelentes,Positivo,5
   excelencia,Positivo,5
   ```

3. **Frases Contextuales (Busca la frase COMPLETA)**
   ```csv
   muy bueno,Positivo,4
   muy malo,Negativo,-4
   nada bueno,Negativo,-3
   poco claro,Negativo,-2
   bien explicado,Positivo,4
   ```
   ⚠️ Estas frases se buscan COMPLETAS. "muy bueno" NO detecta "bueno" solo.

4. **Balancear el Diccionario**
   - No solo extremos (5 y -5)
   - Incluir matices (1, 2, -1, -2)

## ❓ Preguntas Frecuentes

### ¿Qué pasa si tengo "muy malo" como FRASE y "malo" como PALABRA en el diccionario?

**Respuesta**: Si el texto dice "muy malo", el sistema encontrará AMBAS:
- Primero busca frases → encuentra "muy malo" (ej: -4)
- Luego busca palabras → encuentra "malo" (ej: -3)
- **Score total = -7** (suma ambos)

**Recomendación**: Decide una estrategia:
- Solo frases contextuales: "muy malo", "poco claro", "nada bueno"
- Solo palabras: "malo", "claro", "bueno"
- O acepta que se sumen ambos (más peso a esa expresión)

### ¿Cómo escribo frases en el CSV del diccionario?

**En el CSV**, simplemente escribe la frase con espacios:
```csv
Comentario / Frase Original,Clasificación,Puntaje
muy bueno,Positivo,4
bien explicado,Positivo,4
nada claro,Negativo,-3
poco útil,Negativo,-2
```

El sistema automáticamente detecta que tienen espacios y las busca como frases completas.

### ¿Las frases distinguen mayúsculas o tildes?

**NO**. Todo se normaliza:
- "Muy Bueno" = "muy bueno" = "MUY BUENO"
- "didáctico" = "didactico" = "DIDACTICO"

Escribe tu diccionario en minúsculas sin tildes para simplificar.

### ¿Puedo usar frases de más de 2 palabras?

**SÍ**, sin límite:
```csv
fue muy bueno el profesor,Positivo,5
no me gustó nada,Negativo,-4
podría haber sido mejor,Neutral,0
```

Pero considera que frases MUY largas raramente aparecerán exactas en los comentarios.

### ¿Qué es mejor: frases o palabras?

**Depende de tus datos**:

**Usa FRASES si**:
- Los comentarios tienen expresiones comunes repetitivas
- Necesitas capturar contexto ("muy bueno" ≠ "bueno")
- Tus encuestados escriben de forma predecible

**Usa PALABRAS si**:
- Los comentarios son muy variados
- Quieres máxima flexibilidad
- Prefieres simplicidad

**Combina AMBAS si**:
- Quieres precisión + cobertura
- Aceptas que algunas expresiones tengan doble peso

---

**Versión**: 2.3.0  
**Modo**: Diccionario Exclusivo con Normalización 0-10  
**Características**: Búsqueda de frases completas + palabras individuales, prioridad del diccionario  
**Última actualización**: Febrero 6, 2026
