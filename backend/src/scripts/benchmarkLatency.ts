/**
 * Latency benchmark: Sequential (old) vs Parallel (new) SAM calls.
 * Run: npm run benchmark:latency
 *
 * Measures wall-clock time for both approaches on the same test image.
 * Reports savings in ms and %.
 */
import * as fs from 'fs';
import * as path from 'path';
import { Sam31Client } from '../perception/sam31Client';
import { MetaClient } from '../lib/metaClient';

const TEST_IMAGE = path.resolve(__dirname, '../../../data/raw/uav_sar/uav_sar_01.jpg');
const PROMPTS = ['person', 'clothing'];

async function runSequential(imageBuffer: Buffer): Promise<number> {
  console.log('\n[SEQUENTIAL] Running prompts one at a time...');
  const imageDataUrl = await Sam31Client.resizeImage(imageBuffer);
  const start = Date.now();
  for (const prompt of PROMPTS) {
    const result = await Sam31Client.segmentConcept(imageDataUrl, prompt);
    console.log(`  "${prompt}" → ${result.boxes.length} boxes, ${result.latencyMs}ms`);
  }
  const elapsed = Date.now() - start;
  console.log(`  Sequential wall time: ${elapsed}ms`);
  return elapsed;
}

async function runParallel(imageBuffer: Buffer): Promise<number> {
  console.log('\n[PARALLEL] Running prompts concurrently (Promise.all)...');
  const start = Date.now();
  const result = await Sam31Client.segmentFrame(imageBuffer, PROMPTS);
  result.perPrompt.forEach((r) => {
    console.log(`  "${r.prompt}" → ${r.boxes.length} boxes, ${r.latencyMs}ms`);
  });
  const elapsed = result.wallTimeMs;
  console.log(`  Parallel wall time: ${elapsed}ms`);
  return elapsed;
}

async function main() {
  console.log('=== Project Triage — Latency Benchmark ===');
  console.log(`Test image: ${TEST_IMAGE}`);

  if (!fs.existsSync(TEST_IMAGE)) {
    // Fall back to any available test image
    const fallbacks = [
      path.resolve(__dirname, '../../../data/raw/sard/sard_human_01.png'),
    ];
    let found = '';
    for (const fb of fallbacks) {
      if (fs.existsSync(fb)) { found = fb; break; }
    }
    if (!found) {
      console.error('No test image found. Run Phase 0 data setup first.');
      process.exit(1);
    }
    console.log(`Falling back to: ${found}`);
  }

  const imagePath = fs.existsSync(TEST_IMAGE) ? TEST_IMAGE
    : path.resolve(__dirname, '../../../data/raw/sard/sard_human_01.png');
  const imageBuffer = fs.readFileSync(imagePath);

  // Measure original image size
  const originalSizeKB = Math.round(imageBuffer.length / 1024);
  const resized = await Sam31Client.resizeImage(imageBuffer);
  const resizedSizeKB = Math.round(Buffer.from(resized.split(',')[1], 'base64').length / 1024);
  console.log(`\nPayload size: original=${originalSizeKB}KB → resized=${resizedSizeKB}KB (${Math.round(100 - (resizedSizeKB / originalSizeKB) * 100)}% reduction)`);

  const seqMs = await runSequential(imageBuffer);
  const parMs = await runParallel(imageBuffer);

  const savingMs = seqMs - parMs;
  const savingPct = Math.round((savingMs / seqMs) * 100);

  console.log('\n=== BENCHMARK RESULTS ===');
  console.log(`Sequential: ${seqMs}ms`);
  console.log(`Parallel:   ${parMs}ms`);
  console.log(`Saving:     ${savingMs}ms (${savingPct}% faster)`);

  if (savingPct < 10) {
    console.log('\nNote: Small saving suggests API may be rate-limiting parallel calls.');
  } else {
    console.log('\nParallel strategy confirmed effective.');
  }
}

main().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
