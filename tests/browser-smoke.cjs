const {chromium}=require("playwright");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const BASE="http://127.0.0.1:8765/";
const errs=[];
const failures=[];
async function check(label,fn){try{await fn();console.log("PASS",label);}catch(e){failures.push(label+": "+e.message);console.log("FAIL",label,e.message.slice(0,180));}}
(async()=>{
 const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
 try {
  for(const width of [390,768,1440]){
   const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
   page.on("pageerror",e=>errs.push(width+": "+e.message));
   await page.goto(BASE+"index.html",{waitUntil:"domcontentloaded"});
   await check(width+" initial home",async()=>assert.equal(await page.locator("#accueil").evaluate(el=>el.classList.contains("vue-active")),true));
   await check(width+" home overflow",async()=>{
    const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
    assert.ok(dims.scroll<=dims.client+3,JSON.stringify(dims));
   });
   await check(width+" portrait / CCNA alignment",async()=>{
    const dims=await page.evaluate(()=>{
     const photo=document.querySelector("#accueil .cadre-portrait").getBoundingClientRect();
     const badge=document.querySelector("#accueil .hero-photo .carte-flottante").getBoundingClientRect();
     return {photo:{x:photo.x,width:photo.width},badge:{x:badge.x,width:badge.width}};
    });
    assert.ok(Math.abs(dims.photo.x-dims.badge.x)<2,JSON.stringify(dims));
    assert.ok(Math.abs(dims.photo.width-dims.badge.width)<2,JSON.stringify(dims));
   });
   if(width===390){
    await check("mobile menu",async()=>{
     const menu=page.locator(".bouton-menu-mobile");
     await menu.click();
     assert.equal(await menu.getAttribute("aria-expanded"),"true");
     await menu.click();
     assert.equal(await menu.getAttribute("aria-expanded"),"false");
    });
   }
   await check(width+" each route",async()=>{
    for(const target of ["competences","stage","projets","veille","procedures","synthese","parcours","referentiel","cv","contact","accueil"]){
      await page.evaluate(id=>{location.hash="#"+id;},target);
      await page.waitForTimeout(70);
      assert.equal(await page.locator("#"+target).evaluate(e=>e.classList.contains("vue-active")),true,target);
    }
   });
   await check(width+" invalid hash does not crash",async()=>{
    await page.goto(BASE+"index.html#%5B",{waitUntil:"domcontentloaded"});
    assert.equal(await page.locator("#accueil").evaluate(e=>e.classList.contains("vue-active")),true);
   });
   await check(width+" procedure filters",async()=>{
    await page.goto(BASE+"index.html#procedures",{waitUntil:"domcontentloaded"});
    const buttons=page.locator(".btn-filtre");
    await buttons.filter({hasText:"Réseau"}).first().click();
    assert.ok(await page.locator(".carte-procedure:visible").count()>0);
    await buttons.filter({hasText:"Tout"}).first().click();
    assert.ok(await page.locator(".carte-procedure:visible").count()>0);
   });
   await check(width+" stage dialog",async()=>{
    await page.goto(BASE+"index.html#stage",{waitUntil:"domcontentloaded"});
    const trigger=page.locator("#stage [data-mission]").first();
    await trigger.click();
    assert.ok(await page.locator("dialog[open]").count()>0);
    await page.locator("dialog[open] .fermer-fenetre").first().click();
    assert.equal(await page.locator("dialog[open]").count(),0);
   });
   await check(width+" contact required fields",async()=>{
    await page.goto(BASE+"index.html#contact",{waitUntil:"domcontentloaded"});
    assert.equal(await page.locator("#form-contact").evaluate(f=>f.checkValidity()),false);
    await page.locator("#nom").fill("Test");
    await page.locator("#email").fill("invalid");
    await page.locator("#message").fill("Hello");
    assert.equal(await page.locator("#form-contact").evaluate(f=>f.checkValidity()),false);
    await page.locator("#email").fill("test@example.com");
    assert.equal(await page.locator("#form-contact").evaluate(f=>f.checkValidity()),true);
   });
   if(width===390||width===1440){
    await page.goto(BASE+"index.html#accueil",{waitUntil:"domcontentloaded"});
    await page.screenshot({path:"screenshot-"+width+".png",fullPage:true});
   }
   await page.close();
  }
  await check("no uncaught browser JS errors",async()=>assert.deepEqual(errs,[]));
 }finally{await browser.close()}
 fs.writeFileSync("browser-results.json",JSON.stringify({passed:failures.length===0,failures,errors:errs},null,2));
 console.log("Result:",failures.length===0?"PASS":"FAIL","Failures",failures.length);
 process.exitCode=failures.length?1:0;
})().catch(e=>{console.error(e);process.exitCode=1;});
