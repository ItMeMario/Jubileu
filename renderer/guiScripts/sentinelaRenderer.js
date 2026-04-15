/**
 * sentinelaRenderer.js
 * Lógica do dashboard do Sentinela - Mapeamento interativo de DDDs + Import CSV
 */

// ========================================
// Dicionário de DDDs por Estado
// ========================================
const dddData = {
    'Acre': { uf: 'AC', ddds: [68] },
    'Alagoas': { uf: 'AL', ddds: [82] },
    'Amapá': { uf: 'AP', ddds: [96] },
    'Amazonas': { uf: 'AM', ddds: [92, 97] },
    'Bahia': { uf: 'BA', ddds: [71, 73, 74, 75, 77] },
    'Ceará': { uf: 'CE', ddds: [85, 88] },
    'Distrito Federal': { uf: 'DF', ddds: [61] },
    'Espírito Santo': { uf: 'ES', ddds: [27, 28] },
    'Goiás': { uf: 'GO', ddds: [62, 64] },
    'Maranhão': { uf: 'MA', ddds: [98, 99] },
    'Mato Grosso': { uf: 'MT', ddds: [65, 66] },
    'Mato Grosso do Sul': { uf: 'MS', ddds: [67] },
    'Minas Gerais': { uf: 'MG', ddds: [31, 32, 33, 34, 35, 37, 38] },
    'Pará': { uf: 'PA', ddds: [91, 93, 94] },
    'Paraíba': { uf: 'PB', ddds: [83] },
    'Paraná': { uf: 'PR', ddds: [41, 42, 43, 44, 45, 46] },
    'Pernambuco': { uf: 'PE', ddds: [81, 87] },
    'Piauí': { uf: 'PI', ddds: [86, 89] },
    'Rio de Janeiro': { uf: 'RJ', ddds: [21, 22, 24] },
    'Rio Grande do Norte': { uf: 'RN', ddds: [84] },
    'Rio Grande do Sul': { uf: 'RS', ddds: [51, 53, 54, 55] },
    'Rondônia': { uf: 'RO', ddds: [69] },
    'Roraima': { uf: 'RR', ddds: [95] },
    'Santa Catarina': { uf: 'SC', ddds: [47, 48, 49] },
    'São Paulo': { uf: 'SP', ddds: [11, 12, 13, 14, 15, 16, 17, 18, 19] },
    'Sergipe': { uf: 'SE', ddds: [79] },
    'Tocantins': { uf: 'TO', ddds: [63] }
};

// ========================================
// State Management
// ========================================
let currentCSVContent = null;
let currentPage = 0;
const pageSize = 50;
let currentDDDFilter = '';

// ========================================
// Tab Navigation
// ========================================
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update content
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(`tab-${targetTab}`).classList.add('active');

            // Trigger resize for ECharts when switching to mapa
            if (targetTab === 'mapa') {
                window.dispatchEvent(new Event('resize'));
            }

            // Load data when switching to registros
            if (targetTab === 'registros') {
                loadRegistros();
                loadStats();
            }
        });
    });
}

// ========================================
// Import CSV Logic
// ========================================
function initImport() {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('csv-file-input');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const btnRemoveFile = document.getElementById('btn-remove-file');
    const btnImport = document.getElementById('btn-import');

    // Click on drop zone → triggers file input
    dropZone.addEventListener('click', (e) => {
        if (e.target.tagName !== 'LABEL' && e.target.tagName !== 'INPUT') {
            fileInput.click();
        }
    });

    // Drag and Drop events
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await handleFile(files[0]);
        }
    });

    // File input change
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await handleFile(e.target.files[0]);
        }
    });

    // Remove file
    btnRemoveFile.addEventListener('click', () => {
        currentCSVContent = null;
        fileInfo.classList.add('hidden');
        btnImport.disabled = true;
        fileInput.value = '';
    });

    // Import button
    btnImport.addEventListener('click', async () => {
        if (!currentCSVContent) return;
        await executeImport();
    });
}

