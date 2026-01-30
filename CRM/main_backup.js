const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const db = require('./services/db');

let mainWindow;
let configWindow;
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

function createConfigWindow() {
    if (configWindow) {
        configWindow.focus();
        return;
    }

    configWindow = new BrowserWindow({
        width: 900,
        height: 700,
        title: 'Configurações',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    configWindow.loadFile('renderer/html/config.html');
    
    configWindow.on('closed', () => {
        configWindow = null;
    });
}

app.whenReady().then(() => {
    // DB IPC Handlers
    ipcMain.handle('db-get-messages', async () => await db.getMessages());
    ipcMain.handle('db-add-message', async (e, {locale, type, content}) => await db.addMessage(locale, type, content));
    ipcMain.handle('db-update-message', async (e, {id, locale, type, content}) => await db.updateMessage(id, locale, type, content));
    ipcMain.handle('db-delete-message', async (e, id) => await db.deleteMessage(id));
    
    ipcMain.handle('db-get-config', async (e, key) => await db.getConfig(key));
    ipcMain.handle('db-set-config', async (e, {key, value}) => await db.setConfig(key, value));

    ipcMain.handle('db-set-config', async (e, {key, value}) => await db.setConfig(key, value));

    // Database Introspection IPC Handlers
    ipcMain.handle('database-get-overview', async () => {
        try {
            const data = await db.getDatabaseOverview();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('database-get-all-tables', async () => {
        try {
            const data = await db.getAllTables();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('database-get-table-info', async (e, tableName) => {
        try {
             // Jubileu's renderer expects data to have tableName and columns
            const columns = await db.getTableInfo(tableName);
            return { success: true, data: { tableName, columns } };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('database-get-table-counts', async () => {
        try {
            const data = await db.getTableCounts();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('database-get-database-info', async () => {
         try {
            const overview = await db.getDatabaseOverview();
            return { success: true, data: overview.database };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('database-get-primary-city', async () => {
         try {
            const data = await db.getPrimaryCity();
            return { success: true, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });


    ipcMain.handle('open-config', () => createConfigWindow());

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
