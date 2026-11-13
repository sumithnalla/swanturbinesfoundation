import test from 'node:test';import assert from 'node:assert/strict';import {rebuildViaScript} from '../supabase/functions/api/script-rebuild.ts';
const input=Uint8Array.from([137,80,78,71,13,10,26,10,1]);const enc=x=>Buffer.from(x).toString('base64'),dec=x=>new Uint8Array(Buffer.from(x,'base64'));
test('accepts only correctly typed rebuilt bytes returned by authenticated bridge',async()=>{
 const out=await rebuildViaScript('STF-2026-000001','image/png',input,async(op,payload)=>{assert.equal(op,'rebuild');assert.equal(payload.reference,'STF-2026-000001');return {mime_type:'image/png',content_base64:enc(input)}},enc,dec);assert.deepEqual(out,input);
});
test('rejects invalid media, malformed base64, wrong signatures and oversized responses',async()=>{
 const call=result=>async()=>result;
 for(const result of [{mime_type:'application/pdf',content_base64:enc(input)},{mime_type:'image/png',content_base64:'garbage!'},{mime_type:'image/png',content_base64:enc(Uint8Array.of(1,2,3))},{mime_type:'image/png',content_base64:'A'.repeat(13981020)}])await assert.rejects(rebuildViaScript('STF-2026-000001','image/png',input,call(result),enc,dec));
});
