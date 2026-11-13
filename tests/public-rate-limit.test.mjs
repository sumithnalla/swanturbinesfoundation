import test from 'node:test';
import assert from 'node:assert/strict';
import {checkPublicRateLimit} from '../supabase/functions/api/public-rate-limit.ts';
const config={salt:'test-only-salt-value-at-least-32-characters',globalLimit:40,ipLimit:10};
test('hashes the documented header and never sends a raw IP to storage',async()=>{
  let args;const req=new Request('https://example.test',{headers:{'x-forwarded-for':'192.0.2.1, 203.0.113.2'}});
  assert.equal(await checkPublicRateLimit(req,'help',config,async x=>(args=x,{data:true,error:null})),'allowed');
  assert.match(args.p_hash,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(args).includes('192.0.2.1'));
});
test('missing or invalid IP uses global only; errors and missing salt fail closed',async()=>{
  let args;const rpc=async x=>(args=x,{data:false,error:null});
  assert.equal(await checkPublicRateLimit(new Request('https://example.test'),'help',config,rpc),'limited');assert.equal(args.p_hash,null);
  assert.equal(await checkPublicRateLimit(new Request('https://example.test',{headers:{'x-forwarded-for':'garbage'}}),'help',config,rpc),'limited');assert.equal(args.p_hash,null);
  assert.equal(await checkPublicRateLimit(new Request('https://example.test'),'help',{...config,salt:''},rpc),'unavailable');
  assert.equal(await checkPublicRateLimit(new Request('https://example.test'),'contact',config,async()=>{throw Error('offline')}),'unavailable');
});
