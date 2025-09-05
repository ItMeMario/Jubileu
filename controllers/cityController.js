function generateSimpleId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

const {
  showCityManagementMenu,
  showCityList,
  promptForCityName,
  promptForCityLink,
  promptForCityMessage,
  promptForCityDate,
  promptForCitySelection,
  confirmAction,
} = require("../views/cityViews");
const CityRepository = require("../services/cityServices");

class CityController {
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

  // Método para validar dados de cidade (usado pelos métodos GUI)
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

  // ===== MÉTODOS CLI =====
  async handleCities(rl) {
    let exit = false;

    while (!exit) {
      try {
        const cities = await this.cityRepository.getAll();
        const choice = await showCityManagementMenu(rl, cities);

        switch (choice) {
          case "1":
            await this.addCity(rl);
            break;
          case "2":
            await this.editCity(rl);
            break;
          case "3":
            await this.setPrimaryCity(rl);
            break;
          case "4":
            await this.viewCities(rl);
            break;
          case "5":
            await this.deleteCity(rl);
            break;
          case "0":
            exit = true;
            break;
          default:
            console.log("\n❌ Opção inválida!");
        }
      } catch (error) {
        console.error("\n❌ Erro no menu de cidades:", error);
        console.log("\nPressione qualquer tecla para continuar...");
        await new Promise((resolve) => rl.question("", resolve));
      }
    }
  }

  async addCity(rl) {
    try {
      console.log("\n=== Adicionar Nova Cidade ===");

      const name = await promptForCityName(rl);
      if (!name) {
        console.log("\n⚠️ Nome da cidade é obrigatório!");
        return;
      }

      // Verificar se já existe uma cidade com esse nome
      const existingCities = await this.cityRepository.getAll();
      const sanitizedName = this.sanitizeText(name, false);
      const nameExists = existingCities.some(
        (city) =>
          this.sanitizeText(city.name, false).toLowerCase() ===
          sanitizedName.toLowerCase()
      );

      if (nameExists) {
        console.log("\n❌ Já existe uma cidade com esse nome!");
        return;
      }

      const link = await promptForCityLink(rl);
      const message = await promptForCityMessage(rl);
      const date = await promptForCityDate(rl);

      const newCity = {
        // Remover o generateSimpleId() já que o SQLite auto-incrementa o ID
        name: this.sanitizeText(name, false),
        link: this.sanitizeText(link || "", false),
        message: this.normalizeLineBreaks(
          this.sanitizeText(message || "", true)
        ),
        date: this.sanitizeText(date || "", false), // Mantém o campo date mesmo não estando no banco
        isPrimary: false,
        // Remover createdAt e updatedAt
      };

      await this.cityRepository.add(newCity);
      console.log("\n✅ Cidade adicionada com sucesso!");
    } catch (error) {
      console.error("\n❌ Erro ao adicionar cidade:", error);
    }
  }

  async editCity(rl) {
    try {
      console.log("\n=== Editar Cidade ===");
      const cities = await this.cityRepository.getAll();

      if (cities.length === 0) {
        console.log("\n❌ Nenhuma cidade cadastrada para editar.");
        return;
      }

      const index = await promptForCitySelection(rl, cities, "editar");
      if (index === null) return;

      const cityToEdit = cities[index];

      console.log(`\n🔍 Editando cidade: ${cityToEdit.name}`);
      console.log("💡 Pressione Enter para manter o valor atual\n");

      // Nome - passando isEditing = true
      console.log(`Valor atual: "${cityToEdit.name}"`);
      const nameInput = await promptForCityName(rl, cityToEdit.name, true);
      const newName =
        nameInput && nameInput.trim() !== "" ? nameInput : cityToEdit.name;

      if (newName === cityToEdit.name) {
        console.log(`   ↳ Mantendo nome atual`);
      } else {
        console.log(`   ↳ Novo nome: "${newName}"`);
      }

      // Verificar se o novo nome já existe (exceto para a cidade atual)
      if (newName !== cityToEdit.name) {
        const existingCities = await this.cityRepository.getAll();
        const sanitizedNewName = this.sanitizeText(newName, false);
        const nameExists = existingCities.some(
          (city) =>
            city.id !== cityToEdit.id &&
            this.sanitizeText(city.name, false).toLowerCase() ===
              sanitizedNewName.toLowerCase()
        );

        if (nameExists) {
          console.log("\n❌ Já existe outra cidade com esse nome!");
          return;
        }
      }

      // Link
      console.log(
        `\nValor atual do link: "${cityToEdit.link || "Não definido"}"`
      );
      const linkInput = await promptForCityLink(rl, cityToEdit.link || "");
      const newLink =
        linkInput !== undefined && linkInput.trim() !== ""
          ? linkInput
          : cityToEdit.link || "";

      if (newLink === (cityToEdit.link || "")) {
        console.log(`   ↳ Mantendo link atual`);
      } else {
        console.log(`   ↳ Novo link: "${newLink || "Não definido"}"`);
      }

      // Mensagem
      const currentMessageStatus = cityToEdit.message
        ? "Definida"
        : "Não definida";
      console.log(`\nValor atual da mensagem: ${currentMessageStatus}`);
      if (cityToEdit.message) {
        const messagePreview =
          cityToEdit.message.length > 80
            ? `${cityToEdit.message.substring(0, 80)}...`
            : cityToEdit.message;
        console.log(`Prévia: "${messagePreview}"`);
      }

      const messageInput = await promptForCityMessage(
        rl,
        cityToEdit.message || ""
      );
      const newMessage =
        messageInput !== undefined && messageInput.trim() !== ""
          ? messageInput
          : cityToEdit.message || "";

      if (newMessage === (cityToEdit.message || "")) {
        console.log(`   ↳ Mantendo mensagem atual`);
      } else {
        const newPreview =
          newMessage.length > 50
            ? `${newMessage.substring(0, 50)}...`
            : newMessage;
        console.log(`   ↳ Nova mensagem: "${newPreview}"`);
      }

      // Data (mantém o campo mesmo não estando no banco para compatibilidade)
      console.log(
        `\nValor atual da data: "${cityToEdit.date || "Não definida"}"`
      );
      const dateInput = await promptForCityDate(rl, cityToEdit.date || "");
      const newDate =
        dateInput !== undefined && dateInput.trim() !== ""
          ? dateInput
          : cityToEdit.date || "";

      if (newDate === (cityToEdit.date || "")) {
        console.log(`   ↳ Mantendo data atual`);
      } else {
        console.log(`   ↳ Nova data: "${newDate || "Não definida"}"`);
      }

      // Verificar se houve alterações (excluindo o campo date da verificação principal)
      const hasChanges =
        newName !== cityToEdit.name ||
        newLink !== (cityToEdit.link || "") ||
        newMessage !== (cityToEdit.message || "");

      if (!hasChanges) {
        console.log("\n⚠️ Nenhuma alteração foi feita.");
        return;
      }

      // Construir objeto atualizado (sem createdAt e updatedAt)
      const updatedCity = {
        ...cityToEdit,
        name: this.sanitizeText(newName, false),
        link: this.sanitizeText(newLink, false),
        message: this.normalizeLineBreaks(this.sanitizeText(newMessage, true)),
        date: this.sanitizeText(newDate, false), // Mantém para compatibilidade
      };

      await this.cityRepository.update(updatedCity);
      console.log("\n✅ Cidade atualizada com sucesso!");
    } catch (error) {
      console.error("\n❌ Erro ao editar cidade:", error);
    }
  }

