import * as fs from 'fs';
import * as path from 'path';

export interface JobMeta {
  jobId: string;
  sourceLabel: string;
  createdAt: string;
  rawFiles: string[];
}

export class IngestionStorage {
  private static readonly BASE_DIR = path.resolve(__dirname, '../../../data/ingested');

  /**
   * Get job directories and ensure they exist.
   */
  public static initJobDir(jobId: string): {
    jobDir: string;
    rawDir: string;
    normalizedDir: string;
  } {
    const jobDir = path.join(this.BASE_DIR, jobId);
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
    const targetPath = path.join(rawDir, fileName);
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
    const metaPath = path.join(this.BASE_DIR, jobId, 'meta.json');
    if (!fs.existsSync(metaPath)) return null;
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as JobMeta;
  }
}
