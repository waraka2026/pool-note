(()=>{
  'use strict';
  function clampTablePan(){
    if(tableZoom<=1){tablePan.x=0;tablePan.y=0;return;}
    const wrap=tableWrap.getBoundingClientRect();
    const scale=fitScale*tableZoom;
    const scaledW=(tableFrame.offsetWidth||1)*scale;
    const scaledH=(tableFrame.offsetHeight||1)*scale;
    tablePan.x=Math.max(Math.min(0,wrap.width-scaledW),Math.min(0,tablePan.x));
    tablePan.y=Math.max(Math.min(0,wrap.height-scaledH),Math.min(0,tablePan.y));
  }
  applyTableTransform=function(){
    clampTablePan();
    tableFrame.style.transformOrigin='0 0';
    tableFrame.style.transform=`translate(${tablePan.x}px,${tablePan.y}px) scale(${fitScale*tableZoom})`;
  };
  resetTableZoom=function(){
    tableZoom=1;tablePan={x:0,y:0};pinchGesture=null;tableTouches.clear();applyTableTransform();renderLines();
  };
  let panGesture=null;
  function canPan(target){
    return tableZoom>1&&mode==='move'&&!groupMoveMode&&!target.closest('.ball,.note,.line-hit,.shot-line,.plain-line,.line-handle,.target-guide');
  }
  tableWrap.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch'||!e.isPrimary||!canPan(e.target))return;
    panGesture={id:e.pointerId,x:e.clientX,y:e.clientY,startX:tablePan.x,startY:tablePan.y};
    e.preventDefault();
  },{capture:true,passive:false});
  tableWrap.addEventListener('pointermove',e=>{
    if(!panGesture||e.pointerId!==panGesture.id)return;
    if(tableTouches.size>1){panGesture=null;return;}
    tablePan.x=panGesture.startX+(e.clientX-panGesture.x);
    tablePan.y=panGesture.startY+(e.clientY-panGesture.y);
    applyTableTransform();
    e.preventDefault();e.stopPropagation();
  },{capture:true,passive:false});
  const end=e=>{if(panGesture&&e.pointerId===panGesture.id){panGesture=null;applyTableTransform();}};
  for(const t of ['pointerup','pointercancel','lostpointercapture'])tableWrap.addEventListener(t,end,{capture:true});
  window.addEventListener('resize',()=>requestAnimationFrame(applyTableTransform));
  if(window.visualViewport)window.visualViewport.addEventListener('resize',()=>requestAnimationFrame(applyTableTransform));
  applyTableTransform();

  const style=document.createElement('style');
  style.textContent=`
    .editor-sidebar.menu-collapsed,.board-column.landscape .editor-sidebar.menu-collapsed,.board-column.portrait .editor-sidebar.menu-collapsed{
      width:74px!important;min-width:74px!important;max-width:74px!important;height:74px!important;min-height:74px!important;max-height:74px!important;
      padding:6px!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:50%!important;overflow:visible!important;flex-basis:74px!important;
    }
    .editor-sidebar.menu-collapsed .menu-drag-handle{display:none!important}
    .editor-sidebar.menu-collapsed .menu-toggle-btn{
      display:flex!important;width:62px!important;min-width:62px!important;max-width:62px!important;height:62px!important;min-height:62px!important;max-height:62px!important;
      margin:0!important;flex:0 0 62px!important;border-radius:50%!important;position:static!important;transform:none!important;
    }
    .editor-sidebar.menu-detached[data-orientation="portrait"]:not(.menu-collapsed){
      width:150px!important;min-width:150px!important;max-width:150px!important;height:auto!important;max-height:calc(100dvh - 24px)!important;
      overflow-y:auto!important;overflow-x:hidden!important;touch-action:pan-y!important;
    }
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed){
      width:min(620px,calc(100vw - 24px))!important;min-width:0!important;max-width:min(620px,calc(100vw - 24px))!important;
      height:58px!important;min-height:58px!important;max-height:58px!important;padding:6px 8px!important;overflow-x:auto!important;overflow-y:hidden!important;
      touch-action:pan-x!important;flex-wrap:nowrap!important;-webkit-overflow-scrolling:touch;scrollbar-width:thin;
    }
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .orientation-control,
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .tools,
    .editor-sidebar.menu-detached[data-orientation="landscape"]:not(.menu-collapsed) .tools-row{
      display:flex!important;flex-direction:row!important;flex-wrap:nowrap!important;width:max-content!important;min-width:max-content!important;max-width:none!important;overflow:visible!important;
    }
    .board-column.landscape>.editor-sidebar:not(.menu-detached):not(.menu-collapsed){
      width:min(620px,calc(100vw - 24px))!important;min-width:0!important;max-width:min(620px,calc(100vw - 24px))!important;
      overflow-x:auto!important;overflow-y:hidden!important;touch-action:pan-x!important;
    }
  `;
  document.head.append(style);

  function menuViewport(){
    const vv=window.visualViewport;
    return {left:vv?vv.offsetLeft:0,top:vv?vv.offsetTop:0,width:vv?vv.width:document.documentElement.clientWidth,height:vv?vv.height:document.documentElement.clientHeight};
  }
  clampMenuPosition=function(){
    if(!editorSidebar.classList.contains('menu-detached')&&editorSidebar.style.position!=='fixed')return;
    const vp=menuViewport(),r=editorSidebar.getBoundingClientRect(),m=10;
    let left=parseFloat(editorSidebar.style.left),top=parseFloat(editorSidebar.style.top);
    if(!Number.isFinite(left))left=r.left;
    if(!Number.isFinite(top))top=r.top;
    const minLeft=vp.left+m,minTop=vp.top+m;
    const maxLeft=Math.max(minLeft,vp.left+vp.width-r.width-m),maxTop=Math.max(minTop,vp.top+vp.height-r.height-m);
    editorSidebar.style.position='fixed';editorSidebar.style.left=Math.max(minLeft,Math.min(left,maxLeft))+'px';editorSidebar.style.top=Math.max(minTop,Math.min(top,maxTop))+'px';
    editorSidebar.style.right='auto';editorSidebar.style.bottom='auto';editorSidebar.style.margin='0';editorSidebar.style.transform='none';
  };
  lockCurrentMenuSize=function(){
    if(orientation==='landscape'){
      editorSidebar.style.setProperty('width','min(620px,calc(100vw - 24px))','important');editorSidebar.style.setProperty('max-width','min(620px,calc(100vw - 24px))','important');
      editorSidebar.style.removeProperty('min-width');editorSidebar.style.setProperty('height','58px','important');editorSidebar.style.setProperty('max-height','58px','important');editorSidebar.style.removeProperty('flex-basis');
    }else{
      editorSidebar.style.setProperty('width','150px','important');editorSidebar.style.setProperty('min-width','150px','important');editorSidebar.style.setProperty('max-width','150px','important');
      editorSidebar.style.setProperty('height','auto','important');editorSidebar.style.setProperty('max-height','calc(100dvh - 24px)','important');editorSidebar.style.removeProperty('flex-basis');
    }
  };
  setMenuExpanded=function(expanded){
    const detached=editorSidebar.classList.contains('menu-detached'),before=editorSidebar.getBoundingClientRect(),cx=before.left+before.width/2,cy=before.top+before.height/2;
    editorSidebar.classList.toggle('menu-collapsed',!expanded);
    menuToggleBtn.setAttribute('aria-expanded',String(expanded));menuToggleBtn.setAttribute('aria-label',expanded?'編集メニューを閉じる':'編集メニューを開く');
    menuToggleBtn.title=expanded?'編集メニューを閉じる':'編集メニューを開く';menuToggleBtn.querySelector('span').textContent=expanded?'×':'☰';menuToggleBtn.querySelector('small').textContent=expanded?'閉じる':'メニュー';
    if(detached){
      editorSidebar.classList.add('menu-detached');editorSidebar.style.position='fixed';editorSidebar.style.margin='0';editorSidebar.style.right='auto';editorSidebar.style.bottom='auto';editorSidebar.style.transform='none';
      if(expanded)lockCurrentMenuSize();else clearMenuSizeLock();
    }
    requestAnimationFrame(()=>{
      if(detached){const after=editorSidebar.getBoundingClientRect();editorSidebar.style.left=(cx-after.width/2)+'px';editorSidebar.style.top=(cy-after.height/2)+'px';clampMenuPosition();}
      layoutTable(true);requestAnimationFrame(()=>{if(detached)clampMenuPosition()});
    });
  };
})();