import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { JobQueue } from '../jobs/jobQueue';
import { JobRepository } from '../storage/jobRepository';
import { IngestionInputFile } from '../ingestion/ingestionPipeline';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });

/**
 * POST /api/jobs
 * Submit files or demo dataset files to start a triage job.
 * Returns 202 Accepted with jobId and status: "queued".
 */
router.post('/jobs', upload.array('files', 50), async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sourceLabel = (req.body.sourceLabel as string) || 'User Upload';
    const inputFiles: IngestionInputFile[] = [];

    // Case 1: Uploaded via multipart form-data
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      for (const file of req.files) {
        inputFiles.push({
          originalName: file.originalname,
          buffer: file.buffer,
        });
      }
    }
    // Case 2: Demo dataset paths passed via JSON body
    else if (req.body.demoDataset) {
      const rootDir = path.resolve(__dirname, '../../../');
      const demoType = req.body.demoDataset; // e.g. 'sard', 'uav_sar', 'eval_mix'
      let demoDir = path.join(rootDir, 'data/raw/sard');

      if (demoType === 'uav_sar') demoDir = path.join(rootDir, 'data/raw/uav_sar');
      else if (demoType === 'negative') demoDir = path.join(rootDir, 'data/raw/negative_controls');

      if (fs.existsSync(demoDir)) {
        const files = fs.readdirSync(demoDir).slice(0, 10);
        for (const fname of files) {
          const fpath = path.join(demoDir, fname);
          if (fs.statSync(fpath).isFile()) {
            inputFiles.push({
              originalName: fname,
              buffer: fs.readFileSync(fpath),
            });
          }
        }
      }
    }

    if (inputFiles.length === 0) {
      res.status(400).json({ error: 'No files provided. Please upload files or select a demo dataset.' });
      return;
    }

    // Enqueue async job
    JobQueue.enqueueJob(jobId, sourceLabel, inputFiles);

    res.status(202).json({
      jobId,
      status: 'queued',
      message: 'Job successfully queued for background triage.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to enqueue job' });
  }
});

/**
 * GET /api/jobs/:jobId
 * Get live job status and progress counters.
 */
router.get('/jobs/:jobId', (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = JobRepository.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: `Job not found: ${jobId}` });
    return;
  }

  res.json({
    jobId: job.id,
    status: job.status,
    progress: {
      total: job.totalUnits,
      processed: job.processedUnits,
    },
    currentStage: job.currentStage,
    completedAt: job.completedAt,
    errorMessage: job.errorMessage,
  });
});

/**
 * GET /api/jobs/:jobId/queue
 * Get final or live prioritized candidate queue for a job.
 */
router.get('/jobs/:jobId/queue', (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = JobRepository.getJob(jobId);

  if (!job) {
    res.status(404).json({ error: `Job not found: ${jobId}` });
    return;
  }

  const queue = JobRepository.getQueue(jobId);

  res.json({
    jobId: job.id,
    status: job.status,
    total: queue.length,
    rankedItems: queue.map((item) => ({
      candidateId: item.candidateId,
      priorityRank: item.priorityRank,
      confidenceLabel: item.confidenceLabel,
      reasoningSummary: item.reasoningSummary,
      thumbnailUrl: item.thumbnailUrl,
      sourceFile: item.sourceFile,
      sourceType: item.sourceType,
      timestampSec: item.timestampSec,
      evidenceIds: item.evidenceIds,
      matchedPrompts: item.matchedPrompts,
      boxesCount: item.boxesCount,
      dampened: item.dampened,
    })),
  });
});

export default router;
