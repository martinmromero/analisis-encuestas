# 🚀 Instrucciones de Instalación y Ejecución

## ⚠️ IMPORTANTE: Instalación de Node.js Requerida

Para ejecutar esta aplicación de análisis de encuestas, necesitas instalar Node.js primero.

### 📥 Paso 1: Instalar Node.js

**Opción A: Descarga Manual (Recomendado)**
1. Ve a [https://nodejs.org/](https://nodejs.org/)
2. Descarga la versión **LTS** (Long Term Support)
3. Ejecuta el instalador y sigue las instrucciones
4. Reinicia tu terminal/PowerShell

**Opción B: Usar Windows Package Manager (si tienes winget)**
```powershell
winget install OpenJS.NodeJS
```

**Opción C: Usar Chocolatey (si tienes choco instalado)**
```powershell
choco install nodejs
```

### 🔍 Paso 2: Verificar Instalación

Abre una nueva ventana de PowerShell y ejecuta:
```powershell
node --version
npm --version
```

Deberías ver números de versión para ambos comandos.

### 📦 Paso 3: Instalar Dependencias del Proyecto

En el directorio del proyecto:
```powershell
cd "C:\Users\Public\analisis-encuestas"
npm install
```

### 🚀 Paso 4: Ejecutar la Aplicación

```powershell
npm start
```

### 🌐 Paso 5: Acceder a la Aplicación

Abre tu navegador y ve a:
```
http://localhost:3000
```

## 🎯 Uso de la Aplicación

1. **Subir archivo**: Haz clic en "Seleccionar archivo Excel" y elige tu archivo .xlsx o .xls
2. **Analizar**: Presiona "Analizar Encuesta" y espera el procesamiento
3. **Revisar resultados**: Explora las estadísticas, gráficos y tabla de resultados
4. **Exportar**: Usa los botones para descargar resultados en JSON o CSV

## 📋 Requisitos del Archivo Excel

- **Formatos soportados**: .xlsx, .xls
- **Contenido**: Debe tener texto en las celdas para analizar
- **Idioma**: Funciona mejor con texto en español e inglés
- **Tamaño**: Archivos de tamaño razonable (< 10MB recomendado)

## 🐛 Solución de Problemas

**Error: 'node' no se reconoce**
- Asegúrate de haber instalado Node.js correctamente
- Reinicia tu terminal/PowerShell
- Verifica que Node.js esté en tu PATH

**Error: Cannot find module**
- Ejecuta `npm install` en el directorio del proyecto
- Verifica que estés en el directorio correcto

**Error al procesar archivo Excel**
- Verifica que el archivo no esté protegido con contraseña
- Asegúrate de que contenga texto analizable
- Intenta con un archivo más pequeño

## ✨ Características Disponibles

- ✅ Análisis automático de sentimientos
- ✅ Clasificación en 5 categorías emocionales
- ✅ Gráficos interactivos (Chart.js)
- ✅ Filtros y búsqueda en tiempo real
- ✅ Exportación a JSON y CSV
- ✅ Interfaz responsive y moderna
- ✅ Identificación de palabras clave

---

**¡Tu aplicación de análisis de encuestas está lista! 🎉**