/**
 * Processa o arquivo selecionado
 */
async function handleFile(file) {
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
        showImportError('Apenas arquivos .csv são aceitos.');
        return;
    }

    try {
        const result = await window.fileAPI.readFile(file);

        if (!result.success) {
            showImportError('Erro ao ler o arquivo: ' + (result.error || 'desconhecido'));
            return;
        }

        currentCSVContent = result.content;

        // Show file info
        const fileInfo = document.getElementById('file-info');
        document.getElementById('file-name').textContent = result.name;
        document.getElementById('file-size').textContent = formatFileSize(result.size);
        fileInfo.classList.remove('hidden');

        // Enable import
        document.getElementById('btn-import').disabled = false;

    } catch (error) {
        showImportError('Erro ao processar arquivo: ' + error.message);
    }
}

/**
 * Executa a importação do CSV
 */
async function executeImport() {
    const btnImport = document.getElementById('btn-import');
    const spinner = document.getElementById('import-spinner');

    // Disable button and show spinner
    btnImport.disabled = true;
    spinner.classList.remove('hidden');
    btnImport.textContent = ' Importando...';
    btnImport.prepend(spinner);

    try {
        const result = await window.sentinelaAPI.importCSV(currentCSVContent);
        showImportResult(result);

        // Clear file after import
        currentCSVContent = null;
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('csv-file-input').value = '';

    } catch (error) {
        showImportResult({
            success: false,
            error: error.message || 'Erro desconhecido durante importação',
        });
    } finally {
        // Reset button
        btnImport.disabled = true;
        spinner.classList.add('hidden');
        btnImport.innerHTML = 'Importar Dados';
    }
}

/**
 * Exibe resultado da importação
 */
