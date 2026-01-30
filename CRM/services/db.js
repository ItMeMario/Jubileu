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

    getMessageByType(type) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM messages WHERE message_type = ?', [type], (err, row) => {
                if (err) reject(err);
                else resolve(row);
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
    // Schema Introspection
    getAllTables() {
        return new Promise((resolve, reject) => {
            this.db.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name", [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows.map(row => row.name));
            });
        });
    }

    getTableInfo(tableName) {
        return new Promise((resolve, reject) => {
            this.db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getTableCounts() {
        return new Promise(async (resolve, reject) => {
            try {
                const tables = await this.getAllTables();
                const counts = {};

                if (tables.length === 0) {
                    resolve(counts);
                    return;
                }

                let completed = 0;
                tables.forEach(table => {
                    this.db.get(`SELECT COUNT(*) as count FROM ${table}`, [], (err, row) => {
                        counts[table] = err ? "Erro" : row.count;
                        completed++;
                        if (completed === tables.length) {
                            resolve(counts);
                        }
                    });
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    // Mock implementation for compatibility with Jubileu's renderer
    getPrimaryCity() {
        return Promise.resolve(null);
    }

    async getDatabaseOverview() {
        try {
            const tables = await this.getAllTables();
            const counts = await this.getTableCounts();
            const primaryCity = await this.getPrimaryCity();

            const dbPath = path.join(__dirname, '../data/crm.sqlite');
            const stats = fs.statSync(dbPath);
            
            const totalRecords = Object.values(counts).reduce((total, count) => {
                 return total + (typeof count === 'number' ? count : 0);
            }, 0);

            const databaseInfo = {
                path: dbPath,
                size: Math.round((stats.size / 1024) * 100) / 100,
                sizeFormatted: `${Math.round((stats.size / 1024) * 100) / 100} KB`,
                created: stats.birthtime.toLocaleString("pt-BR"),
                modified: stats.mtime.toLocaleString("pt-BR"),
                totalTables: tables.length,
                totalRecords: totalRecords,
                type: "SQLite Database",
                version: "3.x"
            };

            return {
                database: databaseInfo,
                tables: tables,
                tableCounts: counts,
                primaryCity: primaryCity,
                summary: {
                    totalTables: tables.length,
                    totalRecords: totalRecords,
                    hasPrimaryCity: !!primaryCity
                }
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new DatabaseService();
