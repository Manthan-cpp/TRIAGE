import Database, { Database as DatabaseType } from 'better-sqlite3';
import * as path from 'path';
import { ensureDirectory, getDatabasePath } from '../lib/config';

export class AppDatabase {
  private static instance: DatabaseType | null = null;

  public static getInstance(): DatabaseType {
    if (!this.instance) {
      const dbPath = getDatabasePath();

      const dir = path.dirname(dbPath);
      if (dir) ensureDirectory(dir);

      this.instance = new Database(dbPath);
      this.instance.pragma('journal_mode = WAL');
      this.instance.pragma('foreign_keys = ON');

      this.initSchema(this.instance);
    }
    return this.instance;
  }

  private static initSchema(db: DatabaseType): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        source_label TEXT NOT NULL,
        status TEXT NOT NULL,
        total_units INTEGER DEFAULT 0,
        processed_units INTEGER DEFAULT 0,
        current_stage TEXT NOT NULL,
        error_message TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS candidates (
        candidate_id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        source_file TEXT NOT NULL,
        source_type TEXT NOT NULL,
        timestamp_sec REAL,
        file_path TEXT NOT NULL,
        matched_prompts TEXT NOT NULL,
        total_boxes INTEGER NOT NULL,
        has_corroboration INTEGER NOT NULL,
        is_dampened INTEGER NOT NULL,
        dampening_reason TEXT,
        dampening_score REAL NOT NULL,
        boxes_json TEXT NOT NULL,
        raw_results_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS queue_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        candidate_id TEXT NOT NULL,
        unit_id TEXT NOT NULL,
        priority_rank INTEGER NOT NULL,
        confidence_label TEXT NOT NULL,
        reasoning_summary TEXT NOT NULL,
        full_reasoning_text TEXT,
        evidence_ids_json TEXT NOT NULL,
        source_file TEXT NOT NULL,
        source_type TEXT NOT NULL,
        timestamp_sec REAL,
        file_path TEXT NOT NULL,
        thumbnail_url TEXT NOT NULL,
        matched_prompts TEXT NOT NULL,
        boxes_count INTEGER NOT NULL,
        dampened INTEGER NOT NULL,
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_candidates_job ON candidates(job_id);
      CREATE INDEX IF NOT EXISTS idx_queue_job ON queue_items(job_id, priority_rank);

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        stage TEXT NOT NULL,
        unit_id TEXT,
        event_type TEXT NOT NULL,
        details TEXT NOT NULL,
        duration_ms INTEGER,
        status TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_audit_job ON audit_logs(job_id, id);

      CREATE TABLE IF NOT EXISTS reviewer_decisions (
        candidate_id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        decision TEXT NOT NULL,
        notes TEXT,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_reviewer_job ON reviewer_decisions(job_id);
    `);

    try {
      db.exec('ALTER TABLE queue_items ADD COLUMN full_reasoning_text TEXT;');
    } catch (_) {
      // Column already exists
    }
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }
}
