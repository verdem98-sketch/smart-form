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
    // Restore the archived segmented presentation; the existing step owns every update.
    const progress = page.querySelector('.prava-global-progress') || document.createElement('div');
    progress.className = 'prava-global-progress'; progress.hidden = false; progress.inert = false;
    progress.setAttribute('role','progressbar'); progress.setAttribute('aria-label','Напредък на конфигуратора');
    progress.setAttribute('aria-valuemin','0'); progress.setAttribute('aria-valuemax',String(titles.length));
    const progressHead=document.createElement('div');progressHead.className='prava-global-progress-head';
    const progressTitle=document.createElement('div');progressTitle.className='prava-global-progress-title';
    const progressCount=document.createElement('div');progressCount.className='prava-global-progress-count';progressCount.setAttribute('aria-live','polite');
    progressHead.append(progressTitle,progressCount);
    const progressTrack=document.createElement('div');progressTrack.className='prava-global-progress-track';progressTrack.setAttribute('aria-hidden','true');
    const segments=titles.map((_,index)=>{const segment=document.createElement('div');segment.className='prava-global-progress-seg';segment.dataset.step=String(index+1);progressTrack.append(segment);return segment;});
    progress.replaceChildren(progressHead,progressTrack);columns.before(progress);
    const header=document.createElement('div');header.className='prava-step-header';header.append(heading);right.prepend(header);
    const configQuestions=[...phases[0].querySelectorAll('.question-wrap-prava[data-field]')];
    configQuestions.forEach(question=>{
      question.querySelectorAll('[data-action="reset-prava"]').forEach(node=>node.remove());
      question.querySelectorAll('.question-head').forEach(node=>{node.hidden=true;node.inert=true;});
      question.querySelectorAll('.question-text').forEach(node=>{if(!node.textContent.trim())node.hidden=true;});
      let hint=question.querySelector('.question-hint');
      if(!hint){hint=document.createElement('p');hint.className='question-hint';question.append(hint);}
      hint.id=hint.id||'prava-config-hint-'+question.dataset.field;hint.setAttribute('role','alert');hint.hidden=true;
      question.tabIndex=-1;question.setAttribute('role','group');
      const title=question.querySelector('.question-title');if(title){title.id=title.id||'prava-config-title-'+question.dataset.field;question.setAttribute('aria-labelledby',title.id);}
    });
    const configTools=document.createElement('div');configTools.className='prava-config-tools';
    const reset=document.createElement('button');reset.type='button';reset.className='prava-config-reset';reset.dataset.action='reset-prava';reset.textContent='Нулиране';reset.setAttribute('aria-label','Нулиране на конфигурацията');
    configTools.append(reset);phases[0].prepend(configTools);

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
    function stickyOffset(){
      const navbar=document.querySelector('[role="banner"],.navbar'),navbarHeight=navbar?.getBoundingClientRect().height||0;
      page.style.setProperty('--prava-progress-top',navbarHeight+'px');
      page.style.setProperty('--prava-sticky-top',(navbarHeight+Math.ceil(progress.getBoundingClientRect().height)+16)+'px');
    }
    window.addEventListener('resize',stickyOffset,{passive:true});
    function visible(node,on) { if(!node)return; node.hidden=!on; node.inert=!on; }
    function islandEnabled() {
      const pill=page.querySelector('[data-field="island"] .is-selected,[data-field="island"] .active');
      return pill && /^(yes|да)$/i.test(pill.dataset.value||'');
    }
    function firstMissingQuestion(){return configQuestions.find(question=>!question.querySelector('.option-pill.is-selected,.option-pill.active'));}
    function clearQuestionValidation(question){
      question.classList.remove('prava-question-invalid','prava-question-shake');question.removeAttribute('aria-invalid');
      const hint=question.querySelector('.question-hint');hint.hidden=true;
      const described=(question.getAttribute('aria-describedby')||'').split(/\s+/).filter(id=>id&&id!==hint.id);
      if(described.length)question.setAttribute('aria-describedby',described.join(' '));else question.removeAttribute('aria-describedby');
    }
    function clearConfigValidation(){configQuestions.forEach(clearQuestionValidation);}
    function showMissingQuestion(question){
      clearConfigValidation();error.hidden=true;error.textContent='';
      const hint=question.querySelector('.question-hint');hint.textContent=hint.textContent.trim()||'Изберете вариант, за да продължим.';hint.hidden=false;
      question.classList.add('prava-question-invalid');question.setAttribute('aria-invalid','true');
      const described=(question.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean);if(!described.includes(hint.id))described.push(hint.id);question.setAttribute('aria-describedby',described.join(' '));
      // Restart a short local animation even if Next is pressed twice on the same question.
      void question.offsetWidth;question.classList.add('prava-question-shake');
      question.style.scrollMarginTop='calc(var(--prava-sticky-top,128px) + '+Math.ceil(header.getBoundingClientRect().height+12)+'px)';
      question.scrollIntoView({behavior:'auto',block:'start'});question.focus({preventScroll:true});
    }
    phases[0].addEventListener('animationend',event=>{if(event.animationName==='prava-config-shake')event.target.classList.remove('prava-question-shake');});
    page.addEventListener('change',event=>{
      const question=configQuestions.find(node=>node.dataset.field===event.target.name);
      if(question&&question.querySelector('.option-pill.is-selected,.option-pill.active'))clearQuestionValidation(question);
    });
    function check() {
      if(step===1) {
        const missing=firstMissingQuestion();
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
      clearConfigValidation();
      phases.forEach((node,i)=>visible(node,i===step-1));
      visible(columns,step!==10); visible(aiParent,step===9); visible(nav,step!==10); visible(heading,step!==10);
      const standard=page.querySelector('.sf-header-center'), final=page.querySelector('.final-title-subtitle');
      visible(standard,step!==10); visible(final,step===10);
      page.dataset.pravaStep=String(step); page.dataset.pravaFlow=step===10?'final':step===1?'config':step===2?'dimensions':'vision';
      page.dataset.pravaMaterialStep=String(Math.max(0,step-3));
      heading.textContent=titles[step-1];
      progressTitle.textContent=titles[step-1];progressCount.textContent='Стъпка '+step+' от '+titles.length;
      progress.setAttribute('aria-valuenow',String(step));progress.setAttribute('aria-valuetext',progressCount.textContent+' — '+titles[step-1]);
      segments.forEach((segment,index)=>{segment.classList.toggle('is-done',index<step-1);segment.classList.toggle('is-active',index===step-1);});
      stickyOffset();
      back.disabled=step===1; error.hidden=true; error.textContent='';
      const headerBack=page.querySelector('.prava-back-control-v3'); if(headerBack) headerBack.hidden=step===1;
      page.dispatchEvent(new CustomEvent('prava:phase-changed',{detail:{step}}));
      if(scroll) (step===10?phases[9]:right).scrollIntoView({behavior:'auto',block:'start'});
    }
    function go(target,scroll=true) { const value=Number(target); if(!Number.isInteger(value)||value<1||value>10)return; step=value; render(scroll); }
    page.addEventListener('click',event=>{
      if(event.target.closest('.prava-config-reset')){clearConfigValidation();error.hidden=true;error.textContent='';return;}
      const control=event.target.closest('[data-prava-nav],.prava-back-control-v3'); if(!control)return;
      event.preventDefault();
      if(control.dataset.pravaNav==='next') {
        const message=check(); if(message){if(step===1)showMissingQuestion(firstMissingQuestion());else{error.textContent=message;error.hidden=false;}return;} go(step+1);
      } else if(step>1) go(step-1);
    });
    window.pravaGoToStep=go;
    window.pravaFlow={getStep:()=>step,validate:check};
    render(false);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
