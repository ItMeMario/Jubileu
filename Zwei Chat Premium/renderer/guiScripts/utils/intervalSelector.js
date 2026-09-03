// renderer/guiScripts/utils/intervalSelector.js
// Widget modular para configuração de intervalos e cadência de envio

export const IntervalSelector = {
  /**
   * Inicializa o seletor de intervalo reutilizável dentro do container especificado.
   * @param {HTMLElement|string} container - Elemento DOM ou ID do container.
   * @param {Object} [options={}] - Opções de customização (defaultUnit, showSeconds)
   * @param {Function} [onChange=null] - Callback disparado em qualquer alteração
   * @returns {Object|null} Métodos setValue, getValue e setDisabled
   */
  init(container, options = {}, onChange = null) {
    const parent = typeof container === "string" ? document.getElementById(container) : container;
    if (!parent) return null;

    const defaultUnit = options.defaultUnit || "seconds";
    const showSeconds = options.showSeconds !== false;

    // Estrutura HTML integrada ao Design System do Zwei Chat Premium
    parent.innerHTML = `
      <div class="interval-selector-widget">
        <div class="interval-selector-row">
          <div class="form-group" style="margin-bottom: 0; flex: 1;">
            <label style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; display: block;">Modo:</label>
            <select class="form-control selector-type" style="padding: 6px 10px; font-size: 13px; height: 36px;">
              <option value="fixed">Fixo</option>
              <option value="range">Aleatório (Variação)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0; flex: 1;">
            <label style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; display: block;">Unidade:</label>
            <select class="form-control selector-unit" style="padding: 6px 10px; font-size: 13px; height: 36px;">
              ${showSeconds ? '<option value="seconds">Segundos</option>' : ''}
              <option value="minutes">Minutos</option>
            </select>
          </div>
        </div>

        <div class="interval-values-row" style="margin-top: 8px;">
          <div class="fixed-wrapper" style="width: 100%;">
            <div class="form-group" style="margin-bottom: 0;">
              <label style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; display: block;">Intervalo entre Envios:</label>
              <input type="number" class="form-control selector-fixed-val" min="1" placeholder="Ex: 2" style="text-align: center; height: 36px;" value="2">
            </div>
          </div>
          <div class="range-wrapper" style="display: none; gap: 8px; width: 100%;">
            <div class="form-group" style="margin-bottom: 0; flex: 1;">
              <label style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; display: block;">Mínimo:</label>
              <input type="number" class="form-control selector-min-val" min="1" placeholder="Ex: 2" style="text-align: center; height: 36px;" value="2">
            </div>
            <div class="form-group" style="margin-bottom: 0; flex: 1;">
              <label style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px; display: block;">Máximo:</label>
              <input type="number" class="form-control selector-max-val" min="1" placeholder="Ex: 5" style="text-align: center; height: 36px;" value="5">
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
        value: parseInt(fixedVal.value, 10) || 1,
        min: parseInt(minVal.value, 10) || 1,
        max: parseInt(maxVal.value, 10) || 3,
      };
    };

    const setValue = (config) => {
      if (!config) config = {};

      if (typeof config === "number") {
        config = { type: "fixed", unit: defaultUnit, value: config };
      }

      typeSelect.value = config.type || "fixed";
      unitSelect.value = config.unit || defaultUnit;
      fixedVal.value = config.value !== undefined ? config.value : config.min || 2;
      minVal.value = config.min !== undefined ? config.min : 1;
      maxVal.value = config.max !== undefined ? config.max : 3;

      updateVisibility();
    };

    const triggerChange = () => {
      updateVisibility();
      if (onChange) {
        onChange(getValue());
      }
    };

    typeSelect.addEventListener("change", triggerChange);
    unitSelect.addEventListener("change", triggerChange);
    fixedVal.addEventListener("input", triggerChange);
    minVal.addEventListener("input", triggerChange);
    maxVal.addEventListener("input", triggerChange);

    const setDisabled = (disabled) => {
      typeSelect.disabled = !!disabled;
      unitSelect.disabled = !!disabled;
      fixedVal.disabled = !!disabled;
      minVal.disabled = !!disabled;
      maxVal.disabled = !!disabled;
    };

    updateVisibility();

    return {
      setValue,
      getValue,
      setDisabled,
      parent,
    };
  },
};

if (typeof window !== "undefined") {
  window.IntervalSelector = IntervalSelector;
}
