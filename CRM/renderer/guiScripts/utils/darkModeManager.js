/**
 * ============================================
 * 🌙 DARK MODE MANAGER - Jubileu
 * ============================================
 * Gerenciamento completo do modo escuro
 * com persistência em localStorage
 * ============================================
 */

class DarkModeManager {
    constructor() {
        this.storageKey = 'jubileu-dark-mode';
        this.darkModeClass = 'dark-mode';
        this.transitionClass = 'dark-mode-transitioning';
        this.init();
    }

    /**
     * Inicializa o dark mode
     */
    init() {
        // Carrega a preferência salva antes de renderizar
        this.loadPreference();

        // Aguarda o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupUI());
        } else {
            this.setupUI();
        }
    }

    /**
     * Carrega a preferência do localStorage
     */
    loadPreference() {
        try {
            const savedMode = localStorage.getItem(this.storageKey);

            if (savedMode === 'enabled') {
                // Aplica dark mode imediatamente, sem transição
                document.body.classList.add(this.darkModeClass);
            } else if (savedMode === null) {
                // Primeira vez - verifica preferência do sistema
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.body.classList.add(this.darkModeClass);
                    this.savePreference(true);
                }
            }
        } catch (error) {
            console.error('Erro ao carregar preferência de dark mode:', error);
        }
    }

    /**
     * Salva a preferência no localStorage
     */
    savePreference(isDarkMode) {
        try {
            localStorage.setItem(this.storageKey, isDarkMode ? 'enabled' : 'disabled');
        } catch (error) {
            console.error('Erro ao salvar preferência de dark mode:', error);
        }
    }

    /**
     * Verifica se o dark mode está ativo
     */
    isDarkModeEnabled() {
        return document.body.classList.contains(this.darkModeClass);
    }

    /**
     * Alterna entre dark mode e light mode
     */
    toggle() {
        const isCurrentlyDark = this.isDarkModeEnabled();

        // Adiciona classe de transição
        document.body.classList.add(this.transitionClass);

        // Alterna o modo
        if (isCurrentlyDark) {
            document.body.classList.remove(this.darkModeClass);
            this.savePreference(false);
        } else {
            document.body.classList.add(this.darkModeClass);
            this.savePreference(true);
        }

        // Remove classe de transição após a animação
        setTimeout(() => {
            document.body.classList.remove(this.transitionClass);
        }, 300);

        // Atualiza o ícone do botão
        this.updateToggleButton();

        // Dispara evento customizado para outras partes da aplicação
        this.dispatchChangeEvent(!isCurrentlyDark);
    }

    /**
     * Ativa o dark mode
     */
    enable() {
        if (!this.isDarkModeEnabled()) {
            this.toggle();
        }
    }

    /**
     * Desativa o dark mode
     */
    disable() {
        if (this.isDarkModeEnabled()) {
            this.toggle();
        }
    }

    /**
     * Configura a interface do usuário (botão de toggle)
     */
    setupUI() {
        // Cria o botão de toggle se não existir
        let toggleButton = document.getElementById('dark-mode-toggle');

        if (!toggleButton) {
            toggleButton = this.createToggleButton();
            document.body.appendChild(toggleButton);
        }

        // Atualiza o ícone baseado no estado atual
        this.updateToggleButton();

        // Adiciona event listener
        toggleButton.addEventListener('click', () => this.toggle());

        // Listener para mudanças na preferência do sistema
        this.setupSystemPreferenceListener();
    }

    /**
     * Cria o botão de toggle HTML
     */
    createToggleButton() {
        const button = document.createElement('button');
        button.id = 'dark-mode-toggle';
        button.className = 'dark-mode-toggle';
        button.setAttribute('aria-label', 'Alternar modo escuro');
        button.setAttribute('title', 'Alternar modo escuro');

        button.innerHTML = `
            <span class="icon-moon">🌙</span>
            <span class="icon-sun">☀️</span>
        `;

        return button;
    }

    /**
     * Atualiza o título do botão baseado no estado
     */
    updateToggleButton() {
        const button = document.getElementById('dark-mode-toggle');
        if (!button) return;

        const isDark = this.isDarkModeEnabled();
        const title = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
        button.setAttribute('title', title);
        button.setAttribute('aria-label', title);
    }

    /**
     * Configura listener para mudanças na preferência do sistema
     */
    setupSystemPreferenceListener() {
        if (!window.matchMedia) return;

        const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        // Listener para mudanças
        darkModeMediaQuery.addEventListener('change', (e) => {
            // Só aplica se o usuário não tiver uma preferência manual salva
            const savedMode = localStorage.getItem(this.storageKey);

            if (savedMode === null) {
                if (e.matches) {
                    this.enable();
                } else {
                    this.disable();
                }
            }
        });
    }

    /**
     * Dispara evento customizado quando o modo muda
     */
    dispatchChangeEvent(isDarkMode) {
        const event = new CustomEvent('darkModeChange', {
            detail: { isDarkMode }
        });
        window.dispatchEvent(event);
    }

    /**
     * Reseta para o padrão (remove preferência salva)
     */
    reset() {
        try {
            localStorage.removeItem(this.storageKey);

            // Aplica preferência do sistema
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                this.enable();
            } else {
                this.disable();
            }
        } catch (error) {
            console.error('Erro ao resetar dark mode:', error);
        }
    }

    /**
     * Obtém estatísticas de uso (para debug)
     */
    getStats() {
        return {
            enabled: this.isDarkModeEnabled(),
            preference: localStorage.getItem(this.storageKey),
            systemPreference: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        };
    }
}

// ============================================
// INICIALIZAÇÃO GLOBAL
// ============================================

// Cria instância global
const darkModeManager = new DarkModeManager();

// Expõe no objeto window para acesso global
window.darkModeManager = darkModeManager;

// Listener para debug (opcional - pode remover em produção)
window.addEventListener('darkModeChange', (e) => {
    console.log('🌙 Dark mode alterado:', e.detail.isDarkMode ? 'Ativado' : 'Desativado');
});

// ============================================
// API PÚBLICA
// ============================================

/**
 * API pública para uso em outras partes da aplicação
 *
 * Exemplos de uso:
 * - darkModeManager.toggle()           // Alterna modo
 * - darkModeManager.enable()           // Ativa dark mode
 * - darkModeManager.disable()          // Desativa dark mode
 * - darkModeManager.isDarkModeEnabled() // Verifica estado
 * - darkModeManager.reset()            // Reseta preferência
 * - darkModeManager.getStats()         // Obtém estatísticas
 */

// Atalhos de teclado (opcional)
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + D para alternar dark mode
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        darkModeManager.toggle();
    }
});

console.log('🌙 Dark Mode Manager inicializado');
console.log('📊 Estado:', darkModeManager.getStats());
