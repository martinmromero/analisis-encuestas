# 🔧 Guía para Ajustar el Análisis de Sentimientos

## 📋 Mejoras Implementadas

Tu aplicación ahora incluye un **sistema de análisis de sentimientos mejorado** con las siguientes características:

### ✨ **Nuevas Funcionalidades:**

1. **📚 Diccionario Expandido**: +150 palabras y frases en español
2. **🎯 Análisis de Frases**: Detecta expresiones completas como "me encanta", "no vale la pena"
3. **⚡ Modificadores de Intensidad**: "muy", "súper", "extremadamente"
4. **🔄 Detección de Negaciones**: "no", "nunca", "jamás"
5. **📊 Indicador de Confianza**: Muestra qué tan seguro está el análisis
6. **🧠 Patrones Avanzados**: Detecta contextos específicos

### 🎛️ **Cómo Personalizar el Análisis:**

#### 1. **Agregar Nuevas Palabras**
Edita el archivo `sentiment-dict.js`:

```javascript
// Agregar palabras positivas
'increíble': 5,      // Muy positivo (5 puntos)
'satisfactorio': 2,  // Positivo (2 puntos)

// Agregar palabras negativas  
'decepcionante': -3, // Negativo (-3 puntos)
'pésimo': -5,       // Muy negativo (-5 puntos)
```

#### 2. **Agregar Frases Específicas**
```javascript
// En la sección spanishPhrases
'funciona perfectamente': 4,
'exactamente lo que necesitaba': 3,
'perdí mi dinero': -4,
'no volvería a comprar': -3
```

#### 3. **Modificar Intensificadores**
```javascript
// Cambiar multiplicadores de intensidad
'extremadamente': 2.0,  // Más intenso
'bastante': 1.2,        // Menos intenso
'poco': 0.5            // Reduce intensidad
```

#### 4. **Ajustar Clasificación**
En `server.js`, función `getClassification()`:

```javascript
// Hacer clasificación más estricta
if (score > 4) return 'Muy Positivo';     // Era > 3
if (score > 1.5) return 'Positivo';      // Era > 1
if (score >= -1.5 && score <= 1.5) return 'Neutral';
if (score > -4) return 'Negativo';       // Era > -3
return 'Muy Negativo';
```

### 🔍 **Interpretando el Indicador de Confianza:**

- **80-100%**: 🟢 Análisis muy confiable - muchas palabras reconocidas
- **60-79%**: 🟡 Análisis confiable - algunas palabras reconocidas  
- **40-59%**: 🟠 Análisis moderado - pocas palabras reconocidas
- **0-39%**: 🔴 Análisis poco confiable - muy pocas palabras reconocidas

### 📊 **Mejores Prácticas:**

#### ✅ **Para Mejorar la Precisión:**
- Agrega palabras específicas de tu dominio (ej: tecnología, medicina, etc.)
- Incluye jerga y modismos de tu región
- Añade frases completas que sean comunes en tus encuestas

#### ⚠️ **Limitaciones a Considerar:**
- El análisis funciona mejor con texto de 10+ palabras
- Sarcasmo e ironía son difíciles de detectar
- Contexto cultural puede afectar interpretaciones

### 🛠️ **Configuraciones Avanzadas:**

#### 1. **Análisis por Dominio Específico**
```javascript
// Para encuestas de productos tecnológicos
const techWords = {
  'user-friendly': 3,
  'intuitivo': 2,
  'buggy': -3,
  'crash': -4
};
```

#### 2. **Ajuste de Sensibilidad**
```javascript
// En analyzeTextEnhanced(), línea de negación:
finalScore = finalScore * -0.8;  // Cambiar a -0.6 para menos inversión
```

## 🎯 **Prioridad de Frases vs Palabras Individuales**

### ⚖️ **Cómo Funciona el Sistema de Coincidencias:**

El sistema procesa el texto en dos etapas:

#### 1️⃣ **Palabras Ignoradas (Primera Verificación)**

**Regla clave**: Las palabras ignoradas solo aplican cuando el texto **COMPLETO** coincide exactamente.

```
Ejemplos:
✅ Texto: "nada" → Se ignora (coincide exactamente)
❌ Texto: "no enseña nada" → NO se ignora (no es una coincidencia exacta)
❌ Texto: "nada importante" → NO se ignora (contiene palabras adicionales)
```

