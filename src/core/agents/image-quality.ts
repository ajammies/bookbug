import { generateObject } from '../services/ai';
import { ImageQualityResultSchema, type PageRenderContext, type ImageQualityResult } from '../schemas';
import { getModel } from '../config';
import type { Logger } from '../utils/logger';

const SYSTEM_PROMPT = `You are a quality control expert for children's book illustrations.

Analyze the rendered image against the provided context (style guide, character designs, prose).

Evaluate:
1. Character Consistency: Do characters match their sprite sheet designs and appearance specs?
   - Check each character's appearance (eyeStyle, bodyType, clothing, accessories, distinctiveFeatures)
   - Verify species-appropriate anatomy
   - Match proportions, colors, and distinctive features
2. Environment Consistency: Does the setting match the style guide? Check art style, lighting, colors.
3. AI Artifacts: Look for generation errors - weird hands, distorted faces, floating objects, text errors, inconsistent shadows, unnatural anatomy.

Be strict but fair. Children's books need high visual quality.

Score each dimension 0-100:
- 90-100: Excellent, publication ready
- 70-89: Good, minor issues acceptable
- 50-69: Fair, noticeable issues
- Below 50: Poor, needs regeneration

passesQualityBar should be true if score >= 70.`;

export interface ImageQualityOptions {
  qualityThreshold?: number;
  logger?: Logger;
}

/** Image input: URL string or Buffer (for local files) */
export type ImageInput = string | Buffer;

/**
 * ImageQualityAgent: Analyzes a rendered image for quality issues.
 * Uses vision to compare the image against the render context.
 * Accepts either a URL string or a Buffer (for local files).
 */
export const imageQualityAgent = async (
  image: ImageInput,
  context: PageRenderContext,
  options: ImageQualityOptions = {}
): Promise<ImageQualityResult> => {
  const { qualityThreshold = 70, logger } = options;

  // Support both URL strings and Buffers (local files)
  const imageContent = typeof image === 'string' ? new URL(image) : image;

  const result = await generateObject(
    {
      model: getModel(),
      schema: ImageQualityResultSchema,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this rendered page against the context below.

Quality threshold: ${qualityThreshold}

Context:
${JSON.stringify(context, null, 2)}`,
            },
            {
              type: 'image',
              image: imageContent,
            },
          ],
        },
      ],
      maxOutputTokens: 1024,
    },
    logger
  );

  return result.object;
};
