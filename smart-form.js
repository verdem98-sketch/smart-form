document.addEventListener("DOMContentLoaded", function () {

  // =========================
  // ELEMENTS
  // =========================
  var formEl = document.querySelector(".smart-form-block form");
  if (!formEl) return;

  var submitBtn = formEl.querySelector('[type="submit"]');

  // hidden fields
  var summaryField = formEl.querySelector('[name="summary_readable"]');

  // =========================
  // HELPERS
  // =========================
  function qs(sel, scope) {
    return (scope || document).querySelector(sel);
  }

  function qsa(sel, scope) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function val(name) {
    var el = formEl.querySelector('[name="' + name + '"]');
    if (!el) return "";
    return (el.value || "").trim();
  }

  function setHidden(name, value) {
    var el = formEl.querySelector('[name="' + name + '"]');
    if (el) el.value = value || "";
  }

  // =========================
  // COLLECT DATA
  // =========================
  function collectAllData() {
    var data = {};

    // всички input/select/textarea
    qsa("input, select, textarea", formEl).forEach(function (el) {
      if (!el.name) return;
      if (el.type === "radio" && !el.checked) return;
      if (el.type === "checkbox" && !el.checked) return;

      data[el.name] = (el.value || "").trim();
    });

    return data;
  }

  // =========================
  // BUILD READABLE EMAIL
  // =========================
  function buildReadableSummary(data) {

    var lines = [];

    lines.push("Ново запитване – кухня");
    lines.push("");

    if (data.kitchen_type) {
      lines.push("Тип: " + data.kitchen_type);
    }

    if (data.water_position) {
      lines.push("Вода: " + data.water_position);
    }

    if (data.chimney_position) {
      lines.push("Комин: " + data.chimney_position);
    }

    if (data.length_main) {
      lines.push("Дължина: " + data.length_main);
    }

    if (data.height_main) {
      lines.push("Височина: " + data.height_main);
    }

    if (data.has_island === "yes") {
      lines.push("Остров: Да");
      if (data.island_length) {
        lines.push("  - Дължина: " + data.island_length);
      }
    }

    if (data.has_bar === "yes") {
      lines.push("Бар: Да");
      if (data.bar_length) {
        lines.push("  - Дължина: " + data.bar_length);
      }
    }

    if (data.style) {
      lines.push("Стил: " + data.style);
    }

    if (data.plan_time) {
      lines.push("План: " + data.plan_time);
    }

    if (data.message) {
      lines.push("");
      lines.push("Коментар:");
      lines.push(data.message);
    }

    lines.push("");
    lines.push("Контакт:");

    if (data.Name) lines.push("Име: " + data.Name);
    if (data.Email) lines.push("Email: " + data.Email);
    if (data.Phone) lines.push("Телефон: " + data.Phone);

    return lines.join("\n");
  }

  // =========================
  // SUBMIT HOOK (SAFE)
  // =========================
  if (submitBtn) {
    submitBtn.addEventListener("click", function () {

      var data = collectAllData();
      var summary = buildReadableSummary(data);

      setHidden("summary_readable", summary);

      // НЕ правим preventDefault
      // НЕ правим submit()
      // НЕ правим redirect

    });
  }

});
