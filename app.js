const colors=['#f3d400','#1767c8','#e6382e','#6b3ba9','#ef7d15','#248046','#7b201d','#111','#f0d63b','#1767c8','#e6382e','#6b3ba9','#ef7d15','#248046','#7b201d'];
const table=document.querySelector('.cloth');
const tableFrame=document.querySelector('.table');
const layer=document.querySelector('#ballsLayer');
const svg=document.querySelector('#lines');
const cueDiagram=document.querySelector('#cueDiagram');
const tipMark=document.querySelector('#tipMark');

let mode='move',draggingBall=null,draggingLine=null,lineStart=null,lineDraft=null,lines=[],state={},selectedLine=-1,tip=null;
let ballPress=null,ballMoved=false,lastBallTap=null;
const defs=`<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="white"/></marker></defs>`;

function markUnsaved(){document.querySelector('#saveState').textContent='未保存'}
function defaultState(){state={1:{x:40,y:35},9:{x:62,y:20}};lines=[];tip=null;selectedLine=-1;render();markUnsaved()}
function clearTable(){state={};lines=[];tip=null;selectedLine=-1;render();markUnsaved()}
function ballEl(n,x,y,mini=false){
  const el=document.createElement('div'),striped=n!=='cue'&&Number(n)>8;
  el.className=`ball ${mini?'mini':''} ${n==='cue'?'cue':''} ${striped?'striped':''}`;
  if(n!=='cue')el.style.setProperty('--ball',colors[Number(n)-1]);
  el.dataset.n=n;el.style.left=x+'%';el.style.top=y+'%';el.innerHTML=n==='cue'?'':`<span>${n}</span>`;return el;
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
  ['cue',1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].filter(n=>!state[n]).forEach(n=>{const ball=ballEl(n,0,0,true);ball.onclick=()=>{state[n]=freeSpot();render();markUnsaved()};tray.append(ball)});
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
  const v=visibleEnds(l),len=lineLengthPx(l),isArrow=l.type!=='plain',marker=isArrow&&len>14?' marker-end="url(#arrow)"':'',selected=!draft&&selectedLine===i?' selected-line':'';
  const visual=len>3?`<line class="${isArrow?'shot-line':'plain-line'}${selected}${draft?' draft-line':''}" x1="${v.x1}%" y1="${v.y1}%" x2="${v.x2}%" y2="${v.y2}%"${marker}/>`:'';
  const hit=draft||len<=3?'':`<line data-i="${i}" class="line-hit" x1="${v.x1}%" y1="${v.y1}%" x2="${v.x2}%" y2="${v.y2}%"/>`;return `<g>${visual}${hit}</g>`;
}
function renderLines(){let html=defs+lines.map((l,i)=>lineMarkup(l,i)).join('');if(lineDraft)html+=lineMarkup(lineDraft,-1,true);svg.innerHTML=html}
function renderTip(){if(tip){tipMark.hidden=false;tipMark.style.left=(tip.x*100)+'%';tipMark.style.top=(tip.y*100)+'%'}else{tipMark.hidden=true}}
function render(){renderBalls();renderLines();renderTray();renderTip()}
function removeBall(n){delete state[n];lines=lines.filter(l=>String(l.startBall)!==String(n)&&String(l.endBall)!==String(n));selectedLine=-1;render();markUnsaved()}
function removeLine(i){if(i<0||i>=lines.length)return;lines.splice(i,1);selectedLine=-1;renderLines();markUnsaved()}

