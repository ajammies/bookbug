import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { StoryBriefSchema, type StoryBrief } from '../schemas';
import type { BookBuilderAgent } from './index';

const SYSTEM_PROMPT = `You are a children's book story designer. Given a user's prompt describing a story idea, extract and expand it into a complete StoryBrief.

Your job is to:
1. Identify the core story arc and theme
2. Define the setting (where/when the story takes place)
3. Create compelling characters with clear roles and traits
4. Determine appropriate age range based on content complexity
5. Suggest a tone and moral if not explicitly provided
6. Note any interests or custom instructions from the user

Be creative but stay true to the user's intent. Default to age range 4-7 if not specified.`;

/**
 * BookBuilderAgent: Takes a raw user prompt and produces a StoryBrief
 */
export const bookBuilderAgent: BookBuilderAgent = async (userPrompt: string): Promise<StoryBrief> => {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: StoryBriefSchema,
    system: SYSTEM_PROMPT,
    prompt: userPrompt,
  });

  return object;
};
