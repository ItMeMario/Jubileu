const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

let mainWindow;
let whatsappClient;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        autoHideMenuBar: true,
        backgroundColor: '#121212'
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('connect-whatsapp', async () => {
    if (whatsappClient) return; // Já iniciado

    console.log('Iniciando cliente WhatsApp...');
    if (mainWindow) mainWindow.webContents.send('log', 'Inicializando motor do WhatsApp...');

    whatsappClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: path.join(__dirname, '.wwebjs_auth')
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    whatsappClient.on('qr', async (qr) => {
        console.log('QR Code recebido', qr);
        if (mainWindow) {
            try {
                // Converte QR para DataURL para exibir na img tag
                const qrDataUrl = await QRCode.toDataURL(qr);
                mainWindow.webContents.send('qr-code', qrDataUrl);
                mainWindow.webContents.send('log', 'QR Code gerado. Aguardando leitura.');
            } catch (err) {
                console.error('Erro ao gerar imagem QR:', err);
            }
        }
    });

    whatsappClient.on('ready', () => {
        console.log('conectado'); // Requisito explícito: mandar msg no terminal
        if (mainWindow) {
            mainWindow.webContents.send('connected');
            mainWindow.webContents.send('log', '✅ WhatsApp conectado com sucesso!');
        }
    });

    whatsappClient.on('authenticated', () => {
        console.log('Autenticado');
        if (mainWindow) mainWindow.webContents.send('log', 'Autenticado. Carregando...');
    });

    whatsappClient.on('auth_failure', (msg) => {
        console.error('Falha na autenticação', msg);
        if (mainWindow) mainWindow.webContents.send('log', '❌ Falha na autenticação: ' + msg);
    });

    try {
        await whatsappClient.initialize();
    } catch (err) {
        console.error('Erro ao inicializar cliente:', err);
        if (mainWindow) mainWindow.webContents.send('log', 'Erro fatal: ' + err.message);
    }
});
