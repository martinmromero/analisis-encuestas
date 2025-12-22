/**
 * SISTEMA DE FILTROS EN CASCADA
 * Carrera → Materia → Sede/Docente
 */

// Variables globales para filtros
let allFilterOptions = null; // Todas las opciones originales del servidor
let allResults = [];  // Todos los resultados

// Inicializar filtros en cascada
function initCascadeFilters(filterOptions, results) {
    console.log('🔧 Inicializando filtros en cascada');
    allFilterOptions = filterOptions;
    allResults = results;
    
    // Poblar carrera (siempre muestra todas)
    populateCarreraFilter();
    
    // Actualizar los demás filtros basados en carrera
    updateDependentFilters();
    
    // Agregar event listeners a TODOS los filtros
    document.getElementById('filterCarrera').addEventListener('change', onCarreraChange);
    document.getElementById('filterMateria').addEventListener('change', onMateriaChange);
    document.getElementById('filterModalidad').addEventListener('change', onFilterChange);
    document.getElementById('filterSede').addEventListener('change', onFilterChange);
    document.getElementById('filterDocente').addEventListener('change', onFilterChange);
}

// Función genérica cuando cambia cualquier filtro
function onFilterChange() {
    updateDependentFilters();
    
    if (typeof filterResults === 'function') {
        filterResults();
    }
}

// Poblar filtro de carrera (no depende de nada)
function populateCarreraFilter() {
    const select = document.getElementById('filterCarrera');
    select.innerHTML = '<option value="">Todas las carreras</option>';
    
    if (allFilterOptions && allFilterOptions.carreras) {
        allFilterOptions.carreras.forEach(carrera => {
            const option = document.createElement('option');
            option.value = carrera;
            option.textContent = carrera;
            select.appendChild(option);
        });
        console.log(`✅ ${allFilterOptions.carreras.length} carreras cargadas`);
    }
}

// Cuando cambia Carrera, actualizar opciones disponibles (sin resetear otros filtros)
function onCarreraChange() {
    // NO resetear otros filtros - permitir combinaciones libres
    updateDependentFilters();
    
    // Aplicar filtros automáticamente si existe la función
    if (typeof filterResults === 'function') {
        filterResults();
    }
}

// Cuando cambia Materia, actualizar opciones disponibles (sin resetear otros filtros)
function onMateriaChange() {
    // NO resetear otros filtros - permitir combinaciones libres
    updateDependentFilters();
    
    // Aplicar filtros automáticamente si existe la función
    if (typeof filterResults === 'function') {
        filterResults();
    }
}

// Actualizar filtros dependientes basados en selecciones actuales
function updateDependentFilters() {
    const selectedCarrera = document.getElementById('filterCarrera').value;
    const selectedMateria = document.getElementById('filterMateria').value;
    const selectedModalidad = document.getElementById('filterModalidad').value;
    const selectedSede = document.getElementById('filterSede').value;
    const selectedDocente = document.getElementById('filterDocente').value;
    
    // Aplicar TODOS los filtros seleccionados para determinar opciones disponibles
    let filteredData = allResults.slice();
    
    if (selectedCarrera) {
        filteredData = filteredData.filter(row => 
            matchesValue(row, ['CARRERA'], selectedCarrera)
        );
    }
    if (selectedMateria) {
        filteredData = filteredData.filter(row => 
            matchesValue(row, ['MATERIA'], selectedMateria)
        );
    }
    if (selectedModalidad) {
        filteredData = filteredData.filter(row => 
            matchesValue(row, ['MODALIDAD'], selectedModalidad)
        );
    }
    if (selectedSede) {
        filteredData = filteredData.filter(row => 
            matchesValue(row, ['SEDE'], selectedSede)
        );
    }
    if (selectedDocente) {
        filteredData = filteredData.filter(row => 
            matchesValue(row, ['DOCENTE'], selectedDocente)
        );
    }
    
    // Actualizar todas las opciones basadas en la combinación de filtros
    updateMateriaFilter(filteredData);
    updateModalidadFilter(filteredData);
    updateSedeFilter(filteredData);
    updateDocenteFilter(filteredData);
}

