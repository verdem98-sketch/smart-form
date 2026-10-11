/* Aglova unified flow: all steps run in the right card (progress + Назад/Напред), same model as prava-flow.js.
   The aglova-smart-form.js engine still owns questions, CAD sketch, dimensions, booking and submit. */
(function () {
  'use strict';
  function init() {
    const page = document.querySelector('.flow-aglova');
    if (!page || page.dataset.agFlow) return;
    const right = page.querySelector('.combo-dim-phase');
    const comboWrap = page.querySelector('.combo-phase-wrap');
    const dimWrap = page.querySelector('.dimensions-phase-wrap');
    const finalPhase = page.querySelector('.final-phase');
    const cards = [...page.querySelectorAll('.prava-extras-card')];
    const vision = ['upper', 'lower', 'countertop', 'backsplash'].map(r => page.querySelector('[data-field="' + r + '_finish"]'));
    const left = page.querySelector('.sticky-cad-wrap');
    // Step 9: AI visualization card (aglova-ai.js adds the summary, states and corrections). Same copy as Prava.
    const aiPhase = document.createElement('section'); aiPhase.className = 'ag-ai-phase';
    aiPhase.innerHTML = '<div id="aglova-ai-card-v1"><h3>Виж кухнята си като реална визия</h3><p>Ще създадем една ориентировъчна реалистична визуализация на база избраната конфигурация, размери, материали, уреди и екстри.</p><button id="aglova-ai-generate-button" type="button">Генерирай AI визуализация</button></div>';
    const phases = [comboWrap, dimWrap, ...vision, cards[0], cards[1], aiPhase, finalPhase];
    if (!right || phases.some(n => !n)) { console.warn('aglova-flow: phase contract incomplete'); return; }
    page.dataset.agFlow = '1';
    const titles = ['Конфигурация', 'Размери', 'Горен ред', 'Долен ред', 'Плот', 'Гръб', 'Електроуреди', 'Допълнителни екстри', 'AI визуализация', 'Последна стъпка'];
    const N = titles.length;
    const LAST = N;
    // move every step into the right card
    phases.forEach((node, i) => {
      if (node !== finalPhase && node.parentNode !== right) right.append(node); // final stays in .aglova-workspace: the engine's final-only mode hides .aglova-left
      node.classList.remove('aglova-side-reveal', 'aglova-up-reveal', 'aglova-next-scale-reveal', 'from-left', 'from-right', 'is-visible');
      node.classList.add('ag-stepnode'); node.dataset.agPhase = String(i + 1);
      node.querySelectorAll('.aglova-side-reveal,.aglova-up-reveal,.aglova-next-scale-reveal').forEach(n => n.classList.add('is-visible'));
    });
    // superseded nodes
    ['.seo-text', '.extras-wrap', '.phase-next-btn', '.question-back-btn', '.question-next-btn', '.nav-btn', '.sf-back-link']
      .forEach(sel => page.querySelectorAll(sel).forEach(n => { if (!finalPhase.contains(n)) n.dataset.agHide = '1'; }));
    page.querySelectorAll('.extras-vision-phase,.vision-phase-prava').forEach(n => { if (!finalPhase.contains(n)) n.dataset.agHide = '1'; }); // old step-9 leftovers ("Посока за визия"); the AI card is ours now
    page.querySelectorAll('.aglova-workspace').forEach(n => { if (!n.querySelector('.ag-stepnode')) n.dataset.agHide = '1'; });
    page.querySelectorAll('.aglova-right').forEach(n => { if (!n.querySelector('.ag-stepnode')) n.dataset.agHide = '1'; });
    const resetBtn = page.querySelector('.nav-reset');
    // Deep upper row: a step-1 question in Prava ("Дълбок горен ред" НЕ/ДА). Aglova's template only has an empty placeholder,
    // so build the question here; the answer drives the hidden "deep_cabinets" extras checkbox the AI payload and summary already read.
    const deepQ = comboWrap.querySelector('.question-deep-cabinets');
    const deepBox = page.querySelector('label[data-field="deep_cabinets"] input[type="checkbox"]');
    if (deepQ && deepBox && !deepQ.querySelector('.option-pill')) {
      deepQ.innerHTML = '<div class="question-title water-question-spacing"><div>Искате ли дълбок горен ред?</div></div>' +
        '<div class="options-row"><a data-value="no" href="#" class="option-pill deep-cabinets-no w-button">НЕ</a><a data-value="yes" href="#" class="option-pill deep-cabinets-yes w-button">ДА</a></div>';
      deepQ.addEventListener('click', e => {
        const pill = e.target.closest('.option-pill'); if (!pill) return;
        e.preventDefault();
        deepQ.querySelectorAll('.option-pill').forEach(p => { const on = p === pill; p.classList.toggle('active', on); p.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        deepBox.checked = pill.dataset.value === 'yes';
        deepBox.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    const questions = [...comboWrap.querySelectorAll('[data-field]')].filter(q => q.querySelector('.option-pill'));
    // header / progress
    const progress = document.createElement('div'); progress.className = 'ag-global-progress';
    progress.setAttribute('role', 'progressbar'); progress.setAttribute('aria-valuemin', '0'); progress.setAttribute('aria-valuemax', String(N));
    const head = document.createElement('div'); head.className = 'ag-global-progress-head';
    const pTitle = document.createElement('div'); pTitle.className = 'ag-global-progress-title';
    const pCount = document.createElement('div'); pCount.className = 'ag-global-progress-count'; pCount.setAttribute('aria-live', 'polite');
    head.append(pTitle, pCount);
    const track = document.createElement('div'); track.className = 'ag-global-progress-track'; track.style.setProperty('--ag-steps', N);
    const segs = titles.map((_, i) => { const s = document.createElement('div'); s.className = 'ag-global-progress-seg'; track.append(s); return s; });
    progress.append(head, track);
    const grid = page.querySelector('.aglova-left');
    grid.parentNode.insertBefore(progress, grid);
    const heading = document.createElement('h2'); heading.className = 'ag-step-heading';
    const header = document.createElement('div'); header.className = 'ag-step-header'; header.append(heading); right.prepend(header);
    const tools = document.createElement('div'); tools.className = 'ag-config-tools';
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'ag-config-reset'; reset.textContent = 'Нулиране';
    tools.append(reset); comboWrap.prepend(tools);
    const error = document.createElement('p'); error.className = 'ag-validation'; error.setAttribute('role', 'alert'); error.hidden = true;
    const nav = document.createElement('div'); nav.className = 'ag-navigation';
    const back = document.createElement('button'), next = document.createElement('button');
    back.type = next.type = 'button'; back.textContent = '← Назад'; next.textContent = 'Напред →';
    back.dataset.agNav = 'back'; next.dataset.agNav = 'next'; nav.append(back, next);
    right.append(error, nav);
    const finalBack = document.createElement('button'); finalBack.type = 'button'; finalBack.dataset.agNav = 'back'; finalBack.textContent = '← Назад';
    const finalNav = document.createElement('div'); finalNav.className = 'ag-navigation ag-final-nav'; finalNav.append(finalBack); finalPhase.prepend(finalNav);
    function stickyOffset() {
      const navbar = document.querySelector('[role="banner"],.navbar'), navbarHeight = navbar?.getBoundingClientRect().height || 0;
      page.style.setProperty('--ag-progress-top', navbarHeight + 'px');
      page.style.setProperty('--ag-sticky-top', (navbarHeight + Math.ceil(progress.getBoundingClientRect().height) + 16) + 'px');
    }
    window.addEventListener('resize', stickyOffset, { passive: true });
    let step = 1;
    function show(node, on) { node.hidden = !on; node.inert = !on; if (on) { node.style.setProperty('display', 'block', 'important'); } else node.style.removeProperty('display'); }
    function unhideQuestions() { questions.forEach(q => { q.style.setProperty('display', 'block', 'important'); q.style.opacity = '1'; q.hidden = false; }); }
    const answered = q => !!q.querySelector('.option-pill.active,.option-pill.is-selected');
    function dimsOk() {
      const rows = [...dimWrap.querySelectorAll('.dimension-row')].filter(r => r.offsetParent !== null);
      return rows.length > 0 && rows.every(r => r.classList.contains('is-touched'));
    }
    function check() {
      if (step === 1 && !questions.every(answered)) return 'Изберете вариант за всеки въпрос.';
      if (step === 2 && !dimsOk()) return 'Въведете всички приложими размери.';
      if (step >= 3 && step <= 6) {
        const f = vision[step - 3].querySelector('input[type="hidden"][name]');
        const has = vision[step - 3].querySelector('.vm-selected,.vision-card.is-selected,.vision-card.active') || (f && f.value);
        if (!has) return 'Изберете материал, за да продължим.';
      }
      return '';
    }
    function render(scroll) {
      phases.forEach((n, i) => show(n, i === step - 1));
      if (step === 1) unhideQuestions();
      page.dataset.agStep = String(step);
      stickyOffset();
      heading.textContent = titles[step - 1];
      pTitle.textContent = titles[step - 1]; pCount.textContent = 'Стъпка ' + step + ' от ' + N;
      progress.setAttribute('aria-valuenow', String(step));
      segs.forEach((s, i) => { s.classList.toggle('is-done', i < step - 1); s.classList.toggle('is-active', i === step - 1); });
      clearValidation(); back.disabled = step === 1; next.hidden = step === LAST; error.hidden = true; error.textContent = '';
      tools.hidden = step !== 1;
      page.dispatchEvent(new CustomEvent('ag:phase-changed', { detail: { step } }));
      if (scroll) {
        // The progress bar is sticky, so scrolling it into view does nothing once it is pinned. Put the top of the step
        // (right card + sketch) just under it, so every new step starts at its top whatever the previous scroll was.
        const target = step === LAST ? phases[LAST - 1] : (heading.closest('.aglova-left') || progress);
        const offset = (parseFloat(getComputedStyle(page).getPropertyValue('--ag-sticky-top')) || 128);
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - offset), behavior: 'auto' });
      }
    }
    // Per-item validation like Prava: hint under the unanswered question/row, outline, short shake, scroll to it.
    const HINTS = { 1: 'Изберете вариант, за да продължим.', 2: 'Въведете размера, за да продължим.' };
    const dimRows = () => [...dimWrap.querySelectorAll('.dimension-row')].filter(r => r.offsetParent !== null);
    questions.forEach((q, i) => {
      let hint = q.querySelector(':scope > .question-hint');
      if (!hint) { hint = document.createElement('p'); hint.className = 'question-hint'; q.append(hint); }
      hint.id = hint.id || 'ag-config-hint-' + i; hint.setAttribute('role', 'alert'); hint.hidden = true;
      q.tabIndex = -1; q.setAttribute('role', 'group');
    });
    function itemsOf(s) { return s === 1 ? questions : s === 2 ? dimRows() : []; }
    function itemDone(s, n) { return s === 1 ? answered(n) : n.classList.contains('is-touched'); }
    function clearItem(n) {
      n.classList.remove('ag-question-invalid', 'ag-question-shake'); n.removeAttribute('aria-invalid');
      const h = n.querySelector(':scope > .question-hint'); if (h) h.hidden = true;
      n.removeAttribute('aria-describedby');
    }
    function clearValidation() { [...questions, ...dimWrap.querySelectorAll('.dimension-row')].forEach(clearItem); }
    function showMissing(n) {
      clearValidation(); error.hidden = true; error.textContent = '';
      let h = n.querySelector(':scope > .question-hint');
      if (!h) { h = document.createElement('p'); h.className = 'question-hint'; h.id = 'ag-hint-' + Math.random().toString(36).slice(2, 7); h.setAttribute('role', 'alert'); n.append(h); }
      h.textContent = HINTS[step] || ''; h.hidden = false;
      n.classList.add('ag-question-invalid'); n.setAttribute('aria-invalid', 'true'); n.setAttribute('aria-describedby', h.id);
      void n.offsetWidth; n.classList.add('ag-question-shake');          // restart the animation if Next is pressed twice
      n.style.scrollMarginTop = 'calc(var(--ag-sticky-top,128px) + 12px)';
      n.scrollIntoView({ behavior: 'auto', block: 'start' });
      if (!n.hasAttribute('tabindex')) n.tabIndex = -1;
      n.focus({ preventScroll: true });
    }
    page.addEventListener('animationend', e => { if (/config-shake$/.test(e.animationName)) e.target.classList.remove('ag-question-shake'); });
    // answering clears that item's message
    ['click', 'input', 'change'].forEach(ev => page.addEventListener(ev, () => setTimeout(() => {
      if (step !== 1 && step !== 2) return;
      itemsOf(step).forEach(n => { if (n.classList.contains('ag-question-invalid') && itemDone(step, n)) clearItem(n); });
    }, 0)));
    function go(t, scroll = true) { t = Number(t); if (!Number.isInteger(t) || t < 1 || t > N) return; step = t; render(scroll); }
    page.addEventListener('click', e => {
      if (e.target.closest('.ag-config-reset')) { if (deepQ) { deepQ.querySelectorAll('.option-pill').forEach(p => { p.classList.remove('active'); p.setAttribute('aria-pressed', 'false'); }); if (deepBox) deepBox.checked = false; } if (resetBtn) resetBtn.click(); setTimeout(unhideQuestions, 0); return; }
      const c = e.target.closest('[data-ag-nav]'); if (!c) { if (step === 1) setTimeout(unhideQuestions, 0); return; }
      e.preventDefault();
      if (c.dataset.agNav === 'next') {
        const m = check();
        if (m) {
          const missing = (step === 1 || step === 2) ? itemsOf(step).find(n => !itemDone(step, n)) : null;
          if (missing) showMissing(missing); else { error.textContent = m; error.hidden = false; }
          return;
        }
        go(step + 1);
      }
      else if (step > 1) go(step - 1);
    });
    window.agGoToStep = go; window.agFlow = { getStep: () => step, validate: check };
    // keep step 1 questions all visible when the engine re-hides them
    let busy = false;
    new MutationObserver(() => { if (step !== 1 || busy) return; busy = true; unhideQuestions(); setTimeout(() => { busy = false; }, 0); }).observe(comboWrap, { attributes: true, subtree: true, attributeFilter: ['style', 'hidden', 'class'] });
    render(false);

    // Sketch stays in its own slot with CSS position:sticky (see aglova-flow.css). The JS fixed pin from Prava
    // (prava-preview-fixed-pin-v3) was removed: with Aglova's wider legacy layout it detached the sketch and stretched it over the page.
  }
  if (document.readyState === 'complete') setTimeout(init, 0);
  else document.addEventListener('DOMContentLoaded', () => setTimeout(init, 0), { once: true }); // after the engine's own DOMContentLoaded handlers
})();
