import { generateObject } from 'ai';
import { ManuscriptSchema, type StoryBlurb, type Manuscript } from '../schemas';
import { getModel } from '../config';
import type { AuthorAgent } from './index';

const SYSTEM_PROMPT = `You are a children's book author. Given a StoryBlurb (with brief and plot beats), write a complete manuscript with text for each page.

YOUR INPUT:
- brief: Character details, setting, age range, tone, moral
- plotBeats: The approved story outline (one beat per page typically)
- allowCreativeLiberty: Whether you can embellish or should stick closely to beats

WRITING GUIDELINES:
1. Each plot beat becomes one page (or spread) of text
2. Write age-appropriate language for the ageRange
3. For ages 2-5: Simple words, rhythmic patterns, repetition
4. For ages 6-9: Slightly longer sentences, more vocabulary
5. Each page: 1-3 sentences for picture books, up to a short paragraph for older readers
6. Follow the plot beats closely - they've been approved by the user
7. Make dialogue natural and character voices distinct

PAGE STRUCTURE:
- summary: Brief description of what happens (for reference)
- text: The actual prose that will appear on the page
- imageConcept: Description of the illustration for this page

Keep the tone consistent. Honor the plot beats. Make it magical.`;

/**
 * AuthorAgent: Takes a StoryBlurb and produces a complete Manuscript
 */
export const authorAgent: AuthorAgent = async (blurb: StoryBlurb): Promise<Manuscript> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: ManuscriptSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(blurb, null, 2),
  });

  return object;
};
