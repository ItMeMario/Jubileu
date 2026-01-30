const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  connectWhatsapp: () => ipcRenderer.invoke('connect-whatsapp'),
  onQrCode: (callback) => ipcRenderer.on('qr-code', (event, qr) => callback(qr)),
  onConnected: (callback) => ipcRenderer.on('connected', () => callback()),
  onLog: (callback) => ipcRenderer.on('log', (event, msg) => callback(msg))
});
