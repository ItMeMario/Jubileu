// renderer/preload/crmPreload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("crmAPI", {
    getInstances: () => ipcRenderer.invoke("crm-get-instances"),
    createInstance: (name) => ipcRenderer.invoke("crm-create-instance", name),
});

console.log("👥 CRM Preload carregado! crmAPI está disponível.");
