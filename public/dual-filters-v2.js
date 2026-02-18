/**
 * DUAL FILTERS SYSTEM
 * Sistema de filtros con selección simple + área de multiselección separada
 * Exclusión mutua: No se puede usar ambas a la vez por campo
 */

// Variables globales
let allFilterOptions = null;
let allResults = [];
let multiSelections = {
    carrera: [],
    materia: [],
    modalidad: [],
    sede: [],
    docente: []
};

// Nombres de columnas del Excel (vienen del servidor)
let columnNames = {
    carrera: 'CARRERA',
    materia: 'MATERIA',
    modalidad: 'MODALIDAD',
    sede: 'SEDE',
    docente: 'DOCENTE'
};

/**
 * Inicializar sistema de filtros duales
 */
function initDualFilters(filterOptions, results) {
    console.log('🎯 Inicializando sistema de filtros duales');
    
    allFilterOptions = filterOptions;
    allResults = results;
    
    // Guardar nombres de columnas si vienen del servidor
    if (filterOptions.columnNames) {
        columnNames = filterOptions.columnNames;
        console.log('📋 Nombres de columnas configurados:', columnNames);
    } else {
        console.warn('⚠️ No se recibieron nombres de columnas del servidor, usando defaults');
    }
    
    // Resetear multiselecciones
    multiSelections = {
        carrera: [],
        materia: [],
        modalidad: [],
        sede: [],
        docente: []
    };
    
    // Inicializar dropdowns simples
    initSimpleSelect('filterCarrera', 'carrera', filterOptions.carreras || []);
    initSimpleSelect('filterMateria', 'materia', filterOptions.materias || []);
    initSimpleSelect('filterModalidad', 'modalidad', filterOptions.modalidades || []);
    initSimpleSelect('filterSede', 'sede', filterOptions.sedes || []);
    initSimpleSelect('filterDocente', 'docente', filterOptions.docentes || []);
    
    // Setup botones de multiselección
    setupMultiButtons();
    
    // Setup botones de acción
    setupActionButtons();
    
    console.log('✅ Filtros duales inicializados');
}

/**
 * Inicializar un dropdown simple con options
 */
function initSimpleSelect(selectId, filterName, options) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    // Limpiar opciones existentes excepto la primera ("Todos")
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Agregar nuevas opciones
    options.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
    
    // Resetear estado inicial
    select.value = '';
    select.disabled = false;
    select.style.opacity = '1';
    
    // Deshabilitar botón +Agregar inicialmente (hasta que se seleccione algo)
    const multiArea = document.getElementById(`multi${capitalize(filterName)}`);
    const addBtn = multiArea?.querySelector('.add-multi-btn');
    if (addBtn) addBtn.disabled = true;
    
    // Event listener para detectar cambio
    select.addEventListener('change', () => {
        handleSimpleSelectChange(filterName, select.value);
    });
}

/**
 * Manejar cambio en dropdown simple
 */
function handleSimpleSelectChange(filterName, value) {
    console.log(`📌 Cambio en ${filterName}: ${value || '(vacío)'}`);
    
    const multiArea = document.getElementById(`multi${capitalize(filterName)}`);
    const addBtn = multiArea?.querySelector('.add-multi-btn');
    
    // Habilitar/deshabilitar botón +Agregar según si hay selección
    if (value && value !== '') {
        // HAY selección en dropdown → HABILITAR botón para agregar a chips
        if (addBtn) addBtn.disabled = false;
        console.log(`✅ Botón +Agregar habilitado para ${filterName}`);
    } else {
        // NO hay selección → DESHABILITAR botón
        if (addBtn) addBtn.disabled = true;
    }
    
    // Actualizar cascada
    updateCascadeFilter();
}

/**
 * Setup botones de multiselección
 */
function setupMultiButtons() {
    const filters = ['carrera', 'materia', 'modalidad', 'sede', 'docente'];
    
    filters.forEach(filterName => {
        const btn = document.querySelector(`#multi${capitalize(filterName)} .add-multi-btn`);
        if (!btn) return;
        
        btn.addEventListener('click', () => {
            addToMultiSelection(filterName);
        });
    });
}

/**
 * Agregar valor del dropdown a multiselección
 */
