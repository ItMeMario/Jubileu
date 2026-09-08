// renderer/guiScripts/appGuiModules/broadcastModules/broadcastParser.js
// Parser e processamento de arquivos CSV e texto com lista de contatos

import { customAlert } from "../../utils/confirmModal.js";

/**
 * Faz o parse de texto com múltiplos contatos (uma linha por contato)
 * Formato esperado: "Telefone, Nome/Var1, Var2, Var3..." ou "Nome, Telefone"
 * @param {string} rawText
 * @returns {Array<{ phone: string, name: string, variables: string[] }>}
 */
export function parseRecipientsInput(rawText) {
  if (!rawText || typeof rawText !== "string") return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsed = [];

  lines.forEach((line, index) => {
    // Ignora cabeçalhos comuns na linha 0
    if (
      index === 0 &&
      (line.toLowerCase().includes("telefone") ||
        line.toLowerCase().includes("phone") ||
        line.toLowerCase().includes("nome") ||
        line.toLowerCase().includes("name") ||
        line.toLowerCase().includes("celular"))
    ) {
      return;
    }

    const parts = line.split(/[;,]/).map((p) => p.trim().replace(/^["']|["']$/g, ""));
    if (parts.length === 0) return;

    // Detecta se a coluna 0 ou 1 é o telefone
    let phone = "";
    let name = "";
    let variables = [];

    const digits0 = parts[0].replace(/\D/g, "");
    const digits1 = parts[1] ? parts[1].replace(/\D/g, "") : "";

    if (digits0.length >= 8) {
      phone = parts[0];
      name = parts[1] || "";
      variables = parts.slice(1);
    } else if (digits1.length >= 8) {
      name = parts[0];
      phone = parts[1];
      variables = [name, ...parts.slice(2)];
    } else {
      phone = parts[0];
      name = parts[1] || "";
      variables = parts.slice(1);
    }

    if (phone.length > 0) {
      parsed.push({ phone, name, variables });
    }
  });

  return parsed;
}

/**
 * Lê e processa arquivo CSV enviado pelo usuário
 * @param {File} file
 * @param {object} api
 * @param {Function} [onImportComplete] - Callback invocado após sucesso na importação
 */
export function processCsvFile(file, api, onImportComplete) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target?.result;
      if (!content || typeof content !== "string") {
        await customAlert("O arquivo CSV selecionado está vazio.");
        return;
      }

      const contacts = parseRecipientsInput(content);
      if (contacts.length === 0) {
        await customAlert("Nenhum contato válido identificado no arquivo CSV.");
        return;
      }

      const count = await api.addRecipientsBatch(contacts);
      await customAlert(`🎉 Importação Concluída!\n${count} contato(s) adicionados à fila de disparo.`);
      if (typeof onImportComplete === "function") {
        await onImportComplete();
      }
    } catch (err) {
      await customAlert(`Erro ao processar arquivo CSV: ${err.message}`);
    }
  };
  reader.readAsText(file, "UTF-8");
}

// Compatibilidade para testes em ambiente Node.js
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    parseRecipientsInput,
    processCsvFile,
  };
}
