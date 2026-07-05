📌 Patch Notes - Versão 0.0.1

✨ Novidades
Adicionado novo item no FAQ referente a tatuagens e outros temas relacionados.

Adicionado indicadores para melhor acompanhamento de status.

Adicionado opção no menu de configurações para gerenciar indicadores.

🛠️ Melhorias
Refatorada a interface do menu de configurações para um visual mais clean e intuitivo.

Modificada a mensagem exibida ao cliente após a escolha de horário.

🐛 Correções
Corrigido bug relacionado às opções por escrita no menu de horários.

📅 Data de Lançamento: [18/07/2025]

📌 Patch Notes - Versão 0.0.2

✨ Novidades
Adicionado modo desenvolvedor (modo dev) para testes e ajustes em tempo real.
Criada a função initializeFile para inicializar arquivos JSON atuais e futuros de forma automatizada.

🛠️ Melhorias
Refatorada a lógica dos modos single e multi, separando-os em arquivos distintos.
Atualizado o modo multi para seguir o novo fluxograma de atendimento.
CRUD de mensagens ajustado para exibir apenas os primeiros 50 caracteres ao listar mensagens.
Mensagem de timeout modificada para "interessado(a)".
Delay do timeout aumentado para 30 minutos.

🐛 Correções
Corrigido problema na função hasTrigger que impedia o funcionamento correto das triggers.
Corrigido bug que impedia o FAQ de ser exibido corretamente.

📅 Data de Lançamento: [22/07/2025]

📌 Patch Notes - Versão 0.0.3

✨ Novidades
Adicionada opção para ativar ou desativar mensagens de debug.

Implementado delay aleatório entre 5 e 25 segundos entre mensagens de interação, simulando uma comunicação mais natural.

Nome do cliente agora é exibido nas mensagens de ociosidade.

Nova funcionalidade permite gerar um relatório com a quantidade de agendamentos por horário.

Adicionado novo item ao FAQ referente à restrição de idade.

Mensagem de envio do link do grupo reformulada para uma versão mais elegante e contendo a data.

Incluídas novas triggers para acesso rápido ao FAQ.

Implementado sistema de scout que envia mensagem para si mesmo confirmando que o programa está online.

Criada pasta exclusiva para documentação, com reorganização dos arquivos de licença, README e demais documentos.

O scout agora também informa o horário da última mensagem de boas-vindas enviada ao cliente.

🛠️ Melhorias
Texto padrão de timeout revisado para maior clareza.

FAQ atualizado com remoção de numeração nos itens para uma leitura mais fluida.

Melhorada a formatação geral do FAQ.

Adicionados dois novos itens à trigger de busca do FAQ.

🐛 Correções
Corrigido bug nas triggers que fazia com que o termo "tarde" acionasse o horário incorreto.

Corrigido problema que causava reinício do sistema caso o cliente digitasse uma trigger enquanto informava o próprio nome.

📅 Data de Lançamento: [28/07/2025]

📌 Patch Notes - Versão 0.0.4
✨ Novidades

Adicionado um sistema antiSpam.

Adicionada lista de palavras “excluídas” para evitar reinício de fluxo por engano.

Adicionada tratativa para mensagens em formatos não suportados (vídeo, arquivos, figurinhas, áudio, etc.).

Adicionada trava para o bot não enviar mensagens em grupos.

Adicionada função para verificar se o usuário já está no grupo e agir de acordo.

Criado um folder dedicado para aliases.

Adicionados novos aliases para siglas de cidades.

🛠️ Melhorias

Refatorado o arquivo messageViews para messageUtils e movido para o local correto.

Refatorado o arquivo indicadoresController, separando responsabilidades e criando indicadoresView.

Formatada a mensagem final do link para atender às novas exigências.

Movida a função de trocar de modo single e multi para o menu do modo dev.

Substituídos console.log dos handlers e utils para utilizar o modo debug do sistema.

Atualizado CRUD de cidades para permitir edição parcial em vez de total.

