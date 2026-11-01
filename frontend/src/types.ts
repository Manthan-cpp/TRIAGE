export type ConfidenceLabel = 'possible-high' | 'possible-medium' | 'possible-low';

export type JobStatus = 'queued' | 'ingesting' | 'detecting' | 'ranking' | 'complete' | 'failed';

export type TabId =
  | 'ingest'
  | 'queue'
  | 'clip'
  | 'audit'
  | 'overview'
  | 'benchmarks'
  | 'telemetry'
  | 'settings';

export interface JobProgress {
  total: number;
  processed: number;
}

export interface JobRecord {
  jobId: string;
  status: JobStatus;
  progress: JobProgress;
  currentStage: string;
  sourceLabel?: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface QueueItem {
  candidateId: string;
  priorityRank: number;
  confidenceLabel: ConfidenceLabel;
  reasoningSummary: string;
  thumbnailUrl: string;
  sourceFile: string;
  sourceType: 'image' | 'video';
  timestampSec?: number;
  evidenceIds: string[];
  matchedPrompts: string[];
  boxesCount: number;
  dampened: boolean;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  height?: number;
}

export interface CandidateDetail {
  candidateId: string;
  jobId: string;
  sourceFrameUrl: string;
  maskOverlayData: {
    boxes: BoundingBox[];
    totalBoxes: number;
    matchedPrompts: string[];
    rawResults?: any[];
  };
  sourceMetadata: {
    clipId: string;
    sourceType: 'image' | 'video';
    timestampSec?: number;
    unitId: string;
  };
  dampening: {
    isDampened: boolean;
    reason?: string;
    dampeningScore: number;
  };
  hasCorroboratingSignals: boolean;
  createdAt: string;
}

export interface HealthInfo {
  status: string;
  service: string;
  timestamp: string;
  costSummary: {
    totalCost: number;
    totalCalls: number;
    byModel: Record<string, number>;
  };
}

export interface ReviewerDecision {
  status: 'pending' | 'verified' | 'false_alarm';
  notes?: string;
  updatedAt?: string;
}

export interface AuditLogEntry {
  id: number;
  jobId: string;
  timestamp: string;
  stage: 'ingest' | 'perception' | 'prioritization' | 'review' | 'system';
  unitId?: string;
  eventType: string;
  details: string;
  durationMs?: number;
  status: 'info' | 'success' | 'warn' | 'error';
}
