# Configuración de Auto-Deploy con GitHub Actions

## ✅ Pasos de Configuración (Una sola vez)

### 1. Configurar Git en el Servidor

Conéctate al servidor y ejecuta:

```bash
ssh root@192.168.30.12
cd /root/analisis-encuestas
git init
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"
```

### 2. Configurar Secrets en GitHub

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú izquierdo, click en **Secrets and variables** → **Actions**
4. Click en **New repository secret**
5. Agrega estos 3 secrets:

   **Secret 1:**
   - Name: `SERVER_HOST`
   - Value: `192.168.30.12`

   **Secret 2:**
   - Name: `SERVER_USER`
   - Value: `root`

   **Secret 3:**
   - Name: `SERVER_PASSWORD`
   - Value: `PN4lG4gJqRWX5o$fJx2M1`

### 3. Hacer el Primer Push

Desde tu máquina local:

```powershell
cd C:\Users\Public\analisis-encuestas
git add .
git commit -m "Configurar auto-deploy"
git push origin main
```

## 🚀 Cómo Funciona

A partir de ahora, cada vez que hagas:

```powershell
git add .
git commit -m "Tus cambios"
git push
```

**GitHub Actions automáticamente:**
1. ✅ Se conecta al servidor
2. ✅ Descarga los cambios (`git pull`)
3. ✅ Reconstruye el contenedor Docker
4. ✅ Reinicia la aplicación

## 📊 Ver el Progreso

Después de hacer `git push`, puedes ver el progreso en:
- GitHub → Tu repositorio → Pestaña **Actions**

El deployment tarda aproximadamente 1-2 minutos.

## ⚠️ Importante

- Solo se despliega cuando haces push a la rama `main`
- El servidor debe tener acceso a GitHub (ya lo tiene)
- Los secrets están encriptados y seguros en GitHub
