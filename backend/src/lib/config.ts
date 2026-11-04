import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

export const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// Load local configuration for scripts as well as the service entry point. Existing
// environment variables always win, which keeps hosted configuration authoritative.
dotenv.config({ path: path.join(PROJECT_ROOT, 'backend', '.env') });
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

function resolveFromProject(value: string): string {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(PROJECT_ROOT, value);
}

export function getDataDir(): string {
  return resolveFromProject(process.env.DATA_DIR?.trim() || 'data');
}

export function getIngestedDir(): string {
  return path.join(getDataDir(), 'ingested');
}

export function getDatabasePath(): string {
  return resolveFromProject(process.env.DATABASE_PATH?.trim() || path.join('data', 'triage.db'));
}

export function getCostLogPath(): string {
  return path.join(getDataDir(), 'cost_log.json');
}

export function getBenchmarksPath(): string {
  return path.join(getDataDir(), 'benchmarks.json');
}

export function getSamModel(): string {
  return process.env.SAM_MODEL?.trim() || 'sam-3.1';
}

export function getMuseModel(): string {
  return process.env.MUSE_MODEL?.trim() || 'muse-spark-1.3';
}

export function getSamEndpoint(): string {
  return process.env.SAM_ENDPOINT?.trim() || '/responses';
}

export function getMuseEndpoint(): string {
  return process.env.MUSE_ENDPOINT?.trim() || '/chat/completions';
}

export function getVideoFps(): number {
  return getPositiveNumber('VIDEO_FPS', 2, 0.1, 10);
}

export function getMaxImageDimension(): number {
  return getPositiveNumber('MAX_IMAGE_DIMENSION', 1280, 320, 4096);
}

export function getJpegQuality(): number {
  return getPositiveNumber('JPEG_QUALITY', 85, 40, 100);
}

export function getPerceptionConcurrency(): number {
  return getPositiveInteger('PERCEPTION_CONCURRENCY', 3, 1, 32);
}

export function getRankingBatchSize(): number {
  return getPositiveInteger('RANKING_BATCH_SIZE', 10, 1, 100);
}

export function getMetaRequestTimeoutMs(): number {
  return getPositiveNumber('META_REQUEST_TIMEOUT_MS', 45000, 1000, 300000);
}

export function getMetaMaxRetries(): number {
  return getPositiveNumber('META_MAX_RETRIES', 2, 0, 5);
}

export function getMaxUploadFiles(): number {
  return getPositiveInteger('MAX_UPLOAD_FILES', 50, 1, 500);
}

export function getMaxCombinedUploadBytes(): number {
  return getPositiveUploadLimitBytes('MAX_COMBINED_UPLOAD_MB', 500, 1, 8192);
}

export function getMaxRequestFieldBytes(): number {
  return getPositiveUploadLimitBytes('MAX_REQUEST_FIELD_MB', 1, 1, 16);
}

export function getEstimatedModelRate(model: 'sam' | 'muse'): number {
  const envName = model === 'sam' ? 'SAM_ESTIMATED_COST_USD' : 'MUSE_ESTIMATED_COST_USD';
  return getPositiveNumber(envName, model === 'sam' ? 0.005 : 0.002, 0, 100);
}

export function getPositiveUploadLimitBytes(name: string, fallbackMb: number, minMb: number, maxMb: number): number {
  return getPositiveNumber(name, fallbackMb, minMb, maxMb) * 1024 * 1024;
}

function getPositiveInteger(name: string, fallback: number, min: number, max: number): number {
  const value = getPositiveNumber(name, fallback, min, max);
  if (!Number.isInteger(value)) throw new Error(`Invalid ${name}. Expected a whole number.`);
  return value;
}

function getPositiveNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Invalid ${name} "${raw}". Expected a number from ${min} to ${max}.`);
  }
  return value;
}

export function getMetaApiBaseUrl(): string {
  const value = process.env.META_MODEL_API_BASE_URL?.trim();
  if (!value) {
    throw new Error('Missing META_MODEL_API_BASE_URL in environment. Check .env.example.');
  }
  return value.replace(/\/+$/, '');
}

export function getPort(): number {
  const raw = process.env.PORT?.trim();
  if (!raw) return 4000;

  const port = Number.parseInt(raw, 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT "${raw}". Expected an integer between 1 and 65535.`);
  }
  return port;
}

export function isPathInside(parentDir: string, candidatePath: string): boolean {
  const parent = path.resolve(parentDir);
  const candidate = path.resolve(candidatePath);
  const relative = path.relative(parent, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function resolveInside(parentDir: string, relativePath: string): string | null {
  const candidate = path.resolve(parentDir, relativePath);
  return isPathInside(parentDir, candidate) ? candidate : null;
}

export function ensureDirectory(dir: string): void {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
