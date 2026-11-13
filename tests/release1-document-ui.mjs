import {chromium} from '../.agent-cache/qa/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
 const page=await browser.newPage();
 await page.setContent('<div id="docsContent"></div><span id="attachedCount"></span><div id="admToastContainer"></div>');
 await page.addInitScript(()=>{});
 await page.evaluate(()=>{
   window.SwanAuth={authorizedFetch:async(url)=>{
     if(url.endsWith('/documents'))return new Response(JSON.stringify([{id:'doc-1',original_filename:'my-original.pdf',mime_type:'application/pdf',size_bytes:8}]),{status:200,headers:{'content-type':'application/json'}});
     if(url.endsWith('/preview'))return new Response('{}',{status:404,headers:{'content-type':'application/json'}});
     return new Response('%PDF-test',{status:200,headers:{'content-type':'application/pdf'}});
   }};
   window.open=(url)=>{window.__preview=url;};
 });
 await page.addScriptTag({path:'js/request-detail.js'});
 await page.evaluate(()=>window.RequestDetail.loadDocuments('request-1','STF-2026-000001'));
 assert.equal(await page.getByText('my-original.pdf').count(),1);
 await page.getByRole('button',{name:'Preview'}).click();
 await page.waitForFunction(()=>typeof window.__preview==='string');
 assert.match(await page.evaluate(()=>window.__preview),/^blob:/);
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'Download'}).click();
 assert.equal((await download).suggestedFilename(),'my-original.pdf');
 console.log('PASS mocked staff document list, original filename, preview and download');
}finally{await browser.close()}
