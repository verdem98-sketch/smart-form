
(function(){
  function init(){
    var page=document.querySelector('.sf-page-prava');
    if(!page)return;

    var btn=document.getElementById('prava-ai-generate-button');
    var modal=document.getElementById('prava-ai-modal-v1');
    if(!btn)return;

    var loading=modal&&modal.querySelector('.prava-ai-loading');
    var success=modal&&modal.querySelector('.prava-ai-success');
    var error=modal&&modal.querySelector('.prava-ai-error');
    var resultImg=modal&&modal.querySelector('.prava-ai-result');
    var costLine=document.getElementById('prava-ai-cost-v1');
    var debugCost=new URLSearchParams(location.search).get('ai-debug')==='1';
    var debugStatus=document.getElementById('prava-ai-debug-status-v1');

    function clean(s){return String(s||'').replace(/\s+/g,' ').trim()}

    function selectedChoice(field){
      var wrap=page.querySelector('[data-field="'+field+'"]');
      if(!wrap)return null;
      var el=wrap.querySelector('.option-pill.is-selected,.option-pill.vm-selected,.option-pill.active');
      if(!el)return null;
      return {
        value:clean(el.getAttribute('data-value')||el.textContent),
        label:clean(el.textContent)
      };
    }

    function selectedVision(field){
      if(window.pravaMaterialSelections)return window.pravaMaterialSelections.get(field);
      var wrap=page.querySelector('.question-wrap-vision[data-field="'+field+'"]');
      if(!wrap)return null;
      var el=wrap.querySelector('.vision-card.vm-selected,.vision-card.is-selected,.vision-card.active,[aria-pressed="true"]');
      if(!el)return null;
      var label=el.querySelector('.vision-card-label');
      var img=el.querySelector('img');
      var sampleImageUrl=clean(
        (img&&(img.currentSrc||img.src))||
        el.getAttribute('data-image')||
        el.getAttribute('data-image-url')||
        ''
      );
      if(!sampleImageUrl){
        var bg=getComputedStyle(el).backgroundImage||'';
        var match=bg.match(/url\(["']?([^"')]+)["']?\)/i);
        sampleImageUrl=match?clean(match[1]):'';
      }
      return {
        value:clean(el.getAttribute('data-value')||(label&&label.textContent)||el.textContent),
        label:clean((label&&label.textContent)||el.textContent),
        sampleImageUrl:/^https:\/\//i.test(sampleImageUrl)?sampleImageUrl:null
      };
    }

    function pickerNumber(scope,selector){
      var box=scope.querySelector(selector+' .picker-value-text')||scope.querySelector(selector+' .picker-value');
      var n=parseInt(clean(box&&box.textContent),10);
      return isNaN(n)?0:n;
    }

    function dimensions(){
      var out={};
      page.querySelectorAll('.dimension-row[data-dim]').forEach(function(row){
        var key=row.getAttribute('data-dim');
        var m=pickerNumber(row,'.meters-control');
        var cm=pickerNumber(row,'.centimeters-control');
        out[key]={
          meters:m,
          centimeters:cm,
          totalCm:m*100+cm,
          display:(m?m+' м ':'')+(cm?cm+' см':'')
        };
      });
      return out;
    }

    function checkedExtras(){
      var out=[];
      page.querySelectorAll('[data-field] input[type="checkbox"]:checked').forEach(function(input){
        var wrap=input.closest('[data-field]');
        if(!wrap)return;
        var label=wrap.querySelector('label,.w-form-label');
        out.push({
          field:clean(wrap.getAttribute('data-field')),
          label:clean(label&&label.textContent)
        });
      });
      return out;
    }

    function choiceIsYes(choice){
      if(!choice)return false;
      var text=(String(choice.value||'')+' '+String(choice.label||'')).toLowerCase();
      return /(^|\s)(yes|да|true)(\s|$)/.test(text);
    }

    function hasExtra(extras,field){
      return extras.some(function(item){return item&&item.field===field});
    }

    function applianceSelections(){
      function val(name){
        var el=page.querySelector('[name="'+name+'"]');
        return el?clean(el.value):'';
      }
      var dishwasher=val('dishwasher_type');
      var washingMachine=val('washing_machine_type');
      var microwave=val('microwave_type');
      var coffeeMachine=val('coffee_machine_type');
      return {
        dishwasher:{enabled:!!dishwasher,type:dishwasher||null},
        washingMachine:{enabled:!!washingMachine,type:washingMachine||null},
        microwave:{enabled:!!microwave,type:microwave||null},
        coffeeMachine:{enabled:!!coffeeMachine,type:coffeeMachine||null}
      };
    }

    function dishwasherWidthMm(appliances){
      var type=appliances&&appliances.dishwasher&&appliances.dishwasher.type;
      if(!type)return 0;
      if(/45$/.test(type))return 450;
      if(/60$/.test(type))return 600;
      return 0;
    }

    function backsplashMaterialRule(){
      var input=page.querySelector('[name="backsplash_orientation"]');
      var value=clean((input&&input.value)||page.dataset.backsplashOrientation);
      return {
        orientation:value==='horizontal'||value==='vertical'?value:null,
        source:input&&input.value?'backsplash_orientation input':page.dataset.backsplashOrientation?'page.dataset.backsplashOrientation':null
      };
    }

    function collect(){
      var config={
        waterPosition:selectedChoice('water_position_prava'),
        ovenTallUnit:selectedChoice('oven_tall_unit'),
        fridgeType:selectedChoice('fridge_type'),
        deepCabinets:selectedChoice('deep_cabinets'),
        island:selectedChoice('island')
      };
      var dims=dimensions();
      var extras=checkedExtras();
      var materials={
        upper:selectedVision('upper_finish'),
        lower:selectedVision('lower_finish'),
        countertop:selectedVision('countertop_finish'),
        backsplash:selectedVision('backsplash_finish')
      };
      var appliances=applianceSelections();

      if(appliances.washingMachine.enabled && !hasExtra(extras,'washing_machine')){
        extras.push({
          field:'washing_machine',
          label:appliances.washingMachine.type||'washing_machine'
        });
      }

      var dishwasherWidth=dishwasherWidthMm(appliances);
      var deepUpper=choiceIsYes(config.deepCabinets);
      var upperRowMode=deepUpper?'deep-reference-locked':(materials.upper?'standard':'none');

      return {
        version:'prava-ai-visual-v2',
        kitchenType:'prava',
        configuration:config,
        dimensions:dims,
        technicalRequirements:{
          totalRunMm:dims.len_prava_3&&dims.len_prava_3.totalCm>0?dims.len_prava_3.totalCm*10:null,
          roomHeightMm:dims.height_prava_3&&dims.height_prava_3.totalCm>0?dims.height_prava_3.totalCm*10:null,
          islandLengthMm:dims.island_len_3a&&dims.island_len_3a.totalCm>0?dims.island_len_3a.totalCm*10:null,
          islandWidthMm:dims.island_width_3a&&dims.island_width_3a.totalCm>0?dims.island_width_3a.totalCm*10:null,
          deepUpperCabinets:deepUpper,
          upperRowMode:upperRowMode,
          dishwasherWidthMm:dishwasherWidth||null,
          bottlePullout:{enabled:hasExtra(extras,'bottle_rack'),widthMm:150},
          builtInCoffeeMachine:!!(appliances.coffeeMachine.enabled&&appliances.coffeeMachine.type==='built_in'),
          allowAdditionalCabinetsToFitLength:true,
          preserveCamera:true,
          preserveWallGeometry:true
        },
        materialRules:{backsplash:backsplashMaterialRule()},
        materials:materials,
        appliances:appliances,
        extras:extras,
        pagePath:location.pathname,
        collectedAt:new Date().toISOString()
      };
    }

    function islandEnabled(payload){
      var x=payload.configuration.island;
      if(!x)return false;
      var v=(String(x.value||'')+' '+String(x.label||'')).toLowerCase();
      return /(^|\s)(yes|да)(\s|$)/.test(v);
    }

    function validate(payload){
      var missing=[];
      var c=payload.configuration;
      if(!c.waterPosition)missing.push('позиция на водата');
      if(!c.ovenTallUnit)missing.push('фурна');
      if(!c.fridgeType)missing.push('хладилник');
      if(!c.deepCabinets)missing.push('дълбоки шкафове');
      if(!c.island)missing.push('остров');

      var d=payload.dimensions;
      if(payload.appliances&&payload.appliances.dishwasher&&payload.appliances.dishwasher.enabled&&!payload.technicalRequirements.dishwasherWidthMm){
        missing.push('размер на миялната 45/60 см');
      }
      if(!d.len_prava_3||d.len_prava_3.totalCm<=0)missing.push('дължина');
      if(!d.height_prava_3||d.height_prava_3.totalCm<=0)missing.push('височина');
      if(islandEnabled(payload)){
        if(!d.island_len_3a||d.island_len_3a.totalCm<=0)missing.push('дължина на острова');
        if(!d.island_width_3a||d.island_width_3a.totalCm<=0)missing.push('ширина на острова');
      }

      var m=payload.materials;
      if(!m.upper)missing.push('визия за горен ред');
      if(!m.lower)missing.push('визия за долен ред');
      if(!m.countertop)missing.push('визия за плот');
      if(!m.backsplash)missing.push('визия за гръб');

      return {valid:missing.length===0,missing:missing};
    }

    function showState(name,message){
      if(window.pravaPreview)window.pravaPreview.setState(name==='success'?'generated':name==='loading'?'loading':'error',message);
      [loading,success,error].forEach(function(el){if(el)el.classList.remove('is-active')});
      if(name==='loading'&&loading)loading.classList.add('is-active');
      if(name==='success'&&success)success.classList.add('is-active');
      if(name==='error'&&error){
        error.classList.add('is-active');
        error.textContent=message||'Визуализацията не можа да бъде създадена.';
      }
    }

    function missingStep(missing){
      var first=(missing&&missing[0])||'';
      if(['позиция на водата','фурна','хладилник','дълбоки шкафове','остров'].indexOf(first)>-1)return 1;
      if(['дължина','височина','дължина на острова','ширина на острова'].indexOf(first)>-1)return 2;
      if(first==='визия за горен ред')return 3;
      if(first==='визия за долен ред')return 4;
      if(first==='визия за плот')return 5;
      if(first==='визия за гръб')return 6;
      if(first==='размер на миялната 45/60 см')return 7;
      return 1;
    }

    function syncButton(){
      var payload=collect();
      var check=validate(payload);
      if(btn.dataset.aiBusy==='1')return;
      btn.disabled=false;
      btn.classList.toggle('is-missing',!check.valid);
      btn.textContent=check.valid?'Генерирай AI визуализация':'Завършете избора, за да генерирате';
      btn.title=check.valid?'':('Липсва: '+check.missing.join(', '));
      btn.dataset.missingStep=check.valid?'':String(missingStep(check.missing));
    }

    function wait(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}

    async function readJson(response){
      var raw='';
      var data={};
      try{
        raw=await response.text();
        data=raw?JSON.parse(raw):{};
      }catch(e){}
      return {data:data,raw:raw};
    }

    async function pollVisual(endpoint,responseId){
      var maxAttempts=100;
      var startedAt=Date.now();

      for(var attempt=0;attempt<maxAttempts;attempt++){
        await wait(3000);

        var response=await fetch(
          endpoint+'?responseId='+encodeURIComponent(responseId),
          {method:'GET',headers:{'Accept':'application/json'}}
        );

        var parsed=await readJson(response);
        var data=parsed.data;
        var raw=parsed.raw;

        if(debugCost&&debugStatus){
          var elapsed=Math.round((Date.now()-startedAt)/1000);
          debugStatus.style.display='block';
          debugStatus.textContent='AI статус: '+String(data.status||('HTTP '+response.status))+' · '+elapsed+' сек.';
        }

        if(!response.ok||!data.ok){
          throw new Error(
            (data&&data.error)||
            ('HTTP '+response.status+(raw?' — '+raw.slice(0,180):''))
          );
        }

        if(data.done&&data.imageDataUrl)return data;

        if(data.status!=='queued'&&data.status!=='in_progress'){
          throw new Error('Генерацията приключи без готово изображение.');
        }
      }

      throw new Error(
        debugCost
          ?'DEBUG: генерацията остана queued/in_progress повече от 300 секунди.'
          :'Генерацията все още се обработва. Не стартирайте нова визуализация; опитайте отново след малко.'
      );
    }

    async function waitForCorrectionReady(endpoint,responseId){
      for(var attempt=0;attempt<20;attempt++){
        await wait(1500);
        try{
          var response=await fetch(
            endpoint+'?responseId='+encodeURIComponent(responseId),
            {method:'GET',headers:{'Accept':'application/json'}}
          );
          var parsed=await readJson(response);
          var data=parsed.data;
          if(response.ok&&data&&data.ok&&data.done&&data.correctionReady){
            page.dispatchEvent(new CustomEvent('prava-ai-correction-ready',{
              bubbles:true,
              detail:{
                responseId:responseId,
                correctionIndex:Number(data.correctionIndex||0),
                remainingCorrections:Number.isFinite(Number(data.remainingCorrections))
                  ?Number(data.remainingCorrections)
                  :3
              }
            }));
            return;
          }
        }catch(_e){}
      }
    }

    function mmToCmText(mm){
      var n=Number(mm);
      if(!isFinite(n)||n<=0)return '';
      return Math.round(n/10)+' см';
    }

    function humanizePlannerError(message){
      var text=clean(message);
      var match=text.match(/Required fixed modules need\s+(\d+)\s*mm,\s*but the available run is only\s+(\d+)\s*mm/i);
      if(match){
        return 'Избраните уреди и задължителни модули изискват поне '+mmToCmText(match[1])+
          ' дължина, а Вие сте задали '+mmToCmText(match[2])+'.';
      }
      match=text.match(/Resolved cabinet stack needs\s+(\d+)\s*mm,\s*but room height is only\s+(\d+)\s*mm/i);
      if(match){
        return 'За избраната конфигурация са нужни поне '+mmToCmText(match[1])+
          ' височина, а Вие сте задали '+mmToCmText(match[2])+' за помещението.';
      }
      match=text.match(/Planner width mismatch:\s*requested\s+(\d+)\s*mm,\s*planned\s+(\d+)\s*mm/i);
      if(match){
        return 'Зададената дължина е '+mmToCmText(match[1])+
          ', но избраните модули изискват '+mmToCmText(match[2])+'.';
      }
      return text;
    }

    function humanPlannerMessage(baseError,plannerDetails){
      var readable=(plannerDetails||[]).map(humanizePlannerError).filter(Boolean);
      // Width mismatch repeats the same problem as the fixed-module message; keep the clearer sentence.
      if(readable.some(function(x){return x.indexOf('задължителни модули')>-1;})){
        readable=readable.filter(function(x){return x.indexOf('Зададената дължина е')!==0;});
      }
      if(readable.length){
        return 'Не можем да направим визуализация с тези размери. '+readable.join(' ');
      }
      return humanizePlannerError(baseError)||'Не можем да направим визуализация с тези настройки. Проверете размерите и опитайте отново.';
    }

    async function requestVisual(){
      if(btn.dataset.aiBusy==='1')return;
      var payload=collect();
      var check=validate(payload);
      window.__pravaAiPayload=payload;

      if(!check.valid){
        showState('error','Липсва: '+check.missing.join(', '));
        return;
      }

      showState('loading');
      if(debugStatus){
        debugStatus.style.display=debugCost?'block':'none';
        debugStatus.textContent=debugCost?'AI статус: стартиране…':'';
      }
      btn.dataset.aiBusy='1';
      btn.disabled=true;
      btn.textContent='Създаваме визуализацията…';

      try{
        var endpoint=location.origin+'/contract-automation/api/kitchen-visual';

        var startResponse=await fetch(endpoint,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({payload:payload})
        });

        var startParsed=await readJson(startResponse);
        var startData=startParsed.data;
        var startRaw=startParsed.raw;

        if(!startResponse.ok||!startData.ok){
          var plannerDetails=Array.isArray(startData&&startData.plannerErrors)
            ? startData.plannerErrors.filter(Boolean)
            : [];
          var baseError=(startData&&startData.error)||
            ('HTTP '+startResponse.status+(startRaw?' — '+startRaw.slice(0,180):''));
          throw new Error(
            plannerDetails.length
              ? humanPlannerMessage(baseError,plannerDetails)
              : humanPlannerMessage(baseError,[])
          );
        }

        if(!startData.responseId){
          throw new Error('AI генераторът не върна идентификатор на задачата.');
        }

        var data=await pollVisual(endpoint,startData.responseId);

        if(window.pravaPreview)await window.pravaPreview.showImage(data.imageDataUrl);
        if(resultImg)resultImg.src=data.imageDataUrl;

        if(costLine){
          if(debugCost&&data.generationMeta){
            var meta=data.generationMeta;
            var usd=Number(meta.costUsd||0);
            var confidence=meta.costConfidence==='measured'?'измерена по usage':'частично измерена';
            costLine.textContent=
              'Тестова цена: $'+usd.toFixed(5)+
              ' · '+String(meta.imageModel||'')+
              ' · '+String(meta.quality||'')+
              ' · '+confidence;
            costLine.style.display='block';
          }else{
            costLine.style.display='none';
          }
        }

        window.__pravaAiLastMeta=data.generationMeta||null;
        window.__pravaAiLastResponseId=data.responseId||startData.responseId||null;
        showState('success');

        page.dispatchEvent(new CustomEvent('prava-ai-generated',{
          bubbles:true,
          detail:{
            imageDataUrl:data.imageDataUrl,
            responseId:window.__pravaAiLastResponseId,
            revisedPrompt:data.revisedPrompt||null,
            correctionIndex:Number(data.correctionIndex||0),
            remainingCorrections:Number.isFinite(Number(data.remainingCorrections))?Number(data.remainingCorrections):3,
            correctionReady:data.correctionReady===true
          }
        }));
        if(data.correctionReady!==true){
          waitForCorrectionReady(endpoint,window.__pravaAiLastResponseId);
        }
      }catch(err){
        showState('error',err&&err.message?err.message:'Визуализацията не можа да бъде създадена.');
      }finally{
        btn.dataset.aiBusy='0';
        syncButton();
      }
    }

    async function requestCorrection(detail){
      if(page.dataset.aiCorrectionBusy==='1')return;
      var instruction=clean(detail&&detail.instruction);
      var parentResponseId=clean(
        (detail&&detail.parentResponseId)||
        window.__pravaAiLastResponseId||
        ''
      );
      if(!instruction){
        showState('error','Опишете какво искате да се промени.');
        return;
      }
      if(!parentResponseId){
        showState('error','Първо създайте AI визуализация.');
        return;
      }

      page.dataset.aiCorrectionBusy='1';
      showState('loading');
      try{
        var endpoint=location.origin+'/contract-automation/api/kitchen-visual';
        var startResponse=await fetch(endpoint,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            correction:{
              parentResponseId:parentResponseId,
              instruction:instruction
            }
          })
        });
        var startParsed=await readJson(startResponse);
        var startData=startParsed.data;
        var startRaw=startParsed.raw;
        if(!startResponse.ok||!startData.ok){
          throw new Error(
            (startData&&startData.error)||
            ('HTTP '+startResponse.status+(startRaw?' — '+startRaw.slice(0,180):''))
          );
        }
        if(!startData.responseId){
          throw new Error('AI корекцията не върна идентификатор на задачата.');
        }

        var data=await pollVisual(endpoint,startData.responseId);
        if(window.pravaPreview)await window.pravaPreview.showImage(data.imageDataUrl);
        if(resultImg)resultImg.src=data.imageDataUrl;

        window.__pravaAiLastMeta=data.generationMeta||null;
        window.__pravaAiLastResponseId=data.responseId||startData.responseId;
        if(window.pravaAiCorrectionUI&&typeof window.pravaAiCorrectionUI.setRemaining==='function'){
          window.pravaAiCorrectionUI.setRemaining(
            Number.isFinite(Number(data.remainingCorrections))
              ?Number(data.remainingCorrections)
              :Math.max(0,3-Number(data.correctionIndex||0))
          );
        }
        showState('success');

        page.dispatchEvent(new CustomEvent('prava-ai-generated',{
          bubbles:true,
          detail:{
            imageDataUrl:data.imageDataUrl,
            responseId:window.__pravaAiLastResponseId,
            revisedPrompt:data.revisedPrompt||null,
            correctionIndex:Number(data.correctionIndex||0),
            remainingCorrections:Number.isFinite(Number(data.remainingCorrections))
              ?Number(data.remainingCorrections)
              :Math.max(0,3-Number(data.correctionIndex||0))
          }
        }));
        page.dispatchEvent(new CustomEvent('prava-ai-corrected',{
          bubbles:true,
          detail:{
            responseId:window.__pravaAiLastResponseId,
            correctionIndex:Number(data.correctionIndex||0),
            remainingCorrections:Number(data.remainingCorrections||0)
          }
        }));
      }catch(err){
        showState('error',err&&err.message?err.message:'Корекцията не можа да бъде направена.');
      }finally{
        page.dataset.aiCorrectionBusy='0';
      }
    }

    window.collectPravaKitchenConfig=collect;
    window.validatePravaKitchenConfig=function(){return validate(collect())};

    btn.addEventListener('click',function(ev){
      var check=validate(collect());
      if(check.valid)return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
      var step=missingStep(check.missing);
      if(typeof window.pravaGoToStep==='function')window.pravaGoToStep(step);
    },true);

    btn.addEventListener('click',requestVisual);
    if(modal)modal.addEventListener('prava-ai-requested',requestVisual);
    page.addEventListener('prava-ai-correction-requested',function(event){
      requestCorrection(event.detail||{});
    });

    page.addEventListener('click',function(){setTimeout(syncButton,0)},true);
    page.addEventListener('change',function(){setTimeout(syncButton,0)},true);
    page.addEventListener('input',function(){setTimeout(syncButton,0)},true);

    syncButton();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init,{once:true});
  }else{
    init();
  }
})();
