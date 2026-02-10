# Script para reconstruir el contenedor en el servidor
Write-Host "Conectando al servidor..." -ForegroundColor Cyan

# Crear archivo temporal con comandos
$scriptContent = @'
#!/bin/bash
cd /root/analisis-encuestas
echo "=== Git Pull ==="
git pull
echo ""
echo "=== Docker Compose Down ==="
docker compose down
echo ""
echo "=== Docker Build (puede tardar 1-2 minutos) ==="
docker compose build --no-cache app --build-arg APP_VERSION=1.43
echo ""
echo "=== Docker Compose Up ==="
docker compose up -d app
echo ""
echo "=== Esperando 5 segundos ==="
sleep 5
echo ""
echo "=== Logs del Contenedor ==="
docker logs analisis-encuestas --tail 20
echo ""
echo "=== Estado del Contenedor ==="
docker ps | grep analisis
'@

# Guardar script temporal
$tempScript = "$env:TEMP\rebuild-remote.sh"
$scriptContent | Out-File -FilePath $tempScript -Encoding UTF8 -NoNewline

Write-Host "Ejecutando comandos en el servidor (requiere contraseña)..." -ForegroundColor Yellow
Write-Host "Contraseña: PN4lG4gJqRWX5o`$fJx2M1" -ForegroundColor Green
Write-Host ""

# Copiar script y ejecutar
scp $tempScript root@192.168.30.12:/tmp/rebuild.sh
ssh root@192.168.30.12 "chmod +x /tmp/rebuild.sh && /tmp/rebuild.sh"

Remove-Item $tempScript