🐛 Correções

Corrigido bug no CRUD de grupos.

Corrigido bug na função de trocar de modo do programa.

Corrigido bug na troca de modo single e multi.

📅 Data de Lançamento: [13/08/2025]

📌 Patch Notes - Versão 0.0.5

✨ Novidades

Criado banco de dados em SQLite3 para gerenciamento centralizado de dados.

Adicionado suporte a locale para mensagens, preparando o sistema para futura implementação de múltiplos idiomas.

Criada pasta dedicada para arquivos de configuração, organizando melhor a estrutura do projeto.

🛠️ Melhorias

Substituída a lógica do CRUD de cidades para utilizar o banco de dados.

Substituída a lógica do CRUD de indicadores para utilizar o banco de dados.

Substituída a lógica do CRUD de mensagens para utilizar o banco de dados.

Adicionado tratamento para recusar emojis, garantindo consistência no conteúdo armazenado e exibido.

🐛 Correções

[Nenhuma correção registrada nesta versão.]

📅 Data de Lançamento: [19/08/2025]

📌 Patch Notes - Versão 0.0.6
✨ Novidades

Adicionado Front-End com Electron.

Adicionadas instruções de instalação no README.

Adicionado botão de iniciar e parar o bot.

Implementado CRUD de mensagens na interface gráfica (GUI).

Implementado CRUD de cidades na GUI.

Implementado CRUD de indicadores na GUI.

Implementado CRUD do modo Dev na GUI.

Implementado CRUD do banco de dados na GUI.

Adicionado novo item no FAQ referente ao booking.

Implementado timeout dinâmico.

Implementado FAQ dinâmico.

Implementado anti-spam dinâmico.

Implementado menu de cidades dinâmico.

Implementado menu de horários dinâmico.

Implementado menu de nomes dinâmico.

Implementado tratamento dinâmico para erros de cidades.

Implementado tratamento dinâmico para convites de grupo, erros de grupo e status “já está no grupo”.

Jubileu agora é multilíngue (suporte a múltiplos idiomas, inicialmente:

🇺🇸 Inglês Americano

🇧🇷 Português Brasileiro

🇵🇾 Espanhol Paraguaio
(as mensagens devem ser configuradas separadamente)).

Adicionado ao modo Dev no CLI a opção de trocar o idioma.

🛠️ Melhorias

Ajustado o CRUD de cidades para incluir a data dos eventos.

Refatorado o handler de mensagens para maior modularidade, agora dividido em 5 handlers:

menuHandler

faqHandler

cityHandler

timeHandler

nameHandler

Adicionado no CRUD de mensagens a verificação da quantidade de mensagens configuradas no bot.

Atualização no GUI de mensagens para melhor usabilidade.

🐛 Correções

Corrigido o CRUD CLI de cidades, garantindo que traga corretamente mensagem e data cadastradas.

Corrigido bug que fazia a mensagem de timeout aparecer mesmo quando o cliente já estava no grupo.

Corrigido bug do “oi” no modo single.

Corrigido bug na GUI relacionado aos tipos de mensagens.

🗑️ Remoções

Removido arquivo .bat que estava sem funcionalidade.

Removido código legado de migração de mensagens.

📅 Data de Lançamento: [05/09/2025]

📌 Patch Notes - Versão 0.0.7
✨ Novidades

Adicionado suporte para trocar de idiomas pela GUI.

Implementado sistema de lembretes:

Envia mensagens automáticas no grupo quando faltar 5 dias e 3 dias para o evento.

Utiliza o novo tipo de mensagem "reminder".

Mensagens são enviadas às 09:00 (horário de Brasília).

Novo message type "audio_invite".

Adicionada opção de incluir um áudio no final do texto de convite para o grupo.

Adicionado novo message type "reminder" para suporte ao sistema de lembretes.

🛠️ Melhorias

Sincronizadas as funções do GUI e CLI através do client.js.

Refatorado o messageController para separar lógica do CLI e do GUI.