function showImportResult(result) {
    const container = document.getElementById('import-result');

    if (!result.success && result.error) {
        container.innerHTML = `
            <div class="result-banner error animate-in">
                ❌ ${escapeHtml(result.error)}
            </div>
        `;
        return;
    }

    let html = `
        <div class="result-banner success animate-in">
            ✅ ${escapeHtml(result.message || 'Importação concluída!')}
        </div>

        <div class="result-summary animate-in">
            <div class="result-item">
                <span class="result-label">Adicionados</span>
                <span class="result-value success">${result.adicionados || 0}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Atualizados</span>
                <span class="result-value updated">${result.atualizados || 0}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Ignorados</span>
                <span class="result-value ignored">${result.ignorados || 0}</span>
            </div>
            <div class="result-item">
                <span class="result-label">Erros</span>
                <span class="result-value error">${result.totalErros || 0}</span>
            </div>
        </div>
    `;

    // Show ignored details
    if (result.detalhesIgnorados && result.detalhesIgnorados.length > 0) {
        html += `
            <div class="result-details animate-in">
                <h3>📝 Linhas Ignoradas (${result.detalhesIgnorados.length})</h3>
                <ul class="detail-list">
                    ${result.detalhesIgnorados.map(item => `
                        <li>
                            <span>Linha ${item.linha}: ${escapeHtml(item.nome)} - ${escapeHtml(item.numero)}</span>
                            <span class="detail-reason">${escapeHtml(item.motivo)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    // Show error details
    if (result.erros && result.erros.length > 0) {
        html += `
            <div class="result-details animate-in">
                <h3>❌ Erros (${result.erros.length})</h3>
                <ul class="detail-list">
                    ${result.erros.map(item => `
                        <li>
                            <span>Linha ${item.linha}: ${escapeHtml(item.nome)} - ${escapeHtml(item.numero)}</span>
                            <span class="detail-reason">${escapeHtml(item.erro)}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    container.innerHTML = html;
}

/**
 * Exibe mensagem de erro no import
 */
function showImportError(message) {
    const container = document.getElementById('import-result');
    container.innerHTML = `
        <div class="result-banner error animate-in">
            ❌ ${escapeHtml(message)}
        </div>
    `;
}

// ========================================
// Registros Tab Logic
// ========================================
function initRegistros() {
    // Filter buttons
    document.getElementById('btn-filter-registros').addEventListener('click', () => {
        currentDDDFilter = document.getElementById('filter-ddd-input').value.trim();
        currentPage = 0;
        loadRegistros();
    });

    document.getElementById('btn-clear-filter-registros').addEventListener('click', () => {
        document.getElementById('filter-ddd-input').value = '';
        currentDDDFilter = '';
        currentPage = 0;
        loadRegistros();
    });

    // Refresh
    document.getElementById('btn-refresh-registros').addEventListener('click', () => {
        loadRegistros();
        loadStats();
    });

    document.getElementById('btn-clear-all').addEventListener('click', async () => {
        const result = await new Promise((resolve) => {
            const overlay = document.createElement("div");
            overlay.className = "modal-overlay";
            overlay.style.display = "flex";
            
            overlay.innerHTML = `
              <div class="modal-content" style="min-width: 350px;">
                <h3 style="margin-bottom: 5px;">Filtrar Exclusão</h3>
                <p style="margin-bottom: 20px; font-size: 14px; color: #ccc;">Selecione o filtro para os registros que deseja remover.</p>
                
                <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-size: 14px;">Filtrar por:</label>
                        <select id="modal-clear-type" class="modern-select" style="width: 100%;">
                            <option value="todos">Todos os Registros</option>
                            <option value="ddd">DDD</option>
                            <option value="date">Data</option>
                            <option value="priority">Prioridade</option>
                        </select>
                    </div>
                    
                    <div id="modal-clear-input-container" style="display: none;">
                        <input type="text" id="modal-clear-text" class="modern-input" style="display:none; width: 100%;" placeholder="Ex: 11" maxlength="2">
                        <input type="date" id="modal-clear-date" class="modern-input" style="display:none; width: 100%;">
                        <input type="number" id="modal-clear-number" class="modern-input" style="display:none; width: 100%;" min="1" placeholder="Ex: 1">
                    </div>
                </div>

                <div class="modal-buttons" style="display: flex; justify-content: flex-end; gap: 10px;">
                  <button class="btn btn-secondary confirm-btn-cancel">Cancelar</button>
                  <button class="btn btn-danger confirm-btn-action">Avançar</button>
                </div>
              </div>
            `;
        
            document.body.appendChild(overlay);
        
            const typeSelect = overlay.querySelector("#modal-clear-type");
            const inputContainer = overlay.querySelector("#modal-clear-input-container");
            const textInput = overlay.querySelector("#modal-clear-text");
            const dateInput = overlay.querySelector("#modal-clear-date");
            const numberInput = overlay.querySelector("#modal-clear-number");
            
            typeSelect.addEventListener("change", () => {
                textInput.style.display = "none";
                dateInput.style.display = "none";
                numberInput.style.display = "none";
                
                if (typeSelect.value === "todos") {
                    inputContainer.style.display = "none";
                } else {
                    inputContainer.style.display = "block";
                    if (typeSelect.value === "ddd") textInput.style.display = "block";
                    if (typeSelect.value === "date") dateInput.style.display = "block";
                    if (typeSelect.value === "priority") numberInput.style.display = "block";
                }
            });

            const btnAction = overlay.querySelector(".confirm-btn-action");
            const btnCancel = overlay.querySelector(".confirm-btn-cancel");
        
            const close = (res) => {
              overlay.remove();
              resolve(res);
            };
        
            btnAction.onclick = () => {
                const type = typeSelect.value;
                const filters = {};
                let message = 'Tem certeza que deseja remover TODOS os registros?';

                if (type === 'ddd') {
                    const val = textInput.value.trim();
                    if (!val) return alert('Por favor, informe o DDD para filtrar.');
                    filters.ddd = val;
                    message = `Tem certeza que deseja remover TODOS os registros do DDD ${val}?`;
                } else if (type === 'date') {
                    const val = dateInput.value;
                    if (!val) return alert('Por favor, selecione uma data para filtrar.');
                    filters.date = val;
                    const formattedDate = val.split('-').reverse().join('/');
                    message = `Tem certeza que deseja remover TODOS os registros da data ${formattedDate}?`;
                } else if (type === 'priority') {
                    const val = numberInput.value;
                    if (!val) return alert('Por favor, informe a prioridade para filtrar.');
                    filters.priority = parseInt(val, 10);
                    message = `Tem certeza que deseja remover TODOS os registros com prioridade ${val}?`;
                }
                message += ' Esta ação não pode ser desfeita.';

                close({ proceed: true, filters, message });
            };
            btnCancel.onclick = () => close({ proceed: false });
        });

        if (!result.proceed) return;

        // Confirmation Modal
        if (typeof window.customConfirm === 'function') {
            const confirmed = await window.customConfirm(result.message);
            if (!confirmed) return;
        } else {
            if (!confirm(result.message)) return;
        }

        const clearResult = await window.sentinelaAPI.clearAreaCodes(result.filters);
        if (clearResult.success) {
            loadRegistros();
            loadStats();
        } else {
            alert('Erro ao limpar: ' + clearResult.error);
        }
    });

    // Pagination
    document.getElementById('btn-prev-page').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadRegistros();
        }
    });

    document.getElementById('btn-next-page').addEventListener('click', () => {
        currentPage++;
        loadRegistros();
    });

    // Enter key on DDD filter
    document.getElementById('filter-ddd-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('btn-filter-registros').click();
        }
    });
}

