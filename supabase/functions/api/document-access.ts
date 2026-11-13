/** Returns only a syntactically valid, ready clean-copy link; originals are stored elsewhere. */
export function cleanDocumentPreview(document: {security_state?: unknown; google_drive_file_id?: unknown} | null): string | null {
  if (!document || document.security_state !== 'ready' || typeof document.google_drive_file_id !== 'string' || !/^[A-Za-z0-9_-]{10,255}$/.test(document.google_drive_file_id)) return null;
  return `https://drive.google.com/file/d/${document.google_drive_file_id}/view`;
}
