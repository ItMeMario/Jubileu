// cloud-gateway/server.js
// Servidor de Webhook Local com Cloudflare Tunnel de Alta Estabilidade

const http = require("http");
const url = require("url");
const crypto = require("crypto");
const path = require("path");
const axios = require("axios");
const { startTunnel: startCloudflareTunnel } = require("untun");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { flowExecutor } = require("../client/flowExecutor");
const { botIntegrationService } = require("../services/botIntegrationService");
const { syncService } = require("../services/syncService");
const { window24hService } = require("../services/window24hService");

const PORT = parseInt(process.env.PORT || "3000", 10);
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "zwei_chat_meta_verify_token_2026";
const APP_SECRET = process.env.META_APP_SECRET || "";
const APP_ID = "1824502742321385";

// Inicializa o serviço de chatbot
botIntegrationService.initialize();

/**
 * Normaliza mensagem da Meta
 */
function normalizeMessage(message, contact, metadata) {
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
      break;
    case "audio":
      normalized.body = "[Áudio]";
      break;
    default:
      normalized.body = `[${message.type || "Mensagem"}]`;
  }

  return normalized;
}

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = reqUrl.pathname;
  const isWebhookPath = pathname === "/webhook" || pathname === "/";

  // 1. Handshake GET (Verificação da Meta)
  if (req.method === "GET" && isWebhookPath) {
    const mode = reqUrl.searchParams.get("hub.mode");
    const token = reqUrl.searchParams.get("hub.verify_token");
    const challenge = reqUrl.searchParams.get("hub.challenge");

    console.log(`\n🔍 [Webhook GET] Handshake recebido: mode=${mode}, token=${token}`);

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
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
              const normalized = normalizeMessage(message, contact, metadata);

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

/**
 * Registra a URL do Webhook na Meta via Graph API
 */
async function registerWebhookOnMeta(callbackUrl) {
  try {
    const appAccessToken = `${APP_ID}|${APP_SECRET}`;
    const endpoint = `https://graph.facebook.com/v21.0/${APP_ID}/subscriptions`;

    const res = await axios.post(endpoint, null, {
      params: {
        object: "whatsapp_business_account",
        callback_url: callbackUrl,
        verify_token: VERIFY_TOKEN,
        fields: "messages,message_template_status_update",
        access_token: appAccessToken,
      },
    });

    if (res.data?.success) {
      console.log(`🎯 Meta Webhook registrado e aprovado com sucesso para: ${callbackUrl}`);
    }
  } catch (error) {
    console.warn("⚠️ Aviso ao registrar webhook na Meta API:", error.response?.data?.error?.message || error.message);
  }
}

/**
 * Inicia túnel seguro Cloudflare
 */
async function startTunnel() {
  try {
    const tunnel = await startCloudflareTunnel({ port: PORT });
    const rawUrl = await tunnel.getURL();
    const publicUrl = `${rawUrl}/webhook`;

    console.log(`\n⚡ [CLOUDFLARE TUNNEL ATIVO - 100% ESTÁVEL]`);
    console.log(`👉 URL Pública do Webhook: ${publicUrl}`);
    console.log(`🔑 Verify Token: ${VERIFY_TOKEN}`);

    console.log(`⏳ Aguardando propagação do túnel (3s)...`);
    await new Promise((r) => setTimeout(r, 3000));

    // Registra na Meta com retry
    let registered = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await registerWebhookOnMeta(publicUrl);
        registered = true;
        break;
      } catch (e) {
        console.log(`Tentativa ${attempt} falhou, tentando novamente...`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  } catch (err) {
    console.error("❌ Erro ao iniciar Cloudflare tunnel:", err.message);
    setTimeout(startTunnel, 5000);
  }
}

server.listen(PORT, () => {
  console.log(`\n🚀 [ZWEI PREMIUM] Servidor Webhook rodando localmente na porta ${PORT}`);
  startTunnel();
});
