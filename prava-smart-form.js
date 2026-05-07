/* =========================================================
   VERDE-M SMART FORM
   PRAVA ENGINE
   VERSION: v1
   ========================================================= */



/* =========================================================
   CHAPTER 1
   PRAVA FLOW ENGINE
   Question navigation / active states / reset
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("PRAVA ENGINE START");

  const flow = document.querySelector(".sf-page-prava");
  if (!flow) {
    console.log("NO .sf-page-prava FOUND");
    return;
  }

  const questions = Array.from(flow.querySelectorAll(".question-wrap-prava"));
  console.log("QUESTIONS FOUND:", questions.length);

  let state = {};
  let currentIndex = 0;

  function showQuestion(index) {
    questions.forEach((q, i) => {
      q.classList.toggle("active-question", i === index);
    });

    currentIndex = index;
    console.log("CURRENT QUESTION:", currentIndex + 1);
  }

  function currentQuestion() {
    return questions[currentIndex];
  }

  function fieldOf(question) {
    return question ? question.getAttribute("data-field") : null;
  }

  function clearActive(question) {
    if (!question) return;

    question.querySelectorAll(".option-pill").forEach(function (pill) {
      pill.classList.remove("active");
      pill.classList.remove("is-selected");
    });
  }

  function selectPill(pill) {
    const question = pill.closest(".question-wrap-prava");
    if (!question) return;

    const field = fieldOf(question);
    const value = pill.getAttribute("data-value");

    clearActive(question);

    pill.classList.add("active");
    pill.classList.add("is-selected");

    state[field] = value;

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

    e.preventDefault();

    const question = currentQuestion();
    const field = fieldOf(question);

    if (field && !state[field]) {
      alert("Избери опция");
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
      pill.classList.remove("active");
      pill.classList.remove("is-selected");
    });

    showQuestion(0);

    console.log("RESET PRAVA");
  });

  showQuestion(0);
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
   PRAVA PICKERS ENGINE — GITHUB SAFE
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
    if (!pravaPage) return console.log("CH4: no .sf-page-prava");

    const form = pravaPage.querySelector("form");
    if (!form) return console.log("CH4: no form");

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

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function parseIntSafe(v) {
      const n = parseInt(String(v || "").trim(), 10);
      return isNaN(n) ? 0 : n;
    }

    function getDisplayedValue(valueEl) {
      if (!valueEl) return 0;

      const nestedText =
        qs(valueEl, ".picker-value-text") ||
        qs(valueEl, ".w-richtext");

      return parseIntSafe(nestedText ? nestedText.textContent : valueEl.textContent);
    }

    function setDisplayedValue(valueEl, value) {
      if (!valueEl) return;

      const nestedText =
        qs(valueEl, ".picker-value-text") ||
        qs(valueEl, ".w-richtext");

      if (nestedText) nestedText.textContent = String(value);
      else valueEl.textContent = String(value);
    }

    function getRowValues(row) {
      return {
        meters: getDisplayedValue(qs(row, ".meters-control .picker-value")),
        centimeters: getDisplayedValue(qs(row, ".centimeters-control .picker-value"))
      };
    }

    function setRowValues(row, meters, centimeters) {
      setDisplayedValue(qs(row, ".meters-control .picker-value"), clamp(parseIntSafe(meters), 0, 99));
      setDisplayedValue(qs(row, ".centimeters-control .picker-value"), clamp(parseIntSafe(centimeters), 0, 95));
    }

    function setHidden(name, value) {
      const input = form.querySelector('[name="' + name + '"]');
      if (input) input.value = value || "";
    }

    function syncRow(row) {
      const dim = row.getAttribute("data-dim");
      if (!dim) return;

      const values = getRowValues(row);
      const formatted = values.meters + " м " + values.centimeters + " см";

      const localHidden =
        qs(row, '.hidden-dimension-input[data-dim="' + dim + '"]') ||
        qs(row, ".hidden-dimension-input") ||
        qs(form, '.hidden-dimension-input[data-dim="' + dim + '"]');

      if (localHidden) localHidden.value = formatted;

      const canonical = DIM_TO_HIDDEN[dim];
      if (canonical) setHidden(canonical, formatted);

      console.log("CH4 sync:", dim, formatted);
    }

    function normalizeAfterCmChange(meters, centimeters) {
      meters = parseIntSafe(meters);
      centimeters = parseIntSafe(centimeters);

      while (centimeters >= 100) {
        meters += 1;
        centimeters -= 100;
      }

      while (centimeters < 0) {
        if (meters > 0) {
          meters -= 1;
          centimeters += 100;
        } else {
          centimeters = 0;
          break;
        }
      }

      centimeters = Math.round(centimeters / 5) * 5;

      if (centimeters >= 100) {
        meters += 1;
        centimeters = 0;
      }

      if (centimeters > 95) {
        meters += 1;
        centimeters = 0;
      }

      return {
        meters: clamp(meters, 0, 99),
        centimeters: clamp(centimeters, 0, 95)
      };
    }

    function bindRow(row) {
      if (row.dataset.pickerBound === "true") return;
      row.dataset.pickerBound = "true";

      const metersBtns = qsa(row, ".meters-control .picker-btn");
      const cmBtns = qsa(row, ".centimeters-control .picker-btn");

      if (metersBtns[0]) {
        metersBtns[0].addEventListener("click", function (e) {
          e.preventDefault();
          const v = getRowValues(row);
          setRowValues(row, Math.max(0, v.meters - 1), v.centimeters);
          syncRow(row);
        });
      }

      if (metersBtns[metersBtns.length - 1]) {
        metersBtns[metersBtns.length - 1].addEventListener("click", function (e) {
          e.preventDefault();
          const v = getRowValues(row);
          setRowValues(row, v.meters + 1, v.centimeters);
          syncRow(row);
        });
      }

      if (cmBtns[0]) {
        cmBtns[0].addEventListener("click", function (e) {
          e.preventDefault();
          const v = getRowValues(row);
          const next = normalizeAfterCmChange(v.meters, v.centimeters - 5);
          setRowValues(row, next.meters, next.centimeters);
          syncRow(row);
        });
      }

      if (cmBtns[cmBtns.length - 1]) {
        cmBtns[cmBtns.length - 1].addEventListener("click", function (e) {
          e.preventDefault();
          const v = getRowValues(row);
          const next = normalizeAfterCmChange(v.meters, v.centimeters + 5);
          setRowValues(row, next.meters, next.centimeters);
          syncRow(row);
        });
      }

      syncRow(row);
    }

    const rows = qsa(form, ".dimension-row[data-dim]");
    console.log("CH4 rows:", rows.length);
    rows.forEach(bindRow);
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


