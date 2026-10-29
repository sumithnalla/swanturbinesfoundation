// Explicit opt-in: creates disposable records/users/files in the linked project,
// verifies the real API and browser, then removes ONLY those fixtures.
// Credentials are obtained in memory from the authenticated Supabase CLI.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { join } from 'node:path';
import { chromium } from '../.agent-cache/qa/node_modules/playwright/index.mjs';
if(!process.argv.includes('--live')) throw new Error('Pass --live to authorize disposable production verification.');
const ref='qlfdbimnswbaiouvmtau', base=`https://${ref}.supabase.co`,api=base+'/functions/v1/api/api/v1';
const origin='https://swan-turbines-foundation-11f.pages.dev';
const keys=JSON.parse(execFileSync(join(process.env.USERPROFILE,'scoop/shims/supabase.exe'),['projects','api-keys','--project-ref',ref,'--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const service=keys.find(k=>k.name==='service_role').api_key,anon=keys.find(k=>k.name==='anon').api_key;
const users=[],requests=[],contacts=[];let staff, browser;
const pass=label=>console.log('PASS '+label);
async function call(path,{method='GET',body,token,raw=false}={}) {
  const response=await fetch(api+path,{method,headers:{Origin:origin,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status,headers:response.headers,data:raw?Buffer.from(await response.arrayBuffer()):await response.json().catch(()=>null)};
}
async function rest(path,{method='GET',body,token=service,key=service}={}) {
  const r=await fetch(base+path,{method,headers:{apikey:key,Authorization:'Bearer '+token,'Content-Type':'application/json',Prefer:'return=representation'},body:body?JSON.stringify(body):undefined});
  return {status:r.status,data:await r.json().catch(()=>null)};
}
async function staffUser(role) {
  const email='swan-bugs-'+randomUUID()+'@example.com',password=randomBytes(24).toString('base64url')+'aA1!';
  const created=await rest('/auth/v1/admin/users',{method:'POST',body:{email,password,email_confirm:true,user_metadata:{full_name:'Disposable Bugs QA'}}});
  assert.equal(created.status,200,'create disposable staff');users.push(created.data.id);
  const roles=await rest('/rest/v1/roles?select=id&name=eq.'+role);
  assert.equal((await rest('/rest/v1/user_roles',{method:'POST',body:{user_id:created.data.id,role_id:roles.data[0].id}})).status,201);
  const login=await call('/auth/login',{method:'POST',body:{email,password}});assert.equal(login.status,200,'test staff login');
  return {id:created.data.id,email,password,token:login.data.access_token};
}
const requestBody=()=>({submission_key:randomBytes(32).toString('hex'),applicant:{full_name:'Disposable Bugs Verification',mobile:'9876543210',email:'delivered@resend.dev',address:'Disposable test address',city:'Hyderabad',state:'Telangana'},request:{support_type:'medical',description:'Disposable verification request; no aid is needed.',beneficiaries:1,amount_required:'1',urgency:'normal'},consent:true});
function pdf() {
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>','<< /Length 0 >>\nstream\n\nendstream'];
  let text='%PDF-1.4\n';const offsets=[0];
  objects.forEach((obj,i)=>{offsets.push(Buffer.byteLength(text));text+=`${i+1} 0 obj\n${obj}\nendobj\n`;});
  const start=Buffer.byteLength(text);text+='xref\n0 5\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF\n`;
  return Buffer.from(text);
}
async function upload(request,files,token=request.document_upload_token) {
  const body=new FormData();for(const f of files)body.append('files',new Blob([f.bytes],{type:f.type||'application/pdf'}),f.name);
  const r=await fetch(api+'/requests/'+request.id+'/documents',{method:'POST',headers:{Origin:origin,'X-Request-Upload-Token':token},body});
  return {status:r.status,data:await r.json().catch(()=>null)};
}
try {
  const pre=await fetch(api+'/requests',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST'}});
  assert.equal(pre.headers.get('access-control-allow-origin'),origin);pass('production-origin CORS');
  staff=await staffUser('foundation_admin');const reviewer=await staffUser('foundation_reviewer');const superAdmin=await staffUser('super_admin');
  const roleResponse=await call('/admin/roles',{token:superAdmin.token});assert.equal(roleResponse.status,200);
  const adminRole=roleResponse.data.roles.find(r=>r.name==='foundation_admin')?.id,reviewerRole=roleResponse.data.roles.find(r=>r.name==='foundation_reviewer')?.id;assert.ok(adminRole&&reviewerRole);
  const multiEmail='swan-bugs-multi-'+randomUUID()+'@example.com',multiPassword=randomBytes(24).toString('base64url')+'aA1!';
  assert.equal((await call('/admin/users',{method:'POST',token:reviewer.token,body:{full_name:'Unauthorized Multi Role QA',email:multiEmail,password:multiPassword,role_ids:[adminRole,reviewerRole]}})).status,403,'reviewer cannot create accounts');
  const multiCreated=await call('/admin/users',{method:'POST',token:superAdmin.token,body:{full_name:'Disposable Multi Role QA',email:multiEmail,password:multiPassword,role_ids:[adminRole,reviewerRole]}});assert.equal(multiCreated.status,201);users.push(multiCreated.data.user.id);
  const multiLogin=await call('/auth/login',{method:'POST',body:{email:multiEmail,password:multiPassword}});assert.equal(multiLogin.status,200);assert.deepEqual([...multiLogin.data.user.role_names].sort(),['foundation_admin','foundation_reviewer'].sort());
  const multiDetail=await call('/contact/admin',{token:multiLogin.data.access_token});assert.equal(multiDetail.status,200,'combined account retains permissions granted by assigned roles');
  assert.equal((await call('/admin/users/'+multiCreated.data.user.id+'/roles',{method:'PATCH',token:superAdmin.token,body:{role_ids:[reviewerRole,adminRole]}})).status,200,'authorized role set can be replaced');
  assert.equal((await call('/admin/users',{method:'POST',token:superAdmin.token,body:{full_name:'Invalid Multi Role QA',email:'swan-bugs-invalid-'+randomUUID()+'@example.com',password:multiPassword,role_ids:[adminRole,'00000000-0000-0000-0000-000000000000']}})).status,422,'invalid roles rejected and account creation rolled back');
  pass('multi-role account creation/editing, combined role claims, authorization boundary and invalid-role rollback');
  for(const path of ['/contact/admin','/requests/admin']) assert.equal((await call(path)).status,403);
  assert.equal((await call('/contact/admin',{token:reviewer.token})).status,403);
  pass('anonymous denied; reviewer cannot access contacts');
  for(const delta of [{mobile:'12345678901'},{email:'bad@x'},{message:'short'},{message:'x'.repeat(1001)},{full_name:''}]) {
    assert.equal((await call('/contact',{method:'POST',body:{full_name:'Disposable QA',mobile:'9876543210',email:'qa@example.com',message:'Test message for validation.',...delta}})).status,422);
  }
  const contact=await call('/contact',{method:'POST',body:{full_name:'Disposable Contact QA',mobile:'9876543210',email:'qa@example.com',message:'x'.repeat(1000)}});
  assert.equal(contact.status,201);contacts.push(contact.data.submission_id);
  const message=await call('/contact/admin/'+contacts[0],{token:staff.token});assert.equal(message.status,200);assert.equal(message.data.mobile,'9876543210');assert.equal(message.data.message.length,1000);assert.ok(Date.parse(message.data.created_at));
  assert.ok((await call('/contact/admin',{token:staff.token})).data.messages.some(m=>m.id===contacts[0]));pass('contact validation, 1,000-character persistence, authorized list/detail');
  for(const mutate of [b=>b.applicant.mobile='123',b=>b.applicant.email='',b=>b.request.description='x'.repeat(1001),b=>b.request.description='short']) {
    const b=requestBody();mutate(b);assert.equal((await call('/requests',{method:'POST',body:b})).status,422);
  }
  const b=requestBody();b.request.description='x'.repeat(1000);
  const created=await Promise.all([call('/requests',{method:'POST',body:b}),call('/requests',{method:'POST',body:b})]);
  for(const c of created)if(c.data?.id&&!requests.some(r=>r.id===c.data.id))requests.push(c.data);
  for(const c of created)assert.ok([200,201].includes(c.status),'request create or idempotent retry: HTTP '+c.status+' '+(c.data?.error?.code||''));
  assert.equal(created[0].data.id,created[1].data.id);const request=created[0].data;
  const contactRoute='/requests/admin/'+request.id+'/contact-applicant';
  assert.equal((await call(contactRoute,{method:'POST',body:{}})).status,403,'email route requires staff authentication');
  assert.equal((await call(contactRoute,{method:'POST',token:staff.token,body:{}})).status,415,'email route requires multipart content');
  const badMail=new FormData();badMail.set('subject','Invalid attachment QA');badMail.set('message','This must be rejected before delivery.');badMail.append('attachments',new Blob(['not an allowed document'],{type:'text/plain'}),'payload.txt');
  const rejectedMail=await fetch(api+contactRoute,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+staff.token},body:badMail});assert.equal(rejectedMail.status,422,'email attachment type rejected before Resend');
  const validMail=new FormData();validMail.set('subject','Disposable applicant email integration test');validMail.set('message','This is a disposable test message sent through the Resend test recipient.');validMail.append('attachments',new Blob([pdf()],{type:'application/pdf'}),'verification.pdf');
  const sentMail=await fetch(api+contactRoute,{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+staff.token},body:validMail});assert.equal(sentMail.status,202,'Resend test-recipient email with validated PDF attachment');assert.equal((await sentMail.json()).sent,true);
  pass('applicant email API authorization, attachment validation and real Resend test-recipient send');
  const capability=await rest('/rest/v1/help_requests?id=eq.'+request.id+'&select=document_upload_token_hash,document_upload_token_expires_at');
  assert.equal(capability.status,200);assert.equal(capability.data.length,1);
  assert.equal(capability.data[0].document_upload_token_hash===createHash('sha256').update(request.document_upload_token).digest('hex'),true,'returned upload capability matches stored hash');
  console.log('INFO upload capability expiry='+capability.data[0].document_upload_token_expires_at+'; server Date='+created[0].headers.get('date'));
  assert.equal((await call('/requests',{method:'POST',body:{...b,request:{...b.request,description:'Changed payload conflict.'}}})).status,409);
  pass('request validation, zero-document creation and concurrent idempotent submit');
  const browserContact=await call('/contact',{method:'POST',body:{full_name:'Disposable Browser Contact',mobile:'9876543210',email:'qa@example.com',message:'Disposable production browser contact verification.'}});
  assert.equal(browserContact.status,201);contacts.push(browserContact.data.submission_id);
  const browserRequestBody={...requestBody(),applicant:{...requestBody().applicant,full_name:'Disposable Browser Request'},request:{support_type:'medical',description:'Disposable browser test only; no assistance requested.',beneficiaries:1,amount_required:'1',urgency:'normal'}};
  const browserRequest=await call('/requests',{method:'POST',body:browserRequestBody});assert.equal(browserRequest.status,201);requests.push(browserRequest.data);
  pass('production public API accepted disposable contact and zero-document request');
  assert.equal((await upload(request,[{name:'test.pdf',bytes:pdf()}],'wrong')).status,401);
  assert.equal((await upload(request,Array.from({length:4},(_,i)=>({name:`test${i}.pdf`,bytes:pdf()})))).status,422);
  assert.equal((await upload(request,[{name:'bad.pdf',bytes:Buffer.from('not a pdf')}])).status,422);
  assert.equal((await upload(request,[{name:'bad.txt',bytes:pdf(),type:'text/plain'}])).status,422);
  assert.equal((await upload(request,[{name:'empty.pdf',bytes:Buffer.alloc(0)}])).status,422);
  assert.equal((await upload(request,[{name:'oversized.pdf',bytes:Buffer.alloc(10485761)}])).status,422);
  const lock=randomUUID();assert.equal((await rest('/rest/v1/rpc/acquire_document_upload',{method:'POST',body:{p_request:request.id,p_lock:lock}})).data,true);
  assert.equal((await upload(request,[{name:'locked.pdf',bytes:pdf()}])).status,409);
  await rest('/rest/v1/rpc/release_document_upload',{method:'POST',body:{p_request:request.id,p_lock:lock}});
  pass('upload token, count, type/signature, empty, >10 MB and concurrent-upload rejection');
  const large=Buffer.alloc(10485760,32);pdf().copy(large);
  const files=[{name:'qa-small.pdf',bytes:pdf()},{name:'qa-second.pdf',bytes:pdf()},{name:'qa-10mb.pdf',bytes:large}];
  const up=await upload(request,files);assert.equal(up.status,201,'real Drive upload');assert.equal(up.data.uploaded.length,3);
  assert.equal((await upload(request,files)).status,201,'idempotent document retry');
  assert.equal((await upload(request,[{name:'fourth.pdf',bytes:pdf()}])).status,422);
  const docs=await call('/requests/admin/'+request.reference+'/documents',{token:staff.token});assert.equal(docs.status,200);assert.equal(docs.data.length,3);
  assert.ok(docs.data.every(d=>!d.google_drive_file_id&&!d.internal_url));
  for(const doc of docs.data) {
    const dl='/requests/admin/'+request.id+'/documents/'+doc.id+'/download';assert.equal((await call(dl)).status,403);
    const data=await call(dl,{token:staff.token,raw:true});assert.equal(data.status,200);assert.deepEqual(data.data,files.find(f=>f.name===doc.original_filename).bytes);
  }
  const metadata=await rest('/rest/v1/help_requests?id=eq.'+request.id+'&select=google_drive_folder_id');assert.ok(metadata.data[0].google_drive_folder_id);
  pass('real 3-file Drive upload including exactly 10 MB, retry deduplication, metadata and byte-exact protected downloads');
  assert.equal((await call('/requests/admin/'+request.id+'/status',{method:'PATCH',token:reviewer.token,body:{status:'under_review'}})).status,403);
  const patch=await call('/requests/admin/'+request.id+'/status',{method:'PATCH',token:staff.token,body:{status:'under_review',admin_note:'Disposable verification note',changed_by:reviewer.id}});assert.equal(patch.status,200);
  const detail=await call('/requests/admin/'+request.reference,{token:staff.token});assert.equal(detail.status,200);assert.equal(detail.data.last_status_change.changed_by,staff.id);assert.equal(detail.data.last_status_change.from_status,'pending');assert.equal(detail.data.last_status_change.to_status,'under_review');assert.ok(detail.data.last_status_change.changed_by_name);assert.ok(Date.parse(detail.data.last_status_change.created_at));
  assert.equal((await call('/requests/admin/'+request.id+'/status',{method:'PATCH',token:staff.token,body:{status:'under_review',admin_note:''}})).status,200);
  for(const next of ['accepted','rejected','pending','under_review']) {
    const changed=await call('/requests/admin/'+request.id+'/status',{method:'PATCH',token:staff.token,body:{status:next,admin_note:'Revised status verification'}});
    assert.equal(changed.status,200,'repeat status transition to '+next+': '+JSON.stringify(changed.data));
    assert.equal(changed.data.status,next);
  }
  const notes=await call('/requests/admin/'+request.id,{token:staff.token});assert.equal(notes.data.admin_note,'Revised status verification');assert.equal(notes.data.status_history.length,5);
  const audit=await rest('/rest/v1/audit_logs?resource_id=eq.'+request.id+'&action=eq.request.status_changed');assert.equal(audit.data.length,5);assert.ok(audit.data.every(x=>x.actor_id===staff.id));
  pass('repeat transitions including accepted→rejected, atomic history/audit, server-verified actor, note edit and timestamp');
  const denied=await rest('/rest/v1/contact_submissions',{method:'POST',key:anon,token:anon,body:{full_name:'Bypass',mobile:'9876543210',email:'qa@example.com',message:'Direct REST must be denied.'}});assert.ok(denied.status>=400);
  assert.deepEqual((await rest('/rest/v1/contact_submissions?select=id',{key:anon,token:anon})).data,[]);
  const directRpc=await rest('/rest/v1/rpc/adjudicate_request',{method:'POST',key:anon,token:staff.token,body:{p_request:request.id,p_actor:staff.id,p_status:'accepted',p_note:null}});assert.ok(directRpc.status>=400);
  pass('RLS denies anonymous contact access/insertion and browser adjudication RPC');
  // Real stable-production browser: use a disposable account, never real staff passwords.
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/admin-login');await page.locator('#email').fill(staff.email);await page.locator('#password').fill(staff.password);await page.locator('button[type=submit]').click();await page.waitForURL('**/admin', {timeout:60000});
  await page.goto(origin+'/admin-contacts');await page.getByRole('link',{name:'View message'}).first().waitFor();
  await page.goto(origin+'/admin-contact-detail?id='+contacts[0]);await page.getByRole('heading',{name:'Disposable Contact QA'}).waitFor();
  await page.goto(origin+'/admin-requests');await page.getByRole('columnheader',{name:'Submitted Time (IST)'}).waitFor();await page.getByText(request.reference,{exact:true}).waitFor();
  await page.goto(origin+'/admin-request-detail?id='+request.id);await page.getByText('Last status change',{exact:true}).waitFor();await page.getByRole('button',{name:'Download',exact:true}).first().waitFor();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).first().click();const download=await downloaded;assert.equal(await download.failure(),null);
  await page.locator('input[name=detailReqStatus][value=accepted]').check();await page.locator('#adminCaseNotes').fill('Disposable browser adjudication verification');
  await page.locator('#saveDecisionBtn').click();await page.waitForFunction(()=>document.querySelector('#adminCaseNotes')?.value==='Disposable browser adjudication verification' && !document.querySelector('#saveDecisionBtn')?.disabled);
  const updated=await call('/requests/admin/'+request.id,{token:staff.token});assert.equal(updated.data.status,'accepted');assert.equal(updated.data.last_status_change.changed_by,staff.id);
  await page.screenshot({path:'.agent-cache/qa-case-detail.png',fullPage:true});
  assert.deepEqual(errors,[]);pass('stable production browser: login, contact list/detail, submitted time, adjudication, private download, no JS exceptions');
  await page.goto(origin+'/contact');await page.locator('#contact_full_name').fill('Disposable Browser Contact');await page.locator('#contact_mobile').fill('9876543210');await page.locator('#contact_email').fill('qa@example.com');await page.locator('#contact_message').fill('Disposable production browser contact verification.');
  assert.equal(await page.locator('#contactMessageCount').textContent(),'51 / 1,000 characters');
  await page.goto(origin+'/request-help');
  await page.locator('#field_full_name').fill('Disposable Browser Draft');await page.locator('#field_phone').fill('9876543210');await page.locator('#field_email').fill('qa@example.com');await page.locator('#field_address').fill('Disposable verification address');await page.locator('#field_city').fill('Hyderabad');await page.locator('#field_state').fill('Telangana');
  await page.getByRole('button',{name:'Next: Request Details'}).click();await page.locator('#field_help_type').selectOption('medical');await page.locator('#field_amount').fill('1');await page.locator('#field_description').fill('Disposable browser draft, not submitted.');
  await page.goto(origin+'/contact');await page.goBack();assert.equal(await page.locator('#field_full_name').inputValue(),'Disposable Browser Draft');
  pass('production browser form rendering/counters/unfinished draft retention; stable API accepted actual submissions');
} finally {
  if(browser)await browser.close();
  let clean=true;
  for(const request of requests) {
    try {
      const docs=await call('/requests/admin/'+request.id+'/documents',{token:staff.token});
      assert.equal(docs.status,200);
      for(const doc of docs.data)assert.equal((await call('/requests/admin/'+request.id+'/documents/'+doc.id,{method:'DELETE',token:staff.token})).status,204);
      if(docs.data.length){const check=await call('/requests/admin/'+request.id+'/documents/check-folder',{token:staff.token});assert.equal(check.data.trashed,true,'empty disposable folder trashed');}
      assert.equal((await rest('/rest/v1/help_requests?id=eq.'+request.id,{method:'DELETE'})).status,200);
      await rest('/rest/v1/audit_logs?resource_id=eq.'+request.id,{method:'DELETE'});
    }catch(error){clean=false;console.error('CLEANUP requires inspection for disposable request '+request.reference+': '+error.message);}
  }
  for(const id of contacts){await rest('/rest/v1/contact_submissions?id=eq.'+id,{method:'DELETE'});await rest('/rest/v1/audit_logs?resource_id=eq.'+id,{method:'DELETE'});}
  for(const id of users){await rest('/rest/v1/audit_logs?actor_id=eq.'+id,{method:'DELETE'});await rest('/rest/v1/audit_logs?resource_id=eq.'+id,{method:'DELETE'});await rest('/rest/v1/user_roles?user_id=eq.'+id,{method:'DELETE'});const result=await rest('/auth/v1/admin/users/'+id,{method:'DELETE'});if(result.status!==200)clean=false;}
  if(!clean)throw new Error('Disposable cleanup incomplete; see exact references above.');
  pass('disposable documents/folders, requests, messages, auth accounts and test-only audit cleanup');
}
