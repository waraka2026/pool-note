const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 for(const mobile of [false,true]){
  const page=await browser.newPage({viewport:{width:mobile?390:1100,height:900},hasTouch:mobile,isMobile:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.POOL_URL||'http://127.0.0.1:8000');
  assert.equal(await page.locator('#ghostToggle').getAttribute('aria-pressed'),'false');
  await page.evaluate(()=>{state={'1':{x:50,y:50}};mode='line';render()});
  async function arrow(){const r=await page.locator('.cloth').boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.8,r.y+r.height*.3,{steps:5});await page.mouse.up()}
  await arrow();assert.equal(await page.locator('.linked-ghost').count(),0);
  await page.evaluate(()=>{lines=[];selectedLine=-1;ghostToggle.click();render()});
  await arrow();assert.equal(await page.locator('.linked-ghost').count(),1);
  for(const orientation of ['portrait','landscape']){
   const result=await page.evaluate(o=>{setOrientation(o);const l=lines[0],p=ghostPosition(l),r=table.getBoundingClientRect();return {distance:Math.hypot((p.x-l.x1)*r.width/100,(p.y-l.y1)*r.height/100),diameter:ballDiameter(),visual:layer.querySelector('.ball').getBoundingClientRect().width}},orientation);
   assert(Math.abs(result.distance-result.diameter)<.01);assert(Math.abs(result.visual-result.diameter)<.1);
  }
  await page.evaluate(()=>{lines[0].x2=20;renderLines()});assert.equal(await page.locator('.linked-ghost').count(),1);
  if(mobile){const b=await page.locator('.linked-ghost').boundingBox(),cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2,id:1}]});await page.waitForTimeout(700);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})}
  else await page.locator('.linked-ghost').dblclick();
  assert.equal(await page.locator('.linked-ghost').count(),0);assert.equal(await page.evaluate(()=>lines.length),1);
  await page.evaluate(()=>{lines=JSON.parse(JSON.stringify(lines));render()});assert.equal(await page.locator('.linked-ghost').count(),0);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS ghost',mobile?'touch':'mouse');
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
