$sshCommand = @"
docker exec analisis-encuestas printenv APP_VERSION
echo "---"
docker logs analisis-encuestas 2>&1 | grep -i "error.*gráfico" | tail -5
echo "---"
docker inspect analisis-encuestas | grep -A2 APP_VERSION
"@

ssh root@192.168.30.12 $sshCommand
