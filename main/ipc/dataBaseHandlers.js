const DatabaseController = require("../../controllers/dataBaseController");

class DataBaseHandlers {
  constructor() {
    console.log("DataBaseHandlers inicializado");
  }

  // Obter todas as tabelas do banco
  async getAllTables() {
    try {
      console.log("Obtendo lista de tabelas...");
      const tables = await DatabaseController.getAllTables();

      return {
        success: true,
        data: tables,
      };
    } catch (error) {
      console.error("Erro ao obter tabelas:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obter informações de uma tabela específica
  async getTableInfo(event, tableName) {
    try {
      console.log(`Obtendo informações da tabela: ${tableName}`);

      if (!tableName) {
        throw new Error("Nome da tabela é obrigatório");
      }

      const tableInfo = await DatabaseController.getTableInfo(tableName);

      return {
        success: true,
        data: {
          tableName: tableName,
          columns: tableInfo,
        },
      };
    } catch (error) {
      console.error("Erro ao obter informações da tabela:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obter contagem de registros de todas as tabelas
  async getTableCounts() {
    try {
      console.log("Obtendo contagem de registros...");
      const counts = await DatabaseController.getTableCounts();

      return {
        success: true,
        data: counts,
      };
    } catch (error) {
      console.error("Erro ao obter contagens:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obter informações gerais do banco
  async getDatabaseInfo() {
    try {
      console.log("Obtendo informações gerais do banco...");

      const { DATABASE_PATH } = require("../../utils/initialize");
      const fs = require("fs").promises;

      const stats = await fs.stat(DATABASE_PATH);
      const tables = await DatabaseController.getAllTables();
      const counts = await DatabaseController.getTableCounts();

      // Calcular total de registros
      const totalRecords = Object.values(counts).reduce((total, count) => {
        return total + (typeof count === "number" ? count : 0);
      }, 0);

      const info = {
        path: DATABASE_PATH,
        size: Math.round((stats.size / 1024) * 100) / 100, // KB com 2 decimais
        sizeFormatted: `${Math.round((stats.size / 1024) * 100) / 100} KB`,
        created: stats.birthtime.toLocaleString("pt-BR"),
        modified: stats.mtime.toLocaleString("pt-BR"),
        totalTables: tables.length,
        totalRecords: totalRecords,
        type: "SQLite Database",
        version: "3.x",
      };

      return {
        success: true,
        data: info,
      };
    } catch (error) {
      console.error("Erro ao obter informações do banco:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obter cidade primária (específico do sistema)
  async getPrimaryCity() {
    try {
      console.log("Obtendo cidade primária...");
      const primaryCity = await DatabaseController.getPrimaryCity();

      return {
        success: true,
        data: primaryCity || null,
      };
    } catch (error) {
      console.error("Erro ao obter cidade primária:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Obter visão geral do banco (combinando várias informações)
  async getDatabaseOverview() {
    try {
      console.log("Obtendo visão geral do banco...");

      const [tables, counts, dbInfo, primaryCity] = await Promise.all([
        this.getAllTables(),
        this.getTableCounts(),
        this.getDatabaseInfo(),
        this.getPrimaryCity(),
      ]);

      // Verificar se todas as operações foram bem-sucedidas
      if (
        !tables.success ||
        !counts.success ||
        !dbInfo.success ||
        !primaryCity.success
      ) {
        throw new Error("Erro ao obter algumas informações do banco");
      }

      const overview = {
        database: dbInfo.data,
        tables: tables.data,
        tableCounts: counts.data,
        primaryCity: primaryCity.data,
        summary: {
          totalTables: tables.data.length,
          totalRecords: Object.values(counts.data).reduce((total, count) => {
            return total + (typeof count === "number" ? count : 0);
          }, 0),
          hasPrimaryCity: !!primaryCity.data,
        },
      };

      return {
        success: true,
        data: overview,
      };
    } catch (error) {
      console.error("Erro ao obter visão geral:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = DataBaseHandlers;
