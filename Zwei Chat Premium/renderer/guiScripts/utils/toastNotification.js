// renderer/guiScripts/utils/toastNotification.js
// Sistema de Notificações Toast Reutilizável com Suporte a Ações, Auto-Dismiss e Glassmorphism

import { escapeHtml } from "../appGuiModules/domUtils.js";

let toastContainer = null;

/**
 * Obtém ou cria o container fixo dos toasts no DOM
 * @returns {HTMLElement}
 */
function getToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

/**
 * Exibe uma notificação toast flutuante na tela
 * @param {object} options
 * @param {string} options.title - Título do toast
 * @param {string} options.message - Mensagem detalhada
 * @param {'success'|'error'|'warning'|'info'} [options.type='info'] - Tipo visual
 * @param {number} [options.duration=6000] - Tempo de exibição em ms (0 = infinito até fechar)
 * @param {object|null} [options.action=null] - Ação interativa { label: string, onClick: Function }
 * @returns {object} Controlador do toast { dismiss: Function }
 */
export function showToast({
  title,
  message,
  type = "info",
  duration = 6000,
  action = null,
}) {
  if (typeof document === "undefined" || !document.body) {
    return { dismiss: () => {} };
  }

  const container = getToastContainer();
  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;

  // Ícone por tipo
  let icon = "🔔";
  if (type === "success") icon = "🎉";
  else if (type === "error") icon = "❌";
  else if (type === "warning") icon = "⚠️";

  toast.innerHTML = `
    <div class="toast-inner">
      <div class="toast-icon">${icon}</div>
      <div class="toast-content">
        <div class="toast-title">${escapeHtml(title || "")}</div>
        <div class="toast-message">${escapeHtml(message || "")}</div>
        ${
          action && action.label
            ? `<button class="toast-action-btn">${escapeHtml(action.label)}</button>`
            : ""
        }
      </div>
      <button class="toast-close-btn" title="Fechar">✕</button>
    </div>
    ${
      duration > 0
        ? `<div class="toast-progress-bar"><div class="toast-progress-fill"></div></div>`
        : ""
    }
  `;

  container.appendChild(toast);

  // Animação de entrada
  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  const progressFill = toast.querySelector(".toast-progress-fill");
  const closeBtn = toast.querySelector(".toast-close-btn");
  const actionBtn = toast.querySelector(".toast-action-btn");

  let isDismissed = false;
  let timerId = null;
  let startTime = Date.now();
  let remainingTime = duration;

  const dismiss = () => {
    if (isDismissed) return;
    isDismissed = true;
    if (timerId) clearTimeout(timerId);

    toast.classList.remove("toast-show");
    toast.classList.add("toast-hide");

    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 400);
  };

  if (closeBtn) {
    closeBtn.addEventListener("click", dismiss);
  }

  if (actionBtn && action && typeof action.onClick === "function") {
    actionBtn.addEventListener("click", () => {
      try {
        action.onClick();
      } catch (err) {
        console.error("Erro ao executar ação do toast:", err);
      }
      dismiss();
    });
  }

  // Controle de temporizador com pausa no hover
  const startTimer = () => {
    if (duration <= 0) return;
    startTime = Date.now();

    if (progressFill) {
      progressFill.style.transition = `transform ${remainingTime}ms linear`;
      progressFill.style.transform = "scaleX(0)";
    }

    timerId = setTimeout(dismiss, remainingTime);
  };

  const pauseTimer = () => {
    if (duration <= 0 || isDismissed) return;
    clearTimeout(timerId);
    remainingTime -= Date.now() - startTime;

    if (progressFill) {
      const computedStyle = window.getComputedStyle(progressFill);
      const matrix = computedStyle.transform;
      progressFill.style.transition = "none";
      progressFill.style.transform = matrix;
    }
  };

  toast.addEventListener("mouseenter", pauseTimer);
  toast.addEventListener("mouseleave", () => {
    if (remainingTime > 0 && !isDismissed) {
      startTimer();
    }
  });

  startTimer();

  return { dismiss };
}

/**
 * Atalhos de conveniência
 */
export const toastSuccess = (title, message, options = {}) =>
  showToast({ title, message, type: "success", ...options });

export const toastError = (title, message, options = {}) =>
  showToast({ title, message, type: "error", ...options });

export const toastWarning = (title, message, options = {}) =>
  showToast({ title, message, type: "warning", ...options });

export const toastInfo = (title, message, options = {}) =>
  showToast({ title, message, type: "info", ...options });

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showToast,
    toastSuccess,
    toastError,
    toastWarning,
    toastInfo,
  };
}
