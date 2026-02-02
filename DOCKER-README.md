# 🐳 Guía Rápida de Docker

Esta guía te ayuda a ejecutar la aplicación con Docker Desktop.

---

## ✅ Verificación Inicial

Antes de comenzar, verifica que Docker esté instalado y corriendo:

```powershell
# En Windows PowerShell
docker --version
docker compose version
```

Si ves las versiones, ¡estás listo! Si no:
1. Abre **Docker Desktop**
2. Espera a que se inicie completamente (icono de Docker en la bandeja del sistema)

---

## 🚀 Inicio Rápido (Opción 1 - Automática)

### Usar el script de configuración

```powershell
.\docker-setup.ps1
```

El script te preguntará:
- **[D] Desarrollo**: Para editar código con hot-reload
- **[P] Producción**: Para usar la app optimizada

---

## 🔧 Inicio Manual (Opción 2)

### Modo Desarrollo (Recomendado para editar)

```powershell
# Construir la imagen
docker compose --profile dev build

# Iniciar el contenedor
docker compose --profile dev up -d

# Ver logs
docker compose --profile dev logs -f
```

**Características:**
- ✅ Hot-reload activado (cambios automáticos)
- ✅ URL: http://localhost:3000
- ✅ Perfecto para desarrollo local

### Modo Producción

```powershell
# Construir la imagen
docker compose --profile prod build

# Iniciar el contenedor
docker compose --profile prod up -d

# Ver logs
docker compose --profile prod logs -f
```

**Características:**
- ✅ Imagen optimizada (más pequeña)
- ✅ Reinicio automático
- ✅ Sin dependencias de desarrollo

---

## 📋 Comandos Útiles

### Ver estado de contenedores
```powershell
docker ps
# o específicamente:
docker compose --profile dev ps
docker compose --profile prod ps
```

### Ver logs
```powershell
# Logs en tiempo real
docker compose --profile dev logs -f

# Últimas 100 líneas
docker compose --profile dev logs --tail=100
```

### Detener contenedores
```powershell
# Modo desarrollo
docker compose --profile dev down

# Modo producción
docker compose --profile prod down

# Detener y eliminar volúmenes
docker compose --profile dev down -v
```

### Reiniciar
```powershell
docker compose --profile dev restart
```

### Reconstruir (después de cambios importantes)
```powershell
docker compose --profile dev down
docker compose --profile dev build --no-cache
docker compose --profile dev up -d
```

### Entrar al contenedor (debugging)
```powershell
# Modo desarrollo
docker exec -it analisis-encuestas-dev sh

# Modo producción
docker exec -it analisis-encuestas sh
```

---

## 📁 Estructura de Volúmenes

La aplicación usa volúmenes de Docker para persistir datos:

### Modo Desarrollo
- `node_modules:/app/node_modules` - Dependencias
- `uploads_data:/app/uploads` - Archivos subidos
- `.:/app` - Código fuente (bind mount para hot-reload)

### Modo Producción
- `uploads_data:/app/uploads` - Archivos subidos
- `app_data:/data` - Diccionario y configuraciones

### Ver volúmenes
```powershell
docker volume ls
```

### Backup de volúmenes
```powershell
# Backup de uploads
docker run --rm -v analisis-encuestas_uploads_data:/data -v ${PWD}:/backup alpine tar czf /backup/uploads-backup.tar.gz /data

# Backup de configuración (producción)
docker run --rm -v analisis-encuestas_app_data:/data -v ${PWD}:/backup alpine tar czf /backup/app-data-backup.tar.gz /data
```

---

## 🔄 Hot-Reload (Modo Desarrollo)

En modo desarrollo, los cambios se reflejan automáticamente:

1. Edita archivos en tu editor favorito
2. Guarda los cambios
3. El servidor se reinicia automáticamente
4. Recarga el navegador

**Archivos que activan hot-reload:**
- `server.js`
- `public/*.js`
- `public/*.css`
- `public/*.html`

**Para cambios que requieren reconstrucción:**
- Modificaciones en `package.json`
- Cambios en `Dockerfile`

```powershell
# Reconstruir
docker compose --profile dev down
docker compose --profile dev build
docker compose --profile dev up -d
```

---

## 🌐 Acceder a la Aplicación

Después de iniciar el contenedor:

1. Abre tu navegador
2. Ve a: **http://localhost:3000**
3. ¡Listo!

---

## 🆘 Solución de Problemas

### Problema: "puerto ya en uso"
```powershell
# Ver qué está usando el puerto 3000
netstat -ano | findstr :3000

# Detener el contenedor si está corriendo
docker compose --profile dev down
docker compose --profile prod down

# O cambiar el puerto en docker-compose.yml:
# ports:
#   - "8080:3000"  # Usa 8080 en lugar de 3000
```

### Problema: "no se reflejan los cambios"
```powershell
# Verificar que estés en modo desarrollo
docker compose --profile dev ps

# Si está en producción, cambiar a desarrollo:
docker compose --profile prod down
docker compose --profile dev up -d

# O forzar reconstrucción:
docker compose --profile dev build --no-cache
```

### Problema: "Docker no responde"
```powershell
# Verificar que Docker Desktop esté corriendo
docker info

# Si falla, reinicia Docker Desktop:
# 1. Cierra Docker Desktop
# 2. Ábrelo de nuevo
# 3. Espera a que se inicie completamente
```

### Problema: "error de permisos en uploads"
```powershell
# Entrar al contenedor y verificar permisos
docker exec -it analisis-encuestas-dev sh
ls -la /app/uploads
chmod 777 /app/uploads
exit
```

### Ver logs de errores
```powershell
docker compose --profile dev logs --tail=50
```

---

## 🧹 Limpieza

### Eliminar contenedores detenidos
```powershell
docker container prune
```

### Eliminar imágenes no usadas
```powershell
docker image prune
```

### Eliminar todo (¡cuidado!)
```powershell
docker system prune -a --volumes
```

### Eliminar solo esta aplicación
```powershell
# Detener y eliminar contenedores
docker compose --profile dev down
docker compose --profile prod down

# Eliminar volúmenes
docker volume rm analisis-encuestas_node_modules
docker volume rm analisis-encuestas_uploads_data
docker volume rm analisis-encuestas_app_data

# Eliminar imágenes
docker rmi analisis-encuestas:dev
docker rmi analisis-encuestas:latest
```

---

## 📊 Monitoreo

### Ver uso de recursos
```powershell
docker stats analisis-encuestas-dev
# o
docker stats analisis-encuestas
```

### Ver procesos dentro del contenedor
```powershell
docker exec -it analisis-encuestas-dev ps aux
```

---

## 📦 Preparar para Deployment

Cuando estés listo para mover la app a un servidor:

```powershell
# Ejecutar el script de preparación
.\prepare-deployment.ps1
```

Esto creará un archivo ZIP con todo lo necesario.

Ver **DEPLOYMENT-GUIDE.md** para más detalles.

---

## 📖 Más Información

- [Dockerfile](./Dockerfile) - Configuración de la imagen
- [docker-compose.yml](./docker-compose.yml) - Orquestación de contenedores
- [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md) - Guía de deployment remoto
- [Documentación oficial de Docker](https://docs.docker.com/)

---

## ✨ Tips

1. **Siempre usa modo desarrollo** cuando estés editando código
2. **Usa modo producción** solo para probar la versión final
3. **Haz backup de los volúmenes** regularmente
4. **Verifica los logs** si algo no funciona como esperas
5. **Reconstruye la imagen** después de cambios en dependencias

---

¿Necesitas ayuda? Revisa los logs o el archivo DEPLOYMENT-GUIDE.md
