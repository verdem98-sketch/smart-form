/* Prava: read-only 3D preview (rotate/zoom only) replacing the static sketch layers.
   Falls back to the original sketch images if three.js or a model fails to load. Step 9 AI image is untouched. */
(function(){
  'use strict';
  var BASE=(document.currentScript&&document.currentScript.dataset.base)||'https://cdn.jsdelivr.net/gh/verdem98-sketch/smart-form@fdfa03d25c62b737d08b3302e488a38d534fe4b2/prava-3d/';
  var THREE_URL='https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js';
  var GLTF_URL='https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js';
  var ORBIT_URL='https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js';
  function load(src){return new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){no(new Error(src));};document.head.appendChild(s);});}
  function init(){
    var page=document.querySelector('.sf-page-prava'),card=page&&page.querySelector('.sticky-cad-wrap'),stage=card&&card.querySelector('.cad-stage');
    if(!stage||window.pravaViewer3d)return;
    var host=document.createElement('div');host.className='prava-3d';host.hidden=true;stage.appendChild(host);
    var st=document.createElement('style');st.textContent='.sf-page-prava .prava-3d{position:absolute;inset:0;z-index:60;background:#eef0ed;touch-action:none;cursor:grab}.sf-page-prava .prava-3d canvas{display:block;width:100%;height:100%}.sf-page-prava .prava-3d-hint{position:absolute;left:10px;bottom:8px;font:11px/1.3 sans-serif;color:#606760;background:rgba(255,255,255,.8);padding:3px 8px;border-radius:8px;pointer-events:none}.sf-page-prava .cad-stage.prava-3d-on .cad-img,.sf-page-prava .cad-stage.prava-3d-on .cad-img-kitchen,.sf-page-prava .cad-stage.prava-3d-on .cad-img-deep_cabinets,.sf-page-prava .cad-stage.prava-3d-on .cad-img-island,.sf-page-prava .cad-stage.prava-3d-on .cad-img-base{visibility:hidden!important}.sf-page-prava .cad-stage.prava-3d-on .cad-base,.sf-page-prava .cad-stage.prava-3d-on .cad-kitchen,.sf-page-prava .cad-stage.prava-3d-on .cad-deep_cabinets,.sf-page-prava .cad-stage.prava-3d-on .cad-island{pointer-events:none!important}.sf-page-prava .prava-3d-btns{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:6px}.sf-page-prava .prava-3d-btns button{width:36px;height:36px;border:1px solid #c8cbc7;border-radius:10px;background:#fff;color:#333533;font:600 18px/1 sans-serif;cursor:pointer;padding:0}.sf-page-prava .prava-3d-btns button:hover{background:#f2f7f2}';
    document.head.appendChild(st);
    var hint=document.createElement('div');hint.className='prava-3d-hint';hint.textContent='Завъртане: влачете · Мащаб: колелце/щипване';host.appendChild(hint);
    var btns=document.createElement('div');btns.className='prava-3d-btns';
    [['+','Приближи','in'],['−','Отдалечи','out'],['⟲','Начален изглед','reset']].forEach(function(b){var e=document.createElement('button');e.type='button';e.textContent=b[0];e.title=e.ariaLabel=b[1];e.dataset.act=b[2];btns.appendChild(e);});
    host.appendChild(btns);
    btns.addEventListener('click',function(ev){var b=ev.target.closest('button');if(!b||!controls)return;var a=b.dataset.act;
      if(a==='reset'){camera.position.copy(home.pos);controls.target.copy(home.target);}
      else{var v=camera.position.clone().sub(controls.target);v.multiplyScalar(a==='in'?0.8:1.25);var L=v.length();v.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,L)));camera.position.copy(controls.target).add(v);}
      controls.update();});
    ['pointerdown','touchstart','wheel'].forEach(function(t){btns.addEventListener(t,function(e){e.stopPropagation();},{passive:true});});
    var T,renderer,scene,camera,controls,loader,cache={},group,failed=false,current='',gen=0;
    var mats,home={};
    function setup(){
      T=window.THREE;
      renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));host.insertBefore(renderer.domElement,hint);
      scene=new T.Scene();scene.background=new T.Color(0xeef0ed);
      camera=new T.PerspectiveCamera(45,1,0.05,120);
      scene.add(new T.HemisphereLight(0xffffff,0xb0b3ae,1.0));
      var d=new T.DirectionalLight(0xffffff,0.7);d.position.set(3,6,2);scene.add(d);
      group=new T.Group();scene.add(group);
      var target=new T.Vector3(-0.8,1.1,-4.1);
      camera.position.set(3.7,2.0,-1.0);
      var floor=new T.Mesh(new T.PlaneGeometry(6,7),new T.MeshStandardMaterial({color:0xcfd2cc,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.set(1.0,-0.002,-4.1);scene.add(floor);
      var wall=new T.Mesh(new T.PlaneGeometry(7,2.7),new T.MeshStandardMaterial({color:0xf3f3f0,roughness:1,side:T.DoubleSide}));wall.rotation.y=Math.PI/2;wall.position.set(-1.17,1.35,-4.1);scene.add(wall);
      var grid=new T.GridHelper(6,12,0xb5b9b2,0xc4c8c1);grid.position.set(1.0,0,-4.1);scene.add(grid);
      controls=new T.OrbitControls(camera,renderer.domElement);home.pos=camera.position.clone();home.target=target.clone();
      controls.target.copy(target);controls.enablePan=false;controls.enableDamping=true;controls.minDistance=1.5;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*0.52;controls.update();
      loader=new T.GLTFLoader();
      mats={dark:new T.MeshStandardMaterial({color:0x1b1d1b,flatShading:true,side:T.DoubleSide,roughness:.35,metalness:.2}),
        steel:new T.MeshStandardMaterial({color:0xaeb8c0,flatShading:true,side:T.DoubleSide,roughness:.4,metalness:.4}),
        room:new T.MeshStandardMaterial({color:0xd9dbd6,flatShading:true,side:T.DoubleSide,roughness:1}),
        kitchen:new T.MeshStandardMaterial({color:0xf4f4f1,flatShading:true,side:T.DoubleSide,roughness:.8}),
        deep:new T.MeshStandardMaterial({color:0xe6ece4,flatShading:true,side:T.DoubleSide,roughness:.8}),
        island:new T.MeshStandardMaterial({color:0xe8e2d6,flatShading:true,side:T.DoubleSide,roughness:.8})};
      new ResizeObserver(resize).observe(host);resize();
      (function loop(){requestAnimationFrame(loop);if(host.hidden)return;controls.update();renderer.render(scene,camera);})();
    }
    function resize(){if(!renderer)return;var w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    function model(name,kind){
      if(cache[name])return cache[name];
      cache[name]=new Promise(function(ok,no){loader.load(BASE+name+'.glb',function(g){
        var meshes=[];g.scene.traverse(function(n){if(n.isMesh)meshes.push(n);});
        var o=new T.Group();
        meshes.forEach(function(mesh){
          var part=mesh.name||mesh.parent&&mesh.parent.name||'body';
          mesh.material=(part==='dark'||part==='steel')?mats[part]:mats[kind];
          o.add(mesh);
          var e=new T.LineSegments(new T.EdgesGeometry(mesh.geometry,25),new T.LineBasicMaterial({color:part==='dark'?0x000000:0x3d453d}));o.add(e);
        });ok(o);
      },undefined,no);});
      return cache[name];
    }
    function wanted(){
      var s=stage,out={kitchen:'',deep:false,island:false};
      s.querySelectorAll('.cad-kitchen img.is-active,.cad-img-kitchen.is-active').forEach(function(i){var m=/kitchen-(left|center|right)-(base|oven-fridge-built|oven|fridge-built)/.exec(i.className);if(m)out.kitchen=m[1]+'-'+m[2];});
      out.deep=!!s.querySelector('.cad-deep_cabinets img.is-active,.cad-img-deep_cabinets.is-active');
      out.island=!!s.querySelector('.cad-island img.is-active,.cad-img-island.is-active');
      return out;
    }
    function fail(){failed=true;host.hidden=true;stage.classList.remove('prava-3d-on');}
    function refresh(){
      if(failed||!renderer)return;
      var w=wanted(),key=[w.kitchen,w.deep,w.island].join('|'),myGen;
      var show=card.dataset.previewState==='planner';
      host.hidden=!show;stage.classList.toggle('prava-3d-on',show);
      if(key===current||!show)return;current=key;myGen=++gen;resize();
      var list=[];
      if(w.kitchen)list.push(model(w.kitchen,'kitchen'));
      if(w.deep)list.push(model('top-row','deep'));
      if(w.island)list.push(model('island','island'));
      Promise.all(list).then(function(objs){
        if(myGen!==gen)return;
        while(group.children.length)group.remove(group.children[0]);
        objs.forEach(function(o){group.add(o);});
      }).catch(fail);
    }
    var raf=0;function soon(){if(!raf)raf=requestAnimationFrame(function(){raf=0;refresh();});}
    Promise.resolve(window.THREE||load(THREE_URL)).then(function(){return Promise.all([window.THREE.GLTFLoader||load(GLTF_URL),window.THREE.OrbitControls||load(ORBIT_URL)]);}).then(function(){
      setup();
      new MutationObserver(soon).observe(stage,{subtree:true,attributes:true,attributeFilter:['class','style']});
      new MutationObserver(soon).observe(card,{attributes:true,attributeFilter:['data-preview-state']});
      page.addEventListener('click',function(){setTimeout(soon,120);});
      window.pravaViewer3d={refresh:soon,debug:function(){return{scene:scene,camera:camera,group:group};}};soon();
    }).catch(fail);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
