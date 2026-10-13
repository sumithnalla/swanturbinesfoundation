const MAX_BYTES = 10 * 1024 * 1024;
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

function prop_(name) {
  const value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error('Missing script configuration: ' + name);
  return value;
}

function safe_(value, fallback) {
  return String(value || fallback).replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').slice(0, 180) || fallback;
}

function bytesEqual_(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= (a[i] & 255) ^ b[i];
  return result === 0;
}

function authorized_(event, body) {
  const timestamp = String(event.parameter.timestamp || '');
  const signature = String(event.parameter.signature || '');
  const now = Math.floor(Date.now() / 1000);
  if (!/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp)) > 300 || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const digest = Utilities.computeHmacSha256Signature(timestamp + '.' + body, prop_('SHARED_SECRET'));
  return bytesEqual_(digest, signature.match(/.{2}/g).map(function (x) { return parseInt(x, 16); }));
}

function root_() { return DriveApp.getFolderById(prop_('ROOT_FOLDER_ID')); }

function requestFolder_(reference) {
  const name = safe_(reference, 'request');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const folders = root_().getFoldersByName(name);
    return folders.hasNext() ? folders.next() : root_().createFolder(name);
  } finally { lock.releaseLock(); }
}

function fileInRequestFolder_(reference, fileId) {
  const file = DriveApp.getFileById(String(fileId));
  const folder = requestFolder_(reference);
  const parents = file.getParents();
  while (parents.hasNext()) if (parents.next().getId() === folder.getId()) return file;
  throw new Error('File is not in the requested folder');
}

function doPost(event) {
  try {
    const body = event.postData && event.postData.contents || '';
    if (!authorized_(event, body)) return json_({ error: 'unauthorized' });
    const request = JSON.parse(body);
    const operation = String(request.operation || '');
    if (!request.reference) return json_({ error: 'reference_required' });
    if (operation === 'upload') {
      if (!request.name || !request.mime_type || !request.content_base64) return json_({ error: 'invalid_payload' });
      const bytes = Utilities.base64Decode(request.content_base64);
      if (!bytes.length || bytes.length > MAX_BYTES) return json_({ error: 'invalid_size' });
      const folder = requestFolder_(request.reference);
      const file = folder.createFile(Utilities.newBlob(bytes, String(request.mime_type), safe_(request.name, 'document')));
      return json_({ id: file.getId(), name: file.getName(), mime_type: file.getMimeType(), size_bytes: file.getSize(), folder_id: folder.getId() });
    }
    if (operation === 'download') {
      const file = fileInRequestFolder_(request.reference, request.file_id);
      return json_({ id: file.getId(), name: file.getName(), mime_type: file.getMimeType(), size_bytes: file.getSize(), content_base64: Utilities.base64Encode(file.getBlob().getBytes()) });
    }
    if (operation === 'delete') {
      const file = fileInRequestFolder_(request.reference, request.file_id);
      file.setTrashed(true);
      return json_({ deleted: true, id: file.getId() });
    }
    if (operation === 'cleanup') {
      const folder = requestFolder_(request.reference);
      if (folder.getFiles().hasNext() || folder.getFolders().hasNext()) return json_({ cleaned: false, reason: 'folder_not_empty' });
      folder.setTrashed(true);
      return json_({ cleaned: true, folder_id: folder.getId() });
    }
    return json_({ error: 'unsupported_operation' });
  } catch (error) {
    console.error(error);
    return json_({ error: 'drive_unavailable' });
  }
}

function doGet() { return json_({ status: 'ok' }); }
