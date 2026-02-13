@echo off
echo ============================================
echo   DEPLOYMENT AL SERVIDOR ITD BARCELO
echo ============================================
echo.
echo Password: PN4lG4gJqRWX5o$fJx2M1
echo.
echo Ejecutando deployment remoto...
echo.

ssh root@192.168.30.12 "cd /var/www/analisis-encuestas && BACKUP_DIR=/tmp/backup-$(date +%%Y%%m%%d-%%H%%M%%S) && mkdir -p $BACKUP_DIR && cp -f column-configs.json user-dictionary.json $BACKUP_DIR/ 2>/dev/null || true && cp -r dictionaries uploads $BACKUP_DIR/ 2>/dev/null || true && git fetch origin && git reset --hard origin/main && cp -f $BACKUP_DIR/* ./ 2>/dev/null || true && cp -r $BACKUP_DIR/dictionaries $BACKUP_DIR/uploads ./ 2>/dev/null || true && docker-compose down && docker-compose build --no-cache && docker-compose up -d && echo Backup en: $BACKUP_DIR"

if %errorlevel% == 0 (
    echo.
    echo ============================================
    echo   DEPLOYMENT COMPLETADO EXITOSAMENTE
    echo ============================================
    echo.
    echo Sitio: http://itd.barcelo.edu.ar
) else (
    echo.
    echo ============================================
    echo   ERROR EN DEPLOYMENT
    echo ============================================
)
echo.
pause
