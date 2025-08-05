// triggers.js - Versão com novo sistema de debug e FAQ integrado + Correção de triggers indevidos
const horarios = require("../horarios");
const aliases = require("../aliases/TimeAliases.js");
const stringSimilarity = require("string-similarity");
const groupService = require("../services/groupService");
const { debug } = require("../services/debugService");
const FAQ_TRIGGERS = require("../aliases/faqAliases.js"); // Importa os triggers do FAQ
const faq = require("../utils/faq.js"); // Importa o FAQ

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
];

function normalizarTextoBase(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s:]/g, "") // remove pontuação, exceto :
    .replace(/\s+/g, " ") // colapsa espaços
    .trim();
}

// Função principal de normalização - agora exportada corretamente
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
  const input = normalizarTexto(texto || "");

  debug("Fuzzy matching - Input original:", texto);
  debug("Fuzzy matching - Input normalizado:", input);

  const allGroups = await groupService.getAllGroups(); // << CORREÇÃO AQUI
  debug("Grupos disponíveis:", allGroups.length);
  debug("Estrutura dos grupos:", allGroups);

  if (!allGroups || allGroups.length === 0) {
    debug("Nenhum grupo disponível");
    return null;
  }

  const cityMap = allGroups
    .filter((group) => group?.name)
    .map((group) => {
      const normalizado = normalizarTexto(group.name);
      const variações = [
        group.name,
        normalizado,
        group.name.split(" ")[0],
        normalizado.split(" ")[0],
      ];

      return {
        original: group.name,
        normalizado: normalizado,
        variações: variações.filter((v) => v && v.length > 0),
      };
    });

  debug("Cidades mapeadas com variações:", cityMap);

  if (!input || input.length === 0) {
    debug("Input vazio");
    return null;
  }

  for (const city of cityMap) {
    if (
      city.variações.some((variacao) => normalizarTexto(variacao) === input)
    ) {
      debug("Match exato encontrado:", city.original);
      return city.original;
    }
  }

  for (const city of cityMap) {
    if (
      city.variações.some((variacao) => {
        const varNorm = normalizarTexto(variacao);
        return varNorm.includes(input) || input.includes(varNorm);
      })
    ) {
      debug("Match por substring encontrado:", city.original);
      return city.original;
    }
  }

  const normalizados = cityMap.map((c) => c.normalizado);
  const match = stringSimilarity.findBestMatch(input, normalizados);
  debug("Melhor match fuzzy:", match.bestMatch);

  if (match.bestMatch.rating > 0.3) {
    const item = cityMap.find((c) => c.normalizado === match.bestMatch.target);
    debug("Cidade encontrada via fuzzy:", item?.original);
    return item?.original || null;
  }

  debug("Nenhuma cidade encontrada com similaridade suficiente");
  return null;
}

function buscarHorario(texto) {
  const normalizado = normalizarTexto(texto);
  return horarios[normalizado] || null; // Alterado de "Não entendi" para null
}

// 🆕 FUNÇÃO MODIFICADA PARA EVITAR TRIGGERS INDEVIDOS
function hasTriggerText(texto, userState = null) {
  const inputNormalizado = normalizarTexto(texto || "");

  // Lista de palavras que nunca devem triggar o sistema
  const PALAVRAS_EXCLUIDAS = [
    "noite",
    "dia",
    "tarde",
    "manhã",
    "depois",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
  ];

  // Se é uma palavra excluída, nunca deve triggar
  if (PALAVRAS_EXCLUIDAS.includes(inputNormalizado)) {
    debug("Palavra excluída detectada:", inputNormalizado);
    return false;
  }

  // Se usuário está em fluxo ativo, só aceita comandos específicos de reset
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

  // Verificação direta (frase completa) - match exato
  if (gatilhosNormalizados.includes(inputNormalizado)) {
    debug("Trigger encontrado (match exato):", inputNormalizado);
    return true;
  }

  // Substring apenas para frases completas (2+ palavras)
  // Isso evita que "noite" match com "boa noite"
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

  // Fuzzy matching muito restritivo (aumentado de 0.75 para 0.9)
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

// 🔍 Nova função para verificar se é comando FAQ/AJUDA
function isRequestingHelp(texto) {
  const textoNormalizado = normalizarTexto(texto || "");
  const faqTriggersNormalizados = FAQ_TRIGGERS.map((trigger) =>
    normalizarTexto(trigger)
  );

  // Verificação direta (frase completa)
  if (faqTriggersNormalizados.includes(textoNormalizado)) {
    debug("FAQ trigger encontrado (match exato):", texto);
    return true;
  }

  // Verificação por substring (gatilho contido no texto)
  if (
    faqTriggersNormalizados.some((trigger) =>
      textoNormalizado.includes(trigger)
    )
  ) {
    debug("FAQ trigger encontrado (substring):", texto);
    return true;
  }

  // Fuzzy matching para FAQ triggers (mais tolerante)
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

// 📋 Função para enviar FAQ - movida para cá para manter modularidade
async function enviarFAQ(client, msg) {
  try {
    debug("Enviando FAQ para:", msg.from);
    await faq.enviarFAQ(client, msg);
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
  hasTriggerText, // 🆕 Versão modificada
  buscarHorario,
  identificarCidadeFuzzy,
  isRequestingHelp,
  enviarFAQ,
};
