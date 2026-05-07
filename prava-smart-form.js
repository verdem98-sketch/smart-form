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
   Dynamic kitchen rendering / overlays
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {
  const page = document.querySelector(".sf-page-prava");
  if (!page) return;

  const baseLayer = page.querySelector(".cad-base");
  const kitchenLayer = page.querySelector(".cad-kitchen");
  const deepLayer = page.querySelector(".cad-deep_cabinets, .cad-deep-cabinets");
  const islandLayer = page.querySelector(".cad-island");

  const kitchenImgs = Array.from(page.querySelectorAll(".cad-kitchen img"));
  const deepImgs = Array.from(page.querySelectorAll(".cad-deep_cabinets img, .cad-deep-cabinets img"));
  const islandImgs = Array.from(page.querySelectorAll(".cad-island img"));

  function setDisplay(el, value) {
    if (!el) return;
    el.style.setProperty("display", value, "important");
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

    if (oven && built) {
      return "kitchen-" + water + "-oven-fridge-built";
    }

    if (oven) {
      return "kitchen-" + water + "-oven";
    }

    if (built) {
      return "kitchen-" + water + "-fridge-built";
    }

    return "kitchen-" + water + "-base";
  }

  function findKitchenImg(kitchenClass) {
    return kitchenImgs.find(function (img) {
      return img.classList.contains(kitchenClass);
    });
  }

  function renderPravaCad() {
    const kitchenClass = buildKitchenClass();

    hideImgs(kitchenImgs);
    hideImgs(deepImgs);
    hideImgs(islandImgs);

    setDisplay(deepLayer, "none");
    setDisplay(islandLayer, "none");

    if (!kitchenClass) {
      setDisplay(baseLayer, "block");
      setDisplay(kitchenLayer, "none");
    } else {
      const img = findKitchenImg(kitchenClass);

      if (img) {
        setDisplay(baseLayer, "none");
        setDisplay(kitchenLayer, "block");

        showImg(img);
      } else {
        setDisplay(baseLayer, "block");
        setDisplay(kitchenLayer, "none");

        console.warn("NO KITCHEN IMAGE CLASS:", kitchenClass);
      }
    }

    const deep = getValue("deep_cabinets") || getValue("deep-cabinets");

    if (deep === "yes") {
      setDisplay(deepLayer, "block");
      showImg(deepImgs[0]);
    }

    const island = getValue("island");

    if (island === "yes") {
      setDisplay(islandLayer, "block");
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





// ==========================
// PRAVA PICKERS ENGINE
// meters + centimeters
// ==========================
document.addEventListener("DOMContentLoaded", function () {
  const pravaPage = document.querySelector(".sf-page.sf-page-prava");
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

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function parseIntSafe(v) {
    const n = parseInt(String(v || "").trim(), 10);
    return isNaN(n) ? 0 : n;
  }

  function setHidden(name, value) {
    const input = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (input) input.value = value || "";
  }

  function getRowDim(row) {
    return row.getAttribute("data-dim") || "";
  }

  function getHiddenDimInput(row) {
    const dim = getRowDim(row);
    if (!dim) return null;

    return (
      qs(row, '.hidden-dimension-input[data-dim="' + dim + '"]') ||
      qs(row, '.hidden-dimension-input') ||
      qs(form, '.hidden-dimension-input[data-dim="' + dim + '"]')
    );
  }

  function getMetersControl(row) {
    return qs(row, ".meters-control");
  }

  function getCentimetersControl(row) {
    return qs(row, ".centimeters-control");
  }

  function getValueEl(control) {
    return control ? qs(control, ".picker-value") : null;
  }

  function getButtons(control) {
    return control ? qsa(control, ".picker-btn") : [];
  }

  function getMinusBtn(control) {
    const buttons = getButtons(control);
    return buttons[0] || null;
  }

  function getPlusBtn(control) {
    const buttons = getButtons(control);
    return buttons[buttons.length - 1] || null;
  }

  function getDisplayedValue(valueEl) {
    if (!valueEl) return 0;

    const nestedText =
      qs(valueEl, ".picker-value-text") ||
      qs(valueEl, ".w-richtext") ||
      null;

    if (nestedText) return parseIntSafe(nestedText.textContent);

    return parseIntSafe(valueEl.textContent);
  }

  function setDisplayedValue(valueEl, value) {
    if (!valueEl) return;

    const nestedText =
      qs(valueEl, ".picker-value-text") ||
      qs(valueEl, ".w-richtext") ||
      null;

    if (nestedText) {
      nestedText.textContent = String(value);
      return;
    }

    valueEl.textContent = String(value);
  }

  function getRowValues(row) {
    const metersValueEl = getValueEl(getMetersControl(row));
    const centimetersValueEl = getValueEl(getCentimetersControl(row));

    return {
      meters: getDisplayedValue(metersValueEl),
      centimeters: getDisplayedValue(centimetersValueEl)
    };
  }

  function setRowValues(row, meters, centimeters) {
    meters = clamp(parseIntSafe(meters), 0, 99);
    centimeters = clamp(parseIntSafe(centimeters), 0, 95);

    const metersValueEl = getValueEl(getMetersControl(row));
    const centimetersValueEl = getValueEl(getCentimetersControl(row));

    setDisplayedValue(metersValueEl, meters);
    setDisplayedValue(centimetersValueEl, centimeters);
  }

  function formatDimension(meters, centimeters) {
    return meters + " м " + centimeters + " см";
  }

  function syncRow(row) {
    const dim = getRowDim(row);
    if (!dim) return;

    const values = getRowValues(row);
    const formatted = formatDimension(values.meters, values.centimeters);

    const localHidden = getHiddenDimInput(row);
    if (localHidden) {
      localHidden.value = formatted;
    }

    const canonicalName = DIM_TO_HIDDEN[dim];
    if (canonicalName) {
      setHidden(canonicalName, formatted);
    }
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

    if (centimeters < 0) centimeters = 0;
    if (centimeters > 95) {
      meters += 1;
      centimeters = 0;
    }

    return {
      meters: clamp(meters, 0, 99),
      centimeters: clamp(centimeters, 0, 95)
    };
  }

  function incrementMeters(row) {
    const values = getRowValues(row);
    setRowValues(row, values.meters + 1, values.centimeters);
    syncRow(row);
  }

  function decrementMeters(row) {
    const values = getRowValues(row);
    setRowValues(row, Math.max(0, values.meters - 1), values.centimeters);
    syncRow(row);
  }

  function incrementCentimeters(row) {
    const values = getRowValues(row);
    const next = normalizeAfterCmChange(values.meters, values.centimeters + 5);
    setRowValues(row, next.meters, next.centimeters);
    syncRow(row);
  }

  function decrementCentimeters(row) {
    const values = getRowValues(row);
    const next = normalizeAfterCmChange(values.meters, values.centimeters - 5);
    setRowValues(row, next.meters, next.centimeters);
    syncRow(row);
  }

  function bindRow(row) {
    const metersControl = getMetersControl(row);
    const centimetersControl = getCentimetersControl(row);

    const metersMinus = getMinusBtn(metersControl);
    const metersPlus = getPlusBtn(metersControl);

    const centimetersMinus = getMinusBtn(centimetersControl);
    const centimetersPlus = getPlusBtn(centimetersControl);

    if (metersMinus) {
      metersMinus.addEventListener("click", function (e) {
        e.preventDefault();
        decrementMeters(row);
      });
    }

    if (metersPlus) {
      metersPlus.addEventListener("click", function (e) {
        e.preventDefault();
        incrementMeters(row);
      });
    }

    if (centimetersMinus) {
      centimetersMinus.addEventListener("click", function (e) {
        e.preventDefault();
        decrementCentimeters(row);
      });
    }

    if (centimetersPlus) {
      centimetersPlus.addEventListener("click", function (e) {
        e.preventDefault();
        incrementCentimeters(row);
      });
    }

    syncRow(row);
  }

  const dimensionRows = qsa(form, '.dimension-row[data-dim]');
  dimensionRows.forEach(bindRow);
});

