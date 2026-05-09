/* =========================================================
   VERDE-M SMART FORM
   PRAVA ENGINE
   VERSION: v1
   ========================================================= */




/* =========================================================
   CHAPTER 1
   PRAVA FLOW ENGINE
   DOM SYNC SAFE v2
   hard hide inactive questions
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("PRAVA CH1 DOM SYNC SAFE v2 START");

  const flow = document.querySelector(".sf-page-prava");
  if (!flow) return;

  const questions = Array.from(flow.querySelectorAll(".question-wrap-prava"));
  console.log("QUESTIONS FOUND:", questions.length);

  let state = {};
  let currentIndex = 0;

  function hardShow(el) {
    if (!el) return;
    el.style.setProperty("display", "block", "important");
    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("opacity", "1", "important");
  }

  function hardHide(el) {
    if (!el) return;
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("opacity", "0", "important");
  }

  function syncCurrentIndexFromDom() {
    const activeIndex = questions.findIndex(function (q) {
      return q.classList.contains("active-question");
    });

    if (activeIndex >= 0) currentIndex = activeIndex;
  }

  function showQuestion(index) {
    questions.forEach(function (q, i) {
      if (i === index) {
        q.classList.add("active-question");
        hardShow(q);
      } else {
        q.classList.remove("active-question");
        hardHide(q);
      }
    });

    currentIndex = index;
    console.log("CURRENT QUESTION:", currentIndex + 1);
  }

  function currentQuestion() {
    syncCurrentIndexFromDom();
    return questions[currentIndex];
  }

  function fieldOf(question) {
    return question ? question.getAttribute("data-field") : null;
  }

  function clearActive(question) {
    if (!question) return;

    question.querySelectorAll(".option-pill").forEach(function (pill) {
      pill.classList.remove("active", "is-selected");
    });
  }

  function showHint(question) {
    if (!question) return;

    let hint = question.querySelector(".question-hint");

    if (!hint) {
      hint = document.createElement("div");
      hint.className = "question-hint";
      hint.textContent = "Избери вариант, за да продължим.";
      question.appendChild(hint);
    }

    hint.classList.add("is-visible");
    hint.style.setProperty("display", "block", "important");
    hint.style.setProperty("visibility", "visible", "important");
    hint.style.setProperty("opacity", "1", "important");
    hint.style.setProperty("margin-top", "12px", "important");
    hint.style.setProperty("color", "#9a3b00", "important");
    hint.style.setProperty("font-size", "14px", "important");

    question.classList.remove("choice-warning");
    void question.offsetWidth;
    question.classList.add("choice-warning");

    setTimeout(function () {
      question.classList.remove("choice-warning");
    }, 350);

    question.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function hideHint(question) {
    if (!question) return;

    const hint = question.querySelector(".question-hint");

    if (hint) {
      hint.classList.remove("is-visible");
      hint.style.setProperty("display", "none", "important");
    }

    question.classList.remove("choice-warning");
  }

  function selectPill(pill) {
    const question = pill.closest(".question-wrap-prava");
    if (!question) return;

    const field = fieldOf(question);
    const value = pill.getAttribute("data-value");

    clearActive(question);

    pill.classList.add("active", "is-selected");

    state[field] = value;

    const realIndex = questions.indexOf(question);
    if (realIndex >= 0) currentIndex = realIndex;

    hideHint(question);

    console.log("STATE:", state);
  }

  flow.addEventListener("click", function (e) {
    const pill = e.target.closest(".option-pill");
    if (!pill) return;

    e.preventDefault();
    selectPill(pill);
  });

  flow.addEventListener("click", function (e) {
    const next = e.target.closest(".nav-next");
    if (!next) return;

    if (next.classList.contains("phase-next-btn")) return;
    if (next.hasAttribute("data-next-phase")) return;

    e.preventDefault();

    const question = currentQuestion();
    const field = fieldOf(question);

    console.log("CH1 QUESTION NEXT:", field, state[field]);

    if (field && !state[field]) {
      showHint(question);
      return;
    }

    if (currentIndex < questions.length - 1) {
      showQuestion(currentIndex + 1);
    } else {
      console.log("END OF QUESTIONS");
    }
  });

  flow.addEventListener("click", function (e) {
    const back = e.target.closest(".nav-back");
    if (!back) return;

    e.preventDefault();

    syncCurrentIndexFromDom();

    if (currentIndex > 0) {
      showQuestion(currentIndex - 1);
    }
  });

  flow.addEventListener("click", function (e) {
    const reset = e.target.closest('[data-action="reset-prava"]');
    if (!reset) return;

    e.preventDefault();

    state = {};

    flow.querySelectorAll(".option-pill").forEach(function (pill) {
      pill.classList.remove("active", "is-selected");
    });

    flow.querySelectorAll(".question-hint").forEach(function (hint) {
      hint.classList.remove("is-visible");
      hint.style.setProperty("display", "none", "important");
    });

    flow.querySelectorAll(".question-wrap-prava").forEach(function (q) {
      q.classList.remove("choice-warning");
    });

    showQuestion(0);

    console.log("RESET PRAVA");
  });

  showQuestion(0);
});



/* =========================================================
   CHAPTER 2
   PRAVA CAD ENGINE
   Clean version: no positioning, no wrapper hiding
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const page = document.querySelector(".sf-page-prava");
  if (!page) return;

  const baseLayer = page.querySelector(".cad-base");
  const kitchenLayer = page.querySelector(".cad-kitchen");
  const deepLayer = page.querySelector(".cad-deep_cabinets, .cad-deep-cabinets");
  const islandLayer = page.querySelector(".cad-island");

  const baseImgs = Array.from(page.querySelectorAll(".cad-base img"));
  const kitchenImgs = Array.from(page.querySelectorAll(".cad-kitchen img"));
  const deepImgs = Array.from(page.querySelectorAll(".cad-deep_cabinets img, .cad-deep-cabinets img"));
  const islandImgs = Array.from(page.querySelectorAll(".cad-island img"));

  function keepWrapperAlive(el) {
    if (!el) return;
    el.style.removeProperty("display");
  }

  function hideImgs(list) {
    list.forEach(function (img) {
      img.classList.remove("is-active");
      img.style.setProperty("display", "none", "important");
    });
  }

  function showImg(img) {
    if (!img) return;
    img.classList.add("is-active");
    img.style.setProperty("display", "block", "important");
  }

  function getValue(field) {
    const wrap = page.querySelector('.question-wrap-prava[data-field="' + field + '"]');
    const active = wrap
      ? wrap.querySelector(".option-pill.active, .option-pill.is-selected")
      : null;

    return active ? active.getAttribute("data-value") : "";
  }

  function fridgeIsBuilt(value) {
    const v = String(value || "").toLowerCase();

    return (
      v.includes("вграден") ||
      v === "built" ||
      v === "yes"
    );
  }

  function buildKitchenClass() {
    const water = getValue("water_position_prava");
    if (!water) return "";

    const oven = getValue("oven_tall_unit") === "yes";
    const built = fridgeIsBuilt(getValue("fridge_type"));

    if (oven && built) return "kitchen-" + water + "-oven-fridge-built";
    if (oven) return "kitchen-" + water + "-oven";
    if (built) return "kitchen-" + water + "-fridge-built";

    return "kitchen-" + water + "-base";
  }

  function findKitchenImg(kitchenClass) {
    return kitchenImgs.find(function (img) {
      return img.classList.contains(kitchenClass);
    });
  }

  function renderPravaCad() {
    const kitchenClass = buildKitchenClass();

    keepWrapperAlive(baseLayer);
    keepWrapperAlive(kitchenLayer);
    keepWrapperAlive(deepLayer);
    keepWrapperAlive(islandLayer);

    hideImgs(baseImgs);
    hideImgs(kitchenImgs);
    hideImgs(deepImgs);
    hideImgs(islandImgs);

    if (!kitchenClass) {
      showImg(baseImgs[0]);
    } else {
      const img = findKitchenImg(kitchenClass);

      if (img) {
        showImg(img);
      } else {
        showImg(baseImgs[0]);
        console.warn("NO KITCHEN IMAGE CLASS:", kitchenClass);
      }
    }

    const deep = getValue("deep_cabinets") || getValue("deep-cabinets");

    if (deep === "yes") {
      showImg(deepImgs[0]);
    }

    const island = getValue("island");

    if (island === "yes") {
      showImg(islandImgs[0]);
    }

    console.log("PRAVA CAD CLASS:", kitchenClass || "base");
  }

  page.addEventListener("click", function (e) {
    if (
      e.target.closest(".option-pill") ||
      e.target.closest(".nav-next") ||
      e.target.closest(".nav-back") ||
      e.target.closest('[data-action="reset-prava"]')
    ) {
      setTimeout(renderPravaCad, 30);
    }
  });

  renderPravaCad();
});









/* =========================================================
   CHAPTER 3
   OPEN DIMENSIONS PHASE
   After last combo question
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const page = document.querySelector(".sf-page-prava");
  if (!page) return;

  const questionsWrap =
    page.querySelector(".combo-phase") ||
    page.querySelector(".combo-phase-wrap") ||
    page;

  const dimensionsPhase =
    page.querySelector(".dimensions-phase") ||
    page.querySelector(".dimensions-phase-wrap");

  if (!questionsWrap || !dimensionsPhase) return;

  const questions = Array.from(
    page.querySelectorAll(".question-wrap-prava")
  );

  if (!questions.length) return;

  const lastQuestion = questions[questions.length - 1];

  function show(el, displayType) {
    if (!el) return;

    el.style.setProperty(
      "display",
      displayType || "block",
      "important"
    );

    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("opacity", "1", "important");
  }

  function hide(el) {
    if (!el) return;

    el.style.setProperty("display", "none", "important");
    el.style.setProperty("visibility", "hidden", "important");
    el.style.setProperty("opacity", "0", "important");
  }

  function hasAnswer(question) {
    if (!question) return true;

    return !!question.querySelector(
      ".option-pill.active, .option-pill.is-selected"
    );
  }

  function warn(question) {
    if (!question) return;

    question.classList.remove("choice-warning");

    void question.offsetWidth;

    question.classList.add("choice-warning");

    let hint = question.querySelector(".question-hint");

    if (!hint) {
      hint = document.createElement("div");

      hint.className = "question-hint";
      hint.textContent = "Избери вариант, за да продължим.";

      question.appendChild(hint);
    }

    hint.classList.add("is-visible");

    setTimeout(function () {
      question.classList.remove("choice-warning");
    }, 350);
  }

  function openDimensions() {
    questions.forEach(function (q) {
      hide(q);
      q.classList.remove("active-question");
    });

    hide(questionsWrap);

    show(dimensionsPhase, "block");

    setTimeout(function () {
      dimensionsPhase.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);
  }

  page.addEventListener(
    "click",
    function (e) {
      const next = e.target.closest(".nav-next");

      if (!next) return;
      if (!lastQuestion.contains(next)) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (!hasAnswer(lastQuestion)) {
        warn(lastQuestion);
        return;
      }

      openDimensions();
    },
    true
  );
hide(dimensionsPhase);
});





/* =========================================================
   CHAPTER 4
   PRAVA PICKERS ENGINE — TOUCH SAFE
   meters + centimeters
   ========================================================= */

