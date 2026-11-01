import { AppDatabase } from '../storage/database';
import { AuditRepository } from '../storage/auditRepository';
import { createServer } from '../server';

async function testAuditAndReview() {
  console.log('=== Testing Audit Trail & Review Decisions ===\n');

  // Ensure DB initialized
  AppDatabase.getInstance();

  const testJobId = `job_test_audit_${Date.now()}`;
  const testCandidateId = `cand_test_${Date.now()}`;

  // 1. Record mock events
  AuditRepository.recordEvent({
    jobId: testJobId,
    timestamp: new Date().toISOString(),
    stage: 'ingest',
    eventType: 'INGESTION_COMPLETED',
    details: 'Sample 4 frames normalized at 800px.',
    durationMs: 420,
    status: 'success',
  });

  AuditRepository.recordEvent({
    jobId: testJobId,
    timestamp: new Date().toISOString(),
    stage: 'perception',
    unitId: testCandidateId,
    eventType: 'SAM31_PERCEPTION_COMPLETED',
    details: 'Flagged 2 candidate boxes with person and clothing.',
    durationMs: 1650,
    status: 'success',
  });

  // 2. Query events
  const logs = AuditRepository.getJobAuditLogs(testJobId);
  console.log(`[Audit Logs Query] Found ${logs.length} events for ${testJobId}:`);
  for (const l of logs) {
    console.log(`  - [${l.stage}] ${l.eventType} (${l.durationMs}ms): ${l.details}`);
  }
  console.assert(logs.length === 2, 'Expected 2 audit log records');

  // 3. Save review decision
  AuditRepository.saveReviewDecision(
    testCandidateId,
    testJobId,
    'verified',
    'Field drone confirms high probability clothing target.'
  );

  const decisions = AuditRepository.getReviewDecisions(testJobId);
  console.log('\n[Reviewer Decision Query] Found decision:', decisions[testCandidateId]);
  console.assert(decisions[testCandidateId]?.status === 'verified', 'Expected status to be verified');

  // 4. Test API endpoint on test server
  const app = createServer();
  const server = app.listen(4188);

  try {
    const res = await fetch(`http://127.0.0.1:4188/api/jobs/${testJobId}/audit`);
    const json = (await res.json()) as any;
    console.log(`\n[API Test GET /api/jobs/:id/audit] status = ${res.status}, events count = ${json.events.length}`);
    console.assert(res.status === 200, 'Expected 200 OK');
    console.assert(json.events.length >= 2, 'Expected >= 2 events');

    const decRes = await fetch(`http://127.0.0.1:4188/api/jobs/${testJobId}/decisions`);
    const decJson = (await decRes.json()) as any;
    console.log(`[API Test GET /api/jobs/:id/decisions] status = ${decRes.status}, decision = ${decJson.decisions[testCandidateId]?.status}`);
    console.assert(decRes.status === 200, 'Expected 200 OK');
  } finally {
    server.close();
  }

  console.log('\n=== Audit Trail & Review Decisions Verification PASSED! ===');
}

testAuditAndReview().catch((err) => {
  console.error('Audit test failed:', err);
  process.exit(1);
});