function addToMultiSelection(filterName) {
    const selectId = `filter${capitalize(filterName)}`;
    const select = document.getElementById(selectId);
    const value = select?.value;
    
    console.log(`🔵 Intentando agregar a multi ${filterName}:`, value);
    
    if (!value || value === '') {
        alert(`Por favor selecciona ${filterName === 'carrera' ? 'una carrera' : filterName === 'materia' ? 'una materia' : filterName === 'modalidad' ? 'una modalidad' : filterName === 'sede' ? 'una sede' : 'un docente'}`);
        return;
    }
    
    // Verificar que no esté ya agregado
    if (multiSelections[filterName].includes(value)) {
        alert('Este valor ya está en la selección múltiple');
        return;
    }
    
    // Agregar a array
    multiSelections[filterName].push(value);
    
    // Renderizar chip
    renderMultiChips(filterName);
    
    // Resetear dropdown PERO MANTENERLO HABILITADO para seguir agregando
    select.value = '';
    // NO deshabilitar el dropdown - el usuario debe poder seguir agregando
    
    // Deshabilitar botón +Agregar hasta que se seleccione algo nuevo
    const multiArea = document.getElementById(`multi${capitalize(filterName)}`);
    const addBtn = multiArea?.querySelector('.add-multi-btn');
    if (addBtn) addBtn.disabled = true;
    
    // Actualizar cascada
    updateCascadeFilter();
    
    console.log(`✅ Agregado a multi ${filterName}:`, value, `(Total: ${multiSelections[filterName].length})`);
}

/**
 * Renderizar chips de multiselección
 */
function renderMultiChips(filterName) {
    const chipsContainer = document.getElementById(`chips${capitalize(filterName)}`);
    if (!chipsContainer) return;
    
    chipsContainer.innerHTML = '';
    
    multiSelections[filterName].forEach(value => {
        const chip = document.createElement('div');
        chip.className = 'multi-chip';
        chip.innerHTML = `
            <span>${value}</span>
            <span class="remove-chip" data-value="${value}">✕</span>
        `;
        
        // Event listener para remover
        chip.querySelector('.remove-chip').addEventListener('click', (e) => {
            removeFromMultiSelection(filterName, e.target.dataset.value);
        });
        
        chipsContainer.appendChild(chip);
    });
}

/**
 * Remover valor de multiselección
 */
function removeFromMultiSelection(filterName, value) {
    multiSelections[filterName] = multiSelections[filterName].filter(v => v !== value);
    
    // Renderizar chips actualizados
    renderMultiChips(filterName);
    
    // Si no hay más chips, volver a modo simple
    if (multiSelections[filterName].length === 0) {
        const selectId = `filter${capitalize(filterName)}`;
        const select = document.getElementById(selectId);
        if (select) {
            select.disabled = false;
            select.style.opacity = '1';
        }
        
        // Botón +Agregar deshabilitado hasta nueva selección
        const multiArea = document.getElementById(`multi${capitalize(filterName)}`);
        if (multiArea) multiArea.style.opacity = '1';
        const addBtn = multiArea?.querySelector('.add-multi-btn');
        if (addBtn) addBtn.disabled = true; // Deshabilitado hasta que se seleccione algo
    }
    
    // Actualizar cascada
    updateCascadeFilter();
    
    console.log(`🗑️ Removido de multi ${filterName}:`, value);
}

/**
 * Actualizar opciones en cascada basándose en todas las selecciones
 */
