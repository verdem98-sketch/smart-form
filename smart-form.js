<script>
/* =========================================================
   AGLOVA COMBO PHASE ENGINE v3
   Page: aglova-kuhnya
   Logic:
   - On load: show only base-no-chimney
   - Chimney YES: switch to base-with-chimney
   - After water selection: hide base completely, show 1 kitchen image
   - Kitchen images REPLACE the base, they do not stack over it
   - Only bar and island are overlays
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  // =========================================================
  // GUARDS
  // =========================================================
  var flowEl = document.querySelector(".flow-aglova");
  if (!flowEl) return;

  var stepEl = flowEl.querySelector(".step-3b-aglova");
  if (!stepEl) return;

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

  function hideAll(list) {
    (list || []).forEach(hide);
  }

  function normalize(v) {
    return String(v || "").trim();
  }

  function lower(v) {
    return normalize(v).toLowerCase();
  }

  function getDataValue(el) {
    if (!el) return "";
    return normalize(el.getAttribute("data-value"));
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

  function showQuestionByIndex(index) {
    questionEls.forEach(function (q, i) {
      if (i === index) {
        show(q);
        q.classList.add("is-active");
      } else {
        hide(q);
        q.classList.remove("is-active");
      }
    });
  }

  // =========================================================
  // DOM
  // =========================================================
  var comboWrap = qs(stepEl, ".combo-phase-wrap");
  if (!comboWrap) return;

  var questionEls = qsa(comboWrap, ".question-wrap");
  if (questionEls.length < 6) return;

  var cadStage = qs(stepEl, ".cad-stage");
  if (!cadStage) return;

  var cadBase = qs(cadStage, ".cad-base");
  var cadKitchen = qs(cadStage, ".cad-kitchen");
  var cadBar = qs(cadStage, ".cad-bar");
  var cadIsland = qs(cadStage, ".cad-island");

  var baseImgs = qsa(cadBase, "[data-base]");
  var kitchenImgs = qsa(cadKitchen, "[data-kitchen]");
  var barImgs = qsa(cadBar, "[data-bar]");
  var islandImgs = qsa(cadIsland, "[data-island]");

  var dimensionsPhaseWrap = qs(stepEl, ".dimensions-phase-wrap");
  var mainDimensionsGroup = qs(dimensionsPhaseWrap, ".dimensions-group-main");
  var chimneyDimensionsGroup = qs(dimensionsPhaseWrap, '.dimensions-group-chimney[data-owner="chimney"]');
  var barDimensionsGroup = qs(stepEl, '.dimensions-group-bar[data-owner="bar"]');
  var islandDimensionsGroup = qs(stepEl, '.dimensions-group-island[data-owner="island"]');

  var resetBtn = qs(stepEl, '[data-action="reset-aglova"]');

  // =========================================================
  // STATE
  // =========================================================
  var state = {
    chimney: "", // yes | no
    water: "",   // water1 | water2
    oven: "",    // yes | no
    fridge: "",  // yes | no
    bar: "",     // no | wall1 | wall2
    island: ""   // yes | no
  };

  // =========================================================
  // VALUE MAPPERS
  // =========================================================
  function mapValue(fieldName, rawValue) {
    var value = lower(rawValue);

    if (fieldName === "chimney_exists") {
      if (value === "yes" || value === "да") return "yes";
      if (value === "no" || value === "не") return "no";
    }

    if (fieldName === "water_position_aglova") {
      if (value === "по стена 1" || value === "water1" || value === "wall1" || value === "1") return "water1";
      if (value === "по стена 2" || value === "water2" || value === "wall2" || value === "2") return "water2";
    }

    if (fieldName === "oven_tall_unit_aglova") {
      if (value === "yes" || value === "да") return "yes";
      if (value === "no" || value === "не") return "no";
    }

    if (fieldName === "fridge_type_aglova") {
      if (value === "yes" || value === "да" || value === "вграден" || value === "fridge") return "yes";
      if (value === "no" || value === "не" || value === "свободно стоящ" || value === "nofridge") return "no";
    }

    if (fieldName === "bar_enabled_aglova") {
      if (value === "no" || value === "не") return "no";
      if (value === "wall1" || value === "срещу стена 1" || value === "1") return "wall1";
      if (value === "wall2" || value === "срещу стена 2" || value === "2") return "wall2";
    }

    if (fieldName === "island_enabled_aglova") {
      if (value === "yes" || value === "да") return "yes";
      if (value === "no" || value === "не") return "no";
    }

    return "";
  }

  function assignState(fieldName, mappedValue) {
    if (!fieldName || !mappedValue) return;

    switch (fieldName) {
      case "chimney_exists":
        state.chimney = mappedValue;
        break;
      case "water_position_aglova":
        state.water = mappedValue;
        break;
      case "oven_tall_unit_aglova":
        state.oven = mappedValue;
        break;
      case "fridge_type_aglova":
        state.fridge = mappedValue;
        break;
      case "bar_enabled_aglova":
        state.bar = mappedValue;
        break;
      case "island_enabled_aglova":
        state.island = mappedValue;
        break;
    }
  }

  // =========================================================
  // TOKENS
  // =========================================================
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

  // =========================================================
  // KITCHEN KEY
  // =========================================================
  function getCurrentKitchenKey() {
    var c = chimneyToken();
    var w = waterToken();

    if (!c || !w) return "";

    if (!state.oven) {
      return c + "-" + w + "-nooven-nofridge";
    }

    if (state.oven === "no" && !state.fridge) {
      return c + "-" + w + "-nooven-nofridge";
    }

    if (state.oven === "yes" && !state.fridge) {
      return c + "-" + w + "-oven-nofridge";
    }

    if (state.fridge) {
      return c + "-" + w + "-" + ovenToken() + "-" + fridgeToken();
    }

    return "";
  }

  // =========================================================
  // FLOW POINTER
  // =========================================================
  function getNextQuestionIndex() {
    if (!state.chimney) return 0;
    if (!state.water) return 1;
    if (!state.oven) return 2;
    if (!state.fridge) return 3;
    if (!state.bar) return 4;
    if (!state.island) return 5;
    return -1;
  }

  // =========================================================
  // CAD RENDER
  // =========================================================
  function renderBase() {
    hideAll(baseImgs);

    // Base is visible ONLY before water is chosen
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

    // Kitchen becomes visible ONLY after water is chosen
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

    if (!state.water) {
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

    if (!state.water) {
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

  function renderDimensions() {
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

  function renderQuestions() {
    var nextIndex = getNextQuestionIndex();

    if (nextIndex === -1) {
      hideAll(questionEls);
      return;
    }

    showQuestionByIndex(nextIndex);
  }

  function renderAll() {
    renderBase();
    renderKitchen();
    renderBar();
    renderIsland();
    renderDimensions();
    renderQuestions();
  }

  // =========================================================
  // RESET HELPERS
  // =========================================================
  function clearQuestionActive(index) {
    if (!questionEls[index]) return;
    clearActiveInQuestion(questionEls[index]);
  }

  function clearFromStep(stepName) {
    switch (stepName) {
      case "chimney":
        state.chimney = "";
        state.water = "";
        state.oven = "";
        state.fridge = "";
        state.bar = "";
        state.island = "";
        clearQuestionActive(0);
        clearQuestionActive(1);
        clearQuestionActive(2);
        clearQuestionActive(3);
        clearQuestionActive(4);
        clearQuestionActive(5);
        break;

      case "water":
        state.water = "";
        state.oven = "";
        state.fridge = "";
        state.bar = "";
        state.island = "";
        clearQuestionActive(1);
        clearQuestionActive(2);
        clearQuestionActive(3);
        clearQuestionActive(4);
        clearQuestionActive(5);
        break;

      case "oven":
        state.oven = "";
        state.fridge = "";
        state.bar = "";
        state.island = "";
        clearQuestionActive(2);
        clearQuestionActive(3);
        clearQuestionActive(4);
        clearQuestionActive(5);
        break;

      case "fridge":
        state.fridge = "";
        state.bar = "";
        state.island = "";
        clearQuestionActive(3);
        clearQuestionActive(4);
        clearQuestionActive(5);
        break;

      case "bar":
        state.bar = "";
        state.island = "";
        clearQuestionActive(4);
        clearQuestionActive(5);
        break;

      case "island":
        state.island = "";
        clearQuestionActive(5);
        break;
    }
  }

  function handleBack(stepName) {
    clearFromStep(stepName);
    renderAll();
  }

  function resetFlow() {
    state.chimney = "";
    state.water = "";
    state.oven = "";
    state.fridge = "";
    state.bar = "";
    state.island = "";

    questionEls.forEach(function (q) {
      clearActiveInQuestion(q);
    });

    hideAll(kitchenImgs);
    hideAll(barImgs);
    hideAll(islandImgs);

    renderAll();
  }

  // =========================================================
  // EVENTS: OPTION PILLS
  // =========================================================
  qsa(comboWrap, ".option-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {
      var fieldName = normalize(pill.getAttribute("data-field"));
      var rawValue = getDataValue(pill);
      var mappedValue = mapValue(fieldName, rawValue);

      if (!fieldName || !mappedValue) return;

      setSingleActive(pill);
      assignState(fieldName, mappedValue);
      renderAll();
    });
  });

  // =========================================================
  // EVENTS: BACK
  // =========================================================
  qsa(comboWrap, "[data-step-back]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var stepName = normalize(btn.getAttribute("data-step-back"));
      if (!stepName) return;
      handleBack(stepName);
    });
  });

  // =========================================================
  // EVENTS: RESET
  // =========================================================
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      resetFlow();
    });
  }

  // =========================================================
  // INITIAL
  // =========================================================
  hideAll(baseImgs);
  hideAll(kitchenImgs);
  hideAll(barImgs);
  hideAll(islandImgs);
  hideAll(questionEls);

  renderAll();
});
</script>


<script>
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
</script>

<script>
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
</script>


<script>
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
</script>


<script>
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
</script>

<script>
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
</script>
<script>
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
</script>
<script>
/* =========================================================
   AGLOVA SUBMIT + SUMMARY ENGINE
   Page: aglova-kuhnya
   Scope:
   - reads local aglova fields
   - fills canonical global hidden inputs
   - builds readable summary_readable
   - disables local junk fields before submit
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

  function hasValue(v) {
    return normalize(v) !== "";
  }

  function findField(scope, name) {
    if (!name) return null;
    return qs(scope, '[name="' + name + '"]');
  }

  function getField(scope, name) {
    var el = findField(scope, name);
    return el ? normalize(el.value) : "";
  }

  function setField(scope, name, value) {
    var el = findField(scope, name);
    if (el) el.value = value || "";
  }

  function readActiveValue(questionWrap) {
    if (!questionWrap) return "";

    var activePill = qs(questionWrap, ".option-pill.active");
    if (activePill) {
      return normalize(activePill.getAttribute("data-value") || activePill.textContent);
    }

    var activeVision = qs(questionWrap, ".vision-card.active, .vision-card.is-selected");
    if (activeVision) {
      return normalize(activeVision.getAttribute("data-value") || activeVision.textContent);
    }

    var activeInspiration = qs(questionWrap, ".inspiration-card.active");
    if (activeInspiration) {
      return normalize(activeInspiration.getAttribute("data-value") || activeInspiration.textContent);
    }

    var textInput = qs(
      questionWrap,
      'textarea:not([name^="summary_readable_local_"]), input[type="text"], input[type="email"], input[type="tel"]'
    );
    if (textInput) {
      return normalize(textInput.value);
    }

    return "";
  }

  function readQuestionField(fieldName) {
    var wrap = qs(flow, '.question-wrap[data-field="' + fieldName + '"]');
    if (!wrap) return getField(form, fieldName);
    return readActiveValue(wrap) || getField(form, fieldName);
  }

  function readMeters(control) {
    if (!control) return 0;
    var val = qs(control, ".picker-value");
    return val ? parseInt(normalize(val.textContent), 10) || 0 : 0;
  }

  function readDimValue(dimName) {
    var row = qs(flow, '.dimension-row[data-dim="' + dimName + '"]');
    if (!row) return getField(form, dimName);

    var meters = readMeters(qs(row, ".meters-control"));
    var cms = readMeters(qs(row, ".centimeters-control"));

    var hasMetersControl = !!qs(row, ".meters-control");
    var hasCmControl = !!qs(row, ".centimeters-control");

    if (!hasMetersControl && !hasCmControl) return "";

    if (hasMetersControl && hasCmControl) {
      if (meters === 0 && cms === 0) return "";
      if (meters > 0 && cms > 0) return meters + " м " + cms + " см";
      if (meters > 0) return meters + " м";
      return cms + " см";
    }

    if (hasCmControl) {
      if (cms === 0) return "";
      return cms + " см";
    }

    return "";
  }

  function yesNoBg(v) {
    var x = normalize(v).toLowerCase();
    if (x === "yes") return "Да";
    if (x === "no") return "Не";
    return normalize(v);
  }

  function boolWord(v) {
    var x = normalize(v).toLowerCase();
    if (x === "yes") return "yes";
    if (x === "no") return "no";
    return normalize(v);
  }

  function pushLine(lines, label, value) {
    if (!hasValue(value)) return;
    lines.push(label + ": " + value);
  }

  function disableField(name) {
    var el = findField(form, name);
    if (el) el.disabled = true;
  }

  function disableFieldsBySelector(sel) {
    qsa(form, sel).forEach(function (el) {
      el.disabled = true;
    });
  }

  // =========================================================
  // ROOT
  // =========================================================
  var flow = document.querySelector(".flow-aglova");
  if (!flow) return;

  var form = flow.closest("form") || document.querySelector("form");
  if (!form) return;

  // =========================================================
  // COLLECT LOCAL VALUES
  // =========================================================
  function collectLocal() {
    var local = {};

    local.chimney_exists = readQuestionField("chimney_exists");
    local.water_position_aglova = readQuestionField("water_position_aglova");
    local.oven_tall_unit_aglova = readQuestionField("oven_tall_unit_aglova");
    local.fridge_type_aglova = readQuestionField("fridge_type_aglova");
    local.bar_enabled_aglova = readQuestionField("bar_enabled_aglova");
    local.island_enabled_aglova = readQuestionField("island_enabled_aglova");

    local.stena1_len_aglova = readDimValue("stena1_len_aglova");
    local.stena2_len_aglova = readDimValue("stena2_len_aglova");
    local.visochina_aglova = readDimValue("visochina_aglova");

    local.chimney_a_aglova = readDimValue("chimney_a_aglova");
    local.chimney_b_aglova = readDimValue("chimney_b_aglova");
    local.chimney_c_aglova = readDimValue("chimney_c_aglova");
    local.chimney_d_aglova = readDimValue("chimney_d_aglova");

    local.bar_len_aglova = readDimValue("bar_len_aglova");
    local.bar_width_aglova = readDimValue("bar_width_aglova");

    local.island_len_aglova = readDimValue("island_len_aglova");
    local.island_width_aglova = readDimValue("island_width_aglova");

    local.upper_finish_aglova = readQuestionField("upper_finish_aglova");
    local.lower_finish_aglova = readQuestionField("lower_finish_aglova");
    local.worktop_finish_aglova = readQuestionField("worktop_finish_aglova");
    local.backsplash_finish_aglova = readQuestionField("backsplash_finish_aglova");

    local.upper_finish_note_aglova = getField(form, "upper_finish_note_aglova");
    local.lower_finish_note_aglova = getField(form, "lower_finish_note_aglova");
    local.worktop_note_aglova = getField(form, "worktop_note_aglova");
    local.backsplash_note_aglova = getField(form, "backsplash_note_aglova");

    local.plan_aglova = readQuestionField("plan_aglova");
    local.inspiration_direction_aglova = readQuestionField("inspiration_direction_aglova");

    return local;
  }

  // =========================================================
  // WRITE LOCAL HIDDEN + LOCAL SUMMARY FIELDS
  // =========================================================
  function writeLocal(local) {
    Object.keys(local).forEach(function (key) {
      setField(form, key, local[key]);
    });

    setField(form, "summary_readable_local_chimney_exists", local.chimney_exists ? "Комин в ъгъла: " + yesNoBg(local.chimney_exists) : "");
    setField(form, "summary_readable_local_water_position_aglova", local.water_position_aglova ? "Вода: " + local.water_position_aglova : "");
    setField(form, "summary_readable_local_oven_tall_unit_aglova", local.oven_tall_unit_aglova ? "Колона за фурна: " + yesNoBg(local.oven_tall_unit_aglova) : "");
    setField(form, "summary_readable_local_fridge_type_aglova", local.fridge_type_aglova ? "Хладилник: " + local.fridge_type_aglova : "");
    setField(form, "summary_readable_local_bar_enabled_aglova", local.bar_enabled_aglova ? "Бар: " + local.bar_enabled_aglova : "");
    setField(form, "summary_readable_local_island_enabled_aglova", local.island_enabled_aglova ? "Остров: " + yesNoBg(local.island_enabled_aglova) : "");

    var mainDims = [];
    if (hasValue(local.stena1_len_aglova)) mainDims.push("Стена 1: " + local.stena1_len_aglova);
    if (hasValue(local.stena2_len_aglova)) mainDims.push("Стена 2: " + local.stena2_len_aglova);
    if (hasValue(local.visochina_aglova)) mainDims.push("Височина: " + local.visochina_aglova);
    setField(form, "summary_readable_local_main_dimensions_aglova", mainDims.join(" | "));

    var chimneyDims = [];
    if (hasValue(local.chimney_a_aglova)) chimneyDims.push("A: " + local.chimney_a_aglova);
    if (hasValue(local.chimney_b_aglova)) chimneyDims.push("B: " + local.chimney_b_aglova);
    if (hasValue(local.chimney_c_aglova)) chimneyDims.push("C: " + local.chimney_c_aglova);
    if (hasValue(local.chimney_d_aglova)) chimneyDims.push("D: " + local.chimney_d_aglova);
    setField(form, "summary_readable_local_chimney_dimensions_aglova", chimneyDims.length ? "Размери на комина: " + chimneyDims.join(" | ") : "");

    var barDims = [];
    if (hasValue(local.bar_len_aglova)) barDims.push("Дължина: " + local.bar_len_aglova);
    if (hasValue(local.bar_width_aglova)) barDims.push("Ширина: " + local.bar_width_aglova);
    setField(form, "summary_readable_local_bar_dimensions_aglova", barDims.length ? "Размери на бара: " + barDims.join(" | ") : "");

    var islandDims = [];
    if (hasValue(local.island_len_aglova)) islandDims.push("Дължина: " + local.island_len_aglova);
    if (hasValue(local.island_width_aglova)) islandDims.push("Ширина: " + local.island_width_aglova);
    setField(form, "summary_readable_local_island_dimensions_aglova", islandDims.length ? "Размери на острова: " + islandDims.join(" | ") : "");

    setField(form, "summary_readable_local_upper_finish_aglova", local.upper_finish_aglova ? "Горен ред: " + local.upper_finish_aglova : "");
    setField(form, "summary_readable_local_lower_finish_aglova", local.lower_finish_aglova ? "Долен ред: " + local.lower_finish_aglova : "");
    setField(form, "summary_readable_local_worktop_finish_aglova", local.worktop_finish_aglova ? "Плот: " + local.worktop_finish_aglova : "");
    setField(form, "summary_readable_local_backsplash_finish_aglova", local.backsplash_finish_aglova ? "Гръб: " + local.backsplash_finish_aglova : "");

    setField(form, "summary_readable_local_upper_finish_note_aglova", local.upper_finish_note_aglova ? "Бележка за горен ред: " + local.upper_finish_note_aglova : "");
    setField(form, "summary_readable_local_lower_finish_note_aglova", local.lower_finish_note_aglova ? "Бележка за долен ред: " + local.lower_finish_note_aglova : "");
    setField(form, "summary_readable_local_worktop_note_aglova", local.worktop_note_aglova ? "Бележка за плот: " + local.worktop_note_aglova : "");
    setField(form, "summary_readable_local_backsplash_note_aglova", local.backsplash_note_aglova ? "Бележка за гръб: " + local.backsplash_note_aglova : "");

    setField(form, "summary_readable_local_plan_aglova", local.plan_aglova ? "Планиране: " + local.plan_aglova : "");
    setField(form, "summary_readable_local_inspiration_direction_aglova", local.inspiration_direction_aglova ? "Посока: " + local.inspiration_direction_aglova : "");
  }

  // =========================================================
  // MAP TO CANONICAL GLOBAL FIELDS
  // =========================================================
  function writeCanonical(local) {
    setField(form, "configuration", "aglova");

    setField(form, "water_position", local.water_position_aglova);

    // при ъглова няма отделна canonical логика за chimney_position като позиция,
    // но ползваме полето, за да не е празно
    setField(form, "chimney_position", yesNoBg(local.chimney_exists));

    setField(form, "chimney_a", local.chimney_a_aglova);
    setField(form, "chimney_b", local.chimney_b_aglova);
    setField(form, "chimney_c", local.chimney_c_aglova);
    setField(form, "chimney_d", local.chimney_d_aglova);

    setField(form, "wall_1", local.stena1_len_aglova);
    setField(form, "wall_2", local.stena2_len_aglova);
    setField(form, "room_height", local.visochina_aglova);

    setField(form, "bar_enabled", boolWord(local.bar_enabled_aglova));
    setField(form, "bar_len", local.bar_len_aglova);
    setField(form, "bar_width", local.bar_width_aglova);

    setField(form, "island_enabled", boolWord(local.island_enabled_aglova));
    setField(form, "island_len", local.island_len_aglova);
    setField(form, "island_width", local.island_width_aglova);

    setField(form, "oven_tall_unit", boolWord(local.oven_tall_unit_aglova));
    setField(form, "fridge_type", local.fridge_type_aglova);

    var visionParts = [];
    if (hasValue(local.upper_finish_aglova)) visionParts.push("Горен ред: " + local.upper_finish_aglova);
    if (hasValue(local.lower_finish_aglova)) visionParts.push("Долен ред: " + local.lower_finish_aglova);
    if (hasValue(local.worktop_finish_aglova)) visionParts.push("Плот: " + local.worktop_finish_aglova);
    if (hasValue(local.backsplash_finish_aglova)) visionParts.push("Гръб: " + local.backsplash_finish_aglova);
    setField(form, "vision", visionParts.join(" | "));

    setField(form, "plan", local.plan_aglova);
  }

  // =========================================================
  // BUILD GLOBAL SUMMARY_READABLE
  // =========================================================
  function buildSummary(local) {
    var lines = [];

    pushLine(lines, "Конфигурация", "Ъглова кухня");
    pushLine(lines, "Комин в ъгъла", yesNoBg(local.chimney_exists));
    pushLine(lines, "Вода", local.water_position_aglova);
    pushLine(lines, "Колона за фурна", yesNoBg(local.oven_tall_unit_aglova));
    pushLine(lines, "Хладилник", local.fridge_type_aglova);
    pushLine(lines, "Бар", local.bar_enabled_aglova);
    pushLine(lines, "Остров", yesNoBg(local.island_enabled_aglova));

    pushLine(lines, "Стена 1", local.stena1_len_aglova);
    pushLine(lines, "Стена 2", local.stena2_len_aglova);
    pushLine(lines, "Височина", local.visochina_aglova);

    pushLine(lines, "Комин A", local.chimney_a_aglova);
    pushLine(lines, "Комин B", local.chimney_b_aglova);
    pushLine(lines, "Комин C", local.chimney_c_aglova);
    pushLine(lines, "Комин D", local.chimney_d_aglova);

    pushLine(lines, "Бар - дължина", local.bar_len_aglova);
    pushLine(lines, "Бар - ширина", local.bar_width_aglova);

    pushLine(lines, "Остров - дължина", local.island_len_aglova);
    pushLine(lines, "Остров - ширина", local.island_width_aglova);

    pushLine(lines, "Горен ред", local.upper_finish_aglova);
    pushLine(lines, "Бележка за горен ред", local.upper_finish_note_aglova);

    pushLine(lines, "Долен ред", local.lower_finish_aglova);
    pushLine(lines, "Бележка за долен ред", local.lower_finish_note_aglova);

    pushLine(lines, "Плот", local.worktop_finish_aglova);
    pushLine(lines, "Бележка за плот", local.worktop_note_aglova);

    pushLine(lines, "Гръб", local.backsplash_finish_aglova);
    pushLine(lines, "Бележка за гръб", local.backsplash_note_aglova);

    pushLine(lines, "Планиране", local.plan_aglova);
    pushLine(lines, "Посока", local.inspiration_direction_aglova);

    var meetingDate = getField(form, "meeting_date");
    var meetingSlot = getField(form, "meeting_slot");
    var customDate = getField(form, "custom_date");

    pushLine(lines, "Среща - дата", meetingDate);
    pushLine(lines, "Среща - час", meetingSlot);
    pushLine(lines, "Друг удобен ден/час", customDate);

    setField(form, "summary_readable", lines.join("\n"));
  }

  // =========================================================
  // DISABLE LOCAL JUNK BEFORE SUBMIT
  // =========================================================
  function disableLocalJunk() {
    // local readable textareas
    disableFieldsBySelector('textarea[name^="summary_readable_local_"]');

    // local aglova hidden inputs
    disableField("water_position_aglova");
    disableField("oven_tall_unit_aglova");
    disableField("fridge_type_aglova");
    disableField("bar_enabled_aglova");
    disableField("island_enabled_aglova");

    disableField("stena1_len_aglova");
    disableField("stena2_len_aglova");
    disableField("visochina_aglova");

    disableField("chimney_a_aglova");
    disableField("chimney_b_aglova");
    disableField("chimney_c_aglova");
    disableField("chimney_d_aglova");

    disableField("bar_len_aglova");
    disableField("bar_width_aglova");

    disableField("island_len_aglova");
    disableField("island_width_aglova");

    disableField("upper_finish_aglova");
    disableField("lower_finish_aglova");
    disableField("worktop_finish_aglova");
    disableField("backsplash_finish_aglova");

    disableField("upper_finish_note_aglova");
    disableField("lower_finish_note_aglova");
    disableField("worktop_note_aglova");
    disableField("backsplash_note_aglova");

    disableField("plan_aglova");
    disableField("inspiration_direction_aglova");

    disableField("chimney_exists");
  }

  // =========================================================
  // MASTER UPDATE
  // =========================================================
  function rebuildEverything() {
    var local = collectLocal();
    writeLocal(local);
    writeCanonical(local);
    buildSummary(local);
  }

  // =========================================================
  // LIVE UPDATE
  // =========================================================
  form.addEventListener("click", function () {
    setTimeout(rebuildEverything, 0);
  });

  form.addEventListener("input", function () {
    setTimeout(rebuildEverything, 0);
  });

  form.addEventListener("change", function () {
    setTimeout(rebuildEverything, 0);
  });

  // =========================================================
  // SUBMIT
  // =========================================================
  form.addEventListener("submit", function () {
    rebuildEverything();
    disableLocalJunk();
  });

  // initial
  rebuildEverything();
});
</script>
