// Gestor de Configuración de Columnas
let currentColumnConfig = {
    name: 'Default',
    identificacion: [],
    numericas: [],
    textoLibre: [],
    escalas: {}
};

let detectedColumns = [];
let savedConfigs = [];

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    loadSavedConfigs();
    loadDefaultConfig();
    initializeEventListeners();
});

function initializeEventListeners() {
    const showModalBtn = document.getElementById('showConfigModalBtn');
    const newConfigBtn = document.getElementById('newConfigBtn');
    const closeModalBtn = document.getElementById('closeConfigModal');
    const applyConfigBtn = document.getElementById('applyConfigBtn');
    const cancelConfigBtn = document.getElementById('cancelConfigBtn');
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    const savedConfigsSelect = document.getElementById('savedConfigsSelect');
    const deleteConfigBtn = document.getElementById('deleteConfigBtn');
    const fileInput = document.getElementById('excelFile');
    
    // Modal de configuración de columnas
    if (showModalBtn) showModalBtn.addEventListener('click', () => openConfigModal());
    if (newConfigBtn) newConfigBtn.addEventListener('click', () => createNewConfigFromFile());
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeConfigModal());
    if (applyConfigBtn) applyConfigBtn.addEventListener('click', () => applyConfiguration());
    if (cancelConfigBtn) cancelConfigBtn.addEventListener('click', () => closeConfigModal());
    if (saveConfigBtn) saveConfigBtn.addEventListener('click', () => saveConfiguration());
    
    // Modal de configuración de escala
    const closeScaleModalBtn = document.getElementById('closeScaleModal');
    const saveScaleBtn = document.getElementById('saveScaleBtn');
    const cancelScaleBtn = document.getElementById('cancelScaleBtn');
    const scaleDirectionSelect = document.getElementById('scaleDirectionSelect');
    const scaleMinInput = document.getElementById('scaleMinInput');
    const scaleMaxInput = document.getElementById('scaleMaxInput');
    
    if (closeScaleModalBtn) closeScaleModalBtn.addEventListener('click', () => closeScaleConfigModal());
    if (saveScaleBtn) saveScaleBtn.addEventListener('click', () => saveScaleConfig());
    if (cancelScaleBtn) cancelScaleBtn.addEventListener('click', () => closeScaleConfigModal());
    
    // Actualizar hint cuando cambia la dirección o los valores
    if (scaleDirectionSelect) scaleDirectionSelect.addEventListener('change', () => updateDirectionHint());
    if (scaleMinInput) scaleMinInput.addEventListener('input', () => updateDirectionHint());
    if (scaleMaxInput) scaleMaxInput.addEventListener('input', () => updateDirectionHint());
    
    // Cargar automáticamente al seleccionar en dropdown
    if (savedConfigsSelect) {
        savedConfigsSelect.addEventListener('change', () => {
            if (savedConfigsSelect.value !== '') {
                loadSelectedConfig();
                // Sincronizar con dropdown rápido
                const quickSelect = document.getElementById('quickConfigSelect');
                if (quickSelect) {
                    quickSelect.value = savedConfigsSelect.value;
                }
                // Habilitar botón de análisis
                enableAnalyzeButton();
            }
        });
    }
    
    // Sincronizar dropdown rápido con el principal
    const quickConfigSelect = document.getElementById('quickConfigSelect');
    if (quickConfigSelect) {
        quickConfigSelect.addEventListener('change', () => {
            if (quickConfigSelect.value !== '') {
                // Actualizar dropdown principal
                if (savedConfigsSelect) {
                    savedConfigsSelect.value = quickConfigSelect.value;
                }
                // Cargar la configuración
                loadSelectedConfig();
                // Habilitar botón de análisis
                enableAnalyzeButton();
            } else {
                // Deshabilitar botón si se deselecciona
                disableAnalyzeButton();
            }
        });
    }
    
    if (deleteConfigBtn) deleteConfigBtn.addEventListener('click', () => deleteSelectedConfig());
    
    // Cuando se selecciona un archivo, detectar columnas
    if (fileInput) {
        fileInput.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (file) {
                await detectColumnsFromFile(file);
                // NO auto-abrir modal - el usuario debe hacer click en "Configurar Columnas"
                console.log('📁 Archivo cargado. Haz click en "Configurar Columnas" para clasificar las columnas.');
            }
        });
    }
}

