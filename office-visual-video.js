/* /verde-office „Визуализации“ – video part. Loaded next to office-visual.js, which exposes window.__vsVideo hooks.
   Two engines: (1) "Камера" – smooth camera moves over the finished pictures, rendered in the browser (canvas +
   WebCodecs → MP4, no cost); (2) "AI видео" – one sora-2 clip per scene from the backend, then stitched here.
   Output: 16:9 (1920x1080) for the client and 9:16 (1080x1920) for Reels, with or without captions. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/visual-studio';
  var FPS = 30, SCENE_SEC = 4, FADE_SEC = 0.6, CARD_SEC = 2.2;
  var MUXER_URL = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm';

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function call(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify(body) });
  }
  function loadImage(url) { return new Promise(function (res, rej) { var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function () { res(i); }; i.onerror = function () { rej(new Error('Снимката не се зареди')); }; i.src = url + (url.indexOf('?') < 0 ? '?v=1' : '&v=1'); }); }
  // cover-crop a picture to w×h as a JPEG data URL (the AI video artist wants the exact size)
  function cover(img, w, h, q) {
    var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d');
    var k = Math.max(w / img.naturalWidth, h / img.naturalHeight), sw = w / k, sh = h / k;
    g.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    return c.toDataURL('image/jpeg', q || 0.92);
  }

  /* ---------- drawing ---------- */
  var ease = function (t) { return t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t; };
  var MOVES = [
    function (t) { return { z: 1.04 + 0.10 * t, x: 0.5, y: 0.5 }; },            // push in
    function (t) { return { z: 1.14 - 0.10 * t, x: 0.5, y: 0.5 }; },            // pull out
    function (t) { return { z: 1.12, x: 0.42 + 0.16 * t, y: 0.5 }; },           // pan right
    function (t) { return { z: 1.12, x: 0.58 - 0.16 * t, y: 0.5 }; },           // pan left
    function (t) { return { z: 1.06 + 0.08 * t, x: 0.45 + 0.08 * t, y: 0.52 - 0.04 * t }; } // diagonal
  ];
  function drawFrame(g, img, W, H, t, move) {
    var m = move(ease(t)), k = Math.max(W / img.naturalWidth, H / img.naturalHeight) * m.z;
    var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    g.drawImage(img, (W - dw) * m.x, (H - dh) * m.y, dw, dh);
  }
  function drawCard(g, W, H, lines, alpha) {
    g.save(); g.globalAlpha = alpha; g.fillStyle = '#141414'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
    var base = Math.round(Math.min(W, H) * 0.052);
    lines.forEach(function (l, i) { g.font = (i === 0 ? '700 ' : '500 ') + Math.round(base * (i === 0 ? 1.25 : 0.72)) + 'px Montserrat, Arial, sans-serif'; g.fillStyle = i === 0 ? '#fff' : '#cfd4cb'; g.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * base * 1.6); });
    g.restore();
  }
  function drawLogoTag(g, W, H) {
    g.save(); g.globalAlpha = 0.85; g.font = '700 ' + Math.round(Math.min(W, H) * 0.028) + 'px Montserrat, Arial, sans-serif'; g.textAlign = 'right'; g.textBaseline = 'bottom';
    g.shadowColor = 'rgba(0,0,0,.5)'; g.shadowBlur = 8; g.fillStyle = '#fff'; g.fillText('ВЕРДЕ-М · verde-m.com', W - Math.round(W * 0.03), H - Math.round(H * 0.03)); g.restore();
  }

  /* ---------- encoder (WebCodecs + mp4-muxer; MediaRecorder/WebM fallback) ---------- */
  function makeEncoder(W, H, onProgress) {
    if (window.VideoEncoder && window.VideoFrame) {
      return import(MUXER_URL).then(function (M) {
        var muxer = new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' });
        var enc = new VideoEncoder({ output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); }, error: function (e) { console.error(e); } });
        enc.configure({ codec: W * H > 2073600 ? 'avc1.640033' : 'avc1.640028', width: W, height: H, bitrate: 9000000, framerate: FPS });
        var n = 0;
        return {
          add: function (canvas) {
            var f = new VideoFrame(canvas, { timestamp: Math.round(n * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
            enc.encode(f, { keyFrame: n % (FPS * 2) === 0 }); f.close(); n++;
            if (onProgress) onProgress(n);
            return enc.encodeQueueSize > 12 ? new Promise(function (r) { setTimeout(r, 25); }) : Promise.resolve();
          },
          finish: function () { return enc.flush().then(function () { muxer.finalize(); return new Blob([muxer.target.buffer], { type: 'video/mp4' }); }); },
          ext: 'mp4'
        };
      });
    }
    return Promise.reject(new Error('Този браузър не поддържа видео кодиране (WebCodecs). Използвай Chrome или Edge.'));
  }

  /* ---------- the two engines ---------- */
  function renderCamera(opts) {
    // opts: { images:[], W, H, captions:{on, title, sub, outro:[]}, onProgress }
    var W = opts.W, H = opts.H, c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    var total = opts.images.length * SCENE_SEC * FPS + (opts.captions.on ? 2 * CARD_SEC * FPS : 0);
    var done = 0;
    return makeEncoder(W, H, function () { done++; if (opts.onProgress) opts.onProgress(done / total); }).then(function (enc) {
      var seq = Promise.resolve();
      function frames(count, draw) { for (var i = 0; i < count; i++) (function (i) { seq = seq.then(function () { draw(i / count, i); return enc.add(c); }); })(i); }
      if (opts.captions.on) frames(CARD_SEC * FPS, function (t) { drawCard(g, W, H, [opts.captions.title, opts.captions.sub], 1); if (t > 0.8) { g.save(); g.globalAlpha = (t - 0.8) / 0.2; drawFrame(g, opts.images[0], W, H, 0, MOVES[0]); g.restore(); } });
      opts.images.forEach(function (img, idx) {
        var move = MOVES[idx % MOVES.length], next = opts.images[idx + 1];
        frames(SCENE_SEC * FPS, function (t) {
          drawFrame(g, img, W, H, t, move);
          if (next && t > 1 - FADE_SEC / SCENE_SEC) { g.save(); g.globalAlpha = (t - (1 - FADE_SEC / SCENE_SEC)) / (FADE_SEC / SCENE_SEC); drawFrame(g, next, W, H, 0, MOVES[(idx + 1) % MOVES.length]); g.restore(); }
          if (opts.captions.on) drawLogoTag(g, W, H);
        });
      });
      if (opts.captions.on) frames(CARD_SEC * FPS, function (t) { drawFrame(g, opts.images[opts.images.length - 1], W, H, 1, MOVES[(opts.images.length - 1) % MOVES.length]); drawCard(g, W, H, opts.captions.outro, Math.min(1, t / 0.25)); });
      return seq.then(function () { return enc.finish(); });
    });
  }
  function renderStitch(opts) {
    // opts: { clips:[Blob], W, H, captions, onProgress } – plays each clip into the canvas and re-encodes
    var W = opts.W, H = opts.H, c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    var done = 0, est = opts.clips.length * 8 * FPS + (opts.captions.on ? 2 * CARD_SEC * FPS : 0);
    return makeEncoder(W, H, function () { done++; if (opts.onProgress) opts.onProgress(Math.min(0.99, done / est)); }).then(function (enc) {
      var seq = Promise.resolve();
      function frames(count, draw) { for (var i = 0; i < count; i++) (function (i) { seq = seq.then(function () { draw(i / count); return enc.add(c); }); })(i); }
      if (opts.captions.on) frames(CARD_SEC * FPS, function () { drawCard(g, W, H, [opts.captions.title, opts.captions.sub], 1); });
      opts.clips.forEach(function (blob) {
        seq = seq.then(function () {
          return new Promise(function (resolve, reject) {
            var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.src = URL.createObjectURL(blob);
            v.addEventListener('loadedmetadata', function () {
              var frameCount = Math.round(v.duration * FPS), i = 0;
              function step() {
                if (i >= frameCount) { URL.revokeObjectURL(v.src); return resolve(); }
                v.currentTime = Math.min(v.duration - 0.001, i / FPS);
              }
              v.addEventListener('seeked', function () {
                var k = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * k, dh = v.videoHeight * k;
                g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
                if (opts.captions.on) drawLogoTag(g, W, H);
                i++; enc.add(c).then(step);
              });
              step();
            });
            v.addEventListener('error', function () { reject(new Error('Клипът не може да се прочете')); });
          });
        });
      });
      if (opts.captions.on) frames(CARD_SEC * FPS, function (t) { drawCard(g, W, H, opts.captions.outro, Math.min(1, t / 0.25)); });
      return seq.then(function () { return enc.finish(); });
    });
  }

  /* ---------- UI, mounted by office-visual.js into a box inside the project view ---------- */
  function ui(box, ctx) {
    // ctx: { project(), refresh(), act(body, after) } from office-visual.js
    var state = { engine: 'camera', formats: { landscape: true, portrait: true }, captions: false, title: '', sub: 'Кухня по поръчка · ВЕРДЕ-М', outro: ['ВЕРДЕ-М · мебели по поръчка', 'verde-m.com · 0878 861 059 · ул. Пиротска 86, София'], busy: false, results: [] };
    function scenesReady() { return ctx.project().scenes.filter(function (s) { return s.renders.some(function (r) { return r.status === 'done'; }); }); }
    function render(msg, isErr) {
      var p = ctx.project(), ready = scenesReady();
      if (!state.title) state.title = p.project.name;
      var aiRows = state.engine === 'ai' ? ready.map(function (s) {
        var vids = (s.videos || []);
        var row = function (o) { var v = vids.filter(function (x) { return x.orientation === o; })[0]; if (!v) return '<span class="va-muted">няма клип</span>'; return v.status === 'done' ? '<span style="color:#477448">готов</span>' : v.status === 'failed' ? '<span class="va-err">' + esc(v.error || 'грешка') + '</span>' : '<span style="color:#c98a2b">прави се…</span>'; };
        return '<tr><td><label><input type="checkbox" data-sc="' + esc(s.id) + '" checked> ' + esc(s.name) + '</label></td><td>' + row('landscape') + '</td><td>' + row('portrait') + '</td></tr>';
      }).join('') : '';
      box.innerHTML = '<div class="va-card"><h3>Видео от сцените</h3><p class="va-sub">' + (ready.length ? ready.length + ' сцени със снимка са готови за видео.' : 'Първо нарисувай поне една сцена.') + ' Видеото се сглобява тук, в браузъра (Chrome/Edge), и се изтегля като MP4.</p>' +
        '<div class="vs-tags"><div><label>Как</label><select data-engine><option value="camera"' + (state.engine === 'camera' ? ' selected' : '') + '>Движение на камерата по снимките (безплатно)</option><option value="ai"' + (state.engine === 'ai' ? ' selected' : '') + '>AI видео – камерата влиза в кухнята (~0,80 € на сцена и формат)</option></select></div>' +
        '<div><label>Формати</label><label style="display:inline;font-size:13px;color:#2f332f"><input type="checkbox" data-fmt="landscape"' + (state.formats.landscape ? ' checked' : '') + '> 16:9 за клиента</label> &nbsp; <label style="display:inline;font-size:13px;color:#2f332f"><input type="checkbox" data-fmt="portrait"' + (state.formats.portrait ? ' checked' : '') + '> 9:16 за Reels</label></div>' +
        '<div><label>Надписи</label><select data-cap><option value="0"' + (!state.captions ? ' selected' : '') + '>Без надписи</option><option value="1"' + (state.captions ? ' selected' : '') + '>С надписи (начало, лого, контакти накрая)</option></select></div></div>' +
        (state.captions ? '<div class="vs-tags"><div><label>Заглавие в началото</label><input type="text" data-title value="' + esc(state.title) + '"></div><div><label>Подзаглавие</label><input type="text" data-sub value="' + esc(state.sub) + '"></div><div style="grid-column:1/-1"><label>Край (два реда)</label><input type="text" data-outro1 value="' + esc(state.outro[0]) + '" style="margin-bottom:6px"><input type="text" data-outro2 value="' + esc(state.outro[1]) + '"></div></div>' : '') +
        (state.engine === 'ai' && ready.length ? '<table style="width:100%;border-collapse:collapse;font-size:13px;margin:6px 0 10px"><tr><th style="text-align:left;padding:4px">Сцена</th><th style="text-align:left;padding:4px">16:9</th><th style="text-align:left;padding:4px">9:16</th></tr>' + aiRows + '</table><div class="vs-row"><input type="text" data-motion placeholder="Движение (по желание, напр. „бавно завъртане надясно“)" style="flex:1;min-width:220px"><button type="button" class="va-btn" data-act="ai-make">🎬 Поръчай AI клипове за избраните</button></div><p class="va-muted" style="margin:8px 0 0">Всеки клип отнема 2–5 минути. Когато всички са „готов“, натисни „Сглоби видеото“.</p>' : '') +
        '<div class="vs-row" style="margin-top:10px"><button type="button" class="va-btn pri" data-act="build"' + (ready.length ? '' : ' disabled') + '>▶ Сглоби видеото</button><div data-prog class="va-muted"></div></div>' +
        (msg ? '<p class="' + (isErr ? 'va-err' : 'va-muted') + '" style="margin:10px 0 0">' + esc(msg) + '</p>' : '') +
        (state.results.length ? '<div class="vs-row" style="margin-top:12px">' + state.results.map(function (r) { return '<a class="va-btn" href="' + r.url + '" download="' + esc(r.name) + '" style="text-decoration:none">⬇ ' + esc(r.label) + '</a>'; }).join('') + '</div>' : '') + '</div>';
    }
    function readForm() {
      state.engine = box.querySelector('[data-engine]').value;
      state.formats.landscape = box.querySelector('[data-fmt="landscape"]').checked;
      state.formats.portrait = box.querySelector('[data-fmt="portrait"]').checked;
      state.captions = box.querySelector('[data-cap]').value === '1';
      var t = box.querySelector('[data-title]'); if (t) { state.title = t.value; state.sub = box.querySelector('[data-sub]').value; state.outro = [box.querySelector('[data-outro1]').value, box.querySelector('[data-outro2]').value]; }
    }
    function captions() { return { on: state.captions, title: state.title, sub: state.sub, outro: state.outro }; }
    function lastImage(s) { return s.renders.filter(function (r) { return r.status === 'done'; })[0].image_url; }

    function build() {
      readForm();
      var fmts = []; if (state.formats.landscape) fmts.push({ key: 'landscape', W: 1920, H: 1080, label: 'MP4 16:9 (за клиента)' }); if (state.formats.portrait) fmts.push({ key: 'portrait', W: 1080, H: 1920, label: 'MP4 9:16 (за Reels)' });
      if (!fmts.length) return render('Избери поне един формат.', true);
      var scenes = scenesReady(); if (!scenes.length) return;
      state.busy = true; state.results = []; render('Сглобявам… не затваряй страницата.');
      var prog = box.querySelector('[data-prog]'); var btn = box.querySelector('[data-act="build"]'); if (btn) btn.disabled = true;
      var seq = Promise.resolve();
      fmts.forEach(function (f) {
        seq = seq.then(function () {
          var onProgress = function (p) { if (prog) prog.textContent = f.label + ': ' + Math.round(p * 100) + '%'; };
          if (state.engine === 'camera') {
            return Promise.all(scenes.map(function (s) { return loadImage(lastImage(s)); })).then(function (imgs) { return renderCamera({ images: imgs, W: f.W, H: f.H, captions: captions(), onProgress: onProgress }); });
          }
          var ids = scenes.map(function (s) { var v = (s.videos || []).filter(function (x) { return x.orientation === f.key && x.status === 'done'; })[0]; return v && v.id; }).filter(Boolean);
          if (!ids.length) throw new Error('Няма готови AI клипове за ' + f.label + '. Поръчай ги първо.');
          return Promise.all(ids.map(function (id) { return call({ action: 'video_content', id: id }).then(function (r) { if (!r.ok) throw new Error('Клипът не се изтегли'); return r.blob(); }); }))
            .then(function (clips) { return renderStitch({ clips: clips, W: f.W, H: f.H, captions: captions(), onProgress: onProgress }); });
        }).then(function (blob) {
          state.results.push({ url: URL.createObjectURL(blob), name: (ctx.project().project.name || 'video').replace(/[^\wЀ-ӿ -]+/g, '') + (f.key === 'portrait' ? ' 9x16' : ' 16x9') + '.mp4', label: f.label });
        });
      });
      seq.then(function () { state.busy = false; render('Готово – изтегли файловете по-долу.'); })
        .catch(function (e) { state.busy = false; render(e.message || 'Грешка при сглобяването', true); });
    }
    function aiMake() {
      readForm();
      var picked = [].map.call(box.querySelectorAll('input[data-sc]:checked'), function (c) { return c.dataset.sc; });
      var fmts = []; if (state.formats.landscape) fmts.push('landscape'); if (state.formats.portrait) fmts.push('portrait');
      if (!picked.length || !fmts.length) return render('Избери сцени и формат.', true);
      var motion = (box.querySelector('[data-motion]') || {}).value || '';
      var cost = (picked.length * fmts.length * 0.8).toFixed(2);
      if (!confirm('Ще поръчам ' + picked.length * fmts.length + ' AI клипа (около ' + cost + ' €). Продължавам?')) return;
      var scenes = ctx.project().scenes.filter(function (s) { return picked.indexOf(s.id) >= 0; });
      render('Подготвям кадрите и поръчвам клиповете…');
      var seq = Promise.resolve();
      scenes.forEach(function (s) {
        fmts.forEach(function (o) {
          seq = seq.then(function () { return loadImage(lastImage(s)); }).then(function (img) {
            var data = o === 'portrait' ? cover(img, 720, 1280) : cover(img, 1280, 720);
            return call({ action: 'video', scene_id: s.id, orientation: o, seconds: 8, motion: motion, data_url: data }).then(function (r) { return r.json(); }).then(function (d) { if (!d.ok) throw new Error(d.error || 'Грешка'); });
          });
        });
      });
      seq.then(function () { return ctx.refresh(); }).then(function () { render('Клиповете се правят. Състоянието се обновява само.'); })
        .catch(function (e) { render(e.message, true); });
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b || state.busy) return;
      if (b.dataset.act === 'build') build();
      if (b.dataset.act === 'ai-make') aiMake();
    });
    box.addEventListener('change', function (e) { if (e.target.closest('[data-engine],[data-cap],[data-fmt]')) { readForm(); render(); } });
    render();
    return { refresh: function () { if (!state.busy) { readForm(); render(); } } };
  }

  window.__vsVideo = { mount: ui };
})();
