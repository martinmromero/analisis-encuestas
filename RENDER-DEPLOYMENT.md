# 🚀 Guía de Despliegue en Render

## ✅ Pre-requisitos Completados

- [x] Proyecto funciona en Docker localmente
- [x] Dockerfile optimizado para producción
- [x] render.yaml configurado

## 📝 Pasos para Desplegar en Render

### 1. **Subir el proyecto a GitHub**

```powershell
# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Preparar proyecto para deployment en Render"

# Crear repositorio en GitHub y conectarlo
git remote add origin https://github.com/TU-USUARIO/analisis-encuestas.git
git branch -M main
git push -u origin main
```

### 2. **Crear cuenta en Render**

1. Ve a [render.com](https://render.com)
2. Registrate con GitHub (recomendado) o email
3. Confirma tu email

### 3. **Deploy desde GitHub**

1. En el dashboard de Render, haz clic en **"New +"**
2. Selecciona **"Web Service"**
3. Conecta tu repositorio de GitHub
4. Render detectará automáticamente el `render.yaml`
5. Haz clic en **"Apply"**

### 4. **Configuración Automática**

Render usará la configuración de `render.yaml`:
- ✅ Detecta Dockerfile automáticamente
- ✅ Puerto 3000 configurado
- ✅ Health checks activos
- ✅ Plan gratuito seleccionado

### 5. **Monitorear el Deploy**

- Verás los logs en tiempo real
- El build tarda ~3-5 minutos
- Una vez completado, tendrás una URL pública:  
  `https://analisis-encuestas.onrender.com`

## 🎯 URL Final

Tu aplicación estará disponible en:
```
https://[tu-nombre-de-servicio].onrender.com
```

## ⚠️ Limitaciones del Plan Gratuito

- **Sleep después de 15 min de inactividad**
  - Primera carga tras inactividad: ~30-60 segundos
  - Solución: Usar un ping service (opcional)
  
- **750 horas de uso al mes**
  - Suficiente para uso de prueba/demo

- **512 MB de RAM**
  - Tu app usa ~150-200 MB, perfecto ✅

## 🔧 Opcional: Prevenir el Sleep

Si quieres que la app esté siempre activa, usa un servicio de ping gratuito:

- **UptimeRobot** (gratis): https://uptimerobot.com
- **Freshping** (gratis): https://freshping.io

Configura ping cada 10 minutos a tu URL de Render.

## 📊 Monitoreo

Render proporciona:
- ✅ Logs en tiempo real
- ✅ Métricas de uso
- ✅ Health checks automáticos
- ✅ Deploy automático en cada push a main

## 🔄 Actualizaciones Futuras

Cada vez que hagas push a tu rama `main` en GitHub:
```powershell
git add .
git commit -m "Actualización de funcionalidad"
git push
```

Render detectará el cambio y desplegará automáticamente.

## ✅ Verificación Post-Deploy

1. Abre tu URL de Render
2. Sube un archivo Excel de prueba
3. Verifica que el análisis funcione correctamente
4. Descarga un reporte para confirmar

## 🆘 Troubleshooting

### Error: Puerto incorrecto
- Render usa la variable `$PORT` automáticamente
- Ya está configurado en `render.yaml`

### Error: Build falla
- Revisa los logs en Render
- Verifica que Dockerfile esté en la raíz
- Confirma que todas las dependencias estén en `package.json`

### Error: App no responde
- El primer acceso tras sleep tarda ~30s
- Revisa Health Check logs en Render

## 📞 Soporte

- Documentación oficial: https://render.com/docs
- Community: https://community.render.com
