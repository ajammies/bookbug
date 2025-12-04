import Replicate, { type FileOutput } from 'replicate';
import type { PageRenderContext, BookFormat } from '../schemas';
import { getAspectRatio } from '../schemas';
import { retryWithBackoff } from '../utils/retry';
import { type Logger, logApiSuccess, logApiError, logRateLimit } from '../utils/logger';

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
 * Check if error is retryable (rate limit or transient prediction failure)
 */
const isRetryableError = (error: unknown): boolean => {
  // Rate limit errors (check message since Replicate includes status in error message)
  if (error instanceof Error && error.message.includes('429')) {
    return true;
  }
  // Transient prediction failures
  if (error instanceof Error && error.message.includes('Prediction failed')) {
    return true;
  }
  return false;
};

/**
 * Extract retry-after seconds from Replicate error message.
 * Replicate returns JSON with retry_after in the error body.
 */
const getReplicateRetryAfter = (error: unknown): number | null => {
  if (!(error instanceof Error)) return null;

  // Parse retry_after from error message JSON
  // Format: "...status 429 Too Many Requests: {\"detail\":\"...\",\"retry_after\":10}"
  const match = error.message.match(/"retry_after"\s*:\s*(\d+)/);
  if (match?.[1]) {
    return parseInt(match[1], 10) * 1000; // Convert to ms
  }
  return null;
};

/**
 * Run Replicate model with retry handling for rate limits and transient failures
 */
export const runWithRateLimit = async (
  client: Replicate,
  input: Record<string, unknown>,
  logger?: Logger
): Promise<unknown> => {
  return retryWithBackoff(
    () => client.run(IMAGE_MODEL, { input }),
    {
      maxRetries: 5,
      shouldRetry: isRetryableError,
      getRetryAfter: getReplicateRetryAfter,
      logger,
    }
  );
};

/** Build the full prompt with rendering instructions - style at top for emphasis */
const buildPrompt = (context: PageRenderContext): string => {
  const { art_style } = context.style;
  const genre = art_style.genre?.join(', ') || 'childrens-illustration';
  const medium = art_style.medium?.join(', ') || 'digital illustration';
  const technique = art_style.technique?.join(', ') || 'soft edges';

  return `ART STYLE (CRITICAL - must match exactly):
Genre: ${genre}
Medium: ${medium}
Technique: ${technique}

Generate this page illustration in the EXACT style above.

Render the page text directly on the image. Choose a font that befits the scene. You may make comic book onomatopoeia where appropriate. Position text in a clear area that doesn't obscure key visual elements.

MUST render in ${medium} style with ${technique}.

Page context:
${JSON.stringify(context, null, 2)}`;
};

/** Extract reference image URLs for image_input (hero page + sprite sheets) */
const extractReferenceImages = (context: PageRenderContext, heroPageUrl: string | undefined): string[] => {
  const refs: string[] = [];
  if (heroPageUrl) refs.push(heroPageUrl);
  const spriteUrls = (context.characterDesigns ?? [])
    .map(d => d.spriteSheetUrl)
    .filter((url): url is string => Boolean(url) && url.startsWith('http'));
  refs.push(...spriteUrls);
  return refs;
};

export interface GeneratePageImageOptions {
  heroPageUrl?: string;
  client?: Replicate;
  logger?: Logger;
}

/**
 * Generate a page image using Google Nano Banana Pro via Replicate
 *
 * Passes rendering instructions plus filtered Story JSON as the prompt.
 * Hero page and character sprite sheets are passed as image_input for visual consistency.
 */
export const generatePageImage = async (
  context: PageRenderContext,
  format: BookFormat,
  options: GeneratePageImageOptions = {}
): Promise<GeneratedPage> => {
  const { heroPageUrl, client = createReplicateClient(), logger } = options;

  try {
    const referenceImages = extractReferenceImages(context, heroPageUrl);
    const prompt = buildPrompt(context);

    // Debug logging for prompt and reference images
    logger?.debug(
      { pageNumber: context.page.pageNumber, prompt, characterDesigns: context.characterDesigns?.length ?? 0, referenceImages },
      'Preparing image generation'
    );

    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: getAspectRatio(format),
      resolution: DEFAULT_RESOLUTION,
      output_format: 'png',
    };

    // Pass sprite sheets and previous pages as reference images for consistency
    if (referenceImages.length > 0) {
      input.image_input = referenceImages;
    }

    const output = await runWithRateLimit(client, input, logger);

    logApiSuccess(logger, 'imageGen');
    return { url: extractImageUrl(output) };
  } catch (error) {
    logApiError(logger, 'imageGen', error instanceof Error ? error.message : String(error));
    throw error;
  }
};
