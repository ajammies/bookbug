import Replicate, { type FileOutput } from 'replicate';
import type { PageRenderContext, BookFormat } from '../schemas';
import { getAspectRatio } from '../schemas';
import { RateLimitError } from '../utils/retry';

/**
 * Image generation service using Replicate API with Google Imagen 3
 *
 * Generates images by passing filtered Story JSON directly as the prompt.
 * The model receives the full context about the story, style, characters, and specific page.
 */

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
 * Generate a page image using Google Imagen 3 via Replicate
 *
 * Passes the filtered Story JSON directly as the prompt.
 * Accepts optional client for dependency injection (useful for testing).
 */
export const generatePageImage = async (
  context: PageRenderContext,
  format: BookFormat,
  client: Replicate = createReplicateClient()
): Promise<GeneratedPage> => {
  try {
    const output = await client.run('google/imagen-3', {
      input: {
        prompt: JSON.stringify(context),
        aspect_ratio: getAspectRatio(format),
      },
    });

    return { url: extractImageUrl(output) };
  } catch (error) {
    // Handle Replicate API errors
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as {
        response: { status: number; headers?: { get?: (key: string) => string | null } };
        message: string;
      };

      // Detect rate limit (429) and throw RateLimitError
      if (apiError.response.status === 429) {
        const retryAfterHeader = apiError.response.headers?.get?.('retry-after');
        // Parse retry-after: could be seconds or a date
        const delayMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : 60000; // Default to 60 seconds

        throw new RateLimitError(
          isNaN(delayMs) ? 60000 : delayMs,
          `Replicate rate limit exceeded. Retry after ${delayMs / 1000}s`
        );
      }

      throw new Error(
        `Image generation failed (${apiError.response.status}): ${apiError.message}`
      );
    }
    throw error;
  }
};

/**
 * Download an image from a URL and return as Buffer
 */
export const downloadImage = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
