// PGLITE_TEST_DIR must point to an isolated directory with @electric-sql/pglite installed.
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import {processDocument} from '../supabase/functions/api/document-rebuild.ts';
const require = createRequire(join(process.env.PGLITE_TEST_DIR || process.cwd(), 'package.json'));
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create table public.request_documents (id uuid primary key, google_drive_file_id text unique, google_drive_folder_id text,
    internal_url text,storage_status text,uploaded_at timestamptz,updated_at timestamptz);
    alter table public.request_documents enable row level security;
    grant select on public.request_documents to authenticated;
    create function public.has_permission(text) returns boolean language sql as $$select true$$;
    create policy request_documents_staff_select on public.request_documents for select to authenticated using (true);`);
  await db.exec(await readFile('supabase/migrations/20261113090000_private_document_security.sql','utf8'));
  const id='11111111-1111-4111-8111-111111111111',lease='22222222-2222-4222-8222-222222222222';
  await db.query("insert into public.request_documents(id,security_state,storage_status) values ($1,'processing','pending')",[id]);
  await db.query("insert into public.private_document_jobs(document_id,original_file_id,original_folder_id) values($1,'private_original_001','private_folder_001')",[id]);
  const acquired=await db.query('select public.acquire_document_rebuild($1,$2) as ok',[id,lease]);assert.equal(acquired.rows[0].ok,true);
  assert.equal((await db.query('select public.acquire_document_rebuild($1,$2) as ok',[id,'33333333-3333-4333-8333-333333333333'])).rows[0].ok,false);
  await assert.rejects(db.query("select public.finish_document_rebuild($1,$2,'private_original_001','public_folder_001')",[id,lease]));
  await assert.rejects(db.query("select public.finish_document_rebuild($1,$2,'clean_file_00001','private_folder_001')",[id,lease]));
  assert.equal((await db.query('select security_state from public.request_documents where id=$1',[id])).rows[0].security_state,'processing');
  assert.equal((await db.query("select public.finish_document_rebuild($1,$2,'clean_file_00001','public_folder_001') as ok",[id,lease])).rows[0].ok,true);
  const row=(await db.query('select security_state,google_drive_file_id from public.request_documents where id=$1',[id])).rows[0];
  assert.equal(row.security_state,'ready');assert.equal(row.google_drive_file_id,'clean_file_00001');
  await db.query("insert into public.request_documents(id,google_drive_file_id,security_state,storage_status) values('44444444-4444-4444-8444-444444444444','legacy_original_1','legacy','uploaded')");
  const hash='a'.repeat(64);
  for (const expected of [true,true,false,false]) assert.equal((await db.query("select public.take_public_request_rate_limit('help',$1,2) as ok",[hash])).rows[0].ok,expected);
  await db.exec('set role authenticated');
  const visible=await db.query('select google_drive_file_id from public.request_documents');
  assert.deepEqual(visible.rows.map(r=>r.google_drive_file_id),['clean_file_00001']);
  await assert.rejects(db.query('select * from public.private_document_jobs'));
  await assert.rejects(db.query("select public.take_public_request_rate_limit('help',$1,2)",[hash]));
  await db.exec('reset role');
  const second='55555555-5555-4555-8555-555555555555';
  await db.query("insert into public.request_documents(id,security_state,storage_status) values ($1,'processing','pending')",[second]);
  await db.query("insert into public.private_document_jobs(document_id,original_file_id,original_folder_id) values($1,'private_original_002','private_folder_002')",[second]);
  let offline=true;
  const adapters={
    acquire:async(doc,token)=>(await db.query('select public.acquire_document_rebuild($1,$2) ok',[doc,token])).rows[0].ok,
    loadOriginal:async()=>({bytes:new Uint8Array([1]),mime:'image/png',originalId:'private_original_002'}),
    rebuild:async()=>{if(offline)throw Error('converter offline');return new Uint8Array([2])},
    saveClean:async()=>({fileId:'clean_file_00002',folderId:'public_folder_002'}),
    finish:async(doc,token,file,folder)=>(await db.query('select public.finish_document_rebuild($1,$2,$3,$4) ok',[doc,token,file,folder])).rows[0].ok,
    scheduleRetry:async(doc,token)=>{assert.equal((await db.query('select public.defer_document_rebuild($1,$2) ok',[doc,token])).rows[0].ok,true)},
  };
  assert.equal(await processDocument(second,adapters),'processing');
  let pending=(await db.query('select security_state,google_drive_file_id from public.request_documents where id=$1',[second])).rows[0];
  assert.equal(pending.security_state,'processing');assert.equal(pending.google_drive_file_id,null);
  assert.equal((await db.query('select retry_count from public.private_document_jobs where document_id=$1',[second])).rows[0].retry_count,1);
  await db.query('update public.private_document_jobs set next_attempt_at=now() where document_id=$1',[second]);
  offline=false;assert.equal(await processDocument(second,adapters),'ready');
  pending=(await db.query('select security_state,google_drive_file_id from public.request_documents where id=$1',[second])).rows[0];
  assert.equal(pending.security_state,'ready');assert.equal(pending.google_drive_file_id,'clean_file_00002');
  console.log('PASS isolated Postgres migration: leases, clean-only publish, private rows, and atomic rate counter');
} finally { await db.close(); }
