import { generateObject } from 'ai';
import { StoryBriefSchema, type StoryBrief } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `You extract story details from user input into a StoryBrief. Be thorough but don't invent details the user didn't provide.

CRITICAL: Only include fields you have actual information for. OMIT fields entirely if the user didn't mention them - do NOT include empty strings or placeholder values.

EXTRACTION RULES:
1. Extract what the user explicitly mentioned or clearly implied
2. If they mention a character by name, create the character entry
3. If they describe a setting, capture it
4. If they mention an age or audience, set ageRange
5. DON'T invent names, settings, or plot details they didn't mention
6. DON'T fill in defaults for things they haven't discussed yet
7. DON'T include a field with an empty string - just omit it

WHAT TO EXTRACT (only if user provided info):
- title: Only if they explicitly named their story
- storyArc: The plot/theme they described (their words, expanded slightly)
- setting: Where it happens (only if mentioned)
- ageRange: Only if they specified an age/audience
- pageCount: Only if they mentioned length
- characters: Create entries for characters they mentioned (name if given, description from context)
- tone: Only if they described the mood/feel
- moral: Only if they mentioned a lesson/message
- interests: Things they said their child likes
- customInstructions: Specific requests they made

SMART INFERENCE (only when clearly implied):
- "my 5 year old" → ageRange around 4-6
- "bedtime story" → tone: gentle/calming
- "a brave little fox" → character with name TBD, traits: brave, small

OMIT fields the user hasn't addressed. The conversation will ask about missing pieces.`;

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
