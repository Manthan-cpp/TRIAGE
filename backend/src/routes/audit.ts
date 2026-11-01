import { Router, Request, Response } from 'express';
import { AuditRepository } from '../storage/auditRepository';

const router = Router();

/**
 * GET /api/jobs/:jobId/audit
 * Get full audit trail and evidence chain of custody for a job.
 */
router.get('/jobs/:jobId/audit', (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const events = AuditRepository.getJobAuditLogs(jobId);
  res.json({
    jobId,
    totalEvents: events.length,
    events,
  });
});

/**
 * GET /api/audit
 * Get recent system-wide audit events.
 */
router.get('/audit', (req: Request, res: Response): void => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const events = AuditRepository.getRecentAuditLogs(limit);
  res.json({
    totalEvents: events.length,
    events,
  });
});

/**
 * GET /api/jobs/:jobId/decisions
 * Get all reviewer decisions for a job.
 */
router.get('/jobs/:jobId/decisions', (req: Request, res: Response): void => {
  const jobId = Array.isArray(req.params.jobId) ? req.params.jobId[0] : req.params.jobId;
  const decisions = AuditRepository.getReviewDecisions(jobId);
  res.json({
    jobId,
    decisions,
  });
});

/**
 * POST /api/candidates/:candidateId/decision
 * Record a human reviewer decision and log it in the audit trail.
 */
router.post('/candidates/:candidateId/decision', (req: Request, res: Response): void => {
  const candidateId = Array.isArray(req.params.candidateId)
    ? req.params.candidateId[0]
    : req.params.candidateId;
  const { jobId, decision, notes } = req.body;

  if (!decision || (decision !== 'verified' && decision !== 'false_alarm')) {
    res.status(400).json({ error: 'Valid decision ("verified" | "false_alarm") is required' });
    return;
  }

  if (!jobId) {
    res.status(400).json({ error: 'jobId is required' });
    return;
  }

  AuditRepository.saveReviewDecision(candidateId, jobId, decision, notes);
  res.json({
    success: true,
    candidateId,
    decision,
    notes,
    timestamp: new Date().toISOString(),
  });
});

export default router;
