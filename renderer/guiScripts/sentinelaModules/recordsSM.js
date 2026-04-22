// renderer/guiScripts/sentinelaModules/recordsSM.js

export default class RecordsSM {
    constructor(manager) {
        this.manager = manager;
    }

    initRegistros() {
        // Filter buttons
        document.getElementById('btn-filter-registros').addEventListener('click', () => {
            this.manager.currentDDDFilter = document.getElementById('filter-ddd-input').value.trim();
            this.manager.currentPage = 0;
            this.loadRegistros();
        });

        document.getElementById('btn-clear-filter-registros').addEventListener('click', () => {
            document.getElementById('filter-ddd-input').value = '';
            this.manager.currentDDDFilter = '';
            this.manager.currentPage = 0;
            this.loadRegistros();
        });

        // Refresh
        document.getElementById('btn-refresh-registros').addEventListener('click', () => {
            this.loadRegistros();
            this.loadStats();
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
                this.loadRegistros();
                this.loadStats();
            } else {
                alert('Erro ao limpar: ' + clearResult.error);
            }
        });

        // Pagination
        document.getElementById('btn-prev-page').addEventListener('click', () => {
            if (this.manager.currentPage > 0) {
                this.manager.currentPage--;
                this.loadRegistros();
            }
        });

        document.getElementById('btn-next-page').addEventListener('click', () => {
            this.manager.currentPage++;
            this.loadRegistros();
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
    async loadRegistros() {
        const tbody = document.getElementById('registros-tbody');
        const escapeHtml = this.manager.utility.escapeHtml;

        try {
            const filters = {
                limit: this.manager.pageSize,
                offset: this.manager.currentPage * this.manager.pageSize,
            };

            if (this.manager.currentDDDFilter) {
                filters.ddd = this.manager.currentDDDFilter;
            }

            const result = await window.sentinelaAPI.getAreaCodes(filters);

            if (!result.success) {
                tbody.innerHTML = `<tr><td colspan="5" class="empty-table">Erro: ${escapeHtml(result.error)}</td></tr>`;
                return;
            }

            if (result.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="empty-table">Nenhum registro encontrado</td></tr>`;
                this.updatePagination(0, 0);
                return;
            }

            // Render rows
            tbody.innerHTML = result.data.map(row => {
                const priorityClass = row.priority <= 3 ? `priority-${row.priority}` : 'priority-default';
                const nameClass = row.name ? 'name-cell' : 'name-cell empty';
                const nameText = row.name || '(sem nome)';
                const dateText = row.created_at ? this.manager.utility.formatDate(row.created_at) : '-';

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

            this.updatePagination(result.total, result.data.length);

        } catch (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-table">Erro: ${escapeHtml(error.message)}</td></tr>`;
        }
    }

    /**
     * Carrega estatísticas
     */
    async loadStats() {
        try {
            const stats = await window.sentinelaAPI.getImportStats();

            if (stats.success) {
                document.getElementById('stat-total').textContent = stats.total || 0;
                document.getElementById('stat-ddds').textContent = stats.porDDD ? stats.porDDD.length : 0;
                document.getElementById('stat-imports').textContent = stats.porPrioridade ? stats.porPrioridade.length : 0;
                
                // Atualiza cache global de DDDs
                this.manager.globalDDDStats = {};
                if (stats.porDDD) {
                    stats.porDDD.forEach(item => {
                        this.manager.globalDDDStats[item.ddd] = item.count;
                    });
                }
            }
        } catch (error) {
            console.error('Erro ao carregar stats:', error);
        }
    }

    /**
     * Atualiza informações de paginação
     */
    updatePagination(total, loaded) {
        const totalPages = Math.ceil(total / this.manager.pageSize);
        const currentPageDisplay = total > 0 ? this.manager.currentPage + 1 : 0;

        document.getElementById('pagination-info').textContent = 
            `Página ${currentPageDisplay} de ${totalPages} (${total} registros)`;

        document.getElementById('btn-prev-page').disabled = this.manager.currentPage <= 0;
        document.getElementById('btn-next-page').disabled = (this.manager.currentPage + 1) * this.manager.pageSize >= total;
    }
}
