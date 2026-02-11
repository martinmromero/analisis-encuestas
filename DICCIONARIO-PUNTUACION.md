# 📊 Sistema de Puntuación de Diccionarios

## 🎯 Formatos Soportados

El sistema **autodetecta** qué tipo de escala estás usando al importar un diccionario Excel y lo convierte automáticamente.

### ✅ Opción 1: Escala Absoluta 0-10 (Recomendada para Excel)

**Más intuitiva para crear diccionarios desde cero:**

| Puntuación | Clasificación | Ejemplos |
|------------|---------------|----------|
| 0-2 | Muy Negativo | "pésimo", "horrible", "desastroso" |
| 2-4 | Negativo | "malo", "deficiente", "pobre" |
| 4-6 | **Neutral** | "normal", "regular", "aceptable" |
| 6-8 | Positivo | "bueno", "útil", "agradable" |
| 8-10 | Muy Positivo | "excelente", "fantástico", "extraordinario" |

**Ejemplo Excel:**

```
Palabra/Frase    | Puntuación
-----------------|------------
excelente        | 10
bueno            | 7
normal           | 5
regular          | 5
malo             | 3
pésimo           | 1
```

### ✅ Opción 2: Escala Relativa -5 a +5 (Interna del sistema)

**Se usa internamente, pero también puedes importar con este formato:**

| Puntuación | Clasificación | Equivalente 0-10 |
|------------|---------------|------------------|
| -5 a -3 | Muy Negativo | 0 a 2 |
| -3 a -1 | Negativo | 2 a 4 |
| -0.5 a +0.5 | **Neutral** | 4.5 a 5.5 |
| +1 a +3 | Positivo | 6 a 8 |
| +3 a +5 | Muy Positivo | 8 a 10 |

**Ejemplo Excel:**

```
Palabra/Frase    | Puntuación
-----------------|------------
excelente        | 5
bueno            | 2
normal           | 0
regular          | 0
malo             | -2
pésimo           | -5
```

## 🔄 Conversión Automática

Cuando importás un Excel:

1. **El sistema detecta el rango** de valores
2. **Si está entre 0-10** → Convierte automáticamente a escala relativa (resta 5)
   - 10 → +5 (muy positivo)
   - 5 → 0 (neutral)
   - 0 → -5 (muy negativo)
3. **Si está entre -10 a +10** → Mantiene los valores como están

**Ver en logs del servidor:**
```
📊 Detectada escala 0-10. Convirtiendo a escala relativa (-5 a +5)...
✅ Conversión completada: 542 palabras convertidas
```

## 📝 Crear Diccionario en Excel

### Estructura Básica

**Hoja 1: Diccionario**

| Columna | Nombre | Tipo | Ejemplo |
|---------|--------|------|---------|
| A | Palabra/Frase | Texto | "excelente profesor" |
| B | Puntuación | Número | 9 |

**Hoja 2 (Opcional): Palabras Ignoradas**

| Columna | Nombre | Tipo | Ejemplo |
|---------|--------|------|---------|
| A | Palabra/Frase Ignorada | Texto | "sin comentario" |

### 🎯 Consejos para Palabras Neutrales

**SÍ incluir como neutral (puntuación 5 en escala 0-10):**
- normal
- regular
- aceptable
- común
- estándar
- adecuado
- correcto
- bien

**NO marcar como neutral:**
- Palabras vacías (se agregan a "Palabras Ignoradas")
- Artículos (el, la, los, las)
- Preposiciones (de, con, para)

## 🔍 Verificar Clasificación

Después de importar, podés probar palabras específicas:

1. Ve a **📚 Gestión de Diccionario**
2. Click en **"Probar Análisis"**
3. Escribe una frase con palabras neutrales
4. Verifica que se clasifique como "Neutral"

**Ejemplo de prueba:**
```
Texto: "Todo fue normal y regular"
Resultado esperado: 
- Clasificación: Neutral
- Palabras detectadas: normal (0), regular (0)
- Score: 5.0
```

## ⚠️ Problemas Comunes

### ❌ Los neutrales se clasifican como positivos

**Causa:** Diccionario antiguo antes del fix (commit 57d4161)

**Solución:** 
1. Re-importar el diccionario Excel
2. El sistema detectará y convertirá automáticamente

### ❌ No detecta neutrales

**Causa:** Puntuación demasiado alejada de 5

**Solución:**
- Palabras neutrales deben tener puntuación entre **4-6** (escala 0-10)
- O entre **-0.5 a +0.5** (escala relativa)

## 📊 Ejemplos Completos

### Diccionario Educativo (Escala 0-10)

```
Palabra/Frase              | Puntuación
--------------------------|------------
excelente explicación     | 10
muy buen docente          | 9
bueno                     | 7
útil                      | 7
normal                    | 5
regular                   | 5
aceptable                 | 5
común                     | 5
deficiente                | 3
malo                      | 3
pésimo profesor           | 1
horrible                  | 0
```

### Diccionario Servicio al Cliente (Escala 0-10)

```
Palabra/Frase              | Puntuación
--------------------------|------------
excelente atención        | 10
muy profesional           | 9
amable                    | 8
correcto                  | 5
estándar                  | 5
lento                     | 3
mala atención             | 2
desastroso servicio       | 0
```

## 🚀 Versión Actual

- **v1.1+** incluye soporte completo para neutrales
- **Autodetección** de escala implementada
- **Conversión automática** 0-10 → -5 a +5

## 📖 Ver También

- [FORMATO-DICCIONARIO.md](FORMATO-DICCIONARIO.md) - Detalles técnicos del formato JSON
- [QUICK-START-DICTIONARIES.md](QUICK-START-DICTIONARIES.md) - Guía rápida de uso
- [MULTI-DICTIONARY-GUIDE.md](MULTI-DICTIONARY-GUIDE.md) - Gestión de múltiples diccionarios
