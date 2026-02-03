# 🔧 Configuraciones de Columnas - Sistema de Persistencia

## ⚠️ IMPORTANTE: Cambio en el manejo de configuraciones

### Problema anterior
Las configuraciones de columnas se guardaban en `column-configs.json` dentro del repositorio Git, causando que:
- Cada `git push` sobreescribiera las configuraciones guardadas en el servidor
- Las configuraciones creadas dinámicamente se perdieran con cada deployment

### Solución implementada

**Ahora las configuraciones se persisten en un volumen Docker:**
- En **desarrollo**: `./column-configs.json` (local)
- En **producción**: `/data/column-configs.json` (volumen Docker persistente `app_data`)

### Archivos

- **`column-configs.example.json`**: Plantilla de ejemplo (tracked en git)
- **`column-configs.json`**: Archivo real con tus configuraciones (NO tracked en git)

### Cómo funciona

1. **Primera ejecución**: Si no existe `column-configs.json`, se crea vacío `[]`
2. **Guardar config**: Se guarda en el volumen persistente (no en el repositorio)
3. **Deployment**: El archivo NO se sobreescribe, se mantienen las configuraciones

### Variables de entorno

```yaml
# En docker-compose.yml
COLUMN_CONFIGS_FILE=/data/column-configs.json
```

### Migrar configuraciones existentes

Si tienes configuraciones en el servidor que quieres preservar:

```bash
# En el servidor
docker cp analisis-encuestas:/app/column-configs.json /tmp/backup-configs.json
docker cp /tmp/backup-configs.json analisis-encuestas:/data/column-configs.json
```

## 📝 Formato de configuración

Cada configuración tiene esta estructura:

```json
{
  "name": "Nombre descriptivo",
  "identificacion": ["columna1", "columna2"],
  "numericas": ["pregunta1", "pregunta2"],
  "textoLibre": ["comentarios", "sugerencias"],
  "escalas": {
    "pregunta1": {
      "type": "scale",
      "min": 1,
      "max": 10,
      "direction": "ascending"
    }
  },
  "created": "2026-02-03T00:00:00.000Z",
  "updated": "2026-02-03T00:00:00.000Z"
}
```
