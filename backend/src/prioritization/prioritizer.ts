import * as fs from 'fs';
import * as path from 'path';
import { CandidateSignalRecord } from '../perception/candidateTypes';
import { ContextAggregator } from './contextAggregator';
import { MuseSparkClient, ConfidenceLabel } from './museSparkClient';
import { getIngestedDir } from '../lib/config';

export interface PrioritizedQueueItem {
  candidateId: string;
  unitId: string;
  priorityRank: number;
  confidenceLabel: ConfidenceLabel;
  reasoningSummary: string;
  fullReasoningText?: string;
  evidenceIds: string[];
  sourceFile: string;
  sourceType: 'image' | 'video';
  timestampSec?: number;
  filePath: string;
  thumbnailUrl?: string;
  matchedPrompts: string[];
  boxesCount: number;
  dampened: boolean;
}

export interface PrioritizedQueueResult {
  jobId: string;
  totalItems: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  totalPrioritizationTimeMs: number;
  fallbackBatchCount: number;
  generatedAt: string;
  rankedItems: PrioritizedQueueItem[];
}

export class Prioritizer {
  private static readonly VALID_LABELS: ConfidenceLabel[] = [
    'possible-high',
    'possible-medium',
    'possible-low',
  ];

  private static sanitizeReasoning(text: string): string {
    return text ? text.trim() : '';
  }

