/* =========================================================
   VERDE-M PRAVA SMART FORM ENGINE v1
   Questions only: select / next / back / reset
   ========================================================= */

(function () {
  if (window.VERDE_PRAVA_ENGINE_V1_LOADED) return;
  window.VERDE_PRAVA_ENGINE_V1_LOADED = true;

  document.addEventListener("DOMContentLoaded", function () {
    console.log("PRAVA ENGINE v1 LOADED");

    var flow =
      document.querySelector(".sf-page-prava") ||
      document.querySelector(".prava-form-block") ||
      document.querySelector(".prava-form");

    if (!flow) {
      console.warn("PRAVA ENGINE: wrapper not found");
      return;
    }

    var questions = Array.from(flow.querySelectorAll(".question-wrap-prava"));

    if (!questions.length) {
      console.warn("PRAVA ENGINE: no .question-wrap-prava found");
      return;
    }

    var state = {};

    function hide(el) {
      if (!el) return;
      el.style.display = "none";
      el.classList.remove("active-question");
    }

    function show(el) {
      if (!el) return;
      el.style.display = "block";
      el.classList.add("active-question");
    }

    function getQuestionIndex(question) {
      return questions.indexOf(question);
    }

    function showOnlyQuestion(question) {
      questions.forEach(hide);
      show(question);
    }

    function getField(question) {
      return question ? question.getAttribute("data-field") : "";
    }

    function hasSelection(question) {
      return !!question.querySelector(".option-pill.active");
    }

    function shake(question) {
      if (!question) return;
      question.classList.remove("choice-warning");
      void question.offsetWidth;
      question.classList.add("choice-warning");

      setTimeout(function () {
        question.classList.remove("choice-warning");
      }, 350);
    }

    function resetAll() {
      state = {};

      flow.querySelectorAll(".option-pill").forEach(function (pill) {
        pill.classList.remove("active");
      });

      showOnlyQuestion(questions[0]);
      console.log("PRAVA RESET");
    }

    flow.addEventListener("click", function (e) {
      var pill = e.target.closest(".option-pill");
      if (!pill || !flow.contains(pill)) return;

      var question = pill.closest(".question-wrap-prava");
      if (!question) return;

      var field = getField(question);
      var value = pill.getAttribute("data-value") || pill.textContent.trim();

      question.querySelectorAll(".option-pill").forEach(function (item) {
        item.classList.remove("active");
      });

      pill.classList.add("active");

      if (field) {
        state[field] = value;
      }

      console.log("PRAVA STATE:", state);
    });

    flow.addEventListener("click", function (e) {
      var next = e.target.closest(".nav-next");
      if (!next || !flow.contains(next)) return;

      e.preventDefault();

      var question = next.closest(".question-wrap-prava");
      if (!question) return;

      if (!hasSelection(question)) {
        shake(question);
        return;
      }

      var index = getQuestionIndex(question);

      if (next.getAttribute("data-action") === "go-dimensions") {
        console.log("GO DIMENSIONS — next phase later");
        return;
      }

      if (questions[index + 1]) {
        showOnlyQuestion(questions[index + 1]);
      }
    });

    flow.addEventListener("click", function (e) {
      var back = e.target.closest(".nav-back");
      if (!back || !flow.contains(back)) return;

      e.preventDefault();

      var question = back.closest(".question-wrap-prava");
      if (!question) return;

      var index = getQuestionIndex(question);

      if (questions[index - 1]) {
        showOnlyQuestion(questions[index - 1]);
      }
    });

    flow.addEventListener("click", function (e) {
      var reset = e.target.closest('[data-action="reset-prava"]');
      if (!reset || !flow.contains(reset)) return;

      e.preventDefault();
      resetAll();
    });

    showOnlyQuestion(questions[0]);
  });
})();
