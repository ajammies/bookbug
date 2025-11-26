import Replicate from 'replicate';

/**
 * Image generation service using Replicate API
 *
 * Supports multiple models:
 * - google/nano-banana-pro: Google's Gemini 3 Pro Image model (default)
 * - black-forest-labs/flux-schnell: Fast, high-quality image generation
 * - stability-ai/sdxl: Stable Diffusion XL
 */

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: 'nano-banana-pro' | 'flux-schnell' | 'sdxl';
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
}

export const MODEL_CONFIGS = {
  'nano-banana-pro': {
    identifier: 'google/nano-banana-pro',
    defaultWidth: 1024,
    defaultHeight: 1024,
  },
  'flux-schnell': {
    identifier: 'black-forest-labs/flux-schnell',
    defaultWidth: 1024,
    defaultHeight: 1024,
  },
  'sdxl': {
    identifier: 'stability-ai/sdxl:8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f',
    defaultWidth: 1024,
    defaultHeight: 1024,
  },
} as const;

let replicateClient: Replicate | null = null;

/** Reset the client (for testing) */
export const _resetClient = (): void => {
  replicateClient = null;
};

/** Set a custom client (for testing) */
export const _setClient = (client: Replicate): void => {
  replicateClient = client;
};

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

/**
 * Generate an image using the Replicate API
 */
export const generateImage = async (
  options: GenerateImageOptions
): Promise<GeneratedImage> => {
  const {
    prompt,
    negativePrompt,
    width,
    height,
    model = 'flux-schnell',
  } = options;

  const config = MODEL_CONFIGS[model];
  const finalWidth = width ?? config.defaultWidth;
  const finalHeight = height ?? config.defaultHeight;

  const client = getClient();

  const input: Record<string, unknown> = {
    prompt,
    width: finalWidth,
    height: finalHeight,
  };

  if (negativePrompt) {
    input.negative_prompt = negativePrompt;
  }

  // Model-specific input adjustments
  if (model === 'flux-schnell') {
    input.num_outputs = 1;
    input.aspect_ratio = '4:3'; // Good for picture books
    input.output_format = 'png';
    input.output_quality = 90;
  }

  const output = await client.run(config.identifier, { input });

  // Handle different output formats from different models
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

  return {
    url: imageUrl,
    width: finalWidth,
    height: finalHeight,
  };
};

/**
 * Download an image from URL and return as Buffer
 */
export const downloadImage = async (url: string): Promise<Buffer> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
