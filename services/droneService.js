// services/droneService.js
// Arquivo principal - Orquestrador dos módulos DSM (Drone Service Modules)

// Importa módulos CSV e transformações
const { parseCSV } = require("./droneServiceModules/csvParserDSM");
const {
  aplicarTransformacoes,
} = require("./droneServiceModules/numberTransformDSM");

// Importa módulo de gerenciamento de números
const {
  adicionarNumerosDeCSV,
  adicionarNumero,
  adicionarMultiplosNumeros,
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  limparClientesPorStatus,
  obterEstatisticas,
} = require("./droneServiceModules/numberManagementDSM");

// Importa módulo de disparo de mensagens
const {
  executarDisparo,
  executarDisparoCompleto,
} = require("./droneServiceModules/messageDispatchDSM");

// Importa módulo de banco de dados de mensagens
const {
  listarMensagensDisponiveis,
  buscarMensagemPorId,
} = require("./droneServiceModules/messageDatabaseDSM");

// Importa módulo de status do cliente
const {
  verificarStatusCliente,
} = require("./droneServiceModules/clientStatusDSM");

// ========================================
// EXPORTA TODAS AS FUNÇÕES PÚBLICAS
// ========================================

module.exports = {
  // Funções de mensagens no banco de dados
  listarMensagensDisponiveis,
  buscarMensagemPorId,

  // Funções de gerenciamento de números
  adicionarNumero, // DEPRECATED - manter para compatibilidade
  adicionarMultiplosNumeros, // DEPRECATED - manter para compatibilidade
  adicionarNumerosDeCSV, // NOVA FUNÇÃO PRINCIPAL
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  limparClientesPorStatus,
  obterEstatisticas,

  // Funções de disparo
  verificarStatusCliente,
  executarDisparo,
  executarDisparoCompleto,

  // Funções auxiliares (para uso externo se necessário)
  parseCSV,
  aplicarTransformacoes,
};
