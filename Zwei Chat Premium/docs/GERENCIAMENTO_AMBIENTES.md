# Gerenciamento de Ambientes (Desenvolvimento vs Produção)
## Zwei Chat Premium - Meta WhatsApp Cloud API

Este documento descreve como funciona a separação entre os ambientes de **Desenvolvimento / Testes** (App Developer na Meta) e **Produção** (Conta Oficial WhatsApp Business), além dos comandos disponíveis para alternar entre eles com segurança.

---

## 📁 Estrutura de Arquivos de Configuração

Na raiz do projeto **Zwei Chat Premium**, temos os seguintes arquivos:

| Arquivo | Finalidade |
| :--- | :--- |
| **`.env.development`** | Contém as credenciais do seu aplicativo de testes/developer da Meta (número de teste `+1 (555) ...`, Phone ID `1198324730040475`, WABA ID `1267567782098219`, token temporário). |
| **`.env.production`** | Contém as credenciais oficiais da sua empresa (número de produção, WABA ID corporativo, token de Usuário do Sistema permanente). |
| **`.env`** | **Arquivo ativo** carregado pela aplicação. É gerado ou atualizado automaticamente pelo gerenciador de ambientes. |
| **`.env.example`** | Modelo público de referência documentando todas as variáveis disponíveis. |

> 🔒 **Segurança:** Todos os arquivos `.env*` estão incluídos no `.gitignore`, garantindo que nenhuma chave ou token seja versionada no GitHub.

---

## ⚡ Comandos Rápidos (Terminal)

Todos os comandos são executados a partir da pasta `Zwei Chat Premium`:

### 1. Alternar para o ambiente de Testes / Developer
Carrega as credenciais de `.env.development` para `.env`:
```bash
npm run env:dev
```

### 2. Alternar para o ambiente de Produção
Carrega as credenciais de `.env.production` para `.env`:
```bash
npm run env:prod
```

### 3. Verificar qual ambiente está ativo
Exibe no terminal um resumo do perfil ativo com chaves mascaradas por segurança:
```bash
npm run env:status
```

### 4. Alternar e Iniciar o Zwei Chat diretamente
Para iniciar o app já garantindo que está no ambiente desejado:
```bash
# Iniciar no modo de desenvolvimento/testes:
npm run start:dev

# Iniciar no modo de produção:
npm run start:prod
```

---

## 🔄 Como atualizar o Token de Testes (Expiração em 24h)

O token gerado na tela *"Etapa 1. Experimente"* da Meta expira a cada 24 horas:

1. Acesse o painel da Meta for Developers no seu app **Zwei chat developer**.
2. Vá em **Casos de uso > Personalizar > Configuração básica > Etapa 1. Experimente**.
3. Clique em **Gerar novo token** e copie.
4. Abra o arquivo [`.env.development`](file:///c:/Users/nigtm/Documents/Github/Jubileu/Zwei%20Chat%20Premium/.env.development) e atualize a linha:
   ```env
   META_ACCESS_TOKEN=seu_novo_token_aqui
   ```
5. Execute `npm run env:dev` para sincronizar com o `.env` ativo.

---

## 🏭 Como funciona para o Cliente Final (Instalador .exe)

Quando o Zwei Chat Premium é compilado para distribuição (`npm run dist`):
* O cliente **não tem acesso** aos arquivos `.env` do código-fonte.
* O Electron roda em modo empacotado (`isPackaged = true`) e armazena os dados criptografados diretamente na pasta do usuário:
  * `%APPDATA%\zwei-chat-premium\.env`
* Isso garante que cada cliente mantenha suas próprias configurações de forma 100% isolada e segura.
