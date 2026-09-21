// main/ipc/flowHandlers.js
const flowService = require("../../services/flowService");

class FlowHandlers {
  constructor() {
    console.log("FlowHandlers inicializado para controle de fluxos");
  }

  register(ipcMain) {
    ipcMain.handle("get-flows", async () => {
      try {
        return await flowService.getFlows();
      } catch (error) {
        console.error("❌ Erro ao buscar fluxos via IPC:", error);
        throw error;
      }
    });

    ipcMain.handle("save-flow", async (event, flow) => {
      try {
        return await flowService.saveFlow(flow);
      } catch (error) {
        console.error("❌ Erro ao salvar fluxo via IPC:", error);
        throw error;
      }
    });

    ipcMain.handle("delete-flow", async (event, id) => {
      try {
        return await flowService.deleteFlow(id);
      } catch (error) {
        console.error("❌ Erro ao deletar fluxo via IPC:", error);
        throw error;
      }
    });

    ipcMain.handle("toggle-flow", async (event, { id, active }) => {
      try {
        return await flowService.toggleFlow(id, active);
      } catch (error) {
        console.error("❌ Erro ao alternar status do fluxo via IPC:", error);
        throw error;
      }
    });
  }

  unregister(ipcMain) {
    ipcMain.removeHandler("get-flows");
    ipcMain.removeHandler("save-flow");
    ipcMain.removeHandler("delete-flow");
    ipcMain.removeHandler("toggle-flow");
  }
}

module.exports = FlowHandlers;
