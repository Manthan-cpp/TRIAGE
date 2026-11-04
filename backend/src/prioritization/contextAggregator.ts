import { CandidateSignalRecord } from '../perception/candidateTypes';
import { CandidateToRank } from './museSparkClient';
import { getRankingBatchSize } from '../lib/config';

export interface EnrichedCandidateToRank extends CandidateToRank {
  timestampSec?: number;
  dampened: boolean;
  dampenReason?: string;
  isCorroborated: boolean;
  maxBoxAreaFraction: number;
}

export class ContextAggregator {
  /**
   * Translate raw CandidateSignalRecords from Phase 4 into concise, comparative
   * summaries tailored for Muse Spark's reasoning context.
   */
  public static summarizeCandidate(record: CandidateSignalRecord): EnrichedCandidateToRank {
    let maxArea = 0;
    for (const b of record.boxes) {
      const w = b.width || Math.abs(b.x2 - b.x1);
      const h = b.height || Math.abs(b.y2 - b.y1);
      if (w * h > maxArea) maxArea = w * h;
    }
    // SAM returns coordinates normalized to a 1000x1000 frame.
    const maxBoxAreaFraction = Math.round((maxArea / (1000 * 1000)) * 1000) / 1000;

    let summary = '';
    if (record.totalBoxesCount === 0) {
      summary = 'Empty background; no visual candidate signals flagged.';
    } else if (record.hasCorroboratingSignals) {
      summary = `High-salience multi-prompt alignment (${record.matchedPrompts.join(' + ')}) with ${record.totalBoxesCount} candidate boxes. Max box covers ${(maxBoxAreaFraction * 100).toFixed(1)}% of frame.`;
    } else if (record.dampening.isDampened) {
      summary = `Weak/isolated signal (${record.matchedPrompts.join(', ')}). Dampened: ${record.dampening.reason}`;
    } else {
      summary = `Moderate signal for prompt "${record.matchedPrompts.join(', ')}" with ${record.totalBoxesCount} box(es). Covers ${(maxBoxAreaFraction * 100).toFixed(1)}% of frame.`;
    }

    return {
      candidateId: record.candidateId,
      sourceClipId: record.sourceFile,
      timestampSec: record.timestampSec,
      detectionSummary: summary,
      detectedBoxesCount: record.totalBoxesCount,
      promptsMatched: record.matchedPrompts,
      evidenceIds: [record.candidateId, ...record.matchedPrompts.map((prompt) => `${record.candidateId}:${prompt}`)],
      dampened: record.dampening.isDampened,
      dampenReason: record.dampening.reason,
      isCorroborated: record.hasCorroboratingSignals,
      maxBoxAreaFraction,
    };
  }

  /**
   * Group and summarize a list of candidate records.
   * Chunks large batches into sizes of maxBatchSize (default 10) to optimize
   * comparative reasoning without blowing up prompt payload size.
   */
  public static prepareBatches(
    records: CandidateSignalRecord[],
    maxBatchSize = getRankingBatchSize()
  ): EnrichedCandidateToRank[][] {
    const summarized = records.map((r) => this.summarizeCandidate(r));
    const batches: EnrichedCandidateToRank[][] = [];

    for (let i = 0; i < summarized.length; i += maxBatchSize) {
      batches.push(summarized.slice(i, i + maxBatchSize));
    }

    return batches;
  }
}
