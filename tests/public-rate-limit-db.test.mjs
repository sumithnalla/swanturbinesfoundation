import {createRequire} from 'node:module';import {join} from 'node:path';import {readFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const require=createRequire(join(process.env.PGLITE_TEST_DIR||process.cwd(),'package.json'));const {PGlite}=require('@electric-sql/pglite');const db=new PGlite();
try{
 await db.exec('create role anon; create role authenticated; create role service_role bypassrls');
 await db.exec(await readFile('supabase/migrations/20261114090000_public_rate_limits.sql','utf8'));
 const run=async(endpoint,hash,global,ip)=>(await db.query('select public.take_public_endpoint_limit($1,$2,$3,$4) ok',[endpoint,hash,global,ip])).rows[0].ok;
 const hash='a'.repeat(64);assert.equal(await run('help',hash,3,2),true);assert.equal(await run('help',hash,3,2),true);assert.equal(await run('help',hash,3,2),false);assert.equal(await run('help',null,3,2),false);
 assert.equal(await run('contact',null,1,1),true);assert.equal(await run('contact',null,1,1),false);
 await db.exec('set role authenticated');await assert.rejects(run('help',hash,3,2));await assert.rejects(db.query('select * from public.public_endpoint_limits'));
 console.log('PASS isolated rate limit migration: global/IP ceilings, endpoint isolation and RLS');
}finally{await db.close()}
