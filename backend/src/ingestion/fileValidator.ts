import * as path from 'path';

export interface ValidationResult {
  isValid: boolean;
  fileType: 'image' | 'video' | 'unknown';
  error?: string;
}

const SUPPORTED_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const SUPPORTED_VIDEO_EXTS = new Set(['.mp4', '.mov', '.avi', '.mkv']);

const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
const MAX_VIDEO_SIZE_BYTES = 150 * 1024 * 1024; // 150 MB

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
      if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
        return {
          isValid: false,
          fileType: 'image',
          error: `Image size ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds max limit of 25MB.`,
        };
      }
      return { isValid: true, fileType: 'image' };
    }

    if (SUPPORTED_VIDEO_EXTS.has(ext)) {
      if (sizeBytes > MAX_VIDEO_SIZE_BYTES) {
        return {
          isValid: false,
          fileType: 'video',
          error: `Video size ${Math.round(sizeBytes / 1024 / 1024)}MB exceeds max limit of 150MB.`,
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
