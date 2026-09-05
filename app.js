const colors=['#f3d400','#1767c8','#e6382e','#6b3ba9','#ef7d15','#248046','#7b201d','#111','#f0d63b','#1767c8','#e6382e','#6b3ba9','#ef7d15','#248046','#7b201d'];
const table=document.querySelector('.cloth');
const tableFrame=document.querySelector('.table');
const layer=document.querySelector('#ballsLayer');
const notesLayer=document.querySelector('#notesLayer');
const svg=document.querySelector('#lines');
const cueDiagram=document.querySelector('#cueDiagram');
const tipMark=document.querySelector('#tipMark');

let mode='move',draggingBall=null,draggingLine=null,lineStart=null,lineDraft=null,lines=[],notes=[],state={},selectedLine=-1,tip=null,tipDragging=false,activeLineColor='auto',activeLineChoice='auto',paletteLineType='line',currentSaveId=null,repeatBallSeq=0;
let ballPress=null,ballMoved=false,lastBallTap=null;
const defs=`<defs></defs>`;

function ballKind(n){const id=String(n);return id==='cue'||id.startsWith('cue-')?'cue':id==='ghost'||id.startsWith('ghost-')?'ghost':id}
function ballColor(n){const kind=ballKind(n);return kind==='cue'?'#fff':kind==='ghost'?'#dce7e3':colors[Number(kind)-1]||'#fff'}
function repeatBallId(kind){repeatBallSeq+=1;return `${kind}-${Date.now()}-${repeatBallSeq}`}

