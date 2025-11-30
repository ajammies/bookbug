import { z } from 'zod';
import { AgeRangeSchema, StoryCharacterSchema } from './common';
import { PlotStructureSchema } from './plot';
import { ProseSchema } from './prose';
import { VisualDirectionSchema, CharacterDesignSchema } from './visuals';
import { StoryBriefSchema } from './brief';
import { StoryWithPlotSchema, StoryWithProseSchema, ComposedStorySchema } from './composed';

/**
 * PartialStory: All fields optional for progressive filling
 * Used during pipeline execution where data is accumulated stage by stage.
 */
export const PartialStorySchema = z.object({
  // Brief fields
  title: z.string().optional(),
  storyArc: z.string().optional(),
  setting: z.string().optional(),
  ageRange: AgeRangeSchema.optional(),
  pageCount: z.number().optional(),
  characters: z.array(StoryCharacterSchema).optional(),
  tone: z.string().optional(),
  moral: z.string().optional(),
  interests: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
  stylePreset: z.string().optional(),

  // Plot (filled in plot stage)
  plot: PlotStructureSchema.optional(),

  // Prose (filled in prose stage)
  prose: ProseSchema.optional(),

  // Visuals (filled in visuals stage)
  visuals: VisualDirectionSchema.optional(),
  characterDesigns: z.array(CharacterDesignSchema).optional(),
});

export type PartialStory = z.infer<typeof PartialStorySchema>;

// ============================================================================
// Stage Validators - Check if a stage can be skipped
// ============================================================================

/**
 * Check if story has complete brief (can skip intake stage)
 */
export const hasCompleteBrief = (story: PartialStory): boolean =>
  StoryBriefSchema.safeParse(story).success;

/**
 * Check if story has complete plot (can skip plot stage)
 */
export const hasCompletePlot = (story: PartialStory): boolean =>
  StoryWithPlotSchema.safeParse(story).success;

/**
 * Check if story has complete prose (can skip prose stage)
 */
export const hasCompleteProse = (story: PartialStory): boolean =>
  StoryWithProseSchema.safeParse(story).success;

/**
 * Check if story is fully composed (can skip to render)
 */
export const hasCompleteVisuals = (story: PartialStory): boolean =>
  ComposedStorySchema.safeParse(story).success;
