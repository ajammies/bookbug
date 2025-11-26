import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { StoryBlurbSchema, type StoryBlurb } from '../schemas';

const SYSTEM_PROMPT = `You modify a StoryBlurb's plot beats based on user feedback.

YOUR JOB:
1. Read the user's requested change
2. Apply it to the existing plot beats
3. Return the updated StoryBlurb with modified plotBeats

MODIFICATION TYPES:
- Adding beats: Insert new plot points where requested
- Removing beats: Delete unwanted moments
- Reordering: Move beats around for better pacing
- Editing: Revise specific beats to change what happens
- Expanding: Add more detail or split a beat into multiple
- Condensing: Merge beats or simplify

RULES:
- Keep the brief unchanged (only modify plotBeats)
- Maintain story structure (setup → conflict → resolution)
- Preserve beats the user didn't mention changing
- Make sure the story still flows logically
- Keep each beat concise (1-2 sentences)

If the user says something like "looks good" or approves, return the blurb unchanged.`;

/**
 * BlurbInterpreterAgent: Applies user's requested changes to plot beats
 */
export const blurbInterpreterAgent = async (
  userFeedback: string,
  currentBlurb: StoryBlurb
): Promise<StoryBlurb> => {
  const contextualPrompt = `Current StoryBlurb:\n${JSON.stringify(currentBlurb, null, 2)}\n\nUser feedback:\n${userFeedback}`;

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: StoryBlurbSchema,
    system: SYSTEM_PROMPT,
    prompt: contextualPrompt,
  });

  return object;
};
