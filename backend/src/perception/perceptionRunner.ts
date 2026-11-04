import * as fs from 'fs';
import * as path from 'path';
import { JobManifest, IngestionUnit } from '../ingestion/manifestGenerator';
import { Sam31Client } from './sam31Client';
import { getActivePromptStrings } from './prompts';
import { FalsePositiveDampener } from './falsePositiveDampener';
import { CandidateSignalRecord, PerceptionBatchResult } from './candidateTypes';
import { getIngestedDir, getPerceptionConcurrency, isPathInside, resolveInside } from '../lib/config';
import { MetaClient } from '../lib/metaClient';

export class PerceptionRunner {
  // Max concurrent frames to process simultaneously
  /**
   * Run SAM 3.1 perception pass across all units in a JobManifest.
   */
  public static async processManifest(
    manifest: JobManifest,
    projectRootDir?: string,
    onProgress?: (processed: number, total: number) => void
  ): Promise<PerceptionBatchResult> {
    MetaClient.assertConfigured();
    const rootDir = projectRootDir || path.resolve(__dirname, '../../../');
    const prompts = getActivePromptStrings();
    const startTime = Date.now();

    const candidates: CandidateSignalRecord[] = [];
    let failedUnitsCount = 0;
    const units = [...manifest.units];

    // Worker pool for bounded concurrency
    const worker = async (unit: IngestionUnit): Promise<CandidateSignalRecord> => {
      const candidateId = `cand_${manifest.jobId}_${unit.unitId}`;
      const fullPath = resolveInside(rootDir, unit.filePath);

      try {
        if (!fullPath || !isPathInside(getIngestedDir(), fullPath) || !fs.existsSync(fullPath)) {
          throw new Error(`Unit image file not found at ${fullPath}`);
        }

        // Read file and encode directly to base64 dataUrl (pre-normalized, no resizing needed)
        const buffer = fs.readFileSync(fullPath);
        const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;

        // Segment with all active prompts in parallel
        const frameResult = await Sam31Client.segmentFrame(dataUrl, prompts);

        const matchedPrompts: string[] = [];
        for (const p of frameResult.perPrompt) {
          if (p.boxes.length > 0 && !matchedPrompts.includes(p.prompt)) {
            matchedPrompts.push(p.prompt);
          }
        }

        const hasCorroboration = matchedPrompts.includes('person') && matchedPrompts.includes('clothing');
        const dampening = FalsePositiveDampener.evaluate(
          frameResult.boxes,
          matchedPrompts,
          unit.width,
          unit.height
        );

        const partialPromptNote = frameResult.errors?.length
          ? ` Partial prompt failures retained: ${frameResult.errors.join('; ')}`
          : '';

        return {
          candidateId,
          unitId: unit.unitId,
          sourceFile: unit.sourceFile,
          sourceType: unit.sourceType,
          timestampSec: unit.timestampSec,
          filePath: unit.filePath,
          matchedPrompts,
          totalBoxesCount: frameResult.boxes.length,
          boxes: frameResult.boxes,
          hasCorroboratingSignals: hasCorroboration,
          dampening: {
            isDampened: dampening.isDampened,
            reason: `${dampening.reason || 'Candidate signal retained for review.'}${partialPromptNote}`,
            dampeningScore: dampening.dampeningScore,
          },
          rawResults: frameResult.perPrompt,
          createdAt: new Date().toISOString(),
        };
      } catch (err: any) {
        failedUnitsCount += 1;
        console.warn(`[PerceptionRunner] Non-fatal error processing unit ${unit.unitId}: ${err.message}`);
        // Zero-dismissal resilience: preserve unit as dampened record rather than aborting batch
        return {
          candidateId,
          unitId: unit.unitId,
          sourceFile: unit.sourceFile,
          sourceType: unit.sourceType,
          timestampSec: unit.timestampSec,
          filePath: unit.filePath,
          matchedPrompts: [],
          totalBoxesCount: 0,
          boxes: [],
          hasCorroboratingSignals: false,
          dampening: {
            isDampened: true,
            reason: `Perception processing note: ${err.message || 'Inspection error; retained for manual review.'}`,
            dampeningScore: 0.9,
          },
          rawResults: [],
          createdAt: new Date().toISOString(),
        };
      }
    };

    // Execute units in chunks of CONCURRENCY_LIMIT
    const concurrencyLimit = getPerceptionConcurrency();
    for (let i = 0; i < units.length; i += concurrencyLimit) {
      const chunk = units.slice(i, i + concurrencyLimit);
      const chunkResults = await Promise.all(chunk.map((u) => worker(u)));
      candidates.push(...chunkResults);
      onProgress?.(candidates.length, units.length);
    }

    const totalPerceptionTimeMs = Date.now() - startTime;
    const unitsWithDetections = candidates.filter((c) => c.totalBoxesCount > 0).length;
    const dampenedCount = candidates.filter((c) => c.dampening.isDampened).length;
    const totalSignalsCount = candidates.reduce((acc, c) => acc + c.totalBoxesCount, 0);

    const batchResult: PerceptionBatchResult = {
      jobId: manifest.jobId,
      totalUnitsProcessed: candidates.length,
      unitsWithDetections,
      dampenedUnitsCount: dampenedCount,
      failedUnitsCount,
      totalSignalsCount,
      totalPerceptionTimeMs,
      candidates,
    };

    // Save candidates to job directory
    const jobDir = projectRootDir
      ? path.resolve(projectRootDir, 'data/ingested', manifest.jobId)
      : path.resolve(getIngestedDir(), manifest.jobId);
    fs.mkdirSync(jobDir, { recursive: true });
    const candidatesPath = path.join(jobDir, 'candidates.json');
    fs.writeFileSync(candidatesPath, JSON.stringify(batchResult, null, 2), 'utf-8');

    return batchResult;
  }
}