/**
 * Carrega registros da tabela area_codes
 */
async function loadRegistros() {
    const tbody = document.getElementById('registros-tbody');

    try {
        const filters = {
            limit: pageSize,
            offset: currentPage * pageSize,
        };

        if (currentDDDFilter) {
            filters.ddd = currentDDDFilter;
        }

        const result = await window.sentinelaAPI.getAreaCodes(filters);

        if (!result.success) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-table">Erro: ${escapeHtml(result.error)}</td></tr>`;
            return;
        }

        if (result.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-table">Nenhum registro encontrado</td></tr>`;
            updatePagination(0, 0);
            return;
        }

        // Render rows
        tbody.innerHTML = result.data.map(row => {
            const priorityClass = row.priority <= 3 ? `priority-${row.priority}` : 'priority-default';
            const nameClass = row.name ? 'name-cell' : 'name-cell empty';
            const nameText = row.name || '(sem nome)';
            const dateText = row.created_at ? formatDate(row.created_at) : '-';

            return `
                <tr>
                    <td><span class="priority-badge ${priorityClass}">${row.priority}</span></td>
                    <td class="${nameClass}">${escapeHtml(nameText)}</td>
                    <td class="ddd-cell">${escapeHtml(row.ddd || '-')}</td>
                    <td class="tel-cell">${escapeHtml(row.tel || '-')}</td>
                    <td>${dateText}</td>
                </tr>
            `;
        }).join('');

        updatePagination(result.total, result.data.length);

    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-table">Erro: ${escapeHtml(error.message)}</td></tr>`;
    }
}

/**
 * Carrega estatísticas
 */
async function loadStats() {
    try {
        const stats = await window.sentinelaAPI.getImportStats();

        if (stats.success) {
            document.getElementById('stat-total').textContent = stats.total || 0;
            document.getElementById('stat-ddds').textContent = stats.porDDD ? stats.porDDD.length : 0;
            document.getElementById('stat-imports').textContent = stats.porPrioridade ? stats.porPrioridade.length : 0;
        }
    } catch (error) {
        console.error('Erro ao carregar stats:', error);
    }
}

/**
 * Atualiza informações de paginação
 */
