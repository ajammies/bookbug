import { generateObject } from '../services/ai';
import { PartialStorySchema, type PartialStory } from '../schemas';
import { getModel } from '../config';
import type { Logger } from '../utils/logger';

const buildSystemPrompt = (availableStyles: string[]): string => {
  const stylesNote = availableStyles.length > 0
    ? `\n\nStyle presets available: ${availableStyles.join(', ')}. If user mentions one of these (or "generate new style"), set stylePreset accordingly.`
    : '';

  return `Extract story details from user input into a partial story object.

Only include fields the user explicitly mentioned or clearly implied. Omit fields entirely if not mentioned - don't invent details or use empty strings.

For detailed descriptions, context, pasted JSON, or special requests that don't fit other fields, use customInstructions.${stylesNote}`;
};

export interface ExtractorAgentOptions {
  availableStyles?: string[];
  logger?: Logger;
}

/**
 * ExtractorAgent: Pure function that extracts story fields from user input.
 * Named after output type (PartialStory). Replaces interpreterAgent and plotInterpreterAgent.
 *
 * @param userMessage - The user's input text
 * @param currentStory - Current accumulated story state
 * @param options - Available styles and logger
 * @returns Merged PartialStory with new extractions
 */
export const extractorAgent = async (
  userMessage: string,
  currentStory: PartialStory = {},
  options: ExtractorAgentOptions = {}
): Promise<PartialStory> => {
  const { availableStyles = [], logger } = options;

  const contextualPrompt = Object.keys(currentStory).length > 0
    ? `Current story:\n${JSON.stringify(currentStory, null, 2)}\n\nUser message:\n${userMessage}`
    : userMessage;

  const { object } = await generateObject({
    model: getModel(),
    schema: PartialStorySchema,
    system: buildSystemPrompt(availableStyles),
    prompt: contextualPrompt,
  }, logger);

  return { ...currentStory, ...object };
};
