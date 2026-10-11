/* Aglova step 9: AI visualization. Same behaviour as Prava (webflow/prava-ai-visualization.js, prava-preview.js and the
   inline step-9 summary / correction scripts), for the corner kitchen: collects every answer of steps 1-8 into one payload
   (kitchenType 'aglova') for /contract-automation/api/kitchen-visual, shows the result in the sketch card, offers up to 3
   corrections and a "Вашият избор" summary with jump-back links. The step-9 node (.ag-ai-phase) is created by aglova-flow.js. */
(function () {
  'use strict';
  var MAX_CORRECTIONS = 3;
  function clean(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  function esc(v) { return clean(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function boot(tries) {
    var page = document.querySelector('.flow-aglova');
    if (!page) return;
    var phase = page.querySelector('.ag-ai-phase');
    if (!phase || !window.agGoToStep) { if (tries < 200) setTimeout(function () { boot(tries + 1); }, 50); return; }
    init(page, phase);
  }

  function init(page, phase) {
    if (page.dataset.agAi) return;
    page.dataset.agAi = '1';
    var card = page.querySelector('.sticky-cad-wrap');
    var stage = card && card.querySelector('.cad-stage-aglova');
    var btn = phase.querySelector('#aglova-ai-generate-button');
    var aiCard = phase.querySelector('#aglova-ai-card-v1');
    if (!stage || !btn || !aiCard) return;
    var debugCost = new URLSearchParams(location.search).get('ai-debug') === '1';
    var endpoint = location.origin + '/contract-automation/api/kitchen-visual';

    /* ---------- preview (sketch card states: planner / loading / generated / error) ---------- */
    var preview = (function () {
      card.classList.add('prava-preview-card'); card.dataset.previewState = 'planner';
      var image = document.createElement('img'); image.className = 'ag-generated-image'; image.alt = 'AI визуализация на избраната кухня'; image.hidden = true; stage.append(image);
      var heading = card.querySelector('.combo-title'); var plannerTitle = heading ? heading.textContent : '';
      var status = document.createElement('div'); status.className = 'ag-preview-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.hidden = true;
      var text = document.createElement('p'), retry = document.createElement('button'); retry.type = 'button'; retry.textContent = 'Опитайте отново'; retry.hidden = true;
      var actions = document.createElement('div'); actions.className = 'ag-preview-error-actions'; actions.hidden = true;
      var bDims = document.createElement('button'); bDims.type = 'button'; bDims.textContent = 'Коригирай размерите'; bDims.dataset.agErrorAction = 'dimensions';
      var bApp = document.createElement('button'); bApp.type = 'button'; bApp.textContent = 'Промени електроуредите'; bApp.dataset.agErrorAction = 'appliances';
      actions.append(bDims, bApp); status.append(text, retry, actions); stage.append(status);
      var hasImage = false, revision = 0, applying = false;
      function updateHeading() {
        if (!heading || !hasImage) return;
        if (heading.textContent !== 'Вашата AI визуализация') { applying = true; heading.textContent = 'Вашата AI визуализация'; applying = false; }
      }
      if (heading) new MutationObserver(function () { if (!applying) updateHeading(); }).observe(heading, { childList: true, characterData: true, subtree: true });
      page.addEventListener('ag:phase-changed', updateHeading);
      function correctable(message) {
        var t = String(message || '').toLowerCase();
        return t.indexOf('тези размери') > -1 || t.indexOf('проверете размерите') > -1 || t.indexOf('задължителни модули') > -1 ||
          t.indexOf('наличната дължина') > -1 || t.indexOf('височина') > -1;
      }
      function state(value, message) {
        card.dataset.previewState = value; stage.setAttribute('aria-busy', String(value === 'loading'));
        updateHeading();
        if (value === 'loading' && window.innerWidth < 768) card.scrollIntoView({ behavior: 'auto', block: 'start' });
        status.hidden = value === 'planner' || value === 'generated'; retry.hidden = value !== 'error';
        text.textContent = value === 'loading' ? 'Създаваме Вашата визуализация…' : message || 'Визуализацията не можа да бъде създадена. Опитайте отново.';
        var fix = value === 'error' && correctable(message); actions.hidden = !fix; retry.hidden = value !== 'error' || fix;
        stage.querySelectorAll('.cad-base,.cad-kitchen,.cad-bar,.cad-island').forEach(function (n) { n.classList.toggle('ag-cad-replaced', hasImage); });
        if (value === 'error') setTimeout(function () { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
      }
      function showImage(url) {
        var token = ++revision;
        return new Promise(function (resolve, reject) {
          var candidate = new Image();
          candidate.onload = function () { if (token !== revision) { resolve(false); return; } image.src = url; image.hidden = false; hasImage = true; state('generated'); resolve(true); };
          candidate.onerror = function () { reject(new Error('Полученото изображение не може да се зареди.')); };
          candidate.src = url;
        });
      }
      retry.addEventListener('click', function () { btn.click(); });
      function go(step, selector) {
        page.dispatchEvent(new CustomEvent('ag:return-context', { bubbles: true, detail: { step: step, source: 'preview-error' } }));
        window.agGoToStep(step, false);
        setTimeout(function () { var t = page.querySelector(selector); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
      }
      bDims.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); go(1, '[data-ag-phase="1"]'); });
      bApp.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); go(7, '[data-ag-phase="7"]'); });
      state('planner');
      return { setState: state, showImage: showImage, getState: function () { return card.dataset.previewState; } };
    })();
    window.agPreview = preview;

    /* ---------- collecting every answer of steps 1-8 ---------- */
    function fieldNodes(field) { return [].slice.call(page.querySelectorAll('[data-field="' + field + '"]')); }
    function selectedChoice(field) {
      var nodes = fieldNodes(field);
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i].querySelector('.option-pill.active,.option-pill.is-selected,.option-pill.vm-selected');
        if (el) return { value: clean(el.getAttribute('data-value') || el.textContent), label: clean(el.textContent) };
      }
      return null;
    }
    function material(field) {
      var input = page.querySelector('input[name="' + field + '"]');
      if (input && !clean(input.value)) return null;
      return window.agMaterialSelections ? window.agMaterialSelections.get(field) : null;
    }
    function pickerNumber(scope, selector) {
      var box = scope.querySelector(selector + ' .picker-value-text') || scope.querySelector(selector + ' .picker-value');
      var n = parseInt(clean(box && box.textContent), 10); return isNaN(n) ? 0 : n;
    }
    function dimensions() {
      var out = {};
      page.querySelectorAll('.dimension-row[data-dim]').forEach(function (row) {
        var m = pickerNumber(row, '.meters-control'), cm = pickerNumber(row, '.centimeters-control');
        out[row.getAttribute('data-dim')] = { meters: m, centimeters: cm, totalCm: m * 100 + cm, display: (m ? m + ' м ' : '') + (cm ? cm + ' см' : '') };
      });
      return out;
    }
    function checkedExtras() {
      var out = [];
      page.querySelectorAll('[data-field] input[type="checkbox"]:checked').forEach(function (input) {
        var wrap = input.closest('[data-field]'); if (!wrap) return;
        var label = wrap.querySelector('label,.w-form-label');
        var item = { field: clean(wrap.getAttribute('data-field')), label: clean(label && label.textContent) };
        if (!out.some(function (x) { return x.field === item.field; })) out.push(item);
      });
      return out;
    }
    function hasExtra(extras, field) { return extras.some(function (x) { return x && x.field === field; }); }
    function selectValue(name) { var el = page.querySelector('[name="' + name + '"]'); return el ? clean(el.value) : ''; }
    function appliances() {
      function one(name) { var v = selectValue(name); return { enabled: !!v, type: v || null }; }
      return { dishwasher: one('dishwasher_type'), washingMachine: one('washing_machine_type'), microwave: one('microwave_type'), coffeeMachine: one('coffee_machine_type') };
    }
    function yes(choice) { return !!choice && /(^|\s)(yes|да|true)(\s|$)/.test((String(choice.value || '') + ' ' + String(choice.label || '')).toLowerCase()); }
    function barMode(c) {
      var v = c ? (String(c.value || '') + ' ' + String(c.label || '')).toLowerCase() : '';
      if (/остров/.test(v)) return 'island';
      if (/стена\s*1/.test(v)) return 'wall1';
      if (/стена\s*2/.test(v)) return 'wall2';
      return 'none';
    }
    function mm(d, key) { return d[key] && d[key].totalCm > 0 ? d[key].totalCm * 10 : null; }
    function collect() {
      var config = {
        chimney: selectedChoice('chimney_exists'), waterWall: selectedChoice('water_position_aglova'),
        ovenTallUnit: selectedChoice('oven_tall_unit_aglova'), fridgeType: selectedChoice('fridge_type_aglova'), bar: selectedChoice('bar_enabled_aglova')
      };
      var d = dimensions(), extras = checkedExtras(), ap = appliances();
      if (ap.washingMachine.enabled && !hasExtra(extras, 'washing_machine')) extras.push({ field: 'washing_machine', label: ap.washingMachine.type || 'washing_machine' });
      var materials = { upper: material('upper_finish'), lower: material('lower_finish'), countertop: material('countertop_finish'), backsplash: material('backsplash_finish') };
      var deep = hasExtra(extras, 'deep_cabinets');
      var dw = ap.dishwasher.type && /45$/.test(ap.dishwasher.type) ? 450 : ap.dishwasher.type && /60$/.test(ap.dishwasher.type) ? 600 : 0;
      return {
        version: 'aglova-ai-visual-v1', kitchenType: 'aglova', configuration: config, dimensions: d,
        technicalRequirements: {
          wall1LengthMm: mm(d, 'stena1_len_aglova'), wall2LengthMm: mm(d, 'stena2_len_aglova'), roomHeightMm: mm(d, 'visochina_aglova'),
          chimneyAMm: yes(config.chimney) ? mm(d, 'chimney_a_aglova') : null, chimneyBMm: yes(config.chimney) ? mm(d, 'chimney_b_aglova') : null,
          barLengthMm: mm(d, 'bar_len_aglova'), barWidthMm: mm(d, 'bar_width_aglova'),
          islandLengthMm: mm(d, 'island_len_aglova'), islandWidthMm: mm(d, 'island_width_aglova'),
          deepUpperCabinets: deep, upperRowMode: deep ? 'deep-reference-locked' : (materials.upper ? 'standard' : 'none'),
          dishwasherWidthMm: dw || null, bottlePullout: { enabled: hasExtra(extras, 'bottle_rack'), widthMm: 150 },
          builtInCoffeeMachine: !!(ap.coffeeMachine.enabled && ap.coffeeMachine.type === 'built_in'),
          preserveCamera: true, preserveWallGeometry: true
        },
        materials: materials, appliances: ap, extras: extras, pagePath: location.pathname, collectedAt: new Date().toISOString()
      };
    }
    function validate(p) {
      var missing = [], c = p.configuration, d = p.dimensions;
      if (!c.chimney) missing.push('комин'); if (!c.waterWall) missing.push('позиция на водата');
      if (!c.ovenTallUnit) missing.push('фурна'); if (!c.fridgeType) missing.push('хладилник'); if (!c.bar) missing.push('бар или остров');
      if (!d.stena1_len_aglova || d.stena1_len_aglova.totalCm <= 0) missing.push('дължина на стена 1');
      if (!d.stena2_len_aglova || d.stena2_len_aglova.totalCm <= 0) missing.push('дължина на стена 2');
      if (!d.visochina_aglova || d.visochina_aglova.totalCm <= 0) missing.push('височина');
      if (yes(c.chimney)) {
        if (!d.chimney_a_aglova || d.chimney_a_aglova.totalCm <= 0) missing.push('размер A на комина');
        if (!d.chimney_b_aglova || d.chimney_b_aglova.totalCm <= 0) missing.push('размер B на комина');
      }
      var mode = barMode(c.bar);
      if (mode === 'wall1' || mode === 'wall2') {
        if (!d.bar_len_aglova || d.bar_len_aglova.totalCm <= 0) missing.push('дължина на бара');
        if (!d.bar_width_aglova || d.bar_width_aglova.totalCm <= 0) missing.push('ширина на бара');
      }
      if (mode === 'island') {
        if (!d.island_len_aglova || d.island_len_aglova.totalCm <= 0) missing.push('дължина на острова');
        if (!d.island_width_aglova || d.island_width_aglova.totalCm <= 0) missing.push('ширина на острова');
      }
      if (!p.materials.upper) missing.push('визия за горен ред'); if (!p.materials.lower) missing.push('визия за долен ред');
      if (!p.materials.countertop) missing.push('визия за плот'); if (!p.materials.backsplash) missing.push('визия за гръб');
      if (p.appliances.dishwasher.enabled && !p.technicalRequirements.dishwasherWidthMm) missing.push('размер на миялната 45/60 см');
      return { valid: !missing.length, missing: missing };
    }
    function missingStep(missing) {
      var first = (missing && missing[0]) || '';
      if (/стена|височина|комина/.test(first) || first === 'комин') return 1;                                                     // step 1: wall sizes, height, chimney (+ its sizes)
      if (['позиция на водата', 'фурна', 'хладилник', 'бар или остров'].indexOf(first) > -1) return 2;   // step 2: configuration
      if (/дължина|ширина/.test(first) && first !== 'визия за плот') return 2;               // bar / island sizes sit in step 2
      var m = { 'визия за горен ред': 3, 'визия за долен ред': 4, 'визия за плот': 5, 'визия за гръб': 6, 'размер на миялната 45/60 см': 7 };
      return m[first] || 1;
    }

    /* ---------- button + request / poll / correction ---------- */
    var debugStatus = null;
    function showState(name, message) {
      preview.setState(name === 'success' ? 'generated' : name === 'loading' ? 'loading' : 'error', message);
    }
    function syncButton() {
      if (btn.dataset.aiBusy === '1') return;
      var p = collect(), check = validate(p);
      btn.disabled = false; btn.classList.toggle('is-missing', !check.valid);
      btn.textContent = check.valid ? 'Генерирай AI визуализация' : 'Завършете избора, за да генерирате';
      btn.title = check.valid ? '' : 'Липсва: ' + check.missing.join(', ');
      btn.dataset.missingStep = check.valid ? '' : String(missingStep(check.missing));
    }
    async function readJson(response) {
      var raw = '', data = {}; try { raw = await response.text(); data = raw ? JSON.parse(raw) : {}; } catch (e) {} return { data: data, raw: raw };
    }
    async function pollVisual(responseId) {
      var startedAt = Date.now();
      for (var attempt = 0; attempt < 100; attempt++) {
        await wait(3000);
        var response = await fetch(endpoint + '?responseId=' + encodeURIComponent(responseId), { method: 'GET', headers: { Accept: 'application/json' } });
        var parsed = await readJson(response), data = parsed.data;
        if (debugCost && debugStatus) debugStatus.textContent = 'AI статус: ' + String(data.status || ('HTTP ' + response.status)) + ' · ' + Math.round((Date.now() - startedAt) / 1000) + ' сек.';
        if (!response.ok || !data.ok) throw new Error((data && data.error) || ('HTTP ' + response.status + (parsed.raw ? ' — ' + parsed.raw.slice(0, 180) : '')));
        if (data.done && data.imageDataUrl) return data;
        if (data.status !== 'queued' && data.status !== 'in_progress') throw new Error('Генерацията приключи без готово изображение.');
      }
      throw new Error('Генерацията все още се обработва. Не стартирайте нова визуализация; опитайте отново след малко.');
    }
    async function waitForCorrectionReady(responseId) {
      for (var attempt = 0; attempt < 20; attempt++) {
        await wait(1500);
        try {
          var response = await fetch(endpoint + '?responseId=' + encodeURIComponent(responseId), { method: 'GET', headers: { Accept: 'application/json' } });
          var data = (await readJson(response)).data;
          if (response.ok && data && data.ok && data.done && data.correctionReady) {
            page.dispatchEvent(new CustomEvent('ag-ai-correction-ready', { bubbles: true, detail: { responseId: responseId, correctionIndex: Number(data.correctionIndex || 0), remainingCorrections: Number.isFinite(Number(data.remainingCorrections)) ? Number(data.remainingCorrections) : MAX_CORRECTIONS } }));
            return;
          }
        } catch (e) {}
      }
    }
    function cm(mmv) { var n = Number(mmv); return isFinite(n) && n > 0 ? Math.round(n / 10) + ' см' : ''; }
    function humanize(message) {
      var text = clean(message), m;
      var labels = { fridge: 'хладилник', ovenTower: 'колона за фурна', ovenHobBase: 'фурна + котлони', hobBase: 'модул за котлони', sinkBase: 'модул за мивка', dishwasher: 'миялна', basket: 'кошница', washingMachine: 'пералня', cornerBase: 'ъглов шкаф', genericBase: 'шкаф' };
      m = text.match(/Wall (\d): Required fixed modules need\s+(\d+)\s*mm, but the available run is only\s+(\d+)\s*mm(?:\.\s*Breakdown:\s*(.+))?/i);
      if (m) {
        var parts = (m[4] || '').split(',').map(function (x) { var p = x.split(':'); var w = parseInt(p[1], 10); return p[0] && isFinite(w) ? (labels[clean(p[0])] || clean(p[0])) + ' ' + cm(w) : ''; }).filter(Boolean);
        return 'На стена ' + m[1] + ' избраните уреди и задължителни модули изискват поне ' + cm(m[2]) + ', а наличната дължина (след ъгъла) е ' + cm(m[3]) + '.' + (parts.length ? ' В тях са включени: ' + parts.join(', ') + '.' : '');
      }
      m = text.match(/Resolved cabinet stack needs\s+(\d+)\s*mm,\s*but room height is only\s+(\d+)\s*mm/i);
      if (m) return 'За избраната конфигурация са нужни поне ' + cm(m[1]) + ' височина, а Вие сте задали ' + cm(m[2]) + ' за помещението.';
      m = text.match(/Wall (\d): Planner width mismatch:\s*requested\s+(\d+)\s*mm,\s*planned\s+(\d+)\s*mm/i);
      if (m) return 'Дължината на стена ' + m[1] + ' е ' + cm(m[2]) + ', но избраните модули изискват ' + cm(m[3]) + '.';
      m = text.match(/Wall (\d): the remaining\s+(\d+)\s*mm cannot be filled/i);
      if (m) return 'Остатъкът ' + cm(m[2]) + ' на стена ' + m[1] + ' не може да се запълни с шкафове. Променете дължината.';
      return text;
    }
    function humanMessage(base, details) {
      var readable = (details || []).map(humanize).filter(Boolean);
      if (readable.length) return 'Не можем да направим визуализация с тези размери. ' + readable.join(' ');
      return humanize(base) || 'Не можем да направим визуализация с тези настройки. Проверете размерите и опитайте отново.';
    }
    async function requestVisual() {
      if (btn.dataset.aiBusy === '1') return;
      var payload = collect(), check = validate(payload);
      window.__agAiPayload = payload;
      if (!check.valid) { showState('error', 'Липсва: ' + check.missing.join(', ')); return; }
      showState('loading');
      btn.dataset.aiBusy = '1'; btn.disabled = true; btn.textContent = 'Създаваме визуализацията…';
      try {
        var startResponse = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: payload }) });
        var startParsed = await readJson(startResponse), startData = startParsed.data;
        if (!startResponse.ok || !startData.ok) {
          var details = Array.isArray(startData && startData.plannerErrors) ? startData.plannerErrors.filter(Boolean) : [];
          var baseError = (startData && startData.error) || ('HTTP ' + startResponse.status + (startParsed.raw ? ' — ' + startParsed.raw.slice(0, 180) : ''));
          throw new Error(humanMessage(baseError, details));
        }
        if (!startData.responseId) throw new Error('AI генераторът не върна идентификатор на задачата.');
        var data = await pollVisual(startData.responseId);
        await preview.showImage(data.imageDataUrl);
        window.__agAiLastMeta = data.generationMeta || null;
        window.__agAiLastResponseId = data.responseId || startData.responseId || null;
        showState('success');
        page.dispatchEvent(new CustomEvent('ag-ai-generated', { bubbles: true, detail: {
          imageDataUrl: data.imageDataUrl, responseId: window.__agAiLastResponseId, revisedPrompt: data.revisedPrompt || null,
          correctionIndex: Number(data.correctionIndex || 0),
          remainingCorrections: Number.isFinite(Number(data.remainingCorrections)) ? Number(data.remainingCorrections) : MAX_CORRECTIONS,
          correctionReady: data.correctionReady === true } }));
        if (data.correctionReady !== true) waitForCorrectionReady(window.__agAiLastResponseId);
      } catch (err) {
        showState('error', err && err.message ? err.message : 'Визуализацията не можа да бъде създадена.');
      } finally { btn.dataset.aiBusy = '0'; syncButton(); }
    }
    async function requestCorrection(detail) {
      if (page.dataset.aiCorrectionBusy === '1') return;
      var instruction = clean(detail && detail.instruction);
      var parent = clean((detail && detail.parentResponseId) || window.__agAiLastResponseId || '');
      if (!instruction) { showState('error', 'Опишете какво искате да се промени.'); return; }
      if (!parent) { showState('error', 'Първо създайте AI визуализация.'); return; }
      page.dataset.aiCorrectionBusy = '1'; showState('loading');
      try {
        var startResponse = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correction: { parentResponseId: parent, instruction: instruction } }) });
        var sp = await readJson(startResponse), sd = sp.data;
        if (!startResponse.ok || !sd.ok) throw new Error((sd && sd.error) || ('HTTP ' + startResponse.status + (sp.raw ? ' — ' + sp.raw.slice(0, 180) : '')));
        if (!sd.responseId) throw new Error('AI корекцията не върна идентификатор на задачата.');
        var data = await pollVisual(sd.responseId);
        await preview.showImage(data.imageDataUrl);
        window.__agAiLastMeta = data.generationMeta || null;
        window.__agAiLastResponseId = data.responseId || sd.responseId;
        var remaining = Number.isFinite(Number(data.remainingCorrections)) ? Number(data.remainingCorrections) : Math.max(0, MAX_CORRECTIONS - Number(data.correctionIndex || 0));
        if (window.agAiCorrectionUI) window.agAiCorrectionUI.setRemaining(remaining);
        showState('success');
        page.dispatchEvent(new CustomEvent('ag-ai-generated', { bubbles: true, detail: { imageDataUrl: data.imageDataUrl, responseId: window.__agAiLastResponseId, revisedPrompt: data.revisedPrompt || null, correctionIndex: Number(data.correctionIndex || 0), remainingCorrections: remaining, correctionReady: true } }));
        page.dispatchEvent(new CustomEvent('ag-ai-corrected', { bubbles: true, detail: { responseId: window.__agAiLastResponseId, correctionIndex: Number(data.correctionIndex || 0), remainingCorrections: remaining } }));
      } catch (err) {
        showState('error', err && err.message ? err.message : 'Корекцията не можа да бъде направена.');
      } finally { page.dataset.aiCorrectionBusy = '0'; }
    }
    window.collectAglovaKitchenConfig = collect;
    window.validateAglovaKitchenConfig = function () { return validate(collect()); };

    btn.addEventListener('click', function (ev) {
      var check = validate(collect());
      if (check.valid) return;
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      window.agGoToStep(missingStep(check.missing));
    }, true);
    btn.addEventListener('click', requestVisual);
    page.addEventListener('ag-ai-correction-requested', function (e) { requestCorrection(e.detail || {}); });
    ['click', 'change', 'input'].forEach(function (ev) { page.addEventListener(ev, function () { setTimeout(syncButton, 0); }, true); });
    syncButton();

    /* ---------- correction box ---------- */
    (function () {
      var box = document.createElement('section'); box.id = 'ag-ai-correction-box'; box.hidden = true;
      box.innerHTML = '<h3>Искаш промяна по визуализацията?</h3><p>Опиши само какво искаш да се промени. Всичко останало ще се запази.</p>' +
        '<textarea id="ag-ai-correction-text" placeholder="Например: Добави една витрина с осветление в десния край и не променяй останалите шкафове."></textarea>' +
        '<div id="ag-ai-correction-footer"><span id="ag-ai-correction-count">Остават 3 корекции</span><button type="button" id="ag-ai-correction-submit" disabled>Направи корекция</button></div>';
      phase.appendChild(box);
      var text = box.querySelector('textarea'), button = box.querySelector('#ag-ai-correction-submit'), count = box.querySelector('#ag-ai-correction-count');
      var remaining = MAX_CORRECTIONS, lastImage = '', lastId = '', ready = false;
      function countText() { count.textContent = ready ? 'Остават ' + remaining + ' корекции' : 'Подготвяме корекциите…'; }
      function sync() { button.disabled = !lastId || !ready || !text.value.trim() || remaining <= 0; }
      text.addEventListener('input', sync);
      page.addEventListener('ag-ai-generated', function (e) {
        aiCard.hidden = true;
        var d = e.detail || {};
        lastImage = d.imageDataUrl || lastImage; lastId = d.responseId || lastId; ready = d.correctionReady === true;
        if (Number.isFinite(Number(d.remainingCorrections))) remaining = Math.max(0, Number(d.remainingCorrections));
        countText(); box.hidden = !lastImage; sync();
      });
      page.addEventListener('ag-ai-correction-ready', function (e) {
        var d = e.detail || {};
        if (d.responseId && lastId && d.responseId !== lastId) return;
        ready = true; if (Number.isFinite(Number(d.remainingCorrections))) remaining = Math.max(0, Number(d.remainingCorrections));
        countText(); sync();
      });
      button.addEventListener('click', function () {
        if (button.disabled) return;
        page.dispatchEvent(new CustomEvent('ag-ai-correction-requested', { bubbles: true, detail: { instruction: text.value.trim(), parentResponseId: lastId, remaining: remaining } }));
      });
      page.addEventListener('ag-ai-corrected', function () { text.value = ''; sync(); });
      window.agAiCorrectionUI = {
        show: function (image, id) { lastImage = image || lastImage; lastId = id || lastId; box.hidden = !lastImage; sync(); },
        setReady: function (v) { ready = v === true; countText(); sync(); },
        setRemaining: function (n) { remaining = Math.max(0, Number(n) || 0); countText(); sync(); }
      };
    })();

    /* ---------- "Вашият избор" summary with jump-back ---------- */
    (function () {
      var summary = document.createElement('section'); summary.id = 'ag-step9-summary';
      summary.innerHTML = '<h3>Вашият избор</h3><div id="ag-step9-summary-grid"></div>';
      aiCard.parentNode.insertBefore(summary, aiCard);
      var grid = summary.querySelector('#ag-step9-summary-grid');
      var editReturn = false;
      var back = document.createElement('button'); back.type = 'button'; back.className = 'ag-return-visualization'; back.textContent = 'Обратно към визуализацията'; back.hidden = true;
      var nav = page.querySelector('.combo-dim-phase > .ag-navigation'); if (nav) nav.appendChild(back);
      function syncBack(step) { back.hidden = !(editReturn && Number(step) < 9); }
      back.addEventListener('click', function () {
        window.agGoToStep(9, false); back.hidden = true;
        setTimeout(function () { var t = document.getElementById('ag-step9-summary') || aiCard; t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50);
      });
      function pill(field) { var c = selectedChoice(field); return c ? c.label : ''; }
      function dim(key) { var d = dimensions()[key]; return d && d.totalCm > 0 ? d.display : ''; }
      function applianceText(name) {
        var raw = selectValue(name); if (!raw) return '';
        var sel = page.querySelector('select[name="' + name + '"]');
        var opt = sel && sel.selectedOptions && sel.selectedOptions[0];
        if (opt && clean(opt.textContent)) return clean(opt.textContent);
        return { built_in_45: 'Вградена 45 см', built_in_60: 'Вградена 60 см', free_standing_45: 'Свободностояща 45 см', free_standing_60: 'Свободностояща 60 см', built_in: 'Вграден', free_standing: 'Свободностоящ' }[raw] || raw.replace(/_/g, ' ');
      }
      function row(label, value, step, target) {
        if (!value) return '';
        return '<div class="ag-summary-row" data-summary-step="' + esc(step) + '" data-summary-target="' + esc(target) + '" role="button" tabindex="0"><div class="ag-summary-label">' + esc(label) + '</div><div class="ag-summary-valueclick">' + esc(value) + '</div><div class="ag-summary-change">промени избора</div></div>';
      }
      function matCard(label, role, step) {
        var m = material(role + '_finish'), img = m && m.sampleImageUrl;
        var body = img ? '<img src="' + esc(img) + '" alt="' + esc(label) + '">' : '<div class="ag-summary-material-placeholder"><div><strong>Добави материал</strong>Избери материал за ' + esc(label.toLowerCase()) + '</div></div>';
        return '<div class="ag-summary-material-card" data-summary-step="' + step + '" data-summary-target="field:' + role + '_finish" role="button" tabindex="0"><div class="ag-summary-material-label">' + esc(label) + '</div>' + body + '<div class="ag-summary-material-change">' + (img ? 'промени избора' : 'добави материал') + '</div></div>';
      }
      function render() {
        var c = collect().configuration, mode = barMode(c.bar), html = '';
        html += row('Комин', pill('chimney_exists'), 1, 'field:chimney_exists');
        html += row('Вода', pill('water_position_aglova'), 2, 'field:water_position_aglova');
        html += row('Фурна', pill('oven_tall_unit_aglova'), 2, 'field:oven_tall_unit_aglova');
        html += row('Хладилник', pill('fridge_type_aglova'), 2, 'field:fridge_type_aglova');
        html += row('Бар / остров', pill('bar_enabled_aglova'), 2, 'field:bar_enabled_aglova');
        html += row('Стена 1', dim('stena1_len_aglova'), 1, 'dim:stena1_len_aglova');
        html += row('Стена 2', dim('stena2_len_aglova'), 1, 'dim:stena2_len_aglova');
        html += row('Височина', dim('visochina_aglova'), 1, 'dim:visochina_aglova');
        if (yes(c.chimney)) { html += row('Комин A', dim('chimney_a_aglova'), 1, 'dim:chimney_a_aglova'); html += row('Комин B', dim('chimney_b_aglova'), 1, 'dim:chimney_b_aglova'); }
        if (mode === 'wall1' || mode === 'wall2') { html += row('Бар дължина', dim('bar_len_aglova'), 2, 'dim:bar_len_aglova'); html += row('Бар ширина', dim('bar_width_aglova'), 2, 'dim:bar_width_aglova'); }
        if (mode === 'island') { html += row('Остров дължина', dim('island_len_aglova'), 2, 'dim:island_len_aglova'); html += row('Остров ширина', dim('island_width_aglova'), 2, 'dim:island_width_aglova'); }
        html += '<div class="ag-summary-materials"><div class="ag-summary-block-title">Материали</div><div class="ag-summary-materials-grid">' +
          matCard('Горен ред', 'upper', 3) + matCard('Долен ред', 'lower', 4) + matCard('Плот', 'countertop', 5) + matCard('Гръб', 'backsplash', 6) + '</div></div>';
        var ap = row('Миялна', applianceText('dishwasher_type'), 7, 'field:dishwasher_type') + row('Пералня', applianceText('washing_machine_type'), 7, 'field:washing_machine_type') +
          row('Микровълнова', applianceText('microwave_type'), 7, 'field:microwave_type') + row('Кафе машина', applianceText('coffee_machine_type'), 7, 'field:coffee_machine_type');
        if (ap) html += '<div class="ag-summary-choice-block"><div class="ag-summary-block-title">Уреди</div><div class="ag-summary-choice-grid">' + ap + '</div></div>';
        var ex = checkedExtras().filter(function (x) { return ['dishwasher', 'washing_machine', 'microwave', 'coffee_machine'].indexOf(x.field) < 0 && x.label; });
        html += '<div class="ag-summary-choice-block"><div class="ag-summary-block-title">Допълнителни екстри</div><div class="ag-summary-choice-grid">' +
          (ex.length ? ex.map(function (x) { return row(x.label, 'Да', 8, 'step:8'); }).join('') : row('Допълнителни екстри', 'Няма избрани', 8, 'step:8')) + '</div></div>';
        grid.innerHTML = html;
      }
      function jump(source) {
        var step = parseInt(source.getAttribute('data-summary-step'), 10), target = source.getAttribute('data-summary-target') || '';
        editReturn = true; window.agGoToStep(step, false); syncBack(step);
        setTimeout(function () {
          var node = null;
          if (target.indexOf('field:') === 0) node = fieldNodes(target.slice(6)).filter(function (n) { return n.offsetParent !== null; })[0] || page.querySelector('[data-field="' + target.slice(6) + '"]');
          else if (target.indexOf('dim:') === 0) node = page.querySelector('.dimension-row[data-dim="' + target.slice(4) + '"]');
          else if (target.indexOf('step:') === 0) node = page.querySelector('[data-ag-phase="' + target.slice(5) + '"]');
          if (node) { node.scrollIntoView({ behavior: 'smooth', block: 'center' }); try { node.focus({ preventScroll: true }); } catch (e) {} }
        }, 50);
      }
      var SEL = '.ag-summary-row[data-summary-step][data-summary-target],.ag-summary-material-card[data-summary-step][data-summary-target]';
      grid.addEventListener('click', function (e) { var s = e.target.closest(SEL); if (!s) return; e.preventDefault(); jump(s); });
      grid.addEventListener('keydown', function (e) { if (e.key !== 'Enter' && e.key !== ' ') return; var s = e.target.closest(SEL); if (!s) return; e.preventDefault(); jump(s); });
      page.addEventListener('ag:phase-changed', function (e) { if (!e.detail) return; if (e.detail.step === 9) render(); syncBack(e.detail.step); });
      page.addEventListener('ag:return-context', function (e) { editReturn = true; syncBack(e && e.detail ? Number(e.detail.step) : 1); });
      if (window.agFlow && window.agFlow.getStep() === 9) render();
    })();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { boot(0); }, { once: true });
  else boot(0);
})();
