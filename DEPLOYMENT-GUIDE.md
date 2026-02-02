# Guía de Deployment para Servidor Remoto

Esta guía te ayudará a copiar y ejecutar la aplicación en un servidor remoto.

## 📦 Preparar para Deployment

### 1. Crear archivo de deployment (ya incluido)

El proyecto incluye un `docker-compose.yml` con perfil de producción optimizado.

### 2. Archivos necesarios para el servidor

Los siguientes archivos **DEBEN** copiarse al servidor:

```
analisis-encuestas/
├── server.js
├── package.json
├── package-lock.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── sentiment-dict.js
├── column-config.js
├── user-dictionary.json
├── column-configs.json
├── ignored-phrases.json
├── dictionaries/
│   └── (todos los archivos .json)
├── public/
│   ├── index.html
│   ├── app.js
│   ├── styles.css
│   ├── cascade-filters.js
│   ├── column-config-manager.js
│   └── logobarcelo_cmyk_jpg.jpg
└── uploads/
    └── .gitkeep
```

### 3. Archivos que NO deben copiarse

Estos archivos están excluidos en `.dockerignore`:
- `node_modules/` (se instalarán en el servidor)
- Archivos `*.md` (documentación)
- Scripts `.ps1` y `.sh` (específicos de Windows/Linux local)
- Archivos de desarrollo
- `.git/`

---

## 🚀 Deployment en Servidor Remoto

### Opción A: Usando SCP/SFTP (Recomendado)

#### 1. Comprimir el proyecto
```powershell
# En tu máquina local (Windows)
Compress-Archive -Path "C:\Users\Public\analisis-encuestas\*" -DestinationPath "C:\Users\Public\analisis-encuestas-deploy.zip" -Force
```

#### 2. Copiar al servidor
```bash
# Desde el servidor o tu máquina local con SCP
scp C:\Users\Public\analisis-encuestas-deploy.zip usuario@servidor:/home/usuario/
```

#### 3. En el servidor
```bash
# Conectarse al servidor
ssh usuario@servidor

# Descomprimir
unzip analisis-encuestas-deploy.zip -d analisis-encuestas
cd analisis-encuestas

# Iniciar con Docker
docker compose --profile prod up -d

# Ver logs
docker compose --profile prod logs -f
```

---

### Opción B: Usando Git (Si tienes repositorio)

#### 1. En tu máquina local
```bash
git init
git add .
git commit -m "Initial deployment"
git remote add origin https://github.com/tu-usuario/analisis-encuestas.git
git push -u origin main
```

#### 2. En el servidor
```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/analisis-encuestas.git
cd analisis-encuestas

# Iniciar con Docker
docker compose --profile prod up -d
```

---

## 🔧 Configuración del Servidor

### Requisitos del servidor
- Sistema operativo: Linux (Ubuntu 20.04+, Debian, CentOS)
- Docker Engine 20.10+
- Docker Compose v2.0+
- Puerto 3000 disponible (o configurar otro)

### Instalar Docker en el servidor (Ubuntu/Debian)
```bash
# Actualizar paquetes
sudo apt update

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo apt install docker-compose-plugin

# Verificar instalación
docker --version
docker compose version
```

---

## 🌐 Configurar Puerto Personalizado

Si quieres usar un puerto diferente al 3000:

### Editar `docker-compose.yml`
```yaml
services:
  app:
    ports:
      - "8080:3000"  # Cambiar 8080 al puerto deseado
```

### Configurar firewall (si aplica)
```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw reload

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

---

## 🔄 Actualizar la Aplicación en el Servidor

### Método 1: Con Git
```bash
cd analisis-encuestas
git pull origin main
docker compose --profile prod down
docker compose --profile prod build
docker compose --profile prod up -d
```

### Método 2: Subiendo archivos nuevos
```bash
# Detener contenedor
docker compose --profile prod down

# Copiar archivos actualizados (desde tu máquina local)
scp -r public/* usuario@servidor:/ruta/analisis-encuestas/public/
scp server.js usuario@servidor:/ruta/analisis-encuestas/

# En el servidor: reconstruir y reiniciar
docker compose --profile prod build
docker compose --profile prod up -d
```

---

## 📝 Editar la Aplicación en el Servidor

### Opción 1: Edición local y deployment
1. Edita archivos en tu máquina local
2. Prueba localmente con Docker
3. Sube cambios al servidor (Git o SCP)
4. Reinicia el contenedor

### Opción 2: Edición directa en el servidor
```bash
# Conectarse al servidor
ssh usuario@servidor
cd analisis-encuestas

# Editar archivos (ejemplo con nano)
nano public/app.js
nano public/styles.css
nano server.js

# Reiniciar contenedor para aplicar cambios
docker compose --profile prod restart

# O reconstruir si cambiaste dependencias
docker compose --profile prod down
docker compose --profile prod build
docker compose --profile prod up -d
```

### Opción 3: Usar VS Code con SSH remoto
1. Instalar extensión "Remote - SSH" en VS Code
2. Conectarse al servidor
3. Editar archivos directamente desde VS Code
4. Reiniciar contenedor cuando termines

---

## 🛠️ Comandos Útiles en el Servidor

```bash
# Ver estado del contenedor
docker compose --profile prod ps

# Ver logs en tiempo real
docker compose --profile prod logs -f

# Ver logs de las últimas 100 líneas
docker compose --profile prod logs --tail=100

# Detener aplicación
docker compose --profile prod down

# Iniciar aplicación
docker compose --profile prod up -d

# Reiniciar aplicación
docker compose --profile prod restart

# Reconstruir imagen (después de cambios)
docker compose --profile prod build

# Ver uso de recursos
docker stats analisis-encuestas

# Entrar al contenedor (debugging)
docker exec -it analisis-encuestas sh

# Backup de datos persistentes
docker run --rm -v analisis-encuestas_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz /data
```

---

## 🔐 Configurar HTTPS (Opcional pero recomendado)

### Usando Nginx Reverse Proxy + Let's Encrypt

```bash
# Instalar Nginx
sudo apt install nginx

# Configurar Nginx
sudo nano /etc/nginx/sites-available/analisis-encuestas

# Contenido del archivo:
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Activar configuración
sudo ln -s /etc/nginx/sites-available/analisis-encuestas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Instalar certificado SSL con Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com
```

---

## 📊 Monitoreo

### Ver logs en tiempo real
```bash
docker compose --profile prod logs -f app
```

### Verificar que la aplicación está corriendo
```bash
curl http://localhost:3000
```

### Verificar desde afuera del servidor
```bash
curl http://tu-servidor-ip:3000
```

---

## 🆘 Troubleshooting

### Problema: El contenedor no inicia
```bash
# Ver logs de error
docker compose --profile prod logs

# Verificar que el puerto no esté ocupado
sudo netstat -tulpn | grep 3000

# Revisar permisos
ls -la
```

### Problema: Cambios no se reflejan
```bash
# Reconstruir imagen
docker compose --profile prod down
docker compose --profile prod build --no-cache
docker compose --profile prod up -d
```

### Problema: Error de permisos en uploads
```bash
# Dentro del contenedor
docker exec -it analisis-encuestas sh
ls -la /app/uploads
chmod 777 /app/uploads
```

---

## 📧 Soporte

Si tienes problemas, revisa:
1. Los logs del contenedor
2. Que Docker esté corriendo
3. Que el puerto esté disponible
4. Que tengas suficiente espacio en disco
