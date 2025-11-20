# API Documentation - Sistema de Análisis de Sentimientos

## Base URL
```
http://localhost:3000
```

## Endpoints

### 1. Análisis con Motor Específico
**POST** `/api/analyze-with-engine`

Analiza un archivo Excel usando un motor de sentimientos específico.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Archivo Excel (.xlsx)
  - `engine`: Motor a utilizar
    - `"natural-enhanced"`: Natural.js con diccionario español
    - `"nlpjs"`: NLP.js motor de IA
    - `"dual"`: Análisis con ambos motores

#### Response
```json
{
  "success": true,
  "engine": "natural-enhanced",
  "results": [
    {
      "id": 1,
      "texto": "La clase fue excelente",
      "score": 8.5,
      "classification": "Muy Positivo",
      "palabras_clave": ["excelente"]
    }
  ],
  "stats": {
    "total": 100,
    "promedio": 7.2,
    "distribucion": {
      "muy_positivo": 45,
      "positivo": 30,
      "neutral": 15,
      "negativo": 8,
      "muy_negativo": 2
    }
  }
}
```

### 2. Comparación de Motores
**POST** `/api/analyze-compare`

Compara el análisis de un texto usando múltiples motores.

#### Request
```json
{
  "text": "Esta aplicación es fantástica",
  "engines": ["natural", "nlpjs"]
}
```

#### Response
```json
{
  "text": "Esta aplicación es fantástica",
  "results": {
    "natural": {
      "score": 8.5,
      "classification": "Muy Positivo",
      "palabras_clave": ["fantástica"]
    },
    "nlpjs": {
      "score": 9.2,
      "classification": "Muy Positivo",
      "sentiment": "positive",
      "confidence": 0.92
    },
    "_comparison": {
      "consensus": "Muy Positivo",
      "agreement": true,
      "confidence": 0.89
    }
  }
}
```

### 3. Información de Motores
**GET** `/api/engines`

Obtiene información sobre los motores disponibles.

#### Response
```json
{
  "engines": [
    {
      "id": "natural-enhanced",
      "name": "Natural.js Enhanced",
      "description": "Motor optimizado para español con diccionario de 894+ palabras",
      "effectiveness": "8.5/10",
      "recommended": true,
      "language": "es",
      "features": ["diccionario_personalizado", "palabras_clave"]
    },
    {
      "id": "nlpjs",
      "name": "NLP.js (AXA)",
      "description": "Motor de IA avanzado con soporte multiidioma",
      "effectiveness": "10.3/10",
      "recommended": true,
      "language": "multi",
      "features": ["ia_avanzada", "contexto_semantico", "confianza"]
    }
  ]
}
```

### 4. Análisis Dual de Archivo
**POST** `/api/analyze-dual-file`

Analiza un archivo usando ambos motores y genera consenso.

#### Request
- **Content-Type**: `multipart/form-data`
- **Body**:
  - `file`: Archivo Excel (.xlsx)

#### Response
```json
{
  "success": true,
  "engines_used": ["natural-enhanced", "nlpjs"],
  "results": [
    {
      "id": 1,
      "texto": "La clase fue excelente",
      "natural": {
        "score": 8.5,
        "classification": "Muy Positivo"
      },
      "nlpjs": {
        "score": 9.0,
        "classification": "Muy Positivo"
      },
      "consensus": {
        "score": 8.75,
        "classification": "Muy Positivo",
        "agreement": true
      }
    }
  ],
  "comparative_stats": {
    "total": 100,
    "agreement_rate": 0.85,
    "natural_avg": 7.2,
    "nlpjs_avg": 7.8,
    "consensus_avg": 7.5
  }
}
```

### 5. Generar Reporte Excel
**POST** `/api/generate-advanced-report`

Genera un reporte Excel avanzado con filtros y gráficos.

#### Request
```json
{
  "results": [...], // Datos del análisis
  "filters": {
    "carrera": true,
    "materia": true,
    "sede": true,
    "docente": true
  },
  "include_charts": true,
  "format": "professional"
}
```

#### Response
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Body**: Archivo Excel binario

### 6. Gestión de Diccionario de Sentimientos

El motor Natural.js Enhanced usa un diccionario español ampliado con posibilidad de personalización por el usuario. Estos endpoints permiten visualizar, añadir, actualizar, eliminar, exportar e importar entradas del diccionario personalizado. Nota: El diccionario personalizado afecta al motor Natural.js Enhanced. El motor NLP.js no utiliza este diccionario por defecto.

