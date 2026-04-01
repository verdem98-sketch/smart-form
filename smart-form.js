
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

  function isYesText(v) {
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
    return isYesText(v) ? "yes" : "no";
  }

  function pushLine(lines, label, value) {
    value = norm(value);
    if (!value) return;
    lines.push(label + ": " + value);
  }

  function firstFilled(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
      var v = norm(obj[keys[i]]);
      if (v) return v;
    }
    return "";
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
  // HIDDEN INPUTS
  // ==================================================
  function hidden(name) {
    return qs(formEl, '[name="' + name + '"]');
  }

  function setHidden(name, value) {
    var el = hidden(name);
    if (el) el.value = norm(value);
  }

  function clearHiddenInputs() {
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

  // ==================================================
  // ACTIVE SCENARIO
  // ==================================================
  function getVisibleScenario() {
    var scenarios = [
      { key: "prava_3", label: "Права", selector: ".step-3-prava" },
      { key: "aglova_3a", label: "Ъглова без комин", selector: ".step-3a-aglova" },
      { key: "aglova_3b", label: "Ъглова с комин", selector: ".step-3b-aglova" },
      { key: "p_3a", label: "П без комин", selector: ".step-3a-p" },
      { key: "p_3b", label: "П с комин отляво", selector: ".step-3b-p" },
      { key: "p_3c", label: "П с комин отдясно", selector: ".step-3c-p" }
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
  // READ UI
  // ==================================================
  function collectFieldValues(scope) {
    var out = {};
    if (!scope) return out;

    qsa(scope, "[data-field]").forEach(function (owner) {
      var field = norm(owner.getAttribute("data-field"));
      if (!field) return;

      var active =
        qs(owner, ".option-pill.active") ||
        qs(owner, ".vision-card.active") ||
        qs(owner, ".style-card.active") ||
        qs(owner, "[data-value].active");

      if (active) {
        out[field] = norm(active.getAttribute("data-value") || active.textContent);
        return;
      }

      var formField = qs(owner, "input, textarea, select");
      if (formField) {
        out[field] = norm(formField.value);
      }
    });

    return out;
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

  function collectDimValues(scope) {
    var out = {};
    if (!scope) return out;

    qsa(scope, ".dimension-row[data-dim]").forEach(function (row) {
      var key = norm(row.getAttribute("data-dim"));
      if (!key) return;

      var mInput = getMeterInput(row);
      var cmInput = getCmInput(row);

      var val = formatDimension(
        mInput ? mInput.value : 0,
        cmInput ? cmInput.value : 0
      );

      if (!val) {
        var hiddenUi =
          qs(row, ".hidden-dimension-input") ||
          qs(row, 'input[type="hidden"]');
        if (hiddenUi) val = norm(hiddenUi.value);
      }

      out[key] = val;
    });

    return out;
  }

  // ==================================================
  // MAP TO CANONICAL
  // ==================================================
  function mapScenarioData(current, fields, dims) {
    var data = {
      configuration: current.label || "",
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

    // canonical fields
    data.water_position = firstFilled(fields, [
      "water_position_3a",
      "water_position_3b",
      "water_position_p_3a",
      "water_position_p_3b",
      "water_position_p_3c"
    ]);

    data.chimney_position = firstFilled(fields, [
      "chimney_position_3a",
      "chimney_position_3b"
    ]);

    data.hob_position = firstFilled(fields, [
      "hob_position_p_3a",
      "hob_position_p_3c"
    ]);

    data.bar_enabled = yesNo(firstFilled(fields, [
      "bar_enabled_3a",
      "bar_enabled_3b",
      "bar_enabled_prava_3",
      "bar_enabled_p_3a",
      "bar_enabled_p_3b",
      "bar_enabled_p_3c"
    ]));

    data.island_enabled = yesNo(firstFilled(fields, [
      "island_enabled_3a",
      "island_enabled_3b",
      "island_enabled_prava_3",
      "island_enabled_p_3a",
      "island_enabled_p_3b",
      "island_enabled_p_3c",
      // fallback for typo cases
      "bar_enabled_p_3a",
      "bar_enabled_p_3c"
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
      "plan_p_3c",
      "question-plan_p3b"
    ]);

    data.contact_preference = firstFilled(fields, [
      "contact_preference_3a",
      "contact_preference_3b",
      "contact_preference_prava_3",
      "contact_preference_p_3a",
      "contact_preference_p_3b",
      "contact_preference_p_3c"
    ]);

    // dims
    data.wall_1 = firstFilled(dims, [
      "stena1_len_3a",
      "stena1_len_3b",
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

    // summary
    var lines = [];
    if (data.configuration) lines.push("Форма: " + data.configuration);
    pushLine(lines, "Вода", data.water_position);
    pushLine(lines, "Комин", data.chimney_position);
    pushLine(lines, "Котлони", data.hob_position);
    pushLine(lines, "Стена 1", data.wall_1);
    pushLine(lines, "Стена 2", data.wall_2);
    pushLine(lines, "Стена 3", data.wall_3);
    pushLine(lines, "Височина", data.room_height);
    pushLine(lines, "Комин A", data.chimney_a);
    pushLine(lines, "Комин B", data.chimney_b);
    pushLine(lines, "Бар", data.bar_enabled === "yes" ? "Да" : "");
    pushLine(lines, "Бар дължина", data.bar_len);
    pushLine(lines, "Бар ширина", data.bar_width);
    pushLine(lines, "Остров", data.island_enabled === "yes" ? "Да" : "");
    pushLine(lines, "Остров дължина", data.island_len);
    pushLine(lines, "Остров ширина", data.island_width);
    pushLine(lines, "Колона за фурна", data.oven_tall_unit === "yes" ? "Да" : "");
    pushLine(lines, "Хладилник", data.fridge_type);
    pushLine(lines, "Визия", data.vision);
    pushLine(lines, "Кога планирате", data.plan);
    pushLine(lines, "Предпочитан контакт", data.contact_preference);

    data.summary_readable = lines.join("\n");
    return data;
  }

  function syncNow() {
    clearHiddenInputs();

    var current = getVisibleScenario();
    if (!current.el) return;

    var fields = collectFieldValues(current.el);
    var dims = collectDimValues(current.el);
    var data = mapScenarioData(current, fields, dims);

    setHidden("configuration", data.configuration);
    setHidden("water_position", data.water_position);
    setHidden("chimney_position", data.chimney_position);
    setHidden("hob_position", data.hob_position);
    setHidden("chimney_a", data.chimney_a);
    setHidden("chimney_b", data.chimney_b);
    setHidden("wall_1", data.wall_1);
    setHidden("wall_2", data.wall_2);
    setHidden("wall_3", data.wall_3);
    setHidden("room_height", data.room_height);
    setHidden("bar_enabled", data.bar_enabled);
    setHidden("bar_len", data.bar_len);
    setHidden("bar_width", data.bar_width);
    setHidden("island_enabled", data.island_enabled);
    setHidden("island_len", data.island_len);
    setHidden("island_width", data.island_width);
    setHidden("oven_tall_unit", data.oven_tall_unit);
    setHidden("fridge_type", data.fridge_type);
    setHidden("vision", data.vision);
    setHidden("plan", data.plan);
    setHidden("contact_preference", data.contact_preference);
    setHidden("summary_readable", data.summary_readable);
  }

  // ==================================================
  // ACTIVE STATE FOR UI
  // ==================================================
  document.addEventListener("click", function (e) {
    var pill = e.target.closest(".option-pill");
    if (pill) {
      setSingleActive(pill, ".option-pill");
      syncNow();
      return;
    }

    var card = e.target.closest(".vision-card, .style-card, [data-value]");
    if (card) {
      var row =
        card.closest(".style-cards-row") ||
        card.closest(".options-row") ||
        card.parentElement;

      if (row) {
        qsa(row, ".vision-card, .style-card, [data-value]").forEach(function (el) {
          el.classList.remove("active");
        });
        card.classList.add("active");
      }

      syncNow();
      return;
    }

    var kitchen = e.target.closest(".kitchen-card, .choice-card");
    if (kitchen) {
      setTimeout(syncNow, 50);
    }
  });

  document.addEventListener("input", function (e) {
    if (
      e.target.closest(".dimension-row") ||
      e.target.matches("input[data-field], textarea[data-field], select[data-field]")
    ) {
      syncNow();
    }
  });

  document.addEventListener("change", function (e) {
    if (
      e.target.closest(".dimension-row") ||
      e.target.matches("input[data-field], textarea[data-field], select[data-field]")
    ) {
      syncNow();
    }
  });

  formEl.addEventListener("submit", function () {
    syncNow();
  });

  // initial
  syncNow();
});
