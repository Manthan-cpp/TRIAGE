import { AppDatabase } from './database';

export interface AuditLogEntry {
  id?: number;
  jobId: string;
  timestamp: string;
  stage: 'ingest' | 'perception' | 'prioritization' | 'review' | 'system';
  unitId?: string;
  eventType: string;
  details: string;
  durationMs?: number;
  status: 'info' | 'success' | 'warn' | 'error';
}

export interface ReviewerDecisionRecord {
  candidateId: string;
  jobId: string;
  decision: 'verified' | 'false_alarm';
  notes?: string;
  updatedAt: string;
}

export class AuditRepository {
  public static recordEvent(event: Omit<AuditLogEntry, 'id'>): void {
    const db = AppDatabase.getInstance();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (job_id, timestamp, stage, unit_id, event_type, details, duration_ms, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      event.jobId,
      event.timestamp || new Date().toISOString(),
      event.stage,
      event.unitId || null,
      event.eventType,
      event.details,
      event.durationMs !== undefined ? event.durationMs : null,
      event.status
    );
  }

  public static getJobAuditLogs(jobId: string): AuditLogEntry[] {
    const db = AppDatabase.getInstance();
    const rows = db.prepare(`
      SELECT * FROM audit_logs
      WHERE job_id = ?
      ORDER BY id ASC
    `).all(jobId) as any[];

    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      timestamp: r.timestamp,
      stage: r.stage,
      unitId: r.unit_id || undefined,
      eventType: r.event_type,
      details: r.details,
      durationMs: r.duration_ms !== null ? r.duration_ms : undefined,
      status: r.status,
    }));
  }

  public static getRecentAuditLogs(limit = 100): AuditLogEntry[] {
    const db = AppDatabase.getInstance();
    const rows = db.prepare(`
      SELECT * FROM audit_logs
      ORDER BY id DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      timestamp: r.timestamp,
      stage: r.stage,
      unitId: r.unit_id || undefined,
      eventType: r.event_type,
      details: r.details,
      durationMs: r.duration_ms !== null ? r.duration_ms : undefined,
      status: r.status,
    }));
  }

  public static saveReviewDecision(
    candidateId: string,
    jobId: string,
    decision: 'verified' | 'false_alarm',
    notes?: string
  ): void {
    const db = AppDatabase.getInstance();
    const now = new Date().toISOString();
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO reviewer_decisions (candidate_id, job_id, decision, notes, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(candidateId, jobId, decision, notes || null, now);

    // Also log this human action to audit_logs for chain of custody
    this.recordEvent({
      jobId,
      timestamp: now,
      stage: 'review',
      unitId: candidateId,
      eventType: 'HUMAN_DECISION_RECORDED',
      details: `Reviewer flagged candidate as "${decision}". Notes: ${notes || 'none'}`,
      status: 'info',
    });
  }

  public static getReviewDecisions(jobId?: string): Record<string, { status: 'verified' | 'false_alarm'; notes?: string; updatedAt: string }> {
    const db = AppDatabase.getInstance();
    const rows = jobId
      ? (db.prepare('SELECT * FROM reviewer_decisions WHERE job_id = ?').all(jobId) as any[])
      : (db.prepare('SELECT * FROM reviewer_decisions').all() as any[]);

    const result: Record<string, { status: 'verified' | 'false_alarm'; notes?: string; updatedAt: string }> = {};
    for (const r of rows) {
      result[r.candidate_id] = {
        status: r.decision as 'verified' | 'false_alarm',
        notes: r.notes || undefined,
        updatedAt: r.updated_at,
      };
    }
    return result;
  }
}
