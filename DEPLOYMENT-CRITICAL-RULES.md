# ⚠️ ATENCIÓN: REGLAS CRÍTICAS DEPLOYMENT

## 🚨 NUNCA INCLUIR EN DEPLOYMENTS:

### ❌ Archivos de PRODUCCIÓN que NO deben sobrescribirse:

1. **`column-configs.json`**
   - Contiene configuraciones personalizadas de usuarios
   - Se crea y modifica en producción
   - Ya está en `.gitignore`
   
2. **`user-dictionary.json`** 
   - Diccionario personalizado de producción
   - Modificado por usuarios en runtime
   
3. **`dictionaries/`** (carpeta completa)
   - Diccionarios importados por usuarios
   - Se agregan dinámicamente en producción
   - Cada archivo es valioso

4. **`uploads/`** (archivos dentro)
   - Archivos Excel subidos por usuarios
   - Solo incluir `.gitkeep` en deployments

---

## ✅ LO QUE SÍ DEBE INCLUIRSE:

- `server.js` - Código del servidor
- `package.json` - Dependencias
- `Dockerfile` - Configuración Docker
- `docker-compose.yml` - Orquestación
- `public/` - Frontend (HTML, CSS, JS)
- `sentiment-dict.js` - Diccionario base (código)
- `column-config.js` - Lógica de configuración (código)
- Scripts de deployment

---

## 📝 SCRIPTS ACTUALIZADOS:

### ✅ `prepare-deployment.ps1`
Ahora **EXCLUYE** correctamente:
- ❌ `column-configs.json`
- ❌ `user-dictionary.json`  
- ❌ `dictionaries/`

### ✅ `.gitignore`
Ya tiene:
```
column-configs.json
uploads/*
```

---

## 🔄 FLUJO DE DEPLOYMENT CORRECTO:

```bash
# 1. Preparar deployment (SIN archivos de producción)
.\prepare-deployment.ps1

# 2. Copiar al servidor
scp analisis-encuestas-deploy.zip root@192.168.30.12:/root/

# 3. En el servidor
ssh root@192.168.30.12
cd /root
unzip -o analisis-encuestas-deploy.zip -d analisis-encuestas-NEW

# 4. PRESERVAR archivos de producción
cp /root/analisis-encuestas/column-configs.json /root/analisis-encuestas-NEW/
cp /root/analisis-encuestas/user-dictionary.json /root/analisis-encuestas-NEW/
cp -r /root/analisis-encuestas/dictionaries/* /root/analisis-encuestas-NEW/dictionaries/

# 5. Reemplazar aplicación
mv /root/analisis-encuestas /root/analisis-encuestas-OLD-$(date +%Y%m%d-%H%M%S)
mv /root/analisis-encuestas-NEW /root/analisis-encuestas

# 6. Reiniciar
cd /root/analisis-encuestas
docker restart analisis-encuestas
```

---

## 🆘 SI SE PISARON ARCHIVOS (Recovery):

```bash
# Buscar backups
find /tmp -name "column-configs-backup-*.json" 
find /opt -name "column-configs.json"
find /root -name "column-configs-backup-*.json"

# Restaurar
cp /tmp/column-configs-backup-FECHA.json /root/analisis-encuestas/column-configs.json
docker restart analisis-encuestas
```

---

## 📖 Referencias:

- Ver [PERSISTENCIA-PRODUCCION.md](PERSISTENCIA-PRODUCCION.md) para detalles completos
- Ver [.gitignore](.gitignore) para archivos excluidos
