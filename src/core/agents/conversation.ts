import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  ConversationResponseSchema,
  type ConversationResponse,
  type StoryBrief,
} from '../schemas';

const SYSTEM_PROMPT = `You are a friendly children's book story designer helping users create a StoryBrief through conversation.

Your job:
1. Analyze what's missing or unclear in the current brief
2. Ask ONE question to fill the most important gap
3. Generate 3-4 suggested answers ("chips") based on context
4. Be conversational and adapt to the user's style

Required fields: title, storyArc, setting, ageRange, characters (at least 1), pageCount
Optional fields: tone, moral, interests, customInstructions

When all required fields are filled and the story feels complete, set isComplete: true.

Guidelines:
- Keep questions focused and friendly
- Generate chips that match the story's emerging theme
- If the user already provided lots of info, ask about details (age range, page count)
- If the user gave minimal info, ask about core story elements
- Reference previous answers in your questions for continuity
- Prioritize asking about: storyArc → characters → setting → title → ageRange → pageCount`;

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
