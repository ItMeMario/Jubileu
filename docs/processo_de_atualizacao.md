# 🔄 Processo de Atualização e Empacotamento (ASAR / Electron)

Este documento detalha o processo de atualização do **Jubileu Bot**, explicando como ele funciona tanto em ambiente de desenvolvimento quanto em produção, e descreve as diretrizes de empacotamento utilizando o **Electron Builder** e o formato **ASAR**.

---

## ⚡ 1. Resumo do Fluxo de Atualização

O Jubileu possui dois fluxos de atualização distintos com base no ambiente de execução. O sistema detecta isso verificando a existência de um repositório Git (`.git`) na pasta do aplicativo ou de execução.

### A. Modo de Desenvolvimento (Git)
Se o sistema detectar a pasta `.git`:
1. **Verificação**: Compara a versão no `package.json` local com a versão remota no branch `main` do GitHub.
2. **Execução**:
   - Dispara um comando `git pull` para baixar o código-fonte atualizado.
   - Executa `npm install` para atualizar/instalar novas dependências do `package.json`.
3. **Reinício**: O usuário é instruído a reiniciar a aplicação manualmente para aplicar as alterações.

### B. Modo de Produção (Packaged Application)
Se a pasta `.git` **não** existir (aplicativo instalado no cliente):
1. **Verificação**: O módulo `electron-updater` consulta o arquivo de metadados `latest.yml` publicado na aba de *Releases* do repositório GitHub (`ItMeMario/Jubileu`).
2. **Execução**: 
   - Faz o download automático do instalador executável (ex: `jubileu-bot-setup-X.X.X.exe`).
   - Após o download completo, o `autoUpdater` chama `quitAndInstall()`.
3. **Instalação**: O instalador NSIS silenciosamente fecha processos antigos e atualiza os arquivos do sistema de forma limpa.

---

## 📦 2. O que é o ASAR e por que ele é crucial?

O **ASAR (Atom Shell Archive)** é um formato de arquivo de arquivamento simples, semelhante ao tar, que condensa todos os arquivos do seu aplicativo Electron em um único arquivo (geralmente localizado em `resources/app.asar`).

### Benefícios do ASAR no Jubileu
* **Performance**: Mitiga problemas de velocidade ao ler milhares de pequenos arquivos JS/CSS/HTML no Windows.
* **Prevenção de Erros do Antivírus**: Reduz a chance de falsos positivos causados por múltiplos arquivos JS soltos no sistema do cliente.
* **Bloqueio de Pastas**: Facilita a substituição de arquivos no processo de atualização.

> [!IMPORTANT]
> **A Regra de Ouro do ASAR: O Sistema de Arquivos é Virtual e Somente Leitura**
> O conteúdo dentro de `app.asar` **não pode** ser modificado durante o tempo de execução. Qualquer tentativa de salvar arquivos, criar bancos de dados ou fazer `git pull` dentro da pasta `resources/app.asar` resultará em erro.

---

## 🛠️ 3. ASAR Unpack (`asarUnpack`)

Alguns pacotes ou arquivos não funcionam corretamente de dentro do arquivo compactado `app.asar`. Isso ocorre quando:
* Contêm **binários nativos compilados** (arquivos `.node`) que precisam ser vinculados pelo sistema operacional.
* Executam processos filhos externos que exigem caminhos físicos no disco (como o Puppeteer abrindo o navegador Chrome).

No `package.json`, especificamos quais pastas devem ser descompactadas durante o build na chave `asarUnpack`:

```json
"asarUnpack": [
  "node_modules/whatsapp-web.js/**/*",
  "node_modules/sqlite3/**/*",
  "node_modules/clipboardy/**/*"
]
```

