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
    
    // Agregar event listeners
    document.getElementById('filterCarrera').addEventListener('change', onCarreraChange);
    document.getElementById('filterMateria').addEventListener('change', onMateriaChange);
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

// Cuando cambia Carrera, actualizar Materia, Modalidad, Sede, Docente
function onCarreraChange() {
    // Resetear todos los filtros dependientes cuando cambia carrera
    document.getElementById('filterMateria').value = '';
    document.getElementById('filterModalidad').value = '';
    document.getElementById('filterSede').value = '';
    document.getElementById('filterDocente').value = '';
    
    updateDependentFilters();
    
    // Aplicar filtros automáticamente si existe la función
    if (typeof filterResults === 'function') {
        filterResults();
    }
}

// Cuando cambia Materia, actualizar Modalidad, Sede y Docente
function onMateriaChange() {
    // Resetear modalidad, sede y docente cuando cambia materia
    document.getElementById('filterModalidad').value = '';
    document.getElementById('filterSede').value = '';
    document.getElementById('filterDocente').value = '';
    
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
    
    // Filtrar resultados según selecciones actuales
    let filteredData = allResults.slice();
    
    if (selectedCarrera) {
        filteredData = filteredData.filter(row => 
            matchesValue(row, ['CARRERA'], selectedCarrera)
        );
    }
    
    // Actualizar opciones de Materia basadas en Carrera
    updateMateriaFilter(filteredData);
    
    // Si hay materia seleccionada, filtrar más
    if (selectedMateria) {
        filteredData = filteredData.filter(row => 
            matchesValue(row, ['MATERIA'], selectedMateria)
        );
    }
    
    // Actualizar Modalidad, Sede y Docente basados en Carrera + Materia
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
        const materia = row['MATERIA'] || row.MATERIA;
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
        const modalidad = row['MODALIDAD'] || row.MODALIDAD;
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
        const sede = row['SEDE'] || row.SEDE;
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
        const docente = row['DOCENTE'] || row.DOCENTE;
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
        if (row[key] && row[key].toString().trim() === targetValue) {
            return true;
        }
    }
    return false;
}
