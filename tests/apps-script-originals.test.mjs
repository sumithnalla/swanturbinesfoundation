import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const code=await readFile('google-apps-script/Code.gs','utf8');
function fixture({extraEditor=false,privateAccess=true,rootParent=true}={}) {
  const owner={getEmail:()=> 'owner@example.test'};
  const folder={getId:()=> 'original-root',getOwner:()=>owner,getSharingAccess:()=>privateAccess?'private':'public',getEditors:()=>extraEditor?[{getEmail:()=> 'other@example.test'}]:[],getViewers:()=>[],getParents:()=>{let remaining=true;return {hasNext:()=>remaining,next:()=>{remaining=false;return {getId:()=>rootParent?'my-drive':'other-parent'}}}}};
  const ctx={PropertiesService:{getScriptProperties:()=>({getProperty:name=>({ROOT_FOLDER_ID:'clean-root',ORIGINALS_ROOT_FOLDER_ID:'original-root',SHARED_SECRET:'local-test-secret'})[name]})},Session:{getEffectiveUser:()=>owner},DriveApp:{Access:{PRIVATE:'private'},getFolderById:id=>id==='original-root'?folder:{getId:()=>id},getRootFolder:()=>({getId:()=> 'my-drive'})},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},console};
  vm.createContext(ctx);vm.runInContext(code,ctx);ctx.authorized_=()=>true;return ctx;
}
test('originals root must be owner-only and at the My Drive root',()=>{
  assert.equal(fixture().root_('originals').getId(),'original-root');
  for(const settings of [{extraEditor:true},{privateAccess:false},{rootParent:false}])assert.throws(()=>fixture(settings).root_('originals'));
});
test('original deletion and cleanup remain disabled pending retention approval',()=>{
  const ctx=fixture();
  for(const operation of ['delete','cleanup']){
    const response=ctx.doPost({postData:{contents:JSON.stringify({operation,storage:'originals',reference:'STF-2026-000001'})}});
    assert.equal(response.error,'retention_not_configured');
  }
  assert.equal(ctx.doPost({postData:{contents:JSON.stringify({operation:'upload',storage:'originals',reference:'../../bad'})}}).error,'invalid_reference');
});
