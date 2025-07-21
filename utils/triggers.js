// triggers.js - Versão Corrigida
const horarios = require("../horarios");
const aliases = require("../aliases");
const stringSimilarity = require("string-similarity");
const groupService = require("../services/groupService");

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
  
  // Debug log
  console.log('[DEBUG] Fuzzy matching - Input original:', texto);
  console.log('[DEBUG] Fuzzy matching - Input normalizado:', input);
  
  const allGroups = groupService.getAllGroups();
  console.log('[DEBUG] Grupos disponíveis:', allGroups.length);
  console.log('[DEBUG] Estrutura dos grupos:', allGroups);

  if (!allGroups || allGroups.length === 0) {
    console.log('[DEBUG] Nenhum grupo disponível');
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

  console.log('[DEBUG] Cidades mapeadas com variações:', cityMap);

  if (!input || input.length === 0) {
    console.log('[DEBUG] Input vazio');
    return null;
  }

  // Primeira tentativa: busca exata em todas as variações
  for (const city of cityMap) {
    if (city.variações.some(variacao => normalizarTexto(variacao) === input)) {
      console.log('[DEBUG] Match exato encontrado:', city.original);
      return city.original;
    }
  }

  // Segunda tentativa: busca por substring (contém)
  for (const city of cityMap) {
    if (city.variações.some(variacao => {
      const varNorm = normalizarTexto(variacao);
      return varNorm.includes(input) || input.includes(varNorm);
    })) {
      console.log('[DEBUG] Match por substring encontrado:', city.original);
      return city.original;
    }
  }

  // Terceira tentativa: fuzzy matching
  const normalizados = cityMap.map(c => c.normalizado);
  const match = stringSimilarity.findBestMatch(input, normalizados);
  console.log('[DEBUG] Melhor match fuzzy:', match.bestMatch);

  // Reduzindo threshold para 0.3 para ser mais flexível
  if (match.bestMatch.rating > 0.3) {
    const item = cityMap.find(c => c.normalizado === match.bestMatch.target);
    console.log('[DEBUG] Cidade encontrada via fuzzy:', item?.original);
    return item?.original || null;
  }

  console.log('[DEBUG] Nenhuma cidade encontrada com similaridade suficiente');
  return null;
}

function buscarHorario(texto) {
  const normalizado = normalizarTexto(texto);
  return horarios[normalizado] || "Não entendi";
}

function hasTriggerText(text) {
  const normalized = normalizarTexto(text || "");
  return TRIGGERS.some(trigger => normalized.includes(normalizarTexto(trigger)));
}

module.exports = {
  normalizarTexto,           // Agora exportada corretamente
  normalizarTextoBase,       // Também exportando a base
  normalizarTextoHorario,    // Para casos específicos de horário
  normalizarTextoCidade,     // Para casos específicos de cidade
  hasTriggerText,
  buscarHorario,
  identificarCidadeFuzzy
};