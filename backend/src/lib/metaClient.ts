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

  /**
   * Execute an authenticated POST request against the Meta Model API
   * with automatic exponential backoff retry on 429 rate limit or 5xx server errors.
   */
  public static async post<T = any>(
    endpointPath: string,
    payload: any,
    modelName: string,
    timeoutMs = 45000,
    maxRetries = 2
  ): Promise<MetaApiResponse<T>> {
    const apiKey = this.getApiKey();
    const url = `${META_BASE_URL}${endpointPath}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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

        // Retry on 429 Rate Limit or 502/503/504 Bad Gateway
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
          console.warn(`[MetaClient] Status ${response.status} on ${endpointPath}. Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

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
        lastError = err.name === 'AbortError'
          ? new Error(`Meta API timeout after ${timeoutMs}ms on ${endpointPath}`)
          : err;

        if (attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000;
          console.warn(`[MetaClient] Network error on ${endpointPath}. Retrying in ${backoffMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }

    throw lastError || new Error(`MetaClient call failed after ${maxRetries} retries`);
  }
}