(function () {

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {

    console.log("CHAPTER 4 PICKERS START");

    const pravaPage = document.querySelector(".sf-page-prava");
    if (!pravaPage) return;

    const form = pravaPage.querySelector("form");
    if (!form) return;

    const DIM_TO_HIDDEN = {
      "len_prava_3": "wall_1",
      "height_prava_3": "room_height",
      "island_len_3a": "island_len",
      "island_width_3a": "island_width"
    };

    function qs(scope, sel) {
      return (scope || document).querySelector(sel);
    }

    function qsa(scope, sel) {
      return Array.from((scope || document).querySelectorAll(sel));
    }

    function parseIntSafe(v) {
      const n = parseInt(String(v || "").trim(), 10);
      return isNaN(n) ? 0 : n;
    }

    function getDisplayedValue(valueEl) {
      if (!valueEl) return 0;

      return parseIntSafe(valueEl.textContent);
    }

    function setDisplayedValue(valueEl, value) {
      if (!valueEl) return;
      valueEl.textContent = String(value);
    }

    function getRowValues(row) {
      return {
        meters: getDisplayedValue(
          qs(row, ".meters-control .picker-value")
        ),
        centimeters: getDisplayedValue(
          qs(row, ".centimeters-control .picker-value")
        )
      };
    }

    function setRowValues(row, meters, centimeters) {
      setDisplayedValue(
        qs(row, ".meters-control .picker-value"),
        meters
      );

      setDisplayedValue(
        qs(row, ".centimeters-control .picker-value"),
        centimeters
      );
    }

    function markTouched(row) {
      if (!row) return;

      row.classList.add("is-touched");
      row.setAttribute("data-touched", "true");
    }

    function setHidden(name, value) {
      const input = form.querySelector('[name="' + name + '"]');

      if (input) {
        input.value = value || "";
      }
    }

    function syncRow(row) {
      const dim = row.getAttribute("data-dim");
      if (!dim) return;

      const values = getRowValues(row);

      const formatted =
        values.meters + " м " +
        values.centimeters + " см";

      const canonical = DIM_TO_HIDDEN[dim];

      if (canonical) {
        setHidden(canonical, formatted);
      }

      console.log("CH4 sync:", dim, formatted);
    }

    function bindRow(row) {

      if (row.dataset.pickerBound === "true") return;

      row.dataset.pickerBound = "true";

      const metersBtns = qsa(
        row,
        ".meters-control .picker-btn"
      );

      const cmBtns = qsa(
        row,
        ".centimeters-control .picker-btn"
      );

      if (metersBtns[0]) {
        metersBtns[0].addEventListener("click", function (e) {

          e.preventDefault();
          markTouched(row);

          const v = getRowValues(row);

          setRowValues(
            row,
            Math.max(0, v.meters - 1),
            v.centimeters
          );

          syncRow(row);
        });
      }

      if (metersBtns[1]) {
        metersBtns[1].addEventListener("click", function (e) {

          e.preventDefault();
          markTouched(row);

          const v = getRowValues(row);

          setRowValues(
            row,
            v.meters + 1,
            v.centimeters
          );

          syncRow(row);
        });
      }

      if (cmBtns[0]) {
        cmBtns[0].addEventListener("click", function (e) {

          e.preventDefault();
          markTouched(row);

          const v = getRowValues(row);

          let cm = v.centimeters - 5;
          let m = v.meters;

          if (cm < 0) {
            if (m > 0) {
              m -= 1;
              cm = 95;
            } else {
              cm = 0;
            }
          }

          setRowValues(row, m, cm);

          syncRow(row);
        });
      }

      if (cmBtns[1]) {
        cmBtns[1].addEventListener("click", function (e) {

          e.preventDefault();
          markTouched(row);

          const v = getRowValues(row);

          let cm = v.centimeters + 5;
          let m = v.meters;

          if (cm > 95) {
            cm = 0;
            m += 1;
          }

          setRowValues(row, m, cm);

          syncRow(row);
        });
      }

      syncRow(row);
    }

    qsa(form, ".dimension-row[data-dim]").forEach(bindRow);

  });

})();



