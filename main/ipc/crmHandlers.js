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
        defaultPath: title ? `${title}.pdf` : "Manifesto.pdf",
        filters: [
          { name: "Documentos em PDF", extensions: ["pdf"] }
        ]
      });

      if (!filePath) {
        return { success: false, canceled: true };
      }

      // If the user changed the file name in the dialog, we might want to use that as the document title too.
      // But using the title they specifically typed in the prompt is better. 
      const displayTitle = title || "Manifesto Jubileu";
      
      const date = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

      // Format HTML for PDF - Professional and easy to read
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            body { 
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              padding: 0; 
              margin: 0;
              color: #2c3e50; 
              background-color: #ffffff;
            }
            .page {
              padding: 50px 70px;
            }
            .header {
              border-bottom: 2px solid #9C27B0;
              padding-bottom: 20px;
              margin-bottom: 40px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .header-titles {
              flex: 1;
            }
            h1 { 
              color: #2c3e50; 
              margin: 0 0 8px 0;
              font-size: 28pt;
              font-weight: 700;
              line-height: 1.2;
            }
            .subtitle {
              color: #7f8c8d;
              font-size: 11pt;
              margin: 0;
            }
            .content { 
              margin-top: 30px; 
              white-space: pre-wrap; 
              font-size: 12pt; 
              line-height: 1.8;
              color: #34495e;
              text-align: justify;
            }
            .footer { 
              margin-top: 60px; 
              padding-top: 20px;
              border-top: 1px solid #ecf0f1;
              font-size: 9pt; 
              color: #95a5a6; 
              text-align: center; 
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="header-titles">
                <h1>${displayTitle}</h1>
                <p class="subtitle">Documento gerado em ${date}</p>
              </div>
            </div>
            
            <div class="content">${content}</div>
            
            <div class="footer">
              <p>Gerado automaticamente pelo Sistema CRM - Jubileu Bot</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const browser = await puppeteer.launch({ headless: 'new' });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      // Professional margins and formatting
      await page.pdf({ 
        path: filePath, 
        format: 'A4', 
        printBackground: true,
        margin: { top: '20px', bottom: '20px' }
      });
      
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
