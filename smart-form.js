<script>
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

  function safeLower(v) {
    return normalizeText(v).toLowerCase();
  }

  function getOptionValue(el) {
    if (!el) return "";
    return normalizeText(el.getAttribute("data-value") || textOf(el));
  }

  function toKey(v) {
    return safeLower(v)
      .replace(/\s+/g, "_")
      .replace(/[^\p{L}\p{N}_-]/gu, "");
  }

  function isYesValue(v) {
    var x = safeLower(v);
    return x === "да" || x === "yes" || x === "true" || x === "1";
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
    qs(document, ".smart-form-wrap .w-form form") ||
    qs(document, "form");

  var modalOverlay = qs(document, ".section-overlay");
  var openBtns = qsa(document, ".open-smart-form");
  var closeBtns = qsa(document, ".close-smart-form");

  var kitchenCards = qsa(document, ".kitchen-card");

  var flowPrava = qs(document, ".flow-prava");
  var flowAglova = qs(document, ".flow-aglova");
  var flowP = qs(document, ".flow-p");

  var allFlows = [flowPrava, flowAglova, flowP].filter(Boolean);

  var summaryReadable =
    qs(document, '[name="summary_readable"]') ||
    qs(document, '[data-field="summary_readable"]') ||
    qs(document, 'textarea[data-summary="readable"]') ||
    qs(document, 'textarea[name="summary"]');

  var activeKitchenType = "";
  var activeFlow = null;
  var activeBranch = null;

  // ==================================================
  // STATE
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
  // FIELD LOOKUP / SYNC
  // ==================================================
  function findTargetsByKey(key) {
    var out = [];
    if (!key) return out;

    qsa(document, '[name="' + key + '"]').forEach(function (el) {
      if (out.indexOf(el) === -1) out.push(el);
    });

    qsa(document, '[data-field="' + key + '"]').forEach(function (el) {
      if (out.indexOf(el) === -1) out.push(el);
    });

    qsa(document, '[data-dim="' + key + '"]').forEach(function (el) {
      if (out.indexOf(el) === -1) out.push(el);
    });

    return out;
  }

  function syncFieldValue(key, value) {
    var targets = findTargetsByKey(key);
    var val = normalizeText(value);

    targets.forEach(function (el) {
      var tag = (el.tagName || "").toLowerCase();
      var type = (el.getAttribute("type") || "").toLowerCase();

      if (type === "checkbox") {
        el.checked = isYesValue(val);
        return;
      }

      if (tag === "input" || tag === "textarea" || tag === "select") {
        el.value = val;
        return;
      }

      el.setAttribute("data-current-value", val);
    });
  }

  function setStoredValue(key, value) {
    state[key] = normalizeText(value);
    syncFieldValue(key, state[key]);
    updateReadableSummary();
  }

  function getStoredValue(key) {
    return normalizeText(state[key] || "");
  }

  function clearKeys(keys) {
    (keys || []).forEach(function (key) {
      setStoredValue(key, "");
    });
  }

  function readInitialValuesFromDom() {
    Object.keys(state).forEach(function (key) {
      var targets = findTargetsByKey(key);
      if (!targets.length) return;

      var el = targets[0];
      var tag = (el.tagName || "").toLowerCase();
      var type = (el.getAttribute("type") || "").toLowerCase();

      if (type === "checkbox") {
        state[key] = el.checked ? "Да" : "";
      } else if (tag === "input" || tag === "textarea" || tag === "select") {
        state[key] = normalizeText(el.value);
      }
    });
  }

  // ==================================================
  // BRANCH CLEANUP
  // ==================================================
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

  function clearPravaState() {
    clearKeys(pravaKeys);
  }

  function clearAglova3aState() {
    clearKeys(aglova3aKeys);
  }

  function clearOtherKitchenBranches(type) {
    if (type === "prava") {
      clearAglova3aState();
      return;
    }

    if (type === "aglova") {
      clearPravaState();
      return;
    }

    if (type === "p") {
      clearPravaState();
      clearAglova3aState();
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
      if (e.target === modalOverlay) {
        closeModal();
      }
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
    activeBranch = null;
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

    var stepEl = firstExistingStep(
      scope,
      Array.isArray(selectors) ? selectors : [selectors]
    );

    if (stepEl) {
      show(stepEl);
      activeBranch = stepEl;
    }
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
        normalizeText(card.getAttribute("data-kitchen")) ||
        normalizeText(card.getAttribute("data-value")) ||
        toKey(textOf(card));

      activeKitchenType = type;
      setStoredValue("kitchen_type", type);

      clearOtherKitchenBranches(type);
      showInitialStepForKitchen(type);
      updateAllVisibility();
      updateAllCad();
      openModal();
    });
  });

  // ==================================================
  // CHOICE CARDS
  // ==================================================
  qsa(document, ".choice-card").forEach(function (card) {
    card.addEventListener("click", function () {
      setSingleActive(card, ".choice-card");

      var action = normalizeText(card.getAttribute("data-branch"));
      var flow = card.closest(".flow-aglova, .flow-p, .flow-prava");

      if (!flow || !action) return;

      showOnlyStep(flow, ["." + action]);
      updateAllVisibility();
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
        normalizeText(pill.getAttribute("data-field")) ||
        normalizeText(wrap && wrap.getAttribute("data-field"));

      var value = getOptionValue(pill);

      if (field) {
        setStoredValue(field, value);
      }

      updateAllVisibility();
      updateAllCad();
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
        normalizeText(card.getAttribute("data-field")) ||
        normalizeText(wrap && wrap.getAttribute("data-field"));

      var value = getOptionValue(card);

      if (field) {
        setStoredValue(field, value);
      }
    });
  });

  // ==================================================
  // CHECKBOXES
  // ==================================================
  qsa(document, 'input[type="checkbox"][data-field]').forEach(function (cb) {
    cb.addEventListener("change", function () {
      var field = normalizeText(cb.getAttribute("data-field"));
      if (!field) return;

      setStoredValue(field, cb.checked ? "Да" : "");
      updateAllVisibility();
    });
  });

  qsa(
    document,
    '[data-field="dishwasher"], [data-field="washing_machine"], [data-field="microwave"], [data-field="coffee_machine"]'
  ).forEach(function (el) {
    var tag = (el.tagName || "").toLowerCase();
    var type = (el.getAttribute("type") || "").toLowerCase();
    if (tag === "input" && type === "checkbox") return;

    el.addEventListener("click", function () {
      var field = normalizeText(el.getAttribute("data-field"));
      if (!field) return;

      var next = getStoredValue(field) ? "" : "Да";
      setStoredValue(field, next);
      el.classList.toggle("active", !!next);
    });
  });

  // ==================================================
  // TEXT / TEXTAREA / SELECT
  // ==================================================
  qsa(document, "input[data-field], textarea[data-field], select[data-field]").forEach(function (fieldEl) {
    var type = (fieldEl.getAttribute("type") || "").toLowerCase();
    if (type === "checkbox") return;

    function handler() {
      var key = normalizeText(fieldEl.getAttribute("data-field"));
      if (!key) return;
      setStoredValue(key, fieldEl.value);
    }

    fieldEl.addEventListener("input", handler);
    fieldEl.addEventListener("change", handler);
  });

  // ==================================================
  // DIMENSIONS
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

    var dimKey = normalizeText(row.getAttribute("data-dim"));
    if (!dimKey) return;

    var m = getMeterValue(row);
    var cm = getCmValue(row);
    var formatted = formatDimension(m, cm);

    var hidden =
      qs(row, ".hidden-dimension-input") ||
      qs(row, 'input[type="hidden"]');

    if (hidden) hidden.value = formatted;

    setStoredValue(dimKey, formatted);
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
      isYesValue(getStoredValue("bar"))
    );

    toggleWraps(
      [".island-fields-prava", ".island-dimensions-prava", '[data-conditional="island"]'],
      isYesValue(getStoredValue("island"))
    );

    toggleWraps(
      [".bar-fields-3a", ".bar-dimensions-3a", '[data-conditional="bar_enabled_3a"]'],
      isYesValue(getStoredValue("bar_enabled_3a"))
    );

    toggleWraps(
      [".island-fields-3a", ".island-dimensions-3a", '[data-conditional="island_enabled_3a"]'],
      isYesValue(getStoredValue("island_enabled_3a"))
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
    if (!scope || !selector) return;
    var el = qs(scope, selector);
    if (el) show(el);
  }

  function updatePravaCad() {
    if (!flowPrava) return;

    hideCadInScope(flowPrava);
    showCad(flowPrava, ".cad-prava-base");

    var chimney = safeLower(getStoredValue("chimney_position_prava"));

    if (chimney === "ляво") {
      showCad(flowPrava, ".cad-prava-sketch-36");
    } else if (chimney === "дясно") {
      showCad(flowPrava, ".cad-prava-sketch-37");
    }
  }

  function updateAglova3aCad() {
    if (!flowAglova) return;

    var step3a = qs(flowAglova, ".step-3a-aglova");
    if (!step3a) return;

    hideCadInScope(step3a);
    showCad(step3a, ".cad-3a-base");

    var water = toKey(getStoredValue("water_position_3a"));
    var chimney = toKey(getStoredValue("chimney_position_3a"));

    var comboClass = ".cad-3a-sketch-" + water + "-" + chimney;
    var comboEl = qs(step3a, comboClass);

    if (comboEl) {
      show(comboEl);
      return;
    }

    var fallbackClass = ".cad-3a-sketch-" + water;
    var fallbackEl = qs(step3a, fallbackClass);
    if (fallbackEl) show(fallbackEl);
  }

  function updateAllCad() {
    updatePravaCad();
    updateAglova3aCad();
  }

  // ==================================================
  // SUMMARY
  // ==================================================
  function addSummaryLine(lines, label, value) {
    value = normalizeText(value);
    if (!value) return;
    lines.push(label + ": " + value);
  }

  function makePravaSummary() {
    var lines = [];
    lines.push("Форма: Права");
    addSummaryLine(lines, "Комин", getStoredValue("chimney_position_prava"));
    addSummaryLine(lines, "Дължина", getStoredValue("len_prava_3"));
    addSummaryLine(lines, "Височина", getStoredValue("height_prava_3"));

    if (isYesValue(getStoredValue("bar"))) {
      lines.push("Бар: Да");
      addSummaryLine(lines, "Бар дължина", getStoredValue("bar_len_prava_3"));
      addSummaryLine(lines, "Бар ширина", getStoredValue("bar_width_prava_3"));
    }

    if (isYesValue(getStoredValue("island"))) {
      lines.push("Остров: Да");
      addSummaryLine(lines, "Остров дължина", getStoredValue("island_len_3a"));
      addSummaryLine(lines, "Остров ширина", getStoredValue("island_width_3a"));
    }

    addSummaryLine(lines, "Визия", getStoredValue("vision_prava_3"));
    addSummaryLine(lines, "Кога планирате", getStoredValue("plan_prava_3"));
    addSummaryLine(lines, "Предпочитан контакт", getStoredValue("contact_preference_prava_3"));

    return lines;
  }

  function makeAglova3aSummary() {
    var lines = [];
    lines.push("Форма: Ъглова");
    addSummaryLine(lines, "Вода", getStoredValue("water_position_3a"));
    addSummaryLine(lines, "Комин", getStoredValue("chimney_position_3a"));
    addSummaryLine(lines, "Стена 1", getStoredValue("stena1_len_3a"));
    addSummaryLine(lines, "Стена 2", getStoredValue("stena2_len_3a"));
    addSummaryLine(lines, "Височина", getStoredValue("visochina_3a"));

    if (isYesValue(getStoredValue("bar_enabled_3a"))) {
      lines.push("Бар: Да");
      addSummaryLine(lines, "Бар дължина", getStoredValue("bar_len_3a"));
      addSummaryLine(lines, "Бар ширина", getStoredValue("bar_width_3a"));
    }

    if (isYesValue(getStoredValue("island_enabled_3a"))) {
      lines.push("Остров: Да");
      addSummaryLine(lines, "Остров дължина", getStoredValue("island_len_3a"));
      addSummaryLine(lines, "Остров ширина", getStoredValue("island_width_3a"));
    }

    addSummaryLine(lines, "Колона с фурна", getStoredValue("oven_tall_unit_3a"));
    addSummaryLine(lines, "Хладилник", getStoredValue("fridge_type_3a"));
    addSummaryLine(lines, "Визия", getStoredValue("vision_3a"));
    addSummaryLine(lines, "Кога планирате", getStoredValue("plan_3a"));
    addSummaryLine(lines, "Предпочитан контакт", getStoredValue("contact_preference_3a"));

    return lines;
  }

  function makeExtrasSummary() {
    var lines = [];
    if (getStoredValue("dishwasher")) lines.push("Съдомиялна: Да");
    if (getStoredValue("washing_machine")) lines.push("Пералня: Да");
    if (getStoredValue("microwave")) lines.push("Микровълнова: Да");
    if (getStoredValue("coffee_machine")) lines.push("Кафе машина: Да");
    return lines;
  }

  function updateReadableSummary() {
    if (!summaryReadable) return;

    var lines = [];
    var kt = safeLower(getStoredValue("kitchen_type"));

    if (kt === "prava") {
      lines = lines.concat(makePravaSummary());
    } else if (kt === "aglova") {
      lines = lines.concat(makeAglova3aSummary());
    } else if (kt === "p") {
      lines.push("Форма: П-образна");
    }

    var extras = makeExtrasSummary();
    if (extras.length) {
      lines.push("");
      lines.push("Екстри:");
      lines = lines.concat(extras);
    }

    summaryReadable.value = lines.join("\n");
  }

  // ==================================================
  // EMAIL SAFE SUBMIT
  // ==================================================
  function prepareSubmitValues() {
    updateReadableSummary();

    if (summaryReadable) {
      summaryReadable.value = normalizeText(summaryReadable.value);
    }

    // Абсолютно важно:
    // не disable-ваме input/textarea/select,
    // за да не отпаднат от Webflow submission-а.
    qsa(document, "input, textarea, select").forEach(function (el) {
      if (el.disabled) {
        el.disabled = false;
      }
    });
  }

  if (formEl) {
    formEl.addEventListener("submit", function () {
      prepareSubmitValues();
    });
  }

  // ==================================================
  // INIT
  // ==================================================
  function initFromExistingActives() {
    var activeKitchenCard = qs(document, ".kitchen-card.active");
    if (activeKitchenCard) {
      var type =
        normalizeText(activeKitchenCard.getAttribute("data-kitchen")) ||
        normalizeText(activeKitchenCard.getAttribute("data-value")) ||
        toKey(textOf(activeKitchenCard));

      activeKitchenType = type;
      state.kitchen_type = type;
      showInitialStepForKitchen(type);
    }

    qsa(document, ".option-pill.active").forEach(function (pill) {
      var wrap = pill.closest(".question-wrap");
      var field =
        normalizeText(pill.getAttribute("data-field")) ||
        normalizeText(wrap && wrap.getAttribute("data-field"));

      if (field) {
        state[field] = getOptionValue(pill);
      }
    });

    qsa(document, ".style-card.active").forEach(function (card) {
      var wrap = card.closest("[data-field]");
      var field =
        normalizeText(card.getAttribute("data-field")) ||
        normalizeText(wrap && wrap.getAttribute("data-field"));

      if (field) {
        state[field] = getOptionValue(card);
      }
    });

    qsa(document, 'input[type="checkbox"][data-field]').forEach(function (cb) {
      var field = normalizeText(cb.getAttribute("data-field"));
      if (!field) return;
      if (cb.checked) state[field] = "Да";
    });

    qsa(document, ".dimension-row[data-dim]").forEach(function (row) {
      refreshDimensionRow(row);
    });
  }

  readInitialValuesFromDom();
  initFromExistingActives();
  updateAllVisibility();
  updateAllCad();
  updateReadableSummary();

  if (modalOverlay && !modalOverlay.classList.contains("is-open")) {
    hide(modalOverlay);
  }
});
