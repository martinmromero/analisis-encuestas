# 📋 Guía de Configuración de Columnas

## Archivo: `column-config.js`

Este archivo permite configurar cómo la aplicación procesa las diferentes columnas de tus archivos Excel/CSV de encuestas.

## ¿Cuándo editar este archivo?

Edita `column-config.js` cuando:
- ✏️ **Cambien los nombres de las columnas** en tus encuestas
- ➕ **Agregues nuevas preguntas** numéricas o de texto libre
- 🔄 **Modifiques la estructura** del formulario de encuestas
- 🎯 **Quieras ajustar** qué columnas se analizan para sentimiento

## Estructura del Archivo

### 1. `identificacion` - Columnas de Datos Filiatorios

Estas columnas **NO se analizan** para sentimiento. Se usan para:
- Filtrar resultados por carrera, sede, docente, etc.
- Generar reportes agrupados
- Identificar cada encuesta

```javascript
identificacion: [
  'ID',
  'CARRERA',
  'MODALIDAD', 
  'SEDE',
  'MATERIA',
  'DOCENTE',
  'COMISION'
]
```

**💡 Cómo editar:** Si cambias el nombre de una columna en tu Excel (por ejemplo, de "CARRERA" a "NOMBRE_CARRERA"), actualízalo aquí también.

---

### 2. `numericas` - Preguntas con Escala Numérica

Estas columnas contienen **valores numéricos** (escalas 1-10, etc.) y **NO se analizan** para sentimiento.

```javascript
numericas: [
  'La asignatura cumple con lo expresado en el programa analítico',
  'El docente demostró dominio de los contenidos de la materia',
  // ... más preguntas
]
```

**💡 Cómo editar:**
- **Agregar pregunta nueva:** Copia el formato exacto del nombre de columna del Excel
- **Eliminar pregunta:** Quita la línea correspondiente
- **Cambiar texto:** Actualiza para que coincida EXACTAMENTE con el Excel

**⚠️ Importante:** El texto debe coincidir 100% con el nombre de columna en el Excel (mayúsculas, tildes, puntos, etc.)

---

### 3. `textoLibre` - Columnas para Análisis de Sentimiento

Estas columnas **SÍ se analizan** para detectar sentimientos positivos/negativos.

```javascript
textoLibre: [
  'Si su respuesta se ubica entre 1 y 6, por favor indique los motivos',
  'comentarios',
  'observaciones',
  'sugerencias'
]
```

**💡 Cómo funciona:** Si el nombre de UNA columna CONTIENE cualquiera de estos textos, será analizada.

**Ejemplos:**
- `'motivos'` → detectará columnas como "indique los motivos" o "motivos de su respuesta"
- `'comentarios'` → detectará "Comentarios adicionales", "Comentarios finales", etc.

**💡 Cómo agregar:** Añade palabras clave que identifiquen tus columnas de texto libre.

---

### 4. `analisis` - Parámetros de Análisis

Configuración técnica del análisis:

```javascript
analisis: {
  longitudMinimaTextoLibre: 10,    // Mínimo 10 caracteres para analizar
  longitudMinimaOtros: 20,          // Mínimo 20 para otras columnas
  longitudMaximaAlmacenada: 200    // Máximo a guardar (para optimizar)
}
```

**💡 Ajusta según tus necesidades:**
- Si recibes muchos comentarios cortos, baja `longitudMinimaTextoLibre` a 5
- Si solo quieres comentarios largos, sube `longitudMinimaOtros` a 30

---

### 5. `filtros` - Mapeo para Dropdowns

Define exactamente qué columnas usar para cada filtro en la interfaz:

```javascript
filtros: {
  carrera: 'CARRERA',
  materia: 'MATERIA',
  sede: 'SEDE',
  docente: 'DOCENTE'
}
```

**💡 Si tus columnas tienen otros nombres:**
```javascript
filtros: {
  carrera: 'NOMBRE_CARRERA',
  materia: 'ASIGNATURA',
  sede: 'CAMPUS',
  docente: 'PROFESOR'
}
```

---

## 🔄 Aplicar Cambios

Después de editar `column-config.js`:

1. **Guarda el archivo** (Ctrl+S)
2. **Reinicia el servidor:**
   - Detén con `Ctrl+C`
   - Inicia con `npm start`
3. **Recarga la página** en el navegador (F5)

---

## 📝 Ejemplo Completo: Agregar Nueva Pregunta Numérica

**Escenario:** Agregaste una nueva pregunta en tu encuesta:
> "¿El horario de la materia fue adecuado?"

**Pasos:**

1. Abre `column-config.js`
2. Busca la sección `numericas:`
3. Agrega una nueva línea al final:
   ```javascript
   numericas: [
     // ... preguntas existentes ...
     '¿Cómo evalúa el desempeño general del/la docente durante la cursada?',
     '¿El horario de la materia fue adecuado?'  // ← NUEVA
   ],
   ```
4. Guarda y reinicia el servidor

✅ Ahora esta columna será reconocida como numérica y NO se analizará su sentimiento.

---

## 🐛 Solución de Problemas

### Los filtros están vacíos
- ✅ Verifica que los nombres en `filtros:` coincidan EXACTAMENTE con tu Excel
- ✅ Revisa la consola del servidor, debe mostrar: "📋 Columnas encontradas en el Excel:"
- ✅ Compara los nombres mostrados con los de `column-config.js`

### Una columna de texto NO se está analizando
- ✅ Asegúrate que NO esté en `identificacion` ni en `numericas`
- ✅ Agrega una palabra clave a `textoLibre` que identifique esa columna
- ✅ Verifica que el texto tenga más de `longitudMinimaTextoLibre` caracteres

### Una columna numérica SÍ se está analizando (error)
- ✅ Agrega el nombre exacto de esa columna a la lista `numericas`

---

## 📞 ¿Necesitas ayuda?

Si tienes dudas:
1. Revisa los logs del servidor (consola donde ejecutas `npm start`)
2. Busca el mensaje "📋 Columnas encontradas en el Excel:"
3. Compara esos nombres con los de `column-config.js`

---

**Última actualización:** Noviembre 2025
