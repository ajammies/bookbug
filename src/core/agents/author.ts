import { generateObject } from 'ai';
import { ProseSchema, type StoryWithPlot, type Prose } from '../schemas';
import { getModel } from '../config';

const SYSTEM_PROMPT = `Write prose content from a story with plot beats.

The story contains 5-6 structural beats (setup, conflict, rising_action, climax, resolution).
Expand each beat into multiple pages based on pageCount.

For a 24-page book with 5 beats:
- Setup: ~4 pages (introduce world and character)
- Conflict: ~4 pages (establish the problem)
- Rising Action: ~6 pages (attempts and obstacles)
- Climax: ~4 pages (turning point)
- Resolution: ~6 pages (ending and lesson)

Writing guidelines:
- Ages 2-5: Simple words, rhythmic patterns, 1-2 sentences per page
- Ages 6-9: Longer sentences, more vocabulary, up to a paragraph

Output only the prose fields:
- logline: One-sentence story summary
- theme: Central theme or message
- styleNotes: Optional writing style notes
- pages: Array of pages, each with summary, text, imageConcept`;

/**
 * AuthorAgent: Takes a StoryWithPlot and produces Prose
 *
 * Output contains ONLY the new fields (logline, theme, styleNotes, pages).
 * Caller composes the result: StoryWithProse = { ...story, prose: result }
 */
export const authorAgent = async (story: StoryWithPlot): Promise<Prose> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: ProseSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(story, null, 2),
  });

  return object;
};
