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

📅 Data de Lançamento: [28/08/2025]
