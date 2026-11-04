import * as path from 'path';

/** Return a safe, single-component filename for storage under a job directory. */
export function safeFileName(input: string): string {
  const normalized = input.replace(/\\/g, '/');
  const baseName = path.posix.basename(normalized)
    .replace(/\0/g, '')
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!baseName || baseName === '.' || baseName === '..') {
    throw new Error('Uploaded file must have a valid filename.');
  }
  return baseName;
}
