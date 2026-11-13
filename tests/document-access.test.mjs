import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cleanDocumentPreview} from '../supabase/functions/api/document-access.ts';
test('preview is limited to ready documents and valid Drive file identifiers',()=>{
  assert.equal(cleanDocumentPreview({security_state:'ready',google_drive_file_id:'clean_file_00001'}),'https://drive.google.com/file/d/clean_file_00001/view');
  for (const doc of [null,{security_state:'legacy',google_drive_file_id:'original_file_001'},{security_state:'processing',google_drive_file_id:'original_file_001'},{security_state:'ready',google_drive_file_id:'../../original_file_001'},{security_state:'ready',google_drive_file_id:null}]) assert.equal(cleanDocumentPreview(doc),null);
});
