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
    var ROT_CUR = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="5"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/></g><g stroke="#222" stroke-width="2.2"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3v5h-5"/></g></svg>') + '") 14 14, alias';   // rotate cursor
    var st = document.createElement('style');
    st.textContent = '.sf-page-prava .prava-3d{position:absolute;inset:0;z-index:60;background:#eef0ed;touch-action:none}.sf-page-prava .prava-3d canvas{display:block;width:100%;height:100%;cursor:' + ROT_CUR + '}.sf-page-prava .prava-3d[data-mode=move] canvas{cursor:move}.sf-page-prava .prava-3d[data-mode=pan] canvas{cursor:grab}.sf-page-prava .prava-3d[data-mode=pan] canvas:active{cursor:grabbing}' +
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
    var rotBtn = mkBtn('⟳', 'Въртане на изгледа (Orbit): влачете за завъртане', 'rotate');
    var modeBtn = mkBtn('✥', 'Местене на шкафове: хванете шкаф и го пуснете върху друг', 'mode');
    var panBtn = mkBtn('✋', 'Преместване на изгледа (Pan): влачете наляво/надясно и нагоре/надолу. Десен бутон или Shift + влачене също местят изгледа.', 'pan');
    var autoBtn = mkBtn('↺', 'Автоматично подреждане', 'auto');

    var T, renderer, scene, camera, controls, ray, mouse, roomGroup, cabGroup, labelGroup, dropMark;
    var failed = false, moveMode = false, panMode = false, bounds = { x: 4, y: 2.6, z: 4 }, hl = { key: null, saved: [] }, dirty = false, uorder = null, dorder = null, upos = {}, dpos = {}, uRunIds = [], dRunIds = [], curDeep = false, order = [], items = [], plan = null, inputsSig = '', fitSig = '';
    var mats = {}, drag = null, view = { dist: 0 };

    /* ---------------- inputs from the page */
    function q(sel) { return page.querySelector(sel); }
    function pill(field) { var e = q('[data-field="' + field + '"] .option-pill.active,[data-field="' + field + '"] .option-pill.is-selected'); return e ? String(e.dataset.value || '') : ''; }
    function dimMm(key) {
      var row = q('.dimension-row[data-dim="' + key + '"]'); if (!row) return 0;
      function n(sel) { var el = row.querySelector(sel + ' .picker-value-text') || row.querySelector(sel + ' .picker-value'); return parseInt((el && el.textContent) || '0', 10) || 0; }
      return (n('.meters-control') * 100 + n('.centimeters-control')) * 10;
    }
    function chk(name) { var e = q('input[name="' + name + '"]'); return !!(e && e.checked); }
    function fieldVal(name) { var e = q('[name="' + name + '"]'); return e ? String(e.value || '') : ''; }
    /* ---------------- material colours (steps 3-6) */
    var catalog = null, colCache = {}, toneCache = {}, texCache = {}, texMat = {}, texN = 0;
    function catalogMap() {
      if (catalog) return catalog; catalog = {};
      page.querySelectorAll('script[data-prava-catalog]').forEach(function (s) {
        try { var j = JSON.parse(s.textContent), w = s.closest('[data-field]'), f = w && w.dataset.field; if (!f) return; var m = catalog[f] = {}; j.items.forEach(function (r) { m[r[0]] = j.base ? j.base + encodeURIComponent(r[5]) : r[4]; }); } catch (e) { /* ignore */ }
      });
      return catalog;
    }
    function colourOf(field) {
      var id = fieldVal(field); if (!id) return null;
      var u = (catalogMap()[field] || {})[id]; if (!u) return null;
      u = u.replace('https://s3.amazonaws.com/webflow-prod-assets/', 'https://cdn.prod.website-files.com/');
      if (colCache[u] !== undefined) return colCache[u];
      colCache[u] = null;
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = c.height = 8; var g = c.getContext('2d'); g.drawImage(im, 0, 0, 8, 8);
          var d = g.getImageData(0, 0, 8, 8).data, r = 0, gg = 0, b = 0, n = 0;
          for (var i = 0; i < d.length; i += 4) { if (d[i + 3] < 40) continue; r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
          if (im.naturalWidth >= 64 && im.naturalHeight >= 64) { var tx = new T.Texture(im); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.anisotropy = 4; tx.needsUpdate = true; texCache[u] = tx; }   // real decor image (solids are only 16x16 swatches: flat colour is exact)
          if (n) { colCache[u] = (r / n << 16) | (gg / n << 8) | (b / n); sync(true); }
        } catch (e) { /* tainted canvas: keep default colour */ }
      };
      im.src = u; return null;
    }
    function decorUrl(field) { var id = fieldVal(field); if (!id) return null; var u = (catalogMap()[field] || {})[id]; return u ? u.replace('https://s3.amazonaws.com/webflow-prod-assets/', 'https://cdn.prod.website-files.com/') : null; }
    /* finish material: true decor texture when the image is a real texture, otherwise the averaged colour */
    function fin(field, hex, shift, rough) {
      var u = decorUrl(field), tx = u && texCache[u];
      if (!tx) return tone(hex, shift, rough);
      var k = u + '|' + (rough || 0); if (!texMat[k]) { texMat[k] = new T.MeshStandardMaterial({ map: tx, color: 0xffffff, roughness: rough === undefined ? .5 : rough, metalness: 0 }); texMat[k].userData.tile = .6; }
      return texMat[k];
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
      var fr = pill('fridge_type'), fridge = null;
      if (/вграден/i.test(fr) && !/свободно/i.test(fr)) fridge = 'built_in'; else if (/свободно/i.test(fr)) fridge = 'free_standing';
      var dw = fieldVal('dishwasher_type').match(/(45|60)$/), step = Number(page.dataset.pravaStep || 1);
      return {
        lengthMm: dimMm('len_prava_3'), heightMm: dimMm('height_prava_3') || 2600,
        water: pill('water_position_prava') || 'center', ovenTower: pill('oven_tall_unit') === 'yes', fridge: fridge,
        deep: pill('deep_cabinets') === 'yes', island: pill('island') === 'yes', islandLenMm: dimMm('island_len_3a'), islandWidthMm: dimMm('island_width_3a'),
        dishwasherMm: dw ? Number(dw[1]) * 10 : 0, washer: !!fieldVal('washing_machine_type'),
        microwave: /built_in/.test(fieldVal('microwave_type')), coffee: /built_in/.test(fieldVal('coffee_machine_type')),
        dishFree: /^free/.test(fieldVal('dishwasher_type')), washFree: fieldVal('washing_machine_type') === 'free_standing',
        microFree: fieldVal('microwave_type') === 'free_standing', coffeeFree: fieldVal('coffee_machine_type') === 'free_standing',
        x: { handleless: chk('handleless'), drawers: chk('more_drawers'), glass: chk('glass_display'), lift: chk('lift_mechanisms'), panel: chk('panel_doors'), light: chk('counter_lighting'), bottle: chk('bottle_rack') },
        showCabinets: step >= 2,
        cUpper: colourOf('upper_finish'), cLower: colourOf('lower_finish'), cTop: colourOf('countertop_finish'), cBack: colourOf('backsplash_finish')
      };
    }

    /* ---------------- materials / helpers */
    function setupMats() {
      var M = function (c, r, m) { return new T.MeshStandardMaterial({ color: c, roughness: r === undefined ? .6 : r, metalness: m || 0 }); };
      mats = { front: M(0xf4f0e6, .5), frontA: M(0xf4f0e6, .5), frontB: M(0xd9cfba, .5), frontAlt: M(0xcfc6b2, .55), carcass: M(0xb9b3a6, .8), plinth: M(0x2f3133, .8), top: M(0xa5875c, .5), steel: M(0xbfc4c8, .35, .7),
        glass: M(0x121518, .15, .3), hob: M(0x0e1012, .2, .2), ring: M(0x6b7075, .4, .5), wall: M(0xe1e5dd, 1), floor: M(0xcbc3b3, .95), side: M(0xd2d6cd, 1),
        upper: M(0xf4f0e6, .5), deep: M(0xd9cfba, .5), island: M(0xe5dfd2, .6), sink: M(0x9aa1a6, .3, .8), appl: M(0xe8ebed, .4, .15), highlight: new T.MeshBasicMaterial({ color: 0x477448, transparent: true, opacity: .35, side: T.DoubleSide }) };
      mats.glassFront = new T.MeshStandardMaterial({ color: 0xcfe3e6, roughness: .1, metalness: .1, transparent: true, opacity: .32 }); mats.glow = new T.MeshBasicMaterial({ color: 0xffe8b0 }); mats.led = new T.MeshBasicMaterial({ color: 0xfff1c2 });
      mats.topDefault = mats.top; mats.islandDefault = mats.island;
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
    var TALLH = 2.4, D = 0.6, PL = 0.1, BH = 0.9, WT = 0.038, G = 0.004, FT = 0.018;
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
        case 'sinkBase': doors(g, W, y0, y1, W > .601 ? 2 : 1); break;
        case 'ovenHobBase': ovenFront(g, W, y1 - .6, y1); front(g, W, y0, y1 - .6, mats.front, 0); handleH(g, 0, y1 - .6 - .04, W * .5); break;   // 60 cm oven flush with the worktop, one drawer below   // oven + drawer below it
        case 'hobBase': drawers(g, W, y0, y1, [1, 1, 1.6]); break;
        case 'dishwasher': if (m.free) break; front(g, W, y0, y1, mats.front, 0); box(W - .06, .02, .006, mats.glass, 0, y1 - .04, D + FT + .003, g); handleH(g, 0, y1 - .09, Math.min(W * .7, .4)); break;
        case 'washingMachine': if (m.free) break; porthole(g, W, y0, y1); break;
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
    /* top edge of the upper run (and of the deep row, when chosen) is flush with the tall columns */
    function upperSpec(deep) { return deep ? { ub: 1.45, uh: TALLH - .33 - 1.45, db: TALLH - .33, dh: .33 } : { ub: 1.55, uh: TALLH - 1.55 }; }
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
        if (!X.handleless) box(Math.min(.2, dw * .55), .012, .014, mats.steel, cx, bottom + .06, depth + FT + .007, g);
      }
      if (X.light && !opt.deep) box(w - .04, .012, .03, mats.led, 0, bottom - .006, depth - .05, g);       // LED strip under uppers
      return g;
    }

    /* ---------------- room */
    function buildRoom(inp) {
      while (roomGroup.children.length) roomGroup.remove(roomGroup.children[0]);
      var L = (inp.lengthMm || 3000) / 1000, H = (inp.heightMm || 2600) / 1000, Dp = 3.4;
      texN = 0; mats.top = inp.cTop !== null && inp.cTop !== undefined ? fin('countertop_finish', inp.cTop, 0, .45) : mats.topDefault;
      mats.island = inp.cLower !== null && inp.cLower !== undefined ? fin('lower_finish', inp.cLower, -.03) : mats.islandDefault;
      if (inp.showCabinets && inp.x && inp.x.light) { var gw = new T.Mesh(new T.PlaneGeometry(L, upperSpec(inp.deep).ub - BH), new T.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: .22 })); gw.position.set(L / 2, (upperSpec(inp.deep).ub + BH) / 2, .006); roomGroup.add(gw); }
      if (inp.showCabinets && inp.cBack !== null && inp.cBack !== undefined) { var bm = fin('backsplash_finish', inp.cBack, 0, .4), bgm = new T.PlaneGeometry(L, upperSpec(inp.deep).ub - BH); if (bm.map) { var buv = bgm.attributes.uv; for (var bi = 0; bi < buv.count; bi++) buv.setXY(bi, buv.getX(bi) * L / .6, buv.getY(bi) * (upperSpec(inp.deep).ub - BH) / .6); } var bs = new T.Mesh(bgm, bm); bs.position.set(L / 2, (upperSpec(inp.deep).ub + BH) / 2, .004); roomGroup.add(bs); }
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
      hl.saved = []; hl.key = null; meshById = {}; msg.hidden = true; items = []; X = inp.x || {}; texN = 0;
      if (!inp.showCabinets) return;
      plan = planKitchen({ lengthMm: inp.lengthMm, water: inp.water, ovenTower: inp.ovenTower, fridge: inp.fridge, dishwasherMm: inp.dishwasherMm, washer: inp.washer, microwave: inp.microwave, coffee: inp.coffee, basket: !!(inp.x && inp.x.bottle) });
      if (plan.errors.length) { msg.textContent = plan.errors[0]; msg.hidden = false; return; }
      var ordered = applyOrder(plan, dirty ? order : null); order = ordered.map(function (m) { return m.id; });
      ordered.forEach(function (m, i) { m.idx = i; });
      var pos = position(plan, ordered); items = pos.items;
      var upList = items.filter(function (m) { return !TALL[m.type]; }), glassId = (X.glass && upList.length) ? upList[Math.floor(upList.length / 2)].id : null;
      /* uppers have their own order inside each run between tall columns; it is kept only while it still fits the lower layout */
      var byId = {}; items.forEach(function (m) { byId[m.id] = m; });
      var dRuns = [], cr = null;
      items.forEach(function (m) { if (TALL[m.type]) cr = null; else { if (!cr) { cr = { x0: m.x, ids: [], w: 0 }; dRuns.push(cr); } cr.ids.push(m.id); cr.w += m.w; } });
      /* each layer (standard / deep) keeps its own order; it is kept only while it still fits the lower layout */
      function layerOf(ord) {
        var use = !!ord && ord.length === dRuns.length;
        if (use) { var seen = {}, cnt2 = 0; ord.forEach(function (ids, ri) { var sw = 0; ids.forEach(function (id) { if (!byId[id] || TALL[byId[id].type] || seen[id]) use = false; else { seen[id] = 1; cnt2++; sw += byId[id].w; } }); if (sw !== dRuns[ri].w) use = false; }); if (cnt2 !== upList.length) use = false; }
        var ids = (use ? ord : dRuns.map(function (r) { return r.ids; })).map(function (a) { return a.slice(); }), pos2 = {};
        ids.forEach(function (rr, ri) { var ux0 = dRuns[ri].x0; rr.forEach(function (id) { pos2[id] = { x: ux0, w: byId[id].w }; ux0 += byId[id].w; }); });
        return { ok: use, ids: ids, pos: pos2 };
      }
      curDeep = !!inp.deep;
      var lu = layerOf(uorder), ld = layerOf(dorder);
      if (!lu.ok) uorder = null; if (!ld.ok) dorder = null;
      uRunIds = lu.ids; upos = lu.pos; dRunIds = ld.ids; dpos = ld.pos;
      items.forEach(function (m) { m.free = (m.type === 'dishwasher' && inp.dishFree) || (m.type === 'washingMachine' && inp.washFree); m.host = null; });
      var gb = items.filter(function (m) { return m.type === 'genericBase' || m.type === 'basket'; });
      if (!gb.length) gb = items.filter(function (m) { return !TALL[m.type] && m.type !== 'edgeFront'; });
      if (gb.length) {
        if (inp.microFree) gb[0].host = ['micro'];
        if (inp.coffeeFree) { var cg = gb[gb.length - 1]; cg.host = (cg.host || []).concat('coffee'); }
      }
      var runs = [], cur = null;
      items.forEach(function (m) {
        var w = m.w / 1000, cx = (m.x + m.w / 2) / 1000; var hasL = inp.cLower !== null && inp.cLower !== undefined, hasU = inp.cUpper !== null && inp.cUpper !== undefined; mats.front = hasL ? fin('lower_finish', inp.cLower, 0) : mats.frontA; mats.upper = mats.deep = hasU ? fin('upper_finish', inp.cUpper, 0) : mats.front; var g = TALL[m.type] ? buildTall(m, w) : buildBase(m, w);
        g.position.x = cx; g.userData = { id: m.id, targetX: cx, w: w, type: m.type }; cabGroup.add(g); meshById[m.id] = g;
        var lb = label(String(m.w / 10), .12, '#3b423b', 'rgba(255,255,255,.78)'); lb.position.set(cx, .02, D + .22); lb.userData.follow = m.id; labelGroup.add(lb);
        if (inp.showCabinets && !TALL[m.type]) { if (!cur) { cur = { x0: m.x, x1: m.x + m.w }; runs.push(cur); } else cur.x1 = m.x + m.w; } else cur = null;
        if (!TALL[m.type]) {
          var ux = (upos[m.id].x + upos[m.id].w / 2) / 1000; var up = buildUpper(w, upperSpec(inp.deep).ub, upperSpec(inp.deep).uh, .35, mats.upper, { glass: m.id === glassId }); up.position.x = ux; up.userData = { id: m.id, upper: true, layer: 'u', targetX: ux }; cabGroup.add(up); meshById[m.id + ':u'] = up;
          if (inp.deep) { var dx = (dpos[m.id].x + dpos[m.id].w / 2) / 1000; var dp = buildUpper(w, upperSpec(true).db, upperSpec(true).dh, D, mats.deep, { deep: true }); dp.position.x = dx; dp.userData = { id: m.id, upper: true, layer: 'd', targetX: dx }; cabGroup.add(dp); meshById[m.id + ':d'] = dp; }
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
      var json = JSON.stringify({ lengthMm: plan.lengthMm, fillerMm: plan.fillerMm, fillerAt: plan.fillerAt, modules: items.map(function (m) { return { id: m.id, type: m.type, widthMm: m.w, xMm: m.x }; }), uppers: items.filter(function (m) { return !TALL[m.type]; }).map(function (m) { return { id: m.id, widthMm: m.w, xMm: upos[m.id].x }; }) });
      var inp2 = q('input[name="kitchen_layout"]'); if (!inp2) { var f = q('form'); if (f) { inp2 = document.createElement('input'); inp2.type = 'hidden'; inp2.name = 'kitchen_layout'; f.appendChild(inp2); } }
      if (inp2) inp2.value = json;
      root.pravaLayout.current = JSON.parse(json);
    }

    /* ---------------- camera fit + sync */
    var home = { pos: null, target: null };
    function fit(inp) {
      var L = (inp.lengthMm || 3000) / 1000, H = (inp.heightMm || 2600) / 1000;
      var el = renderer && renderer.domElement, asp = el && el.clientHeight ? el.clientWidth / el.clientHeight : 1.3; asp = Math.max(.6, Math.min(2.5, asp));
      var tv = Math.tan(21 * Math.PI / 180), th = tv * asp;
      var dist = Math.max((L / 2 * 1.2) / th, (H / 2 * 1.25) / tv, 3.2) + .9;
      home.target = new T.Vector3(L / 2, Math.min(H * .42, 1.1), .3); home.pos = new T.Vector3(L / 2 + L * .1, Math.max(1.7, H * .62), .3 + dist);
      bounds = { x: L, y: H, z: 1 }; camera.position.copy(home.pos); controls.target.copy(home.target); controls.maxDistance = dist * 2.2; controls.minDistance = 1.2; controls.update();
    }
    function sync(force) {
      if (failed || !renderer) return;
      var inp = readInputs(), sig = JSON.stringify(inp);
      var show = card.dataset.previewState === 'planner';
      host.hidden = !show; stage.classList.toggle('prava-3d-on', show);
      if (!show) return;
      if (sig === inputsSig && !force) return;
      var prev = inputsSig ? JSON.parse(inputsSig) : null; inputsSig = sig;
      if (prev && prev.water !== inp.water) { dirty = false; uorder = null; dorder = null; }   // an explicit water-position choice re-flows the run
      resize(); buildRoom(inp); buildCabinets(inp);
      var fs = (inp.lengthMm || 0) + '|' + (inp.heightMm || 0);
      if (fs !== fitSig) { fitSig = fs; fit(inp); }
      hint.textContent = inp.showCabinets ? (panMode ? 'Преместване на изгледа: влачете наляво/надясно и нагоре/надолу · Мащаб: колелце/щипване' : moveMode ? 'Местене на шкафове: хванете шкаф и го пуснете върху друг, за да си разменят местата.' : 'Въртене: влачете · Мащаб: колелце/щипване') : 'Въведете размерите — виждате голото помещение с мерна решетка (всеки квадрат е 50 см).';
      rotBtn.hidden = modeBtn.hidden = panBtn.hidden = autoBtn.hidden = !inp.showCabinets; setMode(panMode ? 'pan' : moveMode ? 'move' : 'rotate', true);
    }

    /* ---------------- drag & drop */
    function ndc(ev) { var r = renderer.domElement.getBoundingClientRect(); mouse.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera); }
    function pickModule(ev) {
      ndc(ev); var objs = []; Object.keys(meshById).forEach(function (k) { objs.push(meshById[k]); });
      var hit = ray.intersectObjects(objs, true)[0]; if (!hit) return null;
      var o = hit.object; while (o && !(o.userData && o.userData.id)) o = o.parent; return o ? { id: o.userData.id, upper: !!o.userData.upper, layer: o.userData.layer || null } : null;
    }
    function groundX(ev, layer) { ndc(ev); var y = layer === 'd' ? TALLH - .165 : layer === 'u' ? (curDeep ? (1.45 + TALLH - .33) / 2 : 1.9) : .45, plane = new T.Plane(new T.Vector3(0, 1, 0), -y), p = new T.Vector3(); return ray.ray.intersectPlane(plane, p) ? p.x : null; }
    function dragKeys(d) { return d.layer ? [d.id + ':' + d.layer] : [d.id]; }
    function onDown(ev) {
      if (!moveMode || panMode || !items.length || ev.button > 0) return;
      var pk = pickModule(ev); if (!pk) return;
      var gx = groundX(ev, pk.layer); if (gx === null) return;
      var m = meshById[pk.layer ? pk.id + ':' + pk.layer : pk.id]; if (!m) return;
      drag = { id: pk.id, upper: pk.upper, layer: pk.layer, off: gx - m.position.x, moved: false, target: null }; controls.enabled = false; renderer.domElement.setPointerCapture(ev.pointerId); renderer.domElement.style.cursor = 'grabbing';
    }
    function setLift(keys, on) { keys.forEach(function (k) { var g = meshById[k]; if (g) { g.position.z = on ? .08 : 0; } }); }
    function runsOf(layer) { return layer === 'd' ? dRunIds : uRunIds; }
    function posOf(layer) { return layer === 'd' ? dpos : upos; }
    function runOf(id, layer) { var R = runsOf(layer); for (var i = 0; i < R.length; i++) if (R[i].indexOf(id) >= 0) return i; return -1; }
    function upperSwapOk(a, b, layer) { var P = posOf(layer); return runOf(a, layer) === runOf(b, layer) || (P[a] && P[b] && P[a].w === P[b].w); }
    function onMove(ev) {
      if (!drag) return;
      var gx = groundX(ev, drag.layer); if (gx === null) return; drag.moved = true;
      var cx = Math.max(0, Math.min(plan.lengthMm / 1000, gx - drag.off)), keys = dragKeys(drag);
      keys.forEach(function (k) { var g = meshById[k]; if (g) { g.position.x = cx; g.userData.targetX = cx; } });
      setLift(keys, true);
      var best = null, bd = 1e9, bc = 0;
      items.forEach(function (m) {
        if (m.id === drag.id) return;
        if (drag.upper && (TALL[m.type] || !upperSwapOk(drag.id, m.id, drag.layer))) return;
        var c = drag.upper ? (posOf(drag.layer)[m.id].x + posOf(drag.layer)[m.id].w / 2) / 1000 : (m.x + m.w / 2) / 1000, d = Math.abs(c - cx); if (d < bd) { bd = d; best = m; bc = c; }
      });
      drag.target = best && bd < Math.max(best.w / 1000, .45) ? best.id : null;
      setHL(drag.target ? (drag.upper ? drag.target + ':' + drag.layer : drag.target) : null);   // the cabinet that will be replaced turns green
    }
    /* green tint on the cabinet whose place the dragged one will take (materials are cloned, the shared ones stay untouched) */
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
      try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) {}
      if (d.moved && d.target) {
        if (d.upper) {
          var r = runsOf(d.layer).map(function (a) { return a.slice(); }), ra = runOf(d.id, d.layer), rb = runOf(d.target, d.layer);
          if (ra >= 0 && rb >= 0) { var ia = r[ra].indexOf(d.id), ib = r[rb].indexOf(d.target); r[ra][ia] = d.target; r[rb][ib] = d.id; if (d.layer === 'd') dorder = r; else uorder = r; }
        } else {
          if (!uorder) uorder = uRunIds.map(function (a) { return a.slice(); });   // freeze both upper rows: only the lower cabinets move
          if (!dorder) dorder = dRunIds.map(function (a) { return a.slice(); });
          order = swapIds(order, d.id, d.target); dirty = true;
        }
      }
      setLift(dragKeys(d), false); sync(true); inputsSig = ''; sync(true);
    }

    /* ---------------- scene setup */
    function setup() {
      T = root.THREE; renderer = new T.WebGLRenderer({ antialias: true }); renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2)); renderer.shadowMap.enabled = false; renderer.shadowMap.type = T.PCFSoftShadowMap;
      host.insertBefore(renderer.domElement, hint); scene = new T.Scene(); scene.background = new T.Color(0xeef0ed);
      camera = new T.PerspectiveCamera(42, 1, .05, 80); ray = new T.Raycaster(); mouse = new T.Vector2(); setupMats();
      scene.add(new T.HemisphereLight(0xffffff, 0xb6b2a8, .95));
      var sun = new T.DirectionalLight(0xffffff, .75); sun.position.set(3, 6, 5); sun.castShadow = false; sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -6; sun.shadow.camera.right = 6; sun.shadow.camera.top = 5; sun.shadow.camera.bottom = -3; sun.shadow.bias = -.0004; scene.add(sun);
      roomGroup = new T.Group(); cabGroup = new T.Group(); labelGroup = new T.Group(); scene.add(roomGroup, cabGroup, labelGroup);
      dropMark = new T.Mesh(new T.PlaneGeometry(1, 1.1), mats.highlight); dropMark.rotation.x = -Math.PI / 2; dropMark.visible = false; dropMark.position.y = .01; scene.add(dropMark);
      controls = new T.OrbitControls(camera, renderer.domElement); controls.enablePan = true; controls.screenSpacePanning = true; controls.panSpeed = 1; controls.enableDamping = true; controls.maxPolarAngle = Math.PI * .5; controls.minAzimuthAngle = -Math.PI * .45; controls.maxAzimuthAngle = Math.PI * .45;
      controls.addEventListener('change', function () {   // the view can be panned, but never so far that the room is lost
        var t = controls.target, cx = Math.max(-.6, Math.min(bounds.x + .6, t.x)), cy = Math.max(0, Math.min(bounds.y, t.y)), cz = Math.max(-.6, Math.min(bounds.z + .6, t.z));
        if (cx !== t.x || cy !== t.y || cz !== t.z) { var dx = cx - t.x, dy = cy - t.y, dz = cz - t.z; t.set(cx, cy, cz); camera.position.x += dx; camera.position.y += dy; camera.position.z += dz; }
      });
      setMode('rotate', true);
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
    function setMode(m, quiet) {
      moveMode = m === 'move'; panMode = m === 'pan'; host.setAttribute('data-mode', m);
      rotBtn.setAttribute('aria-pressed', String(m === 'rotate')); modeBtn.setAttribute('aria-pressed', String(moveMode)); panBtn.setAttribute('aria-pressed', String(panMode));
      if (controls) {
        controls.mouseButtons.LEFT = panMode ? T.MOUSE.PAN : T.MOUSE.ROTATE; controls.touches.ONE = panMode ? T.TOUCH.PAN : T.TOUCH.ROTATE;
        controls.enableRotate = !moveMode;
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
      else if (a === 'auto') { dirty = false; uorder = null; dorder = null; order = []; inputsSig = ''; sync(true); }
      controls.update();
    });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (t) { btns.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    function fail() { failed = true; host.hidden = true; stage.classList.remove('prava-3d-on'); }

    page.addEventListener('change', function () { soon(); }, true); page.addEventListener('input', function () { soon(); }, true);
    var raf = 0; function soon() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; sync(false); }); }
    Promise.resolve(root.THREE || load(THREE_URL)).then(function () { return root.THREE.OrbitControls || load(ORBIT_URL); }).then(function () {
      setup();
      new MutationObserver(soon).observe(page, { subtree: true, attributes: true, characterData: true, childList: true, attributeFilter: ['class', 'data-prava-step', 'data-preview-state', 'value'] });
      page.addEventListener('click', function () { setTimeout(soon, 100); }); page.addEventListener('change', soon); page.addEventListener('prava:phase-changed', function () { inputsSig = ''; soon(); });
      /* picture of the interactive sketch for the AI visualization: fixed camera, no grid lines or labels, same textures as on screen */
      function capture() {
        if (!T || !scene || !plan || !items.length) return null;
        var W = 1536, H = 1024, L = plan.lengthMm / 1000, hide = [], prev = [], r = null;
        try {
          clearHL();
          scene.traverse(function (o) { if (o.type === 'LineSegments' || o.type === 'Sprite') hide.push(o); });
          hide.forEach(function (o) { prev.push(o.visible); o.visible = false; });
          var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
          r = new T.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H, false);
          var cam = new T.PerspectiveCamera(42, W / H, .05, 60);
          cam.position.set(L / 2 + L * .06, 1.35, Math.max(3.2, L * 1.15)); cam.lookAt(L / 2, 1.25, .3); cam.updateMatrixWorld(true);
          r.render(scene, cam);
          var url = cv.toDataURL('image/jpeg', .9);
          return url && url.length > 4000 ? url : null;
        } catch (e) { return null; }
        finally { hide.forEach(function (o, i) { o.visible = prev[i]; }); if (r) r.dispose(); }
      }
      function sketchLegend() {
        var nm = { fridge: 'fridge', ovenTower: 'tall oven tower', ovenHobBase: 'oven with hob', hobBase: 'hob', sinkBase: 'sink', dishwasher: 'dishwasher', washingMachine: 'washing machine', applianceTower: 'built-in appliance tower', basket: 'narrow bottle pullout' };
        var out = items.filter(function (m) { return nm[m.type]; }).map(function (m) { return nm[m.type]; });
        if (X.handleless) out.push('handleless fronts');
        if (X.drawers) out.push('extra drawers on lower storage');
        if (X.panel) out.push('framed panel doors');
        if (X.lift) out.push('lift-up fronts on the lower upper row only');
        if (X.glass) out.push('one illuminated glass display unit in the lower upper row');
        if (X.light) out.push('under-cabinet lighting');
        return out;
      }
      root.pravaLayout = { refresh: soon, current: null, capture: capture, sketchLegend: sketchLegend, debug: function () { return { scene: scene, camera: camera, plan: plan, items: items, order: order }; } };
      soon();
    }).catch(fail);
    root.pravaLayout = root.pravaLayout || { refresh: function () {}, current: null };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(typeof window !== 'undefined' ? window : globalThis);
