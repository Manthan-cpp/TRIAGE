import { IngestionPipeline, IngestionInputFile } from '../ingestion/ingestionPipeline';
import { PerceptionRunner } from '../perception/perceptionRunner';
import { Prioritizer } from '../prioritization/prioritizer';
import { JobRepository } from '../storage/jobRepository';

export class JobQueue {
  /**
   * Submit an ingestion job to the background processing queue.
   * Asynchronous: returns immediately after registering the job record.
   */
  public static enqueueJob(
    jobId: string,
    sourceLabel: string,
    files: IngestionInputFile[],
    videoFps = 1
  ): void {
    // Record initial queued state
    JobRepository.createJob(jobId, sourceLabel);

    // Run pipeline in background without awaiting
    setImmediate(async () => {
      try {
        await this.runPipeline(jobId, sourceLabel, files, videoFps);
      } catch (err: any) {
        console.error(`[JobQueue] Fatal error on job ${jobId}:`, err);
        JobRepository.updateStatus(jobId, 'failed', 'Pipeline processing error', err.message);
      }
    });
  }

  /**
   * Sequential state machine executor for a single job.
   */
  private static async runPipeline(
    jobId: string,
    sourceLabel: string,
    files: IngestionInputFile[],
    videoFps: number
  ): Promise<void> {
    // Stage 1: Ingestion
    JobRepository.updateStatus(jobId, 'ingesting', 'Validating media and sampling frames...');
    const manifest = await IngestionPipeline.processJob(jobId, sourceLabel, files, videoFps);
    
    JobRepository.updateProgress(
      jobId,
      0,
      manifest.totalUnits,
      `Ingested ${manifest.totalUnits} frames. Starting candidate segmentation...`
    );

    // Stage 2: Perception (SAM 3.1)
    JobRepository.updateStatus(jobId, 'detecting', `Segmenting candidate signals across ${manifest.totalUnits} frames...`);
    const perceptionResult = await PerceptionRunner.processManifest(manifest);
    
    // Save structured candidates to DB
    JobRepository.saveCandidates(jobId, perceptionResult.candidates);
    JobRepository.updateProgress(
      jobId,
      manifest.totalUnits,
      manifest.totalUnits,
      `Detected ${perceptionResult.totalSignalsCount} visual signals. Proceeding to prioritization...`
    );

    // Stage 3: Prioritization (Muse Spark)
    JobRepository.updateStatus(jobId, 'ranking', 'Running comparative batch prioritization with Muse Spark...');
    const prioResult = await Prioritizer.prioritizeJob(jobId, perceptionResult.candidates);

    // Save final ranked queue to DB
    JobRepository.saveQueue(jobId, prioResult.rankedItems);

    // Stage 4: Complete
    JobRepository.updateStatus(
      jobId,
      'complete',
      `Triage complete. ${prioResult.totalItems} clips prioritized into human review queue.`
    );
  }
}
