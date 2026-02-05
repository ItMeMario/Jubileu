// renderer/guiScripts/crmRenderer.js

// renderer/guiScripts/crmRenderer.js

let btnCreateInstance;
let instancesList;

function initElements() {
    btnCreateInstance = document.getElementById('btn-create-crm-instance');
    instancesList = document.getElementById('crm-instances-list');
    console.log("Elementos inicializados:", { btnCreateInstance, instancesList });
}

// Mapa local para rastrear status (opcional, mas bom para update rápido)
let localInstances = new Map(); 

// Listener de atualizações do serviço
if (window.crmAPI && window.crmAPI.onInstanceUpdate) {
    window.crmAPI.onInstanceUpdate((data) => {
        console.log("Update recebido:", data);
        updateInstanceCard(data);
    });
}

// Função para atualizar um card específico sem re-renderizar tudo
function updateInstanceCard(data) {
    const card = document.getElementById(`card-${data.instanceId}`);
    if (!card) return;

    const statusBadge = card.querySelector('.status-badge');
    const qrContainer = card.querySelector('.qr-container');
    const qrImage = card.querySelector('.qr-image');
    const infoText = card.querySelector('.info-text');

    if (statusBadge) {
        statusBadge.className = `status-badge ${data.status}`;
        statusBadge.textContent = data.status;
    }

    if (data.status === 'qr_pending' && data.qr) {
        if (qrContainer) qrContainer.style.display = 'block';
        if (qrImage) {
            // QRCode library might be needed if raw string, but usually we send dataURL or use a lib in renderer
            // Actually, message implementation sends dataURL usually.
            // But whatsapp-web.js sends raw string. We need qrcode.js lib or similar.
            // Let's assume we need to generate it using a library included globally or we used to send base64?
            // DeeJay uses `qrcode.toDataURL` in service or renderer?
            // Checking DeeJay... it doesn't show in the service code I read.
            // Wait, DeeJay service emits 'qr'. Renderer usually needs 'qrcode' lib.
            // Let's just set src if it's base64, otherwise we need a lib.
            // For now, let's assume we need to use a library. 
            // I'll check if qrcode lib is available or if I should implement a simple fallback.
            // Most "modern" templates here use a qrcode lib in the html.
            
            // Checking dependencies... previous view_file of index.html didn't show qrcode lib.
            // But let's check if we can simple display the string for now or if we have a generator.
            // Actually, let's use the same approach as main renderer if possible. 
            // Main renderer uses `new QRCode(element, text)`.
            
            qrImage.innerHTML = ""; // Clear previous
            if (typeof QRCode !== 'undefined') {
                 new QRCode(qrImage, {
                    text: data.qr,
                    width: 128,
                    height: 128
                 });
            } else {
                qrImage.textContent = "QR Code received (Lib missing)";
            }
        }
    } else {
        if (qrContainer) qrContainer.style.display = 'none';
    }
}


// Função para renderizar a lista de instâncias
async function renderInstances() {
    if (!instancesList) return;

    // Apenas loading se estiver vazio
    if (instancesList.children.length === 0) {
        instancesList.innerHTML = '<div class="loading">Carregando instâncias...</div>';
    }

    try {
        const result = await window.crmAPI.getInstances();
        
        if (result.success) {
            const instances = result.instances;
            
            if (instances.length === 0) {
                instancesList.innerHTML = '<div class="empty-state">Nenhuma instância CRM criada.</div>';
                return;
            }

            instancesList.innerHTML = '';
            instances.forEach(instance => {
                localInstances.set(instance.instanceId, instance); // Cache
                const card = createInstanceCardElement(instance);
                instancesList.appendChild(card);
            });
        } else {
            instancesList.innerHTML = `<div class="error">Erro ao carregar: ${result.error}</div>`;
        }
    } catch (error) {
        console.error("Erro ao carregar instâncias:", error);
        instancesList.innerHTML = `<div class="error">Erro crítico: ${error.message}</div>`;
    }
}

