# 🚀 Instrucciones para Subir el Proyecto a GitHub

## Paso 1: Crear Repositorio en GitHub

1. Ve a [GitHub.com](https://github.com)
2. Haz clic en el botón "+" en la esquina superior derecha
3. Selecciona "New repository"
4. Configura el repositorio:
   - **Repository name**: `analisis-encuestas`
   - **Description**: `Sistema web completo para análisis de sentimientos de encuestas educativas en español`
   - **Visibility**: Public (recomendado)
   - **NO marques**: "Add a README file" (ya tenemos uno)
   - **NO marques**: "Add .gitignore" (ya tenemos uno)
   - **NO marques**: "Choose a license" (ya tenemos LICENSE)
5. Haz clic en "Create repository"

## Paso 2: Conectar y Subir el Proyecto

Una vez que GitHub te muestre la página del repositorio vacío, ejecuta estos comandos en PowerShell:

```powershell
# Asegúrate de estar en el directorio del proyecto
Set-Location "C:\Users\Public\analisis-encuestas"

# Agregar el remote origin (reemplaza 'martinmromero' con tu username real)
git remote add origin https://github.com/martinmromero/analisis-encuestas.git

# Verificar que el remote se agregó correctamente
git remote -v

# Subir el código al repositorio
git push -u origin main
```

## Paso 3: Verificar la Subida

1. Recarga la página del repositorio en GitHub
2. Deberías ver todos los archivos del proyecto
3. Verifica que el README.md se muestre correctamente

## Paso 4: Configurar Descripción y Topics

En la página principal del repositorio en GitHub:

1. Haz clic en el ⚙️ (gear icon) junto a "About"
2. Configura:
   - **Description**: `Sistema web completo para análisis de sentimientos de encuestas educativas en español con múltiples motores de IA`
   - **Website**: (opcional) `https://github.com/martinmromero/analisis-encuestas`
   - **Topics**: Agrega estos tags separados por espacios:
     ```
     sentiment-analysis spanish-nlp survey-analysis natural-language-processing excel-processing web-application nodejs express chartjs education analytics nlpjs naturaljs
     ```
3. Haz clic en "Save changes"

## 🎯 Resultado Final

Tu repositorio estará disponible en:
```
https://github.com/martinmromero/analisis-encuestas
```

## 📋 Checklist de Verificación

- [ ] Repositorio creado en GitHub
- [ ] Código subido exitosamente
- [ ] README.md se muestra correctamente
- [ ] Descripción y topics configurados
- [ ] License detectada automáticamente
- [ ] Archivo .gitignore funcionando
- [ ] Estructura de carpetas visible

## 🔧 Si hay Problemas

### Error de autenticación:
```bash
# Si GitHub pide autenticación, usa Personal Access Token
# Ve a GitHub Settings > Developer settings > Personal access tokens
# Crea un token con permisos 'repo'
# Úsalo como password cuando Git lo pida
```

### Error de remote existente:
```bash
# Si el remote ya existe, eliminarlo y volver a agregar
git remote remove origin
git remote add origin https://github.com/martinmromero/analisis-encuestas.git
```

### Error de rama:
```bash
# Asegurarse de estar en la rama correcta
git branch -M main
git push -u origin main
```

## 🎉 ¡Listo!

Una vez completados estos pasos, tu proyecto estará disponible públicamente en GitHub con:
- ✅ Documentación completa
- ✅ Código organizado
- ✅ Dependencias separadas
- ✅ Configuración para deployment
- ✅ API documentada
- ✅ Guías de desarrollo
- ✅ Licencia MIT