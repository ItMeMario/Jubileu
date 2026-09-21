// services/droneServiceModules/droneDb.js
const db = require("../../config/db");
const { SERVICE_STATUS } = require("../servicesModules/constants");

function dbGetAllDroneInstances() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM drone_instances ORDER BY created_at ASC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbUpdateDroneInstanceStatus(instanceId, status, phoneNumber = null) {
    return new Promise((resolve, reject) => {
        let query = "UPDATE drone_instances SET status = ?, updated_at = CURRENT_TIMESTAMP";
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

function dbResetAllDroneInstancesStatus() {
    return new Promise((resolve, reject) => {
        db.run(
            "UPDATE drone_instances SET status = ?",
            [SERVICE_STATUS.DISCONNECTED],
            function(err) {
                if (err) reject(err);
                else {
                    console.log(`🔄 ${this.changes} instância(s) Drone resetadas para disconnected`);
                    resolve(true);
                }
            }
        );
    });
}

function dbGetDroneMessages() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM drone_messages ORDER BY id DESC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbAddDroneMessage(content) {
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO drone_messages (message_content) VALUES (?)", [content], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID, message_content: content });
        });
    });
}

function dbDeleteDroneMessage(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM drone_messages WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

function dbGetDroneClients() {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM drone_clients ORDER BY id DESC", [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function dbAddDroneClient(name, tel) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT OR IGNORE INTO drone_clients (name, tel, status) VALUES (?, ?, 'pending')",
            [name, tel],
            function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, name, tel, status: "pending" });
            }
        );
    });
}

function dbAddDroneClientsBatch(clients) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run("BEGIN TRANSACTION");
            const stmt = db.prepare("INSERT OR IGNORE INTO drone_clients (name, tel, status) VALUES (?, ?, 'pending')");
            
            let added = 0;
            clients.forEach(c => {
                stmt.run([c.name, c.tel], function(err) {
                    if (!err && this.changes > 0) {
                        added++;
                    }
                });
            });

            stmt.finalize((err) => {
                if (err) {
                    db.run("ROLLBACK");
                    reject(err);
                } else {
                    db.run("COMMIT", (commitErr) => {
                        if (commitErr) reject(commitErr);
                        else resolve(added);
                    });
                }
            });
        });
    });
}

function dbRemoveDroneClient(id) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM drone_clients WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this.changes > 0);
        });
    });
}

function dbClearDroneClients(type = "all") {
    return new Promise((resolve, reject) => {
        let query = "DELETE FROM drone_clients";
        let params = [];
        if (type === "sent") {
            query += " WHERE status = 'sent'";
        } else if (type === "failed") {
            query += " WHERE status = 'failed'";
        }
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this.changes);
        });
    });
}

async function dbGetDroneStats() {
    return new Promise((resolve, reject) => {
        db.all("SELECT status, COUNT(*) as count FROM drone_clients GROUP BY status", [], (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            const stats = { total: 0, pending: 0, sent: 0, failed: 0 };
            rows.forEach(r => {
                stats[r.status] = r.count;
                stats.total += r.count;
            });
            resolve(stats);
        });
    });
}

function dbUpdateClientStatus(id, status) {
    return new Promise((resolve, reject) => {
        db.run(
            "UPDATE drone_clients SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [status, id],
            function(err) {
                if (err) reject(err);
                else resolve(this.changes > 0);
            }
        );
    });
}

function dbInsertDroneInstance(instanceId, name, status) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO drone_instances (id, name, status) VALUES (?, ?, ?)",
            [instanceId, name, status],
            function(err) {
                if (err) reject(err);
                else resolve();
            }
        );
    });
}

function dbDeleteDroneInstance(instanceId) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM drone_instances WHERE id = ?", [instanceId], function(err) {
            if (err) reject(err);
            else resolve();
        });
    });
}

function dbGetPendingAndFailedClients() {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM drone_clients WHERE status IN ('pending', 'failed') ORDER BY id ASC",
            [],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            }
        );
    });
}

module.exports = {
    dbGetAllDroneInstances,
    dbUpdateDroneInstanceStatus,
    dbResetAllDroneInstancesStatus,
    dbGetDroneMessages,
    dbAddDroneMessage,
    dbDeleteDroneMessage,
    dbGetDroneClients,
    dbAddDroneClient,
    dbAddDroneClientsBatch,
    dbRemoveDroneClient,
    dbClearDroneClients,
    dbGetDroneStats,
    dbUpdateClientStatus,
    dbInsertDroneInstance,
    dbDeleteDroneInstance,
    dbGetPendingAndFailedClients
};
