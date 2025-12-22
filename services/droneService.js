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
  limparNumerosPorStatus,
  obterEstatisticas,
  getNumbersForDispatch,
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
  verificarStatusTodasInstancias,
  listarInstanciasConectadas,
} = require("./droneServiceModules/clientStatusDSM");

// ========================================
// EXPORTA TODAS AS FUNÇÕES PÚBLICAS
// ========================================

module.exports = {
  // Funções de mensagens no banco de dados
  listarMensagensDisponiveis,
  buscarMensagemPorId,

  // Funções de gerenciamento de números (todas recebem instanceId)
  adicionarNumero,
  adicionarMultiplosNumeros,
  adicionarNumerosDeCSV,
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  limparNumerosPorStatus,
  obterEstatisticas,
  getNumbersForDispatch,

  // Funções de status do cliente
  verificarStatusCliente,
  verificarStatusTodasInstancias,
  listarInstanciasConectadas,

  // Funções de disparo (recebem instanceId como primeiro parâmetro)
  executarDisparo,
  executarDisparoCompleto,

  // Funções auxiliares (para uso externo se necessário)
  parseCSV,
  aplicarTransformacoes,
};
