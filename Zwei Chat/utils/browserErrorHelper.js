// utils/browserErrorHelper.js

/**
 * Classifica e traduz erros de inicialização do Chromium / Puppeteer / whatsapp-web.js
 * para mensagens claras ao usuário, mantendo os detalhes técnicos para log.
 */
function formatBrowserStartError(error, context = {}) {
  const rawMessage =
    typeof error === "string"
      ? error
      : error?.message || String(error || "Erro desconhecido");
  const normalized = rawMessage.toLowerCase();
  const elapsedMs = Number(context.elapsedMs) || 0;
  const hadRemainingLockBeforeLaunch = !!context.hadRemainingLockBeforeLaunch;

  let code = "UNKNOWN";
  let userMessage;

  if (
    normalized.includes("the browser is already running") ||
    normalized.includes("processsingleton") ||
    normalized.includes("lockfile")
  ) {
    // No Windows, se o launch demorou >= 25s sem lock prévio, o Puppeteer
    // frequentemente mascara um TimeoutError por causa do lockfile recém-criado.
    if (elapsedMs >= 25000 && !hadRemainingLockBeforeLaunch) {
      code = "LAUNCH_TIMEOUT_MASKED";
      userMessage =
        "O navegador demorou além do esperado para iniciar e a sessão ficou travada " +
        "(comum quando o computador está lento, sobrecarregado ou muito quente).\n\n" +
        "Feche programas pesados em segundo plano, aguarde alguns segundos e tente conectar novamente.";
    } else {
      code = "BROWSER_LOCKED";
      userMessage =
        "Uma execução anterior do navegador para esta conta ainda estava presa no sistema.\n\n" +
        "O Zwei Chat tentou liberar a sessão automaticamente, mas o arquivo de trava continuou ocupado. " +
        "Aguarde alguns segundos e tente novamente; se persistir, reinicie o Zwei Chat.";
    }
  } else if (
    normalized.includes("auth timeout") ||
    normalized.includes("ready timeout") ||
    normalized.includes("timed out") ||
    normalized.includes("timeout") ||
    error?.name === "TimeoutError"
  ) {
    code = "TIMEOUT";
    userMessage =
      "O WhatsApp Web demorou mais do que o tempo limite para abrir ou responder " +
      "(isso costuma acontecer quando o notebook está lento, sobrecarregado ou superaquecendo).\n\n" +
      "Feche outros programas pesados e tente conectar novamente.";
  } else if (
    normalized.includes("browser was not found") ||
    normalized.includes("could not find chrome") ||
    normalized.includes("tried to find the browser")
  ) {
    code = "CHROME_NOT_FOUND";
    userMessage =
      "Google Chrome não encontrado neste computador.\n\n" +
      "Verifique se o Google Chrome está instalado no caminho padrão e tente novamente.";
  } else if (
    normalized.includes("target closed") ||
    normalized.includes("session closed") ||
    normalized.includes("browser has disconnected") ||
    normalized.includes("navigation failed")
  ) {
    code = "BROWSER_CLOSED";
    userMessage =
      "O navegador foi encerrado inesperadamente durante a conexão " +
      "(pode ocorrer por falta de memória ou fechamento externo).\n\n" +
      "Tente conectar novamente.";
  } else {
    userMessage = `Não foi possível iniciar a conexão.\n\nDetalhe: ${rawMessage}`;
  }

  return {
    code,
    userMessage,
    technicalDetails: rawMessage,
  };
}

/**
 * Cria um objeto Error enriquecido com mensagem amigável e detalhes técnicos.
 */
function buildFriendlyBrowserError(error, context = {}) {
  const formatted = formatBrowserStartError(error, context);
  const friendlyErr = new Error(formatted.userMessage);
  friendlyErr.code = formatted.code;
  friendlyErr.userMessage = formatted.userMessage;
  friendlyErr.technicalDetails = formatted.technicalDetails;
  friendlyErr.cause = error;
  return friendlyErr;
}

module.exports = {
  formatBrowserStartError,
  buildFriendlyBrowserError,
};
