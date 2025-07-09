const messageService = require('../services/messageService');
const inputHandler = require('../utils/inputHandler');
const { displayMenu, displayRecentMessages } = require('../utils/displayUtils');

class MessageController {
    constructor() {
        this.isRunning = true;
    }

    async start() {
        try {
            const lastMessages = await messageService.getLastMessages(3);
            await displayRecentMessages(lastMessages);
            await this.mainMenu();
        } catch (err) {
            console.error('❌ Erro ao iniciar o editor:', err.message);
        }
    }

    async mainMenu() {
        while (this.isRunning) {
            displayMenu();
            const option = await inputHandler.askQuestion('Escolha uma opção: ');

            switch (option) {
                case '1':
                    await this.createMessage();
                    break;
                case '2':
                    await this.editMessage();
                    break;
                case '3':
                    await this.pasteClipboard();
                    break;
                case '4':
                    await this.viewAll();
                    break;
                case '5':
                    await this.viewLast();
                    break;
                case '0':
                    this.exit();
                    break;
                default:
                    console.log('❌ Opção inválida.');
            }
        }
    }

    async createMessage() {
        const content = await inputHandler.getMultiLine('Digite a mensagem:');
        if (!content.trim()) {
            console.log('❌ Mensagem vazia não foi salva.');
            return;
        }

        const id = await messageService.saveMessage(content);
        await messageService.setDefaultMessage(id);
        console.log(`✅ Mensagem salva com ID ${id}.`);
    }

    async editMessage() {
        const all = await messageService.getAllMessages();
        if (all.length === 0) {
            console.log('ℹ️ Nenhuma mensagem encontrada.');
            return;
        }

        all.forEach(m => {
            console.log(`ID: ${m.id} | Conteúdo: ${m.content.slice(0, 30)}...`);
        });

        const id = await inputHandler.askQuestion('ID da mensagem para editar: ');
        const original = await messageService.getMessageById(parseInt(id));

        if (!original) {
            console.log('❌ Mensagem não encontrada.');
            return;
        }

        const newContent = await inputHandler.getMultiLine('Edite a mensagem:', original.content);
        if (!newContent.trim()) {
            console.log('❌ Mensagem vazia não foi salva.');
            return;
        }

        await messageService.updateMessage(original.id, newContent);
        console.log('✅ Mensagem atualizada.');
    }

    async pasteClipboard() {
        const content = await messageService.readFromClipboard();
        console.log(`Conteúdo do clipboard:\n${content}`);
        const confirm = await inputHandler.askQuestion('Usar essa mensagem? (y/n): ');

        if (confirm.toLowerCase() !== 'y') {
            console.log('❌ Cancelado.');
            return;
        }

        const id = await messageService.saveMessage(content);
        await messageService.setDefaultMessage(id);
        console.log(`✅ Mensagem salva com ID ${id}.`);
    }

    async viewAll() {
        const all = await messageService.getAllMessages();
        if (all.length === 0) {
            console.log('ℹ️ Nenhuma mensagem encontrada.');
            return;
        }

        all.forEach(msg => {
            console.log(`ID: ${msg.id} | Criada: ${new Date(msg.created_at).toLocaleString()}`);
            console.log(`→ ${msg.content.slice(0, 100)}\n`);
        });
    }

    async viewLast() {
        const msg = await messageService.getLastMessage();
        if (!msg) {
            console.log('ℹ️ Nenhuma mensagem encontrada.');
            return;
        }

        console.log(`Última mensagem [ID ${msg.id}]:`);
        console.log(msg.content);
    }

    exit() {
        console.log('✅ Encerrando...');
        this.isRunning = false;
    }
}

module.exports = MessageController;
