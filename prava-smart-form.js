/* =========================================================
   VERDE-M SMART FORM
   PRAVA ENGINE
   VERSION: v1
   ========================================================= */



/* =========================================================
   CHAPTER 1
   PRAVA FLOW ENGINE
   CAPTURE SHIELD VERSION
   no alert / visible hint
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  console.log("PRAVA CH1 CAPTURE SHIELD START");

  const flow = document.querySelector(".sf-page-prava");
  if (!flow) return;

  const questions = Array.from(flow.querySelectorAll(".question-wrap-prava"));
  console.log("QUESTIONS FOUND:", questions.length);

  let state = {};
  let currentIndex = 0;

  function showQuestion(index) {
    questions.forEach(function (q, i) {
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

    e.preventDefault();
    e.stopPropagation();

    const question = currentQuestion();
    const field = fieldOf(question);

    console.log("CH1 NAV NEXT:", field, state[field]);

    if (field && !state[field]) {
      showHint(question);
      return;
    }

    if (currentIndex < questions.length - 1) {
      showQuestion(currentIndex + 1);
    } else {
      console.log("END OF QUESTIONS");
    }
  }, true);

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
   CHAPTER 6
   PRAVA FINAL GATE — FINAL BUTTON ONLY
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
    console.log("CHAPTER 6 FINAL GATE START");

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

      if (
        row.classList.contains("is-touched") ||
        row.getAttribute("data-touched") === "true"
      ) {
        return true;
      }

      return false;
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
      if (comboPhase) show(comboPhase, "block");
      if (dimensionsPhase) hide(dimensionsPhase);

      qsa(page, ".question-wrap-prava").forEach(function (q) {
        hide(q);
        q.classList.remove("active-question");
      });

      show(question, "block");
      question.classList.add("active-question");

      setTimeout(function () {
        showQuestionHint(question);
      }, 80);
    }

    function openDimensionsToRow(row) {
      if (comboPhase) hide(comboPhase);
      if (dimensionsPhase) show(dimensionsPhase, "block");

      setTimeout(function () {
        showDimensionHint(row);
      }, 80);
    }

    function openFinal() {
      qsa(page, ".combo-phase, .combo-phase-wrap, .dimensions-phase, .dimensions-phase-wrap, .extras-phase, .vision-phase, .extras-vision-phase").forEach(function (el) {
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

    qsa(page, '.phase-next-btn[data-next-phase="final-phase"]').forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        clearHints();

        const unanswered = findFirstUnansweredQuestion();

        if (unanswered) {
          openComboToQuestion(unanswered);
          return;
        }

        const emptyDim = findFirstEmptyVisibleDimension();

        if (emptyDim) {
          openDimensionsToRow(emptyDim);
          return;
        }

        openFinal();
      }, true);
    });
  });
})();