/* =========================================================
   CHAPTER 5
   PRAVA ISLAND DIMENSIONS VISIBILITY — GITHUB SAFE
   ========================================================= */

(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    console.log("CHAPTER 5 ISLAND DIMENSIONS START");

    const page = document.querySelector(".sf-page-prava");
    if (!page) return console.log("CH5: no .sf-page-prava");

    const dimensionsWrap =
      page.querySelector(".dimensions-phase") ||
      page.querySelector(".dimensions-phase-wrap");

    if (!dimensionsWrap) return console.log("CH5: no dimensions wrap");

    function show(el) {
      if (!el) return;
      el.style.setProperty("display", "block", "important");
      el.style.setProperty("visibility", "visible", "important");
      el.style.setProperty("opacity", "1", "important");
    }

    function hide(el) {
      if (!el) return;
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("opacity", "0", "important");
    }

    function getIslandValue() {
      const wrap = page.querySelector('.question-wrap-prava[data-field="island"]');
      const active = wrap
        ? wrap.querySelector(".option-pill.active, .option-pill.is-selected")
        : null;

      return active ? String(active.getAttribute("data-value") || "").trim() : "";
    }

    function getIslandGroup() {
      const islandLenRow = dimensionsWrap.querySelector('.dimension-row[data-dim="island_len_3a"]');
      const islandWidthRow = dimensionsWrap.querySelector('.dimension-row[data-dim="island_width_3a"]');

      return (
        dimensionsWrap.querySelector('.dimensions-group[data-owner="island"]') ||
        dimensionsWrap.querySelector('[data-owner="island"]') ||
        dimensionsWrap.querySelector(".dimensions-group-island") ||
        (islandLenRow ? islandLenRow.closest(".dimensions-group") : null) ||
        (islandWidthRow ? islandWidthRow.closest(".dimensions-group") : null)
      );
    }

    function renderIslandDimensions() {
      const islandGroup = getIslandGroup();
      if (!islandGroup) return console.log("CH5: no island group");

      if (getIslandValue() === "yes") {
        show(islandGroup);
        console.log("CH5: island dimensions shown");
      } else {
        hide(islandGroup);
        console.log("CH5: island dimensions hidden");
      }
    }

    page.addEventListener("click", function (e) {
      if (
        e.target.closest('.question-wrap-prava[data-field="island"] .option-pill') ||
        e.target.closest(".nav-next") ||
        e.target.closest(".nav-back")
      ) {
        setTimeout(renderIslandDimensions, 60);
      }
    });

    renderIslandDimensions();
  });
})();

