import test from 'node:test';import assert from 'node:assert/strict';
import {rebuildForUpload} from '../supabase/functions/api/synchronous-rebuild.ts';import {rebuildViaScript} from '../supabase/functions/api/script-rebuild.ts';
import {appsScriptOriginals,directDriveOriginals} from '../supabase/functions/api/private-drive-adapters.ts';
const png=Uint8Array.from([137,80,78,71,13,10,26,10,1]);const clean=Uint8Array.from([137,80,78,71,13,10,26,10,2]);
const enc=x=>Buffer.from(x).toString('base64'),dec=x=>new Uint8Array(Buffer.from(x,'base64'));
for(const branch of ['script','direct'])test(`${branch} private original -> authenticated bridge -> clean copy`,async()=>{
 let originals=0,conversions=0,saved=0;
 const store=branch==='script'?appsScriptOriginals(async(op,p)=>{assert.equal(p.storage,'originals');originals++;return {id:'original_file_001',folder_id:'private_folder_01'}},enc):directDriveOriginals({rootId:'private_root_001',myDriveRootId:'mydrive_root_001',cleanRootId:'shared_root_0001'},{
  getFile:async()=>({id:'private_root_001',mimeType:'application/vnd.google-apps.folder',parents:['mydrive_root_001'],ownedByMe:true,shared:false,trashed:false}),
  listPermissions:async()=>({permissions:[{type:'user',role:'owner'}]}),
  putInRequestFolder:async()=>{originals++;return {fileId:'original_file_001',folderId:'private_folder_01'}}});
 const result=await rebuildForUpload('STF-2026-000001','image/png',png,{original:(...args)=>store.uploadOriginal(...args),
  rebuild:(bytes,mime)=>rebuildViaScript('STF-2026-000001',mime,bytes,async()=>{conversions++;return {mime_type:mime,content_base64:enc(clean)}},enc,dec),
  clean:async(_ref,_name,_mime,bytes)=>{saved++;assert.deepEqual(bytes,clean);return {fileId:'clean_file_00001',folderId:'public_folder_01'}}});
 assert.equal(result.fileId,'clean_file_00001');assert.equal(originals,1);assert.equal(conversions,1);assert.equal(saved,1);
});
