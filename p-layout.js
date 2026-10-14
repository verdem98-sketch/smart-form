/* П-образна кухня (U-shaped kitchen): interactive 3D sketch.
   Same viewer as Prava (prava-layout.js) and Aglova (aglova-layout.js): real decor textures, grain, gloss, handleless / drawers /
   glass display / lift flaps / panel doors / LED / bottle rack, free-standing appliances, independent upper / lower / deep drag.
   Laid out as a U on three walls: wall 1 = left wall, wall 2 = back wall (between the two corners), wall 3 = right wall.
   Every position is measured along its own wall from its corner end (side walls: from the back corner; back wall: from the left corner).
   Each side wall owns the 900 mm corner unit of its corner (or the chimney stands there); the back wall starts / ends 600 mm (one base depth)
   from each corner. Upper cabinets only on the walls the client chose. */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ layout engine (pure) */
  var MAX_FILLER = 150, MIN_CUSTOM = 150, MAX_CUSTOM = 900, STEP = 50;
  var BASE_DEPTH = 600, CORNER_UNIT = 900, MAX_UPPER = 900, PAS = 60;   // PAS: the 6 cm filler piece that always closes the corner next to a chimney
  var TALL = { fridge: 1, ovenTower: 1, applianceTower: 1 };
  var WALLS = [1, 2, 3];

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
  function availOf(wl) { return Math.max(0, wl.endMm - wl.startMm - (wl.corner ? CORNER_UNIT : 0)); }

  /* cfg: wall1Mm, wall2Mm, wall3Mm (whole walls), heightMm, waterWall (1|2|3), ovenTower, fridge ('built_in'|'free_standing'|null), dishwasherMm,
          washer, microwave, coffee (built-in), basket, chimney ('left'|'right'|null), chimneyAMm (along the side wall), chimneyBMm (along the back wall), deep */
  function planU(cfg) {
    var errors = [], L = { 1: Math.round(cfg.wall1Mm || 0), 2: Math.round(cfg.wall2Mm || 0), 3: Math.round(cfg.wall3Mm || 0) };
    var res = { wallMm: L, errors: errors, chimney: cfg.chimney || null, walls: {} };
    WALLS.forEach(function (w) { res.walls[w] = { wall: w, lengthMm: L[w], startMm: 0, endMm: L[w], corner: false, modules: [], fillerMm: 0 }; });
    if (!L[1] || !L[2] || !L[3]) { errors.push('Въведете дължините на трите стени.'); return res; }
    var ch = cfg.chimney === 'left' || cfg.chimney === 'right' ? cfg.chimney : null, A = cfg.chimneyAMm || 0, B = cfg.chimneyBMm || 0;
    if (ch && (!A || !B)) { errors.push('Въведете размерите A и B на комина.'); return res; }
    // a run next to the chimney starts after a 60 mm filler (пас), never closer than one base depth (600) + the filler
    var sideStart = Math.max(A, BASE_DEPTH) + PAS, backGap = Math.max(B, BASE_DEPTH) + PAS;
    var W1 = res.walls[1], W2 = res.walls[2], W3 = res.walls[3];
    W1.corner = ch !== 'left'; W1.startMm = ch === 'left' ? sideStart : 0;
    W3.corner = ch !== 'right'; W3.startMm = ch === 'right' ? sideStart : 0;
    W2.startMm = ch === 'left' ? backGap : BASE_DEPTH; W2.endMm = L[2] - (ch === 'right' ? backGap : BASE_DEPTH);
    if (ch === 'left') res.pas = { side: 1, sideFrom: sideStart - PAS, sideTo: sideStart, backFrom: backGap - PAS, backTo: backGap, block: { x0: 0, x1: backGap - PAS, z1: sideStart - PAS } };
    else if (ch === 'right') res.pas = { side: 3, sideFrom: sideStart - PAS, sideTo: sideStart, backFrom: W2.endMm, backTo: W2.endMm + PAS, block: { x0: W2.endMm + PAS, x1: L[2], z1: sideStart - PAS } };
    else res.pas = null;
    if (W2.endMm - W2.startMm < 0) { errors.push('Стена 2 е твърде къса за двата ъгъла.'); return res; }
    var avail = {}; WALLS.forEach(function (w) { avail[w] = availOf(res.walls[w]); });
    // the classic U: sink on the water wall, hob opposite the sink (or on the longer side wall when the sink is on the back wall), fridge on the other side wall
    var water = cfg.waterWall === 1 || cfg.waterWall === 3 ? cfg.waterWall : 2;
    var cook = water === 2 ? (L[1] >= L[3] ? 1 : 3) : (water === 1 ? 3 : 1);
    var fridgeWall = water === 2 ? (cook === 1 ? 3 : 1) : water;
    var place = { 1: [], 2: [], 3: [] };
    function put(wall, key, m) { place[wall].push({ key: key, module: m }); }
    put(water, 'sinkBase', fixedMod('sinkBase', 600, 'water'));
    if (cfg.dishwasherMm) put(water, 'dishwasher', fixedMod('dishwasher', cfg.dishwasherMm, 'water'));
    if (cfg.washer) put(water, 'washingMachine', fixedMod('washingMachine', 600, 'water'));
    if (cfg.ovenTower) {
      var tower = ['oven']; if (cfg.microwave) tower.push('microwave'); if (cfg.coffee) tower.push('coffeeMachine');
      put(cook, 'ovenTower', fixedMod('ovenTower', 600, 'tall', tower));
      put(cook, 'hobBase', fixedMod('hobBase', 600, 'cooking'));
    } else put(cook, 'ovenHobBase', fixedMod('ovenHobBase', 600, 'cooking', ['oven']));
    if (cfg.basket) put(cook, 'basket', fixedMod('basket', 150, 'cooking'));
    if (cfg.fridge) put(fridgeWall, 'fridge', fixedMod('fridge', 600, 'tall', null, { applianceType: cfg.fridge }));
    function need(w) { return sumW(place[w].map(function (i) { return i.module; })); }
    // a wall that is too short hands movable modules to a wall with room (tall units prefer the side walls: on the back wall they would block a corner)
    function moveOut(from, keys, allowBackForTall) {
      keys.forEach(function (key) {
        if (need(from) <= avail[from]) return;
        var at = -1; place[from].forEach(function (i, ix) { if (at < 0 && i.key === key) at = ix; });
        if (at < 0) return;
        var item = place[from][at], tall = !!TALL[item.module.type];
        var targets = (tall ? [1, 3, 2] : [2, 1, 3]).filter(function (w) { return w !== from && (!tall || w !== 2 || allowBackForTall); });
        for (var t = 0; t < targets.length; t++) {
          var to = targets[t];
          if (need(to) + item.module.w <= avail[to]) { place[from].splice(at, 1); place[to].push(item); return; }
        }
      });
    }
    var movable = ['fridge', 'ovenTower', 'basket', 'washingMachine', 'dishwasher'];
    WALLS.forEach(function (w) { moveOut(w, movable, false); });
    WALLS.forEach(function (w) { moveOut(w, movable, true); });
    WALLS.forEach(function (w) {
      if (need(w) > avail[w]) errors.push('Стена ' + w + ': избраните модули изискват ' + need(w) + ' мм, а наличната дължина е само ' + avail[w] + ' мм.');
    });
    if (errors.length) return res;
    WALLS.forEach(function (w) {
      var items = place[w].map(function (i) { return i.module; });
      var tall = items.filter(function (m) { return TALL[m.type]; }), rest = items.filter(function (m) { return !TALL[m.type]; });
      var remaining = avail[w] - need(w), st = chooseStorage(remaining);
      if (!st) { errors.push('Стена ' + w + ': остатъкът от ' + remaining + ' мм не може да се разпредели на шкафове; променете дължината.'); return; }
      var storage = st.widths.map(function (x) { return { type: 'genericBase', w: x, locked: false, zone: 'storage' }; });
      var waterM = rest.filter(function (m) { return m.zone === 'water'; }), cooking = rest.filter(function (m) { return m.zone !== 'water'; });
      var mods = [];
      if (w === 2) {   // back wall: the working zone in the middle, storage on both sides, tall units (only when nothing else fits) beside it
        var half = Math.floor(storage.length / 2), before = storage.slice(0, half), after = storage.slice(half);
        mods = before.concat(waterM, cooking, tall, after);
      } else {
        if (res.walls[w].corner) mods.push(fixedMod('cornerBase', CORNER_UNIT, 'corner'));
        if (waterM.length) {
          var b1 = storage.length > 1 ? storage.slice(0, 1) : [], a1 = storage.length > 1 ? storage.slice(1) : storage;
          mods = mods.concat(b1, waterM, cooking, a1, tall);
        } else mods = mods.concat(cooking, storage, tall);   // tall units at the far end of the side wall, away from the corner
      }
      res.walls[w].modules = mods; res.walls[w].fillerMm = st.filler;
    });
    if (errors.length) { WALLS.forEach(function (w) { res.walls[w].modules = []; }); return res; }
    var cnt = {};
    WALLS.forEach(function (w) { res.walls[w].modules.forEach(function (m) { cnt[m.type] = (cnt[m.type] || 0) + 1; m.id = m.type + '#' + (cnt[m.type] - 1); m.wall = w; }); });
    var anyTall = WALLS.some(function (w) { return res.walls[w].modules.some(function (m) { return TALL[m.type]; }); });
    var required = anyTall ? 2400 : 900;   // the upper row (standard or deep) always ends at the height of the tall column, never above it
    if (cfg.heightMm && required > cfg.heightMm) errors.push('Шкафовете изискват ' + required + ' мм височина, а помещението е само ' + cfg.heightMm + ' мм.');
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
  /* upper cabinets: every run of consecutive non-tall modules is split into spans of at most 900 mm (same rule as the backend).
     extStart / extEnd: mm by which the wall's first / last run is stretched towards a corner (upper rows meet in the corners, no gap) */
  function upperRuns(wall, items, extStart, extEnd) {
    var runs = [], cur = null;
    items.forEach(function (m) {
      if (TALL[m.type]) { cur = null; return; }
      if (cur && cur.x0 + cur.w === m.x) cur.w += m.w; else { cur = { wall: wall, x0: m.x, w: m.w }; runs.push(cur); }
    });
    if (runs.length && items.length && runs[0].x0 === items[0].x) { runs[0].first = true; if (extStart > 0) { runs[0].x0 -= extStart; runs[0].w += extStart; } }
    var lastItem = items[items.length - 1], lr = runs[runs.length - 1];
    if (lr && lastItem && !TALL[lastItem.type] && lr.x0 + lr.w === lastItem.x + lastItem.w) { lr.last = true; if (extEnd > 0) lr.w += extEnd; }
    runs.forEach(function (r, ri) {
      var parts = Math.max(1, Math.ceil(r.w / MAX_UPPER)), unit = Math.round(r.w / parts / 10) * 10, x = r.x0; r.units = [];
      for (var i = 0; i < parts; i++) { var w = i === parts - 1 ? r.x0 + r.w - x : unit; r.units.push({ id: 'u' + wall + '_' + ri + '_' + i, wall: wall, w: w }); x += w; }
    });
    return runs;
  }

  /* manual moves of a fixed module (sink, hob, fridge...) to another wall: the generic storage cabinets of both walls are re-chosen so each wall still adds up.
     A move is { id, to, at }: the module goes to wall `to` at index `at` (replacing a generic cabinet there); a generic placeholder keeps its old slot. */
  function applyMoves(plan, moves) {
    var seq = 0, okMoves = [];
    function isGen(m) { return m.type === 'genericBase'; }
    function regen(w) {
      var wl = plan.walls[w], mods = wl.modules, hasC = mods.some(function (m) { return m.type === 'cornerBase'; });
      var avail = wl.endMm - wl.startMm - (hasC ? CORNER_UNIT : 0);
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
      var snap = WALLS.map(function (w) { return { mods: plan.walls[w].modules.slice(), fill: plan.walls[w].fillerMm, ws: plan.walls[w].modules.map(function (m) { return [m, m.w, m.wall]; }) }; });
      function undo() { WALLS.forEach(function (w, i) { plan.walls[w].modules = snap[i].mods; plan.walls[w].fillerMm = snap[i].fill; snap[i].ws.forEach(function (x) { x[0].w = x[1]; x[0].wall = x[2]; }); }); }
      if (mv.gs) {   // two ordinary cabinets on different walls trade widths; the other ordinary cabinets of each wall absorb the difference
        var ga = null, gb = null;
        WALLS.forEach(function (w) { plan.walls[w].modules.forEach(function (x) { if (x.id === mv.gs[0]) ga = x; if (x.id === mv.gs[1]) gb = x; }); });
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
      WALLS.forEach(function (w) { plan.walls[w].modules.forEach(function (x, i) { if (x.id === mv.id) { from = w; fi = i; m = x; } }); });
      if (!m || from === mv.to || isGen(m) || m.type === 'cornerBase') return;
      var fm = plan.walls[from].modules, tm = plan.walls[mv.to].modules, floor = (tm.some(function (x) { return x.type === 'cornerBase'; })) ? 1 : 0;
      fm[fi] = { type: 'genericBase', w: 150, zone: 'storage', locked: false, id: 'genericBase#m' + (seq++), wall: from, ph: true };
      var k = Math.max(floor, Math.min(mv.at, tm.length));
      if (tm[k] && isGen(tm[k])) tm[k] = m; else tm.splice(k, 0, m);
      m.wall = mv.to;
      if (regen(from) && regen(mv.to)) okMoves.push(mv); else undo();
    });
    return okMoves;
  }

  var engine = { applyMoves: applyMoves, chooseStorage: chooseStorage, planU: planU, WALLS: WALLS, applyOrder: applyOrder, position: position, swapIds: swapIds, upperRuns: upperRuns, TALL: TALL };
  if (typeof module !== 'undefined' && module.exports) { module.exports = engine; }
  root.PLayoutEngine = engine;
  if (typeof document === 'undefined') return;

  /* ------------------------------------------------------------------ viewer */
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js';
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error(src)); }; document.head.appendChild(s); }); }

  function init() {
    var page = document.querySelector('.sf-page-p'), card = page && page.querySelector('.p-sketch-wrap'), stage = card && card.querySelector('.cad-stage-p');
    if (!stage || root.pLayout) return;
    var host = document.createElement('div'); host.className = 'p-3d'; host.hidden = true; stage.appendChild(host);
    var st = document.createElement('style');
    var ROT_CUR = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="5"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/></g><g stroke="#222" stroke-width="2.2"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/></g></svg>') + '") 14 14, alias';   // rotate cursor
    st.textContent = '.sf-page-p .p-3d{position:absolute;inset:0;z-index:8;background:#eef0ed;touch-action:none}.sf-page-p .p-3d canvas{display:block;width:100%;height:100%;cursor:' + ROT_CUR + '}.sf-page-p .p-3d[data-mode=move] canvas{cursor:move}.sf-page-p .p-3d[data-mode=pan] canvas{cursor:grab}.sf-page-p .p-3d[data-mode=pan] canvas:active{cursor:grabbing}' +
      '.sf-page-p .p-3d-hint{position:absolute;left:10px;bottom:8px;max-width:calc(100% - 20px);font:11px/1.35 sans-serif;color:#606760;background:rgba(255,255,255,.88);padding:4px 9px;border-radius:8px;pointer-events:none}' +
      '.sf-page-p .p-3d-msg{position:absolute;left:110px;right:56px;top:10px;font:12px/1.4 sans-serif;color:#7a2d1f;background:#fff1ec;border:1px solid #e6b8ab;padding:8px 10px;border-radius:10px;pointer-events:none}' +
      '.sf-page-p .p-3d-btns{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px}' +
      '.sf-page-p .p-3d-btns button{width:36px;height:36px;border:1px solid #c8cbc7;border-radius:10px;background:#fff;color:#333533;font:600 17px/1 sans-serif;cursor:pointer;padding:0}' +
      '.sf-page-p .p-3d-btns button:hover,.sf-page-p .p-3d-btns button[aria-pressed="true"]{background:#e8f0e8;border-color:#477448}' +
      '.sf-page-p .cad-stage-p.p-3d-on>:not(.p-3d){visibility:hidden!important;pointer-events:none!important}';
    document.head.appendChild(st);
    var hint = document.createElement('div'); hint.className = 'p-3d-hint'; host.appendChild(hint);
    var msg = document.createElement('div'); msg.className = 'p-3d-msg'; msg.hidden = true; host.appendChild(msg);
    var btns = document.createElement('div'); btns.className = 'p-3d-btns'; host.appendChild(btns);
    function mkBtn(label, title, act) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = b.ariaLabel = title; b.dataset.act = act; btns.appendChild(b); return b; }
    mkBtn('+', 'Приближи', 'in'); mkBtn('−', 'Отдалечи', 'out'); mkBtn('⌂', 'Начален изглед', 'reset');
    var rotBtn = mkBtn('⟳', 'Въртене на изгледа (Orbit): влачете за завъртане', 'rotate');
    var modeBtn = mkBtn('✥', 'Местене на шкафове: хванете шкаф и го пуснете върху друг', 'mode');
    var panBtn = mkBtn('✋', 'Преместване на изгледа (Pan): влачете наляво/надясно и нагоре/надолу. Десен бутон или Shift + влачене също местят изгледа.', 'pan');
    var autoBtn = mkBtn('↺', 'Автоматично подреждане', 'auto');

    var T, renderer, scene, camera, controls, ray, mouse, roomGroup, cabGroup, dropMark, wg = {};
    var failed = false, moveMode = false, panMode = false, bounds = { x: 4, y: 2.6, z: 4 }, dirty = false, uorder = null, dorder = null, dpos = {}, layerIds = { u: [], d: [] }, upos = {}, uRuns = [], order = { 1: [], 2: [], 3: [] }, items = [], plan = null, inputsSig = '', fitSig = '';
    var mats = {}, drag = null, unitById = {};

    /* ---------------- inputs from the page */
    function q(sel) { return page.querySelector(sel); }
    function pill(field) { var e = q('[data-field="' + field + '"] .option-pill.active,[data-field="' + field + '"] .option-pill.is-selected'); return e ? String(e.dataset.value || e.textContent || '').trim() : ''; }
    function dimMm(key) {
      var row = q('.dimension-row[data-dim="' + key + '"]'); if (!row) return 0;
      function n(sel) { var el = row.querySelector(sel + ' .picker-value-text') || row.querySelector(sel + ' .picker-value'); return parseInt((el && el.textContent) || '0', 10) || 0; }
      return (n('.meters-control') * 100 + n('.centimeters-control')) * 10;
    }
    function chk(field) { var e = q('[data-field="' + field + '"] input[type="checkbox"]'); return !!(e && e.checked); }
    function fieldVal(name) { var e = q('[name="' + name + '"]'); return e ? String(e.value || '') : ''; }
    /* ---------------- material colours + real decor textures (steps 3-6) */
    var pendingLoads = 0;   // decor images still loading (the AI picture waits for them)
    var colCache = {}, toneCache = {}, texCache = {}, texMat = {}, texN = 0, grainCache = {};
    function decorUrl(field) {
      var rec = root.pMaterialSelections && root.pMaterialSelections.get(field), u = rec && rec.sampleImageUrl;
      return u ? u.replace('https://s3.amazonaws.com/webflow-prod-assets/', 'https://cdn.prod.website-files.com/') : null;
    }
    function colourOf(field) {
      var u = decorUrl(field); if (!u) return null;
      if (colCache[u] !== undefined) return colCache[u];
      colCache[u] = null; pendingLoads++;
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onerror = function () { pendingLoads = Math.max(0, pendingLoads - 1); };
      im.onload = function () {
        pendingLoads = Math.max(0, pendingLoads - 1);
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
      if (role === 'deep' && !(root.pMaterialSelections && root.pMaterialSelections.get('deep_finish'))) role = 'upper';
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

    function multi(field) { return Array.prototype.map.call(page.querySelectorAll('[data-field="' + field + '"] .option-pill.is-selected'), function (e) { return String(e.dataset.value || ''); }); }
    function chkName(name) { var e = q('input[type="checkbox"][name="' + name + '"]'); return !!(e && e.checked); }
    function readInputs() {
      var fr = pill('fridge_type_p'), fridge = fr === 'free' ? 'free_standing' : fr === 'built' ? 'built_in' : null;
      var dw = fieldVal('dishwasher_type').match(/(45|60)$/), step = (root.pFlow && root.pFlow.getStep && root.pFlow.getStep()) || Number(page.dataset.pFlowStep) || 1;
      var w1 = dimMm('stena1_len_p'), w2 = dimMm('stena2_len_p'), w3 = dimMm('stena3_len_p'), cA = dimMm('komin_a_p'), cB = dimMm('komin_b_p'), cp = pill('chimney_position_p');
      var ch = cp === 'left' || cp === 'right' ? cp : null, chOk = !!(ch && cA && cB);
      // with a chimney the entered lengths of the two walls next to it run from the chimney outwards: the real side wall is longer by A, the back wall by B
      var p1 = chOk && ch === 'left' && w1 ? w1 + cA : w1, p3 = chOk && ch === 'right' && w3 ? w3 + cA : w3, p2 = chOk && w2 ? w2 + cB : w2;
      var wr = pill('water_position_p').match(/[123]$/), tops = multi('top_row_wall_p'), up = { 1: false, 2: false, 3: false };
      tops.forEach(function (v) { var m = String(v).match(/[123]$/); if (m) up[m[0]] = true; });
      var island = pill('island_enabled_p') === 'yes';
      return {
        wall1Mm: p1, wall2Mm: p2, wall3Mm: p3, heightMm: dimMm('visochina_p') || 2600,
        chimney: chOk ? ch : null, chimneyAMm: cA, chimneyBMm: cB,
        waterWall: wr ? Number(wr[0]) : 2, ovenTower: pill('oven_tall_unit_p') === 'yes', fridge: fridge,
        uppers: up, anyUpper: up[1] || up[2] || up[3],
        deep: pill('deep-cabinets') === 'yes' && (up[1] || up[2] || up[3]), island: island, wallsByUppers: step >= 2, islandLenMm: island ? dimMm('island_len_p') : 0, islandWidthMm: island ? dimMm('island_width_p') : 0,
        dishwasherMm: dw ? Number(dw[1]) * 10 : 0, washer: !!fieldVal('washing_machine_type'),
        microwave: fieldVal('microwave_type') === 'built_in', coffee: fieldVal('coffee_machine_type') === 'built_in',
        dishFree: /^free/.test(fieldVal('dishwasher_type')), washFree: fieldVal('washing_machine_type') === 'free_standing',
        microFree: fieldVal('microwave_type') === 'free_standing', coffeeFree: fieldVal('coffee_machine_type') === 'free_standing',
        x: { handleless: chkName('handleless'), drawers: chkName('more_drawers'), glass: chkName('glass_display'), lift: chkName('lift_mechanisms'), panel: chkName('panel_doors'), light: chkName('counter_lighting'), bottle: chkName('bottle_rack') },
        showCabinets: step >= 2 && w1 > 0 && w2 > 0 && w3 > 0,
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
      mats.topDefault = mats.top; mats.islandDefault = mats.island; mats.carcassDefault = mats.carcass;
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
    function doors(g, w, y0, y1, n) {
      var dw = w / n; for (var i = 0; i < n; i++) { var cx = -w / 2 + dw * (i + .5); front(g, dw, y0, y1, mats.front, cx); handleH(g, cx, y1 - .06, Math.min(.2, dw * .55)); }
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
    function buildBase(m, w) {
      var g = new T.Group(), y0 = PL, y1 = BH - WT, W = w;
      box(W - 0.002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g);
      box(W - 0.002, y1 - y0, D - .01, mats.carcass, 0, (y0 + y1) / 2, (D - .01) / 2, g);
      switch (m.type) {
        case 'cornerBase': cornerFront(g, W, y0, y1, m.wall === 3); break;
        case 'sinkBase': doors(g, W, y0, y1, W > .601 ? 2 : 1); break;
        case 'ovenHobBase': ovenFront(g, W, y1 - .6, y1); front(g, W, y0, y1 - .6, mats.front, 0); handleH(g, 0, y1 - .6 - .04, W * .5); break;   // 60 cm oven flush with the worktop, one drawer below   // oven + drawer below it
        case 'hobBase': drawers(g, W, y0, y1, [1, 1, 1.6]); break;
        case 'dishwasher': if (m.free) break; front(g, W, y0, y1, mats.front, 0); box(W - .06, .02, .006, mats.glass, 0, y1 - .04, D + FT + .003, g); handleH(g, 0, y1 - .09, Math.min(W * .7, .4)); break;
        case 'washingMachine': if (m.free) break; front(g, W, y0, y1, mats.front, 0); handleH(g, 0, y1 - .06, Math.min(W * .5, .3)); break;   // built-in: behind a cabinet door like a real integrated washer
        case 'basket': if (X.bottle) { front(g, W, y0, y1, mats.front, 0); for (var bi = -2; bi <= 2; bi++) box(.008, y1 - y0 - .16, .01, mats.steel, bi * Math.min(.02, W / 7), (y0 + y1) / 2, D + FT + .006, g); handleH(g, 0, y1 - .05, W * .5); } else drawers(g, W, y0, y1, [1, 1, 1, 1]); break;
        case 'edgeFront': front(g, W, y0, y1, mats.frontAlt, 0); break;
        default: if (W <= .601) doors(g, W, y0, y1, 1); else if (X.drawers) drawers(g, W, y0, y1, [1, 1, 1, 1.4]); else if (W >= .7) doors(g, W, y0, y1, 2); else if (m.idx % 2) drawers(g, W, y0, y1, [1, 1, 1.5]); else doors(g, W, y0, y1, 1);
      }
      if (m.type === 'ovenHobBase' || m.type === 'hobBase') hobPlate(g, W);
      if (m.type === 'sinkBase') sinkTop(g, W);
      if (m.free && m.type === 'dishwasher') { g.remove.apply(g, g.children.slice(0, 2)); freeDishwasher(g, W); }
      if (m.free && m.type === 'washingMachine') { g.remove.apply(g, g.children.slice(0, 2)); freeWasher(g, W); }
      if (m.host) { var two = m.host.length > 1; if (m.host.indexOf('micro') >= 0) standMicro(g, two ? -W * .22 : 0); if (m.host.indexOf('coffee') >= 0) standCoffee(g, two ? W * .26 : 0); }
      return g;
    }
    function buildTall(m, w) {
      var g = new T.Group(), H = TALLH, W = w;
      if (m.type === 'fridge') {
        if (m.applianceType === 'free_standing') {
          box(W - .01, 1.9, D + .02, mats.steel, 0, .95, (D + .02) / 2, g);
          front(g, W - .01, 1.2, 1.9, mats.steel, 0); front(g, W - .01, .02, 1.2, mats.steel, 0);
          box(.014, .5, .02, mats.sink, W / 2 - .05, 1.55, D + .03, g); box(.014, .5, .02, mats.sink, W / 2 - .05, .85, D + .03, g);
          box(W - .002, H - 1.9, D - .01, mats.carcass, 0, 1.9 + (H - 1.9) / 2, (D - .01) / 2, g); front(g, W, 1.9, H, mats.front, 0); handleH(g, 0, 1.94, W * .5);
        } else {
          box(W - .002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g); box(W - .002, H - PL, D - .01, mats.carcass, 0, PL + (H - PL) / 2, (D - .01) / 2, g);
          front(g, W, PL, 0.95, mats.front, 0); front(g, W, .95, 2.1, mats.front, 0); front(g, W, 2.1, H, mats.front, 0);
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
        if (y < H - .75) { front(g, W, y, y + .55, mats.front, 0); handleH(g, 0, y + .5, W * .5); y += .55; }
        doors(g, W, y, H, 1);
      }
      return g;
    }
    function buildUpper(w, bottom, h, depth, mat, opt) {
      opt = opt || {}; var g = new T.Group(); box(w - .002, h, depth, mat, 0, bottom + h / 2, depth / 2, g);
      var n = (X.lift || w < .7) ? 1 : 2, dw = w / n, fm = opt.glass ? mats.glassFront : mat;
      if (opt.glass) {                                                                                  // lit display cabinet: warm interior + shelves
        box(w - .08, h - .08, depth - .06, mats.glow, 0, bottom + h / 2, depth / 2 + .02, g);
        [.33, .66].forEach(function (f) { box(w - .08, .012, depth - .08, mats.steel, 0, bottom + h * f, depth / 2 + .02, g); });
      }
      if (X.lift && !opt.glass && !opt.deep) {                                                           // lift-up flaps: joint between flaps is horizontal
        for (var k = 0; k < 2; k++) {
          var fy = bottom + h * (k ? .75 : .25);
          box(w - G, h / 2 - G, FT, fm, 0, fy, depth + FT / 2, g);
          if (X.panel && h > .5 && w > .25) box(w - G - .1, h / 2 - .1, .008, fm, 0, fy, depth + FT + .004, g);
          if (!X.handleless) box(Math.min(.2, w * .55), .012, .014, mats.steel, 0, bottom + h * (k ? .5 : 0) + .05, depth + FT + .007, g);
        }
        n = 0;
      }
      for (var i = 0; i < n; i++) {
        var cx = -w / 2 + dw * (i + .5);
        if (opt.glass) { box(dw - G, h - G, .008, fm, cx, bottom + h / 2, depth + .004, g); box(dw - G, .03, FT, mats.steel, cx, bottom + h - .015, depth + FT / 2, g); box(dw - G, .03, FT, mats.steel, cx, bottom + .015, depth + FT / 2, g); }
        else { box(dw - G, h - G, FT, fm, cx, bottom + h / 2, depth + FT / 2, g); if (X.panel && h > .3 && dw > .25) box(dw - G - .1, h - .1, .008, fm, cx, bottom + h / 2, depth + FT + .004, g); }
        var hl = Math.min(.2, dw * .55), sMm = opt.s0 === undefined ? 1e9 : (opt.wall === 1 ? opt.s0 + w * 1000 - (i + .5) * dw * 1000 : opt.s0 + (i + .5) * dw * 1000);
        if (!X.handleless && !(opt.blind && sMm - hl * 500 < opt.blind)) box(hl, .012, .014, mats.steel, cx, bottom + .06, depth + FT + .007, g);   // no handle on a door that is hidden behind the other wall's row
      }
      if (X.light && !opt.deep) box(w - .04, .012, .03, mats.led, 0, bottom - .006, depth - .05, g);       // LED strip under uppers
      return g;
    }


    /* corner unit: a 900 mm unit whose 600 mm inner part sits behind the back wall's first / last cabinet; only the 300 mm end away from the corner shows a front.
       Wall 1 is mirrored (its corner end is at +x), wall 3 is not (its corner end is at -x). */
    function cornerFront(g, W, y0, y1, mirror) {
      var fw = .3 - .004, cx = mirror ? W / 2 - .15 : -W / 2 + .15;
      front(g, fw + G, y0, y1, mats.front, cx); handleH(g, cx, y1 - .06, Math.min(.2, fw * .8));
    }
    /* distance along a wall (mm from its corner end; back wall: from the left corner) -> x in that wall's local frame.
       Wall groups: wall 2 at the origin facing +z; wall 1 turned +90° at (0,0,L1) facing +x (mirrored); wall 3 turned -90° at (L2,0,0) facing -x. */
    var WALL = { 1: 0, 2: 0, 3: 0 };
    function lc(wall, sMm) { return wall === 1 ? (WALL[1] - sMm) / 1000 : sMm / 1000; }

    /* ---------------- room */
    var UPPER = { ub: 1.45, uh: .95, depth: .35 }, TOPROW = { ub: 2.07, uh: .33, depth: D - .014 };
    // the top of the upper row (standard or the deep second row) is always flush with the top of the tall column (2.4 m, or the ceiling when lower)
    function applyHeights(inp) {
      var top = Math.min(TALLH, (inp.heightMm || 2600) / 1000);
      if (inp.deep) { TOPROW.uh = .33; TOPROW.ub = top - TOPROW.uh; UPPER.uh = Math.max(.3, TOPROW.ub - UPPER.ub); }
      else UPPER.uh = Math.max(.3, top - UPPER.ub);
    }
    function buildRoom(inp) {
      while (roomGroup.children.length) roomGroup.remove(roomGroup.children[0]);
      var L1 = (inp.wall1Mm || 3000) / 1000, L2 = (inp.wall2Mm || 3600) / 1000, L3 = (inp.wall3Mm || 3000) / 1000, H = (inp.heightMm || 2600) / 1000, LZ = Math.max(L1, L3);
      texN = 0; mats.top = inp.cTop !== null && inp.cTop !== undefined ? fin('countertop_finish', inp.cTop, 0, .45) : mats.topDefault;
      mats.island = inp.cLower !== null && inp.cLower !== undefined ? fin('lower_finish', inp.cLower, -.03) : mats.islandDefault;
      var ch = inp.chimney, cA = ch ? inp.chimneyAMm / 1000 : 0, cB = ch ? inp.chimneyBMm / 1000 : 0;
      var z1 = ch === 'left' ? cA : 0, z3 = ch === 'right' ? cA : 0, x0 = ch === 'left' ? cB : 0, x1 = L2 - (ch === 'right' ? cB : 0);
      var bh = UPPER.ub - BH, my = (UPPER.ub + BH) / 2;
      // wall strips: [axis, from, to]: 'x' = back wall (z = 0), 'l' = left wall (x = 0), 'r' = right wall (x = L2)
      var strips = [['x', x0, x1], ['l', z1, L1], ['r', z3, L3]];
      function stripMesh(geo, mat, sp, inset) {
        var m = new T.Mesh(geo, mat);
        if (sp[0] === 'x') m.position.set((sp[1] + sp[2]) / 2, my, inset);
        else if (sp[0] === 'l') { m.rotation.y = Math.PI / 2; m.position.set(inset, my, (sp[1] + sp[2]) / 2); }
        else { m.rotation.y = -Math.PI / 2; m.position.set(L2 - inset, my, (sp[1] + sp[2]) / 2); }
        roomGroup.add(m);
      }
      if (inp.showCabinets && inp.x && inp.x.light) {
        var m1 = new T.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: .22 });
        strips.forEach(function (sp) { if (sp[2] > sp[1]) stripMesh(new T.PlaneGeometry(sp[2] - sp[1], bh), m1, sp, .006); });
      }
      if (inp.showCabinets && inp.cBack !== null && inp.cBack !== undefined) {
        var bm = fin('backsplash_finish', inp.cBack, 0, .4);
        strips.forEach(function (sp) {
          var len = sp[2] - sp[1]; if (len <= 0) return;
          var bgm = new T.PlaneGeometry(len, bh);
          if (bm.map) { var buv = bgm.attributes.uv; for (var bi = 0; bi < buv.count; bi++) buv.setXY(bi, buv.getX(bi) * len / .6, buv.getY(bi) * bh / .6); }
          stripMesh(bgm, bm, sp, .004);
        });
      }
      var floor = new T.Mesh(new T.PlaneGeometry(L2, LZ), mats.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(L2 / 2, -.001, LZ / 2); floor.receiveShadow = true; roomGroup.add(floor);
      function grid(step, color, y, opacity) {
        var pts = [], v;
        for (v = 0; v <= L2 + 1e-6; v += step) pts.push(v, 0, 0, v, 0, LZ);
        for (v = 0; v <= LZ + 1e-6; v += step) pts.push(0, 0, v, L2, 0, v);
        var gm = new T.BufferGeometry(); gm.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
        var ln = new T.LineSegments(gm, new T.LineBasicMaterial(opacity ? { color: color, transparent: true, opacity: opacity } : { color: color })); ln.position.y = y; roomGroup.add(ln);
      }
      grid(.5, 0xb9b6ae, .001, .8); grid(1, 0x8e8b82, .002);
      // from step 2 on a wall is drawn only when it carries upper cabinets: the open sides keep the view on the cabinets (the floor outline stays)
      var showW = inp.wallsByUppers && inp.uppers ? inp.uppers : { 1: true, 2: true, 3: true };
      if (showW[2]) { var w2 = new T.Mesh(new T.PlaneGeometry(L2, H), mats.wall); w2.position.set(L2 / 2, H / 2, -.001); roomGroup.add(w2); }
      if (showW[1]) { var w1 = new T.Mesh(new T.PlaneGeometry(L1, H), mats.side); w1.rotation.y = Math.PI / 2; w1.position.set(-.001, H / 2, L1 / 2); roomGroup.add(w1); }
      if (showW[3]) { var w3 = new T.Mesh(new T.PlaneGeometry(L3, H), mats.side); w3.rotation.y = -Math.PI / 2; w3.position.set(L2 + .001, H / 2, L3 / 2); roomGroup.add(w3); }
      var edges = [0, 0, 0, L2, 0, 0, 0, 0, 0, 0, 0, L1, L2, 0, 0, L2, 0, L3];
      if (showW[2]) edges.push(0, H, 0, L2, H, 0, 0, 0, 0, 0, H, 0, L2, 0, 0, L2, H, 0);
      if (showW[1]) edges.push(0, H, 0, 0, H, L1, 0, 0, L1, 0, H, L1, 0, 0, 0, 0, H, 0);
      if (showW[3]) edges.push(L2, H, 0, L2, H, L3, L2, 0, L3, L2, H, L3, L2, 0, 0, L2, H, 0);
      var eg = new T.BufferGeometry(); eg.setAttribute('position', new T.Float32BufferAttribute(edges, 3)); roomGroup.add(new T.LineSegments(eg, new T.LineBasicMaterial({ color: 0x9aa09a })));
      // dimension lines on the floor in front of each run + the height on the left corner edge; the entered lengths run from the chimney outwards
      var off = D + .45, gl = new T.LineBasicMaterial({ color: 0x477448 }), V = function (x, y, z) { return new T.Vector3(x, y, z); }, t = .07;
      roomGroup.add(new T.LineSegments(new T.BufferGeometry().setFromPoints([
        V(x0, .004, off), V(x1, .004, off), V(x0, .004, off - t), V(x0, .004, off + t), V(x1, .004, off - t), V(x1, .004, off + t),
        V(off, .004, z1), V(off, .004, L1), V(off - t, .004, z1), V(off + t, .004, z1), V(off - t, .004, L1), V(off + t, .004, L1),
        V(L2 - off, .004, z3), V(L2 - off, .004, L3), V(L2 - off - t, .004, z3), V(L2 - off + t, .004, z3), V(L2 - off - t, .004, L3), V(L2 - off + t, .004, L3),
        V(.02, 0, .02), V(.02, H, .02)]), gl));
      // the back wall's label lies on the floor; the side walls' labels sit above the front edge of their worktops, so the three never overlap
      function dimLabel(text, x, y, z) { var lb = label(text, .17, '#2f4a30', 'rgba(255,255,255,.85)'); lb.position.set(x, y, z); roomGroup.add(lb); }
      dimLabel('стена 1 · ' + fmt(Math.round((L1 - z1) * 1000)), D * .8, BH + .14, (z1 + L1) / 2 + .2);
      dimLabel('стена 2 · ' + fmt(Math.round((x1 - x0) * 1000)), (x0 + x1) / 2, .14, off + .1);
      dimLabel('стена 3 · ' + fmt(Math.round((L3 - z3) * 1000)), L2 - D * .8, BH + .14, (z3 + L3) / 2 + .2);
      var ht = label(fmt(inp.heightMm || 2600), .2, '#2f4a30', 'rgba(255,255,255,.85)'); ht.position.set(.0, H / 2, .1); roomGroup.add(ht);
      if (ch) {
        var OR = 0xd9822b, R = ch === 'right', X0 = function (x) { return R ? L2 - x : x; };   // the right-corner chimney is the mirror image of the left one
        var cb = box(cB, H, cA, mats.chimney, X0(cB / 2), H / 2, cA / 2, roomGroup); cb.castShadow = false;
        var co = new T.LineSegments(new T.EdgesGeometry(cb.geometry), new T.LineBasicMaterial({ color: OR })); co.raycast = function () {}; cb.add(co);
        // A = along the side wall (z), B = along the back wall (x): orange dimension lines on the chimney's top edges, with A / B badges
        var ty = H + .03, tk = .07;
        roomGroup.add(new T.LineSegments(new T.BufferGeometry().setFromPoints([
          V(X0(cB), ty, 0), V(X0(cB), ty, cA), V(X0(cB - tk), ty, 0), V(X0(cB + tk), ty, 0), V(X0(cB - tk), ty, cA), V(X0(cB + tk), ty, cA),
          V(X0(0), ty, cA), V(X0(cB), ty, cA), V(X0(0), ty, cA - tk), V(X0(0), ty, cA + tk)]), new T.LineBasicMaterial({ color: OR })));
        var la = label('A  ' + fmt(inp.chimneyAMm), .2, '#ffffff', '#d9822b'); la.position.set(X0(cB + .3), H - .3, cA / 2); roomGroup.add(la);
        var lb2 = label('B  ' + fmt(inp.chimneyBMm), .2, '#ffffff', '#d9822b'); lb2.position.set(X0(cB / 2 - .05), H - .62, cA + .34); roomGroup.add(lb2);
      }
      if (inp.showCabinets && inp.island && inp.islandLenMm && inp.islandWidthMm) {   // free-standing island in the middle of the U, along the back wall
        var bl = inp.islandLenMm / 1000, bw = inp.islandWidthMm / 1000, ig = new T.Group();
        box(bl, BH - WT - .1, bw, mats.island, 0, .1 + (BH - WT - .1) / 2, 0, ig); box(bl - .01, .1, bw - .06, mats.plinth, 0, .05, 0, ig); box(bl + .04, WT, bw + .04, mats.top, 0, BH - WT / 2, 0, ig);
        var px = L2 / 2, pz = D + 1.1 + bw / 2;
        ig.position.set(px, 0, pz); roomGroup.add(ig);
        var it = label('остров ' + fmt(inp.islandLenMm) + ' × ' + fmt(inp.islandWidthMm), .16, '#4a4132', 'rgba(255,255,255,.85)'); it.position.set(px, BH + .18, pz); roomGroup.add(it);
      }
    }

    /* ---------------- пас (6 cm filler): a mini cabinet front in the same plane and material as the doors, no handle */
    function pasLower(w) {
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
      while (cabGroup.children.length) cabGroup.remove(cabGroup.children[0]);
      hl.saved = []; hl.key = null; meshById = {}; msg.hidden = true; items = []; X = inp.x || {}; texN = 0; unitById = {}; upos = {}; dpos = {}; uRuns = [];
      wg = {}; WALLS.forEach(function (w) { wg[w] = new T.Group(); cabGroup.add(wg[w]); });
      WALL[1] = inp.wall1Mm; WALL[2] = inp.wall2Mm; WALL[3] = inp.wall3Mm;
      wg[1].rotation.y = Math.PI / 2; wg[1].position.set(0, 0, inp.wall1Mm / 1000);
      wg[3].rotation.y = -Math.PI / 2; wg[3].position.set(inp.wall2Mm / 1000, 0, 0);
      WALLS.forEach(function (w) { wg[w].updateMatrixWorld(true); });
      if (!inp.showCabinets) { plan = null; return; }
      var cfgPlan = { wall1Mm: inp.wall1Mm, wall2Mm: inp.wall2Mm, wall3Mm: inp.wall3Mm, heightMm: inp.heightMm, waterWall: inp.waterWall, ovenTower: inp.ovenTower, fridge: inp.fridge, dishwasherMm: inp.dishwasherMm, washer: inp.washer, microwave: inp.microwave, coffee: inp.coffee, basket: !!(inp.x && inp.x.bottle), chimney: inp.chimney, chimneyAMm: inp.chimneyAMm, chimneyBMm: inp.chimneyBMm, deep: inp.deep };
      plan = planU(cfgPlan);
      if (plan.errors.length) { msg.textContent = plan.errors[0]; msg.hidden = false; return; }
      lastApplied = applyMoves(plan, xfer);
      if (moveCheck && !moveCheck.mv.every(function (m) { return lastApplied.indexOf(m) >= 0; })) {   // the move does not fit: undo it
        var mc = moveCheck; xfer = mc.old.xfer; order = mc.old.order; uorder = mc.old.uorder; dorder = mc.old.dorder; plan = planU(cfgPlan); lastApplied = applyMoves(plan, xfer);
        msg.textContent = 'Размяната не е възможна: шкафовете на стената не се побират след нея.'; msg.hidden = false; setTimeout(function () { msg.hidden = true; }, 4500);
      }
      moveCheck = null; xfer = lastApplied;   // cross-wall moves made by the user are re-applied on every rebuild while they still fit
      var tails = {};
      WALLS.forEach(function (w) {
        var wl = plan.walls[w], ordered = applyOrder(wl.modules, dirty ? order[w] : null); order[w] = ordered.map(function (m) { return m.id; });
        ordered.forEach(function (m, i) { m.idx = i; });
        var pos = position(ordered, wl.startMm); pos.items.forEach(function (m) { m.wall = w; items.push(m); }); tails[w] = pos.end;
      });
      // upper units only on the walls the client chose. In each corner the side wall's row runs into the corner (or to the chimney face) and the back wall's row
      // starts where the side row's front plane ends (unless the chimney is deep enough to separate them, or the side wall has no uppers: then it runs into the corner)
      var U = inp.uppers || { 1: true, 2: true, 3: true }, dS = Math.round((UPPER.depth + FT) * 1000), dD = Math.round((TOPROW.depth + FT) * 1000);
      var ch = plan.chimney, A = ch ? (inp.chimneyAMm || 0) : 0, B = ch ? (inp.chimneyBMm || 0) : 0;
      function cornerOf(side) { return side === 1 ? 'left' : 'right'; }
      function backLimit(side, depth) {   // mm from the back wall's corner end where its row starts in that corner
        var c = ch === cornerOf(side);
        if (!U[side]) return c ? B : 0;
        return c ? (A >= depth ? B : Math.max(B, depth)) : depth;
      }
      var L2 = plan.walls[2].lengthMm, bS = backLimit(1, dS), eS = backLimit(3, dS), bD = inp.deep ? backLimit(1, dD) : bS, eD = inp.deep ? backLimit(3, dD) : eS;
      var cutL = Math.max(0, bD - bS), cutR = Math.max(0, eD - eS);
      var blindS = {}, blindD = {};
      [1, 3].forEach(function (w) { var c = ch === cornerOf(w); blindS[w] = U[2] && !(c && A >= dS) ? dS - 18 : 0; blindD[w] = U[2] && !(c && A >= dD) ? dD - 18 : 0; });
      WALLS.forEach(function (w) {
        if (!U[w]) return;
        var wl = plan.walls[w], its = position(wl.modules, wl.startMm).items, eS0 = 0, eE0 = 0;
        if (w === 2) { eS0 = Math.max(0, wl.startMm - bS); eE0 = Math.max(0, (L2 - eS) - (wl.endMm - wl.fillerMm)); }
        else eS0 = Math.max(0, wl.startMm - (ch === cornerOf(w) ? A : 0));
        upperRuns(w, its, eS0, eE0).forEach(function (r) { uRuns.push(r); r.units.forEach(function (u) { unitById[u.id] = u; }); });
      });
      // the standard upper row and the deep row above it are two independent layers, each with its own order (slots keep their widths, the unit moves into the slot)
      function layer(ord) {
        var ok = !!ord && ord.length === uRuns.length;
        if (ok) { var seen = {}, cnt = 0, total = Object.keys(unitById).length; ord.forEach(function (ids, ri) { ids.forEach(function (id) { if (!unitById[id] || seen[id]) ok = false; else { seen[id] = 1; cnt++; } }); if (ids.length !== uRuns[ri].units.length) ok = false; }); if (cnt !== total) ok = false; }
        var ids = (ok ? ord : uRuns.map(function (r) { return r.units.map(function (u) { return u.id; }); })).map(function (a) { return a.slice(); }), pos = {};
        uRuns.forEach(function (r, ri) { var ux = r.x0; ids[ri].forEach(function (id, si) { var sw = r.units[si].w; pos[id] = { wall: r.wall, x: ux, w: sw, first: !!r.first && si === 0, last: !!r.last && si === ids[ri].length - 1 }; ux += sw; }); });
        return { ok: ok, ids: ids, pos: pos };
      }
      var LU = layer(uorder), LD = layer(dorder);
      if (!LU.ok) uorder = null; if (!LD.ok) dorder = null;
      upos = LU.pos; dpos = LD.pos; layerIds = { u: LU.ids, d: LD.ids };
      uRuns.forEach(function (r, ri) { r.ids = LU.ids[ri]; });
      var unitList = []; uRuns.forEach(function (r) { r.ids.forEach(function (id) { unitList.push(id); }); });
      // the glass display is one particular unit: chosen once (middle of the back wall's row, else of all rows), then it moves with that unit
      if (!X.glass) glassPick = null;
      else if (!glassPick || unitList.indexOf(glassPick) < 0) {
        var base = []; uRuns.forEach(function (r) { r.units.forEach(function (u) { base.push(u.id); }); });
        var back = base.filter(function (id) { return unitById[id].wall === 2; }), pool = back.length ? back : base;
        glassPick = pool.length ? pool[Math.floor(pool.length / 2)] : null;
      }
      var glassId = X.glass ? glassPick : null;
      items.forEach(function (m) { m.free = (m.type === 'dishwasher' && inp.dishFree) || (m.type === 'washingMachine' && inp.washFree); m.host = null; });
      var gb = items.filter(function (m) { return m.type === 'genericBase' || m.type === 'basket'; });
      if (!gb.length) gb = items.filter(function (m) { return !TALL[m.type] && m.type !== 'cornerBase'; });
      if (gb.length) {
        if (inp.microFree) gb[0].host = ['micro'];
        if (inp.coffeeFree) { var cg = gb[gb.length - 1]; cg.host = (cg.host || []).concat('coffee'); }
      }
      var hasL = inp.cLower !== null && inp.cLower !== undefined, hasU = inp.cUpper !== null && inp.cUpper !== undefined;
      var hasD = inp.cDeep !== null && inp.cDeep !== undefined && !!(root.pMaterialSelections && root.pMaterialSelections.get('deep_finish'));
      mats.front = hasL ? fin('lower_finish', inp.cLower, 0, undefined, inp.gL) : mats.frontA;
      mats.carcass = hasL ? mats.front : mats.carcassDefault;   // visible end panels of the runs are made in the front decor, as built
      mats.upper = hasU ? fin('upper_finish', inp.cUpper, 0, undefined, inp.gU) : mats.front;
      mats.deep = hasD ? fin('deep_finish', inp.cDeep, 0, undefined, inp.gD) : (hasU ? fin('upper_finish', inp.cUpper, 0, undefined, inp.gD) : mats.front);
      items.forEach(function (m) {
        var w = m.w / 1000, cx = lc(m.wall, m.x + m.w / 2);
        var g = TALL[m.type] ? buildTall(m, w) : buildBase(m, w);
        g.position.x = cx; worldUV(g); g.userData = { id: m.id, wall: m.wall, targetX: cx, w: w, type: m.type }; wg[m.wall].add(g); meshById[m.id] = g; addLabel(g, String(m.w / 10));
      });
      unitList.forEach(function (id) {
        var u = upos[id], w = u.w / 1000, ux = lc(u.wall, u.x + u.w / 2);
        var up = buildUpper(w, UPPER.ub, UPPER.uh, UPPER.depth, mats.upper, { glass: id === glassId, wall: u.wall, s0: u.x, blind: u.wall !== 2 && u.first ? blindS[u.wall] : 0 }); up.position.x = ux; worldUV(up); up.userData = { id: id, wall: u.wall, upper: true, layer: 'u', targetX: ux }; wg[u.wall].add(up); meshById[id + ':u'] = up;
      });
      // the deep row is deeper: on the back wall it starts / ends further from the corners so it clears the side walls' deep rows
      if (inp.deep) Object.keys(dpos).forEach(function (id) {
        var u = dpos[id], c0 = u.wall === 2 && u.first ? cutL : 0, c1 = u.wall === 2 && u.last ? cutR : 0, dw2 = (u.w - c0 - c1) / 1000; if (dw2 < .05) return;
        var dsx = lc(u.wall, u.x + c0 + (u.w - c0 - c1) / 2);
        var dp = buildUpper(dw2, TOPROW.ub, TOPROW.uh, TOPROW.depth, mats.deep, { deep: true, wall: u.wall, s0: u.x + c0, blind: u.wall !== 2 && u.first ? blindD[u.wall] : 0 });
        dp.position.x = dsx; worldUV(dp); dp.userData = { id: id, wall: u.wall, upper: true, layer: 'd', targetX: dsx }; wg[u.wall].add(dp); meshById[id + ':d'] = dp;
      });
      function fillerAt(w, a, b) { var g = pasLower((b - a) / 1000); g.position.x = lc(w, (a + b) / 2); g.userData = { filler: true }; wg[w].add(g); }
      // the back wall must close up to the right corner unit: its leftover goes in as a filler front at the right end
      var W2 = plan.walls[2];
      if (W2.fillerMm > 0) fillerAt(2, W2.endMm - W2.fillerMm, W2.endMm);
      // 6 cm corner fillers (пас) next to the chimney + the dead corner block (the chimney stands in it) with door-plane fronts and a worktop on top
      if (plan.pas) {
        var P = plan.pas; fillerAt(P.side, P.sideFrom, P.sideTo); fillerAt(2, P.backFrom, P.backTo);
        var bx0 = P.block.x0 / 1000, bx1 = P.block.x1 / 1000, bz = P.block.z1 / 1000, bw = bx1 - bx0, bc = (bx0 + bx1) / 2, left = P.side === 1;
        box(bw - .06, PL, bz - .06, mats.plinth, bc, PL / 2, (bz - .06) / 2, wg[2]);
        box(bw, BH - PL - WT, bz, mats.carcass, bc, PL + (BH - PL - WT) / 2, bz / 2, wg[2]);
        box(.018, BH - PL - WT - G, bz, mats.front, left ? bx1 + .009 - FT : bx0 - .009 + FT, PL + (BH - PL - WT) / 2, bz / 2, wg[2]);   // face towards the back run
        box(bw, BH - PL - WT - G, .018, mats.front, bc, PL + (BH - PL - WT) / 2, bz + .009 - FT, wg[2]);                                   // face towards the side run
        var ct = new T.Group(); box(bw + .02, WT, bz + .02, mats.top, bc + (left ? .01 : -.01), BH - WT / 2, bz / 2 + .01, ct); ct.userData = { top: true }; wg[2].add(ct);
      }
      // worktop slabs over each consecutive base run (fillers included); the back wall's slabs stop 20 mm short of the side slabs so the U is seamless
      WALLS.forEach(function (w) {
        var wl = plan.walls[w], segs = [];
        items.filter(function (m) { return m.wall === w; }).forEach(function (m) { if (TALL[m.type]) segs.push(null); else if (!segs.length || segs[segs.length - 1] === null) segs.push([m.x, m.x + m.w]); else segs[segs.length - 1][1] = m.x + m.w; });
        segs.filter(Boolean).forEach(function (sg) {
          var a = sg[0], b = sg[1];
          if (w === 2) {
            if (b === wl.endMm - wl.fillerMm) b = wl.endMm;
            if (a === wl.startMm) a += ch === 'left' ? -PAS : 20;
            if (b === wl.endMm) b += ch === 'right' ? PAS : -20;
          } else if (plan.pas && plan.pas.side === w && a === wl.startMm) a -= PAS;
          var top = new T.Group(); box((b - a) / 1000, WT, D + .02, mats.top, lc(w, (a + b) / 2), BH - WT / 2, (D + .02) / 2, top); top.userData = { top: true }; wg[w].add(top);
        });
      });
      var cur = { wall1Mm: plan.wallMm[1], wall2Mm: plan.wallMm[2], wall3Mm: plan.wallMm[3], chimney: plan.chimney, walls: {} };
      WALLS.forEach(function (w) { cur.walls[w] = { startMm: plan.walls[w].startMm, endMm: plan.walls[w].endMm, fillerMm: plan.walls[w].fillerMm, modules: items.filter(function (m) { return m.wall === w; }).map(function (m) { return { id: m.id, type: m.type, widthMm: m.w, xMm: m.x }; }), uppers: unitList.filter(function (id) { return upos[id].wall === w; }).map(function (id) { return { id: id, widthMm: upos[id].w, xMm: upos[id].x }; }) }; });
      root.pLayout.current = cur;
    }

    /* ---------------- camera fit + sync */
    var home = { pos: null, target: null };
    /* camera framing for a U: from the open side, slightly raised, all three walls in view */
    function frame(inp, asp, el, pad) {
      var L1 = (inp.wall1Mm || 3000) / 1000, L2 = (inp.wall2Mm || 3600) / 1000, L3 = (inp.wall3Mm || 3000) / 1000, H = (inp.heightMm || 2600) / 1000, LZ = Math.max(L1, L3);
      var tv = Math.tan(21 * Math.PI / 180), th = tv * asp, halfW = L2 / 2 + .2;
      var target = new T.Vector3(L2 / 2, Math.min(H * .42, 1.05), Math.min(LZ * .45, 1.5));
      var dist = Math.max((halfW * pad) / th + LZ * .55, (H / 2 * 1.35) / tv, 3.8) + .6;
      var dir = new T.Vector3(0, Math.sin(el), Math.cos(el));
      return { target: target, pos: target.clone().add(dir.multiplyScalar(dist)), dist: dist, L2: L2, H: H, LZ: LZ };
    }
    function fit(inp) {
      var el = renderer && renderer.domElement, asp = el && el.clientHeight ? el.clientWidth / el.clientHeight : 1.6; asp = Math.max(.6, Math.min(2.5, asp));
      var f = frame(inp, asp, 34 * Math.PI / 180, 1.2);
      bounds = { x: f.L2, y: f.H, z: f.LZ };
      home.target = f.target; home.pos = f.pos;
      camera.position.copy(home.pos); controls.target.copy(home.target); controls.maxDistance = f.dist * 2.2; controls.minDistance = 1.2; controls.update();
    }
    function sync(force) {
      if (failed || !renderer) return;
      var inp = readInputs(), sig = JSON.stringify(inp);
      var ps = card.dataset.previewState, show = !ps || ps === 'planner';
      host.hidden = !show; stage.classList.toggle('p-3d-on', show);
      if (!show && !force) return;   // hidden behind the AI picture: still rebuilt when a decor arrives, so the next picture of the sketch is right
      if (sig === inputsSig && !force) return;
      var prev = inputsSig ? JSON.parse(inputsSig) : null; inputsSig = sig;
      if (prev && prev.waterWall !== inp.waterWall) { dirty = false; uorder = null; dorder = null; }   // an explicit water-wall choice re-flows both runs
      resize(); applyHeights(inp); buildRoom(inp); buildCabinets(inp);
      var fs = (inp.wall1Mm || 0) + '|' + (inp.wall2Mm || 0) + '|' + (inp.wall3Mm || 0) + '|' + (inp.heightMm || 0);
      if (fs !== fitSig) { fitSig = fs; fit(inp); }
      hint.textContent = inp.showCabinets ? (panMode ? 'Преместване на изгледа: влачете наляво/надясно и нагоре/надолу · Мащаб: колелце/щипване' : moveMode ? 'Местене на шкафове: хванете шкаф и го пуснете върху друг (и на другата стена, ако се побира), за да си разменят местата.' : 'Въртене: влачете · Мащаб: колелце/щипване') : 'Въведете размерите — виждате голото помещение с мерна решетка (всеки квадрат е 50 см).';
      modeBtn.hidden = autoBtn.hidden = !inp.showCabinets; setMode(panMode ? 'pan' : moveMode ? 'move' : 'rotate', true);
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
      if (hl.key === key) return; clearHL(); if (!key || !meshById[key]) return;
      var g = meshById[key], box = new T.Box3(), inv = new T.Matrix4(); g.updateMatrixWorld(true); inv.copy(g.matrixWorld).invert();
      g.traverse(function (o) { if (o.isMesh && o.geometry) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld).applyMatrix4(inv)); } });
      if (box.isEmpty()) return;
      var sz = box.getSize(new T.Vector3()), c = box.getCenter(new T.Vector3());
      var ov = new T.Mesh(new T.BoxGeometry(sz.x + .012, sz.y + .012, sz.z + .012), new T.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: .5, depthWrite: false }));
      ov.position.copy(c); ov.renderOrder = 5; g.add(ov); hl.saved.push(ov); hl.key = key;   // a translucent green shell over the whole cabinet, front included
    }
    function onUp(ev) {
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
              var oldOrder = { 1: order[1].slice(), 2: order[2].slice(), 3: order[3].slice() }, oldX = xfer, oldU = uorder, oldD = dorder;
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

    /* ---------------- scene setup */
    function setup() {
      T = root.THREE; renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = false;
      host.insertBefore(renderer.domElement, hint); scene = new T.Scene(); scene.background = new T.Color(0xeef0ed);
      camera = new T.PerspectiveCamera(42, 1, .05, 80); ray = new T.Raycaster(); mouse = new T.Vector2(); setupMats(); mats.chimney = new T.MeshStandardMaterial({ color: 0xe6bd94, roughness: .9 });
      scene.add(new T.HemisphereLight(0xffffff, 0xb6b2a8, .95));
      var sun = new T.DirectionalLight(0xffffff, .75); sun.position.set(5, 6, 5); sun.castShadow = false; scene.add(sun);
      roomGroup = new T.Group(); cabGroup = new T.Group(); scene.add(roomGroup, cabGroup);
      dropMark = new T.Mesh(new T.PlaneGeometry(1, 1.1), mats.highlight); dropMark.rotation.x = -Math.PI / 2; dropMark.visible = false; dropMark.position.y = .01; scene.add(dropMark);
      controls = new T.OrbitControls(camera, renderer.domElement); controls.enablePan = true; controls.screenSpacePanning = true; controls.panSpeed = 1; controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .5; controls.minAzimuthAngle = -Math.PI / 2 + .1; controls.maxAzimuthAngle = Math.PI / 2 - .1;
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
        controls.update(); renderer.render(scene, camera);
      })();
    }
    function resize() { if (!renderer) return; var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    function setMode(m, quiet) {
      moveMode = m === 'move'; panMode = m === 'pan'; host.setAttribute('data-mode', m);
      rotBtn.setAttribute('aria-pressed', String(m === 'rotate')); modeBtn.setAttribute('aria-pressed', String(moveMode)); panBtn.setAttribute('aria-pressed', String(panMode));
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
      else if (a === 'auto') { dirty = false; uorder = null; dorder = null; xfer = []; order = { 1: [], 2: [], 3: [] }; glassPick = null; inputsSig = ''; sync(true); }
      controls.update();
    });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (t) { btns.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    function fail() { failed = true; host.hidden = true; stage.classList.remove('p-3d-on'); }

    var raf = 0; function soon() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(false); }); }
    page.addEventListener('change', soon, true); page.addEventListener('input', soon, true);
    root.pLayout = root.pLayout || { refresh: function () {}, current: null };
    Promise.resolve(root.THREE || load(THREE_URL)).then(function () { return root.THREE.OrbitControls || load(ORBIT_URL); }).then(function () {
      setup();
      new MutationObserver(soon).observe(page, { subtree: true, attributes: true, characterData: true, childList: true, attributeFilter: ['class', 'data-p-flow-step', 'data-preview-state', 'value'] });
      page.addEventListener('click', function () { setTimeout(soon, 100); }); page.addEventListener('p:phase-changed', function () { inputsSig = ''; soon(); }); page.addEventListener('p:material-chosen', function () { inputsSig = ''; soon(); });
      /* picture of the interactive sketch for the AI visualization: fixed camera from the open side of the U, no grid lines or labels, same textures as on screen */
      function capture() {
        try { sync(false); } catch (e) { /* keep the last scene */ }   // bring the scene up to date first: rebuilds wait for an animation frame, which a background tab may not get
        if (!T || !scene || !plan || !items.length) return null;
        var inp = readInputs(), W = 1536, H = 1024, r = null, hide = [], prev = [];
        try {
          clearHL();
          scene.traverse(function (o) { if (o.type === 'LineSegments' || o.type === 'Sprite') hide.push(o); });
          if (dropMark) hide.push(dropMark);
          hide.forEach(function (o) { prev.push(o.visible); o.visible = false; });
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
          r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H, false);
          var cam = new T.PerspectiveCamera(42, W / H, .05, 80);
          // same framing as the on-screen home view (fit), computed for the 3:2 picture: from the open side of the U, all three walls in view
          var f = frame(inp, W / H, 26 * Math.PI / 180, 1.1);
          cam.position.copy(f.pos); cam.lookAt(f.target); cam.updateMatrixWorld(true);
          r.render(scene, cam);
          var url = cv.toDataURL('image/jpeg', .9);
          return url && url.length > 4000 ? url : null;
        } catch (e) { return null; }
        finally { hide.forEach(function (o, i) { o.visible = prev[i]; }); if (r) r.dispose(); }
      }
      /* short feature key for the AI prompt: appliances per wall (sides from the corner outwards, back wall left to right), then surfaces and extras (data only) */
      function sketchLegend() {
        try { sync(false); } catch (e) { /* keep the last scene */ }
        var inp = readInputs(), out = [];
        var nm = { fridge: 'fridge', ovenTower: 'tall oven tower', ovenHobBase: 'oven with hob', hobBase: 'hob', sinkBase: 'sink', dishwasher: 'dishwasher', washingMachine: 'washing machine', applianceTower: 'built-in appliance tower', basket: 'narrow bottle pullout', cornerBase: 'corner base unit' };
        function nmOf(m) {   // what the image model must draw: built-in appliances stay hidden behind cabinet fronts
          if (m.type === 'fridge') return m.applianceType === 'free_standing' ? 'free-standing black fridge' : 'built-in fridge behind cabinet doors';
          if (m.type === 'dishwasher') return m.free ? 'free-standing black dishwasher' : 'integrated dishwasher behind a front';
          if (m.type === 'washingMachine') return m.free ? 'free-standing washer' : 'built-in washer behind a front';
          if (m.type === 'ovenTower') { var a = (m.appliances || []).map(function (x) { return x === 'microwave' ? 'microwave' : x === 'coffeeMachine' ? 'coffee machine' : 'oven'; }); return 'tall oven tower (built-in ' + (a.length ? a.join(', ') : 'oven') + ')'; }
          return nm[m.type];
        }
        var WN = { 1: 'left wall', 2: 'back wall', 3: 'right wall' };
        [[1, ' from the back corner outwards'], [2, ' from left to right'], [3, ' from the back corner outwards']].forEach(function (wl) {
          var list = items.filter(function (m) { return m.wall === wl[0] && nm[m.type]; }).sort(function (a, b) { return a.x - b.x; }).map(nmOf);
          out.push(WN[wl[0]] + wl[1] + ': ' + (list.length ? list.join(', ') : 'storage cabinets only'));
        });
        var uw = WALLS.filter(function (w) { return inp.uppers && inp.uppers[w]; }).map(function (w) { return WN[w]; });
        out.push(uw.length === 3 ? 'upper cabinets on all three walls, meeting in both corners' : uw.length ? 'upper cabinets only on: ' + uw.join(', ') + ', the other walls have no upper cabinets, plain wall above the backsplash' : 'no upper cabinets on any wall, only the base run and backsplash');
        if (inp.chimney) out.push('CHIMNEY: a plastered wall column ' + Math.round(inp.chimneyBMm / 10) + ' x ' + Math.round(inp.chimneyAMm / 10) + ' cm, floor to ceiling, standing out in the ' + inp.chimney + ' back corner; cabinets and worktop fitted around it');
        if (inp.island && inp.islandLenMm) out.push('free-standing island in the middle of the U');
        var counter = []; if (inp.microFree) counter.push('a black free-standing microwave'); if (inp.coffeeFree) counter.push('a black free-standing coffee machine');
        if (counter.length) out.push('on the worktop, as drawn: ' + counter.join(' and '));
        function colourWords(c) {   // the decor's average colour in plain words + hex, so the colour survives even if the picture is unclear
          if (c === null || c === undefined) return '';
          var r = (c >> 16 & 255) / 255, g = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
          var sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), h = 0;
          if (d) { h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
          var tone = l < .18 ? 'very dark ' : l < .35 ? 'dark ' : l > .85 ? 'very light ' : l > .68 ? 'light ' : '';
          var hue;
          var greyish = sat < .2 && d >= .05 ? 'greyish ' : '';
          if (sat < .05 || d < .035) hue = l < .12 ? 'black' : l > .9 ? 'white' : 'grey';
          else if (h < 15 || h >= 345) hue = 'red'; else if (h < 40) hue = l > .6 ? 'beige' : 'brown'; else if (h < 65) hue = l > .6 ? 'cream' : 'olive yellow';
          else if (h < 160) hue = 'green'; else if (h < 200) hue = 'teal'; else if (h < 245) hue = 'blue'; else if (h < 275) hue = 'indigo'; else if (h < 320) hue = 'purple'; else hue = 'pink';
          if (hue === 'black' || hue === 'white' || hue === 'grey') greyish = '';
          if (hue === 'black' || hue === 'white') tone = '';
          hue = greyish + hue;
          return tone + hue + ' (hex ' + ('00000' + c.toString(16)).slice(-6) + ')';
        }
        function surf(name, field, grain, col) {
          var rec = root.pMaterialSelections && root.pMaterialSelections.get(field); if (!rec) return;
          var gloss = !!(root.pGloss && root.pGloss.has(rec.id)), cw = colourWords(col), code = [rec.manufacturer, rec.decorCode].filter(Boolean).join(' ');
          var kind = rec.category === 'wood' ? 'wood' + (grain ? ', ' + (grain === 'h' ? 'horizontal' : 'vertical') + ' grain, continuous across doors' : '') : rec.category === 'stone' ? 'stone look' : 'plain colour';
          out.push(name + ': ' + (cw ? cw + ', ' : '') + kind + (grain !== undefined ? ', ' + (gloss ? 'HIGH GLOSS' : 'matte') : '') + (code ? ' (' + code + ')' : ''));
        }
        surf('lower fronts', 'lower_finish', inp.gL, inp.cLower); if (inp.anyUpper) surf('upper fronts', 'upper_finish', inp.gU, inp.cUpper);
        if (inp.deep) {
          if (root.pMaterialSelections && root.pMaterialSelections.get('deep_finish')) surf('deep upper row (own colour, different from the row below)', 'deep_finish', inp.gD, inp.cDeep);
          else surf('deep upper row (same decor as the upper fronts)', 'upper_finish', inp.gD, inp.cUpper);
        }
        surf('worktop', 'countertop_finish', undefined, inp.cTop); surf('wall backsplash', 'backsplash_finish', undefined, inp.cBack);
        if (items.some(function (m) { return (m.type === 'fridge' && m.applianceType !== 'free_standing') || ((m.type === 'dishwasher' || m.type === 'washingMachine') && !m.free); })) out.push('BUILT-IN appliances are hidden behind cabinet fronts in the door decor: draw them as plain doors, never as visible appliances');
        out.push('appliance finish: all black (washing machine white)');
        var opts = [];   // one line for the small options, so the key stays within its 18 lines
        if (X.handleless) opts.push('handleless fronts'); if (X.drawers) opts.push('extra drawers on lower storage'); if (X.panel) opts.push('framed panel doors');
        if (X.lift && inp.anyUpper) opts.push('lift-up fronts on the lower upper row'); if (X.light && inp.anyUpper) opts.push('LED strip under the upper cabinets');
        if (opts.length) out.push('options: ' + opts.join(', '));
        if (X.glass) {
          // say exactly which upper cabinet it is (counted from the corner): the glass is hard to see in the sketch against the wall
          var gu = glassPick && upos[glassPick], where = '';
          if (gu) {
            var onWall = Object.keys(upos).filter(function (id) { return upos[id].wall === gu.wall; }).sort(function (a, b) { return upos[a].x - upos[b].x; });
            var nth = onWall.indexOf(glassPick) + 1, ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][nth - 1] || (nth + 'th');
            where = ' (' + WN[gu.wall] + ', ' + ord + ' upper cabinet ' + (gu.wall === 2 ? 'from the left' : 'from the back corner') + ', of ' + onWall.length + ')';
          }
          out.push('glass display cabinet' + where + ': clear glass door, warm LED light inside, glass shelves and neat dishes; all other upper doors solid');   // under the 200-character limit
        }
        return out;
      }
      /* resolves once the chosen decor pictures have loaded (or after 12 s), so the AI picture shows the real colours */
      function whenReady() {
        var t0 = Date.now();
        return new Promise(function (ok) { (function poll() { readInputs(); if (!pendingLoads || Date.now() - t0 > 12000) { inputsSig = ''; try { sync(true); } catch (e) { /* keep */ } ok(); return; } setTimeout(poll, 120); })(); });
      }
      root.pLayout = { refresh: soon, current: root.pLayout.current, capture: capture, sketchLegend: sketchLegend, whenReady: whenReady, debug: function () { return { scene: scene, camera: camera, plan: plan, items: items, order: order }; } };
      soon();
    }).catch(fail);
  }
  function boot() { var t = 0; (function wait() { if (document.querySelector('.sf-page-p .p-sketch-wrap .cad-stage-p') || ++t > 100) { init(); return; } setTimeout(wait, 100); })(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})(typeof window !== 'undefined' ? window : globalThis);
