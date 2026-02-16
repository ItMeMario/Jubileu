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

    // Update internal cache if needed (optional but good practice)
    if(localInstances.has(data.instanceId)) {
        const inst = localInstances.get(data.instanceId);
        inst.status = data.status;
        if(data.qr) inst.qr = data.qr;
    }

    // Use shared state logic
    // We create a temporary object or use cached one to pass to updateCardState
    // Simulating instance object with updated data
    const instanceMock = {
        instanceId: data.instanceId,
        status: data.status,
        qr: data.qr
    };
    
    updateCardState(card, instanceMock);

    // QR Code Handling specific (as updateCardState handles visibility, but we need to inject content)
    if (data.status === 'qr_pending' && data.qr) {
        const qrImage = card.querySelector('.qr-image');
        if (qrImage) {
            qrImage.innerHTML = "";
            if (typeof QRCode !== 'undefined') {
                 new QRCode(qrImage, {
                    text: data.qr,
                    width: 128,
                    height: 128
                 });
            } else {
                qrImage.textContent = "QR Code received";
            }
        }
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
            <span class="status-badge ${instance.status}">${getBadgeText(instance.status)}</span>
        </div>
        <div class="instance-info">
            <div class="qr-container" style="display: none;">
                <div class="qr-image"></div>
                <p>Escaneie com o WhatsApp</p>
            </div>
            <div class="info-container" style="display: none; margin-top: 10px;">
                 <p style="color: #666; font-size: 14px;">Conectado</p>
            </div>
        </div>
        <div class="instance-actions">
            <button class="btn-action btn-remove" onclick="handleRemove('${instance.instanceId}')">🗑️</button>
            <button class="btn-action btn-connect" onclick="handleConnect(this, '${instance.instanceId}')">Conectar</button>
        </div>
    `;

    // Initialize state
    updateCardState(card, instance);

    return card;
}

function getBadgeText(status) {
    switch(status) {
        case 'connected': return 'Conectado';
        case 'connecting': return 'Conectando...';
        case 'qr_pending': return 'Lendo QR';
        case 'disconnected': return 'Desconectado';
        default: return status;
    }
}

function updateCardState(card, instance) {
    const qrContainer = card.querySelector('.qr-container');
    const infoContainer = card.querySelector('.info-container');
    const btnConnect = card.querySelector('.btn-connect');
    const badge = card.querySelector('.status-badge');

    // Update Badge
    if(badge) {
        badge.className = `status-badge ${instance.status}`;
        badge.textContent = getBadgeText(instance.status);
    }

    // Reset visibility
    if(qrContainer) qrContainer.style.display = 'none';
    if(infoContainer) infoContainer.style.display = 'none';

    // Button Logic & Helper Views
    if (instance.status === 'connected') {
        if(infoContainer) infoContainer.style.display = 'block';
        if(btnConnect) {
            btnConnect.textContent = "Desconectar";
            btnConnect.className = "btn-action btn-connect btn-disconnect"; // Adds red color
            btnConnect.onclick = () => window.handleStop(instance.instanceId);
            btnConnect.disabled = false;
        }
    } else if (instance.status === 'qr_pending') {
        if(qrContainer) qrContainer.style.display = 'block';
        if(btnConnect) {
            btnConnect.textContent = "Cancelar";
            btnConnect.className = "btn-action btn-connect btn-disconnect";
            btnConnect.onclick = () => window.handleStop(instance.instanceId);
            btnConnect.disabled = false;
        }
    } else if (instance.status === 'connecting') {
        if(btnConnect) {
            btnConnect.textContent = "Iniciando...";
            btnConnect.disabled = true;
            btnConnect.className = "btn-action btn-connect";
        }
    } else {
        // Disconnected or others
        if(btnConnect) {
            btnConnect.textContent = "Conectar";
            btnConnect.className = "btn-action btn-connect";
            btnConnect.onclick = () => window.handleConnect(btnConnect, instance.instanceId);
            btnConnect.disabled = false;
        }
    }
}

// Deprecated: verify if this function is still called elsewhere, if not it can be removed or kept as empty wrapper
function updateCardButtons(card, status) {
   // This function is replaced by updateCardState logic but kept if legacy calls exist
}

// Global handlers (attached to window to be accessible from HTML onclick strings if needed, 
// though addEventListener is better, but I used innerHTML string above for speed)
window.handleConnect = async (btnElement, instanceId) => {
    try {
        console.log("Conectando:", instanceId);
        // Instant feedback
        if(btnElement && btnElement.tagName === 'BUTTON') {
             btnElement.textContent = "Iniciando...";
             btnElement.disabled = true;
        }
        
        await window.crmAPI.startInstance(instanceId);
    } catch (e) {
        alert("Erro ao conectar: " + e.message);
        if(btnElement && btnElement.tagName === 'BUTTON') {
             btnElement.textContent = "Conectar";
             btnElement.disabled = false;
        }
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
    // Usando modal customizado para evitar bugs do Electron
    const confirmed = await window.customConfirm("Tem certeza que deseja remover esta instância?");
    if (!confirmed) return;

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