// Cargar configuración default desde el servidor
async function loadDefaultConfig() {
    try {
        const response = await fetch('/api/column-config');
        const config = await response.json();
        
        currentColumnConfig = {
            name: 'Default',
            identificacion: config.identificacion || [],
            numericas: config.numericas || [],
            textoLibre: config.textoLibre || []
        };
        
        updateConfigPreview();
    } catch (error) {
        console.error('Error cargando configuración default:', error);
    }
}

// Detectar columnas del archivo Excel
async function detectColumnsFromFile(file) {
    const formData = new FormData();
    formData.append('excelFile', file);
    
    try {
        const response = await fetch('/api/detect-columns', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            detectedColumns = data.columns;
            console.log('📋 Columnas detectadas del nuevo archivo:', detectedColumns);
            
            // Mostrar notificación sobre el archivo nuevo
            const fileInfo = document.createElement('div');
            fileInfo.style.cssText = 'background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin: 15px 0; text-align: center;';
            fileInfo.innerHTML = `
                <strong>📁 Nuevo archivo detectado con ${detectedColumns.length} columnas</strong><br>
                <span style="font-size: 0.9em; color: #666;">
                    Haz click en "➕ Nueva Configuración" para crear una configuración automática,<br>
                    o selecciona una configuración existente si el formato coincide.
                </span>
            `;
            
            // Insertar después del selector de configuraciones
            const configSection = document.querySelector('.config-selector');
            if (configSection && configSection.parentNode) {
                // Eliminar notificación anterior si existe
                const oldInfo = document.getElementById('newFileInfo');
                if (oldInfo) oldInfo.remove();
                
                fileInfo.id = 'newFileInfo';
                configSection.parentNode.insertBefore(fileInfo, configSection.nextSibling);
            }
            
            // NO RESETEAR configuración - mantener la seleccionada por el usuario
            // Solo resetear si no hay ninguna configuración cargada
            if (!currentColumnConfig || !currentColumnConfig.name || currentColumnConfig.name === 'Default') {
                currentColumnConfig = {
                    name: '',
                    identificacion: [],
                    numericas: [],
                    textoLibre: [],
                    escalas: {}
                };
                console.log('⚠️ No hay configuración seleccionada.');
            } else {
                console.log(`✅ Manteniendo configuración: ${currentColumnConfig.name}`);
            }
            
            // Analizar metadata de columnas (escalas, tipos)
            await analyzeColumnMetadata(file);
            
            updateConfigPreview();
        }
    } catch (error) {
        console.error('Error detectando columnas:', error);
    }
}

// Analizar metadata de columnas (escalas numéricas)
async function analyzeColumnMetadata(file) {
    const formData = new FormData();
    formData.append('excelFile', file);
    
    try {
        const response = await fetch('/api/analyze-column-metadata', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success && data.metadata) {
            // Guardar metadata de escalas
            currentColumnConfig.escalas = data.metadata.escalas || {};
            console.log('📊 Escalas detectadas:', currentColumnConfig.escalas);
        }
    } catch (error) {
        console.error('Error analizando metadata:', error);
    }
}

// Crear nueva configuración desde archivo detectado
function createNewConfigFromFile() {
    if (detectedColumns.length === 0) {
        alert('⚠️ Primero carga un archivo Excel/CSV para detectar las columnas.');
        return;
    }
    
    // Clasificación automática inteligente de columnas
    const autoConfig = autoClassifyColumns(detectedColumns);
    
    // Crear nueva configuración vacía con columnas auto-clasificadas
    currentColumnConfig = {
        name: `Config_${new Date().toISOString().split('T')[0]}`,
        identificacion: autoConfig.identificacion,
        numericas: autoConfig.numericas,
        textoLibre: autoConfig.textoLibre,
        escalas: {}
    };
    
    console.log('✨ Nueva configuración creada automáticamente:', currentColumnConfig);
    
    // Abrir modal para que el usuario pueda ajustar
    openConfigModal();
    
    // Mostrar notificación
    alert(`✅ Se creó una nueva configuración con ${detectedColumns.length} columnas detectadas.\n\n` +
          `📋 Identificación: ${autoConfig.identificacion.length}\n` +
          `📊 Numéricas: ${autoConfig.numericas.length}\n` +
          `💬 Texto Libre: ${autoConfig.textoLibre.length}\n\n` +
          `Puedes ajustar la clasificación arrastrando las columnas.`);
}

