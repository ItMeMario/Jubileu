const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

let mainWindow;
let client;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    mainWindow.loadFile('renderer/html/index.html');
}

app.whenReady().then(() => {
    createWindow();
    
    // Pequeno delay para garantir que a janela e o listener estejam prontos
    setTimeout(() => {
        initializeWhatsApp();
    }, 1000);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function initializeWhatsApp() {
    console.log('Inicializando WhatsApp Client...');
    if(mainWindow) mainWindow.webContents.send('connecting');

    client = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        }
    });

    client.on('qr', (qr) => {
        console.log('QR Code recebido');
        // Generate data URL
        qrcode.toDataURL(qr, (err, url) => {
            if (mainWindow && !err) {
                mainWindow.webContents.send('qr', url);
            }
        });
    });

    client.on('ready', () => {
        console.log('Cliente pronto!');
        if (mainWindow) mainWindow.webContents.send('ready');
    });

    client.on('disconnected', (reason) => {
        console.log('Cliente desconectado:', reason);
        if (mainWindow) mainWindow.webContents.send('disconnected');
        // Opcional: tentar reconectar ou re-inicializar
        client.initialize(); 
    });

    client.initialize().catch(err => {
        console.error('Erro ao inicializar client:', err);
    });
}
