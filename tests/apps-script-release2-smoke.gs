// TEST ONLY: paste into a new file in the separate temporary Apps Script project.
// Do not add this file to the live Apps Script deployment.
function testRelease2Lifecycle() {
  const props = PropertiesService.getScriptProperties();
  const keys = ['ROOT_FOLDER_ID', 'ORIGINALS_ROOT_FOLDER_ID', 'SHARED_SECRET', 'CONVERTER_URL'];
  if (keys.some(function (key) { return props.getProperty(key); })) throw new Error('Use only the empty temporary test project');
  const created = { folders: [], files: [] };
  const run = 'STF-2026-999999';
  function invoke(payload, secret) {
    const body = JSON.stringify(payload), timestamp = String(Math.floor(Date.now() / 1000));
    const sig = Utilities.computeHmacSha256Signature(timestamp + '.' + body, secret)
      .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
    const result = JSON.parse(doPost({ parameter: { timestamp: timestamp, signature: sig }, postData: { contents: body } }).getContent());
    if (result.error) throw new Error('Operation ' + payload.operation + ' failed: ' + result.error);
    return result;
  }
  try {
    const cleanRoot = DriveApp.getRootFolder().createFolder('TEMP-clean-' + Utilities.getUuid());
    created.folders.push(cleanRoot.getId());
    const originalRoot = DriveApp.getRootFolder().createFolder('TEMP-originals-' + Utilities.getUuid());
    created.folders.push(originalRoot.getId());
    const secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperties({ ROOT_FOLDER_ID: cleanRoot.getId(), ORIGINALS_ROOT_FOLDER_ID: originalRoot.getId(),
      SHARED_SECRET: secret, CONVERTER_URL: 'https://swan-rebuild-test-20261114-376599961528.us-central1.run.app' });
    const input = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a9sAAAAASUVORK5CYII=';
    const original = invoke({ operation: 'upload', storage: 'originals', reference: run, name: Utilities.getUuid()+'.png', mime_type: 'image/png', content_base64: input }, secret);
    created.files.push(original.id); created.folders.push(original.folder_id);
    const rebuilt = invoke({ operation: 'rebuild', reference: run, mime_type: 'image/png', content_base64: input }, secret);
    if (rebuilt.mime_type !== 'image/png' || !rebuilt.content_base64) throw new Error('Converter output invalid');
    const clean = invoke({ operation: 'upload', storage: 'clean', reference: run, name: Utilities.getUuid()+'.png', mime_type: 'image/png', content_base64: rebuilt.content_base64 }, secret);
    created.files.push(clean.id); created.folders.push(clean.folder_id);
    if (clean.id === original.id || clean.folder_id === original.folder_id) throw new Error('Original and rebuilt copy are not separated');
    const downloaded = invoke({ operation: 'download', storage: 'clean', reference: run, file_id: clean.id }, secret);
    if (downloaded.content_base64 !== rebuilt.content_base64) throw new Error('Rebuilt download mismatch');
    console.log('PASS: private original, authenticated rebuild, separate clean copy and exact download');
  } finally {
    let cleanupFailed = false;
    created.files.forEach(function (id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (error) { cleanupFailed = true; } });
    created.folders.reverse().forEach(function (id) { try { DriveApp.getFolderById(id).setTrashed(true); } catch (error) { cleanupFailed = true; } });
    keys.forEach(function (key) { props.deleteProperty(key); });
    console.log(cleanupFailed ? 'CLEANUP FAILED: check temporary test folders' : 'CLEANUP: temporary test files and folders moved to Trash');
  }
}
