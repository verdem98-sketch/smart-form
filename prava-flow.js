/* Straight Kitchen phase ownership. Geometry, collection and booking have separate owners. */
(function () {
  'use strict';
  function init() {
    const page = document.querySelector('.sf-page-prava');
    if (!page || page.dataset.canonicalFlow) return;
    page.dataset.canonicalFlow = '1';
    const columns = page.querySelector('.sf-header-left.sf-left-prava');
    const right = page.querySelector('.combo-dim-phase');
    const aiParent = page.querySelector('.extras-vision-phase');
    const cards = [...page.querySelectorAll('.prava-extras-card')];
    const phases = [page.querySelector('.combo-phase-prava'), page.querySelector('.dimensions-phase-prava'),
      ...['upper','lower','countertop','backsplash'].map(role => page.querySelector('[data-field="'+role+'_finish"]')),
      cards[0], cards[1], page.querySelector('.seo-text'), page.querySelector('.final-phase-prava')];
    if (phases.some(node => !node)) throw new Error('Straight Kitchen phase contract is incomplete');
    const titles = ['Конфигурация','Размери','Горен ред','Долен ред','Плот','Гръб','Електроуреди','Допълнителни екстри','AI визуализация','Последна стъпка'];
    const finalTitle=page.querySelector('.final-title-subtitle');if(finalTitle)phases[9].prepend(finalTitle);
    const finalBack=document.createElement('button');finalBack.type='button';finalBack.dataset.pravaNav='back';finalBack.textContent='← Назад';
    const finalNav=document.createElement('div');finalNav.className='prava-navigation prava-final-nav';finalNav.append(finalBack);phases[9].prepend(finalNav);
    const inspirationTitle=phases[9].querySelector('.inspiration-card-title-subtitle .phase-title');if(inspirationTitle)inspirationTitle.textContent='Посока за визия';
    [...aiParent.children].forEach(node=>{if(node!==phases[8]){node.hidden=true;node.inert=true;}});
    [...phases[8].children].forEach(node=>{if(!node.querySelector('#prava-ai-generate-button')){node.hidden=true;node.inert=true;}});
    const heading = document.createElement('h2');
    heading.className = 'prava-step-heading'; heading.id = 'prava-step-heading';
    right.prepend(heading);
    const progress = document.createElement('div');
    progress.className = 'prava-progress'; progress.setAttribute('aria-live','polite');
    right.prepend(progress);
    const header=document.createElement('div');header.className='prava-step-header';header.append(progress,heading);right.prepend(header);
    const nav = document.createElement('div'); nav.className = 'prava-navigation';
    const back = document.createElement('button'), next = document.createElement('button');
    back.type = next.type = 'button'; back.textContent = '← Назад'; next.textContent = 'Напред →';
    back.dataset.pravaNav = 'back'; next.dataset.pravaNav = 'next'; nav.append(back,next);
    right.append(nav);
    const error = document.createElement('p'); error.className = 'prava-validation'; error.setAttribute('role','alert'); error.hidden = true;
    right.insertBefore(error,nav);
    // Remove only superseded local navigation and titles; retain the native final submit.
    page.querySelectorAll('.nav-next,.nav-back,.phase-next-btn,.sf-back-link,#prava-appliance-heading-wrap,#prava-extras-heading-wrap,#prava-ai-heading-wrap,#prava-sizes-heading,.combo-head,.extras-wrap,[id$="-material-heading"]').forEach(node => { node.hidden = true; node.inert = true; });
    phases.slice(0,9).forEach((node,index) => {
      node.dataset.pravaPhase = String(index+1);
      node.style.removeProperty('display'); node.style.removeProperty('visibility'); node.style.removeProperty('opacity');
      node.style.removeProperty('transform');
      if(index<6) node.querySelectorAll(':scope > .question-title,:scope > .question-subtitle,:scope > .title-subtitle').forEach(n=>{n.hidden=true;});
    });
    // Webflow interactions must not fade or translate inactive phases back into view.
    [columns,right,aiParent,...page.querySelectorAll('.question-wrap-prava')].forEach(n => {
      if(!n)return; ['display','visibility','opacity','transform'].forEach(p=>n.style.removeProperty(p));
    });
    let step = 1;
    function stickyOffset(){const navbar=document.querySelector('[role="banner"],.navbar');page.style.setProperty('--prava-sticky-top',((navbar?.getBoundingClientRect().height||0)+16)+'px');}
    stickyOffset();window.addEventListener('resize',stickyOffset,{passive:true});
    function visible(node,on) { if(!node)return; node.hidden=!on; node.inert=!on; }
    function islandEnabled() {
      const pill=page.querySelector('[data-field="island"] .is-selected,[data-field="island"] .active');
      return pill && /^(yes|да)$/i.test(pill.dataset.value||'');
    }
    function check() {
      if(step===1) {
        const missing=[...page.querySelectorAll('.question-wrap-prava[data-field]')].find(n=>!n.querySelector('.option-pill.is-selected,.option-pill.active'));
        if(missing) return 'Изберете вариант за всеки въпрос.';
      }
      if(step===2) {
        const keys=['len_prava_3','height_prava_3'];
        if(islandEnabled()) keys.push('island_len_3a','island_width_3a');
        for(const key of keys) {
          const row=page.querySelector('.dimension-row[data-dim="'+key+'"]');
          const number=selector=>Number((row.querySelector(selector+' .picker-value-text')||row.querySelector(selector+' .picker-value'))?.textContent||0);
          if(number('.meters-control')*100+number('.centimeters-control')<=0) return 'Въведете всички приложими размери.';
        }
      }
      return '';
    }
    function render(scroll) {
      phases.forEach((node,i)=>visible(node,i===step-1));
      visible(columns,step!==10); visible(aiParent,step===9); visible(nav,step!==10); visible(heading,step!==10); visible(progress,step!==10);
      const standard=page.querySelector('.sf-header-center'), final=page.querySelector('.final-title-subtitle');
      visible(standard,step!==10); visible(final,step===10);
      page.dataset.pravaStep=String(step); page.dataset.pravaFlow=step===10?'final':step===1?'config':step===2?'dimensions':'vision';
      page.dataset.pravaMaterialStep=String(Math.max(0,step-3));
      heading.textContent=titles[step-1]; progress.textContent='Стъпка '+step+' от 10';
      back.disabled=step===1; error.hidden=true; error.textContent='';
      const headerBack=page.querySelector('.prava-back-control-v3'); if(headerBack) headerBack.hidden=step===1;
      page.dispatchEvent(new CustomEvent('prava:phase-changed',{detail:{step}}));
      if(scroll) (step===10?phases[9]:right).scrollIntoView({behavior:'auto',block:'start'});
    }
    function go(target,scroll=true) { const value=Number(target); if(!Number.isInteger(value)||value<1||value>10)return; step=value; render(scroll); }
    page.addEventListener('click',event=>{
      const control=event.target.closest('[data-prava-nav],.prava-back-control-v3'); if(!control)return;
      event.preventDefault();
      if(control.dataset.pravaNav==='next') {
        const message=check(); if(message){error.textContent=message;error.hidden=false;return;} go(step+1);
      } else if(step>1) go(step-1);
    });
    window.pravaGoToStep=go;
    window.pravaFlow={getStep:()=>step,validate:check};
    render(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
