console.log("SMART FORM JS LOADED");
/* =========================================================
   VERDE-M SMART FORM — AGLOVA MASTER JS v14
   Paste directly in GitHub smart-form.js
   NO <script> tags here.
   ========================================================= */


(function () {
  if (window.VERDE_AGLOVA_MASTER_V14_LOADED) return;
  window.VERDE_AGLOVA_MASTER_V14_LOADED = true;

  document.addEventListener("DOMContentLoaded", function () {
    console.log("VERDE AGLOVA MASTER v14 loaded");

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

    function isVisible(el) {
      if (!el) return false;
      var style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden";
    }

    function getTextNumber(el) {
      if (!el) return 0;
      return parseInt(String(el.textContent || "").trim(), 10) || 0;
    }

    var flow = document.querySelector(".flow-aglova");
    if (!flow) return;

    var form = flow.closest("form") || document.querySelector("form");

    /* =====================================================
       COMBO ENGINE
       ===================================================== */

    var stepEl =
      qs(flow, ".step-3b-aglova") ||
      qs(flow, ".combo-dim-phase") ||
      flow;

    var comboDimPhase = qs(stepEl, ".combo-dim-phase") || qs(flow, ".combo-dim-phase");
    var comboWrap = qs(stepEl, ".combo-phase-wrap");
    var dimensionsWrap = qs(stepEl, ".dimensions-phase-wrap");
    var cadStage = qs(stepEl, ".cad-stage");
    var extrasVisionPhase = qs(flow, ".extras-vision-phase");
    var finalPhase = qs(flow, ".final-phase");

    if (!comboWrap || !dimensionsWrap || !cadStage) return;

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

    var state = {
      chimney: "",
      water: "",
      oven: "",
      fridge: "",
      bar: "",
      island: ""
    };

    var mode = "combo";

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

    var allDimGroups = qsa(dimensionsWrap, ".dimensions-group");

    var mainDimensionsGroup =
      findDimGroupByOwner(dimensionsWrap, "main") ||
      findDimGroupByDim(dimensionsWrap, "stena1_len_aglova") ||
      allDimGroups[0] ||
      null;

    var chimneyDimensionsGroup =
      findDimGroupByOwner(dimensionsWrap, "chimney") ||
      findDimGroupByDim(dimensionsWrap, "chimney_a_aglova") ||
      allDimGroups[1] ||
      null;

    var barDimensionsGroup =
      findDimGroupByOwner(dimensionsWrap, "bar") ||
      findDimGroupByDim(dimensionsWrap, "bar_len_aglova") ||
      allDimGroups[2] ||
      null;

    var islandDimensionsGroup =
      findDimGroupByOwner(dimensionsWrap, "island") ||
      findDimGroupByDim(dimensionsWrap, "island_len_aglova") ||
      allDimGroups[3] ||
      null;

    var resetBtns = qsa(stepEl, '[data-action="reset-aglova"]');
    var goDimensionsBtn = qs(stepEl, '[data-action="go-dimensions"]');
    var backToComboBtn = qs(dimensionsWrap, '[data-action="back-to-combo"]');

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

      if (fieldName === "chimney_exists") state.chimney = mappedValue;
      if (fieldName === "water_position_aglova") state.water = mappedValue;
      if (fieldName === "oven_tall_unit_aglova") state.oven = mappedValue;
      if (fieldName === "fridge_type_aglova") state.fridge = mappedValue;

      if (fieldName === "bar_enabled_aglova") {
        if (mappedValue === "wall1" || mappedValue === "wall2") {
          state.bar = mappedValue;
          state.island = "no";
        }

        if (mappedValue === "island") {
          state.bar = "no";
          state.island = "yes";
        }

        if (mappedValue === "no") {
          state.bar = "no";
          state.island = "no";
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

      var wrapField = wrap ? normalize(wrap.getAttribute("data-field")) : "";
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
        show(dimensionsWrap);
      } else {
        show(comboWrap);
        hide(dimensionsWrap);
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
        hideAllHints();
        renderAll();

        if (stepName === "chimney") goToStep("water");
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

        if (!q || !hasSelection(q)) {
          shakeQuestion(wrap);
          return;
        }

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

        if (!hasSelection(questionsMap.center)) {
          shakeQuestion(questionsMap.center.el);
          return;
        }

        mode = "dimensions";
        renderAll();

        setTimeout(function () {
          dimensionsWrap.scrollIntoView({
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

    /* =====================================================
       WARNINGS
       ===================================================== */

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

    function isDimensionRowFilled(row) {
      var values = qsa(row, ".picker-value");
      if (!values.length) return true;

      var total = 0;
      values.forEach(function (val) {
        total += getTextNumber(val);
      });

      return total > 0;
    }

    function findFirstEmptyVisibleDimension() {
      var rows = qsa(dimensionsWrap, ".dimension-row");

      for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!isVisible(row)) continue;

        var group = row.closest(".dimensions-group");
        if (group && !isVisible(group)) continue;

        if (!isDimensionRowFilled(row)) return row;
      }

      return null;
    }

   /* =====================================================
   DIMENSION PICKERS
   - initial value stays 0
   - row becomes valid after first touch
   ===================================================== */

function markRowTouched(row) {
  if (!row) return;
  row.classList.add("is-touched");
  row.setAttribute("data-touched", "true");
}

qsa(document, ".dimension-row").forEach(function (row) {
  var metersWrap = qs(row, ".meters-control");
  var cmWrap = qs(row, ".centimeters-control");

  var meterValue = metersWrap ? qs(metersWrap, ".picker-value") : null;
  var cmValue = cmWrap ? qs(cmWrap, ".picker-value") : null;

  if (meterValue && !meterValue.textContent.trim()) meterValue.textContent = "0";
  if (cmValue && !cmValue.textContent.trim()) cmValue.textContent = "0";

  if (metersWrap) {
    var meterBtns = qsa(metersWrap, ".picker-btn");

    if (meterBtns.length === 2) {
      meterBtns[0].addEventListener("click", function () {
        markRowTouched(row);

        var m = getTextNumber(meterValue);
        if (m > 0) m -= 1;
        meterValue.textContent = m;
        hideAllHints();
      });

      meterBtns[1].addEventListener("click", function () {
        markRowTouched(row);

        var m = getTextNumber(meterValue);
        meterValue.textContent = m + 1;
        hideAllHints();
      });
    }
  }

  if (cmWrap) {
    var cmBtns = qsa(cmWrap, ".picker-btn");

    if (cmBtns.length === 2) {
      cmBtns[0].addEventListener("click", function () {
        markRowTouched(row);

        var cm = getTextNumber(cmValue);
        var m = getTextNumber(meterValue);

        cm -= 5;

        if (cm < 0) {
          if (m > 0) {
            cm = 95;
            m -= 1;
          } else {
            cm = 0;
          }
        }

        if (cmValue) cmValue.textContent = cm;
        if (meterValue) meterValue.textContent = m;
        hideAllHints();
      });

      cmBtns[1].addEventListener("click", function () {
        markRowTouched(row);

        var cm = getTextNumber(cmValue);
        var m = getTextNumber(meterValue);

        cm += 5;

        if (cm > 95) {
          cm = 0;
          m += 1;
        }

        if (cmValue) cmValue.textContent = cm;
        if (meterValue) meterValue.textContent = m;
        hideAllHints();
      });
    }
  }
});

   /* =====================================================
   EXTRAS / VISION / FINAL GATE
   - requires visible dimension rows to be touched
   - 2 м 0 см is valid if row was touched
   ===================================================== */

if (finalPhase) hide(finalPhase);

function isDimensionRowFilled(row) {
  if (!row) return true;

  // Новата логика:
  // попълнено = потребителят е пипнал реда поне веднъж
  return row.classList.contains("is-touched") ||
         row.getAttribute("data-touched") === "true";
}

function findFirstEmptyVisibleDimension() {
  var rows = qsa(dimensionsPhaseWrap, ".dimension-row");

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];

    if (!isVisible(row)) continue;

    var hiddenParent = row.closest('[style*="display: none"]');
    if (hiddenParent) continue;

    if (!isDimensionRowFilled(row)) {
      return row;
    }
  }

  return null;
}

qsa(flow, ".phase-next-btn").forEach(function (btn) {
  btn.addEventListener("click", function (e) {
    e.preventDefault();

    hideAllHints();

    var emptyDim = findFirstEmptyVisibleDimension();

    if (emptyDim) {
      mode = "dimensions";
      renderAll();

      setTimeout(function () {
        shakeDimension(emptyDim);
      }, 50);

      return;
    }

    if (comboDimPhase) hide(comboDimPhase);
    if (extrasVisionPhase) hide(extrasVisionPhase);
    show(finalPhase, "block");

    setTimeout(function () {
      finalPhase.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);

    window.dispatchEvent(new Event("resize"));
  });
});

  /* =====================================================
   VISION / INSPIRATION CARDS - TRUE TOGGLE VERSION
   ===================================================== */

qsa(flow, ".vision-cards-row").forEach(function (row) {
  var cards = qsa(row, ".vision-card");

  function clearCard(card) {
    card.classList.remove("is-selected", "active");

    var wrap = qs(card, ".vision-card-image-wrap");
    var img = qs(card, ".vision-card-image");

    if (wrap) wrap.classList.remove("is-selected", "active");
    if (img) img.classList.remove("is-selected", "active");
  }

  function selectCard(card) {
    card.classList.add("is-selected", "active");

    var wrap = qs(card, ".vision-card-image-wrap");
    var img = qs(card, ".vision-card-image");

    if (wrap) wrap.classList.add("is-selected", "active");
    if (img) img.classList.add("is-selected", "active");
  }

  cards.forEach(function (card) {
    card.style.cursor = "pointer";

    card.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      var alreadySelected =
        card.classList.contains("is-selected") ||
        card.classList.contains("active");

      cards.forEach(clearCard);

      if (!alreadySelected) {
        selectCard(card);
      }
    }, true);
  });
});

qsa(flow, ".inspiration-card").forEach(function (card) {
  card.style.cursor = "pointer";

  card.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    var wrap = card.closest(".final-phase") || flow;

    var alreadySelected =
      card.classList.contains("is-selected") ||
      card.classList.contains("active");

    qsa(wrap, ".inspiration-card").forEach(function (item) {
      item.classList.remove("active", "is-selected");
    });

    if (!alreadySelected) {
      card.classList.add("active", "is-selected");
    }
  }, true);
});

     
    /* =====================================================
       PLAN OPTION PILLS OUTSIDE COMBO
       ===================================================== */

    qsa(flow, ".question-wrap").forEach(function (questionWrap) {
      if (comboWrap.contains(questionWrap)) return;

      var pills = qsa(questionWrap, ".option-pill");
      if (!pills.length) return;

      var fieldName = normalize(questionWrap.getAttribute("data-field"));

      pills.forEach(function (pill) {
        pill.style.cursor = "pointer";

        pill.addEventListener("click", function () {
          pills.forEach(function (item) {
            item.classList.remove("active");
          });

          pill.classList.add("active");

          if (fieldName && form) {
            var input = qs(form, '[name="' + fieldName + '"]');
            if (input) input.value = getDataValue(pill);
          }
        });
      });
    });

    /* =====================================================
       BOOKING CALENDAR
       ===================================================== */

    function pad(n) {
      return String(n).padStart(2, "0");
    }

    function toISODateLocal(date) {
      return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    }

    function formatDateBG(date) {
      return date.toLocaleDateString("bg-BG", {
        weekday: "long",
        day: "numeric",
        month: "long"
      });
    }

    function safeJSONParse(value) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return null;
      }
    }

    function setHidden(name, value) {
      var input = qs(document, '[name="' + name + '"]');
      if (input) input.value = value || "";
    }

    var DAYS_TO_SHOW = 7;
    var START_OFFSET = 2;
    var SLOTS = ["10:00–12:00", "14:00–16:00"];
    var STORAGE_KEY = "smartFormSelectedSlotState";

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

    function initFinalPhase(phase, index) {
      var bookingDays = qs(phase, ".booking-days");
      var customDateInput = qs(phase, ".booking-custom-date");
      var lockedHelp = qs(phase, ".booking-locked-help");

      if (!bookingDays) return;

      var selectedSlotState = null;
      var submittedLocked = false;

      function getBlockedDates() {
        return qsa(phase, ".blocked-date-value")
          .map(function (node) {
            return normalize(node.textContent);
          })
          .filter(function (value) {
            return /^\d{4}-\d{2}-\d{2}$/.test(value);
          });
      }

      function getBookedSlots() {
        return qsa(phase, ".booked-slot-item")
          .map(function (item) {
            var dateEl = qs(item, ".booked-slot-date");
            var timeEl = qs(item, ".booked-slot-time");
            var statusEl = qs(item, ".booked-slot-status");

            return {
              date: normalize(dateEl && dateEl.textContent),
              time: normalize(timeEl && timeEl.textContent),
              status: lower(statusEl && statusEl.textContent)
            };
          })
          .filter(function (item) {
            return /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.time && item.status;
          });
      }

      var blockedDates = getBlockedDates();
      var bookedSlots = getBookedSlots();

      function getSlotStatus(dateISO, slotText) {
        var match = bookedSlots.find(function (item) {
          return item.date === dateISO && item.time === slotText;
        });

        return match ? match.status : "";
      }

      function isUnavailable(dateISO, slotText) {
        var status = getSlotStatus(dateISO, slotText);
        return status === "booked" || status === "pending";
      }

      function hasFreeSlot(dateISO) {
        if (blockedDates.indexOf(dateISO) !== -1) return false;

        return SLOTS.some(function (slotText) {
          return !isUnavailable(dateISO, slotText);
        });
      }

      function lockCalendarUI() {
        submittedLocked = true;

        if (lockedHelp) {
          show(lockedHelp);

          var textEl = qs(lockedHelp, ".booking-locked-text");
          var saved = loadSlotState();

          if (textEl && saved && saved.date && saved.slot) {
            var d = new Date(saved.date);
            textEl.textContent =
              "Изпрати заявка за " +
              d.toLocaleDateString("bg-BG", {
                weekday: "long",
                day: "numeric",
                month: "long"
              }) +
              " · " +
              saved.slot +
              ". Ако искаш промяна, обади се.";
          }
        }

        qsa(phase, ".booking-slot").forEach(function (el) {
          if (!el.classList.contains("active") && !el.classList.contains("is-booked") && !el.classList.contains("is-pending")) {
            el.classList.add("is-local-locked");
          }
        });
      }

      function clearActiveSlots() {
        qsa(document, ".booking-slot").forEach(function (el) {
          el.classList.remove("active");
        });
      }

      function setSelectedSlot(slotEl, dateISO, slotText, save) {
        clearActiveSlots();

        slotEl.classList.add("active");

        selectedSlotState = {
          date: dateISO,
          slot: slotText
        };

        setHidden("meeting_date", dateISO);
        setHidden("meeting_slot", slotText);

        if (customDateInput) {
          customDateInput.value = "";
          setHidden("custom_date", "");
        }

        if (save !== false) {
          var existing = loadSlotState() || {};
          saveSlotState({
            date: dateISO,
            slot: slotText,
            submitted: !!existing.submitted
          });
        }
      }

      function createSlot(dateISO, slotText) {
        var slot = document.createElement("div");
        slot.className = "booking-slot";
        slot.textContent = slotText;
        slot.setAttribute("data-date", dateISO);
        slot.setAttribute("data-slot", slotText);
        slot.setAttribute("data-instance", String(index));

        var status = getSlotStatus(dateISO, slotText);

        if (status === "booked") {
          slot.classList.add("is-booked");
          slot.setAttribute("aria-disabled", "true");
          return slot;
        }

        if (status === "pending") {
          slot.classList.add("is-pending");
          slot.setAttribute("aria-disabled", "true");
          return slot;
        }

        slot.addEventListener("click", function () {
          if (submittedLocked) return;
          setSelectedSlot(slot, dateISO, slotText, true);
        });

        return slot;
      }

      function createDayCard(date) {
        var dateISO = toISODateLocal(date);
        var dayCard = document.createElement("div");
        dayCard.className = "booking-day";

        var title = document.createElement("div");
        title.className = "booking-date";
        title.textContent = formatDateBG(date);

        dayCard.appendChild(title);

        if (blockedDates.indexOf(dateISO) !== -1) {
          var blockedLabel = document.createElement("div");
          blockedLabel.className = "booking-day-status";
          blockedLabel.textContent = "Няма свободни часове";
          dayCard.classList.add("is-blocked-day");
          dayCard.appendChild(blockedLabel);
          return dayCard;
        }

        var slotsWrap = document.createElement("div");
        slotsWrap.className = "booking-slots";

        SLOTS.forEach(function (slotText) {
          slotsWrap.appendChild(createSlot(dateISO, slotText));
        });

        if (!hasFreeSlot(dateISO)) {
          dayCard.classList.add("is-full-day");
        }

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

        while (freeDaysAdded < DAYS_TO_SHOW && safety < 90) {
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

      function restoreFromStorage() {
        var saved = loadSlotState();
        if (!saved || !saved.date || !saved.slot) return;

        var slotEl = qs(phase, '.booking-slot[data-date="' + saved.date + '"][data-slot="' + saved.slot + '"]');
        if (!slotEl) return;

        if (slotEl.classList.contains("is-booked") || slotEl.classList.contains("is-pending")) return;

        setSelectedSlot(slotEl, saved.date, saved.slot, false);

        if (saved.submitted) lockCalendarUI();
      }

      if (customDateInput) {
        customDateInput.addEventListener("input", function () {
          if (submittedLocked) return;

          var value = normalize(customDateInput.value);

          if (value) {
            clearActiveSlots();
            selectedSlotState = null;
            setHidden("meeting_date", "");
            setHidden("meeting_slot", "");
            setHidden("custom_date", value);
          } else {
            setHidden("custom_date", "");
          }
        });
      }

      if (form) {
        form.addEventListener("submit", function () {
          if (!isVisible(phase)) return;
          if (!selectedSlotState) return;

          saveSlotState({
            date: selectedSlotState.date,
            slot: selectedSlotState.slot,
            submitted: true
          });

          lockCalendarUI();
        });
      }

      generateCalendarDays();
      if (lockedHelp) hide(lockedHelp);
      restoreFromStorage();
    }

    setHidden("meeting_date", "");
    setHidden("meeting_slot", "");
    setHidden("custom_date", "");

    qsa(flow, ".final-phase").forEach(function (phase, index) {
      initFinalPhase(phase, index);
    });
  });
})();
