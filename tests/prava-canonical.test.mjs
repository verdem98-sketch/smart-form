import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {buildStraightKitchenScene} from '../../backend/tests/scene-runtime.mjs';
const fixture=fs.readFileSync(new URL('./fixtures/prava-canonical.html',import.meta.url),'utf8');
const files=['prava-smart-form.js','prava-material-gallery.js','prava-flow.js','prava-preview.js','prava-submit.js','webflow/prava-ai-visualization.js'];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function setup(t,storage,configure){
 const errors=[],console=new VirtualConsole();console.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fixture,{url:'https://www.verde-m.com/prava-kuhnya',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:console});t.after(()=>dom.window.close());
 const w=dom.window,d=w.document;w.HTMLElement.prototype.scrollIntoView=function(){};
 w.fetch=()=>{throw Error('Real network/image API prohibited')};
 if(configure)configure(w,d);
 if(storage)w.localStorage.setItem('smartFormSelectedSlotState_prava_v3',JSON.stringify(storage));
 for(const file of files)w.eval(fs.readFileSync(new URL('../'+file,import.meta.url),'utf8'));
 await new Promise(resolve=>d.addEventListener('DOMContentLoaded',resolve,{once:true}));await tick();
 assert.deepEqual(errors,[],'initialization');
 const page=d.querySelector('.sf-page-prava');
 function choice(field,value){const el=[...page.querySelectorAll('[data-field="'+field+'"] .option-pill')].find(n=>n.dataset.value===value);assert.ok(el);el.click();}
 function config(island='no'){choice('water_position_prava','center');choice('oven_tall_unit','yes');choice('fridge_type','Вграден');choice('deep_cabinets','no');choice('island',island);}
 function dim(key,m,cm=0){const row=page.querySelector('[data-dim="'+key+'"]');const meters=row.querySelector('.meters-control .picker-value-text')||row.querySelector('.meters-control .picker-value'),centimeters=row.querySelector('.centimeters-control .picker-value-text')||row.querySelector('.centimeters-control .picker-value');if(meters)meters.textContent=String(m);if(centimeters)centimeters.textContent=String(meters?cm:m*100+cm);}
 function dimensions(){dim('len_prava_3',7,50);dim('height_prava_3',2,80);}
 function materials(){for(const role of ['upper','lower','countertop','backsplash'])page.querySelector('[data-field="'+role+'_finish"] .material-card').click();}
 function next(){page.querySelector('[data-prava-nav="next"]').click();}function back(){page.querySelector('.prava-back-control-v3').click();}
 const payload=()=>JSON.parse(JSON.stringify(w.collectPravaKitchenConfig()));
 return {w,d,page,choice,config,dim,dimensions,materials,next,back,payload,errors};
}
test('all ten phases have one explicit owner; every forward/back path and required gates',async t=>{
 const e=await setup(t);e.next();assert.equal(e.w.pravaFlow.getStep(),1);assert.equal(e.page.querySelector('.prava-validation').hidden,false);
 e.config();e.next();assert.equal(e.w.pravaFlow.getStep(),2);e.next();assert.equal(e.w.pravaFlow.getStep(),2);e.dimensions();
 for(let step=3;step<=10;step++){e.next();assert.equal(e.w.pravaFlow.getStep(),step);assert.equal(e.page.querySelectorAll('[data-prava-phase]:not([hidden])').length,step===10?0:1);}
 for(let step=9;step>=1;step--){e.back();assert.equal(e.w.pravaFlow.getStep(),step);}
 assert.equal(e.page.querySelector('[name="fridge_type"]').value,'Вграден','back preserves selections');
});
test('island on/off gates only applicable source dimensions and leaves scene geometry unchanged',async t=>{
 const e=await setup(t);e.config('yes');e.dimensions();e.next();e.next();assert.equal(e.w.pravaFlow.getStep(),2);e.dim('island_len_3a',2);e.dim('island_width_3a',1);e.next();assert.equal(e.w.pravaFlow.getStep(),3);
 e.materials();const scene=buildStraightKitchenScene(e.payload());assert.equal(scene.ok,true,scene.errors.join(';'));assert.equal(scene.scene.structuredData.island.enabled,true);
 e.choice('island','no');assert.equal(buildStraightKitchenScene(e.payload()).scene.structuredData.island.enabled,false);
});
for(const role of ['upper','lower','countertop','backsplash'])test(role+' identity survives combined pagination/filter/search and submit URL',async t=>{
 const e=await setup(t),wrap=e.page.querySelector('[data-field="'+role+'_finish"]');const first=wrap.querySelector('.material-card');first.click();const before=e.payload().materials[role];
 wrap.querySelectorAll('.page-btn')[1]?.click();assert.equal(wrap.querySelector('.vm-selected'),null);
 const search=wrap.querySelector('input[type="search"]');search.value='definitely-unmatched';search.dispatchEvent(new e.w.Event('input',{bubbles:true}));assert.equal(wrap.querySelectorAll('.material-card').length,0);assert.deepEqual(e.payload().materials[role],before);
 search.value='';search.dispatchEvent(new e.w.Event('input',{bubbles:true}));const select=wrap.querySelector('[data-prava-filter="manufacturer"]');select.value='Kronospan';select.dispatchEvent(new e.w.Event('change',{bubbles:true}));assert.deepEqual(e.payload().materials[role],before);
 const form=e.page.querySelector('form');form.dispatchEvent(new e.w.Event('submit',{bubbles:true,cancelable:true}));const link=form.querySelector('[name="preview_link"]').value;assert.ok(link.includes(encodeURIComponent(before.sampleImageUrl)),link);
});
test('source material rows and substrate/family filters remain exact; no 50-result search cutoff',async t=>{
 const e=await setup(t);for(const role of ['upper','lower','countertop','backsplash']){
  const wrap=e.page.querySelector('[data-field="'+role+'_finish"]'),data=JSON.parse(wrap.querySelector('[data-prava-catalog]').textContent);assert.equal(data.items.length,role==='upper'||role==='lower'?356:role==='countertop'?172:144);
  assert.equal(wrap.querySelectorAll('[data-prava-filter="manufacturer"]').length,1);
 }
 const wrap=e.page.querySelector('[data-field="upper_finish"]'),search=wrap.querySelector('input[type="search"]');search.value='Kronospan';search.dispatchEvent(new e.w.Event('input',{bubbles:true}));assert.ok(parseInt(wrap.querySelector('[id$="-count"]').textContent)>50);assert.ok(wrap.querySelectorAll('.page-btn').length>1);
 const sub=wrap.querySelector('[data-prava-filter="substrate"]');sub.value='mdf';sub.dispatchEvent(new e.w.Event('change',{bubbles:true}));const allowed=JSON.parse(wrap.querySelector('[data-prava-catalog]').textContent).substrates.mdf;for(const card of wrap.querySelectorAll('.material-card'))assert.ok(allowed.includes(card.querySelector('strong').textContent));
});
test('all extras and exact appliance enums reach the authoritative scene, including 450/600 dishwasher',async t=>{
 const e=await setup(t);e.config();e.dimensions();e.materials();
 for(const field of ['handleless','more_drawers','panel_doors','glass_display','lift_mechanisms','counter_lighting','bottle_rack']){const input=e.page.querySelector('[data-field="'+field+'"] input[type="checkbox"]');assert.ok(input);input.checked=true;input.dispatchEvent(new e.w.Event('change',{bubbles:true}));}
 for(const name of ['dishwasher','washing_machine','microwave','coffee_machine']){const select=e.page.querySelector('[name="'+name+'_type"]');for(const option of select.options){select.value=option.value;select.dispatchEvent(new e.w.Event('change',{bubbles:true}));const p=e.payload();assert.equal(p.appliances[name==='washing_machine'?'washingMachine':name==='coffee_machine'?'coffeeMachine':name].type,option.value||null);assert.equal(buildStraightKitchenScene(p).ok,true);}}
 for(const value of ['built_in_45','built_in_60']){e.page.querySelector('[name="dishwasher_type"]').value=value;assert.equal(e.payload().technicalRequirements.dishwasherWidthMm,value.endsWith('45')?450:600);}
 e.choice('deep_cabinets','yes');e.choice('fridge_type','Свободностоящ');const result=buildStraightKitchenScene(e.payload());assert.equal(result.ok,true);assert.equal(result.scene.requested.features.handleless,true);assert.equal(result.scene.requested.appliances.fridgeType,'free_standing');assert.equal(result.scene.upperCabinetry.topRow.enabled,true);assert.equal(e.payload().materialRules.backsplash.orientation,'horizontal');
});
test('preview state machine keeps prior image on failure, replaces once, and hides four summaries',async t=>{
 const e=await setup(t);e.config();e.dimensions();e.materials();assert.equal(e.w.pravaPreview.getState(),'planner');
 const card=e.page.querySelector('.prava-preview-card'),summary=card.querySelector('.prava-material-summary');assert.equal(summary.children.length,4);
 const pending=[];e.w.Image=function(){pending.push(this);};e.w.pravaPreview.setState('loading');assert.equal(card.querySelector('.cad-stage').getAttribute('aria-busy'),'true');
 const one=e.w.pravaPreview.showImage('data:image/png;base64,first');pending.at(-1).onload();await one;assert.equal(summary.hidden,true);assert.equal(e.w.pravaPreview.getState(),'generated');
 e.w.pravaPreview.setState('loading');const two=e.w.pravaPreview.showImage('broken');pending.at(-1).onerror();await assert.rejects(two);e.w.pravaPreview.setState('error','Failure');assert.equal(card.querySelector('.prava-generated-image').getAttribute('src'),'data:image/png;base64,first');assert.equal(summary.hidden,true);
 const three=e.w.pravaPreview.showImage('data:image/png;base64,next');pending.at(-1).onload();await three;assert.equal(card.querySelectorAll('.prava-generated-image').length,1);assert.equal(card.querySelectorAll('.prava-preview-status').length,1);
});
test('active generate button uses mocked queued API and explicit in-card success, no modal or sketch',async t=>{
 const e=await setup(t);e.config();e.dimensions();e.materials();assert.equal(e.d.querySelector('#prava-ai-modal-v1'),null);const requests=[];
 e.w.fetch=async(url,options)=>{requests.push({url,options});return{ok:true,status:200,text:async()=>JSON.stringify(options.method==='POST'?{ok:true,responseId:'test'}:{ok:true,done:true,imageDataUrl:'data:image/png;base64,test',status:'completed'})};};
 const real=e.w.setTimeout;e.w.setTimeout=(callback,ms)=>real(callback,ms===3000?0:ms);e.w.Image=function(){Object.defineProperty(this,'src',{set:()=>real(()=>this.onload(),0)});};
 let success;const done=new Promise(resolve=>e.page.addEventListener('prava-ai-generated',event=>{success=event.detail;resolve();},{once:true}));const btn=e.d.getElementById('prava-ai-generate-button');btn.click();btn.click();await done;await tick();
 assert.equal(requests.filter(r=>r.options.method==='POST').length,1);assert.equal(e.w.pravaPreview.getState(),'generated');assert.equal(success.imageDataUrl,'data:image/png;base64,test');const payload=JSON.parse(requests[0].options.body).payload;assert.equal(payload.sketchImageUrl,undefined);assert.equal(e.page.querySelector('.prava-generated-image').src,success.imageDataUrl);
});
test('calendar availability, keyboard selection, back persistence and custom-date reload',async t=>{
 const e=await setup(t);e.w.pravaGoToStep(10);assert.ok(e.page.querySelectorAll('.booking-day').length>=7);const slot=e.page.querySelector('.booking-slot:not([aria-disabled])');slot.dispatchEvent(new e.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(slot.getAttribute('aria-pressed'),'true');const saved=JSON.parse(e.w.localStorage.getItem('smartFormSelectedSlotState_prava_v3'));assert.equal(e.page.querySelector('[name="meeting_slot"]').value,saved.slot);
 e.back();e.next();assert.equal(e.page.querySelector('.booking-slot.active'),slot);
 const custom=e.page.querySelector('.booking-custom-date');custom.value='Следващия месец, след 16 ч.';custom.dispatchEvent(new e.w.Event('input',{bubbles:true}));assert.equal(e.page.querySelector('.booking-slot.active'),null);assert.equal(e.page.querySelector('[name="meeting_slot"]').value,'');const state=JSON.parse(e.w.localStorage.getItem('smartFormSelectedSlotState_prava_v3'));const restored=await setup(t,state);assert.equal(restored.page.querySelector('.booking-custom-date').value,custom.value);assert.equal(restored.page.querySelector('.booking-slot.active'),null);
});
test('form serializes distinct contact/extras, exact inspiration labels and synchronous optional notes',async t=>{
 const e=await setup(t),form=e.page.querySelector('form');assert.equal(form.querySelector('[type="tel"]').name,'phone');assert.equal(form.querySelector('[type="tel"]').dataset.name,'Phone');const names=[...e.page.querySelectorAll('.prava-extras-card input[type="checkbox"]')].map(n=>n.dataset.name);assert.equal(new Set(names).size,7);assert.equal(form.querySelector('[type="tel"]').required,false);assert.equal(form.querySelector('[type="email"]').required,true);
 const cards=[...e.page.querySelectorAll('.inspiration-card')];assert.equal(new Set(cards.map(c=>c.dataset.value)).size,5);cards[2].click();assert.equal(form.querySelector('[name="vision_prava_3"]').value,cards[2].querySelector('.inspiration-label').textContent.trim());
 const note=form.querySelector('[name="countertop_finish_note"]');note.value='Без промяна на посоката';const final=form.querySelector('textarea[name="final_note"]');final.value='Обадете се следобед';form.dispatchEvent(new e.w.Event('submit',{bubbles:true,cancelable:true}));const link=form.querySelector('[name="preview_link"]').value;const params=new URL(link.split('\n')[1]).searchParams;assert.equal(params.get('countertop_finish_note'),note.value);assert.equal(params.get('final_note'),final.value);assert.equal(e.errors.length,0);
});
test('only the existing external Webflow form-success signal is observed; no global observers',()=>{
 for(const file of files){const source=fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');if(file==='prava-smart-form.js'){assert.equal((source.match(/new MutationObserver/g)||[]).length,1);assert.ok(source.includes('.observe(successEl,'));}else assert.equal(source.includes('MutationObserver'),false,file);}
});


test('CMS booked/pending/blocked days stay unavailable; submitted slot restores its local lock',async t=>{
 const iso=date=>[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
 const day=new Date();day.setDate(day.getDate()+2);while(day.getDay()===0||day.getDay()===6)day.setDate(day.getDate()+1);const date=iso(day);const blockedDay=new Date(day);blockedDay.setDate(blockedDay.getDate()+1);while(blockedDay.getDay()===0||blockedDay.getDay()===6)blockedDay.setDate(blockedDay.getDate()+1);const blockedDate=iso(blockedDay);
 const e=await setup(t,null,(w,d)=>{const source=d.querySelector('.blocked-dates-source');for(const [time,status]of [['10:00–12:00','booked'],['14:00–16:00','pending']]){const row=d.createElement('div');row.className='booked-slot-item';for(const [cls,value]of [['date',date],['time',time],['status',status]]){const span=d.createElement('span');span.className='booked-slot-'+cls;span.textContent=value;row.append(span);}source.append(row);}const blocked=d.createElement('span');blocked.className='blocked-date-value';blocked.textContent=blockedDate;source.append(blocked);});
 const slots=[...e.page.querySelectorAll('.booking-slot[data-date="'+date+'"]')];assert.equal(e.page.querySelectorAll('.booking-slot[data-date="'+blockedDate+'"]').length,0,'CMS blocked date is excluded');assert.equal(slots.length,2);for(const slot of slots){assert.equal(slot.getAttribute('aria-disabled'),'true');slot.click();assert.equal(e.page.querySelector('[name="meeting_slot"]').value,'');}
 const free=e.page.querySelector('.booking-slot:not([aria-disabled])');free.click();const saved=JSON.parse(e.w.localStorage.getItem('smartFormSelectedSlotState_prava_v3'));const restored=await setup(t,{...saved,submitted:true});assert.ok(restored.page.querySelector('.booking-slot.active'));assert.ok(restored.page.querySelectorAll('.booking-slot.is-local-locked').length);assert.equal(restored.page.querySelector('.booking-custom-date').disabled,true);
});

test('Webflow success event fills summary once and preserves canonical off-page material images',async t=>{
 const e=await setup(t);e.config();e.dimensions();e.materials();const image=e.payload().materials.upper.sampleImageUrl;const wrap=e.page.querySelector('[data-field="upper_finish"]');wrap.querySelectorAll('.page-btn')[1].click();
 const success=e.page.querySelector('.w-form-done');Object.defineProperty(success,'offsetWidth',{get:()=>success.style.display==='block'?500:0});let delivered=0;e.page.addEventListener('prava:form-success',()=>delivered++);success.style.display='block';await tick();assert.equal(delivered,1);assert.equal(success.querySelector('[data-success-img="upper_finish"]').src,image);success.classList.add('shown');await tick();assert.equal(delivered,1);
});


test('segmented progress follows only the phase controller through gates, every Next/Back and final',async t=>{
 const e=await setup(t),bar=e.page.querySelector('.prava-global-progress');
 const check=step=>{assert.equal(e.w.pravaFlow.getStep(),step);assert.equal(bar.getAttribute('aria-valuenow'),String(step));assert.equal(bar.getAttribute('aria-valuemax'),'10');assert.equal(bar.querySelector('.prava-global-progress-count').textContent,'Стъпка '+step+' от 10');assert.equal(bar.querySelectorAll('.is-done').length,step-1);assert.equal(bar.querySelectorAll('.is-active').length,1);assert.equal(bar.querySelector('.is-active').dataset.step,String(step));assert.equal(bar.closest('[hidden]'),null);assert.equal(bar.hidden,false);};
 check(1);e.next();check(1);e.config();e.next();check(2);e.next();check(2);e.dimensions();
 for(let step=3;step<=10;step++){e.next();check(step);}
 assert.equal(bar.parentElement,e.page.querySelector('form'));assert.equal(bar.querySelector('.prava-global-progress-title').textContent,'Последна стъпка');
 for(let step=9;step>=1;step--){e.back();check(step);}
 e.w.pravaGoToStep(10);check(10);e.w.pravaGoToStep(11);check(10);e.page.querySelector('.prava-final-nav [data-prava-nav="back"]').click();check(9);
 assert.equal(e.page.querySelectorAll('.prava-global-progress').length,1);assert.equal(bar.querySelectorAll('.prava-global-progress-seg').length,10);assert.deepEqual(e.errors,[]);
});

test('an existing segmented bar is reused and reconnected rather than duplicated',async t=>{
 let previous;const e=await setup(t,null,(w,d)=>{previous=d.createElement('div');previous.className='prava-global-progress';previous.hidden=true;previous.inert=true;previous.innerHTML='<div class="prava-global-progress-track"><div class="prava-global-progress-seg"></div></div>';d.querySelector('.combo-dim-phase').append(previous);});
 assert.equal(e.page.querySelector('.prava-global-progress'),previous);assert.equal(previous.hidden,false);assert.equal(previous.inert,false);assert.equal(previous.parentElement,e.page.querySelector('form'));assert.equal(previous.querySelectorAll('.prava-global-progress-seg').length,10);
 e.w.pravaGoToStep(10);assert.equal(previous.getAttribute('aria-valuenow'),'10');assert.equal(e.page.querySelectorAll('.prava-global-progress').length,1);
});
