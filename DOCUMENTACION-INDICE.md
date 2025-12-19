# 📚 Índice de Documentación Completa

**Sistema de Análisis de Sentimientos para Encuestas**

---

## 🚀 Inicio Rápido

| Documento | Descripción | Ideal para |
|-----------|-------------|------------|
| **[README.md](README.md)** | Documentación principal del proyecto | Primer contacto, características, instalación |
| **[README-SIMPLIFIED.md](README-SIMPLIFIED.md)** | Versión simplificada | Usuarios no técnicos |
| **[INSTALL.md](INSTALL.md)** | Guía de instalación detallada | Setup inicial, requisitos del sistema |

---

## 📐 Guías Técnicas

### ⭐ Cálculo de Métricas
| Documento | Contenido | Cuándo usar |
|-----------|-----------|-------------|
| **[GUIA-CALCULOS-METRICAS.md](GUIA-CALCULOS-METRICAS.md)** | **Fórmulas matemáticas completas** | Para entender exactamente cómo se calcula cada métrica |

**Incluye:**
- ✅ Fórmulas de promedios cuantitativos (preguntas 1-10)
- ✅ Algoritmo completo de análisis de sentimientos
- ✅ Cálculo de confianza, intensidad y clasificación
- ✅ Ejemplos paso a paso con datos reales
- ✅ Explicación de estadísticas agregadas
- ✅ Proceso de filtrado y recálculo

### 🎭 Análisis de Sentimientos
| Documento | Contenido | Cuándo usar |
|-----------|-----------|-------------|
| **[COMO-FUNCIONA-ANALISIS.md](COMO-FUNCIONA-ANALISIS.md)** | Funcionamiento del motor de sentimientos | Para entender el sistema de diccionario |
| **[SENTIMENT-GUIDE.md](SENTIMENT-GUIDE.md)** | Guía de uso del análisis | Para optimizar resultados y troubleshooting |

**Temas cubiertos:**
- Sistema de diccionario v4 (569 palabras)
- Normalización de texto y tokenización
- Detección de negaciones
- Frases vs palabras individuales
- Mejores prácticas para diccionarios

### 🚀 Motores de Análisis
| Documento | Contenido | Cuándo usar |
|-----------|-----------|-------------|
| **[MULTI-MOTOR-GUIDE.md](MULTI-MOTOR-GUIDE.md)** | Comparación Natural.js vs NLP.js | Para elegir motor o usar análisis dual |

**Incluye:**
- Diferencias entre motores
- Análisis dual y consenso
- Métricas de rendimiento
- Casos de uso recomendados

### ⚙️ Configuración
| Documento | Contenido | Cuándo usar |
|-----------|-----------|-------------|
| **[COLUMN-CONFIG-GUIDE.md](COLUMN-CONFIG-GUIDE.md)** | Configuración de columnas | Para clasificar columnas interactivamente |
| **[MULTI-DICTIONARY-GUIDE.md](MULTI-DICTIONARY-GUIDE.md)** | Gestión de diccionarios múltiples | Para crear y activar diferentes diccionarios |

**Funcionalidades:**
- Clasificación: identificación, numéricas, cualitativas
- Guardar y cargar configuraciones con nombre
- Patrones de matching flexibles
- Activación dinámica de diccionarios

---

## 🔧 Desarrollo y Deployment

| Documento | Contenido | Cuándo usar |
|-----------|-----------|-------------|
| **[DEVELOPMENT.md](DEVELOPMENT.md)** | Guía de desarrollo | Para contribuir o modificar el código |
| **[DOCKER-GUIDE.md](DOCKER-GUIDE.md)** | Despliegue con Docker | Para ejecutar en contenedores |
| **[API-DOCS.md](API-DOCS.md)** | Documentación de endpoints | Para integrar con otros sistemas |

**Incluye:**
- Estructura del proyecto
- Endpoints REST disponibles
- Configuración de desarrollo con hot-reload
- Despliegue en producción

---

## 📋 Documentos de Correcciones

| Documento | Descripción |
|-----------|-------------|
| **[FIXES-APPLIED.md](FIXES-APPLIED.md)** | Historial de correcciones aplicadas |
| **[FINAL-FIX.md](FINAL-FIX.md)** | Corrección de filtros y métricas numéricas |
| **[CHART-BUG-FIX.md](CHART-BUG-FIX.md)** | Corrección de gráficos Chart.js |
| **[ENCODING-FIX.md](ENCODING-FIX.md)** | Solución de problemas de encoding |
| **[MEMORY-OPTIMIZATION.md](MEMORY-OPTIMIZATION.md)** | Optimizaciones de memoria |
| **[VSCODE-FIX.md](VSCODE-FIX.md)** | Solución de problemas en VS Code |

---

## 🎯 Guías por Caso de Uso

