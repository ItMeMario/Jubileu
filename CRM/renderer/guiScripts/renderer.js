
// Elementos da UI
const placeholderView = document.getElementById('placeholder-view');
const qrView = document.getElementById('qr-view');
const qrImage = document.getElementById('qr-image');
const loadingView = document.getElementById('loading-view');
const connectedView = document.getElementById('connected-view');
const connectionBadge = document.getElementById('connection-badge');

function showView(viewName) {
    placeholderView.style.display = 'none';
    qrView.style.display = 'none';
    loadingView.style.display = 'none';
    connectedView.style.display = 'none';

    if (viewName === 'placeholder') placeholderView.style.display = 'block';
    if (viewName === 'qr') qrView.style.display = 'block';
    if (viewName === 'loading') loadingView.style.display = 'flex';
    if (viewName === 'connected') connectedView.style.display = 'block';
}

function updateBadge(status) {
    connectionBadge.className = 'status-badge'; // reset
    if (status === 'disconnected') {
        connectionBadge.classList.add('disconnected');
        connectionBadge.textContent = 'Desconectado';
    } else if (status === 'connecting') {
        connectionBadge.classList.add('connecting');
        connectionBadge.textContent = 'Conectando...';
    } else if (status === 'qr') {
        connectionBadge.classList.add('qr_pending');
        connectionBadge.textContent = 'Aguardando Scan';
    } else if (status === 'connected') {
        connectionBadge.classList.add('connected');
        connectionBadge.textContent = 'Conectado';
    }
}

// Listeners do CRM API
if (window.crmAPI) {
    window.crmAPI.onQR((url) => {
        console.log('QR recebido');
        qrImage.src = url;
        showView('qr');
        updateBadge('qr');
    });

    window.crmAPI.onConnecting(() => {
        console.log('Conectando...');
        showView('loading');
        updateBadge('connecting');
    });

    window.crmAPI.onReady(() => {
        console.log('Pronto!');
        showView('connected');
        updateBadge('connected');
    });

    window.crmAPI.onDisconnected(() => {
        console.log('Desconectado');
        showView('placeholder'); // ou loading se for reconectar automatico
        updateBadge('disconnected');
    });
} else {
    console.warn('crmAPI não encontrada. Verifique o preload.');
}
