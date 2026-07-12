// renderer/guiScripts/utils/intervalSelector.js

window.IntervalSelector = {
  /**
   * Inicializa o seletor de intervalo reutilizável dentro do container especificado.
   * @param {HTMLElement|string} container - Elemento DOM ou ID do container.
   * @param {Object} options - Opções de customização (ex: defaultUnit, showSeconds)
   * @param {Function} onChange - Callback opcional disparado em mudanças.
   * @returns {Object} Métodos setValue e getValue para interagir com o componente.
   */
  init(container, options = {}, onChange = null) {
    const parent = typeof container === "string" ? document.getElementById(container) : container;
    if (!parent) return null;

    const defaultUnit = options.defaultUnit || "seconds";
    const showSeconds = options.showSeconds !== false;

    // Gera a estrutura HTML integrada com o design system do Zwei Chat
    parent.innerHTML = `
      <div class="interval-selector-widget" style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: 100%;">
          <div class="config-item" style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">Tipo:</label>
            <select class="selector-type step-input" style="padding: 6px 10px; font-size: 13px; height: 38px;">
              <option value="fixed">Fixo</option>
              <option value="range">Aleatório (Intervalo)</option>
            </select>
          </div>
          <div class="config-item" style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">Unidade:</label>
            <select class="selector-unit step-input" style="padding: 6px 10px; font-size: 13px; height: 38px;">
              ${showSeconds ? '<option value="seconds">Segundos</option>' : ''}
              <option value="minutes">Minutos</option>
              <option value="hours">Horas</option>
            </select>
          </div>
        </div>

        <div class="values-row" style="display: flex; gap: 8px; width: 100%;">
          <div class="fixed-wrapper" style="flex-grow: 1; width: 100%;">
            <div class="config-item" style="display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">Atraso/Tempo:</label>
              <input type="number" class="selector-fixed-val dj-number-input" min="0" placeholder="Ex: 5" style="width: 100%; text-align: center; height: 38px; padding: 6px 10px;">
            </div>
          </div>
          <div class="range-wrapper" style="display: none; gap: 8px; width: 100%;">
            <div class="config-item" style="flex-grow: 1; width: 50%; display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">Mínimo:</label>
              <input type="number" class="selector-min-val dj-number-input" min="0" placeholder="Ex: 5" style="width: 100%; text-align: center; height: 38px; padding: 6px 10px;">
            </div>
            <div class="config-item" style="flex-grow: 1; width: 50%; display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 12px; color: var(--text-muted); margin-bottom: 2px;">Máximo:</label>
              <input type="number" class="selector-max-val dj-number-input" min="0" placeholder="Ex: 15" style="width: 100%; text-align: center; height: 38px; padding: 6px 10px;">
            </div>
          </div>
        </div>
      </div>
    `;

    const typeSelect = parent.querySelector(".selector-type");
    const unitSelect = parent.querySelector(".selector-unit");
    const fixedWrapper = parent.querySelector(".fixed-wrapper");
    const rangeWrapper = parent.querySelector(".range-wrapper");
    const fixedVal = parent.querySelector(".selector-fixed-val");
    const minVal = parent.querySelector(".selector-min-val");
    const maxVal = parent.querySelector(".selector-max-val");

    // Configura a unidade padrão inicial
    unitSelect.value = defaultUnit;

    const updateVisibility = () => {
      const isFixed = typeSelect.value === "fixed";
      if (isFixed) {
        fixedWrapper.style.display = "block";
        rangeWrapper.style.display = "none";
      } else {
        fixedWrapper.style.display = "none";
        rangeWrapper.style.display = "flex";
      }
    };

    const getValue = () => {
      return {
        type: typeSelect.value,
        unit: unitSelect.value,
        value: parseInt(fixedVal.value) || 0,
        min: parseInt(minVal.value) || 0,
        max: parseInt(maxVal.value) || 0
      };
    };

    const setValue = (config) => {
      if (!config) config = {};
      
      // Suporte para formatos antigos legados
      if (typeof config === "number") {
        config = { type: "fixed", unit: defaultUnit, value: config };
      } else if (typeof config === "string") {
        const parsed = parseInt(config);
        config = { type: "fixed", unit: defaultUnit, value: isNaN(parsed) ? 0 : parsed };
      }

      typeSelect.value = config.type || "fixed";
      unitSelect.value = config.unit || defaultUnit;
      fixedVal.value = config.value !== undefined ? config.value : (config.min || 0);
      minVal.value = config.min !== undefined ? config.min : 0;
      maxVal.value = config.max !== undefined ? config.max : 0;

      updateVisibility();
    };

    const triggerChange = () => {
      updateVisibility();
      if (onChange) {
        onChange(getValue());
      }
    };

    // Adiciona listeners para reatividade do componente
    typeSelect.addEventListener("change", triggerChange);
    unitSelect.addEventListener("change", triggerChange);
    fixedVal.addEventListener("input", triggerChange);
    minVal.addEventListener("input", triggerChange);
    maxVal.addEventListener("input", triggerChange);

    // Ajusta a visibilidade condicional na inicialização
    updateVisibility();

    return {
      setValue,
      getValue,
      parent
    };
  }
};
