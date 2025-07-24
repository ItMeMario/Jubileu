// triggers.js - Versão com novo sistema de debug e FAQ integrado
const horarios = require("../horarios");
const aliases = require("../aliases");
const stringSimilarity = require("string-similarity");
const groupService = require("../services/groupService");
const { debug } = require("../services/debugService");
const FAQ_TRIGGERS = require("../faqAliases"); // Importa os triggers do FAQ
const faq = require('../utils/faq.js'); // Importa o FAQ

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
  "¡Hola! Me gustaría conseguir más información sobre esto."
];

function normalizarTextoBase(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^\w\s:]/g, "")        // remove pontuação, exceto :
    .replace(/\s+/g, ' ')            // colapsa espaços
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

function identificarCidadeFuzzy(texto) {
  const input = normalizarTexto(texto || '');
  
  // Usando o novo sistema de debug
  debug('Fuzzy matching - Input original:', texto);
  debug('Fuzzy matching - Input normalizado:', input);
  
  const allGroups = groupService.getAllGroups();
  debug('Grupos disponíveis:', allGroups.length);
  debug('Estrutura dos grupos:', allGroups);

  if (!allGroups || allGroups.length === 0) {
    debug('Nenhum grupo disponível');
    return null;
  }

  // Mapear as cidades com suas variações
  const cityMap = allGroups
    .filter(group => group?.name)
    .map(group => {
      const normalizado = normalizarTexto(group.name);
      // Criar variações da cidade para melhor matching
      const variações = [
        group.name,                    // Nome original
        normalizado,                   // Nome normalizado
        group.name.split(' ')[0],      // Primeira palavra (ex: "São" de "São Paulo")
        normalizado.split(' ')[0]      // Primeira palavra normalizada
      ];
      
      return {
        original: group.name,
        normalizado: normalizado,
        variações: variações.filter(v => v && v.length > 0)
      };
    });

  debug('Cidades mapeadas com variações:', cityMap);

  if (!input || input.length === 0) {
    debug('Input vazio');
    return null;
  }

  // Primeira tentativa: busca exata em todas as variações
  for (const city of cityMap) {
    if (city.variações.some(variacao => normalizarTexto(variacao) === input)) {
      debug('Match exato encontrado:', city.original);
      return city.original;
    }
  }

  // Segunda tentativa: busca por substring (contém)
  for (const city of cityMap) {
    if (city.variações.some(variacao => {
      const varNorm = normalizarTexto(variacao);
      return varNorm.includes(input) || input.includes(varNorm);
    })) {
      debug('Match por substring encontrado:', city.original);
      return city.original;
    }
  }

  // Terceira tentativa: fuzzy matching
  const normalizados = cityMap.map(c => c.normalizado);
  const match = stringSimilarity.findBestMatch(input, normalizados);
  debug('Melhor match fuzzy:', match.bestMatch);

  // Reduzindo threshold para 0.3 para ser mais flexível
  if (match.bestMatch.rating > 0.3) {
    const item = cityMap.find(c => c.normalizado === match.bestMatch.target);
    debug('Cidade encontrada via fuzzy:', item?.original);
    return item?.original || null;
  }

  debug('Nenhuma cidade encontrada com similaridade suficiente');
  return null;
}

function buscarHorario(texto) {
  const normalizado = normalizarTexto(texto);
  return horarios[normalizado] || null; // Alterado de "Não entendi" para null
}

function hasTriggerText(texto) {
  const inputNormalizado = normalizarTexto(texto || "");
  const gatilhosNormalizados = TRIGGERS.map(trigger => normalizarTexto(trigger));

  // Verificação direta (frase completa)
  if (gatilhosNormalizados.includes(inputNormalizado)) {
    return true;
  }

  // Verificação por substring (gatilho contido no texto)
  if (gatilhosNormalizados.some(trigger => inputNormalizado.includes(trigger))) {
    return true;
  }

  // Fallback: fuzzy matching (mais pesado, usar só como último recurso)
  const match = stringSimilarity.findBestMatch(inputNormalizado, gatilhosNormalizados);
  return match.bestMatch.rating > 0.75;
}

// 🔍 Nova função para verificar se é comando FAQ/AJUDA
function isRequestingHelp(texto) {
  const textoNormalizado = normalizarTexto(texto || "");
  const faqTriggersNormalizados = FAQ_TRIGGERS.map(trigger => normalizarTexto(trigger));

  // Verificação direta (frase completa)
  if (faqTriggersNormalizados.includes(textoNormalizado)) {
    debug('FAQ trigger encontrado (match exato):', texto);
    return true;
  }

  // Verificação por substring (gatilho contido no texto)
  if (faqTriggersNormalizados.some(trigger => textoNormalizado.includes(trigger))) {
    debug('FAQ trigger encontrado (substring):', texto);
    return true;
  }

  // Fuzzy matching para FAQ triggers (mais tolerante)
  const match = stringSimilarity.findBestMatch(textoNormalizado, faqTriggersNormalizados);
  if (match.bestMatch.rating > 0.7) {
    debug('FAQ trigger encontrado (fuzzy):', texto, 'rating:', match.bestMatch.rating);
    return true;
  }

  debug('Nenhum FAQ trigger encontrado para:', texto);
  return false;
}

// 📋 Função para enviar FAQ - movida para cá para manter modularidade
async function enviarFAQ(client, msg) {
  try {
    debug('Enviando FAQ para:', msg.from);
    await faq.enviarFAQ(client, msg); 
  } catch (error) {
    console.error("Erro ao enviar FAQ:", error);
    debug('Erro ao enviar FAQ:', error);
    await client.sendMessage(msg.from, "📋 *FAQ - Perguntas Frequentes*\n\nPara mais informações, digite 'menu' para começar novamente.");
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
  isRequestingHelp,          // Nova função exportada
  enviarFAQ                  // Nova função exportada
};