/* Aglova legacy page scripts: moved verbatim (in original order) from the Webflow page head and footer. Phase B: scripts superseded by aglova-flow.js (reveal animations, title moves, column equalizer, nav svg) were removed. */

/* ===== script 01: head:head-script-25 ===== */
try {
/* AGLOVA SUCCESS — FORCE INSPIRATION IMAGE SIZE */

document.addEventListener("DOMContentLoaded", function () {
  function forceInspirationImage() {
    var img = document.querySelector(".success-inspiration-img");
    var card = document.querySelector(".success-inspiration-card");

    if (!img) return;

    if (card) {
      card.style.setProperty("width", "100%", "important");
      card.style.setProperty("height", "300px", "important");
      card.style.setProperty("display", "block", "important");
      card.style.setProperty("overflow", "hidden", "important");
      card.style.setProperty("border-radius", "12px", "important");
    }

    img.style.setProperty("width", "100%", "important");
    img.style.setProperty("height", "280px", "important");
    img.style.setProperty("max-width", "100%", "important");
    img.style.setProperty("display", "block", "important");
    img.style.setProperty("object-fit", "cover", "important");
    img.style.setProperty("object-position", "center center", "important");
    img.style.setProperty("border-radius", "12px", "important");
  }

  document.querySelectorAll("form").forEach(function (form) {
    form.addEventListener("submit", function () {
      setTimeout(forceInspirationImage, 300);
      setTimeout(forceInspirationImage, 900);
      setTimeout(forceInspirationImage, 1600);
    });
  });
});
} catch (error) { console.error("aglova-legacy script 01 failed", error); }

