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
  verificarStatusTodasInstancias,
  listarInstanciasConectadas,
} = require("./droneServiceModules/clientStatusDSM");

// Importa módulo de banco de dados de clientes (para limpar por status)
const {
  limparClientesPorStatus,
} = require("./droneServiceModules/clientDatabaseDSM");

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
  adicionarNumerosDeCSV, // FUNÇÃO PRINCIPAL
  listarNumeros,
  removerNumero,
  limparListaNumeros,
  limparClientesPorStatus,
  obterEstatisticas,

  // Funções de status do cliente
  verificarStatusCliente, // Atualizado: recebe instanceId
  verificarStatusTodasInstancias, // NOVO
  listarInstanciasConectadas, // NOVO

  // Funções de disparo
  executarDisparo, // Atualizado: recebe instanceId como primeiro parâmetro
  executarDisparoCompleto, // Atualizado: recebe instanceId como primeiro parâmetro

  // Funções auxiliares (para uso externo se necessário)
  parseCSV,
  aplicarTransformacoes,
};
