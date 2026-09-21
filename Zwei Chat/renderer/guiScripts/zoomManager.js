// renderer/guiScripts/zoomManager.js
/**
 * Gerenciador de Zoom e Redimensionamento de Escala da UI para Zwei Chat.
 * Suporta atalhos de teclado (Ctrl + / Ctrl - / Ctrl 0), Ctrl + Mouse Wheel,
 * botões visuais na barra de título/cabeçalho, toast HUD flutuante e persistência.
 */

(function () {
  const STORAGE_KEY = "zwei_zoom_level";
  const MIN_ZOOM = 0.5;   // 50%
  const MAX_ZOOM = 1.75;  // 175%
  const STEP = 0.1;       // 10%

  let currentZoom = 1.0;
  let hudTimeout = null;

  // Elementos da UI
  let btnZoomIn = null;
  let btnZoomOut = null;
  let btnZoomReset = null;
  let btnZoomDisplay = null;
  let zoomLevelText = null;
  let zoomHud = null;
  let zoomHudText = null;

  /**
   * Arredonda o valor para 2 casas decimais e garante limites seguros
   */
  function normalizeZoom(factor) {
    const rounded = Math.round(factor * 100) / 100;
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rounded));
  }

  /**
   * Exibe o HUD flutuante temporariamente com o nível atual
   */
  function showHud(percent) {
    if (!zoomHud || !zoomHudText) return;

    zoomHudText.textContent = `${percent}%`;
    zoomHud.classList.add("visible");

    if (hudTimeout) {
      clearTimeout(hudTimeout);
    }

    hudTimeout = setTimeout(() => {
      zoomHud.classList.remove("visible");
    }, 1200);
  }

  /**
   * Aplica o fator de zoom no Electron / Chromium e atualiza UI / localStorage
   */
  function applyZoom(factor, triggerHud = false) {
    currentZoom = normalizeZoom(factor);

    // 1. Aplica no Chromium nativo via preload se disponível
    if (window.electronAPI && typeof window.electronAPI.setZoomFactor === "function") {
      try {
        window.electronAPI.setZoomFactor(currentZoom);
      } catch (err) {
        console.warn("⚠️ Aviso ao definir zoomFactor via electronAPI:", err);
      }
    }

    const percent = Math.round(currentZoom * 100);

    // 2. Atualiza badge de texto no cabeçalho
    if (zoomLevelText) {
      zoomLevelText.textContent = `${percent}%`;
    }

    // 3. Atualiza estado dos botões (desabilita nos limites)
    if (btnZoomIn) {
      btnZoomIn.disabled = currentZoom >= MAX_ZOOM;
      btnZoomIn.style.opacity = currentZoom >= MAX_ZOOM ? "0.4" : "1";
    }
    if (btnZoomOut) {
      btnZoomOut.disabled = currentZoom <= MIN_ZOOM;
      btnZoomOut.style.opacity = currentZoom <= MIN_ZOOM ? "0.4" : "1";
    }

    // 4. Salva no localStorage
    try {
      localStorage.setItem(STORAGE_KEY, currentZoom.toString());
    } catch (e) {
      console.warn("Não foi possível persistir o zoom no localStorage:", e);
    }

    // 5. Mostra HUD se solicitado
    if (triggerHud) {
      showHud(percent);
    }
  }

  function zoomIn(triggerHud = false) {
    applyZoom(currentZoom + STEP, triggerHud);
  }

  function zoomOut(triggerHud = false) {
    applyZoom(currentZoom - STEP, triggerHud);
  }

  function resetZoom(triggerHud = false) {
    applyZoom(1.0, triggerHud);
  }

  /**
   * Configura listeners de atalhos globais de teclado e mouse wheel
   */
  function setupEventListeners() {
    // Botões visuais
    if (btnZoomIn) {
      btnZoomIn.addEventListener("click", () => zoomIn(false));
    }
    if (btnZoomOut) {
      btnZoomOut.addEventListener("click", () => zoomOut(false));
    }
    if (btnZoomReset) {
      btnZoomReset.addEventListener("click", () => resetZoom(true));
    }
    if (btnZoomDisplay) {
      btnZoomDisplay.addEventListener("click", () => resetZoom(true));
    }

    // Atalhos de Teclado (Ctrl + / Ctrl - / Ctrl 0)
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+" || e.code === "NumpadAdd" || e.key === "Add") {
          e.preventDefault();
          zoomIn(true);
        } else if (e.key === "-" || e.key === "_" || e.code === "NumpadSubtract" || e.key === "Subtract") {
          e.preventDefault();
          zoomOut(true);
        } else if (e.key === "0" || e.code === "Numpad0" || e.code === "Digit0") {
          e.preventDefault();
          resetZoom(true);
        }
      }
    });

    // Rolagem com Ctrl pressionado (Ctrl + Mouse Wheel)
    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          if (e.deltaY < 0) {
            zoomIn(true);
          } else if (e.deltaY > 0) {
            zoomOut(true);
          }
        }
      },
      { passive: false }
    );
  }

  /**
   * Inicialização do gerenciador de zoom
   */
  function init() {
    // Vincula elementos do DOM
    btnZoomIn = document.getElementById("btn-zoom-in");
    btnZoomOut = document.getElementById("btn-zoom-out");
    btnZoomReset = document.getElementById("btn-zoom-reset");
    btnZoomDisplay = document.getElementById("btn-zoom-display");
    zoomLevelText = document.getElementById("zoom-level-text");
    zoomHud = document.getElementById("zoom-hud");
    zoomHudText = document.getElementById("zoom-hud-text");

    // Recupera valor salvo
    let savedZoom = 1.0;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseFloat(stored);
        if (!isNaN(parsed) && parsed >= MIN_ZOOM && parsed <= MAX_ZOOM) {
          savedZoom = parsed;
        }
      }
    } catch (err) {
      console.warn("Erro ao ler zoom salvo:", err);
    }

    // Aplica zoom inicial
    applyZoom(savedZoom, false);

    // Registra eventos
    setupEventListeners();
  }

  // Inicializa quando o DOM estiver pronto
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expõe API global caso outros módulos precisem
  window.zoomManager = {
    zoomIn,
    zoomOut,
    resetZoom,
    applyZoom,
    getZoom: () => currentZoom,
    init
  };
})();
