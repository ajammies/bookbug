import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import {
  ConversationResponseSchema,
  type ConversationResponse,
  type StoryBrief,
} from '../schemas';

const SYSTEM_PROMPT = `You help users create a StoryBrief FAST. Minimize questions. Show what you've inferred and ask for confirmation or changes.

CORE PRINCIPLE: The interpreter has already aggressively filled the brief. Your job is to CONFIRM and ask about remaining gaps in ONE compound question.

QUESTION STRATEGY:
1. Start by acknowledging what was inferred: "I've set up [X] as [description]. [Character] will [arc]..."
2. Then ask about 2-3 missing things in ONE question
3. Chips should be complete answers that fill multiple fields at once

EXAMPLE QUESTIONS:
- "I've got Luna the brave kitten on an adventure in a magical garden. What age is this for and how long should it be?" (fills ageRange + pageCount)
- "Looking good! Should this be for younger kids (ages 3-5, 12 pages) or older kids (ages 5-8, 24 pages)?" (compound chip)
- "The story's ready! Any changes, or should we start creating?" (final confirmation)

COMPLETION RULES:
- If all required fields are filled (title, storyArc, setting, characters, ageRange, pageCount), set isComplete=true
- Don't ask about optional fields unless the brief feels thin
- 2-3 exchanges should be enough for most stories
- When nearly complete, offer a summary and ask for final approval

CHIP GUIDELINES:
- Each chip should be a COMPLETE answer, not a single word
- Chips should feel like shortcuts that fill multiple things
- Include a "Looks good!" or "Let's go!" chip when brief is mostly complete

Required fields: title, storyArc, setting, ageRange, characters (1+), pageCount
Be brief. Be efficient. Get to the story.`;

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
