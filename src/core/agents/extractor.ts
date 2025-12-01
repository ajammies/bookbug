import { generateObject } from '../services/ai';
import { StoryBriefSchema, type StoryBrief } from '../schemas';
import { getModel } from '../config';
import type { Logger } from '../utils/logger';

// Focused schema for brief extraction only
const BriefExtractionSchema = StoryBriefSchema.partial();

const buildSystemPrompt = (availableStyles: string[]): string => {
  const stylesNote = availableStyles.length > 0
    ? `\n\nStyle presets available: ${availableStyles.join(', ')}. If user mentions one of these (or "generate new style"), set stylePreset accordingly.`
    : '';

  return `Extract story brief fields from the conversation exchange.

Only include fields explicitly mentioned in the question or answer. OMIT fields entirely if unknown - never use placeholders, empty strings, or invented values.

If the user confirms something (e.g., "yes", "that's good"), extract the relevant details from the question they're confirming.${stylesNote}`;
};

export interface BriefExtractorOptions {
  availableStyles?: string[];
  logger?: Logger;
}

/**
 * BriefExtractorAgent: Extracts StoryBrief fields from a Q&A exchange.
 * Focused on brief fields only - uses StoryBriefSchema.partial().
 *
 * @param question - The assistant's question
 * @param answer - The user's answer
 * @param currentBrief - Current accumulated brief state
 * @param options - Available styles and logger
 * @returns Merged partial brief with new extractions
 */
export const briefExtractorAgent = async (
  question: string,
  answer: string,
  currentBrief: Partial<StoryBrief> = {},
  options: BriefExtractorOptions = {}
): Promise<Partial<StoryBrief>> => {
  const { availableStyles = [], logger } = options;

  const contextualPrompt = Object.keys(currentBrief).length > 0
    ? `Current brief:\n${JSON.stringify(currentBrief, null, 2)}\n\nQuestion: ${question}\nAnswer: ${answer}`
    : `Question: ${question}\nAnswer: ${answer}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: BriefExtractionSchema,
    system: buildSystemPrompt(availableStyles),
    prompt: contextualPrompt,
  }, logger);

  return { ...currentBrief, ...object };
};
