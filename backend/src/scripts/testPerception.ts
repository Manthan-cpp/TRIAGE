import * as fs from 'fs';
import * as path from 'path';
import { IngestionPipeline } from '../ingestion/ingestionPipeline';
import { PerceptionRunner } from '../perception/perceptionRunner';
import { CostLogger } from '../lib/costLogger';

async function main() {
  console.log('=== Project Triage — Phase 4 Perception Layer Test ===\n');

  const rootDir = path.resolve(__dirname, '../../../');
  const jobId = `job_perception_test_${Date.now()}`;

  const humanImg = path.join(rootDir, 'data/raw/sard/sard_human_01.png');
  const uavImg = path.join(rootDir, 'data/raw/uav_sar/uav_sar_01.jpg');
  const negImg = path.join(rootDir, 'data/raw/negative_controls/neg_control_01.jpg');

  if (!fs.existsSync(humanImg) || !fs.existsSync(uavImg) || !fs.existsSync(negImg)) {
    throw new Error('Test dataset images missing in data/raw/');
  }

  // 1. Ingest test dataset
  console.log('[Step 1] Ingesting test frames (1 SARD positive, 1 UAV positive, 1 Negative control)...');
  const filesToIngest = [
    { originalName: 'sard_human_01.png', buffer: fs.readFileSync(humanImg) },
    { originalName: 'uav_sar_01.jpg', buffer: fs.readFileSync(uavImg) },
    { originalName: 'neg_control_01.jpg', buffer: fs.readFileSync(negImg) },
  ];

  const manifest = await IngestionPipeline.processJob(jobId, 'PHASE_4_EVAL', filesToIngest);
  console.log(`  Ingested ${manifest.totalUnits} units for job: ${jobId}`);

  // 2. Run PerceptionRunner
  console.log('\n[Step 2] Running PerceptionRunner with SAM 3.1 & FalsePositiveDampener...');
  const result = await PerceptionRunner.processManifest(manifest, rootDir);

  console.log(`  Total units processed: ${result.totalUnitsProcessed}`);
  console.log(`  Units with detections: ${result.unitsWithDetections}`);
  console.log(`  Dampened units count: ${result.dampenedUnitsCount}`);
  console.log(`  Total candidate signals found: ${result.totalSignalsCount}`);
  console.log(`  Wall-clock perception time: ${result.totalPerceptionTimeMs}ms`);

  // 3. Verify candidates
  console.log('\n[Step 3] Verifying Candidate Records:');
  for (const c of result.candidates) {
    console.log(`\n  Candidate [${c.candidateId}] from "${c.sourceFile}":`);
    console.log(`    - Matched Prompts: [${c.matchedPrompts.join(', ')}]`);
    console.log(`    - Total Boxes: ${c.totalBoxesCount}`);
    console.log(`    - Corroborating Signals: ${c.hasCorroboratingSignals}`);
    console.log(`    - Dampened: ${c.dampening.isDampened} (${c.dampening.reason || 'none'})`);
    console.log(`    - Dampening Score: ${c.dampening.dampeningScore}`);
  }

  // Assertions
  console.assert(result.totalUnitsProcessed === 3, 'Should process exactly 3 units');
  console.assert(result.unitsWithDetections >= 1, 'At least 1 positive unit should have detections');

  const candidatesOnDisk = path.join(rootDir, 'data/ingested', jobId, 'candidates.json');
  console.assert(fs.existsSync(candidatesOnDisk), `Candidates file missing at ${candidatesOnDisk}`);

  const cost = CostLogger.getSummary();
  console.log('\n[Cost Summary]:', cost);

  console.log('\n=== Phase 4 Perception Test PASSED Successfully! ===');
}

main().catch((err) => {
  console.error('\nPerception test failed:', err);
  process.exit(1);
});
