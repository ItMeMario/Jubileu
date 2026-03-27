// renderer/guiScripts/utils/hotkeys.js

class HotkeysManager {
    constructor() {
        if (document.getElementById('floating-toolbar')) return; // Already exists
        
        this.toolbar = null;
        this.activeElement = null;
        
        this.formats = {
            'bold': { pre: '*', post: '*' },
            'italic': { pre: '_', post: '_' },
            'strikethrough': { pre: '~', post: '~' },
            'code': { pre: '```\n', post: '\n```' },
            'numlist': { pre: '1. ', post: '', block: true },
            'bullist': { pre: '- ', post: '', block: true },
            'quote': { pre: '> ', post: '', block: true }
        };

        this.init();
    }

    init() {
        this.createToolbar();
        this.bindEvents();
    }

    createToolbar() {
        this.toolbar = document.createElement('div');
        this.toolbar.id = 'floating-toolbar';
        this.toolbar.innerHTML = `
            <button class="toolbar-btn" data-format="bold" title="Negrito (Ctrl+B)"><b>B</b></button>
            <button class="toolbar-btn" data-format="italic" title="Itálico (Ctrl+I)"><i>I</i></button>
            <button class="toolbar-btn" data-format="strikethrough" title="Tachado (Ctrl+Shift+X)" style="text-decoration: line-through;">S</button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-format="code" title="Código (Ctrl+E)"><code>&lt;&gt;</code></button>
            <div class="toolbar-separator"></div>
            <button class="toolbar-btn" data-format="numlist" title="Lista Numerada">1.</button>
            <button class="toolbar-btn" data-format="bullist" title="Lista Marcadores">•</button>
            <button class="toolbar-btn" data-format="quote" title="Citação">”</button>
        `;
        document.body.appendChild(this.toolbar);

        // Previne que o clique perca o foco do textarea original
        this.toolbar.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        this.toolbar.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.applyFormat(btn.dataset.format);
            });
        });
    }

    bindEvents() {
        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (!this.isValidTarget(e.target)) return;
            
            if (e.ctrlKey || e.metaKey) {
                let format = null;
                if (e.key.toLowerCase() === 'b') format = 'bold';
                if (e.key.toLowerCase() === 'i') format = 'italic';
                if (e.key.toLowerCase() === 'e') format = 'code';
                if ((e.key.toLowerCase() === 'x' || e.key.toLowerCase() === 's') && e.shiftKey) format = 'strikethrough';
                
                if (format) {
                    e.preventDefault();
                    this.activeElement = e.target;
                    this.applyFormat(format);
                }
            }
        });

        // Eventos para checar seleção e exibir o Floating Toolbar
        document.addEventListener('mouseup', (e) => {
            this.handleSelection(e.target);
        });

        document.addEventListener('keyup', (e) => {
            // Em atalhos ou seleção com teclado (Shift+Seta), atualiza menu
            // Exceção de certas teclas como ctrl pra evitar flashes
            if (e.key !== 'Control' && e.key !== 'Shift') {
                 this.handleSelection(e.target);
            }
        });

        // Esconder menu ao clicar fora
        document.addEventListener('mousedown', (e) => {
            if (this.toolbar && !this.toolbar.contains(e.target)) {
                if (!e.target.classList || !e.target.classList.contains('manifest-content')) {
                    this.hideToolbar();
                } else {
                    // Clicou num textarea: hide toolbar momentaneamente e check selection
                    // Vai reativar no mouseup
                    this.hideToolbar();
                }
            }
        });
        
        // Esconder em caso de scroll da div ou da página
        document.addEventListener('scroll', () => this.hideToolbar(), true);
    }

    isValidTarget(target) {
        return target && target.tagName === 'TEXTAREA' && target.classList.contains('manifest-content');
    }

    handleSelection(target) {
        if (!this.isValidTarget(target)) return;
        
        this.activeElement = target;
        
        const text = target.value;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        
        // Mostrar se houve seleção real de texto vazio
        if (start !== end && text.substring(start, end).trim() !== "") {
            this.showToolbar(target);
        } else {
            this.hideToolbar();
        }
    }

    showToolbar(textarea) {
        setTimeout(() => {
            if (!this.toolbar) return;
            // Posição alinhada com o topo/centro do Textarea (abordagem sólida e nativa sem libs extras)
            const rect = textarea.getBoundingClientRect();
            this.toolbar.classList.add('active');
            
            const tbWidth = this.toolbar.offsetWidth;
            const tbHeight = this.toolbar.offsetHeight;
            
            // Coloca um pouco acima do textarea
            let topPosition = rect.top - tbHeight - 10;
            if (topPosition < 10) {
                topPosition = rect.bottom + 10; // Embaixo se for sair da tela
            }
            
            let leftPosition = rect.left + (rect.width / 2) - (tbWidth / 2);
            if (leftPosition < 10) leftPosition = 10;
            
            this.toolbar.style.top = topPosition + window.scrollY + 'px';
            this.toolbar.style.left = leftPosition + window.scrollX + 'px';
        }, 10);
    }

    hideToolbar() {
        if (this.toolbar) {
            this.toolbar.classList.remove('active');
        }
    }

    applyFormat(formatType) {
        if (!this.activeElement) return;
        
        const el = this.activeElement;
        const format = this.formats[formatType];
        
        if (!format) return;

        const start = el.selectionStart;
        const end = el.selectionEnd;
        const originalText = el.value;
        const selectedText = originalText.substring(start, end);
        
        let replacement = "";
        let newSelectionStart = 0;
        let newSelectionEnd = 0;

        if (format.block) {
            if (selectedText) {
                // Caso block: adiciona linha a linha
                const lines = selectedText.split('\\n');
                const modifiedLines = lines.map(line => {
                    // Evita reaplicar se linha já tiver
                    if (line.trim() === '' || line.startsWith(format.pre.trim())) return line;
                    return format.pre + line + format.post;
                });
                replacement = modifiedLines.join('\\n');
                newSelectionStart = start;
                newSelectionEnd = start + replacement.length;
            } else {
                replacement = format.pre;
                newSelectionStart = start + format.pre.length;
                newSelectionEnd = newSelectionStart;
            }
        } else {
            if (selectedText) {
                // Protege espaços nas bordas
                const leadingSpaceMatch = selectedText.match(/^\\s+/);
                const trailingSpaceMatch = selectedText.match(/\\s+$/);
                
                const leadWhitespace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
                const trailWhitespace = trailingSpaceMatch ? trailingSpaceMatch[0] : '';
                const trimmedSelection = selectedText.substring(leadWhitespace.length, selectedText.length - trailWhitespace.length);
                
                replacement = leadWhitespace + format.pre + trimmedSelection + format.post + trailWhitespace;
                newSelectionStart = start;
                newSelectionEnd = start + replacement.length;
            } else {
                replacement = format.pre + format.post;
                newSelectionStart = start + format.pre.length;
                newSelectionEnd = newSelectionStart;
            }
        }

        el.focus();
        let success = false;
        try {
            // execCommand mantém suporte de ctrl+z
            success = document.execCommand('insertText', false, replacement);
        } catch (e) { }

        if (!success) {
            el.value = originalText.substring(0, start) + replacement + originalText.substring(end);
        }

        // Restaura a nova posição da seleção, atualizando o textarea
        el.setSelectionRange(newSelectionStart, newSelectionEnd);
        
        // Só mantém a toolbar se mantiver ativa a seleção original
        this.handleSelection(el);
    }
}

// Auto Initialize do utilitário global mente
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.hotkeysManager = new HotkeysManager();
    });
} else {
    window.hotkeysManager = new HotkeysManager();
}
