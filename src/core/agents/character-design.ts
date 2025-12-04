import Replicate from 'replicate';
import type { StoryCharacter, VisualStyleGuide, CharacterDesign } from '../schemas';
import {
  createReplicateClient,
  extractImageUrl,
  runWithRateLimit,
} from '../services/image-generation';
import { type Logger, logThinking } from '../utils/logger';

/**
 * Character sprite sheet generation using Replicate
 */

const IMAGE_MODEL = 'google/nano-banana-pro';

const buildSpritePrompt = (character: StoryCharacter, styleGuide: VisualStyleGuide): string => {
  const { art_style } = styleGuide;
  const genre = art_style.genre?.join(', ') || 'childrens-illustration';
  const medium = art_style.medium?.join(', ') || 'digital illustration';
  const technique = art_style.technique?.join(', ') || 'soft edges';

  return `ART STYLE (CRITICAL - must match exactly):
Genre: ${genre}
Medium: ${medium}
Technique: ${technique}

Generate a character sprite sheet in the EXACT style above.

Character: ${character.name}
Description: ${character.visualDescription || character.description}
Role: ${character.role || 'character'}
Traits: ${character.traits?.join(', ') || 'none specified'}

Requirements:
- Show character from 4 angles: front, 3/4 view, side profile, back
- Full body visible in each pose
- Consistent proportions, clothing, and colors across all views
- Clean white or neutral background
- Arrange poses in a horizontal strip
- MUST render in ${medium} style with ${technique}`;
};

/**
 * Generate a sprite sheet for a single character
 */
export const characterDesignAgent = async (
  character: StoryCharacter,
  styleGuide: VisualStyleGuide,
  client: Replicate = createReplicateClient(),
  logger?: Logger
): Promise<CharacterDesign> => {
  const output = await runWithRateLimit(
    client,
    {
      prompt: buildSpritePrompt(character, styleGuide),
      aspect_ratio: '16:9',
      resolution: '2K',
      output_format: 'png',
    },
    logger
  );

  return {
    character,
    spriteSheetUrl: extractImageUrl(output),
  };
};

/**
 * Generate sprite sheets for all characters in a story (sequential to avoid rate limits)
 */
export const generateCharacterDesigns = async (
  characters: StoryCharacter[],
  styleGuide: VisualStyleGuide,
  options: { client?: Replicate; logger?: Logger } = {}
): Promise<CharacterDesign[]> => {
  const { client = createReplicateClient(), logger } = options;
  const designs: CharacterDesign[] = [];

  for (const [i, char] of characters.entries()) {
    logThinking(logger, `Generating sprite sheet for ${char.name} (${i + 1}/${characters.length})...`);
    const design = await characterDesignAgent(char, styleGuide, client, logger);
    designs.push(design);
  }

  return designs;
};
