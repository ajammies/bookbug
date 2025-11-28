/**
 * AI SDK wrapper with rate limit handling
 *
 * Drop-in replacement for generateObject that respects retry-after headers.
 * Import from here instead of 'ai' directly.
 */
import { generateObject as aiGenerateObject, type GenerateObjectResult } from 'ai';
import { sleep } from './retry';

type GenerateObjectParams = Parameters<typeof aiGenerateObject>[0];

export async function generateObject<T>(
  options: GenerateObjectParams & { schema: { parse: (data: unknown) => T } }
): Promise<GenerateObjectResult<T>> {
  // Disable SDK retry - we handle rate limits ourselves
  const opts = { ...options, maxRetries: 0 };
  try {
    return await aiGenerateObject(opts) as GenerateObjectResult<T>;
  } catch (error) {
    const e = error as { statusCode?: number; responseHeaders?: Record<string, string> };
    if (e?.statusCode !== 429) throw error;

    const seconds = parseInt(e.responseHeaders?.['retry-after'] ?? '60');
    console.log(`Rate limited. Waiting ${seconds}s...`);
    await sleep(seconds * 1000);
    return await aiGenerateObject(opts) as GenerateObjectResult<T>;
  }
}
