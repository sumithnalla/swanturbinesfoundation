import {test} from 'node:test';
import assert from 'node:assert/strict';
import {privateRootIsOwnerOnly,requirePrivateRoot} from '../supabase/functions/api/drive-privacy.ts';
const folder={id:'original-root',mimeType:'application/vnd.google-apps.folder',parents:['my-drive'],ownedByMe:true,shared:false,trashed:false};
const owner=[{type:'user',role:'owner'}];
test('requires an unshared owner-only folder directly below the owner My Drive root',async()=>{
  assert.equal(privateRootIsOwnerOnly(folder,'my-drive','clean-root',owner),true);
  const bad=[{...folder,shared:true},{...folder,ownedByMe:false},{...folder,parents:['shared-parent']},{...folder,driveId:'shared-drive'},{...folder,trashed:true},{...folder,parents:['my-drive','other']}];
  for(const root of bad) assert.equal(privateRootIsOwnerOnly(root,'my-drive','clean-root',owner),false);
  assert.equal(privateRootIsOwnerOnly(folder,'my-drive','original-root',owner),false);
  assert.equal(privateRootIsOwnerOnly(folder,'my-drive','clean-root',[...owner,{type:'user',role:'reader'}]),false);
  assert.equal(privateRootIsOwnerOnly(folder,'my-drive','clean-root',owner,'more-pages'),false);
  assert.equal(privateRootIsOwnerOnly(folder,'my-drive','clean-root',[{type:'user',role:'owner',permissionDetails:[{inherited:true}]}]),false);
  await assert.rejects(requirePrivateRoot(async()=>folder,async()=>({permissions:[...owner,{type:'anyone',role:'reader'}]}),'original-root','my-drive','clean-root'));
});
