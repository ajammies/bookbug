import { generateObject } from '../services/ai';
import { StoryBriefSchema, type StoryBrief, type StoryCharacter } from '../schemas';
import { getModel } from '../config';
import type { Logger } from '../utils/logger';
import { toExtractablePartial, stripNulls } from '../utils/extractable-schema';

// Extractable schema: all fields nullable + optional for safe LLM extraction
const BriefExtractionSchema = toExtractablePartial(StoryBriefSchema);

/** Filter out incomplete characters (must have name) */
const filterValidCharacters = (characters: Partial<StoryCharacter>[]): StoryCharacter[] =>
  characters.filter((c): c is StoryCharacter => typeof c.name === 'string' && c.name.length > 0);

const buildSystemPrompt = (availableStyles: string[]): string => {
  const stylesNote = availableStyles.length > 0
    ? `\n\nStyle presets available: ${availableStyles.join(', ')}. If user mentions one of these (or "generate new style"), set stylePreset accordingly.`
    : '';

  return `Extract story brief fields from the conversation exchange.

RULES:
- Set fields to null if unknown or not mentioned
- Only extract fields explicitly stated in the question or answer
- If the user confirms something (e.g., "yes"), extract from the question they're confirming${stylesNote}`;
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

  // Strip nulls and merge with current brief
  const extracted = stripNulls(object as Record<string, unknown>) as Partial<StoryBrief>;

  // Filter out incomplete characters (LLM sometimes returns partial objects)
  if (extracted.characters) {
    extracted.characters = filterValidCharacters(extracted.characters);
  }

  return { ...currentBrief, ...extracted };
};
