import * as fs from 'fs';
import * as path from 'path';
import { CandidateSignalRecord } from '../perception/candidateTypes';
import { ContextAggregator } from './contextAggregator';
import { MuseSparkClient, ConfidenceLabel } from './museSparkClient';
import { getIngestedDir } from '../lib/config';

export function formatTimecode(sec?: number): string {
  if (sec === undefined || sec === null || isNaN(sec)) return '00:00.0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}s`;
}

export interface ClipTimelineEvent {
  timestampSec: number;
  timecode: string;
  matchedPrompts: string[];
  boxCount: number;
  candidateId: string;
}

export interface ClipDetectionReport {
  sourceFile: string;
  durationSec: number;
  totalFrames: number;
  flaggedFramesCount: number;
  timeline: ClipTimelineEvent[];
  clipSummary: string;
}

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
  clipReports?: ClipDetectionReport[];
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
   * Extracts clip detection reports, filters out empty frames,
   * selects top 1-3 representative keyframes for video sweeps,
   * and runs vision assessment with Muse Spark.
   */
  public static async prioritizeJob(
    jobId: string,
    candidates: CandidateSignalRecord[],
    projectRootDir?: string
  ): Promise<PrioritizedQueueResult> {
    const rootDir = projectRootDir || path.resolve(__dirname, '../../../');
    const startTime = Date.now();

    // 1. Group candidates by source file
    const bySource = new Map<string, CandidateSignalRecord[]>();
    for (const c of candidates) {
      const list = bySource.get(c.sourceFile) || [];
      list.push(c);
      bySource.set(c.sourceFile, list);
    }

    const clipReports: ClipDetectionReport[] = [];
    const candidatesToProcess: CandidateSignalRecord[] = [];

    for (const [sourceFile, records] of bySource.entries()) {
      const isVideo = records.some((r) => r.sourceType === 'video' || r.timestampSec !== undefined);

      if (isVideo) {
        // Chronological order
        records.sort((a, b) => (a.timestampSec ?? 0) - (b.timestampSec ?? 0));
        const totalFrames = records.length;
        const durationSec = Math.max(...records.map((r) => r.timestampSec ?? 0), 0);

        // Filter frames that had actual detections
        const detectedFrames = records.filter(
          (r) => r.totalBoxesCount > 0 || r.matchedPrompts.length > 0
        );

        // Build full timeline of all detection events across video
        const timeline: ClipTimelineEvent[] = detectedFrames.map((f) => ({
          timestampSec: f.timestampSec ?? 0,
          timecode: formatTimecode(f.timestampSec ?? 0),
          matchedPrompts: f.matchedPrompts,
          boxCount: f.totalBoxesCount,
          candidateId: f.candidateId,
        }));

        // Select 1 to 3 keyframes
        let selectedKeyframes: CandidateSignalRecord[] = [];
        if (detectedFrames.length === 0) {
          selectedKeyframes = [];
        } else if (detectedFrames.length <= 3) {
          selectedKeyframes = [...detectedFrames];
        } else {
          // Score frames to pick clearest representative perspectives
          const scoreFrame = (f: CandidateSignalRecord): number => {
            let score = f.totalBoxesCount * 2;
            if (f.matchedPrompts.includes('person') || f.matchedPrompts.includes('hiker')) score += 10;
            if (f.matchedPrompts.includes('clothing')) score += 3;
            if (f.matchedPrompts.includes('backpack')) score += 4;
            if (f.hasCorroboratingSignals) score += 5;
            if (f.dampening.isDampened) score -= f.dampening.dampeningScore * 5;
            return score;
          };

          const sortedByScore = [...detectedFrames].sort((a, b) => scoreFrame(b) - scoreFrame(a));

          // Pick up to 3 frames with temporal separation (at least 1.0s apart if available)
          const picked: CandidateSignalRecord[] = [];
          for (const cand of sortedByScore) {
            if (picked.length >= 3) break;
            const isTooClose = picked.some(
              (p) => Math.abs((p.timestampSec ?? 0) - (cand.timestampSec ?? 0)) < 1.0
            );
            if (!isTooClose || picked.length === 0) {
              picked.push(cand);
            }
          }

          // If spacing constraint leaves fewer than 3, fill with next best
          for (const cand of sortedByScore) {
            if (picked.length >= 3) break;
            if (!picked.some((p) => p.candidateId === cand.candidateId)) {
              picked.push(cand);
            }
          }

          picked.sort((a, b) => (a.timestampSec ?? 0) - (b.timestampSec ?? 0));
          selectedKeyframes = picked;
        }

        // Clip detection summary
        let clipSummary = '';
        if (detectedFrames.length === 0) {
          clipSummary = `Surveillance sweep completed across ${durationSec.toFixed(1)}s (${totalFrames} frames scanned at 2 FPS). Zero human presence or target signatures detected in this sector.`;
        } else {
          const uniquePrompts = Array.from(new Set(detectedFrames.flatMap((f) => f.matchedPrompts)));
          const timeRangeStr = `${formatTimecode(detectedFrames[0].timestampSec ?? 0)} to ${formatTimecode(detectedFrames[detectedFrames.length - 1].timestampSec ?? 0)}`;
          const keyTimes = selectedKeyframes.map((k) => formatTimecode(k.timestampSec ?? 0)).join(', ');
          clipSummary = `Aerial surveillance sweep identified target signals across ${detectedFrames.length} frame(s) (${timeRangeStr}). Detected visual cues: ${uniquePrompts.join(', ')}. Keyframe timestamps flagged for operator verification: ${keyTimes}.`;
        }

        clipReports.push({
          sourceFile,
          durationSec,
          totalFrames,
          flaggedFramesCount: detectedFrames.length,
          timeline,
          clipSummary,
        });

        candidatesToProcess.push(...selectedKeyframes);
      } else {
        // Still images: filter out negative frames where nothing was detected
        const detectedStill = records.filter(
          (r) => r.totalBoxesCount > 0 || r.matchedPrompts.length > 0
        );
        candidatesToProcess.push(...detectedStill);
      }
    }

    if (candidatesToProcess.length === 0) {
      const queueResult: PrioritizedQueueResult = {
        jobId,
        totalItems: 0,
        highPriorityCount: 0,
        mediumPriorityCount: 0,
        lowPriorityCount: 0,
        totalPrioritizationTimeMs: Date.now() - startTime,
        fallbackBatchCount: 0,
        generatedAt: new Date().toISOString(),
        rankedItems: [],
        clipReports,
      };

      const jobDir = projectRootDir
        ? path.resolve(rootDir, 'data/ingested', jobId)
        : path.resolve(getIngestedDir(), jobId);
      fs.mkdirSync(jobDir, { recursive: true });
      fs.writeFileSync(path.join(jobDir, 'prioritized_queue.json'), JSON.stringify(queueResult, null, 2), 'utf-8');

      return queueResult;
    }

    // Build lookup map from candidateId to raw record
    const recordMap = new Map<string, CandidateSignalRecord>();
    candidatesToProcess.forEach((c) => recordMap.set(c.candidateId, c));

    // Generate rich visual scene descriptions (1-sentence queue summary + 4 structured SAR headings)
    const sceneDescriptions = await Promise.all(
      candidatesToProcess.map(async (c) => {
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
    candidatesToProcess.forEach((c, idx) => descMap.set(c.candidateId, sceneDescriptions[idx]));

    // Prepare batches for Muse Spark
    const batches = ContextAggregator.prepareBatches(candidatesToProcess);
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

    const includedIds = new Set(allRankedItems.map((item) => item.candidateId));
    for (const raw of candidatesToProcess) {
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
      clipReports,
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
