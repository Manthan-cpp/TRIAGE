import { IngestionPipeline, IngestionInputFile } from '../ingestion/ingestionPipeline';
import { PerceptionRunner } from '../perception/perceptionRunner';
import { Prioritizer } from '../prioritization/prioritizer';
import { JobRepository } from '../storage/jobRepository';
import { AuditRepository } from '../storage/auditRepository';

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
    AuditRepository.recordEvent({
      jobId,
      timestamp: new Date().toISOString(),
      stage: 'ingest',
      eventType: 'JOB_ENQUEUED',
      details: `Batch "${sourceLabel}" queued with ${files.length} input file(s).`,
      status: 'info',
    });

    // Run pipeline in background without awaiting
    setImmediate(async () => {
      try {
        await this.runPipeline(jobId, sourceLabel, files, videoFps);
      } catch (err: any) {
        console.error(`[JobQueue] Fatal error on job ${jobId}:`, err);
        JobRepository.updateStatus(jobId, 'failed', 'Pipeline processing error', err.message);
        AuditRepository.recordEvent({
          jobId,
          timestamp: new Date().toISOString(),
          stage: 'system',
          eventType: 'JOB_FAILED',
          details: `Pipeline failure: ${err.message}`,
          status: 'error',
        });
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
    const jobStart = Date.now();

    // Stage 1: Ingestion
    const ingestStart = Date.now();
    JobRepository.updateStatus(jobId, 'ingesting', 'Validating media and sampling frames...');
    const manifest = await IngestionPipeline.processJob(jobId, sourceLabel, files, videoFps);
    const ingestDuration = Date.now() - ingestStart;

    AuditRepository.recordEvent({
      jobId,
      timestamp: new Date().toISOString(),
      stage: 'ingest',
      eventType: 'INGESTION_COMPLETED',
      details: `Normalized ${manifest.totalUnits} processable frame(s) at 800px max dimension.`,
      durationMs: ingestDuration,
      status: 'success',
    });
    
    JobRepository.updateProgress(
      jobId,
      0,
      manifest.totalUnits,
      `Ingested ${manifest.totalUnits} frames. Starting candidate segmentation...`
    );

    // Stage 2: Perception (SAM 3.1)
    const perceptionStart = Date.now();
    JobRepository.updateStatus(jobId, 'detecting', `Segmenting candidate signals across ${manifest.totalUnits} frames...`);
    const perceptionResult = await PerceptionRunner.processManifest(manifest);
    const perceptionDuration = Date.now() - perceptionStart;
    
    // Save structured candidates to DB
    JobRepository.saveCandidates(jobId, perceptionResult.candidates);

    AuditRepository.recordEvent({
      jobId,
      timestamp: new Date().toISOString(),
      stage: 'perception',
      eventType: 'SAM31_PERCEPTION_COMPLETED',
      details: `Segmented ${perceptionResult.totalSignalsCount} candidate signal(s) across ${manifest.totalUnits} frames. Dampened: ${perceptionResult.candidates.filter(c => c.dampening.isDampened).length}.`,
      durationMs: perceptionDuration,
      status: 'success',
    });

    JobRepository.updateProgress(
      jobId,
      manifest.totalUnits,
      manifest.totalUnits,
      `Detected ${perceptionResult.totalSignalsCount} visual signals. Proceeding to prioritization...`
    );

    // Stage 3: Prioritization (Muse Spark)
    const prioStart = Date.now();
    JobRepository.updateStatus(jobId, 'ranking', 'Running comparative batch prioritization with Muse Spark...');
    const prioResult = await Prioritizer.prioritizeJob(jobId, perceptionResult.candidates);
    const prioDuration = Date.now() - prioStart;

    // Save final ranked queue to DB
    JobRepository.saveQueue(jobId, prioResult.rankedItems);

    AuditRepository.recordEvent({
      jobId,
      timestamp: new Date().toISOString(),
      stage: 'prioritization',
      eventType: 'MUSE_SPARK_RANKING_COMPLETED',
      details: `Prioritized ${prioResult.totalItems} candidate(s) into contiguous ranks 1..${prioResult.totalItems}. Approved vocabulary enforced.`,
      durationMs: prioDuration,
      status: 'success',
    });

    // Stage 4: Complete
    const totalDuration = Date.now() - jobStart;
    JobRepository.updateStatus(
      jobId,
      'complete',
      `Triage complete. ${prioResult.totalItems} clips prioritized into human review queue.`
    );

    AuditRepository.recordEvent({
      jobId,
      timestamp: new Date().toISOString(),
      stage: 'system',
      eventType: 'JOB_COMPLETED',
      details: `End-to-end triage pipeline finished in ${(totalDuration / 1000).toFixed(2)}s. Zero-dismissal active: all units reviewable.`,
      durationMs: totalDuration,
      status: 'success',
    });
  }
}
