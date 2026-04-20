@echo off
echo.
echo ========================================
echo   RECONSTRUCCION COMPLETA DE CONTENEDOR
echo ========================================
echo.

set PLINK=%TEMP%\plink.exe
set SERVER=root@192.168.30.12
set PASSWORD=PN4lG4gJqRWX5o$fJx2M1

echo 1. Deteniendo contenedor actual...
%PLINK% -batch -pw %PASSWORD% %SERVER% "cd /opt/analisis-encuestas && docker-compose down"
echo.

echo 2. Eliminando contenedor e imagen...
%PLINK% -batch -pw %PASSWORD% %SERVER% "docker rm -f analisis-encuestas 2>NUL"
%PLINK% -batch -pw %PASSWORD% %SERVER% "docker rmi analisis-encuestas_app 2>NUL"
echo.

echo 3. Reconstruyendo imagen (sin cache)...
%PLINK% -batch -pw %PASSWORD% %SERVER% "cd /opt/analisis-encuestas && docker-compose build --no-cache"
echo.

echo 4. Levantando contenedor...
%PLINK% -batch -pw %PASSWORD% %SERVER% "cd /opt/analisis-encuestas && docker-compose up -d"
echo.

echo 5. Esperando 15 segundos...
timeout /t 15 /nobreak >nul
echo.

echo 6. Verificando estado...
%PLINK% -batch -pw %PASSWORD% %SERVER% "docker ps | grep analisis"
echo.

echo 7. Logs del contenedor:
%PLINK% -batch -pw %PASSWORD% %SERVER% "docker logs analisis-encuestas --tail 30"
echo.

echo 8. Test HTTP:
%PLINK% -batch -pw %PASSWORD% %SERVER% "curl -s -o /dev/null -w 'HTTP %%{http_code}\n' http://localhost:3000"
echo.

echo ========================================
echo   PROCESO COMPLETADO
echo ========================================
echo.
echo URL: http://192.168.30.12:3000
echo.
pause
