import { CostLogger } from './costLogger';
import { getMetaApiBaseUrl, getMetaMaxRetries, getMetaRequestTimeoutMs } from './config';

export interface MetaApiResponse<T = unknown> {
  status: number;
  data: T;
  latencyMs: number;
}

export class MetaClient {
  public static assertConfigured(): void {
    this.getApiKey();
    getMetaApiBaseUrl();
  }

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
  public static async post<T = unknown>(
    endpointPath: string,
    payload: unknown,
    modelName: string,
    timeoutMs = getMetaRequestTimeoutMs(),
    maxRetries = getMetaMaxRetries()
  ): Promise<MetaApiResponse<T>> {
    const apiKey = this.getApiKey();
    const url = `${getMetaApiBaseUrl()}${endpointPath}`;

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

        // Retry only on rate limiting or server-side failures. A 4xx request
        // error is actionable input/configuration and must not be retried.
        if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
          const backoffMs = Math.pow(2, attempt) * 1000 + Math.floor(Math.random() * 500);
          console.warn(`[MetaClient] Status ${response.status} on ${endpointPath}. Retrying in ${backoffMs}ms (attempt ${attempt + 1}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`Meta API Error (${response.status} on ${endpointPath}): ${errorText}`);
          if (response.status < 500 && response.status !== 429) throw new NonRetryableMetaError(error.message);
          throw error;
        }

        const data = (await response.json()) as T;
        CostLogger.logCall(modelName, endpointPath, latencyMs, 1);

        return { status: response.status, data, latencyMs };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        if (err instanceof NonRetryableMetaError) throw err;
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = error.name === 'AbortError'
          ? new Error(`Meta API timeout after ${timeoutMs}ms on ${endpointPath}`)
          : error;

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

class NonRetryableMetaError extends Error {}
