import Replicate, { type FileOutput } from 'replicate';
import type { PageRenderContext, BookFormat } from '../schemas';
import { getAspectRatio } from '../schemas';
import { sleep } from '../utils/retry';
import { type Logger, logApiSuccess, logApiError, logRateLimit } from '../utils/logger';

/**
 * Image generation service using Replicate API with Google Nano Banana Pro
 *
 * Generates images by passing filtered Story JSON directly as the prompt.
 * The model receives the full context about the story, style, characters, and specific page.
 */

const IMAGE_MODEL = 'google/nano-banana-pro';
const DEFAULT_RESOLUTION = '2K'; // Options: '1K', '2K', '4K'

const RENDER_INSTRUCTIONS = `Generate the image pricesly as described below.

IMPORTANT: Render the page text directly on the image. Choose a font that befits the scene. You may make comic book onomonpia too where appropriate. Position the text in a clear area that doesn't obscure key visual elements.

Page context:`;

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
export const isFileOutput = (value: unknown): value is FileOutput => {
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
export const extractImageUrl = (output: unknown): string => {
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
export const runWithRateLimit = async (
  client: Replicate,
  input: Record<string, unknown>,
  logger?: Logger
): Promise<unknown> => {
  try {
    return await client.run(IMAGE_MODEL, { input });
  } catch (error) {
    const retryAfter = getRetryAfterMs(error);
    if (!retryAfter) throw error;

    logRateLimit(logger, 'replicate', Math.ceil(retryAfter / 1000));
    await sleep(retryAfter);
    return await client.run(IMAGE_MODEL, { input });
  }
};

/** Build the full prompt with rendering instructions */
const buildPrompt = (context: PageRenderContext): string =>
  `${RENDER_INSTRUCTIONS}\n${JSON.stringify(context, null, 2)}`;

/** Extract sprite sheet URLs from character designs for image_input (only valid http URLs) */
const extractReferenceImages = (context: PageRenderContext): string[] =>
  (context.characterDesigns ?? [])
    .map(design => design.spriteSheetUrl)
    .filter((url): url is string => Boolean(url) && url.startsWith('http'));

/**
 * Generate a page image using Google Nano Banana Pro via Replicate
 *
 * Passes rendering instructions plus filtered Story JSON as the prompt.
 * Character sprite sheets are passed as image_input for visual consistency.
 * Handles rate limits internally with retry-after.
 */
export const generatePageImage = async (
  context: PageRenderContext,
  format: BookFormat,
  client: Replicate = createReplicateClient(),
  logger?: Logger
): Promise<GeneratedPage> => {
  const agent = 'imageGen';

  try {
    const referenceImages = extractReferenceImages(context);

    // Debug logging for reference images
    console.log(`[imageGen] Page ${context.page.pageNumber}: ${context.characterDesigns?.length ?? 0} character designs`);
    console.log(`[imageGen] Reference images to pass: ${referenceImages.length > 0 ? referenceImages.join(', ') : 'none'}`);

    const input: Record<string, unknown> = {
      prompt: buildPrompt(context),
      aspect_ratio: getAspectRatio(format),
      resolution: DEFAULT_RESOLUTION,
      output_format: 'png',
    };

    // Pass character sprite sheets as reference images for consistency
    if (referenceImages.length > 0) {
      input.image_input = referenceImages;
    }

    const output = await runWithRateLimit(client, input, logger);

    logApiSuccess(logger, agent);
    return { url: extractImageUrl(output) };
  } catch (error) {
    logApiError(logger, agent, error instanceof Error ? error.message : String(error));
    throw error;
  }
};
