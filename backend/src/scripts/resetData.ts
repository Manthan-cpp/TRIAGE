import * as fs from 'fs';
import * as path from 'path';
import { AppDatabase } from '../storage/database';
import { getIngestedDir } from '../lib/config';

export function resetAllData(): { deletedJobs: number; deletedCandidates: number; clearedIngested: boolean } {
  const db = AppDatabase.getInstance();

  const candidateCount = db.prepare('SELECT COUNT(*) as count FROM candidates').get() as { count: number };
  const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get() as { count: number };

  db.transaction(() => {
    db.prepare('DELETE FROM reviewer_decisions').run();
    db.prepare('DELETE FROM queue_items').run();
    db.prepare('DELETE FROM clip_reports').run();
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM candidates').run();
    db.prepare('DELETE FROM jobs').run();
  })();

  const ingestedDir = getIngestedDir();
  let clearedIngested = false;
  if (fs.existsSync(ingestedDir)) {
    try {
      const items = fs.readdirSync(ingestedDir);
      for (const item of items) {
        const itemPath = path.join(ingestedDir, item);
        fs.rmSync(itemPath, { recursive: true, force: true });
      }
      clearedIngested = true;
    } catch (err) {
      console.error('[Reset] Failed to clean ingested media directory:', err);
    }
  }

  return {
    deletedJobs: jobCount.count,
    deletedCandidates: candidateCount.count,
    clearedIngested,
  };
}

if (require.main === module) {
  console.log('[Reset] Clearing all operational jobs, queue candidates, and extracted clips...');
  const result = resetAllData();
  console.log(`[Reset] Successfully cleared ${result.deletedJobs} jobs, ${result.deletedCandidates} candidates, and cleaned media directory.`);
  AppDatabase.close();
  process.exit(0);
}
