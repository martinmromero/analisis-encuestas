// Gestor de Configuración de Columnas
let currentColumnConfig = {
    name: 'Default',
    identificacion: [],
    numericas: [],
    textoLibre: [],
    sinAsignar: [],
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
            textoLibre: config.textoLibre || [],
            sinAsignar: []
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
            
            // Guardar análisis de columnas para clasificación inteligente
            window.columnAnalysis = data.analysis || {};
            
            console.log('📋 Columnas detectadas del nuevo archivo:', detectedColumns.length);
            if (data.analysis) {
                const summary = {
                    identificacion: 0,
                    numerica: 0,
                    textoLibre: 0
                };
                Object.values(data.analysis).forEach(a => {
                    summary[a.type]++;
                });
                console.log('🔍 Clasificación automática sugerida:', summary);
            }
            
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
                    sinAsignar: [],
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
    
    // Mostrar notificación mejorada con detalles de la clasificación
    const totalCols = detectedColumns.length;
    const highConfidence = Object.values(window.columnAnalysis || {}).filter(a => a.confidence === 'high').length;
    const mediumConfidence = Object.values(window.columnAnalysis || {}).filter(a => a.confidence === 'medium').length;
    
    let message = `✅ Configuración automática creada con ${totalCols} columnas detectadas:\n\n`;
    message += `🏷️ Identificación: ${autoConfig.identificacion.length} columnas\n`;
    message += `📊 Numéricas: ${autoConfig.numericas.length} columnas\n`;
    message += `💬 Texto Libre: ${autoConfig.textoLibre.length} columnas\n\n`;
    
    if (highConfidence > 0 || mediumConfidence > 0) {
        message += `🎯 Confianza de clasificación:\n`;
        message += `  Alta: ${highConfidence} columnas ✓\n`;
        if (mediumConfidence > 0) {
            message += `  Media: ${mediumConfidence} columnas (revisar)\n`;
        }
        message += `\n`;
    }
    
    message += `Puedes ajustar la clasificación arrastrando las columnas entre secciones.`;
    
    alert(message);
}

