const crypto = require("crypto");

let functions;
try {
  functions = require("firebase-functions");
} catch (e) {
  // Fallback quando executado em ambiente de teste ou local sem firebase-functions
  functions = null;
}

let admin;
try {
  admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp();
  }
} catch (e) {
  admin = null;
}

const db = admin ? admin.firestore() : null;

/**
 * Validação de Assinatura Criptográfica HMAC-SHA256 da Meta
 * Garante que o payload recebido realmente partiu dos servidores da Meta.
 * @param {Buffer|string} rawBody - Corpo bruto da requisição
 * @param {string} signatureHeader - Header X-Hub-Signature-256
 * @param {string} appSecret - Segredo do Aplicativo Meta (App Secret)
 * @returns {boolean}
 */
function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret) {
    return false;
  }

  const [algorithm, signatureHash] = signatureHeader.split("=");
  if (algorithm !== "sha256" || !signatureHash) {
    return false;
  }

  const expectedHash = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody)
    .digest("hex");

  const signatureBuffer = Buffer.from(signatureHash, "hex");
  const expectedBuffer = Buffer.from(expectedHash, "hex");

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

/**
 * Normaliza o payload de uma mensagem de entrada da Meta para o formato interno do Zwei Chat
 * @param {object} message - Objeto de mensagem individual do payload da Meta
 * @param {object} contact - Objeto de contato correspondente (se disponível)
 * @param {object} metadata - Metadados da conta (phone_number_id, display_phone_number)
 * @returns {object} Mensagem normalizada
 */
function normalizeIncomingMessage(message, contact, metadata) {
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
    createdAt: admin?.firestore?.FieldValue
      ? admin.firestore.FieldValue.serverTimestamp()
      : new Date(),
  };

  switch (message.type) {
    case "text":
      normalized.body = message.text?.body || "";
      break;

    case "interactive":
      // Botão de Resposta Rápida (Quick Reply)
      if (message.interactive?.type === "button_reply") {
        normalized.interactiveType = "button_reply";
        normalized.buttonReply = {
          id: message.interactive.button_reply.id,
          title: message.interactive.button_reply.title,
        };
        normalized.body = message.interactive.button_reply.title;
      }
      // Resposta de Menu/Lista (List Reply)
      else if (message.interactive?.type === "list_reply") {
        normalized.interactiveType = "list_reply";
        normalized.listReply = {
          id: message.interactive.list_reply.id,
          title: message.interactive.list_reply.title,
          description: message.interactive.list_reply.description || "",
        };
        normalized.body = message.interactive.list_reply.title;
      }
      break;

    case "image":
      normalized.body = message.image?.caption || "[Imagem]";
      normalized.media = {
        id: message.image.id,
        mimeType: message.image.mime_type,
        sha256: message.image.sha256,
        caption: message.image.caption || null,
      };
      break;

    case "audio":
      normalized.body = "[Áudio]";
      normalized.media = {
        id: message.audio.id,
        mimeType: message.audio.mime_type,
        voice: message.audio.voice || false,
      };
      break;

    case "document":
      normalized.body = message.document?.filename || "[Documento]";
      normalized.media = {
        id: message.document.id,
        filename: message.document.filename || null,
        mimeType: message.document.mime_type,
        caption: message.document.caption || null,
      };
      break;

    case "video":
      normalized.body = message.video?.caption || "[Vídeo]";
      normalized.media = {
        id: message.video.id,
        mimeType: message.video.mime_type,
        caption: message.video.caption || null,
      };
      break;

    case "location":
      normalized.body = `[Localização: ${message.location.latitude}, ${message.location.longitude}]`;
      normalized.location = {
        latitude: message.location.latitude,
        longitude: message.location.longitude,
        name: message.location.name || null,
        address: message.location.address || null,
      };
      break;

    case "reaction":
      normalized.body = message.reaction?.emoji || "";
      normalized.reaction = {
        messageId: message.reaction.message_id,
        emoji: message.reaction.emoji,
      };
      break;

    default:
      normalized.body = `[Mensagem do tipo: ${message.type}]`;
      normalized.raw = message;
      break;
  }

  return normalized;
}

/**
 * Processa atualizações de status de mensagens enviadas (sent, delivered, read, failed)
 * @param {object} statusUpdate - Objeto de status do payload da Meta
 */
