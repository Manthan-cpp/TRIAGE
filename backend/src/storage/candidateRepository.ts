import { AppDatabase } from './database';
import { CandidateSignalRecord } from '../perception/candidateTypes';

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
  fullReasoningText?: string;
  evidenceIds?: string[];
  priorityRank?: number;
  confidenceLabel?: string;
  createdAt: string;
}

export class CandidateRepository {
  public static saveCandidates(jobId: string, candidates: CandidateSignalRecord[]): void {
    const db = AppDatabase.getInstance();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO candidates (
        candidate_id, job_id, unit_id, source_file, source_type, timestamp_sec,
        file_path, matched_prompts, total_boxes, has_corroboration, is_dampened,
        dampening_reason, dampening_score, boxes_json, raw_results_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    db.transaction((records: CandidateSignalRecord[]) => {
      for (const record of records) {
        stmt.run(
          record.candidateId,
          jobId,
          record.unitId,
          record.sourceFile,
          record.sourceType,
          record.timestampSec ?? null,
          record.filePath,
          JSON.stringify(record.matchedPrompts),
          record.totalBoxesCount,
          record.hasCorroboratingSignals ? 1 : 0,
          record.dampening.isDampened ? 1 : 0,
          record.dampening.reason || null,
          record.dampening.dampeningScore,
          JSON.stringify(record.boxes),
          JSON.stringify(record.rawResults),
          record.createdAt
        );
      }
    })(candidates);
  }

  public static getCandidate(candidateId: string): CandidateDetailRecord | null {
    const db = AppDatabase.getInstance();
    const row = db.prepare('SELECT * FROM candidates WHERE candidate_id = ?').get(candidateId) as any;
    if (!row) return null;

    const queueRow = db.prepare(
      'SELECT reasoning_summary, full_reasoning_text, evidence_ids_json, priority_rank, confidence_label FROM queue_items WHERE candidate_id = ?'
    ).get(candidateId) as any;

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
      fullReasoningText: queueRow?.full_reasoning_text || queueRow?.reasoning_summary || undefined,
      evidenceIds: queueRow?.evidence_ids_json ? JSON.parse(queueRow.evidence_ids_json) : undefined,
      priorityRank: queueRow?.priority_rank || undefined,
      confidenceLabel: queueRow?.confidence_label || undefined,
      createdAt: row.created_at,
    };
  }
}