/* =========================================================
   CHAPTER 7
   PRAVA VISION CARDS — HARD OVERRIDE
   toggle on/off fixed
   ========================================================= */

console.log("CHAPTER 7 PRAVA VISION HARD OVERRIDE START");

(function () {
  "use strict";

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function clean(v) {
    return String(v || "").trim();
  }

  function valFrom(el) {
    if (!el) return "";
    var label = el.querySelector(".vision-card-label");
    return clean(el.getAttribute("data-value") || (label && label.textContent) || el.textContent);
  }

  function setAll(name, value) {
    if (!name) return;

    document
      .querySelectorAll('input[name="' + name + '"], textarea[name="' + name + '"]')
      .forEach(function (el) {
        el.value = clean(value);
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.querySelector(".sf-page-prava");
    if (!page) return;

    qsa(page, ".vision-cards-row").forEach(function (row) {
      var cards = qsa(row, ".vision-card");

      cards.forEach(function (card) {
        card.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          var wasActive = card.classList.contains("vm-selected");

          cards.forEach(function (c) {
            c.classList.remove("vm-selected", "is-selected", "active");
            c.querySelectorAll(".vm-check").forEach(function (x) {
              x.remove();
            });
          });

          var wrap = card.closest("[data-field]");
          var field = wrap ? wrap.getAttribute("data-field") : "";

          if (wasActive) {
            setAll(field, "");
            console.log("CH7 PRAVA unselected:", field);
            return;
          }

          card.classList.add("vm-selected", "is-selected", "active");
          card.insertAdjacentHTML("beforeend", '<div class="vm-check">✓</div>');

          setAll(field, valFrom(card));

          console.log("CH7 PRAVA selected:", field, valFrom(card));
        }, true);
      });
    });
  });
})();





/* =========================================================
   CHAPTER 8
   PRAVA BOOKING CALENDAR
   ========================================================= */
