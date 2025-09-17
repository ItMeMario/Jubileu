const CityRepository = require("../services/cityServices");

class CityControllerGui {
  constructor() {
    this.cityRepository = new CityRepository();
  }

  // Função para sanitizar texto preservando quebras de linha
  sanitizeText(text, preserveLineBreaks = true) {
    if (!text) return "";

    if (preserveLineBreaks) {
      // Remove apenas espaços em branco no início e fim, mantendo quebras de linha
      return text.replace(/^\s+|\s+$/g, "");
    } else {
      // Para nome e link, remove tudo incluindo quebras de linha
      return text.trim();
    }
  }

  // Função para validar e normalizar quebras de linha
  normalizeLineBreaks(text) {
    if (!text) return "";

    // Normaliza diferentes tipos de quebras de linha para \n
    return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
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

  // ===== MÉTODOS GUI =====

  async handleListCitiesGUI() {
    try {
      const cities = await this.cityRepository.getAll();
      return {
        success: true,
        data: cities,
        message: "Cidades carregadas com sucesso",
      };
    } catch (error) {
      console.error("Erro ao listar cidades (GUI):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleAddCityGUI(cityData) {
    try {
      // Validar dados
      this.validateCityData(cityData);

      // Verificar se já existe uma cidade com esse nome
      const existingCities = await this.cityRepository.getAll();
      const sanitizedName = this.sanitizeText(cityData.name, false);
      const nameExists = existingCities.some(
        (city) =>
          this.sanitizeText(city.name, false).toLowerCase() ===
          sanitizedName.toLowerCase()
      );

      if (nameExists) {
        return {
          success: false,
          error: "Já existe uma cidade com esse nome",
        };
      }

      // Preparar dados da cidade
      const newCity = {
        name: this.sanitizeText(cityData.name, false),
        link: this.sanitizeText(cityData.link || "", false),
        message: this.normalizeLineBreaks(
          this.sanitizeText(cityData.message || "", true)
        ),
        date: this.sanitizeText(cityData.date || "", false),
        isPrimary: false,
      };

      const result = await this.cityRepository.add(newCity);

      return {
        success: true,
        data: result,
        message: "Cidade adicionada com sucesso",
      };
    } catch (error) {
      console.error("Erro ao adicionar cidade (GUI):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleEditCityGUI(id, cityData) {
    try {
      // Validar dados
      this.validateCityData(cityData);

      // Buscar cidade existente
      const existingCity = await this.cityRepository.findById(id);
      if (!existingCity) {
        return {
          success: false,
          error: "Cidade não encontrada",
        };
      }

      // Verificar se o novo nome já existe (exceto para a cidade atual)
      const allCities = await this.cityRepository.getAll();
      const sanitizedName = this.sanitizeText(cityData.name, false);
      const nameExists = allCities.some(
        (city) =>
          city.id !== id &&
          this.sanitizeText(city.name, false).toLowerCase() ===
            sanitizedName.toLowerCase()
      );

      if (nameExists) {
        return {
          success: false,
          error: "Já existe outra cidade com esse nome",
        };
      }

      // Preparar dados atualizados
      const updatedCity = {
        ...existingCity,
        name: this.sanitizeText(cityData.name, false),
        link: this.sanitizeText(cityData.link || "", false),
        message: this.normalizeLineBreaks(
          this.sanitizeText(cityData.message || "", true)
        ),
        date: this.sanitizeText(cityData.date || "", false),
      };

      await this.cityRepository.update(updatedCity);

      return {
        success: true,
        data: updatedCity,
        message: "Cidade atualizada com sucesso",
      };
    } catch (error) {
      console.error("Erro ao editar cidade (GUI):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleDeleteCityGUI(id) {
    try {
      // Buscar cidade
      const city = await this.cityRepository.findById(id);
      if (!city) {
        return {
          success: false,
          error: "Cidade não encontrada",
        };
      }

      // Verificar se é cidade primária
      if (city.isPrimary) {
        return {
          success: false,
          error:
            "Não é possível excluir a cidade primária. Defina outra cidade como primária primeiro.",
        };
      }

      await this.cityRepository.delete(id);

      return {
        success: true,
        message: "Cidade excluída com sucesso",
      };
    } catch (error) {
      console.error("Erro ao excluir cidade (GUI):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleSetPrimaryCityGUI(id) {
    try {
      // Buscar cidade
      const city = await this.cityRepository.findById(id);
      if (!city) {
        return {
          success: false,
          error: "Cidade não encontrada",
        };
      }

      // Verificar se já é primária
      if (city.isPrimary) {
        return {
          success: false,
          error: "Esta cidade já é a primária",
        };
      }

      await this.cityRepository.setPrimary(id);

      return {
        success: true,
        message: "Cidade primária definida com sucesso",
      };
    } catch (error) {
      console.error("Erro ao definir cidade primária (GUI):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleGetPrimaryCityGUI() {
    try {
      const primaryCity = await this.cityRepository.getPrimary();

      return {
        success: true,
        data: primaryCity,
        message: primaryCity
          ? "Cidade primária encontrada"
          : "Nenhuma cidade primária definida",
      };
    } catch (error) {
      console.error("Erro ao buscar cidade primária (GUI):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async handleGetCityByIdGUI(id) {
    try {
      const city = await this.cityRepository.findById(id);

      if (!city) {
        return {
          success: false,
          error: "Cidade não encontrada",
        };
      }

      return {
        success: true,
        data: city,
        message: "Cidade encontrada",
      };
    } catch (error) {
      console.error("Erro ao buscar cidade por ID (GUI):", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Método utilitário para obter cidade primária
  async getPrimaryCity() {
    return await this.cityRepository.getPrimary();
  }

  // Método utilitário para buscar cidade por ID
  async getCityById(id) {
    return await this.cityRepository.findById(id);
  }
}

module.exports = new CityControllerGui();
