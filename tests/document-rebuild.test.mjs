import {test} from 'node:test';
import assert from 'node:assert/strict';
import {processDocument} from '../supabase/functions/api/document-rebuild.ts';
function fixture() {
  const events=[];
  const deps={
    acquire:async()=>{events.push('lease');return true},
    loadOriginal:async()=>{events.push('original');return {bytes:new Uint8Array([1]),mime:'image/png',originalId:'original-private'}},
    rebuild:async()=>{events.push('rebuild');return new Uint8Array([2])},
    saveClean:async()=>{events.push('save-clean');return {fileId:'clean-id',folderId:'clean-folder'}},
    finish:async(_id,_lease,file)=>{events.push('publish:'+file);return true},
    scheduleRetry:async()=>events.push('retry'),
  };
  return {deps,events};
}
test('publishes only after rebuilding and storing a distinct clean file',async()=>{
  const {deps,events}=fixture();assert.equal(await processDocument('doc',deps),'ready');
  assert.deepEqual(events,['lease','original','rebuild','save-clean','publish:clean-id']);
});
test('failed conversion and unavailable converter stay processing and schedule retry',async()=>{
  const {deps,events}=fixture();deps.rebuild=async()=>{events.push('offline');throw Error('offline')};
  assert.equal(await processDocument('doc',deps),'processing');assert.deepEqual(events,['lease','original','offline','retry']);
});
test('original identifiers can never be published as clean',async()=>{
  const {deps,events}=fixture();deps.saveClean=async()=>({fileId:'original-private',folderId:'clean-folder'});
  assert.equal(await processDocument('doc',deps),'processing');assert.ok(!events.some(x=>x.startsWith('publish:')));assert.equal(events.at(-1),'retry');
});
test('lease contention does not access file content',async()=>{
  const {deps,events}=fixture();deps.acquire=async()=>false;
  assert.equal(await processDocument('doc',deps),'busy');assert.deepEqual(events,[]);
});
