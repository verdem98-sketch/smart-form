/* Aglova (corner / L-shaped kitchen): interactive 3D sketch.
   Same viewer as Prava's prava-layout.js (real decor textures, handleless / drawers / glass display / lift flaps / panel doors /
   LED / bottle rack, oven + drawer, free-standing appliances, independent upper / lower drag), laid out as an L:
   wall 1 = left wall (runs towards the viewer), wall 2 = right back wall. Every position is measured along its own wall from the
   corner end; wall 1 owns the 900 mm corner unit (or the chimney), wall 2 starts after the 600 mm depth of wall 1 (or the chimney).
   The layout engine mirrors kitchen-corner-planner.ts (verde-contract-automation) so the AI step sees the same module widths. */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ layout engine (pure) */
  var MAX_FILLER = 150, MIN_CUSTOM = 150, MAX_CUSTOM = 900, STEP = 50;
  var BASE_DEPTH = 600, CORNER_UNIT = 900, MAX_UPPER = 900, PAS = 60;   // PAS: the 6 cm filler piece that always closes the corner next to a chimney
  var TALL = { fridge: 1, ovenTower: 1, applianceTower: 1 };

  function chooseStorage(rem) {
    if (rem < 0) return null;
    if (rem === 0) return { widths: [], filler: 0 };
    if (rem <= MAX_FILLER) return { widths: [], filler: rem };
    var filler = rem % STEP, cab = rem - filler;
    if (cab < MIN_CUSTOM) { var need = MIN_CUSTOM - cab; if (filler >= need) { cab += need; filler -= need; } }
    if (filler < 0 || filler > MAX_FILLER || cab < MIN_CUSTOM) return null;
    var count = Math.max(1, Math.ceil(cab / MAX_CUSTOM));
    var baseUnits = Math.floor(cab / STEP / count), extra = cab / STEP - baseUnits * count;
    var widths = [];
    for (var i = 0; i < count; i++) { var u = baseUnits + (extra > 0 ? 1 : 0); if (extra > 0) extra--; widths.push(u * STEP); }
    if (widths.some(function (w) { return w < MIN_CUSTOM || w > MAX_CUSTOM; })) return null;
    return { widths: widths, filler: filler };
  }

  function fixedMod(type, w, zone, apps, extra) {
    var m = { type: type, w: w, zone: zone, locked: true };
    if (apps && apps.length) m.appliances = apps;
    if (extra) for (var k in extra) m[k] = extra[k];
    return m;
  }
  function sumW(list) { return list.reduce(function (s, m) { return s + m.w; }, 0); }

  /* cfg: wall1Mm, wall2Mm, heightMm, waterWall (1|2), ovenTower, fridge ('built_in'|'free_standing'|null), dishwasherMm, washer, microwave, coffee (built-in),
          basket, chimney, chimneyAMm, chimneyBMm, deep */
  function planCorner(cfg) {
    var errors = [], L1 = Math.round(cfg.wall1Mm || 0), L2 = Math.round(cfg.wall2Mm || 0);
    var res = { wall1Mm: L1, wall2Mm: L2, errors: errors, chimney: !!cfg.chimney, walls: { 1: { wall: 1, lengthMm: L1, startMm: 0, modules: [], fillerMm: 0 }, 2: { wall: 2, lengthMm: L2, startMm: 0, modules: [], fillerMm: 0 } } };
    if (!L1 || !L2) { errors.push('Въведете дължина на стена 1 и на стена 2.'); return res; }
    var chim = !!cfg.chimney, A = cfg.chimneyAMm || 0, B = cfg.chimneyBMm || 0;
    if (chim && (!A || !B)) { errors.push('Въведете размерите A и B на комина.'); return res; }
    // with a chimney each run starts after a 60 mm filler (пас). A run never starts closer than the depth of the opposite run (600) + the filler,
    // i.e. 66 cm from the opposite wall when the chimney is narrower than 60 cm; a wider chimney pushes it out to chimney + filler
    var start1 = chim ? Math.max(A, BASE_DEPTH) + PAS : 0, cornerUnit = !chim, start2 = chim ? Math.max(B, BASE_DEPTH) + PAS : BASE_DEPTH;
    res.pas = chim ? { wall1: { from: start1 - PAS, to: start1 }, wall2: { from: start2 - PAS, to: start2 }, block: { x1: start2 - PAS, z1: start1 - PAS } } : null;
    var avail = { 1: Math.max(0, L1 - start1 - (cornerUnit ? CORNER_UNIT : 0)), 2: Math.max(0, L2 - start2) };
    res.walls[1].startMm = start1; res.walls[2].startMm = start2;
    var waterWall = cfg.waterWall === 2 ? 2 : 1, other = waterWall === 1 ? 2 : 1;
    var place = { 1: [], 2: [] };
    function put(wall, key, m) { place[wall].push({ key: key, module: m }); }
    put(waterWall, 'sinkBase', fixedMod('sinkBase', 600, 'water'));
    if (cfg.dishwasherMm) put(waterWall, 'dishwasher', fixedMod('dishwasher', cfg.dishwasherMm, 'water'));
    if (cfg.washer) put(waterWall, 'washingMachine', fixedMod('washingMachine', 600, 'water'));
    if (cfg.ovenTower) {
      var tower = ['oven']; if (cfg.microwave) tower.push('microwave'); if (cfg.coffee) tower.push('coffeeMachine');
      put(other, 'ovenTower', fixedMod('ovenTower', 600, 'tall', tower));
      put(other, 'hobBase', fixedMod('hobBase', 600, 'cooking'));
    } else put(other, 'ovenHobBase', fixedMod('ovenHobBase', 600, 'cooking', ['oven']));
    if (cfg.basket) put(other, 'basket', fixedMod('basket', 150, 'cooking'));
    if (cfg.fridge) put(other, 'fridge', fixedMod('fridge', 600, 'tall', null, { applianceType: cfg.fridge }));
    function need(w) { return sumW(place[w].map(function (i) { return i.module; })); }
    function move(from, keys) {
      keys.forEach(function (key) {
        if (need(from) <= avail[from]) return;
        var at = -1; place[from].forEach(function (i, ix) { if (at < 0 && i.key === key) at = ix; });
        if (at < 0) return;
        var to = from === 1 ? 2 : 1, item = place[from][at];
        if (need(to) + item.module.w > avail[to]) return;
        place[from].splice(at, 1); place[to].push(item);
      });
    }
    move(other, ['fridge', 'ovenTower', 'basket']);
    move(waterWall, ['washingMachine', 'dishwasher']);
    [1, 2].forEach(function (w) {
      if (need(w) > avail[w]) errors.push('Стена ' + w + ': избраните модули изискват ' + need(w) + ' мм, а наличната дължина е само ' + avail[w] + ' мм.');
    });
    if (errors.length) return res;
    [1, 2].forEach(function (w) {
      var items = place[w].map(function (i) { return i.module; });
      var tall = items.filter(function (m) { return TALL[m.type]; }), rest = items.filter(function (m) { return !TALL[m.type]; });
      var remaining = avail[w] - need(w), st = chooseStorage(remaining);
      if (!st) { errors.push('Стена ' + w + ': остатъкът от ' + remaining + ' мм не може да се разпредели на шкафове; променете дължината.'); return; }
      var storage = st.widths.map(function (x) { return { type: 'genericBase', w: x, locked: false, zone: 'storage' }; });
      var mods = [];
      if (w === 1 && cornerUnit) mods.push(fixedMod('cornerBase', CORNER_UNIT, 'corner'));
      var water = rest.filter(function (m) { return m.zone === 'water'; }), cooking = rest.filter(function (m) { return m.zone !== 'water'; });
      if (w === waterWall) {
        var before = storage.length > 1 ? storage.slice(0, 1) : [], after = storage.length > 1 ? storage.slice(1) : storage;
        mods = mods.concat(before, water, cooking, after, tall);
      } else mods = mods.concat(cooking, storage, tall);
      res.walls[w].modules = mods; res.walls[w].fillerMm = st.filler;
    });
    if (errors.length) { res.walls[1].modules = []; res.walls[2].modules = []; return res; }
    var cnt = {};
    [1, 2].forEach(function (w) { res.walls[w].modules.forEach(function (m) { cnt[m.type] = (cnt[m.type] || 0) + 1; m.id = m.type + '#' + (cnt[m.type] - 1); m.wall = w; }); });
    var anyTall = res.walls[1].modules.concat(res.walls[2].modules).some(function (m) { return TALL[m.type]; });
    var required = cfg.kitchenHMm || (anyTall ? 2400 : 900);   // the upper row (standard or deep) always ends at the kitchen height (the top of the tall column), never above it
    if (cfg.heightMm && required > cfg.heightMm) errors.push(cfg.kitchenHMm ? 'Височината на кухнята (' + required + ' мм) е по-голяма от височината на помещението (' + cfg.heightMm + ' мм).' : 'Шкафовете изискват ' + required + ' мм височина, а помещението е само ' + cfg.heightMm + ' мм.');
    return res;
  }

  /* the user's manual order inside one wall; the corner unit always stays first */
  function applyOrder(mods, order) {
    if (!order || !order.length) return mods.slice();
    var byId = {}; mods.forEach(function (m) { byId[m.id] = m; });
    var kept = order.filter(function (id) { return byId[id]; }), keptSet = {}; kept.forEach(function (id) { keptSet[id] = 1; });
    var out = kept.map(function (id) { return byId[id]; });
    mods.forEach(function (m, i) { if (!keptSet[m.id]) out.splice(Math.min(i, out.length), 0, m); });
    var ci = -1; out.forEach(function (m, i) { if (m.type === 'cornerBase') ci = i; });
    if (ci > 0) out.unshift(out.splice(ci, 1)[0]);
    return out;
  }
  function position(mods, startMm) { var x = startMm, out = []; mods.forEach(function (m) { var c = {}; for (var k in m) c[k] = m[k]; c.x = x; out.push(c); x += m.w; }); return { items: out, end: x }; }
  function swapIds(order, a, b) { var o = order.slice(), i = o.indexOf(a), j = o.indexOf(b); if (i < 0 || j < 0) return o; var t = o[i]; o[i] = o[j]; o[j] = t; return o; }
  /* upper cabinets: every run of consecutive non-tall modules is split into spans of at most 900 mm (same rule as the backend) */
  function upperRuns(wall, items, ext) {   // ext: mm by which the wall's first run is stretched towards the corner (upper cabinets meet in the corner, no gap)
    var runs = [], cur = null;
    items.forEach(function (m) {
      if (TALL[m.type]) { cur = null; return; }
      if (cur && cur.x0 + cur.w === m.x) cur.w += m.w; else { cur = { wall: wall, x0: m.x, w: m.w }; runs.push(cur); }
    });
    if (runs.length && items.length && runs[0].x0 === items[0].x) { runs[0].first = true; if (ext > 0) { runs[0].x0 -= ext; runs[0].w += ext; } }
    runs.forEach(function (r, ri) {
      var parts = Math.max(1, Math.ceil(r.w / MAX_UPPER)), unit = Math.round(r.w / parts / 10) * 10, x = r.x0; r.units = [];
      for (var i = 0; i < parts; i++) { var w = i === parts - 1 ? r.x0 + r.w - x : unit; r.units.push({ id: 'u' + wall + '_' + ri + '_' + i, wall: wall, w: w }); x += w; }
    });
    return runs;
  }

  /* manual moves of a fixed module (sink, hob, fridge...) to the other wall: the generic storage cabinets of both walls are re-chosen so each wall still adds up.
     A move is { id, to, at }: the module goes to wall `to` at index `at` (replacing a generic cabinet there); a generic placeholder keeps its old slot. */
  function applyMoves(plan, moves) {
    var seq = 0, okMoves = [];
    function isGen(m) { return m.type === 'genericBase'; }
    function regen(w) {
      var wl = plan.walls[w], mods = wl.modules, hasC = mods.some(function (m) { return m.type === 'cornerBase'; });
      var avail = wl.lengthMm - wl.startMm - (hasC ? CORNER_UNIT : 0);
      var fixed = sumW(mods.filter(function (m) { return !isGen(m) && m.type !== 'cornerBase'; }));
      var st = chooseStorage(avail - fixed); if (!st) return false;
      var gens = mods.filter(isGen);
      while (gens.length > st.widths.length) {
        var k = -1; gens.forEach(function (g, i) { if (g.ph) k = i; }); if (k < 0) k = gens.length - 1;
        mods.splice(mods.indexOf(gens[k]), 1); gens.splice(k, 1);
      }
      while (gens.length < st.widths.length) {
        var at = -1; mods.forEach(function (m, i) { if (isGen(m)) at = i; });
        if (at < 0) { at = mods.length; mods.forEach(function (m, i) { if (TALL[m.type] && i < at) at = i; }); } else at++;
        var g = { type: 'genericBase', w: 150, zone: 'storage', locked: false, id: 'genericBase#m' + (seq++), wall: w };
        mods.splice(at, 0, g); gens.push(g);
      }
      gens.forEach(function (g, i) { g.w = st.widths[i]; g.ph = false; });
      wl.fillerMm = st.filler; return true;
    }
    moves.forEach(function (mv) {
      var snap = [1, 2].map(function (w) { return { mods: plan.walls[w].modules.slice(), fill: plan.walls[w].fillerMm, ws: plan.walls[w].modules.map(function (m) { return [m, m.w, m.wall]; }) }; });
      function undo() { [1, 2].forEach(function (w, i) { plan.walls[w].modules = snap[i].mods; plan.walls[w].fillerMm = snap[i].fill; snap[i].ws.forEach(function (x) { x[0].w = x[1]; x[0].wall = x[2]; }); }); }
      if (mv.gs) {   // two ordinary cabinets on different walls trade widths; the other ordinary cabinets of each wall absorb the difference
        var ga = null, gb = null;
        [1, 2].forEach(function (w) { plan.walls[w].modules.forEach(function (x) { if (x.id === mv.gs[0]) ga = x; if (x.id === mv.gs[1]) gb = x; }); });
        if (!ga || !gb || ga.wall === gb.wall || ga.w === gb.w) return;
        var ok = true;
        function absorb(w, skip, delta) {   // add delta to the other ordinary cabinets of wall w (or to the leftover when there are none)
          var wl = plan.walls[w], others = wl.modules.filter(function (x) { return isGen(x) && x !== skip; }), left = delta;
          if (!others.length) { if (wl.fillerMm + left < 0) return false; wl.fillerMm += left; return true; }
          for (var i = others.length - 1; i >= 0 && left !== 0; i--) { var nw = Math.max(MIN_CUSTOM, Math.min(MAX_CUSTOM, others[i].w + left)); left -= nw - others[i].w; others[i].w = nw; }
          return left === 0;
        }
        var wa = ga.w, wb = gb.w; ga.w = wb; gb.w = wa;
        ok = absorb(ga.wall, ga, wa - wb) && absorb(gb.wall, gb, wb - wa);
        if (ok) okMoves.push(mv); else undo();
        return;
      }
      var from = 0, fi = -1, m = null;
      [1, 2].forEach(function (w) { plan.walls[w].modules.forEach(function (x, i) { if (x.id === mv.id) { from = w; fi = i; m = x; } }); });
      if (!m || from === mv.to || isGen(m) || m.type === 'cornerBase') return;
      var fm = plan.walls[from].modules, tm = plan.walls[mv.to].modules, floor = (mv.to === 1 && tm.some(function (x) { return x.type === 'cornerBase'; })) ? 1 : 0;
      fm[fi] = { type: 'genericBase', w: 150, zone: 'storage', locked: false, id: 'genericBase#m' + (seq++), wall: from, ph: true };
      var k = Math.max(floor, Math.min(mv.at, tm.length));
      if (tm[k] && isGen(tm[k])) tm[k] = m; else tm.splice(k, 0, m);
      m.wall = mv.to;
      if (regen(from) && regen(mv.to)) okMoves.push(mv); else undo();
    });
    return okMoves;
  }

  var engine = { applyMoves: applyMoves, chooseStorage: chooseStorage, planCorner: planCorner, applyOrder: applyOrder, position: position, swapIds: swapIds, upperRuns: upperRuns, TALL: TALL };
  if (typeof module !== 'undefined' && module.exports) { module.exports = engine; }
  root.AglovaLayoutEngine = engine;
  if (typeof document === 'undefined') return;

  /* ------------------------------------------------------------------ viewer */
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js';
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error(src)); }; document.head.appendChild(s); }); }

  function init() {
    var page = document.querySelector('.flow-aglova'), card = page && page.querySelector('.sticky-cad-wrap'), stage = card && card.querySelector('.cad-stage');
    if (!stage || root.agLayout) return;
    var host = document.createElement('div'); host.className = 'ag-3d'; host.hidden = true; stage.appendChild(host);
    var st = document.createElement('style');
    var ROT_CUR = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="5"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/></g><g stroke="#222" stroke-width="2.2"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/></g></svg>') + '") 14 14, alias';   // rotate cursor
    st.textContent = '.flow-aglova .ag-3d{position:absolute;inset:0;z-index:8;background:#eef0ed;touch-action:none}.flow-aglova .ag-3d canvas{display:block;width:100%;height:100%;cursor:' + ROT_CUR + '}.flow-aglova .ag-3d[data-mode=move] canvas{cursor:move}.flow-aglova .ag-3d[data-mode=pan] canvas{cursor:grab}.flow-aglova .ag-3d[data-mode=pan] canvas:active{cursor:grabbing}' +
      '.flow-aglova .ag-3d-hint{position:absolute;left:10px;bottom:8px;max-width:calc(100% - 20px);font:11px/1.35 sans-serif;color:#606760;background:rgba(255,255,255,.88);padding:4px 9px;border-radius:8px;pointer-events:none}' +
      '.flow-aglova .ag-3d-msg{position:absolute;left:110px;right:56px;top:10px;font:12px/1.4 sans-serif;color:#7a2d1f;background:#fff1ec;border:1px solid #e6b8ab;padding:8px 10px;border-radius:10px;pointer-events:none}' +
      '.flow-aglova .ag-3d-btns{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px}' +
      '.flow-aglova .ag-3d-btns button{width:36px;height:36px;border:1px solid #c8cbc7;border-radius:10px;background:#fff;color:#333533;font:600 17px/1 sans-serif;cursor:pointer;padding:0}' +
      '.flow-aglova .ag-3d-btns button:hover,.flow-aglova .ag-3d-btns button[aria-pressed="true"]{background:#e8f0e8;border-color:#477448}' +
      '.flow-aglova .cad-stage.ag-3d-on>.cad-base,.flow-aglova .cad-stage.ag-3d-on>.cad-kitchen,.flow-aglova .cad-stage.ag-3d-on>.cad-bar,.flow-aglova .cad-stage.ag-3d-on>.cad-island{visibility:hidden!important;pointer-events:none!important}';
    document.head.appendChild(st);
    var hint = document.createElement('div'); hint.className = 'ag-3d-hint'; host.appendChild(hint);
    var msg = document.createElement('div'); msg.className = 'ag-3d-msg'; msg.hidden = true; host.appendChild(msg);
    var btns = document.createElement('div'); btns.className = 'ag-3d-btns'; host.appendChild(btns);
    function mkBtn(label, title, act) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = b.ariaLabel = title; b.dataset.act = act; btns.appendChild(b); return b; }
    mkBtn('+', 'Приближи', 'in'); mkBtn('−', 'Отдалечи', 'out'); mkBtn('⌂', 'Начален изглед', 'reset');
    var rotBtn = mkBtn('⟳', 'Въртене на изгледа (Orbit): влачете за завъртане', 'rotate');
    var modeBtn = mkBtn('✥', 'Местене на шкафове: хванете шкаф и го пуснете върху друг', 'mode');
    var panBtn = mkBtn('✋', 'Преместване на изгледа (Pan): влачете наляво/надясно и нагоре/надолу. Десен бутон или Shift + влачене също местят изгледа.', 'pan');
    var editBtn = mkBtn('✎', 'Промяна на шкаф: изберете шкаф, за да смените ширината и вида му', 'edit');
    var autoBtn = mkBtn('↺', 'Автоматично подреждане', 'auto');

    var T, renderer, scene, camera, controls, ray, mouse, roomGroup, cabGroup, dropMark, wg = {};
    var failed = false, moveMode = false, panMode = false, bounds = { x: 4, y: 2.6, z: 4 }, dirty = false, uorder = null, dorder = null, dpos = {}, layerIds = { u: [], d: [] }, upos = {}, uRuns = [], order = { 1: [], 2: [] }, items = [], plan = null, inputsSig = '', fitSig = '';
    var mats = {}, drag = null, unitById = {};

    /* ---------------- inputs from the page */
    function q(sel) { return page.querySelector(sel); }
    /* chimney sizes: as soon as one of A / B is entered the chimney is drawn; the other side borrows that size until it is entered (its label shows "?") */
    function chimA() { var a = dimMm('chimney_a_aglova'); return a || dimMm('chimney_b_aglova'); }
    function chimB() { var b = dimMm('chimney_b_aglova'); return b || dimMm('chimney_a_aglova'); }
    function pill(field) { var e = q('[data-field="' + field + '"] .option-pill.active,[data-field="' + field + '"] .option-pill.is-selected'); return e ? String(e.dataset.value || e.textContent || '').trim() : ''; }
    function dimMm(key) {
      var row = q('.dimension-row[data-dim="' + key + '"]'); if (!row) return 0;
      function n(sel) { var el = row.querySelector(sel + ' .picker-value-text') || row.querySelector(sel + ' .picker-value'); return parseInt((el && el.textContent) || '0', 10) || 0; }
      return (n('.meters-control') * 100 + n('.centimeters-control')) * 10;
    }
    function chk(field) { var e = q('[data-field="' + field + '"] input[type="checkbox"]'); return !!(e && e.checked); }
    function fieldVal(name) { var e = q('[name="' + name + '"]'); return e ? String(e.value || '') : ''; }
    /* ---------------- material colours + real decor textures (steps 3-6) */
    var colCache = {}, toneCache = {}, texCache = {}, texMat = {}, texN = 0, grainCache = {};
    function decorUrl(field) {
      var rec = root.agMaterialSelections && root.agMaterialSelections.get(field), u = rec && rec.sampleImageUrl;
      return u ? u.replace('https://s3.amazonaws.com/webflow-prod-assets/', 'https://cdn.prod.website-files.com/') : null;
    }
    function colourOf(field) {
      var u = decorUrl(field); if (!u) return null;
      if (colCache[u] !== undefined) return colCache[u];
      colCache[u] = null;
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = c.height = 8; var g = c.getContext('2d'); g.drawImage(im, 0, 0, 8, 8);
          var d = g.getImageData(0, 0, 8, 8).data, r = 0, gg = 0, b = 0, n = 0;
          for (var i = 0; i < d.length; i += 4) { if (d[i + 3] < 40) continue; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
          if (im.naturalWidth >= 64 && im.naturalHeight >= 64) { var tx = new T.Texture(im); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = 4; tx.needsUpdate = true; texCache[u] = tx; }   // real decor image (solids are only 16x16 swatches: flat colour is exact)
          // which way the grain runs in the sample image (stronger change across x = vertical lines), so "vertical"/"horizontal" can be honoured
          try { var gc = document.createElement('canvas'); gc.width = gc.height = 48; var gx = gc.getContext('2d'); gx.drawImage(im, 0, 0, 48, 48); var gd = gx.getImageData(0, 0, 48, 48).data, ddx = 0, ddy = 0; for (var yy = 0; yy < 47; yy++) for (var xx = 0; xx < 47; xx++) { var i0 = (yy * 48 + xx) * 4, l0 = gd[i0] + gd[i0 + 1] + gd[i0 + 2], lx = gd[i0 + 4] + gd[i0 + 5] + gd[i0 + 6], ly = gd[i0 + 192] + gd[i0 + 193] + gd[i0 + 194]; ddx += Math.abs(lx - l0); ddy += Math.abs(ly - l0); } grainCache[u] = ddx > ddy ? 'v' : 'h'; } catch (e2) { /* no grain info */ }
          if (n) { colCache[u] = (r / n << 16) | (gg / n << 8) | (b / n); sync(true); }
        } catch (e) { /* tainted canvas: keep default colour */ }
      };
      im.src = u; return null;
    }
    /* finish material: true decor texture when the image is a real texture, otherwise the averaged colour */
    /* worktop and backsplash: a wood decor always runs along their length (horizontal grain) */
    function isWoodField(field) { var rec = root.agMaterialSelections && root.agMaterialSelections.get(field); return !!rec && rec.category === 'wood'; }
    function finLen(field, hex, rough) {
      var m = fin(field, hex, 0, rough); if (!m.map || !isWoodField(field)) return m;
      var u = decorUrl(field); if (grainCache[u] === 'h') return m;   // worktop / backsplash: grain always along the length; only a sample known to run horizontally stays as it is
      var k = u + '|len|' + rough + '|' + (grainCache[u] || '?');   // decor samples are vertical boards, so an unread sample is turned too
      if (!texMat[k]) { var t = m.map.clone(); t.center.set(.5, .5); t.rotation = Math.PI / 2; t.needsUpdate = true; texMat[k] = new T.MeshStandardMaterial({ map: t, color: 0xffffff, roughness: rough, metalness: 0 }); texMat[k].userData.tile = .6; }
      return texMat[k];
    }
    /* wall backsplash: one continuous panel - the sample fills the full height, runs on along the length with mirrored joins (no seams that read as tiles)
       and its pattern always lies horizontally (a sample with vertical lines is turned; one sample spans 2.5x the panel height, so veins lie flat) */
    function splashMat(field, hex) {
      var m = fin(field, hex, 0, .4); if (!m.map) return m;
      var u = decorUrl(field), rot = grainCache[u] === 'v' || (isWoodField(field) && grainCache[u] !== 'h'), k = u + '|splash|' + (rot ? 1 : 0);
      if (!texMat[k]) {
        var t = m.map.clone(); t.wrapS = t.wrapT = T.MirroredRepeatWrapping; if (rot) { t.center.set(.5, .5); t.rotation = Math.PI / 2; } t.needsUpdate = true;
        texMat[k] = new T.MeshStandardMaterial({ map: t, color: 0xffffff, roughness: .4, metalness: 0 });
      }
      return texMat[k];
    }
    function fin(field, hex, shift, rough, grain) {
      var u = decorUrl(field), tx = u && texCache[u];
      if (!tx) return tone(hex, shift, rough);
      var swap = grain && grainCache[u] && grainCache[u] !== grain ? 1 : 0;
      var k = u + '|' + (rough || 0) + '|' + swap + '|' + (grain ? 1 : 0); if (!texMat[k]) { texMat[k] = new T.MeshStandardMaterial({ map: tx, color: 0xffffff, roughness: rough === undefined ? .5 : rough, metalness: 0 }); texMat[k].userData.tile = .6; if (grain) { texMat[k].userData.planar = true; texMat[k].userData.swap = swap; } }
      return texMat[k];
    }
    /* cabinet fronts (as in Prava): the decor is mapped in the wall's own plane, so the pattern runs on across neighbouring doors; axes swapped for a horizontal grain */
    function worldUV(g) {
      g.children.forEach(function (m) {
        var mat = m.material; if (!m.isMesh || !mat || !mat.userData || !mat.userData.planar) return;
        var geo = m.geometry, pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, tile = mat.userData.tile, sw = mat.userData.swap;
        for (var i = 0; i < pos.count; i++) {
          var x = pos.getX(i) + m.position.x + g.position.x, y = pos.getY(i) + m.position.y + g.position.y, z = pos.getZ(i) + m.position.z, nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i)), a, b;
          if (nz >= nx && nz >= ny) { a = x; b = y; } else if (ny >= nx) { a = x; b = z; } else { a = z; b = y; }
          if (sw) { var t = a; a = b; b = t; }
          uv.setXY(i, a / tile, b / tile);
        }
        uv.needsUpdate = true;
      });
    }
    /* grain direction chosen with the buttons in steps 3, 4 and the deep-row step; the deep row follows the upper row unless it has its own decor */
    function grainOf(role) {
      if (role === 'deep' && !(root.agMaterialSelections && root.agMaterialSelections.get('deep_finish'))) role = 'upper';
      var v = fieldVal(role + '_grain'); return v === 'h' ? 'h' : 'v';
    }
    function scaleUV(geo, w, h, d, tile, off) {
      var uv = geo.attributes.uv, sp = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (var f = 0; f < 6; f++) for (var i = 0; i < 4; i++) { var k = f * 4 + i; uv.setXY(k, uv.getX(k) * sp[f][0] / tile + off, uv.getY(k) * sp[f][1] / tile + off * .6); }
      uv.needsUpdate = true;
    }
    function tone(hex, shift, rough) {
      var k = hex + '|' + shift + '|' + (rough || 0); if (toneCache[k]) return toneCache[k];
      var col = new T.Color(hex); if (shift) col.offsetHSL(0, 0, shift);
      return (toneCache[k] = new T.MeshStandardMaterial({ color: col, roughness: rough === undefined ? .5 : rough, metalness: 0 }));
    }

    function readInputs() {
      var fr = pill('fridge_type_aglova'), fridge = null;
      if (/свободно/i.test(fr)) fridge = 'free_standing'; else if (/вграден/i.test(fr)) fridge = 'built_in';
      var dw = fieldVal('dishwasher_type').match(/(45|60)$/), step = (root.agFlow && root.agFlow.getStep && root.agFlow.getStep()) || Number(page.dataset.agFlowStep) || 1, bar = pill('bar_enabled_aglova'), barMode = /остров/i.test(bar) ? 'island' : /стена\s*1/i.test(bar) ? 'wall1' : /стена\s*2/i.test(bar) ? 'wall2' : 'none';
      var w1 = dimMm('stena1_len_aglova'), w2 = dimMm('stena2_len_aglova'), cA = chimA(), cB = chimB(), chim = /^да$/i.test(pill('chimney_exists'));
      // with a chimney the entered wall lengths run from the chimney outwards (the chimney is not included): the real wall is longer by A (wall 1) and B (wall 2)
      var phys1 = chim && cA && cB && w1 > 0 && w2 > 0 ? w1 + cA : w1, phys2 = chim && cA && cB && w1 > 0 && w2 > 0 ? w2 + cB : w2;
      return {
        wall1Mm: phys1, wall2Mm: phys2, heightMm: dimMm('visochina_aglova') || 2600, kitchenHMm: dimMm('kitchen_height_aglova'),
        chimney: /^да$/i.test(pill('chimney_exists')), chimneyAMm: chimA(), chimneyBMm: chimB(), chimneyAGuess: !dimMm('chimney_a_aglova'), chimneyBGuess: !dimMm('chimney_b_aglova'),
        waterWall: /2/.test(pill('water_position_aglova')) ? 2 : 1, ovenTower: /^да$/i.test(pill('oven_tall_unit_aglova')), fridge: fridge,
        deep: pill('deep-cabinets') === 'yes', barMode: barMode,
        barLenMm: dimMm(barMode === 'island' ? 'island_len_aglova' : 'bar_len_aglova'), barWidthMm: dimMm(barMode === 'island' ? 'island_width_aglova' : 'bar_width_aglova'),
        dishwasherMm: dw ? Number(dw[1]) * 10 : 0, washer: !!fieldVal('washing_machine_type'),
        microwave: fieldVal('microwave_type') === 'built_in', coffee: fieldVal('coffee_machine_type') === 'built_in',
        dishFree: /^free/.test(fieldVal('dishwasher_type')), washFree: fieldVal('washing_machine_type') === 'free_standing',
        microFree: fieldVal('microwave_type') === 'free_standing', coffeeFree: fieldVal('coffee_machine_type') === 'free_standing',
        x: { handleless: chk('handleless'), drawers: chk('more_drawers'), glass: chk('glass_display'), lift: chk('lift_mechanisms'), panel: chk('panel_doors'), light: chk('counter_lighting'), bottle: chk('bottle_rack') },
        showCabinets: step >= 2 && w1 > 0 && w2 > 0,
        gU: grainOf('upper'), gL: grainOf('lower'), gD: grainOf('deep'),
        cUpper: colourOf('upper_finish'), cDeep: colourOf('deep_finish'), cLower: colourOf('lower_finish'), cTop: colourOf('countertop_finish'), cBack: colourOf('backsplash_finish')
      };
    }

    /* ---------------- materials / helpers / fronts / appliances (shared with the straight-kitchen viewer) */
    function setupMats() {
      var M = function (c, r, m) { return new T.MeshStandardMaterial({ color: c, roughness: r === undefined ? .6 : r, metalness: m || 0 }); };
      mats = { front: M(0xf4f0e6, .5), frontA: M(0xf4f0e6, .5), frontB: M(0xd9cfba, .5), frontAlt: M(0xcfc6b2, .55), carcass: M(0xb9b3a6, .8), plinth: M(0x2f3133, .8), top: M(0xa5875c, .5), steel: M(0xbfc4c8, .35, .7),
        glass: M(0x121518, .15, .3), hob: M(0x0e1012, .2, .2), ring: M(0x6b7075, .4, .5), wall: M(0xe1e5dd, 1), floor: M(0xcbc3b3, .95), side: M(0xd2d6cd, 1),
        upper: M(0xf4f0e6, .5), deep: M(0xd9cfba, .5), island: M(0xe5dfd2, .6), sink: M(0x9aa1a6, .3, .8), appl: M(0xe8ebed, .4, .15), highlight: new T.MeshBasicMaterial({ color: 0x477448, transparent: true, opacity: .35, side: T.DoubleSide }) };
      mats.glassFront = new T.MeshStandardMaterial({ color: 0xcfe3e6, roughness: .1, metalness: .1, transparent: true, opacity: .32 }); mats.glow = new T.MeshBasicMaterial({ color: 0xffe8b0 }); mats.led = new T.MeshBasicMaterial({ color: 0xfff1c2 });
      mats.topDefault = mats.top; mats.carcassDefault = mats.carcass; mats.islandDefault = mats.island;
    }
    var edgeMat = null;
    function box(w, h, d, mat, x, y, z, parent) { var bg = new T.BoxGeometry(w, h, d); if (mat.map && mat.userData.tile) scaleUV(bg, w, h, d, mat.userData.tile, ((texN++) * .37) % 1); var m = new T.Mesh(bg, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m);
      if (parent && Math.max(w, h, d) > .07 && (Math.min(w, h, d) > .012 || (mat !== mats.steel && Math.min(w, h) > .2 && d > .006)) && mat !== mats.glass && mat !== mats.hob) { if (!edgeMat) edgeMat = new T.LineBasicMaterial({ color: 0x3c3f3b, transparent: true, opacity: .75 }); var ed = new T.LineSegments(new T.EdgesGeometry(m.geometry), edgeMat); ed.raycast = function () {}; m.add(ed); }
      return m; }
    function label(text, size, color, bg) {
      var c = document.createElement('canvas'), g = c.getContext('2d'), fs = 44; g.font = '600 ' + fs + 'px sans-serif';
      var w = Math.ceil(g.measureText(text).width) + 28; c.width = w; c.height = fs + 22;
      g.font = '600 ' + fs + 'px sans-serif'; if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
      g.fillStyle = color || '#3b423b'; g.textBaseline = 'middle'; g.fillText(text, 14, c.height / 2 + 2);
      var tex = new T.CanvasTexture(c); tex.anisotropy = 4;
      var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); sp.scale.set(size * c.width / c.height, size, 1); sp.renderOrder = 10; return sp;
    }
    function fmt(mm) { return (mm % 10 === 0 ? mm / 10 : (mm / 10).toFixed(1)) + ' см'; }

    /* ---------------- fronts */
    var TALLH = 2.4, D = 0.582,   // carcass depth: with the 18 mm door the unit is 600 mm deep, like the planner's BASE_DEPTH
       PL = 0.1, BH = 0.9, WT = 0.038, G = 0.004, FT = 0.018;
    var X = {};   /* extras chosen in step 8: handleless, drawers, glass, lift, panel, light, bottle */
    function handleH(g, x, y, len) { if (X.handleless) return; box(len, 0.012, 0.014, mats.steel, x, y, D + FT + 0.007, g); }
    function handleV(g, x, y, len) { if (X.handleless) return; box(len, 0.012, 0.014, mats.steel, x, y, D + FT + 0.007, g); }
    function front(g, w, y0, y1, mat, x) {
      var h = y1 - y0 - G; box(w - G, h, FT, mat || mats.front, x || 0, y0 + h / 2 + G / 2, D + FT / 2, g);
      if (X.panel && (!mat || mat === mats.front) && h > .3 && w > .25) box(w - G - .12, h - .12, .008, mat || mats.front, x || 0, y0 + h / 2 + G / 2, D + FT + .004, g);   // shaker panel
      return h;
    }
    function doors(g, w, y0, y1, n, low) {   // low: the handle on the bottom edge (doors above eye level, e.g. the top of a tall unit)
      var dw = w / n; for (var i = 0; i < n; i++) { var cx = -w / 2 + dw * (i + .5); front(g, dw, y0, y1, mats.front, cx); handleH(g, cx, low ? y0 + .06 : y1 - .06, Math.min(.2, dw * .55)); }
    }
    function drawers(g, w, y0, y1, heights) {
      var tot = heights.reduce(function (a, b) { return a + b; }, 0), y = y1;
      heights.forEach(function (hh) { var h = (y1 - y0) * hh / tot; front(g, w, y - h, y, mats.front, 0); handleH(g, 0, y - 0.04, Math.min(w * .6, .3)); y -= h; });
    }
    function hobPlate(g, w) {
      var pw = Math.min(w - .06, .58), k = pw / .58;
      box(pw, 0.008, .5, mats.hob, 0, BH + 0.004, .31, g);
      box(pw + .012, 0.004, .512, mats.steel, 0, BH + 0.002, .31, g);                                  // steel frame
      var r = [[-.14, .2], [.14, .2], [-.14, .42], [.14, .42]], rad = [.075, .06, .055, .075];
      r.forEach(function (p, i) {
        var ring = new T.Mesh(new T.RingGeometry(rad[i] * .8, rad[i], 32), mats.ring); ring.rotation.x = -Math.PI / 2; ring.position.set(p[0] * k, BH + 0.0092, p[1] + .1); g.add(ring);
        var dot = new T.Mesh(new T.CircleGeometry(rad[i] * .22, 20), mats.ring); dot.rotation.x = -Math.PI / 2; dot.position.set(p[0] * k, BH + 0.0092, p[1] + .1); g.add(dot);
      });
      box(pw * .5, 0.002, .022, mats.steel, 0, BH + 0.0092, .53, g);                                   // touch controls
    }
    function ovenFront(g, w, y0, y1) {
      front(g, w, y0, y1, mats.steel, 0); var h = y1 - y0, z = D + FT;
      box(w - .04, .075, .008, mats.hob, 0, y1 - .06, z + .004, g);                                    // control strip
      box(.09, .026, .004, mats.glass, 0, y1 - .06, z + .009, g);                                      // display
      for (var i = 0; i < 4; i++) { var kn = new T.Mesh(new T.CylinderGeometry(.014, .014, .014, 18), mats.sink); kn.rotation.x = Math.PI / 2; kn.position.set(i < 2 ? -w / 2 + .06 + i * .045 : w / 2 - .06 - (3 - i) * .045, y1 - .06, z + .015); g.add(kn); }
      box(w - .09, h - .2, .008, mats.front, 0, (y0 + y1) / 2 - .06, z + .004, g);                     // glass frame
      box(w - .13, h - .24, .006, mats.glass, 0, (y0 + y1) / 2 - .06, z + .01, g);                     // oven window
      box(w - .16, .018, .026, mats.steel, 0, y1 - .125, z + .026, g);                                 // handle bar
    }
    function microFront(g, w, y0, y1) {
      front(g, w, y0, y1, mats.steel, 0); var h = y1 - y0, cy = (y0 + y1) / 2, z = D + FT;
      box(w * .64, h - .08, .008, mats.glass, -w * .12, cy, z + .004, g);
      box(w * .2, h - .08, .008, mats.hob, w * .33, cy, z + .004, g);
      box(w * .12, .03, .004, mats.ring, w * .33, cy + h * .22, z + .01, g);
      var kn = new T.Mesh(new T.CylinderGeometry(.016, .016, .014, 18), mats.sink); kn.rotation.x = Math.PI / 2; kn.position.set(w * .33, cy - h * .12, z + .014); g.add(kn);
      box(.012, h * .6, .016, mats.sink, w * .19, cy, z + .016, g);
    }
    function sinkTop(g, w) {
      box(Math.min(w - .1, .5), .004, .4, mats.sink, 0, BH + 0.002, .3, g);
      var bowl = box(Math.min(w - .16, .42), .006, .3, mats.glass, 0, BH + 0.005, .3, g);
      var base = new T.Mesh(new T.CylinderGeometry(.022, .026, .03, 16), mats.steel); base.position.set(0, BH + .015, .1); g.add(base);
      var neck = new T.Mesh(new T.CylinderGeometry(.011, .011, .28, 12), mats.steel); neck.position.set(0, BH + .17, .1); g.add(neck);
      var arm = new T.Mesh(new T.CylinderGeometry(.01, .01, .17, 12), mats.steel); arm.rotation.x = Math.PI / 2; arm.position.set(0, BH + .3, .185); g.add(arm);
    }
    function porthole(g, w, y0, y1) {
      front(g, w, y0, y1, mats.front, 0); var cy = (y0 + y1) / 2 - .02;
      var ring = new T.Mesh(new T.TorusGeometry(.17, .016, 12, 40), mats.steel); ring.position.set(0, cy, D + FT + .008); g.add(ring);
      var disc = new T.Mesh(new T.CircleGeometry(.155, 36), mats.glass); disc.position.set(0, cy, D + FT + .004); g.add(disc);
    }


    /* ---------------- free-standing & built-in appliances */
    function freeDishwasher(g, W) {
      var h = BH - WT - .012, w = W - .03, B0 = 0;
      box(w, h, D - .02, mats.steel, 0, B0 + h / 2, (D - .02) / 2, g);
      box(w - .02, .09, .016, mats.glass, 0, B0 + h - .05, D - .02 + .008, g);                       // control panel
      for (var i = 0; i < 4; i++) box(.02, .012, .008, mats.steel, -w / 2 + .08 + i * .035, B0 + h - .05, D - .02 + .018, g);
      box(w - .05, h - .2, .01, mats.appl, 0, B0 + (h - .2) / 2 + .02, D - .02 + .005, g);          // door panel (fixed appliance colour)
      box(w * .62, .016, .026, mats.steel, 0, B0 + h - .14, D + .02, g);                             // bar handle
    }
    function freeWasher(g, W) {
      var h = BH - WT - .012, w = W - .03, B0 = 0;
      box(w, h, D - .02, mats.appl, 0, B0 + h / 2, (D - .02) / 2, g);
      box(w - .02, .1, .014, mats.carcass, 0, B0 + h - .06, D - .02 + .007, g);                      // control strip
      var kn = new T.Mesh(new T.CylinderGeometry(.022, .022, .014, 20), mats.steel); kn.rotation.x = Math.PI / 2; kn.position.set(-w / 2 + .08, B0 + h - .06, D - .02 + .02); g.add(kn);
      box(.1, .03, .008, mats.glass, w / 2 - .12, B0 + h - .06, D - .02 + .016, g);
      var cy = B0 + (h - .12) / 2, ring = new T.Mesh(new T.TorusGeometry(.17, .02, 14, 44), mats.steel); ring.position.set(0, cy, D - .02 + .01); g.add(ring);
      var disc = new T.Mesh(new T.CircleGeometry(.152, 40), mats.glass); disc.position.set(0, cy, D - .02 + .006); g.add(disc);
    }
    function standMicro(g, x) {
      var w = .46, h = .28, d = .36, y = BH + h / 2 + .004, z = .36;
      box(w, h, d, mats.steel, x, y, z, g);
      box(w * .66, h - .06, .01, mats.glass, x - w * .12, y, z + d / 2 + .004, g);
      box(.1, h - .06, .01, mats.hob, x + w * .36, y, z + d / 2 + .004, g);
      box(.012, h * .6, .014, mats.steel, x + w * .2, y, z + d / 2 + .012, g);
    }
    function standCoffee(g, x) {
      var w = .28, h = .4, d = .38, z = .3, y = BH + h / 2 + .004;
      box(w, h, d, mats.hob, x, y, z, g);
      box(w - .04, .06, .02, mats.steel, x, BH + h - .06, z + d / 2 + .004, g);                      // head
      box(.05, .018, .06, mats.steel, x, BH + .19, z + d / 2 + .01, g);                              // spout
      box(w - .06, .012, .12, mats.steel, x, BH + .06, z + d / 2 - .04, g);                          // drip tray
      box(.05, .05, .012, mats.glass, x + w * .3, BH + h * .72, z + d / 2 + .004, g);
    }
    // cut model for the order e-mail (cut list / SketchUp file): every cabinet built while CUT.on is recorded
    var CUT = { on: false, cab: [], tops: [], fills: [] };
    /* ---------------- free-standing microwave / coffee machine: their own objects on the countertop, moved with ✥ by grabbing them.
       Each keeps the place it was put on (moving a cabinet does not move it); only a spot that is no longer free counter
       (sink, hob, tall unit, the other appliance) sends it to the nearest free one. */
    var FREE = { pos: {} }, freeDrag = null, freeG = {}, FREE_W = { micro: 460, coffee: 280 }, FREE_OK = { genericBase: 1, basket: 1, dishwasher: 1, washingMachine: 1 };
    function freeSpans() {
      var by = {}, spans = [];
      items.forEach(function (m) { var w = m.wall || 1; (by[w] = by[w] || []).push(m); });
      Object.keys(by).forEach(function (wk) {
        var cur = null;
        by[wk].slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (m) {
          if (!FREE_OK[m.type]) { cur = null; return; }
          if (cur && Math.abs(cur.x1 - m.x) < 2) cur.x1 = m.x + m.w; else { cur = { wall: Number(wk), x0: m.x, x1: m.x + m.w }; spans.push(cur); }
        });
      });
      return spans;
    }
    function freeFix(inp) {
      var want = []; if (inp.microFree) want.push('micro'); if (inp.coffeeFree) want.push('coffee');
      Object.keys(FREE.pos).forEach(function (k) { if (want.indexOf(k) < 0) delete FREE.pos[k]; });
      var spans = freeSpans(), M = 40, GAP = 60, placed = [];
      want.forEach(function (k) {
        var hw = FREE_W[k] / 2, p = FREE.pos[k], best = null, bd = Infinity;
        spans.forEach(function (sp) {
          var lo = sp.x0 + M + hw, hi = sp.x1 - M - hw; if (lo > hi) return;
          var mid = (lo + hi) / 2, cands = [p && p.wall === sp.wall ? Math.max(lo, Math.min(hi, p.x)) : mid, lo, hi];
          placed.forEach(function (o) { if (o.wall === sp.wall) cands.push(o.x - o.hw - hw - GAP, o.x + o.hw + hw + GAP); });
          cands.forEach(function (x) {
            if (x < lo - .5 || x > hi + .5) return;
            if (placed.some(function (o) { return o.wall === sp.wall && Math.abs(o.x - x) < o.hw + hw + GAP - 1; })) return;
            var d = p ? (p.wall === sp.wall ? Math.abs(x - p.x) : 1e7 + Math.abs(x - p.x)) : -(sp.x1 - sp.x0) * 10 + Math.abs(x - mid);
            if (d < bd) { bd = d; best = { wall: sp.wall, x: x }; }
          });
        });
        if (best) { FREE.pos[k] = best; placed.push({ wall: best.wall, x: best.x, hw: hw }); } else delete FREE.pos[k];
      });
    }
    function freeBuild() {
      freeG = {};
      Object.keys(FREE.pos).forEach(function (k) {
        var p = FREE.pos[k], g = new T.Group(); if (k === 'micro') standMicro(g, 0); else standCoffee(g, 0);
        g.position.x = lc(p.wall, p.x); g.userData = { freeApp: k, wall: p.wall }; (function (w) { return wg[w]; })(p.wall).add(g); freeG[k] = g;
      });
    }
    function freeHit(ev) {
      var objs = Object.keys(freeG).map(function (k) { return freeG[k]; }); if (!objs.length) return null;
      ndc(ev); var h = ray.intersectObjects(objs, true)[0]; if (!h) return null;
      var o = h.object; while (o && !(o.userData && o.userData.freeApp)) o = o.parent; return o || null;
    }
    function buildBase(m, w) {
      if (CUT.on) CUT.cab.push({ row: 'lower', type: m.type, wall: m.wall || 1, x: Math.round(m.x || 0), w: Math.round(m.w), h: Math.round((BH - PL - WT) * 1000), free: !!m.free });
      var g = new T.Group(), y0 = PL, y1 = BH - WT, W = w;
      box(W - 0.002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g);
      box(W - 0.002, y1 - y0, D - .01, mats.carcass, 0, (y0 + y1) / 2, (D - .01) / 2, g);
      switch (m.type) {
        case 'cornerBase': cornerFront(g, W, y0, y1); break;
        case 'sinkBase': doors(g, W, y0, y1, W > .601 ? 2 : 1); break;
        case 'ovenHobBase': ovenFront(g, W, y1 - .6, y1); front(g, W, y0, y1 - .6, mats.front, 0); handleH(g, 0, y1 - .6 - .04, W * .5); break;   // 60 cm oven flush with the worktop, one drawer below   // oven + drawer below it
        case 'hobBase': drawers(g, W, y0, y1, [1, 1, 1.6]); break;
        case 'dishwasher': if (m.free) break; front(g, W, y0, y1, mats.front, 0); box(W - .06, .02, .006, mats.glass, 0, y1 - .04, D + FT + .003, g); handleH(g, 0, y1 - .09, Math.min(W * .7, .4)); break;
        case 'washingMachine': if (m.free) break; front(g, W, y0, y1, mats.front, 0); handleH(g, 0, y1 - .06, Math.min(W * .5, .3)); break;   // built-in: behind a cabinet door like a real integrated washer
        case 'basket': if (X.bottle) { front(g, W, y0, y1, mats.front, 0); for (var bi = -2; bi <= 2; bi++) box(.008, y1 - y0 - .16, .01, mats.steel, bi * Math.min(.02, W / 7), (y0 + y1) / 2, D + FT + .006, g); handleH(g, 0, y1 - .05, W * .5); } else drawers(g, W, y0, y1, [1, 1, 1, 1]); break;
        case 'edgeFront': front(g, W, y0, y1, mats.frontAlt, 0); break;
        default: frontParts(g, W, y0, y1, frontOf(m, W));
      }
      if (m.type === 'ovenHobBase' || m.type === 'hobBase') hobPlate(g, W);
      if (m.type === 'sinkBase') sinkTop(g, W);
      if (m.free && m.type === 'dishwasher') { g.remove.apply(g, g.children.slice(0, 2)); freeDishwasher(g, W); }
      if (m.free && m.type === 'washingMachine') { g.remove.apply(g, g.children.slice(0, 2)); freeWasher(g, W); }
      if (m.host) { var two = m.host.length > 1; if (m.host.indexOf('micro') >= 0) standMicro(g, two ? -W * .22 : 0); if (m.host.indexOf('coffee') >= 0) standCoffee(g, two ? W * .26 : 0); }
      return g;
    }
    function buildTall(m, w) {
      if (CUT.on) CUT.cab.push({ row: 'tall', type: m.type, wall: m.wall || 1, x: Math.round(m.x || 0), w: Math.round(m.w), h: Math.round((TALLH - PL) * 1000), free: !!m.free || m.applianceType === 'free_standing' });
      var g = new T.Group(), H = TALLH, W = w;
      if (m.type === 'fridge') {
        if (m.applianceType === 'free_standing') {
          box(W - .01, 1.9, D + .02, mats.steel, 0, .95, (D + .02) / 2, g);
          front(g, W - .01, 1.2, 1.9, mats.steel, 0); front(g, W - .01, .02, 1.2, mats.steel, 0);
          box(.014, .5, .02, mats.sink, W / 2 - .05, 1.55, D + .03, g); box(.014, .5, .02, mats.sink, W / 2 - .05, .85, D + .03, g);
          box(W - .002, H - 1.9, D - .01, mats.carcass, 0, 1.9 + (H - 1.9) / 2, (D - .01) / 2, g); front(g, W, 1.9, H, mats.front, 0); handleH(g, 0, 1.94, W * .5);
        } else {
          box(W - .002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g); box(W - .002, H - PL, D - .01, mats.carcass, 0, PL + (H - PL) / 2, (D - .01) / 2, g);
          front(g, W, PL, 0.95, mats.front, 0); front(g, W, .95, Math.min(2.1, H - .25), mats.front, 0); front(g, W, Math.min(2.1, H - .25), H, mats.front, 0);
          handleH(g, 0, .95 + .05, W * .6); handleH(g, 0, .95 - .05, W * .6);
        }
      } else {
        box(W - .002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g); box(W - .002, H - PL, D - .01, mats.carcass, 0, PL + (H - PL) / 2, (D - .01) / 2, g);
        var y = PL, apps = m.appliances || [];
        if (m.type === 'ovenTower') { front(g, W, y, y + .38, mats.front, 0); handleH(g, 0, y + .33, W * .5); y += .38; }
        else { front(g, W, y, y + .5, mats.front, 0); handleH(g, 0, y + .45, W * .5); y += .5; }
        if (apps.indexOf('oven') >= 0) { ovenFront(g, W, y, y + .6); y += .6; }
        if (apps.indexOf('microwave') >= 0) { microFront(g, W, y, y + .4); y += .4; }
        if (apps.indexOf('coffeeMachine') >= 0) { front(g, W, y, y + .45, mats.steel, 0); box(.12, .1, .02, mats.glass, 0, y + .22, D + FT + .01, g); y += .45; }
        if (y < H - .75) { front(g, W, y, y + .55, mats.front, 0); handleH(g, 0, y + .05, W * .5); y += .55; }   // above the oven: handle on the bottom edge
        doors(g, W, y, H, 1, true);
      }
      return g;
    }
    function buildUpper(w, bottom, h, depth, mat, opt) {
      if (CUT.on) CUT.cab.push({ row: opt && opt.deep ? 'deep' : 'upper', wall: (opt && opt.wall) || 1, x: opt && opt.s0 != null ? Math.round(opt.s0) : null, z: Math.round(bottom * 1000), w: Math.round(w * 1000), h: Math.round(h * 1000), d: Math.round(depth * 1000), blind: Math.round((opt && opt.blind) || 0), glass: !!(opt && opt.glass), lift: !!(opt && opt.lift) });
      opt = opt || {}; var g = new T.Group(); box(w - .002, h, depth, mat, 0, bottom + h / 2, depth / 2, g);
      // corner cabinet: the end covered by the other wall's row gets a fixed blind panel as wide as that row is deep; the doors share the rest
      var bl = opt.blind ? Math.min(opt.blind + 18, w * 1000 - 150) / 1000 : 0; if (bl < .05) bl = 0;
      var sgn = opt.wall === 1 ? 1 : -1, wf = w - bl, ox = -sgn * bl / 2;
      if (bl) box(bl - G, h - G, FT, mat, sgn * (w / 2 - bl / 2), bottom + h / 2, depth + FT / 2, g);
      var lift = opt.lift === undefined ? !!X.lift : opt.lift, n = (lift || wf < .7) ? 1 : 2, dw = wf / n, fm = opt.glass ? mats.glassFront : mat;
      if (opt.glass) {                                                                                  // lit display cabinet: warm interior + shelves
        box(wf - .08, h - .08, depth - .06, mats.glow, ox, bottom + h / 2, depth / 2 + .02, g);
        [.33, .66].forEach(function (f) { box(wf - .08, .012, depth - .08, mats.steel, ox, bottom + h * f, depth / 2 + .02, g); });
      }
      if (lift && !opt.deep) {                                                                         // lift-up flaps: joint between flaps is horizontal; with glass = two small display cabinets one above the other
        if (opt.glass) box(wf - .08, .012, depth - .08, mats.steel, ox, bottom + h / 2, depth / 2 + .02, g);
        for (var k = 0; k < 2; k++) {
          var fy = bottom + h * (k ? .75 : .25);
          if (opt.glass) { box(wf - G, h / 2 - G, .008, fm, ox, fy, depth + .004, g); box(wf - G, .03, FT, mats.steel, ox, fy + h / 4 - .015, depth + FT / 2, g); box(wf - G, .03, FT, mats.steel, ox, fy - h / 4 + .015, depth + FT / 2, g); }
          else box(wf - G, h / 2 - G, FT, fm, ox, fy, depth + FT / 2, g);
          if (X.panel && !opt.glass && h > .5 && wf > .25) box(wf - G - .1, h / 2 - .1, .008, fm, ox, fy, depth + FT + .004, g);
          if (!X.handleless) box(Math.min(.2, wf * .55), .012, .014, mats.steel, ox, bottom + h * (k ? .5 : 0) + .05, depth + FT + .007, g);
        }
        n = 0;
      }
      for (var i = 0; i < n; i++) {
        var cx = ox - wf / 2 + dw * (i + .5);
        if (opt.glass) { box(dw - G, h - G, .008, fm, cx, bottom + h / 2, depth + .004, g); box(dw - G, .03, FT, mats.steel, cx, bottom + h - .015, depth + FT / 2, g); box(dw - G, .03, FT, mats.steel, cx, bottom + .015, depth + FT / 2, g); }
        else { box(dw - G, h - G, FT, fm, cx, bottom + h / 2, depth + FT / 2, g); if (X.panel && h > .3 && dw > .25) box(dw - G - .1, h - .1, .008, fm, cx, bottom + h / 2, depth + FT + .004, g); }
        if (!X.handleless) box(Math.min(.2, dw * .55), .012, .014, mats.steel, cx, bottom + .06, depth + FT + .007, g);
      }
      if (X.light && !opt.deep) box(w - .04, .012, .03, mats.led, 0, bottom - .006, depth - .05, g);       // LED strip under uppers
      return g;
    }


    /* corner unit: a 900 mm unit whose 600 mm inner part sits behind wall 2's first cabinet; only the 300 mm end away from the corner shows a front */
    function cornerFront(g, W, y0, y1) {
      var fw = .3 - .004, cx = -W / 2 + .15;
      var bw = W - .3, bx = W / 2 - bw / 2, bh = y1 - y0 - G; if (bw > .05) box(bw - G, bh, FT, mats.front, bx, y0 + bh / 2 + G / 2, D + FT / 2, g);   // blind panel over the part covered by the other wall's row (no door, no handle)
      front(g, fw + G, y0, y1, mats.front, cx); handleH(g, cx, y1 - .06, Math.min(.2, fw * .8));
    }
    /* distance along a wall (mm from the corner end) -> x in that wall's local frame (wall 1 is the mirror image, so its local x runs the other way) */
    var WALL = { 1: 0, 2: 0 };
    function lc(wall, sMm) { return wall === 1 ? (WALL[1] - sMm) / 1000 : sMm / 1000; }

    /* ---------------- room */
    var UPPER = { ub: 1.45, uh: .95, depth: .35 }, TOPROW = { ub: 2.07, uh: .33, depth: D - .014 };
    // the top of the upper row (standard or the deep second row) is always flush with the top of the tall column (2.4 m, or the ceiling when lower)
    function applyHeights(inp) {
      var top = Math.min(TALLH, (inp.heightMm || 2600) / 1000);
      if (inp.deep) { TOPROW.uh = .33; TOPROW.ub = top - TOPROW.uh; UPPER.uh = Math.max(.3, TOPROW.ub - UPPER.ub); }
      else UPPER.uh = Math.max(.3, top - UPPER.ub);
    }
    /* ---------------- island: dragged in the move mode (✥), sized / turned in the ✎ editor; it keeps a 50 cm passage from both cabinet runs */
    var ISLLIM = { len: [600, 4000], w: [400, 1500] }, ISL = { pos: null, rot: false }, ISLROOM = null, islandG = null, islandLbl = null, islDrag = null;
    function islClamp(x, z) {
      var R = ISLROOM; if (!R) return { x: x, z: z }; var hx = R.sx / 2, hz = R.sz / 2, m = .05, pass = D + .5;
      x = Math.max(hx + m, Math.min(R.L2 - hx - m, x)); z = Math.max(hz + m, Math.min(R.L1 - hz - m, z));
      if (x - hx < pass && z - hz < pass) { if (pass + hx - x < pass + hz - z) x = pass + hx; else z = pass + hz; }   // out of the corner block: push to the nearer free side
      return { x: Math.min(x, R.L2 - hx - m), z: Math.min(z, R.L1 - hz - m) };
    }
    function islHit(ev) { if (!islandG) return false; ndc(ev); return ray.intersectObject(islandG, true).length > 0; }
    function islFloor(ev) { ndc(ev); var p = new T.Vector3(); return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -BH), p) ? p : null; }
    function islSetDim(key, mm) {   // writes the size back into the form's own pickers (metres + centimetres), so the order carries it too
      var row = q('.dimension-row[data-dim="' + key + '"]'); if (!row) return;
      var cm = Math.round(mm / 10), hasM = !!row.querySelector('.meters-control'), vals = hasM ? [Math.floor(cm / 100), cm % 100] : [0, cm];   // the island width row has only a centimetre picker
      ['.meters-control', '.centimeters-control'].forEach(function (sel2, i) { row.querySelectorAll(sel2 + ' .picker-value-text,' + sel2 + ' .picker-value').forEach(function (e) { e.textContent = String(vals[i]); }); });
      row.classList.add('is-touched'); row.setAttribute('data-touched', 'true');
    }
    function buildRoom(inp) {
      while (roomGroup.children.length) roomGroup.remove(roomGroup.children[0]); islandG = null; islandLbl = null;
      var L1 = (inp.wall1Mm || 3600) / 1000, L2 = (inp.wall2Mm || 3600) / 1000, H = (inp.heightMm || 2600) / 1000;
      texN = 0; mats.top = inp.cTop !== null && inp.cTop !== undefined ? finLen('countertop_finish', inp.cTop, .45) : mats.topDefault;
      mats.island = inp.cLower !== null && inp.cLower !== undefined ? fin('lower_finish', inp.cLower, -.03) : mats.islandDefault;
      var bh = UPPER.ub - BH, cx0 = inp.chimney && inp.chimneyBMm ? inp.chimneyBMm / 1000 : 0, cz0 = inp.chimney && inp.chimneyAMm ? inp.chimneyAMm / 1000 : 0;
      if (inp.showCabinets && inp.x && inp.x.light) {
        var m1 = new T.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: .22 });
        var g2 = new T.Mesh(new T.PlaneGeometry(L2 - cx0, bh), m1); g2.position.set(cx0 + (L2 - cx0) / 2, (UPPER.ub + BH) / 2, .006); roomGroup.add(g2);
        var g1 = new T.Mesh(new T.PlaneGeometry(L1 - cz0, bh), m1); g1.rotation.y = Math.PI / 2; g1.position.set(.006, (UPPER.ub + BH) / 2, cz0 + (L1 - cz0) / 2); roomGroup.add(g1);
      }
      if (inp.showCabinets && inp.cBack !== null && inp.cBack !== undefined) {
        var bm = splashMat('backsplash_finish', inp.cBack);
        [[2, L2 - cx0, cx0, 0], [1, L1 - cz0, cz0, 1]].forEach(function (s) {
          var bgm = new T.PlaneGeometry(s[1], bh);
          if (bm.map) { var buv = bgm.attributes.uv; for (var bi = 0; bi < buv.count; bi++) buv.setXY(bi, buv.getX(bi) * s[1] / (bh * 2.5), buv.getY(bi)); }
          var bs = new T.Mesh(bgm, bm);
          if (s[3]) { bs.rotation.y = Math.PI / 2; bs.position.set(.004, (UPPER.ub + BH) / 2, s[2] + s[1] / 2); } else bs.position.set(s[2] + s[1] / 2, (UPPER.ub + BH) / 2, .004);
          roomGroup.add(bs);
        });
      }
      var floor = new T.Mesh(new T.PlaneGeometry(L2, L1), mats.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(L2 / 2, -.001, L1 / 2); floor.receiveShadow = true; roomGroup.add(floor);
      function grid(step, color, y, opacity) {
        var pts = [], v;
        for (v = 0; v <= L2 + 1e-6; v += step) pts.push(v, 0, 0, v, 0, L1);
        for (v = 0; v <= L1 + 1e-6; v += step) pts.push(0, 0, v, L2, 0, v);
        var gm = new T.BufferGeometry(); gm.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
        var ln = new T.LineSegments(gm, new T.LineBasicMaterial(opacity ? { color: color, transparent: true, opacity: opacity } : { color: color })); ln.position.y = y; roomGroup.add(ln);
      }
      grid(.5, 0xb9b6ae, .001, .8); grid(1, 0x8e8b82, .002);
      var w2 = new T.Mesh(new T.PlaneGeometry(L2, H), mats.wall); w2.position.set(L2 / 2, H / 2, -.001); roomGroup.add(w2);
      var w1 = new T.Mesh(new T.PlaneGeometry(L1, H), mats.side); w1.rotation.y = Math.PI / 2; w1.position.set(-.001, H / 2, L1 / 2); roomGroup.add(w1);
      var edges = [0, 0, 0, 0, H, 0, L2, 0, 0, L2, H, 0, 0, 0, L1, 0, H, L1, 0, H, 0, L2, H, 0, 0, H, 0, 0, H, L1, 0, 0, 0, L2, 0, 0, 0, 0, 0, 0, 0, L1];
      var eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(edges, 3)); roomGroup.add(new T.LineSegments(eg, new T.LineBasicMaterial({ color: 0x9aa09a })));
      // dimension lines on the floor in front of each run (wall 2 along x, wall 1 along z) + the height on the corner edge
      var off = D + .45, gl = new T.LineBasicMaterial({ color: 0x477448 });
      var ch = inp.chimney && inp.chimneyAMm && inp.chimneyBMm, s2 = ch ? inp.chimneyBMm / 1000 : 0, s1 = ch ? inp.chimneyAMm / 1000 : 0;   // the wall lengths are measured from the chimney outwards
      roomGroup.add(new T.LineSegments(new T.BufferGeometry().setFromPoints([
        new T.Vector3(s2, .004, off), new T.Vector3(L2, .004, off), new T.Vector3(s2, .004, off - .07), new T.Vector3(s2, .004, off + .07), new T.Vector3(L2, .004, off - .07), new T.Vector3(L2, .004, off + .07),
        new T.Vector3(off, .004, s1), new T.Vector3(off, .004, L1), new T.Vector3(off - .07, .004, s1), new T.Vector3(off + .07, .004, s1), new T.Vector3(off - .07, .004, L1), new T.Vector3(off + .07, .004, L1),
        new T.Vector3(.02, 0, .02), new T.Vector3(.02, H, .02)]), gl));
      var t2 = label('стена 2 · ' + fmt((inp.wall2Mm || 3600) - (ch ? inp.chimneyBMm : 0)), .2, '#2f4a30', 'rgba(255,255,255,.85)'); t2.position.set((s2 + L2) / 2, .14, off + .1); roomGroup.add(t2);
      var t1 = label('стена 1 · ' + fmt((inp.wall1Mm || 3600) - (ch ? inp.chimneyAMm : 0)), .2, '#2f4a30', 'rgba(255,255,255,.85)'); t1.position.set(off + .1, .14, (s1 + L1) / 2); roomGroup.add(t1);
      var ht = label(fmt(inp.heightMm || 2600), .2, '#2f4a30', 'rgba(255,255,255,.85)'); ht.position.set(.0, H / 2, .1); roomGroup.add(ht);
      if (inp.chimney && inp.chimneyAMm && inp.chimneyBMm) {
        var cA = inp.chimneyAMm / 1000, cB = inp.chimneyBMm / 1000, OR = 0xd9822b;
        var cb = box(cB, H, cA, mats.chimney, cB / 2, H / 2, cA / 2, roomGroup); cb.castShadow = false;
        var co = new T.LineSegments(new T.EdgesGeometry(cb.geometry), new T.LineBasicMaterial({ color: OR })); co.raycast = function () {}; cb.add(co);
        // A = along wall 1 (z), B = along wall 2 (x): orange dimension lines on the chimney's top edges, with A / B badges
        var ty = H + .03, tk = .07;
        roomGroup.add(new T.LineSegments(new T.BufferGeometry().setFromPoints([
          new T.Vector3(cB, ty, 0), new T.Vector3(cB, ty, cA), new T.Vector3(cB - tk, ty, 0), new T.Vector3(cB + tk, ty, 0), new T.Vector3(cB - tk, ty, cA), new T.Vector3(cB + tk, ty, cA),
          new T.Vector3(0, ty, cA), new T.Vector3(cB, ty, cA), new T.Vector3(0, ty, cA - tk), new T.Vector3(0, ty, cA + tk)]), new T.LineBasicMaterial({ color: OR })));
        var la = label('A  ' + (inp.chimneyAGuess ? '?' : fmt(inp.chimneyAMm)), .2, '#ffffff', '#d9822b'); la.position.set(cB + .3, H - .3, cA / 2); roomGroup.add(la);
        var lb2 = label('B  ' + (inp.chimneyBGuess ? '?' : fmt(inp.chimneyBMm)), .2, '#ffffff', '#d9822b'); lb2.position.set(cB / 2 - .05, H - .62, cA + .34); roomGroup.add(lb2);
      }
      if (inp.barMode !== 'none' && inp.barLenMm && inp.barWidthMm) {
        var bl = inp.barLenMm / 1000, bw = inp.barWidthMm / 1000, isl = inp.barMode === 'island', ax = inp.barMode === 'wall1' ? 'z' : 'x', gap = 1.2;
        if (isl && ISL.rot) ax = 'z';   // the island turned 90° with the ✎ editor
        var ig = new T.Group(), sx = ax === 'x' ? bl : bw, sz = ax === 'x' ? bw : bl;
        box(sx, BH - WT - .1, sz, mats.island, 0, .1 + (BH - WT - .1) / 2, 0, ig); box(sx - .01, .1, sz - .06, mats.plinth, 0, .05, 0, ig); box(sx + .04, WT, sz + .04, mats.top, 0, BH - WT / 2, 0, ig);
        var px, pz;
        if (inp.barMode === 'wall1') { px = D + gap + bw / 2; pz = L1 / 2; }
        else if (inp.barMode === 'wall2') { px = L2 / 2; pz = D + gap + bw / 2; }
        else { px = (L2 + D) / 2; pz = D + gap + bw / 2; }
        if (isl) { ISLROOM = { L1: L1, L2: L2, sx: sx, sz: sz }; if (ISL.pos) { px = ISL.pos.x; pz = ISL.pos.z; } var cc = islClamp(px, pz); px = cc.x; pz = cc.z; }
        ig.position.set(px, 0, pz); roomGroup.add(ig); if (isl) { ig.userData = { island: true }; islandG = ig; }
        var it = label((isl ? 'остров ' : 'бар ') + fmt(inp.barLenMm) + ' × ' + fmt(inp.barWidthMm), .16, '#4a4132', 'rgba(255,255,255,.85)'); it.position.set(px, BH + .18, pz); roomGroup.add(it); if (isl) islandLbl = it;
      }
    }

    /* ---------------- пас (6 cm filler): a mini cabinet front in the same plane and material as the doors, no handle */
    function pasLower(w) {
      if (CUT.on) CUT.fills.push({ w: Math.round(w * 1000), h: Math.round((BH - PL - WT) * 1000) });
      var g = new T.Group(), y0 = PL, y1 = BH - WT;
      box(w - .002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g);
      box(w - .002, y1 - y0, D - .01, mats.carcass, 0, (y0 + y1) / 2, (D - .01) / 2, g);
      var h = y1 - y0 - G; box(w - G, h, FT, mats.front, 0, y0 + h / 2 + G / 2, D + FT / 2, g);
      return g;
    }
    function pasUpper(w, deep) {
      var R = deep ? TOPROW : UPPER, g = new T.Group(); box(w - .002, R.uh, R.depth, deep ? mats.deep : mats.upper, 0, R.ub + R.uh / 2, R.depth / 2, g);
      box(w - G, R.uh - G, FT, deep ? mats.deep : mats.upper, 0, R.ub + R.uh / 2, R.depth + FT / 2, g);
      return g;
    }

    /* ---------------- cabinets */
    var meshById = {}, deepCut = 0, xfer = [], lastApplied = [], moveCheck = null, glassPick = null;   // glassPick: the upper unit that is the glass display (it travels with that unit when it is dragged)
    function addLabel(g, text) { var lb = label(text, .12, '#3b423b', 'rgba(255,255,255,.78)'); lb.position.set(0, .02, D + .22); g.add(lb); }
    function buildCabinets(inp) {
      CUT = { on: true, cab: [], tops: [], fills: [] };
      while (cabGroup.children.length) cabGroup.remove(cabGroup.children[0]);
      hl.saved = []; hl.key = null; meshById = {}; msg.hidden = true; items = []; X = inp.x || {}; texN = 0; unitById = {}; upos = {}; dpos = {}; uRuns = [];
      wg = {}; [1, 2].forEach(function (w) { wg[w] = new T.Group(); cabGroup.add(wg[w]); });
      WALL[1] = inp.wall1Mm; WALL[2] = inp.wall2Mm;
      wg[1].rotation.y = Math.PI / 2; wg[1].position.set(0, 0, inp.wall1Mm / 1000); wg[1].updateMatrixWorld(true);
      if (!inp.showCabinets) return;
      var cfgPlan = { wall1Mm: inp.wall1Mm, wall2Mm: inp.wall2Mm, heightMm: inp.heightMm, kitchenHMm: inp.kitchenHMm, waterWall: inp.waterWall, ovenTower: inp.ovenTower, fridge: inp.fridge, dishwasherMm: inp.dishwasherMm, washer: inp.washer, microwave: inp.microwave, coffee: inp.coffee, basket: !!(inp.x && inp.x.bottle), chimney: inp.chimney, chimneyAMm: inp.chimneyAMm, chimneyBMm: inp.chimneyBMm, deep: inp.deep }; plan = planCorner(cfgPlan);
      if (plan.errors.length) { msg.textContent = plan.errors[0]; msg.hidden = false; return; }
      lastApplied = applyMoves(plan, xfer);
      if (moveCheck && !moveCheck.mv.every(function (m) { return lastApplied.indexOf(m) >= 0; })) {   // the move does not fit: undo it
        var mc = moveCheck; xfer = mc.old.xfer; order = mc.old.order; uorder = mc.old.uorder; dorder = mc.old.dorder; plan = planCorner(cfgPlan); lastApplied = applyMoves(plan, xfer);
        msg.textContent = 'Размяната не е възможна: шкафовете на стената не се побират след нея.'; msg.hidden = false; setTimeout(function () { msg.hidden = true; }, 4500);
      }
      moveCheck = null; xfer = lastApplied;   // cross-wall moves made by the user are re-applied on every rebuild while they still fit
      edMergeLow([1, 2].map(function (w) { return plan.walls[w].modules; }));   // lower cabinets merged in the ✎ editor
      lastInp = inp; [1, 2].forEach(function (w) { plan.walls[w].fillerMm = edApplyLow(plan.walls[w].modules, plan.walls[w].fillerMm, MAX_FILLER); });   // widths changed in the ✎ editor
      var tails = {};
      [1, 2].forEach(function (w) {
        var wl = plan.walls[w], ordered = applyOrder(wl.modules, dirty ? order[w] : null); order[w] = ordered.map(function (m) { return m.id; });
        ordered.forEach(function (m, i) { m.idx = i; });
        var pos = position(ordered, wl.startMm); pos.items.forEach(function (m) { m.wall = w; items.push(m); }); tails[w] = pos.end;
      });
      var byId = {}; items.forEach(function (m) { byId[m.id] = m; });
      // upper units + their own order (kept only while it still fits the lower layout)
      // upper rows meet in the corner: wall 1's run starts at the chimney face (or the corner), wall 2's run starts where wall 1's upper front plane ends - unless the chimney is deep enough to separate them
      var cA = plan.pas ? (inp.chimneyAMm || 0) : 0, cB = plan.pas ? (inp.chimneyBMm || 0) : 0, dS = Math.round((UPPER.depth + FT) * 1000), dD = Math.round((TOPROW.depth + FT) * 1000);
      var s2s = cA >= dS ? cB : Math.max(cB, dS), s2d = inp.deep ? (cA >= dD ? cB : Math.max(cB, dD)) : s2s, st1 = plan.walls[1].startMm, st2 = plan.walls[2].startMm;
      deepCut = Math.max(0, s2d - s2s);
      [1, 2].forEach(function (w) { upperRuns(w, position(plan.walls[w].modules, plan.walls[w].startMm).items, w === 1 ? Math.max(0, st1 - cA) : Math.max(0, st2 - s2s)).forEach(function (r) { uRuns.push(r); r.units.forEach(function (u) { unitById[u.id] = u; }); }); });
      edMergeUp(uRuns); edApplySlots(uRuns);   // upper cabinets merged / resized in the ✎ editor
      // the standard upper row and the deep row above it are two independent layers, each with its own order (slots keep their widths, the unit moves into the slot)
      function layer(ord) {
        var ok = !!ord && ord.length === uRuns.length;
        if (ok) { var seen = {}, cnt = 0, total = Object.keys(unitById).length; ord.forEach(function (ids, ri) { ids.forEach(function (id) { if (!unitById[id] || seen[id]) ok = false; else { seen[id] = 1; cnt++; } }); if (ids.length !== uRuns[ri].units.length) ok = false; }); if (cnt !== total) ok = false; }
        var ids = (ok ? ord : uRuns.map(function (r) { return r.units.map(function (u) { return u.id; }); })).map(function (a) { return a.slice(); }), pos = {};
        uRuns.forEach(function (r, ri) { var ux = r.x0; ids[ri].forEach(function (id, si) { var sw = r.units[si].w; pos[id] = { wall: r.wall, x: ux, w: sw, first: r.first && ux === r.x0 && r.wall === 2, firstW1: r.first && ux === r.x0 && r.wall === 1 }; ux += sw; }); });
        return { ok: ok, ids: ids, pos: pos };
      }
      var LU = layer(uorder), LD = layer(dorder);
      if (!LU.ok) uorder = null; if (!LD.ok) dorder = null;
      upos = LU.pos; dpos = LD.pos; layerIds = { u: LU.ids, d: LD.ids };
      uRuns.forEach(function (r, ri) { r.ids = LU.ids[ri]; });
      var unitList = []; uRuns.forEach(function (r) { r.ids.forEach(function (id) { unitList.push(id); }); });
      // the glass display is one particular unit: chosen once (middle of the run), then it moves with that unit; a new one only when it no longer exists
      if (!X.glass) glassPick = null;
      else if (!glassPick || unitList.indexOf(glassPick) < 0) { var base = []; uRuns.forEach(function (r) { r.units.forEach(function (u) { base.push(u.id); }); }); glassPick = base.length ? base[Math.floor(base.length / 2)] : null; }
      var glassId = X.glass ? glassPick : null;
      items.forEach(function (m) { m.free = (m.type === 'dishwasher' && inp.dishFree) || (m.type === 'washingMachine' && inp.washFree); m.host = null; });
      var gb = items.filter(function (m) { return m.type === 'genericBase' || m.type === 'basket'; });
      if (!gb.length) gb = items.filter(function (m) { return !TALL[m.type] && m.type !== 'cornerBase'; });
      if (gb.length) {
      }
      var hasL = inp.cLower !== null && inp.cLower !== undefined, hasU = inp.cUpper !== null && inp.cUpper !== undefined;
      var hasD = inp.cDeep !== null && inp.cDeep !== undefined && !!(root.agMaterialSelections && root.agMaterialSelections.get('deep_finish'));
      mats.front = hasL ? fin('lower_finish', inp.cLower, 0, undefined, inp.gL) : mats.frontA; mats.carcass = hasL ? mats.front : mats.carcassDefault; mats.upper = hasU ? fin('upper_finish', inp.cUpper, 0, undefined, inp.gU) : mats.front;
      mats.deep = hasD ? fin('deep_finish', inp.cDeep, 0, undefined, inp.gD) : (hasU ? fin('upper_finish', inp.cUpper, 0, undefined, inp.gD) : mats.front);
      items.forEach(function (m) {
        var w = m.w / 1000, cx = lc(m.wall, m.x + m.w / 2);
        var g = TALL[m.type] ? buildTall(m, w) : buildBase(m, w);
        g.position.x = cx; worldUV(g); g.userData = { id: m.id, wall: m.wall, targetX: cx, w: w, type: m.type }; wg[m.wall].add(g); meshById[m.id] = g; addLabel(g, String(m.w / 10));
      });
      freeFix(inp); freeBuild();
      unitList.forEach(function (id) {
        var u = upos[id], w = u.w / 1000, ux = lc(u.wall, u.x + u.w / 2);
        var up = buildUpper(w, UPPER.ub, UPPER.uh, UPPER.depth, mats.upper, { glass: uGlass(id), lift: uLift(id), wall: u.wall, s0: u.x, blind: u.firstW1 && cA < dS ? dS - 18 : 0 }); up.position.x = ux; worldUV(up); up.userData = { id: id, wall: u.wall, upper: true, layer: 'u', targetX: ux }; wg[u.wall].add(up); meshById[id + ':u'] = up;
      });
      if (inp.deep) Object.keys(dpos).forEach(function (id) {
        var u = dpos[id], ux = lc(u.wall, u.x + u.w / 2), cut = u.first ? deepCut : 0, dw2 = (u.w - cut) / 1000; if (dw2 < .05) return;
        var dp = buildUpper(dw2, TOPROW.ub, TOPROW.uh, TOPROW.depth, mats.deep, { deep: true, glass: uGlass(id + ':d'), wall: u.wall, s0: u.x + cut, blind: u.firstW1 && cA < dD ? dD - 18 : 0 }), dsx = ux + cut / 2000 * (u.wall === 2 ? 1 : -1);
        dp.position.x = dsx; worldUV(dp); dp.userData = { id: id, wall: u.wall, upper: true, layer: 'd', targetX: dsx }; wg[u.wall].add(dp); meshById[id + ':d'] = dp;
      });
      // no panel at the far end of a wall: the run simply ends with its last cabinet / appliance
      // 6 cm corner fillers (пас) next to the chimney, and the strip beside a narrow chimney
      if (plan.pas) {
        var pf = function (w, a, b, onlyUpper) {
          var x = lc(w, (a + b) / 2), parts = [];
          if (!onlyUpper) parts.push(pasLower((b - a) / 1000));
          parts.forEach(function (g) { g.position.x = x; g.userData = { filler: true }; wg[w].add(g); });
        };
        pf(1, plan.pas.wall1.from, plan.pas.wall1.to); pf(2, plan.pas.wall2.from, plan.pas.wall2.to);
        // the dead corner between the two runs (the chimney stands in it): a solid block with door-plane fronts and a worktop on top
        var cbk = plan.pas.block, bx = cbk.x1 / 1000, bz = cbk.z1 / 1000;
        box(bx - .06, PL, bz - .06, mats.plinth, (bx - .06) / 2, PL / 2, (bz - .06) / 2, wg[2]);
        box(bx, BH - PL - WT, bz, mats.carcass, bx / 2, PL + (BH - PL - WT) / 2, bz / 2, wg[2]);
        box(.018, BH - PL - WT - G, bz, mats.front, bx + .009 - FT, PL + (BH - PL - WT) / 2, bz / 2, wg[2]);          // face towards wall 2's run (+x)
        box(bx, BH - PL - WT - G, .018, mats.front, bx / 2, PL + (BH - PL - WT) / 2, bz + .009 - FT, wg[2]);          // face towards wall 1's run (+z)
        CUT.tops.push({ len: Math.round((bx + .02) * 1000), d: Math.round((bz + .02) * 1000), corner: true }); CUT.cab.push({ row: 'cornerBlock', w: Math.round(bx * 1000), d: Math.round(bz * 1000), h: Math.round((BH - PL - WT) * 1000) }); var ct = new T.Group(); box(bx + .02, WT, bz + .02, mats.top, bx / 2 + .01, BH - WT / 2, bz / 2 + .01, ct); ct.userData = { top: true }; wg[2].add(ct);
      }
      // worktop slabs over each consecutive base run (the filler included); wall 2's first slab starts after wall 1's slab so the L is seamless
      [1, 2].forEach(function (w) {
        var wl = plan.walls[w], segs = [];
        items.filter(function (m) { return m.wall === w; }).forEach(function (m) { if (TALL[m.type]) segs.push(null); else if (!segs.length || segs[segs.length - 1] === null) segs.push([m.x, m.x + m.w]); else segs[segs.length - 1][1] = m.x + m.w; });
        segs.filter(Boolean).forEach(function (s) {
          var a = s[0], b = s[1];
          if (plan.pas && a === wl.startMm) a -= PAS;
          if (w === 2 && !inp.chimney && a === wl.startMm) a += 20;
          CUT.tops.push({ x: Math.round(a), len: Math.round(b - a), d: Math.round((D + .02) * 1000), wall: typeof w === 'number' ? w : 1 }); var top = new T.Group(); box((b - a) / 1000, WT, D + .02, mats.top, lc(w, (a + b) / 2), BH - WT / 2, (D + .02) / 2, top); top.userData = { top: true }; wg[w].add(top);
        });
      });
      var cur = { wall1Mm: plan.wall1Mm, wall2Mm: plan.wall2Mm, walls: {} };
      [1, 2].forEach(function (w) { cur.walls[w] = { startMm: plan.walls[w].startMm, fillerMm: plan.walls[w].fillerMm, modules: items.filter(function (m) { return m.wall === w; }).map(function (m) { return { id: m.id, type: m.type, widthMm: m.w, xMm: m.x }; }), uppers: unitList.filter(function (id) { return upos[id].wall === w; }).map(function (id) { return { id: id, widthMm: upos[id].w, xMm: upos[id].x }; }) }; });
      CUT.on = false; cur.cut = { kitchen: 'aglova', heightMm: inp.heightMm || 0, splashH: Math.round((UPPER.ub - BH) * 1000), cabinets: CUT.cab, tops: CUT.tops, fills: CUT.fills, island: inp.barMode && inp.barMode !== 'none' && inp.barLenMm && inp.barWidthMm ? { kind: inp.barMode === 'island' ? 'island' : 'bar', len: inp.barLenMm, w: inp.barWidthMm } : null };
      root.agLayout.current = cur;
      if (sel) { if (edMesh(sel)) { hl.key = null; setHL(edKey(sel)); edRender(); } else edClose(); }   // the island is not in meshById: look it up with edMesh
    }

    /* ---------------- camera fit + sync */
    var home = { pos: null, target: null };
    function fit(inp) {
      var L1 = (inp.wall1Mm || 3600) / 1000, L2 = (inp.wall2Mm || 3600) / 1000, H = (inp.heightMm || 2600) / 1000;
      var el = renderer && renderer.domElement, asp = el && el.clientHeight ? el.clientWidth / el.clientHeight : 1.6; asp = Math.max(.6, Math.min(2.5, asp));
      var tv = Math.tan(21 * Math.PI / 180), th = tv * asp, halfW = (L1 + L2) / (2 * Math.SQRT2);
      var dist = Math.max((halfW * 1.15) / th, (H / 2 * 1.35) / tv, 3.4) + .6;
      var el26 = 26 * Math.PI / 180, dir = new T.Vector3(Math.SQRT1_2 * Math.cos(el26), Math.sin(el26), Math.SQRT1_2 * Math.cos(el26));
      bounds = { x: L2, y: H, z: L1 };
      home.target = new T.Vector3(L2 / 2, Math.min(H * .42, 1.05), L1 / 2); home.pos = home.target.clone().add(dir.multiplyScalar(dist));
      camera.position.copy(home.pos); controls.target.copy(home.target); controls.maxDistance = dist * 2.2; controls.minDistance = 1.2; controls.update();
    }
    function sync(force) {
      if (failed || !renderer) return;
      var inp = readInputs(), sig = JSON.stringify(inp);
      TALLH = Math.min(Math.max(2, Math.min(3, (inp.kitchenHMm || 2400) / 1000)), (inp.heightMm || 2600) / 1000);   // top of the tall units and of the upper row: the kitchen height from step 1 (never above the room)
      var show = card.dataset.previewState === 'planner';
      host.hidden = !show; stage.classList.toggle('ag-3d-on', show);
      if (!show) return;
      if (sig === inputsSig && !force) return;
      var prev = inputsSig ? JSON.parse(inputsSig) : null; inputsSig = sig;
      if (prev && prev.waterWall !== inp.waterWall) { dirty = false; uorder = null; dorder = null; }   // an explicit water-wall choice re-flows both runs
      resize(); applyHeights(inp); buildRoom(inp); buildCabinets(inp);
      var fs = (inp.wall1Mm || 0) + '|' + (inp.wall2Mm || 0) + '|' + (inp.heightMm || 0);
      if (fs !== fitSig) { fitSig = fs; fit(inp); }
      hint.textContent = inp.showCabinets ? (editMode ? 'Промяна на шкаф: докоснете шкаф, за да смените ширината, чекмеджетата, повдигащите врати или витрината.' : panMode ? 'Преместване на изгледа: влачете наляво/надясно и нагоре/надолу · Мащаб: колелце/щипване' : moveMode ? 'Местене на шкафове: хванете шкаф и го пуснете върху друг (и на другата стена, ако се побира), за да си разменят местата.' : 'Въртене: влачете · Мащаб: колелце/щипване') : 'Въведете размерите — виждате голото помещение с мерна решетка (всеки квадрат е 50 см).';
      modeBtn.hidden = autoBtn.hidden = editBtn.hidden = !inp.showCabinets; setMode(panMode ? 'pan' : moveMode ? 'move' : editMode ? 'edit' : 'rotate', true);
    }

    /* ---------------- drag & drop (within one wall) */
    function ndc(ev) { var r = renderer.domElement.getBoundingClientRect(); mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); }
    function pickModule(ev) {
      ndc(ev); var objs = []; Object.keys(meshById).forEach(function (k) { objs.push(meshById[k]); });
      var hit = ray.intersectObjects(objs, true)[0]; if (!hit) return null;
      var o = hit.object; while (o && !(o.userData && o.userData.id)) o = o.parent; return o ? { id: o.userData.id, wall: o.userData.wall, upper: !!o.userData.upper, layer: o.userData.layer || 'u' } : null;
    }
    function groundWorld(ev, upper) {
      ndc(ev); var plane = new T.Plane(new T.Vector3(0, 1, 0), upper === 'd' ? -2.2 : upper ? -1.75 : -0.45), p = new T.Vector3();
      return ray.ray.intersectPlane(plane, p) ? p : null;
    }
    function groundX(ev, wall, upper) { var p = groundWorld(ev, upper); return p ? wg[wall].worldToLocal(p).x : null; }
    // world position (x, z) of the centre of a lower module / upper unit, to find the nearest drop target on either wall
    function centreWorld(wall, sMm, wMm, z) { var v = new T.Vector3(lc(wall, sMm + wMm / 2), 0, z); wg[wall].updateMatrixWorld(true); return wg[wall].localToWorld(v); }
    function dragKeys(d) { return d.upper ? [d.id + ':' + d.layer] : [d.id]; }
    function onDown(ev) {
      if (edPointerDown(ev)) return;
      if (moveMode && !panMode && ev.button <= 0) { var fo = freeHit(ev); if (fo) { var gx0 = (function (ev, w) { return groundX(ev, w, null); })(ev, fo.userData.wall); if (gx0 !== null) { freeDrag = { k: fo.userData.freeApp, wall: fo.userData.wall, g: fo, off: gx0 - fo.position.x, moved: false }; controls.enabled = false; try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ } renderer.domElement.style.cursor = 'grabbing'; return; } } }
      if (moveMode && !panMode && ev.button <= 0 && islHit(ev)) { var p0 = islFloor(ev); if (p0) { islDrag = { ox: p0.x - islandG.position.x, oz: p0.z - islandG.position.z }; controls.enabled = false; renderer.domElement.setPointerCapture(ev.pointerId); renderer.domElement.style.cursor = 'grabbing'; return; } }
      if (!moveMode || panMode || !items.length || ev.button > 0) return;
      var pk = pickModule(ev); if (!pk) return;
      var m0 = pk.upper ? null : items.filter(function (m) { return m.id === pk.id; })[0];
      if (m0 && m0.type === 'cornerBase') return;                       // the corner unit is fixed
      var gx = groundX(ev, pk.wall, pk.upper ? pk.layer : null); if (gx === null) return;
      var m = meshById[pk.upper ? pk.id + ':' + pk.layer : pk.id]; if (!m) return;
      drag = { id: pk.id, wall: pk.wall, upper: pk.upper, layer: pk.layer, off: gx - m.position.x, moved: false, target: null }; controls.enabled = false; renderer.domElement.setPointerCapture(ev.pointerId); renderer.domElement.style.cursor = 'grabbing';
    }
    function setLift(keys, on) { keys.forEach(function (k) { var g = meshById[k]; if (g) { g.position.z = on ? .08 : 0; } }); }
    function runOf(id) { for (var i = 0; i < uRuns.length; i++) if (uRuns[i].ids.indexOf(id) >= 0) return i; return -1; }
    // lower modules on different walls can trade places (the ordinary cabinets of both walls are re-sized to fit); two ordinary cabinets trade widths
    function crossOk(a, b) {
      var ma = items.filter(function (m) { return m.id === a; })[0], mb = items.filter(function (m) { return m.id === b; })[0];
      return !!(ma && mb && ma.wall !== mb.wall && !(ma.type === 'genericBase' && mb.type === 'genericBase' && ma.w === mb.w));
    }
    function onMove(ev) {
      if (freeDrag) {   // it slides along the counter and may change to another wall (the run nearest to the pointer)
        var fp = groundWorld(ev, null), fbest = null, fbd = Infinity;
        if (fp) Object.keys(wg).forEach(function (k) { var w = Number(k), l = wg[w].worldToLocal(fp.clone()); if (l.x < -.2 || l.x > WALL[w] / 1000 + .2) return; var d = Math.abs(l.z - D / 2); if (d < fbd) { fbd = d; fbest = { wall: w, x: l.x }; } });
        if (fbest) {
          if (fbest.wall !== freeDrag.wall) { wg[fbest.wall].add(freeDrag.g); freeDrag.g.userData.wall = fbest.wall; freeDrag.wall = fbest.wall; freeDrag.off = 0; }
          freeDrag.g.position.x = Math.max(0, Math.min(WALL[freeDrag.wall] / 1000, fbest.x - freeDrag.off)); freeDrag.moved = true;
        }
        return;
      }
      if (edDown && edDown.io && Math.abs(ev.clientX - edDown.x) + Math.abs(ev.clientY - edDown.y) > 8) {   // ✎ mode: a drag on the island moves it
        islDrag = edDown.io; edDown = null; try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ } renderer.domElement.style.cursor = 'grabbing';
      }
      if (islDrag) { var pi = islFloor(ev); if (pi && islandG) { var ci = islClamp(pi.x - islDrag.ox, pi.z - islDrag.oz); islandG.position.set(ci.x, 0, ci.z); if (islandLbl) islandLbl.position.set(ci.x, BH + .18, ci.z); ISL.pos = ci; } return; }
      if (!drag) return;
      var gx = groundX(ev, drag.wall, drag.upper ? drag.layer : null); if (gx === null) return; drag.moved = true;
      var cx = Math.max(0, Math.min(WALL[drag.wall] / 1000, gx - drag.off)), keys = dragKeys(drag);
      keys.forEach(function (k) { var g = meshById[k]; if (g) { g.position.x = cx; g.userData.targetX = cx; } });
      setLift(keys, true);
      var best = null, bd = 1e9, bc = 0, bw = 0, bwall = drag.wall, pw = groundWorld(ev, drag.upper ? drag.layer : null);
      if (drag.upper) {
        var P = drag.layer === 'd' ? dpos : upos;
        Object.keys(P).forEach(function (id) {
          if (id === drag.id) return;
          var u = P[id], cw = pw ? centreWorld(u.wall, u.x, u.w, .2) : null, d = cw ? Math.hypot(cw.x - pw.x, cw.z - pw.z) : 1e9;
          if (d < bd) { bd = d; best = id; bc = lc(u.wall, u.x + u.w / 2); bw = u.w; bwall = u.wall; }
        });
      } else {
        items.forEach(function (m) {
          if (m.id === drag.id || m.type === 'cornerBase' || (m.wall !== drag.wall && !crossOk(drag.id, m.id))) return;
          var cw = pw ? centreWorld(m.wall, m.x, m.w, .3) : null, d = cw ? Math.hypot(cw.x - pw.x, cw.z - pw.z) : 1e9;
          if (d < bd) { bd = d; best = m.id; bc = lc(m.wall, m.x + m.w / 2); bw = m.w; bwall = m.wall; }
        });
      }
      drag.target = best && bd < Math.max(bw / 1000, .45) ? best : null; drag.targetWall = bwall;
      setHL(drag.target ? (drag.upper ? drag.target + ':' + drag.layer : drag.target) : null);   // the cabinet that will be replaced turns green
    }
    /* green tint on the cabinet whose place the dragged one will take (materials are cloned, the shared ones stay untouched) */
    var hl = { key: null, saved: [] };
    function clearHL() { hl.saved.forEach(function (o) { if (o.parent) o.parent.remove(o); o.geometry.dispose(); o.material.dispose(); }); hl.saved = []; hl.key = null; }
    function setHL(key) {
      if (hl.key === key) return; clearHL(); var g0 = key === 'island' ? islandG : meshById[key]; if (!key || !g0) return;
      var g = g0, box = new T.Box3(), inv = new T.Matrix4(); g.updateMatrixWorld(true); inv.copy(g.matrixWorld).invert();
      g.traverse(function (o) { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv)); } });
      if (box.isEmpty()) return;
      var sz = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
      var ov = new T.Mesh(new T.BoxGeometry(sz.x + .012, sz.y + .012, sz.z + .012), new T.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: .5, depthWrite: false }));
      ov.position.copy(c); ov.renderOrder = 5; g.add(ov); hl.saved.push(ov); hl.key = key;   // a translucent green shell over the whole cabinet, front included
    }
    function onUp(ev) {
      if (edPointerUp(ev)) return;
      if (freeDrag) { var fd = freeDrag; freeDrag = null; controls.enabled = true; renderer.domElement.style.cursor = ''; try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) { /* not captured */ } if (fd.moved) FREE.pos[fd.k] = { wall: fd.wall, x: (function (w, lx) { return w === 1 ? WALL[1] - lx * 1000 : lx * 1000; })(fd.wall, fd.g.position.x) }; inputsSig = ''; sync(true); return; }
      if (islDrag) { islDrag = null; controls.enabled = true; renderer.domElement.style.cursor = ''; if (editMode) edSelect({ id: 'island', island: true }); try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) { /* not captured */ } return; }
      if (!drag) return; var d = drag; drag = null; controls.enabled = true; renderer.domElement.style.cursor = ''; clearHL();
      try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) { /* not captured */ }
      if (d.moved && d.target) {
        if (d.upper) {
          var L = d.layer || 'u', r = layerIds[L].map(function (x) { return x.slice(); }), ra = -1, rb = -1;
          r.forEach(function (ids, i) { if (ids.indexOf(d.id) >= 0) ra = i; if (ids.indexOf(d.target) >= 0) rb = i; });
          if (ra >= 0 && rb >= 0) { var ia = r[ra].indexOf(d.id), ib = r[rb].indexOf(d.target); r[ra][ia] = d.target; r[rb][ib] = d.id; if (L === 'd') dorder = r; else uorder = r; if (L === 'u' && !dorder) dorder = layerIds.d.map(function (x) { return x.slice(); }); if (L === 'd' && !uorder) uorder = layerIds.u.map(function (x) { return x.slice(); }); }
        } else {
          if (!uorder) uorder = layerIds.u.map(function (x) { return x.slice(); }); if (!dorder) dorder = layerIds.d.map(function (x) { return x.slice(); });   // freeze the uppers: only the lower cabinets move
          var tm = items.filter(function (m) { return m.id === d.target; })[0], sm = items.filter(function (m) { return m.id === d.id; })[0];
          if (tm && sm && tm.wall !== sm.wall) {
            if (crossOk(d.id, d.target)) {
              var dIdx = function (id, w) { var r = -1; plan.walls[w].modules.forEach(function (m, i) { if (m.id === id) r = i; }); return r; };
              var gen = function (m) { return m.type === 'genericBase'; }, mv = [], before = JSON.stringify(xfer);
              if (gen(tm) && gen(sm)) mv.push({ gs: [sm.id, tm.id] });
              else if (gen(tm)) mv.push({ id: sm.id, to: tm.wall, at: dIdx(tm.id, tm.wall) });
              else if (gen(sm)) mv.push({ id: tm.id, to: sm.wall, at: dIdx(sm.id, sm.wall) });
              else { var ia = dIdx(sm.id, sm.wall), ib = dIdx(tm.id, tm.wall); mv.push({ id: sm.id, to: tm.wall, at: ib }, { id: tm.id, to: sm.wall, at: ia }); }
              var oldOrder = { 1: order[1].slice(), 2: order[2].slice() }, oldX = xfer, oldU = uorder, oldD = dorder;
              xfer = xfer.concat(mv); uorder = null; dorder = null;
              if (gen(tm) && gen(sm)) { /* ids stay on their walls: order unchanged */ }
              else if (!gen(tm) && !gen(sm)) { order[sm.wall] = order[sm.wall].map(function (id) { return id === sm.id ? tm.id : id; }); order[tm.wall] = order[tm.wall].map(function (id) { return id === tm.id ? sm.id : id; }); }
              else { var fx = gen(tm) ? sm : tm, gn = gen(tm) ? tm : sm; order[fx.wall] = order[fx.wall].filter(function (id) { return id !== fx.id; }); order[gn.wall] = order[gn.wall].map(function (id) { return id === gn.id ? fx.id : id; }); }
              dirty = true; moveCheck = { mv: mv, old: { order: oldOrder, xfer: oldX, uorder: oldU, dorder: oldD } };
            }
          } else { order[d.wall] = swapIds(order[d.wall], d.id, d.target); dirty = true; }
        }
      }
      setLift(dragKeys(d), false); sync(true); inputsSig = ''; sync(true);
    }

    var edSlots = true, lastInp = {};
    function edGlassDefault() { return glassPick; }
    function curDeepRow() { return !!lastInp.deep; }
    function edWhere(id, upper) {   // 'left wall, 2nd lower unit from the corner'
      var WN = { 1: 'left wall', 2: 'right wall' }, ord = function (n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); };
      if (upper) { var u = upos[id]; if (!u) return 'upper cabinet'; var on = Object.keys(upos).filter(function (k) { return upos[k].wall === u.wall; }).sort(function (a, b) { return upos[a].x - upos[b].x; });
        return WN[u.wall] + ', ' + ord(on.indexOf(id) + 1) + ' upper cabinet from the corner'; }
      var m = edModule(id); if (!m) return 'lower cabinet'; var list = items.filter(function (x) { return x.wall === m.wall; }).sort(function (a, b) { return a.x - b.x; });
      return WN[m.wall] + ', ' + ord(list.indexOf(m) + 1) + ' lower unit from the corner';
    }
    /* ---------------- cabinet editor (✎): pick one cabinet in the sketch, change its width and its fronts.
       Edits are kept per cabinet id and re-applied on every rebuild; the sketch picture and its key carry them to the AI. */
    var EDIT = { low: {}, up: {}, slot: {}, mLow: [], mUp: [] }, sel = null, editMode = false, edDown = null, edNote = '';
    var STEP_W = 50, MIN_W = 150, MAX_W = 1200;
    function wLim(t) { return t === 'sinkBase' ? [450, 1200] : [MIN_W, MAX_W]; }   // ordinary cabinets 15-120 cm, sink base 45-120 cm
    function canResize(m) { return !!m && (m.type === 'genericBase' || m.type === 'sinkBase'); }
    var edBox = document.createElement('div'); edBox.className = 'ag-3d-edit'; edBox.hidden = true; host.appendChild(edBox);
    ['pointerdown', 'pointerup', 'touchstart', 'wheel', 'mousedown'].forEach(function (t) { edBox.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    // the editor cursor is the same pencil as the ✎ button (tip = hot spot)
    var ED_CUR = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="5"><path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/></g><g stroke="#222" stroke-width="2"><path d="M4 20l1-5L16 4l4 4L9 19z" fill="#fff"/><path d="M14 6l4 4"/></g></svg>') + '") 4 24, crosshair';
    var edCss = document.createElement('style');
    edCss.textContent = '.flow-aglova .ag-3d[data-mode=edit] canvas{cursor:' + ED_CUR + '}' + '.flow-aglova .ag-3d-edit{position:absolute;z-index:12;min-width:190px;max-width:236px;background:#fff;border:1px solid #c8cbc7;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:8px 10px;font:12px/1.3 sans-serif;color:#2f372f}' +
      '.flow-aglova .ag-3d-edit-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;font-weight:700}' +
      '.flow-aglova .ag-3d-edit-x{width:26px;height:26px;border:0;border-radius:8px;background:#f1f3f0;color:#2f372f;font:600 15px/1 sans-serif;cursor:pointer}' +
      '.flow-aglova .ag-3d-edit-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}' +
      '.flow-aglova .ag-3d-edit-w{display:flex;align-items:center;gap:6px}.flow-aglova .ag-3d-edit-w b{min-width:58px;text-align:center;font-variant-numeric:tabular-nums}' +
      '.flow-aglova .ag-3d-edit button.ag-3d-ed{min-height:26px;padding:3px 7px;border:1px solid #cfd4cb;border-radius:7px;background:#fff;color:#2f372f;font:600 11px/1.2 sans-serif;cursor:pointer}' +
      '.flow-aglova .ag-3d-edit button.ag-3d-ed:hover{border-color:#477448}.flow-aglova .ag-3d-edit button.ag-3d-ed.is-on{background:#477448;border-color:#477448;color:#fff}' +
      '.flow-aglova .ag-3d-edit button.ag-3d-ed:disabled{opacity:.4;cursor:not-allowed}' +
      '.flow-aglova .ag-3d-edit-seg{display:flex;flex-wrap:wrap;gap:4px}.flow-aglova .ag-3d-edit-lbl{font-size:11px;color:#606760;margin:6px 0 3px}' +
      '.flow-aglova .ag-3d-edit-note{font-size:11px;color:#7a2d1f;margin-top:6px}.flow-aglova .ag-3d-edit-info{font-size:11px;color:#606760;margin-top:6px}';
    document.head.appendChild(edCss);
    function edMesh(s) { return s && s.island ? islandG : meshById[edKey(s)]; }
    function edKey(s) { if (s.island) return 'island'; return s.upper ? s.id + ':' + (s.layer || 'u') : s.id; }
    function edModule(id) { for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i]; return null; }
    function edPos(s) { var P = s.layer === 'd' ? dpos : upos; return P && P[s.id]; }
    function frontOf(m, W) {   // the default front of an ordinary lower cabinet (what the sketch draws without an edit)
      var e = m && EDIT.low[m.id]; if (e && e.front && m.type === 'genericBase') return e.front;
      if (W <= .601) return 'doors'; if (X.drawers) return 'd4'; if (W >= .7) return 'doors'; return m && m.idx % 2 ? 'd3' : 'doors';
    }
    // upper edits are keyed by the unit id; the deep row above it uses '<id>:d'
    function edUpKey(s) { return s.layer === 'd' ? s.id + ':d' : s.id; }
    function uLift(key) { var e = EDIT.up[key]; return /:d$/.test(key) ? false : e && e.lift !== undefined ? e.lift : !!X.lift; }
    function uGlass(key) { var e = EDIT.up[key]; return e && e.glass !== undefined ? e.glass : !!(X.glass && key === edGlassDefault()); }
    function frontParts(g, W, y0, y1, f) {
      if (f === 'doors') doors(g, W, y0, y1, W >= .7 ? 2 : 1);
      else drawers(g, W, y0, y1, f === 'd2' ? [1, 1] : f === 'd3' ? [1, 1, 1.5] : [1, 1, 1, 1.4]);
    }
    /* change one ordinary lower cabinet's width; the other ordinary cabinets of the same run (then the filler) take up the difference */
    function edAbsorb(list, target, delta, fill, maxFill) {
      var others = list.filter(function (x) { return x !== target && x.type === 'genericBase'; }), saved = others.map(function (o) { return o.w; }), left = -delta;
      for (var i = others.length - 1; i >= 0 && left !== 0; i--) { var nw = Math.max(MIN_W, Math.min(MAX_W, others[i].w + left)); left -= nw - others[i].w; others[i].w = nw; }
      if (left === 0) return { ok: true, filler: fill };
      var nf = fill + left; if (nf >= 0 && nf <= maxFill) return { ok: true, filler: nf };
      others.forEach(function (o, k) { o.w = saved[k]; }); return { ok: false };
    }
    function edApplyLow(list, fill, maxFill) {   // returns the new filler width of that run
      list.forEach(function (m) {
        var e = EDIT.low[m.id]; if (!e || !e.w || !canResize(m) || e.w === m.w) return;
        var lim = wLim(m.type), want = Math.max(lim[0], Math.min(lim[1], e.w)), r = edAbsorb(list, m, want - m.w, fill, maxFill);
        if (r.ok) { m.w = want; e.w = want; fill = r.filler; } else { e.w = m.w; edNote = 'Няма място: другите шкафове на тази стена вече са на минимална или максимална ширина.'; }
      });
      return fill;
    }
    function edApplySlots(runs) {   // upper units: the neighbour in the same run takes up the difference
      runs.forEach(function (r) {
        r.units.forEach(function (u, i) {
          var want = EDIT.slot[u.id]; if (!want || want === u.w) return;
          var nb = r.units[i + 1] || r.units[i - 1]; if (!nb) { EDIT.slot[u.id] = u.w; edNote = 'Този горен шкаф е сам в реда си: ширината му следва долния ред.'; return; }
          var d = Math.max(MIN_W, Math.min(MAX_W, want)) - u.w, nbw = Math.max(MIN_W, Math.min(MAX_W, nb.w - d)); d = nb.w - nbw;
          if (!d) { EDIT.slot[u.id] = u.w; edNote = 'Няма място: съседният горен шкаф вече е на минимална или максимална ширина.'; return; }
          u.w += d; nb.w -= d; EDIT.slot[u.id] = u.w;
        });
      });
    }
    /* ---------------- merging (✎): two neighbouring cabinets of the same row become one cabinet (up to MAX_W); "Раздели обратно" undoes the last merge.
       The lower and the upper row are independent: merging lower cabinets never changes the upper cabinets and the other way round. */
    function edFind(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }
    function edMergeLow(lists) {   // lists: the module arrays of the walls; pair { a, b, side }: b is absorbed into a (side 'L' = b stood before a)
      EDIT.mLow = EDIT.mLow.filter(function (p) {
        for (var k = 0; k < lists.length; k++) {
          var mods = lists[k], a = edFind(mods, p.a), b = edFind(mods, p.b); if (!a || !b) continue;
          if (a.type !== 'genericBase' || b.type !== 'genericBase') return false;
          var over = Math.max(0, a.w + b.w - MAX_W), rest = mods.filter(function (x) { return x !== a && x !== b && x.type === 'genericBase'; }), give = [];
          for (var r = 0; r < rest.length && over > 0; r++) { var g = Math.min(over, MAX_W - rest[r].w); if (g > 0) { give.push([rest[r], g]); over -= g; } }
          if (over > 0) return false;   // no room left on this wall
          give.forEach(function (q) { q[0].w += q[1]; });
          var pa = a.parts || [{ id: a.id, w: a.w }], pb = b.parts || [{ id: b.id, w: b.w }];
          a.parts = p.side === 'L' ? pb.concat(pa) : pa.concat(pb); a.w = Math.min(MAX_W, a.w + b.w); mods.splice(mods.indexOf(b), 1); return true;
        }
        return false;
      });
    }
    function edMergeUp(runs) {   // upper slots: b is absorbed into a (both rows above share the slots)
      EDIT.mUp = EDIT.mUp.filter(function (p) {
        for (var ri = 0; ri < runs.length; ri++) {
          var U = runs[ri].units, a = edFind(U, p.a), b = edFind(U, p.b); if (!a || !b) continue;
          var over = Math.max(0, a.w + b.w - MAX_W), rest = U.filter(function (u) { return u !== a && u !== b; }), give = [];
          for (var r = 0; r < rest.length && over > 0; r++) { var g = Math.min(over, MAX_W - rest[r].w); if (g > 0) { give.push([rest[r], g]); over -= g; } }
          if (over > 0) return false;
          give.forEach(function (q) { q[0].w += q[1]; });
          a.w = Math.min(MAX_W, a.w + b.w); U.splice(U.indexOf(b), 1); delete unitById[p.b]; return true;
        }
        return false;
      });
    }
    function edMergeInfo(s) {   // the selected cabinet's merge candidates: { key, cand: [{ id, mesh, side, ok }], merged }
      var c = [];
      if (!s.upper) {
        var m = edModule(s.id); if (!m || m.type !== 'genericBase') return null;
        var row = items.filter(function (x) { return x.wall === m.wall; }).sort(function (a, b) { return a.x - b.x; }), i = row.indexOf(m);
        [[row[i - 1], 'L'], [row[i + 1], 'R']].forEach(function (q) { var n = q[0]; if (n && n.type === 'genericBase') c.push({ id: n.id, mesh: n.id, side: q[1], ok: n.w + m.w <= MAX_W || row.filter(function (x) { return x.type === 'genericBase'; }).length > 2 }); });
        return { key: m.id, cand: c, merged: EDIT.mLow.some(function (p) { return p.a === m.id; }) };
      }
      var L = s.layer === 'd' ? 'd' : 'u', LI = layerIds[L] || [];
      for (var ri = 0; ri < LI.length; ri++) {
        var j = LI[ri].indexOf(s.id); if (j < 0 || !uRuns[ri]) continue;
        var U = uRuns[ri].units, me = U[j]; if (!me) return null;
        [[j - 1, 'L'], [j + 1, 'R']].forEach(function (q) { var n = U[q[0]]; if (n) c.push({ id: n.id, mesh: LI[ri][q[0]] + ':' + L, side: q[1], ok: n.w + me.w <= MAX_W || U.length > 2 }); });
        return { key: me.id, cand: c, merged: EDIT.mUp.some(function (p) { return p.a === me.id; }) };
      }
      return null;
    }
    function edScreenX(key) {   // where a cabinet is on the screen (-1 left .. 1 right), so the buttons can say "left" / "right" whatever the wall
      var g = meshById[key]; if (!g || !T || !camera) return 0; var bb = new T.Box3().setFromObject(g); if (bb.isEmpty()) return 0;
      return new T.Vector3((bb.min.x + bb.max.x) / 2, (bb.min.y + bb.max.y) / 2, (bb.min.z + bb.max.z) / 2).project(camera).x;
    }
    function edDoMerge(key, n) {
      if (!sel.upper) { EDIT.mLow.push({ a: key, b: n.id, side: n.side }); if (EDIT.low[key]) delete EDIT.low[key].w; delete EDIT.low[n.id]; return; }
      EDIT.mUp.push({ a: key, b: n.id, side: n.side }); delete EDIT.slot[key]; delete EDIT.slot[n.id]; delete EDIT.up[n.id]; delete EDIT.up[n.id + ':d'];
      uorder = null; dorder = null; sel.id = key;
    }
    function edDoSplit(key) {
      var list = sel.upper ? EDIT.mUp : EDIT.mLow;
      for (var i = list.length - 1; i >= 0; i--) if (list[i].a === key) { list.splice(i, 1); break; }
      if (sel.upper) { delete EDIT.slot[key]; uorder = null; dorder = null; sel.id = key; } else if (EDIT.low[key]) delete EDIT.low[key].w;
    }
    function edSlotOf(s) {   // the slot (position) the selected upper unit sits in
      if (!edSlots) return null; if (typeof edSlotFor === 'function') return edSlotFor(s); var L = layerIds && layerIds[s.layer === 'd' ? 'd' : 'u']; if (!L) return null;
      for (var ri = 0; ri < L.length; ri++) { var si = L[ri].indexOf(s.id); if (si >= 0 && uRuns[ri] && uRuns[ri].units[si]) return uRuns[ri].units[si]; }
      return null;
    }
    function edRender() {
      if (!sel) { edBox.hidden = true; return; }
      if (sel.island) {
        if (!islandG) { edClose(); return; }
        var il = dimMm('island_len_aglova'), iw = dimMm('island_width_aglova'), rowI = function (lbl, v, a, mn, mx) { return '<div class="ag-3d-edit-row"><span>' + lbl + '</span><span class="ag-3d-edit-w"><button type="button" class="ag-3d-ed" data-ed="' + a + '-"' + (v <= mn ? ' disabled' : '') + '>−</button><b>' + (v / 10) + ' см</b><button type="button" class="ag-3d-ed" data-ed="' + a + '+"' + (v >= mx ? ' disabled' : '') + '>+</button></span></div>'; };
        edBox.innerHTML = '<div class="ag-3d-edit-head"><span>Остров</span><button type="button" class="ag-3d-edit-x" data-ed="close" aria-label="Затвори">×</button></div>' +
          rowI('Дължина', il, 'il', ISLLIM.len[0], ISLLIM.len[1]) + rowI('Ширина', iw, 'iw', ISLLIM.w[0], ISLLIM.w[1]) +
          '<div class="ag-3d-edit-seg"><button type="button" class="ag-3d-ed" data-ed="irot">Завърти 90°</button><button type="button" class="ag-3d-ed" data-ed="ipos">Върни на мястото</button></div>' +
          '<div class="ag-3d-edit-info">Местене: хванете острова и го плъзнете.</div>';
        edBox.hidden = false; edPlace(); return;
      }
      var html = '', m = sel.upper ? null : edModule(sel.id), p = sel.upper ? edPos(sel) : null;
      if (!sel.upper && !m) { edClose(); return; }
      if (sel.upper && !p) { edClose(); return; }
      var w = sel.upper ? p.w : m.w, title = sel.upper ? (sel.layer === 'd' ? 'Горен шкаф (дълбок ред)' : 'Горен шкаф') : (TALL[m.type] ? 'Колона' : 'Долен шкаф');
      var canW = sel.upper ? !!edSlots : canResize(m), lim = sel.upper ? [MIN_W, MAX_W] : wLim(m.type);
      html += '<div class="ag-3d-edit-head"><span>' + title + '</span><button type="button" class="ag-3d-edit-x" data-ed="close" aria-label="Затвори">×</button></div>';
      html += '<div class="ag-3d-edit-row"><span>Ширина</span><span class="ag-3d-edit-w">' + (canW ? '<button type="button" class="ag-3d-ed" data-ed="w-" aria-label="По-тесен с 5 см"' + (w <= lim[0] ? ' disabled' : '') + '>−</button>' : '') +
        '<b>' + (w / 10) + ' см</b>' + (canW ? '<button type="button" class="ag-3d-ed" data-ed="w+" aria-label="По-широк с 5 см"' + (w >= lim[1] ? ' disabled' : '') + '>+</button>' : '') + '</span></div>';
      if (!sel.upper && m.type === 'genericBase') {
        var f = frontOf(m, m.w / 1000), opts = [['doors', 'Врати'], ['d2', '2 чекм.'], ['d3', '3 чекм.'], ['d4', '4 чекм.']];
        html += '<div class="ag-3d-edit-lbl">' + (f === 'doors' ? 'Шкаф с врати – смени на чекмеджета:' : 'Шкаф с чекмеджета – смени на:') + '</div><div class="ag-3d-edit-seg">' +
          opts.map(function (o) { return '<button type="button" class="ag-3d-ed' + (o[0] === f ? ' is-on' : '') + '" data-ed="front" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
      } else if (!sel.upper && m.type === 'sinkBase') html += '<div class="ag-3d-edit-info">Шкаф за мивка: сменя се само ширината (45–120 см).</div>';
      else if (!sel.upper) html += '<div class="ag-3d-edit-info">Този модул (уред, мивка, ъгъл или колона) е с фиксиран вид.</div>';
      if (sel.upper) {
        var lift = sel.layer !== 'd' && uLift(sel.id), gl = uGlass(edUpKey(sel));   // both on = two glass flaps one above the other
        if (sel.layer !== 'd') html += '<div class="ag-3d-edit-lbl">Отваряне:</div><div class="ag-3d-edit-seg"><button type="button" class="ag-3d-ed' + (!lift ? ' is-on' : '') + '" data-ed="lift" data-v="0">Обикновени врати</button><button type="button" class="ag-3d-ed' + (lift ? ' is-on' : '') + '" data-ed="lift" data-v="1">Повдигащ механизъм</button></div>';
        html += '<div class="ag-3d-edit-lbl">Витрина:</div><div class="ag-3d-edit-seg"><button type="button" class="ag-3d-ed' + (gl ? ' is-on' : '') + '" data-ed="glass">' + (gl ? (lift ? 'Две витрини една над друга ✓' : 'Витрина с осветление ✓') : 'Направи витрина') + '</button></div>';
        if (!edSlots) html += '<div class="ag-3d-edit-info">Ширината на горния шкаф следва долния шкаф под него.</div>';
      }
      var mi = (!sel.upper || edSlots) ? edMergeInfo(sel) : null;
      if (mi && (mi.cand.length || mi.merged)) {
        var sx0 = edScreenX(edKey(sel));
        html += '<div class="ag-3d-edit-lbl">Сливане (до ' + (MAX_W / 10) + ' см):</div><div class="ag-3d-edit-seg">' +
          mi.cand.slice().sort(function (p, q) { return edScreenX(p.mesh) - edScreenX(q.mesh); }).map(function (n) {
            var lft = edScreenX(n.mesh) < sx0;
            return '<button type="button" class="ag-3d-ed" data-ed="merge" data-v="' + n.id + '"' + (n.ok ? '' : ' disabled title="Няма място: общата ширина е над ' + (MAX_W / 10) + ' см"') + '>' + (lft ? '← Слей с левия' : 'Слей с десния →') + '</button>';
          }).join('') + (mi.merged ? '<button type="button" class="ag-3d-ed" data-ed="split">Раздели обратно</button>' : '') + '</div>';
      }
      if (edNote) html += '<div class="ag-3d-edit-note">' + edNote + '</div>';
      edBox.innerHTML = html; edBox.hidden = false; edPlace();
    }
    var edV = null;
    function edPlace() {   // the card goes next to the selected cabinet, never on top of it (above, below, right or left - the first side with room)
      if (!sel || edBox.hidden || !T) return;
      if (edManual) { var mw = host.clientWidth - (edBox.offsetWidth || 230) - 4, mh = host.clientHeight - (edBox.offsetHeight || 160) - 4; edBox.style.left = Math.round(Math.max(4, Math.min(mw, edManual.l))) + 'px'; edBox.style.top = Math.round(Math.max(4, Math.min(mh, edManual.t))) + 'px'; return; }
      var g = edMesh(sel); if (!g) return;
      var bb = new T.Box3().setFromObject(g); if (bb.isEmpty()) return;
      var W = host.clientWidth, H = host.clientHeight, bw = edBox.offsetWidth || 230, bh = edBox.offsetHeight || 160, gap = 12;
      var r = { l: 1e9, t: 1e9, r: -1e9, b: -1e9 };
      edV = edV || new T.Vector3();
      [bb.min.x, bb.max.x].forEach(function (cx) { [bb.min.y, bb.max.y].forEach(function (cy) { [bb.min.z, bb.max.z].forEach(function (cz) {
        edV.set(cx, cy, cz).project(camera); var sx = (edV.x + 1) / 2 * W, sy = (1 - edV.y) / 2 * H;
        r.l = Math.min(r.l, sx); r.r = Math.max(r.r, sx); r.t = Math.min(r.t, sy); r.b = Math.max(r.b, sy);
      }); }); });
      var cx0 = (r.l + r.r) / 2, cy0 = (r.t + r.b) / 2, maxL = Math.max(8, W - bw - 56), maxT = Math.max(8, H - bh - 8);
      function clampL(v) { return Math.max(8, Math.min(maxL, v)); }
      function clampT(v) { return Math.max(8, Math.min(maxT, v)); }
      var cand = [[clampL(cx0 - bw / 2), r.t - bh - gap], [clampL(cx0 - bw / 2), r.b + gap], [r.r + gap, clampT(cy0 - bh / 2)], [r.l - bw - gap, clampT(cy0 - bh / 2)]], best = null, bestO = 1e18;
      cand.forEach(function (c) {
        var L = clampL(c[0]), Tp = clampT(c[1]);
        var o = Math.max(0, Math.min(L + bw, r.r) - Math.max(L, r.l)) * Math.max(0, Math.min(Tp + bh, r.b) - Math.max(Tp, r.t));
        if (o < bestO - .5) { bestO = o; best = [L, Tp]; }
      });
      edBox.style.left = Math.round(best[0]) + 'px'; edBox.style.top = Math.round(best[1]) + 'px';
    }
    /* the card can be dragged anywhere inside the sketch by its title bar; it then stays where it was put */
    var edManual = null, edDrag = null;
    edBox.addEventListener('pointerdown', function (ev) {
      var h = ev.target.closest('.ag-3d-edit-head'); if (!h || ev.target.closest('button')) return;
      edDrag = { x: ev.clientX, y: ev.clientY, l: edBox.offsetLeft, t: edBox.offsetTop, id: ev.pointerId }; try { edBox.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault();
    });
    edBox.addEventListener('pointermove', function (ev) {
      if (!edDrag || ev.pointerId !== edDrag.id) return;
      edManual = { l: edDrag.l + ev.clientX - edDrag.x, t: edDrag.t + ev.clientY - edDrag.y }; edPlace();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { edBox.addEventListener(t, function () { edDrag = null; }); });
    (function () { var st = document.createElement('style'); st.textContent = '.ag-3d-edit-head{cursor:move;touch-action:none;user-select:none}.ag-3d-edit-head span::before{content:"⠿ ";color:#9aa09a;font-weight:400}'; document.head.appendChild(st); })();
    function edSelect(s) { sel = s; edNote = ''; clearHL(); setHL(edKey(s)); edRender(); }
    function edClose() { sel = null; edBox.hidden = true; edNote = ''; clearHL(); }
    function edRebuild() { inputsSig = ''; sync(true); if (sel) { if (edMesh(sel)) { hl.key = null; setHL(edKey(sel)); } edRender(); } }
    edBox.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-ed]'); if (!b || !sel) return; var a = b.dataset.ed; edNote = '';
      if (a === 'close') { edClose(); return; }
      if (sel.island) {
        var stp = a.slice(-1) === '+' ? 50 : -50;
        if (a === 'il-' || a === 'il+') islSetDim('island_len_aglova', Math.max(ISLLIM.len[0], Math.min(ISLLIM.len[1], dimMm('island_len_aglova') + stp)));
        else if (a === 'iw-' || a === 'iw+') islSetDim('island_width_aglova', Math.max(ISLLIM.w[0], Math.min(ISLLIM.w[1], dimMm('island_width_aglova') + stp)));
        else if (a === 'irot') ISL.rot = !ISL.rot;
        else if (a === 'ipos') ISL.pos = null;
        edRebuild(); return;
      }
      if (a === 'w-' || a === 'w+') {
        var dw = a === 'w+' ? STEP_W : -STEP_W;
        if (sel.upper) { var slot = edSlotOf(sel); if (slot) EDIT.slot[slot.id] = slot.w + dw; }
        else { var mm = edModule(sel.id); if (mm) { EDIT.low[mm.id] = EDIT.low[mm.id] || {}; EDIT.low[mm.id].w = mm.w + dw; } }
      } else if (a === 'front') { EDIT.low[sel.id] = EDIT.low[sel.id] || {}; EDIT.low[sel.id].front = b.dataset.v; }
      else if (a === 'lift') { EDIT.up[sel.id] = EDIT.up[sel.id] || {}; EDIT.up[sel.id].lift = b.dataset.v === '1'; }
      else if (a === 'glass') { var gk = edUpKey(sel); EDIT.up[gk] = EDIT.up[gk] || {}; EDIT.up[gk].glass = !uGlass(gk); }
      else if (a === 'merge') { var mi = edMergeInfo(sel), nb = null; (mi ? mi.cand : []).forEach(function (n) { if (n.id === b.dataset.v && n.ok) nb = n; }); if (nb) edDoMerge(mi.key, nb); }
      else if (a === 'split') { var mi2 = edMergeInfo(sel); if (mi2 && mi2.merged) edDoSplit(mi2.key); }
      edRebuild();
    });
    /* in edit mode a tap on a cabinet selects it; a drag on empty space still turns the view */
    function edPointerDown(ev) {
      if (!editMode || ev.button > 0 || !items.length) return false;
      if (islHit(ev)) { var ip = islFloor(ev); edDown = { x: ev.clientX, y: ev.clientY, pk: { island: true, id: 'island' }, io: ip ? { ox: ip.x - islandG.position.x, oz: ip.z - islandG.position.z } : null }; controls.enabled = false; return true; }
      var pk = pickModule(ev); if (!pk) { edDown = null; return false; }
      edDown = { x: ev.clientX, y: ev.clientY, pk: pk }; controls.enabled = false; return true;
    }
    function edPointerUp(ev) {
      if (!edDown) return false; var d = edDown; edDown = null; controls.enabled = true;
      if (Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) < 10 && d.pk.island) { edSelect({ id: 'island', island: true }); return true; }
      if (Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) < 10) edSelect({ id: d.pk.id, upper: !!d.pk.upper, layer: d.pk.upper ? (d.pk.layer || 'u') : null, wall: d.pk.wall });
      return true;
    }
    /* key lines for the AI: every edited cabinet and every glass display, with its position */
    function edLegend(out, glassText) {
      var fronts = [], liftOn = [], liftOff = [], glass = [];
      items.forEach(function (m) { var e = EDIT.low[m.id]; if (m.type === 'genericBase' && e && e.front) fronts.push(edWhere(m.id, false) + ': ' + ({ doors: 'doors', d2: '2 drawers', d3: '3 drawers', d4: '4 drawers' })[e.front]); });
      Object.keys(upos || {}).forEach(function (id) {
        var e = EDIT.up[id]; if (uGlass(id)) glass.push(edWhere(id, true) + (uLift(id) ? ' (two small glass display flaps one above the other, lift-up)' : ''));
        if (e && e.lift !== undefined && e.lift !== !!X.lift && !uGlass(id)) (e.lift ? liftOn : liftOff).push(edWhere(id, true));
        if (curDeepRow() && uGlass(id + ':d')) glass.push(edWhere(id, true) + ' (deep top row)');
      });
      function chunk(head, list) { var line = head; list.forEach(function (s) { if ((line + s).length > 190) { out.push(line.replace(/ \+ $/, '')); line = head; } line += s + ' + '; }); if (line !== head) out.push(line.replace(/ \+ $/, '')); }
      chunk('lower cabinet fronts changed by the client: ', fronts);
      chunk('lift-up flap fronts on: ', liftOn); chunk('ordinary hinged doors, not lift-up, on: ', liftOff);
      if (glass.length) { chunk('glass display cabinet' + (glass.length > 1 ? 's' : '') + ' at: ', glass); out.push(glassText); }
    }

    /* ---------------- scene setup */
    function setup() {
      T = root.THREE; renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = false;
      host.insertBefore(renderer.domElement, hint); scene = new T.Scene(); scene.background = new T.Color(0xeef0ed);
      camera = new T.PerspectiveCamera(42, 1, .05, 80); ray = new T.Raycaster(); mouse = new T.Vector2(); setupMats(); mats.chimney = new T.MeshStandardMaterial({ color: 0xe6bd94, roughness: .9 });
      scene.add(new T.HemisphereLight(0xffffff, 0xb6b2a8, .95));
      var sun = new T.DirectionalLight(0xffffff, .75); sun.position.set(5, 6, 5); sun.castShadow = false; scene.add(sun);
      roomGroup = new T.Group(); cabGroup = new T.Group(); scene.add(roomGroup, cabGroup);
      dropMark = new T.Mesh(new T.PlaneGeometry(1, 1.1), mats.highlight); dropMark.rotation.x = -Math.PI / 2; dropMark.visible = false; dropMark.position.y = .01; scene.add(dropMark);
      controls = new T.OrbitControls(camera, renderer.domElement); controls.enablePan = true; controls.screenSpacePanning = true; controls.panSpeed = 1; controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .5; controls.minAzimuthAngle = .08; controls.maxAzimuthAngle = Math.PI / 2 - .08;
      controls.addEventListener('change', function () {   // the view can be panned, but never so far that the room is lost
        var t = controls.target, cx = Math.max(-.6, Math.min(bounds.x + .6, t.x)), cy = Math.max(0, Math.min(bounds.y, t.y)), cz = Math.max(-.6, Math.min(bounds.z + .6, t.z));
        if (cx !== t.x || cy !== t.y || cz !== t.z) { var dx = cx - t.x, dy = cy - t.y, dz = cz - t.z; t.set(cx, cy, cz); camera.position.x += dx; camera.position.y += dy; camera.position.z += dz; }
      });
      setMode('rotate', true);
      var el = renderer.domElement; el.addEventListener('pointerdown', onDown, true); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
      new ResizeObserver(resize).observe(host);
      (function loop() {
        requestAnimationFrame(loop); if (host.hidden) return;
        Object.keys(meshById).forEach(function (k) { var g = meshById[k], u = g.userData; if (u && u.targetX !== undefined && !(drag && drag.id === u.id)) g.position.x += (u.targetX - g.position.x) * .25; });
        controls.update(); renderer.render(scene, camera); if (sel) edPlace();
      })();
    }
    function resize() { if (!renderer) return; var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    function setMode(m, quiet) {
      moveMode = m === 'move'; panMode = m === 'pan'; editMode = m === 'edit'; host.setAttribute('data-mode', m);
      rotBtn.setAttribute('aria-pressed', String(m === 'rotate')); modeBtn.setAttribute('aria-pressed', String(moveMode)); panBtn.setAttribute('aria-pressed', String(panMode)); editBtn.setAttribute('aria-pressed', String(editMode));
      if (!editMode && sel) edClose();
      if (controls) {
        controls.mouseButtons.LEFT = panMode ? T.MOUSE.PAN : T.MOUSE.ROTATE; controls.touches.ONE = panMode ? T.TOUCH.PAN : T.TOUCH.ROTATE;
        controls.enableRotate = !moveMode;                                   // moving cabinets: an empty drag does nothing (zoom and right-button pan still work)
      }
      if (!quiet) { sync(true); inputsSig = ''; sync(true); }
    }
    btns.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || !controls) return; var a = b.dataset.act;
      if (a === 'reset') { camera.position.copy(home.pos); controls.target.copy(home.target); }
      else if (a === 'in' || a === 'out') { var v = camera.position.clone().sub(controls.target).multiplyScalar(a === 'in' ? .8 : 1.25); var len = Math.max(controls.minDistance, Math.min(controls.maxDistance, v.length())); v.setLength(len); camera.position.copy(controls.target).add(v); }
      else if (a === 'rotate') setMode('rotate');
      else if (a === 'mode') setMode('move');
      else if (a === 'pan') setMode('pan');
      else if (a === 'edit') setMode('edit');
      else if (a === 'auto') { ISL = { pos: null, rot: false }; FREE.pos = {}; EDIT = { low: {}, up: {}, slot: {}, mLow: [], mUp: [] }; edClose(); dirty = false; uorder = null; dorder = null; xfer = []; order = { 1: [], 2: [] }; glassPick = null; inputsSig = ''; sync(true); }
      controls.update();
    });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (t) { btns.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    function fail() { failed = true; host.hidden = true; stage.classList.remove('ag-3d-on'); }

    var raf = 0; function soon() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(false); }); }
    page.addEventListener('change', soon, true); page.addEventListener('input', soon, true);
    root.agLayout = root.agLayout || { refresh: function () {}, current: null };
    Promise.resolve(root.THREE || load(THREE_URL)).then(function () { return root.THREE.OrbitControls || load(ORBIT_URL); }).then(function () {
      setup();
      new MutationObserver(soon).observe(page, { subtree: true, attributes: true, characterData: true, childList: true, attributeFilter: ['class', 'data-ag-flow-step', 'data-preview-state', 'value'] });
      page.addEventListener('click', function () { setTimeout(soon, 100); }); page.addEventListener('ag:phase-changed', function () { inputsSig = ''; soon(); }); page.addEventListener('ag:material-chosen', function () { inputsSig = ''; soon(); });
      /* picture of the interactive sketch for the AI visualization: fixed camera into the corner, no grid lines or labels, same textures as on screen */
      function capture() {
        if (!T || !scene || !plan || !items.length) return null;
        var inp = readInputs(), W = 1536, H = 1024, r = null, hide = [], prev = [];
        var L1 = (inp.wall1Mm || 3600) / 1000, L2 = (inp.wall2Mm || 3600) / 1000, RH = (inp.heightMm || 2600) / 1000;
        try {
          clearHL();
          scene.traverse(function (o) { if (o.type === 'LineSegments' || o.type === 'Sprite') hide.push(o); });
          if (dropMark) hide.push(dropMark);
          hide.forEach(function (o) { prev.push(o.visible); o.visible = false; });
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
          r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H, false);
          var cam = new T.PerspectiveCamera(42, W / H, .05, 80);
          // same framing as the on-screen home view (fit), computed for the 3:2 picture: looking into the corner, both walls in view
          var tv = Math.tan(21 * Math.PI / 180), th = tv * (W / H), halfW = (L1 + L2) / (2 * Math.SQRT2);
          var dist = Math.max((halfW * 1.12) / th, (RH / 2 * 1.3) / tv, 3.2) + .4, el = 20 * Math.PI / 180;
          var target = new T.Vector3(L2 / 2, Math.min(RH * .45, 1.1), L1 / 2);
          var dir = new T.Vector3(Math.SQRT1_2 * Math.cos(el), Math.sin(el), Math.SQRT1_2 * Math.cos(el));
          cam.position.copy(target).add(dir.multiplyScalar(dist)); cam.lookAt(target); cam.updateMatrixWorld(true);
          r.render(scene, cam);
          var url = cv.toDataURL('image/jpeg', .9);
          return url && url.length > 4000 ? url : null;
        } catch (e) { return null; }
        finally { hide.forEach(function (o, i) { o.visible = prev[i]; }); if (r) r.dispose(); if (sel && meshById[edKey(sel)]) setHL(edKey(sel)); }
      }
      /* short feature key for the AI prompt: appliances per wall from the corner outwards, then surfaces and extras (data only) */
      function sketchLegend() {
        var inp = readInputs(), out = [];
        var nm = { fridge: 'fridge', ovenTower: 'tall oven tower', ovenHobBase: 'oven with hob', hobBase: 'hob', sinkBase: 'sink', dishwasher: 'dishwasher', washingMachine: 'washing machine', applianceTower: 'built-in appliance tower', basket: 'narrow bottle pullout', cornerBase: 'corner base unit' };
        function nmOf(m) {   // what the image model must draw: built-in appliances stay hidden behind cabinet fronts
          if (m.type === 'fridge') return m.applianceType === 'free_standing' ? 'free-standing black fridge' : 'built-in fridge behind cabinet doors';
          if (m.type === 'dishwasher') return m.free ? 'free-standing black dishwasher' : 'integrated dishwasher behind a front';
          if (m.type === 'washingMachine') return m.free ? 'free-standing washer' : 'built-in washer behind a front';
          if (m.type === 'ovenTower') { var a = (m.appliances || []).map(function (x) { return x === 'microwave' ? 'microwave' : x === 'coffeeMachine' ? 'coffee machine' : 'oven'; }); return 'tall oven tower (built-in ' + (a.length ? a.join(', ') : 'oven') + ')'; }
          return nm[m.type];
        }
        [[1, 'left wall'], [2, 'right wall']].forEach(function (wl) {
          var list = items.filter(function (m) { return m.wall === wl[0] && nm[m.type]; }).sort(function (a, b) { return a.x - b.x; }).map(nmOf);
          if (list.length) out.push(wl[1] + ' from the corner outwards: ' + list.join(', '));
        });
        if (inp.chimney) out.push('chimney block in the corner, cabinets fitted around it');
        if (inp.barMode === 'island') { var ilg = 'free-standing island ' + (inp.barLenMm / 10) + ' x ' + (inp.barWidthMm / 10) + ' cm'; if (islandG && ISLROOM) { var hx2 = ISLROOM.sx / 2, hz2 = ISLROOM.sz / 2; ilg += ', ' + Math.round((islandG.position.x - hx2) * 100) + ' cm from the left wall and ' + Math.round((islandG.position.z - hz2) * 100) + ' cm from the back wall, its long side ' + (ISLROOM.sx >= ISLROOM.sz ? 'parallel to the back wall' : 'parallel to the left wall'); } out.push(ilg); }
        else if (inp.barMode === 'wall1') out.push('bar along the left wall');
        else if (inp.barMode === 'wall2') out.push('bar along the right wall');
        function surf(name, field, grain) {
          var rec = root.agMaterialSelections && root.agMaterialSelections.get(field); if (!rec) return;
          var gloss = !!(root.agGloss && root.agGloss.has(rec.id));
          out.push(name + ': ' + (rec.category === 'wood' ? 'wood, ' + (grain === 'h' ? 'horizontal' : 'vertical') + ' grain, continuous across doors,' : 'plain colour,') + ' ' + (gloss ? 'HIGH GLOSS' : 'matte'));
        }
        surf('lower fronts', 'lower_finish', inp.gL); surf('upper fronts', 'upper_finish', inp.gU);
        if (inp.deep) {
          if (root.agMaterialSelections && root.agMaterialSelections.get('deep_finish')) surf('deep upper row (own colour, different from the row below)', 'deep_finish', inp.gD);
          else surf('deep upper row (same decor as the upper fronts)', 'upper_finish', inp.gD);
        }
        if (items.some(function (m) { return (m.type === 'fridge' && m.applianceType !== 'free_standing') || ((m.type === 'dishwasher' || m.type === 'washingMachine') && !m.free); })) out.push('BUILT-IN appliances are hidden behind cabinet fronts in the door decor: draw them as plain doors, never as visible appliances');
        out.push('appliance finish: all black (washing machine white)');
        [['countertop_finish', 'worktop'], ['backsplash_finish', 'wall backsplash']].forEach(function (p) { if (isWoodField(p[0])) out.push(p[1] + ': wood grain runs HORIZONTALLY along its whole length, never vertical'); });
        if (X.handleless) out.push('handleless fronts');
        if (X.drawers) out.push('extra drawers on lower storage');
        if (X.panel) out.push('framed panel doors');
        if (X.lift) out.push('lift-up fronts on the lower upper row only');
        edLegend(out, 'glass display: clear glass door in a slim frame, warm LED light inside, glass shelves and neat dishes; all other upper doors solid');
        if (X.light) out.push('under-cabinet lighting');
        return out;
      }
      root.agLayout = { freeApps: function () { var r = renderer && renderer.domElement.getBoundingClientRect(), out = {}; Object.keys(FREE.pos).forEach(function (k) { var g = freeG[k], o = { wall: FREE.pos[k].wall, xMm: Math.round(FREE.pos[k].x) }; if (g && r && camera) { var v = new T.Vector3(); g.updateMatrixWorld(true); v.setFromMatrixPosition(g.matrixWorld); v.y += BH + .15; v.project(camera); o.screen = { x: Math.round(r.left + (v.x + 1) / 2 * r.width), y: Math.round(r.top + (1 - v.y) / 2 * r.height) }; } out[k] = o; }); return out; }, refresh: soon, current: root.agLayout.current, capture: capture, sketchLegend: sketchLegend, editor: { select: function (s) { setMode('edit', true); edSelect(s); }, close: function () { edClose(); }, state: function () { return { EDIT: EDIT, sel: sel, note: edNote, html: edBox.innerHTML }; }, act: function (a, v) { var b = document.createElement('button'); b.dataset.ed = a; if (v !== undefined) b.dataset.v = v; edBox.appendChild(b); b.click(); b.remove(); } }, debug: function () { return { scene: scene, camera: camera, plan: plan, items: items, order: order }; } };
      soon();
    }).catch(fail);
  }
  function boot() { var t = 0; (function wait() { if (document.querySelector('.flow-aglova .sticky-cad-wrap .cad-stage') || ++t > 100) { init(); return; } setTimeout(wait, 100); })(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
