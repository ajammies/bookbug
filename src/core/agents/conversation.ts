import { z } from 'zod';
import { generateObject, withOptionsResponse } from '../services/ai';
import { type ConversationResponse, type StoryBrief } from '../schemas';
import { getModel } from '../config';
import type { Logger } from '../utils/logger';

/** Create conversation response schema with configurable options max */
const createConversationSchema = (maxOptions: number) =>
  withOptionsResponse(
    z.object({
      question: z.string().min(1).describe('The next question to ask the user'),
    }),
    { max: maxOptions }
  );

const buildSystemPrompt = (availableStyles: string[]): string => {
  const hasPresets = availableStyles.length > 0;
  const styleOptions = hasPresets
    ? `Use these EXACT options: ${availableStyles.map(s => `"${s}"`).join(', ')}, "Generate new style"`
    : '';

  return `Guide users through creating a StoryBrief by asking about what's missing.

${hasPresets ? `IMPORTANT: Your FIRST question MUST be about stylePreset. ${styleOptions}` : ''}

After stylePreset (if presets available), ask about: storyArc, characters, setting, ageRange, pageCount, title. Ask one focused question at a time. Provide 3-4 specific option suggestions that fit their emerging story.

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
  /** Fields that failed validation - helps agent ask targeted follow-up */
  missingFields?: string[];
  logger?: Logger;
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
  const { availableStyles = [], missingFields = [], logger } = options;

  const currentFields = Object.keys(currentBrief).filter(k => currentBrief[k as keyof StoryBrief] !== undefined);
  logger?.debug(
    { agent: 'conversationAgent', historyLength: history.length, currentFields, missingFields },
    'Generating conversation response'
  );

  const missingHint = missingFields.length > 0
    ? `\n\nIMPORTANT: These fields failed validation and need to be collected: ${missingFields.join(', ')}. Ask about these specifically.`
    : '';

  const briefContext = `Current StoryBrief state:\n${JSON.stringify(currentBrief, null, 2)}${missingHint}`;

  // +1 for "Generate new style" option when showing style presets
  const maxOptions = Math.max(8, availableStyles.length + 1);
  const schema = createConversationSchema(maxOptions);

  const { object } = await generateObject({
    model: getModel(),
    schema,
    system: buildSystemPrompt(availableStyles),
    messages: [
      { role: 'user', content: briefContext },
      ...history,
    ],
  }, logger, 'conversationAgent');

  logger?.info(
    { agent: 'conversationAgent', isComplete: object.isComplete, question: object.question?.substring(0, 80), optionCount: object.options.length },
    'Conversation response generated'
  );

  return object;
};
