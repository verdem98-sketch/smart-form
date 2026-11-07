/* "Запазете среща" – standalone booking (first used on /contact-us). Fills the card with id="verde-booking-card"
   (1–2 sentences + a button) and opens a modal with the calendar. Rules: from the 3rd working day after today
   (weekends and Bulgarian holidays skipped – the server decides), two hours a day, seven days with free hours; days
   closed in "Blocked Dates" and hours taken in "Booked Slots" are greyed out. Requests go through
   /contract-automation/api/meeting. Clients are addressed with „Вие“. */
(function () {
  'use strict';
  var API = location.origin + '/contract-automation/api/meeting';
  var card = document.getElementById('verde-booking-card');
  if (!card || card.dataset.ready) return;
  card.dataset.ready = '1';
  var box = null; // the modal's content, created on first open

  var DAY = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function bg(d) { return DAY[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0'); }

  function css() {
    var s = document.createElement('style');
    s.textContent = [
      '#verde-booking-card-wrap{display:block!important}@media(min-width:992px){.worktm-wrap{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px;padding:20px 30px!important;box-sizing:border-box}.worktm-wrap>.worktime,.worktm-wrap>.div-block-83{margin:0!important;width:auto!important;max-width:none!important;min-width:0;left:0!important;position:static!important}.worktm-wrap>.divblock83-mobile{display:none!important}}.vb-card p{font:14px/1.5 Montserrat,Arial,sans-serif;color:#2f332f;margin:0 0 14px}',
      '.vb-card{padding-left:20px}.vb-open{cursor:pointer}',
      '.vb-modal[hidden]{display:none!important}.vb-modal{position:fixed;inset:0;z-index:9999;background:rgba(47,51,47,.6);display:flex;align-items:flex-start;justify-content:center;padding:24px 12px;overflow:auto}',
      '.vb-dialog{position:relative;width:100%;max-width:820px;background:#fff;border-radius:16px;padding:28px 24px;box-shadow:0 20px 60px rgba(0,0,0,.25)}',
      '.vb-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border:0;border-radius:18px;background:#f3f4f1;font:700 18px Arial,sans-serif;color:#2f332f;cursor:pointer}',
      '.vb{font:15px/1.55 Montserrat,Arial,sans-serif;color:#2f332f}',
      '.vb h3{font:700 22px/1.25 Montserrat,Arial,sans-serif;margin:0 0 6px}.vb .vb-sub{color:#6a716b;margin:0 0 18px}',
      '.vb-days{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:0 0 18px}',
      '.vb-day{border:1px solid #e1e4df;border-radius:12px;padding:10px}.vb-day.is-off{opacity:.55}',
      '.vb-date{font-size:12px;font-weight:700;text-transform:capitalize;margin:0 0 8px}',
      '.vb-slot{display:block;width:100%;box-sizing:border-box;margin:0 0 6px;padding:8px 6px;border:1px solid #cfd4cb;border-radius:8px;background:#fff;color:#2f332f;font:600 13px Montserrat,Arial,sans-serif;cursor:pointer;text-align:center}',
      '.vb-slot.is-taken{background:#eef0ec;color:#9aa09a;cursor:not-allowed;text-decoration:line-through}.vb-slot.is-on{background:#477448;border-color:#477448;color:#fff}',
      '.vb-form{display:grid;grid-template-columns:1fr 1fr;gap:12px}.vb-form .full{grid-column:1/-1}',
      '.vb label{display:block;font-size:12px;font-weight:700;margin:0 0 4px}.vb input,.vb select,.vb textarea{width:100%;box-sizing:border-box;border:1px solid #cfd4cb;border-radius:8px;padding:10px 12px;font:14px Montserrat,Arial,sans-serif;color:#2f332f;background:#fff}',
      '.vb textarea{min-height:70px;resize:vertical}.vb-btn{min-height:46px;padding:10px 22px;border:0;border-radius:8px;background:#477448;color:#fff;font:700 15px Montserrat,Arial,sans-serif;cursor:pointer}.vb-btn[disabled]{opacity:.6;cursor:wait}',
      '.vb-pick{font-size:14px;margin:0 0 14px;padding:10px 12px;border-radius:8px;background:#f3f7f2}.vb-msg{margin:12px 0 0;font-size:14px}.vb-msg.err{color:#9b1c10}.vb-ok{padding:18px;border-radius:12px;background:#e3efe3;color:#2f5a30;font-size:15px}',
      '.vb-hp{position:absolute;left:-9999px;opacity:0;height:0;overflow:hidden}',
      '@media(max-width:560px){.vb-form{grid-template-columns:1fr}}'
    ].join('');
    document.head.appendChild(s);
  }

  var picked = null;
  function render(av) {
    var slots = av.slots || ['10:00–12:00', '14:00–16:00'], blocked = av.blocked || [], taken = av.taken || [];
    var takenKey = {}; taken.forEach(function (t) { takenKey[t.date + '|' + t.time] = 1; });
    var isFree = function (d, s) { return blocked.indexOf(d) < 0 && !takenKey[d + '|' + s]; };
    var days = '', cur;
    if (av.startDate && /^\d{4}-\d{2}-\d{2}$/.test(av.startDate)) { var sp = av.startDate.split('-'); cur = new Date(Number(sp[0]), Number(sp[1]) - 1, Number(sp[2]), 12); }
    else { cur = new Date(); cur.setHours(12, 0, 0, 0); cur.setDate(cur.getDate() + 3); }
    var added = 0, guard = 0;
    while (added < (av.daysToShow || 7) && guard++ < 90) {
      var wd = cur.getDay();
      if (wd !== 0 && wd !== 6) {
        var d = iso(cur), anyFree = slots.some(function (s) { return isFree(d, s); });
        days += '<div class="vb-day' + (anyFree ? '' : ' is-off') + '"><div class="vb-date">' + esc(bg(cur)) + '</div>' +
          (blocked.indexOf(d) >= 0 ? '<div style="font-size:12px;color:#6a716b">Няма свободни часове</div>' :
            slots.map(function (s) { var free = isFree(d, s); return '<button type="button" class="vb-slot' + (free ? '' : ' is-taken') + '" data-date="' + d + '" data-slot="' + esc(s) + '"' + (free ? '' : ' disabled') + '>' + esc(s) + '</button>'; }).join('')) + '</div>';
        if (anyFree) added++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    box.innerHTML = '<div class="vb"><h3>Запазете час за среща в офиса</h3><p class="vb-sub">Изберете свободен час – ще се свържем с Вас, за да го потвърдим. Срещите се запазват най-малко 3 работни дни предварително.</p>' +
      '<div class="vb-days">' + days + '</div>' +
      '<div class="vb-pick" data-pick hidden></div>' +
      '<form class="vb-form" novalidate>' +
      '<div><label>Име и фамилия *</label><input name="name" required maxlength="120" autocomplete="name"></div>' +
      '<div><label>E-mail *</label><input name="email" type="email" required maxlength="160" autocomplete="email"></div>' +
      '<div><label>Телефон *</label><input name="phone" type="tel" required maxlength="40" autocomplete="tel"></div>' +
      '<div><label>За какво е срещата</label><select name="topic"><option value="kitchen">Кухня</option><option value="bedroom">Спалня / гардероб</option><option value="other">Друго обзавеждане</option><option value="project">Имам проект от конфигуратора</option></select></div>' +
      '<div class="full"><label>Бележка (по желание)</label><textarea name="note" maxlength="600" placeholder="Размери, идеи, въпроси…"></textarea></div>' +
      '<div class="vb-hp"><label>Website</label><input name="website" tabindex="-1" autocomplete="off"></div>' +
      '<div class="full"><button type="submit" class="vb-btn">Изпратете заявката за среща</button><div class="vb-msg" data-msg></div></div>' +
      '</form></div>';

    var pick = box.querySelector('[data-pick]'), msg = box.querySelector('[data-msg]'), form = box.querySelector('form');
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.vb-slot'); if (!b || b.disabled) return;
      [].forEach.call(box.querySelectorAll('.vb-slot.is-on'), function (x) { x.classList.remove('is-on'); });
      b.classList.add('is-on');
      picked = { date: b.dataset.date, slot: b.dataset.slot };
      var p = picked.date.split('-'); var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
      pick.hidden = false; pick.textContent = 'Избран час: ' + bg(dt) + ', ' + picked.slot;
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      msg.className = 'vb-msg'; msg.textContent = '';
      var f = form.elements;
      if (!picked) { msg.className = 'vb-msg err'; msg.textContent = 'Моля, първо изберете ден и час от календара.'; return; }
      if (!f.name.value.trim()) { msg.className = 'vb-msg err'; msg.textContent = 'Моля, напишете името си.'; f.name.focus(); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) { msg.className = 'vb-msg err'; msg.textContent = 'Моля, напишете валиден e-mail.'; f.email.focus(); return; }
      if (f.phone.value.replace(/\D/g, '').length < 6) { msg.className = 'vb-msg err'; msg.textContent = 'Моля, напишете телефон за връзка.'; f.phone.focus(); return; }
      var btn = form.querySelector('.vb-btn'); btn.disabled = true; btn.textContent = 'Изпращам…';
      fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name.value, email: f.email.value, phone: f.phone.value, topic: f.topic.value, note: f.note.value, website: f.website.value, date: picked.date, slot: picked.slot }) })
        .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Сървърът не отговори (' + r.status + ')' }; }); })
        .then(function (d) {
          if (!d.ok) { msg.className = 'vb-msg err'; msg.textContent = d.error || 'Нещо се обърка. Моля, опитайте отново или ни се обадете.'; btn.disabled = false; btn.textContent = 'Изпратете заявката за среща'; return; }
          try { if (window.fbq) window.fbq('track', 'Schedule'); } catch (x) { /* ignore */ }
          try { if (window.gtag) window.gtag('event', 'meeting_request', { method: 'contact_page' }); } catch (x) { /* ignore */ }
          card.querySelector('.vb-open').textContent = 'Заявката е изпратена ✓';
          box.innerHTML = '<div class="vb"><div class="vb-ok"><b>Благодарим Ви!</b> Получихме заявката ' + esc(d.number || '') + (d.slot === 'conflict' ? '. Избраният час междувременно беше зает – ще се свържем с Вас за друг.' : '. Ще се свържем с Вас, за да потвърдим часа, обикновено до 1 работен ден. Изпратихме Ви и e-mail.') + '</div></div>';
        })
        .catch(function () { msg.className = 'vb-msg err'; msg.textContent = 'Няма връзка със сървъра. Моля, опитайте отново или ни се обадете на 0878 861 059.'; btn.disabled = false; btn.textContent = 'Изпратете заявката за среща'; });
    });
  }

  css();
  card.classList.add('vb-card');
  var wrap = document.getElementById('verde-booking-card-wrap');
  if (wrap && !wrap.querySelector('.time')) { var t = document.createElement('div'); t.className = 'time'; t.textContent = 'Запазете час:'; wrap.insertBefore(t, wrap.firstChild); }
  card.innerHTML = '<p>Изберете удобен ден и час онлайн – без обаждане. Ще потвърдим срещата по e-mail или телефон до 1 работен ден.</p><button type="button" class="vb-open primary-button-black w-button">Запазете час онлайн</button>';
  var modal = null;
  function openModal() {
    if (!modal) {
      modal = document.createElement('div'); modal.className = 'vb-modal'; modal.hidden = true;
      modal.innerHTML = '<div class="vb-dialog" role="dialog" aria-modal="true" aria-label="Запазете час за среща"><button type="button" class="vb-close" aria-label="Затвори">×</button><div class="vb-body"></div></div>';
      document.body.appendChild(modal);
      box = modal.querySelector('.vb-body');
      modal.addEventListener('click', function (e) { if (e.target === modal || e.target.closest('.vb-close')) closeModal(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeModal(); });
      box.innerHTML = '<div class="vb"><p class="vb-sub">Зареждам свободните часове…</p></div>';
      fetch(API + '?availability=1').then(function (r) { return r.json(); })
        .then(function (d) { render(d && (d.ok || d.startDate) ? d : { blocked: [], taken: [] }); })
        .catch(function () { render({ blocked: [], taken: [] }); });
    }
    modal.hidden = false; document.body.style.overflow = 'hidden';
  }
  function closeModal() { if (modal) modal.hidden = true; document.body.style.overflow = ''; }
  card.querySelector('.vb-open').addEventListener('click', openModal);
  // a link anywhere on the site can open the calendar: href="#zapazete-sreshta"
  if (location.hash === '#zapazete-sreshta') openModal();
  document.addEventListener('click', function (e) { var a = e.target.closest('a[href="#zapazete-sreshta"]'); if (a) { e.preventDefault(); openModal(); } });
})();