### Por que desempacotar estes módulos?
1. **`sqlite3`**: Contém um módulo binário nativo pré-compilado para a arquitetura alvo. Binários C++ do Node.js precisam estar soltos no disco físico para que a DLL correspondente seja devidamente carregada em memória.
2. **`whatsapp-web.js`**: Utiliza o Puppeteer para instanciar o Chromium de fundo. O Puppeteer precisa ler scripts e interagir com pastas reais no disco, as quais não podem estar zipadas no ASAR.
3. **`clipboardy`**: Executa utilitários de linha de comando (`.exe` no Windows) para realizar a leitura/escrita da área de transferência. Binários não podem ser executados a partir de arquivos compactados virtuais.

Ao empacotar, esses arquivos serão gerados na pasta `resources/app.asar.unpacked`. O Electron faz o redirecionamento automático das chamadas de leitura, mas é essencial certificar-se de que os caminhos dinâmicos no código resolvam para o local físico.

---

## ⚠️ 4. Boas Práticas para Desenvolvedores (Evitando Quebras)

### A. Case-Sensitivity Absoluto no ASAR
Diferente do sistema operacional Windows padrão (que é case-insensitive), o empacotamento ASAR do Electron é **extremamente case-sensitive** (diferencia maiúsculas e minúsculas).
* ❌ **Errado**: `const AppLifecycle = require("./appLifecycle");` (se o arquivo real se chama `AppLifecycle.js`).
* ✅ **Correto**: `const AppLifecycle = require("./AppLifecycle");`
* **Impacto**: Se houver um mismatch de letras maiúsculas/minúsculas nas importações, o aplicativo funcionará perfeitamente em modo de desenvolvimento local no Windows, mas **irá quebrar com erro de "Module not found"** ao ser empacotado em produção.

### B. Onde Salvar Arquivos de Runtime (Dados do Usuário)
Como o diretório do aplicativo (`app.getAppPath()`) pode estar compactado no ASAR e é protegido contra escrita, **nunca** salve arquivos como bancos de dados, arquivos de log, áudios baixados ou caches na pasta da aplicação.
* Use o diretório `userData` da aplicação obtido via API do Electron:
  ```javascript
  const { app } = require("electron");
  const path = require("path");
  
  // Caminho seguro e persistente que funciona em produção e desenvolvimento
  const userDirectory = app.getPath("userData");
  const dbPath = path.join(userDirectory, "data", "database.db");
  ```
* **Nota Histórica (v1.4.2)**: A migração das pastas de serviço (`deeJayService`, `crmService`, `groupService`) para o diretório `userData` foi o que corrigiu o erro onde o instalador do Jubileu não conseguia substituir arquivos da versão antiga (erro de arquivos bloqueados/em uso).

### C. Bloqueio de Processos na Atualização (NSIS customInit)
Ao atualizar a aplicação pelo instalador executável, o Windows não permitirá a substituição de arquivos se o aplicativo ou os processos secundários do Puppeteer/Chromium ainda estiverem abertos.
Para resolver isso, o instalador NSIS usa a macro `customInit` configurada em conjunto com o `electron-builder` para:
1. Detectar processos filhos ativos em execução.
2. Encerrar de forma limpa e silenciosa o processo do `Jubileu Bot.exe` e instâncias órfãs de navegadores abertas por ele antes de iniciar a extração dos novos arquivos.

### D. Recompilação de Dependências Nativas (Native Modules)
Toda vez que a versão do `Node.js` ou do `Electron` for alterada no projeto, os módulos nativos como o `sqlite3` precisam ser recompilados especificamente para a ABI correta da nova versão do Electron.
* Certifique-se de executar o script de pós-instalação para reconstruir dependências nativas automaticamente:
  ```bash
  npm run postinstall
  ```
  *(O qual chama: `electron-builder install-app-deps`)*

---

## 🚀 5. Comandos Úteis de Empacotamento

* **Criar instalador local de teste (Windows)**:
  ```bash
  npm run dist
  ```
  *(Este comando gera a pasta `dist/` com o instalador compactado e atualiza o arquivo `latest.yml` localmente).*

* **Empacotar especificamente para arquitetura Windows x64**:
  ```bash
  npm run dist:win
  ```
