import fs from 'fs';
import path from 'path';

export interface CostLogEntry {
  timestamp: string;
  model: string;
  endpoint: string;
  latencyMs: number;
  inputUnits: number; // e.g. 1 image or estimated tokens
  estimatedCostUsd: number;
}

export interface CostLogState {
  totalEstimatedCostUsd: number;
  totalApiCalls: number;
  callsByModel: Record<string, number>;
  entries: CostLogEntry[];
}

// Approximate free-tier cost tracking rates per call/unit
const MODEL_RATES_USD: Record<string, number> = {
  'sam-3.1': 0.005, // ~$0.005 per image segmentation call
  'muse-spark-1.3': 0.002, // ~$0.002 per prioritization batch call
};

const LOG_FILE = path.resolve(__dirname, '../../../data/cost_log.json');

export class CostLogger {
  private static state: CostLogState | null = null;

  private static loadState(): CostLogState {
    if (this.state) return this.state;
    try {
      if (fs.existsSync(LOG_FILE)) {
        const raw = fs.readFileSync(LOG_FILE, 'utf-8');
        this.state = JSON.parse(raw);
        return this.state!;
      }
    } catch (err) {
      console.warn('Could not read existing cost log, starting fresh:', err);
    }
    this.state = {
      totalEstimatedCostUsd: 0,
      totalApiCalls: 0,
      callsByModel: {},
      entries: [],
    };
    return this.state;
  }

  private static saveState(): void {
    if (!this.state) return;
    try {
      const dir = path.dirname(LOG_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(LOG_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist cost log:', err);
    }
  }

  public static logCall(
    model: string,
    endpoint: string,
    latencyMs: number,
    inputUnits = 1
  ): CostLogEntry {
    const state = this.loadState();
    const rate = MODEL_RATES_USD[model] || 0.003;
    const cost = rate * inputUnits;

    const entry: CostLogEntry = {
      timestamp: new Date().toISOString(),
      model,
      endpoint,
      latencyMs,
      inputUnits,
      estimatedCostUsd: Number(cost.toFixed(5)),
    };

    state.totalEstimatedCostUsd = Number((state.totalEstimatedCostUsd + cost).toFixed(5));
    state.totalApiCalls += 1;
    state.callsByModel[model] = (state.callsByModel[model] || 0) + 1;
    state.entries.push(entry);

    // Keep entries bounded in file to last 500
    if (state.entries.length > 500) {
      state.entries = state.entries.slice(-500);
    }

    this.saveState();
    return entry;
  }

  public static getSummary(): { totalCost: number; totalCalls: number; byModel: Record<string, number> } {
    const state = this.loadState();
    return {
      totalCost: state.totalEstimatedCostUsd,
      totalCalls: state.totalApiCalls,
      byModel: { ...state.callsByModel },
    };
  }
}
