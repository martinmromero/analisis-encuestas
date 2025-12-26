// Variables globales
let currentResults = null;
let sentimentChart = null;
let categoryChart = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 50; // Limitar a 50 resultados por página
let filteredResults = [];
let filteredStats = null; // Guardar estadísticas filtradas

// Variables para gestión del diccionario
let currentDictionary = [];
let filteredDictionary = [];

// Event listeners cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('excelFile');
    const fileLabel = document.querySelector('.file-label');
    const analyzeBtn = document.querySelector('.analyze-btn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    // Manejar selección de archivo
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            fileLabel.classList.add('file-selected');
            fileLabel.querySelector('.file-text').textContent = file.name;
            analyzeBtn.disabled = false;
        } else {
            fileLabel.classList.remove('file-selected');
            fileLabel.querySelector('.file-text').textContent = 'Seleccionar archivo Excel';
            analyzeBtn.disabled = true;
        }
    });

    // Manejar envío del formulario
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        analyzeFile();
    });

    // Event listeners para exportación
    console.log('📝 Configurando exportación...');
    const exportCsvBtn = document.getElementById('exportCsv');
    console.log('exportCsv:', exportCsvBtn ? '✓' : '✗');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => exportResults('csv'));
    
    // Event listener para reporte avanzado XLSX
    console.log('📊 Configurando reporte avanzado...');
    const advancedReportBtn = document.getElementById('advancedReportBtn');
    console.log('advancedReportBtn:', advancedReportBtn ? '✓' : '✗');
    if (advancedReportBtn) {
        advancedReportBtn.addEventListener('click', function() {
            generateAdvancedReport();
        });
    }
    
    // Event listener para limpieza manual de memoria
    console.log('🧹 Configurando limpieza de memoria...');
    const cleanMemoryBtn = document.getElementById('cleanMemory');
    console.log('cleanMemory:', cleanMemoryBtn ? '✓' : '✗');
    if (cleanMemoryBtn) {
        cleanMemoryBtn.addEventListener('click', () => {
            cleanupMemory();
            alert('✅ Memoria limpiada exitosamente');
        });
    }

    // Event listeners para navegación entre secciones
    console.log('🔧 Agregando event listeners para navegación...');
    const analysisTab = document.getElementById('analysisTab');
    const columnConfigTab = document.getElementById('columnConfigTab');
    const dictionaryTab = document.getElementById('dictionaryTab');
    const comparisonTab = document.getElementById('comparisonTab');
    
    if (!analysisTab) console.error('❌ analysisTab no encontrado');
    if (!columnConfigTab) console.error('❌ columnConfigTab no encontrado');
    if (!dictionaryTab) console.error('❌ dictionaryTab no encontrado');
    if (!comparisonTab) console.error('❌ comparisonTab no encontrado');
    
    if (analysisTab) {
        analysisTab.addEventListener('click', () => {
            console.log('👆 Click en analysisTab');
            showSection('analysis');
        });
    }
    
    if (columnConfigTab) {
        columnConfigTab.addEventListener('click', () => {
            console.log('👆 Click en columnConfigTab');
            showSection('columnConfig');
        });
    }
    
    if (dictionaryTab) {
        dictionaryTab.addEventListener('click', () => {
            console.log('👆 Click en dictionaryTab');
            showSection('dictionary');
        });
    }
    
    if (comparisonTab) {
        comparisonTab.addEventListener('click', () => {
            console.log('👆 Click en comparisonTab');
            showSection('comparison');
        });
    }

    // Event listeners para filtros avanzados
    const applyFilters = document.getElementById('applyFilters');
    const clearFilters = document.getElementById('clearFilters');
    if (applyFilters) applyFilters.addEventListener('click', filterResults);
    if (clearFilters) clearFilters.addEventListener('click', clearAdvancedFilters);

    // Event listeners para gestión del diccionario
    const refreshDictionary = document.getElementById('refreshDictionary');
    const sentimentFilter = document.getElementById('sentimentFilter');
    const wordSearch = document.getElementById('wordSearch');
    if (refreshDictionary) refreshDictionary.addEventListener('click', loadDictionary);
    if (sentimentFilter) sentimentFilter.addEventListener('change', filterDictionary);
    if (wordSearch) wordSearch.addEventListener('input', filterDictionary);
    
    // Event listener para el slider de puntuación
    const sentimentScore = document.getElementById('sentimentScore');
    if (sentimentScore) sentimentScore.addEventListener('input', updateScoreDisplay);
    
    // Event listeners para entrenamiento
    const addWord = document.getElementById('addWord');
    const testWord = document.getElementById('testWord');
    if (addWord) addWord.addEventListener('click', addWordToDictionary);
    if (testWord) testWord.addEventListener('click', testWordAnalysis);
    
    // Event listeners para gestión de archivos
    const exportDictionaryBtn = document.getElementById('exportDictionary');
    const importDictionaryBtn = document.getElementById('importDictionary');
    const dictionaryFileInput = document.getElementById('dictionaryFileInput');
    const resetDictionaryBtn = document.getElementById('resetDictionary');
    const activeDictionarySelect = document.getElementById('activeDictionarySelect');
    const deleteDictionaryBtn = document.getElementById('deleteDictionary');
    
    if (exportDictionaryBtn) exportDictionaryBtn.addEventListener('click', exportDictionary);
    if (importDictionaryBtn) {
        importDictionaryBtn.addEventListener('click', () => {
            if (dictionaryFileInput) dictionaryFileInput.click();
        });
    }
    if (dictionaryFileInput) dictionaryFileInput.addEventListener('change', importDictionary);
    if (resetDictionaryBtn) resetDictionaryBtn.addEventListener('click', resetDictionary);
    
    // Event listeners para gestión de diccionarios
    if (activeDictionarySelect) {
        activeDictionarySelect.addEventListener('change', (e) => {
            activateDictionary(e.target.value);
        });
    }
    if (deleteDictionaryBtn) {
        deleteDictionaryBtn.addEventListener('click', deleteDictionary);
    }
    
    // Cargar diccionarios disponibles al inicio
    loadAvailableDictionaries();
    
    // Actualizar indicador de diccionario activo
    updateActiveDictionaryIndicator();

    // Inicializar display del score
    if (typeof updateScoreDisplay === 'function') {
        updateScoreDisplay();
    }

    // Event listeners para filtros de resultados
    const filterSentimentSelect = document.getElementById('filterSentiment');
    const searchTextInput = document.getElementById('searchText');
    if (filterSentimentSelect) filterSentimentSelect.addEventListener('change', filterResults);
    if (searchTextInput) searchTextInput.addEventListener('input', filterResults);
    
    console.log('✅ Event listeners configurados correctamente');
});

// Función para analizar el archivo
async function analyzeFile() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor selecciona un archivo Excel');
        return;
    }

    // Obtener configuración de columnas actual
    const columnConfig = window.getCurrentColumnConfig ? window.getCurrentColumnConfig() : null;
    
    // Esta validación ya no es necesaria porque el botón está deshabilitado
    // pero la dejamos por seguridad
    if (!columnConfig || !columnConfig.name) {
        return; // El botón debería estar deshabilitado
    }
    
    // Obtener motor seleccionado
    const selectedEngine = document.querySelector('input[name="analysisEngine"]:checked').value;
    console.log('Motor seleccionado:', selectedEngine);
    console.log('Configuración de columnas:', columnConfig);

    const formData = new FormData();
    formData.append('excelFile', file);
    
    // Agregar configuración de columnas
    formData.append('columnConfig', JSON.stringify(columnConfig));

    try {
        // Limpiar análisis anterior para liberar memoria
        cleanupMemory();
        
        // Mostrar loading con información del motor
        showLoading(selectedEngine);

        // Elegir endpoint según el motor seleccionado
        let endpoint, body;
        
        if (selectedEngine === 'both') {
            // Para análisis dual, necesitamos crear un endpoint especial para archivos
            endpoint = '/api/analyze-dual-file';
            body = formData;
        } else {
            endpoint = '/api/analyze-with-engine';
            formData.append('engine', selectedEngine);
            body = formData;
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            body: body
        });

        const data = await response.json();

        if (data.success) {
            currentResults = data;
            // Guardar el nombre del archivo original
            currentResults.originalFilename = file.name;
            displayResults(data);
        } else {
            throw new Error(data.error || 'Error procesando el archivo');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error: ' + error.message);
    } finally {
        hideLoading();
    }
}