function updateCascadeFilter() {
    console.log('🔄 Actualizando cascada de filtros');
    
    // SOLO usar chips confirmados (multiSelections)
    const chips = {
        carrera: multiSelections.carrera.slice(),
        materia: multiSelections.materia.slice(),
        modalidad: multiSelections.modalidad.slice(),
        sede: multiSelections.sede.slice(),
        docente: multiSelections.docente.slice()
    };
    
    console.log('📋 Chips activos:', chips);
    
    // Función helper: filtra datos por todos los chips EXCEPTO el del campo indicado
    // Así cada dropdown muestra opciones válidas según los otros filtros, pero no se auto-excluye
    function getDataExcluding(excludeField) {
        let data = allResults.slice();
        if (excludeField !== 'carrera' && chips.carrera.length > 0) {
            data = data.filter(row => { const v = getFilterValue(row, 'carrera'); return v && chips.carrera.includes(v); });
        }
        if (excludeField !== 'materia' && chips.materia.length > 0) {
            data = data.filter(row => { const v = getFilterValue(row, 'materia'); return v && chips.materia.includes(v); });
        }
        if (excludeField !== 'modalidad' && chips.modalidad.length > 0) {
            data = data.filter(row => { const v = getFilterValue(row, 'modalidad'); return v && chips.modalidad.includes(v); });
        }
        if (excludeField !== 'sede' && chips.sede.length > 0) {
            data = data.filter(row => { const v = getFilterValue(row, 'sede'); return v && chips.sede.includes(v); });
        }
        if (excludeField !== 'docente' && chips.docente.length > 0) {
            data = data.filter(row => { const v = getFilterValue(row, 'docente'); return v && chips.docente.includes(v); });
        }
        return data;
    }
    
    // Cada dropdown recibe opciones del dataset filtrado por todos los OTROS chips
    const optsCarrera   = extractFieldOptions(getDataExcluding('carrera'),   'carrera');
    const optsMateria   = extractFieldOptions(getDataExcluding('materia'),   'materia');
    const optsModalidad = extractFieldOptions(getDataExcluding('modalidad'), 'modalidad');
    const optsSede      = extractFieldOptions(getDataExcluding('sede'),      'sede');
    const optsDocente   = extractFieldOptions(getDataExcluding('docente'),   'docente');
    
    updateDropdownOptions('filterCarrera',   'carrera',   optsCarrera);
    updateDropdownOptions('filterMateria',   'materia',   optsMateria);
    updateDropdownOptions('filterModalidad', 'modalidad', optsModalidad);
    updateDropdownOptions('filterSede',      'sede',      optsSede);
    updateDropdownOptions('filterDocente',   'docente',   optsDocente);
    
    console.log(`📊 Opciones: carreras=${optsCarrera.length} materias=${optsMateria.length} sedes=${optsSede.length} docentes=${optsDocente.length}`);
}

/**
 * Obtener valores actuales de un filtro (simple O multi)
 */
function getCurrentFilterValues(filterName) {
    // Si hay multiselección, usar esa
    if (multiSelections[filterName].length > 0) {
        return multiSelections[filterName];
    }
    
    // Si no, verificar selección simple
    const selectId = `filter${capitalize(filterName)}`;
    const select = document.getElementById(selectId);
    const value = select?.value;
    
    return (value && value !== '') ? [value] : [];
}

/**
 * Extraer opciones de UN campo específico de un dataset
 */
function extractFieldOptions(data, field) {
    const values = new Set();
    data.forEach(row => {
        const v = getFilterValue(row, field);
        if (v) values.add(v);
    });
    return Array.from(values).sort();
}

/**
 * Extraer opciones disponibles de datos filtrados (legacy, mantener por compatibilidad)
 */
function extractAvailableOptions(data) {
    return {
        carreras:   extractFieldOptions(data, 'carrera'),
        materias:   extractFieldOptions(data, 'materia'),
        modalidades: extractFieldOptions(data, 'modalidad'),
        sedes:      extractFieldOptions(data, 'sede'),
        docentes:   extractFieldOptions(data, 'docente')
    };
}

/**
 * Actualizar opciones en un dropdown específico
 */
function updateDropdownOptions(selectId, filterName, availableOptions) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    
    // Guardar primera opción ("Todos")
    const firstOption = select.options[0];
    
    // Limpiar opciones excepto la primera
    while (select.options.length > 1) {
        select.remove(1);
    }
    
    // Agregar opciones disponibles
    availableOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        select.appendChild(opt);
    });
    
    // Restaurar valor si sigue disponible
    if (currentValue && availableOptions.includes(currentValue)) {
        select.value = currentValue;
    }
}

/**
 * Setup botones de acción (Aplicar / Limpiar)
 */
