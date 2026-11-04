import { BoundingBox, SamDetectionResult } from './sam31Client';

export interface CandidateSignalRecord {
  /** Unique candidate ID across the entire job */
  candidateId: string;
  /** Ingestion unit reference */
  unitId: string;
  sourceFile: string;
  sourceType: 'image' | 'video';
  timestampSec?: number;
  filePath: string;
  /** Which prompts generated at least one box */
  matchedPrompts: string[];
  /** Total count of detected boxes across all prompts */
  totalBoxesCount: number;
  /** Merged bounding boxes */
  boxes: BoundingBox[];
  /** True if both 'person' and 'clothing' corroborate */
  hasCorroboratingSignals: boolean;
  /** False-positive dampening assessment */
  dampening: {
    isDampened: boolean;
    reason?: string;
    dampeningScore: number; // 0.0 (clean) to 1.0 (heavily suspected false alarm)
  };
  /** Raw per-prompt response metadata for auditability */
  rawResults: SamDetectionResult[];
  createdAt: string;
}

export interface PerceptionBatchResult {
  jobId: string;
  totalUnitsProcessed: number;
  unitsWithDetections: number;
  dampenedUnitsCount: number;
  failedUnitsCount: number;
  totalSignalsCount: number;
  totalPerceptionTimeMs: number;
  candidates: CandidateSignalRecord[];
}
