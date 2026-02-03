cd /root/analisis-encuestas
docker compose down
docker compose build --no-cache --build-arg APP_VERSION=1.43 app
docker compose up -d app
docker ps | grep analisis
docker logs analisis-encuestas --tail 10
