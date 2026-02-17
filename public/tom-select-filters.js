/**
 * TOM-SELECT MULTISELECT FILTERS
 * Sistema de filtros con selección múltiple y búsqueda integrada
 * Reemplaza los dropdowns simples por multiselects con Tom-Select
 */

// Variables globales para Tom-Select
let tomSelectInstances = {};
let allFilterOptions = null;
let allResults = [];

/**
 * Inicializar Tom-Select en los filtros
 * @param {Object} filterOptions - Opciones de filtro del servidor
 * @param {Array} results - Resultados del análisis
 */
function initTomSelectFilters(filterOptions, results) {
    console.log('🎯 Inicializando Tom-Select para filtros multiselect');
    
    allFilterOptions = filterOptions;
    allResults = results;
    
    // Destruir instancias previas si existen
    destroyTomSelectInstances();
    
    // Inicializar cada filtro con Tom-Select
    initCarreraFilter();
    initMateriaFilter();
    initModalidadFilter();
    initSedeFilter();
    initDocenteFilter();
    
    // Event listeners para botones
    setupFilterButtons();
    
    console.log('✅ Tom-Select inicializado en todos los filtros');
}

/**
 * Destruir todas las instancias de Tom-Select
 */
function destroyTomSelectInstances() {
    Object.values(tomSelectInstances).forEach(instance => {
        if (instance && instance.destroy) {
            instance.destroy();
        }
    });
    tomSelectInstances = {};
}

/**
 * Configuración base para Tom-Select
 */
function getBaseTomSelectConfig(placeholder) {
    return {
        plugins: {
            'remove_button': {
                title: 'Quitar'
            },
            'dropdown_input': {}
        },
        maxOptions: null, // Sin límite de opciones
        maxItems: null,   // Permitir selecciones ilimitadas
        placeholder: placeholder,
        searchField: ['text', 'value'],
        sortField: {
            field: 'text',
            direction: 'asc'
        },
        closeAfterSelect: false, // Mantener abierto después de seleccionar
        hidePlaceholder: false,
        loadThrottle: 300, // Throttle de búsqueda
        render: {
            no_results: function(data, escape) {
                return '<div class="no-results">No se encontraron resultados para "' + escape(data.input) + '"</div>';
            },
            option_create: function(data, escape) {
                return '<div class="create">Agregar <strong>' + escape(data.input) + '</strong>&hellip;</div>';
            }
        },
        onChange: function(values) {
            // Aplicar filtros cuando cambia la selección
            applyTomSelectFilters();
        }
    };
}

/**
 * Inicializar filtro de Carrera
 */
function initCarreraFilter() {
    const selectElement = document.getElementById('filterCarrera');
    if (!selectElement) return;
    
    // Limpiar opciones "Todas las carreras"
    selectElement.innerHTML = '';
    
    // Agregar opciones desde filterOptions
    if (allFilterOptions && allFilterOptions.carreras) {
        allFilterOptions.carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera;
            option.textContent = carrera;
            selectElement.appendChild(option);
        });
    }
    
    // Inicializar Tom-Select
    const config = getBaseTomSelectConfig('Seleccionar carreras...');
    tomSelectInstances.carrera = new TomSelect('#filterCarrera', config);
    
    console.log(`✅ Filtro Carrera: ${allFilterOptions?.carreras?.length || 0} opciones`);
}

/**
 * Inicializar filtro de Materia
 */
function initMateriaFilter() {
    const selectElement = document.getElementById('filterMateria');
    if (!selectElement) return;
    
    selectElement.innerHTML = '';
    
    if (allFilterOptions && allFilterOptions.materias) {
        allFilterOptions.materias.forEach(materia => {
            const option = document.createElement('option');
            option.value = materia;
            option.textContent = materia;
            selectElement.appendChild(option);
        });
    }
    
    const config = getBaseTomSelectConfig('Seleccionar materias...');
    tomSelectInstances.materia = new TomSelect('#filterMateria', config);
    
    console.log(`✅ Filtro Materia: ${allFilterOptions?.materias?.length || 0} opciones`);
}

/**
 * Inicializar filtro de Modalidad
 */
function initModalidadFilter() {
    const selectElement = document.getElementById('filterModalidad');
    if (!selectElement) return;
    
    selectElement.innerHTML = '';
    
    if (allFilterOptions && allFilterOptions.modalidades) {
        allFilterOptions.modalidades.forEach(modalidad => {
            const option = document.createElement('option');
            option.value = modalidad;
            option.textContent = modalidad;
            selectElement.appendChild(option);
        });
    }
    
    const config = getBaseTomSelectConfig('Seleccionar modalidades...');
    tomSelectInstances.modalidad = new TomSelect('#filterModalidad', config);
    
    console.log(`✅ Filtro Modalidad: ${allFilterOptions?.modalidades?.length || 0} opciones`);
}