// Clasificar automáticamente columnas según análisis del servidor
function autoClassifyColumns(columns) {
    const config = {
        identificacion: [],
        numericas: [],
        textoLibre: [],
        escalas: {} // Añadir escalas detectadas
    };
    
    // Si hay análisis del servidor, usarlo (más preciso)
    const analysis = window.columnAnalysis || {};
    
    if (Object.keys(analysis).length > 0) {
        console.log('🤖 Usando clasificación inteligente basada en análisis de contenido');
        
        columns.forEach(col => {
            const columnInfo = analysis[col];
            if (columnInfo) {
                // Usar el tipo sugerido por el análisis del servidor
                if (columnInfo.type === 'numerica') {
                    config.numericas.push(col);
                    
                    // Si detectó escala, configurarla automáticamente
                    if (columnInfo.scale) {
                        config.escalas[col] = {
                            min: columnInfo.scale.min,
                            max: columnInfo.scale.max,
                            direction: columnInfo.scale.direction,
                            labels: columnInfo.scale.labels || null
                        };
                        console.log(`  📏 ${col}: Escala detectada ${columnInfo.scale.min}-${columnInfo.scale.max}`);
                    }
                } else if (columnInfo.type === 'textoLibre') {
                    config.textoLibre.push(col);
                } else {
                    config.identificacion.push(col);
                }
                
                // Log para debug
                if (columnInfo.confidence === 'high') {
                    console.log(`  ✅ ${col} → ${columnInfo.type} (${columnInfo.reason})`);
                } else {
                    console.log(`  ⚠️ ${col} → ${columnInfo.type} (${columnInfo.reason})`);
                }
            } else {
                // Fallback: clasificación por nombre
                config.identificacion.push(col);
            }
        });
    } else {
        // Fallback: clasificación solo por patrones de nombre (método antiguo)
        console.log('📝 Usando clasificación por nombre de columnas (fallback)');
        
        const idPatterns = /^(id|codigo|cod|numero|nro|num)$|carrera|materia|docente|profesor|sede|modalidad|comision|turno|año|periodo|fecha/i;
        const textPatterns = /comentario|observacion|sugerencia|motivo|porque|por que|descripcion|detalle|opinion|feedback|respuesta abierta|indique|explique|mencione/i;
        const numericPatterns = /evalua|califica|puntua|escala|cumple|demost|considera|aprend|desempeño|desempen|satisfaccion|calidad|nota|promedio|puntaje/i;
        
        columns.forEach(col => {
            const colLower = col.toLowerCase();
            
            if (idPatterns.test(colLower)) {
                config.identificacion.push(col);
            } else if (textPatterns.test(colLower)) {
                config.textoLibre.push(col);
            } else if (numericPatterns.test(colLower)) {
                config.numericas.push(col);
            } else {
                config.identificacion.push(col);
            }
        });
    }
    
    console.log('📊 Resultado de clasificación automática:');
    console.log(`  🏷️ Identificación: ${config.identificacion.length} columnas`);
    console.log(`  📊 Numéricas: ${config.numericas.length} columnas`);
    console.log(`  💬 Texto Libre: ${config.textoLibre.length} columnas`);
    if (Object.keys(config.escalas).length > 0) {
        console.log(`  📏 Escalas detectadas: ${Object.keys(config.escalas).length} columnas`);
    }
    
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
    
    // Poblar "Sin Asignar" con columnas detectadas o guardadas
    let unassigned = [];
    
    if (detectedColumns.length > 0) {
        // Si hay columnas detectadas del archivo actual, calcular dinámicamente
        unassigned = detectedColumns.filter(col => !assigned.has(col));
        console.log(`📋 Mostrando ${unassigned.length} columnas sin asignar de ${detectedColumns.length} columnas detectadas`);
    } else if (currentColumnConfig.sinAsignar && currentColumnConfig.sinAsignar.length > 0) {
        // Si no hay archivo, usar las columnas sin asignar guardadas
        unassigned = currentColumnConfig.sinAsignar;
        console.log(`📋 Mostrando ${unassigned.length} columnas sin asignar guardadas en la configuración`);
    }
    
    if (unassigned.length > 0) {
        unassigned.forEach(col => {
            unassignedList.appendChild(createColumnPill(col, 'unassigned'));
        });
        
        // Actualizar mensaje descriptivo
        const unassignedCategory = document.querySelector('.column-category.unassigned .category-desc');
        if (unassignedCategory) {
            unassignedCategory.textContent = `${unassigned.length} columna${unassigned.length !== 1 ? 's' : ''} sin clasificar`;
        }
    } else {
        const unassignedCategory = document.querySelector('.column-category.unassigned .category-desc');
        if (unassignedCategory) {
            if (detectedColumns.length > 0) {
                unassignedCategory.textContent = 'Todas las columnas están clasificadas ✓';
            } else {
                unassignedCategory.textContent = 'Carga un archivo Excel para detectar columnas';
            }
        }
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
    
    // Agregar tooltip con información de análisis
    const analysis = window.columnAnalysis?.[columnName];
    if (analysis && analysis.stats) {
        const stats = analysis.stats;
        pill.title = `${columnName}\n` +
                     `Tipo: ${analysis.type}\n` +
                     `Razón: ${analysis.reason}\n` +
                     `Valores únicos: ${stats.unique} de ${stats.samples} (${stats.uniqueRatio}%)\n` +
                     `Longitud promedio: ${stats.avgLength} caracteres\n` +
                     `Valores numéricos: ${stats.numericRatio}%`;
    }
    
    const label = document.createElement('span');
    label.className = 'column-label';
    label.textContent = columnName;
    
    // Agregar indicador de confianza si hay análisis disponible
    if (analysis) {
        const confidenceIcon = document.createElement('span');
        confidenceIcon.className = 'confidence-indicator';
        
        if (analysis.confidence === 'high') {
            confidenceIcon.textContent = ' ✓';
            confidenceIcon.style.color = '#22c55e';
            confidenceIcon.title = `Alta confianza: ${analysis.reason}`;
        } else if (analysis.confidence === 'medium') {
            confidenceIcon.textContent = ' ~';
            confidenceIcon.style.color = '#f59e0b';
            confidenceIcon.title = `Media confianza: ${analysis.reason} - Revisar clasificación`;
        } else {
            confidenceIcon.textContent = ' ?';
            confidenceIcon.style.color = '#94a3b8';
            confidenceIcon.title = `Baja confianza: ${analysis.reason} - Verificar clasificación`;
        }
        
        label.appendChild(confidenceIcon);
    }
    
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
    // Calcular y guardar columnas sin asignar en la configuración
    if (detectedColumns.length > 0) {
        const assigned = new Set([
            ...currentColumnConfig.identificacion,
            ...currentColumnConfig.numericas,
            ...currentColumnConfig.textoLibre
        ]);
        currentColumnConfig.sinAsignar = detectedColumns.filter(col => !assigned.has(col));
    }
    
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
    
    // Calcular y guardar columnas sin asignar
    if (detectedColumns.length > 0) {
        const assigned = new Set([
            ...currentColumnConfig.identificacion,
            ...currentColumnConfig.numericas,
            ...currentColumnConfig.textoLibre
        ]);
        currentColumnConfig.sinAsignar = detectedColumns.filter(col => !assigned.has(col));
    }
    
    try {
        const response = await fetch('/api/save-column-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentColumnConfig)
        });
        
        const result = await response.json();
        if (result.success) {
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
        console.log('🔄 Iniciando carga de configuraciones guardadas...');
        const response = await fetch('/api/saved-column-configs');
        console.log('📡 Respuesta recibida:', response.status);
        
        const data = await response.json();
        console.log('📦 Datos recibidos:', data);
        
        savedConfigs = data.configs || [];
        console.log(`📊 Configuraciones cargadas: ${savedConfigs.length}`);
        
        const select = document.getElementById('savedConfigsSelect');
        const quickSelect = document.getElementById('quickConfigSelect');
        
        console.log('🔍 Elementos encontrados:', { 
            select: !!select, 
            quickSelect: !!quickSelect 
        });
        
        if (select) {
            select.innerHTML = '<option value="">-- Seleccionar configuración --</option>';
            savedConfigs.forEach((config, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${config.name} (${config.identificacion.length + config.numericas.length + config.textoLibre.length} columnas)`;
                select.appendChild(option);
            });
            console.log(`✅ ${savedConfigs.length} configuraciones agregadas a savedConfigsSelect`);
        } else {
            console.warn('⚠️ savedConfigsSelect no encontrado');
        }
        
        if (quickSelect) {
            quickSelect.innerHTML = '<option value="">⚙️ Seleccionar configuración de columnas...</option>';
            savedConfigs.forEach((config, index) => {
                const option = document.createElement('option');
                option.value = index;
                option.textContent = `${config.name} (${config.textoLibre.length} cols texto libre)`;
                quickSelect.appendChild(option);
            });
            console.log(`✅ ${savedConfigs.length} configuraciones agregadas a quickConfigSelect`);
        } else {
            console.warn('⚠️ quickConfigSelect no encontrado');
        }
        
        console.log('✅ Configuraciones cargadas completamente');
    } catch (error) {
        console.error('❌ Error cargando configuraciones:', error);
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
    currentColumnConfig = { 
        ...config,
        sinAsignar: config.sinAsignar || [] // Asegurar que sinAsignar exista
    };
    
    // Sincronizar detectedColumns con las columnas guardadas
    const allColumns = [
        ...currentColumnConfig.identificacion,
        ...currentColumnConfig.numericas,
        ...currentColumnConfig.textoLibre,
        ...currentColumnConfig.sinAsignar
    ];
    detectedColumns = allColumns;
    
    updateConfigPreview();
    console.log('✅ Configuración cargada:', currentColumnConfig.name, '- Columnas detectadas:', detectedColumns.length);
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
    const unassignedCount = document.getElementById('previewUnassignedCount');
    const idColumns = document.getElementById('previewIdColumns');
    const numColumns = document.getElementById('previewNumColumns');
    const textColumns = document.getElementById('previewTextColumns');
    const unassignedColumns = document.getElementById('previewUnassignedColumns');
    const unassignedSection = document.getElementById('previewUnassignedSection');
    
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
    
    // Calcular y mostrar columnas sin asignar
    let unassigned = [];
    
    if (detectedColumns.length > 0) {
        // Si hay columnas detectadas del archivo actual, calcular sin asignar dinámicamente
        const assigned = new Set([
            ...currentColumnConfig.identificacion,
            ...currentColumnConfig.numericas,
            ...currentColumnConfig.textoLibre
        ]);
        unassigned = detectedColumns.filter(col => !assigned.has(col));
    } else if (currentColumnConfig.sinAsignar && currentColumnConfig.sinAsignar.length > 0) {
        // Si no hay archivo cargado, usar las columnas sin asignar guardadas en la config
        unassigned = currentColumnConfig.sinAsignar;
    }
    
    if (unassigned.length > 0) {
        if (unassignedCount) unassignedCount.textContent = unassigned.length;
        if (unassignedColumns) {
            unassignedColumns.innerHTML = unassigned.map(col => 
                `<span class="column-pill-small unassigned" style="background: #FEF3C7; color: #92400E; border: 1px solid #F59E0B;">${col}</span>`
            ).join('');
        }
        if (unassignedSection) unassignedSection.style.display = 'block';
        console.log('⚠️ Columnas sin asignar:', unassigned.length);
    } else {
        if (unassignedSection) unassignedSection.style.display = 'none';
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
    const autoDetectedBadge = document.getElementById('autoDetectedBadge');
    
    // Mostrar nombre de columna
    columnNameSpan.textContent = columnName;
    
    // Ocultar badge por defecto
    if (autoDetectedBadge) {
        autoDetectedBadge.classList.add('hidden');
    }
    
    // Cargar valores actuales si existen
    const currentScale = currentColumnConfig.escalas?.[columnName];
    if (currentScale) {
        minInput.value = currentScale.min;
        maxInput.value = currentScale.max;
        directionSelect.value = currentScale.direction || 'ascending';
    } else {
        // Intentar usar valores detectados automáticamente
        const analysis = window.columnAnalysis || {};
        const columnInfo = analysis[columnName];
        
        if (columnInfo?.scale) {
            // Usar escala detectada automáticamente
            minInput.value = columnInfo.scale.min;
            maxInput.value = columnInfo.scale.max;
            directionSelect.value = columnInfo.scale.direction || 'ascending';
            
            // Mostrar badge indicando detección automática
            if (autoDetectedBadge) {
                autoDetectedBadge.classList.remove('hidden');
            }
            
            console.log(`📏 Usando escala detectada para "${columnName}": ${columnInfo.scale.min}-${columnInfo.scale.max}`);
        } else {
            // Valores por defecto
            minInput.value = '1';
            maxInput.value = '5';
            directionSelect.value = 'ascending';
        }
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
