// renderer/preload/crmPreload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crmAPI", {
    getInstances: () => ipcRenderer.invoke("crm-get-instances"),
    createInstance: (name) => ipcRenderer.invoke("crm-create-instance", name),
    startInstance: (instanceId) => ipcRenderer.invoke("crm-start-instance", instanceId),
    stopInstance: (instanceId) => ipcRenderer.invoke("crm-stop-instance", instanceId),
    removeInstance: (instanceId) => ipcRenderer.invoke("crm-remove-instance", instanceId),
    getManifests: () => ipcRenderer.invoke("crm-get-manifests"),
    generatePdf: (data) => ipcRenderer.invoke("crm-generate-pdf", data),
    
    onInstanceUpdate: (callback) => {
        ipcRenderer.on('crm-instance-update', (event, data) => callback(data));
    },
    removeListeners: () => {
        ipcRenderer.removeAllListeners('crm-instance-update');
    }
});

console.log("👥 CRM Preload carregado! crmAPI está disponível.");