// Clasificar automáticamente columnas según nombre/contenido
function autoClassifyColumns(columns) {
    const config = {
        identificacion: [],
        numericas: [],
        textoLibre: []
    };
    
    // Patrones para identificación
    const idPatterns = /id|codigo|carrera|materia|docente|profesor|sede|modalidad|comision|turno|año|periodo|fecha/i;
    
    // Patrones para texto libre (preguntas abiertas)
    const textPatterns = /comentario|observacion|sugerencia|motivo|porque|por que|descripcion|detalle|opinion|feedback|respuesta abierta|indique|explique/i;
    
    // Patrones para numéricas (escalas de evaluación)
    const numericPatterns = /evalua|califica|puntua|escala|cumple|demost|considera|aprend|desempeño|desempen|satisfaccion|calidad|nota|promedio/i;
    
    columns.forEach(col => {
        const colLower = col.toLowerCase();
        
        // Clasificar por patrones
        if (idPatterns.test(colLower)) {
            config.identificacion.push(col);
        } else if (textPatterns.test(colLower)) {
            config.textoLibre.push(col);
        } else if (numericPatterns.test(colLower)) {
            config.numericas.push(col);
        } else {
            // Por defecto, columnas desconocidas van a identificación
            config.identificacion.push(col);
        }
    });
    
    return config;
}

// Abrir modal de configuración
function openConfigModal() {
    const modal = document.getElementById('columnConfigModal');
    if (!modal) return;
    
    // NO resetear nada aquí - el reset se hace en detectColumnsFromFile
    console.log('📂 Abriendo modal con', detectedColumns.length, 'columnas detectadas');
    
    modal.classList.remove('hidden');
    populateColumnLists();
    initializeDragAndDrop(); // Inicializar drag & drop después de poblar listas
}

// Cerrar modal
function closeConfigModal() {
    const modal = document.getElementById('columnConfigModal');
    if (modal) modal.classList.add('hidden');
}

// Poblar listas de columnas en el modal
function populateColumnLists() {
    const idList = document.getElementById('idColumnsList');
    const numList = document.getElementById('numColumnsList');
    const textList = document.getElementById('textColumnsList');
    const unassignedList = document.getElementById('unassignedColumnsList');
    
    if (!idList || !numList || !textList || !unassignedList) return;
    
    // Limpiar listas
    idList.innerHTML = '';
    numList.innerHTML = '';
    textList.innerHTML = '';
    unassignedList.innerHTML = '';
    
    // Obtener todas las columnas asignadas
    const assigned = new Set([
        ...currentColumnConfig.identificacion,
        ...currentColumnConfig.numericas,
        ...currentColumnConfig.textoLibre
    ]);
    
    // Poblar listas asignadas
    currentColumnConfig.identificacion.forEach(col => {
        idList.appendChild(createColumnPill(col, 'identificacion'));
    });
    
    currentColumnConfig.numericas.forEach(col => {
        numList.appendChild(createColumnPill(col, 'numericas'));
    });
    
    currentColumnConfig.textoLibre.forEach(col => {
        textList.appendChild(createColumnPill(col, 'textoLibre'));
    });
    
    // Poblar "Sin Asignar" con columnas detectadas que NO estén asignadas
    if (detectedColumns.length > 0) {
        console.log('📋 Mostrando columnas sin asignar del archivo actual');
        detectedColumns.forEach(col => {
            if (!assigned.has(col)) {
                unassignedList.appendChild(createColumnPill(col, 'unassigned'));
            }
        });
    }
    
    // Actualizar nombre de configuración
    const nameInput = document.getElementById('configNameInput');
    if (nameInput) nameInput.value = currentColumnConfig.name;
}

