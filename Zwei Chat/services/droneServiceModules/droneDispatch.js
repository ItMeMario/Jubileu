// services/droneServiceModules/droneDispatch.js
const { debug } = require("../debugService");
const { SERVICE_STATUS } = require("../servicesModules/constants");
const { aplicarTransformacoes } = require("./numberTransformer");

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
    service.emit('dispatch-status', { active: true });

    // Inicializa estatísticas de progresso
    service.dispatchProgress = {
        total: clientsToSend.length,
        current: 0,
        sent: 0,
        failed: 0
    };

    // Divide os clientes entre as instâncias disponíveis
    const numClients = clientsToSend.length;
    const numDrones = connected.length;
    const droneTasks = Array.from({ length: numDrones }, () => []);

    for (let i = 0; i < numClients; i++) {
        const droneIndex = i % numDrones;
        droneTasks[droneIndex].push(clientsToSend[i]);
    }

    // Inicia loops paralelos de envio para cada drone
    const promises = connected.map((drone, idx) => {
        const tasks = droneTasks[idx];
        return runDroneLoop(service, drone, tasks, messages);
    });

    // Aguarda todas as tarefas completarem em background
    Promise.all(promises).then(() => {
        service.isDispatching = false;
        service.emit('dispatch-status', { active: false });
        service.emit('dispatch-complete', service.dispatchProgress);
    }).catch(err => {
        console.error("Erro no processamento geral de disparo:", err);
        service.isDispatching = false;
        service.emit('dispatch-status', { active: false });
    });

    return { success: true, message: `Disparo iniciado para ${clientsToSend.length} contatos usando ${connected.length} instâncias.` };
}

async function runDroneLoop(service, drone, tasks, messages) {
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    for (let i = 0; i < tasks.length; i++) {
        if (!service.isDispatching) break;

        const clientData = tasks[i];
        
        // Transforma o número seguindo as configurações
        const formatOptions = {
            prefixoPais: service.config.addCountryPrefix ? service.config.defaultCountryPrefix : null,
            ddd: service.config.addDDD ? service.config.defaultDDD : null,
            adicionar9Digito: service.config.add9thDigit
        };

        const formattedNum = aplicarTransformacoes(clientData.tel, formatOptions);
        const whatsappNumber = formattedNum + "@c.us";

        // Escolhe mensagem aleatória e substitui variáveis
        const msgObj = messages[Math.floor(Math.random() * messages.length)];
        let text = msgObj.message_content;
        
        // Substitui {{name}}
        const clientName = clientData.name || "Cliente";
        text = text.replace(/\{\{name\}\}/g, clientName);

        try {
            // Atualiza status como enviando
            service.emit('dispatch-progress', {
                clientName: clientName,
                phoneNumber: clientData.tel,
                formattedNumber: formattedNum,
                status: 'sending',
                droneName: drone.name
            });

            // Envia
            await drone.client.sendMessage(whatsappNumber, text);
            
            // Atualiza banco
            await service.dbUpdateClientStatus(clientData.id, 'sent');
            
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
            console.error(`Drone: Erro ao enviar mensagem para ${clientData.tel} usando ${drone.name}:`, err);
            
            // Atualiza banco
            await service.dbUpdateClientStatus(clientData.id, 'failed');
            
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

        // Aguarda delay configurado se não for o último item
        if (i < tasks.length - 1 && service.isDispatching) {
            const waitTime = getRandomInt(service.config.minIntervalSeconds * 1000, service.config.maxIntervalSeconds * 1000);
            await delay(waitTime);
        }
    }
}

async function stopDispatch(service) {
    service.isDispatching = false;
    service.emit('dispatch-status', { active: false });
    return { success: true };
}

module.exports = {
    getConnectedInstances,
    startDispatch,
    stopDispatch,
    runDroneLoop
};