function markUnsaved(){document.querySelector('#saveState').textContent='未保存'}
function defaultState(){state={};lines=[];notes=[];tip=null;selectedLine=-1;currentSaveId=null;render();markUnsaved()}
function clearTable(){state={};lines=[];notes=[];tip=null;selectedLine=-1;currentSaveId=null;render();markUnsaved()}
function ballEl(n,x,y,mini=false){
  const kind=ballKind(n),el=document.createElement('div'),striped=!['cue','ghost'].includes(kind)&&Number(kind)>8;
  el.className=`ball ${mini?'mini':''} ${kind==='cue'?'cue':''} ${kind==='ghost'?'ghost':''} ${striped?'striped':''}`;
  if(!['cue','ghost'].includes(kind))el.style.setProperty('--ball',colors[Number(kind)-1]);
  el.dataset.n=n;el.style.left=x+'%';el.style.top=y+'%';el.innerHTML=['cue','ghost'].includes(kind)?'':`<span>${kind}</span>`;el.setAttribute('aria-label',kind==='cue'?'手玉':kind==='ghost'?'イメージボール':`${kind}番ボール`);
  if(!mini)el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();removeBall(n)});
  return el;
}
function renderBalls(){layer.innerHTML='';Object.entries(state).forEach(([n,p])=>layer.append(ballEl(n,p.x,p.y)))}
function updateBallPositions(){Object.entries(state).forEach(([n,p])=>{const el=layer.querySelector(`[data-n="${n}"]`);if(el){el.style.left=p.x+'%';el.style.top=p.y+'%'}})}
function freeSpot(){
  const r=table.getBoundingClientRect(),minDist=24,existing=Object.values(state);
  const fitsPx=(px,py)=>existing.every(b=>Math.hypot(b.x*r.width/100-px,b.y*r.height/100-py)>=minDist);
  const cx=r.width/2,cy=r.height/2;
  if(fitsPx(cx,cy))return{x:50,y:50};
  for(let ring=1;ring<=16;ring++){
    const radius=ring*(minDist*.85),steps=Math.max(8,ring*8);
    for(let i=0;i<steps;i++){
      const angle=(i/steps)*Math.PI*2,px=cx+radius*Math.cos(angle),py=cy+radius*Math.sin(angle);
      if(px<r.width*.05||px>r.width*.95||py<r.height*.03||py>r.height*.97)continue;
      if(fitsPx(px,py))return{x:px/r.width*100,y:py/r.height*100};
    }
  }
  return{x:50,y:50};
}
function renderTray(){
  const tray=document.querySelector('#trayBalls');tray.innerHTML='';
  ['cue','ghost',1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].filter(n=>['cue','ghost'].includes(String(n))||!state[n]).forEach(n=>{const ball=ballEl(n,0,0,true);ball.onclick=()=>{const id=['cue','ghost'].includes(String(n))?repeatBallId(String(n)):n;state[id]=freeSpot();render();markUnsaved()};tray.append(ball)});
}
function renderNotes(){
  notesLayer.innerHTML='';notes.forEach((note,i)=>{
    const el=document.createElement('div');el.className='table-note';el.textContent=note.text;el.style.left=note.x+'%';el.style.top=note.y+'%';el.style.color=note.color||'#ffe15b';
    el.addEventListener('pointerdown',e=>{e.stopPropagation();el.setPointerCapture(e.pointerId)});
    el.addEventListener('pointermove',e=>{if(!el.hasPointerCapture(e.pointerId))return;const p=point(e);note.x=p.x;note.y=p.y;el.style.left=p.x+'%';el.style.top=p.y+'%'});
    el.addEventListener('pointerup',e=>{if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);markUnsaved()});
    el.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();notes.splice(i,1);renderNotes();markUnsaved()});notesLayer.append(el);
  });
}
function point(e){const r=table.getBoundingClientRect();return{x:Math.max(2,Math.min(98,(e.clientX-r.left)/r.width*100)),y:Math.max(2,Math.min(98,(e.clientY-r.top)/r.height*100))}}
function nearestBall(p,maxPx=36,exclude=null){
  const r=table.getBoundingClientRect();let found=null,best=maxPx;
  Object.entries(state).forEach(([n,b])=>{if(String(n)===String(exclude))return;const d=Math.hypot((b.x-p.x)*r.width/100,(b.y-p.y)*r.height/100);if(d<best){best=d;found=n}});return found;
}
function syncBallLines(n){const b=state[n];if(!b)return;lines.forEach(l=>{if(String(l.startBall)===String(n)){l.x1=b.x;l.y1=b.y}if(String(l.endBall)===String(n)){l.x2=b.x;l.y2=b.y}})}
function visibleEnds(l){
  const r=table.getBoundingClientRect(),dx=(l.x2-l.x1)*r.width/100,dy=(l.y2-l.y1)*r.height/100,len=Math.hypot(dx,dy)||1,startTrim=l.startBall?11:0,endTrim=l.endBall?11:0;
  return{x1:l.x1+(dx/len)*startTrim/r.width*100,y1:l.y1+(dy/len)*startTrim/r.height*100,x2:l.x2-(dx/len)*endTrim/r.width*100,y2:l.y2-(dy/len)*endTrim/r.height*100};
}
function lineLengthPx(l){const r=table.getBoundingClientRect(),v=visibleEnds(l);return Math.hypot((v.x2-v.x1)*r.width/100,(v.y2-v.y1)*r.height/100)}
function lineMarkup(l,i,draft=false){
  const v=visibleEnds(l),len=lineLengthPx(l),isArrow=l.type!=='plain',color=l.color||ballColor(l.startBall),markerId=`arrow-${draft?'draft':i}`,marker=isArrow&&len>14?` marker-end="url(#${markerId})"`:'',selected=!draft&&selectedLine===i?' selected-line':'';
  const markerDef=isArrow&&len>14?`<defs><marker id="${markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="${color}"/></marker></defs>`:'';
  const visual=len>3?`${markerDef}<line data-i="${i}" style="--line-color:${color}" class="${isArrow?'shot-line':'plain-line'}${selected}${draft?' draft-line':''}" x1="${v.x1}%" y1="${v.y1}%" x2="${v.x2}%" y2="${v.y2}%"${marker}/>`:'';
  const hit=draft||len<=3?'':`<line data-i="${i}" class="line-hit" x1="${v.x1}%" y1="${v.y1}%" x2="${v.x2}%" y2="${v.y2}%"/>`;return `<g>${visual}${hit}</g>`;
}
function renderLines(){let html=defs+lines.map((l,i)=>lineMarkup(l,i)).join('');if(lineDraft)html+=lineMarkup(lineDraft,-1,true);svg.innerHTML=html}
function renderTip(){if(tip){tipMark.hidden=false;tipMark.style.left=(tip.x*100)+'%';tipMark.style.top=(tip.y*100)+'%'}else{tipMark.hidden=true}}
function render(){renderBalls();renderLines();renderTray();renderNotes();renderTip()}
function removeBall(n){delete state[n];lines=lines.filter(l=>String(l.startBall)!==String(n)&&String(l.endBall)!==String(n));selectedLine=-1;render();markUnsaved()}
function removeLine(i){if(i<0||i>=lines.length)return;lines.splice(i,1);selectedLine=-1;renderLines();markUnsaved()}

