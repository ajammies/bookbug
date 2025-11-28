import { generateObject } from 'ai';
import {
  ProseSchema,
  ProseSetupSchema,
  ProsePageSchema,
  type StoryWithPlot,
  type Prose,
  type ProseSetup,
  type ProsePage,
} from '../schemas';
import { getModel } from '../config';
import { createRepairFunction } from '../utils/repair';

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
 * ProseAgent: Takes a StoryWithPlot and produces Prose
 *
 * Output contains ONLY the new fields (logline, theme, styleNotes, pages).
 * Caller composes the result: StoryWithProse = { ...story, prose: result }
 */
export const proseAgent = async (story: StoryWithPlot): Promise<Prose> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: ProseSchema,
    system: SYSTEM_PROMPT,
    prompt: JSON.stringify(story, null, 2),
    experimental_repairText: createRepairFunction(),
  });

  return object;
};

/**
 * Per-page agents for incremental pipeline
 */

const SETUP_PROMPT = `Establish the story's voice and narrative direction.

Given a story with plot structure, define:
- logline: One-sentence hook that captures the adventure
- theme: Central message or emotional truth
- styleNotes: Writing voice (warm, playful, lyrical, etc.)

Writing voice by age:
- Ages 2-5: Simple, rhythmic, repetitive patterns
- Ages 6-9: More complex sentences, richer vocabulary`;

/**
 * ProseSetupAgent: Generates story-wide prose metadata (once, upfront)
 */
export const proseSetupAgent = async (story: StoryWithPlot): Promise<ProseSetup> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: ProseSetupSchema,
    system: SETUP_PROMPT,
    prompt: JSON.stringify(story, null, 2),
    experimental_repairText: createRepairFunction(),
  });

  return object;
};

/**
 * Input for prosePageAgent - provides context for coherent page generation
 */
export interface ProsePageInput {
  story: StoryWithPlot;
  proseSetup: ProseSetup;
  pageNumber: number;
  previousPages: ProsePage[];
}

const PAGE_PROMPT = `Write prose for a single page of a children's book.

You receive:
- Story context (plot, characters, setting)
- Prose setup (logline, theme, styleNotes)
- Page number and total page count
- Previous pages (for continuity)

Guidelines:
- Follow the established voice from styleNotes
- Maintain narrative continuity with previous pages
- Pace according to page position (early = setup, middle = action, late = resolution)
- Ages 2-5: 1-2 sentences per page
- Ages 6-9: Up to a paragraph

Output a single page with:
- summary: Brief description of what happens
- text: The actual prose for the page
- imageConcept: Description of the illustration`;

/**
 * ProsePageAgent: Generates prose for a single page
 */
export const prosePageAgent = async (input: ProsePageInput): Promise<ProsePage> => {
  const { story, proseSetup, pageNumber, previousPages } = input;

  const context = {
    story,
    proseSetup,
    pageNumber,
    totalPages: story.pageCount,
    previousPages,
  };

  const { object } = await generateObject({
    model: getModel(),
    schema: ProsePageSchema,
    system: PAGE_PROMPT,
    prompt: JSON.stringify(context, null, 2),
    experimental_repairText: createRepairFunction(),
  });

  return object;
};
