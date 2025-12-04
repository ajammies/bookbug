import Replicate, { type FileOutput } from 'replicate';
import type { PageRenderContext, BookFormat } from '../schemas';
import { getAspectRatio } from '../schemas';
import { retryWithBackoff } from '../utils/retry';
import { type Logger, logApiSuccess, logApiError, logRateLimit } from '../utils/logger';

/**
 * Image generation service using Replicate API.
 *
 * Supports multiple models:
 * - nano-banana: Google Nano Banana Pro (default)
 * - flux2-dev: Black Forest Labs Flux 2 Dev (better consistency, cheaper)
 */

export type ImageModel = 'nano-banana' | 'flux2-dev';

const MODEL_IDS: Record<ImageModel, string> = {
  'nano-banana': 'google/nano-banana-pro',
  'flux2-dev': 'black-forest-labs/flux-2-dev',
};

const DEFAULT_MODEL: ImageModel = 'nano-banana';
const DEFAULT_RESOLUTION = '2K'; // Options: '1K', '2K', '4K' (nano-banana only)

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
  model: ImageModel,
  input: Record<string, unknown>,
  logger?: Logger
): Promise<unknown> => {
  const modelId = MODEL_IDS[model];
  return retryWithBackoff(
    () => client.run(modelId as `${string}/${string}`, { input }),
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
${JSON.stringify(context)}`;
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
  model?: ImageModel;
}

/**
 * Build model-specific input parameters
 */
const buildModelInput = (
  model: ImageModel,
  prompt: string,
  format: BookFormat,
  referenceImages: string[]
): Record<string, unknown> => {
  const aspectRatio = getAspectRatio(format);

  if (model === 'flux2-dev') {
    // Flux 2 Dev uses input_images (up to 4), different param names
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio,
      output_format: 'png',
      go_fast: true, // Slightly lower quality but faster/cheaper
    };
    // Flux 2 supports up to 4 reference images
    if (referenceImages.length > 0) {
      input.input_images = referenceImages.slice(0, 4);
    }
    return input;
  }

  // Nano Banana Pro (default)
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    resolution: DEFAULT_RESOLUTION,
    output_format: 'png',
  };
  if (referenceImages.length > 0) {
    input.image_input = referenceImages;
  }
  return input;
};

/**
 * Generate a page image using Replicate
 *
 * Supports multiple models:
 * - nano-banana (default): Google Nano Banana Pro
 * - flux2-dev: Black Forest Labs Flux 2 Dev (better consistency, cheaper)
 *
 * Passes rendering instructions plus filtered Story JSON as the prompt.
 * Hero page and character sprite sheets are passed as reference images for visual consistency.
 */
export const generatePageImage = async (
  context: PageRenderContext,
  format: BookFormat,
  options: GeneratePageImageOptions = {}
): Promise<GeneratedPage> => {
  const { heroPageUrl, client = createReplicateClient(), logger, model = DEFAULT_MODEL } = options;

  try {
    const referenceImages = extractReferenceImages(context, heroPageUrl);
    const prompt = buildPrompt(context);

    // Debug logging for prompt and reference images
    logger?.debug(
      { pageNumber: context.page.pageNumber, model, prompt, characterDesigns: context.characterDesigns?.length ?? 0, referenceImages },
      'Preparing image generation'
    );

    const input = buildModelInput(model, prompt, format, referenceImages);
    const output = await runWithRateLimit(client, model, input, logger);

    logApiSuccess(logger, 'imageGen');
    return { url: extractImageUrl(output) };
  } catch (error) {
    logApiError(logger, 'imageGen', error instanceof Error ? error.message : String(error));
    throw error;
  }
};
