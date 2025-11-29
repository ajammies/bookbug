/**
 * AI SDK wrapper with rate limit handling and streaming progress
 *
 * Drop-in replacement for generateObject that respects retry-after headers.
 * When a provider returns retry-after, we wait that exact duration.
 * Otherwise, we let the AI SDK handle retries with exponential backoff.
 */
import {
  generateObject as aiGenerateObject,
  streamObject as aiStreamObject,
  generateText,
  NoObjectGeneratedError,
  type GenerateObjectResult,
} from 'ai';
import type { JSONParseError, TypeValidationError } from '@ai-sdk/provider';
import { anthropic } from '@ai-sdk/anthropic';
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

// ============================================================================
// Streaming with progress
// ============================================================================

type StreamObjectParams = Parameters<typeof aiStreamObject>[0];

/** Repair function type matching generateObject's experimental_repairText */
export type RepairFunction = (opts: {
  text: string;
  error: JSONParseError | TypeValidationError;
}) => Promise<string | null>;

/** Check if partial object has meaningful data to summarize */
const hasSubstantialData = (partial: unknown): boolean => {
  const json = JSON.stringify(partial);
  // Skip empty objects, arrays, or very small data
  return json.length > 20 && json !== '{}' && json !== '[]';
};

/** Summarize partial object into human-readable progress using Haiku */
const summarizePartial = async (partial: unknown): Promise<string | null> => {
  if (!hasSubstantialData(partial)) return null;

  const { text } = await generateText({
    model: anthropic('claude-3-5-haiku-latest'),
    prompt: `Describe in 5-8 words what's being created in this children's book data: ${JSON.stringify(partial).slice(0, 500)}`,
    maxOutputTokens: 20,
  });
  return text.trim();
};

/** Stream object generation with progress callbacks and optional repair */
export async function streamObjectWithProgress<T>(
  options: StreamObjectParams & { schema: { parse: (data: unknown) => T } },
  onProgress?: (message: string) => void,
  sampleIntervalMs = 3000,
  repair?: RepairFunction,
  logger?: Logger
): Promise<T> {
  const result = aiStreamObject(options);

  // Start from now so first sample waits for interval
  let lastSampleTime = Date.now();

  let partialCount = 0;
  let triggerCount = 0;
  for await (const partial of result.partialObjectStream) {
    partialCount++;
    const now = Date.now();
    const elapsed = now - lastSampleTime;
    if (onProgress && elapsed > sampleIntervalMs) {
      triggerCount++;
      logger?.debug({ triggerCount, partialCount, elapsed }, 'stream trigger');
      lastSampleTime = now;
      try {
        const summary = await summarizePartial(partial);
        logger?.debug({ triggerCount, summary: summary ?? 'null' }, 'summarize result');
        if (summary) onProgress(summary);
      } catch (err) {
        logger?.error({ triggerCount, error: String(err) }, 'summarize error');
      }
    }
  }
  logger?.debug({ partialCount, triggerCount }, 'stream complete');

  try {
    return (await result.object) as T;
  } catch (error) {
    // Attempt repair if provided and error is a validation error with text
    if (!repair || !NoObjectGeneratedError.isInstance(error) || !error.text) {
      throw error;
    }

    const cause = error.cause as JSONParseError | TypeValidationError;
    const repairedText = await repair({ text: error.text, error: cause });

    if (!repairedText) {
      throw error;
    }

    // Parse and validate repaired output
    try {
      const parsed = JSON.parse(repairedText);
      return options.schema.parse(parsed);
    } catch (parseError) {
      // Repair produced invalid JSON - throw original error with context
      console.error('Repair produced invalid JSON:', parseError);
      throw error;
    }
  }
}
