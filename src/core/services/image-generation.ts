import Replicate from 'replicate';
import type { StorySlice, BookFormat } from '../schemas';
import { getAspectRatio } from '../schemas';

/**
 * Image generation service using Replicate API with Nano Banana Pro
 *
 * Generates images by passing filtered Story JSON directly as the prompt.
 * The model receives the full context about the story, style, characters, and specific page.
 */

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
 * Extract URL from Replicate output (handles various formats)
 */
const extractImageUrl = (output: unknown): string => {
  // Array of strings
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === 'string') return first;
    // FileOutput object with url() method
    if (first && typeof first === 'object' && 'url' in first) {
      return (first as { url: () => string }).url();
    }
  }
  // Single string
  if (typeof output === 'string') return output;

  throw new Error('Unexpected output format from model');
};

/**
 * Generate a page image using Nano Banana Pro via Replicate
 *
 * Passes the filtered Story JSON directly as the prompt.
 */
export const generatePageImage = async (
  storySlice: StorySlice,
  format: BookFormat
): Promise<GeneratedPage> => {
  const client = getClient();

  const output = await client.run('google/imagen-3', {
    input: {
      prompt: JSON.stringify(storySlice),
      aspect_ratio: getAspectRatio(format),
    },
  });

  return { url: extractImageUrl(output) };
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
