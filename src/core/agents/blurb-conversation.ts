import { generateObject } from 'ai';
import {
  BlurbConversationResponseSchema,
  type BlurbConversationResponse,
  type StoryWithPlot,
} from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Display the story arc and plot beats, then ask which to change.

Format your message as:
"[storyArcSummary]"

1. [Setup] description
2. [Conflict] description
3. [Rising Action] description
4. [Climax] description
5. [Resolution] description

Which beat would you like to change?

Chips should reference specific beats (e.g., "Strengthen the climax", "Add tension to beat 3") or offer approval. Set isApproved=true when the user approves.`;

export type BlurbMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * BlurbConversationAgent: Presents plot beats and gathers feedback
 *
 * Takes StoryWithPlot (composed type) which includes both the brief and plot structure.
 */
export const blurbConversationAgent = async (
  story: StoryWithPlot,
  history: BlurbMessage[]
): Promise<BlurbConversationResponse> => {
  const storyContext = `Current Story:\n${JSON.stringify(story, null, 2)}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: BlurbConversationResponseSchema,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: storyContext },
      ...history,
    ],
  });

  return object;
};
