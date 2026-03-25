const crmService = require("../../services/crmService");
const messageService = require("../../services/messageService");
const { dialog } = require("electron");
const puppeteer = require("puppeteer");

class CRMHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    console.log("CRMHandlers inicializado");
    this.bindEvents();
  }

  bindEvents() {
      crmService.on('instance-update', (data) => {
          this.sendToWindow('crm-instance-update', data);
      });
  }

  sendToWindow(channel, data) {
      const win = this.windowManager.getCRMWindow();
      if (win && !win.isDestroyed()) {
          win.webContents.send(channel, data);
      }
  }

  /**
   * Abre a janela do CRM
   */
  async openCRM() {
    try {
      console.log("Abrindo janela CRM...");
      // Initialize service on first open if needed, or just let it be dynamic
      // crmService.initialize() is redundant if called repeatedly, but safe if idempotent.
      // Better to init at app startup, but lazy load is fine too.
      await crmService.initialize();
      return this.windowManager.openCRMWindow();
    } catch (error) {
      console.error("Erro ao abrir janela CRM:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cria uma nova instância CRM
   */
  async createCRMInstance(event, name) {
    try {
      console.log(`Criando instância CRM: ${name}`);
      const instance = await crmService.createInstance(name);
      return { success: true, instance };
    } catch (error) {
      console.error("Erro ao criar instância CRM:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Lista instâncias CRM
   */
  async getCRMInstances() {
    try {
      console.log("Listando instâncias CRM...");
      const instances = crmService.getInstances();
      return { success: true, instances };
    } catch (error) {
      console.error("Erro ao listar instâncias CRM:", error);
      return { success: false, error: error.message };
    }
  }

  async startInstance(event, instanceId) {
      try {
          await crmService.startInstance(instanceId);
          return { success: true };
      } catch (error) {
           return { success: false, error: error.message };
      }
  }

  async stopInstance(event, instanceId) {
       try {
          await crmService.stopInstance(instanceId);
          return { success: true };
      } catch (error) {
           return { success: false, error: error.message };
      }
  }

  async removeInstance(event, instanceId) {
      try {
          await crmService.removeInstance(instanceId);
          return { success: true };
      } catch (error) {
           return { success: false, error: error.message };
      }
  }

  async getManifests() {
    try {
      console.log("Buscando manifestos CRM...");
      const allMessages = await messageService.getMessages();
      const manifests = allMessages.filter(m => m.message_type === "crm_manifest");
      return { success: true, manifests };
    } catch (error) {
      console.error("Erro ao buscar manifestos CRM:", error);
      return { success: false, error: error.message };
    }
  }

  async generatePdf(event, { content, title }) {
    try {
      console.log("Gerando PDF com Puppeteer...");
      const { filePath } = await dialog.showSaveDialog({
        title: "Salvar PDF do Manifesto",
        defaultPath: title ? `${title}.pdf` : "ManifestoCRM.pdf",
        filters: [
          { name: "Documentos em PDF", extensions: ["pdf"] }
        ]
      });

      if (!filePath) {
        return { success: false, canceled: true };
      }

      // Format HTML for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            h1 { color: #9C27B0; border-bottom: 2px solid #9C27B0; padding-bottom: 10px; }
            .content { margin-top: 20px; white-space: pre-wrap; font-size: 14pt; }
            .footer { margin-top: 50px; font-size: 10pt; color: #888; text-align: center; }
          </style>
        </head>
        <body>
          <h1>Manifesto CRM ${title ? "- " + title : ""}</h1>
          <div class="content">${content}</div>
          <div class="footer">Gerado via Jubileu Bot CRM</div>
        </body>
        </html>
      `;

      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      await page.pdf({ path: filePath, format: 'A4', printBackground: true });
      await browser.close();

      console.log("PDF gerado e salvo em:", filePath);
      return { success: true, filePath };
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = CRMHandlers;
