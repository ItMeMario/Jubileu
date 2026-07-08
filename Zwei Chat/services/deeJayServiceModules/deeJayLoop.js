// services/deeJayServiceModules/deeJayLoop.js
const { MessageMedia } = require("whatsapp-web.js");
const { debug } = require("../debugService");
const { SERVICE_STATUS } = require("../servicesModules/constants");
const { EMOJIS, GIF_URLS, STICKER_URLS } = require("../../utils/randomContent");

function getConnectedInstances(service) {
    const connected = [];
    
    // 1. Instâncias nativas do Dee Jay conectadas
    service.clients.forEach((val, key) => {
        if (val.status === SERVICE_STATUS.CONNECTED && val.client) {
            connected.push({
                client: val.client,
                status: val.status,
                name: val.name
            });
        }
    });

    // 2. Instâncias do Bot Principal (se a opção de vinculação estiver ativada)
    if (service.config.linkBotPrincipal) {
        try {
            const clientModule = require("../../client/client");
            const botClients = clientModule.clients; // Map de instanceId -> Client
            botClients.forEach((clientInstance, instanceId) => {
                // Verifica se o cliente está conectado e pronto
                if (clientInstance && clientInstance.pupPage && clientInstance.info) {
                    connected.push({
                        client: clientInstance,
                        status: SERVICE_STATUS.CONNECTED,
                        name: `[Bot] Instância ${instanceId}`
                    });
                }
            });
        } catch (e) {
            console.error("Dee Jay: Erro ao obter instâncias do bot principal para vinculação:", e);
        }
    }

    // 3. Instâncias do Drone (se a opção de vinculação estiver ativada)
    if (service.config.linkDrone) {
        try {
            const droneService = require("../droneService");
            const droneStatuses = droneService.getConnectedInstances();
            droneStatuses.forEach(inst => {
                if (inst.client && inst.client.info) {
                    connected.push({
                        client: inst.client,
                        status: SERVICE_STATUS.CONNECTED,
                        name: `[Drone] ${inst.name || 'Disparador'}`
                    });
                }
            });
        } catch (e) {
            console.error("Dee Jay: Erro ao obter instâncias do drone para vinculação:", e);
        }
    }

    return connected;
}

async function startLoop(service) {
    if (service.isRunning) return;
    
    const connectedInstances = getConnectedInstances(service);
    if (connectedInstances.length < 2) {
        throw new Error("Precisa de pelo menos 2 instâncias conectadas.");
    }

    service.isRunning = true;
    service.config.active = true;
    await service.saveConfig();

    service.emit('loop-status', { active: true });
    runConversationLoop(service);
}

async function stopLoop(service) {
    service.isRunning = false;
    service.config.active = false;
    await service.saveConfig();
    service.emit('loop-status', { active: false });
}

