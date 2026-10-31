import sharp from 'sharp';
import { MetaClient } from '../lib/metaClient';

// Max image dimension before encoding — reduces payload ~2-3x vs full-res
const MAX_IMAGE_DIM = 800;

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
  height?: number;
}

export interface SamDetectionResult {
  prompt: string;
  boxes: BoundingBox[];
  maskCount: number;
  latencyMs: number;
  rawText: string;
}

export interface SamFrameResult {
  /** Merged boxes from all prompts (person + clothing) */
  boxes: BoundingBox[];
  /** Per-prompt breakdown */
  perPrompt: SamDetectionResult[];
  /** Wall-clock time for the parallel batch (max of individual call times) */
  wallTimeMs: number;
  /** Whether any detections were found — used to skip Muse Spark */
  hasDetections: boolean;
}

export class Sam31Client {
  private static readonly MODEL = 'sam-3.1';
  private static readonly ENDPOINT = '/responses';

  /**
   * Resize an image buffer to MAX_IMAGE_DIM on its longest side (JPEG output).
   * Reduces base64 payload size by ~2-4x vs full-res PNG, cutting upload and
   * API decode time.
   */
  public static async resizeImage(inputBuffer: Buffer): Promise<string> {
    const resized = await sharp(inputBuffer)
      .resize(MAX_IMAGE_DIM, MAX_IMAGE_DIM, {
        fit: 'inside',        // preserve aspect ratio
        withoutEnlargement: true,
      })
      .jpeg({ quality: 85 }) // JPEG ~3-4x smaller than PNG for photos
      .toBuffer();

    return `data:image/jpeg;base64,${resized.toString('base64')}`;
  }

  /**
   * Single concept segmentation call. Internal — use segmentFrame for batches.
   */
  public static async segmentConcept(
    imageDataUrl: string,
    prompt: string
  ): Promise<SamDetectionResult> {
    const payload = {
      model: this.MODEL,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: prompt },
            {
              type: 'input_image',
              image_url: imageDataUrl.startsWith('data:')
                ? imageDataUrl
                : `data:image/jpeg;base64,${imageDataUrl}`,
            },
          ],
        },
      ],
    };

    const response = await MetaClient.post(this.ENDPOINT, payload, this.MODEL, 45000);
    const data = response.data;

    let outText = '';
    if (data?.output?.[0]?.content?.[0]?.text) {
      outText = data.output[0].content[0].text;
    }

    const boxes: BoundingBox[] = [];
    const boxRegex = /x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+)(?:;w=(\d+);h=(\d+))?/g;
    let match: RegExpExecArray | null;

    while ((match = boxRegex.exec(outText)) !== null) {
      boxes.push({
        x1: parseInt(match[1], 10),
        y1: parseInt(match[2], 10),
        x2: parseInt(match[3], 10),
        y2: parseInt(match[4], 10),
        width: match[5] ? parseInt(match[5], 10) : undefined,
        height: match[6] ? parseInt(match[6], 10) : undefined,
      });
    }

    const maskMatches = outText.match(/<\|mask;/g);
    const maskCount = maskMatches ? maskMatches.length : 0;

    return {
      prompt,
      boxes,
      maskCount,
      latencyMs: response.latencyMs,
      rawText: outText,
    };
  }

  /**
   * Process a single frame with ALL prompts in PARALLEL (Promise.all).
   * Wall-clock time ≈ max(individual call times) instead of their sum.
   *
   * @param imageInput    Raw image Buffer OR pre-encoded base64 / dataUrl string.
   *                      If Buffer is passed, it is resized to MAX_IMAGE_DIM.
   *                      If string is passed, it is used directly to avoid redundant encoding.
   * @param prompts       Concept prompts to run concurrently (default: person + clothing)
   * @returns SamFrameResult with merged boxes and per-prompt breakdown
   */
  public static async segmentFrame(
    imageInput: Buffer | string,
    prompts: string[] = ['person', 'clothing']
  ): Promise<SamFrameResult> {
    const wallStart = Date.now();

    // Step 1: Resize if Buffer, or format as dataUrl if string
    const imageDataUrl = typeof imageInput === 'string'
      ? (imageInput.startsWith('data:') ? imageInput : `data:image/jpeg;base64,${imageInput}`)
      : await Sam31Client.resizeImage(imageInput);

    // Step 2: Fire all prompt calls concurrently
    const results = await Promise.all(
      prompts.map((p) => Sam31Client.segmentConcept(imageDataUrl, p))
    );

    const wallTimeMs = Date.now() - wallStart;

    // Merge all boxes from all prompts
    const allBoxes = results.flatMap((r) => r.boxes);

    return {
      boxes: allBoxes,
      perPrompt: results,
      wallTimeMs,
      hasDetections: allBoxes.length > 0,
    };
  }
}
