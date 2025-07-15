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
  "Hello! Can i get more info on this?"
];

const horarios = require("../horarios");
const aliases = require("../aliases");


function normalizarTexto(texto) {
  texto = texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")    // sem acentos
    .replace(/[^a-z0-9\s:]/g, "")       // mantém “:”
    .trim();

  // >>>  se o usuário digitou só um dígito (1-6), devolva-o sem mexer  <<<
  if (/^[1-6]$/.test(texto)) return texto;

  // continua igual
  const matchHora = texto.match(/(\d{1,2})(?::(\d{2}))?\s*(h|horas)?/);
  if (matchHora) {
    const hora = matchHora[1].padStart(2, "0");
    const minuto = matchHora[2] ? matchHora[2].padStart(2, "0") : "00";
    return `${hora}:${minuto}`;
  }

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