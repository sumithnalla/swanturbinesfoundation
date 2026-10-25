// Inspect only the uniquely named fixtures created by this bug-verification suite.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
const base='https://qlfdbimnswbaiouvmtau.supabase.co';
const keys=JSON.parse(execFileSync(join(process.env.USERPROFILE,'scoop/shims/supabase.exe'),['projects','api-keys','--project-ref','qlfdbimnswbaiouvmtau','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
const key=keys.find(k=>k.name==='service_role').api_key;
const headers={apikey:key,Authorization:'Bearer '+key};
const r=await fetch(base+'/rest/v1/help_requests?applicant_full_name=eq.Disposable%20Bugs%20Verification&created_at=gte.2026-10-25T00:00:00Z&select=id,reference,created_at,request_documents(id)',{headers});
if(!r.ok)throw new Error('Fixture inspection failed: '+r.status);
const rows=await r.json();
console.log(JSON.stringify(rows.map(x=>({id:x.id,reference:x.reference,created_at:x.created_at,documents:x.request_documents.length}))));
if(process.argv.includes('--cleanup-empty'))for(const row of rows){
  if(row.request_documents.length)throw new Error('Refusing to delete fixture with documents: '+row.reference);
  for(const path of ['/rest/v1/help_requests?id=eq.'+row.id,'/rest/v1/audit_logs?resource_id=eq.'+row.id]){
    const deleted=await fetch(base+path,{method:'DELETE',headers});if(!deleted.ok)throw new Error('Fixture cleanup failed: '+deleted.status);
  }
  console.log('Removed empty disposable fixture '+row.reference);
}
