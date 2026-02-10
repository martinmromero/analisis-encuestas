$commands = "cd /root/analisis-encuestas && docker compose down && docker compose build app --build-arg APP_VERSION=46 --no-cache && docker compose up -d app && docker logs analisis-encuestas --tail 30"

ssh root@192.168.30.12 $commands
