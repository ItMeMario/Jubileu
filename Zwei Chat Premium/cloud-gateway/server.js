// cloud-gateway/server.js
// Servidor de Webhook Local com Cloudflare Tunnel de Alta Estabilidade

const http = require("http");
const url = require("url");
const crypto = require("crypto");
const path = require("path");
const axios = require("axios");
const EventEmitter = require("events");
const fs = require("fs");
const { startTunnel: startCloudflareTunnel } = require("untun");
const { storagePaths } = require("../services/storagePaths");
const envPath = storagePaths.getEnvPath();
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  require("dotenv").config();
}

const { flowExecutor } = require("../client/flowExecutor");
const { botIntegrationService } = require("../services/botIntegrationService");
const { syncService } = require("../services/syncService");
const { window24hService } = require("../services/window24hService");
const { tunnelWatchdogService } = require("../services/tunnelWatchdogService");
const metaConfig = require("../config/metaConfig");

class CloudGatewayService extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.tunnel = null;
    this.port = parseInt(process.env.PORT || "3000", 10);
    this.verifyToken = process.env.META_VERIFY_TOKEN || "zwei_chat_meta_verify_token_2026";
    this.appSecret = process.env.META_APP_SECRET || "";
    this.appId = process.env.META_APP_ID || "1824502742321385";
    this.publicUrl = null;
    this.isRunning = false;
  }

  /**
   * Normaliza mensagem da Meta
   */
  normalizeMessage(message, contact, metadata) {
    const normalized = {
      id: message.id,
      from: message.from,
      timestamp: parseInt(message.timestamp, 10) * 1000 || Date.now(),
      type: message.type,
      senderName: contact?.profile?.name || message.from,
      recipientPhoneNumberId: metadata?.phone_number_id || null,
      displayPhoneNumber: metadata?.display_phone_number || null,
      direction: "inbound",
      status: "received",
    };

    switch (message.type) {
      case "text":
        normalized.body = message.text?.body || "";
        break;
      case "interactive":
        if (message.interactive?.type === "button_reply") {
          normalized.interactiveType = "button_reply";
          normalized.buttonReply = message.interactive.button_reply;
          normalized.body = message.interactive.button_reply.title;
        } else if (message.interactive?.type === "list_reply") {
          normalized.interactiveType = "list_reply";
          normalized.listReply = message.interactive.list_reply;
          normalized.body = message.interactive.list_reply.title;
        }
        break;
      case "image":
        normalized.body = message.image?.caption || "[Imagem]";
        normalized.mediaId = message.image?.id || null;
        normalized.mimeType = message.image?.mime_type || null;
        break;
      case "video":
        normalized.body = message.video?.caption || "[Vídeo/GIF]";
        normalized.mediaId = message.video?.id || null;
        normalized.mimeType = message.video?.mime_type || null;
        break;
      case "audio":
        normalized.body = message.audio?.voice ? "[Mensagem de Voz]" : "[Áudio]";
        normalized.mediaId = message.audio?.id || null;
        normalized.mimeType = message.audio?.mime_type || null;
        break;
      case "document":
        normalized.body = message.document?.caption || message.document?.filename || "[Documento]";
        normalized.filename = message.document?.filename || null;
        normalized.mediaId = message.document?.id || null;
        normalized.mimeType = message.document?.mime_type || null;
        break;
      case "sticker":
        normalized.body = message.sticker?.animated ? "[Figurinha Animada]" : "[Figurinha]";
        normalized.mediaId = message.sticker?.id || null;
        normalized.mimeType = message.sticker?.mime_type || null;
        break;
      case "location":
        normalized.body = message.location?.name ? `[Localização: ${message.location.name}]` : "[Localização]";
        normalized.location = message.location || null;
        break;
      case "contacts":
        normalized.body = "[Contato Compartilhado]";
        normalized.contacts = message.contacts || null;
        break;
      default:
        normalized.body = `[${message.type || "Mensagem"}]`;
    }

    return normalized;
  }

  /**
   * Validação de Assinatura Criptográfica HMAC-SHA256 da Meta
   * Garante que o payload recebido partiu exclusivamente dos servidores oficiais da Meta.
   * @param {Buffer|string} rawBody - Corpo bruto da requisição
   * @param {string} signatureHeader - Header x-hub-signature-256
   * @param {string} appSecret - Segredo do Aplicativo Meta (App Secret)
   * @returns {boolean}
   */
  verifyMetaSignature(rawBody, signatureHeader, appSecret) {
    if (!signatureHeader || !appSecret) {
      return false;
    }

    const parts = signatureHeader.split("=");
    if (parts.length !== 2) return false;

    const [algorithm, signatureHash] = parts;
    if (algorithm.toLowerCase() !== "sha256" || !signatureHash) {
      return false;
    }

    try {
      const expectedHash = crypto
        .createHmac("sha256", appSecret)
        .update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody)
        .digest("hex");

      const signatureBuffer = Buffer.from(signatureHash, "hex");
      const expectedBuffer = Buffer.from(expectedHash, "hex");

      if (signatureBuffer.length !== expectedBuffer.length) {
        return false;
      }

      // Comparação em tempo constante para prevenir Timing Attacks
      return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    } catch (e) {
      return false;
    }
  }

  /**
   * Cria o servidor HTTP do Webhook
   */
  createHttpServer() {
    return http.createServer((req, res) => {
      const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
      const pathname = reqUrl.pathname;
      const isWebhookPath = pathname === "/webhook" || pathname === "/";

      // 1. Handshake GET (Verificação da Meta e auto-teste de ping)
      if (req.method === "GET" && isWebhookPath) {
        const mode = reqUrl.searchParams.get("hub.mode");
        const token = reqUrl.searchParams.get("hub.verify_token");
        const challenge = reqUrl.searchParams.get("hub.challenge");

        // Ping interno para verificação de propagação de DNS
        if (challenge === "ping") {
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end("ping");
          return;
        }

        console.log(`\n🔍 [Webhook GET] Handshake recebido: mode=${mode}, token=${token}`);

        const activeVerifyToken =
          (metaConfig && typeof metaConfig.getConfig === "function"
            ? metaConfig.getConfig().verifyToken
            : null) ||
          this.verifyToken ||
          process.env.META_VERIFY_TOKEN ||
          "zwei_chat_meta_verify_token_2026";

        if (mode === "subscribe" && (token === activeVerifyToken || token === this.verifyToken)) {
          console.log("✅ [Webhook GET] Token verificado com sucesso! Retornando challenge.");
          res.writeHead(200, { "Content-Type": "text/plain" });
          res.end(challenge);
          return;
        } else {
          console.warn("❌ [Webhook GET] Falha na verificação: token incorreto.");
          res.writeHead(403, { "Content-Type": "text/plain" });
          res.end("Forbidden");
          return;
        }
      }

      // 2. Recebimento de Eventos POST
      if (req.method === "POST" && isWebhookPath) {
        let rawBody = "";
        req.on("data", (chunk) => {
          rawBody += chunk;
        });

        req.on("end", async () => {
          // Validação Obrigatória da Assinatura HMAC-SHA256 da Meta
          const signatureHeader =
            req.headers["x-hub-signature-256"] || req.headers["X-Hub-Signature-256"];
          const currentAppSecret =
            (metaConfig && typeof metaConfig.getConfig === "function"
              ? metaConfig.getConfig().appSecret
              : null) ||
            this.appSecret ||
            process.env.META_APP_SECRET;

          // Se houver App Secret configurado, rejeita estritamente payloads forjados ou não assinados
          if (currentAppSecret) {
            const isValid = this.verifyMetaSignature(rawBody, signatureHeader, currentAppSecret);
            if (!isValid) {
              console.warn("⛔ [Segurança Webhook] Requisição POST rejeitada: Assinatura HMAC-SHA256 ausente ou inválida!");
              res.writeHead(403, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "Forbidden: Assinatura de autenticação da Meta ausente ou inválida.",
                })
              );
              return;
            }
          }

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "received" }));

          try {
            const body = JSON.parse(rawBody || "{}");
            if (body.object !== "whatsapp_business_account") return;

            const entries = body.entry || [];
            for (const entry of entries) {
              const changes = entry.changes || [];
              for (const change of changes) {
                if (change.field !== "messages") continue;
                const value = change.value || {};
                const metadata = value.metadata || {};
                const contacts = value.contacts || [];
                const messages = value.messages || [];
                const statuses = value.statuses || [];

                // Status updates (sent, delivered, read)
                for (const status of statuses) {
                  console.log(`📊 [Status Meta] Msg: ${status.id.slice(0, 15)}... -> ${status.status.toUpperCase()} (${status.recipient_id})`);
                  syncService.emit("message:status_updated", {
                    id: status.id,
                    status: status.status,
                    recipientId: status.recipient_id,
                    timestamp: status.timestamp,
                  });
                }

                // Mensagens recebidas
                for (const message of messages) {
                  const contact = contacts.find((c) => c.wa_id === message.from) || contacts[0];
                  const normalized = this.normalizeMessage(message, contact, metadata);

                  console.log(`\n========================================`);
                  console.log(`📩 [MENSAGEM RECEBIDA DO WHATSAPP]`);
                  console.log(`👤 De: ${normalized.senderName} (${normalized.from})`);
                  console.log(`💬 Conteúdo: "${normalized.body}"`);
                  console.log(`🏷️ Tipo: ${normalized.type} ${normalized.interactiveType ? `(${normalized.interactiveType})` : ""}`);
                  console.log(`========================================\n`);

                  // Atualiza janela de 24h
                  window24hService.recordInboundInteraction(normalized.from, normalized.timestamp);

                  // Dispara evento para o bot processar o fluxo
                  syncService.emit("message:inbound", normalized);
                }
              }
            }
          } catch (err) {
            console.error("❌ [Webhook] Erro no processamento do payload:", err.message);
          }
        });
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>Zwei Chat Premium - Cloudflare Webhook Gateway Ativo</h1>");
    });
  }

  /**
   * Registra a URL do Webhook na Meta via Graph API
   */
  async registerWebhookOnMeta(callbackUrl) {
    const currentAppSecret =
      (metaConfig && typeof metaConfig.getConfig === "function"
        ? metaConfig.getConfig().appSecret
        : null) ||
      this.appSecret ||
      process.env.META_APP_SECRET;

    if (!currentAppSecret) {
      console.log(
        "ℹ️ [Gateway Webhook] Cliente operando em modo seguro (sem META_APP_SECRET local). Webhooks são gerenciados centralmente pela Cloud Function."
      );
      return true;
    }

    const currentAppId =
      (metaConfig && typeof metaConfig.getConfig === "function"
        ? metaConfig.getConfig().appId
        : null) ||
      this.appId ||
      process.env.META_APP_ID ||
      "1824502742321385";

    const currentVerifyToken =
      (metaConfig && typeof metaConfig.getConfig === "function"
        ? metaConfig.getConfig().verifyToken
        : null) ||
      this.verifyToken ||
      process.env.META_VERIFY_TOKEN ||
      "zwei_chat_meta_verify_token_2026";

    try {
      const appAccessToken = `${currentAppId}|${currentAppSecret}`;
      const endpoint = `https://graph.facebook.com/v21.0/${currentAppId}/subscriptions`;

      const res = await axios.post(endpoint, null, {
        params: {
          object: "whatsapp_business_account",
          callback_url: callbackUrl,
          verify_token: currentVerifyToken,
          fields: "messages,message_template_status_update",
          access_token: appAccessToken,
        },
      });

      if (res.data?.success) {
        console.log(`🎯 Meta Webhook registrado e aprovado com sucesso para: ${callbackUrl}`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn("⚠️ Aviso ao registrar webhook na Meta API:", error.response?.data?.error?.message || error.message);
      throw error;
    }
  }

  /**
   * Inicia túnel seguro Cloudflare com auto-verificação de propagação
   */
  async startTunnel() {
    this.tunnel = await startCloudflareTunnel({ port: this.port });
    const rawUrl = await this.tunnel.getURL();
    this.publicUrl = `${rawUrl}/webhook`;

    console.log(`\n⚡ [CLOUDFLARE TUNNEL ATIVO - 100% ESTÁVEL]`);
    console.log(`👉 URL Pública do Webhook: ${this.publicUrl}`);
    console.log(`🔑 Verify Token: ${this.verifyToken}`);

    // Aguarda propagação DNS externa antes de acionar a Meta (evita 502: Failed to resolve host)
    console.log(`⏳ Aguardando propagação do túnel Cloudflare...`);
    let isReachable = false;
    for (let attempt = 1; attempt <= 12; attempt++) {
      try {
        const pingUrl = `${this.publicUrl}?hub.mode=subscribe&hub.verify_token=${this.verifyToken}&hub.challenge=ping`;
        const check = await axios.get(pingUrl, { timeout: 4000 });
        if (check.data === "ping") {
          isReachable = true;
          console.log(`🌐 Túnel Cloudflare verificado e respondendo externamente!`);
          break;
        }
      } catch (e) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    if (!isReachable) {
      console.warn("⚠️ Aviso: Túnel demorou para propagar, verificando registro na Meta...");
    }

    // Registra na Meta com retry apenas se houver segredo local (modo dev)
    const currentAppSecret =
      (metaConfig && typeof metaConfig.getConfig === "function"
        ? metaConfig.getConfig().appSecret
        : null) ||
      this.appSecret ||
      process.env.META_APP_SECRET;

    if (currentAppSecret) {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const registered = await this.registerWebhookOnMeta(this.publicUrl);
          if (registered) break;
        } catch (e) {
          console.warn(`Tentativa ${attempt} de registro na Meta falhou, tentando novamente em 2s...`);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    } else {
      console.log(
        "ℹ️ [Gateway Cloudflare] Túnel ativo localmente. Validação de produção com HMAC-SHA256 é realizada pela Cloud Function na nuvem e sincronizada via Firestore."
      );
    }

    this.emit("ready", { publicUrl: this.publicUrl });
  }

  /**
   * Verifica se a porta já está em uso por outra instância ativa do gateway
   */
  async isPortAlreadyActive() {
    try {
      const res = await axios.get(`http://localhost:${this.port}/webhook?hub.challenge=ping`, { timeout: 1500 });
      return res.data === "ping";
    } catch {
      return false;
    }
  }

  /**
   * Inicia o Gateway completo
   */
  async start() {
    if (this.isRunning) return;

    botIntegrationService.initialize();

    const alreadyActive = await this.isPortAlreadyActive();
    if (alreadyActive) {
      console.log(`⚡ [ZWEI PREMIUM] Gateway já está ativo e respondendo na porta ${this.port}.`);
      this.isRunning = true;
      return;
    }

    this.server = this.createHttpServer();
    await new Promise((resolve, reject) => {
      this.server.listen(this.port, () => {
        console.log(`\n🚀 [ZWEI PREMIUM] Servidor Webhook rodando localmente na porta ${this.port}`);
        this.isRunning = true;
        resolve();
      });
      this.server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.warn(`⚠️ Porta ${this.port} já em uso. Utilizando gateway existente.`);
          this.isRunning = true;
          resolve();
        } else {
          reject(err);
        }
      });
    });

    try {
      await this.startTunnel();
      // Inicializa e acopla o Watchdog de alta disponibilidade
      tunnelWatchdogService.setGatewayService(this);
      tunnelWatchdogService.start();
    } catch (err) {
      console.error("❌ Erro ao iniciar Cloudflare tunnel:", err.message);
    }
  }

  /**
   * Reinicia o Cloudflare Tunnel de forma limpa e recuperável
   * Utilizado pelo TunnelWatchdogService durante auto-recuperação
   */
  async restartTunnel() {
    console.log("🔄 [ZWEI PREMIUM] Reiniciando Cloudflare Tunnel...");
    if (this.tunnel && typeof this.tunnel.close === "function") {
      try {
        await this.tunnel.close();
      } catch (e) {
        console.warn("⚠️ Aviso ao fechar túnel anterior:", e.message);
      }
      this.tunnel = null;
    }

    await this.startTunnel();
    return this.publicUrl;
  }

  /**
   * Diagnóstico instantâneo de saúde local e remota do Gateway
   * @returns {Promise<object>}
   */
  async checkHealth() {
    const start = Date.now();
    let localOk = false;
    let publicOk = false;
    let error = null;

    // 1. Checagem local
    try {
      const localRes = await axios.get(`http://127.0.0.1:${this.port}/webhook?hub.challenge=ping`, { timeout: 2500 });
      localOk = localRes.data === "ping";
    } catch (err) {
      error = `Servidor local inacessível: ${err.message}`;
    }

    // 2. Checagem pública
    if (this.publicUrl) {
      try {
        const pingUrl = `${this.publicUrl}?hub.mode=subscribe&hub.verify_token=${this.verifyToken}&hub.challenge=ping`;
        const pubRes = await axios.get(pingUrl, { timeout: 5000 });
        publicOk = pubRes.data === "ping";
      } catch (err) {
        error = `Túnel público inacessível: ${err.message}`;
      }
    }

    const latencyMs = Date.now() - start;
    return {
      healthy: localOk && publicOk,
      localOk,
      publicOk,
      latencyMs,
      error: (localOk && publicOk) ? null : error,
    };
  }

  /**
   * Encerra o Gateway e o Túnel
   */
  async stop() {
    // Para o Watchdog primeiro
    tunnelWatchdogService.stop();

    if (this.server) {
      this.server.close();
      this.server = null;
    }
    if (this.tunnel && typeof this.tunnel.close === "function") {
      try {
        await this.tunnel.close();
      } catch (e) {}
      this.tunnel = null;
    }
    this.isRunning = false;
    console.log("⏹️ [ZWEI PREMIUM] Servidor Webhook e Túnel encerrados.");
  }
}

const cloudGatewayService = new CloudGatewayService();

if (require.main === module) {
  cloudGatewayService.start();
}

module.exports = {
  CloudGatewayService,
  cloudGatewayService,
  tunnelWatchdogService,
};