function updatePagination(total, loaded) {
    const totalPages = Math.ceil(total / pageSize);
    const currentPageDisplay = total > 0 ? currentPage + 1 : 0;

    document.getElementById('pagination-info').textContent = 
        `Página ${currentPageDisplay} de ${totalPages} (${total} registros)`;

    document.getElementById('btn-prev-page').disabled = currentPage <= 0;
    document.getElementById('btn-next-page').disabled = (currentPage + 1) * pageSize >= total;
}

// ========================================
// Mapa (ECharts) — Preservado do original
// ========================================
async function initMap() {
    const mapElement = document.getElementById('brazil-map');
    if (!mapElement) return;

    const mapChart = echarts.init(mapElement);
    
    // Função para mostrar loading estiloso
    mapChart.showLoading({
        text: 'Carregando mapa...',
        color: '#E91E63',
        textColor: '#fff',
        maskColor: 'rgba(0, 0, 0, 0.4)'
    });

    try {
        // Tentar carregar o GeoJSON usando fetch
        let geoJson;
        try {
            const response = await fetch('../data/brazil-states.json');
            if(response.ok) {
                geoJson = await response.json();
            } else {
                throw new Error("Local fetch failed, trying fallback");
            }
        } catch (fetchErr) {
            console.warn("Fetch failed, tentando carregar via require (Electron):", fetchErr);
            if (typeof require !== 'undefined') {
                const fs = require('fs');
                const path = require('path');
                const rawPath = path.join(__dirname, '../data/brazil-states.json');
                const rawData = fs.readFileSync(rawPath, 'utf-8');
                geoJson = JSON.parse(rawData);
            } else {
                throw new Error("Não foi possível carregar o mapa. Fetch e Require falharam.");
            }
        }

        echarts.registerMap('Brasil', geoJson);

        // Preparamos os dados originais do mapa
        const originalMapData = geoJson.features.map(feature => {
            const nomeEstado = feature.properties.name || feature.properties.NAME_1; 
            
            let estadoKey = Object.keys(dddData).find(k => k === nomeEstado);
            if (!estadoKey) {
                const normalize = s => s && s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                estadoKey = Object.keys(dddData).find(k => normalize(k) === normalize(nomeEstado));
            }

            const stateInfo = estadoKey ? dddData[estadoKey] : { uf: '??', ddds: [] };

            return {
                name: nomeEstado,
                value: stateInfo.ddds.length,
                stateData: stateInfo
            };
        });

        // Configuração do ECharts para o visual "Heatmap"
        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(20, 20, 20, 0.8)',
                borderColor: '#E91E63',
                textStyle: { color: '#fff' },
                formatter: function (params) {
                    if (!params.data) return params.name;
                    const { uf, ddds } = params.data.stateData;
                    return `
                        <div style="font-weight:bold; font-size: 16px; border-bottom:1px solid #e91e63; padding-bottom:5px; margin-bottom:5px;">
                            ${params.name} (${uf})
                        </div>
                        <div>Total de DDDs: <span style="color:#E91E63; font-weight:bold">${ddds.length}</span></div>
                        <div style="margin-top:5px; max-width: 200px; white-space: normal;">
                            DDDs: ${ddds.join(', ')}
                        </div>
                    `;
                }
            },
            visualMap: {
                show: false,
                min: 1,
                max: 9,
                inRange: {
                    color: ['#1e1e1e', '#611632', '#9c1c44', '#E91E63', '#ff4081']
                },
                outOfRange: {
                    color: ['#111111']
                }
            },
            series: [
                {
                    name: 'DDDs por Estado',
                    type: 'map',
                    map: 'Brasil',
                    roam: true,
                    scaleLimit: { min: 1, max: 4 },
                    selectedMode: 'single',
                    itemStyle: {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        borderWidth: 0.5,
                        areaColor: '#2b2b2b'
                    },
                    emphasis: {
                        itemStyle: {
                            areaColor: '#F06292',
                            borderColor: '#fff',
                            borderWidth: 1,
                            shadowBlur: 10,
                            shadowColor: '#E91E63'
                        },
                        label: {
                            show: true,
                            color: '#fff',
                            fontWeight: 'bold'
                        }
                    },
                    select: {
                        itemStyle: {
                            areaColor: '#C2185B',
                            borderColor: '#fff',
                            borderWidth: 2
                        },
                        label: {
                            show: true,
                            color: '#fff'
                        }
                    },
                    data: originalMapData
                }
            ]
        };

        mapChart.hideLoading();
        mapChart.setOption(option);

        // Evento para atualizar o painel lateral ao passar o mouse ou clicar
        mapChart.on('mouseover', function (params) {
            if (params.data && params.data.stateData) {
                updateSidebar(params.name, params.data.stateData);
            }
        });

        // Filtro Customizado
        document.getElementById('btn-apply-filter').addEventListener('click', () => {
            const operator = document.getElementById('filter-operator').value;
            const val = parseInt(document.getElementById('filter-value').value, 10);

            const filteredData = originalMapData.map(item => {
                const count = item.stateData.ddds.length;
                let match = false;
                if (operator === '<=') match = count <= val;
                else if (operator === '>=') match = count >= val;
                else if (operator === '==') match = count === val;

                if (match) return item;
                
                return {
                    ...item,
                    value: -1,
                    itemStyle: {
                        areaColor: '#151515',
                        borderColor: '#2a2a2a'
                    }
                };
            });

            mapChart.setOption({
                series: [{ data: filteredData }]
            });
        });

        document.getElementById('btn-clear-filter').addEventListener('click', () => {
            document.getElementById('filter-operator').value = '<=';
            document.getElementById('filter-value').value = 1;
            mapChart.setOption({
                series: [{ data: originalMapData }]
            });
        });

        // Permite re-ajustar a janela
        window.addEventListener('resize', () => {
            mapChart.resize();
        });

    } catch (error) {
        console.error("Erro ao inicializar ECharts:", error);
        const mapElement = document.getElementById('brazil-map');
        if (mapElement) {
            mapElement.innerHTML = `
                <div style="color:#F44336; padding: 20px; text-align: center;">
                    <h3>❌ Erro ao renderizar o mapa.</h3>
                    <p>Verifique o console para mais detalhes.</p>
                    <p style="font-size: 12px; color: #888;">${error.message}</p>
                </div>
            `;
        }
    }
}

