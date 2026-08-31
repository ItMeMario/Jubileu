// services/broadcastHistoryService.js
// Serviço de Armazenamento e Histórico de Campanhas de Disparo (Broadcast)

const path = require("path");
const fs = require("fs");

class BroadcastHistoryService {
  constructor() {
    this.historyFilePath = path.join(__dirname, "../data/broadcast_history.json");
    this._ensureDataDir();
  }

  /**
   * Garante a existência do diretório de dados
   * @private
   */
  _ensureDataDir() {
    const dir = path.dirname(this.historyFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Carrega todas as campanhas do histórico
   * @returns {Array<object>}
   */
  getAllCampaigns() {
    try {
      if (!fs.existsSync(this.historyFilePath)) {
        return [];
      }
      const data = fs.readFileSync(this.historyFilePath, "utf8");
      return JSON.parse(data || "[]");
    } catch (error) {
      console.error("❌ Erro ao ler histórico de campanhas:", error);
      return [];
    }
  }

  /**
   * Salva o resultado de uma campanha recém-finalizada no histórico
   * @param {object} campaignStats - Estatísticas completas retornadas pelo MetaBroadcastService
   * @returns {boolean}
   */
  saveCampaignResult(campaignStats) {
    try {
      const campaigns = this.getAllCampaigns();

      // Atualiza ou insere a campanha
      const existingIndex = campaigns.findIndex((c) => c.campaignId === campaignStats.campaignId);
      if (existingIndex >= 0) {
        campaigns[existingIndex] = campaignStats;
      } else {
        campaigns.unshift(campaignStats); // Adiciona a mais recente no topo
      }

      // Limita o histórico salvo aos últimos 100 disparos para não sobrecarregar
      const trimmed = campaigns.slice(0, 100);

      fs.writeFileSync(this.historyFilePath, JSON.stringify(trimmed, null, 2), "utf8");
      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar resultado da campanha:", error);
      return false;
    }
  }

  /**
   * Busca os detalhes e logs de uma campanha específica
   * @param {string} campaignId
   * @returns {object|null}
   */
  getCampaignDetails(campaignId) {
    const campaigns = this.getAllCampaigns();
    return campaigns.find((c) => c.campaignId === campaignId) || null;
  }

  /**
   * Converte os logs de uma campanha para formato CSV para exportação
   * @param {string} campaignId
   * @returns {string} Conteúdo em CSV
   */
  exportCampaignLogsToCsv(campaignId) {
    const campaign = this.getCampaignDetails(campaignId);
    if (!campaign || !campaign.logs) return "";

    const headers = ["Telefone", "Nome", "Status", "Message ID", "Erro", "Data/Hora"];
    const rows = campaign.logs.map((log) => [
      `"${log.phone || ""}"`,
      `"${log.name || ""}"`,
      log.success ? "ENVIADO" : "FALHA",
      `"${log.messageId || ""}"`,
      `"${(log.error || "").replace(/"/g, '""')}"`,
      `"${new Date(log.timestamp).toLocaleString("pt-BR")}"`,
    ]);

    return [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  }
}

// Exporta instância singleton
const broadcastHistoryService = new BroadcastHistoryService();
module.exports = {
  BroadcastHistoryService,
  broadcastHistoryService,
};
