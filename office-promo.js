/* /verde-office: „От празно до готово“ tab (group „Видео“) – premium Reel from the gallery photos of one project.
   The owner files a request: project, photos (each either an "assembly" shot, played backwards, or a slow "beauty"
   shot), captions and a note. The clips are made by hand on vidu.com in the free off-peak mode (no API credits); the
   vidu link of each clip is pasted here and the server keeps the clip. „Сглоби видеото“ then stitches everything in
   the browser (WebCodecs + mp4-muxer, Chrome/Edge): cross-fades, captions, music, logo card → one 1080×1920 MP4,
   which is also sent to the server so it can be downloaded later from any device.
   Data: /contract-automation/api/promo. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/promo';
  var MUXER_URL = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.1/+esm';
  var BEAT_URL = 'https://cdn.jsdelivr.net/gh/verdem98-sketch/smart-form@494c8d286f22ff7ff811ace28b7f2d880aedcdd4/assets/promo-beat.mp3';
  var LOGO_URL = 'https://cdn.prod.website-files.com/693adf9a8c0d92c4c72f9155/69744f06b0e6aeaf13655dce_logo-p-500.png';
  var W = 1080, H = 1920, FPS = 30, XF = 0.5, HOLD_REV = 0.9, HOLD_FWD = 0.3, END = 3.4, MAX_SHOTS = 8;
  var FONT = 'Montserrat, Inter, Arial, sans-serif';
  var DEFAULT_CAPTIONS = [
    ['МЕБЕЛИ ПО ПОРЪЧКА', 'от празна стая до готов дом'],
    ['ПО ВАШИТЕ РАЗМЕРИ', 'всеки сантиметър е използван'],
    ['ЕДИН СТИЛ В ЦЕЛИЯ ДОМ', 'изработено за Вашето пространство'],
    ['ДЕТАЙЛИ, КОИТО СЕ УСЕЩАТ', 'материали, подбрани с грижа'],
    ['ГОТОВО ЗА ВАШИЯ ДЕН', 'изработено от Верде-М']
  ];
  var PROMPTS = {
    rev: 'Fixed tripod shot. The camera is completely static for the whole video: no zoom, no pan, no tilt, no shake, the framing never changes. The room itself never changes: all windows, balcony doors, door frames, walls, the ceiling, the ceiling lamps and the floor stay exactly where they are, fully visible, sharp and unchanged from the first frame to the last frame. Daylight keeps coming through the same windows during the whole video. The windows and doors must never fade, move, shrink or disappear. Only the furniture moves. The furniture smoothly disassembles piece by piece: doors, panels, shelves and worktops detach one after another, each piece stays a flat rigid shape and glides calmly straight up and out of the top of the frame. At the end all furniture is gone: there is only a clean empty room with the same windows, walls, ceiling, lamps and floor as in the first frame. The movement is slow, smooth and weightless, like a premium furniture commercial. Every piece keeps its real shape, colour and material while it moves. Photorealistic, natural colours, constant lighting. No people, no hands, no dust, no smoke, no new objects, no new furniture, no text, no cuts, no morphing or redrawing of the room.',
    fwd: 'A very slow, smooth, cinematic camera push-in. The camera glides gently and steadily forward towards the furniture, moving only a short distance, like a slider shot in a premium furniture commercial. No shake, no rotation, no sudden moves, no cuts. Absolutely nothing in the scene changes: every piece of furniture, every handle, the worktop, the lamps, the windows, the walls, the ceiling and the floor keep exactly their real shape, size, position, colour and material from the first frame to the last frame. All lines stay perfectly straight, all edges stay sharp. The only visible change besides the camera move is that the built-in lighting glows very softly. Photorealistic, natural colours, soft daylight, calm premium look. No people, no hands, no steam, no smoke, no new objects, no added decorations, no text, no morphing or redrawing of the furniture or the room.'
  };
  var STATUS = { requested: 'Заявено', working: 'Правят се клиповете', clips_ready: 'Клиповете са готови', done: 'Готово' };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function post(body) { return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify(body) }); }
  function call(body) { return post(body).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + r.status + ')' }; }); }); }
  function b64(ab) { var u = new Uint8Array(ab), s = ''; for (var i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function bgDate(iso) { var d = new Date(iso); return isNaN(d) ? '' : d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); }
  function clamp(x, a, b) { return Math.min(b, Math.max(a, x)); }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
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

  /* ---------------- stitching in the browser ---------------- */
  // Every frame of a clip is decoded exactly (WebCodecs + mp4box), cropped to the 9:16 picture and kept as a JPEG.
  // Seeking a <video> element and drawing it is not reliable (the browser often hands back the previous frame, which
  // shows as a stutter), so it is used only where the browser cannot decode the clip itself.
  // Vidu often repeats every 3rd or 4th frame; those repeats are dropped and the remaining frames are spread evenly
  // over the clip and blended in between, so the motion runs smoothly.
  var MP4BOX_URL = 'https://cdn.jsdelivr.net/npm/mp4box@0.5.3/+esm';
  var SIG_W = 32, SIG_H = 56, SAME = 0.6;
  function sigOf(src, sw, sh, crop) {
    var c = document.createElement('canvas'); c.width = SIG_W; c.height = SIG_H; var x = c.getContext('2d', { willReadFrequently: true });
    var k = Math.max(SIG_W / sw, SIG_H / sh), dw = sw * k, dh = sh * k;
    x.drawImage(src, -(dw - SIG_W) * crop, -(dh - SIG_H) / 2, dw, dh);
    var d = x.getImageData(0, 0, SIG_W, SIG_H).data, out = new Uint8Array(SIG_W * SIG_H);
    for (var i = 0, j = 0; i < d.length; i += 4, j++) out[j] = (d[i] * 3 + d[i + 1] * 6 + d[i + 2]) / 10;
    return out;
  }
  function sigDiff(a, b) { var s = 0; for (var i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }
  // keeps one frame (drawn at the final 1080×1920 crop) unless it repeats the previous one
  function keeper(crop) {
    var work = document.createElement('canvas'); work.width = W; work.height = H; var wg = work.getContext('2d');
    var out = { frames: [], total: 0, prev: null };
    out.add = function (src, sw, sh) {
      out.total++;
      var sig = sigOf(src, sw, sh, crop);
      if (out.prev && sigDiff(sig, out.prev) < SAME) return Promise.resolve();
      out.prev = sig;
      var k = Math.max(W / sw, H / sh), dw = sw * k, dh = sh * k;
      wg.drawImage(src, -(dw - W) * crop, -(dh - H) / 2, dw, dh);
      return new Promise(function (res) { work.toBlob(function (b) { out.frames.push(b); res(); }, 'image/jpeg', 0.92); });
    };
    return out;
  }
  function demux(MB, ab) {
    return new Promise(function (resolve, reject) {
      var file = MB.createFile(), track = null, samples = [];
      file.onError = function (e) { reject(new Error('Клипът не се разчита: ' + e)); };
      file.onReady = function (info) {
        track = info.videoTracks && info.videoTracks[0];
        if (!track) return;
        file.setExtractionOptions(track.id, null, { nbSamples: 100000 });
        file.start();
      };
      file.onSamples = function (id, user, s) { samples = samples.concat(s); };
      ab.fileStart = 0; file.appendBuffer(ab); file.flush();
      setTimeout(function () {
        if (!track || !samples.length) return reject(new Error('В клипа няма видео.'));
        var trak = file.getTrackById(track.id), desc = null;
        (trak.mdia.minf.stbl.stsd.entries || []).forEach(function (e) {
          var box = e.avcC || e.hvcC || e.vpcC || e.av1C;
          if (box && !desc) { var ds = new MB.DataStream(undefined, 0, MB.DataStream.BIG_ENDIAN); box.write(ds); desc = new Uint8Array(ds.buffer, 8); }
        });
        resolve({ track: track, samples: samples, desc: desc });
      }, 0);
    });
  }
  function decodeExact(MB, blob, crop) {
    return blob.arrayBuffer().then(function (ab) { return demux(MB, ab); }).then(function (dm) {
      var cfg = { codec: dm.track.codec, codedWidth: dm.track.video.width, codedHeight: dm.track.video.height };
      if (dm.desc) cfg.description = dm.desc;
      return VideoDecoder.isConfigSupported(cfg).then(function (sup) {
        if (!sup || !sup.supported) throw new Error('unsupported');
        var kept = keeper(crop), queue = [], busy = Promise.resolve(), err = null, pending = 0;
        var dec = new VideoDecoder({
          output: function (fr) {
            pending++;
            busy = busy.then(function () {
              var p = kept.add(fr, fr.displayWidth, fr.displayHeight);
              fr.close(); pending--;
              return p;
            });
          },
          error: function (e) { err = e; }
        });
        dec.configure(cfg);
        var last = dm.samples[dm.samples.length - 1], ts = last.timescale;
        var dur = (Math.max.apply(null, dm.samples.map(function (s) { return s.cts + s.duration; })) - Math.min.apply(null, dm.samples.map(function (s) { return s.cts; }))) / ts;
        var i = 0;
        function feed() {
          if (err) throw err;
          while (i < dm.samples.length && pending < 8 && dec.decodeQueueSize < 64) {
            var s = dm.samples[i++];
            dec.decode(new EncodedVideoChunk({ type: s.is_sync ? 'key' : 'delta', timestamp: Math.round(1e6 * s.cts / ts), duration: Math.round(1e6 * s.duration / ts), data: s.data }));
          }
          if (i < dm.samples.length) return wait(5).then(feed);
          return dec.flush().then(function () { return busy; }).then(function () { dec.close(); if (err) throw err; return { frames: kept.frames, total: kept.total, dur: dur, exact: true }; });
        }
        return feed();
      });
    });
  }
  // fallback for clips the browser cannot decode by itself: seek the <video>, one source frame at a time
  function decodeBySeeking(blob, crop) {
    return new Promise(function (resolve, reject) {
      var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = URL.createObjectURL(blob);
      v.addEventListener('loadeddata', function () { resolve(v); }, { once: true });
      v.addEventListener('error', function () { reject(new Error('Клипът не може да се прочете от този браузър. Във Vidu избери кодек H264 и го направи пак.')); }, { once: true });
    }).then(function (v) {
      var kept = keeper(crop), n = Math.max(2, Math.round(v.duration * 24)), i = 0;
      function next() {
        if (i >= n) { URL.revokeObjectURL(v.src); return { frames: kept.frames, total: kept.total, dur: v.duration, exact: false }; }
        var t = Math.min(v.duration - 0.01, (i + 0.5) / 24); i++;
        return new Promise(function (res) { var done = false, fin = function () { if (!done) { done = true; res(); } }; v.addEventListener('seeked', fin, { once: true }); setTimeout(fin, 3000); v.currentTime = t; })
          .then(function () { return wait(30); }).then(function () { return kept.add(v, v.videoWidth, v.videoHeight); }).then(next);
      }
      return next();
    });
  }
  function prepareClip(MB, blob, crop) {
    if (!window.VideoDecoder || !window.EncodedVideoChunk || !MB) return decodeBySeeking(blob, crop);
    return decodeExact(MB, blob, crop).catch(function () { return decodeBySeeking(blob, crop); });
  }
  function fadeAlpha(t, a, b, d) { return clamp((t - a) / d, 0, 1) * clamp((b - t) / d, 0, 1); }

  // opts: { shots:[{blob, mode, crop, caption1, caption2}], music: ArrayBuffer|null, onProgress(fraction, text) }
  function stitch(opts) {
    if (!window.VideoEncoder || !window.VideoFrame) return Promise.reject(new Error('Този браузър не поддържа видео кодиране (WebCodecs). Използвай Chrome или Edge.'));
    var c = document.createElement('canvas'); c.width = W; c.height = H; var g = c.getContext('2d');
    var snap = document.createElement('canvas'); snap.width = W; snap.height = H; var sg = snap.getContext('2d');
    var say = opts.onProgress || function () {};
    var actx = null, segs = [], logo = null, music = null, M = null, MB = null, inexact = 0;
    return Promise.all([import(MUXER_URL), import(MP4BOX_URL).catch(function () { return null; })]).then(function (mods) {
      M = mods[0]; MB = mods[1] ? (mods[1].default || mods[1]) : null; if (MB && !MB.createFile) MB = null;
      var prepared = [];
      return opts.shots.reduce(function (p, s, i) {
        return p.then(function () {
          say(i / opts.shots.length * 0.3, 'Подготвям клип ' + (i + 1) + ' от ' + opts.shots.length + '…');
          return prepareClip(MB, s.blob, s.crop).then(function (r) { prepared.push(r); if (!r.exact) inexact++; });
        });
      }, Promise.resolve()).then(function () { return prepared; });
    }).then(function (prepared) {
      var t0 = 0;
      prepared.forEach(function (r, i) {
        var s = opts.shots[i], dur = Math.max(0.5, r.dur - 0.06), hold = s.mode === 'fwd' ? HOLD_FWD : HOLD_REV;
        segs.push({ frames: r.frames, cache: {}, mode: s.mode, c1: s.caption1, c2: s.caption2, dur: dur, len: dur + hold, start: t0 });
        t0 += dur + hold - XF;
      });
      return fetch(LOGO_URL).then(function (r) { return r.blob(); }).then(function (b) { return createImageBitmap(b); }).then(function (bm) { logo = bm; }).catch(function () { logo = null; });
    }).then(function () {
      if (!opts.music || !window.AudioEncoder || !window.AudioData) return null;
      actx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000 });
      return actx.decodeAudioData(opts.music.slice(0)).then(function (buf) { music = buf; }).catch(function () { music = null; });
    }).then(function () {
      try { return Promise.all([document.fonts.load('700 62px Montserrat'), document.fonts.load('400 42px Montserrat')]).catch(function () {}); } catch (e) { return null; }
    }).then(function () {
      var last = segs[segs.length - 1], endStart = last.start + last.len - XF, total = endStart + END, frames = Math.round(total * FPS);
      var SR = 48000;
      var cfg = { target: new M.ArrayBufferTarget(), video: { codec: 'avc', width: W, height: H }, fastStart: 'in-memory' };
      if (music) cfg.audio = { codec: 'aac', sampleRate: SR, numberOfChannels: 2 };
      var muxer = new M.Muxer(cfg), encErr = null;
      var venc = new VideoEncoder({ output: function (ch, meta) { muxer.addVideoChunk(ch, meta); }, error: function (e) { encErr = e; } });
      venc.configure({ codec: 'avc1.640028', width: W, height: H, bitrate: 6000000, framerate: FPS });

      // which kept frames a shot shows at time t: the frames are spread evenly over the clip, played backwards for an
      // assembly shot, and the one in between is blended in, so the motion has no stops and no jumps
      function pick(s, t) {
        var m = s.frames.length, q = clamp((t - s.start) / s.dur, 0, 1);
        if (s.mode !== 'fwd') q = 1 - q;
        var p = q * (m - 1), i = Math.floor(p), f = p - i;
        if (i >= m - 1) { i = m - 1; f = 0; }
        return { i: i, j: f > 0.02 ? i + 1 : -1, f: f };
      }
      function bmp(s, idx) {
        if (s.cache[idx]) return Promise.resolve(s.cache[idx]);
        return createImageBitmap(s.frames[idx]).then(function (b) {
          s.cache[idx] = b;
          Object.keys(s.cache).forEach(function (k) { if (Math.abs(k - idx) > 2) { s.cache[k].close(); delete s.cache[k]; } });
          return b;
        });
      }
      function loadSeg(s, t) {
        var w = pick(s, t);
        return Promise.all([bmp(s, w.i), w.j >= 0 ? bmp(s, w.j) : null]).then(function (b) { s.now = { a: b[0], b: b[1], f: w.f }; });
      }
      function drawSeg(s, t, alpha) {
        var n = s.now; if (!n) return;
        g.save(); g.globalAlpha = alpha; g.drawImage(n.a, 0, 0, W, H);
        if (n.b) { g.globalAlpha = alpha * n.f; g.drawImage(n.b, 0, 0, W, H); }
        g.restore();
      }
      function text(str, size, weight, y, alpha, dy) {
        if (!str || alpha <= 0) return;
        g.save(); g.globalAlpha = alpha; g.font = weight + ' ' + size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 6; g.shadowOffsetY = 3; g.fillStyle = '#fff';
        var w = g.measureText(str).width, scale = w > W - 100 ? (W - 100) / w : 1;
        g.translate(W / 2, y + (dy || 0)); g.scale(scale, scale); g.fillText(str, 0, 0); g.restore();
      }
      function captions(t) {
        var grad = g.createLinearGradient(0, 1180, 0, H); grad.addColorStop(0, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,.6)');
        g.fillStyle = grad; g.fillRect(0, 1180, W, H - 1180);
        segs.forEach(function (s, i) {
          if (!s.c1 && !s.c2) return;
          var a = s.start + 0.5, b = (i + 1 < segs.length ? segs[i + 1].start : endStart) - 0.25;
          var al = fadeAlpha(t, a, b, 0.35); if (al <= 0) return;
          text(s.c1, 62, 700, 1556, al, 18 * (1 - clamp((t - a) / 0.35, 0, 1)));
          g.save(); g.globalAlpha = al; g.fillStyle = '#e8772e'; g.fillRect((W - 120) / 2, 1592, 120, 3); g.restore();
          text(s.c2, 42, 400, 1660, fadeAlpha(t, a + 0.25, b, 0.35));
        });
      }
      function endCard(tc, alpha) {
        g.save(); g.globalAlpha = alpha; g.filter = 'blur(18px) brightness(0.6) saturate(0.8)'; g.drawImage(snap, -40, -40, W + 80, H + 80); g.restore();
        if (logo) { var lw = 520, lh = logo.height * lw / logo.width; g.save(); g.globalAlpha = alpha * clamp((tc - 0.5) / 0.7, 0, 1); g.drawImage(logo, (W - lw) / 2, H / 2 - 330, lw, lh); g.restore(); }
        text('ВЕРДЕ-М', 92, 700, H / 2 + 90, alpha * clamp((tc - 0.8) / 0.7, 0, 1));
        text('МЕБЕЛИ ПО ПОРЪЧКА', 42, 400, H / 2 + 172, alpha * clamp((tc - 1.1) / 0.7, 0, 1));
        if (tc >= 1.3) { g.save(); g.globalAlpha = alpha * 0.8; g.fillStyle = '#fff'; g.fillRect((W - 160) / 2, H / 2 + 215, 160, 2); g.restore(); }
        text('verde-m.com', 44, 400, H / 2 + 290, alpha * clamp((tc - 1.4) / 0.7, 0, 1));
        text('СВЪРЖЕТЕ СЕ С НАС', 40, 400, H / 2 + 366, alpha * clamp((tc - 1.7) / 0.6, 0, 1));
      }
      var snapped = false;
      function frame(f) {
        var t = f / FPS, active = segs.filter(function (s) { return t >= s.start && t < s.start + s.len; });
        return Promise.all(active.map(function (s) { return loadSeg(s, t); })).then(function () {
          g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
          active.forEach(function (s, i) { drawSeg(s, t, i === 0 ? 1 : clamp((t - s.start) / XF, 0, 1)); });
          // the last picture of the last shot (the real photo) is what the logo card is laid over
          if (!snapped && t >= last.start + last.dur) { sg.drawImage(c, 0, 0); snapped = true; }
          if (t < endStart + XF) captions(t);
          if (t >= endStart) { if (!snapped) { sg.drawImage(c, 0, 0); snapped = true; } endCard(t - endStart, clamp((t - endStart) / XF, 0, 1)); }
          var black = Math.max(1 - clamp(t / 0.5, 0, 1), 1 - clamp((total - t) / 0.6, 0, 1));
          if (black > 0) { g.fillStyle = 'rgba(0,0,0,' + black + ')'; g.fillRect(0, 0, W, H); }
          var vf = new VideoFrame(c, { timestamp: Math.round(f * 1e6 / FPS), duration: Math.round(1e6 / FPS) });
          venc.encode(vf, { keyFrame: f % 60 === 0 }); vf.close();
          if (encErr) throw encErr;
          if (f % 10 === 0) say(0.3 + f / frames * 0.62, 'Сглобявам… ' + Math.round(f / frames * 100) + '%');
          return venc.encodeQueueSize > 6 ? wait(30) : (f % 5 === 0 ? wait(0) : null);
        });
      }
      var seq = Promise.resolve();
      for (var f = 0; f < frames; f++) (function (f) { seq = seq.then(function () { return frame(f); }); })(f);
      return seq.then(function () { return venc.flush(); }).then(function () {
        if (!music) return;
        say(0.94, 'Добавям музиката…');
        var n = Math.round(total * SR), L = new Float32Array(n), R = new Float32Array(n), a = music.getChannelData(0), b = music.numberOfChannels > 1 ? music.getChannelData(1) : a;
        // the track is resampled by decodeAudioData to SR already; a shorter one starts over
        for (var i = 0; i < n; i++) { var k = i % a.length, gain = 0.85 * clamp(i / (0.3 * SR), 0, 1) * Math.pow(clamp((n - i) / (2.8 * SR), 0, 1), 1.5); L[i] = a[k] * gain; R[i] = b[k] * gain; }
        var aenc = new AudioEncoder({ output: function (ch, meta) { muxer.addAudioChunk(ch, meta); }, error: function (e) { encErr = e; } });
        aenc.configure({ codec: 'mp4a.40.2', sampleRate: SR, numberOfChannels: 2, bitrate: 160000 });
        var STEP = 4800;
        for (var o = 0; o < n; o += STEP) {
          var len = Math.min(STEP, n - o), data = new Float32Array(len * 2);
          data.set(L.subarray(o, o + len), 0); data.set(R.subarray(o, o + len), len);
          var ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round(o * 1e6 / SR), data: data });
          aenc.encode(ad); ad.close();
        }
        return aenc.flush();
      }).then(function () {
        if (encErr) throw encErr;
        muxer.finalize(); if (actx) actx.close();
        segs.forEach(function (s) { Object.keys(s.cache).forEach(function (k) { s.cache[k].close(); }); s.cache = {}; s.frames = null; });
        say(1, 'Готово');
        return { blob: new Blob([muxer.target.buffer], { type: 'video/mp4' }), seconds: total, hasMusic: !!music, inexact: inexact };
      });
    });
  }
  window.__vpStitch = stitch; // for trying the stitcher outside the office

  /* ---------------- the tab ---------------- */
  function start(panel) {
    var view = 'list', videos = [], cur = null, shots = [], dirty = false, busy = false, msg = null, projects = null, photos = null, result = null, ownMusic = null, useMusic = true;

    function flash(text, isErr) { msg = text ? { text: text, err: !!isErr } : null; var f = panel.querySelector('[data-flash]'); if (f) { f.className = isErr ? 'pv-err' : 'pv-muted'; f.textContent = text || ''; } }
    function setBusy(b) { busy = b; [].forEach.call(panel.querySelectorAll('button,input[type=file]'), function (x) { x.disabled = b; }); }
    function take(d) { cur = d.video; shots = d.shots.map(function (s) { return Object.assign({}, s); }); dirty = false; }
    function readForm() {
      if (view !== 'edit') return;
      var t = panel.querySelector('[data-title]'); if (t) cur.title = t.value;
      var n = panel.querySelector('[data-note]'); if (n) cur.note = n.value;
      shots.forEach(function (s, i) {
        var row = panel.querySelector('[data-shot="' + i + '"]'); if (!row) return;
        s.caption1 = row.querySelector('[data-c1]').value; s.caption2 = row.querySelector('[data-c2]').value;
        s.mode = row.querySelector('[data-mode]').value; s.crop = Number(row.querySelector('[data-crop]').value) / 100;
      });
    }
    function save() {
      readForm();
      return call({ action: 'save', id: cur.id || '', title: cur.title, project_url: cur.project_url || '', note: cur.note || '', shots: shots.map(function (s) { return { id: s.id || '', photo_url: s.photo_url, crop: s.crop, mode: s.mode, caption1: s.caption1, caption2: s.caption2, prompt: s.prompt || '' }; }) })
        .then(function (d) { if (!d.ok) throw new Error(d.error || 'Грешка'); take(d); return d; });
    }
    function saved() { return dirty || !cur.id || shots.some(function (s) { return !s.id; }) ? save() : Promise.resolve(); }
    function guard(p, okText) {
      setBusy(true);
      return p.then(function (x) { setBusy(false); render(); if (okText) flash(okText); return x; }).catch(function (e) { setBusy(false); render(); flash(e.message || String(e), true); });
    }

    function renderList() {
      return '<div class="pv-card"><h3>От празно до готово</h3><p class="pv-sub">Рекламно видео от снимките на един проект: мебелите се сглобяват сами в празната стая, следват близък план, надписи, музика и лого. Клиповете се правят във vidu.com в безплатния режим – без API кредити.</p>' +
        '<div class="pv-row"><button type="button" class="pv-btn pri" data-act="new">+ Нова заявка за видео</button><span data-flash class="pv-muted"></span></div></div>' +
        '<div class="pv-card"><h4 style="margin-top:0">Заявки и готови видеа</h4><div class="pv-list">' + (videos.length ? videos.map(function (v) {
          return '<div class="pv-item" data-open="' + esc(v.id) + '"><div><b>' + esc(v.title) + '</b><div class="pv-muted">' + bgDate(v.created_at) + ' · ' + v.clips + ' от ' + v.shots + ' клипа</div></div><span class="pv-row">' + (v.final_size ? '<button type="button" class="pv-btn" data-watch="' + esc(v.id) + '">▶ Гледай</button>' : '') + '<span class="pv-badge ' + esc(v.status) + '">' + esc(STATUS[v.status] || v.status) + '</span></span></div>';
        }).join('') : '<p class="pv-muted">Още няма заявки.</p>') + '</div></div>';
    }
    function renderEdit() {
      var ready = shots.length && shots.every(function (s) { return s.clip_status === 'done'; });
      var html = '<div class="pv-card"><div class="pv-row" style="justify-content:space-between"><button type="button" class="pv-btn" data-act="back">← Всички видеа</button><span class="pv-badge ' + esc(cur.status || 'requested') + '">' + esc(STATUS[cur.status] || 'Нова заявка') + '</span></div>' +
        '<label>Име на видеото</label><input type="text" data-title value="' + esc(cur.title || '') + '" placeholder="напр. Clear Line – кухня с остров">' +
        '<label>Проект от галерията</label><select data-project><option value="">' + (projects ? '— избери проект —' : 'зареждам проектите…') + '</option>' + (projects || []).map(function (p) { return '<option value="' + esc(p.url) + '"' + (p.url === cur.project_url ? ' selected' : '') + '>' + esc(p.cat + ' · ' + p.name) + '</option>'; }).join('') + '</select>' +
        (photos ? '<div class="pv-photos">' + photos.map(function (u, i) { var on = shots.some(function (s) { return s.photo_url === u; }); return '<div class="pv-photo' + (on ? ' on' : '') + '" data-photo="' + i + '"><img loading="lazy" src="' + esc(u.replace(/(\.(?:jpe?g|webp))$/i, '-p-500$1')) + '" onerror="this.onerror=null;this.src=\'' + esc(u) + '\'"></div>'; }).join('') + '</div><p class="pv-muted" style="margin:8px 0 0">Натисни снимка, за да я добавиш или махнеш (до ' + MAX_SHOTS + '). Най-добре 5: три за сглобяване, един близък план и една обща за финал.</p>' : (cur.project_url ? '<p class="pv-muted">Зареждам снимките…</p>' : '')) +
        '<label>Бележка за изпълнителя (по желание)</label><textarea data-note rows="2" placeholder="напр. наблегни на острова; без антрето">' + esc(cur.note || '') + '</textarea></div>';
      html += '<div class="pv-card"><h4 style="margin-top:0">Кадри (' + shots.length + ')</h4>' +
        '<ol class="pv-steps"><li>Подреди кадрите и надписите и натисни „Запази заявката“.</li><li>За всеки кадър се прави клип във vidu.com (Image to Video, 5 сек, Off-Peak Mode, кодек H264) с описанието от бутона „Копирай описанието“.</li><li>Линкът на готовия клип се поставя при кадъра и се натиска „Вземи клипа“.</li><li>Когато всички клипове са тук – „Сглоби видеото“.</li></ol>' +
        (shots.length ? shots.map(function (s, i) {
          return '<div class="pv-shot" data-shot="' + i + '"><div><div class="pv-frame"><img src="' + esc(s.photo_url.replace(/(\.(?:jpe?g|webp))$/i, '-p-500$1')) + '" onerror="this.onerror=null;this.src=\'' + esc(s.photo_url) + '\'" style="object-position:' + Math.round(s.crop * 100) + '% 50%" data-prev></div>' +
            '<input type="range" min="0" max="100" value="' + Math.round(s.crop * 100) + '" data-crop title="Коя част от снимката да се вижда" style="width:120px;max-width:100%"></div><div>' +
            '<div class="pv-row" style="justify-content:space-between"><b>Кадър ' + (i + 1) + '</b><span class="pv-row"><button type="button" class="pv-btn" data-act="up" data-i="' + i + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" class="pv-btn" data-act="down" data-i="' + i + '"' + (i < shots.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="pv-btn danger" data-act="drop" data-i="' + i + '">Махни</button></span></div>' +
            '<label>Движение</label><select data-mode><option value="rev"' + (s.mode !== 'fwd' ? ' selected' : '') + '>Сглобяване (мебелите се появяват)</option><option value="fwd"' + (s.mode === 'fwd' ? ' selected' : '') + '>Приближаване (готовата мебел, бавна камера)</option></select>' +
            '<div class="pv-two"><div><label>Надпис – голям</label><input type="text" data-c1 maxlength="60" value="' + esc(s.caption1 || '') + '"></div><div><label>Надпис – малък</label><input type="text" data-c2 maxlength="90" value="' + esc(s.caption2 || '') + '"></div></div>' +
            '<label>Клип от Vidu</label>' + (s.clip_status === 'done' ? '<div class="pv-row"><span class="pv-ok">✓ Клипът е тук' + (s.clip_bytes > 1000 ? ' (' + (s.clip_bytes / 1048576).toFixed(1) + ' MB)' : '') + '</span><button type="button" class="pv-btn" data-act="clip-del" data-i="' + i + '">Смени клипа</button></div>'
              : '<div class="pv-row"><input type="text" data-link placeholder="постави линка на клипа от vidu.com" style="flex:1 1 220px;width:auto"><button type="button" class="pv-btn pri" data-act="clip-link" data-i="' + i + '">Вземи клипа</button></div><div class="pv-row" style="margin-top:6px"><span class="pv-muted">или качи файл:</span><input type="file" accept="video/mp4,video/*" data-file="' + i + '"></div>') +
            '<div class="pv-row" style="margin-top:8px"><button type="button" class="pv-btn" data-act="copy" data-i="' + i + '">Копирай описанието за Vidu</button><a class="pv-btn" style="text-decoration:none" href="' + esc(s.photo_url) + '" target="_blank" rel="noopener">Отвори снимката ↗</a></div></div></div>';
        }).join('') : '<p class="pv-muted" style="margin-top:10px">Избери проект и натисни снимките, които да влязат във видеото.</p>') + '</div>';
      html += '<div class="pv-card"><div class="pv-row"><button type="button" class="pv-btn pri" data-act="save">Запази заявката</button>' +
        '<button type="button" class="pv-btn pri" data-act="stitch"' + (ready ? '' : ' disabled title="Трябват клиповете на всички кадри"') + '>Сглоби видеото</button>' +
        (cur.final_size ? '<button type="button" class="pv-btn pri" data-watch="' + esc(cur.id) + '">▶ Гледай</button><button type="button" class="pv-btn" data-act="download">Свали готовото видео</button>' : '') +
        (cur.id ? '<button type="button" class="pv-btn danger" data-act="delete">Изтрий</button>' : '') + '</div>' +
        '<div class="pv-row" style="margin-top:10px"><label style="margin:0;text-transform:none;font-size:14px;font-weight:400;color:#2f332f"><input type="checkbox" data-music' + (useMusic ? ' checked' : '') + '> с музика</label><span class="pv-muted">своя музика (mp3, по желание):</span><input type="file" accept="audio/*" data-own-music>' + (ownMusic ? '<span class="pv-ok">✓ ' + esc(ownMusic.name) + '</span>' : '') + '</div>' +
        '<p data-flash class="pv-muted" style="margin:10px 0 0"></p>' +
        (result ? '<video controls playsinline src="' + esc(result.url) + '"></video><div class="pv-row"><a class="pv-btn pri" style="text-decoration:none" href="' + esc(result.url) + '" download="' + esc((cur.title || 'verde-video').replace(/[^\wа-яА-Я -]+/g, '').trim() || 'verde-video') + '.mp4">Свали видеото</a><span class="pv-muted">' + Math.round(result.seconds) + ' сек · ' + (result.blob.size / 1048576).toFixed(1) + ' MB</span></div>' : '') + '</div>';
      return html;
    }
    function render() {
      panel.innerHTML = '<div class="pv">' + (view === 'list' ? renderList() : renderEdit()) + '</div>';
      if (msg) flash(msg.text, msg.err);
      if (busy) setBusy(true);
    }
    function refreshList() { return call({ action: 'list' }).then(function (d) { if (d.ok) videos = d.videos; else flash(d.error || 'Грешка', true); render(); }).catch(function (e) { render(); flash('Няма връзка със сървъра: ' + e.message, true); }); }
    function openProject(url) {
      photos = null; render();
      if (!url) return;
      loadPhotos(url).then(function (list) { photos = list; render(); if (!list.length) flash('Не намерих снимки на тази страница.', true); }).catch(function () { photos = []; render(); flash('Снимките не се заредиха.', true); });
    }
    function openEdit(d) {
      view = 'edit'; msg = null; result = null; photos = null;
      if (d) take(d); else { cur = { title: '', project_url: '', note: '', status: '' }; shots = []; dirty = true; }
      render();
      loadProjects().then(function (p) { projects = p; if (view === 'edit') { readForm(); render(); } }).catch(function () { projects = []; });
      if (cur.project_url) openProject(cur.project_url);
    }
    function uploadChunks(action, idKey, id, blob, onPct) {
      var CHUNK = 600000, total = Math.ceil(blob.size / CHUNK), seq = 0, last = null;
      function next() {
        if (seq >= total) return Promise.resolve(last);
        return blob.slice(seq * CHUNK, Math.min(blob.size, (seq + 1) * CHUNK)).arrayBuffer().then(function (ab) {
          var body = { action: action, seq: seq, total: total, size: blob.size, b64: b64(ab) }; body[idKey] = id; return call(body);
        }).then(function (r) { if (!r.ok) throw new Error(r.error || 'Качването спря.'); last = r; seq++; if (onPct) onPct(seq / total); return next(); });
      }
      return next();
    }
    function doStitch() {
      result = null;
      var musicP = !useMusic ? Promise.resolve(null) : ownMusic ? ownMusic.arrayBuffer() : fetch(BEAT_URL).then(function (r) { if (!r.ok) throw new Error('музика'); return r.arrayBuffer(); }).catch(function () { return null; });
      return saved().then(function () {
        flash('Взимам клиповете от сървъра…');
        return Promise.all(shots.map(function (s) { return post({ action: 'clip_content', shot_id: s.id }).then(function (r) { if (!r.ok || !/video/.test(r.headers.get('content-type') || '')) throw new Error('Клипът на кадър ' + (s.sort + 1) + ' не се зареди.'); return r.blob(); }); }));
      }).then(function (blobs) {
        return musicP.then(function (music) {
          return stitch({ shots: shots.map(function (s, i) { return { blob: blobs[i], mode: s.mode, crop: s.crop, caption1: s.caption1, caption2: s.caption2 }; }), music: music, onProgress: function (p, t) { flash(t); } });
        });
      }).then(function (r) {
        result = { blob: r.blob, url: URL.createObjectURL(r.blob), seconds: r.seconds }; watchCache[cur.id] = result.url;
        flash('Качвам готовото видео на сървъра… 0%');
        return uploadChunks('final_upload', 'id', cur.id, r.blob, function (p) { flash('Качвам готовото видео на сървъра… ' + Math.round(p * 100) + '%'); }).then(function (d) { if (d && d.video) { cur = d.video; } return r; });
      });
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
        else { if (shots.length >= MAX_SHOTS) return flash('Най-много ' + MAX_SHOTS + ' кадъра.', true); var n = shots.length, cap = DEFAULT_CAPTIONS[n] || ['', '']; shots.push({ photo_url: u, crop: 0.5, mode: n < 3 ? 'rev' : 'fwd', caption1: cap[0], caption2: cap[1], clip_status: 'none' }); }
        dirty = true; msg = null; return render();
      }
      var b = e.target.closest('[data-act]'); if (!b || busy) return;
      var a = b.dataset.act, i = Number(b.dataset.i);
      if (a === 'new') return openEdit(null);
      if (a === 'back') { view = 'list'; msg = null; result = null; return refreshList(); }
      if (a === 'up' || a === 'down') { readForm(); var j = a === 'up' ? i - 1 : i + 1, x = shots[i]; shots[i] = shots[j]; shots[j] = x; dirty = true; return render(); }
      if (a === 'drop') { readForm(); shots.splice(i, 1); dirty = true; return render(); }
      if (a === 'copy') { readForm(); var p = PROMPTS[shots[i].mode === 'fwd' ? 'fwd' : 'rev']; return (navigator.clipboard ? navigator.clipboard.writeText(p) : Promise.reject()).then(function () { flash('Описанието е копирано. Постави го във Vidu при кадър ' + (i + 1) + '.'); }).catch(function () { window.prompt('Копирай описанието:', p); }); }
      if (a === 'save') return guard(save(), 'Заявката е запазена.');
      if (a === 'clip-link') {
        var link = (panel.querySelector('[data-shot="' + i + '"] [data-link]') || {}).value || '';
        if (!/^https:\/\/[^\s]*vidu\./.test(link.trim())) return flash('Постави линка на клипа от vidu.com (започва с https://).', true);
        return guard(saved().then(function () { flash('Взимам клипа от Vidu…'); return call({ action: 'clip_import', shot_id: shots[i].id, url: link.trim() }); }).then(function (d) { if (!d.ok) throw new Error(d.error); take(d); }), 'Клипът е взет.');
      }
      if (a === 'clip-del') return guard(call({ action: 'clip_delete', shot_id: shots[i].id }).then(function (d) { if (!d.ok) throw new Error(d.error); take(d); }));
      if (a === 'stitch') return guard(doStitch(), 'Видеото е готово и е качено на сървъра.');
      if (a === 'download') return guard(post({ action: 'final_content', id: cur.id }).then(function (r) { if (!r.ok || !/video/.test(r.headers.get('content-type') || '')) throw new Error('Видеото не се зареди от сървъра.'); return r.blob(); }).then(function (blob) { var l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = (cur.title || 'verde-video').replace(/[^\wа-яА-Я -]+/g, '').trim() + '.mp4'; document.body.appendChild(l); l.click(); l.remove(); }));
      if (a === 'delete') { if (!confirm('Да изтрия ли тази заявка с клиповете и готовото видео?')) return; return guard(call({ action: 'delete', id: cur.id }).then(function (d) { if (!d.ok) throw new Error(d.error); videos = d.videos; view = 'list'; result = null; })); }
    });
    panel.addEventListener('input', function (e) {
      if (view !== 'edit') return;
      dirty = true;
      if (e.target.matches('[data-crop]')) { var img = e.target.closest('[data-shot]').querySelector('[data-prev]'); if (img) img.style.objectPosition = e.target.value + '% 50%'; }
    });
    panel.addEventListener('change', function (e) {
      if (view !== 'edit') return;
      if (e.target.matches('[data-project]')) { readForm(); cur.project_url = e.target.value; dirty = true; if (!cur.title) { var o = e.target.selectedOptions[0]; cur.title = o && o.value ? o.textContent.replace(/^.*· /, '') : ''; } return openProject(cur.project_url); }
      if (e.target.matches('[data-music]')) { useMusic = e.target.checked; return; }
      if (e.target.matches('[data-own-music]')) { ownMusic = e.target.files[0] || null; readForm(); return render(); }
      var fi = e.target.closest('[data-file]');
      if (fi && fi.files[0]) {
        var i = Number(fi.dataset.file), file = fi.files[0];
        if (file.size > 60 * 1048576) return flash('Файлът е твърде голям (до 60 MB).', true);
        return guard(saved().then(function () { return uploadChunks('clip_upload', 'shot_id', shots[i].id, file, function (p) { flash('Качвам клипа… ' + Math.round(p * 100) + '%'); }); }).then(function (d) { if (d && d.video) take(d); }), 'Клипът е качен.');
      }
    });
    render(); refreshList();
  }

  function mount(bar) {
    if (bar.querySelector('[data-tab="promo"]')) return;
    var shell = bar.parentElement;
    var tab = el('button', 'vo-tab', 'От празно до готово'); tab.type = 'button'; tab.setAttribute('data-tab', 'promo');
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
    // runs before the other tabs' own handlers, so they find the page as they left it
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
