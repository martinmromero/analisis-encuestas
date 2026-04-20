$plink = "$env:TEMP\plink-final-fix.exe"
$password = 'PN4lG4gJqRWX5o$fJx2M1'

Write-Host "`n=== VERIFICANDO ===" -ForegroundColor Cyan

& $plink -batch -pw $password "root@192.168.30.12" "ls -lh /opt/analisis-encuestas/column-configs.json /opt/analisis-encuestas/user-dictionary.json"

Write-Host "`n=== DICCIONARIOS ===" -ForegroundColor Cyan
& $plink -batch -pw $password "root@192.168.30.12" "ls -lh /opt/analisis-encuestas/dictionaries/"

Write-Host "`n=== CONTENIDO COLUMN-CONFIGS ===" -ForegroundColor Cyan
& $plink -batch -pw $password "root@192.168.30.12" "cat /opt/analisis-encuestas/column-configs.json"

pause
