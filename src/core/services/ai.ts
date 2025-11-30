/**
 * AI SDK wrapper with rate limit handling and streaming
 *
 * Drop-in replacement for generateObject that respects retry-after headers.
 * When a provider returns retry-after, we wait that exact duration.
 * Otherwise, we let the AI SDK handle retries with exponential backoff.
 */
import {
  generateObject as aiGenerateObject,
  streamObject as aiStreamObject,
  NoObjectGeneratedError,
  type GenerateObjectResult,
} from 'ai';
import type { JSONParseError, TypeValidationError } from '@ai-sdk/provider';
import { z, type ZodRawShape, type ZodObject } from 'zod';
import { sleep } from '../utils/retry';
import { type Logger, logApiSuccess, logApiError, logRateLimit } from '../utils/logger';

// ============================================================================
// Composable Chip Response Pattern
// ============================================================================

/**
 * Prompt fragment for chip-based conversational responses.
 * Include in agent system prompts that use withChipResponse schemas.
 */
export const CHIP_PROMPT = `Generate 2-8 short, clickable chip suggestions based on the conversation context.
Set isComplete=true only when all required information has been gathered.`;

/**
 * Extends a Zod object schema with chip response fields.
 * Use for any agent that returns conversational responses with suggestions.
 */
export const withChipResponse = <T extends ZodRawShape>(inner: ZodObject<T>) =>
  inner.extend({
    chips: z.array(z.string().min(1)).min(2).max(8)
      .describe('2-8 short clickable suggestions for user response'),
    isComplete: z.boolean()
      .describe('True when conversation can end'),
  });

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
// Streaming with repair
// ============================================================================

type StreamObjectParams = Parameters<typeof aiStreamObject>[0];

/** Repair function type matching generateObject's experimental_repairText */
export type RepairFunction = (opts: {
  text: string;
  error: JSONParseError | TypeValidationError;
}) => Promise<string | null>;

/** Stream object generation with optional repair on validation failure */
export async function streamObjectWithProgress<T>(
  options: StreamObjectParams & { schema: { parse: (data: unknown) => T } },
  repair?: RepairFunction,
  logger?: Logger
): Promise<T> {
  const result = aiStreamObject(options);

  // Consume the stream to completion
  for await (const _partial of result.partialObjectStream) {
    // Stream must be consumed for object to resolve
  }

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
      logger?.error({ parseError }, 'Repair produced invalid JSON');
      throw error;
    }
  }
}
