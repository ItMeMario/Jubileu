// renderer/guiScripts/deeJayWindow.js
console.log("Dee Jay Window script loaded");

// State
let instances = [];
let loopActive = false;

// DOM Elements (will be initialized in init())
let btnAddInstance;
let modalAdd;
let btnCancelAdd;
let btnConfirmAdd;
let inputInstanceName;
let instancesList;
let logsContainer;
let btnStartLoop;
let btnStopLoop;
let minIntervalInput;
let maxIntervalInput;
let btnSaveConfig;

// Initialize
async function init() {
    console.log("Dee Jay Window: Initializing...");

    if (!window.deeJayAPI) {
        console.error("Dee Jay API not found!");
        alert("Erro fatal: API não carregada.");
        return;
    }

    // Get DOM Elements (AFTER DOM is ready)
    btnAddInstance = document.getElementById('btn-add-instance');
    modalAdd = document.getElementById('modal-add');
    btnCancelAdd = document.getElementById('btn-cancel-add');
    btnConfirmAdd = document.getElementById('btn-confirm-add');
    inputInstanceName = document.getElementById('new-instance-name');
    instancesList = document.getElementById('instances-list');
    logsContainer = document.getElementById('logs-container');
    btnStartLoop = document.getElementById('btn-start-loop');
    btnStopLoop = document.getElementById('btn-stop-loop');
    minIntervalInput = document.getElementById('min-interval');
    maxIntervalInput = document.getElementById('max-interval');
    btnSaveConfig = document.getElementById('btn-save-config');

    console.log("DOM Elements captured:", {
        btnAddInstance: !!btnAddInstance,
        modalAdd: !!modalAdd,
        btnCancelAdd: !!btnCancelAdd,
        btnConfirmAdd: !!btnConfirmAdd
    });

    // Setup listeners FIRST so UI works even if data load fails
    setupEventListeners();
    setupIPClisteners();

    try {
        await loadInstances();
    } catch(e) {
        console.error("Error loading instances:", e);
    }
    
    try {
        await loadConfig();
    } catch(e) {
        console.error("Error loading config:", e);
    }
    
    console.log("Dee Jay Window: Initialization complete.");
}

function setupEventListeners() {
    console.log("Setting up event listeners...");

    console.log("btnAddInstance:", btnAddInstance);
    console.log("modalAdd:", modalAdd);

    if (!btnAddInstance) {
        console.error("❌ btn-add-instance not found!");
        return;
    }
    if (!modalAdd) {
        console.error("❌ modal-add not found!");
        return;
    }

    console.log("✅ All elements found, setting up listeners...");

    // Modal controls
    btnAddInstance.addEventListener('click', (e) => {
        console.log("🔵 Clicked Add Instance button");
        console.log("Event:", e);
        console.log("Modal current display:", modalAdd.style.display);
        modalAdd.style.display = 'flex';
        console.log("Modal after setting display:", modalAdd.style.display);
        inputInstanceName.focus();
    });

    btnCancelAdd.addEventListener('click', () => {
        console.log("Clicked Cancel Add");
        closeModal();
    });

    btnConfirmAdd.addEventListener('click', async () => {
        console.log("Clicked Confirm Add");
        const name = inputInstanceName.value.trim();
        if (name) {
            try {
                // Modified flow: Create AND Start
                const newInstance = await window.deeJayAPI.createInstance(name);
                console.log("Instance created:", newInstance);
                
                closeModal();
                inputInstanceName.value = '';
                
                // Refresh list
                await loadInstances();
                
                // Auto-start to show QR Code immediately
                console.log("Auto-starting instance:", newInstance.instance_id);
                await window.deeJayAPI.startInstance(newInstance.instance_id);
                
            } catch (error) {
                console.error("Error creating instance:", error);
                alert('Erro ao criar instância: ' + error.message);
            }
        }
    });

    // Config
    btnSaveConfig.addEventListener('click', async () => {
        const min = parseInt(minIntervalInput.value);
        const max = parseInt(maxIntervalInput.value);

        if (min < 1 || max < min) {
            alert('Intervalos inválidos');
            return;
        }

        await window.deeJayAPI.setConfig({
            minIntervalMinutes: min,
            maxIntervalMinutes: max
        });
        alert('Configuração salva!');
    });

    // Loop controls
    btnStartLoop.addEventListener('click', async () => {
        const res = await window.deeJayAPI.startLoop();
        if (!res.success) {
            alert(res.message || 'Erro ao iniciar');
        }
    });

    btnStopLoop.addEventListener('click', async () => {
        await window.deeJayAPI.stopLoop();
    });
}

function setupIPClisteners() {
    window.deeJayAPI.onInstanceUpdate((data) => {
        console.log("Instance Update:", data);
        updateInstanceCard(data);
    });

    window.deeJayAPI.onLog((log) => {
        addLogEntry(log);
    });

    window.deeJayAPI.onLoopStatus((status) => {
        loopActive = status.active;
        updateLoopButtons();
    });
}

