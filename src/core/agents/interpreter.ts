import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { StoryBriefSchema, type StoryBrief } from '../schemas';

const SYSTEM_PROMPT = `You are a story information extractor. Your job is to read user input and extract relevant information into a structured StoryBrief.

The user may provide:
- A complete story in one message
- An answer to a specific question
- Mixed information spanning multiple fields
- Vague or incomplete details

Instructions:
1. Extract any story-related information from the user's message
2. Map it to the appropriate StoryBrief fields
3. Only include fields where you have information
4. Infer details intelligently (e.g., a puppy protagonist → add to characters)
5. Leave fields empty if the user's input doesn't clarify them

StoryBrief fields:
- title: Story title
- storyArc: Main theme/arc/plot
- setting: Where the story takes place
- ageRange: { min, max } target ages (default 4-7 if unclear)
- pageCount: Number of pages (default 24 if not specified)
- characters: Array of { name, description, role, traits, notes }
- tone: Overall tone/mood
- moral: Lesson or moral
- interests: Child's interests to incorporate
- customInstructions: Any special requests

Return only the fields you can extract from the user's message.`;

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
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: StoryBriefSchema.partial(),
    system: SYSTEM_PROMPT,
    prompt: contextualPrompt,
  });

  return { ...currentBrief, ...object };
};
