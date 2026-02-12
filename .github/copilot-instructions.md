- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements - Aplicación web para análisis de encuestas con análisis de sentimientos

- [x] Scaffold the Project - Estructura completa creada con Node.js/Express backend y frontend moderno

- [x] Customize the Project - Implementado servidor, API, frontend, análisis de sentimientos y visualizaciones

- [x] Install Required Extensions - No se requieren extensiones específicas para este proyecto Node.js

- [x] Compile the Project - Proyecto listo, necesita Node.js para ejecutar

- [x] Create and Run Task - Tasks configuradas en README.md 

- [-] Launch the Project - Requiere que el usuario instale Node.js manualmente

- [x] Ensure Documentation is Complete - README.md completo con instrucciones

---

## 🚨 REGLAS CRÍTICAS DE DEPLOYMENT

### ❌ NUNCA INCLUIR EN DEPLOYMENTS:
- `column-configs.json` - Configuraciones de producción creadas por usuarios
- `user-dictionary.json` - Diccionario personalizado de producción
- `dictionaries/` - Carpeta con diccionarios importados por usuarios
- `uploads/*` - Archivos subidos (excepto `.gitkeep`)

### ✅ ESTOS ARCHIVOS ESTÁN EN .gitignore Y DEBEN PERMANECER ASÍ

### 📖 ANTES DE CUALQUIER DEPLOYMENT:
1. Leer [DEPLOYMENT-CRITICAL-RULES.md](../DEPLOYMENT-CRITICAL-RULES.md)
2. Leer [PERSISTENCIA-PRODUCCION.md](../PERSISTENCIA-PRODUCCION.md)
3. Verificar que `prepare-deployment.ps1` NO incluye archivos de producción
4. Crear backup en servidor ANTES de descomprimir nuevos archivos

### 🔄 Script correcto: `prepare-deployment.ps1`
- ✅ Excluye: column-configs.json, user-dictionary.json, dictionaries/
- ✅ Solo incluye: código fuente, dependencias, Dockerfile, public/