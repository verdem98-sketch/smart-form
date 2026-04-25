/* =========================================================
   AGLOVA NEXT REQUIRED CHOICE HINT
   Add below the working combo script
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  var flow = document.querySelector(".flow-aglova");
  if (!flow) return;

  function getOrCreateHint(questionWrap) {
    var hint = qs(questionWrap, ".question-hint");

    if (!hint) {
      hint = document.createElement("div");
      hint.className = "question-hint";
      hint.textContent = "Избери вариант, за да продължим.";

      var optionsRow = qs(questionWrap, ".options-row");
      if (optionsRow) {
        optionsRow.insertAdjacentElement("afterend", hint);
      } else {
        questionWrap.appendChild(hint);
      }
    }

    return hint;
  }

  function showWarning(questionWrap) {
    if (!questionWrap) return;

    var hint = getOrCreateHint(questionWrap);

    questionWrap.classList.remove("choice-warning");
    void questionWrap.offsetWidth;
    questionWrap.classList.add("choice-warning");

    hint.classList.add("is-visible");

    setTimeout(function () {
      questionWrap.classList.remove("choice-warning");
    }, 350);

    questionWrap.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function hideWarning(questionWrap) {
    if (!questionWrap) return;

    questionWrap.classList.remove("choice-warning");

    var hint = qs(questionWrap, ".question-hint");
    if (hint) hint.classList.remove("is-visible");
  }

  qsa(flow, ".question-next-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var questionWrap = btn.closest(".question-wrap");
      if (!questionWrap) return;

      var hasActive = !!qs(questionWrap, ".option-pill.active");

      if (!hasActive) {
        setTimeout(function () {
          showWarning(questionWrap);
        }, 0);
      }
    });
  });

  qsa(flow, ".option-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      var questionWrap = pill.closest(".question-wrap");
      hideWarning(questionWrap);
    });
  });

  qsa(flow, '[data-action="reset-aglova"]').forEach(function (btn) {
    btn.addEventListener("click", function () {
      qsa(flow, ".question-wrap").forEach(hideWarning);
    });
  });
});







/* =========================================================
   AGLOVA COMBO ENGINE v13
   - One script only
   - Combo hidden while dimensions are open
   - Dimensions hidden while combo is open
   - Center must be selected before "go-dimensions"
   - Bar OR island dimensions, never both
   - Back from dimensions returns to center question
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function normalize(v) {
    return String(v || "").trim();
  }

  function lower(v) {
    return normalize(v).toLowerCase();
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

  function getDataValue(el) {
    if (!el) return "";
    return normalize(el.getAttribute("data-value") || el.textContent);
  }

  function setSingleActive(pill) {
    if (!pill) return;
    var row = pill.closest(".options-row");
    if (!row) return;

    qsa(row, ".option-pill").forEach(function (item) {
      item.classList.remove("active");
    });

    pill.classList.add("active");
  }

  function clearActiveInQuestion(questionEl) {
    if (!questionEl) return;
    qsa(questionEl, ".option-pill").forEach(function (pill) {
      pill.classList.remove("active");
    });
  }

  function findDimGroupByOwner(scope, owner) {
    if (!scope || !owner) return null;
    return (
      qs(scope, '.dimensions-group[data-owner="' + owner + '"]') ||
      qs(scope, ".dimensions-group-" + owner) ||
      null
    );
  }

  function findDimGroupByDim(scope, dimName) {
    if (!scope || !dimName) return null;
    var row = qs(scope, '.dimension-row[data-dim="' + dimName + '"]');
    return row ? row.closest(".dimensions-group") : null;
  }

  var flowEl = document.querySelector(".flow-aglova");
  if (!flowEl) return;

  var stepEl =
    qs(flowEl, ".step-3b-aglova") ||
    qs(flowEl, ".combo-dim-phase") ||
    flowEl;

  var comboWrap = qs(stepEl, ".combo-phase-wrap");
  var dimensionsPhaseWrap = qs(stepEl, ".dimensions-phase-wrap");
  var cadStage = qs(stepEl, ".cad-stage");

  if (!comboWrap || !dimensionsPhaseWrap || !cadStage) return;

  var cadBase = qs(cadStage, ".cad-base");
  var cadKitchen = qs(cadStage, ".cad-kitchen");
  var cadBar = qs(cadStage, ".cad-bar");
  var cadIsland = qs(cadStage, ".cad-island");

  var baseImgs = qsa(cadBase, "[data-base]");
  var kitchenImgs = qsa(cadKitchen, "[data-kitchen]");
  var barImgs = qsa(cadBar, "[data-bar]");
  var islandImgs = qsa(cadIsland, "[data-island]");

  function getQuestionByStep(stepName) {
    return qs(comboWrap, '.question-wrap[data-step="' + stepName + '"]');
  }

  var questions = [
    { step: "chimney", field: "chimney_exists", el: getQuestionByStep("chimney") },
    { step: "water", field: "water_position_aglova", el: getQuestionByStep("water") },
    { step: "oven", field: "oven_tall_unit_aglova", el: getQuestionByStep("oven") },
    { step: "fridge", field: "fridge_type_aglova", el: getQuestionByStep("fridge") },
    { step: "center", field: "bar_enabled_aglova", el: getQuestionByStep("center") }
  ].filter(function (q) {
    return !!q.el;
  });

  if (questions.length < 5) return;

  var questionsMap = {};
  questions.forEach(function (q) {
    q.backBtn = qs(q.el, ".question-back-btn");
    q.nextBtn = qs(q.el, ".question-next-btn");
    questionsMap[q.step] = q;
  });

  function showOnlyQuestion(questionEl) {
    questions.forEach(function (q) {
      hide(q.el);
      q.el.classList.remove("is-active");
    });

    if (questionEl) {
      show(questionEl);
      questionEl.classList.add("is-active");
    }
  }

  function goToStep(stepName) {
    var q = questionsMap[stepName];
    if (q && q.el) showOnlyQuestion(q.el);
  }

  function hasSelection(questionObj) {
    if (!questionObj || !questionObj.el) return false;
    return !!qs(questionObj.el, ".option-pill.active");
  }

  function setNextEnabled(questionObj, enabled) {
    if (!questionObj || !questionObj.nextBtn) return;
    questionObj.nextBtn.classList.toggle("is-disabled", !enabled);
    questionObj.nextBtn.setAttribute("aria-disabled", enabled ? "false" : "true");
  }

  var allDimGroups = qsa(dimensionsPhaseWrap, ".dimensions-group");

  var mainDimensionsGroup =
    findDimGroupByOwner(dimensionsPhaseWrap, "main") ||
    findDimGroupByDim(dimensionsPhaseWrap, "stena1_len_aglova") ||
    allDimGroups[0] ||
    null;

  var chimneyDimensionsGroup =
    findDimGroupByOwner(dimensionsPhaseWrap, "chimney") ||
    findDimGroupByDim(dimensionsPhaseWrap, "chimney_a_aglova") ||
    allDimGroups[1] ||
    null;

  var barDimensionsGroup =
    findDimGroupByOwner(dimensionsPhaseWrap, "bar") ||
    findDimGroupByDim(dimensionsPhaseWrap, "bar_len_aglova") ||
    allDimGroups[2] ||
    null;

  var islandDimensionsGroup =
    findDimGroupByOwner(dimensionsPhaseWrap, "island") ||
    findDimGroupByDim(dimensionsPhaseWrap, "island_len_aglova") ||
    allDimGroups[3] ||
    null;

  var resetBtns = qsa(stepEl, '[data-action="reset-aglova"]');
  var goDimensionsBtn = qs(stepEl, '[data-action="go-dimensions"]');
  var backToComboBtn = qs(dimensionsPhaseWrap, '[data-action="back-to-combo"]');

  var mode = "combo";

  var state = {
    chimney: "",
    water: "",
    oven: "",
    fridge: "",
    bar: "",
    island: ""
  };

  function mapValue(fieldName, rawValue) {
    var value = lower(rawValue);

    if (fieldName === "chimney_exists") {
      if (value === "yes" || value === "да") return "yes";
      if (value === "no" || value === "не") return "no";
    }

    if (fieldName === "water_position_aglova") {
      if (value === "на стена 1" || value === "по стена 1" || value === "water1" || value === "wall1" || value === "1") return "water1";
      if (value === "на стена 2" || value === "по стена 2" || value === "water2" || value === "wall2" || value === "2") return "water2";
    }

    if (fieldName === "oven_tall_unit_aglova") {
      if (value === "yes" || value === "да") return "yes";
      if (value === "no" || value === "не") return "no";
    }

    if (fieldName === "fridge_type_aglova") {
      if (value === "yes" || value === "да" || value === "вграден" || value === "fridge") return "yes";
      if (value === "no" || value === "не" || value === "свободностоящ" || value === "свободно стоящ" || value === "nofridge") return "no";
    }

    if (fieldName === "bar_enabled_aglova") {
      if (value === "no" || value === "не") return "no";
      if (value === "wall1" || value === "срещу стена 1" || value === "1") return "wall1";
      if (value === "wall2" || value === "срещу стена 2" || value === "2") return "wall2";
      if (value === "island" || value === "остров") return "island";
    }

    return "";
  }

  function assignState(fieldName, mappedValue) {
    if (!fieldName || !mappedValue) return;

    if (fieldName === "chimney_exists") {
      state.chimney = mappedValue;
      return;
    }

    if (fieldName === "water_position_aglova") {
      state.water = mappedValue;
      return;
    }

    if (fieldName === "oven_tall_unit_aglova") {
      state.oven = mappedValue;
      return;
    }

    if (fieldName === "fridge_type_aglova") {
      state.fridge = mappedValue;
      return;
    }

    if (fieldName === "bar_enabled_aglova") {
      if (mappedValue === "wall1" || mappedValue === "wall2") {
        state.bar = mappedValue;
        state.island = "no";
        return;
      }

      if (mappedValue === "island") {
        state.bar = "no";
        state.island = "yes";
        return;
      }

      if (mappedValue === "no") {
        state.bar = "no";
        state.island = "no";
        return;
      }
    }
  }

  function getFieldNameFromPill(pill) {
    if (!pill) return "";

    var wrap = pill.closest(".question-wrap");
    var stepName = wrap ? normalize(wrap.getAttribute("data-step")) : "";

    if (stepName === "center") return "bar_enabled_aglova";

    var direct = normalize(pill.getAttribute("data-field"));
    if (direct) return direct;

    if (!wrap) return "";

    var wrapField = normalize(wrap.getAttribute("data-field"));
    if (wrapField) return wrapField;

    var q = questionsMap[stepName];
    return q ? q.field : "";
  }

  function chimneyToken() {
    if (state.chimney === "yes") return "chimney";
    if (state.chimney === "no") return "nochimney";
    return "";
  }

  function waterToken() {
    if (state.water === "water1") return "water1";
    if (state.water === "water2") return "water2";
    return "";
  }

  function ovenToken() {
    if (state.oven === "yes") return "oven";
    if (state.oven === "no") return "nooven";
    return "";
  }

  function fridgeToken() {
    if (state.fridge === "yes") return "fridge";
    if (state.fridge === "no") return "nofridge";
    return "";
  }

  function getCurrentKitchenKey() {
    var c = chimneyToken();
    var w = waterToken();

    if (!c || !w) return "";

    if (!state.oven) return c + "-" + w + "-nooven-nofridge";
    if (state.oven === "no" && !state.fridge) return c + "-" + w + "-nooven-nofridge";
    if (state.oven === "yes" && !state.fridge) return c + "-" + w + "-oven-nofridge";
    if (state.fridge) return c + "-" + w + "-" + ovenToken() + "-" + fridgeToken();

    return "";
  }

  function renderBase() {
    hideAll(baseImgs);

    if (!cadBase) return;

    if (state.water) {
      hide(cadBase);
      return;
    }

    show(cadBase);

    var key = state.chimney === "yes" ? "with-chimney" : "no-chimney";
    var target = qs(cadBase, '[data-base="' + key + '"]');
    if (target) show(target, "block");
  }

  function renderKitchen() {
    hideAll(kitchenImgs);

    if (!cadKitchen) return;

    if (!state.water) {
      hide(cadKitchen);
      return;
    }

    show(cadKitchen);

    var key = getCurrentKitchenKey();
    if (!key) return;

    var target = qs(cadKitchen, '[data-kitchen="' + key + '"]');
    if (target) show(target, "block");
  }

  function renderBar() {
    hideAll(barImgs);

    if (!cadBar || !state.water) {
      hide(cadBar);
      return;
    }

    if (state.bar === "wall1") {
      show(cadBar);
      var bar1 = qs(cadBar, '[data-bar="wall1"]');
      if (bar1) show(bar1, "block");
      return;
    }

    if (state.bar === "wall2") {
      show(cadBar);
      var bar2 = qs(cadBar, '[data-bar="wall2"]');
      if (bar2) show(bar2, "block");
      return;
    }

    hide(cadBar);
  }

  function renderIsland() {
    hideAll(islandImgs);

    if (!cadIsland || !state.water) {
      hide(cadIsland);
      return;
    }

    if (state.island === "yes") {
      show(cadIsland);
      var island = qs(cadIsland, '[data-island="yes"]');
      if (island) show(island, "block");
      return;
    }

    hide(cadIsland);
  }

  function renderDimensionsGroups() {
    if (mainDimensionsGroup) show(mainDimensionsGroup);

    if (chimneyDimensionsGroup) {
      if (state.chimney === "yes") show(chimneyDimensionsGroup);
      else hide(chimneyDimensionsGroup);
    }

    if (barDimensionsGroup) {
      if (state.bar === "wall1" || state.bar === "wall2") show(barDimensionsGroup);
      else hide(barDimensionsGroup);
    }

    if (islandDimensionsGroup) {
      if (state.island === "yes") show(islandDimensionsGroup);
      else hide(islandDimensionsGroup);
    }
  }

  function renderMode() {
    if (mode === "dimensions") {
      hide(comboWrap);
      show(dimensionsPhaseWrap);
    } else {
      show(comboWrap);
      hide(dimensionsPhaseWrap);
    }
  }

  function renderNavState() {
    questions.forEach(function (q) {
      if (q.step === "water" || q.step === "oven" || q.step === "fridge") {
        setNextEnabled(q, hasSelection(q));
      }
    });

    if (goDimensionsBtn) {
      var centerSelected = hasSelection(questionsMap.center);
      goDimensionsBtn.classList.toggle("is-disabled", !centerSelected);
      goDimensionsBtn.setAttribute("aria-disabled", centerSelected ? "false" : "true");
    }
  }

  function renderAll() {
    renderBase();
    renderKitchen();
    renderBar();
    renderIsland();
    renderMode();
    renderDimensionsGroups();
    renderNavState();
  }

  function resetState() {
    state.chimney = "";
    state.water = "";
    state.oven = "";
    state.fridge = "";
    state.bar = "";
    state.island = "";

    questions.forEach(function (q) {
      clearActiveInQuestion(q.el);
    });
  }

  function resetFlow() {
    mode = "combo";
    resetState();

    hideAll(kitchenImgs);
    hideAll(barImgs);
    hideAll(islandImgs);

    renderAll();
    goToStep("chimney");
  }

  qsa(comboWrap, ".option-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      var wrap = pill.closest(".question-wrap");
      var stepName = wrap ? normalize(wrap.getAttribute("data-step")) : "";

      var fieldName = getFieldNameFromPill(pill);
      var rawValue = getDataValue(pill);
      var mappedValue = mapValue(fieldName, rawValue);

      if (!fieldName || !mappedValue) return;

      setSingleActive(pill);
      assignState(fieldName, mappedValue);

      renderAll();

      if (stepName === "chimney") {
        goToStep("water");
      }
    });
  });

  qsa(comboWrap, ".question-back-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      mode = "combo";
      var targetStep = normalize(btn.getAttribute("data-step-back"));
      if (!targetStep) return;
      renderAll();
      goToStep(targetStep);
    });
  });

  qsa(comboWrap, ".question-next-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();

      var wrap = btn.closest(".question-wrap");
      if (!wrap) return;

      var stepName = normalize(wrap.getAttribute("data-step"));
      var q = questionsMap[stepName];
      if (!q || !hasSelection(q)) return;

      var targetStep = normalize(btn.getAttribute("data-step-next"));
      if (!targetStep) return;

      goToStep(targetStep);
    });
  });

  resetBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      resetFlow();
    });
  });

  if (goDimensionsBtn) {
    goDimensionsBtn.addEventListener("click", function (e) {
      e.preventDefault();

      if (!hasSelection(questionsMap.center)) return;

      mode = "dimensions";
      renderAll();

      setTimeout(function () {
        dimensionsPhaseWrap.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    });
  }

  if (backToComboBtn) {
    backToComboBtn.addEventListener("click", function (e) {
      e.preventDefault();

      mode = "combo";
      renderAll();
      goToStep("center");

      setTimeout(function () {
        comboWrap.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    });
  }

  hideAll(baseImgs);
  hideAll(kitchenImgs);
  hideAll(barImgs);
  hideAll(islandImgs);

  mode = "combo";
  renderAll();
  goToStep("chimney");
});



/* =========================================================
   AGLOVA DIMENSION PICKERS ENGINE v3
   - meters: min 0, step 1
   - centimeters: 0–95 step 5
   - overflow logic:
        95 + → 0 + 1 meter
        0 - → 95 - 1 meter (if possible)
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function setValue(el, val) {
    if (!el) return;
    el.textContent = val;
  }

  function getValue(el) {
    if (!el) return 0;
    return parseInt(el.textContent.trim(), 10) || 0;
  }

  var rows = qsa(document, ".dimension-row");

  rows.forEach(function (row) {

    var metersWrap = qs(row, ".meters-control");
    var cmWrap = qs(row, ".centimeters-control");

    var meterValue = metersWrap ? qs(metersWrap, ".picker-value") : null;
    var cmValue = cmWrap ? qs(cmWrap, ".picker-value") : null;

    // defaults
    if (meterValue && !meterValue.textContent.trim()) setValue(meterValue, 0);
    if (cmValue && !cmValue.textContent.trim()) setValue(cmValue, 0);

    // =========================
    // METERS
    // =========================
    if (metersWrap) {
      var meterBtns = qsa(metersWrap, ".picker-btn");

      if (meterBtns.length === 2) {
        var meterMinus = meterBtns[0];
        var meterPlus = meterBtns[1];

        meterMinus.addEventListener("click", function () {
          var m = getValue(meterValue);
          if (m > 0) m -= 1;
          setValue(meterValue, m);
        });

        meterPlus.addEventListener("click", function () {
          var m = getValue(meterValue);
          m += 1;
          setValue(meterValue, m);
        });
      }
    }

    // =========================
    // CENTIMETERS WITH CARRY
    // =========================
    if (cmWrap) {
      var cmBtns = qsa(cmWrap, ".picker-btn");

      if (cmBtns.length === 2) {
        var cmMinus = cmBtns[0];
        var cmPlus = cmBtns[1];

        // ➕ PLUS
        cmPlus.addEventListener("click", function () {
          var cm = getValue(cmValue);
          var m = getValue(meterValue);

          cm += 5;

          if (cm > 95) {
            cm = 0;
            m += 1;
          }

          setValue(cmValue, cm);
          setValue(meterValue, m);
        });

        // ➖ MINUS
        cmMinus.addEventListener("click", function () {
          var cm = getValue(cmValue);
          var m = getValue(meterValue);

          cm -= 5;

          if (cm < 0) {
            if (m > 0) {
              cm = 95;
              m -= 1;
            } else {
              cm = 0;
            }
          }

          setValue(cmValue, cm);
          setValue(meterValue, m);
        });
      }
    }

  });

});



/* =========================================================
   AGLOVA VISION CARDS SELECTION ENGINE v2
   Page: aglova-kuhnya
   Scope:
   - click on .vision-card
   - only one selected card per question-wrap
   - applies .is-selected to:
       1) .vision-card
       2) .vision-card-image-wrap
       3) .vision-card-image
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  var flowEl = document.querySelector(".flow-aglova");
  if (!flowEl) return;

  var extrasVisionPhase = qs(flowEl, ".extras-vision-phase");
  if (!extrasVisionPhase) return;

  var visionQuestions = qsa(extrasVisionPhase, ".question-wrap").filter(function (questionEl) {
    return qsa(questionEl, ".vision-card").length > 0;
  });

  visionQuestions.forEach(function (questionEl) {
    var cards = qsa(questionEl, ".vision-card");

    cards.forEach(function (card) {
      card.style.cursor = "pointer";

      card.addEventListener("click", function () {
        cards.forEach(function (item) {
          item.classList.remove("is-selected");

          var itemWrap = qs(item, ".vision-card-image-wrap");
          var itemImg = qs(item, ".vision-card-image");

          if (itemWrap) itemWrap.classList.remove("is-selected");
          if (itemImg) itemImg.classList.remove("is-selected");
        });

        card.classList.add("is-selected");

        var activeWrap = qs(card, ".vision-card-image-wrap");
        var activeImg = qs(card, ".vision-card-image");

        if (activeWrap) activeWrap.classList.add("is-selected");
        if (activeImg) activeImg.classList.add("is-selected");
      });
    });
  });
});




document.addEventListener("DOMContentLoaded", function () {
  var rows = document.querySelectorAll(".vision-cards-row");

  rows.forEach(function(row) {
    var cards = row.querySelectorAll(".vision-card");

    cards.forEach(function(card) {
      card.addEventListener("click", function() {
        row.querySelectorAll(".vision-card-image").forEach(function(img) {
          img.classList.remove("is-selected");
        });

        var img = card.querySelector(".vision-card-image");
        if (img) {
          img.classList.add("is-selected");
        }
      });
    });
  });
});





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

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function toISODateLocal(date) {
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate())
    );
  }

  function formatDateBG(date) {
    return date.toLocaleDateString("bg-BG", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function safeJSONParse(value) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return null;
    }
  }

  function isElementVisible(el) {
    if (!el) return false;

    var style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      style.opacity === "0"
    ) {
      return false;
    }

    if (el.offsetParent === null && style.position !== "fixed") {
      return false;
    }

    return true;
  }

  function setHidden(name, value) {
    var input = qs(document, '[name="' + name + '"]');
    if (input) input.value = value || "";
  }

  function show(el, displayType) {
    if (!el) return;
    el.style.display = displayType || el.dataset.display || "block";
  }

  function hide(el) {
    if (!el) return;
    el.style.display = "none";
  }

  // =========================
  // CONFIG
  // =========================
  var DAYS_TO_SHOW = 7;
  var START_OFFSET = 2;
  var SLOTS = ["10:00–12:00", "14:00–16:00"];
  var BOOKED_STATUS = "booked";
  var PENDING_STATUS = "pending";
  var STORAGE_KEY = "smartFormSelectedSlotState";

  // =========================
  // LOCAL STORAGE
  // =========================
  function saveSlotState(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function loadSlotState() {
    try {
      return safeJSONParse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function clearSlotState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  // =========================
  // GLOBAL HELPERS
  // =========================
  function clearAllActiveSlots() {
    qsa(document, ".booking-slot").forEach(function (el) {
      el.classList.remove("active");
    });
  }

  function clearAllLockedSlots() {
    qsa(document, ".booking-slot").forEach(function (el) {
      el.classList.remove("is-local-locked");
    });
  }

  // =========================
  // PER FINAL PHASE INIT
  // =========================
  function initFinalPhase(finalPhase, instanceIndex) {
    var bookingWrap = qs(finalPhase, ".booking-wrap");
    var bookingDays = qs(finalPhase, ".booking-days");
    var customDateInput = qs(finalPhase, ".booking-custom-date");
    var lockedHelp = qs(finalPhase, ".booking-locked-help");

    if (!bookingWrap || !bookingDays) return;

    // -------------------------
    // CMS DATA
    // -------------------------
    function getBlockedDatesFromCMS() {
      return qsa(finalPhase, ".blocked-date-value")
        .map(function (node) {
          return normalizeText(node.textContent);
        })
        .filter(function (value) {
          return /^\d{4}-\d{2}-\d{2}$/.test(value);
        });
    }

    function getBookedSlotsFromCMS() {
      var items = qsa(finalPhase, ".booked-slot-item");

      return items
        .map(function (item) {
          var dateEl = qs(item, ".booked-slot-date");
          var timeEl = qs(item, ".booked-slot-time");
          var statusEl = qs(item, ".booked-slot-status");

          var slotDate = normalizeText(dateEl && dateEl.textContent);
          var slotTime = normalizeText(timeEl && timeEl.textContent);
          var status = normalizeText(statusEl && statusEl.textContent).toLowerCase();

          if (!/^\d{4}-\d{2}-\d{2}$/.test(slotDate)) return null;
          if (!slotTime) return null;
          if (!status) return null;

          return {
            date: slotDate,
            time: slotTime,
            status: status
          };
        })
        .filter(Boolean);
    }

    var blockedDates = getBlockedDatesFromCMS();
    var bookedSlots = getBookedSlotsFromCMS();

    function isBlockedDate(dateISO) {
      return blockedDates.indexOf(dateISO) !== -1;
    }

    function getSlotStatus(dateISO, slotText) {
      var match = bookedSlots.find(function (item) {
        return item.date === dateISO && item.time === slotText;
      });

      return match ? match.status : "";
    }

    function isBookedSlot(dateISO, slotText) {
      return getSlotStatus(dateISO, slotText) === BOOKED_STATUS;
    }

    function isPendingSlot(dateISO, slotText) {
      return getSlotStatus(dateISO, slotText) === PENDING_STATUS;
    }

    function hasFreeSlot(dateISO) {
      if (isBlockedDate(dateISO)) return false;

      return SLOTS.some(function (slotText) {
        var status = getSlotStatus(dateISO, slotText);
        return status !== BOOKED_STATUS && status !== PENDING_STATUS;
      });
    }

    // -------------------------
    // STATE
    // -------------------------
    var selectedSlotState = null;
    var isSubmittedLocked = false;

    function setSelectedState(dateISO, slotText) {
      selectedSlotState = {
        date: dateISO,
        slot: slotText
      };
    }

    function clearSelectedState() {
      selectedSlotState = null;
    }

    function isSameAsSelected(dateISO, slotText) {
      return !!selectedSlotState &&
        selectedSlotState.date === dateISO &&
        selectedSlotState.slot === slotText;
    }

    function lockCalendarUI() {
      isSubmittedLocked = true;

      if (lockedHelp) {
        show(lockedHelp);

        var textEl = qs(lockedHelp, ".booking-locked-text");
        if (textEl) {
          var saved = loadSlotState();

          if (saved && saved.date && saved.slot) {
            var d = new Date(saved.date);

            var formattedDate = d.toLocaleDateString("bg-BG", {
              weekday: "long",
              day: "numeric",
              month: "long"
            });

            textEl.textContent =
              "Изпрати заявка за " +
              formattedDate +
              " · " +
              saved.slot +
              ". Ако искаш промяна, обади се.";
          } else {
            textEl.textContent =
              "Изпрати заявка за този час. Ако искаш промяна, обади се.";
          }
        }
      }

      qsa(finalPhase, ".booking-slot").forEach(function (el) {
        if (
          !el.classList.contains("is-booked") &&
          !el.classList.contains("is-pending") &&
          !el.classList.contains("active")
        ) {
          el.classList.add("is-local-locked");
        }
      });
    }

    function unlockCalendarUI() {
      isSubmittedLocked = false;
      if (lockedHelp) hide(lockedHelp);

      qsa(finalPhase, ".booking-slot").forEach(function (el) {
        el.classList.remove("is-local-locked");
      });
    }

    function clearSelectionInThisPhase(clearStorage) {
      qsa(finalPhase, ".booking-slot").forEach(function (el) {
        el.classList.remove("active");
      });

      clearSelectedState();
      unlockCalendarUI();

      if (isElementVisible(finalPhase)) {
        setHidden("meeting_date", "");
        setHidden("meeting_slot", "");
      }

      if (clearStorage !== false) {
        clearSlotState();
      }
    }

    function setSelectedSlot(slotEl, dateISO, slotText, options) {
      qsa(document, ".booking-slot").forEach(function (el) {
        el.classList.remove("active");
      });

      slotEl.classList.add("active");
      setSelectedState(dateISO, slotText);

      if (isElementVisible(finalPhase)) {
        setHidden("meeting_date", dateISO);
        setHidden("meeting_slot", slotText);
      }

      if (!options || options.saveStorage !== false) {
        var existing = loadSlotState() || {};
        saveSlotState({
          date: dateISO,
          slot: slotText,
          submitted: !!existing.submitted
        });
      }

      if (customDateInput) {
        customDateInput.value = "";
        if (isElementVisible(finalPhase)) {
          setHidden("custom_date", "");
        }
      }
    }

    function restoreFromStorage() {
      var saved = loadSlotState();
      if (!saved || !saved.date || !saved.slot) return;

      var selector =
        '.booking-slot[data-date="' +
        saved.date +
        '"][data-slot="' +
        saved.slot +
        '"]';

      var slotEl = qs(finalPhase, selector);
      if (!slotEl) return;

      if (
        slotEl.classList.contains("is-booked") ||
        slotEl.classList.contains("is-pending")
      ) {
        clearSlotState();
        clearSelectedState();
        unlockCalendarUI();
        return;
      }

      setSelectedSlot(slotEl, saved.date, saved.slot, {
        saveStorage: false
      });

      if (saved.submitted) {
        lockCalendarUI();
      } else {
        unlockCalendarUI();
      }
    }

    // -------------------------
    // CREATE UI
    // -------------------------
    function createSlot(dateISO, slotText) {
      var slot = document.createElement("div");
      slot.className = "booking-slot";
      slot.textContent = slotText;
      slot.setAttribute("data-date", dateISO);
      slot.setAttribute("data-slot", slotText);
      slot.setAttribute("data-instance", String(instanceIndex));

      if (isBookedSlot(dateISO, slotText)) {
        slot.classList.add("is-booked");
        slot.setAttribute("aria-disabled", "true");
        return slot;
      }

      if (isPendingSlot(dateISO, slotText)) {
        slot.classList.add("is-pending");
        slot.setAttribute("aria-disabled", "true");
        return slot;
      }

      slot.addEventListener("click", function () {
        if (isSubmittedLocked) return;

        if (isSameAsSelected(dateISO, slotText)) {
          clearSelectionInThisPhase();
          return;
        }

        setSelectedSlot(slot, dateISO, slotText);
      });

      return slot;
    }

    function createDayCard(date) {
      var dateISO = toISODateLocal(date);

      var dayCard = document.createElement("div");
      dayCard.className = "booking-day";

      var dayTitle = document.createElement("div");
      dayTitle.className = "booking-date";
      dayTitle.textContent = formatDateBG(date);

      var slotsWrap = document.createElement("div");
      slotsWrap.className = "booking-slots";

      if (isBlockedDate(dateISO)) {
        dayCard.classList.add("is-blocked-day");

        var blockedLabel = document.createElement("div");
        blockedLabel.className = "booking-day-status";
        blockedLabel.textContent = "Няма свободни часове";

        dayCard.appendChild(dayTitle);
        dayCard.appendChild(blockedLabel);
        return dayCard;
      }

      SLOTS.forEach(function (slotText) {
        slotsWrap.appendChild(createSlot(dateISO, slotText));
      });

      if (!hasFreeSlot(dateISO)) {
        dayCard.classList.add("is-full-day");
      }

      dayCard.appendChild(dayTitle);
      dayCard.appendChild(slotsWrap);

      return dayCard;
    }

    function generateCalendarDays() {
      bookingDays.innerHTML = "";

      var current = new Date();
      current.setHours(12, 0, 0, 0);
      current.setDate(current.getDate() + START_OFFSET);

      var freeDaysAdded = 0;
      var safety = 0;
      var MAX_LOOKAHEAD = 90;

      while (freeDaysAdded < DAYS_TO_SHOW && safety < MAX_LOOKAHEAD) {
        var day = current.getDay();
        var iso = toISODateLocal(current);

        if (day !== 0 && day !== 6) {
          bookingDays.appendChild(createDayCard(new Date(current)));

          if (hasFreeSlot(iso)) {
            freeDaysAdded++;
          }
        }

        current.setDate(current.getDate() + 1);
        safety++;
      }
    }

    // -------------------------
    // CUSTOM DATE
    // -------------------------
    if (customDateInput) {
      customDateInput.addEventListener("input", function () {
        if (isSubmittedLocked) return;

        var value = normalizeText(customDateInput.value);

        if (value) {
          clearSelectionInThisPhase();
          if (isElementVisible(finalPhase)) {
            setHidden("custom_date", value);
          }
        } else if (isElementVisible(finalPhase)) {
          setHidden("custom_date", "");
        }
      });
    }

    // -------------------------
    // FORM SUBMIT LOCK
    // -------------------------
    var formEl = finalPhase.closest("form");
    if (formEl) {
      formEl.addEventListener("submit", function () {
        if (!isElementVisible(finalPhase)) return;
        if (!selectedSlotState) return;

        saveSlotState({
          date: selectedSlotState.date,
          slot: selectedSlotState.slot,
          submitted: true
        });

        lockCalendarUI();
      });
    }

    // -------------------------
    // RESTORE WHEN FINAL PHASE OPENS
    // -------------------------
    var lastVisible = isElementVisible(finalPhase);

    function tryRestoreWhenVisible() {
      if (!isElementVisible(finalPhase)) return;
      restoreFromStorage();
    }

    var observer = new MutationObserver(function () {
      var visibleNow = isElementVisible(finalPhase);

      if (visibleNow && !lastVisible) {
        setTimeout(function () {
          tryRestoreWhenVisible();
        }, 30);
      }

      lastVisible = visibleNow;
    });

    observer.observe(finalPhase, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });

    // -------------------------
    // INIT
    // -------------------------
    generateCalendarDays();

    if (lockedHelp) hide(lockedHelp);

    if (isElementVisible(finalPhase)) {
      restoreFromStorage();
    }
  }

  // =========================
  // GLOBAL INIT
  // =========================
  setHidden("meeting_date", "");
  setHidden("meeting_slot", "");

  var customDateAny = qs(document, ".booking-custom-date");
  setHidden("custom_date", customDateAny ? normalizeText(customDateAny.value) : "");

  var finalPhases = qsa(document, ".final-phase");
  finalPhases.forEach(function (phase, index) {
    initFinalPhase(phase, index);
  });
});




/* =========================================================
   AGLOVA PHASE NAVIGATION ENGINE
   Page: aglova-kuhnya
   Scope:
   - hides final phase on load
   - clicking .phase-next-btn inside .extras-vision-phase
     hides extras/vision phase and shows .final-phase
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  // =========================================================
  // HELPERS
  // =========================================================
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

  // =========================================================
  // ROOT
  // =========================================================
  var flowEl = document.querySelector(".flow-aglova");
  if (!flowEl) return;

  var stepEl = qs(flowEl, ".step-3b-aglova");
  if (!stepEl) return;

  var extrasVisionPhase = qs(stepEl, ".extras-vision-phase");
  var finalPhase = qs(stepEl, ".final-phase");

  if (!extrasVisionPhase || !finalPhase) return;

  var nextBtns = qsa(extrasVisionPhase, ".phase-next-btn");

  // =========================================================
  // INITIAL STATE
  // =========================================================
  show(extrasVisionPhase, "block");
  hide(finalPhase);

  // =========================================================
  // GO TO FINAL PHASE
  // =========================================================
  function goToFinalPhase() {
    hide(extrasVisionPhase);
    show(finalPhase, "block");

    setTimeout(function () {
      finalPhase.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);

    // ако календарният скрипт има resize/visibility зависимост,
    // това често му помага да се прерисува след show
    window.dispatchEvent(new Event("resize"));
  }

  // =========================================================
  // EVENTS
  // =========================================================
  nextBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      goToFinalPhase();
    });
  });
});



/* =========================================================
   AGLOVA FINAL PHASE INSPIRATION CARDS ENGINE v3
   Fallback version
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  var flow = document.querySelector(".flow-aglova");
  if (!flow) return;

  var finalPhase = qs(flow, ".final-phase");
  if (!finalPhase) return;

  var cards = qsa(finalPhase, ".inspiration-card");
  if (!cards.length) return;

  function clearActive() {
    cards.forEach(function (card) {
      card.classList.remove("active");
    });
  }

  cards.forEach(function (card) {
    card.style.cursor = "pointer";

    card.addEventListener("click", function () {
      clearActive();
      card.classList.add("active");
    });
  });
});



/* =========================================================
   AGLOVA PLAN OPTION PILLS ENGINE v2
   Page: aglova-kuhnya
   Scope:
   - one active .option-pill per .question-wrap
   - works even if pills are split across multiple .options-row
   - writes selected value to hidden input if question-wrap has data-field
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  // =========================================================
  // HELPERS
  // =========================================================
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function normalize(v) {
    return String(v || "").trim();
  }

  function findField(scope, name) {
    if (!name) return null;
    return qs(scope, '[name="' + name + '"]');
  }

  function setField(scope, name, value) {
    var el = findField(scope, name);
    if (el) el.value = value || "";
  }

  function getPillValue(pill) {
    return normalize(
      pill.getAttribute("data-value") ||
      pill.textContent
    );
  }

  // =========================================================
  // ROOT
  // =========================================================
  var flow = document.querySelector(".flow-aglova");
  if (!flow) return;

  var form = flow.closest("form") || document.querySelector("form");
  if (!form) return;

  // =========================================================
  // QUESTION WRAPS THAT CONTAIN OPTION PILLS
  // =========================================================
  var questionWraps = qsa(flow, ".question-wrap").filter(function (wrap) {
    return qsa(wrap, ".option-pill").length > 0;
  });

  if (!questionWraps.length) return;

  questionWraps.forEach(function (questionWrap) {
    var fieldName = normalize(questionWrap.getAttribute("data-field"));
    var pills = qsa(questionWrap, ".option-pill");

    function clearActive() {
      pills.forEach(function (pill) {
        pill.classList.remove("active");
      });
    }

    function activatePill(pill, skipWrite) {
      clearActive();
      pill.classList.add("active");

      if (!skipWrite && fieldName) {
        setField(form, fieldName, getPillValue(pill));
      }
    }

    pills.forEach(function (pill) {
      pill.style.cursor = "pointer";

      pill.addEventListener("click", function () {
        activatePill(pill, false);
      });
    });

    // restore from hidden input if present
    if (fieldName) {
      var fieldEl = findField(form, fieldName);
      var currentValue = normalize(fieldEl ? fieldEl.value : "");

      if (currentValue) {
        var matched = pills.find(function (pill) {
          return getPillValue(pill) === currentValue;
        });

        if (matched) {
          activatePill(matched, true);
        }
      }
    }
  });
});




/* HIDE CONFIGURATOR WHEN FINAL PHASE OPENS */

