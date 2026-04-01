
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
    if (!el) return "";
    return (el.textContent || "").trim();
  }

  function norm(v) {
    return String(v || "").trim();
  }

  function low(v) {
    return norm(v).toLowerCase();
  }

  function toKey(v) {
    return low(v)
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_-]/gu, "");
  }

  function isYes(v) {
    var x = low(v);
    return x === "да" || x === "yes" || x === "true" || x === "1";
  }

  function yesNo(v) {
    return isYes(v) ? "yes" : "no";
  }

  function getOptionValue(el) {
    return norm(el && (el.getAttribute("data-value") || textOf(el)));
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

  // ==================================================
  // ROOTS
  // ==================================================
  var formEl =
    qs(document, ".smart-form-wrap form") ||
    qs(document, ".w-form form") ||
    qs(document, "form");

  var modalOverlay = qs(document, ".section-overlay");
  var openBtns = qsa(document, ".open-smart-form");
  var closeBtns = qsa(document, ".close-smart-form");

  var kitchenCards = qsa(document, ".kitchen-card");
  var flowPrava = qs(document, ".flow-prava");
  var flowAglova = qs(document, ".flow-aglova");
  var flowP = qs(document, ".flow-p");
  var allFlows = [flowPrava, flowAglova, flowP].filter(Boolean);

  var activeKitchenType = "";
  var activeFlow = null;

  // ==================================================
  // INTERNAL STATE
  // ==================================================
  var state = {
    kitchen_type: "",

    // prava
    chimney_position_prava: "",
    len_prava_3: "",
    height_prava_3: "",
    bar: "",
    bar_len_prava_3: "",
    bar_width_prava_3: "",
    island: "",
    island_len_3a: "",
    island_width_3a: "",
    vision_prava_3: "",
    plan_prava_3: "",
    contact_preference_prava_3: "",

    // aglova 3a
    water_position_3a: "",
    chimney_position_3a: "",
    stena1_len_3a: "",
    stena2_len_3a: "",
    visochina_3a: "",
    bar_enabled_3a: "",
    bar_len_3a: "",
    bar_width_3a: "",
    island_enabled_3a: "",
    island_len_3a: "",
    island_width_3a: "",
    oven_tall_unit_3a: "",
    fridge_type_3a: "",
    vision_3a: "",
    plan_3a: "",
    contact_preference_3a: "",

    // global extras
    dishwasher: "",
    washing_machine: "",
    microwave: "",
    coffee_machine: ""
  };

  // ==================================================
  // HIDDEN INPUT ACCESS
  // ==================================================
  function hiddenByName(name) {
    return qs(formEl, '[name="' + name + '"]');
  }

  function setHidden(name, value) {
    var el = hiddenByName(name);
    if (!el) return;
    el.value = norm(value);
  }

  function getHidden(name) {
    var el = hiddenByName(name);
    return el ? norm(el.value) : "";
  }

  // ==================================================
  // UI SYNC HELPERS
  // ==================================================
  function setState(key, value) {
    state[key] = norm(value);
    updateAllVisibility();
    updateAllCad();
  }

  function getState(key) {
    return norm(state[key] || "");
  }

  function clearKeys(keys) {
    (keys || []).forEach(function (key) {
      state[key] = "";
    });
  }

  var pravaKeys = [
    "chimney_position_prava",
    "len_prava_3",
    "height_prava_3",
    "bar",
    "bar_len_prava_3",
    "bar_width_prava_3",
    "island",
    "island_len_3a",
    "island_width_3a",
    "vision_prava_3",
    "plan_prava_3",
    "contact_preference_prava_3"
  ];

  var aglova3aKeys = [
    "water_position_3a",
    "chimney_position_3a",
    "stena1_len_3a",
    "stena2_len_3a",
    "visochina_3a",
    "bar_enabled_3a",
    "bar_len_3a",
    "bar_width_3a",
    "island_enabled_3a",
    "island_len_3a",
    "island_width_3a",
    "oven_tall_unit_3a",
    "fridge_type_3a",
    "vision_3a",
    "plan_3a",
    "contact_preference_3a"
  ];

  function clearOtherBranches(type) {
    if (type === "prava") {
      clearKeys(aglova3aKeys);
    } else if (type === "aglova") {
      clearKeys(pravaKeys);
    } else if (type === "p") {
      clearKeys(pravaKeys);
      clearKeys(aglova3aKeys);
    }
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
  // FLOW CONTROL
  // ==================================================
  function deactivateAllFlows() {
    allFlows.forEach(function (flow) {
      hide(flow);
    });
    activeFlow = null;
  }

  function activateFlow(flowEl) {
    deactivateAllFlows();
    if (!flowEl) return;
    activeFlow = flowEl;
    show(flowEl);

    qsa(flowEl, ".step").forEach(function (step) {
      hide(step);
    });
  }

  function firstExistingStep(scope, selectors) {
    for (var i = 0; i < selectors.length; i++) {
      var el = qs(scope, selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function showOnlyStep(scope, selectors) {
    if (!scope) return;

    qsa(scope, ".step").forEach(function (step) {
      hide(step);
    });

    var step = firstExistingStep(scope, Array.isArray(selectors) ? selectors : [selectors]);
    if (step) show(step);
  }

  function showInitialStepForKitchen(type) {
    if (type === "prava" && flowPrava) {
      activateFlow(flowPrava);
      showOnlyStep(flowPrava, [".step-3-prava", ".step-2-prava", ".step-prava"]);
      return;
    }

    if (type === "aglova" && flowAglova) {
      activateFlow(flowAglova);
      showOnlyStep(flowAglova, [".step-2-aglova"]);
      return;
    }

    if (type === "p" && flowP) {
      activateFlow(flowP);
      showOnlyStep(flowP, [".step-2-p"]);
    }
  }

  // ==================================================
  // KITCHEN TYPE
  // ==================================================
  kitchenCards.forEach(function (card) {
    card.addEventListener("click", function () {
      setSingleActive(card, ".kitchen-card");

      var type =
        norm(card.getAttribute("data-kitchen")) ||
        norm(card.getAttribute("data-value")) ||
        toKey(textOf(card));

      activeKitchenType = type;
      setState("kitchen_type", type);
      clearOtherBranches(type);
      showInitialStepForKitchen(type);
      openModal();
    });
  });

  // ==================================================
  // CHOICE CARDS
  // ==================================================
  qsa(document, ".choice-card").forEach(function (card) {
    card.addEventListener("click", function () {
      setSingleActive(card, ".choice-card");

      var action = norm(card.getAttribute("data-branch"));
      var flow = card.closest(".flow-aglova, .flow-p, .flow-prava");
      if (!flow || !action) return;

      showOnlyStep(flow, ["." + action]);
      updateAllCad();
    });
  });

  // ==================================================
  // OPTION PILLS
  // ==================================================
  qsa(document, ".option-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      setSingleActive(pill, ".option-pill");

      var wrap = pill.closest(".question-wrap");
      var field =
        norm(pill.getAttribute("data-field")) ||
        norm(wrap && wrap.getAttribute("data-field"));

      var value = getOptionValue(pill);
      if (field) setState(field, value);
    });
  });

  // ==================================================
  // STYLE CARDS
  // ==================================================
  qsa(document, ".style-card").forEach(function (card) {
    card.addEventListener("click", function () {
      setSingleActive(card, ".style-card");

      var wrap = card.closest("[data-field]");
      var field =
        norm(card.getAttribute("data-field")) ||
        norm(wrap && wrap.getAttribute("data-field"));

      var value = getOptionValue(card);
      if (field) setState(field, value);
    });
  });

  // ==================================================
  // TEXTAREA / INPUT / SELECT WITH data-field
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
  // CHECKBOXES WITH data-field
  // ==================================================
  qsa(document, 'input[type="checkbox"][data-field]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      var field = norm(cb.getAttribute("data-field"));
      if (!field) return;
      setState(field, cb.checked ? "Да" : "");
    });
  });

  qsa(document, '[data-field="dishwasher"], [data-field="washing_machine"], [data-field="microwave"], [data-field="coffee_machine"]').forEach(function (el) {
    var tag = low(el.tagName);
    var type = low(el.getAttribute("type"));
    if (tag === "input" && type === "checkbox") return;

    el.addEventListener("click", function () {
      var field = norm(el.getAttribute("data-field"));
      if (!field) return;

      var next = getState(field) ? "" : "Да";
      setState(field, next);
      el.classList.toggle("active", !!next);
    });
  });

  // ==================================================
  // DIMENSION PICKERS
  // ==================================================
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

    var dimKey = norm(row.getAttribute("data-dim"));
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
  // CONDITIONAL UI
  // ==================================================
  function toggleWraps(selectors, shouldShow) {
    (selectors || []).forEach(function (sel) {
      qsa(document, sel).forEach(function (el) {
        if (shouldShow) show(el);
        else hide(el);
      });
    });
  }

  function updateAllVisibility() {
    toggleWraps(
      [".bar-fields-prava", ".bar-dimensions-prava", '[data-conditional="bar"]'],
      isYes(getState("bar"))
    );

    toggleWraps(
      [".island-fields-prava", ".island-dimensions-prava", '[data-conditional="island"]'],
      isYes(getState("island"))
    );

    toggleWraps(
      [".bar-fields-3a", ".bar-dimensions-3a", '[data-conditional="bar_enabled_3a"]'],
      isYes(getState("bar_enabled_3a"))
    );

    toggleWraps(
      [".island-fields-3a", ".island-dimensions-3a", '[data-conditional="island_enabled_3a"]'],
      isYes(getState("island_enabled_3a"))
    );
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

  function updatePravaCad() {
    if (!flowPrava) return;
    hideCadInScope(flowPrava);
    showCad(flowPrava, ".cad-prava-base");

    var chimney = low(getState("chimney_position_prava"));
    if (chimney === "ляво") showCad(flowPrava, ".cad-prava-sketch-36");
    if (chimney === "дясно") showCad(flowPrava, ".cad-prava-sketch-37");
  }

  function updateAglova3aCad() {
    if (!flowAglova) return;

    var step3a = qs(flowAglova, ".step-3a-aglova");
    if (!step3a) return;

    hideCadInScope(step3a);
    showCad(step3a, ".cad-3a-base");

    var water = toKey(getState("water_position_3a"));
    var chimney = toKey(getState("chimney_position_3a"));

    var combo = qs(step3a, ".cad-3a-sketch-" + water + "-" + chimney);
    if (combo) {
      show(combo);
      return;
    }

    var fallback = qs(step3a, ".cad-3a-sketch-" + water);
    if (fallback) show(fallback);
  }

  function updateAllCad() {
    updatePravaCad();
    updateAglova3aCad();
  }

  // ==================================================
  // SUMMARY
  // ==================================================
  function addLine(lines, label, value) {
    value = norm(value);
    if (!value) return;
    lines.push(label + ": " + value);
  }

  function buildSummary() {
    var lines = [];
    var kt = low(getState("kitchen_type"));

    if (kt === "prava") {
      lines.push("Форма: Права");
      addLine(lines, "Комин", getState("chimney_position_prava"));
      addLine(lines, "Дължина", getState("len_prava_3"));
      addLine(lines, "Височина", getState("height_prava_3"));

      if (isYes(getState("bar"))) {
        lines.push("Бар: Да");
        addLine(lines, "Бар дължина", getState("bar_len_prava_3"));
        addLine(lines, "Бар ширина", getState("bar_width_prava_3"));
      }

      if (isYes(getState("island"))) {
        lines.push("Остров: Да");
        addLine(lines, "Остров дължина", getState("island_len_3a"));
        addLine(lines, "Остров ширина", getState("island_width_3a"));
      }

      addLine(lines, "Визия", getState("vision_prava_3"));
      addLine(lines, "Кога планирате", getState("plan_prava_3"));
      addLine(lines, "Предпочитан контакт", getState("contact_preference_prava_3"));
    }

    else if (kt === "aglova") {
      lines.push("Форма: Ъглова");
      addLine(lines, "Вода", getState("water_position_3a"));
      addLine(lines, "Комин", getState("chimney_position_3a"));
      addLine(lines, "Стена 1", getState("stena1_len_3a"));
      addLine(lines, "Стена 2", getState("stena2_len_3a"));
      addLine(lines, "Височина", getState("visochina_3a"));

      if (isYes(getState("bar_enabled_3a"))) {
        lines.push("Бар: Да");
        addLine(lines, "Бар дължина", getState("bar_len_3a"));
        addLine(lines, "Бар ширина", getState("bar_width_3a"));
      }

      if (isYes(getState("island_enabled_3a"))) {
        lines.push("Остров: Да");
        addLine(lines, "Остров дължина", getState("island_len_3a"));
        addLine(lines, "Остров ширина", getState("island_width_3a"));
      }

      addLine(lines, "Колона с фурна", getState("oven_tall_unit_3a"));
      addLine(lines, "Хладилник", getState("fridge_type_3a"));
      addLine(lines, "Визия", getState("vision_3a"));
      addLine(lines, "Кога планирате", getState("plan_3a"));
      addLine(lines, "Предпочитан контакт", getState("contact_preference_3a"));
    }

    else if (kt === "p") {
      lines.push("Форма: П-образна");
    }

    var extras = [];
    if (getState("dishwasher")) extras.push("Съдомиялна: Да");
    if (getState("washing_machine")) extras.push("Пералня: Да");
    if (getState("microwave")) extras.push("Микровълнова: Да");
    if (getState("coffee_machine")) extras.push("Кафе машина: Да");

    if (extras.length) {
      lines.push("");
      lines.push("Екстри:");
      lines = lines.concat(extras);
    }

    return lines.join("\n");
  }

  // ==================================================
  // SUBMIT MAPPER
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

  function mapPravaToCanonical() {
    setHidden("configuration", "prava");
    setHidden("chimney_position", getState("chimney_position_prava"));
    setHidden("wall_1", getState("len_prava_3"));
    setHidden("room_height", getState("height_prava_3"));

    setHidden("bar_enabled", yesNo(getState("bar")));
    setHidden("bar_len", getState("bar_len_prava_3"));
    setHidden("bar_width", getState("bar_width_prava_3"));

    setHidden("island_enabled", yesNo(getState("island")));
    setHidden("island_len", getState("island_len_3a"));
    setHidden("island_width", getState("island_width_3a"));

    setHidden("vision", getState("vision_prava_3"));
    setHidden("plan", getState("plan_prava_3"));
    setHidden("contact_preference", getState("contact_preference_prava_3"));
  }

  function mapAglova3aToCanonical() {
    setHidden("configuration", "aglova_3a");
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

  function mapExtrasToCanonical() {
    setHidden("dishwasher", yesNo(getState("dishwasher")));
    setHidden("washing_machine", yesNo(getState("washing_machine")));
    setHidden("microwave", yesNo(getState("microwave")));
    setHidden("coffee_machine", yesNo(getState("coffee_machine")));
  }

  function writeSummaryToCanonical() {
    setHidden("summary_readable", buildSummary());
  }

  function mapStateToHiddenInputs() {
    clearCanonicalHiddenInputs();

    var kt = low(getState("kitchen_type"));
    if (kt === "prava") mapPravaToCanonical();
    if (kt === "aglova") mapAglova3aToCanonical();

    mapExtrasToCanonical();
    writeSummaryToCanonical();
  }

  // ==================================================
  // INIT FROM ACTIVE UI
  // ==================================================
  function initFromExistingActives() {
    var activeKitchenCard = qs(document, ".kitchen-card.active");
    if (activeKitchenCard) {
      var type =
        norm(activeKitchenCard.getAttribute("data-kitchen")) ||
        norm(activeKitchenCard.getAttribute("data-value")) ||
        toKey(textOf(activeKitchenCard));

      activeKitchenType = type;
      state.kitchen_type = type;
      showInitialStepForKitchen(type);
    }

    qsa(document, ".option-pill.active").forEach(function (pill) {
      var wrap = pill.closest(".question-wrap");
      var field =
        norm(pill.getAttribute("data-field")) ||
        norm(wrap && wrap.getAttribute("data-field"));

      if (field) state[field] = getOptionValue(pill);
    });

    qsa(document, ".style-card.active").forEach(function (card) {
      var wrap = card.closest("[data-field]");
      var field =
        norm(card.getAttribute("data-field")) ||
        norm(wrap && wrap.getAttribute("data-field"));

      if (field) state[field] = getOptionValue(card);
    });

    qsa(document, 'input[type="checkbox"][data-field]').forEach(function (cb) {
      var field = norm(cb.getAttribute("data-field"));
      if (!field) return;
      if (cb.checked) state[field] = "Да";
    });

    qsa(document, "input[data-field], textarea[data-field], select[data-field]").forEach(function (el) {
      var type = low(el.getAttribute("type"));
      if (type === "checkbox") return;

      var field = norm(el.getAttribute("data-field"));
      if (!field) return;

      if (norm(el.value)) state[field] = norm(el.value);
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
  initFromExistingActives();
  updateAllVisibility();
  updateAllCad();

  if (modalOverlay && !modalOverlay.classList.contains("is-open")) {
    hide(modalOverlay);
  }
});
