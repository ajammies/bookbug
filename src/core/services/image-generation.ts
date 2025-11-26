import Replicate from 'replicate';
import type { BOOK_FORMATS } from '../schemas';

/**
 * Image generation service using Replicate API with Nano Banana Pro
 *
 * Generates images by passing filtered Story JSON directly as the prompt.
 * The model receives the full context about the story, style, characters, and specific page.
 */

type BookFormat = typeof BOOK_FORMATS[keyof typeof BOOK_FORMATS];

export interface GeneratePageOptions {
  /** Filtered Story JSON for a single page */
  storySlice: object;
  /** Book format spec with dimensions */
  format: BookFormat;
}

export interface GeneratedPage {
  /** Temporary URL from Replicate (expires after ~24h) */
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
 * Passes the filtered Story JSON directly as the prompt.
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

  // Pass the Story JSON directly as the prompt
  const input = {
    prompt: JSON.stringify(storySlice),
    aspect_ratio: getAspectRatio(format),
  };

  const output = await client.run('google/imagen-3', { input });

  // Handle output format - Replicate returns temporary URLs
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