// Mostrar indicador de carga
function showLoading(selectedEngine = 'natural') {
    const loading = document.getElementById('loading');
    const loadingText = loading.querySelector('p');
    
    // Personalizar mensaje según el motor
    let message = 'Procesando archivo y analizando sentimientos...';
    
    switch (selectedEngine) {
        case 'natural':
            message = '🧠 Analizando con Natural.js Enhanced (894 palabras españolas)...';
            break;
        case 'nlpjs':
            message = '🚀 Analizando con NLP.js (Motor de IA avanzado)...';
            break;
        case 'both':
            message = '⚖️ Analizando con ambos motores para máxima precisión...';
            break;
    }
    
    loadingText.textContent = message;
    loading.classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
}

// Ocultar indicador de carga
function hideLoading() {
    document.getElementById('loading').classList.add('hidden');
}

// Mostrar resultados
function displayResults(data) {
    // Actualizar estadísticas
    const totalElement = document.getElementById('totalResponses');
    if (totalElement) totalElement.textContent = data.totalResponses;
    
    const quantElement = document.getElementById('quantitativeResponses');
    if (quantElement) quantElement.textContent = data.quantitativeResponses || 0;
    
    // Verificar que statistics existe y tiene averageScore (0-10)
    const averageScore = data.statistics && typeof data.statistics.averageScore === 'number' 
        ? data.statistics.averageScore 
        : 5;
    
    // Aplicar clase de color según el score
    const scoreElement = document.getElementById('averageScore');
    if (scoreElement) {
        const scoreCard = scoreElement.closest('.stat-card');
        
        if (scoreCard) {
            // Remover clases previas
            scoreCard.classList.remove('score-high', 'score-medium', 'score-low');
            
            // Aplicar nueva clase según valor
            if (averageScore >= 8) {
                scoreCard.classList.add('score-high');
            } else if (averageScore >= 6) {
                scoreCard.classList.add('score-medium');
            } else {
                scoreCard.classList.add('score-low');
            }
        }
        
        scoreElement.textContent = averageScore.toFixed(2);
    }
    
    // Verificar que percentages existen
    const percentages = data.statistics?.percentages || {
        'Muy Positivo': 0,
        'Positivo': 0,
        'Neutral': 0,
        'Negativo': 0,
        'Muy Negativo': 0
    };
    
    const positivePercent = parseFloat(percentages['Muy Positivo'] || 0) + 
                          parseFloat(percentages['Positivo'] || 0);
    const neutralPercent = parseFloat(percentages['Neutral'] || 0);
    const negativePercent = parseFloat(percentages['Muy Negativo'] || 0) + 
                          parseFloat(percentages['Negativo'] || 0);
    
    const posElement = document.getElementById('positivePercent');
    if (posElement) posElement.textContent = positivePercent.toFixed(1) + '%';
    
    const neuElement = document.getElementById('neutralPercent');
    if (neuElement) neuElement.textContent = neutralPercent.toFixed(1) + '%';
    
    const negElement = document.getElementById('negativePercent');
    if (negElement) negElement.textContent = negativePercent.toFixed(1) + '%';
    
    // Mostrar motor utilizado
    const engineIcon = document.getElementById('engineIcon');
    const usedEngine = document.getElementById('usedEngine');
    
    if (engineIcon && usedEngine) {
        if (data.engine) {
            switch (data.engine) {
                case 'natural':
                    engineIcon.textContent = '🧠';
                    usedEngine.textContent = 'Natural.js Enhanced';
                    break;
                case 'nlpjs':
                    engineIcon.textContent = '🚀';
                    usedEngine.textContent = 'NLP.js (AXA)';
                    break;
                case 'both':
                    engineIcon.textContent = '⚖️';
                    usedEngine.textContent = 'Análisis Dual';
                    break;
                default:
                    engineIcon.textContent = '🤖';
                    usedEngine.textContent = 'Motor por defecto';
            }
        } else {
            // Para compatibility con resultados de comparación
            engineIcon.textContent = '🤖';
            usedEngine.textContent = 'Natural.js Enhanced';
        }
    }

    // Crear gráficos con estadísticas del backend
    createSentimentChart(data.statistics);
    createCategoryChart(data.statistics);
    
    // RECALCULAR estadísticas usando la misma función que usa el filtrado
    // para garantizar consistencia entre datos sin filtrar y filtrados
    filteredStats = calculateFilteredStats(data.results);
    
    // Actualizar las tarjetas con las estadísticas recalculadas
    updateStatsCards(data.results, filteredStats);

    // Calcular y mostrar métricas numéricas si hay filterOptions
    if (data.filterOptions) {
        displayNumericMetrics(data.results, data.filterOptions);
        // Inicializar filtros en cascada
        if (typeof initCascadeFilters === 'function') {
            initCascadeFilters(data.filterOptions, data.results);
        }
    }

    // Inicializar filteredResults y mostrar tabla de resultados
    filteredResults = data.results.slice(); // Copia superficial
    currentPage = 1; // Resetear página
    displayResultsTable(filteredResults);

    // Mostrar sección de resultados
    document.getElementById('results').classList.remove('hidden');
    
    // Scroll suave hacia los resultados
    document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

// Crear gráfico de distribución de sentimientos
function createSentimentChart(statistics) {
    if (!statistics || !statistics.classifications) {
        console.warn('No hay datos de clasificaciones para el gráfico de sentimientos');
        return;
    }
    
    const ctx = document.getElementById('sentimentChart')?.getContext('2d');
    if (!ctx) {
        console.warn('No se encontró el canvas sentimentChart');
        return;
    }
    
    // Destruir gráfico anterior completamente si existe
    if (sentimentChart) {
        sentimentChart.destroy();
        sentimentChart = null;
    }

    const labels = Object.keys(statistics.classifications);
    const data = Object.values(statistics.classifications);
    const colors = [
        '#28a745', // Muy Positivo
        '#17a2b8', // Positivo
        '#6c757d', // Neutral
        '#fd7e14', // Negativo
        '#dc3545'  // Muy Negativo
    ];

    // Configurar canvas con tamaño fijo
    ctx.canvas.width = 400;
    ctx.canvas.height = 300;
    ctx.canvas.style.width = '400px';
    ctx.canvas.style.height = '300px';

    sentimentChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false, // Desactivar animaciones para evitar memory leaks
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.parsed;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Crear gráfico de categorías (barras)
function createCategoryChart(statistics) {
    if (!statistics || !statistics.percentages) {
        console.warn('No hay datos de porcentajes para el gráfico de categorías');
        return;
    }
    
    const ctx = document.getElementById('categoryChart')?.getContext('2d');
    if (!ctx) {
        console.warn('No se encontró el canvas categoryChart');
        return;
    }
    
    // Destruir gráfico anterior completamente si existe
    if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
    }

    const labels = Object.keys(statistics.percentages);
    const data = Object.values(statistics.percentages).map(p => parseFloat(p));
    const colors = [
        '#28a745', // Muy Positivo
        '#17a2b8', // Positivo
        '#6c757d', // Neutral
        '#fd7e14', // Negativo
        '#dc3545'  // Muy Negativo
    ];

    // Configurar canvas con tamaño fijo
    ctx.canvas.width = 400;
    ctx.canvas.height = 300;
    ctx.canvas.style.width = '400px';
    ctx.canvas.style.height = '300px';

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Porcentaje',
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: false,
            maintainAspectRatio: false,
            animation: false, // Desactivar animaciones para evitar memory leaks
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}

// Mostrar tabla de resultados con paginación
function displayResultsTable(results) {
    const tbody = document.querySelector('#resultsTable tbody');
    
    // Limpiar contenido anterior
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }

    // Calcular paginación
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, results.length);
    const paginatedResults = results.slice(startIndex, endIndex);

    // Crear fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();

    paginatedResults.forEach(result => {
        const row = document.createElement('tr');
        
        // Obtener el primer texto significativo de forma segura
        const mainText = result.sentiment && result.sentiment.details && result.sentiment.details.length > 0 ? 
                        result.sentiment.details[0].text : 
                        (result.originalData ? Object.values(result.originalData)[0] : null) || 'Sin texto';

        // Obtener palabras positivas y negativas de forma segura
        const positiveWords = result.sentiment && result.sentiment.details ? 
                             result.sentiment.details.flatMap(d => d.positive || []).join(', ') : '';
        const negativeWords = result.sentiment && result.sentiment.details ? 
                             result.sentiment.details.flatMap(d => d.negative || []).join(', ') : '';

        row.innerHTML = `
            <td>${result.id}</td>
            <td>
                <div class="text-truncate" title="${mainText}">
                    ${mainText}
                </div>
            </td>
            <td>
                <span class="sentiment-badge sentiment-${(result.sentiment.classification || 'neutral').toLowerCase().replace(' ', '-')}">
                    ${result.sentiment.classification || 'Neutral'}
                </span>
            </td>
            <td>${(result.sentiment.score || 5).toFixed(2)}</td>
            <td>
                <div class="confidence-indicator">
                    <span class="confidence-value">${((result.sentiment.confidence || 0.5) * 100).toFixed(0)}%</span>
                    <div class="confidence-bar">
                        <div class="confidence-fill" style="width: ${((result.sentiment.confidence || 0.5) * 100)}%"></div>
                    </div>
                </div>
            </td>
            <td class="words-list positive-words">${positiveWords || '-'}</td>
            <td class="words-list negative-words">${negativeWords || '-'}</td>
        `;
        
        fragment.appendChild(row);
    });

    // Agregar todas las filas de una vez
    tbody.appendChild(fragment);
    
    // Actualizar controles de paginación
    updatePaginationControls(results.length);
}

