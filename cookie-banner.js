/* Site-wide cookie banner, premium look. Replaces the look of the Webflow banner but keeps its mechanics: the
   buttons carry data-cookie-action, so the consent script in the site footer (localStorage "cookieConsent",
   Google consent mode, html.cookie-ok) keeps working unchanged; window.openCookieBanner() shows it again. */
(function () {
  'use strict';
  if (document.getElementById('vcb')) return;
  var consent = null;
  try { consent = localStorage.getItem('cookieConsent'); } catch (e) { /* ignore */ }

  var css = document.createElement('style');
  css.textContent = [
    '[data-cookie-banner="1"]{display:none!important}',
    'html.cookie-ok #vcb{display:none!important}',
    '#vcb{position:fixed;left:20px;bottom:20px;z-index:99999;width:min(420px,calc(100vw - 40px));box-sizing:border-box;padding:22px 22px 18px;background:#fff;border-radius:18px;box-shadow:0 24px 60px rgba(20,20,20,.22),0 2px 8px rgba(20,20,20,.08);font:14px/1.55 Montserrat,Arial,sans-serif;color:#2f332f;animation:vcb-in .55s cubic-bezier(.2,.8,.2,1) both}',
    '@keyframes vcb-in{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}',
    '#vcb .vcb-head{display:flex;align-items:center;gap:12px;margin:0 0 10px}',
    '#vcb .vcb-ico{flex:0 0 40px;width:40px;height:40px;border-radius:12px;background:#eef4ee;display:grid;place-items:center}',
    '#vcb h4{font:700 16px/1.25 Montserrat,Arial,sans-serif;margin:0;color:#141414}',
    '#vcb p{margin:0 0 16px;font-size:13.5px;color:#555c56}',
    '#vcb .vcb-acts{display:flex;gap:10px;align-items:center}',
    '#vcb .vcb-btn{flex:1 1 0;display:inline-block;text-align:center;padding:12px 14px;border-radius:10px;font:700 13px/1 Montserrat,Arial,sans-serif;letter-spacing:.02em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:all .25s;border:1.5px solid #141414;box-sizing:border-box}',
    '#vcb .vcb-ok{background:#141414;color:#fff}#vcb .vcb-ok:hover{background:#477448;border-color:#477448}',
    '#vcb .vcb-no{background:#fff;color:#141414}#vcb .vcb-no:hover{background:#f3f4f1}',
    '#vcb .vcb-foot{margin:12px 0 0;font-size:12px;color:#8a908a}#vcb .vcb-foot a{color:#477448;text-decoration:underline}',
    '@media(max-width:560px){#vcb{left:10px;right:10px;bottom:10px;width:auto;padding:18px 16px 14px}#vcb .vcb-acts{flex-direction:column-reverse}#vcb .vcb-btn{width:100%}}'
  ].join('');
  document.head.appendChild(css);

  var b = document.createElement('div');
  b.id = 'vcb'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Бисквитки');
  b.innerHTML =
    '<div class="vcb-head"><div class="vcb-ico"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#477448" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5z"/><circle cx="8.5" cy="10.5" r="1"/><circle cx="12" cy="15.5" r="1"/><circle cx="15.5" cy="12.5" r="1"/></svg></div><h4>Малко бисквитки, по-добър сайт</h4></div>' +
    '<p>Използваме бисквитки, за да работи конфигураторът безпроблемно, да разбираме кое Ви е полезно и да подобряваме сайта. Без реклами, без продажба на данни.</p>' +
    '<div class="vcb-acts"><a href="#" class="vcb-btn vcb-no" data-cookie-action="declined">Само необходимите</a><a href="#" class="vcb-btn vcb-ok" data-cookie-action="accepted">Приемам всички</a></div>' +
    '<p class="vcb-foot">Можете да промените избора си по всяко време. <a href="/privacy-policy">Политика за поверителност</a></p>';
  document.body.appendChild(b);
})();
