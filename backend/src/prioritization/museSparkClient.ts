import * as fs from 'fs';
import * as path from 'path';
import { MetaClient } from '../lib/metaClient';
import { getMuseEndpoint, getMuseModel } from '../lib/config';

export type ConfidenceLabel = 'possible-high' | 'possible-medium' | 'possible-low';

export interface CandidateToRank {
  candidateId: string;
  sourceClipId?: string;
  detectionSummary: string;
  detectedBoxesCount: number;
  promptsMatched: string[];
  evidenceIds?: string[];
}

export interface RankedItem {
  candidateId: string;
  priorityRank: number;
  confidenceLabel: ConfidenceLabel;
  reasoningSummary: string;
  fullReasoningText?: string;
  evidenceIds?: string[];
}

export interface PrioritizationResult {
  rankedItems: RankedItem[];
  latencyMs: number;
  model: string;
  usedFallback?: boolean;
  warning?: string;
}

export class MuseSparkClient {
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

    // If nothing to rank via model, return early — saves ~11s.
    if (withDetections.length === 0) {
      const autoRanked: RankedItem[] = noDetections.map((c, idx) => ({
        candidateId: c.candidateId,
        priorityRank: idx + 1,
        confidenceLabel: 'possible-low' as ConfidenceLabel,
        reasoningSummary: 'No candidate signal output; retained at baseline priority for manual review.',
        evidenceIds: [],
      }));
      return { rankedItems: autoRanked, latencyMs: 0, model: `${getMuseModel()}:early-exit` };
    }