Refatorado o indicadoresController para separar lógica do CLI e do GUI.

Refatorado o modoDevController para separar lógica do CLI e do GUI.

🐛 Correções

Corrigido bug que impedia os logs de aparecer no console da GUI.

Corrigido bug no menu de horários, que não estava trazendo os últimos horários cadastrados.

🗑️ Remoções

Removido o texto “opcional” dos CRUDs.

📅 Data de Lançamento: [18/09/2025]

📌 Patch Notes - Versão 0.0.8

✨ Novidades

Agora é possível navegar pelo terminal enquanto o bot continua executando em segundo plano, tanto na versão GUI quanto na CLI, trazendo mais liberdade e praticidade durante o uso.

Implementada a nova funcionalidade de disparo de mensagens privadas chamada "Drone", expandindo as possibilidades de comunicação automatizada.

Adicionado um novo tipo de mensagem "drone", utilizado exclusivamente pela nova função do sistema.

Incluída nova tela dedicada ao Drone na interface GUI, oferecendo uma forma intuitiva de gerenciar disparos.

Incluída nova tela dedicada ao Drone na interface CLI, permitindo o uso completo da funcionalidade também em modo terminal.

📦 Como o Drone funciona:
O Drone é responsável por enviar automaticamente mensagens do tipo "drone" cadastradas no sistema. Ele exige que o bot esteja conectado para funcionar corretamente.

Os números de destino podem ser cadastrados manualmente ou importados por meio de arquivos .txt ou .csv. e precisam seguir o seguinte formato: DDD+número

Após a confirmação do disparo, o Drone envia as mensagens com intervalo aleatório entre 3 e 10 segundos.

As mensagens são enviadas em lotes de até 200 envios, seguidos de uma pausa automática de 1 a 3 minutos antes de continuar o processo.

O ciclo se repete até que todas as mensagens cadastradas sejam enviadas.

🛠️ Melhorias

[Nenhuma melhoria registrada nesta versão]

🐛 Correções

[Nenhuma correção registrada nesta versão]

📅 Data de Lançamento: [02/10/2025]

📌 Patch Notes - Versão 0.0.9

✨ Novidades

Adicionada a possibilidade de editar o arquivo CSV importado diretamente no sistema, trazendo mais flexibilidade no preparo dos disparos pelo Drone.
As novas opções de edição incluem:

Adicionar DDD automaticamente aos números.

Adicionar prefixo do país (código internacional).

Adicionar 9º dígito aos números que estiverem sem ele.

O sistema agora utiliza o nome da planilha do arquivo CSV para personalizar as mensagens.

Caso o campo esteja vazio, o sistema continuará usando a variável {{nome}}.

Se {{nome}} também não estiver definido, será usado o nome da conta do WhatsApp do destinatário.

🛠️ Melhorias

Ajustes gerais no processo de leitura e tratamento de arquivos CSV, melhorando compatibilidade e desempenho.

🐛 Correções

Adicionado colchetes entre algumas datas do changelog que estavam faltando.

⚙️ Alterações e Remoções

Removido o suporte a arquivos TXT na função Drone dentro da interface GUI.

Removida a opção de adicionar números manualmente no GUI, mantendo agora apenas o fluxo via importação de arquivos CSV.


📅 Data de Lançamento: [13/10/2025]

📌 Patch Notes - Versão 0.0.10

✨ Novidades

Novo tipo de mensagem: social_link
Agora o sistema pode enviar mensagens do tipo social_link ao final do fluxo de processo ou junto ao FAQ.
Caso nenhum link social esteja cadastrado, nenhuma mensagem será enviada.

🛠️ Melhorias

Modularização do nameHandler
O componente nameHandler foi reestruturado e dividido em múltiplos módulos dentro da nova pasta nameHandlerModules.
Essa mudança melhora a organização do código e facilita futuras manutenções e expansões.

🐛 Correções

Nenhuma correção registrada nesta versão.

📅 Data de Lançamento: [15/10/2025]

