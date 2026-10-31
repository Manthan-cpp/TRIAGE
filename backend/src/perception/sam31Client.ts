import { MetaClient } from '../lib/metaClient';

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

export class Sam31Client {
  private static readonly MODEL = 'sam-3.1';
  private static readonly ENDPOINT = '/responses';

  public static async segmentConcept(
    imageBase64: string,
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
              image_url: imageBase64.startsWith('data:')
                ? imageBase64
                : `data:image/jpeg;base64,${imageBase64}`,
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
}
