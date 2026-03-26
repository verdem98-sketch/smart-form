
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

  function setHidden(id, value) {
    var el = document.getElementById(id);
    if (el) el.value = value;
  }

  function setFieldsState(scopeEl, enabled) {
    if (!scopeEl) return;

    qsa(scopeEl, "input, select, textarea, button").forEach(function (el) {
      if (el.type === "hidden") return;
      if (el.type === "submit") return;
      el.disabled = !enabled;
    });
  }

  function clearBranchBorders(scopeEl) {
    if (!scopeEl) return;
    qsa(scopeEl, "input, select, textarea").forEach(function (el) {
      el.style.border = "";
    });
  }

  function removeActiveInScope(scopeEl, selector) {
    if (!scopeEl) return;
    qsa(scopeEl, selector || ".option-pill").forEach(function (el) {
      el.classList.remove("active");
    });
  }

  function removeActiveFromRow(row) {
    if (!row) return;
    qsa(row, ".option-pill").forEach(function (pill) {
      pill.classList.remove("active");
    });
  }

  function setSingleActive(pill) {
    if (!pill) return;

    var row =
      pill.closest(".options-row") ||
      pill.closest(".question-wrap") ||
      pill.parentElement;

    if (!row) return;

    removeActiveFromRow(row);
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

  function getValByName(name) {
    var el = qs(document, '[name="' + name + '"]');
    if (!el) return "";
    return (el.value || "").trim();
  }

  function yesNoBulgarian(value) {
    if (!value) return "Не";
    if (value === "yes") return "Да";
    if (value === "no") return "Не";
    if (value === "Да") return "Да";
    if (value === "Не") return "Не";
    return value;
  }

  function safeLine(label, value) {
    if (!value) return label + ": -";
    return label + ": " + value;
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
  var smartForm = qs(smartFormBlock, "form");
  var openButtons = qsa(document, ".open-smart-form");
  var summaryReadable = qs(document, "#summary-readable");

  if (!overlay || !modalCard || !smartFormBlock || !smartForm) {
    return;
  }

  // =========================
  // STEP REFERENCES
  // =========================
  var step1 = qs(smartFormBlock, ".step-1");
  var step2Prava = qs(smartFormBlock, ".step-2-prava");
  var step2Aglova = qs(smartFormBlock, ".step-2-aglova");
  var step2P = qs(smartFormBlock, ".step-2-p");

  var step3aAglova = qs(smartFormBlock, ".step-3a-aglova");
  var step3bAglova = qs(smartFormBlock, ".step-3b-aglova");

  var step3aP = qs(smartFormBlock, ".step-3a-p");
  var step3bP = qs(smartFormBlock, ".step-3b-p");
  var step3cP = qs(smartFormBlock, ".step-3c-p");

  var step5 = qs(smartFormBlock, ".step-5");
  var step6 = qs(smartFormBlock, ".step-6");

  // =========================
  // ACTIVE BRANCH
  // =========================
  var activeBranch = "";

  function getVisibleStep() {
    var visible = null;

    qsa(smartFormBlock, ".step").forEach(function (step) {
      if (window.getComputedStyle(step).display !== "none") {
        visible = step;
      }
    });

    return visible;
  }

  function hideAllSteps() {
    qsa(smartFormBlock, ".step").forEach(function (step) {
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
    setFieldsState(step3aAglova, false);
    setFieldsState(step3bAglova, false);
    setFieldsState(step3aP, false);
    setFieldsState(step3bP, false);
    setFieldsState(step3cP, false);
  }

  function beforeRealSubmit() {
    if (activeBranch === "3a-aglova") {
      setFieldsState(step3bAglova, false);
      setFieldsState(step3aP, false);
      setFieldsState(step3bP, false);
      setFieldsState(step3cP, false);
    } else if (activeBranch === "3b-aglova") {
      setFieldsState(step3aAglova, false);
      setFieldsState(step3aP, false);
      setFieldsState(step3bP, false);
      setFieldsState(step3cP, false);
    } else if (activeBranch === "3a-p") {
      setFieldsState(step3aAglova, false);
      setFieldsState(step3bAglova, false);
      setFieldsState(step3bP, false);
      setFieldsState(step3cP, false);
    } else if (activeBranch === "3b-p") {
      setFieldsState(step3aAglova, false);
      setFieldsState(step3bAglova, false);
      setFieldsState(step3aP, false);
      setFieldsState(step3cP, false);
    } else if (activeBranch === "3c-p") {
      setFieldsState(step3aAglova, false);
      setFieldsState(step3bAglova, false);
      setFieldsState(step3aP, false);
      setFieldsState(step3bP, false);
    } else {
      setFieldsState(step3aAglova, false);
      setFieldsState(step3bAglova, false);
      setFieldsState(step3aP, false);
      setFieldsState(step3bP, false);
      setFieldsState(step3cP, false);
    }
  }

  // =========================
  // READABLE SUMMARY
  // =========================
  function buildReadableSummary() {
    if (!summaryReadable) return;

    var lines = [];
    var config = "";

    if (activeBranch === "3a-aglova") config = "Ъглова без комин";
    if (activeBranch === "3b-aglova") config = "Ъглова с комин";
    if (activeBranch === "3a-p") config = "П кухня без комин";
    if (activeBranch === "3b-p") config = "П кухня с комин отляво";
    if (activeBranch === "3c-p") config = "П кухня с комин отдясно";

    lines.push("Конфигурация: " + (config || "Няма"));
    lines.push("");

    if (activeBranch === "3a-aglova") {
      lines.push("Основни размери:");
      lines.push(safeLine("Стена 1", getValByName("wall_1_3a")));
      lines.push(safeLine("Стена 2", getValByName("wall_2_3a")));
      lines.push(safeLine("Височина", getValByName("room_height_3a")));
      lines.push("");

      lines.push("Бар: " + yesNoBulgarian(getValByName("bar_enabled_3a")));
      if (yesNoBulgarian(getValByName("bar_enabled_3a")) === "Да") {
        lines.push(safeLine("Дължина на бар", getValByName("bar_length_3a")));
        lines.push(safeLine("Дълбочина на бар", getValByName("bar_depth_3a")));
      }
      lines.push("");

      lines.push("Остров: " + yesNoBulgarian(getValByName("island_enabled_3a")));
      if (yesNoBulgarian(getValByName("island_enabled_3a")) === "Да") {
        lines.push(safeLine("Дължина на остров", getValByName("island_length_3a")));
        lines.push(safeLine("Дълбочина на остров", getValByName("island_depth_3a")));
      }
      lines.push("");

      lines.push("Колона за фурна: " + yesNoBulgarian(getValByName("oven_tall_unit_3a")));
      lines.push(safeLine("Хладилник", getValByName("fridge_type_3a")));
    }

    if (activeBranch === "3b-aglova") {
      lines.push("Основни размери:");
      lines.push(safeLine("Стена 1", getValByName("wall_1")));
      lines.push(safeLine("Стена 2", getValByName("wall_2")));
      lines.push(safeLine("Височина", getValByName("room_height")));
      lines.push(safeLine("Комин A", getValByName("chimney_a")));
      lines.push(safeLine("Комин B", getValByName("chimney_b")));
      lines.push("");

      lines.push("Бар: " + yesNoBulgarian(getValByName("bar_enabled")));
      if (yesNoBulgarian(getValByName("bar_enabled")) === "Да") {
        lines.push(safeLine("Дължина на бар", getValByName("bar_length")));
        lines.push(safeLine("Дълбочина на бар", getValByName("bar_depth")));
      }
      lines.push("");

      lines.push("Остров: " + yesNoBulgarian(getValByName("island_enabled")));
      if (yesNoBulgarian(getValByName("island_enabled")) === "Да") {
        lines.push(safeLine("Дължина на остров", getValByName("island_length")));
        lines.push(safeLine("Дълбочина на остров", getValByName("island_depth")));
      }
      lines.push("");

      lines.push("Колона за фурна: " + yesNoBulgarian(getValByName("oven_tall_unit")));
      lines.push(safeLine("Хладилник", getValByName("fridge_type")));
    }

    if (activeBranch === "3a-p") {
      lines.push("Основни размери:");
      lines.push(safeLine("Стена 1", getValByName("wall_1_p_3a")));
      lines.push(safeLine("Стена 2", getValByName("wall_2_p_3a")));
      lines.push(safeLine("Стена 3", getValByName("wall_3_p_3a")));
      lines.push(safeLine("Височина", getValByName("room_height_p_3a")));
      lines.push("");

      lines.push(safeLine("Позиция вода", getValByName("water_position_p_3a")));
      lines.push(safeLine("Позиция котлон", getValByName("hob_position_p_3a")));
      lines.push("");

      lines.push("Бар: " + yesNoBulgarian(getValByName("bar_enabled_p_3a")));
      if (yesNoBulgarian(getValByName("bar_enabled_p_3a")) === "Да") {
        lines.push(safeLine("Дължина на бар", getValByName("bar_length_p_3a")));
        lines.push(safeLine("Дълбочина на бар", getValByName("bar_depth_p_3a")));
      }
      lines.push("");

      lines.push("Остров: " + yesNoBulgarian(getValByName("island_enabled_p_3a")));
      if (yesNoBulgarian(getValByName("island_enabled_p_3a")) === "Да") {
        lines.push(safeLine("Дължина на остров", getValByName("island_length_p_3a")));
        lines.push(safeLine("Дълбочина на остров", getValByName("island_depth_p_3a")));
      }
      lines.push("");

      lines.push("Колона за фурна: " + yesNoBulgarian(getValByName("oven_tall_unit_p_3a")));
      lines.push(safeLine("Хладилник", getValByName("fridge_type_p_3a")));
    }

    if (activeBranch === "3b-p") {
      lines.push("Основни размери:");
      lines.push(safeLine("Стена 1", getValByName("wall_1_p_3b")));
      lines.push(safeLine("Стена 2", getValByName("wall_2_p_3b")));
      lines.push(safeLine("Стена 3", getValByName("wall_3_p_3b")));
      lines.push(safeLine("Височина", getValByName("room_height_p_3b")));
      lines.push(safeLine("Комин A", getValByName("chimney_a_p_3b")));
      lines.push(safeLine("Комин B", getValByName("chimney_b_p_3b")));
      lines.push("");

      lines.push(safeLine("Позиция вода", getValByName("water_position_p_3b")));
      lines.push(safeLine("Позиция котлон", getValByName("hob_position_p_3b")));
      lines.push("");

      lines.push("Бар: " + yesNoBulgarian(getValByName("bar_enabled_p_3b")));
      if (yesNoBulgarian(getValByName("bar_enabled_p_3b")) === "Да") {
        lines.push(safeLine("Дължина на бар", getValByName("bar_length_p_3b")));
        lines.push(safeLine("Дълбочина на бар", getValByName("bar_depth_p_3b")));
      }
      lines.push("");

      lines.push("Остров: " + yesNoBulgarian(getValByName("island_enabled_p_3b")));
      if (yesNoBulgarian(getValByName("island_enabled_p_3b")) === "Да") {
        lines.push(safeLine("Дължина на остров", getValByName("island_length_p_3b")));
        lines.push(safeLine("Дълбочина на остров", getValByName("island_depth_p_3b")));
      }
      lines.push("");

      lines.push("Колона за фурна: " + yesNoBulgarian(getValByName("oven_tall_unit_p_3b")));
      lines.push(safeLine("Хладилник", getValByName("fridge_type_p_3b")));
    }

    if (activeBranch === "3c-p") {
      lines.push("Основни размери:");
      lines.push(safeLine("Стена 1", getValByName("wall_1_p_3c")));
      lines.push(safeLine("Стена 2", getValByName("wall_2_p_3c")));
      lines.push(safeLine("Стена 3", getValByName("wall_3_p_3c")));
      lines.push(safeLine("Височина", getValByName("room_height_p_3c")));
      lines.push(safeLine("Комин A", getValByName("chimney_a_p_3c")));
      lines.push(safeLine("Комин B", getValByName("chimney_b_p_3c")));
      lines.push("");

      lines.push(safeLine("Позиция вода", getValByName("water_position_p_3c")));
      lines.push(safeLine("Позиция котлон", getValByName("hob_position_p_3c")));
      lines.push("");

      lines.push("Бар: " + yesNoBulgarian(getValByName("bar_enabled_p_3c")));
      if (yesNoBulgarian(getValByName("bar_enabled_p_3c")) === "Да") {
        lines.push(safeLine("Дължина на бар", getValByName("bar_length_p_3c")));
        lines.push(safeLine("Дълбочина на бар", getValByName("bar_depth_p_3c")));
      }
      lines.push("");

      lines.push("Остров: " + yesNoBulgarian(getValByName("island_enabled_p_3c")));
      if (yesNoBulgarian(getValByName("island_enabled_p_3c")) === "Да") {
        lines.push(safeLine("Дължина на остров", getValByName("island_length_p_3c")));
        lines.push(safeLine("Дълбочина на остров", getValByName("island_depth_p_3c")));
      }
      lines.push("");

      lines.push("Колона за фурна: " + yesNoBulgarian(getValByName("oven_tall_unit_p_3c")));
      lines.push(safeLine("Хладилник", getValByName("fridge_type_p_3c")));
    }

    summaryReadable.value = lines.join("\n");
  }

  // =========================
  // MODAL OPEN / CLOSE
  // =========================
  function openModal() {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";

    activeBranch = "";
    hideAllSteps();

    if (step1) showStep(step1);
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
  applyBranchState();

  // =========================
  // STEP 1 -> STEP 2
  // =========================
  if (step1) {
    qsa(step1, ".kitchen-card").forEach(function (card, index) {
      card.style.cursor = "pointer";

      card.addEventListener("click", function (e) {
        e.preventDefault();

        activeBranch = "";

        if (index === 0 && step2Prava) {
          showStep(step2Prava);
          return;
        }

        if (index === 1 && step2Aglova) {
          showStep(step2Aglova);
          return;
        }

        if (index === 2 && step2P) {
          showStep(step2P);
          return;
        }
      });
    });
  }

  // =========================
  // STEP 2 AGLOVA
  // =========================
  if (step2Aglova) {
    var aglovaChoiceNoCorner = qs(step2Aglova, ".choice-card-no-corner");
    var aglovaChoiceWithCorner = qs(step2Aglova, ".choice-card-with-corner");

    if (aglovaChoiceNoCorner) {
      aglovaChoiceNoCorner.style.cursor = "pointer";
      aglovaChoiceNoCorner.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3a-aglova";
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
        activeBranch = "3b-aglova";
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

    setHidden("water-position-3a", "");
    setHidden("chimney-position-3a", "");
    setHidden("bar-counter", "no");
    setHidden("oven-column", "no");
    setHidden("fridge-type", "");
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
        setHidden("water-position-3a", "Стена 2");
        setFirstHiddenInScope(targetWater2.closest(".question-wrap"), "Стена 2");
        reveal3aDimensionsIfReady();
        return;
      }

      if (targetWater3) {
        e.preventDefault();
        setSingleActive(targetWater3);
        state3a.water = "3";
        setHidden("water-position-3a", "Стена 3");
        setFirstHiddenInScope(targetWater3.closest(".question-wrap"), "Стена 3");
        reveal3aDimensionsIfReady();
        return;
      }

      if (targetChimney1) {
        e.preventDefault();
        setSingleActive(targetChimney1);
        state3a.chimney = "1";
        setHidden("chimney-position-3a", "Стена 1");
        setFirstHiddenInScope(targetChimney1.closest(".question-wrap"), "Стена 1");
        reveal3aDimensionsIfReady();
        return;
      }

      if (targetChimney4) {
        e.preventDefault();
        setSingleActive(targetChimney4);
        state3a.chimney = "4";
        setHidden("chimney-position-3a", "Стена 4");
        setFirstHiddenInScope(targetChimney4.closest(".question-wrap"), "Стена 4");
        reveal3aDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        state3a.island = islandOn ? "yes" : "no";

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

        setHidden("bar-counter", barOn ? "yes" : "no");
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

        setHidden("oven-column", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3a.fridge = "built-in";
        setHidden("fridge-type", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3a.fridge = "free-standing";
        setHidden("fridge-type", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

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

    setHidden("water-position-3b", "");
    setHidden("chimney-position-3b", "");
    setHidden("bar-counter-3b", "no");
    setHidden("oven-column-3b", "no");
    setHidden("fridge-type-3b", "");
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
        setHidden("water-position-3b", "Стена 2");
        setFirstHiddenInScope(targetWater2.closest(".question-wrap"), "Стена 2");
        reveal3bDimensionsIfReady();
        return;
      }

      if (targetWater3) {
        e.preventDefault();
        setSingleActive(targetWater3);
        state3b.water = "3";
        setHidden("water-position-3b", "Стена 3");
        setFirstHiddenInScope(targetWater3.closest(".question-wrap"), "Стена 3");
        reveal3bDimensionsIfReady();
        return;
      }

      if (targetChimneyA) {
        e.preventDefault();
        setSingleActive(targetChimneyA);
        state3b.chimney = "a";
        setHidden("chimney-position-3b", "Позиция A");
        setFirstHiddenInScope(targetChimneyA.closest(".question-wrap"), "Позиция A");
        reveal3bDimensionsIfReady();
        return;
      }

      if (targetChimneyB) {
        e.preventDefault();
        setSingleActive(targetChimneyB);
        state3b.chimney = "b";
        setHidden("chimney-position-3b", "Позиция B");
        setFirstHiddenInScope(targetChimneyB.closest(".question-wrap"), "Позиция B");
        reveal3bDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();

        var islandOn = toggleActive(targetIslandYes);
        state3b.island = islandOn ? "yes" : "no";

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

        setHidden("bar-counter-3b", barOn ? "yes" : "no");
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

        setHidden("oven-column-3b", ovenOn ? "yes" : "no");
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), "Да");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3b.fridge = "built-in";
        setHidden("fridge-type-3b", "Вграден");
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3b.fridge = "free-standing";
        setHidden("fridge-type-3b", "Свободно стоящ");
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // ===== PART 2 COMES NEXT =====  // =========================
  // STEP 2 P
  // =========================
  if (step2P) {
    var pChoiceNoChimney = qs(step2P, ".choice-card-no-chimney");
    var pChoiceLeftChimney = qs(step2P, ".choice-card-left-chimney");
    var pChoiceRightChimney = qs(step2P, ".choice-card-right-chimney");

    if (pChoiceNoChimney) {
      pChoiceNoChimney.style.cursor = "pointer";
      pChoiceNoChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeBranch = "3a-p";
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
        resetStep3cPState();
        if (step3cP) showStep(step3cP);
        applyBranchState();
      });
    }
  }

  // =========================
  // STEP 3A P (NO CHIMNEY)
  // =========================
  var comboSelectWrap3aP = null;
  var dimensionsPhaseWrap3aP = null;
  var barWrap3aP = null;
  var islandWrap3aP = null;

  var cadBase3aP = null;
  var cadP9 = null;
  var cadP10 = null;
  var cadP11 = null;
  var cadP12 = null;
  var cadP13 = null;
  var cadP14 = null;
  var cadP15 = null;
  var cadP16 = null;
  var cadP17 = null;
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

    if (state3aP.water === "1" && state3aP.hob === "1") return show3aPCad(cadP9);
    if (state3aP.water === "1" && state3aP.hob === "2") return show3aPCad(cadP10);
    if (state3aP.water === "1" && state3aP.hob === "3") return show3aPCad(cadP11);

    if (state3aP.water === "2" && state3aP.hob === "1") return show3aPCad(cadP12);
    if (state3aP.water === "2" && state3aP.hob === "2") return show3aPCad(cadP13);
    if (state3aP.water === "2" && state3aP.hob === "3") return show3aPCad(cadP14);

    if (state3aP.water === "3" && state3aP.hob === "1") return show3aPCad(cadP15);
    if (state3aP.water === "3" && state3aP.hob === "2") return show3aPCad(cadP16);
    if (state3aP.water === "3" && state3aP.hob === "3") return show3aPCad(cadP17);

    show3aPCad(cadBase3aP);
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
    cadP9 = qs(step3aP, ".cad-p-sketch-9");
    cadP10 = qs(step3aP, ".cad-p-sketch-10");
    cadP11 = qs(step3aP, ".cad-p-sketch-11");
    cadP12 = qs(step3aP, ".cad-p-sketch-12");
    cadP13 = qs(step3aP, ".cad-p-sketch-13");
    cadP14 = qs(step3aP, ".cad-p-sketch-14");
    cadP15 = qs(step3aP, ".cad-p-sketch-15");
    cadP16 = qs(step3aP, ".cad-p-sketch-16");
    cadP17 = qs(step3aP, ".cad-p-sketch-17");

    all3aPCads = [cadBase3aP, cadP9, cadP10, cadP11, cadP12, cadP13, cadP14, cadP15, cadP16, cadP17];

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
        setFirstHiddenInScope(water1.closest(".question-wrap"), "Позиция 1");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3aP.water = "2";
        setFirstHiddenInScope(water2.closest(".question-wrap"), "Позиция 2");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3aP.water = "3";
        setFirstHiddenInScope(water3.closest(".question-wrap"), "Позиция 3");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (hob1) {
        e.preventDefault();
        setSingleActive(hob1);
        state3aP.hob = "1";
        setFirstHiddenInScope(hob1.closest(".question-wrap"), "Позиция 1");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (hob2) {
        e.preventDefault();
        setSingleActive(hob2);
        state3aP.hob = "2";
        setFirstHiddenInScope(hob2.closest(".question-wrap"), "Позиция 2");
        reveal3aPDimensionsIfReady();
        return;
      }

      if (hob3) {
        e.preventDefault();
        setSingleActive(hob3);
        state3aP.hob = "3";
        setFirstHiddenInScope(hob3.closest(".question-wrap"), "Позиция 3");
        reveal3aPDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();
        var islandOn = toggleActive(targetIslandYes);
        state3aP.island = islandOn ? "yes" : "no";
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3aP, "block");
        } else {
          hide(islandWrap3aP);
          resetPickerScope(islandWrap3aP);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes");
      if (targetBarYes) {
        e.preventDefault();
        var barOn = toggleActive(targetBarYes);
        state3aP.bar = barOn ? "yes" : "no";
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
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3aP.fridge = "built-in";
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3aP.fridge = "free-standing";
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // =========================
  // STEP 3B P (LEFT CHIMNEY)
  // =========================
  var comboSelectWrap3bP = null;
  var dimensionsPhaseWrap3bP = null;
  var barWrap3bP = null;
  var islandWrap3bP = null;

  var cadBase3bP = null;
  var cadP18 = null;
  var cadP19 = null;
  var cadP20 = null;
  var cadP21 = null;
  var cadP22 = null;
  var cadP23 = null;
  var cadP24 = null;
  var cadP25 = null;
  var cadP26 = null;
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

    if (state3bP.water === "1" && state3bP.hob === "1") return show3bPCad(cadP18);
    if (state3bP.water === "1" && state3bP.hob === "2") return show3bPCad(cadP19);
    if (state3bP.water === "1" && state3bP.hob === "3") return show3bPCad(cadP20);

    if (state3bP.water === "2" && state3bP.hob === "1") return show3bPCad(cadP21);
    if (state3bP.water === "2" && state3bP.hob === "2") return show3bPCad(cadP22);
    if (state3bP.water === "2" && state3bP.hob === "3") return show3bPCad(cadP23);

    if (state3bP.water === "3" && state3bP.hob === "1") return show3bPCad(cadP24);
    if (state3bP.water === "3" && state3bP.hob === "2") return show3bPCad(cadP25);
    if (state3bP.water === "3" && state3bP.hob === "3") return show3bPCad(cadP26);

    show3bPCad(cadBase3bP);
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
    cadP18 = qs(step3bP, ".cad-p-sketch-18");
    cadP19 = qs(step3bP, ".cad-p-sketch-19");
    cadP20 = qs(step3bP, ".cad-p-sketch-20");
    cadP21 = qs(step3bP, ".cad-p-sketch-21");
    cadP22 = qs(step3bP, ".cad-p-sketch-22");
    cadP23 = qs(step3bP, ".cad-p-sketch-23");
    cadP24 = qs(step3bP, ".cad-p-sketch-24");
    cadP25 = qs(step3bP, ".cad-p-sketch-25");
    cadP26 = qs(step3bP, ".cad-p-sketch-26");

    all3bPCads = [cadBase3bP, cadP18, cadP19, cadP20, cadP21, cadP22, cadP23, cadP24, cadP25, cadP26];

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
        setFirstHiddenInScope(water1.closest(".question-wrap"), "Позиция 1");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3bP.water = "2";
        setFirstHiddenInScope(water2.closest(".question-wrap"), "Позиция 2");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3bP.water = "3";
        setFirstHiddenInScope(water3.closest(".question-wrap"), "Позиция 3");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (hob1) {
        e.preventDefault();
        setSingleActive(hob1);
        state3bP.hob = "1";
        setFirstHiddenInScope(hob1.closest(".question-wrap"), "Позиция 1");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (hob2) {
        e.preventDefault();
        setSingleActive(hob2);
        state3bP.hob = "2";
        setFirstHiddenInScope(hob2.closest(".question-wrap"), "Позиция 2");
        reveal3bPDimensionsIfReady();
        return;
      }

      if (hob3) {
        e.preventDefault();
        setSingleActive(hob3);
        state3bP.hob = "3";
        setFirstHiddenInScope(hob3.closest(".question-wrap"), "Позиция 3");
        reveal3bPDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();
        var islandOn = toggleActive(targetIslandYes);
        state3bP.island = islandOn ? "yes" : "no";
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3bP, "block");
        } else {
          hide(islandWrap3bP);
          resetPickerScope(islandWrap3bP);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes");
      if (targetBarYes) {
        e.preventDefault();
        var barOn = toggleActive(targetBarYes);
        state3bP.bar = barOn ? "yes" : "no";
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
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3bP.fridge = "built-in";
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3bP.fridge = "free-standing";
        setFirstHiddenInScope(targetFridgeFreeStanding.closest(".question-wrap"), "Свободно стоящ");
        return;
      }
    });
  }

  // =========================
  // STEP 3C P (RIGHT CHIMNEY)
  // =========================
  var comboSelectWrap3cP = null;
  var dimensionsPhaseWrap3cP = null;
  var barWrap3cP = null;
  var islandWrap3cP = null;

  var cadBase3cP = null;
  var cadP27 = null;
  var cadP28 = null;
  var cadP29 = null;
  var cadP30 = null;
  var cadP31 = null;
  var cadP32 = null;
  var cadP33 = null;
  var cadP34 = null;
  var cadP35 = null;
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

    if (state3cP.water === "1" && state3cP.hob === "1") return show3cPCad(cadP27);
    if (state3cP.water === "1" && state3cP.hob === "2") return show3cPCad(cadP28);
    if (state3cP.water === "1" && state3cP.hob === "3") return show3cPCad(cadP29);

    if (state3cP.water === "2" && state3cP.hob === "1") return show3cPCad(cadP30);
    if (state3cP.water === "2" && state3cP.hob === "2") return show3cPCad(cadP31);
    if (state3cP.water === "2" && state3cP.hob === "3") return show3cPCad(cadP32);

    if (state3cP.water === "3" && state3cP.hob === "1") return show3cPCad(cadP33);
    if (state3cP.water === "3" && state3cP.hob === "2") return show3cPCad(cadP34);
    if (state3cP.water === "3" && state3cP.hob === "3") return show3cPCad(cadP35);

    show3cPCad(cadBase3cP);
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
    cadP27 = qs(step3cP, ".cad-p-sketch-27");
    cadP28 = qs(step3cP, ".cad-p-sketch-28");
    cadP29 = qs(step3cP, ".cad-p-sketch-29");
    cadP30 = qs(step3cP, ".cad-p-sketch-30");
    cadP31 = qs(step3cP, ".cad-p-sketch-31");
    cadP32 = qs(step3cP, ".cad-p-sketch-32");
    cadP33 = qs(step3cP, ".cad-p-sketch-33");
    cadP34 = qs(step3cP, ".cad-p-sketch-34");
    cadP35 = qs(step3cP, ".cad-p-sketch-35");

    all3cPCads = [cadBase3cP, cadP27, cadP28, cadP29, cadP30, cadP31, cadP32, cadP33, cadP34, cadP35];

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
        setFirstHiddenInScope(water1.closest(".question-wrap"), "Позиция 1");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3cP.water = "2";
        setFirstHiddenInScope(water2.closest(".question-wrap"), "Позиция 2");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3cP.water = "3";
        setFirstHiddenInScope(water3.closest(".question-wrap"), "Позиция 3");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (hob1) {
        e.preventDefault();
        setSingleActive(hob1);
        state3cP.hob = "1";
        setFirstHiddenInScope(hob1.closest(".question-wrap"), "Позиция 1");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (hob2) {
        e.preventDefault();
        setSingleActive(hob2);
        state3cP.hob = "2";
        setFirstHiddenInScope(hob2.closest(".question-wrap"), "Позиция 2");
        reveal3cPDimensionsIfReady();
        return;
      }

      if (hob3) {
        e.preventDefault();
        setSingleActive(hob3);
        state3cP.hob = "3";
        setFirstHiddenInScope(hob3.closest(".question-wrap"), "Позиция 3");
        reveal3cPDimensionsIfReady();
        return;
      }

      var targetIslandYes = e.target.closest(".island-yes");
      if (targetIslandYes) {
        e.preventDefault();
        var islandOn = toggleActive(targetIslandYes);
        state3cP.island = islandOn ? "yes" : "no";
        setFirstHiddenInScope(targetIslandYes.closest(".question-wrap"), islandOn ? "Да" : "Не");

        if (islandOn) {
          show(islandWrap3cP, "block");
        } else {
          hide(islandWrap3cP);
          resetPickerScope(islandWrap3cP);
        }
        return;
      }

      var targetBarYes = e.target.closest(".bar-yes");
      if (targetBarYes) {
        e.preventDefault();
        var barOn = toggleActive(targetBarYes);
        state3cP.bar = barOn ? "yes" : "no";
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
        setFirstHiddenInScope(targetOvenYes.closest(".question-wrap"), ovenOn ? "Да" : "Не");
        return;
      }

      var targetFridgeBuiltIn = e.target.closest(".fridge-built-in");
      var targetFridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (targetFridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(targetFridgeBuiltIn);
        state3cP.fridge = "built-in";
        setFirstHiddenInScope(targetFridgeBuiltIn.closest(".question-wrap"), "Вграден");
        return;
      }

      if (targetFridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(targetFridgeFreeStanding);
        state3cP.fridge = "free-standing";
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
    var nextBtn = e.target.closest(".next-button");

    if (backBtn) {
      e.preventDefault();

      var visibleStep = getVisibleStep();

      if (visibleStep === step2Aglova || visibleStep === step2Prava || visibleStep === step2P) {
        showStep(step1);
        return;
      }

      if (visibleStep === step3aAglova || visibleStep === step3bAglova) {
        showStep(step2Aglova);
        return;
      }

      if (visibleStep === step3aP || visibleStep === step3bP || visibleStep === step3cP) {
        showStep(step2P);
        return;
      }

      if (visibleStep === step5) {
        if (activeBranch === "3a-aglova" && step3aAglova) {
          showStep(step3aAglova);
          return;
        }

        if (activeBranch === "3b-aglova" && step3bAglova) {
          showStep(step3bAglova);
          return;
        }

        if (activeBranch === "3a-p" && step3aP) {
          showStep(step3aP);
          return;
        }

        if (activeBranch === "3b-p" && step3bP) {
          showStep(step3bP);
          return;
        }

        if (activeBranch === "3c-p" && step3cP) {
          showStep(step3cP);
          return;
        }
      }

      if (visibleStep === step6 && step5) {
        showStep(step5);
        return;
      }
    }

    if (nextBtn) {
      e.preventDefault();

      var currentStep = getVisibleStep();

      if (currentStep === step3aAglova && step5) {
        showStep(step5);
        return;
      }

      if (currentStep === step3bAglova && step5) {
        showStep(step5);
        return;
      }

      if (currentStep === step3aP && step5) {
        showStep(step5);
        return;
      }

      if (currentStep === step3bP && step5) {
        showStep(step5);
        return;
      }

      if (currentStep === step3cP && step5) {
        showStep(step5);
        return;
      }

      if (currentStep === step5 && step6) {
        showStep(step6);
        return;
      }
    }
  });

  // =========================
  // SUBMIT
  // =========================
  smartForm.addEventListener("submit", function (e) {
    e.preventDefault();

    var visibleStep = getVisibleStep();
    if (!visibleStep) return;

    beforeRealSubmit();

    clearBranchBorders(step3aAglova);
    clearBranchBorders(step3bAglova);
    clearBranchBorders(step3aP);
    clearBranchBorders(step3bP);
    clearBranchBorders(step3cP);

    var inputs = qsa(visibleStep, "input, select, textarea");
    var hasError = false;

    inputs.forEach(function (input) {
      if (input.type === "hidden") return;
      if (input.type === "submit") return;
      if (input.disabled) return;

      var value = (input.value || "").trim();

      if (input.hasAttribute("data-required-step") && !value) {
        hasError = true;
        input.style.border = "2px solid red";
      }
    });

    if (hasError) {
      return;
    }

    buildReadableSummary();
    HTMLFormElement.prototype.submit.call(smartForm);
  });
});