### "Quiero entender cómo se calculan las métricas"
1. ⭐ Lee **[GUIA-CALCULOS-METRICAS.md](GUIA-CALCULOS-METRICAS.md)** (fórmulas completas)
2. Complementa con **[COMO-FUNCIONA-ANALISIS.md](COMO-FUNCIONA-ANALISIS.md)** (detalles del algoritmo)

### "Necesito instalar el sistema"
1. Lee **[README.md](README.md)** sección "Instalación"
2. Si usas Docker: **[DOCKER-GUIDE.md](DOCKER-GUIDE.md)**
3. Si instalas manualmente: **[INSTALL.md](INSTALL.md)**

### "El análisis no detecta sentimientos correctamente"
1. Revisa **[SENTIMENT-GUIDE.md](SENTIMENT-GUIDE.md)** sección "Troubleshooting"
2. Verifica tu diccionario en **[MULTI-DICTIONARY-GUIDE.md](MULTI-DICTIONARY-GUIDE.md)**
3. Lee **[COMO-FUNCIONA-ANALISIS.md](COMO-FUNCIONA-ANALISIS.md)** para entender el proceso

### "Quiero configurar qué columnas analizar"
1. Lee **[COLUMN-CONFIG-GUIDE.md](COLUMN-CONFIG-GUIDE.md)**
2. Usa la interfaz de "Configurar Columnas" en la web

### "Necesito comparar motores de análisis"
1. Lee **[MULTI-MOTOR-GUIDE.md](MULTI-MOTOR-GUIDE.md)**
2. Prueba el análisis dual en la interfaz

### "Quiero integrar con mi sistema"
1. Consulta **[API-DOCS.md](API-DOCS.md)**
2. Revisa **[DEVELOPMENT.md](DEVELOPMENT.md)** para estructura del código

### "Tengo problemas técnicos"
1. Consulta **[README.md](README.md)** sección "Solución de Problemas"
2. Busca en documentos de correcciones (FIXES, FIX)
3. Revisa la guía específica del área con problemas

---

## 📊 Mapa Conceptual

```
Sistema de Análisis
├── Entrada: Archivo Excel
│   └── Configuración de columnas (COLUMN-CONFIG-GUIDE.md)
│
├── Procesamiento
│   ├── Cuantitativo
│   │   └── Promedios por pregunta (GUIA-CALCULOS-METRICAS.md)
│   │
│   └── Cualitativo
│       ├── Motor Natural.js (MULTI-MOTOR-GUIDE.md)
│       ├── Motor NLP.js (MULTI-MOTOR-GUIDE.md)
│       ├── Diccionario v4 (SENTIMENT-GUIDE.md)
│       └── Algoritmo de análisis (COMO-FUNCIONA-ANALISIS.md)
│
└── Salida
    ├── Estadísticas (GUIA-CALCULOS-METRICAS.md)
    ├── Gráficos
    └── Reportes Excel
```

---

## 🔍 Búsqueda Rápida por Tema

| Tema | Documento Principal | Relacionados |
|------|---------------------|--------------|
| **Fórmulas matemáticas** | GUIA-CALCULOS-METRICAS.md | COMO-FUNCIONA-ANALISIS.md |
| **Diccionario** | SENTIMENT-GUIDE.md | MULTI-DICTIONARY-GUIDE.md |
| **Instalación** | INSTALL.md | README.md, DOCKER-GUIDE.md |
| **API REST** | API-DOCS.md | DEVELOPMENT.md |
| **Configuración** | COLUMN-CONFIG-GUIDE.md | README.md |
| **Motores** | MULTI-MOTOR-GUIDE.md | SENTIMENT-GUIDE.md |
| **Troubleshooting** | README.md | SENTIMENT-GUIDE.md, FIXES-APPLIED.md |
| **Docker** | DOCKER-GUIDE.md | INSTALL.md |
| **Desarrollo** | DEVELOPMENT.md | API-DOCS.md |

---

## 📈 Métricas de Documentación

| Categoría | Archivos | Páginas aprox. | KB totales |
|-----------|----------|----------------|------------|
| Guías técnicas | 7 | ~50 | 46.4 KB |
| Desarrollo | 3 | ~15 | 8.5 KB |
| Correcciones | 6 | ~20 | 12.3 KB |
| **Total** | **16** | **~85** | **67.2 KB** |

---

## 🆕 Última Actualización

**Fecha**: Diciembre 2025  
**Versión del sistema**: 2.1.0  
**Nuevo documento destacado**: GUIA-CALCULOS-METRICAS.md ⭐

---

## 📞 Ayuda

**¿No encuentras lo que buscas?**
1. Usa la función de búsqueda en VS Code (Ctrl+Shift+F) en todos los .md
2. Revisa el índice de contenidos de README.md
3. Consulta los issues en GitHub: [martinmromero/analisis-encuestas](https://github.com/martinmromero/analisis-encuestas/issues)

---

**Desarrollado con ❤️ para análisis de encuestas educativas en español**
