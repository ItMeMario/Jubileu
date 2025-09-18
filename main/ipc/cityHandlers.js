// main/ipc/cityHandlers.js
class CityHandlers {
  constructor() {
    // Cache para controllers carregados dinamicamente
    this.controllers = {};
  }

  // Método helper para carregar controller se necessário
  getCityController() {
    if (!this.controllers.city) {
      this.controllers.city = require("../../controllers/cityControllerGui");
    }
    return this.controllers.city;
  }

  async getCities() {
    try {
      const controller = this.getCityController();
      return await controller.handleListCitiesGUI();
    } catch (error) {
      console.error("Erro em city-get-cities:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async addCity(_, cityData) {
    try {
      const controller = this.getCityController();
      return await controller.handleAddCityGUI(cityData);
    } catch (error) {
      console.error("Erro em city-add-city:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateCity(_, id, cityData) {
    try {
      const controller = this.getCityController();
      return await controller.handleEditCityGUI(id, cityData);
    } catch (error) {
      console.error("Erro em city-update-city:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteCity(_, id) {
    try {
      const controller = this.getCityController();
      return await controller.handleDeleteCityGUI(id);
    } catch (error) {
      console.error("Erro em city-delete-city:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async setPrimaryCity(_, id) {
    try {
      const controller = this.getCityController();
      return await controller.handleSetPrimaryCityGUI(id);
    } catch (error) {
      console.error("Erro em city-set-primary:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getPrimaryCity() {
    try {
      const controller = this.getCityController();
      return await controller.handleGetPrimaryCityGUI();
    } catch (error) {
      console.error("Erro em city-get-primary:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getCityById(_, id) {
    try {
      const controller = this.getCityController();
      return await controller.handleGetCityByIdGUI(id);
    } catch (error) {
      console.error("Erro em city-get-by-id:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Método para limpar cache do controller (útil para desenvolvimento)
  clearControllerCache() {
    delete this.controllers.city;
    // Remove do cache do require também
    delete require.cache[require.resolve("../../controllers/cityController")];
  }

  // Método para validar dados de cidade
  validateCityData(cityData) {
    const required = ["name"];
    const missing = required.filter((field) => !cityData[field]);

    if (missing.length > 0) {
      throw new Error(`Campos obrigatórios faltando: ${missing.join(", ")}`);
    }

    // Validações específicas
    if (cityData.name && cityData.name.trim().length === 0) {
      throw new Error("Nome da cidade não pode ser vazio");
    }

    return true;
  }
}

module.exports = CityHandlers;