📌 Patch Notes - Versão 0.0.11

✨ Novidades

Integração com banco de dados para o Drone
O sistema agora utiliza um banco de dados para armazenar e gerenciar informações relacionadas aos disparos realizados.
Foram adicionados novos recursos de resumo, incluindo:

Quantidade de números a enviar

Quantidade de números que falharam no envio

Estimativa de batches

Total de números adicionados

Opção para limpar números já enviados ou que falharam

Exibição percentual de números enviados, pendentes e com falha

🛠️ Melhorias

Novo diretório para ícone do Jubileu
Criada uma pasta dedicada para armazenar o ícone do Jubileu, melhorando a organização dos recursos visuais.

Ajustes no package.json
Corrigidas e ajustadas as configurações do package.json para permitir a geração de build de forma adequada.

🐛 Correções

Nenhuma correção registrada nesta versão.

📅 Data de Lançamento: [24/10/2025]

📌 Patch Notes - Versão 0.0.12

✨ Novidades

Nenhuma nova funcionalidade adicionada nesta versão.

🛠️ Melhorias

Modularização do initialize
O processo de inicialização foi separado em módulos, facilitando a manutenção e o entendimento do fluxo de inicialização do sistema.

Modularização do droneControllerGui
O módulo responsável pela interface do drone foi reorganizado em componentes independentes, melhorando a legibilidade e a escalabilidade do código.

Atualização do botão “Conectado”
O botão agora reflete dinamicamente o estado real de conexão, garantindo um feedback visual mais preciso para o usuário.

🐛 Correções

Erro de banco de dados corrigido:
Resolvido o problema SQLITE_CANTOPEN: unable to open database file, que impedia o acesso adequado ao banco de dados em alguns casos.

📅 Data de Lançamento: [03/11/2025]

📌 Patch Notes - Versão 0.0.13

✨ Novidades

Modularização do messageControllerGui, deixando o código mais organizado e fácil de manter.

🛠️ Melhorias

Removido código duplicado relacionado à criação da pasta de áudio, reduzindo redundância e prevenindo erros futuros.

Sistema de conexão aprimorado para evitar falhas quando uma conta é desvinculada do sistema.

Atualizada a lib do WhatsApp Web para garantir mais estabilidade na comunicação e no fluxo geral.

Removido estatisticas redundantes no Drone, centralizando tudo na aba "Status"

🐛 Correções

Corrigido o problema que impedia o envio de mensagens de áudio.

Ajustes internos na licença para manter o projeto alinhado com as normas de uso.

📅 Data de Lançamento: [18/11/2025]

📌 Patch Notes - Versão 0.0.14

✨ Novidades
Adicionada a capacidade de múltiplas instâncias tanto para o Jubileu quanto para o Pare Seu Drone.

Adicionada a variável {{primeiroNome}} para uso no tipo de mensagem GROUP_MULTI_INVITE.

🛠️ Melhorias
Atualizada a documentação de preenchimento de mensagens para maior clareza.

Removido o sistema de modo single, com o sistema passando a operar exclusivamente em modo multi.

Removido o sistema de cidade primária da interface gráfica, tornando-o irrelevante após a remoção do modo single.

Removido o tipo de mensagem GROUP_SINGLE_INVITE.

🐛 Correções
Corrigido bug no configPreload.

Corrigido bug que impedia o uso dos campos de texto após a exclusão de uma cidade ou mensagem.

Corrigido problema onde, ao atualizar uma cidade, o botão não retornava ao estado padrão de salvar.

Corrigido bug que fazia o botão "Limpar" não funcionar corretamente.

📅 Data de Lançamento: [06/01/2026]

📌 Patch Notes - Versão 0.0.15

✨ Novidades

- Adicionado botão de limpar cache
- Implementado dark mode no sistema
- Adicionado limite de 2 mensagens no sistema anti-spam
- Adicionado sistema de Dee Jay

🛠️ Melhorias

