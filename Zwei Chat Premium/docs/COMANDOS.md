# ⚡ Zwei Chat Premium — Guia de Comandos do Sistema

> Guia rápido de referência operacional para alternância de ambientes, execução local e geração do instalador/executável oficial.

---

## 🚀 1. Execução da Aplicação

Inicia a interface desktop do Zwei Chat já carregando automaticamente as credenciais correspondentes.

```bash
# Iniciar em Modo de DESENVOLVIMENTO (App de Testes / Developer)
npm run start:dev

# Iniciar em Modo de PRODUÇÃO (App Oficial / Produção ZC)
npm run start:prod

# Iniciar direto (com as credenciais atualmente ativas no .env)
npm start
```

---

## 🔄 2. Gerenciador de Ambientes (.env)

Alterna ou verifica o perfil de conexão ativo sem precisar abrir a janela do Electron.

| Comando | Descrição |
| :--- | :--- |
| `npm run env:status` | Exibe no terminal qual ambiente está ativo, App ID, WABA e Phone ID |
| `npm run env:dev` | Copia `.env.development` para o `.env` ativo |
| `npm run env:prod` | Copia `.env.production` para o `.env` ativo |

```bash
# Exemplo de verificação rápida
npm run env:status
```

---

## 📦 3. Compilação & Geração do Executável (.exe)

O processo executa a proteção de código contra engenharia reversa (**ofuscação AST comercial**) e empacota o instalador Windows NSIS.

```bash
# 1. Gerar o Instalador Executável do Windows (.exe na pasta /dist)
npm run dist:win

# 2. Apenas executar o motor de ofuscação (gera pasta /build-protected)
npm run build:obfuscate

# 3. Reinstalar dependências nativas do Electron (se houver erro no sqlite3)
npm run postinstall
```

> 📁 **Onde fica o arquivo gerado?**  
> Após a conclusão de `npm run dist:win`, o instalador estará disponível na pasta:  
> `Zwei Chat Premium\dist\zwei-chat-premium-setup-1.0.0.exe`

---

## 🌐 4. Serviços de Apoio & Testes

Comandos auxiliares para o gateway de webhooks local e baterias de testes automatizados.

```bash
# Iniciar apenas o Cloud Gateway / Servidor de Webhooks com Túnel
npm run gateway

# Simular disparo de Webhook da Meta
npm run test:webhook

# Testar resiliência e watchdog do túnel Cloudflare
npm run test:tunnel

# Testar sanitização contra XSS no chat
npm run test:xss
```

---

## 📋 5. Resumo Rápido (Cheat Sheet)

```bash
# Fluxo para testar localmente em produção:
npm run env:prod && npm start

# Fluxo para gerar nova versão comercial para clientes:
npm run env:prod && npm run dist:win
```

