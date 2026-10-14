/* Aglova steps 7 and 8 made identical to Prava: appliance drop-downs (step 7) and the same extras checkboxes (step 8).
   Submission keeps using the legacy keys (dishwasher, washing_machine, ... ) so the e-mail, summary and preview link still work. */
(function () {
  'use strict';
  var APPLIANCES = [
    ['dishwasher', 'Миялна', 'dishwasher_type', [['built_in_45', 'За вграждане 45 см'], ['built_in_60', 'За вграждане 60 см'], ['free_standing_45', 'Свободно стояща 45 см'], ['free_standing_60', 'Свободно стояща 60 см']]],
    ['washing_machine', 'Пералня', 'washing_machine_type', [['free_standing', 'Свободно стояща'], ['built_in', 'За вграждане']]],
    ['microwave', 'Микровълнова', 'microwave_type', [['free_standing', 'Свободно стояща'], ['built_in', 'За вграждане']]],
    ['coffee_machine', 'Кафе-машина', 'coffee_machine_type', [['free_standing', 'Свободно стояща'], ['built_in', 'За вграждане']]]
  ];
  // Prava's order and wording. [key, label, isNew]
  var EXTRAS = [['glass_display', 'Витрина с осветление'], ['handleless', 'Визия без дръжки'], ['more_drawers', 'Повече чекмеджета в долния ред'],
    ['lift_mechanisms', 'Повдигащи механизми в горния ред'], ['panel_doors', 'Таблени вратички'], ['counter_lighting', 'Осветление над плота'], ['bottle_rack', 'Кошница за бутилки']];

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function hide(n) { if (n) n.setAttribute('data-ag-hide', '1'); }
  function hiddenInput(form, name) {
    var i = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (!i) { i = document.createElement('input'); i.type = 'hidden'; i.name = name; form.append(i); }
    return i;
  }

  function appliances(root, card) {
    var form = card.closest('form') || root.closest('form') || document.querySelector('form');
    card.querySelectorAll('.extras-title-subtitle .phase-title').forEach(hide);
    card.querySelectorAll('label.w-checkbox').forEach(function (l) { hide(l); var c = l.querySelector('input[type="checkbox"]'); if (c) c.checked = false; });
    var anchor = card.querySelector('.extras-title-subtitle') || card.firstElementChild;
    var last = anchor;
    APPLIANCES.forEach(function (a) {
      var holder = el('div', 'w-embed'), row = el('div', 'prava-appliance-select-row');
      var id = 'ag-' + a[2].replace(/_/g, '-');
      var label = el('label', '', a[1]); label.htmlFor = id;
      var select = document.createElement('select'); select.id = id; select.name = a[2]; select.dataset.field = a[2];
      var none = el('option', '', 'Не е избрана'); none.value = ''; select.append(none);
      a[3].forEach(function (o) { var opt = el('option', '', o[1]); opt.value = o[0]; select.append(opt); });
      row.append(label, select); holder.append(row);
      last.after(holder); last = holder;
      var legacy = hiddenInput(form, a[0]);
      select.addEventListener('change', function () {
        legacy.value = select.value ? select.options[select.selectedIndex].text : '';
        legacy.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  function extras(card) {
    var form = card.closest('form') || document.querySelector('form');
    ['handleless', 'panel_doors'].forEach(function (k) { if (form) hiddenInput(form, k); }); // filled by the legacy submit handler
    var anchor = card.querySelector('.extras-title-subtitle');
    if (anchor) anchor.querySelectorAll('.phase-title').forEach(hide);
    var keyOf = function (l) { var b = l.querySelector('input[type="checkbox"]'); return l.getAttribute('data-field') || (b && b.getAttribute('data-checkbox-field')) || ''; };
    var labels = [].slice.call(card.querySelectorAll('label.w-checkbox'));
    var template = labels[0];
    if (!template) return;
    var byKey = {};
    labels.forEach(function (l) {
      var key = keyOf(l);
      if (EXTRAS.some(function (e) { return e[0] === key; })) byKey[key] = l;
      else { hide(l); var b = l.querySelector('input[type="checkbox"]'); if (b) b.checked = false; }   // e.g. deep cabinets: a step-1 question in Prava
    });
    var previous = null;
    EXTRAS.forEach(function (e) {
      var label = byKey[e[0]];
      if (!label) {
        label = template.cloneNode(true);
        label.removeAttribute('data-ag-hide'); label.setAttribute('data-field', e[0]);
        var box = label.querySelector('input[type="checkbox"]');
        box.checked = false; box.setAttribute('data-checkbox-field', e[0]); box.setAttribute('data-name', e[1]); box.name = 'checkbox';
        box.classList.remove('w-checkbox-input--checked');
        var custom = label.querySelector('.w-checkbox-input'); if (custom) custom.classList.remove('w--redirected-checked');
        template.parentNode.append(label);
      }
      var text = label.querySelector('.w-form-label'); if (text) text.textContent = e[1];
      if (previous) previous.after(label); else if (anchor) anchor.after(label); else template.parentNode.prepend(label);
      previous = label;
    });
  }

  function init() {
    var root = document.querySelector('.flow-aglova');
    if (!root || root.dataset.agExtras) return;
    var cards = root.querySelectorAll('.prava-extras-card');
    if (cards.length < 2) return;
    root.dataset.agExtras = '1';
    appliances(root, cards[0]);
    extras(cards[1]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 100); }, { once: true });
  else setTimeout(init, 100);
})();
