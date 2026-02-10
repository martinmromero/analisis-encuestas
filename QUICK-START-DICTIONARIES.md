# 🚀 Inicio Rápido - Gestión de Diccionarios Múltiples

## ⚡ En 5 Minutos

### 1️⃣ Servidor Ya Está Corriendo
```
✅ http://localhost:3000
```

### 2️⃣ Probar Nueva Funcionalidad

**Opción A: Usar Ejemplo Incluido** (Recomendado)
```
1. Abrir navegador → http://localhost:3000
2. Click en "📚 Gestión de Diccionarios"
3. Click en "📤 Importar Diccionario"
4. Seleccionar: ejemplo-diccionario-educacion.csv
5. Escribir nombre: "Diccionario Educación"
6. ¡Listo! Verás el nuevo diccionario en el selector
```

**Opción B: Crear Tu Propio Diccionario**
```
1. Abrir Excel o Google Sheets
2. Crear 4 columnas:
   
   Comentario / Frase Original | Clasificación | Puntaje | Racional (Contexto)
   ----------------------------|---------------|---------|--------------------
   excelente                   | Positivo      | 5       | Muy buena calidad
   bueno                       | Positivo      | 3       | Satisfactorio
   regular                     | Neutral       | 0       | Ni bueno ni malo
   malo                        | Negativo      | -3      | Insatisfactorio
   terrible                    | Negativo      | -5      | Muy mala experiencia
   regular       | 0
   malo          | -3
   terrible      | -5

3. Guardar como .xlsx o .csv
4. Importar en la aplicación
```

### 3️⃣ Cambiar Entre Diccionarios
```
1. En "Gestión de Diccionarios"
2. Usar selector dropdown:
   [▼ Diccionario Base (894 palabras)]
3. Seleccionar el que quieras
4. El análisis ahora usa ese diccionario
```

### 4️⃣ Eliminar Diccionario
```
1. Seleccionar diccionario a eliminar
2. Click en "🗑️ Eliminar"
3. Confirmar
4. Se activa automáticamente el diccionario base
```

## 📋 Formato de Archivo

### Excel/CSV - Cuatro Columnas:
```
Columna A: Comentario / Frase Original (texto a buscar)
Columna B: Clasificación (Positivo/Neutral/Negativo) - INFORMATIVA
Columna C: Puntaje (número de -5 a 5) - USADO EN ANÁLISIS
Columna D: Racional (Contexto) - IGNORADA
```

### Ejemplo Real:
| Comentario / Frase Original | Clasificación | Puntaje | Racional (Contexto) |
|-----------------------------|---------------|---------|---------------------|
| excelente                   | Positivo      | 5       | Máxima calidad      |
| muy bueno                   | Positivo      | 4       | Alta satisfacción   |
| bueno                       | Positivo      | 3       | Satisfactorio       |
| aceptable                   | Positivo      | 2       | Apenas positivo     |
| bien                        | Positivo      | 1       | Ligeramente positivo|
| regular                     | Neutral       | 0       | Ni bueno ni malo    |
| mal                         | Negativo      | -1      | Ligeramente negativo|
| malo                        | Negativo      | -3      | Insatisfactorio     |
| terrible                    | Negativo      | -5      | Muy mala experiencia|

### Reglas de Puntaje:
- **Positivo**: 1 a 5 puntos
- **Neutral**: 0 puntos
- **Negativo**: -1 a -5 puntos

**Nota**: La columna "Clasificación" es solo referencia visual. El sistema usa únicamente el "Puntaje".

## 🎯 Casos de Uso

### Caso 1: Análisis Educativo
```
Diccionario Base → Términos generales (894 palabras)
+ 
Diccionario Educación → Términos específicos
  - didáctico: 4
  - pedagógico: 3
  - aburrido: -3
  - confuso: -4
```

### Caso 2: Comparar Versiones
```
1. Importar "Diccionario V1"
2. Analizar encuestas → Ver resultados
3. Cambiar a "Diccionario V2"
4. Re-analizar → Comparar diferencias
```

### Caso 3: Evolución Temporal
```
Q1 2024 → Diccionario Primer Cuatrimestre
Q2 2024 → Diccionario Segundo Cuatrimestre
Q3 2024 → Diccionario Tercer Cuatrimestre
```

## 📁 Archivos Importantes

| Archivo | Descripción |
|---------|-------------|
| `ejemplo-diccionario-educacion.csv` | Ejemplo listo para usar (28 palabras) |
| `MULTI-DICTIONARY-GUIDE.md` | Guía completa de uso |
| `MULTI-DICTIONARY-IMPLEMENTATION.md` | Detalles técnicos |
| `WHATS-NEW.md` | Resumen de novedades |

## 🔧 Solución Rápida de Problemas

### ❌ "No se encontraron palabras válidas"
**Solución**: Verifica que tu archivo tenga las columnas "palabra" y "puntuacion"

### ❌ "Formato de archivo no soportado"
**Solución**: Usa solo .json, .xlsx, .xls o .csv

### ❌ No veo el selector de diccionarios
**Solución**: Refresca la página (F5 o Ctrl+R)

### ❌ El diccionario no cambia
**Solución**: Verifica en consola del navegador (F12) si hay errores

## 📊 Ejemplo Práctico Completo

### Paso a Paso:

1. **Preparar Archivo Excel**
   ```
   Abrir Excel
   Fila 1: palabra | puntuacion
   Fila 2: fantástico | 5
   Fila 3: interesante | 3
   Fila 4: aburrido | -3
   Fila 5: pésimo | -5
   Guardar como "mi-diccionario.xlsx"
   ```

2. **Importar**
   ```
   http://localhost:3000
   → Gestión de Diccionarios
   → Importar Diccionario
   → Seleccionar "mi-diccionario.xlsx"
   → Nombre: "Mi Primer Diccionario"
   → ✅ Importado con X palabras
   ```

3. **Usar**
   ```
   Selector: [▼ Mi Primer Diccionario (4 palabras)]
   → Subir archivo de encuestas
   → Analizar con tu diccionario personalizado
   ```

4. **Gestionar**
   ```
   Ver todos los diccionarios en el selector
   Cambiar entre ellos instantáneamente
   Eliminar los que ya no necesites
   ```

## 🎓 Mejores Prácticas

✅ **Nombres Descriptivos**: "Diccionario Q1 2024" mejor que "Diccionario1"  
✅ **Versiones**: Guarda versiones antiguas con fecha  
✅ **Backup**: Exporta periódicamente tus diccionarios  
✅ **Pruebas**: Compara resultados con diccionario base primero  
✅ **Documentación**: Anota qué cambios hiciste en cada versión

## 📞 Enlaces Útiles

- **Servidor**: http://localhost:3000
- **Documentación Completa**: `MULTI-DICTIONARY-GUIDE.md`
- **API Reference**: `MULTI-DICTIONARY-IMPLEMENTATION.md`
- **Proyecto Original**: `README.md`

## ⚠️ Notas Importantes

1. **Diccionario Base** NO se puede eliminar (es la base del sistema)
2. **Puntuaciones** deben estar entre -5 y 5
3. **Archivos** se guardan en carpeta `dictionaries/`
4. **Cambios** son instantáneos al cambiar diccionario

---

## 🎉 ¡Listo para Usar!

```bash
# El servidor ya está corriendo en:
http://localhost:3000

# Prueba con:
ejemplo-diccionario-educacion.csv
```

**¿Dudas?** Consulta `MULTI-DICTIONARY-GUIDE.md` para más detalles.
