/* Meta Pixel for verde-m.com. Loaded site-wide; the pixel id is read from data-pixel on the script tag.
   Events: PageView (all pages); ViewContent + StartConfigurator + AIVisualization on the kitchen configurators;
   Lead when a configurator request is sent (the Webflow success block appears); Contact for any other form. */
(function () {
  'use strict';
  var me = document.currentScript, ID = (me && me.getAttribute('data-pixel')) || '1868462447521447';
  if (window.__vmPixel) return; window.__vmPixel = true;
  /* loads only after the visitor accepts cookies (same rule as GA / Clarity on this site) */
  function consentOk() { try { return localStorage.getItem('cookieConsent') === 'accepted'; } catch (e) { return false; } }
  if (!consentOk()) {
    document.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('[data-cookie-action="accepted"]')) setTimeout(start, 60);
    }, true);
    return;
  }
  start();
  function start() {
  if (window.fbq) return;
  /* standard Meta base code */
  !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', ID);
  fbq('track', 'PageView');

  function kitchen() {
    if (document.querySelector('.sf-page-prava')) return 'prava';
    if (document.querySelector('.flow-aglova, .sf-page-aglova')) return 'aglova';
    if (document.querySelector('.sf-page-p')) return 'p';
    return null;
  }
  var sent = {};
  function once(name, data, custom) { if (sent[name]) return; sent[name] = true; fbq(custom ? 'trackCustom' : 'track', name, data || {}); }

  function init() {
    var k = kitchen(), pg = document.querySelector('.sf-page-prava, .flow-aglova, .sf-page-aglova, .sf-page-p') || document;
    if (k) {
      fbq('track', 'ViewContent', { content_name: 'kitchen-configurator', content_category: k });
      /* step 2 reached = the visitor really started configuring */
      pg.addEventListener('prava:phase-changed', function (e) { if (e.detail && e.detail.step >= 2) once('StartConfigurator', { kitchen: k }, true); });
      pg.addEventListener('ag:phase-changed', function (e) { if (e.detail && e.detail.step >= 2) once('StartConfigurator', { kitchen: k }, true); });
      pg.addEventListener('p:phase-changed', function (e) { if (e.detail && e.detail.step >= 2) once('StartConfigurator', { kitchen: k }, true); });
      ['prava-ai-generated', 'ag-ai-generated', 'aglova-ai-generated', 'p-ai-generated'].forEach(function (n) { pg.addEventListener(n, function () { once('AIVisualization', { kitchen: k }, true); }); });
    }
    /* a form was sent: Webflow shows .w-form-done */
    function check() {
      document.querySelectorAll('.w-form-done').forEach(function (el) {
        if (el.__vmSeen) return;
        if (el.offsetParent !== null || getComputedStyle(el).display !== 'none') {
          el.__vmSeen = true;
          if (k) once('Lead', { content_name: 'kitchen-request', content_category: k }); else once('Contact', { content_name: location.pathname });
        }
      });
    }
    new MutationObserver(check).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['style', 'class'], childList: true });
    check();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
  }
})();
