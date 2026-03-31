
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

  function hideAll(list) {
    (list || []).forEach(hide);
  }

  function textOf(el) {
    if (!el) return "";
    return (el.textContent || "").trim();
  }

  function normalizeText(v) {
    return String(v || "").trim();
  }

  function getOptionValue(el) {
    if (!el) return "";
    return normalizeText(el.getAttribute("data-value") || textOf(el));
  }

  function setSingleActive(target, selector) {
    if (!target) return;
    var row =
      target.closest(".options-row") ||
      target.closest(".question-wrap") ||
      target.closest(".vision-set") ||
      target.parentElement;

    if (!row) return;

    qsa(row, selector || ".option-pill, .vision-card").forEach(function (el) {
      el.classList.remove("active");
    });

    target.classList.add("active");
  }

  function toggleActive(target) {
    if (!target) return false;
    var isActive = target.classList.contains("active");
    if (isActive) {
      target.classList.remove("active");
      return false;
    }
    target.classList.add("active");
    return true;
  }

  function setField(scope, fieldName, value) {
    if (!scope || !fieldName) return;
    var el = qs(scope, '[data-field="' + fieldName + '"]');
    if (el) el.value = value == null ? "" : String(value);
  }

  function getField(scope, fieldName) {
    if (!scope || !fieldName) return "";
    var el = qs(scope, '[data-field="' + fieldName + '"]');
    return el ? normalizeText(el.value) : "";
  }

  function setDim(scope, dimName, value) {
    if (!scope || !dimName) return;
    var el = qs(scope, '[data-dim="' + dimName + '"]');
    if (el) el.value = value == null ? "" : String(value);
  }

  function getDim(scope, dimName) {
    if (!scope || !dimName) return "";
    var el = qs(scope, '[data-dim="' + dimName + '"]');
    return el ? normalizeText(el.value) : "";
  }

  function setFinal(name, value) {
    if (!formEl || !name) return;
    var el = qs(formEl, '[name="' + name + '"]');
    if (el) el.value = value == null ? "" : String(value);
  }

  function getFinal(name) {
    if (!formEl || !name) return "";
    var el = qs(formEl, '[name="' + name + '"]');
    return el ? normalizeText(el.value) : "";
  }

  function clearFinalFields() {
    [
      "configuration",
      "water_position",
      "chimney_position",
      "hob_position",
      "chimney_a",
      "chimney_b",
      "wall_1",
      "wall_2",
      "wall_3",
      "room_height",
      "bar_enabled",
      "bar_len",
      "bar_width",
      "island_enabled",
      "island_len",
      "island_width",
      "oven_tall_unit",
      "fridge_type",
      "vision",
      "plan",
      "contact_preference",
      "dishwasher",
      "washing_machine",
      "microwave",
      "coffee_machine",
      "summary_readable"
    ].forEach(function (name) {
      if (
        name === "bar_enabled" ||
        name === "island_enabled" ||
        name === "oven_tall_unit" ||
        name === "dishwasher" ||
        name === "washing_machine" ||
        name === "microwave" ||
        name === "coffee_machine"
      ) {
        setFinal(name, "no");
      } else {
        setFinal(name, "");
      }
    });
  }

  function pushIf(lines, label, value) {
    if (!normalizeText(value)) return;
    lines.push(label + ": " + value);
  }

  function yesNoBg(value) {
    var v = normalizeText(value).toLowerCase();
    if (v === "yes" || v === "да") return "Да";
    if (v === "no" || v === "не") return "Не";
    return value || "";
  }

  function disableStepNativeFields() {
    if (!stepsWrapper) return;

    qsa(stepsWrapper, "input, select, textarea").forEach(function (el) {
      if (el.type === "hidden") return;
      if (el.type === "file") return;
      if (el.type === "submit") return;
      el.disabled = true;
    });
  }

  // ==================================================
  // PICKERS
  // ==================================================
  function getPickerValue(controlEl) {
    if (!controlEl) return 0;
    var valueEl = qs(controlEl, ".picker-value");
    if (!valueEl) return 0;
    var raw = (valueEl.textContent || "").replace(/[^\d-]/g, "");
    var num = parseInt(raw, 10);
    return isNaN(num) ? 0 : num;
  }

  function setPickerValue(controlEl, value) {
    if (!controlEl) return;
    var valueEl = qs(controlEl, ".picker-value");
    if (!valueEl) return;
    valueEl.textContent = String(value);
  }

  function formatRowValue(row) {
    if (!row) return "";

    var metersControl = qs(row, ".meters-control");
    var centimetersControl = qs(row, ".centimeters-control");

    var hasM = !!metersControl;
    var hasCm = !!centimetersControl;

    var m = hasM ? getPickerValue(metersControl) : 0;
    var cm = hasCm ? getPickerValue(centimetersControl) : 0;

    if (!hasM && !hasCm) return "";
    if (hasM && !hasCm) return m > 0 ? m + " м" : "";
    if (!hasM && hasCm) return cm > 0 ? cm + " см" : "";
    if (m === 0 && cm === 0) return "";
    return m + " м " + cm + " см";
  }

  function syncRowHidden(row) {
    if (!row) return;
    var dimName = row.getAttribute("data-dim");
    if (!dimName) return;
    setDim(row.closest(".step-3-prava, .step-3a-aglova, .step-3b-aglova, .step-3a-p, .step-3b-p, .step-3c-p"), dimName, formatRowValue(row));
  }

  function resetPickerRow(row) {
    if (!row) return;
    var metersControl = qs(row, ".meters-control");
    var centimetersControl = qs(row, ".centimeters-control");

    if (metersControl) setPickerValue(metersControl, 0);
    if (centimetersControl) setPickerValue(centimetersControl, 0);
    syncRowHidden(row);
  }

  function resetPickerScope(scopeEl) {
    if (!scopeEl) return;
    qsa(scopeEl, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });
  }

  function handlePickerButtonClick(btn) {
    if (!btn) return;
    var row = btn.closest(".dimension-row");
    if (!row) return;

    var metersControl = qs(row, ".meters-control");
    var centimetersControl = qs(row, ".centimeters-control");

    var hasM = !!metersControl;
    var hasCm = !!centimetersControl;

    var m = hasM ? getPickerValue(metersControl) : 0;
    var cm = hasCm ? getPickerValue(centimetersControl) : 0;

    if (btn.classList.contains("meter-up")) {
      m += 1;
      setPickerValue(metersControl, m);
      syncRowHidden(row);
      return;
    }

    if (btn.classList.contains("meter-down")) {
      m = Math.max(0, m - 1);
      setPickerValue(metersControl, m);
      syncRowHidden(row);
      return;
    }

    if (btn.classList.contains("cm-up")) {
      if (!hasCm) return;
      if (cm >= 95) {
        if (hasM) {
          cm = 0;
          m += 1;
          setPickerValue(metersControl, m);
        } else {
          cm = 95;
        }
      } else {
        cm += 5;
      }
      setPickerValue(centimetersControl, cm);
      syncRowHidden(row);
      return;
    }

    if (btn.classList.contains("cm-down")) {
      if (!hasCm) return;
      if (cm <= 0) {
        if (hasM && m > 0) {
          m -= 1;
          cm = 95;
          setPickerValue(metersControl, m);
        } else {
          cm = 0;
        }
      } else {
        cm -= 5;
      }
      setPickerValue(centimetersControl, cm);
      syncRowHidden(row);
    }
  }

  // ==================================================
  // ROOT
  // ==================================================
  var overlay = qs(document, ".section-overlay");
  var modalCard = qs(document, ".modal-card");
  var smartFormBlock = qs(document, ".smart-form-block");
  var formEl = smartFormBlock ? qs(smartFormBlock, "form") : null;
  var stepsWrapper = smartFormBlock ? qs(smartFormBlock, ".steps-wrapper") : null;
  var openButtons = qsa(document, ".open-smart-form");

  if (!overlay || !modalCard || !smartFormBlock || !formEl) return;

  // ==================================================
  // STEPS
  // ==================================================
  var step1 = qs(smartFormBlock, ".step-1");

  var flowPrava = qs(smartFormBlock, ".flow-prava");
  var flowAglova = qs(smartFormBlock, ".flow-aglova");
  var flowP = qs(smartFormBlock, ".flow-p");

  var stepPrava = qs(smartFormBlock, ".step-3-prava");
  var step3aAglova = qs(smartFormBlock, ".step-3a-aglova");
  var step3bAglova = qs(smartFormBlock, ".step-3b-aglova");

  var step3aP = qs(smartFormBlock, ".step-3a-p");
  var step3bP = qs(smartFormBlock, ".step-3b-p");
  var step3cP = qs(smartFormBlock, ".step-3c-p");

  var ALL_STEPS = [
    step1,
    flowPrava,
    flowAglova,
    flowP,
    stepPrava,
    step3aAglova,
    step3bAglova,
    step3aP,
    step3bP,
    step3cP
  ].filter(Boolean);

  var activeBranch = "";
  var activeKitchenType = "";

  var BRANCHES = {
    prava: {
      key: "prava",
      title: "Права кухня",
      step: stepPrava,
      flow: flowPrava,
      comboFields: ["water_position_prava"],
      comboWrapSelector: ".combo-select-wrap",
      dimensionsWrapSelector: ".dimensions-phase-wrap",
      dims: {
        wall1: "len_prava_3",
        wall2: "",
        wall3: "",
        roomHeight: "height_prava_3",
        barLen: "bar_len_prava_3",
        barWidth: "bar_width_prava_3",
        islandLen: "island_len_3a",
        islandWidth: "island_width_3a"
      },
      fields: {
        water: "water_position_prava",
        chimney: "",
        hob: "",
        chimneyA: "",
        chimneyB: "",
        barEnabled: "bar",
        islandEnabled: "island",
        tallUnit: "tall_unit_prava_3",
        fridge: "fridge_prava_3",
        vision: "vision_prava_3",
        plan: "plan_prava_3",
        contact: "contact_preference_prava_3"
      }
    },
    "3a": {
      key: "3a",
      title: "Ъглова без комин",
      step: step3aAglova,
      flow: flowAglova,
      comboFields: ["water_position_3a", "chimney_position_3a"],
      comboWrapSelector: ".combo-select-wrap",
      dimensionsWrapSelector: ".dimensions-phase-wrap",
      dims: {
        wall1: "stena1_len_3a",
        wall2: "stena2_len_3a",
        wall3: "",
        roomHeight: "visochina_3a",
        barLen: "bar_len_3a",
        barWidth: "bar_width_3a",
        islandLen: "island_len_3a",
        islandWidth: "island_width_3a"
      },
      fields: {
        water: "water_position_3a",
        chimney: "chimney_position_3a",
        hob: "",
        chimneyA: "",
        chimneyB: "",
        barEnabled: "bar_enabled_3a",
        islandEnabled: "island_enabled_3a",
        tallUnit: "oven_tall_unit_3a",
        fridge: "fridge_type_3a",
        vision: "vision_3a",
        plan: "plan_3a",
        contact: "contact_preference_3a"
      }
    },
    "3b": {
      key: "3b",
      title: "Ъглова с комин",
      step: step3bAglova,
      flow: flowAglova,
      comboFields: ["water_position_3b", "chimney_position_3b"],
      comboWrapSelector: ".combo-select-wrap",
      dimensionsWrapSelector: ".dimensions-phase-wrap",
      dims: {
        wall1: "stena1_len_3b",
        wall2: "stena2_len_3b",
        wall3: "",
        roomHeight: "visochina_3b",
        barLen: "bar_len_3b",
        barWidth: "bar_width_3b",
        islandLen: "island_len_3b",
        islandWidth: "island_width_3b"
      },
      fields: {
        water: "water_position_3b",
        chimney: "chimney_position_3b",
        hob: "",
        chimneyA: "komin_a_3b",
        chimneyB: "komin_b_3b",
        barEnabled: "bar_enabled_3b",
        islandEnabled: "island_enabled_3b",
        tallUnit: "oven_tall_unit_3b",
        fridge: "fridge_type_3b",
        vision: "vision_3b",
        plan: "plan_3b",
        contact: "contact_preference_3b"
      }
    },
    "p_3a": {
      key: "p_3a",
      title: "П-образна без комин",
      step: step3aP,
      flow: flowP,
      comboFields: ["water_position_p_3a", "hob_position_p_3a"],
      comboWrapSelector: ".combo-select-wrap",
      dimensionsWrapSelector: ".dimensions-phase-wrap",
      dims: {
        wall1: "stena1_len_p_3a",
        wall2: "stena2_len_p_3a",
        wall3: "stena3_len_p_3a",
        roomHeight: "visochina_p_3a",
        barLen: "bar_len_p_3a",
        barWidth: "bar_width_p_3a",
        islandLen: "island_len_p_3a",
        islandWidth: "island_width_p_3a"
      },
      fields: {
        water: "water_position_p_3a",
        chimney: "",
        hob: "hob_position_p_3a",
        chimneyA: "",
        chimneyB: "",
        barEnabled: "bar_enabled_p_3a",
        islandEnabled: "island_enabled_p_3a",
        tallUnit: "oven_tall_unit_p_3a",
        fridge: "fridge_type_p_3a",
        vision: "vision_p_3a",
        plan: "plan_p_3a",
        contact: "contact_preference_p_3a"
      }
    },
    "p_3b": {
      key: "p_3b",
      title: "П-образна с комин вляво",
      step: step3bP,
      flow: flowP,
      comboFields: ["water_position_p_3b", "hob_position_p_3b"],
      comboWrapSelector: ".combo-select-wrap",
      dimensionsWrapSelector: ".dimensions-phase-wrap",
      dims: {
        wall1: "stena1_len_p_3b",
        wall2: "stena2_len_p_3b",
        wall3: "stena3_len_p_3b",
        roomHeight: "visochina_p_3b",
        barLen: "bar_len_p_3b",
        barWidth: "bar_width_p_3b",
        islandLen: "island_len_p_3b",
        islandWidth: "island_width_p_3b"
      },
      fields: {
        water: "water_position_p_3b",
        chimney: "",
        hob: "hob_position_p_3b",
        chimneyA: "komin_a_p_3b",
        chimneyB: "komin_b_p_3b",
        barEnabled: "bar_enabled_p_3b",
        islandEnabled: "island_enabled_p_3b",
        tallUnit: "oven_tall_unit_p_3b",
        fridge: "fridge_type_p_3b",
        vision: "vision_p_3b",
        plan: "plan_p_3b",
        contact: "contact_preference_p_3b"
      }
    },
    "p_3c": {
      key: "p_3c",
      title: "П-образна с комин вдясно",
      step: step3cP,
      flow: flowP,
      comboFields: ["water_position_p_3c", "hob_position_p_3c"],
      comboWrapSelector: ".combo-select-wrap",
      dimensionsWrapSelector: ".dimensions-phase-wrap",
      dims: {
        wall1: "stena1_len_p_3c",
        wall2: "stena2_len_p_3c",
        wall3: "stena3_len_p_3c",
        roomHeight: "visochina_p_3c",
        barLen: "bar_len_p_3c",
        barWidth: "bar_width_p_3c",
        islandLen: "island_len_p_3c",
        islandWidth: "island_width_p_3c"
      },
      fields: {
        water: "water_position_p_3c",
        chimney: "",
        hob: "hob_position_p_3c",
        chimneyA: "komin_a_p_3c",
        chimneyB: "komin_b_p_3c",
        barEnabled: "bar_enabled_p_3c",
        islandEnabled: "island_enabled_p_3c",
        tallUnit: "oven_tall_unit_p_3c",
        fridge: "fridge_type_p_3c",
        vision: "vision_p_3c",
        plan: "plan_p_3c",
        contact: "contact_preference_p_3c"
      }
    }
  };

  function getBranchConfig() {
    return BRANCHES[activeBranch] || null;
  }

  function getVisibleStep() {
    for (var i = ALL_STEPS.length - 1; i >= 0; i--) {
      var step = ALL_STEPS[i];
      if (step && window.getComputedStyle(step).display !== "none") return step;
    }
    return null;
  }

  function hideAllSteps() {
    ALL_STEPS.forEach(function (step) {
      hide(step);
    });
  }

  function showStep(stepEl) {
    hideAllSteps();
    show(stepEl, "block");
  }

  // ==================================================
  // CADS
  // ==================================================
  function showOnlyCad(stepEl, selectorToShow) {
    if (!stepEl) return;

    var wrap = qs(stepEl, ".cad-global-wrap");
    if (!wrap) return;

    qsa(wrap, "img, .w-image").forEach(function (el) {
      hide(el);
    });

    var target = selectorToShow ? qs(stepEl, selectorToShow) : null;

    if (!target) {
      target = qs(stepEl, ".cad-prava-base, .cad-3a-base, .cad-3b-base, .cad-p-3a-base, .cad-p-3b-base, .cad-p-3c-base");
    }

    if (target) show(target, "block");
  }

  function updateCadForActiveBranch() {
    var cfg = getBranchConfig();
    if (!cfg || !cfg.step) return;

    if (cfg.key === "prava") {
      var wrapPrava = qs(cfg.step, ".cad-global-wrap");
      if (!wrapPrava) return;

      var basePrava = qs(cfg.step, ".cad-prava-base");
      var pravaSketches = qsa(wrapPrava, "img, .w-image").filter(function (el) {
        return !el.classList.contains("cad-prava-base");
      });

      var waterPrava = getField(cfg.step, "water_position_prava").toLowerCase();

      qsa(wrapPrava, "img, .w-image").forEach(function (el) {
        hide(el);
      });

      if (!waterPrava) {
        if (basePrava) show(basePrava, "block");
        return;
      }

      if (waterPrava.indexOf("ляво") !== -1 && pravaSketches[0]) {
        show(pravaSketches[0], "block");
        return;
      }

      if (waterPrava.indexOf("дясно") !== -1 && pravaSketches[1]) {
        show(pravaSketches[1], "block");
        return;
      }

      if (basePrava) show(basePrava, "block");
      return;
    }

    if (cfg.key === "3a") {
      var water3a = getField(cfg.step, "water_position_3a");
      var chimney3a = getField(cfg.step, "chimney_position_3a");

      if (!water3a || !chimney3a) {
        showOnlyCad(cfg.step, ".cad-3a-base");
        return;
      }

      var map3a = {
        "Стена 2|Стена 1": ".cad-3a-sketch-1",
        "Стена 2|Стена 4": ".cad-3a-sketch-2",
        "Стена 3|Стена 1": ".cad-3a-sketch-3",
        "Стена 3|Стена 4": ".cad-3a-sketch-4"
      };

      showOnlyCad(cfg.step, map3a[water3a + "|" + chimney3a] || ".cad-3a-base");
      return;
    }

    if (cfg.key === "3b") {
      var water3b = getField(cfg.step, "water_position_3b");
      var chimney3b = getField(cfg.step, "chimney_position_3b");

      if (!water3b || !chimney3b) {
        showOnlyCad(cfg.step, ".cad-3b-base");
        return;
      }

      var map3b = {
        "Стена 2|Позиция A": ".cad-3b-sketch-5",
        "Стена 2|Позиция B": ".cad-3b-sketch-6",
        "Стена 3|Позиция A": ".cad-3b-sketch-7",
        "Стена 3|Позиция B": ".cad-3b-sketch-8"
      };

      showOnlyCad(cfg.step, map3b[water3b + "|" + chimney3b] || ".cad-3b-base");
      return;
    }

    if (cfg.key === "p_3a" || cfg.key === "p_3b" || cfg.key === "p_3c") {
      var waterField = cfg.fields.water;
      var hobField = cfg.fields.hob;
      var waterVal = getField(cfg.step, waterField);
      var hobVal = getField(cfg.step, hobField);

      if (!waterVal || !hobVal) {
        var baseSel = cfg.key === "p_3a" ? ".cad-p-3a-base" : cfg.key === "p_3b" ? ".cad-p-3b-base" : ".cad-p-3c-base";
        showOnlyCad(cfg.step, baseSel);
        return;
      }

      var keyMap = {
        "Позиция 1|Позиция 1": 0,
        "Позиция 1|Позиция 2": 1,
        "Позиция 1|Позиция 3": 2,
        "Позиция 2|Позиция 1": 3,
        "Позиция 2|Позиция 2": 4,
        "Позиция 2|Позиция 3": 5,
        "Позиция 3|Позиция 1": 6,
        "Позиция 3|Позиция 2": 7,
        "Позиция 3|Позиция 3": 8
      };

      var baseNumber = cfg.key === "p_3a" ? 9 : cfg.key === "p_3b" ? 18 : 27;
      var idx = keyMap[waterVal + "|" + hobVal];

      if (idx == null) {
        var fallbackBase = cfg.key === "p_3a" ? ".cad-p-3a-base" : cfg.key === "p_3b" ? ".cad-p-3b-base" : ".cad-p-3c-base";
        showOnlyCad(cfg.step, fallbackBase);
        return;
      }

      showOnlyCad(cfg.step, ".cad-p-sketch-" + (baseNumber + idx));
    }
  }

  // ==================================================
  // STATE RESET
  // ==================================================
  function resetBranchStep(branchKey) {
    var cfg = BRANCHES[branchKey];
    if (!cfg || !cfg.step) return;

    qsa(cfg.step, ".option-pill, .vision-card, .checkbox, .appliance-checkbox").forEach(function (el) {
      el.classList.remove("active");
    });

    // reset combo/general fields
    Object.keys(cfg.fields).forEach(function (k) {
      var fieldName = cfg.fields[k];
      if (!fieldName) return;

      if (k === "barEnabled" || k === "islandEnabled" || k === "tallUnit") {
        setField(cfg.step, fieldName, "no");
      } else {
        setField(cfg.step, fieldName, "");
      }
    });

    // reset global extras
    ["dishwasher", "washing_machine", "microwave", "coffee_machine"].forEach(function (f) {
      setField(cfg.step, f, "no");
    });

    // reset dims
    Object.keys(cfg.dims).forEach(function (k) {
      var dim = cfg.dims[k];
      if (dim) setDim(cfg.step, dim, "");
    });

    resetPickerScope(cfg.step);

    // UI visibility
    var comboWrap = qs(cfg.step, cfg.comboWrapSelector);
    var dimensionsWrap = qs(cfg.step, cfg.dimensionsWrapSelector);
    var barWrap = qs(cfg.step, ".bar-wrap");
    var islandWrap = qs(cfg.step, ".island-wrap");

    if (comboWrap) show(comboWrap, "block");
    if (dimensionsWrap) hide(dimensionsWrap);
    if (barWrap) hide(barWrap);
    if (islandWrap) hide(islandWrap);

    updateCadForActiveBranch();
  }

  function openDimensionsIfComboReady(branchKey) {
    var cfg = BRANCHES[branchKey];
    if (!cfg || !cfg.step) return;

    var ready = cfg.comboFields.every(function (fieldName) {
      return normalizeText(getField(cfg.step, fieldName));
    });

    updateCadForActiveBranch();

    if (!ready) return;

    var comboWrap = qs(cfg.step, cfg.comboWrapSelector);
    var dimensionsWrap = qs(cfg.step, cfg.dimensionsWrapSelector);

    if (comboWrap) hide(comboWrap);
    if (dimensionsWrap) show(dimensionsWrap, "block");
  }

  // ==================================================
  // GENERAL QUESTIONS
  // ==================================================
  function syncGeneralQuestionsFromActiveStep() {
    var cfg = getBranchConfig();
    if (!cfg || !cfg.step) return;

    var generalWrap = qs(cfg.step, ".General\\ questions\\ wrap, .General-questions-wrap, .general-questions-wrap, .general-questions");
    if (!generalWrap) return;

    var questionWraps = qsa(generalWrap, ":scope > .question-wrap");

    // 1) tall unit
    if (questionWraps[0] && cfg.fields.tallUnit) {
      var activeTall = qs(questionWraps[0], ".option-pill.active");
      if (activeTall) {
        var tallText = getOptionValue(activeTall).toLowerCase();
        setField(cfg.step, cfg.fields.tallUnit, tallText.indexOf("без") !== -1 ? "no" : "yes");
      }
    }

    // 2) fridge
    if (questionWraps[1] && cfg.fields.fridge) {
      var activeFridge = qs(questionWraps[1], ".option-pill.active");
      if (activeFridge) {
        setField(cfg.step, cfg.fields.fridge, getOptionValue(activeFridge));
      }
    }

    // vision
    var visionSet = qs(generalWrap, ".vision-set");
    if (visionSet && cfg.fields.vision) {
      var activeVision = qs(visionSet, ".vision-card.active, .option-pill.active");
      if (activeVision) setField(cfg.step, cfg.fields.vision, getOptionValue(activeVision));
    }

    // plan
    var questionPlan = qs(generalWrap, ".question-plan");
    if (questionPlan && cfg.fields.plan) {
      var activePlan = qs(questionPlan, ".option-pill.active");
      var planInput = qs(questionPlan, "input, textarea");
      if (activePlan) {
        setField(cfg.step, cfg.fields.plan, getOptionValue(activePlan));
      } else if (planInput) {
        setField(cfg.step, cfg.fields.plan, normalizeText(planInput.value));
      }
    }

    // contact
    var questionContact = qs(generalWrap, ".question-contact");
    if (questionContact && cfg.fields.contact) {
      var activeContact = qs(questionContact, ".option-pill.active");
      var contactInput = qs(questionContact, "input, textarea");
      if (activeContact) {
        setField(cfg.step, cfg.fields.contact, getOptionValue(activeContact));
      } else if (contactInput) {
        setField(cfg.step, cfg.fields.contact, normalizeText(contactInput.value));
      }
    }
  }

  // ==================================================
  // FINAL FIELDS
  // ==================================================
  function syncConfigurationFinal() {
    var cfg = getBranchConfig();
    setFinal("configuration", cfg ? cfg.title : "");
  }

  function syncCurrentBranchToFinal() {
    var cfg = getBranchConfig();
    if (!cfg || !cfg.step) return;

    clearFinalFields();
    syncConfigurationFinal();

    // sync picker rows first
    qsa(cfg.step, ".dimension-row").forEach(function (row) {
      syncRowHidden(row);
    });

    syncGeneralQuestionsFromActiveStep();

    // core
    setFinal("water_position", cfg.fields.water ? getField(cfg.step, cfg.fields.water) : "");
    setFinal("chimney_position", cfg.fields.chimney ? getField(cfg.step, cfg.fields.chimney) : "");
    setFinal("hob_position", cfg.fields.hob ? getField(cfg.step, cfg.fields.hob) : "");
    setFinal("chimney_a", cfg.fields.chimneyA ? getField(cfg.step, cfg.fields.chimneyA) : "");
    setFinal("chimney_b", cfg.fields.chimneyB ? getField(cfg.step, cfg.fields.chimneyB) : "");

    // dimensions
    setFinal("wall_1", cfg.dims.wall1 ? getDim(cfg.step, cfg.dims.wall1) : "");
    setFinal("wall_2", cfg.dims.wall2 ? getDim(cfg.step, cfg.dims.wall2) : "");
    setFinal("wall_3", cfg.dims.wall3 ? getDim(cfg.step, cfg.dims.wall3) : "");
    setFinal("room_height", cfg.dims.roomHeight ? getDim(cfg.step, cfg.dims.roomHeight) : "");

    // bar/island
    setFinal("bar_enabled", cfg.fields.barEnabled ? getField(cfg.step, cfg.fields.barEnabled) || "no" : "no");
    setFinal("bar_len", cfg.dims.barLen ? getDim(cfg.step, cfg.dims.barLen) : "");
    setFinal("bar_width", cfg.dims.barWidth ? getDim(cfg.step, cfg.dims.barWidth) : "");

    setFinal("island_enabled", cfg.fields.islandEnabled ? getField(cfg.step, cfg.fields.islandEnabled) || "no" : "no");
    setFinal("island_len", cfg.dims.islandLen ? getDim(cfg.step, cfg.dims.islandLen) : "");
    setFinal("island_width", cfg.dims.islandWidth ? getDim(cfg.step, cfg.dims.islandWidth) : "");

    // general
    setFinal("oven_tall_unit", cfg.fields.tallUnit ? getField(cfg.step, cfg.fields.tallUnit) || "no" : "no");
    setFinal("fridge_type", cfg.fields.fridge ? getField(cfg.step, cfg.fields.fridge) : "");
    setFinal("vision", cfg.fields.vision ? getField(cfg.step, cfg.fields.vision) : "");
    setFinal("plan", cfg.fields.plan ? getField(cfg.step, cfg.fields.plan) : "");
    setFinal("contact_preference", cfg.fields.contact ? getField(cfg.step, cfg.fields.contact) : "");

    // extras global
    setFinal("dishwasher", getField(cfg.step, "dishwasher") || "no");
    setFinal("washing_machine", getField(cfg.step, "washing_machine") || "no");
    setFinal("microwave", getField(cfg.step, "microwave") || "no");
    setFinal("coffee_machine", getField(cfg.step, "coffee_machine") || "no");

    buildReadableSummary();
  }

  function buildReadableSummary() {
    var lines = [];

    pushIf(lines, "Конфигурация", getFinal("configuration"));

    pushIf(lines, "Вода", getFinal("water_position"));
    pushIf(lines, "Комин", getFinal("chimney_position"));
    pushIf(lines, "Котлони", getFinal("hob_position"));
    pushIf(lines, "Комин A", getFinal("chimney_a"));
    pushIf(lines, "Комин B", getFinal("chimney_b"));

    if (
      getFinal("wall_1") ||
      getFinal("wall_2") ||
      getFinal("wall_3") ||
      getFinal("room_height")
    ) {
      lines.push("");
      lines.push("Основни размери:");
      pushIf(lines, "Стена 1", getFinal("wall_1"));
      pushIf(lines, "Стена 2", getFinal("wall_2"));
      pushIf(lines, "Стена 3", getFinal("wall_3"));
      pushIf(lines, "Височина", getFinal("room_height"));
    }

    lines.push("");
    pushIf(lines, "Бар", yesNoBg(getFinal("bar_enabled")));
    if (getFinal("bar_enabled") === "yes") {
      pushIf(lines, "Бар дължина", getFinal("bar_len"));
      pushIf(lines, "Бар ширина", getFinal("bar_width"));
    }

    lines.push("");
    pushIf(lines, "Остров", yesNoBg(getFinal("island_enabled")));
    if (getFinal("island_enabled") === "yes") {
      pushIf(lines, "Остров дължина", getFinal("island_len"));
      pushIf(lines, "Остров ширина", getFinal("island_width"));
    }

    lines.push("");
    pushIf(lines, "Колона за фурна", yesNoBg(getFinal("oven_tall_unit")));
    pushIf(lines, "Хладилник", getFinal("fridge_type"));

    lines.push("");
    pushIf(lines, "Визия", getFinal("vision"));
    pushIf(lines, "Планиране", getFinal("plan"));
    pushIf(lines, "Предпочитан контакт", getFinal("contact_preference"));

    lines.push("");
    pushIf(lines, "Съдомиялна", yesNoBg(getFinal("dishwasher")));
    pushIf(lines, "Пералня", yesNoBg(getFinal("washing_machine")));
    pushIf(lines, "Микровълнова", yesNoBg(getFinal("microwave")));
    pushIf(lines, "Кафе машина", yesNoBg(getFinal("coffee_machine")));

    setFinal("summary_readable", lines.join("\n").replace(/\n{3,}/g, "\n\n"));
  }

  // ==================================================
  // MODAL
  // ==================================================
  function openModal() {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";

    activeBranch = "";
    activeKitchenType = "";

    hideAllSteps();
    showStep(step1);

    clearFinalFields();
    disableStepNativeFields();
  }

  function closeModal() {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  }

  openButtons.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  });

  overlay.addEventListener("click", function (e) {
    if (!modalCard.contains(e.target)) closeModal();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  // ==================================================
  // STEP 1
  // ==================================================
  if (step1) {
    qsa(step1, ".kitchen-card").forEach(function (card, index) {
      card.addEventListener("click", function (e) {
        e.preventDefault();

        if (index === 0 && flowPrava && stepPrava) {
          activeKitchenType = "prava";
          activeBranch = "prava";
          resetBranchStep("prava");
          showStep(stepPrava);
          return;
        }

        if (index === 1 && flowAglova) {
          activeKitchenType = "aglova";
          activeBranch = "";
          showStep(flowAglova);
          return;
        }

        if (index === 2 && flowP) {
          activeKitchenType = "p";
          activeBranch = "";
          showStep(flowP);
        }
      });
    });
  }

  // ==================================================
  // FLOW CHOICES
  // ==================================================
  if (flowAglova) {
    var noCorner = qs(flowAglova, ".choice-card-no-corner");
    var withCorner = qs(flowAglova, ".choice-card-with-corner");

    if (noCorner) {
      noCorner.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3a";
        resetBranchStep("3a");
        showStep(step3aAglova);
      });
    }

    if (withCorner) {
      withCorner.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3b";
        resetBranchStep("3b");
        showStep(step3bAglova);
      });
    }
  }

  if (flowP) {
    var noChimney = qs(flowP, ".choice-card-no-chimney");
    var leftChimney = qs(flowP, ".choice-card-left-chimney");
    var rightChimney = qs(flowP, ".choice-card-right-chimney");

    if (noChimney) {
      noChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "p_3a";
        resetBranchStep("p_3a");
        showStep(step3aP);
      });
    }

    if (leftChimney) {
      leftChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "p_3b";
        resetBranchStep("p_3b");
        showStep(step3bP);
      });
    }

    if (rightChimney) {
      rightChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "p_3c";
        resetBranchStep("p_3c");
        showStep(step3cP);
      });
    }
  }

  // ==================================================
  // GENERIC STEP CLICK HANDLER
  // ==================================================
  function handleBranchStepClick(e, branchKey) {
    var cfg = BRANCHES[branchKey];
    if (!cfg || !cfg.step) return;

    var stepEl = cfg.step;
    var target = e.target;

    // picker buttons
    var pickerBtn = target.closest(".picker-btn");
    if (pickerBtn && stepEl.contains(pickerBtn)) {
      e.preventDefault();
      handlePickerButtonClick(pickerBtn);
      return;
    }

    // reset combo
    var resetBtn = target.closest(".reset-combo-button");
    if (resetBtn) {
      e.preventDefault();
      resetBranchStep(branchKey);
      return;
    }

    // combo question pills
    var comboWrap = qs(stepEl, ".combo-select-wrap");
    if (comboWrap) {
      var comboQuestionWrap = target.closest(".question-wrap");
      var comboPill = target.closest(".option-pill");

      if (comboQuestionWrap && comboPill && comboWrap.contains(comboQuestionWrap)) {
        e.preventDefault();

        var comboQuestions = qsa(comboWrap, ".question-wrap");
        var comboIndex = comboQuestions.indexOf(comboQuestionWrap);
        if (comboIndex > -1) {
          setSingleActive(comboPill, ".option-pill");
          var comboField = cfg.comboFields[comboIndex];
          if (comboField) setField(stepEl, comboField, getOptionValue(comboPill));
          openDimensionsIfComboReady(branchKey);
          return;
        }
      }
    }

    // bar / island toggles
    var dimensionsWrap = qs(stepEl, ".dimensions-phase-wrap");
    if (dimensionsWrap) {
      var allQuestionWraps = qsa(dimensionsWrap, ".question-wrap");
      var clickedQuestion = target.closest(".question-wrap");
      var clickedPill = target.closest(".option-pill");

      if (clickedQuestion && clickedPill && dimensionsWrap.contains(clickedQuestion)) {
        var barWrap = qs(dimensionsWrap, ".bar-wrap");
        var islandWrap = qs(dimensionsWrap, ".island-wrap");

        var questionWrapsInDims = qsa(dimensionsWrap, ":scope > .question-wrap");
        var firstBarQuestion = questionWrapsInDims[0] || null;
        var secondIslandQuestion = questionWrapsInDims[1] || null;

        if (clickedQuestion === firstBarQuestion && cfg.fields.barEnabled) {
          e.preventDefault();
          setSingleActive(clickedPill, ".option-pill");
          var barOn = getOptionValue(clickedPill).toLowerCase().indexOf("да") !== -1;
          setField(stepEl, cfg.fields.barEnabled, barOn ? "yes" : "no");
          if (barOn) {
            show(barWrap, "block");
          } else {
            hide(barWrap);
            resetPickerScope(barWrap);
            if (cfg.dims.barLen) setDim(stepEl, cfg.dims.barLen, "");
            if (cfg.dims.barWidth) setDim(stepEl, cfg.dims.barWidth, "");
          }
          return;
        }

        if (clickedQuestion === secondIslandQuestion && cfg.fields.islandEnabled) {
          e.preventDefault();
          setSingleActive(clickedPill, ".option-pill");
          var islandOn = getOptionValue(clickedPill).toLowerCase().indexOf("да") !== -1;
          setField(stepEl, cfg.fields.islandEnabled, islandOn ? "yes" : "no");
          if (islandOn) {
            show(islandWrap, "block");
          } else {
            hide(islandWrap);
            resetPickerScope(islandWrap);
            if (cfg.dims.islandLen) setDim(stepEl, cfg.dims.islandLen, "");
            if (cfg.dims.islandWidth) setDim(stepEl, cfg.dims.islandWidth, "");
          }
          return;
        }
      }
    }

    // general questions
    var generalWrap = qs(stepEl, ".General\\ questions\\ wrap, .General-questions-wrap, .general-questions-wrap, .general-questions");
    if (generalWrap) {
      var generalQuestion = target.closest(".question-wrap");
      var generalPill = target.closest(".option-pill");

      if (generalQuestion && generalPill && generalWrap.contains(generalQuestion)) {
        e.preventDefault();

        var topQuestionWraps = qsa(generalWrap, ":scope > .question-wrap");

        // tall unit
        if (generalQuestion === topQuestionWraps[0] && cfg.fields.tallUnit) {
          setSingleActive(generalPill, ".option-pill");
          var tallText = getOptionValue(generalPill).toLowerCase();
          setField(stepEl, cfg.fields.tallUnit, tallText.indexOf("без") !== -1 ? "no" : "yes");
          return;
        }

        // fridge
        if (generalQuestion === topQuestionWraps[1] && cfg.fields.fridge) {
          setSingleActive(generalPill, ".option-pill");
          setField(stepEl, cfg.fields.fridge, getOptionValue(generalPill));
          return;
        }
      }

      // vision
      var visionCard = target.closest(".vision-card, .vision-set .option-pill");
      if (visionCard && generalWrap.contains(visionCard) && cfg.fields.vision) {
        e.preventDefault();
        var visionSet = visionCard.closest(".vision-set");
        if (visionSet) {
          qsa(visionSet, ".vision-card, .option-pill").forEach(function (el) {
            el.classList.remove("active");
          });
        }
        visionCard.classList.add("active");
        setField(stepEl, cfg.fields.vision, getOptionValue(visionCard));
        return;
      }

      // plan
      var planPill = target.closest(".question-plan .option-pill");
      if (planPill && cfg.fields.plan) {
        e.preventDefault();
        setSingleActive(planPill, ".option-pill");
        setField(stepEl, cfg.fields.plan, getOptionValue(planPill));
        return;
      }

      // contact
      var contactPill = target.closest(".question-contact .option-pill");
      if (contactPill && cfg.fields.contact) {
        e.preventDefault();
        setSingleActive(contactPill, ".option-pill");
        setField(stepEl, cfg.fields.contact, getOptionValue(contactPill));
        return;
      }

      // extras checkboxes
      var checkboxWrap = target.closest(".checkbox, .appliance-checkbox");
      if (checkboxWrap && generalWrap.contains(checkboxWrap)) {
        var fieldName =
          checkboxWrap.getAttribute("data-field") ||
          checkboxWrap.getAttribute("data-name");

        if (fieldName && ["dishwasher", "washing_machine", "microwave", "coffee_machine"].indexOf(fieldName) !== -1) {
          e.preventDefault();
          var on = toggleActive(checkboxWrap);
          setField(stepEl, fieldName, on ? "yes" : "no");
          return;
        }
      }
    }
  }

  if (stepPrava) {
    stepPrava.addEventListener("click", function (e) {
      handleBranchStepClick(e, "prava");
    });
  }

  if (step3aAglova) {
    step3aAglova.addEventListener("click", function (e) {
      handleBranchStepClick(e, "3a");
    });
  }

  if (step3bAglova) {
    step3bAglova.addEventListener("click", function (e) {
      handleBranchStepClick(e, "3b");
    });
  }

  if (step3aP) {
    step3aP.addEventListener("click", function (e) {
      handleBranchStepClick(e, "p_3a");
    });
  }

  if (step3bP) {
    step3bP.addEventListener("click", function (e) {
      handleBranchStepClick(e, "p_3b");
    });
  }

  if (step3cP) {
    step3cP.addEventListener("click", function (e) {
      handleBranchStepClick(e, "p_3c");
    });
  }

  // ==================================================
  // INPUTS INSIDE GENERAL WRAPS
  // ==================================================
  [stepPrava, step3aAglova, step3bAglova, step3aP, step3bP, step3cP].forEach(function (stepEl) {
    if (!stepEl) return;

    stepEl.addEventListener("input", function (e) {
      var cfg = getBranchConfig();
      if (!cfg || cfg.step !== stepEl) return;

      var target = e.target;
      if (!target) return;

      var generalWrap = qs(stepEl, ".General\\ questions\\ wrap, .General-questions-wrap, .general-questions-wrap, .general-questions");
      if (!generalWrap || !generalWrap.contains(target)) return;

      if (target.closest(".question-plan") && cfg.fields.plan) {
        setField(stepEl, cfg.fields.plan, normalizeText(target.value));
      }

      if (target.closest(".question-contact") && cfg.fields.contact) {
        setField(stepEl, cfg.fields.contact, normalizeText(target.value));
      }
    });
  });

  // ==================================================
  // BACK BUTTONS
  // ==================================================
  smartFormBlock.addEventListener("click", function (e) {
    var backBtn = e.target.closest(".back-button");
    if (!backBtn) return;

    e.preventDefault();

    var visible = getVisibleStep();

    if (visible === stepPrava) {
      showStep(step1);
      activeBranch = "";
      activeKitchenType = "";
      return;
    }

    if (visible === flowAglova || visible === flowP) {
      showStep(step1);
      activeBranch = "";
      activeKitchenType = "";
      return;
    }

    if (visible === step3aAglova || visible === step3bAglova) {
      showStep(flowAglova);
      activeBranch = "";
      return;
    }

    if (visible === step3aP || visible === step3bP || visible === step3cP) {
      showStep(flowP);
      activeBranch = "";
    }
  });

  // ==================================================
  // SUBMIT
  // ==================================================
  formEl.addEventListener("submit", function () {
    syncCurrentBranchToFinal();
    disableStepNativeFields();
  });

  // ==================================================
  // INITIAL
  // ==================================================
  hideAllSteps();
  if (step1) showStep(step1);
  clearFinalFields();
  disableStepNativeFields();

  // default bases
  if (stepPrava) showOnlyCad(stepPrava, ".cad-prava-base");
  if (step3aAglova) showOnlyCad(step3aAglova, ".cad-3a-base");
  if (step3bAglova) showOnlyCad(step3bAglova, ".cad-3b-base");
  if (step3aP) showOnlyCad(step3aP, ".cad-p-3a-base");
  if (step3bP) showOnlyCad(step3bP, ".cad-p-3b-base");
  if (step3cP) showOnlyCad(step3cP, ".cad-p-3c-base");
});