/**
 * Inicializar filtro de Sede
 */
function initSedeFilter() {
    const selectElement = document.getElementById('filterSede');
    if (!selectElement) return;
    
    selectElement.innerHTML = '';
    
    if (allFilterOptions && allFilterOptions.sedes) {
        allFilterOptions.sedes.forEach(sede => {
            const option = document.createElement('option');
            option.value = sede;
            option.textContent = sede;
            selectElement.appendChild(option);
        });
    }
    
    const config = getBaseTomSelectConfig('Seleccionar sedes...');
    tomSelectInstances.sede = new TomSelect('#filterSede', config);
    
    console.log(`✅ Filtro Sede: ${allFilterOptions?.sedes?.length || 0} opciones`);
}

/**
 * Inicializar filtro de Docente
 */
function initDocenteFilter() {
    const selectElement = document.getElementById('filterDocente');
    if (!selectElement) return;
    
    selectElement.innerHTML = '';
    
    if (allFilterOptions && allFilterOptions.docentes) {
        allFilterOptions.docentes.forEach(docente => {
            const option = document.createElement('option');
            option.value = docente;
            option.textContent = docente;
            selectElement.appendChild(option);
        });
    }
    
    const config = getBaseTomSelectConfig('Seleccionar docentes...');
    tomSelectInstances.docente = new TomSelect('#filterDocente', config);
    
    console.log(`✅ Filtro Docente: ${allFilterOptions?.docentes?.length || 0} opciones`);
}

/**
 * Configurar botones de filtro
 */
function setupFilterButtons() {
    const applyBtn = document.getElementById('applyFilters');
    const clearBtn = document.getElementById('clearFilters');
    
    if (applyBtn) {
        // Remover listeners anteriores
        const newApplyBtn = applyBtn.cloneNode(true);
        applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
        
        newApplyBtn.addEventListener('click', applyTomSelectFilters);
    }
    
    if (clearBtn) {
        // Remover listeners anteriores
        const newClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
        
        newClearBtn.addEventListener('click', clearTomSelectFilters);
    }
}

/**
 * Aplicar filtros multiselect
 */
function applyTomSelectFilters() {
    if (!currentResults) return;
    
    console.log('🔍 Aplicando filtros Tom-Select...');
    
    // Obtener valores seleccionados de cada Tom-Select
    const carreras = tomSelectInstances.carrera?.getValue() || [];
    const materias = tomSelectInstances.materia?.getValue() || [];
    const modalidades = tomSelectInstances.modalidad?.getValue() || [];
    const sedes = tomSelectInstances.sede?.getValue() || [];
    const docentes = tomSelectInstances.docente?.getValue() || [];
    
    // Obtener otros filtros (sentimiento y búsqueda de texto)
    const sentimentFilter = document.getElementById('filterSentiment')?.value || '';
    const searchText = document.getElementById('searchText')?.value?.toLowerCase() || '';
    
    console.log('Filtros activos:', {
        carreras: carreras.length,
        materias: materias.length,
        modalidades: modalidades.length,
        sedes: sedes.length,
        docentes: docentes.length,
        sentimiento: sentimentFilter,
        texto: searchText ? 'sí' : 'no'
    });
    
    // Resetear página
    if (typeof currentPage !== 'undefined') {
        currentPage = 1;
    }
    
    // Usar resultados originales como base
    let filtered = currentResults.results.slice();
    
    // Aplicar filtros multiselect (OR dentro de cada categoría, AND entre categorías)
    if (carreras.length > 0) {
        filtered = filtered.filter(result => 
            carreras.includes(result.originalData?.CARRERA || result.CARRERA)
        );
    }
    
    if (materias.length > 0) {
        filtered = filtered.filter(result => 
            materias.includes(result.originalData?.MATERIA || result.MATERIA)
        );
    }
    
    if (modalidades.length > 0) {
        filtered = filtered.filter(result => 
            modalidades.includes(result.originalData?.MODALIDAD || result.MODALIDAD)
        );
    }
    
    if (sedes.length > 0) {
        filtered = filtered.filter(result => 
            sedes.includes(result.originalData?.SEDE || result.SEDE)
        );
    }
    
    if (docentes.length > 0) {
        filtered = filtered.filter(result => 
            docentes.includes(result.originalData?.DOCENTE || result.DOCENTE)
        );
    }
    
    // Filtrar por sentimiento
    if (sentimentFilter) {
        filtered = filtered.filter(result => 
            result.sentiment?.classification === sentimentFilter
        );
    }
    
    // Filtrar por texto
    if (searchText) {
        filtered = filtered.filter(result => {
            const mainText = result.sentiment?.details?.[0]?.text || '';
            return mainText.toLowerCase().includes(searchText);
        });
    }
    
    // Actualizar resultados filtrados globalmente
    if (typeof filteredResults !== 'undefined') {
        filteredResults = filtered;
    }
    
    // Recalcular métricas con resultados filtrados
    if (currentResults.filterOptions && typeof displayNumericMetrics === 'function') {
        displayNumericMetrics(filtered, currentResults.filterOptions);
    }
    
    // Recalcular estadísticas
    if (typeof calculateFilteredStats === 'function') {
        const stats = calculateFilteredStats(filtered);
        
        if (typeof filteredStats !== 'undefined') {
            filteredStats = stats;
        }
        
        // Actualizar gráficos
        if (typeof createSentimentChart === 'function') {
            createSentimentChart(stats);
        }
        if (typeof createCategoryChart === 'function') {
            createCategoryChart(stats);
        }
        
        // Actualizar tarjetas de estadísticas
        if (typeof updateStatsCards === 'function') {
            updateStatsCards(filtered, stats);
        }
    }
    
    // Mostrar tabla de resultados
    if (typeof displayResultsTable === 'function') {
        displayResultsTable(filtered);
    }
    
    // Actualizar resumen de filtros
    updateFilterSummary();
    
    console.log(`✅ Filtrado completado: ${filtered.length} resultados`);
}

