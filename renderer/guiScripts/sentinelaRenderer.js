/**
 * sentinelaRenderer.js
 * Lógica do dashboard do Sentinela - Mapeamento interativo de DDDs
 */

// Dicionário de DDDs por Estado
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

document.addEventListener('DOMContentLoaded', async () => {
    const mapChart = echarts.init(document.getElementById('brazil-map'));
    
    // Função para mostrar loading estiloso
    mapChart.showLoading({
        text: 'Carregando mapa...',
        color: '#E91E63',
        textColor: '#fff',
        maskColor: 'rgba(0, 0, 0, 0.4)'
    });

    try {
        // Tentar carregar o GeoJSON usando fetch (funciona se for servido localmente ou configurado)
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
            // Fallback para require do Node (se nodeIntegration estiver ativado)
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
            // Em alguns geojsons a propriedade é 'name' ou 'NAME_1'
            const nomeEstado = feature.properties.name || feature.properties.NAME_1; 
            
            // Tratamento caso haja pequena divergencia de nome
            let estadoKey = Object.keys(dddData).find(k => k === nomeEstado);
            if (!estadoKey) {
                // Tenta achar ignorando acentos ou lowercase
                const normalize = s => s && s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                estadoKey = Object.keys(dddData).find(k => normalize(k) === normalize(nomeEstado));
            }

            const stateInfo = estadoKey ? dddData[estadoKey] : { uf: '??', ddds: [] };

            return {
                name: nomeEstado,
                value: stateInfo.ddds.length, // O valor do mapa de calor será a qtd de DDDs
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
                show: false, // Custom HTML filter used instead
                min: 1,
                max: 9, // SP tem 9 DDDs
                inRange: {
                    // Paleta "Heatmap" estilizada para o projeto
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
                    roam: true, // Permite zoom e pan
                    scaleLimit: { min: 1, max: 4 }, // Limita o zoom
                    selectedMode: 'single', // Permite selecionar um estado
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
                    value: -1, // Force outOfRange
                    itemStyle: {
                        areaColor: '#151515', // Visual indication of exclusion
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
        mapChart.hideLoading();
        document.getElementById('brazil-map').innerHTML = `
            <div style="color:#F44336; padding: 20px; text-align: center;">
                <h3>❌ Erro ao renderizar o mapa.</h3>
                <p>Verifique o console para mais detalhes.</p>
                <p style="font-size: 12px; color: #888;">${error.message}</p>
            </div>
        `;
    }
});

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
