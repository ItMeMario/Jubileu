// services/droneServiceModules/droneDispatch.js
const { debug } = require("../debugService");
const { SERVICE_STATUS } = require("../servicesModules/constants");
const { aplicarTransformacoes } = require("./numberTransformer");
const { calculateDelayMs } = require("../../utils/delayHelper");

function getConnectedInstances(service) {
    const connected = [];
    service.clients.forEach((val, key) => {
        if (val.status === SERVICE_STATUS.CONNECTED && val.client) {
            connected.push({
                instanceId: key,
                client: val.client,
                name: val.name
            });
        }
    });
    return connected;
}

async function startDispatch(service) {
    if (service.isDispatching) return { success: false, message: "Disparo já está rodando." };

    const connected = getConnectedInstances(service);
    if (connected.length === 0) {
        throw new Error("Nenhuma conta de Drone conectada e pronta.");
    }

    // Busca clientes pendentes ou falhos do banco
    const clientsToSend = await service.dbGetPendingAndFailedClients();

    if (clientsToSend.length === 0) {
        throw new Error("Nenhum contato pendente ou falho na lista para disparo.");
    }

    const messages = await service.dbGetDroneMessages();
    if (messages.length === 0) {
        throw new Error("Nenhuma mensagem cadastrada. Adicione modelos de mensagens primeiro.");
    }

    service.isDispatching = true;
    service.dispatchedNumbers = new Set();
    service.emit('dispatch-status', { active: true });

    // Configurações de formatação para pré-processamento
    const formatOptions = {
        prefixoPais: service.config.addCountryPrefix ? service.config.defaultCountryPrefix : null,
        ddd: service.config.addDDD ? service.config.defaultDDD : null,
        adicionar9Digito: service.config.add9thDigit
    };

    // ETAPA 1: Pré-sorteio único e deduplicação determinística em memória
    const uniqueTasks = [];
    const seenNumbers = new Set();

    for (const clientData of clientsToSend) {
        const formattedNum = aplicarTransformacoes(clientData.tel, formatOptions);
        const whatsappNumber = formattedNum + "@c.us";

        // Se este número de WhatsApp já teve uma mensagem sorteada nesta lista
        if (seenNumbers.has(whatsappNumber)) {
            console.warn(`Drone: Contato duplicado ignorado para ${clientData.name || 'Cliente'} (${formattedNum}, id: ${clientData.id})`);
            // Marca no banco como 'sent' para não reprocessar no futuro
            service.dbUpdateClientStatus(clientData.id, 'sent').catch(e => console.error("Erro ao atualizar duplicado:", e));
            continue;
        }

        seenNumbers.add(whatsappNumber);

        // Realiza o sorteio ÚNICO e determinístico para este contato
        const msgObj = messages[Math.floor(Math.random() * messages.length)];

        uniqueTasks.push({
            clientData,
            formattedNum,
            whatsappNumber,
            messageContent: msgObj.message_content,
            messageId: msgObj.id
        });
    }

    if (uniqueTasks.length === 0) {
        service.isDispatching = false;
        service.emit('dispatch-status', { active: false });
        throw new Error("Nenhum contato válido restante após a remoção de duplicatas.");
    }

    // Inicializa estatísticas de progresso com a quantidade real de contatos únicos
    service.dispatchProgress = {
        total: uniqueTasks.length,
        current: 0,
        sent: 0,
        failed: 0
    };

    // Divide as tarefas pré-sorteadas entre as instâncias disponíveis
    const numClients = uniqueTasks.length;
    const numDrones = connected.length;
    const droneTasks = Array.from({ length: numDrones }, () => []);

    for (let i = 0; i < numClients; i++) {
        const droneIndex = i % numDrones;
        droneTasks[droneIndex].push(uniqueTasks[i]);
    }

    // Inicia loops paralelos de envio para cada drone
    const promises = connected.map((drone, idx) => {
        const tasks = droneTasks[idx];
        return runDroneLoop(service, drone, tasks, messages);
    });

    // Aguarda todas as tarefas completarem em background
    Promise.all(promises).then(() => {
        service.isDispatching = false;
        if (service.dispatchedNumbers) service.dispatchedNumbers.clear();
        service.emit('dispatch-status', { active: false });
        service.emit('dispatch-complete', service.dispatchProgress);
    }).catch(err => {
        console.error("Erro no processamento geral de disparo:", err);
        service.isDispatching = false;
        if (service.dispatchedNumbers) service.dispatchedNumbers.clear();
        service.emit('dispatch-status', { active: false });
    });

    return { success: true, message: `Disparo iniciado para ${uniqueTasks.length} contatos únicos usando ${connected.length} instâncias.` };
}