    MetaClient.assertConfigured();

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
      model: getMuseModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    };

    let lastError = 'Muse Spark returned no usable ranking.';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await MetaClient.post<{
          choices?: Array<{ message?: { content?: unknown } }>;
        }>(getMuseEndpoint(), payload, getMuseModel());
        const content = response.data?.choices?.[0]?.message?.content;
        const parsed = this.parseAndValidate(content, withDetections, validLabels);
        const merged = this.appendNoSignalCandidates(parsed, noDetections);
        return {
          rankedItems: merged,
          latencyMs: response.latencyMs,
          model: getMuseModel(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt === 0) {
          console.warn(`[MuseSparkClient] Invalid ranking response; retrying once: ${lastError}`);
        }
      }
    }

    const fallback = [...withDetections, ...noDetections].map((candidate, index) => ({
      candidateId: candidate.candidateId,
      priorityRank: index + 1,
      confidenceLabel: 'possible-low' as ConfidenceLabel,
      reasoningSummary: 'Could not rank this batch; flagged for manual review.',
      evidenceIds: candidate.evidenceIds || candidate.promptsMatched,
    }));
    return {
      rankedItems: fallback,
      latencyMs: 0,
      model: getMuseModel(),
      usedFallback: true,
      warning: lastError,
    };
  }

  private static parseAndValidate(
    content: unknown,
    candidates: CandidateToRank[],
    validLabels: ConfidenceLabel[]
  ): RankedItem[] {
    const textContent = typeof content === 'string'
      ? content
      : Array.isArray(content)
        ? content.flatMap((part) => part && typeof part === 'object' && 'text' in part && typeof part.text === 'string' ? [part.text] : []).join('')
        : '';
    if (!textContent.trim()) {
      throw new Error('Muse Spark returned an empty response body.');
    }

    let cleanJson = textContent.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace <= firstBrace) throw new Error('Muse Spark response was not a JSON object.');
    const parsed = JSON.parse(cleanJson.substring(firstBrace, lastBrace + 1)) as { rankedItems?: unknown };
    if (!Array.isArray(parsed.rankedItems) || parsed.rankedItems.length !== candidates.length) {
      throw new Error('Muse Spark returned an incomplete rankedItems array.');
    }

    const candidateIds = new Set(candidates.map((candidate) => candidate.candidateId));
    const seen = new Set<string>();
    return parsed.rankedItems.map((rawItem, index) => {
      if (!rawItem || typeof rawItem !== 'object') throw new Error(`Invalid Muse Spark item at index ${index}.`);
      const item = rawItem as Record<string, unknown>;
      const candidateId = item.candidateId;
      const confidenceLabel = item.confidenceLabel;
      const reasoningSummary = item.reasoningSummary;
      const evidenceIds = item.evidenceIds;
      if (typeof candidateId !== 'string' || !candidateIds.has(candidateId) || seen.has(candidateId)) {
        throw new Error(`Muse Spark returned an unknown or duplicate candidate at index ${index}.`);
      }
      if (!validLabels.includes(confidenceLabel as ConfidenceLabel)) {
        throw new Error(`Muse Spark returned an invalid confidence label for ${candidateId}.`);
      }
      if (typeof reasoningSummary !== 'string' || !reasoningSummary.trim()) {
        throw new Error(`Muse Spark returned empty reasoning for ${candidateId}.`);
      }
      const candidate = candidates.find((entry) => entry.candidateId === candidateId);
      const knownEvidenceIds = new Set(candidate?.evidenceIds || candidate?.promptsMatched || []);
      if (!Array.isArray(evidenceIds) || evidenceIds.length === 0 || evidenceIds.some((id) => typeof id !== 'string' || !knownEvidenceIds.has(id))) {
        throw new Error(`Muse Spark returned invalid evidence IDs for ${candidateId}.`);
      }
      seen.add(candidateId);
      return {
        candidateId,
        priorityRank: typeof item.priorityRank === 'number' && Number.isFinite(item.priorityRank)
          ? item.priorityRank
          : index + 1,
        confidenceLabel: confidenceLabel as ConfidenceLabel,
        reasoningSummary,
        evidenceIds: evidenceIds as string[],
      };
    });
  }

  private static appendNoSignalCandidates(
    ranked: RankedItem[],
    noDetections: CandidateToRank[]
  ): RankedItem[] {
    const baseRank = ranked.length;
    const autoBottom: RankedItem[] = noDetections.map((candidate, index) => ({
      candidateId: candidate.candidateId,
      priorityRank: baseRank + index + 1,
      confidenceLabel: 'possible-low',
      reasoningSummary: 'No candidate signal output; retained at baseline priority for manual review.',
      evidenceIds: candidate.evidenceIds || candidate.promptsMatched,
    }));
    return [...ranked, ...autoBottom].sort((a, b) => a.priorityRank - b.priorityRank);
  }

  /**
   * Generates a vivid, human-readable situational assessment for a candidate frame,
   * providing both a concise 1-sentence queue summary and the 4 structured SAR headings.
   */
  public static async describeVisualCandidate(
    imagePathOrBuffer: string | Buffer,
    matchedPrompts: string[]
  ): Promise<{ shortSummary: string; detailedAssessment: string }> {
    // If no visual detections, return clean negative finding
    if (!matchedPrompts || matchedPrompts.length === 0) {
      return {
        shortSummary: 'No person or gear visible in frame; retained at baseline priority.',
        detailedAssessment:
          '**The Person & Appearance**: No person or human gear is observed in this frame.\n' +
          '**Posture & Physical State**: Not applicable; zero visual cues flagged.\n' +
          '**Surroundings & Terrain**: Natural background environment with no signs of human activity.\n' +
          '**Urgency/Risk Context**: Low priority; negative control or unpopulated sector.',
      };
    }

    try {
      let b64: string;
      if (typeof imagePathOrBuffer === 'string') {
        let fullPath = path.isAbsolute(imagePathOrBuffer)
          ? imagePathOrBuffer
          : path.resolve(process.cwd(), imagePathOrBuffer);
        if (!fs.existsSync(fullPath)) {
          const candidateFromParent = path.resolve(process.cwd(), '..', imagePathOrBuffer);
          if (fs.existsSync(candidateFromParent)) {
            fullPath = candidateFromParent;
          }
        }
        if (!fs.existsSync(fullPath)) {
          throw new Error(`Image file not found: ${fullPath}`);
        }
        b64 = fs.readFileSync(fullPath).toString('base64');
      } else {
        b64 = imagePathOrBuffer.toString('base64');
      }

      const systemPrompt = `You are the Search and Rescue Situational Intelligence Engine for Project Triage.
Analyze the visual drone search frame and provide:
1. A 1-sentence concise operational summary for the priority queue.
2. A detailed structured assessment strictly using these exact 4 headings in simple, clear English:
- The Person & Appearance: Describe who or what is spotted, clothing colors, and gear.
- Posture & Physical State: Describe how they are positioned, behavior, and condition (e.g. resting, exhausted, trapped under debris, motionless, sheltered).
- Surroundings & Terrain: Describe the immediate environment, hazards, terrain type (e.g. ravine, boulders, cascade stream, forest, snow).
- Urgency/Risk Context: Explain why this situation matters from a rescue perspective.

Return strictly a JSON object:
{
  "shortSummary": "One simple sentence summary for the priority queue.",
  "detailedAssessment": "**The Person & Appearance**: ...\\n**Posture & Physical State**: ...\\n**Surroundings & Terrain**: ...\\n**Urgency/Risk Context**: ..."
}`;

      const payload = {
        model: getMuseModel(),
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this candidate search frame flagged for: ${matchedPrompts.join(', ')}. Provide the situational assessment.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${b64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      };

      const response = await MetaClient.post<{
        choices?: Array<{ message?: { content?: unknown } }>;
      }>(getMuseEndpoint(), payload, getMuseModel());

      const content = response.data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        let clean = content.trim();
        if (clean.startsWith('```')) {
          clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }
        const parsed = JSON.parse(clean);
        if (parsed.shortSummary && parsed.detailedAssessment) {
          return {
            shortSummary: String(parsed.shortSummary).trim(),
            detailedAssessment: String(parsed.detailedAssessment).trim(),
          };
        }
      }
    } catch (err) {
      console.warn('[MuseSparkClient] describeVisualCandidate fallback:', err instanceof Error ? err.message : err);
    }

    // Reliable fallback if API call fails
    return {
      shortSummary: `Candidate flagged for ${matchedPrompts.join(' + ')} in sector search.`,
      detailedAssessment:
        `**The Person & Appearance**: Visual cues flagged for ${matchedPrompts.join(', ')}.\n` +
        `**Posture & Physical State**: Further inspection required by human reviewer.\n` +
        `**Surroundings & Terrain**: Wilderness sector under aerial observation.\n` +
        `**Urgency/Risk Context**: Flagged for priority visual confirmation.`,
    };
  }
}
