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