**Palabras ignoradas típicas**:
- Símbolos: `-`, `.`, `...`, `¿`, `?`
- Respuestas vacías: `sin comentario`, `sin comentarios`, `s/c`, `n/a`, `na`
- Palabras genéricas: `ninguno`, `ninguna`, `nada`

#### 2️⃣ **Análisis de Sentimientos (Segunda Verificación)**

Si el texto NO fue ignorado, el sistema busca coincidencias en el diccionario:

**A. Frases completas** (tienen prioridad):
```javascript
// Busca frases multi-palabra primero
'no enseña nada': -3,
'me parece excelente': 4,
'no vale la pena': -4
```

**B. Palabras individuales**:
```javascript
// Luego busca palabras sueltas
'nada': 0,
'excelente': 5,
'vale': 1
```

### 🔍 **Ejemplos Prácticos:**

#### Ejemplo 1: Palabra Ignorada vs Frase en Diccionario
```
📝 Configuración:
  - Palabras ignoradas: ["nada"]
  - Diccionario: {"no enseña nada": -3, "nada": 0}

✅ Caso A: Texto = "nada"
   → Se IGNORA (coincide exactamente con palabra ignorada)
   → No se analiza sentimiento
   → Score: 0 (neutral, marcado como ignorado)

✅ Caso B: Texto = "no enseña nada"
   → NO se ignora (no coincide exactamente)
   → Encuentra frase "no enseña nada" en diccionario
   → Score: -3 (negativo)
```

#### Ejemplo 2: Frases Largas vs Palabras Sueltas
```
📝 Configuración:
  - Diccionario: {
      "me parece excelente": 4,
      "excelente": 5,
      "parece": 0
    }

✅ Texto: "me parece excelente"
   → Encuentra frase completa "me parece excelente" → +4
   → También encuentra palabra "excelente" → +5
   → Score total: +9 ⚠️ (doble conteo)

💡 Nota: Actualmente hay doble conteo. 
   Recomendación: Define solo la frase O solo las palabras, no ambas.
```

#### Ejemplo 3: Contexto Importa
```
📝 Configuración:
  - Palabras ignoradas: ["sin comentarios"]
  - Diccionario: {"sin organización": -3}

✅ Caso A: Texto = "sin comentarios"
   → Se IGNORA completamente

✅ Caso B: Texto = "sin organización"
   → NO se ignora
   → Score: -3 (negativo)
```

### ✅ **Mejores Prácticas:**

1. **Para Palabras Ignoradas**: 
   - Agrega solo frases cortas y completas que indiquen "sin respuesta"
   - Ejemplos: `"n/a"`, `"sin comentario"`, `"."`

2. **Para Diccionario de Sentimientos**:
   - **Prioriza frases específicas** sobre palabras sueltas
   - Si defines `"no enseña nada": -3`, NO agregues `"nada"` al diccionario
   - Evita duplicados entre frases y sus palabras componentes

3. **Casos Especiales**:
   ```javascript
   // ✅ BIEN: Frase específica
   "no sirve para nada": -4
   
   // ❌ EVITAR: Palabra suelta que está en la frase anterior
   "nada": -1  // Causará doble conteo
   
   // ✅ MEJOR: Solo la frase completa
   "no sirve para nada": -4
   // Y "nada" aislado va a palabras ignoradas
   ```

### 📈 **Monitoreo del Rendimiento:**

Revisa estos indicadores en tu aplicación:
- **Confianza promedio**: Debería ser >60%
- **Distribución equilibrada**: No todo debería ser "Neutral"
- **Coherencia**: Resultados similares para textos parecidos

### 🔄 **Actualizaciones Continuas:**

1. **Recopila feedback** de usuarios sobre clasificaciones incorrectas
2. **Analiza patrones** en textos mal clasificados
3. **Actualiza diccionarios** regularmente
4. **Prueba cambios** con datasets conocidos

### 🎯 **Casos de Uso Específicos:**

#### Para **Encuestas de Satisfacción del Cliente:**
- Agrega términos de servicio: "atención", "rapidez", "profesional"
- Incluye frases de compra: "vale la pena", "calidad-precio"

#### Para **Feedback de Empleados:**
- Términos laborales: "ambiente", "crecimiento", "reconocimiento"
- Frases organizacionales: "trabajo en equipo", "liderazgo"

#### Para **Reviews de Productos:**
- Términos técnicos específicos del producto
- Frases de uso: "fácil de usar", "duración de batería"

---

**💡 Tip**: Después de hacer cambios, reinicia el servidor (`npm start`) para que se carguen las modificaciones.