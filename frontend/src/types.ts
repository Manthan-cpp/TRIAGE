export type ConfidenceLabel = 'possible-high' | 'possible-medium' | 'possible-low';

export type JobStatus = 'queued' | 'ingesting' | 'detecting' | 'ranking' | 'complete' | 'failed';

export type TabId =
  | 'ingest'
  | 'queue'
  | 'clip'
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

export interface JobSummary {
  id: string;
  sourceLabel: string;
  status: JobStatus;
  totalUnits: number;
  processedUnits: number;
  currentStage: string;
  completedAt?: string;
  errorMessage?: string;
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

export interface QueueItem {
  candidateId: string;
  priorityRank: number;
  confidenceLabel: ConfidenceLabel;
  reasoningSummary: string;
  fullReasoningText?: string;
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
  fullReasoningText?: string;
  evidenceIds?: string[];
  priorityRank?: number;
  confidenceLabel?: ConfidenceLabel;
  sourceMetadata: {
    clipId: string;
    sourceType: 'image' | 'video';
    timestampSec?: number;
    unitId: string;
    datasetLabel?: string;
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
  runtime?: {
    environment: string;
    nodeVersion: string;
    uptimeSec: number;
  };
}

export interface JobMetrics {
  jobId: string;
  status: JobStatus;
  progress: JobProgress;
  queue: {
    total: number;
    possibleHigh: number;
    possibleMedium: number;
    possibleLow: number;
  };
  review: { reviewed: number; pending: number };
  timing: {
    elapsedMs: number;
    completedDurationMs?: number;
    stageDurations: Record<string, number>;
  };
  audit: { totalEvents: number; errorEvents: number; warningEvents: number };
}

export interface SystemInfo {
  startedAt: string;
  environment: string;
  models: {
    sam: { id: string; endpoint: string };
    muse: { id: string; endpoint: string };
  };
  prompts: string[];
  pipeline: {
    videoFps: number;
    maxImageDimension: number;
    jpegQuality: number;
    perceptionConcurrency: number;
    rankingBatchSize: number;
  };
  storage: { dataDirConfigured: boolean; databasePathConfigured: boolean; mode: string };
}

export interface BenchmarkMetric {
  value: number;
  hits?: number;
  total?: number;
  fromKb?: number;
  toKb?: number;
  fromMs?: number;
  toMs?: number;
}

export interface BenchmarkRecord {
  source: string;
  evaluatedAt: string;
  dataset: {
    totalUnits: number;
    lightOcclusionUnits: number;
    heavyOcclusionUnits: number;
    negativeControlUnits: number;
  };
  metrics: Record<string, BenchmarkMetric>;
  promptSensitivity: Array<{
    prompt: string;
    weight: number;
    lightRate: number;
    heavyRate: number;
    finding: string;
  }>;
  failurePatterns: string[];
  note: string;
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
