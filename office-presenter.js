/* /verde-office: „AI водещ“ tab (group „Видео“) – a fictional AI presenter (woman designer) shows one gallery project.
   The owner files a request: project, one photo per sentence, the sentence the presenter says, captions and a note.
   Claude makes the video on command („направи чакащите видеа“) – Vidu clips (wide shot, kitchen fully visible) +
   ElevenLabs voice „Luna“ + Vidu Lip Sync – and uploads the finished MP4 here, where it is watched with „▶ Гледай“.
   Data: /contract-automation/api/promo (format 'ai-presenter'). */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/promo';
  var FORMAT = 'ai-presenter', MAX_SHOTS = 6;
  var STATUS = { requested: 'Заявено', working: 'Прави се', clips_ready: 'Прави се', done: 'Готово' };
  var DEFAULT_LINES = [
    ['Здравейте! Това е {name} – кухня, правена по поръчка, сантиметър по сантиметър.', '{NAME}', 'кухня по поръчка'],
    ['Остров от дъб и бял гланц, а под шкафовете – топла лед светлина, която прави вечерите уютни.', 'ДЕТАЙЛИТЕ', 'материали, подбрани с грижа'],
    ['Високите шкафове дават много място за съхранение.', 'МЯСТО ЗА ВСИЧКО', 'всичко е подредено'],
    ['Всичко е по размерите на стаята – всеки сантиметър е използван.', 'ПО ВАШИТЕ РАЗМЕРИ', 'всеки сантиметър е използван'],
    ['Искате ли такава кухня и у Вас? Елате в офиса ни – правим безплатна 3D визуализация и проект.', 'ЕЛАТЕ В ОФИСА НИ', 'безплатна 3D визуализация и проект']
  ];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function post(body) { return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify(body) }); }
  function call(body) { return post(body).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + r.status + ')' }; }); }); }
  function b64(ab) { var u = new Uint8Array(ab), s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function bgDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function words(t) { return (String(t || '').trim().match(/\S+/g) || []).length; }

  function css() {
    var s = document.createElement('style');
    s.id='pv-css'; if(document.getElementById('pv-css')) return; s.textContent = [
      '.pv{font:15px/1.45 Montserrat,Arial,sans-serif;color:#2f332f}',
      '.pv h3{margin:0 0 6px;font:700 20px/1.2 Montserrat,Arial,sans-serif}.pv h4{margin:18px 0 8px;font:700 15px/1.2 Montserrat,Arial,sans-serif}',
      '.pv-card{background:#fff;border:1px solid #dfe3da;border-radius:14px;padding:18px;margin:0 0 14px}',
      '.pv-sub{margin:0 0 12px;color:#6b7266;font-size:14px}',
      '.pv-btn{padding:10px 16px;border:1px solid #cfd4cb;border-radius:10px;background:#fff;color:#2f332f;font:600 14px/1.2 Montserrat,Arial,sans-serif;cursor:pointer}',
      '.pv-btn.pri{background:#2f332f;border-color:#2f332f;color:#fff}.pv-btn.danger{color:#a33}.pv-btn:disabled{opacity:.5;cursor:default}',
      '.pv-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}',
      '.pv input[type=text],.pv textarea,.pv select{width:100%;box-sizing:border-box;padding:9px 11px;border:1px solid #cfd4cb;border-radius:9px;font:14px/1.3 Montserrat,Arial,sans-serif;background:#fff;color:#2f332f}',
      '.pv label{display:block;margin:10px 0 4px;font-size:12px;font-weight:600;color:#6b7266;text-transform:uppercase;letter-spacing:.03em}',
      '.pv-list{display:grid;gap:8px}.pv-item{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;border:1px solid #dfe3da;border-radius:11px;cursor:pointer;background:#fff}.pv-item:hover{border-color:#2f332f}',
      '.pv-badge{padding:4px 10px;border-radius:99px;font-size:12px;font-weight:600;background:#eef0ea;white-space:nowrap}.pv-badge.requested{background:#fff1c9}.pv-badge.working{background:#dbe9ff}.pv-badge.clips_ready{background:#ffe1cc}.pv-badge.done{background:#d9efd6}',
      '.pv-photos{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px;margin-top:10px}',
      '.pv-photo{position:relative;aspect-ratio:1;border-radius:9px;overflow:hidden;cursor:pointer;border:2px solid transparent;background:#eef0ea}.pv-photo img{width:100%;height:100%;object-fit:cover;display:block}.pv-photo.on{border-color:#e8772e}.pv-photo.on:after{content:"✓";position:absolute;top:4px;right:6px;color:#fff;font-weight:700;text-shadow:0 0 4px #000}',
      '.pv-shot{display:grid;grid-template-columns:120px 1fr;gap:14px;padding:14px 0;border-top:1px solid #eef0ea}',
      '.pv-frame{width:120px;aspect-ratio:9/16;border-radius:9px;overflow:hidden;background:#eef0ea}.pv-frame img{width:100%;height:100%;object-fit:cover;display:block}',
      '.pv-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pv-ok{color:#2f6b2a;font-weight:600}.pv-err{color:#a33}.pv-muted{color:#6b7266;font-size:13px}',
      '.pv-steps{margin:0;padding-left:20px;color:#4a5046;font-size:14px}.pv-steps li{margin:3px 0}',
      '.pv video{width:240px;max-width:100%;border-radius:10px;background:#000;display:block;margin:10px 0}',
      '.pv-watch{position:fixed;inset:0;z-index:2147483000;background:rgba(10,12,10,.88);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}',
      '.pv-watch video{width:auto;height:min(86vh,1200px);max-width:94vw;aspect-ratio:9/16;margin:0;border-radius:12px;background:#000}',
      '.pv-watch .pv-x{position:absolute;top:14px;right:16px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;color:#2f332f;font:700 22px/44px Arial;cursor:pointer}',
      '.pv-watch .pv-wait{color:#fff;font:15px Montserrat,Arial,sans-serif}',
      '@media(max-width:560px){.pv-shot{grid-template-columns:80px 1fr}.pv-frame{width:80px}.pv-two{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ---------------- the gallery of the site (same origin) ---------------- */
  var projectsCache = null;
  function parse(html) { return new DOMParser().parseFromString(html, 'text/html'); }
  var CATEGORIES = [['kuhni2', 'Кухни'], ['vsekidnevni', 'Всекидневни'], ['spalni', 'Спални'], ['detski-stai', 'Детски стаи'], ['koridori', 'Коридори'], ['drugi', 'Други']];
  function loadProjects() {
    if (projectsCache) return Promise.resolve(projectsCache);
    var seen = {}, out = [];
    // the gallery is split by category, each list is paginated ("?xxxx_page=2", relative to the category page)
    function page(url, cat, n) {
      return fetch(url, { credentials: 'omit' }).then(function (r) { return r.text(); }).then(function (t) {
        var doc = parse(t);
        [].forEach.call(doc.querySelectorAll('a[href*="/product/"]'), function (a) {
          var m = /\/product\/([a-z0-9-]+)/i.exec(a.getAttribute('href') || ''); if (!m || seen[m[1]]) return;
          seen[m[1]] = 1;
          out.push({ slug: m[1], cat: cat, name: m[1].replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }), url: location.origin + '/product/' + m[1] });
        });
        var next = doc.querySelector('a.w-pagination-next');
        var href = next && next.getAttribute('href');
        if (href && n < 20) return page(new URL(href, url).href, cat, n + 1);
      }).catch(function () { /* one category failing must not hide the others */ });
    }
    return Promise.all(CATEGORIES.map(function (c) { return page(location.origin + '/category/' + c[0], c[1], 1); })).then(function () {
      var order = CATEGORIES.map(function (c) { return c[1]; });
      out.sort(function (a, b) { return order.indexOf(a.cat) - order.indexOf(b.cat) || a.name.localeCompare(b.name); });
      projectsCache = out; return out;
    });
  }
  function loadPhotos(url) {
    return fetch(url, { credentials: 'omit' }).then(function (r) { return r.text(); }).then(function (t) {
      var doc = parse(t), seen = {}, out = [];
      function add(u) {
        if (!u || !/website-files\.com\//.test(u) || !/\.(jpe?g|webp)(\?|$)/i.test(u)) return;
        u = u.split('?')[0].replace(/-p-\d+(\.(?:jpe?g|webp))$/i, '$1');
        if (!seen[u]) { seen[u] = 1; out.push(u); }
      }
      [].forEach.call(doc.querySelectorAll('script.w-json'), function (s) { try { (JSON.parse(s.textContent).items || []).forEach(function (it) { add(it.url); }); } catch (e) { /* not a lightbox */ } });
      [].forEach.call(doc.querySelectorAll('main img, .w-lightbox img, img'), function (i) { add(i.getAttribute('src')); });
      return out;
    });
  }


  /* ---------------- the tab ---------------- */
  function start(panel) {
    var view = 'list', videos = [], cur = null, shots = [], dirty = false, busy = false, msg = null, projects = null, photos = null;
    function flash(text, isErr) { msg = text ? { text: text, err: !!isErr } : null; var f = panel.querySelector('[data-flash]'); if (f) { f.className = isErr ? 'pv-err' : 'pv-muted'; f.textContent = text || ''; } }
    function setBusy(b) { busy = b; [].forEach.call(panel.querySelectorAll('button,input[type=file]'), function (x) { x.disabled = b; }); }
    function take(d) { cur = d.video; shots = d.shots.map(function (s) { return Object.assign({}, s); }); dirty = false; }
    function readForm() {
      if (view !== 'edit') return;
      var t = panel.querySelector('[data-title]'); if (t) cur.title = t.value;
      var n = panel.querySelector('[data-note]'); if (n) cur.note = n.value;
      shots.forEach(function (s, i) {
        var row = panel.querySelector('[data-shot="' + i + '"]'); if (!row) return;
        s.prompt = row.querySelector('[data-line]').value; s.caption1 = row.querySelector('[data-c1]').value; s.caption2 = row.querySelector('[data-c2]').value;
      });
    }
    function save() {
      readForm();
      return call({ action: 'save', format: FORMAT, id: cur.id || '', title: cur.title, project_url: cur.project_url || '', note: cur.note || '', shots: shots.map(function (s) { return { id: s.id || '', photo_url: s.photo_url, crop: 0.5, mode: 'talk', caption1: s.caption1, caption2: s.caption2, prompt: s.prompt || '' }; }) })
        .then(function (d) { if (!d.ok) throw new Error(d.error || 'Грешка'); take(d); return d; });
    }
    function saved() { return dirty || !cur.id || shots.some(function (s) { return !s.id; }) ? save() : Promise.resolve(); }
    function guard(p, okText) {
      setBusy(true);
      return p.then(function (x) { setBusy(false); render(); if (okText) flash(okText); return x; }).catch(function (e) { setBusy(false); render(); flash(e.message || String(e), true); });
    }
    function total() { return shots.reduce(function (a, s) { return a + words(s.prompt); }, 0); }

    function renderList() {
      return '<div class="pv-card"><h3>AI водещ</h3><p class="pv-sub">Измислена водеща-дизайнерка представя един проект от галерията: тя е в кухнята, говори с гласа „Luna“ и показва това, за което говори. Устните са синхронизирани с гласа, а в ъгъла пише „AI водещ“. Видеото го правя аз, когато ми кажеш „направи чакащите видеа“.</p>' +
        '<div class="pv-row"><button type="button" class="pv-btn pri" data-act="new">+ Нова заявка за видео</button><span data-flash class="pv-muted"></span></div></div>' +
        '<div class="pv-card"><h4 style="margin-top:0">Заявки и готови видеа</h4><div class="pv-list">' + (videos.length ? videos.map(function (v) {
          return '<div class="pv-item" data-open="' + esc(v.id) + '"><div><b>' + esc(v.title) + '</b><div class="pv-muted">' + bgDate(v.created_at) + '</div></div><span class="pv-row">' + (v.final_size ? '<button type="button" class="pv-btn" data-watch="' + esc(v.id) + '">▶ Гледай</button>' : '') + '<span class="pv-badge ' + esc(v.status) + '">' + esc(STATUS[v.status] || v.status) + '</span></span></div>';
        }).join('') : '<p class="pv-muted">Още няма заявки.</p>') + '</div></div>';
    }
    function renderEdit() {
      var w = total(), sec = Math.round(w / 2.6);
      var html = '<div class="pv-card"><div class="pv-row" style="justify-content:space-between"><button type="button" class="pv-btn" data-act="back">← Всички видеа</button><span class="pv-badge ' + esc(cur.status || 'requested') + '">' + esc(STATUS[cur.status] || 'Нова заявка') + '</span></div>' +
        '<label>Име на видеото</label><input type="text" data-title value="' + esc(cur.title || '') + '" placeholder="напр. Clear Line – AI водещ">' +
        '<label>Проект от галерията</label><select data-project><option value="">' + (projects ? '— избери проект —' : 'зареждам проектите…') + '</option>' + (projects || []).map(function (p) { return '<option value="' + esc(p.url) + '"' + (p.url === cur.project_url ? ' selected' : '') + '>' + esc(p.cat + ' · ' + p.name) + '</option>'; }).join('') + '</select>' +
        (photos ? '<div class="pv-photos">' + photos.map(function (u, i) { var on = shots.some(function (s) { return s.photo_url === u; }); return '<div class="pv-photo' + (on ? ' on' : '') + '" data-photo="' + i + '"><img loading="lazy" src="' + esc(u.replace(/(\.(?:jpe?g|webp))$/i, '-p-500$1')) + '" onerror="this.onerror=null;this.src=\'' + esc(u) + '\'"></div>'; }).join('') + '</div><p class="pv-muted" style="margin:8px 0 0">Натисни снимка за всяко изречение (до ' + MAX_SHOTS + '). Най-добре 5 общи снимки, на които кухнята се вижда цялата.</p>' : (cur.project_url ? '<p class="pv-muted">Зареждам снимките…</p>' : '')) +
        '<label>Бележка (по желание)</label><textarea data-note rows="2" placeholder="напр. фурната е под плота; островът няма чекмеджета">' + esc(cur.note || '') + '</textarea></div>';
      html += '<div class="pv-card"><h4 style="margin-top:0">Текст по кадри (' + shots.length + ')</h4>' +
        '<ol class="pv-steps"><li>За всеки кадър напиши едно изречение – водещата го казва, докато показва мебелите. Към клиента винаги на „Вие“.</li><li>Водещата представя проекта, не себе си. Пиши само неща, които се виждат на снимката (без чекмеджета или уреди, които ги няма).</li><li>Запази заявката и ми кажи „направи чакащите видеа“.</li></ol>' +
        '<p class="pv-muted">Общо ' + w + ' думи ≈ ' + sec + ' сек' + (sec > 35 ? ' – дълго е, най-добре до 30 сек.' : '.') + '</p>' +
        (shots.length ? shots.map(function (s, i) {
          return '<div class="pv-shot" data-shot="' + i + '"><div><div class="pv-frame"><img src="' + esc(s.photo_url.replace(/(\.(?:jpe?g|webp))$/i, '-p-500$1')) + '" onerror="this.onerror=null;this.src=\'' + esc(s.photo_url) + '\'"></div></div><div>' +
            '<div class="pv-row" style="justify-content:space-between"><b>Кадър ' + (i + 1) + '</b><span class="pv-row"><button type="button" class="pv-btn" data-act="up" data-i="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" class="pv-btn" data-act="down" data-i="' + i + '"' + (i < shots.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="pv-btn danger" data-act="drop" data-i="' + i + '">Махни</button></span></div>' +
            '<label>Какво казва водещата</label><textarea data-line rows="2">' + esc(s.prompt || '') + '</textarea>' +
            '<div class="pv-two"><div><label>Надпис – голям</label><input type="text" data-c1 maxlength="60" value="' + esc(s.caption1 || '') + '"></div><div><label>Надпис – малък</label><input type="text" data-c2 maxlength="90" value="' + esc(s.caption2 || '') + '"></div></div></div></div>';
        }).join('') : '<p class="pv-muted" style="margin-top:10px">Избери проект и натисни снимките, които да влязат във видеото.</p>') + '</div>';
      html += '<div class="pv-card"><div class="pv-row"><button type="button" class="pv-btn pri" data-act="save">Запази заявката</button>' +
        (cur.final_size ? '<button type="button" class="pv-btn pri" data-watch="' + esc(cur.id) + '">▶ Гледай</button><button type="button" class="pv-btn" data-act="download">Свали готовото видео</button>' : '') +
        (cur.id ? '<button type="button" class="pv-btn danger" data-act="delete">Изтрий</button>' : '') + '</div>' +
        '<div class="pv-row" style="margin-top:10px"><span class="pv-muted">или качи вече готово видео (mp4):</span><input type="file" accept="video/mp4,video/*" data-final-file></div>' +
        '<p data-flash class="pv-muted" style="margin:10px 0 0"></p></div>';
      return html;
    }
    function render() {
      panel.innerHTML = '<div class="pv">' + (view === 'list' ? renderList() : renderEdit()) + '</div>';
      if (msg) flash(msg.text, msg.err);
      if (busy) setBusy(true);
    }
    function refreshList() { return call({ action: 'list', format: FORMAT }).then(function (d) { if (d.ok) videos = d.videos; else flash(d.error || 'Грешка', true); render(); }).catch(function (e) { render(); flash('Няма връзка със сървъра: ' + e.message, true); }); }
    function openProject(url) {
      photos = null; render();
      if (!url) return;
      loadPhotos(url).then(function (list) { photos = list; render(); if (!list.length) flash('Не намерих снимки на тази страница.', true); }).catch(function () { photos = []; render(); flash('Снимките не се заредиха.', true); });
    }
    function openEdit(d) {
      view = 'edit'; msg = null; photos = null;
      if (d) take(d); else { cur = { title: '', project_url: '', note: '', status: '' }; shots = []; dirty = true; }
      render();
      loadProjects().then(function (p) { projects = p; if (view === 'edit') { readForm(); render(); } }).catch(function () { projects = []; });
      if (cur.project_url) openProject(cur.project_url);
    }
    function uploadChunks(id, blob, onPct) {
      var CHUNK = 600000, n = Math.ceil(blob.size / CHUNK), seq = 0, last = null;
      function next() {
        if (seq >= n) return Promise.resolve(last);
        return blob.slice(seq * CHUNK, Math.min(blob.size, (seq + 1) * CHUNK)).arrayBuffer().then(function (ab) {
          return call({ action: 'final_upload', id: id, seq: seq, total: n, size: blob.size, b64: b64(ab) });
        }).then(function (r) { if (!r.ok) throw new Error(r.error || 'Качването спря.'); last = r; seq++; if (onPct) onPct(seq / n); return next(); });
      }
      return next();
    }
    var watchCache = {};
    function watch(id) {
      var box = el('div', 'pv-watch', '<button type="button" class="pv-x" aria-label="Затвори">×</button><span class="pv-wait">Зареждам видеото…</span>');
      document.body.appendChild(box);
      var closed = false;
      function close() { closed = true; var v = box.querySelector('video'); if (v) v.pause(); box.remove(); document.removeEventListener('keydown', onKey); }
      function onKey(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey);
      box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.pv-x')) close(); });
      (watchCache[id] ? Promise.resolve(watchCache[id]) : post({ action: 'final_content', id: id }).then(function (r) {
        if (!r.ok || !/video/.test(r.headers.get('content-type') || '')) throw new Error('Видеото не се зареди от сървъра.');
        return r.blob();
      }).then(function (b) { watchCache[id] = URL.createObjectURL(b); return watchCache[id]; })).then(function (url) {
        if (closed) return;
        var w = box.querySelector('.pv-wait'); if (w) w.remove();
        var v = document.createElement('video'); v.controls = true; v.playsInline = true; v.autoplay = true; v.src = url;
        box.appendChild(v);
      }).catch(function (e) { var w = box.querySelector('.pv-wait'); if (w) w.textContent = e.message; });
    }
    function projectName() { var p = (projects || []).find(function (x) { return x.url === cur.project_url; }); return p ? p.name : (cur.title || ''); }

    panel.addEventListener('click', function (e) {
      var wb = e.target.closest('[data-watch]');
      if (wb) { e.stopPropagation(); return watch(wb.dataset.watch); }
      var open = e.target.closest('[data-open]');
      if (open && !busy) return guard(call({ action: 'get', id: open.dataset.open }).then(function (d) { if (!d.ok) throw new Error(d.error); openEdit(d); }));
      var ph = e.target.closest('[data-photo]');
      if (ph && !busy) {
        readForm();
        var u = photos[Number(ph.dataset.photo)], at = shots.findIndex(function (s) { return s.photo_url === u; });
        if (at >= 0) shots.splice(at, 1);
        else {
          if (shots.length >= MAX_SHOTS) return flash('Най-много ' + MAX_SHOTS + ' кадъра.', true);
          var d = DEFAULT_LINES[shots.length] || ['', '', ''], nm = projectName();
          shots.push({ photo_url: u, prompt: d[0].replace('{name}', nm), caption1: d[1].replace('{NAME}', nm.toUpperCase()), caption2: d[2] });
        }
        dirty = true; msg = null; return render();
      }
      var b = e.target.closest('[data-act]'); if (!b || busy) return;
      var a = b.dataset.act, i = Number(b.dataset.i);
      if (a === 'new') return openEdit(null);
      if (a === 'back') { view = 'list'; msg = null; return refreshList(); }
      if (a === 'up' || a === 'down') { readForm(); var j = a === 'up' ? i - 1 : i + 1, x = shots[i]; shots[i] = shots[j]; shots[j] = x; dirty = true; return render(); }
      if (a === 'drop') { readForm(); shots.splice(i, 1); dirty = true; return render(); }
      if (a === 'save') return guard(save(), 'Заявката е запазена. Кажи ми „направи чакащите видеа“.');
      if (a === 'download') return guard(post({ action: 'final_content', id: cur.id }).then(function (r) { if (!r.ok || !/video/.test(r.headers.get('content-type') || '')) throw new Error('Видеото не се зареди от сървъра.'); return r.blob(); }).then(function (blob) { var l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = (cur.title || 'verde-video').replace(/[^\wа-яА-Я -]+/g, '').trim() + '.mp4'; document.body.appendChild(l); l.click(); l.remove(); }));
      if (a === 'delete') { if (!confirm('Да изтрия ли тази заявка и готовото видео?')) return; return guard(call({ action: 'delete', id: cur.id }).then(function (d) { if (!d.ok) throw new Error(d.error); view = 'list'; return refreshList(); })); }
    });
    panel.addEventListener('input', function (e) { if (view === 'edit') { dirty = true; if (e.target.matches('[data-line]')) { readForm(); var p = panel.querySelector('.pv-card:nth-child(2) > p.pv-muted'); if (p) { var w = total(), sec = Math.round(w / 2.6); p.textContent = 'Общо ' + w + ' думи ≈ ' + sec + ' сек' + (sec > 35 ? ' – дълго е, най-добре до 30 сек.' : '.'); } } } });
    panel.addEventListener('change', function (e) {
      if (view !== 'edit') return;
      if (e.target.matches('[data-project]')) { readForm(); cur.project_url = e.target.value; dirty = true; if (!cur.title) { var o = e.target.selectedOptions[0]; cur.title = o && o.value ? o.textContent.replace(/^.*· /, '') + ' – AI водещ' : ''; } return openProject(cur.project_url); }
      if (e.target.matches('[data-final-file]') && e.target.files[0]) {
        var ff = e.target.files[0];
        if (ff.size > 200 * 1048576) return flash('Файлът е твърде голям (до 200 MB).', true);
        return guard(saved().then(function () { return uploadChunks(cur.id, ff, function (p) { flash('Качвам видеото… ' + Math.round(p * 100) + '%'); }); })
          .then(function (d) { if (d && d.video) take(d); delete watchCache[cur.id]; }), 'Видеото е качено. Гледа се с „▶ Гледай“.');
      }
    });
    render(); refreshList();
  }

  function mount(bar) {
    if (bar.querySelector('[data-tab="presenter"]')) return;
    var shell = bar.parentElement;
    var tab = el('button', 'vo-tab', 'AI водещ'); tab.type = 'button'; tab.setAttribute('data-tab', 'presenter');
    bar.appendChild(tab);
    var panel = el('div', 'vp'); panel.hidden = true; shell.appendChild(panel);
    var hiddenByUs = [];
    function open() {
      [].forEach.call(bar.querySelectorAll('.vo-tab'), function (b) { b.classList.toggle('is-on', b === tab); });
      [].forEach.call(shell.children, function (c) {
        if (c === bar || c === panel || c.classList.contains('office-header') || c.style.display === 'none' || c.hidden) return;
        hiddenByUs.push([c, c.style.display]); c.style.display = 'none';
      });
      panel.hidden = false; panel.style.display = '';
      if (!panel.dataset.ready) { panel.dataset.ready = '1'; start(panel); }
    }
    function close() {
      if (panel.hidden) return;
      panel.hidden = true; tab.classList.remove('is-on');
      hiddenByUs.forEach(function (x) { x[0].style.display = x[1]; }); hiddenByUs = [];
    }
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('.vo-tab'); if (!b) return;
      if (b === tab) { e.stopImmediatePropagation(); open(); } else close();
    }, true);
  }

  css();
  var tries = 0;
  (function waitBar() {
    var bar = document.querySelector('.office-shell .vo-tabs');
    if (bar) return mount(bar);
    if (++tries < 60) setTimeout(waitBar, 250);
  })();
})();