- Modularizado `drone.css` para melhor organização e manutenibilidade
- Removidas funções deprecated do `numberManagementDSM.js`

🐛 Correções

- Corrigido botão "atualizar mensagem" que não retornava ao estado padrão "salvar mensagem" após a operação
- Corrigido bug do comando ajuda que não enviava fallback
- Corrigido bug do dark mode onde o texto ficava ilegível

---

📌 Patch Notes - Versão 1.3.0

✨ Novidades
    Adicionado botão de update.

🛠️ Melhorias
    [Nenhuma melhoria registrada nesta versão.]

🐛 Correções
    Corrigido bug visual do dark mode.

📅 Data de Lançamento: [29/01/2026]

---

📌 Patch Notes - Versão 1.3.1

✨ Novidades
Implementada detecção automática do Chrome para agilizar a conexão.

Adicionado botão do CRM (funcionalidade em desenvolvimento).

🛠️ Melhorias
Atualizado o comportamento do botão de atualizar.

Desabilitado o fallback de timeout para evitar conflitos.

🐛 Correções
Corrigido problema que permitia ao bot postar no status do WhatsApp.

Corrigido bug nos campos que não estavam respeitando o dark mode.

📅 Data de Lançamento: [03/02/2026]

---

📌 Patch Notes - Versão 1.3.2

✨ Novidades
Adicionada mensagem de boas-vindas ao CRM (crm_welcome).

Adicionada mensagem de dicas ao CRM (crm_tips).

🛠️ Melhorias
[Nenhuma melhoria registrada nesta versão.]

🐛 Correções
Corrigido erro de visualização na completude durante o modo dark.

Corrigido erro de visualização na data de última atualização durante o modo dark.

📅 Data de Lançamento: [16/02/2026]

---

📌 Patch Notes - Versão 1.3.3

✨ Novidades
[Nenhuma nova funcionalidade adicionada nesta versão.]

🛠️ Melhorias
Atualizada a lógica do botão de update.

🐛 Correções
Corrigido o botão de update.

📅 Data de Lançamento: [17/02/2026]

---

📌 Patch Notes - Versão 1.3.4

✨ Novidades
Adicionada a nova interface "Goat".
Implementados comandos de teclado na tela Goat para exibição de respostas rápidas:
- **Q**: 🙁 🔴
- **W**: 😐 🔵
- **E**: 🤩 🟢
- **R**: De novo 🔙
Implementado delay automático para a exibição em tela dos comandos (15 segundos) antes de retornar ao estado original.

🛠️ Melhorias
Adicionado background customizado (identidade Dilson Stein) e estilo translúcido aos atalhos exibidos em tela para a tela Goat.

🐛 Correções
[Nenhuma correção registrada nesta versão.]

📅 Data de Lançamento: [23/02/2026]

---

📌 Patch Notes - Versão 1.3.5

✨ Novidades
[Nenhuma nova funcionalidade adicionada nesta versão.]

🛠️ Melhorias
Refatoramento da Atualização (botão Update)

🐛 Correções
[Nenhuma correção registrada nesta versão.]

📅 Data de Lançamento: [23/02/2026]

---

📌 Patch Notes - Versão 1.3.6

✨ Novidades

[Nenhuma nova funcionalidade adicionada nesta versão.]

🛠️ Melhorias
Otimizado processo de compilação do executável (`artifactName`) para gerar arquivos sem espaços, compatibilizando com as exigências web para download de atualizações automáticas.

Adicionada configuração (`publish`) no repositório GitHub para viabilizar a criação automática de metadados de release (`latest.yml`).

🐛 Correções

Corrigido problema (HttpError: 404) que impedia a rotina do botão de Update de encontrar e baixar as novas versões em instalações Windows.

📅 Data de Lançamento: [23/02/2026]

---

📌 Patch Notes - Versão 1.3.7

✨ Novidades

[Nenhuma nova funcionalidade adicionada nesta versão.]

