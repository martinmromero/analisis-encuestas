# Sistema de Análisis de Sentimientos para Encuestas 📊🎓# Sistema de Análisis de Sentimientos para Encuestas 📊🎓



[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[![Spanish](https://img.shields.io/badge/Optimizado%20para-Español-red.svg)](README.md)[![Spanish](https://img.shields.io/badge/Optimizado%20para-Español-red.svg)](README.md)

[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](Dockerfile)

Sistema web completo para el análisis de sentimientos de encuestas educativas en español, con múltiples motores de análisis y generación avanzada de reportes en Excel.

Sistema web completo para el análisis de sentimientos de encuestas educativas en español, con múltiples motores de análisis JavaScript y generación avanzada de reportes en Excel.

## 📋 Tabla de Contenidos

- [🚀 Características](#-características)
- [📊 Métricas Calculadas](#-métricas-calculadas)
- [🧠 Motores de Análisis](#-motores-de-análisis)
- [🛠️ Tecnologías Utilizadas](#️-tecnologías-utilizadas)
- [💻 Instalación](#-instalación)
- [🔧 Uso de la Aplicación](#-uso-de-la-aplicación)
- [📚 Documentación Técnica](#-documentación-técnica)
  - [📐 Guía de Cálculo de Métricas](GUIA-CALCULOS-METRICAS.md) ⭐ **Fórmulas y ejemplos detallados**
  - [📑 Índice Completo de Documentación](DOCUMENTACION-INDICE.md) 📖 **Navegación por todas las guías**
- [🐛 Solución de Problemas](#-solución-de-problemas)
- [🔄 Roadmap](#-roadmap)
- [📄 Licencia](#-licencia)

---

## 🚀 Características

- **📁 Subida de archivos Excel**: Soporta formatos .xlsx y .xls
- **🧠 Análisis de sentimientos**: Dos motores JavaScript especializados en español
- **📊 Visualizaciones interactivas**: Gráficos dinámicos con Chart.js
- **🔍 Filtros y búsqueda**: Filtra resultados por sentimiento o busca texto específico
- **💾 Exportación de datos**: Descarga resultados en JSON, CSV o reportes Excel avanzados
- **📚 Diccionario personalizable**: Gestión completa de términos de sentimiento
- **⚙️ Configuración de columnas**: Clasifica columnas interactivamente (ID, numéricas, cualitativas)
- **🐳 Dockerizado**: Desarrollo local con hot-reload y producción optimizada
- **🎨 Interfaz moderna**: Diseño responsivo y fácil de usar

## 📊 Métricas Calculadas

### 📈 Análisis Cuantitativo (Preguntas Numéricas)

**Qué se calcula:**
```
Promedio por pregunta = Σ(respuestas_válidas) / cantidad_respuestas

Ejemplo: Pregunta "El docente demostró dominio de los contenidos"
  Respuestas: [10, 9, 10, 8, 10, 9, 10]
  Promedio: (10+9+10+8+10+9+10) / 7 = 9.43/10
```

**Incluye:**
- ✅ Promedio por cada pregunta de escala (1-10)
- ✅ Cantidad de respuestas válidas
- ✅ Código de colores según rendimiento (verde ≥8, amarillo ≥6, naranja ≥4, rojo <4)

### 🎭 Análisis Cualitativo (Comentarios de Texto Libre)

**Qué se calcula:**
```
Score de sentimiento = Σ(palabras_positivas) - Σ(palabras_negativas)

Escala: -5 (muy negativo) a +5 (muy positivo)

Ejemplo: "Excelente profesor pero muy desorganizado"
  Positivas: "excelente" (+5), "profesor" (+0) = +5
  Negativas: "desorganizado" (-3) = -3
  Score final: +5 - 3 = +2 (Positivo)

Confianza = (palabras_reconocidas / total_palabras) × 80%
Intensidad = |Score| / 5 × 100%
```

**Incluye:**
- ✅ Clasificación: Muy Positivo, Positivo, Neutral, Negativo, Muy Negativo
- ✅ Score numérico (-5 a +5)
- ✅ Porcentaje de confianza (basado en palabras reconocidas del diccionario)
- ✅ Intensidad del sentimiento (0-100%)
- ✅ Palabras clave positivas y negativas detectadas
- ✅ Distribución porcentual por categoría
- ✅ Promedio global de sentimientos

**📐 Ver detalles completos en:** [GUIA-CALCULOS-METRICAS.md](GUIA-CALCULOS-METRICAS.md)

### 🚫 Palabras Ignoradas vs Diccionario

**Concepto importante**: El sistema distingue entre palabras que deben ignorarse y palabras con puntaje:

#### Palabras Ignoradas (Primera Verificación)
```
Regla: Solo se ignoran cuando el texto COMPLETO coincide exactamente

Ejemplos:
✅ "nada" → Se ignora (coincide exactamente)
❌ "no enseña nada" → NO se ignora (es una frase más larga)
```

**Palabras ignoradas típicas**: `-`, `.`, `sin comentarios`, `n/a`, `nada` (aislado)

#### Diccionario de Sentimientos (Segunda Verificación)
```
Si el texto NO fue ignorado, se buscan coincidencias:

Prioridad 1: Frases completas
  "no enseña nada": -3
  "me parece excelente": +4

Prioridad 2: Palabras individuales
  "excelente": +5
  "bueno": +3
```

**Ejemplo práctico**:
```
Configuración:
  - Palabras ignoradas: ["nada"]
  - Diccionario: {"no enseña nada": -3}

Resultados:
  Texto: "nada" → IGNORADO (no se analiza)
  Texto: "no enseña nada" → Score: -3 (negativo)
```

💡 **Mejor práctica**: Si defines frases como "no enseña nada" en el diccionario, agrega "nada" (aislado) a palabras ignoradas para evitar confusiones.

📚 **Guía completa**: Ver [SENTIMENT-GUIDE.md](SENTIMENT-GUIDE.md) para detalles técnicos

## 🧠 Motores de Análisis

### Natural.js Enhanced 🎯
- Diccionario personalizado de **569+ palabras y frases** en español (v4)
- Análisis de negaciones ("no es bueno" → negativo)
- Detección de frases contextuales
- **Personalizable** desde la UI

### NLP.js (AXA Group) 🚀
- Motor de IA avanzado con soporte nativo multiidioma
- Procesamiento de lenguaje natural completo
- Alta precisión en contextos complejos

### Análisis Dual ⚖️
- Combina ambos motores para máxima precisión
- Genera consenso inteligente entre resultados
- Mayor confiabilidad en textos ambiguos

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js 20+**: Runtime de JavaScript
- **Express.js**: Framework web minimalista
- **Multer**: Manejo de archivos subidos
- **XLSX**: Procesamiento de archivos Excel
- **ExcelJS**: Generación de reportes Excel avanzados
- **Sentiment**: Análisis de sentimientos con diccionario personalizado
- **NLP.js**: Motor de procesamiento de lenguaje natural de AXA Group
- **CORS**: Habilitación de peticiones cross-origin

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con gradientes y animaciones
- **JavaScript ES6+**: Funcionalidad interactiva
- **Chart.js**: Visualizaciones de datos

- **ExcelJS**: Generación de reportes Excel avanzados- **HTML5**: Estructura semántica

- **Sentiment**: Análisis de sentimientos con diccionario personalizado- **CSS3**: Estilos modernos con gradientes y animaciones

- **NLP.js**: Motor de procesamiento de lenguaje natural de AXA Group- **JavaScript ES6+**: Funcionalidad interactiva

- **CORS**: Habilitación de peticiones cross-origin- **Chart.js**: Visualizaciones de datos



### Frontend### Motores de Análisis de Sentimientos

- **HTML5**: Estructura semántica- **Natural.js Enhanced**: Motor personalizado con diccionario español de 894+ palabras/frases

- **CSS3**: Estilos modernos con gradientes y animaciones- **NLP.js (AXA)**: Motor avanzado con soporte nativo multiidioma

- **JavaScript ES6+**: Funcionalidad interactiva

- **Chart.js**: Visualizaciones de datos## 📦 Instalación



## 📦 Instalación Rápida1. **Clonar o descargar el proyecto**

   ```bash

### Opción 1: Docker (Recomendado)   cd analisis-encuestas

   ```

**Desarrollo con edición en vivo:**

```powershell2. **Instalar dependencias**

docker compose --profile dev up --build   ```bash

```   npm install

Navega a http://localhost:3000 y edita el código localmente - se recarga automáticamente.   ```



**Producción:**3. **Iniciar el servidor**

```powershell   ```bash

docker compose --profile prod up -d --build   npm start

```   ```

   

### Opción 2: Instalación Local

   ## 🐳 Docker

1. **Clonar el proyecto**

   ```bash   Puedes ejecutar la app en Docker tanto para desarrollo (edición en vivo) como para producción.

   cd analisis-encuestas

   ```   ### Requisitos

   - Docker Desktop

2. **Instalar dependencias**   - Docker Compose v2

   ```bash

   npm install   ### Desarrollo (editar en vivo desde tu carpeta)

   ```

   Este modo monta tu carpeta local dentro del contenedor y usa `nodemon` para recargar:

3. **Iniciar el servidor**

   ```bash   ```powershell

   npm start   Para desarrollo con recarga automática:

   ```   ```bash

      npm run dev

   Para desarrollo con recarga automática:   ```

   ```bash

   npm run dev4. **Abrir en el navegador**

   ```

   - Tu código local se monta en `/app` dentro del contenedor (bind mount).

4. **Abrir en el navegador**   - Los cambios se reflejan al instante (nodemon).

   ```   - Las subidas se persisten en el volumen `uploads_data`.

   http://localhost:3000   - El diccionario personalizado usa el archivo `/app/user-dictionary.json` (tu archivo local).

   ```

   ### Producción (imagen inmutable)

## 🐳 Docker - Guía Completa

   Este modo construye una imagen optimizada y persiste solo datos necesarios:

### Requisitos

- Docker Desktop instalado   ```powershell

- Docker Compose v2 (incluido en Docker Desktop)   ```

   http://localhost:3000

### Desarrollo Local con Edición en Vivo ✏️   ```



**Ideal para desarrollo:** monta tu carpeta local y recarga automáticamente:## 🔧 Uso de la Aplicación



```powershell### 1. Preparar el archivo Excel

# Levantar contenedor de desarrollo

docker compose --profile dev up --build   - El código queda dentro de la imagen (no editable en caliente).

   - Se persisten dos volúmenes: `uploads_data` (subidas) y `app_data` (diccionario en `/data/user-dictionary.json`).

# Para ejecutar en segundo plano

docker compose --profile dev up -d --build   ### Ejecución sin Compose (opcional)



# Ver logs en tiempo real   ```powershell

docker logs -f analisis-encuestas-dev- Asegúrate de que tu archivo contenga texto en las columnas

- Los formatos soportados son .xlsx y .xls

# Detener- El texto debe ser suficientemente descriptivo para el análisis

docker compose --profile dev down

```### 2. Subir y analizar

1. Haz clic en "Seleccionar archivo Excel"

**✅ Ventajas del modo desarrollo:**2. Elige tu archivo desde el explorador

- Editas el código desde VS Code o cualquier editor3. Presiona "Analizar Encuesta"

- Los cambios se reflejan automáticamente (hot reload con nodemon)4. Espera a que se procese el archivo

- Persistencia de archivos subidos en volumen `uploads_data`

- Diccionario personalizado usa tu archivo local `user-dictionary.json`   ### Preguntas frecuentes

- Puerto 3000 mapeado a localhost

   - ¿Puedo seguir editando el código si está dockerizado?

**Flujo de trabajo:**

1. Mantén el contenedor corriendo: `docker compose --profile dev up`### 3. Revisar resultados

2. Edita archivos en tu carpeta local   - ¿Se persisten los datos?

3. Los cambios se aplican al guardar- **Estadísticas generales**: Vista rápida de los números clave

4. Navega a http://localhost:3000   - ¿Puedo cambiar la ruta del diccionario?

- **Gráficos**: Visualización de la distribución de sentimientos

### Producción (Deployment) 🚀- **Tabla detallada**: Resultados específicos por respuesta

- **Filtros**: Refina los resultados por sentimiento o texto

Para deploys en servidores:

### 4. Exportar datos

```powershell- Usa los botones de exportación para descargar resultados

# Construir y levantar en modo producción- Disponible en formato JSON (datos completos) o CSV (tabla)

docker compose --profile prod up -d --build

## 📁 Estructura del Proyecto

# Ver logs

docker logs -f analisis-encuestas```

analisis-encuestas/

# Detener├── public/                 # Archivos estáticos del frontend

docker compose --profile prod down│   ├── index.html         # Página principal

```│   ├── styles.css         # Estilos CSS

│   └── app.js            # JavaScript del cliente

**🔒 Características de producción:**├── uploads/               # Carpeta temporal para archivos subidos

- Imagen optimizada sin dependencias de desarrollo├── server.js             # Servidor Express y API

- Persistencia de uploads en volumen `uploads_data`├── package.json          # Dependencias y scripts

- Diccionario personalizado en volumen `app_data` (path `/data/user-dictionary.json`)└── README.md            # Este archivo

- Restart automático con `unless-stopped````

- Código inmutable dentro de la imagen

## 🌐 API Endpoints

**Actualizar en servidor:**

1. Sube tu código actualizado (git pull, scp, etc.)### POST `/api/analyze`

2. Reconstruye: `docker compose --profile prod build`Procesa un archivo Excel y devuelve el análisis de sentimientos.

3. Reinicia: `docker compose --profile prod up -d`

**Request**: FormData con archivo Excel

### Ejecutar sin Docker Compose**Response**: JSON con resultados y estadísticas



```powershell### POST `/api/export`

# Construir imagen de producciónExporta resultados en el formato especificado.

docker build -t analisis-encuestas:latest --target prod .

**Request**: JSON con datos y formato

# Ejecutar**Response**: Archivo descargable

docker run --name analisis-encuestas -p 3000:3000 `

  -v uploads_data:/app/uploads `## 🎯 Ejemplos de Uso

  -v app_data:/data `

  -e USER_DICT_FILE=/data/user-dictionary.json `### Encuestas de Satisfacción

  analisis-encuestas:latest- Analiza comentarios de clientes

```- Identifica áreas de mejora

- Mide el sentimiento general

### Gestión de Volúmenes

### Feedback de Empleados

```powershell- Evalúa el clima laboral

# Listar volúmenes- Detecta problemas organizacionales

docker volume ls- Monitorea la moral del equipo



# Inspeccionar volumen### Investigación de Mercado

docker volume inspect uploads_data- Analiza respuestas a productos

docker volume inspect app_data- Evalúa campañas publicitarias

- Estudia percepciones de marca

# Backup del diccionario personalizado

docker cp analisis-encuestas:/data/user-dictionary.json ./backup-dictionary.json## ⚙️ Configuración Avanzada



# Restaurar diccionario### Variables de Entorno

docker cp ./backup-dictionary.json analisis-encuestas:/data/user-dictionary.json```bash

```PORT=3000  # Puerto del servidor (por defecto: 3000)

```

## 🔧 Uso de la Aplicación

### Personalización del Análisis

### 1. Preparar el archivo ExcelEl archivo `server.js` contiene las funciones de análisis que puedes modificar:

- Asegúrate de que contenga columnas con texto- `getClassification()`: Ajusta los rangos de clasificación

- Formatos: .xlsx o .xls- `calculateStats()`: Modifica las estadísticas calculadas

- Estructura sugerida: carrera, materia, docente, comentarios, etc.

## 🐛 Solución de Problemas

### 2. Subir y analizar

1. Selecciona un motor (Natural.js, NLP.js o Análisis Dual)### Error: "Solo se permiten archivos Excel"

2. Haz clic en "Seleccionar archivo Excel"- Verifica que el archivo tenga extensión .xlsx o .xls

3. Presiona "Analizar Encuesta"- Asegúrate de que no esté corrupto

4. Espera el procesamiento

### Error: "El archivo Excel está vacío"

### 3. Revisar resultados- Confirma que el archivo contenga datos

- **Estadísticas generales**: Vista rápida de métricas clave- Verifica que no esté protegido con contraseña

- **Gráficos**: Distribución visual de sentimientos

- **Tabla detallada**: Resultados específicos por respuesta### Error de procesamiento

- **Filtros**: Refina por sentimiento o busca texto- Revisa que el archivo no sea demasiado grande

- Asegúrate de que contenga texto analizable

### 4. Gestión de Diccionario

- Pestaña "📚 Gestión de Diccionario"## 🔄 Actualizaciones Futuras

- Agrega, edita o elimina términos

- Ajusta puntuaciones de palabras existentes- [ ] Soporte para más formatos de archivo (CSV, JSON)

- Prueba el impacto en tiempo real- [ ] Análisis en múltiples idiomas

- [ ] Integración con APIs de análisis más avanzadas

### 5. Comparar Motores- [ ] Dashboard de administración

- Pestaña "⚖️ Comparar Motores"- [ ] Autenticación de usuarios

- Prueba el mismo texto con ambos motores- [ ] Base de datos para historial de análisis

- Compara resultados y tiempos de respuesta

## 📄 Licencia

### 6. Exportar datos

- JSON: datos completos del análisisEste proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

- CSV: tabla simple

- XLSX Avanzado: reporte completo con filtros y formato## 🤝 Contribuciones



## 📁 Estructura del ProyectoLas contribuciones son bienvenidas. Por favor:



```1. Fork el proyecto

analisis-encuestas/2. Crea una rama para tu característica

├── public/                  # Frontend3. Commit tus cambios

│   ├── index.html          # Página principal4. Push a la rama

│   ├── styles.css          # Estilos5. Abre un Pull Request

│   └── app.js             # JavaScript cliente

├── uploads/                # Archivos temporales## 📞 Soporte

├── server.js              # Servidor Express y API

├── sentiment-dict.js      # Diccionario españolSi encuentras algún problema o tienes sugerencias, no dudes en abrir un issue en el repositorio del proyecto.

├── user-dictionary.json   # Diccionario personalizado

├── package.json           # Dependencias---

├── Dockerfile             # Imagen Docker multi-stage

├── docker-compose.yml     # Orquestación**¡Disfruta analizando tus encuestas! 📊✨**
├── .dockerignore          # Archivos excluidos del build
└── README.md             # Esta documentación
```

## 🌐 API Endpoints Principales

### Análisis
- `POST /api/analyze-with-engine` - Analiza con motor específico
- `POST /api/analyze-dual-file` - Análisis dual con consenso
- `POST /api/analyze-compare` - Compara motores en texto

### Diccionario
- `GET /api/dictionary` - Obtener diccionario completo
- `POST /api/dictionary/add` - Agregar término
- `PUT /api/dictionary/update` - Actualizar/renombrar término
- `DELETE /api/dictionary/remove/:word` - Eliminar término
- `POST /api/dictionary/test` - Probar análisis de término

### Motores
- `GET /api/engines` - Lista de motores disponibles

Ver [API-DOCS.md](API-DOCS.md) para documentación completa.

## ⚙️ Configuración Avanzada

### Variables de Entorno
```bash
PORT=3000                              # Puerto del servidor
USER_DICT_FILE=/app/user-dictionary.json  # Ruta del diccionario personalizado
NODE_ENV=production                    # Entorno (development/production)
```

### Personalización del Análisis
Edita `server.js`:
- `analyzeTextEnhanced()`: Lógica de análisis Natural.js
- `getClassification()`: Umbrales de clasificación
- `spanishSentimentDict`: Diccionario base (en `sentiment-dict.js`)

## 📚 Documentación Técnica

### Guías Detalladas

- **[📐 GUIA-CALCULOS-METRICAS.md](GUIA-CALCULOS-METRICAS.md)** - **Cálculo de métricas cuantitativas y cualitativas**
  - Fórmulas matemáticas exactas
  - Ejemplos paso a paso con datos reales
  - Explicación de promedios, scores y porcentajes
  
- **[🔍 COMO-FUNCIONA-ANALISIS.md](COMO-FUNCIONA-ANALISIS.md)** - Funcionamiento del análisis de sentimientos
  - Sistema de diccionario v4
  - Proceso de normalización y tokenización
  - Detección de negaciones

- **[🎭 SENTIMENT-GUIDE.md](SENTIMENT-GUIDE.md)** - Guía de análisis de sentimientos
  - Mejores prácticas para diccionarios
  - Interpretación de resultados
  - Troubleshooting

- **[🚀 MULTI-MOTOR-GUIDE.md](MULTI-MOTOR-GUIDE.md)** - Comparación de motores
  - Natural.js vs NLP.js
  - Análisis dual y consenso
  - Métricas de rendimiento

- **[⚙️ COLUMN-CONFIG-GUIDE.md](COLUMN-CONFIG-GUIDE.md)** - Configuración de columnas
  - Clasificación de columnas (identificación, numéricas, cualitativas)
  - Guardar y cargar configuraciones
  - Patrones de matching

- **[📡 API-DOCS.md](API-DOCS.md)** - Documentación de endpoints
  - `/api/analyze-with-engine` - Análisis con motor específico
  - `/api/analyze-dual-file` - Análisis con ambos motores
  - `/api/export` - Exportación de resultados
  - `/api/column-config` - Gestión de configuraciones

### Recursos Adicionales

- **[🐳 DOCKER-GUIDE.md](DOCKER-GUIDE.md)** - Despliegue con Docker
- **[💾 DEVELOPMENT.md](DEVELOPMENT.md)** - Guía de desarrollo
- **[🔧 INSTALL.md](INSTALL.md)** - Instalación detallada

## 🐛 Solución de Problemas

### Error: "Solo se permiten archivos Excel"
- Verifica extensión .xlsx o .xls
- Asegúrate de que no esté corrupto

### Error: "El archivo Excel está vacío"
- Confirma que contenga datos
- Verifica que no esté protegido con contraseña

### Docker: Cambios no se reflejan
- Asegúrate de usar perfil `dev`: `docker compose --profile dev up`
- Verifica que el volumen esté montado correctamente

### Problemas de memoria
- Usa el botón "🧹 Limpiar Memoria" en la UI
- Limita archivos a max 5000 registros

## 🔄 Roadmap

- [x] Dockerización completa
- [x] Gestión de diccionario con edición
- [x] Análisis dual y comparación de motores
- [ ] Soporte para CSV directo
- [ ] API REST completa con autenticación
- [ ] Dashboard de administración
- [ ] Base de datos para historial
- [ ] Análisis de tendencias temporales

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE)

## 🤝 Contribuciones

¡Contribuciones bienvenidas!

1. Fork el proyecto
2. Crea una rama: `git checkout -b feature/nueva-caracteristica`
3. Commit: `git commit -m 'Agrega nueva característica'`
4. Push: `git push origin feature/nueva-caracteristica`
5. Abre un Pull Request

## 📞 Soporte

- Issues: [GitHub Issues](https://github.com/martinmromero/analisis-encuestas/issues)
- Documentación API: [API-DOCS.md](API-DOCS.md)

---

**Desarrollado con ❤️ para análisis de encuestas educativas en español**

**¡Disfruta analizando tus encuestas! 📊✨**
