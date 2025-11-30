import { generateObject } from '../services/ai';
import { PartialStorySchema, type PartialStory } from '../schemas';
import { getModel } from '../config';
import type { Logger } from '../utils/logger';

const SYSTEM_PROMPT = `Extract story details from user input into a Story structure.

You are parsing input that may contain any combination of:
- Story brief info (title, characters, setting, age range, page count, tone, moral)
- Plot structure (story arc summary, plot beats with purposes)
- Character visual descriptions
- Art style/visual direction
- Written prose for pages
- Image concepts for pages

Only include fields the user explicitly mentioned or clearly implied. Omit fields entirely if not mentioned - don't invent details.

For plot beats, valid purposes are: setup, build, conflict, twist, climax, payoff, button.

If the user provides detailed descriptions, extra context, pasted JSON, or special requests that don't fit neatly into other fields, capture everything in customInstructions.`;

export interface ExtractorAgentOptions {
  availableStyles?: string[];
  logger?: Logger;
}

/**
 * ExtractorAgent: Extracts all Story fields from any user input
 *
 * Handles natural language, JSON, or structured text.
 * Returns a partial story that can be merged with existing data.
 * Replaces both interpreterAgent and plotInterpreterAgent.
 */
export const extractorAgent = async (
  userMessage: string,
  currentStory: PartialStory = {},
  options: ExtractorAgentOptions = {}
): Promise<PartialStory> => {
  const { availableStyles = [], logger } = options;

  const stylesNote = availableStyles.length > 0
    ? `\n\nAvailable art style presets: ${availableStyles.join(', ')}. If the user mentions one of these, set stylePreset to that value.`
    : '';

  const contextualPrompt = Object.keys(currentStory).length > 0
    ? `Current story context:\n${JSON.stringify(currentStory, null, 2)}\n\nUser input:\n${userMessage}`
    : userMessage;

  const { object } = await generateObject(
    {
      model: getModel(),
      schema: PartialStorySchema,
      system: SYSTEM_PROMPT + stylesNote,
      prompt: contextualPrompt,
    },
    logger
  );

  // Deep merge: currentStory fields take precedence unless object has new values
  return mergeStory(currentStory, object);
};

/**
 * Merge two partial stories, preferring new values over existing
 */
const mergeStory = (current: PartialStory, extracted: PartialStory): PartialStory => {
  const result: PartialStory = { ...current };

  for (const [key, value] of Object.entries(extracted)) {
    if (value !== undefined && value !== null) {
      // For arrays, prefer new if non-empty
      if (Array.isArray(value) && value.length > 0) {
        (result as Record<string, unknown>)[key] = value;
      }
      // For objects (like plot, prose, visuals), merge recursively
      else if (typeof value === 'object' && !Array.isArray(value)) {
        const currentValue = (current as Record<string, unknown>)[key];
        if (currentValue && typeof currentValue === 'object') {
          (result as Record<string, unknown>)[key] = { ...currentValue, ...value };
        } else {
          (result as Record<string, unknown>)[key] = value;
        }
      }
      // For primitives, prefer new value
      else {
        (result as Record<string, unknown>)[key] = value;
      }
    }
  }

  return result;
};
