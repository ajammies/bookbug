import { generateObject } from 'ai';
import {
  BlurbConversationResponseSchema,
  type BlurbConversationResponse,
  type StoryBlurb,
} from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Help users refine their story's plot beats through conversation.

Present the plot in an engaging way, ask for feedback, and provide 3-4 specific improvement suggestions as chips. Include an approval option. Set isApproved=true when they're happy.`;

export type BlurbMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * BlurbConversationAgent: Presents plot beats and gathers feedback
 */
export const blurbConversationAgent = async (
  currentBlurb: StoryBlurb,
  history: BlurbMessage[]
): Promise<BlurbConversationResponse> => {
  const blurbContext = `Current StoryBlurb:\n${JSON.stringify(currentBlurb, null, 2)}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: BlurbConversationResponseSchema,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: blurbContext },
      ...history,
    ],
  });

  return object;
};