// Función para actualizar controles de paginación
function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    
    // Buscar o crear contenedor de paginación
    let paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) {
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination';
        paginationContainer.className = 'pagination-container';
        document.querySelector('.table-container').appendChild(paginationContainer);
    }
    
    // Limpiar controles anteriores
    paginationContainer.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Crear controles de paginación
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'pagination-info';
    paginationInfo.innerHTML = `
        <span>Página ${currentPage} de ${totalPages} (${totalItems} resultados)</span>
    `;
    
    const paginationControls = document.createElement('div');
    paginationControls.className = 'pagination-controls';
    
    // Botón anterior
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Anterior';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => changePage(currentPage - 1);
    
    // Botón siguiente
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Siguiente →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => changePage(currentPage + 1);
    
    // Input para ir a página específica
    const pageInput = document.createElement('input');
    pageInput.type = 'number';
    pageInput.min = 1;
    pageInput.max = totalPages;
    pageInput.value = currentPage;
    pageInput.onchange = (e) => changePage(parseInt(e.target.value));
    
    paginationControls.appendChild(prevBtn);
    paginationControls.appendChild(pageInput);
    paginationControls.appendChild(nextBtn);
    
    paginationContainer.appendChild(paginationInfo);
    paginationContainer.appendChild(paginationControls);
}

// Función para cambiar página
function changePage(newPage) {
    currentPage = newPage;
    displayResultsTable(filteredResults);
}

// Función para calcular y mostrar métricas numéricas
function displayNumericMetrics(results, filterOptions) {
    const container = document.getElementById('numericMetricsContainer');
    if (!container) {
        console.warn('⚠️ Container numericMetricsContainer no encontrado');
        return;
    }

    // Obtener columnas numéricas del servidor
    const numericColumns = filterOptions.numericQuestions || [];
    
    console.log('📊 Columnas numéricas recibidas:', numericColumns.length);
    
    if (numericColumns.length === 0) {
        container.style.display = 'none';
        return;
    }

    // Obtener escalas de la configuración actual
    const columnConfig = window.getCurrentColumnConfig ? window.getCurrentColumnConfig() : {};
    const escalas = columnConfig.escalas || {};

    // Calcular promedios para cada columna numérica
    const metrics = numericColumns.map(column => {
        // Obtener valores y extraer números si tienen formato "1. Opción"
        const values = results
            .map(row => {
                // Buscar en numericMetrics, originalData o directamente
                let val = row.numericMetrics?.[column] || row.originalData?.[column] || row[column];
                if (typeof val === 'string') {
                    // Extraer número si tiene formato "1. Texto" o "5. Opción"
                    const match = val.match(/^(\d+)\s*[.\-:)]/);
                    if (match) {
                        val = parseInt(match[1]);
                    } else {
                        val = parseFloat(val);
                    }
                } else {
                    val = parseFloat(val);
                }
                return val;
            })
            .filter(val => !isNaN(val) && val > 0);
        
        const avg = values.length > 0 
            ? values.reduce((sum, val) => sum + val, 0) / values.length 
            : 0;

        // Determinar escala real (de metadata o inferida de valores)
        let escala = escalas[column];
        if (!escala && values.length > 0) {
            // Inferir escala de los valores presentes
            const min = Math.min(...values);
            const max = Math.max(...values);
            escala = { min, max };
        }

        return { 
            column, 
            avg, 
            count: values.length,
            escala: escala || { min: 1, max: 10 } // Default 1-10
        };
    });

    console.log('📊 Métricas calculadas:', metrics.length);

    // Actualizar solo el grid, no todo el container
    const metricsGrid = document.getElementById('metricsGrid');
    if (metricsGrid) {
        metricsGrid.innerHTML = metrics.map(metric => {
            // Normalizar score según la escala real y dirección (0-10)
            const range = metric.escala.max - metric.escala.min;
            let normalizedAvg;
            
            if (range > 0) {
                // Calcular normalizado base (0-10)
                normalizedAvg = ((metric.avg - metric.escala.min) / range) * 10;
                
                // Si la escala es descendente, invertir (5=malo, 1=bueno)
                if (metric.escala.direction === 'descending') {
                    normalizedAvg = 10 - normalizedAvg;
                }
            } else {
                normalizedAvg = metric.avg;
            }
            
            const scoreClass = normalizedAvg >= 8 ? 'score-high' : 
                              normalizedAvg >= 6 ? 'score-medium' : 'score-low';
            
            const directionIcon = metric.escala.direction === 'descending' ? '⬇️' : '⬆️';
            const directionLabel = metric.escala.direction === 'descending' ? 'Descendente' : 'Ascendente';
            
            const scaleLabel = metric.escala.min !== 1 || metric.escala.max !== 10
                ? `<div class="scale-info" style="font-size: 0.85em; color: #666;">Escala: ${metric.escala.min}-${metric.escala.max} ${directionIcon}</div>`
                : '';
            
            return `
                <div class="metric-card ${scoreClass}">
                    <h4>${metric.column}</h4>
                    <div class="metric-value">${metric.avg.toFixed(2)}</div>
                    <div class="metric-label">Promedio (${metric.count} respuestas)</div>
                    ${scaleLabel}
                </div>
            `;
        }).join('');
    }
    
    // Hacer visible el container
    container.style.display = 'block';
    console.log('✅ Métricas numéricas mostradas');
}

