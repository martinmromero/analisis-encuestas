#!/bin/bash
# Script de deployment automático para analisis-encuestas
# Ejecutar en el servidor después de copiar los archivos

set -e  # Salir si hay errores

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================"
echo "  DEPLOYMENT: Análisis de Encuestas"
echo "======================================${NC}"
echo ""

# Variables
INSTALL_DIR="/opt/analisis-encuestas"
DEFAULT_PORT=3000
COMPOSE_FILE="docker-compose.yml"

# Detectar directorio actual
CURRENT_DIR=$(pwd)
echo "Directorio actual: $CURRENT_DIR"
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "server.js" ] || [ ! -f "package.json" ]; then
    echo -e "${RED}ERROR: No se encontraron archivos de la aplicación${NC}"
    echo "Asegúrate de estar en el directorio correcto"
    exit 1
fi

# Verificar Docker
echo -e "${YELLOW}Verificando Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}ERROR: Docker no está instalado${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker: $(docker --version)${NC}"

if ! docker compose version &> /dev/null; then
    echo -e "${RED}ERROR: Docker Compose no está disponible${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose: $(docker compose version)${NC}"
echo ""

# Preguntar puerto
echo -e "${YELLOW}Configuración del puerto:${NC}"
if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    echo -e "${YELLOW}⚠ Puerto 3000 está ocupado${NC}"
    read -p "Ingresa el puerto a usar (ej: 8080): " CUSTOM_PORT
    PORT=${CUSTOM_PORT:-8080}
else
    read -p "Puerto a usar [3000]: " CUSTOM_PORT
    PORT=${CUSTOM_PORT:-3000}
fi
echo "Usando puerto: $PORT"
echo ""

# Modificar docker-compose.yml si es necesario
if [ "$PORT" != "3000" ]; then
    echo -e "${YELLOW}Ajustando configuración de puerto en docker-compose.yml...${NC}"
    sed -i.bak "s/\"3000:3000\"/\"$PORT:3000\"/g" docker-compose.yml
    echo -e "${GREEN}✓ Puerto configurado a $PORT${NC}"
fi
echo ""

# Detener contenedores previos si existen
echo -e "${YELLOW}Deteniendo contenedores previos (si existen)...${NC}"
docker compose --profile prod down 2>/dev/null || true
echo ""

# Calcular versión desde git
echo -e "${CYAN}Calculando versión desde git...${NC}"
if [ -d .git ]; then
    COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "033")
    APP_VERSION="1.${COMMIT_COUNT}"
    echo -e "${GREEN}✓ Versión calculada: ${APP_VERSION}${NC}"
else
    APP_VERSION="1.033"
    echo -e "${YELLOW}⚠ No se encontró .git, usando versión default: ${APP_VERSION}${NC}"
fi
export APP_VERSION
echo ""

# Construir imagen con versión
echo -e "${CYAN}Construyendo imagen Docker con versión ${APP_VERSION}...${NC}"
docker compose --profile prod build --build-arg APP_VERSION=${APP_VERSION}
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Falló la construcción de la imagen${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Imagen construida exitosamente${NC}"
echo ""

# Iniciar contenedor
echo -e "${CYAN}Iniciando contenedor en modo producción...${NC}"
docker compose --profile prod up -d
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Falló el inicio del contenedor${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Contenedor iniciado${NC}"
echo ""

# Esperar a que el servidor esté listo
echo -e "${YELLOW}Esperando a que el servidor esté listo...${NC}"
sleep 5

# Verificar estado
echo -e "${YELLOW}Verificando estado del contenedor...${NC}"
if docker ps | grep -q "analisis-encuestas"; then
    echo -e "${GREEN}✓ Contenedor corriendo correctamente${NC}"
else
    echo -e "${RED}ERROR: El contenedor no está corriendo${NC}"
    echo "Ver logs:"
    docker compose --profile prod logs --tail=50
    exit 1
fi
echo ""

# Verificar logs
echo -e "${CYAN}Últimas líneas de los logs:${NC}"
docker compose --profile prod logs --tail=20
echo ""

# Configurar firewall (si es necesario)
echo -e "${YELLOW}¿Deseas abrir el puerto $PORT en el firewall? (s/n)${NC}"
read -p "> " OPEN_FIREWALL
if [ "$OPEN_FIREWALL" = "s" ] || [ "$OPEN_FIREWALL" = "S" ]; then
    if command -v ufw &> /dev/null; then
        echo "Abriendo puerto en UFW..."
        sudo ufw allow $PORT/tcp
        sudo ufw reload
        echo -e "${GREEN}✓ Puerto $PORT abierto en UFW${NC}"
    elif command -v firewall-cmd &> /dev/null; then
        echo "Abriendo puerto en firewalld..."
        sudo firewall-cmd --permanent --add-port=$PORT/tcp
        sudo firewall-cmd --reload
        echo -e "${GREEN}✓ Puerto $PORT abierto en firewalld${NC}"
    else
        echo -e "${YELLOW}No se detectó firewall conocido. Configúralo manualmente si es necesario.${NC}"
    fi
fi
echo ""

# Obtener IPs
echo -e "${CYAN}======================================"
echo "  DEPLOYMENT COMPLETADO"
echo "======================================${NC}"
echo ""
echo -e "${GREEN}✓✓✓ Aplicación instalada exitosamente ✓✓✓${NC}"
echo ""
echo -e "${CYAN}Información de acceso:${NC}"
echo "-----------------------------------"
echo "Puerto: $PORT"
echo "Contenedor: analisis-encuestas"
echo ""
echo "URLs de acceso:"
echo "  - http://localhost:$PORT (desde el servidor)"
echo "  - http://$(hostname -I | awk '{print $1}'):$PORT (desde la red local)"
echo ""
echo -e "${CYAN}Comandos útiles:${NC}"
echo "-----------------------------------"
echo "Ver logs:           docker compose --profile prod logs -f"
echo "Detener:            docker compose --profile prod down"
echo "Reiniciar:          docker compose --profile prod restart"
echo "Ver estado:         docker ps"
echo "Entrar al shell:    docker exec -it analisis-encuestas sh"
echo ""
echo -e "${CYAN}Monitoreo:${NC}"
echo "-----------------------------------"
echo "Ver logs en tiempo real:"
echo "  docker compose --profile prod logs -f"
echo ""

# Guardar información
{
    echo "=== DEPLOYMENT COMPLETADO ==="
    echo "Fecha: $(date)"
    echo "Puerto: $PORT"
    echo "Directorio: $(pwd)"
    echo "Contenedor: analisis-encuestas"
    echo "URL: http://$(hostname -I | awk '{print $1}'):$PORT"
    echo ""
    echo "Comandos útiles guardados arriba"
} > deployment-info.txt

echo -e "${GREEN}✓ Información guardada en deployment-info.txt${NC}"
echo ""
echo -e "${YELLOW}¿Ver logs en tiempo real? (s/n)${NC}"
read -p "> " VIEW_LOGS
if [ "$VIEW_LOGS" = "s" ] || [ "$VIEW_LOGS" = "S" ]; then
    docker compose --profile prod logs -f
fi
