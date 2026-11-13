import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFile} from 'node:fs/promises';
const source=await readFile('google-apps-script/Code.gs','utf8');
function setup(status=200,target='https://converter-test.run.app',output=[137,80,78,71,13,10,26,10]){
 const properties={SHARED_SECRET:'test',CONVERTER_URL:target};let called=0,options;
 const context={Date,console,PropertiesService:{getScriptProperties:()=>({getProperty:n=>properties[n]})},
  Utilities:{computeHmacSha256Signature:()=>Array(32).fill(0),base64Decode:s=>Array.from(Buffer.from(s,'base64')),base64Encode:b=>Buffer.from(b).toString('base64')},
  ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType(){return {text}}})},
  ScriptApp:{getIdentityToken:()=> 'test-identity'},UrlFetchApp:{fetch:(url,opts)=>{called++;options={url,opts};return {getResponseCode:()=>status,getHeaders:()=>({'Content-Type':'image/png'}),getBlob:()=>({getBytes:()=>output})}}}};
 vm.createContext(context);vm.runInContext(source,context);const request={operation:'rebuild',reference:'STF-2026-000001',mime_type:'image/png',content_base64:Buffer.from(output).toString('base64')};
 return {run:()=>JSON.parse(context.doPost({parameter:{timestamp:String(Math.floor(Date.now()/1000)),signature:'0'.repeat(64)},postData:{contents:JSON.stringify(request)}}).text),get called(){return called},get options(){return options}};
}
test('bridge uses identity token and rejects redirects',()=>{const fixture=setup();assert.equal(fixture.run().mime_type,'image/png');assert.equal(fixture.called,1);assert.equal(fixture.options.opts.followRedirects,false);assert.equal(fixture.options.opts.headers.Authorization,'Bearer test-identity');});
test('bridge fails closed for unauthenticated or invalid targets',()=>{const denied=setup(403);assert.equal(denied.run().error,'converter_unavailable');const target=setup(200,'https://attacker.example');assert.equal(target.run().error,'invalid_converter');assert.equal(target.called,0);});
