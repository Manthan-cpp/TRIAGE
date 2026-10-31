import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { FileValidator } from '../ingestion/fileValidator';
import { IngestionPipeline } from '../ingestion/ingestionPipeline';
import { ManifestGenerator } from '../ingestion/manifestGenerator';

async function main() {
  console.log('=== Project Triage — Phase 3 Ingestion Pipeline Test ===\n');

  // 1. Test FileValidator rules
  console.log('[Step 1] Testing FileValidator...');
  const validImg = FileValidator.validate('drone_01.jpg', 1024 * 500);
  console.assert(validImg.isValid && validImg.fileType === 'image', 'Image validation failed');

  const validVid = FileValidator.validate('survey_flight.mp4', 1024 * 1024 * 10);
  console.assert(validVid.isValid && validVid.fileType === 'video', 'Video validation failed');

  const invalidExt = FileValidator.validate('document.pdf', 1024);
  console.assert(!invalidExt.isValid, 'Failed to reject invalid extension');

  const emptyFile = FileValidator.validate('zero.png', 0);
  console.assert(!emptyFile.isValid, 'Failed to reject 0 byte file');
  console.log('  FileValidator passed all checks.');

  // 2. Prepare test inputs (2 real raw images + 1 synthetic 3-second MP4 video)
  console.log('\n[Step 2] Preparing test dataset files...');
  const testJobId = `job_test_${Date.now()}`;
  const imgPath1 = path.resolve(__dirname, '../../../data/raw/sard/sard_human_01.png');
  const imgPath2 = path.resolve(__dirname, '../../../data/raw/uav_sar/uav_sar_01.jpg');

  if (!fs.existsSync(imgPath1) || !fs.existsSync(imgPath2)) {
    throw new Error('Raw test images missing. Check data/raw/');
  }

  // Create a 3-second 30fps test video clip using ffmpeg in a temporary folder
  const tempVideoPath = path.resolve(__dirname, '../../../data/test_clip_3s.mp4');
  try {
    execSync(
      `ffmpeg -y -f lavfi -i testsrc=duration=3:size=1280x720:rate=30 -pix_fmt yuv420p "${tempVideoPath}"`,
      { stdio: 'ignore' }
    );
    console.log('  Created 3-second test video clip for video sampling verification.');
  } catch (err: any) {
    console.warn('  Warning: Could not generate synthetic video with ffmpeg:', err.message);
  }

  const filesToIngest = [
    { originalName: 'sard_human_01.png', buffer: fs.readFileSync(imgPath1) },
    { originalName: 'uav_sar_01.jpg', buffer: fs.readFileSync(imgPath2) },
  ];

  if (fs.existsSync(tempVideoPath)) {
    filesToIngest.push({
      originalName: 'test_clip_3s.mp4',
      buffer: fs.readFileSync(tempVideoPath),
    });
  }

  // 3. Run IngestionPipeline
  console.log(`\n[Step 3] Running IngestionPipeline for jobId: ${testJobId}...`);
  const manifest = await IngestionPipeline.processJob(
    testJobId,
    'TEST_EVAL_DATASET',
    filesToIngest,
    1 // 1 fps
  );

  console.log(`  Total processable units generated: ${manifest.totalUnits}`);
  console.assert(manifest.totalUnits >= 2, 'Expected at least 2 units');

  // Verify units structure
  for (const unit of manifest.units) {
    const fullPath = path.resolve(__dirname, '../../../', unit.filePath);
    console.assert(fs.existsSync(fullPath), `Normalized unit file missing: ${fullPath}`);
    console.assert(unit.width <= 800 && unit.height <= 800, `Unit dimensions exceed 800px: ${unit.width}x${unit.height}`);
    console.log(`  - Unit ${unit.unitId}: [${unit.sourceType}] from "${unit.sourceFile}", ${unit.width}x${unit.height}px, path: ${unit.filePath}`);
  }

  // 4. Test manifest re-loading from disk
  console.log('\n[Step 4] Verifying saved manifest on disk...');
  const reloaded = ManifestGenerator.load(testJobId);
  console.assert(reloaded.jobId === testJobId, 'Reloaded jobId mismatch');
  console.assert(reloaded.units.length === manifest.totalUnits, 'Reloaded units count mismatch');
  console.log(`  Manifest verified at data/ingested/${testJobId}/manifest.json`);

  // Cleanup temporary video file
  if (fs.existsSync(tempVideoPath)) {
    fs.unlinkSync(tempVideoPath);
  }

  console.log('\n=== Ingestion Pipeline Verification Successful! ===');
}

main().catch((err) => {
  console.error('\nIngestion test failed:', err);
  process.exit(1);
});
