import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { JobQueue } from '../jobs/jobQueue';
import { JobRepository } from '../storage/jobRepository';
import { AuditRepository } from '../storage/auditRepository';
import { IngestionInputFile } from '../ingestion/ingestionPipeline';
import { FileValidator } from '../ingestion/fileValidator';
import { getDataDir, getMaxCombinedUploadBytes, getMaxRequestFieldBytes, getMaxUploadFiles, getPositiveUploadLimitBytes, isPathInside, PROJECT_ROOT, resolveInside } from '../lib/config';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getPositiveUploadLimitBytes('MAX_UPLOAD_FILE_MB', 150, 1, 4096), files: getMaxUploadFiles(), fieldSize: getMaxRequestFieldBytes() },
});

/**
 * POST /api/jobs
 * Submit files or demo dataset files to start a triage job.
 * Returns 202 Accepted with jobId and status: "queued".
 */
router.post('/jobs', upload.array('files', 50), async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const sourceLabel = typeof req.body.sourceLabel === 'string' && req.body.sourceLabel.trim()
      ? req.body.sourceLabel.trim().slice(0, 200)
      : '';
    const inputFiles: IngestionInputFile[] = [];

    // Case 1: Uploaded via multipart form-data
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const totalBytes = req.files.reduce((sum, file) => sum + file.size, 0);
      if (totalBytes > getMaxCombinedUploadBytes()) {
        res.status(413).json({ error: `The combined upload size cannot exceed ${getMaxCombinedUploadBytes() / 1024 / 1024}MB.` });
        return;
      }
      for (const file of req.files) {
        inputFiles.push({
          originalName: file.originalname,
          buffer: file.buffer,
        });
      }
    }
    // Case 2: Demo dataset paths passed via JSON body
    else if (req.body.demoDataset) {
      const demoType = req.body.demoDataset; // 'sard', 'uav_sar', 'negative', 'eval_mix'
      if (!['sard', 'uav_sar', 'negative', 'eval_mix'].includes(demoType)) {
        res.status(400).json({ error: 'Unknown demo dataset. Choose sard, uav_sar, negative, or eval_mix.' });
        return;
      }

      const readDemoFiles = (dir: string, limit: number) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir).filter((f) => !f.endsWith('.json')).slice(0, limit);
        for (const fname of files) {
          const fpath = path.join(dir, fname);
          if (fs.statSync(fpath).isFile()) inputFiles.push({ originalName: fname, buffer: fs.readFileSync(fpath) });
        }
      };

      if (demoType === 'eval_mix') {
        readDemoFiles(path.join(getDataDir(), 'raw/sard'), 2);
        readDemoFiles(path.join(getDataDir(), 'raw/uav_sar'), 2);
        readDemoFiles(path.join(getDataDir(), 'raw/negative_controls'), 1);
      } else {
        const sub = demoType === 'uav_sar' ? 'raw/uav_sar' : demoType === 'negative' ? 'raw/negative_controls' : 'raw/sard';
        readDemoFiles(path.join(getDataDir(), 'raw', sub.replace('raw/', '')), 10);
      }
    }
    // Case 3: Explicit units array per SYSTEM_DESIGN.md Section 4 contract
    else if (req.body.units !== undefined) {
      if (!Array.isArray(req.body.units) || req.body.units.length === 0 || req.body.units.length > getMaxUploadFiles()) {
        res.status(400).json({ error: `units must be a non-empty array with at most ${getMaxUploadFiles()} entries.` });
        return;
      }
      for (const u of req.body.units) {
        if (!u || (u.type !== 'image' && u.type !== 'video') || typeof u.fileRef !== 'string' || !u.fileRef.trim()) {
          res.status(400).json({ error: 'Each unit requires type "image" or "video" and a fileRef.' });
          return;
        }
        const resolvedPath = resolveInside(PROJECT_ROOT, u.fileRef);
        if (!resolvedPath || !isPathInside(getDataDir(), resolvedPath) || !fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
          res.status(400).json({ error: `Invalid or inaccessible unit fileRef: ${u.fileRef}` });
          return;
        }
        const realPath = fs.realpathSync(resolvedPath);
        if (!isPathInside(getDataDir(), realPath)) {
          res.status(400).json({ error: `Invalid or inaccessible unit fileRef: ${u.fileRef}` });
          return;
        }
        const validation = FileValidator.validate(path.basename(realPath), fs.statSync(realPath).size);
        if (!validation.isValid || validation.fileType !== u.type) {
          res.status(400).json({ error: `Unit type does not match a supported file: ${u.fileRef}` });
          return;
        }
        inputFiles.push({ originalName: path.basename(realPath), buffer: fs.readFileSync(realPath) });
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
 * GET /api/jobs
 * List recent jobs for the review dashboard.
 */
router.get('/jobs', (req: Request, res: Response): void => {
  const requestedLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 20;
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
  const jobs = JobRepository.listJobs(limit);
  res.json({ jobs, total: jobs.length });
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
    progress: { total: job.totalUnits, processed: job.processedUnits },
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
  const visibleQueue = queue.length > 0 ? queue : JobRepository.getPartialQueue(jobId);

  res.json({
    jobId: job.id,
    status: job.status,
    total: visibleQueue.length,
    rankedItems: visibleQueue.map((item) => ({
      candidateId: item.candidateId,
      priorityRank: item.priorityRank,
      confidenceLabel: item.confidenceLabel,
      reasoningSummary: item.reasoningSummary,
      fullReasoningText: item.fullReasoningText,
      thumbnailUrl: item.thumbnailUrl,
      sourceFile: item.sourceFile,
      sourceType: item.sourceType,
      timestampSec: item.timestampSec,
      evidenceIds: item.evidenceIds,
      matchedPrompts: item.matchedPrompts,
      boxesCount: item.boxesCount,
      dampened: item.dampened,
    })),
    clipReports: JobRepository.getClipReports(jobId),
  });
});

router.get('/jobs/:jobId/metrics', (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const job = JobRepository.getJob(jobId);
  if (!job) {
    res.status(404).json({ error: `Job not found: ${jobId}` });
    return;
  }

  const finalQueue = JobRepository.getQueue(jobId);
  const items = finalQueue.length > 0 ? finalQueue : JobRepository.getPartialQueue(jobId);
  const decisions = AuditRepository.getReviewDecisions(jobId);
  const reviewedCount = items.filter((item) => {
    const decision = decisions[item.candidateId]?.status;
    return decision === 'verified' || decision === 'false_alarm';
  }).length;
  const events = AuditRepository.getJobAuditLogs(jobId);
  const completedEvent = events.find((event) => event.eventType === 'JOB_COMPLETED');
  const completedAtMs = job.completedAt ? Date.parse(job.completedAt) : Date.now();
  const elapsedMs = Math.max(0, completedAtMs - Date.parse(job.createdAt));
  const stageDurations = events.reduce<Record<string, number>>((result, event) => {
    if (event.durationMs !== undefined) result[event.stage] = (result[event.stage] || 0) + event.durationMs;
    return result;
  }, {});

  res.json({
    jobId,
    status: job.status,
    progress: { total: job.totalUnits, processed: job.processedUnits },
    queue: {
      total: items.length,
      possibleHigh: items.filter((item) => item.confidenceLabel === 'possible-high').length,
      possibleMedium: items.filter((item) => item.confidenceLabel === 'possible-medium').length,
      possibleLow: items.filter((item) => item.confidenceLabel === 'possible-low').length,
    },
    review: { reviewed: reviewedCount, pending: Math.max(0, items.length - reviewedCount) },
    timing: { elapsedMs, completedDurationMs: completedEvent?.durationMs, stageDurations },
    audit: {
      totalEvents: events.length,
      errorEvents: events.filter((event) => event.status === 'error').length,
      warningEvents: events.filter((event) => event.status === 'warn').length,
    },
  });
});

export default router;