// Crear pill de columna con drag & drop y botones
function createColumnPill(columnName, category) {
    const pill = document.createElement('div');
    pill.className = 'column-pill';
    pill.draggable = true;
    pill.dataset.column = columnName;
    pill.dataset.category = category;
    
    const label = document.createElement('span');
    label.className = 'column-label';
    label.textContent = columnName;
    
    // Mostrar escala si existe
    if (currentColumnConfig.escalas && currentColumnConfig.escalas[columnName]) {
        const scaleInfo = currentColumnConfig.escalas[columnName];
        const directionIcon = scaleInfo.direction === 'descending' ? '⬇️' : '⬆️';
        const scaleLabel = document.createElement('span');
        scaleLabel.className = 'column-scale-info';
        scaleLabel.textContent = ` [Escala: ${scaleInfo.min}-${scaleInfo.max} ${directionIcon}]`;
        scaleLabel.style.fontSize = '0.85em';
        scaleLabel.style.color = '#666';
        label.appendChild(scaleLabel);
    }
    
    const actions = document.createElement('div');
    actions.className = 'column-actions';
    
    // Botón de configurar escala (solo para columnas numéricas)
    if (category === 'numericas') {
        const scaleBtn = document.createElement('button');
        scaleBtn.className = 'scale-btn';
        scaleBtn.innerHTML = '⚙️';
        scaleBtn.title = 'Configurar Escala';
        scaleBtn.onclick = (e) => {
            e.stopPropagation();
            openScaleConfigModal(columnName);
        };
        actions.appendChild(scaleBtn);
    }
    
    // Botones para mover a cada categoría
    const categories = [
        { type: 'identificacion', icon: '🏷️', title: 'Mover a Identificación' },
        { type: 'numericas', icon: '📊', title: 'Mover a Numéricas' },
        { type: 'textoLibre', icon: '💬', title: 'Mover a Texto Libre' }
    ];
    
    categories.forEach(cat => {
        if (cat.type !== category) {
            const btn = document.createElement('button');
            btn.className = 'move-btn';
            btn.innerHTML = cat.icon;
            btn.title = cat.title;
            btn.onclick = (e) => {
                e.stopPropagation();
                console.log('🖱️ Click en botón:', cat.icon, 'para mover', columnName);
                moveColumn(columnName, category, cat.type);
            };
            actions.appendChild(btn);
        }
    });
    
    pill.appendChild(label);
    pill.appendChild(actions);
    
    // Drag & Drop
    pill.addEventListener('dragstart', handleDragStart);
    pill.addEventListener('dragend', handleDragEnd);
    
    return pill;
}

// Mover columna entre categorías
function moveColumn(columnName, fromCategory, toCategory) {
    console.log(`📦 Moviendo "${columnName}" de "${fromCategory}" a "${toCategory}"`);
    
    // Remover de la categoría origen (solo si no es 'unassigned')
    if (fromCategory === 'identificacion') {
        currentColumnConfig.identificacion = currentColumnConfig.identificacion.filter(c => c !== columnName);
    } else if (fromCategory === 'numericas') {
        currentColumnConfig.numericas = currentColumnConfig.numericas.filter(c => c !== columnName);
    } else if (fromCategory === 'textoLibre') {
        currentColumnConfig.textoLibre = currentColumnConfig.textoLibre.filter(c => c !== columnName);
    }
    // 'unassigned' no necesita remover de ningún array
    
    // Agregar a la categoría destino (solo si no es 'unassigned')
    if (toCategory === 'identificacion' && !currentColumnConfig.identificacion.includes(columnName)) {
        currentColumnConfig.identificacion.push(columnName);
    } else if (toCategory === 'numericas' && !currentColumnConfig.numericas.includes(columnName)) {
        currentColumnConfig.numericas.push(columnName);
    } else if (toCategory === 'textoLibre' && !currentColumnConfig.textoLibre.includes(columnName)) {
        currentColumnConfig.textoLibre.push(columnName);
    }
    // Si toCategory es 'unassigned', simplemente se remueve de las otras
    
    console.log('✅ Config actualizada:', currentColumnConfig);
    populateColumnLists();
}

