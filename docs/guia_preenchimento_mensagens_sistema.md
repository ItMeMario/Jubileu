# 📘 Guia de Preenchimento das Mensagens do Sistema

Este documento descreve cada mensagem do sistema, explicando quando ela aparece, quais variáveis utiliza e o texto exibido.

## 1. CITY_MENU

Descrição: Exibida quando há cidades disponíveis para seleção.
 Variáveis:

{{cityCount}} → Quantidade de cidades disponíveis.

{{cityList}} → Lista de cidades disponíveis.

Mensagem:

Estamos com seleções abertas em {{cityCount}} cidades neste momento: 🏙

{{cityList}}

✨ Em qual dessas cidades você gostaria de estar participando?

## 2. WELCOME

Descrição: Mensagem de boas-vindas ao usuário.
 Variáveis:

{{name}} → Nome do usuário.

Mensagem:

Olá {{name}}! Tudo bem?

## 3. NAME_MENU

Descrição: Confirmação após o usuário escolher o horário.
 Variáveis:

{{horario}} → Horário escolhido.

{{descricao}} → Descrição do horário.

Mensagem:

Você escolheu *{{horario}} - {{descricao}}*.

Agora digite somente o seu *NOME COMPLETO* para confirmar a sua inscrição, por favor!😊

## 4. CITY_ERROR

Descrição: Mensagem exibida quando o usuário digita uma cidade inválida.
 Variáveis:

{{cityList}} → Lista de cidades disponíveis.

Mensagem:

🤔 Ops, cidade não encontrada! Parece que essa cidade não está na nossa lista ou houve um errinho de digitação.

🏠 *Cidades disponíveis:*

{{cityList}}

💡 Você pode digitar: •

O *número* da cidade (1, 2, 3...)

• O *nome completo* (São Paulo, Joinville...)

• Parte do nome (São, Join...)

E se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.

Tente novamente! 😊

## 5. GROUP_MULTI_INVITE

Descrição: Enviado quando há múltiplos grupos disponíveis para o usuário.
 Variáveis:

{{nomeCompleto}}

{{primeiroNome}}

{{dataEvento}}

{{groupLink}}

{{horarioSelecionado}}

{{cityName}}

Mensagem:

✅ Parabéns, *{{nomeCompleto}}*! A sua presença está confirmada!{{dataEvento}}

{{groupLink}}

⏰ Seu horário: *{{horarioSelecionado}}* 😄

Aqui está o acesso para o grupo de {{cityName}}:

*Clique no link para participar!*

## 6. ALREADY_IN_GROUP

Descrição: Enviado quando o usuário já está no grupo.
 Variáveis:

{{nomeCompleto}}

{{cityName}}

Mensagem:

ℹ️ Olá *{{nomeCompleto}}*! Você já está participando do grupo {{cityName}}. Não é necessário entrar novamente! 😊

## 7. GROUP_ERROR

Descrição: Erro ao enviar os links do grupo.
 Variáveis: Nenhuma.

Mensagem:

⚠ ️ Ocorreu um erro ao enviar o(s) link(s) do grupo. Por favor, tente novamente mais tarde.

## 8. TIMEOUT

Descrição: Enviado quando o usuário demora para responder.
 Variáveis:

{{name}}

Mensagem:

Oi *{{name}}*, eu percebi seu interesse em participar da seleção... Digite *MENU* para fazer a sua inscrição e garantir a sua vaga.

## 9. UNSUPORTED_AUDIO

Descrição: Quando o usuário envia áudio.
 Variáveis: Nenhuma.

Mensagem:

🎵 Desculpe, não consigo escutar áudios! 😅

Por favor, digite sua mensagem por texto para que eu possa te ajudar melhor. 📝

Se precisar de ajuda, digite *AJUDA* ou *FAQ*! 😊

## 10. UNSUPORTED_VIDEO

Descrição: Quando o usuário envia vídeo.
 Variáveis: Nenhuma.

Mensagem:

🎥 Desculpe, não consigo visualizar vídeos! 😅

Por favor, digite sua mensagem por texto para que eu possa te ajudar melhor. 📝

## 11. UNSUPORTED_DOCUMENT

Descrição: Quando o usuário envia documento.
 Variáveis: Nenhuma.

Mensagem:

📄 Desculpe, não consigo abrir documentos! 😅

Por favor, digite sua mensagem por texto para que eu possa te ajudar melhor. 📝

