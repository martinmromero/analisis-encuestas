# 🔒 Persistencia de Datos en Producción

## ✅ COMPORTAMIENTO CONFIRMADO

### 📚 Diccionarios

**✅ Los nuevos diccionarios se AGREGAN (NO reemplazan)**

- Cada diccionario importado se guarda en un archivo separado
- Ubicación: `dictionaries/<nombre>.json`
- Los diccionarios existentes en producción **NUNCA se eliminan** automáticamente
- Puedes tener múltiples diccionarios simultáneamente
- Solo se eliminan manualmente desde la interfaz

#### Ejemplo de comportamiento:

```bash
# Estado inicial en producción
dictionaries/
  ├── Diccionario_Sentimientos_v4.json
  └── Diccionario_Educacion.json

# Usuario importa nuevo diccionario "Salud"
# Resultado:
dictionaries/
  ├── Diccionario_Sentimientos_v4.json  ← PRESERVADO
  ├── Diccionario_Educacion.json         ← PRESERVADO
  └── Diccionario_Salud.json             ← NUEVO (AGREGADO)
```

**Persistencia en Docker:**
```yaml
# En docker-compose.yml
volumes:
  - dict_data:/app/dictionaries  # ✅ Configurado - PERSISTE entre deployments
```

---

### 🗂️ Configuraciones de Columnas

**✅ Las nuevas configuraciones se AGREGAN (NO reemplazan)**

- Ubicación en desarrollo: `./column-configs.json`
- Ubicación en producción: `/data/column-configs.json` (volumen Docker)
- Formato: Array de configuraciones
- Las configuraciones existentes **se preservan** al agregar nuevas
- Solo se reemplazan si tienen el **mismo nombre exacto**

#### Ejemplo de comportamiento:

```json
// Estado inicial en producción
[
  {
    "name": "Encuesta Docentes 2024",
    "identificacion": ["Carrera", "Materia"],
    "numericas": ["Pregunta 1", "Pregunta 2"],
    "textoLibre": ["Comentarios"]
  }
]

// Usuario guarda nueva configuración "Encuesta Alumnos 2025"
// Resultado:
[
  {
    "name": "Encuesta Docentes 2024",    // ← PRESERVADO
    "identificacion": ["Carrera", "Materia"],
    "numericas": ["Pregunta 1", "Pregunta 2"],
    "textoLibre": ["Comentarios"]
  },
  {
    "name": "Encuesta Alumnos 2025",     // ← NUEVO (AGREGADO)
    "identificacion": ["Sede", "Turno"],
    "numericas": ["ValoracionServicio"],
    "textoLibre": ["Sugerencias"]
  }
]
```

**⚠️ Reemplazo solo si hay nombre duplicado:**
```json
// Usuario guarda configuración con nombre "Encuesta Docentes 2024"
// Resultado: Se ACTUALIZA la configuración existente con ese nombre
// NO se crea una duplicada
```

**Persistencia en Docker:**
```yaml
# En docker-compose.yml
environment:
  - COLUMN_CONFIGS_FILE=/data/column-configs.json
volumes:
  - app_data:/data  # ✅ Configurado - PERSISTE entre deployments
```

---

## 🐳 Protección con Volúmenes Docker

### Volúmenes Configurados

```yaml
volumes:
  node_modules: {}      # Node modules (no se sobreescribe en prod)
  uploads_data: {}      # Archivos Excel subidos
  app_data: {}          # Configuraciones y datos persistentes
  dict_data: {}         # Diccionarios de sentimientos

services:
  app:
    volumes:
      - uploads_data:/app/uploads           # Archivos subidos
      - app_data:/data                      # Configuraciones de columnas
      - dict_data:/app/dictionaries         # Diccionarios
```

### ¿Qué se persiste entre deployments?

| Datos | Ubicación | Persiste | Volumen | Notas |
|-------|-----------|----------|---------|-------|
| **Configuraciones de columnas** | `/data/column-configs.json` | ✅ Sí | `app_data` | **Protegido** - NO se sobreescribe |
| **Diccionarios** | `/app/dictionaries/*.json` | ✅ Sí | `dict_data` | **Protegido** - Se agregan, no reemplazan |
| **Archivos subidos** | `/app/uploads/` | ✅ Sí | `uploads_data` | **Protegido** |
| **Código fuente** | `/app/` | ❌ No | - | Se reemplaza en cada deployment |

---

## 🔄 Ciclo de Deployment

### Lo que pasa en cada deployment:

```bash
# 1. Se construye nueva imagen Docker con código actualizado
docker-compose build

# 2. Se detiene el contenedor anterior
docker-compose down

# 3. Se inicia nuevo contenedor
docker-compose up -d

# 4. El nuevo contenedor monta los volúmenes existentes
# ✅ /data/column-configs.json    ← PRESERVADO (volumen app_data)
# ✅ /app/uploads/*                ← PRESERVADO (volumen uploads_data)
# ✅ /app/dictionaries/*           ← PRESERVADO (volumen dict_data)
```

### ✅ Datos PROTEGIDOS:
- Configuraciones de columnas guardadas por usuarios
- Diccionarios de sentimientos importados
- Archivos Excel subidos
- Datos en volúmenes Docker

