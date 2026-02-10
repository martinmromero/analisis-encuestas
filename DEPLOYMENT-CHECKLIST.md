# ✅ Checklist de Preparación para Deployment

## 📋 Pre-Deployment

### 1. Verificación Local con Docker

- [ ] Docker Desktop está instalado y corriendo
- [ ] La aplicación funciona en modo desarrollo:
  ```powershell
  docker compose --profile dev up -d
  ```
- [ ] Verificar en http://localhost:3000
- [ ] Todos los features funcionan correctamente:
  - [ ] Subida de archivos Excel
  - [ ] Análisis de sentimientos
  - [ ] Visualización de gráficos
  - [ ] Gestión de diccionario
  - [ ] Exportación de reportes
  - [ ] Configuración de columnas
  - [ ] Comparación de motores
- [ ] La aplicación funciona en modo producción:
  ```powershell
  docker compose --profile prod up -d
  ```

### 2. Archivos Esenciales

Verifica que estos archivos existan:

**Código principal:**
- [ ] `server.js`
- [ ] `package.json`
- [ ] `package-lock.json`

**Docker:**
- [ ] `Dockerfile`
- [ ] `docker-compose.yml`
- [ ] `.dockerignore`

**Configuración:**
- [ ] `sentiment-dict.js`
- [ ] `column-config.js`
- [ ] `user-dictionary.json`
- [ ] `column-configs.json`
- [ ] `ignored-phrases.json`

**Diccionarios:**
- [ ] `dictionaries/Diccionario_Sentimientos_v4.json` (o similar)

**Frontend:**
- [ ] `public/index.html`
- [ ] `public/app.js`
- [ ] `public/styles.css`
- [ ] `public/cascade-filters.js`
- [ ] `public/column-config-manager.js`
- [ ] `public/logobarcelo_cmyk_jpg.jpg`

**Deployment:**
- [ ] `deploy-server.sh`
- [ ] `DEPLOYMENT-GUIDE.md`

### 3. Preparar Paquete de Deployment

```powershell
# Ejecutar el script de preparación
.\prepare-deployment.ps1
```

Esto creará un archivo ZIP con:
- [ ] Archivo ZIP creado exitosamente
- [ ] Tamaño razonable (< 10 MB sin node_modules)
- [ ] Verificar contenido del ZIP

---

## 🚀 Deployment en Servidor Remoto

### Fase 1: Información del Servidor

- [ ] IP del servidor: `___________________`
- [ ] Usuario SSH: `___________________`
- [ ] Puerto SSH: `___________________` (normalmente 22)
- [ ] Dominio (si aplica): `___________________`

### Fase 2: Requisitos del Servidor

- [ ] Sistema operativo: Linux (Ubuntu/Debian/CentOS)
- [ ] Acceso SSH configurado
- [ ] Docker instalado (>= 20.10)
- [ ] Docker Compose instalado (>= 2.0)
- [ ] Puerto 3000 disponible (o personalizado)
- [ ] Al menos 2 GB de RAM
- [ ] Al menos 5 GB de espacio en disco

### Fase 3: Copiar Archivos

**Opción A: Con archivo ZIP**

```bash
# En tu máquina local (Windows)
scp ruta\al\archivo.zip usuario@ip-servidor:/home/usuario/

# En el servidor
ssh usuario@ip-servidor
unzip archivo.zip -d analisis-encuestas
cd analisis-encuestas
```

- [ ] Archivos copiados al servidor
- [ ] Verificar permisos correctos

**Opción B: Con Git**

```bash
# En el servidor
git clone https://github.com/tu-usuario/analisis-encuestas.git
cd analisis-encuestas
```

- [ ] Repositorio clonado
- [ ] En la rama correcta

### Fase 4: Instalación en el Servidor

```bash
# Dar permisos de ejecución al script
chmod +x deploy-server.sh

# Ejecutar deployment
./deploy-server.sh
```

- [ ] Script ejecutado sin errores
- [ ] Contenedor iniciado correctamente
- [ ] Aplicación accesible en http://ip-servidor:3000

### Fase 5: Verificación Post-Deployment

- [ ] La aplicación carga correctamente
- [ ] Se pueden subir archivos
- [ ] El análisis funciona
- [ ] Los gráficos se visualizan
- [ ] El diccionario se carga
- [ ] Todos los features funcionan

### Fase 6: Configuración Adicional (Opcional)

