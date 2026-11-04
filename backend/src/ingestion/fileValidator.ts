import * as path from 'path';
import { getPositiveUploadLimitBytes } from '../lib/config';

export interface ValidationResult {
  isValid: boolean;
  fileType: 'image' | 'video' | 'unknown';
  error?: string;
}

const SUPPORTED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const SUPPORTED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv']);

export class FileValidator {
  /**
   * Validate file extension and size.
   */
  public static validate(fileName: string, sizeBytes: number): ValidationResult {
    if (sizeBytes <= 0) {
      return { isValid: false, fileType: 'unknown', error: 'File is empty (0 bytes).' };
    }

    const ext = path.extname(fileName).toLowerCase();

    if (SUPPORTED_IMAGE_EXTS.has(ext)) {
      const maxImageSize = getPositiveUploadLimitBytes('MAX_IMAGE_SIZE_MB', 25, 1, 1024);
      if (sizeBytes > maxImageSize) {
        return {
          isValid: false,
          fileType: 'image',
           error: `Image size ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds max limit of ${maxImageSize / 1024 / 1024}MB.`,
        };
      }
      return { isValid: true, fileType: 'image' };
    }

    if (SUPPORTED_VIDEO_EXTS.has(ext)) {
      const maxVideoSize = getPositiveUploadLimitBytes('MAX_VIDEO_SIZE_MB', 150, 1, 4096);
      if (sizeBytes > maxVideoSize) {
        return {
          isValid: false,
          fileType: 'video',
          error: `Video size ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds max limit of ${maxVideoSize / 1024 / 1024}MB.`,
        };
      }
      return { isValid: true, fileType: 'video' };
    }

    return {
      isValid: false,
      fileType: 'unknown',
      error: `Unsupported file extension "${ext}". Allowed images: .jpg, .jpeg, .png, .webp. Allowed videos: .mp4, .mov, .avi, .mkv.`,
    };
  }
}
