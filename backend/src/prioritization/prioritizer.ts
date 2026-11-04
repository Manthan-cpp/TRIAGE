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
    return text
      .replace(/\bdetected\b/gi, 'flagged')
      .replace(/\bdetecting\b/gi, 'flagging')
      .replace(/\bdetects\b/gi, 'flags')
      .replace(/\bdetect\b/gi, 'flag')
      .replace(/\bdetections?\b/gi, 'candidate signal')
      .replace(/\bsurvivor(s)? found\b/gi, 'candidate identified')
      .replace(/\bsurvivor(s)? located\b/gi, 'candidate identified')
      .replace(/\bvictim(s)? located\b/gi, 'candidate identified')
      .replace(/\bhuman confirmed\b/gi, 'visual alignment')
      .replace(/\bguaranteed\b/gi, 'possible')
      .replace(/\bfound\b/gi, 'observed')
      .replace(/\blocated\b/gi, 'observed')
      .replace(/\bpositive id\b/gi, 'visual alignment')
      .replace(/\bconfirmed\b/gi, 'observed')
      .replace(/\bconfirming\b/gi, 'observing')
      .replace(/\bconfirms\b/gi, 'supports')
      .replace(/\bconfirm\b/gi, 'observe');
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

        allRankedItems.push({
          candidateId: item.candidateId,
          unitId: raw.unitId,
          priorityRank: item.priorityRank,
          confidenceLabel: label,
          reasoningSummary: this.sanitizeReasoning(item.reasoningSummary),
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
      allRankedItems.push({
        candidateId: raw.candidateId,
        unitId: raw.unitId,
        priorityRank: Number.MAX_SAFE_INTEGER,
        confidenceLabel: 'possible-low',
        reasoningSummary: 'Could not rank this candidate; flagged for manual review.',
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
