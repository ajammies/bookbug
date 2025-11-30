import { generateObject } from '../services/ai';
import {
  PlotConversationResponseSchema,
  type PlotConversationResponse,
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

CHIPS: Generate 3-4 suggestions:
- Reference specific beats (e.g., "Strengthen the climax", "Add tension to beat 3")
- LAST chip must be approval: "Looks good - let's write it!"

APPROVAL DETECTION (isApproved field):
- Set TRUE when user explicitly approves: clicks approval chip, says "yes", "approved", "looks good", "let's go", "perfect"
- Set FALSE for "I like the suggestions" - this means INCORPORATE them, not approve
- Set FALSE for any feedback requesting changes
- When in doubt, set FALSE and ask for clarification`;

export type PlotMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * PlotConversationAgent: Presents plot beats and gathers feedback
 *
 * Takes StoryWithPlot (composed type) which includes both the brief and plot structure.
 */
export const plotConversationAgent = async (
  story: StoryWithPlot,
  history: PlotMessage[]
): Promise<PlotConversationResponse> => {
  const storyContext = `Current Story:\n${JSON.stringify(story, null, 2)}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: PlotConversationResponseSchema,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: storyContext },
      ...history,
    ],
  });

  return object;
};
