import { StoryBriefSchema, type StoryBrief, type StoryCharacter } from '../schemas';
import type { Logger } from '../utils/logger';
import { extract } from './extractor';

/** Filter out incomplete characters (must have name) */
const filterValidCharacters = (characters: Partial<StoryCharacter>[]): StoryCharacter[] =>
  characters.filter((c): c is StoryCharacter => typeof c.name === 'string' && c.name.length > 0);

const buildSystemPrompt = (availableStyles: string[]): string => {
  const stylesNote =
    availableStyles.length > 0
      ? `\n\nStyle presets available: ${availableStyles.join(', ')}. If user mentions one of these (or "generate new style"), set stylePreset accordingly.`
      : '';

  return `Extract story brief fields from the conversation exchange.

RULES:
- Only extract fields explicitly stated in the question or answer
- If the user confirms something (e.g., "yes"), extract from the question they're confirming${stylesNote}`;
};

const buildContextualPrompt = (question: string, answer: string, currentBrief: Partial<StoryBrief>): string =>
  Object.keys(currentBrief).length > 0
    ? `Current brief:\n${JSON.stringify(currentBrief, null, 2)}\n\nQuestion: ${question}\nAnswer: ${answer}`
    : `Question: ${question}\nAnswer: ${answer}`;

export interface BriefExtractorOptions {
  availableStyles?: string[];
  logger?: Logger;
}

export interface BriefExtractionResult {
  brief: Partial<StoryBrief>;
  missingFields: string[];
}

/**
 * BriefExtractorAgent: Extracts StoryBrief fields from a Q&A exchange.
 * Focused on brief fields only - uses StoryBriefSchema.partial().
 *
 * @param question - The assistant's question
 * @param answer - The user's answer
 * @param currentBrief - Current accumulated brief state
 * @param options - Available styles and logger
 * @returns Merged partial brief with new extractions and any missing fields
 */
export const briefExtractorAgent = async (
  question: string,
  answer: string,
  currentBrief: Partial<StoryBrief> = {},
  options: BriefExtractorOptions = {}
): Promise<BriefExtractionResult> => {
  const { availableStyles = [], logger } = options;

  const prompt = buildContextualPrompt(question, answer, currentBrief);
  const context = buildSystemPrompt(availableStyles);

  const result = await extract(prompt, StoryBriefSchema, { context, logger });

  // Domain-specific: filter incomplete characters
  const extracted = { ...result.data };
  if (extracted.characters) {
    extracted.characters = filterValidCharacters(extracted.characters);
  }

  const brief = { ...currentBrief, ...extracted };
  const missingFields = result.status === 'incomplete' ? result.missingFields : [];

  return { brief, missingFields };
};
