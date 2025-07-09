const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'messages.db');
const db = new sqlite3.Database(dbPath);

// Criar tabela se não existir
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            is_default INTEGER DEFAULT 0
        )
    `);
});

function saveMessage(content) {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO messages (content) VALUES (?)');
        stmt.run(content, function (err) {
            if (err) return reject(err);
            resolve(this.lastID);
        });
        stmt.finalize();
    });
}

function setDefaultMessage(id) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run(`UPDATE messages SET is_default = 0`, (err) => {
                if (err) return reject(err);
                db.run(`UPDATE messages SET is_default = 1 WHERE id = ?`, [id], function (err2) {
                    if (err2) return reject(err2);
                    resolve();
                });
            });
        });
    });
}

function getLastMessages(limit) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM messages ORDER BY created_at DESC LIMIT ?`, [limit], (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function getAllMessages() {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM messages ORDER BY created_at DESC`, (err, rows) => {
            if (err) return reject(err);
            resolve(rows);
        });
    });
}

function getMessageById(id) {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM messages WHERE id = ?`, [id], (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function getLastMessage() {
    return new Promise((resolve, reject) => {
        db.get(`SELECT * FROM messages ORDER BY created_at DESC LIMIT 1`, (err, row) => {
            if (err) return reject(err);
            resolve(row);
        });
    });
}

function updateMessage(id, content) {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE messages SET content = ? WHERE id = ?`, [content, id], function (err) {
            if (err) return reject(err);
            resolve();
        });
    });
}

module.exports = {
    saveMessage,
    setDefaultMessage,
    getLastMessages,
    getAllMessages,
    getMessageById,
    getLastMessage,
    updateMessage
};
