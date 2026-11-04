/**
 * Phase 4.1 — Perception Prompt Set Configuration.
 *
 * Prompts validated in Phase 0 feasibility testing:
 * 1. "person" — Primary detection concept; captures full or partially visible bodies.
 * 2. "clothing" — Corroborating concept; flags bright fabric, safety vests, or contrast
 *    in debris/rubble even when limbs are occluded.
 *
 * Note on excluded prompts:
 * - "human limb": Excluded because Phase 0 tests showed high miss rate (>70%) under
 *   aerial drone perspectives where limbs merge into rubble textures.
 */

export interface PerceptionPrompt {
  id: string;
  text: string;
  weight: number;
  description: string;
}

export const VALIDATED_PROMPTS: PerceptionPrompt[] = [
  {
    id: 'person',
    text: 'person',
    weight: 1.0,
    description: 'General human presence, silhouette, or torso.',
  },
  {
    id: 'clothing',
    text: 'clothing',
    weight: 0.85,
    description: 'High-contrast fabric, apparel, or protective gear in natural debris.',
  },
  {
    id: 'hiker',
    text: 'hiker',
    weight: 0.95,
    description: 'Stranded person, explorer, or outdoor subject in wilderness terrain.',
  },
  {
    id: 'backpack',
    text: 'backpack',
    weight: 0.8,
    description: 'Survival pack, gear, or personal items in outdoor setting.',
  },
];

/**
 * Returns plain prompt strings for the SAM 3.1 segmentation engine.
 */
export function getActivePromptStrings(): string[] {
  return VALIDATED_PROMPTS.map((p) => p.text);
}
