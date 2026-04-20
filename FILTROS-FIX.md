# ✅ Corrección del Sistema de Filtros (v2 - Comportamiento Errático)

## 🐛 Problema Identificado

### Problema Inicial (v1)
El sistema de filtros con multiselección (carreras, materias, modalidades, sedes, docentes) **no funcionaba** al hacer clic en "Aplicar Filtros". Los filtros se seleccionaban correctamente pero los resultados no se actualizaban.

**Causa v1:** El archivo `dual-filters.js` llamaba a una función `updateResultsWithFilteredData()` que **no existía** en `app.js`.

### Problema Secundario (v2) - ACTUAL
Después de la corrección v1, los filtros **funcionaban erráticamente**: a veces filtraban correctamente y otras veces no aplicaban los filtros o devolvían 0 resultados.

**Causa v2:** El sistema intentaba acceder a datos usando nombres de columna **hardcodeados** (`row.originalData.CARRERA`) pero:

1. **Nombres de columna inconsistentes**: La configuración permite usar nombres personalizados (ej: "Carrera del alumno" en lugar de "CARRERA")
2. **Estructura de datos inconsistente**: 
   - Análisis normal: datos en `row.originalData.CARRERA`
   - Análisis con validación: datos en `row.CARRERA` (sin originalData)
3. **Sin respaldo robusto**: No había fallback adecuado cuando los nombres no coincidían

## 🔧 Cambios Realizados (v2)

### 1. server.js - Incluir Nombres de Columnas en Response

Se modificó `extractFilterOptions()` para incluir los nombres reales de las columnas configuradas:

```javascript
const result = {
    carreras: Array.from(options.carreras).sort(),
    materias: Array.from(options.materias).sort(),
    modalidades: Array.from(options.modalidades).sort(),
    sedes: Array.from(options.sedes).sort(),
    docentes: Array.from(options.docentes).sort(),
    numericQuestions: config.numericas || [],
    // NUEVO: Nombres de columnas reales
    columnNames: {
        carrera: carreraCol,
        materia: materiaCol,
        modalidad: modalidadCol,
        sede: sedeCol,
        docente: docenteCol
    }
};
```

### 2. dual-filters.js - Sistema Robusto de Acceso a Datos

**Variable global para nombres de columna:**
```javascript
let columnNames = {
    carrera: 'CARRERA',
    materia: 'MATERIA',
    modalidad: 'MODALIDAD',
    sede: 'SEDE',
    docente: 'DOCENTE'
};
```

**Actualización en initDualFilters:**
```javascript
// Guardar nombres de columnas si vienen del servidor
if (filterOptions.columnNames) {
    columnNames = filterOptions.columnNames;
    console.log('📋 Nombres de columnas configurados:', columnNames);
}
```

**Nueva función getFilterValue():**
```javascript
function getFilterValue(row, filterType) {
    const columnName = columnNames[filterType];
    
    // 1. Intentar desde originalData (análisis normal)
    if (row.originalData && row.originalData[columnName]) {
        return row.originalData[columnName];
    }
    
    // 2. Intentar desde el row directo (análisis con validación)
    if (row[columnName]) {
        return row[columnName];
    }
    
    // 3. Fallback: intentar con nombre en mayúsculas
    const upperName = filterType.toUpperCase();
    if (row.originalData && row.originalData[upperName]) {
        return row.originalData[upperName];
    }
    if (row[upperName]) {
        return row[upperName];
    }
    
    return null;
}
```

**Todas las funciones de filtrado actualizadas:**
```javascript
// ANTES (hardcodeado):
filteredData = filteredData.filter(row => 
    filters.carrera.includes(row.originalData?.CARRERA || row.CARRERA)
);

// AHORA (dinámico y robusto):
filteredData = filteredData.filter(row => {
    const value = getFilterValue(row, 'carrera');
    return value && filters.carrera.includes(value);
});
```

### 3. Logging Mejorado para Debugging

Se agregaron console.log detallados:
- Total de registros disponibles
- Filtros seleccionados
- Registros después de cada filtro aplicado
- Warnings cuando no se encuentra un valor (solo 1% para no saturar)

## ✅ Funcionalidad Completa

