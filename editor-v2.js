(()=>{
  const body=document.body;
  const dock=document.querySelector('#mobileV2Dock');
  const more=document.querySelector('#mobileV2More');
  const colorPanel=document.querySelector('#lineColorPanel');
  const tray=document.querySelector('.tray');
  const tip=document.querySelector('.tip-point');
  if(!dock)return;

  const classes=['sheet-balls','sheet-tip','sheet-more'];
  function clearSheets(){
    classes.forEach(c=>body.classList.remove(c));
    dock.querySelectorAll('button[data-sheet]').forEach(b=>b.classList.remove('active'));
    if(colorPanel) colorPanel.hidden=true;
  }
  function toggleClass(name,btn){
    const was=body.classList.contains(name);
    clearSheets();
    if(!was){body.classList.add(name);btn?.classList.add('active')}
  }
  function addClose(el){
    if(!el||el.querySelector('.v2-sheet-close'))return;
    const b=document.createElement('button');
    b.type='button';b.className='v2-sheet-close';b.textContent='×';b.setAttribute('aria-label','閉じる');
    b.onclick=clearSheets;el.prepend(b);
  }
  addClose(tray);addClose(tip);

  dock.querySelectorAll('button[data-sheet]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const which=btn.dataset.sheet;
      if(which==='balls'){toggleClass('sheet-balls',btn);return}
      if(which==='tip'){toggleClass('sheet-tip',btn);return}
      if(which==='more'){toggleClass('sheet-more',btn);return}
      clearSheets();btn.classList.add('active');
      if(which==='arrow'){
        if(colorPanel.hidden) document.querySelector('#drawBtn')?.click();
        if(typeof mode!=='undefined'&&mode!=='line') document.querySelector('#colorArrowBtn')?.click();
        colorPanel.hidden=false;
      }
      if(which==='line'){
        if(colorPanel.hidden) document.querySelector('#drawBtn')?.click();
        if(typeof mode!=='undefined'&&mode!=='plain') document.querySelector('#colorPlainBtn')?.click();
        colorPanel.hidden=false;
      }
    });
  });

  document.querySelector('#mobileV2Close')?.addEventListener('click',clearSheets);

  const proxy=(proxyId,targetId,after)=>{
    const p=document.querySelector(proxyId);
    if(!p)return;
    p.addEventListener('click',()=>{
      const t=document.querySelector(targetId);
      if(t)t.click();
      if(after!==false)clearSheets();
    });
  };
  proxy('#mvPortrait','#portraitBtn');
  proxy('#mvLandscape','#landscapeBtn');
  proxy('#mvGroup','#groupMoveBtn');
  proxy('#mvUndo','#undoBtn');
  proxy('#mvRedo','#redoBtn');
  proxy('#mvMemo','#memoBtn');
  proxy('#mvSave','#saveBtn');
  proxy('#mvZoom','#zoomResetBtn');
  proxy('#mvReset','#resetBtn');
  proxy('#mvGuide','#guideBtn');
  proxy('#mvSaved','#savedBtn');

  const oldUpdateSideLayout=typeof updateSideLayout==='function'?updateSideLayout:null;
  if(oldUpdateSideLayout){
    updateSideLayout=function(){
      oldUpdateSideLayout();
      if(matchMedia('(max-width:760px)').matches){
        sideControls.style.width='0px';
        sideControls.style.minWidth='0px';
      }
    };
  }

  function forceCenter(){
    if(!matchMedia('(max-width:760px)').matches)return;
    const wrap=document.querySelector('.table-wrap');
    if(wrap){
      wrap.style.marginLeft='auto';
      wrap.style.marginRight='auto';
    }
  }
  window.addEventListener('resize',()=>requestAnimationFrame(forceCenter));
  requestAnimationFrame(()=>{forceCenter(); if(typeof layoutTable==='function')layoutTable(true)});
})();