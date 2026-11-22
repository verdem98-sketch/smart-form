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

  // bounding box of the non-white pixels (the drawing itself, without the empty paper around it)
  function inkBox(ctx,w,h){
    var d=ctx.getImageData(0,0,w,h).data,x0=w,y0=h,x1=-1,y1=-1;
    for(var y=0;y<h;y++){for(var x=0;x<w;x++){var i=(y*w+x)*4;
      if(d[i+3]>20&&(d[i]<235||d[i+1]<235||d[i+2]<235)){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}}
    if(x1<0)return null;
    var pad=Math.round(Math.max(w,h)*0.008);
    x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w-1,x1+pad);y1=Math.min(h-1,y1+pad);
    return {x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};
  }
  // trims the white margins, then turns a landscape drawing 90° so it fills a portrait A4 page
  function fit(img){
    return new Promise(function(done){
      function go(){
        try{
          if(img.getAttribute('data-vm-rot')){done();return;}
          var doc=img.ownerDocument,W=img.naturalWidth,H=img.naturalHeight;if(!W||!H){done();return;}
          var a=doc.createElement('canvas');a.width=W;a.height=H;var ax=a.getContext('2d');
          ax.fillStyle='#fff';ax.fillRect(0,0,W,H);ax.drawImage(img,0,0);
          var b=inkBox(ax,W,H)||{x:0,y:0,w:W,h:H};
          var land=b.w>b.h,c=doc.createElement('canvas');
          c.width=land?b.h:b.w;c.height=land?b.w:b.h;var x=c.getContext('2d');
          x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
          if(land){x.translate(0,b.w);x.rotate(-Math.PI/2);}
          x.drawImage(a,b.x,b.y,b.w,b.h,0,0,b.w,b.h);
          var url=c.toDataURL('image/png');
          img.setAttribute('data-vm-rot','1');
          img.onload=function(){done();};img.onerror=function(){done();};
          img.src=url;
          setTimeout(done,3000);
        }catch(e){done();} /* e.g. a picture from another site: printed as it is */
      }
      if(img.complete&&img.naturalWidth)go();else{img.addEventListener('load',go,{once:true});img.addEventListener('error',function(){done();},{once:true});}
    });
  }
  function prepare(win){
    var d=win.document;
    var imgs=[].slice.call(d.querySelectorAll('.print-page .drawing img,.vmo-drawing-page .vmo-drawing-frame img'));
    if(!imgs.length)return Promise.resolve();
    if(!d.getElementById('vm-drawings-a4')){var s=d.createElement('style');s.id='vm-drawings-a4';s.textContent='@media print{'+CSS+'}'+CSS;(d.head||d.documentElement).appendChild(s);}
    return Promise.all(imgs.map(fit)).then(function(){return new Promise(function(r){setTimeout(r,200);});});
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
