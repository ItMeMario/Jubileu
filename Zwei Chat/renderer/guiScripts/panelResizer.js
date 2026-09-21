// renderer/guiScripts/panelResizer.js
/**
 * Gerenciador de Divisores Arrastáveis (Splitters / Resizers) para o Zwei Chat.
 * Permite redimensionar independentemente:
 * 1. Barra Lateral vs Painel Principal (Horizontal)
 * 2. Dee Jay: Instâncias / Mensagens vs Console (Horizontal)
 * 3. Dee Jay: Instâncias Conectadas vs Banco de Mensagens (Vertical)
 *
 * Inclui: Pointer Capture, persistência no localStorage, limites de segurança
 * e duplo clique para redefinir aos tamanhos padrão.
 */

(function () {
  // Chaves de armazenamento
  const STORAGE_SIDEBAR = "zwei_sidebar_width";
  const STORAGE_DJ_COL = "zwei_dj_col_width";
  const STORAGE_DJ_ROW = "zwei_dj_row_height";

  // Valores padrão
  const DEFAULT_SIDEBAR = "300px";
  const DEFAULT_DJ_COL = "60%";
  const DEFAULT_DJ_ROW = "58%";

  // Limites
  const SIDEBAR_MIN = 220;
  const SIDEBAR_MAX = 520;
  const DJ_COL_MIN_PCT = 25;
  const DJ_COL_MAX_PCT = 75;
  const DJ_ROW_MIN_PCT = 20;
  const DJ_ROW_MAX_PCT = 80;

  /**
   * Inicializa o divisor da Barra Lateral
   */
  function initSidebarResizer() {
    const resizer = document.getElementById("sidebar-resizer");
    const container = document.querySelector(".app-container");
    const sidebar = document.querySelector(".sidebar");

    if (!resizer || !container || !sidebar) return;

    // Restaura tamanho salvo
    const savedWidth = localStorage.getItem(STORAGE_SIDEBAR);
    if (savedWidth) {
      container.style.setProperty("--sidebar-width", savedWidth);
    }

    let isDragging = false;

    resizer.addEventListener("pointerdown", (e) => {
      isDragging = true;
      resizer.setPointerCapture(e.pointerId);
      resizer.classList.add("active");
      document.body.classList.add("is-resizing-col");
    });

    resizer.addEventListener("pointermove", (e) => {
      if (!isDragging) return;

      const containerRect = container.getBoundingClientRect();
      let newWidth = e.clientX - containerRect.left;

      // Limita dentro das faixas seguras
      newWidth = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, newWidth));

      const widthStr = `${Math.round(newWidth)}px`;
      container.style.setProperty("--sidebar-width", widthStr);
    });

    const stopDragging = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try {
        resizer.releasePointerCapture(e.pointerId);
      } catch (_) {}
      resizer.classList.remove("active");
      document.body.classList.remove("is-resizing-col");

      // Salva no localStorage
      const currentWidth = container.style.getPropertyValue("--sidebar-width");
      if (currentWidth) {
        localStorage.setItem(STORAGE_SIDEBAR, currentWidth);
      }
    };

    resizer.addEventListener("pointerup", stopDragging);
    resizer.addEventListener("pointercancel", stopDragging);

    // Duplo clique redefine ao padrão
    resizer.addEventListener("dblclick", () => {
      container.style.setProperty("--sidebar-width", DEFAULT_SIDEBAR);
      localStorage.removeItem(STORAGE_SIDEBAR);
    });
  }

  /**
   * Inicializa os divisores internos da aba Dee Jay (Colunas e Linhas)
   */
  function initDeeJayResizers() {
    const mainGrid = document.querySelector(".deejay-main-grid");
    const colResizer = document.getElementById("dj-col-resizer");
    const leftColumn = document.querySelector(".deejay-left-column");
    const rowResizer = document.getElementById("dj-row-resizer");

    // 1. Redimensionador de Colunas (Instâncias vs Console de Conversas)
    if (mainGrid && colResizer && leftColumn) {
      const savedColWidth = localStorage.getItem(STORAGE_DJ_COL);
      if (savedColWidth) {
        leftColumn.style.setProperty("--dj-left-width", savedColWidth);
      }

      let isDraggingCol = false;

      colResizer.addEventListener("pointerdown", (e) => {
        isDraggingCol = true;
        colResizer.setPointerCapture(e.pointerId);
        colResizer.classList.add("active");
        document.body.classList.add("is-resizing-col");
      });

      colResizer.addEventListener("pointermove", (e) => {
        if (!isDraggingCol) return;

        const gridRect = mainGrid.getBoundingClientRect();
        if (gridRect.width <= 0) return;

        const offset = e.clientX - gridRect.left;
        let pct = (offset / gridRect.width) * 100;
        pct = Math.max(DJ_COL_MIN_PCT, Math.min(DJ_COL_MAX_PCT, pct));

        const pctStr = `${Math.round(pct * 10) / 10}%`;
        leftColumn.style.setProperty("--dj-left-width", pctStr);
      });

      const stopDraggingCol = (e) => {
        if (!isDraggingCol) return;
        isDraggingCol = false;
        try {
          colResizer.releasePointerCapture(e.pointerId);
        } catch (_) {}
        colResizer.classList.remove("active");
        document.body.classList.remove("is-resizing-col");

        const currentPct = leftColumn.style.getPropertyValue("--dj-left-width");
        if (currentPct) {
          localStorage.setItem(STORAGE_DJ_COL, currentPct);
        }
      };

      colResizer.addEventListener("pointerup", stopDraggingCol);
      colResizer.addEventListener("pointercancel", stopDraggingCol);

      colResizer.addEventListener("dblclick", () => {
        leftColumn.style.setProperty("--dj-left-width", DEFAULT_DJ_COL);
        localStorage.removeItem(STORAGE_DJ_COL);
      });
    }

    // 2. Redimensionador de Linhas (Instâncias Conectadas vs Banco de Mensagens)
    if (leftColumn && rowResizer) {
      const instancesSec = leftColumn.querySelector(".deejay-instances-section");
      if (instancesSec) {
        const savedRowHeight = localStorage.getItem(STORAGE_DJ_ROW);
        if (savedRowHeight) {
          instancesSec.style.setProperty("--dj-instances-height", savedRowHeight);
        }

        let isDraggingRow = false;

        rowResizer.addEventListener("pointerdown", (e) => {
          isDraggingRow = true;
          rowResizer.setPointerCapture(e.pointerId);
          rowResizer.classList.add("active");
          document.body.classList.add("is-resizing-row");
        });

        rowResizer.addEventListener("pointermove", (e) => {
          if (!isDraggingRow) return;

          const colRect = leftColumn.getBoundingClientRect();
          if (colRect.height <= 0) return;

          const offset = e.clientY - colRect.top;
          let pct = (offset / colRect.height) * 100;
          pct = Math.max(DJ_ROW_MIN_PCT, Math.min(DJ_ROW_MAX_PCT, pct));

          const pctStr = `${Math.round(pct * 10) / 10}%`;
          instancesSec.style.setProperty("--dj-instances-height", pctStr);
        });

        const stopDraggingRow = (e) => {
          if (!isDraggingRow) return;
          isDraggingRow = false;
          try {
            rowResizer.releasePointerCapture(e.pointerId);
          } catch (_) {}
          rowResizer.classList.remove("active");
          document.body.classList.remove("is-resizing-row");

          const currentHeight = instancesSec.style.getPropertyValue("--dj-instances-height");
          if (currentHeight) {
            localStorage.setItem(STORAGE_DJ_ROW, currentHeight);
          }
        };

        rowResizer.addEventListener("pointerup", stopDraggingRow);
        rowResizer.addEventListener("pointercancel", stopDraggingRow);

        rowResizer.addEventListener("dblclick", () => {
          instancesSec.style.setProperty("--dj-instances-height", DEFAULT_DJ_ROW);
          localStorage.removeItem(STORAGE_DJ_ROW);
        });
      }
    }
  }

  /**
   * Monitora quando a aba Dee Jay é injetada dinamicamente
   */
  function setupDeeJayObserver() {
    const tabDeejay = document.getElementById("tab-content-deejay");
    if (!tabDeejay) return;

    // Se o conteúdo do Dee Jay já estiver no DOM
    if (document.getElementById("dj-col-resizer")) {
      initDeeJayResizers();
    }

    // Observer para quando deejay.html for injetado via fetch
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          if (document.getElementById("dj-col-resizer")) {
            initDeeJayResizers();
            break;
          }
        }
      }
    });

    observer.observe(tabDeejay, { childList: true, subtree: true });
  }

  function initAll() {
    initSidebarResizer();
    setupDeeJayObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  // Exporta globalmente para integração manual se necessário
  window.panelResizer = {
    initSidebarResizer,
    initDeeJayResizers,
    initAll
  };
})();
