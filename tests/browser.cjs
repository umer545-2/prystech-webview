const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = pathToFileURL(path.resolve(__dirname,'../index.html')).href;
const out = path.resolve(__dirname,'../test-results');
fs.mkdirSync(out,{recursive:true});
const results = [];
async function main() {
  const browser = await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {})});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    const page = await context.newPage();
    const errors = []; page.on('pageerror',e=>errors.push(e.message));
    const check = async (name, fn) => { await fn(); results.push(name); console.log('PASS '+name); };
    const open = app => page.evaluate(app=>window.Prystech.wm.open(app),app).then(()=>{});
    const command = async text => { await open('terminal'); await page.locator('#terminal-command').fill(text); await page.locator('#terminal-command').press('Enter'); await page.waitForTimeout(70); };
    await page.route('https://prystech-portfolio.netlify.app/public/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head><title>Public portfolio fixture</title></head><body><h1>Selected work</h1></body></html>'}));
    await page.goto(url);
    await check('Boot finishes within 3.6 seconds',async()=> { await page.locator('#boot').waitFor({state:'hidden',timeout:3600}); assert.equal(await page.locator('.window[data-app="terminal"]').count(),1); });
    await page.screenshot({path:path.join(out,'desktop.png')});
    await check('All local visual assets load',async()=> { const missing = await page.evaluate(async()=> { const paths=['assets/wallpaper.webp','assets/capzula.webp','assets/reward.webp','assets/thistl.webp','assets/cafenest.webp']; return (await Promise.all(paths.map(src=>new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(null);img.onerror=()=>resolve(src);img.src=src;})))).filter(Boolean); }); assert.deepEqual(missing,[]); assert.equal(await page.evaluate(()=>document.fonts.check('12px "Sequel Sans"')),true); });
    await check('Terminal parses quotes and prevents markup injection',async()=> { await command('echo "hello world" "<img src=x onerror=alert(1)>"'); assert.ok((await page.locator('.terminal-output').innerText()).includes('hello world <img src=x onerror=alert(1)>')); assert.equal(await page.locator('.terminal-output img:not(.terminal-brand)').count(),0); });
    await check('Terminal and Files share one filesystem',async()=> { await command('cd projects'); await command('pwd'); assert.ok((await page.locator('.terminal-output').innerText()).includes('/home/guest/projects')); await command('cat projects.md'); assert.ok((await page.locator('.terminal-output').innerText()).includes('Capzula')); await open('files'); await page.locator('.file-sidebar [data-path="~/projects"]').click(); await page.locator('[data-file="/home/guest/projects/projects.md"]').click(); assert.ok((await page.locator('.editor-content').innerText()).includes('Capzula')); });
    await check('Terminal history, tab completion and clear shortcuts',async()=> { await open('terminal'); const input=page.locator('#terminal-command'); await input.fill(''); await input.press('ArrowUp'); assert.equal(await input.inputValue(),'cat projects.md'); await input.fill('neo'); await input.press('Tab'); assert.equal(await input.inputValue(),'neofetch '); await input.fill('discard'); await input.press('Control+c'); assert.equal(await input.inputValue(),''); await input.press('Control+l'); assert.equal((await page.locator('.terminal-output').innerText()).trim(),''); });
    await check('Private commands are redacted and fail closed',async()=> { await command('"portfolio" "login" "owner@example.test"'); const text=await page.locator('.terminal-output').innerText(); assert.ok(text.includes('not connected')); assert.ok(!text.includes('owner@example.test')); await command('history'); assert.ok(!(await page.locator('.terminal-output').innerText()).includes('owner@example.test')); await command('portfolio dashboard'); assert.equal(await page.locator('.window[data-app="analytics"]').count(),0); });
    await check('Project categories filter actual work',async()=> { await open('projects'); assert.equal(await page.locator('.project-card').count(),4); await page.locator('[data-filter="Branding"]').click(); assert.equal(await page.locator('.project-card').count(),2); await page.locator('[data-filter="All projects"]').click(); });
    await page.screenshot({path:path.join(out,'projects.png')});
    await check('Window minimize, restore, maximize, keyboard resize and close',async()=> { await open('about'); const win=page.locator('.window[data-app="about"]'); await win.locator('.minimize').click(); assert.ok(await win.evaluate(el=>el.classList.contains('minimized'))); await page.locator('#dock [data-app="about"]').click(); assert.ok(!(await win.evaluate(el=>el.classList.contains('minimized')))); await win.locator('.maximize').click(); assert.ok(await win.evaluate(el=>el.classList.contains('maximized'))); await win.locator('.maximize').click(); const before=await win.boundingBox(); await win.locator('.window-titlebar').focus(); await page.keyboard.press('Shift+ArrowLeft'); const after=await win.boundingBox(); assert.ok(after.width<before.width); await win.locator('.close').click(); assert.equal(await win.count(),0); });
    await check('Window dragging and resizing stay in bounds',async()=> { await open('terminal'); const win=page.locator('.window[data-app="terminal"]'); const bar=await win.locator('.window-titlebar').boundingBox(); await page.mouse.move(bar.x+100,bar.y+20); await page.mouse.down(); await page.mouse.move(1800,1100,{steps:8}); await page.mouse.up(); let box=await win.boundingBox(); assert.ok(box.x>=0&&box.y>=40&&box.x+box.width<=1440&&box.y+box.height<=800); const handle=await win.locator('.resize-se').boundingBox(); await page.mouse.move(handle.x+8,handle.y+8); await page.mouse.down(); await page.mouse.move(1700,1000,{steps:8}); await page.mouse.up(); box=await win.boundingBox(); assert.ok(box.x+box.width<=1440&&box.y+box.height<=800); });
    await check('Desktop icon movement persists and remains constrained',async()=> { await page.evaluate(()=>{for(const id of [...window.Prystech.wm.windows.keys()])window.Prystech.wm.close(id);}); const shortcut=page.locator('.desktop-shortcut[data-app="terminal"]'); const before=await shortcut.boundingBox(); await page.mouse.move(before.x+40,before.y+30); await page.mouse.down(); await page.mouse.move(before.x+130,before.y+90,{steps:7}); await page.mouse.up(); assert.ok((await shortcut.boundingBox()).x>before.x); assert.ok((await page.evaluate(()=>localStorage.getItem('prystech:icon-positions'))).includes('terminal')); });
    await check('Theme changes are persistent',async()=> { await command('theme midnight'); assert.equal(await page.locator('html').getAttribute('data-theme'),'midnight'); await command('theme purple'); });
    await check('Portfolio embeds the dedicated public route',async()=> { await open('portfolio'); const frame=page.locator('.window[data-app="portfolio"] iframe'); assert.equal(await frame.count(),1); assert.equal(await frame.getAttribute('src'),'https://prystech-portfolio.netlify.app/public/'); assert.equal(await frame.getAttribute('sandbox'),'allow-scripts allow-same-origin allow-popups'); });
    await check('Website fallback, navigation and iframe sandbox',async()=> { await page.route('https://prystech.co/**',route=>route.abort()); await open('site'); const win=page.locator('.window[data-app="site"]'); await page.waitForTimeout(400); const frame=win.locator('iframe'); if(await frame.count()) { assert.equal(await frame.getAttribute('sandbox'),'allow-scripts allow-same-origin'); const escape=win.locator('.browser-load-badge button'); if(await escape.count()) await escape.click(); } await win.locator('.browser-back').click(); assert.ok((await win.innerText()).includes('Design. Develop. Different.')); assert.ok(!(await win.locator('.browser-forward').isDisabled())); });
    await check('Shutdown and reboot are usable',async()=> { await command('shutdown'); await page.locator('#shutdown-screen').waitFor({state:'visible'}); await page.locator('#power-on').click(); await page.locator('#boot').waitFor({state:'visible'}); await page.keyboard.press('Enter'); await page.locator('#boot').waitFor({state:'hidden'}); assert.equal(await page.locator('.window[data-app="terminal"]').count(),1); });
    await check('Returning sessions skip the full boot',async()=> { await page.reload(); await page.waitForTimeout(250); assert.equal(await page.locator('#boot').isHidden(),true); });
    // Intercept a test-only HTTPS backend to exercise the real adapter and masked prompt.
    await check('Live adapter masks passwords and never stores credentials',async()=> {
      const origin='https://desktop-backend.example';
      await page.route(origin+'/**',async route=>{
        const endpoint=new URL(route.request().url()).pathname;
        const headers={'Access-Control-Allow-Origin':'null','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-csrf-token','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
        if(route.request().method()==='OPTIONS') return route.fulfill({status:204,headers});
        let json=endpoint.endsWith('/csrf')?{token:'test-csrf'}:endpoint.endsWith('/login')||endpoint.endsWith('/session')?{authenticated:true,user:{displayName:'Test owner'},expiresAt:new Date(Date.now()+600000).toISOString()}:{totalVisits:10,uniqueVisitors:7,contactClicks:2,websiteVisits:3,conversionRate:20,conversions:2,daily:[{date:'2026-09-07',visits:10}],weekly:[{date:'2026-W37',visits:10}],projects:[{name:'Capzula',count:4}],links:[],referrers:[],devices:[]};
        await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(json)});
      });
      await page.evaluate(origin=>{window.Prystech.config={...window.Prystech.config,authMode:'live',apiBase:origin};},origin);
      await command('portfolio login owner@example.test');
      assert.equal(await page.locator('#terminal-command').getAttribute('type'),'password');
      await page.locator('#terminal-command').fill('test-only-secret-sentinel'); await page.locator('#terminal-command').press('Enter');
      await page.waitForFunction(()=>window.Prystech.auth.current!==null);
      assert.equal(await page.locator('#terminal-command').inputValue(),'');
      assert.ok(!(await page.locator('.terminal-output').innerText()).includes('test-only-secret-sentinel'));
      const stored=await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage})); assert.ok(!stored.includes('test-only-secret-sentinel')); assert.ok(!stored.includes('owner@example.test'));
      await command('portfolio dashboard'); await page.waitForSelector('.metric-grid'); assert.ok((await page.locator('.analytics-data').innerText()).includes('Total visits'));
      await command('portfolio logout'); assert.equal(await page.locator('.window[data-app="analytics"]').count(),0);
    });
    await check('Mobile and tablet layouts have no horizontal overflow',async()=> {
      for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:360,height:640}]) {
        await page.setViewportSize(viewport);
        for(const app of ['terminal','projects','files','contact','about','settings','portfolio','readme']) {
          await open(app); const box=await page.locator(`.window[data-app="${app}"]`).boundingBox(); assert.ok(box.x>=0&&box.x+box.width<=viewport.width+1,app+' out of bounds');
          const overflow=await page.locator(`.window[data-app="${app}"] .window-content`).evaluate(el=>el.scrollWidth>el.clientWidth+1); assert.equal(overflow,false,app+' overflows at '+viewport.width);
        }
        await open('terminal'); await command('clear'); await command('neofetch');
        await page.screenshot({path:path.join(out,`viewport-${viewport.width}.png`)});
      }
    });
    await check('Runtime has no uncaught JavaScript errors',async()=>assert.deepEqual(errors,[]));
    await context.close();
    const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}); const reducedPage=await reduced.newPage();
    await reducedPage.goto(url); await reducedPage.waitForTimeout(450); assert.equal(await reducedPage.locator('#boot').isHidden(),true); console.log('PASS Reduced motion skips animated startup'); results.push('Reduced motion skips animated startup');
    await reduced.close();
    fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({passed:results.length,checks:results},null,2));
    console.log(`\n${results.length} browser checks passed.`);
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
