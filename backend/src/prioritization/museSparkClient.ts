import { MetaClient } from '../lib/metaClient';

export type ConfidenceLabel = 'possible-high' | 'possible-medium' | 'possible-low';

export interface CandidateToRank {
  candidateId: string;
  sourceClipId?: string;
  detectionSummary: string;
  detectedBoxesCount: number;
  promptsMatched: string[];
}

export interface RankedItem {
  candidateId: string;
  priorityRank: number;
  confidenceLabel: ConfidenceLabel;
  reasoningSummary: string;
  evidenceIds?: string[];
}

export interface PrioritizationResult {
  rankedItems: RankedItem[];
  latencyMs: number;
  model: string;
}

export class MuseSparkClient {
  private static readonly MODEL = 'muse-spark-1.3';
  private static readonly ENDPOINT = '/chat/completions';

  /**
   * Prioritize a batch of candidates via Muse Spark 1.3.
   *
   * OPTIMIZATION: Candidates with zero detections are assigned possible-low
   * automatically — no API call made for them, saving ~11s each.
   * Only detection-positive candidates go to Muse Spark.
   */
  public static async prioritizeBatch(
    candidates: CandidateToRank[]
  ): Promise<PrioritizationResult> {
    const validLabels: ConfidenceLabel[] = ['possible-high', 'possible-medium', 'possible-low'];

    // Partition candidates
    const withDetections = candidates.filter((c) => c.detectedBoxesCount > 0);
    const noDetections = candidates.filter((c) => c.detectedBoxesCount === 0);

    // If nothing to rank via model, return early — saves ~11s
    if (withDetections.length === 0) {
      const autoRanked: RankedItem[] = noDetections.map((c, idx) => ({
        candidateId: c.candidateId,
        priorityRank: idx + 1,
        confidenceLabel: 'possible-low' as ConfidenceLabel,
        reasoningSummary: 'No candidate signals flagged; assigned baseline priority without model call.',
        evidenceIds: [],
      }));
      return { rankedItems: autoRanked, latencyMs: 0, model: this.MODEL + ':early-exit' };
    }

    const systemPrompt = `You are the prioritization engine for Project Triage (SAR decision-support).
Your sole task is to comparatively rank visual candidate drone frames for human reviewer attention.
MANDATORY CONSTRAINTS:
1. NEVER assert certainty: words like "confirmed", "detected", "survivor found" are strictly forbidden. Use "candidate signal", "flagged for review".
2. Allowed confidenceLabel values ONLY: "possible-high", "possible-medium", "possible-low".
3. Assign priorityRank 1 to the candidate that most urgently warrants a human reviewer checking it first (e.g. multiple corroborating prompts like person+clothing).
4. Solitary/weak flags or empty backgrounds must be ranked lower.
5. Output must be strictly valid JSON matching this schema:
{
  "rankedItems": [
    {
      "candidateId": "id",
      "priorityRank": 1,
      "confidenceLabel": "possible-high",
      "reasoningSummary": "One concise sentence explaining why to review first.",
      "evidenceIds": ["evidence_id"]
    }
  ]
}`;

    const userPrompt = `Rank the following ${withDetections.length} visual candidates:\n${JSON.stringify(withDetections, null, 2)}`;

    const payload = {
      model: this.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    const response = await MetaClient.post(this.ENDPOINT, payload, this.MODEL, 45000);
    const content = response.data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Muse Spark returned an empty response body.');
    }

    let parsed: { rankedItems?: RankedItem[] };
    try {
      parsed = JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to parse Muse Spark JSON output: ${content}`);
    }

    if (!parsed.rankedItems || !Array.isArray(parsed.rankedItems)) {
      throw new Error(`Invalid JSON schema from Muse Spark (missing rankedItems array): ${content}`);
    }

    // Sanitize and validate vocabulary constraints
    const sanitized = parsed.rankedItems.map((item, idx) => ({
      candidateId: item.candidateId || `item_${idx + 1}`,
      priorityRank: typeof item.priorityRank === 'number' ? item.priorityRank : idx + 1,
      confidenceLabel: validLabels.includes(item.confidenceLabel)
        ? item.confidenceLabel
        : 'possible-low' as ConfidenceLabel,
      reasoningSummary: item.reasoningSummary || 'Candidate flagged for manual review.',
      evidenceIds: item.evidenceIds || [],
    }));

    // Append zero-detect candidates at the bottom, re-ranked after model results
    const baseRank = sanitized.length;
    const autoBottom: RankedItem[] = noDetections.map((c, idx) => ({
      candidateId: c.candidateId,
      priorityRank: baseRank + idx + 1,
      confidenceLabel: 'possible-low' as ConfidenceLabel,
      reasoningSummary: 'No candidate signals flagged; assigned baseline priority.',
      evidenceIds: [],
    }));

    const merged = [...sanitized, ...autoBottom].sort((a, b) => a.priorityRank - b.priorityRank);

    return {
      rankedItems: merged,
      latencyMs: response.latencyMs,
      model: this.MODEL,
    };
  }
}
