// renderer/guiScripts/cityRenderer.js
class CitiesManager {
  constructor() {
    this.currentCity = null;
    this.cities = [];

    this.initializeElements();
    this.setupEventListeners();
    this.loadInitialData();
  }

  initializeElements() {
    this.citiesList = document.getElementById("cities-list");
    this.cityNameInput = document.getElementById("city-name");
    this.cityLinkInput = document.getElementById("city-link");
    this.cityMessageTextarea = document.getElementById("city-message");
    this.cityDateInput = document.getElementById("city-date");
    this.btnSaveCity = document.getElementById("btn-save-city");
    this.btnClearForm = document.getElementById("btn-clear-form");
    this.btnDeleteCity = document.getElementById("btn-delete-city");
    this.btnSetPrimary = document.getElementById("btn-set-primary");
    this.statusDiv = document.getElementById("status");
  }

  setupEventListeners() {
    this.btnSaveCity.addEventListener("click", () => this.saveCity());
    this.btnClearForm.addEventListener("click", () => this.clearForm());
    this.btnDeleteCity.addEventListener("click", () => this.deleteCity());
    this.btnSetPrimary.addEventListener("click", () => this.setPrimaryCity());
  }

  async loadInitialData() {
    try {
      await this.loadCities();
    } catch (error) {
      this.showStatus("Erro ao carregar dados iniciais", "error");
      console.error("Error loading initial data:", error);
    }
  }

  async loadCities() {
    try {
      this.showLoading(this.citiesList);
      const result = await window.cityAPI.getCities();

      if (result.success) {
        this.cities = result.data || [];
        this.renderCities();
      } else {
        throw new Error(result.error || "Erro ao carregar cidades");
      }
    } catch (error) {
      console.error("Error loading cities:", error);
      this.showStatus("Erro ao carregar cidades", "error");
      this.citiesList.innerHTML =
        '<div class="empty-state">Erro ao carregar cidades</div>';
    }
  }

