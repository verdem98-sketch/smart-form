
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

  function getValue(el) {
    if (!el) return "";
    return (el.value || "").trim();
  }

  function setValue(el, value) {
    if (!el) return;
    el.value = value || "";
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

  function setMail(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = value || "";
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

  function removeActiveFromRow(row, selector) {
    if (!row) return;
    qsa(row, selector || ".option-pill, .vision-card, [data-group]").forEach(function (el) {
      el.classList.remove("active");
    });
  }

  function removeActiveInScope(scope, selector) {
    if (!scope) return;
    qsa(scope, selector || ".option-pill, .vision-card, [data-group]").forEach(function (el) {
      el.classList.remove("active");
    });
  }

  function setSingleActive(target, selector) {
    if (!target) return;
    var row =
      target.closest(".options-row") ||
      target.closest(".question-wrap") ||
      target.closest(".vision-set") ||
      target.parentElement;

    if (!row) return;
    removeActiveFromRow(row, selector || ".option-pill, .vision-card, [data-group]");
    target.classList.add("active");
  }

  function toggleActive(target) {
    if (!target) return false;
    var active = target.classList.contains("active");
    if (active) {
      target.classList.remove("active");
      return false;
    }
    target.classList.add("active");
    return true;
  }

  function setFieldsState(scopeEl, enabled) {
    if (!scopeEl) return;
    qsa(scopeEl, "input, select, textarea, button").forEach(function (el) {
      if (el.type === "hidden") return;
      if (el.type === "submit") return;
      el.disabled = !enabled;
    });
  }

  function yesNo(v) {
    var raw = String(v || "").trim().toLowerCase();
    if (!raw) return "Не";
    if (raw === "yes" || raw === "да" || raw === "true") return "Да";
    if (raw === "no" || raw === "не" || raw === "false") return "Не";
    return v;
  }

  function pushIf(lines, label, value) {
    if (!value) return;
    lines.push(label + ": " + value);
  }

  function textOf(el) {
    if (!el) return "";
    return (el.textContent || "").trim();
  }

  // ==================================================
  // PICKERS
  // ==================================================
  function getPickerValue(controlEl) {
    if (!controlEl) return 0;
    var valueEl = qs(controlEl, ".picker-value");
    if (!valueEl) return 0;

    var raw = textOf(valueEl).replace(/[^\d-]/g, "");
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

    if (btn.classList.contains("meter-up")) {
      meters += 1;
      setPickerValue(metersControl, meters);
      syncRowHidden(row);
      return;
    }

    if (btn.classList.contains("meter-down")) {
      meters = Math.max(0, meters - 1);
      setPickerValue(metersControl, meters);
      syncRowHidden(row);
      return;
    }

    if (btn.classList.contains("cm-up")) {
      if (!hasCm) return;

      if (centimeters >= 95) {
        if (hasMeters) {
          centimeters = 0;
          meters += 1;
          setPickerValue(metersControl, meters);
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

    if (btn.classList.contains("cm-down")) {
      if (!hasCm) return;

      if (centimeters <= 0) {
        if (hasMeters && meters > 0) {
          meters -= 1;
          centimeters = 95;
          setPickerValue(metersControl, meters);
        } else {
          centimeters = 0;
        }
      } else {
        centimeters -= 5;
      }

      setPickerValue(centimetersControl, centimeters);
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
  var openButtons = qsa(document, ".open-smart-form");

  if (!overlay || !modalCard || !smartFormBlock || !formEl) return;

  // ==================================================
  // STEPS / FLOWS
  // ==================================================
  var step1 = qs(smartFormBlock, ".step-1");
  var flowPrava = firstExisting(smartFormBlock, [".flow-prava", ".step-2-prava", ".step-3-prava"]);
  var flowAglova = firstExisting(smartFormBlock, [".flow-aglova", ".step-2-aglova"]);
  var flowP = firstExisting(smartFormBlock, [".flow-p", ".step-2-p"]);

  var step3Prava = firstExisting(smartFormBlock, [".step-3-prava", ".flow-prava"]);
  var step3aAglova = qs(smartFormBlock, ".step-3a-aglova");
  var step3bAglova = qs(smartFormBlock, ".step-3b-aglova");

  var step3aP = qs(smartFormBlock, ".step-3a-p");
  var step3bP = qs(smartFormBlock, ".step-3b-p");
  var step3cP = qs(smartFormBlock, ".step-3c-p");

  var allSteps = [
    step1,
    flowPrava,
    flowAglova,
    flowP,
    step3Prava,
    step3aAglova,
    step3bAglova,
    step3aP,
    step3bP,
    step3cP
  ].filter(Boolean).filter(function (v, i, a) {
    return a.indexOf(v) === i;
  });

  var activeKitchenType = "";
  var activeBranch = "";

  function getVisibleStep() {
    var visible = null;
    allSteps.forEach(function (step) {
      if (step && window.getComputedStyle(step).display !== "none") {
        visible = step;
      }
    });
    return visible;
  }

  function hideAllSteps() {
    allSteps.forEach(function (step) {
      hide(step);
      setFieldsState(step, false);
    });
  }

  function showStep(stepEl) {
    hideAllSteps();
    show(stepEl, "block");
    setFieldsState(stepEl, true);
  }

  function getActiveBranchStep() {
    if (activeBranch === "prava") return step3Prava;
    if (activeBranch === "3a") return step3aAglova;
    if (activeBranch === "3b") return step3bAglova;
    if (activeBranch === "3a-p") return step3aP;
    if (activeBranch === "3b-p") return step3bP;
    if (activeBranch === "3c-p") return step3cP;
    return null;
  }

  function syncConfigurationHidden() {
    var label = "";

    if (activeBranch === "prava") label = "Права кухня";
    if (activeBranch === "3a") label = "Ъглова без комин";
    if (activeBranch === "3b") label = "Ъглова с комин";
    if (activeBranch === "3a-p") label = "П кухня без комин";
    if (activeBranch === "3b-p") label = "П кухня с комин отляво";
    if (activeBranch === "3c-p") label = "П кухня с комин отдясно";

    setHidden("configuration", label);
  }

  // ==================================================
  // GENERAL QUESTIONS INSIDE STEP 3
  // ==================================================
  function getGeneralScope(stepEl) {
    if (!stepEl) return null;
    return firstExisting(stepEl, [
      ".general-questions-wrap",
      ".general-questions",
      ".step-general-wrap",
      ".final-questions-wrap"
    ]) || stepEl;
  }

  function getVisionLabel(card) {
    if (!card) return "";
    return textOf(qs(card, ".vision-text")) || textOf(card);
  }

  function syncGeneralQuestionsFromScope(stepEl) {
    if (!stepEl) return;

    var scope = getGeneralScope(stepEl);
    if (!scope) return;

    var activeVision = firstExisting(scope, [".vision-card.active"]);
    var activePlan = firstExisting(scope, [".option-pill.plan.active", '[data-group="plan"].active']);
    var activeContact = firstExisting(scope, [".option-pill.contact.active", '[data-group="contact"].active']);

    var visionVal = activeVision ? getVisionLabel(activeVision) : "";
    var planVal = activePlan ? (activePlan.getAttribute("data-value") || textOf(activePlan)) : "";
    var contactVal = activeContact ? (activeContact.getAttribute("data-value") || textOf(activeContact)) : "";

    setHidden("vision", visionVal);
    setHidden("plan", planVal);
    setHidden("contact_preference", contactVal);
  }

  function bindGeneralQuestions(stepEl) {
    if (!stepEl) return;

    stepEl.addEventListener("click", function (e) {
      var target = e.target.closest(".vision-card, .option-pill.plan, .option-pill.contact, [data-group]");
      if (!target || !stepEl.contains(target)) return;

      if (target.classList.contains("vision-card")) {
        e.preventDefault();
        var setWrap = target.closest(".vision-set") || target.parentElement;
        removeActiveFromRow(setWrap, ".vision-card");
        target.classList.add("active");
        setHidden("vision", getVisionLabel(target));
        return;
      }

      var group = target.getAttribute("data-group");

      if (target.classList.contains("plan") || group === "plan") {
        e.preventDefault();
        setSingleActive(target, '.option-pill.plan, [data-group="plan"]');
        setHidden("plan", target.getAttribute("data-value") || textOf(target));
        return;
      }

      if (target.classList.contains("contact") || group === "contact") {
        e.preventDefault();
        setSingleActive(target, '.option-pill.contact, [data-group="contact"]');
        setHidden("contact_preference", target.getAttribute("data-value") || textOf(target));
      }
    });
  }

  [
    step3Prava,
    step3aAglova,
    step3bAglova,
    step3aP,
    step3bP,
    step3cP
  ].forEach(bindGeneralQuestions);

  // ==================================================
  // SUMMARY
  // ==================================================
  function buildReadableSummary() {
    syncConfigurationHidden();
    syncGeneralQuestionsFromScope(getActiveBranchStep());

    var lines = [];
    var summaryField = qs(formEl, '[name="summary_readable"]');
    if (!summaryField) return;

    pushIf(lines, "Конфигурация", getHidden("configuration"));

    if (activeBranch === "prava") {
      pushIf(lines, "Комин", getHidden("chimney_position_prava"));
      pushIf(lines, "Дължина", getHidden("stena1_prava") || getHidden("wall_1_prava"));
      pushIf(lines, "Височина", getHidden("visochina_prava") || getHidden("room_height_prava"));
      pushIf(lines, "Бар", yesNo(getHidden("bar_enabled_prava")));
      pushIf(lines, "Бар дължина", getHidden("bar_length_prava"));
      pushIf(lines, "Бар дълбочина", getHidden("bar_depth_prava"));
      pushIf(lines, "Остров", yesNo(getHidden("island_enabled_prava")));
      pushIf(lines, "Остров дължина", getHidden("island_length_prava"));
      pushIf(lines, "Остров дълбочина", getHidden("island_depth_prava"));
      pushIf(lines, "Колона за фурна", yesNo(getHidden("oven_tall_unit_prava")));
      pushIf(lines, "Хладилник", getHidden("fridge_type_prava"));
    }

    if (activeBranch === "3a") {
      pushIf(lines, "Вода", getHidden("water_position_3a"));
      pushIf(lines, "Комин", getHidden("chimney_position_3a"));
      pushIf(lines, "Стена 1", getHidden("stena1_3a"));
      pushIf(lines, "Стена 2", getHidden("stena2_3a"));
      pushIf(lines, "Височина", getHidden("visochina_3a"));
      pushIf(lines, "Бар", yesNo(getHidden("bar_enabled_3a")));
      pushIf(lines, "Бар дължина", getHidden("bar_length_3a"));
      pushIf(lines, "Бар дълбочина", getHidden("bar_depth_3a"));
      pushIf(lines, "Остров", yesNo(getHidden("island_enabled_3a")));
      pushIf(lines, "Остров дължина", getHidden("island_length_3a"));
      pushIf(lines, "Остров дълбочина", getHidden("island_depth_3a"));
      pushIf(lines, "Колона за фурна", yesNo(getHidden("oven_tall_unit_3a")));
      pushIf(lines, "Хладилник", getHidden("fridge_type_3a"));
    }

    if (activeBranch === "3b") {
      pushIf(lines, "Вода", getHidden("water_position_3b"));
      pushIf(lines, "Комин", getHidden("chimney_position_3b"));
      pushIf(lines, "Стена 1", getHidden("stena1_3b"));
      pushIf(lines, "Стена 2", getHidden("stena2_3b"));
      pushIf(lines, "Височина", getHidden("visochina_3b"));
      pushIf(lines, "Комин A", getHidden("komin_a_3b"));
      pushIf(lines, "Комин B", getHidden("komin_b_3b"));
      pushIf(lines, "Бар", yesNo(getHidden("bar_enabled_3b")));
      pushIf(lines, "Бар дължина", getHidden("bar_length_3b"));
      pushIf(lines, "Бар дълбочина", getHidden("bar_depth_3b"));
      pushIf(lines, "Остров", yesNo(getHidden("island_enabled_3b")));
      pushIf(lines, "Остров дължина", getHidden("island_length_3b"));
      pushIf(lines, "Остров дълбочина", getHidden("island_depth_3b"));
      pushIf(lines, "Колона за фурна", yesNo(getHidden("oven_tall_unit_3b")));
      pushIf(lines, "Хладилник", getHidden("fridge_type_3b"));
    }

    if (activeBranch === "3a-p") {
      pushIf(lines, "Вода", getHidden("water_position_p_3a"));
      pushIf(lines, "Котлони", getHidden("hob_position_p_3a"));
      pushIf(lines, "Стена 1", getHidden("stena1_p_3a"));
      pushIf(lines, "Стена 2", getHidden("stena2_p_3a"));
      pushIf(lines, "Стена 3", getHidden("stena3_p_3a"));
      pushIf(lines, "Височина", getHidden("visochina_p_3a"));
      pushIf(lines, "Бар", yesNo(getHidden("bar_enabled_p_3a")));
      pushIf(lines, "Бар дължина", getHidden("bar_length_p_3a"));
      pushIf(lines, "Бар дълбочина", getHidden("bar_depth_p_3a"));
      pushIf(lines, "Остров", yesNo(getHidden("island_enabled_p_3a")));
      pushIf(lines, "Остров дължина", getHidden("island_length_p_3a"));
      pushIf(lines, "Остров дълбочина", getHidden("island_depth_p_3a"));
      pushIf(lines, "Колона за фурна", yesNo(getHidden("oven_tall_unit_p_3a")));
      pushIf(lines, "Хладилник", getHidden("fridge_type_p_3a"));
    }

    if (activeBranch === "3b-p") {
      pushIf(lines, "Вода", getHidden("water_position_p_3b"));
      pushIf(lines, "Котлони", getHidden("hob_position_p_3b"));
      pushIf(lines, "Стена 1", getHidden("stena1_p_3b"));
      pushIf(lines, "Стена 2", getHidden("stena2_p_3b"));
      pushIf(lines, "Стена 3", getHidden("stena3_p_3b"));
      pushIf(lines, "Височина", getHidden("visochina_p_3b"));
      pushIf(lines, "Комин A", getHidden("komin_a_p_3b"));
      pushIf(lines, "Комин B", getHidden("komin_b_p_3b"));
      pushIf(lines, "Бар", yesNo(getHidden("bar_enabled_p_3b")));
      pushIf(lines, "Бар дължина", getHidden("bar_length_p_3b"));
      pushIf(lines, "Бар дълбочина", getHidden("bar_depth_p_3b"));
      pushIf(lines, "Остров", yesNo(getHidden("island_enabled_p_3b")));
      pushIf(lines, "Остров дължина", getHidden("island_length_p_3b"));
      pushIf(lines, "Остров дълбочина", getHidden("island_depth_p_3b"));
      pushIf(lines, "Колона за фурна", yesNo(getHidden("oven_tall_unit_p_3b")));
      pushIf(lines, "Хладилник", getHidden("fridge_type_p_3b"));
    }

    if (activeBranch === "3c-p") {
      pushIf(lines, "Вода", getHidden("water_position_p_3c"));
      pushIf(lines, "Котлони", getHidden("hob_position_p_3c"));
      pushIf(lines, "Стена 1", getHidden("stena1_p_3c"));
      pushIf(lines, "Стена 2", getHidden("stena2_p_3c"));
      pushIf(lines, "Стена 3", getHidden("stena3_p_3c"));
      pushIf(lines, "Височина", getHidden("visochina_p_3c"));
      pushIf(lines, "Комин A", getHidden("komin_a_p_3c"));
      pushIf(lines, "Комин B", getHidden("komin_b_p_3c"));
      pushIf(lines, "Бар", yesNo(getHidden("bar_enabled_p_3c")));
      pushIf(lines, "Бар дължина", getHidden("bar_length_p_3c"));
      pushIf(lines, "Бар дълбочина", getHidden("bar_depth_p_3c"));
      pushIf(lines, "Остров", yesNo(getHidden("island_enabled_p_3c")));
      pushIf(lines, "Остров дължина", getHidden("island_length_p_3c"));
      pushIf(lines, "Остров дълбочина", getHidden("island_depth_p_3c"));
      pushIf(lines, "Колона за фурна", yesNo(getHidden("oven_tall_unit_p_3c")));
      pushIf(lines, "Хладилник", getHidden("fridge_type_p_3c"));
    }

    pushIf(lines, "Визия", getHidden("vision"));
    pushIf(lines, "Кога планирате", getHidden("plan"));
    pushIf(lines, "Предпочитан контакт", getHidden("contact_preference"));

    var activeStep = getActiveBranchStep();
    if (activeStep) {
      var checkedLabels = [];
      qsa(activeStep, 'input[type="checkbox"]:checked').forEach(function (checkbox) {
        var label =
          checkbox.getAttribute("data-summary-label") ||
          checkbox.getAttribute("data-label") ||
          checkbox.name ||
          checkbox.value ||
          "";
        if (label) checkedLabels.push(label);
      });

      if (checkedLabels.length) {
        lines.push("Допълнителни предпочитания: " + checkedLabels.join(", "));
      }

      qsa(activeStep, "textarea").forEach(function (ta) {
        var v = getValue(ta);
        if (!v) return;

        var label =
          ta.getAttribute("data-summary-label") ||
          ta.getAttribute("data-label") ||
          ta.name ||
          "Коментар";

        lines.push(label + ": " + v);
      });
    }

    summaryField.value = lines.join("\n");
  }

  // ==================================================
  // MODAL
  // ==================================================
  function openModal() {
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";

    activeKitchenType = "";
    activeBranch = "";

    hideAllSteps();
    if (step1) showStep(step1);

    syncConfigurationHidden();
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
    if (e.key === "Escape") closeModal();
  });

  // ==================================================
  // STEP 1
  // ==================================================
  if (step1) {
    qsa(step1, ".kitchen-card").forEach(function (card, index) {
      card.style.cursor = "pointer";

      card.addEventListener("click", function (e) {
        e.preventDefault();

        if (index === 0 && step3Prava) {
          activeKitchenType = "straight";
          activeBranch = "prava";
          syncConfigurationHidden();
          resetPravaState();
          showStep(step3Prava);
          return;
        }

        if (index === 1 && flowAglova) {
          activeKitchenType = "corner";
          activeBranch = "";
          syncConfigurationHidden();
          showStep(flowAglova);
          return;
        }

        if (index === 2 && flowP) {
          activeKitchenType = "u";
          activeBranch = "";
          syncConfigurationHidden();
          showStep(flowP);
        }
      });
    });
  }

  // ==================================================
  // FLOW AGLOVA
  // ==================================================
  if (flowAglova) {
    var aglovaChoiceNoCorner = qs(flowAglova, ".choice-card-no-corner");
    var aglovaChoiceWithCorner = qs(flowAglova, ".choice-card-with-corner");

    if (aglovaChoiceNoCorner) {
      aglovaChoiceNoCorner.addEventListener("click", function (e) {
        e.preventDefault();
        activeKitchenType = "corner";
        activeBranch = "3a";
        syncConfigurationHidden();
        setHidden("aglova_has_corner", "no");
        resetStep3aState();
        showStep(step3aAglova);
      });
    }

    if (aglovaChoiceWithCorner) {
      aglovaChoiceWithCorner.addEventListener("click", function (e) {
        e.preventDefault();
        activeKitchenType = "corner";
        activeBranch = "3b";
        syncConfigurationHidden();
        setHidden("aglova_has_corner", "yes");
        resetStep3bState();
        showStep(step3bAglova);
      });
    }
  }

  // ==================================================
  // FLOW P
  // ==================================================
  if (flowP) {
    var pChoiceNoChimney = qs(flowP, ".choice-card-no-chimney");
    var pChoiceLeftChimney = qs(flowP, ".choice-card-left-chimney");
    var pChoiceRightChimney = qs(flowP, ".choice-card-right-chimney");

    if (pChoiceNoChimney) {
      pChoiceNoChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeKitchenType = "u";
        activeBranch = "3a-p";
        syncConfigurationHidden();
        resetStep3aPState();
        showStep(step3aP);
      });
    }

    if (pChoiceLeftChimney) {
      pChoiceLeftChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeKitchenType = "u";
        activeBranch = "3b-p";
        syncConfigurationHidden();
        resetStep3bPState();
        showStep(step3bP);
      });
    }

    if (pChoiceRightChimney) {
      pChoiceRightChimney.addEventListener("click", function (e) {
        e.preventDefault();
        activeKitchenType = "u";
        activeBranch = "3c-p";
        syncConfigurationHidden();
        resetStep3cPState();
        showStep(step3cP);
      });
    }
  }

  // ==================================================
  // STRAIGHT / PRAVA
  // ==================================================
  var pravaState = {
    chimney: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function getPravaRefs() {
    if (!step3Prava) return null;

    return {
      comboSelectWrap: qs(step3Prava, ".combo-select-wrap"),
      dimensionsPhaseWrap: qs(step3Prava, ".dimensions-phase-wrap"),
      barWrap: qs(step3Prava, ".bar-wrap"),
      islandWrap: qs(step3Prava, ".island-wrap"),
      cadBase: qs(step3Prava, ".cad-prava-base"),
      cadLeft: qs(step3Prava, ".cad-prava-sketch-36"),
      cadRight: qs(step3Prava, ".cad-prava-sketch-37")
    };
  }

  function showPravaCad(target) {
    var refs = getPravaRefs();
    if (!refs) return;
    hideAll([refs.cadBase, refs.cadLeft, refs.cadRight]);
    show(target || refs.cadBase);
  }

  function resetPravaState() {
    if (!step3Prava) return;

    pravaState = {
      chimney: "",
      island: "no",
      bar: "no",
      oven: "no",
      fridge: ""
    };

    var refs = getPravaRefs();

    removeActiveInScope(step3Prava, ".option-pill, .vision-card");
    resetPickerScope(step3Prava);

    if (refs.comboSelectWrap) show(refs.comboSelectWrap, "block");
    if (refs.dimensionsPhaseWrap) hide(refs.dimensionsPhaseWrap);
    if (refs.barWrap) hide(refs.barWrap);
    if (refs.islandWrap) hide(refs.islandWrap);

    showPravaCad(refs.cadBase);

    setHidden("chimney_position_prava", "");
    setHidden("stena1_prava", "");
    setHidden("visochina_prava", "");
    setHidden("bar_enabled_prava", "no");
    setHidden("bar_length_prava", "");
    setHidden("bar_depth_prava", "");
    setHidden("island_enabled_prava", "no");
    setHidden("island_length_prava", "");
    setHidden("island_depth_prava", "");
    setHidden("oven_tall_unit_prava", "no");
    setHidden("fridge_type_prava", "");
  }

  if (step3Prava) {
    step3Prava.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn) {
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

      var refs = getPravaRefs();
      var chimneyLeft = e.target.closest(".chimney-left");
      var chimneyRight = e.target.closest(".chimney-right");

      if (chimneyLeft) {
        e.preventDefault();
        setSingleActive(chimneyLeft);
        pravaState.chimney = "left";
        setHidden("chimney_position_prava", "Ляво");
        showPravaCad(refs.cadLeft);
        if (refs.comboSelectWrap) hide(refs.comboSelectWrap);
        if (refs.dimensionsPhaseWrap) show(refs.dimensionsPhaseWrap, "block");
        return;
      }

      if (chimneyRight) {
        e.preventDefault();
        setSingleActive(chimneyRight);
        pravaState.chimney = "right";
        setHidden("chimney_position_prava", "Дясно");
        showPravaCad(refs.cadRight);
        if (refs.comboSelectWrap) hide(refs.comboSelectWrap);
        if (refs.dimensionsPhaseWrap) show(refs.dimensionsPhaseWrap, "block");
        return;
      }

      var islandYes = e.target.closest(".island-yes");
      if (islandYes) {
        e.preventDefault();
        var islandOn = toggleActive(islandYes);
        pravaState.island = islandOn ? "yes" : "no";
        setHidden("island_enabled_prava", islandOn ? "yes" : "no");

        if (islandOn) show(refs.islandWrap, "block");
        else {
          hide(refs.islandWrap);
          resetPickerScope(refs.islandWrap);
        }
        return;
      }

      var barYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (barYes) {
        e.preventDefault();
        var barOn = toggleActive(barYes);
        pravaState.bar = barOn ? "yes" : "no";
        setHidden("bar_enabled_prava", barOn ? "yes" : "no");

        if (barOn) show(refs.barWrap, "block");
        else {
          hide(refs.barWrap);
          resetPickerScope(refs.barWrap);
        }
        return;
      }

      var ovenYes = e.target.closest(".oven-column-yes");
      if (ovenYes) {
        e.preventDefault();
        var ovenOn = toggleActive(ovenYes);
        pravaState.oven = ovenOn ? "yes" : "no";
        setHidden("oven_tall_unit_prava", ovenOn ? "yes" : "no");
        return;
      }

      var fridgeBuiltIn = e.target.closest(".fridge-built-in");
      var fridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (fridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(fridgeBuiltIn);
        pravaState.fridge = "built-in";
        setHidden("fridge_type_prava", "Вграден");
        return;
      }

      if (fridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(fridgeFreeStanding);
        pravaState.fridge = "free-standing";
        setHidden("fridge_type_prava", "Свободно стоящ");
      }
    });
  }

  // ==================================================
  // AGLOVA 3A
  // ==================================================
  var state3a = {
    water: "",
    chimney: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function refs3a() {
    return {
      combo: qs(step3aAglova, ".combo-select-wrap"),
      dim: qs(step3aAglova, ".dimensions-phase-wrap"),
      bar: qs(step3aAglova, ".bar-wrap"),
      island: qs(step3aAglova, ".island-wrap"),
      base: qs(step3aAglova, ".cad-3a-base"),
      s1: qs(step3aAglova, ".cad-3a-sketch-1"),
      s2: qs(step3aAglova, ".cad-3a-sketch-2"),
      s3: qs(step3aAglova, ".cad-3a-sketch-3"),
      s4: qs(step3aAglova, ".cad-3a-sketch-4")
    };
  }

  function show3aCad(el) {
    var r = refs3a();
    hideAll([r.base, r.s1, r.s2, r.s3, r.s4]);
    show(el || r.base);
  }

  function update3aCad() {
    var r = refs3a();
    if (!state3a.water || !state3a.chimney) return show3aCad(r.base);
    if (state3a.water === "2" && state3a.chimney === "1") return show3aCad(r.s1);
    if (state3a.water === "2" && state3a.chimney === "4") return show3aCad(r.s2);
    if (state3a.water === "3" && state3a.chimney === "1") return show3aCad(r.s3);
    if (state3a.water === "3" && state3a.chimney === "4") return show3aCad(r.s4);
    show3aCad(r.base);
  }

  function resetStep3aState() {
    if (!step3aAglova) return;
    state3a = { water: "", chimney: "", island: "no", bar: "no", oven: "no", fridge: "" };

    var r = refs3a();
    removeActiveInScope(step3aAglova, ".option-pill, .vision-card");
    resetPickerScope(step3aAglova);

    if (r.combo) show(r.combo, "block");
    if (r.dim) hide(r.dim);
    if (r.bar) hide(r.bar);
    if (r.island) hide(r.island);

    show3aCad(r.base);

    setHidden("water_position_3a", "");
    setHidden("chimney_position_3a", "");
    setHidden("bar_enabled_3a", "no");
    setHidden("island_enabled_3a", "no");
    setHidden("oven_tall_unit_3a", "no");
    setHidden("fridge_type_3a", "");
  }

  if (step3aAglova) {
    step3aAglova.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn) {
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

      var r = refs3a();

      var water2 = e.target.closest(".water-pos-2");
      var water3 = e.target.closest(".water-pos-3");
      var chimney1 = e.target.closest(".chimney-pos-1");
      var chimney4 = e.target.closest(".chimney-pos-4");

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3a.water = "2";
        setHidden("water_position_3a", "Стена 2");
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3a.water = "3";
        setHidden("water_position_3a", "Стена 3");
      }

      if (chimney1) {
        e.preventDefault();
        setSingleActive(chimney1);
        state3a.chimney = "1";
        setHidden("chimney_position_3a", "Стена 1");
      }

      if (chimney4) {
        e.preventDefault();
        setSingleActive(chimney4);
        state3a.chimney = "4";
        setHidden("chimney_position_3a", "Стена 4");
      }

      if ((water2 || water3 || chimney1 || chimney4) && state3a.water && state3a.chimney) {
        update3aCad();
        if (r.combo) hide(r.combo);
        if (r.dim) show(r.dim, "block");
        return;
      }

      var islandYes = e.target.closest(".island-yes");
      if (islandYes) {
        e.preventDefault();
        var islandOn = toggleActive(islandYes);
        state3a.island = islandOn ? "yes" : "no";
        setHidden("island_enabled_3a", islandOn ? "yes" : "no");

        if (islandOn) show(r.island, "block");
        else {
          hide(r.island);
          resetPickerScope(r.island);
        }
        return;
      }

      var barYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (barYes) {
        e.preventDefault();
        var barOn = toggleActive(barYes);
        state3a.bar = barOn ? "yes" : "no";
        setHidden("bar_enabled_3a", barOn ? "yes" : "no");

        if (barOn) show(r.bar, "block");
        else {
          hide(r.bar);
          resetPickerScope(r.bar);
        }
        return;
      }

      var ovenYes = e.target.closest(".oven-column-yes");
      if (ovenYes) {
        e.preventDefault();
        var ovenOn = toggleActive(ovenYes);
        state3a.oven = ovenOn ? "yes" : "no";
        setHidden("oven_tall_unit_3a", ovenOn ? "yes" : "no");
        return;
      }

      var fridgeBuiltIn = e.target.closest(".fridge-built-in");
      var fridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (fridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(fridgeBuiltIn);
        state3a.fridge = "built-in";
        setHidden("fridge_type_3a", "Вграден");
        return;
      }

      if (fridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(fridgeFreeStanding);
        state3a.fridge = "free-standing";
        setHidden("fridge_type_3a", "Свободно стоящ");
      }
    });
  }

  // ==================================================
  // AGLOVA 3B
  // ==================================================
  var state3b = {
    water: "",
    chimney: "",
    island: "no",
    bar: "no",
    oven: "no",
    fridge: ""
  };

  function refs3b() {
    return {
      combo: qs(step3bAglova, ".combo-select-wrap"),
      dim: qs(step3bAglova, ".dimensions-phase-wrap"),
      bar: qs(step3bAglova, ".bar-wrap"),
      island: qs(step3bAglova, ".island-wrap"),
      base: qs(step3bAglova, ".cad-3b-base"),
      s5: qs(step3bAglova, ".cad-3b-sketch-5"),
      s6: qs(step3bAglova, ".cad-3b-sketch-6"),
      s7: qs(step3bAglova, ".cad-3b-sketch-7"),
      s8: qs(step3bAglova, ".cad-3b-sketch-8")
    };
  }

  function show3bCad(el) {
    var r = refs3b();
    hideAll([r.base, r.s5, r.s6, r.s7, r.s8]);
    show(el || r.base);
  }

  function update3bCad() {
    var r = refs3b();
    if (!state3b.water || !state3b.chimney) return show3bCad(r.base);
    if (state3b.water === "2" && state3b.chimney === "a") return show3bCad(r.s5);
    if (state3b.water === "2" && state3b.chimney === "b") return show3bCad(r.s6);
    if (state3b.water === "3" && state3b.chimney === "a") return show3bCad(r.s7);
    if (state3b.water === "3" && state3b.chimney === "b") return show3bCad(r.s8);
    show3bCad(r.base);
  }

  function resetStep3bState() {
    if (!step3bAglova) return;
    state3b = { water: "", chimney: "", island: "no", bar: "no", oven: "no", fridge: "" };

    var r = refs3b();
    removeActiveInScope(step3bAglova, ".option-pill, .vision-card");
    resetPickerScope(step3bAglova);

    if (r.combo) show(r.combo, "block");
    if (r.dim) hide(r.dim);
    if (r.bar) hide(r.bar);
    if (r.island) hide(r.island);

    show3bCad(r.base);

    setHidden("water_position_3b", "");
    setHidden("chimney_position_3b", "");
    setHidden("bar_enabled_3b", "no");
    setHidden("island_enabled_3b", "no");
    setHidden("oven_tall_unit_3b", "no");
    setHidden("fridge_type_3b", "");
  }

  if (step3bAglova) {
    step3bAglova.addEventListener("click", function (e) {
      var pickerBtn = e.target.closest(".picker-btn");
      if (pickerBtn) {
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

      var r = refs3b();

      var water2 = e.target.closest(".water-pos-2");
      var water3 = e.target.closest(".water-pos-3");
      var chimneyA = e.target.closest(".chimney-pos-a");
      var chimneyB = e.target.closest(".chimney-pos-b");

      if (water2) {
        e.preventDefault();
        setSingleActive(water2);
        state3b.water = "2";
        setHidden("water_position_3b", "Стена 2");
      }

      if (water3) {
        e.preventDefault();
        setSingleActive(water3);
        state3b.water = "3";
        setHidden("water_position_3b", "Стена 3");
      }

      if (chimneyA) {
        e.preventDefault();
        setSingleActive(chimneyA);
        state3b.chimney = "a";
        setHidden("chimney_position_3b", "Позиция A");
      }

      if (chimneyB) {
        e.preventDefault();
        setSingleActive(chimneyB);
        state3b.chimney = "b";
        setHidden("chimney_position_3b", "Позиция B");
      }

      if ((water2 || water3 || chimneyA || chimneyB) && state3b.water && state3b.chimney) {
        update3bCad();
        if (r.combo) hide(r.combo);
        if (r.dim) show(r.dim, "block");
        return;
      }

      var islandYes = e.target.closest(".island-yes");
      if (islandYes) {
        e.preventDefault();
        var islandOn = toggleActive(islandYes);
        state3b.island = islandOn ? "yes" : "no";
        setHidden("island_enabled_3b", islandOn ? "yes" : "no");

        if (islandOn) show(r.island, "block");
        else {
          hide(r.island);
          resetPickerScope(r.island);
        }
        return;
      }

      var barYes = e.target.closest(".bar-yes, .bar-counter-yes");
      if (barYes) {
        e.preventDefault();
        var barOn = toggleActive(barYes);
        state3b.bar = barOn ? "yes" : "no";
        setHidden("bar_enabled_3b", barOn ? "yes" : "no");

        if (barOn) show(r.bar, "block");
        else {
          hide(r.bar);
          resetPickerScope(r.bar);
        }
        return;
      }

      var ovenYes = e.target.closest(".oven-column-yes");
      if (ovenYes) {
        e.preventDefault();
        var ovenOn = toggleActive(ovenYes);
        state3b.oven = ovenOn ? "yes" : "no";
        setHidden("oven_tall_unit_3b", ovenOn ? "yes" : "no");
        return;
      }

      var fridgeBuiltIn = e.target.closest(".fridge-built-in");
      var fridgeFreeStanding = e.target.closest(".fridge-free-standing");

      if (fridgeBuiltIn) {
        e.preventDefault();
        setSingleActive(fridgeBuiltIn);
        state3b.fridge = "built-in";
        setHidden("fridge_type_3b", "Вграден");
        return;
      }

      if (fridgeFreeStanding) {
        e.preventDefault();
        setSingleActive(fridgeFreeStanding);
        state3b.fridge = "free-standing";
        setHidden("fridge_type_3b", "Свободно стоящ");
      }
    });
  }

  // ==================================================
  // P BRANCH FACTORY
  // ==================================================
  function makePBranch(stepEl, suffix, baseClass, sketchMap) {
    var state = {
      water: "",
      hob: "",
      island: "no",
      bar: "no",
      oven: "no",
      fridge: ""
    };

    function refs() {
      return {
        combo: qs(stepEl, ".combo-select-wrap"),
        dim: qs(stepEl, ".dimensions-phase-wrap"),
        bar: qs(stepEl, ".bar-wrap"),
        island: qs(stepEl, ".island-wrap"),
        base: qs(stepEl, baseClass),
        all: qsa(stepEl, ".cad-global-wrap img")
      };
    }

    function showCad(el) {
      var r = refs();
      hideAll(r.all);
      show(el || r.base);
    }

    function updateCad() {
      var r = refs();
      if (!state.water || !state.hob) return showCad(r.base);

      var key = state.water + "-" + state.hob;
      var selector = sketchMap[key];
      var target = selector ? qs(stepEl, selector) : null;

      showCad(target || r.base);
    }

    function resetState() {
      if (!stepEl) return;

      state = {
        water: "",
        hob: "",
        island: "no",
        bar: "no",
        oven: "no",
        fridge: ""
      };

      var r = refs();

      removeActiveInScope(stepEl, ".option-pill, .vision-card");
      resetPickerScope(stepEl);

      if (r.combo) show(r.combo, "block");
      if (r.dim) hide(r.dim);
      if (r.bar) hide(r.bar);
      if (r.island) hide(r.island);

      showCad(r.base);

      setHidden("water_position_" + suffix, "");
      setHidden("hob_position_" + suffix, "");
      setHidden("bar_enabled_" + suffix, "no");
      setHidden("island_enabled_" + suffix, "no");
      setHidden("oven_tall_unit_" + suffix, "no");
      setHidden("fridge_type_" + suffix, "");
    }

    if (stepEl) {
      stepEl.addEventListener("click", function (e) {
        var pickerBtn = e.target.closest(".picker-btn");
        if (pickerBtn) {
          e.preventDefault();
          handlePickerButtonClick(pickerBtn);
          return;
        }

        var resetBtn = e.target.closest(".reset-combo-button");
        if (resetBtn) {
          e.preventDefault();
          resetState();
          return;
        }

        var r = refs();

        var water1 = e.target.closest(".water-pos-1");
        var water2 = e.target.closest(".water-pos-2");
        var water3 = e.target.closest(".water-pos-3");
        var hob1 = e.target.closest(".hob-pos-1");
        var hob2 = e.target.closest(".hob-pos-2");
        var hob3 = e.target.closest(".hob-pos-3");

        if (water1) {
          e.preventDefault();
          setSingleActive(water1);
          state.water = "1";
          setHidden("water_position_" + suffix, "Позиция 1");
        }

        if (water2) {
          e.preventDefault();
          setSingleActive(water2);
          state.water = "2";
          setHidden("water_position_" + suffix, "Позиция 2");
        }

        if (water3) {
          e.preventDefault();
          setSingleActive(water3);
          state.water = "3";
          setHidden("water_position_" + suffix, "Позиция 3");
        }

        if (hob1) {
          e.preventDefault();
          setSingleActive(hob1);
          state.hob = "1";
          setHidden("hob_position_" + suffix, "Позиция 1");
        }

        if (hob2) {
          e.preventDefault();
          setSingleActive(hob2);
          state.hob = "2";
          setHidden("hob_position_" + suffix, "Позиция 2");
        }

        if (hob3) {
          e.preventDefault();
          setSingleActive(hob3);
          state.hob = "3";
          setHidden("hob_position_" + suffix, "Позиция 3");
        }

        if ((water1 || water2 || water3 || hob1 || hob2 || hob3) && state.water && state.hob) {
          updateCad();
          if (r.combo) hide(r.combo);
          if (r.dim) show(r.dim, "block");
          return;
        }

        var islandYes = e.target.closest(".island-yes");
        if (islandYes) {
          e.preventDefault();
          var islandOn = toggleActive(islandYes);
          state.island = islandOn ? "yes" : "no";
          setHidden("island_enabled_" + suffix, islandOn ? "yes" : "no");

          if (islandOn) show(r.island, "block");
          else {
            hide(r.island);
            resetPickerScope(r.island);
          }
          return;
        }

        var barYes = e.target.closest(".bar-yes, .bar-counter-yes");
        if (barYes) {
          e.preventDefault();
          var barOn = toggleActive(barYes);
          state.bar = barOn ? "yes" : "no";
          setHidden("bar_enabled_" + suffix, barOn ? "yes" : "no");

          if (barOn) show(r.bar, "block");
          else {
            hide(r.bar);
            resetPickerScope(r.bar);
          }
          return;
        }

        var ovenYes = e.target.closest(".oven-column-yes");
        if (ovenYes) {
          e.preventDefault();
          var ovenOn = toggleActive(ovenYes);
          state.oven = ovenOn ? "yes" : "no";
          setHidden("oven_tall_unit_" + suffix, ovenOn ? "yes" : "no");
          return;
        }

        var fridgeBuiltIn = e.target.closest(".fridge-built-in");
        var fridgeFreeStanding = e.target.closest(".fridge-free-standing");

        if (fridgeBuiltIn) {
          e.preventDefault();
          setSingleActive(fridgeBuiltIn);
          state.fridge = "built-in";
          setHidden("fridge_type_" + suffix, "Вграден");
          return;
        }

        if (fridgeFreeStanding) {
          e.preventDefault();
          setSingleActive(fridgeFreeStanding);
          state.fridge = "free-standing";
          setHidden("fridge_type_" + suffix, "Свободно стоящ");
        }
      });
    }

    return { reset: resetState };
  }

  var p3a = makePBranch(step3aP, "p_3a", ".cad-p-3a-base", {
    "1-1": ".cad-p-sketch-9",
    "1-2": ".cad-p-sketch-10",
    "1-3": ".cad-p-sketch-11",
    "2-1": ".cad-p-sketch-12",
    "2-2": ".cad-p-sketch-13",
    "2-3": ".cad-p-sketch-14",
    "3-1": ".cad-p-sketch-15",
    "3-2": ".cad-p-sketch-16",
    "3-3": ".cad-p-sketch-17"
  });

  var p3b = makePBranch(step3bP, "p_3b", ".cad-p-3b-base", {
    "1-1": ".cad-p-sketch-18",
    "1-2": ".cad-p-sketch-19",
    "1-3": ".cad-p-sketch-20",
    "2-1": ".cad-p-sketch-21",
    "2-2": ".cad-p-sketch-22",
    "2-3": ".cad-p-sketch-23",
    "3-1": ".cad-p-sketch-24",
    "3-2": ".cad-p-sketch-25",
    "3-3": ".cad-p-sketch-26"
  });

  var p3c = makePBranch(step3cP, "p_3c", ".cad-p-3c-base", {
    "1-1": ".cad-p-sketch-27",
    "1-2": ".cad-p-sketch-28",
    "1-3": ".cad-p-sketch-29",
    "2-1": ".cad-p-sketch-30",
    "2-2": ".cad-p-sketch-31",
    "2-3": ".cad-p-sketch-32",
    "3-1": ".cad-p-sketch-33",
    "3-2": ".cad-p-sketch-34",
    "3-3": ".cad-p-sketch-35"
  });

  function resetStep3aPState() { if (p3a) p3a.reset(); }
  function resetStep3bPState() { if (p3b) p3b.reset(); }
  function resetStep3cPState() { if (p3c) p3c.reset(); }

  // ==================================================
  // BACK BUTTONS
  // ==================================================
  smartFormBlock.addEventListener("click", function (e) {
    var backBtn = e.target.closest(".back-button");
    if (!backBtn) return;

    e.preventDefault();

    var visible = getVisibleStep();

    if (visible === flowAglova || visible === flowP || visible === step3Prava) {
      showStep(step1);
      return;
    }

    if (visible === step3aAglova || visible === step3bAglova) {
      showStep(flowAglova);
      return;
    }

    if (visible === step3aP || visible === step3bP || visible === step3cP) {
      showStep(flowP);
    }
  });

  // ==================================================
  // BEFORE SUBMIT
  // ==================================================
  function syncMailFields() {
    function val(name) {
      return getHidden(name);
    }

    setMail("mail_configuration", val("configuration"));
    setMail("mail_water_position", val("water_position_3a") || val("water_position_3b") || val("water_position_p_3a") || val("water_position_p_3b") || val("water_position_p_3c"));
    setMail("mail_hob_position", val("hob_position_p_3a") || val("hob_position_p_3b") || val("hob_position_p_3c"));
    setMail("mail_chimney_position", val("chimney_position_prava") || val("chimney_position_3a") || val("chimney_position_3b"));
    setMail("mail_chimney_a", val("komin_a_3b") || val("komin_a_p_3b") || val("komin_a_p_3c"));
    setMail("mail_chimney_b", val("komin_b_3b") || val("komin_b_p_3b") || val("komin_b_p_3c"));

    setMail("mail_wall_1", val("stena1_prava") || val("stena1_3a") || val("stena1_3b") || val("stena1_p_3a") || val("stena1_p_3b") || val("stena1_p_3c"));
    setMail("mail_wall_2", val("stena2_3a") || val("stena2_3b") || val("stena2_p_3a") || val("stena2_p_3b") || val("stena2_p_3c"));
    setMail("mail_wall_3", val("stena3_p_3a") || val("stena3_p_3b") || val("stena3_p_3c"));
    setMail("mail_room_height", val("visochina_prava") || val("visochina_3a") || val("visochina_3b") || val("visochina_p_3a") || val("visochina_p_3b") || val("visochina_p_3c"));

    setMail("mail_bar_enabled", val("bar_enabled_prava") || val("bar_enabled_3a") || val("bar_enabled_3b") || val("bar_enabled_p_3a") || val("bar_enabled_p_3b") || val("bar_enabled_p_3c"));
    setMail("mail_bar_length", val("bar_length_prava") || val("bar_length_3a") || val("bar_length_3b") || val("bar_length_p_3a") || val("bar_length_p_3b") || val("bar_length_p_3c"));
    setMail("mail_bar_depth", val("bar_depth_prava") || val("bar_depth_3a") || val("bar_depth_3b") || val("bar_depth_p_3a") || val("bar_depth_p_3b") || val("bar_depth_p_3c"));

    setMail("mail_island_enabled", val("island_enabled_prava") || val("island_enabled_3a") || val("island_enabled_3b") || val("island_enabled_p_3a") || val("island_enabled_p_3b") || val("island_enabled_p_3c"));
    setMail("mail_island_length", val("island_length_prava") || val("island_length_3a") || val("island_length_3b") || val("island_length_p_3a") || val("island_length_p_3b") || val("island_length_p_3c"));
    setMail("mail_island_depth", val("island_depth_prava") || val("island_depth_3a") || val("island_depth_3b") || val("island_depth_p_3a") || val("island_depth_p_3b") || val("island_depth_p_3c"));

    setMail("mail_oven_tall_unit", val("oven_tall_unit_prava") || val("oven_tall_unit_3a") || val("oven_tall_unit_3b") || val("oven_tall_unit_p_3a") || val("oven_tall_unit_p_3b") || val("oven_tall_unit_p_3c"));
    setMail("mail_fridge_type", val("fridge_type_prava") || val("fridge_type_3a") || val("fridge_type_3b") || val("fridge_type_p_3a") || val("fridge_type_p_3b") || val("fridge_type_p_3c"));

    setMail("mail_vision", val("vision"));
    setMail("mail_plan", val("plan"));
    setMail("mail_contact_preference", val("contact_preference"));
    setMail("mail_summary_readable", val("summary_readable"));
  }

  function syncCurrentStepDimensions() {
    var activeStep = getActiveBranchStep();
    if (!activeStep) return;

    qsa(activeStep, ".dimension-row").forEach(function (row) {
      syncRowHidden(row);
    });
  }

  formEl.addEventListener("submit", function () {
    syncCurrentStepDimensions();
    syncConfigurationHidden();
    syncGeneralQuestionsFromScope(getActiveBranchStep());
    buildReadableSummary();
    syncMailFields();
  });

  // ==================================================
  // INITIAL STATE
  // ==================================================
  hideAllSteps();
  if (step1) showStep(step1);
  syncConfigurationHidden();
});

