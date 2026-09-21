// services/deeJayServiceModules/deeJayDb.js
const db = require("../../config/db");
const { SERVICE_STATUS } = require("../servicesModules/constants");

function dbGetAllDeeJayInstances() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM dee_jay_instances ORDER BY created_at ASC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbUpdateDeeJayInstanceStatus(instanceId, status, phoneNumber = null) {
    return new Promise((resolve, reject) => {
        let query = "UPDATE dee_jay_instances SET status = ?, updated_at = CURRENT_TIMESTAMP";
        let params = [status];

        if (phoneNumber) {
            query += ", phone_number = ?";
            params.push(phoneNumber);
        }

        if (status === SERVICE_STATUS.CONNECTED) {
            query += ", last_connected_at = CURRENT_TIMESTAMP";
        }

        query += " WHERE id = ?";
        params.push(instanceId);

        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

function dbResetAllDeeJayInstancesStatus() {
    return new Promise((resolve, reject) => {
        db.run(
            "UPDATE dee_jay_instances SET status = ?",
            [SERVICE_STATUS.DISCONNECTED],
            function(err) {
                if (err) reject(err);
                else {
                    console.log(`🔄 ${this.changes} instância(s) Dee Jay resetadas para disconnected`);
                    resolve(true);
                }
            }
        );
    });
}

async function getRandomDeeJayMessage() {
    return new Promise((resolve) => {
        db.get("SELECT message_content FROM dee_jay_messages ORDER BY RANDOM() LIMIT 1", [], (err, row) => {
            if (err) {
                console.error("Dee Jay: Erro ao buscar mensagem aleatória no banco:", err);
                resolve(null);
            } else {
                resolve(row ? row.message_content : null);
            }
        });
    });
}

function dbGetDeeJayMessages() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM dee_jay_messages ORDER BY id DESC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbAddDeeJayMessage(content) {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO dee_jay_messages (message_content) VALUES (?)", [content], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, message_content: content });
        });
    });
}

function dbDeleteDeeJayMessage(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM dee_jay_messages WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

function dbInsertDeeJayInstance(instanceId, name, status) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO dee_jay_instances (id, name, status) VALUES (?, ?, ?)",
            [instanceId, name, status],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function dbDeleteDeeJayInstance(instanceId) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM dee_jay_instances WHERE id = ?", [instanceId], function(err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    dbGetAllDeeJayInstances,
    dbUpdateDeeJayInstanceStatus,
    dbResetAllDeeJayInstancesStatus,
    getRandomDeeJayMessage,
    dbGetDeeJayMessages,
    dbAddDeeJayMessage,
    dbDeleteDeeJayMessage,
    dbInsertDeeJayInstance,
    dbDeleteDeeJayInstance
};
