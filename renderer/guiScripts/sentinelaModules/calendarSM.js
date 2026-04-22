// renderer/guiScripts/sentinelaModules/calendarSM.js

export default class CalendarSM {
    constructor(manager) {
        this.manager = manager;
    }

    async initCalendar() {
        const modal = document.getElementById('evento-modal');
        const calendarEl = document.getElementById('fullcalendar-el');
        if (!calendarEl) return;

        this.manager.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: 'Hoje',
                month: 'Mês',
                week: 'Semana',
                day: 'Dia'
            },
            height: '100%',
            dateClick: (info) => {
                this.openEventModal(info.dateStr);
            },
            events: async (info, successCallback, failureCallback) => {
                const result = await window.sentinelaAPI.getEvents();
                if (result.success && result.data) {
                    const events = result.data.map(event => ({
                        id: event.id,
                        title: event.titulo,
                        start: event.data,
                        description: event.descricao
                    }));
                    successCallback(events);
                } else {
                    failureCallback();
                }
            }
        });

        // Botão "Novo Evento"
        document.getElementById('btn-open-modal').addEventListener('click', () => {
            this.openEventModal(new Date().toISOString().split('T')[0]);
        });

        // Cancelar modal
        document.getElementById('btn-cancel-evento').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Salvar evento
        document.getElementById('btn-save-evento').addEventListener('click', async () => {
            const data = document.getElementById('evento-data').value;
            const titulo = document.getElementById('evento-titulo').value.trim();
            const inputCidade = document.getElementById('evento-cidade').value.trim();
            const descricao = document.getElementById('evento-descricao').value.trim();

            if (!data || !titulo || !inputCidade) {
                alert('Data, título e cidade são obrigatórios.');
                return;
            }

            // Remover a parte " - UF" se o usuário selecionou da lista
            const cidadeNomeRaw = inputCidade.split(' - ')[0].trim();
            
            // Tentar encontrar a cidade selecionada para pegar as coordenadas
            const normalizeStr = str => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : '';
            let cidadeSelecionada = this.manager.municipiosData.find(m => normalizeStr(m.nome) === normalizeStr(cidadeNomeRaw));
            
            const eventData = { 
                data, 
                titulo, 
                descricao,
                cidade: cidadeNomeRaw,
                estado: cidadeSelecionada ? (inputCidade.includes(' - ') ? inputCidade.split(' - ')[1].trim() : cidadeSelecionada.uf) : null,
                lat: cidadeSelecionada ? cidadeSelecionada.lat : null,
                lng: cidadeSelecionada ? cidadeSelecionada.lng : null
            };
            
            console.log('[DEBUG] eventData a ser salvo:', JSON.stringify(eventData));

            const result = await window.sentinelaAPI.createEvent(eventData);
            if (result.success) {
                modal.classList.add('hidden');
                if (this.manager.calendar) {
                    this.manager.calendar.refetchEvents();
                }
                await this.manager.cities.fetchAllEvents(); // atualiza o map
                this.loadTimeline();
            } else {
                alert('Erro ao criar evento: ' + result.error);
            }
        });

        // Expose deleteEvent globally for the timeline inline onclick handler
        window.deleteEvent = async (id) => {
            const confirmed = await window.customConfirm('Tem certeza que deseja excluir este evento?');
            if (confirmed) {
                const result = await window.sentinelaAPI.deleteEvent(id);
                if (result.success) {
                    if (this.manager.calendar) {
                        this.manager.calendar.refetchEvents();
                    }
                    await this.manager.cities.fetchAllEvents(); // atualiza o map
                    this.loadTimeline();
                } else {
                    alert('Erro ao excluir evento: ' + result.error);
                }
            }
        };
    }

    openEventModal(dateStr) {
        const modal = document.getElementById('evento-modal');
        document.getElementById('evento-data').value = dateStr;
        document.getElementById('evento-titulo').value = '';
        document.getElementById('evento-cidade').value = '';
        document.getElementById('evento-descricao').value = '';
        modal.classList.remove('hidden');
    }

    async loadTimeline() {
        const listEls = [document.getElementById('timeline-list'), document.getElementById('map-timeline-list')];
        const result = await window.sentinelaAPI.getEvents();
        const escapeHtml = this.manager.utility.escapeHtml;
        
        let htmlContent = '';
        if (!result.success || !result.data || result.data.length === 0) {
            htmlContent = '<p class="placeholder-text">Nenhum evento registrado.</p>';
        } else {
            htmlContent = result.data.map(event => {
                const dateParts = event.data.split('-');
                const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : event.data;
                
                return `
                    <div class="timeline-item">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <button class="timeline-delete" onclick="window.deleteEvent(${event.id})" title="Excluir evento">✕</button>
                            <div class="timeline-date">${formattedDate}</div>
                            <h3 class="timeline-title">${escapeHtml(event.titulo)}</h3>
                            ${event.descricao ? `<p class="timeline-desc">${escapeHtml(event.descricao)}</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        }

        listEls.forEach(el => {
            if (el) el.innerHTML = htmlContent;
        });
    }
}
