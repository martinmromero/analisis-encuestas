# 📋 Formato de Archivo Excel para Diccionarios - ACTUALIZADO

## Estructura de Columnas

Tu archivo Excel o CSV debe tener **4 columnas** en este orden:

| # | Nombre de Columna | Uso | Descripción |
|---|-------------------|-----|-------------|
| 1 | **Comentario / Frase Original** | ✅ USADO | Texto o frase a buscar en análisis |
| 2 | **Clasificación** | ℹ️ INFORMATIVA | Positivo/Neutral/Negativo (solo referencia) |
| 3 | **Puntaje** | ✅ USADO | Número de -5 a 5 para análisis |
| 4 | **Racional (Contexto)** | ❌ IGNORADA | Explicación/contexto (no se procesa) |

## Reglas de Puntaje

### Clasificación Positiva
- **5 puntos** = Extremadamente positivo (excelente, fantástico)
- **4 puntos** = Muy positivo (muy bueno, genial)
- **3 puntos** = Positivo (bueno, satisfactorio)
- **2 puntos** = Ligeramente positivo (aceptable)
- **1 punto** = Apenas positivo (bien, ok)

### Clasificación Neutral
- **0 puntos** = Neutral (regular, normal, ni bien ni mal)

### Clasificación Negativa
- **-1 punto** = Apenas negativo (mal)
- **-2 puntos** = Ligeramente negativo (insuficiente)
- **-3 puntos** = Negativo (malo, insatisfactorio)
- **-4 puntos** = Muy negativo (muy malo, pésimo)
- **-5 puntos** = Extremadamente negativo (terrible, horrible)

## Ejemplo Completo

```csv
Comentario / Frase Original,Clasificación,Puntaje,Racional (Contexto)
excelente,Positivo,5,Máxima calidad y satisfacción
muy bueno,Positivo,4,Alta satisfacción
bueno,Positivo,3,Satisfactorio
aceptable,Positivo,2,Apenas positivo
bien,Positivo,1,Ligeramente positivo
regular,Neutral,0,Ni bueno ni malo
mal,Negativo,-1,Ligeramente negativo
malo,Negativo,-3,Insatisfactorio
terrible,Negativo,-5,Pésima experiencia
```

## Contexto Educativo - Ejemplo

```csv
Comentario / Frase Original,Clasificación,Puntaje,Racional (Contexto)
didáctico,Positivo,4,Facilita el aprendizaje
claro,Positivo,4,Explicaciones comprensibles
confuso,Negativo,-4,Difícil de seguir
aburrido,Negativo,-3,Clases poco interesantes
motivador,Positivo,4,Inspira al estudiante
organizado,Positivo,3,Bien estructurado
desorganizado,Negativo,-4,Mal planificado
respetuoso,Positivo,4,Buen trato
preparado,Positivo,4,Domina la materia
```

## Notas Importantes

### ✅ Lo que SÍ se procesa:
1. **Columna 1**: Texto/frase → Se convierte a minúsculas y se usa como clave
2. **Columna 3**: Puntaje → Se usa directamente para análisis de sentimientos

### ❌ Lo que NO se procesa:
1. **Columna 2**: Clasificación → Solo para referencia humana
2. **Columna 4**: Racional → Completamente ignorada por el sistema

### 🔍 Cómo funciona:
Cuando el sistema analiza un texto como:
```
"El profesor fue muy claro y didáctico en sus explicaciones"
```

Buscará en el diccionario:
- "claro" → Encontrado, puntaje: +4
- "didáctico" → Encontrado, puntaje: +4
- Resultado: Sentimiento positivo fuerte

## Archivo de Ejemplo Incluido

Usa el archivo de ejemplo para probar:
```
ejemplo-diccionario-formato-nuevo.csv
```

Contiene 30 frases comunes en contexto educativo con sus puntajes.

## Cómo Importar

1. Abre http://localhost:3000
2. Ve a "📚 Gestión de Diccionarios"
3. Click "📤 Importar Diccionario"
4. Selecciona tu archivo .xlsx o .csv
5. Escribe un nombre descriptivo
6. ¡Listo! El diccionario se activa automáticamente

## Validaciones del Sistema

El sistema validará:
- ✅ Puntaje entre -5 y 5
- ✅ Columna de frase no vacía
- ✅ Puntaje es un número válido
- ❌ Filas con datos inválidos se ignoran (con log en consola)

## Logs en Consola del Servidor

Al importar, verás logs como:
```
📊 Datos parseados del archivo: 30 filas
🔑 Claves disponibles: [ 'Comentario / Frase Original', 'Clasificación', 'Puntaje', 'Racional (Contexto)' ]
Fila 1: frase="excelente" (de "Comentario / Frase Original"), puntaje=5 (de "Puntaje")
Fila 2: frase="muy bueno" (de "Comentario / Frase Original"), puntaje=4 (de "Puntaje")
✅ Palabras procesadas: 30
```

## Solución de Problemas

### ❌ "No se encontraron palabras válidas"
**Causas posibles:**
- Nombres de columnas incorrectos
- Puntajes fuera del rango -5 a 5
- Columna de frases vacía

**Solución:**
- Verifica los nombres exactos de las columnas
- Asegúrate de que los puntajes sean números entre -5 y 5
- Revisa los logs del servidor para ver qué columnas detectó

### ❌ Algunas palabras no se importaron
**Causa:**
- Puntajes inválidos (texto en lugar de número, o fuera de rango)

**Solución:**
- Revisa que la columna "Puntaje" contenga solo números
- Verifica que no haya fórmulas que devuelvan error en Excel

## Tips para Crear Diccionarios

1. **Usa frases completas**: "muy bueno" funciona mejor que solo "muy"
2. **Cubre variaciones**: Incluye "excelente", "excelentes", "excelencia"
3. **Contexto específico**: Adapta a tu dominio (educación, servicio, etc.)
4. **Revisa coherencia**: Asegúrate de que puntajes similares tengan significados similares
5. **Prueba iterativamente**: Importa, analiza, ajusta, reimporta

---

**Versión**: 2.1.0  
**Fecha**: Noviembre 2025  
**Archivo de ejemplo**: `ejemplo-diccionario-formato-nuevo.csv`
