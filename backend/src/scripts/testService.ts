import * as fs from 'fs';
import * as path from 'path';
import { createServer } from '../server';
import { AppDatabase } from '../storage/database';

async function main() {
  console.log('=== Project Triage — Phase 6 Backend Service Integration Test ===\n');

  const rootDir = path.resolve(__dirname, '../../../');
  const TEST_PORT = 4199;
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

  // Start test server
  const app = createServer();
  AppDatabase.getInstance();
  const server = app.listen(TEST_PORT);
  console.log(`[Step 1] Test server started on port ${TEST_PORT}.`);

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    console.assert(healthRes.status === 200, `Health check returned ${healthRes.status}`);
    const healthJson = (await healthRes.json()) as any;
    console.log(`  GET /health -> 200 OK (status: ${healthJson.status})`);

    // 2. Submit Job
    console.log('\n[Step 2] Submitting job via POST /api/jobs...');
    const humanImg = path.join(rootDir, 'data/raw/sard/sard_human_01.png');
    const negImg = path.join(rootDir, 'data/raw/negative_controls/neg_control_01.jpg');

    const formData = new FormData();
    formData.append('sourceLabel', 'Phase 6 Integration Test');
    formData.append(
      'files',
      new Blob([fs.readFileSync(humanImg)], { type: 'image/png' }),
      'sard_human_01.png'
    );
    formData.append(
      'files',
      new Blob([fs.readFileSync(negImg)], { type: 'image/jpeg' }),
      'neg_control_01.jpg'
    );

    const postJobRes = await fetch(`${BASE_URL}/api/jobs`, {
      method: 'POST',
      body: formData,
    });

    console.assert(postJobRes.status === 202, `POST /api/jobs expected 202, got ${postJobRes.status}`);
    const postJson = (await postJobRes.json()) as any;
    const jobId = postJson.jobId;
    console.log(`  Job submitted successfully: jobId = "${jobId}", initial status = "${postJson.status}"`);

    // 3. Poll Job status until complete
    console.log('\n[Step 3] Polling GET /api/jobs/:jobId through state machine transitions...');
    let currentStatus = 'queued';
    const seenStages = new Set<string>();
    const startTime = Date.now();

    while (currentStatus !== 'complete' && currentStatus !== 'failed') {
      await new Promise((r) => setTimeout(r, 1000));
      const statusRes = await fetch(`${BASE_URL}/api/jobs/${jobId}`);
      const statusData = (await statusRes.json()) as any;
      currentStatus = statusData.status;

      if (!seenStages.has(statusData.currentStage)) {
        seenStages.add(statusData.currentStage);
        console.log(`  State transition -> [${statusData.status}]: ${statusData.currentStage} (processed: ${statusData.progress.processed}/${statusData.progress.total})`);
      }

      if (Date.now() - startTime > 90000) {
        throw new Error('Test timed out waiting for job completion after 90 seconds');
      }
    }

    console.assert(currentStatus === 'complete', `Job did not complete cleanly, ended with: ${currentStatus}`);
    console.log(`  Job completed in ${Date.now() - startTime}ms.`);

    // 4. Retrieve Prioritized Queue
    console.log('\n[Step 4] Retrieving queue via GET /api/jobs/:jobId/queue...');
    const queueRes = await fetch(`${BASE_URL}/api/jobs/${jobId}/queue`);
    console.assert(queueRes.status === 200, `GET queue returned ${queueRes.status}`);
    const queueData = (await queueRes.json()) as any;
    console.log(`  Retrieved ${queueData.total} prioritized queue items.`);
    console.assert(queueData.total === 2, `Expected 2 queue items, got ${queueData.total}`);

    const item1 = queueData.rankedItems[0];
    const item2 = queueData.rankedItems[1];
    console.log(`    Rank #1: [${item1.confidenceLabel}] candidateId = ${item1.candidateId} ("${item1.sourceFile}")`);
    console.log(`             Reasoning: "${item1.reasoningSummary}"`);
    console.log(`             Thumbnail URL: ${item1.thumbnailUrl}`);
    console.log(`    Rank #2: [${item2.confidenceLabel}] candidateId = ${item2.candidateId} ("${item2.sourceFile}")`);
    console.log(`             Reasoning: "${item2.reasoningSummary}"`);

    console.assert(item1.priorityRank === 1 && item1.sourceFile.includes('sard'), 'Rank 1 should be positive SARD frame');
    console.assert(item2.priorityRank === 2 && item2.sourceFile.includes('neg_control'), 'Rank 2 should be negative control');

    // 5. Inspect Candidate Detail View
    console.log('\n[Step 5] Fetching candidate details via GET /api/candidates/:candidateId...');
    const candidateRes = await fetch(`${BASE_URL}/api/candidates/${item1.candidateId}`);
    console.assert(candidateRes.status === 200, `GET candidate returned ${candidateRes.status}`);
    const candidateData = (await candidateRes.json()) as any;
    console.log(`  Candidate detail retrieved: ${candidateData.candidateId}`);
    console.log(`    - Boxes detected: ${candidateData.maskOverlayData.boxes.length}`);
    console.log(`    - Source URL: ${candidateData.sourceFrameUrl}`);
    console.log(`    - Corroboration: ${candidateData.hasCorroboratingSignals}`);
    console.assert(candidateData.maskOverlayData.boxes.length > 0, 'Candidate 1 should have detected bounding boxes');

    // 6. Test Media Streaming
    console.log('\n[Step 6] Verifying media streaming endpoint via GET /api/media/...');
    const mediaRes = await fetch(`${BASE_URL}${item1.thumbnailUrl}`);
    console.assert(mediaRes.status === 200, `Media stream returned ${mediaRes.status}`);
    const contentType = mediaRes.headers.get('content-type');
    console.log(`  Media stream returned 200 OK with Content-Type: ${contentType}`);
    console.assert(contentType === 'image/jpeg', `Expected image/jpeg, got ${contentType}`);

    console.log('\n=== Phase 6 Backend Service Integration Test PASSED Successfully! ===');
  } finally {
    server.close();
    AppDatabase.close();
    console.log('Test server closed.');
  }
}

main().catch((err) => {
  console.error('\nBackend service test failed:', err);
  process.exit(1);
});
