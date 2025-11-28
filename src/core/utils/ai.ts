/**
 * AI SDK wrapper with rate limit handling
 *
 * Drop-in replacement for generateObject that respects retry-after headers.
 * Import from here instead of 'ai' directly.
 */
import { generateObject as aiGenerateObject, type GenerateObjectResult } from 'ai';
import { sleep } from './retry';

type GenerateObjectParams = Parameters<typeof aiGenerateObject>[0];

const getRetryAfterMs = (error: unknown): number | null => {
  const e = error as { statusCode?: number; responseHeaders?: Record<string, string> };
  if (e?.statusCode === 429) {
    const seconds = e.responseHeaders?.['retry-after'];
    return seconds ? parseInt(seconds) * 1000 : 60000;
  }
  return null;
};

export async function generateObject<T>(
  options: GenerateObjectParams & { schema: { parse: (data: unknown) => T } }
): Promise<GenerateObjectResult<T>> {
  const opts = { ...options, maxRetries: 0 };
  try {
    return await aiGenerateObject(opts) as GenerateObjectResult<T>;
  } catch (error) {
    const retryAfter = getRetryAfterMs(error);
    if (retryAfter) {
      console.log(`Rate limited. Waiting ${Math.ceil(retryAfter / 1000)}s...`);
      await sleep(retryAfter);
      return await aiGenerateObject(opts) as GenerateObjectResult<T>;
    }
    throw error;
  }
}
