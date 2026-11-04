import * as http from 'http';
import { createServer } from '../server';
import { AppDatabase } from '../storage/database';
import { CandidateRepository } from '../storage/candidateRepository';
import { CandidateSignalRecord } from '../perception/candidateTypes';

async function runProductionSmokeTest() {
  console.log('=== Project Triage — Production Smoke Test (15 checks) ===\n');

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

    await check('GET /api/system returns active runtime configuration', async () => {
      const res = await fetch(`${BASE_URL}/api/system`);
      const json = (await res.json()) as any;
      return res.status === 200 && json.models?.sam?.id && json.pipeline?.videoFps !== undefined;
    });

    await check('GET /api/benchmarks returns the documented evaluation record', async () => {
      const res = await fetch(`${BASE_URL}/api/benchmarks`);
      const json = (await res.json()) as any;
      return res.status === 200 && json.source && json.metrics?.precisionAt10;
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

    await check('POST /api/jobs rejects unit paths outside the data directory', async () => {
      const res = await fetch(`${BASE_URL}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLabel: 'Traversal Test',
          units: [{ type: 'image', fileRef: '../package.json' }],
        }),
      });
      return res.status === 400;
    });

    // 6. Get Job Status
    await check('GET /api/jobs/:id returns progress and stage', async () => {
      const targetId = newJobId || existingJobId;
      const res = await fetch(`${BASE_URL}/api/jobs/${targetId}`);
      const json = (await res.json()) as any;
      return res.status === 200 && json.jobId === targetId && json.progress !== undefined;
    });

    // Seed one lightweight stored candidate for the HTTP-only decision test.
    // The smoke test must validate the real relationship constraint without
    // spending model credits just to create a candidate.
    if (newJobId) {
      const smokeCandidate: CandidateSignalRecord = {
        candidateId: 'cand_smoke_test_unit_1',
        unitId: 'unit_smoke_test_1',
        sourceFile: 'sard_human_01.png',
        sourceType: 'image',
        filePath: 'data/raw/sard/sard_human_01.png',
        matchedPrompts: [],
        totalBoxesCount: 0,
        boxes: [],
        hasCorroboratingSignals: false,
        dampening: { isDampened: true, reason: 'Smoke-test retained unit.', dampeningScore: 1 },
        rawResults: [],
        createdAt: new Date().toISOString(),
      };
      CandidateRepository.saveCandidates(newJobId, [smokeCandidate]);
    }

    await check('GET /api/jobs/:id/metrics returns live batch measurements', async () => {
      const res = await fetch(`${BASE_URL}/api/jobs/${newJobId}/metrics`);
      const json = (await res.json()) as any;
      return res.status === 200 && json.jobId === newJobId && json.queue?.total === 1 && json.review?.reviewed === 0;
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
          jobId: newJobId,
          decision: 'verified',
          notes: 'Production smoke test confirmation.',
        }),
      });
      const json = (await res.json()) as any;
      return res.status === 200 && json.success === true && json.decision === 'verified';
    });

    await check('POST /api/candidates/:id/decision rejects an unrelated job', async () => {
      const res = await fetch(`${BASE_URL}/api/candidates/cand_smoke_test_unit_1/decision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: 'job_unrelated',
          decision: 'verified',
        }),
      });
      return res.status === 404;
    });

    const totalChecks = 15;
    console.log(`\n=== Production Smoke Test Result: ${failures === 0 ? `ALL CHECKS PASSED (${totalChecks}/${totalChecks})` : `${failures} FAILURES`} ===\n`);
  } finally {
    server.close();
  }

  if (failures > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runProductionSmokeTest();