console.log("🔥 CH8 PRAVA BOOKING LOADED");
document.addEventListener("DOMContentLoaded", function () {
  var flow = document.querySelector(".sf-page-prava");
  if (!flow) return;

  var form = flow.querySelector("form");
  if (!form) return;

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function show(el) {
    if (el) el.style.display = "";
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  function normalize(value) {
    return String(value || "").trim();
  }

  function lower(value) {
    return normalize(value).toLowerCase();
  }

  function isVisible(el) {
    if (!el) return false;
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

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
    var input = qs(flow, '[name="' + name + '"]') || qs(document, '[name="' + name + '"]');
    if (input) input.value = value || "";
  }

  var DAYS_TO_SHOW = 7;
  var START_OFFSET = 2;
  var SLOTS = ["10:00–12:00", "14:00–16:00"];
  var STORAGE_KEY = "smartFormSelectedSlotState_prava";

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
        if (
          !el.classList.contains("active") &&
          !el.classList.contains("is-booked") &&
          !el.classList.contains("is-pending")
        ) {
          el.classList.add("is-local-locked");
        }
      });
    }

    function clearActiveSlots() {
      qsa(flow, ".booking-slot").forEach(function (el) {
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

      var slotEl = qs(
        phase,
        '.booking-slot[data-date="' + saved.date + '"][data-slot="' + saved.slot + '"]'
      );

      if (!slotEl) return;

      if (
        slotEl.classList.contains("is-booked") ||
        slotEl.classList.contains("is-pending")
      ) {
        return;
      }

      setSelectedSlot(slotEl, saved.date, saved.slot, false);

      if (saved.submitted) {
        lockCalendarUI();
      }
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


/* =========================================================
   CHAPTER 9
   PRAVA INSPIRATION CARD SELECT
   green check + hidden input sync
   ========================================================= */

(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    console.log("CHAPTER 9 PRAVA INSPIRATION START");

    var page = document.querySelector(".sf-page-prava");
    if (!page) return;

    function qs(scope, sel) {
      return (scope || document).querySelector(sel);
    }

    function qsa(scope, sel) {
      return Array.from((scope || document).querySelectorAll(sel));
    }

    function setHidden(name, value) {
      var input = qs(page, '[name="' + name + '"]') || qs(document, '[name="' + name + '"]');

      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;

        var form = qs(page, "form");
        if (form) form.appendChild(input);
      }

      if (input) input.value = value || "";
    }

    function getCardValue(card) {
      return (
        card.getAttribute("data-value") ||
        card.getAttribute("data-inspiration") ||
        card.getAttribute("aria-label") ||
        card.textContent ||
        ""
      ).trim();
    }

    function ensureCheck(card) {
      var check = qs(card, ".inspiration-check");

      if (!check) {
        check = document.createElement("div");
        check.className = "inspiration-check";
        check.textContent = "✓";
        card.appendChild(check);
      }

      return check;
    }

    var cards = qsa(page, ".inspiration-card, [data-field='inspiration_card_prava'] .vision-card, [data-field='inspiration_card_prava'] [data-value]");

    if (!cards.length) {
      console.log("CH9 inspiration cards found: 0");
      return;
    }

    console.log("CH9 inspiration cards found:", cards.length);

    cards.forEach(function (card) {
      ensureCheck(card);

      card.addEventListener("click", function (e) {
        e.preventDefault();

        var alreadySelected =
          card.classList.contains("vm-selected") ||
          card.classList.contains("is-selected") ||
          card.classList.contains("active");

        cards.forEach(function (item) {
          item.classList.remove("vm-selected", "is-selected", "active");
        });

        if (alreadySelected) {
          setHidden("inspiration_card_prava", "");
          setHidden("inspiration_card", "");
          return;
        }

        card.classList.add("vm-selected", "is-selected", "active");

        var value = getCardValue(card);

        setHidden("inspiration_card_prava", value);
        setHidden("inspiration_card", value);

        console.log("CH9 inspiration selected:", value);
      });
    });
  });
})();


/* =========================================================
   CHAPTER 10
   PRAVA PLAN SELECT
   active state + hidden input sync
   ========================================================= */

(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    console.log("CHAPTER 10 PRAVA PLAN START");

    var page = document.querySelector(".sf-page-prava");
    if (!page) return;

    function qs(scope, sel) {
      return (scope || document).querySelector(sel);
    }

    function qsa(scope, sel) {
      return Array.from((scope || document).querySelectorAll(sel));
    }

    function setHidden(name, value) {
      var input = qs(page, '[name="' + name + '"]') || qs(document, '[name="' + name + '"]');

      if (!input) {
        input = document.createElement("input");
        input.type = "hidden";
        input.name = name;

        var form = qs(page, "form");
        if (form) form.appendChild(input);
      }

      input.value = value || "";
    }

    function getValue(btn) {
      return (
        btn.getAttribute("data-value") ||
        btn.textContent ||
        ""
      ).trim();
    }

    var wrap = qs(page, ".plan-wrap");
    if (!wrap) {
      console.log("CH10 plan wrap not found");
      return;
    }

    var buttons = qsa(wrap, ".option-pill");

    console.log("CH10 plan buttons found:", buttons.length);

    buttons.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();

        var alreadySelected =
          btn.classList.contains("active") ||
          btn.classList.contains("is-selected") ||
          btn.classList.contains("vm-selected");

        buttons.forEach(function (item) {
          item.classList.remove("active", "is-selected", "vm-selected");
        });

        if (alreadySelected) {
          setHidden("plan_prava_3", "");
          setHidden("plan", "");
          console.log("CH10 plan cleared");
          return;
        }

        btn.classList.add("active", "is-selected", "vm-selected");

        var value = getValue(btn);

        setHidden("plan_prava_3", value);
        setHidden("plan", value);

        console.log("CH10 plan selected:", value);
      });
    });
  });
})();


/* =========================================================
   CHAPTER 11
   PRAVA SUCCESS RENDER v2
   CAD + texts + checkboxes + inspiration
   ========================================================= */

