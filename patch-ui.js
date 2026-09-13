(()=>{
  'use strict';

  /* ---- floating menu: keep the same layout even after detaching ---- */
  const style=document.createElement('style');
  style.textContent=`
    .board-column{overflow-x:hidden!important}
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed){
      display:flex!important;flex-direction:row!important;align-items:center!important;gap:5px!important;
      width:max-content!important;max-width:calc(100vw - 8px)!important;height:auto!important;min-height:0!important;
      padding:6px 8px!important;border-radius:10px!important;overflow-x:auto!important;overflow-y:hidden!important;
    }
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .menu-toggle-btn{
      order:0!important;flex:0 0 38px!important;width:38px!important;height:38px!important;margin:0 3px 0 0!important;
    }
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control,
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .tools,
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .tools-row{
      display:flex!important;flex-direction:row!important;align-items:center!important;width:auto!important;
      margin:0!important;padding:0!important;border:0!important;gap:3px!important;
    }
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control>div,
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .editor-row{
      display:block!important;width:auto!important;min-width:0!important;
    }
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .tool-help{display:none!important}
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .editor-row button,
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control button{
      width:36px!important;height:36px!important;min-width:36px!important;flex:0 0 36px!important;padding:5px!important;
    }
    .editor-sidebar.menu-detached.menu-collapsed{width:68px!important;min-width:68px!important;max-width:68px!important;height:68px!important;min-height:68px!important;max-height:68px!important}
    .history-row button:disabled{opacity:.3;cursor:default}
  `;
  document.head.append(style);

  // A detached landscape menu used to lose the .board-column.landscape ancestor,
  // so its horizontal styling disappeared. Keep orientation on the menu itself.
  const originalLockCurrentMenuSize=lockCurrentMenuSize;
  lockCurrentMenuSize=function(){
    const r=editorSidebar.getBoundingClientRect();
    if(orientation==='landscape'){
      editorSidebar.style.setProperty('width',Math.min(r.width,window.innerWidth-8)+'px','important');
      editorSidebar.style.removeProperty('min-width');
      editorSidebar.style.setProperty('max-width','calc(100vw - 8px)','important');
      editorSidebar.style.setProperty('height','auto','important');
      editorSidebar.style.removeProperty('min-height');
      editorSidebar.style.setProperty('max-height','calc(100dvh - 8px)','important');
      editorSidebar.style.removeProperty('flex-basis');
      return;
    }
    originalLockCurrentMenuSize();
  };

  // Closing/opening a moved menu must not send it back to the default slot.
  setMenuExpanded=function(expanded){
    const detached=editorSidebar.classList.contains('menu-detached');
    const before=editorSidebar.getBoundingClientRect();
    editorSidebar.classList.toggle('menu-collapsed',!expanded);
    if(detached){
      clearMenuSizeLock();
      editorSidebar.classList.add('menu-detached');
      editorSidebar.style.position='fixed';
      editorSidebar.style.margin='0';
      editorSidebar.style.right='auto';
      editorSidebar.style.bottom='auto';
      editorSidebar.style.transform='none';
      editorSidebar.style.left=before.left+'px';
      editorSidebar.style.top=before.top+'px';
      if(expanded&&orientation==='landscape'){
        editorSidebar.style.setProperty('width','max-content','important');
        editorSidebar.style.setProperty('max-width','calc(100vw - 8px)','important');
      }
    }
    menuToggleBtn.setAttribute('aria-expanded',String(expanded));
    menuToggleBtn.setAttribute('aria-label',expanded?'編集メニューを閉じる':'編集メニューを開く');
    menuToggleBtn.title=expanded?'編集メニューを閉じる':'編集メニューを開く';
    menuToggleBtn.querySelector('span').textContent=expanded?'×':'☰';
    menuToggleBtn.querySelector('small').textContent=expanded?'閉じる':'メニュー';
    requestAnimationFrame(()=>{
      clampMenuPosition();
      layoutTable(true);
      if(detached)requestAnimationFrame(clampMenuPosition);
    });
  };

  /* ---- eraser: balls also delete on tap ---- */
  table.addEventListener('pointerdown',e=>{
    if(mode!=='erase'||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0))return;
    const ball=e.target.closest('.ball');
    if(!ball||ball.classList.contains('linked-ghost')||!ball.dataset.n)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    cancelBallHold();
    removeBall(ball.dataset.n);
  },true);

  /* ---- lock the table itself; pinch may zoom but must never pan it away ---- */
  applyTableTransform=function(){
    tableFrame.style.transformOrigin='center center';
    tableFrame.style.transform=`scale(${fitScale*tableZoom})`;
  };
  resetTableZoom=function(){
    tableZoom=1;tablePan={x:0,y:0};pinchGesture=null;tableTouches.clear();applyTableTransform();renderLines();
  };
  tablePan={x:0,y:0};
  applyTableTransform();

  /* ---- undo / redo ---- */
  const toolsRow=document.querySelector('.tools-row');
  const drawRow=document.querySelector('#drawBtn')?.closest('.editor-row');
  function historyControl(id,label,symbol){
    const row=document.createElement('div');row.className='editor-row history-row';
    const help=document.createElement('span');help.className='tool-help';help.textContent=label;
    const btn=document.createElement('button');btn.type='button';btn.id=id;btn.title=label;btn.setAttribute('aria-label',label);
    btn.innerHTML=`<span aria-hidden="true" style="font-size:24px;line-height:1">${symbol}</span>`;
    row.append(help,btn);return {row,btn};
  }
  const undo=historyControl('undoBtn','1個前に戻る','↶');
  const redo=historyControl('redoBtn','1個前に進む','↷');
  if(drawRow){toolsRow.insertBefore(undo.row,drawRow);toolsRow.insertBefore(redo.row,drawRow)}else{toolsRow.append(undo.row,redo.row)}

  let history=[],historyIndex=-1,historyTimer=null,applyingHistory=false;
  const snap=()=>({
    state:structuredClone(state),lines:structuredClone(lines),notes:structuredClone(notes),
    tip:tip?structuredClone(tip):null,orientation,gridVisible,currentSaveId,currentTitle
  });
  const key=s=>JSON.stringify(s);
  function refreshHistoryButtons(){
    undo.btn.disabled=historyIndex<=0;
    redo.btn.disabled=historyIndex<0||historyIndex>=history.length-1;
  }
  function pushHistoryNow(){
    clearTimeout(historyTimer);historyTimer=null;
    const s=snap(),k=key(s);
    if(historyIndex>=0&&key(history[historyIndex])===k){refreshHistoryButtons();return}
    history=history.slice(0,historyIndex+1);history.push(s);
    if(history.length>80)history.shift();
    historyIndex=history.length-1;refreshHistoryButtons();
  }
  function scheduleHistory(){
    clearTimeout(historyTimer);historyTimer=setTimeout(pushHistoryNow,180);
  }
  const oldMarkUnsaved=markUnsaved;
  markUnsaved=function(){oldMarkUnsaved();if(!applyingHistory)scheduleHistory()};
  function applyHistory(s){
    applyingHistory=true;
    state=structuredClone(s.state);lines=structuredClone(s.lines);notes=structuredClone(s.notes);tip=s.tip?structuredClone(s.tip):null;
    currentSaveId=s.currentSaveId;currentTitle=s.currentTitle||'';
    if(orientation!==s.orientation)setOrientation(s.orientation,false,false);
    gridVisible=s.gridVisible!==false;
    table.classList.toggle('grid-hidden',!gridVisible);
    gridToggleBtn.classList.toggle('active',gridVisible);
    gridToggleBtn.setAttribute('aria-pressed',String(gridVisible));
    gridHelp.textContent=gridVisible?'罫線を表示':'罫線を非表示';
    selectedLine=-1;draggingBall=null;draggingLine=null;lineStart=null;lineDraft=null;groupDrag=null;
    render();layoutTable(true);oldMarkUnsaved();
    applyingHistory=false;refreshHistoryButtons();
  }
  undo.btn.onclick=()=>{
    if(historyTimer)pushHistoryNow();
    if(historyIndex<=0)return;
    historyIndex--;applyHistory(history[historyIndex]);
  };
  redo.btn.onclick=()=>{
    if(historyTimer)pushHistoryNow();
    if(historyIndex>=history.length-1)return;
    historyIndex++;applyHistory(history[historyIndex]);
  };
  // Include grid toggles in history as well.
  gridToggleBtn.addEventListener('click',()=>{if(!applyingHistory)scheduleHistory()});
  pushHistoryNow();

  layoutTable(true);
})();