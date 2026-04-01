
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

  function isYes(v) {
    var x = low(v);
    return x === "да" || x === "yes" || x === "true" || x === "1";
  }

  function yesNo(v) {
    return isYes(v) ? "yes" : "no";
  }

  function pushLine(lines, label, value) {
    value = norm(value);
    if (!value) return;
    lines.push(label + ": " + value);
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
  // UI READERS
  // ==================================================
  function getActiveValueByField(scope, fieldName) {
    if (!scope || !fieldName) return "";

    var owner = qs(scope, '[data-field="' + fieldName + '"]');
    if (!owner) return "";

    var active =
      qs(owner, ".option-pill.active") ||
      qs(owner, ".vision-card.active") ||
      qs(owner, ".style-card.active") ||
      qs(owner, "[data-value].active");

    if (active) {
      return norm(active.getAttribute("data-value") || active.textContent);
    }

    var textInput =
      qs(owner, "input") ||
      qs(owner, "textarea") ||
      qs(owner, "select");

    if (textInput) return norm(textInput.value);

    return "";
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

  function getDimValue(scope, dimName) {
    if (!scope || !dimName) return "";

    var row = qs(scope, '.dimension-row[data-dim="' + dimName + '"]');
    if (!row) return "";

    var meterInput = getMeterInput(row);
    var cmInput = getCmInput(row);

    var m = meterInput ? meterInput.value : 0;
    var cm = cmInput ? cmInput.value : 0;

    var formatted = formatDimension(m, cm);
    if (formatted) return formatted;

    var hiddenUi =
      qs(row, ".hidden-dimension-input") ||
      qs(row, 'input[type="hidden"]');

    return hiddenUi ? norm(hiddenUi.value) : "";
  }

  function getVisibleScenario() {
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
      if (el && isVisible(el)) {
        return { key: scenarios[i].key, el: el };
      }
    }

    return { key: "", el: null };
  }

  // ==================================================
  // SUMMARY BUILDERS
  // ==================================================
  function buildSummaryForPrava(scope) {
    var lines = [];
    lines.push("Форма: Права");

    var water = getActiveValueByField(scope, "water_position_3a");
    var s1 = getDimValue(scope, "stena1_len_prava_3");
    var s2 = getDimValue(scope, "stena2_len_prava_3");
    var h = getDimValue(scope, "visochina_prava_3");

    var barEnabled = getActiveValueByField(scope, "bar_enabled_prava_3");
    var barLen = getDimValue(scope, "bar_len_prava_3");
    var barWidth = getDimValue(scope, "bar_width_prava_3");

    var islandEnabled = getActiveValueByField(scope, "island_enabled_prava_3");
    var islandLen = getDimValue(scope, "island_len_prava_3");
    var islandWidth = getDimValue(scope, "island_width_prava_3");

    var oven = getActiveValueByField(scope, "oven_tall_unit_prava_3");
    var fridge = getActiveValueByField(scope, "fridge_type_prava_3");
    var vision = getActiveValueByField(scope, "vision_prava_3");
    var plan = getActiveValueByField(scope, "plan_prava_3");
    var contact = getActiveValueByField(scope, "contact_preference_prava_3");

    pushLine(lines, "Вода", water);
    pushLine(lines, "Стена 1", s1);
    pushLine(lines, "Стена 2", s2);
    pushLine(lines, "Височина", h);
    pushLine(lines, "Бар", barEnabled);
    pushLine(lines, "Бар дължина", barLen);
    pushLine(lines, "Бар ширина", barWidth);
    pushLine(lines, "Остров", islandEnabled);
    pushLine(lines, "Остров дължина", islandLen);
    pushLine(lines, "Остров ширина", islandWidth);
    pushLine(lines, "Колона за фурна", oven);
    pushLine(lines, "Хладилник", fridge);
    pushLine(lines, "Визия", vision);
    pushLine(lines, "Кога планирате", plan);
    pushLine(lines, "Предпочитан контакт", contact);

    return {
      configuration: "Права",
      water_position: water,
      wall_1: s1,
      wall_2: s2,
      room_height: h,
      bar_enabled: yesNo(barEnabled),
      bar_len: barLen,
      bar_width: barWidth,
      island_enabled: yesNo(islandEnabled),
      island_len: islandLen,
      island_width: islandWidth,
      oven_tall_unit: yesNo(oven),
      fridge_type: fridge,
      vision: vision,
      plan: plan,
      contact_preference: contact,
      summary: lines.join("\n")
    };
  }

  function buildSummaryForAglova3a(scope) {
    var lines = [];
    lines.push("Форма: Ъглова без комин");

    var water = getActiveValueByField(scope, "water_position_3a");
    var chimney = getActiveValueByField(scope, "chimney_position_3a");
    var s1 = getDimValue(scope, "stena1_len_3a");
    var s2 = getDimValue(scope, "stena2_len_3a");
    var h = getDimValue(scope, "visochina_3a");

    var barEnabled = getActiveValueByField(scope, "bar_enabled_3a");
    var barLen = getDimValue(scope, "bar_len_3a");
    var barWidth = getDimValue(scope, "bar_width_3a");

    var islandEnabled = getActiveValueByField(scope, "island_enabled_3a");
    var islandLen = getDimValue(scope, "island_len_3a");
    var islandWidth = getDimValue(scope, "island_width_3a");

    var oven = getActiveValueByField(scope, "oven_tall_unit_3a");
    var fridge = getActiveValueByField(scope, "fridge_type_3a");
    var vision = getActiveValueByField(scope, "vision_3a");
    var plan = getActiveValueByField(scope, "plan_3a");
    var contact = getActiveValueByField(scope, "contact_preference_3a");

    pushLine(lines, "Вода", water);
    pushLine(lines, "Позиция", chimney);
    pushLine(lines, "Стена 1", s1);
    pushLine(lines, "Стена 2", s2);
    pushLine(lines, "Височина", h);
    pushLine(lines, "Бар", barEnabled);
    pushLine(lines, "Бар дължина", barLen);
    pushLine(lines, "Бар ширина", barWidth);
    pushLine(lines, "Остров", islandEnabled);
    pushLine(lines, "Остров дължина", islandLen);
    pushLine(lines, "Остров ширина", islandWidth);
    pushLine(lines, "Колона за фурна", oven);
    pushLine(lines, "Хладилник", fridge);
    pushLine(lines, "Визия", vision);
    pushLine(lines, "Кога планирате", plan);
    pushLine(lines, "Предпочитан контакт", contact);

    return {
      configuration: "Ъглова без комин",
      water_position: water,
      chimney_position: chimney,
      wall_1: s1,
      wall_2: s2,
      room_height: h,
      bar_enabled: yesNo(barEnabled),
      bar_len: barLen,
      bar_width: barWidth,
      island_enabled: yesNo(islandEnabled),
      island_len: islandLen,
      island_width: islandWidth,
      oven_tall_unit: yesNo(oven),
      fridge_type: fridge,
      vision: vision,
      plan: plan,
      contact_preference: contact,
      summary: lines.join("\n")
    };
  }

  function buildSummaryForAglova3b(scope) {
    var lines = [];
    lines.push("Форма: Ъглова с комин");

    var water = getActiveValueByField(scope, "water_position_3b");
    var chimney = getActiveValueByField(scope, "chimney_position_3b");
    var s1 = getDimValue(scope, "stena1_len_3b");
    var s2 = getDimValue(scope, "stena2_len_3b");
    var h = getDimValue(scope, "visochina_3b");
    var ka = getDimValue(scope, "komin_a_3b");
    var kb = getDimValue(scope, "komin_b_3b");

    var barEnabled = getActiveValueByField(scope, "bar_enabled_3b");
    var barLen = getDimValue(scope, "bar_len_3b");
    var barWidth = getDimValue(scope, "bar_width_3b");

    var islandEnabled = getActiveValueByField(scope, "island_enabled_3b");
    var islandLen = getDimValue(scope, "island_len_3b");
    var islandWidth = getDimValue(scope, "island_width_3b");

    var oven = getActiveValueByField(scope, "oven_tall_unit_3b");
    var fridge = getActiveValueByField(scope, "fridge_type_3b");
    var vision = getActiveValueByField(scope, "vision_3b");
    var plan = getActiveValueByField(scope, "plan_3b");
    var contact = getActiveValueByField(scope, "contact_preference_3b");

    pushLine(lines, "Вода", water);
    pushLine(lines, "Комин", chimney);
    pushLine(lines, "Стена 1", s1);
    pushLine(lines, "Стена 2", s2);
    pushLine(lines, "Височина", h);
    pushLine(lines, "Комин A", ka);
    pushLine(lines, "Комин B", kb);
    pushLine(lines, "Бар", barEnabled);
    pushLine(lines, "Бар дължина", barLen);
    pushLine(lines, "Бар ширина", barWidth);
    pushLine(lines, "Остров", islandEnabled);
    pushLine(lines, "Остров дължина", islandLen);
    pushLine(lines, "Остров ширина", islandWidth);
    pushLine(lines, "Колона за фурна", oven);
    pushLine(lines, "Хладилник", fridge);
    pushLine(lines, "Визия", vision);
    pushLine(lines, "Кога планирате", plan);
    pushLine(lines, "Предпочитан контакт", contact);

    return {
      configuration: "Ъглова с комин",
      water_position: water,
      chimney_position: chimney,
      wall_1: s1,
      wall_2: s2,
      room_height: h,
      chimney_a: ka,
      chimney_b: kb,
      bar_enabled: yesNo(barEnabled),
      bar_len: barLen,
      bar_width: barWidth,
      island_enabled: yesNo(islandEnabled),
      island_len: islandLen,
      island_width: islandWidth,
      oven_tall_unit: yesNo(oven),
      fridge_type: fridge,
      vision: vision,
      plan: plan,
      contact_preference: contact,
      summary: lines.join("\n")
    };
  }

  function buildSummaryForP3a(scope) {
    var lines = [];
    lines.push("Форма: П без комин");

    var water = getActiveValueByField(scope, "water_position_p_3a");
    var hob = getActiveValueByField(scope, "hob_position_p_3a");
    var s1 = getDimValue(scope, "stena1_len_p_3a");
    var s2 = getDimValue(scope, "stena2_len_p_3a");
    var s3 = getDimValue(scope, "stena3_len_p_3a");
    var h = getDimValue(scope, "visochina_p_3a");

    var barEnabled = getActiveValueByField(scope, "bar_enabled_p_3a");
    var barLen = getDimValue(scope, "bar_len_p_3a");
    var barWidth = getDimValue(scope, "bar_width_p_3a");

    var islandEnabled =
      getActiveValueByField(scope, "island_enabled_p_3a") ||
      getActiveValueByField(scope, "bar_enabled_p_3c");
    var islandLen = getDimValue(scope, "island_len_p_3a");
    var islandWidth = getDimValue(scope, "island_width_p_3a");

    var oven = getActiveValueByField(scope, "oven_tall_unit_p_3a");
    var fridge = getActiveValueByField(scope, "fridge_type_p_3a");
    var vision = getActiveValueByField(scope, "vision_p_3a");
    var plan = getActiveValueByField(scope, "plan_p_3a");
    var contact = getActiveValueByField(scope, "contact_preference_p_3a");

    pushLine(lines, "Вода", water);
    pushLine(lines, "Котлони", hob);
    pushLine(lines, "Стена 1", s1);
    pushLine(lines, "Стена 2", s2);
    pushLine(lines, "Стена 3", s3);
    pushLine(lines, "Височина", h);
    pushLine(lines, "Бар", barEnabled);
    pushLine(lines, "Бар дължина", barLen);
    pushLine(lines, "Бар ширина", barWidth);
    pushLine(lines, "Остров", islandEnabled);
    pushLine(lines, "Остров дължина", islandLen);
    pushLine(lines, "Остров ширина", islandWidth);
    pushLine(lines, "Колона за фурна", oven);
    pushLine(lines, "Хладилник", fridge);
    pushLine(lines, "Визия", vision);
    pushLine(lines, "Кога планирате", plan);
    pushLine(lines, "Предпочитан контакт", contact);

    return {
      configuration: "П без комин",
      water_position: water,
      hob_position: hob,
      wall_1: s1,
      wall_2: s2,
      wall_3: s3,
      room_height: h,
      bar_enabled: yesNo(barEnabled),
      bar_len: barLen,
      bar_width: barWidth,
      island_enabled: yesNo(islandEnabled),
      island_len: islandLen,
      island_width: islandWidth,
      oven_tall_unit: yesNo(oven),
      fridge_type: fridge,
      vision: vision,
      plan: plan,
      contact_preference: contact,
      summary: lines.join("\n")
    };
  }

  function buildSummaryForP3b(scope) {
    var lines = [];
    lines.push("Форма: П с комин отляво");

    var water = getActiveValueByField(scope, "water_position_p_3b");
    var hob = getActiveValueByField(scope, "hob_position_p_3a");
    var s1 = getDimValue(scope, "stena1_len_p_3b");
    var s2 = getDimValue(scope, "stena2_len_p_3b");
    var s3 = getDimValue(scope, "stena3_len_p_3b");
    var h = getDimValue(scope, "visochina_p_3b");
    var ka = getDimValue(scope, "komin_a_p_3b");
    var kb = getDimValue(scope, "komin_b_p_3b");

    var barEnabled = getActiveValueByField(scope, "bar_enabled_p_3b");
    var barLen = getDimValue(scope, "bar_len_p_3b");
    var barWidth = getDimValue(scope, "bar_width_p_3b");

    var islandEnabled =
      getActiveValueByField(scope, "island_enabled_p_3b") ||
      getActiveValueByField(scope, "bar_enabled_p_3a");
    var islandLen = getDimValue(scope, "island_len_p_3b");
    var islandWidth = getDimValue(scope, "island_width_p_3b");

    var oven = getActiveValueByField(scope, "oven_tall_unit_p_3b");
    var fridge = getActiveValueByField(scope, "fridge_type_p_3b");
    var vision = getActiveValueByField(scope, "vision_p_3b");
    var plan = getActiveValueByField(scope, "question-plan_p3b");
    var contact = getActiveValueByField(scope, "contact_preference_p_3b");

    pushLine(lines, "Вода", water);
    pushLine(lines, "Котлони", hob);
    pushLine(lines, "Стена 1", s1);
    pushLine(lines, "Стена 2", s2);
    pushLine(lines, "Стена 3", s3);
    pushLine(lines, "Височина", h);
    pushLine(lines, "Комин A", ka);
    pushLine(lines, "Комин B", kb);
    pushLine(lines, "Бар", barEnabled);
    pushLine(lines, "Бар дължина", barLen);
    pushLine(lines, "Бар ширина", barWidth);
    pushLine(lines, "Остров", islandEnabled);
    pushLine(lines, "Остров дължина", islandLen);
    pushLine(lines, "Остров ширина", islandWidth);
    pushLine(lines, "Колона за фурна", oven);
    pushLine(lines, "Хладилник", fridge);
    pushLine(lines, "Визия", vision);
    pushLine(lines, "Кога планирате", plan);
    pushLine(lines, "Предпочитан контакт", contact);

    return {
      configuration: "П с комин отляво",
      water_position: water,
      hob_position: hob,
      wall_1: s1,
      wall_2: s2,
      wall_3: s3,
      room_height: h,
      chimney_a: ka,
      chimney_b: kb,
      bar_enabled: yesNo(barEnabled),
      bar_len: barLen,
      bar_width: barWidth,
      island_enabled: yesNo(islandEnabled),
      island_len: islandLen,
      island_width: islandWidth,
      oven_tall_unit: yesNo(oven),
      fridge_type: fridge,
      vision: vision,
      plan: plan,
      contact_preference: contact,
      summary: lines.join("\n")
    };
  }

  function buildSummaryForP3c(scope) {
    var lines = [];
    lines.push("Форма: П с комин отдясно");

    var water = getActiveValueByField(scope, "water_position_p_3c");
    var hob = getActiveValueByField(scope, "hob_position_p_3c");
    var s1 = getDimValue(scope, "stena1_len_p_3c");
    var s2 = getDimValue(scope, "stena2_len_p_3c");
    var s3 = getDimValue(scope, "stena3_len_p_3c");
    var h = getDimValue(scope, "visochina_p_3c");
    var ka = getDimValue(scope, "komin_a_p_3c");
    var kb = getDimValue(scope, "komin_b_p_3c");

    var barEnabled = getActiveValueByField(scope, "bar_enabled_p_3c");
    var barLen = getDimValue(scope, "bar_len_p_3c");
    var barWidth = getDimValue(scope, "bar_width_p_3c");

    var islandEnabled =
      getActiveValueByField(scope, "island_enabled_p_3c") ||
      getActiveValueByField(scope, "bar_enabled_p_3c");
    var islandLen = getDimValue(scope, "island_len_p_3c");
    var islandWidth = getDimValue(scope, "island_width_p_3c");

    var oven = getActiveValueByField(scope, "oven_tall_unit_p_3c");
    var fridge = getActiveValueByField(scope, "fridge_type_p_3c");
    var vision = getActiveValueByField(scope, "vision_p_3c");
    var plan = getActiveValueByField(scope, "plan_p_3c");
    var contact = getActiveValueByField(scope, "contact_preference_p_3c");

    pushLine(lines, "Вода", water);
    pushLine(lines, "Котлони", hob);
    pushLine(lines, "Стена 1", s1);
    pushLine(lines, "Стена 2", s2);
    pushLine(lines, "Стена 3", s3);
    pushLine(lines, "Височина", h);
    pushLine(lines, "Комин A", ka);
    pushLine(lines, "Комин B", kb);
    pushLine(lines, "Бар", barEnabled);
    pushLine(lines, "Бар дължина", barLen);
    pushLine(lines, "Бар ширина", barWidth);
    pushLine(lines, "Остров", islandEnabled);
    pushLine(lines, "Остров дължина", islandLen);
    pushLine(lines, "Остров ширина", islandWidth);
    pushLine(lines, "Колона за фурна", oven);
    pushLine(lines, "Хладилник", fridge);
    pushLine(lines, "Визия", vision);
    pushLine(lines, "Кога планирате", plan);
    pushLine(lines, "Предпочитан контакт", contact);

    return {
      configuration: "П с комин отдясно",
      water_position: water,
      hob_position: hob,
      wall_1: s1,
      wall_2: s2,
      wall_3: s3,
      room_height: h,
      chimney_a: ka,
      chimney_b: kb,
      bar_enabled: yesNo(barEnabled),
      bar_len: barLen,
      bar_width: barWidth,
      island_enabled: yesNo(islandEnabled),
      island_len: islandLen,
      island_width: islandWidth,
      oven_tall_unit: yesNo(oven),
      fridge_type: fridge,
      vision: vision,
      plan: plan,
      contact_preference: contact,
      summary: lines.join("\n")
    };
  }

  // ==================================================
  // FINAL MAPPER
  // ==================================================
  function mapCurrentScenario() {
    clearHiddenInputs();

    var current = getVisibleScenario();
    var data = null;

    if (current.key === "prava_3") data = buildSummaryForPrava(current.el);
    if (current.key === "aglova_3a") data = buildSummaryForAglova3a(current.el);
    if (current.key === "aglova_3b") data = buildSummaryForAglova3b(current.el);
    if (current.key === "p_3a") data = buildSummaryForP3a(current.el);
    if (current.key === "p_3b") data = buildSummaryForP3b(current.el);
    if (current.key === "p_3c") data = buildSummaryForP3c(current.el);

    if (!data) return;

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
    setHidden("summary_readable", data.summary);
  }

  // ==================================================
  // BIND
  // ==================================================
  formEl.addEventListener("submit", function () {
    mapCurrentScenario();
  });
});
