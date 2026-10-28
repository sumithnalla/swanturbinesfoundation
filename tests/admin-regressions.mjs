import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from '../.agent-cache/qa/node_modules/playwright/index.mjs';

const root=resolve('.');
const server=createServer(async(req,res)=>{
  try{
    let name=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(!extname(name))name=name.endsWith('/')?name+'index.html':name+'.html';
    const file=resolve(root,'.'+name);
    if(!file.startsWith(root+'\\')||!['.html','.js','.css','.png'].includes(extname(file))){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'})[extname(file)]);
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  for(const route of ['/admin-login.html','/super-admin/login.html']){
    const page=await browser.newPage();let logins=0;
    await page.route('**/functions/v1/api/api/v1/auth/login',async request=>{
      logins++;await new Promise(resolve=>setTimeout(resolve,250));
      await request.fulfill({status:401,json:{error:{message:'Invalid test credentials.'}}});
    });
    await page.goto(origin+route);
    const password=page.locator('#password'),toggle=page.locator('#togglePassword'),button=page.locator('#signIn');
    await toggle.click();assert.equal(await password.getAttribute('type'),'text');assert.equal(await toggle.getAttribute('aria-pressed'),'true');
    await toggle.click();assert.equal(await password.getAttribute('type'),'password');
    await page.locator('#email').fill('qa@example.com');await password.fill('Disposable-QA-Password1');
    await button.click();assert.equal(await button.isDisabled(),true);assert.match(await button.innerText(),/Signing in, please wait\.\.\./);
    await button.click({force:true});await page.getByRole('alert').waitFor({state:'visible'});
    assert.equal(logins,1,'busy form must not issue duplicate authentication requests');
    assert.equal(await button.isEnabled(),true);assert.equal(await button.innerText(),route.includes('super-admin')?'Authorize Super Admin':'Sign in to Company Admin');
    await page.close();
  }
  console.log('PASS company and super-admin password visibility, busy state, duplicate prevention, error recovery');

  const page=await browser.newPage({viewport:{width:375,height:812}});
  const token='header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
  await page.addInitScript(({token})=>{
    localStorage.setItem('swan_admin_token',token);
    localStorage.setItem('swan_auth_session_v2',JSON.stringify({user_id:'qa',user:{id:'qa',email:'qa@example.com',role:'admin'},expires_at:new Date(Date.now()+3600000).toISOString()}));
  },{token});
  const id='d14307e2-bc7a-4463-978b-0f029661c564';
  await page.route('**/functions/v1/api/api/v1/contact/admin**',async route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/'+id))await route.fulfill({json:{id,full_name:'Disposable Applicant',email:'qa@example.com',mobile:'9876543210',message:'A longer sample contact message to verify responsive wrapping and safe text rendering.',created_at:'2026-10-25T08:00:00Z'}});
    else await route.fulfill({json:{messages:[{id,full_name:'Disposable Applicant',email:'qa@example.com',mobile:'9876543210',message:'A longer sample contact message to verify responsive wrapping and safe text rendering.',created_at:'2026-10-25T08:00:00Z'}],total:1,page:1,page_size:50}});
  });
  await page.goto(origin+'/admin-contacts.html');
  await page.getByRole('columnheader',{name:'Contact'}).waitFor();
  assert.equal(await page.locator('.custom-data-table').count(),1);
  assert.ok(await page.locator('.table-responsive-wrapper').evaluate(el=>el.scrollWidth>=el.clientWidth));
  await page.goto(origin+'/admin-contact-detail.html?id='+id);
  await page.getByRole('heading',{name:'Contact Message'}).waitFor();
  await page.getByRole('link',{name:'Reply by Email'}).waitFor();
  assert.ok(await page.locator('.adm-detail-grid').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
  console.log('PASS contact list/detail layout, responsive rendering and authorized message display at mobile width');

  const manage=await browser.newPage();
  const manageToken='header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
  await manage.addInitScript(({token})=>{localStorage.setItem('swan_admin_token',token);window.confirm=()=>true;window.alert=()=>{};},{token:manageToken});
  const userId='3c9c2e84-64c1-4f77-8fa3-732ff36c5f5b',superRole='d29a2471-84de-4fc9-9f53-46f7c1f5cb15',staffRole='70ed1b2c-074e-4665-b0be-2688cd6550a3';
  let requestedAuditCategory='';let savedRoles=null;
  await manage.route('**/functions/v1/api/api/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(path.endsWith('/auth/me'))return route.fulfill({json:{id:userId,email:'qa-admin@example.com',full_name:'QA Admin',is_active:true,role_ids:[superRole],role_names:['super_admin']}});
    if(path.endsWith('/admin/dashboard'))return route.fulfill({json:{requests:{total:7}}});
    if(path.endsWith('/admin/users')&&request.method()==='GET')return route.fulfill({json:{users:[{id:userId,email:'qa-admin@example.com',full_name:'QA Admin',is_active:true,role_ids:[superRole],created_at:'2026-10-01T00:00:00Z'}]}});
    if(path.endsWith('/admin/roles'))return route.fulfill({json:{roles:[{id:superRole,name:'super_admin',description:'Super administrator'},{id:staffRole,name:'foundation_staff',description:'Staff'}]}});
    if(path.endsWith('/admin/audit-logs')){requestedAuditCategory=url.searchParams.get('category')||'all';return route.fulfill({json:{total:2,logs:[{created_at:new Date().toISOString(),action:'login.success',actor_email:'qa-admin@example.com',resource_type:'user',resource_id:userId,result:'success'},{created_at:new Date().toISOString(),action:'login.failure',actor_email:'unknown@example.com',resource_type:'user',result:'failure',metadata:{reason:'invalid_credentials'}}]}});}
    if(path.endsWith('/roles')&&request.method()==='PATCH'){savedRoles=request.postDataJSON().role_ids;return route.fulfill({json:{updated:true}});}
    if(path.endsWith('/status')&&request.method()==='PATCH')return route.fulfill({json:{updated:true,is_active:false}});
    return route.fulfill({status:404,json:{error:{message:'Unmocked test route'}}});
  });
  await manage.goto(origin+'/manage/index.html');
  await manage.getByRole('heading',{name:'System Infrastructure Overview'}).waitFor();
  assert.equal(await manage.getByText('Active Campaigns',{exact:true}).count(),0);
  await manage.getByRole('button',{name:'User Accounts'}).click();
  await manage.locator(`#user-roles-${userId}`).waitFor();
  await manage.locator(`#user-roles-${userId}`).selectOption([superRole,staffRole]);
  const rolesResponse=manage.waitForResponse(response=>response.url().includes(`/admin/users/${userId}/roles`)&&response.request().method()==='PATCH');
  await manage.getByRole('button',{name:'Save roles'}).click();
  await rolesResponse;
  assert.deepEqual(savedRoles,[superRole,staffRole]);
  await manage.getByRole('button',{name:'Create New User'}).click();
  const newPassword=manage.locator('#newPassword');
  await manage.locator('#toggleNewPassword').click();assert.equal(await newPassword.getAttribute('type'),'text');
  await manage.locator('#toggleNewPassword').click();assert.equal(await newPassword.getAttribute('type'),'password');
  await manage.getByRole('button',{name:'Cancel'}).click();
  await manage.getByRole('button',{name:'Audit Telemetry'}).click();
  await manage.locator('#auditCategoryFilter').selectOption('login');
  await manage.locator('#auditTableBody').getByText('login.failure',{exact:true}).waitFor();
  assert.equal(requestedAuditCategory,'login');
  assert.equal(await manage.locator('#auditTableBody tr').count(),2);
  await manage.close();

  const inactive=await browser.newPage();
  await inactive.addInitScript(({token})=>localStorage.setItem('swan_admin_token',token),{token:manageToken});
  await inactive.route('**/functions/v1/api/api/v1/auth/me',route=>route.fulfill({status:403,json:{error:{code:'ACCOUNT_INACTIVE',message:'This staff account is inactive. Please sign in again.'}}}));
  await inactive.goto(origin+'/manage/index.html');
  await inactive.waitForURL('**/super-admin/login.html?reason=deactivated');
  await inactive.getByRole('alert').getByText(/account was deactivated/i).waitFor();
  assert.equal(await inactive.evaluate(()=>localStorage.getItem('swan_admin_token')),null);
  await inactive.close();
  console.log('PASS super-admin categorized audit, role editing, create-user password toggle, campaign removal and deactivated-session redirect');
}finally{await browser.close();server.close();}
