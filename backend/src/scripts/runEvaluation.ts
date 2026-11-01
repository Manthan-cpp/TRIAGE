import * as fs from 'fs';
import * as path from 'path';
import { IngestionPipeline, IngestionInputFile } from '../ingestion/ingestionPipeline';
import { PerceptionRunner } from '../perception/perceptionRunner';
import { Prioritizer } from '../prioritization/prioritizer';
import { CostLogger } from '../lib/costLogger';

interface RawManifestItem {
  id: string;
  filename: string;
  dataset: string;
  category: 'light_occlusion' | 'heavy_occlusion' | 'negative_control';
  relative_path: string;
  ground_truth_has_person: boolean;
}

async function runEvaluation() {
  console.log('=== Project Triage — Phase 9 Full-Scale Evaluation & Calibration ===\n');

  const rootDir = path.resolve(__dirname, '../../../');
  const rawManifestPath = path.join(rootDir, 'data/raw/manifest.json');

  if (!fs.existsSync(rawManifestPath)) {
    throw new Error(`Raw dataset manifest not found at ${rawManifestPath}`);
  }

  const rawManifest = JSON.parse(fs.readFileSync(rawManifestPath, 'utf8'));
  const items: RawManifestItem[] = rawManifest.items;

  console.log(`Loaded dataset manifest with ${items.length} units:`);
  console.log(`  - Light Occlusion: ${items.filter(i => i.category === 'light_occlusion').length}`);
  console.log(`  - Heavy Occlusion: ${items.filter(i => i.category === 'heavy_occlusion').length}`);
  console.log(`  - Negative Controls: ${items.filter(i => i.category === 'negative_control').length}\n`);

  // Build input files for ingestion
  const inputFiles: IngestionInputFile[] = [];
  const itemMap = new Map<string, RawManifestItem>();

  for (const item of items) {
    const fullPath = path.join(rootDir, 'data/raw', item.relative_path);
    if (fs.existsSync(fullPath)) {
      const buf = fs.readFileSync(fullPath);
      inputFiles.push({ originalName: item.filename, buffer: buf });
      itemMap.set(item.filename, item);
    }
  }

  console.log(`[Step 1] Ingesting ${inputFiles.length} files...`);
  const jobId = `job_eval_phase9_${Date.now()}`;
  const manifest = await IngestionPipeline.processJob(jobId, 'Phase 9 Ground Truth Evaluation', inputFiles);
  console.log(`  Manifest generated with ${manifest.totalUnits} normalized units.`);

  console.log('\n[Step 2] Executing Perception Layer with SAM 3.1 & Dampener...');
  const perceptionResult = await PerceptionRunner.processManifest(manifest, rootDir);
  console.log(`  Perception complete in ${perceptionResult.totalPerceptionTimeMs}ms.`);
  console.log(`  Total candidate signals: ${perceptionResult.totalSignalsCount}`);
  console.log(`  Dampened candidate units: ${perceptionResult.dampenedUnitsCount}`);

  console.log('\n[Step 3] Executing Comparative Prioritization with Muse Spark 1.3...');
  const prioResult = await Prioritizer.prioritizeJob(jobId, perceptionResult.candidates);
  console.log(`  Prioritization complete. Ranked ${prioResult.totalItems} items.\n`);

  // Compute evaluation metrics against ground truth
  console.log('=== Ground Truth Evaluation Metrics ===\n');

  let lightHits = 0, lightTotal = 0;
  let heavyHits = 0, heavyTotal = 0;
  let negFalseAlarms = 0, negTotal = 0;

  for (const cand of perceptionResult.candidates) {
    const raw = itemMap.get(cand.sourceFile);
    if (!raw) continue;

    const hasSignals = cand.totalBoxesCount > 0 && !cand.dampening.isDampened;

    if (raw.category === 'light_occlusion') {
      lightTotal++;
      if (hasSignals) lightHits++;
    } else if (raw.category === 'heavy_occlusion') {
      heavyTotal++;
      if (hasSignals) heavyHits++;
    } else if (raw.category === 'negative_control') {
      negTotal++;
      if (cand.totalBoxesCount > 0 && !cand.dampening.isDampened) negFalseAlarms++;
    }
  }

  const top10 = prioResult.rankedItems.slice(0, 10);
  const top10TruePositives = top10.filter(item => {
    const raw = itemMap.get(item.sourceFile);
    return raw?.ground_truth_has_person === true;
  }).length;

  const top10Precision = (top10TruePositives / Math.min(10, top10.length)) * 100;

  console.log(`1. Detection Recall (Strict Post-Dampening):`);
  console.log(`   - Light Occlusion: ${lightHits} / ${lightTotal} (${((lightHits / (lightTotal || 1)) * 100).toFixed(1)}%)`);
  console.log(`   - Heavy Occlusion: ${heavyHits} / ${heavyTotal} (${((heavyHits / (heavyTotal || 1)) * 100).toFixed(1)}%)`);
  console.log(`   - Negative False Alarm Rate: ${negFalseAlarms} / ${negTotal} (${((negFalseAlarms / (negTotal || 1)) * 100).toFixed(1)}%)`);

  console.log(`\n2. Prioritized Queue Ranking Efficacy:`);
  console.log(`   - Top-10 True Positive Yield: ${top10TruePositives} / 10 (${top10Precision.toFixed(1)}% Precision@10)`);

  console.log(`\n3. Top-10 Rank Roster:`);
  for (const item of top10) {
    const raw = itemMap.get(item.sourceFile);
    const gt = raw?.ground_truth_has_person ? 'TRUE POSITIVE' : 'FALSE POSITIVE';
    console.log(`   Rank #${item.priorityRank} [${item.confidenceLabel}]: ${item.sourceFile} (${gt}) — ${item.reasoningSummary}`);
  }

  const cost = CostLogger.getSummary();
  console.log(`\n4. Cumulative API Telemetry:`);
  console.log(`   - Total API Calls: ${cost.totalCalls}`);
  console.log(`   - Total Estimated Cost: $${cost.totalCost.toFixed(4)} USD`);

  return {
    jobId,
    totalUnits: manifest.totalUnits,
    lightHits,
    lightTotal,
    heavyHits,
    heavyTotal,
    negFalseAlarms,
    negTotal,
    top10Precision,
    top10TruePositives,
    rankedItems: prioResult.rankedItems,
    costSummary: cost,
  };
}

runEvaluation().catch((err) => {
  console.error('Phase 9 evaluation failed:', err);
  process.exit(1);
});
