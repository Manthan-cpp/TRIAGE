import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { getJpegQuality, getMaxImageDimension, getVideoFps } from '../lib/config';

const execFileAsync = promisify(execFile);

export interface NormalizedFrame {
  frameId: string;
  filePath: string;
  timestampSec?: number;
  width: number;
  height: number;
}

export class FrameSampler {
  /**
   * Normalize a single image:
   * 1. Scale down to MAX_DIMENSION if larger (maintains aspect ratio).
   * 2. Re-encode to JPEG 85% quality to minimize payload latency.
   */
  public static async normalizeImage(
    inputPath: string,
    outputDir: string,
    frameId: string
  ): Promise<NormalizedFrame> {
    const outputPath = path.join(outputDir, `${frameId}.jpg`);

    const image = sharp(inputPath);

    const transformed = await image
      .rotate() // auto-orient based on EXIF before resizing
      .resize(getMaxImageDimension(), getMaxImageDimension(), {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: getJpegQuality() })
      .toFile(outputPath);

    return {
      frameId,
      filePath: outputPath,
      width: transformed.width,
      height: transformed.height,
    };
  }

  /**
   * Extract frames from a video clip at specified FPS (default 1 frame per second).
   * Uses ffmpeg to sample frames and scales them to MAX_DIMENSION JPEG directly.
   */
  public static async sampleVideo(
    videoPath: string,
    outputDir: string,
    fps = getVideoFps()
  ): Promise<NormalizedFrame[]> {
    const tempPattern = path.join(outputDir, 'temp_frame_%04d.jpg');

    // Run ffmpeg with scale filter to max 800px and specified fps
    const scaleFilter = `fps=${fps},scale='min(${getMaxImageDimension()},iw)':-1:flags=lanczos`;
    const args = [
      '-y',
      '-i', videoPath,
      '-vf', scaleFilter,
      '-q:v', '3', // High quality JPEG
      tempPattern,
    ];

    try {
      await execFileAsync('ffmpeg', args);
    } catch (err: any) {
      throw new Error(`FFmpeg frame extraction failed for ${videoPath}: ${err.message}`);
    }

    // Read extracted frames and assemble NormalizedFrame array
    const files = fs.readdirSync(outputDir)
      .filter((f) => f.startsWith('temp_frame_') && f.endsWith('.jpg'))
      .sort();

    const normalizedFrames: NormalizedFrame[] = [];

    for (let i = 0; i < files.length; i++) {
      const oldName = files[i];
      const oldPath = path.join(outputDir, oldName);
      const timestampSec = Math.round((i / fps) * 100) / 100;
      const finalId = `frame_${String(i + 1).padStart(4, '0')}_t${timestampSec}s`;
      const finalPath = path.join(outputDir, `${finalId}.jpg`);

      fs.renameSync(oldPath, finalPath);

      const meta = await sharp(finalPath).metadata();
      normalizedFrames.push({
        frameId: finalId,
        filePath: finalPath,
        timestampSec,
        width: meta.width || 0,
        height: meta.height || 0,
      });
    }

    return normalizedFrames;
  }
}
