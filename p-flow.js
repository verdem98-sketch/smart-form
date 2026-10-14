/* П-образна кухня (U-shaped kitchen): unified step flow, same model as Prava (prava-flow.js) and Aglova (aglova-flow.js).
   Sketch on the left (sticky), one step at a time on the right with progress, Назад/Напред and per-item validation.
   This module owns the page's questions, dimension pickers, appliance types and extras (the old inline page code is retired):
     1 Размери (комин + стени + височина)   2 Конфигурация (вода, фурна, хладилник, горен ред, дълбок ред, остров)
     3 Горен ред  [Дълбок горен ред – only with a deep row]  4 Долен ред  5 Плот  6 Гръб  7 Електроуреди  8 Екстри
     9 AI визуализация (p-ai.js)  10 Последна стъпка (booking + contact, p-final-phase.js)
   Walls: стена 1 = лява, стена 2 = срещуположната (задна), стена 3 = дясна. */
(function () {
  'use strict';
  function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  function init() {
    const page = document.querySelector('.sf-page-p');
    if (!page || page.dataset.pFlow) return;
    const content = page.querySelector('.step-3-p .step-content');
    const oldGrid = content && content.querySelector('.div-block-175');
    const stage = page.querySelector('.cad-stage-p');
    const combo = page.querySelector('.combo-phase-wrap');
    const dims = page.querySelector('.dimensions-phase-wrap');
    const Q = f => page.querySelector('.question-wrap[data-field="' + f + '"]');
    const vision = ['upper', 'lower', 'countertop', 'backsplash'].map(r => page.querySelector('.question-wrap-vision[data-field="' + r + '_finish"]'));
    const cards = [...page.querySelectorAll('.prava-extras-card')];
    const applCard = cards[0], extrasCard = cards[1];
    const finalPhase = page.querySelector('.final-phase');
    const qChim = Q('chimney_position_p'), qWater = Q('water_position_p'), qOven = Q('oven_tall_unit_p'), qFridge = Q('fridge_type_p'), qTop = Q('top_row_wall_p'), qIsland = Q('island_enabled_p');
    const gMain = dims && dims.querySelector('.dimensions-group-main'), gChim = dims && dims.querySelector('.dimensions-group-chimney'), gIsland = dims && dims.querySelector('.dimensions-group-island');
    const need = [content, oldGrid, stage, combo, dims, qChim, qWater, qOven, qFridge, qTop, qIsland, gMain, gChim, gIsland, applCard, extrasCard, finalPhase, ...vision];
    if (need.some(n => !n)) { console.warn('p-flow: page contract incomplete'); return; }
    page.dataset.pFlow = '1';

    /* ---------------- layout: progress + sketch (left, sticky) + step card (right) */
    const flow = el('div', 'p-flow'), wrap = el('div', 'p-flow-wrap');
    const left = el('div', 'p-left'), sketch = el('div', 'p-sketch-wrap'), right = el('div', 'p-right');
    const sketchTitle = el('h3', 'p-sketch-title', 'Скицата се обновява според избора');
    sketch.append(sketchTitle, stage); left.append(sketch, right);
    const titles = ['Размери', 'Конфигурация', 'Горен ред', 'Долен ред', 'Плот', 'Гръб', 'Електроуреди', 'Допълнителни екстри', 'AI визуализация', 'Последна стъпка'];
    const N = titles.length, LAST = N;
    const progress = el('div', 'p-global-progress'); progress.setAttribute('role', 'progressbar'); progress.setAttribute('aria-valuemin', '0'); progress.setAttribute('aria-valuemax', String(N));
    const pHead = el('div', 'p-global-progress-head'), pTitle = el('div', 'p-global-progress-title'), pCount = el('div', 'p-global-progress-count'); pCount.setAttribute('aria-live', 'polite');
    pHead.append(pTitle, pCount);
    const track = el('div', 'p-global-progress-track'); track.style.setProperty('--p-steps', N);
    const segs = titles.map(() => { const s = el('div', 'p-global-progress-seg'); track.append(s); return s; });
    const deepSeg = el('div', 'p-global-progress-seg'); deepSeg.dataset.extra = 'deep'; deepSeg.hidden = true; segs[2].after(deepSeg);
    progress.append(pHead, track);
    wrap.append(progress, left); flow.append(wrap);
    oldGrid.replaceWith(flow);
    // the old prototype's test pictures and its per-question buttons are replaced by the 3D sketch (p-layout.js) and the step navigation
    stage.querySelectorAll('.cad-base,.cad-kitchen,.cad-top-row,.cad-island').forEach(n => n.setAttribute('data-p-hide', '1'));
    page.querySelectorAll('.question-actions,.p-nav-actions,.combo-reset-wrap,.top-row-next-btn,.p-dimensions-actions').forEach(n => n.remove());

    /* ---------------- step 1: chimney + walls + height */
    const step1 = el('div', 'p-step p-step-dims');
    const wallsNote = el('p', 'p-walls-note', 'Стена 1 е лявата, стена 2 – срещуположната (задната), стена 3 – дясната. Номерата се виждат и на скицата.');
    const chimNote = el('p', 'p-chim-note', 'При комин дължините на двете стени до него се мерят от комина навън — без самия комин. A е по страничната стена, B – по задната.'); chimNote.hidden = true;
    step1.append(qChim, chimNote, wallsNote, gMain, gChim);
    /* ---------------- step 2: configuration */
    const step2 = el('div', 'p-step p-step-config');
    const tools = el('div', 'p-config-tools'), reset = el('button', 'p-config-reset', 'Нулиране'); reset.type = 'button'; tools.append(reset);
    // deep upper row: a question like in Prava / Aglova; its answer drives the deep_cabinets checkbox the request and the summary read
    const qDeep = el('div', 'question-wrap question-wrap-single question-deep-cabinets');
    qDeep.dataset.field = 'deep-cabinets';
    qDeep.innerHTML = '<div class="question-head"><div class="question-title">Искате ли дълбок горен ред?</div></div>' +
      '<div class="options-row options-row-single"><a data-value="no" href="#" class="option-pill w-button">НЕ</a><a data-value="yes" href="#" class="option-pill w-button">ДА</a></div>';
    const topHint = el('p', 'p-q-hint', 'Изберете една или повече стени. Без избор кухнята е без горни шкафове.');
    qTop.append(topHint);
    step2.append(tools, qWater, qOven, qFridge, qTop, qDeep, qIsland, gIsland);
    dims.remove(); combo.remove();
    [qChim, qWater, qOven, qFridge, qTop, qIsland].forEach(q => { q.classList.remove('is-hidden', 'choice-warning'); q.style.removeProperty('display'); });
    gChim.classList.add('is-hidden'); gIsland.classList.add('is-hidden');

    /* ---------------- steps 7 / 8: appliance types and extras */
    // appliances: the old checkboxes only said "yes"; like Prava/Aglova each one gets a type (built-in / free-standing, dishwasher 45 / 60 cm)
    const APPL = [
      ['dishwasher', 'Миялна', [['', 'Не е избрана'], ['built_in_45', 'За вграждане 45 см'], ['built_in_60', 'За вграждане 60 см'], ['free_standing_45', 'Свободно стояща 45 см'], ['free_standing_60', 'Свободно стояща 60 см']]],
      ['washing_machine', 'Пералня', [['', 'Не е избрана'], ['free_standing', 'Свободно стояща'], ['built_in', 'За вграждане']]],
      ['microwave', 'Микровълнова', [['', 'Не е избрана'], ['free_standing', 'Свободно стояща'], ['built_in', 'За вграждане']]],
      ['coffee_machine', 'Кафе-машина', [['', 'Не е избрана'], ['free_standing', 'Свободно стояща'], ['built_in', 'За вграждане']]]
    ];
    applCard.querySelector('.phase-title') && (applCard.querySelector('.phase-title').textContent = 'Електроуреди');
    APPL.forEach(([name, lab, opts]) => {
      const box = applCard.querySelector('input[type="checkbox"][name="' + name + '"]'); if (!box) return;
      const holder = box.closest('.p6-check') || box.closest('label'); if (holder) holder.classList.add('p-appl-hidden');
      const row = el('label', 'p-appl-row'); row.append(document.createTextNode(lab));
      const sel = document.createElement('select'); sel.name = name + '_type'; sel.dataset.name = name + '_type';
      opts.forEach(([v, t]) => { const o = document.createElement('option'); o.value = v; o.textContent = t; sel.append(o); });
      sel.addEventListener('change', () => { box.checked = !!sel.value; box.dispatchEvent(new Event('change', { bubbles: true })); });
      row.append(sel); applCard.append(row);
    });
    // extras: the "Визия без дръжки" checkbox was sent as deep_cabinets (it said "deep upper row"); give it its own name,
    // keep deep_cabinets as a hidden checkbox driven by the step-2 question, and add "Таблени вратички" like Prava/Aglova
    const mis = [...extrasCard.querySelectorAll('.p6-check')].find(l => /без дръжки/i.test(l.textContent));
    const misBox = mis && mis.querySelector('input[type="checkbox"]');
    if (misBox && misBox.name === 'deep_cabinets') { misBox.name = 'handleless'; misBox.dataset.name = 'handleless'; }
    let deepBox = page.querySelector('input[type="checkbox"][name="deep_cabinets"]');
    if (!deepBox) { deepBox = document.createElement('input'); deepBox.type = 'checkbox'; deepBox.name = 'deep_cabinets'; deepBox.dataset.name = 'deep_cabinets'; deepBox.value = 'yes'; deepBox.hidden = true; extrasCard.append(deepBox); }
    if (!page.querySelector('input[name="panel_doors"]')) {
      const tpl = extrasCard.querySelector('.p6-check');
      if (tpl) {
        const lab = tpl.cloneNode(true), inp = lab.querySelector('input'); inp.name = 'panel_doors'; inp.dataset.name = 'panel_doors'; inp.checked = false; inp.removeAttribute('id');
        lab.lastChild.textContent = 'Таблени вратички';
        const after = [...extrasCard.querySelectorAll('.p6-check')].find(l => /чекмеджета/i.test(l.textContent)) || tpl; after.after(lab);
      }
    }

    /* ---------------- step 9: AI visualization card (p-ai.js adds summary, states and corrections) */
    const aiPhase = el('section', 'p-ai-phase');
    aiPhase.innerHTML = '<div id="p-ai-card-v1"><h3>Виж кухнята си като реална визия</h3><p>Ще създадем една ориентировъчна реалистична визуализация на база избраната конфигурация, размери, материали, уреди и екстри.</p><button id="p-ai-generate-button" type="button">Генерирай AI визуализация</button></div>';

    /* ---------------- step nodes in the right card */
    const phases = [step1, step2, ...vision, applCard, extrasCard, aiPhase, finalPhase];
    const header = el('div', 'p-step-header'), heading = el('h2', 'p-step-heading'); header.append(heading); right.append(header);
    phases.forEach((node, i) => {
      if (node !== finalPhase) right.append(node);   // the last step stays full width below the configurator
      node.classList.remove('p-side-reveal', 'from-left', 'from-right', 'is-visible', 'p-vision-white');
      node.classList.add('p-stepnode'); node.dataset.pPhase = String(i + 1);
    });
    vision.forEach(v => v.querySelectorAll('.p6-note-label,.p6-note').forEach(n => n.setAttribute('data-p-hide', '1')));
    // the materials / extras block below the configurator is now empty: keep only the SEO text
    page.querySelectorAll('.p6-head,.p6-grid').forEach(n => n.setAttribute('data-p-hide', '1'));
    const error = el('p', 'p-validation'); error.setAttribute('role', 'alert'); error.hidden = true;
    const nav = el('div', 'p-navigation'), back = el('button', '', '← Назад'), next = el('button', '', 'Напред →');
    back.type = next.type = 'button'; back.dataset.pNav = 'back'; next.dataset.pNav = 'next'; nav.append(back, next);
    right.append(error, nav);
    const finalBack = el('button', '', '← Назад'); finalBack.type = 'button'; finalBack.dataset.pNav = 'back';
    const finalNav = el('div', 'p-navigation p-final-nav'); finalNav.append(finalBack); finalPhase.prepend(finalNav);

    /* ---------------- deep upper row colour: sub-step between "Горен ред" and "Долен ред" (same as Aglova) */
    const deepPhase = el('div', 'question-wrap question-wrap-vision p-deep-phase p-stepnode');
    deepPhase.dataset.field = 'deep_finish'; deepPhase.hidden = true; deepPhase.inert = true;
    deepPhase.innerHTML = '<p class="p-deep-copy">Изберете цвят за дълбокия горен ред. Ако не изберете, ще е същият като горния ред.</p>' +
      '<div class="p-deep-actions"><button type="button" class="p-deep-same is-on" aria-pressed="true">Като горния ред</button></div>' +
      '<input type="hidden" name="deep_finish" value="">';
    vision[0].after(deepPhase);
    const deepSame = deepPhase.querySelector('.p-deep-same'), deepInput = deepPhase.querySelector('input[name="deep_finish"]');
    const css = el('style');
    css.textContent = '.sf-page-p .p-deep-copy{margin:0 0 12px;font-size:14px;line-height:1.45;color:#2f372f}' +
      '.sf-page-p .p-deep-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:0 0 14px}' +
      '.sf-page-p .p-deep-same{min-height:38px;padding:6px 14px;border:1px solid #cfd4cb;border-radius:6px;background:#fff;color:#2f372f;font:inherit;font-size:13px;cursor:pointer}' +
      '.sf-page-p .p-deep-same.is-on{background:#2f372f;border-color:#2f372f;color:#fff}' +
      '.sf-page-p .p-global-progress-seg[hidden]{display:none}' +
      '.sf-page-p .p-sketch-title{margin:0 0 10px;font-size:15px;font-weight:600;color:#333533}';
    document.head.append(css);
    function paintDeepSame() { const same = !deepInput.value; deepSame.classList.toggle('is-on', same); deepSame.setAttribute('aria-pressed', String(same)); }
    deepSame.addEventListener('click', e => {
      e.preventDefault();
      if (window.pMaterialSelections && window.pMaterialSelections.clear) window.pMaterialSelections.clear('deep_finish');
      else { deepInput.value = ''; deepInput.dispatchEvent(new Event('change', { bubbles: true })); }
      paintDeepSame();
    });
    deepInput.addEventListener('change', paintDeepSame); page.addEventListener('p:material-chosen', () => setTimeout(paintDeepSame, 0));
    let deepShown = false;
    const deepOn = () => deepBox.checked;

    /* ---------------- answers: pills (single / multi), dimension pickers */
    const answered = q => !!q.querySelector('.option-pill.is-selected');
    const hasUppers = () => !!qTop.querySelector('.option-pill.is-selected');
    // a built-in microwave / coffee machine needs the oven tower; without it only the free-standing type is offered
    const builtNote = el('p', 'p-q-hint p-builtin-note', 'Микровълнова и кафе-машина за вграждане се поставят в колоната с фурна. Без колона изберете свободностоящ вариант.'); builtNote.hidden = true;
    function syncBuiltIn() {
      const tower = value(qOven) === 'yes';
      let any = false;
      ['microwave_type', 'coffee_machine_type'].forEach(n => {
        const sel = applCard.querySelector('select[name="' + n + '"]'); if (!sel) return;
        const o = sel.querySelector('option[value="built_in"]'); if (o) o.disabled = !tower;
        if (!tower && sel.value === 'built_in') { sel.value = ''; sel.dispatchEvent(new Event('change', { bubbles: true })); }
        any = true;
      });
      builtNote.hidden = tower || !any;
      if (!builtNote.isConnected) applCard.append(builtNote);
    }
    const value = q => { const p = q.querySelector('.option-pill.is-selected'); return p ? p.dataset.value : ''; };
    // the Webflow classes of these groups are display:none by default: show them with an inline style
    function showGroup(g, on) { g.classList.toggle('is-hidden', !on); if (on) g.style.setProperty('display', 'block', 'important'); else g.style.setProperty('display', 'none', 'important'); }
    function syncDependent() {
      const ch = value(qChim);
      showGroup(gChim, !!ch && ch !== 'none'); chimNote.hidden = !ch || ch === 'none';
      showGroup(gIsland, value(qIsland) === 'yes');
      const up = hasUppers(); qDeep.hidden = !up;   // no upper cabinets: no deep row question and no "Горен ред" step
      if (!up) qDeep.querySelectorAll('.option-pill.is-selected').forEach(p => { p.classList.remove('is-selected'); p.setAttribute('aria-pressed', 'false'); });
      const dv = value(qDeep); if ((dv === 'yes') !== deepBox.checked) { deepBox.checked = dv === 'yes'; deepBox.dispatchEvent(new Event('change', { bubbles: true })); }
      syncBuiltIn(); if (typeof paintProgress === 'function' && phases) paintProgress();
    }
    page.addEventListener('click', e => {
      const pill = e.target.closest('.p-flow .question-wrap[data-field] .option-pill'); if (!pill) return;
      e.preventDefault(); e.stopPropagation();
      const q = pill.closest('.question-wrap[data-field]'), multi = q.classList.contains('question-wrap-multi');
      if (multi) pill.classList.toggle('is-selected');
      else q.querySelectorAll('.option-pill').forEach(p => p.classList.toggle('is-selected', p === pill));
      q.querySelectorAll('.option-pill').forEach(p => p.setAttribute('aria-pressed', String(p.classList.contains('is-selected'))));
      syncDependent(); clearItem(q);
      page.dispatchEvent(new CustomEvent('p:answer', { bubbles: true, detail: { field: q.dataset.field } }));
    }, true);
    function pickerNum(box) { return parseInt(((box.querySelector('.picker-value-text') || box).textContent || '0').trim(), 10) || 0; }
    page.addEventListener('click', e => {
      const btn = e.target.closest('.p-flow .dimension-row .picker-btn'); if (!btn) return;
      e.preventDefault(); e.stopPropagation();
      const control = btn.closest('.meters-control,.centimeters-control'), row = btn.closest('.dimension-row'); if (!control || !row) return;
      const box = control.querySelector('.picker-value'); if (!box) return;
      const meters = control.classList.contains('meters-control'), cmOnly = !row.querySelector('.meters-control');
      const up = btn.classList.contains('meter-up') || btn.classList.contains('cm-up');
      const stepV = meters ? 1 : 5, max = meters ? 20 : (cmOnly ? 200 : 95);   // a cm-only row (chimney A/B, island width) may go past one metre
      const nv = Math.max(0, Math.min(max, pickerNum(box) + (up ? stepV : -stepV)));
      (box.querySelector('.picker-value-text') || box).textContent = String(nv);
      row.classList.add('is-touched'); clearItem(row);
      page.dispatchEvent(new CustomEvent('p:answer', { bubbles: true, detail: { dim: row.dataset.dim } }));
    }, true);
    page.querySelectorAll('.p-flow .picker-value').forEach(b => { const t = b.querySelector('.picker-value-text') || b; if (!t.textContent.trim()) t.textContent = '0'; });
    const rowMm = row => { let m = 0, c = 0; const mc = row.querySelector('.meters-control .picker-value'), cc = row.querySelector('.centimeters-control .picker-value'); if (mc) m = pickerNum(mc); if (cc) c = pickerNum(cc); return (m * 100 + c) * 10; };
    reset.addEventListener('click', e => {
      e.preventDefault();
      [qWater, qOven, qFridge, qTop, qDeep, qIsland].forEach(q => q.querySelectorAll('.option-pill').forEach(p => { p.classList.remove('is-selected'); p.setAttribute('aria-pressed', 'false'); }));
      gIsland.querySelectorAll('.dimension-row').forEach(r => { r.classList.remove('is-touched'); r.querySelectorAll('.picker-value').forEach(b => { (b.querySelector('.picker-value-text') || b).textContent = '0'; }); });
      syncDependent(); clearValidation(); page.dispatchEvent(new CustomEvent('p:answer', { bubbles: true, detail: { reset: true } }));
    });

    /* ---------------- validation (per item, like Prava/Aglova) */
    const visRows = g => [...g.querySelectorAll('.dimension-row')].filter(r => !g.classList.contains('is-hidden'));
    function itemsOf(s) {
      if (s === 1) return [qChim, ...visRows(gMain), ...(gChim.classList.contains('is-hidden') ? [] : visRows(gChim))];
      if (s === 2) return [qWater, qOven, qFridge, ...(hasUppers() ? [qDeep] : []), qIsland, ...(gIsland.classList.contains('is-hidden') ? [] : visRows(gIsland))];
      return [];
    }
    const isRow = n => n.classList.contains('dimension-row');
    const itemDone = n => isRow(n) ? rowMm(n) > 0 : answered(n);
    function check() {
      if (step === 1 || step === 2) { const miss = itemsOf(step).find(n => !itemDone(n)); if (miss) return miss; }
      if (step >= 3 && step <= 6 && !deepShown) {
        const f = vision[step - 3].querySelector('input[type="hidden"][name$="_finish"]');
        if (!(f && f.value)) return 'Изберете материал, за да продължим.';
      }
      return null;
    }
    function clearItem(n) {
      n.classList.remove('p-question-invalid', 'p-question-shake'); n.removeAttribute('aria-invalid');
      const h = n.querySelector(':scope > .question-hint'); if (h) h.hidden = true;
    }
    function clearValidation() { page.querySelectorAll('.p-flow .question-wrap,.p-flow .dimension-row').forEach(clearItem); error.hidden = true; error.textContent = ''; }
    function showMissing(n) {
      clearValidation();
      let h = n.querySelector(':scope > .question-hint');
      if (!h) { h = el('p', 'question-hint'); h.setAttribute('role', 'alert'); n.append(h); }
      h.textContent = isRow(n) ? 'Въведете размера, за да продължим.' : 'Изберете вариант, за да продължим.'; h.hidden = false; h.style.display = 'block';
      n.classList.add('p-question-invalid'); n.setAttribute('aria-invalid', 'true'); void n.offsetWidth; n.classList.add('p-question-shake');
      n.style.scrollMarginTop = 'calc(var(--p-sticky-top,128px) + 12px)'; n.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    page.addEventListener('animationend', e => { if (/config-shake$/.test(e.animationName)) e.target.classList.remove('p-question-shake'); });

    /* ---------------- render / navigation */
    let step = 1, leftStep2 = false;   // the 'Горен ред' step drops out of the count only once step 2 is answered without upper cabinets
    function show(node, on) { node.hidden = !on; node.inert = !on; if (on) node.style.setProperty('display', 'block', 'important'); else node.style.removeProperty('display'); }
    function stickyOffset() {
      const navbar = document.querySelector('[role="banner"],.navbar'), nh = navbar ? navbar.getBoundingClientRect().height : 0;
      page.style.setProperty('--p-progress-top', nh + 'px');
      page.style.setProperty('--p-sticky-top', (nh + Math.ceil(progress.getBoundingClientRect().height) + 16) + 'px');
    }
    window.addEventListener('resize', stickyOffset, { passive: true });
    function paintProgress() {   // also called when an answer adds / removes the upper-row or deep-row step
      const on = deepOn(), skipUp = leftStep2 && !hasUppers(), total = N + (on ? 1 : 0) - (skipUp ? 1 : 0);
      const shown = deepShown ? 4 : step + (on && step >= 4 ? 1 : 0) - (skipUp && step > 3 ? 1 : 0), title = deepShown ? 'Дълбок горен ред' : titles[step - 1];
      segs[2].hidden = skipUp;
      heading.textContent = title; pTitle.textContent = title; pCount.textContent = 'Стъпка ' + shown + ' от ' + total;
      progress.setAttribute('aria-valuemax', String(total)); progress.setAttribute('aria-valuenow', String(shown));
      track.style.setProperty('--p-steps', total); track.style.gridTemplateColumns = 'repeat(' + total + ',minmax(0,1fr))';
      segs.forEach((s, i) => { s.classList.toggle('is-done', i < step - 1 || (deepShown && i === 2)); s.classList.toggle('is-active', i === step - 1 && !deepShown); });
      deepSeg.hidden = !on; deepSeg.classList.toggle('is-active', deepShown); deepSeg.classList.toggle('is-done', on && step >= 4);
    }
    function render(scroll) {
      if (deepShown && (step !== 3 || !deepOn())) deepShown = false;
      phases.forEach((n, i) => show(n, i === step - 1 && !(deepShown && n === vision[0])));
      show(deepPhase, deepShown);
      flow.classList.toggle('p-flow-done', step === LAST);
      page.dataset.pFlowStep = String(step); flow.dataset.pFlowStep = String(step);
      stickyOffset();
      paintProgress();
      clearValidation(); back.disabled = step === 1; nav.hidden = step === LAST;   // the last step has its own Назад (finalNav)
      tools.hidden = step !== 2;
      page.dispatchEvent(new CustomEvent('p:phase-changed', { detail: { step, deep: deepShown } }));
      if (scroll) {
        const target = step === LAST ? finalPhase : (left || progress);
        const off = parseFloat(getComputedStyle(page).getPropertyValue('--p-sticky-top')) || 128;
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - off), behavior: 'auto' });
      }
    }
    function go(t, scroll = true) { t = Number(t); if (!Number.isInteger(t) || t < 1 || t > N) return; step = t; deepShown = false; render(scroll); }
    function showDeep(scroll = true) { if (!deepOn()) return; step = 3; deepShown = true; render(scroll); }
    page.addEventListener('click', e => {
      const c = e.target.closest('[data-p-nav]'); if (!c) return;
      e.preventDefault();
      if (c.dataset.pNav === 'next') {
        if (deepShown) { go(4); return; }
        const m = check();
        if (m) { if (typeof m === 'string') { error.textContent = m; error.hidden = false; } else showMissing(m); return; }
        if (step === 3 && deepOn()) { showDeep(); return; }
        if (step === 2) leftStep2 = true;
        if (step === 2 && !hasUppers()) { go(4); return; }
        go(step + 1);
      } else if (deepShown) { deepShown = false; render(true); }
      else if (step === 4 && deepOn()) showDeep();
      else if (step === 4 && !hasUppers()) go(2);
      else if (step > 1) go(step - 1);
    });
    deepBox.addEventListener('change', () => render(false));
    // the lead form carries every step-1/2 answer (the pills and pickers are not form fields themselves)
    const form = page.querySelector('#email-form') || extrasCard.closest('form');
    function hidden(name) {
      let i = form && form.querySelector('input[type="hidden"][name="' + name + '"]');
      if (!i && form) { i = document.createElement('input'); i.type = 'hidden'; i.name = name; i.dataset.name = name; form.append(i); }
      return i;
    }
    function syncHidden() {
      if (!form) return;
      [qChim, qWater, qOven, qFridge, qTop, qDeep, qIsland].forEach(q => {
        const sel = [...q.querySelectorAll('.option-pill.is-selected')].map(p => p.textContent.trim()).join(', ');
        const h = hidden(q.dataset.field === 'deep-cabinets' ? 'deep_row_p' : q.dataset.field); if (h) h.value = sel;
      });
      page.querySelectorAll('.p-flow .dimension-row[data-dim]').forEach(r => { const h = hidden(r.dataset.dim); if (h) h.value = rowMm(r) ? (rowMm(r) / 10) + ' см' : ''; });
    }
    page.addEventListener('p:answer', syncHidden); syncHidden();
    window.pGoToStep = go;
    window.pFlow = { getStep: () => step, validate: check, showDeep: showDeep, isDeepShown: () => deepShown, value: f => { const q = f === 'deep-cabinets' ? qDeep : Q(f); return q ? (q.classList.contains('question-wrap-multi') ? [...q.querySelectorAll('.option-pill.is-selected')].map(p => p.dataset.value) : value(q)) : ''; }, rowMm: k => { const r = page.querySelector('.dimension-row[data-dim="' + k + '"]'); return r ? rowMm(r) : 0; } };
    syncDependent(); render(false);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true });
  else setTimeout(init, 0);
})();
