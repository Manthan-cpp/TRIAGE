import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import { getBenchmarksPath, getDataDir, getJpegQuality, getMaxImageDimension, getMuseEndpoint, getMuseModel, getPerceptionConcurrency, getRankingBatchSize, getSamEndpoint, getSamModel, getVideoFps } from '../lib/config';
import { getActivePromptStrings } from '../perception/prompts';
import { resetAllData } from '../scripts/resetData';

const router = Router();
const startedAt = new Date().toISOString();

router.post('/system/reset', (_req: Request, res: Response): void => {
  try {
    const result = resetAllData();
    res.json({
      success: true,
      message: 'Workspace completely reset. All jobs, queue items, clips, and decisions cleared.',
      ...result,
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to reset workspace',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get('/system', (_req: Request, res: Response): void => {
  res.json({
    startedAt,
    environment: process.env.NODE_ENV || 'development',
    models: {
      sam: { id: getSamModel(), endpoint: getSamEndpoint() },
      muse: { id: getMuseModel(), endpoint: getMuseEndpoint() },
    },
    prompts: getActivePromptStrings(),
    pipeline: {
      videoFps: getVideoFps(),
      maxImageDimension: getMaxImageDimension(),
      jpegQuality: getJpegQuality(),
      perceptionConcurrency: getPerceptionConcurrency(),
      rankingBatchSize: getRankingBatchSize(),
    },
    storage: {
      dataDirConfigured: Boolean(process.env.DATA_DIR),
      databasePathConfigured: Boolean(process.env.DATABASE_PATH),
      mode: 'local filesystem',
    },
  });
});

router.get('/benchmarks', (_req: Request, res: Response): void => {
  const benchmarkPath = getBenchmarksPath();
  if (!fs.existsSync(benchmarkPath)) {
    res.status(503).json({ error: `Benchmark record is unavailable at ${getDataDir()}.` });
    return;
  }
  try {
    res.json(JSON.parse(fs.readFileSync(benchmarkPath, 'utf8')));
  } catch {
    res.status(503).json({ error: 'Benchmark record could not be read.' });
  }
});

export default router;
