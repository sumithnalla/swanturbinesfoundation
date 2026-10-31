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
    for(const width of [320,375,390,430,600,712,768,884,900,1024,1366,1920]){
      await page.setViewportSize({width,height:900});
      const overflow=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,card:document.querySelector('main').getBoundingClientRect().toJSON()}));
      assert.ok(overflow.scrollWidth<=overflow.width+1,`${route} horizontal overflow at ${width}px: ${overflow.scrollWidth}`);
      assert.ok(overflow.card.left>=-1&&overflow.card.right<=width+1,`${route} card clipped at ${width}px`);
    }
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
  await page.route('**/functions/v1/api/api/v1/requests/admin/stats',route=>route.fulfill({json:{total:9,by_status:{pending:3,new:1,under_review:2,accepted:2,rejected:1}}}));
  await page.goto(origin+'/admin-contacts.html');
  await page.getByRole('columnheader',{name:'Contact'}).waitFor();
  await page.waitForFunction(()=>document.getElementById('sidebarRequestsBadge')?.textContent==='4');
  assert.equal(await page.locator('.custom-data-table').count(),1);
  assert.ok(await page.locator('.table-responsive-wrapper').evaluate(el=>el.scrollWidth>=el.clientWidth));
  for(const width of [320,375,390,430,600,712,768,884,900,1024,1366,1920]){
    await page.setViewportSize({width,height:900});
    const sizing=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,menu:getComputedStyle(document.querySelector('.adm-mobile-menu-toggle')).display,table:getComputedStyle(document.querySelector('.contact-data-table')).display}));
    assert.ok(sizing.scrollWidth<=width+1,`company admin horizontal overflow at ${width}px: ${sizing.scrollWidth}`);
    if(width<=768)assert.notEqual(sizing.menu,'none',`company mobile navigation missing at ${width}px`);
    if(width<=600)assert.equal(sizing.table,'block',`contact table did not transform to cards at ${width}px`);
  }
  await page.setViewportSize({width:375,height:812});
  await page.goto(origin+'/admin-contact-detail.html?id='+id);
  await page.getByRole('heading',{name:'Contact Message'}).waitFor();
  await page.getByRole('link',{name:'Reply by Email'}).waitFor();
  assert.ok(await page.locator('.adm-detail-grid').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
  await page.goto(origin+'/admin-profile.html');
  await page.waitForFunction(()=>document.getElementById('sidebarRequestsBadge')?.textContent==='4');
  console.log('PASS contact list/detail layout, responsive rendering and authorized message display at mobile width');

  const manage=await browser.newPage();
  const manageToken='header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature';
  await manage.addInitScript(({token})=>{localStorage.setItem('swan_admin_token',token);window.confirm=()=>true;window.alert=()=>{};},{token:manageToken});
  const userId='3c9c2e84-64c1-4f77-8fa3-732ff36c5f5b',superRole='d29a2471-84de-4fc9-9f53-46f7c1f5cb15',staffRole='70ed1b2c-074e-4665-b0be-2688cd6550a3';
  let requestedAuditCategory='';let savedRoles=null;let createdRoles=null;
  await manage.route('**/functions/v1/api/api/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(path.endsWith('/auth/me'))return route.fulfill({json:{id:userId,email:'qa-admin@example.com',full_name:'QA Admin',is_active:true,role_ids:[superRole],role_names:['super_admin']}});
    if(path.endsWith('/admin/dashboard'))return route.fulfill({json:{requests:{total:7}}});
    if(path.endsWith('/admin/users')&&request.method()==='GET')return route.fulfill({json:{users:[{id:userId,email:'qa-admin@example.com',full_name:'QA Admin',is_active:true,role_ids:[superRole],created_at:'2026-10-01T00:00:00Z'}]}});
    if(path.endsWith('/admin/users')&&request.method()==='POST'){createdRoles=request.postDataJSON().role_ids;return route.fulfill({status:201,json:{user:{id:'qa-created',role_ids:createdRoles}}});}
    if(path.endsWith('/admin/roles'))return route.fulfill({json:{roles:[{id:superRole,name:'super_admin',description:'Super administrator'},{id:staffRole,name:'foundation_staff',description:'Staff'}]}});
    if(path.endsWith('/admin/audit-logs')){requestedAuditCategory=url.searchParams.get('category')||'all';return route.fulfill({json:{total:2,logs:[{created_at:new Date().toISOString(),action:'login.success',actor_email:'qa-admin@example.com',resource_type:'user',resource_id:userId,result:'success'},{created_at:new Date().toISOString(),action:'login.failure',actor_email:'unknown@example.com',resource_type:'user',result:'failure',metadata:{reason:'invalid_credentials'}}]}});}
    if(path.endsWith('/roles')&&request.method()==='PATCH'){savedRoles=request.postDataJSON().role_ids;return route.fulfill({json:{updated:true}});}
    if(path.endsWith('/status')&&request.method()==='PATCH')return route.fulfill({json:{updated:true,is_active:false}});
    if(path.endsWith('/auth/logout'))return route.fulfill({json:{message:'Logged out'}});
    return route.fulfill({status:404,json:{error:{message:'Unmocked test route'}}});
  });
  await manage.goto(origin+'/manage/index.html');
  await manage.getByRole('heading',{name:'System Infrastructure Overview'}).waitFor();
  assert.equal(await manage.getByText('Active Campaigns',{exact:true}).count(),0);
  for(const width of [320,375,390,430,600,712,768,884,900,1024,1366,1920]){
    await manage.setViewportSize({width,height:900});
    const sizing=await manage.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,menu:getComputedStyle(document.querySelector('.manage-menu-toggle')).display}));
    assert.ok(sizing.scrollWidth<=width+1,`super-admin horizontal overflow at ${width}px: ${sizing.scrollWidth}`);
    if(width<=900)assert.notEqual(sizing.menu,'none',`super-admin mobile navigation missing at ${width}px`);
  }
  await manage.setViewportSize({width:375,height:812});
  await manage.locator('#manageNavToggle').click();assert.equal(await manage.locator('.manage-sidebar').evaluate(el=>el.classList.contains('open')),true);
  await manage.getByRole('button',{name:'User Accounts'}).click();assert.equal(await manage.locator('.manage-sidebar').evaluate(el=>el.classList.contains('open')),false);
  await manage.locator(`#usersTable tr:has([data-user-id="${userId}"])`).getByText('Edit roles').click();
  await manage.locator(`.user-role-checkbox[data-user-id="${userId}"][value="${staffRole}"]`).check();
  const rolesResponse=manage.waitForResponse(response=>response.url().includes(`/admin/users/${userId}/roles`)&&response.request().method()==='PATCH');
  await manage.getByRole('button',{name:'Save roles'}).click();
  await rolesResponse;
  assert.deepEqual(savedRoles,[superRole,staffRole]);
  await manage.getByRole('button',{name:'Create New User'}).click();
  await manage.setViewportSize({width:320,height:812});
  assert.ok(await manage.locator('#createUserModal .modal-content').evaluate(el=>el.getBoundingClientRect().right<=innerWidth+1));
  const newPassword=manage.locator('#newPassword');
  await manage.locator('#toggleNewPassword').click();assert.equal(await newPassword.getAttribute('type'),'text');
  await manage.locator('#toggleNewPassword').click();assert.equal(await newPassword.getAttribute('type'),'password');
  await manage.locator('#newFullName').fill('QA Created User');await manage.locator('#newEmail').fill('qa-created@example.com');await newPassword.fill('Disposable-QA-Password1');
  await manage.locator('input[name="newRoleIds"]').nth(0).check();await manage.locator('input[name="newRoleIds"]').nth(1).check();
  const createResponse=manage.waitForResponse(response=>response.url().endsWith('/admin/users')&&response.request().method()==='POST');
  await manage.getByRole('button',{name:'Create Account'}).click();await createResponse;assert.deepEqual(createdRoles,[superRole,staffRole]);
  await manage.locator('#manageNavToggle').click();
  await manage.getByRole('button',{name:'Audit Telemetry'}).click();
  await manage.locator('#auditCategoryFilter').selectOption('login');
  await manage.locator('#auditTableBody').getByText('login.failure',{exact:true}).waitFor();
  assert.equal(requestedAuditCategory,'login');
  assert.equal(await manage.locator('#auditTableBody tr').count(),2);
  await manage.getByRole('button',{name:'Log out'}).click();await manage.waitForURL('**/super-admin/login.html');
  const loginToggle=manage.locator('#togglePassword'),loginPassword=manage.locator('#password');
  assert.equal(await loginPassword.getAttribute('type'),'password');await loginToggle.click();assert.equal(await loginPassword.getAttribute('type'),'text');
  await manage.reload();assert.equal(await manage.locator('#password').getAttribute('type'),'password');
  await manage.close();

  const inactive=await browser.newPage();
  await inactive.addInitScript(({token})=>localStorage.setItem('swan_admin_token',token),{token:manageToken});
  await inactive.route('**/functions/v1/api/api/v1/auth/me',route=>route.fulfill({status:403,json:{error:{code:'ACCOUNT_INACTIVE',message:'This staff account is inactive. Please sign in again.'}}}));
  await inactive.goto(origin+'/manage/index.html');
  await inactive.waitForURL('**/super-admin/login.html?reason=deactivated');
  await inactive.getByRole('alert').getByText(/account was deactivated/i).waitFor();
  assert.equal(await inactive.evaluate(()=>localStorage.getItem('swan_admin_token')),null);
  await inactive.close();
  console.log('PASS super-admin categorized audit, multi-role create/edit, mobile nav, post-logout password toggle, campaign removal and deactivated-session redirect');
}finally{await browser.close();server.close();}