// Filtrar resultados optimizado
function filterResults() {
    if (!currentResults) return;

    const sentimentFilter = document.getElementById('filterSentiment').value;
    const searchText = document.getElementById('searchText').value.toLowerCase();

    // Obtener filtros avanzados
    const carrera = document.getElementById('filterCarrera')?.value || '';
    const materia = document.getElementById('filterMateria')?.value || '';
    const modalidad = document.getElementById('filterModalidad')?.value || '';
    const sede = document.getElementById('filterSede')?.value || '';
    const docente = document.getElementById('filterDocente')?.value || '';

    // Resetear página al filtrar
    currentPage = 1;

    // Usar resultados originales como base
    filteredResults = currentResults.results.slice(); // Copia superficial

    // Filtrar por sentimiento
    if (sentimentFilter) {
        filteredResults = filteredResults.filter(result => 
            result.sentiment.classification === sentimentFilter
        );
    }

    // Filtrar por texto (optimizado)
    if (searchText) {
        filteredResults = filteredResults.filter(result => {
            // Buscar en el primer detalle de forma segura
            const mainText = result.sentiment && result.sentiment.details && result.sentiment.details.length > 0 
                ? (result.sentiment.details[0].text || '').toLowerCase()
                : '';
            return mainText.includes(searchText);
        });
    }

    // Filtros avanzados
    if (carrera) {
        filteredResults = filteredResults.filter(result => 
            (result.originalData?.CARRERA || result.CARRERA) === carrera
        );
    }
    if (materia) {
        filteredResults = filteredResults.filter(result => 
            (result.originalData?.MATERIA || result.MATERIA) === materia
        );
    }
    if (modalidad) {
        filteredResults = filteredResults.filter(result => 
            (result.originalData?.MODALIDAD || result.MODALIDAD) === modalidad
        );
    }
    if (sede) {
        filteredResults = filteredResults.filter(result => 
            (result.originalData?.SEDE || result.SEDE) === sede
        );
    }
    if (docente) {
        filteredResults = filteredResults.filter(result => 
            (result.originalData?.DOCENTE || result.DOCENTE) === docente
        );
    }

    // Recalcular métricas con resultados filtrados
    if (currentResults.filterOptions) {
        displayNumericMetrics(filteredResults, currentResults.filterOptions);
    }

    // Recalcular estadísticas con resultados filtrados
    filteredStats = calculateFilteredStats(filteredResults);
    
    // Actualizar gráficos con nuevas estadísticas
    createSentimentChart(filteredStats);
    createCategoryChart(filteredStats);
    
    // Actualizar estadísticas en las tarjetas
    updateStatsCards(filteredResults, filteredStats);

    displayResultsTable(filteredResults);
}

// Calcular estadísticas de resultados filtrados
function calculateFilteredStats(results) {
    const classifications = {
        'Muy Positivo': 0,
        'Positivo': 0,
        'Neutral': 0,
        'Negativo': 0,
        'Muy Negativo': 0
    };

    let totalScore = 0;
    let scoreCount = 0;

    // Función auxiliar para obtener clasificación si no existe
    function getClassification(score) {
        if (score >= 8) return 'Muy Positivo';
        if (score >= 6) return 'Positivo';
        if (score >= 4 && score < 6) return 'Neutral';
        if (score >= 2) return 'Negativo';
        return 'Muy Negativo';
    }
    
    // Solo contar registros con análisis de texto (como en el servidor)
    results.forEach(result => {
        if (result.sentiment && result.sentiment.details && result.sentiment.details.length > 0) {
            // SIEMPRE usar perColumnAvgScore que está normalizado a 0-10
            // Si no existe, normalizarlo desde overallScore/analyzedColumns + 5
            let score = result.sentiment.perColumnAvgScore;
            
            // Validar que perColumnAvgScore existe y es válido
            if (typeof score !== 'number' || isNaN(score)) {
                // Fallback: normalizar desde overallScore si es necesario
                const rawAvg = result.sentiment.analyzedColumns > 0 
                    ? result.sentiment.overallScore / result.sentiment.analyzedColumns 
                    : 0;
                // Normalizar con la misma fórmula del backend: mapear [-10,10] a [0,10]
                const clampedScore = Math.max(-10, Math.min(10, rawAvg));
                score = (clampedScore + 10) / 2;
                console.warn('perColumnAvgScore faltante, recalculado:', score, 'para resultado', result.id);
            }
            
            const classification = result.sentiment.classification || getClassification(score);
            
            if (classification) {
                classifications[classification]++;
            }
            
            if (typeof score === 'number' && !isNaN(score)) {
                totalScore += score;
                scoreCount++;
            }
        }
    });

    const total = scoreCount > 0 ? scoreCount : 1; // Base = registros con análisis
    const percentages = {};
    Object.keys(classifications).forEach(key => {
        percentages[key] = total > 0 ? ((classifications[key] / total) * 100).toFixed(1) : '0.0';
    });

    // Los perColumnAvgScore ya están normalizados a 0-10 por el servidor
    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 5; // 5 = neutral

    return {
        classifications,
        percentages,
        averageScore: parseFloat(averageScore.toFixed(2)), // Escala 0-10
        totalResults: scoreCount
    };
}

// Actualizar tarjetas de estadísticas
function updateStatsCards(results, stats) {
    // Actualizar total de respuestas filtradas
    const totalElement = document.getElementById('totalResponses');
    if (totalElement) totalElement.textContent = results.length;
    
    // Contar respuestas cualitativas (con análisis de texto)
    const qualitativeCount = results.filter(row => {
        return row.sentiment && row.sentiment.details && row.sentiment.details.length > 0;
    }).length;
    const quantElement = document.getElementById('quantitativeResponses');
    if (quantElement) quantElement.textContent = qualitativeCount;
    
    // El score ya viene calculado del servidor o de calculateFilteredStats
    // Para mantener consistencia, usamos el mismo valor sin normalizar
    const scoreValue = stats.averageScore;
    
    // Aplicar clase de color según el score normalizado
    const scoreElement = document.getElementById('averageScore');
    if (scoreElement) {
        const scoreCard = scoreElement.closest('.stat-card');
        
        if (scoreCard) {
            // Remover clases previas
            scoreCard.classList.remove('score-high', 'score-medium', 'score-low');
            
            // Aplicar nueva clase según valor (el servidor ya normaliza a 0-10)
            if (scoreValue >= 8) {
                scoreCard.classList.add('score-high');
            } else if (scoreValue >= 6) {
                scoreCard.classList.add('score-medium');
            } else {
                scoreCard.classList.add('score-low');
            }
        }
        
        scoreElement.textContent = scoreValue.toFixed(2);
    }
    
    const positivePercent = parseFloat(stats.percentages['Muy Positivo'] || 0) + 
                          parseFloat(stats.percentages['Positivo'] || 0);
    const neutralPercent = parseFloat(stats.percentages['Neutral'] || 0);
    const negativePercent = parseFloat(stats.percentages['Muy Negativo'] || 0) + 
                          parseFloat(stats.percentages['Negativo'] || 0);
    
    const posElement = document.getElementById('positivePercent');
    if (posElement) posElement.textContent = positivePercent.toFixed(1) + '%';
    
    const neuElement = document.getElementById('neutralPercent');
    if (neuElement) neuElement.textContent = neutralPercent.toFixed(1) + '%';
    
    const negElement = document.getElementById('negativePercent');
    if (negElement) negElement.textContent = negativePercent.toFixed(1) + '%';
}

// Función para limpiar filtros avanzados
function clearAdvancedFilters() {
    document.getElementById('filterCarrera').value = '';
    document.getElementById('filterMateria').value = '';
    document.getElementById('filterModalidad').value = '';
    document.getElementById('filterSede').value = '';
    document.getElementById('filterDocente').value = '';
    document.getElementById('filterSentiment').value = '';
    document.getElementById('searchText').value = '';
    
    // Repoblar filtros en cascada si existe la función
    if (typeof updateDependentFilters === 'function') {
        updateDependentFilters();
    }
    
    // Aplicar filtros para volver a totales absolutos
    filterResults();
}

