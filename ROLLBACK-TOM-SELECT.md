# 🔄 ROLLBACK: Tom-Select Multiselect Filters

**Fecha:** 17 de febrero de 2026
**Feature:** Sistema de filtros multiselect con Tom-Select
**Commit:** `01f19a9` - Feature: Tom-Select multiselect filters con búsqueda

---

## 📋 ¿Qué se cambió?

### Archivos NUEVOS (creados):
- ✅ `public/tom-select-filters.js` - Lógica de filtros multiselect
- ✅ `public/tom-select-custom.css` - Estilos personalizados

### Archivos MODIFICADOS:
- ✅ `public/index.html` - Agregado Tom-Select CDN y scripts
- ✅ `public/app.js` - Cambio en inicialización de filtros (línea ~476)

### Archivos NO MODIFICADOS (sistema anterior intacto):
- ✅ `public/cascade-filters.js` - Sigue funcionando como fallback
- ✅ `public/styles.css` - Sin cambios
- ✅ `server.js` - Sin cambios

---

## 🔄 OPCIÓN 1: Rollback Completo (Git Revert)

### Si hiciste commit aparte (recomendado):

```powershell
# Ver commit de Tom-Select
git log --oneline -n 5

# Revertir commit específico (reemplazar HASH)
git revert COMMIT_HASH

# Push a GitHub
git push origin main
```

### Si hiciste commit junto con otros cambios:

```powershell
# Ver cambios en archivos específicos
git log --oneline -- public/tom-select-filters.js public/index.html

# Restaurar archivos específicos al commit anterior
git checkout HEAD~1 -- public/index.html public/app.js

# Eliminar archivos nuevos
rm public/tom-select-filters.js
rm public/tom-select-custom.css

# Commit rollback
git add .
git commit -m "Rollback: Revertir Tom-Select, volver a cascade-filters"
git push origin main
```

---

## 🔄 OPCIÓN 2: Rollback Manual (preservar archivos para probar después)

### Paso 1: Editar `public/index.html`

**Remover estas líneas:**
```html
<!-- Tom-Select CSS para multiselect con búsqueda -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/css/tom-select.bootstrap5.min.css">
<link rel="stylesheet" href="tom-select-custom.css">
```

**Remover estas líneas:**
```html
<!-- Tom-Select JS para multiselect -->
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/js/tom-select.complete.min.js"></script>
<script src="tom-select-filters.js"></script>
```

**Estado final del `<head>`:**
```html
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análisis de Encuestas - Análisis de Sentimientos</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
```

**Estado final antes de `</body>`:**
```html
    <script src="cascade-filters.js"></script>
    <script src="app.js"></script>
    <script src="column-config-manager.js"></script>
</body>
</html>
```

### Paso 2: Editar `public/app.js`

**Buscar línea ~476 y cambiar:**

```javascript
// ANTES (Tom-Select):
if (typeof initTomSelectFilters === 'function') {
    initTomSelectFilters(data.filterOptions, data.results);
} else if (typeof initCascadeFilters === 'function') {
    initCascadeFilters(data.filterOptions, data.results);
}

// DESPUÉS (Cascade original):
if (typeof initCascadeFilters === 'function') {
    initCascadeFilters(data.filterOptions, data.results);
}
```

### Paso 3: Renombrar archivos (opcional, para preservar)

```powershell
# Renombrar para preservar sin que se carguen
mv public/tom-select-filters.js public/tom-select-filters.js.backup
mv public/tom-select-custom.css public/tom-select-custom.css.backup
```

### Paso 4: Reiniciar servidor

```powershell
# Detener servidor
Get-Process -Name node | Stop-Process -Force

# Iniciar servidor
npm start
```

### Paso 5: Verificar

1. Abrir http://localhost:3000
2. Subir archivo Excel
3. Verificar que filtros aparecen como dropdowns simples (no multiselect)
4. Probar que filtros funcionan correctamente

---

## 🔄 OPCIÓN 3: Rollback Solo en HTML (más rápido)

Si solo quieres probar sin Tom-Select temporalmente:

### 1. Comentar en `index.html`:

```html
<!-- COMENTADO PARA ROLLBACK TEMPORAL
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/css/tom-select.bootstrap5.min.css">
<link rel="stylesheet" href="tom-select-custom.css">
-->

<!-- COMENTADO PARA ROLLBACK TEMPORAL
<script src="https://cdn.jsdelivr.net/npm/tom-select@2.3.1/dist/js/tom-select.complete.min.js"></script>
<script src="tom-select-filters.js"></script>
-->
```

### 2. Reiniciar servidor

El sistema detectará automáticamente que `initTomSelectFilters` no existe y usará `initCascadeFilters` como fallback.

---

## ✅ Verificación Post-Rollback

### Checklist:

- [ ] Servidor inicia sin errores
- [ ] Página carga correctamente
- [ ] Análisis funciona al subir Excel
- [ ] Filtros aparecen como dropdowns simples
- [ ] Filtros se pueden seleccionar uno a uno
- [ ] Botón "Aplicar Filtros" funciona
- [ ] Botón "Limpiar" resetea filtros
- [ ] Ningún error en consola del navegador (F12)

### Comandos de verificación:

```powershell
# Ver que servidor corre
Get-Process -Name node

# Ver logs del servidor
# (en la terminal donde corre npm start)

# Test HTTP
Invoke-WebRequest -Uri http://localhost:3000 -UseBasicParsing
```

---

## 📝 Notas Importantes

1. **Fallback automático:** El código tiene fallback a `cascade-filters.js`, por lo que comentar Tom-Select debería funcionar sin más cambios.

2. **Sin pérdida de funcionalidad:** `cascade-filters.js` NO fue modificado, todo funciona igual que antes de Tom-Select.

3. **Archivos preservados:** Si renombras con `.backup`, puedes volver a Tom-Select fácilmente:
   ```powershell
   mv public/tom-select-filters.js.backup public/tom-select-filters.js
   mv public/tom-select-custom.css.backup public/tom-select-custom.css
   ```

4. **Git status limpio:** Después del rollback:
   ```powershell
   git status
   git diff public/index.html
   git diff public/app.js
   ```

---

## 🆘 Problemas Comunes Post-Rollback

### Problema: Filtros no aparecen
**Solución:** Verificar que `cascade-filters.js` está cargado en index.html

### Problema: Error "initCascadeFilters is not defined"
**Solución:** Limpiar caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)

### Problema: Estilos rotos
**Solución:** Verificar que `styles.css` está cargado correctamente

### Problema: Dropdowns vacíos
**Solución:** Verificar en consola que `filterOptions` llega del servidor

---

## 📞 Contacto

Si necesitas ayuda con el rollback, revisa:
1. Este archivo
2. Logs del servidor
3. Consola del navegador (F12)
4. `public/cascade-filters.js` (debe estar intacto)

---

**Última actualización:** 2026-02-17
**Versión:** 1.0
