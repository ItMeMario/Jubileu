// services/flowService.js
// Serviço de Gerenciamento, Criação e Validação de Fluxos Interativos da Meta

const path = require("path");
const fs = require("fs");

class FlowService {
  constructor() {
    this.flowsFilePath = path.join(__dirname, "../data/interactive_flows.json");
    this.flows = [];
    this._ensureDataDir();
    this.loadFlows();
  }

  /**
   * Garante a existência do diretório de dados
   * @private
   */
  _ensureDataDir() {
    const dir = path.dirname(this.flowsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Carrega os fluxos cadastrados ou inicializa com os fluxos padrão de demonstração
   */
  loadFlows() {
    try {
      if (fs.existsSync(this.flowsFilePath)) {
        const raw = fs.readFileSync(this.flowsFilePath, "utf8");
        this.flows = JSON.parse(raw || "[]");
      } else {
        this.flows = this._getDefaultFlows();
        this.saveFlows();
      }
    } catch (error) {
      console.error("❌ Erro ao carregar fluxos interativos:", error);
      this.flows = this._getDefaultFlows();
    }
  }

  /**
   * Salva os fluxos no arquivo persistente
   */
  saveFlows() {
    try {
      fs.writeFileSync(this.flowsFilePath, JSON.stringify(this.flows, null, 2), "utf8");
      return true;
    } catch (error) {
      console.error("❌ Erro ao salvar fluxos interativos:", error);
      return false;
    }
  }

  /**
   * Retorna todos os fluxos
   * @returns {Array<object>}
   */
  getAllFlows() {
    return [...this.flows];
  }

  /**
   * Retorna o fluxo principal ativo
   * @returns {object|null}
   */
  getActiveFlow() {
    return this.flows.find((f) => f.isActive) || this.flows[0] || null;
  }

  /**
   * Obtém um fluxo por ID
   * @param {string} flowId
   * @returns {object|null}
   */
  getFlowById(flowId) {
    return this.flows.find((f) => f.id === flowId) || null;
  }

  /**
   * Salva ou atualiza um fluxo
   * @param {object} flow
   */
  saveFlow(flow) {
    if (!flow.id) {
      flow.id = `flow_${Date.now()}`;
    }

    const index = this.flows.findIndex((f) => f.id === flow.id);
    if (index >= 0) {
      this.flows[index] = flow;
    } else {
      this.flows.push(flow);
    }

    this.saveFlows();
    return flow;
  }

  /**
   * Define um fluxo como ativo (desativando os outros)
   * @param {string} flowId
   */
  setActiveFlow(flowId) {
    this.flows.forEach((f) => {
      f.isActive = f.id === flowId;
    });
    this.saveFlows();
  }

  /**
   * Modelos padrão de fluxos interativos para novos projetos
   * @private
   */
  _getDefaultFlows() {
    return [
      {
        id: "flow_atendimento_principal",
        name: "Atendimento Interativo Principal (Meta Nativos)",
        isActive: true,
        triggerKeywords: ["oi", "ola", "olá", "menu", "iniciar", "ajuda", "bom dia", "boa tarde", "boa noite"],
        initialStepId: "step_boas_vindas",
        steps: {
          step_boas_vindas: {
            id: "step_boas_vindas",
            type: "interactive_buttons", // Envia botões de resposta rápida
            header: "Atendimento Zwei Chat",
            body: "Olá! Seja bem-vindo ao nosso canal oficial. Como podemos te ajudar hoje?",
            footer: "Selecione uma das opções abaixo:",
            buttons: [
              { id: "btn_servicos", title: "Nossos Serviços", nextStepId: "step_menu_servicos" },
              { id: "btn_planos", title: "Ver Planos", nextStepId: "step_planos_detalhe" },
              { id: "btn_falar_humano", title: "Falar com Atendente", nextStepId: "step_atendente" },
            ],
          },
          step_menu_servicos: {
            id: "step_menu_servicos",
            type: "interactive_list", // Envia menu suspenso estruturado
            header: "Catálogo de Soluções",
            body: "Conheça nossas soluções completas para automação e atendimento:",
            buttonTitle: "Ver Soluções",
            footer: "Clique no botão para abrir o catálogo",
            sections: [
              {
                title: "Atendimento",
                rows: [
                  { id: "row_chatbot", title: "Chatbot com IA", description: "Atendimento 24h automatizado", nextStepId: "step_info_chatbot" },
                  { id: "row_multi", title: "Multi-Atendimento", description: "Vários atendentes no mesmo número", nextStepId: "step_info_multi" },
                ],
              },
              {
                title: "Disparos & Marketing",
                rows: [
                  { id: "row_broadcast", title: "Disparador Oficial", description: "Envios em massa sem risco de ban", nextStepId: "step_info_broadcast" },
                ],
              },
            ],
          },
          step_planos_detalhe: {
            id: "step_planos_detalhe",
            type: "interactive_buttons",
            header: "Planos Zwei Chat",
            body: "Oferecemos duas versões adaptadas para a sua necessidade:\n\n1. Standard (Conexão via QR Code)\n2. Premium (API Oficial da Meta com Botões)",
            footer: "Deseja assinar agora?",
            buttons: [
              { id: "btn_assinar_prem", title: "Assinar Premium", nextStepId: "step_finalizar_compra" },
              { id: "btn_voltar_inicio", title: "Voltar ao Início", nextStepId: "step_boas_vindas" },
            ],
          },
          step_atendente: {
            id: "step_atendente",
            type: "text",
            body: "Um de nossos especialistas foi notificado e entrará em contato em instantes neste chat. Por favor, aguarde!",
            nextStepId: null, // Fim do fluxo
          },
          step_info_chatbot: {
            id: "step_info_chatbot",
            type: "interactive_buttons",
            body: "Nosso Chatbot Interativo utiliza botões nativos e IA para responder seus clientes instantaneamente com alta taxa de conversão.",
            buttons: [
              { id: "btn_voltar_menu", title: "Voltar ao Menu", nextStepId: "step_boas_vindas" },
              { id: "btn_falar_humano", title: "Falar com Atendente", nextStepId: "step_atendente" },
            ],
          },
          step_info_multi: {
            id: "step_info_multi",
            type: "interactive_buttons",
            body: "O Multi-Atendimento permite centralizar todos os seus operadores em um único painel em nuvem.",
            buttons: [
              { id: "btn_voltar_menu", title: "Voltar ao Menu", nextStepId: "step_boas_vindas" },
            ],
          },
          step_info_broadcast: {
            id: "step_info_broadcast",
            type: "interactive_buttons",
            body: "O Disparador Oficial entrega mensagens a milhares de contatos por segundo com Message Templates homologados pela Meta.",
            buttons: [
              { id: "btn_voltar_menu", title: "Voltar ao Menu", nextStepId: "step_boas_vindas" },
            ],
          },
          step_finalizar_compra: {
            id: "step_finalizar_compra",
            type: "text",
            body: "Perfeito! Acesse nosso portal de ativação para liberar sua licença Premium: https://zweichat.com/premium",
            nextStepId: null,
          },
        },
      },
    ];
  }
}

// Exporta instância singleton
const flowService = new FlowService();
module.exports = {
  FlowService,
  flowService,
};