// Exportar resultados
async function exportResults(format) {
    if (!currentResults) {
        alert('No hay resultados para exportar');
        return;
    }

    try {
        const response = await fetch('/api/export', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: currentResults,
                format: format
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `analisis-resultados.${format}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            throw new Error('Error exportando archivo');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error exportando archivo: ' + error.message);
    }
}

// Función para limpiar memoria agresivamente
function cleanupMemory() {
    console.log('🧹 Limpiando memoria...');
    
    // Destruir gráficos completamente
    if (sentimentChart) {
        try {
            sentimentChart.destroy();
        } catch (e) {
            console.warn('Error destruyendo sentimentChart:', e);
        }
        sentimentChart = null;
    }
    if (categoryChart) {
        try {
            categoryChart.destroy();
        } catch (e) {
            console.warn('Error destruyendo categoryChart:', e);
        }
        categoryChart = null;
    }
    
    // Limpiar canvas manualmente
    const canvases = document.querySelectorAll('#sentimentChart, #categoryChart');
    canvases.forEach(canvas => {
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
            // Restaurar tamaño original
            canvas.width = 400;
            canvas.height = 300;
            canvas.style.width = '400px';
            canvas.style.height = '300px';
        }
    });
    
    // Limpiar datos grandes
    currentResults = null;
    filteredResults = [];
    filteredStats = null;
    
    // Limpiar tabla
    const tbody = document.querySelector('#resultsTable tbody');
    if (tbody) {
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
    }
    
    // Limpiar controles de paginación
    const pagination = document.getElementById('pagination');
    if (pagination) {
        pagination.innerHTML = '';
    }
    
    console.log('✅ Memoria limpiada');
}

// Nota: Eliminamos el resize listener para evitar el bug de crecimiento infinito
// Los gráficos ahora tienen tamaño fijo y no necesitan redimensionarse

// Limpiar memoria al salir de la página
window.addEventListener('beforeunload', cleanupMemory);

// Monitoreo de memoria cada 30 segundos
setInterval(() => {
    if (performance.memory) {
        const memoryMB = Math.round(performance.memory.usedJSHeapSize / 1048576);
        console.log(`📊 Memoria en uso: ${memoryMB} MB`);
        
        // Si usa más de 200MB, limpiar automáticamente
        if (memoryMB > 200) {
            console.warn('⚠️ Memoria alta detectada, limpiando...');
            cleanupMemory();
        }
    }
}, 30000); // Cada 30 segundos

// ============= FUNCIONES PARA GESTIÓN DEL DICCIONARIO =============

// Mostrar sección específica
function showSection(sectionName) {
    console.log('🔍 Cambiando a sección:', sectionName);
    
    // Verificar que las secciones existen
    const analysisSection = document.getElementById('analysisSection');
    const columnConfigSection = document.getElementById('columnConfigSection');
    const dictionarySection = document.getElementById('dictionarySection');
    const comparisonSection = document.getElementById('comparisonSection');
    const resultsSection = document.getElementById('results');
    
    // Elementos específicos a ocultar/mostrar
    const chartsContainer = document.getElementById('chartsContainer');
    const numericMetricsContainer = document.getElementById('numericMetricsContainer');
    const detailedResultsTable = document.getElementById('detailedResultsTable');
    
    if (!analysisSection) console.error('❌ analysisSection no encontrada');
    if (!columnConfigSection) console.error('❌ columnConfigSection no encontrada');
    if (!dictionarySection) console.error('❌ dictionarySection no encontrada');
    if (!comparisonSection) console.error('❌ comparisonSection no encontrada');
    
    // Ocultar todas las secciones
    if (analysisSection) analysisSection.classList.add('hidden');
    if (columnConfigSection) columnConfigSection.classList.add('hidden');
    if (dictionarySection) dictionarySection.classList.add('hidden');
    if (comparisonSection) comparisonSection.classList.add('hidden');
    
    // Remover clase active de todas las pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    // Mostrar sección seleccionada
    if (sectionName === 'analysis') {
        if (analysisSection) {
            analysisSection.classList.remove('hidden');
            document.getElementById('analysisTab')?.classList.add('active');
            // Mostrar todos los elementos en análisis
            if (chartsContainer) chartsContainer.style.display = '';
            if (numericMetricsContainer) numericMetricsContainer.style.display = '';
            if (detailedResultsTable) detailedResultsTable.style.display = '';
            console.log('✅ Sección de análisis mostrada');
        }
    } else if (sectionName === 'columnConfig') {
        if (columnConfigSection) {
            columnConfigSection.classList.remove('hidden');
            document.getElementById('columnConfigTab')?.classList.add('active');
            // Ocultar gráficos, métricas y tabla
            if (chartsContainer) chartsContainer.style.display = 'none';
            if (numericMetricsContainer) numericMetricsContainer.style.display = 'none';
            if (detailedResultsTable) detailedResultsTable.style.display = 'none';
            console.log('✅ Sección de configuración de columnas mostrada');
        }
    } else if (sectionName === 'dictionary') {
        if (dictionarySection) {
            dictionarySection.classList.remove('hidden');
            document.getElementById('dictionaryTab')?.classList.add('active');
            // Ocultar gráficos, métricas y tabla en pestaña de diccionario
            if (chartsContainer) chartsContainer.style.display = 'none';
            if (numericMetricsContainer) numericMetricsContainer.style.display = 'none';
            if (detailedResultsTable) detailedResultsTable.style.display = 'none';
            console.log('✅ Sección de diccionario mostrada');
            loadDictionary().catch(error => {
                console.error('❌ Error cargando diccionario:', error);
                alert('Error al cargar el diccionario: ' + error.message);
            });
        }
    } else if (sectionName === 'comparison') {
        if (comparisonSection) {
            comparisonSection.classList.remove('hidden');
            document.getElementById('comparisonTab')?.classList.add('active');
            // Ocultar gráficos, métricas y tabla en pestaña de comparación
            if (chartsContainer) chartsContainer.style.display = 'none';
            if (numericMetricsContainer) numericMetricsContainer.style.display = 'none';
            if (detailedResultsTable) detailedResultsTable.style.display = 'none';
            console.log('✅ Sección de comparación mostrada');
            initializeComparison().catch(error => {
                console.error('❌ Error inicializando comparación:', error);
                alert('Error al cargar comparación de motores: ' + error.message);
            });
        }
    }
}

// Cargar diccionario desde el servidor
async function loadDictionary() {
    try {
        const response = await fetch('/api/dictionary');
        const data = await response.json();
        
        if (data.success) {
            currentDictionary = data.dictionary;
            filteredDictionary = [...currentDictionary];
            
            // Actualizar estadísticas
            updateDictionaryStats(data.stats);
            
            // Mostrar diccionario
            displayDictionary(filteredDictionary);
        } else {
            throw new Error(data.error || 'Error cargando diccionario');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error cargando diccionario: ' + error.message);
    }
}

// Actualizar estadísticas del diccionario
function updateDictionaryStats(stats) {
    document.getElementById('totalWords').textContent = stats.total;
    document.getElementById('positiveWords').textContent = stats.positive;
    document.getElementById('negativeWords').textContent = stats.negative;
    document.getElementById('neutralWords').textContent = stats.neutral;
}

// Mostrar diccionario en tabla
function displayDictionary(dictionary) {
    const tbody = document.querySelector('#dictionaryTable tbody');
    
    // Limpiar tabla
    while (tbody.firstChild) {
        tbody.removeChild(tbody.firstChild);
    }
    
    // Crear fragment para mejor rendimiento
    const fragment = document.createDocumentFragment();
    
    dictionary.forEach(item => {
        const row = document.createElement('tr');
        
        // Determinar clase CSS para la puntuación
        let scoreClass = 'neutral';
        if (item.score > 0) scoreClass = 'positive';
        if (item.score < 0) scoreClass = 'negative';
        
        row.innerHTML = `
            <td><strong>${item.word}</strong></td>
            <td><span class="word-score ${scoreClass}">${item.score}</span></td>
            <td>${item.type.charAt(0).toUpperCase() + item.type.slice(1)}</td>
            <td><span class="word-origin">${item.origin === 'user' ? 'Usuario' : 'Sistema'}</span></td>
            <td class="word-actions">
                ${item.origin === 'user' ? 
                    `<button class="action-btn" onclick="editWord('${item.word}', ${item.score})" title="Editar">✏️</button>
                     <button class="action-btn" onclick="deleteWord('${item.word}')" title="Eliminar">🗑️</button>` 
                    : 
                    `<button class="action-btn" onclick="testSingleWord('${item.word}')" title="Probar">🧪</button>`
                }
            </td>
        `;
        
        fragment.appendChild(row);
    });
    
    tbody.appendChild(fragment);
}

// Filtrar diccionario
function filterDictionary() {
    const sentimentFilter = document.getElementById('sentimentFilter').value;
    const searchText = document.getElementById('wordSearch').value.toLowerCase();
    
    filteredDictionary = currentDictionary.filter(item => {
        // Filtro por tipo de sentimiento
        const matchesSentiment = !sentimentFilter || item.type === sentimentFilter;
        
        // Filtro por texto
        const matchesText = !searchText || item.word.toLowerCase().includes(searchText);
        
        return matchesSentiment && matchesText;
    });
    
    displayDictionary(filteredDictionary);
}

// Actualizar display de puntuación
function updateScoreDisplay() {
    const score = document.getElementById('sentimentScore').value;
    const scoreValue = document.getElementById('scoreValue');
    const scoreLabel = document.getElementById('scoreLabel');
    
    scoreValue.textContent = score;
    
    // Actualizar etiqueta según la puntuación
    if (score > 2) {
        scoreLabel.textContent = 'Muy Positivo';
        scoreLabel.style.color = '#28a745';
    } else if (score > 0) {
        scoreLabel.textContent = 'Positivo';
        scoreLabel.style.color = '#17a2b8';
    } else if (score == 0) {
        scoreLabel.textContent = 'Neutral';
        scoreLabel.style.color = '#6c757d';
    } else if (score > -2) {
        scoreLabel.textContent = 'Negativo';
        scoreLabel.style.color = '#fd7e14';
    } else {
        scoreLabel.textContent = 'Muy Negativo';
        scoreLabel.style.color = '#dc3545';
    }
}

// Agregar palabra al diccionario
async function addWordToDictionary() {
    const word = document.getElementById('newWord').value.trim();
    const score = document.getElementById('sentimentScore').value;
    
    if (!word) {
        alert('Por favor ingresa una palabra o frase');
        return;
    }
    
    try {
        const response = await fetch('/api/dictionary/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ word, score: parseFloat(score) })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.message}`);
            document.getElementById('newWord').value = '';
            document.getElementById('sentimentScore').value = '0';
            updateScoreDisplay();
            loadDictionary(); // Recargar diccionario
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error agregando palabra: ' + error.message);
    }
}

