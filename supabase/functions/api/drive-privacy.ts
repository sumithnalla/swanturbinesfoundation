export type PrivateRootInfo = {
  id?: string; mimeType?: string; parents?: string[]; ownedByMe?: boolean;
  shared?: boolean; trashed?: boolean; driveId?: string;
};
export type DrivePermission = { type?: string; role?: string; deleted?: boolean; permissionDetails?: {inherited?: boolean}[] };

/** Strict precondition for a private My Drive originals root, for the service-account branch. */
export function privateRootIsOwnerOnly(root: PrivateRootInfo, myDriveRootId: string, cleanRootId: string,
  permissions: DrivePermission[], nextPageToken?: string | null): boolean {
  if (!root.id || !myDriveRootId || !cleanRootId || root.id===cleanRootId || root.id===myDriveRootId ||
      root.mimeType!=='application/vnd.google-apps.folder' || root.ownedByMe!==true || root.shared!==false ||
      root.trashed!==false || root.driveId || !Array.isArray(root.parents) || root.parents.length!==1 || root.parents[0]!==myDriveRootId || nextPageToken) return false;
  const active=permissions.filter(p=>p.deleted!==true);
  return active.length===1 && active[0].type==='user' && active[0].role==='owner' &&
    !(active[0].permissionDetails || []).some(detail=>detail.inherited===true);
}

/** The caller must fetch all requested fields with its actual Drive identity. */
export async function requirePrivateRoot(
  getFile:(id:string)=>Promise<PrivateRootInfo>, listPermissions:(id:string)=>Promise<{permissions?:DrivePermission[];nextPageToken?:string|null}>,
  rootId:string, myDriveRootId:string, cleanRootId:string,
):Promise<void> {
  const [root, page]=await Promise.all([getFile(rootId),listPermissions(rootId)]);
  if (root.id!==rootId || !Array.isArray(page.permissions) || !privateRootIsOwnerOnly(root,myDriveRootId,cleanRootId,page.permissions,page.nextPageToken)) throw new Error('Originals root must be owner-only in My Drive');
}
