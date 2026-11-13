import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from '../.agent-cache/qa/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true});
try {
  const page=await browser.newPage();
  await page.setContent('<div id="docsContent"></div><div id="detailDocCountBadge"></div><div id="admToastContainer"></div>');
  await page.evaluate(()=>{
    window.__previewCalls=0;window.__openedUrl='';window.__allowConfirm=true;
    window.confirm=()=>window.__allowConfirm;
    window.open=()=>({opener:window,location:{replace:url=>window.__openedUrl=url},close:()=>{}});
    window.SwanAuth={authorizedFetch:async url=>{
      if(url.endsWith('/documents')) return new Response(JSON.stringify([
        {id:'ready',original_filename:'ready.pdf',mime_type:'application/pdf',security_state:'ready'},
        {id:'pending',original_filename:'pending.pdf',mime_type:'application/pdf',security_state:'processing'},
        {id:'legacy',original_filename:'legacy.pdf',mime_type:'application/pdf',security_state:'legacy'}
      ]));
      if(url.endsWith('/preview')){window.__previewCalls++;return new Response(JSON.stringify({url:'https://drive.google.com/file/d/clean_file_00001/view'}));}
      throw Error('unexpected request');
    }};
  });
  await page.addScriptTag({content:await readFile('js/request-detail.js','utf8')});
  await page.evaluate(()=>RequestDetail.loadDocuments('request','request'));
  assert.equal(await page.locator('[data-doc-action="preview"]').count(),1);
  assert.equal(await page.locator('[data-doc-action="download"]').count(),1);
  assert.match(await page.locator('#docsContent').innerText(),/Processing/);
  assert.match(await page.locator('#docsContent').innerText(),/Awaiting secure rebuild/);
  await page.evaluate(()=>window.__allowConfirm=false);
  await page.locator('[data-doc-action="preview"]').click();
  assert.equal(await page.evaluate(()=>window.__previewCalls),0);
  await page.evaluate(()=>window.__allowConfirm=true);
  await page.locator('[data-doc-action="preview"]').click();
  await page.waitForFunction(()=>window.__openedUrl!=='');
  assert.equal(await page.evaluate(()=>window.__openedUrl),'https://drive.google.com/file/d/clean_file_00001/view');
  console.log('PASS browser: processing and legacy files have no actions; confirmed ready preview requests a clean Drive link');
} finally {await browser.close()}
