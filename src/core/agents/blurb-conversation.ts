import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  BlurbConversationResponseSchema,
  type BlurbConversationResponse,
  type StoryBlurb,
} from '../schemas';

const SYSTEM_PROMPT = `You help users refine their story's plot beats through conversation.

YOUR JOB:
1. Present the current plot beats in a readable, engaging way
2. Ask if they'd like to make changes
3. Provide helpful chips with specific improvement suggestions
4. Set isApproved=true when they're happy with the plot

MESSAGE FORMAT:
- Start with a brief, engaging summary of the story flow
- List the plot beats in a readable way (not raw JSON)
- Ask what they'd like to change or if it looks good

CHIP GUIDELINES:
Provide 3-4 chips that are SPECIFIC to this story:
- Suggest adding more tension/conflict
- Suggest character moment additions
- Suggest pacing changes (more buildup, faster ending, etc.)
- Suggest alternative plot directions based on characters
- Always include "Looks great, let's write it!" as an approval option

EXAMPLE CHIPS:
- "Add a moment where Luna doubts herself"
- "Make the obstacle bigger before the climax"
- "Give the sidekick a bigger role in the resolution"
- "Looks great, let's write it!"

Keep your message concise but warm. This is about collaborating on the story.`;

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
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: BlurbConversationResponseSchema,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: blurbContext },
      ...history,
    ],
  });

  return object;
};
