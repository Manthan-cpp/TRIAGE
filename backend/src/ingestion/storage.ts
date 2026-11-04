import * as fs from 'fs';
import * as path from 'path';
import { getIngestedDir, isPathInside } from '../lib/config';
import { safeFileName } from '../lib/fileNames';

export interface JobMeta {
  jobId: string;
  sourceLabel: string;
  createdAt: string;
  rawFiles: string[];
}

export class IngestionStorage {
  /**
   * Get job directories and ensure they exist.
   */
  public static initJobDir(jobId: string): {
    jobDir: string;
    rawDir: string;
    normalizedDir: string;
  } {
    const jobDir = path.join(getIngestedDir(), jobId);
    const rawDir = path.join(jobDir, 'raw');
    const normalizedDir = path.join(jobDir, 'normalized');

    fs.mkdirSync(rawDir, { recursive: true });
    fs.mkdirSync(normalizedDir, { recursive: true });

    return { jobDir, rawDir, normalizedDir };
  }

  /**
   * Save a raw file buffer to the job's raw/ directory.
   */
  public static saveRawFile(jobId: string, fileName: string, buffer: Buffer): string {
    const { rawDir } = this.initJobDir(jobId);
    const cleanName = safeFileName(fileName);
    let targetPath = path.join(rawDir, cleanName);
    let suffix = 1;
    const extension = path.extname(cleanName);
    const stem = path.basename(cleanName, extension);
    while (fs.existsSync(targetPath)) {
      targetPath = path.join(rawDir, `${stem}_${suffix++}${extension}`);
    }
    if (!isPathInside(rawDir, targetPath)) throw new Error('Invalid raw file path.');
    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  /**
   * Persist initial job metadata.
   */
  public static saveJobMeta(meta: JobMeta): void {
    const { jobDir } = this.initJobDir(meta.jobId);
    const metaPath = path.join(jobDir, 'meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  /**
   * Read job metadata if it exists.
   */
  public static readJobMeta(jobId: string): JobMeta | null {
    const metaPath = path.join(getIngestedDir(), jobId, 'meta.json');
    if (!fs.existsSync(metaPath)) return null;
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as JobMeta;
  }
}
