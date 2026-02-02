# Configuración de Desarrollo Remoto

## Opción 1: VSCode Remote SSH (Recomendado)

### 1. Instalar extensión
En VSCode, instala la extensión: **Remote - SSH**

### 2. Conectar al servidor
1. Presiona `F1` o `Ctrl+Shift+P`
2. Escribe: `Remote-SSH: Connect to Host`
3. Selecciona `Add New SSH Host`
4. Ingresa: `root@192.168.30.12`
5. Contraseña: `PN4lG4gJqRWX5o$fJx2M1`

### 3. Abrir el proyecto
1. Una vez conectado, haz clic en `Open Folder`
2. Navega a: `/root/analisis-encuestas`
3. Ahora editas directamente en el servidor

### 4. Ver cambios en vivo
En el servidor, ejecuta el contenedor en modo desarrollo:

```bash
cd /root/analisis-encuestas
docker compose --profile dev up
```

Los cambios se verán automáticamente con hot-reload.

---

## Opción 2: Sincronización Automática (Script)

Ejecuta este script en otra terminal PowerShell:

```powershell
.\watch-and-sync.ps1
```

Este script detectará cambios locales y los copiará al servidor automáticamente.

---

## ¿Cuál usar?

- **Remote SSH**: Para editar directamente en producción (más seguro)
- **Auto-sync**: Para desarrollo local que se refleja en servidor
