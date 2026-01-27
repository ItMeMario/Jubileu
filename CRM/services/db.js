const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseService {
    constructor() {
        // Ensure data directory exists
        const dataDir = path.join(__dirname, '../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        const dbPath = path.join(dataDir, 'crm.sqlite');
        this.db = new sqlite3.Database(dbPath);
        this.init();
    }

    init() {
        // Create messages table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                locale TEXT NOT NULL,
                message_type TEXT NOT NULL,
                message_content TEXT
            )
        `);

        // Create config table for dev mode and scout
        this.db.run(`
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);
    }

    // Messages
    getMessages() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT * FROM messages', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    addMessage(locale, type, content) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT INTO messages (locale, message_type, message_content) VALUES (?, ?, ?)', [locale, type, content], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, locale, type, content });
            });
        });
    }

    updateMessage(id, locale, type, content) {
         return new Promise((resolve, reject) => {
            this.db.run('UPDATE messages SET locale = ?, message_type = ?, message_content = ? WHERE id = ?', [locale, type, content, id], function(err) {
                if (err) reject(err);
                else resolve({ id, locale, type, content });
            });
        });
    }

    deleteMessage(id) {
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM messages WHERE id = ?', [id], function(err) {
                 if (err) reject(err);
                 else resolve({ id });
            });
        });
    }

    // Config (Dev Mode, Scout, Locale)
    getConfig(key) {
        return new Promise((resolve, reject) => {
             this.db.get('SELECT value FROM config WHERE key = ?', [key], (err, row) => {
                 if (err) reject(err);
                 else resolve(row ? row.value : null);
             });
        });
    }

    setConfig(key, value) {
        return new Promise((resolve, reject) => {
            this.db.run('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)', [key, value], function(err) {
                if (err) reject(err);
                else resolve({ key, value });
            });
        });
    }
}

module.exports = new DatabaseService();
