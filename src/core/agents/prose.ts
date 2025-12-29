import { generateObject, streamObjectWithProgress } from '../services/ai';
import {
  ProseSchema,
  ProseSetupSchema,
  ProsePageSchema,
  type Story,
  type Prose,
  type ProseSetup,
  type ProsePage,
} from '../schemas';
import { getModel } from '../config';
import { createRepairFunction } from '../utils/repair';
import type { Logger } from '../utils/logger';

// ============================================================================
// Story Quality Guidelines
// ============================================================================

const QUALITY_GUIDELINES = `STORY QUALITY GUIDELINES

EMOTIONAL RESONANCE
- Use conflicts children face: sharing, jealousy, new experiences, frustration
- Show mixed emotions (excited but scared)
- Make reactions believable for age level
- Avoid: adult concerns, fake-happy responses

STRUCTURE
- Beginning: Introduce character + world (2-3 sentences)
- Middle: One clear problem that escalates
- End: Character-driven resolution + emotional closure
- Each sentence advances plot
- Avoid: exposition dumps, multiple problems, rushed endings

CHARACTER GROWTH
- Show traits through actions, not descriptions
- Character makes mistakes → experiences consequences → learns gradually
- Display emotional range throughout
- Avoid: perfect characters, instant transformations

MORAL TEACHING
- Embed lessons in actions/consequences, never state explicitly
- One lesson per story
- Let story teach; characters don't lecture
- Avoid: "And that's why you should..." endings

LANGUAGE
- Use sensory details (what they see/hear/feel)
- Specific verbs ("tiptoed" not "walked quietly")
- Vary sentence length for rhythm
- Show don't tell ("hands shaking" not "was nervous")
- Avoid: abstract language, clichés, purple prose

AUTHENTIC VOICE
- Write from child's perspective/worldview
- Natural child dialogue: "That's not fair!" "I want a turn!"
- Use child logic (immediate, concrete, self-focused)
- Avoid: adult idioms, wise philosophical children, preachy tone

CONFLICT RESOLUTION
- Age-appropriate conflicts children recognize
- Show attempts including failures before success
- Resolution through character action, not luck/magic
- Model healthy coping (asking for help, compromise, expressing feelings)`;

const AGE_GUIDELINES = `PER-PAGE TEXT LIMITS (picture books have minimal text!)
- Ages 2-4: 1-2 sentences per page (10-20 words max) | Simple words, repetition
- Ages 4-6: 2-3 sentences per page (20-40 words max) | Mix simple + new words
- Ages 6-8: 3-4 sentences per page (40-60 words max) | Descriptive vocabulary
- Ages 8+: 3-4 sentences per page (40-60 words max) | Descriptive vocabulary


CRITICAL: Each page should have just a few lines of text. The illustrations carry the story.`;

// ============================================================================
// Prompts
// ============================================================================

const SYSTEM_PROMPT = `Write prose content from a story with plot beats.

The story contains structural beats (setup, conflict, rising_action, climax, resolution).
Expand each beat into multiple pages based on pageCount.

For a 24-page book with 5 beats:
- Setup: ~4 pages (introduce world and character)
- Conflict: ~4 pages (establish the problem)
- Rising Action: ~6 pages (attempts and obstacles)
- Climax: ~4 pages (turning point)
- Resolution: ~6 pages (ending and lesson)

${QUALITY_GUIDELINES}

${AGE_GUIDELINES}

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
export const proseAgent = async (story: Story, logger?: Logger): Promise<Prose> => {
  logger?.debug(
    { agent: 'proseAgent', title: story.title, pageCount: story.pageCount, beatCount: story.plotBeats.length },
    'Generating full prose'
  );

  const prose = await streamObjectWithProgress(
    {
      model: getModel(),
      schema: ProseSchema,
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(story, null, 2),
      maxOutputTokens: 64000,
    },
    createRepairFunction(),
    logger,
    'proseAgent'
  );

  logger?.info(
    { agent: 'proseAgent', pageCount: prose.pages.length, logline: prose.logline?.substring(0, 80) },
    'Full prose generated'
  );

  return prose;
};

/**
 * Per-page agents for incremental pipeline
 */

const SETUP_PROMPT = `Establish the story's voice and narrative direction.

Given a story with plot structure, define:
- logline: One-sentence hook that captures the adventure
- theme: Central message or emotional truth (embed in story, never state explicitly)
- styleNotes: Writing voice (warm, playful, lyrical, etc.)

VOICE GUIDELINES
- Write from child's perspective/worldview
- Use child logic (immediate, concrete, self-focused)
- Natural child dialogue: "That's not fair!" "I want a turn!"
- Show emotions through physical details ("hands shaking" not "was nervous")
- Avoid: adult idioms, preachy tone, philosophical children

${AGE_GUIDELINES}`;

/**
 * ProseSetupAgent: Generates story-wide prose metadata (once, upfront)
 */
export const proseSetupAgent = async (story: Story, logger?: Logger): Promise<ProseSetup> => {
  logger?.debug(
    { agent: 'proseSetupAgent', title: story.title },
    'Generating prose setup'
  );

  const { object } = await generateObject({
    model: getModel(),
    schema: ProseSetupSchema,
    system: SETUP_PROMPT,
    prompt: JSON.stringify(story, null, 2),
    experimental_repairText: createRepairFunction(),
  }, logger, 'proseSetupAgent');

  logger?.info(
    { agent: 'proseSetupAgent', logline: object.logline?.substring(0, 80), theme: object.theme?.substring(0, 50) },
    'Prose setup generated'
  );

  return object;
};

/**
 * Input for prosePageAgent - provides context for coherent page generation
 */
export interface ProsePageInput {
  story: Story;
  proseSetup: ProseSetup;
  pageNumber: number;
  previousPages: ProsePage[];
  logger?: Logger;
}

const PAGE_PROMPT = `Write prose for a single page of a children's book.

You receive:
- Story context (plot, characters, setting)
- Prose setup (logline, theme, styleNotes)
- Page number and total page count
- Previous pages (for continuity)

WRITING GUIDELINES
- Follow the established voice from styleNotes
- Maintain narrative continuity with previous pages
- Pace according to page position (early = setup, middle = action, late = resolution)
- Each sentence advances plot - no filler
- Show character emotions through actions ("hands shaking" not "was nervous")
- Use sensory details and specific verbs ("tiptoed" not "walked quietly")
- Never state the moral explicitly
- Child-authentic voice: immediate, concrete, self-focused perspective

${AGE_GUIDELINES}

Output a single page with:
- summary: Brief description of what happens
- text: The actual prose for the page
- imageConcept: Description of the illustration`;

/**
 * ProsePageAgent: Generates prose for a single page
 */
export const prosePageAgent = async (input: ProsePageInput): Promise<ProsePage> => {
  const { story, proseSetup, pageNumber, previousPages, logger } = input;

  logger?.debug(
    { agent: 'prosePageAgent', pageNumber, totalPages: story.pageCount, previousPagesCount: previousPages.length },
    'Generating page prose'
  );

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
  }, logger, 'prosePageAgent');

  logger?.info(
    { agent: 'prosePageAgent', pageNumber, textLength: object.text.length, summary: object.summary?.substring(0, 50) },
    'Page prose generated'
  );

  return object;
};
