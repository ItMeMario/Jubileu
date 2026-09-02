// renderer/guiScripts/appGuiModules/domUtils.js
// Utilitários de manipulação segura de DOM, formatação e renderização de elementos

/**
 * Atalho seguro para querySelector
 * @param {string} selector
 * @param {ParentNode} [context=document]
 * @returns {HTMLElement|null}
 */
export function $(selector, context = document) {
  if (!context || !context.querySelector) return null;
  return context.querySelector(selector);
}

/**
 * Atalho seguro para querySelectorAll retornando Array
 * @param {string} selector
 * @param {ParentNode} [context=document]
 * @returns {HTMLElement[]}
 */
export function $$(selector, context = document) {
  if (!context || !context.querySelectorAll) return [];
  return Array.from(context.querySelectorAll(selector));
}

/**
 * Formata timestamp ou string de data para formato legível pt-BR
 * @param {number|string|Date} dateInput
 * @returns {string}
 */
export function formatDate(dateInput) {
  if (!dateInput) return "-";
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    return d.toLocaleString("pt-BR");
  } catch (_e) {
    return String(dateInput);
  }
}

/**
 * Retorna classe CSS para pills de status com base no valor
 * @param {string} status
 * @returns {string}
 */
export function getStatusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED" || s === "GREEN" || s === "CONECTADO" || s === "COMPLETED" || s === "ATIVO") {
    return "status-pill status-green";
  }
  if (s === "PENDING" || s === "YELLOW" || s === "PAUSADO" || s === "INATIVO" || s === "VERIFICANDO...") {
    return "status-pill status-yellow";
  }
  return "status-pill status-red";
}

/**
 * Escapa strings para inserção segura em HTML
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Faz download de conteúdo CSV no navegador
 * @param {string} filename
 * @param {string} csvContent
 */
export function downloadCsvFile(filename, csvContent) {
  if (!csvContent) return;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `relatorio_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = { $, $$, formatDate, getStatusBadgeClass, escapeHtml, downloadCsvFile };
}

