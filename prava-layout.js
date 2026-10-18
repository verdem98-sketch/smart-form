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
    var editBtn = mkBtn('✎', 'Промяна на шкаф: изберете шкаф, за да смените ширината и вида му', 'edit');
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
    var catalog = null, colCache = {}, toneCache = {}, texCache = {}, texMat = {}, texN = 0, grainCache = {}, catKind = {}, curInp = null;
    function catalogMap() {
      if (catalog) return catalog; catalog = {};
      page.querySelectorAll('script[data-prava-catalog]').forEach(function (s) {
        try { var j = JSON.parse(s.textContent), w = s.closest('[data-field]'), f = w && w.dataset.field; if (!f) return; var m = catalog[f] = {}, ck = catKind[f] = {}; j.items.forEach(function (r) { m[r[0]] = j.base ? j.base + encodeURIComponent(r[5]) : r[4]; ck[r[0]] = j.base ? r[2] : r[6]; }); } catch (e) { /* ignore */ }
      });
      if (catalog.upper_finish && !catalog.deep_finish) { catalog.deep_finish = catalog.upper_finish; catKind.deep_finish = catKind.upper_finish; }
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
          try { var gc = document.createElement('canvas'); gc.width = gc.height = 48; var gx = gc.getContext('2d'); gx.drawImage(im, 0, 0, 48, 48); var gd = gx.getImageData(0, 0, 48, 48).data, ddx = 0, ddy = 0; for (var yy = 0; yy < 47; yy++) for (var xx = 0; xx < 47; xx++) { var i0 = (yy * 48 + xx) * 4, l0 = gd[i0] + gd[i0 + 1] + gd[i0 + 2], lx = gd[i0 + 4] + gd[i0 + 5] + gd[i0 + 6], ly = gd[i0 + 192] + gd[i0 + 193] + gd[i0 + 194]; ddx += Math.abs(lx - l0); ddy += Math.abs(ly - l0); } grainCache[u] = ddx > ddy ? 'v' : 'h'; } catch (e2) { /* no grain info */ }
          if (n) { colCache[u] = (r / n << 16) | (gg / n << 8) | (b / n); sync(true); }
        } catch (e) { /* tainted canvas: keep default colour */ }
      };
      im.src = u; return null;
    }
    function decorUrl(field) { var id = fieldVal(field); if (!id) return null; var u = (catalogMap()[field] || {})[id]; return u ? u.replace('https://s3.amazonaws.com/webflow-prod-assets/', 'https://cdn.prod.website-files.com/') : null; }
    /* finish material: true decor texture when the image is a real texture, otherwise the averaged colour */
    /* worktop and backsplash: a wood decor always runs along their length (horizontal grain) */
    function isWoodField(field) { var id = fieldVal(field); return !!id && (catKind[field] || {})[id] === 'wood'; }
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
    /* cabinet fronts: map the decor in world space so the pattern runs on across neighbouring doors; swap the axes for a horizontal grain */
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

    function grainOf(k) { var v = fieldVal(k + '_grain'); return v === 'h' || v === 'horizontal' ? 'h' : 'v'; }
    function isGloss(field) { var id = fieldVal(field); return !!(id && root.pravaGloss && root.pravaGloss.has(id)); }
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
        cUpper: colourOf('upper_finish'), cDeep: colourOf('deep_finish'), gU: grainOf('upper'), gL: grainOf('lower'), gD: grainOf('deep'), glU: isGloss('upper_finish'), glL: isGloss('lower_finish'), glD: isGloss('deep_finish'), cLower: colourOf('lower_finish'), cTop: colourOf('countertop_finish'), cBack: colourOf('backsplash_finish')
      };
    }

    /* ---------------- materials / helpers */
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
    /* free-standing microwave / coffee machine: only on the clear countertop (never over the sink, hob or each other; washer and dishwasher tops are fine) */
    function placeFree(list, inp) {
      var want = []; if (inp.microFree) want.push({ k: 'micro', w: 460 }); if (inp.coffeeFree) want.push({ k: 'coffee', w: 280 });
      if (!want.length) return;
      var OK = { genericBase: 1, basket: 1, dishwasher: 1, washingMachine: 1 }, spans = [], cur = null;
      list.slice().sort(function (a, b) { return a.x - b.x; }).forEach(function (m) {
        var ok = OK[m.type];
        if (!ok) { cur = null; return; }
        if (cur && Math.abs(cur.x1 - m.x) < 2) cur.x1 = m.x + m.w; else { cur = { x0: m.x, x1: m.x + m.w }; spans.push(cur); }
      });
      spans.forEach(function (sp) { sp.len = sp.x1 - sp.x0; sp.used = []; });
      var M = 50, GAP = 100;
      function put(sp, a) {
        var start = sp.x0 + M; sp.used.forEach(function (u) { start = Math.max(start, u.e + GAP); });
        if (start + a.w > sp.x1 - M + 1) return false;
        sp.used.push({ s: start, e: start + a.w, k: a.k }); return true;
      }
      want.forEach(function (a) {
        var best = null;
        spans.forEach(function (sp) {
          var start = sp.x0 + M; sp.used.forEach(function (u) { start = Math.max(start, u.e + GAP); });
          if (start + a.w <= sp.x1 - M + 1 && (!best || sp.len - sp.used.length * 1000 > best.len - best.used.length * 1000)) best = sp;
        });
        if (best) put(best, a);
      });
      spans.forEach(function (sp) {
        var n = sp.used.length; if (!n) return;
        var tot = sp.used[n - 1].e - sp.used[0].s, shift = Math.round(((sp.x1 - sp.x0) - tot) / 2 - M);   // centre the group on the free span
        sp.used.forEach(function (u) {
          var cx = u.s + shift + (u.e - u.s) / 2, host = null;
          list.forEach(function (m) { if (cx >= m.x && cx <= m.x + m.w && !TALL[m.type]) host = m; });
          if (!host) return;
          (host.host = host.host || []).push({ k: u.k, x: (cx - (host.x + host.w / 2)) / 1000 });
        });
      });
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
        g.position.x = (function (w, mm) { return mm / 1000; })(p.wall, p.x); g.userData = { freeApp: k, wall: p.wall }; (function () { return cabGroup; })(p.wall).add(g); freeG[k] = g;
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
      if (m.host) m.host.forEach(function (h) { if (h.k === 'micro') standMicro(g, h.x); else standCoffee(g, h.x); });
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
      if (CUT.on) CUT.cab.push({ row: opt && opt.deep ? 'deep' : 'upper', wall: (opt && opt.wall) || 1, x: opt && opt.s0 != null ? Math.round(opt.s0) : null, z: Math.round(bottom * 1000), w: Math.round(w * 1000), h: Math.round(h * 1000), d: Math.round(depth * 1000), blind: Math.round((opt && opt.blind) || 0), glass: !!(opt && opt.glass), lift: !!(opt && opt.lift) });
      opt = opt || {}; var g = new T.Group(); box(w - .002, h, depth, mat, 0, bottom + h / 2, depth / 2, g);
      var lift = opt.lift === undefined ? !!X.lift : opt.lift, n = (lift || w < .7) ? 1 : 2, dw = w / n, fm = opt.glass ? mats.glassFront : mat;
      if (opt.glass) {                                                                                  // lit display cabinet: warm interior + shelves
        box(w - .08, h - .08, depth - .06, mats.glow, 0, bottom + h / 2, depth / 2 + .02, g);
        [.33, .66].forEach(function (f) { box(w - .08, .012, depth - .08, mats.steel, 0, bottom + h * f, depth / 2 + .02, g); });
      }
      if (lift && !opt.deep) {                                                                         // lift-up flaps: joint between flaps is horizontal; with glass = two small display cabinets one above the other
        if (opt.glass) box(w - .08, .012, depth - .08, mats.steel, 0, bottom + h / 2, depth / 2 + .02, g);
        for (var k = 0; k < 2; k++) {
          var fy = bottom + h * (k ? .75 : .25);
          if (opt.glass) { box(w - G, h / 2 - G, .008, fm, 0, fy, depth + .004, g); box(w - G, .03, FT, mats.steel, 0, fy + h / 4 - .015, depth + FT / 2, g); box(w - G, .03, FT, mats.steel, 0, fy - h / 4 + .015, depth + FT / 2, g); }
          else box(w - G, h / 2 - G, FT, fm, 0, fy, depth + FT / 2, g);
          if (X.panel && !opt.glass && h > .5 && w > .25) box(w - G - .1, h / 2 - .1, .008, fm, 0, fy, depth + FT + .004, g);
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
    /* ---------------- island: dragged in the move mode (✥) or in the ✎ mode, sized / turned 90° in the ✎ card; it keeps a 50 cm passage from the cabinets */
    var ISLLIM = { len: [600, 4000], w: [400, 1500] }, ISL = { pos: null, rot: false }, ISLROOM = null, islandG = null, islandLbl = null, islDrag = null;
    function islClamp(x, z) { var R = ISLROOM; if (!R) return { x: x, z: z }; var c = function (v, a, b) { return a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)); }; return { x: c(x, R.x0, R.x1), z: c(z, R.z0, R.z1) }; }
    function islHit(ev) { if (!islandG) return false; ndc(ev); return ray.intersectObject(islandG, true).length > 0; }
    function islFloor(ev) { ndc(ev); var p = new T.Vector3(); return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), -BH), p) ? p : null; }
    function islSetDim(key, mm) {   // writes the size back into the form's own pickers (metres + centimetres), so the order carries it too
      var row = q('.dimension-row[data-dim="' + key + '"]'); if (!row) return;
      var cm = Math.round(mm / 10), hasM = !!row.querySelector('.meters-control'), vals = hasM ? [Math.floor(cm / 100), cm % 100] : [0, cm];
      ['.meters-control', '.centimeters-control'].forEach(function (sel2, i) { row.querySelectorAll(sel2 + ' .picker-value-text,' + sel2 + ' .picker-value').forEach(function (e) { e.textContent = String(vals[i]); }); });
      row.classList.add('is-touched'); row.setAttribute('data-touched', 'true');
    }
    function buildRoom(inp) {
      while (roomGroup.children.length) roomGroup.remove(roomGroup.children[0]);
      var L = (inp.lengthMm || 3000) / 1000, H = (inp.heightMm || 2600) / 1000, Dp = 3.4;
      texN = 0; mats.top = inp.cTop !== null && inp.cTop !== undefined ? finLen('countertop_finish', inp.cTop, .45) : mats.topDefault;
      mats.island = inp.cLower !== null && inp.cLower !== undefined ? fin('lower_finish', inp.cLower, -.03) : mats.islandDefault;
      if (inp.showCabinets && inp.x && inp.x.light) { var gw = new T.Mesh(new T.PlaneGeometry(L, upperSpec(inp.deep).ub - BH), new T.MeshBasicMaterial({ color: 0xffd98a, transparent: true, opacity: .22 })); gw.position.set(L / 2, (upperSpec(inp.deep).ub + BH) / 2, .006); roomGroup.add(gw); }
      if (inp.showCabinets && inp.cBack !== null && inp.cBack !== undefined) { var bm = splashMat('backsplash_finish', inp.cBack), bgm = new T.PlaneGeometry(L, upperSpec(inp.deep).ub - BH); if (bm.map) { var buv = bgm.attributes.uv; for (var bi = 0; bi < buv.count; bi++) buv.setXY(bi, buv.getX(bi) * L / ((upperSpec(inp.deep).ub - BH) * 2.5), buv.getY(bi)); } var bs = new T.Mesh(bgm, bm); bs.position.set(L / 2, (upperSpec(inp.deep).ub + BH) / 2, .004); roomGroup.add(bs); }
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
      islandG = null; islandLbl = null; ISLROOM = null;
      if (inp.island && inp.islandLenMm && inp.islandWidthMm) {
        var il = inp.islandLenMm / 1000, iw = inp.islandWidthMm / 1000, sx = ISL.rot ? iw : il, sz = ISL.rot ? il : iw;   // "Завърти 90°" in the ✎ card swaps the sides
        ISLROOM = { x0: sx / 2 + .05, x1: L - sx / 2 - .05, z0: D + .5 + sz / 2, z1: Dp - sz / 2 - .05 };
        var cc = islClamp(ISL.pos ? ISL.pos.x : L / 2, ISL.pos ? ISL.pos.z : 1.6 + sz / 2), cx = cc.x, cz = cc.z;
        var ig = new T.Group(); box(sx, BH - WT - .1, sz, mats.island, 0, .1 + (BH - WT - .1) / 2, 0, ig); box(sx - .01, .1, sz - .06, mats.plinth, 0, .05, 0, ig); box(sx + .04, WT, sz + .04, mats.top, 0, BH - WT / 2, 0, ig);
        ig.position.set(cx, 0, cz); ig.userData = { island: true }; roomGroup.add(ig); islandG = ig;
        var it = label('остров ' + fmt(inp.islandLenMm) + ' × ' + fmt(inp.islandWidthMm), .16, '#4a4132', 'rgba(255,255,255,.85)'); it.position.set(cx, BH + .18, cz); roomGroup.add(it); islandLbl = it;
      }
    }

    /* ---------------- cabinets */
    var meshById = {};
    function buildCabinets(inp) {
      CUT = { on: true, cab: [], tops: [], fills: [] };
      while (cabGroup.children.length) cabGroup.remove(cabGroup.children[0]);
      while (labelGroup.children.length) labelGroup.remove(labelGroup.children[0]);
      hl.saved = []; hl.key = null; meshById = {}; msg.hidden = true; items = []; X = inp.x || {}; texN = 0;
      if (!inp.showCabinets) return;
      plan = planKitchen({ lengthMm: inp.lengthMm, water: inp.water, ovenTower: inp.ovenTower, fridge: inp.fridge, dishwasherMm: inp.dishwasherMm, washer: inp.washer, microwave: inp.microwave, coffee: inp.coffee, basket: !!(inp.x && inp.x.bottle) });
      if (plan.errors.length) { msg.textContent = plan.errors[0]; msg.hidden = false; return; }
      edMergeLow([plan.modules]);   // lower cabinets merged in the ✎ editor (the upper row keeps its own cabinets)
      lastInp = inp; plan.fillerMm = edApplyLow(plan.modules, plan.fillerMm, MAX_FILLER);   // widths changed in the ✎ editor
      if (!plan.fillerMm) plan.fillerAt = 'none'; else if (plan.fillerAt === 'none') plan.fillerAt = 'right';
      var ordered = applyOrder(plan, dirty ? order : null); order = ordered.map(function (m) { return m.id; });
      ordered.forEach(function (m, i) { m.idx = i; });
      var pos = position(plan, ordered); items = pos.items;
      /* upper slots: one per lower cabinet as it was before any lower merge (a merged lower cabinet still carries its parts), so the two rows stay independent */
      var ubase = [];
      items.forEach(function (m) {
        if (!m.parts) { ubase.push({ id: m.id, type: m.type, x: m.x, w: m.w }); return; }
        var x = m.x, d = m.w - m.parts.reduce(function (s, p) { return s + p.w; }, 0);
        m.parts.forEach(function (p, i) { var w = p.w + (i === 0 ? d : 0); ubase.push({ id: p.id, type: m.type, x: x, w: w }); x += w; });
      });
      /* uppers have their own order inside each run between tall columns; it is kept only while it still fits the lower layout */
      var byId = {}; ubase.forEach(function (m) { byId[m.id] = m; });
      var dRuns = [], cr = null;
      ubase.forEach(function (m) { if (TALL[m.type]) cr = null; else { if (!cr) { cr = { x0: m.x, ids: [], w: 0 }; dRuns.push(cr); } cr.ids.push(m.id); cr.w += m.w; } });
      // upper cabinet widths: the lower width unless changed in the ✎ editor (the neighbour in the same run takes up the difference)
      var uW = {}; ubase.forEach(function (m) { uW[m.id] = m.w; }); edMergeUpPrava(dRuns, uW); edApplySlotsPrava(dRuns, uW);
      var upList = []; dRuns.forEach(function (r) { r.ids.forEach(function (id) { upList.push(id); }); });
      var glassId = (X.glass && upList.length) ? upList[Math.floor(upList.length / 2)] : null; edGlassId = glassId;
      /* each layer (standard / deep) keeps its own order; it is kept only while it still fits the lower layout */
      function layerOf(ord) {
        var use = !!ord && ord.length === dRuns.length;
        if (use) { var seen = {}, cnt2 = 0; ord.forEach(function (ids, ri) { var sw = 0; ids.forEach(function (id) { if (!byId[id] || TALL[byId[id].type] || seen[id]) use = false; else { seen[id] = 1; cnt2++; sw += uW[id]; } }); if (sw !== dRuns[ri].w) use = false; }); if (cnt2 !== upList.length) use = false; }
        var ids = (use ? ord : dRuns.map(function (r) { return r.ids; })).map(function (a) { return a.slice(); }), pos2 = {};
        ids.forEach(function (rr, ri) { var ux0 = dRuns[ri].x0; rr.forEach(function (id) { pos2[id] = { x: ux0, w: uW[id] }; ux0 += uW[id]; }); });
        return { ok: use, ids: ids, pos: pos2 };
      }
      curDeep = !!inp.deep;
      var lu = layerOf(uorder), ld = layerOf(dorder);
      if (!lu.ok) uorder = null; if (!ld.ok) dorder = null;
      uRunIds = lu.ids; upos = lu.pos; dRunIds = ld.ids; dpos = ld.pos;
      items.forEach(function (m) { m.free = (m.type === 'dishwasher' && inp.dishFree) || (m.type === 'washingMachine' && inp.washFree); m.host = null; });
      freeFix(inp);
      var runs = [], cur = null;
      items.forEach(function (m) {
        var w = m.w / 1000, cx = (m.x + m.w / 2) / 1000; var hasL = inp.cLower !== null && inp.cLower !== undefined, hasU = inp.cUpper !== null && inp.cUpper !== undefined; var hasD = inp.cDeep !== null && inp.cDeep !== undefined && !!fieldVal('deep_finish'); mats.front = hasL ? fin('lower_finish', inp.cLower, 0, inp.glL ? .12 : undefined, inp.gL) : mats.frontA; mats.carcass = hasL ? mats.front : mats.carcassDefault; mats.upper = hasU ? fin('upper_finish', inp.cUpper, 0, inp.glU ? .12 : undefined, inp.gU) : mats.front; mats.deep = hasD ? fin('deep_finish', inp.cDeep, 0, inp.glD ? .12 : undefined, inp.gD) : (hasU ? fin('upper_finish', inp.cUpper, 0, inp.glU ? .12 : undefined, inp.gD) : mats.front); var g = TALL[m.type] ? buildTall(m, w) : buildBase(m, w);
        g.position.x = cx; worldUV(g); g.userData = { id: m.id, targetX: cx, w: w, type: m.type }; cabGroup.add(g); meshById[m.id] = g;
        var lb = label(String(m.w / 10), .12, '#3b423b', 'rgba(255,255,255,.78)'); lb.position.set(cx, .02, D + .22); lb.userData.follow = m.id; labelGroup.add(lb);
        if (inp.showCabinets && !TALL[m.type]) { if (!cur) { cur = { x0: m.x, x1: m.x + m.w }; runs.push(cur); } else cur.x1 = m.x + m.w; } else cur = null;
      });
      freeBuild();
      // upper cabinets: their own slots (independent of merges in the lower row)
      upList.forEach(function (id) {
        if (upos[id]) { var ux = (upos[id].x + upos[id].w / 2) / 1000; var up = buildUpper(upos[id].w / 1000, upperSpec(inp.deep).ub, upperSpec(inp.deep).uh, .35, mats.upper, { glass: uGlass(id), lift: uLift(id), s0: upos[id].x }); up.position.x = ux; worldUV(up); up.userData = { id: id, upper: true, layer: 'u', targetX: ux }; cabGroup.add(up); meshById[id + ':u'] = up; }
        if (inp.deep && dpos[id]) { var dx = (dpos[id].x + dpos[id].w / 2) / 1000; var dp = buildUpper(dpos[id].w / 1000, upperSpec(true).db, upperSpec(true).dh, D, mats.deep, { deep: true, glass: uGlass(id + ':d'), s0: dpos[id].x }); dp.position.x = dx; worldUV(dp); dp.userData = { id: id, upper: true, layer: 'd', targetX: dx }; cabGroup.add(dp); meshById[id + ':d'] = dp; }
      });
      // filler panel (fixed, not draggable)
      if (plan.fillerMm) CUT.fills.push({ w: Math.round(plan.fillerMm), h: Math.round((BH - PL - WT) * 1000) });
      if (plan.fillerMm) {
        var fx = plan.fillerAt === 'left' ? plan.fillerMm / 2 : (pos.total - plan.fillerMm / 2); var fw = plan.fillerMm / 1000, fg = new T.Group();
        box(fw, BH - PL, D - .02, mats.front, 0, PL + (BH - PL) / 2, (D - .02) / 2, fg); fg.position.x = fx / 1000; fg.userData = { filler: true }; cabGroup.add(fg);
      }
      // worktop slabs over each consecutive base run (filler included)
      var allBase = []; var xs = items.filter(function (m) { return !TALL[m.type]; }).map(function (m) { return [m.x, m.x + m.w]; });
      var segs = []; items.forEach(function (m) { if (TALL[m.type]) { segs.push(null); } else { if (!segs.length || segs[segs.length - 1] === null) segs.push([m.x, m.x + m.w]); else segs[segs.length - 1][1] = m.x + m.w; } });
      segs.filter(Boolean).forEach(function (s) {
        var a = s[0], b = s[1]; if (plan.fillerMm && plan.fillerAt === 'left' && a === plan.fillerMm) a = 0; if (plan.fillerMm && plan.fillerAt === 'right' && Math.abs(b - (pos.total - plan.fillerMm)) < 1) b = pos.total;
        CUT.tops.push({ x: Math.round(a), len: Math.round(b - a), d: Math.round((D + .02) * 1000), wall: typeof w === 'number' ? w : 1 }); var top = new T.Group(); box((b - a) / 1000, WT, D + .02, mats.top, (a + b) / 2000, BH - WT / 2, (D + .02) / 2, top); top.userData = { top: true }; cabGroup.add(top);
      });
      // expose layout for the form / AI step
      var json = JSON.stringify({ lengthMm: plan.lengthMm, fillerMm: plan.fillerMm, fillerAt: plan.fillerAt, modules: items.map(function (m) { return { id: m.id, type: m.type, widthMm: m.w, xMm: m.x }; }), uppers: upList.filter(function (id) { return upos[id]; }).map(function (id) { return { id: id, widthMm: upos[id].w, xMm: upos[id].x }; }) });
      var inp2 = q('input[name="kitchen_layout"]'); if (!inp2) { var f = q('form'); if (f) { inp2 = document.createElement('input'); inp2.type = 'hidden'; inp2.name = 'kitchen_layout'; f.appendChild(inp2); } }
      if (inp2) inp2.value = json;
      root.pravaLayout.current = JSON.parse(json);
      CUT.on = false; root.pravaLayout.current.cut = { kitchen: 'prava', heightMm: inp.heightMm || 0, splashH: Math.round((upperSpec(inp.deep).ub - BH) * 1000), cabinets: CUT.cab, tops: CUT.tops, fills: CUT.fills, island: inp.island && inp.islandLenMm && inp.islandWidthMm ? { kind: 'island', len: inp.islandLenMm, w: inp.islandWidthMm } : null };
      if (sel) { if (edMesh(sel)) { hl.key = null; setHL(edKey(sel)); edRender(); } else edClose(); }
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
      var inp = readInputs(), sig = JSON.stringify(inp); curInp = inp;
      var show = card.dataset.previewState === 'planner';
      host.hidden = !show; stage.classList.toggle('prava-3d-on', show);
      if (!show) return;
      if (sig === inputsSig && !force) return;
      var prev = inputsSig ? JSON.parse(inputsSig) : null; inputsSig = sig;
      if (prev && prev.water !== inp.water) { dirty = false; uorder = null; dorder = null; }   // an explicit water-position choice re-flows the run
      resize(); buildRoom(inp); buildCabinets(inp);
      var fs = (inp.lengthMm || 0) + '|' + (inp.heightMm || 0);
      if (fs !== fitSig) { fitSig = fs; fit(inp); }
      hint.textContent = inp.showCabinets ? (editMode ? 'Промяна на шкаф: докоснете шкаф, за да смените ширината, чекмеджетата, повдигащите врати или витрината.' : panMode ? 'Преместване на изгледа: влачете наляво/надясно и нагоре/надолу · Мащаб: колелце/щипване' : moveMode ? 'Местене на шкафове: хванете шкаф и го пуснете върху друг, за да си разменят местата.' : 'Въртене: влачете · Мащаб: колелце/щипване') : 'Въведете размерите — виждате голото помещение с мерна решетка (всеки квадрат е 50 см).';
      rotBtn.hidden = modeBtn.hidden = panBtn.hidden = autoBtn.hidden = editBtn.hidden = !inp.showCabinets; setMode(panMode ? 'pan' : moveMode ? 'move' : editMode ? 'edit' : 'rotate', true);
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
      if (edPointerDown(ev)) return;
      if (moveMode && !panMode && ev.button <= 0) { var fo = freeHit(ev); if (fo) { var gx0 = groundX(ev, fo.userData.wall); if (gx0 !== null) { freeDrag = { k: fo.userData.freeApp, wall: fo.userData.wall, g: fo, off: gx0 - fo.position.x, moved: false }; controls.enabled = false; try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ } renderer.domElement.style.cursor = 'grabbing'; return; } } }
      if (moveMode && !panMode && ev.button <= 0 && islHit(ev)) { var p0 = islFloor(ev); if (p0) { islDrag = { ox: p0.x - islandG.position.x, oz: p0.z - islandG.position.z }; controls.enabled = false; try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ } renderer.domElement.style.cursor = 'grabbing'; return; } }
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
      if (freeDrag) { var fx = groundX(ev, freeDrag.wall); if (fx !== null) { freeDrag.g.position.x = Math.max(0, Math.min((function () { return plan.lengthMm; })(freeDrag.wall) / 1000, fx - freeDrag.off)); freeDrag.moved = true; } return; }
      if (edDown && edDown.io && Math.abs(ev.clientX - edDown.x) + Math.abs(ev.clientY - edDown.y) > 8) {   // ✎ mode: a drag on the island moves it
        islDrag = edDown.io; edDown = null; try { renderer.domElement.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable */ } renderer.domElement.style.cursor = 'grabbing';
      }
      if (islDrag) { var pi = islFloor(ev); if (pi && islandG) { var ci = islClamp(pi.x - islDrag.ox, pi.z - islDrag.oz); islandG.position.set(ci.x, 0, ci.z); if (islandLbl) islandLbl.position.set(ci.x, BH + .18, ci.z); ISL.pos = ci; } return; }
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
      if (freeDrag) { var fd = freeDrag; freeDrag = null; controls.enabled = true; renderer.domElement.style.cursor = ''; try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) { /* not captured */ } if (fd.moved) FREE.pos[fd.k] = { wall: fd.wall, x: (function (w, lx) { return lx * 1000; })(fd.wall, fd.g.position.x) }; inputsSig = ''; sync(true); return; }
      if (islDrag) { islDrag = null; controls.enabled = true; renderer.domElement.style.cursor = ''; try { renderer.domElement.releasePointerCapture(ev.pointerId); } catch (e) { /* not captured */ } if (editMode) edSelect({ id: 'island', island: true }); return; }
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

    var edSlots = true, lastInp = {}, edGlassId = null;
    function edSlotFor(s) { var P = s.layer === 'd' ? dpos : upos; return P && P[s.id] ? { id: s.id, w: P[s.id].w } : null; }
    function edApplySlotsPrava(runs, uW) {
      runs.forEach(function (r) {
        r.ids.forEach(function (id, i) {
          var want = EDIT.slot[id]; if (!want || want === uW[id]) return;
          var nb = r.ids[i + 1] || r.ids[i - 1]; if (!nb) { EDIT.slot[id] = uW[id]; edNote = 'Този горен шкаф е сам в реда си: ширината му следва долния ред.'; return; }
          var d = Math.max(MIN_W, Math.min(MAX_W, want)) - uW[id], nbw = Math.max(MIN_W, Math.min(MAX_W, uW[nb] - d)); d = uW[nb] - nbw;
          if (!d) { EDIT.slot[id] = uW[id]; edNote = 'Няма място: съседният горен шкаф вече е на минимална или максимална ширина.'; return; }
          uW[id] += d; uW[nb] -= d; EDIT.slot[id] = uW[id];
        });
      });
    }
    function edGlassDefault() { return edGlassId; }
    function curDeepRow() { return !!lastInp.deep; }
    function edWhere(id, upper) {   // '3rd lower unit from the left'
      var ord = function (n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); };
      if (upper) { var on = Object.keys(upos).sort(function (a, b) { return upos[a].x - upos[b].x; }); return ord(on.indexOf(id) + 1) + ' upper cabinet from the left'; }
      var list = items.slice().sort(function (a, b) { return a.x - b.x; }), m = edModule(id); return ord(list.indexOf(m) + 1) + ' lower unit from the left';
    }
    /* ---------------- cabinet editor (✎): pick one cabinet in the sketch, change its width and its fronts.
       Edits are kept per cabinet id and re-applied on every rebuild; the sketch picture and its key carry them to the AI. */
    var EDIT = { low: {}, up: {}, slot: {}, mLow: [], mUp: [] }, sel = null, editMode = false, edDown = null, edNote = '';
    var STEP_W = 50, MIN_W = 150, MAX_W = 1200;
    function wLim(t) { return t === 'sinkBase' ? [450, 1200] : [MIN_W, MAX_W]; }   // ordinary cabinets 15-120 cm, sink base 45-120 cm
    function canResize(m) { return !!m && (m.type === 'genericBase' || m.type === 'sinkBase'); }
    var edBox = document.createElement('div'); edBox.className = 'prava-3d-edit'; edBox.hidden = true; host.appendChild(edBox);
    ['pointerdown', 'pointerup', 'touchstart', 'wheel', 'mousedown'].forEach(function (t) { edBox.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true }); });
    // the editor cursor is the same pencil as the ✎ button (tip = hot spot)
    var ED_CUR = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><g stroke="#fff" stroke-width="5"><path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/></g><g stroke="#222" stroke-width="2"><path d="M4 20l1-5L16 4l4 4L9 19z" fill="#fff"/><path d="M14 6l4 4"/></g></svg>') + '") 4 24, crosshair';
    var edCss = document.createElement('style');
    edCss.textContent = '.sf-page-prava .prava-3d[data-mode=edit] canvas{cursor:' + ED_CUR + '}' + '.sf-page-prava .prava-3d-edit{position:absolute;z-index:12;min-width:190px;max-width:236px;background:#fff;border:1px solid #c8cbc7;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.16);padding:8px 10px;font:12px/1.3 sans-serif;color:#2f372f}' +
      '.sf-page-prava .prava-3d-edit-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 8px;font-weight:700}' +
      '.sf-page-prava .prava-3d-edit-x{width:26px;height:26px;border:0;border-radius:8px;background:#f1f3f0;color:#2f372f;font:600 15px/1 sans-serif;cursor:pointer}' +
      '.sf-page-prava .prava-3d-edit-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:6px 0}' +
      '.sf-page-prava .prava-3d-edit-w{display:flex;align-items:center;gap:6px}.sf-page-prava .prava-3d-edit-w b{min-width:58px;text-align:center;font-variant-numeric:tabular-nums}' +
      '.sf-page-prava .prava-3d-edit button.prava-3d-ed{min-height:26px;padding:3px 7px;border:1px solid #cfd4cb;border-radius:7px;background:#fff;color:#2f372f;font:600 11px/1.2 sans-serif;cursor:pointer}' +
      '.sf-page-prava .prava-3d-edit button.prava-3d-ed:hover{border-color:#477448}.sf-page-prava .prava-3d-edit button.prava-3d-ed.is-on{background:#477448;border-color:#477448;color:#fff}' +
      '.sf-page-prava .prava-3d-edit button.prava-3d-ed:disabled{opacity:.4;cursor:not-allowed}' +
      '.sf-page-prava .prava-3d-edit-seg{display:flex;flex-wrap:wrap;gap:4px}.sf-page-prava .prava-3d-edit-lbl{font-size:11px;color:#606760;margin:6px 0 3px}' +
      '.sf-page-prava .prava-3d-edit-note{font-size:11px;color:#7a2d1f;margin-top:6px}.sf-page-prava .prava-3d-edit-info{font-size:11px;color:#606760;margin-top:6px}';
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
    function edMergeUpPrava(runs, uW) {   // upper slots: b is absorbed into a (both rows above share the slots)
      EDIT.mUp = EDIT.mUp.filter(function (p) {
        for (var ri = 0; ri < runs.length; ri++) {
          var ids = runs[ri].ids, ib = ids.indexOf(p.b); if (ids.indexOf(p.a) < 0 || ib < 0) continue;
          var over = Math.max(0, uW[p.a] + uW[p.b] - MAX_W), rest = ids.filter(function (id) { return id !== p.a && id !== p.b; }), give = [];
          for (var r = 0; r < rest.length && over > 0; r++) { var g = Math.min(over, MAX_W - uW[rest[r]]); if (g > 0) { give.push([rest[r], g]); over -= g; } }
          if (over > 0) return false;
          give.forEach(function (q) { uW[q[0]] += q[1]; });
          uW[p.a] = Math.min(MAX_W, uW[p.a] + uW[p.b]); delete uW[p.b]; ids.splice(ib, 1); return true;
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
      var L = s.layer === 'd' ? 'd' : 'u', R = runsOf(L), P = posOf(L);
      for (var ri = 0; ri < R.length; ri++) {
        var j = R[ri].indexOf(s.id); if (j < 0 || !P[s.id]) continue;
        [[R[ri][j - 1], 'L'], [R[ri][j + 1], 'R']].forEach(function (q) { var n = q[0]; if (n && P[n]) c.push({ id: n, mesh: n + ':' + L, side: q[1], ok: P[n].w + P[s.id].w <= MAX_W || R[ri].length > 2 }); });
        return { key: s.id, cand: c, merged: EDIT.mUp.some(function (p) { return p.a === s.id; }) };
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
        var il = dimMm('island_len_3a'), iw = dimMm('island_width_3a'), rowI = function (lbl, v, a, mn, mx) { return '<div class="prava-3d-edit-row"><span>' + lbl + '</span><span class="prava-3d-edit-w"><button type="button" class="prava-3d-ed" data-ed="' + a + '-"' + (v <= mn ? ' disabled' : '') + '>−</button><b>' + (v / 10) + ' см</b><button type="button" class="prava-3d-ed" data-ed="' + a + '+"' + (v >= mx ? ' disabled' : '') + '>+</button></span></div>'; };
        edBox.innerHTML = '<div class="prava-3d-edit-head"><span>Остров</span><button type="button" class="prava-3d-edit-x" data-ed="close" aria-label="Затвори">×</button></div>' +
          rowI('Дължина', il, 'il', ISLLIM.len[0], ISLLIM.len[1]) + rowI('Ширина', iw, 'iw', ISLLIM.w[0], ISLLIM.w[1]) +
          '<div class="prava-3d-edit-seg"><button type="button" class="prava-3d-ed" data-ed="irot">Завърти 90°</button><button type="button" class="prava-3d-ed" data-ed="ipos">Върни на мястото</button></div>' +
          '<div class="prava-3d-edit-info">Местене: хванете острова и го плъзнете.</div>';
        edBox.hidden = false; edPlace(); return;
      }
      var html = '', m = sel.upper ? null : edModule(sel.id), p = sel.upper ? edPos(sel) : null;
      if (!sel.upper && !m) { edClose(); return; }
      if (sel.upper && !p) { edClose(); return; }
      var w = sel.upper ? p.w : m.w, title = sel.upper ? (sel.layer === 'd' ? 'Горен шкаф (дълбок ред)' : 'Горен шкаф') : (TALL[m.type] ? 'Колона' : 'Долен шкаф');
      var canW = sel.upper ? !!edSlots : canResize(m), lim = sel.upper ? [MIN_W, MAX_W] : wLim(m.type);
      html += '<div class="prava-3d-edit-head"><span>' + title + '</span><button type="button" class="prava-3d-edit-x" data-ed="close" aria-label="Затвори">×</button></div>';
      html += '<div class="prava-3d-edit-row"><span>Ширина</span><span class="prava-3d-edit-w">' + (canW ? '<button type="button" class="prava-3d-ed" data-ed="w-" aria-label="По-тесен с 5 см"' + (w <= lim[0] ? ' disabled' : '') + '>−</button>' : '') +
        '<b>' + (w / 10) + ' см</b>' + (canW ? '<button type="button" class="prava-3d-ed" data-ed="w+" aria-label="По-широк с 5 см"' + (w >= lim[1] ? ' disabled' : '') + '>+</button>' : '') + '</span></div>';
      if (!sel.upper && m.type === 'genericBase') {
        var f = frontOf(m, m.w / 1000), opts = [['doors', 'Врати'], ['d2', '2 чекм.'], ['d3', '3 чекм.'], ['d4', '4 чекм.']];
        html += '<div class="prava-3d-edit-lbl">' + (f === 'doors' ? 'Шкаф с врати – смени на чекмеджета:' : 'Шкаф с чекмеджета – смени на:') + '</div><div class="prava-3d-edit-seg">' +
          opts.map(function (o) { return '<button type="button" class="prava-3d-ed' + (o[0] === f ? ' is-on' : '') + '" data-ed="front" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
      } else if (!sel.upper && m.type === 'sinkBase') html += '<div class="prava-3d-edit-info">Шкаф за мивка: сменя се само ширината (45–120 см).</div>';
      else if (!sel.upper) html += '<div class="prava-3d-edit-info">Този модул (уред, мивка, ъгъл или колона) е с фиксиран вид.</div>';
      if (sel.upper) {
        var lift = sel.layer !== 'd' && uLift(sel.id), gl = uGlass(edUpKey(sel));   // both on = two glass flaps one above the other
        if (sel.layer !== 'd') html += '<div class="prava-3d-edit-lbl">Отваряне:</div><div class="prava-3d-edit-seg"><button type="button" class="prava-3d-ed' + (!lift ? ' is-on' : '') + '" data-ed="lift" data-v="0">Обикновени врати</button><button type="button" class="prava-3d-ed' + (lift ? ' is-on' : '') + '" data-ed="lift" data-v="1">Повдигащ механизъм</button></div>';
        html += '<div class="prava-3d-edit-lbl">Витрина:</div><div class="prava-3d-edit-seg"><button type="button" class="prava-3d-ed' + (gl ? ' is-on' : '') + '" data-ed="glass">' + (gl ? (lift ? 'Две витрини една над друга ✓' : 'Витрина с осветление ✓') : 'Направи витрина') + '</button></div>';
        if (!edSlots) html += '<div class="prava-3d-edit-info">Ширината на горния шкаф следва долния шкаф под него.</div>';
      }
      var mi = (!sel.upper || edSlots) ? edMergeInfo(sel) : null;
      if (mi && (mi.cand.length || mi.merged)) {
        var sx0 = edScreenX(edKey(sel));
        html += '<div class="prava-3d-edit-lbl">Сливане (до ' + (MAX_W / 10) + ' см):</div><div class="prava-3d-edit-seg">' +
          mi.cand.slice().sort(function (p, q) { return edScreenX(p.mesh) - edScreenX(q.mesh); }).map(function (n) {
            var lft = edScreenX(n.mesh) < sx0;
            return '<button type="button" class="prava-3d-ed" data-ed="merge" data-v="' + n.id + '"' + (n.ok ? '' : ' disabled title="Няма място: общата ширина е над ' + (MAX_W / 10) + ' см"') + '>' + (lft ? '← Слей с левия' : 'Слей с десния →') + '</button>';
          }).join('') + (mi.merged ? '<button type="button" class="prava-3d-ed" data-ed="split">Раздели обратно</button>' : '') + '</div>';
      }
      if (edNote) html += '<div class="prava-3d-edit-note">' + edNote + '</div>';
      edBox.innerHTML = html; edBox.hidden = false; edPlace();
    }
    var edV = null;
    function edPlace() {   // the card goes next to the selected cabinet, never on top of it (above, below, right or left - the first side with room)
      if (!sel || edBox.hidden || !T) return;
      if (edManual) { var mw = host.clientWidth - (edBox.offsetWidth || 230) - 4, mh = host.clientHeight - (edBox.offsetHeight || 160) - 4; edBox.style.left = Math.round(Math.max(4, Math.min(mw, edManual.l))) + 'px'; edBox.style.top = Math.round(Math.max(4, Math.min(mh, edManual.t))) + 'px'; return; }
      var g = edMesh(sel); if (!g) return;   // edMesh also finds the island
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
      var h = ev.target.closest('.prava-3d-edit-head'); if (!h || ev.target.closest('button')) return;
      edDrag = { x: ev.clientX, y: ev.clientY, l: edBox.offsetLeft, t: edBox.offsetTop, id: ev.pointerId }; try { edBox.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault();
    });
    edBox.addEventListener('pointermove', function (ev) {
      if (!edDrag || ev.pointerId !== edDrag.id) return;
      edManual = { l: edDrag.l + ev.clientX - edDrag.x, t: edDrag.t + ev.clientY - edDrag.y }; edPlace();
    });
    ['pointerup', 'pointercancel'].forEach(function (t) { edBox.addEventListener(t, function () { edDrag = null; }); });
    (function () { var st = document.createElement('style'); st.textContent = '.prava-3d-edit-head{cursor:move;touch-action:none;user-select:none}.prava-3d-edit-head span::before{content:"⠿ ";color:#9aa09a;font-weight:400}'; document.head.appendChild(st); })();
    function edSelect(s) { sel = s; edNote = ''; clearHL(); setHL(edKey(s)); edRender(); }
    function edClose() { sel = null; edBox.hidden = true; edNote = ''; clearHL(); }
    function edRebuild() { inputsSig = ''; sync(true); if (sel) { if (edMesh(sel)) { hl.key = null; setHL(edKey(sel)); } edRender(); } }
    edBox.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-ed]'); if (!b || !sel) return; var a = b.dataset.ed; edNote = '';
      if (a === 'close') { edClose(); return; }
      if (sel.island) {
        var stp = a.slice(-1) === '+' ? 50 : -50;
        if (a === 'il-' || a === 'il+') islSetDim('island_len_3a', Math.max(ISLLIM.len[0], Math.min(ISLLIM.len[1], dimMm('island_len_3a') + stp)));
        else if (a === 'iw-' || a === 'iw+') islSetDim('island_width_3a', Math.max(ISLLIM.w[0], Math.min(ISLLIM.w[1], dimMm('island_width_3a') + stp)));
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
      if (d.pk.island) { if (Math.abs(ev.clientX - d.x) + Math.abs(ev.clientY - d.y) < 10) edSelect({ id: 'island', island: true }); return true; }
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
      else if (a === 'edit') setMode('edit');
      else if (a === 'auto') { ISL = { pos: null, rot: false }; FREE.pos = {}; EDIT = { low: {}, up: {}, slot: {}, mLow: [], mUp: [] }; edClose(); dirty = false; uorder = null; dorder = null; order = []; inputsSig = ''; sync(true); }
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
        finally { hide.forEach(function (o, i) { o.visible = prev[i]; }); if (r) r.dispose(); if (sel && edMesh(sel)) setHL(edKey(sel)); }
      }
      function sketchLegend() {
        var nm = { fridge: 'fridge', ovenTower: 'tall oven tower', ovenHobBase: 'oven with hob', hobBase: 'hob', sinkBase: 'sink', dishwasher: 'dishwasher', washingMachine: 'washing machine', applianceTower: 'built-in appliance tower', basket: 'narrow bottle pullout' };
        function nmOf(m) {   // what the image model must draw: built-in appliances stay hidden behind cabinet fronts
          if (m.type === 'fridge') return m.applianceType === 'free_standing' ? 'free-standing black fridge' : 'built-in fridge behind cabinet doors';
          if (m.type === 'dishwasher') return m.free ? 'free-standing black dishwasher' : 'integrated dishwasher behind a front';
          if (m.type === 'washingMachine') return m.free ? 'free-standing washer' : 'built-in washer behind a front';
          if (m.type === 'ovenTower') { var a = (m.appliances || []).map(function (x) { return x === 'microwave' ? 'microwave' : x === 'coffeeMachine' ? 'coffee machine' : 'oven'; }); return 'tall oven tower (built-in ' + (a.length ? a.join(', ') : 'oven') + ')'; }
          return nm[m.type];
        }
        var out = items.filter(function (m) { return nm[m.type]; }).map(nmOf);
        var ci = curInp || {};
        function surf(name, field, gloss, grain, has) {
          if (!has) return; var id = fieldVal(field); if (!id) return; var isWood = (catKind[field] || {})[id] === 'wood', parts = [name + ':'];
          parts.push(isWood ? 'wood, ' + (grain === 'h' ? 'horizontal' : 'vertical') + ' grain, continuous across doors,' : 'plain colour,');
          parts.push(gloss ? 'HIGH GLOSS' : 'matte');
          out.push(parts.join(' '));
        }
        surf('lower fronts', 'lower_finish', ci.glL, ci.gL, ci.cLower !== null && ci.cLower !== undefined);
        surf('upper fronts', 'upper_finish', ci.glU, ci.gU, ci.cUpper !== null && ci.cUpper !== undefined);
        if (ci.deep && fieldVal('deep_finish')) surf('deep upper row', 'deep_finish', ci.glD, ci.gD, ci.cDeep !== null && ci.cDeep !== undefined);
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
      root.pravaLayout = { refresh: soon, current: null, capture: capture, sketchLegend: sketchLegend, editor: { select: function (s) { setMode('edit', true); edSelect(s); }, close: function () { edClose(); }, state: function () { return { EDIT: EDIT, sel: sel, note: edNote, html: edBox.innerHTML }; }, act: function (a, v) { var b = document.createElement('button'); b.dataset.ed = a; if (v !== undefined) b.dataset.v = v; edBox.appendChild(b); b.click(); b.remove(); } }, debug: function () { return { scene: scene, camera: camera, plan: plan, items: items, order: order }; } };
      soon();
    }).catch(fail);
    root.pravaLayout = root.pravaLayout || { refresh: function () {}, current: null };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})(typeof window !== 'undefined' ? window : globalThis);