table.addEventListener('pointerdown',e=>{
  if(e.target.closest('.table-note'))return;
  const ball=e.target.closest('.ball');
  if(mode==='move'&&ball){selectedLine=-1;draggingBall=ball.dataset.n;ballPress={x:e.clientX,y:e.clientY};ballMoved=false;table.setPointerCapture(e.pointerId);renderLines();return}
  if(mode==='erase'&&ball){removeBall(ball.dataset.n);return}
  if(mode==='line'||mode==='plain'){
    const p=point(e),startBall=nearestBall(p,42),a=startBall?state[startBall]:p;lineStart={...p,ball:startBall};
    const autoColor=activeLineColor==='auto';lineDraft={x1:a.x,y1:a.y,x2:p.x,y2:p.y,type:mode==='plain'?'plain':'arrow',startBall:startBall||null,endBall:null,color:autoColor?ballColor(startBall):activeLineColor,autoColor};table.setPointerCapture(e.pointerId);renderLines();return;
  }
  if(mode==='move'){selectedLine=-1;renderLines()}
});
table.addEventListener('pointermove',e=>{
  if(draggingBall){if(ballPress&&Math.hypot(e.clientX-ballPress.x,e.clientY-ballPress.y)>5)ballMoved=true;state[draggingBall]=point(e);syncBallLines(draggingBall);updateBallPositions();renderLines();return}
  if(lineStart){const p=point(e),endBall=nearestBall(p,42,lineStart.ball),b=endBall?state[endBall]:p;lineDraft.x2=b.x;lineDraft.y2=b.y;lineDraft.endBall=endBall||null;renderLines();return}
  if(!draggingLine)return;e.preventDefault();const p=point(e),l=lines[draggingLine.i],o=draggingLine.original;
  if(draggingLine.kind==='start'){
    l.startBall=null;l.x1=p.x;l.y1=p.y;
  }
  else if(draggingLine.kind==='end'){
    l.endBall=null;l.x2=p.x;l.y2=p.y;
  }
  else{
    const ballIds=draggingLine.ballIds,free=[];if(!o.startBall)free.push({x:o.x1,y:o.y1});if(!o.endBall)free.push({x:o.x2,y:o.y2});const moving=free.concat(ballIds.map(n=>draggingLine.originalBalls[n]));
    let dx=p.x-draggingLine.start.x,dy=p.y-draggingLine.start.y;dx=Math.max(-Math.min(...moving.map(q=>q.x)),Math.min(100-Math.max(...moving.map(q=>q.x)),dx));dy=Math.max(-Math.min(...moving.map(q=>q.y)),Math.min(100-Math.max(...moving.map(q=>q.y)),dy));
    ballIds.forEach(n=>{state[n]={x:draggingLine.originalBalls[n].x+dx,y:draggingLine.originalBalls[n].y+dy};syncBallLines(n)});if(!o.startBall){l.x1=o.x1+dx;l.y1=o.y1+dy}if(!o.endBall){l.x2=o.x2+dx;l.y2=o.y2+dy}updateBallPositions();
  }renderLines();
});
table.addEventListener('pointerup',()=>{
  if(draggingBall){const n=draggingBall,now=Date.now();draggingBall=null;ballPress=null;if(!ballMoved){if(lastBallTap&&lastBallTap.n===n&&now-lastBallTap.time<650){lastBallTap=null;removeBall(n);return}lastBallTap={n,time:now}}else lastBallTap=null;markUnsaved();return}
  if(lineStart){if(lineDraft&&lineLengthPx(lineDraft)>8){lines.push({...lineDraft});selectedLine=lines.length-1;markUnsaved()}lineStart=null;lineDraft=null;setMode('move',false);renderLines();return}
  if(draggingLine){
    const l=lines[draggingLine.i];
    draggingLine=null;if(lineLengthPx(l)<5)removeLine(selectedLine);else{renderLines();markUnsaved()}
  }
});
table.addEventListener('pointercancel',()=>{draggingBall=null;draggingLine=null;lineStart=null;lineDraft=null;renderLines()});

