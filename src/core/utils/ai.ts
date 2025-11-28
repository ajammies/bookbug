/**
 * AI SDK wrapper with rate limit handling
 *
 * Drop-in replacement for generateObject that respects retry-after headers.
 * When a provider returns retry-after, we wait that exact duration.
 * Otherwise, we let the AI SDK handle retries with exponential backoff.
 */
import { generateObject as aiGenerateObject, type GenerateObjectResult } from 'ai';
import { sleep } from './retry';
import { type Logger, logApiSuccess, logApiError, logRateLimit } from './logger';

type GenerateObjectParams = Parameters<typeof aiGenerateObject>[0];

/** Extract retry-after seconds from error, returns null if not present */
const getRetryAfterSeconds = (error: unknown): number | null => {
  const e = error as { statusCode?: number; responseHeaders?: Record<string, string> };
  if (e?.statusCode !== 429) return null;

  const header = e.responseHeaders?.['retry-after'];
  if (!header) return null;

  const seconds = parseInt(header, 10);
  return isNaN(seconds) ? null : seconds;
};

export async function generateObject<T>(
  options: GenerateObjectParams & { schema: { parse: (data: unknown) => T } },
  logger?: Logger
): Promise<GenerateObjectResult<T>> {
  const agent = 'generateObject';

  try {
    const result = await aiGenerateObject(options) as GenerateObjectResult<T>;
    logApiSuccess(logger, agent);
    return result;
  } catch (error) {
    const retryAfter = getRetryAfterSeconds(error);

    if (retryAfter === null) {
      logApiError(logger, agent, error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Provider sent retry-after header - wait exact duration and retry once
    logRateLimit(logger, agent, retryAfter);
    await sleep(retryAfter * 1000);
    const result = await aiGenerateObject({ ...options, maxRetries: 0 }) as GenerateObjectResult<T>;
    logApiSuccess(logger, agent);
    return result;
  }
}
