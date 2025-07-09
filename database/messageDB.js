const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class MessageDB {
    constructor() {
        // Configuração mais robusta do banco de dados
        this.db = new sqlite3.Database(
            path.join(__dirname, 'messages.db'),
            sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
            (err) => {
                if (err) {
                    console.error('Erro ao abrir o banco de dados:', err.message);
                }
            }
        );
        
        // Adiciona tratamento de erros
        this.db.on('error', (err) => {
            console.error('Erro no banco de dados:', err.message);
        });
        
        this.initializeDB();
    }

    async initializeDB() {
        try {
            await this.runQuery(`
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_default BOOLEAN DEFAULT 0
                )
            `);
            
            // Cria índice para melhor performance
            await this.runQuery('CREATE INDEX IF NOT EXISTS idx_default ON messages(is_default)');
        } catch (err) {
            console.error('Erro ao inicializar banco de dados:', err.message);
        }
    }

    // Método genérico para executar queries
    async runQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    // Método genérico para buscar dados
    async fetchQuery(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async saveMessage(content) {
        try {
            const result = await this.runQuery(
                'INSERT INTO messages (content) VALUES (?)',
                [content]
            );
            return result.lastID;
        } catch (err) {
            console.error('Erro ao salvar mensagem:', err.message);
            throw err;
        }
    }

    async getLastMessages(limit = 3) {
        try {
            return await this.fetchQuery(
                'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?',
                [limit]
            );
        } catch (err) {
            console.error('Erro ao buscar últimas mensagens:', err.message);
            return [];
        }
    }

    async getAllMessages() {
        try {
            return await this.fetchQuery(
                'SELECT * FROM messages ORDER BY created_at DESC'
            );
        } catch (err) {
            console.error('Erro ao buscar todas mensagens:', err.message);
            return [];
        }
    }

    async getMessageById(id) {
        try {
            const messages = await this.fetchQuery(
                'SELECT * FROM messages WHERE id = ? LIMIT 1',
                [id]
            );
            return messages[0] || null;
        } catch (err) {
            console.error('Erro ao buscar mensagem por ID:', err.message);
            return null;
        }
    }

    async getDefaultMessage() {
        try {
            const messages = await this.fetchQuery(
                'SELECT * FROM messages WHERE is_default = 1 LIMIT 1'
            );
            return messages[0] || null;
        } catch (err) {
            console.error('Erro ao buscar mensagem padrão:', err.message);
            return null;
        }
    }

    async setDefaultMessage(id) {
        try {
            // Inicia uma transação
            await this.runQuery('BEGIN TRANSACTION');
            
            // Remove qualquer mensagem padrão existente
            await this.runQuery(
                'UPDATE messages SET is_default = 0 WHERE is_default = 1'
            );
            
            // Define a nova mensagem como padrão
            await this.runQuery(
                'UPDATE messages SET is_default = 1 WHERE id = ?',
                [id]
            );
            
            // Comita a transação
            await this.runQuery('COMMIT');
            
            return true;
        } catch (err) {
            // Reverte em caso de erro
            await this.runQuery('ROLLBACK');
            console.error('Erro ao definir mensagem padrão:', err.message);
            throw err;
        }
    }

    async updateMessage(id, content) {
        try {
            await this.runQuery(
                'UPDATE messages SET content = ? WHERE id = ?',
                [content, id]
            );
            return true;
        } catch (err) {
            console.error('Erro ao atualizar mensagem:', err.message);
            throw err;
        }
    }

    async messageCount() {
        try {
            const result = await this.fetchQuery(
                'SELECT COUNT(*) as count FROM messages'
            );
            return result[0].count;
        } catch (err) {
            console.error('Erro ao contar mensagens:', err.message);
            return 0;
        }
    }

    close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('Erro ao fechar banco de dados:', err.message);
                }
                resolve();
            });
        });
    }
}

// Teste de conexão ao iniciar
const dbInstance = new MessageDB();

// Verifica a conexão com o banco de dados
dbInstance.db.get("SELECT name FROM sqlite_master WHERE type='table'", (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
    } else {
        console.log('Conexão com o banco de dados estabelecida com sucesso');
    }
});

module.exports = dbInstance;