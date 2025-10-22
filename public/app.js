// Variables globales
let currentResults = null;
let sentimentChart = null;
let categoryChart = null;
let currentPage = 1;
const ITEMS_PER_PAGE = 50; // Limitar a 50 resultados por página
let filteredResults = [];

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
    document.getElementById('exportJson').addEventListener('click', () => exportResults('json'));
    document.getElementById('exportCsv').addEventListener('click', () => exportResults('csv'));
    
    // Event listener para reporte avanzado XLSX
    document.getElementById('advancedReportBtn').addEventListener('click', function() {
        generateAdvancedReport();
    });
    
    // Event listener para limpieza manual de memoria
    document.getElementById('cleanMemory').addEventListener('click', () => {
        cleanupMemory();
        alert('✅ Memoria limpiada exitosamente');
    });

    // Event listeners para navegación entre secciones
    document.getElementById('analysisTab').addEventListener('click', () => showSection('analysis'));
    document.getElementById('dictionaryTab').addEventListener('click', () => showSection('dictionary'));
    document.getElementById('comparisonTab').addEventListener('click', () => showSection('comparison'));

    // Event listeners para gestión del diccionario
    document.getElementById('refreshDictionary').addEventListener('click', loadDictionary);
    document.getElementById('sentimentFilter').addEventListener('change', filterDictionary);
    document.getElementById('wordSearch').addEventListener('input', filterDictionary);
    
    // Event listener para el slider de puntuación
    document.getElementById('sentimentScore').addEventListener('input', updateScoreDisplay);
    
    // Event listeners para entrenamiento
    document.getElementById('addWord').addEventListener('click', addWordToDictionary);
    document.getElementById('testWord').addEventListener('click', testWordAnalysis);
    
    // Event listeners para gestión de archivos
    document.getElementById('exportDictionary').addEventListener('click', exportDictionary);
    document.getElementById('importDictionary').addEventListener('click', () => {
        document.getElementById('dictionaryFileInput').click();
    });
    document.getElementById('dictionaryFileInput').addEventListener('change', importDictionary);
    document.getElementById('resetDictionary').addEventListener('click', resetDictionary);

    // Inicializar display del score
    updateScoreDisplay();

    // Event listeners para filtros
    document.getElementById('filterSentiment').addEventListener('change', filterResults);
    document.getElementById('searchText').addEventListener('input', filterResults);
});

// Función para analizar el archivo
async function analyzeFile() {
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Por favor selecciona un archivo Excel');
        return;
    }

    // Obtener motor seleccionado
    const selectedEngine = document.querySelector('input[name="analysisEngine"]:checked').value;
    console.log('Motor seleccionado:', selectedEngine);

    const formData = new FormData();
    formData.append('excelFile', file);

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
    document.getElementById('totalResponses').textContent = data.totalResponses;
    
    // Verificar que statistics existe y tiene averageScore
    const averageScore = data.statistics && typeof data.statistics.averageScore === 'number' 
        ? data.statistics.averageScore 
        : 5;
    document.getElementById('averageScore').textContent = averageScore.toFixed(2);
    
    // Verificar que percentages existen
    const percentages = data.statistics?.percentages || {
        'Muy Positivo': 0,
        'Positivo': 0,
        'Muy Negativo': 0,
        'Negativo': 0
    };
    
    const positivePercent = parseFloat(percentages['Muy Positivo'] || 0) + 
                          parseFloat(percentages['Positivo'] || 0);
    const negativePercent = parseFloat(percentages['Muy Negativo'] || 0) + 
                          parseFloat(percentages['Negativo'] || 0);
    
    document.getElementById('positivePercent').textContent = positivePercent.toFixed(1) + '%';
    document.getElementById('negativePercent').textContent = negativePercent.toFixed(1) + '%';
    
    // Mostrar motor utilizado
    const engineIcon = document.getElementById('engineIcon');
    const usedEngine = document.getElementById('usedEngine');
    
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

    // Crear gráficos
    createSentimentChart(data.statistics);
    createCategoryChart(data.statistics);

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
    const ctx = document.getElementById('sentimentChart').getContext('2d');
    
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
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
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

// Filtrar resultados optimizado
function filterResults() {
    if (!currentResults) return;

    const sentimentFilter = document.getElementById('filterSentiment').value;
    const searchText = document.getElementById('searchText').value.toLowerCase();

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

    displayResultsTable(filteredResults);
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
    // Ocultar todas las secciones
    document.getElementById('analysisSection').classList.add('hidden');
    document.getElementById('dictionarySection').classList.add('hidden');
    document.getElementById('comparisonSection').classList.add('hidden');
    
    // Remover clase active de todas las pestañas
    document.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
    
    // Mostrar sección seleccionada
    if (sectionName === 'analysis') {
        document.getElementById('analysisSection').classList.remove('hidden');
        document.getElementById('analysisTab').classList.add('active');
    } else if (sectionName === 'dictionary') {
        document.getElementById('dictionarySection').classList.remove('hidden');
        document.getElementById('dictionaryTab').classList.add('active');
        loadDictionary(); // Cargar diccionario cuando se muestra la sección
    } else if (sectionName === 'comparison') {
        document.getElementById('comparisonSection').classList.remove('hidden');
        document.getElementById('comparisonTab').classList.add('active');
        initializeComparison(); // Inicializar sección de comparación
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
    
    const formData = new FormData();
    formData.append('dictionaryFile', file);
    
    try {
        const response = await fetch('/api/dictionary/import', {
            method: 'POST',
            body: formData
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
        alert('Error importando diccionario: ' + error.message);
    }
    
    // Limpiar input
    event.target.value = '';
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
    await checkPythonStatus();
    await loadAvailableEngines();
    setupComparisonEventListeners();
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
    document.getElementById('compareEngines').addEventListener('click', compareEngines);
    
    // Botón de recheck Python
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
    const fileInput = document.getElementById('excelFile');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('⚠️ Por favor selecciona un archivo Excel primero');
        return;
    }

    const advancedBtn = document.getElementById('advancedReportBtn');
    const loading = document.getElementById('loading');
    
    try {
        // Deshabilitar botón y mostrar loading
        advancedBtn.disabled = true;
        advancedBtn.innerHTML = '<span class="btn-icon">⏳</span>Generando reporte...';
        loading.classList.remove('hidden');
        loading.querySelector('p').textContent = 'Generando reporte avanzado XLSX con análisis de sentimientos...';

        // Crear FormData
        const formData = new FormData();
        formData.append('excelFile', file);

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