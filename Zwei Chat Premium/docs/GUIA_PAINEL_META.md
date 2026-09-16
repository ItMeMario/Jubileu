# Guia de Configuração do Embedded Signup no Painel Meta for Developers

Este guia explica o passo a passo para habilitar o **Embedded Signup (Onboarding Oficial do WhatsApp)** no seu aplicativo da Meta, permitindo que seus clientes conectem seus próprios números e cartões de crédito automaticamente.

---

### Dados Atuais do seu Aplicativo:
- **Meta App ID:** `1824502742321385`
- **Versão da Graph API:** `v21.0`
- **Verify Token do Webhook:** `zwei_chat_meta_verify_token_2026`

---

## Passo 1: Acessar seu App no Meta for Developers
1. Acesse o portal: [developers.facebook.com/apps](https://developers.facebook.com/apps)
2. Faça login com a sua conta de desenvolvedor da Meta.
3. Clique no seu aplicativo (**ID: 1824502742321385**).

---

## Passo 2: Configurar a URL de Redirecionamento do OAuth (Obrigatório para Desktop/Electron)
1. No menu lateral esquerdo, localize **Login do Facebook para Empresas** (ou **Login do Facebook**) > **Configurações**.
2. No campo **URIs de redirecionamento do OAuth válidos**, adicione a seguinte URL:
   ```text
   https://www.facebook.com/connect/login_success.html
   ```
3. Certifique-se de que a opção **Login pelo fluxo do navegador inserido (Embedded browser OAuth)** esteja marcada como **Sim**.
4. Clique em **Salvar alterações**.

---

## Passo 3: Criar a Configuração do WhatsApp (Configuration ID)
1. No menu lateral esquerdo, clique em **WhatsApp** > **Onboarding incorporado** (ou **Configuração rápida / Quickstart**).
2. Procure pela seção **Configuração do recurso de login do WhatsApp** e clique em **Criar configuração** (ou **Editar**).
3. Preencha as opções:
   - **Nome da Configuração:** `Zwei Chat Premium Onboarding`
   - **Permissões solicitadas:** Certifique-se de marcar:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
4. Clique em **Salvar**.
5. Copie o **ID da Configuração** (um número de 15 a 16 dígitos, ex: `987654321012345`).

---

## Passo 4: Atualizar seu arquivo `.env`
Abra o arquivo `.env` na pasta do **Zwei Chat Premium** e adicione o ID gerado:

```env
META_APP_ID=1824502742321385
META_CONFIG_ID=seu_config_id_copiado_aqui
```

---

## Passo 5: Informações Básicas do App (Para Confiança do Cliente)
Quando o seu cliente leigo clicar em *"Conectar meu WhatsApp Comercial"*, a janela oficial do Facebook vai abrir exibindo o nome e o logotipo do seu aplicativo. Para transmitir profissionalismo:

1. No menu lateral esquerdo, vá em **Configurações** > **Básico**.
2. **Nome de exibição:** Ex: `Zwei Chat Premium`.
3. **Ícone do aplicativo:** Faça upload do logo do Zwei Chat (1024 x 1024 px).
4. **URL da Política de Privacidade:** Insira a URL da página de termos/privacidade do seu software (a Meta exige isso para aplicativos em produção).
5. **Categoria:** Selecione `Negócios e Páginas` ou `Comunicação`.
6. Clique em **Salvar alterações**.

---

## Passo 6: Subscrição de Webhook do WhatsApp
1. No menu lateral, acesse **WhatsApp** > **Configuração**.
2. Na seção **Webhook**, confirme se os seguintes campos estão inscritos:
   - `messages` (para receber mensagens e respostas dos clientes)
   - `message_template_status_update` (para atualizar status de templates aprovados)
   - `account_update` (para receber atualizações de qualidade e status da conta)

---

Pronto! Com estas configurações, qualquer cliente que clicar no botão **"Conectar meu WhatsApp Comercial"** dentro do Zwei Chat Premium será guiado pelo fluxo oficial da Meta, cadastrará o próprio cartão e começará a disparar pelo próprio número.