svg.addEventListener('pointerdown',e=>{
  if(e.target.dataset.i===undefined)return;e.stopPropagation();const i=Number(e.target.dataset.i);if(mode==='erase'){removeLine(i);return}if(mode!=='move')return;
  selectedLine=i;const p=point(e),l=lines[i],v=visibleEnds(l),r=table.getBoundingClientRect(),d1=Math.hypot((p.x-v.x1)*r.width/100,(p.y-v.y1)*r.height/100),d2=Math.hypot((p.x-v.x2)*r.width/100,(p.y-v.y2)*r.height/100),kind=Math.min(d1,d2)<=26?(d1<d2?'start':'end'):'move';
  const original={...l},ballIds=[...new Set([original.startBall,original.endBall].filter(Boolean))],originalBalls={};ballIds.forEach(n=>originalBalls[n]={...state[n]});draggingLine={i,kind,start:p,original,ballIds,originalBalls};table.setPointerCapture(e.pointerId);renderLines();
});
svg.addEventListener('dblclick',e=>{if(e.target.dataset.i===undefined)return;e.preventDefault();e.stopPropagation();removeLine(Number(e.target.dataset.i))});
table.addEventListener('dblclick',e=>{const ball=e.target.closest('.ball');if(!ball)return;e.preventDefault();e.stopPropagation();removeBall(ball.dataset.n)});

function updateTip(e){
  const r=cueDiagram.getBoundingClientRect();let x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  const dx=x-.5,dy=y-.5,d=Math.hypot(dx,dy);if(d>.46){const k=.46/d;x=.5+dx*k;y=.5+dy*k}
  tip={x,y};renderTip();markUnsaved();
}
cueDiagram.addEventListener('pointerdown',e=>{tipDragging=true;cueDiagram.setPointerCapture(e.pointerId);updateTip(e)});
cueDiagram.addEventListener('pointermove',e=>{if(tipDragging)updateTip(e)});
cueDiagram.addEventListener('pointerup',()=>{tipDragging=false});
cueDiagram.addEventListener('pointercancel',()=>{tipDragging=false});
document.querySelector('#tipClearBtn').onclick=()=>{tip=null;renderTip();markUnsaved()};

function setMode(next,showHint=true){
  mode=next;selectedLine=-1;renderLines();document.querySelectorAll('.tools [data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===next));
  const hint=document.querySelector('#hint');hint.textContent=mode==='line'?'球から球へなぞると自動接続':mode==='plain'?'球から球へなぞると自動接続':mode==='erase'?'球または線をタップして消去':'球をドラッグ。線の端をつかむと伸縮';hint.style.opacity=1;setTimeout(()=>hint.style.opacity=0,1800);
  if(!showHint)hint.style.opacity=0;
}
document.querySelectorAll('.tools [data-mode]').forEach(btn=>btn.onclick=()=>{if(['line','plain'].includes(btn.dataset.mode)){activeLineColor='auto';activeLineChoice='auto';refreshColorChoice()}colorPanel.hidden=true;colorBtn.classList.remove('active');setMode(btn.dataset.mode)});

const colorPanel=document.querySelector('#lineColorPanel'),colorBtn=document.querySelector('#colorBtn'),swatches=document.querySelector('#lineColorSwatches'),autoColorBtn=document.querySelector('#autoColorBtn'),lineColorPicker=document.querySelector('#lineColorPicker'),colorArrowBtn=document.querySelector('#colorArrowBtn'),colorPlainBtn=document.querySelector('#colorPlainBtn');
function refreshColorChoice(){autoColorBtn.classList.toggle('active',activeLineChoice==='auto');swatches.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.choice===activeLineChoice));colorArrowBtn.classList.toggle('active',paletteLineType==='line');colorPlainBtn.classList.toggle('active',paletteLineType==='plain')}
function usePaletteMode(){setMode(paletteLineType,false);colorBtn.classList.add('active')}
[['cue','白'],...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(n=>[n,n])].forEach(([n,label])=>{const b=document.createElement('button');b.type='button';b.className='color-swatch';b.dataset.choice=String(n);b.dataset.color=ballColor(n);b.textContent=label;b.title=`${label}の色`;b.style.background=n==='cue'?'#fff':Number(n)>8?`linear-gradient(#fff 0 22%,${ballColor(n)} 22% 76%,#fff 76%)`:ballColor(n);b.onclick=()=>{activeLineColor=b.dataset.color;activeLineChoice=b.dataset.choice;usePaletteMode();refreshColorChoice()};swatches.append(b)});
colorArrowBtn.onclick=()=>{paletteLineType='line';usePaletteMode();refreshColorChoice()};colorPlainBtn.onclick=()=>{paletteLineType='plain';usePaletteMode();refreshColorChoice()};
autoColorBtn.onclick=()=>{activeLineColor='auto';activeLineChoice='auto';usePaletteMode();refreshColorChoice()};lineColorPicker.oninput=()=>{activeLineColor=lineColorPicker.value;activeLineChoice='custom';usePaletteMode();refreshColorChoice()};refreshColorChoice();
colorBtn.onclick=()=>{if(['line','plain'].includes(mode))paletteLineType=mode;colorPanel.hidden=!colorPanel.hidden;colorBtn.classList.toggle('active',!colorPanel.hidden);refreshColorChoice()};
document.querySelector('#lineColorClose').onclick=()=>{colorPanel.hidden=true;colorBtn.classList.remove('active')};
document.addEventListener('pointerdown',e=>{if(colorPanel.hidden||colorPanel.contains(e.target)||e.target.closest('#colorBtn'))return;colorPanel.hidden=true;colorBtn.classList.remove('active')});

