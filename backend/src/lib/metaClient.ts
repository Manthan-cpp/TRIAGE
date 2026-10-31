import dotenv from 'dotenv';
import path from 'path';
import { CostLogger } from './costLogger';

// Load environment from backend/.env or root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const META_BASE_URL = 'https://api.meta.ai/v1';

export interface MetaApiResponse<T = any> {
  status: number;
  data: T;
  latencyMs: number;
}

export class MetaClient {
  private static getApiKey(): string {
    const key = process.env.META_MODEL_API_KEY;
    if (!key) {
      throw new Error(
        'Missing META_MODEL_API_KEY in environment. Check backend/.env or .env.'
      );
    }
    return key;
  }

  public static async post<T = any>(
    endpointPath: string,
    payload: any,
    modelName: string,
    timeoutMs = 30000
  ): Promise<MetaApiResponse<T>> {
    const apiKey = this.getApiKey();
    const url = `${META_BASE_URL}${endpointPath}`;
    const startTime = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Triage-Backend/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - startTime;
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Meta API Error (${response.status} on ${endpointPath}): ${errorText}`
        );
      }

      const data = (await response.json()) as T;
      CostLogger.logCall(modelName, endpointPath, latencyMs, 1);

      return { status: response.status, data, latencyMs };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Meta API timeout after ${timeoutMs}ms on ${endpointPath}`);
      }
      throw err;
    }
  }
}
