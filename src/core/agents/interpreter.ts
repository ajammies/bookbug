import { generateObject } from '../services/ai';
import { StoryBriefSchema, type StoryBrief } from '../schemas';
import { getModel } from '../config';

const buildSystemPrompt = (availableStyles: string[]): string => {
  const stylesNote = availableStyles.length > 0
    ? `\n\nIMPORTANT: These are art style presets: ${availableStyles.join(', ')}. If the user says one of these names (or "generate new style"), set stylePreset to that value. Do NOT create characters from style names.`
    : '';

  return `Extract story details from user input into a StoryBrief.

Only include fields the user explicitly mentioned or clearly implied. Omit fields entirely if not mentioned - don't invent details or use empty strings.

If the user provides detailed descriptions, extra context, pasted JSON, or special requests that don't fit neatly into other fields, capture everything in customInstructions.${stylesNote}`;
};

export interface InterpreterAgentOptions {
  availableStyles?: string[];
}

/**
 * InterpreterAgent: Extracts StoryBrief fields from any user input
 * Returns a partial brief that can be merged with existing data
 */
export const interpreterAgent = async (
  userMessage: string,
  currentBrief: Partial<StoryBrief>,
  options: InterpreterAgentOptions = {}
): Promise<Partial<StoryBrief>> => {
  const { availableStyles = [] } = options;

  const contextualPrompt = currentBrief && Object.keys(currentBrief).length > 0
    ? `Current brief context:\n${JSON.stringify(currentBrief, null, 2)}\n\nUser message:\n${userMessage}`
    : userMessage;

  const { object } = await generateObject({
    model: getModel(),
    schema: StoryBriefSchema.partial(),
    system: buildSystemPrompt(availableStyles),
    prompt: contextualPrompt,
  });

  return { ...currentBrief, ...object };
};