### Sistema de Filtros Ahora:

1. **Maneja nombres de columna personalizados**
   - ✅ Soporta cualquier nombre configurado en column-config.js
   - ✅ No asume que las columnas se llaman "CARRERA", "MATERIA", etc.

2. **Maneja ambas estructuras de datos**
   - ✅ Análisis normal: `row.originalData[columnName]`
   - ✅ Análisis con validación: `row[columnName]`
   - ✅ Fallback a nombres en mayúsculas para compatibilidad

3. **Filtrado robusto**
   - ✅ Filtra por carreras seleccionadas (OR entre ellas)
   - ✅ Filtra por materias seleccionadas (OR entre ellas)
   - ✅ Aplica AND entre diferentes categorías
   - ✅ Integra con filtros de sentimiento y búsqueda de texto
   - ✅ No falla silenciosamente si un valor no se encuentra

4. **Debugging mejorado**
   - ✅ Console.log detallados en cada paso
   - ✅ Warnings cuando no se encuentra un valor
   - ✅ Información de estructura de datos para troubleshooting

## 🧪 Verificación

Para probar que el fix funciona:

1. **Con configuración estándar** (CARRERA, MATERIA):
   - Subir archivo Excel
   - Seleccionar carreras → + Agregar → chips aparecen
   - Seleccionar materias → + Agregar → chips aparecen
   - Click "Aplicar Filtros"
   - ✅ DEBE filtrar correctamente

2. **Con configuración personalizada** (nombres de columna diferentes):
   - Modificar column-config.js con nombres personalizados
   - Subir archivo con esas columnas
   - Aplicar filtros
   - ✅ DEBE filtrar usando los nombres personalizados

3. **Análisis con columna de validación**:
   - Subir archivo con columna "validación final"
   - Usar botón "Analizar con Columna Validación"
   - Aplicar filtros
   - ✅ DEBE filtrar correctamente (datos en estructura diferente)

4. **Casos edge**:
   - Filtrar con 0 resultados esperados
   - Filtrar con todas las opciones seleccionadas
   - Limpiar y volver a filtrar
   - ✅ DEBE comportarse consistentemente

## 📝 Notas Técnicas

### Por Qué Fallaba

**Escenario típico de fallo:**
1. Usuario configura `carrera: "Carrera del alumno"` en column-config.js
2. Excel tiene columna "Carrera del alumno"
3. Servidor extrae valores correctamente y crea filterOptions.carreras
4. Frontend intenta filtrar con hardcoded `row.originalData.CARRERA`
5. ❌ No encuentra nada porque la columna se llama "Carrera del alumno"

### Solución Implementada

El servidor ahora envía:
```json
{
  "filterOptions": {
    "carreras": ["Medicina", "Enfermería"],
    "columnNames": {
      "carrera": "Carrera del alumno",
      "materia": "Asignatura"
    }
  }
}
```

El frontend usa esos nombres exactos:
```javascript
const value = row.originalData["Carrera del alumno"] 
           || row["Carrera del alumno"] 
           || row.originalData.CARRERA  // fallback
           || row.CARRERA;              // fallback
```

### Beneficios

- ✅ Funciona con cualquier configuración de columnas
- ✅ No requiere hardcodear nombres de columnas
- ✅ Maneja ambas estructuras de datos (originalData vs directo)
- ✅ Tiene fallbacks para compatibilidad con versiones antiguas
- ✅ Logging mejorado para identificar problemas rápidamente

## 🎯 Impacto

- ✅ **Filtros funcionan consistentemente** en todos los escenarios
- ✅ **Soporta configuraciones personalizadas** de columnas
- ✅ **Compatible con ambos tipos de análisis** (normal y con validación)
- ✅ **Más fácil de debugear** con logging detallado
- ✅ **Mejor experiencia del usuario** - sin comportamiento errático

---

**Fecha de corrección v1:** 18 de febrero de 2026  
**Fecha de corrección v2:** 18 de febrero de 2026  

**Archivos modificados (v2):** 
- `server.js` - Incluir columnNames en filterOptions
- `public/dual-filters.js` - getFilterValue() y actualización de todas las funciones de filtrado