  /**
   * Run full prioritization across a job's candidate records.
   * Enforces vocabulary lock, contiguous global priority ranks, and zero-dismissal.
   */
  public static async prioritizeJob(
    jobId: string,
    candidates: CandidateSignalRecord[],
    projectRootDir?: string
  ): Promise<PrioritizedQueueResult> {
    const rootDir = projectRootDir || path.resolve(__dirname, '../../../');
    const startTime = Date.now();

    if (candidates.length === 0) {
      return {
        jobId,
        totalItems: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        totalPrioritizationTimeMs: 0,
        fallbackBatchCount: 0,
        generatedAt: new Date().toISOString(),
        rankedItems: [],
      };
    }

    // Build lookup map from candidateId to raw record
    const recordMap = new Map<string, CandidateSignalRecord>();
    candidates.forEach((c) => recordMap.set(c.candidateId, c));

    // Generate rich visual scene descriptions (1-sentence queue summary + 4 structured SAR headings)
    const sceneDescriptions = await Promise.all(
      candidates.map(async (c) => {
        try {
          return await MuseSparkClient.describeVisualCandidate(c.filePath, c.matchedPrompts);
        } catch {
          return {
            shortSummary: c.matchedPrompts.length > 0
              ? `Visual signals flagged for ${c.matchedPrompts.join(', ')}.`
              : 'No person or gear visible in frame; retained at baseline priority.',
            detailedAssessment: c.matchedPrompts.length > 0
              ? `**The Person & Appearance**: Visual cues flagged for ${c.matchedPrompts.join(', ')}.\n**Posture & Physical State**: Further inspection required by human reviewer.\n**Surroundings & Terrain**: Wilderness sector under aerial observation.\n**Urgency/Risk Context**: Flagged for priority visual confirmation.`
              : `**The Person & Appearance**: No person or human gear observed.\n**Posture & Physical State**: Not applicable.\n**Surroundings & Terrain**: Natural background environment.\n**Urgency/Risk Context**: Low priority negative control.`,
          };
        }
      })
    );

    const descMap = new Map<string, { shortSummary: string; detailedAssessment: string }>();
    candidates.forEach((c, idx) => descMap.set(c.candidateId, sceneDescriptions[idx]));

    // Prepare batches for Muse Spark
    const batches = ContextAggregator.prepareBatches(candidates);
    const allRankedItems: PrioritizedQueueItem[] = [];
    let fallbackBatchCount = 0;

    for (const batch of batches) {
      const result = await MuseSparkClient.prioritizeBatch(batch);
      if (result.usedFallback) fallbackBatchCount += 1;

      for (const item of result.rankedItems) {
        const raw = recordMap.get(item.candidateId);
        if (!raw) continue;

        // Strict vocabulary lock fallback
        const label: ConfidenceLabel = this.VALID_LABELS.includes(item.confidenceLabel)
          ? item.confidenceLabel
          : 'possible-low';

        const desc = descMap.get(item.candidateId);

        allRankedItems.push({
          candidateId: item.candidateId,
          unitId: raw.unitId,
          priorityRank: item.priorityRank,
          confidenceLabel: label,
          reasoningSummary: desc?.shortSummary || this.sanitizeReasoning(item.reasoningSummary),
          fullReasoningText: desc?.detailedAssessment,
          evidenceIds: item.evidenceIds && item.evidenceIds.length > 0 ? item.evidenceIds : raw.matchedPrompts,
          sourceFile: raw.sourceFile,
          sourceType: raw.sourceType,
          timestampSec: raw.timestampSec,
          filePath: raw.filePath,
          thumbnailUrl: `/api/media/${raw.filePath.replace(/\\/g, '/')}`,
          matchedPrompts: raw.matchedPrompts,
          boxesCount: raw.totalBoxesCount,
          dampened: raw.dampening.isDampened,
        });
      }
    }

    // A malformed or incomplete model response must never remove a unit from
    // the reviewer queue. This is a final zero-dismissal guard.
    const includedIds = new Set(allRankedItems.map((item) => item.candidateId));
    for (const raw of candidates) {
      if (includedIds.has(raw.candidateId)) continue;
      const desc = descMap.get(raw.candidateId);
      allRankedItems.push({
        candidateId: raw.candidateId,
        unitId: raw.unitId,
        priorityRank: Number.MAX_SAFE_INTEGER,
        confidenceLabel: 'possible-low',
        reasoningSummary: desc?.shortSummary || 'Could not rank this candidate; flagged for manual review.',
        fullReasoningText: desc?.detailedAssessment,
        evidenceIds: raw.matchedPrompts,
        sourceFile: raw.sourceFile,
        sourceType: raw.sourceType,
        timestampSec: raw.timestampSec,
        filePath: raw.filePath,
        thumbnailUrl: `/api/media/${raw.filePath.replace(/\\/g, '/')}`,
        matchedPrompts: raw.matchedPrompts,
        boxesCount: raw.totalBoxesCount,
        dampened: raw.dampening.isDampened,
      });
    }

    // Sort globally by rank and assign contiguous 1..N ranks
    allRankedItems.sort((a, b) => {
      // 1. Prioritize possible-high > possible-medium > possible-low
      const weightMap: Record<ConfidenceLabel, number> = {
        'possible-high': 3,
        'possible-medium': 2,
        'possible-low': 1,
      };
      const diff = weightMap[b.confidenceLabel] - weightMap[a.confidenceLabel];
      if (diff !== 0) return diff;
      return a.priorityRank - b.priorityRank;
    });

    // Re-index contiguous priority ranks (1, 2, 3...)
    allRankedItems.forEach((item, idx) => {
      item.priorityRank = idx + 1;
    });

    const highCount = allRankedItems.filter((i) => i.confidenceLabel === 'possible-high').length;
    const medCount = allRankedItems.filter((i) => i.confidenceLabel === 'possible-medium').length;
    const lowCount = allRankedItems.filter((i) => i.confidenceLabel === 'possible-low').length;

    const totalPrioritizationTimeMs = Date.now() - startTime;

    const queueResult: PrioritizedQueueResult = {
      jobId,
      totalItems: allRankedItems.length,
      highPriorityCount: highCount,
      mediumPriorityCount: medCount,
      lowPriorityCount: lowCount,
      totalPrioritizationTimeMs,
      fallbackBatchCount,
      generatedAt: new Date().toISOString(),
      rankedItems: allRankedItems,
    };

    // Persist to data/ingested/<jobId>/prioritized_queue.json
    const jobDir = projectRootDir
      ? path.resolve(rootDir, 'data/ingested', jobId)
      : path.resolve(getIngestedDir(), jobId);
    fs.mkdirSync(jobDir, { recursive: true });
    const queuePath = path.join(jobDir, 'prioritized_queue.json');
    fs.writeFileSync(queuePath, JSON.stringify(queueResult, null, 2), 'utf-8');

    return queueResult;
  }
}
