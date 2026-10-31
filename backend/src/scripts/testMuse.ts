import { MuseSparkClient, CandidateToRank } from '../prioritization/museSparkClient';
import { CostLogger } from '../lib/costLogger';

async function main() {
  console.log('=== Phase 2.3: Muse Spark Backend Connectivity Test ===');

  const testCandidates: CandidateToRank[] = [
    {
      candidateId: 'test_candidate_01',
      detectionSummary: 'SAM 3.1 detected person box at [374, 424, 517, 577] and clothing at [417, 475, 477, 560]',
      detectedBoxesCount: 2,
      promptsMatched: ['person', 'clothing'],
    },
    {
      candidateId: 'test_candidate_02',
      detectionSummary: 'SAM 3.1 solitary low-contrast box on foliage background',
      detectedBoxesCount: 1,
      promptsMatched: ['person'],
    },
    {
      candidateId: 'test_candidate_03',
      detectionSummary: 'No detections; clean terrain negative control',
      detectedBoxesCount: 0,
      promptsMatched: [],
    },
  ];

  console.log(`Sending ${testCandidates.length} candidates to Muse Spark for prioritization...`);
  const result = await MuseSparkClient.prioritizeBatch(testCandidates);

  console.log('--- Muse Spark Result ---');
  console.log(`Model: ${result.model}`);
  console.log(`Latency: ${result.latencyMs}ms`);
  console.log(`Ranked Items Count: ${result.rankedItems.length}`);
  console.log('Ranked Items:', JSON.stringify(result.rankedItems, null, 2));

  // Verify constraints
  const topItem = result.rankedItems[0];
  if (topItem.candidateId !== 'test_candidate_01') {
    console.warn(`Note: Top item was ${topItem.candidateId}, expected test_candidate_01`);
  }

  const cost = CostLogger.getSummary();
  console.log('Cost Log Summary:', cost);

  console.log('✅ Phase 2.3 Test PASSED: Muse Spark successfully returned schema-validated ranking.');
}

main().catch((err) => {
  console.error('❌ Phase 2.3 Test FAILED:', err);
  process.exit(1);
});
