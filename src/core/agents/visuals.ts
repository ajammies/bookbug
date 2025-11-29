import { generateObject, streamObjectWithProgress } from '../utils/ai';
import { z } from 'zod';
import {
  VisualDirectionSchema,
  VisualStyleGuideSchema,
  IllustrationBeatSchema,
  type StoryWithPlot,
  type StoryWithProse,
  type VisualDirection,
  type VisualStyleGuide,
  type IllustratedPage,
  type ProsePage,
} from '../schemas';
import { getModel } from '../config';
import { createRepairFunction } from '../utils/repair';
import type { Logger } from '../utils/logger';

const SYSTEM_PROMPT = `You are an illustrator for children's picture books. Given a story with prose, create visual direction for each page.

Your responsibilities:
1. Define a cohesive VisualStyleGuide (art direction, setting, lighting, colors, mood)
2. Break each page into one or more IllustrationBeats
3. For each beat, specify:
   - Shot composition (size, angle, POV, layout)
   - Character positions, expressions, poses
   - Setting details (can override global setting per-beat)
   - Any visual overrides for lighting, mood, atmosphere

Visual principles:
- Use variety in shot sizes (mix wide establishing shots with close-ups)
- Match shot composition to emotional beats (wide for wonder, close for intimacy)
- Consider child's eye level for relatable perspective
- Use color and lighting to reinforce mood
- Ensure visual continuity across pages

Output only the visual direction fields:
- style: VisualStyleGuide with art direction, setting, lighting, colors
- illustratedPages: Array of pages, each with pageNumber and beats`;

/**
 * VisualsAgent: Takes a StoryWithProse and produces VisualDirection
 *
 * Uses streaming to provide real-time progress updates via onProgress callback.
 * Output contains ONLY the new fields (style, illustratedPages).
 * Caller composes the result: ComposedStory = { ...story, visuals: result }
 */
export const visualsAgent = async (
  story: StoryWithProse,
  onProgress?: (message: string) => void,
  logger?: Logger
): Promise<VisualDirection> => {
  return streamObjectWithProgress(
    {
      model: getModel(),
      schema: VisualDirectionSchema,
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(story, null, 2),
      maxOutputTokens: 16000,
    },
    onProgress,
    3000,
    createRepairFunction('IllustrationBeat.purpose must be: setup, build, twist, climax, payoff, or button'),
    logger
  );
};

/**
 * Per-page agents for incremental pipeline
 */

const STYLE_GUIDE_PROMPT = `Design a cohesive visual style guide for a children's picture book.

Given a story with plot, establish:
- art_direction: Genre, medium, technique (e.g., watercolor, digital, gouache)
- setting: Default environment, time of day, season, landmarks
- lighting: Scheme, direction, quality, color temperature
- color_script: Palette, harmony, saturation, accent colors
- mood_narrative: Overall emotional tone
- atmosphere_fx: Fog, particles, bloom effects
- constraints: Things to avoid (scary imagery, inappropriate content)

Visual style should complement:
- The story's emotional arc
- Target age range (simpler for younger, more detail for older)
- Setting and genre expectations`;

/**
 * StyleGuideAgent: Generates global visual style (once, upfront)
 */
export const styleGuideAgent = async (story: StoryWithPlot): Promise<VisualStyleGuide> => {
  const { object } = await generateObject({
    model: getModel(),
    schema: VisualStyleGuideSchema,
    system: STYLE_GUIDE_PROMPT,
    prompt: JSON.stringify(story, null, 2),
    experimental_repairText: createRepairFunction(),
  });

  return object;
};

/**
 * Input for pageVisualsAgent
 */
export interface PageVisualsInput {
  story: StoryWithPlot;
  styleGuide: VisualStyleGuide;
  pageNumber: number;
  prosePage: ProsePage;
}

const PAGE_VISUALS_PROMPT = `Create illustration beats for a single page of a children's picture book.

You receive:
- Story context (plot, characters, setting)
- Visual style guide (established art direction, colors, mood)
- Page number
- Prose page (text and imageConcept to illustrate)

For this page, create one or more IllustrationBeats:
- order: Sequence number (1, 2, 3...)
- purpose: setup, build, twist, climax, payoff, or button
- summary: What is happening visually
- emotion: Emotional tone to convey
- characters: Who appears, their expression, pose, focus level
- shot: Composition (size, angle, POV, layout, staging)

Shot composition principles:
- Vary shot sizes (wide for establishing, close for emotion)
- Use child's eye level for relatability
- Match composition to emotional beat
- Consider page layout (full bleed, framed, spot illustration)`;

// Schema for just the beats (pageNumber is known input, not LLM output)
const PageBeatsSchema = z.object({
  beats: z.array(IllustrationBeatSchema).min(1).describe('Illustration beats for this page'),
});

/**
 * PageVisualsAgent: Generates illustration beats for a single page
 */
export const pageVisualsAgent = async (input: PageVisualsInput): Promise<IllustratedPage> => {
  const { story, styleGuide, pageNumber, prosePage } = input;

  const context = {
    story,
    styleGuide,
    pageNumber,
    totalPages: story.pageCount,
    prosePage,
  };

  const { object } = await generateObject({
    model: getModel(),
    schema: PageBeatsSchema,
    system: PAGE_VISUALS_PROMPT,
    prompt: JSON.stringify(context, null, 2),
    experimental_repairText: createRepairFunction(
      'IllustrationBeat.purpose must be: setup, build, twist, climax, payoff, or button'
    ),
  });

  // Construct IllustratedPage with known pageNumber
  return {
    pageNumber,
    beats: object.beats,
  };
};
