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

/** Format character appearance as descriptive text for image generation */
const formatAppearance = (character: StoryCharacter): string => {
  const { appearance } = character;
  if (!appearance) return character.description;

  const lines: string[] = [];

  // Only include fields that are defined
  if (appearance.eyeStyle) lines.push(`Eyes: ${appearance.eyeStyle}`);
  if (appearance.bodyType) lines.push(`Body: ${appearance.bodyType}`);
  if (appearance.clothing) lines.push(`Clothing: ${appearance.clothing}`);
  if (appearance.hairStyle) lines.push(`Hair: ${appearance.hairStyle}`);
  if (appearance.skinTone) lines.push(`Skin/Fur: ${appearance.skinTone}`);
  if (appearance.accessories.length > 0) lines.push(`Accessories: ${appearance.accessories.join(', ')}`);
  if (appearance.distinctiveFeatures.length > 0) lines.push(`Distinctive features: ${appearance.distinctiveFeatures.join(', ')}`);

  // Fall back to description if no appearance fields are set
  return lines.length > 0 ? lines.join('\n') : character.description;
};

const buildSpritePrompt = (character: StoryCharacter, styleGuide: VisualStyleGuide): string => {
  const { art_style } = styleGuide;
  const genre = art_style.genre?.join(', ') || 'childrens-illustration';
  const medium = art_style.medium?.join(', ') || 'digital illustration';
  const technique = art_style.technique?.join(', ') || 'soft edges';

  const visualDescription = formatAppearance(character);

  return `ART STYLE (CRITICAL - must match exactly):
Genre: ${genre}
Medium: ${medium}
Technique: ${technique}

Generate a character sprite sheet in the EXACT style above.

Character: ${character.name}
Species: ${character.species || 'human'}
Role: ${character.role || 'character'}

Visual Appearance:
${visualDescription}

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
