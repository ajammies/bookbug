import { generateObject } from '../utils/ai';
import {
  ConversationResponseSchema,
  type ConversationResponse,
  type StoryBrief,
} from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Guide users through creating a StoryBrief by asking about what's missing.

Ask one focused question at a time, prioritizing: storyArc, characters, setting, ageRange, pageCount, title. Provide 3-4 specific chip suggestions that fit their emerging story.

If they are very descriptive, or even paste json, add the entire thing to cusomInstructiosns field.

Required fields: title, storyArc, setting, ageRange, characters (at least 1), pageCount. Set isComplete=true when all are filled.`;

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
    model: getModel(),
    schema: ConversationResponseSchema,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: briefContext },
      ...history,
    ],
  });

  return object;
};