### ❌ Datos que se REEMPLAZAN:
- Código fuente (server.js, public/*, etc.)
- `node_modules` (se rebuilean)
- Archivos en el repositorio Git (README.md, etc.)

---

## 🚀 Recomendaciones para Producción

### 1. Persistencia de diccionarios ✅ CONFIGURADA

**Estado actual:** Los diccionarios YA están persistidos en volumen Docker.

```yaml
# docker-compose.yml (Ya configurado)
volumes:
  dict_data: {}  # Volumen para diccionarios

services:
  app:
    volumes:
      - uploads_data:/app/uploads
      - app_data:/data
      - dict_data:/app/dictionaries  # ✅ YA CONFIGURADO
```

**Resultado:**
- ✅ Los diccionarios importados se PRESERVAN entre deployments
- ✅ Nuevos diccionarios se AGREGAN (no reemplazan)
- ✅ Los existentes NUNCA se eliminan automáticamente

### 2. Backup periódico

```bash
# Backup de todos los volúmenes
docker run --rm \
  -v analisis-encuestas_app_data:/data \
  -v analisis-encuestas_uploads_data:/uploads \
  -v analisis-encuestas_dict_data:/dictionaries \
  -v $(pwd)/backup:/backup \
  alpine tar czf /backup/analisis-encuestas-$(date +%Y%m%d).tar.gz /data /uploads /dictionaries

# Restaurar desde backup
docker run --rm \
  -v analisis-encuestas_app_data:/data \
  -v analisis-encuestas_uploads_data:/uploads \
  -v analisis-encuestas_dict_data:/dictionaries \
  -v $(pwd)/backup:/backup \
  alpine tar xzf /backup/analisis-encuestas-YYYYMMDD.tar.gz -C /
```

### 3. Verificar persistencia después de deployment

```bash
# Verificar que las configuraciones de columnas persisten
docker exec analisis-encuestas cat /data/column-configs.json

# Verificar diccionarios
docker exec analisis-encuestas ls -la /app/dictionaries/

# Verificar archivos subidos
docker exec analisis-encuestas ls -la /app/uploads/
```

---

## 📊 Resumen Visual

```
╔════════════════════════════════════════════════════════════╗
║  DEPLOYMENT NUEVO (git push / docker rebuild)             ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ✅ PRESERVADO (Volúmenes Docker)                         ║
║  ├── Configuraciones de columnas                          ║
║  ├── Diccionarios de sentimientos                         ║
║  ├── Archivos Excel subidos                               ║
║  └── Cualquier dato en /data/*                            ║
║                                                            ║
║  ❌ SE REEMPLAZA (Código nuevo)                           ║
║  ├── server.js                                            ║
║  ├── public/* (frontend)                                  ║
║  └── Todo el código de la aplicación                      ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🆘 Troubleshooting

### "Mis configuraciones desaparecieron después del deployment"

**Causa:** El archivo `column-configs.json` no está en el volumen Docker.

**Solución:**
```bash
# Verificar variable de entorno
docker exec analisis-encuestas env | grep COLUMN_CONFIGS_FILE
# Debe mostrar: COLUMN_CONFIGS_FILE=/data/column-configs.json

# Si está en /app/column-configs.json, mover a volumen:
docker exec analisis-encuestas cp /app/column-configs.json /data/column-configs.json
```

### "Mis diccionarios desaparecieron"

**Causa:** Error en configuración del volumen o problema con Docker.

**Solución:**
```bash
# Verificar que el volumen existe
docker volume ls | grep dict_data

# Verificar que está montado correctamente
docker inspect analisis-encuestas | grep dict_data

# Si no está montado, verificar docker-compose.yml
# Debe tener: - dict_data:/app/dictionaries

# Restaurar desde backup si es necesario
docker cp ./dictionaries-backup/. analisis-encuestas:/app/dictionaries/
```

### "¿Cómo sé qué se va a perder?"

**Regla simple:**
- ✅ **En volumen Docker** (`/data/*`, `/app/uploads/*`) → **SE PRESERVA**
- ❌ **En filesystem del contenedor** (todo lo demás) → **SE PIERDE**

**Verificar volúmenes:**
```bash
docker volume ls | grep analisis-encuestas
# Debe mostrar:
# analisis-encuestas_app_data
# analisis-encuestas_uploads_data
# analisis-encuestas_dict_data
```

---

## 📝 Checklist Pre-Deployment

Antes de hacer deployment a producción:

- [ ] ✅ Verificar que `COLUMN_CONFIGS_FILE=/data/column-configs.json`
- [ ] ✅ Verificar que volumen `app_data` existe
- [ ] ✅ Verificar que volumen `uploads_data` existe
- [ ] ✅ Verificar que volumen `dict_data` existe para diccionarios
- [ ] ✅ Hacer backup de volúmenes importantes
- [ ] ✅ Documentar ubicación de datos críticos para el equipo

---

## 🔗 Documentos Relacionados

- [COLUMN-CONFIGS-PERSISTENCE.md](COLUMN-CONFIGS-PERSISTENCE.md) - Detalles de configuraciones de columnas
- [MULTI-DICTIONARY-GUIDE.md](MULTI-DICTIONARY-GUIDE.md) - Guía de gestión de diccionarios
- [DOCKER-README.md](DOCKER-README.md) - Guía completa de Docker
- [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) - Guía de deployment

---

**Última actualización:** Febrero 10, 2026
**Versión:** 1.0
