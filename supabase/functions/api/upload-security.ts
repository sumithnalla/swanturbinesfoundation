const extensions: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Call only after the file's declared format has passed signature validation. */
export function randomStorageName(mime: string): string {
  const extension = extensions[mime];
  if (!extension) throw new Error('Unsupported document format');
  return `${crypto.randomUUID()}.${extension}`;
}

export function withinTotalSize(files: readonly { size: number }[]): boolean {
  return files.every((file) => Number.isSafeInteger(file.size) && file.size >= 0) &&
    files.reduce((total, file) => total + file.size, 0) <= 30 * 1024 * 1024;
}
