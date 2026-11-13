import {test} from 'node:test';
import assert from 'node:assert/strict';
import {googleIdToken, requestRebuild, validateFederationConfig} from '../supabase/functions/api/cloud-run-auth.ts';

const config={providerAudience:'//iam.googleapis.com/projects/123/locations/global/workloadIdentityPools/test-pool/providers/test-provider',serviceAccountEmail:'converter-invoker@example-project.iam.gserviceaccount.com',cloudRunAudience:'https://converter-abc-uc.a.run.app/'};
test('only approved provider, service account and HTTPS Cloud Run targets are accepted',()=>{
  validateFederationConfig(config);
  for(const cloudRunAudience of ['http://converter-abc-uc.a.run.app/','https://example.com/','https://converter-abc-uc.a.run.app.evil.test/','https://converter-abc-uc.a.run.app/path','https://user:pass@converter-abc-uc.a.run.app/']) assert.throws(()=>validateFederationConfig({...config,cloudRunAudience}));
});
test('exchanges workload assertion then requests a Google ID token',async()=>{
  const calls=[];
  const result=await googleIdToken('assertion',config,async(url,init)=>{calls.push([url,init]);return new Response(JSON.stringify(calls.length===1?{access_token:'federated'}:{token:'id-token'}),{status:200});});
  assert.equal(result,'id-token');assert.equal(calls.length,2);
  assert.equal(JSON.parse(calls[0][1].body).subjectToken,'assertion');
  assert.equal(JSON.parse(calls[1][1].body).audience,config.cloudRunAudience);
  assert.equal(calls[1][1].headers.Authorization,'Bearer federated');
  assert.equal(calls[0][1].redirect,'error');assert.equal(calls[1][1].redirect,'error');
});
test('fails closed on failed federation, identity or converter responses',async()=>{
  await assert.rejects(googleIdToken('assertion',config,async()=>new Response('',{status:403})),/exchange failed/);
  let count=0;await assert.rejects(googleIdToken('assertion',config,async()=>++count===1?new Response('{"access_token":"x"}') : new Response('',{status:403})),/identity token request failed/);
  await assert.rejects(requestRebuild(new Uint8Array([1]),'image/png',config,'id',async()=>new Response('',{status:503})),/rebuild failed/);
  await assert.rejects(requestRebuild(new Uint8Array([1]),'image/png',config,'id',async()=>new Response('not image',{headers:{'Content-Type':'text/plain'}})),/rebuild failed/);
});
test('converter receives one file with Google ID token and fixed route',async()=>{
  const png = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
  const output=await requestRebuild(new Uint8Array([1]),'image/png',config,'id',async(url,init)=>{assert.equal(url.href,'https://converter-abc-uc.a.run.app/rebuild');assert.equal(init.redirect,'error');assert.equal(init.headers.Authorization,'Bearer id');return new Response(new Uint8Array(png),{headers:{'Content-Type':'image/png'}});});
  assert.deepEqual([...output],png);
  await assert.rejects(requestRebuild(new Uint8Array([1]),'image/png',config,'id',async()=>new Response('fake',{headers:{'Content-Type':'image/png'}})),/Invalid rebuilt document/);
});
