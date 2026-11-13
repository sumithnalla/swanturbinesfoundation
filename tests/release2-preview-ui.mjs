import {chromium} from '../.agent-cache/qa/node_modules/playwright/index.mjs';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage();await page.setContent('<div id="docsContent"></div><span id="attachedCount"></span><div id="admToastContainer"></div>');
 await page.evaluate(()=>{window.__confirm=false;window.confirm=()=>window.__confirm;window.open=(url)=>{window.__opened=url};window.SwanAuth={authorizedFetch:async(url)=>url.endsWith('/documents')?new Response(JSON.stringify([{id:'doc-1',original_filename:'my-file.pdf',mime_type:'application/pdf',size_bytes:10}]),{status:200}):new Response(JSON.stringify({url:'https://drive.google.com/file/d/clean_file_00001/view'}),{status:200})}});
 await page.addScriptTag({path:'js/request-detail.js'});await page.evaluate(()=>window.RequestDetail.loadDocuments('request-1','STF-2026-000001'));
 await page.getByRole('button',{name:'Preview'}).click();await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>window.__opened),undefined);
 await page.evaluate(()=>{window.__confirm=true});await page.getByRole('button',{name:'Preview'}).click();await page.waitForFunction(()=>window.__opened);assert.equal(await page.evaluate(()=>window.__opened),'https://drive.google.com/file/d/clean_file_00001/view');
 console.log('PASS rebuilt preview confirmation and allowed Drive URL');
}finally{await browser.close()}
