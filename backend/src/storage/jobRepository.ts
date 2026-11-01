import { AppDatabase } from './database';
import { CandidateSignalRecord } from '../perception/candidateTypes';
import { PrioritizedQueueItem } from '../prioritization/prioritizer';
import { ConfidenceLabel } from '../prioritization/museSparkClient';

export type JobStatus = 'queued' | 'ingesting' | 'detecting' | 'ranking' | 'complete' | 'failed';

export interface JobRecord {
  id: string;
  sourceLabel: string;
  status: JobStatus;
  totalUnits: number;
  processedUnits: number;
  currentStage: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CandidateDetailRecord {
  candidateId: string;
  jobId: string;
  unitId: string;
  sourceFile: string;
  sourceType: 'image' | 'video';
  timestampSec?: number;
  filePath: string;
  matchedPrompts: string[];
  totalBoxes: number;
  hasCorroboration: boolean;
  isDampened: boolean;
  dampeningReason?: string;
  dampeningScore: number;
  boxes: any[];
  rawResults: any[];
  createdAt: string;
}

export class JobRepository {
  public static createJob(id: string, sourceLabel: string): JobRecord {
    const db = AppDatabase.getInstance();
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT INTO jobs (id, source_label, status, total_units, processed_units, current_stage, created_at)
      VALUES (?, ?, 'queued', 0, 0, 'Job queued', ?)
    `);
    stmt.run(id, sourceLabel, createdAt);

    return {
      id,
      sourceLabel,
      status: 'queued',
      totalUnits: 0,
      processedUnits: 0,
      currentStage: 'Job queued',
      createdAt,
    };
  }

  public static updateStatus(
    id: string,
    status: JobStatus,
    currentStage: string,
    errorMessage?: string
  ): void {
    const db = AppDatabase.getInstance();
    const completedAt = status === 'complete' || status === 'failed' ? new Date().toISOString() : null;
    const stmt = db.prepare(`
      UPDATE jobs
      SET status = ?, current_stage = ?, error_message = ?, completed_at = COALESCE(?, completed_at)
      WHERE id = ?
    `);
    stmt.run(status, currentStage, errorMessage || null, completedAt, id);
  }

  public static updateProgress(
    id: string,
    processedUnits: number,
    totalUnits?: number,
    currentStage?: string
  ): void {
    const db = AppDatabase.getInstance();
    const stmt = db.prepare(`
      UPDATE jobs
      SET processed_units = ?,
          total_units = COALESCE(?, total_units),
          current_stage = COALESCE(?, current_stage)
      WHERE id = ?
    `);
    stmt.run(processedUnits, totalUnits !== undefined ? totalUnits : null, currentStage || null, id);
  }

  public static getJob(id: string): JobRecord | null {
    const db = AppDatabase.getInstance();
    const row = db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      sourceLabel: row.source_label,
      status: row.status as JobStatus,
      totalUnits: row.total_units,
      processedUnits: row.processed_units,
      currentStage: row.current_stage,
      errorMessage: row.error_message || undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
    };
  }

  public static listJobs(limit = 20): JobRecord[] {
    const db = AppDatabase.getInstance();
    const rows = db.prepare(`
      SELECT * FROM jobs
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      sourceLabel: row.source_label,
      status: row.status as JobStatus,
      totalUnits: row.total_units,
      processedUnits: row.processed_units,
      currentStage: row.current_stage,
      errorMessage: row.error_message || undefined,
      createdAt: row.created_at,
      completedAt: row.completed_at || undefined,
    }));
  }

  public static saveCandidates(jobId: string, candidates: CandidateSignalRecord[]): void {
    const db = AppDatabase.getInstance();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO candidates (
        candidate_id, job_id, unit_id, source_file, source_type, timestamp_sec,
        file_path, matched_prompts, total_boxes, has_corroboration, is_dampened,
        dampening_reason, dampening_score, boxes_json, raw_results_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records: CandidateSignalRecord[]) => {
      for (const r of records) {
        stmt.run(
          r.candidateId,
          jobId,
          r.unitId,
          r.sourceFile,
          r.sourceType,
          r.timestampSec || null,
          r.filePath,
          JSON.stringify(r.matchedPrompts),
          r.totalBoxesCount,
          r.hasCorroboratingSignals ? 1 : 0,
          r.dampening.isDampened ? 1 : 0,
          r.dampening.reason || null,
          r.dampening.dampeningScore,
          JSON.stringify(r.boxes),
          JSON.stringify(r.rawResults),
          r.createdAt
        );
      }
    });

    insertMany(candidates);
  }

  public static getCandidate(candidateId: string): CandidateDetailRecord | null {
    const db = AppDatabase.getInstance();
    const row = db.prepare('SELECT * FROM candidates WHERE candidate_id = ?').get(candidateId) as any;
    if (!row) return null;

    return {
      candidateId: row.candidate_id,
      jobId: row.job_id,
      unitId: row.unit_id,
      sourceFile: row.source_file,
      sourceType: row.source_type,
      timestampSec: row.timestamp_sec !== null ? row.timestamp_sec : undefined,
      filePath: row.file_path,
      matchedPrompts: JSON.parse(row.matched_prompts),
      totalBoxes: row.total_boxes,
      hasCorroboration: Boolean(row.has_corroboration),
      isDampened: Boolean(row.is_dampened),
      dampeningReason: row.dampening_reason || undefined,
      dampeningScore: row.dampening_score,
      boxes: JSON.parse(row.boxes_json),
      rawResults: JSON.parse(row.raw_results_json),
      createdAt: row.created_at,
    };
  }

  public static saveQueue(jobId: string, items: PrioritizedQueueItem[]): void {
    const db = AppDatabase.getInstance();
    const stmt = db.prepare(`
      INSERT INTO queue_items (
        job_id, candidate_id, unit_id, priority_rank, confidence_label,
        reasoning_summary, evidence_ids_json, source_file, source_type,
        timestamp_sec, file_path, thumbnail_url, matched_prompts,
        boxes_count, dampened
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((records: PrioritizedQueueItem[]) => {
      for (const i of records) {
        stmt.run(
          jobId,
          i.candidateId,
          i.unitId,
          i.priorityRank,
          i.confidenceLabel,
          i.reasoningSummary,
          JSON.stringify(i.evidenceIds),
          i.sourceFile,
          i.sourceType,
          i.timestampSec || null,
          i.filePath,
          i.thumbnailUrl || `/api/media/${i.filePath.replace(/\\/g, '/')}`,
          JSON.stringify(i.matchedPrompts),
          i.boxesCount,
          i.dampened ? 1 : 0
        );
      }
    });

    insertMany(items);
  }

  public static getQueue(jobId: string): PrioritizedQueueItem[] {
    const db = AppDatabase.getInstance();
    const rows = db.prepare(`
      SELECT * FROM queue_items
      WHERE job_id = ?
      ORDER BY priority_rank ASC
    `).all(jobId) as any[];

    return rows.map((r) => ({
      candidateId: r.candidate_id,
      unitId: r.unit_id,
      priorityRank: r.priority_rank,
      confidenceLabel: r.confidence_label as ConfidenceLabel,
      reasoningSummary: r.reasoning_summary,
      evidenceIds: JSON.parse(r.evidence_ids_json),
      sourceFile: r.source_file,
      sourceType: r.source_type,
      timestampSec: r.timestamp_sec !== null ? r.timestamp_sec : undefined,
      filePath: r.file_path,
      thumbnailUrl: r.thumbnail_url,
      matchedPrompts: JSON.parse(r.matched_prompts),
      boxesCount: r.boxes_count,
      dampened: Boolean(r.dampened),
    }));
  }
}