async function processStatusUpdate(statusUpdate) {
  const messageId = statusUpdate.id;
  const recipientId = statusUpdate.recipient_id;
  const status = statusUpdate.status; // 'sent' | 'delivered' | 'read' | 'failed'
  const timestamp = parseInt(statusUpdate.timestamp, 10) * 1000 || Date.now();

  const updateData = {
    status: status,
    [`statusTimestamps.${status}`]: timestamp,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (statusUpdate.errors && statusUpdate.errors.length > 0) {
    updateData.errors = statusUpdate.errors;
  }

  // Atualiza o documento da mensagem específica se existir
  const messageRef = db.collection("messages").doc(messageId);
  await messageRef.set(updateData, { merge: true });

  // Registra no histórico de logs de status
  await db.collection("status_logs").add({
    messageId,
    recipientId,
    status,
    timestamp,
    errors: statusUpdate.errors || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function handleWebhookRequest(req, res) {
  // 1. Handshake de Verificação (GET)
  if (req.method === "GET") {
    const mode = req.query?.["hub.mode"] || req.query?.mode;
    const token = req.query?.["hub.verify_token"] || req.query?.verify_token;
    const challenge = req.query?.["hub.challenge"] || req.query?.challenge;

    const verifyToken = process.env.META_VERIFY_TOKEN || (functions?.config?.()?.meta?.verify_token);

    if (mode === "subscribe" && token === verifyToken) {
      console.log("✅ Webhook da Meta verificado com sucesso!");
      return res.status(200).send(challenge);
    } else {
      console.warn("⚠️ Falha na verificação do Webhook da Meta. Token inválido.");
      return res.status(403).send("Forbidden");
    }
  }

  // 2. Recepção de Notificações e Mensagens (POST)
  if (req.method === "POST") {
    const appSecret = process.env.META_APP_SECRET || (functions?.config?.()?.meta?.app_secret);
    const signature = req.headers?.["x-hub-signature-256"];

    // Se houver App Secret configurado, valida a assinatura criptográfica
    if (appSecret && !verifyMetaSignature(req.rawBody || JSON.stringify(req.body), signature, appSecret)) {
      console.error("❌ Assinatura HMAC inválida no Webhook da Meta.");
      return res.status(401).send("Invalid Signature");
    }

    const body = req.body;

    // Confirma que é uma notificação do WhatsApp Business
    if (!body || body.object !== "whatsapp_business_account") {
      return res.status(404).send("Not a WhatsApp event");
    }

    try {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          if (change.field !== "messages") continue;

          const value = change.value;
          if (!value) continue;

          const metadata = value.metadata;
          const contacts = value.contacts || [];

          // 2.1 Processa Mensagens Recebidas (Inbound)
          if (value.messages && value.messages.length > 0) {
            for (const message of value.messages) {
              const contact = contacts.find((c) => c.wa_id === message.from) || contacts[0];
              const normalizedMessage = normalizeIncomingMessage(message, contact, metadata);

              if (db) {
                // Idempotência: Grava a mensagem usando o próprio ID da Meta
                await db.collection("messages").doc(normalizedMessage.id).set(normalizedMessage, { merge: true });

                // Atualiza / Cria a Conversa no Firestore
                const conversationRef = db.collection("conversations").doc(message.from);
                await conversationRef.set(
                  {
                    contactPhone: message.from,
                    contactName: contact?.profile?.name || message.from,
                    lastMessage: normalizedMessage.body,
                    lastMessageType: normalizedMessage.type,
                    lastInteractionTimestamp: normalizedMessage.timestamp,
                    lastDirection: "inbound",
                    unreadCount: admin ? admin.firestore.FieldValue.increment(1) : 1,
                    updatedAt: admin?.firestore?.FieldValue ? admin.firestore.FieldValue.serverTimestamp() : new Date(),
                  },
                  { merge: true }
                );
              }

              console.log(`📩 Mensagem recebida de ${message.from}: [${normalizedMessage.type}] ${normalizedMessage.body}`);
            }
          }

          // 2.2 Processa Atualizações de Status (Sent, Delivered, Read, Failed)
          if (value.statuses && value.statuses.length > 0) {
            for (const statusUpdate of value.statuses) {
              if (db) {
                await processStatusUpdate(statusUpdate);
              }
              console.log(`📊 Status da mensagem ${statusUpdate.id}: ${statusUpdate.status}`);
            }
          }
        }
      }

      // A Meta exige resposta 200 OK imediata para não reenviar eventos
      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("❌ Erro ao processar payload do Webhook da Meta:", error);
      // Retorna 200 para a Meta evitar loops de repetição em caso de erro interno
      return res.status(200).send("ERROR_HANDLED");
    }
  }

  // Qualquer outro método HTTP
  return res.status(405).send("Method Not Allowed");
}

const metaWebhook = functions?.https?.onRequest
  ? functions.https.onRequest(handleWebhookRequest)
  : handleWebhookRequest;

module.exports = {
  metaWebhook,
  handleWebhookRequest,
  verifyMetaSignature,
  normalizeIncomingMessage,
  processStatusUpdate,
};
