
document.addEventListener("DOMContentLoaded", function () {
  // ==================================================
  // HELPERS
  // ==================================================
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function show(el, displayType) {
    if (!el) return;
    el.style.display = displayType || el.dataset.display || "block";
  }

  function hide(el) {
    if (!el) return;
    el.style.display = "none";
  }

  function textOf(el) {
    return String((el && el.textContent) || "").trim();
  }

  function norm(v) {
    return String(v || "").trim();
  }

  function low(v) {
    return norm(v).toLowerCase();
  }

  function isVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function isYes(v) {
    var x = low(v);
    return (
      x === "да" ||
      x === "yes" ||
      x === "true" ||
      x === "1" ||
      x === "с колона за фурна" ||
      x === "вграден" ||
      x === "email" ||
      x === "phone" ||
      x === "viber"
    );
  }

  function yesNo(v) {
    return isYes(v) ? "yes" : "no";
  }

  function toFriendlyYesNo(v) {
    return isYes(v) ? "Да" : "Не";
  }

  function getDataValue(el) {
    return norm(el && el.getAttribute("data-value"));
  }

  function getFieldOwner(el) {
    if (!el) return null;
    return (
      el.closest("[data-field]") ||
      el.closest(".question-wrap[data-field]") ||
      el.closest(".vision-set[data-field]") ||
      el.closest(".question-plan[data-field]") ||
      el.closest(".question-contact[data-field]")
    );
  }

  function getFieldNameFromEl(el) {
    var owner = getFieldOwner(el);
    return owner ? norm(owner.getAttribute("data-field")) : "";
  }

  function getDimNameFromRow(row) {
    return norm(row && row.getAttribute("data-dim"));
  }

  function setSingleActive(target, selector) {
    if (!target) return;

    var row =
      target.closest(".options-row") ||
      target.closest(".style-cards-row") ||
      target.closest(".choice-cards-row") ||
      target.parentElement;

    if (!row) return;

    qsa(row, selector).forEach(function (el) {
      el.classList.remove("active");
    });

    target.classList.add("active");
  }

  function clampM(v) {
    var n = parseInt(v, 10);
    if (isNaN(n) || n < 0) n = 0;
    return n;
  }

  function clampCm(v) {
    var n = parseInt(v, 10);
    if (isNaN(n) || n < 0) n = 0;
    if (n > 95) n = 95;
    n = Math.round(n / 5) * 5;
    return n;
  }

  function formatDimension(m, cm) {
    m = clampM(m);
    cm = clampCm(cm);

    if (m <= 0 && cm <= 0) return "";
    if (cm <= 0) return m + " м";
    if (m <= 0) return cm + " см";
    return m + " м " + cm + " см";
  }

  // ==================================================
  // ROOTS
  // ==================================================
  var smartFormBlock = qs(document, ".smart-form-block");
  var formEl =
    qs(smartFormBlock, "form") ||
    qs(document, ".smart-form-block form") ||
    qs(document, ".w-form form") ||
    qs(document, "form");

  var modalOverlay = qs(document, ".section-overlay");
  var openBtns = qsa(document, ".open-smart-form");
  var closeBtns = qsa(document, ".close-smart-form");

  var flowPrava = qs(document, ".flow-prava");
  var flowAglova = qs(document, ".flow-aglova");
  var flowP = qs(document, ".flow-p");
  var allFlows = [flowPrava, flowAglova, flowP].filter(Boolean);

  var state = {};

  // ==================================================
  // HIDDEN INPUTS
  // ==================================================
  function hiddenByName(name) {
    return formEl ? qs(formEl, '[name="' + name + '"]') : null;
  }

  function setHidden(name, value) {
    var el = hiddenByName(name);
    if (el) el.value = norm(value);
  }

  // ==================================================
  // STATE
  // ==================================================
  function setState(key, value) {
    key = norm(key);
    if (!key) return;
    state[key] = norm(value);
  }

  function getState(key) {
    return norm(state[key] || "");
  }

  // ==================================================
  // MODAL
  // ==================================================
  function openModal() {
    if (modalOverlay) show(modalOverlay, "flex");
    document.documentElement.classList.add("smart-form-open");
    document.body.classList.add("smart-form-open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (modalOverlay) hide(modalOverlay);
    document.documentElement.classList.remove("smart-form-open");
    document.body.classList.remove("smart-form-open");
    document.body.style.overflow = "";
  }

  openBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  });

  closeBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal();
    });
  });

  if (modalOverlay) {
    modalOverlay.addEventListener("click", function (e) {
      if (e.target === modalOverlay) closeModal();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  // ==================================================
  // FLOWS / STEPS
  // ==================================================
  function deactivateAllFlows() {
    allFlows.forEach(function (flow) {
      hide(flow);
    });
  }

  function activateFlow(flowEl) {
    deactivateAllFlows();
    if (!flowEl) return;
    show(flowEl);

    qsa(flowEl, ".step-2-prava, .step-3-prava, .step-prava, .step-2-aglova, .step-3a-aglova, .step-3b-aglova, .step-2-p, .step-3a-p, .step-3b-p, .step-3c-p").forEach(function (step) {
      hide(step);
    });
  }

  function showOnlyStep(scope, selectors) {
    if (!scope) return;

    qsa(scope, ".step-2-prava, .step-3-prava, .step-prava, .step-2-aglova, .step-3a-aglova, .step-3b-aglova, .step-2-p, .step-3a-p, .step-3b-p, .step-3c-p").forEach(function (step) {
      hide(step);
    });

    for (var i = 0; i < selectors.length; i++) {
      var el = qs(scope, selectors[i]);
      if (el) {
        show(el);
        return;
      }
    }
  }

  qsa(document, ".kitchen-card").forEach(function (card) {
    card.addEventListener("click", function () {
      setSingleActive(card, ".kitchen-card");

      var val =
        norm(card.getAttribute("data-kitchen")) ||
        norm(card.getAttribute("data-value")) ||
        low(textOf(card));

      if (val.indexOf("прав") !== -1 || val === "prava") {
        activateFlow(flowPrava);
        showOnlyStep(flowPrava, [".step-3-prava", ".step-2-prava", ".step-prava"]);
      } else if (val.indexOf("ъгл") !== -1 || val === "aglova") {
        activateFlow(flowAglova);
        showOnlyStep(flowAglova, [".step-2-aglova"]);
      } else if (val === "p" || val.indexOf("п") !== -1) {
        activateFlow(flowP);
        showOnlyStep(flowP, [".step-2-p"]);
      }

      openModal();
    });
  });

  qsa(document, ".choice-card").forEach(function (card) {
    card.addEventListener("click", function () {
      setSingleActive(card, ".choice-card");

      var branch = norm(card.getAttribute("data-branch"));
      var flow = card.closest(".flow-aglova, .flow-p, .flow-prava");
      if (!flow || !branch) return;

      showOnlyStep(flow, ["." + branch]);
    });
  });

  // ==================================================
  // CLICK CAPTURE FOR ANY data-value UI
  // ==================================================
  document.addEventListener("click", function (e) {
    var pill = e.target.closest(".option-pill, .vision-card, .style-card, [data-value]");
    if (!pill) return;

    var value = getDataValue(pill);
    if (!value) return;

    var field = getFieldNameFromEl(pill);
    if (!field) return;

    if (pill.classList.contains("option-pill")) {
      setSingleActive(pill, ".option-pill");
    } else if (pill.classList.contains("vision-card") || pill.classList.contains("style-card")) {
      setSingleActive(pill, ".vision-card, .style-card");
    }

    setState(field, value);
    updateConditionalVisibility();
    updateAllCad();
  });

  // ==================================================
  // INPUT / TEXTAREA / SELECT WITH data-field
  // ==================================================
  qsa(document, "input[data-field], textarea[data-field], select[data-field]").forEach(function (el) {
    var type = low(el.getAttribute("type"));
    if (type === "checkbox") return;

    function sync() {
      var field = norm(el.getAttribute("data-field"));
      if (!field) return;
      setState(field, el.value);
    }

    el.addEventListener("input", sync);
    el.addEventListener("change", sync);
  });

  // ==================================================
  // DIMENSIONS
  // ==================================================
  function getMeterInput(row) {
    return (
      qs(row, '.meters-control input[type="number"]') ||
      qs(row, ".meters-control input") ||
      qs(row, '[data-part="meters"]')
    );
  }

  function getCmInput(row) {
    return (
      qs(row, '.centimeters-control input[type="number"]') ||
      qs(row, ".centimeters-control input") ||
      qs(row, '[data-part="centimeters"]')
    );
  }

  function getMeterValue(row) {
    var input = getMeterInput(row);
    return input ? clampM(input.value) : 0;
  }

  function getCmValue(row) {
    var input = getCmInput(row);
    return input ? clampCm(input.value) : 0;
  }

  function setMeterValue(row, v) {
    var input = getMeterInput(row);
    if (input) input.value = clampM(v);
  }

  function setCmValue(row, v) {
    var input = getCmInput(row);
    if (input) input.value = clampCm(v);
  }

  function refreshDimensionRow(row) {
    if (!row) return;

    var dimKey = getDimNameFromRow(row);
    if (!dimKey) return;

    var m = getMeterValue(row);
    var cm = getCmValue(row);
    var formatted = formatDimension(m, cm);

    var hiddenUi =
      qs(row, ".hidden-dimension-input") ||
      qs(row, 'input[type="hidden"]');

    if (hiddenUi) hiddenUi.value = formatted;
    setState(dimKey, formatted);
  }

  qsa(document, ".dimension-row[data-dim]").forEach(function (row) {
    var meterInput = getMeterInput(row);
    var cmInput = getCmInput(row);

    if (meterInput) {
      meterInput.addEventListener("input", function () {
        meterInput.value = clampM(meterInput.value);
        refreshDimensionRow(row);
      });
      meterInput.addEventListener("change", function () {
        meterInput.value = clampM(meterInput.value);
        refreshDimensionRow(row);
      });
    }

    if (cmInput) {
      cmInput.addEventListener("input", function () {
        cmInput.value = clampCm(cmInput.value);
        refreshDimensionRow(row);
      });
      cmInput.addEventListener("change", function () {
        cmInput.value = clampCm(cmInput.value);
        refreshDimensionRow(row);
      });
    }

    qsa(row, '.meters-control .minus, .meters-control [data-action="minus"]').forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        setMeterValue(row, getMeterValue(row) - 1);
        refreshDimensionRow(row);
      });
    });

    qsa(row, '.meters-control .plus, .meters-control [data-action="plus"]').forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        setMeterValue(row, getMeterValue(row) + 1);
        refreshDimensionRow(row);
      });
    });

    qsa(row, '.centimeters-control .minus, .centimeters-control [data-action="minus"]').forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();

        var m = getMeterValue(row);
        var cm = getCmValue(row) - 5;

        if (cm < 0 && m > 0) {
          m -= 1;
          cm = 95;
        }

        if (cm < 0) cm = 0;

        setMeterValue(row, m);
        setCmValue(row, cm);
        refreshDimensionRow(row);
      });
    });

    qsa(row, '.centimeters-control .plus, .centimeters-control [data-action="plus"]').forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();

        var m = getMeterValue(row);
        var cm = getCmValue(row) + 5;

        if (cm > 95) {
          m += 1;
          cm = 0;
        }

        setMeterValue(row, m);
        setCmValue(row, cm);
        refreshDimensionRow(row);
      });
    });

    refreshDimensionRow(row);
  });

  // ==================================================
  // CONDITIONAL WRAPS
  // ==================================================
  function updateConditionalVisibility() {
    qsa(document, "[data-conditional]").forEach(function (el) {
      var key = norm(el.getAttribute("data-conditional"));
      if (!key) return;

      if (isYes(getState(key))) {
        show(el);
      } else {
        hide(el);
      }
    });
  }

  // ==================================================
  // CAD
  // ==================================================
  function hideCadInScope(scope) {
    if (!scope) return;

    qsa(scope, '[class*="cad-"]').forEach(function (el) {
      if (
        el.className.indexOf("cad-global-wrap") === -1 &&
        el.className.indexOf("cad-static-wrap") === -1
      ) {
        hide(el);
      }
    });
  }

  function showCad(scope, selector) {
    var el = qs(scope, selector);
    if (el) show(el);
  }

  function updateAllCad() {
    // Права
    if (flowPrava) {
      hideCadInScope(flowPrava);
      showCad(flowPrava, ".cad-prava-base");
    }

    // Ъглова 3a
    var ag3a = qs(document, ".step-3a-aglova");
    if (ag3a && isVisible(ag3a)) {
      hideCadInScope(ag3a);
      showCad(ag3a, ".cad-3a-base");
    }

    // Ъглова 3b
    var ag3b = qs(document, ".step-3b-aglova");
    if (ag3b && isVisible(ag3b)) {
      hideCadInScope(ag3b);
      showCad(ag3b, ".cad-3b-base");
    }

    // П 3a / 3b / 3c
    var p3a = qs(document, ".step-3a-p");
    if (p3a && isVisible(p3a)) {
      hideCadInScope(p3a);
      showCad(p3a, ".cad-p-3a-base");
    }

    var p3b = qs(document, ".step-3b-p");
    if (p3b && isVisible(p3b)) {
      hideCadInScope(p3b);
      showCad(p3b, ".cad-p-3b-base");
    }

    var p3c = qs(document, ".step-3c-p");
    if (p3c && isVisible(p3c)) {
      hideCadInScope(p3c);
      showCad(p3c, ".cad-p-3c-base");
    }
  }

  // ==================================================
  // SCENARIO DETECTION
  // ==================================================
  function currentScenario() {
    var scenarios = [
      { key: "prava_3", selector: ".step-3-prava" },
      { key: "aglova_3a", selector: ".step-3a-aglova" },
      { key: "aglova_3b", selector: ".step-3b-aglova" },
      { key: "p_3a", selector: ".step-3a-p" },
      { key: "p_3b", selector: ".step-3b-p" },
      { key: "p_3c", selector: ".step-3c-p" }
    ];

    for (var i = 0; i < scenarios.length; i++) {
      var el = qs(document, scenarios[i].selector);
      if (el && isVisible(el)) return scenarios[i].key;
    }

    return "";
  }

  // ==================================================
  // SUMMARY
  // ==================================================
  function pushLine(lines, label, value) {
    value = norm(value);
    if (!value) return;
    lines.push(label + ": " + value);
  }

  function buildSummary(scenarioKey) {
    var lines = [];

    if (scenarioKey === "prava_3") {
      lines.push("Форма: Права");
      pushLine(lines, "Вода", getState("water_position_3a"));
      pushLine(lines, "Стена 1", getState("stena1_len_prava_3"));
      pushLine(lines, "Стена 2", getState("stena2_len_prava_3"));
      pushLine(lines, "Височина", getState("visochina_prava_3"));

      pushLine(lines, "Бар", getState("bar_enabled_prava_3"));
      pushLine(lines, "Бар дължина", getState("bar_len_prava_3"));
      pushLine(lines, "Бар ширина", getState("bar_width_prava_3"));

      pushLine(lines, "Остров", getState("island_enabled_prava_3"));
      pushLine(lines, "Остров дължина", getState("island_len_prava_3"));
      pushLine(lines, "Остров ширина", getState("island_width_prava_3"));

      pushLine(lines, "Колона за фурна", getState("oven_tall_unit_prava_3"));
      pushLine(lines, "Хладилник", getState("fridge_type_prava_3"));
      pushLine(lines, "Визия", getState("vision_prava_3"));
      pushLine(lines, "Кога планирате", getState("plan_prava_3"));
      pushLine(lines, "Предпочитан контакт", getState("contact_preference_prava_3"));
    }

    if (scenarioKey === "aglova_3a") {
      lines.push("Форма: Ъглова без комин");
      pushLine(lines, "Вода", getState("water_position_3a"));
      pushLine(lines, "Комин / позиция", getState("chimney_position_3a"));
      pushLine(lines, "Стена 1", getState("stena1_len_3a"));
      pushLine(lines, "Стена 2", getState("stena2_len_3a"));
      pushLine(lines, "Височина", getState("visochina_3a"));

      pushLine(lines, "Бар", getState("bar_enabled_3a"));
      pushLine(lines, "Бар дължина", getState("bar_len_3a"));
      pushLine(lines, "Бар ширина", getState("bar_width_3a"));

      pushLine(lines, "Остров", getState("island_enabled_3a"));
      pushLine(lines, "Остров дължина", getState("island_len_3a"));
      pushLine(lines, "Остров ширина", getState("island_width_3a"));

      pushLine(lines, "Колона за фурна", getState("oven_tall_unit_3a"));
      pushLine(lines, "Хладилник", getState("fridge_type_3a"));
      pushLine(lines, "Визия", getState("vision_3a"));
      pushLine(lines, "Кога планирате", getState("plan_3a"));
      pushLine(lines, "Предпочитан контакт", getState("contact_preference_3a"));
    }

    if (scenarioKey === "aglova_3b") {
      lines.push("Форма: Ъглова с комин");
      pushLine(lines, "Вода", getState("water_position_3b"));
      pushLine(lines, "Комин", getState("chimney_position_3b"));
      pushLine(lines, "Стена 1", getState("stena1_len_3b"));
      pushLine(lines, "Стена 2", getState("stena2_len_3b"));
      pushLine(lines, "Височина", getState("visochina_3b"));
      pushLine(lines, "Комин A", getState("komin_a_3b"));
      pushLine(lines, "Комин B", getState("komin_b_3b"));

      pushLine(lines, "Бар", getState("bar_enabled_3b"));
      pushLine(lines, "Бар дължина", getState("bar_len_3b"));
      pushLine(lines, "Бар ширина", getState("bar_width_3b"));

      pushLine(lines, "Остров", getState("island_enabled_3b"));
      pushLine(lines, "Остров дължина", getState("island_len_3b"));
      pushLine(lines, "Остров ширина", getState("island_width_3b"));

      pushLine(lines, "Колона за фурна", getState("oven_tall_unit_3b"));
      pushLine(lines, "Хладилник", getState("fridge_type_3b"));
      pushLine(lines, "Визия", getState("vision_3b"));
      pushLine(lines, "Кога планирате", getState("plan_3b"));
      pushLine(lines, "Предпочитан контакт", getState("contact_preference_3b"));
    }

    if (scenarioKey === "p_3a") {
      lines.push("Форма: П без комин");
      pushLine(lines, "Вода", getState("water_position_p_3a"));
      pushLine(lines, "Котлони", getState("hob_position_p_3a"));
      pushLine(lines, "Стена 1", getState("stena1_len_p_3a"));
      pushLine(lines, "Стена 2", getState("stena2_len_p_3a"));
      pushLine(lines, "Стена 3", getState("stena3_len_p_3a"));
      pushLine(lines, "Височина", getState("visochina_p_3a"));

      pushLine(lines, "Бар", getState("bar_enabled_p_3a"));
      pushLine(lines, "Бар дължина", getState("bar_len_p_3a"));
      pushLine(lines, "Бар ширина", getState("bar_width_p_3a"));

      pushLine(lines, "Остров", getState("island_enabled_p_3a"));
      pushLine(lines, "Остров дължина", getState("island_len_p_3a"));
      pushLine(lines, "Остров ширина", getState("island_width_p_3a"));

      pushLine(lines, "Колона за фурна", getState("oven_tall_unit_p_3a"));
      pushLine(lines, "Хладилник", getState("fridge_type_p_3a"));
      pushLine(lines, "Визия", getState("vision_p_3a"));
      pushLine(lines, "Кога планирате", getState("plan_p_3a"));
      pushLine(lines, "Предпочитан контакт", getState("contact_preference_p_3a"));
    }

    if (scenarioKey === "p_3b") {
      lines.push("Форма: П с комин вляво");
      pushLine(lines, "Вода", getState("water_position_p_3b"));
      pushLine(lines, "Котлони", getState("hob_position_p_3a"));
      pushLine(lines, "Стена 1", getState("stena1_len_p_3b"));
      pushLine(lines, "Стена 2", getState("stena2_len_p_3b"));
      pushLine(lines, "Стена 3", getState("stena3_len_p_3b"));
      pushLine(lines, "Височина", getState("visochina_p_3b"));
      pushLine(lines, "Комин A", getState("komin_a_p_3b"));
      pushLine(lines, "Комин B", getState("komin_b_p_3b"));

      pushLine(lines, "Бар", getState("bar_enabled_p_3b"));
      pushLine(lines, "Бар дължина", getState("bar_len_p_3b"));
      pushLine(lines, "Бар ширина", getState("bar_width_p_3b"));

      pushLine(lines, "Остров", getState("island_enabled_p_3b"));
      pushLine(lines, "Остров дължина", getState("island_len_p_3b"));
      pushLine(lines, "Остров ширина", getState("island_width_p_3b"));

      pushLine(lines, "Колона за фурна", getState("oven_tall_unit_p_3b"));
      pushLine(lines, "Хладилник", getState("fridge_type_p_3b"));
      pushLine(lines, "Кога планирате", getState("question-plan_p3b"));
      pushLine(lines, "Визия", getState("vision_p_3b"));
      pushLine(lines, "Предпочитан контакт", getState("contact_preference_p_3b"));
    }

    if (scenarioKey === "p_3c") {
      lines.push("Форма: П с комин вдясно");
      pushLine(lines, "Вода", getState("water_position_p_3c"));
      pushLine(lines, "Котлони", getState("hob_position_p_3c"));
      pushLine(lines, "Стена 1", getState("stena1_len_p_3c"));
      pushLine(lines, "Стена 2", getState("stena2_len_p_3c"));
      pushLine(lines, "Стена 3", getState("stena3_len_p_3c"));
      pushLine(lines, "Височина", getState("visochina_p_3c"));
      pushLine(lines, "Комин A", getState("komin_a_p_3c"));
      pushLine(lines, "Комин B", getState("komin_b_p_3c"));

      pushLine(lines, "Бар", getState("bar_enabled_p_3c"));
      pushLine(lines, "Бар дължина", getState("bar_len_p_3c"));
      pushLine(lines, "Бар ширина", getState("bar_width_p_3c"));

      pushLine(lines, "Остров", getState("island_enabled_p_3c"));
      pushLine(lines, "Остров дължина", getState("island_len_p_3c"));
      pushLine(lines, "Остров ширина", getState("island_width_p_3c"));

      pushLine(lines, "Колона за фурна", getState("oven_tall_unit_p_3c"));
      pushLine(lines, "Хладилник", getState("fridge_type_p_3c"));
      pushLine(lines, "Визия", getState("vision_p_3c"));
      pushLine(lines, "Кога планирате", getState("plan_p_3c"));
      pushLine(lines, "Предпочитан контакт", getState("contact_preference_p_3c"));
    }

    return lines.join("\n");
  }

  // ==================================================
  // CANONICAL MAPPING
  // ==================================================
  function clearCanonicalHiddenInputs() {
    setHidden("configuration", "");
    setHidden("water_position", "");
    setHidden("chimney_position", "");
    setHidden("hob_position", "");
    setHidden("chimney_a", "");
    setHidden("chimney_b", "");
    setHidden("wall_1", "");
    setHidden("wall_2", "");
    setHidden("wall_3", "");
    setHidden("room_height", "");
    setHidden("bar_enabled", "no");
    setHidden("bar_len", "");
    setHidden("bar_width", "");
    setHidden("island_enabled", "no");
    setHidden("island_len", "");
    setHidden("island_width", "");
    setHidden("oven_tall_unit", "no");
    setHidden("fridge_type", "");
    setHidden("vision", "");
    setHidden("plan", "");
    setHidden("contact_preference", "");
    setHidden("dishwasher", "no");
    setHidden("washing_machine", "no");
    setHidden("microwave", "no");
    setHidden("coffee_machine", "no");
    setHidden("summary_readable", "");
  }

  function setExtrasDefaults() {
    setHidden("dishwasher", yesNo(getState("dishwasher")));
    setHidden("washing_machine", yesNo(getState("washing_machine")));
    setHidden("microwave", yesNo(getState("microwave")));
    setHidden("coffee_machine", yesNo(getState("coffee_machine")));
  }

  function firstFilled(keys) {
    for (var i = 0; i < keys.length; i++) {
      var val = getState(keys[i]);
      if (val) return val;
    }
    return "";
  }

  function mapScenarioToCanonical(scenarioKey) {
    if (scenarioKey === "prava_3") {
      setHidden("configuration", "Права");
      setHidden("water_position", getState("water_position_3a"));
      setHidden("wall_1", getState("stena1_len_prava_3"));
      setHidden("wall_2", getState("stena2_len_prava_3"));
      setHidden("room_height", getState("visochina_prava_3"));

      setHidden("bar_enabled", yesNo(getState("bar_enabled_prava_3")));
      setHidden("bar_len", getState("bar_len_prava_3"));
      setHidden("bar_width", getState("bar_width_prava_3"));

      setHidden("island_enabled", yesNo(getState("island_enabled_prava_3")));
      setHidden("island_len", getState("island_len_prava_3"));
      setHidden("island_width", getState("island_width_prava_3"));

      setHidden("oven_tall_unit", yesNo(getState("oven_tall_unit_prava_3")));
      setHidden("fridge_type", getState("fridge_type_prava_3"));
      setHidden("vision", getState("vision_prava_3"));
      setHidden("plan", getState("plan_prava_3"));
      setHidden("contact_preference", getState("contact_preference_prava_3"));
    }

    if (scenarioKey === "aglova_3a") {
      setHidden("configuration", "Ъглова без комин");
      setHidden("water_position", getState("water_position_3a"));
      setHidden("chimney_position", getState("chimney_position_3a"));
      setHidden("wall_1", getState("stena1_len_3a"));
      setHidden("wall_2", getState("stena2_len_3a"));
      setHidden("room_height", getState("visochina_3a"));

      setHidden("bar_enabled", yesNo(getState("bar_enabled_3a")));
      setHidden("bar_len", getState("bar_len_3a"));
      setHidden("bar_width", getState("bar_width_3a"));

      setHidden("island_enabled", yesNo(getState("island_enabled_3a")));
      setHidden("island_len", getState("island_len_3a"));
      setHidden("island_width", getState("island_width_3a"));

      setHidden("oven_tall_unit", yesNo(getState("oven_tall_unit_3a")));
      setHidden("fridge_type", getState("fridge_type_3a"));
      setHidden("vision", getState("vision_3a"));
      setHidden("plan", getState("plan_3a"));
      setHidden("contact_preference", getState("contact_preference_3a"));
    }

    if (scenarioKey === "aglova_3b") {
      setHidden("configuration", "Ъглова с комин");
      setHidden("water_position", getState("water_position_3b"));
      setHidden("chimney_position", getState("chimney_position_3b"));
      setHidden("wall_1", getState("stena1_len_3b"));
      setHidden("wall_2", getState("stena2_len_3b"));
      setHidden("room_height", getState("visochina_3b"));
      setHidden("chimney_a", getState("komin_a_3b"));
      setHidden("chimney_b", getState("komin_b_3b"));

      setHidden("bar_enabled", yesNo(getState("bar_enabled_3b")));
      setHidden("bar_len", getState("bar_len_3b"));
      setHidden("bar_width", getState("bar_width_3b"));

      setHidden("island_enabled", yesNo(getState("island_enabled_3b")));
      setHidden("island_len", getState("island_len_3b"));
      setHidden("island_width", getState("island_width_3b"));

      setHidden("oven_tall_unit", yesNo(getState("oven_tall_unit_3b")));
      setHidden("fridge_type", getState("fridge_type_3b"));
      setHidden("vision", getState("vision_3b"));
      setHidden("plan", getState("plan_3b"));
      setHidden("contact_preference", getState("contact_preference_3b"));
    }

    if (scenarioKey === "p_3a") {
      setHidden("configuration", "П без комин");
      setHidden("water_position", getState("water_position_p_3a"));
      setHidden("hob_position", getState("hob_position_p_3a"));
      setHidden("wall_1", getState("stena1_len_p_3a"));
      setHidden("wall_2", getState("stena2_len_p_3a"));
      setHidden("wall_3", getState("stena3_len_p_3a"));
      setHidden("room_height", getState("visochina_p_3a"));

      setHidden("bar_enabled", yesNo(getState("bar_enabled_p_3a")));
      setHidden("bar_len", getState("bar_len_p_3a"));
      setHidden("bar_width", getState("bar_width_p_3a"));

      setHidden("island_enabled", yesNo(firstFilled(["island_enabled_p_3a", "bar_enabled_p_3c"])));
      setHidden("island_len", getState("island_len_p_3a"));
      setHidden("island_width", getState("island_width_p_3a"));

      setHidden("oven_tall_unit", yesNo(getState("oven_tall_unit_p_3a")));
      setHidden("fridge_type", getState("fridge_type_p_3a"));
      setHidden("vision", getState("vision_p_3a"));
      setHidden("plan", getState("plan_p_3a"));
      setHidden("contact_preference", getState("contact_preference_p_3a"));
    }

    if (scenarioKey === "p_3b") {
      setHidden("configuration", "П с комин отляво");
      setHidden("water_position", getState("water_position_p_3b"));
      setHidden("hob_position", getState("hob_position_p_3a"));
      setHidden("wall_1", getState("stena1_len_p_3b"));
      setHidden("wall_2", getState("stena2_len_p_3b"));
      setHidden("wall_3", getState("stena3_len_p_3b"));
      setHidden("room_height", getState("visochina_p_3b"));
      setHidden("chimney_a", getState("komin_a_p_3b"));
      setHidden("chimney_b", getState("komin_b_p_3b"));

      setHidden("bar_enabled", yesNo(getState("bar_enabled_p_3b")));
      setHidden("bar_len", getState("bar_len_p_3b"));
      setHidden("bar_width", getState("bar_width_p_3b"));

      setHidden("island_enabled", yesNo(firstFilled(["island_enabled_p_3b", "bar_enabled_p_3a"])));
      setHidden("island_len", getState("island_len_p_3b"));
      setHidden("island_width", getState("island_width_p_3b"));

      setHidden("oven_tall_unit", yesNo(getState("oven_tall_unit_p_3b")));
      setHidden("fridge_type", getState("fridge_type_p_3b"));
      setHidden("vision", getState("vision_p_3b"));
      setHidden("plan", getState("question-plan_p3b"));
      setHidden("contact_preference", getState("contact_preference_p_3b"));
    }

    if (scenarioKey === "p_3c") {
      setHidden("configuration", "П с комин отдясно");
      setHidden("water_position", getState("water_position_p_3c"));
      setHidden("hob_position", getState("hob_position_p_3c"));
      setHidden("wall_1", getState("stena1_len_p_3c"));
      setHidden("wall_2", getState("stena2_len_p_3c"));
      setHidden("wall_3", getState("stena3_len_p_3c"));
      setHidden("room_height", getState("visochina_p_3c"));
      setHidden("chimney_a", getState("komin_a_p_3c"));
      setHidden("chimney_b", getState("komin_b_p_3c"));

      setHidden("bar_enabled", yesNo(getState("bar_enabled_p_3c")));
      setHidden("bar_len", getState("bar_len_p_3c"));
      setHidden("bar_width", getState("bar_width_p_3c"));

      setHidden("island_enabled", yesNo(firstFilled(["island_enabled_p_3c", "bar_enabled_p_3c"])));
      setHidden("island_len", getState("island_len_p_3c"));
      setHidden("island_width", getState("island_width_p_3c"));

      setHidden("oven_tall_unit", yesNo(getState("oven_tall_unit_p_3c")));
      setHidden("fridge_type", getState("fridge_type_p_3c"));
      setHidden("vision", getState("vision_p_3c"));
      setHidden("plan", getState("plan_p_3c"));
      setHidden("contact_preference", getState("contact_preference_p_3c"));
    }
  }

  function writeSummary(scenarioKey) {
    setHidden("summary_readable", buildSummary(scenarioKey));
  }

  function mapStateToHiddenInputs() {
    clearCanonicalHiddenInputs();

    var scenarioKey = currentScenario();
    mapScenarioToCanonical(scenarioKey);
    setExtrasDefaults();
    writeSummary(scenarioKey);
  }

  // ==================================================
  // INIT FROM EXISTING ACTIVE UI
  // ==================================================
  function initFromActiveUI() {
    qsa(document, ".option-pill.active, .vision-card.active, .style-card.active, [data-value].active").forEach(function (el) {
      var field = getFieldNameFromEl(el);
      var value = getDataValue(el);
      if (field && value) setState(field, value);
    });

    qsa(document, "input[data-field], textarea[data-field], select[data-field]").forEach(function (el) {
      var type = low(el.getAttribute("type"));
      if (type === "checkbox") return;

      var field = norm(el.getAttribute("data-field"));
      if (!field) return;

      if (norm(el.value)) setState(field, el.value);
    });

    qsa(document, ".dimension-row[data-dim]").forEach(function (row) {
      refreshDimensionRow(row);
    });
  }

  // ==================================================
  // SUBMIT
  // ==================================================
  if (formEl) {
    formEl.addEventListener("submit", function () {
      mapStateToHiddenInputs();
    });
  }

  // ==================================================
  // START
  // ==================================================
  initFromActiveUI();
  updateConditionalVisibility();
  updateAllCad();

  if (modalOverlay && !modalOverlay.classList.contains("is-open")) {
    hide(modalOverlay);
  }
});
