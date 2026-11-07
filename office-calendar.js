/* /verde-office: "Календар" tab — the meeting calendar the site uses (configurator + Контакти), six weeks ahead.
   The owner sees every hour (free / waiting / taken, with who), blocks an hour for a meeting arranged by phone,
   frees it again, and closes whole days (Blocked Dates). Holidays are closed automatically.
   Data comes from /contract-automation/api/meeting with the office key. Adds its own tab next to the existing ones. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/meeting';
  var DAY = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var MONTH = ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  function parse(iso) { var p = iso.split('-'); return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12); }
  function toIso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function label(iso) { var d = parse(iso); return DAY[d.getDay()] + ' ' + d.getDate() + ' ' + MONTH[d.getMonth()]; }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '.vc{font:14px/1.55 Montserrat,Arial,sans-serif;color:#2f332f}.vc .va-card{background:#fff;border:1px solid #e1e4df;border-radius:14px;padding:18px;margin:0 0 16px}',
      '.vc h3{font:700 15px/1.3 Montserrat,Arial,sans-serif;margin:0 0 4px}.vc .va-sub{color:#6a716b;font-size:13px;margin:0 0 12px}.vc .va-err{color:#9b1c10}.vc .va-muted{color:#6a716b;font-size:13px}',
      '.vc .va-btn{min-height:34px;padding:6px 12px;border:1px solid #cfd4cb;border-radius:8px;background:#fff;color:#2f332f;font:600 13px Montserrat,Arial,sans-serif;cursor:pointer}.vc .va-btn[disabled]{opacity:.5;cursor:wait}',
      '.vc-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#6a716b;margin:0 0 12px}.vc-legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:4px}',
      '.vc-week{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:0 0 8px}',
      '.vc-day{border:1px solid #e1e4df;border-radius:12px;padding:8px;min-height:96px}.vc-day.is-closed{background:#f3f4f1}.vc-day.is-past{opacity:.45}.vc-day.is-early{background:#fbfbfa}',
      '.vc-date{font-size:12px;font-weight:700;margin:0 0 6px;display:flex;justify-content:space-between;align-items:center}.vc-date button{border:0;background:none;color:#6a716b;font-size:11px;cursor:pointer;padding:0}',
      '.vc-slot{display:block;width:100%;box-sizing:border-box;text-align:left;margin:0 0 5px;padding:5px 7px;border:1px solid #cfd4cb;border-radius:7px;background:#fff;font:600 12px/1.3 Montserrat,Arial,sans-serif;color:#2f332f;cursor:pointer}',
      '.vc-slot small{display:block;font-weight:500;color:#6a716b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.vc-slot.free{border-style:dashed}.vc-slot.pending{background:#fff4d6;border-color:#e3c27a}.vc-slot.booked{background:#e3efe3;border-color:#9fc29f}.vc-slot.phone{background:#e4e9f5;border-color:#9fb0d6}',
      '.vc-closed{font-size:12px;color:#6a716b}.vc-today{font-size:12px;color:#6a716b;margin:0 0 10px}',
      '.vc table{width:100%;border-collapse:collapse;font-size:13px}.vc th,.vc td{text-align:left;padding:6px;border-bottom:1px solid #eef0ec;vertical-align:top}.vc th{color:#6a716b;font-weight:600}',
      '@media(max-width:700px){.vc-week{grid-template-columns:repeat(2,1fr)}}'
    ].join('');
    document.head.appendChild(s);
  }

  function call(body) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Office-Key': window.__verdeOfficeKey || '' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + r.status + ')' }; }); });
  }

  function start(panel) {
    var state = null, busy = false;

    function render(msg, isErr) {
      var d = state;
      if (!d) { panel.innerHTML = '<div class="vc"><div class="va-card"><p class="va-err">' + esc(msg || 'Няма данни') + '</p></div></div>'; return; }
      var takenKey = {}; d.taken.forEach(function (t) { takenKey[t.date + '|' + t.time] = t; });
      var blockedKey = {}; d.blockedDays.forEach(function (b) { blockedKey[b.date] = b; });
      var holiday = {}; d.holidays.forEach(function (h) { holiday[h] = 1; });
      var meetingKey = {}; d.meetings.forEach(function (m) { meetingKey[m.date + '|' + m.time] = m; });
      var todayIso = d.from;
      var cur = parse(d.from);
      // back to Monday of this week
      cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
      var weeks = '';
      for (var w = 0; w < 6; w++) {
        var cells = '';
        for (var i = 0; i < 5; i++) {
          var iso = toIso(cur);
          var past = iso < todayIso, early = !past && iso < d.startDate, closed = blockedKey[iso], hol = holiday[iso];
          var cls = 'vc-day' + (past ? ' is-past' : '') + (closed || hol ? ' is-closed' : '') + (early ? ' is-early' : '');
          var head = '<div class="vc-date"><span>' + esc(label(iso)) + '</span>' + (past ? '' : closed ? '<button type="button" data-act="unblock_day" data-id="' + esc(closed.id) + '" title="Отвори деня">отвори</button>' : hol ? '' : '<button type="button" data-act="block_day" data-date="' + iso + '" title="Затвори целия ден">затвори</button>') + '</div>';
          var body;
          if (hol) body = '<div class="vc-closed">Официален празник</div>';
          else if (closed) body = '<div class="vc-closed">Затворено' + (closed.name && !/^Затворено/.test(closed.name) ? ': ' + esc(closed.name) : '') + '</div>';
          else body = d.slots.map(function (s) {
            var t = takenKey[iso + '|' + s], m = meetingKey[iso + '|' + s];
            if (!t) return past ? '<div class="vc-slot free" style="cursor:default">' + esc(s) + '<small>свободен</small></div>' : '<button type="button" class="vc-slot free" data-act="block" data-date="' + iso + '" data-slot="' + esc(s) + '">' + esc(s) + '<small>свободен – блокирай</small></button>';
            var phone = /^Телефон:/.test(t.name);
            var who = m ? m.name + (m.phone ? ' · ' + m.phone : '') + ' (' + m.topic + ')' : t.name;
            var k = phone ? 'phone' : t.status === 'booked' ? 'booked' : 'pending';
            return '<button type="button" class="vc-slot ' + k + '" data-act="unblock" data-id="' + esc(t.id) + '" data-who="' + esc(who) + '" title="Освободи часа">' + esc(s) + '<small>' + esc((k === 'pending' ? 'чака: ' : k === 'phone' ? '' : 'потвърден: ') + who) + '</small></button>';
          }).join('');
          cells += '<div class="' + cls + '">' + head + body + '</div>';
          cur.setDate(cur.getDate() + 1);
        }
        cur.setDate(cur.getDate() + 2);
        weeks += '<div class="vc-week">' + cells + '</div>';
      }
      var pendingMeetings = d.meetings.filter(function (m) { return m.status === 'pending'; });
      panel.innerHTML = '<div class="vc"><div class="va-card"><h3>Календар на срещите</h3><p class="va-sub">Същият календар, който виждат клиентите в конфигуратора и в „Контакти“. Клиентите могат да запазват от <b>' + esc(label(d.startDate)) + '</b> нататък (3 работни дни напред). ' +
        'Цъкни свободен час, за да го блокираш за среща, уговорена по телефона; цъкни зает час, за да го освободиш. „затвори“ спира целия ден (отпуск, ремонт). Промените са веднага на сайта.</p>' +
        '<div class="vc-legend"><span><i style="background:#fff;border:1px dashed #cfd4cb"></i>свободен</span><span><i style="background:#fff4d6"></i>чака потвърждение</span><span><i style="background:#e3efe3"></i>потвърден</span><span><i style="background:#e4e9f5"></i>по телефона</span><span><i style="background:#f3f4f1"></i>затворен ден / празник</span></div>' +
        '<div class="sp-acts" style="display:flex;gap:8px;align-items:center"><button type="button" class="va-btn" data-act="reload">↻ Обнови</button>' + (msg ? '<span class="' + (isErr ? 'va-err' : 'va-muted') + '">' + esc(msg) + '</span>' : '') + '</div></div>' +
        '<div class="va-card">' + weeks + '</div>' +
        (pendingMeetings.length ? '<div class="va-card"><h3>Заявки от „Контакти“, които чакат потвърждение</h3><p class="va-sub">Потвърждаваш ги от бутона в мейла – там клиентът получава и e-mail. Тук само ги виждаш.</p><table><tr><th>Кога</th><th>Кой</th><th>Тема</th></tr>' +
          pendingMeetings.map(function (m) { return '<tr><td>' + esc(label(m.date)) + ', ' + esc(m.time) + '</td><td>' + esc(m.name) + '<br><span class="va-muted">' + esc(m.email) + (m.phone ? ' · ' + esc(m.phone) : '') + '</span></td><td>' + esc(m.topic) + '</td></tr>'; }).join('') + '</table></div>' : '') + '</div>';
    }

    function act(body, okMsg) {
      if (busy) return; busy = true;
      [].forEach.call(panel.querySelectorAll('button'), function (b) { b.disabled = true; });
      return call(body).then(function (d) {
        if (d.ok) state = d;
        render(d.ok ? okMsg : (d.error || 'Грешка'), !d.ok);
      }).catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); }).then(function () { busy = false; });
    }

    panel.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      var a = b.dataset.act;
      if (a === 'reload') return act({ action: 'calendar' }, 'Обновено.');
      if (a === 'block') {
        var who = prompt('Блокирай ' + label(b.dataset.date) + ', ' + b.dataset.slot + ' за среща по телефона.\nИме на клиента (по желание):', '');
        if (who === null) return;
        return act({ action: 'block', date: b.dataset.date, slot: b.dataset.slot, name: who }, 'Часът е блокиран.');
      }
      if (a === 'unblock') { if (!confirm('Да освободя ли този час?\n' + (b.dataset.who || ''))) return; return act({ action: 'unblock', id: b.dataset.id }, 'Часът е свободен.'); }
      if (a === 'block_day') {
        var why = prompt('Затвори целия ден ' + label(b.dataset.date) + '. Причина (по желание):', '');
        if (why === null) return;
        return act({ action: 'block_day', date: b.dataset.date, name: why }, 'Денят е затворен.');
      }
      if (a === 'unblock_day') { if (!confirm('Да отворя ли този ден отново?')) return; return act({ action: 'unblock_day', id: b.dataset.id }, 'Денят е отворен.'); }
    });

    panel.innerHTML = '<div class="vc"><div class="va-card"><p class="va-muted" style="margin:0">Зареждам календара…</p></div></div>';
    call({ action: 'calendar' }).then(function (d) { if (!d.ok) return render(d.error || 'Грешка', true); state = d; render(); })
      .catch(function (e) { render('Няма връзка със сървъра: ' + e.message, true); });
  }

  function mount(bar) {
    if (bar.querySelector('[data-tab="calendar"]')) return;
    var shell = bar.parentElement;
    var tab = el('button', 'vo-tab', 'Календар'); tab.type = 'button'; tab.setAttribute('data-tab', 'calendar');
    bar.appendChild(tab);
    var panel = el('div', 'vc-panel'); panel.hidden = true; shell.appendChild(panel);
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