#### Obtener diccionario combinado
**GET** `/api/dictionary`

Devuelve la combinación del diccionario por defecto y el personalizado, indicando origen y tipo.

#### Agregar/override una palabra o frase
**POST** `/api/dictionary/add`

Body:
```json
{ "word": "excelente", "score": 5 }
```
Rango de score: -5 a 5. Si la palabra existe en el sistema, se crea un override de usuario.

#### Actualizar o renombrar una entrada
**PUT** `/api/dictionary/update`

Body:
```json
{ "oldWord": "regular", "newWord": "normalito", "score": 0.5 }
```
Si solo desea ajustar el score sin renombrar, use el mismo valor en `oldWord` y `newWord`.

#### Eliminar una entrada del diccionario de usuario
**DELETE** `/api/dictionary/remove/:word`

Elimina únicamente la entrada personalizada; la palabra del sistema (si existía) vuelve a aplicar su valor original.

#### Probar una palabra o frase
**POST** `/api/dictionary/test`

Body:
```json
{ "text": "muy bueno" }
```
Permite verificar cómo impacta el diccionario en el análisis.

#### Exportar/Importar diccionario personalizado
**GET** `/api/dictionary/export`

**POST** `/api/dictionary/import` (multipart/form-data con `dictionaryFile`)

#### Restaurar diccionario original
**POST** `/api/dictionary/reset`

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Archivo no válido",
  "code": "INVALID_FILE",
  "details": "El archivo debe ser formato Excel (.xlsx)"
}
```

### 413 Payload Too Large
```json
{
  "success": false,
  "error": "Archivo demasiado grande",
  "code": "FILE_TOO_LARGE",
  "details": "El archivo no puede superar los 50MB"
}
```

### 422 Unprocessable Entity
```json
{
  "success": false,
  "error": "Demasiados registros",
  "code": "TOO_MANY_RECORDS",
  "details": "El archivo contiene más de 5000 registros"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Error interno del servidor",
  "code": "INTERNAL_ERROR",
  "details": "Error procesando el análisis de sentimientos"
}
```

## Rate Limiting

- **Límite**: 100 requests por minuto por IP
- **Archivos**: Máximo 10 archivos por hora por IP
- **Headers de respuesta**:
  - `X-RateLimit-Limit`: Límite total
  - `X-RateLimit-Remaining`: Requests restantes
  - `X-RateLimit-Reset`: Timestamp de reset

## Formatos de Archivo Soportados

### Archivos Excel
- **Extensiones**: `.xlsx`, `.xls`
- **Tamaño máximo**: 50MB
- **Registros máximos**: 5000 por archivo
- **Encoding**: UTF-8 recomendado
- **Estructura**: Cualquier número de columnas, una debe contener texto para análisis

### Estructura Esperada
```
| ID | Comentario | Carrera | Materia | Docente | Sede |
|----|------------|---------|---------|---------|------|
| 1  | Excelente clase | Ingeniería | Matemáticas | Dr. López | Campus Norte |
| 2  | Muy confuso | Medicina | Anatomía | Dra. García | Campus Sur |
```

## Escalas de Sentimiento

### Natural.js Enhanced
- **Rango**: -10 a +10
- **Clasificación**:
  - `Muy Negativo`: -10 a -3
  - `Negativo`: -2.9 a -0.1
  - `Neutral`: 0
  - `Positivo`: 0.1 a 2.9
  - `Muy Positivo`: 3 a 10

### NLP.js
- **Rango**: 0 a 1 (confidence)
- **Sentimientos**: `positive`, `negative`, `neutral`
- **Conversión a escala 10**: Automática
- **Clasificación**: Similar a Natural.js

## Ejemplos de Uso

### cURL Examples

#### Análisis simple
```bash
curl -X POST http://localhost:3000/api/analyze-with-engine \
  -F "file=@encuesta.xlsx" \
  -F "engine=natural-enhanced"
```

#### Comparación de motores
```bash
curl -X POST http://localhost:3000/api/analyze-compare \
  -H "Content-Type: application/json" \
  -d '{"text":"Esta clase es excelente","engines":["natural","nlpjs"]}'
```

### JavaScript Examples

#### Análisis de archivo
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('engine', 'natural-enhanced');

fetch('/api/analyze-with-engine', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

#### Obtener información de motores
```javascript
fetch('/api/engines')
.then(response => response.json())
.then(engines => {
  engines.engines.forEach(engine => {
    console.log(`${engine.name}: ${engine.effectiveness}`);
  });
});
```