## 12. UNSUPORTED_STICKER

Descrição: Quando o usuário envia figurinha.
 Variáveis: Nenhuma.

Mensagem:

😄 Que figurinha legal! Mas preciso que você digite sua mensagem por texto para que eu possa te ajudar. 📝

## 13. UNSUPORTED_EMOJI

Descrição: Quando o usuário envia apenas emoji.
 Variáveis: Nenhuma.

Mensagem:

😄 Emoji legal! Mas preciso que você digite sua resposta em texto para que eu possa te ajudar. 📝

## 14. TIME_MENU

Descrição: Exibe lista de horários disponíveis.
 Variáveis: Nenhuma (texto fixo).

Mensagem:

⚠ *IMPORTANTE: Escolha seu horário:*

Horarios disponíveis:

1️⃣ - 10:00h (Manhã)

2️⃣ - 12:00h (Meio-dia)

3️⃣ - 15:30h (Tarde)

4️⃣ - 17:30h (Final da tarde)

5️⃣ - 19:30h (Noite)

## 15. TIME_ERROR

Descrição: Quando o usuário digita um horário inválido.
 Variáveis: Nenhuma.

Mensagem:

🤔 Desculpe, horário não reconhecido. Digite apenas o horário que você escolheu.

E se precisar de ajuda, digite a palavra *AJUDA* ou *FAQ* que vou te enviar a lista com as dúvidas mais comuns sobre a nossa seleção.

## 16. SUSPEND

Descrição: Solicita detalhes adicionais quando não entende a mensagem.
 Variáveis: Nenhuma.

Mensagem:

Oi! 😊 Poderia me explicar, por gentileza, com detalhes por escrito a sua questão? Assim que possível, te respondo. Obrigado! 🙏

## 17. SUSPENDED

Descrição: Mensagem de espera.
 Variáveis: Nenhuma.

Mensagem:

Por favor, aguarde. Responderei assim que possível. ⏳

Atenciosamente

## 18. SEND_FAQ

Descrição: Responde ao usuário com a lista de dúvidas frequentes.

📚 Perguntas Frequentes (FAQ)

Como faço para me cadastrar?

- Basta digitar "menu" e seguir as instruções

Quais são os horários disponíveis?

- Os horários disponíveis se encontram nas instruções

Posso mudar meu horário depois?

- Claro que pode, basta falar conosco

Posso levar acompanhante?

- Com certeza! Pai e Mãe, incentivamos a participação da família

Menor de idade pode participar?

- Sim! Desde que esteja acompanhado de um responsável legal

É permitido o uso de maquiagem?

- Sim! Mas em pouca quantidade, excessos podem prejudicar a avaliação

Vou me tornar modelo automaticamente ao participar da seleção?

- Você estará participando da seleção, e poderá haver uma chance, mas não há como prometer resultados. Tudo depende do seu perfil e das necessidades do momento.

Quem é Dilson Stein?

- A empresa atua no mercado desde 1985 com o mesmo nome e descobriu nomes como: Gisele Bündchen, Alessandra Ambrósio, Carol Trentini, Jonas Sulzbach e Daiane Sodré.

Já faço parte do portal?

- O evento presencial é uma programação diferente do portal e dos cursos online. Será tudo novidade.

Posso participar se tiver tatuagem, cabelo colorido, aparelho dentário ou usar óculos?

- Sim! Tatuagens, cabelos tingidos, aparelhos ortodônticos e óculos não impedem sua participação.

Tem limite de idade?

- Não há restrição de idade

Precisa de book?

- A finalidade do evento não é a comercialização de materiais fotográficos.

Você continua com dúvidas?

- MARQUE UM HORÁRIO AGORA MESMO e compareça na seleção! Haverá uma equipe para te orientar

Digite "menu" para voltar ao menu principal.

## 19. AUDIO_INVITE

Descrição:.Áudio que será enviado no final ao convidar para o grupo
 Variáveis: Nenhuma.

## 20. REMINDER

Descrição:.Mensagem que será mandada quando um evento estiver a 5 ou 3 dias, pode ser cadastrado mais de 1 o sistema irá escolher aleatóriamente entre as mensagens cadastradas sem repetir
 Variáveis: Nenhuma.

## 20. DRONE

Descrição:.Mensagem que pode ser usada para ser disparada para os clientes quando quiser

Variáveis: {{name}}.
