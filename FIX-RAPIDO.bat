@echo off
echo ================================
echo DEPLOYMENT RAPIDO - FIX FILTROS
echo ================================
echo.

cd /d C:\Users\martin.romero\analisis-encuestas-main

echo [1/4] Creando comandos SSH...
(
echo cd /opt/analisis-encuestas/public
echo rm -f cascade-filters.js
echo echo "Archivo cascade-filters.js eliminado"
echo cd /opt/analisis-encuestas
echo docker-compose restart app-prod
echo docker-compose ps
) > comandos-ssh.txt

echo.
echo [2/4] Los comandos estan listos.
echo.
echo ================================
echo EJECUTA ESTOS 2 COMANDOS:
echo ================================
echo.
echo 1. ssh root@192.168.30.12
echo    Password: PN4lG4gJqRWX5o$fJx2M1
echo.
echo 2. Una vez conectado, ejecuta:
echo.
type comandos-ssh.txt
echo.
echo ================================
echo.
pause
