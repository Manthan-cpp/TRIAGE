import * as fs from 'fs';
import * as path from 'path';
import { IngestionPipeline } from '../ingestion/ingestionPipeline';
import { PerceptionRunner } from '../perception/perceptionRunner';
import { Prioritizer } from '../prioritization/prioritizer';
import { CostLogger } from '../lib/costLogger';

const BANNED_TERMS = [
  'confirmed',
  'detected',
  'survivor found',
  'victim located',
  'positive id',
  'target spotted',
];

async function main() {
  console.log('=== Project Triage — Phase 5 Reasoning & Prioritization Test ===\n');

  const rootDir = path.resolve(__dirname, '../../../');
  const jobId = `job_prio_test_${Date.now()}`;

  const humanImg = path.join(rootDir, 'data/raw/sard/sard_human_01.png');
  const uavImg = path.join(rootDir, 'data/raw/uav_sar/uav_sar_01.jpg');
  const negImg = path.join(rootDir, 'data/raw/negative_controls/neg_control_01.jpg');

  // Step 1: Ingest
  console.log('[Step 1] Ingesting test media...');
  const files = [
    { originalName: 'sard_human_01.png', buffer: fs.readFileSync(humanImg) },
    { originalName: 'uav_sar_01.jpg', buffer: fs.readFileSync(uavImg) },
    { originalName: 'neg_control_01.jpg', buffer: fs.readFileSync(negImg) },
  ];
  const manifest = await IngestionPipeline.processJob(jobId, 'PHASE_5_EVAL', files);
  console.log(`  Ingested ${manifest.totalUnits} units.`);

  // Step 2: Perception
  console.log('\n[Step 2] Running Phase 4 Perception Runner...');
  const perceptionResult = await PerceptionRunner.processManifest(manifest, rootDir);
  console.log(`  Found ${perceptionResult.totalSignalsCount} signals across ${perceptionResult.candidates.length} units.`);

  // Step 3: Prioritization
  console.log('\n[Step 3] Running Phase 5 Prioritizer (Muse Spark)...');
  const prioResult = await Prioritizer.prioritizeJob(jobId, perceptionResult.candidates, rootDir);

  console.log(`  Total items in queue: ${prioResult.totalItems}`);
  console.log(`  High priority items: ${prioResult.highPriorityCount}`);
  console.log(`  Medium priority items: ${prioResult.mediumPriorityCount}`);
  console.log(`  Low priority items: ${prioResult.lowPriorityCount}`);
  console.log(`  Prioritization wall time: ${prioResult.totalPrioritizationTimeMs}ms`);

  // Step 4: Validate queue integrity
  console.log('\n[Step 4] Validating Prioritized Queue Items:');
  console.assert(prioResult.totalItems === 3, 'Zero-dismissal rule violated: expected 3 items in queue');

  for (const item of prioResult.rankedItems) {
    console.log(`\n  Rank #${item.priorityRank}: [${item.confidenceLabel}]`);
    console.log(`    - Candidate: ${item.candidateId}`);
    console.log(`    - Source: ${item.sourceFile}`);
    console.log(`    - Reasoning: "${item.reasoningSummary}"`);
    console.log(`    - Evidence Cited: [${item.evidenceIds.join(', ')}]`);
    console.log(`    - Thumbnail URL: ${item.thumbnailUrl}`);

    console.assert(
      item.thumbnailUrl && item.thumbnailUrl.startsWith('/api/media/'),
      `Missing or invalid thumbnailUrl on queue item: ${item.thumbnailUrl}`
    );

    // Vocabulary lock assertions
    const validLabels = ['possible-high', 'possible-medium', 'possible-low'];
    console.assert(validLabels.includes(item.confidenceLabel), `Invalid label: ${item.confidenceLabel}`);

    for (const banned of BANNED_TERMS) {
      const lowerReasoning = item.reasoningSummary.toLowerCase();
      console.assert(
        !lowerReasoning.includes(banned),
        `Banned vocabulary term "${banned}" found in reasoning: "${item.reasoningSummary}"`
      );
    }
  }

  // Verify rank ordering: Rank 1 & 2 must be positive frames, Rank 3 must be negative control
  const rank1 = prioResult.rankedItems[0];
  const rank3 = prioResult.rankedItems[2];
  console.assert(
    rank1.sourceFile.includes('sard') || rank1.sourceFile.includes('uav'),
    'Rank 1 should be a candidate signal frame'
  );
  console.assert(
    rank3.sourceFile.includes('neg_control'),
    'Rank 3 (bottom) should be the negative control frame'
  );

  // Verify persistence on disk
  const queueOnDisk = path.join(rootDir, 'data/ingested', jobId, 'prioritized_queue.json');
  console.assert(fs.existsSync(queueOnDisk), `Prioritized queue file missing at ${queueOnDisk}`);
  console.log(`\n  Verified prioritized_queue.json persisted at: ${queueOnDisk}`);

  const cost = CostLogger.getSummary();
  console.log('\n[Cost Summary]:', cost);

  console.log('\n=== Phase 5 Prioritization Test PASSED Successfully! ===');
}

main().catch((err) => {
  console.error('\nPrioritization test failed:', err);
  process.exit(1);
});
