import { z } from 'zod';
import { generateObject } from '../services/ai';
import { getModel } from '../config';
import type { StoryCharacter, CharacterAppearance, VisualStyleGuide } from '../schemas';
import type { Logger } from '../utils/logger';
import { logThinking } from '../utils/logger';

/**
 * Character appearance agent: Fills in missing appearance fields
 * for consistent visual rendering.
 */

// Required appearance schema - all fields must be filled
const CompleteAppearanceSchema = z.object({
  eyeStyle: z.string().min(1)
    .describe('Eye appearance: shape, size, color, style (e.g., "large round blue eyes", "button eyes")'),
  hairStyle: z.string().min(1)
    .describe('Hair description: color, length, texture, style (e.g., "short curly red hair", "long braids", "bald")'),
  skinTone: z.string().min(1)
    .describe('Skin or fur color/texture (e.g., "warm brown skin", "fluffy white fur", "green scales")'),
  bodyType: z.string().min(1)
    .describe('Body shape and proportions (e.g., "small and round", "tall and lanky", "chubby toddler proportions")'),
  clothing: z.string().min(1)
    .describe('Full outfit description (e.g., "red overalls over yellow striped shirt, blue sneakers")'),
  accessories: z.array(z.string().min(1))
    .describe('Items worn or carried (empty array if none)'),
  distinctiveFeatures: z.array(z.string().min(1))
    .describe('Unique identifying marks (empty array if none)'),
});

const buildSystemPrompt = (styleGuide: VisualStyleGuide): string => {
  const { art_style } = styleGuide;
  const genre = art_style.genre?.join(', ') || 'childrens-illustration';
  const medium = art_style.medium?.join(', ') || 'digital illustration';
  const technique = art_style.technique?.join(', ') || 'soft edges';

  return `You are a children's book character designer.

Given a character description and any existing appearance details, fill in ALL missing visual attributes.
Keep the character age-appropriate and visually interesting for a children's book illustration.

ART STYLE CONTEXT:
- Genre: ${genre}
- Medium: ${medium}
- Technique: ${technique}

Match descriptions to this style (e.g., simpler descriptions for minimalist styles, more detailed for realistic styles).

RULES:
- Preserve any existing appearance details exactly as given
- Fill in missing fields with creative, specific details that match the character's description and role
- Make visual choices that are distinctive and memorable
- Keep clothing and style appropriate for the character's species and setting
- For non-human characters, adapt fields appropriately (e.g., fur instead of skin, no hair for a robot)`;
};

/**
 * Generates complete appearance for a character, filling in missing visual details.
 * Returns a complete CharacterAppearance with all fields populated.
 */
export const characterAppearanceAgent = async (
  character: StoryCharacter,
  styleGuide: VisualStyleGuide,
  logger?: Logger
): Promise<CharacterAppearance> => {
  const existingAppearance: Partial<CharacterAppearance> = character.appearance ?? {};

  // Build context showing what we have and what's missing
  const context = `Character: ${character.name}
Description: ${character.description}
Species: ${character.species ?? 'human'}
Role: ${character.role ?? 'character'}

Existing appearance details:
${JSON.stringify(existingAppearance, null, 2)}

Fill in any missing fields while preserving existing values.`;

  const { object } = await generateObject({
    model: getModel(),
    schema: CompleteAppearanceSchema,
    system: buildSystemPrompt(styleGuide),
    prompt: context,
  }, logger);

  // Merge: preserve existing non-empty values, use generated for missing
  return {
    eyeStyle: existingAppearance.eyeStyle || object.eyeStyle,
    hairStyle: existingAppearance.hairStyle || object.hairStyle,
    skinTone: existingAppearance.skinTone || object.skinTone,
    bodyType: existingAppearance.bodyType || object.bodyType,
    clothing: existingAppearance.clothing || object.clothing,
    accessories: existingAppearance.accessories?.length ? existingAppearance.accessories : object.accessories,
    distinctiveFeatures: existingAppearance.distinctiveFeatures?.length ? existingAppearance.distinctiveFeatures : object.distinctiveFeatures,
  };
};

/**
 * Generates complete appearance for all characters, filling in missing visual details.
 */
export const generateCharacterAppearances = async (
  characters: StoryCharacter[],
  styleGuide: VisualStyleGuide,
  logger?: Logger
): Promise<StoryCharacter[]> => {
  const enrichedCharacters: StoryCharacter[] = [];

  for (const [i, character] of characters.entries()) {
    logThinking(logger, `Generating appearance for ${character.name} (${i + 1}/${characters.length})...`);
    const appearance = await characterAppearanceAgent(character, styleGuide, logger);
    enrichedCharacters.push({
      ...character,
      appearance,
    });
  }

  return enrichedCharacters;
};
