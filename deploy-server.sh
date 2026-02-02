#!/bin/bash
# Script de deployment para servidor Linux

echo "🚀 Deployment de Análisis de Encuestas"
echo "======================================"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Verificar que Docker esté instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo -e "${YELLOW}Instálalo con: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh${NC}"
    exit 1
fi

# Verificar que Docker Compose esté disponible
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está disponible${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker está instalado${NC}"
echo ""

# Detener contenedores previos
echo -e "${YELLOW}Deteniendo contenedores previos...${NC}"
docker compose --profile prod down 2>/dev/null

# Construir imagen
echo ""
echo -e "${CYAN}Construyendo imagen de producción...${NC}"
docker compose --profile prod build

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${CYAN}Iniciando contenedor...${NC}"
    docker compose --profile prod up -d
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ ¡Aplicación iniciada exitosamente!${NC}"
        echo ""
        echo -e "${CYAN}📋 Información:${NC}"
        echo "   - URL: http://localhost:3000"
        echo "   - Contenedor: analisis-encuestas"
        echo ""
        echo -e "${CYAN}📝 Comandos útiles:${NC}"
        echo "   Ver logs:    docker compose --profile prod logs -f"
        echo "   Detener:     docker compose --profile prod down"
        echo "   Reiniciar:   docker compose --profile prod restart"
        echo ""
        
        # Mostrar logs
        read -p "¿Ver logs en tiempo real? (s/n): " ver_logs
        if [ "$ver_logs" = "s" ] || [ "$ver_logs" = "S" ]; then
            docker compose --profile prod logs -f
        fi
    else
        echo -e "${RED}❌ Error al iniciar el contenedor${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Error al construir la imagen${NC}"
    exit 1
fi
