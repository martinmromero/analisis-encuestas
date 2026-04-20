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

    // Cargar versión de la aplicación
    loadAppVersion();

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

    // Event listener para reporte avanzado XLSX
    console.log('📊 Configurando reporte avanzado...');
    const advancedReportBtn = document.getElementById('advancedReportBtn');
    console.log('advancedReportBtn:', advancedReportBtn ? '✓' : '✗');
    if (advancedReportBtn) {
        advancedReportBtn.addEventListener('click', function() {
            generateAdvancedReport();
        });
    }

    // Event listener para reporte cuantitativo por materia/docente
    const subjectTeacherReportBtn = document.getElementById('subjectTeacherReportBtn');
    if (subjectTeacherReportBtn) {
        subjectTeacherReportBtn.addEventListener('click', function() {
            generateSubjectTeacherReport();
        });
    }

    // ===== NUEVO: Event listeners para análisis con columna de validación =====
    const analyzeValidationBtn = document.getElementById('analyzeValidationBtn');
    const validationReportBtn = document.getElementById('validationReportBtn');
    
    console.log('📋 Configurando botones de validación...');
    console.log('analyzeValidationBtn:', analyzeValidationBtn ? '✓' : '✗');
    console.log('validationReportBtn:', validationReportBtn ? '✓' : '✗');
    
    if (analyzeValidationBtn) {
        analyzeValidationBtn.addEventListener('click', function() {
            analyzeWithValidationColumn();
        });
    }
    
    if (validationReportBtn) {
        validationReportBtn.addEventListener('click', function() {
            generateValidationReport();
        });
    }

    // ===== EVENT LISTENERS PARA PESTAÑAS DE DICCIONARIO =====
    
    // Gestión de pestañas (Diccionario / Palabras Ignoradas)
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            console.log('🔄 Cambiando a pestaña:', tabName);
            
            // Actualizar botones activos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Obtener la sección de diccionario en el momento del click
            const dictionarySection = document.getElementById('dictionarySection');
            
            // Mostrar contenido correspondiente - solo dentro de la sección de diccionario
            if (dictionarySection) {
                const tabContents = dictionarySection.querySelectorAll('.tab-content');
                console.log('📋 Tabs encontrados:', tabContents.length);
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    console.log('❌ Removiendo active de:', content.id);
                });
            }
            
            const tabContent = tabName === 'dictionary' ? 
                document.getElementById('dictionaryContent') : 
                document.getElementById('ignoredContent');
            
            if (tabContent) {
                tabContent.classList.add('active');
                console.log('✅ Agregando active a:', tabContent.id);
                
                // Cargar palabras ignoradas si se cambió a esa pestaña
                if (tabName === 'ignored') {
                    loadIgnoredPhrases();
                }
            } else {
                console.error('❌ No se encontró el tab:', tabName);
            }
        });
    });
    
    // Event listener para agregar palabra ignorada
    const addIgnoredBtn = document.getElementById('addIgnored');
    if (addIgnoredBtn) {
        addIgnoredBtn.addEventListener('click', addIgnoredPhrase);
    }
    
    // Permitir agregar con Enter
    const newIgnoredInput = document.getElementById('newIgnoredPhrase');
    if (newIgnoredInput) {
        newIgnoredInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addIgnoredPhrase();
            }
        });
    }
    
    // Event listeners para navegación entre secciones
    console.log('🔧 Agregando event listeners para navegación...');
    const analysisTab = document.getElementById('analysisTab');
    const columnConfigTab = document.getElementById('columnConfigTab');
    const dictionaryTab = document.getElementById('dictionaryTab');
    const comparisonTab = document.getElementById('comparisonTab');
    const howCalculatedTab = document.getElementById('howCalculatedTab');
    
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
    
    // Event listener para sección de metodología
    if (howCalculatedTab) {
        howCalculatedTab.addEventListener('click', () => {
            console.log('👆 Click en howCalculatedTab');
            showSection('howCalculated');
        });
    }

    // Event listeners para filtros avanzados
    // NOTA: applyFilters es manejado por dual-filters.js para sistema de multiselección
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) clearFilters.addEventListener('click', clearAdvancedFilters);

    // Event listeners para gestión del diccionario
    const refreshDictionary = document.getElementById('refreshDictionary');
    const sentimentFilter = document.getElementById('sentimentFilter');
    const wordSearch = document.getElementById('wordSearch');
    if (refreshDictionary) refreshDictionary.addEventListener('click', loadDictionary);
    if (sentimentFilter) sentimentFilter.addEventListener('change', filterDictionary);
    if (wordSearch) wordSearch.addEventListener('input', filterDictionary);
    
    // Event listener para botón de colapsar diccionario
    const toggleDictionaryBtn = document.getElementById('toggleDictionary');
    if (toggleDictionaryBtn) {
        toggleDictionaryBtn.addEventListener('click', toggleDictionaryTable);
    }
    
    // Event listener para el slider de puntuación
    const sentimentScore = document.getElementById('sentimentScore');
    if (sentimentScore) sentimentScore.addEventListener('input', updateScoreDisplay);
    
    // Event listeners para entrenamiento
    const addWord = document.getElementById('addWord');
    const testWord = document.getElementById('testWord');
    if (addWord) addWord.addEventListener('click', addWordToDictionary);
    if (testWord) testWord.addEventListener('click', testWordAnalysis);
    
    // Event listeners para gestión de archivos
    const exportDictionaryExcelBtn = document.getElementById('exportDictionaryExcel');
    const importDictionaryBtn = document.getElementById('importDictionary');
    const dictionaryFileInput = document.getElementById('dictionaryFileInput');
    const resetDictionaryBtn = document.getElementById('resetDictionary');
    const activeDictionarySelect = document.getElementById('activeDictionarySelect');
    const deleteDictionaryBtn = document.getElementById('deleteDictionary');
    
    if (exportDictionaryExcelBtn) exportDictionaryExcelBtn.addEventListener('click', exportDictionaryToExcel);
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
    
    // Cargar diccionario activo para mostrar estadísticas y palabras
    loadDictionary();

    // Inicializar display del score
    if (typeof updateScoreDisplay === 'function') {
        updateScoreDisplay();
    }

    // Event listeners para filtros de resultados
    const filterSentimentSelect = document.getElementById('filterSentiment');
    const searchTextInput = document.getElementById('searchText');
    
    // Estos filtros deben integrarse con el sistema de filtros duales
    if (filterSentimentSelect) {
        filterSentimentSelect.addEventListener('change', () => {
            // Si existe el sistema de filtros duales, reaplicar todos los filtros
            if (typeof applyFilters === 'function') {
                console.log('🔄 Replicando filtros duales tras cambio de sentimiento');
                applyFilters();
            } else {
                // Fallback: usar filtros simples
                filterResults();
            }
        });
    }
    
    if (searchTextInput) {
        searchTextInput.addEventListener('input', () => {
            // Si existe el sistema de filtros duales, reaplicar todos los filtros
            if (typeof applyFilters === 'function') {
                console.log('🔄 Replicando filtros duales tras búsqueda de texto');
                applyFilters();
            } else {
                // Fallback: usar filtros simples
                filterResults();
            }
        });
    }
    
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
    
    // Sentimiento predominante (moda de las 5 clasificaciones válidas)
    const dominantSentiment = (data.statistics && data.statistics.dominantSentiment)
        ? data.statistics.dominantSentiment
        : 'Sin datos';
    
    // Aplicar clase de color según el sentimiento predominante
    const scoreElement = document.getElementById('averageScore');
    if (scoreElement) {
        const scoreCard = scoreElement.closest('.stat-card');
        if (scoreCard) {
            scoreCard.classList.remove('score-high', 'score-medium', 'score-low',
                'sentiment-muy-positivo', 'sentiment-positive', 'sentiment-neutral',
                'sentiment-negativo', 'sentiment-negative', 'sentiment-muy-negativo');
            scoreCard.classList.add(getSentimentStatCardClass(dominantSentiment));
        }
        scoreElement.textContent = dominantSentiment;
        const iconEl = document.getElementById('dominantSentimentIcon');
        if (iconEl) iconEl.textContent = getSentimentIcon(dominantSentiment);
    }
    
    // Verificar que percentages existen
    const percentages = data.statistics?.percentages || {
        'Muy Positivo': 0,
        'Positivo': 0,
        'Neutral': 0,
        'Negativo': 0,
        'Muy Negativo': 0,
        'No clasificado': 0
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
        // Inicializar filtros multiselect con Tom-Select
        if (typeof initDualFilters === 'function') {
            initDualFilters(data.filterOptions, data.results);
        } else if (typeof initCascadeFilters === 'function') {
            // Fallback a filtros en cascada si Tom-Select no está disponible
            initCascadeFilters(data.filterOptions, data.results);
        }
    }

    // Inicializar filteredResults y mostrar tabla de resultados
    filteredResults = data.results.slice(); // Copia superficial
    currentPage = 1; // Resetear página
    displayResultsTable(filteredResults);

    // Mostrar sección de resultados y charts
    document.getElementById('results').classList.remove('hidden');
    const chartsContainer = document.getElementById('chartsContainer');
    if (chartsContainer) chartsContainer.classList.remove('hidden');
    
    // Mostrar sección de filtros
    const filtersSection = document.getElementById('filtersSection');
    if (filtersSection) filtersSection.classList.remove('hidden');
    
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

    // FILTRAR "No clasificado" - solo mostrar clasificaciones válidas
    const labels = [];
    const data = [];
    Object.entries(statistics.classifications).forEach(([key, value]) => {
        if (key !== 'No clasificado') {
            labels.push(key);
            data.push(value);
        }
    });
    
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
        },
        plugins: [{
            id: 'percentageLabels',
            afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                const dataset = chart.data.datasets[0];
                const total = dataset.data.reduce((a, b) => a + b, 0);
                
                ctx.save();
                ctx.font = 'bold 14px Arial';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                
                const meta = chart.getDatasetMeta(0);
                meta.data.forEach((arc, index) => {
                    const value = dataset.data[index];
                    const percentage = ((value / total) * 100).toFixed(1);
                    
                    // Solo mostrar si el porcentaje es significativo (mayor a 3%)
                    if (parseFloat(percentage) > 3) {
                        const angle = (arc.startAngle + arc.endAngle) / 2;
                        const radius = (arc.innerRadius + arc.outerRadius) / 2;
                        
                        const x = arc.x + Math.cos(angle) * radius;
                        const y = arc.y + Math.sin(angle) * radius;
                        
                        ctx.fillText(percentage + '%', x, y);
                    }
                });
                
                ctx.restore();
            }
        }]
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

    // FILTRAR "No clasificado" - solo mostrar clasificaciones válidas
    const labels = [];
    const data = [];
    const counts = [];
    Object.entries(statistics.percentages).forEach(([key, value]) => {
        if (key !== 'No clasificado') {
            labels.push(key);
            data.push(parseFloat(value));
            counts.push(statistics.classifications[key]);
        }
    });
    
    const colors = [
        '#22c55e', // Muy Positivo - verde
        '#4ade80', // Positivo - verde claro
        '#6b7280', // Neutral - gris
        '#fb923c', // Negativo - naranja
        '#ef4444'  // Muy Negativo - rojo
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
                label: 'Respuestas',
                data: counts,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'x', // Barras verticales
            responsive: false,
            maintainAspectRatio: false,
            animation: false,
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: { size: 11 }
                    }
                },
                y: {
                    beginAtZero: true,
                    grace: '10%',
                    ticks: {
                        font: { size: 11 }
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
                            const percentage = data[context.dataIndex];
                            const value = context.parsed.y;
                            return `${value} respuestas (${percentage}%)`;
                        }
                    }
                },
                datalabels: false
            }
        },
        plugins: [{
            id: 'valueLabels',
            afterDatasetsDraw(chart) {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    meta.data.forEach((bar, index) => {
                        const value = dataset.data[index];
                        
                        ctx.fillStyle = '#000';
                        ctx.font = 'bold 14px Arial';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        
                        // Mostrar valor encima de la barra
                        ctx.fillText(value, bar.x, bar.y - 5);
                    });
                });
            }
        }]
    });
}

