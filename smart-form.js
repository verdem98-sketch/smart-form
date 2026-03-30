
document.addEventListener("DOMContentLoaded", function () {
  // =========================
  // HELPERS
  // =========================
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  function show(el, displayType) {
    if (!el) return;
    el.style.display = displayType || el.dataset.display || "block";
  }

  function hideAll(list) {
    (list || []).forEach(hide);
  }

  function setHidden(name, value) {
    var el = qs(formEl, '[name="' + name + '"]');
    if (!el) return;
    el.value = value || "";
  }

  function getHidden(name) {
    var el = qs(formEl, '[name="' + name + '"]');
    if (!el) return "";
    return (el.value || "").trim();
  }

  function setFieldsState(scopeEl, enabled) {
    if (!scopeEl) return;

    qsa(scopeEl, "input, select, textarea, button").forEach(function (el) {
      if (el.type === "hidden") return;
      if (el.type === "submit") return;
      el.disabled = !enabled;
    });
  }

  function removeActiveInScope(scopeEl, selector) {
    if (!scopeEl) return;
    qsa(scopeEl, selector || ".option-pill").forEach(function (el) {
      el.classList.remove("active");
    });
  }

  function removeActiveFromRow(row, selector) {
    if (!row) return;
    qsa(row, selector || ".option-pill").forEach(function (pill) {
      pill.classList.remove("active");
    });
  }

  function setSingleActive(pill, selector) {
    if (!pill) return;

    var row =
      pill.closest(".options-row") ||
      pill.closest(".question-wrap") ||
      pill.parentElement;

    if (!row) return;

    removeActiveFromRow(row, selector || ".option-pill");
    pill.classList.add("active");
  }

  function toggleActive(pill) {
    if (!pill) return false;
    var isActive = pill.classList.contains("active");

    if (isActive) {
      pill.classList.remove("active");
      return false;
    } else {
      pill.classList.add("active");
      return true;
    }
  }

  function setFirstHiddenInScope(scopeEl, value) {
    if (!scopeEl) return;
    var hidden = qs(scopeEl, ".hidden-dimension-input");
    if (hidden) hidden.value = value;
  }

  function clearHiddenInScope(scopeEl) {
    if (!scopeEl) return;
    qsa(scopeEl, ".hidden-dimension-input").forEach(function (el) {
      el.value = "";
    });
  }

  function hasAnyClass(el, classes) {
    if (!el) return false;
    return classes.some(function (cls) {
      return el.classList.contains(cls);
    });
  }

  function firstExisting(scope, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var found = qs(scope, selectors[i]);
      if (found) return found;
    }
    return null;
  }

  function allExisting(scope, selectors) {
    var out = [];
    selectors.forEach(function (sel) {
      qsa(scope, sel).forEach(function (el) {
        if (out.indexOf(el) === -1) out.push(el);
      });
    });
    return out;
  }

  function getTextOrDataValue(el) {
    if (!el) return "";
    return (
      (el.getAttribute("data-value") || "").trim() ||
      (el.textContent || "").trim()
    );
  }

  // =========================
  // PICKER HELPERS
  // =========================
  function getPickerValue(controlEl) {
    if (!controlEl) return 0;

    var valueEl = qs(controlEl, ".picker-value");
    if (!valueEl) return 0;

    var raw = (valueEl.textContent || "").trim().replace(/[^\d-]/g, "");
    var num = parseInt(raw, 10);

    return isNaN(num) ? 0 : num;
  }

  function setPickerValue(controlEl, value) {
    if (!controlEl) return;

    var valueEl = qs(controlEl, ".picker-value");
    if (!valueEl) return;

    valueEl.textContent = String(value);
  }

  function rowHasMeters(rowEl) {
    return !!qs(rowEl, ".meters-control");
  }

  function rowHasCentimeters(rowEl) {
    return !!qs(rowEl, ".centimeters-control");
  }

  function formatRowValue(rowEl) {
    if (!rowEl) return "";

    var hasM = rowHasMeters(rowEl);
    var hasCm = rowHasCentimeters(rowEl);

    var meters = hasM ? getPickerValue(qs(rowEl, ".meters-control")) : 0;
    var centimeters = hasCm ? getPickerValue(qs(rowEl, ".centimeters-control")) : 0;

    if (!hasM && !hasCm) return "";
    if (hasM && !hasCm) return meters > 0 ? meters + " м" : "";
    if (!hasM && hasCm) return centimeters > 0 ? centimeters + " см" : "";
    if (meters === 0 && centimeters === 0) return "";

    return meters + " м " + centimeters + " см";
  }

  function syncRowHidden(rowEl) {
    if (!rowEl) return;

    var hidden = qs(rowEl, ".hidden-dimension-input");
    if (!hidden) return;

    hidden.value = formatRowValue(rowEl);
  }

  function resetPickerRow(rowEl) {
    if (!rowEl) return;

    var metersControl = qs(rowEl, ".meters-control");
    var centimetersControl = qs(rowEl, ".centimeters-control");

    if (metersControl) setPickerValue(metersControl, 0);
    if (centimetersControl) setPickerValue(centimetersControl, 0);

    syncRowHidden(rowEl);
  }

  function resetPickerScope(scopeEl) {
    if (!scopeEl) return;

    qsa(scopeEl, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });

    clearHiddenInScope(scopeEl);
  }

  function handlePickerButtonClick(btn) {
    if (!btn) return;

    var row = btn.closest(".dimension-row");
    if (!row) return;

    var metersControl = qs(row, ".meters-control");
    var centimetersControl = qs(row, ".centimeters-control");

    var hasMeters = !!metersControl;
    var hasCm = !!centimetersControl;

    var meters = hasMeters ? getPickerValue(metersControl) : 0;
    var centimeters = hasCm ? getPickerValue(centimetersControl) : 0;

    if (hasAnyClass(btn, ["meter-up", "picker-btn/meter-up"])) {
      meters += 1;
      if (metersControl) setPickerValue(metersControl, meters);
      syncRowHidden(row);
      return;
    }

    if (hasAnyClass(btn, ["meter-down", "picker-btn/meter-down"])) {
      meters = Math.max(0, meters - 1);
      if (metersControl) setPickerValue(metersControl, meters);
      syncRowHidden(row);
      return;
    }

    if (hasAnyClass(btn, ["cm-up", "picker-btn/cm-up"])) {
      if (!hasCm) return;

      if (centimeters >= 95) {
        if (hasMeters) {
          centimeters = 0;
          meters += 1;
          if (metersControl) setPickerValue(metersControl, meters);
        } else {
          centimeters = 95;
        }
      } else {
        centimeters += 5;
      }

      setPickerValue(centimetersControl, centimeters);
      syncRowHidden(row);
      return;
    }

    if (hasAnyClass(btn, ["cm-down", "picker-btn/cm-down"])) {
      if (!hasCm) return;

      if (centimeters <= 0) {
        if (hasMeters && meters > 0) {
          meters -= 1;
          centimeters = 95;
          if (metersControl) setPickerValue(metersControl, meters);
        } else {
          centimeters = 0;
        }
      } else {
        centimeters -= 5;
      }

      setPickerValue(centimetersControl, centimeters);
      syncRowHidden(row);
      return;
    }
  }

  // =========================
  // ROOT REFERENCES
  // =========================
  var overlay = qs(document, ".section-overlay");
  var modalCard = qs(document, ".modal-card");
  var smartFormBlock = qs(document, ".smart-form-block");
  var formEl = qs(smartFormBlock, "form");
  var openButtons = qsa(document, ".open-smart-form");

  if (!overlay || !modalCard || !smartFormBlock || !formEl) {
    return;
  }

  // =========================
  // STEP REFERENCES
  // =========================
  var step1 = qs(smartFormBlock, ".step-1");

  var flowPrava = qs(smartFormBlock, ".flow-prava") || qs(smartFormBlock, ".step-3-prava") || qs(smartFormBlock, ".step-2-prava");
  var flowAglova = qs(smartFormBlock, ".flow-aglova") || qs(smartFormBlock, ".step-2-aglova");
  var flowP = qs(smartFormBlock, ".flow-p") || qs(smartFormBlock, ".step-2-p");

  var step3aAglova = qs(smartFormBlock, ".step-3a-aglova");
  var step3bAglova = qs(smartFormBlock, ".step-3b-aglova");

  var step3aP = qs(smartFormBlock, ".step-3a-p");
  var step3bP = qs(smartFormBlock, ".step-3b-p");
  var step3cP = qs(smartFormBlock, ".step-3c-p");

  // =========================
  // ACTIVE BRANCH
  // =========================
  var activeBranch = "";
  var activeKitchenType = "";

  function getBranchStepByKey(branchKey) {
    if (branchKey === "prava-3") return flowPrava;
    if (branchKey === "3a") return step3aAglova;
    if (branchKey === "3b") return step3bAglova;
    if (branchKey === "3a-p") return step3aP;
    if (branchKey === "3b-p") return step3bP;
    if (branchKey === "3c-p") return step3cP;
    return null;
  }

  function syncConfigurationHidden() {
    var label = "";

    if (activeBranch === "prava-3") label = "Права кухня";
    if (activeBranch === "3a") label = "Ъглова без комин";
    if (activeBranch === "3b") label = "Ъглова с комин";
    if (activeBranch === "3a-p") label = "П кухня без комин";
    if (activeBranch === "3b-p") label = "П кухня с комин отляво";
    if (activeBranch === "3c-p") label = "П кухня с комин отдясно";

    if (!label && activeKitchenType === "straight") label = "Права кухня";
    if (!label && activeKitchenType === "corner") label = "Ъглова кухня";
    if (!label && activeKitchenType === "u") label = "П кухня";

    setHidden("configuration", label);
  }

  function getVisibleStep() {
    var visible = null;

    [
      step1,
      flowPrava,
      flowAglova,
      flowP,
      step3aAglova,
      step3bAglova,
      step3aP,
      step3bP,
      step3cP
    ].forEach(function (step) {
      if (step && window.getComputedStyle(step).display !== "none") {
        visible = step;
      }
    });

    return visible;
  }

  function hideAllSteps() {
    [
      step1,
      flowPrava,
      flowAglova,
      flowP,
      step3aAglova,
      step3bAglova,
      step3aP,
      step3bP,
      step3cP
    ].forEach(function (step) {
      if (!step) return;
      hide(step);
      setFieldsState(step, false);
    });
  }

  function showStep(stepEl) {
    hideAllSteps();
    show(stepEl, "block");
    setFieldsState(stepEl, true);
  }

  function applyBranchState() {
    [flowPrava, step3aAglova, step3bAglova, step3aP, step3bP, step3cP].forEach(function (step) {
      if (!step) return;
      setFieldsState(step, false);
    });

    var activeStepEl = getBranchStepByKey(activeBranch);
    if (activeStepEl && getVisibleStep() === activeStepEl) {
      setFieldsState(activeStepEl, true);
    }
  }

  function beforeRealSubmit() {
    [flowPrava, step3aAglova, step3bAglova, step3aP, step3bP, step3cP].forEach(function (step) {
      if (!step) return;
      setFieldsState(step, false);
    });

    var activeStepEl = getBranchStepByKey(activeBranch);
    if (activeStepEl && getVisibleStep() === activeStepEl) {
      setFieldsState(activeStepEl, true);
    }
  }

  // =========================
  // HUMAN SUMMARY
  // =========================
  function readValue(name) {
    var el = qs(formEl, '[name="' + name + '"]');
    if (!el) return "";
    return (el.value || "").trim();
  }

  function yesNo(v) {
    if (!v) return "";
    var low = String(v).toLowerCase();
    if (low === "yes" || low === "да") return "Да";
    if (low === "no" || low === "не") return "Не";
    return v;
  }

  function pushIf(lines, label, value) {
    if (!value) return;
    lines.push(label + ": " + value);
  }

  function buildReadableSummary() {
    var lines = [];
    var summary = qs(formEl, '[name="summary_readable"]');
    if (!summary) return;

    syncConfigurationHidden();
    pushIf(lines, "Конфигурация", readValue("configuration"));

    if (activeBranch === "prava-3" || activeKitchenType === "straight") {
      pushIf(lines, "Позиция", readValue("water_prava_3"));
      pushIf(lines, "Дължина", readValue("length_1_prava_3"));
      pushIf(lines, "Височина", readValue("height_prava_3"));
      pushIf(lines, "Бар", yesNo(readValue("has_bar_prava_3")));
      pushIf(lines, "Бар дължина", readValue("bar_length_prava_3"));
      pushIf(lines, "Бар височина", readValue("bar_height_prava_3"));
      pushIf(lines, "Остров", yesNo(readValue("has_island_prava_3")));
      pushIf(lines, "Остров дължина", readValue("island_length_prava_3"));
      pushIf(lines, "Остров височина", readValue("island_height_prava_3"));
      pushIf(lines, "Колона за фурна", yesNo(readValue("tall_unit_prava_3")));
      pushIf(lines, "Хладилник", readValue("fridge_prava_3"));
      pushIf(lines, "Визия", readValue("vision_prava_3"));
      pushIf(lines, "Кога планирате", readValue("plan_prava_3"));
      pushIf(lines, "Предпочитан контакт", readValue("contact_preference_rava_3"));
    }

    if (activeBranch === "3a") {
      pushIf(lines, "Вода", readValue("water_position_3a"));
      pushIf(lines, "Комин", readValue("chimney_position_3a"));
      pushIf(lines, "Стена 1", readValue("stena1_3a"));
      pushIf(lines, "Стена 2", readValue("stena2_3a"));
      pushIf(lines, "Височина", readValue("visochina_3a"));
      pushIf(lines, "Бар", yesNo(readValue("bar_enabled_3a")));
      pushIf(lines, "Бар дължина", readValue("bar_length_3a"));
      pushIf(lines, "Бар дълбочина", readValue("bar_depth_3a"));
      pushIf(lines, "Остров", yesNo(readValue("island_enabled_3a")));
      pushIf(lines, "Остров дължина", readValue("island_length_3a"));
      pushIf(lines, "Остров дълбочина", readValue("island_depth_3a"));
      pushIf(lines, "Колона за фурна", yesNo(readValue("oven_tall_unit_3a")));
      pushIf(lines, "Хладилник", readValue("fridge_type_3a"));
      pushIf(lines, "Съдомиялна", yesNo(readValue("dishwasher_aglova_3a")));
      pushIf(lines, "Пералня", yesNo(readValue("washing_machine_aglova_3a")));
      pushIf(lines, "Микровълнова", yesNo(readValue("microwave_aglova_3a")));
      pushIf(lines, "Кафе машина", yesNo(readValue("coffee_machine_aglova_3a")));
    }

    if (activeBranch === "3b") {
      pushIf(lines, "Вода", readValue("water_position_3b"));
      pushIf(lines, "Комин", readValue("chimney_position_3b"));
      pushIf(lines, "Стена 1", readValue("stena1_3b"));
      pushIf(lines, "Стена 2", readValue("stena2_3b"));
      pushIf(lines, "Височина", readValue("visochina_3b"));
      pushIf(lines, "Комин A", readValue("komin_a_3b"));
      pushIf(lines, "Комин B", readValue("komin_b_3b"));
      pushIf(lines, "Бар", yesNo(readValue("bar_enabled_3b")));
      pushIf(lines, "Бар дължина", readValue("bar_length_3b"));
      pushIf(lines, "Бар дълбочина", readValue("bar_depth_3b"));
      pushIf(lines, "Остров", yesNo(readValue("island_enabled_3b")));
      pushIf(lines, "Остров дължина", readValue("island_length_3b"));
      pushIf(lines, "Остров дълбочина", readValue("island_depth_3b"));
      pushIf(lines, "Колона за фурна", yesNo(readValue("oven_tall_unit_3b")));
      pushIf(lines, "Хладилник", readValue("fridge_type_3b"));
    }

    if (activeBranch === "3a-p") {
      pushIf(lines, "Вода", readValue("water_position_p_3a"));
      pushIf(lines, "Котлони", readValue("hob_position_p_3a"));
      pushIf(lines, "Стена 1", readValue("stena1_p_3a"));
      pushIf(lines, "Стена 2", readValue("stena2_p_3a"));
      pushIf(lines, "Стена 3", readValue("stena3_p_3a"));
      pushIf(lines, "Височина", readValue("visochina_p_3a"));
      pushIf(lines, "Бар", yesNo(readValue("bar_enabled_p_3a")));
      pushIf(lines, "Бар дължина", readValue("bar_length_p_3a"));
      pushIf(lines, "Бар дълбочина", readValue("bar_depth_p_3a"));
      pushIf(lines, "Остров", yesNo(readValue("island_enabled_p_3a")));
      pushIf(lines, "Остров дължина", readValue("island_length_p_3a"));
      pushIf(lines, "Остров дълбочина", readValue("island_depth_p_3a"));
      pushIf(lines, "Колона за фурна", yesNo(readValue("oven_tall_unit_p_3a")));
      pushIf(lines, "Хладилник", readValue("fridge_type_p_3a"));
    }

    if (activeBranch === "3b-p") {
      pushIf(lines, "Вода", readValue("water_position_p_3b"));
      pushIf(lines, "Котлони", readValue("hob_position_p_3b"));
      pushIf(lines, "Стена 1", readValue("stena1_p_3b"));
      pushIf(lines, "Стена 2", readValue("stena2_p_3b"));
      pushIf(lines, "Стена 3", readValue("stena3_p_3b"));
      pushIf(lines, "Височина", readValue("visochina_p_3b"));
      pushIf(lines, "Комин A", readValue("komin_a_p_3b"));
      pushIf(lines, "Комин B", readValue("komin_b_p_3b"));
      pushIf(lines, "Бар", yesNo(readValue("bar_enabled_p_3b")));
      pushIf(lines, "Бар дължина", readValue("bar_length_p_3b"));
      pushIf(lines, "Бар дълбочина", readValue("bar_depth_p_3b"));
      pushIf(lines, "Остров", yesNo(readValue("island_enabled_p_3b")));
      pushIf(lines, "Остров дължина", readValue("island_length_p_3b"));
      pushIf(lines, "Остров дълбочина", readValue("island_depth_p_3b"));
      pushIf(lines, "Колона за фурна", yesNo(readValue("oven_tall_unit_p_3b")));
      pushIf(lines, "Хладилник", readValue("fridge_type_p_3b"));
    }

    if (activeBranch === "3c-p") {
      pushIf(lines, "Вода", readValue("water_position_p_3c"));
      pushIf(lines, "Котлони", readValue("hob_position_p_3c"));
      pushIf(lines, "Стена 1", readValue("stena1_p_3c"));
      pushIf(lines, "Стена 2", readValue("stena2_p_3c"));
      pushIf(lines, "Стена 3", readValue("stena3_p_3c"));
      pushIf(lines, "Височина", readValue("visochina_p_3c"));
      pushIf(lines, "Комин A", readValue("komin_a_p_3c"));
      pushIf(lines, "Комин B", readValue("komin_b_p_3c"));
      pushIf(lines, "Бар", yesNo(readValue("bar_enabled_p_3c")));
      pushIf(lines, "Бар дължина", readValue("bar_length_p_3c"));
      pushIf(lines, "Бар дълбочина", readValue("bar_depth_p_3c"));
      pushIf(lines, "Остров", yesNo(readValue("island_enabled_p_3c")));
      pushIf(lines, "Остров дължина", readValue("island_length_p_3c"));
      pushIf(lines, "Остров дълбочина", readValue("island_depth_p_3c"));
      pushIf(lines, "Колона за фурна", yesNo(readValue("oven_tall_unit_p_3c")));
      pushIf(lines, "Хладилник", readValue("fridge_type_p_3c"));
    }

    summary.value = lines.join("\n");
  }

  // =========================
  // MODAL OPEN / CLOSE
  // =========================
  function openModal() {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";

    activeBranch = "";
    activeKitchenType = "";
    hideAllSteps();

    if (step1) showStep(step1);
    syncConfigurationHidden();
    applyBranchState();
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
    if (!modalCard.contains(e.target)) {
      closeModal();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeModal();
    }
  });

  // =========================
  // INITIAL STATE
  // =========================
  hideAllSteps();
  if (step1) showStep(step1);
  syncConfigurationHidden();
  applyBranchState();

  // =========================
  // STEP 1 -> FLOW
  // =========================
  if (step1) {
    qsa(step1, ".kitchen-card").forEach(function (card, index) {
      card.style.cursor = "pointer";

      card.addEventListener("click", function (e) {
        e.preventDefault();

        activeBranch = "";

        if (index === 0 && flowPrava) {
          activeKitchenType = "straight";
          activeBranch = "prava-3";
          syncConfigurationHidden();
          resetPravaState();
          showStep(flowPrava);
          applyBranchState();
          return;
        }

        if (index === 1 && flowAglova) {
          activeKitchenType = "corner";
          syncConfigurationHidden();
          showStep(flowAglova);
          return;
        }

        if (index === 2 && flowP) {
          activeKitchenType = "u";
          syncConfigurationHidden();
          showStep(flowP);
          return;
        }
      });
    });
  }

  // =========================
  // FLOW PRAVA
  // =========================
  var comboSelectWrapPrava = null;
  var dimensionsPhaseWrapPrava = null;
  var barWrapPrava = null;
  var islandWrapPrava = null;

  var cadBasePrava = null;
  var cadSketch36 = null;
  var cadSketch37 = null;
  var allPravaCads = [];

  var statePrava = {
    combo: "",
    bar: "no",
    island: "no",
    oven: "no",
    fridge: ""
  };

  function showPravaCad(cadEl) {
    hideAll(allPravaCads);
    show(cadEl);
  }

  function updatePravaCadByPill(pill) {
    if (!pill) {
      showPravaCad(cadBasePrava);
      return;
    }

    if (pill.classList.contains("chimney-left") || pill.classList.contains("water-left") || pill.classList.contains("left")) {
      showPravaCad(cadSketch36 || cadBasePrava);
      return;
    }

    if (pill.classList.contains("chimney-right") || pill.classList.contains("water-right") || pill.classList.contains("right")) {
      showPravaCad(cadSketch37 || cadBasePrava);
      return;
    }

    var allPills = qsa(comboSelectWrapPrava, ".option-pill");
    var index = allPills.indexOf(pill);

    if (index === 0) {
      showPravaCad(cadSketch36 || cadBasePrava);
      return;
    }

    if (index === 1) {
      showPravaCad(cadSketch37 || cadBasePrava);
      return;
    }

    showPravaCad(cadBasePrava);
  }

  function revealPravaDimensionsIfReady(pill) {
    if (!statePrava.combo) return;

    updatePravaCadByPill(pill);

    if (comboSelectWrapPrava) hide(comboSelectWrapPrava);
    if (dimensionsPhaseWrapPrava) show(dimensionsPhaseWrapPrava, "block");
  }

  function resetPravaState() {
    if (!flowPrava) return;

    statePrava = {
      combo: "",
      bar: "no",
      island: "no",
      oven: "no",
      fridge: ""
    };

    comboSelectWrapPrava = qs(flowPrava, ".combo-select-wrap");
    dimensionsPhaseWrapPrava = qs(flowPrava, ".dimensions-phase-wrap");
    barWrapPrava = qs(flowPrava, ".bar-wrap");
    islandWrapPrava = qs(flowPrava, ".island-wrap");

    cadBasePrava = qs(flowPrava, ".cad-prava-base");
    cadSketch36 = qs(flowPrava, ".cad-prava-sketch-36");
    cadSketch37 = qs(flowPrava, ".cad-prava-sketch-37");
    allPravaCads = [cadBasePrava, cadSketch36, cadSketch37];

    removeActiveInScope(flowPrava, ".option-pill");
    clearHiddenInScope(flowPrava);

    qsa(flowPrava, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });

    hideAll(allPravaCads);
    showPravaCad(cadBasePrava);

    if (comboSelectWrapPrava) show(comboSelectWrapPrava, "block");
    if (dimensionsPhaseWrapPrava) hide(dimensionsPhaseWrapPrava);

    if (barWrapPrava) hide(barWrapPrava);
    if (islandWrapPrava) hide(islandWrapPrava);

    setHidden("water_prava_3", "");
    setHidden("length_1_prava_3", "");
    setHidden("height_prava_3", "");
    setHidden("has_bar_prava_3", "no");
    setHidden("bar_length_prava_3", "");
    setHidden("bar_height_prava_3", "");
    setHidden("has_island_prava_3", "no");
    setHidden("island_length_prava_3", "");
    setHidden("island_height_prava_3", "");
    setHidden("tall_unit_prava_3", "no");
    setHidden("fridge_prava_3", "");
    setHidden("vision_prava_3", "");
    setHidden("plan_prava_3", "");
    setHidden("contact_preference_rava_3", "");
  }

  if (flowPrava) {
    resetPravaState();

    flowPrava.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn && flowPrava.contains(pickerBtn)) {
        e.preventDefault();
        handlePickerButtonClick(pickerBtn);
        return;
      }

      var resetBtn = e.target.closest(".reset-combo-button");
      if (resetBtn) {
        e.preventDefault();
        resetPravaState();
        return;
      }

      var comboPill = e.target.closest(".combo-select-wrap .option-pill");
      if (comboPill) {
        e.preventDefault();
        setSingleActive(comboPill);
        statePrava.combo = getTextOrDataValue(comboPill);
        setHidden("water_prava_3", statePrava.combo);
        setFirstHiddenInScope(comboPill.closest(".question-wrap"), statePrava.combo);
        revealPravaDimensionsIfReady(comboPill);
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        statePrava.island = islandOn ? "yes" : "no";

        setHidden("has_island_prava_3", islandOn ? "yes" : "no");
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrapPrava, "block");
        } else {
          hide(islandWrapPrava);
          resetPickerScope(islandWrapPrava);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (targetBarYes) {
        e.preventDefault();

        var barOn = toggleActive(targetBarYes);
        statePrava.bar = barOn ? "yes" : "no";

        setHidden("has_bar_prava_3", barOn ? "yes" : "no");
        setFirstHiddenInScope(targetBarYes.closest(".question-wrap"), barOn ? "Да" : "Не");

        if (barOn) {
          show(barWrapPrava, "block");
        } else {
          hide(barWrapPrava);
          resetPickerScope(barWrapPrava);
        }
        return;
      }

      var targetOvenYes = e.target.closest(".oven-column-yes");
      if (targetOvenYes) {
        e.preventDefault();

        var ovenOn = toggleActive(targetOvenYes);
        statePrava.oven = ovenOn ? "yes" : "no";

        setHidden("tall_unit_prava_3", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        statePrava.fridge = "built-in";
        setHidden("fridge_prava_3", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        statePrava.fridge = "free-standing";
        setHidden("fridge_prava_3", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // =========================
  // FLOW AGLOVA
  // =========================
  if (flowAglova) {
    var aglovaChoiceNoCorner = qs(flowAglova, ".choice-card-no-corner");
    var aglovaChoiceWithCorner = qs(flowAglova, ".choice-card-with-corner");

    if (aglovaChoiceNoCorner) {
      aglovaChoiceNoCorner.style.cursor = "pointer";
      aglovaChoiceNoCorner.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3a";
        activeKitchenType = "corner";
        syncConfigurationHidden();
        setHidden("aglova-has-corner", "no");
        resetStep3aState();
        if (step3aAglova) showStep(step3aAglova);
        applyBranchState();
      });
    }

    if (aglovaChoiceWithCorner) {
      aglovaChoiceWithCorner.style.cursor = "pointer";
      aglovaChoiceWithCorner.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3b";
        activeKitchenType = "corner";
        syncConfigurationHidden();
        setHidden("aglova-has-corner", "yes");
        resetStep3bState();
        if (step3bAglova) showStep(step3bAglova);
        applyBranchState();
      });
    }
  }

  // =========================
  // STEP 3A AGLOVA
  // =========================
  var comboSelectWrap3a = null;
  var dimensionsPhaseWrap3a = null;
  var barWrap3a = null;
  var islandWrap3a = null;

  var cadBase3a = null;
  var cadSketch1 = null;
  var cadSketch2 = null;
  var cadSketch3 = null;
  var cadSketch4 = null;
  var all3aCads = [];

  var state3a = {
    water: "",
    chimney: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function show3aCad(cadEl) {
    hideAll(all3aCads);
    show(cadEl);
  }

  function update3aCad() {
    if (!state3a.water || !state3a.chimney) {
      show3aCad(cadBase3a);
      return;
    }

    if (state3a.water === "2" && state3a.chimney === "1") return show3aCad(cadSketch1);
    if (state3a.water === "2" && state3a.chimney === "4") return show3aCad(cadSketch2);
    if (state3a.water === "3" && state3a.chimney === "1") return show3aCad(cadSketch3);
    if (state3a.water === "3" && state3a.chimney === "4") return show3aCad(cadSketch4);

    show3aCad(cadBase3a);
  }

  function reveal3aDimensionsIfReady() {
    if (!state3a.water || !state3a.chimney) return;

    update3aCad();

    if (comboSelectWrap3a) hide(comboSelectWrap3a);
    if (dimensionsPhaseWrap3a) show(dimensionsPhaseWrap3a, "block");
  }

  function resetStep3aState() {
    if (!step3aAglova) return;

    state3a = {
      water: "",
      chimney: "",
      island: "no",
      bar: "no",
      oven: "no",
      fridge: ""
    };

    comboSelectWrap3a = qs(step3aAglova, ".combo-select-wrap");
    dimensionsPhaseWrap3a = qs(step3aAglova, ".dimensions-phase-wrap");
    barWrap3a = qs(step3aAglova, ".bar-wrap");
    islandWrap3a = qs(step3aAglova, ".island-wrap");

    cadBase3a = qs(step3aAglova, ".cad-3a-base");
    cadSketch1 = qs(step3aAglova, ".cad-3a-sketch-1");
    cadSketch2 = qs(step3aAglova, ".cad-3a-sketch-2");
    cadSketch3 = qs(step3aAglova, ".cad-3a-sketch-3");
    cadSketch4 = qs(step3aAglova, ".cad-3a-sketch-4");
    all3aCads = [cadBase3a, cadSketch1, cadSketch2, cadSketch3, cadSketch4];

    removeActiveInScope(step3aAglova, ".option-pill");
    clearHiddenInScope(step3aAglova);

    qsa(step3aAglova, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });

    hideAll(all3aCads);
    show3aCad(cadBase3a);

    if (comboSelectWrap3a) show(comboSelectWrap3a, "block");
    if (dimensionsPhaseWrap3a) hide(dimensionsPhaseWrap3a);

    if (barWrap3a) hide(barWrap3a);
    if (islandWrap3a) hide(islandWrap3a);

    setHidden("water_position_3a", "");
    setHidden("chimney_position_3a", "");
    setHidden("bar_enabled_3a", "no");
    setHidden("island_enabled_3a", "no");
    setHidden("oven_tall_unit_3a", "no");
    setHidden("fridge_type_3a", "");
  }

  if (step3aAglova) {
    resetStep3aState();

    step3aAglova.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn && step3aAglova.contains(pickerBtn)) {
        e.preventDefault();
        handlePickerButtonClick(pickerBtn);
        return;
      }

      var resetBtn = e.target.closest(".reset-combo-button");
      if (resetBtn) {
        e.preventDefault();
        resetStep3aState();
        return;
      }

      var targetWater2 = e.target.closest(".water-pos-2");
      var targetWater3 = e.target.closest(".water-pos-3");
      var targetChimney1 = e.target.closest(".chimney-pos-1");
      var targetChimney4 = e.target.closest(".chimney-pos-4");

      if (targetWater2) {
        e.preventDefault();
        setSingleActive(targetWater2);
        state3a.water = "2";
        setHidden("water_position_3a", "Стена 2");
        setFirstHiddenInScope(targetWater2.closest(".question-wrap"), "Стена 2");
        reveal3aDimensionsIfReady();
        return;
      }

      if (targetWater3) {
        e.preventDefault();
        setSingleActive(targetWater3);
        state3a.water = "3";
        setHidden("water_position_3a", "Стена 3");
        setFirstHiddenInScope(targetWater3.closest(".question-wrap"), "Стена 3");
        reveal3aDimensionsIfReady();
        return;
      }

      if (targetChimney1) {
        e.preventDefault();
        setSingleActive(targetChimney1);
        state3a.chimney = "1";
        setHidden("chimney_position_3a", "Стена 1");
        setFirstHiddenInScope(targetChimney1.closest(".question-wrap"), "Стена 1");
        reveal3aDimensionsIfReady();
        return;
      }

      if (targetChimney4) {
        e.preventDefault();
        setSingleActive(targetChimney4);
        state3a.chimney = "4";
        setHidden("chimney_position_3a", "Стена 4");
        setFirstHiddenInScope(targetChimney4.closest(".question-wrap"), "Стена 4");
        reveal3aDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        state3a.island = islandOn ? "yes" : "no";

        setHidden("island_enabled_3a", islandOn ? "yes" : "no");
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3a, "block");
        } else {
          hide(islandWrap3a);
          resetPickerScope(islandWrap3a);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (targetBarYes) {
        e.preventDefault();

        var barOn = toggleActive(targetBarYes);
        state3a.bar = barOn ? "yes" : "no";

        setHidden("bar_enabled_3a", barOn ? "yes" : "no");
        setFirstHiddenInScope(targetBarYes.closest(".question-wrap"), barOn ? "Да" : "Не");

        if (barOn) {
          show(barWrap3a, "block");
        } else {
          hide(barWrap3a);
          resetPickerScope(barWrap3a);
        }
        return;
      }

      var targetOvenYes = e.target.closest(".oven-column-yes");
      if (targetOvenYes) {
        e.preventDefault();

        var ovenOn = toggleActive(targetOvenYes);
        state3a.oven = ovenOn ? "yes" : "no";

        setHidden("oven_tall_unit_3a", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3a.fridge = "built-in";
        setHidden("fridge_type_3a", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3a.fridge = "free-standing";
        setHidden("fridge_type_3a", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }
  <script>
  // =========================
  // STEP 3B AGLOVA
  // =========================
  var comboSelectWrap3b = null;
  var dimensionsPhaseWrap3b = null;
  var barWrap3b = null;
  var islandWrap3b = null;

  var cadBase3b = null;
  var cadSketch5 = null;
  var cadSketch6 = null;
  var cadSketch7 = null;
  var cadSketch8 = null;
  var all3bCads = [];

  var state3b = {
    water: "",
    chimney: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function show3bCad(cadEl) {
    hideAll(all3bCads);
    show(cadEl);
  }

  function update3bCad() {
    if (!state3b.water || !state3b.chimney) {
      show3bCad(cadBase3b);
      return;
    }

    if (state3b.water === "2" && state3b.chimney === "a") return show3bCad(cadSketch5);
    if (state3b.water === "2" && state3b.chimney === "b") return show3bCad(cadSketch6);
    if (state3b.water === "3" && state3b.chimney === "a") return show3bCad(cadSketch7);
    if (state3b.water === "3" && state3b.chimney === "b") return show3bCad(cadSketch8);

    show3bCad(cadBase3b);
  }

  function reveal3bDimensionsIfReady() {
    if (!state3b.water || !state3b.chimney) return;

    update3bCad();

    if (comboSelectWrap3b) hide(comboSelectWrap3b);
    if (dimensionsPhaseWrap3b) show(dimensionsPhaseWrap3b, "block");
  }

  function resetStep3bState() {
    if (!step3bAglova) return;

    state3b = {
      water: "",
      chimney: "",
      island: "no",
      bar: "no",
      oven: "no",
      fridge: ""
    };

    comboSelectWrap3b = qs(step3bAglova, ".combo-select-wrap");
    dimensionsPhaseWrap3b = qs(step3bAglova, ".dimensions-phase-wrap");
    barWrap3b = qs(step3bAglova, ".bar-wrap");
    islandWrap3b = qs(step3bAglova, ".island-wrap");

    cadBase3b = qs(step3bAglova, ".cad-3b-base");
    cadSketch5 = qs(step3bAglova, ".cad-3b-sketch-5");
    cadSketch6 = qs(step3bAglova, ".cad-3b-sketch-6");
    cadSketch7 = qs(step3bAglova, ".cad-3b-sketch-7");
    cadSketch8 = qs(step3bAglova, ".cad-3b-sketch-8");
    all3bCads = [cadBase3b, cadSketch5, cadSketch6, cadSketch7, cadSketch8];

    removeActiveInScope(step3bAglova, ".option-pill");
    clearHiddenInScope(step3bAglova);

    qsa(step3bAglova, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });

    hideAll(all3bCads);
    show3bCad(cadBase3b);

    if (comboSelectWrap3b) show(comboSelectWrap3b, "block");
    if (dimensionsPhaseWrap3b) hide(dimensionsPhaseWrap3b);

    if (barWrap3b) hide(barWrap3b);
    if (islandWrap3b) hide(islandWrap3b);

    setHidden("water_position_3b", "");
    setHidden("chimney_position_3b", "");
    setHidden("bar_enabled_3b", "no");
    setHidden("island_enabled_3b", "no");
    setHidden("oven_tall_unit_3b", "no");
    setHidden("fridge_type_3b", "");
  }

  if (step3bAglova) {
    resetStep3bState();

    step3bAglova.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn && step3bAglova.contains(pickerBtn)) {
        e.preventDefault();
        handlePickerButtonClick(pickerBtn);
        return;
      }

      var resetBtn = e.target.closest(".reset-combo-button");
      if (resetBtn) {
        e.preventDefault();
        resetStep3bState();
        return;
      }

      var targetWater2 = e.target.closest(".water-pos-2");
      var targetWater3 = e.target.closest(".water-pos-3");
      var targetChimneyA = e.target.closest(".chimney-pos-a");
      var targetChimneyB = e.target.closest(".chimney-pos-b");

      if (targetWater2) {
        e.preventDefault();
        setSingleActive(targetWater2);
        state3b.water = "2";
        setHidden("water_position_3b", "Стена 2");
        setFirstHiddenInScope(targetWater2.closest(".question-wrap"), "Стена 2");
        reveal3bDimensionsIfReady();
        return;
      }

      if (targetWater3) {
        e.preventDefault();
        setSingleActive(targetWater3);
        state3b.water = "3";
        setHidden("water_position_3b", "Стена 3");
        setFirstHiddenInScope(targetWater3.closest(".question-wrap"), "Стена 3");
        reveal3bDimensionsIfReady();
        return;
      }

      if (targetChimneyA) {
        e.preventDefault();
        setSingleActive(targetChimneyA);
        state3b.chimney = "a";
        setHidden("chimney_position_3b", "Позиция A");
        setFirstHiddenInScope(targetChimneyA.closest(".question-wrap"), "Позиция A");
        reveal3bDimensionsIfReady();
        return;
      }

      if (targetChimneyB) {
        e.preventDefault();
        setSingleActive(targetChimneyB);
        state3b.chimney = "b";
        setHidden("chimney_position_3b", "Позиция B");
        setFirstHiddenInScope(targetChimneyB.closest(".question-wrap"), "Позиция B");
        reveal3bDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        state3b.island = islandOn ? "yes" : "no";

        setHidden("island_enabled_3b", islandOn ? "yes" : "no");
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3b, "block");
        } else {
          hide(islandWrap3b);
          resetPickerScope(islandWrap3b);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (targetBarYes) {
        e.preventDefault();

        var barOn = toggleActive(targetBarYes);
        state3b.bar = barOn ? "yes" : "no";

        setHidden("bar_enabled_3b", barOn ? "yes" : "no");
        setFirstHiddenInScope(targetBarYes.closest(".question-wrap"), barOn ? "Да" : "Не");

        if (barOn) {
          show(barWrap3b, "block");
        } else {
          hide(barWrap3b);
          resetPickerScope(barWrap3b);
        }
        return;
      }

      var targetOvenYes = e.target.closest(".oven-column-yes");
      if (targetOvenYes) {
        e.preventDefault();

        var ovenOn = toggleActive(targetOvenYes);
        state3b.oven = ovenOn ? "yes" : "no";

        setHidden("oven_tall_unit_3b", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3b.fridge = "built-in";
        setHidden("fridge_type_3b", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3b.fridge = "free-standing";
        setHidden("fridge_type_3b", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // =========================
  // FLOW P
  // =========================
  if (flowP) {
    var pChoiceNoChimney = qs(flowP, ".choice-card-no-chimney");
    var pChoiceLeftChimney = qs(flowP, ".choice-card-left-chimney");
    var pChoiceRightChimney = qs(flowP, ".choice-card-right-chimney");

    if (pChoiceNoChimney) {
      pChoiceNoChimney.style.cursor = "pointer";
      pChoiceNoChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3a-p";
        activeKitchenType = "u";
        syncConfigurationHidden();
        resetStep3aPState();
        if (step3aP) showStep(step3aP);
        applyBranchState();
      });
    }

    if (pChoiceLeftChimney) {
      pChoiceLeftChimney.style.cursor = "pointer";
      pChoiceLeftChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3b-p";
        activeKitchenType = "u";
        syncConfigurationHidden();
        resetStep3bPState();
        if (step3bP) showStep(step3bP);
        applyBranchState();
      });
    }

    if (pChoiceRightChimney) {
      pChoiceRightChimney.style.cursor = "pointer";
      pChoiceRightChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3c-p";
        activeKitchenType = "u";
        syncConfigurationHidden();
        resetStep3cPState();
        if (step3cP) showStep(step3cP);
        applyBranchState();
      });
    }
  }

  // =========================
  // STEP 3A P
  // =========================
  var comboSelectWrap3aP = null;
  var dimensionsPhaseWrap3aP = null;
  var barWrap3aP = null;
  var islandWrap3aP = null;

  var cadBase3aP = null;
  var all3aPCads = [];

  var state3aP = {
    water: "",
    hob: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function show3aPCad(cadEl) {
    hideAll(all3aPCads);
    show(cadEl);
  }

  function update3aPCad() {
    if (!state3aP.water || !state3aP.hob) {
      show3aPCad(cadBase3aP);
      return;
    }

    var map = {
      "1-1": ".cad-p-sketch-9",
      "1-2": ".cad-p-sketch-10",
      "1-3": ".cad-p-sketch-11",
      "2-1": ".cad-p-sketch-12",
      "2-2": ".cad-p-sketch-13",
      "2-3": ".cad-p-sketch-14",
      "3-1": ".cad-p-sketch-15",
      "3-2": ".cad-p-sketch-16",
      "3-3": ".cad-p-sketch-17"
    };

    var key = state3aP.water + "-" + state3aP.hob;
    var target = qs(step3aP, map[key]);

    if (target) {
      show3aPCad(target);
    } else {
      show3aPCad(cadBase3aP);
    }
  }

  function reveal3aPDimensionsIfReady() {
    if (!state3aP.water || !state3aP.hob) return;

    update3aPCad();

    if (comboSelectWrap3aP) hide(comboSelectWrap3aP);
    if (dimensionsPhaseWrap3aP) show(dimensionsPhaseWrap3aP, "block");
  }

  function resetStep3aPState() {
    if (!step3aP) return;

    state3aP = {
      water: "",
      hob: "",
      island: "no",
      bar: "no",
      oven: "no",
      fridge: ""
    };

    comboSelectWrap3aP = qs(step3aP, ".combo-select-wrap");
    dimensionsPhaseWrap3aP = qs(step3aP, ".dimensions-phase-wrap");
    barWrap3aP = qs(step3aP, ".bar-wrap");
    islandWrap3aP = qs(step3aP, ".island-wrap");

    cadBase3aP = qs(step3aP, ".cad-p-3a-base");
    all3aPCads = qsa(step3aP, ".cad-global-wrap img");

    removeActiveInScope(step3aP, ".option-pill");
    clearHiddenInScope(step3aP);

    qsa(step3aP, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });

    hideAll(all3aPCads);
    show3aPCad(cadBase3aP);

    if (comboSelectWrap3aP) show(comboSelectWrap3aP, "block");
    if (dimensionsPhaseWrap3aP) hide(dimensionsPhaseWrap3aP);

    if (barWrap3aP) hide(barWrap3aP);
    if (islandWrap3aP) hide(islandWrap3aP);

    setHidden("water_position_p_3a", "");
    setHidden("hob_position_p_3a", "");
    setHidden("bar_enabled_p_3a", "no");
    setHidden("oven_tall_unit_p_3a", "no");
    setHidden("fridge_type_p_3a", "");
    setHidden("island_enabled_p_3a", "no");
  }

  if (step3aP) {
    resetStep3aPState();

    step3aP.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn && step3aP.contains(pickerBtn)) {
        e.preventDefault();
        handlePickerButtonClick(pickerBtn);
        return;
      }

      var resetBtn = e.target.closest(".reset-combo-button");
      if (resetBtn) {
        e.preventDefault();
        resetStep3aPState();
        return;
      }

      var water1 = e.target.closest(".water-pos-1");
      var water2 = e.target.closest(".water-pos-2");
      var water3 = e.target.closest(".water-pos-3");
      var hob1 = e.target.closest(".hob-pos-1");
      var hob2 = e.target.closest(".hob-pos-2");
      var hob3 = e.target.closest(".hob-pos-3");

      if (water1) {
        e.preventDefault();
        setSingleActive(water1);
        state3aP.water = "1";
        setHidden("water_position_p_3a", "Позиция 1");
        setFirstHiddenInScope(water1.closest(".question-wrap"), "Позиция 1");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3aP.water = "2";
        setHidden("water_position_p_3a", "Позиция 2");
        setFirstHiddenInScope(water2.closest(".question-wrap"), "Позиция 2");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3aP.water = "3";
        setHidden("water_position_p_3a", "Позиция 3");
        setFirstHiddenInScope(water3.closest(".question-wrap"), "Позиция 3");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (hob1) {
        e.preventDefault();
        setSingleActive(hob1);
        state3aP.hob = "1";
        setHidden("hob_position_p_3a", "Позиция 1");
        setFirstHiddenInScope(hob1.closest(".question-wrap"), "Позиция 1");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (hob2) {
        e.preventDefault();
        setSingleActive(hob2);
        state3aP.hob = "2";
        setHidden("hob_position_p_3a", "Позиция 2");
        setFirstHiddenInScope(hob2.closest(".question-wrap"), "Позиция 2");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (hob3) {
        e.preventDefault();
        setSingleActive(hob3);
        state3aP.hob = "3";
        setHidden("hob_position_p_3a", "Позиция 3");
        setFirstHiddenInScope(hob3.closest(".question-wrap"), "Позиция 3");
        reveal3aPDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        state3aP.island = islandOn ? "yes" : "no";

        setHidden("island_enabled_p_3a", islandOn ? "yes" : "no");
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3aP, "block");
        } else {
          hide(islandWrap3aP);
          resetPickerScope(islandWrap3aP);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (targetBarYes) {
        e.preventDefault();

        var barOn = toggleActive(targetBarYes);
        state3aP.bar = barOn ? "yes" : "no";

        setHidden("bar_enabled_p_3a", barOn ? "yes" : "no");
        setFirstHiddenInScope(targetBarYes.closest(".question-wrap"), barOn ? "Да" : "Не");

        if (barOn) {
          show(barWrap3aP, "block");
        } else {
          hide(barWrap3aP);
          resetPickerScope(barWrap3aP);
        }
        return;
      }

      var targetOvenYes = e.target.closest(".oven-column-yes");
      if (targetOvenYes) {
        e.preventDefault();

        var ovenOn = toggleActive(targetOvenYes);
        state3aP.oven = ovenOn ? "yes" : "no";

        setHidden("oven_tall_unit_p_3a", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3aP.fridge = "built-in";
        setHidden("fridge_type_p_3a", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3aP.fridge = "free-standing";
        setHidden("fridge_type_p_3a", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // =========================
  // STEP 3B P
  // =========================
  var comboSelectWrap3bP = null;
  var dimensionsPhaseWrap3bP = null;
  var barWrap3bP = null;
  var islandWrap3bP = null;

  var cadBase3bP = null;
  var all3bPCads = [];

  var state3bP = {
    water: "",
    hob: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function show3bPCad(cadEl) {
    hideAll(all3bPCads);
    show(cadEl);
  }

  function update3bPCad() {
    if (!state3bP.water || !state3bP.hob) {
      show3bPCad(cadBase3bP);
      return;
    }

    var map = {
      "1-1": ".cad-p-sketch-18",
      "1-2": ".cad-p-sketch-19",
      "1-3": ".cad-p-sketch-20",
      "2-1": ".cad-p-sketch-21",
      "2-2": ".cad-p-sketch-22",
      "2-3": ".cad-p-sketch-23",
      "3-1": ".cad-p-sketch-24",
      "3-2": ".cad-p-sketch-25",
      "3-3": ".cad-p-sketch-26"
    };

    var key = state3bP.water + "-" + state3bP.hob;
    var target = qs(step3bP, map[key]);

    if (target) {
      show3bPCad(target);
    } else {
      show3bPCad(cadBase3bP);
    }
  }

  function reveal3bPDimensionsIfReady() {
    if (!state3bP.water || !state3bP.hob) return;

    update3bPCad();

    if (comboSelectWrap3bP) hide(comboSelectWrap3bP);
    if (dimensionsPhaseWrap3bP) show(dimensionsPhaseWrap3bP, "block");
  }

  function resetStep3bPState() {
    if (!step3bP) return;

    state3bP = {
      water: "",
      hob: "",
      island: "no",
      bar: "no",
      oven: "no",
      fridge: ""
    };

    comboSelectWrap3bP = qs(step3bP, ".combo-select-wrap");
    dimensionsPhaseWrap3bP = qs(step3bP, ".dimensions-phase-wrap");
    barWrap3bP = qs(step3bP, ".bar-wrap");
    islandWrap3bP = qs(step3bP, ".island-wrap");

    cadBase3bP = qs(step3bP, ".cad-p-3b-base");
    all3bPCads = qsa(step3bP, ".cad-global-wrap img");

    removeActiveInScope(step3bP, ".option-pill");
    clearHiddenInScope(step3bP);

    qsa(step3bP, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });

    hideAll(all3bPCads);
    show3bPCad(cadBase3bP);

    if (comboSelectWrap3bP) show(comboSelectWrap3bP, "block");
    if (dimensionsPhaseWrap3bP) hide(dimensionsPhaseWrap3bP);

    if (barWrap3bP) hide(barWrap3bP);
    if (islandWrap3bP) hide(islandWrap3bP);

    setHidden("water_position_p_3b", "");
    setHidden("hob_position_p_3b", "");
    setHidden("bar_enabled_p_3b", "no");
    setHidden("oven_tall_unit_p_3b", "no");
    setHidden("fridge_type_p_3b", "");
    setHidden("island_enabled_p_3b", "no");
  }

  if (step3bP) {
    resetStep3bPState();

    step3bP.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn && step3bP.contains(pickerBtn)) {
        e.preventDefault();
        handlePickerButtonClick(pickerBtn);
        return;
      }

      var resetBtn = e.target.closest(".reset-combo-button");
      if (resetBtn) {
        e.preventDefault();
        resetStep3bPState();
        return;
      }

      var water1 = e.target.closest(".water-pos-1");
      var water2 = e.target.closest(".water-pos-2");
      var water3 = e.target.closest(".water-pos-3");
      var hob1 = e.target.closest(".hob-pos-1");
      var hob2 = e.target.closest(".hob-pos-2");
      var hob3 = e.target.closest(".hob-pos-3");

      if (water1) {
        e.preventDefault();
        setSingleActive(water1);
        state3bP.water = "1";
        setHidden("water_position_p_3b", "Позиция 1");
        setFirstHiddenInScope(water1.closest(".question-wrap"), "Позиция 1");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3bP.water = "2";
        setHidden("water_position_p_3b", "Позиция 2");
        setFirstHiddenInScope(water2.closest(".question-wrap"), "Позиция 2");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3bP.water = "3";
        setHidden("water_position_p_3b", "Позиция 3");
        setFirstHiddenInScope(water3.closest(".question-wrap"), "Позиция 3");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (hob1) {
        e.preventDefault();
        setSingleActive(hob1);
        state3bP.hob = "1";
        setHidden("hob_position_p_3b", "Позиция 1");
        setFirstHiddenInScope(hob1.closest(".question-wrap"), "Позиция 1");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (hob2) {
        e.preventDefault();
        setSingleActive(hob2);
        state3bP.hob = "2";
        setHidden("hob_position_p_3b", "Позиция 2");
        setFirstHiddenInScope(hob2.closest(".question-wrap"), "Позиция 2");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (hob3) {
        e.preventDefault();
        setSingleActive(hob3);
        state3bP.hob = "3";
        setHidden("hob_position_p_3b", "Позиция 3");
        setFirstHiddenInScope(hob3.closest(".question-wrap"), "Позиция 3");
        reveal3bPDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        state3bP.island = islandOn ? "yes" : "no";

        setHidden("island_enabled_p_3b", islandOn ? "yes" : "no");
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3bP, "block");
        } else {
          hide(islandWrap3bP);
          resetPickerScope(islandWrap3bP);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (targetBarYes) {
        e.preventDefault();

        var barOn = toggleActive(targetBarYes);
        state3bP.bar = barOn ? "yes" : "no";

        setHidden("bar_enabled_p_3b", barOn ? "yes" : "no");
        setFirstHiddenInScope(targetBarYes.closest(".question-wrap"), barOn ? "Да" : "Не");

        if (barOn) {
          show(barWrap3bP, "block");
        } else {
          hide(barWrap3bP);
          resetPickerScope(barWrap3bP);
        }
        return;
      }

      var targetOvenYes = e.target.closest(".oven-column-yes");
      if (targetOvenYes) {
        e.preventDefault();

        var ovenOn = toggleActive(targetOvenYes);
        state3bP.oven = ovenOn ? "yes" : "no";

        setHidden("oven_tall_unit_p_3b", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3bP.fridge = "built-in";
        setHidden("fridge_type_p_3b", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3bP.fridge = "free-standing";
        setHidden("fridge_type_p_3b", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // =========================
  // STEP 3C P
  // =========================
  var comboSelectWrap3cP = null;
  var dimensionsPhaseWrap3cP = null;
  var barWrap3cP = null;
  var islandWrap3cP = null;

  var cadBase3cP = null;
  var all3cPCads = [];

  var state3cP = {
    water: "",
    hob: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function show3cPCad(cadEl) {
    hideAll(all3cPCads);
    show(cadEl);
  }

  function update3cPCad() {
    if (!state3cP.water || !state3cP.hob) {
      show3cPCad(cadBase3cP);
      return;
    }

    var map = {
      "1-1": ".cad-p-sketch-27",
      "1-2": ".cad-p-sketch-28",
      "1-3": ".cad-p-sketch-29",
      "2-1": ".cad-p-sketch-30",
      "2-2": ".cad-p-sketch-31",
      "2-3": ".cad-p-sketch-32",
      "3-1": ".cad-p-sketch-33",
      "3-2": ".cad-p-sketch-34",
      "3-3": ".cad-p-sketch-35"
    };

    var key = state3cP.water + "-" + state3cP.hob;
    var target = qs(step3cP, map[key]);

    if (target) {
      show3cPCad(target);
    } else {
      show3cPCad(cadBase3cP);
    }
  }

  function reveal3cPDimensionsIfReady() {
    if (!state3cP.water || !state3cP.hob) return;

    update3cPCad();

    if (comboSelectWrap3cP) hide(comboSelectWrap3cP);
    if (dimensionsPhaseWrap3cP) show(dimensionsPhaseWrap3cP, "block");
  }

  function resetStep3cPState() {
    if (!step3cP) return;

    state3cP = {
      water: "",
      hob: "",
      island: "no",
      bar: "no",
      oven: "no",
      fridge: ""
    };

    comboSelectWrap3cP = qs(step3cP, ".combo-select-wrap");
    dimensionsPhaseWrap3cP = qs(step3cP, ".dimensions-phase-wrap");
    barWrap3cP = qs(step3cP, ".bar-wrap");
    islandWrap3cP = qs(step3cP, ".island-wrap");

    cadBase3cP = qs(step3cP, ".cad-p-3c-base");
    all3cPCads = qsa(step3cP, ".cad-global-wrap img");

    removeActiveInScope(step3cP, ".option-pill");
    clearHiddenInScope(step3cP);

    qsa(step3cP, ".dimension-row").forEach(function (row) {
      resetPickerRow(row);
    });

    hideAll(all3cPCads);
    show3cPCad(cadBase3cP);

    if (comboSelectWrap3cP) show(comboSelectWrap3cP, "block");
    if (dimensionsPhaseWrap3cP) hide(dimensionsPhaseWrap3cP);

    if (barWrap3cP) hide(barWrap3cP);
    if (islandWrap3cP) hide(islandWrap3cP);

    setHidden("water_position_p_3c", "");
    setHidden("hob_position_p_3c", "");
    setHidden("bar_enabled_p_3c", "no");
    setHidden("oven_tall_unit_p_3c", "no");
    setHidden("fridge_type_p_3c", "");
    setHidden("island_enabled_p_3c", "no");
  }

  if (step3cP) {
    resetStep3cPState();

    step3cP.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn && step3cP.contains(pickerBtn)) {
        e.preventDefault();
        handlePickerButtonClick(pickerBtn);
        return;
      }

      var resetBtn = e.target.closest(".reset-combo-button");
      if (resetBtn) {
        e.preventDefault();
        resetStep3cPState();
        return;
      }

      var water1 = e.target.closest(".water-pos-1");
      var water2 = e.target.closest(".water-pos-2");
      var water3 = e.target.closest(".water-pos-3");
      var hob1 = e.target.closest(".hob-pos-1");
      var hob2 = e.target.closest(".hob-pos-2");
      var hob3 = e.target.closest(".hob-pos-3");

      if (water1) {
        e.preventDefault();
        setSingleActive(water1);
        state3cP.water = "1";
        setHidden("water_position_p_3c", "Позиция 1");
        setFirstHiddenInScope(water1.closest(".question-wrap"), "Позиция 1");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3cP.water = "2";
        setHidden("water_position_p_3c", "Позиция 2");
        setFirstHiddenInScope(water2.closest(".question-wrap"), "Позиция 2");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3cP.water = "3";
        setHidden("water_position_p_3c", "Позиция 3");
        setFirstHiddenInScope(water3.closest(".question-wrap"), "Позиция 3");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (hob1) {
        e.preventDefault();
        setSingleActive(hob1);
        state3cP.hob = "1";
        setHidden("hob_position_p_3c", "Позиция 1");
        setFirstHiddenInScope(hob1.closest(".question-wrap"), "Позиция 1");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (hob2) {
        e.preventDefault();
        setSingleActive(hob2);
        state3cP.hob = "2";
        setHidden("hob_position_p_3c", "Позиция 2");
        setFirstHiddenInScope(hob2.closest(".question-wrap"), "Позиция 2");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (hob3) {
        e.preventDefault();
        setSingleActive(hob3);
        state3cP.hob = "3";
        setHidden("hob_position_p_3c", "Позиция 3");
        setFirstHiddenInScope(hob3.closest(".question-wrap"), "Позиция 3");
        reveal3cPDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        state3cP.island = islandOn ? "yes" : "no";

        setHidden("island_enabled_p_3c", islandOn ? "yes" : "no");
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3cP, "block");
        } else {
          hide(islandWrap3cP);
          resetPickerScope(islandWrap3cP);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (targetBarYes) {
        e.preventDefault();

        var barOn = toggleActive(targetBarYes);
        state3cP.bar = barOn ? "yes" : "no";

        setHidden("bar_enabled_p_3c", barOn ? "yes" : "no");
        setFirstHiddenInScope(targetBarYes.closest(".question-wrap"), barOn ? "Да" : "Не");

        if (barOn) {
          show(barWrap3cP, "block");
        } else {
          hide(barWrap3cP);
          resetPickerScope(barWrap3cP);
        }
        return;
      }

      var targetOvenYes = e.target.closest(".oven-column-yes");
      if (targetOvenYes) {
        e.preventDefault();

        var ovenOn = toggleActive(targetOvenYes);
        state3cP.oven = ovenOn ? "yes" : "no";

        setHidden("oven_tall_unit_p_3c", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3cP.fridge = "built-in";
        setHidden("fridge_type_p_3c", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3cP.fridge = "free-standing";
        setHidden("fridge_type_p_3c", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // =========================
  // GLOBAL NAVIGATION BUTTONS
  // =========================
  smartFormBlock.addEventListener("click", function (e) {
    var backBtn = e.target.closest(".back-button");

    if (backBtn) {
      e.preventDefault();

      var visibleStep = getVisibleStep();

      if (visibleStep === flowAglova || visibleStep === flowPrava || visibleStep === flowP) {
        showStep(step1);
        return;
      }

      if (visibleStep === step3aAglova || visibleStep === step3bAglova) {
        showStep(flowAglova);
        return;
      }

      if (visibleStep === step3aP || visibleStep === step3bP || visibleStep === step3cP) {
        showStep(flowP);
        return;
      }
    }
  });

  // =========================
  // SUBMIT
  // =========================
  formEl.addEventListener("submit", function () {
    syncConfigurationHidden();
    buildReadableSummary();
    beforeRealSubmit();

    function val(name) {
      var el = formEl.querySelector('[name="' + name + '"]');
      if (!el) return "";
      return (el.value || "").trim();
    }

    function setMail(id, value) {
      var el = document.getElementById(id);
      if (!el) return;
      el.value = value || "";
    }

    setMail("mail_configuration", val("configuration"));

    setMail(
      "mail_wall_1",
      val("length_1_prava_3") ||
      val("stena1_p_3a") ||
      val("stena1_p_3b") ||
      val("stena1_p_3c") ||
      val("stena1_3a") ||
      val("stena1_3b") ||
      val("wall_1_p_3a") ||
      val("wall_1_p_3b") ||
      val("wall_1_p_3c")
    );

    setMail(
      "mail_wall_2",
      val("stena2_p_3a") ||
      val("stena2_p_3b") ||
      val("stena2_p_3c") ||
      val("stena2_3a") ||
      val("stena2_3b") ||
      val("wall_2_p_3a") ||
      val("wall_2_p_3b") ||
      val("wall_2_p_3c")
    );

    setMail(
      "mail_wall_3",
      val("stena3_p_3a") ||
      val("stena3_p_3b") ||
      val("stena3_p_3c") ||
      val("wall_3_p_3a") ||
      val("wall_3_p_3b") ||
      val("wall_3_p_3c")
    );

    setMail(
      "mail_room_height",
      val("height_prava_3") ||
      val("visochina_p_3a") ||
      val("visochina_p_3b") ||
      val("visochina_p_3c") ||
      val("visochina_3a") ||
      val("visochina_3b") ||
      val("room_height_p_3a") ||
      val("room_height_p_3b") ||
      val("room_height_p_3c")
    );

    setMail(
      "mail_water_position",
      val("water_prava_3") ||
      val("water_position_p_3a") ||
      val("water_position_p_3b") ||
      val("water_position_p_3c") ||
      val("water_position_3a") ||
      val("water_position_3b")
    );

    setMail(
      "mail_hob_position",
      val("hob_position_p_3a") ||
      val("hob_position_p_3b") ||
      val("hob_position_p_3c")
    );

    setMail(
      "mail_chimney_a",
      val("komin_a_p_3b") ||
      val("komin_a_p_3c") ||
      val("chimney_a_p_3b") ||
      val("chimney_a_p_3c") ||
      val("komin_a_3b")
    );

    setMail(
      "mail_chimney_b",
      val("komin_b_p_3b") ||
      val("komin_b_p_3c") ||
      val("chimney_b_p_3b") ||
      val("chimney_b_p_3c") ||
      val("komin_b_3b")
    );

    setMail(
      "mail_bar_enabled",
      val("has_bar_prava_3") ||
      val("bar_enabled_p_3a") ||
      val("bar_enabled_p_3b") ||
      val("bar_enabled_p_3c") ||
      val("bar_enabled_3a") ||
      val("bar_enabled_3b")
    );

    setMail(
      "mail_bar_length",
      val("bar_length_prava_3") ||
      val("bar_length_p_3a") ||
      val("bar_length_p_3b") ||
      val("bar_length_p_3c") ||
      val("bar_length_3a") ||
      val("bar_length_3b")
    );

    setMail(
      "mail_bar_depth",
      val("bar_height_prava_3") ||
      val("bar_depth_p_3a") ||
      val("bar_depth_p_3b") ||
      val("bar_depth_p_3c") ||
      val("bar_depth_3a") ||
      val("bar_depth_3b")
    );

    setMail(
      "mail_island_enabled",
      val("has_island_prava_3") ||
      val("island_enabled_p_3a") ||
      val("island_enabled_p_3b") ||
      val("island_enabled_p_3c") ||
      val("island_enabled_3a") ||
      val("island_enabled_3b")
    );

    setMail(
      "mail_island_length",
      val("island_length_prava_3") ||
      val("island_length_p_3a") ||
      val("island_length_p_3b") ||
      val("island_length_p_3c") ||
      val("island_length_3a") ||
      val("island_length_3b")
    );

    setMail(
      "mail_island_depth",
      val("island_height_prava_3") ||
      val("island_depth_p_3a") ||
      val("island_depth_p_3b") ||
      val("island_depth_p_3c") ||
      val("island_depth_3a") ||
      val("island_depth_3b")
    );

    setMail(
      "mail_oven_tall_unit",
      val("tall_unit_prava_3") ||
      val("oven_tall_unit_p_3a") ||
      val("oven_tall_unit_p_3b") ||
      val("oven_tall_unit_p_3c") ||
      val("oven_tall_unit_3a") ||
      val("oven_tall_unit_3b")
    );

    setMail(
      "mail_fridge_type",
      val("fridge_prava_3") ||
      val("fridge_type_p_3a") ||
      val("fridge_type_p_3b") ||
      val("fridge_type_p_3c") ||
      val("fridge_type_3a") ||
      val("fridge_type_3b")
    );

    setMail(
      "mail_vision",
      val("vision_prava_3") || val("vision")
    );

    setMail(
      "mail_plan",
      val("plan_prava_3") || val("plan")
    );

    setMail(
      "mail_contact_preference",
      val("contact_preference_rava_3") || val("contact_preference")
    );
  });
});
