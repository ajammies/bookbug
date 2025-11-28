import Replicate, { type FileOutput } from 'replicate';
import type { PageRenderContext, BookFormat } from '../schemas';
import { getAspectRatio } from '../schemas';
import { sleep } from '../utils/retry';

/**
 * Image generation service using Replicate API with Google Nano Banana Pro
 *
 * Generates images by passing filtered Story JSON directly as the prompt.
 * The model receives the full context about the story, style, characters, and specific page.
 */

const IMAGE_MODEL = 'google/nano-banana-pro';
const DEFAULT_RESOLUTION = '2K'; // Options: '1K', '2K', '4K'

export interface GeneratedPage {
  /** Temporary URL from Replicate (expires after ~24h) */
  url: string;
}

/**
 * Create a Replicate client from environment variable
 */
export const createReplicateClient = (): Replicate => {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error(
      'REPLICATE_API_TOKEN environment variable is required. ' +
      'Get your token at https://replicate.com/account/api-tokens'
    );
  }
  return new Replicate({ auth: apiToken });
};

/**
 * Type guard to check if a value is a FileOutput
 */
const isFileOutput = (value: unknown): value is FileOutput => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'url' in value &&
    typeof (value as FileOutput).url === 'function'
  );
};

/**
 * Extract URL string from Replicate output
 *
 * Replicate returns FileOutput objects with a .url() method that returns a URL object.
 * The output is typically an array of FileOutput for image models.
 */
const extractImageUrl = (output: unknown): string => {
  // Array of FileOutput objects (most common for image models)
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];

    // FileOutput with url() method returning URL object
    if (isFileOutput(first)) {
      const urlObj = first.url();
      return urlObj.toString();
    }

    // Plain string URL (legacy or some models)
    if (typeof first === 'string') {
      return first;
    }
  }

  // Single FileOutput (some models return just one)
  if (isFileOutput(output)) {
    return output.url().toString();
  }

  // Single string URL
  if (typeof output === 'string') {
    return output;
  }

  // Log the actual output for debugging
  console.error('Unexpected Replicate output:', {
    type: typeof output,
    isArray: Array.isArray(output),
    value: JSON.stringify(output, null, 2).substring(0, 500),
  });

  throw new Error(
    `Unexpected output format from Replicate model. ` +
    `Expected FileOutput[] or string[], got ${typeof output}`
  );
};

/**
 * Get retry-after delay from Replicate error response
 */
const getRetryAfterMs = (error: unknown): number | null => {
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as {
      response: { status: number; headers?: { get?: (key: string) => string | null } };
    };

    if (apiError.response.status === 429) {
      const retryAfterHeader = apiError.response.headers?.get?.('retry-after');
      const seconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
      return isNaN(seconds) ? 60000 : seconds * 1000;
    }
  }
  return null;
};

/**
 * Run Replicate model with rate limit handling
 */
const runWithRateLimit = async (
  client: Replicate,
  input: Record<string, unknown>
): Promise<unknown> => {
  try {
    return await client.run(IMAGE_MODEL, { input });
  } catch (error) {
    const retryAfter = getRetryAfterMs(error);
    if (!retryAfter) throw error;

    console.log(`Replicate rate limited. Waiting ${Math.ceil(retryAfter / 1000)}s...`);
    await sleep(retryAfter);
    return await client.run(IMAGE_MODEL, { input });
  }
};

/**
 * Generate a page image using Google Nano Banana Pro via Replicate
 *
 * Passes the filtered Story JSON directly as the prompt.
 * Handles rate limits internally with retry-after.
 */
export const generatePageImage = async (
  context: PageRenderContext,
  format: BookFormat,
  client: Replicate = createReplicateClient()
): Promise<GeneratedPage> => {
  const output = await runWithRateLimit(client, {
    prompt: JSON.stringify(context),
    aspect_ratio: getAspectRatio(format),
    resolution: DEFAULT_RESOLUTION,
    output_format: 'png',
  });

  return { url: extractImageUrl(output) };
};