function createInstanceCardElement(instance) {
    const card = document.createElement('div');
    card.className = 'instance-crm-card';
    card.id = `card-${instance.instanceId}`;
    
    // Status color mapping could be CSS classes: connected, disconnected, etc.
    
    card.innerHTML = `
        <div class="instance-header">
            <h4>${instance.name}</h4>
            <span class="status-badge ${instance.status}">${instance.status}</span>
        </div>
        <div class="instance-info">
            <p class="info-text">ID: ${instance.instanceId}</p>
            <div class="qr-container" style="display: none; text-align: center; margin: 10px 0;">
                <div class="qr-image" style="display: inline-block;"></div>
                <p>Escaneie com o WhatsApp</p>
            </div>
        </div>
        <div class="instance-actions" style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="btn-action btn-connect" onclick="handleConnect('${instance.instanceId}')">Conectar</button>
            <button class="btn-action btn-stop" onclick="handleStop('${instance.instanceId}')" style="display: none;">Parar</button>
            <button class="btn-action btn-remove" onclick="handleRemove('${instance.instanceId}')" style="background-color: #f44336;">🗑️</button>
        </div>
    `;

    // Simple visibility logic for buttons based on status
    updateCardButtons(card, instance.status);

    return card;
}

function updateCardButtons(card, status) {
    const btnConnect = card.querySelector('.btn-connect');
    const btnStop = card.querySelector('.btn-stop');
    
    if (status === 'connected' || status === 'connecting' || status === 'qr_pending') {
        if(btnConnect) btnConnect.style.display = 'none';
        if(btnStop) btnStop.style.display = 'inline-block';
    } else {
        if(btnConnect) btnConnect.style.display = 'inline-block';
        if(btnStop) btnStop.style.display = 'none';
    }
}

// Global handlers (attached to window to be accessible from HTML onclick strings if needed, 
// though addEventListener is better, but I used innerHTML string above for speed)
window.handleConnect = async (instanceId) => {
    try {
        console.log("Conectando:", instanceId);
        await window.crmAPI.startInstance(instanceId);
    } catch (e) {
        alert("Erro ao conectar: " + e.message);
    }
};

window.handleStop = async (instanceId) => {
    try {
        console.log("Parando:", instanceId);
        await window.crmAPI.stopInstance(instanceId);
    } catch (e) {
        alert("Erro ao parar: " + e.message);
    }
};

window.handleRemove = async (instanceId) => {
    if(!confirm("Tem certeza que deseja remover esta instância?")) return;
    try {
        console.log("Removendo:", instanceId);
        await window.crmAPI.removeInstance(instanceId);
        document.getElementById(`card-${instanceId}`)?.remove();
    } catch (e) {
        alert("Erro ao remover: " + e.message);
    }
};


// Função de inicialização principal
function initializeCRM() {
    console.log("Inicializando CRM Renderer...");
    initElements();
    
    // Elementos do Modal
    const modal = document.getElementById('modal-create-instance');
    const inputName = document.getElementById('input-instance-name');
    const btnConfirm = document.getElementById('btn-confirm-create');
    const btnCancel = document.getElementById('btn-cancel-create');

    const openModal = () => {
        if (modal) {
            modal.style.display = 'flex';
            if(inputName) {
                inputName.value = '';
                inputName.focus();
            }
        }
    };

    const closeModal = () => {
        if (modal) modal.style.display = 'none';
        if (inputName) inputName.value = '';
    };

    const handleCreate = async () => {
        const name = inputName.value.trim();
        if (!name) {
            alert("Por favor, digite um nome.");
            return;
        }

        try {
            console.log(`Criando instância: ${name}`);
            // Feedback visual de loading
            if(btnConfirm) btnConfirm.textContent = 'Criando...';
            
            const result = await window.crmAPI.createInstance(name);
            console.log("Resultado da criação:", result);
            
            if (result.success) {
                closeModal();
                renderInstances(); 
            } else {
                alert(`Erro ao criar instância: ${result.message || result.error}`);
            }
        } catch (error) {
            console.error("Erro ao criar instância:", error);
            alert("Erro ao criar instância. Verifique o console.");
        } finally {
            if(btnConfirm) btnConfirm.textContent = 'Criar';
        }
    };

    if (btnCreateInstance) {
        console.log("Adicionando listener ao botão de criar instância");
        // Remove listener antigo substituindo o elemento (clone) ou apenas mudando a lógica se fosse função nomeada
        // Como é anônima, se recarregar o script pode duplicar, mas aqui estamos substituindo o arquivo.
        
        btnCreateInstance.onclick = openModal; // Mais seguro que addEventListener para evitar duplicatas em reloads manuais se houver
    }

    if (btnCancel) btnCancel.onclick = closeModal;
    if (btnConfirm) btnConfirm.onclick = handleCreate;
    
    // Fechar ao clicar fora
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }
    
    // Enter para confirmar
    if (inputName) {
        inputName.onkeyup = (e) => {
            if (e.key === 'Enter') handleCreate();
        };
    }

    renderInstances();
}

// Inicializa
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCRM);
} else {
    initializeCRM();
}
