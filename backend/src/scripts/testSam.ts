import fs from 'fs';
import path from 'path';
import { Sam31Client } from '../perception/sam31Client';
import { CostLogger } from '../lib/costLogger';

async function main() {
  console.log('=== Phase 2.2: SAM 3.1 Backend Connectivity Test ===');
  
  const testImagePath = path.resolve(__dirname, '../../../data/raw/sard/sard_human_01.png');
  if (!fs.existsSync(testImagePath)) {
    throw new Error(`Test image not found at ${testImagePath}`);
  }

  const base64Data = fs.readFileSync(testImagePath).toString('base64');
  console.log(`Loaded test image (size=${base64Data.length} chars)`);

  const prompt = 'person';
  console.log(`Calling SAM 3.1 with concept prompt "${prompt}"...`);

  const result = await Sam31Client.segmentConcept(base64Data, prompt);

  console.log('--- SAM 3.1 Result ---');
  console.log(`Prompt: "${result.prompt}"`);
  console.log(`Latency: ${result.latencyMs}ms`);
  console.log(`Boxes Detected: ${result.boxes.length}`);
  console.log('Box Coordinates:', result.boxes);
  console.log(`Mask Count: ${result.maskCount}`);

  const cost = CostLogger.getSummary();
  console.log('Cost Log Summary:', cost);

  if (result.boxes.length === 0) {
    throw new Error('SAM 3.1 returned zero detections for a known person frame.');
  }

  console.log('✅ Phase 2.2 Test PASSED: SAM 3.1 successfully callable from backend code.');
}

main().catch((err) => {
  console.error('❌ Phase 2.2 Test FAILED:', err);
  process.exit(1);
});
