import { generateObject } from 'ai';
import { ManuscriptSchema, type StoryBlurb, type Manuscript } from '../schemas';
import { getModel } from '../config';
import type { AuthorAgent } from './index';

const SYSTEM_PROMPT = `Write a complete manuscript from a StoryBlurb.

The blurb contains 5-6 structural beats (setup, conflict, rising_action, climax, resolution). Expand each beat into multiple pages based on pageCount.

For a 24-page book with 5 beats:
- Setup: ~4 pages (introduce world and character)
- Conflict: ~4 pages (establish the problem)
- Rising Action: ~6 pages (attempts and obstacles)
- Climax: ~4 pages (turning point)
- Resolution: ~6 pages (ending and lesson)

Writing guidelines:
- Ages 2-5: Simple words, rhythmic patterns, 1-2 sentences per page
- Ages 6-9: Longer sentences, more vocabulary, up to a paragraph

Each page needs: summary, text, imageConcept (what to illustrate).`;

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
