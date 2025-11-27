import { generateObject } from 'ai';
import { StoryBlurbSchema, type StoryBlurb } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Modify plot beats based on user feedback. Keep brief unchanged.

Users may reference beats by number ("change beat 3") or purpose ("strengthen the climax").

Rules:
- Maintain 4-6 beats with valid purposes: setup, conflict, rising_action, climax, resolution
- Preserve beats the user didn't mention
- Update storyArcSummary if the core story changes
- If user approves, return unchanged`;

/**
 * BlurbInterpreterAgent: Applies user's requested changes to plot beats
 */
export const blurbInterpreterAgent = async (
  userFeedback: string,
  currentBlurb: StoryBlurb
): Promise<StoryBlurb> => {
  const contextualPrompt = `Current StoryBlurb:\n${JSON.stringify(currentBlurb, null, 2)}\n\nUser feedback:\n${userFeedback}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: StoryBlurbSchema,
    system: SYSTEM_PROMPT,
    prompt: contextualPrompt,
  });

  return object;
};
