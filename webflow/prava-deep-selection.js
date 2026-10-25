/* Prava: the deep upper row's own decor (deep_finish, chosen in the step prava-material-extras.js adds) is returned by
   window.pravaMaterialSelections.get('deep_finish'), so the order (kitchen-order.js) sends it like the other materials.
   The published prava-smart-form.js tracks only upper / lower / countertop / backsplash; this wraps its getter. */
(function () {
  'use strict';
  function clean(v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  var catalog = null;
  function upperCatalog(page) {
    if (catalog) return catalog;
    var wrap = page.querySelector('.question-wrap-vision[data-field="upper_finish"]');
    var script = wrap && wrap.querySelector('script[data-prava-catalog]');
    if (!script) return null;
    try { catalog = JSON.parse(script.textContent); } catch (e) { catalog = null; }
    return catalog;
  }
  function deepRecord(page) {
    var input = page.querySelector('input[name="deep_finish"]');
    var id = input ? clean(input.value) : '';
    if (!id) return null;
    var cat = upperCatalog(page);
    var row = cat && cat.items && cat.items.find(function (item) { return item[0] === id; });
    if (!row) return null;
    var grain = page.querySelector('input[name="deep_grain"]');
    return {
      value: row[0], id: row[0],
      manufacturer: row[1] || null,
      decorCode: row[3] || null,
      decorName: row[4] || null,
      displayName: clean(row[4]) || null,
      label: clean(row[4]) || null,
      category: row[2] || null,
      grain: grain ? grain.value : null,
      sampleImageUrl: cat.base && row[5] ? cat.base + encodeURIComponent(row[5]) : null
    };
  }
  function wrap() {
    var page = document.querySelector('.sf-page-prava'), api = window.pravaMaterialSelections;
    if (!page || !api || api.__deepWrapped) return;
    var original = api.get.bind(api);
    api.get = function (field) {
      if (field === 'deep_finish') return deepRecord(page);
      return original(field);
    };
    api.__deepWrapped = true;
  }
  wrap();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wrap, { once: true });
  window.addEventListener('load', wrap);
})();