  renderCities() {
    if (!this.cities || this.cities.length === 0) {
      this.citiesList.innerHTML =
        '<div class="empty-state">Nenhuma cidade encontrada</div>';
      return;
    }

    this.citiesList.innerHTML = this.cities
      .map((city) => {
        const primaryClass = city.isPrimary ? "primary" : "";
        const primaryBadge = city.isPrimary
          ? '<span class="primary-badge">PRIMÁRIA</span>'
          : "";

        return `
          <div class="city-item ${primaryClass}" data-id="${city.id}">
            <div class="city-header">
              <div class="city-name">${city.name}${primaryBadge}</div>
            </div>
            <div class="city-meta">#${city.id}${
          city.link
            ? ` • <a href="${city.link}" class="city-link" target="_blank">Link</a>`
            : ""
        }${city.date ? ` • ${city.date}` : ""}</div>
            ${
              city.message
                ? `<div class="city-content">${this.truncateText(
                    city.message,
                    100
                  )}</div>`
                : ""
            }
          </div>
        `;
      })
      .join("");

    this.citiesList.querySelectorAll(".city-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        // Evitar que links sejam interceptados
        if (e.target.tagName === "A") return;

        const cityId = parseInt(item.dataset.id);
        this.selectCity(cityId);
      });
    });
  }

  selectCity(cityId) {
    this.citiesList.querySelectorAll(".city-item").forEach((item) => {
      item.classList.remove("selected");
    });
    this.citiesList
      .querySelector(`[data-id="${cityId}"]`)
      .classList.add("selected");

    const city = this.cities.find((c) => c.id === cityId);
    if (city) {
      this.currentCity = city;
      this.loadCityToForm(city);
      this.btnDeleteCity.style.display = "inline-block";
      this.btnSetPrimary.style.display = city.isPrimary
        ? "none"
        : "inline-block";
      this.btnSaveCity.textContent = "Atualizar Cidade";
    }
  }

  loadCityToForm(city) {
    this.cityNameInput.value = city.name || "";
    this.cityLinkInput.value = city.link || "";
    this.cityMessageTextarea.value = city.message || "";
    this.cityDateInput.value = city.date || "";
  }

  clearForm() {
    this.currentCity = null;
    this.cityNameInput.value = "";
    this.cityLinkInput.value = "";
    this.cityMessageTextarea.value = "";
    this.cityDateInput.value = "";
    this.btnDeleteCity.style.display = "none";
    this.btnSetPrimary.style.display = "none";
    this.btnSaveCity.textContent = "Salvar Cidade";

    this.citiesList.querySelectorAll(".city-item").forEach((item) => {
      item.classList.remove("selected");
    });
  }

  async saveCity() {
    const cityData = {
      name: this.cityNameInput.value.trim(),
      link: this.cityLinkInput.value.trim(),
      message: this.cityMessageTextarea.value.trim(),
      date: this.cityDateInput.value.trim(),
    };

    if (!cityData.name) {
      this.showStatus("Nome da cidade é obrigatório", "error");
      return;
    }

    try {
      this.showButtonLoading(this.btnSaveCity);

      let result;
      if (this.currentCity) {
        result = await window.cityAPI.updateCity(this.currentCity.id, cityData);
      } else {
        result = await window.cityAPI.addCity(cityData);
      }

      if (result.success) {
        this.showStatus(result.message, "success");
        await this.loadCities();
        this.clearForm();
      } else {
        this.showStatus(result.error || "Erro ao salvar cidade", "error");
      }
    } catch (error) {
      console.error("Error saving city:", error);
      this.showStatus("Erro ao salvar cidade", "error");
    } finally {
      this.hideButtonLoading(this.btnSaveCity);
    }
  }

  async deleteCity() {
    if (!this.currentCity) return;

    if (this.currentCity.isPrimary) {
      this.showStatus("Não é possível excluir a cidade primária", "error");
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja excluir a cidade "${this.currentCity.name}"?`
      )
    ) {
      return;
    }

    try {
      this.showButtonLoading(this.btnDeleteCity);
      const result = await window.cityAPI.deleteCity(this.currentCity.id);

      if (result.success) {
        this.showStatus(result.message, "success");
        await this.loadCities();
        this.clearForm();
      } else {
        this.showStatus(result.error || "Erro ao excluir cidade", "error");
      }
    } catch (error) {
      console.error("Error deleting city:", error);
      this.showStatus("Erro ao excluir cidade", "error");
    } finally {
      this.hideButtonLoading(this.btnDeleteCity);
    }
  }

  async setPrimaryCity() {
    if (!this.currentCity) return;

    if (this.currentCity.isPrimary) {
      this.showStatus("Esta cidade já é a primária", "info");
      return;
    }

    if (
      !confirm(
        `Tem certeza que deseja definir "${this.currentCity.name}" como cidade primária?`
      )
    ) {
      return;
    }

    try {
      this.showButtonLoading(this.btnSetPrimary);
      const result = await window.cityAPI.setPrimaryCity(this.currentCity.id);

      if (result.success) {
        this.showStatus(result.message, "success");
        await this.loadCities();
        // Mantém a seleção atual após atualizar
        if (this.currentCity) {
          setTimeout(() => this.selectCity(this.currentCity.id), 100);
        }
      } else {
        this.showStatus(
          result.error || "Erro ao definir cidade primária",
          "error"
        );
      }
    } catch (error) {
      console.error("Error setting primary city:", error);
      this.showStatus("Erro ao definir cidade primária", "error");
    } finally {
      this.hideButtonLoading(this.btnSetPrimary);
    }
  }

  showLoading(element) {
    element.innerHTML =
      '<div class="empty-state"><div class="loading"></div>Carregando...</div>';
  }

  showButtonLoading(button) {
    const originalText = button.textContent;
    button.innerHTML = '<div class="loading"></div>' + originalText;
    button.disabled = true;
    button.dataset.originalText = originalText;
  }

  hideButtonLoading(button) {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }

  showStatus(message, type) {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status-message ${type} show`;

    setTimeout(() => {
      this.statusDiv.classList.remove("show");
    }, 3000);
  }

  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text || "";
    return text.substring(0, maxLength) + "...";
  }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  // Só inicializa se estivermos na seção de cidades
  if (document.getElementById("cities-section")) {
    window.citiesManager = new CitiesManager();
  }
});
