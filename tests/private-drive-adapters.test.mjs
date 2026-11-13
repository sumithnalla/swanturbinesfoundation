import {test} from 'node:test';
import assert from 'node:assert/strict';
import {appsScriptOriginals,directDriveOriginals} from '../supabase/functions/api/private-drive-adapters.ts';
test('Apps Script writes only to explicitly selected originals storage',async()=>{
  let operation,payload;
  const store=appsScriptOriginals(async(op,value)=>{operation=op;payload=value;return {id:'original_id_001',folder_id:'original_folder_001'}},()=> 'fixture-base64');
  const result=await store.uploadOriginal('STF-2026-000001','random.png','image/png',new Uint8Array([1]));
  assert.equal(operation,'upload');assert.equal(payload.storage,'originals');assert.deepEqual(result,{fileId:'original_id_001',folderId:'original_folder_001'});
});
test('direct Drive refuses writes if root privacy cannot be verified',async()=>{
  let writes=0;
  const api={getFile:async()=>({id:'original-root',mimeType:'application/vnd.google-apps.folder',parents:['my-drive'],ownedByMe:true,shared:true,trashed:false}),listPermissions:async()=>({permissions:[{type:'user',role:'owner'}]}),putInRequestFolder:async()=>{writes++;return {fileId:'f',folderId:'d'}}};
  const store=directDriveOriginals({rootId:'original-root',myDriveRootId:'my-drive',cleanRootId:'clean-root'},api);
  await assert.rejects(store.uploadOriginal('STF-2026-000001','random.png','image/png',new Uint8Array([1])));assert.equal(writes,0);
  api.getFile=async()=>({id:'original-root',mimeType:'application/vnd.google-apps.folder',parents:['my-drive'],ownedByMe:true,shared:false,trashed:false});
  await store.uploadOriginal('STF-2026-000001','random.png','image/png',new Uint8Array([1]));assert.equal(writes,1);
});
