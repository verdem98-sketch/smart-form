/* /verde-office: групи от табове — подрежда съществуващите бутони в 5 групи (само навигация, инструментите не се пипат) */
(function(){
  var GROUPS=[
    ['clients','Клиенти',['calendar','passport']],
    ['video','Видео',['episodes','promo']],
    ['content','Съдържание',['studio','visual','products']],
    ['insights','Анализ и реклами',['analysis','ads']],
    ['tools','Инструменти',['webcut']]
  ];
  var LS_G='vo-group',LS_T='vo-group-tab-';
  function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}}
  function groupOf(t){for(var i=0;i<GROUPS.length;i++)if(GROUPS[i][2].indexOf(t)>=0)return GROUPS[i][0];return 'tools';}
  function orderOf(t){for(var i=0;i<GROUPS.length;i++){var k=GROUPS[i][2].indexOf(t);if(k>=0)return k;}return 99;}
  function css(){
    var s=document.createElement('style');
    s.textContent='.vo-groups{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0 0}'+
      '.vo-group{flex:1 1 150px;padding:15px 16px;border:1px solid #cfd4cb;border-radius:12px;background:#fff;color:#2f332f;font:700 15px/1.2 Montserrat,Arial,sans-serif;cursor:pointer;transition:background .15s,color .15s}'+
      '.vo-group:hover{border-color:#2f332f}.vo-group.is-on{background:#2f332f;border-color:#2f332f;color:#fff}'+
      '.vo-group small{display:block;margin-top:4px;font:500 11px/1.2 Montserrat,Arial,sans-serif;opacity:.65}'+
      '.office-shell .vo-tabs.vo-sub{margin:10px 0 20px;padding:8px;gap:6px;background:#f1f3ee;border-radius:12px}'+
      '.office-shell .vo-tabs.vo-sub .vo-tab{flex:0 1 auto;padding:10px 18px;font-size:14px;border-radius:9px;text-align:center}'+
      '.office-shell .vo-tabs.vo-sub .vo-tab.vo-g-hide{display:none!important}';
    document.head.appendChild(s);
  }
  function mount(bar){
    if(bar.classList.contains('vo-sub'))return;
    css(); bar.classList.add('vo-sub');
    var gbar=document.createElement('div'); gbar.className='vo-groups';
    GROUPS.forEach(function(g){var b=document.createElement('button');b.type='button';b.className='vo-group';b.setAttribute('data-group',g[0]);b.innerHTML=g[1]+'<small></small>';gbar.appendChild(b);});
    bar.parentNode.insertBefore(gbar,bar);
    var cur=null,restore=ls(LS_G),restoreUntil=Date.now()+10000;
    function tabs(){return [].slice.call(bar.querySelectorAll('.vo-tab'));}
    function key(b){return b.getAttribute('data-tab')||'';}
    function apply(){
      var counts={};
      tabs().forEach(function(b){var g=groupOf(key(b));counts[g]=(counts[g]||0)+1;b.style.order=orderOf(key(b));b.classList.toggle('vo-g-hide',g!==cur);});
      [].forEach.call(gbar.children,function(gb){var g=gb.getAttribute('data-group');gb.classList.toggle('is-on',g===cur);gb.style.display=counts[g]?'':'none';
        gb.querySelector('small').textContent=tabs().filter(function(b){return groupOf(key(b))===g;}).sort(function(a,b){return orderOf(key(a))-orderOf(key(b));}).map(function(b){return b.textContent.trim();}).join(' · ');});
    }
    function openGroup(g,auto){
      cur=g; ls(LS_G,g); apply();
      var mine=tabs().filter(function(b){return groupOf(key(b))===g;}).sort(function(a,b){return orderOf(key(a))-orderOf(key(b));});
      if(mine.some(function(b){return b.classList.contains('is-on');}))return true;
      var want=ls(LS_T+g),btns=mine.filter(function(b){return b.tagName==='BUTTON';});
      var t=btns.filter(function(b){return key(b)===want;})[0]||(auto&&want?null:btns[0]);
      if(t){t.click();return true;}
      return !want||!auto;
    }
    gbar.addEventListener('click',function(e){var b=e.target.closest('.vo-group');if(!b)return;restore=null;openGroup(b.getAttribute('data-group'));});
    bar.addEventListener('click',function(e){var b=e.target.closest('.vo-tab');if(!b||b.tagName!=='BUTTON')return;var g=groupOf(key(b));ls(LS_T+g,key(b));if(g!==cur){cur=g;ls(LS_G,g);}setTimeout(apply,0);},true);
    function sync(){
      if(restore&&Date.now()<restoreUntil){ if(openGroup(restore,true))restore=null; return; }
      restore=null;
      if(!cur){var on=bar.querySelector('.vo-tab.is-on');cur=on?groupOf(key(on)):GROUPS[0][0];}
      apply();
    }
    new MutationObserver(function(){setTimeout(sync,0);}).observe(bar,{childList:true});
    sync(); setTimeout(sync,1500); setTimeout(sync,4000);
  }
  var tries=0;
  (function wait(){
    var bar=document.querySelector('.office-shell .vo-tabs');
    if(bar)return mount(bar);
    if(++tries<120)setTimeout(wait,250);
  })();
})();
