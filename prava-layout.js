/* Prava straight kitchen: step 1 empty room (measured wall + floor grid), step 2+ generated modular cabinets.
   Everything runs in the browser (three.js, no AI). Cabinets can be dragged and swapped; the run always keeps its exact length.
   The layout engine mirrors kitchen-modular-planner.ts (verde-contract-automation) so the AI step sees the same module widths. */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ layout engine (pure) */
  var MAX_FILLER = 150, MIN_CUSTOM = 150, MAX_CUSTOM = 900, STEP = 50;
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

  function mod(type, w, zone, extra) { var m = { type: type, w: w, zone: zone }; if (extra) for (var k in extra) m[k] = extra[k]; return m; }

  function arrange(place, tall, cooking, water, storage, edge) {
    var a = [], b = [], c = [], buckets = [a, b, c];
    storage.forEach(function (w, i) { buckets[i % 3].push(mod('genericBase', w, 'storage')); });
    if (place === 'left') return [].concat(edge, water, a, cooking, b, tall, c);
    if (place === 'center') return [].concat(tall, a, water, b, cooking, c);
    var sink = water.filter(function (m) { return m.type === 'sinkBase'; });
    var other = water.filter(function (m) { return m.type !== 'sinkBase'; });
    return [].concat(tall, a, cooking, b, c, other, sink, edge);
  }

  /* cfg: lengthMm, heightMm, water, ovenTower, fridge ('built_in'|'free_standing'|null), dishwasherMm, washer, microwave, coffee, basket */
  function planKitchen(cfg) {
    var errors = [], L = Math.round(cfg.lengthMm || 0);
    var res = { lengthMm: L, modules: [], fillerMm: 0, fillerAt: 'none', errors: errors, fixedMm: 0 };
    if (!L) { errors.push('Въведете дължина.'); return res; }
    var tall = [], cooking = [], water = [], edge = [];
    if (cfg.fridge) tall.push(mod('fridge', 600, 'tall', { applianceType: cfg.fridge }));
    if (cfg.ovenTower) {
      var apps = ['oven']; if (cfg.microwave) apps.push('microwave'); if (cfg.coffee) apps.push('coffeeMachine');
      tall.push(mod('ovenTower', 600, 'tall', { appliances: apps }));
      cooking.push(mod('hobBase', 600, 'cooking'));
    } else {
      cooking.push(mod('ovenHobBase', 600, 'cooking', { appliances: ['oven'] }));
      var sec = []; if (cfg.microwave) sec.push('microwave'); if (cfg.coffee) sec.push('coffeeMachine');
      if (sec.length) tall.push(mod('applianceTower', 600, 'tall', { appliances: sec }));
    }
    var place = cfg.water === 'left' || cfg.water === 'right' ? cfg.water : 'center';
    if (place === 'center') { if (cfg.basket) cooking.push(mod('basket', 150, 'cooking')); }
    else edge.push(mod(cfg.basket ? 'basket' : 'edgeFront', 150, 'water'));
    water.push(mod('sinkBase', 600, 'water'));
    if (cfg.dishwasherMm) water.push(mod('dishwasher', cfg.dishwasherMm, 'water'));
    if (cfg.washer) water.push(mod('washingMachine', 600, 'water'));
    var fixed = [].concat(tall, cooking, water, edge).reduce(function (s, m) { return s + m.w; }, 0);
    res.fixedMm = fixed;
    var rem = L - fixed;
    if (rem < 0) { errors.push('Избраните модули изискват ' + fixed + ' мм, а дължината е само ' + L + ' мм (липсват ' + (-rem) + ' мм).'); return res; }
    var sol = chooseStorage(rem);
    if (!sol) { errors.push('Остатъкът от ' + rem + ' мм не може да се разпредели на шкафове; променете дължината.'); return res; }
    var run = arrange(place, tall, cooking, water, sol.widths, edge);
    var cnt = {};
    run.forEach(function (m) { cnt[m.type] = (cnt[m.type] || 0) + 1; m.id = m.type + '#' + (cnt[m.type] - 1); });
    res.modules = run; res.fillerMm = sol.filler; res.fillerAt = sol.filler === 0 ? 'none' : (place === 'right' ? 'left' : 'right');
    return res;
  }

  /* keep the user's manual order across config changes: known ids keep their relative order, new ones keep default slots */
  function applyOrder(plan, order) {
    if (!order || !order.length) return plan.modules;
    var byId = {}; plan.modules.forEach(function (m) { byId[m.id] = m; });
    var kept = order.filter(function (id) { return byId[id]; });
    var keptSet = {}; kept.forEach(function (id) { keptSet[id] = 1; });
    var out = kept.map(function (id) { return byId[id]; });
    plan.modules.forEach(function (m, i) { if (!keptSet[m.id]) out.splice(Math.min(i, out.length), 0, m); });
    return out;
  }

  function position(plan, modules) {
    var x = plan.fillerAt === 'left' ? plan.fillerMm : 0, out = [];
    modules.forEach(function (m) { var c = {}; for (var k in m) c[k] = m[k]; c.x = x; out.push(c); x += m.w; });
    return { items: out, total: x + (plan.fillerAt === 'right' ? plan.fillerMm : 0) };
  }

  function swapIds(order, a, b) { var o = order.slice(), i = o.indexOf(a), j = o.indexOf(b); if (i < 0 || j < 0) return o; var t = o[i]; o[i] = o[j]; o[j] = t; return o; }

  var engine = { chooseStorage: chooseStorage, planKitchen: planKitchen, applyOrder: applyOrder, position: position, swapIds: swapIds, TALL: TALL };
  if (typeof module !== 'undefined' && module.exports) { module.exports = engine; }
  root.PravaLayoutEngine = engine;
  if (typeof document === 'undefined') return;

  /* ------------------------------------------------------------------ viewer */
  var THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js';
  function load(src) { return new Promise(function (ok, no) { var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = function () { no(new Error(src)); }; document.head.appendChild(s); }); }

  function init() {
    var page = document.querySelector('.sf-page-prava'), card = page && page.querySelector('.sticky-cad-wrap'), stage = card && card.querySelector('.cad-stage');
    if (!stage || root.pravaLayout) return;
    var host = document.createElement('div'); host.className = 'prava-3d'; host.hidden = true; stage.appendChild(host);
    var st = document.createElement('style');
    st.textContent = '.sf-page-prava .prava-3d{position:absolute;inset:0;z-index:60;background:#eef0ed;touch-action:none}.sf-page-prava .prava-3d canvas{display:block;width:100%;height:100%;cursor:grab}' +
      '.sf-page-prava .prava-3d-hint{position:absolute;left:10px;bottom:8px;max-width:calc(100% - 20px);font:11px/1.35 sans-serif;color:#606760;background:rgba(255,255,255,.88);padding:4px 9px;border-radius:8px;pointer-events:none}' +
      '.sf-page-prava .prava-3d-msg{position:absolute;left:10px;right:56px;top:10px;font:12px/1.4 sans-serif;color:#7a2d1f;background:#fff1ec;border:1px solid #e6b8ab;padding:8px 10px;border-radius:10px;pointer-events:none}' +
      '.sf-page-prava .prava-3d-btns{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px}' +
      '.sf-page-prava .prava-3d-btns button{width:36px;height:36px;border:1px solid #c8cbc7;border-radius:10px;background:#fff;color:#333533;font:600 17px/1 sans-serif;cursor:pointer;padding:0}' +
      '.sf-page-prava .prava-3d-btns button:hover,.sf-page-prava .prava-3d-btns button[aria-pressed="true"]{background:#e8f0e8;border-color:#477448}' +
      '.sf-page-prava .cad-stage.prava-3d-on .cad-img,.sf-page-prava .cad-stage.prava-3d-on .cad-img-kitchen,.sf-page-prava .cad-stage.prava-3d-on .cad-img-deep_cabinets,.sf-page-prava .cad-stage.prava-3d-on .cad-img-island,.sf-page-prava .cad-stage.prava-3d-on .cad-img-base{visibility:hidden!important}' +
      '.sf-page-prava .cad-stage.prava-3d-on .cad-base,.sf-page-prava .cad-stage.prava-3d-on .cad-kitchen,.sf-page-prava .cad-stage.prava-3d-on .cad-deep_cabinets,.sf-page-prava .cad-stage.prava-3d-on .cad-island{pointer-events:none!important}';
    document.head.appendChild(st);
    var hint = document.createElement('div'); hint.className = 'prava-3d-hint'; host.appendChild(hint);
    var msg = document.createElement('div'); msg.className = 'prava-3d-msg'; msg.hidden = true; host.appendChild(msg);
    var btns = document.createElement('div'); btns.className = 'prava-3d-btns'; host.appendChild(btns);
    function mkBtn(label, title, act) { var b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.title = b.ariaLabel = title; b.dataset.act = act; btns.appendChild(b); return b; }
    mkBtn('+', 'Приближи', 'in'); mkBtn('−', 'Отдалечи', 'out'); mkBtn('⟲', 'Начален изглед', 'reset');
    var modeBtn = mkBtn('✥', 'Режим: местене на шкафове / въртене на изгледа', 'mode');
    var autoBtn = mkBtn('↺', 'Автоматично подреждане', 'auto');

    var T, renderer, scene, camera, controls, ray, mouse, roomGroup, cabGroup, labelGroup, dropMark;
    var failed = false, moveMode = true, dirty = false, order = [], items = [], plan = null, inputsSig = '', fitSig = '';
    var mats = {}, drag = null, view = { dist: 0 };

    /* ---------------- inputs from the page */
    function q(sel) { return page.querySelector(sel); }
    function pill(field) { var e = q('[data-field="' + field + '"] .option-pill.active,[data-field="' + field + '"] .option-pill.is-selected'); return e ? String(e.dataset.value || '') : ''; }
    function dimMm(key) {
      var row = q('.dimension-row[data-dim="' + key + '"]'); if (!row) return 0;
      function n(sel) { var el = row.querySelector(sel + ' .picker-value-text') || row.querySelector(sel + ' .picker-value'); return parseInt((el && el.textContent) || '0', 10) || 0; }
      return (n('.meters-control') * 100 + n('.centimeters-control')) * 10;
    }
    function fieldVal(name) { var e = q('[name="' + name + '"]'); return e ? String(e.value || '') : ''; }
    function readInputs() {
      var fr = pill('fridge_type'), fridge = null;
      if (/вграден/i.test(fr) && !/свободно/i.test(fr)) fridge = 'built_in'; else if (/свободно/i.test(fr)) fridge = 'free_standing';
      var dw = fieldVal('dishwasher_type').match(/(45|60)$/), step = Number(page.dataset.pravaStep || 1);
      return {
        lengthMm: dimMm('len_prava_3'), heightMm: dimMm('height_prava_3') || 2600,
        water: pill('water_position_prava') || 'center', ovenTower: pill('oven_tall_unit') === 'yes', fridge: fridge,
        deep: pill('deep_cabinets') === 'yes', island: pill('island') === 'yes', islandLenMm: dimMm('island_len_3a'), islandWidthMm: dimMm('island_width_3a'),
        dishwasherMm: dw ? Number(dw[1]) * 10 : 0, washer: !!fieldVal('washing_machine_type'),
        microwave: /built_in/.test(fieldVal('microwave_type')), coffee: /built_in/.test(fieldVal('coffee_machine_type')),
        showCabinets: step >= 2
      };
    }

    /* ---------------- materials / helpers */
    function setupMats() {
      var M = function (c, r, m) { return new T.MeshStandardMaterial({ color: c, roughness: r === undefined ? .6 : r, metalness: m || 0 }); };
      mats = { front: M(0xf2f0ea, .5), frontAlt: M(0xe7e4dc, .55), carcass: M(0xdcd9d1, .8), plinth: M(0x2f3133, .8), top: M(0xc9ae86, .55), steel: M(0xbfc4c8, .35, .7),
        glass: M(0x121518, .15, .3), hob: M(0x0e1012, .2, .2), ring: M(0x6b7075, .4, .5), wall: M(0xf6f5f1, 1), floor: M(0xdad8d2, .95), side: M(0xeceae4, 1),
        upper: M(0xf2f0ea, .5), deep: M(0xe9e6de, .5), island: M(0xe5dfd2, .6), sink: M(0x9aa1a6, .3, .8), highlight: new T.MeshBasicMaterial({ color: 0x477448, transparent: true, opacity: .35 }) };
    }
    function box(w, h, d, mat, x, y, z, parent) { var m = new T.Mesh(new T.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if (parent) parent.add(m); return m; }
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
    var D = 0.6, PL = 0.1, BH = 0.9, WT = 0.038, G = 0.004, FT = 0.018;
    function handleH(g, x, y, len) { box(len, 0.012, 0.014, mats.steel, x, y, D + FT + 0.007, g); }
    function handleV(g, x, y, len) { box(0.012, len, 0.014, mats.steel, x, y, D + FT + 0.007, g); }
    function front(g, w, y0, y1, mat, x) { var h = y1 - y0 - G; box(w - G, h, FT, mat || mats.front, x || 0, y0 + h / 2 + G / 2, D + FT / 2, g); return h; }
    function doors(g, w, y0, y1, n) {
      var dw = w / n; for (var i = 0; i < n; i++) { var cx = -w / 2 + dw * (i + .5); front(g, dw, y0, y1, mats.front, cx); handleV(g, cx + (n === 2 ? (i === 0 ? dw / 2 - .035 : -dw / 2 + .035) : dw / 2 - .035), (y0 + y1) / 2 + (y1 - y0) * .32, .16); }
    }
    function drawers(g, w, y0, y1, heights) {
      var tot = heights.reduce(function (a, b) { return a + b; }, 0), y = y1;
      heights.forEach(function (hh) { var h = (y1 - y0) * hh / tot; front(g, w, y - h, y, mats.front, 0); handleH(g, 0, y - 0.04, Math.min(w * .6, .3)); y -= h; });
    }
    function hobPlate(g, w) {
      var pw = Math.min(w - .06, .58); box(pw, 0.006, .5, mats.hob, 0, BH + 0.003, .31, g);
      var r = [[-.14, .2], [.14, .2], [-.14, .42], [.14, .42]], rad = [.075, .06, .055, .075];
      r.forEach(function (p, i) { var ring = new T.Mesh(new T.RingGeometry(rad[i] * .78, rad[i], 28), mats.ring); ring.rotation.x = -Math.PI / 2; ring.position.set(p[0] * (pw / .58), BH + 0.0065, p[1] + .1); g.add(ring); });
    }
    function ovenFront(g, w, y0, y1) {
      front(g, w, y0, y1, mats.front, 0); var h = y1 - y0;
      box(w - .1, h - .13, 0.006, mats.glass, 0, (y0 + y1) / 2 - .02, D + FT + .003, g);
      handleH(g, 0, y1 - .045, w - .14);
      for (var i = 0; i < 3; i++) { var kn = new T.Mesh(new T.CylinderGeometry(.012, .012, .01, 16), mats.steel); kn.rotation.x = Math.PI / 2; kn.position.set(-.12 + i * .12, y1 - .02, D + FT + .005); g.add(kn); }
    }
    function microFront(g, w, y0, y1) { front(g, w, y0, y1, mats.glass, 0); box(w - .2, y1 - y0 - .1, .004, mats.steel, -.04, (y0 + y1) / 2, D + FT + .002, g); }
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

    function buildBase(m, w) {
      var g = new T.Group(), y0 = PL, y1 = BH - WT, W = w;
      box(W - 0.002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g);
      box(W - 0.002, y1 - y0, D - .01, mats.carcass, 0, (y0 + y1) / 2, (D - .01) / 2, g);
      switch (m.type) {
        case 'sinkBase': doors(g, W, y0, y1, W >= .55 ? 2 : 1); break;
        case 'ovenHobBase': drawers(g, W, y1 - .16, y1, [1]); ovenFront(g, W, y0 + .14, y1 - .16 + 0); front(g, W, y0, y0 + .14, mats.front, 0); handleH(g, 0, y0 + .1, W * .5); break;
        case 'hobBase': drawers(g, W, y0, y1, [1, 1, 1.6]); break;
        case 'dishwasher': front(g, W, y0, y1, mats.front, 0); box(W - .06, .02, .006, mats.glass, 0, y1 - .04, D + FT + .003, g); handleH(g, 0, y1 - .09, Math.min(W * .7, .4)); break;
        case 'washingMachine': porthole(g, W, y0, y1); break;
        case 'basket': drawers(g, W, y0, y1, [1, 1, 1, 1]); break;
        case 'edgeFront': front(g, W, y0, y1, mats.frontAlt, 0); break;
        default: if (W >= .7) doors(g, W, y0, y1, 2); else if (m.idx % 2) drawers(g, W, y0, y1, [1, 1, 1.5]); else doors(g, W, y0, y1, 1);
      }
      if (m.type === 'ovenHobBase' || m.type === 'hobBase') hobPlate(g, W);
      if (m.type === 'sinkBase') sinkTop(g, W);
      return g;
    }
    function buildTall(m, w) {
      var g = new T.Group(), H = 2.4, W = w;
      if (m.type === 'fridge') {
        if (m.applianceType === 'free_standing') {
          box(W - .01, 1.9, D + .02, mats.steel, 0, .95, (D + .02) / 2, g);
          front(g, W - .01, 1.2, 1.9, mats.steel, 0); front(g, W - .01, .02, 1.2, mats.steel, 0);
          box(.014, .5, .02, mats.sink, W / 2 - .05, 1.55, D + .03, g); box(.014, .5, .02, mats.sink, W / 2 - .05, .85, D + .03, g);
          box(W - .002, H - 1.9, D - .01, mats.carcass, 0, 1.9 + (H - 1.9) / 2, (D - .01) / 2, g); front(g, W, 1.9, H, mats.front, 0); handleH(g, 0, 1.94, W * .5);
        } else {
          box(W - .002, PL, D - .06, mats.plinth, 0, PL / 2, (D - .06) / 2 + .03, g); box(W - .002, H - PL, D - .01, mats.carcass, 0, PL + (H - PL) / 2, (D - .01) / 2, g);
          front(g, W, PL, 0.95, mats.front, 0); front(g, W, .95, 2.1, mats.front, 0); front(g, W, 2.1, H, mats.front, 0);
          handleV(g, W / 2 - .04, .95 + .1, .5); handleV(g, W / 2 - .04, .95 - .1, .5);
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
    function buildUpper(w, bottom, h, depth, mat) {
      var g = new T.Group(); box(w - .002, h, depth, mat, 0, bottom + h / 2, depth / 2, g);
      var n = w >= .7 ? 2 : 1, dw = w / n;
      for (var i = 0; i < n; i++) { var cx = -w / 2 + dw * (i + .5); box(dw - G, h - G, FT, mat, cx, bottom + h / 2, depth + FT / 2, g); box(.012, .14, .014, mats.steel, cx + (n === 2 ? (i === 0 ? dw / 2 - .035 : -dw / 2 + .035) : dw / 2 - .035), bottom + .12, depth + FT + .007, g); }
      return g;
    }

    /* ---------------- room */
    function buildRoom(inp) {
      while (roomGroup.children.length) roomGroup.remove(roomGroup.children[0]);
      var L = (inp.lengthMm || 3000) / 1000, H = (inp.heightMm || 2600) / 1000, Dp = 3.4;
      var floor = new T.Mesh(new T.PlaneGeometry(L + 1.0, Dp + .5), mats.floor); floor.rotation.x = -Math.PI / 2; floor.position.set(L / 2, -.001, Dp / 2 - .25); floor.receiveShadow = true; roomGroup.add(floor);
      var pts = [], x;
      for (x = 0; x <= L + 1e-6; x += .5) { pts.push(x, 0, 0, x, 0, Dp); }
      for (var z = 0; z <= Dp + 1e-6; z += .5) { pts.push(0, 0, z, L, 0, z); }
      var gm = new T.BufferGeometry(); gm.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      var lines = new T.LineSegments(gm, new T.LineBasicMaterial({ color: 0xb9b6ae, transparent: true, opacity: .8 })); lines.position.y = .001; roomGroup.add(lines);
      var pm = []; for (x = 0; x <= L + 1e-6; x += 1) pm.push(x, 0, 0, x, 0, Dp); for (z = 0; z <= Dp + 1e-6; z += 1) pm.push(0, 0, z, L, 0, z);
      var gm2 = new T.BufferGeometry(); gm2.setAttribute('position', new T.Float32BufferAttribute(pm, 3));
      var lines2 = new T.LineSegments(gm2, new T.LineBasicMaterial({ color: 0x8e8b82 })); lines2.position.y = .002; roomGroup.add(lines2);
      var wall = new T.Mesh(new T.PlaneGeometry(L, H), mats.wall); wall.position.set(L / 2, H / 2, -.001); wall.receiveShadow = true; roomGroup.add(wall);
      [0, L].forEach(function (sx, i) { var sw = new T.Mesh(new T.PlaneGeometry(Dp, H), mats.side); sw.rotation.y = i ? -Math.PI / 2 : Math.PI / 2; sw.position.set(sx, H / 2, Dp / 2); sw.material.side = T.DoubleSide; roomGroup.add(sw); });
      var edge = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(L, H, Dp)), new T.LineBasicMaterial({ color: 0x9aa09a })); edge.position.set(L / 2, H / 2, Dp / 2); roomGroup.add(edge);
      // dimension lines: length along the floor, height on the left wall edge
      var dl = new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, Dp - .1), new T.Vector3(L, 0, Dp - .1), new T.Vector3(0, 0, Dp - .17), new T.Vector3(0, 0, Dp - .03), new T.Vector3(L, 0, Dp - .17), new T.Vector3(L, 0, Dp - .03)]), new T.LineBasicMaterial({ color: 0x477448 })); dl.position.y = .004; roomGroup.add(dl);
      var lt = label(fmt(inp.lengthMm || 3000), .2, '#2f4a30', 'rgba(255,255,255,.85)'); lt.position.set(L / 2, .12, Dp - .1); roomGroup.add(lt);
      var ht = label(fmt(inp.heightMm || 2600), .2, '#2f4a30', 'rgba(255,255,255,.85)'); ht.position.set(.0, H / 2, .1); roomGroup.add(ht);
      var hl = new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(.02, 0, .02), new T.Vector3(.02, H, .02)]), new T.LineBasicMaterial({ color: 0x477448 })); roomGroup.add(hl);
      if (inp.island && inp.islandLenMm && inp.islandWidthMm) {
        var il = inp.islandLenMm / 1000, iw = inp.islandWidthMm / 1000, cx = L / 2, cz = 1.6 + iw / 2;
        var ig = new T.Group(); box(il, BH - WT - .1, iw, mats.island, 0, .1 + (BH - WT - .1) / 2, 0, ig); box(il - .01, .1, iw - .06, mats.plinth, 0, .05, 0, ig); box(il + .04, WT, iw + .04, mats.top, 0, BH - WT / 2, 0, ig);
        ig.position.set(cx, 0, cz); roomGroup.add(ig);
        var it = label('остров ' + fmt(inp.islandLenMm) + ' × ' + fmt(inp.islandWidthMm), .16, '#4a4132', 'rgba(255,255,255,.85)'); it.position.set(cx, BH + .18, cz); roomGroup.add(it);
      }
    }

    /* ---------------- cabinets */
    var meshById = {};
    function buildCabinets(inp) {
      while (cabGroup.children.length) cabGroup.remove(cabGroup.children[0]);
      while (labelGroup.children.length) labelGroup.remove(labelGroup.children[0]);
      meshById = {}; msg.hidden = true; items = [];
      if (!inp.showCabinets) return;
      plan = planKitchen({ lengthMm: inp.lengthMm, water: inp.water, ovenTower: inp.ovenTower, fridge: inp.fridge, dishwasherMm: inp.dishwasherMm, washer: inp.washer, microwave: inp.microwave, coffee: inp.coffee });
      if (plan.errors.length) { msg.textContent = plan.errors[0]; msg.hidden = false; return; }
      var ordered = applyOrder(plan, dirty ? order : null); order = ordered.map(function (m) { return m.id; });
      ordered.forEach(function (m, i) { m.idx = i; });
      var pos = position(plan, ordered); items = pos.items;
      var runs = [], cur = null;
      items.forEach(function (m) {
        var w = m.w / 1000, cx = (m.x + m.w / 2) / 1000, g = TALL[m.type] ? buildTall(m, w) : buildBase(m, w);
        g.position.x = cx; g.userData = { id: m.id, targetX: cx, w: w, type: m.type }; cabGroup.add(g); meshById[m.id] = g;
        var lb = label(String(m.w / 10), .12, '#3b423b', 'rgba(255,255,255,.78)'); lb.position.set(cx, .02, D + .22); lb.userData.follow = m.id; labelGroup.add(lb);
        if (inp.showCabinets && !TALL[m.type]) { if (!cur) { cur = { x0: m.x, x1: m.x + m.w }; runs.push(cur); } else cur.x1 = m.x + m.w; } else cur = null;
        if (!TALL[m.type]) {
          var up = buildUpper(w, 1.45, .72, .35, mats.upper); up.position.x = cx; up.userData = { id: m.id, upper: true, targetX: cx }; cabGroup.add(up); meshById[m.id + ':u'] = up;
          if (inp.deep) { var dp = buildUpper(w, 2.17, .33, D, mats.deep); dp.position.x = cx; dp.userData = { id: m.id, upper: true, targetX: cx }; cabGroup.add(dp); meshById[m.id + ':d'] = dp; }
        }
      });
      // filler panel (fixed, not draggable)
      if (plan.fillerMm) {
        var fx = plan.fillerAt === 'left' ? plan.fillerMm / 2 : (pos.total - plan.fillerMm / 2); var fw = plan.fillerMm / 1000, fg = new T.Group();
        box(fw, BH - PL, D - .02, mats.frontAlt, 0, PL + (BH - PL) / 2, (D - .02) / 2, fg); fg.position.x = fx / 1000; fg.userData = { filler: true }; cabGroup.add(fg);
      }
      // worktop slabs over each consecutive base run (filler included)
      var allBase = []; var xs = items.filter(function (m) { return !TALL[m.type]; }).map(function (m) { return [m.x, m.x + m.w]; });
      var segs = []; items.forEach(function (m) { if (TALL[m.type]) { segs.push(null); } else { if (!segs.length || segs[segs.length - 1] === null) segs.push([m.x, m.x + m.w]); else segs[segs.length - 1][1] = m.x + m.w; } });
      segs.filter(Boolean).forEach(function (s) {
        var a = s[0], b = s[1]; if (plan.fillerMm && plan.fillerAt === 'left' && a === plan.fillerMm) a = 0; if (plan.fillerMm && plan.fillerAt === 'right' && Math.abs(b - (pos.total - plan.fillerMm)) < 1) b = pos.total;
        var top = new T.Group(); box((b - a) / 1000, WT, D + .02, mats.top, (a + b) / 2000, BH - WT / 2, (D + .02) / 2, top); top.userData = { top: true }; cabGroup.add(top);
      });
      // expose layout for the form / AI step
      var json = JSON.stringify({ lengthMm: plan.lengthMm, fillerMm: plan.fillerMm, fillerAt: plan.fillerAt, modules: items.map(function (m) { return { id: m.id, type: m.type, widthMm: m.w, xMm: m.x }; }) });
      var inp2 = q('input[name="kitchen_layout"]'); if (!inp2) { var f = q('form'); if (f) { inp2 = document.createElement('input'); inp2.type = 'hidden'; inp2.name = 'kitchen_layout'; f.appendChild(inp2); } }
      if (inp2) inp2.value = json;
      root.pravaLayout.current = JSON.parse(json);
    }

    /* ---------------- camera fit + sync */
    var home = { pos: null, target: null };
    function fit(inp) {
      var L = (inp.lengthMm || 3000) / 1000, H = (inp.heightMm || 2600) / 1000;
      var dist = Math.max(L * 0.95, 3.2) + 1.8;
      home.target = new T.Vector3(L / 2, Math.min(H * .38, 1.0), .5); home.pos = new T.Vector3(L / 2 + L * .18, Math.max(1.8, H * .75), .5 + dist);
      camera.position.copy(home.pos); controls.target.copy(home.target); controls.maxDistance = dist * 2.2; controls.minDistance = 1.2; controls.update();
    }
    function sync(force) {
      if (failed || !renderer) return;
      var inp = readInputs(), sig = JSON.stringify(inp);
      var show = card.dataset.previewState === 'planner';
      host.hidden = !show; stage.classList.toggle('prava-3d-on', show);
      if (!show) return;
      if (sig === inputsSig && !force) return;
      var prev = inputsSig ? JSON.parse(inputsSig) : null; inputsSig = sig;
      if (prev && prev.water !== inp.water) { dirty = false; }   // an explicit water-position choice re-flows the run
      resize(); buildRoom(inp); buildCabinets(inp);
      var fs = (inp.lengthMm || 0) + '|' + (inp.heightMm || 0);
      if (fs !== fitSig) { fitSig = fs; fit(inp); }
      hint.textContent = inp.showCabinets ? (moveMode ? 'Хванете шкаф и го пуснете върху друг, за да си разменят местата. Влачете празно място за въртене.' : 'Завъртане: влачете · Мащаб: колелце/щипване') : 'Въведете размерите — виждате голото помещение с мерна решетка (всеки квадрат е 50 см).';
      modeBtn.hidden = autoBtn.hidden = !inp.showCabinets; modeBtn.setAttribute('aria-pressed', String(moveMode));
    }

    /* ---------------- drag & drop */
    function ndc(ev) { var r = renderer.domElement.getBoundingClientRect(); mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); }
    function pickModule(ev) {
      ndc(ev); var objs = []; Object.keys(meshById).forEach(function (k) { objs.push(meshById[k]); });
      var hit = ray.intersectObjects(objs, true)[0]; if (!hit) return null;
      var o = hit.object; while (o && !(o.userData && o.userData.id)) o = o.parent; return o ? o.userData.id : null;
    }
    function groundX(ev) { ndc(ev); var plane = new T.Plane(new T.Vector3(0, 1, 0), -0.45), p = new T.Vector3(); return ray.ray.intersectPlane(plane, p) ? p.x : null; }
    function onDown(ev) {
      if (!moveMode || !items.length || ev.button > 0) return;
      var id = pickModule(ev); if (!id) return;
      var gx = groundX(ev); if (gx === null) return;
      var m = meshById[id]; drag = { id: id, off: gx - m.position.x, moved: false, target: null }; controls.enabled = false; renderer.domElement.setPointerCapture(ev.pointerId); renderer.domElement.style.cursor = 'grabbing';
    }
    function setLift(id, on) { [id, id + ':u', id + ':d'].forEach(function (k) { var g = meshById[k]; if (g) { g.position.z = on ? .08 : 0; } }); }
    function onMove(ev) {
      if (!drag) return;
      var gx = groundX(ev); if (gx === null) return; drag.moved = true;
      var cx = Math.max(0, Math.min(plan.lengthMm / 1000, gx - drag.off));
      [drag.id, drag.id + ':u', drag.id + ':d'].forEach(function (k) { var g = meshById[k]; if (g) { g.position.x = cx; g.userData.targetX = cx; } });
      setLift(drag.id, true);
      var best = null, bd = 1e9; items.forEach(function (m) { if (m.id === drag.id) return; var c = (m.x + m.w / 2) / 1000, d = Math.abs(c - cx); if (d < bd) { bd = d; best = m; } });
      drag.target = best && bd < Math.max(best.w / 1000, .45) ? best.id : null;
      if (dropMark) { dropMark.visible = !!drag.target; if (drag.target) { var tm = items.filter(function (m) { return m.id === drag.target; })[0]; dropMark.scale.set(tm.w / 1000, 1, 1); dropMark.position.set((tm.x + tm.w / 2) / 1000, .0, D / 2); } }
    }
    function onUp(ev) {
      if (!drag) return; var d = drag; drag = null; controls.enabled = true; renderer.domElement.style.cursor = ''; if (dropMark) dropMark.visible = false;
      try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) {}
      if (d.moved && d.target) { order = swapIds(order, d.id, d.target); dirty = true; }
      setLift(d.id, false); sync(true); inputsSig = ''; sync(true);
    }

    /* ---------------- scene setup */
    function setup() {
      T = root.THREE; renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFSoftShadowMap;
      host.insertBefore(renderer.domElement, hint); scene = new T.Scene(); scene.background = new T.Color(0xeef0ed);
      camera = new T.PerspectiveCamera(42, 1, .05, 80); ray = new T.Raycaster(); mouse = new T.Vector2(); setupMats();
      scene.add(new T.HemisphereLight(0xffffff, 0xb6b2a8, .95));
      var sun = new T.DirectionalLight(0xffffff, .75); sun.position.set(3, 6, 5); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -3; sun.shadow.bias = -.0004; scene.add(sun);
      roomGroup = new T.Group(); cabGroup = new T.Group(); labelGroup = new T.Group(); scene.add(roomGroup, cabGroup, labelGroup);
      dropMark = new T.Mesh(new T.PlaneGeometry(1, 1.1), mats.highlight); dropMark.rotation.x = -Math.PI / 2; dropMark.visible = false; dropMark.position.y = .01; scene.add(dropMark);
      controls = new T.OrbitControls(camera, renderer.domElement); controls.enablePan = false; controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .5; controls.minAzimuthAngle = -Math.PI * .45; controls.maxAzimuthAngle = Math.PI * .45;
      var el = renderer.domElement; el.addEventListener('pointerdown', onDown, true); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onUp);
      new ResizeObserver(resize).observe(host);
      (function loop() {
        requestAnimationFrame(loop); if (host.hidden) return;
        cabGroup.children.forEach(function (g) { var u = g.userData; if (u && u.targetX !== undefined && !(drag && drag.id === u.id)) g.position.x += (u.targetX - g.position.x) * .25; });
        labelGroup.children.forEach(function (s) { var g = meshById[s.userData.follow]; if (g) s.position.x = g.position.x; });
        controls.update(); renderer.render(scene, camera);
      })();
    }
    function resize() { if (!renderer) return; var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    btns.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b || !controls) return; var a = b.dataset.act;
      if (a === 'reset') { camera.position.copy(home.pos); controls.target.copy(home.target); }
      else if (a === 'in' || a === 'out') { var v = camera.position.clone().sub(controls.target).multiplyScalar(a === 'in' ? .8 : 1.25); var len = Math.max(controls.minDistance, Math.min(controls.maxDistance, v.length())); v.setLength(len); camera.position.copy(controls.target).add(v); }
      else if (a === 'mode') { moveMode = !moveMode; sync(true); inputsSig = ''; sync(true); }
      else if (a === 'auto') { dirty = false; order = []; inputsSig = ''; sync(true); }
      controls.update();
    });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (t) { btns.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    function fail() { failed = true; host.hidden = true; stage.classList.remove('prava-3d-on'); }

    var raf = 0; function soon() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(false); }); }
    Promise.resolve(root.THREE || load(THREE_URL)).then(function () { return root.THREE.OrbitControls || load(ORBIT_URL); }).then(function () {
      setup();
      new MutationObserver(soon).observe(page, { subtree: true, attributes: true, characterData: true, childList: true, attributeFilter: ['class', 'data-prava-step', 'data-preview-state', 'value'] });
      page.addEventListener('click', function () { setTimeout(soon, 100); }); page.addEventListener('change', soon); page.addEventListener('prava:phase-changed', function () { inputsSig = ''; soon(); });
      root.pravaLayout = { refresh: soon, current: null, debug: function () { return { scene: scene, camera: camera, plan: plan, items: items, order: order }; } };
      soon();
    }).catch(fail);
    root.pravaLayout = root.pravaLayout || { refresh: function () {}, current: null };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(typeof window !== 'undefined' ? window : globalThis);
