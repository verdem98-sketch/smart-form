/* One renderer owns filters, search, pagination and selection. Source identities stay unchanged. */
(function(){
  'use strict';
  function init(){
    const page=document.querySelector('.sf-page-prava');if(!page)return;
    page.querySelectorAll('script[data-prava-catalog]').forEach(script=>{
      const wrap=script.closest('.question-wrap-vision'),field=wrap.dataset.field,role=field.replace('_finish',''),cabinet=role==='upper'||role==='lower';
      const source=JSON.parse(script.textContent),items=source.items,host=script.parentElement;
      const grid=host.querySelector('.material-gallery-grid,.worktop-gallery-grid'),pages=host.querySelector('[id$="-pages"]'),count=host.querySelector('[id$="-count"]'),status=host.querySelector('[id$="-page-status"]'),more=host.querySelector('[id$="-more"]');
      const controls=document.createElement('div');controls.className='prava-material-controls';host.prepend(controls);
      const filters={manufacturer:'all',category:'all',substrate:'all',family:role==='countertop'?'thermal':'all'};
      const chips=cabinet?[...wrap.querySelectorAll('[data-filter-scope]')]:[...host.querySelectorAll('.worktop-filter-chip')];
      const kinds=[...new Set(chips.map(c=>cabinet?c.dataset.filterKind:c.dataset.kind))];
      const labels={manufacturer:'Производител',category:'Категория',substrate:'Плоскост',family:'Тип плот'};
      let current=1,query='';
      kinds.forEach(kind=>{
        const label=document.createElement('label');label.textContent=labels[kind]||kind;
        const select=document.createElement('select');select.dataset.pravaFilter=kind;select.setAttribute('aria-label',label.textContent);
        chips.filter(c=>(cabinet?c.dataset.filterKind:c.dataset.kind)===kind).forEach(c=>{
          const option=document.createElement('option');option.value=cabinet?c.dataset.filterValue:c.dataset.value;option.textContent=c.textContent.trim();select.append(option);
        });select.value=filters[kind];label.append(select);controls.append(label);
        select.addEventListener('change',()=>{filters[kind]=select.value;current=1;render();});
      });
      chips.forEach(c=>{c.hidden=true;});
      // Hide complete legacy chip groups, not their note fields or canonical hidden selection.
      wrap.querySelectorAll('.material-filter-panel,.material-substrate-filter-row,.worktop-filter-panel').forEach(n=>{if(n.querySelector('[data-filter-scope],.worktop-filter-chip'))n.hidden=true;});
      const searchLabel=document.createElement('label');searchLabel.className='prava-material-search';searchLabel.textContent='Търсене';
      const search=document.createElement('input');search.type='search';search.placeholder='Код, име или производител';search.setAttribute('aria-label','Търсене на материал');searchLabel.append(search);controls.append(searchLabel);
      search.addEventListener('input',()=>{query=search.value.trim().toLocaleLowerCase('bg');current=1;render();});
      function filtered(){return items.filter(row=>{
        const code=row[cabinet?3:2],category=row[cabinet?2:6];
        return (filters.manufacturer==='all'||row[1]===filters.manufacturer)&&(filters.category==='all'||category===filters.category)&&
          (filters.family==='all'||row[7]===filters.family)&&(filters.substrate==='all'||(source.substrates?.[filters.substrate]||[]).includes(String(code).toUpperCase()))&&
          (!query||[row[1],code,row[cabinet?4:3]].join(' ').toLocaleLowerCase('bg').includes(query));
      });}
      function pager(total){
        pages.replaceChildren();const shown=new Set([1,total,current-2,current-1,current,current+1,current+2]);
        let previous=0;[...shown].filter(n=>n>=1&&n<=total).sort((a,b)=>a-b).forEach(n=>{
          if(previous&&n>previous+1){const dots=document.createElement('span');dots.textContent='…';pages.append(dots);}
          const btn=document.createElement('button');btn.type='button';btn.className='page-btn';btn.textContent=String(n);btn.setAttribute('aria-label','Страница '+n);btn.classList.toggle('is-active',n===current);if(n===current)btn.setAttribute('aria-current','page');
          btn.addEventListener('click',()=>{current=n;render();});pages.append(btn);previous=n;
        });
      }
      function render(){
        const rows=filtered(),total=Math.max(1,Math.ceil(rows.length/10));current=Math.max(1,Math.min(current,total));
        const selected=wrap.querySelector('input[name="'+field+'"]')?.value||page.querySelector('input[name="'+field+'"]')?.value;
        grid.replaceChildren();count.textContent=rows.length+' материала';status.textContent='Стр. '+current+' от '+total;
        rows.slice((current-1)*10,current*10).forEach(row=>{
          const btn=document.createElement('button');btn.type='button';btn.className='material-card vision-card';btn.dataset.value=btn.dataset.decorId=row[0];btn.dataset.manufacturer=row[1];btn.dataset.category=row[cabinet?2:6];btn.classList.toggle('vm-selected',selected===row[0]);btn.setAttribute('aria-pressed',String(selected===row[0]));
          const img=document.createElement('img');img.loading='lazy';img.src=cabinet?source.base+encodeURIComponent(row[5]):row[4];img.alt=[row[1],row[cabinet?3:2],row[cabinet?4:3]].join(' ');
          const copy=document.createElement('div');copy.className='material-card-copy';
          const code=document.createElement('strong');code.className='material-card-code';code.textContent=row[cabinet?3:2];
          const name=document.createElement('span');name.className='vision-card-label';name.textContent=cabinet?row[4]:[row[2],row[3]].filter(Boolean).join(' · ');
          const brand=document.createElement('small');brand.className='material-card-brand';brand.textContent=row[1];copy.append(code,name,brand);btn.append(img,copy);
          btn.addEventListener('click',()=>{const hidden=page.querySelector('input[name="'+field+'"]');hidden.value=row[0];hidden.dispatchEvent(new Event('input',{bubbles:true}));hidden.dispatchEvent(new Event('change',{bubbles:true}));render();});grid.append(btn);
        });
        if(!rows.length){const empty=document.createElement('p');empty.textContent='Няма материали за тези филтри.';grid.append(empty);}
        more.hidden=current>=total;more.onclick=()=>{if(current<total){current++;render();}};pager(total);
      }
      render();
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