🛠️ Melhorias
- Adicionado placeholder no botão "De novo" da tela Goat.
- Adicionada a instância do CRM na rotina de limpeza de cache.
- Removido o arquivo de entrada legado `app.js`.
- Removido o arquivo de utilitários `displayUtils.js`.
- Removido o arquivo de utilitários `messageUtils.js`.

🐛 Correções

- Corrigido o erro `TargetCloseError` no módulo Drone.
- Corrigido o bug de instâncias do Drone

📅 Data de Lançamento: [12/03/2026]

---

📌 Patch Notes - Versão 1.3.8
✨ Novidades
[Nenhuma nova funcionalidade adicionada nesta versão.]

🛠️ Melhorias
[Nenhuma nova funcionalidade adicionada nesta versão.]

🐛 Correções

- Corrigido o bug que impedia o disparo de mensagens no modo multi-instância.


📅 Data de Lançamento: [13/03/2026]

---

📌 Patch Notes - Versão 1.3.9

✨ Novidades

- Adicionado o Manifesto no CRM, sistema de criação de PDF a partir de textos cadastrados.

- Adicionadas teclas de atalho e barra de ferramentas flutuante.

- Criado o módulo Sentinela.

🛠️ Melhorias

- Atualizado o `appLifeCycle.js` para garantir que a aplicação possua um Cleanup timeout adequado.

- Refatorado o GOAT: removidas as teclas de atalho, substituídas por um RGB que pisca em intervalos de 1 segundo.

🐛 Correções
[Nenhuma correção registrada nesta versão.]

📅 Data de Lançamento: [22/04/2026]

---

📌 Patch Notes - Versão 1.4.0

✨ Novidades
[Nenhuma nova funcionalidade adicionada nesta versão.]

🛠️ Melhorias
- Refatorado Drone, otimizado os processos, modificado a UI, trocado a lógica para ultilizar todas as instancias simultaneamente e de forma aleatória.
- Refatorado ipc manager atribuido responsabilidade de gerenciar canais para os respectivos arquivos.

🐛 Correções
[Nenhuma correção registrada nesta versão.]

📅 Data de Lançamento: [30/04/2026]

---

📌 Patch Notes - Versão 1.4.1

✨ Novidades
- Adicionado botão de excluir todas as instâncias no Jubileu, Drone, CRM e Dee Jay.

🛠️ Melhorias
- Aumentado o número máximo de instâncias de 5 para 30.

🐛 Correções
[Nenhuma correção registrada nesta versão.]

📅 Data de Lançamento: [12/05/2026]

---

📌 Patch Notes - Versão 1.4.2

✨ Novidades
[Nenhuma novidade registrada nesta versão.]

🛠️ Melhorias
- Ativado o empacotamento ASAR (asar: true) para condensar os milhares de arquivos soltos em um único arquivo, mitigando problemas de bloqueio de pasta no Windows.
- Otimização do instalador: implementada macro NSIS (`customInit`) para forçar o encerramento do Jubileu Bot e seus processos filhos (Chromium, Puppeteer) de forma silenciosa antes de sobrepor a instalação.

🐛 Correções
- Corrigido erro "Não é possível fechar o Jubileu Bot" durante a atualização da aplicação. Os diretórios de dados de runtime (`deeJayService`, `crmService`, `groupService`, e limpador de cache) foram migrados de `resources/app` para o diretório correto do usuário (`userData`), evitando o bloqueio de pastas por processos abertos.
- Corrigido problema de case-sensitivity no carregamento do `AppLifecycle` no módulo principal (`main.js`) evidenciado pela ativação do ASAR.

📅 Data de Lançamento: [21/05/2026]

---

📌 Patch Notes - Versão 1.4.3

✨ Novidades
[Nenhuma novidade registrada nesta versão.]

🛠️ Melhorias
[Nenhuma melhoria registrada nesta versão.]

🐛 Correções
- Fix da instabilidade do drone com 4 ou mais instâncias.
- Corrigidos problemas de case sensitive do asar.

📅 Data de Lançamento: [26/05/2026]

---

