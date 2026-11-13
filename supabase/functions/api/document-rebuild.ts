/** Independent orchestration contract. Callers must provide private Drive and database adapters. */
export interface RebuildDependencies {
  acquire(documentId: string, leaseId: string): Promise<boolean>;
  loadOriginal(documentId: string): Promise<{bytes: Uint8Array; mime: string; originalId: string}>;
  rebuild(bytes: Uint8Array, mime: string): Promise<Uint8Array>;
  saveClean(documentId: string, bytes: Uint8Array, mime: string): Promise<{fileId: string; folderId: string}>;
  finish(documentId: string, leaseId: string, fileId: string, folderId: string): Promise<boolean>;
  scheduleRetry(documentId: string, leaseId: string): Promise<void>;
}

/** No original may be published, and a failure always remains in processing. */
export async function processDocument(documentId: string, dependencies: RebuildDependencies): Promise<'busy'|'ready'|'processing'> {
  const leaseId = crypto.randomUUID();
  if (!await dependencies.acquire(documentId, leaseId)) return 'busy';
  try {
    const original = await dependencies.loadOriginal(documentId);
    if (!original.originalId || !original.bytes.length) throw new Error('Original is unavailable');
    const clean = await dependencies.rebuild(original.bytes, original.mime);
    if (!clean.length) throw new Error('Rebuild returned no file');
    const stored = await dependencies.saveClean(documentId, clean, original.mime);
    if (!stored.fileId || !stored.folderId || stored.fileId === original.originalId) throw new Error('Invalid clean file');
    if (!await dependencies.finish(documentId, leaseId, stored.fileId, stored.folderId)) throw new Error('Clean file could not be committed');
    return 'ready';
  } catch (_) {
    await dependencies.scheduleRetry(documentId, leaseId);
    return 'processing';
  }
}
