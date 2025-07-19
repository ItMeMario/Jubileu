
const horarios = require("../horarios");
const aliases = require("../aliases");

// Lista de triggers que ativam o menu
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

function normalizarTexto(texto) {
  if (typeof texto !== 'string') return '';

  // Normaliza texto: lowercase, sem acentos, sem pontuação
  texto = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")       // remove acentos
    .replace(/[^\w\s:]/g, "")              // remove pontuação, exceto ":"
    .replace(/\s+/g, ' ')                  // colapsa múltiplos espaços
    .trim();

  // >>> Se for um número de 1 a 6, retorna alias correspondente
  if (/^[1-6]$/.test(texto)) {
    return aliases[texto] || texto;
  }

  // >>> Tenta encontrar no mapa de aliases
  if (aliases[texto]) {
    return aliases[texto];
  }

  // >>> Tenta converter algo tipo "10h", "10 00", "10:00" em formato HH:MM
  const matchHora = texto.match(/(\d{1,2})(?:[:h\s]?(\d{2}))?/);
  if (matchHora) {
    const hora = matchHora[1].padStart(2, "0");
    const minuto = matchHora[2] ? matchHora[2].padStart(2, "0") : "00";
    const horarioFormatado = `${hora}:${minuto}`;

    // Valida se está presente nos horários válidos
    if (horarios[horarioFormatado]) {
      return horarioFormatado;
    }
  }

  // >>> Se nada funcionar, retorna o texto normalizado original
  return texto;
}


function buscarHorario(texto) {
  const normalizado = normalizarTexto(texto);
  return horarios[normalizado] || "Não entendi";
}



// Verifica se o texto contém alguma trigger para iniciar o menu
function hasTriggerText(text) {
  const normalized = normalizarTexto(text || "");
  return TRIGGERS.some(trigger => normalized.includes(normalizarTexto(trigger)));
}

module.exports = {
  normalizarTexto,
  hasTriggerText,
  buscarHorario
};