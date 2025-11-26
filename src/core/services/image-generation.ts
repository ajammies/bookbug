import Replicate from 'replicate';
import type { BOOK_FORMATS } from '../schemas';

/**
 * Image generation service using Replicate API with Nano Banana Pro
 *
 * Generates images by passing filtered Story JSON as the prompt.
 * The model receives context about the story, style, characters, and specific page.
 */

type BookFormat = typeof BOOK_FORMATS[keyof typeof BOOK_FORMATS];

export interface GeneratePageOptions {
  /** Filtered Story JSON for a single page */
  storySlice: object;
  /** Book format spec with dimensions */
  format: BookFormat;
}

export interface GeneratedPage {
  url: string;
}

let replicateClient: Replicate | null = null;

const getClient = (): Replicate => {
  if (!replicateClient) {
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      throw new Error(
        'REPLICATE_API_TOKEN environment variable is required. ' +
        'Get your token at https://replicate.com/account/api-tokens'
      );
    }
    replicateClient = new Replicate({ auth: apiToken });
  }
  return replicateClient;
};

/** Reset the client (for testing) */
export const _resetClient = (): void => {
  replicateClient = null;
};

/** Set a custom client (for testing) */
export const _setClient = (client: Replicate): void => {
  replicateClient = client;
};

/**
 * Generate a page image using Nano Banana Pro via Replicate
 *
 * The storySlice should contain:
 * - storyTitle
 * - style (VisualStyleGuide)
 * - characters (relevant to this page)
 * - page (pageNumber, text, beats)
 */
export const generatePageImage = async (
  options: GeneratePageOptions
): Promise<GeneratedPage> => {
  const { storySlice, format } = options;

  const client = getClient();

  // Build the prompt from the story slice
  const prompt = buildPromptFromStorySlice(storySlice, format);

  const input = {
    prompt,
    aspect_ratio: getAspectRatio(format),
  };

  const output = await client.run('google/imagen-3', { input });

  // Handle output format
  let imageUrl: string;

  if (Array.isArray(output) && output.length > 0) {
    const firstOutput = output[0];
    if (typeof firstOutput === 'string') {
      imageUrl = firstOutput;
    } else if (firstOutput && typeof firstOutput === 'object' && 'url' in firstOutput) {
      imageUrl = (firstOutput as { url: () => string }).url();
    } else {
      throw new Error('Unexpected output format from model');
    }
  } else if (typeof output === 'string') {
    imageUrl = output;
  } else {
    throw new Error('Unexpected output format from model');
  }

  return { url: imageUrl };
};

/**
 * Build a prompt string from the filtered Story JSON
 */
const buildPromptFromStorySlice = (storySlice: object, format: BookFormat): string => {
  // The story slice contains all the context needed
  // We format it as a clear instruction for the image model
  const slice = storySlice as {
    storyTitle?: string;
    style?: { art_direction?: { genre?: string[]; medium?: string[]; technique?: string[] } };
    page?: { text?: string; beats?: Array<{ summary?: string }> };
  };

  const parts: string[] = [];

  // Add style direction if available
  const artDirection = slice.style?.art_direction;
  if (artDirection) {
    if (artDirection.genre?.length) parts.push(artDirection.genre.join(', '));
    if (artDirection.medium?.length) parts.push(artDirection.medium.join(', '));
    if (artDirection.technique?.length) parts.push(artDirection.technique.join(', '));
  }

  // Add the page content
  if (slice.page?.text) {
    parts.push(`Scene: ${slice.page.text}`);
  }

  // Add beat summaries for visual details
  if (slice.page?.beats?.length) {
    const beatSummaries = slice.page.beats.map(b => b.summary).filter(Boolean);
    if (beatSummaries.length) {
      parts.push(`Visual: ${beatSummaries.join('. ')}`);
    }
  }

  // Add picture book qualifier
  parts.push("children's picture book illustration, high quality");

  // Add format info
  parts.push(`${format.name} format, ${format.bleedWidth}x${format.bleedHeight}px`);

  return parts.join('. ');
};

/**
 * Get aspect ratio string for the model
 */
const getAspectRatio = (format: BookFormat): string => {
  const width = format.bleedWidth;
  const height = format.bleedHeight;

  // Find closest standard aspect ratio
  const ratio = width / height;

  if (Math.abs(ratio - 1) < 0.1) return '1:1';
  if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
  if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
  if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3';
  if (Math.abs(ratio - 3 / 4) < 0.1) return '3:4';
  if (Math.abs(ratio - 3 / 2) < 0.1) return '3:2';
  if (Math.abs(ratio - 2 / 3) < 0.1) return '2:3';

  // Default to closest match
  if (ratio > 1) return '4:3';
  if (ratio < 1) return '3:4';
  return '1:1';
};
