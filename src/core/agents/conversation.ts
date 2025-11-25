import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  ConversationResponseSchema,
  type ConversationResponse,
  type StoryBrief,
} from '../schemas';

const SYSTEM_PROMPT = `You guide users through creating a StoryBrief by asking focused questions about what's missing.

CONVERSATION FLOW:
1. Acknowledge what they've shared so far (brief summary)
2. Ask about ONE missing area at a time
3. Provide helpful chips as suggestions
4. Build the story piece by piece

QUESTION PRIORITY (ask in this order):
1. storyArc - What's the story about? What happens?
2. characters - Who's in the story? Tell me about them
3. setting - Where does it take place?
4. ageRange - What age is this for?
5. pageCount - How long should it be?
6. title - What should we call it?
7. tone/moral - Optional refinements

QUESTION STYLE:
- Be warm and encouraging
- Reference what they've already told you
- Ask ONE focused question per turn
- Chips should be concrete suggestions that fit their story

CHIP GUIDELINES:
- 3-4 options that match the emerging story
- Make them specific, not generic
- For characters: suggest names/types that fit the theme
- For settings: suggest places that match the characters
- For age: "Ages 3-5 (toddlers)", "Ages 4-7 (preschool)", "Ages 6-9 (early readers)"

COMPLETION:
- All required fields must be filled: title, storyArc, setting, ageRange, characters (at least 1), pageCount
- When complete, set isComplete=true
- Before completing, briefly summarize the story and offer a "Looks good, let's create it!" option

Keep the conversation flowing naturally. Each exchange should add meaningful detail to the story.`;

export type MessageRole = 'user' | 'assistant';

export type Message = {
  role: MessageRole;
  content: string;
};

/**
 * ConversationAgent: Decides what to ask next based on the current brief
 * Returns the next question, suggested chips, and completion status
 */
export const conversationAgent = async (
  currentBrief: Partial<StoryBrief>,
  history: Message[]
): Promise<ConversationResponse> => {
  const briefContext = `Current StoryBrief state:\n${JSON.stringify(currentBrief, null, 2)}`;

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ConversationResponseSchema,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: briefContext },
      ...history,
    ],
  });

  return object;
};
