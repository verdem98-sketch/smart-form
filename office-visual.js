/* /verde-office: "Визуализации" tab — SketchUp scene images → photorealistic pictures.
   Projects → scenes (upload PNG/JPG exported from SketchUp, one per scene) → tags (fronts, worktop, backsplash,
   lighting, details, style) → "Нарисувай" → result next to the sketch, "Повтори" with a note, download single images.
   The stable base prompt is editable under "Художникът". Talks to /contract-automation/api/visual-studio. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/visual-studio';
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function bgTime(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getDate() + '.' + (d.getMonth() + 1) + ', ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function call(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + r.status + ')' }; }); });
  }
  // SketchUp exports are big; the artist works at 1536 px anyway, so shrink in the browser before upload
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image(); var url = URL.createObjectURL(file);
      img.onload = function () {
        var max = 1536, w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.88));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Файлът не е картинка')); };
      img.src = url;
    });
  }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vs{font:14px/1.55 Montserrat,Arial,sans-serif;color:#2f332f}.vs .va-card{background:#fff;border:1px solid #e1e4df;border-radius:14px;padding:18px;margin:0 0 16px}',
      '.vs h3{font:700 15px/1.3 Montserrat,Arial,sans-serif;margin:0 0 4px}.vs .va-sub{color:#6a716b;font-size:13px;margin:0 0 12px}.vs .va-err{color:#9b1c10}.vs .va-muted{color:#6a716b;font-size:13px}',
      '.vs .va-btn{min-height:36px;padding:7px 14px;border:1px solid #cfd4cb;border-radius:8px;background:#fff;color:#2f332f;font:600 13px Montserrat,Arial,sans-serif;cursor:pointer}.vs .va-btn.pri{background:#477448;border-color:#477448;color:#fff}.vs .va-btn.danger{color:#9b1c10}.vs .va-btn[disabled]{opacity:.5;cursor:wait}',
      '.vs input[type=text],.vs textarea,.vs select{width:100%;box-sizing:border-box;border:1px solid #cfd4cb;border-radius:8px;padding:8px 10px;font:13px Montserrat,Arial,sans-serif;background:#fff;color:#2f332f}.vs textarea{min-height:90px;resize:vertical}',
      '.vs-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.vs-projects{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}',
      '.vs-proj{border:1px solid #e1e4df;border-radius:12px;padding:14px;cursor:pointer;background:#fff}.vs-proj:hover{border-color:#477448}.vs-proj b{display:block;font-size:14px}',
      '.vs-scene{border:1px solid #e1e4df;border-radius:14px;padding:14px;margin:0 0 14px;background:#fff}.vs-scene-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:0 0 10px}',
      '.vs-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.vs-pair img{width:100%;border-radius:10px;border:1px solid #eef0ec;display:block;background:#f6f7f5}.vs-lbl{font-size:11px;text-transform:uppercase;letter-spacing:.03em;color:#6a716b;margin:0 0 4px}',
      '.vs-tags{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;margin:10px 0}.vs-tags label{display:block;font-size:11px;color:#6a716b;margin:0 0 2px}',
      '.vs-renders{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin:10px 0 0}.vs-r{border:1px solid #eef0ec;border-radius:10px;padding:8px}.vs-r img{width:100%;border-radius:8px;display:block}.vs-r .st{font-size:12px;color:#6a716b;margin:6px 0}.vs-r .st.busy{color:#c98a2b}.vs-r .st.bad{color:#9b1c10}',
      '.vs-drop{border:2px dashed #cfd4cb;border-radius:12px;padding:22px;text-align:center;color:#6a716b;cursor:pointer}.vs-drop.on{border-color:#477448;background:#f3f7f2}',
      '.vs-big{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out}.vs-big img{max-width:96vw;max-height:92vh;border-radius:8px}',
      '@media(max-width:700px){.vs-pair{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  function start(panel) {
    var state = { projects: null, view: 'list', p: null, busy: false, timer: null, showArtist: false };

    function setBusy(b) { state.busy = b; [].forEach.call(panel.querySelectorAll('button'), function (x) { x.disabled = b; }); }
    function act(body, after) {
      if (state.busy) return Promise.resolve();
      setBusy(true);
      return call(body).then(function (d) {
        setBusy(false);
        if (!d.ok) { flash(d.error || 'Грешка', true); return d; }
        if (d.project) { state.p = d; state.view = 'project'; }
        if (d.projects) state.projects = d.projects;
        render(); if (after) after(d); return d;
      }).catch(function (e) { setBusy(false); flash('Няма връзка със сървъра: ' + e.message, true); });
    }
    function flash(msg, isErr) { var f = panel.querySelector('[data-flash]'); if (f) { f.className = isErr ? 'va-err' : 'va-muted'; f.textContent = msg; } }
    function schedulePoll() {
      clearTimeout(state.timer);
      if (state.view !== 'project' || !state.p) return;
      var open = state.p.scenes.some(function (s) { return s.renders.some(function (r) { return r.status === 'queued' || r.status === 'in_progress'; }); });
      if (open) state.timer = setTimeout(function () { call({ action: 'project_get', id: state.p.project.id }).then(function (d) { if (d.ok) { state.p = d; render(); } }); }, 6000);
    }

    function renderList() {
      var ps = state.projects || [];
      return '<div class="va-card"><h3>Визуализации</h3><p class="va-sub">Качваш картинките на сцените от SketchUp (File → Export → Animation → картинки), отбелязваш материали и осветление, и художникът рисува реалистична снимка за всяка сцена. Картинките се пазят по проекти.</p>' +
        '<div class="vs-row"><input type="text" data-new-name placeholder="Име на проекта (напр. Кухня Иванови)" style="max-width:320px"><button type="button" class="va-btn pri" data-act="new">+ Нов проект</button><span data-flash class="va-muted"></span></div></div>' +
        '<div class="vs-projects">' + (ps.length ? ps.map(function (p) { return '<div class="vs-proj" data-open="' + esc(p.id) + '"><b>' + esc(p.name) + '</b><span class="va-muted">' + esc(p.client || '') + (p.client ? ' · ' : '') + p.scenes + ' сцени · ' + p.renders + ' снимки · ' + bgTime(p.created_at) + '</span></div>'; }).join('') : '<p class="va-muted">Още няма проекти.</p>') + '</div>';
    }
    function tagSelects(s) {
      var t = state.p.tags, v = s.tags || {};
      return '<div class="vs-tags">' + Object.keys(t).map(function (k) {
        return '<div><label>' + esc(t[k].label) + '</label><select data-tag="' + k + '" data-scene="' + esc(s.id) + '">' + Object.keys(t[k].options).map(function (o) { return '<option value="' + o + '"' + ((v[k] || state.p.defaults[k]) === o ? ' selected' : '') + '>' + esc(t[k].options[o].bg) + '</option>'; }).join('') + '</select></div>';
      }).join('') + '<div style="grid-column:1/-1"><label>Допълнително за тази сцена (свободен текст, по желание)</label><input type="text" data-extra data-scene="' + esc(s.id) + '" value="' + esc(v.extra || '') + '" placeholder="напр. черни дръжки, бял под с едри плочки, дъбов паркет"></div></div>';
    }
    function renderProject() {
      var d = state.p, p = d.project;
      var html = '<div class="va-card"><div class="vs-row" style="justify-content:space-between"><div class="vs-row"><button type="button" class="va-btn" data-act="back">← Проекти</button><input type="text" data-pname value="' + esc(p.name) + '" style="max-width:260px"><input type="text" data-pclient value="' + esc(p.client) + '" placeholder="Клиент" style="max-width:200px"><button type="button" class="va-btn" data-act="save-project">Запази</button></div>' +
        '<div class="vs-row"><button type="button" class="va-btn" data-act="artist">Художникът ⚙</button><button type="button" class="va-btn danger" data-act="del-project">Изтрий проекта</button></div></div><div data-flash class="va-muted" style="margin:8px 0 0"></div>' +
        (state.showArtist ? '<div style="margin:14px 0 0"><p class="va-sub">Това е стабилната основа, която художникът получава за всяка картинка (на английски, защото така разбира най-точно). Етикетите по сцените се добавят след нея. Ако упорито греши нещо, допиши едно изречение тук – важи за всички следващи.</p><textarea data-base>' + esc(d.base_prompt) + '</textarea><div class="vs-row" style="margin-top:8px"><button type="button" class="va-btn pri" data-act="save-base">Запази основата</button><button type="button" class="va-btn" data-act="reset-base">Върни стандартната</button></div></div>' : '') + '</div>';
      html += '<div class="va-card"><div class="vs-drop" data-drop><b>Качи картинки на сцените</b><br><span class="va-muted">Цъкни тук или пусни файловете (PNG/JPG от SketchUp). Всяка картинка става отделна сцена.</span><input type="file" accept="image/*" multiple hidden data-file></div></div>';
      html += d.scenes.map(function (s) {
        var last = s.renders[0];
        return '<div class="vs-scene" data-scene-box="' + esc(s.id) + '"><div class="vs-scene-head"><input type="text" data-sname data-scene="' + esc(s.id) + '" value="' + esc(s.name) + '" style="max-width:260px;font-weight:700"><div class="vs-row"><button type="button" class="va-btn danger" data-act="del-scene" data-id="' + esc(s.id) + '">Изтрий сцената</button></div></div>' +
          '<div class="vs-pair"><div><div class="vs-lbl">Скица от SketchUp</div><img src="' + esc(s.sketch_url) + '" data-big="' + esc(s.sketch_url) + '" style="cursor:zoom-in"></div><div><div class="vs-lbl">Последна снимка</div>' +
          (last && last.status === 'done' ? '<img src="' + esc(last.image_url) + '" data-big="' + esc(last.image_url) + '" style="cursor:zoom-in">' : last && (last.status === 'queued' || last.status === 'in_progress') ? '<div style="padding:40px 10px;text-align:center;color:#c98a2b">Художникът рисува… (обикновено 1–2 минути)</div>' : last && last.status === 'failed' ? '<div class="va-err" style="padding:20px 10px">' + esc(last.error || 'Не се получи') + '</div>' : '<div class="va-muted" style="padding:40px 10px;text-align:center">Още няма снимка</div>') + '</div></div>' +
          tagSelects(s) +
          '<div class="vs-row"><button type="button" class="va-btn pri" data-act="render" data-id="' + esc(s.id) + '">🎨 Нарисувай</button><input type="text" data-note data-scene="' + esc(s.id) + '" placeholder="Забележка за повторение (напр. „дръжките да са черни“)" style="flex:1;min-width:220px"><button type="button" class="va-btn" data-act="render-note" data-id="' + esc(s.id) + '">↻ Повтори със забележката</button>' + (last && last.status === 'done' ? '<a class="va-btn" href="' + esc(last.image_url) + '" download target="_blank" rel="noopener" style="text-decoration:none;display:inline-flex;align-items:center">⬇ Изтегли снимката</a>' : '') + '</div>' +
          (s.renders.length > 1 ? '<div class="vs-lbl" style="margin-top:12px">Всички опити (' + s.renders.length + ')</div><div class="vs-renders">' + s.renders.map(function (r) {
            return '<div class="vs-r">' + (r.status === 'done' ? '<img src="' + esc(r.image_url) + '" data-big="' + esc(r.image_url) + '" style="cursor:zoom-in">' : '') + '<div class="st ' + (r.status === 'failed' ? 'bad' : r.status === 'done' ? '' : 'busy') + '">' + bgTime(r.created_at) + (r.note ? ' · „' + esc(r.note) + '“' : '') + (r.status === 'failed' ? ' · ' + esc(r.error || 'грешка') : r.status === 'done' ? '' : ' · рисува…') + '</div><div class="vs-row">' + (r.status === 'done' ? '<a class="va-btn" href="' + esc(r.image_url) + '" download target="_blank" rel="noopener" style="text-decoration:none">⬇</a>' : '') + '<button type="button" class="va-btn" data-act="prompt" data-id="' + esc(r.id) + '" title="Какво точно получи художникът">?</button><button type="button" class="va-btn danger" data-act="del-render" data-id="' + esc(r.id) + '">✕</button></div></div>';
          }).join('') + '</div>' : '') + '</div>';
      }).join('');
      if (!d.scenes.length) html += '<p class="va-muted">Качи първата сцена, за да започнем.</p>';
      return html;
    }
    function render() {
      panel.innerHTML = '<div class="vs">' + (state.view === 'project' && state.p ? renderProject() : renderList()) + '</div>';
      schedulePoll();
    }

    function sceneTags(id) {
      var tags = {};
      [].forEach.call(panel.querySelectorAll('select[data-tag][data-scene="' + id + '"]'), function (s) { tags[s.dataset.tag] = s.value; });
      var ex = panel.querySelector('input[data-extra][data-scene="' + id + '"]'); tags.extra = ex ? ex.value.trim() : '';
      var nm = panel.querySelector('input[data-sname][data-scene="' + id + '"]');
      return { tags: tags, name: nm ? nm.value.trim() : '' };
    }
    function upload(files) {
      var list = [].slice.call(files).filter(function (f) { return /^image\//.test(f.type); });
      if (!list.length) return;
      flash('Качвам ' + list.length + ' сцени…');
      setBusy(true);
      list.reduce(function (chain, f, i) {
        return chain.then(function () { return shrink(f); }).then(function (dataUrl) {
          return call({ action: 'scene_add', project_id: state.p.project.id, data_url: dataUrl, name: f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').slice(0, 60) || ('Сцена ' + (state.p.scenes.length + i + 1)) })
            .then(function (d) { if (d.ok) state.p = d; else flash(d.error || 'Грешка', true); });
        });
      }, Promise.resolve()).then(function () { setBusy(false); render(); }).catch(function (e) { setBusy(false); flash(e.message, true); });
    }

    panel.addEventListener('click', function (e) {
      var big = e.target.closest('[data-big]');
      if (big) { var o = el('div', 'vs-big', '<img src="' + esc(big.dataset.big) + '">'); o.addEventListener('click', function () { o.remove(); }); document.body.appendChild(o); return; }
      if (e.target.closest('[data-drop]') && !e.target.closest('input')) { panel.querySelector('[data-file]').click(); return; }
      var open = e.target.closest('[data-open]'); if (open) return act({ action: 'project_get', id: open.dataset.open });
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var a = b.dataset.act, id = b.dataset.id;
      if (a === 'new') { var n = panel.querySelector('[data-new-name]').value.trim(); if (!n) { flash('Напиши име на проекта.', true); return; } return act({ action: 'project_create', name: n }); }
      if (a === 'back') { state.view = 'list'; return act({ action: 'projects' }); }
      if (a === 'save-project') return act({ action: 'project_update', id: state.p.project.id, name: panel.querySelector('[data-pname]').value, client: panel.querySelector('[data-pclient]').value }, function () { flash('Запазено.'); });
      if (a === 'del-project') { if (!confirm('Да изтрия ли целия проект с всички сцени и снимки?')) return; return act({ action: 'project_delete', id: state.p.project.id }, function () { state.view = 'list'; act({ action: 'projects' }); }); }
      if (a === 'artist') { state.showArtist = !state.showArtist; render(); return; }
      if (a === 'save-base') return act({ action: 'base_prompt_set', value: panel.querySelector('[data-base]').value }, function (d) { state.p.base_prompt = d.base_prompt; flash('Основата е запазена.'); });
      if (a === 'reset-base') { if (!confirm('Да върна ли стандартната основа?')) return; return act({ action: 'base_prompt_set', value: '' }, function (d) { state.p.base_prompt = d.base_prompt; render(); }); }
      if (a === 'del-scene') { if (!confirm('Да изтрия ли сцената и снимките ѝ?')) return; return act({ action: 'scene_delete', id: id }); }
      if (a === 'render' || a === 'render-note') {
        var st = sceneTags(id), noteEl = panel.querySelector('input[data-note][data-scene="' + id + '"]'), note = a === 'render-note' && noteEl ? noteEl.value.trim() : '';
        if (a === 'render-note' && !note) { flash('Напиши забележката, после „Повтори“.', true); return; }
        return act({ action: 'scene_update', id: id, name: st.name, tags: st.tags }).then(function () { return act({ action: 'render', scene_id: id, note: note }, function () { flash('Художникът започна. Резултатът се появява сам след 1–2 минути.'); }); });
      }
      if (a === 'del-render') return act({ action: 'render_delete', id: id });
      if (a === 'prompt') return call({ action: 'render_prompt', id: id }).then(function (d) { alert(d.prompt || d.error || ''); });
    });
    panel.addEventListener('change', function (e) {
      var f = e.target.closest('[data-file]'); if (f) { upload(f.files); f.value = ''; return; }
      var t = e.target.closest('select[data-tag], input[data-extra]'); if (t && state.p) { var st = sceneTags(t.dataset.scene); call({ action: 'scene_update', id: t.dataset.scene, name: st.name, tags: st.tags }); }
    });
    panel.addEventListener('dragover', function (e) { var z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.add('on'); } });
    panel.addEventListener('dragleave', function (e) { var z = e.target.closest('[data-drop]'); if (z) z.classList.remove('on'); });
    panel.addEventListener('drop', function (e) { var z = e.target.closest('[data-drop]'); if (z) { e.preventDefault(); z.classList.remove('on'); upload(e.dataTransfer.files); } });

    panel.innerHTML = '<div class="vs"><div class="va-card"><p class="va-muted" style="margin:0">Зареждам…</p></div></div>';
    act({ action: 'projects' });
  }

  function mount(bar) {
    if (bar.querySelector('[data-tab="visual"]')) return;
    var shell = bar.parentElement;
    var tab = el('button', 'vo-tab', 'Визуализации'); tab.type = 'button'; tab.setAttribute('data-tab', 'visual');
    bar.appendChild(tab);
    var panel = el('div', 'vs-panel'); panel.hidden = true; shell.appendChild(panel);
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
  (function wait() {
    var bar = document.querySelector('.office-shell .vo-tabs');
    if (bar) return mount(bar);
    if (++tries < 60) setTimeout(wait, 250);
  })();
})();
