import { Router, Request, Response } from 'express';
import { CandidateRepository } from '../storage/candidateRepository';

const router = Router();

/**
 * GET /api/candidates/:candidateId
 * Retrieve full candidate inspection details including bounding boxes,
 * mask coordinates, source metadata, and dampening notes.
 */
router.get('/candidates/:candidateId', (req: Request, res: Response): void => {
  const candidateId = Array.isArray(req.params.candidateId)
    ? req.params.candidateId[0]
    : req.params.candidateId;
  const candidate = CandidateRepository.getCandidate(candidateId);

  if (!candidate) {
    res.status(404).json({ error: `Candidate not found: ${candidateId}` });
    return;
  }

  // Format response per candidate contract
  res.json({
    candidateId: candidate.candidateId,
    jobId: candidate.jobId,
    sourceFrameUrl: `/api/media/${candidate.filePath.replace(/\\/g, '/')}`,
    maskOverlayData: {
      boxes: candidate.boxes,
      totalBoxes: candidate.totalBoxes,
      matchedPrompts: candidate.matchedPrompts,
      rawResults: candidate.rawResults,
    },
    fullReasoningText: candidate.fullReasoningText || undefined,
    evidenceIds: candidate.evidenceIds || candidate.matchedPrompts,
    priorityRank: candidate.priorityRank,
    confidenceLabel: candidate.confidenceLabel,
    sourceMetadata: {
      clipId: candidate.sourceFile,
      sourceType: candidate.sourceType,
      timestampSec: candidate.timestampSec,
      unitId: candidate.unitId,
      datasetLabel: candidate.sourceFile.split('_')[0] || '',
    },
    dampening: {
      isDampened: candidate.isDampened,
      reason: candidate.dampeningReason,
      dampeningScore: candidate.dampeningScore,
    },
    hasCorroboratingSignals: candidate.hasCorroboration,
    createdAt: candidate.createdAt,
  });
});

export default router;
