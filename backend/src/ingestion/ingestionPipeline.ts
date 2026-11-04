import * as path from 'path';
import { FileValidator } from './fileValidator';
import { IngestionStorage } from './storage';
import { FrameSampler } from './frameSampler';
import { ManifestGenerator, IngestionUnit, JobManifest } from './manifestGenerator';
import { PROJECT_ROOT, getVideoFps } from '../lib/config';

export interface IngestionInputFile {
  originalName: string;
  buffer: Buffer;
}

export class IngestionPipeline {
  /**
   * Process a set of raw uploaded files into normalized units and generate a batch manifest.
   */
  public static async processJob(
    jobId: string,
    sourceLabel: string,
    files: IngestionInputFile[],
    videoFps = getVideoFps()
  ): Promise<JobManifest> {
    if (!files || files.length === 0) {
      throw new Error(`Ingestion failed: No files provided for job ${jobId}`);
    }

    const { normalizedDir } = IngestionStorage.initJobDir(jobId);
    const units: IngestionUnit[] = [];
    const savedRawFileNames: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = FileValidator.validate(file.originalName, file.buffer.length);

      if (!validation.isValid) {
        throw new Error(`Invalid file "${file.originalName}": ${validation.error}`);
      }

      const rawPath = IngestionStorage.saveRawFile(jobId, file.originalName, file.buffer);
      const storedFileName = path.basename(rawPath);
      savedRawFileNames.push(storedFileName);

      if (validation.fileType === 'image') {
        const unitId = `unit_${String(units.length + 1).padStart(4, '0')}`;
        const normalized = await FrameSampler.normalizeImage(rawPath, normalizedDir, unitId);

        units.push({
          unitId,
            sourceFile: storedFileName,
          sourceType: 'image',
          filePath: path.relative(PROJECT_ROOT, normalized.filePath).replace(/\\/g, '/'),
          width: normalized.width,
          height: normalized.height,
        });
      } else if (validation.fileType === 'video') {
        const frames = await FrameSampler.sampleVideo(rawPath, normalizedDir, videoFps);

        for (const frame of frames) {
          const unitId = `unit_${String(units.length + 1).padStart(4, '0')}`;
          units.push({
            unitId,
           sourceFile: storedFileName,
            sourceType: 'video',
            timestampSec: frame.timestampSec,
            filePath: path.relative(PROJECT_ROOT, frame.filePath).replace(/\\/g, '/'),
            width: frame.width,
            height: frame.height,
          });
        }
      }
    }

    if (units.length === 0) {
      throw new Error(`Ingestion failed: No valid image or video frames could be extracted for job ${jobId}`);
    }

    // Persist metadata and manifest
    IngestionStorage.saveJobMeta({
      jobId,
      sourceLabel,
      createdAt: new Date().toISOString(),
      rawFiles: savedRawFileNames,
    });

    const manifest = ManifestGenerator.create(jobId, sourceLabel, units);
    ManifestGenerator.save(manifest);

    return manifest;
  }
}
