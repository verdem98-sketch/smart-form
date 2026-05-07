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







/* =========================================================
   PRAVA WARNINGS
   Required choice + required dimension
   ========================================================= */

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
  if (!row) return true;

  if (row.classList.contains("is-touched")) return true;
  if (row.getAttribute("data-touched") === "true") return true;

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


/* =========================================================
   PRAVA DIMENSION PICKERS
   Initial value stays 0
   Row becomes valid after first touch
   ========================================================= */

function markRowTouched(row) {
  if (!row) return;

  row.classList.add("is-touched");
  row.setAttribute("data-touched", "true");
}

qsa(flow, ".dimension-row").forEach(function (row) {
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
        var m = meterValue ? getTextNumber(meterValue) : 0;

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
        var m = meterValue ? getTextNumber(meterValue) : 0;

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







/* =========================================================
   PRAVA DIMENSIONS → FINAL PHASE BRIDGE
   Validates visible dimensions, then opens final phase
   ========================================================= */

function findFinalPhase() {
  return (
    qs(flow, ".final-phase-wrap") ||
    qs(flow, ".final-phase") ||
    qs(flow, ".prava-final-phase") ||
    qs(flow, ".step-final") ||
    qs(flow, '[data-phase="final"]')
  );
}

function isDimensionsPhaseVisible() {
  return dimensionsWrap && isVisible(dimensionsWrap);
}

function showFinalPhase() {
  var finalPhase = findFinalPhase();
  if (!finalPhase) {
    console.warn("PRAVA: Final phase not found.");
    return;
  }

  if (dimensionsWrap) {
    dimensionsWrap.style.display = "none";
  }

  finalPhase.style.display = "block";

  finalPhase.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

function validateDimensionsBeforeFinal() {
  var emptyDimension = findFirstEmptyVisibleDimension();

  if (emptyDimension) {
    shakeDimension(emptyDimension);
    return false;
  }

  return true;
}

/* бутонът, който излиза от размерите към final */
qsa(flow, ".dimensions-next-btn, .nav-next-final, .final-next-btn").forEach(function (btn) {
  btn.setAttribute("type", "button");

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    e.stopPropagation();

    hideAllHints();

    if (!isDimensionsPhaseVisible()) return;

    if (!validateDimensionsBeforeFinal()) return;

    showFinalPhase();
  });
});
