# 🐳 Docker Quick Start

## Desarrollo Local (Recomendado)

### Levantar servidor con hot-reload
```powershell
docker compose --profile dev up
```

**Características:**
- ✅ Edita el código localmente desde VS Code
- ✅ Los cambios se recargan automáticamente (nodemon)
- ✅ Accede en http://localhost:3000
- ✅ Datos persistentes en volúmenes Docker

### Comandos útiles

```powershell
# Levantar en segundo plano
docker compose --profile dev up -d

# Ver logs en tiempo real
docker logs -f analisis-encuestas-dev

# Detener contenedor
docker compose --profile dev down

# Reconstruir imagen (tras cambios en package.json)
docker compose --profile dev up --build
```

## Producción (Deployment)

### Levantar en servidor
```powershell
# Primera vez
docker compose --profile prod up -d --build

# Ver logs
docker logs -f analisis-encuestas

# Detener
docker compose --profile prod down
```

### Actualizar en servidor
```powershell
# 1. Obtener código actualizado
git pull

# 2. Reconstruir imagen
docker compose --profile prod build

# 3. Reiniciar servicio
docker compose --profile prod up -d
```

## Gestión de Datos

### Backup del diccionario personalizado
```powershell
docker cp analisis-encuestas:/data/user-dictionary.json ./backup-dictionary.json
```

### Restaurar diccionario
```powershell
docker cp ./backup-dictionary.json analisis-encuestas:/data/user-dictionary.json
docker restart analisis-encuestas
```

### Limpiar volúmenes (¡Cuidado! Borra datos)
```powershell
docker compose --profile dev down -v
```

## Troubleshooting

### Puerto 3000 ya en uso
```powershell
# Detener proceso Node.js local
Stop-Process -Name node -Force

# O cambiar puerto en docker-compose.yml:
# ports:
#   - "3001:3000"
```

### Cambios no se reflejan
1. Verifica que usas el perfil `dev`
2. Confirma que nodemon está corriendo: `docker logs analisis-encuestas-dev`
3. Reconstruye si cambiaste dependencies: `docker compose --profile dev up --build`

### Ver estado de contenedores
```powershell
docker ps
docker compose ps
```

### Entrar al contenedor (debug)
```powershell
docker exec -it analisis-encuestas-dev sh
```

## Diferencias Dev vs Prod

| Característica | Dev | Prod |
|---|---|---|
| Código | Montado desde local | Dentro de imagen |
| Hot reload | ✅ Sí (nodemon) | ❌ No |
| node_modules | En volumen | En imagen |
| Edición | En vivo | Rebuild necesario |
| Tamaño imagen | Mayor | Optimizado |
| Restart policy | No | unless-stopped |

---

**💡 Tip:** Para desarrollo siempre usa `--profile dev` y edita desde tu editor favorito. Los cambios se reflejan automáticamente.
