import * as http from 'http';
import * as path from 'path';
import { createServer } from '../server';
import { AppDatabase } from '../storage/database';

async function runProductionSmokeTest() {
  console.log('=== Project Triage — Phase 10.2 Production Smoke Test ===\n');

  const PORT = 4280;
  const BASE_URL = `http://127.0.0.1:${PORT}`;

  // Start server using the compiled dist server instance
  const app = createServer();
  AppDatabase.getInstance();
  const server = app.listen(PORT);
  console.log(`[Prod Server] Started in production mode on port ${PORT}.\n`);

  let failures = 0;

  async function check(name: string, fn: () => Promise<boolean>) {
    try {
      const ok = await fn();
      if (ok) {
        console.log(`  [PASS] ${name}`);
      } else {
        console.error(`  [FAIL] ${name}`);
        failures++;
      }
    } catch (err: any) {
      console.error(`  [ERROR] ${name}:`, err.message);
      failures++;
    }
  }

  try {
    // 1. Healthcheck
    await check('GET /health returns 200 OK with cost summary', async () => {
      const res = await fetch(`${BASE_URL}/health`);
      const json = (await res.json()) as any;
      return res.status === 200 && json.status === 'ok' && json.costSummary !== undefined;
    });

    // 2. SPA Root Page
    await check('GET / serves production index.html', async () => {
      const res = await fetch(`${BASE_URL}/`);
      const html = await res.text();
      return res.status === 200 && html.includes('id="root"');
    });

    // 3. SPA Route Fallback (e.g. /queue or /settings deep link)
    await check('GET /queue falls back to index.html for client-side routing', async () => {
      const res = await fetch(`${BASE_URL}/queue`);
      const html = await res.text();
      return res.status === 200 && html.includes('id="root"');
    });

    // 4. API List Jobs
    let existingJobId = '';
    await check('GET /api/jobs lists jobs from SQLite database', async () => {
      const res = await fetch(`${BASE_URL}/api/jobs?limit=5`);
      const json = (await res.json()) as any;
      if (json.jobs && json.jobs.length > 0) existingJobId = json.jobs[0].id;
      return res.status === 200 && Array.isArray(json.jobs);
    });

    // 5. Submit Batch via System Design Section 4 JSON Contract
    let newJobId = '';
    await check('POST /api/jobs accepts JSON units batch', async () => {
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLabel: 'Smoke Test Drone Batch',
          units: [{ type: 'image', fileRef: 'data/raw/sard/sard_human_01.png' }],
        }),
      });
      const json = (await res.json()) as any;
      newJobId = json.jobId;
      return res.status === 202 && json.status === 'queued' && Boolean(newJobId);
    });

    // 6. Get Job Status
    await check('GET /api/jobs/:id returns progress and stage', async () => {
      const targetId = newJobId || existingJobId;
      const res = await fetch(`${BASE_URL}/api/jobs/${targetId}`);
      const json = (await res.json()) as any;
      return res.status === 200 && json.jobId === targetId && json.progress !== undefined;
    });

    // 7. Media Streaming
    await check('GET /api/media/* safely streams image assets', async () => {
      const res = await fetch(`${BASE_URL}/api/media/data/raw/sard/sard_human_01.png`);
      const cType = res.headers.get('content-type') || '';
      return res.status === 200 && cType.includes('image/');
    });

    // 8. Path Traversal Protection
    await check('GET /api/media/.. rejects invalid traversal path with 403 Forbidden', () => {
      return new Promise<boolean>((resolve) => {
        const req = http.request(
          {
            host: '127.0.0.1',
            port: PORT,
            path: '/api/media/../../package.json',
            method: 'GET',
          },
          (res) => {
            resolve(res.statusCode === 403);
          }
        );
        req.on('error', () => resolve(false));
        req.end();
      });
    });

    // 9. Audit Trail
    await check('GET /api/audit returns recent audit events', async () => {
      const res = await fetch(`${BASE_URL}/api/audit?limit=10`);
      const json = (await res.json()) as any;
      return res.status === 200 && Array.isArray(json.events) && json.totalEvents > 0;
    });

    // 10. Reviewer Decision Persistence
    await check('POST /api/candidates/:id/decision saves reviewer decision', async () => {
      const res = await fetch(`${BASE_URL}/api/candidates/cand_smoke_test_unit_1/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: newJobId || 'job_smoke_test',
          decision: 'verified',
          notes: 'Production smoke test confirmation.',
        }),
      });
      const json = (await res.json()) as any;
      return res.status === 200 && json.success === true && json.decision === 'verified';
    });

    console.log(`\n=== Production Smoke Test Result: ${failures === 0 ? 'ALL CHECKS PASSED (10/10)' : `${failures} FAILURES`} ===\n`);
  } finally {
    server.close();
  }

  if (failures > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runProductionSmokeTest();
