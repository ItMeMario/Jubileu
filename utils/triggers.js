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
  "boa noite"
];

// Função para normalizar texto (remove acentos e pontuações)
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
    .trim();
}

// Verifica se o texto contém alguma trigger para iniciar o menu
function hasTriggerText(text) {
  const normalized = normalizarTexto(text || "");
  return TRIGGERS.some(trigger => normalized.includes(normalizarTexto(trigger)));
}

module.exports = {
  normalizarTexto,
  hasTriggerText
};