// Actualizar filtro de Materia
function updateMateriaFilter(filteredData) {
    const select = document.getElementById('filterMateria');
    const currentValue = select.value;
    
    // Extraer materias únicas de los datos filtrados
    const materias = new Set();
    filteredData.forEach(row => {
        const materia = row.originalData?.MATERIA || row['MATERIA'] || row.MATERIA;
        if (materia && materia.toString().trim()) {
            materias.add(materia.toString().trim());
        }
    });
    
    // Repoblar select
    select.innerHTML = '<option value="">Todas las materias</option>';
    const sortedMaterias = Array.from(materias).sort();
    
    sortedMaterias.forEach(materia => {
        const option = document.createElement('option');
        option.value = materia;
        option.textContent = materia;
        if (materia === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    console.log(`🔄 ${sortedMaterias.length} materias disponibles`);
}

// Actualizar filtro de Modalidad
function updateModalidadFilter(filteredData) {
    const select = document.getElementById('filterModalidad');
    const currentValue = select.value;
    
    // Extraer modalidades únicas de los datos filtrados
    const modalidades = new Set();
    filteredData.forEach(row => {
        const modalidad = row.originalData?.MODALIDAD || row['MODALIDAD'] || row.MODALIDAD;
        if (modalidad && modalidad.toString().trim()) {
            modalidades.add(modalidad.toString().trim());
        }
    });
    
    // Repoblar select
    select.innerHTML = '<option value="">Todas las modalidades</option>';
    const sortedModalidades = Array.from(modalidades).sort();
    
    sortedModalidades.forEach(modalidad => {
        const option = document.createElement('option');
        option.value = modalidad;
        option.textContent = modalidad;
        if (modalidad === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    console.log(`🔄 ${sortedModalidades.length} modalidades disponibles`);
}

// Actualizar filtro de Sede
function updateSedeFilter(filteredData) {
    const select = document.getElementById('filterSede');
    const currentValue = select.value;
    
    // Extraer sedes únicas de los datos filtrados
    const sedes = new Set();
    filteredData.forEach(row => {
        const sede = row.originalData?.SEDE || row['SEDE'] || row.SEDE;
        if (sede && sede.toString().trim()) {
            sedes.add(sede.toString().trim());
        }
    });
    
    // Repoblar select
    select.innerHTML = '<option value="">Todas las sedes</option>';
    const sortedSedes = Array.from(sedes).sort();
    
    sortedSedes.forEach(sede => {
        const option = document.createElement('option');
        option.value = sede;
        option.textContent = sede;
        if (sede === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    console.log(`🔄 ${sortedSedes.length} sedes disponibles`);
}

// Actualizar filtro de Docente
function updateDocenteFilter(filteredData) {
    const select = document.getElementById('filterDocente');
    const currentValue = select.value;
    
    // Extraer docentes únicos de los datos filtrados
    const docentes = new Set();
    filteredData.forEach(row => {
        const docente = row.originalData?.DOCENTE || row['DOCENTE'] || row.DOCENTE;
        if (docente && docente.toString().trim()) {
            docentes.add(docente.toString().trim());
        }
    });
    
    // Repoblar select
    select.innerHTML = '<option value="">Todos los docentes</option>';
    const sortedDocentes = Array.from(docentes).sort();
    
    sortedDocentes.forEach(docente => {
        const option = document.createElement('option');
        option.value = docente;
        option.textContent = docente;
        if (docente === currentValue) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    console.log(`🔄 ${sortedDocentes.length} docentes disponibles`);
}

// Función auxiliar para verificar coincidencia (la misma que en app.js)
function matchesValue(row, possibleKeys, targetValue) {
    for (const key of possibleKeys) {
        const value = row.originalData?.[key] || row[key];
        if (value && value.toString().trim() === targetValue) {
            return true;
        }
    }
    return false;
}
