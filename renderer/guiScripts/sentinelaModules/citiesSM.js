// renderer/guiScripts/sentinelaModules/citiesSM.js

export default class CitiesSM {
    constructor(manager) {
        this.manager = manager;
    }

    async loadMunicipios() {
        try {
            const response = await fetch('../data/municipios.json');
            if (response.ok) {
                this.manager.municipiosData = await response.json();
                const datalist = document.getElementById('cidades-list');
                let options = '';
                // Vamos carregar as cidades no datalist
                this.manager.municipiosData.forEach(m => {
                    options += `<option value="${m.nome} - ${m.uf}">`;
                });
                if (datalist) {
                    datalist.innerHTML = options;
                }
            } else {
                console.error('Falha ao carregar municipios.json');
            }
        } catch (e) {
            console.error('Erro ao carregar cidades:', e);
        }
    }

    async fetchAllEvents() {
        const result = await window.sentinelaAPI.getEvents();
        if (result.success && result.data) {
            this.manager.allEventsData = result.data;
        } else {
            this.manager.allEventsData = [];
        }
        
        // Atualiza o mapa se estiver na aba eventos
        if (this.manager.currentMapMode === 'eventos' && this.manager.mapChart) {
            this.manager.map.updateMapForEvents();
        }
    }
}