/* ===== script 02: footer:inline ===== */
try {
(function () {
  "use strict";

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function qsa(scope, sel) {
    return Array.from((scope || document).querySelectorAll(sel));
  }

  function clean(v) {
    return String(v || "").trim();
  }

  function text(el) {
    return clean(el && el.textContent);
  }

  function lower(v) {
    return clean(v).toLowerCase();
  }

  function valFrom(el) {
    if (!el) return "";
    return clean(el.getAttribute("data-value") || el.value || el.textContent);
  }

  document.addEventListener("DOMContentLoaded", function () {
    qsa(document, ".vision-cards-row").forEach(function (row) {
      const cards = qsa(row, ".vision-card");

      cards.forEach(function (card) {
        card.addEventListener("click", function (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          const isActive = card.classList.contains("vm-selected");

          cards.forEach(function (c) {
            c.classList.remove("vm-selected", "is-selected", "active");
          });

          if (!isActive) card.classList.add("vm-selected");
        }, true);
      });
    });
  });

  document.addEventListener("submit", function (e) {
    const form = e.target;
    const flow = document.querySelector(".flow-aglova");
    if (!form || !flow) return;

    function setAll(name, value) {
      qsa(form, '[name="' + name + '"]').forEach(function (el) {
        el.value = value || "";
      });
    }

    function getExisting(name) {
      const els = qsa(form, '[name="' + name + '"]');
      for (const el of els) {
        if (el.type === "checkbox" && el.checked) return el.value || "Да";
        if (clean(el.value)) return clean(el.value);
      }
      return "";
    }

    function activeValue(selector) {
      const wrap = qs(flow, selector);
      if (!wrap) return "";

      const active =
        qs(wrap, ".option-pill.active") ||
        qs(wrap, ".option-pill.is-selected") ||
        qs(wrap, ".option-pill.vm-selected");

      return valFrom(active);
    }

    function dimValue(dimName) {
      const row = qs(flow, '.dimension-row[data-dim="' + dimName + '"]');
      if (!row) return "";

      const values = qsa(row, ".picker-value").map(text).filter(Boolean);

      if (values.length >= 2) return values[0] + " м " + values[1] + " см";
      if (values.length === 1) return values[0];

      return "";
    }

    function selectedVision(fieldName) {
      const wrap = qs(flow, '.question-wrap[data-field="' + fieldName + '"]');
      if (!wrap) return "";

      const card = qs(wrap, ".vision-card.vm-selected");

      return valFrom(card);
    }

    function visionNote(fieldName) {
      const wrap = qs(flow, '.question-wrap[data-field="' + fieldName + '"]');
      if (!wrap) return "";

      const field =
        qs(wrap, "textarea:not([type='hidden'])") ||
        qs(wrap, "input:not([type='hidden'])");

      return clean(field && field.value);
    }

    function checkedByKey(key) {
      const direct = qsa(form, '[name="' + key + '"]');

      for (const el of direct) {
        if (el.type === "checkbox" && el.checked) return "Да";
        if (clean(el.value)) return clean(el.value);
      }

      const byData =
        qs(flow, '[data-checkbox-field="' + key + '"]') ||
        qs(flow, '[data-field="' + key + '"]');

      if (!byData) return "";

      const box =
        byData.matches && byData.matches('input[type="checkbox"]')
          ? byData
          : qs(byData, 'input[type="checkbox"]');

      return box && box.checked ? "Да" : "";
    }

    function selectedInspiration() {
      const wrap = qs(flow, ".final-phase") || flow;

      const card =
        qs(wrap, ".inspiration-card.vm-selected") ||
        qs(wrap, ".inspiration-card.is-selected") ||
        qs(wrap, ".inspiration-card.active");

      return valFrom(card);
    }

    function visibleCustomDate() {
      const field =
        qs(flow, ".booking-custom-date input") ||
        qs(flow, ".booking-custom-date textarea") ||
        qs(flow, '[name="custom_date_visible"]') ||
        qs(flow, '[placeholder*="Пример"]');

      return clean(field && field.value);
    }

    function planValue() {
      return (
        activeValue('.question-wrap[data-field="plan_aglova"]') ||
        activeValue('.question-wrap[data-field="plan"]') ||
        getExisting("plan_aglova") ||
        getExisting("plan")
      );
    }

    function line(items) {
      return items
        .filter(function (item) {
          return clean(item.value) !== "";
        })
        .map(function (item) {
          return "[" + item.label + ": " + item.value + "]";
        })
        .join(" | ");
    }

    const chimney = activeValue('.question-wrap[data-step="chimney"]');
    const water = activeValue('.question-wrap[data-step="water"]');
    const oven = activeValue('.question-wrap[data-step="oven"]');
    const fridge = activeValue('.question-wrap[data-step="fridge"]');
    const center = activeValue('.question-wrap[data-step="center"]');

    setAll("chimney_exists", chimney);
    setAll("water_position_aglova", water);
    setAll("oven_tall_unit_aglova", oven);
    setAll("fridge_type_aglova", fridge);
    setAll("bar_enabled_aglova", center);

    const stena1 = dimValue("stena1_len_aglova");
    const stena2 = dimValue("stena2_len_aglova");
    const height = dimValue("visochina_aglova");
    const chimneyA = dimValue("chimney_a_aglova");
    const chimneyB = dimValue("chimney_b_aglova");
    const barLen = dimValue("bar_len_aglova");
    const barWidth = dimValue("bar_width_aglova");
    const islandLen = dimValue("island_len_aglova");
    const islandWidth = dimValue("island_width_aglova");

    setAll("stena1_len_aglova", stena1);
    setAll("stena2_len_aglova", stena2);
    setAll("visochina_aglova", height);
    setAll("chimney_a_aglova", chimneyA);
    setAll("chimney_b_aglova", chimneyB);
    setAll("bar_len_aglova", barLen);
    setAll("bar_width_aglova", barWidth);
    setAll("island_len_aglova", islandLen);
    setAll("island_width_aglova", islandWidth);

    const upper = selectedVision("upper_finish");
    const lower = selectedVision("lower_finish");
    const countertop = selectedVision("countertop_finish");
    const backsplash = selectedVision("backsplash_finish");

    const upperNote = visionNote("upper_finish");
    const lowerNote = visionNote("lower_finish");
    const countertopNote = visionNote("countertop_finish");
    const backsplashNote = visionNote("backsplash_finish");

    setAll("upper_finish", upperNote || upper);
    setAll("lower_finish", lowerNote || lower);
    setAll("countertop_finish", countertopNote || countertop);
    setAll("backsplash_finish", backsplashNote || backsplash);

    setAll("upper_finish_note_aglova", upperNote);
    setAll("lower_finish_note_aglova", lowerNote);
    setAll("countertop_note_aglova", countertopNote);
    setAll("backsplash_note_aglova", backsplashNote);

    const dishwasher = checkedByKey("dishwasher");
    const washing = checkedByKey("washing_machine");
    const microwave = checkedByKey("microwave");
    const coffee = checkedByKey("coffee_machine");

    const glassDisplay = checkedByKey("glass_display");
    const deepCabinets = checkedByKey("deep_cabinets");
    const moreDrawers = checkedByKey("more_drawers");
    const liftMechanisms = checkedByKey("lift_mechanisms");
    const counterLighting = checkedByKey("counter_lighting");
    const bottleRack = checkedByKey("bottle_rack");

    setAll("dishwasher", dishwasher);
    setAll("washing_machine", washing);
    setAll("microwave", microwave);
    setAll("coffee_machine", coffee);

    setAll("glass_display", glassDisplay);
    setAll("deep_cabinets", deepCabinets);
    setAll("more_drawers", moreDrawers);
    setAll("lift_mechanisms", liftMechanisms);
    setAll("counter_lighting", counterLighting);
    setAll("bottle_rack", bottleRack);

    const inspiration = selectedInspiration();
    const plan = planValue();

    setAll("inspiration_card_aglova", inspiration);
    setAll("plan_aglova", plan);

    const customDate = visibleCustomDate() || getExisting("custom_date");
    const meetingDate = customDate ? "custom" : getExisting("meeting_date");
    const meetingSlot = customDate ? "" : getExisting("meeting_slot");

    setAll("meeting_date", meetingDate);
    setAll("meeting_slot", meetingSlot);
    setAll("custom_date", customDate);

    const summaryField = qs(form, '[name="summary_readable"]');

    if (summaryField) {
      summaryField.value = [
        line([
          { label: "Комин", value: chimney },
          { label: "Вода", value: water },
          { label: "Фурна във висок шкаф", value: oven },
          { label: "Хладилник", value: fridge },
          { label: "Бар / остров", value: center }
        ]),
        line([
          { label: "Стена 1", value: stena1 },
          { label: "Стена 2", value: stena2 },
          { label: "Височина", value: height },
          { label: "Комин А", value: chimneyA },
          { label: "Комин Б", value: chimneyB },
          { label: "Бар", value: barLen || barWidth ? barLen + " x " + barWidth : "" },
          { label: "Остров", value: islandLen || islandWidth ? islandLen + " x " + islandWidth : "" }
        ]),
        line([
          { label: "Горен ред", value: upperNote || upper },
          { label: "Долен ред", value: lowerNote || lower },
          { label: "Плот", value: countertopNote || countertop },
          { label: "Гръб", value: backsplashNote || backsplash }
        ]),
        line([
          { label: "Миялна", value: dishwasher },
          { label: "Пералня", value: washing },
          { label: "Микровълнова", value: microwave },
          { label: "Кафе-машина", value: coffee }
        ]),
        line([
          { label: "Стъклени витрини", value: glassDisplay },
          { label: "Дълбоки шкафове", value: deepCabinets },
          { label: "Повече чекмеджета", value: moreDrawers },
          { label: "Повдигащи механизми", value: liftMechanisms },
          { label: "Осветление на плот", value: counterLighting },
          { label: "Бутилиера", value: bottleRack }
        ]),
        line([
          { label: "Вдъхновение", value: inspiration },
          { label: "План", value: plan },
          { label: "Дата за среща", value: meetingDate },
          { label: "Час", value: meetingSlot },
          { label: "Друга дата", value: customDate }
        ])
      ].filter(Boolean).join("\n");
    }
  }, true);

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    if (!form) return;

    const inputDate = form.querySelector('[name="meeting_date"]');
    const inputSlot = form.querySelector('[name="meeting_slot"]');
    const inputCustom = form.querySelector('[name="custom_date"]');

    if (!inputDate || !inputSlot) return;

    qsa(document, ".booking-slot").forEach(function (slot) {
      slot.addEventListener("click", function () {
        qsa(document, ".booking-slot").forEach(function (s) {
          s.classList.remove("active");
        });

        this.classList.add("active");

        const slotText = this.textContent.trim();
        const dayEl = this.closest(".booking-day");
        const dateText = dayEl?.querySelector(".booking-date")?.textContent.trim() || "";

        inputDate.value = dateText;
        inputSlot.value = slotText;

        if (inputCustom) inputCustom.value = "";
      });
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.querySelector("form");
    if (!form) return;

    const inputDate = form.querySelector('[name="meeting_date"]');
    const inputSlot = form.querySelector('[name="meeting_slot"]');
    const inputCustom = form.querySelector('[name="custom_date"]');

    const customField =
      document.querySelector(".booking-custom-date input") ||
      document.querySelector(".booking-custom-date textarea") ||
      document.querySelector('[placeholder*="Пример"]');

    if (!customField || !inputCustom) return;

    customField.addEventListener("input", function () {
      const val = this.value.trim();
      if (!val) return;

      qsa(document, ".booking-slot").forEach(function (s) {
        s.classList.remove("active");
      });

      inputCustom.value = val;
      if (inputDate) inputDate.value = "custom";
      if (inputSlot) inputSlot.value = "";
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    const flow = document.querySelector(".flow-aglova");
    if (!flow) return;

    const comboWrap = flow.querySelector(".combo-phase-wrap");
    const dimensionsWrap = flow.querySelector(".dimensions-phase-wrap");
    const finalPhase = flow.querySelector(".final-phase");
    const comboDimPhase = flow.querySelector(".combo-dim-phase");

    function show(el) {
      if (el) el.style.display = "block";
    }

    function hide(el) {
      if (el) el.style.display = "none";
    }

    function isVisible(el) {
      if (!el) return false;
      const st = window.getComputedStyle(el);
      return st.display !== "none" && st.visibility !== "hidden";
    }

    function num(el) {
      return parseInt((el && el.textContent || "").trim(), 10) || 0;
    }

    function showOnlyQuestion(stepName) {
      if (!comboWrap) return;

      qsa(comboWrap, ".question-wrap").forEach(function (q) {
        q.style.display = "none";
        q.classList.remove("is-active");
      });

      const target = qs(comboWrap, '.question-wrap[data-step="' + stepName + '"]');

      if (target) {
        target.style.display = "block";
        target.classList.add("is-active");
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    function hasActive(stepName) {
      const q = qs(comboWrap, '.question-wrap[data-step="' + stepName + '"]');
      if (!q) return true;
      return !!qs(q, ".option-pill.active,.option-pill.is-selected,.option-pill.vm-selected");
    }

    function firstMissingComboStep() {
      const required = ["chimney", "water", "oven", "fridge", "center"];

      for (const step of required) {
        if (!hasActive(step)) return step;
      }

      return "";
    }

    function getOrCreateQuestionHint(stepName) {
      const q = qs(comboWrap, '.question-wrap[data-step="' + stepName + '"]');
      if (!q) return null;

      let hint = qs(q, ".question-hint");

      if (!hint) {
        hint = document.createElement("div");
        hint.className = "question-hint";
        hint.textContent = "Изберете вариант, за да продължим.";
        q.appendChild(hint);
      }

      return hint;
    }

    function warnQuestion(stepName) {
      const q = qs(comboWrap, '.question-wrap[data-step="' + stepName + '"]');
      if (!q) return;

      const hint = getOrCreateQuestionHint(stepName);

      q.classList.remove("choice-warning");
      void q.offsetWidth;
      q.classList.add("choice-warning");

      if (hint) hint.classList.add("is-visible");

      setTimeout(function () {
        q.classList.remove("choice-warning");
      }, 350);
    }

    function dimensionIsValid(row) {
      if (!row) return true;

      const touched =
        row.classList.contains("is-touched") ||
        row.getAttribute("data-touched") === "true";

      const values = qsa(row, ".picker-value");
      let total = 0;

      values.forEach(function (v) {
        total += num(v);
      });

      return touched || total > 0;
    }

    function firstEmptyVisibleDimension() {
      if (!dimensionsWrap) return null;

      const rows = qsa(dimensionsWrap, ".dimension-row");

      for (const row of rows) {
        const group = row.closest(".dimensions-group");

        if (!isVisible(row)) continue;
        if (group && !isVisible(group)) continue;

        if (!dimensionIsValid(row)) return row;
      }

      return null;
    }

    function getOrCreateDimensionHint(row) {
      let hint = qs(row, ".dimension-hint");

      if (!hint) {
        hint = document.createElement("div");
        hint.className = "dimension-hint";
        hint.textContent = "Попълни размера, за да продължим.";
        row.appendChild(hint);
      }

      return hint;
    }

    function warnDimension(row) {
      if (!row) return;

      const hint = getOrCreateDimensionHint(row);

      row.classList.remove("dimension-warning");
      void row.offsetWidth;
      row.classList.add("dimension-warning");

      if (hint) hint.classList.add("is-visible");

      setTimeout(function () {
        row.classList.remove("dimension-warning");
      }, 350);

      row.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    document.addEventListener("click", function (e) {
      const btn = e.target.closest(".phase-next-btn");
      if (!btn || !flow.contains(btn)) return;

      const missingStep = firstMissingComboStep();

      if (missingStep) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        show(comboDimPhase);
        show(comboWrap);
        hide(dimensionsWrap);
        hide(finalPhase);

        if (window.AglovaFlow) window.AglovaFlow.showStep(missingStep);
        else showOnlyQuestion(missingStep);
        warnQuestion(missingStep);
        return;
      }

      const emptyDim = firstEmptyVisibleDimension();

      if (emptyDim) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        show(comboDimPhase);
        hide(comboWrap);
        show(dimensionsWrap);
        hide(finalPhase);

        if (window.AglovaFlow) window.AglovaFlow.showDimensions();
        warnDimension(emptyDim);
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (!finalPhase) return;
      const top = flow.querySelector(".aglova-left");
      const seo = btn.closest(".seo-text");
      const extras = seo && seo.parentElement;
      hide(top);
      if (extras && extras !== flow && !extras.contains(finalPhase)) hide(extras);
      show(finalPhase);
      finalPhase.scrollIntoView({behavior:"smooth",block:"start"});
      window.dispatchEvent(new Event("resize"));
    }, true);
  });

  document.addEventListener("DOMContentLoaded", function () {
    var flow = document.querySelector(".flow-aglova");
    if (!flow) return;

    var form = flow.closest("form");
    if (!form) return;

    var formBlock = form.closest(".w-form") || document;

    function getValue(name) {
      var el = form.querySelector('[name="' + name + '"]');
      return clean(el && el.value);
    }

    function addCm(v) {
      v = clean(v);
      if (!v) return "";
      if (v.indexOf("см") > -1 || v.indexOf("м") > -1) return v;
      return v + " см";
    }

    function setText(key, value) {
      qsa(formBlock, '[data-success="' + key + '"]').forEach(function (el) {
        el.textContent = clean(value) || "—";
      });
    }

    function kitchenKey() {
      var chimney = lower(getValue("chimney_exists"));
      var water = lower(getValue("water_position_aglova"));
      var oven = lower(getValue("oven_tall_unit_aglova"));
      var fridge = lower(getValue("fridge_type_aglova"));

      var c = chimney === "да" || chimney === "yes" ? "chimney" : "nochimney";
      var w = water.indexOf("2") > -1 ? "water2" : "water1";
      var o = oven === "да" || oven === "yes" ? "oven" : "nooven";
      var f = fridge.indexOf("вграден") > -1 || fridge === "yes" ? "fridge" : "nofridge";

      return c + "-" + w + "-" + o + "-" + f;
    }

    function barKey() {
      var bar = lower(getValue("bar_enabled_aglova"));
      if (bar.indexOf("стена 1") > -1 || bar === "wall1") return "wall1";
      if (bar.indexOf("стена 2") > -1 || bar === "wall2") return "wall2";
      return "";
    }

    function isIsland() {
      var bar = lower(getValue("bar_enabled_aglova"));
      return bar.indexOf("остров") > -1 || bar === "island";
    }

    function getSrcFromOriginal(selector) {
      var img = qs(flow, selector);
      return img ? (img.currentSrc || img.src || "") : "";
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

      var key = kitchenKey();
      var kitchenSrc = getSrcFromOriginal('.cad-kitchen [data-kitchen="' + key + '"]');

      if (!kitchenSrc) {
        var baseKey = lower(getValue("chimney_exists")) === "да" ? "with-chimney" : "no-chimney";
        kitchenSrc = getSrcFromOriginal('.cad-base [data-base="' + baseKey + '"]');
      }

      addLayer(stage, kitchenSrc, "success-cad-layer success-cad-kitchen");

      var bKey = barKey();

      if (bKey) {
        addLayer(stage, getSrcFromOriginal('.cad-bar [data-bar="' + bKey + '"]'), "success-cad-layer success-cad-bar");
      }

      if (isIsland()) {
        addLayer(stage, getSrcFromOriginal('.cad-island [data-island="yes"]'), "success-cad-layer success-cad-island");
      }

      target.appendChild(stage);
    }

    function combined(a, b, secondIsCm) {
      var av = getValue(a);
      var bv = getValue(b);

      if (secondIsCm) bv = addCm(bv);

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

    function fillTexts() {
      [
        "chimney_exists",
        "water_position_aglova",
        "oven_tall_unit_aglova",
        "fridge_type_aglova",
        "bar_enabled_aglova",
        "stena1_len_aglova",
        "stena2_len_aglova",
        "visochina_aglova",
        "upper_finish",
        "lower_finish",
        "countertop_finish",
        "backsplash_finish",
        "dishwasher",
        "washing_machine",
        "microwave",
        "coffee_machine",
        "glass_display",
        "deep_cabinets",
        "more_drawers",
        "lift_mechanisms",
        "counter_lighting",
        "bottle_rack",
        "inspiration_card_aglova",
        "plan_aglova",
        "custom_date"
      ].forEach(function (name) {
        setText(name, getValue(name));
      });

      setText("chimney_a_aglova", addCm(getValue("chimney_a_aglova")));
      setText("chimney_b_aglova", addCm(getValue("chimney_b_aglova")));

      setText("bar_combined", combined("bar_len_aglova", "bar_width_aglova", true));
      setText("island_combined", combined("island_len_aglova", "island_width_aglova", true));
      setText("meeting_combined", meetingCombined());
    }

    function selectedImgInField(fieldName, cardSelector) {
      var wrap = qs(flow, '[data-field="' + fieldName + '"]');
      if (!wrap) return "";

      var selector = cardSelector || ".vision-card";

      var card =
        qs(wrap, selector + ".vm-selected") ||
        qs(wrap, selector + ".is-selected") ||
        qs(wrap, selector + ".active");

      if (!card) return "";

      var img = qs(card, "img");
      return img ? img.currentSrc || img.src || "" : "";
    }

    function setSuccessImage(key, src) {
      qsa(formBlock, '[data-success-img="' + key + '"]').forEach(function (img) {
        if (!src) {
          img.style.display = "none";
          return;
        }

        img.src = src;
        img.style.display = "block";
        img.style.width = "100%";
        img.style.maxWidth = "160px";
        img.style.height = "110px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "12px";
      });
    }

    function fillImages() {
      setSuccessImage("upper_finish", selectedImgInField("upper_finish", ".vision-card"));
      setSuccessImage("lower_finish", selectedImgInField("lower_finish", ".vision-card"));
      setSuccessImage("countertop_finish", selectedImgInField("countertop_finish", ".vision-card"));
      setSuccessImage("backsplash_finish", selectedImgInField("backsplash_finish", ".vision-card"));

      setSuccessImage(
        "inspiration_card_aglova",
        selectedImgInField("inspiration_card_aglova", ".inspiration-card") ||
        selectedImgInField("inspiration", ".inspiration-card")
      );
    }

    function renderSuccess() {
      fillTexts();
      renderCadPreview();
      fillImages();
    }

    form.addEventListener("submit", function () {
      setTimeout(renderSuccess, 400);
      setTimeout(renderSuccess, 1000);
      setTimeout(renderSuccess, 1800);
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    function lockInspiration() {
      var card = document.querySelector(".success-inspiration-card");
      var img = document.querySelector(".success-inspiration-img");

      if (!card || !img) return;

      img.classList.remove("success-vision-img");

      card.style.setProperty("width", "100%", "important");
      card.style.setProperty("height", "285px", "important");
      card.style.setProperty("min-height", "285px", "important");
      card.style.setProperty("overflow", "hidden", "important");
      card.style.setProperty("display", "block", "important");
      card.style.setProperty("border-radius", "12px", "important");

      img.style.setProperty("width", "100%", "important");
      img.style.setProperty("height", "100%", "important");
      img.style.setProperty("min-height", "285px", "important");
      img.style.setProperty("max-height", "285px", "important");
      img.style.setProperty("object-fit", "cover", "important");
      img.style.setProperty("object-position", "center center", "important");
      img.style.setProperty("display", "block", "important");
      img.style.setProperty("border-radius", "12px", "important");
    }

    function startPermanentLock() {
      lockInspiration();

      var observer = new MutationObserver(function () {
        requestAnimationFrame(lockInspiration);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "src"]
      });

      setInterval(lockInspiration, 500);
    }

    qsa(document, "form").forEach(function (form) {
      form.addEventListener("submit", function () {
        setTimeout(startPermanentLock, 100);
      });
    });
  });

  document.addEventListener("DOMContentLoaded", function () {
    function getNote(fieldName, noteName) {
      var wrap = qs(document, '[data-field="' + fieldName + '"]');

      var visible =
        wrap &&
        (
          qs(wrap, "textarea:not([type='hidden'])") ||
          qs(wrap, "input:not([type='hidden'])")
        );

      if (visible && clean(visible.value)) return clean(visible.value);

      var hidden = qs(document, '[name="' + noteName + '"]');
      return hidden ? clean(hidden.value) : "";
    }

    function hasRealSelectedCard(fieldName) {
      var wrap = qs(document, '[data-field="' + fieldName + '"]');
      if (!wrap) return false;

      return !!(
        qs(wrap, ".vision-card.active") ||
        qs(wrap, ".vision-card.is-selected") ||
        qs(wrap, ".vision-card.vm-selected")
      );
    }

    function cleanSuccessMaterials() {
      var grid = qs(document, ".success-vision-grid");
      if (!grid) return;

      var cards = qsa(grid, ".success-vision-card");
      if (cards.length < 4) return;

      var items = [
        { field: "upper_finish", note: "upper_finish_note_aglova" },
        { field: "lower_finish", note: "lower_finish_note_aglova" },
        { field: "countertop_finish", note: "countertop_note_aglova" },
        { field: "backsplash_finish", note: "backsplash_note_aglova" }
      ];

      items.forEach(function (item, index) {
        var card = cards[index];
        if (!card) return;

        var noteText = getNote(item.field, item.note);
        var hasSelected = hasRealSelectedCard(item.field);

        var img = qs(card, ".success-vision-img");
        var value = qs(card, ".success-vision-value");

        if (noteText) {
          if (value) value.textContent = noteText;

          if (img) {
            img.removeAttribute("src");
            img.removeAttribute("srcset");
            img.removeAttribute("sizes");
            img.style.setProperty("display", "none", "important");
            img.style.setProperty("visibility", "hidden", "important");
          }

          return;
        }

        if (!hasSelected) {
          if (value) value.textContent = "—";

          if (img) {
            img.removeAttribute("src");
            img.removeAttribute("srcset");
            img.removeAttribute("sizes");
            img.style.setProperty("display", "none", "important");
            img.style.setProperty("visibility", "hidden", "important");
          }
        }
      });
    }

    qsa(document, "form").forEach(function (form) {
      form.addEventListener("submit", function () {
        setTimeout(cleanSuccessMaterials, 300);
        setTimeout(cleanSuccessMaterials, 900);
        setTimeout(cleanSuccessMaterials, 1600);
        setTimeout(cleanSuccessMaterials, 2400);
      });
    });
  });

})();
} catch (error) { console.error("aglova-legacy script 02 failed", error); }

/* ===== script 03: footer:inline ===== */
try {
document.addEventListener("submit", function (e) {
  var form = e.target;
  var flow = document.querySelector(".flow-aglova");
  if (!form || !flow) return;

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function clean(v) {
    return String(v || "").trim();
  }

  function ensureHidden(name) {
    var input = form.querySelector('input[type="hidden"][name="' + name + '"]');

    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }

    return input;
  }

  function setHidden(name, value) {
    ensureHidden(name).value = clean(value);
  }

  function getValue(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return clean(el && el.value);
  }

  function selectedCard(fieldName, cardClass) {
    var wrap = qs(flow, '[data-field="' + fieldName + '"]');
    if (!wrap) return null;

    var selector = cardClass || ".vision-card";

    return qs(wrap, selector + ".vm-selected");
  }

  function cardImg(card) {
    var img = card ? qs(card, "img") : null;
    return img ? clean(img.currentSrc || img.src) : "";
  }

  function hasNote(noteName) {
    return !!getValue(noteName);
  }

  function setMaterialImage(fieldName, noteName, imgName) {
    if (hasNote(noteName)) {
      setHidden(imgName, "");
      return;
    }

    var card = selectedCard(fieldName, ".vision-card");
    setHidden(imgName, cardImg(card));
  }

  var barLen = getValue("bar_len_aglova");
  var barWidth = getValue("bar_width_aglova");
  var islandLen = getValue("island_len_aglova");
  var islandWidth = getValue("island_width_aglova");

  setHidden("bar_combined", barLen || barWidth ? barLen + " × " + barWidth : "");
  setHidden("island_combined", islandLen || islandWidth ? islandLen + " × " + islandWidth : "");

  setMaterialImage("upper_finish", "upper_finish_note_aglova", "upper_finish_img");
  setMaterialImage("lower_finish", "lower_finish_note_aglova", "lower_finish_img");
  setMaterialImage("countertop_finish", "countertop_note_aglova", "countertop_finish_img");
  setMaterialImage("backsplash_finish", "backsplash_note_aglova", "backsplash_finish_img");

  var insp = selectedCard("inspiration_card_aglova", ".inspiration-card");
  setHidden("inspiration_card_aglova_img", cardImg(insp));
}, true);
} catch (error) { console.error("aglova-legacy script 03 failed", error); }

/* ===== script 04: footer:inline ===== */
try {
document.addEventListener("submit", function (e) {
  var form = e.target;
  var flow = document.querySelector(".flow-aglova");
  if (!form || !flow) return;

  function qs(scope, sel) {
    return (scope || document).querySelector(sel);
  }

  function clean(v) {
    return String(v || "").trim();
  }

  function ensureHidden(name) {
    var input = form.querySelector('input[type="hidden"][name="' + name + '"]');

    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      form.appendChild(input);
    }

    return input;
  }

  function cardImg(card) {
    var img = card ? qs(card, "img") : null;
    return img ? clean(img.currentSrc || img.src) : "";
  }

  var card =
    qs(flow, '[data-field="inspiration_card_aglova"] .inspiration-card.vm-selected') ||
    qs(flow, '[data-field="inspiration_card_aglova"] .inspiration-card.is-selected') ||
    qs(flow, '[data-field="inspiration_card_aglova"] .inspiration-card.active') ||
    qs(flow, '[data-field="inspiration"] .inspiration-card.vm-selected') ||
    qs(flow, '[data-field="inspiration"] .inspiration-card.is-selected') ||
    qs(flow, '[data-field="inspiration"] .inspiration-card.active') ||
    qs(flow, ".inspiration-card.vm-selected") ||
    qs(flow, ".inspiration-card.is-selected") ||
    qs(flow, ".inspiration-card.active");

  var imgSrc = cardImg(card);

  if (imgSrc) {
    ensureHidden("inspiration_card_aglova_img").value = imgSrc;
  }
}, true);
} catch (error) { console.error("aglova-legacy script 04 failed", error); }

/* ===== script 05: footer:inline ===== */
try {
document.addEventListener("submit", function (e) {
  var form = e.target;
  if (!form || !form.querySelector('[name="summary_readable"]')) return;

  function clean(v) {
    return String(v || "").trim();
  }

  function get(name) {
    var el = form.querySelector('[name="' + name + '"]');
    return clean(el && el.value);
  }

  function add(params, key) {
    var value = get(key);
    if (!value) return;
    params.set(key, value);
  }

  var keys = [
    "chimney_exists",
    "water_position_aglova",
    "oven_tall_unit_aglova",
    "fridge_type_aglova",
    "bar_enabled_aglova",
    "stena1_len_aglova",
    "stena2_len_aglova",
    "visochina_aglova",
    "chimney_a_aglova",
    "chimney_b_aglova",
    "bar_combined",
    "island_combined",
    "upper_finish",
    "lower_finish",
    "countertop_finish",
    "backsplash_finish",
    "upper_finish_img",
    "lower_finish_img",
    "countertop_finish_img",
    "backsplash_finish_img",
    "dishwasher",
    "washing_machine",
    "microwave",
    "coffee_machine",
    "glass_display",
    "deep_cabinets",
    "more_drawers",
    "lift_mechanisms",
    "counter_lighting",
    "bottle_rack",
    "inspiration_card_aglova",
    "inspiration_card_aglova_img",
    "plan_aglova",
    "meeting_date",
    "meeting_slot",
    "custom_date"
  ];

  var params = new URLSearchParams();

  keys.forEach(function (key) {
    add(params, key);
  });

  var finalLink = window.location.origin + "/aglova-preview?" + params.toString();

  var previewInput =
    form.querySelector('[name="preview_link"]') ||
    document.getElementById("preview_link");

  if (previewInput) {
    previewInput.value =
      "=== НАЧАЛО НА ЛИНКА ===\n" +
      finalLink +
      "\n=== КРАЙ НА ЛИНКА ===";
  }

  console.log("AGLOVA PREVIEW LINK:", finalLink);
}, true);
} catch (error) { console.error("aglova-legacy script 05 failed", error); }

/* ===== script 06: footer:inline ===== */
try {
(function(){
"use strict";
function initAglovaPravaSync(){
  var root=document.querySelector(".flow-aglova");
  if(!root||root.dataset.agPravaSync==="1")return;
  var combo=root.querySelector(".combo-phase-wrap");
  var dims=root.querySelector(".dimensions-phase-wrap");
  if(!combo||!dims)return;
  root.dataset.agPravaSync="1";
  root.classList.add("ag-sync-ready");
  var order=["chimney","water","oven","fridge","center"];
  var fields={chimney:"chimney_exists",water:"water_position_aglova",oven:"oven_tall_unit_aglova",fridge:"fridge_type_aglova",center:"bar_enabled_aglova"};

  function question(step){return combo.querySelector('.question-wrap[data-step="'+step+'"]')}
  function fieldInput(field){return root.querySelector('[name="'+field+'"]')||document.querySelector('[name="'+field+'"]')}
  function hasAnswer(step){
    var q=question(step); if(!q)return true;
    if(q.querySelector(".option-pill.active,.option-pill.is-selected,.option-pill.vm-selected,.option-pill.selected"))return true;
    var inp=fieldInput(fields[step]); return !!(inp&&String(inp.value||"").trim());
  }
  function clearQuestion(step){
    var q=question(step);
    if(q){
      q.classList.remove("ag-choice-warning");
      q.querySelectorAll(".option-pill").forEach(function(p){
        p.classList.remove("active","is-selected","vm-selected","selected");
        p.removeAttribute("aria-pressed");
      });
    }
    var inp=fieldInput(fields[step]);
    if(inp){
      inp.value="";
      try{inp.dispatchEvent(new Event("input",{bubbles:true}))}catch(e){}
      try{inp.dispatchEvent(new Event("change",{bubbles:true}))}catch(e){}
    }
  }
  function clearFrom(index){for(var i=index;i<order.length;i++)clearQuestion(order[i])}
  function showStep(step){
    root.classList.remove("ag-phase-dimensions"); root.classList.add("ag-phase-config");
    order.forEach(function(s){
      var q=question(s); if(!q)return;
      q.classList.toggle("ag-active-question",s===step);
      q.classList.toggle("is-active",s===step);
    });
    root.dataset.agStep=step;
  }
  function showDimensions(){
    root.classList.remove("ag-phase-config"); root.classList.add("ag-phase-dimensions");
    root.dataset.agStep="dimensions";
  }
  function warn(step){
    var q=question(step); if(!q)return;

    var hint=q.querySelector(".question-hint");
    if(!hint){
      hint=document.createElement("div");
      hint.className="question-hint";
      hint.textContent="Изберете вариант, за да продължим.";
      q.appendChild(hint);
    }

    q.classList.remove("ag-choice-warning");
    void q.offsetWidth;
    q.classList.add("ag-choice-warning");
    hint.classList.add("is-visible");

    setTimeout(function(){
      q.classList.remove("ag-choice-warning");
      hint.classList.remove("is-visible");
    },1600);
  }
  function selectVisual(option){
    var row=option.closest(".options-row")||option.parentElement;
    if(row)row.querySelectorAll(".option-pill").forEach(function(p){p.classList.remove("is-selected");p.setAttribute("aria-pressed","false")});
    option.classList.add("is-selected"); option.setAttribute("aria-pressed","true");
  }

  showStep("chimney");

  var firstQuestion=question("chimney");
  if(firstQuestion && !firstQuestion.querySelector(".ag-first-actions")){
    var firstActions=document.createElement("div");
    firstActions.className="question-actions ag-first-actions";

    var firstReset=document.createElement("a");
    firstReset.href="#";
    firstReset.className="nav-btn nav-reset";
    firstReset.setAttribute("data-action","reset-aglova");
    firstReset.textContent="↺ Нулиране";

    var firstNext=document.createElement("a");
    firstNext.href="#";
    firstNext.className="nav-btn nav-next";
    firstNext.setAttribute("data-step-next","water");
    firstNext.textContent="Напред";

    firstActions.appendChild(firstReset);
    firstActions.appendChild(firstNext);
    firstQuestion.appendChild(firstActions);
  }

  root.addEventListener("click",function(e){
    var option=e.target.closest(".combo-phase-wrap .option-pill[data-field]");
    if(option){
      selectVisual(option);
      var q=option.closest(".question-wrap[data-step]");
      var step=q&&q.getAttribute("data-step");
      return;
    }

    var reset=e.target.closest('[data-action="reset-aglova"]');
    if(reset){
      setTimeout(function(){clearFrom(0);showStep("chimney")},50);
      return;
    }

    var back=e.target.closest(".combo-phase-wrap [data-step-back]");
    if(back){
      e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      var target=back.getAttribute("data-step-back");
      var idx=order.indexOf(target);if(idx<0)idx=0;
      clearFrom(idx);showStep(order[idx]);return;
    }

    var next=e.target.closest(".combo-phase-wrap [data-step-next]");
    if(next){
      e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      var current=next.closest(".question-wrap[data-step]");
      var currentStep=current&&current.getAttribute("data-step");
      if(currentStep&&!hasAnswer(currentStep)){warn(currentStep);return}
      var targetStep=next.getAttribute("data-step-next");
      if(order.indexOf(targetStep)>=0)showStep(targetStep);
      return;
    }

    var toDims=e.target.closest('.combo-phase-wrap [data-action="go-dimensions"]');
    if(toDims){
      e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      if(!hasAnswer("center")){warn("center");return}
      showDimensions();return;
    }

    var backToCombo=e.target.closest('.dimensions-phase-wrap [data-action="back-to-combo"]');
    if(backToCombo){
      e.preventDefault();e.stopPropagation();if(e.stopImmediatePropagation)e.stopImmediatePropagation();
      clearFrom(order.length-1);showStep(order[order.length-1]);return;
    }
  },true);

  window.AglovaFlow={showStep:showStep,showDimensions:showDimensions,clearFrom:clearFrom};
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initAglovaPravaSync);
else initAglovaPravaSync();
})();
} catch (error) { console.error("aglova-legacy script 06 failed", error); }