table.addEventListener('pointerdown',e=>{
  const ball=e.target.closest('.ball');
  if(mode==='move'&&ball){selectedLine=-1;draggingBall=ball.dataset.n;ballPress={x:e.clientX,y:e.clientY};ballMoved=false;table.setPointerCapture(e.pointerId);renderLines();return}
  if(mode==='erase'&&ball){removeBall(ball.dataset.n);return}
  if(mode==='line'||mode==='plain'){
    const p=point(e),startBall=nearestBall(p,42),a=startBall?state[startBall]:p;lineStart={...p,ball:startBall};
    lineDraft={x1:a.x,y1:a.y,x2:p.x,y2:p.y,type:mode==='plain'?'plain':'arrow',startBall:startBall||null,endBall:null};table.setPointerCapture(e.pointerId);renderLines();return;
  }
  if(mode==='move'){selectedLine=-1;renderLines()}
});
table.addEventListener('pointermove',e=>{
  if(draggingBall){if(ballPress&&Math.hypot(e.clientX-ballPress.x,e.clientY-ballPress.y)>5)ballMoved=true;state[draggingBall]=point(e);syncBallLines(draggingBall);updateBallPositions();renderLines();return}
  if(lineStart){const p=point(e),endBall=nearestBall(p,42,lineStart.ball),b=endBall?state[endBall]:p;lineDraft.x2=b.x;lineDraft.y2=b.y;lineDraft.endBall=endBall||null;renderLines();return}
  if(!draggingLine)return;e.preventDefault();const p=point(e),l=lines[draggingLine.i],o=draggingLine.original;
  if(draggingLine.kind==='start'){
    if(o.startBall&&state[o.startBall]){state[o.startBall]=p;syncBallLines(o.startBall);updateBallPositions()}
    else{l.startBall=null;l.x1=p.x;l.y1=p.y}
  }
  else if(draggingLine.kind==='end'){
    if(o.endBall&&state[o.endBall]){state[o.endBall]=p;syncBallLines(o.endBall);updateBallPositions()}
    else{l.endBall=null;l.x2=p.x;l.y2=p.y}
  }
  else{
    const ballIds=draggingLine.ballIds,free=[];if(!o.startBall)free.push({x:o.x1,y:o.y1});if(!o.endBall)free.push({x:o.x2,y:o.y2});const moving=free.concat(ballIds.map(n=>draggingLine.originalBalls[n]));
    let dx=p.x-draggingLine.start.x,dy=p.y-draggingLine.start.y;dx=Math.max(-Math.min(...moving.map(q=>q.x)),Math.min(100-Math.max(...moving.map(q=>q.x)),dx));dy=Math.max(-Math.min(...moving.map(q=>q.y)),Math.min(100-Math.max(...moving.map(q=>q.y)),dy));
    ballIds.forEach(n=>{state[n]={x:draggingLine.originalBalls[n].x+dx,y:draggingLine.originalBalls[n].y+dy};syncBallLines(n)});if(!o.startBall){l.x1=o.x1+dx;l.y1=o.y1+dy}if(!o.endBall){l.x2=o.x2+dx;l.y2=o.y2+dy}updateBallPositions();
  }renderLines();
});
table.addEventListener('pointerup',()=>{
  if(draggingBall){const n=draggingBall,now=Date.now();draggingBall=null;ballPress=null;if(!ballMoved){if(lastBallTap&&lastBallTap.n===n&&now-lastBallTap.time<420){lastBallTap=null;removeBall(n);return}lastBallTap={n,time:now}}else lastBallTap=null;markUnsaved();return}
  if(lineStart){if(lineDraft&&lineLengthPx(lineDraft)>8){lines.push({...lineDraft});selectedLine=lines.length-1;markUnsaved()}lineStart=null;lineDraft=null;setMode('move',false);renderLines();return}
  if(draggingLine){
    const l=lines[draggingLine.i];
    if(draggingLine.kind==='start'){const n=nearestBall({x:l.x1,y:l.y1},42,l.endBall);if(n){l.startBall=n;l.x1=state[n].x;l.y1=state[n].y}}
    else if(draggingLine.kind==='end'){const n=nearestBall({x:l.x2,y:l.y2},42,l.startBall);if(n){l.endBall=n;l.x2=state[n].x;l.y2=state[n].y}}
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

cueDiagram.addEventListener('pointerdown',e=>{
  const r=cueDiagram.getBoundingClientRect();let x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
  const dx=x-.5,dy=y-.5,d=Math.hypot(dx,dy);if(d>.46){const k=.46/d;x=.5+dx*k;y=.5+dy*k}
  tip={x,y};renderTip();markUnsaved();
});
document.querySelector('#tipClearBtn').onclick=()=>{tip=null;renderTip();markUnsaved()};

function setMode(next,showHint=true){
  mode=next;selectedLine=-1;renderLines();document.querySelectorAll('.tools [data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===next));
  const hint=document.querySelector('#hint');hint.textContent=mode==='line'?'球から球へなぞると自動接続':mode==='plain'?'球から球へなぞると自動接続':mode==='erase'?'球または線をタップして消去':'球をドラッグ。線の端をつかむと伸縮';hint.style.opacity=1;setTimeout(()=>hint.style.opacity=0,1800);
  if(!showHint)hint.style.opacity=0;
}
document.querySelectorAll('.tools [data-mode]').forEach(btn=>btn.onclick=()=>setMode(btn.dataset.mode));
document.querySelector('#memoBtn').onclick=()=>memoDialog.showModal();
document.querySelector('#resetBtn').onclick=clearTable;

function roundedRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r)}
function drawCanvasBall(ctx,n,x,y,r){
  ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.clip();const base=ctx.createRadialGradient(x-r*.38,y-r*.42,r*.04,x,y,r*1.12);
  if(n==='cue'){base.addColorStop(0,'#fff');base.addColorStop(.72,'#fffdf2');base.addColorStop(1,'#b9b28f')}
  else if(Number(n)>8){base.addColorStop(0,'#fff');base.addColorStop(.72,'#fffdf4');base.addColorStop(1,'#aaa58e')}
  else{const color=colors[Number(n)-1];base.addColorStop(0,'#fff');base.addColorStop(.13,color);base.addColorStop(.7,color);base.addColorStop(1,'#111')}
  ctx.fillStyle=base;ctx.fillRect(x-r,y-r,r*2,r*2);if(n!=='cue'&&Number(n)>8){ctx.fillStyle=colors[Number(n)-1];ctx.fillRect(x-r,y-r*.48,r*2,r*.96)}
  const shade=ctx.createRadialGradient(x-r*.25,y-r*.35,0,x,y,r);shade.addColorStop(.45,'transparent');shade.addColorStop(1,'#0008');ctx.fillStyle=shade;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
  ctx.strokeStyle='#ffffffbd';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,r-.5,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(x-r*.32,y-r*.38,r*.2,r*.1,-.45,0,Math.PI*2);ctx.fill();
  if(n!=='cue'){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,r*.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#111';ctx.font=`bold ${r*.72}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,x,y+.3)}
}
function drawExportLine(ctx,l,clothX,clothY,clothW,clothH){
  const v=visibleEnds(l),x1=clothX+clothW*v.x1/100,y1=clothY+clothH*v.y1/100,x2=clothX+clothW*v.x2/100,y2=clothY+clothH*v.y2/100,dx=x2-x1,dy=y2-y1,len=Math.hypot(dx,dy);if(len<3)return;
  ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=2;ctx.setLineDash(l.type==='plain'?[]:[8,5]);ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.setLineDash([]);
  if(l.type!=='plain'&&len>14){const a=Math.atan2(dy,dx);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-12*Math.cos(a-.48),y2-12*Math.sin(a-.48));ctx.lineTo(x2-12*Math.cos(a+.48),y2-12*Math.sin(a+.48));ctx.closePath();ctx.fill()}
}
function drawWoodFrame(ctx,w,h){
  roundedRect(ctx,0,0,w,h,16);ctx.save();ctx.clip();
  for(let y=-2;y<h;y+=7){ctx.fillStyle='#934526';ctx.fillRect(0,y,w,2);ctx.fillStyle='#a9522e';ctx.fillRect(0,y+2,w,3);ctx.fillStyle='#7d351f';ctx.fillRect(0,y+5,w,2)}
  ctx.restore();
  ctx.save();roundedRect(ctx,1,1,w-2,h-2,15);ctx.strokeStyle='#6d2d1c';ctx.lineWidth=2;ctx.stroke();
  roundedRect(ctx,3.5,3.5,w-7,h-7,13);ctx.strokeStyle='#b9633c';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}
function downloadImage(){
  const frameRect=tableFrame.getBoundingClientRect(),clothRect=table.getBoundingClientRect(),scale=3,width=frameRect.width,frameH=frameRect.height,extra=tip?76:0,height=frameH+extra;
  const c=document.createElement('canvas'),ctx=c.getContext('2d');c.width=Math.round(width*scale);c.height=Math.round(height*scale);ctx.scale(scale,scale);
  const cx=clothRect.left-frameRect.left,cy=clothRect.top-frameRect.top,cw=clothRect.width,ch=clothRect.height;
  drawWoodFrame(ctx,width,frameH);
  ctx.save();roundedRect(ctx,cx,cy,cw,ch,2);ctx.clip();const clothGrad=ctx.createLinearGradient(cx,0,cx+cw,0);clothGrad.addColorStop(0,'#08ae7d');clothGrad.addColorStop(1,'#08aa7a');ctx.fillStyle=clothGrad;ctx.fillRect(cx,cy,cw,ch);ctx.strokeStyle='#ffffff52';ctx.lineWidth=.45;ctx.setLineDash([1.5,1.5]);
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(cx+cw*i/4,cy);ctx.lineTo(cx+cw*i/4,cy+ch);ctx.stroke()}for(let i=1;i<8;i++){ctx.beginPath();ctx.moveTo(cx,cy+ch*i/8);ctx.lineTo(cx+cw,cy+ch*i/8);ctx.stroke()}ctx.setLineDash([]);lines.forEach(l=>drawExportLine(ctx,l,cx,cy,cw,ch));Object.entries(state).forEach(([n,p])=>drawCanvasBall(ctx,n,cx+cw*p.x/100,cy+ch*p.y/100,10));ctx.restore();
  ctx.fillStyle='#fff';for(let i=1;i<=3;i++)for(const y of [10,frameH-10]){ctx.beginPath();ctx.arc(52+(width-104)*(i-.5)/3,y,2,0,Math.PI*2);ctx.fill()}for(let i=1;i<=7;i++)for(const x of [10,width-10]){ctx.beginPath();ctx.arc(x,52+(frameH-104)*(i-.5)/7,2,0,Math.PI*2);ctx.fill()}
  ctx.fillStyle='#020202';ctx.strokeStyle='#49180f';ctx.lineWidth=2;for(const [x,y] of [[18,18],[width-18,18],[18,frameH-18],[width-18,frameH-18]]){ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI/4);roundedRect(ctx,-10,-10,20,20,7);ctx.fill();ctx.stroke();ctx.restore()}ctx.beginPath();ctx.ellipse(7.5,frameH/2,7.5,14,0,Math.PI/2,Math.PI*1.5);ctx.fill();ctx.beginPath();ctx.ellipse(width-7.5,frameH/2,7.5,14,0,-Math.PI/2,Math.PI/2);ctx.fill();
  if(tip){
    const fy=frameH;ctx.fillStyle='#151b20';roundedRect(ctx,0,fy,width,extra,0);ctx.save();ctx.beginPath();ctx.moveTo(0,fy);ctx.lineTo(width,fy);ctx.lineTo(width,fy+extra-16);ctx.quadraticCurveTo(width,fy+extra,width-16,fy+extra);ctx.lineTo(16,fy+extra);ctx.quadraticCurveTo(0,fy+extra,0,fy+extra-16);ctx.closePath();ctx.fill();ctx.restore();
    ctx.fillStyle='#d5aa58';ctx.font='bold 13px system-ui';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText('撞点',14,fy+extra/2);
    const bx=width-40,by=fy+extra/2,br=19;drawCanvasBall(ctx,'cue',bx,by,br);
    ctx.beginPath();ctx.arc(bx-br+tip.x*br*2,by-br+tip.y*br*2,2.8,0,Math.PI*2);ctx.fillStyle='#e6382e';ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.stroke();
  }
  const a=document.createElement('a');a.download=(document.querySelector('#title').value||'ビリヤード配置')+'.png';a.href=c.toDataURL('image/png');a.click();
}
document.querySelector('#imageBtn').onclick=downloadImage;
document.querySelector('#saveBtn').onclick=()=>{
  const saved=JSON.parse(localStorage.getItem('poolNotes')||'[]');saved.unshift({id:Date.now(),title:document.querySelector('#title').value||'名称なし',date:new Date().toLocaleDateString('ja-JP'),state:structuredClone(state),lines:structuredClone(lines),tip:tip?{...tip}:null,memo:document.querySelector('#memo').value,result:document.querySelector('input[name=result]:checked')?.value||''});localStorage.setItem('poolNotes',JSON.stringify(saved.slice(0,30)));document.querySelector('#saveState').textContent='保存済み';const btn=document.querySelector('#saveBtn');btn.innerHTML='<span>✓</span>保存済';setTimeout(()=>btn.innerHTML='<span>✓</span>保存',1200);
};
document.querySelector('#savedBtn').onclick=()=>{
  const saved=JSON.parse(localStorage.getItem('poolNotes')||'[]');savedList.innerHTML=saved.length?saved.map((s,i)=>`<div class="saved-card"><b>${s.title}</b><small>${s.date} ${s.result?`・${s.result}`:''}</small><button data-load="${i}">この配置を開く</button></div>`).join(''):'<p>保存した配置はまだありません。</p>';
  savedList.querySelectorAll('button').forEach(b=>b.onclick=()=>{const s=saved[Number(b.dataset.load)];state=structuredClone(s.state);lines=structuredClone(s.lines||[]);tip=s.tip?{...s.tip}:null;selectedLine=-1;title.value=s.title;memo.value=s.memo||'';render();savedDialog.close()});savedDialog.showModal();
};
defaultState();
