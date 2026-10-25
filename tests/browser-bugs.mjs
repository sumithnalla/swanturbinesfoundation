// Install tools with: npm install --prefix .agent-cache/qa --no-save playwright deno wrangler
// No production writes: real Chromium against local assets and explicit API fixtures.
import { chromium } from '../.agent-cache/qa/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('.');
const server=createServer(async(req,res)=>{
  try {
    let name=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(!extname(name)) name += name.endsWith('/')?'index.html':'.html';
    const path=resolve(root,'.'+name);
    if(!path.startsWith(root+'\\') || !['.html','.js','.css','.png','.jpeg','.jpg'].includes(extname(path))) {res.writeHead(404).end();return;}
    const data=await readFile(path); res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg'})[extname(path)]); res.end(data);
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage(); let submitted=0, uploads=0;
  await page.route('**/functions/v1/api/**',async route=>{
    const url=route.request().url();
    if(url.endsWith('/requests')) {submitted++;await new Promise(r=>setTimeout(r,300));await route.fulfill({json:{id:'d14307e2-bc7a-4463-978b-0f029661c564',reference:'STF-2026-TEST',document_upload_token:'test'}});}
    else if(url.endsWith('/documents')) {uploads++; if(uploads===1) await route.fulfill({status:503,json:{error:{message:'Disposable simulated storage failure'}}}); else await route.fulfill({json:{uploaded:[{id:'test-file'}]}});}
    else await route.fulfill({json:{campaigns:[],total:0}});
  });
  await page.goto(origin+'/request-help.html');
  await page.locator('#field_full_name').fill('Browser QA');
  await page.locator('#field_phone').fill('abcdefghij');
  await page.locator('#field_email').fill('qa@example.com');
  await page.locator('#field_address').fill('Disposable address');
  await page.locator('#field_city').fill('Hyderabad');
  await page.locator('#field_state').fill('Telangana');
  await page.getByRole('button',{name:'Next: Request Details'}).click();
  assert.equal(await page.locator('#stepSection1').evaluate(el=>el.classList.contains('active')),true);
  await page.locator('#field_phone').fill('9876543210');
  await page.getByRole('button',{name:'Next: Request Details'}).click();
  await page.locator('#field_help_type').selectOption('medical');
  await page.locator('#field_amount').fill('100');
  await page.locator('#field_description').fill('Disposable browser verification request.');
  assert.match(await page.locator('#descriptionCount').textContent(),/40 \/ 1,000/);
  await page.goto(origin+'/how.html');await page.goBack();
  assert.equal(await page.locator('#field_full_name').inputValue(),'Browser QA');
  assert.equal(await page.locator('#field_description').inputValue(),'Disposable browser verification request.');
  console.log('PASS browser Back preserves unfinished form');
  await page.evaluate(()=>HelpWizard.goToStep(3));
  await page.locator('#fileInput').setInputFiles(Array.from({length:4},(_,i)=>({name:`test${i}.pdf`,mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')})));
  assert.match(await page.locator('#helpFormMessage').textContent(),/at most three/);
  await page.locator('#fileInput').setInputFiles({name:'wrong.pdf',mimeType:'text/plain',buffer:Buffer.from('bad')});
  assert.match(await page.locator('#helpFormMessage').textContent(),/PDF, JPG, PNG/);
  await page.locator('#fileInput').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});
  await page.locator('#field_consent').check();
  await page.locator('#submitHelpBtn').click();
  assert.equal(await page.locator('#submissionProgress').isVisible(),true);
  await page.evaluate(()=>document.getElementById('helpRequestForm').dispatchEvent(new Event('submit',{cancelable:true})));
  await page.waitForFunction(()=>document.getElementById('submitHelpBtn').textContent.includes('Retry Document'));
  assert.equal(submitted,1);assert.equal(uploads,1);
  await page.locator('#submitHelpBtn').click();
  await page.waitForURL('**/requests-thank-you.html?*');assert.equal(submitted,1);assert.equal(uploads,2);
  await page.goBack();
  assert.equal(await page.locator('#field_full_name').inputValue(),'');
  assert.equal(await page.locator('#selectedFilesList').textContent(),'');
  assert.equal(await page.locator('#submitHelpBtn').isEnabled(),true);
  console.log('PASS browser validation, file limits, spinner, double-submit, failed-upload retry, successful Back reset');
  await page.goto(origin+'/contact.html');
  await page.locator('#contact_message').fill('A ten character message');
  assert.match(await page.locator('#contactMessageCount').textContent(),/23 \/ 1,000/);
  assert.equal(await page.locator('#contact_first_name').count(),0);
  assert.equal(await page.locator('#contact_mobile').getAttribute('pattern'),'[0-9]{10}');
  console.log('PASS contact field structure and live counter');
} finally { await browser.close();server.close(); }
