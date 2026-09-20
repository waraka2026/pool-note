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
/* v3 dialog backdrop-close + hard centering */
(()=>{
  const saved=document.querySelector('#savedDialog');
  if(saved){
    saved.addEventListener('pointerdown',e=>{
      if(e.target===saved) saved.close();
    });
  }

  function hardCenterTable(){
    if(!matchMedia('(max-width:760px)').matches)return;
    const wrap=document.querySelector('.table-wrap');
    const frame=document.querySelector('#tableFrame,.table-frame');
    if(wrap){
      wrap.style.setProperty('display','grid','important');
      wrap.style.setProperty('place-items','start center','important');
      wrap.style.setProperty('width','100%','important');
      wrap.style.setProperty('margin','0','important');
    }
    if(frame){
      frame.style.setProperty('margin-left','auto','important');
      frame.style.setProperty('margin-right','auto','important');
      frame.style.setProperty('justify-self','center','important');
    }
  }
  window.addEventListener('resize',()=>requestAnimationFrame(hardCenterTable));
  window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(hardCenterTable));
  requestAnimationFrame(()=>requestAnimationFrame(hardCenterTable));
})();

/* v4: include iPad/tablet widths when centering */
(()=>{
  function centerTablet(){
    if(!matchMedia('(max-width:1180px)').matches)return;
    const wrap=document.querySelector('.table-wrap');
    const frame=document.querySelector('#tableFrame,.table-frame');
    if(wrap){
      wrap.style.setProperty('display','grid','important');
      wrap.style.setProperty('place-items','start center','important');
      wrap.style.setProperty('width','100%','important');
      wrap.style.setProperty('margin','0','important');
    }
    if(frame){
      frame.style.setProperty('margin-left','auto','important');
      frame.style.setProperty('margin-right','auto','important');
      frame.style.setProperty('justify-self','center','important');
    }
  }
  requestAnimationFrame(()=>requestAnimationFrame(centerTablet));
  window.addEventListener('resize',()=>requestAnimationFrame(centerTablet));
  window.visualViewport?.addEventListener('resize',()=>requestAnimationFrame(centerTablet));
})();

/* v6: fixed top editor collapse/expand */
(()=>{
  const menu=document.querySelector('#editorMenu');
  const toggle=document.querySelector('#menuToggleBtn');
  if(menu && toggle){
    // Default expanded.
    menu.classList.remove('menu-collapsed');
    toggle.setAttribute('aria-expanded','true');
    const label=toggle.querySelector('small');
    if(label) label.textContent='閉じる';
    const icon=toggle.querySelector('span');
    if(icon) icon.textContent='×';

    // Replace prior toggle behavior with explicit collapse state.
    const fresh=toggle.cloneNode(true);
    toggle.parentNode.replaceChild(fresh,toggle);

    fresh.addEventListener('click',()=>{
      const collapsed=menu.classList.toggle('menu-collapsed');
      fresh.setAttribute('aria-expanded',String(!collapsed));
      const l=fresh.querySelector('small');
      const i=fresh.querySelector('span');
      if(l) l.textContent=collapsed?'開く':'閉じる';
      if(i) i.textContent=collapsed?'☰':'×';
    });
  }
})();
