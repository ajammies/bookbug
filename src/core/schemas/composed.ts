import { z } from 'zod';
import { StoryBriefSchema } from './brief';
import { PlotStructureSchema } from './plot';
import { ProseSchema } from './prose';
import { VisualDirectionSchema } from './visuals';

/**
 * Composed Types: Linear pipeline composition
 * Each stage adds new fields to the previous.
 */

/**
 * StoryWithPlot: StoryBrief + PlotStructure
 * Result of running plotAgent on a StoryBrief.
 */
export const StoryWithPlotSchema = StoryBriefSchema.extend({
  plot: PlotStructureSchema,
});

export type StoryWithPlot = z.infer<typeof StoryWithPlotSchema>;

/**
 * StoryWithProse: StoryWithPlot + Prose
 * Result of running proseAgent on a StoryWithPlot.
 */
export const StoryWithProseSchema = StoryWithPlotSchema.extend({
  prose: ProseSchema,
});

export type StoryWithProse = z.infer<typeof StoryWithProseSchema>;

/**
 * ComposedStory: StoryWithProse + VisualDirection
 * The complete story ready for rendering.
 */
export const ComposedStorySchema = StoryWithProseSchema.extend({
  visuals: VisualDirectionSchema,
});

export type ComposedStory = z.infer<typeof ComposedStorySchema>;

// Alias for convenience
export const StorySchema = ComposedStorySchema;
export type Story = ComposedStory;
