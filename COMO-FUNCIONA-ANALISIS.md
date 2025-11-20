# 🔍 Cómo Funciona el Análisis de Sentimientos

## Sistema de Análisis Actualizado (v2.1)

### 📋 Modo: SOLO DICCIONARIO ACTIVO

El sistema ahora usa **exclusivamente** las palabras/frases del diccionario que tengas activo.

## ⚙️ Proceso de Análisis

### 1. Normalización del Texto
```javascript
texto = texto.toLowerCase().trim()
// "Excelente profesor" → "excelente profesor"
```

### 2. Búsqueda en Diccionario Activo
La librería `sentiment` busca cada palabra del texto en tu diccionario:

**Ejemplo con diccionario solo negativo:**
```
Diccionario activo: { "malo": -3, "terrible": -5, "pésimo": -4 }

Texto: "El curso fue excelente y el profesor muy bueno"
Busca: "excelente" → NO ENCONTRADO (score: 0)
Busca: "profesor" → NO ENCONTRADO (score: 0)  
Busca: "muy" → NO ENCONTRADO (score: 0)
Busca: "bueno" → NO ENCONTRADO (score: 0)

SCORE TOTAL: 0 (Neutral)
```

**Ejemplo encontrando palabras:**
```
Texto: "El curso fue terrible y muy malo"
Busca: "terrible" → ENCONTRADO (score: -5)
Busca: "muy" → NO ENCONTRADO (score: 0)
Busca: "malo" → ENCONTRADO (score: -3)

SCORE TOTAL: -8 (Muy Negativo)
```

### 3. Cálculo de Confianza
```javascript
palabrasReconocidas = cantidad de palabras encontradas en diccionario
totalPalabras = cantidad total de palabras en el texto
confianza = palabrasReconocidas / totalPalabras
```

### 4. Clasificación Final
Basada en el score acumulado:
- **> 2**: Muy Positivo
- **0 a 2**: Positivo  
- **-2 a 0**: Negativo
- **< -2**: Muy Negativo
- **≈ 0**: Neutral

## 🎯 Qué Hace el Sistema

### ✅ SÍ Hace:
1. Busca cada palabra del texto en tu diccionario activo
2. Suma los puntajes de las palabras encontradas
3. Calcula confianza basada en cuántas palabras reconoció
4. Clasifica el resultado

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
Resultado: 
  - Score: 0
  - Clasificación: Neutral
  - Confianza: 0%
  - Razón: Ninguna palabra está en el diccionario
```

#### Caso 2: Texto Negativo (con palabras del diccionario)
```
Texto: "Fue terrible, muy confuso y aburrido"
Resultado:
  - "terrible" → -5
  - "confuso" → -3
  - "aburrido" → -2
  - Score: -10
  - Clasificación: Muy Negativo
  - Confianza: 50% (3 de 6 palabras reconocidas)
```

#### Caso 3: Texto Mixto
```
Texto: "El profesor fue bueno pero la clase muy confusa"
Resultado:
  - "bueno" → NO encontrado (0)
  - "confusa" → -3
  - Score: -3
  - Clasificación: Negativo
  - Confianza: 12% (1 de 8 palabras)
```

## 🔧 Configuración Actual

### Componentes ACTIVOS:
- ✅ Búsqueda en diccionario personalizado
- ✅ Suma de puntajes
- ✅ Cálculo de confianza
- ✅ Detección de negaciones básicas

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
El sistema puede buscar frases completas:
```csv
muy bueno,Positivo,4
muy malo,Negativo,-4
```

Esto funciona mejor que:
```csv
muy,Neutral,0
bueno,Positivo,3
malo,Negativo,-3
```

## 🐛 Troubleshooting

### "Tengo solo palabras negativas pero detecta positivos"
**Causa**: Puede haber quedado caché del diccionario anterior
**Solución**: 
1. Reinicia el servidor
2. Verifica en la interfaz: "📚 Diccionario Activo: [nombre]"
3. Revisa la consola del servidor para confirmar cuántas palabras tiene

### "No detecta nada, todo sale Neutral"
**Causa**: Las palabras del texto no coinciden con las del diccionario
**Solución**:
1. Verifica que las palabras estén en minúsculas en el diccionario
2. Busca variaciones: "excelente" vs "excelentes"
3. Usa frases completas si el contexto es importante

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

3. **Frases Contextuales**
   ```csv
   muy bueno,Positivo,4
   muy malo,Negativo,-4
   nada bueno,Negativo,-3
   ```

4. **Balancear el Diccionario**
   - No solo extremos (5 y -5)
   - Incluir matices (1, 2, -1, -2)

---

**Versión**: 2.1.0  
**Modo**: Diccionario Exclusivo (sin fallbacks)  
**Última actualización**: Noviembre 2025
