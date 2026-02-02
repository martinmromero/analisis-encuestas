$zip = "C:\Users\Public\analisis-encuestas\analisis-encuestas-deploy.zip"
Write-Host "Copiando a 192.168.30.12..." -ForegroundColor Yellow
Write-Host "Password: PN4lG4gJqRWX5o$fJx2M1" -ForegroundColor Gray
scp "$zip" root@192.168.30.12:/root/
