/* Aglova material catalogue: same data, filters and paging as Prava (prava-material-gallery.js), rendered without Prava's DOM. */
(function () {
  'use strict';
  var script = document.currentScript;
  var base = script && script.src ? script.src.replace(/[^/]*$/, '') : '';
  var ROLES = {
    upper: { file: 'cabinet', cabinet: true, filters: ['manufacturer', 'category', 'substrate'] },
    lower: { file: 'cabinet', cabinet: true, filters: ['manufacturer', 'category', 'substrate'] },
    countertop: { file: 'countertop', cabinet: false, filters: ['family', 'manufacturer', 'category'] },
    backsplash: { file: 'backsplash', cabinet: false, filters: ['manufacturer', 'category'] }
  };
  var LABELS = { manufacturer: 'Производител', category: 'Категория', substrate: 'Плоскост', family: 'Тип плот' };
  var OPTIONS = {
    manufacturer: [['all', 'Всички'], ['EGGER', 'EGGER'], ['Egger PerfectSense', 'PerfectSense'], ['Kronospan', 'Kronospan']],
    category: [['all', 'Всички'], ['wood', 'Дървесни'], ['metal', 'Метал'], ['stone', 'Камък'], ['structure', 'Структура'], ['solid', 'Едноцветни']],
    substrate: [['all', 'Всички'], ['pdc', 'ПДЧ'], ['mdf', 'МДФ']],
    family: [['thermal', 'Термоплотове'], ['slimline', 'Плотове Slim Line (Kronospan)'], ['compact', 'Компактни плотове (Egger)']]
  };
  var cache = {};
  function load(file) {
    if (!cache[file]) cache[file] = fetch(base + 'catalog/' + file + '.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return cache[file];
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function build(wrap, role, cfg, source) {
    var field = role + '_finish', cabinet = cfg.cabinet, items = source.items;
    var hidden = wrap.querySelector('input[name="' + field + '"]');
    var present = {};
    items.forEach(function (r) { present[r[cabinet ? 2 : 6]] = 1; });
    var filters = { manufacturer: 'all', category: 'all', substrate: 'all', family: role === 'countertop' ? 'thermal' : 'all' };
    var current = 1, query = '', chosenId = '';

    var gallery = el('div', 'material-gallery ag-material-gallery');
    var controls = el('div', 'prava-material-controls');
    cfg.filters.forEach(function (kind) {
      var label = el('label', '', LABELS[kind]);
      var select = document.createElement('select');
      select.dataset.agFilter = kind; select.setAttribute('aria-label', LABELS[kind]);
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
    var keep = el('div', 'ag-chosen-card'); keep.hidden = true;
    var anchor = wrap.querySelector('.vision-cards-row') || wrap.lastElementChild;
    anchor.before(gallery); wrap.append(keep);

    // Hide the four generic style cards and the free-text idea field; the gallery owns the choice.
    wrap.querySelectorAll('.vision-cards-row,.text-area-wrap,.finish-card-copy').forEach(function (n) { n.setAttribute('data-ag-hide', '1'); });
    wrap.querySelectorAll('.vision-cards-row .vision-card').forEach(function (c) { c.classList.remove('vm-selected', 'is-selected', 'active'); });

    function name(row) { return cabinet ? row[4] : [row[2], row[3]].filter(Boolean).join(' · '); }
    function code(row) { return cabinet ? row[3] : row[2]; }
    function label(row) { return [row[1], code(row), cabinet ? row[4] : row[3]].filter(Boolean).join(' '); }
    function src(row) { return cabinet ? source.base + encodeURIComponent(row[5]) : row[4]; }
    function filtered() {
      return items.filter(function (row) {
        var cat = row[cabinet ? 2 : 6];
        return (filters.manufacturer === 'all' || row[1] === filters.manufacturer) && (filters.category === 'all' || cat === filters.category) &&
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
      copy.append(el('strong', 'material-card-code', code(row)), el('span', 'vision-card-label', name(row)), el('small', 'material-card-brand', row[1]));
      b.append(img, copy); return b;
    }
    function choose(row) {
      chosenId = row[0];
      keep.replaceChildren(card(row, true));
      if (hidden) { hidden.value = label(row); hidden.dispatchEvent(new Event('input', { bubbles: true })); hidden.dispatchEvent(new Event('change', { bubbles: true })); }
      wrap.dispatchEvent(new CustomEvent('ag:material-chosen', { bubbles: true, detail: { role: role, id: row[0], label: label(row), src: src(row) } }));
      render();
    }
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

  // Tiles on the sketch showing what was chosen so far (same element and order as Prava's prava-preview.js).
  var TILES = [['upper', 'Горен ред'], ['backsplash', 'Гръб'], ['countertop', 'Плот'], ['lower', 'Долен ред']];
  var tileSrc = {};
  function tiles(root) {
    var stage = root.querySelector('.sticky-cad-wrap .cad-stage-aglova') || root.querySelector('.cad-stage-aglova');
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
    var root = document.querySelector('.flow-aglova');
    if (!root || root.dataset.agCatalog) return;
    root.dataset.agCatalog = '1';
    root.addEventListener('ag:material-chosen', function (e) { tileSrc[e.detail.role] = e.detail.src; updateTiles(root); });
    Object.keys(ROLES).forEach(function (role) {
      var wrap = root.querySelector('.question-wrap[data-field="' + role + '_finish"]');
      if (!wrap) return;
      var cfg = ROLES[role];
      load(cfg.file).then(function (source) { build(wrap, role, cfg, source); })
        .catch(function (err) { if (window.console) console.warn('[aglova-catalog] ' + role + ' not loaded, keeping style cards', err); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 50); }, { once: true });
  else setTimeout(init, 50);
})();
