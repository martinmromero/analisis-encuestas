@echo off
echo === CORRIGIENDO CONTENEDOR DOCKER ===
cd %TEMP%
if not exist plink-fix.exe (
    echo Descargando plink...
    powershell -Command "Invoke-WebRequest -Uri 'https://the.earth.li/~sgtatham/putty/latest/w64/plink.exe' -OutFile '%TEMP%\plink-fix.exe'"
)

echo Conectando al servidor...
echo y | plink-fix.exe -batch -pw "PN4lG4gJqRWX5o$fJx2M1" root@192.168.30.12 "docker cp /opt/analisis-encuestas/public/index.html analisis-encuestas:/app/public/index.html && docker exec analisis-encuestas rm -f /app/public/cascade-filters.js && docker restart analisis-encuestas && sleep 8 && echo '=== VERIFICANDO ===' && docker exec analisis-encuestas grep 'cascade-filters' /app/public/index.html || echo 'CASCADE-FILTERS REMOVIDO OK' && curl -s -w 'HTTP %%{http_code}' http://localhost:3000"

echo.
echo === COMPLETADO ===
pause
