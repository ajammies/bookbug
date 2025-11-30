import { generateObject } from '../utils/ai';
import {
  ConversationResponseSchema,
  type ConversationResponse,
  type StoryBrief,
} from '../schemas';
import { getModel } from '../config';

const buildSystemPrompt = (availableStyles: string[]): string => {
  const hasPresets = availableStyles.length > 0;
  const styleChips = hasPresets
    ? `Use these EXACT chips: ${availableStyles.map(s => `"${s}"`).join(', ')}, "Generate new style"`
    : '';

  return `Guide users through creating a StoryBrief by asking about what's missing.

${hasPresets ? `IMPORTANT: Your FIRST question MUST be about stylePreset. ${styleChips}` : ''}

After stylePreset (if presets available), ask about: storyArc, characters, setting, ageRange, pageCount, title. Ask one focused question at a time. Provide 3-4 specific chip suggestions that fit their emerging story.

If they are very descriptive, or even paste json, add the entire thing to customInstructions field.

Required fields: title, storyArc, setting, ageRange, characters (at least 1), pageCount. stylePreset is optional. Set isComplete=true when all required fields are filled.`;
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
