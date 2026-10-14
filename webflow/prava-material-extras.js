/* Prava material extras (additive; no other script is edited).
   1) Grain direction: when a wood decor is selected for the upper or lower row (or the deep row), two buttons choose a
      vertical or horizontal grain. The choice is stored in hidden inputs upper_grain / lower_grain / deep_grain, redraws the
      3D sketch (prava-layout.js) and is passed to the AI visualization through the sketch picture and its feature key.
   2) Deep upper row colour: when the configuration (step 2) has "deep cabinets", a step is inserted between "Горен ред"
      and "Долен ред" where the deep row gets its own colour (default: the same as the upper row).
   The step flow itself is untouched: this script only intercepts Next/Back at that one spot. */
(function () {
  'use strict';
  var KINDS = { wood: 'Дървесни', solid: 'Едноцветни', stone: 'Камък', metal: 'Метал', structure: 'Структура' };
  var page, flow, upperWrap, lowerWrap, panel, deepInput, deepGrainInput, deepGrainBox, sameBtn, deepShown = false, extraSeg = null;
  var cat = { items: [], base: '' };

  function $(s, r) { return (r || page).querySelector(s); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function fire(node, type) { node.dispatchEvent(new Event(type, { bubbles: true })); }
  function pillValue(field) { var p = $('[data-field="' + field + '"] .option-pill.is-selected,[data-field="' + field + '"] .option-pill.active'); return p ? String(p.dataset.value || '') : ''; }
  function deepOn() { return pillValue('deep_cabinets') === 'yes'; }
  function hiddenInput(parent, name, value) { var i = parent.querySelector('input[name="' + name + '"]'); if (!i) { i = el('input'); i.type = 'hidden'; i.name = name; i.value = value; parent.appendChild(i); } return i; }
  function categoryOf(id) { for (var i = 0; i < cat.items.length; i++) if (cat.items[i][0] === id) return cat.items[i][2]; return ''; }
  function isGloss(id) { return !!(window.pravaGloss && window.pravaGloss.has(id)); }

  function css() {
    var s = el('style');
    s.textContent = '.sf-page-prava .prava-grain{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:0 0 14px;padding:10px 12px;border:1px solid var(--prava-line,#d9ddd5);border-radius:8px;background:#fff}' +
      '.sf-page-prava .prava-grain[hidden]{display:none}' +
      '.sf-page-prava .prava-grain-title{font-size:13px;font-weight:600;color:#2f372f;margin-right:4px}' +
      '.sf-page-prava .prava-grain button,.sf-page-prava .prava-deep-same{min-height:38px;padding:6px 14px;border:1px solid var(--prava-line,#cfd4cb);border-radius:6px;background:#fff;color:#2f372f;font:inherit;font-size:13px;cursor:pointer}' +
      '.sf-page-prava .prava-grain button.is-on,.sf-page-prava .prava-deep-same.is-on{background:#2f372f;border-color:#2f372f;color:#fff}' +
      '.sf-page-prava .prava-grain-note{font-size:12px;color:#606760}' +
      '.sf-page-prava .prava-global-progress-track:has(.prava-global-progress-seg[data-extra]){grid-template-columns:repeat(11,minmax(0,1fr))}' +
      '.sf-page-prava .prava-deep-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px}';
    document.head.appendChild(s);
  }

  /* ---------- grain buttons */
  function makeGrain(container, before, input, afterChange) {
    var box = el('div', 'prava-grain'); box.hidden = true;
    box.appendChild(el('span', 'prava-grain-title', 'Посока на шарката'));
    var bv = el('button', '', 'Вертикална'), bh = el('button', '', 'Хоризонтална'); bv.type = bh.type = 'button'; bv.dataset.g = 'v'; bh.dataset.g = 'h';
    box.append(bv, bh, el('span', 'prava-grain-note', 'Важи за всички врати от реда – шарката продължава от врата на врата.'));
    function paint() { var v = input.value === 'h' ? 'h' : 'v'; bv.classList.toggle('is-on', v === 'v'); bh.classList.toggle('is-on', v === 'h'); bv.setAttribute('aria-pressed', String(v === 'v')); bh.setAttribute('aria-pressed', String(v === 'h')); }
    [bv, bh].forEach(function (b) { b.addEventListener('click', function (e) { e.preventDefault(); input.value = b.dataset.g; paint(); fire(input, 'input'); fire(input, 'change'); if (afterChange) afterChange(); }); });
    if (before) before.parentNode.insertBefore(box, before); else container.appendChild(box);
    paint(); box.paint = paint; return box;
  }
  function setupRow(wrap, role) {
    var controls = $('.prava-material-controls', wrap); if (!controls) return null;
    var field = role + '_finish', id = hiddenInput(wrap, role + '_grain', 'v');
    var box = makeGrain(wrap, controls, id, function () { syncDeepGrain(); });
    function sync() { var sel = $('input[name="' + field + '"]', wrap) || $('input[name="' + field + '"]'); box.hidden = categoryOf(sel && sel.value) !== 'wood'; }
    page.addEventListener('change', sync); page.addEventListener('input', sync); page.addEventListener('click', function () { setTimeout(sync, 60); });
    sync(); return { box: box, input: id, sync: sync };
  }
  function syncDeepGrain() {
    if (!deepGrainInput) return;
    var same = !deepInput.value, up = $('input[name="upper_grain"]');
    if (same && up && deepGrainInput.value !== up.value) { deepGrainInput.value = up.value; fire(deepGrainInput, 'change'); }
  }

  /* ---------- deep row step */
  function buildPanel() {
    panel = el('div', 'question-wrap question-wrap-vision prava-deep-panel'); panel.hidden = true; panel.inert = true; panel.setAttribute('data-prava-phase', '3');
    panel.appendChild(el('p', 'finish-card-copy', 'Изберете цвят за дълбокия горен ред. Ако не изберете, ще е същият като горния ред.'));
    var actions = el('div', 'prava-deep-actions');
    sameBtn = el('button', 'prava-deep-same is-on', 'Като горния ред'); sameBtn.type = 'button'; actions.appendChild(sameBtn); panel.appendChild(actions);
    deepInput = hiddenInput(panel, 'deep_finish', ''); deepGrainInput = hiddenInput(panel, 'deep_grain', 'v');
    deepGrainBox = makeGrain(panel, null, deepGrainInput, null);

    var controls = el('div', 'prava-material-controls');
    function lab(text, node) { var l = el('label', '', text); l.appendChild(node); controls.appendChild(l); return node; }
    var gl = el('select'); [['all', 'Всички'], ['gloss', 'Гланц']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; gl.appendChild(op); }); lab('Покритие', gl);
    var kinds = el('select'), seen = {}; var all = el('option', '', 'Всички'); all.value = 'all'; kinds.appendChild(all);
    cat.items.forEach(function (r) { if (!seen[r[2]]) { seen[r[2]] = 1; var op = el('option', '', KINDS[r[2]] || r[2]); op.value = r[2]; kinds.appendChild(op); } }); lab('Категория', kinds);
    var sl = el('label', 'prava-material-search', 'Търсене'), search = el('input'); search.type = 'search'; search.placeholder = 'Код, име или производител'; sl.appendChild(search); controls.appendChild(sl);
    panel.appendChild(controls);

    var gallery = el('div', 'material-gallery'), meta = el('div', 'material-gallery-meta'), count = el('span'); meta.appendChild(count);
    var grid = el('div', 'material-gallery-grid'), nav = el('div', 'material-gallery-nav'), pages = el('div', 'material-gallery-pages'), status = el('div', 'material-gallery-page-status');
    nav.append(pages, status); gallery.append(meta, grid, nav); panel.appendChild(gallery);

    var cur = 1, query = '';
    function rows() {
      return cat.items.filter(function (r) {
        return (kinds.value === 'all' || r[2] === kinds.value) && (gl.value !== 'gloss' || isGloss(r[0])) &&
          (!query || [r[1], r[3], r[4]].join(' ').toLocaleLowerCase('bg').indexOf(query) >= 0);
      });
    }
    function render() {
      var rs = rows(), total = Math.max(1, Math.ceil(rs.length / 10)); cur = Math.max(1, Math.min(cur, total));
      count.textContent = rs.length + ' материала'; status.textContent = 'Стр. ' + cur + ' от ' + total; grid.replaceChildren();
      rs.slice((cur - 1) * 10, cur * 10).forEach(function (r) {
        var b = el('button', 'material-card vision-card'); b.type = 'button'; b.dataset.value = b.dataset.decorId = r[0]; b.dataset.category = r[2];
        var on = deepInput.value === r[0]; b.classList.toggle('vm-selected', on); b.setAttribute('aria-pressed', String(on));
        var img = el('img'); img.loading = 'lazy'; img.src = cat.base + encodeURIComponent(r[5]); img.alt = [r[1], r[3], r[4]].join(' ');
        var copy = el('div', 'material-card-copy'); copy.append(el('strong', 'material-card-code', r[3]), el('span', 'vision-card-label', r[4]), el('small', 'material-card-brand', r[1] + (isGloss(r[0]) ? ' · гланц' : '')));
        b.append(img, copy);
        b.addEventListener('click', function () { deepInput.value = r[0]; fire(deepInput, 'input'); fire(deepInput, 'change'); refresh(); });
        grid.appendChild(b);
      });
      if (!rs.length) grid.appendChild(el('p', '', 'Няма материали за тези филтри.'));
      pages.replaceChildren();
      var shown = {}; [1, total, cur - 1, cur, cur + 1].forEach(function (n) { if (n >= 1 && n <= total) shown[n] = 1; });
      var prev = 0; Object.keys(shown).map(Number).sort(function (a, b) { return a - b; }).forEach(function (n) {
        if (prev && n > prev + 1) pages.appendChild(el('span', '', '…'));
        var pb = el('button', 'page-btn' + (n === cur ? ' is-active' : ''), String(n)); pb.type = 'button'; pb.setAttribute('aria-label', 'Страница ' + n);
        pb.addEventListener('click', function () { cur = n; render(); }); pages.appendChild(pb); prev = n;
      });
    }
    function refresh() {
      var same = !deepInput.value; sameBtn.classList.toggle('is-on', same); sameBtn.setAttribute('aria-pressed', String(same));
      if (same) syncDeepGrain();
      deepGrainBox.hidden = same || categoryOf(deepInput.value) !== 'wood'; deepGrainBox.paint();
      render();
    }
    sameBtn.addEventListener('click', function () { deepInput.value = ''; fire(deepInput, 'input'); fire(deepInput, 'change'); refresh(); });
    gl.addEventListener('change', function () { cur = 1; render(); }); kinds.addEventListener('change', function () { cur = 1; render(); });
    search.addEventListener('input', function () { query = search.value.trim().toLocaleLowerCase('bg'); cur = 1; render(); });
    panel.refresh = refresh; refresh();
    upperWrap.parentNode.insertBefore(panel, upperWrap.nextSibling);
  }

  function progressEls() { return { title: $('.prava-global-progress-title'), count: $('.prava-global-progress-count'), bar: $('.prava-global-progress'), segs: [].slice.call(page.querySelectorAll('.prava-global-progress-seg:not([data-extra])')) }; }
  function relabel() {
    var p = progressEls(); if (!p.bar) return;
    var on = deepOn(), st = flow.getStep();
    if (on && !extraSeg && p.segs[2]) { extraSeg = p.segs[2].cloneNode(false); extraSeg.dataset.extra = '1'; extraSeg.className = 'prava-global-progress-seg'; p.segs[2].after(extraSeg); }
    if (!on && extraSeg) { extraSeg.remove(); extraSeg = null; }
    var total = on ? 11 : 10; p.bar.setAttribute('aria-valuemax', String(total));
    if (st === 10 || !p.count) return;
    var shownStep = deepShown ? 4 : (on && st >= 4 ? st + 1 : st);
    var title = deepShown ? 'Дълбок горен ред' : p.title && p.title.textContent;
    if (deepShown && p.title) p.title.textContent = title;
    p.count.textContent = 'Стъпка ' + shownStep + ' от ' + total; p.bar.setAttribute('aria-valuenow', String(shownStep)); p.bar.setAttribute('aria-valuetext', p.count.textContent + ' — ' + title);
    if (extraSeg) {
      extraSeg.classList.toggle('is-active', deepShown); extraSeg.classList.toggle('is-done', !deepShown && st >= 4);
      if (deepShown && p.segs[2]) { p.segs[2].classList.add('is-done'); p.segs[2].classList.remove('is-active'); }
    }
    var heading = $('#prava-step-heading'); if (deepShown && heading) heading.textContent = 'Дълбок горен ред';
  }
  function showDeep() {
    if (!panel) buildPanel();
    deepShown = true; upperWrap.hidden = true; upperWrap.inert = true; if (lowerWrap) { lowerWrap.hidden = true; lowerWrap.inert = true; }
    panel.hidden = false; panel.inert = false; panel.refresh(); relabel();
    var h = $('.prava-step-header') || $('#prava-step-heading'); if (h) h.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  function hideDeep() { deepShown = false; if (panel) { panel.hidden = true; panel.inert = true; } }

  function onClick(e) {
    var c = e.target.closest('[data-prava-nav],.prava-back-control-v3'); if (!c) return;
    var back = c.dataset.pravaNav === 'back' || c.classList.contains('prava-back-control-v3'), next = c.dataset.pravaNav === 'next', st = flow.getStep();
    if (deepShown) {
      e.preventDefault(); e.stopImmediatePropagation();
      hideDeep(); if (next) window.pravaGoToStep(4); else window.pravaGoToStep(3, false);
      setTimeout(relabel, 0); return;
    }
    if (deepOn() && ((next && st === 3) || (back && st === 4))) {
      e.preventDefault(); e.stopImmediatePropagation();
      if (st === 4) window.pravaGoToStep(3, false);
      showDeep();
    }
  }

  /* ---------- quote request: add grain and deep-row colour to the preview link / note that the company receives */
  function describe(field, role) {
    var input = $('input[name="' + field + '"]'), id = input && input.value, row = null;
    for (var i = 0; i < cat.items.length; i++) if (cat.items[i][0] === id) row = cat.items[i];
    var grain = $('input[name="' + role + '_grain"]'), parts = [];
    if (row) parts.push([row[1], row[3], row[4]].filter(Boolean).join(' ') + (isGloss(id) ? ', гланц' : ''));
    if (row && row[2] === 'wood' && grain) parts.push('шарка ' + (grain.value === 'h' ? 'хоризонтална' : 'вертикална'));
    return parts.join(', ');
  }
  function onSubmit(e) {
    var form = e.target, link = form && form.querySelector && form.querySelector('[name="preview_link"]');
    if (!link || !link.value || link.value.indexOf('Допълнително:') >= 0) return;
    var qs = new URLSearchParams(), notes = [];
    ['upper', 'lower'].forEach(function (role) {
      var g = $('input[name="' + role + '_grain"]'); if (g && categoryOf(($('input[name="' + role + '_finish"]') || {}).value) === 'wood') { qs.set(role + '_grain', g.value); notes.push((role === 'upper' ? 'Горен ред' : 'Долен ред') + ': шарка ' + (g.value === 'h' ? 'хоризонтална' : 'вертикална')); }
    });
    if (deepOn()) {
      var d = describe('deep_finish', 'deep');
      if (deepInput && deepInput.value) { qs.set('deep_finish', deepInput.value); qs.set('deep_grain', deepGrainInput.value); }
      notes.push('Дълбок горен ред: ' + (d || 'същият като горния ред'));
    }
    if (!notes.length) return;
    var end = '\n=== КРАЙ НА ЛИНКА ===', q = qs.toString();
    if (q && link.value.indexOf(end) > 0) link.value = link.value.replace(end, '&' + q + end);
    link.value += '\nДопълнително: ' + notes.join('; ');
  }

  function init() {
    page = document.querySelector('.sf-page-prava'); flow = window.pravaFlow;
    upperWrap = $('.question-wrap-vision[data-field="upper_finish"]'); lowerWrap = $('.question-wrap-vision[data-field="lower_finish"]');
    var script = upperWrap && $('script[data-prava-catalog]', upperWrap); if (!script) return;
    try { var j = JSON.parse(script.textContent); cat.items = j.items; cat.base = j.base; } catch (e) { return; }
    css(); setupRow(upperWrap, 'upper'); setupRow(lowerWrap, 'lower');
    buildPanel();
    page.addEventListener('click', onClick, true);
    var form = page.querySelector('form'); if (form) form.addEventListener('submit', onSubmit, true);
    page.addEventListener('prava:phase-changed', function () { if (deepShown) hideDeep(); setTimeout(relabel, 0); });
    page.addEventListener('change', function () { setTimeout(relabel, 0); }); relabel();
  }
  function boot() {
    var tries = 0;
    (function wait() {
      var p = document.querySelector('.sf-page-prava');
      if (p && window.pravaFlow && p.querySelector('.question-wrap-vision[data-field="upper_finish"] .prava-material-controls') && p.querySelector('.question-wrap-vision[data-field="lower_finish"] .prava-material-controls')) { init(); return; }
      if (++tries < 150) setTimeout(wait, 100);
    })();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