/**
 * Limpiar todos los filtros
 */
function clearTomSelectFilters() {
    console.log('🧹 Limpiando filtros Tom-Select...');
    
    // Limpiar cada instancia de Tom-Select
    Object.values(tomSelectInstances).forEach(instance => {
        if (instance && instance.clear) {
            instance.clear();
        }
    });
    
    // Limpiar otros filtros
    const sentimentFilter = document.getElementById('filterSentiment');
    const searchText = document.getElementById('searchText');
    
    if (sentimentFilter) sentimentFilter.value = '';
    if (searchText) searchText.value = '';
    
    // Ocultar resumen de filtros
    const filterSummary = document.getElementById('filterSummary');
    if (filterSummary) {
        filterSummary.style.display = 'none';
    }
    
    // Aplicar filtros (mostrará todos los resultados)
    applyTomSelectFilters();
    
    console.log('✅ Filtros limpiados');
}

/**
 * Actualizar resumen de filtros activos
 */
function updateFilterSummary() {
    const filterSummary = document.getElementById('filterSummary');
    const filterSummaryText = document.getElementById('filterSummaryText');
    
    if (!filterSummary || !filterSummaryText) return;
    
    const filtros = [];
    
    // Contar filtros activos en Tom-Select
    Object.entries(tomSelectInstances).forEach(([name, instance]) => {
        const values = instance?.getValue() || [];
        if (values.length > 0) {
            const label = name.charAt(0).toUpperCase() + name.slice(1);
            filtros.push(`${label}: ${values.length} seleccionado${values.length > 1 ? 's' : ''}`);
        }
    });
    
    // Agregar otros filtros
    const sentimentFilter = document.getElementById('filterSentiment')?.value;
    const searchText = document.getElementById('searchText')?.value;
    
    if (sentimentFilter) {
        filtros.push(`Sentimiento: ${sentimentFilter}`);
    }
    if (searchText) {
        filtros.push(`Búsqueda: "${searchText.substring(0, 30)}${searchText.length > 30 ? '...' : ''}"`);
    }
    
    // Mostrar/ocultar resumen
    if (filtros.length > 0) {
        filterSummaryText.textContent = `Filtros activos: ${filtros.join(' | ')}`;
        filterSummary.style.display = 'block';
    } else {
        filterSummary.style.display = 'none';
    }
}

// Exportar funciones para compatibilidad con código existente
window.initTomSelectFilters = initTomSelectFilters;
window.applyTomSelectFilters = applyTomSelectFilters;
window.clearTomSelectFilters = clearTomSelectFilters;
window.destroyTomSelectInstances = destroyTomSelectInstances;
