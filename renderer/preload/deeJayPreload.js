// renderer/preload/deeJayPreload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deeJayAPI", {
    getInstances: () => ipcRenderer.invoke('dee-jay-get-instances'),
    createInstance: (name) => ipcRenderer.invoke('dee-jay-create-instance', name),
    removeInstance: (instanceId) => ipcRenderer.invoke('dee-jay-remove-instance', instanceId),
    startInstance: (instanceId) => ipcRenderer.invoke('dee-jay-start-instance', instanceId),
    stopInstance: (instanceId) => ipcRenderer.invoke('dee-jay-stop-instance', instanceId),
    
    startLoop: () => ipcRenderer.invoke('dee-jay-start-loop'),
    stopLoop: () => ipcRenderer.invoke('dee-jay-stop-loop'),
    
    getConfig: () => ipcRenderer.invoke('dee-jay-get-config'),
    setConfig: (config) => ipcRenderer.invoke('dee-jay-set-config', config),

    onInstanceUpdate: (callback) => {
        ipcRenderer.on('dee-jay-instance-update', (event, data) => callback(data));
    },
    onLog: (callback) => {
        ipcRenderer.on('dee-jay-log', (event, data) => callback(data));
    },
    onLoopStatus: (callback) => {
        ipcRenderer.on('dee-jay-loop-status', (event, data) => callback(data));
    },
    removeListeners: () => {
        ipcRenderer.removeAllListeners('dee-jay-instance-update');
        ipcRenderer.removeAllListeners('dee-jay-log');
        ipcRenderer.removeAllListeners('dee-jay-loop-status');
    }
});

console.log("🎧 DeeJayPreload carregado! deeJayAPI está disponível.");
