// renderer/preload/cityPreload.js
const { contextBridge, ipcRenderer } = require("electron");

// Exposição da API de cidades para o renderer
contextBridge.exposeInMainWorld("cityAPI", {
  // Buscar todas as cidades
  getCities: () => ipcRenderer.invoke("city-get-cities"),

  // Adicionar nova cidade
  addCity: (cityData) => ipcRenderer.invoke("city-add-city", cityData),

  // Atualizar cidade existente
  updateCity: (id, cityData) =>
    ipcRenderer.invoke("city-update-city", id, cityData),

  // Excluir cidade
  deleteCity: (id) => ipcRenderer.invoke("city-delete-city", id),

  // Definir cidade primária
  setPrimaryCity: (id) => ipcRenderer.invoke("city-set-primary", id),

  // Buscar cidade primária
  getPrimaryCity: () => ipcRenderer.invoke("city-get-primary"),

  // Buscar cidade por ID
  getCityById: (id) => ipcRenderer.invoke("city-get-by-id", id),
});