function setupActionButtons() {
    const applyBtn = document.getElementById('applyFilters');
    const clearBtn = document.getElementById('clearFilters');
    
    if (applyBtn) {
        applyBtn.addEventListener('click', applyFilters);
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
}

/**
 * Aplicar filtros
 */
function applyFilters() {
    console.log('✅ Aplicando filtros');
    console.log('📊 Total de registros disponibles:', allResults.length);
    console.log('🎯 Estado multiSelections:', JSON.parse(JSON.stringify(multiSelections))); // Deep clone para ver snapshot
    
    const filters = {
        carrera: getCurrentFilterValues('carrera'),
        materia: getCurrentFilterValues('materia'),
        modalidad: getCurrentFilterValues('modalidad'),
        sede: getCurrentFilterValues('sede'),
        docente: getCurrentFilterValues('docente')
    };
    
    console.log('🔍 Filtros seleccionados:', filters);
    
    let filteredData = allResults.slice();
    
    if (filters.carrera.length > 0) {
        console.log('🔍 DEBUG CARRERA - Buscando:', filters.carrera);
        console.log('🔍 DEBUG CARRERA - Columna configurada:', columnNames.carrera);
        
        // Muestreo de 5 registros para ver qué valores tienen
        const sampleValues = allResults.slice(0, 5).map(row => {
            const val = getFilterValue(row, 'carrera');
            return {val, keys: Object.keys(row).slice(0, 8)};
        });
        console.log('🔍 DEBUG CARRERA - Muestra de valores en datos:', sampleValues);
        
        filteredData = filteredData.filter(row => {
            const value = getFilterValue(row, 'carrera');
            return value && filters.carrera.includes(value);
        });
        console.log(`🔍 Filtrado por carrera: ${filteredData.length} registros`);
    }
    if (filters.materia.length > 0) {
        console.log('🔍 DEBUG MATERIA - Buscando:', filters.materia);
        console.log('🔍 DEBUG MATERIA - Columna configurada:', columnNames.materia);
        
        // Muestreo de 5 registros para ver qué valores tienen
        const sampleValues = filteredData.slice(0, 5).map(row => {
            const val = getFilterValue(row, 'materia');
            return {val, keys: Object.keys(row).slice(0, 8)};
        });
        console.log('🔍 DEBUG MATERIA - Muestra de valores en datos:', sampleValues);
        
        filteredData = filteredData.filter(row => {
            const value = getFilterValue(row, 'materia');
            return value && filters.materia.includes(value);
        });
        console.log(`🔍 Filtrado por materia: ${filteredData.length} registros`);
    }
    if (filters.modalidad.length > 0) {
        filteredData = filteredData.filter(row => {
            const value = getFilterValue(row, 'modalidad');
            return value && filters.modalidad.includes(value);
        });
        console.log(`🔍 Filtrado por modalidad: ${filteredData.length} registros`);
    }
    if (filters.sede.length > 0) {
        filteredData = filteredData.filter(row => {
            const value = getFilterValue(row, 'sede');
            return value && filters.sede.includes(value);
        });
        console.log(`🔍 Filtrado por sede: ${filteredData.length} registros`);
    }
    if (filters.docente.length > 0) {
        filteredData = filteredData.filter(row => {
            const value = getFilterValue(row, 'docente');
            return value && filters.docente.includes(value);
        });
        console.log(`🔍 Filtrado por docente: ${filteredData.length} registros`);
    }
    
    console.log(`📊 Filtrados: ${filteredData.length}/${allResults.length} registros`);
    
    // Actualizar visualizaciones con datos filtrados
    console.log('🔄 Verificando función updateResultsWithFilteredData:', typeof updateResultsWithFilteredData);
    console.log('🔄 window.updateResultsWithFilteredData:', typeof window.updateResultsWithFilteredData);
    
    if (typeof updateResultsWithFilteredData === 'function') {
        console.log('✅ Llamando a updateResultsWithFilteredData con', filteredData.length, 'registros');
        updateResultsWithFilteredData(filteredData);
        console.log('✅ updateResultsWithFilteredData completado');
    } else if (typeof window.updateResultsWithFilteredData === 'function') {
        console.log('✅ Llamando a window.updateResultsWithFilteredData con', filteredData.length, 'registros');
        window.updateResultsWithFilteredData(filteredData);
        console.log('✅ window.updateResultsWithFilteredData completado');
    } else {
        console.error('❌ updateResultsWithFilteredData NO está disponible');
        console.error('❌ Tipo:', typeof updateResultsWithFilteredData);
        console.error('❌ Window tiene la función?', typeof window.updateResultsWithFilteredData);
    }
    
    // Actualizar resumen
    updateFilterSummary(filters);
}

/**
 * Limpiar todos los filtros
 */
function clearAllFilters() {
    console.log('🗑️ Limpiando todos los filtros');
    
    // Resetear dropdowns simples
    ['carrera', 'materia', 'modalidad', 'sede', 'docente'].forEach(filterName => {
        const selectId = `filter${capitalize(filterName)}`;
        const select = document.getElementById(selectId);
        if (select) {
            select.value = '';
            select.disabled = false;
            select.style.opacity = '1';
        }
        
        // Limpiar multiselecciones
        multiSelections[filterName] = [];
        renderMultiChips(filterName);
        
        // Habilitar área multi
        const multiArea = document.getElementById(`multi${capitalize(filterName)}`);
        if (multiArea) multiArea.style.opacity = '1';
        const addBtn = multiArea?.querySelector('.add-multi-btn');
        if (addBtn) addBtn.disabled = false;
    });
    
    // Re-inicializar con todas las opciones
    if (allFilterOptions) {
        initSimpleSelect('filterCarrera', 'carrera', allFilterOptions.carreras || []);
        initSimpleSelect('filterMateria', 'materia', allFilterOptions.materias || []);
        initSimpleSelect('filterModalidad', 'modalidad', allFilterOptions.modalidades || []);
        initSimpleSelect('filterSede', 'sede', allFilterOptions.sedes || []);
        initSimpleSelect('filterDocente', 'docente', allFilterOptions.docentes || []);
    }
    
    // Actualizar visualizaciones con todos los datos
    if (typeof updateResultsWithFilteredData === 'function') {
        updateResultsWithFilteredData(allResults);
    }
    
    // Ocultar resumen
    const filterSummary = document.getElementById('filterSummary');
    if (filterSummary) {
        filterSummary.style.display = 'none';
    }
}

/**
 * Actualizar resumen de filtros
 */
function updateFilterSummary(filters) {
    const filterSummary = document.getElementById('filterSummary');
    const filterSummaryText = document.getElementById('filterSummaryText');
    
    if (!filterSummary || !filterSummaryText) return;
    
    const activeFiltros = [];
    
    if (filters.carrera.length > 0) {
        activeFiltros.push(`Carrera: ${filters.carrera.length} seleccionado${filters.carrera.length > 1 ? 's' : ''}`);
    }
    if (filters.materia.length > 0) {
        activeFiltros.push(`Materia: ${filters.materia.length} seleccionado${filters.materia.length > 1 ? 's' : ''}`);
    }
    if (filters.modalidad.length > 0) {
        activeFiltros.push(`Modalidad: ${filters.modalidad.length} seleccionado${filters.modalidad.length > 1 ? 's' : ''}`);
    }
    if (filters.sede.length > 0) {
        activeFiltros.push(`Sede: ${filters.sede.length} seleccionado${filters.sede.length > 1 ? 's' : ''}`);
    }
    if (filters.docente.length > 0) {
        activeFiltros.push(`Docente: ${filters.docente.length} seleccionado${filters.docente.length > 1 ? 's' : ''}`);
    }
    
    if (activeFiltros.length > 0) {
        filterSummaryText.textContent = `Filtros activos: ${activeFiltros.join(' | ')}`;
        filterSummary.style.display = 'block';
    } else {
        filterSummary.style.display = 'none';
    }
}

/**
 * Capitalizar primera letra
 */
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Obtener valor de filtro de un row de manera robusta
 * Maneja tanto originalData como datos directos, y usa los nombres de columna correctos
 */
function getFilterValue(row, filterType) {
    const columnName = columnNames[filterType];
    
    // Intentar primero desde originalData (análisis normal)
    if (row.originalData && row.originalData[columnName]) {
        return row.originalData[columnName];
    }
    
    // Intentar desde el row directo (análisis con validación)
    if (row[columnName]) {
        return row[columnName];
    }
    
    // Fallback: intentar con nombre en mayúsculas por si acaso
    const upperName = filterType.toUpperCase();
    if (row.originalData && row.originalData[upperName]) {
        return row.originalData[upperName];
    }
    if (row[upperName]) {
        return row[upperName];
    }
    
    // DEBUG: si llegamos aquí, el valor no se encontró
    if (filterType === 'carrera' && Math.random() < 0.01) { // Log 1% de las veces para no saturar
        console.warn(`⚠️ No se encontró valor para ${filterType} (columna: ${columnName})`, {
            hasOriginalData: !!row.originalData,
            originalDataKeys: row.originalData ? Object.keys(row.originalData).slice(0, 5) : [],
            rowKeys: Object.keys(row).slice(0, 5)
        });
    }
    
    return null;
}

// Exponer funciones globalmente
window.initDualFilters = initDualFilters;
window.applyFilters = applyFilters;
window.clearAllFilters = clearAllFilters;
