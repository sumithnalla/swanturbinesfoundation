import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyTurnstile } from '../supabase/functions/api/turnstile.ts';
import { productionForms } from '../supabase/functions/api/production-forms.ts';

const secret = 'local-test-secret';
const host = ['example.com'];
const response = value => async () => new Response(JSON.stringify(value), {status: 200});

test('requires configured secret, host and nonempty token', async () => {
  assert.deepEqual(await verifyTurnstile('x', undefined, host), {ok:false, unavailable:true});
  assert.deepEqual(await verifyTurnstile('x', secret, []), {ok:false, unavailable:true});
  assert.deepEqual(await verifyTurnstile('', secret, host), {ok:false, unavailable:false});
});
test('accepts only a successful response for an allowed host', async () => {
  assert.equal((await verifyTurnstile('ok', secret, host, response({success:true,hostname:'example.com'}))).ok, true);
  for (const body of [{success:false,'error-codes':['timeout-or-duplicate']},{success:false},{success:true,hostname:'evil.example'}]) {
    assert.equal((await verifyTurnstile('bad', secret, host, response(body))).ok, false);
  }
});
test('verification fails closed on provider/network failure', async () => {
  assert.deepEqual(await verifyTurnstile('x', secret, host, async () => { throw Error('offline'); }), {ok:false, unavailable:true});
});

test('both public endpoints reject missing or duplicate challenges before any database write', async () => {
  const oldDeno = globalThis.Deno, oldFetch = globalThis.fetch;
  globalThis.Deno = { env: { get: name => ({TURNSTILE_SECRET_KEY:secret,TURNSTILE_ALLOWED_HOSTNAMES:'example.com'})[name] } };
  globalThis.fetch = response({success:false, 'error-codes':['timeout-or-duplicate']});
  const context = {
    db: { from() { throw Error('database write attempted'); } },
    fail: (_req, status, code) => new Response(code, {status}),
  };
  try {
    for (const path of ['/api/v1/contact','/api/v1/requests']) {
      for (const body of [{}, {turnstile_token:'duplicate'}]) {
        const req = new Request('https://example.com' + path, {method:'POST',body:JSON.stringify(body)});
        assert.equal((await productionForms(req, path, context)).status, 403);
      }
    }
  } finally { globalThis.Deno = oldDeno; globalThis.fetch = oldFetch; }
});

test('both public endpoints proceed after verified challenges', async () => {
  const oldDeno = globalThis.Deno, oldFetch = globalThis.fetch;
  globalThis.Deno = { env: { get: name => ({TURNSTILE_SECRET_KEY:secret,TURNSTILE_ALLOWED_HOSTNAMES:'example.com'})[name] } };
  globalThis.fetch = response({success:true,hostname:'example.com'});
  const context = {
    db: { from(table) { return { insert(row) { return { select() { return { async single() {
      return {data: table === 'contact_submissions' ? {id:'contact'} : {...row,id:'request',reference:'STF-2026-000001',status:'pending'},error:null};
    } }; } }; } }; } },
    json: (_req, data, status=200) => new Response(JSON.stringify(data), {status}),
    fail: (_req, status, code) => new Response(code, {status}),
    audit: async () => {}, email: async () => true,
    hex: async () => 'hash', tokenValue: () => 'token', support: value => value, urgency: value => value,
  };
  const contact = {turnstile_token:'ok',full_name:'Test Person',mobile:'9876543210',email:'test@example.com',message:'A valid message'};
  const application = {turnstile_token:'ok',consent:true,applicant:{full_name:'Test Person',mobile:'9876543210',email:'test@example.com',address:'A road',city:'Town',state:'State'},request:{description:'A valid description',amount_required:'100',beneficiaries:1}};
  try {
    for (const [path,body] of [['/api/v1/contact',contact], ['/api/v1/requests',application]]) {
      const req = new Request('https://example.com' + path, {method:'POST',body:JSON.stringify(body)});
      assert.equal((await productionForms(req, path, context)).status, 201);
    }
  } finally { globalThis.Deno = oldDeno; globalThis.fetch = oldFetch; }
});