document.addEventListener("DOMContentLoaded", function () {
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

  var flow = document.querySelector(".flow-aglova");
  if (!flow) return;

  var comboDimPhase = qs(flow, ".combo-dim-phase");
  var finalPhase = qs(flow, ".final-phase");

  if (!comboDimPhase || !finalPhase) return;

  qsa(flow, ".phase-next-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      hide(comboDimPhase);
      show(finalPhase, "block");

      setTimeout(function () {
        finalPhase.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    });
  });
});




/* =========================================================
   AGLOVA FINAL PHASE VALIDATION GATE
   Checks:
   1) all combo questions answered
   2) all visible dimension rows filled
   Add below combo + warning scripts
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
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

  function isVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  }

  function numFromText(el) {
    if (!el) return 0;
    return parseInt(String(el.textContent || "").trim(), 10) || 0;
  }

  var flow = document.querySelector(".flow-aglova");
  if (!flow) return;

  var comboDimPhase = qs(flow, ".combo-dim-phase");
  var comboWrap = qs(flow, ".combo-phase-wrap");
  var dimensionsWrap = qs(flow, ".dimensions-phase-wrap");
  var finalPhase = qs(flow, ".final-phase");

  if (!comboDimPhase || !comboWrap || !dimensionsWrap || !finalPhase) return;

  function getOrCreateQuestionHint(questionWrap) {
    var hint = qs(questionWrap, ".question-hint");

    if (!hint) {
      hint = document.createElement("div");
      hint.className = "question-hint";
      hint.textContent = "Избери вариант, за да продължим.";

      var optionsRow = qs(questionWrap, ".options-row");
      if (optionsRow) optionsRow.insertAdjacentElement("afterend", hint);
      else questionWrap.appendChild(hint);
    }

    return hint;
  }

  function getOrCreateDimensionHint(row) {
    var hint = qs(row, ".dimension-hint");

    if (!hint) {
      hint = document.createElement("div");
      hint.className = "dimension-hint";
      hint.textContent = "Попълни размера, за да продължим.";
      row.appendChild(hint);
    }

    return hint;
  }

  function shakeQuestion(questionWrap) {
    if (!questionWrap) return;

    var hint = getOrCreateQuestionHint(questionWrap);

    questionWrap.classList.remove("choice-warning");
    void questionWrap.offsetWidth;
    questionWrap.classList.add("choice-warning");

    hint.classList.add("is-visible");

    setTimeout(function () {
      questionWrap.classList.remove("choice-warning");
    }, 350);

    questionWrap.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function shakeDimension(row) {
    if (!row) return;

    var hint = getOrCreateDimensionHint(row);

    row.classList.remove("dimension-warning");
    void row.offsetWidth;
    row.classList.add("dimension-warning");

    hint.classList.add("is-visible");

    setTimeout(function () {
      row.classList.remove("dimension-warning");
    }, 350);

    row.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function hideAllHints() {
    qsa(flow, ".question-hint").forEach(function (el) {
      el.classList.remove("is-visible");
    });

    qsa(flow, ".dimension-hint").forEach(function (el) {
      el.classList.remove("is-visible");
    });
  }

  function findFirstUnansweredQuestion() {
    var questions = qsa(comboWrap, ".question-wrap");

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];

      if (qsa(q, ".option-pill").length === 0) continue;

      var hasActive = !!qs(q, ".option-pill.active");

      if (!hasActive) return q;
    }

    return null;
  }

  function isDimensionRowFilled(row) {
    var values = qsa(row, ".picker-value");

    if (!values.length) return true;

    var total = 0;

    values.forEach(function (val) {
      total += numFromText(val);
    });

    return total > 0;
  }

  function findFirstEmptyVisibleDimension() {
    var rows = qsa(dimensionsWrap, ".dimension-row");

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];

      if (!isVisible(row)) continue;

      var parentHidden = row.closest('[style*="display: none"]');
      if (parentHidden) continue;

      if (!isDimensionRowFilled(row)) return row;
    }

    return null;
  }

  function goFinal() {
    hide(comboDimPhase);
    show(finalPhase, "block");

    setTimeout(function () {
      finalPhase.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);
  }

  qsa(flow, ".phase-next-btn").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();

      hideAllHints();

      var unanswered = findFirstUnansweredQuestion();

      if (unanswered) {
        show(comboWrap, "block");
        hide(dimensionsWrap);
        shakeQuestion(unanswered);
        return;
      }

      var emptyDim = findFirstEmptyVisibleDimension();

      if (emptyDim) {
        hide(comboWrap);
        show(dimensionsWrap, "block");
        shakeDimension(emptyDim);
        return;
      }

      goFinal();
    });
  });

  qsa(flow, ".option-pill").forEach(function (pill) {
    pill.addEventListener("click", hideAllHints);
  });

  qsa(flow, ".picker-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      setTimeout(hideAllHints, 20);
    });
  });
});
