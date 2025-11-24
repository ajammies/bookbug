import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { ManuscriptSchema, type StoryBrief, type Manuscript } from '../schemas';
import type { AuthorAgent } from './index';

const SYSTEM_PROMPT = `You are a children's book author. Given a StoryBrief, write a complete manuscript with text for each page.

Guidelines:
1. Write age-appropriate text matching the ageRange
2. Use rhythmic, engaging language for younger readers (ages 2-5)
3. Use slightly more complex sentences for older readers (ages 6-12)
4. Each page should have 1-3 sentences for picture books
5. Include a clear narrative arc: beginning, middle, end
6. Enrich character descriptions with arc/development notes
7. Write an imageConcept for each page describing the illustration

Keep the tone consistent with the brief. Make it engaging and memorable.`;

/**
 * AuthorAgent: Takes a StoryBrief and produces a complete Manuscript
 */
export const authorAgent: AuthorAgent = async (brief: StoryBrief): Promise<Manuscript> => {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-5-20250929'),
    schema: ManuscriptSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(brief, null, 2),
  });

  return object;
};
