/**
 * filters-redesign.js
 * Dos bloques de filtrado independientes:
 *  A) Simple cascada: un <select> por categoría, cada uno restringe a los demás.
 *  B) Multi-select: checkboxes por categoría (tabs), acumulación en "chips".
 *
 * Ambos llaman a window.updateResultsWithFilteredData(filteredData) al aplicar.
 */

(function () {
  'use strict';

  // ── Campos que se filtran ─────────────────────────────────────────────────
  const FIELDS = ['carrera', 'materia', 'modalidad', 'sede', 'docente'];

  // ── IDs de los <select> del bloque A ─────────────────────────────────────
  const SELECT_IDS = {
    carrera:   'filterCarrera',
    materia:   'filterMateria',
    modalidad: 'filterModalidad',
    sede:      'filterSede',
    docente:   'filterDocente',
  };

  // Texto "vacío" de cada dropdown
  const EMPTY_LABELS = {
    carrera:   'Todas las carreras',
    materia:   'Todas las materias',
    modalidad: 'Todas',
    sede:      'Todas',
    docente:   'Todos',
  };

  // Mapeo field → nombre real de columna en los datos (lo provee el servidor)
  // Ejemplo: { carrera: 'CARRERA', materia: 'MATERIA', ... }
  let colNames = {
    carrera:   'carrera',
    materia:   'materia',
    modalidad: 'modalidad',
    sede:      'sede',
    docente:   'docente',
  };

  // ── Estado ────────────────────────────────────────────────────────────────
  let allData = [];                         // todos los registros
  let allOptions = {};                      // { carrera: [...], materia: [...], ... }
  let activeCategory = 'carrera';          // tab activo en bloque B
  const multiSelections = {};
  FIELDS.forEach(f => (multiSelections[f] = new Set()));

  // ── Helper: leer valor de un registro (usa colNames para el key real) ──────
  function getVal(row, field) {
    const key = colNames[field] || field;
    const src = row.originalData || row;
    if (src[key] !== undefined) return String(src[key] || '').trim();
    // fallback case-insensitive scan (solo si colNames aún no fue resuelto)
    const fl = key.toLowerCase();
    const found = Object.keys(src).find(k => k.toLowerCase() === fl);
    if (found) { colNames[field] = found; return String(src[found] || '').trim(); }
    return '';
  }

  // ── Helper: opciones únicas ordenadas para un campo en un conjunto de datos
  function uniqueOptions(data, field) {
    const s = new Set();
    data.forEach(r => { const v = getVal(r, field); if (v) s.add(v); });
    return Array.from(s).sort((a, b) => a.localeCompare(b, 'es'));
  }

  // =========================================================================
  // BLOQUE A — FILTRO SIMPLE (CASCADA)
  // =========================================================================

  /** Reconstruye un <select> dado el conjunto de opciones */
  function rebuildSelect(field, options, currentValue) {
    const el = document.getElementById(SELECT_IDS[field]);
    if (!el) return;
    const prev = currentValue !== undefined ? currentValue : el.value;
    el.innerHTML = `<option value="">${EMPTY_LABELS[field]}</option>` +
      options.map(o => `<option value="${escHtml(o)}"${o === prev ? ' selected' : ''}>${escHtml(o)}</option>`).join('');
  }

  /** Devuelve los datos filtrados por los selects de los campos indicados */
  function filterBySelects(fields) {
    return allData.filter(row =>
      fields.every(f => {
        const el = document.getElementById(SELECT_IDS[f]);
        const v = el ? el.value : '';
        return !v || getVal(row, f) === v;
      })
    );
  }

  /** Actualiza en cascada todos los dropdowns según lo seleccionado */
  function cascadeSimpleDropdowns() {
    FIELDS.forEach(field => {
      // Filtramos con todos los OTROS campos
      const others = FIELDS.filter(f => f !== field);
      const filtered = filterBySelects(others);
      const opts = uniqueOptions(filtered, field);
      rebuildSelect(field, opts);
    });
  }

  function initSimpleFilters() {
    FIELDS.forEach(field => {
      const el = document.getElementById(SELECT_IDS[field]);
      if (!el) return;
      el.addEventListener('change', () => cascadeSimpleDropdowns());
    });

    const applyBtn = document.getElementById('applySimpleFilter');
    if (applyBtn) applyBtn.addEventListener('click', applySimpleFilter);

    const clearBtn = document.getElementById('clearSimpleFilter');
    if (clearBtn) clearBtn.addEventListener('click', clearSimpleFilter);
  }

  function applySimpleFilter() {
    const filtered = filterBySelects(FIELDS);
    const parts = FIELDS
      .map(f => { const el = document.getElementById(SELECT_IDS[f]); return el && el.value ? `${capitalize(f)}: ${el.value}` : null; })
      .filter(Boolean);
    showSummary(filtered.length, parts.join(' | '));
    if (typeof window.updateResultsWithFilteredData === 'function')
      window.updateResultsWithFilteredData(filtered);
  }

  function clearSimpleFilter() {
    FIELDS.forEach(field => {
      const el = document.getElementById(SELECT_IDS[field]);
      if (el) el.value = '';
    });
    populateSimpleDropdowns();
    hideSummary();
    if (typeof window.updateResultsWithFilteredData === 'function')
      window.updateResultsWithFilteredData(allData);
  }

  /** Rellena todos los dropdowns usando allOptions (precalculadas del servidor o derivadas) */
  function populateSimpleDropdowns() {
    FIELDS.forEach(field => {
      const opts = allOptions[field] || uniqueOptions(allData, field);
      rebuildSelect(field, opts);
    });
  }

  // =========================================================================
  // BLOQUE B — SELECCIÓN MÚLTIPLE (CHECKBOXES)
  // =========================================================================

  /** Renderiza los checkboxes del tab activo */
  function renderCheckboxes(searchTerm) {
    const container = document.getElementById('multiCheckboxContainer');
    if (!container) return;

    // Opciones totales del campo activo (usando allOptions precalculadas)
    const opts = allOptions[activeCategory] || uniqueOptions(allData, activeCategory);
    const term = (searchTerm || '').toLowerCase();
    const filtered = opts.filter(o => !term || o.toLowerCase().includes(term));

    if (!filtered.length) {
      container.innerHTML = '<span style="color:#999;font-size:0.85em;">Sin opciones</span>';
      return;
    }

    container.innerHTML = filtered.map(o => {
      const checked = multiSelections[activeCategory].has(o) ? 'checked' : '';
      const id = `chk_${activeCategory}_${CSS.escape ? CSS.escape(o) : o.replace(/\s+/g, '_')}`;
      return `<label style="display:flex;align-items:center;gap:5px;padding:3px 7px;background:${checked ? '#e8d5ff' : '#f8f9fa'};border-radius:4px;cursor:pointer;font-size:0.85em;white-space:nowrap;border:1px solid ${checked ? '#6f42c1' : '#dee2e6'}">
        <input type="checkbox" id="${escHtml(id)}" value="${escHtml(o)}" ${checked} onchange="window._multiCheckChange('${escHtml(activeCategory)}', this.value, this.checked)"> ${escHtml(o)}
      </label>`;
    }).join('');
  }

  window._multiCheckChange = function (field, value, isChecked) {
    if (isChecked) multiSelections[field].add(value);
    else multiSelections[field].delete(value);
    renderChips();
  };

  /** Chips debajo del área de checkboxes */
  function renderChips() {
    const container = document.getElementById('multiSelectedChips');
    if (!container) return;
    const chips = [];
    FIELDS.forEach(f => {
      multiSelections[f].forEach(v => {
        chips.push(`<span style="display:inline-flex;align-items:center;gap:4px;background:#6f42c1;color:white;padding:3px 9px;border-radius:12px;font-size:0.78em;font-weight:600;">
          ${escHtml(capitalize(f))}: ${escHtml(v)}
          <span style="cursor:pointer;font-weight:700;" onclick="window._removeChip('${escHtml(f)}','${escHtml(v)}')">×</span>
        </span>`);
      });
    });
    container.innerHTML = chips.join('') || '<span style="color:#aaa;font-size:0.82em;">Sin selección</span>';
  }

  window._removeChip = function (field, value) {
    multiSelections[field].delete(value);
    renderChips();
    renderCheckboxes(document.getElementById('multiSearchInput')?.value || '');
  };

  function applyMultiFilter() {
    // Construir filtro: para cada campo, si hay selección, el registro debe matchear
    const filtered = allData.filter(row =>
      FIELDS.every(f => {
        if (!multiSelections[f].size) return true;
        return multiSelections[f].has(getVal(row, f));
      })
    );
    const parts = FIELDS
      .map(f => multiSelections[f].size ? `${capitalize(f)}: [${Array.from(multiSelections[f]).join(', ')}]` : null)
      .filter(Boolean);
    showSummary(filtered.length, parts.join(' | '));
    if (typeof window.updateResultsWithFilteredData === 'function')
      window.updateResultsWithFilteredData(filtered);
  }

  function clearMultiFilter() {
    FIELDS.forEach(f => multiSelections[f].clear());
    renderChips();
    renderCheckboxes();
    hideSummary();
    if (typeof window.updateResultsWithFilteredData === 'function')
      window.updateResultsWithFilteredData(allData);
  }

  function initMultiFilters() {
    const applyBtn = document.getElementById('applyMultiFilter');
    if (applyBtn) applyBtn.addEventListener('click', applyMultiFilter);

    const clearBtn = document.getElementById('clearMultiFilter');
    if (clearBtn) clearBtn.addEventListener('click', clearMultiFilter);
  }

  // ── Funciones expuestas para los botones de pestaña / búsqueda en el HTML ─

  window.switchMultiTab = function (cat) {
    activeCategory = cat;
    // Actualizar estilos de tabs
    document.querySelectorAll('.multi-tab-btn').forEach(btn => {
      const active = btn.dataset.cat === cat;
      btn.style.background = active ? '#6f42c1' : 'white';
      btn.style.color = active ? 'white' : '#6f42c1';
    });
    if (document.getElementById('multiSearchInput'))
      document.getElementById('multiSearchInput').value = '';
    renderCheckboxes('');
  };

  window.filterMultiCheckboxes = function (term) { renderCheckboxes(term); };

  window.selectAllMulti = function () {
    const term = document.getElementById('multiSearchInput')?.value || '';
    const opts = allOptions[activeCategory] || uniqueOptions(allData, activeCategory);
    opts.filter(o => !term || o.toLowerCase().includes(term.toLowerCase()))
        .forEach(o => multiSelections[activeCategory].add(o));
    renderCheckboxes(term);
    renderChips();
  };

  window.deselectAllMulti = function () {
    const term = document.getElementById('multiSearchInput')?.value || '';
    if (!term) {
      multiSelections[activeCategory].clear();
    } else {
      const opts = uniqueOptions(allData, activeCategory);
      opts.filter(o => o.toLowerCase().includes(term.toLowerCase()))
          .forEach(o => multiSelections[activeCategory].delete(o));
    }
    renderCheckboxes(term);
    renderChips();
  };

  // =========================================================================
  // RESUMEN
  // =========================================================================
  function showSummary(count, desc) {
    const el = document.getElementById('filterSummary');
    const txt = document.getElementById('filterSummaryText');
    if (!el || !txt) return;
    txt.textContent = `Mostrando ${count.toLocaleString('es')} registros con filtro: ${desc}`;
    el.style.display = 'block';
  }
  function hideSummary() {
    const el = document.getElementById('filterSummary');
    if (el) el.style.display = 'none';
  }

  // =========================================================================
  // INICIALIZACIÓN PÚBLICA
  // =========================================================================

  /**
   * Llamar desde app-v2.js / app.js después de cargar el archivo CSV.
   * @param {Array} data  Array de registros
   */
  /**
   * Inicializar filtros.
   * @param {Array} data  Array de registros (data.results del servidor)
   * @param {Object} [filterOpts]  filterOptions del servidor (optional)
   */
  window.initFiltersRedesign = function (data, filterOpts) {
    allData = data || [];
    FIELDS.forEach(f => multiSelections[f].clear());

    // Aplicar columnNames del servidor si están disponibles
    if (filterOpts && filterOpts.columnNames) {
      Object.assign(colNames, filterOpts.columnNames);
      console.log('[filters-redesign] columnNames del servidor:', colNames);
    }

    // Construir allOptions usando filterOptions del servidor (ya calculadas)
    // o derivarlas de los datos si no están
    if (filterOpts) {
      allOptions = {
        carrera:   filterOpts.carreras   || [],
        materia:   filterOpts.materias   || [],
        modalidad: filterOpts.modalidades || [],
        sede:      filterOpts.sedes      || [],
        docente:   filterOpts.docentes   || [],
      };
    } else {
      allOptions = {};
      FIELDS.forEach(f => { allOptions[f] = uniqueOptions(allData, f); });
    }

    console.log('[filters-redesign] Opciones:', {
      carrera: allOptions.carrera.length,
      materia: allOptions.materia.length,
      modalidad: allOptions.modalidad.length,
      sede: allOptions.sede.length,
      docente: allOptions.docente.length,
    });

    populateSimpleDropdowns();
    initSimpleFilters();
    initMultiFilters();
    renderChips();
    renderCheckboxes('');
    hideSummary();

    // Mostrar la sección de filtros
    const sec = document.getElementById('filtersSection');
    if (sec) sec.classList.remove('hidden');

    console.log('[filters-redesign] Inicializado con', allData.length, 'registros');
  };

  /**
   * Alias para compatibilidad con app-v2.js que llama:
   *   initDualFilters(data.filterOptions, data.results)
   * El segundo argumento (results) es el array de registros real.
   * Si se llama con un solo arg que ya es un array, también funciona.
   */
  /**
   * Alias compatible con app-v2.js que llama:
   *   initDualFilters(data.filterOptions, data.results)
   */
  window.initDualFilters = function (filterOptions, results) {
    // Resetear colNames al cargar nuevos datos
    colNames = { carrera:'carrera', materia:'materia', modalidad:'modalidad', sede:'sede', docente:'docente' };
    const dataToUse = Array.isArray(results) ? results : [];
    console.log('[filters-redesign] initDualFilters →', dataToUse.length, 'registros');
    if (dataToUse.length > 0) {
      const sample = dataToUse[0].originalData || dataToUse[0];
      console.log('[filters-redesign] Keys muestra:', Object.keys(sample).slice(0, 10));
    }
    window.initFiltersRedesign(dataToUse, filterOptions);
  };

  /** Limpiar todo */
  window.clearAllFilters = function () {
    clearSimpleFilter();
    clearMultiFilter();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

})();
