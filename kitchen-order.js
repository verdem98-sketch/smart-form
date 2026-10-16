/* All three kitchens (Права / Ъглова / П-образна), last step: when the form is sent, the whole order also goes to
   /contract-automation/api/kitchen-order. The backend writes the readable e-mail (summary, sketch, AI picture, cut list +
   SketchUp file), puts the chosen slot into the Booked Slots CMS as "pending" and mails the client.
   The native Webflow submission stays untouched (it is the backup). */
(function () {
  'use strict';
  var ENDPOINT = location.origin + '/contract-automation/api/kitchen-order';
  var KITCHENS = [
    { id: 'prava', root: '.sf-page-prava', layout: 'pravaLayout', mats: 'pravaMaterialSelections', ai: '__pravaAiLastResponseId' },
    { id: 'aglova', root: '.flow-aglova', layout: 'agLayout', mats: 'agMaterialSelections', ai: '__agAiLastResponseId' },
    { id: 'p', root: '.sf-page-p', layout: 'pLayout', mats: 'pMaterialSelections', ai: '__pAiLastResponseId' }
  ];
  function clean(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function kitchen() { for (var i = 0; i < KITCHENS.length; i++) { var k = KITCHENS[i], el = document.querySelector(k.root); if (el) return { k: k, page: el }; } return null; }

  function val(form, sel) { var list = form.querySelectorAll(sel); for (var i = 0; i < list.length; i++) { var v = clean(list[i].value); if (v) return v; } return ''; }

  function contact(form) {
    return {
      name: val(form, 'input[name="Name"],input[name="name"],input[id$="final-name"],input[name$="final_name"]'),
      email: val(form, 'input[type="email"],input[name="Email"],input[name="email"],input[name$="final_email"]'),
      phone: val(form, 'input[type="tel"],input[name="Phone"],input[name="phone"],input[name$="final_phone"],input[id$="final-phone"]')
    };
  }

  // the step-9 "Вашият избор" card is the readable version of every answer; it is grouped by its block titles
  function summary(page) {
    var box = page.querySelector('[id$="step9-summary"]'), out = [];
    if (!box) return out;
    box.querySelectorAll('[class*="summary-row"]').forEach(function (row) {
      var label = row.querySelector('[class*="summary-label"]'), value = row.querySelector('[class*="summary-valueclick"],[class*="summary-value"]');
      var block = row.closest('[class*="choice-block"]'), title = block && block.querySelector('[class*="choice-title"]');
      var l = clean(label && label.textContent), v = clean(value && value.textContent);
      if (l && v) out.push({ group: clean(title && title.textContent) || 'Конфигурация', label: l, value: v });
    });
    return out;
  }

  function materials(k) {
    var src = window[k.mats], out = {};
    if (!src || typeof src.get !== 'function') return out;
    ['upper', 'lower', 'deep', 'countertop', 'backsplash'].forEach(function (role) {
      var r = null; try { r = src.get(role + '_finish'); } catch (e) { r = null; }
      if (!r) return;
      out[role] = { id: clean(r.value || r.id), label: clean(r.label || r.displayName || r.decorName || r.value), manufacturer: clean(r.manufacturer), code: clean(r.decorCode || r.surfaceCode), image: clean(r.sampleImageUrl) };
    });
    return out;
  }

  function build(form, found) {
    var k = found.k, page = found.page, layout = window[k.layout] || null, sketch = null, current = null;
    try { sketch = layout && typeof layout.capture === 'function' ? layout.capture() : null; } catch (e) { sketch = null; }
    try { current = layout && layout.current ? JSON.parse(JSON.stringify(layout.current)) : null; } catch (e) { current = null; }
    var note = val(form, 'textarea[name="final_note"],[data-field="final_note"] textarea,textarea[data-field="final_note"]');
    return {
      kitchen: k.id,
      page: location.href.split('#')[0],
      contact: contact(form),
      meeting: { date: val(form, 'input[name="meeting_date"]'), slot: val(form, 'input[name="meeting_slot"]'), custom: val(form, 'input[name="custom_date"]') },
      note: note,
      summary: summary(page),
      materials: materials(k),
      layout: current,
      aiResponseId: clean(window[k.ai]) || null,
      sketchImage: sketch
    };
  }

  function esc(v) { return clean(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var OFFICE = 'гр. София, ул. „Пиротска“ 86 — <a href="https://www.google.com/maps/search/?api=1&query=%D1%83%D0%BB.+%D0%9F%D0%B8%D1%80%D0%BE%D1%82%D1%81%D0%BA%D0%B0+86,+%D0%A1%D0%BE%D1%84%D0%B8%D1%8F" target="_blank" rel="noopener">виж на картата</a>';
  var KNAME = { prava: 'права кухня', aglova: 'ъглова кухня', p: 'П-образна кухня' };
  var DAYS = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
  var MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
  function niceDate(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso || '';
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return DAYS[d.getDay()] + ', ' + Number(m[3]) + ' ' + MONTHS[d.getMonth()];
  }

  /* ---------- the page after sending: a thank-you card built from the order itself ---------- */
  function successCss() {
    if (document.getElementById('kc-success-css')) return;
    var st = document.createElement('style'); st.id = 'kc-success-css';
    st.textContent = [
      '.w-form-done.kc-done{display:block;background:transparent!important;padding:0!important;text-align:left!important;margin:0 auto!important}',
      '.kc-success{max-width:920px;margin:28px auto 48px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px -24px rgba(31,48,32,.35),0 2px 8px rgba(31,48,32,.06);font-family:inherit;color:#2f332f}',
      '.kc-hero{position:relative;padding:44px 44px 36px;background:radial-gradient(120% 140% at 100% 0%,#5d8a5e 0%,#3f6640 45%,#2c472d 100%);color:#fff}',
      '.kc-kicker{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:#e3efd9;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22);padding:6px 12px;border-radius:999px}',
      '.kc-kicker i{width:8px;height:8px;border-radius:50%;background:#b9e3a0;box-shadow:0 0 0 4px rgba(185,227,160,.25)}',
      '.kc-hero h2{margin:18px 0 10px;font-size:38px;line-height:1.12;font-weight:700;color:#fff;letter-spacing:-.01em}',
      '.kc-hero p{margin:0;max-width:620px;font-size:17px;line-height:1.55;color:#e6efe2}',
      '.kc-compliment{margin-top:18px!important;font-style:italic;color:#fff!important;opacity:.95}',
      '.kc-body{padding:32px 44px 40px}',
      '.kc-media{display:grid;grid-template-columns:2fr 1fr;gap:14px;margin:0 0 26px}',
      '.kc-media.one{grid-template-columns:1fr}',
      '.kc-media figure{margin:0;position:relative;border-radius:14px;overflow:hidden;background:#f2f3f0;border:1px solid #e3e6e0}',
      '.kc-media img{display:block;width:100%;height:100%;object-fit:cover;aspect-ratio:3/2}',
      '.kc-media figcaption{position:absolute;left:10px;bottom:10px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#2f332f;background:rgba(255,255,255,.9);padding:5px 9px;border-radius:999px}',
      '.kc-tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 28px}',
      '.kc-tile{border:1px solid #e3e6e0;border-radius:14px;padding:16px 18px;background:#fafbf8}',
      '.kc-tile small{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7b827b;font-weight:700;margin-bottom:6px}',
      '.kc-tile b{display:block;font-size:17px;line-height:1.3;color:#2f332f}',
      '.kc-tile span{display:block;margin-top:4px;font-size:13px;color:#6a716b;line-height:1.4}',
      '.kc-pending{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:#7a5a00;background:#fff3c4;border:1px solid #e2c04a;border-radius:999px;padding:3px 10px}',
      '.kc-mats{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}',
      '.kc-mats img{width:34px;height:34px;border-radius:8px;object-fit:cover;border:1px solid #d9ddd6}',
      '.kc-steps-title{font-size:12px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#477448;margin:0 0 12px}',
      '.kc-steps{list-style:none;margin:0 0 30px;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;counter-reset:kc}',
      '.kc-steps li{counter-increment:kc;position:relative;padding:16px 16px 16px 58px;border-radius:14px;background:#f4f7f1;font-size:14px;line-height:1.45;color:#3a3f3a}',
      '.kc-steps li:before{content:counter(kc);position:absolute;left:16px;top:16px;width:30px;height:30px;border-radius:50%;background:#477448;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:14px}',
      '.kc-steps li b{display:block;color:#2f332f;margin-bottom:2px}','.kc-steps li a{color:#477448;font-weight:600}',
      '.kc-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;padding-top:22px;border-top:1px solid #e9ece6}',
      '.kc-foot p{margin:0;font-size:14px;color:#6a716b;line-height:1.5}',
      '.kc-call{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:12px;background:#477448;color:#fff!important;font-weight:700;text-decoration:none!important;font-size:15px}',
      '.kc-call:hover{background:#3b633c}',
      '@media(max-width:767px){.kc-success{margin:12px 0 32px;border-radius:16px}.kc-hero{padding:30px 22px 26px}.kc-hero h2{font-size:28px}.kc-hero p{font-size:15px}.kc-body{padding:22px 18px 28px}.kc-media,.kc-tiles,.kc-steps{grid-template-columns:1fr}.kc-foot{flex-direction:column;align-items:stretch}.kc-call{justify-content:center}}'
    ].join('');
    document.head.appendChild(st);
  }

  function aiImageSrc(page) {
    var imgs = page.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) { var s = imgs[i].currentSrc || imgs[i].src || ''; if (/^(data:image|blob:)/.test(s) && imgs[i].naturalWidth >= 400) return s; }
    return '';
  }

  function successHtml(found, payload, number) {
    var first = clean(payload.contact.name).split(' ')[0];
    var name = KNAME[found.k.id] || 'кухня';
    var ai = aiImageSrc(found.page), sk = payload.sketchImage || '';
    var media = '';
    if (ai || sk) {
      media = '<div class="kc-media' + (ai && sk ? '' : ' one') + '">' +
        (ai ? '<figure><img src="' + esc(ai) + '" alt="AI визуализация"><figcaption>AI визуализация</figcaption></figure>' : '') +
        (sk ? '<figure><img src="' + esc(sk) + '" alt="3D скица"><figcaption>' + 'Вашата' + ' скица</figcaption></figure>' : '') + '</div>';
    }
    var m = payload.meeting || {}, meet, meetNote;
    if (m.date && m.slot) { meet = niceDate(m.date) + ', ' + m.slot; meetNote = '<em class="kc-pending">чака потвърждение по телефона</em>'; }
    else if (m.custom) { meet = m.custom; meetNote = '<span>Ще ' + 'Ви' + ' се обадим, за да уточним точния час.</span>'; }
    else { meet = 'Ще уговорим удобен час'; meetNote = '<span>Ще ' + 'Ви' + ' се обадим.</span>'; }
    var mats = payload.materials || {}, thumbs = '';
    ['upper', 'lower', 'countertop', 'backsplash'].forEach(function (r) { if (mats[r] && mats[r].image) thumbs += '<img src="' + esc(mats[r].image) + '" alt="' + esc(mats[r].label) + '" title="' + esc(mats[r].label) + '">'; });
    var email = clean(payload.contact.email);
    var T = {
      thanks: 'Благодарим Ви' + (first ? ', ' + esc(first) : '') + '!',
      lead: 'Вашата кухня вече е при нас — с размерите, шкафовете, материалите и визуализацията, точно както я подредихте.',
      compl: 'Подбрали сте я с вкус и с мисъл за всеки ден в нея. Оттук нататък мечтата Ви е в сигурни ръце.',
      s1: 'Обаждаме се', s1t: 'за да потвърдим часа за среща.', s2: 'Среща в офиса', s2t: OFFICE, s3: 'Проект и оферта', s3t: 'Получавате точен проект и цена.',
      copy: email ? 'Изпратихме копие на заявката на <b>' + esc(email) + '</b>.' : 'Ще се свържем с Вас съвсем скоро.', call: 'Ако имате допълнителни въпроси — свържете се с нас'
    };
    return '<div class="kc-success">' +
      '<div class="kc-hero"><div class="kc-kicker"><i></i>Заявката е изпратена<span class="kc-num">' + (number ? ' · ' + esc(number) : '') + '</span></div>' +
      '<h2>' + T.thanks + '</h2><p>' + T.lead + '</p><p class="kc-compliment">' + T.compl + '</p></div>' +
      '<div class="kc-body">' + media +
      '<div class="kc-tiles">' +
        '<div class="kc-tile"><small>Среща</small><b>' + esc(meet) + '</b>' + meetNote + '</div>' +
        '<div class="kc-tile"><small>Номер на заявката</small><b class="kc-num-big">' + (number ? esc(number) : '…') + '</b><span>' + 'Посочете го' + ', ако ни се обаждате.</span></div>' +
        '<div class="kc-tile"><small>Материали</small><b>' + (thumbs ? 'Избрани' : 'Ще ги уточним') + '</b>' + (thumbs ? '<div class="kc-mats">' + thumbs + '</div>' : '<span>Ще ' + 'Ви' + ' покажем мостри.</span>') + '</div>' +
      '</div>' +
      '<div class="kc-steps-title">Какво следва</div><ol class="kc-steps">' +
        '<li><b>' + T.s1 + '</b>' + T.s1t + '</li><li><b>' + T.s2 + '</b>' + T.s2t + '</li><li><b>' + T.s3 + '</b>' + T.s3t + '</li></ol>' +
      '<div class="kc-foot"><p>' + T.copy + '<br>' + T.call + ':</p><a class="kc-call" href="tel:+359878861059">☎ +359 878 861 059</a></div>' +
      '</div></div>';
  }

  function showSuccess(form, found, payload) {
    var tries = 0;
    (function wait() {
      var b = form.closest('.w-form'), done = b && b.querySelector('.w-form-done');
      if (done && getComputedStyle(done).display !== 'none') {
        successCss();
        done.classList.add('kc-done');
        done.innerHTML = successHtml(found, payload, payload.__number || '');
        try { done.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { done.scrollIntoView(); }
        return;
      }
      if (++tries < 80) setTimeout(wait, 150);
    })();
  }

  function setNumber(form, number) {
    var b = form.closest('.w-form'), done = b && b.querySelector('.w-form-done.kc-done');
    if (!done) return false;
    done.querySelectorAll('.kc-num').forEach(function (e) { e.textContent = ' · ' + number; });
    done.querySelectorAll('.kc-num-big').forEach(function (e) { e.textContent = number; });
    return true;
  }

  // booking calendar colours (all three kitchens): waiting for a phone confirmation = yellow, confirmed = red,
  // the visitor's own pick = green with "Вашият час"; the other slots locked after this browser's request stay grey
  function slotColours() {
    if (document.getElementById('kitchen-slot-colours')) return;
    var st = document.createElement('style'); st.id = 'kitchen-slot-colours';
    st.textContent =
      '.booking-slot.is-pending{background:#fff3c4!important;border-color:#e2c04a!important;color:#7a5a00!important;cursor:not-allowed!important}' +
      '.booking-slot.is-local-locked:not(.active):not(.is-pending):not(.is-booked){opacity:.45!important;cursor:not-allowed!important}' +
      '.booking-slot.is-booked{background:#fde2df!important;border-color:#e39a92!important;color:#9b1c10!important;cursor:not-allowed!important;text-decoration:line-through}' +
      '.booking-slot.is-pending::after{content:" · чака";font-size:.85em}.booking-slot.is-booked::after{content:" · зает";font-size:.85em}' +
      '.booking-slot.active::after{content:"' + 'Вашият час' + '";display:block;font-size:.78em;font-weight:600;opacity:.9;margin-top:2px}' +
      '.booking-wrap.kc-merged{display:grid!important;grid-template-columns:repeat(var(--kc-cols,2),minmax(0,1fr))!important;gap:var(--kc-gap,10px)!important;align-items:stretch}' +
      '.booking-wrap.kc-merged>.booking-days{display:contents!important}' +
      '.booking-wrap.kc-merged>.kc-custom{margin:0!important;width:auto!important;max-width:none!important;grid-column:auto!important}' +
      '.booking-wrap.kc-merged>.kc-custom input{width:100%!important;box-sizing:border-box!important}';
    document.head.appendChild(st);
  }

  // "Не намирате удобен час? Посочете друг:" becomes one more card in the days grid (same look, same columns)
  function mergeCustomCard(page) {
    var wrap = page.querySelector('.booking-wrap'), days = wrap && wrap.querySelector(':scope > .booking-days');
    if (!wrap || !days) return false;
    var custom = null;
    [].forEach.call(wrap.children, function (c) { if (c !== days && /удобен час|друг/i.test(c.textContent || '')) custom = c; });
    if (!custom) return false;
    var day = days.querySelector('.booking-day');
    function apply() {
      wrap.classList.remove('kc-merged');
      if (!days.offsetParent) return;   // final step not shown yet: measure when it is
      var cs = getComputedStyle(days), n = cs.gridTemplateColumns.split(' ').filter(Boolean).length || 1;
      wrap.style.setProperty('--kc-cols', String(n));
      wrap.style.setProperty('--kc-gap', cs.rowGap && cs.rowGap !== 'normal' ? cs.rowGap : '10px');
      if (day && !custom.classList.contains('booking-day')) {
        var d = getComputedStyle(day);
        ['background', 'border', 'borderRadius', 'padding', 'boxShadow'].forEach(function (k) { custom.style[k] = d[k]; });
      }
      custom.classList.add('kc-custom');
      wrap.classList.add('kc-merged');
    }
    apply();
    var t = 0; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(apply, 120); });
    page.addEventListener('click', function () { setTimeout(function () { if (!wrap.classList.contains('kc-merged')) apply(); }, 60); }, true);
    return true;
  }

  // "Кога планирате?" → "Кога планирате поръчката?", right under the slots and above the contacts / send card
  function planCard(page) {
    var card = page.querySelector('[class*="plan-card"]'), slots = page.querySelector('.final-content');
    if (!card || !slots) return;
    var t = card.querySelector('.question-title'), leaf = t && (t.querySelector('div') || t);
    if (leaf && leaf.textContent.trim() !== 'Кога планирате поръчката?') leaf.textContent = 'Кога планирате поръчката?';
    if (slots.nextElementSibling !== card) slots.parentNode.insertBefore(card, slots.nextElementSibling);
  }


  // The site talks to the client formally ("Вие"). Some texts on the pages (Webflow and older scripts) are in "ти":
  // they are rewritten here, also when they appear later (summary, editor, AI box).
  var POLITE = [
    ['Виж кухнята си като реална визия', 'Вижте кухнята си като реална визия'],
    ['Искаш промяна по визуализацията?', 'Искате промяна по визуализацията?'],
    ['Опиши само какво искаш да се промени.', 'Опишете само какво искате да се промени.'],
    ['Направи корекция', 'Направете корекция'],
    ['Не намираш удобен час? Посочи друг:', 'Не намирате удобен час? Посочете друг:'],
    ['Покажи ни посоката, която търсиш, и остави удобен начин за връзка.', 'Покажете ни посоката, която търсите, и оставете удобен начин за връзка.'],
    ['Избери какво те привлича най-много.', 'Изберете какво Ви привлича най-много.'],
    ['и ще получиш идея', 'и ще получите идея'],
    ['Можеш да избереш една, две или три стени', 'Можете да изберете една, две или три стени'],
    ['Избери вариант, за да продължим.', 'Изберете вариант, за да продължим.'],
    ['Ако искаш промяна, обади се.', 'Ако искате промяна, обадете се.'],
    ['Избери материал за', 'Изберете материал за'],
    ['Добави материал', 'Добавете материал'],
    ['смени на чекмеджета:', 'смяна на чекмеджета:'],
    ['чекмеджета – смени на:', 'чекмеджета – смяна на:'],
    ['Направи витрина', 'Направете витрина'],
    ['Завърти 90°', 'Завъртете на 90°'],
    ['Върни на мястото', 'Върнете на мястото'],
    ['Ако вече имаш точен декор, код или материал', 'Ако вече имате точен декор, код или материал'],
    ['Например: Добави една витрина с осветление в десния край и не променяй останалите шкафове.', 'Например: добавете една витрина с осветление в десния край и не променяйте останалите шкафове.'],
    ['Затвори конфигуратора', 'Затваряне на конфигуратора']
  ];
  var POLITE_WHOLE = { 'Продължи': 'Продължете', 'Покажи още': 'Покажете още', 'Затвори': 'Затваряне', 'Кога планираш?': 'Кога планирате поръчката?', 'Кога планираш поръчката?': 'Кога планирате поръчката?' };
  function politeText(v) {
    if (!v) return v;
    var t = v.trim();
    if (POLITE_WHOLE[t]) return v.replace(t, POLITE_WHOLE[t]);
    for (var i = 0; i < POLITE.length; i++) if (v.indexOf(POLITE[i][0]) >= 0) v = v.split(POLITE[i][0]).join(POLITE[i][1]);
    return v;
  }
  function politeNode(root) {
    if (!root) return;
    if (root.nodeType === 3) { var nv = politeText(root.nodeValue); if (nv !== root.nodeValue) root.nodeValue = nv; return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(root.tagName)) return;
    ['placeholder', 'aria-label', 'title', 'value'].forEach(function (a) {
      if (a === 'value' && !(root.tagName === 'INPUT' && /^(submit|button)$/i.test(root.type))) return;
      var v = root.getAttribute(a); if (v) { var nv2 = politeText(v); if (nv2 !== v) root.setAttribute(a, nv2); }
    });
    if (root.tagName === 'TEXTAREA') { var ph = root.getAttribute('placeholder'); if (ph) { var np = politeText(ph); if (np !== ph) root.setAttribute('placeholder', np); } return; }
    for (var c = root.firstChild; c; c = c.nextSibling) politeNode(c);
  }
  function politePage(page) {
    politeNode(page);
    var busy = false;
    new MutationObserver(function (list) {
      if (busy) return; busy = true;
      list.forEach(function (m) {
        if (m.type === 'characterData') politeNode(m.target);
        else if (m.type === 'attributes') politeNode(m.target);
        else m.addedNodes.forEach(politeNode);
      });
      busy = false;
    }).observe(page, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
  }


  // Card titles like Права: the left card is titled "Преглед на кухнята" ("Скица" on the sizes step),
  // in the same type as the step heading of the right card (Red Hat Display 24/600, left, no bar)
  function sketchTitles() {
    if (!document.getElementById('kc-titles-css')) {
      var st = document.createElement('style'); st.id = 'kc-titles-css';
      st.textContent = '.flow-aglova .prava-preview-card>.combo-title,.sf-page-p .p-sketch-title{font-family:"Red Hat Display",sans-serif!important;font-size:24px!important;font-weight:600!important;line-height:30px!important;color:#333533!important;background:transparent!important;text-align:left!important;text-transform:none!important;letter-spacing:normal!important;padding:32px 0 20px!important;margin:0!important;border-radius:0!important;box-shadow:none!important;width:auto!important}' +
        '@media(max-width:767px){.flow-aglova .prava-preview-card>.combo-title,.sf-page-p .p-sketch-title{font-size:20px!important;line-height:26px!important;padding:16px 0 12px!important}}';
      document.head.appendChild(st);
    }
    var t = document.querySelector('.flow-aglova .prava-preview-card>.combo-title,.sf-page-p .p-sketch-title');
    if (!t) return;
    var h = [].filter.call(document.querySelectorAll('.ag-step-heading,.p-step-heading'), function (e) { return e.offsetParent; })[0];
    var want = h && h.textContent.trim() === 'Размери' ? 'Скица' : 'Преглед на кухнята';
    if (t.textContent.trim() !== want) t.textContent = want;
  }


  // П-образна: the old "Почти сме готови" block with its own "Напред" sat between the AI step and the booking.
  // It is hidden, and arriving at the last step opens the booking straight away (same checks as that button).
  function pSkipGate() {
    var page = document.querySelector('.sf-page-p'); if (!page) return;
    var st = document.createElement('style'); st.id = 'kc-p-gate';
    st.textContent = '.sf-page-p .seo-text:has(.phase-next-btn[data-next-phase="final-phase"]){display:none!important}';
    document.head.appendChild(st);
    function finalOpen() { var f = page.querySelector('.p-final-phase'); return !!(f && getComputedStyle(f).display !== 'none'); }
    page.addEventListener('p:phase-changed', function (e) {
      var d = e.detail || {}, total = 0;
      page.querySelectorAll('.p-stepnode[data-p-phase]').forEach(function (n) { total = Math.max(total, Number(n.dataset.pPhase) || 0); });
      if (!total || Number(d.step) !== total || finalOpen()) return;
      var btn = page.querySelector('.phase-next-btn[data-next-phase="final-phase"]');
      if (btn) setTimeout(function () { if (!finalOpen()) btn.click(); }, 30);
    });
  }

  function init() {
    slotColours();
    var found = kitchen(); if (!found) return;
    var form = found.page.querySelector('form') || document.querySelector('form'); if (!form || form.dataset.kitchenOrder) return;
    form.dataset.kitchenOrder = '1';
    try { politePage(document.body); } catch (e) { /* wording only */ }
    sketchTitles(); [300, 1500, 4000].forEach(function (ms) { setTimeout(sketchTitles, ms); });
    pSkipGate();
    document.addEventListener('click', function () { setTimeout(sketchTitles, 60); setTimeout(sketchTitles, 400); }, true);
    [0, 600, 1800, 4000].forEach(function (ms) { setTimeout(function () { planCard(found.page); }, ms); });
    found.page.addEventListener('click', function () { setTimeout(function () { planCard(found.page); }, 80); }, true);
    var merged = false;
    [300, 1500, 4000].forEach(function (ms) { setTimeout(function () { if (!merged) merged = mergeCustomCard(found.page); }, ms); });
    var sent = false;
    form.addEventListener('submit', function () {
      if (sent) return;
      var payload; try { payload = build(form, found); } catch (e) { return; }
      if (!payload.contact.email && !payload.contact.phone) return;   // the native validation will stop this one anyway
      sent = true;
      showSuccess(form, found, payload);
      fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!(d && d.ok && d.number)) { sent = false; return; }
          payload.__number = d.number;
          var n = 0; (function put() { if (!setNumber(form, d.number) && ++n < 60) setTimeout(put, 250); })();
        })
        .catch(function () { sent = false; });
    }, true);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
