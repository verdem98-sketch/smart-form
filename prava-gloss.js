/* Prava: high-gloss decors.
   1) window.pravaGloss = list of gloss decor ids (used by the 3D sketch and the step-9 payload);
   2) a "Покритие: Всички / Гланц" filter for the upper / lower cabinet decor galleries (steps 3-4).
   Source of the list: Kronospan "Feelness High Gloss" PET-laminated MDF (HG/BS; confirmed on kronospan.com and in the
   ЯФ България shop) and EGGER PerfectSense Gloss (PG) MDF. Plain EGGER chipboard decors and worktops are not gloss. */
(function (root) {
  'use strict';
  var IDS = [
    'kronospan_0112', 'kronospan_0164', 'kronospan_0171', 'kronospan_0190', 'kronospan_0564',
    'kronospan_5981', 'kronospan_6299', 'kronospan_7045', 'kronospan_7166', 'kronospan_8685',
    'egger-perfectsense_u702', 'egger-perfectsense_u708', 'egger-perfectsense_u732', 'egger-perfectsense_u961',
    'egger-perfectsense_u999', 'egger-perfectsense_w1000', 'egger-perfectsense_w1100'
  ];
  var set = {}; IDS.forEach(function (id) { set[id] = 1; });
  root.pravaGloss = { ids: IDS, has: function (id) { return !!set[String(id || '')]; } };
  if (typeof document === 'undefined') return;

  function init() {
    var page = document.querySelector('.sf-page-prava'); if (!page) return;
    page.querySelectorAll('script[data-prava-catalog]').forEach(function (script) {
      var wrap = script.closest('.question-wrap-vision'); if (!wrap) return;
      var field = wrap.dataset.field; if (field !== 'upper_finish' && field !== 'lower_finish') return;
      var host = script.parentElement, controls = host.querySelector('.prava-material-controls');
      if (!controls || controls.querySelector('[data-prava-finish]')) return;
      var source; try { source = JSON.parse(script.textContent); } catch (e) { return; }
      var grid = host.querySelector('.material-gallery-grid'), pages = host.querySelector('[id$="-pages"]'), count = host.querySelector('[id$="-count"]'), status = host.querySelector('[id$="-page-status"]'), more = host.querySelector('[id$="-more"]');
      if (!grid || !pages) return;
      var glossRows = source.items.filter(function (r) { return root.pravaGloss.has(r[0]); });
      var label = document.createElement('label'); label.textContent = 'Покритие';
      var sel = document.createElement('select'); sel.dataset.pravaFinish = '1'; sel.setAttribute('aria-label', 'Покритие');
      [['all', 'Всички'], ['gloss', 'Гланц']].forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; sel.append(op); });
      label.append(sel); controls.insertBefore(label, controls.firstChild);
      var myGrid = document.createElement('div'); myGrid.className = grid.className; myGrid.hidden = true; grid.parentNode.insertBefore(myGrid, grid.nextSibling);
      var myPages = document.createElement('div'); myPages.className = pages.className; myPages.hidden = true; pages.parentNode.insertBefore(myPages, pages.nextSibling);
      var cur = 1;
      function active() { return sel.value === 'gloss'; }
      function val(kind) { var s = controls.querySelector('select[data-prava-filter="' + kind + '"]'); return s ? s.value : 'all'; }
      function rows() {
        var man = val('manufacturer'), cat = val('category'), sub = val('substrate'), q = ((controls.querySelector('input[type="search"]') || {}).value || '').trim().toLocaleLowerCase('bg');
        return glossRows.filter(function (r) {
          return (man === 'all' || r[1] === man) && (cat === 'all' || r[2] === cat) &&
            (sub === 'all' || ((source.substrates || {})[sub] || []).indexOf(String(r[3]).toUpperCase()) >= 0) &&
            (!q || [r[1], r[3], r[4]].join(' ').toLocaleLowerCase('bg').indexOf(q) >= 0);
        });
      }
      function render() {
        var on = active(); grid.hidden = on; pages.hidden = on; myGrid.hidden = !on; myPages.hidden = !on; if (more) more.hidden = on || more.hidden;
        if (!on) return;
        var rs = rows(), total = Math.max(1, Math.ceil(rs.length / 10)); cur = Math.max(1, Math.min(cur, total));
        var hidden = page.querySelector('input[name="' + field + '"]'), selected = hidden && hidden.value;
        myGrid.replaceChildren(); if (count) count.textContent = rs.length + ' материала'; if (status) status.textContent = 'Стр. ' + cur + ' от ' + total;
        rs.slice((cur - 1) * 10, cur * 10).forEach(function (row) {
          var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'material-card vision-card'; btn.dataset.value = btn.dataset.decorId = row[0]; btn.dataset.manufacturer = row[1]; btn.dataset.category = row[2];
          btn.classList.toggle('vm-selected', selected === row[0]); btn.setAttribute('aria-pressed', String(selected === row[0]));
          var img = document.createElement('img'); img.loading = 'lazy'; img.src = source.base + encodeURIComponent(row[5]); img.alt = [row[1], row[3], row[4]].join(' ');
          var copy = document.createElement('div'); copy.className = 'material-card-copy';
          var code = document.createElement('strong'); code.className = 'material-card-code'; code.textContent = row[3];
          var name = document.createElement('span'); name.className = 'vision-card-label'; name.textContent = row[4];
          var brand = document.createElement('small'); brand.className = 'material-card-brand'; brand.textContent = row[1] + ' · гланц';
          copy.append(code, name, brand); btn.append(img, copy);
          btn.addEventListener('click', function () { var h = page.querySelector('input[name="' + field + '"]'); h.value = row[0]; h.dispatchEvent(new Event('input', { bubbles: true })); h.dispatchEvent(new Event('change', { bubbles: true })); render(); });
          myGrid.append(btn);
        });
        if (!rs.length) { var p = document.createElement('p'); p.textContent = 'Няма гланцови материали за тези филтри.'; myGrid.append(p); }
        myPages.replaceChildren();
        for (var n = 1; n <= total; n++) (function (n) { var b = document.createElement('button'); b.type = 'button'; b.className = 'page-btn' + (n === cur ? ' is-active' : ''); b.textContent = String(n); b.setAttribute('aria-label', 'Страница ' + n); b.addEventListener('click', function () { cur = n; render(); }); myPages.append(b); })(n);
      }
      sel.addEventListener('change', function () {
        cur = 1;
        if (!active()) { var m = controls.querySelector('select[data-prava-filter]'); if (m) m.dispatchEvent(new Event('change', { bubbles: true })); }   // let the main renderer repaint its own list
        render();
      });
      controls.addEventListener('change', function (e) { if (e.target !== sel && active()) { cur = 1; setTimeout(render, 0); } });
      controls.addEventListener('input', function (e) { if (e.target !== sel && active()) { cur = 1; setTimeout(render, 0); } });
    });
  }
  /* step 9 / submit: mark the selected material as high-gloss in the record the AI payload is built from */
  function wrapSelections() {
    var ms = root.pravaMaterialSelections; if (!ms || ms.__glossWrapped) return !!(ms && ms.__glossWrapped);
    var orig = ms.get; ms.get = function (field) { var r = orig.call(ms, field); if (r && root.pravaGloss.has(r.value || r.id)) { r.finish = 'gloss'; r.glossy = true; } return r; };
    ms.__glossWrapped = true; return true;
  }
  (function waitMs() { var t = 0; (function w() { if (wrapSelections() || ++t > 100) return; setTimeout(w, 100); })(); })();
  function boot() { var t = 0; (function wait() { var c = document.querySelector('.prava-material-controls'); if (c || ++t > 60) { init(); return; } setTimeout(wait, 100); })(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(typeof window !== 'undefined' ? window : this);
