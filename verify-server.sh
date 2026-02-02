#!/bin/bash
# Script de verificación del servidor
# Ejecutar en el servidor remoto para obtener información del sistema

echo "======================================"
echo "  VERIFICACIÓN DEL SERVIDOR"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 1. Sistema Operativo
echo -e "${CYAN}1. Sistema Operativo${NC}"
echo "-----------------------------------"
echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
echo "Kernel: $(uname -r)"
echo "Arquitectura: $(uname -m)"
echo ""

# 2. Docker
echo -e "${CYAN}2. Docker${NC}"
echo "-----------------------------------"
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker instalado${NC}"
    docker --version
    
    if docker compose version &> /dev/null; then
        echo -e "${GREEN}✓ Docker Compose disponible${NC}"
        docker compose version
    else
        echo -e "${RED}✗ Docker Compose NO disponible${NC}"
    fi
else
    echo -e "${RED}✗ Docker NO instalado${NC}"
fi
echo ""

# 3. Usuario y permisos
echo -e "${CYAN}3. Usuario Actual${NC}"
echo "-----------------------------------"
echo "Usuario: $(whoami)"
echo "UID: $(id -u)"
echo "Grupos: $(groups)"
if groups | grep -q docker; then
    echo -e "${GREEN}✓ Usuario en grupo docker${NC}"
else
    echo -e "${YELLOW}⚠ Usuario NO en grupo docker${NC}"
fi
echo ""

# 4. Recursos del sistema
echo -e "${CYAN}4. Recursos del Sistema${NC}"
echo "-----------------------------------"
echo "CPU(s): $(nproc)"
echo "RAM Total: $(free -h | awk '/^Mem:/ {print $2}')"
echo "RAM Disponible: $(free -h | awk '/^Mem:/ {print $7}')"
echo "RAM Libre: $(free -h | awk '/^Mem:/ {print $4}')"
echo ""

# 5. Espacio en disco
echo -e "${CYAN}5. Espacio en Disco${NC}"
echo "-----------------------------------"
df -h / | tail -1 | awk '{print "Disco raíz: "$2" total, "$4" disponible ("$5" usado)"}'
echo ""

# 6. Puertos en uso
echo -e "${CYAN}6. Puertos Relevantes${NC}"
echo "-----------------------------------"
for port in 3000 8080 80 443; do
    if netstat -tuln 2>/dev/null | grep -q ":$port " || ss -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${RED}✗ Puerto $port: OCUPADO${NC}"
    else
        echo -e "${GREEN}✓ Puerto $port: DISPONIBLE${NC}"
    fi
done
echo ""

# 7. Firewall
echo -e "${CYAN}7. Firewall${NC}"
echo "-----------------------------------"
if command -v ufw &> /dev/null; then
    echo "UFW detectado:"
    sudo ufw status
elif command -v firewall-cmd &> /dev/null; then
    echo "firewalld detectado:"
    sudo firewall-cmd --state 2>/dev/null || echo "firewalld inactivo"
elif command -v iptables &> /dev/null; then
    echo "iptables detectado:"
    if sudo iptables -L -n | grep -q "Chain INPUT"; then
        echo "iptables activo (reglas presentes)"
    else
        echo "iptables presente pero sin reglas"
    fi
else
    echo "No se detectó firewall conocido"
fi
echo ""

# 8. Contenedores Docker existentes
echo -e "${CYAN}8. Contenedores Docker${NC}"
echo "-----------------------------------"
if command -v docker &> /dev/null; then
    running=$(docker ps -q | wc -l)
    total=$(docker ps -a -q | wc -l)
    echo "Contenedores corriendo: $running"
    echo "Contenedores totales: $total"
    
    if [ $running -gt 0 ]; then
        echo ""
        echo "Contenedores activos:"
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    fi
fi
echo ""

# 9. Ruta de instalación sugerida
echo -e "${CYAN}9. Directorio de Instalación${NC}"
echo "-----------------------------------"
if [ "$(whoami)" = "root" ]; then
    INSTALL_DIR="/opt/analisis-encuestas"
else
    INSTALL_DIR="$HOME/analisis-encuestas"
fi
echo "Ruta sugerida: $INSTALL_DIR"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}⚠ El directorio ya existe${NC}"
else
    echo -e "${GREEN}✓ El directorio está disponible${NC}"
fi
echo ""

# 10. Conectividad
echo -e "${CYAN}10. Conectividad${NC}"
echo "-----------------------------------"
echo "Hostname: $(hostname)"
echo "IP privada(s):"
hostname -I
echo ""

# 11. Resumen y recomendaciones
echo "======================================"
echo -e "${CYAN}  RESUMEN Y RECOMENDACIONES${NC}"
echo "======================================"
echo ""

# Verificar requisitos mínimos
all_ok=true

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ CRÍTICO: Docker no está instalado${NC}"
    all_ok=false
fi

if ! docker compose version &> /dev/null; then
    echo -e "${YELLOW}⚠ ADVERTENCIA: Docker Compose no disponible${NC}"
    all_ok=false
fi

mem_available=$(free -m | awk '/^Mem:/ {print $7}')
if [ "$mem_available" -lt 1024 ]; then
    echo -e "${YELLOW}⚠ ADVERTENCIA: RAM disponible baja (< 1GB)${NC}"
fi

# Puerto recomendado
if netstat -tuln 2>/dev/null | grep -q ":3000 " || ss -tuln 2>/dev/null | grep -q ":3000 "; then
    echo -e "${YELLOW}Puerto 3000 ocupado. Usa otro puerto (ej: 8080)${NC}"
    RECOMMENDED_PORT="8080"
else
    echo -e "${GREEN}✓ Puerto 3000 disponible (recomendado)${NC}"
    RECOMMENDED_PORT="3000"
fi

echo ""
echo "======================================"
echo -e "${CYAN}  CONFIGURACIÓN RECOMENDADA${NC}"
echo "======================================"
echo ""
echo "Puerto a usar: $RECOMMENDED_PORT"
echo "Directorio de instalación: $INSTALL_DIR"
echo ""

if [ "$all_ok" = true ]; then
    echo -e "${GREEN}✓✓✓ Servidor listo para deployment ✓✓✓${NC}"
    echo ""
    echo "Próximo paso: Ejecutar el script de deployment"
else
    echo -e "${RED}✗✗✗ Servidor requiere configuración adicional ✗✗✗${NC}"
fi

echo ""
echo "Guardando información en server-info.txt..."
{
    echo "=== Información del Servidor ==="
    echo "Fecha: $(date)"
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "Docker: $(docker --version 2>/dev/null || echo 'No instalado')"
    echo "Docker Compose: $(docker compose version 2>/dev/null || echo 'No disponible')"
    echo "Usuario: $(whoami)"
    echo "RAM disponible: $(free -h | awk '/^Mem:/ {print $7}')"
    echo "Espacio en disco: $(df -h / | tail -1 | awk '{print $4}')"
    echo "Puerto recomendado: $RECOMMENDED_PORT"
    echo "Directorio sugerido: $INSTALL_DIR"
} > server-info.txt

echo -e "${GREEN}✓ Información guardada en server-info.txt${NC}"
echo ""