async function runConversationLoop(service) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    while (service.isRunning) {
        const connected = getConnectedInstances(service);
        if (connected.length < 2) {
            console.log("Dee Jay: Instâncias conectadas insuficientes (< 2). Parando o loop.");
            await stopLoop(service);
            break;
        }

        // Seleciona par de instâncias
        const senderIdx = Math.floor(Math.random() * connected.length);
        const sender = connected[senderIdx];
        const senderNum = sender.client?.info?.wid?.user;

        let receiverIdx;
        let receiver;
        let receiverNum;
        let attempts = 0;
        const maxAttempts = 50;

        do {
            receiverIdx = Math.floor(Math.random() * connected.length);
            receiver = connected[receiverIdx];
            receiverNum = receiver.client?.info?.wid?.user;
            attempts++;
        } while (
            (receiverIdx === senderIdx || (senderNum && receiverNum && senderNum === receiverNum)) && 
            attempts < maxAttempts
        );

        if (senderNum && receiverNum && senderNum === receiverNum) {
            console.warn("Dee Jay: Não foi possível selecionar duas instâncias com números diferentes.");
            await delay(10000);
            continue;
        }

        await debug(`Dee Jay Loop: ${sender.name} (${senderNum}) -> ${receiver.name} (${receiverNum})`);

        // 1. Envia mensagem do Remetente para o Destinatário
        await sendSingleMessage(service, sender, receiver);

        if (!service.isRunning) break;

        // Calcula o tempo de espera do intervalo configurado
        const minMs = service.config.minIntervalMinutes * 60 * 1000;
        const maxMs = service.config.maxIntervalMinutes * 60 * 1000;
        const waitTime = getRandomInt(minMs, maxMs);

        await debug(`Dee Jay: Aguardando resposta de ${receiver.name} em ${Math.round(waitTime / 1000)}s...`);
        await delay(waitTime);

        if (!service.isRunning) break;

        // 2. Envia a resposta do Destinatário para o Remetente (Inverte os papéis)
        await sendSingleMessage(service, receiver, sender);

        if (!service.isRunning) break;

        // Aguarda mais um intervalo antes de iniciar um novo ciclo
        const nextCycleWait = getRandomInt(minMs, maxMs);
        await debug(`Dee Jay: Ciclo concluído. Próximo ciclo em ${Math.round(nextCycleWait / 1000)}s...`);
        await delay(nextCycleWait);
    }
}

async function sendSingleMessage(service, from, to) {
    const rand = Math.random();
    let message = null;
    let options = undefined;

    try {
         if (rand < 0.55) {
            // Banco de Dados
            message = await service.getRandomDeeJayMessage();
            if (!message) {
                message = getRandomEmoji();
            }
         } else if (rand < 0.70) {
            // Emoji
            message = getRandomEmoji();
         } else if (rand < 0.85) {
            // GIF
            const gifUrl = getRandomGifUrl();
            if (gifUrl) {
                try {
                    message = await MessageMedia.fromUrl(gifUrl, { unsafeMime: true });
                    options = { sendVideoAsGif: true };
                } catch (e) {
                     message = getRandomEmoji();
                }
            } else {
                 message = getRandomEmoji();
            }
         } else {
            // Sticker
            const stickerUrl = getRandomStickerUrl();
            if (stickerUrl) {
                try {
                    message = await MessageMedia.fromUrl(stickerUrl, { unsafeMime: true });
                    options = { sendMediaAsSticker: true };
                } catch (e) {
                     message = getRandomEmoji();
                }
            } else {
                 message = getRandomEmoji();
            }
         }
         
         if (!message) return;

        const receiverNumber = to.client.info.wid.user + "@c.us";
        const sendOptions = { ...options, sendSeen: false }; // Evita erro de leitura
        
        await from.client.sendMessage(receiverNumber, message, sendOptions);
        
        let logMsg = message;
        if (typeof message === 'object') {
            if (options && options.sendMediaAsSticker) {
                logMsg = '[Figurinha 🖼️]';
            } else {
                logMsg = '[GIF 🎥]';
            }
        }

        service.emit('log', {
            timestamp: new Date(),
            sender: from.name,
            receiver: to.name,
            message: logMsg
        });
        await debug(`Dee Jay LOG: ${from.name} ➜ ${to.name}: ${logMsg}`);

    } catch (error) {
        console.error(`Dee Jay: Falha ao enviar mensagem de ${from.name} para ${to.name}:`, error);
    }
}

function getRandomEmoji() {
    if (!EMOJIS || EMOJIS.length === 0) return "👍";
    return EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
}

function getRandomGifUrl() {
    if (!GIF_URLS || GIF_URLS.length === 0) return null;
    return GIF_URLS[Math.floor(Math.random() * GIF_URLS.length)];
}

function getRandomStickerUrl() {
    if (!STICKER_URLS || STICKER_URLS.length === 0) return null;
    return STICKER_URLS[Math.floor(Math.random() * STICKER_URLS.length)];
}

module.exports = {
    getConnectedInstances,
    startLoop,
    stopLoop,
    runConversationLoop,
    sendSingleMessage
};