function closeModal() {
    modalAdd.style.display = 'none';
}

async function loadInstances() {
    instances = await window.deeJayAPI.getInstances();
    renderInstances();
    updateLoopButtons();
}

async function loadConfig() {
    const config = await window.deeJayAPI.getConfig();
    if (config) {
        minIntervalInput.value = config.minIntervalMinutes || 1;
        maxIntervalInput.value = config.maxIntervalMinutes || 5;
    }
}

function renderInstances() {
    instancesList.innerHTML = '';
    instances.forEach(inst => {
        createInstanceCard(inst);
    });
}

function createInstanceCard(inst) {
    const template = document.getElementById('instance-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.instance-card');
    
    card.id = `card-${inst.instanceId}`;
    card.querySelector('.instance-name').textContent = inst.name;
    
    const statusBadge = card.querySelector('.status-badge');
    updateStatusBadge(statusBadge, inst.status);

    const btnConnect = card.querySelector('.btn-connect');
    const btnDelete = card.querySelector('.btn-delete');
    
    // Initial state setup
    handleCardState(card, inst);

    btnConnect.onclick = async () => {
        if (inst.status === 'disconnected' || inst.status === 'auth_failure') {
             await window.deeJayAPI.startInstance(inst.instanceId);
             // Update local status optimistically or wait for event
        } else {
             await window.deeJayAPI.stopInstance(inst.instanceId);
        }
    };

    btnDelete.onclick = async () => {
        if (await window.customConfirm('Remover esta instância?')) {
            await window.deeJayAPI.removeInstance(inst.instanceId);
            await loadInstances();
        }
    };

    instancesList.appendChild(clone);
}

function updateInstanceCard(data) {
    const idx = instances.findIndex(i => i.instanceId === data.instanceId);
    if (idx !== -1) {
        instances[idx].status = data.status;
        if (data.qr) instances[idx].qrCode = data.qr;
        
        const card = document.getElementById(`card-${data.instanceId}`);
        if (card) {
            updateStatusBadge(card.querySelector('.status-badge'), data.status);
            handleCardState(card, instances[idx]);
            updateLoopButtons();
        }
    }
}

function handleCardState(card, inst) {
    const qrContainer = card.querySelector('.qr-container');
    const infoContainer = card.querySelector('.info-container');
    const btnConnect = card.querySelector('.btn-connect');

    // Reset views
    qrContainer.style.display = 'none';
    infoContainer.style.display = 'none';

    if (inst.status === 'qr_pending' && inst.qrCode) {
        qrContainer.style.display = 'block';
        // Generate QR (using qrcode-generator or similar if available, otherwise just show text/placeholder)
        // Since we don't have a library loaded in html, let's use a public API or just placeholder for now.
        // Or better, check if we have a QR lib. 
        // NOTE: The main app likely uses kjua or qrcode.js.
        // Let's assume we can fetch the QR image via an API or use a simple data URI if provided.
        // Actually, whatsapp-web.js sends text string for QR. We need to render it.
        // For simplicity now, let's use a quick Google Chart API or similar fallback if no local lib.
        card.querySelector('.qr-code').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(inst.qrCode)}`;
    } else if (inst.status === 'connected') {
        infoContainer.style.display = 'block';
        card.querySelector('.phone-number').textContent = "Conectado";
        btnConnect.textContent = "Desconectar";
        btnConnect.style.background = "#f44336";
    } else {
        btnConnect.textContent = "Conectar";
        btnConnect.style.background = "#232323";
    }
}

function updateStatusBadge(badge, status) {
    badge.className = 'status-badge ' + status;
    badge.textContent = status === 'qr_pending' ? 'Lendo QR' : 
                        status === 'connected' ? 'Conectado' : 
                        status === 'connecting' ? 'Conectando...' : 'Desconectado';
}

function updateLoopButtons() {
    const connectedCount = instances.filter(i => i.status === 'connected').length;
    
    if (loopActive) {
        btnStartLoop.style.display = 'none';
        btnStopLoop.style.display = 'inline-block';
    } else {
        btnStartLoop.style.display = 'inline-block';
        btnStopLoop.style.display = 'none';
        btnStartLoop.disabled = connectedCount < 2;
    }
}

function addLogEntry(log) {
    const div = document.createElement('div');
    div.className = 'log-entry';
    const time = new Date(log.timestamp).toLocaleTimeString();
    div.innerHTML = `
        <span class="log-time">[${time}]</span>
        <span class="log-sender">${log.sender}</span>
        <span class="log-arrow">➜</span>
        <span class="log-receiver">${log.receiver}</span>
        <span class="log-message">${log.message}</span>
    `;
    logsContainer.prepend(div);
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded, starting init...");
    init();
});
