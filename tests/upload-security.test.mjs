import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomStorageName, withinTotalSize } from '../supabase/functions/api/upload-security.ts';

test('total size accepts 30 MiB and rejects a byte more', () => {
  const ten = 10 * 1024 * 1024;
  assert.equal(withinTotalSize([{size: ten}, {size: ten}, {size: ten}]), true);
  assert.equal(withinTotalSize([{size: ten}, {size: ten}, {size: ten + 1}]), false);
  assert.equal(withinTotalSize([{size: -1}]), false);
});

test('storage names use a random UUID and the validated media type', () => {
  const name = randomStorageName('image/jpeg');
  assert.match(name, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/);
  assert.notEqual(name, randomStorageName('image/jpeg'));
  assert.match(randomStorageName('application/pdf'), /\.pdf$/);
  assert.match(randomStorageName('image/png'), /\.png$/);
  assert.match(randomStorageName('image/webp'), /\.webp$/);
  assert.throws(() => randomStorageName('application/octet-stream'));
});
