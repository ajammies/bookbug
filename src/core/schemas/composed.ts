import { z } from 'zod';
import { StoryDraftSchema } from './draft';
import { ProseSchema } from './prose';
import { VisualDirectionSchema, CharacterDesignSchema } from './visuals';

/**
 * Composed Types: Linear pipeline composition
 * Each stage adds new fields to the previous.
 *
 * Base is StoryDraft (unified schema with all story details).
 */

/**
 * StoryWithPlot: Alias for StoryDraft (backward compatibility)
 * The draft already contains plot beats directly - no nested plot object.
 */
export const StoryWithPlotSchema = StoryDraftSchema;
export type StoryWithPlot = z.infer<typeof StoryWithPlotSchema>;

/**
 * StoryWithProse: StoryDraft + Prose
 * Result of running proseAgent on a story.
 */
export const StoryWithProseSchema = StoryDraftSchema.extend({
  prose: ProseSchema,
});

export type StoryWithProse = z.infer<typeof StoryWithProseSchema>;

/**
 * ComposedStory: StoryWithProse + VisualDirection + CharacterDesigns
 * The complete story ready for rendering.
 */
export const ComposedStorySchema = StoryWithProseSchema.extend({
  visuals: VisualDirectionSchema,
  characterDesigns: z.array(CharacterDesignSchema).optional().describe('Sprite sheets for consistent character rendering'),
});

export type ComposedStory = z.infer<typeof ComposedStorySchema>;

// Alias for convenience
export const StorySchema = ComposedStorySchema;
export type Story = ComposedStory;
