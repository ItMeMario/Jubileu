// renderer/guiScripts/utils/templateLoader.js
// Utilitário para carregamento assíncrono de templates HTML modulares

/**
 * Lista padrão de arquivos parciais de abas do Zwei Chat Premium
 */
export const DEFAULT_TABS = [
  "tabs/dashboard.html",
  "tabs/templates.html",
  "tabs/broadcast.html",
  "tabs/flows.html",
  "tabs/settings.html",
];

/**
 * Carrega um arquivo HTML parcial via fetch
 * @param {string} url - Caminho relativo ao documento HTML atual
 * @returns {Promise<string>} - Conteúdo HTML em texto
 */
export async function loadHtmlPartial(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao carregar parcial "${url}": HTTP ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.error(`❌ Erro ao buscar template parcial [${url}]:`, error);
    throw error;
  }
}

/**
 * Carrega múltiplos templates parciais em paralelo e os injeta no container especificado
 * @param {string} containerSelector - Seletor CSS do elemento container (ex: "main.main-content")
 * @param {string[]} [tabUrls=DEFAULT_TABS] - Lista de URLs relativas das abas
 * @returns {Promise<void>}
 */
export async function loadTabsLayout(containerSelector = "main.main-content", tabUrls = DEFAULT_TABS) {
  const container = document.querySelector(containerSelector);
  if (!container) {
    throw new Error(`Container não encontrado para o seletor "${containerSelector}"`);
  }

  try {
    const htmlChunks = await Promise.all(tabUrls.map((url) => loadHtmlPartial(url)));
    container.innerHTML = htmlChunks.join("\n");
  } catch (err) {
    console.error("❌ Falha crítica ao inicializar layout de abas modular:", err);
    container.innerHTML = `
      <div style="padding: 24px; color: #ff5555; background: #161b22; border: 1px solid #da3633; border-radius: 8px; margin: 20px;">
        <h3>❌ Erro ao carregar componentes da interface</h3>
        <p style="margin-top: 8px; color: #e6edf3;">${err.message}</p>
      </div>
    `;
    throw err;
  }
}
