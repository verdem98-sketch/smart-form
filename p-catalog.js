/* П-образна кухня: material catalogue, same data, filters, gloss, grain and deep-row gallery as Aglova (aglova-catalog.js) and Prava. */
(function () {
  'use strict';
  var selections = {};
  // High-gloss decors (same list as Prava's prava-gloss.js): Kronospan Feelness High Gloss and EGGER PerfectSense Gloss. Cabinet decors only.
  var GLOSS = {};
  ['kronospan_0112', 'kronospan_0164', 'kronospan_0171', 'kronospan_0190', 'kronospan_0564', 'kronospan_5981', 'kronospan_6299', 'kronospan_7045', 'kronospan_7166', 'kronospan_8685',
    'egger-perfectsense_u702', 'egger-perfectsense_u708', 'egger-perfectsense_u732', 'egger-perfectsense_u961', 'egger-perfectsense_u999', 'egger-perfectsense_w1000', 'egger-perfectsense_w1100']
    .forEach(function (id) { GLOSS[id] = 1; });
  window.pGloss = { has: function (id) { return !!GLOSS[String(id || '')]; } };
  var resets = {};
  window.pMaterialSelections = {
    get: function (field) { var r = selections[field]; return r ? Object.assign({}, r) : null; },
    // Drop a choice (used by "Като горния ред" for the deep row): the gallery and its hidden input go back to "nothing chosen".
    clear: function (field) { delete selections[field]; var role = String(field).replace(/_finish$/, ''); if (resets[role]) resets[role](); }
  };
  var script = document.currentScript;
  // the catalog data does not change with the scripts: read it from one fixed, already cached commit (a fresh commit's first CDN requests can fail without CORS headers)
  var CATALOG_BASE = 'https://cdn.jsdelivr.net/gh/verdem98-sketch/smart-form@9ce473d8697355de43cb7eb45d10060194e463f4/';
  var base = CATALOG_BASE || (script && script.src ? script.src.replace(/[^/]*$/, '') : '');
  var ROLES = {
    upper: { file: 'cabinet', cabinet: true, filters: ['finish', 'manufacturer', 'category', 'substrate'] },
    lower: { file: 'cabinet', cabinet: true, filters: ['finish', 'manufacturer', 'category', 'substrate'] },
    // deep upper row: optional own decor, in the extra step p-flow.js adds after "Горен ред" (empty = same as the upper row)
    deep: { file: 'cabinet', cabinet: true, filters: ['finish', 'manufacturer', 'category', 'substrate'], optional: true },
    countertop: { file: 'countertop', cabinet: false, filters: ['family', 'manufacturer', 'category'] },
    backsplash: { file: 'backsplash', cabinet: false, filters: ['manufacturer', 'category'] }
  };
  var LABELS = { finish: 'Покритие', manufacturer: 'Производител', category: 'Категория', substrate: 'Плоскост', family: 'Тип плот' };
  var OPTIONS = {
    finish: [['all', 'Всички'], ['gloss', 'Гланц']],
    manufacturer: [['all', 'Всички'], ['EGGER', 'EGGER'], ['Egger PerfectSense', 'PerfectSense'], ['Kronospan', 'Kronospan']],
    category: [['all', 'Всички'], ['wood', 'Дървесни'], ['metal', 'Метал'], ['stone', 'Камък'], ['structure', 'Структура'], ['solid', 'Едноцветни']],
    substrate: [['all', 'Всички'], ['pdc', 'ПДЧ'], ['mdf', 'МДФ']],
    family: [['thermal', 'Термоплотове'], ['slimline', 'Плотове Slim Line (Kronospan)'], ['compact', 'Компактни плотове (Egger)']]
  };
  var cache = {};
  function load(file) {
    // the CDN sometimes drops the first request for a freshly published commit: retry a few times before keeping the old style cards
    function get(n) { return fetch(base + 'catalog/' + file + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .catch(function (e) { if (n >= 4) throw e; return new Promise(function (ok) { setTimeout(ok, 600 * (n + 1)); }).then(function () { return get(n + 1); }); }); }
    if (!cache[file]) cache[file] = get(0);
    return cache[file];
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function build(wrap, role, cfg, source) {
    var field = role + '_finish', cabinet = cfg.cabinet, items = source.items;
    var hidden = wrap.querySelector('input[name="' + field + '"]');
    var present = {};
    items.forEach(function (r) { present[r[cabinet ? 2 : 6]] = 1; });
    var filters = { finish: 'all', manufacturer: 'all', category: 'all', substrate: 'all', family: role === 'countertop' ? 'thermal' : 'all' };
    var current = 1, query = '', chosenId = '';

    var gallery = el('div', 'material-gallery p-material-gallery');
    var controls = el('div', 'prava-material-controls');
    cfg.filters.forEach(function (kind) {
      var label = el('label', '', LABELS[kind]);
      var select = document.createElement('select');
      select.dataset.pFilter = kind; select.setAttribute('aria-label', LABELS[kind]);
      OPTIONS[kind].forEach(function (o) {
        if (kind === 'category' && o[0] !== 'all' && !present[o[0]]) return;
        var opt = el('option', '', o[1]); opt.value = o[0]; select.append(opt);
      });
      select.value = filters[kind]; label.append(select); controls.append(label);
      select.addEventListener('change', function () { filters[kind] = select.value; current = 1; render(); });
    });
    var sl = el('label', 'prava-material-search', 'Търсене');
    var search = document.createElement('input'); search.type = 'search'; search.placeholder = 'Код, име или производител'; search.setAttribute('aria-label', 'Търсене на материал');
    sl.append(search); controls.append(sl);
    search.addEventListener('input', function () { query = search.value.trim().toLocaleLowerCase('bg'); current = 1; render(); });

    var meta = el('div', 'material-gallery-meta'), count = el('span'); meta.append(count);
    var grid = el('div', 'material-gallery-grid');
    var nav = el('div', 'material-gallery-nav'), pages = el('div', 'material-gallery-pages'), status = el('div', 'material-gallery-page-status');
    nav.append(pages, status);
    gallery.append(controls, meta, grid, nav);
    var keep = el('div', 'p-chosen-card'); keep.hidden = true;
    var anchor = wrap.querySelector('.vision-cards-row') || wrap.lastElementChild;
    anchor.before(gallery); wrap.append(keep);
    // Grain direction (as in Prava): for a wood decor on the fronts, vertical or horizontal; stored in <role>_grain, read by the sketch.
    var grain = cabinet ? grainBox(wrap, role, gallery) : null;

    // Hide the four generic style cards and the free-text idea field; the gallery owns the choice.
    wrap.querySelectorAll('.vision-cards-row,.text-area-wrap,.finish-card-copy,.p6-note-label,.p6-note').forEach(function (n) { n.setAttribute('data-p-hide', '1'); });
    wrap.querySelectorAll('.vision-cards-row .vision-card').forEach(function (c) { c.classList.remove('vm-selected', 'is-selected', 'active'); });

    function name(row) { return cabinet ? row[4] : [row[2], row[3]].filter(Boolean).join(' · '); }
    function code(row) { return cabinet ? row[3] : row[2]; }
    function label(row) { return [row[1], code(row), cabinet ? row[4] : row[3]].filter(Boolean).join(' '); }
    function src(row) { return cabinet ? source.base + encodeURIComponent(row[5]) : row[4]; }
    function filtered() {
      return items.filter(function (row) {
        var cat = row[cabinet ? 2 : 6];
        return (filters.finish === 'all' || window.pGloss.has(row[0])) && (filters.manufacturer === 'all' || row[1] === filters.manufacturer) && (filters.category === 'all' || cat === filters.category) &&
          (filters.family === 'all' || row[7] === filters.family) &&
          (filters.substrate === 'all' || ((source.substrates || {})[filters.substrate] || []).indexOf(String(code(row)).toUpperCase()) >= 0) &&
          (!query || [row[1], code(row), name(row)].join(' ').toLocaleLowerCase('bg').indexOf(query) >= 0);
      });
    }
    function card(row, selected) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'material-card vision-card';
      b.dataset.value = label(row); b.dataset.decorId = row[0]; b.dataset.manufacturer = row[1];
      b.classList.toggle('vm-selected', selected); b.setAttribute('aria-pressed', String(selected));
      var img = document.createElement('img'); img.loading = 'lazy'; img.src = src(row); img.alt = label(row);
      var copy = el('div', 'material-card-copy');
      copy.append(el('strong', 'material-card-code', code(row)), el('span', 'vision-card-label', name(row)), el('small', 'material-card-brand', row[1] + (cabinet && window.pGloss.has(row[0]) ? ' · гланц' : '')));
      b.append(img, copy); return b;
    }
    function choose(row) {
      chosenId = row[0];
      keep.replaceChildren(card(row, true));
      if (hidden) { hidden.value = label(row); hidden.dispatchEvent(new Event('input', { bubbles: true })); hidden.dispatchEvent(new Event('change', { bubbles: true })); }
      // Same record shape as window.pravaMaterialSelections: this is what the AI planner gets.
      selections[role + '_finish'] = {
        value: row[0], id: row[0], manufacturer: row[1] || null,
        decorCode: row[cabinet ? 3 : 2] || null, decorName: cabinet ? row[4] || null : null,
        displayName: cabinet ? row[4] || null : [row[2], row[3]].filter(Boolean).join(' · ') || null,
        productCode: null, surface: null, finish: cabinet && window.pGloss.has(row[0]) ? 'gloss' : null, profile: null, thicknessMm: null,
        surfaceCode: cabinet ? null : row[3] || null, category: row[cabinet ? 2 : 6] || null,
        family: role === 'countertop' ? row[7] || null : null,
        label: cabinet ? row[4] || null : [row[2], row[3]].filter(Boolean).join(' · ') || null,
        sampleImageUrl: src(row)
      };
      wrap.dispatchEvent(new CustomEvent('p:material-chosen', { bubbles: true, detail: { role: role, id: row[0], label: label(row), src: src(row) } }));
      if (grain) grain.show(row[2] === 'wood');
      render();
    }
    resets[role] = function () {
      chosenId = ''; keep.replaceChildren(); keep.hidden = true; if (grain) grain.show(false);
      if (hidden) { hidden.value = ''; hidden.dispatchEvent(new Event('input', { bubbles: true })); hidden.dispatchEvent(new Event('change', { bubbles: true })); }
      wrap.dispatchEvent(new CustomEvent('p:material-chosen', { bubbles: true, detail: { role: role, id: null, label: '', src: null } }));
      render();
    };
    function pager(total) {
      pages.replaceChildren();
      var shown = {}; [1, total, current - 2, current - 1, current, current + 1, current + 2].forEach(function (n) { shown[n] = 1; });
      var prev = 0;
      Object.keys(shown).map(Number).filter(function (n) { return n >= 1 && n <= total; }).sort(function (a, b) { return a - b; }).forEach(function (n) {
        if (prev && n > prev + 1) pages.append(el('span', '', '…'));
        var b = el('button', 'page-btn', String(n)); b.type = 'button'; b.setAttribute('aria-label', 'Страница ' + n);
        b.classList.toggle('is-active', n === current); if (n === current) b.setAttribute('aria-current', 'page');
        b.addEventListener('click', function () { current = n; render(); }); pages.append(b); prev = n;
      });
    }
    function render() {
      var rows = filtered(), total = Math.max(1, Math.ceil(rows.length / 10));
      current = Math.max(1, Math.min(current, total));
      count.textContent = rows.length + ' материала'; status.textContent = 'Стр. ' + current + ' от ' + total;
      grid.replaceChildren();
      rows.slice((current - 1) * 10, current * 10).forEach(function (row) {
        var b = card(row, row[0] === chosenId);
        b.addEventListener('click', function () { choose(row); });
        grid.append(b);
      });
      if (!rows.length) grid.append(el('p', '', 'Няма материали за тези филтри.'));
      pager(total);
    }
    render();
  }

  var grainCss = false;
  function grainBox(wrap, role, before) {
    if (!grainCss) {
      grainCss = true;
      var st = document.createElement('style');
      st.textContent = '.sf-page-p .p-grain{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;margin:0 0 14px;padding:10px 12px;border:1px solid #d9ddd5;border-radius:8px;background:#fff}' +
        '.sf-page-p .p-grain[hidden]{display:none}' +
        '.sf-page-p .p-grain-title{font-size:13px;font-weight:600;color:#2f372f;margin-right:4px}' +
        '.sf-page-p .p-grain button{min-height:38px;padding:6px 14px;border:1px solid #cfd4cb;border-radius:6px;background:#fff;color:#2f372f;font:inherit;font-size:13px;cursor:pointer}' +
        '.sf-page-p .p-grain button.is-on{background:#2f372f;border-color:#2f372f;color:#fff}' +
        '.sf-page-p .p-grain-note{font-size:12px;color:#606760}';
      document.head.append(st);
    }
    var input = wrap.querySelector('input[name="' + role + '_grain"]');
    if (!input) { input = document.createElement('input'); input.type = 'hidden'; input.name = role + '_grain'; input.value = 'v'; wrap.append(input); }
    var box = el('div', 'p-grain'); box.hidden = true;
    var bv = el('button', '', 'Вертикална'), bh = el('button', '', 'Хоризонтална'); bv.type = bh.type = 'button'; bv.dataset.g = 'v'; bh.dataset.g = 'h';
    box.append(el('span', 'p-grain-title', 'Посока на шарката'), bv, bh, el('span', 'p-grain-note', 'Важи за всички врати от реда – шарката продължава от врата на врата.'));
    function paint() { var h = input.value === 'h'; bv.classList.toggle('is-on', !h); bh.classList.toggle('is-on', h); bv.setAttribute('aria-pressed', String(!h)); bh.setAttribute('aria-pressed', String(h)); }
    [bv, bh].forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault(); input.value = b.dataset.g; paint();
        input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    before.before(box); paint();
    return { show: function (on) { box.hidden = !on; } };
  }

  // Tiles on the sketch showing what was chosen so far (same element and order as Prava's prava-preview.js).
  var TILES = [['upper', 'Горен ред'], ['backsplash', 'Гръб'], ['countertop', 'Плот'], ['lower', 'Долен ред']];
  var tileSrc = {};
  function tiles(root) {
    var stage = root.querySelector('.p-sketch-wrap .cad-stage-p') || root.querySelector('.cad-stage-p');
    if (!stage) return null;
    var box = stage.querySelector('.prava-material-summary');
    if (!box) { box = el('div', 'prava-material-summary'); box.hidden = true; stage.append(box); }
    return box;
  }
  function updateTiles(root) {
    var box = tiles(root); if (!box) return;
    TILES.forEach(function (t) {
      var role = t[0], item = box.querySelector('[data-role="' + role + '"]');
      if (!tileSrc[role]) { if (item) item.remove(); return; }
      if (!item) {
        item = el('div'); item.dataset.role = role;
        var img = document.createElement('img'); img.alt = t[1]; item.append(img, el('span', '', t[1]));
        item.title = t[1];
      }
      item.querySelector('img').src = tileSrc[role]; box.append(item);
    });
    box.hidden = !box.children.length;
  }

  function init() {
    var root = document.querySelector('.sf-page-p');
    if (!root || root.dataset.pCatalog) return;
    root.dataset.pCatalog = '1';
    root.addEventListener('p:material-chosen', function (e) { tileSrc[e.detail.role] = e.detail.src; updateTiles(root); });
    Object.keys(ROLES).forEach(function (role) {
      var cfg = ROLES[role], tries = 0;
      (function find() {
        var wrap = root.querySelector('.question-wrap[data-field="' + role + '_finish"]');
        if (!wrap) { if (cfg.optional && ++tries < 100) setTimeout(find, 100); return; }   // the deep-row step is created by p-flow.js
        load(cfg.file).then(function (source) { build(wrap, role, cfg, source); })
          .catch(function (err) { if (window.console) console.warn('[p-catalog] ' + role + ' not loaded, keeping style cards', err); });
      })();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 50); }, { once: true });
  else setTimeout(init, 50);
})();
