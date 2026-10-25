import { validEmail, validMobile, bounded, requestLookup } from '../supabase/functions/api/production-forms.ts';
function check(value: boolean) { if (!value) throw new Error('Validation assertion failed'); }
Deno.test('mobile: exactly ten ASCII digits', () => {
  check(validMobile('9876543210'));
  for (const v of ['123','98765432101','+919876543210','98765 43210','abcdefghij',null,1234567890]) check(!validMobile(v));
});
Deno.test('email and text boundaries', () => {
  check(validEmail('test+qa@example.com'));
  for(const v of ['',null,'a@b','a@@b.com','a b@c.com']) check(!validEmail(v));
  for(const n of [10,1000]) check(bounded('a'.repeat(n),10,1000));
  for(const v of ['a'.repeat(9),'a'.repeat(1001),' '.repeat(20),null]) check(!bounded(v,10,1000));
});
Deno.test('references never enter a UUID equality filter', () => {
  check(requestLookup('STF-2026-000001')==='reference');
  check(requestLookup('d14307e2-bc7a-4463-978b-0f029661c564')==='id');
});
