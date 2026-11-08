/* /verde-office: "Епизоди" tab — short scripted clips with the mascots (Фикс и Микси).
   The owner writes the dialogue line by line, each line gets its voice from ElevenLabs (per-character voice,
   pronunciation dictionary applied). Then one muted Vidu scene per line (who speaks, who reacts) from the reference
   picture of the duo, and this script stitches everything in the browser: scene + our audio + big captions + logo
   card → one MP4 (WebCodecs + mp4-muxer, Chrome/Edge). HeyGen talking-heads render stays as a fallback.
   Data: /contract-automation/api/episodes. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/episodes';
  var VS_API = location.origin + '/contract-automation/api/visual-studio';
  var MUXER_URL = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm';
  var FPS = 30, TAIL = 0.35, OUTRO_SEC = 2.5;
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

  /* ---------- stitcher: scenes + our audio + captions + outro → MP4 ---------- */
  function wrapLines(g, text, maxW) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur);
    return lines;
  }
  function drawCaption(g, W, H, text, color) {
    var base = Math.round(Math.min(W, H) * 0.058);
    g.save(); g.font = '800 ' + base + 'px Montserrat, Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    var lines = wrapLines(g, text, W * 0.86), lh = base * 1.22, y0 = H * (W > H ? 0.86 : 0.8) - (lines.length - 1) * lh;
    lines.forEach(function (l, i) {
      var y = y0 + i * lh, tw = g.measureText(l).width + base * 0.8;
      g.fillStyle = 'rgba(20,20,20,.72)'; roundRect(g, W / 2 - tw / 2, y - base * 0.95, tw, base * 1.28, base * 0.3); g.fill();
      g.fillStyle = color || '#fff'; g.fillText(l, W / 2, y);
    });
    g.restore();
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function drawOutro(g, W, H, lines, alpha) {
    g.save(); g.globalAlpha = alpha; g.fillStyle = '#2f6b2a'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var base = Math.round(Math.min(W, H) * 0.06);
    var rows = [];
    lines.forEach(function (l, i) { g.font = (i === 0 ? '800 ' : '500 ') + Math.round(base * (i === 0 ? 1.3 : 0.7)) + 'px Montserrat, Arial, sans-serif'; wrapLines(g, l, W * 0.84).forEach(function (t) { rows.push({ t: t, i: i, font: g.font }); }); });
    rows.forEach(function (r, k) { g.font = r.font; g.fillStyle = r.i === 0 ? '#fff' : '#e3efe3'; g.fillText(r.t, W / 2, H / 2 + (k - (rows.length - 1) / 2) * base * 1.5); });
    g.restore();
  }
  function drawTag(g, W, H) {
    g.save(); g.globalAlpha = 0.85; g.font = '700 ' + Math.round(Math.min(W, H) * 0.026) + 'px Montserrat, Arial, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8; g.fillStyle = '#fff'; g.fillText('ВЕРДЕ-М', Math.round(W * 0.04), Math.round(H * 0.035)); g.restore();
  }

  function stitch(opts) {
    // opts: { W, H, parts:[{clip:Blob, audio:ArrayBuffer, text, color}], outro:[..], captions:bool, onProgress }
    if (!window.VideoEncoder || !window.AudioEncoder || !window.VideoFrame || !window.AudioData) return Promise.reject(new Error('Този браузър не поддържа видео кодиране (WebCodecs). Използвай Chrome или Edge.'));
    var W = opts.W, H = opts.H, c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    var SR = 48000, actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
    return import(MUXER_URL).then(function (M) {
      return Promise.all(opts.parts.map(function (p) { return actx.decodeAudioData(p.audio.slice(0)); })).then(function (buffers) {
        var muxer = new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, audio: { codec: 'aac', sampleRate: SR, numberOfChannels: 1 }, fastStart: 'in-memory' });
        var venc = new VideoEncoder({ output: function (ch, meta) { muxer.addVideoChunk(ch, meta); }, error: function (e) { console.error(e); } });
        venc.configure({ codec: W * H > 2073600 ? 'avc1.640033' : 'avc1.640028', width: W, height: H, bitrate: W * H > 1500000 ? 4500000 : 3500000, framerate: FPS });
        var aenc = new AudioEncoder({ output: function (ch, meta) { muxer.addAudioChunk(ch, meta); }, error: function (e) { console.error(e); } });
        aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 1, bitrate: 128000 });
        // one mono track: every part's speech at its scene start, silence elsewhere
        var starts = [], total = 0;
        opts.parts.forEach(function (p, i) { starts.push(total); p.sec = Math.max(1, buffers[i].duration + TAIL); total += p.sec; });
        var outroStart = total; total += OUTRO_SEC;
        var samples = Math.ceil(total * SR), pcm = new Float32Array(samples);
        buffers.forEach(function (b, i) { var d = b.getChannelData(0), o = Math.round(starts[i] * SR); for (var k = 0; k < d.length && o + k < samples; k++) pcm[o + k] = d[k]; });
        var CH = 1024;
        for (var off = 0; off < samples; off += CH) {
          var len = Math.min(CH, samples - off);
          var ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: len, numberOfChannels: 1, timestamp: Math.round(off * 1e6 / SR), data: pcm.subarray(off, off + len) });
          aenc.encode(ad); ad.close();
        }
        var n = 0, est = Math.round(total * FPS);
        function addFrame() {
          var f = new VideoFrame(c, { timestamp: Math.round(n * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
          venc.encode(f, { keyFrame: n % (FPS * 2) === 0 }); f.close(); n++;
          if (opts.onProgress) opts.onProgress(Math.min(0.99, n / est));
          return venc.encodeQueueSize > 12 ? new Promise(function (r) { setTimeout(r, 25); }) : Promise.resolve();
        }
        var seq = Promise.resolve();
        opts.parts.forEach(function (p) {
          seq = seq.then(function () {
            return new Promise(function (resolve, reject) {
              var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(p.clip);
              v.addEventListener('loadedmetadata', function () {
                var frameCount = Math.round(p.sec * FPS), i = 0, maxT = Math.max(0.05, v.duration - 0.05);
                function step() {
                  if (i >= frameCount) { URL.revokeObjectURL(v.src); return resolve(); }
                  v.currentTime = Math.min(maxT, i / FPS);
                }
                v.addEventListener('seeked', function () {
                  var k = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * k, dh = v.videoHeight * k;
                  g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
                  drawTag(g, W, H);
                  if (opts.captions && p.text) drawCaption(g, W, H, p.text, p.color);
                  i++; addFrame().then(step);
                });
                step();
              });
              v.addEventListener('error', function () { reject(new Error('Сцената не може да се прочете')); });
            });
          });
        });
        for (var i = 0; i < Math.round(OUTRO_SEC * FPS); i++) (function (i) { seq = seq.then(function () { drawOutro(g, W, H, opts.outro, Math.min(1, i / (FPS * 0.3))); return addFrame(); }); })(i);
        return seq.then(function () { return Promise.all([venc.flush(), aenc.flush()]); }).then(function () { muxer.finalize(); actx.close(); return new Blob([muxer.target.buffer], { type: 'video/mp4' }); });
      });
    });
  }

  function start(panel) {
    var ov = null, cur = null, draft = null, looks = null, busy = false, pollTimer = null, settingsOpen = false, vsScenes = null, result = null, progress = 0;

    function charById(id) { return (ov.characters || []).filter(function (c) { return c.id === id; })[0]; }
    function charByName(name) { return (ov.characters || []).filter(function (c) { return c.name === name; })[0]; }

    function fromServer(d) {
      cur = d.episode; cur.lines = d.lines;
      draft = { id: cur.id, title: cur.title, aspect: cur.aspect, captions: !!cur.captions, scene_image_url: cur.scene_image_url || '', lines: d.lines.map(function (l) { return { id: l.id, character_id: l.character_id, text: l.text }; }) };
      var clipsBusy = d.lines.some(function (l) { return l.clip_status === 'queued' || l.clip_status === 'in_progress'; });
      if (cur.status === 'rendering' || clipsBusy) schedulePoll(); else stopPoll();
    }
    function schedulePoll() { stopPoll(); pollTimer = setTimeout(function () { if (!cur) return; call({ action: 'episode_get', id: cur.id }).then(function (r) { if (r.ok && cur && r.episode.id === cur.id) { fromServer(r); render(); } }); }, 8000); }
    function stopPoll() { if (pollTimer) clearTimeout(pollTimer); pollTimer = null; }

    function newDraft(sample) {
      cur = null; stopPoll();
      draft = { id: '', title: sample ? SAMPLE.title : '', aspect: '9:16', captions: true, scene_image_url: (vsScenes && vsScenes[0] && vsScenes[0].url) || '', lines: [] };
      if (sample) SAMPLE.lines.forEach(function (p) { var c = charByName(p[0]) || ov.characters[0]; draft.lines.push({ id: '', character_id: c ? c.id : '', text: p[1] }); });
      else draft.lines.push({ id: '', character_id: ov.characters[0] ? ov.characters[0].id : '', text: '' });
    }

    function render(msg, isErr) {
      if (!ov) { panel.innerHTML = '<div class="ve"><div class="va-card"><p class="va-err">' + esc(msg || 'Няма данни') + '</p></div></div>'; return; }
      var h = '<div class="ve">';
      if (!ov.keys.elevenlabs || !ov.keys.vidu) h += '<div class="va-card"><p class="va-err">Липсва ключ в Webflow Cloud: ' + (!ov.keys.elevenlabs ? 'ELEVENLABS_API_KEY ' : '') + (!ov.keys.vidu ? 'VIDU_API_KEY' : '') + '. Без него ' + (!ov.keys.elevenlabs ? 'озвучаването' : 'сцените') + ' няма да тръгнат.</p></div>';
      h += '<div class="ve-grid"><div>';
      h += '<div class="va-card"><h3>Епизоди</h3><p class="va-sub">Кратки клипове с Фикс и Микси</p>';
      h += '<div class="ve-row"><button class="va-btn primary" data-act="new">+ Нов епизод</button><button class="va-btn" data-act="sample">Примерен „Горе-долу“</button></div><div class="ve-list">';
      if (!ov.episodes.length) h += '<p class="va-muted">Още няма епизоди.</p>';
      ov.episodes.forEach(function (e) {
        h += '<button data-open="' + esc(e.id) + '" class="' + (cur && cur.id === e.id ? 'is-on' : '') + '">' + esc(e.title) + '<small>' + e.lines + ' реплики · ' + e.voiced + ' озвучени · ' + (e.final_size ? '<span class="ve-status done">✓ видео</span>' : '<span class="ve-status ' + esc(e.status) + '">' + statusLabel(e.status) + '</span>') + '</small></button>';
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
        h += '<label>Как изглежда (за промпта, на английски)</label><textarea data-f="look">' + esc(c.look || '') + '</textarea>';
        h += '<label>Как реагира, когато другият говори (на английски)</label><textarea data-f="react">' + esc(c.react || '') + '</textarea>';
        h += '<label>Поведение в кадър при HeyGen (motion prompt, на английски)</label><textarea data-f="motion">' + esc(c.motion) + '</textarea>';
        h += '<label>Изразителност</label><select data-f="expressiveness">' + ['low', 'medium', 'high'].map(function (v) { return '<option value="' + v + '"' + (v === (c.expressiveness || 'medium') ? ' selected' : '') + '>' + { low: 'ниска', medium: 'средна', high: 'висока' }[v] + '</option>'; }).join('') + '</select>';
        h += '<div class="ve-row" style="margin-top:10px"><button class="va-btn small" data-act="char-save" data-id="' + esc(c.id) + '">Запази</button><button class="va-btn small" data-act="char-del" data-id="' + esc(c.id) + '">Изтрий</button></div></div>';
      });
      h += '</div><div class="ve-row" style="margin-top:10px"><button class="va-btn small" data-act="char-add">+ Нов герой</button></div>';
      h += '<h3 style="margin-top:16px">Речник за произношение</h3><p class="va-sub">По един ред: <code>дума = как да се каже</code>. Прилага се преди озвучаване; текстът в субтитрите остава както е написан.</p>';
      h += '<textarea data-f="pron" style="min-height:90px">' + esc(Object.keys(ov.pronunciation).map(function (k) { return k + ' = ' + ov.pronunciation[k]; }).join('\n')) + '</textarea><div class="ve-row" style="margin-top:8px"><button class="va-btn small" data-act="pron-save">Запази речника</button></div>';
      return h;
    }

    function editorHtml() {
      var d = draft, h = '';
      if (cur && cur.final_url) {
        h += '<div class="va-card"><h3>Готов епизод</h3><p class="va-sub">Качен на сървъра – линкът се отваря и от телефона.</p>';
        h += '<video controls playsinline preload="metadata" src="' + esc(cur.final_url) + '"' + (d.aspect === '9:16' ? ' style="max-width:360px;display:block;margin:0 auto"' : '') + '></video>';
        h += '<div class="ve-row" style="margin-top:8px"><a class="va-btn primary" href="' + esc(cur.final_url) + '" target="_blank" rel="noopener">Отвори линка</a><a class="va-btn" href="' + esc(cur.final_url) + '" download="' + esc(d.title || 'episode') + '.mp4">⬇ Свали</a><button class="va-btn small" data-act="copylink">копирай линка</button></div></div>';
      }
      h += '<div class="va-card">';
      h += '<div class="ve-row"><input type="text" data-f="title" value="' + esc(d.title) + '" placeholder="Заглавие на епизода" style="font-weight:700;font-size:16px">';
      if (cur) h += '<span class="ve-status ' + esc(cur.status) + '">' + statusLabel(cur.status) + '</span>';
      h += '</div>';
      h += '<div class="ve-row"><label>Формат</label><select data-f="aspect" style="width:auto"><option value="9:16"' + (d.aspect === '9:16' ? ' selected' : '') + '>9:16 (Reels / TikTok)</option><option value="16:9"' + (d.aspect === '16:9' ? ' selected' : '') + '>16:9 (YouTube / сайт)</option></select>';
      h += '<label><input type="checkbox" data-f="captions"' + (d.captions ? ' checked' : '') + '> субтитри</label></div>';
      h += '<div class="ve-row"><label>Картинка с героите (от „Визуализации“)</label>';
      if (vsScenes) h += '<select data-f="scene_image_url" style="width:auto;max-width:360px"><option value="">— избери —</option>' + vsScenes.map(function (sc) { return '<option value="' + esc(sc.url) + '"' + (sc.url === d.scene_image_url ? ' selected' : '') + '>' + esc(sc.project + ' · ' + sc.name) + '</option>'; }).join('') + '</select>';
      else h += '<span class="va-muted">зареждам…</span>';
      if (d.scene_image_url) h += '<img src="' + esc(d.scene_image_url) + '" alt="" style="height:54px;border-radius:8px">';
      h += '</div>';
      if (result) h += '<video controls playsinline src="' + esc(result.url) + '"></video><div class="ve-row" style="margin-top:8px"><a class="va-btn primary" href="' + esc(result.url) + '" download="' + esc(d.title || 'episode') + '-' + (d.aspect === '16:9' ? '16x9' : '9x16') + '.mp4">⬇ Свали MP4</a><button class="va-btn" data-act="upload"' + (busy ? ' disabled' : '') + '>Качи на сървъра (линк за телефон / Content Studio)</button><span class="va-muted">' + result.note + '</span></div>';

      if (busy && progress > 0) h += '<div class="ve-tip">' + Math.round(progress * 100) + '%</div>';
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
          h += '<div class="ve-audio">' + (sl.audio_url ? '<audio controls preload="metadata" data-line-audio="' + esc(sl.id) + '" src="' + esc(sl.audio_url) + '"></audio>' : '') + (sl.error ? '<span class="va-err" style="font-size:12px">' + esc(sl.error) + '</span>' : '');
          h += '<button class="va-btn small" data-act="revoice" data-line="' + esc(sl.id) + '">преозвучи</button>';
          var cs = sl.clip_status || 'none';
          if (cs === 'done') h += '<span class="ve-status done">сцена готова</span><button class="va-btn small" data-act="clip-view" data-line="' + esc(sl.id) + '">виж</button><button class="va-btn small" data-act="reclip" data-line="' + esc(sl.id) + '">нова сцена</button>';
          else if (cs === 'queued' || cs === 'in_progress') h += '<span class="ve-status rendering">сцената се прави…</span>';
          else if (cs === 'failed') h += '<span class="ve-status failed">сцена: грешка</span><span class="va-err" style="font-size:12px">' + esc(sl.clip_error || '') + '</span><button class="va-btn small" data-act="reclip" data-line="' + esc(sl.id) + '">опитай пак</button>';
          h += '</div>';
        } else if (sl && cur) h += '<div class="ve-audio"><span class="va-muted">още не е озвучена</span></div>';
        h += '</div>';
      });
      h += '<div class="ve-row"><button class="va-btn small" data-act="add">+ реплика</button></div>';
      var secs = d.lines.reduce(function (a, l) { return a + speechSeconds(l.text); }, 0);
      var voiced = serverLines.filter(function (x) { return x.audio_url; }).length;
      var changed = !cur || JSON.stringify(draft.lines.map(function (l) { return [l.character_id, l.text]; })) !== JSON.stringify(cur.lines.map(function (l) { return [l.character_id, l.text]; })) || draft.title !== cur.title || draft.aspect !== cur.aspect || draft.captions !== !!cur.captions || (draft.scene_image_url || '') !== (cur.scene_image_url || '');
      var clipsDone = serverLines.filter(function (x) { return x.clip_status === 'done'; }).length;
      var clipsBusy = serverLines.filter(function (x) { return x.clip_status === 'queued' || x.clip_status === 'in_progress'; }).length;
      h += '<div class="ve-tip">≈ ' + Math.round(secs) + ' сек говор · гласове ~' + money(secs * 0.004) + ' · сцени (Vidu) ~' + Math.round((secs + d.lines.length) * 28) + ' кредита (~' + money((secs + d.lines.length) * 0.1) + ')</div>';
      h += '<div class="ve-row">';
      h += '<button class="va-btn' + (changed ? ' primary' : '') + '" data-act="save">' + (cur ? 'Запази промените' : 'Запази епизода') + '</button>';
      if (cur) {
        h += '<button class="va-btn' + (!changed && voiced < d.lines.length ? ' primary' : '') + '" data-act="voice"' + (changed ? ' disabled title="първо запази"' : '') + '>Озвучи' + (voiced && voiced < d.lines.length ? ' останалите (' + (d.lines.length - voiced) + ')' : voiced ? ' наново' : '') + '</button>';
        h += '<button class="va-btn' + (!changed && voiced === d.lines.length && clipsDone < d.lines.length && !clipsBusy ? ' primary' : '') + '" data-act="scenes"' + (changed || voiced < d.lines.length || clipsBusy || !d.scene_image_url ? ' disabled' : '') + '>' + (clipsBusy ? 'Сцените се правят… (' + clipsBusy + ')' : clipsDone && clipsDone < d.lines.length ? 'Направи останалите сцени (' + (d.lines.length - clipsDone) + ')' : clipsDone ? 'Сцени наново' : 'Направи сцените (Vidu)') + '</button>';
        h += '<button class="va-btn' + (!changed && clipsDone === d.lines.length && !busy ? ' primary' : '') + '" data-act="stitch"' + (changed || clipsDone < d.lines.length || busy ? ' disabled' : '') + '>Сглоби епизода</button>';
        h += '<button class="va-btn small" data-act="render"' + (changed || voiced < d.lines.length || cur.status === 'rendering' ? ' disabled' : '') + ' title="резервен вариант: говорещи глави">HeyGen вариант</button>';
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
      var si = panel.querySelector('[data-f="scene_image_url"]'); if (si) draft.scene_image_url = si.value;
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

    function audioDurations() {
      // measured from the <audio> elements already on the page (metadata preloaded); falls back to a text estimate
      var out = {};
      return Promise.all((cur ? cur.lines : []).map(function (l) {
        var a = panel.querySelector('audio[data-line-audio="' + l.id + '"]');
        return new Promise(function (res) {
          if (!a) return res();
          if (a.readyState >= 1 && isFinite(a.duration)) { out[l.id] = a.duration; return res(); }
          var t = setTimeout(res, 4000);
          a.addEventListener('loadedmetadata', function () { clearTimeout(t); if (isFinite(a.duration)) out[l.id] = a.duration; res(); }, { once: true });
          a.load();
        });
      })).then(function () { (cur ? cur.lines : []).forEach(function (l) { if (!out[l.id]) out[l.id] = speechSeconds(l.text); }); return out; });
    }
    function scenesLoop(force, lineId) {
      if (!cur) return;
      busy = true; render('Пускам сцените във Vidu…');
      audioDurations().then(function (durations) {
        (function step(first) {
          call({ action: 'scenes', id: cur.id, force: !!(force && first), line_id: lineId || '', durations: durations }).then(function (r) {
            if (!r.ok) { busy = false; render(r.error, true); return; }
            fromServer(r);
            var pending = r.lines.filter(function (l) { return l.audio_url && l.clip_status !== 'done' && l.clip_status !== 'queued' && l.clip_status !== 'in_progress' && l.clip_status !== 'failed'; }).length;
            var running = r.lines.filter(function (l) { return l.clip_status === 'queued' || l.clip_status === 'in_progress'; }).length;
            if (!lineId && pending > 0) {
              // Vidu takes up to 3 at a time: when all slots are busy, check again in 20 s instead of hammering the server
              render('Сцените се правят по 3 наведнъж (' + running + ' в момента, чакат ' + pending + '). Vidu отнема 3–6 минути на сцена.');
              stopPoll(); setTimeout(function () { step(false); }, running >= 3 ? 20000 : 1500);
            }
            else { busy = false; render('Сцените се правят – Vidu обикновено отнема 3–6 минути на сцена. Страницата се обновява сама.'); }
          }).catch(function (e) { busy = false; render('Няма връзка: ' + e.message, true); });
        })(true);
      });
    }
    function clipBlob(lineId) {
      return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify({ action: 'clip_content', line_id: lineId }) })
        .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(j.error || 'Сцената не се изтегли'); }); return r.blob(); });
    }
    function stitchEpisode() {
      if (!cur || busy) return;
      busy = true; progress = 0; result = null; render('Свалям сцените и гласовете…');
      var W = draft.aspect === '16:9' ? 1920 : 1080, H = draft.aspect === '16:9' ? 1080 : 1920;
      var chars = {}; ov.characters.forEach(function (c) { chars[c.id] = c; });
      Promise.all(cur.lines.map(function (l) {
        return Promise.all([clipBlob(l.id), fetch(l.audio_url).then(function (r) { return r.arrayBuffer(); })]).then(function (x) {
          return { clip: x[0], audio: x[1], text: l.text.replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim(), color: (chars[l.character_id] || {}).color ? lighten(chars[l.character_id].color) : '#fff' };
        });
      })).then(function (parts) {
        return stitch({ W: W, H: H, parts: parts, captions: draft.captions, outro: ['ВЕРДЕ-М', 'мебели по поръчка', 'Безплатно замерване в София', 'verde-m.com'], onProgress: function (p) { if (p - progress > 0.02) { progress = p; render('Сглобявам…'); } } });
      }).then(function (blob) {
        busy = false; progress = 0;
        result = { url: URL.createObjectURL(blob), blob: blob, note: Math.round(blob.size / 1048576 * 10) / 10 + ' MB · ' + W + '×' + H };
        render('Епизодът е готов – пусни го и го свали.');
      }).catch(function (e) { busy = false; progress = 0; render('Не се получи: ' + e.message, true); });
    }
    function uploadFinal() {
      if (!cur || !result || !result.blob || busy) return;
      var blob = result.blob, CHUNK = 600000, total = Math.ceil(blob.size / CHUNK), seq = 0;
      busy = true; progress = 0; render('Качвам… 0%');
      function b64(ab) { var u = new Uint8Array(ab), s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
      (function next() {
        if (seq >= total) return;
        blob.slice(seq * CHUNK, Math.min(blob.size, (seq + 1) * CHUNK)).arrayBuffer().then(function (ab) {
          return call({ action: 'final_upload', id: cur.id, seq: seq, total: total, size: blob.size, b64: b64(ab) });
        }).then(function (r) {
          if (!r.ok) { busy = false; render(r.error, true); return; }
          seq++; progress = seq / total;
          if (r.done) { busy = false; progress = 0; cur.final_url = r.final_url; render('Качено. Линкът е под видеото – отваря се и от телефона.'); }
          else { render('Качвам… ' + Math.round(progress * 100) + '%'); next(); }
        }).catch(function (e) { busy = false; render('Няма връзка: ' + e.message, true); });
      })();
    }
    function lighten(hex) {
      var m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return '#fff';
      var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
      var f = function (v) { return Math.round(v + (255 - v) * 0.55); };
      return '#' + [f(r), f(g), f(b)].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
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
        result = null;
        run(call({ action: draft.id ? 'episode_update' : 'episode_create', id: draft.id, title: draft.title, aspect: draft.aspect, captions: draft.captions, scene_image_url: draft.scene_image_url, lines: lines }), 'Запазено.');
      }
      else if (act === 'voice') voiceLoop(cur && cur.lines.every(function (l) { return l.audio_url; }));
      else if (act === 'scenes') scenesLoop(cur && cur.lines.every(function (l) { return l.clip_status === 'done'; }), '');
      else if (act === 'reclip') scenesLoop(true, b.dataset.line);
      else if (act === 'clip-view') { var w = window.open('', '_blank'); clipBlob(b.dataset.line).then(function (blob) { w.location = URL.createObjectURL(blob); }).catch(function (e) { w.close(); render(e.message, true); }); }
      else if (act === 'stitch') stitchEpisode();
      else if (act === 'upload') uploadFinal();
      else if (act === 'copylink') { navigator.clipboard.writeText(cur.final_url).then(function () { render('Линкът е копиран.'); }); }
      else if (act === 'revoice') { busy = true; render('Преозвучавам…'); call({ action: 'voice', id: cur.id, line_id: b.dataset.line }).then(function (r) { busy = false; if (!r.ok) return render(r.error, true); fromServer(r); render('Готово.'); }); }
      else if (act === 'render') { if (!confirm('Да пусна ли HeyGen да направи видеото? Ще струва около ' + money(draft.lines.reduce(function (a, l) { return a + speechSeconds(l.text); }, 0) * 0.05) + ' от API портфейла.')) return; run(call({ action: 'render', id: cur.id }), 'Пуснато. Рендирането отнема няколко минути.'); }
      else if (act === 'delete') { if (!confirm('Да изтрия ли епизода „' + draft.title + '“ с озвучените реплики?')) return; var id = cur.id; cur = null; draft = null; stopPoll(); run(call({ action: 'episode_delete', id: id }), 'Изтрит.'); }
      else if (act === 'char-add') run(call({ action: 'character_save', name: 'Нов герой' }));
      else if (act === 'char-save' || act === 'char-del') {
        var card = b.closest('.ve-char'); var f = function (k) { var n = card.querySelector('[data-f="' + k + '"]'); return n ? n.value : ''; };
        if (act === 'char-del') { if (!confirm('Да изтрия ли героя?')) return; run(call({ action: 'character_delete', id: b.dataset.id })); }
        else run(call({ action: 'character_save', id: b.dataset.id, name: f('name'), color: f('color'), voice_id: f('voice_id'), avatar_id: f('avatar_id'), motion: f('motion'), expressiveness: f('expressiveness'), look: f('look'), react: f('react') }), 'Героят е запазен.');
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
      // scene pictures come from the "Визуализации" projects (any uploaded scene can be the reference picture)
      return fetch(VS_API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify({ action: 'projects' }) }).then(function (x) { return x.json(); }).then(function (pr) {
        if (!pr.ok) return;
        return Promise.all((pr.projects || []).slice(0, 20).map(function (p) {
          return fetch(VS_API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify({ action: 'project_get', id: p.id }) }).then(function (x) { return x.json(); })
            .then(function (v) { return (v.scenes || []).map(function (sc) { return { project: p.name, name: sc.name, url: sc.sketch_url }; }); }).catch(function () { return []; });
        })).then(function (all) { vsScenes = [].concat.apply([], all); render(); });
      });
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
