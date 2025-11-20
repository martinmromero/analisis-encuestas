# 🆕 Nueva Funcionalidad: Gestión de Múltiples Diccionarios

## ✨ ¿Qué hay de nuevo?

Se ha agregado soporte completo para **gestionar múltiples versiones de diccionarios** con importación desde archivos Excel.

### Características Principales

✅ **Múltiples Diccionarios**: Importa y guarda diferentes versiones sin perder las anteriores  
✅ **Soporte Excel/CSV**: Importa diccionarios desde archivos .xlsx, .xls o .csv  
✅ **Cambio Rápido**: Selector visual para cambiar entre diccionarios  
✅ **Gestión Completa**: Elimina diccionarios que ya no necesites  
✅ **Diccionario Base**: Siempre disponible como respaldo (894 palabras)

### Cómo Usar

1. **Ir a "Gestión de Diccionarios"** en la aplicación
2. **Click en "📤 Importar Diccionario"**
3. **Seleccionar archivo** Excel (.xlsx), CSV (.csv) o JSON (.json)
4. **Escribir nombre** descriptivo (ej: "Diccionario Educación V2")
5. **Confirmar** y el diccionario se guarda

### Formato de Archivo Excel/CSV

Tu archivo debe tener **2 columnas**:

| palabra | puntuacion |
|---------|------------|
| excelente | 5 |
| bueno | 3 |
| malo | -3 |
| terrible | -5 |

- **Columna 1**: palabra, word, Palabra (texto)
- **Columna 2**: puntuacion, score, puntaje (número -5 a 5)

### Ejemplo Incluido

Hay un archivo de ejemplo listo para usar:
```
ejemplo-diccionario-educacion.csv
```

Contiene 28 palabras relacionadas con contexto educativo.

### Documentación Completa

- **Guía de Uso**: Ver `MULTI-DICTIONARY-GUIDE.md`
- **Detalles Técnicos**: Ver `MULTI-DICTIONARY-IMPLEMENTATION.md`

### Cambios en la Interfaz

**Panel "Gestión de Diccionarios":**
```
┌────────────────────────────────────┐
│ Diccionario Activo:                │
│ [▼ Diccionario Base (894 palabras)]│
│ [ 🗑️ Eliminar ]                    │
│                                    │
│ [ 📤 Importar Diccionario ]        │
│ [ 📥 Exportar Diccionario ]        │
│ [ 🔄 Restaurar Original ]          │
└────────────────────────────────────┘
```

### API Endpoints Nuevos

- `GET /api/dictionaries` - Listar diccionarios
- `POST /api/dictionaries/activate` - Activar diccionario
- `DELETE /api/dictionaries/:fileName` - Eliminar diccionario
- `POST /api/dictionary/import` - Importar (mejorado con Excel)

---

**Actualización**: Enero 2024  
**Versión**: 2.1.0  
**Estado**: ✅ Completamente funcional