async function runDroneLoop(service, drone, tasks, messages) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    for (let i = 0; i < tasks.length; i++) {
        if (!service.isDispatching) break;

        const taskItem = tasks[i];
        
        // Suporta tanto o novo formato pré-sorteado quanto fallback legado
        const clientData = taskItem.clientData || taskItem;
        let formattedNum = taskItem.formattedNum;
        let whatsappNumber = taskItem.whatsappNumber;
        let messageText = taskItem.messageContent;

        if (!whatsappNumber) {
            const formatOptions = {
                prefixoPais: service.config.addCountryPrefix ? service.config.defaultCountryPrefix : null,
                ddd: service.config.addDDD ? service.config.defaultDDD : null,
                adicionar9Digito: service.config.add9thDigit
            };
            formattedNum = aplicarTransformacoes(clientData.tel, formatOptions);
            whatsappNumber = formattedNum + "@c.us";
        }

        // Trava anti-double-draw: se este número já foi despachado por outro robô nesta sessão, ignora
        if (service.dispatchedNumbers && service.dispatchedNumbers.has(whatsappNumber)) {
            console.warn(`Drone: Bloqueio anti-duplicidade em execução para ${whatsappNumber}`);
            continue;
        }
        if (service.dispatchedNumbers) {
            service.dispatchedNumbers.add(whatsappNumber);
        }

        // Se a mensagem não veio pré-sorteada, usa o fallback
        if (!messageText) {
            const msgObj = messages[Math.floor(Math.random() * messages.length)];
            messageText = msgObj.message_content;
        }

        let text = messageText;
        const clientName = clientData.name || "Cliente";
        text = text.replace(/\{\{name\}\}/g, clientName);

        let messageSent = false;
        try {
            // Atualiza status como enviando
            service.emit('dispatch-progress', {
                clientName: clientName,
                phoneNumber: clientData.tel,
                formattedNumber: formattedNum,
                status: 'sending',
                droneName: drone.name
            });

            // Envia mensagem via WhatsApp
            await drone.client.sendMessage(whatsappNumber, text);
            messageSent = true;
            
            // Atualiza banco de dados de forma isolada
            try {
                await service.dbUpdateClientStatus(clientData.id, 'sent');
            } catch (dbErr) {
                console.error(`Drone: Mensagem enviada para ${formattedNum}, mas erro ao atualizar banco para 'sent':`, dbErr);
            }
            
            service.dispatchProgress.sent++;
            service.dispatchProgress.current++;

            // Emite log e progresso de sucesso
            const logMsg = `[Enviado] ${drone.name} ➔ ${clientName} (${formattedNum})`;
            service.emit('log', {
                timestamp: new Date(),
                droneName: drone.name,
                clientName: clientName,
                message: logMsg,
                status: 'success'
            });
            
            service.emit('dispatch-progress', {
                clientName: clientName,
                phoneNumber: clientData.tel,
                formattedNumber: formattedNum,
                status: 'sent',
                droneName: drone.name,
                progress: service.dispatchProgress
            });

        } catch (err) {
            console.error(`Drone: Erro durante envio para ${clientData.tel} usando ${drone.name}:`, err);
            
            // Se a mensagem já foi enviada no WhatsApp, NUNCA marca como falha para evitar re-disparo
            if (!messageSent) {
                try {
                    await service.dbUpdateClientStatus(clientData.id, 'failed');
                } catch (dbErr) {
                    console.error(`Drone: Erro ao atualizar status 'failed' no banco:`, dbErr);
                }
                
                service.dispatchProgress.failed++;
                service.dispatchProgress.current++;

                const logMsg = `[Falha] ${drone.name} ➔ ${clientName} (${formattedNum}): ${err.message}`;
                service.emit('log', {
                    timestamp: new Date(),
                    droneName: drone.name,
                    clientName: clientName,
                    message: logMsg,
                    status: 'failed'
                });

                service.emit('dispatch-progress', {
                    clientName: clientName,
                    phoneNumber: clientData.tel,
                    formattedNumber: formattedNum,
                    status: 'failed',
                    error: err.message,
                    droneName: drone.name,
                    progress: service.dispatchProgress
                });
            }
        }

        // Aguarda delay configurado se não for o último item
        if (i < tasks.length - 1 && service.isDispatching) {
            const waitTime = calculateDelayMs(service.config.dispatchInterval || {
                type: 'range',
                unit: 'seconds',
                min: service.config.minIntervalSeconds || 5,
                max: service.config.maxIntervalSeconds || 15
            });
            await delay(waitTime);
        }
    }
}

async function stopDispatch(service) {
    service.isDispatching = false;
    if (service.dispatchedNumbers) {
        service.dispatchedNumbers.clear();
    }
    service.emit('dispatch-status', { active: false });
    return { success: true };
}

module.exports = {
    getConnectedInstances,
    startDispatch,
    stopDispatch,
    runDroneLoop
};