(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    console.log("CHAPTER 11 PRAVA SUCCESS RENDER v2 START");

    var page = document.querySelector(".sf-page-prava");
    if (!page) return;

    var form = page.querySelector("form");
    if (!form) return;

    var formBlock = form.closest(".w-form") || page;

    function qs(scope, sel) {
      return (scope || document).querySelector(sel);
    }

    function qsa(scope, sel) {
      return Array.from((scope || document).querySelectorAll(sel));
    }

    function clean(v) {
      return String(v || "").trim();
    }

    function lower(v) {
      return clean(v).toLowerCase();
    }

    function translate(v) {
      var x = lower(v);

      if (!x) return "";
      if (x === "yes" || x === "true" || x === "да") return "Да";
      if (x === "no" || x === "false" || x === "не") return "Не";

      if (x === "left") return "Отляво";
      if (x === "right") return "Отдясно";
      if (x === "center") return "По средата";

      if (x === "built" || x === "built-in" || x === "builtin") return "Вграден";
      if (x === "freestanding") return "Свободностоящ";

      return clean(v);
    }

    function getInput(name) {
      return (
        form.querySelector('[name="' + name + '"]') ||
        page.querySelector('[name="' + name + '"]') ||
        document.querySelector('[name="' + name + '"]')
      );
    }

    function getValue(name) {
      var el = getInput(name);
      return clean(el && el.value);
    }

    function checkboxValue(name) {
      var boxes = qsa(page, '[name="' + name + '"], [data-field="' + name + '"] input[type="checkbox"], [data-checkbox-field="' + name + '"]');

      for (var i = 0; i < boxes.length; i++) {
        if (boxes[i].checked) return "Да";
      }

      var hidden = getValue(name);
      if (hidden) return translate(hidden);

      return "—";
    }

    function setText(key, value) {
      qsa(formBlock, '[data-success="' + key + '"]').forEach(function (el) {
        el.textContent = clean(value) || "—";
      });
    }

    function setMany(keys, value) {
      keys.forEach(function (key) {
        setText(key, value);
      });
    }

    function getSelectedText(fieldName) {
      var wrap = qs(page, '[data-field="' + fieldName + '"]');
      if (!wrap) return "";

      var selected =
        qs(wrap, ".option-pill.active") ||
        qs(wrap, ".option-pill.is-selected") ||
        qs(wrap, ".option-pill.vm-selected") ||
        qs(wrap, ".vision-card.active") ||
        qs(wrap, ".vision-card.is-selected") ||
        qs(wrap, ".vision-card.vm-selected") ||
        qs(wrap, ".inspiration-card.active") ||
        qs(wrap, ".inspiration-card.is-selected") ||
        qs(wrap, ".inspiration-card.vm-selected");

      return selected ? clean(selected.getAttribute("data-value") || selected.textContent) : "";
    }

    function valueOrSelected(name, fieldName) {
      return getValue(name) || getSelectedText(fieldName || name);
    }

    function dim(name) {
      return getValue(name) || "—";
    }

    function combined(a, b) {
      var av = getValue(a);
      var bv = getValue(b);

      if (!av && !bv) return "";
      if (av && bv) return av + " × " + bv;
      return av || bv;
    }

    function meetingCombined() {
      var date = getValue("meeting_date");
      var slot = getValue("meeting_slot");
      var custom = getValue("custom_date");

      if (custom) return custom;
      if (date && slot) return date + " / " + slot;
      return date || slot || "";
    }

    function isActuallyVisible(el) {
      if (!el) return false;

      var style = window.getComputedStyle(el);

      if (style.display === "none") return false;
      if (style.visibility === "hidden") return false;
      if (style.opacity === "0") return false;

      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    function getVisibleImageSrc(selector) {
      var imgs = qsa(page, selector);

      for (var i = 0; i < imgs.length; i++) {
        if (isActuallyVisible(imgs[i])) {
          return imgs[i].currentSrc || imgs[i].src || "";
        }
      }

      return "";
    }

    function addLayer(target, src, className) {
      if (!src) return;

      var img = document.createElement("img");
      img.className = className || "success-cad-layer";
      img.src = src;
      img.alt = "";

      target.appendChild(img);
    }

    function renderCadPreview() {
      var target = qs(formBlock, ".success-cad-preview");
      if (!target) return;

      target.innerHTML = "";

      var stage = document.createElement("div");
      stage.className = "success-cad-stage";

      var kitchenSrc =
        getVisibleImageSrc(".cad-stage .cad-img-kitchen") ||
        getVisibleImageSrc(".cad-kitchen .cad-img") ||
        getVisibleImageSrc(".cad-kitchen img");

      var islandChosen = translate(valueOrSelected("island", "island")) === "Да";

      var islandSrc =
        getVisibleImageSrc(".cad-stage .cad-img-island") ||
        getVisibleImageSrc(".cad-prava-island img") ||
        getVisibleImageSrc(".cad-island img");

      addLayer(stage, kitchenSrc, "success-cad-layer success-cad-kitchen");

      if (islandChosen) {
        addLayer(stage, islandSrc, "success-cad-layer success-cad-island");
      }

      target.appendChild(stage);

      console.log("CH11 CAD SRC:", kitchenSrc);
      console.log("CH11 ISLAND SRC:", islandSrc);
    }

    function selectedImgInField(fieldName, cardSelector) {
      var wrap = qs(page, '[data-field="' + fieldName + '"]');
      if (!wrap) return "";

      var selector = cardSelector || ".vision-card";

      var card =
        qs(wrap, selector + ".vm-selected") ||
        qs(wrap, selector + ".is-selected") ||
        qs(wrap, selector + ".active");

      if (!card) return "";

      var img = qs(card, "img");
      return img ? (img.currentSrc || img.src || "") : "";
    }

    function setSuccessImage(key, src) {
      qsa(formBlock, '[data-success-img="' + key + '"]').forEach(function (img) {
        if (!src) {
          img.removeAttribute("src");
          img.removeAttribute("srcset");
          img.removeAttribute("sizes");
          img.style.setProperty("display", "none", "important");
          img.style.setProperty("visibility", "hidden", "important");
          return;
        }

        img.src = src;
        img.removeAttribute("srcset");
        img.removeAttribute("sizes");
        img.style.setProperty("display", "block", "important");
        img.style.setProperty("visibility", "visible", "important");
      });
    }

    function fillTexts() {
      setMany(
        ["water_position_prava", "water_position_aglova"],
        translate(valueOrSelected("water_position_prava", "water_position_prava"))
      );

      setMany(
        ["oven_tall_unit", "oven_tall_unit_aglova"],
        translate(valueOrSelected("oven_tall_unit", "oven_tall_unit"))
      );

      setMany(
        ["fridge_type", "fridge_type_aglova"],
        translate(valueOrSelected("fridge_type", "fridge_type"))
      );

      setMany(
        ["deep_cabinets"],
        translate(valueOrSelected("deep_cabinets", "deep_cabinets"))
      );

      setMany(
        ["island", "bar_enabled_aglova"],
        translate(valueOrSelected("island", "island"))
      );

      setMany(["len_prava_3", "wall_1", "stena1_len_aglova"], dim("len_prava_3") !== "—" ? dim("len_prava_3") : dim("wall_1"));
      setMany(["height_prava_3", "room_height", "visochina_aglova"], dim("height_prava_3") !== "—" ? dim("height_prava_3") : dim("room_height"));

      setMany(["island_len_3a"], dim("island_len_3a"));
      setMany(["island_width_3a"], dim("island_width_3a"));
      setText("island_combined", combined("island_len_3a", "island_width_3a"));

      setText("bar_combined", "—");
      setText("chimney_exists", "—");
      setText("chimney_a_aglova", "—");
      setText("chimney_b_aglova", "—");
      setText("stena2_len_aglova", "—");

      setText("upper_finish", getValue("upper_finish") || getSelectedText("upper_finish"));
      setText("lower_finish", getValue("lower_finish") || getSelectedText("lower_finish"));
      setText("countertop_finish", getValue("countertop_finish") || getSelectedText("countertop_finish"));
      setText("backsplash_finish", getValue("backsplash_finish") || getSelectedText("backsplash_finish"));

      [
        "dishwasher",
        "washing_machine",
        "microwave",
        "coffee_machine",
        "glass_display",
        "deep_cabinets",
        "more_drawers",
        "lift_mechanisms",
        "counter_lighting",
        "bottle_rack"
      ].forEach(function (name) {
        setText(name, checkboxValue(name));
      });

      setMany(
        ["inspiration_card_prava", "inspiration_card_aglova", "inspiration_card"],
        getValue("inspiration_card_prava") || getValue("inspiration_card") || getSelectedText("inspiration_card_prava")
      );

      setMany(
        ["plan_prava_3", "plan_aglova", "plan"],
        getValue("plan_prava_3") || getValue("plan") || getSelectedText("plan_prava_3")
      );

      setText("custom_date", getValue("custom_date"));
      setText("meeting_combined", meetingCombined());
    }

    function fillImages() {
      setSuccessImage("upper_finish", selectedImgInField("upper_finish", ".vision-card"));
      setSuccessImage("lower_finish", selectedImgInField("lower_finish", ".vision-card"));
      setSuccessImage("countertop_finish", selectedImgInField("countertop_finish", ".vision-card"));
      setSuccessImage("backsplash_finish", selectedImgInField("backsplash_finish", ".vision-card"));

      var inspirationSrc =
        selectedImgInField("inspiration_card_prava", ".inspiration-card") ||
        selectedImgInField("inspiration_card_prava", ".vision-card") ||
        selectedImgInField("inspiration_card", ".inspiration-card") ||
        selectedImgInField("inspiration", ".inspiration-card");

      setSuccessImage("inspiration_card_prava", inspirationSrc);
      setSuccessImage("inspiration_card_aglova", inspirationSrc);
      setSuccessImage("inspiration_card", inspirationSrc);

      console.log("CH11 INSPIRATION SRC:", inspirationSrc);
    }

    function renderSuccess() {
      fillTexts();
      renderCadPreview();
      fillImages();

      console.log("CH11 PRAVA SUCCESS RENDERED v2");
    }

    form.addEventListener("submit", function () {
      setTimeout(renderSuccess, 400);
      setTimeout(renderSuccess, 1000);
      setTimeout(renderSuccess, 1800);
      setTimeout(renderSuccess, 2600);
    });
  });
})();



