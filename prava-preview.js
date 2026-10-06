/* Explicit preview states. Never watch DOM mutations or change the generation payload. */
(function(){
  'use strict';
  function init(){
    const page=document.querySelector('.sf-page-prava'), card=page?.querySelector('.sticky-cad-wrap'),stage=card?.querySelector('.cad-stage');
    if(!stage||window.pravaPreview)return;
    card.classList.add('prava-preview-card'); card.dataset.previewState='planner';
    const image=document.createElement('img'); image.className='prava-generated-image'; image.alt='AI визуализация на избраната кухня'; image.hidden=true;
    const heading=card.querySelector('#prava-sketch-heading'),plannerTitle='Преглед на кухнята';
    stage.append(image);
    const status=document.createElement('div');status.className='prava-preview-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.hidden=true;
    const text=document.createElement('p'),retry=document.createElement('button');retry.type='button';retry.textContent='Опитайте отново';retry.hidden=true;status.append(text,retry);stage.append(status);
    const summaries=document.createElement('div');summaries.className='prava-material-summary';card.append(summaries);
    const roles=[['upper','Горен ред'],['lower','Долен ред'],['countertop','Плот'],['backsplash','Гръб']];
    roles.forEach(([role,label])=>{const item=document.createElement('div');item.dataset.role=role;const img=document.createElement('img'),name=document.createElement('span');img.alt=label;img.hidden=true;name.textContent=label;item.append(img,name);summaries.append(item);});
    let hasImage=false,revision=0;
    function state(value,message){
      card.dataset.previewState=value;stage.setAttribute('aria-busy',String(value==='loading'));
      if(heading)heading.textContent=hasImage?'Вашата AI визуализация':plannerTitle;
      if(value==='loading'&&window.innerWidth<768)card.scrollIntoView({behavior:'auto',block:'start'});
      status.hidden=value==='planner'||value==='generated';retry.hidden=value!=='error';
      text.textContent=value==='loading'?'Създаваме Вашата визуализация…':message||'Визуализацията не можа да бъде създадена. Опитайте отново.';
      summaries.hidden=hasImage;
      stage.querySelectorAll('.cad-img,.cad-img-kitchen,.cad-img-deep_cabinets,.cad-img-island,.cad-img-base').forEach(n=>n.classList.toggle('prava-cad-replaced',hasImage));
    }
    function showImage(url){
      const token=++revision;
      return new Promise((resolve,reject)=>{
        const candidate=new Image();
        candidate.onload=()=>{if(token!==revision){resolve(false);return;}image.src=url;image.hidden=false;hasImage=true;state('generated');resolve(true);};
        candidate.onerror=()=>reject(new Error('Полученото изображение не може да се зареди.'));
        candidate.src=url;
      });
    }
    function materials(){roles.forEach(([role,label])=>{
      const value=window.pravaMaterialSelections?.get(role+'_finish'),item=summaries.querySelector('[data-role="'+role+'"]'),img=item.querySelector('img');
      img.hidden=!value?.sampleImageUrl;if(value?.sampleImageUrl)img.src=value.sampleImageUrl;
      item.querySelector('span').textContent=label+(value?' · '+(value.displayName||value.label||value.id):'');
    });}
    page.addEventListener('change',event=>{if(roles.some(([role])=>event.target.name===role+'_finish'))materials();});
    retry.addEventListener('click',()=>document.getElementById('prava-ai-generate-button')?.click());
    window.pravaPreview={setState:state,showImage,getState:()=>card.dataset.previewState};materials();state('planner');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
