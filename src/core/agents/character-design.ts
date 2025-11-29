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

const SPRITE_SHEET_INSTRUCTIONS = `Generate a character sprite sheet with full body turnarounds.

Requirements:
- Show the character from 4 angles: front, 3/4 view, side profile, back
- Full body visible in each pose
- Consistent proportions, clothing, and colors across all views
- Clean white or neutral background
- Arrange poses in a horizontal strip
- Style should match the art direction provided

Character details:`;

const buildSpritePrompt = (character: StoryCharacter, styleGuide: VisualStyleGuide): string => {
  const { art_direction } = styleGuide;
  const styleDescription = [
    art_direction.genre?.join(', '),
    art_direction.medium?.join(', '),
    art_direction.technique?.join(', '),
  ].filter(Boolean).join(' - ');

  return `${SPRITE_SHEET_INSTRUCTIONS}

Name: ${character.name}
Visual Description: ${character.visualDescription || character.description}
Role: ${character.role || 'character'}
Traits: ${character.traits?.join(', ') || 'none specified'}

Art Style: ${styleDescription || 'children\'s picture book illustration'}`;
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
 * Generate sprite sheets for all characters in a story
 */
export const generateCharacterDesigns = async (
  characters: StoryCharacter[],
  styleGuide: VisualStyleGuide,
  options: {
    client?: Replicate;
    logger?: Logger;
    onProgress?: (message: string) => void;
  } = {}
): Promise<CharacterDesign[]> => {
  const { client = createReplicateClient(), logger, onProgress } = options;

  const generateWithProgress = async (character: StoryCharacter, index: number): Promise<CharacterDesign> => {
    const message = `Generating sprite sheet for ${character.name} (${index + 1}/${characters.length})...`;
    logThinking(logger, message);
    onProgress?.(message);
    return characterDesignAgent(character, styleGuide, client, logger);
  };

  return Promise.all(characters.map((char, i) => generateWithProgress(char, i)));
};
