/* Kitchen configurators (Права / Ъглова / П-образна), step 1:
   the existing height becomes "Височина на помещението" and a second row "Височина на кухнята" is added under it
   (top of the tall units and of the upper row). The sketches read it as kitchen_height_* ; it may not exceed the room. */
(function () {
  'use strict';
  var KITCHENS = [
    { page: '.sf-page-prava', room: 'height_prava_3', id: 'kitchen_height_prava', refresh: 'pravaLayout' },
    { page: '.flow-aglova', room: 'visochina_aglova', id: 'kitchen_height_aglova', refresh: 'agLayout' },
    { page: '.sf-page-p', room: 'visochina_p', id: 'kitchen_height_p', refresh: 'pLayout' }
  ];
  var ROOM_LABEL = 'Височина на помещението', KITCHEN_LABEL = 'Височина на кухнята';
  var NEXT = '[data-prava-nav="next"],[data-ag-nav="next"],[data-p-nav="next"]';

  function rowOf(page, key) { return page.querySelector('.dimension-row[data-dim="' + key + '"]'); }
  function part(row, sel) { var c = row.querySelector(sel); return c && (c.querySelector('.picker-value-text') || c.querySelector('.picker-value')); }
  function valueCm(row) {
    if (!row) return 0;
    var m = part(row, '.meters-control'), c = part(row, '.centimeters-control');
    return (Number(m && m.textContent) || 0) * 100 + (Number(c && c.textContent) || 0);
  }
  function setCm(row, cm) {
    cm = Math.max(0, cm);
    var m = part(row, '.meters-control'), c = part(row, '.centimeters-control');
    if (m) m.textContent = String(Math.floor(cm / 100));
    if (c) c.textContent = String(cm % 100);
    row.classList.add('is-touched'); row.setAttribute('data-touched', 'true');
  }
  function labelEl(row) {
    var l = row.querySelector('.dimension-label') || row.firstElementChild; if (!l) return null;
    var inner = l.querySelector('div') || l; return inner;
  }
  function setLabel(row, text) { var el = labelEl(row); if (el && el.textContent.trim() !== text) el.textContent = text; }

  function hint(row, text) {
    var h = row.querySelector(':scope > .question-hint');
    if (!text) { if (h) h.hidden = true; row.classList.remove('prava-question-invalid', 'prava-question-shake'); row.removeAttribute('aria-invalid'); return; }
    if (!h) { h = document.createElement('p'); h.className = 'question-hint'; h.setAttribute('role', 'alert'); row.append(h); }
    h.textContent = text; h.hidden = false;
    row.classList.add('prava-question-invalid'); row.setAttribute('aria-invalid', 'true');
    void row.offsetWidth; row.classList.add('prava-question-shake');
    row.style.scrollMarginTop = '160px'; row.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  function problem(k, page) {
    var row = rowOf(page, k.id), room = valueCm(rowOf(page, k.room)), kh = valueCm(row);
    if (kh <= 0) return 'Въведете височината на кухнята, за да продължим.';
    if (room > 0 && kh > room) return 'Височината на кухнята не може да е по-голяма от височината на помещението.';
    return '';
  }

  function setup(k, page) {
    var room = rowOf(page, k.room); if (!room) return false;
    setLabel(room, ROOM_LABEL);
    var row = rowOf(page, k.id);
    if (!row) {
      row = room.cloneNode(true);   // same look and pickers as the room height row (listeners are not copied)
      row.setAttribute('data-dim', k.id);
      row.classList.remove('is-touched', 'prava-question-invalid', 'prava-question-shake'); row.removeAttribute('data-touched'); row.removeAttribute('aria-invalid'); row.removeAttribute('style');
      row.querySelectorAll('.question-hint').forEach(function (n) { n.remove(); });
      room.after(row);
      setCm(row, 0); row.classList.remove('is-touched'); row.removeAttribute('data-touched');
      setLabel(row, KITCHEN_LABEL);
      // own pickers (metres ±1, centimetres ±5 with carry), handled before any page script can see the click
      row.addEventListener('click', function (e) {
        var b = e.target.closest('.picker-btn, a, button'); if (!b || !row.contains(b)) return;
        var inM = !!b.closest('.meters-control'), inC = !!b.closest('.centimeters-control'); if (!inM && !inC) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        var up = /up|\+/.test(b.className + ' ' + b.textContent), cm = valueCm(row);
        cm += inM ? (up ? 100 : -100) : (up ? 5 : -5);
        linkCeiling(row, false);
        if (inM && !up && cm < 0) cm = valueCm(row) % 100;
        setCm(row, cm); hint(row, '');
        row.dispatchEvent(new Event('change', { bubbles: true }));
        var api = window[k.refresh]; if (api && typeof api.refresh === 'function') api.refresh();
      }, true);
      // "до тавана": the kitchen takes the room height and keeps following it until the pickers are used
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'kh-ceiling-btn'; btn.textContent = 'до тавана';
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        linkCeiling(row, true); copyRoom(k, page, row);
      }, true);
      row.append(btn);
      // room height changed by its own pickers: follow it while linked
      room.addEventListener('click', function () { setTimeout(function () { if (row.dataset.ceiling === '1') copyRoom(k, page, row); }, 0); });
      room.addEventListener('change', function () { if (row.dataset.ceiling === '1') copyRoom(k, page, row); });
    }
    return true;
  }
  function linkCeiling(row, on) {
    if (on) row.dataset.ceiling = '1'; else delete row.dataset.ceiling;
    var b = row.querySelector('.kh-ceiling-btn'); if (b) b.classList.toggle('is-on', !!on);
  }
  function copyRoom(k, page, row) {
    var cm = valueCm(rowOf(page, k.room)); if (cm <= 0) return;
    if (valueCm(row) === cm && row.classList.contains('is-touched')) return;
    setCm(row, cm); hint(row, '');
    row.dispatchEvent(new Event('change', { bubbles: true }));
    var api = window[k.refresh]; if (api && typeof api.refresh === 'function') api.refresh();
  }
  function style() {
    if (document.getElementById('kh-css')) return;
    var st = document.createElement('style'); st.id = 'kh-css';
    st.textContent = '.kh-ceiling-btn{margin:8px 0 0;padding:6px 14px;border:1px solid #2f4a3a;border-radius:999px;background:#fff;color:#2f4a3a;font:inherit;font-size:13px;line-height:1.2;cursor:pointer}' +
      '.kh-ceiling-btn:hover{background:#eef2ef}.kh-ceiling-btn.is-on{background:#2f4a3a;color:#fff}';
    document.head.append(st);
  }

  function init() {
    style();
    KITCHENS.forEach(function (k) {
      var page = document.querySelector(k.page); if (!page) return;
      var tries = 0;
      (function wait() { if (!setup(k, page) && ++tries < 100) setTimeout(wait, 100); })();
      // labels can be rewritten later by older scripts: keep ours
      new MutationObserver(function () { var r = rowOf(page, k.room), n = rowOf(page, k.id); if (r) setLabel(r, ROOM_LABEL); if (n) setLabel(n, KITCHEN_LABEL); }).observe(page, { childList: true, subtree: true, characterData: true });
      // Next on the step that shows the kitchen height: it must be filled in and not higher than the room
      document.addEventListener('click', function (e) {
        var next = e.target.closest && e.target.closest(NEXT); if (!next || !page.contains(next)) return;
        var row = rowOf(page, k.id); if (!row || !row.offsetParent) return;
        var room = rowOf(page, k.room); if (valueCm(room) <= 0) return;   // the room height's own check speaks first
        var p = problem(k, page); if (!p) return;
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); hint(row, p);
      }, true);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
