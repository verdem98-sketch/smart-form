/* Sketch-reference hook for the Prava AI visualization.
   The interactive 3D sketch is the single reference for the artist: when the collector posts a new
   visualization request, a picture of the sketch (and a short feature key) is attached to it, so the
   backend renders from that picture instead of the planner + four material images.
   If no picture can be made (viewer unavailable, invalid layout) the request goes out untouched and the
   backend falls back to its planner path. Corrections and every other request are never modified. */
(function () {
  'use strict';
  if (window.__pravaSketchReference || typeof window.fetch !== 'function') return;
  window.__pravaSketchReference = true;
  var original = window.fetch;
  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\/contract-automation\/api\/kitchen-visual(\?|$)/.test(url) && init && init.method === 'POST' && typeof init.body === 'string') {
        var body = JSON.parse(init.body);
        var layout = window.pravaLayout;
        if (body && body.payload && !body.correction && !body.dryRun && body.sketchImage === undefined && layout && typeof layout.capture === 'function') {
          var shot = layout.capture();
          if (shot) {
            body.sketchImage = shot;
            body.sketchLegend = typeof layout.sketchLegend === 'function' ? layout.sketchLegend() : [];
            init = Object.assign({}, init, { body: JSON.stringify(body) });
          }
        }
      }
    } catch (e) { /* send the request unchanged */ }
    return original.call(this, input, init);
  };
})();
