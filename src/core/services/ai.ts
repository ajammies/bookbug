/**
 * AI SDK wrapper with rate limit handling and streaming
 *
 * Drop-in replacement for generateObject that respects retry-after headers.
 * When a provider returns retry-after, we wait that exact duration.
 * Otherwise, we let the AI SDK handle retries with exponential backoff.
 */
import {
  generateObject as aiGenerateObject,
  generateText as aiGenerateText,
  streamObject as aiStreamObject,
  NoObjectGeneratedError,
  type GenerateObjectResult,
  APICallError,
} from 'ai';
import type { JSONParseError, TypeValidationError } from '@ai-sdk/provider';
import { z, type ZodRawShape, type ZodObject } from 'zod';
import { sleep } from '../utils/retry';
import { type Logger, logApiSuccess, logApiError, logRateLimit } from '../utils/logger';

// ============================================================================
// Composable Options Response Pattern
// ============================================================================

/** Options for configuring the options response schema */
export interface OptionsResponseConfig {
  /** Minimum number of options (default: 2) */
  min?: number;
  /** Maximum number of options (default: 8) */
  max?: number;
}

/**
 * Extends a Zod object schema with options response fields.
 * Use for any agent that returns conversational responses with suggestions.
 *
 * @param inner - The base schema to extend
 * @param config - Optional min/max for options array
 */
export const withOptionsResponse = <T extends ZodRawShape>(
  inner: ZodObject<T>,
  config: OptionsResponseConfig = {}
) => {
  const min = config.min ?? 2;
  const max = config.max ?? 8;

  return inner.extend({
    options: z.array(z.string().min(1)).min(min).max(max)
      .describe(`${min}-${max} clickable options. Each option should be a specific concrete choice. NEVER include generic options like "Other", "Something else", "Tell my own idea", or "None of the above" - the UI already provides a custom input option`),
    isComplete: z.boolean()
      .describe('True when conversation can end'),
  });
};

type GenerateObjectParams = Parameters<typeof aiGenerateObject>[0];

/** Extract retry-after seconds from error, returns null if not present */
const getRetryAfterSeconds = (error: unknown): number | null => {
  if (!APICallError.isInstance(error)) return null;
  if (error.statusCode !== 429) return null;

  const retryAfter = error.responseHeaders?.['retry-after'];
  if (!retryAfter) return null;

  const seconds = parseInt(retryAfter, 10);
  return isNaN(seconds) ? null : seconds;
};

export async function generateObject<T>(
  options: GenerateObjectParams & { schema: { parse: (data: unknown) => T } },
  logger?: Logger,
  agentName?: string
): Promise<GenerateObjectResult<T>> {
  const agent = agentName ?? 'generateObject';

  logger?.debug({ agent, promptLength: options.prompt?.length ?? 0 }, 'API call starting');

  // Use jsonTool mode to bypass Anthropic's 24 optional parameter limit for outputFormat
  const existingAnthropicOptions = (options.providerOptions as { anthropic?: Record<string, unknown> } | undefined)?.anthropic ?? {};
  const optionsWithProvider = {
    ...options,
    providerOptions: {
      ...options.providerOptions,
      anthropic: {
        ...existingAnthropicOptions,
        structuredOutputMode: 'jsonTool' as const,
      },
    },
  };

  try {
    const result = await aiGenerateObject(optionsWithProvider) as GenerateObjectResult<T>;
    logger?.debug({ agent, usage: result.usage }, 'API call complete');
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
    const result = await aiGenerateObject({ ...optionsWithProvider, maxRetries: 0 }) as GenerateObjectResult<T>;
    logger?.debug({ agent, usage: result.usage }, 'API call complete after retry');
    logApiSuccess(logger, agent);
    return result;
  }
}

// ============================================================================
// Text Generation
// ============================================================================

type GenerateTextParams = Parameters<typeof aiGenerateText>[0];

export async function generateText(
  options: GenerateTextParams,
  logger?: Logger,
  agentName?: string
): Promise<string> {
  const agent = agentName ?? 'generateText';

  logger?.debug({ agent, promptLength: options.prompt?.length ?? 0 }, 'Text generation starting');

  try {
    const result = await aiGenerateText(options);
    logger?.debug({ agent, usage: result.usage, textLength: result.text.length }, 'Text generation complete');
    logApiSuccess(logger, agent);
    return result.text;
  } catch (error) {
    const retryAfter = getRetryAfterSeconds(error);

    if (retryAfter === null) {
      logApiError(logger, agent, error instanceof Error ? error.message : String(error));
      throw error;
    }

    // Provider sent retry-after header - wait exact duration and retry once
    logRateLimit(logger, agent, retryAfter);
    await sleep(retryAfter * 1000);
    const result = await aiGenerateText({ ...options, maxRetries: 0 });
    logger?.debug({ agent, usage: result.usage, textLength: result.text.length }, 'Text generation complete after retry');
    logApiSuccess(logger, agent);
    return result.text;
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
  logger?: Logger,
  agentName?: string
): Promise<T> {
  const agent = agentName ?? 'streamObject';

  logger?.debug({ agent, promptLength: options.prompt?.length ?? 0 }, 'Stream starting');

  // Use jsonTool mode to bypass Anthropic's 24 optional parameter limit for outputFormat
  const existingAnthropicOptions = (options.providerOptions as { anthropic?: Record<string, unknown> } | undefined)?.anthropic ?? {};
  const optionsWithProvider = {
    ...options,
    providerOptions: {
      ...options.providerOptions,
      anthropic: {
        ...existingAnthropicOptions,
        structuredOutputMode: 'jsonTool' as const,
      },
    },
  };

  const result = aiStreamObject(optionsWithProvider);

  // Consume the stream to completion
  for await (const _partial of result.partialObjectStream) {
    // Stream must be consumed for object to resolve
  }

  try {
    const obj = (await result.object) as T;
    logger?.debug({ agent }, 'Stream complete');
    logApiSuccess(logger, agent);
    return obj;
  } catch (error) {
    // Attempt repair if provided and error is a validation error with text
    if (!repair || !NoObjectGeneratedError.isInstance(error) || !error.text) {
      logApiError(logger, agent, error instanceof Error ? error.message : String(error));
      throw error;
    }

    logger?.warn({ agent }, 'Stream validation failed, attempting repair');
    const cause = error.cause as JSONParseError | TypeValidationError;
    const repairedText = await repair({ text: error.text, error: cause });

    if (!repairedText) {
      logApiError(logger, agent, 'Repair returned null');
      throw error;
    }

    // Parse and validate repaired output
    try {
      const parsed = JSON.parse(repairedText);
      const obj = options.schema.parse(parsed);
      logger?.info({ agent }, 'Repair successful');
      logApiSuccess(logger, agent);
      return obj;
    } catch (parseError) {
      // Repair produced invalid JSON - throw original error with context
      logger?.error({ agent, parseError }, 'Repair produced invalid JSON');
      throw error;
    }
  }
}
