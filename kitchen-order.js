/* All three kitchens (Права / Ъглова / П-образна), last step: when the form is sent, the whole order also goes to
   /contract-automation/api/kitchen-order. The backend writes the readable e-mail (summary, sketch, AI picture, cut list +
   SketchUp file), puts the chosen slot into the Booked Slots CMS as "pending" and mails the client.
   The native Webflow submission stays untouched (it is the backup). */
(function () {
  'use strict';
  var ENDPOINT = location.origin + '/contract-automation/api/kitchen-order';
  var KITCHENS = [
    { id: 'prava', root: '.sf-page-prava', layout: 'pravaLayout', mats: 'pravaMaterialSelections', ai: '__pravaAiLastResponseId' },
    { id: 'aglova', root: '.flow-aglova', layout: 'agLayout', mats: 'agMaterialSelections', ai: '__agAiLastResponseId' },
    { id: 'p', root: '.sf-page-p', layout: 'pLayout', mats: 'pMaterialSelections', ai: '__pAiLastResponseId' }
  ];
  function clean(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function kitchen() { for (var i = 0; i < KITCHENS.length; i++) { var k = KITCHENS[i], el = document.querySelector(k.root); if (el) return { k: k, page: el }; } return null; }

  function val(form, sel) { var list = form.querySelectorAll(sel); for (var i = 0; i < list.length; i++) { var v = clean(list[i].value); if (v) return v; } return ''; }

  function contact(form) {
    return {
      name: val(form, 'input[name="Name"],input[name="name"],input[id$="final-name"],input[name$="final_name"]'),
      email: val(form, 'input[type="email"],input[name="Email"],input[name="email"],input[name$="final_email"]'),
      phone: val(form, 'input[type="tel"],input[name="Phone"],input[name="phone"],input[name$="final_phone"],input[id$="final-phone"]')
    };
  }

  // the step-9 "Вашият избор" card is the readable version of every answer; it is grouped by its block titles
  function summary(page) {
    var box = page.querySelector('[id$="step9-summary"]'), out = [];
    if (!box) return out;
    box.querySelectorAll('[class*="summary-row"]').forEach(function (row) {
      var label = row.querySelector('[class*="summary-label"]'), value = row.querySelector('[class*="summary-valueclick"],[class*="summary-value"]');
      var block = row.closest('[class*="choice-block"]'), title = block && block.querySelector('[class*="choice-title"]');
      var l = clean(label && label.textContent), v = clean(value && value.textContent);
      if (l && v) out.push({ group: clean(title && title.textContent) || 'Конфигурация', label: l, value: v });
    });
    return out;
  }

  function materials(k) {
    var src = window[k.mats], out = {};
    if (!src || typeof src.get !== 'function') return out;
    ['upper', 'lower', 'deep', 'countertop', 'backsplash'].forEach(function (role) {
      var r = null; try { r = src.get(role + '_finish'); } catch (e) { r = null; }
      if (!r) return;
      out[role] = { id: clean(r.value || r.id), label: clean(r.label || r.displayName || r.decorName || r.value), manufacturer: clean(r.manufacturer), code: clean(r.decorCode || r.surfaceCode), image: clean(r.sampleImageUrl) };
    });
    return out;
  }

  function build(form, found) {
    var k = found.k, page = found.page, layout = window[k.layout] || null, sketch = null, current = null;
    try { sketch = layout && typeof layout.capture === 'function' ? layout.capture() : null; } catch (e) { sketch = null; }
    try { current = layout && layout.current ? JSON.parse(JSON.stringify(layout.current)) : null; } catch (e) { current = null; }
    var note = val(form, 'textarea[name="final_note"],[data-field="final_note"] textarea,textarea[data-field="final_note"]');
    return {
      kitchen: k.id,
      page: location.href.split('#')[0],
      contact: contact(form),
      meeting: { date: val(form, 'input[name="meeting_date"]'), slot: val(form, 'input[name="meeting_slot"]'), custom: val(form, 'input[name="custom_date"]') },
      note: note,
      summary: summary(page),
      materials: materials(k),
      layout: current,
      aiResponseId: clean(window[k.ai]) || null,
      sketchImage: sketch
    };
  }

  function showNumber(form, number) {
    var block = form.closest('.w-form'), done = block && block.querySelector('.w-form-done');
    if (!done || done.querySelector('.kitchen-order-number')) return;
    var p = document.createElement('div'); p.className = 'kitchen-order-number';
    p.style.cssText = 'margin-top:10px;font-weight:600';
    p.textContent = 'Номер на заявката: ' + number + '. Изпратихме потвърждение и на вашия e-mail.';
    done.appendChild(p);
  }

  // booking calendar colours (all three kitchens): waiting for a phone confirmation = yellow, confirmed = red
  function slotColours() {
    if (document.getElementById('kitchen-slot-colours')) return;
    var st = document.createElement('style'); st.id = 'kitchen-slot-colours';
    st.textContent =
      '.booking-slot.is-pending{background:#fff3c4!important;border-color:#e2c04a!important;color:#7a5a00!important;cursor:not-allowed!important}' +
      '.booking-slot.is-local-locked:not(.is-selected):not(.is-pending):not(.is-booked){opacity:.45!important;cursor:not-allowed!important}' +
      '.booking-slot.is-booked{background:#fde2df!important;border-color:#e39a92!important;color:#9b1c10!important;cursor:not-allowed!important;text-decoration:line-through}' +
      '.booking-slot.is-pending::after{content:" · чака";font-size:.85em}.booking-slot.is-booked::after{content:" · зает";font-size:.85em}';
    document.head.appendChild(st);
  }

  function init() {
    slotColours();
    var found = kitchen(); if (!found) return;
    var form = found.page.querySelector('form') || document.querySelector('form'); if (!form || form.dataset.kitchenOrder) return;
    form.dataset.kitchenOrder = '1';
    var sent = false;
    form.addEventListener('submit', function () {
      if (sent) return;
      var payload; try { payload = build(form, found); } catch (e) { return; }
      if (!payload.contact.email && !payload.contact.phone) return;   // the native validation will stop this one anyway
      sent = true;
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d && d.ok && d.number) { var tries = 0; (function wait() { var b = form.closest('.w-form'), done = b && b.querySelector('.w-form-done'); if (done && done.offsetParent) showNumber(form, d.number); else if (++tries < 40) setTimeout(wait, 250); })(); } else sent = false; })
        .catch(function () { sent = false; });
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
