// triggers.js - Versão com novo sistema de debug, FAQ integrado, correção de triggers indevidos e integração com banco de dados
const horarios = require("../aliases/horariosIdAliases.js");
const aliases = require("../aliases/TimeAliases.js");
const stringSimilarity = require("string-similarity");
const groupService = require("../services/groupService");
const { debug } = require("../services/debugService");
const FAQ_TRIGGERS = require("../aliases/faqAliases.js");
const db = require("../config/db");
const { getMessage } = require("../utils/messageReader"); // Para mensagens dinâmicas

const TRIGGERS = [
  "menu",
  "olá! posso saber mais informações sobre isto?",
  "tenho interesse e queria mais informações, por favor",
  "olá! tenho interesse e queria mais informações, por favor",
  "olá",
  "oi",
  "bom dia",
  "boa tarde",
  "boa noite",
  "Hello! Can i get more info on this?",
  "¡Hola! Me gustaría conseguir más información sobre esto.",
  "¡Hola! Podías darme más información de...",
];

function normalizarTextoBase(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTexto(texto) {
  return normalizarTextoBase(texto);
}

function normalizarTextoHorario(texto) {
  const limpo = normalizarTextoBase(texto);

  if (/^[1-6]$/.test(limpo)) {
    return aliases[limpo] || limpo;
  }

  if (aliases[limpo]) {
    return aliases[limpo];
  }

  const matchHora = limpo.match(/(\d{1,2})(?:[:h\s]?(\d{2}))?/);
  if (matchHora) {
    const hora = matchHora[1].padStart(2, "0");
    const minuto = matchHora[2] ? matchHora[2].padStart(2, "0") : "00";
    const horarioFormatado = `${hora}:${minuto}`;
    if (horarios[horarioFormatado]) {
      return horarioFormatado;
    }
  }

  return limpo;
}

function normalizarTextoCidade(texto) {
  return normalizarTextoBase(texto);
}

async function identificarCidadeFuzzy(texto) {
  const inputOriginal = texto || "";
  const input = normalizarTextoBase(inputOriginal);
  const inputCidade = input;
  const inputNormalizado = normalizarTexto(inputCidade);

  debug("Input original:", inputOriginal);
  debug("Input normalizado:", inputNormalizado);

  const allGroups = await groupService.getAllGroups();
  debug("Grupos disponíveis:", allGroups.length);
  debug(
    "Grupos carregados:",
    allGroups.map((g) => g.name)
  );

  if (!allGroups || allGroups.length === 0) {
    debug("Nenhum grupo disponível");
    return null;
  }

  const cidadeAlvo = allGroups.find((g) =>
    normalizarTexto(g.name).includes(inputNormalizado)
  );

  if (cidadeAlvo) {
    debug("Cidade encontrada:", cidadeAlvo.name);
    return cidadeAlvo.name;
  }

  const cidadeExata = allGroups.find(
    (g) => normalizarTexto(g.name) === inputNormalizado
  );

  if (cidadeExata) {
    debug("Cidade encontrada (match exato):", cidadeExata.name);
    return cidadeExata.name;
  }
const nomesCidades = allGroups.map((g) => normalizarTexto(g.name));
const match = stringSimilarity.findBestMatch(inputNormalizado, nomesCidades);

// 🆕 cálculo de nota mínima dinâmica
let minRating = 0.6;
if (inputNormalizado.length <= 3) {
  minRating = 0.95; // palavras muito curtas precisam ser quase iguais
} else if (inputNormalizado.length <= 6) {
  minRating = 0.8;
}

if (match.bestMatch.rating >= minRating) {
  const cidadeFuzzy = allGroups.find(
    (g) => normalizarTexto(g.name) === match.bestMatch.target
  );
  if (cidadeFuzzy) {
    debug(
      "Cidade encontrada (fuzzy match):",
      cidadeFuzzy.name,
      "rating:",
      match.bestMatch.rating
    );
    return cidadeFuzzy.name;
  }
}


  debug("Nenhuma cidade encontrada");
  return null;
}

function buscarHorario(texto) {
  const normalizado = normalizarTexto(texto);
  return horarios[normalizado] || null;
}

function hasTriggerText(texto, userState = null) {
  const inputNormalizado = normalizarTexto(texto || "");

  const PALAVRAS_EXCLUIDAS = [
    "noite",
    "dia",
    "tarde",
    "manha",
    "depois",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
  ];

  if (PALAVRAS_EXCLUIDAS.includes(inputNormalizado)) {
    debug("Palavra excluída detectada:", inputNormalizado);
    return false;
  }

  if (userState && userState.step && userState.step !== "initial") {
    const resetCommands = [
      "menu",
      "reiniciar",
      "recomecar",
      "voltar",
      "inicio",
    ];
    const isResetCommand = resetCommands.some(
      (cmd) => normalizarTexto(cmd) === inputNormalizado
    );
    debug("Usuário em fluxo ativo, comando de reset?", isResetCommand);
    return isResetCommand;
  }

  const gatilhosNormalizados = TRIGGERS.map((trigger) =>
    normalizarTexto(trigger)
  );

  if (gatilhosNormalizados.includes(inputNormalizado)) {
    debug("Trigger encontrado (match exato):", inputNormalizado);
    return true;
  }

  const frasesCompletas = TRIGGERS.filter((trigger) => trigger.includes(" "));
  const frasesNormalizadas = frasesCompletas.map((frase) =>
    normalizarTexto(frase)
  );

  if (frasesNormalizadas.some((frase) => inputNormalizado.includes(frase))) {
    debug(
      "Trigger encontrado (substring de frase completa):",
      inputNormalizado
    );
    return true;
  }

  const match = stringSimilarity.findBestMatch(
    inputNormalizado,
    gatilhosNormalizados
  );
  const isFuzzyMatch = match.bestMatch.rating > 0.9;

  if (isFuzzyMatch) {
    debug(
      "Trigger encontrado (fuzzy match):",
      inputNormalizado,
      "rating:",
      match.bestMatch.rating
    );
  } else {
    debug(
      "Nenhum trigger encontrado para:",
      inputNormalizado,
      "melhor rating:",
      match.bestMatch.rating
    );
  }

  return isFuzzyMatch;
}

function isRequestingHelp(texto) {
  const textoNormalizado = normalizarTexto(texto || "");
  const faqTriggersNormalizados = FAQ_TRIGGERS.map((trigger) =>
    normalizarTexto(trigger)
  );

  if (faqTriggersNormalizados.includes(textoNormalizado)) {
    debug("FAQ trigger encontrado (match exato):", texto);
    return true;
  }

  if (
    faqTriggersNormalizados.some((trigger) =>
      textoNormalizado.includes(trigger)
    )
  ) {
    debug("FAQ trigger encontrado (substring):", texto);
    return true;
  }

  const match = stringSimilarity.findBestMatch(
    textoNormalizado,
    faqTriggersNormalizados
  );
  if (match.bestMatch.rating > 0.7) {
    debug(
      "FAQ trigger encontrado (fuzzy):",
      texto,
      "rating:",
      match.bestMatch.rating
    );
    return true;
  }

  debug("Nenhuma FAQ trigger encontrado para:", texto);
  return false;
}

// 📋 Função para enviar FAQ - sem dependência de faq.js
async function enviarFAQ(client, msg) {
  try {
    debug("Enviando FAQ (dinâmico) para:", msg.from);

    // Tenta buscar mensagem no banco
    const faqMessage = await getMessage("send_faq");
    if (faqMessage) {
      await client.sendMessage(msg.from, faqMessage);
      return;
    }

    // Fallback genérico
    await client.sendMessage(
      msg.from,
      "📋 *FAQ - Perguntas Frequentes*\n\nPara mais informações, digite 'menu' para começar novamente."
    );
  } catch (error) {
    console.error("Erro ao enviar FAQ:", error);
    debug("Erro ao enviar FAQ:", error);

    await client.sendMessage(
      msg.from,
      "📋 *FAQ - Perguntas Frequentes*\n\nPara mais informações, digite 'menu' para começar novamente."
    );
  }
}

module.exports = {
  normalizarTexto,
  normalizarTextoBase,
  normalizarTextoHorario,
  normalizarTextoCidade,
  hasTriggerText,
  buscarHorario,
  identificarCidadeFuzzy,
  isRequestingHelp,
  enviarFAQ,
};
