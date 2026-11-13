import test from 'node:test';import assert from 'node:assert/strict';
import {rebuildForUpload} from '../supabase/functions/api/synchronous-rebuild.ts';
const bytes=new Uint8Array([1,2,3]);const reference='STF-2026-000001';
test('saves original privately then publishes a distinct rebuilt copy',async()=>{
 const calls=[];
 const result=await rebuildForUpload(reference,'image/png',bytes,{original:async(r,n,m,b)=>(calls.push(['original',n]),{fileId:'original_file_01',folderId:'private_folder_01'}),rebuild:async()=>{calls.push(['rebuild']);return new Uint8Array([9])},clean:async(r,n,m,b)=>(calls.push(['clean',n,b[0]]),{fileId:'clean_file_00001',folderId:'clean_folder_0001'})});
 assert.equal(result.fileId,'clean_file_00001');assert.deepEqual(calls.map(x=>x[0]),['original','rebuild','clean']);assert.notEqual(calls[0][1],calls[2][1]);assert.equal(calls[2][2],9);
});
test('converter failures retry twice and never save the original as a clean copy',async()=>{
 let attempts=0,clean=0;const adapter={original:async()=>({fileId:'original_file_01',folderId:'private_folder_01'}),rebuild:async()=>{attempts++;throw Error('offline')},clean:async()=>{clean++;throw Error('must not happen')}};
 await assert.rejects(rebuildForUpload(reference,'image/png',bytes,adapter));assert.equal(attempts,3);assert.equal(clean,0);
});
test('oversized output and private-folder reuse fail closed',async()=>{
 const base={original:async()=>({fileId:'original_file_01',folderId:'private_folder_01'}),rebuild:async()=>new Uint8Array(10485761),clean:async()=>{throw Error('must not happen')}};
 await assert.rejects(rebuildForUpload(reference,'image/png',bytes,base));
 await assert.rejects(rebuildForUpload(reference,'image/png',bytes,{...base,rebuild:async()=>bytes,clean:async()=>({fileId:'clean_file_00001',folderId:'private_folder_01'})}));
});
