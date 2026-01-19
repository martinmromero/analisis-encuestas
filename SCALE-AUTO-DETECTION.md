# 📏 Detección Automática de Escalas Numéricas

## ✨ Nuevas Funcionalidades

### Detección Inteligente de Escalas

El sistema ahora detecta automáticamente las escalas numéricas de las columnas al analizar el contenido del archivo Excel:

#### 🔍 Tipos de Detección

1. **Escalas con Etiquetas** (Formato "1. Opción", "5. Excelente")
   - Detecta patrones: `1. Texto`, `2- Texto`, `3: Texto`, `4) Texto`
   - Extrae automáticamente el rango (min-max)
   - Guarda las etiquetas asociadas a cada valor
   
   **Ejemplo:**
   ```
   1. Totalmente en desacuerdo
   2. En desacuerdo
   3. Neutral
   4. De acuerdo
   5. Totalmente de acuerdo
   ```
   → Detecta escala 1-5 automáticamente

2. **Escalas Numéricas Puras**
   - Detecta valores numéricos puros en rangos 0-10
   - Calcula min y max automáticamente
   
   **Ejemplo:**
   ```
   1, 2, 3, 4, 5
   ```
   → Detecta escala 1-5 automáticamente

### 🎯 Configuración Automática

Cuando creas una nueva configuración:

1. **Análisis Inteligente**: El servidor analiza 100 registros de muestra
2. **Clasificación Automática**: Identifica columnas numéricas vs texto vs identificación
3. **Detección de Escalas**: Para columnas numéricas, detecta el rango automáticamente
4. **Configuración Previa**: Al editar una columna numérica, el modal sugiere la escala detectada

### 📊 Indicadores Visuales

- **Badge de Detección**: Cuando se detecta una escala automáticamente, aparece un badge morado "✨ Escala detectada automáticamente"
- **Valores Prellenados**: Los campos min/max se llenan con los valores detectados
- **Fallback Inteligente**: Si no se detecta escala, usa 1-5 como valor por defecto

## 🛠️ Mejoras Técnicas

### Backend (server.js)

#### `analyzeColumnsContent()`
- Añadida detección de escalas en el análisis principal
- Detecta patrones `/^(\d+)\s*[.\-:)]\s*(.+)$/`
- Calcula min/max de valores numéricos puros
- Incluye información de escala en el resultado:
  ```javascript
  {
    type: 'numerica',
    confidence: 'high',
    scale: {
      min: 1,
      max: 10,
      direction: 'ascending',
      pattern: 'labeled',
      labels: { '1': 'Malo', '10': 'Excelente' }
    }
  }
  ```

### Frontend (column-config-manager.js)

#### `autoClassifyColumns()`
- Ahora incluye propiedad `escalas` en la configuración
- Guarda automáticamente escalas detectadas
- Log de escalas detectadas en consola

#### `openScaleConfigModal()`
- Intenta usar escala detectada antes de valores por defecto
- Muestra badge visual cuando usa detección automática
- Prioridad: Configuración guardada → Escala detectada → Default (1-5)

### UI (index.html + styles.css)

- Añadido badge `autoDetectedBadge` con gradiente morado
- Estilos modernos con sombra y gradiente
- Clase `.hidden` para mostrar/ocultar dinámicamente

## 📖 Uso

### Para el Usuario

1. **Sube tu archivo Excel** como siempre
2. **Haz clic en "Detectar Columnas"**
   - El sistema analiza automáticamente el contenido
   - Clasifica columnas (ID, numéricas, texto)
   - **¡Detecta escalas automáticamente!**

3. **Revisa la configuración**
   - Las columnas numéricas ya tienen su escala detectada
   - Verás indicadores de confianza (✓ alta, ~ media, ? baja)

4. **Edita si es necesario**
   - Al hacer clic en ⚙️ de una columna numérica
   - El modal se abre con los valores detectados prellenados
   - Verás el badge morado si fue detectado automáticamente
   - Puedes ajustar si es necesario

### Ejemplos de Detección

#### Caso 1: Likert Estándar
```
Columna: "Calidad del servicio"
Valores en Excel:
  1. Muy malo
  2. Malo
  3. Regular
  4. Bueno
  5. Muy bueno

→ Detecta: Escala 1-5, dirección ascendente
```

#### Caso 2: NPS (Net Promoter Score)
```
Columna: "¿Recomendarías el producto?"
Valores en Excel:
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10

→ Detecta: Escala 0-10, dirección ascendente
```

#### Caso 3: Escala Personalizada
```
Columna: "Nivel de satisfacción"
Valores en Excel:
  1- Nada satisfecho
  7- Muy satisfecho

→ Detecta: Escala 1-7, dirección ascendente
```

## 🔧 Configuración Manual

Si la detección automática no es correcta:

1. Haz clic en el ícono ⚙️ de la columna
2. Ajusta manualmente min/max
3. Selecciona dirección (ascendente/descendente)
4. ✅ Guardar

## 💡 Consejos

- **Formatos Reconocidos**: "1. Texto", "1- Texto", "1: Texto", "1) Texto"
- **Valores Puros**: Números del 0-10 o 1-5
- **Dirección**: Por defecto es ascendente (1=malo, 5=bueno)
- **Aplicar a Todas**: Checkbox para usar la misma escala en todas las columnas numéricas

## 📝 Logs de Debug

En la consola del navegador verás:
```
🔍 Análisis de columnas completado:
  ID: identificacion (high) - Campo identificador
  Carrera: identificacion (high) - 45 valores únicos de 100 (45%)
  Pregunta 1: numerica (high) - Escala con etiquetas (ej: "1. Opción") [1-5]
  Pregunta 2: numerica (high) - Valores numéricos (1-10), escala de evaluación [1-10]
  Comentarios: textoLibre (high) - Texto promedio 145 caracteres

📏 Escalas detectadas: 2 columnas
📏 Usando escala detectada para "Pregunta 1": 1-5
📏 Usando escala detectada para "Pregunta 2": 1-10
```

## 🎉 Beneficios

- ⏱️ **Ahorra tiempo**: No necesitas configurar manualmente cada escala
- 🎯 **Mayor precisión**: Detecta el rango real de tus datos
- 🔄 **Flexibilidad**: Puedes ajustar manualmente si es necesario
- 📊 **Mejor análisis**: Escalas correctas = métricas más precisas
