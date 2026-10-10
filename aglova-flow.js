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
    const phases = [comboWrap, dimWrap, ...vision, cards[0], cards[1], finalPhase];
    if (!right || phases.some(n => !n)) { console.warn('aglova-flow: phase contract incomplete'); return; }
    page.dataset.agFlow = '1';
    const titles = ['Конфигурация', 'Размери', 'Горен ред', 'Долен ред', 'Плот', 'Гръб', 'Електроуреди', 'Допълнителни екстри', 'Последна стъпка'];
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
    page.querySelectorAll('.aglova-workspace').forEach(n => { if (!n.querySelector('.ag-stepnode')) n.dataset.agHide = '1'; });
    page.querySelectorAll('.aglova-right').forEach(n => { if (!n.querySelector('.ag-stepnode')) n.dataset.agHide = '1'; });
    const resetBtn = page.querySelector('.nav-reset');
    const questions = [...comboWrap.querySelectorAll('[data-field]')].filter(q => q.querySelector('.option-pill') && !q.classList.contains('question-deep-cabinets'));
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
      back.disabled = step === 1; next.hidden = step === LAST; error.hidden = true; error.textContent = '';
      tools.hidden = step !== 1;
      page.dispatchEvent(new CustomEvent('ag:phase-changed', { detail: { step } }));
      if (scroll) progress.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
    function go(t, scroll = true) { t = Number(t); if (!Number.isInteger(t) || t < 1 || t > N) return; step = t; render(scroll); }
    page.addEventListener('click', e => {
      if (e.target.closest('.ag-config-reset')) { if (resetBtn) resetBtn.click(); setTimeout(unhideQuestions, 0); return; }
      const c = e.target.closest('[data-ag-nav]'); if (!c) { if (step === 1) setTimeout(unhideQuestions, 0); return; }
      e.preventDefault();
      if (c.dataset.agNav === 'next') { const m = check(); if (m) { error.textContent = m; error.hidden = false; return; } go(step + 1); }
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
