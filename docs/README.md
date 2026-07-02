#Jubileu

## ✍️ Autor

Desenvolvido por [Mario]  
GitHub: [https://github.com/ItMeMarion]  
Data de início: [03/07/2025]  
Status: Em desenvolvimento / Em produção

## 📌 Descrição

Este é um bot de atendimento automatizado via WhatsApp, desenvolvido para convidar pessoas para eventos de scouting de modelos.  
Ele funciona de forma autônoma, simulando atendimento humano e operando inclusive fora do horário comercial.

## 🚀 Funcionalidades

- Envio automático de mensagens personalizadas
- Registro de presença confirmada
- Funciona 24/7 (mesmo fora do expediente)
- Modularidade para expansão de fluxos
- Logging básico para depuração
- Suporte a atualizações remotas via GitHub (veja o [Guia de Processo de Atualização](processo_de_atualizacao.md))
- Sistema de debug personalizado
- Indicadores de desempenho com possibilidade de exportação de dados

## 🛠️ Tecnologias e Dependências

- `nodejs`
- `whatsapp-web.js`
- `json`
- `sqlite3`
- `Electron`
- `Google Chrome`
- `Git`

## ⚡ Como Executar

Para executar o projeto:

1. Abra o terminal na pasta do projeto.
2. Instale as dependências: `npm install`
3. Escolha uma das opções:
   - **Executar a aplicação**: `npm start`
   - **Criar instalador (empacotamento)**: `npm run dist` → Acesse a pasta `dist` criada e use o executável.

Consulte o [Guia do Processo de Atualização e Empacotamento](processo_de_atualizacao.md) para saber mais sobre o funcionamento interno das atualizações automáticas e diretrizes do empacotamento ASAR.