// Probar análisis de palabra
async function testWordAnalysis() {
    const text = document.getElementById('newWord').value.trim();
    
    if (!text) {
        alert('Por favor ingresa una palabra o frase para probar');
        return;
    }
    
    try {
        const response = await fetch('/api/dictionary/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const resultDiv = document.getElementById('testResult');
            const outputDiv = resultDiv.querySelector('.test-output');
            
            outputDiv.innerHTML = `
                <div><strong>Texto:</strong> "${data.text}"</div>
                <div><strong>Puntuación:</strong> ${data.analysis.score}</div>
                <div><strong>Puntuación Comparativa:</strong> ${data.analysis.comparative}</div>
                <div><strong>Clasificación:</strong> ${data.classification}</div>
                <div><strong>Confianza:</strong> ${(data.analysis.confidence * 100).toFixed(1)}%</div>
                ${data.analysis.positive.length > 0 ? `<div><strong>Palabras Positivas:</strong> ${data.analysis.positive.join(', ')}</div>` : ''}
                ${data.analysis.negative.length > 0 ? `<div><strong>Palabras Negativas:</strong> ${data.analysis.negative.join(', ')}</div>` : ''}
            `;
            
            resultDiv.classList.remove('hidden');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error probando análisis: ' + error.message);
    }
}

// Eliminar palabra del diccionario
async function deleteWord(word) {
    if (!confirm(`¿Estás seguro de que quieres eliminar la palabra "${word}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/dictionary/remove/${encodeURIComponent(word)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.message}`);
            loadDictionary(); // Recargar diccionario
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error eliminando palabra: ' + error.message);
    }
}

// Editar palabra (rellenar formulario)
function editWord(word, score) {
    document.getElementById('newWord').value = word;
    document.getElementById('sentimentScore').value = score;
    updateScoreDisplay();
    
    // Scroll al formulario
    document.querySelector('.training-panel').scrollIntoView({ behavior: 'smooth' });
}

// Probar análisis de una sola palabra
async function testSingleWord(word) {
    try {
        const response = await fetch('/api/dictionary/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: word })
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`Análisis de "${word}":\nPuntuación: ${data.analysis.score}\nClasificación: ${data.classification}\nConfianza: ${(data.analysis.confidence * 100).toFixed(1)}%`);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error probando palabra: ' + error.message);
    }
}

// Exportar diccionario
async function exportDictionary() {
    try {
        const response = await fetch('/api/dictionary/export');
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diccionario-personalizado.json';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('✅ Diccionario exportado exitosamente');
        } else {
            throw new Error('Error exportando diccionario');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error exportando diccionario: ' + error.message);
    }
}

// Importar diccionario
async function importDictionary(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Solicitar nombre del diccionario
    const dictionaryName = prompt('Ingrese un nombre para este diccionario:', 
        file.name.replace(/\.(json|xlsx|xls)$/i, ''));
    
    if (!dictionaryName) {
        event.target.value = '';
        return;
    }
    
    const formData = new FormData();
    formData.append('dictionaryFile', file);
    formData.append('dictionaryName', dictionaryName);
    
    try {
        const response = await fetch('/api/dictionary/import', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.message}`);
            await loadAvailableDictionaries(); // Actualizar lista
            
            // Seleccionar automáticamente el diccionario recién importado
            const select = document.getElementById('activeDictionarySelect');
            if (select && data.fileName) {
                select.value = data.fileName;
                showNotification(`Diccionario "${data.dictionaryName}" está ahora activo`, 'success');
            }
            
            // Actualizar indicador visual
            await updateActiveDictionaryIndicator();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error importando diccionario: ' + error.message);
    }
    
    // Limpiar input
    event.target.value = '';
}

// Cargar diccionarios disponibles
async function loadAvailableDictionaries() {
    try {
        const response = await fetch('/api/dictionaries');
        const data = await response.json();
        
        const select = document.getElementById('activeDictionarySelect');
        if (!select) return;
        
        select.innerHTML = '';
        
        data.dictionaries.forEach(dict => {
            const option = document.createElement('option');
            option.value = dict.fileName;
            option.textContent = `${dict.name} (${dict.wordCount} palabras)`;
            select.appendChild(option);
        });
        
    } catch (error) {
        console.error('Error cargando diccionarios:', error);
    }
}

// Activar diccionario seleccionado
async function activateDictionary(fileName) {
    try {
        const response = await fetch('/api/dictionaries/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(data.message, 'success');
            // Actualizar indicador visual
            await updateActiveDictionaryIndicator();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error activando diccionario:', error);
        alert('Error activando diccionario: ' + error.message);
    }
}

// Eliminar diccionario
async function deleteDictionary() {
    const select = document.getElementById('activeDictionarySelect');
    if (!select) return;
    
    const fileName = select.value;
    
    if (fileName === 'base') {
        alert('No se puede eliminar el diccionario base');
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const dictName = selectedOption.textContent;
    
    if (!confirm(`¿Está seguro de eliminar el diccionario "${dictName}"?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/dictionaries/${fileName}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.message}`);
            await loadAvailableDictionaries();
            // Activar diccionario base
            select.value = 'base';
            await activateDictionary('base');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error eliminando diccionario:', error);
        alert('Error eliminando diccionario: ' + error.message);
    }
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    // Si existe un sistema de notificaciones, usarlo
    // Si no, usar console
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// Actualizar indicador de diccionario activo
async function updateActiveDictionaryIndicator() {
    try {
        const response = await fetch('/api/dictionaries/active');
        const data = await response.json();
        
        if (data.success && data.activeDictionary && data.activeDictionary.name) {
            const nameElement = document.getElementById('activeDictionaryName');
            const statsElement = document.getElementById('activeDictionaryStats');
            
            if (nameElement) {
                nameElement.textContent = data.activeDictionary.name;
            }
            
            if (statsElement) {
                // Siempre mostrar solo el total de palabras del diccionario activo
                statsElement.textContent = `(${data.activeDictionary.wordCount} palabras)`;
            }
            
            console.log('📚 Diccionario activo:', data.activeDictionary);
        } else {
            // Si no hay diccionario activo o no tiene nombre, mostrar mensaje por defecto
            const nameElement = document.getElementById('activeDictionaryName');
            if (nameElement) {
                nameElement.textContent = 'Ninguno';
            }
        }
    } catch (error) {
        console.error('Error obteniendo diccionario activo:', error);
        const nameElement = document.getElementById('activeDictionaryName');
        if (nameElement) {
            nameElement.textContent = 'Error al cargar';
        }
    }
}

// Restaurar diccionario original
async function resetDictionary() {
    if (!confirm('¿Estás seguro de que quieres restaurar el diccionario original? Se perderán todas las palabras personalizadas.')) {
        return;
    }
    
    try {
        const response = await fetch('/api/dictionary/reset', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert(`✅ ${data.message}`);
            loadDictionary(); // Recargar diccionario
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error restaurando diccionario: ' + error.message);
    }
}

// ======================== FUNCIONES PARA COMPARACIÓN DE MOTORES ========================

// Variables globales para comparación
let availableEngines = [];
let pythonStatus = null;

// Inicializar sección de comparación
async function initializeComparison() {
    console.log('🔧 Inicializando comparación de motores...');
    try {
        await loadAvailableEngines();
        setupComparisonEventListeners();
        console.log('✅ Comparación inicializada correctamente');
    } catch (error) {
        console.error('❌ Error en initializeComparison:', error);
        throw error;
    }
}

// Verificar estado de Python
async function checkPythonStatus() {
    try {
        const response = await fetch('/api/python-status');
        pythonStatus = await response.json();
        updatePythonStatusDisplay();
    } catch (error) {
        console.error('Error verificando Python:', error);
        pythonStatus = {
            available: false,
            error: 'Error de conexión',
            message: 'No se pudo verificar el estado de Python'
        };
        updatePythonStatusDisplay();
    }
}

// Actualizar display del estado de Python
function updatePythonStatusDisplay() {
    const statusCard = document.getElementById('pythonStatusCard');
    const installSection = document.getElementById('pythonInstallSection');
    
    if (!statusCard) {
        console.error('❌ pythonStatusCard no encontrado');
        return;
    }
    
    if (!installSection) {
        console.error('❌ pythonInstallSection no encontrado');
        return;
    }
    
    if (pythonStatus.available) {
        statusCard.className = 'status-card status-available';
        statusCard.innerHTML = `
            <div class="status-info">
                <div class="status-icon">🐍</div>
                <div class="status-details">
                    <h4>Python Disponible</h4>
                    <p><strong>Versión:</strong> ${pythonStatus.version}</p>
                    <p><strong>Estado:</strong> ${pythonStatus.allPackagesAvailable ? 'Todas las dependencias instaladas' : 'Algunas dependencias faltantes'}</p>
                    <div class="package-status">
                        ${Object.entries(pythonStatus.packages || {}).map(([pkg, available]) => 
                            `<span class="package-badge ${available ? 'available' : 'missing'}">${pkg}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
        `;
        installSection.classList.add('hidden');
    } else {
        statusCard.className = 'status-card status-unavailable';
        statusCard.innerHTML = `
            <div class="status-info">
                <div class="status-icon">❌</div>
                <div class="status-details">
                    <h4>Python No Disponible</h4>
                    <p><strong>Error:</strong> ${pythonStatus.error}</p>
                    <p>${pythonStatus.message}</p>
                </div>
            </div>
        `;
        installSection.classList.remove('hidden');
    }
}

// Cargar motores disponibles
async function loadAvailableEngines() {
    try {
        const response = await fetch('/api/engines');
        const data = await response.json();
        
        if (data.success) {
            availableEngines = data.engines;
            updateEnginesDisplay();
            updateEngineCheckboxes();
        } else {
            throw new Error('Error cargando motores');
        }
    } catch (error) {
        console.error('Error cargando motores:', error);
        document.getElementById('enginesGrid').innerHTML = `
            <div style="color: #e74c3c; text-align: center; grid-column: 1 / -1;">
                Error cargando motores: ${error.message}
            </div>
        `;
    }
}

// Actualizar display de motores
function updateEnginesDisplay() {
    const enginesGrid = document.getElementById('enginesGrid');
    
    enginesGrid.innerHTML = availableEngines.map(engine => `
        <div class="engine-card ${engine.status}">
            <div class="engine-header">
                <div class="engine-title">${engine.name}</div>
                <div class="engine-status ${engine.status}">
                    ${engine.status === 'available' ? '✅ Disponible' : 
                      engine.status === 'requires-python' ? '🐍 Requiere Python' : '❌ No disponible'}
                </div>
            </div>
            <div class="engine-info">
                <p><strong>Descripción:</strong> ${engine.description}</p>
                <p><strong>Idioma:</strong> ${engine.language}</p>
                <p><strong>Tipo:</strong> ${engine.type}</p>
                <p><strong>Tiempo de respuesta:</strong> ${engine.responseTime}</p>
                <div class="engine-features">
                    ${engine.features.map(feature => `<span class="feature-tag">${feature}</span>`).join('')}
                </div>
            </div>
        </div>
    `).join('');
}

// Actualizar checkboxes de motores
function updateEngineCheckboxes() {
    const checkboxContainer = document.getElementById('engineCheckboxes');
    
    checkboxContainer.innerHTML = availableEngines.map(engine => {
        const isAvailable = engine.status === 'available' || (engine.status === 'requires-python' && pythonStatus?.available);
        const isDisabled = !isAvailable;
        
        return `
            <label class="engine-checkbox ${isDisabled ? 'disabled' : ''}" data-engine="${engine.id}">
                <input type="checkbox" value="${engine.id}" ${isDisabled ? 'disabled' : ''} 
                       ${engine.id === 'natural' ? 'checked' : ''}>
                <span class="engine-checkbox-label">${engine.name}</span>
            </label>
        `;
    }).join('');
}

// Configurar event listeners para comparación
function setupComparisonEventListeners() {
    // Botón de comparar motores
    const compareEnginesBtn = document.getElementById('compareEngines');
    if (compareEnginesBtn) {
        compareEnginesBtn.addEventListener('click', compareEngines);
    } else {
        console.error('❌ compareEngines button no encontrado');
    }
    
    // Botón de recheck Python (opcional)
    const recheckBtn = document.getElementById('recheckPython');
    if (recheckBtn) {
        recheckBtn.addEventListener('click', async () => {
            recheckBtn.disabled = true;
            recheckBtn.innerHTML = '<span>🔄</span> Verificando...';
            
            await checkPythonStatus();
            await loadAvailableEngines();
            
            recheckBtn.disabled = false;
            recheckBtn.innerHTML = '<span>🔄</span> Verificar Python';
        });
    }
}

// Función principal de comparación
async function compareEngines() {
    const testText = document.getElementById('testText').value.trim();
    
    if (!testText) {
        alert('⚠️ Por favor escribe un texto para analizar');
        return;
    }
    
    // Obtener motores seleccionados
    const selectedEngines = Array.from(document.querySelectorAll('#engineCheckboxes input[type="checkbox"]:checked'))
        .map(checkbox => checkbox.value);
    
    if (selectedEngines.length === 0) {
        alert('⚠️ Por favor selecciona al menos un motor para comparar');
        return;
    }
    
    // Mostrar loading
    const compareBtn = document.getElementById('compareEngines');
    const loading = document.getElementById('comparisonLoading');
    const results = document.getElementById('comparisonResults');
    
    compareBtn.disabled = true;
    compareBtn.innerHTML = '<span>⏳</span> Analizando...';
    loading.classList.remove('hidden');
    results.classList.add('hidden');
    
    try {
        const response = await fetch('/api/analyze-compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: testText,
                engines: selectedEngines
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            displayComparisonResults(data.results, testText);
        } else {
            throw new Error(data.error);
        }
        
    } catch (error) {
        console.error('Error en comparación:', error);
        alert('❌ Error en la comparación: ' + error.message);
    } finally {
        compareBtn.disabled = false;
        compareBtn.innerHTML = '<span>⚖️</span> Comparar Motores';
        loading.classList.add('hidden');
    }
}

// Mostrar resultados de comparación
function displayComparisonResults(results, originalText) {
    const resultsSection = document.getElementById('comparisonResults');
    const consensusCard = document.getElementById('consensusCard');
    const resultsGrid = document.getElementById('resultsGrid');
    const metricsTableBody = document.getElementById('metricsTableBody');
    
    // Mostrar consenso si existe
    if (results._comparison) {
        const comparison = results._comparison;
        consensusCard.innerHTML = `
            <div class="consensus-title">📊 Resumen de Consenso</div>
            <div class="consensus-result ${getSentimentClass(comparison.averageScore)}">
                ${comparison.consensus}
            </div>
            <div class="consensus-details">
                <p><strong>Puntuación promedio:</strong> ${comparison.averageScore} | 
                   <strong>Confianza promedio:</strong> ${(comparison.averageConfidence * 100).toFixed(1)}%</p>
                <p><strong>Motores exitosos:</strong> ${comparison.successfulEngines}/${comparison.totalEngines} | 
                   <strong>Acuerdo:</strong> ${comparison.agreement}</p>
                <p><strong>Tiempo total:</strong> ${comparison.totalResponseTime}ms</p>
            </div>
        `;
    }
    
    // Mostrar resultados individuales
    const individualResults = Object.entries(results).filter(([key]) => key !== '_comparison');
    
    resultsGrid.innerHTML = individualResults.map(([engineKey, result]) => {
        if (result.error) {
            return `
                <div class="result-card error">
                    <div class="result-header">
                        <div class="result-engine">${result.engine}</div>
                        <div class="result-time">Error</div>
                    </div>
                    <div class="result-error">
                        ${result.error}
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="result-card success">
                <div class="result-header">
                    <div class="result-engine">${result.engine}</div>
                    <div class="result-time">${result.responseTime}ms</div>
                </div>
                <div class="result-sentiment">
                    <div class="sentiment-score ${getSentimentClass(result.score)}">
                        ${result.score}
                    </div>
                    <div class="sentiment-classification">${result.classification}</div>
                    <div class="sentiment-confidence">
                        Confianza: ${(result.confidence * 100).toFixed(1)}%
                    </div>
                </div>
                <div class="result-details">
                    <p><strong>Comparativo:</strong> ${result.comparative}</p>
                    ${result.positive.length > 0 ? `<p><strong>Palabras positivas:</strong> ${result.positive.slice(0, 3).join(', ')}</p>` : ''}
                    ${result.negative.length > 0 ? `<p><strong>Palabras negativas:</strong> ${result.negative.slice(0, 3).join(', ')}</p>` : ''}
                    ${result.details?.note ? `<p><strong>Nota:</strong> ${result.details.note}</p>` : ''}
                </div>
            </div>
        `;
    }).join('');
    
    // Llenar tabla de métricas
    metricsTableBody.innerHTML = individualResults.map(([engineKey, result]) => `
        <tr>
            <td>${result.engine}</td>
            <td>${result.error ? 'N/A' : result.score}</td>
            <td>${result.error ? 'N/A' : result.classification}</td>
            <td>${result.error ? 'N/A' : (result.confidence * 100).toFixed(1) + '%'}</td>
            <td>${result.responseTime}ms</td>
            <td class="${result.error ? 'status-error' : 'status-success'}">
                ${result.error ? 'Error' : 'Éxito'}
            </td>
        </tr>
    `).join('');
    
    resultsSection.classList.remove('hidden');
}

// ============= FUNCIÓN DE REPORTE AVANZADO XLSX =============

async function generateAdvancedReport() {
    // Validar que haya resultados analizados
    if (!currentResults || !currentResults.results) {
        alert('⚠️ Por favor analiza el archivo primero antes de generar el reporte');
        return;
    }

    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('⚠️ No se encontró el archivo original');
        return;
    }

    // Obtener configuración de columnas actual
    const columnConfig = window.getCurrentColumnConfig ? window.getCurrentColumnConfig() : null;
    
    // Validar que haya una configuración seleccionada
    if (!columnConfig || !columnConfig.name) {
        alert('⚠️ Por favor selecciona una configuración de columnas antes de generar el reporte.\n\nPuedes seleccionarla en:\n• El dropdown junto al botón "Analizar"\n• La pestaña "Configuración de Columnas"');
        return;
    }

    const advancedBtn = document.getElementById('advancedReportBtn');
    const loading = document.getElementById('loading');
    
    try {
        // Deshabilitar botón y mostrar loading
        advancedBtn.disabled = true;
        advancedBtn.innerHTML = '<span class="btn-icon">⏳</span>Generando reporte...';
        loading.classList.remove('hidden');
        
        // Determinar qué datos exportar
        const dataToExport = filteredResults.length > 0 ? filteredResults : currentResults.results;
        const isFiltered = filteredResults.length > 0;
        
        if (isFiltered) {
            loading.querySelector('p').textContent = `Generando reporte con ${dataToExport.length} resultados filtrados...`;
            console.log(`📊 Exportando ${dataToExport.length} resultados filtrados de ${currentResults.results.length} totales`);
        } else {
            loading.querySelector('p').textContent = 'Generando reporte avanzado XLSX con análisis de sentimientos...';
            console.log(`📊 Exportando todos los ${dataToExport.length} resultados`);
        }

        // Crear FormData con archivo y filtros
        const formData = new FormData();
        formData.append('excelFile', file);
        formData.append('columnConfig', JSON.stringify(columnConfig));
        
        // Si hay filtros, enviar los índices de las filas a incluir
        if (isFiltered) {
            const filteredIndices = dataToExport.map(item => item.row - 1); // row es 1-indexed
            formData.append('filteredIndices', JSON.stringify(filteredIndices));
            console.log(`📋 Enviando ${filteredIndices.length} índices filtrados`);
            
            // ENVIAR LAS ESTADÍSTICAS FILTRADAS que está viendo el usuario
            if (filteredStats) {
                console.log('📊 Enviando estadísticas FILTRADAS al Excel:', filteredStats);
                formData.append('statistics', JSON.stringify(filteredStats));
            }
        } else {
            // Sin filtros: enviar las estadísticas recalculadas (no las del backend)
            if (filteredStats) {
                console.log('📊 Enviando estadísticas RECALCULADAS (sin filtros) al Excel:', filteredStats);
                formData.append('statistics', JSON.stringify(filteredStats));
            } else if (currentResults && currentResults.statistics) {
                console.log('📊 Fallback: enviando estadísticas del backend al Excel:', currentResults.statistics);
                formData.append('statistics', JSON.stringify(currentResults.statistics));
            }
        }

        // Hacer petición al endpoint de reporte avanzado
        const response = await fetch('/api/generate-advanced-report', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error generando el reporte');
        }

        // Descargar archivo
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = 'reporte-sentiment-analysis.xlsx';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(downloadUrl);

        // Mostrar mensaje de éxito
        showAdvancedReportSuccess();

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error generando el reporte: ' + error.message);
    } finally {
        // Restaurar botón y ocultar loading
        advancedBtn.disabled = false;
        advancedBtn.innerHTML = '<span class="btn-icon">📋</span>Generar Reporte XLSX Completo';
        loading.classList.add('hidden');
    }
}

function showAdvancedReportSuccess() {
    // Crear mensaje de éxito temporal
    const successMessage = document.createElement('div');
    successMessage.className = 'success-notification';
    successMessage.innerHTML = `
        <div class="success-content">
            <span class="success-icon">✅</span>
            <div class="success-text">
                <h3>¡Reporte Generado Exitosamente!</h3>
                <p>Tu reporte XLSX con análisis completo ha sido descargado</p>
                <div class="report-features">
                    <span>📊 Datos con filtros automáticos</span>
                    <span>🎨 Colores por tipo de sentiment</span>
                    <span>📈 Análisis por carrera y docente</span>
                    <span>⚖️ Comparación de motores NLP</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(successMessage);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (successMessage.parentNode) {
            successMessage.parentNode.removeChild(successMessage);
        }
    }, 5000);
}

// Función helper para obtener clase CSS del sentimiento
function getSentimentClass(score) {
    if (score > 1) return 'positive';
    if (score < -1) return 'negative';
    return 'neutral';
}