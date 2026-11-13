import {createRequire} from 'node:module';import {join} from 'node:path';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(join(process.env.PGLITE_TEST_DIR||process.cwd(),'package.json'));const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
try{
 await db.exec("create table public.request_documents(id integer primary key, original_filename text not null);insert into public.request_documents values(1,'historical.pdf')");
 await db.exec(await readFile('supabase/migrations/20261114100000_rebuilt_document_marker.sql','utf8'));
 assert.deepEqual((await db.query('select original_filename,is_rebuilt from public.request_documents where id=1')).rows[0],{original_filename:'historical.pdf',is_rebuilt:false});
 await db.exec("insert into public.request_documents values(2,'new.pdf',true)");
 assert.equal((await db.query('select is_rebuilt from public.request_documents where id=2')).rows[0].is_rebuilt,true);
 console.log('PASS isolated marker migration preserves historical records');
}finally{await db.close()}
