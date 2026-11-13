import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saltedIpHash,consumeRateLimit} from '../supabase/functions/api/rate-limit.ts';
const salt='local-test-salt-that-is-at-least-32-bytes';
test('uses stable salted HMAC without storing plaintext addresses',async()=>{
  const a=await saltedIpHash('192.0.2.1',salt),b=await saltedIpHash('192.0.2.1',salt),c=await saltedIpHash('192.0.2.1',salt+'x');
  assert.match(a,/^[a-f0-9]{64}$/);assert.equal(a,b);assert.notEqual(a,c);assert.ok(!a.includes('192.0.2.1'));
  assert.equal(await saltedIpHash('2001:0db8:0:0:0:0:0:1',salt),await saltedIpHash('2001:db8::1',salt));
  await assert.rejects(saltedIpHash('spoofed, 192.0.2.1',salt));await assert.rejects(saltedIpHash('192.0.2.1','short'));
});
test('passes the hash to an atomic database RPC and fails closed on errors',async()=>{
  const db={rpc:async(name,args)=>{assert.equal(name,'take_public_request_rate_limit');assert.equal(args.p_endpoint,'help');assert.match(args.p_ip_hash,/^[a-f0-9]{64}$/);return {data:false,error:null};}};
  assert.equal(await consumeRateLimit(db,'help','192.0.2.1',salt,20),false);
  await assert.rejects(consumeRateLimit({rpc:async()=>({error:'offline',data:null})},'contact','192.0.2.1',salt,30));
});
