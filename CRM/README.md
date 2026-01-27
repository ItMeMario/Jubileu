# CRM Module

Este é um módulo independente do sistema CRM WhatsApp.

## Como usar

1.  Certifique-se de que as dependências estão instaladas:
    ```bash
    npm install
    ```
    (Note: As dependências já devem ter sido instaladas automaticamente)

2.  Para iniciar o módulo:
    ```bash
    npm start
    ```

## Estrutura

-   **main.js**: Processo principal do Electron. Gerencia a janela e o cliente WhatsApp (`whatsapp-web.js`).
-   **renderer/**: Contém a interface gráfica (HTML, CSS, JS).
-   **preload.js**: Ponte segura entre o processo principal e a interface.

## Funcionalidades

-   Conexão WhatsApp via QR Code.
-   Interface Dark/Light mode (automático ou toggle).
-   Design isolado do projeto principal Jubileu.
