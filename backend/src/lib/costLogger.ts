import fs from 'fs';
import path from 'path';
import { getCostLogPath } from './config';
import { getEstimatedModelRate, getMuseModel, getSamModel } from './config';

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
export class CostLogger {
  private static state: CostLogState | null = null;

  private static loadState(): CostLogState {
    if (this.state) return this.state;
    const logFile = getCostLogPath();
    try {
      if (fs.existsSync(logFile)) {
        const raw = fs.readFileSync(logFile, 'utf-8');
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
    const logFile = getCostLogPath();
    try {
      const dir = path.dirname(logFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(logFile, JSON.stringify(this.state, null, 2), 'utf-8');
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
    const rate = model === getSamModel()
      ? getEstimatedModelRate('sam')
      : model === getMuseModel()
        ? getEstimatedModelRate('muse')
        : 0;
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
