/* /verde-m-office-documents: landscape drawings are turned 90° and fill the whole A4 page when printed
   (both "print appendix" and "full package"). Hooks window.open → print() of the print pop-ups. */

(function(){
  if(window.__vmDrawingsA4)return;window.__vmDrawingsA4=true;
  var CSS=''+
  /* print of one appendix (button under the room) */
  '.print-page{padding:6mm 6mm 5mm!important}'+
  '.print-header{padding-bottom:1.5mm!important;margin-bottom:2mm!important;border-bottom-width:.3mm!important;align-items:baseline!important}'+
  '.print-header .brand,.drawing-head{display:none!important}'+
  '.print-header h1,.print-header h2{display:inline!important;font-size:10pt!important;margin:0 3mm 0 0!important}'+
  '.print-header .contract{font-size:8pt!important}.print-header .contract strong{display:inline!important;font-size:9pt!important;margin:0 0 0 1mm!important}'+
  '.drawing{flex:1 1 auto!important;min-height:0!important}'+
  '.drawing img{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important}'+
  '.print-page footer{margin-top:1.5mm!important;padding-top:1mm!important}'+
  /* whole package print */
  '.vmo-drawing-page{width:auto!important;min-height:0!important;height:266mm!important;padding:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important}'+
  '.vmo-drawing-page .vmo-page-head{padding-bottom:1.5mm!important;margin-bottom:2mm!important;align-items:baseline!important}'+
  '.vmo-drawing-page .vmo-brand,.vmo-drawing-page .vmo-drawing-title{display:none!important}'+
  '.vmo-drawing-page .vmo-page-head h1,.vmo-drawing-page .vmo-page-head h2{display:inline!important;font-size:10pt!important;margin:0 3mm 0 0!important}'+
  '.vmo-drawing-page .vmo-contract{font-size:8pt!important}.vmo-drawing-page .vmo-contract strong{display:inline!important;font-size:9pt!important;margin-left:1mm!important}'+
  '.vmo-drawing-page .vmo-drawing-frame{flex:1 1 auto!important;height:auto!important;min-height:0!important;padding:0!important;border:0!important}'+
  '.vmo-drawing-page .vmo-drawing-frame img,.vmo-drawing-page .vmo-drawing-frame canvas{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important}'+
  '.vmo-drawing-page .vmo-page-footer{margin-top:1.5mm!important;padding-top:1mm!important}';

  function rotate(img){
    return new Promise(function(done){
      function go(){
        try{
          var w=img.naturalWidth,h=img.naturalHeight;
          if(img.getAttribute('data-vm-rot')||!w||w<=h){done();return;}
          var c=img.ownerDocument.createElement('canvas');c.width=h;c.height=w;
          var x=c.getContext('2d');x.translate(0,w);x.rotate(-Math.PI/2);x.drawImage(img,0,0);
          var url=c.toDataURL('image/png');
          img.setAttribute('data-vm-rot','1');
          img.onload=function(){done();};img.onerror=function(){done();};
          img.src=url;
          setTimeout(done,3000);
        }catch(e){done();} /* e.g. a picture from another site: printed unrotated */
      }
      if(img.complete&&img.naturalWidth)go();else{img.addEventListener('load',go,{once:true});img.addEventListener('error',function(){done();},{once:true});}
    });
  }
  function prepare(win){
    var d=win.document;
    var imgs=[].slice.call(d.querySelectorAll('.print-page .drawing img,.vmo-drawing-page .vmo-drawing-frame img'));
    if(!imgs.length)return Promise.resolve();
    if(!d.getElementById('vm-drawings-a4')){var s=d.createElement('style');s.id='vm-drawings-a4';s.textContent='@media print{'+CSS+'}'+CSS;(d.head||d.documentElement).appendChild(s);}
    return Promise.all(imgs.map(rotate)).then(function(){return new Promise(function(r){setTimeout(r,200);});});
  }
  var open=window.open;
  window.open=function(){
    var win=open.apply(window,arguments);
    if(!win)return win;
    try{
      var print=win.print;
      win.print=function(){var self=this;prepare(win).then(function(){print.call(win);},function(){print.call(win);});};
    }catch(e){}
    return win;
  };
  window.__vmPrepareDrawings=prepare;
})();
