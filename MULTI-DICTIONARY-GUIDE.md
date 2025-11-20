# 📚 Guía de Gestión de Diccionarios Múltiples

## 🎯 Nueva Funcionalidad Implementada

La aplicación ahora soporta **múltiples versiones de diccionarios** que puedes importar, guardar y cambiar entre ellas sin perder versiones anteriores.

## ✨ Características

### 1. **Múltiples Diccionarios**
- Cada diccionario se guarda con un nombre único
- Puedes tener varios diccionarios guardados simultáneamente
- Cambio rápido entre diccionarios con un selector

### 2. **Formatos Soportados**
- **JSON**: Formato tradicional
- **Excel (.xlsx)**: Nuevo soporte para archivos Excel
- **CSV (.csv)**: Compatible con Excel

### 3. **Gestión Completa**
- ✅ Importar nuevos diccionarios
- ✅ Cambiar entre diccionarios
- ✅ Eliminar diccionarios
- ✅ Diccionario base siempre disponible

## 📝 Cómo Usar

### Importar un Diccionario

1. **Preparar archivo Excel/CSV** con dos columnas:
   ```
   palabra       | puntuacion
   --------------|------------
   excelente     | 5
   bueno         | 3
   malo          | -3
   ```

2. **En la aplicación**:
   - Ir a "Gestión de Diccionarios"
   - Click en "📤 Importar Diccionario"
   - Seleccionar archivo (.json, .xlsx, .xls, .csv)
   - Escribir un nombre descriptivo (ej: "Diccionario Educación V2")
   - Confirmar

3. **Resultado**: El diccionario se guarda y aparece en el selector

### Cambiar Diccionario Activo

1. **Usar el selector** en el panel de Gestión de Diccionarios
2. **Seleccionar** el diccionario deseado
3. El análisis de sentimientos ahora usa ese diccionario

### Eliminar un Diccionario

1. **Seleccionar** el diccionario a eliminar
2. Click en el botón **🗑️ Eliminar**
3. Confirmar la eliminación
4. El diccionario base se activa automáticamente

## 📊 Formato de Archivo Excel/CSV

### Columnas Requeridas

El archivo debe tener **exactamente 2 columnas**:

| Nombre Columna | Valores Aceptados |
|----------------|-------------------|
| `palabra` o `word` | Texto (palabra/frase) |
| `puntuacion` o `score` | Número entre -5 y 5 |

### Ejemplo de Excel

```
| palabra       | puntuacion |
|---------------|------------|
| excelente     | 5          |
| bueno         | 3          |
| regular       | 0          |
| malo          | -3         |
| terrible      | -5         |
```

### Variantes de Nombres de Columna

Se aceptan estos nombres (no importa mayúsculas/minúsculas):
- **Para palabras**: `palabra`, `word`, `Palabra`, `Word`
- **Para puntuación**: `puntuacion`, `score`, `puntaje`, `Puntuacion`, `Score`, `Puntaje`

## 🔧 Estructura Técnica

### Almacenamiento

Los diccionarios se guardan en:
```
analisis-encuestas/
  dictionaries/
    Mi_Diccionario_V1.json
    Diccionario_Educacion.json
    ...
```

### Formato Interno (JSON)

```json
{
  "name": "Mi Diccionario V1",
  "created": "2024-01-15T10:30:00.000Z",
  "wordCount": 150,
  "dictionary": {
    "excelente": 5,
    "bueno": 3,
    "malo": -3
  }
}
```

## 📋 API Endpoints

### Listar Diccionarios
```
GET /api/dictionaries
```
Devuelve lista de todos los diccionarios disponibles.

### Importar Diccionario
```
POST /api/dictionary/import
FormData: {
  dictionaryFile: File (JSON/Excel/CSV),
  dictionaryName: String
}
```

### Activar Diccionario
```
POST /api/dictionaries/activate
Body: { fileName: "nombre_archivo" }
```

### Eliminar Diccionario
```
DELETE /api/dictionaries/:fileName
```

## 🎓 Ejemplo de Uso Práctico

### Escenario: Encuestas de Educación Superior

1. **Diccionario Base** (894 palabras): Para uso general

2. **Diccionario Educación** (personalizado):
   - Importar términos específicos de educación
   - Palabras: "didáctico", "pedagógico", "metodología"
   - Puntajes ajustados al contexto educativo

3. **Diccionario Inglés-Español** (si aplica):
   - Para encuestas multilingües
   - Términos técnicos traducidos

4. **Cambio Dinámico**:
   - Analizar con Diccionario Educación
   - Comparar resultados con Diccionario Base
   - Ver diferencias en sentimiento

## ⚠️ Validaciones

- **Puntuaciones**: Deben estar entre -5 y 5
- **Formato**: Archivo debe ser .json, .xlsx, .xls o .csv
- **Palabras**: Se limpian (lowercase, trim)
- **Duplicados**: Última versión sobrescribe

## 🚀 Ejemplo Incluido

Hay un archivo de ejemplo en:
```
ejemplo-diccionario-educacion.csv
```

Contiene 28 palabras relacionadas con educación.

## 🔄 Compatibilidad

- **Diccionario Base**: Siempre disponible (no se puede eliminar)
- **Diccionarios Antiguos**: Compatible con formato JSON anterior
- **Migración**: No requiere cambios en datos existentes

## 💡 Consejos

1. **Nombres Descriptivos**: Usa nombres claros como "Diccionario Q1 2024"
2. **Versiones**: Mantén versiones por fecha o propósito
3. **Backup**: Exporta diccionarios importantes periódicamente
4. **Comparación**: Usa la sección "Comparar Motores" para ver diferencias

## 🐛 Solución de Problemas

### "No se encontraron palabras válidas"
- Verifica que el archivo tenga las columnas correctas
- Revisa que las puntuaciones estén entre -5 y 5

### "Formato de archivo no soportado"
- Usa solo .json, .xlsx, .xls o .csv
- Verifica que el archivo no esté corrupto

### "No se puede eliminar el diccionario base"
- El diccionario base es permanente
- Solo se pueden eliminar diccionarios importados

## 📞 Referencia Rápida

| Acción | Pasos |
|--------|-------|
| Importar | 📤 Botón → Archivo → Nombre → ✅ |
| Cambiar | Selector → Elegir → Aplicado |
| Eliminar | Selector → 🗑️ Botón → Confirmar |
| Ver activo | Selector (opción seleccionada) |
