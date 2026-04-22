// renderer/guiScripts/sentinelaModules/importSM.js

export default class ImportSM {
    constructor(manager) {
        this.manager = manager;
    }

    initImport() {
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
                await this.handleFile(files[0]);
            }
        });

        // File input change
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await this.handleFile(e.target.files[0]);
            }
        });

        // Remove file
        btnRemoveFile.addEventListener('click', () => {
            this.manager.currentCSVContent = null;
            fileInfo.classList.add('hidden');
            btnImport.disabled = true;
            fileInput.value = '';
        });

        // Import button
        btnImport.addEventListener('click', async () => {
            if (!this.manager.currentCSVContent) return;
            await this.executeImport();
        });
    }

    /**
     * Processa o arquivo selecionado
     */
    async handleFile(file) {
        // Validate file type
        if (!file.name.toLowerCase().endsWith('.csv')) {
            this.showImportError('Apenas arquivos .csv são aceitos.');
            return;
        }

        try {
            const result = await window.fileAPI.readFile(file);

            if (!result.success) {
                this.showImportError('Erro ao ler o arquivo: ' + (result.error || 'desconhecido'));
                return;
            }

            this.manager.currentCSVContent = result.content;

            // Show file info
            const fileInfo = document.getElementById('file-info');
            document.getElementById('file-name').textContent = result.name;
            document.getElementById('file-size').textContent = this.manager.utility.formatFileSize(result.size);
            fileInfo.classList.remove('hidden');

            // Enable import
            document.getElementById('btn-import').disabled = false;

        } catch (error) {
            this.showImportError('Erro ao processar arquivo: ' + error.message);
        }
    }

    /**
     * Executa a importação do CSV
     */
    async executeImport() {
        const btnImport = document.getElementById('btn-import');
        const spinner = document.getElementById('import-spinner');

        // Disable button and show spinner
        btnImport.disabled = true;
        spinner.classList.remove('hidden');
        btnImport.textContent = ' Importando...';
        btnImport.prepend(spinner);

        try {
            const result = await window.sentinelaAPI.importCSV(this.manager.currentCSVContent);
            this.showImportResult(result);

            // Clear file after import
            this.manager.currentCSVContent = null;
            document.getElementById('file-info').classList.add('hidden');
            document.getElementById('csv-file-input').value = '';

        } catch (error) {
            this.showImportResult({
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
    showImportResult(result) {
        const container = document.getElementById('import-result');
        const escapeHtml = this.manager.utility.escapeHtml;

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
    showImportError(message) {
        const container = document.getElementById('import-result');
        container.innerHTML = `
            <div class="result-banner error animate-in">
                ❌ ${this.manager.utility.escapeHtml(message)}
            </div>
        `;
    }
}