// Atualiza a barra lateral com as informações do estado selecionado/focado
function updateSidebar(stateName, stateData) {
    const infoContainer = document.getElementById('region-info');
    
    if (!stateData || !stateData.ddds.length) {
        infoContainer.innerHTML = `<p class="placeholder-text">Sem dados para este estado.</p>`;
        return;
    }

    const dddsHtml = stateData.ddds.map(d => `<span class="ddd-item">${d}</span>`).join('');

    infoContainer.innerHTML = `
        <div class="state-name">
            ${stateName} <span class="state-badge">${stateData.uf}</span>
        </div>
        
        <div class="stats-container">
            <div class="stat-row">
                <span>Quantidade de DDDs</span>
                <span class="stat-value">${stateData.ddds.length}</span>
            </div>
            <div class="stat-row">
                <span>Status da Região</span>
                <span class="stat-value" style="color: #4CAF50;">Mapeada</span>
            </div>
        </div>

        <h3 style="margin-top: 20px; font-size: 16px; color: #aaa;">Códigos de Área (DDD):</h3>
        <div class="ddd-list">
            ${dddsHtml}
        </div>
    `;
}

// ========================================
// Utility Functions
// ========================================

/**
 * Formata tamanho de arquivo em bytes para legível
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Formata data ISO para exibição
 */
function formatDate(dateStr) {
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return dateStr;
    }
}

/**
 * Escape HTML para prevenir XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    initTabs();
    initImport();
    initRegistros();
    await initMap();
});
