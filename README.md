# Sistema de Análisis de Sentimientos para Encuestas 📊🎓

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Spanish](https://img.shields.io/badge/Optimizado%20para-Español-red.svg)](README.md)

Sistema web completo para el análisis de sentimientos de encuestas educativas en español, con múltiples motores de análisis y generación avanzada de reportes en Excel.

## 🚀 Características

- **Subida de archivos Excel**: Soporta formatos .xlsx y .xls
- **Análisis de sentimientos**: Utiliza procesamiento de lenguaje natural para analizar el tono emocional
- **Visualizaciones interactivas**: Gráficos dinámicos con Chart.js
- **Filtros y búsqueda**: Filtra resultados por sentimiento o busca texto específico
- **Exportación de datos**: Descarga resultados en formato JSON o CSV
- **Interfaz moderna**: Diseño responsivo y fácil de usar

## 📊 Funcionalidades del Análisis

### Clasificaciones de Sentimiento
- **Muy Positivo**: Puntuación > 2
- **Positivo**: Puntuación 0 a 2
- **Neutral**: Puntuación = 0
- **Negativo**: Puntuación -2 a 0
- **Muy Negativo**: Puntuación < -2

### Estadísticas Generadas
- Total de respuestas procesadas
- Puntuación promedio de sentimientos
- Distribución porcentual por categorías
- Palabras clave positivas y negativas identificadas

## 🛠️ Tecnologías Utilizadas

### Backend
- **Node.js**: Runtime de JavaScript
- **Express.js**: Framework web
- **Multer**: Manejo de archivos subidos
- **XLSX**: Procesamiento de archivos Excel
- **Sentiment**: Análisis de sentimientos
- **CORS**: Habilitación de peticiones cross-origin

### Frontend
- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con gradientes y animaciones
- **JavaScript ES6+**: Funcionalidad interactiva
- **Chart.js**: Visualizaciones de datos

## 📦 Instalación

1. **Clonar o descargar el proyecto**
   ```bash
   cd analisis-encuestas
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```
   
   Para desarrollo con recarga automática:
   ```bash
   npm run dev
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 🔧 Uso de la Aplicación

### 1. Preparar el archivo Excel
- Asegúrate de que tu archivo contenga texto en las columnas
- Los formatos soportados son .xlsx y .xls
- El texto debe ser suficientemente descriptivo para el análisis

### 2. Subir y analizar
1. Haz clic en "Seleccionar archivo Excel"
2. Elige tu archivo desde el explorador
3. Presiona "Analizar Encuesta"
4. Espera a que se procese el archivo

### 3. Revisar resultados
- **Estadísticas generales**: Vista rápida de los números clave
- **Gráficos**: Visualización de la distribución de sentimientos
- **Tabla detallada**: Resultados específicos por respuesta
- **Filtros**: Refina los resultados por sentimiento o texto

### 4. Exportar datos
- Usa los botones de exportación para descargar resultados
- Disponible en formato JSON (datos completos) o CSV (tabla)

## 📁 Estructura del Proyecto

```
analisis-encuestas/
├── public/                 # Archivos estáticos del frontend
│   ├── index.html         # Página principal
│   ├── styles.css         # Estilos CSS
│   └── app.js            # JavaScript del cliente
├── uploads/               # Carpeta temporal para archivos subidos
├── server.js             # Servidor Express y API
├── package.json          # Dependencias y scripts
└── README.md            # Este archivo
```

## 🌐 API Endpoints

### POST `/api/analyze`
Procesa un archivo Excel y devuelve el análisis de sentimientos.

**Request**: FormData con archivo Excel
**Response**: JSON con resultados y estadísticas

### POST `/api/export`
Exporta resultados en el formato especificado.

**Request**: JSON con datos y formato
**Response**: Archivo descargable

## 🎯 Ejemplos de Uso

### Encuestas de Satisfacción
- Analiza comentarios de clientes
- Identifica áreas de mejora
- Mide el sentimiento general

### Feedback de Empleados
- Evalúa el clima laboral
- Detecta problemas organizacionales
- Monitorea la moral del equipo

### Investigación de Mercado
- Analiza respuestas a productos
- Evalúa campañas publicitarias
- Estudia percepciones de marca

## ⚙️ Configuración Avanzada

### Variables de Entorno
```bash
PORT=3000  # Puerto del servidor (por defecto: 3000)
```

### Personalización del Análisis
El archivo `server.js` contiene las funciones de análisis que puedes modificar:
- `getClassification()`: Ajusta los rangos de clasificación
- `calculateStats()`: Modifica las estadísticas calculadas

## 🐛 Solución de Problemas

### Error: "Solo se permiten archivos Excel"
- Verifica que el archivo tenga extensión .xlsx o .xls
- Asegúrate de que no esté corrupto

### Error: "El archivo Excel está vacío"
- Confirma que el archivo contenga datos
- Verifica que no esté protegido con contraseña

### Error de procesamiento
- Revisa que el archivo no sea demasiado grande
- Asegúrate de que contenga texto analizable

## 🔄 Actualizaciones Futuras

- [ ] Soporte para más formatos de archivo (CSV, JSON)
- [ ] Análisis en múltiples idiomas
- [ ] Integración con APIs de análisis más avanzadas
- [ ] Dashboard de administración
- [ ] Autenticación de usuarios
- [ ] Base de datos para historial de análisis

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo LICENSE para más detalles.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu característica
3. Commit tus cambios
4. Push a la rama
5. Abre un Pull Request

## 📞 Soporte

Si encuentras algún problema o tienes sugerencias, no dudes en abrir un issue en el repositorio del proyecto.

---

**¡Disfruta analizando tus encuestas! 📊✨**