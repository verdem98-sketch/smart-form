/* Kitchen configurator step hints ("? Помощ") for the straight / L / U kitchen pages.
   Adds a help button next to the step title in the sticky progress bar; the panel shows
   short tips for the current step, one picture from the guide and a link to the full guide.
   Hints are keyed by the step title text, so the same script serves all three kitchens. */
(function () {
  'use strict';
  var GUIDE = '/kak-raboti-konfiguratora';
  var IMG = 'https://cdn.jsdelivr.net/gh/verdem98-sketch/smart-form@04097c281f090a2d26405d506004c83bcc3438b4/guide/';
  var HINTS = {
    'Размери': { q: 'q07', img: 'v07_sizes.mp4', tips: [
      'Въведете дължината на стената с бутоните „–“ и „+“ за метри и сантиметри.',
      '„Височина на помещението“ е от пода до тавана; „височина на кухнята“ – докъде стигат горните шкафове.',
      'Размерите могат да се променят по всяко време с „← Назад“.'] },
    'Конфигурация': { q: 'q11', img: 'v12_water.mp4', tips: [
      '„Къде е водата“ определя мястото на мивката – ляво, център или дясно, както гледате стената.',
      'Колоната за фурна вдига фурната на удобна височина; при „НЕ“ фурната е под котлоните.',
      'Хладилникът и дълбокият горен ред се редактират по-късно с молива ✎ на скицата.',
      'Островът се появява след като въведете дължина и ширина; мести се с влачене в режим ✎.'] },
    'Скица': { q: 'q17', img: 'v17_help.mp4', tips: [
      '◎ върти кухнята, ✋ мести изгледа, ⌂ връща началния изглед.',
      '✥ – хванете шкаф или уред и го пуснете върху друг, за да ги размените.',
      '✎ – щракнете върху шкаф, за да смените ширина, чекмеджета, витрина или повдигащ механизъм.'] },
    'Горен ред': { q: 'q33', img: 'v33_material.mp4', tips: [
      'Щракнете върху мостра – скицата се оцветява веднага.',
      'Филтрирайте по покритие, производител, категория или плоскост, или търсете по код (например U702).',
      'При дървесни декори изберете посока на шарката – вертикална или хоризонтална.'] },
    'Дълбок горен ред': { q: 'q39', img: 'v15_deep_row.mp4', tips: [
      'Дълбокият ред може да е в различен декор от обикновените горни шкафове.',
      'Височината му се променя с молива ✎ на скицата – плиткият ред под него поема разликата.'] },
    'Долен ред': { q: 'q33', img: 'v36_lower.mp4', tips: [
      'Долният ред може да е в различен декор от горния – изберете мостра и вижте скицата.',
      'Броят чекмеджета на всеки шкаф се сменя с молива ✎ на скицата.'] },
    'Плот': { q: 'q37', img: 'v37_worktop.mp4', tips: [
      'Първо изберете тип плот (термоплот, Slim Line или компактен), после декор.',
      'Търсенето по код или име работи и тук.'] },
    'Гръб': { q: 'q38', img: 'v38_back.mp4', tips: [
      'Гърбът е панелът между плота и горните шкафове – често в същия декор като плота.',
      'Ако ще слагате плочки или стъкло, изберете който и да е – уточняваме при консултацията.'] },
    'Електроуреди': { q: 'q40', img: 'v39_appl.mp4', tips: [
      'Отбележете само уредите, които планирате – вградените се появяват в колоната на скицата.',
      'Съдомиялната (45 или 60 см) се поставя до мивката.'] },
    'Допълнителни екстри': { q: 'q41', img: 'v40_extras.mp4', tips: [
      'Отметнатите екстри се показват на скицата, където е възможно, и влизат в офертата.',
      'Витрини и повдигащи механизми могат да се зададат и за отделен шкаф с молива ✎.'] },
    'AI визуализация': { q: 'q43', img: 'v42_generate.mp4', tips: [
      'Проверете обобщението „Вашият избор“ – „промени избора“ ви връща на съответната стъпка.',
      'Натиснете „Генерирай AI визуализация“ и изчакайте около минута.',
      'Безплатна е една визуализация на ден; офертата не зависи от нея.'] },
    'Последна стъпка': { q: 'q47', img: 'v45_slot.mp4', tips: [
      'Изберете удобен ден и час за консултация или посочете друг в полето под календара.',
      'Попълнете име, имейл и телефон – до 1 работен ден получавате оферта и покана за 3D проект.'] }
  };

  function css() {
    if (document.getElementById('vmh-css')) return;
    var s = document.createElement('style'); s.id = 'vmh-css';
    s.textContent =
      '.vmh-btn{pointer-events:auto !important;position:relative !important;z-index:5 !important;display:inline-flex !important;align-items:center !important;gap:6px !important;margin-left:10px !important;padding:3px 10px !important;border:1px solid #9fb59f !important;border-radius:999px !important;background:#fff !important;color:#23442f !important;font:inherit !important;font-size:12px !important;font-weight:600 !important;line-height:1.4 !important;cursor:pointer !important;white-space:nowrap !important;vertical-align:middle !important;-webkit-text-fill-color:#23442f !important}' +
      '.vmh-btn b{display:inline-flex !important;align-items:center !important;justify-content:center !important;width:18px !important;height:18px !important;border-radius:50% !important;background:#2f4a2a !important;color:#fff !important;-webkit-text-fill-color:#fff !important;font-size:12px !important}' +
      '.vmh-btn.vmh-pulse b{animation:vmh-pulse 1.2s ease-in-out 4}' +
      '@keyframes vmh-pulse{0%,100%{box-shadow:0 0 0 0 rgba(47,74,42,.55)}50%{box-shadow:0 0 0 7px rgba(47,74,42,0)}}' +
      '.vmh-panel{position:fixed;z-index:9999;right:16px;top:120px;width:min(360px,calc(100vw - 32px));max-height:min(75vh,620px);overflow:auto;padding:16px 18px 18px;border:1px solid #d9ddd5;border-radius:14px;background:#fff;box-shadow:0 14px 40px rgba(0,0,0,.18);color:#2f332f;-webkit-text-fill-color:#2f332f;font-size:14px;line-height:1.5}' +
      '.vmh-panel[hidden]{display:none}' +
      '.vmh-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}' +
      '.vmh-head strong{font-size:15px}' +
      '.vmh-x{border:0 !important;background:transparent !important;font-size:22px !important;line-height:1 !important;cursor:pointer !important;color:#666 !important;padding:0 4px !important}' +
      '.vmh-panel ul{margin:0 0 12px !important;padding-left:18px !important;list-style:disc !important}.vmh-panel li{margin:0 0 6px !important;list-style:disc !important;display:list-item !important}' +
      '.vmh-panel video{display:block;width:100%;height:auto;border:1px solid #e3e6e0;border-radius:10px;margin:0 0 12px;background:#f3f4f1}.vmh-panel img{display:block;width:100%;height:auto;border:1px solid #e3e6e0;border-radius:10px;margin:0 0 12px}' +
      '.vmh-panel a.vmh-more{display:inline-block !important;padding:9px 14px !important;border-radius:8px !important;background:#2f4a2a !important;color:#fff !important;-webkit-text-fill-color:#fff !important;font-weight:600 !important;text-decoration:none !important;font-size:13px !important}' +
      '@media (max-width:767px){.vmh-panel{left:12px;right:12px;width:auto;top:auto;bottom:12px;max-height:70vh}.vmh-btn span{display:none}.vmh-btn{padding:3px 6px !important;margin-left:6px !important}}';
    document.head.appendChild(s);
  }

  function init() {
    var head = document.querySelector('.prava-global-progress-head,.ag-global-progress-head,.p-global-progress-head');
    var title = head && head.querySelector('.prava-global-progress-title,.ag-global-progress-title,.p-global-progress-title');
    if (!title || document.getElementById('vmh-btn')) return;
    css();
    var btn = document.createElement('button'); btn.type = 'button'; btn.id = 'vmh-btn'; btn.className = 'vmh-btn';
    btn.innerHTML = '<b>?</b><span>Помощ</span>'; btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'vmh-panel');
    title.parentNode.insertBefore(btn, title.nextSibling);
    var panel = document.createElement('div'); panel.id = 'vmh-panel'; panel.className = 'vmh-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Подсказки за тази стъпка');
    document.body.appendChild(panel);
    try { if (!localStorage.getItem('vmh-seen')) { btn.classList.add('vmh-pulse'); localStorage.setItem('vmh-seen', '1'); } } catch (e) { /* storage unavailable */ }

    function current() { var t = (title.textContent || '').trim(); return HINTS[t] ? t : null; }
    function render() {
      var t = current(); if (!t) { panel.hidden = true; btn.hidden = true; return; }
      btn.hidden = false;
      var h = HINTS[t], extra = (t === 'Конфигурация' || t === 'Размери') ? HINTS['Скица'] : null;
      var html = '<div class="vmh-head"><strong>' + t + ' – подсказки</strong><button type="button" class="vmh-x" aria-label="Затвори">×</button></div><ul>';
      h.tips.forEach(function (x) { html += '<li>' + x + '</li>'; });
      if (extra && t === 'Конфигурация') extra.tips.forEach(function (x) { html += '<li>' + x + '</li>'; });
      html += '</ul>';
      if (h.img && /\.mp4$/.test(h.img)) html += '<video autoplay muted loop playsinline src="' + IMG + h.img + '"></video>';
      else if (h.img) html += '<img loading="lazy" src="' + IMG + h.img + '" alt="">';
      html += '<a class="vmh-more" href="' + GUIDE + '#' + h.q + '" target="_blank" rel="noopener">Пълно ръководство →</a>';
      panel.innerHTML = html;
      panel.querySelector('.vmh-x').addEventListener('click', close);
    }
    function open() { render(); if (btn.hidden) return; panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.classList.remove('vmh-pulse'); }
    function close() { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
    btn.addEventListener('click', function () { panel.hidden ? open() : close(); });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    new MutationObserver(function () { btn.hidden = !current(); if (!panel.hidden) render(); }).observe(title, { childList: true, characterData: true, subtree: true });
    btn.hidden = !current();
  }

  function boot() { var n = 0; (function wait() { if (document.querySelector('.prava-global-progress-title,.ag-global-progress-title,.p-global-progress-title')) { init(); return; } if (++n < 100) setTimeout(wait, 100); })(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
})();
