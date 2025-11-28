import { generateObject } from '../utils/ai';
import { StoryBriefSchema, type StoryBrief } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Extract story details from user input into a StoryBrief.

Only include fields the user explicitly mentioned or clearly implied. Omit fields entirely if not mentioned - don't invent details or use empty strings.`;

/**
 * InterpreterAgent: Extracts StoryBrief fields from any user input
 * Returns a partial brief that can be merged with existing data
 */
export const interpreterAgent = async (
  userMessage: string,
  currentBrief: Partial<StoryBrief>
): Promise<Partial<StoryBrief>> => {
  const contextualPrompt = currentBrief && Object.keys(currentBrief).length > 0
    ? `Current brief context:\n${JSON.stringify(currentBrief, null, 2)}\n\nUser message:\n${userMessage}`
    : userMessage;

  const { object } = await generateObject({
    model: getModel(),
    schema: StoryBriefSchema.partial(),
    system: SYSTEM_PROMPT,
    prompt: contextualPrompt,
  });

  return { ...currentBrief, ...object };
};
