/* /verde-office: "Епизоди" tab — short scripted clips with the mascots (Фикс и Микси).
   The owner writes the dialogue line by line, each line gets its voice from ElevenLabs (per-character voice,
   pronunciation dictionary applied), then HeyGen renders the whole episode as one video: the photo avatars speak
   the lines in turn, lip-synced to our audio, with captions when wanted. Data: /contract-automation/api/episodes. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/episodes';
  var SAMPLE = {
    title: 'Горе-долу',
    lines: [
      ['Фикс', '[quickly] [smug] Измерих кухнята на клиента. Два метра и четирийсет. Горе-долу.'],
      ['Микси', '[quickly] [sarcastic] „Горе-долу“ не е мерна единица, Фикс.'],
      ['Фикс', '[smug] При мен – е.'],
      ['Микси', '[quickly] [dry] Два и четирийсет… а хладилникът влиза къде? В съседите ли?'],
      ['Фикс', '[quickly] [hesitant] Малка корекция. Два и трийсет и две. И контактът е зад фурната.'],
      ['Микси', '[quickly] [dry] Тоест – идваме да мерим ние.'],
      ['Фикс', '[quickly] [grumbling] Добре де. Но аз щях да го оправя. После.'],
      ['Микси', '[quickly] [warm] Затова при Верде-М замерваме безплатно на място. [playful] Преди „после“.']
    ]
  };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function speechSeconds(text) { return Math.max(1, String(text).replace(/\[[^\]]*\]/g, '').length * 0.075 + 0.4); }
  function money(usd) { return '$' + usd.toFixed(2) + ' (~' + (usd * 1.8).toFixed(2) + ' лв)'; }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.ve{font:14px/1.55 Montserrat,Arial,sans-serif;color:#2f332f}.ve .va-card{background:#fff;border:1px solid #e1e4df;border-radius:14px;padding:18px;margin:0 0 16px}',
      '.ve h3{font:700 15px/1.3 Montserrat,Arial,sans-serif;margin:0 0 4px}.ve .va-sub{color:#6a716b;font-size:13px;margin:0 0 12px}.ve .va-err{color:#9b1c10}.ve .va-muted{color:#6a716b;font-size:13px}.ve .va-ok{color:#2f6b2a}',
      '.ve .va-btn{min-height:34px;padding:6px 12px;border:1px solid #cfd4cb;border-radius:8px;background:#fff;color:#2f332f;font:600 13px Montserrat,Arial,sans-serif;cursor:pointer}.ve .va-btn[disabled]{opacity:.5;cursor:wait}.ve .va-btn.primary{background:#2f332f;color:#fff;border-color:#2f332f}.ve .va-btn.small{min-height:28px;padding:3px 9px;font-size:12px}',
      '.ve input[type=text],.ve textarea,.ve select{width:100%;box-sizing:border-box;border:1px solid #cfd4cb;border-radius:8px;padding:8px 10px;font:14px/1.45 Montserrat,Arial,sans-serif;color:#2f332f;background:#fff}.ve textarea{resize:vertical;min-height:54px}',
      '.ve-grid{display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start}@media(max-width:900px){.ve-grid{grid-template-columns:1fr}}',
      '.ve-list button{display:block;width:100%;text-align:left;border:1px solid #e1e4df;border-radius:10px;background:#fff;padding:9px 11px;margin:0 0 6px;cursor:pointer;font:inherit;color:inherit}.ve-list button.is-on{border-color:#2f332f;background:#f6f7f4}.ve-list small{display:block;color:#6a716b;font-size:12px}',
      '.ve-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 10px}.ve-row label{font-size:13px;color:#6a716b}.ve-row input[type=text]{width:auto;flex:1;min-width:160px}',
      '.ve-line{display:grid;grid-template-columns:120px 1fr auto;gap:8px;align-items:start;padding:10px;border:1px solid #e1e4df;border-radius:12px;margin:0 0 8px;background:#fbfbfa}',
      '.ve-who{display:flex;flex-direction:column;gap:4px}.ve-who button{border:1px solid #cfd4cb;border-radius:999px;background:#fff;padding:3px 9px;font:600 12px Montserrat,Arial,sans-serif;cursor:pointer;color:#2f332f}.ve-who button.is-on{color:#fff;border-color:transparent}',
      '.ve-tools{display:flex;flex-direction:column;gap:4px;align-items:flex-end}.ve-audio{grid-column:1/-1;display:flex;gap:10px;align-items:center;flex-wrap:wrap}.ve-audio audio{height:30px;max-width:320px}',
      '.ve-status{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;background:#eef0ec;color:#6a716b}.ve-status.done{background:#e3efe3;color:#2f6b2a}.ve-status.rendering{background:#fff4d6;color:#8a6300}.ve-status.failed{background:#fde3df;color:#9b1c10}',
      '.ve video{width:100%;max-height:520px;background:#000;border-radius:12px}.ve-chars{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.ve-char{border:1px solid #e1e4df;border-radius:12px;padding:12px}.ve-char label{display:block;font-size:12px;color:#6a716b;margin:8px 0 3px}',
      '.ve-tip{background:#f6f7f4;border-radius:10px;padding:10px 12px;font-size:13px;color:#4a504a;margin:0 0 12px}'
    ].join('');
    document.head.appendChild(s);
  }

  function call(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + r.status + ')' }; }); });
  }

  function start(panel) {
    var ov = null, cur = null, draft = null, looks = null, busy = false, pollTimer = null, settingsOpen = false;

    function charById(id) { return (ov.characters || []).filter(function (c) { return c.id === id; })[0]; }
    function charByName(name) { return (ov.characters || []).filter(function (c) { return c.name === name; })[0]; }

    function fromServer(d) {
      cur = d.episode; cur.lines = d.lines;
      draft = { id: cur.id, title: cur.title, aspect: cur.aspect, captions: !!cur.captions, lines: d.lines.map(function (l) { return { id: l.id, character_id: l.character_id, text: l.text }; }) };
      if (cur.status === 'rendering') schedulePoll(); else stopPoll();
    }
    function schedulePoll() { stopPoll(); pollTimer = setTimeout(function () { if (!cur) return; call({ action: 'episode_get', id: cur.id }).then(function (r) { if (r.ok && cur && r.episode.id === cur.id) { fromServer(r); render(); } }); }, 8000); }
    function stopPoll() { if (pollTimer) clearTimeout(pollTimer); pollTimer = null; }

    function newDraft(sample) {
      cur = null; stopPoll();
      draft = { id: '', title: sample ? SAMPLE.title : '', aspect: '9:16', captions: true, lines: [] };
      if (sample) SAMPLE.lines.forEach(function (p) { var c = charByName(p[0]) || ov.characters[0]; draft.lines.push({ id: '', character_id: c ? c.id : '', text: p[1] }); });
      else draft.lines.push({ id: '', character_id: ov.characters[0] ? ov.characters[0].id : '', text: '' });
    }

    function render(msg, isErr) {
      if (!ov) { panel.innerHTML = '<div class="ve"><div class="va-card"><p class="va-err">' + esc(msg || 'Няма данни') + '</p></div></div>'; return; }
      var h = '<div class="ve">';
      if (!ov.keys.elevenlabs || !ov.keys.heygen) h += '<div class="va-card"><p class="va-err">Липсва ключ в Webflow Cloud: ' + (!ov.keys.elevenlabs ? 'ELEVENLABS_API_KEY ' : '') + (!ov.keys.heygen ? 'HEYGEN_API_KEY' : '') + '. Без него ' + (!ov.keys.elevenlabs ? 'озвучаването' : 'видеото') + ' няма да тръгне.</p></div>';
      h += '<div class="ve-grid"><div>';
      h += '<div class="va-card"><h3>Епизоди</h3><p class="va-sub">Кратки клипове с Фикс и Микси</p>';
      h += '<div class="ve-row"><button class="va-btn primary" data-act="new">+ Нов епизод</button><button class="va-btn" data-act="sample">Примерен „Горе-долу“</button></div><div class="ve-list">';
      if (!ov.episodes.length) h += '<p class="va-muted">Още няма епизоди.</p>';
      ov.episodes.forEach(function (e) {
        h += '<button data-open="' + esc(e.id) + '" class="' + (cur && cur.id === e.id ? 'is-on' : '') + '">' + esc(e.title) + '<small>' + e.lines + ' реплики · ' + e.voiced + ' озвучени · <span class="ve-status ' + esc(e.status) + '">' + statusLabel(e.status) + '</span></small></button>';
      });
      h += '</div></div>';
      h += '<div class="va-card"><h3>Настройки <button class="va-btn small" data-act="settings">' + (settingsOpen ? 'скрий' : 'покажи') + '</button></h3>';
      if (settingsOpen) h += settingsHtml();
      h += '</div></div><div>';
      h += draft ? editorHtml() : '<div class="va-card"><p class="va-muted">Избери епизод отляво или направи нов.</p></div>';
      if (msg) h += '<p class="' + (isErr ? 'va-err' : 'va-ok') + '">' + esc(msg) + '</p>';
      h += '</div></div></div>';
      panel.innerHTML = h;
    }
    function statusLabel(s) { return { draft: 'чернова', rendering: 'рендира се…', done: 'готов', failed: 'грешка' }[s] || s; }

    function settingsHtml() {
      var h = '<p class="va-sub">Герои: глас (ElevenLabs voice ID), аватар (HeyGen) и как да се държи в кадър.</p><div class="ve-chars">';
      ov.characters.forEach(function (c) {
        h += '<div class="ve-char" data-char="' + esc(c.id) + '"><div class="ve-row"><input type="text" data-f="name" value="' + esc(c.name) + '" style="font-weight:700"><input type="color" data-f="color" value="' + esc(c.color || '#477448') + '" style="width:36px;height:34px;border:1px solid #cfd4cb;border-radius:8px;padding:2px;background:#fff"></div>';
        h += '<label>ElevenLabs глас (voice ID)</label><input type="text" data-f="voice_id" value="' + esc(c.voice_id) + '">';
        h += '<label>HeyGen аватар</label>';
        if (looks) {
          h += '<select data-f="avatar_id"><option value="">— избери —</option>' + looks.map(function (l) { return '<option value="' + esc(l.id) + '"' + (l.id === c.avatar_id ? ' selected' : '') + '>' + esc(l.name) + (l.status && l.status !== 'completed' ? ' (' + esc(l.status) + ')' : '') + '</option>'; }).join('') + '</select>';
        } else h += '<input type="text" data-f="avatar_id" value="' + esc(c.avatar_id) + '" placeholder="look id"> <button class="va-btn small" data-act="looks">Зареди аватарите от HeyGen</button>';
        h += '<label>Поведение в кадър (motion prompt, на английски)</label><textarea data-f="motion">' + esc(c.motion) + '</textarea>';
        h += '<label>Изразителност</label><select data-f="expressiveness">' + ['low', 'medium', 'high'].map(function (v) { return '<option value="' + v + '"' + (v === (c.expressiveness || 'medium') ? ' selected' : '') + '>' + { low: 'ниска', medium: 'средна', high: 'висока' }[v] + '</option>'; }).join('') + '</select>';
        h += '<div class="ve-row" style="margin-top:10px"><button class="va-btn small" data-act="char-save" data-id="' + esc(c.id) + '">Запази</button><button class="va-btn small" data-act="char-del" data-id="' + esc(c.id) + '">Изтрий</button></div></div>';
      });
      h += '</div><div class="ve-row" style="margin-top:10px"><button class="va-btn small" data-act="char-add">+ Нов герой</button></div>';
      h += '<h3 style="margin-top:16px">Речник за произношение</h3><p class="va-sub">По един ред: <code>дума = как да се каже</code>. Прилага се преди озвучаване; текстът в субтитрите остава както е написан.</p>';
      h += '<textarea data-f="pron" style="min-height:90px">' + esc(Object.keys(ov.pronunciation).map(function (k) { return k + ' = ' + ov.pronunciation[k]; }).join('\n')) + '</textarea><div class="ve-row" style="margin-top:8px"><button class="va-btn small" data-act="pron-save">Запази речника</button></div>';
      return h;
    }

    function editorHtml() {
      var d = draft, h = '<div class="va-card">';
      h += '<div class="ve-row"><input type="text" data-f="title" value="' + esc(d.title) + '" placeholder="Заглавие на епизода" style="font-weight:700;font-size:16px">';
      if (cur) h += '<span class="ve-status ' + esc(cur.status) + '">' + statusLabel(cur.status) + '</span>';
      h += '</div>';
      h += '<div class="ve-row"><label>Формат</label><select data-f="aspect" style="width:auto"><option value="9:16"' + (d.aspect === '9:16' ? ' selected' : '') + '>9:16 (Reels / TikTok)</option><option value="16:9"' + (d.aspect === '16:9' ? ' selected' : '') + '>16:9 (YouTube / сайт)</option></select>';
      h += '<label><input type="checkbox" data-f="captions"' + (d.captions ? ' checked' : '') + '> субтитри</label></div>';
      if (cur && cur.status === 'failed' && cur.error) h += '<p class="va-err">' + esc(cur.error) + '</p>';
      if (cur && cur.status === 'done' && cur.video_url) {
        h += '<video controls playsinline src="' + esc(cur.video_url) + '"' + (cur.thumb_url ? ' poster="' + esc(cur.thumb_url) + '"' : '') + '></video>';
        h += '<div class="ve-row" style="margin-top:8px"><a class="va-btn" href="' + esc(cur.video_url) + '" download="' + esc(cur.title) + '.mp4" target="_blank" rel="noopener">⬇ Свали MP4</a>' + (cur.duration ? '<span class="va-muted">' + Math.round(cur.duration) + ' сек</span>' : '') + '</div>';
      }
      if (cur && cur.status === 'rendering') h += '<div class="ve-tip">HeyGen рендира епизода – обикновено 2–6 минути. Страницата се обновява сама.</div>';
      h += '<h3 style="margin-top:14px">Реплики</h3>';
      var serverLines = cur ? cur.lines : [];
      d.lines.forEach(function (l, i) {
        var sl = serverLines.filter(function (x) { return x.id === l.id; })[0];
        h += '<div class="ve-line" data-i="' + i + '"><div class="ve-who">';
        ov.characters.forEach(function (c) { h += '<button data-who="' + esc(c.id) + '" class="' + (c.id === l.character_id ? 'is-on' : '') + '" style="' + (c.id === l.character_id ? 'background:' + esc(c.color) : '') + '">' + esc(c.name) + '</button>'; });
        h += '</div><textarea data-f="text" placeholder="Какво казва…">' + esc(l.text) + '</textarea>';
        h += '<div class="ve-tools"><button class="va-btn small" data-act="up" title="нагоре">↑</button><button class="va-btn small" data-act="down" title="надолу">↓</button><button class="va-btn small" data-act="del" title="махни">✕</button></div>';
        if (sl && (sl.audio_url || sl.error)) {
          h += '<div class="ve-audio">' + (sl.audio_url ? '<audio controls preload="none" src="' + esc(sl.audio_url) + '"></audio>' : '') + (sl.error ? '<span class="va-err" style="font-size:12px">' + esc(sl.error) + '</span>' : '');
          h += '<button class="va-btn small" data-act="revoice" data-line="' + esc(sl.id) + '">преозвучи</button></div>';
        } else if (sl && cur) h += '<div class="ve-audio"><span class="va-muted">още не е озвучена</span></div>';
        h += '</div>';
      });
      h += '<div class="ve-row"><button class="va-btn small" data-act="add">+ реплика</button></div>';
      var secs = d.lines.reduce(function (a, l) { return a + speechSeconds(l.text); }, 0);
      var voiced = serverLines.filter(function (x) { return x.audio_url; }).length;
      var changed = !cur || JSON.stringify(draft.lines.map(function (l) { return [l.character_id, l.text]; })) !== JSON.stringify(cur.lines.map(function (l) { return [l.character_id, l.text]; })) || draft.title !== cur.title || draft.aspect !== cur.aspect || draft.captions !== !!cur.captions;
      h += '<div class="ve-tip">≈ ' + Math.round(secs) + ' сек говор · гласове ~' + money(secs * 0.004) + ' · видео (HeyGen) ~' + money(secs * 0.05) + '</div>';
      h += '<div class="ve-row">';
      h += '<button class="va-btn' + (changed ? ' primary' : '') + '" data-act="save">' + (cur ? 'Запази промените' : 'Запази епизода') + '</button>';
      if (cur) {
        h += '<button class="va-btn' + (!changed && voiced < d.lines.length ? ' primary' : '') + '" data-act="voice"' + (changed ? ' disabled title="първо запази"' : '') + '>Озвучи' + (voiced && voiced < d.lines.length ? ' останалите (' + (d.lines.length - voiced) + ')' : voiced ? ' наново' : '') + '</button>';
        h += '<button class="va-btn' + (!changed && voiced === d.lines.length && cur.status !== 'rendering' ? ' primary' : '') + '" data-act="render"' + (changed || voiced < d.lines.length || cur.status === 'rendering' ? ' disabled' : '') + '>' + (cur.status === 'done' ? 'Направи видеото наново' : 'Направи видео') + '</button>';
        h += '<span style="flex:1"></span><button class="va-btn small" data-act="delete">Изтрий епизода</button>';
      }
      h += '</div></div>';
      return h;
    }

    function readDraft() {
      if (!draft) return;
      var t = panel.querySelector('[data-f="title"]'); if (t) draft.title = t.value;
      var a = panel.querySelector('[data-f="aspect"]'); if (a) draft.aspect = a.value;
      var c = panel.querySelector('[data-f="captions"]'); if (c) draft.captions = c.checked;
      [].forEach.call(panel.querySelectorAll('.ve-line'), function (row) { var i = Number(row.dataset.i); var ta = row.querySelector('[data-f="text"]'); if (draft.lines[i] && ta) draft.lines[i].text = ta.value; });
    }

    function run(p, okMsg) {
      if (busy) return; busy = true;
      [].forEach.call(panel.querySelectorAll('.va-btn'), function (b) { b.disabled = true; });
      p.then(function (r) {
        busy = false;
        if (!r.ok) { render(r.error || 'Грешка', true); return; }
        if (r.characters) ov.characters = r.characters;
        if (r.pronunciation) ov.pronunciation = r.pronunciation;
        if (r.looks) looks = r.looks;
        if (r.episode) fromServer(r);
        return refreshList().then(function () { render(okMsg); return r; });
      }).catch(function (e) { busy = false; render('Няма връзка: ' + e.message, true); });
    }
    function refreshList() { return call({ action: 'overview' }).then(function (r) { if (r.ok) { ov.episodes = r.episodes; ov.keys = r.keys; } }); }

    function voiceLoop(force) {
      if (!cur) return;
      busy = true; render('Озвучавам…');
      (function step(first) {
        call({ action: 'voice', id: cur.id, force: !!(force && first) }).then(function (r) {
          if (!r.ok) { busy = false; render(r.error, true); return; }
          fromServer(r); render('Озвучавам… остават ' + r.remaining);
          var failed = r.lines.filter(function (l) { return l.audio_status === 'failed'; }).length;
          if (r.remaining > 0 && !failed) step(false); else { busy = false; refreshList().then(function () { render(failed ? 'Някои реплики не се озвучиха – виж грешките под тях.' : 'Всички реплики са озвучени.', !!failed); }); }
        }).catch(function (e) { busy = false; render('Няма връзка: ' + e.message, true); });
      })(true);
    }

    panel.addEventListener('change', function () { readDraft(); });
    panel.addEventListener('click', function (e) {
      var who = e.target.closest('[data-who]');
      if (who) { readDraft(); var row = who.closest('.ve-line'); draft.lines[Number(row.dataset.i)].character_id = who.dataset.who; render(); return; }
      var open = e.target.closest('[data-open]');
      if (open) { readDraft(); run(call({ action: 'episode_get', id: open.dataset.open })); return; }
      var b = e.target.closest('[data-act]'); if (!b) return;
      var act = b.dataset.act;
      readDraft();
      if (act === 'new') { newDraft(false); render(); }
      else if (act === 'sample') { newDraft(true); render(); }
      else if (act === 'settings') { settingsOpen = !settingsOpen; render(); if (settingsOpen && !looks && ov.keys.heygen) run(call({ action: 'heygen_looks' })); }
      else if (act === 'looks') run(call({ action: 'heygen_looks' }));
      else if (act === 'add') { draft.lines.push({ id: '', character_id: (ov.characters[(draft.lines.length) % Math.max(1, ov.characters.length)] || {}).id || '', text: '' }); render(); }
      else if (act === 'del' || act === 'up' || act === 'down') {
        var i = Number(b.closest('.ve-line').dataset.i);
        if (act === 'del') draft.lines.splice(i, 1);
        else { var j = act === 'up' ? i - 1 : i + 1; if (j >= 0 && j < draft.lines.length) { var tmp = draft.lines[i]; draft.lines[i] = draft.lines[j]; draft.lines[j] = tmp; } }
        render();
      }
      else if (act === 'save') {
        var lines = draft.lines.filter(function (l) { return l.text.trim() && l.character_id; });
        if (!lines.length) { render('Напиши поне една реплика.', true); return; }
        run(call({ action: draft.id ? 'episode_update' : 'episode_create', id: draft.id, title: draft.title, aspect: draft.aspect, captions: draft.captions, lines: lines }), 'Запазено.');
      }
      else if (act === 'voice') voiceLoop(cur && cur.lines.every(function (l) { return l.audio_url; }));
      else if (act === 'revoice') { busy = true; render('Преозвучавам…'); call({ action: 'voice', id: cur.id, line_id: b.dataset.line }).then(function (r) { busy = false; if (!r.ok) return render(r.error, true); fromServer(r); render('Готово.'); }); }
      else if (act === 'render') { if (!confirm('Да пусна ли HeyGen да направи видеото? Ще струва около ' + money(draft.lines.reduce(function (a, l) { return a + speechSeconds(l.text); }, 0) * 0.05) + ' от API портфейла.')) return; run(call({ action: 'render', id: cur.id }), 'Пуснато. Рендирането отнема няколко минути.'); }
      else if (act === 'delete') { if (!confirm('Да изтрия ли епизода „' + draft.title + '“ с озвучените реплики?')) return; var id = cur.id; cur = null; draft = null; stopPoll(); run(call({ action: 'episode_delete', id: id }), 'Изтрит.'); }
      else if (act === 'char-add') run(call({ action: 'character_save', name: 'Нов герой' }));
      else if (act === 'char-save' || act === 'char-del') {
        var card = b.closest('.ve-char'); var f = function (k) { var n = card.querySelector('[data-f="' + k + '"]'); return n ? n.value : ''; };
        if (act === 'char-del') { if (!confirm('Да изтрия ли героя?')) return; run(call({ action: 'character_delete', id: b.dataset.id })); }
        else run(call({ action: 'character_save', id: b.dataset.id, name: f('name'), color: f('color'), voice_id: f('voice_id'), avatar_id: f('avatar_id'), motion: f('motion'), expressiveness: f('expressiveness') }), 'Героят е запазен.');
      }
      else if (act === 'pron-save') {
        var map = {};
        panel.querySelector('[data-f="pron"]').value.split('\n').forEach(function (line) { var p = line.split('='); if (p.length >= 2) { var k = p.shift().trim(), v = p.join('=').trim(); if (k && v) map[k] = v; } });
        run(call({ action: 'pronunciation_set', map: map }), 'Речникът е запазен.');
      }
    });

    call({ action: 'overview' }).then(function (r) {
      if (!r.ok) { render(r.error || 'Грешка', true); return; }
      ov = r; render();
    }).catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); });
  }

  function mount(bar) {
    if (bar.querySelector('[data-tab="episodes"]')) return;
    var shell = bar.parentElement;
    var tab = el('button', 'vo-tab', 'Епизоди'); tab.type = 'button'; tab.setAttribute('data-tab', 'episodes');
    bar.appendChild(tab);
    var panel = el('div', 've-panel'); panel.hidden = true; shell.appendChild(panel);
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
