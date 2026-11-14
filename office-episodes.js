/* /verde-office: "Епизоди" tab — short scripted clips with the mascots (Фикс и Микси).
   The owner writes the dialogue line by line, each line gets its voice from ElevenLabs (per-character voice,
   pronunciation dictionary applied). Then one muted Vidu scene per line (who speaks, who reacts) from the reference
   picture of the duo, and this script stitches everything in the browser: scene + our audio + captions + logo
   card → one MP4 (WebCodecs + mp4-muxer, Chrome/Edge). Every cut is a short cross-fade from the previous picture.
   HeyGen talking-heads render stays as a fallback.
   Data: /contract-automation/api/episodes. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/episodes';
  var VS_API = location.origin + '/contract-automation/api/visual-studio';
  var MUXER_URL = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm';
  var FPS = 30, TAIL = 0.35, OUTRO_SEC = 2.5, XFADE = 0.35, CAPTION_SCALE = 0.046;
  // sound under the voices: the room tone is levelled to AMB_REF (so a loud recording cannot cover the speech), then
  // played at its own "сила" and pushed down further to DUCK while somebody speaks; places blend over AMB_XFADE seconds
  var AMB_REF = 0.1, DUCK = 0.5, AMB_XFADE = 0.5, LOOP_XFADE = 0.25, SFX_PEAK = 0.9, SOUND_CREDITS_PER_SEC = 40;
  var SAMPLE = {
    title: 'Контактите',
    lines: [
      ['Фикс', '[excited] Знаеш ли коя е най-честата грешка в ремонта? Контактите се слагат, преди да има проект!'],
      ['Микси', '[enthusiastic] О, да! И после контактът е точно зад хладилника.'],
      ['Фикс', '[animated] Или над мивката! Или в средата на гърба на шкафа!'],
      ['Микси', '[confident] Затова – първо проект, после електротехник.'],
      ['Фикс', '[proud] Ние даваме схема с точните височини – за плот, аспиратор, осветление.'],
      ['Микси', '[excited] И ЛЕД лентата под горните шкафове се мисли сега, не после!'],
      ['Фикс', '[laughs] Защото „после“ значи къртене.'],
      ['Микси', '[cheerful] Проектът е безплатен. Къртенето – не!']
    ]
  };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  // What the captions show. Stress is sometimes forced for the voice with capitals inside a word ("помнИ", "ТЪмнозелЕно",
  // "КоЯЯ"); the captions get the normal spelling back. Only Cyrillic words are touched, and words written entirely in
  // capitals (ЛЕД, ВЕРДЕ-М) stay as they are.
  function captionText(text) {
    return String(text).replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim().replace(/[\u0400-\u04FF]+/g, function (w) {
      if (w === w.toUpperCase()) return w;
      var u = w.replace(/([\u0410-\u042F\u0401])\1+/g, '$1');
      return u.charAt(0) + u.slice(1).toLowerCase();
    });
  }
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
      '.ve-sound{grid-column:1/-1;display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:#6a716b}.ve-sound select{width:auto;max-width:210px;padding:4px 8px;font-size:13px}.ve-sound input{width:64px;border:1px solid #cfd4cb;border-radius:8px;padding:4px 8px;font:13px Montserrat,Arial,sans-serif}.ve-snd{border:1px solid #e1e4df;border-radius:12px;padding:10px;margin:0 0 8px}.ve-snd input[type=number]{width:70px;border:1px solid #cfd4cb;border-radius:8px;padding:6px 8px;font:13px Montserrat,Arial,sans-serif}.ve-snd audio{height:30px;max-width:240px}',
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
    var base = Math.round(Math.min(W, H) * CAPTION_SCALE);
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

  function clipSeconds(blob) {
    return new Promise(function (resolve) {
      var v = document.createElement('video'); v.preload = 'metadata'; v.muted = true; v.src = URL.createObjectURL(blob);
      v.addEventListener('loadedmetadata', function () { var d = v.duration; URL.revokeObjectURL(v.src); resolve(isFinite(d) ? d : 4); });
      v.addEventListener('error', function () { resolve(4); });
    });
  }
  function stitch(opts) {
    // opts: { W, H, parts:[{clip:Blob, audio:ArrayBuffer, text, color}], outro:[..], captions:bool, onProgress }
    if (!window.VideoEncoder || !window.AudioEncoder || !window.VideoFrame || !window.AudioData) return Promise.reject(new Error('Този браузър не поддържа видео кодиране (WebCodecs). Използвай Chrome или Edge.'));
    var W = opts.W, H = opts.H, c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    var SR = 48000, actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SR });
    return import(MUXER_URL).then(function (M) {
      function dec(ab) { return ab ? actx.decodeAudioData(ab.slice(0)).catch(function () { return null; }) : Promise.resolve(null); }
      function decBumper(b) {
        if (!b) return Promise.resolve(null);
        return Promise.all([clipSeconds(b.clip), dec(b.music)].concat(b.voices.map(function (v) { return dec(v.audio); }))).then(function (x) {
          return { clip: b.clip, sec: Math.min(8, Math.max(1, x[0] - 0.05)), music: x[1], voices: b.voices.map(function (v, i) { return { buf: x[2 + i], at: v.at }; }) };
        });
      }
      // library sounds used by the parts, decoded once each: { id: AudioBuffer }
      var soundIds = Object.keys(opts.sounds || {});
      var decSounds = Promise.all(soundIds.map(function (id) { return dec(opts.sounds[id]); })).then(function (bufs) { var m = {}; soundIds.forEach(function (id, i) { m[id] = bufs[i]; }); return m; });
      return Promise.all([Promise.all(opts.parts.map(function (p) { return actx.decodeAudioData(p.audio.slice(0)); })), decBumper(opts.intro), decBumper(opts.end), decSounds]).then(function (all) {
        var buffers = all[0], intro = all[1], end = all[2], lib = all[3];
        var muxer = new M.Muxer({ target: new M.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, audio: { codec: 'aac', sampleRate: SR, numberOfChannels: 1 }, fastStart: 'in-memory' });
        var venc = new VideoEncoder({ output: function (ch, meta) { muxer.addVideoChunk(ch, meta); }, error: function (e) { console.error(e); } });
        venc.configure({ codec: W * H > 2073600 ? 'avc1.640033' : 'avc1.640028', width: W, height: H, bitrate: W * H > 1500000 ? 4500000 : 3500000, framerate: FPS });
        var aenc = new AudioEncoder({ output: function (ch, meta) { muxer.addAudioChunk(ch, meta); }, error: function (e) { console.error(e); } });
        aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 1, bitrate: 128000 });
        // one mono track: every part's speech at its scene start, silence elsewhere
        var starts = [], total = intro ? intro.sec : 0;
        opts.parts.forEach(function (p, i) { starts.push(total); p.sec = Math.max(1, buffers[i].duration + TAIL); total += p.sec; });
        var outroStart = total; total += end ? end.sec : OUTRO_SEC;
        var samples = Math.ceil(total * SR), pcm = new Float32Array(samples);
        function mix(b, at, gain, len) {
          if (!b) return; var d = b.getChannelData(0), o = Math.round(at * SR), n = Math.min(d.length, len ? Math.round(len * SR) : d.length), fade = Math.round(0.5 * SR);
          for (var k = 0; k < n && o + k < samples; k++) { var gk = gain; if (len && k > n - fade) gk *= (n - k) / fade; pcm[o + k] += d[k] * gk; }
        }
        buffers.forEach(function (b, i) { mix(b, starts[i], 1); });
        [[intro, 0], [end, outroStart]].forEach(function (x) { if (x[0]) x[0].voices.forEach(function (v) { mix(v.buf, x[1] + v.at, 1); }); });
        // so far the track holds only speech: where somebody talks the room tone goes down to DUCK (quick in, slow out)
        var WIN = Math.round(0.02 * SR), duck = new Float32Array(Math.ceil(samples / WIN) + 1), dg = 1;
        for (var w = 0; w < duck.length; w++) {
          var e = 0, a0 = w * WIN, a1 = Math.min(samples, a0 + WIN);
          for (var k2 = a0; k2 < a1; k2++) e += pcm[k2] * pcm[k2];
          var target = a1 > a0 && Math.sqrt(e / (a1 - a0)) > 0.008 ? DUCK : 1;
          dg += (target - dg) * (target < dg ? 0.3 : 0.06); duck[w] = dg;
        }
        [[intro, 0], [end, outroStart]].forEach(function (x) { if (x[0]) mix(x[0].music, x[1], 0.35, x[0].sec); });
        // room tone: one stretch per run of parts in the same place, looped, faded in/out over AMB_XFADE so that
        // neighbouring places blend into each other
        function ambience(buf, from, to, gain) {
          if (!buf || !(gain > 0)) return;
          var d = buf.getChannelData(0), L = d.length, cf = Math.min(Math.round(LOOP_XFADE * SR), Math.floor(L / 4)), LL = L - cf;
          if (LL < SR / 4) return;
          var sq = 0; for (var q2 = 0; q2 < L; q2++) sq += d[q2] * d[q2];
          var rms = Math.sqrt(sq / L); if (!(rms > 0.0001)) return;
          var norm = Math.min(20, AMB_REF / rms) * gain, xf = Math.round(AMB_XFADE * SR);
          var o0 = Math.max(0, Math.round(from * SR) - (from > 0 ? xf >> 1 : 0)), o1 = Math.min(samples, Math.round(to * SR) + (xf >> 1)), n = o1 - o0;
          for (var k = 0; k < n; k++) {
            var j = k % LL, v = j < cf ? d[j] * (j / cf) + d[LL + j] * (1 - j / cf) : d[j];
            var env = Math.min(1, k / xf, (n - k) / xf);
            pcm[o0 + k] += v * norm * env * duck[Math.floor((o0 + k) / WIN)];
          }
        }
        for (var pi = 0; pi < opts.parts.length;) {
          var amb = opts.parts[pi].amb, pj = pi + 1;
          while (pj < opts.parts.length && (opts.parts[pj].amb || {}).id === (amb || {}).id) pj++;
          if (amb && lib[amb.id]) ambience(lib[amb.id], starts[pi], starts[pj - 1] + opts.parts[pj - 1].sec, amb.gain);
          pi = pj;
        }
        // spot effects: levelled by their peak, then at their own "сила", at the chosen second of the scene
        opts.parts.forEach(function (p, i) {
          var fx = p.sfx, b = fx && lib[fx.id]; if (!b) return;
          var d = b.getChannelData(0), peak = 0; for (var k = 0; k < d.length; k++) { var av = d[k] < 0 ? -d[k] : d[k]; if (av > peak) peak = av; }
          if (peak > 0.001) mix(b, starts[i] + Math.max(0, fx.at || 0), Math.min(20, SFX_PEAK / peak) * fx.gain);
        });
        for (var q = 0; q < samples; q++) { if (pcm[q] > 1) pcm[q] = 1; else if (pcm[q] < -1) pcm[q] = -1; }
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
        // soft cuts: the last picture of the previous part (captions included) is kept and faded out over the
        // first XFADE seconds of the next one. Nothing overlaps in time, so the audio timeline is unchanged.
        var snap = document.createElement('canvas'); snap.width = W; snap.height = H; var sg = snap.getContext('2d'), hasSnap = false;
        function keepLast() { sg.drawImage(c, 0, 0); hasSnap = true; }
        function renderClip(blob, sec, draw) {
          return new Promise(function (resolve, reject) {
            var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(blob);
            v.addEventListener('loadedmetadata', function () {
              var frameCount = Math.round(sec * FPS), i = 0, maxT = Math.max(0.05, v.duration - 0.05);
              var fade = hasSnap ? Math.min(Math.round(XFADE * FPS), Math.floor(frameCount / 2)) : 0;
              function step() {
                if (i >= frameCount) { keepLast(); URL.revokeObjectURL(v.src); return resolve(); }
                v.currentTime = Math.min(maxT, i / FPS);
              }
              v.addEventListener('seeked', function () {
                draw(v);
                if (i < fade) { g.save(); g.globalAlpha = 1 - (i + 1) / (fade + 1); g.drawImage(snap, 0, 0); g.restore(); }
                i++; addFrame().then(step);
              });
              step();
            });
            v.addEventListener('error', function () { reject(new Error('Клипът не може да се прочете')); });
          });
        }
        function drawCover(v) { var k = Math.max(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * k, dh = v.videoHeight * k; g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh); }
        function drawContain(v) {
          // whole picture visible; the empty bands are filled with a blurred, darker copy of it
          g.save(); g.filter = 'blur(40px) brightness(0.7)'; drawCover(v); g.restore();
          var k = Math.min(W / v.videoWidth, H / v.videoHeight), dw = v.videoWidth * k, dh = v.videoHeight * k;
          g.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
        }
        var seq = Promise.resolve();
        if (intro) seq = seq.then(function () { return renderClip(intro.clip, intro.sec, drawContain); });
        opts.parts.forEach(function (p) {
          seq = seq.then(function () {
            return renderClip(p.clip, p.sec, function (v) {
              drawCover(v); drawTag(g, W, H);
              if (opts.captions && p.text) drawCaption(g, W, H, p.text, p.color);
            });
          });
        });
        if (end) seq = seq.then(function () { return renderClip(end.clip, end.sec, drawContain); });
        else for (var i = 0; i < Math.round(OUTRO_SEC * FPS); i++) (function (i) { seq = seq.then(function () { drawOutro(g, W, H, opts.outro, Math.min(1, i / (FPS * 0.3))); return addFrame(); }); })(i);
        return seq.then(function () { return Promise.all([venc.flush(), aenc.flush()]); }).then(function () { muxer.finalize(); actx.close(); return new Blob([muxer.target.buffer], { type: 'video/mp4' }); });
      });
    });
  }

  function start(panel) {
    var ov = null, cur = null, draft = null, looks = null, busy = false, pollTimer = null, settingsOpen = false, vsScenes = null, result = null, progress = 0, bumper = null;
    // Facebook: fb = answer of fb_status (page or the reason it cannot post), fbOpen = the publish box is shown, fbText = description being edited
    var fb = null, fbOpen = false, fbText = null, fbTimer = null, fbWriting = false;
    var BUMPER_TITLE = 'Начало и край';
    // tidy list: a title that starts with HIDDEN is kept (lines, voices, scenes) but folded away; titles that start
    // with a number ("03 – Мерките") are listed in that order, ahead of everything else
    var HIDDEN = '[скрит]', showHidden = false;
    function isHidden(e) { return (e.title || '').indexOf(HIDDEN) === 0; }
    function epNumber(e) { var m = /^\s*(\d{1,3})\s*[–—\-·.:]/.exec(e.title || ''); return m ? Number(m[1]) : null; }
    function isBumper(e) { return (e.title || '').indexOf(BUMPER_TITLE) === 0; }
    function listed() {
      var all = (ov.episodes || []).slice(), rank = function (e) { return isHidden(e) ? 3 : isBumper(e) ? 2 : epNumber(e) == null ? 1 : 0; };
      return all.map(function (e, i) { return [e, i]; }).sort(function (a, b) { var ra = rank(a[0]), rb = rank(b[0]); if (ra !== rb) return ra - rb; if (ra === 0) return epNumber(a[0]) - epNumber(b[0]) || a[1] - b[1]; return a[1] - b[1]; }).map(function (x) { return x[0]; });
    }
    var BUMPER_SLOTS = [['Клип за начало (видео)', 'video/*'], ['Музика за начало (mp3, по желание)', 'audio/*'], ['Клип за край (видео)', 'video/*'], ['Музика за край (mp3, по желание)', 'audio/*']];
    function bumperEpisode() { return (ov && ov.episodes || []).filter(function (e) { return (e.title || '').indexOf(BUMPER_TITLE) === 0; })[0]; }
    function loadBumper() {
      var e = bumperEpisode(); if (!e) { bumper = null; return Promise.resolve(); }
      return call({ action: 'episode_get', id: e.id }).then(function (r) { if (r.ok) bumper = { id: e.id, lines: r.lines }; });
    }

    function soundsOf(kind) { return (ov.sounds || []).filter(function (x) { return x.kind === kind; }); }
    function soundById(id) { return (ov.sounds || []).filter(function (x) { return x.id === id; })[0]; }
    // what makes a line "changed": who, text and its sound
    function sig(lines) { return JSON.stringify(lines.map(function (l) { return [l.character_id, l.text, l.ambience_id || '', l.sfx_id || '', l.sfx_id ? Number(l.sfx_at) || 0 : 0]; })); }
    function linesOut() { return draft.lines.filter(function (l) { return l.text.trim() && l.character_id; }).map(function (l) { var o = { id: l.id, character_id: l.character_id, text: l.text }; if (ov.sounds) { o.ambience_id = l.ambience_id || ''; o.sfx_id = l.sfx_id || ''; o.sfx_at = Number(l.sfx_at) || 0; } return o; }); }
    function charById(id) { return (ov.characters || []).filter(function (c) { return c.id === id; })[0]; }
    function charByName(name) { return (ov.characters || []).filter(function (c) { return c.name === name; })[0]; }

    function fromServer(d) {
      if (!cur || cur.id !== d.episode.id) { fb = null; fbOpen = false; fbText = null; fbWriting = false; if (fbTimer) clearTimeout(fbTimer); fbTimer = null; }
      cur = d.episode; cur.lines = d.lines;
      draft = { id: cur.id, title: cur.title, aspect: cur.aspect, captions: !!cur.captions, scene_image_url: cur.scene_image_url || '', lines: d.lines.map(function (l) { return { id: l.id, character_id: l.character_id, text: l.text, ambience_id: l.ambience_id || '', sfx_id: l.sfx_id || '', sfx_at: l.sfx_at || 0 }; }) };
      var clipsBusy = d.lines.some(function (l) { return l.clip_status === 'queued' || l.clip_status === 'in_progress'; });
      if (cur.status === 'rendering' || clipsBusy) schedulePoll(); else stopPoll();
    }
    function schedulePoll() { stopPoll(); pollTimer = setTimeout(function () { if (!cur) return; call({ action: 'episode_get', id: cur.id }).then(function (r) { if (r.ok && cur && r.episode.id === cur.id) { fromServer(r); render(); } }); }, 8000); }
    function stopPoll() { if (pollTimer) clearTimeout(pollTimer); pollTimer = null; }

    function newDraft(sample) {
      cur = null; stopPoll();
      draft = { id: '', title: sample ? SAMPLE.title : '', aspect: '9:16', captions: true, scene_image_url: (vsScenes && vsScenes[0] && vsScenes[0].url) || '', lines: [] };
      if (sample) SAMPLE.lines.forEach(function (p) { var c = charByName(p[0]) || ov.characters[0]; draft.lines.push({ id: '', character_id: c ? c.id : '', text: p[1], ambience_id: '', sfx_id: '', sfx_at: 0 }); });
      else draft.lines.push({ id: '', character_id: ov.characters[0] ? ov.characters[0].id : '', text: '', ambience_id: '', sfx_id: '', sfx_at: 0 });
    }

    function render(msg, isErr) {
      if (!ov) { panel.innerHTML = '<div class="ve"><div class="va-card"><p class="va-err">' + esc(msg || 'Няма данни') + '</p></div></div>'; return; }
      var h = '<div class="ve">';
      if (!ov.keys.elevenlabs || !ov.keys.vidu) h += '<div class="va-card"><p class="va-err">Липсва ключ в Webflow Cloud: ' + (!ov.keys.elevenlabs ? 'ELEVENLABS_API_KEY ' : '') + (!ov.keys.vidu ? 'VIDU_API_KEY' : '') + '. Без него ' + (!ov.keys.elevenlabs ? 'озвучаването' : 'сцените') + ' няма да тръгнат.</p></div>';
      h += '<div class="ve-grid"><div>';
      h += '<div class="va-card"><h3>Епизоди</h3><p class="va-sub">Кратки клипове с Фикс и Микси</p>';
      h += '<div class="ve-row"><button class="va-btn primary" data-act="new">+ Нов епизод</button><button class="va-btn" data-act="sample">Примерен „Контактите“</button></div><div class="ve-list">';
      if (!ov.episodes.length) h += '<p class="va-muted">Още няма епизоди.</p>';
      var hiddenCount = ov.episodes.filter(isHidden).length;
      listed().forEach(function (e) {
        if (isHidden(e) && !showHidden) return;
        h += '<button data-open="' + esc(e.id) + '" class="' + (cur && cur.id === e.id ? 'is-on' : '') + '"' + (isHidden(e) ? ' style="opacity:.6"' : '') + '>' + esc(e.title) + '<small>' + e.lines + ' реплики · ' + e.voiced + ' озвучени · ' + (e.final_size ? '<span class="ve-status done">✓ видео</span>' : '<span class="ve-status ' + esc(e.status) + '">' + statusLabel(e.status) + '</span>') + fbBadge(e) + '</small></button>';
      });
      h += '</div>';
      if (hiddenCount) h += '<div class="ve-row" style="margin:8px 0 0"><button class="va-btn small" data-act="toggle-hidden">' + (showHidden ? 'Прибери скритите' : 'Скрити епизоди (' + hiddenCount + ')') + '</button></div>';
      h += '</div>';
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
      if (ov.sounds) {
        h += '<h3 style="margin-top:16px">Звуци</h3><p class="va-sub">„Шум на мястото“ върви тихо под гласовете, докато сцената е в този декор. „Ефект“ е кратък звук в точен момент. Избират се към всяка реплика. Записът се прави веднъж (ElevenLabs, ' + SOUND_CREDITS_PER_SEC + ' кредита на секунда) или се качва готов файл и после се ползва във всички епизоди.</p>';
        ov.sounds.forEach(function (x) {
          h += '<div class="ve-snd" data-snd="' + esc(x.id) + '"><div class="ve-row"><input type="text" data-f="name" value="' + esc(x.name) + '" style="font-weight:700"><select data-f="kind" style="width:auto"><option value="ambience"' + (x.kind === 'ambience' ? ' selected' : '') + '>шум на мястото</option><option value="effect"' + (x.kind === 'effect' ? ' selected' : '') + '>ефект</option></select>';
          h += (x.audio_url ? '<audio controls preload="none" src="' + esc(x.audio_url) + '"></audio>' : '<span class="va-muted">няма запис</span>') + '</div>';
          h += '<textarea data-f="prompt" placeholder="Описание на звука на английски">' + esc(x.prompt || '') + '</textarea>';
          h += '<div class="ve-row" style="margin:8px 0 0"><label>дължина, сек</label><input type="number" data-f="seconds" min="0.5" max="30" step="0.5" value="' + esc(x.seconds) + '"><label>сила, %</label><input type="number" data-f="gain" min="1" max="100" step="1" value="' + Math.round((x.gain || 0) * 100) + '">';
          h += '<button class="va-btn small" data-act="snd-save" data-id="' + esc(x.id) + '">Запази</button><button class="va-btn small" data-act="snd-gen" data-id="' + esc(x.id) + '">' + (x.audio_url ? 'Направи наново' : 'Направи записа') + ' (~' + Math.round(x.seconds * SOUND_CREDITS_PER_SEC) + ' кр.)</button>';
          h += '<label class="va-btn small" style="display:inline-flex;align-items:center;cursor:pointer">качи файл<input type="file" accept="audio/mpeg,audio/wav,audio/*" data-upload-sound="' + esc(x.id) + '" hidden></label><button class="va-btn small" data-act="snd-del" data-id="' + esc(x.id) + '">Изтрий</button></div></div>';
        });
        h += '<div class="ve-row"><button class="va-btn small" data-act="snd-add">+ Нов звук</button></div>';
      }
      h += '<h3 style="margin-top:16px">Начало и край на всяка серия</h3>';
      if (!bumper || !bumper.lines || bumper.lines.length < 4) h += '<p class="va-sub">Няма епизод „' + BUMPER_TITLE + '…“ с 4 реплики (Микси „Фикс!“, Фикс „…и Микси!“, Фикс и Микси за края). Създай го, озвучи го и после качи клиповете тук.</p>';
      else {
        h += '<p class="va-sub">Качват се веднъж. „Сглоби епизода“ ги слага сам: начало → сцените → край. Фразите се чуват в началото на 0,5 и 1,5 сек, в края на 0,5 и 2 сек; музиката е по-тихо отдолу.</p>';
        BUMPER_SLOTS.forEach(function (sl, i) {
          var l = bumper.lines[i], ok = l && (l.clip_ready || l.clip_uploaded);
          h += '<div class="ve-row" style="margin-top:6px"><span style="min-width:240px">' + sl[0] + '</span>' + (ok ? '<span class="ve-status done">качено</span>' : '<span class="va-muted">няма</span>');
          h += '<label class="va-btn small" style="display:inline-flex;align-items:center;cursor:pointer">' + (ok ? 'смени' : 'качи') + '<input type="file" accept="' + sl[1] + '" data-upload-line="' + esc(l.id) + '" data-bumper="1" hidden></label>';
          if (l.audio_url && (i === 0 || i === 2)) h += '<span class="va-muted">фрази:</span><audio controls preload="none" src="' + esc(l.audio_url) + '" style="height:30px"></audio><audio controls preload="none" src="' + esc(bumper.lines[i + 1].audio_url || '') + '" style="height:30px"></audio>';
          h += '</div>';
        });
      }
      return h;
    }

    // "Публикувай във Facebook": the uploaded episode goes to the Verde-M page as a Reel, with a description the owner
    // edits here. Nothing is posted until „Публикувай сега“ is pressed and confirmed.
    // in the list: is the episode on Facebook (published from here or by Content Studio's weekly plan)?
    function fbBadge(e) {
      if (e.fb_status === 'published') return ' <span class="ve-status done" title="' + esc(e.fb_posted_at ? 'Публикуван ' + new Date(e.fb_posted_at).toLocaleDateString('bg-BG') : 'Публикуван') + '">✓ във Facebook</span>';
      if (e.fb_status === 'processing' || e.fb_status === 'uploading') return ' <span class="ve-status rendering">Facebook…</span>';
      return '';
    }
    function fbHtml() {
      var st = cur.fb_status, h = '<div class="ve-row" style="margin-top:8px">';
      if (st === 'published') h += '<span class="ve-status done">✓ публикуван във Facebook' + (cur.fb_posted_at ? ' на ' + esc(new Date(cur.fb_posted_at).toLocaleDateString('bg-BG')) : '') + '</span><a class="va-btn small" href="' + esc(cur.fb_url) + '" target="_blank" rel="noopener">Отвори във Facebook</a>';
      else if (st === 'processing') h += '<span class="ve-status rendering">Facebook още го обработва</span><button class="va-btn small" data-act="fb-check">Провери</button><a class="va-btn small" href="' + esc(cur.fb_url) + '" target="_blank" rel="noopener">Отвори във Facebook</a>';
      else h += '<button class="va-btn' + (fbOpen ? '' : ' primary') + '" data-act="' + (fbOpen ? 'fb-close' : 'fb-open') + '">' + (fbOpen ? 'Скрий Facebook' : 'Публикувай във Facebook') + '</button>' + (st === 'uploading' || st === 'failed' ? '<span class="va-muted">предишният опит не завърши – може да се пусне наново</span>' : '');
      h += '</div>';
      if (!fbOpen || st === 'published' || st === 'processing') return h;
      if (!fb) return h + '<p class="va-muted">Проверявам Facebook…</p>';
      if (!fb.page) return h + '<p class="va-err">' + esc(fb.problem || 'Няма достъп до Facebook страницата.') + (fb.missing && fb.missing.length ? ' Липсват права: ' + esc(fb.missing.join(', ')) + '.' : '') + '</p>';
      h += '<p class="va-sub" style="margin-top:8px">Ще се публикува като Reel в страницата <b>' + esc(fb.page.name) + '</b> – веднага и публично. Текст под видеото:</p>';
      if (fbWriting) h += '<p class="va-muted">Писателят пише текста по репликите…</p>';
      h += '<textarea data-fb-text style="min-height:150px"' + (fbWriting ? ' disabled' : '') + '>' + esc(fbText == null ? '' : fbText) + '</textarea>';
      h += '<div class="ve-row" style="margin-top:8px"><button class="va-btn small" data-act="fb-write"' + (fbWriting ? ' disabled' : '') + '>✍ Нов текст от писателя</button><button class="va-btn small" data-act="fb-save">Запази текста</button><button class="va-btn primary" data-act="fb-publish"' + (busy ? ' disabled' : '') + '>Публикувай сега</button></div>';
      return h;
    }
    function fbOpenBox() {
      fbOpen = true; if (fbText == null) fbText = cur.fb_description || ''; render();
      call({ action: 'fb_status', id: cur.id }).then(function (r) {
        if (!r.ok) { fbOpen = false; render(r.error, true); return; }
        fb = r; if (r.fb && r.fb.fb_description && !fbText) fbText = r.fb.fb_description; render();
        if (r.page && !(fbText || '').trim()) fbWrite();
      }).catch(function (e) { fbOpen = false; render('Няма връзка: ' + e.message, true); });
    }
    // the writer (on the server): a text under the video from this episode's lines, saved as the draft
    function fbWrite() {
      if (!cur || fbWriting) return;
      var id = cur.id;
      fbWriting = true; render();
      call({ action: 'fb_suggest', id: id }).then(function (r) {
        fbWriting = false;
        if (!cur || cur.id !== id) return;
        if (!r.ok) { render(r.error, true); return; }
        fbText = r.description; cur.fb_description = r.description; render('Писателят предложи текст – прочети го и го поправи, ако трябва.');
      }).catch(function (e) { fbWriting = false; render('Няма връзка: ' + e.message, true); });
    }
    function fbCheck(quiet) {
      if (!cur) return;
      var id = cur.id;
      call({ action: 'fb_check', id: id }).then(function (r) {
        if (!cur || cur.id !== id) return;
        if (!r.ok) { if (!quiet) render(r.error, true); return; }
        cur.fb_status = r.status; cur.fb_url = r.url;
        if (r.status === 'processing') fbTimer = setTimeout(function () { fbCheck(true); }, 20000);
        render(r.status === 'published' ? 'Публикувано във Facebook.' : r.status === 'failed' ? 'Facebook отказа видеото.' : quiet ? undefined : 'Facebook още го обработва – проверявам пак след малко.', r.status === 'failed');
      }).catch(function (e) { if (!quiet) render('Няма връзка: ' + e.message, true); });
    }
    function fbPublish() {
      if (!cur || busy || !fb || !fb.page) return;
      var text = (fbText || '').trim();
      if (!text) { render('Напиши текст под видеото.', true); return; }
      if (!window.confirm('Публикувам „' + cur.title + '“ в страницата „' + fb.page.name + '“ сега? Ще се види веднага от всички.')) return;
      var id = cur.id;
      busy = true; progress = 0; render('Подготвям Facebook…');
      function fail(msg) { busy = false; progress = 0; cur.fb_status = 'failed'; render(msg, true); }
      call({ action: 'fb_draft', id: id, description: text }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        return call({ action: 'fb_start', id: id, again: cur.fb_status === 'published' });
      }).then(function (r) {
        if (!r.ok) throw new Error(r.error);
        cur.fb_status = 'uploading';
        (function next(seq) {
          call({ action: 'fb_upload', id: id, seq: seq }).then(function (u) {
            if (!u.ok) return fail(u.error);
            progress = u.next / u.total; render('Качвам във Facebook… ' + Math.round(progress * 100) + '%');
            if (!u.done) return next(u.next);
            return call({ action: 'fb_finish', id: id, description: text }).then(function (f) {
              if (!f.ok) return fail(f.error);
              busy = false; progress = 0; fbOpen = false; cur.fb_status = 'processing'; cur.fb_url = f.url; cur.fb_description = text;
              render('Изпратено. Facebook обработва видеото – след минута-две ще е публикувано.');
              fbTimer = setTimeout(function () { fbCheck(true); }, 20000);
            });
          }).catch(function (e) { fail('Няма връзка: ' + e.message); });
        })(0);
      }).catch(function (e) { fail(e.message); });
    }

    function editorHtml() {
      var d = draft, h = '';
      if (cur && cur.final_url) {
        h += '<div class="va-card"><h3>Готов епизод</h3><p class="va-sub">Качен на сървъра – линкът се отваря и от телефона.</p>';
        h += '<video controls playsinline preload="metadata" src="' + esc(cur.final_url) + '"' + (d.aspect === '9:16' ? ' style="max-width:360px;display:block;margin:0 auto"' : '') + '></video>';
        h += '<div class="ve-row" style="margin-top:8px"><a class="va-btn primary" href="' + esc(cur.final_url) + '" target="_blank" rel="noopener">Отвори линка</a><a class="va-btn" href="' + esc(cur.final_url) + '" download="' + esc(d.title || 'episode') + '.mp4">⬇ Свали</a><button class="va-btn small" data-act="copylink">копирай линка</button></div>' + fbHtml() + '</div>';
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
          if (cs === 'done') h += '<span class="ve-status done">' + (sl.clip_uploaded ? 'сцена качена' : 'сцена готова') + '</span><button class="va-btn small" data-act="clip-view" data-line="' + esc(sl.id) + '">виж</button>' + (ov.keys.vidu ? '<button class="va-btn small" data-act="reclip" data-line="' + esc(sl.id) + '">нова през API</button>' : '');
          else if (cs === 'queued' || cs === 'in_progress') h += '<span class="ve-status rendering">сцената се прави…</span>';
          else if (cs === 'uploading') h += '<span class="ve-status rendering">качва се…</span>';
          else if (cs === 'failed') h += '<span class="ve-status failed">сцена: грешка</span><span class="va-err" style="font-size:12px">' + esc(sl.clip_error || '') + '</span>' + (ov.keys.vidu ? '<button class="va-btn small" data-act="reclip" data-line="' + esc(sl.id) + '">опитай пак</button>' : '');
          h += '<button class="va-btn small" data-act="clip-prompt" data-line="' + esc(sl.id) + '" title="копира готовия текст за vidu.com">копирай промпт</button>';
          h += '<label class="va-btn small" style="display:inline-flex;align-items:center;cursor:pointer">качи сцена<input type="file" accept="video/mp4,video/*" data-upload-line="' + esc(sl.id) + '" hidden></label>';
          h += '</div>';
        } else if (sl && cur) h += '<div class="ve-audio"><span class="va-muted">още не е озвучена</span></div>';
        if (ov.sounds) {
          var opt = function (list, val) { return '<option value="">— няма —</option>' + list.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === val ? ' selected' : '') + '>' + esc(x.name) + (x.audio_url ? '' : ' (няма запис)') + '</option>'; }).join(''); };
          h += '<div class="ve-sound"><span>Декор (шум на мястото)</span><select data-f="ambience_id">' + opt(soundsOf('ambience'), l.ambience_id) + '</select>';
          h += '<span>Ефект</span><select data-f="sfx_id">' + opt(soundsOf('effect'), l.sfx_id) + '</select>';
          h += '<span>в секунда</span><input type="number" data-f="sfx_at" min="0" max="20" step="0.1" value="' + esc(l.sfx_at || 0) + '"></div>';
        }
        h += '</div>';
      });
      h += '<div class="ve-row"><button class="va-btn small" data-act="add">+ реплика</button></div>';
      var secs = d.lines.reduce(function (a, l) { return a + speechSeconds(l.text); }, 0);
      var voiced = serverLines.filter(function (x) { return x.audio_url; }).length;
      var changed = !cur || sig(draft.lines) !== sig(cur.lines) || draft.title !== cur.title || draft.aspect !== cur.aspect || draft.captions !== !!cur.captions || (draft.scene_image_url || '') !== (cur.scene_image_url || '');
      var clipsDone = serverLines.filter(function (x) { return x.clip_status === 'done'; }).length;
      var clipsBusy = serverLines.filter(function (x) { return x.clip_status === 'queued' || x.clip_status === 'in_progress'; }).length;
      h += '<div class="ve-tip">Сцени на ръка (абонамент vidu.com): до всяка озвучена реплика – „копирай промпт“, направи клипа на сайта, после „качи сцена“.</div>';
      h += '<div class="ve-tip">≈ ' + Math.round(secs) + ' сек говор · гласове ~' + money(secs * 0.004) + ' · сцени (Vidu) ~' + Math.round((secs + d.lines.length) * 28) + ' кредита (~' + money((secs + d.lines.length) * 0.1) + ')</div>';
      h += '<div class="ve-row">';
      h += '<button class="va-btn' + (changed ? ' primary' : '') + '" data-act="save">' + (cur ? 'Запази промените' : 'Запази епизода') + '</button>';
      if (cur) {
        h += '<button class="va-btn' + (!changed && voiced < d.lines.length ? ' primary' : '') + '" data-act="voice"' + (changed ? ' disabled title="първо запази"' : '') + '>Озвучи' + (voiced && voiced < d.lines.length ? ' останалите (' + (d.lines.length - voiced) + ')' : voiced ? ' наново' : '') + '</button>';
        if (ov.keys.vidu) h += '<button class="va-btn' + (!changed && voiced === d.lines.length && clipsDone < d.lines.length && !clipsBusy ? ' primary' : '') + '" data-act="scenes"' + (changed || voiced < d.lines.length || clipsBusy || !d.scene_image_url ? ' disabled' : '') + '>' + (clipsBusy ? 'Сцените се правят… (' + clipsBusy + ')' : clipsDone && clipsDone < d.lines.length ? 'Направи останалите сцени (' + (d.lines.length - clipsDone) + ')' : clipsDone ? 'Сцени наново' : 'Направи сцените (Vidu)') + '</button>';
        h += '<button class="va-btn' + (!changed && clipsDone === d.lines.length && !busy ? ' primary' : '') + '" data-act="stitch"' + (changed || clipsDone < d.lines.length || busy ? ' disabled' : '') + '>Сглоби епизода</button>';
        h += '<button class="va-btn small" data-act="render"' + (changed || voiced < d.lines.length || cur.status === 'rendering' ? ' disabled' : '') + ' title="резервен вариант: говорещи глави">HeyGen вариант</button>';
        h += '<span style="flex:1"></span><button class="va-btn small" data-act="hide" title="епизодът се пази, само не се вижда в списъка">' + (isHidden(cur) ? 'Върни в списъка' : 'Скрий епизода') + '</button><button class="va-btn small" data-act="delete">Изтрий епизода</button>';
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
      [].forEach.call(panel.querySelectorAll('.ve-line'), function (row) { var i = Number(row.dataset.i); var ta = row.querySelector('[data-f="text"]'), L = draft.lines[i]; if (!L) return; if (ta) L.text = ta.value;
        var am = row.querySelector('[data-f="ambience_id"]'), fx = row.querySelector('[data-f="sfx_id"]'), at = row.querySelector('[data-f="sfx_at"]');
        if (am) L.ambience_id = am.value; if (fx) L.sfx_id = fx.value; if (at) L.sfx_at = Math.min(20, Math.max(0, Number(at.value) || 0));
      });
    }

    function run(p, okMsg) {
      if (busy) return; busy = true;
      [].forEach.call(panel.querySelectorAll('.va-btn'), function (b) { b.disabled = true; });
      p.then(function (r) {
        busy = false;
        if (!r.ok) { render(r.error || 'Грешка', true); return; }
        if (r.characters) ov.characters = r.characters;
        if (r.pronunciation) ov.pronunciation = r.pronunciation;
        if (r.sounds) ov.sounds = r.sounds;
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
    function bumperParts() {
      // intro = slot 0 clip (+ slot 1 music) with phrases 0 and 1; end = slot 2 clip (+ slot 3 music) with phrases 2 and 3
      if (!bumper || !bumper.lines || bumper.lines.length < 4 || (cur && cur.id === bumper.id)) return Promise.resolve({});
      var L = bumper.lines;
      function ready(l) { return l && (l.clip_ready || l.clip_uploaded); }
      function audio(l) { return l.audio_url ? fetch(l.audio_url).then(function (r) { return r.arrayBuffer(); }) : Promise.resolve(null); }
      function music(l) { return ready(l) ? clipBlob(l.id).then(function (b) { return b.arrayBuffer(); }).catch(function () { return null; }) : Promise.resolve(null); }
      function one(ci, ats) {
        if (!ready(L[ci])) return Promise.resolve(null);
        return Promise.all([clipBlob(L[ci].id), music(L[ci + 1]), audio(L[ci]), audio(L[ci + 1])]).then(function (x) {
          return { clip: x[0], music: x[1], voices: [{ audio: x[2], at: ats[0] }, { audio: x[3], at: ats[1] }] };
        });
      }
      return Promise.all([one(0, [0.5, 1.5]), one(2, [0.5, 2.0])]).then(function (x) { return { intro: x[0], end: x[1] }; });
    }
    function stitchEpisode() {
      if (!cur || busy) return;
      busy = true; progress = 0; result = null; render('Свалям сцените и гласовете…');
      var W = draft.aspect === '16:9' ? 1920 : 1080, H = draft.aspect === '16:9' ? 1080 : 1920;
      var chars = {}; ov.characters.forEach(function (c) { chars[c.id] = c; });
      // library sounds of the lines (only those that have a recording), each downloaded once
      var need = {}, missing = [];
      cur.lines.forEach(function (l) { [l.ambience_id, l.sfx_id].forEach(function (id) { var x = id && soundById(id); if (x && x.audio_url) need[id] = x; else if (x && missing.indexOf(x.name) < 0) missing.push(x.name); }); });
      var soundData = {};
      var getSounds = Promise.all(Object.keys(need).map(function (id) { return fetch(need[id].audio_url).then(function (r) { return r.arrayBuffer(); }).then(function (ab) { soundData[id] = ab; }).catch(function () { missing.push(need[id].name); }); }));
      function pick(id, extra) { var x = id && need[id]; if (!x) return null; var o = { id: id, gain: x.gain }; if (extra != null) o.at = Number(extra) || 0; return o; }
      Promise.all(cur.lines.map(function (l) {
        return Promise.all([clipBlob(l.id), fetch(l.audio_url).then(function (r) { return r.arrayBuffer(); })]).then(function (x) {
          return { amb: pick(l.ambience_id), sfx: pick(l.sfx_id, l.sfx_at), clip: x[0], audio: x[1], text: captionText(l.text), color: (chars[l.character_id] || {}).color ? lighten(chars[l.character_id].color) : '#fff' };
        });
      })).then(function (parts) {
        return Promise.all([loadBumper().then(function () { return bumperParts(); }), getSounds]).then(function (y) { return { parts: parts, bp: y[0] }; });
      }).then(function (x) {
        var parts = x.parts;
        return stitch({ W: W, H: H, parts: parts, sounds: soundData, intro: x.bp.intro, end: x.bp.end, captions: draft.captions, outro: ['ВЕРДЕ-М', 'мебели по поръчка', 'Безплатно замерване в София', 'verde-m.com'], onProgress: function (p) { if (p - progress > 0.02) { progress = p; render('Сглобявам…'); } } });
      }).then(function (blob) {
        busy = false; progress = 0;
        result = { url: URL.createObjectURL(blob), blob: blob, note: Math.round(blob.size / 1048576 * 10) / 10 + ' MB · ' + W + '×' + H };
        render('Епизодът е готов – пусни го и го свали.' + (missing.length ? ' Без запис останаха: ' + missing.join(', ') + '.' : ''));
      }).catch(function (e) { busy = false; progress = 0; render('Не се получи: ' + e.message, true); });
    }

    function copyPrompt(lineId) {
      audioDurations().then(function (dur) {
        return call({ action: 'clip_prompt', line_id: lineId, seconds: dur[lineId] || 4 });
      }).then(function (r) {
        if (!r.ok) return render(r.error, true);
        var txt = r.prompt;
        var note = 'Промптът е копиран. На vidu.com: Reference to Video → качи картинката с героите → постави текста → ' + r.aspect + ', ' + r.seconds + ' сек → Create. После „Свали“ и тук „качи сцена“.';
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { render(note); }, function () { window.prompt('Копирай текста:', txt); render(note); });
      }).catch(function (e) { render('Няма връзка: ' + e.message, true); });
    }
    function uploadClip(lineId, file, after) {
      if (busy) return;
      if (file.size > 60 * 1048576) { render('Файлът е твърде голям (над 60 MB).', true); return; }
      var CHUNK = 600000, total = Math.ceil(file.size / CHUNK), seq = 0;
      busy = true; progress = 0.01; render('Качвам сцената… 0%');
      function b64(ab) { var u = new Uint8Array(ab), s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
      (function next() {
        file.slice(seq * CHUNK, Math.min(file.size, (seq + 1) * CHUNK)).arrayBuffer().then(function (ab) {
          return call({ action: 'clip_upload', line_id: lineId, seq: seq, total: total, b64: b64(ab) });
        }).then(function (r) {
          if (!r.ok) { busy = false; progress = 0; render(r.error, true); return; }
          seq++; progress = seq / total;
          if (r.done && after) { busy = false; progress = 0; after(r); }
          else if (r.done) { busy = false; progress = 0; fromServer(r); refreshList().then(function () { render('Сцената е качена.'); }); }
          else { render('Качвам сцената… ' + Math.round(progress * 100) + '%'); next(); }
        }).catch(function (e) { busy = false; progress = 0; render('Няма връзка: ' + e.message, true); });
      })();
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

    panel.addEventListener('input', function (e) { if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-fb-text')) fbText = e.target.value; });
    panel.addEventListener('change', function (e) {
      if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-fb-text')) return;
      var inp = e.target && e.target.getAttribute && e.target.getAttribute('data-upload-line');
      if (inp) {
        var f = e.target.files && e.target.files[0], isB = e.target.getAttribute('data-bumper');
        if (f) uploadClip(inp, f, isB ? function () { loadBumper().then(function () { render('Качено.'); }); } : null);
        return;
      }
      var snd = e.target && e.target.getAttribute && e.target.getAttribute('data-upload-sound');
      if (snd) {
        var sf = e.target.files && e.target.files[0]; if (!sf) return;
        if (sf.size > 1000000) { render('Файлът е над 1 MB – избери по-кратък звук (до около минута MP3).', true); return; }
        sf.arrayBuffer().then(function (ab) {
          var u = new Uint8Array(ab), str = ''; for (var i = 0; i < u.length; i += 0x8000) str += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
          run(call({ action: 'sound_upload', id: snd, mime: sf.type || 'audio/mpeg', b64: btoa(str) }), 'Звукът е качен.');
        });
        return;
      }
      if (e.target && e.target.closest && e.target.closest('.ve-snd')) return; // library fields are read on „Запази“
      readDraft();
      if (e.target && e.target.closest && e.target.closest('.ve-sound')) render();
    });
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
      else if (act === 'toggle-hidden') { showHidden = !showHidden; render(); }
      else if (act === 'hide') {
        var was = isHidden(cur), nt = was ? cur.title.slice(HIDDEN.length).replace(/^\s+/, '') : HIDDEN + ' ' + cur.title;
        if (was) showHidden = false;
        run(call({ action: 'episode_update', id: cur.id, title: nt, aspect: cur.aspect, captions: !!cur.captions }), was ? 'Епизодът е върнат в списъка.' : 'Епизодът е скрит. Намира се под „Скрити епизоди“.');
      }
      else if (act === 'settings') { settingsOpen = !settingsOpen; render(); if (settingsOpen) loadBumper().then(function () { render(); }); if (settingsOpen && !looks && ov.keys.heygen) run(call({ action: 'heygen_looks' })); }
      else if (act === 'looks') run(call({ action: 'heygen_looks' }));
      else if (act === 'add') { draft.lines.push({ id: '', character_id: (ov.characters[(draft.lines.length) % Math.max(1, ov.characters.length)] || {}).id || '', text: '', ambience_id: (draft.lines[draft.lines.length - 1] || {}).ambience_id || '', sfx_id: '', sfx_at: 0 }); render(); }
      else if (act === 'del' || act === 'up' || act === 'down') {
        var i = Number(b.closest('.ve-line').dataset.i);
        if (act === 'del') draft.lines.splice(i, 1);
        else { var j = act === 'up' ? i - 1 : i + 1; if (j >= 0 && j < draft.lines.length) { var tmp = draft.lines[i]; draft.lines[i] = draft.lines[j]; draft.lines[j] = tmp; } }
        render();
      }
      else if (act === 'save') {
        var lines = linesOut();
        if (!lines.length) { render('Напиши поне една реплика.', true); return; }
        result = null;
        run(call({ action: draft.id ? 'episode_update' : 'episode_create', id: draft.id, title: draft.title, aspect: draft.aspect, captions: draft.captions, scene_image_url: draft.scene_image_url, lines: lines }), 'Запазено.');
      }
      else if (act === 'voice') voiceLoop(cur && cur.lines.every(function (l) { return l.audio_url; }));
      else if (act === 'scenes') scenesLoop(cur && cur.lines.every(function (l) { return l.clip_status === 'done'; }), '');
      else if (act === 'reclip') scenesLoop(true, b.dataset.line);
      else if (act === 'clip-view') { var w = window.open('', '_blank'); clipBlob(b.dataset.line).then(function (blob) { w.location = URL.createObjectURL(blob); }).catch(function (e) { w.close(); render(e.message, true); }); }
      else if (act === 'stitch') stitchEpisode();
      else if (act === 'clip-prompt') copyPrompt(b.dataset.line);
      else if (act === 'upload') uploadFinal();
      else if (act === 'fb-open') fbOpenBox();
      else if (act === 'fb-close') { fbOpen = false; render(); }
      else if (act === 'fb-write') { if (!(fbText || '').trim() || window.confirm('Да сменя ли сегашния текст с нов от писателя?')) fbWrite(); }
      else if (act === 'fb-save') run(call({ action: 'fb_draft', id: cur.id, description: fbText || '' }).then(function (r) { if (r.ok) cur.fb_description = fbText; return r; }), 'Текстът е запазен.');
      else if (act === 'fb-publish') fbPublish();
      else if (act === 'fb-check') fbCheck(false);
      else if (act === 'copylink') { navigator.clipboard.writeText(cur.final_url).then(function () { render('Линкът е копиран.'); }); }
      else if (act === 'revoice') {
        // unsaved edits in the text boxes are saved first, so the new wording is what gets voiced
        readDraft();
        var lineId = b.dataset.line, idx = draft.lines.map(function (l) { return l.id; }).indexOf(lineId);
        var edited = sig(draft.lines) !== sig(cur.lines);
        busy = true; render(edited ? 'Запазвам и преозвучавам…' : 'Преозвучавам…');
        var saved = edited ? call({ action: 'episode_update', id: cur.id, title: draft.title, aspect: draft.aspect, captions: draft.captions, scene_image_url: draft.scene_image_url, lines: linesOut() }) : Promise.resolve({ ok: true, lines: cur.lines });
        saved.then(function (r) {
          if (!r.ok) throw new Error(r.error);
          var id = (r.lines && r.lines[idx] && r.lines[idx].id) || lineId;
          return call({ action: 'voice', id: cur.id, line_id: id });
        }).then(function (r) { busy = false; if (!r.ok) return render(r.error, true); fromServer(r); render('Готово.'); })
          .catch(function (e) { busy = false; render(e.message, true); });
      }
      else if (act === 'render') { if (!confirm('Да пусна ли HeyGen да направи видеото? Ще струва около ' + money(draft.lines.reduce(function (a, l) { return a + speechSeconds(l.text); }, 0) * 0.05) + ' от API портфейла.')) return; run(call({ action: 'render', id: cur.id }), 'Пуснато. Рендирането отнема няколко минути.'); }
      else if (act === 'delete') { if (!confirm('Да изтрия ли епизода „' + draft.title + '“ с озвучените реплики?')) return; var id = cur.id; cur = null; draft = null; stopPoll(); run(call({ action: 'episode_delete', id: id }), 'Изтрит.'); }
      else if (act === 'char-add') run(call({ action: 'character_save', name: 'Нов герой' }));
      else if (act === 'char-save' || act === 'char-del') {
        var card = b.closest('.ve-char'); var f = function (k) { var n = card.querySelector('[data-f="' + k + '"]'); return n ? n.value : ''; };
        if (act === 'char-del') { if (!confirm('Да изтрия ли героя?')) return; run(call({ action: 'character_delete', id: b.dataset.id })); }
        else run(call({ action: 'character_save', id: b.dataset.id, name: f('name'), color: f('color'), voice_id: f('voice_id'), avatar_id: f('avatar_id'), motion: f('motion'), expressiveness: f('expressiveness'), look: f('look'), react: f('react') }), 'Героят е запазен.');
      }
      else if (act === 'snd-add') run(call({ action: 'sound_save', name: 'Нов звук', kind: 'effect', seconds: 2, gain: 0.5 }));
      else if (act === 'snd-save' || act === 'snd-gen' || act === 'snd-del') {
        var sc = b.closest('.ve-snd'), sv = function (k) { var n = sc.querySelector('[data-f="' + k + '"]'); return n ? n.value : ''; }, sid = b.dataset.id;
        if (act === 'snd-del') { if (!confirm('Да изтрия ли звука „' + sv('name') + '“? Ще се махне и от репликите, които го ползват.')) return; run(call({ action: 'sound_delete', id: sid }), 'Изтрит.'); return; }
        var body = { action: 'sound_save', id: sid, name: sv('name'), kind: sv('kind'), prompt: sv('prompt'), seconds: Number(sv('seconds')) || 2, gain: (Number(sv('gain')) || 10) / 100 };
        if (act === 'snd-save') { run(call(body), 'Звукът е запазен.'); return; }
        if (!body.prompt.trim()) { render('Напиши описание на звука (на английски).', true); return; }
        var secs = Math.min(body.kind === 'ambience' ? 30 : 10, Math.max(0.5, body.seconds));
        if (!confirm('Да направя ли записа „' + body.name + '“ през ElevenLabs? ' + secs + ' сек ≈ ' + Math.round(secs * SOUND_CREDITS_PER_SEC) + ' кредита.')) return;
        run(call(body).then(function (r) { return r.ok ? call({ action: 'sound_generate', id: sid }) : r; }), 'Записът е готов – пусни го да го чуеш.');
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
