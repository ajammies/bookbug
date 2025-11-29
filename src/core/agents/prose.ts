import { generateObject, streamObjectWithProgress } from '../utils/ai';
import {
  ProseSchema,
  ProseSetupSchema,
  ProsePageSchema,
  type StoryWithPlot,
  type Prose,
  type ProseSetup,
  type ProsePage,
} from '../schemas';
import { getModel, getFastModel } from '../config';
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

const AGE_GUIDELINES = `AGE-SPECIFIC GUIDELINES
- Ages 2-4: 50-100 words total | 3-8 words/sentence | Simple conflicts (lost toy, scared) | Concrete words, repetition
- Ages 4-6: 200-400 words total | 5-10 words/sentence | Social situations, simple problem-solving | Mix simple + new words
- Ages 6-8: 400-800 words total | 8-15 words/sentence | Internal conflicts, empathy, multi-step problems | Descriptive vocabulary`;

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
 * Uses streaming to provide real-time progress updates via onProgress callback.
 * Output contains ONLY the new fields (logline, theme, styleNotes, pages).
 * Caller composes the result: StoryWithProse = { ...story, prose: result }
 */
export const proseAgent = async (
  story: StoryWithPlot,
  onProgress?: (message: string) => void,
  logger?: Logger
): Promise<Prose> => {
  return streamObjectWithProgress(
    {
      model: getFastModel(),
      schema: ProseSchema,
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(story, null, 2),
      maxOutputTokens: 64000,
    },
    onProgress,
    3000,
    createRepairFunction(),
    logger
  );
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