// ===== FUNCIONES DE RESULTADOS DETALLADOS =====
// NOTA: Estas funciones están disponibles para futuras versiones cuando se reactive la tabla detallada.
// Incluyen: displayResultsTable(), filterResults(), paginación, búsqueda por texto y filtro por sentiment.
// La sección está oculta en el HTML (#detailedResultsTable) pero las funciones se mantienen operativas.

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
// Función GLOBAL para determinar color de score (usada en sitio y debe coincidir con Excel)
function getScoreColor(score, escalaConfig = null) {
    // Si no hay configuración de escala o es estándar 1-10, usar score directo
    if (!escalaConfig || (escalaConfig.min === 1 && escalaConfig.max === 10 && escalaConfig.direction !== 'descending')) {
        // Escala fija: 1-3 rojo, 4-6 naranja, 7-10 verde
        if (score >= 7) return 'score-high';    // Verde: 7-10
        if (score >= 4) return 'score-medium';  // Naranja: 4-6
        return 'score-low';                      // Rojo: 1-3
    }
    
    // Si hay escala personalizada, normalizar a 1-10
    const range = escalaConfig.max - escalaConfig.min;
    let normalizedScore = score;
    
    if (range > 0) {
        normalizedScore = ((score - escalaConfig.min) / range) * 10;
        
        // Si es descendente, invertir
        if (escalaConfig.direction === 'descending') {
            normalizedScore = 10 - normalizedScore;
        }
    }
    
    // Escala fija: 1-3 rojo, 4-6 naranja, 7-10 verde
    if (normalizedScore >= 7) return 'score-high';    // Verde: 7-10
    if (normalizedScore >= 4) return 'score-medium';  // Naranja: 4-6
    return 'score-low';                                // Rojo: 1-3
}

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

        // Obtener configuración de escala (NO inferir, solo usar si está configurada)
        const escala = escalas[column] || null;

        return { 
            column, 
            avg, 
            count: values.length,
            escala: escala
        };
    });

    console.log('📊 Métricas calculadas:', metrics.length);

    // Actualizar solo el grid, no todo el container
    const metricsGrid = document.getElementById('metricsGrid');
    if (metricsGrid) {
        metricsGrid.innerHTML = metrics.map(metric => {
            // Usar función global para determinar color
            const scoreClass = getScoreColor(metric.avg, metric.escala);
            
            const directionIcon = metric.escala?.direction === 'descending' ? '⬇️' : '⬆️';
            
            const scaleLabel = metric.escala && (metric.escala.min !== 1 || metric.escala.max !== 10)
                ? `<div class="scale-info" style="font-size: 0.85em; color: #666;">Escala: ${metric.escala.min}-${metric.escala.max} ${directionIcon}</div>`
                : '';
            
            return `
                <div class="metric-card ${scoreClass}">
                    <h4>${metric.column}</h4>
                    <div class="metric-value">${metric.avg.toFixed(2)}</div>
                    <div class="metric-label">Promedio sobre ${metric.count} respuestas</div>
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
        'Muy Negativo': 0,
        'No clasificado': 0
    };

    let totalScore = 0;
    let scoreCount = 0;

    // Función auxiliar para obtener clasificación si no existe
    function getClassification(score, confidence = 0.5) {
        // Si no hay confianza, la palabra no está en el diccionario
        if (confidence === 0) return 'No clasificado';
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
            
            const classification = result.sentiment.classification || getClassification(score, result.sentiment.confidence || 0);
            
            if (classification) {
                classifications[classification]++;
            }
            
            if (typeof score === 'number' && !isNaN(score)) {
                totalScore += score;
                scoreCount++;
            }
        }
    });

    // CORRECCIÓN: Calcular porcentajes solo sobre clasificaciones VÁLIDAS (excluyendo "No clasificado")
    // Base = solo las respuestas con clasificación válida: muy positivo, positivo, neutral, negativo, muy negativo
    const validClassifications = classifications['Muy Positivo'] + 
                                 classifications['Positivo'] + 
                                 classifications['Neutral'] + 
                                 classifications['Negativo'] + 
                                 classifications['Muy Negativo'];
    
    const baseForPercentages = validClassifications > 0 ? validClassifications : 1;
    
    const percentages = {};
    Object.keys(classifications).forEach(key => {
        if (key === 'No clasificado') {
            // No clasificado NO se incluye en los porcentajes
            percentages[key] = '0.0';
        } else {
            // Porcentajes sobre la base de clasificaciones válidas
            percentages[key] = ((classifications[key] / baseForPercentages) * 100).toFixed(1);
        }
    });

    // Los perColumnAvgScore ya están normalizados a 0-10 por el servidor
    const averageScore = scoreCount > 0 ? totalScore / scoreCount : 5; // 5 = neutral

    // Moda: valor más frecuente entre las 5 categorías válidas
    const _validKeys = ['Muy Positivo', 'Positivo', 'Neutral', 'Negativo', 'Muy Negativo'];
    const dominantSentiment = _validKeys
        .map(k => ({ k, v: classifications[k] || 0 }))
        .filter(x => x.v > 0)
        .reduce((a, b) => a.v >= b.v ? a : b, { k: 'Sin datos', v: -1 }).k;

    return {
        classifications,
        percentages,
        dominantSentiment,
        averageScore: parseFloat(averageScore.toFixed(2)), // Escala 0-10
        totalResults: validClassifications, // Total de clasificaciones válidas
        qualitativeResponses: validClassifications // Respuestas cualitativas (con clasificación válida)
    };
}

// Actualizar tarjetas de estadísticas
function updateStatsCards(results, stats) {
    // Actualizar total de respuestas filtradas
    const totalElement = document.getElementById('totalResponses');
    if (totalElement) totalElement.textContent = results.length;
    
    // Contar respuestas cualitativas (con clasificación VÁLIDA, excluyendo "No clasificado")
    const qualitativeCount = results.filter(row => {
        if (!row.sentiment || !row.sentiment.details || row.sentiment.details.length === 0) {
            return false;
        }
        // Excluir "No clasificado"
        const classification = row.sentiment.classification || '';
        return classification !== 'No clasificado' && classification !== '';
    }).length;
    const quantElement = document.getElementById('quantitativeResponses');
    if (quantElement) quantElement.textContent = qualitativeCount;
    
    // Sentimiento predominante (moda de las 5 clasificaciones válidas)
    const dominantSentiment = stats.dominantSentiment || 'Sin datos';
    
    // Aplicar clase de color según el sentimiento predominante
    const scoreElement = document.getElementById('averageScore');
    if (scoreElement) {
        const scoreCard = scoreElement.closest('.stat-card');
        if (scoreCard) {
            scoreCard.classList.remove('score-high', 'score-medium', 'score-low',
                'sentiment-muy-positivo', 'sentiment-positive', 'sentiment-neutral',
                'sentiment-negativo', 'sentiment-negative', 'sentiment-muy-negativo');
            scoreCard.classList.add(getSentimentStatCardClass(dominantSentiment));
        }
        scoreElement.textContent = dominantSentiment;
        const iconEl = document.getElementById('dominantSentimentIcon');
        if (iconEl) iconEl.textContent = getSentimentIcon(dominantSentiment);
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

/**
 * Actualizar resultados con datos ya filtrados 
 * (Función usada por dual-filters.js)
 */
function updateResultsWithFilteredData(filteredData) {
    console.log('🔄 Actualizando visualización con datos filtrados:', filteredData.length);
    
    if (!currentResults) {
        console.error('❌ No hay resultados cargados');
        return;
    }
    
    // Aplicar filtros adicionales de sentimiento y texto de búsqueda
    // (estos NO son manejados por dual-filters.js)
    let finalFilteredData = filteredData.slice();
    
    const sentimentFilter = document.getElementById('filterSentiment')?.value || '';
    const searchText = document.getElementById('searchText')?.value?.toLowerCase() || '';
    
    // Filtrar por sentimiento si está seleccionado
    if (sentimentFilter) {
        finalFilteredData = finalFilteredData.filter(result => 
            result.sentiment?.classification === sentimentFilter
        );
        console.log(`🎯 Aplicado filtro de sentimiento: ${sentimentFilter} - ${finalFilteredData.length} resultados`);
    }
    
    // Filtrar por texto de búsqueda si hay alguno
    if (searchText) {
        finalFilteredData = finalFilteredData.filter(result => {
            const mainText = result.sentiment?.details?.[0]?.text || '';
            return mainText.toLowerCase().includes(searchText);
        });
        console.log(`🔍 Aplicado filtro de texto: "${searchText}" - ${finalFilteredData.length} resultados`);
    }
    
    // Actualizar filteredResults global
    filteredResults = finalFilteredData;
    
    // Resetear página a la primera
    currentPage = 1;
    
    // Recalcular métricas numéricas con datos filtrados
    if (currentResults.filterOptions) {
        displayNumericMetrics(finalFilteredData, currentResults.filterOptions);
    }
    
    // Recalcular estadísticas con resultados filtrados
    filteredStats = calculateFilteredStats(finalFilteredData);
    
    // Actualizar gráficos con nuevas estadísticas
    createSentimentChart(filteredStats);
    createCategoryChart(filteredStats);
    
    // Actualizar estadísticas en las tarjetas
    updateStatsCards(finalFilteredData, filteredStats);
    
    // Actualizar tabla de resultados
    displayResultsTable(finalFilteredData);
    
    console.log('✅ Visualización actualizada');
}

// Exponer función globalmente para que dual-filters.js pueda acceder
window.updateResultsWithFilteredData = updateResultsWithFilteredData;

// Función para limpiar filtros avanzados
function clearAdvancedFilters() {
    console.log('🗑️ Limpiando filtros desde app.js');
    
    // Si existe el sistema de filtros duales, usarlo
    if (typeof clearAllFilters === 'function') {
        console.log('✅ Usando clearAllFilters de dual-filters.js');
        clearAllFilters();
        return;
    }
    
    // Fallback: limpiar selectores simples
    console.log('⚠️ Usando limpieza simple (fallback)');
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
    const howCalculatedSection = document.getElementById('howCalculatedSection');
    const resultsSection = document.getElementById('results');
    
    // Elementos específicos a ocultar/mostrar
    const chartsContainer = document.getElementById('chartsContainer');
    const numericMetricsContainer = document.getElementById('numericMetricsContainer');
    const detailedResultsTable = document.getElementById('detailedResultsTable');
    
    if (!analysisSection) console.error('❌ analysisSection no encontrada');
    if (!columnConfigSection) console.error('❌ columnConfigSection no encontrada');
    if (!dictionarySection) console.error('❌ dictionarySection no encontrada');
    if (!comparisonSection) console.error('❌ comparisonSection no encontrada');
    if (!howCalculatedSection) console.error('❌ howCalculatedSection no encontrada');
    
    // Ocultar todas las secciones
    if (analysisSection) analysisSection.classList.add('hidden');
    if (columnConfigSection) columnConfigSection.classList.add('hidden');
    if (dictionarySection) dictionarySection.classList.add('hidden');
    if (comparisonSection) comparisonSection.classList.add('hidden');
    if (howCalculatedSection) howCalculatedSection.classList.add('hidden');
    
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
    } else if (sectionName === 'howCalculated') {
        if (howCalculatedSection) {
            howCalculatedSection.classList.remove('hidden');
            document.getElementById('howCalculatedTab')?.classList.add('active');
            // Ocultar gráficos, métricas y tabla en pestaña de metodología
            if (chartsContainer) chartsContainer.style.display = 'none';
            if (numericMetricsContainer) numericMetricsContainer.style.display = 'none';
            if (detailedResultsTable) detailedResultsTable.style.display = 'none';
            console.log('✅ Sección de metodología mostrada');
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
        if (item.score > 0.5) scoreClass = 'positive';
        if (item.score < -0.5) scoreClass = 'negative';
        
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

// Resetear filtros del diccionario
function resetDictionaryFilters() {
    const sentimentFilter = document.getElementById('sentimentFilter');
    const searchText = document.getElementById('wordSearch');
    
    if (sentimentFilter) sentimentFilter.value = '';
    if (searchText) searchText.value = '';
    
    // Mostrar todos los items
    if (currentDictionary) {
        filteredDictionary = [...currentDictionary];
        displayDictionary(filteredDictionary);
    }
}

// Función para colapsar/expandir la tabla del diccionario
function toggleDictionaryTable() {
    const dictionaryContent = document.getElementById('dictionaryTableContainer');
    const toggleBtn = document.getElementById('toggleDictionary');
    
    if (!dictionaryContent || !toggleBtn) return;
    
    // Toggle clase collapsed en ambos elementos
    dictionaryContent.classList.toggle('collapsed');
    toggleBtn.classList.toggle('collapsed');
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
                <div><strong>Puntuación:</strong> ${data.analysis.normalizedScore !== undefined ? data.analysis.normalizedScore.toFixed(1) : data.analysis.score}</div>
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
            const score = data.analysis.normalizedScore !== undefined ? data.analysis.normalizedScore.toFixed(1) : data.analysis.score;
            alert(`Análisis de "${word}":\nPuntuación: ${score}\nClasificación: ${data.classification}\nConfianza: ${(data.analysis.confidence * 100).toFixed(1)}%`);
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error probando palabra: ' + error.message);
    }
}

// Exportar diccionario a Excel
async function exportDictionaryToExcel() {
    try {
        const response = await fetch('/api/dictionary/export-excel');
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'diccionario-sentimientos.xlsx';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            alert('✅ Diccionario exportado a Excel exitosamente');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error exportando diccionario');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error exportando diccionario a Excel: ' + error.message);
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
            
            // Recargar palabras ignoradas del nuevo diccionario
            await loadIgnoredPhrases();
            
            // Recargar diccionario para actualizar estadísticas y tabla
            await loadDictionary();
            
            // Resetear filtros
            resetDictionaryFilters();
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
            // Recargar palabras ignoradas del nuevo diccionario
            await loadIgnoredPhrases();
            // Recargar diccionario para actualizar estadísticas y tabla
            await loadDictionary();
            // Resetear filtros
            resetDictionaryFilters();
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
            
            // Activar el primer diccionario disponible en la lista
            if (select.options.length > 0) {
                const firstDictFileName = select.options[0].value;
                select.value = firstDictFileName;
                await activateDictionary(firstDictFileName);
            } else {
                // No hay más diccionarios
                alert('⚠️ No quedan diccionarios disponibles');
                // Limpiar estadísticas
                document.getElementById('totalWords').textContent = '0';
                document.getElementById('positiveWords').textContent = '0';
                document.getElementById('negativeWords').textContent = '0';
                document.getElementById('neutralWords').textContent = '0';
            }
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

async function generateSubjectTeacherReport() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) {
        alert('⚠️ No se encontró el archivo original. Por favor selecciona un archivo primero.');
        return;
    }

    const columnConfig = window.getCurrentColumnConfig ? window.getCurrentColumnConfig() : null;

    if (!columnConfig || !columnConfig.name) {
        alert('⚠️ Por favor selecciona una configuración de columnas antes de generar el reporte.\n\nPuedes seleccionarla en el dropdown junto al botón "Analizar".');
        return;
    }

    const btn = document.getElementById('subjectTeacherReportBtn');
    const loading = document.getElementById('loading');

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span>Generando reporte...';
        loading.classList.remove('hidden');
        loading.querySelector('p').textContent = 'Generando reporte cuantitativo por materia y docente...';

        const formData = new FormData();
        formData.append('excelFile', file);
        formData.append('columnConfig', JSON.stringify(columnConfig));

        // Si hay filtros activos, incluir índices filtrados
        const dataToExport = filteredResults && filteredResults.length > 0 ? filteredResults : (currentResults ? currentResults.results : null);
        if (filteredResults && filteredResults.length > 0) {
            const filteredIndices = filteredResults.map(item => item.row - 1);
            formData.append('filteredIndices', JSON.stringify(filteredIndices));
        }

        const response = await fetch('/api/generate-subject-teacher-report', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error generando el reporte');
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = 'reporte-materia-docente.xlsx';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(downloadUrl);

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error generando el reporte: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span class="btn-icon">📊</span>Generar Reporte Materia/Docente';
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

// Helpers para el box de sentimiento predominante
function getSentimentStatCardClass(sentiment) {
    if (!sentiment) return '';
    const s = sentiment.toLowerCase();
    if (s.includes('muy positiv')) return 'sentiment-muy-positivo';
    if (s.includes('positiv'))     return 'sentiment-positive';
    if (s.includes('neutral'))     return 'sentiment-neutral';
    if (s.includes('muy negativ')) return 'sentiment-muy-negativo';
    if (s.includes('negativ'))     return 'sentiment-negative';
    return '';
}

function getSentimentIcon(sentiment) {
    if (!sentiment) return '🎭';
    const s = sentiment.toLowerCase();
    if (s.includes('muy positiv')) return '😄';
    if (s.includes('positiv'))     return '😊';
    if (s.includes('neutral'))     return '😐';
    if (s.includes('muy negativ')) return '😠';
    if (s.includes('negativ'))     return '😞';
    return '🎭';
}

// Función helper para obtener clase CSS del sentimiento
function getSentimentClass(score) {
    if (score > 1) return 'positive';
    if (score < -1) return 'negative';
    return 'neutral';
}

// ============= NUEVO: Funciones para análisis con columna de validación =============

async function analyzeWithValidationColumn() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('⚠️ Por favor selecciona un archivo Excel primero');
        return;
    }

    // Obtener configuración de columnas actual
    const columnConfig = window.getCurrentColumnConfig ? window.getCurrentColumnConfig() : null;
    
    if (!columnConfig || !columnConfig.name) {
        alert('⚠️ Por favor selecciona una configuración de columnas primero');
        return;
    }
    
    console.log('📋 Analizando con columna de validación...');
    console.log('Configuración de columnas:', columnConfig);

    const formData = new FormData();
    formData.append('excelFile', file);
    formData.append('columnConfig', JSON.stringify(columnConfig));

    try {
        // Limpiar análisis anterior
        cleanupMemory();
        
        // Mostrar loading
        const loading = document.getElementById('loading');
        loading.querySelector('p').textContent = '📋 Analizando con columna de validación...';
        loading.classList.remove('hidden');

        const response = await fetch('/api/analyze-with-validation-column', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            currentResults = data;
            currentResults.originalFilename = file.name;
            displayResults(data);
            
            // Mostrar mensaje de éxito
            showNotification(`✅ Análisis completado: ${data.totalResponses} registros procesados con columna "${data.validationColumn}"`, 'success');
        } else {
            throw new Error(data.error || 'Error procesando el archivo');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error: ' + error.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

async function generateValidationReport() {
    // Validar que haya resultados analizados
    if (!currentResults || !currentResults.results) {
        alert('⚠️ Por favor analiza el archivo con "Analizar con Columna Validación" primero');
        return;
    }

    // Validar que sea un análisis de validación
    if (currentResults.engine !== 'validation-column') {
        alert('⚠️ Este botón es solo para análisis con columna de validación.\n\nPara generar un reporte del análisis normal, usa el botón "Generar Reporte XLSX Completo" de arriba.');
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
    
    if (!columnConfig || !columnConfig.name) {
        alert('⚠️ Por favor selecciona una configuración de columnas');
        return;
    }

    const validationBtn = document.getElementById('validationReportBtn');
    const loading = document.getElementById('loading');
    
    try {
        // Deshabilitar botón y mostrar loading
        validationBtn.disabled = true;
        validationBtn.innerHTML = '<span class="btn-icon">⏳</span>Generando...';
        loading.classList.remove('hidden');
        
        // Determinar qué datos exportar (filtrados o todos)
        const dataToExport = filteredResults.length > 0 ? filteredResults : currentResults.results;
        const isFiltered = filteredResults.length > 0;
        
        if (isFiltered) {
            loading.querySelector('p').textContent = `Generando reporte con ${dataToExport.length} resultados filtrados...`;
            console.log(`📊 Exportando ${dataToExport.length} resultados filtrados`);
        } else {
            loading.querySelector('p').textContent = 'Generando reporte con columna de validación...';
            console.log(`📊 Exportando todos los ${dataToExport.length} resultados`);
        }

        // Crear FormData
        const formData = new FormData();
        formData.append('excelFile', file);
        formData.append('columnConfig', JSON.stringify(columnConfig));
        
        // Si hay filtros, enviar los índices
        if (isFiltered) {
            const filteredIndices = dataToExport.map(item => item.row - 1);
            formData.append('filteredIndices', JSON.stringify(filteredIndices));
            
            if (filteredStats) {
                formData.append('statistics', JSON.stringify(filteredStats));
            }
        } else {
            if (filteredStats) {
                formData.append('statistics', JSON.stringify(filteredStats));
            } else if (currentResults && currentResults.statistics) {
                formData.append('statistics', JSON.stringify(currentResults.statistics));
            }
        }

        // Hacer petición al endpoint de reporte validación
        const response = await fetch('/api/generate-validation-report', {
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
        downloadLink.download = 'reporte-validacion.xlsx';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(downloadUrl);

        // Mostrar mensaje de éxito
        showNotification('✅ Reporte con columna de validación generado exitosamente', 'success');

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error generando el reporte: ' + error.message);
    } finally {
        // Restaurar botón y ocultar loading
        validationBtn.disabled = false;
        validationBtn.innerHTML = '<span class="btn-icon">📊</span>Generar Reporte Validación';
        loading.classList.add('hidden');
    }
}

// ============= FIN: Funciones para análisis con columna de validación =============

// ===== GESTIÓN DE PALABRAS IGNORADAS =====

// Cargar versión de la aplicación
async function loadAppVersion() {
    try {
        const response = await fetch('/api/version');
        const data = await response.json();
        if (data.version) {
            document.getElementById('app-version').textContent = data.version;
        }
    } catch (error) {
        console.error('Error cargando versión:', error);
        document.getElementById('app-version').textContent = '2.0.0';
    }
}

// Cargar palabras ignoradas
async function loadIgnoredPhrases() {
    try {
        // Agregar timestamp para evitar caché del navegador
        const response = await fetch(`/api/ignored-phrases?t=${Date.now()}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        const data = await response.json();
        
        console.log(`📋 Cargadas ${data.count} palabras ignoradas:`, data.phrases);
        
        if (data.success) {
            displayIgnoredPhrases(data.phrases);
            updateIgnoredCount(data.count);
        }
    } catch (error) {
        console.error('Error cargando palabras ignoradas:', error);
        showNotification('Error cargando palabras ignoradas', 'error');
    }
}

// Mostrar palabras ignoradas
function displayIgnoredPhrases(phrases) {
    const container = document.getElementById('ignoredPhrasesList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (phrases.length === 0) {
        container.innerHTML = '<div class="empty-state">No hay palabras ignoradas. Agrega algunas para filtrar comentarios vacíos o irrelevantes.</div>';
        return;
    }
    
    phrases.forEach(phrase => {
        const item = document.createElement('div');
        item.className = 'ignored-phrase-item';
        item.innerHTML = `
            <span class="ignored-phrase-text">${escapeHtml(phrase)}</span>
            <button class="remove-ignored-btn" data-phrase="${escapeHtml(phrase)}" title="Eliminar">✖</button>
        `;
        
        const removeBtn = item.querySelector('.remove-ignored-btn');
        removeBtn.addEventListener('click', () => removeIgnoredPhrase(phrase));
        
        container.appendChild(item);
    });
}

// Actualizar contador de palabras ignoradas
function updateIgnoredCount(count) {
    const countEl = document.getElementById('ignoredCount');
    if (countEl) {
        countEl.textContent = count;
    }
}

// Agregar palabra ignorada
async function addIgnoredPhrase() {
    const input = document.getElementById('newIgnoredPhrase');
    if (!input) return;
    
    const phrase = input.value.trim();
    
    if (!phrase) {
        showNotification('Por favor ingresa una palabra o frase', 'warning');
        return;
    }
    
    try {
        const response = await fetch('/api/ignored-phrases/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phrase })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Frase "${phrase}" agregada a la lista de ignoradas`, 'success');
            input.value = '';
            loadIgnoredPhrases(); // Recargar lista
        } else {
            showNotification(data.error || 'Error agregando frase', 'error');
        }
    } catch (error) {
        console.error('Error agregando frase ignorada:', error);
        showNotification('Error agregando frase a la lista', 'error');
    }
}

// Eliminar palabra ignorada
async function removeIgnoredPhrase(phrase) {
    if (!confirm(`¿Eliminar "${phrase}" de la lista de ignoradas?`)) {
        return;
    }
    
    try {
        const response = await fetch(`/api/ignored-phrases/remove/${encodeURIComponent(phrase)}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Frase "${phrase}" eliminada de la lista`, 'success');
            loadIgnoredPhrases(); // Recargar lista
        } else {
            showNotification(data.error || 'Error eliminando frase', 'error');
        }
    } catch (error) {
        console.error('Error eliminando frase ignorada:', error);
        showNotification('Error eliminando frase', 'error');
    }
}

// Función helper para escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#ffc107'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}