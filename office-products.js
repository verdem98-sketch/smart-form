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
      '.op input[type=text],.op input[type=password],.op input[type=number],.op input[type=date],.op input[type=tel],.op input[type=email],.op textarea,.op select{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #cfd4cb;border-radius:8px;font:14px/1.4 Montserrat,Arial,sans-serif;background:#fff;color:#2f332f}',
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
      '.op-pick{grid-column:1/-1;border:1px solid #e1e4df;border-radius:12px;padding:12px;background:#fafbf9}',
      '.op-pick-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:0 0 10px}.op-pick-f label{font-size:12px;font-weight:600;color:#6a716b}',
      '.op-pick-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:8px}',
      '.op-sw{border:1px solid #e1e4df;border-radius:8px;background:#fff;padding:0;cursor:pointer;text-align:left;overflow:hidden;font:inherit}',
      '.op-sw img{width:100%;aspect-ratio:1;object-fit:cover;display:block;background:#eee}.op-sw span{display:block;padding:4px 6px;font-size:11px;line-height:1.25}',
      '.op-sw b{display:block;font-size:12px}.op-sw.is-on{outline:3px solid #477448;outline-offset:-3px}',
      '.op-pick-nav{display:flex;gap:6px;align-items:center;justify-content:center;margin-top:10px;flex-wrap:wrap}',
      '.op-mat-sel{display:flex;gap:8px;align-items:center;margin-top:6px}.op-mat-sel img{width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid #e1e4df}',
      '.pp-bar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 16px}.pp-bar[hidden]{display:none}.op[hidden]{display:none}',
      '.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:0 12px}',
      '.pp-mat{grid-template-columns:130px 110px 100px 1fr auto}.pp-hw{display:grid;grid-template-columns:1fr 80px auto;gap:8px;margin:0 0 6px}',
      '.pp-wide{grid-column:span 2}@media(max-width:700px){.pp-wide{grid-column:auto}.pp-mat{grid-template-columns:1fr 1fr 1fr}.pp-mat .op-mat-r{grid-column:1/-1}.pp-mat>[data-k=del]{grid-column:3;justify-self:end}.pp-hw{grid-template-columns:1fr 70px auto}}',
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
    var ppBar = el('div', 'pp-bar', '<button type="button" class="op-btn pri" data-pp="new">+ Нов паспорт</button><button type="button" class="op-btn" data-pp="edit">Редактирай / допълни паспорт</button>');
    bar.after(ppBar);
    app = el('div', 'op'); app.hidden = true; shell.appendChild(app);
    ppApp = el('div', 'op pp'); ppApp.hidden = true; shell.appendChild(ppApp);
    var own = [header, bar, ppBar, app, ppApp];
    function hidePassport(on) {
      [].forEach.call(shell.children, function (c) {
        if (own.indexOf(c) >= 0 || c.classList.contains('office-embed')) return;
        if (on) { if (!c.hasAttribute('data-vo-was')) c.setAttribute('data-vo-was', c.style.display || ''); c.style.display = 'none'; }
        else if (c.hasAttribute('data-vo-was')) { c.style.display = c.getAttribute('data-vo-was'); c.removeAttribute('data-vo-was'); }
      });
    }
    function show(t) {
      hidePassport(t !== 'passport');
      app.hidden = t !== 'products'; ppApp.hidden = t !== 'pp'; ppBar.hidden = t !== 'passport';
      $$('.vo-tab', bar).forEach(function (b) { b.classList.toggle('is-on', b.dataset.tab === (t === 'pp' ? 'passport' : t)); });
      if (t !== 'pp') ls(LS_TAB, t);
      if (t === 'products' && !app.dataset.ready) { app.dataset.ready = '1'; start(); }
    }
    VO.show = show;
    bar.addEventListener('click', function (e) { var b = e.target.closest('.vo-tab'); if (b) show(b.dataset.tab); });
    ppBar.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pp]'); if (!b) return;
      show('pp'); if (b.dataset.pp === 'new') ppOpen(null); else ppList();
    });
    show(ls(LS_TAB) === 'products' ? 'products' : 'passport');
    return true;
  }
  var VO = {}, ppApp;

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
    app.appendChild(el('div', 'op-card', '<h3>5. Позиция в галерията</h3><div class="op-row" style="margin-bottom:8px"><span class="op-muted">Редът е отделен за всяка основна категория — показани са проектите от избраната.</span> <b id="op-slot-txt" style="font-size:13px"></b></div><div class="op-gal" id="op-gal"></div>'));
    app.appendChild(toPassportCard());
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
    if (TP.draw) TP.draw();
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
        '<div class="op-mat-r"><div class="op-row"><input type="text" data-k="q" class="op-grow" placeholder="Търси декор: код или име (напр. U767, Дъб Касела)"><button class="op-btn sm" data-k="pick" type="button">Каталог с филтри ▾</button></div>' +
        (m.decor && m.decor.img ? '<div class="op-mat-sel"><img src="' + esc(m.decor.img) + '" alt=""><span class="op-muted">' + esc((m.decor.code || '') + ' ' + (m.decor.name || '') + ' · ' + (m.decor.brand || '')) + '</span></div>' : '') +
        '<input type="text" data-k="line" style="margin-top:6px" placeholder="Ред за сайта"><div class="op-dd" hidden></div></div>' +
        '<button class="op-btn sm" data-k="del">✕</button><div class="op-pick" hidden></div>';
      $('[data-k="line"]', row).value = m.line || lineOf(m);
      function upd() { m.line = lineOf(m); $('[data-k="line"]', row).value = m.line; saveState(); }
      $('[data-k="role"]', row).onchange = function (e) { m.role = e.target.value; upd(); };
      $('[data-k="sub"]', row).onchange = function (e) { m.sub = e.target.value; upd(); };
      $('[data-k="line"]', row).oninput = function (e) { m.line = e.target.value; saveState(); };
      $('[data-k="del"]', row).onclick = function () { S.materials.splice(i, 1); renderMaterials(); saveState(); };
      $('[data-k="pick"]', row).onclick = function () { var p = $('.op-pick', row); if (p.hidden) { p.hidden = false; picker(p, m, function () { renderMaterials(); saveState(); }); } else p.hidden = true; };
      var dd = $('.op-dd', row), q = $('[data-k="q"]', row), t = 0;
      q.oninput = function () {
        clearTimeout(t); t = setTimeout(function () {
          var s = q.value.trim().toLowerCase(); if (s.length < 2) { dd.hidden = true; return; }
          Promise.all([catalog('cabinet'), catalog('countertop')]).then(function (all) {
            var out = [];
            all[0].items.forEach(function (r) { if ((r[1] + ' ' + r[3] + ' ' + r[4]).toLowerCase().indexOf(s) >= 0) out.push(decorOf('cabinet', r, all[0])); });
            all[1].items.forEach(function (r) { if ((r[1] + ' ' + r[2] + ' ' + r[3]).toLowerCase().indexOf(s) >= 0) out.push(decorOf('countertop', r, all[1])); });
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

  /* ---------------- catalogue picker (same decors as the configurators) ---------------- */
  var GLOSS = {};
  ['kronospan_0112', 'kronospan_0164', 'kronospan_0171', 'kronospan_0190', 'kronospan_0564', 'kronospan_5981', 'kronospan_6299', 'kronospan_7045', 'kronospan_7166', 'kronospan_8685',
    'egger-perfectsense_u702', 'egger-perfectsense_u708', 'egger-perfectsense_u732', 'egger-perfectsense_u961', 'egger-perfectsense_u999', 'egger-perfectsense_w1000', 'egger-perfectsense_w1100'].forEach(function (id) { GLOSS[id] = 1; });
  function cdn(u) { return String(u || '').replace('https://s3.amazonaws.com/webflow-prod-assets/', 'https://cdn.prod.website-files.com/'); }
  function decorOf(kind, r, src) {
    if (kind === 'cabinet') return { id: r[0], kind: kind, brand: r[1], cat: r[2], code: r[3], name: r[4], surface: '', img: cdn(src.base + encodeURIComponent(r[5])), gloss: !!GLOSS[r[0]], subs: ['pdc', 'mdf'].filter(function (k) { return (src.substrates && src.substrates[k] || []).indexOf(String(r[3]).toUpperCase()) >= 0; }) };
    return { id: r[0], kind: kind, brand: r[1], code: r[2], surface: r[3], name: '', img: cdn(r[4]), cat: r[6], family: r[7] || '' };
  }
  var PICK = { kind: 'cabinet', brand: 'all', cat: 'all', sub: 'all', finish: 'all', family: 'all', q: '', page: 1 };
  var CAT_NAMES = { wood: 'Дървесни', stone: 'Камък', solid: 'Едноцветни', metal: 'Метал', structure: 'Структура' };
  function picker(box, m, done) {
    function sel(key, label, opts) {
      return '<div><label>' + label + '</label><select data-p="' + key + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (PICK[key] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>';
    }
    function draw() {
      var file = PICK.kind === 'cabinet' ? 'cabinet' : PICK.kind === 'backsplash' ? 'backsplash' : 'countertop';
      box.innerHTML = '<div class="op-pick-f">' +
        sel('kind', 'Материал за', [['cabinet', 'Шкафове (лица, корпус)'], ['countertop', 'Плотове'], ['backsplash', 'Гърбове']]) +
        sel('brand', 'Производител', [['all', 'Всички'], ['EGGER', 'EGGER'], ['Egger PerfectSense', 'PerfectSense'], ['Kronospan', 'Kronospan']]) +
        sel('cat', 'Категория', [['all', 'Всички'], ['wood', 'Дървесни'], ['solid', 'Едноцветни'], ['stone', 'Камък'], ['metal', 'Метал'], ['structure', 'Структура']]) +
        (PICK.kind === 'cabinet' ? sel('sub', 'Плоскост', [['all', 'Всички'], ['pdc', 'ПДЧ'], ['mdf', 'МДФ']]) + sel('finish', 'Покритие', [['all', 'Всички'], ['gloss', 'Гланц']]) : '') +
        (PICK.kind === 'countertop' ? sel('family', 'Тип плот', [['all', 'Всички'], ['thermal', 'Термоплотове'], ['slimline', 'Slim Line (Kronospan)'], ['compact', 'Компактни (Egger)']]) : '') +
        '<div><label>Търсене</label><input type="text" data-p="q" value="' + esc(PICK.q) + '" placeholder="код или име"></div></div><div class="op-pick-g"><span class="op-muted"><span class="op-busy"></span> Зареждам каталога…</span></div><div class="op-pick-nav"></div>';
      $$('[data-p]', box).forEach(function (c) {
        c[c.tagName === 'INPUT' ? 'oninput' : 'onchange'] = function () {
          PICK[c.dataset.p] = c.value; PICK.page = 1;
          if (c.dataset.p === 'kind') { PICK.cat = 'all'; PICK.sub = 'all'; PICK.finish = 'all'; PICK.family = 'all'; return draw(); }
          if (c.tagName === 'INPUT') { clearTimeout(c._t); c._t = setTimeout(list, 200); } else list();
        };
      });
      catalog(file).then(function (src) { box._items = src.items.map(function (r) { return decorOf(file === 'cabinet' ? 'cabinet' : 'countertop', r, src); }); list(); });
    }
    function list() {
      var g = $('.op-pick-g', box), nav = $('.op-pick-nav', box), q = PICK.q.trim().toLowerCase();
      var rows = (box._items || []).filter(function (d) {
        return (PICK.brand === 'all' || d.brand === PICK.brand) && (PICK.cat === 'all' || d.cat === PICK.cat) &&
          (PICK.kind !== 'cabinet' || ((PICK.sub === 'all' || d.subs.indexOf(PICK.sub) >= 0) && (PICK.finish === 'all' || d.gloss))) &&
          (PICK.kind !== 'countertop' || PICK.family === 'all' || d.family === PICK.family) &&
          (!q || (d.brand + ' ' + d.code + ' ' + d.surface + ' ' + d.name).toLowerCase().indexOf(q) >= 0);
      });
      var per = 24, pages = Math.max(1, Math.ceil(rows.length / per)); PICK.page = Math.min(PICK.page, pages);
      g.innerHTML = rows.slice((PICK.page - 1) * per, PICK.page * per).map(function (d, k) {
        return '<button type="button" class="op-sw' + (m.decor && m.decor.id === d.id ? ' is-on' : '') + '" data-d="' + ((PICK.page - 1) * per + k) + '"><img loading="lazy" src="' + esc(d.img) + '" alt=""><span><b>' + esc(d.code + (d.surface ? ' ' + d.surface : '')) + '</b>' + esc(d.name || CAT_NAMES[d.cat] || '') + '<br><small class="op-muted">' + esc(d.brand) + (d.gloss ? ' · гланц' : '') + '</small></span></button>';
      }).join('') || '<span class="op-muted">Няма материали за тези филтри.</span>';
      nav.innerHTML = rows.length > per ? '<button type="button" class="op-btn sm" data-n="-1"' + (PICK.page < 2 ? ' disabled' : '') + '>‹</button><span class="op-muted">Стр. ' + PICK.page + ' от ' + pages + ' · ' + rows.length + ' материала</span><button type="button" class="op-btn sm" data-n="1"' + (PICK.page >= pages ? ' disabled' : '') + '>›</button>' : '<span class="op-muted">' + rows.length + ' материала</span>';
      $$('[data-n]', nav).forEach(function (b) { b.onclick = function () { PICK.page += Number(b.dataset.n); list(); }; });
      $$('[data-d]', g).forEach(function (b) {
        b.onclick = function () {
          var d = rows[Number(b.dataset.d)];
          m.decor = d;
          if (d.kind === 'cabinet') m.sub = (PICK.sub === 'mdf' || d.subs.indexOf('pdc') < 0) && d.subs.indexOf('mdf') >= 0 ? (d.gloss ? 'МДФ гланц' : 'МДФ') : 'ПДЧ';
          else { m.sub = d.family === 'compact' ? 'Компакт' : ''; if (m.role === 'Корпус' || m.role === 'Лице' || m.role === 'Лице 2') m.role = PICK.kind === 'backsplash' ? 'Гръб' : 'Плот'; }
          m.line = lineOf(m); done();
        };
      });
    }
    draw();
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
    var items = G.items.filter(function (i) { return i.categories.indexOf(S.mainCategory) >= 0; });
    if (S.slot && S.slot.cat !== S.mainCategory) S.slot = null;
    box.innerHTML = '';
    function slot(after, before) {
      var key = (after ? after.id : '') + '|' + (before ? before.id : '');
      var on = S.slot && S.slot.key === key;
      var s = el('div', 'op-slot' + (on ? ' is-on' : ''), on ? 'Новият проект ще е тук' : '＋ тук');
      s.onclick = function () { S.slot = { cat: S.mainCategory, key: key, afterId: after ? after.id : null, beforeId: before ? before.id : null, afterName: after ? after.name : '', beforeName: before ? before.name : '' }; saveState(); renderGallery(); };
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

  /* ---------------- photos → existing Digital Passport (project-gallery-room1..5) ---------------- */
  var TP = { list: null, id: null, name: '', rooms: null, room: 0, skip: {} };
  function toPassportCard() {
    var c = el('div', 'op-card', '<h3>6. Снимките и към Digital Passport (по желание)</h3><p class="op-muted" style="margin:0 0 8px">Добавя избраните снимки в галерията на стая от вече създаден паспорт. Не зависи от публикуването в сайта.</p><div data-tp></div>');
    var box = $('[data-tp]', c);
    function draw() {
      if (!TP.id) {
        box.innerHTML = '<input type="text" data-q placeholder="Търси паспорт по име, телефон или договор"><div data-res style="margin-top:6px"></div>';
        var q = $('[data-q]', box), res = $('[data-res]', box);
        function list() {
          var t = norm(q.value), td = t.replace(/\D/g, '');
          if (!t) { res.innerHTML = ''; return; }
          var rows = TP.list.filter(function (i) { return norm(i.client + ' ' + i.name + ' ' + i.contracts.join(' ')).indexOf(t) >= 0 || (td.length > 2 && String(i.phone).replace(/\D/g, '').indexOf(td) >= 0); }).slice(0, 8);
          res.innerHTML = rows.map(function (i) { return '<button type="button" class="op-btn sm" style="margin:0 6px 6px 0" data-id="' + i.id + '">' + esc(i.client || i.name) + (i.contracts.length ? ' · ' + esc(i.contracts.join(', ')) : '') + '</button>'; }).join('') || '<span class="op-muted">Няма намерени.</span>';
          $$('[data-id]', res).forEach(function (b) { b.onclick = function () { TP.id = b.dataset.id; TP.name = b.textContent; TP.rooms = null; TP.room = 0; draw(); ppCall('get', { id: TP.id }).then(function (j) { if (!j.ok) { TP.id = null; draw(); return alert(j.error); } TP.rooms = j.data.rooms; draw(); }); }; });
        }
        q.oninput = function () { if (TP.list) return list(); res.innerHTML = '<span class="op-busy"></span>'; ppCall('list').then(function (j) { TP.list = j.ok ? j.items : []; list(); }); };
        return;
      }
      if (!TP.rooms) { box.innerHTML = '<b>' + esc(TP.name) + '</b> <span class="op-busy"></span>'; return; }
      var photos = S.photos.filter(function (p) { return current(p); });
      box.innerHTML = '<div class="op-row" style="justify-content:space-between"><b>' + esc(TP.name) + '</b><button type="button" class="op-btn sm" data-chg>Друг паспорт</button></div>' +
        '<label class="op-l">Към коя стая</label><select data-room><option value="0">— изберете стая —</option>' + TP.rooms.map(function (r, i) { return '<option value="' + (i + 1) + '"' + (TP.room === i + 1 ? ' selected' : '') + '>Стая ' + (i + 1) + ' – ' + esc(r.name || '(без име)') + ' · ' + r.gallery.length + ' снимки</option>'; }).join('') + '</select>' +
        '<label class="op-l">Кои снимки</label><div class="op-row" data-ph>' + (photos.length ? photos.map(function (p, k) { var v = current(p); return '<label style="display:inline-block;text-align:center;cursor:pointer"><img src="' + esc(v.url) + '" alt="" style="width:84px;height:64px;object-fit:cover;border-radius:6px;display:block;opacity:' + (TP.skip[k] ? '.35' : '1') + '"><input type="checkbox" data-k="' + k + '"' + (TP.skip[k] ? '' : ' checked') + '></label>'; }).join('') : '<span class="op-muted">Първо качете снимки (стъпка 1).</span>') + '</div>' +
        '<div class="op-row" style="margin-top:10px"><button type="button" class="op-btn pri" data-go>Добави в паспорта</button><span data-m class="op-muted"></span></div>';
      $('[data-chg]', box).onclick = function () { TP.id = null; draw(); };
      $('[data-room]', box).onchange = function (e) { TP.room = Number(e.target.value); };
      $$('[data-k]', box).forEach(function (i) { i.onchange = function () { TP.skip[i.dataset.k] = !i.checked; draw(); }; });
      $('[data-go]', box).onclick = function () {
        var m = $('[data-m]', box), go = this;
        function say(t, err) { m.className = err ? 'op-err' : 'op-ok'; m.innerHTML = t; }
        if (!TP.room) return say('Изберете стая.', true);
        var pick = photos.filter(function (p, k) { return !TP.skip[k]; });
        if (!pick.length) return say('Изберете поне една снимка.', true);
        go.disabled = true; say('<span class="op-busy"></span> Качвам…');
        var seq = Promise.resolve();
        pick.forEach(function (p) { seq = seq.then(function () { return upload(current(p)); }); });
        seq.then(function () {
          var urls = pick.map(function (p) { var v = current(p); return v.publicUrl || (/^https:/.test(v.url) ? v.url : ''); }).filter(Boolean);
          return ppCall('add-gallery', { id: TP.id, room: TP.room, urls: urls });
        }).then(function (j) {
          go.disabled = false;
          if (!j.ok) throw new Error(j.error);
          TP.rooms[TP.room - 1].gallery = new Array(j.total);
          say('Добавени ' + j.added + ' снимки в стая ' + TP.room + ' (общо ' + j.total + ').');
        }).catch(function (e) { go.disabled = false; say(esc(e.message), true); });
      };
    }
    TP.draw = function () { if (TP.id && TP.rooms && document.body.contains(c)) draw(); };
    draw();
    return c;
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
    var first = G.items.filter(function (i) { return i.categories.indexOf(S.mainCategory) >= 0; })[0];
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

  /* ================= Digital Passport: "+ Нов паспорт" / редакция ================= */
  var PP_API = location.origin + '/contract-automation/api/passport-tool';
  function ppCall(action, data) {
    return fetch(PP_API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify(Object.assign({ action: action }, data || {})) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }); });
  }
  var PP_OPT = {
    invoice: [['', '— изберете —'], ['9a700d7b12d402d65055d127197b2e6e', 'ВЕРДЕ МЕБЕЛЛИ'], ['ccdac908c996d18164060b970e1d196e', 'СТУДИО 564'], ['c96ee9e6099b04bcae1c77b010e679c5', 'VERDE M'], ['dc3501b3830f421c6f644ca262353490', 'INTERIORNI IDEI']],
    source: [['', '—'], ['6b2e2559667c54f9c98bdd28a3a59d18', 'проект на ИЗПЪЛНИТЕЛЯ'], ['02740bdb758cb4cb7c659fb96d3d2047', 'проект на ВЪЗЛОЖИТЕЛЯ'], ['55019e006a66b1cefb9231816e4b6d61', 'съвместен проект на ВЪЗЛОЖИТЕЛЯ и ИЗПЪЛНИТЕЛЯ']],
    payment: [['', '—'], ['7f9269b5c09f249d8abbc60187a104c0', 'банков път'], ['e92ac1fc20d9d97b6ef4fe1800b4d85f', 'в брой']]
  };
  var HW = [
    ['flap', 'Клапващи механизми', ['Клапващ механизъм AVENTOS HF-Top (BLUM)', 'Клапващ механизъм AVENTOS HK-Top (BLUM)', 'Клапващ механизъм AVENTOS HK-Top tip-on (BLUM)', 'Клапващ механизъм AVENTOS HK XS (BLUM)', 'Клапващ механизъм AVENTOS HK XS tip-on (BLUM)', 'Газови амортисьори']],
    ['slides', 'Водачи за чекмеджета', ['Механизъм TANDEM за чекмеджета с дървени страници с частично изтегляне и плавно прибиране (BLUM)', 'Механизъм TANDEM за чекмеджета с дървени страници с частично изтегляне без плавно прибиране (BLUM)', 'Механизъм TANDEM за чекмеджета с дървени страници с пълно изтегляне и плавно прибиране (BLUM)', 'Механизъм TANDEM за чекмеджета с дървени страници с пълно изтегляне без плавно прибиране (BLUM)', 'Механизъм TANDEM за чекмеджета с дървени страници с частично изтегляне и отваряне чрез PUSH (BLUM)', 'Механизъм TANDEM за чекмеджета с дървени страници с пълно изтегляне и отваряне чрез PUSH (BLUM)', 'Телескопичен водач с плавно прибиране', 'Телескопичен водач без плавно прибиране']],
    ['hinges', 'Панти', ['Панти с плавно прибиране (BLUM)', 'Панти без плавно прибиране (BLUM)', 'Панти без пружина за отваряне чрез PUSH (BLUM)']]
  ];
  var PP_ROLES = ['Корпус', 'Лице', 'Лице 2', 'Гръб', 'Стенен панел', 'Термоплот', 'Плот', 'Фазер', 'Друго'];
  var PP_SUB = ['', 'ПДЧ', 'МДФ', 'МДФ гланц', 'МДФ акрилен', 'Компакт', 'Гетинакс', 'Фурнир', 'Масив'];
  var PP_THICK = ['', '8мм', '10мм', '12мм', '16мм', '18мм', '25мм', '28мм', '38мм'];
  var ROOM_NAMES = ['Кухня', 'Гардероб', 'Спалня', 'Всекидневна', 'Библиотека', 'Коридор', 'Детска стая', 'Баня', 'Офис'];
  var P = null;

  // 11920 → „единадесет хиляди деветстотин и двадесет“
  function words(n) {
    n = Math.floor(Math.abs(Number(n) || 0)); if (!n) return 'нула';
    var ones = ['', 'едно', 'две', 'три', 'четири', 'пет', 'шест', 'седем', 'осем', 'девет'], teens = ['десет', 'единадесет', 'дванадесет', 'тринадесет', 'четиринадесет', 'петнадесет', 'шестнадесет', 'седемнадесет', 'осемнадесет', 'деветнадесет'];
    var tens = ['', '', 'двадесет', 'тридесет', 'четиридесет', 'петдесет', 'шестдесет', 'седемдесет', 'осемдесет', 'деветдесет'], hund = ['', 'сто', 'двеста', 'триста', 'четиристотин', 'петстотин', 'шестстотин', 'седемстотин', 'осемстотин', 'деветстотин'];
    function tri(x, fem) {
      var h = Math.floor(x / 100), r = x % 100, p = [];
      if (h) p.push(hund[h]);
      var low = '';
      if (r >= 10 && r < 20) low = teens[r - 10];
      else if (r) { var t = Math.floor(r / 10), o = r % 10, on = fem && o === 1 ? 'една' : fem && o === 2 ? 'две' : ones[o]; low = t ? tens[t] + (o ? ' и ' + on : '') : on; }
      if (low) { if (p.length && !/ и /.test(low)) p.push('и'); p.push(low); }
      return p.join(' ');
    }
    var mil = Math.floor(n / 1e6), th = Math.floor(n / 1000) % 1000, rest = n % 1000, out = [];
    if (mil) out.push(mil === 1 ? 'един милион' : tri(mil) + ' милиона');
    if (th) out.push(th === 1 ? 'хиляда' : tri(th, true) + ' хиляди');
    if (rest) { var t3 = tri(rest); if (out.length && (rest < 100 || rest % 100 === 0) && !/^и /.test(t3)) out.push('и'); out.push(t3); }
    return out.join(' ').replace(/\s+/g, ' ').trim();
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function addMonths(iso, m) { var x = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!x || !m) return ''; var d = new Date(Date.UTC(+x[1], +x[2] - 1 + Number(m), +x[3])); return d.toISOString().slice(0, 10); }
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

  function newRoom(name) { return { name: name || '', materials: [], hw: { flap: [], slides: [], hinges: [] }, hwFree: [], accessories: [''], pdf: { keep: true, url: '' }, installDate: '', gallery: [], galleryChanged: false }; }
  function roomFromServer(r) {
    var room = newRoom(r.name);
    room.materials = (r.materials || []).map(function (l) { return { role: '', thick: '', sub: '', line: l }; });
    (r.hardware || []).forEach(function (l) {
      var m = /^(\d+)\s*бр\.?\s*(.+)$/.exec(l), qty = m ? m[1] : '', text = m ? m[2] : l, hit = null;
      HW.forEach(function (c) { c[2].forEach(function (o) { if (!hit && norm(o) === norm(text)) hit = [c[0], o]; }); });
      if (hit) room.hw[hit[0]].push({ item: hit[1], qty: qty }); else room.hwFree.push(l);
    });
    room.accessories = (r.accessories || []).length ? r.accessories.slice() : [''];
    room.pdf = { keep: true, url: r.pdf || '' };
    room.installDate = r.installDate || ''; room.gallery = (r.gallery || []).map(function (u) { return { url: u }; });
    return room;
  }
  function ppLine(m) {
    var d = m.decor; if (!d) return m.line || '';
    return ((m.role || 'Корпус') + ' - ' + [m.sub, m.thick, d.code, d.surface, d.name, brand(d.brand)].filter(Boolean).join(' ')).replace(/\s+/g, ' ').trim();
  }

  function ppList() {
    ppApp.innerHTML = '<div class="op-card"><div class="op-row" style="justify-content:space-between"><h2>Редактирай / допълни паспорт</h2><button class="op-btn sm" data-back>← Digital Passport</button></div><input type="text" id="pp-q" placeholder="Търси по име, телефон или номер на договор" style="margin:10px 0"><div id="pp-list"><span class="op-busy"></span> Зареждам…</div></div>';
    $('[data-back]', ppApp).onclick = function () { VO.show('passport'); };
    ppCall('list').then(function (j) {
      if (!j.ok) { $('#pp-list').innerHTML = '<span class="op-err">' + esc(j.error) + '</span>'; return; }
      function draw() {
        var q = norm($('#pp-q').value), qd = q.replace(/\D/g, '');
        var rows = j.items.filter(function (i) { var hay = norm(i.name + ' ' + i.client + ' ' + i.contract + ' ' + i.contracts.join(' ')); return !q || hay.indexOf(q) >= 0 || (qd && String(i.phone).replace(/\D/g, '').indexOf(qd) >= 0); });
        $('#pp-list').innerHTML = rows.slice(0, 60).map(function (i) {
          return '<div class="op-row" style="justify-content:space-between;border-bottom:1px solid #eceeea;padding:8px 0"><div><b>' + esc(i.client || i.name) + '</b> <span class="op-muted">' + esc(i.phone) + '</span><br><span class="op-muted">Договор ' + esc(i.contracts.join(', ') || i.contract || '—') + (i.date ? ' · ' + esc(i.date) : '') + '</span></div><button class="op-btn sm" data-id="' + i.id + '">Редактирай</button></div>';
        }).join('') || '<span class="op-muted">Няма намерени.</span>';
        $$('[data-id]', ppApp).forEach(function (b) { b.onclick = function () { ppOpen(b.dataset.id); }; });
      }
      $('#pp-q').oninput = draw; draw();
    });
  }

  function ppOpen(id) {
    ppApp.innerHTML = '<div class="op-card"><span class="op-busy"></span> Зареждам…</div>';
    if (!id) {
      P = { id: null, contract: '', auto: { words: true, final: true, appendix: true, end: true },
        d: { clientName: '', phone: '', email: '', address: '', designer: '', invoiceCompany: '', furnitureType: 'мебели по поръчка', projectSource: '6b2e2559667c54f9c98bdd28a3a59d18', contractDate: today(), appendixCount: 1, projectValue: '', projectValueWords: '', paymentMethod: '7f9269b5c09f249d8abbc60187a104c0', advance: '', finalPayment: '', installationDeadline: '', preparationDeadline: '', installationDate: '', warrantyMonths: '24', warrantyEnd: '' },
        rooms: [newRoom('Кухня')] };
      return ppRender();
    }
    ppCall('get', { id: id }).then(function (j) {
      if (!j.ok) { ppApp.innerHTML = '<div class="op-card op-err">' + esc(j.error) + '</div>'; return; }
      var d = j.data;
      P = { id: j.id, slug: j.slug, contract: j.contract, auto: { words: !d.projectValueWords, final: d.finalPayment === '' || d.finalPayment === null, appendix: false, end: !d.warrantyEnd }, d: d, rooms: (d.rooms || []).map(roomFromServer) };
      if (!P.rooms.length) P.rooms.push(newRoom(''));
      ppRender();
    });
  }

  function inp(key, label, type, attrs) { return '<div><label class="op-l">' + label + '</label><input type="' + (type || 'text') + '" data-d="' + key + '" value="' + esc(P.d[key] == null ? '' : P.d[key]) + '"' + (attrs || '') + '></div>'; }
  function sel(key, label, opts) { return '<div><label class="op-l">' + label + '</label><select data-d="' + key + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(P.d[key] || '') === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>'; }

  function ppRender() {
    var d = P.d;
    ppApp.innerHTML =
      '<div class="op-card"><div class="op-row" style="justify-content:space-between"><div><h2>' + (P.id ? 'Редакция на паспорт' : 'Нов паспорт') + '</h2><div class="op-muted">' + (P.contract ? 'Договор ' + esc(P.contract) : 'Номерът на договора се слага автоматично след запис.') + '</div></div><button class="op-btn sm" data-back>← Digital Passport</button></div></div>' +
      '<div class="op-card"><h3>Клиент и договор</h3><div class="pp-grid">' +
      inp('clientName', 'Име и фамилия *') + inp('phone', 'Телефон (код за достъп до паспорта)', 'tel') + inp('email', 'Имейл', 'email') + inp('address', 'Адрес на обекта') +
      inp('designer', 'Проектант') + sel('invoiceCompany', 'Фирма за фактура *', PP_OPT.invoice) + inp('furnitureType', 'Вид мебели') + sel('projectSource', 'По проект на', PP_OPT.source) +
      inp('contractDate', 'Дата на договора', 'date') + inp('appendixCount', 'Брой приложения', 'number', ' min="0"') + '</div></div>' +
      '<div class="op-card"><h3>Плащане и срокове</h3><div class="pp-grid">' +
      inp('projectValue', 'Крайна цена (€)', 'number', ' min="0"') + '<div class="pp-wide">' + inp('projectValueWords', 'Цена словом') + '</div>' + sel('paymentMethod', 'Начин на плащане', PP_OPT.payment) +
      inp('advance', 'Аванс (€)', 'number', ' min="0"') + inp('finalPayment', 'Основно плащане (€)', 'number', ' min="0"') + inp('installationDeadline', 'Краен срок за монтажа', 'date') + inp('preparationDeadline', 'Срок за отстраняване на проблеми', 'date') + '</div></div>' +
      '<div id="pp-rooms"></div><div class="op-card"><button class="op-btn" id="pp-addroom"' + (P.rooms.length >= 5 ? ' disabled' : '') + '>+ Добави помещение</button> <span class="op-muted">до 5 помещения</span></div>' +
      '<div class="op-card"><h3>Гаранция</h3><div class="pp-grid">' + inp('installationDate', 'Дата на монтаж', 'date') + inp('warrantyMonths', 'Гаранция (месеци)', 'number', ' min="0"') + inp('warrantyEnd', 'Край на гаранцията', 'date') + '</div></div>' +
      '<div class="op-bar"><span class="op-muted" id="pp-msg" style="margin-right:auto"></span><button class="op-btn pri" id="pp-save">' + (P.id ? 'Запази промените' : 'Създай паспорт') + '</button></div>';
    $('[data-back]', ppApp).onclick = function () { VO.show('passport'); };
    $$('[data-d]', ppApp).forEach(function (i) {
      i[i.tagName === 'SELECT' ? 'onchange' : 'oninput'] = function () {
        var k = i.dataset.d; d[k] = i.value;
        if (k === 'projectValueWords') P.auto.words = !i.value; if (k === 'finalPayment') P.auto.final = !i.value; if (k === 'appendixCount') P.auto.appendix = false; if (k === 'warrantyEnd') P.auto.end = !i.value;
        ppAuto(k);
      };
    });
    $('#pp-addroom', ppApp).onclick = function () { if (P.rooms.length < 5) { P.rooms.push(newRoom('')); if (P.auto.appendix) d.appendixCount = P.rooms.length; ppRender(); } };
    $('#pp-save', ppApp).onclick = ppSave;
    ppRooms();
  }
  function setD(k, v) { P.d[k] = v; var i = $('[data-d="' + k + '"]', ppApp); if (i && i !== document.activeElement) i.value = v; }
  function ppAuto(k) {
    var d = P.d;
    if ((k === 'projectValue') && P.auto.words) setD('projectValueWords', d.projectValue ? words(d.projectValue) + ' евро' : '');
    if ((k === 'projectValue' || k === 'advance') && P.auto.final && d.projectValue !== '' && d.advance !== '') setD('finalPayment', String(Math.max(0, Number(d.projectValue) - Number(d.advance))));
    if ((k === 'installationDate' || k === 'warrantyMonths') && P.auto.end) setD('warrantyEnd', addMonths(d.installationDate, d.warrantyMonths));
  }

  function ppRooms() {
    var box = $('#pp-rooms', ppApp); box.innerHTML = '';
    P.rooms.forEach(function (r, ri) {
      var c = el('div', 'op-card');
      c.innerHTML = '<div class="op-row" style="justify-content:space-between"><h3 style="margin:0">Помещение ' + (ri + 1) + '</h3>' + (P.rooms.length > 1 ? '<button class="op-btn sm" data-x>Махни помещението</button>' : '') + '</div>' +
        '<div class="pp-grid"><div><label class="op-l">Име</label><input type="text" data-r="name" list="pp-room-names" value="' + esc(r.name) + '"></div><div><label class="op-l">Дата на монтаж</label><input type="date" data-r="installDate" value="' + esc(r.installDate) + '"></div></div>' +
        '<label class="op-l">Материали</label><div data-mats></div><button class="op-btn sm" data-addmat>+ Материал</button>' +
        '<label class="op-l">Обков</label><div data-hw></div><div data-hwfree></div><button class="op-btn sm" data-addhw>+ ново поле</button>' +
        '<label class="op-l">Аксесоари и екстри</label><div data-acc></div><button class="op-btn sm" data-addacc>+ ново поле</button>' +
        '<label class="op-l">Чертежи (PDF)</label><div data-pdf></div>' +
        '<label class="op-l">Снимки на готовото помещение</label><div data-gal class="op-row"></div><input type="file" accept="image/*" multiple data-galin style="margin-top:6px">';
      if (!$('#pp-room-names')) { var dl = el('datalist'); dl.id = 'pp-room-names'; dl.innerHTML = ROOM_NAMES.map(function (n) { return '<option value="' + n + '">'; }).join(''); document.body.appendChild(dl); }
      $$('[data-r]', c).forEach(function (i) { i.oninput = function () { r[i.dataset.r] = i.value; }; });
      var x = $('[data-x]', c); if (x) x.onclick = function () { if (confirm('Да махна ли помещение ' + (ri + 1) + '?')) { P.rooms.splice(ri, 1); if (P.auto.appendix) P.d.appendixCount = P.rooms.length; ppRender(); } };
      // materials
      var mats = $('[data-mats]', c);
      function drawMats() {
        mats.innerHTML = '';
        r.materials.forEach(function (m, mi) {
          var row = el('div', 'op-mat pp-mat');
          row.innerHTML = '<select data-k="role">' + PP_ROLES.map(function (o) { return '<option' + (o === m.role ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>' +
            '<select data-k="sub">' + PP_SUB.map(function (o) { return '<option value="' + o + '"' + (o === m.sub ? ' selected' : '') + '>' + (o || '—') + '</option>'; }).join('') + '</select>' +
            '<select data-k="thick">' + PP_THICK.map(function (o) { return '<option value="' + o + '"' + (o === m.thick ? ' selected' : '') + '>' + (o || 'дебелина') + '</option>'; }).join('') + '</select>' +
            '<div class="op-mat-r"><div class="op-row"><button class="op-btn sm" data-k="pick" type="button">Каталог с филтри ▾</button>' + (m.decor && m.decor.img ? '<img src="' + esc(m.decor.img) + '" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:6px">' : '') + '</div><input type="text" data-k="line" style="margin-top:6px" placeholder="Напр. Корпус - ПДЧ 18мм H3331 ST10 Дъб Небраска Натур EGGER" value="' + esc(m.line) + '"></div>' +
            '<button class="op-btn sm" data-k="del">✕</button><div class="op-pick" hidden></div>';
          function upd() { if (m.decor) { m.line = ppLine(m); $('[data-k="line"]', row).value = m.line; } }
          $('[data-k="role"]', row).onchange = function (e) { m.role = e.target.value; upd(); };
          $('[data-k="sub"]', row).onchange = function (e) { m.sub = e.target.value; upd(); };
          $('[data-k="thick"]', row).onchange = function (e) { m.thick = e.target.value; upd(); };
          $('[data-k="line"]', row).oninput = function (e) { m.line = e.target.value; };
          $('[data-k="del"]', row).onclick = function () { r.materials.splice(mi, 1); drawMats(); };
          $('[data-k="pick"]', row).onclick = function () { var p = $('.op-pick', row); if (p.hidden) { p.hidden = false; picker(p, m, function () { if (!m.thick) m.thick = m.decor && m.decor.kind === 'countertop' ? (/плот/i.test(m.role) ? '38мм' : '8мм') : '18мм'; if (/Компакт/.test(m.sub || '')) m.thick = '12мм'; m.line = ppLine(m); drawMats(); }); } else p.hidden = true; };
          mats.appendChild(row);
        });
      }
      drawMats();
      $('[data-addmat]', c).onclick = function () { r.materials.push({ role: r.materials.length ? 'Лице' : 'Корпус', sub: 'ПДЧ', thick: '18мм', line: '' }); drawMats(); };
      // hardware: three dropdown groups + free lines
      var hw = $('[data-hw]', c);
      function drawHw() {
        hw.innerHTML = '';
        HW.forEach(function (cat) {
          var list = r.hw[cat[0]]; if (!list.length) list.push({ item: '', qty: '' });
          list.forEach(function (h, hi) {
            var row = el('div', 'pp-hw');
            row.innerHTML = '<select>' + ['<option value="">' + esc(cat[1]) + ' — няма</option>'].concat(cat[2].map(function (o) { return '<option' + (o === h.item ? ' selected' : '') + '>' + esc(o) + '</option>'; })).join('') + '</select>' +
              '<input type="number" min="0" placeholder="бр." value="' + esc(h.qty) + '">' + (hi === list.length - 1 ? '<button class="op-btn sm" title="Още от този вид">+</button>' : '<button class="op-btn sm" title="Махни">✕</button>');
            $('select', row).onchange = function (e) { h.item = e.target.value; };
            $('input', row).oninput = function (e) { h.qty = e.target.value; };
            $('button', row).onclick = function () { if (hi === list.length - 1) list.push({ item: '', qty: '' }); else list.splice(hi, 1); drawHw(); };
            hw.appendChild(row);
          });
        });
      }
      drawHw();
      function lines(box, arr, ph) {
        box.innerHTML = '';
        arr.forEach(function (t, k) {
          var row = el('div', 'op-row', '<input type="text" class="op-grow" placeholder="' + ph + '" value="' + esc(t) + '"><button class="op-btn sm">✕</button>'); row.style.marginBottom = '6px';
          $('input', row).oninput = function (e) { arr[k] = e.target.value; };
          $('button', row).onclick = function () { arr.splice(k, 1); lines(box, arr, ph); };
          box.appendChild(row);
        });
      }
      var hwf = $('[data-hwfree]', c), acc = $('[data-acc]', c);
      lines(hwf, r.hwFree, 'Друг обков, напр. 2бр. Механизъм за кош за отпадъци'); lines(acc, r.accessories, 'Напр. LED осветление - вкопан алуминиев профил, топла светлина');
      $('[data-addhw]', c).onclick = function () { r.hwFree.push(''); lines(hwf, r.hwFree, 'Друг обков'); };
      $('[data-addacc]', c).onclick = function () { r.accessories.push(''); lines(acc, r.accessories, 'Аксесоар'); };
      // PDF
      var pdfBox = $('[data-pdf]', c);
      function drawPdf() {
        var p = r.pdf, has = p && (p.url || p.file);
        pdfBox.innerHTML = (has ? '<div class="op-row"><a href="' + esc(p.url || '#') + '" target="_blank" rel="noopener">' + esc(p.file ? p.file.name : 'текущ PDF') + '</a><button class="op-btn sm" data-rm>Махни</button></div>' : '') + '<input type="file" accept="application/pdf">';
        var rm = $('[data-rm]', pdfBox); if (rm) rm.onclick = function () { r.pdf = null; drawPdf(); };
        $('input', pdfBox).onchange = function (e) { var f = e.target.files[0]; if (f) { r.pdf = { keep: false, file: f, url: URL.createObjectURL(f) }; drawPdf(); } };
      }
      drawPdf();
      // gallery
      var gal = $('[data-gal]', c);
      function drawGal() {
        gal.innerHTML = '';
        r.gallery.forEach(function (g, gi) {
          var t = el('div', '', '<img src="' + esc(g.url || g.data) + '" alt="" style="width:84px;height:64px;object-fit:cover;border-radius:6px;display:block"><button class="op-btn sm" style="width:84px;margin-top:4px">Махни</button>');
          $('button', t).onclick = function () { r.gallery.splice(gi, 1); r.galleryChanged = true; drawGal(); };
          gal.appendChild(t);
        });
      }
      drawGal();
      $('[data-galin]', c).onchange = function (e) {
        [].slice.call(e.target.files).forEach(function (f) {
          var u = URL.createObjectURL(f);
          loadImg(u).then(function (img) { r.gallery.push({ data: encode(toCanvas(img, MAX_EDGE)) }); r.galleryChanged = true; URL.revokeObjectURL(u); drawGal(); });
        });
        e.target.value = '';
      };
      box.appendChild(c);
    });
  }

  function fileB64(f) { return new Promise(function (ok, no) { var fr = new FileReader(); fr.onload = function () { ok(String(fr.result).split(',')[1]); }; fr.onerror = no; fr.readAsDataURL(f); }); }
  function ppMsg(t, err) { var m = $('#pp-msg', ppApp); if (m) { m.className = err ? 'op-err' : 'op-ok'; m.innerHTML = t; } }
  function ppSave() {
    var d = P.d;
    if (!String(d.clientName || '').trim()) return ppMsg('Попълнете име на клиента.', true);
    if (!d.invoiceCompany) return ppMsg('Изберете фирма за фактура.', true);
    var btn = $('#pp-save', ppApp); btn.disabled = true;
    ppMsg('<span class="op-busy"></span> Качвам файловете…');
    var seq = Promise.resolve();
    P.rooms.forEach(function (r) {
      if (r.pdf && r.pdf.file) seq = seq.then(function () { return fileB64(r.pdf.file).then(function (b64) { return ppCall('upload-file', { b64: b64, mime: 'application/pdf', name: r.pdf.file.name }); }).then(function (j) { if (!j.ok) throw new Error(j.error); r.pdf = { keep: false, url: j.url, uploaded: true }; }); });
      r.gallery.forEach(function (g) { if (g.data && !g.url) seq = seq.then(function () { return ppCall('upload-image', { dataUrl: g.data }).then(function (j) { if (!j.ok) throw new Error(j.error); g.url = j.url; }); }); });
    });
    seq.then(function () {
      ppMsg('<span class="op-busy"></span> Записвам паспорта…');
      var input = Object.assign({}, d, {
        rooms: P.rooms.map(function (r) {
          var hwLines = [];
          HW.forEach(function (cat) { r.hw[cat[0]].forEach(function (h) { if (h.item) hwLines.push((h.qty ? h.qty + 'бр. ' : '') + h.item); }); });
          return {
            name: r.name, installDate: r.installDate,
            materials: r.materials.map(function (m) { return m.line || ppLine(m); }).filter(Boolean),
            hardware: hwLines.concat(r.hwFree.filter(Boolean)), accessories: r.accessories.filter(Boolean),
            pdf: r.pdf === null ? null : r.pdf.keep ? { keep: true } : { url: r.pdf.url },
            gallery: r.galleryChanged ? r.gallery.map(function (g) { return g.url; }).filter(Boolean) : null
          };
        })
      });
      ['appendixCount', 'projectValue', 'advance', 'finalPayment', 'warrantyMonths'].forEach(function (k) { input[k] = input[k] == null ? '' : String(input[k]); });
      return ppCall('save', { id: P.id, input: input });
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error);
      var id = j.id, tries = 0;
      ppMsg('<span class="op-busy"></span> Записано. Чакам номера на договора…');
      (function poll() {
        ppCall('get', { id: id }).then(function (g) {
          if (g.ok && (g.contract || tries > 10)) {
            ppApp.innerHTML = '<div class="op-card"><h2>' + (P.id ? 'Паспортът е обновен' : 'Паспортът е създаден') + '</h2><p><b>' + esc(d.clientName) + '</b>' + (g.contract ? ' · договор <b>' + esc(g.contract) + '</b>' : ' · номерът на договора ще се появи до минута') + '</p>' +
              '<p><a href="/verde-m-projects/' + esc(g.slug) + '" target="_blank" rel="noopener">Отвори паспорта →</a></p><div class="op-row"><button class="op-btn" data-edit>Продължи редакцията</button><button class="op-btn pri" data-back>← Digital Passport</button></div></div>';
            $('[data-back]', ppApp).onclick = function () { VO.show('passport'); };
            $('[data-edit]', ppApp).onclick = function () { ppOpen(id); };
          } else { tries++; setTimeout(poll, 2500); }
        });
      })();
    }).catch(function (e) { btn.disabled = false; ppMsg(esc(e.message), true); });
  }

  function init() {
    if (!$('.office-shell')) { if ((init.n = (init.n || 0) + 1) < 40) setTimeout(init, 250); return; }
    css(); tabs();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