📌 Patch Notes - Versão 1.4.4

✨ Novidades
- **Vínculo de Instâncias no Dee Jay**: Implementada a integração das instâncias ativas do Jubileu e do Drone ao serviço do Dee Jay, permitindo rodar fluxos de conversas automáticas e interativas entre as instâncias vinculadas.
- **Suporte a Figurinhas (Stickers) no Dee Jay**: Adicionado envio automático de figurinhas (com 15% de probabilidade) nas mensagens, utilizando URLs públicas pré-configuradas e convertidas via mídias do WhatsApp.
- **Exibição Dinâmica de Versão**: Adicionado indicador visual no canto superior esquerdo da tela principal que exibe de forma dinâmica a versão atual da aplicação (carregada via processo principal IPC a partir do `package.json`).
- **Exclusão em Lote no Dee Jay**: Adicionado botão "Excluir Todas" com modal de confirmação para remover todas as instâncias do Dee Jay simultaneamente.
- **Documentação de Atualização**: Criado o documento explicativo `docs/processo_de_atualizacao.md` contendo detalhes técnicos sobre empacotamento ASAR e fluxo de updates em produção e desenvolvimento.

🛠️ Melhorias
- **Configuração Persistente e Silenciosa**: Implementado salvamento automático e em segundo plano ao ativar/desativar o vínculo com Jubileu/Drone na interface do Dee Jay, evitando alertas pop-up intrusivos.
- **Robustez na Resolução de Números**: Melhorado o método de obtenção do número de telefone em instâncias conectadas, consultando dinamicamente `client.info` caso haja atrasos ou dessincronização no cache de status.

🐛 Correções
- **Prevenção de Loops Infinitos**: Criado filtro de descarte antecipado que impede auto-respostas e loops infinitos no chatbot ao identificar se o remetente de uma mensagem recebida pertence a uma de nossas instâncias ativas (Jubileu, Drone ou Dee Jay).
- **Prevenção de Auto-Mensagens**: Ajustado o loop de conversas do Dee Jay para evitar o envio de mensagens para o mesmo número (remetente e destinatário idênticos), pulando o ciclo com segurança se nenhum par distinto for encontrado.
- **Diretório de Sessões do Drone**: Corrigido o caminho relativo das sessões em ambiente de desenvolvimento, que fazia a pasta `.wwebjs_auth_drone` ser criada fora da pasta do projeto (na pasta pai `Github/`). Agora, as sessões do Drone são salvas corretamente na raiz do projeto (`Jubileu/`).
- **Limpeza de Cache do Drone**: Integrado o encerramento automático das instâncias do Drone e a remoção da pasta `.wwebjs_auth_drone` (ou `whatsapp-sessions-drone` no build de produção) ao utilizar a rotina de limpar cache.

📅 Data de Lançamento: [02/07/2026]

---

📌 Patch Notes - Versão 1.4.5

✨ Novidades
[Nenhuma novidade registrada nesta versão.]

🛠️ Melhorias
[Nenhuma melhoria registrada nesta versão.]

🐛 Correções
- **Mapa do Sentinela**: Corrigido o erro que impedia a renderização do mapa do Sentinela devido à ausência do arquivo `brazil-states.json`. A regra do `.gitignore` que ignorava qualquer diretório `data/` em qualquer nível foi ajustada para `/data/` (ancorada na raiz), permitindo que a pasta `renderer/data/` e o arquivo do mapa fossem rastreados corretamente.
- **Auto-Updater**: Refatorada a lógica do atualizador automático. Para evitar conflitos de processos bloqueados no Windows, a limpeza completa das instâncias ativas (`cleanup()`) é realizada antes de iniciar o instalador. O instalador é executado em modo destacado (`child_process.spawn` com `detached: true`), e o aplicativo principal é encerrado imediatamente com `app.exit(0)`, evitando que o processo de cleanup em segundo plano cause um atraso que fazia o instalador abortar a execução.

📅 Data de Lançamento: [05/07/2026]