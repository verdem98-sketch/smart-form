
document.addEventListener("DOMContentLoaded", function () {
  // ==================================================
  // CONFIG
  // ==================================================
  var DEBUG = false;

  // ==================================================
  // HELPERS
  // ==================================================
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
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
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (el.offsetParent === null && style.position !== "fixed") return false;

    return true;
  }

  function firstFilled(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var val = norm(obj[key]);
      if (val) return val;
    }
    return "";
  }

  function pushLine(lines, label, value) {
    value = norm(value);
    if (!value) return;
    lines.push(label + ": " + value);
  }

  function isYesText(v) {
    var x = low(v);
    return (
      x === "да" ||
      x === "yes" ||
      x === "true" ||
      x === "1" ||
      x === "вграден" ||
      x === "email" ||
      x === "phone" ||
      x === "viber" ||
      x === "бар" ||
      x === "барплот" ||
      x === "остров" ||
      x === "с колона за фурна"
    );
  }

  function yesNo(v) {
    return isYesText(v) ? "yes" : "no";
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
    if (m > 0 && cm > 0) return m + " м " + cm + " см";
    if (m > 0) return m + " м";
    return cm + " см";
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
    qs(document, ".smart-form-block form") ||
    qs(document, ".w-form form") ||
    qs(document, "form");

  if (!formEl) return;

  // ==================================================
  // FINAL WEBFLOW HIDDEN FIELDS (BY NAME)
  // ==================================================
  function finalHidden(name) {
    return qs(formEl, '[name="' + name + '"]');
  }

  function setFinalHidden(name, value) {
    var el = finalHidden(name);
    if (el) el.value = norm(value);
  }

  function clearFinalHiddenInputs() {
    setFinalHidden("configuration", "");
    setFinalHidden("water_position", "");
    setFinalHidden("chimney_position", "");
    setFinalHidden("hob_position", "");
    setFinalHidden("chimney_a", "");
    setFinalHidden("chimney_b", "");
    setFinalHidden("wall_1", "");
    setFinalHidden("wall_2", "");
    setFinalHidden("wall_3", "");
    setFinalHidden("room_height", "");
    setFinalHidden("bar_enabled", "no");
    setFinalHidden("bar_len", "");
    setFinalHidden("bar_width", "");
    setFinalHidden("island_enabled", "no");
    setFinalHidden("island_len", "");
    setFinalHidden("island_width", "");
    setFinalHidden("oven_tall_unit", "no");
    setFinalHidden("fridge_type", "");
    setFinalHidden("vision", "");
    setFinalHidden("plan", "");
    setFinalHidden("contact_preference", "");
    setFinalHidden("dishwasher", "no");
    setFinalHidden("washing_machine", "no");
    setFinalHidden("microwave", "no");
    setFinalHidden("coffee_machine", "no");
    setFinalHidden("summary_readable", "");
  }

  // ==================================================
  // ACTIVE SCENARIO
  // ==================================================
  function getVisibleScenario() {
    var scenarios = [
      { key: "prava_3", label: "Права кухня", selector: ".step-3-prava" },
      { key: "aglova_3a", label: "Ъглова кухня без комин", selector: ".step-3a-aglova" },
      { key: "aglova_3b", label: "Ъглова кухня с комин", selector: ".step-3b-aglova" },
      { key: "p_3a", label: "П-образна кухня без комин", selector: ".step-3a-p" },
      { key: "p_3b", label: "П-образна кухня с комин вляво", selector: ".step-3b-p" },
      { key: "p_3c", label: "П-образна кухня с комин вдясно", selector: ".step-3c-p" }
    ];

    for (var i = 0; i < scenarios.length; i++) {
      var el = qs(document, scenarios[i].selector);
      if (el && isVisible(el)) {
        return {
          key: scenarios[i].key,
          label: scenarios[i].label,
          el: el
        };
      }
    }

    return { key: "", label: "", el: null };
  }

  // ==================================================
  // READ DATA-FIELD VALUES
  // ==================================================
  function getOwnerValue(owner) {
    if (!owner) return "";

    // 1) owner itself is hidden/text/select/textarea with data-field
    if (
      owner.matches("input, textarea, select")
    ) {
      return norm(owner.value);
    }

    // 2) active selectable inside owner
    var active =
      qs(owner, ".option-pill.active") ||
      qs(owner, ".vision-card.active") ||
      qs(owner, ".style-card.active") ||
      qs(owner, ".choice-card.active") ||
      qs(owner, "[data-value].active");

    if (active) {
      return norm(active.getAttribute("data-value") || active.textContent);
    }

    // 3) checked inputs
    var checked =
      qs(owner, 'input[type="radio"]:checked') ||
      qs(owner, 'input[type="checkbox"]:checked');

    if (checked) {
      return norm(
        checked.getAttribute("data-value") ||
        checked.value ||
        checked.nextElementSibling && checked.nextElementSibling.textContent
      );
    }

    // 4) nested form field
    var field = qs(owner, "input, textarea, select");
    if (field) {
      return norm(field.value);
    }

    return "";
  }

  function collectFieldValues(scope) {
    var out = {};
    if (!scope) return out;

    qsa(scope, "[data-field]").forEach(function (owner) {
      var key = norm(owner.getAttribute("data-field"));
      if (!key) return;

      var value = getOwnerValue(owner);
      if (value) out[key] = value;
    });

    return out;
  }

  // ==================================================
  // READ DIMENSIONS
  // Supports:
  // A) .dimension-row[data-dim="..."]
  // B) hidden input inside row with [data-dim]
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

  function getRowDimKey(row) {
    var direct = norm(row.getAttribute("data-dim"));
    if (direct) return direct;

    var nested = qs(row, "[data-dim]");
    if (nested) return norm(nested.getAttribute("data-dim"));

    return "";
  }

  function getRowHiddenDimInput(row) {
    return (
      qs(row, ".hidden-dimension-input") ||
      qs(row, 'input[type="hidden"][data-dim]') ||
      qs(row, 'input[type="hidden"]')
    );
  }

  function collectDimValues(scope) {
    var out = {};
    if (!scope) return out;

    qsa(scope, ".dimension-row").forEach(function (row) {
      var key = getRowDimKey(row);
      if (!key) return;

      var mInput = getMeterInput(row);
      var cmInput = getCmInput(row);

      var value = formatDimension(
        mInput ? mInput.value : 0,
        cmInput ? cmInput.value : 0
      );

      if (!value) {
        var hiddenInput = getRowHiddenDimInput(row);
        if (hiddenInput) value = norm(hiddenInput.value);
      }

      if (value) out[key] = value;
    });

    return out;
  }

  // ==================================================
  // DEBUG SUMMARY
  // ==================================================
  function buildDebugSummary(current, fields, dims) {
    var lines = [];

    lines.push("scenario=" + norm(current.key));

    Object.keys(fields).sort().forEach(function (key) {
      lines.push(key + "=" + norm(fields[key]));
    });

    Object.keys(dims).sort().forEach(function (key) {
      lines.push(key + "=" + norm(dims[key]));
    });

    return lines.join("\n");
  }

  // ==================================================
  // CANONICAL MAPPING
  // ==================================================
  function mapScenarioData(current, fields, dims) {
    var data = {
      configuration: current.key || "",
      water_position: "",
      chimney_position: "",
      hob_position: "",
      chimney_a: "",
      chimney_b: "",
      wall_1: "",
      wall_2: "",
      wall_3: "",
      room_height: "",
      bar_enabled: "no",
      bar_len: "",
      bar_width: "",
      island_enabled: "no",
      island_len: "",
      island_width: "",
      oven_tall_unit: "no",
      fridge_type: "",
      vision: "",
      plan: "",
      contact_preference: "",
      dishwasher: "no",
      washing_machine: "no",
      microwave: "no",
      coffee_machine: "no",
      summary_readable: ""
    };

    // ------------------------------
    // fields -> canonical
    // ------------------------------
    data.water_position = firstFilled(fields, [
      "water_position_3a",
      "water_position_3b",
      "water_position_prava_3",
      "water_position_p_3a",
      "water_position_p_3b",
      "water_position_p_3c"
    ]);

    data.chimney_position = firstFilled(fields, [
      "chimney_position_3a",
      "chimney_position_3b",
      "chimney_position_prava",
      "chimney_position_prava_3",
      "chimney_position_p_3a",
      "chimney_position_p_3b",
      "chimney_position_p_3c"
    ]);

    data.hob_position = firstFilled(fields, [
      "hob_position_p_3a",
      "hob_position_p_3b",
      "hob_position_p_3c"
    ]);

    data.bar_enabled = yesNo(firstFilled(fields, [
      "bar_enabled_3a",
      "bar_enabled_3b",
      "bar_enabled_prava_3",
      "bar_enabled_p_3a",
      "bar_enabled_p_3b",
      "bar_enabled_p_3c",
      "bar"
    ]));

    data.island_enabled = yesNo(firstFilled(fields, [
      "island_enabled_3a",
      "island_enabled_3b",
      "island_enabled_prava_3",
      "island_enabled_p_3a",
      "island_enabled_p_3b",
      "island_enabled_p_3c",
      "island"
    ]));

    data.oven_tall_unit = yesNo(firstFilled(fields, [
      "oven_tall_unit_3a",
      "oven_tall_unit_3b",
      "oven_tall_unit_prava_3",
      "oven_tall_unit_p_3a",
      "oven_tall_unit_p_3b",
      "oven_tall_unit_p_3c"
    ]));

    data.fridge_type = firstFilled(fields, [
      "fridge_type_3a",
      "fridge_type_3b",
      "fridge_type_prava_3",
      "fridge_type_p_3a",
      "fridge_type_p_3b",
      "fridge_type_p_3c"
    ]);

    data.vision = firstFilled(fields, [
      "vision_3a",
      "vision_3b",
      "vision_prava_3",
      "vision_p_3a",
      "vision_p_3b",
      "vision_p_3c"
    ]);

    data.plan = firstFilled(fields, [
      "plan_3a",
      "plan_3b",
      "plan_prava_3",
      "plan_p_3a",
      "plan_p_3b",
      "plan_p_3c"
    ]);

    data.contact_preference = firstFilled(fields, [
      "contact_preference_3a",
      "contact_preference_3b",
      "contact_preference_prava_3",
      "contact_preference_p_3a",
      "contact_preference_p_3b",
      "contact_preference_p_3c"
    ]);

    data.dishwasher = yesNo(firstFilled(fields, ["dishwasher"]));
    data.washing_machine = yesNo(firstFilled(fields, ["washing_machine"]));
    data.microwave = yesNo(firstFilled(fields, ["microwave"]));
    data.coffee_machine = yesNo(firstFilled(fields, ["coffee_machine"]));

    // ------------------------------
    // dims -> canonical
    // ------------------------------
    data.wall_1 = firstFilled(dims, [
      "stena1_len_3a",
      "stena1_len_3b",
      "len_prava_3",
      "stena1_len_prava_3",
      "stena1_len_p_3a",
      "stena1_len_p_3b",
      "stena1_len_p_3c"
    ]);

    data.wall_2 = firstFilled(dims, [
      "stena2_len_3a",
      "stena2_len_3b",
      "stena2_len_prava_3",
      "stena2_len_p_3a",
      "stena2_len_p_3b",
      "stena2_len_p_3c"
    ]);

    data.wall_3 = firstFilled(dims, [
      "stena3_len_p_3a",
      "stena3_len_p_3b",
      "stena3_len_p_3c"
    ]);

    data.room_height = firstFilled(dims, [
      "visochina_3a",
      "visochina_3b",
      "height_prava_3",
      "visochina_prava_3",
      "visochina_p_3a",
      "visochina_p_3b",
      "visochina_p_3c"
    ]);

    data.chimney_a = firstFilled(dims, [
      "komin_a_3b",
      "komin_a_p_3b",
      "komin_a_p_3c"
    ]);

    data.chimney_b = firstFilled(dims, [
      "komin_b_3b",
      "komin_b_p_3b",
      "komin_b_p_3c"
    ]);

    data.bar_len = firstFilled(dims, [
      "bar_len_3a",
      "bar_len_3b",
      "bar_len_prava_3",
      "bar_len_p_3a",
      "bar_len_p_3b",
      "bar_len_p_3c"
    ]);

    data.bar_width = firstFilled(dims, [
      "bar_width_3a",
      "bar_width_3b",
      "bar_width_prava_3",
      "bar_width_p_3a",
      "bar_width_p_3b",
      "bar_width_p_3c"
    ]);

    data.island_len = firstFilled(dims, [
      "island_len_3a",
      "island_len_3b",
      "island_len_3a",
      "island_len_prava_3",
      "island_len_p_3a",
      "island_len_p_3b",
      "island_len_p_3c"
    ]);

    data.island_width = firstFilled(dims, [
      "island_width_3a",
      "island_width_3b",
      "island_width_prava_3",
      "island_width_p_3a",
      "island_width_p_3b",
      "island_width_p_3c"
    ]);

    // ------------------------------
    // clean dependent fields
    // ------------------------------
    if (data.bar_enabled !== "yes") {
      data.bar_len = "";
      data.bar_width = "";
    }

    if (data.island_enabled !== "yes") {
      data.island_len = "";
      data.island_width = "";
    }

    // ------------------------------
    // summary
    // ------------------------------
    if (DEBUG) {
      data.summary_readable = buildDebugSummary(current, fields, dims);
      return data;
    }

    var lines = [];

    if (current.label) lines.push("Форма: " + current.label);
    pushLine(lines, "Сценарий", current.key);
    pushLine(lines, "Вода", data.water_position);
    pushLine(lines, "Комин", data.chimney_position);
    pushLine(lines, "Котлони", data.hob_position);
    pushLine(lines, "Стена 1", data.wall_1);
    pushLine(lines, "Стена 2", data.wall_2);
    pushLine(lines, "Стена 3", data.wall_3);
    pushLine(lines, "Височина", data.room_height);
    pushLine(lines, "Комин A", data.chimney_a);
    pushLine(lines, "Комин B", data.chimney_b);
    pushLine(lines, "Бар", data.bar_enabled === "yes" ? "Да" : "Не");
    pushLine(lines, "Бар дължина", data.bar_len);
    pushLine(lines, "Бар ширина", data.bar_width);
    pushLine(lines, "Остров", data.island_enabled === "yes" ? "Да" : "Не");
    pushLine(lines, "Остров дължина", data.island_len);
    pushLine(lines, "Остров ширина", data.island_width);
    pushLine(lines, "Колона за фурна", data.oven_tall_unit === "yes" ? "Да" : "Не");
    pushLine(lines, "Хладилник", data.fridge_type);
    pushLine(lines, "Визия", data.vision);
    pushLine(lines, "Кога планирате", data.plan);
    pushLine(lines, "Предпочитан контакт", data.contact_preference);
    pushLine(lines, "Съдомиялна", data.dishwasher === "yes" ? "Да" : "Не");
    pushLine(lines, "Пералня", data.washing_machine === "yes" ? "Да" : "Не");
    pushLine(lines, "Микровълнова", data.microwave === "yes" ? "Да" : "Не");
    pushLine(lines, "Кафе машина", data.coffee_machine === "yes" ? "Да" : "Не");

    data.summary_readable = lines.join("\n");
    return data;
  }

  // ==================================================
  // SYNC
  // ==================================================
  function syncNow() {
    clearFinalHiddenInputs();

    var current = getVisibleScenario();
    if (!current.el) return;

    var fields = collectFieldValues(current.el);
    var dims = collectDimValues(current.el);
    var data = mapScenarioData(current, fields, dims);

    setFinalHidden("configuration", data.configuration);
    setFinalHidden("water_position", data.water_position);
    setFinalHidden("chimney_position", data.chimney_position);
    setFinalHidden("hob_position", data.hob_position);
    setFinalHidden("chimney_a", data.chimney_a);
    setFinalHidden("chimney_b", data.chimney_b);
    setFinalHidden("wall_1", data.wall_1);
    setFinalHidden("wall_2", data.wall_2);
    setFinalHidden("wall_3", data.wall_3);
    setFinalHidden("room_height", data.room_height);
    setFinalHidden("bar_enabled", data.bar_enabled);
    setFinalHidden("bar_len", data.bar_len);
    setFinalHidden("bar_width", data.bar_width);
    setFinalHidden("island_enabled", data.island_enabled);
    setFinalHidden("island_len", data.island_len);
    setFinalHidden("island_width", data.island_width);
    setFinalHidden("oven_tall_unit", data.oven_tall_unit);
    setFinalHidden("fridge_type", data.fridge_type);
    setFinalHidden("vision", data.vision);
    setFinalHidden("plan", data.plan);
    setFinalHidden("contact_preference", data.contact_preference);
    setFinalHidden("dishwasher", data.dishwasher);
    setFinalHidden("washing_machine", data.washing_machine);
    setFinalHidden("microwave", data.microwave);
    setFinalHidden("coffee_machine", data.coffee_machine);
    setFinalHidden("summary_readable", data.summary_readable);
  }

  // ==================================================
  // UI ACTIVE STATE
  // ==================================================
  document.addEventListener("click", function (e) {
    var pill = e.target.closest(".option-pill");
    if (pill) {
      setSingleActive(pill, ".option-pill");
      setTimeout(syncNow, 0);
      return;
    }

    var card = e.target.closest(".vision-card, .style-card, .choice-card, [data-value]");
    if (card) {
      var row =
        card.closest(".style-cards-row") ||
        card.closest(".options-row") ||
        card.closest(".choice-cards-row") ||
        card.parentElement;

      if (row) {
        qsa(row, ".vision-card, .style-card, .choice-card, [data-value]").forEach(function (el) {
          el.classList.remove("active");
        });
        card.classList.add("active");
      }

      setTimeout(syncNow, 0);
      return;
    }

    var kitchen = e.target.closest(".kitchen-card");
    if (kitchen) {
      setTimeout(syncNow, 50);
    }
  });

  document.addEventListener("input", function (e) {
    if (
      e.target.closest(".dimension-row") ||
      e.target.matches("[data-field]") ||
      e.target.matches("[data-field] input, [data-field] textarea, [data-field] select")
    ) {
      setTimeout(syncNow, 0);
    }
  });

  document.addEventListener("change", function (e) {
    if (
      e.target.closest(".dimension-row") ||
      e.target.matches("[data-field]") ||
      e.target.matches("[data-field] input, [data-field] textarea, [data-field] select")
    ) {
      setTimeout(syncNow, 0);
    }
  });

  formEl.addEventListener("submit", function () {
    syncNow();
  });

  // initial
  syncNow();
});
