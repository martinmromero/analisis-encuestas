# Despliegue en Producción - ITD Barceló

## 🌐 Dominio de Producción
**https://itd.barcelo.edu.ar/**

## ✅ Configuración Actual

La aplicación está lista para producción. Los cambios aplicados incluyen:

### 1. CORS Configurado
- ✅ Acepta peticiones desde `https://itd.barcelo.edu.ar`
- ✅ Permite desarrollo local (`localhost:3000`)
- ✅ Protección contra orígenes no autorizados

### 2. Rutas Relativas
- ✅ El frontend usa rutas relativas (`/api/...`)
- ✅ Se adapta automáticamente al dominio donde esté desplegado
- ✅ No requiere configuración adicional de URLs

## 🚀 Pasos para Desplegar

### Opción 1: Docker Compose (Recomendado)

```bash
# 1. Conectarse al servidor de producción
ssh usuario@itd.barcelo.edu.ar

# 2. Navegar al directorio del proyecto
cd /ruta/al/proyecto

# 3. Actualizar el código (si usa Git)
git pull origin main

# 4. Construir y levantar el contenedor de producción
docker-compose up -d app-prod

# 5. Verificar que está corriendo
docker-compose ps
docker-compose logs app-prod
```

### Opción 2: Docker Manual

```bash
# 1. Construir la imagen de producción
docker build --target prod -t analisis-encuestas:prod .

# 2. Detener contenedor anterior (si existe)
docker stop analisis-encuestas-prod
docker rm analisis-encuestas-prod

# 3. Ejecutar el contenedor
docker run -d \
  --name analisis-encuestas-prod \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/dictionaries:/app/dictionaries \
  -v $(pwd)/user-dictionary.json:/app/user-dictionary.json \
  -e NODE_ENV=production \
  -e PORT=3000 \
  --restart unless-stopped \
  analisis-encuestas:prod

# 4. Verificar logs
docker logs -f analisis-encuestas-prod
```

### Opción 3: Rebuild Completo

Si necesitas reconstruir todo desde cero:

```bash
# Detener y limpiar
docker-compose down
docker system prune -a

# Reconstruir y levantar
docker-compose build app-prod --no-cache
docker-compose up -d app-prod
```

## 🔧 Configuración del Servidor Web (Nginx/Apache)

Si usas un proxy inverso (Nginx recomendado):

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name itd.barcelo.edu.ar;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name itd.barcelo.edu.ar;

    # Configuración SSL
    ssl_certificate /etc/ssl/certs/itd.barcelo.edu.ar.crt;
    ssl_certificate_key /etc/ssl/private/itd.barcelo.edu.ar.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Configuración de proxy
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts para archivos grandes
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Configuración para uploads grandes
    client_max_body_size 50M;
}
```

Aplicar configuración:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Seguridad Adicional

### 1. Variables de Entorno Sensibles

Crea un archivo `.env.production`:

```bash
NODE_ENV=production
PORT=3000
# Agrega otras variables sensibles aquí
```

### 2. Permisos de Archivos

```bash
# Asegurar permisos correctos
chmod 755 uploads/
chmod 755 dictionaries/
chmod 644 user-dictionary.json
```

### 3. Firewall

```bash
# Permitir solo HTTPS (si Nginx maneja SSL)
sudo ufw allow 443/tcp
sudo ufw allow 80/tcp

# El puerto 3000 NO debe estar expuesto públicamente
# Solo accesible desde localhost
```

## 🔍 Verificación Post-Despliegue

1. **Verificar que el contenedor está corriendo:**
```bash
docker ps | grep analisis-encuestas
```

2. **Verificar logs en tiempo real:**
```bash
docker logs -f analisis-encuestas-prod
```

3. **Probar la aplicación:**
```bash
curl https://itd.barcelo.edu.ar
```

4. **Verificar en el navegador:**
- Ir a https://itd.barcelo.edu.ar
- Subir un archivo de prueba
- Verificar análisis de sentimientos
- Probar exportación de reportes

## 🔄 Actualización de la Aplicación

```bash
# 1. Hacer backup de datos importantes
cp -r uploads uploads_backup_$(date +%Y%m%d)
cp user-dictionary.json user-dictionary.backup_$(date +%Y%m%d).json

# 2. Actualizar código
git pull origin main

# 3. Reconstruir contenedor
docker-compose build app-prod

# 4. Reiniciar sin downtime (opcional)
docker-compose up -d app-prod

# 5. Verificar
docker-compose logs app-prod
```

## 📊 Monitoreo

### Ver recursos utilizados:
```bash
docker stats analisis-encuestas-prod
```

### Ver logs específicos:
```bash
# Últimas 100 líneas
docker logs --tail 100 analisis-encuestas-prod

# Seguir logs en tiempo real
docker logs -f analisis-encuestas-prod

# Logs de errores
docker logs analisis-encuestas-prod 2>&1 | grep -i error
```

## 🆘 Troubleshooting

### El contenedor no inicia:
```bash
docker logs analisis-encuestas-prod
docker-compose logs app-prod
```

### Problemas de permisos:
```bash
docker exec -it analisis-encuestas-prod ls -la /app/uploads
docker exec -it analisis-encuestas-prod ls -la /app/dictionaries
```

### Reiniciar la aplicación:
```bash
docker-compose restart app-prod
```

### Limpiar y empezar de nuevo:
```bash
docker-compose down
docker-compose up -d app-prod
```

## 📝 Notas Importantes

1. **Backups**: Los archivos en `uploads/` y `dictionaries/` son persistentes gracias a los volúmenes de Docker.

2. **Certificado SSL**: Asegúrate de que el certificado SSL esté válido y no expire.

3. **Actualizaciones**: Siempre haz backup antes de actualizar.

4. **Dominio Adicional**: Si necesitas agregar otro dominio permitido, edita el array `allowedOrigins` en [server.js](server.js#L86-L90).

## ✅ Checklist Final

- [ ] Código actualizado en el servidor
- [ ] Docker image construida para producción
- [ ] Contenedor corriendo en puerto 3000
- [ ] Nginx configurado como proxy inverso
- [ ] SSL/HTTPS funcionando
- [ ] CORS configurado correctamente
- [ ] Uploads y diccionarios con permisos correctos
- [ ] Aplicación accesible desde https://itd.barcelo.edu.ar
- [ ] Prueba de subida de archivo exitosa
- [ ] Prueba de análisis de sentimientos exitosa
- [ ] Prueba de exportación de reportes exitosa

## 🎉 ¡Listo!

Tu aplicación ahora está configurada para funcionar en **https://itd.barcelo.edu.ar/**

Para cualquier cambio de dominio en el futuro, solo necesitas actualizar el array `allowedOrigins` en el archivo [server.js](server.js).
