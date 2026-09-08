// Requires Playwright. Serve the repository on port 8000, or set POOL_URL.
// Run: node tests/menu-interactions.cjs (BROWSER_CHANNEL=msedge is optional).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 for(const mobile of [false,true])for(const landscape of [false,true]){
 const width=landscape?844:390,height=landscape?390:844;
 const page=await browser.newPage({viewport:mobile?{width,height}:{width:1100,height:900},screen:mobile?{width,height}:{width:1100,height:900},isMobile:mobile,hasTouch:mobile});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.POOL_URL||'http://127.0.0.1:8000');if(!mobile&&landscape)await page.evaluate(()=>setOrientation('landscape'));
 const menu=page.locator('.editor-sidebar'),toggle=page.locator('#menuToggleBtn');const cdp=await page.context().newCDPSession(page);
 const tap=async()=>{if(mobile)await toggle.tap();else await toggle.click();await page.waitForTimeout(400)};
 async function drag(target,dx,dy){const r=await target.boundingBox(),x=r.x+r.width/2,y=r.y+r.height/2;
 if(mobile){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/5,y:y+dy*i/5,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:5});await page.mouse.up()}
 await page.waitForTimeout(80)}
 await tap();assert.equal(await toggle.getAttribute('aria-expanded'),'false');const before=await toggle.boundingBox();
 await drag(toggle,85,-25);assert.equal(await toggle.getAttribute('aria-expanded'),'false');const after=await toggle.boundingBox();assert(Math.hypot(after.x-before.x,after.y-before.y)>30,'collapsed menu must move');
 await drag(toggle,20,20);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 await tap();assert.equal(await toggle.getAttribute('aria-expanded'),'true','tap after drag must open');
 await tap();assert.equal(await toggle.getAttribute('aria-expanded'),'false','tap must close');
 await tap();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await drag(page.locator('.menu-drag-handle'),50,0);assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 // A touch drag can finish without a click event: the next close tap must work.
 await tap();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 await drag(toggle,40,10);assert.equal(await toggle.getAttribute('aria-expanded'),'false');
 await page.evaluate(()=>{state={'1':{x:50,y:50}};render()});let b=await page.locator('#ballsLayer .ball').boundingBox();await drag(page.locator('#ballsLayer .ball'),20,15);assert.notEqual(await page.evaluate(()=>state['1'].x),50);
 assert.deepEqual(errors,[]);await page.close();console.log('PASS',mobile?'touch':'mouse',landscape?'landscape':'portrait','collapsed drag, repeated drag, tap-open/close, expanded grip, ball move');
 }await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
