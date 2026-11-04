import { Router, Request, Response } from 'express';
import { AuditRepository } from '../storage/auditRepository';
import { JobRepository } from '../storage/jobRepository';
import { CandidateRepository } from '../storage/candidateRepository';

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
  const requestedLimit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 100;
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 500) : 100;
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

  const job = JobRepository.getJob(jobId);
  const candidate = CandidateRepository.getCandidate(candidateId);
  if (!job || !candidate || candidate.jobId !== jobId) {
    res.status(404).json({ error: 'Candidate and job must refer to the same stored item.' });
    return;
  }

  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 2000)) {
    res.status(400).json({ error: 'notes must be text no longer than 2000 characters.' });
    return;
  }

  AuditRepository.saveReviewDecision(candidateId, jobId, decision, typeof notes === 'string' ? notes.trim() : undefined);
  res.json({
    success: true,
    candidateId,
    decision,
    notes,
    timestamp: new Date().toISOString(),
  });
});

export default router;