**Firewall:**
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw reload
```
- [ ] Puerto abierto en firewall

**Nginx Reverse Proxy (para HTTPS):**
- [ ] Nginx instalado
- [ ] Configuración creada
- [ ] Certificado SSL instalado (Let's Encrypt)
- [ ] HTTPS funcionando

**Dominio:**
- [ ] DNS configurado apuntando al servidor
- [ ] Dominio resuelve correctamente

---

## 🔧 Para Editar en el Servidor

### Opción 1: Edición Local + Re-deployment

1. Editar archivos en tu máquina local
2. Probar con Docker localmente
3. Crear nuevo ZIP con `prepare-deployment.ps1`
4. Copiar al servidor
5. Detener contenedor: `docker compose --profile prod down`
6. Reemplazar archivos
7. Reiniciar: `docker compose --profile prod up -d`

- [ ] Proceso de actualización documentado

### Opción 2: VS Code Remote SSH

1. Instalar extensión "Remote - SSH" en VS Code
2. Configurar conexión SSH al servidor
3. Conectarse al servidor
4. Abrir carpeta del proyecto
5. Editar archivos directamente
6. Reiniciar contenedor cuando termines

- [ ] VS Code Remote SSH configurado
- [ ] Conexión funciona correctamente

### Opción 3: Edición Directa en Servidor

```bash
# Conectarse por SSH
ssh usuario@ip-servidor
cd analisis-encuestas

# Editar archivos (ejemplo con nano)
nano public/app.js
nano public/styles.css

# Reiniciar contenedor
docker compose --profile prod restart
```

- [ ] Acceso SSH configurado
- [ ] Editor de texto disponible (nano/vim)

---

## 📊 Monitoreo Continuo

**Verificar estado:**
```bash
docker compose --profile prod ps
docker compose --profile prod logs --tail=50
```

**Ver recursos:**
```bash
docker stats analisis-encuestas
```

**Logs en tiempo real:**
```bash
docker compose --profile prod logs -f
```

- [ ] Comandos de monitoreo probados
- [ ] Sistema de alertas configurado (opcional)

---

## 🔐 Seguridad

- [ ] Firewall configurado (solo puertos necesarios abiertos)
- [ ] HTTPS configurado (si es público)
- [ ] Backups automáticos configurados
- [ ] Usuario no-root para correr Docker (opcional)
- [ ] Docker socket protegido
- [ ] Límites de recursos configurados (opcional)

---

## 💾 Backups

**Backup de volúmenes:**
```bash
# Backup de uploads
docker run --rm -v analisis-encuestas_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data

# Backup de configuración
docker run --rm -v analisis-encuestas_app_data:/data -v $(pwd):/backup alpine tar czf /backup/app-data-backup.tar.gz /data
```

- [ ] Script de backup creado
- [ ] Backup automático configurado (cron)
- [ ] Backups probados (restore)

---

## 📝 Documentación

- [ ] README.md actualizado con información del servidor
- [ ] Credenciales guardadas de forma segura
- [ ] Comandos útiles documentados
- [ ] Contactos de soporte anotados

---

## 🎯 Post-Deployment

- [ ] URL de producción documentada
- [ ] Usuarios notificados
- [ ] Capacitación realizada (si aplica)
- [ ] Plan de mantenimiento definido
- [ ] Proceso de actualización documentado

---

## 🆘 Plan de Contingencia

**En caso de problemas:**

1. Verificar logs: `docker compose --profile prod logs`
2. Reiniciar contenedor: `docker compose --profile prod restart`
3. Reconstruir si es necesario: `docker compose --profile prod build --no-cache`
4. Rollback: Restaurar backup de la versión anterior

- [ ] Plan de contingencia probado
- [ ] Contactos de emergencia disponibles

---

## 📞 Información de Contacto

**Servidor:**
- IP: `___________________`
- Usuario: `___________________`
- SSH Port: `___________________`

**Aplicación:**
- URL: `___________________`
- Puerto: `___________________`

**Responsables:**
- Técnico: `___________________`
- Contacto: `___________________`

---

**Fecha de deployment:** `___________________`
**Versión:** `2.0.0`
**Responsable:** `___________________`

---

## ✅ Deployment Completado

- [ ] Todas las verificaciones pasaron
- [ ] Aplicación funcionando en producción
- [ ] Documentación completa
- [ ] Equipo notificado
- [ ] Monitoreo activo

**¡Felicidades! 🎉**
