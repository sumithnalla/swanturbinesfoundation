import {randomStorageName} from './upload-security.ts';

export interface SynchronousRebuildAdapter {
  original:(reference:string,name:string,mime:string,bytes:Uint8Array)=>Promise<{fileId:string;folderId:string}>;
  rebuild:(bytes:Uint8Array,mime:string)=>Promise<Uint8Array>;
  clean:(reference:string,name:string,mime:string,bytes:Uint8Array)=>Promise<{fileId:string;folderId:string}>;
}

/** The original is retained on any failure. No unrebuilt fallback is allowed. */
export async function rebuildForUpload(reference:string,mime:string,bytes:Uint8Array,adapter:SynchronousRebuildAdapter) {
  if(!/^STF-[0-9]{4}-[0-9]{6,}$/.test(reference)||!bytes.length||bytes.length>10485760)throw new Error('Invalid upload');
  const original=await adapter.original(reference,randomStorageName(mime),mime,bytes);
  const validId=(value:string)=>typeof value==='string'&&/^[A-Za-z0-9_-]{10,255}$/.test(value);
  if(!validId(original.fileId)||!validId(original.folderId))throw new Error('Private original was not confirmed');
  let rebuilt:Uint8Array|undefined;
  for(let attempt=0;attempt<3;attempt++){
    try {rebuilt=await adapter.rebuild(bytes,mime);if(!rebuilt.length||rebuilt.length>10485760)throw new Error('Invalid rebuilt size');break;}
    catch (_){rebuilt=undefined;}
  }
  if(!rebuilt)throw new Error('Rebuilding unavailable; retry document upload');
  const clean=await adapter.clean(reference,randomStorageName(mime),mime,rebuilt);
  if(!validId(clean.fileId)||!validId(clean.folderId)||clean.fileId===original.fileId||clean.folderId===original.folderId)throw new Error('Invalid rebuilt copy');
  return clean;
}
