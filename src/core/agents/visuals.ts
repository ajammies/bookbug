import { generateObject, streamObjectWithProgress } from '../services/ai';
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

const SYSTEM_PROMPT = `You are an illustrator for children's picture books. Given a story with prose, create visual direction.

IMPORTANT: You MUST output BOTH fields:
1. style: A concise VisualStyleGuide (keep descriptions brief)
2. illustratedPages: An array with ONE entry per page (REQUIRED - do not skip!)

For each page in illustratedPages:
- pageNumber: The page number (1, 2, 3...)
- beats: Array with at least one IllustrationBeat

For each beat:
- order, purpose, summary, emotion (keep brief)
- characters: Who appears
- shot: size and angle (required), other fields optional

Visual principles:
- Vary shot sizes (wide for establishing, close for emotion)
- Match composition to emotional beats
- Keep beat descriptions to 1-2 sentences

CRITICAL: Generate illustratedPages for EVERY page in the story. Do not stop after style.`;

/**
 * VisualsAgent: Takes a StoryWithProse and produces VisualDirection
 *
 * Output contains ONLY the new fields (style, illustratedPages).
 * Caller composes the result: ComposedStory = { ...story, visuals: result }
 */
export const visualsAgent = async (story: StoryWithProse, logger?: Logger): Promise<VisualDirection> => {
  return streamObjectWithProgress(
    {
      model: getModel(),
      schema: VisualDirectionSchema,
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(story, null, 2),
      maxOutputTokens: 64000,
    },
    createRepairFunction('IllustrationBeat.purpose must be: setup, build, twist, climax, payoff, or button'),
    logger
  );
};

/**
 * Per-page agents for incremental pipeline
 */

const STYLE_GUIDE_PROMPT = `Design a cohesive visual style guide for a children's picture book.

Given a story with plot, establish:
- art_style: Genre, medium, technique (e.g., watercolor, digital, gouache)
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

const STYLE_GUIDE_WITH_PRESET_PROMPT = `Design a cohesive visual style guide for a children's picture book.

IMPORTANT: The art_style has been pre-selected. Use it EXACTLY as provided.
Generate the remaining fields to complement the chosen art style:
- setting: Default environment, time of day, season, landmarks
- lighting: Scheme, direction, quality, color temperature
- color_script: Palette, harmony, saturation, accent colors
- mood_narrative: Overall emotional tone
- atmosphere_fx: Fog, particles, bloom effects
- constraints: Things to avoid (scary imagery, inappropriate content)

Visual style should complement:
- The chosen art direction style
- The story's emotional arc
- Target age range (simpler for younger, more detail for older)
- Setting and genre expectations`;

export interface StylePreset {
  genre: string[];
  medium: string[];
  technique: string[];
  style_strength?: number;
}

/**
 * StyleGuideAgent: Generates global visual style (once, upfront)
 * If stylePreset is provided, uses it and generates remaining fields
 */
export const styleGuideAgent = async (
  story: StoryWithPlot,
  stylePreset?: StylePreset
): Promise<VisualStyleGuide> => {
  const prompt = stylePreset
    ? JSON.stringify({ story, stylePreset }, null, 2)
    : JSON.stringify(story, null, 2);

  const { object } = await generateObject({
    model: getModel(),
    schema: VisualStyleGuideSchema,
    system: stylePreset ? STYLE_GUIDE_WITH_PRESET_PROMPT : STYLE_GUIDE_PROMPT,
    prompt,
    experimental_repairText: createRepairFunction(),
  });

  // If preset provided, ensure it's used exactly
  if (stylePreset) {
    object.art_style = stylePreset;
  }

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
- Story context (plot, characters with appearance specs, setting)
- Visual style guide (established art direction, colors, mood)
- Page number
- Prose page (text and imageConcept to illustrate)

For this page, create one or more IllustrationBeats:
- order: Sequence number (1, 2, 3...)
- purpose: setup, build, twist, climax, payoff, or button
- summary: What is happening visually (reference character appearance for accuracy)
- emotion: Emotional tone to convey
- characters: Who appears, their expression, pose, focus level
- shot: Composition (size, angle, POV, layout, staging)

Character rendering:
- Reference each character's appearance fields (eyeStyle, bodyType, clothing, etc.)
- Include species-appropriate details from character definitions
- Ensure distinctive features are visible when character is shown

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