/* =========================================================
   CHAPTER 6
   PRAVA FINAL GATE — CLEAN QUESTION RESTORE
   final button only
   ========================================================= */

(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  ready(function () {
    console.log("CHAPTER 6 FINAL GATE CLEAN RESTORE START");

    const page = document.querySelector(".sf-page-prava");
    if (!page) return;

    const finalPhase = page.querySelector(".final-phase");
    const comboPhase = page.querySelector(".combo-phase, .combo-phase-wrap");
    const dimensionsPhase = page.querySelector(".dimensions-phase, .dimensions-phase-wrap");

    function qs(scope, sel) {
      return (scope || document).querySelector(sel);
    }

    function qsa(scope, sel) {
      return Array.from((scope || document).querySelectorAll(sel));
    }

    function isVisible(el) {
      if (!el) return false;
      return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    function show(el, displayType) {
      if (!el) return;
      el.style.setProperty("display", displayType || "block", "important");
      el.style.setProperty("visibility", "visible", "important");
      el.style.setProperty("opacity", "1", "important");
    }

    function hide(el) {
      if (!el) return;
      el.style.setProperty("display", "none", "important");
      el.style.setProperty("visibility", "hidden", "important");
      el.style.setProperty("opacity", "0", "important");
    }

    if (finalPhase) hide(finalPhase);

    function clearHints() {
      qsa(page, ".question-hint, .dimension-hint").forEach(function (hint) {
        hint.classList.remove("is-visible");
        hint.style.setProperty("display", "none", "important");
      });
    }

    function showQuestionHint(question) {
      if (!question) return;

      let hint = qs(question, ".question-hint");

      if (!hint) {
        hint = document.createElement("div");
        hint.className = "question-hint";
        hint.textContent = "Избери вариант, за да продължим.";
        question.appendChild(hint);
      }

      hint.classList.add("is-visible");
      hint.style.setProperty("display", "block", "important");
      hint.style.setProperty("visibility", "visible", "important");
      hint.style.setProperty("opacity", "1", "important");
      hint.style.setProperty("margin-top", "12px", "important");
      hint.style.setProperty("color", "#9a3b00", "important");
      hint.style.setProperty("font-size", "14px", "important");

      question.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    function showDimensionHint(row) {
      if (!row) return;

      let hint = qs(row, ".dimension-hint");

      if (!hint) {
        hint = document.createElement("div");
        hint.className = "dimension-hint";
        hint.textContent = "Попълни размера, за да продължим.";
        row.appendChild(hint);
      }

      hint.classList.add("is-visible");
      hint.style.setProperty("display", "block", "important");
      hint.style.setProperty("visibility", "visible", "important");
      hint.style.setProperty("opacity", "1", "important");
      hint.style.setProperty("margin-top", "10px", "important");
      hint.style.setProperty("color", "#9a3b00", "important");
      hint.style.setProperty("font-size", "14px", "important");

      row.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    function hasAnsweredQuestion(question) {
      return !!qs(question, ".option-pill.active, .option-pill.is-selected, .option-pill.vm-selected");
    }

    function findFirstUnansweredQuestion() {
      const questions = qsa(page, ".question-wrap-prava");

      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        if (!qsa(question, ".option-pill").length) continue;

        if (!hasAnsweredQuestion(question)) {
          return question;
        }
      }

      return null;
    }

    function markRowTouched(row) {
      if (!row) return;
      row.classList.add("is-touched");
      row.setAttribute("data-touched", "true");
    }

    page.addEventListener("click", function (e) {
      const btn = e.target.closest(".dimension-row .picker-btn");
      if (!btn) return;

      markRowTouched(btn.closest(".dimension-row"));
    }, true);

    function rowHasValue(row) {
      if (!row) return false;

      return (
        row.classList.contains("is-touched") ||
        row.getAttribute("data-touched") === "true"
      );
    }

    function findFirstEmptyVisibleDimension() {
      const rows = qsa(
        page,
        ".dimensions-phase .dimension-row, .dimensions-phase-wrap .dimension-row"
      );

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        if (!isVisible(row)) continue;

        const group = row.closest(".dimensions-group, [data-owner]");
        if (group && !isVisible(group)) continue;

        if (!rowHasValue(row)) return row;
      }

      return null;
    }

    function openComboToQuestion(question) {
      if (!question) return;

      if (finalPhase) hide(finalPhase);
      if (dimensionsPhase) hide(dimensionsPhase);
      if (comboPhase) show(comboPhase, "block");

      qsa(page, ".question-wrap-prava").forEach(function (q) {
        q.classList.remove("active-question");
        hide(q);
      });

      show(question, "block");
      question.classList.add("active-question");

      console.log("CH6 RESTORE QUESTION:", question.getAttribute("data-field"));

      setTimeout(function () {
        showQuestionHint(question);
      }, 80);
    }

    function openDimensionsToRow(row) {
      if (finalPhase) hide(finalPhase);
      if (comboPhase) hide(comboPhase);
      if (dimensionsPhase) show(dimensionsPhase, "block");

      setTimeout(function () {
        showDimensionHint(row);
      }, 80);
    }

    function openFinal() {
      qsa(
        page,
        ".combo-phase, .combo-phase-wrap, .dimensions-phase, .dimensions-phase-wrap, .extras-phase, .vision-phase, .extras-vision-phase"
      ).forEach(function (el) {
        hide(el);
      });

      qsa(page, ".prava-left, .sticky-cad-wrap, .cad-stage").forEach(function (el) {
        hide(el);
      });

      show(finalPhase, "block");

      setTimeout(function () {
        finalPhase.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 80);

      window.dispatchEvent(new Event("resize"));
    }

    const finalBtns = qsa(page, ".phase-next-btn").filter(function (btn) {
      return btn.getAttribute("data-next-phase") === "final-phase";
    });

    console.log("CH6 FINAL BUTTONS FOUND:", finalBtns.length);

    finalBtns.forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        console.log("CH6 FINAL CLICK");

        clearHints();

        const unanswered = findFirstUnansweredQuestion();

        if (unanswered) {
          console.log("CH6 BLOCKED QUESTION:", unanswered.getAttribute("data-field"));
          openComboToQuestion(unanswered);
          return;
        }

        const emptyDim = findFirstEmptyVisibleDimension();

        if (emptyDim) {
          console.log("CH6 BLOCKED DIM:", emptyDim.getAttribute("data-dim"));
          openDimensionsToRow(emptyDim);
          return;
        }

        console.log("CH6 OPEN FINAL");
        openFinal();
      }, true);
    });
  });
})();




















