import { BoundingBox } from './sam31Client';

export interface DampeningEvaluation {
  isDampened: boolean;
  reason?: string;
  dampeningScore: number;
}

export class FalsePositiveDampener {
  // Box area threshold below which solitary detections are dampened (0.3% of 800x800 = ~1920 px^2)
  private static readonly MIN_AREA_FRACTION = 0.003;

  /**
   * Evaluate a candidate detection for false-positive dampening.
   *
   * Rules derived from Phase 0 feasibility testing on negative controls:
   * 1. If 0 boxes detected -> dampened (empty frame).
   * 2. If corroborating prompts match (person + clothing) -> NEVER dampened (strong candidate).
   * 3. If solitary prompt match and all boxes are tiny slivers (< 0.3% frame area) -> dampened.
   */
  public static evaluate(
    boxes: BoundingBox[],
    matchedPrompts: string[],
    _frameWidth = 800,
    _frameHeight = 800
  ): DampeningEvaluation {
    if (boxes.length === 0) {
      return {
        isDampened: true,
        reason: 'Zero visual candidate signals flagged.',
        dampeningScore: 1.0,
      };
    }

    const hasCorroboration = matchedPrompts.includes('person') && matchedPrompts.includes('clothing');
    if (hasCorroboration) {
      return {
        isDampened: false,
        reason: 'Corroborated by both person and clothing cues.',
        dampeningScore: 0.0,
      };
    }

    // SAM 3.1 returns bounding boxes in normalized 0..1000 coordinate space
    const totalFrameArea = 1000 * 1000;
    let maxBoxArea = 0;

    for (const b of boxes) {
      const w = b.width || Math.abs(b.x2 - b.x1);
      const h = b.height || Math.abs(b.y2 - b.y1);
      const area = w * h;
      if (area > maxBoxArea) {
        maxBoxArea = area;
      }
    }

    const maxAreaFraction = totalFrameArea > 0 ? maxBoxArea / totalFrameArea : 0;

    if (maxAreaFraction < this.MIN_AREA_FRACTION) {
      return {
        isDampened: true,
        reason: `Solitary signal with sub-threshold bounding area (${(maxAreaFraction * 100).toFixed(2)}% of frame).`,
        dampeningScore: 0.8,
      };
    }

    return {
      isDampened: false,
      reason: `Solitary candidate signal (${matchedPrompts.join(', ')}) with substantial visual area.`,
      dampeningScore: 0.3,
    };
  }
}
