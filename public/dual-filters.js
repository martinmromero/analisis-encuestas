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

/**
 * Inicializar sistema de filtros duales
 */
function initDualFilters(filterOptions, results) {
    console.log('🎯 Inicializando sistema de filtros duales');
    
    allFilterOptions = filterOptions;
    allResults = results;
    
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
    
    // Obtener todas las selecciones (simples + multi)
    const filters = {
        carrera: getCurrentFilterValues('carrera'),
        materia: getCurrentFilterValues('materia'),
        modalidad: getCurrentFilterValues('modalidad'),
        sede: getCurrentFilterValues('sede'),
        docente: getCurrentFilterValues('docente')
    };
    
    console.log('📋 Filtros activos:', filters);
    
    // Filtrar datos según selecciones actuales
    let filteredData = allResults.slice();
    
    if (filters.carrera.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.carrera.includes(row.originalData?.CARRERA || row.CARRERA)
        );
    }
    if (filters.materia.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.materia.includes(row.originalData?.MATERIA || row.MATERIA)
        );
    }
    if (filters.modalidad.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.modalidad.includes(row.originalData?.MODALIDAD || row.MODALIDAD)
        );
    }
    if (filters.sede.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.sede.includes(row.originalData?.SEDE || row.SEDE)
        );
    }
    if (filters.docente.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.docente.includes(row.originalData?.DOCENTE || row.DOCENTE)
        );
    }
    
    console.log(`📊 Registros después de filtros: ${filteredData.length}/${allResults.length}`);
    
    // Extraer valores únicos disponibles de los datos filtrados
    const availableOptions = extractAvailableOptions(filteredData);
    
    // Actualizar opciones en cada dropdown
    updateDropdownOptions('filterCarrera', 'carrera', availableOptions.carreras);
    updateDropdownOptions('filterMateria', 'materia', availableOptions.materias);
    updateDropdownOptions('filterModalidad', 'modalidad', availableOptions.modalidades);
    updateDropdownOptions('filterSede', 'sede', availableOptions.sedes);
    updateDropdownOptions('filterDocente', 'docente', availableOptions.docentes);
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
 * Extraer opciones disponibles de datos filtrados
 */
function extractAvailableOptions(data) {
    const carreras = new Set();
    const materias = new Set();
    const modalidades = new Set();
    const sedes = new Set();
    const docentes = new Set();
    
    data.forEach(row => {
        const originalData = row.originalData || row;
        if (originalData.CARRERA) carreras.add(originalData.CARRERA);
        if (originalData.MATERIA) materias.add(originalData.MATERIA);
        if (originalData.MODALIDAD) modalidades.add(originalData.MODALIDAD);
        if (originalData.SEDE) sedes.add(originalData.SEDE);
        if (originalData.DOCENTE) docentes.add(originalData.DOCENTE);
    });
    
    return {
        carreras: Array.from(carreras).sort(),
        materias: Array.from(materias).sort(),
        modalidades: Array.from(modalidades).sort(),
        sedes: Array.from(sedes).sort(),
        docentes: Array.from(docentes).sort()
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
    
    const filters = {
        carrera: getCurrentFilterValues('carrera'),
        materia: getCurrentFilterValues('materia'),
        modalidad: getCurrentFilterValues('modalidad'),
        sede: getCurrentFilterValues('sede'),
        docente: getCurrentFilterValues('docente')
    };
    
    let filteredData = allResults.slice();
    
    if (filters.carrera.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.carrera.includes(row.originalData?.CARRERA || row.CARRERA)
        );
    }
    if (filters.materia.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.materia.includes(row.originalData?.MATERIA || row.MATERIA)
        );
    }
    if (filters.modalidad.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.modalidad.includes(row.originalData?.MODALIDAD || row.MODALIDAD)
        );
    }
    if (filters.sede.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.sede.includes(row.originalData?.SEDE || row.SEDE)
        );
    }
    if (filters.docente.length > 0) {
        filteredData = filteredData.filter(row => 
            filters.docente.includes(row.originalData?.DOCENTE || row.DOCENTE)
        );
    }
    
    console.log(`📊 Filtrados: ${filteredData.length}/${allResults.length} registros`);
    
    // Actualizar visualizaciones con datos filtrados
    if (typeof updateResultsWithFilteredData === 'function') {
        updateResultsWithFilteredData(filteredData);
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

// Exponer funciones globalmente
window.initDualFilters = initDualFilters;
