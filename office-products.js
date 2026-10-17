/* /verde-office: two tabs — "Digital Passport" (the existing office tool, untouched) and "Нов проект" (adds a finished
   project to the e-commerce gallery: photos → resize/WebP, free or AI enhancement, materials from the catalogue,
   AI proposal of every CMS field, unique names, position "between X and Y", draft or publish). */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/products-tool';
  var CATALOG = 'https://cdn.jsdelivr.net/gh/verdem98-sketch/smart-form@b99d219810b6455e19d675803a59073216647b0d/catalog/';
  var KITCHEN = '69665361714166f5f9c55d96';
  var MAX_EDGE = 1920, SMALL_EDGE = 768;
  var LS_TAB = 'vo-tab', LS_TOKEN = 'op-token', LS_STATE = 'op-state';

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return null; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }

  /* ---------------- styles ---------------- */
  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vo-tabs{display:flex;gap:8px;margin:16px 0 20px;flex-wrap:wrap}',
      '.vo-tab{flex:1 1 180px;padding:14px 18px;border:1px solid #cfd4cb;border-radius:12px;background:#fff;color:#2f332f;font:600 15px/1.2 Montserrat,Arial,sans-serif;cursor:pointer;text-align:center}',
      '.vo-tab.is-on{background:#2f332f;border-color:#2f332f;color:#fff}',
      '.op{font:14px/1.5 Montserrat,Arial,sans-serif;color:#2f332f}',
      '.op h2{font:700 18px/1.3 Montserrat,Arial,sans-serif;margin:0 0 4px}.op h3{font:700 15px/1.3 Montserrat,Arial,sans-serif;margin:0 0 10px}',
      '.op-card{background:#fff;border:1px solid #e1e4df;border-radius:14px;padding:18px;margin:0 0 16px}',
      '.op-muted{color:#6a716b;font-size:13px}.op-err{color:#9b1c10;font-size:13px}.op-ok{color:#477448;font-size:13px}',
      '.op input[type=text],.op input[type=password],.op textarea,.op select{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cfd4cb;border-radius:8px;font:14px/1.4 Montserrat,Arial,sans-serif;background:#fff;color:#2f332f}',
      '.op textarea{min-height:80px;resize:vertical}.op label.op-l{display:block;font-weight:600;font-size:13px;margin:12px 0 4px}',
      '.op-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:8px 16px;border:1px solid #477448;border-radius:8px;background:#fff;color:#477448;font:600 14px Montserrat,Arial,sans-serif;cursor:pointer}',
      '.op-btn.pri{background:#477448;color:#fff}.op-btn.dark{background:#2f332f;border-color:#2f332f;color:#fff}.op-btn:disabled{opacity:.5;cursor:default}.op-btn.sm{min-height:32px;padding:4px 10px;font-size:13px}',
      '.op-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.op-grow{flex:1 1 200px}',
      '.op-drop{border:2px dashed #b9c2b5;border-radius:12px;padding:24px;text-align:center;cursor:pointer;background:#f7f8f5}',
      '.op-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin-top:12px}',
      '.op-ph{border:1px solid #e1e4df;border-radius:12px;overflow:hidden;background:#fafbf9;display:flex;flex-direction:column}',
      '.op-ph.is-main{border:2px solid #477448}.op-ph img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;background:#eee}',
      '.op-ph-b{padding:10px;display:flex;flex-direction:column;gap:8px}.op-chips{display:flex;gap:6px;flex-wrap:wrap}',
      '.op-chip{padding:3px 9px;border:1px solid #cfd4cb;border-radius:999px;background:#fff;font-size:12px;cursor:pointer}.op-chip.is-on{background:#477448;border-color:#477448;color:#fff}',
      '.op-badge{display:inline-block;padding:2px 8px;border-radius:999px;background:#477448;color:#fff;font-size:11px;font-weight:700}',
      '.op-mat{display:grid;grid-template-columns:150px 120px 1fr auto;gap:8px;align-items:start;margin:0 0 10px}',
      '.op-mat-r{position:relative}.op-dd{position:absolute;z-index:20;left:0;right:0;top:100%;background:#fff;border:1px solid #cfd4cb;border-radius:8px;max-height:260px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.12)}',
      '.op-dd div{display:flex;gap:8px;align-items:center;padding:6px 8px;cursor:pointer}.op-dd div:hover{background:#eef3ec}.op-dd img{width:32px;height:32px;object-fit:cover;border-radius:4px}',
      '.op-f{margin:0 0 14px}.op-f-h{display:flex;justify-content:space-between;align-items:center;gap:8px}.op-cnt{font-size:12px;color:#6a716b}.op-cnt.over{color:#9b1c10;font-weight:700}',
      '.op-cats{display:flex;flex-wrap:wrap;gap:8px}.op-cats label{display:flex;gap:6px;align-items:center;padding:6px 10px;border:1px solid #cfd4cb;border-radius:8px;cursor:pointer}',
      '.op-gal{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;max-height:520px;overflow:auto;padding:4px}',
      '.op-g{position:relative;border-radius:8px;overflow:hidden;border:1px solid #e1e4df;background:#fff}.op-g img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}',
      '.op-g span{display:block;padding:4px 6px;font-size:11px;line-height:1.3}.op-g small{color:#8a908a}',
      '.op-slot{display:flex;align-items:center;justify-content:center;min-height:40px;border:2px dashed #b9c2b5;border-radius:8px;color:#477448;font-weight:700;cursor:pointer;font-size:12px;text-align:center;padding:4px}',
      '.op-slot.is-on{background:#477448;border-color:#477448;color:#fff;min-height:90px}',
      '.op-bar{position:sticky;bottom:0;z-index:30;background:rgba(255,255,255,.96);border-top:1px solid #e1e4df;padding:12px;display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;border-radius:12px 12px 0 0}',
      '.op-busy{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:op-spin .8s linear infinite}@keyframes op-spin{to{transform:rotate(360deg)}}',
      '@media(max-width:700px){.op-mat{grid-template-columns:1fr 1fr}.op-mat .op-mat-r{grid-column:1/-1}.op-card{padding:14px}}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ---------------- tabs ---------------- */
  var shell, app;
  function tabs() {
    shell = $('.office-shell'); if (!shell) return false;
    var header = $('.office-header', shell);
    var bar = el('div', 'vo-tabs', '<button type="button" class="vo-tab" data-tab="passport">Digital Passport</button><button type="button" class="vo-tab" data-tab="products">Нов проект в галерията</button>');
    if (header) header.after(bar); else shell.prepend(bar);
    app = el('div', 'op'); app.hidden = true; shell.appendChild(app);
    function show(t) {
      [].forEach.call(shell.children, function (c) { if (c === header || c === bar || c === app || c.classList.contains('office-embed')) return; if (t === 'products') { if (!c.hasAttribute('data-vo-was')) c.setAttribute('data-vo-was', c.style.display || ''); c.style.display = 'none'; } else if (c.hasAttribute('data-vo-was')) { c.style.display = c.getAttribute('data-vo-was'); c.removeAttribute('data-vo-was'); } });
      app.hidden = t !== 'products';
      $$('.vo-tab', bar).forEach(function (b) { b.classList.toggle('is-on', b.dataset.tab === t); });
      ls(LS_TAB, t);
      if (t === 'products' && !app.dataset.ready) { app.dataset.ready = '1'; start(); }
    }
    bar.addEventListener('click', function (e) { var b = e.target.closest('.vo-tab'); if (b) show(b.dataset.tab); });
    show(ls(LS_TAB) === 'products' ? 'products' : 'passport');
    return true;
  }

  /* ---------------- API ---------------- */
  function call(action, data) {
    var body = Object.assign({ action: action }, data || {});
    // the key comes from the custom code of this password-protected page, so the tool needs no second password
    var h = { 'Content-Type': 'application/json' };
    if (window.__verdeOfficeKey) h['X-Office-Key'] = window.__verdeOfficeKey; else h.Authorization = 'Bearer ' + (ls(LS_TOKEN) || '');
    return fetch(API, { method: 'POST', headers: h, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }).then(function (j) { if (j && j.auth === false) { ls(LS_TOKEN, null); login(); throw new Error('Влезте отново'); } return j; }); });
  }

  /* ---------------- state ---------------- */
  var S = { photos: [], mainCategory: KITCHEN, kitchenSub: [], materials: [], note: '', fields: null, proposal: null, slot: null, galleryFilter: 'cat' };
  var G = null; // gallery + categories from the server
  function saveState() {
    var keep = { mainCategory: S.mainCategory, kitchenSub: S.kitchenSub, materials: S.materials, note: S.note, fields: S.fields, slot: S.slot,
      photos: S.photos.filter(function (p) { return p.serverId; }).map(function (p) { return { serverId: p.serverId, url: p.url, alt: p.alt || '' }; }) };
    ls(LS_STATE, JSON.stringify(keep));
  }

  /* ---------------- login ---------------- */
  function login() {
    app.innerHTML = '<div class="op-card"><h2>Нов проект в галерията</h2><p class="op-muted">Въведи паролата за инструмента.</p>' +
      '<div class="op-row"><input type="password" class="op-grow" id="op-pw" placeholder="Парола" autocomplete="current-password"><button class="op-btn pri" id="op-login">Вход</button></div><div class="op-err" id="op-login-err"></div></div>';
    function go() {
      $('#op-login-err').textContent = '';
      call('login', { password: $('#op-pw').value }).then(function (j) { if (j.ok) { ls(LS_TOKEN, j.token); start(); } else $('#op-login-err').textContent = j.error || 'Грешка'; });
    }
    $('#op-login').onclick = go; $('#op-pw').onkeydown = function (e) { if (e.key === 'Enter') go(); };
  }

  function start() {
    if (!window.__verdeOfficeKey && !ls(LS_TOKEN)) return login();
    app.innerHTML = '<div class="op-card"><span class="op-busy"></span> Зареждам галерията…</div>';
    call('gallery').then(function (j) {
      if (!j.ok) { app.innerHTML = '<div class="op-card op-err">' + esc(j.error) + '</div>'; return; }
      G = j;
      try { var st = JSON.parse(ls(LS_STATE) || 'null'); if (st) { Object.assign(S, st); S.photos = (st.photos || []).map(function (p) { return { serverId: p.serverId, url: p.url, alt: p.alt, variants: [{ label: 'Запазена', url: p.url, serverId: p.serverId }], active: 0 }; }); } } catch (e) { /* fresh */ }
      render();
    }).catch(function () { /* login shown */ });
  }

  /* ---------------- image helpers ---------------- */
  var WEBP = (function () { try { return document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0; } catch (e) { return false; } })();
  function loadImg(src) { return new Promise(function (ok, no) { var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { ok(i); }; i.onerror = no; i.src = src; }); }
  function toCanvas(img, edge) {
    var w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, edge / Math.max(w, h));
    var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    var g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height); return c;
  }
  function encode(c, maxChars) {
    var type = WEBP ? 'image/webp' : 'image/jpeg', q = WEBP ? 0.82 : 0.85, d = c.toDataURL(type, q);
    while (d.length > (maxChars || 1800000) && q > 0.5) { q -= 0.07; d = c.toDataURL(type, q); }
    return d;
  }
  // free enhancement: grey-world white balance (gentle), levels from the 0.5/99.5 % luminance, a little contrast/saturation and sharpening
  function enhance(c) {
    var g = c.getContext('2d'), W = c.width, H = c.height, im = g.getImageData(0, 0, W, H), d = im.data, n = W * H, i;
    var sr = 0, sg = 0, sb = 0, hist = new Uint32Array(256);
    for (i = 0; i < d.length; i += 4) { sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; hist[(d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8]++; }
    var avg = (sr + sg + sb) / 3, cl = function (x) { return Math.max(0.9, Math.min(1.1, x)); };
    var gr = cl(1 + (avg / sr * 1 - 1) * 0.6), gg = cl(1 + (avg / sg - 1) * 0.6), gb = cl(1 + (avg / sb - 1) * 0.6);
    var acc = 0, lo = 0, hi = 255;
    for (i = 0; i < 256; i++) { acc += hist[i]; if (acc <= n * 0.005) lo = i; if (acc <= n * 0.995) hi = i; }
    hi = Math.max(hi, lo + 40); lo = Math.min(lo, 40); hi = Math.max(hi, 215);
    var lut = new Uint8ClampedArray(256);
    for (i = 0; i < 256; i++) { var x = (i - lo) / (hi - lo); x = Math.max(0, Math.min(1, x)); x = x + 0.08 * Math.sin(Math.PI * 2 * x) * -0.5 + 0.04 * Math.sin(Math.PI * x); lut[i] = Math.round(Math.max(0, Math.min(1, x)) * 255); }
    for (i = 0; i < d.length; i += 4) {
      var r = lut[Math.min(255, d[i] * gr | 0)], gg2 = lut[Math.min(255, d[i + 1] * gg | 0)], b = lut[Math.min(255, d[i + 2] * gb | 0)];
      var l = (r * 77 + gg2 * 150 + b * 29) >> 8, sat = 1.06;
      d[i] = l + (r - l) * sat; d[i + 1] = l + (gg2 - l) * sat; d[i + 2] = l + (b - l) * sat;
    }
    // light unsharp mask on the luminance (3×3)
    var src = new Uint8ClampedArray(d), a = 0.35, row = W * 4;
    for (var y = 1; y < H - 1; y++) for (var x2 = 1; x2 < W - 1; x2++) {
      var p = (y * W + x2) * 4;
      for (var ch = 0; ch < 3; ch++) {
        var blur = (src[p + ch - 4] + src[p + ch + 4] + src[p + ch - row] + src[p + ch + row] + src[p + ch] * 4) / 8;
        d[p + ch] = src[p + ch] + (src[p + ch] - blur) * a;
      }
    }
    g.putImageData(im, 0, 0); return c;
  }

  function addFiles(files) {
    [].slice.call(files).forEach(function (f) {
      if (!/^image\//.test(f.type)) return;
      var ph = { name: f.name, variants: [], active: 0, alt: '', busy: 'Подготвям…' };
      S.photos.push(ph); renderPhotos();
      var url = URL.createObjectURL(f);
      loadImg(url).then(function (img) {
        var c = toCanvas(img, MAX_EDGE);
        ph.variants.push({ label: 'Оригинал', url: encode(c) });
        ph.busy = ''; URL.revokeObjectURL(url); renderPhotos();
      }).catch(function () { ph.busy = 'Неуспешно зареждане (формат?)'; renderPhotos(); });
    });
  }
  function current(ph) { return ph.variants[ph.active] || ph.variants[0]; }
  function upload(v) {
    if (v.serverId) return Promise.resolve(v);
    return call('upload', { dataUrl: v.url }).then(function (j) { if (!j.ok) throw new Error(j.error); v.serverId = j.id; v.publicUrl = j.url; return v; });
  }
  function small(v) {
    return loadImg(v.url).then(function (img) { return toCanvas(img, SMALL_EDGE).toDataURL('image/jpeg', 0.72); });
  }

  /* ---------------- render ---------------- */
  function render() {
    app.innerHTML = '';
    app.appendChild(el('div', 'op-card', '<div class="op-row" style="justify-content:space-between"><div><h2>Нов проект в галерията</h2><div class="op-muted">Снимки → материали → AI предложение → позиция → чернова или публикуване.</div></div><button class="op-btn sm" id="op-reset">Започни отначало</button></div>'));
    $('#op-reset', app).onclick = function () { if (confirm('Да изчистя ли всичко по този проект?')) { ls(LS_STATE, null); S = { photos: [], mainCategory: KITCHEN, kitchenSub: [], materials: [], note: '', fields: null, proposal: null, slot: null, galleryFilter: 'cat' }; render(); } };

    var photos = el('div', 'op-card', '<h3>1. Снимки</h3><div class="op-drop" id="op-drop">Пуснете снимките тук или <b>изберете файлове</b><div class="op-muted">Автоматично се смаляват до ' + MAX_EDGE + ' px и се записват като ' + (WEBP ? 'WebP' : 'JPEG') + '.</div><input type="file" id="op-file" accept="image/*" multiple hidden></div><div class="op-photos" id="op-photos"></div>');
    app.appendChild(photos);
    var drop = $('#op-drop', photos), file = $('#op-file', photos);
    drop.onclick = function () { file.click(); };
    file.onchange = function () { addFiles(file.files); file.value = ''; };
    drop.ondragover = function (e) { e.preventDefault(); }; drop.ondrop = function (e) { e.preventDefault(); addFiles(e.dataTransfer.files); };

    app.appendChild(kindCard());
    app.appendChild(el('div', 'op-card', '<h3>3. Бележка за проекта (по желание)</h3><textarea id="op-note" placeholder="Напр. ъглова кухня, продължава към дневната, осветление под шкафовете, клиентът искаше топла визия…"></textarea>'));
    $('#op-note', app).value = S.note || ''; $('#op-note', app).oninput = function (e) { S.note = e.target.value; saveState(); };
    app.appendChild(el('div', 'op-card', '<h3>4. Полета за сайта</h3><div id="op-fields"></div>'));
    app.appendChild(el('div', 'op-card', '<h3>5. Позиция в галерията</h3><div class="op-row" style="margin-bottom:8px"><span class="op-chip" data-gf="cat">Само тази категория</span><span class="op-chip" data-gf="all">Всички проекти</span><span class="op-muted" id="op-slot-txt"></span></div><div class="op-gal" id="op-gal"></div>'));
    $$('[data-gf]', app).forEach(function (c) { c.onclick = function () { S.galleryFilter = c.dataset.gf; renderGallery(); }; });
    var bar = el('div', 'op-bar', '<span class="op-muted" id="op-bar-msg" style="margin-right:auto"></span><button class="op-btn" id="op-draft">Запази като чернова</button><button class="op-btn pri" id="op-pub">Публикувай</button>');
    app.appendChild(bar);
    $('#op-draft', app).onclick = function () { submit(true, false); };
    $('#op-pub', app).onclick = function () { submit(false, false); };
    renderPhotos(); renderMaterials(); renderFields(); renderGallery();
  }

  function renderPhotos() {
    var box = $('#op-photos', app); if (!box) return;
    box.innerHTML = '';
    S.photos.forEach(function (ph, idx) {
      var v = current(ph), card = el('div', 'op-ph' + (idx === 0 ? ' is-main' : ''));
      card.innerHTML = (v ? '<img src="' + esc(v.url) + '" alt="">' : '<div style="aspect-ratio:4/3;display:flex;align-items:center;justify-content:center" class="op-muted">' + esc(ph.busy || '') + '</div>') +
        '<div class="op-ph-b">' +
        '<div class="op-row" style="justify-content:space-between">' + (idx === 0 ? '<span class="op-badge">Главна</span>' : '<button class="op-btn sm" data-a="main">Направи главна</button>') +
        '<span class="op-row"><button class="op-btn sm" data-a="up" title="Наляво">←</button><button class="op-btn sm" data-a="down" title="Надясно">→</button><button class="op-btn sm" data-a="del" title="Махни">✕</button></span></div>' +
        '<div class="op-chips">' + ph.variants.map(function (x, i) { return '<span class="op-chip' + (i === ph.active ? ' is-on' : '') + '" data-v="' + i + '">' + esc(x.label) + '</span>'; }).join('') + '</div>' +
        (ph.busy ? '<div class="op-muted"><span class="op-busy"></span> ' + esc(ph.busy) + '</div>' : '') + (ph.err ? '<div class="op-err">' + esc(ph.err) + '</div>' : '') +
        '<button class="op-btn sm" data-a="free">Подобри (безплатно)</button>' +
        '<textarea data-a="instr" placeholder="Какво да промени AI? Напр. „махни висящата крушка от тавана“" style="min-height:56px"></textarea>' +
        '<div class="op-row"><button class="op-btn sm" data-a="ai">AI пробно (~0,02 $)</button><button class="op-btn sm dark" data-a="aihq">AI финално (~0,05 $)</button></div>' +
        '<label class="op-l" style="margin:0">Alt текст</label><textarea data-a="alt" style="min-height:48px" placeholder="Попълва се от AI предложението">' + esc(ph.alt || '') + '</textarea>' +
        '</div>';
      $('[data-a="instr"]', card).value = ph.instr || '';
      card.addEventListener('click', function (e) {
        var t = e.target.closest('[data-a],[data-v]'); if (!t || t.tagName === 'TEXTAREA') return;
        if (t.dataset.v) { ph.active = Number(t.dataset.v); renderPhotos(); return; }
        var a = t.dataset.a, list = S.photos;
        if (a === 'main') { list.splice(idx, 1); list.unshift(ph); }
        if (a === 'up' && idx > 0) { list[idx] = list[idx - 1]; list[idx - 1] = ph; }
        if (a === 'down' && idx < list.length - 1) { list[idx] = list[idx + 1]; list[idx + 1] = ph; }
        if (a === 'del') list.splice(idx, 1);
        if (a === 'free') return freeEnhance(ph);
        if (a === 'ai' || a === 'aihq') return aiEdit(ph, a === 'aihq' ? 'high' : 'medium');
        renderPhotos(); saveState();
      });
      $('[data-a="instr"]', card).oninput = function (e) { ph.instr = e.target.value; };
      $('[data-a="alt"]', card).oninput = function (e) { ph.alt = e.target.value; saveState(); };
      box.appendChild(card);
    });
  }
  function freeEnhance(ph) {
    var base = ph.variants[0]; if (!base) return;
    ph.busy = 'Подобрявам…'; renderPhotos();
    loadImg(base.url).then(function (img) {
      var c = enhance(toCanvas(img, MAX_EDGE));
      ph.variants = ph.variants.filter(function (v) { return v.label !== 'Подобрена'; });
      ph.variants.splice(1, 0, { label: 'Подобрена', url: encode(c) }); ph.active = 1; ph.busy = ''; renderPhotos();
    }).catch(function () { ph.busy = ''; ph.err = 'Неуспешно подобряване'; renderPhotos(); });
  }
  function aiEdit(ph, quality) {
    var v = current(ph); if (!v) return;
    ph.err = ''; ph.busy = 'AI работи… (30–90 сек.)'; renderPhotos();
    upload(v).then(function () { return call('edit', { imageId: v.serverId, instruction: ph.instr || '', quality: quality }); }).then(function (j) {
      if (!j.ok) throw new Error(j.error);
      return new Promise(function (ok, no) {
        var n = 0;
        (function poll() {
          call('edit-status', { jobId: j.jobId }).then(function (s) {
            if (s.status === 'done') return ok(s);
            if (s.status === 'failed') return no(new Error(s.error || 'AI не успя'));
            if (++n > 80) return no(new Error('AI не отговори навреме'));
            setTimeout(poll, 4000);
          }).catch(no);
        })();
      });
    }).then(function (s) {
      var nAi = ph.variants.filter(function (x) { return /^AI/.test(x.label); }).length + 1;
      ph.variants.push({ label: 'AI ' + nAi + (quality === 'high' ? ' HQ' : ''), url: location.origin + s.url, serverId: s.resultId });
      ph.active = ph.variants.length - 1; ph.busy = ''; renderPhotos(); saveState();
    }).catch(function (e) { ph.busy = ''; ph.err = e.message; renderPhotos(); });
  }

  /* ---------------- kind + materials ---------------- */
  var CAT = {};
  function catalog(file) { if (!CAT[file]) CAT[file] = fetch(CATALOG + file + '.json').then(function (r) { return r.json(); }); return CAT[file]; }
  var ROLES = ['Корпус', 'Лице', 'Лице 2', 'Плот', 'Гръб', 'Плот и гръб', 'Остров', 'Друго'];
  var SUBSTR = ['', 'ПДЧ', 'МДФ', 'МДФ гланц', 'МДФ акрилен', 'Компакт', 'Фурнир', 'Масив'];
  function kindCard() {
    var c = el('div', 'op-card');
    var mains = G.main || {}, opts = Object.keys(mains).map(function (id) { return '<option value="' + id + '"' + (id === S.mainCategory ? ' selected' : '') + '>' + esc(mains[id].name) + '</option>'; }).join('');
    var subs = G.kitchenSub || {};
    c.innerHTML = '<h3>2. Вид и материали</h3><label class="op-l">Основна категория</label><select id="op-main">' + opts + '</select>' +
      '<div id="op-sub" style="margin-top:8px"></div><label class="op-l">Материали (до 5 реда, както в галерията)</label><div id="op-mats"></div><button class="op-btn sm" id="op-addmat">+ Добави материал</button>';
    $('#op-main', c).onchange = function (e) { S.mainCategory = e.target.value; if (S.mainCategory !== KITCHEN) S.kitchenSub = []; renderSub(); renderGallery(); saveState(); };
    function renderSub() {
      var box = $('#op-sub', c); box.innerHTML = '';
      if (S.mainCategory !== KITCHEN) return;
      box.innerHTML = '<div class="op-cats">' + Object.keys(subs).map(function (id) { return '<label><input type="checkbox" value="' + id + '"' + (S.kitchenSub.indexOf(id) >= 0 ? ' checked' : '') + '> ' + esc(subs[id]) + '</label>'; }).join('') + '</div>';
      $$('input', box).forEach(function (i) { i.onchange = function () { S.kitchenSub = $$('input:checked', box).map(function (x) { return x.value; }); saveState(); }; });
    }
    renderSub();
    $('#op-addmat', c).onclick = function () { if (S.materials.length >= 5) return; S.materials.push({ role: S.materials.length ? 'Лице' : 'Корпус', sub: 'ПДЧ', line: '' }); renderMaterials(); };
    return c;
  }
  function brand(m) { return /perfectsense/i.test(m) ? 'PerfectSense EGGER' : String(m || '').toUpperCase(); }
  function lineOf(mat) {
    var d = mat.decor; if (!d) return mat.line || '';
    return (mat.role + ': ' + [mat.sub, d.code, d.surface, d.name, brand(d.brand)].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim();
  }
  function renderMaterials() {
    var box = $('#op-mats', app); if (!box) return;
    box.innerHTML = '';
    S.materials.forEach(function (m, i) {
      var row = el('div', 'op-mat');
      row.innerHTML = '<select data-k="role">' + ROLES.map(function (r) { return '<option' + (r === m.role ? ' selected' : '') + '>' + r + '</option>'; }).join('') + '</select>' +
        '<select data-k="sub">' + SUBSTR.map(function (r) { return '<option value="' + r + '"' + (r === m.sub ? ' selected' : '') + '>' + (r || '—') + '</option>'; }).join('') + '</select>' +
        '<div class="op-mat-r"><input type="text" data-k="q" placeholder="Търси декор: код или име (напр. U767, Дъб Касела)"><input type="text" data-k="line" style="margin-top:6px" placeholder="Ред за сайта"><div class="op-dd" hidden></div></div>' +
        '<button class="op-btn sm" data-k="del">✕</button>';
      $('[data-k="line"]', row).value = m.line || lineOf(m);
      function upd() { m.line = lineOf(m); $('[data-k="line"]', row).value = m.line; saveState(); }
      $('[data-k="role"]', row).onchange = function (e) { m.role = e.target.value; upd(); };
      $('[data-k="sub"]', row).onchange = function (e) { m.sub = e.target.value; upd(); };
      $('[data-k="line"]', row).oninput = function (e) { m.line = e.target.value; m.decor = m.decor && null; saveState(); };
      $('[data-k="del"]', row).onclick = function () { S.materials.splice(i, 1); renderMaterials(); saveState(); };
      var dd = $('.op-dd', row), q = $('[data-k="q"]', row), t = 0;
      q.oninput = function () {
        clearTimeout(t); t = setTimeout(function () {
          var s = q.value.trim().toLowerCase(); if (s.length < 2) { dd.hidden = true; return; }
          Promise.all([catalog('cabinet'), catalog('countertop')]).then(function (all) {
            var out = [];
            all[0].items.forEach(function (r) { if ((r[1] + ' ' + r[3] + ' ' + r[4]).toLowerCase().indexOf(s) >= 0) out.push({ brand: r[1], code: r[3], name: r[4], surface: '', img: all[0].base + encodeURIComponent(r[5]) }); });
            all[1].items.forEach(function (r) { if ((r[1] + ' ' + r[2] + ' ' + r[3]).toLowerCase().indexOf(s) >= 0) out.push({ brand: r[1], code: r[2], surface: r[3], name: '', img: r[4] }); });
            dd.innerHTML = out.slice(0, 30).map(function (o, k) { return '<div data-i="' + k + '"><img src="' + esc(o.img) + '" alt=""><span><b>' + esc(o.code + (o.surface ? ' ' + o.surface : '')) + '</b> ' + esc(o.name) + ' <small class="op-muted">' + esc(o.brand) + '</small></span></div>'; }).join('') || '<div class="op-muted">Няма резултат — напишете реда ръчно.</div>';
            dd.hidden = false;
            $$('[data-i]', dd).forEach(function (d) { d.onclick = function () { m.decor = out[Number(d.dataset.i)]; dd.hidden = true; q.value = ''; upd(); }; });
          });
        }, 200);
      };
      q.onblur = function () { setTimeout(function () { dd.hidden = true; }, 200); };
      box.appendChild(row);
    });
  }

  /* ---------------- fields ---------------- */
  var LIMITS = { teaser: 200, description: 600, seoDescription: 250, seoLabel: 120, name: 40 };
  function lines() { return S.materials.map(function (m) { return m.line || lineOf(m); }).filter(Boolean); }
  function categoriesNow() { return [S.mainCategory].concat(S.kitchenSub); }
  function propose(only, btn) {
    var photos = S.photos.filter(function (p) { return current(p); });
    if (!photos.length) { msg('Първо добави снимки.', true); return; }
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="op-busy"></span> AI мисли…'; }
    var reject = only && only.indexOf('name') >= 0 && S.fields ? [S.fields.name].concat(S.fields.nameAlternatives || []) : [];
    Promise.all(photos.slice(0, 6).map(function (p) { return small(current(p)); })).then(function (imgs) {
      return call('propose', { images: imgs, materials: lines(), note: S.note, mainCategory: S.mainCategory, categories: categoriesNow(), only: only || null, current: S.fields || null, rejectNames: reject });
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error);
      var p = j.proposal;
      if (!S.fields || !only) S.proposal = JSON.parse(JSON.stringify(p));
      S.fields = Object.assign(S.fields || {}, p);
      if (!only || only.indexOf('alts') >= 0) {
        photos.forEach(function (ph, i) { if (p.alts[i]) ph.alt = p.alts[i]; });
        if (p.mainImage > 0 && p.mainImage < photos.length && !only) { var m = photos[p.mainImage]; S.photos.splice(S.photos.indexOf(m), 1); S.photos.unshift(m); }
      }
      if (!only || only.indexOf('categories') >= 0) S.kitchenSub = (p.categories || []).filter(function (c) { return (G.kitchenSub || {})[c]; });
      saveState(); renderFields(); renderPhotos(); app.querySelector('#op-sub') && kindRefresh();
    }).catch(function (e) { msg(e.message, true); }).then(function () { if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; } });
  }
  function kindRefresh() { var sub = $('#op-sub', app); if (!sub) return; $$('input', sub).forEach(function (i) { i.checked = S.kitchenSub.indexOf(i.value) >= 0; }); }
  function renderFields() {
    var box = $('#op-fields', app); if (!box) return;
    if (!S.fields) {
      box.innerHTML = '<p class="op-muted">AI ще разгледа снимките, материалите и бележката и ще попълни: име, адрес, teaser, описание, SEO описание, SEO етикет, категории и alt текст на всяка снимка. Всичко може да се редактира.</p><button class="op-btn pri" id="op-prop" data-label="Предложи всички полета">Предложи всички полета</button>';
      $('#op-prop', box).onclick = function (e) { propose(null, e.currentTarget); };
      return;
    }
    var f = S.fields;
    function field(key, label, multi, limit) {
      var val = key === 'description' ? (f.description || []).join('\n\n') : (f[key] || '');
      return '<div class="op-f"><div class="op-f-h"><label class="op-l" style="margin:0">' + label + '</label><span><span class="op-cnt" data-c="' + key + '"></span> ' +
        (key !== 'slug' ? '<button class="op-btn sm" data-re="' + key + '" data-label="↻" title="Ново предложение само за това поле">↻</button>' : '') + '</span></div>' +
        (multi ? '<textarea data-f="' + key + '" style="min-height:' + (key === 'description' ? 150 : 70) + 'px">' + esc(val) + '</textarea>' : '<input type="text" data-f="' + key + '" value="' + esc(val) + '">') + '</div>';
    }
    box.innerHTML = '<div class="op-row" style="justify-content:space-between;margin-bottom:10px"><span class="op-muted">Ново предложение на полетата, видими на сайта (име, teaser, описание):</span><button class="op-btn" id="op-again" data-label="Ново предложение">Ново предложение</button></div>' +
      field('name', 'Име (английски, като в галерията)') + '<div id="op-name-alt" class="op-chips" style="margin:-8px 0 6px"></div><div id="op-name-msg" class="op-muted" style="margin:0 0 12px"></div>' +
      field('slug', 'Адрес (slug)') + field('teaser', 'Teaser (под снимката в галерията)', true) + field('description', 'Описание (абзаци с празен ред между тях)', true) +
      field('seoDescription', 'SEO описание', true) + field('seoLabel', 'SEO етикет') +
      '<div class="op-row" style="margin-top:6px"><button class="op-btn sm" id="op-alts" data-label="↻ Alt текстове на снимките">↻ Alt текстове на снимките</button></div>';
    var alts = $('#op-name-alt', box);
    (f.nameAlternatives || []).forEach(function (n) { var c = el('span', 'op-chip', esc(n)); c.title = 'Използвай това име'; c.onclick = function () { f.name = n; f.slug = slugify(n); saveState(); renderFields(); }; alts.appendChild(c); });
    function counts() {
      Object.keys(LIMITS).forEach(function (k) {
        var cEl = $('[data-c="' + k + '"]', box); if (!cEl) return;
        var len = k === 'description' ? richLen(f.description || []) : String(f[k] || '').length;
        cEl.textContent = len + ' / ' + LIMITS[k]; cEl.classList.toggle('over', len > LIMITS[k]);
      });
    }
    $$('[data-f]', box).forEach(function (i) {
      i.oninput = function () {
        var k = i.dataset.f;
        if (k === 'description') f.description = i.value.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean); else f[k] = i.value;
        if (k === 'name') { f.name = i.value.toUpperCase(); f.slug = slugify(f.name); var s = $('[data-f="slug"]', box); if (s) s.value = f.slug; checkName(); }
        counts(); saveState();
      };
    });
    $$('[data-re]', box).forEach(function (b) { b.onclick = function () { propose([b.dataset.re], b); }; });
    $('#op-again', box).onclick = function (e) { propose(['name', 'teaser', 'description'], e.currentTarget); };
    $('#op-alts', box).onclick = function (e) { propose(['alts'], e.currentTarget); };
    counts(); checkName();
  }
  function richLen(ps) { var n = 0; ps.forEach(function (p, i) { n += p.length + 7 + (i ? 14 : 0); }); return n; }
  function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  var nameT = 0;
  function checkName() {
    clearTimeout(nameT);
    nameT = setTimeout(function () {
      var m = $('#op-name-msg', app); if (!m || !S.fields) return;
      call('check-name', { name: S.fields.name }).then(function (j) { m.className = j.problem ? 'op-err' : 'op-ok'; m.textContent = j.problem ? 'Името ' + j.problem + '.' : 'Името е свободно.'; });
    }, 400);
  }

  /* ---------------- position ---------------- */
  function renderGallery() {
    var box = $('#op-gal', app); if (!box || !G) return;
    $$('[data-gf]', app).forEach(function (c) { c.classList.toggle('is-on', c.dataset.gf === S.galleryFilter); });
    var items = G.items.filter(function (i) { return S.galleryFilter === 'all' || i.categories.indexOf(S.mainCategory) >= 0; });
    box.innerHTML = '';
    function slot(after, before) {
      var key = (after ? after.id : '') + '|' + (before ? before.id : '');
      var on = S.slot && S.slot.key === key;
      var s = el('div', 'op-slot' + (on ? ' is-on' : ''), on ? 'Новият проект ще е тук' : '＋ тук');
      s.onclick = function () { S.slot = { key: key, afterId: after ? after.id : null, beforeId: before ? before.id : null, afterName: after ? after.name : '', beforeName: before ? before.name : '' }; saveState(); renderGallery(); };
      box.appendChild(s);
    }
    slot(null, items[0] || null);
    items.forEach(function (it, i) {
      var g = el('div', 'op-g', (it.image ? '<img loading="lazy" src="' + esc(it.image) + '" alt="">' : '<div style="aspect-ratio:4/3;background:#eee"></div>') + '<span>' + esc(it.name) + '<br><small>№ ' + it.order + (it.draft ? ' · чернова' : '') + '</small></span>');
      box.appendChild(g);
      slot(it, items[i + 1] || null);
    });
    var t = $('#op-slot-txt', app);
    if (t) t.textContent = S.slot ? (S.slot.afterName && S.slot.beforeName ? 'Между ' + S.slot.afterName + ' и ' + S.slot.beforeName : S.slot.beforeName ? 'Най-отпред, преди ' + S.slot.beforeName : 'Най-отзад, след ' + S.slot.afterName) : 'Изберете място (по подразбиране: най-отпред).';
  }

  /* ---------------- publish ---------------- */
  function msg(text, err) { var m = $('#op-bar-msg', app); if (m) { m.className = err ? 'op-err' : 'op-ok'; m.textContent = text; } }
  function submit(draft, shift) {
    var f = S.fields;
    if (!S.photos.length) return msg('Няма снимки.', true);
    if (S.photos.some(function (p) { return !current(p); })) return msg('Изчакайте снимките да се заредят.', true);
    if (!f || !f.name || !f.teaser) return msg('Първо попълнете полетата (бутон „Предложи всички полета“).', true);
    var over = ['teaser', 'seoDescription'].filter(function (k) { return String(f[k] || '').length > LIMITS[k]; });
    if (over.length || richLen(f.description || []) > 600) return msg('Има поле над допустимата дължина.', true);
    var first = G.items.filter(function (i) { return S.galleryFilter === 'all' || i.categories.indexOf(S.mainCategory) >= 0; })[0];
    var slot = S.slot || { afterId: null, beforeId: first ? first.id : null };
    var btns = $$('.op-bar .op-btn', app); btns.forEach(function (b) { b.disabled = true; });
    msg('Качвам снимките…');
    var seq = Promise.resolve();
    S.photos.forEach(function (p) { seq = seq.then(function () { return upload(current(p)); }); });
    seq.then(function () {
      msg(draft ? 'Записвам черновата…' : 'Публикувам…');
      var input = {
        name: f.name, slug: f.slug || slugify(f.name), teaser: f.teaser, description: f.description || [], seoDescription: f.seoDescription || '', seoLabel: f.seoLabel || '',
        materials: lines(), mainCategory: S.mainCategory, categories: categoriesNow().concat((f.categories || []).filter(function (c) { return categoriesNow().indexOf(c) < 0 && (S.mainCategory === KITCHEN || !(G.kitchenSub || {})[c]); })),
        images: S.photos.map(function (p) { return { id: current(p).serverId, alt: p.alt || '' }; }),
        afterId: slot.afterId, beforeId: slot.beforeId, draft: draft, shift: shift
      };
      return call('publish', { input: input, proposal: S.proposal });
    }).then(function (j) {
      btns.forEach(function (b) { b.disabled = false; });
      if (j.needShift) {
        if (confirm('Между избраните два проекта няма свободен номер. Да преместя ' + j.needShift.length + ' проекта след него с по 10 позиции? (видимият ред остава същият)')) return submit(draft, true);
        return msg('Отказано. Изберете друго място.', true);
      }
      if (!j.ok) throw new Error(j.error);
      ls(LS_STATE, null);
      app.innerHTML = '<div class="op-card"><h2>' + (draft ? 'Черновата е записана' : 'Проектът е публикуван') + '</h2><p><b>' + esc(f.name) + '</b> · позиция № ' + j.order + (j.shifted ? ' (преместени ' + j.shifted + ' проекта)' : '') + '</p>' +
        (draft ? '<p class="op-muted">Ще я намерите в Webflow → CMS → Products (непубликувана).</p>' : '<p><a href="' + esc(j.url) + '" target="_blank" rel="noopener">Отвори страницата на проекта →</a></p>') +
        '<button class="op-btn pri" id="op-new">Нов проект</button></div>';
      $('#op-new', app).onclick = function () { S = { photos: [], mainCategory: KITCHEN, kitchenSub: [], materials: [], note: '', fields: null, proposal: null, slot: null, galleryFilter: 'cat' }; call('gallery', { fresh: true }).then(function (g) { if (g.ok) G = g; render(); }); };
    }).catch(function (e) { btns.forEach(function (b) { b.disabled = false; }); msg(e.message, true); });
  }

  function init() {
    if (!$('.office-shell')) { if ((init.n = (init.n || 0) + 1) < 40) setTimeout(init, 250); return; }
    css(); tabs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