// Drag & Drop handlers
let draggedElement = null;

function handleDragStart(e) {
    draggedElement = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleDragEnd(e) {
    this.style.opacity = '1';
    
    // Remover highlight de todas las listas
    document.querySelectorAll('.columns-list').forEach(list => {
        list.classList.remove('drag-over');
    });
}

// Inicializar drag & drop en las listas
function initializeDragAndDrop() {
    const lists = document.querySelectorAll('.columns-list');
    console.log('🎯 Inicializando drag & drop en', lists.length, 'listas');
    
    lists.forEach(list => {
        // Agregar listeners (los duplicados no importan, el navegador los maneja)
        list.addEventListener('dragover', handleDragOver);
        list.addEventListener('drop', handleDrop);
        list.addEventListener('dragleave', handleDragLeave);
        
        console.log('✅ Listeners agregados a:', list.id, '- categoria:', list.dataset.category);
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    e.preventDefault();
    
    this.classList.remove('drag-over');
    
    console.log('🎯 DROP detectado en:', this.id, this.dataset.category);
    
    if (draggedElement) {
        const columnName = draggedElement.dataset.column;
        const fromCategory = draggedElement.dataset.category;
        const toCategory = this.dataset.category;
        
        console.log('📦 Datos del drop:', { columnName, fromCategory, toCategory });
        
        if (fromCategory !== toCategory) {
            moveColumn(columnName, fromCategory, toCategory);
        } else {
            console.log('⚠️ Misma categoría, no se mueve');
        }
    } else {
        console.log('❌ No hay elemento draggeado');
    }
    
    return false;
}

// Aplicar configuración
function applyConfiguration() {
    detectedColumns = []; // Limpiar columnas detectadas
    updateConfigPreview();
    closeConfigModal();
    console.log('✅ Configuración aplicada:', currentColumnConfig);
}

// Guardar configuración
async function saveConfiguration() {
    const nameInput = document.getElementById('configNameInput');
    if (!nameInput) return;
    
    const configName = nameInput.value.trim() || 'Sin nombre';
    currentColumnConfig.name = configName;
    
    try {
        const response = await fetch('/api/save-column-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentColumnConfig)
        });
        
        const result = await response.json();
        if (result.success) {
            detectedColumns = []; // Limpiar columnas detectadas
            alert(`✅ Configuración "${configName}" guardada exitosamente`);
            await loadSavedConfigs();
        } else {
            alert('❌ Error guardando configuración: ' + result.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error guardando configuración');
    }
}

// Cargar configuraciones guardadas
async function loadSavedConfigs() {
    try {
        const response = await fetch('/api/saved-column-configs');
        const data = await response.json();
        
        savedConfigs = data.configs || [];
        
        const select = document.getElementById('savedConfigsSelect');
        if (select) {
            select.innerHTML = '<option value="">-- Seleccionar configuración --</option>';
            let luciaIndex = -1;
            savedConfigs.forEach((config, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${config.name} (${config.identificacion.length + config.numericas.length + config.textoLibre.length} columnas)`;
                select.appendChild(option);
                
                // Buscar configuración "Lucia" (case-insensitive)
                if (config.name.toLowerCase() === 'lucia') {
                    luciaIndex = index;
                }
            });
            
            // También poblar el dropdown rápido
            const quickSelect = document.getElementById('quickConfigSelect');
            if (quickSelect) {
                quickSelect.innerHTML = '<option value="">⚙️ Seleccionar configuración de columnas...</option>';
                savedConfigs.forEach((config, index) => {
                    const option = document.createElement('option');
                    option.value = index;
                    option.textContent = `${config.name} (${config.textoLibre.length} cols texto libre)`;
                    quickSelect.appendChild(option);
                });
            }
            
            // NO auto-seleccionar ninguna configuración por defecto
            console.log('✅ Configuraciones cargadas. Por favor selecciona una configuración antes de analizar.');
        }
    } catch (error) {
        console.error('Error cargando configuraciones:', error);
    }
}

// Cargar configuración seleccionada
function loadSelectedConfig() {
    const select = document.getElementById('savedConfigsSelect');
    if (!select || select.value === '') {
        return;
    }
    
    const index = parseInt(select.value);
    const config = savedConfigs[index];
    
    if (!config) {
        alert('❌ Configuración no encontrada');
        return;
    }
    
    // Cargar directamente sin confirmación
    currentColumnConfig = { ...config };
    detectedColumns = []; // Limpiar columnas detectadas al cargar configuración guardada
    updateConfigPreview();
    // NO abrir automáticamente el colapsable - solo actualizar el preview
    console.log('✅ Configuración cargada:', currentColumnConfig.name);
}

// Eliminar configuración seleccionada
async function deleteSelectedConfig() {
    const select = document.getElementById('savedConfigsSelect');
    if (!select || select.value === '') {
        alert('⚠️ Por favor selecciona una configuración para eliminar');
        return;
    }
    
    const index = parseInt(select.value);
    const config = savedConfigs[index];
    
    if (!confirm(`¿Estás seguro de eliminar la configuración "${config.name}"?`)) {
        return;
    }
    
    try {
        const response = await fetch('/api/delete-column-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: config.name })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('✅ Configuración eliminada');
            await loadSavedConfigs();
        } else {
            alert('❌ Error eliminando configuración');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error eliminando configuración');
    }
}

// Actualizar preview de configuración actual
function updateConfigPreview() {
    const preview = document.getElementById('currentConfigPreview');
    const nameSpan = document.getElementById('currentConfigName');
    const idCount = document.getElementById('previewIdCount');
    const numCount = document.getElementById('previewNumCount');
    const textCount = document.getElementById('previewTextCount');
    const idColumns = document.getElementById('previewIdColumns');
    const numColumns = document.getElementById('previewNumColumns');
    const textColumns = document.getElementById('previewTextColumns');
    
    if (!preview) return;
    
    preview.classList.remove('hidden');
    
    // Actualizar nombre de configuración
    if (nameSpan) {
        nameSpan.textContent = currentColumnConfig.name || 'Default';
        console.log('📝 Configuración actualizada en preview:', currentColumnConfig.name);
    }
    
    if (idCount) idCount.textContent = currentColumnConfig.identificacion.length;
    if (numCount) numCount.textContent = currentColumnConfig.numericas.length;
    if (textCount) textCount.textContent = currentColumnConfig.textoLibre.length;
    
    if (idColumns) {
        idColumns.innerHTML = currentColumnConfig.identificacion.map(col => 
            `<span class="column-pill-small id">${col}</span>`
        ).join('');
    }
    
    if (numColumns) {
        numColumns.innerHTML = currentColumnConfig.numericas.map(col => 
            `<span class="column-pill-small num">${col}</span>`
        ).join('');
    }
    
    if (textColumns) {
        textColumns.innerHTML = currentColumnConfig.textoLibre.map(col => 
            `<span class="column-pill-small text">${col}</span>`
        ).join('');
    }
}

// Exportar configuración actual para usarla en el análisis
function getCurrentColumnConfig() {
    return currentColumnConfig;
}

// Abrir modal de configuración de escala
function openScaleConfigModal(columnName) {
    const modal = document.getElementById('scaleConfigModal');
    const columnNameSpan = document.getElementById('scaleColumnName');
    const minInput = document.getElementById('scaleMinInput');
    const maxInput = document.getElementById('scaleMaxInput');
    const directionSelect = document.getElementById('scaleDirectionSelect');
    
    // Mostrar nombre de columna
    columnNameSpan.textContent = columnName;
    
    // Cargar valores actuales si existen
    const currentScale = currentColumnConfig.escalas?.[columnName];
    if (currentScale) {
        minInput.value = currentScale.min;
        maxInput.value = currentScale.max;
        directionSelect.value = currentScale.direction || 'ascending';
    } else {
        minInput.value = '1';
        maxInput.value = '5';
        directionSelect.value = 'ascending';
    }
    
    // Actualizar hint de dirección
    updateDirectionHint();
    
    // Guardar referencia a la columna actual
    modal.dataset.currentColumn = columnName;
    
    // Mostrar modal
    modal.classList.remove('hidden');
}

// Actualizar hint de dirección
function updateDirectionHint() {
    const directionSelect = document.getElementById('scaleDirectionSelect');
    const hint = document.getElementById('directionHint');
    const minInput = document.getElementById('scaleMinInput');
    const maxInput = document.getElementById('scaleMaxInput');
    
    const min = minInput.value || '1';
    const max = maxInput.value || '5';
    
    if (directionSelect.value === 'ascending') {
        hint.textContent = `${min} = Peor calificación, ${max} = Mejor calificación`;
        hint.style.color = '#28a745';
    } else {
        hint.textContent = `${max} = Peor calificación, ${min} = Mejor calificación`;
        hint.style.color = '#dc3545';
    }
}

// Cerrar modal de configuración de escala
function closeScaleConfigModal() {
    const modal = document.getElementById('scaleConfigModal');
    modal.classList.add('hidden');
}

// Guardar configuración de escala
function saveScaleConfig() {
    const modal = document.getElementById('scaleConfigModal');
    const columnName = modal.dataset.currentColumn;
    const minInput = document.getElementById('scaleMinInput');
    const maxInput = document.getElementById('scaleMaxInput');
    const directionSelect = document.getElementById('scaleDirectionSelect');
    const applyToAllCheckbox = document.getElementById('applyToAllNumeric');
    
    const min = parseInt(minInput.value);
    const max = parseInt(maxInput.value);
    const direction = directionSelect.value;
    const applyToAll = applyToAllCheckbox ? applyToAllCheckbox.checked : false;
    
    // Validar
    if (isNaN(min) || isNaN(max)) {
        alert('⚠️ Por favor ingresa valores numéricos válidos');
        return;
    }
    
    if (min >= max) {
        alert('⚠️ El valor mínimo debe ser menor que el máximo');
        return;
    }
    
    // Inicializar escalas si no existe
    if (!currentColumnConfig.escalas) {
        currentColumnConfig.escalas = {};
    }
    
    // Crear objeto de configuración de escala
    const scaleConfig = {
        type: 'scale',
        min: min,
        max: max,
        direction: direction,
        manual: true
    };
    
    // Si se seleccionó aplicar a todas las numéricas
    if (applyToAll) {
        const numericColumns = currentColumnConfig.numericas || [];
        let appliedCount = 0;
        
        numericColumns.forEach(column => {
            currentColumnConfig.escalas[column] = { ...scaleConfig };
            appliedCount++;
        });
        
        console.log(`✅ Escala ${min}-${max} (${direction}) aplicada a ${appliedCount} columnas numéricas`);
        alert(`✅ Configuración aplicada a ${appliedCount} preguntas numéricas:\n\nEscala: ${min}-${max}\nDirección: ${direction === 'ascending' ? 'Ascendente' : 'Descendente'}`);
    } else {
        // Guardar solo para la columna actual
        currentColumnConfig.escalas[columnName] = scaleConfig;
        console.log(`✅ Escala configurada para "${columnName}": ${min}-${max} (${direction})`);
    }
    
    // Actualizar vista
    populateColumnLists();
    updateConfigPreview();
    closeScaleConfigModal();
}

// Funciones para habilitar/deshabilitar el botón de análisis
function enableAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeBtnText = document.getElementById('analyzeBtnText');
    
    if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.style.opacity = '1';
        analyzeBtn.style.cursor = 'pointer';
    }
    
    if (analyzeBtnText) {
        analyzeBtnText.textContent = 'Analizar Encuesta';
    }
}

function disableAnalyzeButton() {
    const analyzeBtn = document.getElementById('analyzeBtn');
    const analyzeBtnText = document.getElementById('analyzeBtnText');
    
    if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.style.opacity = '0.5';
        analyzeBtn.style.cursor = 'not-allowed';
    }
    
    if (analyzeBtnText) {
        analyzeBtnText.textContent = 'Selecciona una configuración primero';
    }
}

// Hacer disponible globalmente
window.getCurrentColumnConfig = getCurrentColumnConfig;