  async setPrimaryCity(rl) {
    try {
      console.log("\n=== Definir Cidade Primária ===");
      const cities = await this.cityRepository.getAll();

      if (cities.length === 0) {
        console.log("\n❌ Nenhuma cidade cadastrada.");
        return;
      }

      // Mostrar cidade primária atual
      const currentPrimary = cities.find((city) => city.isPrimary);
      if (currentPrimary) {
        console.log(`\n🏆 Cidade primária atual: ${currentPrimary.name}`);
      } else {
        console.log("\n⚠️ Nenhuma cidade está definida como primária.");
      }

      const index = await promptForCitySelection(
        rl,
        cities,
        "definir como primária"
      );
      if (index === null) return;

      const cityToSetPrimary = cities[index];

      if (cityToSetPrimary.isPrimary) {
        console.log("\n⚠️ Esta cidade já é a primária!");
        return;
      }

      const confirm = await confirmAction(
        rl,
        `definir "${cityToSetPrimary.name}" como cidade primária`
      );
      if (!confirm) return;

      // Usar o método setPrimary do repository
      await this.cityRepository.setPrimary(cityToSetPrimary.id);
      console.log("\n✅ Cidade primária definida com sucesso!");
    } catch (error) {
      console.error("\n❌ Erro ao definir cidade primária:", error);
    }
  }

  async viewCities(rl) {
    try {
      console.log("\n=== Visualizar Cidades ===");
      const cities = await this.cityRepository.getAll();
      showCityList(cities, true);

      if (cities.length > 0) {
        console.log("\n📋 Detalhes das mensagens:");
        cities.forEach((city, index) => {
          const messagePreview = city.message
            ? city.message.length > 50
              ? `${city.message.substring(0, 50)}...`
              : city.message
            : "Sem mensagem";
          console.log(`   ${index + 1}. ${city.name}: "${messagePreview}"`);
        });

        await new Promise((resolve) => {
          rl.question("\nPressione qualquer tecla para continuar...", resolve);
        });
      }
    } catch (error) {
      console.error("\n❌ Erro ao visualizar cidades:", error);
    }
  }

  async deleteCity(rl) {
    try {
      console.log("\n=== Excluir Cidade ===");
      const cities = await this.cityRepository.getAll();

      if (cities.length === 0) {
        console.log("\n❌ Nenhuma cidade cadastrada para excluir.");
        return;
      }

      const index = await promptForCitySelection(rl, cities, "excluir");
      if (index === null) return;

      const cityToDelete = cities[index];

      if (cityToDelete.isPrimary) {
        console.log("\n❌ Não é possível excluir a cidade primária!");
        console.log("💡 Dica: Defina outra cidade como primária primeiro.");
        return;
      }

      // Mostrar informações da cidade antes de excluir
      console.log(`\n🗑️ Cidade a ser excluída:`);
      console.log(`   Nome: ${cityToDelete.name}`);
      console.log(`   Link: ${cityToDelete.link || "Não definido"}`);
      console.log(
        `   Mensagem: ${cityToDelete.message ? "Definida" : "Não definida"}`
      );
      console.log(`   Data: ${cityToDelete.date || "Não definida"}`);

      const confirm = await confirmAction(
        rl,
        `excluir a cidade "${cityToDelete.name}"`
      );
      if (!confirm) return;

      await this.cityRepository.delete(cityToDelete.id);
      console.log("\n✅ Cidade excluída com sucesso!");
    } catch (error) {
      console.error("\n❌ Erro ao excluir cidade:", error);
    }
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

module.exports = new CityController();
