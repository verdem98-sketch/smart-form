/* Step 2 (dimensions) validation for the straight kitchen: same hint, outline, shake and scroll as step 1.
   Additive module: it runs in the capture phase and only takes over when Next is pressed on step 2 with an empty dimension. */
(function () {
  'use strict';
  function init() {
    var page = document.querySelector('.sf-page-prava');
    if (!page || page.dataset.step2Validation) return;
    page.dataset.step2Validation = '1';
    var header = function () { return page.querySelector('.prava-step-header'); };
    function islandEnabled() {
      var pill = page.querySelector('[data-field="island"] .is-selected,[data-field="island"] .active');
      return !!pill && /^(yes|да)$/i.test(pill.dataset.value || '');
    }
    function keys() { return ['len_prava_3', 'height_prava_3']; }   // the island sizes are checked in step 2 (Конфигурация), next to the island question
    function rowOf(key) { return page.querySelector('.dimension-row[data-dim="' + key + '"]'); }
    function value(row) {
      function n(sel) { var el = row.querySelector(sel + ' .picker-value-text') || row.querySelector(sel + ' .picker-value'); return Number((el && el.textContent) || 0); }
      return n('.meters-control') * 100 + n('.centimeters-control');
    }
    function islandMissing() {   // step 2: the island sizes sit right under the island question
      if (!islandEnabled()) return null;
      return ['island_len_3a', 'island_width_3a'].map(rowOf).find(function (r) { return r && value(r) <= 0; });
    }
    function firstMissing() { return keys().map(rowOf).find(function (r) { return r && value(r) <= 0; }); }
    function clear(row) {
      row.classList.remove('prava-question-invalid', 'prava-question-shake');
      row.removeAttribute('aria-invalid'); row.removeAttribute('aria-describedby');
      var h = row.querySelector(':scope > .question-hint'); if (h) h.hidden = true;
    }
    function clearAll() { page.querySelectorAll('.dimension-row').forEach(clear); }
    function show(row) {
      clearAll();
      var general = page.querySelector('.prava-validation'); if (general) { general.hidden = true; general.textContent = ''; }
      var h = row.querySelector(':scope > .question-hint');
      if (!h) { h = document.createElement('p'); h.className = 'question-hint'; h.id = 'prava-dim-hint-' + row.dataset.dim; h.setAttribute('role', 'alert'); row.append(h); }
      h.textContent = 'Въведете размера, за да продължим.'; h.hidden = false;
      row.classList.add('prava-question-invalid'); row.setAttribute('aria-invalid', 'true'); row.setAttribute('aria-describedby', h.id);
      void row.offsetWidth; row.classList.add('prava-question-shake');
      var hh = header(); row.style.scrollMarginTop = 'calc(var(--prava-sticky-top,128px) + ' + Math.ceil(((hh && hh.getBoundingClientRect().height) || 0) + 12) + 'px)';
      row.scrollIntoView({ behavior: 'auto', block: 'start' });
      if (!row.hasAttribute('tabindex')) row.tabIndex = -1;
      row.focus({ preventScroll: true });
    }
    page.addEventListener('click', function (e) {
      var next = e.target.closest('[data-prava-nav="next"]');
      var st = window.pravaFlow && window.pravaFlow.getStep();
      if (!next || (st !== 1 && st !== 2)) return;
      var missing = st === 1 ? firstMissing() : islandMissing();
      if (!missing) return;
      e.preventDefault(); e.stopImmediatePropagation();
      show(missing);
    }, true);
    page.addEventListener('animationend', function (e) { if (e.animationName === 'prava-config-shake') e.target.classList.remove('prava-question-shake'); });
    ['click', 'input', 'change'].forEach(function (name) {
      page.addEventListener(name, function () {
        setTimeout(function () {
          page.querySelectorAll('.dimension-row.prava-question-invalid').forEach(function (row) { if (value(row) > 0) clear(row); });
        }, 0);
      });
    });
    page.addEventListener('prava:phase-changed', clearAll);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 0); }, { once: true });
  else setTimeout(init, 0);
})();
