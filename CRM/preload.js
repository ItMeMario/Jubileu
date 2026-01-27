const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crmAPI', {
    onQR: (callback) => ipcRenderer.on('qr', (e, qr) => callback(qr)),
    onReady: (callback) => ipcRenderer.on('ready', (e) => callback()),
    onDisconnected: (callback) => ipcRenderer.on('disconnected', (e) => callback()),
    onConnecting: (callback) => ipcRenderer.on('connecting', (e) => callback())
});
