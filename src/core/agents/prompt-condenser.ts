import { generateText } from '../services/ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { PageRenderContext } from '../schemas';
import type { Logger } from '../utils/logger';

/**
 * Condense a PageRenderContext into a concise image generation prompt.
 *
 * Used for models with shorter prompt limits (e.g., Flux 2 Dev).
 * Returns plain English description of the scene.
 */
export const promptCondenserAgent = async (
  context: PageRenderContext,
  logger?: Logger
): Promise<string> => {
  const text = await generateText(
    {
      model: anthropic('claude-sonnet-4-20250514'),
      prompt: `You are a prompt engineer for image generation. Convert this scene context into a concise, vivid image prompt.

RULES:
- Output ONLY the image prompt, nothing else
- Use plain English, not JSON
- Focus on what the image should LOOK like
- Include: art style, characters (appearance, expression, pose), scene, mood, composition
- Merge any style overrides with base style (overrides take precedence)
- Remove technical metadata (URLs, IDs, cinematography f-stops)
- Be as concise as possible while not losing any visual detail
- Target length: up to 3000 characters maximum
- Be specific and visual

CONTEXT:
${JSON.stringify(context, null, 2)}

IMAGE PROMPT:`,
    },
    logger,
    'promptCondenserAgent'
  );

  logger?.debug({ inputLength: JSON.stringify(context).length, outputLength: text.length }, 'Condensed prompt');

  return text.trim();
};
