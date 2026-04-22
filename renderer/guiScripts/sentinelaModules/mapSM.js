// renderer/guiScripts/sentinelaModules/mapSM.js
import { dddData } from './dataSM.js';

export default class MapSM {
    constructor(manager) {
        this.manager = manager;
    }

    async initMap() {
        const mapElement = document.getElementById('brazil-map');
        if (!mapElement) return;

        this.manager.mapChart = echarts.init(mapElement);
        const mapChart = this.manager.mapChart;
        
        mapChart.showLoading({
            text: 'Carregando mapa...',
            color: '#E91E63',
            textColor: '#fff',
            maskColor: 'rgba(0, 0, 0, 0.4)'
        });

        try {
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

            let maxNumeros = 1;

            const originalMapData = geoJson.features.map(feature => {
                const nomeEstado = feature.properties.name || feature.properties.NAME_1; 
                
                let estadoKey = Object.keys(dddData).find(k => k === nomeEstado);
                if (!estadoKey) {
                    const normalize = s => s && s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
                    estadoKey = Object.keys(dddData).find(k => normalize(k) === normalize(nomeEstado));
                }

                const stateInfo = estadoKey ? dddData[estadoKey] : { uf: '??', ddds: [] };

                const totalNumeros = stateInfo.ddds.reduce((sum, ddd) => sum + (this.manager.globalDDDStats[ddd.toString()] || 0), 0);
                if (totalNumeros > maxNumeros) maxNumeros = totalNumeros;

                return {
                    name: nomeEstado,
                    value: totalNumeros,
                    stateData: stateInfo
                };
            });

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
                        const val = params.data.value;
                        return `
                            <div style="font-weight:bold; font-size: 16px; border-bottom:1px solid #e91e63; padding-bottom:5px; margin-bottom:5px;">
                                ${params.name} (${uf})
                            </div>
                            <div>Números Registrados: <span style="color:#E91E63; font-weight:bold">${val}</span></div>
                            <div style="margin-top:5px; max-width: 200px; white-space: normal;">
                                DDDs: ${ddds.join(', ')}
                            </div>
                        `;
                    }
                },
                visualMap: {
                    show: false,
                    min: 0,
                    max: maxNumeros,
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
            this.manager.originalMapOption = option;
            mapChart.setOption(option);

            mapChart.on('mouseover', (params) => {
                if (params.data && params.data.stateData) {
                    this.updateSidebar(params.name, params.data.stateData);
                }
            });

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

    updateSidebar(stateName, stateData) {
        const infoContainer = document.getElementById('region-info');
        
        if (!stateData || !stateData.ddds.length) {
            infoContainer.innerHTML = `<p class="placeholder-text">Sem dados para este estado.</p>`;
            return;
        }

        const dddStatsList = stateData.ddds.map(ddd => {
            return {
                ddd: ddd,
                count: this.manager.globalDDDStats[ddd.toString()] || 0
            };
        });

        dddStatsList.sort((a, b) => b.count - a.count);
        
        const totalNumeros = dddStatsList.reduce((sum, d) => sum + d.count, 0);

        const allDDDStats = Object.keys(this.manager.globalDDDStats).map(ddd => ({
            ddd: ddd,
            count: this.manager.globalDDDStats[ddd]
        }));
        allDDDStats.sort((a, b) => b.count - a.count);
        const top5Geral = allDDDStats.slice(0, 5).filter(d => d.count > 0);
        
        let top5Html = '';
        if (top5Geral.length > 0) {
            top5Html = `
                <div style="margin-top: 15px; padding: 12px; background: rgba(233, 30, 99, 0.05); border-radius: 8px; border: 1px solid rgba(233, 30, 99, 0.2);">
                    <h4 style="margin: 0 0 10px 0; color: #E91E63; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">🏆 Top 5 DDDs (Geral)</h4>
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        ${top5Geral.map((d, index) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px;">
                                <span><strong style="color: #ccc; margin-right: 5px;">${index + 1}º</strong> DDD ${d.ddd}</span>
                                <span style="font-weight: bold; color: #fff; background: #E91E63; padding: 2px 6px; border-radius: 10px; font-size: 11px;">${d.count}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        const dddsHtml = dddStatsList.map(d => {
            const hasNumbers = d.count > 0;
            const borderColor = hasNumbers ? 'rgba(233, 30, 99, 0.5)' : 'rgba(255, 255, 255, 0.1)';
            const bgColor = hasNumbers ? 'rgba(233, 30, 99, 0.1)' : 'rgba(0, 0, 0, 0.2)';
            const textColor = hasNumbers ? '#fff' : '#888';
            const countColor = hasNumbers ? '#E91E63' : '#555';
            
            return `
            <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 48px; margin: 3px; padding: 6px 4px; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgColor}; transition: all 0.2s ease;">
                <span style="font-weight: bold; font-size: 14px; color: ${textColor};">${d.ddd}</span>
                <span style="font-size: 10px; font-weight: bold; color: ${countColor}; margin-top: 2px;">${hasNumbers ? d.count : '-'}</span>
            </div>`;
        }).join('');

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
                    <span>Total de Números</span>
                    <span class="stat-value" style="color: ${totalNumeros > 0 ? '#4CAF50' : '#888'}; font-weight: bold;">${totalNumeros}</span>
                </div>
            </div>

            ${top5Html}

            <h3 style="margin-top: 20px; font-size: 13px; color: #aaa; text-transform: uppercase; letter-spacing: 0.5px;">Todos os DDDs:</h3>
            <div class="ddd-list" style="display: flex; flex-wrap: wrap; margin-top: 10px;">
                ${dddsHtml}
            </div>
        `;
    }

    initMapToggles() {
        const btnDdds = document.getElementById('btn-map-ddds');
        const btnEventos = document.getElementById('btn-map-eventos');
        
        if(!btnDdds || !btnEventos) return;

        btnDdds.addEventListener('click', () => {
            this.manager.currentMapMode = 'ddds';
            btnDdds.classList.remove('clear-btn');
            btnDdds.classList.add('apply-btn');
            btnEventos.classList.remove('apply-btn');
            btnEventos.classList.add('clear-btn');
            
            if (this.manager.mapChart && this.manager.originalMapOption) {
                this.manager.mapChart.setOption(this.manager.originalMapOption, true);
            }
            
            document.querySelector('.filter-section').style.display = 'block';
        });

        btnEventos.addEventListener('click', () => {
            this.manager.currentMapMode = 'eventos';
            btnEventos.classList.remove('clear-btn');
            btnEventos.classList.add('apply-btn');
            btnDdds.classList.remove('apply-btn');
            btnDdds.classList.add('clear-btn');
            
            document.querySelector('.filter-section').style.display = 'none';
            this.updateMapForEvents();
        });
    }

    updateMapForEvents() {
        const mapChart = this.manager.mapChart;
        if (!mapChart) return;
        
        const hoje = new Date();
        hoje.setHours(23, 59, 59, 999);
        
        const scatterData = [];
        const cityMap = new Map();
        
        this.manager.allEventsData.forEach(ev => {
            if (ev.lat != null && ev.lng != null) {
                const dataEvento = new Date(ev.data);
                const diffMs = Math.abs(hoje - dataEvento);
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                
                const cityKey = `${ev.cidade}_${ev.estado}`;
                if (!cityMap.has(cityKey)) {
                    cityMap.set(cityKey, {
                        cidade: ev.cidade,
                        estado: ev.estado,
                        lat: ev.lat,
                        lng: ev.lng,
                        mostRecentDate: dataEvento,
                        daysAgo: diffDays,
                        events: [ev]
                    });
                } else {
                    const cData = cityMap.get(cityKey);
                    cData.events.push(ev);
                    if (diffDays < cData.daysAgo) {
                        cData.mostRecentDate = dataEvento;
                        cData.daysAgo = diffDays;
                    }
                }
            }
        });

        let maxDaysAgo = 1;
        cityMap.forEach(cData => {
            if (cData.daysAgo > maxDaysAgo) maxDaysAgo = cData.daysAgo;
        });

        cityMap.forEach((cData) => {
            scatterData.push({
                name: cData.cidade || 'Sem cidade',
                value: [cData.lng, cData.lat, cData.daysAgo],
                cityData: cData
            });
        });

        const heatmapOption = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(20, 20, 20, 0.9)',
                borderColor: '#ff9800',
                textStyle: { color: '#fff' },
                formatter: function (params) {
                    if (!params.data || !params.data.cityData) return params.name;
                    const cData = params.data.cityData;
                    const sortedEvents = [...cData.events].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
                    
                    let html = `
                        <div style="font-weight:bold; font-size: 16px; border-bottom:1px solid #ff9800; padding-bottom:5px; margin-bottom:5px;">
                            ${cData.cidade || 'Sem cidade'} (${cData.estado || '?'})
                        </div>
                        <div style="font-size: 12px; color: #aaa; margin-bottom: 6px;">Evento mais recente: há ${cData.daysAgo} dia(s)</div>
                    `;
                    
                    const maxEventsToShow = 3;
                    sortedEvents.slice(0, maxEventsToShow).forEach(ev => {
                        const dateParts = ev.data.split('-');
                        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : ev.data;
                        html += `
                            <div style="margin-top: 6px;">
                                <span style="color:#ff9800; font-weight:bold">${ev.titulo}</span><br>
                                <span style="font-size: 12px; color: #ccc;">Data: ${formattedDate}</span>
                            </div>
                        `;
                    });
                    
                    if (sortedEvents.length > maxEventsToShow) {
                        html += `<div style="font-size: 12px; color: #888; margin-top: 8px;">+ ${sortedEvents.length - maxEventsToShow} outro(s) evento(s)</div>`;
                    }
                    return html;
                }
            },
            visualMap: {
                show: true,
                min: 0,
                max: maxDaysAgo,
                dimension: 2,
                calculable: true,
                inRange: {
                    color: ['#f44336', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', '#0d47a1']
                },
                text: ['Antigo', 'Recente'],
                textStyle: {
                    color: '#fff'
                },
                orient: 'vertical',
                right: 10,
                bottom: 20,
                formatter: function (value) {
                    const days = Math.round(value);
                    if (days === 0) return 'Hoje';
                    if (days === 1) return '1 dia';
                    return days + ' dias';
                }
            },
            geo: {
                map: 'Brasil',
                roam: true,
                scaleLimit: { min: 1, max: 6 },
                itemStyle: {
                    areaColor: '#1a1a1a',
                    borderColor: '#333'
                },
                emphasis: {
                    itemStyle: {
                        areaColor: '#2a2a2a'
                    },
                    label: { show: false }
                }
            },
            series: [
                {
                    name: 'Eventos',
                    type: 'effectScatter',
                    coordinateSystem: 'geo',
                    data: scatterData,
                    symbolSize: function (val) {
                        const ratio = maxDaysAgo > 0 ? 1 - (val[2] / maxDaysAgo) : 1;
                        return 12 + ratio * 13; 
                    },
                    showEffectOn: 'render',
                    rippleEffect: {
                        brushType: 'stroke',
                        scale: 4
                    },
                    label: {
                        formatter: '{b}',
                        position: 'right',
                        show: false
                    },
                    itemStyle: {
                        shadowBlur: 15,
                        shadowColor: 'rgba(255, 152, 0, 0.5)'
                    },
                    zlevel: 2,
                    emphasis: {
                        scale: true
                    }
                }
            ]
        };

        mapChart.setOption(heatmapOption, true);
    }
}
