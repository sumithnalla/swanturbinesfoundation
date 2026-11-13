import {requirePrivateRoot, type DrivePermission, type PrivateRootInfo} from './drive-privacy.ts';
interface PrivateOriginalStore {uploadOriginal(reference:string,name:string,mime:string,bytes:Uint8Array):Promise<{fileId:string;folderId:string}>}

type ScriptCall=(operation:string,payload:Record<string,unknown>)=>Promise<any>;
type Encoder=(bytes:Uint8Array)=>string;

/** Apps Script independently checks its owner-only originals root on each call. */
export function appsScriptOriginals(call:ScriptCall, encode:Encoder):PrivateOriginalStore {
  return {async uploadOriginal(reference,name,mime,bytes){
    const file=await call('upload',{storage:'originals',reference,name,mime_type:mime,content_base64:encode(bytes)});
    return {fileId:file.id,folderId:file.folder_id};
  }};
}

/** Direct Drive requires actual identity/ACL checks immediately before each original write. */
export function directDriveOriginals(config:{rootId:string;myDriveRootId:string;cleanRootId:string}, api:{
  getFile:(id:string)=>Promise<PrivateRootInfo>;
  listPermissions:(id:string)=>Promise<{permissions?:DrivePermission[];nextPageToken?:string|null}>;
  putInRequestFolder:(rootId:string,reference:string,name:string,mime:string,bytes:Uint8Array)=>Promise<{fileId:string;folderId:string}>;
}):PrivateOriginalStore {
  return {async uploadOriginal(reference,name,mime,bytes){
    await requirePrivateRoot(api.getFile,api.listPermissions,config.rootId,config.myDriveRootId,config.cleanRootId);
    return api.putInRequestFolder(config.rootId,reference,name,mime,bytes);
  }};
}
