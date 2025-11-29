import { generateObject } from '../utils/ai';
import {
  ConversationResponseSchema,
  type ConversationResponse,
  type StoryBrief,
} from '../schemas';
import { getModel } from '../config';

const buildSystemPrompt = (availableStyles: string[]): string => {
  const stylesList = availableStyles.length > 0
    ? `Available art styles: ${availableStyles.join(', ')}, or "generate new"`
    : 'No preset styles available yet - will generate a new style.';

  return `Guide users through creating a StoryBrief by asking about what's missing.

${stylesList}

Ask one focused question at a time, prioritizing: artStyle (ask first if styles available!), storyArc, characters, setting, ageRange, pageCount, title. Provide 3-4 specific chip suggestions that fit their emerging story.

When asking about art style, use the available style names as chips (plus "Generate new style" as an option).

If they are very descriptive, or even paste json, add the entire thing to customInstructions field.

Required fields: title, storyArc, setting, ageRange, characters (at least 1), pageCount. artStyle is optional. Set isComplete=true when all required fields are filled.`;
};

export type MessageRole = 'user' | 'assistant';

export type Message = {
  role: MessageRole;
  content: string;
};

export interface ConversationAgentOptions {
  availableStyles?: string[];
}

/**
 * ConversationAgent: Decides what to ask next based on the current brief
 * Returns the next question, suggested chips, and completion status
 */
export const conversationAgent = async (
  currentBrief: Partial<StoryBrief>,
  history: Message[],
  options: ConversationAgentOptions = {}
): Promise<ConversationResponse> => {
  const { availableStyles = [] } = options;
  const briefContext = `Current StoryBrief state:\n${JSON.stringify(currentBrief, null, 2)}`;

  const { object } = await generateObject({
    model: getModel(),
    schema: ConversationResponseSchema,
    system: buildSystemPrompt(availableStyles),
    messages: [
      { role: 'user', content: briefContext },
      ...history,
    ],
  });

  return object;
};