const memoDialogEl=document.querySelector('#memoDialog'),memoInput=document.querySelector('#memo'),memoColor=document.querySelector('#memoColor');
document.querySelector('#memoBtn').onclick=()=>{memoInput.value='';memoDialogEl.showModal()};
memoDialogEl.addEventListener('close',()=>{const text=memoInput.value.trim();if(memoDialogEl.returnValue==='ok'&&text){const offset=(notes.length%5)*5;notes.push({text,color:memoColor.value,x:50+offset,y:50+offset});renderNotes();markUnsaved()}memoInput.value=''});
document.querySelector('#resetBtn').onclick=clearTable;

function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawCanvasBall(ctx,n,x,y,r){
  const kind=ballKind(n);
  if(kind==='ghost'){ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(x,y,r-1,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();return}
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();const base=ctx.createRadialGradient(x-r*.38,y-r*.42,r*.04,x,y,r*1.12);
  if(kind==='cue'){base.addColorStop(0,'#fff');base.addColorStop(.72,'#fffdf2');base.addColorStop(1,'#b9b28f')}
  else if(Number(kind)>8){base.addColorStop(0,'#fff');base.addColorStop(.72,'#fffdf4');base.addColorStop(1,'#aaa58e')}
  else{const color=colors[Number(kind)-1];base.addColorStop(0,'#fff');base.addColorStop(.13,color);base.addColorStop(.7,color);base.addColorStop(1,'#111')}
  ctx.fillStyle=base;ctx.fillRect(x-r,y-r,r*2,r*2);if(kind!=='cue'&&Number(kind)>8){ctx.fillStyle=colors[Number(kind)-1];ctx.fillRect(x-r,y-r*.48,r*2,r*.96)}
  const shade=ctx.createRadialGradient(x-r*.25,y-r*.35,0,x,y,r);shade.addColorStop(.45,'transparent');shade.addColorStop(1,'#0008');ctx.fillStyle=shade;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  ctx.strokeStyle='#ffffffbd';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r-.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-r*.32,y-r*.38,r*.2,r*.1,-.45,0,Math.PI*2);ctx.fill();
  if(kind!=='cue'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r*.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.font=`bold ${r*.72}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(kind,x,y+.3)}
}
function drawExportLine(ctx,l,clothX,clothY,clothW,clothH){
  const v=visibleEnds(l),x1=clothX+clothW*v.x1/100,y1=clothY+clothH*v.y1/100,x2=clothX+clothW*v.x2/100,y2=clothY+clothH*v.y2/100,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<3)return;
  const color=l.color||ballColor(l.startBall);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;ctx.setLineDash(l.type==='plain'?[]:[8,5]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
  if(l.type!=='plain'&&len>14){const a=Math.atan2(dy,dx);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-12*Math.cos(a-.48),y2-12*Math.sin(a-.48));ctx.lineTo(x2-12*Math.cos(a+.48),y2-12*Math.sin(a+.48));ctx.closePath();ctx.fill()}
}
function drawExportNotes(ctx,clothX,clothY,clothW,clothH){
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 15px system-ui';ctx.lineJoin='round';notes.forEach(note=>{
    const x=clothX+clothW*note.x/100,y=clothY+clothH*note.y/100,rows=note.text.split('\n');rows.forEach((row,i)=>{const ty=y+(i-(rows.length-1)/2)*20;ctx.strokeStyle='#07110d';ctx.lineWidth=5;ctx.strokeText(row,x,ty);ctx.fillStyle=note.color||'#ffe15b';ctx.fillText(row,x,ty)})
  });
}
function drawSidePockets(ctx,frameRect){
  ctx.fillStyle='#020202';
  for(const selector of ['.p3','.p4']){
    const el=tableFrame.querySelector(selector),r=el.getBoundingClientRect(),x=r.left-frameRect.left,y=r.top-frameRect.top,w=r.width,h=r.height,left=selector==='.p3';
    ctx.beginPath();
    if(left){ctx.moveTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x+h/2,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h/2);ctx.quadraticCurveTo(x,y,x+h/2,y)}
    else{ctx.moveTo(x,y);ctx.lineTo(x+w-h/2,y);ctx.quadraticCurveTo(x+w,y,x+w,y+h/2);ctx.quadraticCurveTo(x+w,y+h,x+w-h/2,y+h);ctx.lineTo(x,y+h)}
    ctx.closePath();ctx.fill();
  }
}
function drawWoodFrame(ctx,w,h){
  roundedRect(ctx,0,0,w,h,16);ctx.save();ctx.clip();
  for(let y=-2;y<h;y+=7){ctx.fillStyle='#934526';ctx.fillRect(0,y,w,2);ctx.fillStyle='#a9522e';ctx.fillRect(0,y+2,w,3);ctx.fillStyle='#7d351f';ctx.fillRect(0,y+5,w,2)}
  ctx.restore();
  ctx.save();roundedRect(ctx,1,1,w-2,h-2,15);ctx.strokeStyle='#6d2d1c';ctx.lineWidth=2;ctx.stroke();
  roundedRect(ctx,3.5,3.5,w-7,h-7,13);ctx.strokeStyle='#b9633c';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function downloadImage(){
  const frameRect=tableFrame.getBoundingClientRect(),clothRect=table.getBoundingClientRect(),scale=3,frameW=frameRect.width,frameH=frameRect.height,extra=86,width=frameW+extra,height=frameH;
  const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=Math.round(width*scale);c.height=Math.round(height*scale);ctx.scale(scale,scale);
  const cx=clothRect.left-frameRect.left,cy=clothRect.top-frameRect.top,cw=clothRect.width,ch=clothRect.height;
  drawWoodFrame(ctx,frameW,frameH);
  ctx.save();roundedRect(ctx,cx,cy,cw,ch,2);ctx.clip();const clothGrad=ctx.createLinearGradient(cx,0,cx+cw,0);clothGrad.addColorStop(0,'#08ae7d');clothGrad.addColorStop(1,'#08aa7a');ctx.fillStyle=clothGrad;ctx.fillRect(cx,cy,cw,ch);ctx.strokeStyle='rgba(255,255,255,.42)';ctx.lineWidth=.6;ctx.setLineDash([2,2]);
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(cx+cw*i/4,cy);ctx.lineTo(cx+cw*i/4,cy+ch);ctx.stroke()}for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(cx,cy+ch*i/8);ctx.lineTo(cx+cw,cy+ch*i/8);ctx.stroke()}ctx.setLineDash([]);lines.forEach(l=>drawExportLine(ctx,l,cx,cy,cw,ch));Object.entries(state).forEach(([n,p])=>drawCanvasBall(ctx,n,cx+cw*p.x/100,cy+ch*p.y/100,10));drawExportNotes(ctx,cx,cy,cw,ch);ctx.restore();
  ctx.fillStyle='#fff';for(let i=1;i<=3;i++)for(const y of [10,frameH-10]){ctx.beginPath();ctx.arc(52+(frameW-104)*(i-.5)/3,y,2,0,Math.PI*2);ctx.fill()}for(let i=1;i<=7;i++)for(const x of [10,frameW-10]){ctx.beginPath();ctx.arc(x,52+(frameH-104)*(i-.5)/7,2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#020202';ctx.strokeStyle='#49180f';ctx.lineWidth=2;for(const [x,y] of [[18,18],[frameW-18,18],[18,frameH-18],[frameW-18,frameH-18]]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);roundedRect(ctx,-10,-10,20,20,7);ctx.fill();ctx.stroke();ctx.restore()}drawSidePockets(ctx,frameRect);
  ctx.fillStyle='#151b20';ctx.fillRect(frameW,0,extra,frameH);ctx.fillStyle='#d5aa58';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('撞点',frameW+extra/2,24);
  const bx=frameW+extra/2,by=67,br=27;drawCanvasBall(ctx,'cue',bx,by,br);
  if(tip){ctx.beginPath();ctx.arc(bx-br+tip.x*br*2,by-br+tip.y*br*2,3.5,0,Math.PI*2);ctx.fillStyle='#e6382e';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke()}
  const a=document.createElement('a');a.download=(document.querySelector('#title').value||'ビリヤード配置')+'.png';a.href=c.toDataURL('image/png');a.click();
}
document.querySelector('#imageBtn').onclick=downloadImage;
function formatSavedTime(value){if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);return d.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
document.querySelector('#saveBtn').onclick=()=>{
  const saved=JSON.parse(localStorage.getItem('poolNotes')||'[]'),now=new Date().toISOString(),data={title:document.querySelector('#title').value||'名称なし',state:structuredClone(state),lines:structuredClone(lines),notes:structuredClone(notes),tip:tip?{...tip}:null,result:document.querySelector('input[name=result]:checked')?.value||'',updatedAt:now};let label='新規保存済み';
  const index=currentSaveId===null?-1:saved.findIndex(s=>String(s.id)===String(currentSaveId));
  if(index>=0){saved[index]={...saved[index],...data,createdAt:saved[index].createdAt||saved[index].date||now};label='上書き保存済み'}
  else{currentSaveId=Date.now();saved.unshift({id:currentSaveId,...data,createdAt:now,date:new Date().toLocaleDateString('ja-JP')})}
  localStorage.setItem('poolNotes',JSON.stringify(saved.slice(0,30)));document.querySelector('#saveState').textContent=label;const btn=document.querySelector('#saveBtn');btn.innerHTML=`<span>✓</span>${label}`;setTimeout(()=>btn.innerHTML='<span>✓</span>保存',1400);
};
document.querySelector('#savedBtn').onclick=()=>{
  const saved=JSON.parse(localStorage.getItem('poolNotes')||'[]'),list=document.querySelector('#savedList');list.innerHTML='';
  if(!saved.length)list.innerHTML='<p>保存した配置はまだありません。</p>';
  saved.forEach((s,i)=>{const card=document.createElement('div');card.className='saved-card';const input=document.createElement('input');input.className='saved-title-input';input.value=s.title||'名称なし';input.setAttribute('aria-label','保存タイトル');const meta=document.createElement('small'),created=s.createdAt||s.date,updated=s.updatedAt;meta.textContent=`新規保存：${formatSavedTime(created)||'日時不明'}${updated&&updated!==created?`\n上書き：${formatSavedTime(updated)}`:''}${s.result?`\n結果：${s.result}`:''}`;meta.style.whiteSpace='pre-line';const actions=document.createElement('div');actions.className='saved-actions';const rename=document.createElement('button');rename.textContent='タイトルを保存';rename.onclick=()=>{const items=JSON.parse(localStorage.getItem('poolNotes')||'[]'),target=items[i];if(!target)return;target.title=input.value.trim()||'名称なし';target.updatedAt=new Date().toISOString();localStorage.setItem('poolNotes',JSON.stringify(items));input.value=target.title;meta.textContent=`新規保存：${formatSavedTime(target.createdAt||target.date)||'日時不明'}\n上書き：${formatSavedTime(target.updatedAt)}${target.result?`\n結果：${target.result}`:''}`;if(String(currentSaveId)===String(target.id))document.querySelector('#title').value=target.title};const open=document.createElement('button');open.textContent='この配置を開く';open.onclick=()=>{const items=JSON.parse(localStorage.getItem('poolNotes')||'[]'),item=items[i];if(!item)return;state=structuredClone(item.state);lines=structuredClone(item.lines||[]);notes=structuredClone(item.notes||[]);if(!notes.length&&item.memo)notes=[{text:item.memo,color:'#ffe15b',x:50,y:50}];tip=item.tip?{...item.tip}:null;selectedLine=-1;currentSaveId=item.id;document.querySelector('#title').value=item.title;render();document.querySelector('#saveState').textContent='保存済み';savedDialog.close()};actions.append(rename,open);card.append(input,meta,actions);list.append(card)});savedDialog.showModal();
};
document.querySelector('#title').addEventListener('input',markUnsaved);
defaultState();
