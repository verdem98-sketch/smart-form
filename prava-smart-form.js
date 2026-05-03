console.log("PRAVA SCRIPT LOADED");
/* =========================================================
   PRAVA SMART FORM ENGINE v1
   - Next / Back / Reset
   - State-based CAD render
   - Kitchen + overlays
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  /* =========================================================
     GUARDS
     ========================================================= */
  var page = document.querySelector(".sf-page-prava");
  if (!page) return;

  var form = page.querySelector(".sf-form-prava");
  if (!form) return;

  /* =========================================================
     STATE
     ========================================================= */
  var state = {
    water_position_prava: null,
    oven_tall_unit: null,
    fridge_type: null,
    deep_cabinets: null,
    island: null
  };

  /* =========================================================
     HELPERS
     ========================================================= */
  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function show(el) {
    if (el) el.style.display = "block";
  }

  function hide(el) {
    if (el) el.style.display = "none";
  }

  /* =========================================================
     QUESTIONS
     ========================================================= */
  var questions = qsa(form, ".question-wrap-prava");

  function goToQuestion(field) {
    questions.forEach(function (q) {
      var f = q.getAttribute("data-field");
      q.classList.remove("active-question");
      hide(q);
      if (f === field) {
        q.classList.add("active-question");
        show(q);
      }
    });
  }

  /* =========================================================
     OPTION CLICK
     ========================================================= */
  qsa(form, ".option-pill").forEach(function (pill) {
    pill.addEventListener("click", function () {

      var wrap = pill.closest(".question-wrap-prava");
      if (!wrap) return;

      var field = wrap.getAttribute("data-field");
      var value = pill.getAttribute("data-value");

      // set state
      state[field] = value;

      // active class
      qsa(wrap, ".option-pill").forEach(function (p) {
        p.classList.remove("active");
      });
      pill.classList.add("active");

      renderCAD();
    });
  });

  /* =========================================================
     NEXT
     ========================================================= */
  qsa(form, ".nav-next").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = btn.getAttribute("data-step-next");
      if (!next) return;
      goToQuestion(next);
    });
  });

  /* =========================================================
     BACK
     ========================================================= */
  qsa(form, ".nav-back").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var back = btn.getAttribute("data-step-back");
      if (!back) return;
      goToQuestion(back);
    });
  });

  /* =========================================================
     RESET
     ========================================================= */
  qsa(form, '[data-action="reset-prava"]').forEach(function (btn) {
    btn.addEventListener("click", function () {

      // clear state
      Object.keys(state).forEach(function (k) {
        state[k] = null;
      });

      // remove active
      qsa(form, ".option-pill").forEach(function (p) {
        p.classList.remove("active");
      });

      // go first
      goToQuestion("water_position_prava");

      renderCAD();
    });
  });

  /* =========================================================
     CAD ELEMENTS
     ========================================================= */
  var kitchenImgs = qsa(form, ".cad-prava-kitchen .cad-img-kitchen");
  var deepLayer = qs(form, ".cad-prava-deep_cabinets");
  var islandLayer = qs(form, ".cad-prava-island");

  /* =========================================================
     CAD RENDER
     ========================================================= */
  function renderCAD() {

    // hide all kitchen
    kitchenImgs.forEach(function (img) {
      hide(img);
    });

    var w = state.water_position_prava;
    var o = state.oven_tall_unit;
    var f = state.fridge_type;

    if (w && o !== null && f) {

      var key = "kitchen-" + w;

      // oven
      key += (o === "yes") ? "-oven" : "-base";

      // fridge
      if (f === "Вграден") key += "-fridge-built";

      // final class match
      var target = qs(form, ".cad-img-kitchen." + key);
      if (target) show(target);
    }

    // deep cabinets overlay
    if (state.deep_cabinets === "yes") {
      show(deepLayer);
    } else {
      hide(deepLayer);
    }

    // island overlay
    if (state.island === "yes") {
      show(islandLayer);
    } else {
      hide(islandLayer);
    }
  }

  /* =========================================================
     INIT
     ========================================================= */
  goToQuestion("water_position_prava");
  renderCAD();

});





