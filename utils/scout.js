// util/scout.js
const { getLastMenuTime } = require("../utils/lastActivity");
const { debug } = require("../services/debugService");
const { readJsonFile } = require("../config/initialize");

async function getDevModeConfig() {
  try {
    const devMode = await readJsonFile("devMode.json", {
      isDevMode: true,
      scoutConfig: {
        enabled: false,
        timeSeconds: 60,
      },
    });
    return devMode;
  } catch (error) {
    console.error("[SCOUT] Erro ao ler configuração devMode:", error);
    return {
      isDevMode: true,
      scoutConfig: {
        enabled: false,
        timeSeconds: 60,
      },
    };
  }
}

function startScout(client) {
  client.on("ready", async () => {
    try {
      const devMode = await getDevModeConfig();
      const isDev = devMode.isDevMode;
      const scoutEnabled = devMode.scoutConfig?.enabled;

      if (!scoutEnabled) {
        debug("[SCOUT] Scout desativado em devMode.json");
        return;
      }

      debug("[SCOUT] Client pronto, iniciando scout...");

      const chatId = client.info?.wid?._serialized;

      if (!chatId) {
        debug("[SCOUT] Não foi possível obter o ID do bot via client.info");
        return;
      }

      const interval = isDev
        ? 10000
        : (devMode.scoutConfig.timeSeconds || 60) * 1000;

      setInterval(async () => {
        try {
          const agora = new Date();
          const horaAtual = agora.toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          let mensagem = "oi eu to online";

          const lastMenuTime = getLastMenuTime();
          if (lastMenuTime) {
            mensagem += `\n⏰ Último menu enviado: ${lastMenuTime}`;
          } else {
            mensagem += "\n⏰ Nenhum menu enviado ainda nesta sessão";
          }

          await client.sendMessage(chatId, mensagem);

          await debug(
            `[SCOUT] Mensagem enviada para ${chatId} às ${horaAtual}`
          );
        } catch (err) {
          await debug("[SCOUT] Erro ao enviar mensagem:", err.message);
        }
      }, interval);
    } catch (error) {
      console.error("[SCOUT] Erro ao inicializar scout:", error);
    }
  });
}

module.exports = startScout;
