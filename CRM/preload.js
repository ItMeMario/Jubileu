const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('crmAPI', {
    onQR: (callback) => ipcRenderer.on('qr', (e, qr) => callback(qr)),
    onReady: (callback) => ipcRenderer.on('ready', (e) => callback()),
    onDisconnected: (callback) => ipcRenderer.on('disconnected', (e) => callback()),
    onConnecting: (callback) => ipcRenderer.on('connecting', (e) => callback()),
    openConfig: () => ipcRenderer.invoke('open-config'),

    // DB APIs
    db: {
        getMessages: () => ipcRenderer.invoke('db-get-messages'),
        addMessage: (locale, type, content) => ipcRenderer.invoke('db-add-message', {locale, type, content}),
        updateMessage: (id, locale, type, content) => ipcRenderer.invoke('db-update-message', {id, locale, type, content}),
        deleteMessage: (id) => ipcRenderer.invoke('db-delete-message', id),
        getConfig: (key) => ipcRenderer.invoke('db-get-config', key),
        setConfig: (key, value) => ipcRenderer.invoke('db-set-config', {key, value})
    }
});

contextBridge.exposeInMainWorld("databaseAPI", {
  getAllTables: () => ipcRenderer.invoke("database-get-all-tables"),
  getTableInfo: (tableName) => ipcRenderer.invoke("database-get-table-info", tableName),
  getTableCounts: () => ipcRenderer.invoke("database-get-table-counts"),
  getDatabaseInfo: () => ipcRenderer.invoke("database-get-database-info"),
  getPrimaryCity: () => ipcRenderer.invoke("database-get-primary-city"),
  getDatabaseOverview: () => ipcRenderer.invoke("database-get-overview"),
});
