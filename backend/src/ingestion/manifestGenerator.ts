import * as fs from 'fs';
import * as path from 'path';
import { getIngestedDir } from '../lib/config';

export interface IngestionUnit {
  unitId: string;
  sourceFile: string;
  sourceType: 'image' | 'video';
  timestampSec?: number;
  filePath: string;
  width: number;
  height: number;
}

export interface JobManifest {
  jobId: string;
  sourceLabel: string;
  createdAt: string;
  totalUnits: number;
  units: IngestionUnit[];
}

export class ManifestGenerator {
  /**
   * Create manifest object from ingestion units.
   */
  public static create(
    jobId: string,
    sourceLabel: string,
    units: IngestionUnit[]
  ): JobManifest {
    return {
      jobId,
      sourceLabel,
      createdAt: new Date().toISOString(),
      totalUnits: units.length,
      units,
    };
  }

  /**
   * Save manifest to data/ingested/<jobId>/manifest.json.
   */
  public static save(manifest: JobManifest): string {
    const jobDir = path.join(getIngestedDir(), manifest.jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    const manifestPath = path.join(jobDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    return manifestPath;
  }

  /**
   * Read manifest from disk.
   */
  public static load(jobId: string): JobManifest {
    const manifestPath = path.join(getIngestedDir(), jobId, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest not found for job: ${jobId}`);
    }
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as JobManifest;
  }
}
